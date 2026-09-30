import React, { useState, useEffect } from 'react';
import {
  Moon,
  ArrowLeft,
  X,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  CloudRain,
  Flame,
  Waves,
  Coffee,
  CloudLightning,
  Radio,
  Eye,
  EyeOff,
  Sun,
  Bed,
} from 'lucide-react';
import { SleepSanctuaryState, SoundscapeType, UserProfile } from '../types';
import { soundscapePlayer } from '../utils/soundscapes';

interface SleepSanctuaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SleepSanctuaryState;
  partner?: UserProfile;
  partnerName: string;
  onUpdateState: (updates: Partial<SleepSanctuaryState>) => void;
  onSendWakeupNudge: () => void;
}

const SOUNDSCAPES: { id: SoundscapeType; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'rain', label: 'Rain on Window', icon: CloudRain, desc: 'Gentle raindrops on glass' },
  { id: 'ocean', label: 'Midnight Waves', icon: Waves, desc: 'Soft tide on a quiet beach' },
  { id: 'campfire', label: 'Cozy Hearth', icon: Flame, desc: 'Warm crackling embers' },
  { id: 'cafe', label: 'Night Cafe', icon: Coffee, desc: 'Muffled lofi ambient warmth' },
  { id: 'thunder', label: 'Distant Storm', icon: CloudLightning, desc: 'Deep soothing thunder' },
  { id: 'whitenoise', label: 'Pure Calm', icon: Radio, desc: 'Gentle pink noise veil' },
];

export const SleepSanctuaryModal: React.FC<SleepSanctuaryModalProps> = ({
  isOpen,
  onClose,
  state,
  partner,
  partnerName,
  onUpdateState,
  onSendWakeupNudge,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isOledMode, setIsOledMode] = useState<boolean>(false);
  const [showAlarmInput, setShowAlarmInput] = useState<boolean>(false);
  const [alarmInput, setAlarmInput] = useState<string>(state.alarmTime || '07:30');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isOpen && state.isActive) {
      soundscapePlayer.play(state.soundscape, state.volume);
    } else {
      soundscapePlayer.stop();
    }
    return () => {
      soundscapePlayer.stop();
    };
  }, [isOpen, state.isActive, state.soundscape]);

  useEffect(() => {
    soundscapePlayer.setVolume(state.volume);
  }, [state.volume]);

  if (!isOpen) return null;

  const handleToggleActive = () => {
    const nextActive = !state.isActive;
    onUpdateState({
      isActive: nextActive,
      sleepStartedAt: nextActive ? Date.now() : undefined,
    });
  };

  const handleSoundscapeChange = (type: SoundscapeType) => {
    onUpdateState({ soundscape: type });
    if (state.isActive) {
      soundscapePlayer.play(type, state.volume);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateState({ volume: val });
  };

  // Ultra-Dim OLED Minimalist Sleep Mode
  if (isOledMode) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6 select-none cursor-pointer transition-colors duration-700"
        onClick={() => setIsOledMode(false)}
      >
        <div className="w-full flex items-center justify-between opacity-20 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-mono">
            <Bed className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Sleeping together with {partner ? partner.name : partnerName}</span>
          </div>
          <span className="text-[11px] text-zinc-500">Tap anywhere to wake display</span>
        </div>

        <div className="text-center">
          <div className="text-6xl sm:text-8xl font-extralight text-zinc-600 tracking-wider font-mono">
            {currentTime || '00:00:00'}
          </div>
          <p className="text-xs text-zinc-600 mt-3 font-mono tracking-widest uppercase">
            {state.soundscape.toUpperCase()} SOUNDSCAPE ACTIVE • {Math.round(state.volume * 100)}% VOL
          </p>
        </div>

        <div className="opacity-20 hover:opacity-100 transition-opacity flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSendWakeupNudge();
            }}
            className="px-4 py-1.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Send Morning Glow</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        id="sleep-sanctuary-modal"
        className="w-full max-w-xl bg-slate-950 border-0 sm:border border-indigo-900/60 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-5 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-indigo-900/40 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven-Style Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-sleep-mobile-back"
              className="p-1.5 -ml-1 text-indigo-300 hover:bg-indigo-900/60 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-indigo-100 flex items-center gap-2 truncate">
                <span>Sleep Sanctuary</span>
                <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 shrink-0">
                  Night Lounge
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-indigo-300/80 truncate">
                Shared ambient soundscapes & sleep clock
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Active Status Hero */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-800/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-500/10 border-2 border-indigo-400/40 flex items-center justify-center text-indigo-200 shadow-inner">
                {state.isActive ? (
                  <Moon className="w-7 h-7 text-indigo-400 animate-pulse" />
                ) : (
                  <Bed className="w-7 h-7 text-slate-500" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">
                  {state.isActive ? 'Sleep Session in Progress' : 'Ready to Rest Together'}
                </h3>
                <p className="text-xs text-indigo-300/70 mt-0.5">
                  {state.isActive
                    ? `Playing ${state.soundscape} soundscape with ${partner ? partner.name : partnerName}`
                    : 'Start synchronized soundscape to fall asleep peacefully'}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleActive}
              className={`px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-lg transition-all cursor-pointer ${
                state.isActive
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
              }`}
            >
              {state.isActive ? 'Stop Audio' : 'Begin Sleep'}
            </button>
          </div>

          {/* Soundscapes Selector */}
          <div>
            <label className="text-xs font-semibold text-indigo-200 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Choose Ambient Soundscape</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SOUNDSCAPES.map((sc) => {
                const Icon = sc.icon;
                const isSelected = state.soundscape === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => handleSoundscapeChange(sc.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-900/50 border-indigo-400 text-white shadow-md shadow-indigo-950'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-indigo-300' : 'text-slate-500'}`} />
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{sc.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{sc.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume Control */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-indigo-200 font-medium">
              <span className="flex items-center gap-1.5">
                {state.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
                <span>Master Sanctuary Volume</span>
              </span>
              <span className="font-mono text-indigo-300">{Math.round(state.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.volume}
              onChange={handleVolumeChange}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* OLED Mode & Wakeup Nudge Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setIsOledMode(true)}
              className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <EyeOff className="w-4 h-4 text-indigo-400" />
              <span>Enter Ultra-Dim OLED Clock</span>
            </button>

            <button
              onClick={onSendWakeupNudge}
              className="px-4 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Send Gentle Morning Nudge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
