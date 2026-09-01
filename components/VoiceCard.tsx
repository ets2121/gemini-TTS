'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Sparkles,
  Flame,
  Moon,
  Shield,
  Radio,
  Wand2,
  Music,
  Sun,
  Smile,
  BookOpen,
  GraduationCap,
  Megaphone,
  Bot,
  Compass,
  Play,
  Square,
  Loader2,
  Volume2,
  CheckCircle2,
} from 'lucide-react';

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
  // Female Voices
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
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Female',
    accent: 'Soft Soothing',
    tone: 'Velvety, peaceful, mindful',
    description: 'Designed for meditations, sleep stories, and calm guidance.',
    tags: ['Meditation', 'ASMR', 'Relaxation'],
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
  {
    id: 'Leda',
    name: 'Leda',
    gender: 'Female',
    accent: 'Elegant Refined',
    tone: 'Sophisticated, smooth, poised',
    description: 'Ideal for documentaries, luxury brands, and premium narration.',
    tags: ['Documentaries', 'Luxury', 'Narration'],
  },
  {
    id: 'Mimosa',
    name: 'Mimosa',
    gender: 'Female',
    accent: 'Bright Cheerful',
    tone: 'Friendly, warm, inviting, sunny',
    description: 'Great for promos, welcoming announcements, and commercials.',
    tags: ['Promos', 'Commercials', 'Upbeat'],
  },
  {
    id: 'Thalia',
    name: 'Thalia',
    gender: 'Female',
    accent: 'Playful Witty',
    tone: 'Dynamic, lively, expressive humor',
    description: 'Fantastic for interactive dialogues, games, and creative stories.',
    tags: ['Dialogues', 'Gaming', 'Entertainment'],
  },

  // Male Voices
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
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    accent: 'Crisp Strong',
    tone: 'Commanding, sharp, articulate',
    description: 'Excellent for educational lectures, business news, and guides.',
    tags: ['Corporate', 'Lectures', 'News'],
  },
  {
    id: 'Orpheus',
    name: 'Orpheus',
    gender: 'Male',
    accent: 'Rich Baritone',
    tone: 'Emotional, warm, captivating storytelling',
    description: 'Rich cadence crafted for long-form audiobooks and histories.',
    tags: ['Audiobooks', 'History', 'Narrative'],
  },
  {
    id: 'Chiron',
    name: 'Chiron',
    gender: 'Male',
    accent: 'Wise Academic',
    tone: 'Gentle, measured, professorial clarity',
    description: 'Designed for technical explainers, tutorials, and deep dives.',
    tags: ['Educational', 'Tutorials', 'Explainers'],
  },
  {
    id: 'Jupiter',
    name: 'Jupiter',
    gender: 'Male',
    accent: 'Powerful Announcer',
    tone: 'Resonant, booming, broadcast-ready',
    description: 'Unmistakable presence for sports events, alerts, and promos.',
    tags: ['Sports', 'Events', 'Broadcasting'],
  },

  // Neutral / Dynamic Voices
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
    id: 'Echo',
    name: 'Echo',
    gender: 'Neutral',
    accent: 'Clean Synthetic',
    tone: 'Balanced, modern AI, seamless clarity',
    description: 'Tailored for conversational AI agents and interactive voice bots.',
    tags: ['AI Agents', 'Virtual Assistants', 'Tech'],
  },
  {
    id: 'Callisto',
    name: 'Callisto',
    gender: 'Neutral',
    accent: 'Smooth Ambient',
    tone: 'Atmospheric, calm, futuristic precision',
    description: 'Suited for sci-fi, audio guide walking tours, and exhibitions.',
    tags: ['Sci-Fi', 'Audio Guides', 'Exhibits'],
  },
];

// Global in-memory cache for ultra-fast zero latency preview replays
const PREVIEW_AUDIO_CACHE = new Map<string, string>();

