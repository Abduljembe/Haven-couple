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
} from 'lucide-react';
import { CallType, SquadCallParticipant, UserProfile } from '../types';
import { VerifiedBadgeOverlay } from './common/VerifiedBadgeOverlay';

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
}) => {
  const [duration, setDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

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

  // Bind remote streams to video elements
  useEffect(() => {
    remoteStreams.forEach((stream, socketId) => {
      const videoEl = remoteVideoRefs.current.get(socketId);
      if (videoEl && videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        videoEl.play().catch(() => {});
      }
    });
  }, [remoteStreams]);

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

        {/* Right: Security & Invite quick button */}
        <div className="flex items-center gap-2 shrink-0">
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

      {/* Background audio elements for all remote peers (ensures audio plays even if video is off or callType is audio) */}
      <div className="hidden" aria-hidden="true">
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
    </div>
  );
};
