import React, { useState, useEffect } from 'react';
import { Crown, RotateCcw, Sparkles, Trophy, ArrowRight, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playBoardMoveSound, playChessCaptureSound } from '../../utils/sounds';

export type PieceColor = 'red' | 'white';

export interface DraughtsPiece {
  color: PieceColor;
  isKing: boolean;
}

export type BoardState = (DraughtsPiece | null)[][];

interface DraughtsGameProps {
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

// Initial 8x8 Board setup
function createInitialBoard(): BoardState {
  const board: BoardState = Array(8).fill(null).map(() => Array(8).fill(null));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) {
          board[r][c] = { color: 'white', isKing: false };
        } else if (r > 4) {
          board[r][c] = { color: 'red', isKing: false };
        }
      }
    }
  }
  return board;
}

export const DraughtsGame: React.FC<DraughtsGameProps> = ({
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
  const [board, setBoard] = useState<BoardState>(createInitialBoard);
  const [turn, setTurn] = useState<PieceColor>('red'); // Red = P1, White = P2
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<{ to: [number, number]; jumpOver?: [number, number] }[]>([]);
  const [winner, setWinner] = useState<PieceColor | 'draw' | null>(null);
  const [capturedRed, setCapturedRed] = useState<number>(0);
  const [capturedWhite, setCapturedWhite] = useState<number>(0);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Determine user's piece color based on deterministic role
  const myColor: PieceColor = isPlayer1 ? 'red' : 'white';
  const partnerColor: PieceColor = isPlayer1 ? 'white' : 'red';
  
  // Can only act if it's currently user's turn
  const canAct = (turn === myColor);

  const redPlayerName = isPlayer1 ? (currentUserName || 'You') : (partnerName || 'Partner');
  const whitePlayerName = isPlayer1 ? (partnerName || 'Partner') : (currentUserName || 'You');

  // Sync with incoming actions from partner
  useEffect(() => {
    if (!incomingAction) return;
    if (incomingAction.type === 'draughts_move') {
      setBoard(incomingAction.board);
      setTurn(incomingAction.turn);
      setSelectedCell(null);
      setValidMoves([]);
      setWinner(incomingAction.winner);
      setCapturedRed(incomingAction.capturedRed);
      setCapturedWhite(incomingAction.capturedWhite);
      if (incomingAction.hasCaptured) {
        playChessCaptureSound();
      } else {
        playBoardMoveSound();
      }
      if (incomingAction.winner) {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
      }
    } else if (incomingAction.type === 'draughts_reset') {
      setBoard(createInitialBoard());
      setTurn('red');
      setSelectedCell(null);
      setValidMoves([]);
      setWinner(null);
      setCapturedRed(0);
      setCapturedWhite(0);
    }
  }, [incomingAction]);

  // Compute available moves for a piece at [row, col]
  const getMovesForPiece = (
    b: BoardState,
    r: number,
    c: number
  ): { to: [number, number]; jumpOver?: [number, number] }[] => {
    const piece = b[r][c];
    if (!piece) return [];

    const moves: { to: [number, number]; jumpOver?: [number, number] }[] = [];
    // Movement directions
    // Red moves up (negative r) by default; White moves down (positive r) by default
    const directions: [number, number][] = [];
    if (piece.isKing) {
      directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    } else if (piece.color === 'red') {
      directions.push([-1, -1], [-1, 1]);
    } else {
      directions.push([1, -1], [1, 1]);
    }

    // 1. Regular 1-step moves
    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr][nc]) {
        moves.push({ to: [nr, nc] });
      }
    }

    // 2. Jump moves (2-steps) - Kings can jump in all 4 diagonal directions
    const jumpDirs: [number, number][] = piece.isKing
      ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      : piece.color === 'red'
      ? [[-1, -1], [-1, 1]]
      : [[1, -1], [1, 1]];

    for (const [dr, dc] of jumpDirs) {
      const midR = r + dr;
      const midC = c + dc;
      const endR = r + dr * 2;
      const endC = c + dc * 2;

      if (
        endR >= 0 &&
        endR < 8 &&
        endC >= 0 &&
        endC < 8 &&
        !b[endR][endC]
      ) {
        const midPiece = b[midR]?.[midC];
        if (midPiece && midPiece.color !== piece.color) {
          moves.push({ to: [endR, endC], jumpOver: [midR, midC] });
        }
      }
    }

    return moves;
  };

  const handleCellClick = (r: number, c: number) => {
    if (winner) return;
    const clickedPiece = board[r][c];

    // STRICT TURN ENFORCEMENT:
    // If it's not the user's turn and partner is present, prevent moving!
    if (!canAct && Boolean(partnerName)) {
      setNoticeMessage(`⏳ It is ${turn === 'red' ? redPlayerName : whitePlayerName}'s turn! Please wait.`);
      setTimeout(() => setNoticeMessage(null), 2500);
      return;
    }

    // A player can only select their OWN color pieces!
    if (clickedPiece && clickedPiece.color === myColor && canAct) {
      setSelectedCell([r, c]);
      const moves = getMovesForPiece(board, r, c);
      setValidMoves(moves);
      return;
    }

    // In solo testing mode (no partner present): allow selecting the active piece
    if (!partnerName && clickedPiece && clickedPiece.color === turn) {
      setSelectedCell([r, c]);
      const moves = getMovesForPiece(board, r, c);
      setValidMoves(moves);
      return;
    }

    // If clicking on a destination square for the selected piece
    if (selectedCell) {
      const move = validMoves.find((m) => m.to[0] === r && m.to[1] === c);
      if (move) {
        executeMove(selectedCell, move);
      } else {
        setSelectedCell(null);
        setValidMoves([]);
      }
    }
  };

  const executeMove = (
    from: [number, number],
    move: { to: [number, number]; jumpOver?: [number, number] }
  ) => {
    const [fromR, fromC] = from;
    const [toR, toC] = move.to;
    const newBoard = board.map((row) => [...row]);
    const piece = newBoard[fromR][fromC]!;

    newBoard[fromR][fromC] = null;

    // Check King promotion
    let isKing = piece.isKing;
    if (piece.color === 'red' && toR === 0) isKing = true;
    if (piece.color === 'white' && toR === 7) isKing = true;

    newBoard[toR][toC] = { ...piece, isKing };

    let newCapturedRed = capturedRed;
    let newCapturedWhite = capturedWhite;
    let hasCaptured = false;

    if (move.jumpOver) {
      const [jr, jc] = move.jumpOver;
      const jumpedPiece = newBoard[jr][jc];
      if (jumpedPiece?.color === 'red') newCapturedRed++;
      if (jumpedPiece?.color === 'white') newCapturedWhite++;
      newBoard[jr][jc] = null;
      hasCaptured = true;
      playChessCaptureSound();
    } else {
      playBoardMoveSound();
    }

    // Check Win Condition
    let nextTurn: PieceColor = turn === 'red' ? 'white' : 'red';
    let remainingRed = 0;
    let remainingWhite = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (newBoard[row][col]?.color === 'red') remainingRed++;
        if (newBoard[row][col]?.color === 'white') remainingWhite++;
      }
    }

    let detectedWinner: PieceColor | 'draw' | null = null;
    if (remainingRed === 0) detectedWinner = 'white';
    else if (remainingWhite === 0) detectedWinner = 'red';

    if (detectedWinner) {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    }

    setBoard(newBoard);
    setTurn(nextTurn);
    setSelectedCell(null);
    setValidMoves([]);
    setWinner(detectedWinner);
    setCapturedRed(newCapturedRed);
    setCapturedWhite(newCapturedWhite);

    onBroadcastAction({
      type: 'draughts_move',
      board: newBoard,
      turn: nextTurn,
      winner: detectedWinner,
      capturedRed: newCapturedRed,
      capturedWhite: newCapturedWhite,
      hasCaptured,
    });
  };

  const handleReset = () => {
    const fresh = createInitialBoard();
    setBoard(fresh);
    setTurn('red');
    setSelectedCell(null);
    setValidMoves([]);
    setWinner(null);
    setCapturedRed(0);
    setCapturedWhite(0);

    onBroadcastAction({
      type: 'draughts_reset',
    });
  };

  return (
    <div className="flex flex-col items-center select-none animate-in fade-in duration-300">
      {/* Notice notification when playing out of turn */}
      {noticeMessage && (
        <div className="w-full max-w-md mb-2 py-2 px-3 bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold rounded-xl text-center shadow-lg animate-bounce">
          {noticeMessage}
        </div>
      )}

      {/* Header Info Bar */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/60 shadow-lg text-white">
        {/* Player 1 (Red) */}
        <div className={`flex items-center gap-2 ${turn === 'red' ? 'opacity-100 font-bold' : 'opacity-60'}`}>
          <div className="relative w-7 h-7 rounded-full bg-rose-600 border-2 border-rose-300 shadow-md flex items-center justify-center text-xs">
            {turn === 'red' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            )}
            🔴
          </div>
          <div className="text-left">
            <span className="text-xs font-semibold block leading-tight">
              {redPlayerName} {myColor === 'red' ? '(You)' : ''}
            </span>
            <span className="text-[10px] text-rose-300 font-mono">Captured: {capturedWhite}</span>
          </div>
        </div>

        {/* Turn Badge / Status */}
        <div className="text-center">
          {winner ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-bounce">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{winner === myColor ? 'You Won! 🏆' : `${winner === 'red' ? redPlayerName : whitePlayerName} Won!`}</span>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block">
                {turn === myColor ? 'YOUR TURN' : 'WAITING'}
              </span>
              <span className={`text-xs font-bold ${turn === myColor ? 'text-emerald-400 animate-pulse' : 'text-slate-300'}`}>
                {turn === myColor ? '✨ Tap your piece' : `⏳ ${turn === 'red' ? redPlayerName : whitePlayerName}'s Turn`}
              </span>
            </div>
          )}
        </div>

        {/* Player 2 (White) */}
        <div className={`flex items-center gap-2 ${turn === 'white' ? 'opacity-100 font-bold' : 'opacity-60'}`}>
          <div className="text-right">
            <span className="text-xs font-semibold block leading-tight">
              {whitePlayerName} {myColor === 'white' ? '(You)' : ''}
            </span>
            <span className="text-[10px] text-sky-300 font-mono">Captured: {capturedRed}</span>
          </div>
          <div className="relative w-7 h-7 rounded-full bg-slate-200 border-2 border-sky-300 shadow-md flex items-center justify-center text-xs">
            {turn === 'white' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            )}
            ⚪
          </div>
        </div>
      </div>

      {/* 8x8 Draughts Board */}
      <div className="relative p-1.5 sm:p-3.5 bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950 rounded-2xl shadow-2xl border-2 sm:border-4 border-amber-800/80 max-w-full">
        <div className="grid grid-cols-8 grid-rows-8 gap-0 border-2 border-amber-950/60 rounded-xl overflow-hidden shadow-inner bg-amber-950 w-[min(calc(100vw-32px),calc(100dvh-260px),440px)] h-[min(calc(100vw-32px),calc(100dvh-260px),440px)]">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const isValidDestination = validMoves.some((m) => m.to[0] === r && m.to[1] === c);

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  className={`relative w-full h-full flex items-center justify-center transition-all cursor-pointer ${
                    isDark ? 'bg-[#3b2416]' : 'bg-[#e2c7a5]'
                  } ${isSelected ? 'ring-3 ring-amber-400 z-10' : ''}`}
                >
                  {/* Valid move indicator */}
                  {isValidDestination && (
                    <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-400/80 ring-2 ring-emerald-300 animate-pulse z-20 shadow-md" />
                  )}

                  {/* Piece */}
                  {cell && (
                    <div
                      className={`relative w-[82%] h-[82%] rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${
                        cell.color === 'red'
                          ? 'bg-gradient-to-b from-rose-500 via-rose-600 to-rose-700 border-2 border-rose-300 text-white shadow-rose-900/60'
                          : 'bg-gradient-to-b from-slate-50 via-slate-200 to-slate-300 border-2 border-sky-400 text-slate-800 shadow-slate-900/60'
                      }`}
                    >
                      {/* Inner concentric ring pattern of draught piece */}
                      <div className="w-[60%] h-[60%] rounded-full border border-black/20 flex items-center justify-center">
                        {cell.isKing ? (
                          <Crown className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-300 drop-shadow-md animate-pulse" />
                        ) : (
                          <div
                            className={`w-2 h-2 rounded-full ${
                              cell.color === 'red' ? 'bg-rose-400/60' : 'bg-slate-400/60'
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Controls & Rules */}
      <div className="w-full max-w-md mt-3 flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Game</span>
        </button>

        <div className="text-[11px] text-slate-500 text-right flex items-center gap-1">
          <Shield className="w-3 h-3 text-amber-600" />
          <span>Tap your piece & green circle to jump or capture!</span>
        </div>
      </div>
    </div>
  );
};
