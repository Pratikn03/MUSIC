import React, { useState, useRef, useEffect } from 'react';
import { MentorMessage, DSPParams } from '../types/aether';
import { Send, Mic, MicOff, Sparkles, HelpCircle, Bot, User, CheckCircle2 } from 'lucide-react';

interface MentorSidebarProps {
  messages: MentorMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onQuickPrompt: (text: string) => void;
}

export const MentorSidebar: React.FC<MentorSidebarProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onQuickPrompt
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      // Simulate completed voice transcription
      onSendMessage("The bass is muddying the vocals, make the vocals brighter and tighter");
    } else {
      setIsRecording(true);
    }
  };

  const quickPrompts = [
    "De-mud low-mids",
    "Add silky vocal air",
    "Punchy bass & kick",
    "Glue mix bus",
    "Widen stereo image",
    "Why 15ms attack on compressor?"
  ];

  return (
    <aside className="w-96 bg-aether-panel border-l border-aether-border/80 flex flex-col h-full shadow-2xl">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-aether-border/60 flex items-center justify-between bg-aether-dark/50">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wide">AI CO-PRODUCER &amp; MENTOR</h2>
            <p className="text-[10px] text-gray-400 font-mono">100% On-Device Reasoning</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">
          ONLINE
        </span>
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-2 border-b border-aether-border/40 bg-[#0E1119] flex flex-wrap gap-1.5">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => onQuickPrompt(qp)}
            className="text-[10px] font-mono px-2 py-1 rounded-md bg-aether-surface/70 hover:bg-indigo-900/60 hover:text-indigo-200 border border-aether-border/60 text-gray-300 transition cursor-pointer"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs">
        {messages.map((m) => {
          const isAi = m.sender === 'aether';
          return (
            <div
              key={m.id}
              className={`flex flex-col space-y-1.5 ${isAi ? 'items-start' : 'items-end'}`}
            >
              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-gray-400">
                {isAi ? <Bot className="w-3 h-3 text-indigo-400" /> : <User className="w-3 h-3 text-cyan-400" />}
                <span>{isAi ? 'AETHER MENTOR' : 'YOU'}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>

              <div
                className={`p-3 rounded-xl max-w-[92%] leading-relaxed ${
                  isAi
                    ? 'bg-aether-surface/90 text-gray-100 border border-aether-border/70 shadow-sm'
                    : 'bg-indigo-600 text-white rounded-tr-none'
                }`}
              >
                <p className="text-xs">{m.text}</p>

                {/* Parameter Delta Pills */}
                {m.parameter_delta && Object.keys(m.parameter_delta).length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-aether-border/60 flex flex-col space-y-1 font-mono text-[10px]">
                    <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>SURGICAL DELTA APPLIED:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(m.parameter_delta).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-1.5 py-0.5 rounded bg-[#0F131D] border border-emerald-800/40 text-emerald-300"
                        >
                          {k}: {typeof v === 'number' && v > 0 ? `+${v}` : v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acoustic Telemetry Insight */}
                {m.audio_insight && (
                  <div className="mt-2 bg-[#0C0F17]/70 p-2 rounded border border-indigo-900/40 text-[10px] font-mono text-indigo-300">
                    <span className="text-gray-400">Telemetry Insight: </span>
                    {m.audio_insight}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-indigo-400 font-mono p-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Analyzing acoustic telemetry &amp; calculating delta...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar & Push-to-Talk */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-aether-border/80 bg-aether-dark">
        <div className="flex items-center space-x-2">
          {/* Push-to-Talk Voice Button */}
          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? "Release to process voice" : "Push-to-Talk Voice Command"}
            className={`p-2 rounded-lg transition-all ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/50'
                : 'bg-aether-surface border border-aether-border text-gray-300 hover:text-white hover:bg-aether-border'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRecording ? "Listening to voice..." : "Direct mixing or ask mentor..."}
            className="flex-1 bg-aether-surface border border-aether-border rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm ${
              !inputText.trim() || isLoading ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex justify-between items-center mt-1.5 px-1 text-[9px] font-mono text-gray-400">
          <span>Push-to-Talk or type direction</span>
          <span>Zero audio dropout guaranteed</span>
        </div>
      </form>
    </aside>
  );
};
