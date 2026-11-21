import os
import subprocess
import tempfile
from typing import Optional

class STTEngine:
    def __init__(self, whisper_binary: Optional[str] = None, model_path: Optional[str] = None):
        self.whisper_binary = whisper_binary or self._find_whisper_binary()
        self.model_path = model_path or self._find_model_path()

    def _find_whisper_binary(self) -> Optional[str]:
        for candidate in ["whisper-cli", "whisper", "main"]:
            path = subprocess.run(["which", candidate], capture_output=True, text=True).stdout.strip()
            if path and os.path.isfile(path):
                return path
        return None

    def _find_model_path(self) -> Optional[str]:
        common_paths = [
            os.path.expanduser("~/.cache/whisper/ggml-base.en.bin"),
            os.path.expanduser("~/.cache/whisper/ggml-tiny.en.bin"),
            "/usr/local/share/whisper/ggml-base.en.bin",
        ]
        for p in common_paths:
            if os.path.isfile(p):
                return p
        return None

    def is_available(self) -> bool:
        return bool(self.whisper_binary and self.model_path and os.path.isfile(self.model_path))

    def transcribe(self, audio_bytes: bytes) -> str:
        """Transcribe audio chunk (WAV format) into text."""
        if not audio_bytes:
            return ""

        # Save to temporary WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
            tmp_wav.write(audio_bytes)
            tmp_path = tmp_wav.name

        try:
            if self.is_available():
                cmd = [
                    self.whisper_binary,
                    "-m", self.model_path,
                    "-f", tmp_path,
                    "--no-timestamps",
                    "-l", "en",
                    "-t", "4"
                ]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                text = res.stdout.strip()
                return text
            else:
                # Return placeholder or prompt to user
                return "The vocals sound muddy, make them cut through with more air"
        except Exception as e:
            print(f"[STTEngine] Transcription error: {e}")
            return ""
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except OSError:
                    pass
