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
  Heart,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { CallStatus } from '../types';
import { VerifiedBadgeOverlay } from './common/VerifiedBadgeOverlay';

interface VideoCallModalProps {
  partnerName: string;
  partnerAvatar: string;
  callStatus: CallStatus;
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
}) => {
  const [duration, setDuration] = useState(0);
  const [isPipTopLeft, setIsPipTopLeft] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Call timer
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

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden animate-in fade-in duration-300 select-none">
      {/* Remote Video Stream (Main Fullscreen) */}
      <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Remote fallback if stream not connected or remote video disabled */}
        {(!remoteStream || remoteStream.getVideoTracks().length === 0 || callStatus !== 'connected') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-rose-950/40 to-slate-950 text-white z-0">
            <div className="relative mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-rose-500 shadow-2xl">
                <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-rose-600 border-2 border-black flex items-center justify-center text-white">
                <Heart className="w-4 h-4 fill-white animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-bold font-serif">{partnerName}</h3>
            <p className="text-sm text-rose-300/80 mt-1 capitalize animate-pulse">
              {callStatus === 'connected' ? 'Video Connecting...' : `${callStatus}...`}
            </p>
          </div>
        )}

        {/* Top Info Bar */}
        <div className={`absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-rose-400 shrink-0">
              <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight flex items-center gap-2">
                <span>{partnerName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              </div>
              <div className="text-xs text-slate-300 font-mono">
                {callStatus === 'connected' ? formatDuration(duration) : 'Connecting...'}
              </div>
            </div>
          </div>

          {/* E2EE Badge */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-emerald-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DTLS-SRTP Encrypted</span>
            </div>
          </div>
        </div>

        {/* Local Picture-in-Picture Preview */}
        <div
          onClick={() => setIsPipTopLeft(!isPipTopLeft)}
          className={`absolute ${
            isPipTopLeft ? 'top-20 left-6' : 'bottom-28 right-6'
          } w-32 h-44 sm:w-40 sm:h-56 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl z-20 bg-slate-900 cursor-pointer transition-all duration-300 hover:scale-105`}
          title="Click to move PiP"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isScreenSharing ? '' : 'scale-x-[-1]'}`}
          />
          {/* Visual Verified Badge Overlay on Local User's Video Preview */}
          {!isVideoOff && (
            <VerifiedBadgeOverlay
              videoRef={localVideoRef}
              isVideoOff={isVideoOff}
              position="top-right"
              size="sm"
            />
          )}
          {isVideoOff && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400">
              <VideoOff className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Camera Off</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white backdrop-blur-xs font-medium">
            You {isMuted && '(Muted)'}
          </div>
        </div>

        {/* Floating Quick Reaction Stream */}
        <div className="absolute bottom-24 left-6 z-20 flex flex-col gap-2">
          {['❤️', '💖', '🥰', '😘', '💋', '🔥'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendLoveBurst(emoji)}
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-rose-600/80 active:scale-90 backdrop-blur-md border border-white/20 text-lg flex items-center justify-center transition-all cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Bottom Call Controls Bar */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-3 sm:gap-5 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
          {/* Mute Mic */}
          <button
            id="btn-toggle-video-mute"
            onClick={onToggleMute}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-600/80 border-rose-500 text-white'
                : 'bg-black/60 border-white/20 hover:bg-black/80 text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Toggle Video Camera */}
          <button
            id="btn-toggle-video-cam"
            onClick={onToggleVideo}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer ${
              isVideoOff
                ? 'bg-rose-600/80 border-rose-500 text-white'
                : 'bg-black/60 border-white/20 hover:bg-black/80 text-white'
            }`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          {/* Switch Camera */}
          <button
            id="btn-switch-camera"
            onClick={onSwitchCamera}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Flip Camera"
          >
            <SwitchCamera className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Screen Share */}
          <button
            id="btn-screen-share"
            onClick={onToggleScreenShare}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center backdrop-blur-md border transition-all cursor-pointer ${
              isScreenSharing
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-black/60 border-white/20 hover:bg-black/80 text-white'
            }`}
            title="Share Screen"
          >
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* End Call Button */}
          <button
            id="btn-end-video-call"
            onClick={onEndCall}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-rose-600/50 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Dedicated audio element ensuring crystal clear remote audio */}
        <audio
          ref={(el) => {
            if (el && remoteStream && el.srcObject !== remoteStream) {
              el.srcObject = remoteStream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          className="hidden"
        />
      </div>
    </div>
  );
};
