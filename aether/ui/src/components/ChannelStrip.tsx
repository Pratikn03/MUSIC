import React from 'react';
import { DSPParams, AudioTelemetry } from '../types/aether';
import { Volume2, Gauge, Maximize2 } from 'lucide-react';

interface ChannelStripProps {
  params: DSPParams;
  telemetry: AudioTelemetry;
  onParamChange: (id: string, value: number) => void;
}

export const ChannelStrip: React.FC<ChannelStripProps> = ({
  params,
  telemetry,
  onParamChange
}) => {
  return (
    <div className="bg-aether-panel rounded-xl border border-aether-border/80 p-3.5 flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold tracking-wide text-gray-200">
            MASTER &amp; SPATIAL STAGE
          </span>
        </div>

        {/* Meters Overview */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">LUFS:</span>
            <span className="text-indigo-300 font-semibold">
              {telemetry.lufs_short_term.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">PEAK:</span>
            <span className="text-rose-400 font-semibold">
              {telemetry.peak_db.toFixed(1)} dB
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">CORR:</span>
            <span className={`font-semibold ${telemetry.stereo_correlation >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {telemetry.stereo_correlation >= 0 ? '+' : ''}{telemetry.stereo_correlation.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-xs font-mono">
        {/* Input Gain */}
        <div className="bg-aether-surface/50 p-2.5 rounded-lg border border-aether-border/50 flex flex-col space-y-1">
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>INPUT GAIN</span>
            <button
              onClick={() => onParamChange('phase_invert', params.phase_invert > 0.5 ? 0 : 1)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${params.phase_invert > 0.5 ? 'bg-rose-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              Ø INV
            </button>
          </div>
          <input
            type="range"
            min="-18"
            max="18"
            step="0.5"
            value={params.input_gain_db}
            onChange={(e) => onParamChange('input_gain_db', parseFloat(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-white text-center font-semibold text-[11px]">
            {params.input_gain_db > 0 ? '+' : ''}{params.input_gain_db.toFixed(1)} dB
          </span>
        </div>

        {/* Stereo Width */}
        <div className="bg-aether-surface/50 p-2.5 rounded-lg border border-aether-border/50 flex flex-col space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>STEREO WIDTH</span>
            <Maximize2 className="w-3 h-3 text-cyan-400" />
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={params.stereo_width}
            onChange={(e) => onParamChange('stereo_width', parseFloat(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-white text-center font-semibold text-[11px]">
            {(params.stereo_width * 100).toFixed(0)}%
          </span>
        </div>

        {/* Pan */}
        <div className="bg-aether-surface/50 p-2.5 rounded-lg border border-aether-border/50 flex flex-col space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>STEREO PAN</span>
            <Gauge className="w-3 h-3 text-indigo-400" />
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={params.pan}
            onChange={(e) => onParamChange('pan', parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-white text-center font-semibold text-[11px]">
            {params.pan === 0 ? 'CENTER' : params.pan < 0 ? `L ${Math.abs(Math.round(params.pan * 100))}` : `R ${Math.round(params.pan * 100)}`}
          </span>
        </div>

        {/* Output Limiter & Gain */}
        <div className="bg-aether-surface/50 p-2.5 rounded-lg border border-aether-border/50 flex flex-col space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>LIMIT CEILING</span>
            <span className="text-rose-400 font-bold">TRUE PEAK</span>
          </div>
          <input
            type="range"
            min="-6"
            max="0"
            step="0.1"
            value={params.limiter_ceiling_db}
            onChange={(e) => onParamChange('limiter_ceiling_db', parseFloat(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
          />
          <span className="text-white text-center font-semibold text-[11px]">
            {params.limiter_ceiling_db.toFixed(1)} dBFS
          </span>
        </div>
      </div>
    </div>
  );
};
