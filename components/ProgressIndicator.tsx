'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, Cpu, Waves, Database, CheckCircle2 } from 'lucide-react';

interface ProgressIndicatorProps {
  isLoading: boolean;
  voiceName: string;
  voiceStyle: string;
}

const STEPS = [
  {
    id: 1,
    title: 'Analyzing Prompt & Style',
    description: 'Interpreting voice emotion, pacing & nuance...',
    icon: Sparkles,
  },
  {
    id: 2,
    title: 'Acoustic Synthesis',
    description: 'Generating vocal phonemes & pitch frequencies...',
    icon: Waves,
  },
  {
    id: 3,
    title: 'Audio Stream Processing',
    description: 'Encoding 24kHz master PCM audio...',
    icon: Cpu,
  },
  {
    id: 4,
    title: 'Finalizing & Storing',
    description: 'Creating RIFF/WAV header and writing to SQLite...',
    icon: Database,
  },
];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isLoading,
  voiceName,
  voiceStyle,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(12);

  useEffect(() => {
    if (!isLoading) return;

    const t0 = setTimeout(() => {
      setCurrentStepIndex(0);
      setProgressPercent(15);
    }, 0);

    // Step sequence timer
    const t1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setProgressPercent(42);
    }, 900);

    const t2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setProgressPercent(74);
    }, 2200);

    const t3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setProgressPercent(92);
    }, 3800);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  const currentStep = STEPS[currentStepIndex];

  return (
    <div
      id="tts-progress-modal"
      className="p-6 rounded-2xl bg-[#121216] border border-[#2A2A30] shadow-2xl transition-all duration-300 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A1A20] rounded-full flex items-center justify-center border border-[#2A2A30]">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#E2E2E2] flex items-center gap-2">
              Generating: Neural Audio Stream
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-teal-900/20 text-teal-300 border border-teal-800/40">
                Voice: {voiceName}
              </span>
            </h4>
            <p className="text-[10px] text-gray-500 truncate max-w-md mt-0.5">
              {voiceStyle ? `Style: "${voiceStyle}"` : 'Estimated time: 3-5 seconds'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-sm font-bold font-mono text-teal-400">{progressPercent}%</span>
        </div>
      </div>

      {/* Main Animated Progress Bar */}
      <div className="h-2 bg-[#1A1A20] rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-600 shadow-[0_0_10px_rgba(20,184,166,0.5)] transition-all duration-500 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </div>
      </div>

      {/* Step Pipeline Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const StepIcon = step.icon;

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                isCurrent
                  ? 'bg-[#16161A] border-teal-500/60 shadow-md shadow-teal-950/30'
                  : isDone
                  ? 'bg-[#1A1A1E] border-[#2A2A30] text-gray-400'
                  : 'bg-[#121216] border-[#222226] text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                ) : isCurrent ? (
                  <StepIcon className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                ) : (
                  <StepIcon className="w-3.5 h-3.5 text-gray-600" />
                )}
                <span
                  className={`font-medium ${
                    isCurrent ? 'text-[#E2E2E2]' : isDone ? 'text-gray-300' : 'text-gray-600'
                  }`}
                >
                  Step {step.id}
                </span>
              </div>
              <p
                className={`text-[11px] leading-tight ${
                  isCurrent ? 'text-teal-300' : isDone ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {step.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
