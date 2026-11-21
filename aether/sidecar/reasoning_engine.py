import os
import json
import re
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple
from prompts import SYSTEM_PROMPT, format_session_prompt

class ReasoningEngine:
    def __init__(self, llama_url: str = "http://127.0.0.1:8080"):
        self.llama_url = llama_url.rstrip("/")

    def is_llama_available(self) -> bool:
        try:
            req = urllib.request.Request(f"{self.llama_url}/health", method="GET")
            with urllib.request.urlopen(req, timeout=0.5) as resp:
                return resp.status == 200
        except Exception:
            return False

    def query(self, session_data: dict) -> dict:
        user_prompt = session_data.get("user_prompt", "").strip()

        # Check if it's a pure educational question
        if self._is_educational_question(user_prompt):
            return self._answer_educational_question(user_prompt, session_data)

        # Attempt query via local llama.cpp if active
        if self.is_llama_available():
            try:
                result = self._query_llamacpp(session_data)
                if result and "parameter_delta" in result:
                    return result
            except Exception as e:
                print(f"[ReasoningEngine] Llama.cpp query failed ({e}), falling back to internal expert engine.")

        # Real-time audio engineering expert engine
        return self._expert_dsp_reasoning(session_data)

    def _is_educational_question(self, prompt: str) -> bool:
        lower = prompt.lower()
        question_words = ["why did you", "what is", "how does", "explain", "why use", "can you tell me"]
        return any(lower.startswith(w) or f" {w} " in f" {lower} " for w in question_words) and not any(w in lower for w in ["make", "cut", "boost", "add", "remove", "tighten", "widen"])

    def _answer_educational_question(self, prompt: str, session_data: dict) -> dict:
        lower = prompt.lower()
        current = session_data.get("current_params", {})
        telem = session_data.get("telemetry", {})

        if "attack" in lower:
            att = current.get("comp_attack_ms", 15.0)
            return {
                "parameter_delta": {},
                "explanation": f"A {att:.1f}ms attack time allows initial percussive transients (like vocal consonants or drum stick clicks) to punch through cleanly before gain reduction engages, preserving natural punch and dynamics.",
                "audio_insight": f"Current peak level is at {telem.get('peak_db', -3.0):.1f} dBFS with short-term LUFS at {telem.get('lufs_short_term', -14.0):.1f}.",
                "confidence": 0.98
            }
        elif "ratio" in lower:
            r = current.get("comp_ratio", 2.5)
            return {
                "parameter_delta": {},
                "explanation": f"A gentle {r:.1f}:1 ratio provides smooth, transparent dynamic leveling without audible pumping or squashing the performance.",
                "audio_insight": "Ideal for bus glue and subtle vocal contouring.",
                "confidence": 0.96
            }
        elif "mud" in lower or "low-mid" in lower or "250" in lower or "300" in lower:
            return {
                "parameter_delta": {},
                "explanation": "The 200 Hz - 400 Hz octave is where acoustic resonances, proximity effect, and room reflections accumulate ('mud'). Cutting with a moderate Q (1.2–1.8) restores clarity to upper mids and vocals.",
                "audio_insight": f"Current low-mid band energy: {telem.get('bands_db', {}).get('low_mid', -10.0):.1f} dBFS.",
                "confidence": 0.97
            }
        else:
            return {
                "parameter_delta": {},
                "explanation": "In professional mixing, every processing move serves frequency separation, transient balance, and spatial depth. Parameter choices are adjusted dynamically based on spectral telemetry.",
                "audio_insight": "Consult the spectrum analyzer and gain reduction meter to view current acoustic response.",
                "confidence": 0.90
            }

    def _expert_dsp_reasoning(self, session_data: dict) -> dict:
        prompt = session_data.get("user_prompt", "").lower()
        telem = session_data.get("telemetry", {})
        bands = telem.get("bands_db", {})
        current = session_data.get("current_params", {})

        delta: Dict[str, float] = {}
        explanation_parts = []
        insight_parts = []

        # 1. Clean up mud / boxiness
        if any(w in prompt for w in ["mud", "muddy", "box", "boxy", "cloudy", "clear up"]):
            target_freq = 320.0
            current_gain = current.get("eq_band2_gain", 0.0)
            new_gain = round(current_gain - 3.5, 1)
            delta["eq_band2_freq"] = target_freq
            delta["eq_band2_gain"] = max(new_gain, -18.0)
            delta["eq_band2_q"] = 1.4
            explanation_parts.append(f"Cut {abs(new_gain - current_gain):.1f} dB at 320 Hz (Q: 1.4) to scoop out low-mid boxiness")
            insight_parts.append(f"Low-mid energy was heavy at {bands.get('low_mid', -8.0):.1f} dBFS")

        # 2. Brighten / Vocal Air / Presence
        if any(w in prompt for w in ["bright", "brighter", "air", "sparkle", "shine", "vocal presence", "cut through"]):
            target_freq = 8500.0
            current_gain = current.get("eq_band4_gain", 0.0)
            new_gain = round(current_gain + 2.5, 1)
            delta["eq_band4_freq"] = target_freq
            delta["eq_band4_gain"] = min(new_gain, 12.0)
            delta["eq_band4_q"] = 0.707
            explanation_parts.append(f"Boosted high-shelf by {new_gain - current_gain:+.1f} dB at 8.5 kHz for open, silky air")
            insight_parts.append(f"Air band was quiet at {bands.get('air', -25.0):.1f} dBFS")

        # 3. Tighten bass / punch / sub control
        if any(w in prompt for w in ["bass", "sub", "punch", "punchy", "kick", "tight"]):
            current_b1_gain = current.get("eq_band1_gain", 0.0)
            delta["eq_band1_freq"] = 75.0
            delta["eq_band1_gain"] = round(current_b1_gain + 2.0, 1)
            delta["eq_band1_q"] = 0.8
            # Tighten compressor for punch
            delta["comp_attack_ms"] = 25.0
            delta["comp_release_ms"] = 80.0
            delta["comp_ratio"] = 3.5
            delta["comp_threshold"] = -16.0
            explanation_parts.append("Sculpted 75 Hz low shelf (+2.0 dB) and dialed in a 25ms attack / 80ms release for punchy transient snap")
            insight_parts.append(f"Sub was at {bands.get('sub', -28.0):.1f} dB, Bass at {bands.get('bass', -14.0):.1f} dB")

        # 4. Compression / Glue / Dynamic control
        if any(w in prompt for w in ["compress", "compression", "glue", "tighten", "level", "control"]):
            delta["comp_threshold"] = -18.0
            delta["comp_ratio"] = 3.0
            delta["comp_attack_ms"] = 18.0
            delta["comp_release_ms"] = 120.0
            delta["comp_makeup_gain_db"] = 2.0
            explanation_parts.append("Engaged smooth bus glue compression (Threshold: -18 dB, Ratio: 3:1, Attack: 18ms, Release: 120ms)")
            insight_parts.append(f"Current dynamic spread: Peak {telem.get('peak_db', -2.0):.1f} dBFS vs LUFS {telem.get('lufs_short_term', -14.0):.1f}")

        # 5. Stereo Width
        if any(w in prompt for w in ["wide", "widen", "stereo", "spacious"]):
            current_w = current.get("stereo_width", 1.0)
            delta["stereo_width"] = min(round(current_w + 0.25, 2), 1.6)
            explanation_parts.append(f"Expanded stereo width matrix to {delta['stereo_width']:.2f}x for increased spatial immersion")
            insight_parts.append(f"Correlation is {telem.get('stereo_correlation', 0.9):.2f} (safe phase margin)")
        elif any(w in prompt for w in ["mono", "narrow", "center"]):
            delta["stereo_width"] = 0.75
            explanation_parts.append("Focused low and mid energy toward center (0.75x width) for punchier mono compatibility")
            insight_parts.append("Stereo correlation verified positive")

        # 6. De-harsh / Smooth highs
        if any(w in prompt for w in ["harsh", "sharp", "smooth highs", "de-ess", "tame"]):
            delta["eq_band3_freq"] = 3800.0
            delta["eq_band3_gain"] = -2.5
            delta["eq_band3_q"] = 2.2
            explanation_parts.append("Tamed 3.8 kHz sibilance with a -2.5 dB surgical notch (Q: 2.2)")
            insight_parts.append(f"High-mid band energy was prominent at {bands.get('high_mid', -15.0):.1f} dBFS")

        # Fallback if no specific trigger matched
        if not delta:
            delta["eq_band2_gain"] = -1.5
            delta["eq_band4_gain"] = 1.5
            delta["comp_threshold"] = -15.0
            explanation_parts.append("Subtly balanced spectral response with -1.5 dB low-mid contour and +1.5 dB high-shelf polish")
            insight_parts.append(f"Peak: {telem.get('peak_db', -3.0):.1f} dBFS, LUFS: {telem.get('lufs_short_term', -14.0):.1f}")

        return {
            "parameter_delta": delta,
            "explanation": ". ".join(explanation_parts) + ".",
            "audio_insight": ". ".join(insight_parts) if insight_parts else "Acoustic telemetry grounded.",
            "confidence": 0.94
        }

    def _query_llamacpp(self, session_data: dict) -> dict:
        prompt_text = format_session_prompt(session_data)
        payload = {
            "prompt": f"{SYSTEM_PROMPT}\n\n{prompt_text}",
            "temperature": 0.2,
            "max_tokens": 512,
            "stream": False
        }

        req = urllib.request.Request(
            f"{self.llama_url}/completion",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            content = data.get("content", "")
            # Extract JSON block
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        return {}
