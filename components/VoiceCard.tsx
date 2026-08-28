'use client';

import React from 'react';
import { User, Volume2, Sparkles, Flame, Moon, Shield, Radio, Wand2 } from 'lucide-react';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Female' | 'Male' | 'Neutral';
  accent: string;
  tone: string;
  description: string;
  tags: string[];
}

export const VOICES: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    accent: 'Warm Articulate',
    tone: 'Crystal clear, confident, engaging',
    description: 'Perfect for presentations, explainers, and interactive apps.',
    tags: ['Presentations', 'Podcasts', 'Audiobooks'],
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    accent: 'Deep Resonant',
    tone: 'Authoritative, low-frequency, cinematic',
    description: 'Ideal for movie trailers, documentaries, and dramatic reads.',
    tags: ['Trailers', 'Documentary', 'Drama'],
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Neutral',
    accent: 'Dynamic Energetic',
    tone: 'Lively, friendly, modern',
    description: 'Great for tech launch intros, gaming, and upbeat tutorials.',
    tags: ['Tech', 'Gaming', 'Promos'],
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Female',
    accent: 'Soft Soothing',
    tone: 'Velvety, peaceful, mindful',
    description: 'Designed for meditations, sleep stories, and calm guidance.',
    tags: ['Meditation', 'ASMR', 'Relaxation'],
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    accent: 'Crisp Strong',
    tone: 'Commanding, sharp, articulate',
    description: 'Excellent for educational lectures, business news, and guides.',
    tags: ['Corporate', 'Lectures', 'News'],
  },
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'Female',
    accent: 'Melodic Lyrical',
    tone: 'Expressive, rhythmic, theatrical',
    description: 'Suited for poetry, children stories, and creative characters.',
    tags: ['Storytelling', 'Poetry', 'Creative'],
  },
];

interface VoiceCardProps {
  voice: VoiceOption;
  isSelected: boolean;
  onSelect: (voice: VoiceOption) => void;
  onPreviewTone?: (voice: VoiceOption) => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isSelected,
  onSelect,
}) => {
  const getVoiceIcon = () => {
    switch (voice.id) {
      case 'Charon':
        return <Shield className="w-5 h-5 text-amber-400" />;
      case 'Kore':
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'Puck':
        return <Flame className="w-5 h-5 text-orange-400" />;
      case 'Zephyr':
        return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'Fenrir':
        return <Radio className="w-5 h-5 text-emerald-400" />;
      case 'Aoede':
        return <Wand2 className="w-5 h-5 text-pink-400" />;
      default:
        return <User className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div
      id={`voice-card-${voice.id.toLowerCase()}`}
      onClick={() => onSelect(voice)}
      className={`group relative p-3.5 rounded-xl transition-all duration-200 cursor-pointer border text-left flex flex-col justify-between ${
        isSelected
          ? 'bg-[#16161A] border-teal-500/80 ring-1 ring-teal-500/40 shadow-lg shadow-teal-950/40'
          : 'bg-[#121216] border-[#2A2A30] hover:bg-[#16161A] hover:border-gray-600/50'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className={`p-2 rounded-lg ${
              isSelected ? 'bg-[#1A1A20] text-teal-400' : 'bg-[#1A1A1E] text-gray-400 group-hover:bg-[#1A1A20]'
            }`}
          >
            {getVoiceIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#E2E2E2] text-sm tracking-tight">{voice.name}</h3>
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                  voice.gender === 'Female'
                    ? 'border-teal-500/30 text-teal-300 bg-teal-500/10'
                    : voice.gender === 'Male'
                    ? 'border-blue-500/30 text-blue-300 bg-blue-500/10'
                    : 'border-purple-500/30 text-purple-300 bg-purple-500/10'
                }`}
              >
                {voice.gender}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium">{voice.accent}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
          {voice.description}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 pt-1 border-t border-[#2A2A30]">
        {voice.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] text-gray-400 bg-[#1A1A20] px-2 py-0.5 rounded-full border border-[#2A2A30]"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};
