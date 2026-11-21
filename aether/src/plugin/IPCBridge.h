#pragma once

#include <string>
#include <functional>
#include <memory>
#include <atomic>
#include <thread>
#include <unordered_map>
#include "../analyzer/AudioTelemetry.h"
#include "StateManager.h"

namespace aether {

/**
 * IPC message dispatcher between:
 * 1. JUCE C++ Engine (DSP, Analyzer, StateManager)
 * 2. React UI (WebView / Browser)
 * 3. Local AI Sidecar (Whisper, llama.cpp, Stem Generator)
 */
class IPCBridge {
public:
    using MessageHandler = std::function<std::string(const std::string& type, const std::string& payload)>;

    IPCBridge(int port = 8998);
    ~IPCBridge();

    void start();
    void stop();

    void setMessageHandler(MessageHandler handler) {
        onMessage = std::move(handler);
    }

    // Broadcast telemetry update to connected UI clients
    void broadcastTelemetry(const AudioTelemetry& telemetry);
    void broadcastState(const std::string& stateJson);

    // Direct invocation endpoint for local command processing
    std::string processMessage(const std::string& rawJson);

    int getPort() const { return serverPort; }
    bool isServerRunning() const { return isRunning.load(); }

private:
    void listenLoop();

    int serverPort{8998};
    std::atomic<bool> isRunning{false};
    std::thread serverThread;
    MessageHandler onMessage;
};

} // namespace aether
