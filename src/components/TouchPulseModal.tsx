import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowLeft, Heart, Sparkles, Hand, Volume2, VolumeX, Flame, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TouchPoint, UserProfile } from '../types';

interface TouchPulseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  partner: UserProfile | null;
  partnerName: string;
  remoteTouch: TouchPoint | null;
  onSendTouchUpdate: (touch: TouchPoint) => void;
  onSendTouchRelease: (userId: string) => void;
}

export const TouchPulseModal: React.FC<TouchPulseModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partner,
  partnerName,
  remoteTouch,
  onSendTouchUpdate,
  onSendTouchRelease,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localTouch, setLocalTouch] = useState<TouchPoint | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isThumbKissAligned, setIsThumbKissAligned] = useState(false);
  const lastBurstTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const heartbeatIntervalRef = useRef<any>(null);

  const isBothTouching = Boolean(localTouch?.isActive && remoteTouch?.isActive);

  // Calculate distance between local and remote touch (in percentage coords)
  const touchDistance = isBothTouching && localTouch && remoteTouch
    ? Math.hypot(localTouch.x - remoteTouch.x, localTouch.y - remoteTouch.y)
    : 1000;

  const isCloseTogether = touchDistance < 14;

  // Trigger ThumbKiss Fireworks & Haptics when fingers meet
  useEffect(() => {
    if (isBothTouching && isCloseTogether) {
      setIsThumbKissAligned(true);
      const now = Date.now();
      if (now - lastBurstTimeRef.current > 1200) {
        lastBurstTimeRef.current = now;
        if (navigator.vibrate) {
          navigator.vibrate([40, 80, 120, 200]);
        }
        if (localTouch && remoteTouch) {
          const avgX = (localTouch.x + remoteTouch.x) / 2 / 100;
          const avgY = (localTouch.y + remoteTouch.y) / 2 / 100;
          try {
            confetti({
              particleCount: 45,
              spread: 70,
              origin: { x: avgX, y: avgY },
              colors: ['#f43f5e', '#fbbf24', '#ec4899', '#ffffff'],
              shapes: ['circle'],
              scalar: 1.2,
            });
          } catch {
            // Confetti fallback
          }
        }
      }
    } else {
      setIsThumbKissAligned(false);
    }
  }, [isBothTouching, isCloseTogether, localTouch, remoteTouch]);

  // Play gentle heartbeat pulse oscillator sound
  const playHeartbeatSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }

      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      if (audioContextRef.current) {
        const now = audioContextRef.current.currentTime;
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(65, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);

        osc.start(now);
        osc.stop(now + 0.18);

        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate([40, 60, 40]);
        }
      }
    } catch {
      // Audio context might fail without direct user interaction
    }
  }, [soundEnabled]);

  // Synchronized heartbeat loop when both hold hands
  useEffect(() => {
    if (isBothTouching) {
      playHeartbeatSound();
      heartbeatIntervalRef.current = setInterval(() => {
        playHeartbeatSound();
      }, 1000);
    } else {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isBothTouching, playHeartbeatSound]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const touchData: TouchPoint = {
      userId: currentUserId,
      userName: currentUserName,
      x,
      y,
      intensity: 1,
      color: '#f43f5e',
      isActive: true,
      updatedAt: Date.now(),
    };

    setLocalTouch(touchData);
    setIsHolding(true);
    onSendTouchUpdate(touchData);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isHolding || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    const touchData: TouchPoint = {
      userId: currentUserId,
      userName: currentUserName,
      x,
      y,
      intensity: 1,
      color: '#f43f5e',
      isActive: true,
      updatedAt: Date.now(),
    };

    setLocalTouch(touchData);
    onSendTouchUpdate(touchData);
  };

  const handlePointerUp = () => {
    if (!isHolding) return;
    setIsHolding(false);
    setLocalTouch(null);
    onSendTouchRelease(currentUserId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in select-none">
      <div className="relative w-full max-w-4xl h-[100dvh] sm:h-[90vh] sm:max-h-[750px] bg-slate-950 border-0 sm:border border-slate-800 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md z-30 shrink-0 sticky top-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven-Style Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-touch-mobile-back"
              className="p-1.5 -ml-1 text-rose-400 hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 animate-pulse shrink-0">
              <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">Touch Pulse</h3>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30 shrink-0">
                  Virtual Touch
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isBothTouching
                  ? '✨ Connected! Holding hands across distance.'
                  : `Press & hold to feel ${partner ? partner.name : partnerName}.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Heartbeat Sound' : 'Enable Heartbeat Sound'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Interactive Glowing Touch Area */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black overflow-hidden cursor-crosshair touch-none flex items-center justify-center"
        >
          {/* Animated Background Auroras */}
          <div className={`absolute inset-0 transition-opacity duration-1000 ${
            isBothTouching ? 'opacity-100' : 'opacity-20'
          }`}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl" />
          </div>

          {/* Center Instruction Banner when not touching */}
          {!localTouch && (
            <div className="z-10 text-center space-y-3 pointer-events-none p-6 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                <Hand className="w-8 h-8 animate-bounce" />
              </div>
              <h4 className="text-lg font-bold text-white">Press and hold your finger anywhere</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Place your hand on the screen to reach out to {partner ? partner.name : partnerName}.
              </p>
            </div>
          )}

          {/* Connecting Laser Arc when both touch */}
          {isBothTouching && localTouch && remoteTouch && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <defs>
                <linearGradient id="touch-beam" x1={`${localTouch.x}%`} y1={`${localTouch.y}%`} x2={`${remoteTouch.x}%`} y2={`${remoteTouch.y}%`}>
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <line
                x1={`${localTouch.x}%`}
                y1={`${localTouch.y}%`}
                x2={`${remoteTouch.x}%`}
                y2={`${remoteTouch.y}%`}
                stroke="url(#touch-beam)"
                strokeWidth="6"
                strokeLinecap="round"
                filter="url(#glow)"
                className="animate-pulse"
              />
            </svg>
          )}

          {/* Local User Touch Point */}
          {localTouch && (
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-20 transition-transform duration-75"
              style={{ left: `${localTouch.x}%`, top: `${localTouch.y}%` }}
            >
              <div className="relative flex items-center justify-center">
                {/* Pulsing Aura Rings */}
                <div className="absolute w-28 h-28 rounded-full bg-rose-500/20 animate-ping" />
                <div className="absolute w-20 h-20 rounded-full bg-rose-500/30 blur-md" />
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 border-2 border-white flex items-center justify-center shadow-xl shadow-rose-500/50 text-white font-bold text-sm">
                  {currentUserAvatar}
                </div>
                <div className="absolute -top-7 px-2 py-0.5 bg-slate-900/90 border border-rose-500/40 rounded-full text-[10px] text-white font-bold whitespace-nowrap shadow-md">
                  You ({currentUserName})
                </div>
              </div>
            </div>
          )}

          {/* Remote Partner Touch Point */}
          {remoteTouch && remoteTouch.isActive && (
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-150"
              style={{ left: `${remoteTouch.x}%`, top: `${remoteTouch.y}%` }}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute w-28 h-28 rounded-full bg-amber-500/20 animate-ping" />
                <div className="absolute w-20 h-20 rounded-full bg-amber-500/30 blur-md" />
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-purple-500 border-2 border-white flex items-center justify-center shadow-xl shadow-amber-500/50 text-white font-bold text-sm">
                  {partner?.avatar || '💖'}
                </div>
                <div className="absolute -top-7 px-2 py-0.5 bg-slate-900/90 border border-amber-500/40 rounded-full text-[10px] text-white font-bold whitespace-nowrap shadow-md">
                  {partner ? partner.name : partnerName}
                </div>
              </div>
            </div>
          )}

          {/* Status Badge in Center bottom */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <div className={`px-4 py-2 rounded-full border backdrop-blur-md text-xs font-bold shadow-xl flex items-center gap-2 transition-all ${
              isThumbKissAligned
                ? 'bg-gradient-to-r from-rose-500/80 to-amber-500/80 border-amber-300 text-white shadow-rose-500/50 scale-110 animate-pulse'
                : isBothTouching
                ? 'bg-rose-500/30 border-rose-400 text-rose-200 shadow-rose-500/30 scale-105'
                : localTouch
                ? 'bg-slate-900/80 border-slate-700 text-slate-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              {isThumbKissAligned ? (
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-spin" />
              ) : (
                <Heart className={`w-4 h-4 ${isBothTouching ? 'text-rose-400 fill-rose-400 animate-bounce' : 'text-slate-500'}`} />
              )}
              <span>
                {isThumbKissAligned
                  ? '💋 THUMBKISS! Fingers Aligned Across Distance! 💋'
                  : isBothTouching
                  ? '✨ Holding Hands Together ✨ (Slide fingers closer for ThumbKiss)'
                  : localTouch
                  ? `Waiting for ${partner ? partner.name : partnerName} to touch...`
                  : remoteTouch?.isActive
                  ? `${partner ? partner.name : partnerName} is touching the screen! Place your finger to connect.`
                  : 'Touch anywhere to begin'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
