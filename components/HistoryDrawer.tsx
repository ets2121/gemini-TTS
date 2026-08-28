'use client';

import React, { useState } from 'react';
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
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

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
      className="p-6 rounded-2xl bg-[#0D0D10] border border-[#222226] shadow-xl space-y-4 flex flex-col h-full"
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
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Library History</h3>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-teal-900/20 text-teal-300 border border-teal-800/40">
                  SQLite
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {stats.totalCount} clips • {formatDuration(stats.totalDurationSeconds)} audio
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
              className="p-2 rounded-lg bg-[#16161A] border border-[#2A2A30] text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-40 transition"
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
                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-[11px] font-medium text-white transition"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 rounded bg-[#1A1A20] text-[11px] text-gray-400 hover:text-white transition"
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
                className="p-2 rounded-lg bg-[#16161A] border border-[#2A2A30] text-gray-400 hover:text-rose-400 hover:border-rose-900/50 disabled:opacity-40 transition"
              >
                <Trash2 className="w-4 h-4" />
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
              placeholder="Search script or voice style..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#16161A] border border-[#2A2A30] rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-teal-600/50 transition"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-[#16161A] p-1 rounded-lg border border-[#2A2A30] text-xs">
              <button
                type="button"
                onClick={() => onFavoriteFilterChange(false)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  !isFavoriteFilter
                    ? 'bg-[#222228] text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All
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
                <span>Favorites</span>
              </button>
            </div>

            <select
              id="history-voice-filter"
              value={selectedVoiceFilter}
              onChange={(e) => onVoiceFilterChange(e.target.value)}
              className="bg-[#16161A] border border-[#2A2A30] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-teal-600/50"
            >
              <option value="all">All Voices</option>
              <option value="Kore">Kore</option>
              <option value="Charon">Charon</option>
              <option value="Puck">Puck</option>
              <option value="Zephyr">Zephyr</option>
              <option value="Fenrir">Fenrir</option>
              <option value="Aoede">Aoede</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Items Scrollable List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[460px] custom-scrollbar">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-500 font-mono">
            Loading SQLite records...
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-gray-500">
            <Database className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">No audio history found</p>
            <p className="text-[11px] text-gray-600">
              Synthesized speech audio is saved automatically to your SQLite database.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isPlayingThis = activePlayingId === item.id;

            return (
              <div
                key={item.id}
                id={`history-item-${item.id}`}
                className={`p-3 rounded-lg border text-xs transition-all space-y-2 ${
                  isPlayingThis
                    ? 'bg-[#16161A] border-teal-500/80 shadow-md shadow-teal-950/40'
                    : 'bg-[#16161A] border-[#2A2A30] hover:border-gray-600/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-gray-200 truncate">{item.voice_name}</span>
                    <span className="text-[10px] text-gray-500">
                      • {formatDuration(item.audio_duration)}
                    </span>
                    {item.voice_style && (
                      <span className="text-[10px] text-gray-500 truncate max-w-[90px]">
                        • {item.voice_style}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(item.id)}
                      className={`p-1 rounded transition ${
                        item.is_favorite
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-gray-600 hover:text-amber-400'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${item.is_favorite ? 'fill-amber-400' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 text-gray-600 hover:text-rose-400 transition"
                      title="Delete from SQLite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-400 line-clamp-2 text-[11px] leading-relaxed">
                  {item.text}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-[#222226] text-[10px] text-gray-500 font-mono">
                  <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyItemText(item.id, item.text)}
                      className="p-1 rounded hover:text-gray-300 transition"
                      title="Copy script"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onLoadIntoEditor(item)}
                      className="px-2 py-0.5 rounded bg-[#1A1A20] hover:bg-[#222228] text-gray-300 hover:text-white border border-[#2A2A30] transition"
                      title="Load script and settings into editor"
                    >
                      Load
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadHistoryAudioMp3(item)}
                      className="px-1.5 py-0.5 rounded bg-[#1A1A20] hover:bg-teal-900/40 text-teal-400 hover:text-teal-300 border border-[#2A2A30] font-mono text-[9px] transition"
                      title="Download as MP3"
                    >
                      MP3
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadHistoryAudioWav(item)}
                      className="px-1.5 py-0.5 rounded bg-[#1A1A20] hover:bg-[#222228] text-gray-400 hover:text-white border border-[#2A2A30] font-mono text-[9px] transition"
                      title="Download as WAV"
                    >
                      WAV
                    </button>

                    <button
                      type="button"
                      onClick={() => onPlayItem(item)}
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded font-medium transition ${
                        isPlayingThis
                          ? 'bg-teal-600 text-white font-bold'
                          : 'bg-[#1A1A20] hover:bg-[#222228] text-gray-200 border border-[#2A2A30]'
                      }`}
                    >
                      {isPlayingThis ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                      <span>{isPlayingThis ? 'Pause' : 'Play'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Database Status Card matching design spec */}
      <div className="bg-teal-900/10 border border-teal-800/30 p-4 rounded-xl mt-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs text-teal-400 font-medium">Database Status</p>
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        </div>
        <div className="flex justify-between mt-2 text-[10px]">
          <span className="text-gray-500">Stored Clips</span>
          <span className="text-gray-300 font-mono">{stats.totalCount} Entries</span>
        </div>
        <div className="flex justify-between mt-1 text-[10px]">
          <span className="text-gray-500">Storage Used</span>
          <span className="text-gray-300 font-mono">{formatFileSize(stats.totalBytes)}</span>
        </div>
        <div className="flex justify-between mt-1 text-[10px]">
          <span className="text-gray-500">Total Duration</span>
          <span className="text-gray-300 font-mono">{formatDuration(stats.totalDurationSeconds)}</span>
        </div>
      </div>
    </div>
  );
};
