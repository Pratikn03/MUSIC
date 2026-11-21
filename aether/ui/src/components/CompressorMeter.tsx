import React from 'react';
import { DSPParams } from '../types/aether';
import { Sliders } from 'lucide-react';

interface CompressorMeterProps {
  params: DSPParams;
  gainReductionDb: number;
  onParamChange: (id: string, value: number) => void;
}

export const CompressorMeter: React.FC<CompressorMeterProps> = ({
  params,
  gainReductionDb,
  onParamChange,
}) => {
  // Clamped gain reduction (0 to -24 dB)
  const gr = Math.max(0, Math.min(24, Math.abs(gainReductionDb)));
  const grPercent = (gr / 24) * 100;

  return (
    <div className="bg-aether-panel rounded-xl border border-aether-border/80 p-3.5 flex flex-col space-y-3">
      {/* Title & GR Meter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold tracking-wide text-gray-200">
            DYNAMICS COMPRESSOR
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40">
            Peak/RMS
          </span>
        </div>

        {/* Real-time GR Digital Readout */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-gray-400 text-[11px]">GR:</span>
          <span className={`font-bold ${gr > 6 ? 'text-amber-400' : 'text-emerald-400'}`}>
            -{gr.toFixed(1)} dB
          </span>
        </div>
      </div>

      {/* Horizontal Gain Reduction Bar */}
      <div className="w-full bg-[#0B0D13] h-3 rounded-full overflow-hidden border border-aether-border flex relative">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-75 rounded-full"
          style={{ width: `${grPercent}%` }}
        />
        {/* dB ticks */}
        <div className="absolute inset-0 flex justify-between px-2 text-[8px] font-mono text-gray-400 pointer-events-none items-center">
          <span>0</span>
          <span>-3</span>
          <span>-6</span>
          <span>-12</span>
          <span>-18</span>
          <span>-24</span>
        </div>
      </div>

      {/* Compressor Parameter Knobs / Sliders */}
      <div className="grid grid-cols-5 gap-2 text-xs font-mono pt-1">
        {/* Threshold */}
        <div className="flex flex-col space-y-1 bg-aether-surface/50 p-2 rounded-lg border border-aether-border/50">
          <span className="text-[10px] text-gray-400">THRESH</span>
          <input
            type="range"
            min="-50"
            max="0"
            step="0.5"
            value={params.comp_threshold}
            onChange={(e) => onParamChange('comp_threshold', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-white font-semibold text-[11px] text-center">
            {params.comp_threshold.toFixed(1)} dB
          </span>
        </div>

        {/* Ratio */}
        <div className="flex flex-col space-y-1 bg-aether-surface/50 p-2 rounded-lg border border-aether-border/50">
          <span className="text-[10px] text-gray-400">RATIO</span>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={params.comp_ratio}
            onChange={(e) => onParamChange('comp_ratio', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-white font-semibold text-[11px] text-center">
            {params.comp_ratio.toFixed(1)}:1
          </span>
        </div>

        {/* Attack */}
        <div className="flex flex-col space-y-1 bg-aether-surface/50 p-2 rounded-lg border border-aether-border/50">
          <span className="text-[10px] text-gray-400">ATTACK</span>
          <input
            type="range"
            min="0.5"
            max="100"
            step="0.5"
            value={params.comp_attack_ms}
            onChange={(e) => onParamChange('comp_attack_ms', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-white font-semibold text-[11px] text-center">
            {params.comp_attack_ms.toFixed(1)} ms
          </span>
        </div>

        {/* Release */}
        <div className="flex flex-col space-y-1 bg-aether-surface/50 p-2 rounded-lg border border-aether-border/50">
          <span className="text-[10px] text-gray-400">RELEASE</span>
          <input
            type="range"
            min="10"
            max="1000"
            step="5"
            value={params.comp_release_ms}
            onChange={(e) => onParamChange('comp_release_ms', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-white font-semibold text-[11px] text-center">
            {params.comp_release_ms.toFixed(0)} ms
          </span>
        </div>

        {/* Makeup */}
        <div className="flex flex-col space-y-1 bg-aether-surface/50 p-2 rounded-lg border border-aether-border/50">
          <span className="text-[10px] text-gray-400">MAKEUP</span>
          <input
            type="range"
            min="-6"
            max="18"
            step="0.5"
            value={params.comp_makeup_gain_db}
            onChange={(e) => onParamChange('comp_makeup_gain_db', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-white font-semibold text-[11px] text-center">
            {params.comp_makeup_gain_db > 0 ? '+' : ''}{params.comp_makeup_gain_db.toFixed(1)} dB
          </span>
        </div>
      </div>
    </div>
  );
};
