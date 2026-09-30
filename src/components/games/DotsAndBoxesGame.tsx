import React, { useState, useEffect } from 'react';
import {
  Grid,
  RotateCcw,
  Sparkles,
  Trophy,
  Heart,
  Crown,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  playBoardMoveSound,
  playChessCaptureSound,
  playVictory,
  playSparkCelebrationSound,
} from '../../utils/sounds';

export const DOTS_ROWS = 5;
export const DOTS_COLS = 5;
export const BOX_ROWS = 4;
export const BOX_COLS = 4;
export const TOTAL_BOXES = BOX_ROWS * BOX_COLS; // 16

interface DotsAndBoxesGameProps {
  currentUserId: string;
  currentUserName: string;
  partnerName: string;
  currentUserAvatar?: string;
  partnerAvatar?: string;
  isPlayer1?: boolean;
  onBroadcastAction: (actionData: any) => void;
  incomingAction?: any;
}

export const DotsAndBoxesGame: React.FC<DotsAndBoxesGameProps> = ({
  currentUserId,
  currentUserName,
  partnerName,
  currentUserAvatar,
  partnerAvatar,
  isPlayer1 = true,
  onBroadcastAction,
  incomingAction,
}) => {
  // Horizontal lines: 5 rows of 4 horizontal segments each
  // hLines[r][c] is the segment from (r, c) to (r, c+1)
  const [hLines, setHLines] = useState<boolean[][]>(() =>
    Array(DOTS_ROWS).fill(null).map(() => Array(BOX_COLS).fill(false))
  );

  // Vertical lines: 4 rows of 5 vertical segments each
  // vLines[r][c] is the segment from (r, c) to (r+1, c)
  const [vLines, setVLines] = useState<boolean[][]>(() =>
    Array(BOX_ROWS).fill(null).map(() => Array(DOTS_COLS).fill(false))
  );

  // Boxes: 4x4 matrix of owner ('P1' | 'P2' | null)
  const [boxes, setBoxes] = useState<('P1' | 'P2' | null)[][]>(() =>
    Array(BOX_ROWS).fill(null).map(() => Array(BOX_COLS).fill(null))
  );

  // Turn: 'P1' (Player 1 / Heart) or 'P2' (Player 2 / Crown)
  const [turn, setTurn] = useState<'P1' | 'P2'>('P1');
  const [scores, setScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<'P1' | 'P2' | 'tie' | null>(null);
  const [bonusTurnNotice, setBonusTurnNotice] = useState<string | null>(null);

  const myPlayerRole: 'P1' | 'P2' = isPlayer1 ? 'P1' : 'P2';
  const isMyTurn = turn === myPlayerRole;

  // Sync incoming moves from partner
  useEffect(() => {
    if (!incomingAction) return;

    if (incomingAction.type === 'dots_move') {
      setHLines(incomingAction.hLines);
      setVLines(incomingAction.vLines);
      setBoxes(incomingAction.boxes);
      setTurn(incomingAction.turn);
      setScores(incomingAction.scores);
      setWinner(incomingAction.winner);

      if (incomingAction.capturedCount > 0) {
        playChessCaptureSound();
        setBonusTurnNotice(`${incomingAction.capturedCount} box captured! Bonus move!`);
        setTimeout(() => setBonusTurnNotice(null), 2500);
      } else {
        playBoardMoveSound();
      }

      if (incomingAction.winner) {
        playVictory();
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981'],
        });
      }
    } else if (incomingAction.type === 'dots_reset') {
      handleResetLocal();
    }
  }, [incomingAction]);

  // Check which boxes were completed by this move
  const checkCompletedBoxes = (
    newHLines: boolean[][],
    newVLines: boolean[][],
    currentBoxes: ('P1' | 'P2' | null)[][],
    claimingPlayer: 'P1' | 'P2'
  ) => {
    const updatedBoxes = currentBoxes.map((row) => [...row]);
    let newlyCaptured = 0;

    for (let r = 0; r < BOX_ROWS; r++) {
      for (let c = 0; c < BOX_COLS; c++) {
        // If already owned, skip
        if (updatedBoxes[r][c] !== null) continue;

        // Check 4 sides of box (r, c):
        // Top: hLines[r][c]
        // Bottom: hLines[r+1][c]
        // Left: vLines[r][c]
        // Right: vLines[r][c+1]
        const top = newHLines[r][c];
        const bottom = newHLines[r + 1][c];
        const left = newVLines[r][c];
        const right = newVLines[r][c + 1];

        if (top && bottom && left && right) {
          updatedBoxes[r][c] = claimingPlayer;
          newlyCaptured += 1;
        }
      }
    }

    return { updatedBoxes, newlyCaptured };
  };

  // Click handler for drawing a horizontal line
  const handleDrawHLine = (r: number, c: number) => {
    if (!isMyTurn || winner || hLines[r][c]) return;

    const newHLines = hLines.map((row, rowIdx) =>
      rowIdx === r ? row.map((val, colIdx) => (colIdx === c ? true : val)) : [...row]
    );

    const { updatedBoxes, newlyCaptured } = checkCompletedBoxes(
      newHLines,
      vLines,
      boxes,
      myPlayerRole
    );

    finalizeMove(newHLines, vLines, updatedBoxes, newlyCaptured);
  };

  // Click handler for drawing a vertical line
  const handleDrawVLine = (r: number, c: number) => {
    if (!isMyTurn || winner || vLines[r][c]) return;

    const newVLines = vLines.map((row, rowIdx) =>
      rowIdx === r ? row.map((val, colIdx) => (colIdx === c ? true : val)) : [...row]
    );

    const { updatedBoxes, newlyCaptured } = checkCompletedBoxes(
      hLines,
      newVLines,
      boxes,
      myPlayerRole
    );

    finalizeMove(hLines, newVLines, updatedBoxes, newlyCaptured);
  };

  // Calculate new state, scores, next turn, and broadcast
  const finalizeMove = (
    newHLines: boolean[][],
    newVLines: boolean[][],
    updatedBoxes: ('P1' | 'P2' | null)[][],
    newlyCaptured: number
  ) => {
    const newScores = {
      p1: scores.p1 + (myPlayerRole === 'P1' ? newlyCaptured : 0),
      p2: scores.p2 + (myPlayerRole === 'P2' ? newlyCaptured : 0),
    };

    // If a box was captured, player keeps their turn! Otherwise switch turn
    const nextTurn: 'P1' | 'P2' =
      newlyCaptured > 0 ? myPlayerRole : myPlayerRole === 'P1' ? 'P2' : 'P1';

    // Check if all 16 boxes are claimed
    const totalClaimed = newScores.p1 + newScores.p2;
    let nextWinner: 'P1' | 'P2' | 'tie' | null = null;
    if (totalClaimed === TOTAL_BOXES) {
      if (newScores.p1 > newScores.p2) nextWinner = 'P1';
      else if (newScores.p2 > newScores.p1) nextWinner = 'P2';
      else nextWinner = 'tie';
    }

    setHLines(newHLines);
    setVLines(newVLines);
    setBoxes(updatedBoxes);
    setTurn(nextTurn);
    setScores(newScores);
    setWinner(nextWinner);

    if (newlyCaptured > 0) {
      playChessCaptureSound();
      setBonusTurnNotice(`🎉 You captured ${newlyCaptured} territory! Take another turn!`);
      setTimeout(() => setBonusTurnNotice(null), 2500);
    } else {
      playBoardMoveSound();
    }

    if (nextWinner) {
      playVictory();
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#8b5cf6', '#f59e0b', '#10b981'],
      });
    }

    // Broadcast to partner
    onBroadcastAction({
      type: 'dots_move',
      hLines: newHLines,
      vLines: newVLines,
      boxes: updatedBoxes,
      turn: nextTurn,
      scores: newScores,
      winner: nextWinner,
      capturedCount: newlyCaptured,
    });
  };

  const handleResetLocal = () => {
    setHLines(Array(DOTS_ROWS).fill(null).map(() => Array(BOX_COLS).fill(false)));
    setVLines(Array(BOX_ROWS).fill(null).map(() => Array(DOTS_COLS).fill(false)));
    setBoxes(Array(BOX_ROWS).fill(null).map(() => Array(BOX_COLS).fill(null)));
    setTurn('P1');
    setScores({ p1: 0, p2: 0 });
    setWinner(null);
    setBonusTurnNotice(null);
  };

  const handleReset = () => {
    handleResetLocal();
    playBoardMoveSound();
    onBroadcastAction({ type: 'dots_reset' });
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto animate-fade-in text-slate-800">
      {/* Top Banner / Match Info */}
      <div className="flex items-center justify-between bg-gradient-to-r from-rose-900 via-purple-950 to-indigo-900 text-white p-3.5 sm:p-4 rounded-2xl border border-rose-800/40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
            <Grid className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-white">
              <span>Dots & Boxes: Love Territory</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 uppercase">
                Classic 2P
              </span>
            </h3>
            <p className="text-[11px] text-rose-200/80">
              Connect dots to close squares. Completing a box gives +1 point and an extra turn!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
          title="Restart match"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Bonus Turn Alert Notification */}
      {bonusTurnNotice && (
        <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-800 text-xs font-bold text-center animate-bounce">
          ⚡ {bonusTurnNotice}
        </div>
      )}

      {/* Winner Banner */}
      {winner && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white text-center shadow-lg animate-bounce">
          <Trophy className="w-7 h-7 mx-auto mb-1 text-amber-300" />
          <h4 className="font-black text-base">
            {winner === 'tie'
              ? '🤝 An Incredible Draw! Both players captured equal territories!'
              : winner === 'P1'
              ? `🎉 ${isPlayer1 ? currentUserName : partnerName} Claims Most Territories!`
              : `🎉 ${!isPlayer1 ? currentUserName : partnerName} Claims Most Territories!`}
          </h4>
          <p className="text-xs text-rose-100 mt-0.5">
            Final Score: {scores.p1} ❤️ vs {scores.p2} 💜
          </p>
        </div>
      )}

      {/* Score and Turn Ribbon */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
        {/* P1 Score */}
        <div
          className={`flex items-center gap-2 p-2 px-3 rounded-xl border transition-all ${
            turn === 'P1'
              ? 'bg-rose-50 border-rose-400 shadow-xs ring-1 ring-rose-300'
              : 'bg-slate-50 border-slate-200 opacity-80'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            ❤️
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 truncate max-w-[90px]">
              {isPlayer1 ? currentUserName : partnerName}
            </div>
            <div className="text-[10px] text-rose-600 font-extrabold">{scores.p1} boxes</div>
          </div>
        </div>

        {/* Turn status center badge */}
        <div className="text-center">
          <span
            className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border shadow-2xs ${
              isMyTurn
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            {isMyTurn ? 'Your Move' : `${partnerName || 'Partner'}'s Move`}
          </span>
          <div className="text-[10px] text-slate-400 mt-1">
            {TOTAL_BOXES - (scores.p1 + scores.p2)} remaining
          </div>
        </div>

        {/* P2 Score */}
        <div
          className={`flex items-center gap-2 p-2 px-3 rounded-xl border transition-all ${
            turn === 'P2'
              ? 'bg-purple-50 border-purple-400 shadow-xs ring-1 ring-purple-300'
              : 'bg-slate-50 border-slate-200 opacity-80'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            💜
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 truncate max-w-[90px]">
              {!isPlayer1 ? currentUserName : partnerName}
            </div>
            <div className="text-[10px] text-purple-600 font-extrabold">{scores.p2} boxes</div>
          </div>
        </div>
      </div>

      {/* Main Board Arena */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-950 border-4 border-slate-800 shadow-2xl flex flex-col items-center justify-center overflow-x-auto">
        <div className="relative select-none p-2 sm:p-4">
          {/* Render 5 rows of dots, with lines and boxes between */}
          {Array(DOTS_ROWS)
            .fill(0)
            .map((_, r) => (
              <div key={r} className="flex flex-col">
                {/* Horizontal row of dots + horizontal lines */}
                <div className="flex items-center">
                  {Array(DOTS_COLS)
                    .fill(0)
                    .map((_, c) => (
                      <React.Fragment key={c}>
                        {/* Dot */}
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-gradient-to-tr from-slate-200 to-white shadow-md shadow-white/40 ring-2 ring-slate-800 shrink-0 z-10" />

                        {/* Horizontal Line between Dot(r, c) and Dot(r, c+1) */}
                        {c < BOX_COLS && (
                          <button
                            type="button"
                            disabled={!isMyTurn || !!winner || hLines[r][c]}
                            onClick={() => handleDrawHLine(r, c)}
                            className={`h-2 sm:h-2.5 w-11 sm:w-16 transition-all cursor-pointer rounded-full ${
                              hLines[r][c]
                                ? 'bg-gradient-to-r from-rose-500 to-purple-500 shadow-md shadow-rose-500/50'
                                : isMyTurn
                                ? 'bg-slate-800/80 hover:bg-rose-400/60 active:scale-95'
                                : 'bg-slate-900 cursor-not-allowed'
                            }`}
                            title={`Horizontal Line (${r}, ${c})`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                </div>

                {/* Vertical Lines row + Box contents below row r (for r < BOX_ROWS) */}
                {r < BOX_ROWS && (
                  <div className="flex items-center">
                    {Array(DOTS_COLS)
                      .fill(0)
                      .map((_, c) => (
                        <React.Fragment key={c}>
                          {/* Vertical Line between Dot(r, c) and Dot(r+1, c) */}
                          <button
                            type="button"
                            disabled={!isMyTurn || !!winner || vLines[r][c]}
                            onClick={() => handleDrawVLine(r, c)}
                            className={`w-2 sm:w-2.5 h-11 sm:h-16 transition-all cursor-pointer rounded-full ${
                              vLines[r][c]
                                ? 'bg-gradient-to-b from-rose-500 to-purple-500 shadow-md shadow-rose-500/50'
                                : isMyTurn
                                ? 'bg-slate-800/80 hover:bg-rose-400/60 active:scale-95'
                                : 'bg-slate-900 cursor-not-allowed'
                            }`}
                            title={`Vertical Line (${r}, ${c})`}
                          />

                          {/* Box between (r, c) and (r+1, c+1) */}
                          {c < BOX_COLS && (
                            <div
                              className={`w-11 sm:w-16 h-11 sm:h-16 flex items-center justify-center rounded-xl transition-all ${
                                boxes[r][c] === 'P1'
                                  ? 'bg-rose-500/25 border border-rose-400/50 text-rose-300 font-extrabold shadow-inner'
                                  : boxes[r][c] === 'P2'
                                  ? 'bg-purple-600/25 border border-purple-400/50 text-purple-300 font-extrabold shadow-inner'
                                  : 'bg-transparent'
                              }`}
                            >
                              {boxes[r][c] === 'P1' && (
                                <span className="text-xl sm:text-2xl animate-fade-in">❤️</span>
                              )}
                              {boxes[r][c] === 'P2' && (
                                <span className="text-xl sm:text-2xl animate-fade-in">💜</span>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
