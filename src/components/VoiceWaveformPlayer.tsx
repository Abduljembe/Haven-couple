import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';

interface VoiceWaveformPlayerProps {
  audioSrc: string;
  duration?: number;
  isSender: boolean;
  messageId: string;
  isPlayingGlobal?: boolean;
  onTogglePlayGlobal?: (id: string) => void;
}

export const VoiceWaveformPlayer: React.FC<VoiceWaveformPlayerProps> = ({
  audioSrc,
  duration = 0,
  isSender,
  messageId,
  isPlayingGlobal,
  onTogglePlayGlobal,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync with global player state if provided
  useEffect(() => {
    if (isPlayingGlobal !== undefined) {
      if (!isPlayingGlobal && isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
    }
  }, [isPlayingGlobal, isPlaying]);

  // Deterministic aesthetic waveform pattern based on messageId
  const waveformBars = useMemo(() => {
    const barsCount = 28;
    const result: number[] = [];
    let seed = 0;
    for (let i = 0; i < messageId.length; i++) {
      seed = (seed + messageId.charCodeAt(i) * (i + 1)) % 1000;
    }

    for (let i = 0; i < barsCount; i++) {
      // Shape with gentle bell curve and pseudo-random variations
      const centerFactor = 1 - Math.abs((i - barsCount / 2) / (barsCount / 2)) * 0.4;
      const pseudoRand = ((seed * (i + 3) * 17) % 70) / 100;
      const height = Math.max(18, Math.min(95, Math.round((25 + pseudoRand * 65) * centerFactor)));
      result.push(height);
    }
    return result;
  }, [messageId]);

  // Initialize or cleanup audio element
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.src = audioSrc;
    audio.preload = 'metadata';

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onTogglePlayGlobal) onTogglePlayGlobal('');
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audioRef.current = null;
    };
  }, [audioSrc]);

  // Toggle playback
  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (onTogglePlayGlobal) onTogglePlayGlobal('');
    } else {
      if (onTogglePlayGlobal) onTogglePlayGlobal(messageId);
      audio.playbackRate = playbackRate;
      audio.play().catch((err) => console.error('Audio play failed:', err));
      setIsPlaying(true);
    }
  };

  // Scrub to position by clicking on waveform
  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !totalDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = percent * totalDuration;

    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  // Cycle playback speed: 1x -> 1.5x -> 2x
  const handleSpeedCycle = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[240px] max-w-[320px] select-none">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={handleTogglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 shadow-md cursor-pointer ${
          isSender
            ? 'bg-white text-rose-600 hover:bg-rose-50'
            : 'bg-rose-500 hover:bg-rose-600 text-white'
        }`}
        title={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
      </button>

      {/* Waveform Scrubber & Timers */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        {/* Interactive Waveform Bars */}
        <div
          onClick={handleScrub}
          className="relative flex items-center gap-[2.5px] h-7 cursor-pointer group py-1"
          title="Click to seek"
        >
          {waveformBars.map((heightPercent, index) => {
            const barPercent = (index / waveformBars.length) * 100;
            const isPlayed = barPercent <= progressPercent;

            return (
              <div
                key={index}
                style={{ height: `${heightPercent}%` }}
                className={`flex-1 rounded-full transition-all duration-75 group-hover:opacity-100 ${
                  isPlayed
                    ? isSender
                      ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]'
                      : 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]'
                    : isSender
                    ? 'bg-white/40'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            );
          })}
        </div>

        {/* Progress Time & Speed Controls */}
        <div className={`flex items-center justify-between text-[10px] font-mono leading-none ${
          isSender ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
        }`}>
          <span>
            {formatTime(currentTime)} / {formatTime(totalDuration || duration)}
          </span>

          <button
            type="button"
            onClick={handleSpeedCycle}
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight transition-colors cursor-pointer ${
              isSender
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
            }`}
            title="Change voice playback speed"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};
