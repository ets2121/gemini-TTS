'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  Search,
  Star,
  Trash2,
  Download,
  Play,
  Pause,
  Copy,
  Check,
  RotateCcw,
  Clock,
  HardDrive,
  Filter,
  FileJson,
  Layers,
  X,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { TTSHistoryItem } from '@/lib/db';
import { base64WavToMp3Blob } from '@/lib/audio-converter';

interface HistoryDrawerProps {
  items: TTSHistoryItem[];
  stats: {
    totalCount: number;
    favoriteCount: number;
    totalDurationSeconds: number;
    totalBytes: number;
  };
  isLoading: boolean;
  activePlayingId: string | null;
  onPlayItem: (item: TTSHistoryItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onLoadIntoEditor: (item: TTSHistoryItem) => void;
  onSearchChange: (search: string) => void;
  onFavoriteFilterChange: (favOnly: boolean) => void;
  onVoiceFilterChange: (voice: string) => void;
  selectedVoiceFilter: string;
  isFavoriteFilter: boolean;
  searchTerm: string;
  onClose?: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  items,
  stats,
  isLoading,
  activePlayingId,
  onPlayItem,
  onToggleFavorite,
  onDeleteItem,
  onClearAll,
  onLoadIntoEditor,
  onSearchChange,
  onFavoriteFilterChange,
  onVoiceFilterChange,
  selectedVoiceFilter,
  isFavoriteFilter,
  searchTerm,
  onClose,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [localPlayingId, setLocalPlayingId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      }
    };
  }, []);

  const handlePlayOrPauseItem = (item: TTSHistoryItem) => {
    if (localPlayingId === item.id) {
      // Pause
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setLocalPlayingId(null);
      return;
    }

    // Play new item
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
    }

    const audioSrc = `data:${item.audio_mime_type || 'audio/wav'};base64,${item.audio_base64}`;
    audioPlayerRef.current.src = audioSrc;
    audioPlayerRef.current.onended = () => {
      setLocalPlayingId(null);
    };
    audioPlayerRef.current.onerror = () => {
      setLocalPlayingId(null);
    };

    const playPromise = audioPlayerRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setLocalPlayingId(item.id);
          onPlayItem(item);
        })
        .catch((err) => {
          console.warn('Playback deferred by browser policy:', err);
          onPlayItem(item);
        });
    } else {
      setLocalPlayingId(item.id);
      onPlayItem(item);
    }
  };

  const copyItemText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadHistoryAudioWav = (item: TTSHistoryItem) => {
    const audioSrc = `data:${item.audio_mime_type || 'audio/wav'};base64,${item.audio_base64}`;
    const link = document.createElement('a');
    link.href = audioSrc;
    const cleanVoice = (item.voice_name || 'voice').toLowerCase();
    link.download = `tts_${cleanVoice}_${item.id}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadHistoryAudioMp3 = (item: TTSHistoryItem) => {
    try {
      const mp3Blob = base64WavToMp3Blob(item.audio_base64, 192);
      const url = URL.createObjectURL(mp3Blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanVoice = (item.voice_name || 'voice').toLowerCase();
      link.download = `tts_${cleanVoice}_${item.id}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Failed to convert history audio to MP3, downloading WAV:', err);
      downloadHistoryAudioWav(item);
    }
  };

  const exportJsonHistory = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `tts_sqlite_history_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDuration = (secs: number) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      id="sqlite-history-section"
      className="p-5 sm:p-6 rounded-2xl bg-[#0D0D12] border border-[#222228] shadow-2xl space-y-4 flex flex-col h-full"
    >
      {/* Header & SQLite Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 border border-teal-600/30 text-teal-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Library History</h3>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-teal-900/30 text-teal-300 border border-teal-800/50">
                  SQLite
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {stats.totalCount} {stats.totalCount === 1 ? 'clip' : 'clips'} • {formatDuration(stats.totalDurationSeconds)} audio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="export-history-json-btn"
              type="button"
              onClick={exportJsonHistory}
              title="Export database history as JSON"
              disabled={items.length === 0}
              className="p-2 rounded-lg bg-[#16161C] border border-[#2A2A34] text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-40 transition"
            >
              <FileJson className="w-4 h-4" />
            </button>

            {confirmClear ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-[11px] font-medium text-white transition shadow-sm"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 rounded bg-[#1A1A22] text-[11px] text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                id="clear-history-btn"
                type="button"
                onClick={() => setConfirmClear(true)}
                title="Clear all SQLite records"
                disabled={items.length === 0}
                className="p-2 rounded-lg bg-[#16161C] border border-[#2A2A34] text-gray-400 hover:text-rose-400 hover:border-rose-900/50 disabled:opacity-40 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {onClose && (
              <button
                id="close-history-drawer-btn"
                type="button"
                onClick={onClose}
                title="Collapse history panel"
                className="p-2 rounded-lg bg-[#16161C] border border-[#2A2A34] text-gray-400 hover:text-white hover:border-gray-500 transition ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
            <input
              id="history-search-input"
              type="text"
              placeholder="Search script or voice..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#16161C] border border-[#2A2A34] rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-teal-500/60 transition"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-[#16161C] p-1 rounded-lg border border-[#2A2A34] text-xs">
              <button
                type="button"
                onClick={() => onFavoriteFilterChange(false)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  !isFavoriteFilter
                    ? 'bg-[#24242E] text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All ({stats.totalCount})
              </button>
              <button
                type="button"
                onClick={() => onFavoriteFilterChange(true)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                  isFavoriteFilter
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-gray-400 hover:text-amber-400'
                }`}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>Favorites ({stats.favoriteCount})</span>
              </button>
            </div>

            <select
              id="history-voice-filter"
              value={selectedVoiceFilter}
              onChange={(e) => onVoiceFilterChange(e.target.value)}
              className="bg-[#16161C] border border-[#2A2A34] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-teal-500/60"
            >
              <option value="all">All Voices</option>
              <optgroup label="Female">
                <option value="Kore">Kore</option>
                <option value="Zephyr">Zephyr</option>
                <option value="Aoede">Aoede</option>
                <option value="Leda">Leda</option>
                <option value="Mimosa">Mimosa</option>
                <option value="Thalia">Thalia</option>
              </optgroup>
              <optgroup label="Male">
                <option value="Charon">Charon</option>
                <option value="Fenrir">Fenrir</option>
                <option value="Orpheus">Orpheus</option>
                <option value="Chiron">Chiron</option>
                <option value="Jupiter">Jupiter</option>
              </optgroup>
              <optgroup label="Neutral">
                <option value="Puck">Puck</option>
                <option value="Echo">Echo</option>
                <option value="Callisto">Callisto</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* History Items Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px] max-h-[480px] custom-scrollbar">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-500 font-mono flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
            <span>Loading SQLite records...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-gray-500">
            <Database className="w-8 h-8 mx-auto opacity-30 text-teal-400" />
            <p className="text-xs font-medium text-gray-400">No clips found</p>
            <p className="text-[11px] text-gray-500 max-w-[240px] mx-auto">
              Generated speech synthesis clips are saved automatically to your SQLite database.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isPlayingThis = (activePlayingId === item.id) || (localPlayingId === item.id);
            const modelLabel = item.model_name?.includes('2.5') ? '2.5 Flash' : '3.1 Flash';

            return (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                className={`p-3 rounded-xl border text-xs transition-all space-y-2.5 ${
                  isPlayingThis
                    ? 'bg-[#181822] border-teal-500/80 shadow-lg shadow-teal-950/50 ring-1 ring-teal-500/30'
                    : 'bg-[#14141A] border-[#262630] hover:border-gray-600/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-gray-200 truncate">{item.voice_name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1E1E28] text-teal-300 border border-[#2D2D3A]">
                      {modelLabel}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      • {formatDuration(item.audio_duration)}
                    </span>
                    {item.voice_style && item.voice_style !== 'Natural' && (
                      <span className="text-[10px] text-gray-400 truncate max-w-[80px]" title={item.voice_style}>
                        • {item.voice_style}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(item.id)}
                      className={`p-1.5 rounded-lg transition ${
                        item.is_favorite
                          ? 'text-amber-400 bg-amber-500/10 hover:text-amber-300'
                          : 'text-gray-500 hover:text-amber-400 hover:bg-[#1C1C26]'
                      }`}
                      title={item.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-3.5 h-3.5 ${item.is_favorite ? 'fill-amber-400' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-[#1C1C26] transition"
                      title="Delete from SQLite database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-300 line-clamp-2 text-[11px] leading-relaxed select-text">
                  {item.text}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#22222C] text-[10px] text-gray-500 font-mono">
                  <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyItemText(item.id, item.text)}
                      className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-[#1C1C26] transition"
                      title="Copy script text"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onLoadIntoEditor(item)}
                      className="px-2 py-0.5 rounded bg-[#1C1C26] hover:bg-[#262634] text-gray-300 hover:text-white border border-[#2E2E3C] transition"
                      title="Load script and settings into studio editor"
                    >
                      Load
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadHistoryAudioMp3(item)}
                      className="px-1.5 py-0.5 rounded bg-[#1C1C26] hover:bg-teal-900/40 text-teal-400 hover:text-teal-300 border border-[#2E2E3C] font-mono text-[9px] transition"
                      title="Download as MP3"
                    >
                      MP3
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadHistoryAudioWav(item)}
                      className="px-1.5 py-0.5 rounded bg-[#1C1C26] hover:bg-[#262634] text-gray-400 hover:text-white border border-[#2E2E3C] font-mono text-[9px] transition"
                      title="Download as WAV"
                    >
                      WAV
                    </button>

                    <button
                      type="button"
                      id={`history-play-btn-${item.id}`}
                      onClick={() => handlePlayOrPauseItem(item)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition shadow-sm ${
                        isPlayingThis
                          ? 'bg-teal-500 text-black font-bold shadow-teal-500/30'
                          : 'bg-[#1E1E2A] hover:bg-[#282838] text-gray-200 border border-[#323242]'
                      }`}
                    >
                      {isPlayingThis ? (
                        <>
                          <Pause className="w-3 h-3 fill-black text-black" />
                          <span>Pause</span>
                          <span className="flex items-center gap-0.5 ml-0.5">
                            <span className="w-1 h-2 bg-black rounded-full animate-pulse"></span>
                            <span className="w-1 h-3 bg-black rounded-full animate-pulse [animation-delay:0.1s]"></span>
                          </span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Play</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Database Status Card */}
      <div className="bg-teal-950/20 border border-teal-800/40 p-3.5 rounded-xl mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <p className="text-xs text-teal-300 font-medium">SQLite Database Active</p>
          </div>
          <span className="text-[10px] text-teal-400 font-mono">Real-Time Sync</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-teal-900/40 text-[10px]">
          <div>
            <span className="text-gray-500 block">Clips</span>
            <span className="text-gray-200 font-mono font-medium">{stats.totalCount}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Total Audio</span>
            <span className="text-gray-200 font-mono font-medium">{formatDuration(stats.totalDurationSeconds)}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Storage</span>
            <span className="text-gray-200 font-mono font-medium">{formatFileSize(stats.totalBytes)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

