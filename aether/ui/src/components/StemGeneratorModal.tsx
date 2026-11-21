import React, { useState } from 'react';
import { X, Sparkles, Music, Disc, Check, Clock } from 'lucide-react';
import { StemInfo } from '../types/aether';

interface StemGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  bpm: number;
  onGenerate: (prompt: string, bpm: number, barLength: number, key: string) => Promise<StemInfo | null>;
}

export const StemGeneratorModal: React.FC<StemGeneratorModalProps> = ({
  isOpen,
  onClose,
  bpm,
  onGenerate
}) => {
  const [prompt, setPrompt] = useState('8-bar dark syncopated bassline');
  const [barLength, setBarLength] = useState(8);
  const [key, setKey] = useState('F minor');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<StemInfo | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const stem = await onGenerate(prompt, bpm, barLength, key);
      setLastGenerated(stem);
    } finally {
      setIsGenerating(false);
    }
  };

  const presetPrompts = [
    "8-bar dark syncopated bassline",
    "Tight 4-on-the-floor house drum groove",
    "Warm vintage analog synth chords",
    "Sub 808 glide bassline"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-aether-panel border border-aether-border/90 rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-aether-border/60 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">TEMPO-LOCKED STEM GENERATOR</h3>
              <p className="text-[11px] text-gray-400 font-mono">Synchronized Local Generative Audio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-aether-surface transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex flex-col space-y-3 font-mono text-xs">
          {/* Prompt */}
          <div>
            <label className="text-gray-300 text-[11px] block mb-1 font-sans font-medium">Musical Element Description</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 8-bar dark syncopated bassline..."
              className="w-full bg-aether-surface border border-aether-border rounded-lg p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {presetPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(p)}
                className="text-[10px] px-2 py-0.5 rounded bg-aether-surface/60 border border-aether-border/60 text-gray-300 hover:text-white hover:border-indigo-500 transition cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Musical Parameters Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {/* Host DAW BPM */}
            <div className="bg-aether-surface/50 p-2.5 rounded-lg border border-aether-border/50">
              <span className="text-[10px] text-gray-400 block mb-1">DAW BPM</span>
              <div className="flex items-center space-x-1.5 text-white font-bold text-sm">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{bpm.toFixed(1)}</span>
              </div>
            </div>

            {/* Bar Length */}
            <div className="bg-aether-surface/50 p-2.5 rounded-lg border border-aether-border/50">
              <span className="text-[10px] text-gray-400 block mb-1">BAR LENGTH</span>
              <select
                value={barLength}
                onChange={(e) => setBarLength(parseInt(e.target.value))}
                className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
              >
                <option value={4} className="bg-aether-panel">4 Bars</option>
                <option value={8} className="bg-aether-panel">8 Bars</option>
                <option value={16} className="bg-aether-panel">16 Bars</option>
              </select>
            </div>

            {/* Musical Key */}
            <div className="bg-aether-surface/50 p-2.5 rounded-lg border border-aether-border/50">
              <span className="text-[10px] text-gray-400 block mb-1">MUSICAL KEY</span>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
              >
                <option value="F minor" className="bg-aether-panel">F minor</option>
                <option value="C minor" className="bg-aether-panel">C minor</option>
                <option value="A minor" className="bg-aether-panel">A minor</option>
                <option value="G minor" className="bg-aether-panel">G minor</option>
                <option value="D minor" className="bg-aether-panel">D minor</option>
                <option value="E minor" className="bg-aether-panel">E minor</option>
              </select>
            </div>
          </div>

          {/* Last Generated Stem Notice */}
          {lastGenerated && (
            <div className="bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl flex items-start space-x-2 text-[11px] text-emerald-300">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Stem Generated &amp; Synced to DAW Playhead!</p>
                <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                  Duration: {lastGenerated.duration_seconds}s @ {lastGenerated.sample_rate}Hz • Slot Active
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={`w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-medium text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer ${
              isGenerating ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            {isGenerating ? (
              <>
                <Disc className="w-4 h-4 animate-spin" />
                <span>Generating {barLength}-Bar Stem at {bpm.toFixed(0)} BPM...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate &amp; Load into DAW Synchronized Slot</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
