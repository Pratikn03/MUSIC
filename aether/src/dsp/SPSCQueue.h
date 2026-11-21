#pragma once

#include <atomic>
#include <vector>
#include <cstddef>
#include <algorithm>

namespace aether {

/**
 * Single-Producer Single-Consumer (SPSC) Lock-Free Circular Queue.
 * Specifically engineered for real-time audio threads pushing audio
 * frames to background analysis threads without mutexes or heap allocations.
 */
template <typename T, size_t Capacity = 65536>
class SPSCQueue {
public:
    static_assert((Capacity & (Capacity - 1)) == 0, "Capacity must be a power of 2");

    SPSCQueue() : writeIndex(0), readIndex(0) {
        buffer.resize(Capacity);
    }

    // Called strictly from Audio Thread (Producer)
    size_t write(const T* data, size_t count) noexcept {
        const size_t currentRead = readIndex.load(std::memory_order_acquire);
        const size_t currentWrite = writeIndex.load(std::memory_order_relaxed);
        
        const size_t available = Capacity - (currentWrite - currentRead);
        const size_t toWrite = std::min(count, available);

        if (toWrite == 0) return 0;

        const size_t mask = Capacity - 1;
        const size_t part1 = std::min(toWrite, Capacity - (currentWrite & mask));
        const size_t part2 = toWrite - part1;

        std::copy_n(data, part1, buffer.data() + (currentWrite & mask));
        if (part2 > 0) {
            std::copy_n(data + part1, part2, buffer.data());
        }

        writeIndex.store(currentWrite + toWrite, std::memory_order_release);
        return toWrite;
    }

    // Called strictly from Analyzer Thread (Consumer)
    size_t read(T* dest, size_t count) noexcept {
        const size_t currentWrite = writeIndex.load(std::memory_order_acquire);
        const size_t currentRead = readIndex.load(std::memory_order_relaxed);

        const size_t available = currentWrite - currentRead;
        const size_t toRead = std::min(count, available);

        if (toRead == 0) return 0;

        const size_t mask = Capacity - 1;
        const size_t part1 = std::min(toRead, Capacity - (currentRead & mask));
        const size_t part2 = toRead - part1;

        std::copy_n(buffer.data() + (currentRead & mask), part1, dest);
        if (part2 > 0) {
            std::copy_n(buffer.data(), part2, dest + part1);
        }

        readIndex.store(currentRead + toRead, std::memory_order_release);
        return toRead;
    }

    size_t getAvailableRead() const noexcept {
        return writeIndex.load(std::memory_order_acquire) - readIndex.load(std::memory_order_relaxed);
    }

    void reset() noexcept {
        writeIndex.store(0, std::memory_order_relaxed);
        readIndex.store(0, std::memory_order_relaxed);
    }

private:
    alignas(64) std::atomic<size_t> writeIndex{0};
    alignas(64) std::atomic<size_t> readIndex{0};
    alignas(64) std::vector<T> buffer;
};

} // namespace aether
