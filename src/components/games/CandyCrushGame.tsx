import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, RotateCcw, Heart, Zap, Flame, Swords, Star, Shuffle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playCandyMatchSound, playCandySpecialSound, playBoardMoveSound } from '../../utils/sounds';

export type CandyType = 'heart' | 'strawberry' | 'lemon' | 'apple' | 'grape' | 'bonbon';

export interface CandyItem {
  id: string;
  type: CandyType;
  special?: 'striped_h' | 'striped_v' | 'bomb';
}

const CANDY_CONFIG: Record<
  CandyType,
  { label: string; emoji: string; bg: string; border: string; glow: string }
> = {
  heart: {
    label: 'Heart Drop',
    emoji: '💖',
    bg: 'from-pink-500 to-rose-600',
    border: 'border-pink-300',
    glow: 'shadow-pink-500/50',
  },
  strawberry: {
    label: 'Strawberry Jelly',
    emoji: '🍓',
    bg: 'from-red-500 to-rose-700',
    border: 'border-red-300',
    glow: 'shadow-red-500/50',
  },
  lemon: {
    label: 'Lemon Drop',
    emoji: '🍋',
    bg: 'from-amber-400 to-yellow-600',
    border: 'border-yellow-200',
    glow: 'shadow-yellow-500/50',
  },
  apple: {
    label: 'Apple Gum',
    emoji: '🍏',
    bg: 'from-emerald-400 to-green-600',
    border: 'border-emerald-300',
    glow: 'shadow-emerald-500/50',
  },
  grape: {
    label: 'Grape Chew',
    emoji: '🍇',
    bg: 'from-purple-500 to-indigo-700',
    border: 'border-purple-300',
    glow: 'shadow-purple-500/50',
  },
  bonbon: {
    label: 'Blue Bonbon',
    emoji: '🍬',
    bg: 'from-sky-400 to-cyan-600',
    border: 'border-cyan-300',
    glow: 'shadow-cyan-500/50',
  },
};

const CANDY_TYPES: CandyType[] = ['heart', 'strawberry', 'lemon', 'apple', 'grape', 'bonbon'];
const GRID_SIZE = 7;

function getRandomCandy(): CandyItem {
  const type = CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
  return {
    id: `candy-${Math.random().toString(36).substring(2, 11)}`,
    type,
  };
}

// Generate initial grid without immediate 3-in-a-row matches
function createInitialCandyGrid(): CandyItem[][] {
  const grid: CandyItem[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: CandyItem[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let candy = getRandomCandy();
      while (
        (c >= 2 && row[c - 1].type === candy.type && row[c - 2].type === candy.type) ||
        (r >= 2 && grid[r - 1][c].type === candy.type && grid[r - 2][c].type === candy.type)
      ) {
        candy = getRandomCandy();
      }
      row.push(candy);
    }
    grid.push(row);
  }
  return grid;
}

interface CandyCrushGameProps {
  currentUserId: string;
  currentUserName: string;
  partnerName: string;
  currentUserAvatar?: string;
  partnerAvatar?: string;
  isPlayer1?: boolean;
  isMyTurn?: boolean;
  onBroadcastAction: (actionData: any) => void;
  incomingAction?: any;
}

