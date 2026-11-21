import { DSPParams } from '../types/aether';

export interface DrumStep {
  kick: boolean;
  snare: boolean;
  hihatClosed: boolean;
  hihatOpen: boolean;
  clap: boolean;
}

export interface PianoRollNote {
  id: string;
  pitch: number; // MIDI pitch (e.g. 60 = C4, 67 = G4)
  startStep: number; // 0 to 63 (4 bars of 16th notes)
  lengthSteps: number;
}

export interface TrackData {
  id: string;
  name: string;
  color: string;
  muted: boolean;
  solo: boolean;
  volume: number; // 0.0 to 1.0
  pan: number; // -1.0 to 1.0
}

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: number | null = null;

  // Master DSP Chain Nodes
  private inputGain: GainNode | null = null;
  private eqBand1: BiquadFilterNode | null = null;
  private eqBand2: BiquadFilterNode | null = null;
  private eqBand3: BiquadFilterNode | null = null;
  private eqBand4: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Track Sub-Gains
  private drumGain: GainNode | null = null;
  private bassGain: GainNode | null = null;
  private chordGain: GainNode | null = null;
  private leadGain: GainNode | null = null;

  // Sequencing state
  public currentStep: number = 0; // 0 to 63 (4 bars)
  public bpm: number = 112; // Default Nepali Pop / Modern Dance BPM
  public onStepCallbacks: Array<(step: number) => void> = [];

  // Drum Pattern (16 steps)
  public drumPattern: DrumStep[] = Array.from({ length: 16 }, (_, i) => ({
    kick: i % 4 === 0,
    snare: i % 8 === 4,
    hihatClosed: i % 2 === 0,
    hihatOpen: i % 8 === 6,
    clap: i % 8 === 4
  }));

  // Piano Roll Notes (Melody & Chords)
  public notes: PianoRollNote[] = [
    // G major chord (bar 1: steps 0-15)
    { id: '1', pitch: 55, startStep: 0, lengthSteps: 14 }, // G3
    { id: '2', pitch: 59, startStep: 0, lengthSteps: 14 }, // B3
    { id: '3', pitch: 62, startStep: 0, lengthSteps: 14 }, // D4
    // E minor chord (bar 2: steps 16-31)
    { id: '4', pitch: 52, startStep: 16, lengthSteps: 14 }, // E3
    { id: '5', pitch: 55, startStep: 16, lengthSteps: 14 }, // G3
    { id: '6', pitch: 59, startStep: 16, lengthSteps: 14 }, // B3
    // C major chord (bar 3: steps 32-47)
    { id: '7', pitch: 48, startStep: 32, lengthSteps: 14 }, // C3
    { id: '8', pitch: 52, startStep: 32, lengthSteps: 14 }, // E3
    { id: '9', pitch: 55, startStep: 32, lengthSteps: 14 }, // G3
    // D major chord (bar 4: steps 48-63)
    { id: '10', pitch: 50, startStep: 48, lengthSteps: 14 }, // D3
    { id: '11', pitch: 54, startStep: 48, lengthSteps: 14 }, // F#3
    { id: '12', pitch: 57, startStep: 48, lengthSteps: 14 }, // A3
  ];

  // Track mixer levels
  public tracks: TrackData[] = [
    { id: 'drums', name: 'Drums & Percussion', color: '#F43F5E', muted: false, solo: false, volume: 0.85, pan: 0 },
    { id: 'bass', name: 'Sub & Synth Bass', color: '#38BDF8', muted: false, solo: false, volume: 0.80, pan: 0 },
    { id: 'chords', name: 'Poly Synth Chords', color: '#A855F7', muted: false, solo: false, volume: 0.70, pan: -0.2 },
    { id: 'lead', name: 'Vocal Hook / Lead', color: '#34D399', muted: false, solo: false, volume: 0.75, pan: 0.2 },
  ];

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Input Gain
      this.inputGain = this.ctx.createGain();

      // Track Busses
      this.drumGain = this.ctx.createGain();
      this.bassGain = this.ctx.createGain();
      this.chordGain = this.ctx.createGain();
      this.leadGain = this.ctx.createGain();

      this.drumGain.connect(this.inputGain);
      this.bassGain.connect(this.inputGain);
      this.chordGain.connect(this.inputGain);
      this.leadGain.connect(this.inputGain);

      // DSP Chain
      this.eqBand1 = this.ctx.createBiquadFilter();
      this.eqBand1.type = 'lowshelf';
      this.eqBand1.frequency.value = 80;

      this.eqBand2 = this.ctx.createBiquadFilter();
      this.eqBand2.type = 'peaking';
      this.eqBand2.frequency.value = 350;
      this.eqBand2.Q.value = 1.4;

      this.eqBand3 = this.ctx.createBiquadFilter();
      this.eqBand3.type = 'peaking';
      this.eqBand3.frequency.value = 2500;
      this.eqBand3.Q.value = 1.4;

      this.eqBand4 = this.ctx.createBiquadFilter();
      this.eqBand4.type = 'highshelf';
      this.eqBand4.frequency.value = 8500;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.ratio.value = 2.5;
      this.compressor.attack.value = 0.015;
      this.compressor.release.value = 0.12;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.65;

      this.inputGain
        .connect(this.eqBand1)
        .connect(this.eqBand2)
        .connect(this.eqBand3)
        .connect(this.eqBand4)
        .connect(this.compressor)
        .connect(this.analyser)
        .connect(this.masterGain)
        .connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public updateDSPParams(params: DSPParams) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.inputGain) {
      const gainLin = Math.pow(10, params.input_gain_db / 20);
      this.inputGain.gain.setTargetAtTime(params.phase_invert > 0.5 ? -gainLin : gainLin, now, 0.02);
    }

    if (this.eqBand1) {
      this.eqBand1.frequency.setTargetAtTime(params.eq_band1_freq, now, 0.02);
      this.eqBand1.gain.setTargetAtTime(params.eq_band1_enable > 0.5 ? params.eq_band1_gain : 0, now, 0.02);
    }

    if (this.eqBand2) {
      this.eqBand2.frequency.setTargetAtTime(params.eq_band2_freq, now, 0.02);
      this.eqBand2.gain.setTargetAtTime(params.eq_band2_enable > 0.5 ? params.eq_band2_gain : 0, now, 0.02);
      this.eqBand2.Q.setTargetAtTime(params.eq_band2_q, now, 0.02);
    }

    if (this.eqBand3) {
      this.eqBand3.frequency.setTargetAtTime(params.eq_band3_freq, now, 0.02);
      this.eqBand3.gain.setTargetAtTime(params.eq_band3_enable > 0.5 ? params.eq_band3_gain : 0, now, 0.02);
      this.eqBand3.Q.setTargetAtTime(params.eq_band3_q, now, 0.02);
    }

    if (this.eqBand4) {
      this.eqBand4.frequency.setTargetAtTime(params.eq_band4_freq, now, 0.02);
      this.eqBand4.gain.setTargetAtTime(params.eq_band4_enable > 0.5 ? params.eq_band4_gain : 0, now, 0.02);
    }

    if (this.compressor) {
      this.compressor.threshold.setTargetAtTime(params.comp_threshold, now, 0.02);
      this.compressor.ratio.setTargetAtTime(params.comp_ratio, now, 0.02);
      this.compressor.attack.setTargetAtTime(params.comp_attack_ms * 0.001, now, 0.02);
      this.compressor.release.setTargetAtTime(params.comp_release_ms * 0.001, now, 0.02);
    }

    if (this.masterGain) {
      const outGainLin = Math.pow(10, params.output_gain_db / 20) * 0.65;
      this.masterGain.gain.setTargetAtTime(outGainLin, now, 0.02);
    }
  }

  public getFFTSpectrum(): number[] {
    if (!this.analyser) return [];
    const buffer = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(buffer);
    return Array.from(buffer.slice(0, 128));
  }

  public getGainReduction(): number {
    return this.compressor ? this.compressor.reduction : 0;
  }

  public togglePlayback(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;

    const intervalMs = (60 / this.bpm / 4) * 1000;
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setBPM(newBpm: number) {
    this.bpm = Math.max(40, Math.min(240, newBpm));
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  private tick() {
    if (!this.ctx || !this.inputGain) return;
    const now = this.ctx.currentTime;
    const step16 = this.currentStep % 16;
    const totalStep = this.currentStep % 64; // 4-bar loop (64 steps)

    // Notify UI subscribers of current playhead step
    this.onStepCallbacks.forEach(cb => cb(totalStep));

    // Determine track active state (Solo overrides Mute)
    const hasSolo = this.tracks.some(t => t.solo);
    const isTrackActive = (id: string) => {
      const t = this.tracks.find(x => x.id === id);
      if (!t) return true;
      if (hasSolo) return t.solo;
      return !t.muted;
    };

    // 1. DRUMS (16-step pattern)
    if (isTrackActive('drums')) {
      const drumStep = this.drumPattern[step16];
      if (drumStep) {
        if (drumStep.kick) this.playKick(now);
        if (drumStep.snare) this.playSnare(now);
        if (drumStep.clap) this.playClap(now);
        if (drumStep.hihatClosed) this.playHiHat(now, false);
        if (drumStep.hihatOpen) this.playHiHat(now, true);
      }
    }

    // 2. PIANO ROLL NOTES (Chords & Lead)
    const activeNotes = this.notes.filter(n => n.startStep === totalStep);
    activeNotes.forEach(note => {
      const freq = this.midiToFreq(note.pitch);
      const durationSec = (60 / this.bpm / 4) * note.lengthSteps;
      if (note.pitch < 48 && isTrackActive('bass')) {
        this.playBassNote(freq, now, durationSec);
      } else if (note.pitch >= 60 && isTrackActive('lead')) {
        this.playLeadNote(freq, now, durationSec);
      } else if (isTrackActive('chords')) {
        this.playChordNote(freq, now, durationSec);
      }
    });

    this.currentStep = (this.currentStep + 1) % 64;
  }

  public midiToFreq(midiPitch: number): number {
    return 440 * Math.pow(2, (midiPitch - 69) / 12);
  }

  // --- Real-Time Synthesizers ---

  private playKick(time: number) {
    if (!this.ctx || !this.drumGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.drumGain);

    osc.start(time);
    osc.stop(time + 0.28);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.drumGain) return;
    // Tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(oscGain);
    oscGain.connect(this.drumGain);
    osc.start(time);
    osc.stop(time + 0.15);

    // Noise snap
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.drumGain);
    noise.start(time);
    noise.stop(time + 0.18);
  }

  private playClap(time: number) {
    if (!this.ctx || !this.drumGain) return;
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    // Multi-impulse clap trigger
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.setValueAtTime(0.1, time + 0.015);
    gain.gain.setValueAtTime(0.5, time + 0.03);
    gain.gain.setValueAtTime(0.1, time + 0.045);
    gain.gain.setValueAtTime(0.6, time + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);
    noise.start(time);
    noise.stop(time + 0.22);
  }

  private playHiHat(time: number, isOpen: boolean) {
    if (!this.ctx || !this.drumGain) return;
    const duration = isOpen ? 0.25 : 0.045;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.35;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.drumGain);

    noise.start(time);
    noise.stop(time + duration);
  }

  private playBassNote(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.bassGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(90, time + duration * 0.8);

    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bassGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private playChordNote(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.chordGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.chordGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private playLeadNote(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.leadGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.leadGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  // --- MIDI & WAV Export ---

  public exportMidiFile(): Blob {
    // Standard MIDI File Header (Format 0, 1 Track, 480 PPQ)
    const header = [
      0x4d, 0x54, 0x68, 0x64, // MThd
      0x00, 0x00, 0x00, 0x06, // Chunk size 6
      0x00, 0x00,             // Format 0
      0x00, 0x01,             // 1 Track
      0x01, 0xe0              // 480 ticks per quarter note
    ];

    const trackEvents: number[] = [];
    // Set Tempo (112 BPM = 535714 microseconds per quarter note)
    const tempoMicros = Math.round(60000000 / this.bpm);
    trackEvents.push(0x00, 0xff, 0x51, 0x03, (tempoMicros >> 16) & 0xff, (tempoMicros >> 8) & 0xff, tempoMicros & 0xff);

    // Write notes
    const sorted = [...this.notes].sort((a, b) => a.startStep - b.startStep);
    let lastTick = 0;
    const ticksPerStep = 120; // 480 / 4

    sorted.forEach(n => {
      const startTick = n.startStep * ticksPerStep;
      const deltaStart = startTick - lastTick;
      trackEvents.push(...this.writeVarLen(deltaStart), 0x90, n.pitch, 0x60); // Note On (vel 96)
      lastTick = startTick;

      const endTick = (n.startStep + n.lengthSteps) * ticksPerStep;
      const deltaEnd = endTick - lastTick;
      trackEvents.push(...this.writeVarLen(deltaEnd), 0x80, n.pitch, 0x00); // Note Off
      lastTick = endTick;
    });

    // End of track meta event
    trackEvents.push(0x00, 0xff, 0x2f, 0x00);

    // Track chunk header
    const trackLen = trackEvents.length;
    const trackChunk = [
      0x4d, 0x54, 0x72, 0x6b, // MTrk
      (trackLen >> 24) & 0xff,
      (trackLen >> 16) & 0xff,
      (trackLen >> 8) & 0xff,
      trackLen & 0xff,
      ...trackEvents
    ];

    return new Blob([new Uint8Array([...header, ...trackChunk])], { type: 'audio/midi' });
  }

  private writeVarLen(value: number): number[] {
    let buffer = [value & 0x7f];
    while ((value >>= 7) > 0) {
      buffer.unshift((value & 0x7f) | 0x80);
    }
    return buffer;
  }
}

export const webAudioEngine = new WebAudioEngine();
