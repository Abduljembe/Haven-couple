import React, { useState, useEffect } from 'react';
import { Dices, RotateCcw, Trophy, Sparkles, Star, Shield, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playDiceRollSound, playBoardMoveSound, playChessCaptureSound } from '../../utils/sounds';

export type LudoPlayer = 'red' | 'blue';

export interface LudoToken {
  id: number;
  // position: -1 = in base, 0-51 = main track, 100-105 = home path, 200 = home goal
  step: number; // 0 to 56 steps taken from start
}

interface LudoGameProps {
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

// 52 Common Track Coordinates on a 15x15 Ludo Grid
// Ludo grid is 15 rows x 15 columns (0 to 14)
// Standard path clockwise starting from Red start: [6, 1], [6, 2], ...
const TRACK_COORDS: [number, number][] = [
  // Red start & stretch (bottom-left area heading up)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], // Top center turn
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], // Right turn
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // Blue start at [8, 13] (index 26)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], // Bottom center turn
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], // Left turn
  [6, 0], // Reconnecting back to [6, 1]
];

// Red Home Path (row 7, cols 1 to 6) -> [7, 7] Center
const RED_HOME_PATH: [number, number][] = [
  [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7]
];

// Blue Home Path (row 7, cols 13 down to 8) -> [7, 7] Center
const BLUE_HOME_PATH: [number, number][] = [
  [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8], [7, 7]
];

// Safe star squares on track
const SAFE_STEPS = [0, 8, 13, 21, 26, 34, 39, 47];

// Red Base positions (Bottom-Left)
const RED_BASE_POSITIONS: [number, number][] = [
  [10, 2], [10, 3], [11, 2], [11, 3]
];

// Blue Base positions (Top-Right)
const BLUE_BASE_POSITIONS: [number, number][] = [
  [3, 11], [3, 12], [4, 11], [4, 12]
];

const INITIAL_TOKENS = (): LudoToken[] => [
  { id: 0, step: -1 },
  { id: 1, step: -1 },
  { id: 2, step: -1 },
  { id: 3, step: -1 },
];

