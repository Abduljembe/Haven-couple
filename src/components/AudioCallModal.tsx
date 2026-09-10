import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, Heart, ShieldCheck, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { CallStatus } from '../types';

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
}) => {
  const [duration, setDuration] = useState(0);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Bind remote audio stream
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

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

  // Audio wave visualizer animation
  useEffect(() => {
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
      ctx.strokeStyle = '#f43f5e'; // Rose-500

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
      ctx.strokeStyle = '#ec4899'; // Pink-500
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
  }, [callStatus]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Hidden audio element for remote stream playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={isSpeakerMuted} />

      <div 
        id="audio-call-container"
        className="relative w-full max-w-md h-[88vh] max-h-[700px] flex flex-col justify-between items-center bg-gradient-to-b from-slate-900 via-rose-950/20 to-slate-950 rounded-3xl border border-slate-800 p-8 text-white shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>AES-256 E2EE Audio</span>
          </div>

          <button
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            title={isSpeakerMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isSpeakerMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Center Calling Avatar & Waves */}
        <div className="flex flex-col items-center justify-center my-auto w-full z-10">
          <div className="relative mb-6">
            {/* Animated Pulsing Aura */}
            {callStatus === 'connected' && (
              <>
                <div className="absolute -inset-4 rounded-full bg-rose-500/20 animate-ping duration-1000" />
                <div className="absolute -inset-8 rounded-full bg-pink-500/10 animate-pulse duration-1000" />
              </>
            )}

            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-rose-500/80 shadow-2xl shadow-rose-500/30">
              <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
            </div>

            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 border-2 border-slate-900 flex items-center justify-center text-white shadow-lg">
              <Heart className="w-4 h-4 fill-white animate-pulse" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white font-serif">{partnerName}</h2>
          
          <p className="text-sm font-medium mt-1.5 flex items-center gap-1.5">
            {callStatus === 'connected' ? (
              <span className="text-emerald-400 font-mono text-base">{formatDuration(duration)}</span>
            ) : (
              <span className="text-rose-300 animate-pulse capitalize">{callStatus}...</span>
            )}
          </p>

          {/* Waveform Canvas */}
          <div className="w-full max-w-xs h-16 mt-6">
            <canvas ref={canvasRef} width={300} height={60} className="w-full h-full" />
          </div>
        </div>

        {/* Floating Quick Hearts Emojis */}
        <div className="flex items-center gap-2 mb-4 z-10">
          {['❤️', '💖', '🥰', '😘', '💋'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendLoveBurst(emoji)}
              className="p-2 rounded-full bg-slate-800/80 hover:bg-rose-500/30 hover:scale-125 active:scale-95 text-lg transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="w-full flex items-center justify-center gap-5 z-10">
          {/* Mute Mic */}
          <button
            id="btn-toggle-audio-mute"
            onClick={onToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-600/30 text-rose-400 border border-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Upgrade to Video */}
          <button
            id="btn-upgrade-video"
            onClick={onUpgradeToVideo}
            className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer"
            title="Switch to Video Call"
          >
            <Video className="w-6 h-6" />
          </button>

          {/* End Call */}
          <button
            id="btn-end-audio-call"
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>

        {/* Hidden Audio Element to ensure remote audio playback */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      </div>
    </div>
  );
};
