'use client';

import React from 'react';
import {
  Sparkles,
  Zap,
  Film,
  Radio,
  Heart,
  BookOpen,
  Smile,
  Bot,
  HelpCircle,
} from 'lucide-react';

export interface StylePreset {
  id: string;
  name: string;
  instruction: string;
  iconName: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'whisper',
    name: 'Whispering',
    instruction: 'soft, intimate, gentle whisper with quiet breathing',
    iconName: 'Heart',
  },
  {
    id: 'excited',
    name: 'Excited Keynote',
    instruction: 'high energy, passionate, enthusiastic tech launch speaker',
    iconName: 'Zap',
  },
  {
    id: 'trailer',
    name: 'Movie Trailer',
    instruction: 'deep, cinematic, dramatic, epic baritone with suspense',
    iconName: 'Film',
  },
  {
    id: 'news',
    name: 'News Anchor',
    instruction: 'authoritative, clear, professional news broadcast tone',
    iconName: 'Radio',
  },
  {
    id: 'meditation',
    name: 'Calm Meditation',
    instruction: 'slow, mindful, soothing, peaceful zen guide',
    iconName: 'Heart',
  },
  {
    id: 'storyteller',
    name: 'Fantasy Narrator',
    instruction: 'theatrical, whimsical, immersive audiobook storyteller',
    iconName: 'BookOpen',
  },
  {
    id: 'cheerful',
    name: 'Cheerful Host',
    instruction: 'bright, smiling, friendly, warm and welcoming',
    iconName: 'Smile',
  },
  {
    id: 'robot',
    name: 'Sci-Fi AI',
    instruction: 'futuristic, analytical, precise, robotic synthetic cadence',
    iconName: 'Bot',
  },
];

interface StylePresetPickerProps {
  currentStyle: string;
  onSelectStyle: (style: string) => void;
}

export const StylePresetPicker: React.FC<StylePresetPickerProps> = ({
  currentStyle,
  onSelectStyle,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'Film':
        return <Film className="w-3.5 h-3.5 text-purple-400" />;
      case 'Radio':
        return <Radio className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Heart':
        return <Heart className="w-3.5 h-3.5 text-pink-400" />;
      case 'BookOpen':
        return <BookOpen className="w-3.5 h-3.5 text-blue-400" />;
      case 'Smile':
        return <Smile className="w-3.5 h-3.5 text-yellow-400" />;
      case 'Bot':
        return <Bot className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1.5 font-medium text-gray-300">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          Quick Style Presets
        </span>
        <span className="text-[11px] text-gray-500">Click to apply to style prompt</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STYLE_PRESETS.map((preset) => {
          const isSelected =
            currentStyle.toLowerCase().includes(preset.instruction.toLowerCase()) ||
            currentStyle.toLowerCase().includes(preset.name.toLowerCase());

          return (
            <button
              key={preset.id}
              type="button"
              id={`style-preset-btn-${preset.id}`}
              onClick={() => onSelectStyle(preset.instruction)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
                isSelected
                  ? 'bg-teal-900/20 border-teal-500/70 text-teal-200 ring-1 ring-teal-500/40'
                  : 'bg-[#16161A] border-[#2A2A30] text-gray-300 hover:bg-[#1A1A20] hover:text-white hover:border-gray-600/50'
              }`}
            >
              {getIcon(preset.iconName)}
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
