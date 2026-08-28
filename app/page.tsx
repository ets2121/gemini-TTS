'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  Sparkles,
  Play,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Download,
  Database,
  Layers,
  Wand2,
  FileText,
  Radio,
  SlidersHorizontal,
  RefreshCw,
  Flame,
  Moon,
  Info,
  PlayCircle,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { VOICES, VoiceOption, VoiceCard } from '@/components/VoiceCard';
import { StylePresetPicker } from '@/components/StylePresetPicker';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { AudioPlayerBar } from '@/components/AudioPlayerBar';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { TTSHistoryItem } from '@/lib/db';
import { loadUserPreferences, saveUserPreferences, TTSUserPreferences } from '@/lib/preferences';

const SAMPLE_SCRIPTS = [
  {
    title: '🚀 Tech Keynote',
    style: 'excited tech keynote speaker with high energy',
    voice: 'Puck',
    text: 'Good morning everyone! Today, we are unveiling a breakthrough in neural acoustics that changes the way humans and computers communicate forever.',
  },
  {
    title: '🌙 Zen Meditation',
    style: 'soft, slow, calm, soothing mindfulness guide',
    voice: 'Zephyr',
    text: 'Take a slow, deep breath in through your nose. Hold it gently for three seconds, and let it go completely as your body settles into stillness.',
  },
  {
    title: '🎬 Movie Trailer',
    style: 'deep, cinematic, dramatic, epic baritone with suspense',
    voice: 'Charon',
    text: 'In a world where silence meant survival, one voice dared to echo across the forgotten frontier. This summer, discover the untold beginning.',
  },
  {
    title: '📰 News Bulletin',
    style: 'clear, professional, authoritative news broadcast',
    voice: 'Fenrir',
    text: 'This is the global evening report. International climate delegates have reached a historic consensus today in Geneva regarding clean energy grid infrastructure.',
  },
  {
    title: '📖 Fantasy Story',
    style: 'theatrical, whimsical, immersive audiobook narrator',
    voice: 'Aoede',
    text: 'Beneath the ancient whispering canopy of Eldenwood, silver lanterns flickered to life as the starlight touched the crystal river.',
  },
  {
    title: '✨ Welcome Greeting',
    style: 'warm, articulate, friendly, clear customer concierge',
    voice: 'Kore',
    text: 'Welcome to SpeechCraft Studio. Type any sentence, customize the vocal style, and generate studio-grade audio saved directly to your SQLite database.',
  },
];

