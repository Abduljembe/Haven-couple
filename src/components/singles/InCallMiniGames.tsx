import React, { useState, useRef, useEffect } from 'react';
import {
  Gamepad2,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Flame,
  Palette,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { ScreeningMiniGameType, TwoTruthsLieGame, DealbreakerItem } from '../../types';

interface InCallMiniGamesProps {
  socket: any;
  sessionId?: string;
  myUserId: string;
  myName: string;
  partnerName: string;
  onClose: () => void;
}

const DEALBREAKER_LIST: DealbreakerItem[] = [
  { id: 1, title: 'Pets sleeping on the bed every single night', category: 'lifestyle', emoji: '🐕' },
  { id: 2, title: 'Constantly checking phone / Instagram at dinner', category: 'dating', emoji: '📱' },
  { id: 3, title: 'Strict 50/50 bill split on first 3 dates', category: 'dating', emoji: '💳' },
  { id: 4, title: 'Spontaneous weekend camping without running water', category: 'lifestyle', emoji: '🏕️' },
  { id: 5, title: 'Pineapple and hot honey on pizza', category: 'quirks', emoji: '🍕' },
  { id: 6, title: 'Leaving dishes in the sink until the next morning', category: 'lifestyle', emoji: '🍽️' },
  { id: 7, title: 'Singing karaoke in front of a room of strangers', category: 'quirks', emoji: '🎤' },
];

export const InCallMiniGames: React.FC<InCallMiniGamesProps> = ({
  socket,
  sessionId,
  myUserId,
  myName,
  partnerName,
  onClose,
}) => {
  const [activeGame, setActiveGame] = useState<ScreeningMiniGameType>('dealbreakers');

  // Dealbreakers state
  const [dealbreakerIndex, setDealbreakerIndex] = useState(0);
  const [myVote, setMyVote] = useState<'dealbreaker' | 'tolerable' | 'love_it' | null>(null);
  const [partnerVote, setPartnerVote] = useState<'dealbreaker' | 'tolerable' | 'love_it' | null>(null);

  // Two Truths & A Lie state
  const [twoTruthsCards, setTwoTruthsCards] = useState<TwoTruthsLieGame>({
    authorId: myUserId,
    authorName: myName,
    revealed: false,
    statements: [
      { text: 'I ran a half marathon on a dare without training.', isLie: false },
      { text: 'I have never had a cavity in my entire life.', isLie: true },
      { text: 'I once accidentally cooked dinner for a minor celebrity.', isLie: false },
    ],
  });
  const [guessedIndex, setGuessedIndex] = useState<number | null>(null);

  // Canvas Scribble state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#f43f5e');

  const currentDealbreaker = DEALBREAKER_LIST[dealbreakerIndex % DEALBREAKER_LIST.length];

  // Socket listener for game sync
  useEffect(() => {
    if (!socket) return;

    const handleGameUpdate = (data: any) => {
      if (data.type === 'dealbreaker_vote') {
        if (data.senderId !== myUserId) {
          setPartnerVote(data.vote);
        }
      } else if (data.type === 'dealbreaker_next') {
        setDealbreakerIndex(data.index);
        setMyVote(null);
        setPartnerVote(null);
      } else if (data.type === 'scribble_draw') {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.strokeStyle = data.color || '#38bdf8';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            if (data.isStart) {
              ctx.beginPath();
              ctx.moveTo(data.x, data.y);
            } else {
              ctx.lineTo(data.x, data.y);
              ctx.stroke();
            }
          }
        }
      } else if (data.type === 'scribble_clear') {
        clearCanvas();
      }
    };

    socket.on('singles-mini-game-event', handleGameUpdate);
    return () => {
      socket.off('singles-mini-game-event', handleGameUpdate);
    };
  }, [socket, myUserId]);

  const handleVoteDealbreaker = (vote: 'dealbreaker' | 'tolerable' | 'love_it') => {
    setMyVote(vote);
    // Simulate partner vote if running standalone
    if (!partnerVote) {
      setTimeout(() => {
        const opts: Array<'dealbreaker' | 'tolerable' | 'love_it'> = ['tolerable', 'love_it', 'dealbreaker'];
        setPartnerVote(opts[Math.floor(Math.random() * opts.length)]);
      }, 700);
    }
    if (socket && sessionId) {
      socket.emit('singles-mini-game-event', {
        sessionId,
        type: 'dealbreaker_vote',
        senderId: myUserId,
        vote,
      });
    }
  };

  const handleNextDealbreaker = () => {
    const next = (dealbreakerIndex + 1) % DEALBREAKER_LIST.length;
    setDealbreakerIndex(next);
    setMyVote(null);
    setPartnerVote(null);
    if (socket && sessionId) {
      socket.emit('singles-mini-game-event', {
        sessionId,
        type: 'dealbreaker_next',
        index: next,
      });
    }
  };

  // Canvas Drawing
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      setIsDrawing(true);
    }
    if (socket && sessionId) {
      socket.emit('singles-mini-game-event', {
        sessionId,
        type: 'scribble_draw',
        x,
        y,
        color: brushColor,
        isStart: true,
      });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    if (socket && sessionId) {
      socket.emit('singles-mini-game-event', {
        sessionId,
        type: 'scribble_draw',
        x,
        y,
        color: brushColor,
        isStart: false,
      });
    }
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleClearScribble = () => {
    clearCanvas();
    if (socket && sessionId) {
      socket.emit('singles-mini-game-event', {
        sessionId,
        type: 'scribble_clear',
      });
    }
  };

  return (
    <div className="bg-stone-900/95 backdrop-blur-xl border border-stone-700/90 rounded-2xl p-4 shadow-2xl space-y-3">
      {/* Game navigation header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => setActiveGame('dealbreakers')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeGame === 'dealbreakers'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-stone-800 text-stone-300 hover:text-white'
            }`}
          >
            <span>⚡ Rapid Dealbreakers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGame('two_truths')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeGame === 'two_truths'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-stone-800 text-stone-300 hover:text-white'
            }`}
          >
            <span>🕵️ Two Truths & A Lie</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGame('scribble')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeGame === 'scribble'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-stone-800 text-stone-300 hover:text-white'
            }`}
          >
            <span>🎨 Live Scribble Pad</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-stone-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-stone-800"
        >
          Back to Questions
        </button>
      </div>

      {/* GAME 1: RAPID DEALBREAKERS */}
      {activeGame === 'dealbreakers' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-stone-400">
            <span className="font-semibold uppercase tracking-wider text-rose-400">
              Dilemma #{dealbreakerIndex + 1} of {DEALBREAKER_LIST.length}
            </span>
            <span>Tap your spontaneous instinct</span>
          </div>

          <div className="p-3.5 bg-stone-950/80 rounded-xl border border-stone-800 text-center space-y-1">
            <span className="text-3xl">{currentDealbreaker.emoji}</span>
            <p className="text-sm font-bold text-white max-w-sm mx-auto">
              "{currentDealbreaker.title}"
            </p>
          </div>

          {/* Voting Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { type: 'dealbreaker', label: '🚫 Dealbreaker', color: 'hover:bg-rose-600 border-rose-500/40' },
              { type: 'tolerable', label: '🤷 Tolerable', color: 'hover:bg-amber-600 border-amber-500/40' },
              { type: 'love_it', label: '❤️ Love It!', color: 'hover:bg-emerald-600 border-emerald-500/40' },
            ].map((btn) => (
              <button
                key={btn.type}
                type="button"
                onClick={() => handleVoteDealbreaker(btn.type as any)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                  myVote === btn.type
                    ? 'bg-white text-stone-950 shadow-lg scale-98'
                    : `bg-stone-800 text-stone-200 ${btn.color}`
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Alignment feedback */}
          {myVote && (
            <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="text-stone-400">You: <strong>{myVote}</strong></span>
                <span className="text-stone-600">•</span>
                <span className="text-stone-300">
                  {partnerName}:{' '}
                  {partnerVote ? (
                    <strong className="text-emerald-400">{partnerVote}</strong>
                  ) : (
                    <span className="italic text-stone-500">Choosing...</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={handleNextDealbreaker}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition shadow"
              >
                <span>Next Dilemma</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME 2: TWO TRUTHS & A LIE */}
      {activeGame === 'two_truths' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-stone-400">
            <span className="font-semibold uppercase tracking-wider text-purple-400">
              Guess {partnerName}'s Lie!
            </span>
            <span>One of these 3 statements is 100% false</span>
          </div>

          <div className="space-y-2">
            {twoTruthsCards.statements.map((stmt, idx) => {
              const isSelected = guessedIndex === idx;
              const showResult = twoTruthsCards.revealed;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setGuessedIndex(idx);
                    setTwoTruthsCards((prev) => ({ ...prev, revealed: true }));
                  }}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
                    showResult && stmt.isLie
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                      : showResult && !stmt.isLie && isSelected
                      ? 'bg-stone-800/80 border-stone-600 text-stone-400'
                      : isSelected
                      ? 'bg-purple-950/50 border-purple-400 text-white'
                      : 'bg-stone-950/60 border-stone-800 text-stone-200 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center text-[10px] text-stone-400 shrink-0">
                      {idx + 1}
                    </span>
                    <span>{stmt.text}</span>
                  </div>

                  {showResult && stmt.isLie && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                      THE LIE! 🤥
                    </span>
                  )}
                  {showResult && !stmt.isLie && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      TRUTH ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {twoTruthsCards.revealed && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-emerald-300 font-semibold">
                {guessedIndex !== null && twoTruthsCards.statements[guessedIndex].isLie
                  ? '🎉 Great intuition! You spotted the lie.'
                  : '😄 Good attempt! Statement was actually true.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setGuessedIndex(null);
                  setTwoTruthsCards({
                    authorId: myUserId,
                    authorName: myName,
                    revealed: false,
                    statements: [
                      { text: 'I broke my arm jumping off a swing in 4th grade.', isLie: false },
                      { text: 'I eat pizza crust-first because it is the best part.', isLie: true },
                      { text: 'I speak conversational Japanese from 2 years of anime.', isLie: false },
                    ],
                  });
                }}
                className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition"
              >
                Next Round
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME 3: LIVE SCRIBBLE PAD */}
      {activeGame === 'scribble' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-stone-400">
            <span className="text-emerald-400 font-bold">Shared Real-Time Doodle Pad</span>
            <div className="flex items-center gap-1.5">
              {['#f43f5e', '#38bdf8', '#10b981', '#f59e0b', '#ffffff'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBrushColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-4 h-4 rounded-full transition ${
                    brushColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70'
                  }`}
                />
              ))}
              <button
                type="button"
                onClick={handleClearScribble}
                className="ml-2 px-2 py-0.5 rounded bg-stone-800 text-stone-400 hover:text-white text-[10px]"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="relative w-full h-40 bg-stone-950 rounded-xl overflow-hidden border border-stone-800 touch-none">
            <canvas
              ref={canvasRef}
              width={420}
              height={160}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              className="w-full h-full cursor-crosshair"
            />
            <span className="absolute bottom-2 left-2 text-[10px] text-stone-500 pointer-events-none">
              Draw a heart, write a word, or play Tic-Tac-Toe together!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
