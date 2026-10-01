import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  Heart,
  Volume2,
  VolumeX,
  RefreshCw,
  Lock,
  Activity,
  Minimize2,
  Maximize2,
  GripHorizontal,
  Gamepad2,
  Sparkles,
  Waves,
  Clock,
} from 'lucide-react';
import { CallStatus } from '../types';
import { NetworkHealthOverlay } from './NetworkHealthOverlay';
import { CallDiagnosticsModal } from './CallDiagnosticsModal';
import type { NetworkQualityStats } from '../utils/webrtc';
import { attachStreamToAudioContext, unlockAudioContext } from '../utils/sounds';

interface AudioCallModalProps {
  partnerName: string;
  partnerAvatar: string;
  callStatus: CallStatus;
  isMuted: boolean;
  onToggleMute: () => void;
  onUpgradeToVideo: () => void;
  onEndCall: () => void;
  onSendLoveBurst: (emoji: string) => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onReconnectCall?: () => void;
  getNetworkStats?: () => Promise<NetworkQualityStats>;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onOpenGames?: () => void;
  isNoiseCancellationActive?: boolean;
  onToggleNoiseCancellation?: () => void;
  isEchoSuppressionActive?: boolean;
  onToggleEchoSuppression?: () => void;
  partnerIsMuted?: boolean;
}