interface VoiceCardProps {
  voice: VoiceOption;
  isSelected: boolean;
  onSelect: (voice: VoiceOption) => void;
  currentlyPlayingVoiceId: string | null;
  onStartPlayPreview: (voiceId: string) => void;
  onStopPlayPreview: () => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isSelected,
  onSelect,
  currentlyPlayingVoiceId,
  onStartPlayPreview,
  onStopPlayPreview,
}) => {
  const [isCached, setIsCached] = useState<boolean>(() => PREVIEW_AUDIO_CACHE.has(voice.id));
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isPlayingThis = currentlyPlayingVoiceId === voice.id;

  // Check if preview audio is already cached in memory or localStorage
  useEffect(() => {
    if (PREVIEW_AUDIO_CACHE.has(voice.id)) {
      return;
    }

    const timer = setTimeout(() => {
      try {
        const cached = localStorage.getItem(`speechcraft_preview_${voice.id}`);
        if (cached) {
          PREVIEW_AUDIO_CACHE.set(voice.id, cached);
          setIsCached(true);
        }
      } catch {
        // Ignore storage errors
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [voice.id]);

  // Clean up audio on unmount or when another voice starts playing
  useEffect(() => {
    if (!isPlayingThis && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isPlayingThis]);

  const handleTogglePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlayingThis) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      onStopPlayPreview();
      return;
    }

    try {
      let audioBase64 = PREVIEW_AUDIO_CACHE.get(voice.id) || '';

      if (!audioBase64) {
        try {
          audioBase64 = localStorage.getItem(`speechcraft_preview_${voice.id}`) || '';
        } catch {
          // fallback
        }
      }

      if (!audioBase64) {
        // Fetch preview from server
        setIsLoadingPreview(true);
        const res = await fetch('/api/tts/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceName: voice.id }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to get preview');
        }

        audioBase64 = data.audioBase64;
        PREVIEW_AUDIO_CACHE.set(voice.id, audioBase64);
        setIsCached(true);

        try {
          localStorage.setItem(`speechcraft_preview_${voice.id}`, audioBase64);
        } catch (storageErr) {
          console.warn('Storage quota full or disabled for preview cache:', storageErr);
        }
      }

      setIsLoadingPreview(false);

      if (audioBase64) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = `data:audio/wav;base64,${audioBase64}`;
        audioRef.current.onended = () => {
          onStopPlayPreview();
        };
        audioRef.current.onerror = () => {
          onStopPlayPreview();
        };

        onStartPlayPreview(voice.id);
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Preview play prevented:', err);
            onStopPlayPreview();
          });
        }
      }
    } catch (err) {
      console.error('Preview playback failure:', err);
      setIsLoadingPreview(false);
      onStopPlayPreview();
    }
  };

  const getVoiceIcon = () => {
    switch (voice.id) {
      case 'Charon':
        return <Shield className="w-4 h-4 text-amber-400" />;
      case 'Kore':
        return <Sparkles className="w-4 h-4 text-teal-400" />;
      case 'Puck':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Zephyr':
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'Fenrir':
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case 'Aoede':
        return <Wand2 className="w-4 h-4 text-pink-400" />;
      case 'Leda':
        return <Music className="w-4 h-4 text-purple-400" />;
      case 'Mimosa':
        return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'Thalia':
        return <Smile className="w-4 h-4 text-rose-400" />;
      case 'Orpheus':
        return <BookOpen className="w-4 h-4 text-amber-500" />;
      case 'Chiron':
        return <GraduationCap className="w-4 h-4 text-teal-400" />;
      case 'Jupiter':
        return <Megaphone className="w-4 h-4 text-red-400" />;
      case 'Echo':
        return <Bot className="w-4 h-4 text-sky-400" />;
      case 'Callisto':
        return <Compass className="w-4 h-4 text-violet-400" />;
      default:
        return <User className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <div
      id={`voice-card-${voice.id.toLowerCase()}`}
      onClick={() => onSelect(voice)}
      className={`group relative p-3 rounded-xl transition-all duration-200 cursor-pointer border text-left flex flex-col justify-between ${
        isSelected
          ? 'bg-[#16161C] border-teal-500/80 ring-1 ring-teal-500/40 shadow-lg shadow-teal-950/40'
          : 'bg-[#121216] border-[#26262E] hover:bg-[#16161A] hover:border-gray-600/50'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className={`p-1.5 rounded-lg ${
              isSelected
                ? 'bg-[#1A1A22] text-teal-400'
                : 'bg-[#18181E] text-gray-400 group-hover:bg-[#1A1A22]'
            }`}
          >
            {getVoiceIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 truncate">
                <h4 className="font-semibold text-[#E2E2E2] text-xs tracking-tight truncate">
                  {voice.name}
                </h4>
                {/* Prominent Gender Label */}
                <span
                  id={`voice-gender-${voice.id.toLowerCase()}`}
                  className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border flex items-center gap-0.5 shrink-0 ${
                    voice.gender === 'Female'
                      ? 'border-teal-500/40 text-teal-300 bg-teal-500/10'
                      : voice.gender === 'Male'
                      ? 'border-sky-500/40 text-sky-300 bg-sky-500/10'
                      : 'border-purple-500/40 text-purple-300 bg-purple-500/10'
                  }`}
                  title={`Gender: ${voice.gender}`}
                >
                  <span>{voice.gender === 'Female' ? '♀' : voice.gender === 'Male' ? '♂' : '⚥'}</span>
                  <span>{voice.gender}</span>
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 font-medium truncate">{voice.accent}</p>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 line-clamp-2 mb-2 leading-relaxed">
          {voice.description}
        </p>
      </div>

      {/* Footer bar with Tags & Preview Button */}
      <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#222228]">
        <div className="flex items-center gap-1 truncate max-w-[50%]">
          {voice.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[9px] text-gray-400 bg-[#1A1A20] px-1.5 py-0.2 rounded border border-[#2A2A30] truncate"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Preview Voice Button with Live Pulse indicator */}
        <button
          type="button"
          id={`voice-preview-btn-${voice.id.toLowerCase()}`}
          onClick={handleTogglePreview}
          disabled={isLoadingPreview}
          title={
            isPlayingThis
              ? 'Click to stop preview'
              : isCached
              ? 'Play saved preview (Cached • Instant)'
              : 'Generate & listen to voice sample'
          }
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
            isPlayingThis
              ? 'bg-teal-500 text-black font-bold shadow-md shadow-teal-500/40 ring-1 ring-teal-300 animate-pulse'
              : isCached
              ? 'bg-[#181820] hover:bg-[#22222E] text-teal-300 border border-teal-800/50 hover:border-teal-500/60'
              : 'bg-[#1A1A22] hover:bg-[#22222C] text-gray-300 border border-[#2C2C38] hover:text-white'
          }`}
        >
          {isLoadingPreview ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
              <span>Loading...</span>
            </>
          ) : isPlayingThis ? (
            <>
              <Square className="w-2.5 h-2.5 fill-black text-black" />
              <span>Playing...</span>
              <span className="flex items-center gap-0.5 ml-0.5">
                <span className="w-1 h-2 bg-black rounded-full animate-bounce"></span>
                <span className="w-1 h-3 bg-black rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-1 h-2 bg-black rounded-full animate-bounce [animation-delay:0.3s]"></span>
              </span>
            </>
          ) : (
            <>
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Preview</span>
              {isCached && (
                <span className="text-[7px] font-mono text-teal-400 ml-0.5 opacity-90" title="Ready in cache">
                  ●
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

