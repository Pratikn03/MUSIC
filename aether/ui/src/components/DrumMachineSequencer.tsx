import React, { useState, useEffect } from 'react';
import { webAudioEngine, DrumStep } from '../services/webAudioEngine';
import { Disc, Play, RotateCcw, Sparkles, Volume2 } from 'lucide-react';

interface DrumMachineSequencerProps {
  currentStep: number;
}

export const DrumMachineSequencer: React.FC<DrumMachineSequencerProps> = ({ currentStep }) => {
  const [pattern, setPattern] = useState<DrumStep[]>(webAudioEngine.drumPattern);
  const activeStep16 = currentStep % 16;

  const instruments: Array<{ key: keyof DrumStep; label: string; color: string }> = [
    { key: 'kick', label: 'KICK 808', color: '#F43F5E' },
    { key: 'snare', label: 'SNARE SNAP', color: '#38BDF8' },
    { key: 'clap', label: 'CLAP DISCO', color: '#F59E0B' },
    { key: 'hihatClosed', label: 'HH CLOSED', color: '#10B981' },
    { key: 'hihatOpen', label: 'HH OPEN', color: '#A855F7' },
  ];

  const toggleStep = (stepIdx: number, instrument: keyof DrumStep) => {
    const updated = [...pattern];
    updated[stepIdx] = {
      ...updated[stepIdx],
      [instrument]: !updated[stepIdx][instrument]
    };
    setPattern(updated);
    webAudioEngine.drumPattern = updated;
  };

  const applyPreset = (presetName: string) => {
    let newPat: DrumStep[] = Array.from({ length: 16 }, () => ({
      kick: false,
      snare: false,
      clap: false,
      hihatClosed: false,
      hihatOpen: false
    }));

    if (presetName === 'nepali_pop') {
      // Bouncy Modern Nepali Dance Pop (112 BPM groove for Aadha Raatma)
      newPat.forEach((s, i) => {
        if (i === 0 || i === 8 || i === 10) s.kick = true;
        if (i === 4 || i === 12) s.snare = true;
        if (i === 4 || i === 12 || i === 15) s.clap = true;
        if (i % 2 === 0) s.hihatClosed = true;
        if (i === 6 || i === 14) s.hihatOpen = true;
      });
    } else if (presetName === 'house_dance') {
      // 4-on-the-floor
      newPat.forEach((s, i) => {
        if (i % 4 === 0) s.kick = true;
        if (i % 8 === 4) s.snare = true;
        if (i % 4 === 2) s.hihatOpen = true;
        if (i % 2 === 0) s.hihatClosed = true;
      });
    } else if (presetName === 'disco_funk') {
      // Funk bounce with ghost claps
      newPat.forEach((s, i) => {
        if (i === 0 || i === 6 || i === 10) s.kick = true;
        if (i === 4 || i === 12) s.snare = true;
        if (i === 7 || i === 12) s.clap = true;
        s.hihatClosed = true;
      });
    }

    setPattern(newPat);
    webAudioEngine.drumPattern = newPat;
  };

  return (
    <div className="bg-aether-panel rounded-xl border border-aether-border/80 p-4 flex flex-col space-y-3.5">
      {/* Header & Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-aether-border/50 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Disc className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">16-STEP BEAT MACHINE</h3>
            <p className="text-[10px] text-gray-400 font-mono">Sample-Accurate Groove Engine</p>
          </div>
        </div>

        {/* Preset Groove Buttons */}
        <div className="flex items-center space-x-1.5 text-[10px] font-mono">
          <span className="text-gray-400 mr-1">GROOVES:</span>
          <button
            onClick={() => applyPreset('nepali_pop')}
            className="px-2.5 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 transition cursor-pointer"
          >
            🇳🇵 Modern Nepali Pop
          </button>
          <button
            onClick={() => applyPreset('house_dance')}
            className="px-2 py-1 rounded bg-aether-surface hover:bg-aether-border border border-aether-border text-gray-300 transition cursor-pointer"
          >
            Dance Pop 4-on-Floor
          </button>
          <button
            onClick={() => applyPreset('disco_funk')}
            className="px-2 py-1 rounded bg-aether-surface hover:bg-aether-border border border-aether-border text-gray-300 transition cursor-pointer"
          >
            Disco Funk
          </button>
        </div>
      </div>

      {/* 16-Step Drum Grid */}
      <div className="flex flex-col space-y-2 font-mono">
        {/* Step indicator header */}
        <div className="flex items-center space-x-1 pl-28 pr-1">
          {Array.from({ length: 16 }).map((_, stepIdx) => {
            const isCurrent = activeStep16 === stepIdx;
            const isQuarterBeat = stepIdx % 4 === 0;
            return (
              <div
                key={stepIdx}
                className={`flex-1 text-center text-[9px] py-0.5 rounded transition ${
                  isCurrent
                    ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/40'
                    : isQuarterBeat
                    ? 'text-gray-300 font-semibold'
                    : 'text-gray-600'
                }`}
              >
                {stepIdx + 1}
              </div>
            );
          })}
        </div>

        {/* Instrument Rows */}
        {instruments.map((inst) => (
          <div key={inst.key} className="flex items-center space-x-1">
            {/* Instrument Label */}
            <div className="w-28 text-[10px] font-bold text-gray-300 flex items-center space-x-1.5 flex-shrink-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: inst.color }}
              />
              <span className="truncate">{inst.label}</span>
            </div>

            {/* 16 Step Buttons */}
            <div className="flex-1 flex items-center space-x-1">
              {pattern.map((step, stepIdx) => {
                const isActive = step[inst.key];
                const isCurrent = activeStep16 === stepIdx;
                const isQuarterBeat = stepIdx % 4 === 0;

                return (
                  <button
                    key={stepIdx}
                    onClick={() => toggleStep(stepIdx, inst.key)}
                    className={`flex-1 h-8 rounded transition-all cursor-pointer border ${
                      isActive
                        ? isCurrent
                          ? 'brightness-125 scale-105 shadow-md'
                          : ''
                        : isCurrent
                        ? 'bg-gray-800 border-gray-600'
                        : isQuarterBeat
                        ? 'bg-aether-surface/80 border-aether-border/60 hover:border-gray-500'
                        : 'bg-[#0E121B] border-aether-border/40 hover:border-gray-600'
                    }`}
                    style={{
                      backgroundColor: isActive ? inst.color : undefined,
                      borderColor: isActive ? inst.color : undefined,
                      boxShadow: isActive && isCurrent ? `0 0 10px ${inst.color}` : undefined
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
