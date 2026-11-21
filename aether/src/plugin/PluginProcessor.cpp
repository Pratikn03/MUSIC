#include "PluginProcessor.h"
#include <iostream>
#include <sstream>

namespace aether {

AetherProcessor::AetherProcessor() : ipcBridge(8998) {
    setupIPCHandler();
    stateManager.setStateChangedCallback([this](const ParameterSnapshot& snap) {
        dspChain.applySnapshot(snap);
    });
}

AetherProcessor::~AetherProcessor() {
    analyzer.stop();
    ipcBridge.stop();
}

void AetherProcessor::prepare(double sampleRate, int maxBlockSize) {
    currentSampleRate = sampleRate;
    currentBlockSize = maxBlockSize;

    dspChain.prepare(sampleRate, maxBlockSize);
    analyzer.prepare(sampleRate);
    analyzer.start();

    stemPlayer.prepare(sampleRate);
    ipcBridge.start();
}

void AetherProcessor::reset() {
    dspChain.reset();
}

void AetherProcessor::processBlock(float* const* channelData, size_t numChannels, size_t numSamples,
                                  double hostBpm, double hostPpq, bool isPlaying) noexcept {
    lastHostBpm = hostBpm > 10.0 ? hostBpm : 120.0;

    // 1. Synchronized Stem Playback Injection
    stemPlayer.mix(channelData, numChannels, numSamples, hostBpm, hostPpq, isPlaying);

    // 2. Real-Time Lock-Free DSP Processing
    dspChain.process(channelData, numChannels, numSamples, &analyzer.getQueue());

    // 3. Telemetry Feedback
    analyzer.setGainReduction(dspChain.getGainReductionDb());
}

std::string AetherProcessor::createSessionSnapshotJSON(const std::string& userPrompt, double hostBpm) {
    std::ostringstream ss;
    ss << "{"
       << "\"user_prompt\":\"" << userPrompt << "\","
       << "\"bpm\":" << (hostBpm > 10.0 ? hostBpm : lastHostBpm) << ","
       << "\"telemetry\":" << analyzer.getLatestTelemetryJSON() << ","
       << "\"current_params\":" << stateManager.getCurrentStateJSON()
       << "}";
    return ss.str();
}

void AetherProcessor::setupIPCHandler() {
    ipcBridge.setMessageHandler([this](const std::string& type, const std::string& payload) -> std::string {
        if (type == "get_telemetry") {
            return analyzer.getLatestTelemetryJSON();
        } else if (type == "get_state") {
            return stateManager.getCurrentStateJSON();
        } else if (type == "get_history") {
            return stateManager.getHistoryJSON();
        } else if (type == "get_session_snapshot") {
            return createSessionSnapshotJSON("", lastHostBpm);
        } else if (type == "undo") {
            bool ok = stateManager.undo();
            return std::string("{\"status\":\"ok\",\"undo_performed\":") + (ok ? "true" : "false") + "}";
        } else if (type == "redo") {
            bool ok = stateManager.redo();
            return std::string("{\"status\":\"ok\",\"redo_performed\":") + (ok ? "true" : "false") + "}";
        } else if (type == "toggle_ab") {
            stateManager.toggleAB();
            return std::string("{\"status\":\"ok\",\"active_slot\":\"") + stateManager.getActiveSlot() + "\"}";
        } else if (type == "set_param") {
            // Parse {"id": "...", "value": 12.3}
            size_t idPos = payload.find("\"id\":");
            size_t valPos = payload.find("\"value\":");
            if (idPos != std::string::npos && valPos != std::string::npos) {
                size_t q1 = payload.find("\"", idPos + 5);
                size_t q2 = payload.find("\"", q1 + 1);
                std::string id = payload.substr(q1 + 1, q2 - q1 - 1);
                float val = std::stof(payload.substr(valPos + 8));
                stateManager.setSingleParameter(id, val, false);
                return "{\"status\":\"ok\"}";
            }
        } else if (type == "apply_delta") {
            // Apply surgical cumulative delta from AI
            // We search for key-value pairs inside delta object
            size_t deltaStart = payload.find("\"delta\":");
            std::string desc = "AI Parameter Edit";
            size_t descPos = payload.find("\"explanation\":");
            if (descPos != std::string::npos) {
                size_t q1 = payload.find("\"", descPos + 14);
                size_t q2 = payload.find("\"", q1 + 1);
                if (q1 != std::string::npos && q2 != std::string::npos) {
                    desc = payload.substr(q1 + 1, q2 - q1 - 1);
                }
            }

            if (deltaStart != std::string::npos) {
                std::unordered_map<std::string, float> deltaMap;
                for (const auto& def : getParameterDefinitions()) {
                    std::string keyPattern = "\"" + def.id + "\":";
                    size_t kp = payload.find(keyPattern, deltaStart);
                    if (kp != std::string::npos) {
                        float v = std::stof(payload.substr(kp + keyPattern.size()));
                        deltaMap[def.id] = v;
                    }
                }
                stateManager.applyDelta(deltaMap, desc);
                return "{\"status\":\"ok\",\"applied_count\":" + std::to_string(deltaMap.size()) + "}";
            }
        } else if (type == "load_stem") {
            // Parse stem file path and load into stem player
            size_t pathPos = payload.find("\"path\":");
            if (pathPos != std::string::npos) {
                size_t q1 = payload.find("\"", pathPos + 7);
                size_t q2 = payload.find("\"", q1 + 1);
                std::string path = payload.substr(q1 + 1, q2 - q1 - 1);
                bool loaded = stemPlayer.loadWavFile(path, "Generated Stem", lastHostBpm, 8, "F minor");
                return std::string("{\"status\":") + (loaded ? "\"ok\"" : "\"error\"") + "}";
            }
        }

        return "{\"status\":\"ok\"}";
    });
}

std::string AetherProcessor::getStateXML() const {
    std::ostringstream ss;
    ss << "<AETHER_STATE version=\"1.0.0\">\n";
    auto snap = stateManager.getCurrentState();
    for (const auto& [id, val] : snap.values) {
        ss << "  <PARAM id=\"" << id << "\" value=\"" << val << "\"/>\n";
    }
    ss << "</AETHER_STATE>";
    return ss.str();
}

void AetherProcessor::setStateFromXML(const std::string& xml) {
    std::unordered_map<std::string, float> delta;
    for (const auto& def : getParameterDefinitions()) {
        std::string tag = "id=\"" + def.id + "\" value=\"";
        size_t pos = xml.find(tag);
        if (pos != std::string::npos) {
            float v = std::stof(xml.substr(pos + tag.size()));
            delta[def.id] = v;
        }
    }
    if (!delta.empty()) {
        stateManager.applyDelta(delta, "Restore DAW Preset Session");
    }
}

} // namespace aether
