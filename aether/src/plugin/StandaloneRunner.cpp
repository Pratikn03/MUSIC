#include "PluginProcessor.h"
#include <iostream>
#include <chrono>
#include <thread>
#include <cmath>
#include <vector>
#include <csignal>

static std::atomic<bool> gKeepRunning{true};

void sigHandler(int) {
    gKeepRunning.store(false);
}

int main(int, char*[]) {
    std::signal(SIGINT, sigHandler);
    std::signal(SIGTERM, sigHandler);

    std::cout << "========================================================\n";
    std::cout << "   AETHER: Real-Time AI Co-Producer Engine (C++20)\n";
    std::cout << "========================================================\n";

    double sampleRate = 48000.0;
    int blockSize = 512;

    aether::AetherProcessor processor;
    processor.prepare(sampleRate, blockSize);

    std::cout << "[Engine] Lock-Free DSP Chain Initialized.\n";
    std::cout << "[Engine] Real-time Telemetry Analyzer Thread Active.\n";
    std::cout << "[Engine] IPC Bridge Listening on 127.0.0.1:" << processor.getIPC().getPort() << "\n";
    std::cout << "[Engine] Ready for DAW or AI Sidecar connection.\n";

    std::vector<float> left(blockSize, 0.0f);
    std::vector<float> right(blockSize, 0.0f);
    float* channels[2] = { left.data(), right.data() };

    double phase = 0.0;
    double bpm = 124.0;
    double ppq = 0.0;

    while (gKeepRunning.load()) {

        // Simulate audio playback in standalone mode (musical chord / harmonics + percussion pulse)
        ppq += (bpm / 60.0) * (static_cast<double>(blockSize) / sampleRate);

        for (int i = 0; i < blockSize; ++i) {
            // Low-end fundamental + harmonic air
            float s = 0.25f * std::sin(phase) + 0.12f * std::sin(phase * 2.01) + 0.08f * std::sin(phase * 4.02);
            phase += 2.0 * 3.1415926535 * 110.0 / sampleRate; // 110 Hz (A2)
            if (phase > 2.0 * 3.1415926535) phase -= 2.0 * 3.1415926535;

            // Subtle vinyl/transient texture
            float noise = ((std::rand() % 1000) / 500.0f - 1.0f) * 0.02f;

            left[i] = s + noise;
            right[i] = s * 0.95f - noise;
        }

        processor.processBlock(channels, 2, blockSize, bpm, ppq, true);

        // Sleep to throttle simulated real-time audio block
        double blockTimeMs = (static_cast<double>(blockSize) / sampleRate) * 1000.0;
        std::this_thread::sleep_for(std::chrono::milliseconds(static_cast<int>(blockTimeMs * 0.9)));
    }

    std::cout << "\n[Engine] Shutting down cleanly...\n";
    return 0;
}
