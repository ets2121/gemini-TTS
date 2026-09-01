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
  ChevronDown,
  ShieldCheck,
  Clock,
  AlertCircle,
  Play,
  Square,
  Loader2,
} from 'lucide-react';
import { VOICES, VoiceOption, clearAllVoicePreviewsCache } from '@/components/VoiceCard';
import { VoiceSelectModal } from '@/components/VoiceSelectModal';
import { StylePresetModal } from '@/components/StylePresetModal';
import { ModelSelectModal } from '@/components/ModelSelectModal';
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
    id: 'gemini-2.5-flash-preview-tts',
    name: 'Gemini 2.5 Flash TTS',
    badge: 'Fast & Natural Synthesis',
    description: 'High-speed natural vocal synthesis and clear articulation',
    speed: '~120ms',
  },
  {
    id: 'gemini-3.1-flash-tts-preview',
    name: 'Gemini 3.1 Flash Neural TTS',
    badge: 'Expressive Prosody & Emotion',
    description: 'Neural speech synthesis with acting direction & intonation',
    speed: '~180ms',
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
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-preview-tts');
  const [pitch, setPitch] = useState<number>(1.0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [downloadFormat, setDownloadFormat] = useState<'mp3' | 'wav'>('mp3');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Modals state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);

  // ── 2 RPM 1-Minute Window State & Live Countdown Engine ─────────────────────
  const [usedCount, setUsedCount] = useState<number>(0);
  const [windowExpiresAt, setWindowExpiresAt] = useState<number>(0);
  const [windowSecondsRemaining, setWindowSecondsRemaining] = useState<number>(0);

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

  // ── Live 1-Minute Countdown Window Ticker ──────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      if (windowExpiresAt > 0) {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((windowExpiresAt - now) / 1000));
        if (diff <= 0) {
          // 1 minute has passed -> auto reset quota to 0 used (2/2 available)
          setUsedCount(0);
          setWindowExpiresAt(0);
          setWindowSecondsRemaining(0);
        } else {
          setWindowSecondsRemaining(diff);
        }
      } else {
        if (usedCount !== 0) setUsedCount(0);
        if (windowSecondsRemaining !== 0) setWindowSecondsRemaining(0);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [windowExpiresAt, usedCount, windowSecondsRemaining]);

  // Called when output is received from server (after generation or preview)
  const recordRpmHit = (serverStatus?: any) => {
    const now = Date.now();
    if (serverStatus && typeof serverStatus.windowSecondsRemaining === 'number') {
      const remainingSec = serverStatus.windowSecondsRemaining;
      setWindowExpiresAt(now + remainingSec * 1000);
      setUsedCount(serverStatus.usedCount || Math.min(2, usedCount + 1));
      setWindowSecondsRemaining(remainingSec);
      return;
    }

    if (usedCount === 0 || now >= windowExpiresAt) {
      // 1st request -> start 60s countdown window!
      setWindowExpiresAt(now + 60000);
      setUsedCount(1);
      setWindowSecondsRemaining(60);
    } else {
      // 2nd request in active window -> limit reached for remaining seconds of this window
      setUsedCount(2);
      const remaining = Math.max(0, Math.ceil((windowExpiresAt - now) / 1000));
      setWindowSecondsRemaining(remaining);
    }
  };

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

  // Load history from JSON file storage
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

  const isBlocked = usedCount >= 2 && windowSecondsRemaining > 0;

  // Handle Speech Generation
  const handleGenerateSpeech = async () => {
    if (!text.trim()) {
      setErrorMsg('Please enter text to synthesize.');
      return;
    }

    if (isBlocked) {
      showErrorToast(
        'Rate Limit Reached',
        `2 generations have already been used in this 1-minute window. Please wait ${windowSecondsRemaining}s before generating.`
      );
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
        if (response.status === 429 || data.code === 'RPM_COOLDOWN' || data.code === 'RATE_LIMIT') {
          if (data.rpmStatus) {
            recordRpmHit(data.rpmStatus);
          } else if (data.retryAfter) {
            setWindowExpiresAt(Date.now() + data.retryAfter * 1000);
            setUsedCount(2);
            setWindowSecondsRemaining(data.retryAfter);
          }
          showRateLimitToast(data.retryAfter || 60, false);
        } else if (response.status === 401 || data.code === 'API_KEY_MISSING' || data.code === 'INVALID_API_KEY') {
          showErrorToast('Gemini API Key Required', errorText);
        } else {
          showErrorToast('Speech Synthesis Error', errorText);
        }
        setErrorMsg(errorText);
        return;
      }

      // Voice output responded successfully! Start/update 1-minute countdown window
      recordRpmHit(data.rpmStatus);

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
      showErrorToast('Speech Synthesis Error', errMsgText);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Favorite
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

  // Delete from History
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

  // Clear all from History
  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all saved audio generations?')) {
      return;
    }
    try {
      const res = await fetch(`/api/tts/history`, {
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

  const copyPromptText = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const currentModelObj =
    TTS_MODELS.find((m) => m.id === selectedModel) || TTS_MODELS[0];
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <main className="min-h-screen bg-[#0A0A0D] text-gray-100 flex flex-col font-sans selection:bg-teal-500 selection:text-black">
      {/* Top Studio Header */}
      <header className="sticky top-0 z-40 bg-[#101015]/90 backdrop-blur-xl border-b border-[#202028] px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center text-black shadow-lg shadow-teal-500/20">
            <Mic className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">AI TTS Generator</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-950/80 text-teal-300 border border-teal-500/30">
                v1.0.5
              </span>
            </div>
            <p className="text-[10px] text-gray-400 hidden sm:block">
              Neural Speech Synthesis Studio • 24kHz Master Audio
            </p>
          </div>
        </div>

        {/* Header Right: Live RPM Window Badge & History Drawer Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Live RPM 1-Minute Window Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border font-medium transition-all ${
              isBlocked
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-300 animate-pulse'
                : usedCount === 1
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                : 'bg-teal-950/30 border-teal-500/40 text-teal-300'
            }`}
            title="Max 2 generations per 1-minute window"
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono text-[11px]">
              {isBlocked
                ? `2/2 Used • Cooldown: ${windowSecondsRemaining}s`
                : usedCount === 1
                ? `1/2 Used • Window: ${windowSecondsRemaining}s`
                : '0/2 Used • 2 Ready'}
            </span>
          </div>

          {/* History Drawer Toggle Button */}
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
            <span className="hidden sm:inline">Library History</span>
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

      {/* Main Workspace Layout */}
      <div className="relative z-10 flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-5 transition-all duration-300">
        <div
          className={`grid grid-cols-1 gap-6 items-start transition-all duration-300 ${
            isHistoryOpen ? 'lg:grid-cols-12 xl:grid-cols-12' : 'max-w-5xl mx-auto w-full'
          }`}
        >
          {/* Main TTS Workstation */}
          <div className={`${isHistoryOpen ? 'lg:col-span-7 xl:col-span-8 2xl:col-span-9' : 'w-full'} min-w-0 space-y-4`}>
            
            {/* Quick Config Selector Bar (3 Clean Action Cards that open dedicated Modals) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Voice Persona Selector Card */}
              <div
                onClick={() => setIsVoiceModalOpen(true)}
                className="group p-3.5 rounded-2xl bg-[#121218] border border-[#242430] hover:border-teal-500/60 hover:bg-[#161620] cursor-pointer transition-all duration-200 shadow-md flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      Voice Persona
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white truncate">
                        {selectedVoice.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                          selectedVoice.gender === 'Female'
                            ? 'bg-pink-500/15 text-pink-300'
                            : selectedVoice.gender === 'Male'
                            ? 'bg-blue-500/15 text-blue-300'
                            : 'bg-purple-500/15 text-purple-300'
                        }`}
                      >
                        {selectedVoice.gender}
                      </span>
                    </div>
                    <span className="text-[10px] text-teal-300/80 truncate block">
                      {selectedVoice.accent}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-teal-300 transition-colors shrink-0 ml-2" />
              </div>

              {/* 2. Vocal Style & Presets Selector Card */}
              <div
                onClick={() => setIsStyleModalOpen(true)}
                className="group p-3.5 rounded-2xl bg-[#121218] border border-[#242430] hover:border-teal-500/60 hover:bg-[#161620] cursor-pointer transition-all duration-200 shadow-md flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      Vocal Style & Direction
                    </span>
                    <span className="font-bold text-sm text-white truncate block">
                      {voiceStyle ? voiceStyle : 'Natural Default'}
                    </span>
                    <span className="text-[10px] text-purple-300/80 truncate block">
                      Click to choose or customize
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-purple-300 transition-colors shrink-0 ml-2" />
              </div>

              {/* 3. Neural Engine Selector Card */}
              <div
                onClick={() => setIsModelModalOpen(true)}
                className="group p-3.5 rounded-2xl bg-[#121218] border border-[#242430] hover:border-teal-500/60 hover:bg-[#161620] cursor-pointer transition-all duration-200 shadow-md flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      Neural Engine
                    </span>
                    <span className="font-bold text-sm text-white truncate block">
                      {currentModelObj.name}
                    </span>
                    <span className="text-[10px] text-amber-300/80 truncate block">
                      {currentModelObj.speed} • 24kHz PCM
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-amber-300 transition-colors shrink-0 ml-2" />
              </div>
            </div>

            {/* Main Script Textarea Box */}
            <div className="p-5 rounded-2xl bg-[#121218] border border-[#242430] shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <label
                  htmlFor="tts-text-input"
                  className="font-bold text-gray-200 flex items-center gap-2 text-xs"
                >
                  <Mic className="w-4 h-4 text-teal-400" />
                  Speech Script Input
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={copyPromptText}
                    className="hover:text-white flex items-center gap-1.5 text-xs text-gray-400 transition"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setText('')}
                    className="hover:text-rose-400 flex items-center gap-1.5 text-xs text-gray-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              <textarea
                id="tts-text-input"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter or paste the text you want the AI voice to speak..."
                className="w-full bg-[#161620] border border-[#2A2A38] rounded-xl p-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500/40 transition leading-relaxed resize-y"
              />

              <div className="flex items-center justify-between text-xs font-mono text-gray-400 pt-1 border-t border-[#1C1C26]">
                <div className="flex items-center gap-3">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{charCount} chars</span>
                </div>
                <span>Est. Duration: ~{Math.max(1, Math.round(wordCount / 2.5))}s</span>
              </div>
            </div>

            {/* Audio Tuning Sliders & Toggles */}
            <div className="p-4 rounded-2xl bg-[#121218] border border-[#242430] shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pitch */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Pitch</span>
                  <span className="font-mono text-teal-300 font-semibold">{pitch.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#20202C] rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              {/* Speed */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Speed</span>
                  <span className="font-mono text-teal-300 font-semibold">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#20202C] rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              {/* Download Format */}
              <div className="space-y-1.5">
                <span className="text-xs text-gray-400 block">Export Format</span>
                <div className="flex items-center gap-1 bg-[#161620] p-1 rounded-xl border border-[#2A2A38]">
                  {(['mp3', 'wav'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setDownloadFormat(fmt)}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                        downloadFormat === fmt
                          ? 'bg-teal-500 text-black shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Play Toggle */}
              <div className="space-y-1.5">
                <span className="text-xs text-gray-400 block">Playback</span>
                <button
                  type="button"
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`w-full py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                    autoPlay
                      ? 'bg-teal-500/10 border-teal-500/40 text-teal-300'
                      : 'bg-[#161620] border-[#2A2A38] text-gray-400'
                  }`}
                >
                  <span>Auto-Play</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      autoPlay ? 'bg-teal-400 shadow-sm shadow-teal-400' : 'bg-gray-600'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Live Error Banner */}
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-3 text-rose-200 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <strong className="block font-bold mb-0.5">Synthesis Alert</strong>
                  <p className="leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Generate Action Area with Live 1-Minute Window Countdown Timer */}
            <div className="space-y-2.5">
              <button
                type="button"
                id="generate-speech-btn"
                onClick={handleGenerateSpeech}
                disabled={isGenerating || isBlocked || !text.trim()}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 shadow-xl flex items-center justify-center gap-2.5 ${
                  isBlocked
                    ? 'bg-rose-900/30 border border-rose-500/40 text-rose-300 cursor-not-allowed shadow-none'
                    : isGenerating || !text.trim()
                    ? 'bg-[#1A1A24] border border-[#2A2A38] text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 text-black hover:opacity-95 hover:shadow-teal-500/25 active:scale-[0.99] border border-teal-400'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Synthesizing Neural Speech...</span>
                  </>
                ) : isBlocked ? (
                  <>
                    <Clock className="w-5 h-5 animate-spin text-rose-400" />
                    <span>Rate Limit Reached: Cooldown {windowSecondsRemaining}s remaining (2/2 Used)</span>
                  </>
                ) : usedCount === 1 ? (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Neural Speech ({selectedVoice.name}) • 1 slot left ({windowSecondsRemaining}s)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate Neural Speech ({selectedVoice.name})</span>
                  </>
                )}
              </button>

              {/* Animated Window Progress Bar (Active whenever 1st or 2nd request is made) */}
              {windowSecondsRemaining > 0 && (
                <div className="w-full bg-[#181822] rounded-full h-2 overflow-hidden border border-[#282838]">
                  <div
                    className={`h-full transition-all duration-300 ease-linear rounded-full ${
                      isBlocked
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500 animate-pulse'
                        : 'bg-gradient-to-r from-teal-500 to-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, (windowSecondsRemaining / 60) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Audio Player Bar */}
            {currentAudioItem && (
              <div className="pt-2 animate-fadeIn">
                <AudioPlayerBar
                  audioBase64={currentAudioItem.audio_base64}
                  mimeType={currentAudioItem.audio_mime_type}
                  duration={currentAudioItem.audio_duration}
                  fileSizeBytes={currentAudioItem.file_size_bytes}
                  text={currentAudioItem.text}
                  voiceName={currentAudioItem.voice_name}
                  voiceStyle={currentAudioItem.voice_style}
                  isFavorite={currentAudioItem.is_favorite === 1}
                  autoPlay={autoPlay}
                  onToggleFavorite={() => handleToggleFavorite(currentAudioItem.id)}
                />
              </div>
            )}
          </div>

          {/* Sticky Library History Drawer (Right Column on Desktop) */}
          {isHistoryOpen && (
            <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-3 lg:sticky lg:top-20 transition-all duration-300">
              <HistoryDrawer
                items={historyItems}
                stats={historyStats}
                isLoading={historyLoading}
                activePlayingId={activePlayingId}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                isFavoriteFilter={isFavoriteFilter}
                onFavoriteFilterChange={setIsFavoriteFilter}
                selectedVoiceFilter={selectedVoiceFilter}
                onVoiceFilterChange={setSelectedVoiceFilter}
                onPlayItem={(item) => {
                  setCurrentAudioItem(item);
                  setActivePlayingId(item.id);
                }}
                onLoadIntoEditor={(item) => {
                  setText(item.text);
                  const v = VOICES.find((vox) => vox.id === item.voice_name);
                  if (v) setSelectedVoice(v);
                  if (item.voice_style) setVoiceStyle(item.voice_style);
                  if (item.model_name) setSelectedModel(item.model_name);
                  setPitch(item.pitch);
                  setSpeed(item.speed);
                }}
                onToggleFavorite={handleToggleFavorite}
                onDeleteItem={handleDeleteItem}
                onClearAll={handleClearAll}
                onClose={() => setIsHistoryOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Modals */}
      <VoiceSelectModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedVoice={selectedVoice}
        onSelectVoice={setSelectedVoice}
        currentlyPlayingVoiceId={currentlyPlayingVoiceId}
        onStartPlayPreview={setCurrentlyPlayingVoiceId}
        onStopPlayPreview={() => setCurrentlyPlayingVoiceId(null)}
        isRpmCoolingDown={isBlocked}
        secondsRemaining={windowSecondsRemaining}
        onRecordRpmHit={recordRpmHit}
      />

      <StylePresetModal
        isOpen={isStyleModalOpen}
        onClose={() => setIsStyleModalOpen(false)}
        currentStyle={voiceStyle}
        onSelectStyle={setVoiceStyle}
      />

      <ModelSelectModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
      />
    </main>
  );
}