export const LudoGame: React.FC<LudoGameProps> = ({
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
  const [redTokens, setRedTokens] = useState<LudoToken[]>(INITIAL_TOKENS);
  const [blueTokens, setBlueTokens] = useState<LudoToken[]>(INITIAL_TOKENS);
  const [currentTurn, setCurrentTurn] = useState<LudoPlayer>('red'); // Red = P1, Blue = P2
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [winner, setWinner] = useState<LudoPlayer | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Deterministic Role Mapping
  const myColor: LudoPlayer = isPlayer1 ? 'red' : 'blue';
  const partnerColor: LudoPlayer = isPlayer1 ? 'blue' : 'red';
  const redPlayerName = isPlayer1 ? (currentUserName || 'You') : (partnerName || 'Partner');
  const bluePlayerName = isPlayer1 ? (partnerName || 'Partner') : (currentUserName || 'You');
  const canAct = (currentTurn === myColor);

  // Sync with incoming multiplayer actions
  useEffect(() => {
    if (!incomingAction) return;
    if (incomingAction.type === 'ludo_roll') {
      setIsRolling(true);
      playDiceRollSound();
      setTimeout(() => {
        setIsRolling(false);
        setDiceValue(incomingAction.diceValue);
        setHasRolled(true);
      }, 400);
    } else if (incomingAction.type === 'ludo_move') {
      setRedTokens(incomingAction.redTokens);
      setBlueTokens(incomingAction.blueTokens);
      setCurrentTurn(incomingAction.nextTurn);
      setDiceValue(null);
      setHasRolled(false);
      setWinner(incomingAction.winner);
      if (incomingAction.hasCaptured) {
        playChessCaptureSound();
      } else {
        playBoardMoveSound();
      }
      if (incomingAction.winner) {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      }
    } else if (incomingAction.type === 'ludo_pass_turn') {
      setCurrentTurn(incomingAction.nextTurn);
      setDiceValue(null);
      setHasRolled(false);
    } else if (incomingAction.type === 'ludo_reset') {
      setRedTokens(INITIAL_TOKENS());
      setBlueTokens(INITIAL_TOKENS());
      setCurrentTurn('red');
      setDiceValue(null);
      setHasRolled(false);
      setWinner(null);
    }
  }, [incomingAction]);

  // Dice roll handler
  const handleRollDice = () => {
    if (hasRolled || isRolling || winner) return;

    // STRICT TURN ENFORCEMENT:
    if (!canAct && Boolean(partnerName)) {
      setNoticeMessage(`⏳ It is ${currentTurn === 'red' ? redPlayerName : bluePlayerName}'s turn! Please wait.`);
      setTimeout(() => setNoticeMessage(null), 2500);
      return;
    }

    setIsRolling(true);
    playDiceRollSound();

    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);
      setHasRolled(true);

      onBroadcastAction({
        type: 'ludo_roll',
        diceValue: rolled,
      });

      // Check if any valid moves exist for current player
      const activeTokens = currentTurn === 'red' ? redTokens : blueTokens;
      const canMoveAny = activeTokens.some((t) => canTokenMove(t, rolled));

      // If no valid moves possible, auto-pass turn after short delay
      if (!canMoveAny && rolled !== 6) {
        setTimeout(() => {
          const nextTurn = currentTurn === 'red' ? 'blue' : 'red';
          setCurrentTurn(nextTurn);
          setDiceValue(null);
          setHasRolled(false);
          onBroadcastAction({
            type: 'ludo_pass_turn',
            nextTurn,
          });
        }, 1100);
      }
    }, 450);
  };

  // Helper: check if a specific token can move with rolled dice
  const canTokenMove = (token: LudoToken, roll: number): boolean => {
    if (token.step === 56) return false; // Already reached center goal
    if (token.step === -1) {
      return roll === 6; // Needs 6 to exit base
    }
    return token.step + roll <= 56;
  };

  // Move token handler
  const handleTokenClick = (player: LudoPlayer, tokenId: number) => {
    if (!hasRolled || diceValue === null || isRolling || winner) return;
    if (player !== currentTurn) return;
    // Strict token ownership check
    if (player !== myColor && Boolean(partnerName)) return;

    const tokens = player === 'red' ? [...redTokens] : [...blueTokens];
    const opponentTokens = player === 'red' ? [...blueTokens] : [...redTokens];
    const token = tokens.find((t) => t.id === tokenId);
    if (!token || !canTokenMove(token, diceValue)) return;

    let nextStep = token.step;
    if (token.step === -1 && diceValue === 6) {
      nextStep = 0; // Exits to start
    } else {
      nextStep += diceValue;
    }
    token.step = nextStep;

    let hasCaptured = false;

    // Check capture on main track (step 0 to 50)
    if (nextStep >= 0 && nextStep <= 50) {
      const myTrackIndex = getTrackIndex(player, nextStep);
      const isSafe = SAFE_STEPS.includes(myTrackIndex);

      if (!isSafe) {
        opponentTokens.forEach((oppToken) => {
          if (oppToken.step >= 0 && oppToken.step <= 50) {
            const oppPlayer: LudoPlayer = player === 'red' ? 'blue' : 'red';
            const oppTrackIndex = getTrackIndex(oppPlayer, oppToken.step);
            if (oppTrackIndex === myTrackIndex) {
              // Captured! Send back to base
              oppToken.step = -1;
              hasCaptured = true;
            }
          }
        });
      }
    }

    if (hasCaptured) {
      playChessCaptureSound();
    } else {
      playBoardMoveSound();
    }

    const newRed = player === 'red' ? tokens : opponentTokens;
    const newBlue = player === 'blue' ? tokens : opponentTokens;

    // Check victory: all 4 tokens reached home goal (step 56)
    const activeNewTokens = player === 'red' ? newRed : newBlue;
    const allHome = activeNewTokens.every((t) => t.step === 56);
    const newWinner = allHome ? player : null;

    if (newWinner) {
      confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
    }

    // Extra turn if rolled 6 or captured enemy, otherwise pass turn
    const extraTurn = (diceValue === 6 || hasCaptured) && !newWinner;
    const nextTurn = extraTurn ? currentTurn : (currentTurn === 'red' ? 'blue' : 'red');

    setRedTokens(newRed);
    setBlueTokens(newBlue);
    setCurrentTurn(nextTurn);
    setDiceValue(null);
    setHasRolled(false);
    setWinner(newWinner);

    onBroadcastAction({
      type: 'ludo_move',
      redTokens: newRed,
      blueTokens: newBlue,
      nextTurn,
      winner: newWinner,
      hasCaptured,
    });
  };

  // Convert player relative step to track index (0-51)
  const getTrackIndex = (player: LudoPlayer, step: number): number => {
    if (player === 'red') {
      return step % 52;
    } else {
      // Blue starts at track index 26
      return (step + 26) % 52;
    }
  };

  // Convert step to grid coordinate [r, c]
  const getTokenCoordinate = (player: LudoPlayer, token: LudoToken): [number, number] => {
    if (token.step === -1) {
      return player === 'red'
        ? RED_BASE_POSITIONS[token.id]
        : BLUE_BASE_POSITIONS[token.id];
    }
    if (token.step <= 50) {
      const trackIdx = getTrackIndex(player, token.step);
      return TRACK_COORDS[trackIdx] || [7, 7];
    }
    // In Home stretch (51 to 56)
    const homeIdx = token.step - 51;
    return player === 'red'
      ? RED_HOME_PATH[homeIdx] || [7, 7]
      : BLUE_HOME_PATH[homeIdx] || [7, 7];
  };

  const handleReset = () => {
    const r = INITIAL_TOKENS();
    const b = INITIAL_TOKENS();
    setRedTokens(r);
    setBlueTokens(b);
    setCurrentTurn('red');
    setDiceValue(null);
    setHasRolled(false);
    setWinner(null);

    onBroadcastAction({
      type: 'ludo_reset',
    });
  };

  const redFinishedCount = redTokens.filter((t) => t.step === 56).length;
  const blueFinishedCount = blueTokens.filter((t) => t.step === 56).length;

  return (
    <div className="flex flex-col items-center select-none animate-in fade-in duration-300">
      {/* Notice Message when rolling or moving out of turn */}
      {noticeMessage && (
        <div className="w-full max-w-md mb-2 py-2 px-3 bg-amber-500/25 border border-amber-400/60 text-amber-200 text-xs font-bold rounded-xl text-center shadow-lg animate-bounce">
          {noticeMessage}
        </div>
      )}

      {/* Top Players & Turn Header */}
      <div className="w-full max-w-md mb-2.5 flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-700/60 shadow-lg text-white">
        {/* Player 1 (Red) */}
        <div className={`flex items-center gap-2 ${currentTurn === 'red' ? 'opacity-100 font-bold' : 'opacity-60'}`}>
          <div className="relative w-8 h-8 rounded-full bg-rose-600 border-2 border-rose-300 shadow-md flex items-center justify-center text-xs overflow-hidden">
            {(isPlayer1 ? currentUserAvatar : partnerAvatar) ? (
              <img
                src={isPlayer1 ? currentUserAvatar : partnerAvatar}
                alt={redPlayerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>🔴</span>
            )}
            {currentTurn === 'red' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            )}
          </div>
          <div className="text-left">
            <span className="text-xs font-semibold block leading-tight">
              {redPlayerName} {myColor === 'red' ? '(You)' : ''}
            </span>
            <span className="text-[10px] text-rose-300 font-mono">Home: {redFinishedCount}/4</span>
          </div>
        </div>

        {/* Center Dice & Action Button */}
        <div className="flex flex-col items-center gap-1">
          {winner ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-bounce shadow-md">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{winner === myColor ? 'You Won! 🏆' : `${winner === 'red' ? redPlayerName : bluePlayerName} Won!`}</span>
            </div>
          ) : (
            <>
              <button
                onClick={handleRollDice}
                disabled={hasRolled || isRolling || (!canAct && Boolean(partnerName))}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                  !hasRolled && (canAct || !partnerName)
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 ring-2 ring-amber-300 animate-pulse'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
                <span>{isRolling ? 'Rolling...' : diceValue ? `Rolled: ${diceValue}` : 'Roll Dice'}</span>
              </button>
              <span className={`text-[10px] font-semibold ${canAct ? 'text-emerald-400' : 'text-slate-400'}`}>
                {canAct ? '✨ Your Turn' : `⏳ ${currentTurn === 'red' ? redPlayerName : bluePlayerName}'s Turn`}
              </span>
            </>
          )}
        </div>

        {/* Player 2 (Blue) */}
        <div className={`flex items-center gap-2 ${currentTurn === 'blue' ? 'opacity-100 font-bold' : 'opacity-60'}`}>
          <div className="text-right">
            <span className="text-xs font-semibold block leading-tight">
              {bluePlayerName} {myColor === 'blue' ? '(You)' : ''}
            </span>
            <span className="text-[10px] text-sky-300 font-mono">Home: {blueFinishedCount}/4</span>
          </div>
          <div className="relative w-8 h-8 rounded-full bg-sky-600 border-2 border-sky-300 shadow-md flex items-center justify-center text-xs overflow-hidden">
            {(!isPlayer1 ? currentUserAvatar : partnerAvatar) ? (
              <img
                src={!isPlayer1 ? currentUserAvatar : partnerAvatar}
                alt={bluePlayerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>🔵</span>
            )}
            {currentTurn === 'blue' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            )}
          </div>
        </div>
      </div>

      {/* Ludo 15x15 Arena Board */}
      <div className="relative p-1.5 sm:p-3 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border-2 sm:border-4 border-slate-800">
        <div className="relative w-[min(calc(100vw-36px),calc(100dvh-270px),380px)] h-[min(calc(100vw-36px),calc(100dvh-270px),380px)] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
          {/* Quadrant 1: Red Base (Bottom-Left: rows 9-14, cols 0-5) */}
          <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-rose-950/70 border-t-2 border-r-2 border-rose-600/80 p-2 flex flex-col items-center justify-center rounded-tr-2xl">
            <div className="w-[75%] h-[75%] bg-slate-950/80 rounded-xl border border-rose-500/50 flex flex-wrap items-center justify-center gap-2 p-1.5 shadow-inner">
              <span className="text-[10px] font-bold text-rose-400 w-full text-center tracking-wider">RED BASE</span>
            </div>
          </div>

          {/* Quadrant 2: Blue Base (Top-Right: rows 0-5, cols 9-14) */}
          <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-sky-950/70 border-b-2 border-l-2 border-sky-600/80 p-2 flex flex-col items-center justify-center rounded-bl-2xl">
            <div className="w-[75%] h-[75%] bg-slate-950/80 rounded-xl border border-sky-500/50 flex flex-wrap items-center justify-center gap-2 p-1.5 shadow-inner">
              <span className="text-[10px] font-bold text-sky-400 w-full text-center tracking-wider">BLUE BASE</span>
            </div>
          </div>

          {/* Decorative Corner Quadrants */}
          <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-slate-950/40 border-b-2 border-r-2 border-slate-700/60 flex items-center justify-center">
            <Star className="w-8 h-8 text-slate-700/40" />
          </div>
          <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-slate-950/40 border-t-2 border-l-2 border-slate-700/60 flex items-center justify-center">
            <Star className="w-8 h-8 text-slate-700/40" />
          </div>

          {/* Center Victory Home Triangle */}
          <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-gradient-to-br from-amber-500 via-rose-500 to-sky-500 border-2 border-amber-300 rounded-xl flex items-center justify-center shadow-lg z-10">
            <Trophy className="w-6 h-6 text-white drop-shadow-md animate-pulse" />
          </div>

          {/* Track Grid Path Cells */}
          {TRACK_COORDS.map(([r, c], idx) => {
            const isSafe = SAFE_STEPS.includes(idx);
            const isRedStart = idx === 0;
            const isBlueStart = idx === 26;

            return (
              <div
                key={`track-${idx}`}
                style={{
                  top: `${(r / 15) * 100}%`,
                  left: `${(c / 15) * 100}%`,
                  width: `${(1 / 15) * 100}%`,
                  height: `${(1 / 15) * 100}%`,
                }}
                className={`absolute border border-slate-800/80 flex items-center justify-center text-[8px] transition-colors ${
                  isRedStart
                    ? 'bg-rose-600/60'
                    : isBlueStart
                    ? 'bg-sky-600/60'
                    : isSafe
                    ? 'bg-amber-500/25'
                    : 'bg-slate-800/40'
                }`}
              >
                {isSafe && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400/60" />}
              </div>
            );
          })}

          {/* Red Home Column Cells */}
          {RED_HOME_PATH.slice(0, 6).map(([r, c], idx) => (
            <div
              key={`red-home-${idx}`}
              style={{
                top: `${(r / 15) * 100}%`,
                left: `${(c / 15) * 100}%`,
                width: `${(1 / 15) * 100}%`,
                height: `${(1 / 15) * 100}%`,
              }}
              className="absolute bg-rose-600/70 border border-rose-400/50 flex items-center justify-center text-[7px] text-white font-bold"
            >
              {idx + 1}
            </div>
          ))}

          {/* Blue Home Column Cells */}
          {BLUE_HOME_PATH.slice(0, 6).map(([r, c], idx) => (
            <div
              key={`blue-home-${idx}`}
              style={{
                top: `${(r / 15) * 100}%`,
                left: `${(c / 15) * 100}%`,
                width: `${(1 / 15) * 100}%`,
                height: `${(1 / 15) * 100}%`,
              }}
              className="absolute bg-sky-600/70 border border-sky-400/50 flex items-center justify-center text-[7px] text-white font-bold"
            >
              {idx + 1}
            </div>
          ))}

          {/* Render Red Tokens */}
          {redTokens.map((token) => {
            const [r, c] = getTokenCoordinate('red', token);
            const canMove = hasRolled && currentTurn === 'red' && canTokenMove(token, diceValue || 0);

            return (
              <div
                key={`red-token-${token.id}`}
                onClick={() => handleTokenClick('red', token.id)}
                style={{
                  top: `${(r / 15) * 100}%`,
                  left: `${(c / 15) * 100}%`,
                  width: `${(1 / 15) * 100}%`,
                  height: `${(1 / 15) * 100}%`,
                }}
                className={`absolute z-30 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  canMove ? 'scale-125 z-40' : ''
                }`}
              >
                <div
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-b from-rose-400 to-rose-700 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white ${
                    canMove ? 'ring-2 ring-amber-300 animate-bounce' : ''
                  }`}
                >
                  {token.step === 56 ? '⭐' : token.id + 1}
                </div>
              </div>
            );
          })}

          {/* Render Blue Tokens */}
          {blueTokens.map((token) => {
            const [r, c] = getTokenCoordinate('blue', token);
            const canMove = hasRolled && currentTurn === 'blue' && canTokenMove(token, diceValue || 0);

            return (
              <div
                key={`blue-token-${token.id}`}
                onClick={() => handleTokenClick('blue', token.id)}
                style={{
                  top: `${(r / 15) * 100}%`,
                  left: `${(c / 15) * 100}%`,
                  width: `${(1 / 15) * 100}%`,
                  height: `${(1 / 15) * 100}%`,
                }}
                className={`absolute z-30 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  canMove ? 'scale-125 z-40' : ''
                }`}
              >
                <div
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-b from-sky-400 to-sky-700 border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white ${
                    canMove ? 'ring-2 ring-amber-300 animate-bounce' : ''
                  }`}
                >
                  {token.step === 56 ? '⭐' : token.id + 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Instructions & Reset */}
      <div className="w-full max-w-md mt-2.5 flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Game</span>
        </button>

        <div className="text-[11px] text-slate-500 text-right flex items-center gap-1">
          <Shield className="w-3 h-3 text-amber-500" />
          <span>Roll 6 to hatch tokens from base or get bonus turn!</span>
        </div>
      </div>
    </div>
  );
};
