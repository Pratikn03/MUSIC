# ⚡ AETHER: Real-Time Local AI Co-Producer

> **A professional, 100% on-device AI Co-Producer running as a VST3/AU DAW Plugin (Ableton Live, FL Studio, Logic Pro, Pro Tools) and Standalone Desktop Application.**

Unlike web wrappers that generate flat, uneditable MP3s, **AETHER** is a **lock-free, zero-latency C++20 DSP engine** paired with an **on-device AI orchestration layer**. It listens to live audio, accepts natural-language voice or text mixing directions, performs surgical, non-destructive DSP parameter edits in real time, generates tempo-locked audio stems locally, and mentors you through every engineering decision.

---

## 🎧 Core Features

### 1. Live Voice-to-DSP Mixing (Non-Destructive)
- Speak or type mixing instructions while music is playing:  
  *`"The bass is muddying the vocals, make the vocals brighter and tighter"`*
- Real-time background telemetry extractor computes ITU-R BS.1770 LUFS (Integrated & Short-term), True Peak, 6-band FFT spectral profile (Sub, Bass, Low-Mid, Mid, High-Mid, Air), and Stereo Correlation (-1.0 to +1.0).
- Local AI parses acoustic telemetry + console state and computes a **strict JSON Parameter Delta** ($\Delta P_t$).
- Zero-latency C++20 DSP engine smoothly interpolates parameters with `juce::SmoothedValue` — **zero clicks, pops, or audio dropouts**.

### 2. Surgical, Cumulative Edits & Undo Tree
- Every action is a cumulative delta, never a destructive preset reset. Untouched knobs remain locked.
- Complete **Undo / Redo** stack.
- One-click **A/B Comparison** toggle to audit Before AI vs. After AI instantly.

### 3. Interactive Mentor Mode
- Every parameter change is accompanied by an audio-grounded explanation in plain English:  
  *`"Cut 3.5 dB at 320 Hz (Q: 1.4) to remove low-mid boxiness, boosted high-shelf by +2.5 dB at 8.5 kHz for open, silky air, and tightened attack to 25ms."`*
- Ask pure educational questions (*"Why did you use a 15ms attack on the compressor?"*) without altering the audio.

### 4. Tempo-Locked Local Stem Generation
- Request any musical element:  
  *`"Generate an 8-bar dark syncopated bassline at 124 BPM in F minor"`*
- Calculates sample-accurate duration ($T = \text{bars} \times 4 \times \frac{60}{\text{BPM}}$) and generates 48kHz stereo WAV stems locally.
- Automatically loads the resulting audio into an internal synchronized playback slot locked to the DAW host's BPM and playhead position.

---

## 🏛️ Technical Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DAW HOST (VST3 / AU / Standalone)               │
├────────────────────────────────────────────────────────────────────────┤
│  Audio Thread (100% Lock-Free):                                        │
│  Input Gain ──► 4-Band EQ ──► Compressor ──► Stereo Width ──► Limiter  │
│       │                               ▲                        ▲       │
│       ▼                               │                        │       │
│  [SPSC Lock-Free Ring]       Smoothed Parameters         Stem Player   │
│       │                               ▲                        ▲       │
│       ▼                               │                        │       │
│  Telemetry Analyzer Thread ──► State Manager ◄─── Native IPC Bridge    │
│  (LUFS, FFT, Peak, Corr)       (Undo/Redo/AB)     (127.0.0.1:8998)     │
└───────────────────────────────────────▲────────────────────────┼───────┘
                                        │                        │
┌───────────────────────────────────────┴────────────────────────▼───────┐
│              AETHER LOCAL AI ORCHESTRATION SIDECAR (Port 8999)         │
├────────────────────────────────────────────────────────────────────────┤
│  • Speech-to-Text: Local whisper.cpp push-to-talk                      │
│  • Reasoning Engine: Local llama.cpp + GBNF Grammar / Expert Engine   │
│  • Stem Generator: Stable Audio Open / Tempo-locked synthesis         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart Guide

### Prerequisites
- macOS (Apple Silicon or Intel) or Linux
- CMake >= 3.22, Clang++ / GCC with C++20 support
- Python 3.10+
- Node.js >= 18 (for UI development)

### 1. Build and Run Standalone Demo
To build the C++ engine and launch both the DSP engine and AI Sidecar with one command:

```bash
cd aether
chmod +x scripts/run_standalone_demo.sh
./scripts/run_standalone_demo.sh
```

### 2. Run the Modern Web UI
In a separate terminal:

