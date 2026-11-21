export interface SpectralBandsDB {
  sub: number;
  bass: number;
  low_mid: number;
  mid: number;
  high_mid: number;
  air: number;
}

export interface AudioTelemetry {
  lufs_short_term: number;
  lufs_integrated: number;
  peak_db: number;
  rms_db: number;
  bands_db: SpectralBandsDB;
  stereo_correlation: number;
  comp_gain_reduction_db: number;
  fft_spectrum: number[];
}

export interface DSPParams {
  input_gain_db: number;
  phase_invert: number;
  eq_band1_enable: number;
  eq_band1_freq: number;
  eq_band1_gain: number;
  eq_band1_q: number;
  eq_band2_enable: number;
  eq_band2_freq: number;
  eq_band2_gain: number;
  eq_band2_q: number;
  eq_band3_enable: number;
  eq_band3_freq: number;
  eq_band3_gain: number;
  eq_band3_q: number;
  eq_band4_enable: number;
  eq_band4_freq: number;
  eq_band4_gain: number;
  eq_band4_q: number;
  comp_enable: number;
  comp_threshold: number;
  comp_ratio: number;
  comp_attack_ms: number;
  comp_release_ms: number;
  comp_makeup_gain_db: number;
  stereo_width: number;
  pan: number;
  limiter_enable: number;
  limiter_ceiling_db: number;
  output_gain_db: number;
}

export interface MentorMessage {
  id: string;
  sender: 'user' | 'aether';
  text: string;
  parameter_delta?: Partial<DSPParams>;
  audio_insight?: string;
  confidence?: number;
  timestamp: string;
}

export interface StemInfo {
  status: string;
  prompt: string;
  bpm: number;
  bar_length: number;
  key: string;
  duration_seconds: number;
  file_path: string;
  sample_rate: number;
  dsp_loaded?: boolean;
}