export const AudioCallModal: React.FC<AudioCallModalProps> = ({
  partnerName,
  partnerAvatar,
  callStatus,
  isMuted,
  onToggleMute,
  onUpgradeToVideo,
  onEndCall,
  onSendLoveBurst,
  localStream,
  remoteStream,
  onReconnectCall,
  getNetworkStats,
  isMinimized = false,
  onToggleMinimize,
  onOpenGames,
  isNoiseCancellationActive,
  onToggleNoiseCancellation,
  isEchoSuppressionActive,
  onToggleEchoSuppression,
  partnerIsMuted = false,
}) => {
  const [duration, setDuration] = useState(0);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsNativeFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsNativeFullscreen(false);
    }
  };

  // Play audio safely
  const attemptPlayAudio = useCallback(async () => {
    unlockAudioContext();
    if (!remoteAudioRef.current) return;
    try {
      await remoteAudioRef.current.play();
      setIsAutoplayBlocked(false);
    } catch (err) {
      console.warn('Audio autoplay blocked, requiring user interaction:', err);
      setIsAutoplayBlocked(true);
    }
  }, []);

  // Bind remote audio stream
  useEffect(() => {
    if (!remoteStream) return;

    // Direct Web Audio API hardware output route
    const cleanupAudio = attachStreamToAudioContext(remoteStream);

    if (remoteAudioRef.current) {
      // Unmute all audio tracks and attach onunmute listener
      remoteStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
        track.onunmute = () => {
          attemptPlayAudio();
        };
      });
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      attemptPlayAudio();

      const handleTrackAdded = () => {
        attemptPlayAudio();
      };
      remoteStream.addEventListener('addtrack', handleTrackAdded);
      return () => {
        cleanupAudio();
        remoteStream.removeEventListener('addtrack', handleTrackAdded);
      };
    }

    return () => {
      cleanupAudio();
    };
  }, [remoteStream, attemptPlayAudio]);

  // Audio unlock on user touch/click/key
  useEffect(() => {
    const unlock = () => {
      attemptPlayAudio();
    };
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [attemptPlayAudio]);

  // Duration timer
  useEffect(() => {
    if (callStatus !== 'connected') {
      setDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  // Handle dragging the floating mini card
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);

    const initialX = miniPosition?.x ?? (window.innerWidth - 320);
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
      const newY = Math.max(12, Math.min(window.innerHeight - 80, dragRef.current.initialY + deltaY));

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

  // Audio wave visualizer animation
  useEffect(() => {
    if (isMinimized) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let phase = 0;

    const render = () => {
      phase += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isTalking = callStatus === 'connected';
      const amplitude = isTalking ? 24 : 8;

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#00a884'; // Haven Green

      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 +
          Math.sin(x * 0.03 + phase) * amplitude * Math.sin(x / canvas.width * Math.PI) +
          Math.sin(x * 0.06 - phase * 1.5) * (amplitude * 0.4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Second subtle line
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#25d366'; // Haven Bright Green
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 +
          Math.sin(x * 0.025 - phase * 0.8) * (amplitude * 0.7) * Math.sin(x / canvas.width * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [callStatus, isMinimized]);

  const handleReconnect = () => {
    setIsReconnecting(true);
    if (onReconnectCall) {
      onReconnectCall();
    }
    setTimeout(() => setIsReconnecting(false), 2500);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      {/* Remote Audio Element - Continuously Playing in Background */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        muted={isSpeakerMuted}
        className="sr-only"
      />

      {/* MINIMIZED FLOATING PILL / CARD (Background calling while playing games or browsing) */}
      {isMinimized ? (
        <div
          style={
            miniPosition
              ? { left: `${miniPosition.x}px`, top: `${miniPosition.y}px` }
              : undefined
          }
          className={`${
            miniPosition ? 'fixed' : 'fixed bottom-5 right-4 sm:bottom-6 sm:right-6'
          } z-[60] select-none bg-[#111b21]/95 backdrop-blur-md border-2 border-[#00a884] rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2.5 text-white transition-shadow hover:shadow-[#00a884]/30 max-w-[96vw] animate-fade-in`}
        >
          {/* Drag Handle */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="cursor-grab active:cursor-grabbing p-1 text-[#8696a0] hover:text-white transition shrink-0"
            title="Drag anywhere"
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>

          {/* Partner Avatar with Green Calling Glow */}
          <div
            onClick={onToggleMinimize}
            className="relative cursor-pointer shrink-0"
            title="Click to expand full call"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-[#00a884] shadow-[0_0_10px_rgba(0,168,132,0.5)] bg-[#202c33]">
              <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00a884] border-2 border-[#111b21] animate-pulse" />
          </div>

          {/* Name & Timer & Equalizer */}
          <div
            onClick={onToggleMinimize}
            className="flex flex-col min-w-0 cursor-pointer pr-1"
            title="Click to expand full call"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-[#e9edef] truncate max-w-[90px] sm:max-w-[120px]">
                {partnerName}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#00a884]/20 text-[#25d366] font-semibold shrink-0">
                Voice Call
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono font-medium text-[#00a884]">
                {callStatus === 'connected' ? formatDuration(duration) : `${callStatus}...`}
              </span>
              {callStatus === 'connected' && (
                <div className="flex items-center gap-0.5 h-3 shrink-0">
                  <span className="w-0.5 bg-[#00a884] rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-1.5" />
                  <span className="w-0.5 bg-[#25d366] rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.15s] h-3" />
                  <span className="w-0.5 bg-[#00a884] rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.3s] h-2" />
                  <span className="w-0.5 bg-[#25d366] rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.1s] h-2.5" />
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-[#222e35]">
            {/* Quick Love Ping */}
            <button
              type="button"
              onClick={() => onSendLoveBurst('❤️')}
              className="p-1.5 rounded-full hover:bg-white/10 text-rose-400 hover:text-rose-300 transition text-sm cursor-pointer"
              title="Send love heart"
            >
              ❤️
            </button>

            {/* Active Noise Cancellation Toggle in Mini Bar (Desktop/Tablet) */}
            <button
              id="btn-mini-toggle-audio-call-anc"
              type="button"
              onClick={handleToggleNC}
              className={`hidden md:inline-flex p-2 rounded-full transition cursor-pointer ${
                isNC
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                  : 'bg-[#202c33] text-slate-400 hover:bg-[#2a3942]'
              }`}
              title={isNC ? 'Active Noise Cancellation: ACTIVE' : 'Active Noise Cancellation: OFF'}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isNC ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            </button>

            {/* Echo Suppression Toggle in Mini Bar (Desktop/Tablet) */}
            <button
              id="btn-mini-toggle-audio-call-aec"
              type="button"
              onClick={handleToggleEC}
              className={`hidden md:inline-flex p-2 rounded-full transition cursor-pointer ${
                isEC
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50'
                  : 'bg-[#202c33] text-slate-400 hover:bg-[#2a3942]'
              }`}
              title={isEC ? 'Echo Suppression: ACTIVE' : 'Echo Suppression: OFF'}
            >
              <Waves className={`w-3.5 h-3.5 ${isEC ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
            </button>

            {/* Mute Mic - Always visible on both mobile and computer */}
            <button
              type="button"
              onClick={onToggleMute}
              className={`p-2 rounded-full transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942]'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            {/* Speaker Mute (Desktop/Tablet) */}
            <button
              type="button"
              onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
              className={`hidden sm:inline-flex p-2 rounded-full transition cursor-pointer ${
                isSpeakerMuted
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942]'
              }`}
              title={isSpeakerMuted ? 'Turn speaker on' : 'Mute speaker'}
            >
              {isSpeakerMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Play Games Button in Mini Bar (Desktop/Tablet) */}
            {onOpenGames && (
              <button
                type="button"
                onClick={onOpenGames}
                className="hidden md:inline-flex p-2 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition cursor-pointer"
                title="Play couple games while talking"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-rose-400" />
              </button>
            )}

            {/* Maximize / Expand Call Button */}
            {onToggleMinimize && (
              <button
                type="button"
                onClick={onToggleMinimize}
                className="p-2 rounded-full bg-[#00a884]/20 hover:bg-[#00a884]/40 text-[#25d366] transition cursor-pointer"
                title="Expand to full call"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Hang Up Button */}
            <button
              type="button"
              onClick={onEndCall}
              className="p-2 rounded-full bg-[#ea0038] hover:bg-[#d00030] text-white transition cursor-pointer shadow-md shrink-0"
              title="End Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* FULL SCREEN AUDIO CALL VIEW */
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-8 bg-gradient-to-b from-[#111b21] via-[#0c161c] to-[#0b141a] select-none font-sans overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00a884]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-2xl h-full flex flex-col items-center justify-between z-10">
            {/* Top Header */}
            <div className="w-full flex items-center justify-between z-10 gap-2">
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#202c33]/80 border border-[#222e35] text-xs text-[#00a884] font-medium shrink-0">
                  <Lock className="w-3 h-3 text-[#00a884]" />
                  <span className="hidden sm:inline">End-to-End Encrypted</span>
                  <span className="sm:hidden">Encrypted</span>
                </div>

                {/* Discreet Call Duration Timer */}
                <div
                  id="audio-call-header-timer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#202c33]/90 border border-[#222e35] text-xs font-mono font-medium text-emerald-400 shrink-0 shadow-2xs backdrop-blur-xs"
                  title={callStatus === 'connected' ? `Active call duration: ${formatDuration(duration)}` : 'Call connecting...'}
                >
                  <Clock className="w-3 h-3 text-emerald-400/80" />
                  <span className="tabular-nums tracking-wide">
                    {callStatus === 'connected' ? formatDuration(duration) : '00:00'}
                  </span>
                  {callStatus === 'connected' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Active Noise Cancellation Toggle Button */}
                <button
                  id="btn-anc-audio-call-header"
                  type="button"
                  onClick={handleToggleNC}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                    isNC
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
                      : 'bg-[#202c33] hover:bg-[#2a3942] text-slate-400 border border-[#222e35]'
                  }`}
                  title={
                    isNC
                      ? 'AI Noise Cancellation: ACTIVE (85Hz High-Pass + Dynamic Vocal Compressor + 128kbps Opus)'
                      : 'AI Noise Cancellation: OFF (Click to activate noise reduction)'
                  }
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isNC ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                  <span className="hidden sm:inline">{isNC ? 'ANC Active' : 'ANC Off'}</span>
                  <span className="sm:hidden">{isNC ? 'ANC' : 'Raw'}</span>
                </button>

                {/* Acoustic Echo Suppression Toggle Button */}
                <button
                  id="btn-echo-audio-call-header"
                  type="button"
                  onClick={handleToggleEC}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                    isEC
                      ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-cyan-500/10'
                      : 'bg-[#202c33] hover:bg-[#2a3942] text-slate-400 border border-[#222e35]'
                  }`}
                  title={
                    isEC
                      ? 'Acoustic Echo Suppression (AEC): ACTIVE (Hardware echo filtration eliminating speaker-mic feedback)'
                      : 'Acoustic Echo Suppression (AEC): OFF (Click to activate echo prevention)'
                  }
                >
                  <Waves className={`w-3.5 h-3.5 ${isEC ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                  <span className="hidden sm:inline">{isEC ? 'Echo Filtered' : 'Echo Off'}</span>
                  <span className="sm:hidden">{isEC ? 'AEC' : 'Echo Off'}</span>
                </button>

                <NetworkHealthOverlay
                  callStatus={callStatus}
                  getNetworkStats={getNetworkStats}
                  onReconnect={handleReconnect}
                  onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                />

                <button
                  id="btn-diagnostics-audio-call"
                  type="button"
                  onClick={() => setIsDiagnosticsOpen(true)}
                  className="p-1.5 rounded-full bg-[#00a884]/20 hover:bg-[#00a884]/30 border border-[#00a884]/40 text-[#25d366] transition-colors cursor-pointer"
                  title="Run audio and network diagnostics"
                >
                  <Activity className="w-3.5 h-3.5 text-[#00a884]" />
                </button>

                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  className="p-1.5 rounded-full bg-[#202c33] hover:bg-[#2a3942] border border-[#222e35] text-[#e9edef] transition-colors cursor-pointer"
                  title="Refresh Signal Route"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#00a884] ${isReconnecting ? 'animate-spin' : ''}`} />
                </button>

                {/* Play Games Button */}
                {onOpenGames && (
                  <button
                    id="btn-games-audio-call-header"
                    type="button"
                    onClick={onOpenGames}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs text-rose-300 transition-colors cursor-pointer"
                    title="Play couple games together while talking"
                  >
                    <Gamepad2 className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">Play Games</span>
                  </button>
                )}

                {/* Native Fullscreen Button */}
                <button
                  id="btn-fullscreen-audio-call"
                  type="button"
                  onClick={handleToggleNativeFullscreen}
                  className="p-1.5 rounded-full bg-[#202c33] hover:bg-[#2a3942] border border-[#222e35] text-xs text-[#e9edef] transition-colors cursor-pointer"
                  title={isNativeFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isNativeFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-blue-400" /> : <Maximize2 className="w-3.5 h-3.5 text-blue-400" />}
                </button>

                {/* Minimize Button */}
                {onToggleMinimize && (
                  <button
                    id="btn-minimize-audio-call"
                    type="button"
                    onClick={onToggleMinimize}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00a884]/20 hover:bg-[#00a884]/30 border border-[#00a884]/40 text-xs text-[#25d366] font-semibold transition-colors cursor-pointer shadow-xs"
                    title="Minimize call to floating window"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-[#00a884]" />
                    <span className="hidden sm:inline">Minimize</span>
                  </button>
                )}
              </div>
            </div>

            {/* Autoplay Banner */}
            {isAutoplayBlocked && (
              <div
                onClick={attemptPlayAudio}
                className="px-4 py-1.5 bg-[#00a884] text-white rounded-full text-xs font-semibold animate-bounce cursor-pointer flex items-center gap-1.5 z-20 shadow-lg"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Tap to Unmute Audio</span>
              </div>
            )}

            {/* Center: Partner Avatar & Name */}
            <div className="flex flex-col items-center z-10 my-auto">
              <div className="relative mb-6">
                <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-[#00a884] shadow-2xl bg-[#202c33]">
                  <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                </div>
                {callStatus === 'connected' && (
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-[#00a884] border-3 border-[#111b21] flex items-center justify-center text-white shadow-md">
                    <Volume2 className="w-5 h-5 text-white animate-pulse" />
                  </div>
                )}
              </div>

              <h3 className="text-2xl font-bold text-[#e9edef] tracking-tight">{partnerName}</h3>

              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${callStatus === 'connected' ? 'bg-[#00a884]' : 'bg-amber-400 animate-pulse'}`} />
                <p className="text-sm text-[#8696a0] font-medium capitalize">
                  {callStatus === 'connected' ? formatDuration(duration) : `${callStatus}...`}
                </p>
              </div>

              {partnerIsMuted && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 font-medium mt-2 shadow-xs animate-fade-in">
                  <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>{partnerName} is muted</span>
                </div>
              )}

              {/* Quality & Noise Cancellation Status Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#202c33]/80 border border-[#222e35] text-[11px] text-[#00a884] font-medium mt-2.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Studio HD Voice &bull; {isNC ? 'ANC Active' : 'Raw Audio'} &bull; {isEC ? 'Echo Filtered' : 'Echo Off'}</span>
              </div>

              {/* Real-time Voice Wave Canvas */}
              <div className="w-64 h-16 mt-6">
                <canvas ref={canvasRef} width={256} height={64} className="w-full h-full" />
              </div>
            </div>

            {/* Floating Quick Reactions */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#202c33] border border-[#222e35] shadow-lg mb-6 z-10">
              {['❤️', '💖', '🥰', '😘', '🔥', '👏'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSendLoveBurst(emoji)}
                  className="text-xl p-1 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Controls Bar (Haven Call UI) */}
            <div className="flex items-center gap-4 z-10">
              {/* Mute Mic */}
              <button
                type="button"
                onClick={onToggleMute}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg ${
                  isMuted
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942] border border-[#222e35]'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Speaker Mute */}
              <button
                type="button"
                onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg ${
                  isSpeakerMuted
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942] border border-[#222e35]'
                }`}
                title={isSpeakerMuted ? 'Turn speaker on' : 'Mute speaker'}
              >
                {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* Play Couple Games while calling */}
              {onOpenGames && (
                <button
                  type="button"
                  onClick={onOpenGames}
                  className="w-13 h-13 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-rose-400 border border-[#222e35] flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg"
                  title="Play games together while talking"
                >
                  <Gamepad2 className="w-5 h-5" />
                </button>
              )}

              {/* Active Noise Cancellation Toggle */}
              <button
                id="btn-toggle-audio-call-anc"
                type="button"
                onClick={handleToggleNC}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg ${
                  isNC
                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/50'
                    : 'bg-[#202c33] text-slate-400 hover:bg-[#2a3942] border border-[#222e35]'
                }`}
                title={isNC ? 'Active Noise Cancellation: ACTIVE (Click to disable)' : 'Active Noise Cancellation: OFF (Click to enable)'}
              >
                <Sparkles className={`w-5 h-5 ${isNC ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              </button>

              {/* Echo Suppression Toggle */}
              <button
                id="btn-toggle-audio-call-aec"
                type="button"
                onClick={handleToggleEC}
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg ${
                  isEC
                    ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/50'
                    : 'bg-[#202c33] text-slate-400 hover:bg-[#2a3942] border border-[#222e35]'
                }`}
                title={isEC ? 'Acoustic Echo Suppression: ACTIVE (Click to disable)' : 'Acoustic Echo Suppression: OFF (Click to enable)'}
              >
                <Waves className={`w-5 h-5 ${isEC ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
              </button>

              {/* Upgrade to Video */}
              <button
                type="button"
                onClick={onUpgradeToVideo}
                className="w-13 h-13 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] border border-[#222e35] flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg"
                title="Switch to HD Video Call"
              >
                <Video className="w-5 h-5" />
              </button>

              {/* Minimize Call */}
              {onToggleMinimize && (
                <button
                  type="button"
                  onClick={onToggleMinimize}
                  className="w-13 h-13 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] border border-[#222e35] flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg"
                  title="Minimize Call to floating window"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              )}

              {/* Hang Up (Haven Red) */}
              <button
                type="button"
                onClick={onEndCall}
                className="w-14 h-14 rounded-full bg-[#ea0038] hover:bg-[#d00030] text-white flex items-center justify-center shadow-xl shadow-rose-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer ml-2"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive In-Call Diagnostics Modal */}
      <CallDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        callType="audio"
        onAutoFixAndReconnect={async () => {
          unlockAudioContext();
          if (remoteAudioRef.current && remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.muted = false;
            await remoteAudioRef.current.play().catch(() => {});
          }
          if (onReconnectCall) {
            onReconnectCall();
          }
        }}
      />
    </>
  );
};