```bash
cd aether/ui
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. The UI connects live to the C++ DSP engine and AI Sidecar!

---

## 📋 Data Contracts (JSON Schemas)

### AI Input Snapshot (`SessionSnapshot`)
```json
{
  "user_prompt": "The bass is muddying the vocals, make the vocals brighter and tighter",
  "bpm": 124.0,
  "telemetry": {
    "lufs_short_term": -14.2,
    "peak_db": -1.5,
    "bands_db": {
      "sub": -28.0,
      "bass": -12.4,
      "low_mid": -8.1,
      "mid": -15.0,
      "high_mid": -19.2,
      "air": -26.5
    },
    "stereo_correlation": 0.85
  },
  "current_params": {
    "eq_band2_freq": 320.0,
    "eq_band2_gain": 0.0,
    "eq_band2_q": 1.4,
    "eq_band4_freq": 8500.0,
    "eq_band4_gain": 0.0,
    "comp_threshold": -14.0,
    "comp_ratio": 2.5,
    "comp_attack_ms": 15.0,
    "comp_release_ms": 120.0
  }
}
```

### AI Output (`ParameterDelta` & Mentor)
```json
{
  "parameter_delta": {
    "eq_band2_freq": 320.0,
    "eq_band2_gain": -3.5,
    "eq_band4_freq": 8500.0,
    "eq_band4_gain": 2.5,
    "comp_attack_ms": 25.0,
    "comp_release_ms": 80.0,
    "comp_ratio": 3.5,
    "comp_threshold": -16.0
  },
  "explanation": "Cut 3.5 dB at 320 Hz (Q: 1.4) to scoop out low-mid boxiness. Boosted high-shelf by +2.5 dB at 8.5 kHz for open, silky air. Sculpted 75 Hz low shelf (+2.0 dB) and dialed in a 25ms attack / 80ms release for punchy transient snap.",
  "audio_insight": "Low-mid energy was heavy at -8.1 dBFS. Air band was quiet at -26.5 dBFS.",
  "confidence": 0.94
}
```

---

## 🎛️ DSP Parameter Reference

| Parameter ID | Name | Range | Default | Unit | Description |
|---|---|---|---|---|---|
| `input_gain_db` | Input Gain | -36 to +36 | 0.0 | dB | Pre-filter stage gain |
| `phase_invert` | Phase Invert | 0 or 1 | 0 | - | Polarity 180° flip |
| `eq_band1_freq` | Low Shelf Freq | 20 to 500 | 80.0 | Hz | Sub/bass shelf cutoff |
| `eq_band1_gain` | Low Shelf Gain | -24 to +24 | 0.0 | dB | Low-end gain adjustment |
| `eq_band1_q` | Low Shelf Q | 0.1 to 10.0 | 0.707 | - | Low shelf slope |
| `eq_band2_freq` | Bell 1 Freq | 50 to 4000 | 350.0 | Hz | Low-mid de-mud / body |
| `eq_band2_gain` | Bell 1 Gain | -24 to +24 | 0.0 | dB | Bell peak/dip |
| `eq_band2_q` | Bell 1 Q | 0.1 to 10.0 | 1.4 | - | Filter resonance/bandwidth |
| `eq_band3_freq` | Bell 2 Freq | 200 to 16000 | 2500.0 | Hz | High-mid presence / bite |
| `eq_band3_gain` | Bell 2 Gain | -24 to +24 | 0.0 | dB | Bell peak/dip |
| `eq_band3_q` | Bell 2 Q | 0.1 to 10.0 | 1.4 | - | Filter resonance/bandwidth |
| `eq_band4_freq` | High Shelf Freq | 1000 to 20000 | 8500.0 | Hz | Air & treble cutoff |
| `eq_band4_gain` | High Shelf Gain | -24 to +24 | 0.0 | dB | Air gain adjustment |
| `eq_band4_q` | High Shelf Q | 0.1 to 10.0 | 0.707 | - | High shelf slope |
| `comp_threshold` | Threshold | -60 to 0 | -14.0 | dB | Dynamics trigger level |
| `comp_ratio` | Ratio | 1.0 to 30.0 | 2.5 | :1 | Compression slope |
| `comp_attack_ms` | Attack | 0.1 to 200.0 | 15.0 | ms | Transient pass time |
| `comp_release_ms` | Release | 5.0 to 2000.0 | 120.0 | ms | Recovery ballistics |
| `comp_makeup_gain_db` | Makeup Gain | -12 to +24 | 0.0 | dB | Post-comp leveling |
| `stereo_width` | Stereo Width | 0.0 to 2.0 | 1.0 | - | Mid/Side matrix width |
| `pan` | Pan | -1.0 to +1.0 | 0.0 | - | Constant power stereo pan |
| `limiter_ceiling_db` | Limiter Ceiling | -12 to 0.0 | -0.2 | dBFS | Peak limiter ceiling |
| `output_gain_db` | Output Gain | -36 to +36 | 0.0 | dB | Master level trim |

---

## 🔒 Thread Safety Guarantees
- **Audio Thread:** 100% lock-free. Zero memory allocations (`malloc`/`new`), zero mutex acquisitions, zero file I/O, zero network/AI calls.
- **SPSC Buffer:** Audio frames are pushed across threads using an atomic lock-free Single-Producer Single-Consumer circular queue (`SPSCQueue`).
- **Parameter Smoothing:** Parameters use `juce::SmoothedValue` or exponential smoothers calculating coefficients over 16-sample sub-blocks, eliminating zipper noise during AI automation.
