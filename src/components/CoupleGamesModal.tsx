import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Gamepad2,
  X,
  Sparkles,
  HelpCircle,
  Vote,
  Split,
  CheckCircle2,
  Trophy,
  RefreshCw,
  Heart,
  Flame,
  CircleDot,
  ArrowRight,
  ArrowLeft,
  Crown,
  Zap,
  Smile,
  ShieldAlert,
  Dices,
  Swords,
  Candy,
  Grid,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Radio,
  Anchor,
  Wine,
  Box,
} from 'lucide-react';
import { UserProfile, GameType, CallStatus } from '../types';
import confetti from 'canvas-confetti';
import { DraughtsGame } from './games/DraughtsGame';
import { LudoGame } from './games/LudoGame';
import { CandyCrushGame } from './games/CandyCrushGame';
import { TruthOrDareGame } from './games/TruthOrDareGame';
import { BattleshipGame } from './games/BattleshipGame';
import { DotsAndBoxesGame } from './games/DotsAndBoxesGame';
import { DeepCardsGame } from './games/DeepCardsGame';
import { attachStreamToAudioContext, unlockAudioContext } from '../utils/sounds';

interface CoupleGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  partner?: UserProfile;
  partnerName: string;
  onBroadcastGameAction: (gameType: GameType, actionData: any) => void;
  incomingGameData?: { gameType: GameType; actionData: any; senderId: string } | null;
  onOpenChessModal?: () => void;
  initialTab?: GameType;
  // Audio Call props
  activeCallType?: 'audio' | 'video' | null;
  callStatus?: CallStatus;
  isMuted?: boolean;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  onStartCall?: (type: 'audio' | 'video') => void;
  onEndCall?: () => void;
  onToggleMute?: () => void;
}

const THIS_OR_THAT_PRESETS: { a: { text: string; emoji: string }; b: { text: string; emoji: string } }[] = [
  { a: { text: 'Cozy Cabin in the Woods', emoji: '🌲' }, b: { text: 'Sunny Beachfront Villa', emoji: '🏖️' } },
  { a: { text: 'Spontaneous Road Trip', emoji: '🚗' }, b: { text: 'Planned Luxury Resort', emoji: '✈️' } },
  { a: { text: 'Cuddle & Movie Night In', emoji: '🍿' }, b: { text: 'Dress Up & Fancy Dinner', emoji: '🍷' } },
  { a: { text: 'Sweet Breakfast in Bed', emoji: '🥞' }, b: { text: 'Savory Midnight Snacks', emoji: '🍕' } },
  { a: { text: 'Slow Dance in the Rain', emoji: '🌧️' }, b: { text: 'Stargazing by Campfire', emoji: '✨' } },
  { a: { text: 'Adopt 3 Cute Puppies', emoji: '🐶' }, b: { text: 'Adopt 3 Sleepy Kittens', emoji: '🐱' } },
  { a: { text: 'Morning Coffee Together', emoji: '☕' }, b: { text: 'Late Night Wine & Talks', emoji: '🥂' } },
  { a: { text: 'Theme Park Rollercoasters', emoji: '🎢' }, b: { text: 'Botanical Garden Stroll', emoji: '🌸' } },
];

const KNOW_ME_PRESETS: { question: string; options: string[] }[] = [
  { question: "What is my absolute favorite comfort food after a long day?", options: ["Creamy Pasta", "Cheesy Pizza", "Warm Ramen / Soup", "Sweet Dessert / Ice Cream"] },
  { question: "If we could teleport right now for 24 hours, where would I take you?", options: ["A quiet Japanese Onsen", "A cozy Parisian cafe", "A tropical Hawaiian beach", "A secluded mountain cabin"] },
  { question: "What makes me smile the fastest when I'm stressed?", options: ["A long warm hug & forehead kiss", "My favorite treat or snack", "Silly memes & funny faces", "Quiet companion time"] },
  { question: "What is my ideal Sunday morning with you?", options: ["Sleeping in until noon cuddling", "Morning walk & coffee shop hunt", "Cooking big brunch together", "Road trip to somewhere new"] },
  { question: "What was the very first thing that attracted me to you?", options: ["Your warm smile & eyes", "Your humor and laughter", "Your intelligence & depth", "Your voice and kindness"] },
];

const MOST_LIKELY_PRESETS: string[] = [
  "Who is most likely to fall asleep 10 minutes into a movie?",
  "Who is most likely to cry during a romantic or sad scene?",
  "Who takes longer getting ready before a date night?",
  "Who is more likely to buy surprise gifts for no reason?",
  "Who is the better navigator on a road trip?",
  "Who says 'I love you' more times per day?",
  "Who is more likely to wake up early on a weekend?",
  "Who sends more memes and cute reels throughout the day?",
];

type HeartTacCell = 'P1' | 'P2' | null;

