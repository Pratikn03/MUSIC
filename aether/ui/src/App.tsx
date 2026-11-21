import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { SpectrumVisualizer } from './components/SpectrumVisualizer';
import { CompressorMeter } from './components/CompressorMeter';
import { ChannelStrip } from './components/ChannelStrip';
import { DrumMachineSequencer } from './components/DrumMachineSequencer';
import { PianoRollComposer } from './components/PianoRollComposer';
import { SongArrangerTimeline } from './components/SongArrangerTimeline';
import { LyricsVocalStudio } from './components/LyricsVocalStudio';
import { ExportStudioModal } from './components/ExportStudioModal';
import { MentorSidebar } from './components/MentorSidebar';
import { StemGeneratorModal } from './components/StemGeneratorModal';
import { DSPParams, AudioTelemetry, MentorMessage, StemInfo } from './types/aether';
import { webAudioEngine } from './services/webAudioEngine';
import {
  fetchTelemetry,
  fetchDSPState,
  fetchHistory,
  sendAICoProducerPrompt,
  setParameter,
  undoState,
  redoState,
  toggleAB,
  generateStem
} from './services/api';
import { Sliders, Disc, Music, Layers, BookOpen, Download } from 'lucide-react';

const DEFAULT_PARAMS: DSPParams = {
  input_gain_db: 0.0,
  phase_invert: 0.0,
  eq_band1_enable: 1.0,
  eq_band1_freq: 80.0,
  eq_band1_gain: 0.0,
  eq_band1_q: 0.707,
  eq_band2_enable: 1.0,
  eq_band2_freq: 350.0,
  eq_band2_gain: 0.0,
  eq_band2_q: 1.4,
  eq_band3_enable: 1.0,
  eq_band3_freq: 2500.0,
  eq_band3_gain: 0.0,
  eq_band3_q: 1.4,
  eq_band4_enable: 1.0,
  eq_band4_freq: 8500.0,
  eq_band4_gain: 0.0,
  eq_band4_q: 0.707,
  comp_enable: 1.0,
  comp_threshold: -14.0,
  comp_ratio: 2.5,
  comp_attack_ms: 15.0,
  comp_release_ms: 120.0,
  comp_makeup_gain_db: 0.0,
  stereo_width: 1.0,
  pan: 0.0,
  limiter_enable: 1.0,
  limiter_ceiling_db: -0.2,
  output_gain_db: 0.0
};

const DEFAULT_TELEMETRY: AudioTelemetry = {
  lufs_short_term: -14.2,
  lufs_integrated: -16.0,
  peak_db: -1.5,
  rms_db: -15.8,
  bands_db: {
    sub: -28.0,
    bass: -14.4,
    low_mid: -9.1,
    mid: -15.2,
    high_mid: -19.4,
    air: -26.1
  },
  stereo_correlation: 0.88,
  comp_gain_reduction_db: 0.0,
  fft_spectrum: new Array(128).fill(-80)
};

type StudioView = 'mixing' | 'drums' | 'pianoroll' | 'arranger' | 'lyrics';

