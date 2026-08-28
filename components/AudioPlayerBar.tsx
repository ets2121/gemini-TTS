'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Download,
  Volume2,
  VolumeX,
  Repeat,
  Copy,
  Check,
  Star,
  FileAudio,
  Sparkles,
  Music,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { base64WavToMp3Blob } from '@/lib/audio-converter';

interface AudioPlayerBarProps {
  audioBase64: string;
  mimeType?: string;
  duration?: number;
  fileSizeBytes?: number;
  text?: string;
  voiceName?: string;
  voiceStyle?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  colorTheme?: 'cyan' | 'purple' | 'emerald';
  autoPlay?: boolean;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  audioBase64,
  mimeType = 'audio/wav',
  duration = 0,
  fileSizeBytes = 0,
  text = '',
  voiceName = 'Kore',
  voiceStyle = '',
  isFavorite = false,
  onToggleFavorite,
  colorTheme = 'cyan',
  autoPlay = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const audioSrc = `data:${mimeType};base64,${audioBase64}`;

  // Handle Autoplay whenever audio source changes
  useEffect(() => {
    if (autoPlay && audioRef.current && audioBase64) {
      const audio = audioRef.current;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Autoplay deferred or prevented by browser policy:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [audioBase64, autoPlay]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (!totalDuration && audio.duration && !isNaN(audio.duration)) {
      setTotalDuration(audio.duration);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setTotalDuration(audio.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSkip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(totalDuration, audio.currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
    if (audioRef.current) {
      audioRef.current.loop = !isLooping;
    }
  };

  const downloadWav = () => {
    if (!audioBase64) return;
    const link = document.createElement('a');
    link.href = audioSrc;
    const cleanVoice = voiceName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanStyle = voiceStyle ? `_${voiceStyle.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';
    link.download = `tts_${cleanVoice}${cleanStyle}_${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowFormatMenu(false);
  };

  const downloadMp3 = () => {
    if (!audioBase64) return;
    try {
      setIsConvertingMp3(true);
      const mp3Blob = base64WavToMp3Blob(audioBase64, 192);
      const url = URL.createObjectURL(mp3Blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanVoice = voiceName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanStyle = voiceStyle ? `_${voiceStyle.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : '';
      link.download = `tts_${cleanVoice}${cleanStyle}_${Date.now()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setShowFormatMenu(false);
    } catch (err) {
      console.error('MP3 conversion error, falling back to WAV:', err);
      downloadWav();
    } finally {
      setIsConvertingMp3(false);
    }
  };

  const copyScript = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      id="active-tts-player"
      className="p-6 rounded-2xl bg-[#121216] border border-[#2A2A30] shadow-2xl space-y-5"
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Header Info */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-900/20 border border-teal-800/40 flex items-center justify-center text-teal-400">
            <FileAudio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#E2E2E2]">
                Neural Audio Stream ({voiceName})
              </h3>
              {voiceStyle && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1A1A20] text-teal-300 border border-[#2A2A30]">
                  {voiceStyle}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Lossless 24kHz • {formatTime(totalDuration)} • {formatFileSize(fileSizeBytes)}
            </p>
          </div>
        </div>

        {/* Action buttons: Favorite, Copy Script, Download Options */}
        <div className="flex items-center gap-2 relative">
          {onToggleFavorite && (
            <button
              id="player-fav-btn"
              type="button"
              onClick={onToggleFavorite}
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
              className={`p-2.5 rounded-xl border text-xs transition ${
                isFavorite
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'bg-[#1A1A20] border-[#2A2A30] text-gray-400 hover:text-amber-400 hover:border-gray-600'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          <button
            id="player-copy-btn"
            type="button"
            onClick={copyScript}
            title="Copy script text"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A1A20] border border-[#2A2A30] text-xs text-gray-300 hover:text-white hover:border-gray-600 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Script'}</span>
          </button>

          {/* Download as MP3 (Primary) */}
          <button
            id="player-download-mp3-btn"
            type="button"
            onClick={downloadMp3}
            disabled={isConvertingMp3}
            title="Download audio as MP3 (Universal format)"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition shadow-lg shadow-teal-900/30 active:scale-95 disabled:opacity-50"
          >
            {isConvertingMp3 ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download MP3</span>
          </button>

          {/* Download as WAV (Lossless) */}
          <button
            id="player-download-wav-btn"
            type="button"
            onClick={downloadWav}
            title="Download Lossless .WAV (24kHz Studio master)"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-transparent border border-[#2A2A30] hover:bg-[#1A1A20] text-gray-300 hover:text-white font-medium text-xs transition shadow-sm hover:border-gray-600 active:scale-95"
          >
            <Music className="w-3.5 h-3.5 text-teal-400" />
            <span>.WAV</span>
          </button>
        </div>
      </div>

      {/* Waveform Visualizer */}
      <AudioVisualizer
        isPlaying={isPlaying}
        audioElementRef={audioRef}
        colorTheme={colorTheme}
      />

      {/* Scrubber Bar */}
      <div className="space-y-1.5">
        <div className="relative flex items-center group">
          <input
            id="audio-scrubber-slider"
            type="range"
            min="0"
            max={totalDuration || 1}
            step="0.01"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-[#1A1A20] rounded-lg appearance-none cursor-pointer accent-teal-500 group-hover:h-2 transition-all"
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Playback Controls Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t border-[#222226]">
        {/* Left: Play/Pause and Skip buttons */}
        <div className="flex items-center gap-2">
          <button
            id="player-skip-back-btn"
            type="button"
            onClick={() => handleSkip(-5)}
            title="Rewind 5 seconds"
            className="p-2.5 rounded-xl bg-[#1A1A20] border border-[#2A2A30] text-gray-300 hover:text-white hover:border-gray-600 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="player-play-toggle-btn"
            type="button"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            className="p-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium transition shadow-lg shadow-teal-900/30 active:scale-95"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            id="player-skip-forward-btn"
            type="button"
            onClick={() => handleSkip(5)}
            title="Fast forward 5 seconds"
            className="p-2.5 rounded-xl bg-[#1A1A20] border border-[#2A2A30] text-gray-300 hover:text-white hover:border-gray-600 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            id="player-loop-toggle-btn"
            type="button"
            onClick={toggleLoop}
            title={isLooping ? 'Loop Enabled' : 'Enable Loop'}
            className={`p-2.5 rounded-xl border text-xs transition ${
              isLooping
                ? 'bg-teal-900/20 border-teal-500/50 text-teal-300'
                : 'bg-[#1A1A20] border-[#2A2A30] text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Middle: Speed Multipliers */}
        <div className="flex items-center gap-1 bg-[#1A1A20] p-1 rounded-xl border border-[#2A2A30] text-xs">
          {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => changeSpeed(rate)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition ${
                playbackRate === rate
                  ? 'bg-teal-600 text-white font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Right: Volume Slider */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="text-gray-400 hover:text-white transition"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            id="player-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 bg-[#1A1A20] rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>
      </div>
    </div>
  );
};
