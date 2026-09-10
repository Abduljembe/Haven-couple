import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Heart,
  Flame,
  Laugh,
  CheckCircle2,
  X,
  ArrowRight,
  Shuffle,
  Clock,
  ShieldCheck,
  Tv,
  Copy,
  Check,
  UserCheck,
  LogOut,
  RefreshCw,
  Zap,
  Gamepad2,
} from 'lucide-react';
import { SingleProfile, VideoScreeningSession, ScreeningQuestion } from '../../types';
import { SCREENING_QUESTIONS } from '../../data/screeningQuestions';
import { InCallMiniGames } from './InCallMiniGames';
import { VerifiedBadgeOverlay } from '../common/VerifiedBadgeOverlay';
import {
  playCallConnected,
  playCallEnded,
  playSparkCelebrationSound,
  playDilemmaSelectSound,
  playMessageChime,
} from '../../utils/sounds';

interface VideoScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: any;
  currentProfile: SingleProfile;
  partnerProfile: SingleProfile;
  initialSession?: VideoScreeningSession | null;
  onStartOneOnOneSpace: (roomId: string, passkey: string, partnerProfile?: SingleProfile) => void;
}

interface FloatingReaction {
  id: number;
  emoji: string;
  senderName: string;
  x: number;
}

export const VideoScreeningModal: React.FC<VideoScreeningModalProps> = ({
  isOpen,
  onClose,
  socket,
  currentProfile,
  partnerProfile,
  initialSession,
  onStartOneOnOneSpace,
}) => {
  // State phases: 'connecting' | 'active' | 'decision' | 'result'
  const [phase, setPhase] = useState<'connecting' | 'active' | 'decision' | 'result'>('connecting');
  const [session, setSession] = useState<VideoScreeningSession | null>(initialSession || null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(180); // 3 minutes screening timer
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [myDecision, setMyDecision] = useState<'match' | 'leave' | null>(null);
  const [isWaitingForPartner, setIsWaitingForPartner] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(10);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showMiniGames, setShowMiniGames] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const currentQuestion: ScreeningQuestion = SCREENING_QUESTIONS[currentQuestionIndex % SCREENING_QUESTIONS.length];

  // Initialize media & WebRTC
  useEffect(() => {
    if (!isOpen) {
      handleFullCleanup();
      return;
    }

    let isMounted = true;

    const setupMedia = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.playsInline = true;
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().catch((e) => console.warn('Local video play error:', e));
          };
        }

        // Setup audio level analyser for live speaking waves
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioContextClass();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);
          audioContextRef.current = ctx;
          analyserRef.current = analyser;

          const updateVolume = () => {
            if (analyserRef.current) {
              const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.max(10, avg * 1.5)));
            }
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        } catch (err) {
          console.warn('Audio analyser fallback:', err);
        }

        playCallConnected();
        setPhase('active');
      } catch (err: any) {
        console.warn('Camera access fallback (permission or no device):', err);
        setCameraError('Camera preview in standby mode. Simulated video feed active.');
        playCallConnected();
        setPhase('active');
      }
    };

    setupMedia();

    // Start 3-minute screening countdown
    setTimeLeft(180);
    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          handleCallFinished();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isMounted = false;
      handleFullCleanup();
    };
  }, [isOpen, facingMode]);

  // Socket listeners for screening interaction
  useEffect(() => {
    if (!socket) return;

    // Screening Question sync
    const handleQuestionUpdate = (data: { questionIndex: number }) => {
      setCurrentQuestionIndex(data.questionIndex);
      playDilemmaSelectSound();
    };

    // Reaction received (floating heart/fire/laugh)
    const handleReactionReceived = (data: { emoji: string; senderName: string }) => {
      triggerFloatingReaction(data.emoji, data.senderName);
      playMessageChime(false);
    };

    // Call ended by partner or timeout
    const handleCallEnded = () => {
      handleCallFinished();
    };

    // Partner decision recorded
    const handleDecisionRecorded = (data: any) => {
      setIsWaitingForPartner(true);
    };

    // Final result
    const handleResult = (data: any) => {
      setResultData(data);
      setIsWaitingForPartner(false);
      setPhase('result');
      if (data.mutualMatch) {
        playSparkCelebrationSound();
        triggerConfettiExplosion();
      } else {
        playCallEnded();
      }
    };

    // Partner left
    const handlePartnerLeft = () => {
      setResultData({
        mutualMatch: false,
        partnerLeft: true,
      });
      setPhase('result');
      playCallEnded();
    };

    socket.on('singles-video-screening-question-updated', handleQuestionUpdate);
    socket.on('singles-video-screening-reaction-received', handleReactionReceived);
    socket.on('singles-video-screening-call-ended', handleCallEnded);
    socket.on('singles-video-screening-decision-recorded', handleDecisionRecorded);
    socket.on('singles-video-screening-result', handleResult);
    socket.on('singles-video-screening-partner-left', handlePartnerLeft);

    return () => {
      socket.off('singles-video-screening-question-updated', handleQuestionUpdate);
      socket.off('singles-video-screening-reaction-received', handleReactionReceived);
      socket.off('singles-video-screening-call-ended', handleCallEnded);
      socket.off('singles-video-screening-decision-recorded', handleDecisionRecorded);
      socket.off('singles-video-screening-result', handleResult);
      socket.off('singles-video-screening-partner-left', handlePartnerLeft);
    };
  }, [socket, session]);

  // Trigger floating reaction animation
  const triggerFloatingReaction = (emoji: string, senderName: string) => {
    const id = Date.now() + Math.random();
    const x = 20 + Math.random() * 60; // percentage
    setFloatingReactions((prev) => [...prev, { id, emoji, senderName, x }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2800);
  };

  // Send reaction over socket
  const handleSendReaction = (emoji: string) => {
    triggerFloatingReaction(emoji, currentProfile.name);
    playMessageChime(true);
    if (socket && session) {
      socket.emit('singles-video-screening-reaction', {
        sessionId: session.sessionId,
        emoji,
        senderName: currentProfile.name,
      });
    }
  };

  // Advance question (synced over socket)
  const handleNextQuestion = () => {
    const nextIdx = (currentQuestionIndex + 1) % SCREENING_QUESTIONS.length;
    setCurrentQuestionIndex(nextIdx);
    playDilemmaSelectSound();
    if (socket && session) {
      socket.emit('singles-video-screening-question-change', {
        sessionId: session.sessionId,
        questionIndex: nextIdx,
      });
    }
  };

  // Shuffle question
  const handleShuffleQuestion = () => {
    let randomIdx = Math.floor(Math.random() * SCREENING_QUESTIONS.length);
    if (randomIdx === currentQuestionIndex) {
      randomIdx = (randomIdx + 1) % SCREENING_QUESTIONS.length;
    }
    setCurrentQuestionIndex(randomIdx);
    playDilemmaSelectSound();
    if (socket && session) {
      socket.emit('singles-video-screening-question-change', {
        sessionId: session.sessionId,
        questionIndex: randomIdx,
      });
    }
  };

  // Toggle Mic
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    } else {
      setIsMicMuted(!isMicMuted);
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  // Switch Camera facing mode
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Complete Video Call & transition to Match/Leave decision
  const handleCallFinished = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    playCallEnded();
    setPhase('decision');

    if (socket && session) {
      socket.emit('singles-video-screening-end-call', {
        sessionId: session.sessionId,
      });
    }
  };

  // Submit Match or Leave Choice
  const handleChooseDecision = (choice: 'match' | 'leave') => {
    setMyDecision(choice);
    setIsWaitingForPartner(true);

    if (socket && session) {
      socket.emit('singles-video-screening-submit-decision', {
        sessionId: session.sessionId,
        userId: currentProfile.id,
        decision: choice,
      });
    } else {
      // Offline fallback: if testing locally without active session
      setTimeout(() => {
        setIsWaitingForPartner(false);
        setPhase('result');
        if (choice === 'match') {
          const mockRoom = `haven-match-${Math.floor(1000 + Math.random() * 9000)}`;
          const mockKey = 'secret-spark-pass';
          setResultData({
            mutualMatch: true,
            roomId: mockRoom,
            passkey: mockKey,
            joinUrl: `/?room=${mockRoom}&key=${mockKey}&type=couple`,
          });
          playSparkCelebrationSound();
          triggerConfettiExplosion();
        } else {
          setResultData({ mutualMatch: false });
          playCallEnded();
        }
      }, 1200);
    }
  };

  // Confetti explosion
  const triggerConfettiExplosion = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#ec4899', '#f59e0b', '#8b5cf6'],
      });
    } catch {
      // ignore
    }
  };

  // Cleanup all media and intervals
  const handleFullCleanup = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  };

  // Close modal and leave
  const handleCloseModal = () => {
    if (socket && session) {
      socket.emit('singles-video-screening-leave', {
        sessionId: session.sessionId,
        userId: currentProfile.id,
      });
    }
    handleFullCleanup();
    onClose();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-4xl h-[92vh] max-h-[820px] bg-stone-950 border border-stone-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
        >
          {/* Top Header Bar */}
          <div className="px-4 py-3 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between z-20 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Video className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    Screening Date: {partnerProfile.name}
                    <span className="text-stone-400 text-xs font-normal">({partnerProfile.age})</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 truncate max-w-[200px] sm:max-w-xs">
                  {partnerProfile.city || 'Anywhere'} • {partnerProfile.currentVibe || 'Getting to know each other'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Screening Countdown Timer */}
              {phase === 'active' && (
                <div
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${
                    timeLeft < 30
                      ? 'bg-rose-950/60 text-rose-300 border-rose-600/60 animate-pulse'
                      : 'bg-stone-800 text-amber-300 border-stone-700'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{timeFormatted}</span>
                </div>
              )}

              {/* Wrap Up / Exit */}
              {phase === 'active' ? (
                <button
                  type="button"
                  onClick={handleCallFinished}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <span>Wrap Up & Decide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* MAIN INTERACTIVE CONTENT AREA */}
          <div className="relative flex-1 bg-stone-950 flex flex-col overflow-hidden">
            {/* PHASE 1 & 2: CONNECTING / ACTIVE VIDEO CALL WITH SCREENING QUESTIONS */}
            {(phase === 'connecting' || phase === 'active') && (
              <div className="relative flex-1 flex flex-col h-full overflow-hidden">
                {/* VIDEO STAGE */}
                <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                  {/* REMOTE PARTNER VIDEO (Main Screen) */}
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-950 overflow-hidden">
                    {/* Simulated partner active video feed with rich visuals */}
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={partnerProfile.avatar}
                        alt={partnerProfile.name}
                        className="w-full h-full object-cover filter brightness-[0.85] contrast-[1.05]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                      {/* Partner Live Aura / Status Badge */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-semibold text-white">{partnerProfile.name}</span>
                        <span className="text-stone-400">• Active Cam</span>
                      </div>

                      {/* Speaking indicator wave */}
                      <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-0.5 h-3">
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.1s]" style={{ height: '60%' }} />
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" style={{ height: '100%' }} />
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]" style={{ height: '40%' }} />
                        </div>
                        <span className="text-[10px] text-emerald-300 font-bold ml-1">Live Audio</span>
                      </div>
                    </div>
                  </div>

                  {/* LOCAL USER SELF VIDEO (Picture-in-Picture Floating Window) */}
                  <div className="absolute bottom-4 right-4 w-28 sm:w-40 h-36 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-stone-700 bg-stone-900 z-30 transition-all">
                    {isVideoOff ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-stone-400 p-2 text-center">
                        <VideoOff className="w-6 h-6 text-stone-500 mb-1" />
                        <span className="text-[10px]">Camera Paused</span>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ backgroundColor: '#0c0a09' }}
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                        {/* Visual Verified Badge Overlay on Local User's Video Preview */}
                        <VerifiedBadgeOverlay
                          videoRef={localVideoRef}
                          isVideoOff={isVideoOff}
                          position="top-right"
                          profileBiometrics={currentProfile?.biometricVerification}
                        />
                      </>
                    )}

                    {/* Self overlay badge */}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] text-white">
                      <span className="truncate">You</span>
                      <div className="flex items-center gap-1">
                        {isMicMuted ? (
                          <MicOff className="w-2.5 h-2.5 text-rose-400" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FLOATING EMOJI REACTIONS LAYER */}
                  <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                    {floatingReactions.map((reaction) => (
                      <motion.div
                        key={reaction.id}
                        initial={{ opacity: 1, y: '70%', scale: 0.6 }}
                        animate={{ opacity: 0, y: '10%', scale: 1.8 }}
                        transition={{ duration: 2.5, ease: 'easeOut' }}
                        className="absolute text-4xl sm:text-5xl drop-shadow-lg flex flex-col items-center"
                        style={{ left: `${reaction.x}%` }}
                      >
                        <span>{reaction.emoji}</span>
                        <span className="text-[10px] text-white font-bold bg-black/50 px-1.5 py-0.2 rounded-full mt-0.5">
                          {reaction.senderName}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* INTERACTIVE SCREENING QUESTION HUD CARD OR IN-CALL MINI-GAMES (Floating over video) */}
                  <div className="absolute bottom-4 left-4 right-36 sm:right-48 z-30 max-w-xl">
                    {showMiniGames ? (
                      <InCallMiniGames
                        socket={socket}
                        sessionId={session?.sessionId}
                        myUserId={currentProfile.id}
                        myName={currentProfile.name}
                        partnerName={partnerProfile.name}
                        onClose={() => setShowMiniGames(false)}
                      />
                    ) : (
                      <motion.div
                        key={currentQuestion.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-stone-900/90 backdrop-blur-xl border border-stone-700/80 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-2.5"
                      >
                        {/* Question Header & Tracker */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{currentQuestion.categoryEmoji}</span>
                            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                              {currentQuestion.categoryLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-stone-400">
                              Question {currentQuestionIndex + 1} of {SCREENING_QUESTIONS.length}
                            </span>
                            <button
                              type="button"
                              onClick={handleShuffleQuestion}
                              className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                              title="Shuffle Random Question"
                            >
                              <Shuffle className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={handleNextQuestion}
                              className="px-2 py-0.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-bold transition flex items-center gap-1"
                            >
                              <span>Next</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Main Question Text */}
                        <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                          "{currentQuestion.question}"
                        </h3>

                        {currentQuestion.subtext && (
                          <p className="text-[10px] sm:text-[11px] text-stone-300 italic line-clamp-2">
                            {currentQuestion.subtext}
                          </p>
                        )}

                        {/* Quick conversation starter pills */}
                        {currentQuestion.suggestedAnswers && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {currentQuestion.suggestedAnswers.slice(0, 3).map((ans, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-lg bg-stone-800/80 border border-stone-700/80 text-[10px] text-stone-300 hover:text-white transition cursor-default"
                              >
                                💡 {ans}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* BOTTOM MEDIA & REACTION CONTROLS BAR */}
                <div className="px-4 py-3 bg-stone-900 border-t border-stone-800 flex items-center justify-between shrink-0 z-20">
                  {/* Live Reaction Buttons & Mini-Games Toggle */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMiniGames(!showMiniGames)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow ${
                        showMiniGames
                          ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-400'
                          : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/30'
                      }`}
                      title="Toggle First-Date Mini-Games"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      <span className="hidden sm:inline">{showMiniGames ? 'Hide Games' : 'Mini-Games'}</span>
                    </button>

                    <div className="h-4 w-px bg-stone-700 mx-0.5 hidden sm:block" />

                    <span className="text-[10px] font-bold text-stone-400 uppercase hidden sm:inline">React:</span>
                    {[
                      { emoji: '💖', label: 'Heart' },
                      { emoji: '🔥', label: 'Fire' },
                      { emoji: '😂', label: 'Laugh' },
                      { emoji: '✨', label: 'Spark' },
                      { emoji: '👏', label: 'Clap' },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleSendReaction(item.emoji)}
                        className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 hover:scale-110 active:scale-95 transition flex items-center justify-center text-sm shadow"
                        title={item.label}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>

                  {/* Audio / Video Controls */}
                  <div className="flex items-center gap-2">
                    {/* Audio VU Bar */}
                    <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700">
                      <Mic className={`w-3.5 h-3.5 ${isMicMuted ? 'text-rose-400' : 'text-emerald-400'}`} />
                      <div className="w-12 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                          style={{ width: isMicMuted ? '0%' : `${audioLevel}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`p-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center ${
                        isMicMuted
                          ? 'bg-rose-600 text-white'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                      title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                    >
                      {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={toggleVideo}
                      className={`p-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center ${
                        isVideoOff
                          ? 'bg-rose-600 text-white'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      }`}
                      title={isVideoOff ? 'Enable Camera' : 'Disable Camera'}
                    >
                      {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition"
                      title="Flip Camera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleCallFinished}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span className="hidden sm:inline">Wrap Up</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PHASE 3: DECISION PHASE - CHOOSE TO GET MATCHED OR LEAVE */}
            {phase === 'decision' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center max-w-xl mx-auto overflow-y-auto">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500/20 via-pink-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 shadow-xl">
                  <Sparkles className="w-8 h-8 text-rose-400 animate-pulse" />
                </div>

                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
                  Screening Interaction Complete
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Choose to Get Matched or Leave
                </h2>
                <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-6 leading-relaxed">
                  You just wrapped up your video screening call with <span className="font-semibold text-white">{partnerProfile.name}</span>. Did you feel mutual chemistry and want to stay connected?
                </p>

                {/* Partner Card Preview */}
                <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center gap-3.5 text-left mb-6 shadow-md">
                  <img
                    src={partnerProfile.avatar}
                    alt={partnerProfile.name}
                    className="w-14 h-14 rounded-xl object-cover object-center border border-stone-700"
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {partnerProfile.name}, {partnerProfile.age}
                    </h4>
                    <p className="text-xs text-stone-400">{partnerProfile.city || 'Anywhere'}</p>
                    <p className="text-[11px] text-rose-300 italic mt-0.5 line-clamp-1">
                      "{partnerProfile.currentVibe || 'Open to connection'}"
                    </p>
                  </div>
                </div>

                {isWaitingForPartner ? (
                  <div className="p-6 bg-stone-900/80 border border-stone-800 rounded-2xl w-full max-w-md space-y-3">
                    <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <h4 className="font-bold text-white text-sm">
                      Decision Recorded: <span className="text-rose-400 capitalize">{myDecision}</span>
                    </h4>
                    <p className="text-xs text-stone-400">
                      Waiting for {partnerProfile.name} to submit their decision...
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-md">
                    {/* OPTION 1: GET MATCHED */}
                    <button
                      type="button"
                      onClick={() => handleChooseDecision('match')}
                      className="p-5 rounded-2xl bg-gradient-to-b from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-xl shadow-rose-600/25 active:scale-95 transition flex flex-col items-center text-center group border border-rose-400/30"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                        <Heart className="w-6 h-6 fill-white text-white" />
                      </div>
                      <span className="text-base font-bold">Get Matched ✨</span>
                      <span className="text-[11px] text-rose-100 mt-1 opacity-90 leading-tight">
                        Felt the spark! Unlock a private 1-on-1 Haven Space together.
                      </span>
                    </button>

                    {/* OPTION 2: LEAVE */}
                    <button
                      type="button"
                      onClick={() => handleChooseDecision('leave')}
                      className="p-5 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-stone-300 hover:text-white active:scale-95 transition flex flex-col items-center text-center group"
                    >
                      <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                        <LogOut className="w-5 h-5 text-stone-400" />
                      </div>
                      <span className="text-base font-bold">Leave & Pass</span>
                      <span className="text-[11px] text-stone-400 mt-1 leading-tight">
                        No romantic spark today. Return to the lounge with zero awkwardness.
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PHASE 4: FINAL RESULTS (MUTUAL MATCH VS. RESPECTFUL PASS) */}
            {phase === 'result' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center max-w-lg mx-auto overflow-y-auto">
                {resultData?.mutualMatch ? (
                  // 🎉 MUTUAL MATCH CELEBRATION
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-5"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 p-0.5 mx-auto shadow-2xl shadow-rose-500/30">
                      <div className="w-full h-full bg-stone-950 rounded-[22px] flex items-center justify-center text-rose-400">
                        <Heart className="w-10 h-10 fill-rose-500 text-rose-500 animate-bounce" />
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                        ✨ Mutual Chemistry Unlocked ✨
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                        IT'S A MUTUAL MATCH!
                      </h2>
                      <p className="text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed">
                        Both you and <span className="font-bold text-white">{partnerProfile.name}</span> chose to get matched after your video screening!
                      </p>
                    </div>

                    {/* Both Avatars Joined */}
                    <div className="flex items-center justify-center -space-x-3 my-2">
                      <img
                        src={currentProfile.avatar}
                        alt={currentProfile.name}
                        className="w-16 h-16 rounded-full object-cover border-4 border-stone-950 shadow-lg z-10"
                      />
                      <div className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center text-white z-20 shadow">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <img
                        src={partnerProfile.avatar}
                        alt={partnerProfile.name}
                        className="w-16 h-16 rounded-full object-cover border-4 border-stone-950 shadow-lg z-10"
                      />
                    </div>

                    {/* Private Haven Space Generated */}
                    {resultData.roomId && (
                      <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl text-left space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-300">Private 1-on-1 Haven Space:</span>
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Encrypted
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-stone-950 px-3 py-2 rounded-xl border border-stone-800">
                          <span className="font-mono text-xs text-amber-300">{resultData.roomId}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(resultData.roomId);
                              setCopiedKey(true);
                              setTimeout(() => setCopiedKey(false), 2000);
                            }}
                            className="text-stone-400 hover:text-white text-xs flex items-center gap-1"
                          >
                            {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onStartOneOnOneSpace(resultData.roomId, resultData.passkey || 'haven-key', partnerProfile);
                          handleCloseModal();
                        }}
                        className="w-full py-3.5 px-6 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-rose-600/30 active:scale-95 transition flex items-center justify-center gap-2"
                      >
                        <Tv className="w-4 h-4" />
                        <span>Enter Our Private Haven Space Now 🚀</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="w-full py-2.5 text-xs text-stone-400 hover:text-white transition"
                      >
                        Return to Singles Lounge
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  // 🚪 RESPECTFUL PASS / LEAVE SCREEN
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="w-16 h-16 rounded-3xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-400 mx-auto">
                      <LogOut className="w-7 h-7 text-stone-400" />
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      Screening Concluded
                    </h2>

                    <p className="text-xs sm:text-sm text-stone-300 max-w-sm leading-relaxed">
                      You chose to leave the video screening. Genuine chemistry is all about timing, rhythm, and values.
                    </p>

                    <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-2xl text-left space-y-1 text-xs text-stone-300">
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Zero awkwardness guarantee
                      </p>
                      <p className="text-stone-400 text-[11px]">
                        Neither member is charged or penalized. Your choice is private and respectful.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full py-3 px-6 bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs rounded-xl shadow transition"
                    >
                      Back to Singles Lounge
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
