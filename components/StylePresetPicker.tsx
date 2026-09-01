'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Film,
  Radio,
  Heart,
  BookOpen,
  Smile,
  Bot,
  ChevronDown,
  ChevronUp,
  Search,
  Sliders,
  Flame,
  Moon,
  Volume2,
  Briefcase,
  Tv,
  Award,
  Compass,
  Feather,
  Cpu,
  Coffee,
  Check,
  Plus,
  Layers,
  Wand2,
} from 'lucide-react';

export interface StylePresetItem {
  id: string;
  name: string;
  instruction: string;
  iconName: string;
  tag: string;
}

export interface StyleCategory {
  id: string;
  name: string;
  iconName: string;
  description: string;
  styles: StylePresetItem[];
}

export const STYLE_CATEGORIES: StyleCategory[] = [
  {
    id: 'emotions',
    name: 'Emotions',
    iconName: 'Smile',
    description: 'Warmth, mood, energy and emotional resonance',
    styles: [
      {
        id: 'excited',
        name: 'Excited Keynote',
        instruction: 'high energy, passionate, enthusiastic tech launch speaker with crisp articulation',
        iconName: 'Zap',
        tag: 'High Energy',
      },
      {
        id: 'cheerful',
        name: 'Joyful & Warm',
        instruction: 'bright, smiling, friendly, warm and welcoming with cheerful inflection',
        iconName: 'Smile',
        tag: 'Friendly',
      },
      {
        id: 'warm-compassion',
        name: 'Empathetic & Caring',
        instruction: 'warm, compassionate, gentle, reassuring, deep emotional connection',
        iconName: 'Heart',
        tag: 'Reassuring',
      },
      {
        id: 'mysterious',
        name: 'Mysterious & Intriguing',
        instruction: 'subtle, suspenseful, enigmatic cadence with deliberate pauses and intrigue',
        iconName: 'Moon',
        tag: 'Suspense',
      },
      {
        id: 'melancholic',
        name: 'Somber & Reflective',
        instruction: 'soft, nostalgic, somber, heartfelt emotional depth and measured pace',
        iconName: 'Feather',
        tag: 'Reflective',
      },
      {
        id: 'fierce',
        name: 'Passionate & Fierce',
        instruction: 'bold, urgent, commanding, fiery conviction with dramatic punch',
        iconName: 'Flame',
        tag: 'Urgent',
      },
    ],
  },
  {
    id: 'acting',
    name: 'Acting & Cinema',
    iconName: 'Film',
    description: 'Dramatic, theatrical and cinematic deliveries',
    styles: [
      {
        id: 'trailer',
        name: 'Movie Trailer Baritone',
        instruction: 'deep, cinematic, dramatic, epic baritone with suspense and gravitas',
        iconName: 'Film',
        tag: 'Cinematic',
      },
      {
        id: 'whisper',
        name: 'Intimate Whisper',
        instruction: 'soft, intimate, gentle whisper with quiet breathing and close-mic texture',
        iconName: 'Heart',
        tag: 'Whisper',
      },
      {
        id: 'storyteller',
        name: 'Fantasy Narrator',
        instruction: 'enchanting, whimsical, immersive fable storyteller with rich character pacing',
        iconName: 'BookOpen',
        tag: 'Narrative',
      },
      {
        id: 'documentary',
        name: 'Nature Documentary',
        instruction: 'poised, respectful, awe-inspiring, contemplative natural history narration',
        iconName: 'Compass',
        tag: 'Documentary',
      },
      {
        id: 'horror-thriller',
        name: 'Dark Gothic Suspense',
        instruction: 'tense, spine-chilling, hushed, ominous gothic thriller atmosphere',
        iconName: 'Moon',
        tag: 'Thriller',
      },
      {
        id: 'comedic-witty',
        name: 'Witty Sarcasm',
        instruction: 'playful, dry humor, sharp comedic timing, ironic inflection',
        iconName: 'Smile',
        tag: 'Humor',
      },
    ],
  },
  {
    id: 'tone',
    name: 'Pacing & Tone',
    iconName: 'Sliders',
    description: 'Modulation, cadence and tempo structures',
    styles: [
      {
        id: 'fast-paced',
        name: 'Fast & Dynamic',
        instruction: 'rapid, upbeat, punchy, rhythmic cadence without losing clarity',
        iconName: 'Zap',
        tag: 'Fast Pace',
      },
      {
        id: 'measured-deliberate',
        name: 'Slow & Measured',
        instruction: 'slow, deliberate, authoritative, thoughtful pauses and clear enunciations',
        iconName: 'Sliders',
        tag: 'Deliberate',
      },
      {
        id: 'monotone-analytical',
        name: 'Analytical Focus',
        instruction: 'neutral, precise, objective, matter-of-fact intellectual clarity',
        iconName: 'Radio',
        tag: 'Analytical',
      },
      {
        id: 'conversational-casual',
        name: 'Casual Coffee Chat',
        instruction: 'informal, friendly, relatable, unscripted conversational flow',
        iconName: 'Coffee',
        tag: 'Casual',
      },
    ],
  },
  {
    id: 'professional',
    name: 'Professional & Media',
    iconName: 'Briefcase',
    description: 'Broadcasts, podcasts, news and tutorials',
    styles: [
      {
        id: 'news-anchor',
        name: 'Broadcast News Anchor',
        instruction: 'objective, crisp, authoritative prime-time news broadcast style',
        iconName: 'Tv',
        tag: 'Broadcast',
      },
      {
        id: 'podcast-host',
        name: 'Engaging Podcast Host',
        instruction: 'warm, charismatic, engaging, authentic studio microphone presence',
        iconName: 'Radio',
        tag: 'Podcast',
      },
      {
        id: 'corporate-presentation',
        name: 'Executive Presentation',
        instruction: 'confident, articulate, polished, high-level business stakeholder delivery',
        iconName: 'Briefcase',
        tag: 'Corporate',
      },
      {
        id: 'e-learning',
        name: 'Educational Explainer',
        instruction: 'clear, patient, encouraging, pedagogically structured teacher voice',
        iconName: 'BookOpen',
        tag: 'Tutorial',
      },
      {
        id: 'commercial-promo',
        name: 'High-Conversion Ad',
        instruction: 'persuasive, magnetic, enthusiastic, crisp commercial sales delivery',
        iconName: 'Award',
        tag: 'Commercial',
      },
    ],
  },
  {
    id: 'wellness',
    name: 'Wellness & Calm',
    iconName: 'Feather',
    description: 'Meditation, mindfulness, relaxation and sleep',
    styles: [
      {
        id: 'mindfulness-guide',
        name: 'Mindfulness Meditation',
        instruction: 'soothing, calm, deeply relaxing, breath-centered mindful cadence',
        iconName: 'Feather',
        tag: 'Meditation',
      },
      {
        id: 'sleep-story',
        name: 'Hypnotic Sleep Story',
        instruction: 'ultra-gentle, slow, rhythmic, lullaby cadence for deep sleep induction',
        iconName: 'Moon',
        tag: 'Sleep',
      },
      {
        id: 'gentle-affirmation',
        name: 'Positive Affirmation',
        instruction: 'uplifting, empowering, heartfelt, loving and reassuring tone',
        iconName: 'Heart',
        tag: 'Affirmation',
      },
    ],
  },
  {
    id: 'scifi',
    name: 'Character & AI',
    iconName: 'Bot',
    description: 'Cyberpunk, synthetic intelligence and fantasy voices',
    styles: [
      {
        id: 'ai-assistant',
        name: 'Sleek Cybernetic AI',
        instruction: 'futuristic, seamless, polite, highly intelligent robotic virtual assistant',
        iconName: 'Bot',
        tag: 'AI Robot',
      },
      {
        id: 'cyberpunk-operator',
        name: 'Sci-Fi Dispatch Operator',
        instruction: 'tactical, focused, radio-filtered, high-tech tactical comms operator',
        iconName: 'Cpu',
        tag: 'Tactical',
      },
      {
        id: 'ancient-oracle',
        name: 'Mystic Ancient Oracle',
        instruction: 'ethereal, resonant, timeless, prophetically reverberant and grand',
        iconName: 'Sparkles',
        tag: 'Mythic',
      },
    ],
  },
];

