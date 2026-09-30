import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  SwitchCamera,
  Share2,
  ShieldCheck,
  Users,
  Copy,
  Check,
  Sparkles,
  Volume2,
  Waves,
  Minimize2,
  Maximize2,
  GripHorizontal,
} from 'lucide-react';
import { CallType, SquadCallParticipant, UserProfile } from '../types';
import { VerifiedBadgeOverlay } from './common/VerifiedBadgeOverlay';
import { unlockAudioContext } from '../utils/sounds';

interface SquadCallModalProps {
  roomId: string;
  groupName?: string;
  groupEmoji?: string;
  callType: CallType;
  localUser: UserProfile;
  participants: SquadCallParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>; // socketId -> MediaStream
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  speakingMap: Record<string, boolean>; // 'local' or socketId -> boolean
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onToggleScreenShare: () => void;
  onLeaveCall: () => void;
  onSendReaction?: (emoji: string) => void;
  isNoiseCancellationActive?: boolean;
  onToggleNoiseCancellation?: () => void;
  isEchoSuppressionActive?: boolean;
  onToggleEchoSuppression?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const SquadCallModal: React.FC<SquadCallModalProps> = ({
  roomId,
  groupName,
  groupEmoji = '🎉',
  callType,
  localUser,
  participants,
  localStream,
  remoteStreams,
  isMuted,
  isVideoOff,
  isScreenSharing,
  speakingMap,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onToggleScreenShare,
  onLeaveCall,
  onSendReaction,
  isNoiseCancellationActive,
  onToggleNoiseCancellation,
  isEchoSuppressionActive,
  onToggleEchoSuppression,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const [duration, setDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);
  const [localNC, setLocalNC] = useState(true);
  const isNC = isNoiseCancellationActive !== undefined ? isNoiseCancellationActive : localNC;

  const handleToggleNC = () => {
    if (onToggleNoiseCancellation) {
      onToggleNoiseCancellation();
    } else {
      setLocalNC((prev) => !prev);
    }
  };

  const [localEC, setLocalEC] = useState(true);
  const isEC = isEchoSuppressionActive !== undefined ? isEchoSuppressionActive : localEC;

  const handleToggleEC = () => {
    if (onToggleEchoSuppression) {
      onToggleEchoSuppression();
    } else {
      setLocalEC((prev) => !prev);
    }
  };

  const [miniPosition, setMiniPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);

    const initialX = miniPosition?.x ?? (window.innerWidth - 340);
    const initialY = miniPosition?.y ?? (window.innerHeight - 100);

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX,
      initialY,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragRef.current.startX;
      const deltaY = clientY - dragRef.current.startY;

      const newX = Math.max(12, Math.min(window.innerWidth - 300, dragRef.current.initialX + deltaX));
      const newY = Math.max(12, Math.min(window.innerHeight - 90, dragRef.current.initialY + deltaY));

      setMiniPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  const handleToggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsNativeFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsNativeFullscreen(false);
    }
  };

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Call timer
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  // Bind remote streams to video elements and ensure unmuted audio playback
  useEffect(() => {
    remoteStreams.forEach((stream, socketId) => {
      // Ensure all tracks are enabled
      stream.getTracks().forEach((track) => {
        track.enabled = true;
      });
      const videoEl = remoteVideoRefs.current.get(socketId);
      if (videoEl) {
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
        }
        videoEl.muted = false;
        videoEl.play().catch(() => {});
      }
    });
  }, [remoteStreams]);

  // Global user interaction listener to unlock audio output if restricted by browser autoplay policies
  useEffect(() => {
    const unlockMedia = () => {
      unlockAudioContext();
      remoteVideoRefs.current.forEach((el) => {
        if (el) {
          el.muted = false;
          if (el.paused) {
            el.play().catch(() => {});
          }
        }
      });
    };
    window.addEventListener('click', unlockMedia, { passive: true });
    window.addEventListener('touchstart', unlockMedia, { passive: true });
    window.addEventListener('keydown', unlockMedia, { passive: true });
    return () => {
      window.removeEventListener('click', unlockMedia);
      window.removeEventListener('touchstart', unlockMedia);
      window.removeEventListener('keydown', unlockMedia);
    };
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCopyInvite = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('type', 'friends');
    if (groupName) url.searchParams.set('group', groupName);

    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleEmojiClick = (emoji: string) => {
    if (onSendReaction) {
      onSendReaction(emoji);
    }
    const newReaction = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      x: 30 + Math.random() * 40,
    };
    setActiveReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2000);
  };

  // Remote participants list (excluding local user)
  const remoteParticipants = participants.filter((p) => p.userId !== localUser.id);
  const totalCount = Math.min(5, 1 + remoteParticipants.length);
  const slotsRemaining = Math.max(0, 5 - totalCount);

  // Dynamic Grid layout classes based on participant count
  const getGridClass = () => {
    if (totalCount === 1) return 'grid-cols-1 max-w-lg';
    if (totalCount === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-4xl';
    if (totalCount === 3) return 'grid-cols-1 sm:grid-cols-3 max-w-5xl';
    if (totalCount === 4) return 'grid-cols-2 max-w-4xl';
    return 'grid-cols-2 sm:grid-cols-3 max-w-5xl'; // 5 members
  };

  return (
    <>
      {isMinimized ? (
        /* MINIMIZED FLOATING SQUAD CALL DOCK (Movable PiP pill) */
        <div
          style={
            miniPosition
              ? { left: `${miniPosition.x}px`, top: `${miniPosition.y}px` }
              : undefined
          }
          className={`${
            miniPosition ? 'fixed' : 'fixed bottom-5 right-4 sm:bottom-6 sm:right-6'
          } z-[60] select-none bg-slate-900/95 backdrop-blur-md border-2 border-indigo-500 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2.5 text-white transition-shadow hover:shadow-indigo-500/30 max-w-[96vw] animate-fade-in font-sans`}
        >
          {/* Drag Handle */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-white transition shrink-0"
            title="Drag squad call anywhere"
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>

          {/* Group Icon with Calling Glow */}
          <div
            onClick={onToggleMinimize}
            className="relative cursor-pointer shrink-0"
            title="Click to expand squad call"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(99,102,241,0.5)]">
              {groupEmoji}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
          </div>

          {/* Name & Participant count & Timer */}
          <div
            onClick={onToggleMinimize}
            className="flex flex-col min-w-0 cursor-pointer pr-1"
            title="Click to expand squad call"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[90px] sm:max-w-[120px]">
                {groupName || 'Squad Call'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold shrink-0">
                {totalCount}/5 in call
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono font-medium text-emerald-400">
                {formatDuration(duration)}
              </span>
              {isNC && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-300 font-medium">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> ANC
                </span>
              )}
              {isEC && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-300 font-medium">
                  <Waves className="w-2.5 h-2.5 text-cyan-400" /> Echo Filter
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-800">
            {/* Quick Emoji Reaction */}
            <button
              type="button"
              onClick={() => handleEmojiClick('🎉')}
              className="p-1.5 rounded-full hover:bg-white/10 text-amber-300 transition text-sm cursor-pointer"
              title="Send cheers"
            >
              🎉
            </button>

            {/* Echo Suppression Toggle in Mini Bar */}
            <button
              id="btn-mini-toggle-squad-call-aec"
              type="button"
              onClick={handleToggleEC}
              className={`p-2 rounded-full transition cursor-pointer ${
                isEC
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title={isEC ? 'Echo Suppression: ACTIVE' : 'Echo Suppression: OFF'}
            >
              <Waves className={`w-3.5 h-3.5 ${isEC ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
            </button>

            {/* Mute Mic */}
            <button
              type="button"
              onClick={onToggleMute}
              className={`p-2 rounded-full transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* Toggle Video (if video call) */}
            {callType === 'video' && (
              <button
                type="button"
                onClick={onToggleVideo}
                className={`p-2 rounded-full transition cursor-pointer ${
                  isVideoOff
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
                title={isVideoOff ? 'Turn video on' : 'Turn video off'}
              >
                {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <VideoIcon className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Maximize Button */}
            {onToggleMinimize && (
              <button
                type="button"
                onClick={onToggleMinimize}
                className="p-2 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 transition cursor-pointer"
                title="Expand to full screen squad call"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Leave Call */}
            <button
              type="button"
              onClick={onLeaveCall}
              className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-md"
              title="Leave Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* FULL SCREEN SQUAD CALL VIEW */
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-hidden animate-in fade-in duration-300 select-none">
          {/* Top Bar Header */}
          <div className="relative z-10 px-4 py-3 sm:px-6 sm:py-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-3">
            {/* Left: Squad info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-xl shrink-0">
                {groupEmoji}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-white truncate font-serif flex items-center gap-1.5">
                  <span>{groupName || 'Squad Call'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-sans font-medium">
                    {callType === 'video' ? 'HD Video' : 'Audio Room'}
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {totalCount}/5 in Call
                  </span>
                  <span>•</span>
                  <span className="font-mono text-slate-300">{formatDuration(duration)}</span>
                </div>
              </div>
            </div>

            {/* Right: Security, Fullscreen & Minimize Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Active Noise Cancellation Toggle Button */}
              <button
                id="btn-anc-squad-call-header"
                type="button"
                onClick={handleToggleNC}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isNC
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
                title={
                  isNC
                    ? 'Active Noise Cancellation: ON (85Hz High-Pass + Vocal Intelligibility DSP)'
                    : 'Active Noise Cancellation: OFF (Click to enable noise reduction)'
                }
              >
                <Sparkles className={`w-3.5 h-3.5 ${isNC ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">{isNC ? 'ANC Active' : 'ANC Off'}</span>
                <span className="sm:hidden">{isNC ? 'ANC' : 'Raw'}</span>
              </button>

              {/* Acoustic Echo Suppression Toggle Button */}
              <button
                id="btn-echo-squad-call-header"
                type="button"
                onClick={handleToggleEC}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isEC
                    ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-cyan-500/10'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                }`}
                title={
                  isEC
                    ? 'Acoustic Echo Suppression (AEC): ON (Hardware echo elimination avoiding feedback across squad members)'
                    : 'Acoustic Echo Suppression (AEC): OFF (Click to activate echo prevention)'
                }
              >
                <Waves className={`w-3.5 h-3.5 ${isEC ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">{isEC ? 'Echo Filtered' : 'Echo Off'}</span>
                <span className="sm:hidden">{isEC ? 'AEC' : 'Echo Off'}</span>
              </button>

              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-400 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DTLS-SRTP Mesh</span>
              </div>

              {slotsRemaining > 0 && (
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Copy link to invite friends into the squad call"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : `Invite (${slotsRemaining} slots left)`}</span>
                </button>
              )}

              {/* Native OS Fullscreen Toggle */}
              <button
                id="btn-native-fullscreen-squad-call"
                type="button"
                onClick={handleToggleNativeFullscreen}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title={isNativeFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isNativeFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-blue-400" /> : <Maximize2 className="w-3.5 h-3.5 text-blue-400" />}
              </button>

              {/* Minimize Squad Call */}
              {onToggleMinimize && (
                <button
                  id="btn-minimize-squad-call"
                  type="button"
                  onClick={onToggleMinimize}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-xs text-indigo-300 font-semibold transition cursor-pointer shadow-xs"
                  title="Minimize squad call to floating window"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Minimize</span>
                </button>
              )}
            </div>
          </div>

      {/* Floating Reaction Emojis Container */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {activeReactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-24 text-4xl animate-in fade-in slide-in-from-bottom-8 duration-700 transition-all"
            style={{ left: `${r.x}%`, animationDuration: '2s' }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Main Video Grid */}
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        <div className={`w-full grid gap-3.5 sm:gap-4 mx-auto ${getGridClass()}`}>
          {/* Local User Tile */}
          <div
            className={`relative aspect-video sm:aspect-4/3 rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border-2 transition-all duration-200 flex items-center justify-center shadow-lg ${
              speakingMap['local']
                ? 'border-emerald-400 ring-4 ring-emerald-500/30 shadow-emerald-500/20'
                : 'border-slate-800'
            }`}
          >
            {callType === 'video' && !isVideoOff ? (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Visual Verified Badge Overlay on Local User's Video Preview */}
                <VerifiedBadgeOverlay
                  videoRef={localVideoRef}
                  isVideoOff={isVideoOff}
                  position="top-right"
                  size="md"
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 shadow-md transition-all ${
                    speakingMap['local']
                      ? 'border-emerald-400 ring-4 ring-emerald-400/40 scale-105'
                      : 'border-slate-700'
                  }`}
                >
                  <img src={localUser.avatar} alt={localUser.name} className="w-full h-full object-cover" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white flex items-center justify-center gap-1">
                    <span>{localUser.name}</span>
                    <span className="text-[11px] text-indigo-400 font-semibold">(You)</span>
                  </p>
                  {speakingMap['local'] && (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
                      <Volume2 className="w-3 h-3 animate-pulse" /> Speaking...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Bottom-left user name pill */}
            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white flex items-center gap-1.5 border border-white/10">
              <span className="truncate max-w-[120px]">{localUser.name} (You)</span>
              {isMuted ? (
                <MicOff className="w-3 h-3 text-rose-400" />
              ) : speakingMap['local'] ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ) : (
                <Mic className="w-3 h-3 text-emerald-400" />
              )}
            </div>

            {/* Top-right indicator badges */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
              {isVideoOff && callType === 'video' && (
                <span className="p-1 rounded-lg bg-black/60 text-slate-400 text-xs border border-white/10">
                  <VideoOff className="w-3.5 h-3.5 text-amber-400" />
                </span>
              )}
              {isScreenSharing && (
                <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold">
                  Sharing Screen
                </span>
              )}
            </div>
          </div>

          {/* Remote Participants Tiles */}
          {remoteParticipants.map((participant) => {
            const isSpeaking = !!speakingMap[participant.socketId];
            const hasStream = remoteStreams.has(participant.socketId);
            const isVideoActive = callType === 'video' && !participant.isVideoOff;

            return (
              <div
                key={participant.socketId || participant.userId}
                className={`relative aspect-video sm:aspect-4/3 rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border-2 transition-all duration-200 flex items-center justify-center shadow-lg ${
                  isSpeaking
                    ? 'border-emerald-400 ring-4 ring-emerald-500/30 shadow-emerald-500/20'
                    : 'border-slate-800'
                }`}
              >
                {/* Remote Video Stream Element */}
                <video
                  ref={(el) => {
                    if (el) {
                      remoteVideoRefs.current.set(participant.socketId, el);
                      const stream = remoteStreams.get(participant.socketId);
                      if (stream && el.srcObject !== stream) {
                        el.srcObject = stream;
                        el.muted = false;
                        el.play().catch(() => {});
                      }
                    } else {
                      remoteVideoRefs.current.delete(participant.socketId);
                    }
                  }}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${isVideoActive && hasStream ? 'block' : 'hidden'}`}
                />

                {/* Dedicated Audio Element (guarantees audio playback even when participant video is off) */}
                {hasStream && (
                  <audio
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el) {
                        const stream = remoteStreams.get(participant.socketId);
                        if (stream && el.srcObject !== stream) {
                          el.srcObject = stream;
                          el.play().catch(() => {});
                        }
                      }
                    }}
                  />
                )}

                {/* Avatar Fallback if Video Off or Audio Call */}
                {(!isVideoActive || !hasStream) && (
                  <div className="flex flex-col items-center gap-2.5">
                    <div
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-3 shadow-md transition-all ${
                        isSpeaking
                          ? 'border-emerald-400 ring-4 ring-emerald-400/40 scale-105'
                          : 'border-slate-700'
                      }`}
                    >
                      <img src={participant.avatar} alt={participant.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white truncate max-w-[140px]">{participant.name}</p>
                      {isSpeaking ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
                          <Volume2 className="w-3 h-3 animate-pulse" /> Speaking...
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">In Call</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom-left user name pill */}
                <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white flex items-center gap-1.5 border border-white/10">
                  <span className="truncate max-w-[120px]">{participant.name}</span>
                  {participant.isMuted ? (
                    <MicOff className="w-3 h-3 text-rose-400" />
                  ) : isSpeaking ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ) : (
                    <Mic className="w-3 h-3 text-emerald-400" />
                  )}
                </div>

                {/* Top-right video off icon */}
                {participant.isVideoOff && callType === 'video' && (
                  <div className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-black/60 text-slate-400 text-xs border border-white/10">
                    <VideoOff className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty Invite Slot Tile (if squad has room for up to 5) */}
          {slotsRemaining > 0 && (
            <div
              onClick={handleCopyInvite}
              className="relative aspect-video sm:aspect-4/3 rounded-2xl sm:rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-indigo-950/20 transition-all duration-200 flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 group-hover:bg-indigo-500/20 border border-indigo-400/20 group-hover:border-indigo-400/40 flex items-center justify-center text-indigo-400 transition-all group-hover:scale-110">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                  Invite Squad Friend
                </p>
                <p className="text-[11px] text-slate-500 group-hover:text-indigo-300 mt-0.5">
                  {copiedLink ? '✓ Link copied to clipboard!' : `Click to copy link (${slotsRemaining} open)`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Emoji Bar */}
      <div className="px-4 py-2 flex items-center justify-center gap-2 border-t border-slate-900 bg-slate-950/80">
        <span className="text-[11px] text-slate-400 font-semibold mr-1 hidden sm:inline">Quick Vibe:</span>
        {['🎉', '🔥', '😂', '❤️', '👏', '🙌'].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleEmojiClick(emoji)}
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-125 text-base flex items-center justify-center transition-all cursor-pointer shadow-xs"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Bottom Controls Dock */}
      <div className="px-4 py-4 sm:px-6 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-center gap-3 sm:gap-5">
        {/* Toggle Microphone */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>

        {/* Toggle Active Noise Cancellation */}
        <button
          id="btn-toggle-squad-call-anc"
          type="button"
          onClick={handleToggleNC}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer ${
            isNC
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-emerald-500/10'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
          }`}
          title={isNC ? 'Active Noise Cancellation: ON (Tap to disable)' : 'Active Noise Cancellation: OFF (Tap to enable)'}
        >
          <Sparkles className={`w-5 h-5 sm:w-6 sm:h-6 ${isNC ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
        </button>

        {/* Toggle Acoustic Echo Suppression */}
        <button
          id="btn-toggle-squad-call-aec"
          type="button"
          onClick={handleToggleEC}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer ${
            isEC
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30 shadow-cyan-500/10'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
          }`}
          title={isEC ? 'Acoustic Echo Suppression: ON (Tap to disable)' : 'Acoustic Echo Suppression: OFF (Tap to enable)'}
        >
          <Waves className={`w-5 h-5 sm:w-6 sm:h-6 ${isEC ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
        </button>

        {/* Toggle Video Camera (if video call) */}
        {callType === 'video' && (
          <button
            type="button"
            onClick={onToggleVideo}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer ${
              isVideoOff
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        )}

        {/* Flip Camera (Mobile/Tablet) */}
        {callType === 'video' && !isVideoOff && (
          <button
            type="button"
            onClick={onSwitchCamera}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
            title="Switch front/back camera"
          >
            <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Screen Share */}
        {callType === 'video' && (
          <button
            type="button"
            onClick={onToggleScreenShare}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer ${
              isScreenSharing
                ? 'bg-indigo-600 text-white border border-indigo-400'
                : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title={isScreenSharing ? 'Stop screen sharing' : 'Share your screen'}
          >
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Minimize Call */}
        {onToggleMinimize && (
          <button
            id="btn-bottom-minimize-squad-call"
            type="button"
            onClick={onToggleMinimize}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
            title="Minimize squad call"
          >
            <Minimize2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Leave Call Button */}
        <button
          type="button"
          onClick={onLeaveCall}
          className="w-14 h-12 sm:w-16 sm:h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all active:scale-95 cursor-pointer ml-2"
          title="Leave squad call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
    )}

      {/* Background audio elements for all remote peers (ensures audio plays even if video is off or callType is audio) */}
      <div className="fixed -top-96 -left-96 w-1 h-1 opacity-0 pointer-events-none" aria-hidden="true">
        {Array.from(remoteStreams.entries()).map(([peerSocketId, stream]) => (
          <audio
            key={peerSocketId}
            autoPlay
            playsInline
            ref={(el) => {
              if (el && el.srcObject !== stream) {
                el.srcObject = stream;
                el.play().catch(() => {});
              }
            }}
          />
        ))}
      </div>
    </>
  );
};