export default function Home() {
  // Deterministic initial state for server and client hydration
  const [text, setText] = useState<string>(
    'Welcome to SpeechCraft Studio. Type any sentence, customize the vocal style, and generate studio-grade audio saved directly to your SQLite database.'
  );
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]); // Kore
  const [voiceStyle, setVoiceStyle] = useState<string>('warm, articulate, confident');
  const [pitch, setPitch] = useState<number>(1.0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [downloadFormat, setDownloadFormat] = useState<'mp3' | 'wav'>('mp3');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Loading & Generation State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentAudioItem, setCurrentAudioItem] = useState<TTSHistoryItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SQLite History State
  const [historyItems, setHistoryItems] = useState<TTSHistoryItem[]>([]);
  const [historyStats, setHistoryStats] = useState({
    totalCount: 0,
    favoriteCount: 0,
    totalDurationSeconds: 0,
    totalBytes: 0,
  });
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFavoriteFilter, setIsFavoriteFilter] = useState<boolean>(false);
  const [selectedVoiceFilter, setSelectedVoiceFilter] = useState<string>('all');
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // UI state
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [colorTheme, setColorTheme] = useState<'cyan' | 'purple' | 'emerald'>('cyan');

  // Load Saved Preferences on Mount after hydration
  useEffect(() => {
    const timer = setTimeout(() => {
      const prefs = loadUserPreferences();
      if (prefs) {
        if (prefs.voiceId) {
          const found = VOICES.find((v) => v.id === prefs.voiceId);
          if (found) setSelectedVoice(found);
        }
        if (prefs.voiceStyle !== undefined) setVoiceStyle(prefs.voiceStyle);
        if (typeof prefs.pitch === 'number') setPitch(prefs.pitch);
        if (typeof prefs.speed === 'number') setSpeed(prefs.speed);
        if (typeof prefs.autoPlay === 'boolean') setAutoPlay(prefs.autoPlay);
        if (prefs.downloadFormat) setDownloadFormat(prefs.downloadFormat);
        if (prefs.lastTextDraft && prefs.lastTextDraft.trim()) {
          setText(prefs.lastTextDraft);
        }
      }
      setIsInitialized(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Auto-Save Preferences whenever config changes (after initial mount hydration)
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      saveUserPreferences({
        voiceId: selectedVoice.id,
        voiceStyle,
        pitch,
        speed,
        autoPlay,
        downloadFormat,
        lastTextDraft: text,
      });
      const now = new Date();
      setLastSavedTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [selectedVoice.id, voiceStyle, pitch, speed, autoPlay, downloadFormat, text, isInitialized]);

  // Load history from SQLite
  useEffect(() => {
    let isCancelled = false;

    const loadHistory = async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.set('search', searchTerm);
        if (isFavoriteFilter) params.set('favoriteOnly', 'true');
        if (selectedVoiceFilter && selectedVoiceFilter !== 'all') {
          params.set('voiceName', selectedVoiceFilter);
        }

        const res = await fetch(`/api/tts/history?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        if (!isCancelled) {
          setHistoryItems(data.items || []);
          if (data.stats) {
            setHistoryStats(data.stats);
          }
          setHistoryLoading(false);
        }
      } catch (err) {
        console.error('History load error:', err);
        if (!isCancelled) setHistoryLoading(false);
      }
    };

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [searchTerm, isFavoriteFilter, selectedVoiceFilter]);

  const refreshHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (isFavoriteFilter) params.set('favoriteOnly', 'true');
      if (selectedVoiceFilter && selectedVoiceFilter !== 'all') {
        params.set('voiceName', selectedVoiceFilter);
      }
      const res = await fetch(`/api/tts/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.items || []);
        if (data.stats) setHistoryStats(data.stats);
      }
    } catch (err) {
      console.error('Refresh history error:', err);
    }
  };

  // Handle Speech Generation
  const handleGenerateSpeech = async () => {
    if (!text.trim()) {
      setErrorMsg('Please enter text to synthesize.');
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceName: selectedVoice.id,
          voiceGender: selectedVoice.gender,
          voiceStyle: voiceStyle.trim(),
          pitch,
          speed,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize audio');
      }

      setCurrentAudioItem(data.item);
      setActivePlayingId(data.item.id);
      // Refresh SQLite database history
      refreshHistory();
    } catch (err: any) {
      console.error('Generation failure:', err);
      setErrorMsg(err.message || 'Error occurred during speech synthesis.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Favorite in SQLite
  const handleToggleFavorite = async (id?: string) => {
    const targetId = id || currentAudioItem?.id;
    if (!targetId) return;

    try {
      const res = await fetch('/api/tts/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleFavorite', id: targetId }),
      });
      const data = await res.json();
      if (data.success) {
        if (currentAudioItem && currentAudioItem.id === targetId) {
          setCurrentAudioItem({
            ...currentAudioItem,
            is_favorite: data.isFavorite ? 1 : 0,
          });
        }
        refreshHistory();
      }
    } catch (err) {
      console.error('Toggle favorite error:', err);
    }
  };

  // Delete from SQLite
  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/tts/history?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (currentAudioItem?.id === id) {
          setCurrentAudioItem(null);
        }
        refreshHistory();
      }
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };

  // Clear all from SQLite
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all saved audio generations from SQLite?')) {
      return;
    }
    try {
      const res = await fetch('/api/tts/history', {
        method: 'DELETE',
      });
      if (res.ok) {
        setCurrentAudioItem(null);
        refreshHistory();
      }
    } catch (err) {
      console.error('Clear history error:', err);
    }
  };

  // Play a history item in active player
  const handlePlayHistoryItem = (item: TTSHistoryItem) => {
    setCurrentAudioItem(item);
    setActivePlayingId(item.id);
  };

  // Load a history item into the editor
  const handleLoadIntoEditor = (item: TTSHistoryItem) => {
    setText(item.text);
    if (item.voice_style) setVoiceStyle(item.voice_style);
    if (item.pitch) setPitch(item.pitch);
    if (item.speed) setSpeed(item.speed);
    const matchedVoice = VOICES.find((v) => v.id === item.voice_name);
    if (matchedVoice) setSelectedVoice(matchedVoice);
  };

  // Load Sample Template
  const loadSample = (sample: (typeof SAMPLE_SCRIPTS)[0]) => {
    setText(sample.text);
    setVoiceStyle(sample.style);
    const v = VOICES.find((voice) => voice.id === sample.voice);
    if (v) setSelectedVoice(v);
  };

  const copyPromptText = () => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-[#E2E2E2] flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-teal-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-[#222226] bg-[#0A0A0C]/90 backdrop-blur-md sticky top-0 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-900/30 border border-teal-800/40 p-0.5 shadow-lg shadow-teal-950/40">
            <div className="w-full h-full bg-[#121216] rounded-[10px] flex items-center justify-center">
              <Mic className="w-5 h-5 text-teal-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-[#E2E2E2]">
                SpeechCraft Studio
              </h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-800/80">
                TTS & MP3
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Neural Voice Synthesis • MP3 & WAV Export • SQLite Persistence
            </p>
          </div>
        </div>

        {/* Status badges & Preferences indicator */}
        <div className="flex items-center gap-3">
          {lastSavedTime && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121216] border border-[#2A2A30] text-[11px] text-gray-400">
              <CheckCircle2 className="w-3 h-3 text-teal-400" />
              <span>Preferences Auto-Saved</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121216] border border-[#2A2A30] text-xs text-gray-300 font-mono">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>SQLite:</span>
            <span className="text-teal-300 font-bold">{historyStats.totalCount} items</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: TTS Generation Workstation (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Sample Scripts Carousel */}
          <div className="p-4 rounded-2xl bg-[#121216] border border-[#2A2A30] space-y-2.5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5 font-medium text-gray-300">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                Quick Script Templates
              </span>
              <span className="text-[11px] text-gray-500">1-click populate</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {SAMPLE_SCRIPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`sample-script-${idx}`}
                  onClick={() => loadSample(sample)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-[#1A1A20] hover:bg-[#222228] border border-[#2A2A30] hover:border-gray-600 text-xs text-gray-300 transition text-left"
                >
                  <div className="font-medium text-gray-200">{sample.title}</div>
                  <div className="text-[10px] text-gray-500 font-mono">Voice: {sample.voice}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Text Editor Box */}
          <div className="p-5 rounded-2xl bg-[#121216] border border-[#2A2A30] shadow-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <label htmlFor="tts-text-input" className="font-semibold text-gray-200 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-teal-400" />
                Text to Speech Input
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyPromptText}
                  className="hover:text-gray-200 flex items-center gap-1 text-[11px] transition text-gray-400"
                  title="Copy text"
                >
                  {copiedText ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="hover:text-rose-400 flex items-center gap-1 text-[11px] transition text-gray-400"
                  title="Clear input"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <textarea
              id="tts-text-input"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter or paste the text you want the voice model to speak..."
              className="w-full bg-[#1A1A20] border border-[#2A2A30] rounded-xl p-3.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500/40 transition leading-relaxed resize-y font-normal"
            />

            <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 pt-1">
              <div className="flex items-center gap-3">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} characters</span>
              </div>
              <span>Estimated duration: ~{Math.max(1, Math.round(wordCount / 2.5))}s</span>
            </div>
          </div>

          {/* Voice Style Input & Preset Chips */}
          <div className="p-5 rounded-2xl bg-[#121216] border border-[#2A2A30] shadow-xl space-y-3.5">
            <div className="space-y-1">
              <label htmlFor="voice-style-input" className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-teal-400" />
                Voice Style & Acting Direction
              </label>
              <p className="text-[11px] text-gray-400">
                Specify mood, emotion, accent pacing, or acting direction (e.g. whispering softly, excited keynote, cheerful narration)
              </p>
            </div>

            <input
              id="voice-style-input"
              type="text"
              value={voiceStyle}
              onChange={(e) => setVoiceStyle(e.target.value)}
              placeholder="e.g. whispering in a gentle mysterious tone, excited podcast host..."
              className="w-full bg-[#1A1A20] border border-[#2A2A30] rounded-xl px-3.5 py-2.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500/40 transition font-medium"
            />

            {/* Quick preset chips */}
            <StylePresetPicker
              currentStyle={voiceStyle}
              onSelectStyle={(presetInstruction) => setVoiceStyle(presetInstruction)}
            />
          </div>

          {/* Voice Selection Grid */}
          <div className="p-5 rounded-2xl bg-[#121216] border border-[#2A2A30] shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-teal-400" />
                  Select Voice Persona
                </h3>
                <p className="text-[11px] text-gray-400">
                  Select from prebuilt high-fidelity vocal profiles
                </p>
              </div>
              <span className="text-[11px] font-mono text-teal-300 bg-[#1A1A20] px-2.5 py-0.5 rounded-full border border-[#2A2A30]">
                Selected: {selectedVoice.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {VOICES.map((v) => (
                <VoiceCard
                  key={v.id}
                  voice={v}
                  isSelected={selectedVoice.id === v.id}
                  onSelect={(selected) => setSelectedVoice(selected)}
                />
              ))}
            </div>
          </div>

          {/* Fine Tuning Controls (Pitch, Speed, Autoplay, Config) */}
          <div className="p-5 rounded-2xl bg-[#121216] border border-[#2A2A30] shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-teal-400" />
                Vocal Modulation & Playback Preferences
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPitch(1.0);
                  setSpeed(1.0);
                  setAutoPlay(true);
                }}
                className="text-[11px] text-gray-400 hover:text-gray-200 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Pitch Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">Pitch Modulation</span>
                  <span className="font-mono text-teal-400">{pitch.toFixed(2)}x</span>
                </div>
                <input
                  id="pitch-slider"
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#1A1A20] rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>Deeper (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Higher (1.5x)</span>
                </div>
              </div>

              {/* Speed Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-medium">Speaking Rate / Speed</span>
                  <span className="font-mono text-teal-400">{speed.toFixed(2)}x</span>
                </div>
                <input
                  id="speed-slider"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#1A1A20] rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>Slow (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Fast (2.0x)</span>
                </div>
              </div>
            </div>

            {/* Autoplay & Auto-Save Preference Toggles */}
            <div className="pt-3 border-t border-[#222226] flex items-center justify-between flex-wrap gap-3">
              <label
                htmlFor="autoplay-toggle"
                className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300 hover:text-white"
              >
                <input
                  id="autoplay-toggle"
                  type="checkbox"
                  checked={autoPlay}
                  onChange={(e) => setAutoPlay(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1A1A20] border-[#2A2A30] text-teal-600 accent-teal-500 focus:ring-0 cursor-pointer"
                />
                <div className="flex items-center gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-medium">Auto-Play upon generation completion</span>
                </div>
              </label>

              <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
                <Save className="w-3 h-3 text-teal-400" />
                <span>Auto-save preferences active</span>
              </div>
            </div>
          </div>

          {/* Error Message banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="flex items-center gap-3">
            <button
              id="generate-tts-submit-btn"
              type="button"
              onClick={handleGenerateSpeech}
              disabled={isGenerating || !text.trim()}
              className="flex-1 py-3.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition shadow-xl shadow-teal-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Synthesizing Audio Stream...' : 'Synthesize Speech'}</span>
            </button>
          </div>

          {/* Progress Loading Component */}
          <ProgressIndicator
            isLoading={isGenerating}
            voiceName={selectedVoice.name}
            voiceStyle={voiceStyle}
          />

          {/* Active Audio Player & Waveform Visualizer with Autoplay and MP3 Download */}
          {currentAudioItem && (
            <AudioPlayerBar
              audioBase64={currentAudioItem.audio_base64}
              mimeType={currentAudioItem.audio_mime_type}
              duration={currentAudioItem.audio_duration}
              fileSizeBytes={currentAudioItem.file_size_bytes}
              text={currentAudioItem.text}
              voiceName={currentAudioItem.voice_name}
              voiceStyle={currentAudioItem.voice_style}
              isFavorite={currentAudioItem.is_favorite === 1}
              onToggleFavorite={() => handleToggleFavorite(currentAudioItem.id)}
              colorTheme={colorTheme}
              autoPlay={autoPlay}
            />
          )}
        </div>

        {/* Right Column: SQLite Database Storage & Library (4 cols on lg) */}
        <div className="lg:col-span-4 h-full">
          <HistoryDrawer
            items={historyItems}
            stats={historyStats}
            isLoading={historyLoading}
            activePlayingId={activePlayingId}
            onPlayItem={handlePlayHistoryItem}
            onToggleFavorite={handleToggleFavorite}
            onDeleteItem={handleDeleteItem}
            onClearAll={handleClearAll}
            onLoadIntoEditor={handleLoadIntoEditor}
            onSearchChange={setSearchTerm}
            onFavoriteFilterChange={setIsFavoriteFilter}
            onVoiceFilterChange={setSelectedVoiceFilter}
            selectedVoiceFilter={selectedVoiceFilter}
            isFavoriteFilter={isFavoriteFilter}
            searchTerm={searchTerm}
          />
        </div>
      </div>
    </main>
  );
}
