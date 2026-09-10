import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Mic, Sparkles } from 'lucide-react';
import { playVoicePromptSynthesizer } from '../../utils/sounds';

interface VoicePromptPlayerProps {
  question?: string;
  durationSec?: number;
  audioUrl?: string;
  className?: string;
  compact?: boolean;
}

export const VoicePromptPlayer: React.FC<VoicePromptPlayerProps> = ({
  question = 'Listen to my vibe',
  durationSec = 7,
  audioUrl,
  className = '',
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const stopSynthRef = useRef<(() => void) | null>(null);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  const duration = durationSec || 7;

  useEffect(() => {
    return () => {
      if (stopSynthRef.current) stopSynthRef.current();
      if (audioElemRef.current) {
        audioElemRef.current.pause();
        audioElemRef.current = null;
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      if (stopSynthRef.current) {
        stopSynthRef.current();
        stopSynthRef.current = null;
      }
      if (audioElemRef.current) {
        audioElemRef.current.pause();
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
      setProgress(0);
      return;
    }

    setIsPlaying(true);
    setProgress(0);

    const startTime = Date.now();
    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= duration) {
        setProgress(100);
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setProgress((elapsed / duration) * 100);
      }
    }, 100);

    if (audioUrl && audioUrl.startsWith('http')) {
      const audio = new Audio(audioUrl);
      audioElemRef.current = audio;
      audio.play().catch(() => {
        // Fallback to synthesizer if audio fails or is blocked
        stopSynthRef.current = playVoicePromptSynthesizer(duration, () => {
          setIsPlaying(false);
          setProgress(0);
          if (intervalRef.current) clearInterval(intervalRef.current);
        });
      });
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      // Play warm melodic synth
      stopSynthRef.current = playVoicePromptSynthesizer(duration, () => {
        setIsPlaying(false);
        setProgress(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      });
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isPlaying
          ? 'bg-rose-500/10 border-rose-500/30 shadow-sm shadow-rose-500/10'
          : 'bg-stone-900/40 border-white/10 hover:border-white/20'
      } ${compact ? 'p-2' : 'p-3'} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Mic className="w-2.5 h-2.5" />
          </span>
          <span className="text-[11px] font-medium text-stone-300 truncate">
            {question}
          </span>
        </div>
        <span className="text-[10px] text-stone-400 tabular-nums shrink-0 font-mono">
          0:0{Math.max(1, Math.round(duration * (1 - progress / 100)))}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={handleTogglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
            isPlaying
              ? 'bg-rose-500 text-white shadow-rose-500/20'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />}
        </button>

        {/* Animated Waveform Equalizer */}
        <div className="flex-1 flex items-center gap-1 h-6 px-1">
          {[24, 60, 40, 90, 75, 45, 80, 50, 65, 30, 85, 40, 70, 55, 35].map((height, i) => {
            const isPassed = (i / 15) * 100 <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-150"
                style={{
                  height: isPlaying ? `${Math.max(15, (height * (0.5 + Math.sin(Date.now() / 200 + i) * 0.5)))}%` : `${height}%`,
                  backgroundColor: isPlaying
                    ? isPassed
                      ? '#f43f5e'
                      : '#fda4af'
                    : isPassed
                    ? '#e11d48'
                    : '#78716c',
                  opacity: isPlaying ? 1 : 0.6,
                }}
              />
            );
          })}
        </div>

        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-stone-400 border border-white/5 shrink-0 flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          Voice
        </span>
      </div>
    </div>
  );
};
