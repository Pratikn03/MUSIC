import React, { useState } from 'react';
import { Mic, Music, Sparkles, BookOpen, Volume2, Check } from 'lucide-react';

export const LyricsVocalStudio: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'hook' | 'verse1' | 'prechorus' | 'verse2' | 'bridge'>('hook');

  return (
    <div className="bg-aether-panel rounded-xl border border-aether-border/80 p-4 flex flex-col space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-aether-border/50 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">LYRICS &amp; VOCAL BOOTH</h3>
            <p className="text-[10px] text-gray-400 font-mono">Master Draft: "आधा रातमा" (Aadha Raatma) • Chords: G - Em - C - D</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center space-x-1 font-mono text-[10px]">
          <button
            onClick={() => setActiveSection('hook')}
            className={`px-2.5 py-1 rounded transition cursor-pointer font-bold ${
              activeSection === 'hook'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-aether-surface border border-aether-border text-gray-300 hover:text-white'
            }`}
          >
            🔥 Dance Hook
          </button>
          <button
            onClick={() => setActiveSection('verse1')}
            className={`px-2.5 py-1 rounded transition cursor-pointer font-bold ${
              activeSection === 'verse1'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-aether-surface border border-aether-border text-gray-300 hover:text-white'
            }`}
          >
            Verse 1
          </button>
          <button
            onClick={() => setActiveSection('prechorus')}
            className={`px-2.5 py-1 rounded transition cursor-pointer font-bold ${
              activeSection === 'prechorus'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-aether-surface border border-aether-border text-gray-300 hover:text-white'
            }`}
          >
            Pre-Chorus
          </button>
          <button
            onClick={() => setActiveSection('verse2')}
            className={`px-2.5 py-1 rounded transition cursor-pointer font-bold ${
              activeSection === 'verse2'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-aether-surface border border-aether-border text-gray-300 hover:text-white'
            }`}
          >
            Verse 2
          </button>
          <button
            onClick={() => setActiveSection('bridge')}
            className={`px-2.5 py-1 rounded transition cursor-pointer font-bold ${
              activeSection === 'bridge'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'bg-aether-surface border border-aether-border text-gray-300 hover:text-white'
            }`}
          >
            Bridge
          </button>
        </div>
      </div>

      {/* Lyrics Display with Chords */}
      <div className="bg-[#0B0D13] p-4 rounded-xl border border-aether-border font-sans leading-relaxed text-sm">
        {activeSection === 'hook' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-pink-400 border-b border-gray-800 pb-1">
              <span>GROOVE HOOK 1 (Disco Funk Bounce • ~112 BPM)</span>
              <span>Chords: [G] - [Em] - [C] - [D]</span>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              <p className="text-gray-400 text-[11px]">[G] <span className="text-white font-medium text-sm">Aadha raat ko vibe ma, timi maatra mind ma,</span></p>
              <p className="text-gray-400 text-[11px]">[Em] <span className="text-white font-medium text-sm">Ghumi-phiri adkinchhu timrai timeline ma!</span></p>
              <p className="text-gray-400 text-[11px]">[C] <span className="text-white font-medium text-sm">Tick-tack, tick-tack, mutu ko yo beat,</span></p>
              <p className="text-gray-400 text-[11px]">[D] <span className="text-white font-medium text-sm">Timi yata herideu, city garchha heat!</span></p>
              <p className="text-gray-400 text-[11px]">[G] <span className="text-pink-300 font-bold text-sm">Timi mero loop hau, timi mero loop—</span></p>
              <p className="text-gray-400 text-[11px]">[Em] <span className="text-pink-300 font-bold text-sm">Aankha jhimikka gardaa pani dekhchhu timrai roop!</span></p>
            </div>
          </div>
        )}

        {activeSection === 'verse1' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400 border-b border-gray-800 pb-1">
              <span>VERSE 1 (Atmospheric Night Pop)</span>
              <span>Chords: [G] - [Em] - [C] - [D]</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-mono text-cyan-400">[G] - [Em]</p>
                <p className="text-gray-100 text-sm font-semibold">घडीको सुई दुई बज्यो, निद्रा कता हरायो</p>
                <p className="text-gray-400 text-xs italic">Ghadiko sui dui bajyo, nidra kata harayo</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-cyan-400">[C] - [D]</p>
                <p className="text-gray-100 text-sm font-semibold">झ्याल बाहिरको बतासले तिम्रै नाम दोहोर्‍यायो</p>
                <p className="text-gray-400 text-xs italic">Jhyal baahirako bataasle timrai naam dohor-yaayo</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-cyan-400">[G] - [Em]</p>
                <p className="text-gray-100 text-sm font-semibold">तिम्रो त्यो न्यानो पछ्यौरा अझै कुर्सीमै छ</p>
                <p className="text-gray-400 text-xs italic">Timro tyo nyaano pachhyaura ajhai kursimai chha</p>
              </div>
              <div>
                <p className="text-[11px] font-mono text-cyan-400">[C] - [D]</p>
                <p className="text-gray-100 text-sm font-semibold">म बिर्सिन खोज्छु जति, मन तिमीतिरै जान्छ।</p>
                <p className="text-gray-400 text-xs italic">Ma birsina khojchhu jati, man timitirai jaanchha.</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'prechorus' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400 border-b border-gray-800 pb-1">
              <span>PRE-CHORUS (Building Energy)</span>
              <span>Chords: [C] - [D] - [Em] - [D]</span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-gray-100 text-sm font-semibold">फोनको स्क्रिन हेर्दै यी औंलाहरू रोकिन्छन्</p>
                <p className="text-gray-400 text-xs italic">Phone ko screen herdai yee aaunlaaharu rokinchhan</p>
              </div>
              <div>
                <p className="text-gray-100 text-sm font-semibold">भन्न खोजेका हजार कुरा मनमै अड्किन्छन्</p>
                <p className="text-gray-400 text-xs italic">Bhanna khojeka hajaar kura manmai adkinchhan</p>
              </div>
              <div>
                <p className="text-gray-100 text-sm font-semibold">के तिमी पनि त्यहाँ मलाई नै सम्झिँदै छौ?</p>
                <p className="text-gray-400 text-xs italic">Ke timi pani tyahaan malai nai samjhidai chhau?</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'verse2' && (
          <div className="space-y-2">
            <p className="text-xs font-mono text-indigo-400 border-b border-gray-800 pb-1">VERSE 2</p>
            <p className="text-gray-100 font-semibold">हातमा चिसो कफी, पुराना यादहरू कोरल्दै</p>
            <p className="text-gray-400 text-xs italic">Haatma chiso coffee, puraana yaadharu koral-dai</p>
            <p className="text-gray-100 font-semibold">हामी सँगै हिँडेका ती गल्लीहरू सम्झिँदै</p>
            <p className="text-gray-400 text-xs italic">Haami sangai hindeka tee galliharu samjhidai</p>
          </div>
        )}

        {activeSection === 'bridge' && (
          <div className="space-y-2">
            <p className="text-xs font-mono text-amber-400 border-b border-gray-800 pb-1">BRIDGE (Emotional Climax)</p>
            <p className="text-gray-100 font-semibold">यदि म अहिल्यै तिम्रो ढोकामा आएँ भने, के तिमी मलाई फर्किजाऊ भन्छौ?</p>
            <p className="text-gray-400 text-xs italic">Yadi ma ahilyai timro dhokaamaa aayen bhane, ke timi malai farkijau bhanchhau?</p>
            <p className="text-gray-100 font-semibold">कि ढोका खोली आँखा जुधाई, बिहानी नहुन्जेल अङ्गालोमै राख्छौ?</p>
            <p className="text-amber-300 font-bold">केही त बोल न... एक पटक मनको कुरा भन न!</p>
          </div>
        )}
      </div>
    </div>
  );
};