interface StylePresetPickerProps {
  currentStyle: string;
  onSelectStyle: (styleInstruction: string) => void;
  onAppendStyle: (styleInstruction: string) => void;
}

export const StylePresetPicker: React.FC<StylePresetPickerProps> = ({
  currentStyle,
  onSelectStyle,
  onAppendStyle,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const getItemIcon = (iconName: string) => {
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
      case 'Flame':
        return <Flame className="w-3.5 h-3.5 text-orange-400" />;
      case 'Moon':
        return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Feather':
        return <Feather className="w-3.5 h-3.5 text-teal-400" />;
      case 'Coffee':
        return <Coffee className="w-3.5 h-3.5 text-amber-600" />;
      case 'Award':
        return <Award className="w-3.5 h-3.5 text-amber-300" />;
      case 'Tv':
        return <Tv className="w-3.5 h-3.5 text-sky-400" />;
      case 'Cpu':
        return <Cpu className="w-3.5 h-3.5 text-teal-300" />;
      case 'Compass':
        return <Compass className="w-3.5 h-3.5 text-violet-400" />;
      case 'Sliders':
        return <Sliders className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Filter styles based on category tab & search query
  const allStylesWithCat = STYLE_CATEGORIES.flatMap((cat) =>
    cat.styles.map((s) => ({ ...s, categoryId: cat.id, categoryName: cat.name }))
  );

  const filteredStyles = allStylesWithCat.filter((style) => {
    const matchesCategory = selectedCategory === 'all' || style.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      style.name.toLowerCase().includes(q) ||
      style.instruction.toLowerCase().includes(q) ||
      style.tag.toLowerCase().includes(q) ||
      style.categoryName.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-2.5">
      {/* Header with Category Tabs & View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-teal-900/30 border border-teal-700/40 flex items-center justify-center text-teal-400">
            <Wand2 className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-gray-200">
            Style Presets & Directives
          </span>
          <span className="text-[10px] font-mono text-gray-400">
            ({filteredStyles.length} options)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] text-gray-400 hover:text-teal-300 flex items-center gap-1 transition"
          >
            <span>{isExpanded ? 'Minimize Presets' : 'Show Presets'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Controls Bar: Category Pills + Quick Search */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            {/* Category Segmented Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full custom-scrollbar">
              <button
                type="button"
                id="style-cat-tab-all"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-teal-600 text-white font-semibold shadow-sm'
                    : 'bg-[#16161A] text-gray-400 hover:text-gray-200 border border-[#24242A]'
                }`}
              >
                All
              </button>
              {STYLE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  id={`style-cat-tab-${cat.id}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? 'bg-teal-600 text-white font-semibold shadow-sm'
                      : 'bg-[#16161A] text-gray-400 hover:text-gray-200 border border-[#24242A]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Compact Search Bar */}
            <div className="relative flex-1 sm:max-w-[200px] min-w-[140px]">
              <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-2" />
              <input
                id="style-preset-search-input"
                type="text"
                placeholder="Filter styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#16161A] border border-[#26262E] rounded-lg pl-7 pr-2.5 py-1 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-teal-500/60 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1 text-[10px] text-gray-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Clean Style Preset Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar pt-1">
            {filteredStyles.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-gray-500 bg-[#121216] rounded-xl border border-[#222228]">
                No styles found matching &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredStyles.map((style) => {
                const isActive =
                  currentStyle.toLowerCase().trim() === style.instruction.toLowerCase().trim();

                return (
                  <div
                    key={style.id}
                    id={`style-item-${style.id}`}
                    className={`p-2.5 rounded-xl border transition-all duration-150 flex flex-col justify-between text-left group ${
                      isActive
                        ? 'bg-[#161620] border-teal-500/80 ring-1 ring-teal-500/30'
                        : 'bg-[#131318] border-[#22222A] hover:bg-[#181820] hover:border-gray-600/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <div className="p-1 rounded bg-[#1B1B22] shrink-0">
                            {getItemIcon(style.iconName)}
                          </div>
                          <span className="font-semibold text-xs text-gray-200 truncate">
                            {style.name}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1A1A22] text-gray-400 border border-[#282834] shrink-0">
                          {style.tag}
                        </span>
                      </div>

                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed mb-2">
                        {style.instruction}
                      </p>
                    </div>

                    {/* Action buttons: Apply and + Append */}
                    <div className="flex items-center gap-1 pt-1.5 border-t border-[#1F1F26]">
                      <button
                        type="button"
                        onClick={() => onSelectStyle(style.instruction)}
                        className={`flex-1 py-1 px-2 rounded-md text-[10px] font-medium transition flex items-center justify-center gap-1 ${
                          isActive
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            : 'bg-[#1C1C24] hover:bg-teal-600 hover:text-white text-gray-300'
                        }`}
                      >
                        {isActive ? <Check className="w-2.5 h-2.5 text-teal-400" /> : null}
                        <span>{isActive ? 'Active' : 'Apply'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onAppendStyle(style.instruction)}
                        title="Append this style to current prompt"
                        className="py-1 px-2 rounded-md text-[10px] font-medium bg-[#1C1C24] hover:bg-[#262632] text-gray-400 hover:text-gray-200 transition flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
