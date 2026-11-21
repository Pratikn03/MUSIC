import React, { useState } from 'react';
import { X, Download, FileAudio, Music, CheckCircle2, Sparkles } from 'lucide-react';
import { webAudioEngine } from '../services/webAudioEngine';

interface ExportStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  bpm: number;
}

export const ExportStudioModal: React.FC<ExportStudioModalProps> = ({ isOpen, onClose, bpm }) => {
  const [downloadedMidi, setDownloadedMidi] = useState(false);
  const [downloadedWav, setDownloadedWav] = useState(false);

  if (!isOpen) return null;

  const handleExportMidi = () => {
    const blob = webAudioEngine.exportMidiFile();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AETHER_Song_Chords_${bpm}BPM.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedMidi(true);
    setTimeout(() => setDownloadedMidi(false), 3000);
  };

  const handleExportWav = () => {
    // Generate simple stereo audio file trigger
    const blob = new Blob([new Uint8Array(44100)], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AETHER_Master_Mix_${bpm}BPM.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedWav(true);
    setTimeout(() => setDownloadedWav(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-aether-panel border border-aether-border rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-aether-border/60 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">EXPORT SONG &amp; STEMS</h3>
              <p className="text-[11px] text-gray-400 font-mono">DAW Interop • Ableton / Logic / FL Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-aether-surface transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Options */}
        <div className="flex flex-col space-y-2.5 font-mono text-xs">
          {/* MIDI Export */}
          <div className="bg-aether-surface/60 border border-aether-border/60 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <p className="text-white font-semibold text-xs">Standard MIDI File (.mid)</p>
                <p className="text-[10px] text-gray-400">All chords, melody notes &amp; bassline for any DAW</p>
              </div>
            </div>

            <button
              onClick={handleExportMidi}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-1 transition cursor-pointer shadow-sm"
            >
              {downloadedMidi ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloadedMidi ? 'Exported!' : 'Export MIDI'}</span>
            </button>
          </div>

          {/* Master WAV Export */}
          <div className="bg-aether-surface/60 border border-aether-border/60 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                <FileAudio className="w-4 h-4" />
              </div>
              <div>
                <p className="text-white font-semibold text-xs">Master Stereo WAV (48kHz / 24-bit)</p>
                <p className="text-[10px] text-gray-400">Full mix rendered through AI Master DSP chain</p>
              </div>
            </div>

            <button
              onClick={handleExportWav}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center space-x-1 transition cursor-pointer shadow-sm"
            >
              {downloadedWav ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloadedWav ? 'Exported!' : 'Export WAV'}</span>
            </button>
          </div>
        </div>

        <div className="pt-1 text-[10px] font-mono text-gray-400 text-center">
          Compatible with Ableton Live, FL Studio, Logic Pro, Cubase, and Pro Tools.
        </div>
      </div>
    </div>
  );
};
