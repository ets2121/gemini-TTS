'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Database,
  Radio,
  Wand2,
  PlayCircle,
  Save,
  CheckCircle2,
  Cpu,
  Zap,
  Layers,
  Search,
  Filter,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  History as HistoryIcon,
} from 'lucide-react';
import { VOICES, VoiceOption, VoiceCard, clearAllVoicePreviewsCache } from '@/components/VoiceCard';
import { StylePresetPicker } from '@/components/StylePresetPicker';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { AudioPlayerBar } from '@/components/AudioPlayerBar';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { TTSHistoryItem } from '@/lib/db';
import { loadUserPreferences, saveUserPreferences, fetchUserPreferences } from '@/lib/preferences';
import { useToast } from '@/components/ToastManager';


interface ModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  speed: string;
}

const TTS_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.1-flash-tts-preview',
    name: 'Gemini 3.1 Flash Neural TTS',
    badge: 'Expressive Prosody & Emotion',
    description: 'Neural speech synthesis with acting direction & intonation',
    speed: '~180ms',
  },
  {
    id: 'gemini-2.5-flash-preview-tts',
    name: 'Gemini 2.5 Flash TTS',
    badge: 'Fast & Natural Synthesis',
    description: 'High-speed natural vocal synthesis and clear articulation',
    speed: '~120ms',
  },
];

