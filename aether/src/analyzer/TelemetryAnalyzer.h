#pragma once

#include "AudioTelemetry.h"
#include "../dsp/SPSCQueue.h"
#include <thread>
#include <atomic>
#include <mutex>
#include <vector>
#include <cmath>

namespace aether {

class TelemetryAnalyzer {
public:
    TelemetryAnalyzer(double sampleRate = 48000.0);
    ~TelemetryAnalyzer();

    void prepare(double newSampleRate);
    void start();
    void stop();

    // Lock-free queue interface fed by the audio thread
    SPSCQueue<float, 65536>& getQueue() { return audioQueue; }

    // Thread-safe copy of latest computed telemetry
    AudioTelemetry getLatestTelemetry() const;
    std::string getLatestTelemetryJSON() const;

    void setGainReduction(float grDb) { latestGainReduction.store(grDb, std::memory_order_relaxed); }

private:
    void analyzerLoop();
    void processWindow(const float* left, const float* right, size_t numSamples);

    double sampleRate{48000.0};
    std::atomic<bool> isRunning{false};
    std::thread workerThread;

    SPSCQueue<float, 65536> audioQueue;

    // K-weighting biquad coefficients for ITU-R BS.1770 LUFS calculation
    // Stage 1: High shelf filter (+4 dB at high frequencies)
    float hs_b0{1.0f}, hs_b1{0.0f}, hs_b2{0.0f}, hs_a1{0.0f}, hs_a2{0.0f};
    float hs_z1_l{0.0f}, hs_z2_l{0.0f}, hs_z1_r{0.0f}, hs_z2_r{0.0f};

    // Stage 2: High pass filter (~100 Hz cutoff)
    float hp_b0{1.0f}, hp_b1{0.0f}, hp_b2{0.0f}, hp_a1{0.0f}, hp_a2{0.0f};
    float hp_z1_l{0.0f}, hp_z2_l{0.0f}, hp_z1_r{0.0f}, hp_z2_r{0.0f};

    void setupKWeightingFilters(double sr);
    float applyKWeighting(float sample, float& hs_z1, float& hs_z2, float& hp_z1, float& hp_z2);

    // 3-second rolling buffer for short-term LUFS
    std::vector<float> lufsBuffer;
    size_t lufsBufferWritePos{0};
    double integratedLufsSum{0.0};
    uint64_t integratedLufsCount{0};

    // FFT analysis
    static constexpr size_t FFT_SIZE = 2048;
    static constexpr size_t NUM_DISPLAY_BINS = 128;
    std::vector<float> fftWindow;
    std::vector<float> fftInput;
    std::vector<float> fftOutputReal;
    std::vector<float> fftOutputImag;

    void computeFFT(const float* mono, size_t count, std::vector<float>& outMagnitudes);

    mutable std::mutex telemetryMutex;
    AudioTelemetry currentTelemetry;
    std::atomic<float> latestGainReduction{0.0f};
};

} // namespace aether
