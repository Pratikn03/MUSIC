#include "StemPlaybackEngine.h"
#include <fstream>
#include <cstring>
#include <cmath>
#include <algorithm>

namespace aether {

StemPlaybackEngine::StemPlaybackEngine() {
    prepare(48000.0);
}

void StemPlaybackEngine::prepare(double sampleRate) {
    currentSampleRate = sampleRate > 0.0 ? sampleRate : 48000.0;
}

#pragma pack(push, 1)
struct WavRiffHeader {
    char riff[4];        // "RIFF"
    uint32_t fileSize;
    char wave[4];        // "WAVE"
};

struct WavChunkHeader {
    char chunkId[4];
    uint32_t chunkSize;
};

struct WavFmtChunk {
    uint16_t audioFormat;
    uint16_t numChannels;
    uint32_t sampleRate;
    uint32_t byteRate;
    uint16_t blockAlign;
    uint16_t bitsPerSample;
};
#pragma pack(pop)

bool StemPlaybackEngine::loadWavFile(const std::string& path, const std::string& prompt, double bpm, int barLength, const std::string& key) {
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) return false;

    WavRiffHeader riff;
    file.read(reinterpret_cast<char*>(&riff), sizeof(riff));
    if (std::memcmp(riff.riff, "RIFF", 4) != 0 || std::memcmp(riff.wave, "WAVE", 4) != 0) {
        return false;
    }

    WavFmtChunk fmt{};
    bool foundFmt = false;
    std::vector<uint8_t> rawAudio;

    while (file) {
        WavChunkHeader chunk;
        file.read(reinterpret_cast<char*>(&chunk), sizeof(chunk));
        if (!file) break;

        if (std::memcmp(chunk.chunkId, "fmt ", 4) == 0) {
            size_t toRead = std::min(sizeof(fmt), static_cast<size_t>(chunk.chunkSize));
            file.read(reinterpret_cast<char*>(&fmt), toRead);
            if (chunk.chunkSize > toRead) {
                file.seekg(chunk.chunkSize - toRead, std::ios::cur);
            }
            foundFmt = true;
        } else if (std::memcmp(chunk.chunkId, "data", 4) == 0) {
            rawAudio.resize(chunk.chunkSize);
            file.read(reinterpret_cast<char*>(rawAudio.data()), chunk.chunkSize);
            break;
        } else {
            file.seekg(chunk.chunkSize, std::ios::cur);
        }
    }

    if (!foundFmt || rawAudio.empty() || fmt.numChannels == 0) return false;

    size_t numSamples = rawAudio.size() / (fmt.numChannels * (fmt.bitsPerSample / 8));
    std::vector<float> newLeft(numSamples);
    std::vector<float> newRight(numSamples);

    if (fmt.audioFormat == 1) { // PCM integer
        if (fmt.bitsPerSample == 16) {
            const int16_t* ptr = reinterpret_cast<const int16_t*>(rawAudio.data());
            for (size_t i = 0; i < numSamples; ++i) {
                newLeft[i] = ptr[i * fmt.numChannels] / 32768.0f;
                newRight[i] = (fmt.numChannels > 1) ? ptr[i * fmt.numChannels + 1] / 32768.0f : newLeft[i];
            }
        } else if (fmt.bitsPerSample == 24) {
            const uint8_t* ptr = rawAudio.data();
            for (size_t i = 0; i < numSamples; ++i) {
                int32_t valL = (ptr[0] << 8) | (ptr[1] << 16) | (ptr[2] << 24);
                valL >>= 8;
                newLeft[i] = valL / 8388608.0f;

                if (fmt.numChannels > 1) {
                    const uint8_t* ptrR = ptr + 3;
                    int32_t valR = (ptrR[0] << 8) | (ptrR[1] << 16) | (ptrR[2] << 24);
                    valR >>= 8;
                    newRight[i] = valR / 8388608.0f;
                } else {
                    newRight[i] = newLeft[i];
                }
                ptr += fmt.numChannels * 3;
            }
        }
    } else if (fmt.audioFormat == 3 && fmt.bitsPerSample == 32) { // 32-bit float
        const float* ptr = reinterpret_cast<const float*>(rawAudio.data());
        for (size_t i = 0; i < numSamples; ++i) {
            newLeft[i] = ptr[i * fmt.numChannels];
            newRight[i] = (fmt.numChannels > 1) ? ptr[i * fmt.numChannels + 1] : newLeft[i];
        }
    }

    // Set atomic state
    hasStem.store(false);
    stemLeft = std::move(newLeft);
    stemRight = std::move(newRight);
    stemLengthSamples.store(numSamples);
    playheadSample.store(0);

    {
        std::lock_guard<std::mutex> lock(metadataMutex);
        currentMetadata.filePath = path;
        currentMetadata.prompt = prompt;
        currentMetadata.bpm = bpm;
        currentMetadata.barLength = barLength;
        currentMetadata.key = key;
        currentMetadata.sampleCount = numSamples;
        currentMetadata.durationSeconds = static_cast<double>(numSamples) / fmt.sampleRate;
    }

    hasStem.store(true);
    return true;
}

void StemPlaybackEngine::clear() {
    hasStem.store(false);
    stemLengthSamples.store(0);
    stemLeft.clear();
    stemRight.clear();
}

StemMetadata StemPlaybackEngine::getMetadata() const {
    std::lock_guard<std::mutex> lock(metadataMutex);
    return currentMetadata;
}

void StemPlaybackEngine::mix(float* const* channelData, size_t numChannels, size_t numSamples, double hostBpm, double hostPpqPosition, bool isHostPlaying) noexcept {
    if (!hasStem.load(std::memory_order_relaxed) || isMuted.load(std::memory_order_relaxed)) return;
    if (numChannels == 0 || numSamples == 0 || channelData == nullptr) return;

    size_t length = stemLengthSamples.load(std::memory_order_relaxed);
    if (length == 0 || stemLeft.empty()) return;

    float vol = volumeLinear.load(std::memory_order_relaxed);
    float* left = channelData[0];
    float* right = (numChannels > 1 && channelData[1] != nullptr) ? channelData[1] : channelData[0];

    // Tempo sync logic: if host provides PPQ (quarter notes) and is playing,
    // lock playback position to host PPQ modulo the stem length
    size_t currentPos = 0;
    if (isHostPlaying && hostBpm > 10.0 && hostPpqPosition >= 0.0) {
        // Quarter note length in seconds = 60 / BPM
        double secondsPerQuarter = 60.0 / hostBpm;
        double currentHostSeconds = hostPpqPosition * secondsPerQuarter;
        double stemDurationSec = static_cast<double>(length) / currentSampleRate;
        double loopedSec = std::fmod(currentHostSeconds, stemDurationSec);
        currentPos = static_cast<size_t>(loopedSec * currentSampleRate) % length;
    } else {
        currentPos = playheadSample.load(std::memory_order_relaxed);
    }

    for (size_t i = 0; i < numSamples; ++i) {
        left[i] += stemLeft[currentPos] * vol;
        right[i] += stemRight[currentPos] * vol;
        currentPos = (currentPos + 1) % length;
    }

    playheadSample.store(currentPos, std::memory_order_relaxed);
}

} // namespace aether