export default function Home() {
  const { showRateLimitToast, showErrorToast, showSuccessToast } = useToast();

  // Main Studio State
  const [text, setText] = useState<string>(
    'Welcome to AI TTS Generator. Type any sentence, customize the vocal style, and generate studio-grade audio saved directly to your local library.'
  );

  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]); // Kore (Female)
  const [voiceStyle, setVoiceStyle] = useState<string>('warm, articulate, confident');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-tts-preview');
  const [pitch, setPitch] = useState<number>(1.0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [downloadFormat, setDownloadFormat] = useState<'mp3' | 'wav'>('mp3');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Voice Persona Filter States
  const [genderFilter, setGenderFilter] = useState<'All' | 'Female' | 'Male' | 'Neutral'>('All');
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>('');

  // Voice Card Audio Preview State
  const [currentlyPlayingVoiceId, setCurrentlyPlayingVoiceId] = useState<string | null>(null);

  // Library / SQLite Drawer State (COLLAPSED BY DEFAULT)
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

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

  // Load Saved Preferences on Mount from backend JSON file & localStorage
  useEffect(() => {
    let isMounted = true;

    async function initPreferences() {
      // 1. Instant local cache
      const localPrefs = loadUserPreferences();
      if (localPrefs && isMounted) {
        if (localPrefs.voiceId) {
          const found = VOICES.find((v) => v.id === localPrefs.voiceId);
          if (found) setSelectedVoice(found);
        }
        if (localPrefs.voiceStyle !== undefined) setVoiceStyle(localPrefs.voiceStyle);
        if (localPrefs.selectedModel) setSelectedModel(localPrefs.selectedModel);
        if (typeof localPrefs.pitch === 'number') setPitch(localPrefs.pitch);
        if (typeof localPrefs.speed === 'number') setSpeed(localPrefs.speed);
        if (typeof localPrefs.autoPlay === 'boolean') setAutoPlay(localPrefs.autoPlay);
        if (localPrefs.downloadFormat) setDownloadFormat(localPrefs.downloadFormat);
        if (localPrefs.lastTextDraft && localPrefs.lastTextDraft.trim()) {
          setText(localPrefs.lastTextDraft);
        }
      }

      // 2. Authoritative persistent fetch from server JSON database
      try {
        const serverPrefs = await fetchUserPreferences();
        if (serverPrefs && isMounted) {
          if (serverPrefs.voiceId) {
            const found = VOICES.find((v) => v.id === serverPrefs.voiceId);
            if (found) setSelectedVoice(found);
          }
          if (serverPrefs.voiceStyle !== undefined) setVoiceStyle(serverPrefs.voiceStyle);
          if (serverPrefs.selectedModel) setSelectedModel(serverPrefs.selectedModel);
          if (typeof serverPrefs.pitch === 'number') setPitch(serverPrefs.pitch);
          if (typeof serverPrefs.speed === 'number') setSpeed(serverPrefs.speed);
          if (typeof serverPrefs.autoPlay === 'boolean') setAutoPlay(serverPrefs.autoPlay);
          if (serverPrefs.downloadFormat) setDownloadFormat(serverPrefs.downloadFormat);
          if (serverPrefs.lastTextDraft && serverPrefs.lastTextDraft.trim()) {
            setText(serverPrefs.lastTextDraft);
          }
        }
      } catch (err) {
        console.warn('Error fetching server preferences:', err);
      } finally {
        if (isMounted) setIsInitialized(true);
      }
    }

    initPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-Save Preferences whenever config changes
  useEffect(() => {
    if (!isInitialized) return;

    const timeoutId = setTimeout(() => {
      saveUserPreferences({
        voiceId: selectedVoice.id,
        voiceStyle,
        selectedModel,
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
  }, [
    selectedVoice.id,
    voiceStyle,
    selectedModel,
    pitch,
    speed,
    autoPlay,
    downloadFormat,
    text,
    isInitialized,
  ]);

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
          model: selectedModel,
          pitch,
          speed,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorText = data.error || 'Failed to synthesize audio with Gemini TTS.';
        if (response.status === 429 || data.code === 'RATE_LIMIT') {
          showRateLimitToast(60, false);
        } else if (response.status === 401 || data.code === 'API_KEY_MISSING' || data.code === 'INVALID_API_KEY') {
          showErrorToast('Gemini API Key Required', errorText);
        } else {
          showErrorToast('Speech Synthesis Error', errorText);
        }
        setErrorMsg(errorText);
        return;
      }

      showSuccessToast(
        'Speech Synthesis Complete',
        `Generated ${data.item.audio_duration}s neural audio with ${selectedVoice.name}.`
      );

      setCurrentAudioItem(data.item);
      setActivePlayingId(data.item.id);
      refreshHistory();
    } catch (err: any) {
      console.error('Generation failure:', err);
      const errMsgText = err?.message || 'Error occurred during speech synthesis.';
      setErrorMsg(errMsgText);
      if (errMsgText.includes('429') || errMsgText.includes('quota') || errMsgText.includes('RESOURCE_EXHAUSTED')) {
        showRateLimitToast(60, false);
      } else {
        showErrorToast('Speech Synthesis Error', errMsgText);
      }
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

  // Reset All Voice Previews
  const [resettingPreviews, setResettingPreviews] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const handleResetAllPreviews = async () => {
    try {
      setResettingPreviews(true);
      clearAllVoicePreviewsCache();
      await fetch('/api/tts/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetAll: true }),
      });
      showSuccessToast(
        'Voice Caches Reset',
        'All voice preview audio caches have been cleared. Ready to generate fresh previews!'
      );
      setResetSuccessMessage('All voice preview caches reset! Click any voice to generate fresh audio.');
      setTimeout(() => setResetSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Reset previews failed:', err);
      showErrorToast('Reset Failed', err?.message || 'Could not reset voice preview caches.');
    } finally {
      setResettingPreviews(false);
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
    if (item.model_name) setSelectedModel(item.model_name);
    const matchedVoice = VOICES.find((v) => v.id === item.voice_name);
    if (matchedVoice) setSelectedVoice(matchedVoice);
  };

  // Append style to current style input
  const handleAppendStyle = (newInstruction: string) => {
    if (!voiceStyle.trim()) {
      setVoiceStyle(newInstruction);
    } else if (!voiceStyle.toLowerCase().includes(newInstruction.toLowerCase())) {
      setVoiceStyle(`${voiceStyle.trim()}, ${newInstruction}`);
    }
  };

  const copyPromptText = () => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  // Filter voices based on gender filter tab and search query
  const filteredVoices = VOICES.filter((v) => {
    const matchesGender = genderFilter === 'All' || v.gender === genderFilter;
    const q = voiceSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.accent.toLowerCase().includes(q) ||
      v.tone.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.tags.some((t) => t.toLowerCase().includes(q));
    return matchesGender && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-[#E2E2E2] flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-teal-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-[#222226] bg-[#0A0A0C]/90 backdrop-blur-md sticky top-0 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-900/30 border border-teal-800/40 p-0.5 shadow-lg shadow-teal-950/40">
            <div className="w-full h-full bg-[#121216] rounded-[10px] flex items-center justify-center">
              <Mic className="w-4 h-4 text-teal-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-[#E2E2E2]">
                AI TTS Generator
              </h1>
              <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-800/80">
                TTS 3.1 & 2.5
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Neural Voice Synthesis • Audio Previews • Style Directives • History Storage
            </p>
          </div>
        </div>

        {/* Header Right: Preferences Indicator & Library Toggle Button */}
        <div className="flex items-center gap-2.5">
          {lastSavedTime && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121216] border border-[#24242A] text-[10px] text-gray-400">
              <CheckCircle2 className="w-3 h-3 text-teal-400" />
              <span>Auto-Saved</span>
            </div>
          )}

          {/* Collapsible SQLite Library Toggle Button */}
          <button
            id="toggle-history-drawer-btn"
            type="button"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition font-medium ${
              isHistoryOpen
                ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-900/30'
                : 'bg-[#141418] hover:bg-[#1A1A20] text-gray-300 border-[#2A2A30] hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>Library History</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                isHistoryOpen
                  ? 'bg-black/30 text-teal-200 border-teal-400/40'
                  : 'bg-[#1A1A20] text-teal-300 border-[#2A2A30]'
              }`}
            >
              {historyStats.totalCount}
            </span>
            {isHistoryOpen ? (
              <PanelRightClose className="w-3.5 h-3.5 opacity-80" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5 opacity-80" />
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout (Full width & fluid responsive) */}
      <div className="relative z-10 flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 transition-all duration-300">
        <div
          className={`grid grid-cols-1 gap-6 items-start transition-all duration-300 ${
            isHistoryOpen ? 'lg:grid-cols-12 xl:grid-cols-12' : 'max-w-6xl mx-auto w-full'
          }`}
        >
          {/* TTS Generation Workstation */}
          <div className={`${isHistoryOpen ? 'lg:col-span-7 xl:col-span-8 2xl:col-span-9' : 'w-full'} min-w-0 space-y-4`}>
            {/* Compact Model Selection (Smaller Cards for Clean View) */}
            <div className="p-3.5 rounded-xl bg-[#121216] border border-[#26262E] shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-teal-400" />
                  <h3 className="text-xs font-semibold text-gray-200">Neural Engine</h3>
                </div>
                <span className="text-[9px] font-mono text-teal-300 bg-[#18181E] px-2 py-0.5 rounded border border-[#282832]">
                  {selectedModel === 'gemini-3.1-flash-tts-preview' ? '3.1 Flash' : '2.5 Flash'}
                </span>
              </div>

              {/* Smaller, sleek side-by-side model cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TTS_MODELS.map((model) => {
                  const isSelected = selectedModel === model.id;

                  return (
                    <div
                      key={model.id}
                      id={`model-select-${model.id}`}
                      onClick={() => setSelectedModel(model.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer text-left transition-all duration-150 flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#161620] border-teal-500/80 ring-1 ring-teal-500/30'
                          : 'bg-[#141418] border-[#222228] hover:bg-[#18181E] hover:border-gray-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-teal-400 bg-teal-500' : 'border-gray-500 bg-transparent'
                          }`}
                        >
                          {isSelected && <div className="w-1 h-1 rounded-full bg-black" />}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-gray-200 truncate">
                              {model.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{model.description}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 border ${
                          isSelected
                            ? 'bg-teal-900/30 text-teal-300 border-teal-700/50'
                            : 'bg-[#1C1C24] text-gray-400 border-[#282834]'
                        }`}
                      >
                        {model.speed}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Text Editor Box */}
            <div className="p-4 rounded-xl bg-[#121216] border border-[#26262E] shadow-lg space-y-2.5">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <label
                  htmlFor="tts-text-input"
                  className="font-semibold text-gray-200 flex items-center gap-1.5 text-xs"
                >
                  <Mic className="w-3.5 h-3.5 text-teal-400" />
                  Text to Speech Script
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyPromptText}
                    className="hover:text-gray-200 flex items-center gap-1 text-[11px] transition text-gray-400"
                    title="Copy text"
                  >
                    {copiedText ? (
                      <Check className="w-3 h-3 text-teal-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
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
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter or paste the text you want the voice model to speak..."
                className="w-full bg-[#18181E] border border-[#26262E] rounded-xl p-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500/40 transition leading-relaxed resize-y font-normal"
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                <div className="flex items-center gap-2.5">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{charCount} chars</span>
                </div>
                <span>Est. duration: ~{Math.max(1, Math.round(wordCount / 2.5))}s</span>
              </div>
            </div>

            {/* Voice Style Input & User-Friendly Category Selector */}
            <div className="p-4 rounded-xl bg-[#121216] border border-[#26262E] shadow-lg space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="voice-style-input"
                  className="text-xs font-semibold text-gray-200 flex items-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5 text-teal-400" />
                  Voice Style & Acting Direction
                </label>
                <p className="text-[11px] text-gray-400">
                  Custom emotion or choose presets below to guide tone, cadence and delivery
                </p>
              </div>

              <input
                id="voice-style-input"
                type="text"
                value={voiceStyle}
                onChange={(e) => setVoiceStyle(e.target.value)}
                placeholder="e.g. warm, articulate, confident speaker..."
                className="w-full bg-[#18181E] border border-[#26262E] rounded-xl px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500/40 transition font-medium"
              />

              {/* Clean Presets Grid */}
              <div className="pt-2 border-t border-[#1F1F26]">
                <StylePresetPicker
                  currentStyle={voiceStyle}
                  onSelectStyle={(presetInstruction) => setVoiceStyle(presetInstruction)}
                  onAppendStyle={handleAppendStyle}
                />
              </div>
            </div>

            {/* Voice Selection Grid with Gender Filter Tabs, Search & Previews */}
            <div className="p-4 rounded-xl bg-[#121216] border border-[#26262E] shadow-lg space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-teal-400" />
                    Select Voice Persona
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {VOICES.length} neural voices with instant preview audio & reset controls
                  </p>
                </div>

                {/* Right controls: Active Voice & Reset Previews Button */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    id="reset-all-previews-btn"
                    onClick={handleResetAllPreviews}
                    disabled={resettingPreviews}
                    title="Clear cached samples and force re-generate all previews"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-gray-400 hover:text-teal-300 bg-[#181820] hover:bg-[#20202A] border border-[#2A2A34] transition"
                  >
                    <RotateCcw className={`w-3 h-3 ${resettingPreviews ? 'animate-spin text-teal-400' : ''}`} />
                    <span>{resettingPreviews ? 'Resetting...' : 'Reset All Previews'}</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-[#18181E] px-2.5 py-1 rounded-lg border border-[#26262E]">
                    <span className="text-[11px] text-gray-300 font-medium">
                      Active: <strong className="text-teal-300">{selectedVoice.name}</strong>
                    </span>
                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded border ${
                        selectedVoice.gender === 'Female'
                          ? 'border-teal-500/40 text-teal-300 bg-teal-500/10'
                          : selectedVoice.gender === 'Male'
                          ? 'border-sky-500/40 text-sky-300 bg-sky-500/10'
                          : 'border-purple-500/40 text-purple-300 bg-purple-500/10'
                      }`}
                    >
                      {selectedVoice.gender === 'Female'
                        ? '♀ Female'
                        : selectedVoice.gender === 'Male'
                        ? '♂ Male'
                        : '⚥ Neutral'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reset Success Message Banner */}
              {resetSuccessMessage && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-950/40 border border-teal-800/60 text-xs text-teal-300 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="text-[11px]">{resetSuccessMessage}</span>
                </div>
              )}

              {/* Filter toolbar: Gender tabs + Search filter */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-[#16161A] p-0.5 rounded-lg border border-[#26262E] text-xs">
                  {(['All', 'Female', 'Male', 'Neutral'] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      id={`filter-gender-${gender.toLowerCase()}`}
                      onClick={() => setGenderFilter(gender)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                        genderFilter === gender
                          ? 'bg-teal-600 text-white font-semibold shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {gender === 'All'
                        ? `All (${VOICES.length})`
                        : gender === 'Female'
                        ? `Female ♀ (6)`
                        : gender === 'Male'
                        ? `Male ♂ (5)`
                        : `Neutral ⚥ (3)`}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
                  <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-2" />
                  <input
                    id="voice-search-input"
                    type="text"
                    placeholder="Filter by name, tone, tag..."
                    value={voiceSearchQuery}
                    onChange={(e) => setVoiceSearchQuery(e.target.value)}
                    className="w-full bg-[#16161A] border border-[#26262E] rounded-lg pl-7 pr-2.5 py-1 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-teal-500/60"
                  />
                </div>
              </div>

              {/* Grid of Voices with Gender Badges & Preview Buttons */}
              <div
                className={`grid gap-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar ${
                  isHistoryOpen
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'
                }`}
              >
                {filteredVoices.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-xs text-gray-500">
                    No voices match &quot;{voiceSearchQuery}&quot;.
                  </div>
                ) : (
                  filteredVoices.map((v) => (
                    <VoiceCard
                      key={v.id}
                      voice={v}
                      isSelected={selectedVoice.id === v.id}
                      onSelect={(selected) => setSelectedVoice(selected)}
                      currentlyPlayingVoiceId={currentlyPlayingVoiceId}
                      onStartPlayPreview={(vId) => setCurrentlyPlayingVoiceId(vId)}
                      onStopPlayPreview={() => setCurrentlyPlayingVoiceId(null)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Vocal Modulation & Pitch/Speed Controls */}
            <div className="p-4 rounded-xl bg-[#121216] border border-[#26262E] shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400" />
                  Vocal Modulation & Playback
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPitch(1.0);
                    setSpeed(1.0);
                    setAutoPlay(true);
                  }}
                  className="text-[10px] text-gray-400 hover:text-gray-200 flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pitch Slider */}
                <div className="space-y-1.5">
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
                  <div className="flex justify-between text-[9px] font-mono text-gray-500">
                    <span>Deeper (0.5x)</span>
                    <span>Normal (1.0x)</span>
                    <span>Higher (1.5x)</span>
                  </div>
                </div>

                {/* Speed Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300 font-medium">Speaking Speed</span>
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
                  <div className="flex justify-between text-[9px] font-mono text-gray-500">
                    <span>Slow (0.5x)</span>
                    <span>Normal (1.0x)</span>
                    <span>Fast (2.0x)</span>
                  </div>
                </div>
              </div>

              {/* Autoplay Toggle */}
              <div className="pt-2 border-t border-[#1F1F26] flex items-center justify-between flex-wrap gap-2">
                <label
                  htmlFor="autoplay-toggle"
                  className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300 hover:text-white"
                >
                  <input
                    id="autoplay-toggle"
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-[#1A1A20] border-[#2A2A30] text-teal-600 accent-teal-500 focus:ring-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <PlayCircle className="w-3 h-3 text-teal-400" />
                    <span>Auto-Play audio on synthesis completion</span>
                  </div>
                </label>

                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                  <Save className="w-3 h-3 text-teal-400" />
                  <span>Preferences auto-saved</span>
                </div>
              </div>
            </div>

            {/* Error Message banner */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-400 hover:text-white text-xs"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                id="generate-tts-submit-btn"
                type="button"
                onClick={handleGenerateSpeech}
                disabled={isGenerating || !text.trim()}
                className="flex-1 py-3 px-6 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-teal-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.99]"
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

            {/* Active Audio Player & Waveform Visualizer */}
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
                colorTheme="cyan"
                autoPlay={autoPlay}
              />
            )}
          </div>

          {/* History Storage & Library (Fixed/Sticky on desktop, only internal content scrolls) */}
          {isHistoryOpen && (
            <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-3 min-w-0 lg:sticky lg:top-20 h-fit max-h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-right-4 duration-200">
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
                onClose={() => setIsHistoryOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
