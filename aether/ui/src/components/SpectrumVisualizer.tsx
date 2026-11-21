import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DSPParams } from '../types/aether';

interface SpectrumVisualizerProps {
  fftSpectrum: number[];
  params: DSPParams;
  onParamChange: (id: string, value: number) => void;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  fftSpectrum,
  params,
  onParamChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeBand, setActiveBand] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Map frequency (20Hz - 20kHz) to X coordinate (logarithmic scale)
  const freqToX = useCallback((freq: number, width: number) => {
    const minF = Math.log10(20);
    const maxF = Math.log10(20000);
    const f = Math.log10(Math.max(20, Math.min(20000, freq)));
    return ((f - minF) / (maxF - minF)) * width;
  }, []);

  const xToFreq = useCallback((x: number, width: number) => {
    const minF = Math.log10(20);
    const maxF = Math.log10(20000);
    const ratio = Math.max(0, Math.min(1, x / width));
    return Math.pow(10, minF + ratio * (maxF - minF));
  }, []);

  // Map Gain (-24dB to +24dB) to Y coordinate
  const gainToY = useCallback((gainDb: number, height: number) => {
    const minG = -24;
    const maxG = 24;
    const clamped = Math.max(minG, Math.min(maxG, gainDb));
    return height - ((clamped - minG) / (maxG - minG)) * height;
  }, []);

  const yToGain = useCallback((y: number, height: number) => {
    const minG = -24;
    const maxG = 24;
    const ratio = 1 - Math.max(0, Math.min(1, y / height));
    return minG + ratio * (maxG - minG);
  }, []);

  // Compute EQ magnitude response at frequency f
  const computeEQMagnitude = useCallback((f: number) => {
    let totalDb = 0;

    // Band 1: Low Shelf
    if (params.eq_band1_enable > 0.5) {
      const f0 = params.eq_band1_freq;
      const g = params.eq_band1_gain;
      if (f < f0) {
        totalDb += g;
      } else if (f < f0 * 2) {
        const t = (f - f0) / f0;
        totalDb += g * (1 - t * t);
      }
    }

    // Band 2: Low-Mid Bell
    if (params.eq_band2_enable > 0.5) {
      const f0 = params.eq_band2_freq;
      const g = params.eq_band2_gain;
      const q = Math.max(0.1, params.eq_band2_q);
      const bw = f0 / q;
      const dist = Math.abs(f - f0);
      const factor = Math.exp(-0.5 * Math.pow(dist / (bw * 0.5), 2));
      totalDb += g * factor;
    }

    // Band 3: High-Mid Bell
    if (params.eq_band3_enable > 0.5) {
      const f0 = params.eq_band3_freq;
      const g = params.eq_band3_gain;
      const q = Math.max(0.1, params.eq_band3_q);
      const bw = f0 / q;
      const dist = Math.abs(f - f0);
      const factor = Math.exp(-0.5 * Math.pow(dist / (bw * 0.5), 2));
      totalDb += g * factor;
    }

    // Band 4: High Shelf
    if (params.eq_band4_enable > 0.5) {
      const f0 = params.eq_band4_freq;
      const g = params.eq_band4_gain;
      if (f > f0) {
        totalDb += g;
      } else if (f > f0 * 0.5) {
        const t = (f0 - f) / (f0 * 0.5);
        totalDb += g * (1 - t * t);
      }
    }

    return totalDb;
  }, [params]);

  // Main 60 FPS Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0F131D');
      bgGrad.addColorStop(1, '#0B0D13');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 1. Grid Lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1F2937';
      ctx.fillStyle = '#6B7280';
      ctx.font = '10px JetBrains Mono';

      const freqLines = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
      freqLines.forEach((freq) => {
        const x = freqToX(freq, width);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
        ctx.fillText(label, x + 3, height - 8);
      });

      const dbLines = [-18, -12, -6, 0, 6, 12, 18];
      dbLines.forEach((db) => {
        const y = gainToY(db, height);
        ctx.strokeStyle = db === 0 ? '#374151' : '#1A2234';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.fillText(`${db > 0 ? '+' : ''}${db}dB`, 6, y - 3);
      });

      // 2. Real-Time FFT Spectrum Bars / Curve
      if (fftSpectrum && fftSpectrum.length > 0) {
        ctx.save();
        const specGrad = ctx.createLinearGradient(0, 0, 0, height);
        specGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
        specGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.25)');
        specGrad.addColorStop(1, 'rgba(99, 102, 241, 0.02)');

        ctx.fillStyle = specGrad;
        ctx.beginPath();
        ctx.moveTo(0, height);

        for (let i = 0; i < fftSpectrum.length; i++) {
          const x = (i / (fftSpectrum.length - 1)) * width;
          // Map -80dB to +6dB into height
          const valDb = fftSpectrum[i];
          const norm = Math.max(0, Math.min(1, (valDb + 80) / 86));
          const y = height - norm * (height * 0.95);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Glowing spectrum line
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < fftSpectrum.length; i++) {
          const x = (i / (fftSpectrum.length - 1)) * width;
          const valDb = fftSpectrum[i];
          const norm = Math.max(0, Math.min(1, (valDb + 80) / 86));
          const y = height - norm * (height * 0.95);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 3. EQ Frequency Response Curve
      ctx.save();
      ctx.strokeStyle = '#818CF8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#6366F1';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const numPoints = 200;
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const f = xToFreq(x, width);
        const gainDb = computeEQMagnitude(f);
        const y = gainToY(gainDb, height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // 4. Interactive EQ Control Handles
      const bands = [
        { id: 1, freq: params.eq_band1_freq, gain: params.eq_band1_gain, color: '#F43F5E', name: 'B1 Low Shelf' },
        { id: 2, freq: params.eq_band2_freq, gain: params.eq_band2_gain, color: '#38BDF8', name: 'B2 Bell' },
        { id: 3, freq: params.eq_band3_freq, gain: params.eq_band3_gain, color: '#A855F7', name: 'B3 Bell' },
        { id: 4, freq: params.eq_band4_freq, gain: params.eq_band4_gain, color: '#34D399', name: 'B4 High Shelf' }
      ];

      bands.forEach((b) => {
        const x = freqToX(b.freq, width);
        const y = gainToY(b.gain, height);
        const isActive = activeBand === b.id;

        // Draw handle outer glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, isActive ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = isActive ? 16 : 8;
        ctx.fill();

        // Inner core
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Label tooltip
        if (isActive) {
          ctx.font = '11px JetBrains Mono';
          ctx.fillStyle = '#FFFFFF';
          const label = `${b.name}: ${Math.round(b.freq)}Hz | ${b.gain > 0 ? '+' : ''}${b.gain.toFixed(1)}dB`;
          ctx.fillText(label, Math.max(10, Math.min(width - 150, x - 50)), y - 16);
        }
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [fftSpectrum, params, computeEQMagnitude, activeBand, freqToX, gainToY, xToFreq, yToGain]);

  // Mouse interaction for draggable EQ points
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const bands = [
      { id: 1, freq: params.eq_band1_freq, gain: params.eq_band1_gain },
      { id: 2, freq: params.eq_band2_freq, gain: params.eq_band2_gain },
      { id: 3, freq: params.eq_band3_freq, gain: params.eq_band3_gain },
      { id: 4, freq: params.eq_band4_freq, gain: params.eq_band4_gain },
    ];

    let found = null;
    for (const b of bands) {
      const bx = freqToX(b.freq, canvas.width);
      const by = gainToY(b.gain, canvas.height);
      const dist = Math.hypot(x - bx, y - by);
      if (dist < 18) {
        found = b.id;
        break;
      }
    }

    if (found) {
      setActiveBand(found);
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && activeBand) {
      const freq = Math.round(xToFreq(x, canvas.width));
      const gain = Math.round(yToGain(y, canvas.height) * 10) / 10;

      onParamChange(`eq_band${activeBand}_freq`, freq);
      onParamChange(`eq_band${activeBand}_gain`, gain);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative w-full h-[280px] bg-aether-panel rounded-xl border border-aether-border/80 overflow-hidden shadow-inner flex flex-col">
      <div className="absolute top-2 left-3 z-10 flex items-center space-x-2 text-xs font-mono">
        <span className="text-gray-400">SPECTRUM &amp; 4-BAND SURGICAL EQ</span>
        <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 rounded">
          60 FPS FFT
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={760}
        height={280}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-crosshair"
      />
    </div>
  );
};
