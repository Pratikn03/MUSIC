#pragma once

#include <vector>
#include <string>
#include <atomic>
#include <mutex>

namespace aether {

struct StemMetadata {
    std::string stemId;
    std::string prompt;
    double bpm{120.0};
    int barLength{8};
    std::string key{"F minor"};
    std::string filePath;
    size_t sampleCount{0};
    double durationSeconds{0.0};
};

class StemPlaybackEngine {
public:
    StemPlaybackEngine();
    ~StemPlaybackEngine() = default;

    void prepare(double sampleRate);
    bool loadWavFile(const std::string& path, const std::string& prompt, double bpm, int barLength, const std::string& key);
    void clear();

    void setMuted(bool mute) { isMuted.store(mute); }
    bool getMuted() const { return isMuted.load(); }

    void setVolume(float vol) { volumeLinear.store(vol); }
    float getVolume() const { return volumeLinear.load(); }

    bool hasLoadedStem() const { return hasStem.load(); }
    StemMetadata getMetadata() const;

    // Called on Audio Thread (100% lock-free)
    void mix(float* const* channelData, size_t numChannels, size_t numSamples, double hostBpm, double hostPpqPosition, bool isHostPlaying) noexcept;

private:
    double currentSampleRate{48000.0};
    std::atomic<bool> hasStem{false};
    std::atomic<bool> isMuted{false};
    std::atomic<float> volumeLinear{0.8f};

    mutable std::mutex metadataMutex;
    StemMetadata currentMetadata;

    // Audio sample buffers (dual-buffered or atomic swap)
    std::vector<float> stemLeft;
    std::vector<float> stemRight;
    std::atomic<size_t> stemLengthSamples{0};
    std::atomic<size_t> playheadSample{0};
};

} // namespace aether
