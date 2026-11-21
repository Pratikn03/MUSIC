#pragma once

#include "../dsp/AetherDSPChain.h"
#include "../dsp/StemPlaybackEngine.h"
#include "../analyzer/TelemetryAnalyzer.h"
#include "StateManager.h"
#include "IPCBridge.h"
#include <memory>
#include <string>

namespace aether {

/**
 * Core AETHER Engine Processor.
 * Encapsulates:
 * 1. Lock-free real-time DSP Chain
 * 2. Background Telemetry Analyzer (LUFS, FFT, True Peak, Stereo Corr)
 * 3. Parameter State Manager (Cumulative Delta, Undo/Redo, A/B)
 * 4. Tempo-Locked Stem Playback Engine
 * 5. Multi-Client IPC Bridge
 */
class AetherProcessor {
public:
    AetherProcessor();
    ~AetherProcessor();

    void prepare(double sampleRate, int maxBlockSize);
    void reset();

    // Lock-free audio callback (called on real-time audio thread)
    void processBlock(float* const* channelData, size_t numChannels, size_t numSamples,
                      double hostBpm = 120.0, double hostPpq = 0.0, bool isPlaying = false) noexcept;

    // Subsystem accessors
    AetherDSPChain& getDSPChain() { return dspChain; }
    TelemetryAnalyzer& getAnalyzer() { return analyzer; }
    StateManager& getStateManager() { return stateManager; }
    StemPlaybackEngine& getStemPlayer() { return stemPlayer; }
    IPCBridge& getIPC() { return ipcBridge; }

    // Session snapshot builder for AI
    std::string createSessionSnapshotJSON(const std::string& userPrompt, double hostBpm);

    // Save / Restore DAW preset state
    std::string getStateXML() const;
    void setStateFromXML(const std::string& xml);

private:
    void setupIPCHandler();

    AetherDSPChain dspChain;
    TelemetryAnalyzer analyzer;
    StateManager stateManager;
    StemPlaybackEngine stemPlayer;
    IPCBridge ipcBridge;

    double currentSampleRate{48000.0};
    int currentBlockSize{1024};
    double lastHostBpm{120.0};
};

} // namespace aether
