import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import {
  X,
  RotateCcw,
  Flag,
  Handshake,
  Swords,
  Crown,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  ArrowRight,
  Smile,
  Zap,
  Info,
  Clock,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneCall,
  PhoneOff,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Loader2,
} from 'lucide-react';
import { UserProfile, GameType, CallType, CallStatus } from '../types';
import confetti from 'canvas-confetti';
import {
  playChessMoveSound,
  playChessCaptureSound,
  playChessCheckSound,
} from '../utils/sounds';

interface ChessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  partner?: UserProfile;
  partnerName: string;
  partnerAvatar?: string;
  onBroadcastGameAction: (gameType: GameType, actionData: any) => void;
  incomingGameData?: { gameType: GameType; actionData: any; senderId: string } | null;

  // Background Voice & Video Calling integration while playing chess
  activeCallType?: CallType | null;
  callStatus?: CallStatus;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  localStream?: MediaStream | null;
  remoteStream?: MediaStream | null;
  onStartCall?: (type: CallType) => void;
  onEndCall?: () => void;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
}

// Crisp Vector Chess Piece Renderer
const ChessPiece: React.FC<{ type: string; color: 'w' | 'b'; className?: string }> = ({
  type,
  color,
  className = 'w-full h-full',
}) => {
  const isWhite = color === 'w';

  // Distinctive high-contrast visual styles
  const glyphMap: Record<string, { white: string; black: string }> = {
    p: { white: '♙', black: '♟' },
    r: { white: '♖', black: '♜' },
    n: { white: '♘', black: '♞' },
    b: { white: '♗', black: '♝' },
    q: { white: '♕', black: '♛' },
    k: { white: '♔', black: '♚' },
  };

  const glyph = glyphMap[type.toLowerCase()]?.[isWhite ? 'white' : 'black'] || '';

  return (
    <div
      className={`select-none flex items-center justify-center font-serif leading-none transition-transform duration-150 ${
        isWhite
          ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] filter'
          : 'text-stone-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]'
      } ${className}`}
      style={{
        fontSize: 'clamp(28px, 6vw, 46px)',
        textShadow: isWhite
          ? '-1px -1px 0 #333, 1px -1px 0 #333, -1px 1px 0 #333, 1px 1px 0 #333, 0 3px 6px rgba(0,0,0,0.7)'
          : '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 2px 4px rgba(0,0,0,0.5)',
      }}
    >
      {glyph}
    </div>
  );
};

