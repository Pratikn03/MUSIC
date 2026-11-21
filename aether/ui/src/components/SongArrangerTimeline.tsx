import React, { useState } from 'react';
import { webAudioEngine, TrackData } from '../services/webAudioEngine';
import { Layers, Volume2, VolumeX, Eye, Play, Sliders } from 'lucide-react';

interface SongArrangerTimelineProps {
  currentStep: number;
}

export const SongArrangerTimeline: React.FC<SongArrangerTimelineProps> = ({ currentStep }) => {
  const [tracks, setTracks] = useState<TrackData[]>(webAudioEngine.tracks);
  const currentBar = Math.floor(currentStep / 16) + 1;

  const songSections = [
    { name: 'INTRO', bars: 'Bars 1-4', color: '#6366F1' },
    { name: 'VERSE 1', bars: 'Bars 5-8', color: '#06B6D4' },
    { name: 'PRE-CHORUS', bars: 'Bars 9-12', color: '#10B981' },
    { name: 'CHORUS / HOOK', bars: 'Bars 13-16', color: '#F59E0B' },
    { name: 'VERSE 2', bars: 'Bars 17-20', color: '#3B82F6' },
    { name: 'BRIDGE', bars: 'Bars 21-24', color: '#EC4899' },
    { name: 'OUTRO', bars: 'Bars 25-28', color: '#8B5CF6' },
  ];

  const toggleMute = (trackId: string) => {
    const updated = tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t);
    setTracks(updated);
    webAudioEngine.tracks = updated;
  };

  const toggleSolo = (trackId: string) => {
    const updated = tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t);
    setTracks(updated);
    webAudioEngine.tracks = updated;
  };

  const setVolume = (trackId: string, vol: number) => {
    const updated = tracks.map(t => t.id === trackId ? { ...t, volume: vol } : t);
    setTracks(updated);
    webAudioEngine.tracks = updated;
  };

  return (
    <div className="bg-aether-panel rounded-xl border border-aether-border/80 p-4 flex flex-col space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-aether-border/50 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">MULTI-TRACK SONG ARRANGER &amp; TIMELINE</h3>
            <p className="text-[10px] text-gray-400 font-mono">Structural Song Flow • Mute / Solo • Bar Playhead</p>
          </div>
        </div>

        {/* Current Bar Position Readout */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-gray-400">PLAYHEAD:</span>
          <span className="text-cyan-400 font-bold">BAR {currentBar} / 28</span>
        </div>
      </div>

      {/* Song Structure Overview Blocks */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 font-mono text-[10px]">
        {songSections.map((sec, idx) => (
          <div
            key={idx}
            className="flex-1 min-w-[90px] p-2 rounded-lg border border-aether-border/60 bg-aether-surface/60 flex flex-col space-y-0.5"
            style={{ borderLeft: `3px solid ${sec.color}` }}
          >
            <span className="font-bold text-gray-200">{sec.name}</span>
            <span className="text-[9px] text-gray-400">{sec.bars}</span>
          </div>
        ))}
      </div>

      {/* Multi-Track Lanes */}
      <div className="flex flex-col space-y-2 font-mono text-xs">
        {tracks.map((t) => (
          <div
            key={t.id}
            className="flex items-center space-x-3 bg-aether-surface/40 p-2.5 rounded-xl border border-aether-border/50"
          >
            {/* Track Info & Mute / Solo */}
            <div className="w-48 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <span className="font-semibold text-gray-200 text-[11px] truncate">{t.name}</span>
              </div>

              {/* Mute / Solo Buttons */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => toggleMute(t.id)}
                  className={`w-6 h-6 rounded text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                    t.muted ? 'bg-rose-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={() => toggleSolo(t.id)}
                  className={`w-6 h-6 rounded text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                    t.solo ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  S
                </button>
              </div>
            </div>

            {/* Volume Slider */}
            <div className="w-28 flex items-center space-x-1.5 flex-shrink-0">
              <Volume2 className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={t.volume}
                onChange={(e) => setVolume(t.id, parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1 bg-gray-700"
              />
            </div>

            {/* Visual Audio Clip Lane with moving playhead */}
            <div className="flex-1 h-8 bg-[#0B0D13] rounded-lg border border-aether-border relative overflow-hidden flex items-center px-1">
              {/* Pattern Blocks */}
              <div
                className="h-5 rounded opacity-75 flex items-center px-2 text-[9px] font-bold text-white shadow-sm"
                style={{
                  width: '90%',
                  backgroundColor: t.muted ? '#374151' : t.color
                }}
              >
                <span>{t.id.toUpperCase()} LOOP (G - Em - C - D)</span>
              </div>

              {/* Real-time Playhead Cursor */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] z-10 transition-all duration-75"
                style={{ left: `${(currentStep / 64) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
