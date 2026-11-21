#include "TelemetryAnalyzer.h"
#include <chrono>
#include <numbers>
#include <cmath>
#include <algorithm>

namespace aether {

TelemetryAnalyzer::TelemetryAnalyzer(double sr) : sampleRate(sr) {
    prepare(sr);
}

TelemetryAnalyzer::~TelemetryAnalyzer() {
    stop();
}

void TelemetryAnalyzer::prepare(double newSampleRate) {
    sampleRate = newSampleRate > 0.0 ? newSampleRate : 48000.0;
    setupKWeightingFilters(sampleRate);

    // 3-second buffer for short-term loudness (3 * sampleRate samples)
    size_t lufsWindowSamples = static_cast<size_t>(sampleRate * 3.0);
    lufsBuffer.assign(lufsWindowSamples, 0.0f);
    lufsBufferWritePos = 0;
    integratedLufsSum = 0.0;
    integratedLufsCount = 0;

    // Hann window for FFT
    fftWindow.resize(FFT_SIZE);
    for (size_t i = 0; i < FFT_SIZE; ++i) {
        fftWindow[i] = 0.5f * (1.0f - std::cos(2.0f * std::numbers::pi_v<float> * i / (FFT_SIZE - 1)));
    }

    fftInput.assign(FFT_SIZE, 0.0f);
    fftOutputReal.assign(FFT_SIZE, 0.0f);
    fftOutputImag.assign(FFT_SIZE, 0.0f);

    currentTelemetry.fft_magnitudes.assign(NUM_DISPLAY_BINS, -80.0f);
}

void TelemetryAnalyzer::setupKWeightingFilters(double sr) {
    // Stage 1: High shelf (Pre-filter, +4 dB high frequency boost)
    // Reference: ITU-R BS.1770-4
    double dbGain = 3.99984385397;
    double f0 = 1681.9744509555319;
    double Q = 0.7071752369274193;

    double K = std::tan(std::numbers::pi * f0 / sr);
    double Vh = std::pow(10.0, dbGain / 20.0);
    double Vb = std::pow(Vh, 0.499666774155);

    double a0 = 1.0 + K / Q + K * K;
    hs_b0 = static_cast<float>((Vh + Vb * K / Q + K * K) / a0);
    hs_b1 = static_cast<float>(2.0 * (K * K - Vh) / a0);
    hs_b2 = static_cast<float>((Vh - Vb * K / Q + K * K) / a0);
    hs_a1 = static_cast<float>(2.0 * (K * K - 1.0) / a0);
    hs_a2 = static_cast<float>((1.0 - K / Q + K * K) / a0);

    // Stage 2: High pass (RLB weighting, cutoff ~38 Hz)
    f0 = 38.13547087613982;
    Q = 0.5003270373253953;
    K = std::tan(std::numbers::pi * f0 / sr);
    a0 = 1.0 + K / Q + K * K;
    hp_b0 = static_cast<float>(1.0 / a0);
    hp_b1 = static_cast<float>(-2.0 / a0);
    hp_b2 = static_cast<float>(1.0 / a0);
    hp_a1 = static_cast<float>(2.0 * (K * K - 1.0) / a0);
    hp_a2 = static_cast<float>((1.0 - K / Q + K * K) / a0);

    hs_z1_l = hs_z2_l = hs_z1_r = hs_z2_r = 0.0f;
    hp_z1_l = hp_z2_l = hp_z1_r = hp_z2_r = 0.0f;
}

float TelemetryAnalyzer::applyKWeighting(float x, float& hs_z1, float& hs_z2, float& hp_z1, float& hp_z2) {
    // Stage 1 Direct Form II transposed
    float y1 = hs_b0 * x + hs_z1;
    hs_z1 = hs_b1 * x - hs_a1 * y1 + hs_z2;
    hs_z2 = hs_b2 * x - hs_a2 * y1;

    // Stage 2
    float y2 = hp_b0 * y1 + hp_z1;
    hp_z1 = hp_b1 * y1 - hp_a1 * y2 + hp_z2;
    hp_z2 = hp_b2 * y1 - hp_a2 * y2;

    return y2;
}

void TelemetryAnalyzer::start() {
    if (isRunning.load()) return;
    isRunning.store(true);
    workerThread = std::thread(&TelemetryAnalyzer::analyzerLoop, this);
}

void TelemetryAnalyzer::stop() {
    if (!isRunning.load()) return;
    isRunning.store(false);
    if (workerThread.joinable()) {
        workerThread.join();
    }
}

AudioTelemetry TelemetryAnalyzer::getLatestTelemetry() const {
    std::lock_guard<std::mutex> lock(telemetryMutex);
    AudioTelemetry copy = currentTelemetry;
    copy.comp_gain_reduction_db = latestGainReduction.load(std::memory_order_relaxed);
    return copy;
}

std::string TelemetryAnalyzer::getLatestTelemetryJSON() const {
    return getLatestTelemetry().toJSON();
}

void TelemetryAnalyzer::analyzerLoop() {
    constexpr size_t CHUNK_SIZE = 1024;
    std::vector<float> interleavedBuffer(CHUNK_SIZE * 2);
    std::vector<float> leftChannel(CHUNK_SIZE);
    std::vector<float> rightChannel(CHUNK_SIZE);

    while (isRunning.load()) {
        size_t available = audioQueue.getAvailableRead();
        if (available < CHUNK_SIZE * 2) {
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
            continue;
        }

        size_t readSamples = audioQueue.read(interleavedBuffer.data(), CHUNK_SIZE * 2);
        size_t numFrames = readSamples / 2;

        for (size_t i = 0; i < numFrames; ++i) {
            leftChannel[i] = interleavedBuffer[i * 2];
            rightChannel[i] = interleavedBuffer[i * 2 + 1];
        }

        processWindow(leftChannel.data(), rightChannel.data(), numFrames);
    }
}

// Simple in-place Cooley-Tukey Radix-2 FFT
static void fastFFT(std::vector<float>& real, std::vector<float>& imag) {
    const size_t n = real.size();
    
    // Bit-reversal permutation
    size_t j = 0;
    for (size_t i = 0; i < n - 1; ++i) {
        if (i < j) {
            std::swap(real[i], real[j]);
            std::swap(imag[i], imag[j]);
        }
        size_t k = n >> 1;
        while (k <= j) {
            j -= k;
            k >>= 1;
        }
        j += k;
    }

    // Danielson-Lanczos algorithm
    for (size_t len = 2; len <= n; len <<= 1) {
        double angle = -2.0 * std::numbers::pi / len;
        double wlen_r = std::cos(angle);
        double wlen_i = std::sin(angle);

        for (size_t i = 0; i < n; i += len) {
            double w_r = 1.0;
            double w_i = 0.0;
            for (size_t step = 0; step < len / 2; ++step) {
                size_t u = i + step;
                size_t v = i + step + len / 2;

                double tr = w_r * real[v] - w_i * imag[v];
                double ti = w_r * imag[v] + w_i * real[v];

                real[v] = static_cast<float>(real[u] - tr);
                imag[v] = static_cast<float>(imag[u] - ti);
                real[u] = static_cast<float>(real[u] + tr);
                imag[u] = static_cast<float>(imag[u] + ti);

                double next_w_r = w_r * wlen_r - w_i * wlen_i;
                double next_w_i = w_r * wlen_i + w_i * wlen_r;
                w_r = next_w_r;
                w_i = next_w_i;
            }
        }
    }
}

void TelemetryAnalyzer::computeFFT(const float* mono, size_t count, std::vector<float>& outMagnitudes) {
    size_t take = std::min(count, FFT_SIZE);
    for (size_t i = 0; i < take; ++i) {
        fftOutputReal[i] = mono[i] * fftWindow[i];
        fftOutputImag[i] = 0.0f;
    }
    for (size_t i = take; i < FFT_SIZE; ++i) {
        fftOutputReal[i] = 0.0f;
        fftOutputImag[i] = 0.0f;
    }

    fastFFT(fftOutputReal, fftOutputImag);

    // Map 1024 magnitude bins to logarithmically spaced NUM_DISPLAY_BINS (20 Hz - 20 kHz)
    outMagnitudes.resize(NUM_DISPLAY_BINS);
    float minF = 20.0f;
    float maxF = static_cast<float>(sampleRate / 2.0);
    if (maxF > 20000.0f) maxF = 20000.0f;

    for (size_t b = 0; b < NUM_DISPLAY_BINS; ++b) {
        float fLow = minF * std::pow(maxF / minF, static_cast<float>(b) / NUM_DISPLAY_BINS);
        float fHigh = minF * std::pow(maxF / minF, static_cast<float>(b + 1) / NUM_DISPLAY_BINS);

        size_t binStart = std::clamp(static_cast<size_t>(fLow / sampleRate * FFT_SIZE), size_t(1), FFT_SIZE / 2 - 1);
        size_t binEnd = std::clamp(static_cast<size_t>(fHigh / sampleRate * FFT_SIZE), binStart + 1, FFT_SIZE / 2);

        float maxMag = 0.0f;
        for (size_t bin = binStart; bin < binEnd; ++bin) {
            float r = fftOutputReal[bin];
            float im = fftOutputImag[bin];
            float mag = std::sqrt(r * r + im * im) / (FFT_SIZE / 2);
            if (mag > maxMag) maxMag = mag;
        }

        float db = maxMag > 1e-5f ? 20.0f * std::log10(maxMag) : -90.0f;
        outMagnitudes[b] = std::clamp(db, -90.0f, 12.0f);
    }
}

void TelemetryAnalyzer::processWindow(const float* left, const float* right, size_t numSamples) {
    if (numSamples == 0) return;

    float peak = 0.0f;
    double sumL2 = 0.0;
    double sumR2 = 0.0;
    double sumLR = 0.0;
    double kEnergySum = 0.0;

    std::vector<float> mono(numSamples);

    for (size_t i = 0; i < numSamples; ++i) {
        float l = left[i];
        float r = right[i];
        mono[i] = 0.5f * (l + r);

        float absL = std::abs(l);
        float absR = std::abs(r);
        if (absL > peak) peak = absL;
        if (absR > peak) peak = absR;

        sumL2 += l * l;
        sumR2 += r * r;
        sumLR += l * r;

        // Apply K-weighting filters
        float kL = applyKWeighting(l, hs_z1_l, hs_z2_l, hp_z1_l, hp_z2_l);
        float kR = applyKWeighting(r, hs_z1_r, hs_z2_r, hp_z1_r, hp_z2_r);
        float frameEnergy = kL * kL + kR * kR;

        kEnergySum += frameEnergy;

        // Update rolling 3s buffer
        lufsBuffer[lufsBufferWritePos] = frameEnergy;
        lufsBufferWritePos = (lufsBufferWritePos + 1) % lufsBuffer.size();
    }

    // Peak & RMS in dBFS
    float peakDb = peak > 1e-5f ? 20.0f * std::log10(peak) : -90.0f;
    double meanEnergy = (sumL2 + sumR2) / (2.0 * numSamples);
    float rmsDb = meanEnergy > 1e-10 ? static_cast<float>(10.0 * std::log10(meanEnergy)) : -90.0f;

    // Stereo correlation: sum(L*R) / sqrt(sum(L^2) * sum(R^2))
    float correlation = 1.0f;
    double denom = std::sqrt(sumL2 * sumR2);
    if (denom > 1e-9) {
        correlation = static_cast<float>(sumLR / denom);
        correlation = std::clamp(correlation, -1.0f, 1.0f);
    }

    // Short-term LUFS (3-second window)
    double shortTermSum = 0.0;
    for (float e : lufsBuffer) {
        shortTermSum += e;
    }
    double meanShortTerm = shortTermSum / lufsBuffer.size();
    // BS.1770 LUFS formula: -0.691 + 10 * log10(mean)
    float lufsShortTerm = meanShortTerm > 1e-10
        ? static_cast<float>(-0.691 + 10.0 * std::log10(meanShortTerm))
        : -90.0f;

    // Integrated LUFS
    integratedLufsSum += kEnergySum;
    integratedLufsCount += numSamples;
    double meanIntegrated = integratedLufsSum / integratedLufsCount;
    float lufsIntegrated = meanIntegrated > 1e-10
        ? static_cast<float>(-0.691 + 10.0 * std::log10(meanIntegrated))
        : -90.0f;

    // Spectral bands energy
    std::vector<float> displayMagnitudes;
    computeFFT(mono.data(), numSamples, displayMagnitudes);

    // Compute 6-band energy: Sub (20-60), Bass (60-250), Low-Mid (250-500),
    // Mid (500-2k), High-Mid (2k-6k), Air (6k-20k)
    auto getBandEnergy = [&](float fMin, float fMax) -> float {
        size_t bStart = std::clamp(static_cast<size_t>(fMin / sampleRate * FFT_SIZE), size_t(1), FFT_SIZE / 2 - 1);
        size_t bEnd = std::clamp(static_cast<size_t>(fMax / sampleRate * FFT_SIZE), bStart + 1, FFT_SIZE / 2);

        double total = 0.0;
        for (size_t bin = bStart; bin < bEnd; ++bin) {
            float r = fftOutputReal[bin];
            float im = fftOutputImag[bin];
            total += (r * r + im * im);
        }
        double avg = total / (bEnd - bStart + 1);
        return avg > 1e-10 ? static_cast<float>(10.0 * std::log10(avg / (FFT_SIZE * FFT_SIZE))) : -90.0f;
    };

    SpectralBandsDB bands;
    bands.sub = getBandEnergy(20.0f, 60.0f);
    bands.bass = getBandEnergy(60.0f, 250.0f);
    bands.low_mid = getBandEnergy(250.0f, 500.0f);
    bands.mid = getBandEnergy(500.0f, 2000.0f);
    bands.high_mid = getBandEnergy(2000.0f, 6000.0f);
    bands.air = getBandEnergy(6000.0f, 20000.0f);

    // Update shared telemetry state safely
    {
        std::lock_guard<std::mutex> lock(telemetryMutex);
        currentTelemetry.peak_db = peakDb;
        currentTelemetry.rms_db = rmsDb;
        currentTelemetry.lufs_short_term = lufsShortTerm;
        currentTelemetry.lufs_integrated = lufsIntegrated;
        currentTelemetry.stereo_correlation = correlation;
        currentTelemetry.bands_db = bands;
        currentTelemetry.fft_magnitudes = std::move(displayMagnitudes);
    }
}

} // namespace aether
