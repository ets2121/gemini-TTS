'use client';

import React from 'react';
import {
  X,
  Cpu,
  Zap,
  Sparkles,
  Check,
  ShieldCheck,
  Activity,
  Volume2,
  Clock,
} from 'lucide-react';

interface ModelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export const ModelSelectModal: React.FC<ModelSelectModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
}) => {
  if (!isOpen) return null;

  const models = [
    {
      id: 'gemini-2.5-flash-preview-tts',
      name: 'Gemini 2.5 Flash TTS',
      badge: 'Fast & Natural Synthesis',
      description:
        'High-speed natural voice synthesis with crisp audio fidelity and low latency.',
      specs: {
        latency: '~120ms',
        audioFormat: '24kHz 16-bit PCM',
        rpmLimit: '2 RPM Limit',
        bestFor: 'General Narration, Quick Previews & Interactive Speech',
      },
      tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      icon: Zap,
    },
    {
      id: 'gemini-3.1-flash-tts-preview',
      name: 'Gemini 3.1 Flash Neural TTS',
      badge: 'Expressive Prosody & Emotion',
      description:
        'Studio neural speech synthesis with deep emotional range, custom acting direction, and expressive prosody.',
      specs: {
        latency: '~180ms',
        audioFormat: '24kHz 16-bit PCM',
        rpmLimit: '2 RPM Limit',
        bestFor: 'Audiobooks, Podcasts, Cinematic Storytelling & Character Voices',
      },
      tagColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      icon: Sparkles,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#111116] border border-[#262632] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22222D] bg-[#14141B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Neural Speech Engine
              </h2>
              <p className="text-xs text-gray-400">
                Choose the Google Gemini neural model architecture for synthesis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#20202A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {models.map((model) => {
              const isSelected = selectedModel === model.id;
              const IconComp = model.icon;

              return (
                <div
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    onClose();
                  }}
                  className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#181826] border-teal-500/80 ring-1 ring-teal-500/40 shadow-xl shadow-teal-950/40'
                      : 'bg-[#14141C] border-[#242430] hover:bg-[#181822] hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border ${model.tagColor}`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{model.name}</h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${model.tagColor}`}
                          >
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                          {model.description}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                        isSelected
                          ? 'border-teal-400 bg-teal-500 text-black'
                          : 'border-gray-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Specs Pill Matrix */}
                  <div className="pt-3 border-t border-[#20202E] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-[#101017] border border-[#1E1E2A]">
                      <span className="text-gray-500 block text-[10px]">Latency</span>
                      <span className="font-mono font-medium text-teal-300">
                        {model.specs.latency}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#101017] border border-[#1E1E2A]">
                      <span className="text-gray-500 block text-[10px]">Output Quality</span>
                      <span className="font-medium text-gray-200">
                        {model.specs.audioFormat}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#101017] border border-[#1E1E2A]">
                      <span className="text-gray-500 block text-[10px]">API Rate Limit</span>
                      <span className="font-semibold text-emerald-400">
                        {model.specs.rpmLimit}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#101017] border border-[#1E1E2A]">
                      <span className="text-gray-500 block text-[10px]">Style Support</span>
                      <span className="font-medium text-amber-300">Full Neural</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RPM Policy Note */}
          <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-500/20 flex items-center gap-3 text-xs text-teal-300/90">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
            <span>
              <strong>Built-in RPM Guard</strong>: Each model enforces a 2 RPM cooldown timer with visual progress to prevent hitting quota thresholds.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#22222D] bg-[#14141B] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs bg-[#20202A] text-gray-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
