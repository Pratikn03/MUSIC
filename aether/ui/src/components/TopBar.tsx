import React from 'react';
import { Play, Pause, RotateCcw, RotateCw, Sparkles, Activity, Radio } from 'lucide-react';

interface TopBarProps {
  bpm: number;
  activeSlot: 'A' | 'B';
  canUndo: boolean;
  canRedo: boolean;
  isPlayingAudio: boolean;
  onTogglePlayAudio: () => void;
  onToggleAB: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenStemGen: () => void;
  isEngineOnline: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  bpm,
  activeSlot,
  canUndo,
  canRedo,
  isPlayingAudio,
  onTogglePlayAudio,
  onToggleAB,
  onUndo,
  onRedo,
  onOpenStemGen,
  isEngineOnline
}) => {
  return (
    <header className="h-14 bg-aether-dark border-b border-aether-border/60 px-4 flex items-center justify-between select-none">
      {/* Brand & Status */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                AETHER
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300">
                DSP v1.0
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono">Real-Time AI Co-Producer</p>
          </div>
        </div>

        <div className="h-4 w-px bg-aether-border mx-2" />

        {/* Engine Connectivity Status */}
        <div className="flex items-center space-x-1.5 text-xs font-mono">
          <div className={`w-2 h-2 rounded-full ${isEngineOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-ping'}`} />
          <span className="text-gray-300 text-[11px]">
            {isEngineOnline ? 'DSP Lock-Free (48kHz)' : 'Web Audio Mode'}
          </span>
        </div>
      </div>

      {/* Center Controls: Playback, BPM, A/B & Undo/Redo */}
      <div className="flex items-center space-x-3">
        {/* Audio Audition Play/Pause Button */}
        <button
          onClick={onTogglePlayAudio}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition shadow-md cursor-pointer ${
            isPlayingAudio
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
          }`}
        >
          {isPlayingAudio ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE AUDIO</span>
              <span className="flex space-x-0.5 ml-1">
                <span className="w-1 h-2.5 bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-2.5 bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2.5 bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>🔊 HEAR SOUND (G-Em-C-D)</span>
            </>
          )}
        </button>

        {/* BPM & Sync */}
        <div className="flex items-center space-x-2 bg-aether-panel border border-aether-border/80 px-3 py-1.5 rounded-md text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-400">BPM:</span>
          <span className="text-white font-semibold">{bpm.toFixed(1)}</span>
        </div>

        {/* A/B Compare Toggle */}
        <div className="flex items-center bg-aether-panel border border-aether-border rounded-md p-0.5 text-xs font-mono">
          <button
            onClick={onToggleAB}
            className={`px-3 py-1 rounded transition-all font-semibold flex items-center space-x-1 ${
              activeSlot === 'A'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>SLOT A</span>
          </button>
          <button
            onClick={onToggleAB}
            className={`px-3 py-1 rounded transition-all font-semibold flex items-center space-x-1 ${
              activeSlot === 'B'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>SLOT B</span>
          </button>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo parameter change"
            className={`p-1.5 rounded border border-aether-border text-gray-300 hover:bg-aether-surface hover:text-white transition ${
              !canUndo ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo parameter change"
            className={`p-1.5 rounded border border-aether-border text-gray-300 hover:bg-aether-surface hover:text-white transition ${
              !canRedo ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Action: Stem Generator */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenStemGen}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stem Generator</span>
        </button>
      </div>
    </header>
  );
};