export const CoupleGamesModal: React.FC<CoupleGamesModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partner,
  partnerName,
  onBroadcastGameAction,
  incomingGameData,
  onOpenChessModal,
  initialTab,
  activeCallType,
  callStatus = 'idle',
  isMuted = false,
  localStream,
  remoteStream,
  onStartCall,
  onEndCall,
  onToggleMute,
}) => {
  const [activeTab, setActiveTab] = useState<GameType>(initialTab || 'connect_hearts');

  // In-Game Audio Call States
  const [callDuration, setCallDuration] = useState(0);
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [isCallHudMinimized, setIsCallHudMinimized] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const isCallActive =
    (callStatus === 'connected' || callStatus === 'calling' || callStatus === 'connecting') &&
    activeCallType === 'audio';

  // Call duration counter
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callStatus === 'connected' && activeCallType === 'audio') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus, activeCallType]);

  // Safely play remote audio stream
  const attemptPlayAudio = useCallback(async () => {
    unlockAudioContext();
    if (!remoteAudioRef.current) return;
    try {
      await remoteAudioRef.current.play();
    } catch (err) {
      console.warn('Game audio call autoplay lock:', err);
    }
  }, []);

  // WebRTC remote audio attachment + VAD (Voice Activity Detection)
  useEffect(() => {
    if (!remoteStream || !isCallActive) {
      setIsPartnerSpeaking(false);
      return;
    }

    const cleanupAudio = attachStreamToAudioContext(remoteStream);

    if (remoteAudioRef.current) {
      remoteStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
        track.onunmute = () => attemptPlayAudio();
      });
      if (remoteAudioRef.current.srcObject !== remoteStream) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      attemptPlayAudio();
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId: number;

    try {
      const audioTrack = remoteStream.getAudioTracks()[0];
      if (audioTrack) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContext = new AudioCtx();
        const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudioLevel = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          setIsPartnerSpeaking(average > 25);
          animationFrameId = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      }
    } catch {
      // AudioContext unavailable or blocked
    }

    return () => {
      cleanupAudio();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [remoteStream, isCallActive, attemptPlayAudio]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerMuted;
    }
  }, [isSpeakerMuted]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Scores
  const [scores, setScores] = useState({ p1: 0, p2: 0 });

  // --- 1. Connect Hearts (Connect 4) State ---
  const ROWS = 6;
  const COLS = 7;
  const [c4Board, setC4Board] = useState<HeartTacCell[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [c4Turn, setC4Turn] = useState<'P1' | 'P2'>('P1');
  const [c4Winner, setC4Winner] = useState<'P1' | 'P2' | 'tie' | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  // --- 2. Know Me State ---
  const [kmIndex, setKmIndex] = useState<number>(0);
  const [kmTurn, setKmTurn] = useState<'P1' | 'P2'>('P1'); // Who is currently setting/guessing
  const [kmTargetIsMe, setKmTargetIsMe] = useState<boolean>(true);
  const [kmMyAnswer, setKmMyAnswer] = useState<number | null>(null);
  const [kmPartnerGuess, setKmPartnerGuess] = useState<number | null>(null);
  const [kmScore, setKmScore] = useState<number>(0);

  // --- 4. This or That State ---
  const [totIndex, setTotIndex] = useState<number>(0);
  const [totChoices, setTotChoices] = useState<Record<string, 'A' | 'B'>>({});

  // --- 5. Most Likely State ---
  const [mlIndex, setMlIndex] = useState<number>(0);
  const [mlVotes, setMlVotes] = useState<Record<string, string>>({});

  // Incoming Sync Handler
  useEffect(() => {
    if (!incomingGameData) return;
    const { gameType, actionData } = incomingGameData;

    if (gameType === 'draughts' || gameType === 'ludo' || gameType === 'candy_crush' || gameType === 'truth_or_dare') {
      setActiveTab(gameType);
    }

    if (gameType === 'connect_hearts') {
      if (actionData.type === 'move') {
        setC4Board(actionData.board);
        setC4Turn(actionData.nextTurn);
        setC4Winner(actionData.winner);
        if (actionData.winner && actionData.winner !== 'tie') {
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        }
      } else if (actionData.type === 'reset') {
        setC4Board(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
        setC4Turn('P1');
        setC4Winner(null);
      }
    } else if (gameType === 'this_or_that') {
      if (actionData.choice && actionData.userId) {
        setTotChoices((prev) => ({ ...prev, [actionData.userId]: actionData.choice }));
      }
    } else if (gameType === 'most_likely') {
      if (actionData.chosenUserId && actionData.voterId) {
        setMlVotes((prev) => ({ ...prev, [actionData.voterId]: actionData.chosenUserId }));
      }
    }
  }, [incomingGameData]);

  if (!isOpen) return null;

  // Stable identification of Player 1 vs Player 2 across the peer room
  const isPlayer1 = partner?.id ? (currentUserId <= partner.id) : true;
  const myPlayerRole: 'P1' | 'P2' = isPlayer1 ? 'P1' : 'P2';

  // Determine current active player turn across different game modes
  const getActiveTurn = (): 'P1' | 'P2' => {
    switch (activeTab) {
      case 'connect_hearts':
        return c4Turn;
      case 'know_me':
        return kmTurn;
      case 'this_or_that':
        return Object.keys(totChoices).includes(currentUserId) ? 'P2' : 'P1';
      case 'most_likely':
        return Object.keys(mlVotes).includes(currentUserId) ? 'P2' : 'P1';
      default:
        return 'P1';
    }
  };

  const activeTurn = getActiveTurn();
  const isMyTurn = activeTurn === myPlayerRole;

  // --- Connect Hearts Logic ---
  const checkConnect4Winner = (board: HeartTacCell[][]) => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = board[r][c];
        if (val && val === board[r][c + 1] && val === board[r][c + 2] && val === board[r][c + 3]) {
          return val;
        }
      }
    }
    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        const val = board[r][c];
        if (val && val === board[r + 1][c] && val === board[r + 2][c] && val === board[r + 3][c]) {
          return val;
        }
      }
    }
    // Diagonal down-right
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = board[r][c];
        if (val && val === board[r + 1][c + 1] && val === board[r + 2][c + 2] && val === board[r + 3][c + 3]) {
          return val;
        }
      }
    }
    // Diagonal up-right
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const val = board[r][c];
        if (val && val === board[r - 1][c + 1] && val === board[r - 2][c + 2] && val === board[r - 3][c + 3]) {
          return val;
        }
      }
    }
    // Check Tie
    if (board.every((row) => row.every((cell) => cell !== null))) {
      return 'tie' as const;
    }
    return null;
  };

  const handleDropC4 = (col: number) => {
    if (c4Winner) return;

    // Strict Turn Enforcement:
    const myC4Role = isPlayer1 ? 'P1' : 'P2';
    if (c4Turn !== myC4Role && Boolean(partner?.name || partnerName)) {
      return;
    }

    // Find lowest empty row in column
    let targetRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!c4Board[r][col]) {
        targetRow = r;
        break;
      }
    }

    if (targetRow === -1) return; // Column full

    const newBoard = c4Board.map((row) => [...row]);
    newBoard[targetRow][col] = c4Turn;

    const winnerResult = checkConnect4Winner(newBoard);
    const nextTurn = c4Turn === 'P1' ? 'P2' : 'P1';

    setC4Board(newBoard);
    setC4Turn(nextTurn);

    if (winnerResult) {
      setC4Winner(winnerResult);
      if (winnerResult === 'P1') {
        setScores((s) => ({ ...s, p1: s.p1 + 1 }));
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
      } else if (winnerResult === 'P2') {
        setScores((s) => ({ ...s, p2: s.p2 + 1 }));
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
      }
    }

    onBroadcastGameAction('connect_hearts', {
      type: 'move',
      board: newBoard,
      nextTurn,
      winner: winnerResult,
    });
  };

  const handleResetC4 = () => {
    setC4Board(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setC4Turn('P1');
    setC4Winner(null);
    onBroadcastGameAction('connect_hearts', { type: 'reset' });
  };

  // --- This or That Handlers ---
  const handleTotChoice = (choice: 'A' | 'B') => {
    const updated = { ...totChoices, [currentUserId]: choice };
    setTotChoices(updated);
    onBroadcastGameAction('this_or_that', { round: totIndex, choice, userId: currentUserId });
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
  };

  const handleNextTot = () => {
    setTotIndex((prev) => (prev + 1) % THIS_OR_THAT_PRESETS.length);
    setTotChoices({});
  };

  // --- Know Me Handlers ---
  const handleKnowMeSubmit = (optionIdx: number) => {
    if (kmTargetIsMe) {
      setKmMyAnswer(optionIdx);
      setKmTurn('P2'); // Turn shifts to partner to guess!
    } else {
      setKmPartnerGuess(optionIdx);
      if (kmMyAnswer !== null && kmMyAnswer === optionIdx) {
        setKmScore((prev) => prev + 1);
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.5 } });
      }
    }
  };

  const handleNextKnowMe = () => {
    setKmIndex((prev) => (prev + 1) % KNOW_ME_PRESETS.length);
    setKmMyAnswer(null);
    setKmPartnerGuess(null);
    setKmTargetIsMe(!kmTargetIsMe);
    setKmTurn(kmTargetIsMe ? 'P2' : 'P1');
  };

  // --- Most Likely Handlers ---
  const handleVoteMostLikely = (chosenUserId: string) => {
    const updated = { ...mlVotes, [currentUserId]: chosenUserId };
    setMlVotes(updated);
    onBroadcastGameAction('most_likely', { round: mlIndex, chosenUserId, voterId: currentUserId });
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.6 } });
  };

  const handleNextMostLikely = () => {
    setMlIndex((prev) => (prev + 1) % MOST_LIKELY_PRESETS.length);
    setMlVotes({});
  };

  const currentTot = THIS_OR_THAT_PRESETS[totIndex];
  const currentKm = KNOW_ME_PRESETS[kmIndex];
  const currentMl = MOST_LIKELY_PRESETS[mlIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div
        id="couple-games-modal"
        className="w-full max-w-3xl bg-white rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border-0 sm:border border-rose-100 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[92vh] transition-all"
      >
        {/* Header */}
        <div
          className="px-3 sm:px-6 py-3 bg-gradient-to-r from-rose-50 via-pink-50 to-indigo-50 border-b border-rose-100 flex items-center justify-between shrink-0 sticky top-0 z-20"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven-Style Mobile Back Button */}
            <button
              id="btn-games-mobile-back"
              onClick={onClose}
              className="p-1.5 -ml-1 text-rose-600 hover:bg-rose-100/60 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-500/10 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs shrink-0">
              <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
                <span>Games for Two & Couple Lounge</span>
                <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold tracking-wide shrink-0">
                  Live Synced
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Interactive real-time games with turn indicators & intimacy sparks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Audio Call & Play Action Button (when not currently in call) */}
            {!isCallActive && onStartCall && (
              <button
                type="button"
                id="btn-game-header-start-call"
                onClick={() => onStartCall('audio')}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs hover:shadow transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Audio Call partner to talk while playing"
              >
                <Phone className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Call & Play</span>
                <span className="sm:hidden">Call</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hidden Remote Audio Element for Crisp In-Game Voice */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* ========================================================================= */}
        {/* 🎙️ LIVE IN-GAME AUDIO CALL HUD */}
        {/* ========================================================================= */}
        {isCallActive && (
          <div
            id="in-game-audio-call-hud"
            className={`border-b transition-all duration-300 z-10 ${
              isCallHudMinimized
                ? 'bg-slate-900 px-3.5 py-1.5 border-emerald-500/30 text-white flex items-center justify-between'
                : 'bg-gradient-to-r from-emerald-950/95 via-slate-900 to-emerald-950/95 px-3 sm:px-5 py-2.5 border-emerald-500/40 text-white shadow-md'
            }`}
          >
            {isCallHudMinimized ? (
              /* Minimized Compact Bar */
              <div className="w-full flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={partner?.avatar || currentUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={partnerName}
                      className={`w-6 h-6 rounded-full object-cover border transition-all ${
                        isPartnerSpeaking ? 'border-emerald-400 ring-2 ring-emerald-400' : 'border-slate-600'
                      }`}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 font-mono">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    {callStatus === 'connected' ? formatDuration(callDuration) : 'Connecting...'}
                  </span>
                  {isPartnerSpeaking && (
                    <span className="text-[10px] text-emerald-400 font-semibold animate-pulse hidden xs:inline truncate">
                      Speaking 🎙️
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onToggleMute}
                    className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                      isMuted ? 'bg-rose-500/30 text-rose-300' : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                    }`}
                    title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={onEndCall}
                    className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer"
                    title="End Call"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCallHudMinimized(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Expand Call HUD"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Expanded Full HUD */
              <div className="flex items-center justify-between gap-3">
                {/* Left: Identity & Talking Status */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={partner?.avatar || currentUserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={partnerName}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 transition-all ${
                        isPartnerSpeaking
                          ? 'border-emerald-400 ring-2 ring-emerald-400/80 shadow-lg shadow-emerald-500/20'
                          : 'border-emerald-500/40'
                      }`}
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                        callStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[90px] sm:max-w-[150px]">
                        {partnerName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shrink-0">
                        {callStatus === 'connected' ? 'Voice Active' : callStatus === 'calling' ? 'Calling...' : 'Connecting...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium mt-0.5">
                      {callStatus === 'connected' ? (
                        <>
                          <span className="font-mono font-bold tracking-wider">{formatDuration(callDuration)}</span>
                          <span className="text-slate-500">•</span>
                          <span className="truncate">
                            {isPartnerSpeaking ? 'Speaking 🎙️' : 'Listening...'}
                          </span>
                        </>
                      ) : (
                        <span>Connecting audio line...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Live Equalizer Sound Wave Animation */}
                {callStatus === 'connected' && (
                  <div className="hidden sm:flex items-center gap-1 h-6 px-2.5 bg-slate-950/70 rounded-xl border border-emerald-500/20">
                    <div className={`w-1 bg-emerald-400 rounded-full transition-all duration-150 ${isPartnerSpeaking ? 'h-4 animate-bounce' : 'h-1.5'}`} />
                    <div className={`w-1 bg-emerald-400 rounded-full transition-all duration-150 ${isPartnerSpeaking ? 'h-5 animate-pulse' : 'h-2'}`} />
                    <div className={`w-1 bg-emerald-400 rounded-full transition-all duration-150 ${isPartnerSpeaking ? 'h-3 animate-bounce' : 'h-1'}`} />
                    <div className={`w-1 bg-emerald-400 rounded-full transition-all duration-150 ${isPartnerSpeaking ? 'h-4.5 animate-pulse' : 'h-2'}`} />
                  </div>
                )}

                {/* Right: Interactive Audio Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Mic Toggle */}
                  <button
                    type="button"
                    id="btn-game-mute-toggle"
                    onClick={onToggleMute}
                    className={`p-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      isMuted
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 hover:bg-rose-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
                    }`}
                    title={isMuted ? 'Unmute your microphone' : 'Mute your microphone'}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className="hidden md:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>

                  {/* Speaker Mute */}
                  <button
                    type="button"
                    id="btn-game-speaker-toggle"
                    onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                    className={`p-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      isSpeakerMuted
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                    title={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
                  >
                    {isSpeakerMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Hangup Button */}
                  <button
                    type="button"
                    id="btn-game-hangup-call"
                    onClick={onEndCall}
                    className="p-2 sm:px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="End Audio Call"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">End</span>
                  </button>

                  {/* Minimize HUD button */}
                  <button
                    type="button"
                    onClick={() => setIsCallHudMinimized(true)}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Minimize HUD to slim bar"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audio Call Suggestion Banner when not in call */}
        {!isCallActive && onStartCall && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-b border-emerald-100/90 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 truncate">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold truncate">
                Voice link ready: Talk live with {partnerName || 'partner'} while playing!
              </span>
            </div>
            <button
              type="button"
              id="btn-game-banner-start-call"
              onClick={() => onStartCall('audio')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
              title="Start audio call to talk while playing"
            >
              <Phone className="w-3 h-3" />
              <span>Audio Call</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 🔥 ACTIVE PLAYER TURN INDICATOR & PROFILE ARENA (CRITICAL USER REQUIREMENT) */}
        {/* ========================================================================= */}
        {/* Mobile Compact Single-Row Turn Ribbon (sm:hidden) */}
        <div className="sm:hidden px-3 py-1.5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {/* Player 1 Mini */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="relative w-6 h-6 rounded-full overflow-hidden bg-slate-700 ring-1 ring-rose-400 shrink-0">
              {(isPlayer1 ? currentUserAvatar : partner?.avatar) ? (
                <img
                  src={isPlayer1 ? currentUserAvatar : partner?.avatar}
                  alt={isPlayer1 ? currentUserName : (partner?.name || partnerName)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-[10px]">
                  {(isPlayer1 ? currentUserName : partnerName)?.charAt(0) || 'P1'}
                </div>
              )}
              {activeTurn === 'P1' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              )}
            </div>
            <span className="font-bold text-white text-[11px] truncate max-w-[70px]">
              {isPlayer1 ? currentUserName : (partner?.name || partnerName)}
            </span>
            <span className="text-[10px] text-rose-300 font-mono font-bold">W:{scores.p1}</span>
          </div>

          {/* Turn status pill */}
          <div className="shrink-0 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-[10px] font-bold">
            {isMyTurn ? (
              <span className="text-emerald-400 flex items-center gap-1 animate-pulse font-extrabold">
                <Sparkles className="w-2.5 h-2.5" /> Your Move
              </span>
            ) : (
              <span className="text-slate-400">
                {partnerName || 'Partner'}'s Move
              </span>
            )}
          </div>

          {/* Player 2 Mini */}
          <div className="flex items-center gap-1.5 min-w-0 justify-end">
            <span className="text-[10px] text-indigo-300 font-mono font-bold">W:{scores.p2}</span>
            <span className="font-bold text-white text-[11px] truncate max-w-[70px]">
              {!isPlayer1 ? currentUserName : (partner?.name || partnerName)}
            </span>
            <div className="relative w-6 h-6 rounded-full overflow-hidden bg-slate-700 ring-1 ring-indigo-400 shrink-0">
              {(!isPlayer1 ? currentUserAvatar : partner?.avatar) ? (
                <img
                  src={!isPlayer1 ? currentUserAvatar : partner?.avatar}
                  alt={!isPlayer1 ? currentUserName : (partner?.name || partnerName)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-[10px]">
                  {(!isPlayer1 ? currentUserName : partnerName)?.charAt(0) || 'P2'}
                </div>
              )}
              {activeTurn === 'P2' && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Desktop Dual Card Turn Arena (hidden sm:block) */}
        <div className="hidden sm:block px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            {/* PLAYER 1 (Red / Primary) */}
            <div
              id="game-player-p1-area"
              className={`flex-1 p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden flex items-center gap-3 ${
                activeTurn === 'P1'
                  ? 'bg-gradient-to-r from-rose-950/80 to-rose-900/60 border-rose-400/80 animate-turn-glow-rose shadow-lg'
                  : 'bg-slate-800/40 border-slate-700/50 opacity-70 hover:opacity-90'
              }`}
            >
              {/* Profile Icon with Turn Halo Ring */}
              <div className="relative shrink-0">
                {activeTurn === 'P1' && (
                  <>
                    <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-rose-500 via-pink-400 to-rose-600 animate-turn-halo opacity-80 blur-[2px]" />
                    <div className="absolute -inset-1 rounded-full border-2 border-rose-300 animate-radar-wave" />
                  </>
                )}
                <div
                  className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-md transition-all ${
                    activeTurn === 'P1'
                      ? 'ring-2 ring-rose-300 bg-rose-500 text-white'
                      : 'ring-1 ring-slate-600 bg-slate-700 text-slate-200'
                  }`}
                >
                  {(isPlayer1 ? currentUserAvatar : partner?.avatar) ? (
                    <img
                      src={isPlayer1 ? currentUserAvatar : partner?.avatar}
                      alt={isPlayer1 ? currentUserName : (partner?.name || partnerName)}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span>{(isPlayer1 ? currentUserName : partnerName)?.charAt(0)?.toUpperCase() || 'P1'}</span>
                  )}
                  {activeTurn === 'P1' && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-400 border-2 border-slate-900 rounded-full animate-ping" />
                  )}
                </div>
              </div>

              {/* Player 1 Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    {isPlayer1 ? currentUserName : (partner?.name || partnerName || 'Partner')}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-semibold shrink-0">
                    {isPlayer1 ? 'You (❤️)' : 'Partner (❤️)'}
                  </span>
                </div>

                {activeTurn === 'P1' ? (
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] font-bold text-rose-300 animate-turn-badge">
                    <Sparkles className="w-3 h-3 text-rose-400 animate-spin" />
                    <span>{isPlayer1 ? 'YOUR TURN TO PLAY' : `${partnerName || 'Partner'}'S TURN`}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 block mt-0.5">Waiting for move...</span>
                )}
              </div>

              {/* Score badge */}
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Wins</span>
                <span className="text-xs font-bold text-rose-300">{scores.p1}</span>
              </div>
            </div>

            {/* Turn Flow Indicator / Dynamic Bridge */}
            <div className="flex flex-col items-center justify-center shrink-0 px-1">
              <div className="flex items-center gap-1 text-[11px] font-black tracking-wider uppercase">
                {isMyTurn ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    {isPlayer1 ? <ArrowLeft className="w-3.5 h-3.5 animate-pulse" /> : <ArrowRight className="w-3.5 h-3.5 animate-pulse" />}
                    <span>YOUR MOVE</span>
                  </span>
                ) : (
                  <span className="text-indigo-400 flex items-center gap-1">
                    {!isPlayer1 ? <ArrowLeft className="w-3.5 h-3.5 animate-pulse" /> : null}
                    <span>{partnerName || 'PARTNER'}'S MOVE</span>
                    {isPlayer1 ? <ArrowRight className="w-3.5 h-3.5 animate-pulse" /> : null}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-slate-500 font-medium mt-0.5">
                {activeTab === 'connect_hearts'
                  ? '4-in-a-row'
                  : 'Turn Based'}
              </span>
            </div>

            {/* PLAYER 2 (Blue / Secondary) */}
            <div
              id="game-player-p2-area"
              className={`flex-1 p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden flex items-center gap-3 ${
                activeTurn === 'P2'
                  ? 'bg-gradient-to-r from-indigo-950/80 to-purple-900/60 border-indigo-400/80 animate-turn-glow-indigo shadow-lg'
                  : 'bg-slate-800/40 border-slate-700/50 opacity-70 hover:opacity-90'
              }`}
            >
              {/* Profile Icon with Turn Halo Ring */}
              <div className="relative shrink-0">
                {activeTurn === 'P2' && (
                  <>
                    <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-400 to-indigo-600 animate-turn-halo opacity-80 blur-[2px]" />
                    <div className="absolute -inset-1 rounded-full border-2 border-indigo-300 animate-radar-wave" />
                  </>
                )}
                <div
                  className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shadow-md transition-all ${
                    activeTurn === 'P2'
                      ? 'ring-2 ring-indigo-300 bg-indigo-600 text-white'
                      : 'ring-1 ring-slate-600 bg-slate-700 text-slate-200'
                  }`}
                >
                  {(!isPlayer1 ? currentUserAvatar : partner?.avatar) ? (
                    <img
                      src={!isPlayer1 ? currentUserAvatar : partner?.avatar}
                      alt={!isPlayer1 ? currentUserName : (partner?.name || partnerName)}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span>{(!isPlayer1 ? currentUserName : partnerName)?.charAt(0)?.toUpperCase() || 'P2'}</span>
                  )}
                  {activeTurn === 'P2' && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-400 border-2 border-slate-900 rounded-full animate-ping" />
                  )}
                </div>
              </div>

              {/* Player 2 Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    {!isPlayer1 ? currentUserName : (partner?.name || partnerName || 'Partner')}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-semibold shrink-0">
                    {!isPlayer1 ? 'You (💙)' : 'Partner (💙)'}
                  </span>
                </div>

                {activeTurn === 'P2' ? (
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] font-bold text-indigo-300 animate-turn-badge">
                    <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
                    <span>{!isPlayer1 ? 'YOUR TURN TO PLAY' : `${partnerName || 'Partner'}'S TURN`}</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 block mt-0.5">Waiting for move...</span>
                )}
              </div>

              {/* Score badge */}
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Wins</span>
                <span className="text-xs font-bold text-indigo-300">{scores.p2}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-rose-100 bg-slate-50/80 p-1.5 gap-1.5 px-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('connect_hearts')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'connect_hearts'
                ? 'bg-white text-rose-600 shadow-xs border border-rose-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Connect Hearts (4)</span>
          </button>

          <button
            onClick={() => setActiveTab('draughts')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'draughts'
                ? 'bg-white text-amber-700 shadow-xs border border-amber-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-amber-700" />
            <span>Draughts (Checkers)</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-extrabold">NEW</span>
          </button>

          <button
            onClick={() => setActiveTab('ludo')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ludo'
                ? 'bg-white text-sky-700 shadow-xs border border-sky-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Dices className="w-3.5 h-3.5 text-sky-600" />
            <span>Ludo for Two</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 font-extrabold">NEW</span>
          </button>

          <button
            onClick={() => setActiveTab('candy_crush')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'candy_crush'
                ? 'bg-white text-pink-600 shadow-xs border border-pink-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Candy className="w-3.5 h-3.5 text-pink-500" />
            <span>Sweet Candy Crush</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-700 font-extrabold">NEW</span>
          </button>

          <button
            onClick={() => setActiveTab('battleship')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'battleship'
                ? 'bg-white text-cyan-600 shadow-xs border border-cyan-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Anchor className="w-3.5 h-3.5 text-cyan-500" />
            <span>Fleet Strike</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-100 text-cyan-800 font-extrabold">HOT</span>
          </button>

          <button
            onClick={() => setActiveTab('dots_and_boxes')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dots_and_boxes'
                ? 'bg-white text-purple-600 shadow-xs border border-purple-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-purple-500" />
            <span>Dots & Boxes</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-extrabold">NEW</span>
          </button>

          <button
            onClick={() => setActiveTab('deep_cards')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'deep_cards'
                ? 'bg-white text-rose-600 shadow-xs border border-rose-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wine className="w-3.5 h-3.5 text-rose-500" />
            <span>Deep Cards & Never</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-extrabold">POPULAR</span>
          </button>

          <button
            onClick={() => {
              if (onOpenChessModal) {
                onOpenChessModal();
                onClose();
              } else {
                setActiveTab('chess');
              }
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'chess'
                ? 'bg-white text-amber-700 shadow-xs border border-amber-300'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-amber-600" />
            <span>Live Chess</span>
          </button>

          <button
            onClick={() => setActiveTab('know_me')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'know_me'
                ? 'bg-white text-rose-600 shadow-xs border border-rose-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Know Me</span>
          </button>

          <button
            onClick={() => setActiveTab('truth_or_dare')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'truth_or_dare'
                ? 'bg-white text-rose-600 shadow-xs border border-rose-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Truth or Dare</span>
          </button>

          <button
            onClick={() => setActiveTab('this_or_that')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'this_or_that'
                ? 'bg-white text-rose-600 shadow-xs border border-rose-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>This or That</span>
          </button>

          <button
            onClick={() => setActiveTab('most_likely')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'most_likely'
                ? 'bg-white text-rose-600 shadow-xs border border-rose-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Most Likely</span>
          </button>
        </div>

        {/* Game Contents */}
        <div className="p-2 sm:p-5 md:p-6 overflow-y-auto flex-1 bg-gradient-to-b from-white to-rose-50/20">
          {/* ========================================================================= */}
          {/* GAME: DRAUGHTS / CHECKERS */}
          {/* ========================================================================= */}
          {activeTab === 'draughts' && (
            <DraughtsGame
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              partnerName={partnerName}
              currentUserAvatar={currentUserAvatar}
              partnerAvatar={partner?.avatar}
              isPlayer1={isPlayer1}
              isMyTurn={isMyTurn}
              onBroadcastAction={(actionData) => onBroadcastGameAction('draughts', actionData)}
              incomingAction={incomingGameData?.gameType === 'draughts' ? incomingGameData.actionData : undefined}
            />
          )}

          {/* ========================================================================= */}
          {/* GAME: LUDO FOR TWO */}
          {/* ========================================================================= */}
          {activeTab === 'ludo' && (
            <LudoGame
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              partnerName={partnerName}
              currentUserAvatar={currentUserAvatar}
              partnerAvatar={partner?.avatar}
              isPlayer1={isPlayer1}
              isMyTurn={isMyTurn}
              onBroadcastAction={(actionData) => onBroadcastGameAction('ludo', actionData)}
              incomingAction={incomingGameData?.gameType === 'ludo' ? incomingGameData.actionData : undefined}
            />
          )}

          {/* ========================================================================= */}
          {/* GAME: SWEET CANDY CRUSH FOR TWO */}
          {/* ========================================================================= */}
          {activeTab === 'candy_crush' && (
            <CandyCrushGame
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              partnerName={partnerName}
              currentUserAvatar={currentUserAvatar}
              partnerAvatar={partner?.avatar}
              isPlayer1={isPlayer1}
              isMyTurn={isMyTurn}
              onBroadcastAction={(actionData) => onBroadcastGameAction('candy_crush', actionData)}
              incomingAction={incomingGameData?.gameType === 'candy_crush' ? incomingGameData.actionData : undefined}
            />
          )}

          {/* ========================================================================= */}
          {/* GAME: FLEET STRIKE (BATTLESHIP) */}
          {/* ========================================================================= */}
          {activeTab === 'battleship' && (
            <BattleshipGame
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              partnerName={partnerName}
              currentUserAvatar={currentUserAvatar}
              partnerAvatar={partner?.avatar}
              isPlayer1={isPlayer1}
              onBroadcastAction={(actionData) => onBroadcastGameAction('battleship', actionData)}
              incomingAction={incomingGameData?.gameType === 'battleship' ? incomingGameData.actionData : undefined}
            />
          )}

          {/* ========================================================================= */}
          {/* GAME: DOTS & BOXES (LOVE TERRITORY) */}
          {/* ========================================================================= */}
          {activeTab === 'dots_and_boxes' && (
            <DotsAndBoxesGame
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              partnerName={partnerName}
              currentUserAvatar={currentUserAvatar}
              partnerAvatar={partner?.avatar}
              isPlayer1={isPlayer1}
              onBroadcastAction={(actionData) => onBroadcastGameAction('dots_and_boxes', actionData)}
              incomingAction={incomingGameData?.gameType === 'dots_and_boxes' ? incomingGameData.actionData : undefined}
            />
          )}

          {/* ========================================================================= */}
          {/* GAME: DEEP CARDS & NEVER HAVE I EVER */}
          {/* ========================================================================= */}
          {activeTab === 'deep_cards' && (
            <DeepCardsGame
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              partnerName={partnerName}
              currentUserAvatar={currentUserAvatar}
              partnerAvatar={partner?.avatar}
              isPlayer1={isPlayer1}
              onBroadcastAction={(actionData) => onBroadcastGameAction('deep_cards', actionData)}
              incomingAction={incomingGameData?.gameType === 'deep_cards' ? incomingGameData.actionData : undefined}
            />
          )}

          {/* ========================================================================= */}
          {/* GAME 0: LIVE CHESS */}
          {/* ========================================================================= */}
          {activeTab === 'chess' && (
            <div className="space-y-6 flex flex-col items-center text-center py-6 animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center text-amber-600 shadow-xl">
                <Swords className="w-10 h-10" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-xl font-black text-slate-800 flex items-center justify-center gap-2">
                  <span>Live Chess Arena</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold uppercase">
                    Real-time
                  </span>
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Challenge {partnerName} to a real-time chess showdown with legal moves highlighting, checkmate detection, captured pieces counter, and move audio chimes.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-left">
                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80">
                  <div className="text-xs font-bold text-amber-900">♔ Standard Rules</div>
                  <div className="text-[10px] text-amber-700">Castling, en passant & promotions</div>
                </div>
                <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200/80">
                  <div className="text-xs font-bold text-indigo-900">⚡ Live Sync</div>
                  <div className="text-[10px] text-indigo-700">Zero-latency move broadcasts</div>
                </div>
                <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200/80">
                  <div className="text-xs font-bold text-rose-900">🏆 Rematch & Cues</div>
                  <div className="text-[10px] text-rose-700">Interactive emotes & sounds</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onOpenChessModal) {
                    onOpenChessModal();
                    onClose();
                  }
                }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-700 hover:to-yellow-600 text-stone-900 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
              >
                <Swords className="w-4 h-4 text-stone-900" />
                <span>Launch Live Chess Arena</span>
                <ArrowRight className="w-4 h-4 text-stone-900" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* GAME 1: CONNECT HEARTS (4 IN A ROW) */}
          {/* ========================================================================= */}
          {activeTab === 'connect_hearts' && (
            <div className="space-y-6 flex flex-col items-center">
              {c4Winner && (
                <div className="w-full max-w-sm p-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white text-center shadow-lg animate-bounce">
                  <Crown className="w-6 h-6 mx-auto mb-1 text-amber-300" />
                  <h4 className="font-bold text-sm">
                    {c4Winner === 'tie'
                      ? "Board Full! It's a draw 💕"
                      : c4Winner === 'P1'
                      ? `🎉 4 in a Row! ${currentUserName} Wins!`
                      : `🎉 4 in a Row! ${partnerName} Wins!`}
                  </h4>
                </div>
              )}

              {/* Connect 4 Board */}
              <div className="p-4 rounded-3xl bg-slate-950 shadow-2xl border-4 border-slate-800 max-w-full overflow-x-auto">
                {/* Column Drop Indicator Buttons */}
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {Array(COLS).fill(0).map((_, colIdx) => (
                    <button
                      key={colIdx}
                      onClick={() => handleDropC4(colIdx)}
                      onMouseEnter={() => setHoveredCol(colIdx)}
                      onMouseLeave={() => setHoveredCol(null)}
                      disabled={!!c4Winner}
                      className={`h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                        hoveredCol === colIdx
                          ? 'bg-rose-500 text-white shadow-sm scale-105'
                          : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      ↓
                    </button>
                  ))}
                </div>

                {/* 6 Rows x 7 Columns */}
                <div className="grid grid-rows-6 gap-1.5 bg-slate-900 p-2.5 rounded-2xl">
                  {c4Board.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-7 gap-1.5">
                      {row.map((cell, cIdx) => (
                        <div
                          key={cIdx}
                          onClick={() => handleDropC4(cIdx)}
                          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xl transition-all cursor-pointer ${
                            cell === 'P1'
                              ? 'bg-rose-500 text-white shadow-inner scale-95 border-2 border-rose-300'
                              : cell === 'P2'
                              ? 'bg-purple-600 text-white shadow-inner scale-95 border-2 border-purple-300'
                              : 'bg-slate-950 border border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          {cell === 'P1' && '❤️'}
                          {cell === 'P2' && '💜'}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleResetC4}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Board</span>
                </button>
                <button
                  onClick={() => setC4Turn((prev) => (prev === 'P1' ? 'P2' : 'P1'))}
                  className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Switch Turn</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* GAME 3: HOW WELL DO YOU KNOW ME? */}
          {/* ========================================================================= */}
          {activeTab === 'know_me' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-600">Question {kmIndex + 1} of {KNOW_ME_PRESETS.length}</span>
                <div className="flex items-center gap-1.5 font-bold text-amber-600">
                  <Trophy className="w-4 h-4" />
                  <span>Score: {kmScore} pts</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-xs">
                <h3 className="text-base font-bold text-slate-800 text-center mb-1">
                  "{currentKm.question}"
                </h3>
                <p className="text-xs text-rose-600 text-center font-medium">
                  {kmTargetIsMe
                    ? `Step 1 (Your Turn): Lock in your real answer for ${partner ? partner.name : partnerName} to guess`
                    : `Step 2 (Partner's Turn): Guess ${partner ? partner.name : partnerName}'s secret answer!`}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentKm.options.map((opt, idx) => {
                  const isSelected = kmTargetIsMe ? kmMyAnswer === idx : kmPartnerGuess === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleKnowMeSubmit(idx)}
                      className={`p-4 rounded-2xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200 scale-101'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300 hover:bg-rose-50/40'
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleNextKnowMe}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Next Question / Switch Roles</span>
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* GAME 4: TRUTH OR DARE */}
          {/* ========================================================================= */}
          {activeTab === 'truth_or_dare' && (
            <TruthOrDareGame
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserAvatar={currentUserAvatar}
              partnerName={partnerName}
              partnerAvatar={partner?.avatar}
              isPlayer1={isPlayer1}
              onBroadcastAction={(actionData) => onBroadcastGameAction('truth_or_dare', actionData)}
              incomingAction={
                incomingGameData?.gameType === 'truth_or_dare' ? incomingGameData.actionData : undefined
              }
            />
          )}

          {/* ========================================================================= */}
          {/* GAME 5: THIS OR THAT */}
          {/* ========================================================================= */}
          {activeTab === 'this_or_that' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-rose-600">Round {totIndex + 1} of {THIS_OR_THAT_PRESETS.length}</span>
                <span>Choose your true preference</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A */}
                <button
                  onClick={() => handleTotChoice('A')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer ${
                    totChoices[currentUserId] === 'A'
                      ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-md shadow-rose-100 scale-102'
                      : 'bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 text-slate-700'
                  }`}
                >
                  <span className="text-5xl">{currentTot.a.emoji}</span>
                  <span className="text-base font-bold">{currentTot.a.text}</span>
                  {totChoices[currentUserId] === 'A' && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-semibold">
                      Your Pick ✓
                    </span>
                  )}
                </button>

                {/* Option B */}
                <button
                  onClick={() => handleTotChoice('B')}
                  className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer ${
                    totChoices[currentUserId] === 'B'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-md shadow-indigo-100 scale-102'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-700'
                  }`}
                >
                  <span className="text-5xl">{currentTot.b.emoji}</span>
                  <span className="text-base font-bold">{currentTot.b.text}</span>
                  {totChoices[currentUserId] === 'B' && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-semibold">
                      Your Pick ✓
                    </span>
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextTot}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Next Question</span>
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* GAME 6: WHO'S MOST LIKELY TO */}
          {/* ========================================================================= */}
          {activeTab === 'most_likely' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-rose-600">Prompt {mlIndex + 1} of {MOST_LIKELY_PRESETS.length}</span>
                <span>Cast your honest vote</span>
              </div>

              <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 border border-rose-200 text-center">
                <Flame className="w-8 h-8 text-rose-500 mx-auto mb-2 animate-bounce" />
                <h3 className="text-lg font-bold text-slate-800">{currentMl}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleVoteMostLikely(currentUserId)}
                  className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer ${
                    mlVotes[currentUserId] === currentUserId
                      ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-md shadow-rose-100 scale-102'
                      : 'bg-white border-slate-200 hover:border-rose-300 text-slate-700'
                  }`}
                >
                  <span className="text-3xl">🙋‍♂️</span>
                  <span className="font-bold text-sm">Me ({currentUserName})</span>
                  {mlVotes[currentUserId] === currentUserId && (
                    <span className="text-[11px] font-semibold text-rose-600">You Voted</span>
                  )}
                </button>

                <button
                  onClick={() => handleVoteMostLikely(partner ? partner.id : 'partner')}
                  className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 cursor-pointer ${
                    mlVotes[currentUserId] === (partner ? partner.id : 'partner')
                      ? 'bg-pink-50 border-pink-400 text-pink-900 shadow-md shadow-pink-100 scale-102'
                      : 'bg-white border-slate-200 hover:border-pink-300 text-slate-700'
                  }`}
                >
                  <span className="text-3xl">🙋‍♀️</span>
                  <span className="font-bold text-sm">{partner ? partner.name : partnerName}</span>
                  {mlVotes[currentUserId] === (partner ? partner.id : 'partner') && (
                    <span className="text-[11px] font-semibold text-pink-600">You Voted</span>
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextMostLikely}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Next Vote</span>
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
