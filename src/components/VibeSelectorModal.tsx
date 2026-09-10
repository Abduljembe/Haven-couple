import React from 'react';
import { X, Sparkles, Check, Heart, Flame, Coffee, Pizza, Moon, Gamepad2, Headphones, PartyPopper, Smile, Briefcase } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playLevelUp } from '../utils/sounds';

interface VibeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMood: string;
  onSelectMood: (mood: string) => void;
  partnerName: string;
}

interface VibeOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
  gradient: string;
  glowColor: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  {
    id: 'love',
    label: 'Connected with you 💕',
    description: 'Feeling warm, affectionate & grateful',
    emoji: '🥰',
    gradient: 'from-rose-500 to-pink-500',
    glowColor: 'rgba(244, 63, 94, 0.4)',
  },
  {
    id: 'hyped',
    label: 'Hyped & Full of Energy! ⚡',
    description: 'Excited, motivated and smiling',
    emoji: '🔥',
    gradient: 'from-amber-500 to-orange-500',
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  {
    id: 'sparkle',
    label: 'Thinking about you ✨',
    description: 'You are daydreaming of their smile',
    emoji: '✨',
    gradient: 'from-purple-500 to-indigo-500',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  {
    id: 'coffee',
    label: 'Need coffee & morning cuddles ☕',
    description: 'Sipping tea or coffee, waking up slowly',
    emoji: '☕',
    gradient: 'from-amber-600 to-yellow-600',
    glowColor: 'rgba(217, 119, 6, 0.4)',
  },
  {
    id: 'snack',
    label: 'Craving food & tasty snacks 🍕',
    description: 'Hungry! Planning what to eat together',
    emoji: '🍕',
    gradient: 'from-red-500 to-amber-500',
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
  {
    id: 'sleepy',
    label: 'Cozy & ready for dreamland 🌙',
    description: 'Under warm blankets, drifting into sleep',
    emoji: '😴',
    gradient: 'from-indigo-600 to-slate-800',
    glowColor: 'rgba(79, 70, 229, 0.4)',
  },
  {
    id: 'gaming',
    label: 'Gaming & locked into the screen 🎮',
    description: 'Playing party games or solo adventure',
    emoji: '🎮',
    gradient: 'from-cyan-500 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.4)',
  },
  {
    id: 'music',
    label: 'Vibing to good tunes 🎧',
    description: 'Headphones on, lost in rhythm and memories',
    emoji: '🎧',
    gradient: 'from-fuchsia-500 to-pink-500',
    glowColor: 'rgba(217, 70, 239, 0.4)',
  },
  {
    id: 'hugs',
    label: 'Missing you & needing warm hugs 🥺',
    description: 'A little lonely, sending virtual embrace',
    emoji: '🫂',
    gradient: 'from-rose-400 to-purple-400',
    glowColor: 'rgba(251, 113, 133, 0.4)',
  },
  {
    id: 'party',
    label: 'Celebrating awesome news! 🎉',
    description: 'Woohoo! Something wonderful happened',
    emoji: '🥳',
    gradient: 'from-emerald-500 to-teal-500',
    glowColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'peace',
    label: 'Peaceful, calm & balanced 🌸',
    description: 'Breathing deeply, feeling centered & serene',
    emoji: '🌸',
    gradient: 'from-teal-400 to-emerald-500',
    glowColor: 'rgba(20, 184, 166, 0.4)',
  },
  {
    id: 'work',
    label: 'Busy bee crushing tasks 💼',
    description: 'Focusing on study or work, but thinking of you',
    emoji: '⚡',
    gradient: 'from-blue-600 to-indigo-700',
    glowColor: 'rgba(37, 99, 235, 0.4)',
  },
];

export const VibeSelectorModal: React.FC<VibeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentMood,
  onSelectMood,
  partnerName,
}) => {
  if (!isOpen) return null;

  const handleSelect = (vibe: VibeOption) => {
    onSelectMood(vibe.label);
    playLevelUp();
    try {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.7 },
      });
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div
        id="vibe-selector-card"
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif">What's Your Live Vibe?</h2>
              <p className="text-xs text-white/80">Broadcast your instant feeling to {partnerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options list */}
        <div className="p-6 space-y-2.5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {VIBE_OPTIONS.map((vibe) => {
              const isSelected = currentMood === vibe.label;
              return (
                <button
                  key={vibe.id}
                  onClick={() => handleSelect(vibe)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 group ${
                    isSelected
                      ? 'border-rose-400 bg-rose-50/60 shadow-md ring-2 ring-rose-400/30'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-xs'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-xs bg-gradient-to-br ${vibe.gradient} text-white group-hover:scale-110 transition-transform`}
                  >
                    {vibe.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                      <span>{vibe.label}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {vibe.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Picking a vibe immediately notifies your space with audio chime and status aura</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
