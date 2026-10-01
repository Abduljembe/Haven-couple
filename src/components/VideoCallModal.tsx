import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  SwitchCamera,
  Share2,
  Heart,
  Sparkles,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  Activity,
  GripHorizontal,
  Waves,
  Clock,
} from 'lucide-react';
import { NetworkHealthOverlay } from './NetworkHealthOverlay';
import { CallDiagnosticsModal } from './CallDiagnosticsModal';
import type { NetworkQualityStats } from '../utils/webrtc';
import { attachStreamToAudioContext, unlockAudioContext } from '../utils/sounds';

interface VideoCallModalProps {
  partnerName: string;
  partnerAvatar: string;
  callStatus: 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected' | 'declined' | 'ended';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onSendLoveBurst: (emoji: string) => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onReconnectCall?: () => void;
  getNetworkStats?: () => Promise<NetworkQualityStats>;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  isNoiseCancellationActive?: boolean;
  onToggleNoiseCancellation?: () => void;
  isEchoSuppressionActive?: boolean;
  onToggleEchoSuppression?: () => void;
  partnerIsMuted?: boolean;
  partnerIsVideoOff?: boolean;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  partnerName,
  partnerAvatar,
  callStatus,
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onToggleScreenShare,
  onEndCall,
  onSendLoveBurst,
  localStream,
  remoteStream,
  onReconnectCall,
  getNetworkStats,
  isMinimized = false,
  onToggleMinimize,
  isNoiseCancellationActive,
  onToggleNoiseCancellation,
  isEchoSuppressionActive,
  onToggleEchoSuppression,
  partnerIsMuted = false,
  partnerIsVideoOff = false,
}) => {
  const [duration, setDuration] = useState(0);
  const [isPipTopLeft, setIsPipTopLeft] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [hasRemoteVideoTrack, setHasRemoteVideoTrack] = useState(false);
  const [hasRemoteAudioTrack, setHasRemoteAudioTrack] = useState(false);
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
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Handle dragging the floating mini PiP card
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);

    const initialX = miniPosition?.x ?? (window.innerWidth - 340);
    const initialY = miniPosition?.y ?? (window.innerHeight - 200);

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

      const newX = Math.max(12, Math.min(window.innerWidth - 280, dragRef.current.initialX + deltaX));
      const newY = Math.max(12, Math.min(window.innerHeight - 170, dragRef.current.initialY + deltaY));

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

  // Bind local stream to local preview (Self preview is muted to prevent audio feedback)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOff, isMinimized]);

  // Handle playing remote media with unmuted audio as default, with autoplay fallback unlock
  const attemptPlayMedia = useCallback(async () => {
    // 1. Play dedicated remote audio element for guaranteed voice output
    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.muted = false;
        await remoteAudioRef.current.play();
      } catch (err) {
        console.debug('[VideoCall] Remote audio autoplay pending user gesture:', err);
      }
    }

    // 2. Play remote video stream
    if (remoteVideoRef.current) {
      try {
        // Default to unmuted so the caller's voice is heard immediately
        remoteVideoRef.current.muted = false;
        await remoteVideoRef.current.play();
        setIsAutoplayBlocked(false);
      } catch (err: any) {
        console.warn('[VideoCall] Unmuted autoplay blocked by browser policy:', err);
        // Fallback: mute video temporarily to start frame decoding immediately, prompt user to tap
        try {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = true;
            await remoteVideoRef.current.play();
            setIsAutoplayBlocked(true);
          }
        } catch (err2) {
          console.warn('[VideoCall] Video play() error:', err2);
        }
      }
    }
  }, []);

  const handleUserUnmute = useCallback(() => {
    unlockAudioContext();
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play().catch(() => {});
    }
    setIsAutoplayBlocked(false);
  }, []);

  // Bind remote media stream (both Video Element and Web Audio Context)
  useEffect(() => {
    if (!remoteStream) {
      setHasRemoteVideoTrack(false);
      setHasRemoteAudioTrack(false);
      return;
    }

    const checkTracks = () => {
      const videoTracks = remoteStream.getVideoTracks();
      const audioTracks = remoteStream.getAudioTracks();
      const hasLiveVideo = videoTracks.length > 0 && videoTracks.some((t) => t.readyState === 'live');
      const hasLiveAudio = audioTracks.length > 0 && audioTracks.some((t) => t.readyState === 'live');
      setHasRemoteVideoTrack(hasLiveVideo);
      setHasRemoteAudioTrack(hasLiveAudio);
    };

    checkTracks();

    // Ensure all remote tracks are unmuted and enabled
    const unlisteners: (() => void)[] = [];
    remoteStream.getVideoTracks().forEach((t) => {
      t.enabled = true;
      if (t.readyState === 'live') {
        setHasRemoteVideoTrack(true);
      }
      const onUnmute = () => {
        setHasRemoteVideoTrack(true);
        attemptPlayMedia();
      };
      t.addEventListener('unmute', onUnmute);
      unlisteners.push(() => t.removeEventListener('unmute', onUnmute));
    });
    remoteStream.getAudioTracks().forEach((t) => {
      t.enabled = true;
      const onUnmute = () => {
        setHasRemoteAudioTrack(true);
        attemptPlayMedia();
      };
      t.addEventListener('unmute', onUnmute);
      unlisteners.push(() => t.removeEventListener('unmute', onUnmute));
    });

    // Attach to audio & video elements
    if (remoteAudioRef.current) {
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.play().catch(() => {});
    }

    if (remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      attemptPlayMedia();
    }

    // Direct Web Audio API pipeline: provides zero-latency hardware sound output
    const cleanupAudioContext = attachStreamToAudioContext(remoteStream);

    // Listen for track additions / removals
    const handleTrackEvent = () => {
      checkTracks();
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        attemptPlayMedia();
      }
    };

    remoteStream.addEventListener('addtrack', handleTrackEvent);
    remoteStream.addEventListener('removetrack', handleTrackEvent);

    return () => {
      cleanupAudioContext();
      unlisteners.forEach((fn) => fn());
      remoteStream.removeEventListener('addtrack', handleTrackEvent);
      remoteStream.removeEventListener('removetrack', handleTrackEvent);
    };
  }, [remoteStream, attemptPlayMedia, isMinimized]);

  // Global user interaction listener to unlock audio if autoplay was restricted
  useEffect(() => {
    const unlockMedia = () => {
      if (isAutoplayBlocked) {
        handleUserUnmute();
      }
    };
    window.addEventListener('click', unlockMedia, { passive: true });
    window.addEventListener('touchstart', unlockMedia, { passive: true });
    window.addEventListener('keydown', unlockMedia, { passive: true });
    return () => {
      window.removeEventListener('click', unlockMedia);
      window.removeEventListener('touchstart', unlockMedia);
      window.removeEventListener('keydown', unlockMedia);
    };
  }, [isAutoplayBlocked, handleUserUnmute]);

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
      {isMinimized ? (
        /* MINIMIZED FLOATING PIP VIDEO CALL WINDOW (Allows playing games or browsing app simultaneously) */
        <div
          style={
            miniPosition
              ? { left: `${miniPosition.x}px`, top: `${miniPosition.y}px` }
              : undefined
          }
          className={`${
            miniPosition ? 'fixed' : 'fixed bottom-5 right-4 sm:bottom-6 sm:right-6'
          } z-[60] select-none w-64 sm:w-80 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-[#00a884] bg-[#0b141a] group font-sans animate-fade-in`}
        >
          {/* Main Remote Video Stream */}
          <video
            ref={(el) => {
              remoteVideoRef.current = el;
              if (el && remoteStream && el.srcObject !== remoteStream) {
                el.srcObject = remoteStream;
                attemptPlayMedia();
              }
            }}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              hasRemoteVideoTrack ? 'opacity-100' : 'opacity-0'
            }`}
            onLoadedMetadata={() => {
              setHasRemoteVideoTrack(true);
              attemptPlayMedia();
            }}
            onPlaying={() => {
              setHasRemoteVideoTrack(true);
              setIsReconnecting(false);
            }}
          />

          {/* Avatar Fallback if Remote Video isn't ready */}
          {!hasRemoteVideoTrack && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111b21] p-3 text-white pointer-events-none">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#00a884] mb-1 bg-[#202c33]">
                <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
              </div>
              <p className="text-xs font-semibold truncate max-w-[120px]">{partnerName}</p>
              <span className="text-[10px] text-[#00a884] font-mono">{formatDuration(duration)}</span>
            </div>
          )}

          {/* Mini Local Video Inset (Top Right) */}
          <div className="absolute top-2 right-2 w-14 sm:w-16 aspect-[3/4] rounded-lg overflow-hidden border border-white/40 shadow-md bg-black/70 z-20">
            <video
              ref={(el) => {
                localVideoRef.current = el;
                if (el && localStream && el.srcObject !== localStream) {
                  el.srcObject = localStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover mirror -scale-x-100 ${isVideoOff ? 'hidden' : 'block'}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-[9px] text-white">
                Off
              </div>
            )}
          </div>

          {/* Top Bar with Drag Handle, Partner Name, Timer & Maximize */}
          <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-1.5 min-w-0 pr-16">
              <div
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-white transition shrink-0"
                title="Drag video anywhere"
              >
                <GripHorizontal className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white drop-shadow truncate">{partnerName}</span>
              <span className="text-[10px] font-mono text-[#00a884] bg-black/60 px-1.5 py-0.2 rounded-full shrink-0">
                {callStatus === 'connected' ? formatDuration(duration) : `${callStatus}...`}
              </span>
            </div>

            {onToggleMinimize && (
              <button
                type="button"
                onClick={onToggleMinimize}
                className="p-1.5 rounded-full bg-black/60 hover:bg-[#00a884] text-white transition cursor-pointer shrink-0"
                title="Expand to full screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-center gap-2 z-20 bg-gradient-to-t from-black/85 to-transparent">
            <button
              type="button"
              onClick={() => onSendLoveBurst('❤️')}
              className="p-1.5 rounded-full hover:bg-white/20 text-rose-400 text-sm transition cursor-pointer"
              title="Send love"
            >
              ❤️
            </button>
            <button
              type="button"
              onClick={handleToggleNC}
              className={`p-1.5 rounded-full transition cursor-pointer ${
                isNC ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-black/60 text-slate-400 hover:bg-black/80'
              }`}
              title={isNC ? 'Active Noise Cancellation: ON' : 'Noise Cancellation: OFF'}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isNC ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            </button>
            <button
              type="button"
              onClick={handleToggleEC}
              className={`p-1.5 rounded-full transition cursor-pointer ${
                isEC ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'bg-black/60 text-slate-400 hover:bg-black/80'
              }`}
              title={isEC ? 'Acoustic Echo Suppression: ON' : 'Echo Suppression: OFF'}
            >
              <Waves className={`w-3.5 h-3.5 ${isEC ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className={`p-1.5 rounded-full transition cursor-pointer ${
                isMuted ? 'bg-rose-600 text-white' : 'bg-black/60 text-white hover:bg-black/80'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onToggleVideo}
              className={`p-1.5 rounded-full transition cursor-pointer ${
                isVideoOff ? 'bg-rose-600 text-white' : 'bg-black/60 text-white hover:bg-black/80'
              }`}
              title={isVideoOff ? 'Turn video on' : 'Turn video off'}
            >
              {isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onEndCall}
              className="p-1.5 rounded-full bg-[#ea0038] hover:bg-[#d00030] text-white transition cursor-pointer shadow"
              title="End Video Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b141a] overflow-hidden select-none font-sans">
      {/* Dedicated Remote Audio Output - Guarantees pristine voice output across all networks */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="sr-only"
      />

      {/* Autoplay blocked banner (tap to unmute) */}
      {isAutoplayBlocked && (
        <button
          onClick={handleUserUnmute}
          className="absolute top-20 z-40 px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white text-sm font-medium rounded-full shadow-xl flex items-center gap-2 animate-bounce cursor-pointer transition-all"
        >
          <Volume2 className="w-4 h-4" />
          <span>Tap to unmute partner's audio</span>
        </button>
      )}

      {/* Remote Video Stream (Main Fullscreen) */}
      <div 
        className="relative w-full h-full flex items-center justify-center bg-[#0b141a] cursor-pointer"
        onClick={() => setShowControls((prev) => !prev)}
      >
        <video
          ref={(el) => {
            remoteVideoRef.current = el;
            if (el && remoteStream && el.srcObject !== remoteStream) {
              el.srcObject = remoteStream;
              attemptPlayMedia();
            }
          }}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            hasRemoteVideoTrack && !partnerIsVideoOff ? 'opacity-100 relative z-10' : 'opacity-0 absolute pointer-events-none'
          }`}
          onLoadedMetadata={() => {
            setHasRemoteVideoTrack(true);
            attemptPlayMedia();
          }}
          onLoadedData={() => {
            setHasRemoteVideoTrack(true);
            attemptPlayMedia();
          }}
          onPlaying={() => {
            setHasRemoteVideoTrack(true);
            setIsReconnecting(false);
          }}
          onCanPlay={() => {
            setHasRemoteVideoTrack(true);
            attemptPlayMedia();
          }}
          onTimeUpdate={() => {
            if (!hasRemoteVideoTrack) {
              setHasRemoteVideoTrack(true);
            }
          }}
        />

        {/* Haven Avatar Fallback when video stream is loading, disabled or partner camera off */}
        {(!hasRemoteVideoTrack || partnerIsVideoOff) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111b21] text-[#e9edef] z-0 p-6 select-none pointer-events-none">
            <div className="relative mb-6">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-[#00a884] shadow-2xl bg-[#202c33]">
                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full ${
                partnerIsVideoOff ? 'bg-amber-500' : 'bg-[#00a884]'
              } border-2 border-[#111b21] flex items-center justify-center text-white shadow-md`}>
                {partnerIsVideoOff ? (
                  <VideoOff className="w-4 h-4 text-white" />
                ) : (
                  <Video className="w-4 h-4 text-white" />
                )}
              </div>
            </div>

            <h3 className="text-2xl font-semibold text-[#e9edef] tracking-tight">{partnerName}</h3>

            <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-[#202c33] border border-[#222e35] text-xs">
              <span className={`w-2 h-2 rounded-full ${
                partnerIsVideoOff
                  ? 'bg-amber-400'
                  : callStatus === 'connected'
                  ? 'bg-[#00a884]'
                  : 'bg-[#eab308] animate-ping'
              }`} />
              <span className="text-[#8696a0]">
                {partnerIsVideoOff
                  ? 'Partner turned off camera • Audio is live'
                  : callStatus === 'connected'
                  ? hasRemoteAudioTrack
                    ? 'Connected • Audio Live (Video Loading...)'
                    : 'Connected • Establishing Global Stream...'
                  : callStatus === 'connecting'
                  ? 'Establishing International Relay (STUN/TURN)...'
                  : `${callStatus}...`}
              </span>
            </div>

            {callStatus === 'connected' && !hasRemoteVideoTrack && !partnerIsVideoOff && (
              <p className="text-xs text-[#8696a0] max-w-sm text-center mt-3 leading-relaxed">
                If the video takes a moment across borders, voice is still live. Tap <strong className="text-[#00a884]">Reconnect</strong> below to refresh the route.
              </p>
            )}

            {/* Quality, Noise Cancellation & Echo Suppression Badge */}
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                isNC ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-[#202c33] border border-[#222e35] text-slate-400'
              }`}>
                <Sparkles className={`w-3 h-3 ${isNC ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                {isNC ? 'Studio ANC' : 'ANC Off'}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                isEC ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-[#202c33] border border-[#222e35] text-slate-400'
              }`}>
                <Waves className={`w-3 h-3 ${isEC ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                {isEC ? 'Echo Filter Active' : 'Echo Off'}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-[11px] text-blue-300 font-medium">
                <Radio className="w-3 h-3 text-blue-400" />
                1080p HD Video
              </span>
            </div>
          </div>
        )}

        {/* Top Info Bar (Haven Dark Style) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none sm:hover:opacity-100 sm:hover:pointer-events-auto'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#00a884] shrink-0 bg-[#202c33]">
              <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-[#e9edef] font-semibold text-sm leading-tight flex items-center gap-2">
                <span>{partnerName}</span>
                <span className="w-2 h-2 rounded-full bg-[#00a884] inline-block animate-pulse" />
              </div>
              <div className="text-xs text-[#8696a0] font-mono mt-0.5 flex items-center gap-2">
                <span>{callStatus === 'connected' ? 'Live Call' : 'Connecting...'}</span>
                {partnerIsMuted && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-rose-300 font-medium bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                    <MicOff className="w-2.5 h-2.5 text-rose-400" /> Partner Muted
                  </span>
                )}
                {hasRemoteAudioTrack && !partnerIsMuted && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#00a884] font-medium">
                    <Volume2 className="w-3 h-3" /> Audio Active
                  </span>
                )}
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-blue-400 font-medium">
                  <Radio className="w-3 h-3" /> 1080p HD
                </span>
              </div>
            </div>

            {/* Discreet Call Duration Timer Badge in Header */}
            <div
              id="video-call-header-timer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-[#111b21]/80 hover:bg-[#202c33]/90 border border-[#222e35] text-xs font-mono font-medium text-emerald-400 shadow-md backdrop-blur-md transition-colors shrink-0 ml-1"
              title={callStatus === 'connected' ? `Active call duration: ${formatDuration(duration)}` : 'Call connecting...'}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400/90" />
              <span className="tabular-nums tracking-wide font-medium">
                {callStatus === 'connected' ? formatDuration(duration) : '00:00'}
              </span>
              {callStatus === 'connected' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </div>
          </div>

          {/* E2EE, ANC, Echo, Network Health & Reconnect Controls */}
          <div className="flex items-center gap-2">
            {/* Active Noise Cancellation Toggle Button */}
            <button
              id="btn-anc-video-call-header"
              type="button"
              onClick={handleToggleNC}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                isNC
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/10'
                  : 'bg-[#202c33] hover:bg-[#2a3942] text-slate-400 border border-[#222e35]'
              }`}
              title={
                isNC
                  ? 'Active Noise Cancellation: ON (85Hz High-Pass + 60Hz Notch + Vocal Clarity Boost)'
                  : 'Active Noise Cancellation: OFF (Click to enable noise reduction)'
              }
            >
              <Sparkles className={`w-3.5 h-3.5 ${isNC ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{isNC ? 'ANC Active' : 'ANC Off'}</span>
              <span className="sm:hidden">{isNC ? 'ANC' : 'Raw'}</span>
            </button>

            {/* Acoustic Echo Suppression Toggle Button */}
            <button
              id="btn-echo-video-call-header"
              type="button"
              onClick={handleToggleEC}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                isEC
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-cyan-500/10'
                  : 'bg-[#202c33] hover:bg-[#2a3942] text-slate-400 border border-[#222e35]'
              }`}
              title={
                isEC
                  ? 'Acoustic Echo Suppression (AEC): ON (Hardware echo elimination avoiding audio feedback)'
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
              id="btn-diagnostics-video-call"
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              title="Run audio, video, microphone, and ICE diagnosis"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00a884]/20 hover:bg-[#00a884]/30 border border-[#00a884]/40 text-xs text-[#25d366] transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#00a884]" />
              <span className="hidden sm:inline">Diagnosis</span>
            </button>

            <button
              id="btn-reconnect-video-call"
              type="button"
              onClick={handleReconnect}
              disabled={isReconnecting}
              title="Refresh connection across international networks"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#202c33]/90 hover:bg-[#2a3942] border border-[#222e35] text-xs text-[#e9edef] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00a884] ${isReconnecting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reconnect</span>
            </button>

            {/* Native OS Fullscreen Toggle */}
            <button
              id="btn-native-fullscreen-video-call"
              type="button"
              onClick={handleToggleNativeFullscreen}
              className="p-1.5 rounded-full bg-[#202c33]/90 hover:bg-[#2a3942] border border-[#222e35] text-xs text-[#e9edef] transition-colors cursor-pointer"
              title={isNativeFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isNativeFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-blue-400" /> : <Maximize2 className="w-3.5 h-3.5 text-blue-400" />}
            </button>

            {/* Minimize Button */}
            {onToggleMinimize && (
              <button
                id="btn-minimize-video-call"
                type="button"
                onClick={onToggleMinimize}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00a884]/20 hover:bg-[#00a884]/30 border border-[#00a884]/40 text-xs text-[#25d366] font-semibold transition-colors cursor-pointer shadow-xs"
                title="Minimize video call to floating window"
              >
                <Minimize2 className="w-3.5 h-3.5 text-[#00a884]" />
                <span className="hidden sm:inline">Minimize</span>
              </button>
            )}

            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#202c33]/80 backdrop-blur-md border border-[#222e35] text-[#00a884] text-xs font-medium">
              <Lock className="w-3 h-3 text-[#00a884]" />
              <span>Encrypted</span>
            </div>
          </div>
        </div>

        {/* Persistent Floating Health Badge when controls are faded */}
        {!showControls && callStatus === 'connected' && (
          <>
            <div className="absolute top-4 left-4 z-20 opacity-80 hover:opacity-100 transition-opacity">
              <div
                id="video-call-faded-header-timer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono font-medium text-emerald-400 shadow-lg"
                title={`Call duration: ${formatDuration(duration)}`}
              >
                <Clock className="w-3 h-3 text-emerald-400" />
                <span className="tabular-nums tracking-wide">{formatDuration(duration)}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </div>
            </div>
            <div className="absolute top-4 right-4 z-20 opacity-80 hover:opacity-100 transition-opacity">
              <NetworkHealthOverlay
                callStatus={callStatus}
                getNetworkStats={getNetworkStats}
                onReconnect={handleReconnect}
                onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
                compact
              />
            </div>
          </>
        )}

        {/* Autoplay Audio Unlock Notice (If browser blocked audio) */}
        {isAutoplayBlocked && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-[#00a884] text-white rounded-full shadow-xl flex items-center gap-2 text-xs font-semibold animate-bounce cursor-pointer"
            onClick={attemptPlayMedia}
          >
            <Volume2 className="w-4 h-4" />
            <span>Tap to Unmute / Hear Audio</span>
          </div>
        )}

        {/* Picture-in-Picture Local Video (Self Preview) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsPipTopLeft(!isPipTopLeft);
          }}
          className={`absolute z-30 transition-all duration-300 cursor-pointer shadow-2xl rounded-2xl overflow-hidden border-2 border-[#00a884]/80 bg-[#111b21] w-24 h-36 sm:w-36 sm:h-52 ${
            isPipTopLeft ? 'top-20 left-3 sm:top-24 sm:left-6' : 'bottom-28 right-3 sm:bottom-28 sm:right-6 sm:top-auto'
          }`}
          title="Tap to toggle position"
        >
          {isVideoOff ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#202c33] text-[#8696a0] p-2 text-center">
              <VideoOff className="w-6 h-6 mb-1 text-rose-400" />
              <span className="text-[10px] font-medium">Camera Off</span>
            </div>
          ) : (
            <video
              ref={(el) => {
                localVideoRef.current = el;
                if (el && localStream && el.srcObject !== localStream) {
                  el.srcObject = localStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror transform -scale-x-100"
            />
          )}

          {isMuted && (
            <div className="absolute bottom-2 left-2 p-1 rounded-full bg-rose-600/90 text-white">
              <MicOff className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Floating Love Bursts Quick Reactions */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-[#202c33]/90 backdrop-blur-md border border-[#222e35] shadow-lg transition-opacity duration-300 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none sm:hover:opacity-100 sm:hover:pointer-events-auto'
          }`}
        >
          {['❤️', '💖', '🥰', '😘', '🔥', '👏', '👋'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendLoveBurst(emoji)}
              className="text-lg sm:text-xl p-1 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Bottom Call Controls Bar (Haven Call UI) */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-center gap-2.5 sm:gap-4 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none sm:hover:opacity-100 sm:hover:pointer-events-auto'
          }`}
        >
          {/* Mute Audio */}
          <button
            id="btn-toggle-call-mute"
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

          {/* Toggle Video */}
          <button
            id="btn-toggle-call-video"
            type="button"
            onClick={onToggleVideo}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg ${
              isVideoOff
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942] border border-[#222e35]'
            }`}
            title={isVideoOff ? 'Turn video on' : 'Turn video off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Active Noise Cancellation */}
          <button
            id="btn-toggle-video-call-anc"
            type="button"
            onClick={handleToggleNC}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg ${
              isNC
                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/50'
                : 'bg-[#202c33] text-slate-400 hover:bg-[#2a3942] border border-[#222e35]'
            }`}
            title={isNC ? 'Active Noise Cancellation: ON (Click to disable)' : 'Active Noise Cancellation: OFF (Click to enable)'}
          >
            <Sparkles className={`w-5 h-5 ${isNC ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
          </button>

          {/* Acoustic Echo Suppression */}
          <button
            id="btn-toggle-video-call-aec"
            type="button"
            onClick={handleToggleEC}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg ${
              isEC
                ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/50'
                : 'bg-[#202c33] text-slate-400 hover:bg-[#2a3942] border border-[#222e35]'
            }`}
            title={isEC ? 'Acoustic Echo Suppression: ON (Click to disable)' : 'Acoustic Echo Suppression: OFF (Click to enable)'}
          >
            <Waves className={`w-5 h-5 ${isEC ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
          </button>

          {/* Switch Camera */}
          <button
            id="btn-switch-call-camera"
            type="button"
            onClick={onSwitchCamera}
            className="w-13 h-13 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] border border-[#222e35] flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg"
            title="Switch front/back camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          {/* Share Screen */}
          <button
            id="btn-share-call-screen"
            type="button"
            onClick={onToggleScreenShare}
            className={`w-13 h-13 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg hidden sm:flex ${
              isScreenSharing
                ? 'bg-[#00a884] text-white hover:bg-[#008f6f]'
                : 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942] border border-[#222e35]'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Minimize Call */}
          {onToggleMinimize && (
            <button
              id="btn-bottom-minimize-video-call"
              type="button"
              onClick={onToggleMinimize}
              className="w-13 h-13 rounded-full bg-[#202c33] hover:bg-[#2a3942] text-[#00a884] border border-[#222e35] flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-lg"
              title="Minimize Video Call to floating window"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          )}

          {/* Hang Up (Haven Red) */}
          <button
            id="btn-end-video-call"
            type="button"
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-[#ea0038] hover:bg-[#d00030] text-white flex items-center justify-center shadow-xl shadow-rose-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer ml-2"
            title="End Video Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Interactive In-Call Diagnostics Modal (available in both minimized & fullscreen) */}
  <CallDiagnosticsModal
    isOpen={isDiagnosticsOpen}
    onClose={() => setIsDiagnosticsOpen(false)}
    callType="video"
    onAutoFixAndReconnect={async () => {
      unlockAudioContext();
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.muted = false;
        await remoteVideoRef.current.play().catch(() => {});
      }
      if (onReconnectCall) {
        onReconnectCall();
      }
    }}
  />
</>
  );
};
