# 🎵 MUSIC: AETHER Real-Time AI Co-Producer & Song Studio

A professional music creation suite containing:
1. **[AETHER Engine (`/aether`)](./aether):** 
   - 100% On-Device, Lock-Free C++20 DSP Engine (4-Band Parametric EQ, Dynamics Compressor, Mid/Side Stereo Width, True Peak Limiter).
   - Real-Time Audio Telemetry Analyzer (LUFS, True Peak, 6-Band FFT, Stereo Correlation).
   - Local AI Orchestration Sidecar (LLM Reasoning, GBNF Grammar, Push-to-Talk Whisper STT, Tempo-Locked Stem Generation).
   - Multi-Track Song Creation Studio (16-Step Beat Sequencer, Polyphonic Piano Roll & Chord Stamper, Multi-Track Arranger, Lyrics Booth, WAV/MIDI Exporter).
2. **[Song Project Draft (`song_lyrics_project.md`)](./song_lyrics_project.md):**
   - Lyrics and dance groove arrangements for Nepali Pop / Modern Dance ("आधा रातमा" / Aadha Raatma).

---

## Quickstart

```bash
cd aether

# Run C++ Engine + AI Sidecar
./scripts/run_standalone_demo.sh

# Run Web Studio
cd ui
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
