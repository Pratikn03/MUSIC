#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================================="
echo "      AETHER: Real-Time AI Co-Producer Engine             "
echo "=========================================================="

export PATH="/opt/homebrew/bin:/Users/pratik_n/.local/bin:$PATH"

# 1. Compile C++ standalone if not already built
if [ ! -f "$ROOT_DIR/build/aether_standalone" ]; then
    echo "[Build] Compiling C++20 Standalone Engine..."
    mkdir -p "$ROOT_DIR/build"
    cd "$ROOT_DIR/build"
    cmake ..
    cmake --build . --config Release
fi

# 2. Kill any stale instances on ports 8998 and 8999
echo "[System] Checking ports 8998 and 8999..."
lsof -ti:8998 | xargs kill -9 2>/dev/null || true
lsof -ti:8999 | xargs kill -9 2>/dev/null || true

# 3. Launch C++ Standalone DSP Engine in background
echo "[DSP] Starting AETHER C++20 DSP Engine (Port 8998)..."
"$ROOT_DIR/build/aether_standalone" &
DSP_PID=$!

# 4. Launch AI Sidecar Daemon in background
echo "[AI] Starting AETHER AI Orchestration Sidecar (Port 8999)..."
python3 "$ROOT_DIR/sidecar/server.py" 8999 &
AI_PID=$!

# Cleanup on exit
trap 'echo -e "\n[Shutdown] Stopping AETHER services..."; kill $DSP_PID $AI_PID 2>/dev/null || true; exit 0' SIGINT SIGTERM EXIT

sleep 1.5

echo ""
echo "=========================================================="
echo "   AETHER IS NOW RUNNING!"
echo "   - C++ DSP Engine:     http://127.0.0.1:8998"
echo "   - AI Sidecar:          http://127.0.0.1:8999"
echo "   - Web UI Dev:          http://localhost:5173"
echo "=========================================================="
echo "Press Ctrl+C to terminate all services."
echo ""

wait
