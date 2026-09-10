import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Send, Heart, Flame, ShieldAlert, Sparkles, Clock, CheckCircle2, MessageSquare, ArrowRight, UserCheck, RefreshCw } from 'lucide-react';
import { SingleProfile, SpeedRoundSession, SpeedRoundMessage } from '../../types';
import { playSparkCelebrationSound, playSpeedRoundTickSound, playDilemmaSelectSound } from '../../utils/sounds';

interface SpeedRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket: any;
  currentProfile: SingleProfile;
  onStartOneOnOneSpace: (roomId: string, passkey: string, partnerProfile?: SingleProfile) => void;
}

export const SpeedRoundModal: React.FC<SpeedRoundModalProps> = ({
  isOpen,
  onClose,
  socket,
  currentProfile,
  onStartOneOnOneSpace,
}) => {
  const [phase, setPhase] = useState<'queue' | 'active' | 'decision' | 'result'>('queue');
  const [session, setSession] = useState<any | null>(null);
  const [messages, setMessages] = useState<SpeedRoundMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const [currentPrompt, setCurrentPrompt] = useState<{ id: string; question: string; options: string[] } | null>(null);
  const [myDecision, setMyDecision] = useState<'spark' | 'pass' | null>(null);
  const [waitingForDecision, setWaitingForDecision] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);
  const [queueElapsed, setQueueElapsed] = useState<number>(0);
  const [partnerAlias, setPartnerAlias] = useState<string>('Mystery Single');
  const [partnerVibe, setPartnerVibe] = useState<string>('Thoughtful & Observant');
  const [partnerCity, setPartnerCity] = useState<string>('Anywhere');

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const queueIntervalRef = useRef<number | null>(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentPrompt]);

  // Join queue when opened
  useEffect(() => {
    if (!isOpen) {
      handleCleanup();
      return;
    }

    setPhase('queue');
    setMessages([]);
    setResultData(null);
    setMyDecision(null);
    setWaitingForDecision(false);
    setQueueElapsed(0);
    setTimeLeft(180);

    // Start queue timer
    queueIntervalRef.current = window.setInterval(() => {
      setQueueElapsed((prev) => prev + 1);
    }, 1000);

    // Emit queue join
    if (socket) {
      socket.emit('singles-speed-join', { profile: currentProfile });

      const handleMatched = (data: any) => {
        if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
        setSession(data.session);
        setPartnerAlias(data.partnerAlias || 'Mystery Single');
        setPartnerVibe(data.partnerVibe || 'Curious & Warm');
        setPartnerCity(data.partnerCity || 'Anywhere');
        setPhase('active');
        setTimeLeft(180);
      };

      const handlePromptDropped = (data: any) => {
        setCurrentPrompt(data.prompt);
      };

      const handleMessageReceived = (data: any) => {
        if (data?.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      };

      const handleDecisionRecorded = (data: any) => {
        setWaitingForDecision(true);
      };

      const handleResult = (data: any) => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setResultData(data);
        setPhase('result');
        if (data.mutualSpark) {
          playSparkCelebrationSound();
        }
      };

      const handlePartnerLeft = () => {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            senderId: 'system',
            senderAlias: 'System',
            text: 'Partner has disconnected from the speed round.',
            timestamp: Date.now(),
          },
        ]);
      };

      socket.on('singles-speed-matched', handleMatched);
      socket.on('singles-speed-prompt-dropped', handlePromptDropped);
      socket.on('singles-speed-message-received', handleMessageReceived);
      socket.on('singles-speed-decision-recorded', handleDecisionRecorded);
      socket.on('singles-speed-result', handleResult);
      socket.on('singles-speed-partner-left', handlePartnerLeft);

      return () => {
        socket.off('singles-speed-matched', handleMatched);
        socket.off('singles-speed-prompt-dropped', handlePromptDropped);
        socket.off('singles-speed-message-received', handleMessageReceived);
        socket.off('singles-speed-decision-recorded', handleDecisionRecorded);
        socket.off('singles-speed-result', handleResult);
        socket.off('singles-speed-partner-left', handlePartnerLeft);
      };
    }
  }, [isOpen, currentProfile.id]);

  // Active round timer
  useEffect(() => {
    if (phase === 'active') {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 10 && prev > 0) {
            playSpeedRoundTickSound();
          }
          if (prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setPhase('decision');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    }
  }, [phase]);

  const handleCleanup = () => {
    if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (socket && session?.sessionId) {
      socket.emit('singles-speed-leave', { sessionId: session.sessionId, userId: currentProfile.id });
    }
    if (socket && phase === 'queue') {
      socket.emit('singles-speed-leave-queue', { userId: currentProfile.id });
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !session?.sessionId || !socket) return;

    socket.emit('singles-speed-send-message', {
      sessionId: session.sessionId,
      text: inputText.trim(),
      senderId: currentProfile.id,
      senderAlias: session.participantA.id === currentProfile.id ? session.participantA.alias : session.participantB.alias,
    });

    setInputText('');
  };

  const handleAnswerPrompt = (optionText: string) => {
    playDilemmaSelectSound();
    if (!session?.sessionId || !socket) return;

    const answerMsg = `Selected: "${optionText}" ✨`;
    socket.emit('singles-speed-send-message', {
      sessionId: session.sessionId,
      text: answerMsg,
      senderId: currentProfile.id,
      senderAlias: session.participantA.id === currentProfile.id ? session.participantA.alias : session.participantB.alias,
      isIcebreakerAnswer: true,
    });
  };

  const handleSubmitDecision = (decision: 'spark' | 'pass') => {
    setMyDecision(decision);
    setWaitingForDecision(true);
    if (socket && session?.sessionId) {
      socket.emit('singles-speed-submit-decision', {
        sessionId: session.sessionId,
        userId: currentProfile.id,
        decision,
      });
    }
  };

  const handleRejoinQueue = () => {
    setPhase('queue');
    setSession(null);
    setMessages([]);
    setResultData(null);
    setMyDecision(null);
    setWaitingForDecision(false);
    setTimeLeft(180);
    setQueueElapsed(0);
    if (socket) {
      socket.emit('singles-speed-join', { profile: currentProfile });
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl bg-stone-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[720px]"
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-stone-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-rose-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white truncate">
                  3-Min Blind Spark
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 shrink-0">
                  Mystery Round
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                {phase === 'queue'
                  ? 'Finding your mystery connection...'
                  : phase === 'active'
                  ? `Paired with ${partnerAlias} • ${partnerCity}`
                  : phase === 'decision'
                  ? 'Time is up! Spark or Pass?'
                  : 'Round Complete'}
              </p>
            </div>
          </div>

          {/* Timer Badge (Active Phase) */}
          {phase === 'active' && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold transition-colors ${
                timeLeft <= 20
                  ? 'bg-rose-500 text-white animate-pulse'
                  : timeLeft <= 60
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/10 text-white border border-white/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{timeFormatted}</span>
            </div>
          )}

          <button
            onClick={() => {
              handleCleanup();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Phase Container */}
        <div className="flex-1 flex flex-col min-h-0 bg-stone-950/40">
          {/* 1. QUEUE PHASE */}
          {phase === 'queue' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
              <div className="relative">
                {/* Radar Pings */}
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                <div className="w-24 h-24 rounded-full bg-stone-800/80 border-2 border-rose-500/40 flex items-center justify-center relative z-10 shadow-xl shadow-rose-500/10">
                  <Flame className="w-10 h-10 text-rose-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <h4 className="text-xl font-bold text-white">Searching for a Mystery Single</h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  You'll be paired anonymously for 3 minutes with mystery codenames. No photos, no bios—just pure chemistry and fun icebreaker dilemmas.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-stone-400 bg-stone-800/60 px-3.5 py-1.5 rounded-full border border-white/5">
                <RefreshCw className="w-3 h-3 animate-spin text-rose-400" />
                <span>Elapsed: {queueElapsed}s • Matching priority high</span>
              </div>

              <button
                onClick={() => {
                  handleCleanup();
                  onClose();
                }}
                className="text-xs text-stone-400 hover:text-white underline underline-offset-4"
              >
                Cancel Queue
              </button>
            </div>
          )}

          {/* 2. ACTIVE 3-MINUTE BLIND ROUND */}
          {phase === 'active' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Mystery Partner Floating Bar */}
              <div className="p-3 bg-stone-900/60 border-b border-white/5 flex items-center justify-between px-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 p-0.5 shadow-md">
                    <div className="w-full h-full rounded-full bg-stone-900/90 backdrop-blur-sm flex items-center justify-center text-sm font-bold text-amber-300">
                      ✨
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {partnerAlias}
                      <span className="text-[10px] text-amber-400 font-normal">
                        ({partnerVibe})
                      </span>
                    </h5>
                    <p className="text-[10px] text-stone-400">
                      Avatar blurred until mutual spark ✨
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPhase('decision')}
                  className="text-[11px] font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Ready to Decide Early
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {/* Intro announcement banner */}
                <div className="text-center my-1">
                  <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-stone-800/80 text-stone-300 border border-white/5 inline-block">
                    ⚡ 3-Minute Blind Round Started • Say hi to {partnerAlias}!
                  </span>
                </div>

                {/* Dynamic Icebreaker Dilemma Card */}
                {currentPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-rose-500/30 shadow-lg space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Quick Dilemma Drop
                      </span>
                      <span className="text-[10px] text-stone-400">Tap to answer</span>
                    </div>
                    <p className="text-xs font-bold text-white leading-snug">
                      {currentPrompt.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {currentPrompt.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleAnswerPrompt(opt)}
                          className="text-left text-xs p-2 rounded-xl bg-stone-900/80 hover:bg-stone-900 text-stone-200 hover:text-white border border-white/10 hover:border-rose-400/50 transition-all font-medium active:scale-95"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Messages */}
                {messages.map((m) => {
                  const isMe = m.senderId === currentProfile.id;
                  const isSys = m.senderId === 'system';

                  if (isSys) {
                    return (
                      <div key={m.id} className="text-center text-[11px] text-stone-400 italic">
                        {m.text}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      <span className="text-[10px] text-stone-400 px-1">
                        {isMe ? 'You' : m.senderAlias || partnerAlias}
                      </span>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-br-none shadow-md'
                            : 'bg-stone-800 text-stone-100 rounded-bl-none border border-white/5'
                        } ${m.isIcebreakerAnswer ? 'border-amber-400/30' : ''}`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-stone-900/90 border-t border-white/10 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Chat with ${partnerAlias}...`}
                  maxLength={250}
                  className="flex-1 bg-stone-800/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-8 h-8 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-md shadow-rose-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* 3. DECISION PHASE */}
          {phase === 'decision' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
              <div className="space-y-2 max-w-sm">
                <span className="text-xs uppercase tracking-wider text-rose-400 font-bold">
                  Time is Up!
                </span>
                <h4 className="text-2xl font-bold text-white">Did You Feel a Spark?</h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Your decision is completely confidential. If both of you tap{' '}
                  <span className="text-rose-400 font-semibold">Spark</span>, your full profiles and photos unlock and a private Haven Space opens!
                </p>
              </div>

              {!waitingForDecision ? (
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-2">
                  <button
                    onClick={() => handleSubmitDecision('pass')}
                    className="py-4 px-5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-sm border border-white/10 hover:border-white/20 transition-all flex flex-col items-center gap-2 active:scale-95"
                  >
                    <span className="text-2xl">👋</span>
                    <span>Polite Pass</span>
                    <span className="text-[10px] text-stone-400 font-normal">Graceful exit</span>
                  </button>

                  <button
                    onClick={() => handleSubmitDecision('spark')}
                    className="py-4 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-sm shadow-xl shadow-rose-500/25 transition-all flex flex-col items-center gap-2 active:scale-95"
                  >
                    <span className="text-2xl">⚡</span>
                    <span>It's a Spark!</span>
                    <span className="text-[10px] text-rose-100 font-normal">Unlock profiles</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Waiting for {partnerAlias}'s decision...
                  </div>
                  <p className="text-xs text-stone-400">Recording choices...</p>
                </div>
              )}
            </div>
          )}

          {/* 4. RESULT PHASE */}
          {phase === 'result' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
              {resultData?.mutualSpark ? (
                /* Mutual Spark Reveal! */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-5 max-w-sm"
                >
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-rose-500 to-pink-500 mx-auto shadow-2xl shadow-rose-500/30">
                      <img
                        src={resultData.participantB?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
                        alt={resultData.participantB?.name}
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-2xl">💖</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-pink-400">
                      Mutual Spark! ✨
                    </h4>
                    <p className="text-sm font-bold text-white">
                      You and {resultData.participantB?.name || partnerAlias} both sparked!
                    </p>
                    <p className="text-xs text-stone-300">
                      {resultData.participantB?.city} • {resultData.participantB?.bio || 'Ready for good conversations & late night movies.'}
                    </p>
                  </div>

                  <div className="pt-2 space-y-2.5">
                    <button
                      onClick={() => {
                        if (resultData.roomId && resultData.passkey) {
                          onStartOneOnOneSpace(resultData.roomId, resultData.passkey, resultData.participantB);
                          onClose();
                        }
                      }}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      🚀 Launch Our Private Haven Space Now
                    </button>

                    <button
                      onClick={handleRejoinQueue}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 text-xs font-semibold transition-colors"
                    >
                      Play Another Speed Round
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* No Mutual Spark */
                <div className="space-y-4 max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center text-2xl mx-auto">
                    🌱
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-white">No Spark This Round</h4>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Every round sharpens your intuition. The right connection is waiting in the lounge!
                    </p>
                  </div>
                  <button
                    onClick={handleRejoinQueue}
                    className="py-3 px-5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                  >
                    Try Another Speed Round ⚡
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
