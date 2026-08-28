'use client';

import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioElementRef: React.RefObject<HTMLAudioElement | null>;
  colorTheme?: 'cyan' | 'purple' | 'emerald';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  audioElementRef,
  colorTheme = 'cyan',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localAudioCtx = audioContextRef.current;

    // Connect Web Audio API to the audio element when playing starts
    const setupAudioContext = () => {
      const audio = audioElementRef.current;
      if (!audio || audioContextRef.current) return;

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        localAudioCtx = new AudioCtx();
        audioContextRef.current = localAudioCtx;

        const analyser = localAudioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = localAudioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(localAudioCtx.destination);
        sourceRef.current = source;
      } catch (err) {
        // May fail if already connected or browser policy; fallback to synthetic visualizer
        console.log('AudioContext initialization note:', err);
      }
    };

    if (isPlaying && !audioContextRef.current) {
      setupAudioContext();
    }

    if (localAudioCtx && localAudioCtx.state === 'suspended' && isPlaying) {
      localAudioCtx.resume();
    }

    let phase = 0;

    const render = () => {
      if (!canvas) return;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      let bufferLength = 64;
      let dataArray = new Uint8Array(bufferLength);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else if (isPlaying) {
        // Simulated harmonic spectrum when MediaElementSource is restricted
        phase += 0.15;
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.floor(
            (Math.sin(phase + i * 0.2) * 0.4 + 0.6) * 180 +
              Math.sin(phase * 2 + i * 0.4) * 40
          );
        }
      } else {
        // Idle gentle wave
        phase += 0.03;
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.floor((Math.sin(phase + i * 0.1) * 0.5 + 0.5) * 25 + 10);
        }
      }

      const barCount = 48;
      const barWidth = Math.max(3, (width - barCount * 3) / barCount);
      const gap = 3;
      const startX = (width - (barCount * (barWidth + gap) - gap)) / 2;

      // Color scheme
      let primaryColor = '#14b8a6'; // teal-500
      let secondaryColor = '#0d9488'; // teal-600
      let glowColor = 'rgba(20, 184, 166, 0.4)';

      if (colorTheme === 'purple') {
        primaryColor = '#a855f7';
        secondaryColor = '#6366f1';
        glowColor = 'rgba(168, 85, 247, 0.4)';
      } else if (colorTheme === 'emerald') {
        primaryColor = '#10b981';
        secondaryColor = '#14b8a6';
        glowColor = 'rgba(16, 185, 129, 0.4)';
      }

      // Draw mirrored equalizer bars
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength * 0.7);
        const value = dataArray[dataIndex] || 0;
        const normalized = value / 255;
        const minHeight = isPlaying ? 6 : 4;
        const barHeight = Math.max(minHeight, normalized * (height * 0.85));

        const x = startX + i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        // Gradient for bar
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.5, secondaryColor);
        gradient.addColorStop(1, primaryColor);

        ctx.fillStyle = gradient;
        ctx.shadowColor = isPlaying ? glowColor : 'transparent';
        ctx.shadowBlur = isPlaying ? 10 : 0;

        // Rounded bar
        ctx.beginPath();
        const radius = barWidth / 2;
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, audioElementRef, colorTheme]);

  return (
    <div className="w-full h-24 relative rounded-xl overflow-hidden bg-[#0D0D10] border border-[#2A2A30] flex items-center justify-center p-2">
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 via-teal-900/10 to-teal-500/5 pointer-events-none" />
      <canvas
        ref={canvasRef}
        width={600}
        height={90}
        className="w-full h-full object-contain relative z-10"
      />
      {!isPlaying && (
        <div className="absolute top-2 right-3 text-[10px] text-gray-500 uppercase tracking-widest font-mono">
          Ready
        </div>
      )}
      {isPlaying && (
        <div className="absolute top-2 right-3 flex items-center gap-1.5 text-[10px] text-teal-400 uppercase tracking-widest font-mono">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          Live Audio
        </div>
      )}
    </div>
  );
};
