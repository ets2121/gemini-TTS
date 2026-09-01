'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Mic,
  Volume2,
  Sparkles,
  Play,
  Square,
  Loader2,
  Check,
  RotateCcw,
} from 'lucide-react';
import { VOICES, VoiceOption } from '@/components/VoiceCard';

interface VoiceSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoice: VoiceOption;
  onSelectVoice: (voice: VoiceOption) => void;
  currentlyPlayingVoiceId: string | null;
  onStartPlayPreview: (voiceId: string) => void;
  onStopPlayPreview: () => void;
  isRpmCoolingDown?: boolean;
}

export const VoiceSelectModal: React.FC<VoiceSelectModalProps> = ({
  isOpen,
  onClose,
  selectedVoice,
  onSelectVoice,
  currentlyPlayingVoiceId,
  onStartPlayPreview,
  onStopPlayPreview,
  isRpmCoolingDown = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState<'All' | 'Female' | 'Male' | 'Neutral'>('All');
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);

  const filteredVoices = useMemo(() => {
    return VOICES.filter((voice) => {
      const matchesGender =
        selectedGender === 'All' ? true : voice.gender === selectedGender;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        voice.name.toLowerCase().includes(q) ||
        voice.tone.toLowerCase().includes(q) ||
        voice.accent.toLowerCase().includes(q) ||
        voice.description.toLowerCase().includes(q) ||
        voice.tags.some((t) => t.toLowerCase().includes(q));

      return matchesGender && matchesSearch;
    });
  }, [searchTerm, selectedGender]);

  if (!isOpen) return null;

  const handlePreview = async (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation();

    if (currentlyPlayingVoiceId === voice.id) {
      onStopPlayPreview();
      return;
    }

    setLoadingVoiceId(voice.id);
    try {
      const res = await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceName: voice.id }),
      });
      const data = await res.json();
      setLoadingVoiceId(null);

      if (data.success && data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audio.onended = () => onStopPlayPreview();
        audio.onerror = () => onStopPlayPreview();
        onStartPlayPreview(voice.id);
        audio.play().catch(() => onStopPlayPreview());
      }
    } catch {
      setLoadingVoiceId(null);
      onStopPlayPreview();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#111116] border border-[#262632] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22222D] bg-[#14141B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Voice Catalog
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#20202C] text-teal-300 font-mono">
                  {VOICES.length} Studio Personas
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Select a neural voice persona for your speech generation
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

        {/* Filters & Search */}
        <div className="p-4 border-b border-[#1E1E28] bg-[#0E0E13] flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tone, accent, name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#161620] border border-[#2A2A38] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/60 focus:ring-1 focus:ring-teal-500/30"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Gender Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#161620] border border-[#2A2A38] rounded-xl w-full sm:w-auto justify-center">
            {(['All', 'Female', 'Male', 'Neutral'] as const).map((gender) => (
              <button
                key={gender}
                onClick={() => setSelectedGender(gender)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedGender === gender
                    ? 'bg-teal-500 text-black shadow-md font-semibold'
                    : 'text-gray-400 hover:text-white hover:bg-[#222230]'
                }`}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Grid (Scrollable) */}
        <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 custom-scrollbar">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoice.id === voice.id;
            const isPlaying = currentlyPlayingVoiceId === voice.id;
            const isLoading = loadingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                onClick={() => {
                  onSelectVoice(voice);
                  onClose();
                }}
                className={`group relative p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#181824] border-teal-500/80 ring-1 ring-teal-500/40 shadow-lg shadow-teal-950/40'
                    : 'bg-[#14141C] border-[#22222E] hover:border-gray-600/70 hover:bg-[#181822]'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white group-hover:text-teal-300 transition-colors">
                        {voice.name}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                          voice.gender === 'Female'
                            ? 'bg-pink-500/15 text-pink-300 border border-pink-500/30'
                            : voice.gender === 'Male'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {voice.gender}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/30">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>

                  {/* Accent / Tone */}
                  <p className="text-xs font-medium text-teal-300/90 mb-1">{voice.accent}</p>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
                    {voice.description}
                  </p>
                </div>

                {/* Bottom Bar: Tags & Preview */}
                <div className="pt-2.5 border-t border-[#22222E] flex items-center justify-between gap-2 mt-auto">
                  <div className="flex flex-wrap gap-1">
                    {voice.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-[#1C1C28] text-gray-400 border border-[#282838]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handlePreview(e, voice)}
                    disabled={isLoading}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isPlaying
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                        : 'bg-[#20202C] text-gray-300 hover:text-white hover:bg-teal-500/20 hover:border-teal-500/40 border border-[#2A2A3C]'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                    ) : isPlaying ? (
                      <>
                        <Square className="w-3 h-3 fill-current" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current text-teal-400" /> Preview
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#22222D] bg-[#14141B] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Click any persona to apply it instantly to your workspace.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#22222E] text-white hover:bg-[#2C2C3C] transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
