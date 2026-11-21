#include "AetherDSPChain.h"
#include <numbers>
#include <algorithm>

namespace aether {

// Robert Bristow-Johnson (RBJ) Audio EQ Cookbook Implementation
BiquadCoeffs BiquadCoeffs::makeLowShelf(double sampleRate, float freq, float gainDb, float Q) {
    BiquadCoeffs c;
    if (sampleRate <= 0.0) return c;

    double A = std::pow(10.0, gainDb / 40.0);
    double w0 = 2.0 * std::numbers::pi * std::clamp(freq, 20.0f, static_cast<float>(sampleRate * 0.49)) / sampleRate;
    double cos_w0 = std::cos(w0);
    double sin_w0 = std::sin(w0);
    double alpha = sin_w0 / (2.0 * std::max(Q, 0.1f));
    double two_sqrt_A_alpha = 2.0 * std::sqrt(A) * alpha;

    double a0 = (A + 1.0) + (A - 1.0) * cos_w0 + two_sqrt_A_alpha;
    double b0 = A * ((A + 1.0) - (A - 1.0) * cos_w0 + two_sqrt_A_alpha);
    double b1 = 2.0 * A * ((A - 1.0) - (A + 1.0) * cos_w0);
    double b2 = A * ((A + 1.0) - (A - 1.0) * cos_w0 - two_sqrt_A_alpha);
    double a1 = -2.0 * ((A - 1.0) + (A + 1.0) * cos_w0);
    double a2 = (A + 1.0) + (A - 1.0) * cos_w0 - two_sqrt_A_alpha;

    c.b0 = static_cast<float>(b0 / a0);
    c.b1 = static_cast<float>(b1 / a0);
    c.b2 = static_cast<float>(b2 / a0);
    c.a1 = static_cast<float>(a1 / a0);
    c.a2 = static_cast<float>(a2 / a0);
    return c;
}

BiquadCoeffs BiquadCoeffs::makeBell(double sampleRate, float freq, float gainDb, float Q) {
    BiquadCoeffs c;
    if (sampleRate <= 0.0) return c;

    double A = std::pow(10.0, gainDb / 40.0);
    double w0 = 2.0 * std::numbers::pi * std::clamp(freq, 20.0f, static_cast<float>(sampleRate * 0.49)) / sampleRate;
    double cos_w0 = std::cos(w0);
    double sin_w0 = std::sin(w0);
    double alpha = sin_w0 / (2.0 * std::max(Q, 0.1f));

    double a0 = 1.0 + alpha / A;
    double b0 = 1.0 + alpha * A;
    double b1 = -2.0 * cos_w0;
    double b2 = 1.0 - alpha * A;
    double a1 = -2.0 * cos_w0;
    double a2 = 1.0 - alpha / A;

    c.b0 = static_cast<float>(b0 / a0);
    c.b1 = static_cast<float>(b1 / a0);
    c.b2 = static_cast<float>(b2 / a0);
    c.a1 = static_cast<float>(a1 / a0);
    c.a2 = static_cast<float>(a2 / a0);
    return c;
}

BiquadCoeffs BiquadCoeffs::makeHighShelf(double sampleRate, float freq, float gainDb, float Q) {
    BiquadCoeffs c;
    if (sampleRate <= 0.0) return c;

    double A = std::pow(10.0, gainDb / 40.0);
    double w0 = 2.0 * std::numbers::pi * std::clamp(freq, 20.0f, static_cast<float>(sampleRate * 0.49)) / sampleRate;
    double cos_w0 = std::cos(w0);
    double sin_w0 = std::sin(w0);
    double alpha = sin_w0 / (2.0 * std::max(Q, 0.1f));
    double two_sqrt_A_alpha = 2.0 * std::sqrt(A) * alpha;

    double a0 = (A + 1.0) - (A - 1.0) * cos_w0 + two_sqrt_A_alpha;
    double b0 = A * ((A + 1.0) + (A - 1.0) * cos_w0 + two_sqrt_A_alpha);
    double b1 = -2.0 * A * ((A - 1.0) + (A + 1.0) * cos_w0);
    double b2 = A * ((A + 1.0) + (A - 1.0) * cos_w0 - two_sqrt_A_alpha);
    double a1 = 2.0 * ((A - 1.0) - (A + 1.0) * cos_w0);
    double a2 = (A + 1.0) - (A - 1.0) * cos_w0 - two_sqrt_A_alpha;

    c.b0 = static_cast<float>(b0 / a0);
    c.b1 = static_cast<float>(b1 / a0);
    c.b2 = static_cast<float>(b2 / a0);
    c.a1 = static_cast<float>(a1 / a0);
    c.a2 = static_cast<float>(a2 / a0);
    return c;
}

AetherDSPChain::AetherDSPChain() {
    prepare(48000.0, 1024);
}

void AetherDSPChain::prepare(double sampleRate, size_t maxBlockSize) {
    currentSampleRate = sampleRate > 0.0 ? sampleRate : 48000.0;
    currentMaxBlockSize = maxBlockSize > 0 ? maxBlockSize : 1024;

    const float defaultSmoothMs = 20.0f; // 20ms smooth time for click-free interpolation

    inputGainDb.init(0.0f, defaultSmoothMs, currentSampleRate);
    phaseInvert.store(false);

    eqBand1Freq.init(80.0f, defaultSmoothMs, currentSampleRate);
    eqBand1Gain.init(0.0f, defaultSmoothMs, currentSampleRate);
    eqBand1Q.init(0.707f, defaultSmoothMs, currentSampleRate);

    eqBand2Freq.init(350.0f, defaultSmoothMs, currentSampleRate);
    eqBand2Gain.init(0.0f, defaultSmoothMs, currentSampleRate);
    eqBand2Q.init(1.4f, defaultSmoothMs, currentSampleRate);

    eqBand3Freq.init(2500.0f, defaultSmoothMs, currentSampleRate);
    eqBand3Gain.init(0.0f, defaultSmoothMs, currentSampleRate);
    eqBand3Q.init(1.4f, defaultSmoothMs, currentSampleRate);

    eqBand4Freq.init(8500.0f, defaultSmoothMs, currentSampleRate);
    eqBand4Gain.init(0.0f, defaultSmoothMs, currentSampleRate);
    eqBand4Q.init(0.707f, defaultSmoothMs, currentSampleRate);

    compThreshold.init(-14.0f, defaultSmoothMs, currentSampleRate);
    compRatio.init(2.5f, defaultSmoothMs, currentSampleRate);
    compAttackMs.init(15.0f, defaultSmoothMs, currentSampleRate);
    compReleaseMs.init(120.0f, defaultSmoothMs, currentSampleRate);
    compMakeupGainDb.init(0.0f, defaultSmoothMs, currentSampleRate);

    stereoWidth.init(1.0f, defaultSmoothMs, currentSampleRate);
    pan.init(0.0f, defaultSmoothMs, currentSampleRate);
    limiterCeilingDb.init(-0.2f, defaultSmoothMs, currentSampleRate);
    outputGainDb.init(0.0f, defaultSmoothMs, currentSampleRate);

    reset();
    queueScratchBuffer.resize(currentMaxBlockSize * 2, 0.0f);
}

void AetherDSPChain::reset() {
    eqState1.reset();
    eqState2.reset();
    eqState3.reset();
    eqState4.reset();
    compEnvelope = 0.0f;
    limiterEnvelope = 0.0f;
    currentGainReductionDb.store(0.0f, std::memory_order_relaxed);
}

void AetherDSPChain::setParameterTarget(const std::string& id, float val) {
    if (id == "input_gain_db") inputGainDb.setTarget(val);
    else if (id == "phase_invert") phaseInvert.store(val > 0.5f);
    else if (id == "eq_band1_enable") eqBand1Enable.store(val > 0.5f);
    else if (id == "eq_band1_freq") eqBand1Freq.setTarget(val);
    else if (id == "eq_band1_gain") eqBand1Gain.setTarget(val);
    else if (id == "eq_band1_q") eqBand1Q.setTarget(val);
    else if (id == "eq_band2_enable") eqBand2Enable.store(val > 0.5f);
    else if (id == "eq_band2_freq") eqBand2Freq.setTarget(val);
    else if (id == "eq_band2_gain") eqBand2Gain.setTarget(val);
    else if (id == "eq_band2_q") eqBand2Q.setTarget(val);
    else if (id == "eq_band3_enable") eqBand3Enable.store(val > 0.5f);
    else if (id == "eq_band3_freq") eqBand3Freq.setTarget(val);
    else if (id == "eq_band3_gain") eqBand3Gain.setTarget(val);
    else if (id == "eq_band3_q") eqBand3Q.setTarget(val);
    else if (id == "eq_band4_enable") eqBand4Enable.store(val > 0.5f);
    else if (id == "eq_band4_freq") eqBand4Freq.setTarget(val);
    else if (id == "eq_band4_gain") eqBand4Gain.setTarget(val);
    else if (id == "eq_band4_q") eqBand4Q.setTarget(val);
    else if (id == "comp_enable") compEnable.store(val > 0.5f);
    else if (id == "comp_threshold") compThreshold.setTarget(val);
    else if (id == "comp_ratio") compRatio.setTarget(val);
    else if (id == "comp_attack_ms") compAttackMs.setTarget(val);
    else if (id == "comp_release_ms") compReleaseMs.setTarget(val);
    else if (id == "comp_makeup_gain_db") compMakeupGainDb.setTarget(val);
    else if (id == "stereo_width") stereoWidth.setTarget(val);
    else if (id == "pan") pan.setTarget(val);
    else if (id == "limiter_enable") limiterEnable.store(val > 0.5f);
    else if (id == "limiter_ceiling_db") limiterCeilingDb.setTarget(val);
    else if (id == "output_gain_db") outputGainDb.setTarget(val);
}

void AetherDSPChain::applySnapshot(const ParameterSnapshot& snapshot) {
    for (const auto& [id, val] : snapshot.values) {
        setParameterTarget(id, val);
    }
}

ParameterSnapshot AetherDSPChain::getCurrentSnapshot() const {
    ParameterSnapshot snap;
    snap.set("input_gain_db", inputGainDb.getTarget());
    snap.set("phase_invert", phaseInvert.load() ? 1.0f : 0.0f);
    snap.set("eq_band1_enable", eqBand1Enable.load() ? 1.0f : 0.0f);
    snap.set("eq_band1_freq", eqBand1Freq.getTarget());
    snap.set("eq_band1_gain", eqBand1Gain.getTarget());
    snap.set("eq_band1_q", eqBand1Q.getTarget());
    snap.set("eq_band2_enable", eqBand2Enable.load() ? 1.0f : 0.0f);
    snap.set("eq_band2_freq", eqBand2Freq.getTarget());
    snap.set("eq_band2_gain", eqBand2Gain.getTarget());
    snap.set("eq_band2_q", eqBand2Q.getTarget());
    snap.set("eq_band3_enable", eqBand3Enable.load() ? 1.0f : 0.0f);
    snap.set("eq_band3_freq", eqBand3Freq.getTarget());
    snap.set("eq_band3_gain", eqBand3Gain.getTarget());
    snap.set("eq_band3_q", eqBand3Q.getTarget());
    snap.set("eq_band4_enable", eqBand4Enable.load() ? 1.0f : 0.0f);
    snap.set("eq_band4_freq", eqBand4Freq.getTarget());
    snap.set("eq_band4_gain", eqBand4Gain.getTarget());
    snap.set("eq_band4_q", eqBand4Q.getTarget());
    snap.set("comp_enable", compEnable.load() ? 1.0f : 0.0f);
    snap.set("comp_threshold", compThreshold.getTarget());
    snap.set("comp_ratio", compRatio.getTarget());
    snap.set("comp_attack_ms", compAttackMs.getTarget());
    snap.set("comp_release_ms", compReleaseMs.getTarget());
    snap.set("comp_makeup_gain_db", compMakeupGainDb.getTarget());
    snap.set("stereo_width", stereoWidth.getTarget());
    snap.set("pan", pan.getTarget());
    snap.set("limiter_enable", limiterEnable.load() ? 1.0f : 0.0f);
    snap.set("limiter_ceiling_db", limiterCeilingDb.getTarget());
    snap.set("output_gain_db", outputGainDb.getTarget());
    return snap;
}

void AetherDSPChain::process(float* const* channelData, size_t numChannels, size_t numSamples, SPSCQueue<float, 65536>* analyzerQueue) noexcept {
    if (numChannels == 0 || numSamples == 0 || channelData == nullptr) return;

    float* left = channelData[0];
    float* right = (numChannels > 1 && channelData[1] != nullptr) ? channelData[1] : channelData[0];

    // Sub-block processing for coefficient recalculation (every 16 samples) to achieve
    // optimal performance while maintaining perfectly smooth audio transitions
    constexpr size_t SUB_BLOCK_SIZE = 16;
    size_t processed = 0;

    float lastGainReduction = 0.0f;

    while (processed < numSamples) {
        size_t subBlock = std::min(SUB_BLOCK_SIZE, numSamples - processed);

        // Fetch current smoothed parameter targets
        float inGainLin = std::pow(10.0f, inputGainDb.getNext() / 20.0f);
        if (phaseInvert.load(std::memory_order_relaxed)) inGainLin = -inGainLin;

        // Calculate filter biquad coefficients for this sub-block
        BiquadCoeffs c1 = BiquadCoeffs::makeLowShelf(currentSampleRate, eqBand1Freq.getNext(), eqBand1Gain.getNext(), eqBand1Q.getNext());
        BiquadCoeffs c2 = BiquadCoeffs::makeBell(currentSampleRate, eqBand2Freq.getNext(), eqBand2Gain.getNext(), eqBand2Q.getNext());
        BiquadCoeffs c3 = BiquadCoeffs::makeBell(currentSampleRate, eqBand3Freq.getNext(), eqBand3Gain.getNext(), eqBand3Q.getNext());
        BiquadCoeffs c4 = BiquadCoeffs::makeHighShelf(currentSampleRate, eqBand4Freq.getNext(), eqBand4Gain.getNext(), eqBand4Q.getNext());

        bool b1Active = eqBand1Enable.load(std::memory_order_relaxed);
        bool b2Active = eqBand2Enable.load(std::memory_order_relaxed);
        bool b3Active = eqBand3Enable.load(std::memory_order_relaxed);
        bool b4Active = eqBand4Enable.load(std::memory_order_relaxed);

        // Compressor parameters
        bool cActive = compEnable.load(std::memory_order_relaxed);
        float threshold = compThreshold.getNext();
        float ratio = std::max(compRatio.getNext(), 1.0f);
        float attMs = std::max(compAttackMs.getNext(), 0.1f);
        float relMs = std::max(compReleaseMs.getNext(), 5.0f);
        float makeupLin = std::pow(10.0f, compMakeupGainDb.getNext() / 20.0f);

        float attAlpha = std::exp(-1.0f / (static_cast<float>(currentSampleRate) * (attMs * 0.001f)));
        float relAlpha = std::exp(-1.0f / (static_cast<float>(currentSampleRate) * (relMs * 0.001f)));

        // Stereo & Output parameters
        float width = std::clamp(stereoWidth.getNext(), 0.0f, 2.0f);
        float p = std::clamp(pan.getNext(), -1.0f, 1.0f);
        float panL = std::cos((p + 1.0f) * 0.25f * std::numbers::pi_v<float>);
        float panR = std::sin((p + 1.0f) * 0.25f * std::numbers::pi_v<float>);

        bool lActive = limiterEnable.load(std::memory_order_relaxed);
        float ceilingLin = std::pow(10.0f, limiterCeilingDb.getNext() / 20.0f);
        float outGainLin = std::pow(10.0f, outputGainDb.getNext() / 20.0f);

        for (size_t i = 0; i < subBlock; ++i) {
            size_t idx = processed + i;
            float l = left[idx] * inGainLin;
            float r = right[idx] * inGainLin;

            // 1. Parametric EQ Stage
            if (b1Active) eqState1.processStereo(l, r, c1);
            if (b2Active) eqState2.processStereo(l, r, c2);
            if (b3Active) eqState3.processStereo(l, r, c3);
            if (b4Active) eqState4.processStereo(l, r, c4);

            // 2. Dynamics Compressor Stage
            if (cActive) {
                float inputLevel = std::max(std::abs(l), std::abs(r));
                float inputDb = inputLevel > 1e-5f ? 20.0f * std::log10(inputLevel) : -100.0f;

                float targetGainDb = 0.0f;
                if (inputDb > threshold) {
                    targetGainDb = (threshold + (inputDb - threshold) / ratio) - inputDb;
                }

                // Envelope detection
                if (targetGainDb < compEnvelope) {
                    compEnvelope = attAlpha * compEnvelope + (1.0f - attAlpha) * targetGainDb;
                } else {
                    compEnvelope = relAlpha * compEnvelope + (1.0f - relAlpha) * targetGainDb;
                }

                float compGain = std::pow(10.0f, compEnvelope / 20.0f) * makeupLin;
                l *= compGain;
                r *= compGain;
                lastGainReduction = -compEnvelope; // Positive dB number for reduction
            }

            // 3. Stereo Width (Mid-Side Matrix)
            constexpr float INV_SQRT2 = 0.70710678f;
            float mid = (l + r) * INV_SQRT2;
            float side = (l - r) * INV_SQRT2 * width;
            l = (mid + side) * INV_SQRT2 * panL;
            r = (mid - side) * INV_SQRT2 * panR;

            // 4. Output Limiter
            if (lActive) {
                float peak = std::max(std::abs(l), std::abs(r));
                if (peak > limiterEnvelope) {
                    limiterEnvelope = peak;
                } else {
                    limiterEnvelope *= 0.9995f; // Fast release
                }

                if (limiterEnvelope > ceilingLin) {
                    float limitGain = ceilingLin / limiterEnvelope;
                    l *= limitGain;
                    r *= limitGain;
                }
            }

            l *= outGainLin;
            r *= outGainLin;

            left[idx] = l;
            right[idx] = r;
        }

        processed += subBlock;
    }

    currentGainReductionDb.store(lastGainReduction, std::memory_order_relaxed);

    // Push output samples to the lock-free analyzer queue if provided
    if (analyzerQueue != nullptr) {
        if (queueScratchBuffer.size() < numSamples * 2) {
            queueScratchBuffer.resize(numSamples * 2);
        }
        for (size_t i = 0; i < numSamples; ++i) {
            queueScratchBuffer[i * 2] = left[i];
            queueScratchBuffer[i * 2 + 1] = right[i];
        }
        analyzerQueue->write(queueScratchBuffer.data(), numSamples * 2);
    }
}

} // namespace aether
