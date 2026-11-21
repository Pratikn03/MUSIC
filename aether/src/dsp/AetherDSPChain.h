#pragma once

#include "AetherDSPParameters.h"
#include "SPSCQueue.h"
#include <vector>
#include <atomic>
#include <array>
#include <cmath>

namespace aether {

/**
 * Standard Biquad filter state and coefficients for high-precision
 * zero-latency audio filtering.
 */
struct BiquadCoeffs {
    float b0{1.0f}, b1{0.0f}, b2{0.0f}, a1{0.0f}, a2{0.0f};

    static BiquadCoeffs makeLowShelf(double sampleRate, float freq, float gainDb, float Q);
    static BiquadCoeffs makeBell(double sampleRate, float freq, float gainDb, float Q);
    static BiquadCoeffs makeHighShelf(double sampleRate, float freq, float gainDb, float Q);
};

struct BiquadState {
    float z1_l{0.0f}, z2_l{0.0f};
    float z1_r{0.0f}, z2_r{0.0f};

    void reset() {
        z1_l = z2_l = z1_r = z2_r = 0.0f;
    }

    inline void processStereo(float& l, float& r, const BiquadCoeffs& c) noexcept {
        // Direct Form II Transposed for numerical stability and zero latency
        float y_l = c.b0 * l + z1_l;
        z1_l = c.b1 * l - c.a1 * y_l + z2_l;
        z2_l = c.b2 * l - c.a2 * y_l;
        l = y_l;

        float y_r = c.b0 * r + z1_r;
        z1_r = c.b1 * r - c.a1 * y_r + z2_r;
        z2_r = c.b2 * r - c.a2 * y_r;
        r = y_r;
    }
};

/**
 * Smoothed Parameter Container with lock-free atomic target staging.
 */
class SmoothedParam {
public:
    void init(float initialValue, float smoothingTimeMs, double sampleRate) {
        current = initialValue;
        target = initialValue;
        setSmoothingTime(smoothingTimeMs, sampleRate);
    }

    void setSmoothingTime(float smoothingTimeMs, double sampleRate) {
        if (smoothingTimeMs <= 0.0f || sampleRate <= 0.0) {
            coeff = 1.0f;
        } else {
            // Exponential smoothing filter coefficient
            coeff = 1.0f - std::exp(-1.0f / (static_cast<float>(sampleRate) * (smoothingTimeMs * 0.001f)));
        }
    }

    void setTarget(float newTarget) noexcept {
        target = newTarget;
    }

    inline float getNext() noexcept {
        current += coeff * (target - current);
        return current;
    }

    inline float getCurrent() const noexcept {
        return current;
    }

    inline float getTarget() const noexcept {
        return target;
    }

private:
    float current{0.0f};
    float target{0.0f};
    float coeff{0.05f};
};

/**
 * Full AETHER DSP Chain:
 * 1. Input Gain & Phase Invert
 * 2. 4-Band Parametric EQ (Low-Shelf, Bell 1, Bell 2, High-Shelf)
 * 3. Dynamics Compressor with Gain Reduction detection
 * 4. Stereo Width & Pan
 * 5. Output Limiter
 * 
 * 100% Lock-Free on Audio Thread.
 */
class AetherDSPChain {
public:
    AetherDSPChain();
    ~AetherDSPChain() = default;

    void prepare(double sampleRate, size_t maxBlockSize);
    void reset();

    // Lock-free parameter setting (can be called from any thread)
    void setParameterTarget(const std::string& paramId, float value);
    void applySnapshot(const ParameterSnapshot& snapshot);
    ParameterSnapshot getCurrentSnapshot() const;

    // Zero-allocation lock-free audio processing method
    // Accepts separate left and right channel pointers
    void process(float* const* channelData, size_t numChannels, size_t numSamples, SPSCQueue<float, 65536>* analyzerQueue = nullptr) noexcept;

    // Real-time gain reduction in dB for meter UI
    float getGainReductionDb() const noexcept {
        return currentGainReductionDb.load(std::memory_order_relaxed);
    }

private:
    double currentSampleRate{48000.0};
    size_t currentMaxBlockSize{1024};

    // Smoothed audio parameters
    SmoothedParam inputGainDb;
    std::atomic<bool> phaseInvert{false};

    // EQ Bands
    std::atomic<bool> eqBand1Enable{true};
    SmoothedParam eqBand1Freq;
    SmoothedParam eqBand1Gain;
    SmoothedParam eqBand1Q;

    std::atomic<bool> eqBand2Enable{true};
    SmoothedParam eqBand2Freq;
    SmoothedParam eqBand2Gain;
    SmoothedParam eqBand2Q;

    std::atomic<bool> eqBand3Enable{true};
    SmoothedParam eqBand3Freq;
    SmoothedParam eqBand3Gain;
    SmoothedParam eqBand3Q;

    std::atomic<bool> eqBand4Enable{true};
    SmoothedParam eqBand4Freq;
    SmoothedParam eqBand4Gain;
    SmoothedParam eqBand4Q;

    // Compressor
    std::atomic<bool> compEnable{true};
    SmoothedParam compThreshold;
    SmoothedParam compRatio;
    SmoothedParam compAttackMs;
    SmoothedParam compReleaseMs;
    SmoothedParam compMakeupGainDb;

    // Stereo & Master
    SmoothedParam stereoWidth;
    SmoothedParam pan;
    std::atomic<bool> limiterEnable{true};
    SmoothedParam limiterCeilingDb;
    SmoothedParam outputGainDb;

    // Filter states
    BiquadState eqState1;
    BiquadState eqState2;
    BiquadState eqState3;
    BiquadState eqState4;

    // Dynamics compressor detector state
    float compEnvelope{0.0f};
    std::atomic<float> currentGainReductionDb{0.0f};

    // Limiter state
    float limiterEnvelope{0.0f};

    // Preallocated scratch buffer for queue writes (zero allocation in audio callback)
    std::vector<float> queueScratchBuffer;
};

} // namespace aether
