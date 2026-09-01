'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Wand2,
  Check,
  Moon,
  Zap,
  Film,
  Radio,
  Heart,
  BookOpen,
  Smile,
  Bot,
  Plus,
  Compass,
} from 'lucide-react';
import { VoiceStylePreset } from '@/lib/db';

interface StylePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: string;
  onSelectStyle: (stylePrompt: string) => void;
  presets?: VoiceStylePreset[];
}

const DEFAULT_MODAL_PRESETS = [
  {
    id: 'whisper',
    name: 'Soft Whisper',
    prompt: 'soft, gentle, intimate whisper with relaxed cadence',
    icon: Moon,
    category: 'Atmospheric',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
  },
  {
    id: 'keynote',
    name: 'Excited Keynote',
    prompt: 'high energy, enthusiastic, crisp articulation, and captivating passion',
    icon: Zap,
    category: 'Dynamic',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    id: 'trailer',
    name: 'Movie Trailer',
    prompt: 'deep, cinematic, dramatic, epic baritone with deliberate pauses and gravitas',
    icon: Film,
    category: 'Cinematic',
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
  {
    id: 'news',
    name: 'News Anchor',
    prompt: 'clear, neutral, authoritative, professional broadcast tone with precise cadence',
    icon: Radio,
    category: 'Professional',
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  },
  {
    id: 'meditation',
    name: 'Calm Meditation',
    prompt: 'slow, soothing, warm, mindful rhythm designed for deep breathing and tranquility',
    icon: Heart,
    category: 'Wellness',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
  {
    id: 'storyteller',
    name: 'Fantasy Narrator',
    prompt: 'rich theatrical storytelling warmth, expressive inflection, and mysterious wonder',
    icon: BookOpen,
    category: 'Creative',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    id: 'cheerful',
    name: 'Cheerful Host',
    prompt: 'uplifting, smiling, bright, welcoming tone that radiates friendliness',
    icon: Smile,
    category: 'Casual',
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  },
  {
    id: 'robot',
    name: 'Sci-Fi Synth',
    prompt: 'rhythmic, analytical, futuristic AI cadence and crisp neutral inflection',
    icon: Bot,
    category: 'Sci-Fi',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
  },
];

const STYLE_QUICK_TAGS = [
  'warm, articulate, confident',
  'dramatic & cinematic',
  'cheerful & energetic',
  'calm & soothing',
  'authoritative & clear',
  'mysterious fantasy narrative',
  'fast-paced promotional',
  'gentle whisper',
];

export const StylePresetModal: React.FC<StylePresetModalProps> = ({
  isOpen,
  onClose,
  currentStyle,
  onSelectStyle,
}) => {
  const [customInput, setCustomInput] = useState(currentStyle || '');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Dynamic', 'Cinematic', 'Professional', 'Wellness', 'Creative', 'Atmospheric', 'Sci-Fi'];

  const filteredPresets = DEFAULT_MODAL_PRESETS.filter(
    (p) => activeCategory === 'All' || p.category === activeCategory
  );

  const handleApplyCustom = () => {
    onSelectStyle(customInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#111116] border border-[#262632] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22222D] bg-[#14141B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Vocal Style & Acting Direction
              </h2>
              <p className="text-xs text-gray-400">
                Guide tone, emotion, pace, and mood using prompt instructions
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

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Custom Style Input Card */}
          <div className="p-4 rounded-xl bg-[#15151F] border border-[#262638] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Custom Vocal Direction Prompt
              </label>
              <button
                type="button"
                onClick={() => setCustomInput('')}
                className="text-[11px] text-gray-500 hover:text-gray-300"
              >
                Clear
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. Speak with upbeat excitement like an enthusiastic podcast host..."
                className="w-full px-3.5 py-2.5 bg-[#0E0E14] border border-[#2B2B3C] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/70 focus:ring-1 focus:ring-teal-500/30"
              />
            </div>

            {/* Quick Inspiration Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {STYLE_QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCustomInput(tag)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-[#1D1D2B] text-gray-300 hover:text-teal-300 hover:bg-[#252538] border border-[#28283C] transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Curated Presets
              </h3>
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[65%] custom-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg whitespace-nowrap font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-teal-500 text-black font-semibold'
                        : 'bg-[#181822] text-gray-400 hover:text-white border border-[#262634]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredPresets.map((preset) => {
                const IconComponent = preset.icon;
                const isSelected = currentStyle.toLowerCase() === preset.prompt.toLowerCase();

                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      setCustomInput(preset.prompt);
                      onSelectStyle(preset.prompt);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#181824] border-teal-500/80 ring-1 ring-teal-500/40 shadow-lg'
                        : 'bg-[#13131A] border-[#22222E] hover:bg-[#181822] hover:border-gray-600'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${preset.color}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-white truncate">
                          {preset.name}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] text-teal-400 font-semibold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                        {preset.prompt}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#22222D] bg-[#14141B] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs bg-[#20202A] text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyCustom}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 text-black hover:bg-teal-400 shadow-md shadow-teal-500/20 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Apply Vocal Style
          </button>
        </div>
      </div>
    </div>
  );
};
