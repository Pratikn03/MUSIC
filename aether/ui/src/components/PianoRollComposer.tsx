import React, { useState } from 'react';
import { webAudioEngine, PianoRollNote } from '../services/webAudioEngine';
import { Music, Sparkles, Trash2, Wand2, Grid } from 'lucide-react';

interface PianoRollComposerProps {
  currentStep: number;
}

export const PianoRollComposer: React.FC<PianoRollComposerProps> = ({ currentStep }) => {
  const [notes, setNotes] = useState<PianoRollNote[]>(webAudioEngine.notes);
  const [activeBar, setActiveBar] = useState<number>(0); // 0, 1, 2, 3 (each bar = 16 steps)

  // MIDI pitches to display (C3 = 48 to C5 = 72)
  const pitchRange = [
    { pitch: 72, name: 'C5' },
    { pitch: 71, name: 'B4' },
    { pitch: 69, name: 'A4' },
    { pitch: 67, name: 'G4' },
    { pitch: 65, name: 'F4' },
    { pitch: 64, name: 'E4' },
    { pitch: 62, name: 'D4' },
    { pitch: 60, name: 'C4' },
    { pitch: 59, name: 'B3' },
    { pitch: 57, name: 'A3' },
    { pitch: 55, name: 'G3' },
    { pitch: 53, name: 'F3' },
    { pitch: 52, name: 'E3' },
    { pitch: 50, name: 'D3' },
    { pitch: 48, name: 'C3' },
  ];

  const barStartStep = activeBar * 16;
  const isCurrentBarActive = Math.floor(currentStep / 16) === activeBar;

  const toggleNote = (pitch: number, stepInBar: number) => {
    const globalStep = barStartStep + stepInBar;
    const existingIdx = notes.findIndex(n => n.pitch === pitch && n.startStep === globalStep);

    let updated: PianoRollNote[];
    if (existingIdx >= 0) {
      updated = notes.filter((_, i) => i !== existingIdx);
    } else {
      updated = [
        ...notes,
        { id: `n-${Date.now()}-${Math.random()}`, pitch, startStep: globalStep, lengthSteps: 4 }
      ];
    }
    setNotes(updated);
    webAudioEngine.notes = updated;
  };

  const stampChord = (rootPitch: number, isMinor: boolean) => {
    // Stamp triad chord for the current bar
    const third = isMinor ? rootPitch + 3 : rootPitch + 4;
    const fifth = rootPitch + 7;

    const newNotes = notes.filter(n => !(n.startStep >= barStartStep && n.startStep < barStartStep + 16));
    const chordNotes: PianoRollNote[] = [
      { id: `c1-${Date.now()}`, pitch: rootPitch, startStep: barStartStep, lengthSteps: 14 },
      { id: `c2-${Date.now()}`, pitch: third, startStep: barStartStep, lengthSteps: 14 },
      { id: `c3-${Date.now()}`, pitch: fifth, startStep: barStartStep, lengthSteps: 14 },
    ];

    const updated = [...newNotes, ...chordNotes];
    setNotes(updated);
    webAudioEngine.notes = updated;
  };

  const generateAIMelody = () => {
    // Generate vocal hook notes in G Major / E Minor Pentatonic
    const gMajorPentatonic = [55, 57, 59, 62, 64, 67, 69, 71];
    const hookNotes: PianoRollNote[] = [];

    for (let bar = 0; bar < 4; bar++) {
      const bStart = bar * 16;
      const melodySteps = [0, 3, 6, 8, 10, 12, 14];
      melodySteps.forEach((s) => {
        const randPitch = gMajorPentatonic[Math.floor(Math.random() * gMajorPentatonic.length)];
        hookNotes.push({
          id: `hook-${bar}-${s}-${Math.random()}`,
          pitch: randPitch,
          startStep: bStart + s,
          lengthSteps: 2
        });
      });
    }

    const updated = [...notes.filter(n => n.pitch < 60), ...hookNotes];
    setNotes(updated);
    webAudioEngine.notes = updated;
  };

  const clearCurrentBar = () => {
    const updated = notes.filter(n => !(n.startStep >= barStartStep && n.startStep < barStartStep + 16));
    setNotes(updated);
    webAudioEngine.notes = updated;
  };

  return (
    <div className="bg-aether-panel rounded-xl border border-aether-border/80 p-4 flex flex-col space-y-3.5">
      {/* Header & Chord Stamper */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-aether-border/50 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">POLYPHONIC PIANO ROLL &amp; CHORDS</h3>
            <p className="text-[10px] text-gray-400 font-mono">G Major / E Minor Pentatonic Snapping</p>
          </div>
        </div>

        {/* Quick Chord Stamper */}
        <div className="flex items-center space-x-1.5 text-[10px] font-mono">
          <span className="text-gray-400 mr-1">CHORDS:</span>
          <button
            onClick={() => stampChord(55, false)}
            className="px-2 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 transition cursor-pointer font-bold"
          >
            G Major
          </button>
          <button
            onClick={() => stampChord(52, true)}
            className="px-2 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 transition cursor-pointer font-bold"
          >
            E Minor
          </button>
          <button
            onClick={() => stampChord(48, false)}
            className="px-2 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 transition cursor-pointer font-bold"
          >
            C Major
          </button>
          <button
            onClick={() => stampChord(50, false)}
            className="px-2 py-1 rounded bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-indigo-200 transition cursor-pointer font-bold"
          >
            D Major
          </button>

          <div className="h-4 w-px bg-aether-border mx-1" />

          {/* AI Melody Hook */}
          <button
            onClick={generateAIMelody}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Melody Hook</span>
          </button>

          <button
            onClick={clearCurrentBar}
            title="Clear notes in this bar"
            className="p-1 rounded text-gray-400 hover:text-rose-400 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bar Selector Tabs */}
      <div className="flex items-center space-x-2 font-mono text-[10px]">
        <span className="text-gray-400">SELECT BAR:</span>
        {[0, 1, 2, 3].map((b) => (
          <button
            key={b}
            onClick={() => setActiveBar(b)}
            className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
              activeBar === b
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-aether-surface border border-aether-border text-gray-400 hover:text-white'
            }`}
          >
            Bar {b + 1} {b === 0 ? '(G)' : b === 1 ? '(Em)' : b === 2 ? '(C)' : '(D)'}
          </button>
        ))}
      </div>

      {/* Piano Roll Grid View */}
      <div className="flex flex-col space-y-1 font-mono max-h-[300px] overflow-y-auto pr-1">
        {pitchRange.map((p) => {
          const isBlackKey = p.name.includes('#');
          return (
            <div key={p.pitch} className="flex items-center space-x-1 h-5">
              {/* Piano Key Header */}
              <div
                className={`w-12 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center justify-between flex-shrink-0 ${
                  isBlackKey
                    ? 'bg-gray-900 text-gray-400 border border-gray-800'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                <span>{p.name}</span>
                <span className="text-[8px] opacity-70">{p.pitch}</span>
              </div>

              {/* 16 Steps in active bar */}
              <div className="flex-1 flex items-center space-x-0.5 h-full">
                {Array.from({ length: 16 }).map((_, stepIdx) => {
                  const globalStep = barStartStep + stepIdx;
                  const isNoteHere = notes.some(n => n.pitch === p.pitch && n.startStep === globalStep);
                  const isCurrent = currentStep === globalStep;
                  const isQuarter = stepIdx % 4 === 0;

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => toggleNote(p.pitch, stepIdx)}
                      className={`flex-1 h-full rounded-sm transition cursor-pointer border ${
                        isNoteHere
                          ? 'bg-cyan-500 border-cyan-400 shadow-sm shadow-cyan-500/50'
                          : isCurrent
                          ? 'bg-indigo-900/70 border-indigo-500'
                          : isQuarter
                          ? 'bg-aether-surface border-aether-border/60 hover:border-gray-500'
                          : 'bg-[#0E121B] border-aether-border/30 hover:border-gray-600'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
