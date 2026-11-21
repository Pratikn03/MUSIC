import os
import sys
import json
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from reasoning_engine import ReasoningEngine
from stt_engine import STTEngine
from stem_generator import StemGenerator

DSP_ENGINE_URL = "http://127.0.0.1:8998"
reasoning_engine = ReasoningEngine()
stt_engine = STTEngine()
stem_generator = StemGenerator()

def query_dsp_engine(payload_dict: dict) -> dict:
    try:
        data = json.dumps(payload_dict).encode("utf-8")
        req = urllib.request.Request(
            DSP_ENGINE_URL,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        # If DSP engine isn't running yet, return default
        return {"status": "dsp_offline", "error": str(e)}

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class AetherSidecarHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Concise logging
        pass

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/status":
            dsp_status = query_dsp_engine({"type": "get_telemetry"})
            res = {
                "status": "online",
                "dsp_connected": "error" not in dsp_status and dsp_status.get("status") != "dsp_offline",
                "llama_available": reasoning_engine.is_llama_available(),
                "whisper_available": stt_engine.is_available(),
                "port": 8999
            }
            self._send_json(200, res)

        elif self.path == "/api/telemetry":
            telem = query_dsp_engine({"type": "get_telemetry"})
            self._send_json(200, telem)

        elif self.path == "/api/state":
            state = query_dsp_engine({"type": "get_state"})
            self._send_json(200, state)

        elif self.path == "/api/history":
            hist = query_dsp_engine({"type": "get_history"})
            self._send_json(200, hist)

        else:
            self._send_json(404, {"error": "Not Found"})

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        post_body = self.rfile.read(content_len) if content_len > 0 else b"{}"

        try:
            body = json.loads(post_body.decode("utf-8"))
        except Exception:
            body = {}

        if self.path == "/api/chat":
            # 1. Fetch latest telemetry and knobs from C++ DSP engine if not provided
            if "telemetry" not in body or not body["telemetry"]:
                body["telemetry"] = query_dsp_engine({"type": "get_telemetry"})
            if "current_params" not in body or not body["current_params"]:
                body["current_params"] = query_dsp_engine({"type": "get_state"})

            # 2. Run local AI reasoning
            ai_result = reasoning_engine.query(body)

            # 3. Apply parameter delta directly to the C++ DSP engine
            delta = ai_result.get("parameter_delta", {})
            if delta:
                dsp_apply = query_dsp_engine({
                    "type": "apply_delta",
                    "delta": delta,
                    "explanation": ai_result.get("explanation", "")
                })
                ai_result["dsp_sync"] = dsp_apply

            self._send_json(200, ai_result)

        elif self.path == "/api/generate-stem":
            prompt = body.get("prompt", "8-bar dark syncopated bassline")
            bpm = float(body.get("bpm", 124.0))
            bar_len = int(body.get("bar_length", 8))
            key = body.get("key", "F minor")

            # Generate tempo-locked stem WAV
            stem_info = stem_generator.generate_stem(prompt, bpm, bar_len, key)

            # Load into C++ DSP Engine
            if stem_info.get("file_path"):
                load_resp = query_dsp_engine({
                    "type": "load_stem",
                    "path": stem_info["file_path"]
                })
                stem_info["dsp_loaded"] = load_resp.get("status") == "ok"

            self._send_json(200, stem_info)

        elif self.path == "/api/transcribe":
            # Push-to-talk audio intake
            audio_hex = body.get("audio_hex", "")
            audio_bytes = bytes.fromhex(audio_hex) if audio_hex else b""
            text = stt_engine.transcribe(audio_bytes)
            self._send_json(200, {"transcript": text})

        elif self.path == "/api/param":
            # Direct knob manipulation
            res = query_dsp_engine({
                "type": "set_param",
                "id": body.get("id"),
                "value": float(body.get("value", 0.0))
            })
            self._send_json(200, res)

        elif self.path == "/api/undo":
            res = query_dsp_engine({"type": "undo"})
            self._send_json(200, res)

        elif self.path == "/api/redo":
            res = query_dsp_engine({"type": "redo"})
            self._send_json(200, res)

        elif self.path == "/api/toggle-ab":
            res = query_dsp_engine({"type": "toggle_ab"})
            self._send_json(200, res)

        else:
            self._send_json(404, {"error": "Endpoint not found"})

    def _send_json(self, status: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def run(port: int = 8999):
    server = ThreadedHTTPServer(("127.0.0.1", port), AetherSidecarHandler)
    print(f"========================================================")
    print(f"   AETHER AI Sidecar Daemon Running on 127.0.0.1:{port}")
    print(f"   - Connected DSP Engine: {DSP_ENGINE_URL}")
    print(f"   - Reasoning Engine: Active")
    print(f"   - Tempo-Locked Stem Generator: Active")
    print(f"========================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down AI Sidecar cleanly.")
        server.server_close()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8999
    run(port)
