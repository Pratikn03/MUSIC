import os
import wave
import struct
import math
import random
import tempfile
from typing import Dict, Any

class StemGenerator:
    def __init__(self, output_dir: str = "/tmp/aether_stems"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_stem(self, prompt: str, bpm: float = 120.0, bar_length: int = 8, key: str = "F minor") -> Dict[str, Any]:
        """
        Generates a tempo-locked audio stem matching the exact BPM, bar length, and musical key.
        Returns stem metadata including the path to the written 48kHz stereo WAV file.
        """
        bpm = max(bpm, 20.0)
        bar_length = max(bar_length, 1)

        # Exact duration calculation: bar_length * 4 beats * (60 / BPM)
        seconds_per_beat = 60.0 / bpm
        total_beats = bar_length * 4
        total_duration = total_beats * seconds_per_beat

        sample_rate = 48000
        total_samples = int(total_duration * sample_rate)

        filename = f"aether_stem_{bpm:.0f}bpm_{bar_length}bars_{random.randint(1000, 9999)}.wav"
        filepath = os.path.join(self.output_dir, filename)

        # Parse root frequency from key
        root_freq = self._key_to_freq(key)

        # Synthesize tempo-locked musical audio based on prompt
        self._synthesize_musical_stem(filepath, prompt, bpm, total_duration, sample_rate, total_samples, root_freq)

        return {
            "status": "success",
            "prompt": prompt,
            "bpm": bpm,
            "bar_length": bar_length,
            "key": key,
            "duration_seconds": round(total_duration, 3),
            "file_path": filepath,
            "sample_rate": sample_rate
        }

    def _key_to_freq(self, key_str: str) -> float:
        # Standard root notes
        note_freqs = {
            "c": 65.41, "c#": 69.30, "db": 69.30,
            "d": 73.42, "d#": 77.78, "eb": 77.78,
            "e": 82.41,
            "f": 87.31, "f#": 92.50, "gb": 92.50,
            "g": 98.00, "g#": 103.83, "ab": 103.83,
            "a": 110.00, "a#": 116.54, "bb": 116.54,
            "b": 123.47
        }
        clean = key_str.lower().strip().split()[0]
        return note_freqs.get(clean, 87.31) # Default F (F minor = 87.31 Hz)

    def _synthesize_musical_stem(self, filepath: str, prompt: str, bpm: float, duration: float, sample_rate: int, num_samples: int, root_freq: float):
        p_lower = prompt.lower()
        samples_left = [0.0] * num_samples
        samples_right = [0.0] * num_samples

        seconds_per_beat = 60.0 / bpm
        seconds_per_16th = seconds_per_beat / 4.0
        samples_per_16th = int(seconds_per_16th * sample_rate)

        # 1. Bassline synthesis (Dark, syncopated sub-bass)
        if any(w in p_lower for w in ["bass", "sub", "808", "low"]):
            # Minor pentatonic intervals (1, b3, 4, 5, b7)
            intervals = [1.0, 1.189, 1.334, 1.498, 1.781]
            pattern_16ths = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0] # Syncopated groove

            for step in range(int(duration / seconds_per_16th)):
                pattern_idx = step % len(pattern_16ths)
                if pattern_16ths[pattern_idx]:
                    start_s = step * samples_per_16th
                    note_interval = intervals[(step // 4) % len(intervals)]
                    freq = root_freq * note_interval
                    note_len = int(samples_per_16th * 1.8)

                    for n in range(note_len):
                        if start_s + n >= num_samples:
                            break
                        t = n / sample_rate
                        # ADSR envelope
                        env = math.exp(-t * 6.5)
                        # Saturated Sine + Sawtooth sub
                        val = (0.75 * math.sin(2 * math.pi * freq * t) + 0.25 * math.sin(4 * math.pi * freq * t)) * env
                        val = math.tanh(val * 1.8) * 0.45
                        samples_left[start_s + n] += val
                        samples_right[start_s + n] += val

        # 2. Drum / Beat loop synthesis
        elif any(w in p_lower for w in ["drum", "beat", "kick", "percussion", "loop", "groove"]):
            samples_per_beat = int(seconds_per_beat * sample_rate)
            for b in range(int(duration / seconds_per_beat)):
                # Kick on beats 0, 1, 2, 3
                start_k = b * samples_per_beat
                for n in range(min(sample_rate // 4, num_samples - start_k)):
                    t = n / sample_rate
                    f = 130.0 * math.exp(-t * 35.0) + 45.0
                    env = math.exp(-t * 12.0)
                    k_val = math.sin(2 * math.pi * f * t) * env * 0.6
                    samples_left[start_k + n] += k_val
                    samples_right[start_k + n] += k_val

                # Snare / Clap on beats 1 and 3 (0-indexed 1 and 3)
                if b % 2 == 1:
                    start_sn = start_k
                    for n in range(min(sample_rate // 5, num_samples - start_sn)):
                        t = n / sample_rate
                        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 18.0) * 0.35
                        tone = math.sin(2 * math.pi * 220.0 * t) * math.exp(-t * 25.0) * 0.25
                        samples_left[start_sn + n] += noise + tone
                        samples_right[start_sn + n] += noise + tone

        # 3. Ambient Pad / Lead / Arp
        else:
            chord_notes = [root_freq * 2.0, root_freq * 2.378, root_freq * 2.996]
            for i in range(num_samples):
                t = i / sample_rate
                val = 0.0
                for f in chord_notes:
                    val += math.sin(2 * math.pi * f * t + math.sin(2 * math.pi * 0.5 * t) * 0.2)
                val *= 0.12 * (0.8 + 0.2 * math.sin(2 * math.pi * (bpm / 60.0) * t))
                samples_left[i] = val * 0.9
                samples_right[i] = val * 1.1

        # Write pristine 16-bit Stereo PCM WAV
        with wave.open(filepath, "wb") as wav_out:
            wav_out.setnchannels(2)
            wav_out.setsampwidth(2)
            wav_out.setframerate(sample_rate)

            raw_bytes = bytearray()
            for i in range(num_samples):
                l_clamped = max(-0.99, min(0.99, samples_left[i]))
                r_clamped = max(-0.99, min(0.99, samples_right[i]))
                int_l = int(l_clamped * 32767.0)
                int_r = int(r_clamped * 32767.0)
                raw_bytes.extend(struct.pack("<hh", int_l, int_r))

            wav_out.writeframes(raw_bytes)