export const ChessModal: React.FC<ChessModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partner,
  partnerName,
  partnerAvatar,
  onBroadcastGameAction,
  incomingGameData,
  activeCallType,
  callStatus = 'idle',
  isMuted = false,
  isVideoEnabled = false,
  localStream = null,
  remoteStream = null,
  onStartCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}) => {
  // Main Chess engine instance
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Background Audio / Video Call State & Refs
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const isCallActive = callStatus === 'connected';
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [showCamPiP, setShowCamPiP] = useState(true);
  const [isPiPMinimized, setIsPiPMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Background call timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCallActive) {
      interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive]);

  // Attach local and remote streams to media tags
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, showCamPiP, isVideoEnabled, isPiPMinimized]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream, showCamPiP, isPiPMinimized]);

  // Voice Activity Detection using Web Audio API
  useEffect(() => {
    if (!remoteStream || !isCallActive) {
      setIsPartnerSpeaking(false);
      return;
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
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [remoteStream, isCallActive]);

  // Player color orientation: 'w' or 'b'
  const [myColor, setMyColor] = useState<'w' | 'b'>('w');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [gameOutcome, setGameOutcome] = useState<{
    status: 'checkmate' | 'draw' | 'stalemate' | 'resigned' | null;
    winnerName?: string;
  }>({ status: null });

  // Draw offer / Resign states
  const [drawOfferedBy, setDrawOfferedBy] = useState<string | null>(null);
  const [chatReaction, setChatReaction] = useState<{ text: string; sender: string } | null>(null);

  // Scores
  const [scores, setScores] = useState({ me: 0, partner: 0 });

  // Synchronize incoming game actions from partner
  useEffect(() => {
    if (!incomingGameData) return;
    const { gameType, actionData } = incomingGameData;
    if (gameType !== 'chess') return;

    if (actionData.type === 'move') {
      try {
        const moveResult = chess.move({
          from: actionData.from,
          to: actionData.to,
          promotion: actionData.promotion || 'q',
        });

        if (moveResult) {
          setFen(chess.fen());
          setLastMove({ from: actionData.from, to: actionData.to });
          setHistory(chess.history());
          setSelectedSquare(null);
          setLegalMoves([]);

          // Sounds
          if (soundEnabled) {
            if (chess.isCheckmate() || chess.isDraw()) {
              playChessCheckSound();
            } else if (moveResult.captured) {
              playChessCaptureSound();
            } else if (chess.inCheck()) {
              playChessCheckSound();
            } else {
              playChessMoveSound();
            }
          }

          if (chess.isCheckmate()) {
            const winner = chess.turn() === 'w' ? 'Black' : 'White';
            const winnerName = winner === (myColor === 'w' ? 'White' : 'Black') ? currentUserName : partnerName;
            setGameOutcome({ status: 'checkmate', winnerName });
            if (winnerName === currentUserName) {
              confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
              setScores((prev) => ({ ...prev, me: prev.me + 1 }));
            } else {
              setScores((prev) => ({ ...prev, partner: prev.partner + 1 }));
            }
          } else if (chess.isDraw()) {
            setGameOutcome({ status: chess.isStalemate() ? 'stalemate' : 'draw' });
          }
        }
      } catch (err) {
        console.error('Failed to apply partner chess move:', err);
      }
    } else if (actionData.type === 'new_game') {
      chess.reset();
      setFen(chess.fen());
      setSelectedSquare(null);
      setLegalMoves([]);
      setLastMove(null);
      setHistory([]);
      setGameOutcome({ status: null });
      setDrawOfferedBy(null);
      if (actionData.switchSides) {
        setMyColor((prev) => (prev === 'w' ? 'b' : 'w'));
      }
    } else if (actionData.type === 'resign') {
      setGameOutcome({
        status: 'resigned',
        winnerName: currentUserName,
      });
      setScores((prev) => ({ ...prev, me: prev.me + 1 }));
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } else if (actionData.type === 'draw_offer') {
      setDrawOfferedBy(partnerName);
    } else if (actionData.type === 'draw_accept') {
      setGameOutcome({ status: 'draw' });
      setDrawOfferedBy(null);
    } else if (actionData.type === 'draw_decline') {
      setDrawOfferedBy(null);
    } else if (actionData.type === 'reaction') {
      setChatReaction({ text: actionData.text, sender: partnerName });
      setTimeout(() => setChatReaction(null), 3500);
    } else if (actionData.type === 'sync_color') {
      // If partner chose a side, assign opposite
      if (actionData.assignedColor) {
        setMyColor(actionData.assignedColor === 'w' ? 'b' : 'w');
      }
    }
  }, [incomingGameData, chess, myColor, currentUserName, partnerName, soundEnabled]);

  // Turn status
  const currentTurn = chess.turn(); // 'w' | 'b'
  const isMyTurn = currentTurn === myColor && !gameOutcome.status;

  // Board layout 8x8 (files a-h, ranks 8 down to 1)
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayFiles = myColor === 'w' ? files : [...files].reverse();
  const displayRanks = myColor === 'w' ? ranks : [...ranks].reverse();

  // Find legal destination moves for the clicked square
  const handleSquareClick = (square: Square) => {
    if (gameOutcome.status) return;

    const piece = chess.get(square);

    // If clicking on our own piece, select it and show legal moves
    if (piece && piece.color === myColor) {
      if (!isMyTurn) return; // Can't move if not our turn
      setSelectedSquare(square);
      const moves = chess.moves({ square, verbose: true });
      setLegalMoves(moves);
      return;
    }

    // If we have a piece selected, check if square is a legal destination
    if (selectedSquare && isMyTurn) {
      const destinationMove = legalMoves.find((m) => m.to === square);
      if (destinationMove) {
        // Check for pawn promotion
        if (
          destinationMove.piece === 'p' &&
          ((destinationMove.color === 'w' && square[1] === '8') ||
            (destinationMove.color === 'b' && square[1] === '1'))
        ) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        executeMove(selectedSquare, square);
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  };

  const executeMove = (from: Square, to: Square, promotion?: string) => {
    try {
      const moveResult = chess.move({
        from,
        to,
        promotion: promotion || 'q',
      });

      if (moveResult) {
        setFen(chess.fen());
        setLastMove({ from, to });
        setHistory(chess.history());
        setSelectedSquare(null);
        setLegalMoves([]);
        setPendingPromotion(null);

        // Sound cues
        if (soundEnabled) {
          if (chess.isCheckmate() || chess.isDraw()) {
            playChessCheckSound();
          } else if (moveResult.captured) {
            playChessCaptureSound();
          } else if (chess.inCheck()) {
            playChessCheckSound();
          } else {
            playChessMoveSound();
          }
        }

        // Broadcast to partner
        onBroadcastGameAction('chess', {
          type: 'move',
          from,
          to,
          promotion: promotion || 'q',
          fen: chess.fen(),
        });

        // Check endgame
        if (chess.isCheckmate()) {
          const winner = chess.turn() === 'w' ? 'Black' : 'White';
          const winnerName = winner === (myColor === 'w' ? 'White' : 'Black') ? currentUserName : partnerName;
          setGameOutcome({ status: 'checkmate', winnerName });
          if (winnerName === currentUserName) {
            confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
            setScores((prev) => ({ ...prev, me: prev.me + 1 }));
          } else {
            setScores((prev) => ({ ...prev, partner: prev.partner + 1 }));
          }
        } else if (chess.isDraw()) {
          setGameOutcome({ status: chess.isStalemate() ? 'stalemate' : 'draw' });
        }
      }
    } catch (err) {
      console.error('Invalid move attempt:', err);
    }
  };

  const handleStartNewGame = (switchSides = false) => {
    chess.reset();
    setFen(chess.fen());
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setHistory([]);
    setGameOutcome({ status: null });
    setDrawOfferedBy(null);

    const nextColor = switchSides ? (myColor === 'w' ? 'b' : 'w') : myColor;
    if (switchSides) {
      setMyColor(nextColor);
    }

    onBroadcastGameAction('chess', {
      type: 'new_game',
      switchSides,
    });
  };

  const handleResign = () => {
    if (gameOutcome.status) return;
    setGameOutcome({
      status: 'resigned',
      winnerName: partnerName,
    });
    setScores((prev) => ({ ...prev, partner: prev.partner + 1 }));
    onBroadcastGameAction('chess', { type: 'resign' });
  };

  const handleOfferDraw = () => {
    if (gameOutcome.status) return;
    setDrawOfferedBy('me');
    onBroadcastGameAction('chess', { type: 'draw_offer' });
  };

  const handleAcceptDraw = () => {
    setGameOutcome({ status: 'draw' });
    setDrawOfferedBy(null);
    onBroadcastGameAction('chess', { type: 'draw_accept' });
  };

  const handleDeclineDraw = () => {
    setDrawOfferedBy(null);
    onBroadcastGameAction('chess', { type: 'draw_decline' });
  };

  const sendReaction = (text: string) => {
    setChatReaction({ text, sender: 'You' });
    onBroadcastGameAction('chess', { type: 'reaction', text });
    setTimeout(() => setChatReaction(null), 3000);
  };

  // Captured pieces calculation
  const capturedPieces = useMemo(() => {
    const initialCounts: Record<string, number> = {
      p: 8,
      r: 2,
      n: 2,
      b: 2,
      q: 1,
    };

    const board = chess.board();
    const currentCounts: Record<'w' | 'b', Record<string, number>> = {
      w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
      b: { p: 0, r: 0, n: 0, b: 0, q: 0 },
    };

    board.forEach((row) => {
      row.forEach((sq) => {
        if (sq && sq.type !== 'k') {
          currentCounts[sq.color][sq.type] = (currentCounts[sq.color][sq.type] || 0) + 1;
        }
      });
    });

    const whiteLost: { type: string; count: number }[] = [];
    const blackLost: { type: string; count: number }[] = [];

    Object.keys(initialCounts).forEach((type) => {
      const wDiff = initialCounts[type] - (currentCounts.w[type] || 0);
      const bDiff = initialCounts[type] - (currentCounts.b[type] || 0);
      if (wDiff > 0) whiteLost.push({ type, count: wDiff });
      if (bDiff > 0) blackLost.push({ type, count: bDiff });
    });

    return { whiteLost, blackLost };
  }, [fen, chess]);

  if (!isOpen) return null;

  // King square in check
  let checkSquare: Square | null = null;
  if (chess.inCheck()) {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === chess.turn()) {
          checkSquare = (files[c] + ranks[r]) as Square;
          break;
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        id="live-chess-modal"
        className="w-full max-w-4xl bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col max-h-[96vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-stone-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xs">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                  <span>Live Chess with Partner</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Play standard live chess with checkmate, captured pieces, and move sounds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Background Voice/Video Call Controls */}
            {isCallActive ? (
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-emerald-500/40 rounded-2xl px-2.5 py-1 shadow-xs">
                {/* Partner speaking indicator */}
                <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700">
                  <div className="relative">
                    <img
                      src={partner?.avatar || partnerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={partnerName}
                      className={`w-6 h-6 rounded-full object-cover border ${
                        isPartnerSpeaking
                          ? 'border-emerald-400 ring-2 ring-emerald-400/60 animate-pulse'
                          : 'border-slate-600'
                      }`}
                    />
                    {isPartnerSpeaking && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-900" />
                    )}
                  </div>
                  <div className="flex flex-col text-left hidden sm:flex">
                    <span className="text-[10px] font-bold text-emerald-300 leading-tight">
                      {isPartnerSpeaking ? 'Speaking...' : 'Voice Live'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Mic Mute Toggle */}
                <button
                  id="btn-chess-toggle-mic"
                  onClick={onToggleMute}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                {/* Video Cam Toggle */}
                <button
                  id="btn-chess-toggle-cam"
                  onClick={onToggleVideo}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isVideoEnabled
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                      : 'bg-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                </button>

                {/* PiP Bubble Toggle */}
                <button
                  id="btn-chess-toggle-pip"
                  onClick={() => setShowCamPiP(!showCamPiP)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    showCamPiP ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Reaction Cam PiP"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                {/* Hang up call */}
                <button
                  id="btn-chess-end-voice"
                  onClick={onEndCall}
                  className="p-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                  title="End Background Call"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : callStatus === 'calling' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-xs text-amber-300 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span className="text-[11px] font-semibold">Calling {partnerName}...</span>
                <button
                  onClick={onEndCall}
                  className="p-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white ml-1 cursor-pointer"
                  title="Cancel Call"
                >
                  <PhoneOff className="w-3 h-3" />
                </button>
              </div>
            ) : callStatus === 'connecting' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px] font-semibold">Connecting audio...</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-start-chess-voice"
                  onClick={() => onStartCall?.('audio')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-2xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                  title="Talk with partner in background while playing chess"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Talk While Playing</span>
                  <span className="sm:hidden">Talk</span>
                </button>

                <button
                  id="btn-start-chess-video"
                  onClick={() => onStartCall?.('video')}
                  className="p-1.5 sm:px-2 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-2xl border border-slate-700 transition-all cursor-pointer"
                  title="Talk with video camera"
                >
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Players & Active Turn Status Bar */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
          {/* Top Player (Opponent/Partner) */}
          <div
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${
              currentTurn !== myColor
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
            }`}
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-700 ring-2 ring-slate-600 shrink-0">
              {partner?.avatar || partnerAvatar ? (
                <img
                  src={partner?.avatar || partnerAvatar}
                  alt={partnerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                  {partnerName.charAt(0)}
                </div>
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">
                  {partnerName}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-800 text-slate-300">
                  {myColor === 'w' ? 'Black ♚' : 'White ♔'}
                </span>
              </div>
              <div className="text-[10px]">
                {currentTurn !== myColor ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Thinking move...
                  </span>
                ) : (
                  <span>Waiting for you</span>
                )}
              </div>
            </div>
            <div className="text-right pl-1 text-[11px] font-bold text-slate-300">
              Score: {scores.partner}
            </div>
          </div>

          {/* Match Score & Status Centerpiece */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {chess.inCheck() ? (
                <span className="text-rose-400 font-extrabold animate-pulse">⚠️ CHECK!</span>
              ) : isMyTurn ? (
                <span className="text-emerald-400 font-bold">YOUR TURN</span>
              ) : (
                <span className="text-slate-400">PARTNER'S TURN</span>
              )}
            </div>
            <div className="text-xs font-black text-white flex items-center gap-1">
              <span>Move {Math.floor(history.length / 2) + 1}</span>
            </div>
          </div>

          {/* Bottom Player (You) */}
          <div
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${
              isMyTurn
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
            }`}
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-700 ring-2 ring-slate-600 shrink-0">
              {currentUserAvatar ? (
                <img
                  src={currentUserAvatar}
                  alt={currentUserName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                  {currentUserName.charAt(0)}
                </div>
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">
                  {currentUserName} (You)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-800 text-slate-300">
                  {myColor === 'w' ? 'White ♔' : 'Black ♚'}
                </span>
              </div>
              <div className="text-[10px]">
                {isMyTurn ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 animate-spin" />
                    Your Move!
                  </span>
                ) : (
                  <span>Partner's Turn</span>
                )}
              </div>
            </div>
            <div className="text-right pl-1 text-[11px] font-bold text-slate-300">
              Score: {scores.me}
            </div>
          </div>
        </div>

        {/* Reaction Pop-up Toast */}
        {chatReaction && (
          <div className="bg-amber-400 text-stone-900 font-bold text-xs py-1.5 px-4 text-center animate-bounce flex items-center justify-center gap-2">
            <span>💬 {chatReaction.sender}: {chatReaction.text}</span>
          </div>
        )}

        {/* Draw Offer Banner */}
        {drawOfferedBy && (
          <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 px-4 py-2 border-b border-indigo-700 flex items-center justify-between text-xs text-indigo-100">
            <span>
              {drawOfferedBy === 'me'
                ? '🤝 You offered a draw. Waiting for partner response...'
                : `🤝 ${partnerName} has offered a friendly draw!`}
            </span>
            {drawOfferedBy !== 'me' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptDraw}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={handleDeclineDraw}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Chess Area & Controls */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 bg-slate-900">
          {/* Left / Center: 8x8 Chessboard */}
          <div className="relative flex flex-col items-center select-none">
            {/* Captured Pieces of Opponent */}
            <div className="w-full flex items-center justify-between text-xs mb-1 px-1 min-h-[24px]">
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-[11px] font-semibold">Captured:</span>
                <div className="flex items-center gap-0.5 text-base">
                  {(myColor === 'w' ? capturedPieces.blackLost : capturedPieces.whiteLost).map((item, idx) => (
                    <span key={idx} className="opacity-90">
                      {item.count > 1 ? `${item.count}×` : ''}
                      {myColor === 'w' ? (
                        <span className="text-stone-300">
                          {{ p: '♟', r: '♜', n: '♞', b: '♝', q: '♛' }[item.type]}
                        </span>
                      ) : (
                        <span className="text-white">
                          {{ p: '♙', r: '♖', n: '♘', b: '♗', q: '♕' }[item.type]}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* The 8x8 Board Grid */}
            <div className="relative border-4 border-stone-800 rounded-xl overflow-hidden shadow-2xl bg-stone-900">
              <div className="grid grid-cols-8 grid-rows-8 w-[min(84vw,420px)] h-[min(84vw,420px)] sm:w-[440px] sm:h-[440px]">
                {displayRanks.map((rank) =>
                  displayFiles.map((file) => {
                    const square = (file + rank) as Square;
                    const piece = chess.get(square);
                    const fileIdx = files.indexOf(file);
                    const rankIdx = ranks.indexOf(rank);
                    const isLight = (fileIdx + rankIdx) % 2 === 0;

                    const isSelected = selectedSquare === square;
                    const isLegalMove = legalMoves.some((m) => m.to === square);
                    const isLastMoveSquare =
                      lastMove && (lastMove.from === square || lastMove.to === square);
                    const isCheckedKing = checkSquare === square;

                    return (
                      <div
                        key={square}
                        id={`chess-sq-${square}`}
                        onClick={() => handleSquareClick(square)}
                        className={`relative flex items-center justify-center transition-all cursor-pointer ${
                          isLight ? 'bg-[#eeeed2]' : 'bg-[#769656]'
                        } ${
                          isSelected
                            ? 'ring-4 ring-inset ring-amber-400 bg-amber-200/80 z-10'
                            : ''
                        } ${
                          isLastMoveSquare
                            ? 'bg-amber-300/60'
                            : ''
                        } ${
                          isCheckedKing
                            ? 'bg-red-500/80 animate-pulse ring-4 ring-inset ring-red-600'
                            : ''
                        }`}
                      >
                        {/* Square Coordinate Labels on Margins */}
                        {file === (myColor === 'w' ? 'a' : 'h') && (
                          <span
                            className={`absolute top-0.5 left-1 text-[9px] font-black pointer-events-none select-none ${
                              isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                            }`}
                          >
                            {rank}
                          </span>
                        )}
                        {rank === (myColor === 'w' ? '1' : '8') && (
                          <span
                            className={`absolute bottom-0.5 right-1 text-[9px] font-black pointer-events-none select-none ${
                              isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                            }`}
                          >
                            {file}
                          </span>
                        )}

                        {/* Legal Move Indicator */}
                        {isLegalMove && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            {piece ? (
                              <div className="w-full h-full border-4 border-amber-500/80 rounded-full animate-ping opacity-75" />
                            ) : (
                              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-900/35 backdrop-blur-xs" />
                            )}
                          </div>
                        )}

                        {/* Chess Piece */}
                        {piece && (
                          <div
                            className={`relative z-10 w-full h-full flex items-center justify-center ${
                              isSelected ? 'scale-110' : 'hover:scale-105'
                            }`}
                          >
                            <ChessPiece type={piece.type} color={piece.color} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Checkmate / Draw Overlay Banner */}
              {gameOutcome.status && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400 mb-2">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {gameOutcome.status === 'checkmate'
                      ? `🏆 Checkmate! ${gameOutcome.winnerName || 'Winner'} Wins!`
                      : gameOutcome.status === 'resigned'
                      ? `🏳️ Resignation! ${gameOutcome.winnerName || 'Winner'} Wins!`
                      : '🤝 Game Drawn!'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 mb-4">
                    {gameOutcome.status === 'checkmate'
                      ? 'Incredible tactical match with your partner.'
                      : 'Well played match by both lovers.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartNewGame(false)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rematch</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartNewGame(true)}
                      className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>Swap Sides & Rematch</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pawn Promotion Modal */}
              {pendingPromotion && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4">
                  <h4 className="font-bold text-white text-sm mb-3">Promote Your Pawn:</h4>
                  <div className="flex items-center gap-3">
                    {[
                      { type: 'q', label: 'Queen' },
                      { type: 'r', label: 'Rook' },
                      { type: 'b', label: 'Bishop' },
                      { type: 'n', label: 'Knight' },
                    ].map((promo) => (
                      <button
                        key={promo.type}
                        type="button"
                        onClick={() => executeMove(pendingPromotion.from, pendingPromotion.to, promo.type)}
                        className="w-14 h-14 bg-white/10 hover:bg-amber-500 hover:text-stone-900 rounded-2xl border border-white/20 flex flex-col items-center justify-center transition-all cursor-pointer group"
                      >
                        <ChessPiece type={promo.type} color={myColor} className="text-2xl" />
                        <span className="text-[9px] font-bold mt-1 text-slate-300 group-hover:text-stone-900">
                          {promo.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Captured Pieces of Self */}
            <div className="w-full flex items-center justify-between text-xs mt-1 px-1 min-h-[24px]">
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-[11px] font-semibold">Lost:</span>
                <div className="flex items-center gap-0.5 text-base">
                  {(myColor === 'w' ? capturedPieces.whiteLost : capturedPieces.blackLost).map((item, idx) => (
                    <span key={idx} className="opacity-90">
                      {item.count > 1 ? `${item.count}×` : ''}
                      {myColor === 'w' ? (
                        <span className="text-white">
                          {{ p: '♙', r: '♖', n: '♘', b: '♗', q: '♕' }[item.type]}
                        </span>
                      ) : (
                        <span className="text-stone-300">
                          {{ p: '♟', r: '♜', n: '♞', b: '♝', q: '♛' }[item.type]}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Moves History & Live Controls */}
          <div className="w-full lg:w-72 flex flex-col gap-3">
            {/* Live Background Call / Talk Card */}
            <div
              className={`p-3 rounded-2xl border transition-all ${
                isCallActive
                  ? 'bg-emerald-950/40 border-emerald-500/40'
                  : 'bg-slate-800/60 border-slate-700/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isCallActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {isCallActive ? 'Voice Live' : 'Voice Talk'}
                  </span>
                </div>
                {isCallActive ? (
                  <span className="text-[10px] font-mono text-emerald-300 font-semibold">
                    {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Background call</span>
                )}
              </div>

              {isCallActive ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <img
                          src={
                            partner?.avatar ||
                            partnerAvatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                          }
                          alt={partnerName}
                          className={`w-7 h-7 rounded-full object-cover border ${
                            isPartnerSpeaking
                              ? 'border-emerald-400 ring-2 ring-emerald-400 animate-pulse'
                              : 'border-slate-600'
                          }`}
                        />
                        {isPartnerSpeaking && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-900" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-white text-[11px] truncate max-w-[90px]">
                          {partnerName}
                        </div>
                        <div className="text-[9px] text-emerald-400 font-medium">
                          {isPartnerSpeaking ? 'Speaking...' : 'Listening'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={onToggleMute}
                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isMuted
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                        title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                      >
                        {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={onToggleVideo}
                        className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isVideoEnabled
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                      >
                        {isVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowCamPiP(!showCamPiP)}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium rounded-xl border border-slate-700 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>{showCamPiP ? 'Hide Reaction PiP' : 'Show Reaction PiP'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={onEndCall}
                      className="py-1.5 px-2.5 bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Hang up call"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>End</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Talk freely with {partnerName} in background while planning your moves.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onStartCall?.('audio')}
                      className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-700/20 transition-all cursor-pointer active:scale-95"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Start Voice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartCall?.('video')}
                      className="py-1.5 px-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 border border-slate-600 transition-all cursor-pointer"
                      title="Start Video Call"
                    >
                      <Video className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Video</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Reaction Chips */}
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Partner Emotes & Cues</span>
                <Smile className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Good move! 👏',
                  'Thinking... 🤔',
                  'Checkmate coming! 😈',
                  'Oops 🙈',
                  'Love you 💕',
                  'Mercy please! 🏳️',
                ].map((msg) => (
                  <button
                    key={msg}
                    type="button"
                    onClick={() => sendReaction(msg)}
                    className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-medium transition-all active:scale-95 cursor-pointer"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>

            {/* Move Notation List */}
            <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex flex-col h-44">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1 border-b border-slate-700 pb-1">
                <span>Moves ({history.length})</span>
                <span className="text-[10px] text-amber-400">Standard PGN</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs pr-1">
                {history.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Game started. White to move!
                  </div>
                )}
                {Array.from({ length: Math.ceil(history.length / 2) }).map((_, roundIdx) => {
                  const whiteMove = history[roundIdx * 2];
                  const blackMove = history[roundIdx * 2 + 1];
                  return (
                    <div
                      key={roundIdx}
                      className="flex items-center justify-between px-2 py-0.5 rounded hover:bg-slate-700/50"
                    >
                      <span className="text-slate-500 text-[10px] w-6">{roundIdx + 1}.</span>
                      <span className="flex-1 text-slate-200 font-semibold">{whiteMove}</span>
                      <span className="flex-1 text-slate-400">{blackMove || ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Game Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStartNewGame(false)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                title="Restart Game"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span className="text-[10px]">New Game</span>
              </button>

              <button
                type="button"
                onClick={handleOfferDraw}
                disabled={Boolean(gameOutcome.status)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                title="Offer Draw"
              >
                <Handshake className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px]">Offer Draw</span>
              </button>

              <button
                type="button"
                onClick={handleResign}
                disabled={Boolean(gameOutcome.status)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 border border-slate-700 hover:border-rose-700 disabled:opacity-40 text-rose-300 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                title="Resign Match"
              >
                <Flag className="w-4 h-4 text-rose-400" />
                <span className="text-[10px]">Resign</span>
              </button>
            </div>

            {/* Flip Board / Swap Color Controls */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800/40 rounded-xl border border-slate-700/40 text-xs text-slate-400">
              <span>Playing as: <strong className="text-white">{myColor === 'w' ? 'White' : 'Black'}</strong></span>
              <button
                type="button"
                onClick={() => setMyColor((prev) => (prev === 'w' ? 'b' : 'w'))}
                className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline text-[11px]"
              >
                Flip Board
              </button>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px]">Synced with {partnerName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
          >
            Close Game
          </button>
        </div>

        {/* Floating Reaction Cam PiP Bubble (Bottom Right) */}
        {isCallActive && showCamPiP && (
          <div
            id="chess-call-pip"
            className={`absolute z-30 transition-all duration-200 shadow-2xl rounded-2xl border ${
              isPiPMinimized
                ? 'bottom-12 right-4 bg-slate-900/95 border-emerald-500/40 p-2 flex items-center gap-2'
                : 'bottom-14 right-4 bg-slate-900/95 backdrop-blur-md border-emerald-500/40 p-2.5 flex flex-col gap-2 w-52 sm:w-60'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate">Talk with {partnerName}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsPiPMinimized(!isPiPMinimized)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={isPiPMinimized ? 'Expand Video' : 'Minimize'}
                >
                  {isPiPMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCamPiP(false)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Hide PiP"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isPiPMinimized && (
              <>
                {/* Partner Video Screen / Audio Avatar */}
                <div className="relative w-full aspect-4/3 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                  {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-2 text-center">
                      <div className="relative mb-1.5">
                        <img
                          src={
                            partner?.avatar ||
                            partnerAvatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                          }
                          alt={partnerName}
                          className={`w-12 h-12 rounded-full object-cover border-2 transition-all ${
                            isPartnerSpeaking
                              ? 'border-emerald-400 ring-4 ring-emerald-400/50 scale-105'
                              : 'border-slate-600'
                          }`}
                        />
                        {isPartnerSpeaking && (
                          <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-emerald-500 text-[8px] font-extrabold text-white rounded-full">
                            MIC
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-white truncate max-w-full">
                        {partnerName}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        {isPartnerSpeaking ? 'Speaking...' : 'Listening in call'}
                      </span>
                    </div>
                  )}

                  {/* Partner Name Label */}
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white/90 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-xs">
                    {partnerName}
                  </span>

                  {/* Local Cam Preview in Corner */}
                  {isVideoEnabled && (
                    <div className="absolute top-1.5 right-1.5 w-16 h-12 bg-slate-950 rounded-lg overflow-hidden border border-white/20 shadow-md">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover -scale-x-100"
                      />
                    </div>
                  )}
                </div>

                {/* Quick Call Action Bar inside PiP */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={onToggleMute}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleVideo}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isVideoEnabled
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                    <span>{isVideoEnabled ? 'Cam ON' : 'Cam OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onEndCall}
                    className="p-1 px-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-[10px] font-semibold flex items-center justify-center transition-colors cursor-pointer"
                    title="End Call"
                  >
                    <PhoneOff className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Remote Call Audio Stream Element */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      </div>
    </div>
  );
};