export const CandyCrushGame: React.FC<CandyCrushGameProps> = ({
  currentUserId,
  currentUserName,
  partnerName,
  currentUserAvatar,
  partnerAvatar,
  isPlayer1 = true,
  isMyTurn,
  onBroadcastAction,
  incomingAction,
}) => {
  const [grid, setGrid] = useState<CandyItem[][]>(createInitialCandyGrid);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'P1' | 'P2'>('P1'); // P1 = Player 1, P2 = Player 2
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);
  const [movesLeft, setMovesLeft] = useState<number>(20);
  const [gameMode, setGameMode] = useState<'duel' | 'coop'>('duel');
  const [combo, setCombo] = useState<number>(1);
  const [lastMatchText, setLastMatchText] = useState<string | null>(null);
  const [winner, setWinner] = useState<'P1' | 'P2' | 'team_win' | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Deterministic Role Mapping
  const myRole: 'P1' | 'P2' = isPlayer1 ? 'P1' : 'P2';
  const partnerRole: 'P1' | 'P2' = isPlayer1 ? 'P2' : 'P1';

  const p1Name = isPlayer1 ? (currentUserName || 'You') : (partnerName || 'Partner');
  const p2Name = isPlayer1 ? (partnerName || 'Partner') : (currentUserName || 'You');

  // Can only act if it's user's turn
  const canAct = (turn === myRole);

  // Sync with incoming multiplayer actions
  useEffect(() => {
    if (!incomingAction) return;
    if (incomingAction.type === 'candy_crush_move') {
      setGrid(incomingAction.grid);
      setTurn(incomingAction.nextTurn);
      setP1Score(incomingAction.p1Score);
      setP2Score(incomingAction.p2Score);
      setMovesLeft(incomingAction.movesLeft);
      setGameMode(incomingAction.gameMode || 'duel');
      setWinner(incomingAction.winner);
      setLastMatchText(incomingAction.matchText || null);
      if (incomingAction.pointsGained > 0) {
        playCandyMatchSound(incomingAction.combo || 1);
      }
      if (incomingAction.winner) {
        confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
      }
    } else if (incomingAction.type === 'candy_crush_reset') {
      setGrid(createInitialCandyGrid());
      setTurn('P1');
      setP1Score(0);
      setP2Score(0);
      setMovesLeft(20);
      setWinner(null);
      setLastMatchText(null);
      setSelectedCell(null);
      setNoticeMessage(null);
    } else if (incomingAction.type === 'candy_crush_shuffle') {
      setGrid(incomingAction.grid);
      setLastMatchText('Board Shuffled! 🌀');
    }
  }, [incomingAction]);

  // Check for matches in grid
  const findMatches = (
    currentGrid: CandyItem[][]
  ): { matches: [number, number][]; specialTypes: { pos: [number, number]; type: 'striped_h' | 'striped_v' | 'bomb' }[] } => {
    const matchedCoords = new Set<string>();
    const specialTypes: { pos: [number, number]; type: 'striped_h' | 'striped_v' | 'bomb' }[] = [];

    // Horizontal check
    for (let r = 0; r < GRID_SIZE; r++) {
      let count = 1;
      for (let c = 0; c < GRID_SIZE; c++) {
        if (c < GRID_SIZE - 1 && currentGrid[r][c].type === currentGrid[r][c + 1].type) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = 0; i < count; i++) {
              matchedCoords.add(`${r},${c - i}`);
            }
            if (count === 4) {
              specialTypes.push({ pos: [r, c - 1], type: 'striped_h' });
            } else if (count >= 5) {
              specialTypes.push({ pos: [r, c - 2], type: 'bomb' });
            }
          }
          count = 1;
        }
      }
    }

    // Vertical check
    for (let c = 0; c < GRID_SIZE; c++) {
      let count = 1;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (r < GRID_SIZE - 1 && currentGrid[r][c].type === currentGrid[r + 1][c].type) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = 0; i < count; i++) {
              matchedCoords.add(`${r - i},${c}`);
            }
            if (count === 4) {
              specialTypes.push({ pos: [r - 1, c], type: 'striped_v' });
            } else if (count >= 5) {
              specialTypes.push({ pos: [r - 2, c], type: 'bomb' });
            }
          }
          count = 1;
        }
      }
    }

    const matches: [number, number][] = Array.from(matchedCoords).map((str) => {
      const [r, c] = str.split(',').map(Number);
      return [r, c];
    });

    return { matches, specialTypes };
  };

  // Perform candy swap and resolve cascades
  const handleCellClick = (r: number, c: number) => {
    if (winner || movesLeft <= 0) return;

    // STRICT TURN ENFORCEMENT:
    // When partner is present, only the player whose turn it is can play!
    if (!canAct && Boolean(partnerName)) {
      setNoticeMessage(`⏳ It is ${turn === 'P1' ? p1Name : p2Name}'s turn! Please wait.`);
      setTimeout(() => setNoticeMessage(null), 2500);
      return;
    }

    if (!selectedCell) {
      setSelectedCell([r, c]);
      playBoardMoveSound();
      return;
    }

    const [sr, sc] = selectedCell;
    // Check if adjacent
    const isAdjacent = Math.abs(sr - r) + Math.abs(sc - c) === 1;

    if (!isAdjacent) {
      // Select the new cell instead
      setSelectedCell([r, c]);
      playBoardMoveSound();
      return;
    }

    // Attempt swap
    executeSwap([sr, sc], [r, c]);
  };

  const executeSwap = (pos1: [number, number], pos2: [number, number]) => {
    const newGrid = grid.map((row) => [...row]);
    const [r1, c1] = pos1;
    const [r2, c2] = pos2;

    const candy1 = newGrid[r1][c1];
    const candy2 = newGrid[r2][c2];

    newGrid[r1][c1] = candy2;
    newGrid[r2][c2] = candy1;

    // Check special candy activation (Bomb)
    let isSpecialTriggered = false;
    let points = 0;

    if (candy1.special === 'bomb' || candy2.special === 'bomb') {
      isSpecialTriggered = true;
      const targetType = candy1.special === 'bomb' ? candy2.type : candy1.type;
      playCandySpecialSound();
      // Clear all of target type
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if (newGrid[row][col].type === targetType || (row === r1 && col === c1) || (row === r2 && col === c2)) {
            newGrid[row][col] = getRandomCandy();
            points += 35;
          }
        }
      }
    }

    // Check normal matches
    const { matches, specialTypes } = findMatches(newGrid);

    if (matches.length === 0 && !isSpecialTriggered) {
      // Invalid swap - cancel selection with gentle feedback
      setSelectedCell(null);
      setLastMatchText('Oops! No match there 🍬');
      setTimeout(() => setLastMatchText(null), 1500);
      return;
    }

    // Valid swap!
    const newCombo = matches.length >= 4 ? combo + 1 : 1;
    setCombo(newCombo);

    points += matches.length * 30 * newCombo;
    playCandyMatchSound(newCombo);

    // Apply special candies into grid
    specialTypes.forEach(({ pos, type }) => {
      const [sr, sc] = pos;
      if (newGrid[sr]?.[sc]) {
        newGrid[sr][sc] = { ...newGrid[sr][sc], special: type };
      }
    });

    // Remove matched and drop down candies
    matches.forEach(([mr, mc]) => {
      newGrid[mr][mc] = getRandomCandy();
    });

    // Resolve cascades & drop
    const resolvedGrid = newGrid;

    // Special match praise text
    let matchPraise = `+${points} pts!`;
    if (newCombo > 1) {
      matchPraise = `Tasty Combo x${newCombo}! 🔥 (+${points})`;
    } else if (matches.length >= 5) {
      matchPraise = `🌟 SUGAR CRUSH! (+${points})`;
    } else if (matches.length === 4) {
      matchPraise = `⚡ Striped Blast! (+${points})`;
    }
    setLastMatchText(matchPraise);

    const nextMoves = movesLeft - 1;
    // CRITICAL: Next turn switches to other player!
    const nextTurn: 'P1' | 'P2' = turn === 'P1' ? 'P2' : 'P1';
    const newP1Score = turn === 'P1' ? p1Score + points : p1Score;
    const newP2Score = turn === 'P2' ? p2Score + points : p2Score;

    // Check game over
    let newWinner: 'P1' | 'P2' | 'team_win' | null = null;
    if (gameMode === 'duel') {
      if (nextMoves <= 0) {
        newWinner = newP1Score >= newP2Score ? 'P1' : 'P2';
      }
    } else {
      if (newP1Score + newP2Score >= 1200) {
        newWinner = 'team_win';
      } else if (nextMoves <= 0) {
        newWinner = newP1Score + newP2Score >= 700 ? 'team_win' : 'P1';
      }
    }

    if (newWinner) {
      confetti({ particleCount: 85, spread: 90, origin: { y: 0.6 } });
    }

    setGrid(resolvedGrid);
    setSelectedCell(null);
    setTurn(nextTurn);
    setP1Score(newP1Score);
    setP2Score(newP2Score);
    setMovesLeft(nextMoves);
    setWinner(newWinner);

    // Broadcast action to partner with strict nextTurn
    onBroadcastAction({
      type: 'candy_crush_move',
      grid: resolvedGrid,
      nextTurn,
      p1Score: newP1Score,
      p2Score: newP2Score,
      movesLeft: nextMoves,
      gameMode,
      winner: newWinner,
      pointsGained: points,
      combo: newCombo,
      matchText: matchPraise,
    });
  };

  const handleShuffle = () => {
    if (!canAct && Boolean(partnerName)) {
      setNoticeMessage(`⏳ Only the active player can shuffle!`);
      setTimeout(() => setNoticeMessage(null), 2000);
      return;
    }
    const shuffled = createInitialCandyGrid();
    setGrid(shuffled);
    setSelectedCell(null);
    setLastMatchText('Board Shuffled! 🌀');
    playBoardMoveSound();
    onBroadcastAction({
      type: 'candy_crush_shuffle',
      grid: shuffled,
    });
  };

  const handleReset = () => {
    const fresh = createInitialCandyGrid();
    setGrid(fresh);
    setTurn('P1');
    setP1Score(0);
    setP2Score(0);
    setMovesLeft(20);
    setWinner(null);
    setLastMatchText(null);
    setSelectedCell(null);
    setNoticeMessage(null);

    onBroadcastAction({
      type: 'candy_crush_reset',
    });
  };

  // Helper to check if a cell is an adjacent neighbor to currently selected cell
  const isAdjacentToSelected = (r: number, c: number): boolean => {
    if (!selectedCell) return false;
    const [sr, sc] = selectedCell;
    return Math.abs(sr - r) + Math.abs(sc - c) === 1;
  };

  const teamScore = p1Score + p2Score;
  const isMyTurnNow = (turn === myRole);

  return (
    <div className="flex flex-col items-center select-none animate-in fade-in duration-300">
      {/* Notice Message when playing out of turn */}
      {noticeMessage && (
        <div className="w-full max-w-md mb-2 py-2 px-3 bg-pink-500/25 border border-pink-400/60 text-pink-200 text-xs font-bold rounded-xl text-center shadow-lg animate-bounce">
          {noticeMessage}
        </div>
      )}

      {/* Top Header Score & Player Status Arena */}
      <div className="w-full max-w-md mb-2.5 flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/60 shadow-lg text-white">
        {/* Player 1 Area */}
        <div className={`flex items-center gap-2 transition-all ${turn === 'P1' ? 'opacity-100 scale-102 font-bold' : 'opacity-60'}`}>
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 border-2 border-pink-300 shadow-md flex items-center justify-center text-sm">
            {(isPlayer1 ? currentUserAvatar : partnerAvatar) ? (
              <img
                src={isPlayer1 ? currentUserAvatar : partnerAvatar}
                alt={p1Name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span>💖</span>
            )}
            {turn === 'P1' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400 border-2 border-slate-900 rounded-full animate-ping" />
            )}
          </div>
          <div className="text-left">
            <span className="text-xs font-semibold block leading-tight">
              {p1Name} {myRole === 'P1' ? '(You)' : ''}
            </span>
            <span className="text-xs font-extrabold text-pink-400 font-mono">{p1Score} pts</span>
          </div>
        </div>

        {/* Center Moves / Winner / Turn Info */}
        <div className="text-center px-2">
          {winner ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-bounce shadow-md">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {winner === 'team_win'
                  ? 'Sugar Match Champions! 🏆'
                  : winner === myRole
                  ? 'You Won! 🏆'
                  : `${winner === 'P1' ? p1Name : p2Name} Won!`}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                {isMyTurnNow ? 'YOUR TURN' : 'WAITING'}
              </span>
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="text-xs font-black text-amber-300 font-mono">
                  {movesLeft} Moves
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Player 2 Area */}
        <div className={`flex items-center gap-2 transition-all ${turn === 'P2' ? 'opacity-100 scale-102 font-bold' : 'opacity-60'}`}>
          <div className="text-right">
            <span className="text-xs font-semibold block leading-tight">
              {p2Name} {myRole === 'P2' ? '(You)' : ''}
            </span>
            <span className="text-xs font-extrabold text-sky-400 font-mono">{p2Score} pts</span>
          </div>
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-cyan-600 border-2 border-cyan-300 shadow-md flex items-center justify-center text-sm">
            {(!isPlayer1 ? currentUserAvatar : partnerAvatar) ? (
              <img
                src={!isPlayer1 ? currentUserAvatar : partnerAvatar}
                alt={p2Name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span>🍬</span>
            )}
            {turn === 'P2' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 border-2 border-slate-900 rounded-full animate-ping" />
            )}
          </div>
        </div>
      </div>

      {/* Mode Toggle & Praise Banner */}
      <div className="w-full max-w-md mb-2 flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 shadow-xs">
          <button
            onClick={() => setGameMode('duel')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              gameMode === 'duel' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-3 h-3" />
            <span>Duel</span>
          </button>
          <button
            onClick={() => setGameMode('coop')}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              gameMode === 'coop' ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-3 h-3" />
            <span>Love Co-Op</span>
          </button>
        </div>

        {/* Dynamic Combo Feedback or Turn Prompt */}
        {lastMatchText ? (
          <span className="text-xs font-black text-amber-300 animate-pulse font-mono drop-shadow-md">
            {lastMatchText}
          </span>
        ) : (
          <span className={`text-[11px] font-semibold ${isMyTurnNow ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
            {isMyTurnNow ? '✨ Tap 2 candies to swap' : `⏳ ${turn === 'P1' ? p1Name : p2Name}'s move`}
          </span>
        )}
      </div>

      {/* Co-Op Progress Bar if in Love Co-op Mode */}
      {gameMode === 'coop' && (
        <div className="w-full max-w-md mb-2 bg-slate-900/70 border border-slate-800 rounded-xl p-2 flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
            <span className="flex items-center gap-1 text-pink-300">
              <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />
              <span>Team Score: {teamScore} / 1000 pts</span>
            </span>
            <span className="text-amber-400 font-mono">
              {teamScore >= 1000 ? '⭐⭐⭐ Divine!' : teamScore >= 600 ? '⭐⭐ Tasty!' : teamScore >= 300 ? '⭐ Sweet!' : 'Star 1: 300'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (teamScore / 1000) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* 7x7 Candy Board Arena */}
      <div className="relative p-1.5 sm:p-2.5 bg-gradient-to-b from-indigo-950 via-slate-900 to-indigo-950 rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-pink-500/30 max-w-full">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 p-1 bg-slate-950/80 rounded-xl sm:rounded-2xl border border-white/10 shadow-inner">
          {grid.map((row, r) =>
            row.map((candy, c) => {
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const isSwapTarget = isAdjacentToSelected(r, c);
              const cfg = CANDY_CONFIG[candy.type];

              return (
                <div
                  key={`${r}-${c}-${candy.id}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`relative w-[clamp(34px,11vw,48px)] h-[clamp(34px,11vw,48px)] rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 select-none bg-gradient-to-b ${
                    cfg.bg
                  } border-2 ${cfg.border} shadow-md ${
                    isSelected
                      ? 'ring-4 ring-amber-300 scale-110 z-20 shadow-xl animate-pulse'
                      : isSwapTarget
                      ? 'ring-2 ring-emerald-400/80 scale-102 hover:scale-108 z-10'
                      : 'hover:scale-105 active:scale-95'
                  }`}
                >
                  {/* Candy Emoji */}
                  <span className="text-lg sm:text-2xl drop-shadow-sm select-none">
                    {cfg.emoji}
                  </span>

                  {/* Special Candy Badges */}
                  {candy.special === 'bomb' && (
                    <span className="absolute -top-1 -right-1 text-[11px] bg-amber-400 text-slate-950 rounded-full w-4 h-4 flex items-center justify-center font-black ring-1 ring-white shadow-sm">
                      💣
                    </span>
                  )}
                  {candy.special === 'striped_h' && (
                    <span className="absolute -bottom-1 text-[9px] bg-white/95 text-slate-950 rounded px-1 font-bold shadow-xs">
                      ↔️
                    </span>
                  )}
                  {candy.special === 'striped_v' && (
                    <span className="absolute -bottom-1 text-[9px] bg-white/95 text-slate-950 rounded px-1 font-bold shadow-xs">
                      ↕️
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Controls & Helpful Guide */}
      <div className="w-full max-w-md mt-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
          <button
            onClick={handleShuffle}
            className="px-3 py-1.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-700/60 cursor-pointer shadow-xs"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 text-right flex items-center gap-1">
          <Star className="w-3 h-3 text-pink-400" />
          <span>Match 4 for Striped, 5 for Bomb!</span>
        </div>
      </div>
    </div>
  );
};