export const App: React.FC = () => {
  const [params, setParams] = useState<DSPParams>(DEFAULT_PARAMS);
  const [telemetry, setTelemetry] = useState<AudioTelemetry>(DEFAULT_TELEMETRY);
  const [bpm, setBpm] = useState<number>(112.0); // 112 BPM modern dance groove
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [isEngineOnline, setIsEngineOnline] = useState<boolean>(true);
  const [isStemModalOpen, setIsStemModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activeView, setActiveView] = useState<StudioView>('mixing');

  const [messages, setMessages] = useState<MentorMessage[]>([
    {
      id: 'm1',
      sender: 'aether',
      text: 'Welcome to AETHER Full Song Creation Studio! Click "🔊 HEAR SOUND" above to listen to the G - Em - C - D dance groove. Use the tabs below to build drum beats, compose chords & melodies, arrange song sections, or edit lyrics!',
      audio_insight: 'Initial acoustic baseline: -14.2 LUFS. Complete multi-track studio loaded.',
      timestamp: 'Ready'
    }
  ]);

  // Sync parameters with Web Audio engine
  useEffect(() => {
    webAudioEngine.updateDSPParams(params);
  }, [params]);

  // Subscribe to step sequencer clock
  useEffect(() => {
    const handleStep = (step: number) => {
      setCurrentStep(step);
    };
    webAudioEngine.onStepCallbacks.push(handleStep);
    return () => {
      webAudioEngine.onStepCallbacks = webAudioEngine.onStepCallbacks.filter(cb => cb !== handleStep);
    };
  }, []);

  // Polling loop for telemetry and state sync (30Hz)
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      if (webAudioEngine.getIsPlaying()) {
        const liveFft = webAudioEngine.getFFTSpectrum();
        const liveGr = webAudioEngine.getGainReduction();
        if (liveFft.length > 0 && isMounted) {
          setTelemetry((prev) => ({
            ...prev,
            fft_spectrum: liveFft,
            comp_gain_reduction_db: Math.abs(liveGr),
            lufs_short_term: -14.0 - Math.random() * 2,
            peak_db: -1.5 - Math.random()
          }));
        }
      } else {
        const telem = await fetchTelemetry();
        if (telem && isMounted) {
          setTelemetry(telem);
          setIsEngineOnline(true);
        }
      }

      const hist = await fetchHistory();
      if (hist && isMounted) {
        setCanUndo(hist.can_undo);
        setCanRedo(hist.can_redo);
        if (hist.active_slot) setActiveSlot(hist.active_slot);
      }
    }, 33);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleTogglePlayAudio = () => {
    const active = webAudioEngine.togglePlayback();
    setIsPlayingAudio(active);
    webAudioEngine.updateDSPParams(params);
  };

  const handleParamChange = useCallback((id: string, value: number) => {
    setParams((prev) => {
      const next = { ...prev, [id]: value };
      webAudioEngine.updateDSPParams(next);
      return next;
    });
    setParameter(id, value);
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMsg: MentorMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const res = await sendAICoProducerPrompt(text, bpm, telemetry, params);
      const delta = res.parameter_delta || {};

      if (Object.keys(delta).length > 0) {
        setParams((prev) => {
          const next = { ...prev, ...delta };
          webAudioEngine.updateDSPParams(next);
          return next;
        });
        setCanUndo(true);
      }

      const aiMsg: MentorMessage = {
        id: `a-${Date.now()}`,
        sender: 'aether',
        text: res.explanation || 'Parameters updated.',
        parameter_delta: delta,
        audio_insight: res.audio_insight,
        confidence: res.confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      console.error('AI query error', e);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUndo = async () => {
    await undoState();
    const updated = await fetchDSPState();
    if (updated) {
      setParams(updated);
      webAudioEngine.updateDSPParams(updated);
    }
  };

  const handleRedo = async () => {
    await redoState();
    const updated = await fetchDSPState();
    if (updated) {
      setParams(updated);
      webAudioEngine.updateDSPParams(updated);
    }
  };

  const handleToggleAB = async () => {
    await toggleAB();
    const updated = await fetchDSPState();
    if (updated) {
      setParams(updated);
      webAudioEngine.updateDSPParams(updated);
    }
    setActiveSlot((prev) => (prev === 'A' ? 'B' : 'A'));
  };

  const handleGenerateStem = async (prompt: string, stemBpm: number, barLength: number, key: string): Promise<StemInfo | null> => {
    try {
      const stem = await generateStem(prompt, stemBpm, barLength, key);
      return stem;
    } catch (e) {
      console.error('Stem generation error', e);
      return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-aether-dark text-gray-100 font-sans select-none overflow-hidden">
      {/* Top Bar */}
      <TopBar
        bpm={bpm}
        activeSlot={activeSlot}
        canUndo={canUndo}
        canRedo={canRedo}
        isPlayingAudio={isPlayingAudio}
        onTogglePlayAudio={handleTogglePlayAudio}
        onToggleAB={handleToggleAB}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenStemGen={() => setIsStemModalOpen(true)}
        isEngineOnline={isEngineOnline}
      />

      {/* Studio View Navigation Bar */}
      <nav className="h-10 bg-[#0E1119] border-b border-aether-border/60 px-4 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setActiveView('mixing')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeView === 'mixing'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-aether-surface'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>AI MASTER &amp; DSP</span>
          </button>

          <button
            onClick={() => setActiveView('drums')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeView === 'drums'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-aether-surface'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>16-STEP BEATS</span>
          </button>

          <button
            onClick={() => setActiveView('pianoroll')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeView === 'pianoroll'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-aether-surface'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>PIANO ROLL &amp; CHORDS</span>
          </button>

          <button
            onClick={() => setActiveView('arranger')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeView === 'arranger'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-aether-surface'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SONG ARRANGER</span>
          </button>

          <button
            onClick={() => setActiveView('lyrics')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              activeView === 'lyrics'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-aether-surface'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>LYRICS &amp; VOCALS</span>
          </button>
        </div>

        {/* Export Song Action */}
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center space-x-1.5 bg-aether-surface hover:bg-aether-border border border-aether-border px-3 py-1 rounded-lg text-gray-300 hover:text-white transition cursor-pointer text-[11px]"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export Song / MIDI</span>
        </button>
      </nav>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dynamic Studio Center Panel */}
        <main className="flex-1 p-4 flex flex-col space-y-3 overflow-y-auto">
          {activeView === 'mixing' && (
            <>
              <SpectrumVisualizer
                fftSpectrum={telemetry.fft_spectrum}
                params={params}
                onParamChange={handleParamChange}
              />
              <CompressorMeter
                params={params}
                gainReductionDb={telemetry.comp_gain_reduction_db}
                onParamChange={handleParamChange}
              />
              <ChannelStrip
                params={params}
                telemetry={telemetry}
                onParamChange={handleParamChange}
              />
            </>
          )}

          {activeView === 'drums' && (
            <DrumMachineSequencer currentStep={currentStep} />
          )}

          {activeView === 'pianoroll' && (
            <PianoRollComposer currentStep={currentStep} />
          )}

          {activeView === 'arranger' && (
            <SongArrangerTimeline currentStep={currentStep} />
          )}

          {activeView === 'lyrics' && (
            <LyricsVocalStudio />
          )}
        </main>

        {/* Right Sidebar: AI Co-Producer & Mentor Feed (Always accessible) */}
        <MentorSidebar
          messages={messages}
          isLoading={isAiLoading}
          onSendMessage={handleSendMessage}
          onQuickPrompt={handleSendMessage}
        />
      </div>

      {/* Stem Generator Modal */}
      <StemGeneratorModal
        isOpen={isStemModalOpen}
        onClose={() => setIsStemModalOpen(false)}
        bpm={bpm}
        onGenerate={handleGenerateStem}
      />

      {/* Export Studio Modal */}
      <ExportStudioModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        bpm={bpm}
      />
    </div>
  );
};
