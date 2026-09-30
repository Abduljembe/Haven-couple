import React, { useState, useEffect, useCallback } from 'react';
import {
  Crosshair,
  RotateCcw,
  Sparkles,
  Trophy,
  Shield,
  Anchor,
  Flame,
  Waves,
  Zap,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  playLaser,
  playChessCaptureSound,
  playBoardMoveSound,
  playVictory,
  playBuzzer,
  playSparkCelebrationSound,
} from '../../utils/sounds';

export const GRID_SIZE = 7; // 7x7 grid: Fast, punchy, fits mobile perfectly

export interface ShipDefinition {
  id: string;
  name: string;
  size: number;
  icon: string;
  color: string;
}

export const SHIPS: ShipDefinition[] = [
  { id: 'carrier', name: 'Flagship Carrier', size: 4, icon: '🚢', color: 'from-amber-500 to-rose-600' },
  { id: 'cruiser', name: 'Stealth Cruiser', size: 3, icon: '🛥️', color: 'from-indigo-500 to-purple-600' },
  { id: 'destroyer', name: 'Fast Destroyer', size: 2, icon: '🚤', color: 'from-cyan-500 to-blue-600' },
  { id: 'patrol', name: 'Scout Boat', size: 1, icon: '⛵', color: 'from-emerald-500 to-teal-600' },
];

export interface PlacedShip {
  id: string;
  name: string;
  size: number;
  icon: string;
  coordinates: { x: number; y: number }[];
  hits: number;
}

export type CellStatus = 'empty' | 'ship' | 'hit' | 'miss';

interface BattleshipGameProps {
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

// Generate an intelligent random fleet layout on a 7x7 grid
function generateRandomFleet(): PlacedShip[] {
  const occupied = new Set<string>();
  const fleet: PlacedShip[] = [];

  for (const ship of SHIPS) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const isHorizontal = Math.random() > 0.5;
      const x = isHorizontal
        ? Math.floor(Math.random() * (GRID_SIZE - ship.size + 1))
        : Math.floor(Math.random() * GRID_SIZE);
      const y = isHorizontal
        ? Math.floor(Math.random() * GRID_SIZE)
        : Math.floor(Math.random() * (GRID_SIZE - ship.size + 1));

      const coords: { x: number; y: number }[] = [];
      let collision = false;
      for (let i = 0; i < ship.size; i++) {
        const cx = isHorizontal ? x + i : x;
        const cy = isHorizontal ? y : y + i;
        if (occupied.has(`${cx},${cy}`)) {
          collision = true;
          break;
        }
        coords.push({ x: cx, y: cy });
      }

      if (!collision) {
        coords.forEach((c) => occupied.add(`${c.x},${c.y}`));
        fleet.push({
          id: ship.id,
          name: ship.name,
          size: ship.size,
          icon: ship.icon,
          coordinates: coords,
          hits: 0,
        });
        placed = true;
      }
    }
  }
  return fleet;
}

export const BattleshipGame: React.FC<BattleshipGameProps> = ({
  currentUserId,
  currentUserName,
  partnerName,
  currentUserAvatar,
  partnerAvatar,
  isPlayer1 = true,
  onBroadcastAction,
  incomingAction,
}) => {
  // Game phases: 'placement' | 'waiting' | 'battle' | 'finished'
  const [phase, setPhase] = useState<'placement' | 'waiting' | 'battle' | 'finished'>('placement');
  const [myFleet, setMyFleet] = useState<PlacedShip[]>(generateRandomFleet);
  const [selectedShipIndex, setSelectedShipIndex] = useState<number>(0);
  const [orientation, setOrientation] = useState<'H' | 'V'>('H');

  // Tracking shots fired at opponent: key 'x,y' -> 'hit' | 'miss'
  const [radarShots, setRadarShots] = useState<Record<string, 'hit' | 'miss'>>({});
  // Shots partner fired on my grid: key 'x,y' -> 'hit' | 'miss'
  const [defenseShots, setDefenseShots] = useState<Record<string, 'hit' | 'miss'>>({});

  // Turn: 'P1' | 'P2' (P1 fires first)
  const [turn, setTurn] = useState<'P1' | 'P2'>('P1');
  const [partnerReady, setPartnerReady] = useState<boolean>(false);
  const [myReady, setMyReady] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([
    'Deploy your fleet secretly, then lock in your positions!',
  ]);

  const myPlayerRole = isPlayer1 ? 'P1' : 'P2';
  const isMyTurn = phase === 'battle' && turn === myPlayerRole;

  // Add message to tactical combat log
  const addLog = (msg: string) => {
    setLogMessages((prev) => [msg, ...prev.slice(0, 4)]);
  };

  // Sync incoming network actions from partner
  useEffect(() => {
    if (!incomingAction) return;

    if (incomingAction.type === 'fleet_ready') {
      setPartnerReady(true);
      addLog(`📡 ${partnerName || 'Partner'} reported fleet deployed!`);
      // If I'm already ready, start battle!
      if (myReady) {
        setPhase('battle');
        addLog('⚔️ Battle engaged! All systems operational.');
        playSparkCelebrationSound();
      }
    } else if (incomingAction.type === 'fleet_strike') {
      // Partner fired at my coordinate
      const { x, y, senderRole } = incomingAction;
      const key = `${x},${y}`;

      // Check if it hit any of my ships
      let hitShip: PlacedShip | null = null;
      for (const ship of myFleet) {
        if (ship.coordinates.some((c) => c.x === x && c.y === y)) {
          hitShip = ship;
          break;
        }
      }

      const isHit = !!hitShip;
      let isSunk = false;

      setDefenseShots((prev) => ({ ...prev, [key]: isHit ? 'hit' : 'miss' }));

      if (isHit && hitShip) {
        hitShip.hits += 1;
        isSunk = hitShip.hits >= hitShip.size;
        playChessCaptureSound();
        addLog(`💥 WARNING: Our ${hitShip.name} was hit at [${x + 1},${y + 1}]!`);
        if (isSunk) {
          addLog(`🚨 RED ALERT: Our ${hitShip.name} has sunk!`);
        }
      } else {
        playBoardMoveSound();
        addLog(`🌊 Partner fired at [${x + 1},${y + 1}] and splashed into the water!`);
      }

      // Check if all my ships are sunk
      const allSunk = myFleet.every((s) => s.hits >= s.size);

      // Reply with strike result to partner
      const nextTurn = senderRole === 'P1' ? 'P2' : 'P1';
      onBroadcastAction({
        type: 'fleet_strike_result',
        x,
        y,
        isHit,
        isSunk,
        shipName: hitShip?.name,
        shipIcon: hitShip?.icon,
        allSunk,
        winner: allSunk ? (partnerName || 'Partner') : null,
        nextTurn,
      });

      if (allSunk) {
        setWinner(partnerName || 'Partner');
        setPhase('finished');
        playBuzzer();
      } else {
        setTurn(nextTurn);
      }
    } else if (incomingAction.type === 'fleet_strike_result') {
      // Result of my strike on partner's waters
      const { x, y, isHit, isSunk, shipName, shipIcon, allSunk, winner: winName, nextTurn } = incomingAction;
      const key = `${x},${y}`;

      setRadarShots((prev) => ({ ...prev, [key]: isHit ? 'hit' : 'miss' }));

      if (isHit) {
        playChessCaptureSound();
        if (isSunk) {
          addLog(`🎯 DIRECT HIT & SUNK! You destroyed ${partnerName}'s ${shipName} ${shipIcon || ''}!`);
        } else {
          addLog(`🎯 DIRECT HIT at [${x + 1},${y + 1}]! Smoke detected!`);
        }
      } else {
        playBoardMoveSound();
        addLog(`🌊 Splash! Missile missed at [${x + 1},${y + 1}].`);
      }

      if (allSunk) {
        setWinner(currentUserName || 'You');
        setPhase('finished');
        playVictory();
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#3b82f6', '#ec4899', '#f59e0b'],
        });
      } else if (nextTurn) {
        setTurn(nextTurn);
      }
    } else if (incomingAction.type === 'fleet_rematch') {
      handleReset();
    }
  }, [incomingAction, myReady, myFleet, partnerName, currentUserName]);

  // Handle locking in player's ready state
  const handleConfirmDeployment = () => {
    setMyReady(true);
    playSparkCelebrationSound();
    onBroadcastAction({ type: 'fleet_ready', role: myPlayerRole });

    if (partnerReady) {
      setPhase('battle');
      addLog('⚔️ Both fleets deployed! Commencing tactical engagement.');
    } else {
      setPhase('waiting');
      addLog(`Waiting for ${partnerName || 'partner'} to finish deploying...`);
    }
  };

  // Quick auto-deploy layout
  const handleRandomize = () => {
    setMyFleet(generateRandomFleet());
    playBoardMoveSound();
    addLog('Fleet coordinates reshuffled.');
  };

  // Launch missile attack on opponent's grid coordinate
  const handleFireAtOpponent = (x: number, y: number) => {
    if (!isMyTurn || phase !== 'battle') return;
    const key = `${x},${y}`;
    if (radarShots[key]) return; // Already targeted

    playLaser();
    addLog(`🚀 Firing sonar missile at [${x + 1},${y + 1}]...`);

    // Broadcast strike coordinates to partner
    onBroadcastAction({
      type: 'fleet_strike',
      x,
      y,
      senderRole: myPlayerRole,
    });
  };

  // Reset / Rematch
  const handleReset = () => {
    setPhase('placement');
    setMyFleet(generateRandomFleet());
    setRadarShots({});
    setDefenseShots({});
    setPartnerReady(false);
    setMyReady(false);
    setWinner(null);
    setTurn('P1');
    setLogMessages(['Deploy your fleet secretly, then lock in your positions!']);
    playBoardMoveSound();
  };

  const handleRequestRematch = () => {
    handleReset();
    onBroadcastAction({ type: 'fleet_rematch' });
  };

  // Calculate my fleet health status
  const myTotalHits = myFleet.reduce((acc, s) => acc + s.hits, 0);
  const myTotalCells = myFleet.reduce((acc, s) => acc + s.size, 0);
  const myFleetRemaining = myFleet.filter((s) => s.hits < s.size).length;

  // Calculate partner fleet sunk count from radar shots
  const enemyHitsCount = Object.values(radarShots).filter((v) => v === 'hit').length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-fade-in text-slate-800">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl border border-indigo-900/60 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Anchor className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-white">
              <span>Fleet Strike: Secret Harbor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 uppercase">
                Tactical 2P
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {phase === 'placement' && 'Position your 4 stealth warships on the grid'}
              {phase === 'waiting' && `Awaiting ${partnerName || 'partner'} to lock fleet...`}
              {phase === 'battle' && (isMyTurn ? '🔥 YOUR TURN: Select target on Radar!' : `⏳ ${partnerName || 'Partner'}'s turn to fire...`)}
              {phase === 'finished' && '🏆 Naval engagement concluded!'}
            </p>
          </div>
        </div>

        {/* Phase Action Controls */}
        <div className="flex items-center gap-2">
          {phase === 'placement' && (
            <>
              <button
                type="button"
                onClick={handleRandomize}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                title="Shuffle fleet layout"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmDeployment}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Ready for Battle</span>
              </button>
            </>
          )}

          {phase === 'finished' && (
            <button
              type="button"
              onClick={handleRequestRematch}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rematch</span>
            </button>
          )}
        </div>
      </div>

      {/* Winner Banner */}
      {winner && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white text-center shadow-lg animate-bounce">
          <Trophy className="w-7 h-7 mx-auto mb-1 text-amber-300" />
          <h4 className="font-black text-base">
            🎉 {winner === currentUserName ? 'Victory! You sank the enemy fleet!' : `${winner} destroyed your harbor!`}
          </h4>
          <p className="text-xs text-cyan-100 mt-0.5">
            {winner === currentUserName ? 'Master of the High Seas ⚓' : 'Honor on the waves! Ready for a rematch?'}
          </p>
        </div>
      )}

      {/* Main Boards View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ============================================================ */}
        {/* 1. RADAR SCREEN (Opponent Waters / Strike Zone) */}
        {/* ============================================================ */}
        <div className="p-3.5 sm:p-4 rounded-3xl bg-slate-950 border-2 border-slate-800 shadow-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 px-1 text-slate-300">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-rose-400 animate-spin" />
              <span className="text-xs font-extrabold tracking-wide uppercase text-rose-300">
                Opponent Radar ({partnerName || 'Partner'})
              </span>
            </div>
            <span className="text-[11px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/40">
              Hits: {enemyHitsCount} / {myTotalCells}
            </span>
          </div>

          {/* 7x7 Radar Matrix */}
          <div className="relative p-2.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
            {/* Sonar sweep overlay */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.4)_0%,_transparent_70%)]" />

            <div className="grid grid-cols-7 gap-1.5">
              {Array(GRID_SIZE * GRID_SIZE)
                .fill(0)
                .map((_, idx) => {
                  const x = idx % GRID_SIZE;
                  const y = Math.floor(idx / GRID_SIZE);
                  const key = `${x},${y}`;
                  const shot = radarShots[key];

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!isMyTurn || !!shot || phase !== 'battle'}
                      onClick={() => handleFireAtOpponent(x, y)}
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative cursor-pointer ${
                        shot === 'hit'
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 border border-rose-400 scale-95'
                          : shot === 'miss'
                          ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/40'
                          : isMyTurn
                          ? 'bg-slate-800/90 text-slate-400 hover:bg-rose-500/20 hover:border-rose-400 border border-slate-700/60 active:scale-90'
                          : 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                      }`}
                    >
                      {shot === 'hit' && <Flame className="w-5 h-5 text-amber-200 animate-pulse" />}
                      {shot === 'miss' && <Waves className="w-4 h-4 text-cyan-400 opacity-60" />}
                      {!shot && isMyTurn && (
                        <span className="text-[10px] opacity-0 hover:opacity-100 text-rose-300 font-mono">
                          {x + 1},{y + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="mt-2.5 text-center">
            {phase === 'battle' ? (
              isMyTurn ? (
                <span className="text-xs font-bold text-rose-400 animate-pulse">
                  ⚡ Ready to fire! Tap any unhit square on radar.
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  Defending... {partnerName || 'Partner'} is calculating coordinate.
                </span>
              )
            ) : (
              <span className="text-[11px] text-slate-500">
                Radar activated once both players deploy fleets.
              </span>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. DEFENSE HARBOR (Your Fleet & Incoming Hits) */}
        {/* ============================================================ */}
        <div className="p-3.5 sm:p-4 rounded-3xl bg-slate-950 border-2 border-slate-800 shadow-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 px-1 text-slate-300">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-extrabold tracking-wide uppercase text-cyan-300">
                Your Secret Harbor ({currentUserName || 'You'})
              </span>
            </div>
            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40">
              Fleet: {myFleetRemaining} / {myFleet.length} afloat
            </span>
          </div>

          {/* 7x7 My Harbor Grid */}
          <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
            <div className="grid grid-cols-7 gap-1.5">
              {Array(GRID_SIZE * GRID_SIZE)
                .fill(0)
                .map((_, idx) => {
                  const x = idx % GRID_SIZE;
                  const y = Math.floor(idx / GRID_SIZE);
                  const key = `${x},${y}`;
                  const defShot = defenseShots[key];

                  // Check if a ship occupies this cell
                  const shipOnCell = myFleet.find((s) =>
                    s.coordinates.some((c) => c.x === x && c.y === y)
                  );

                  return (
                    <div
                      key={key}
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative ${
                        defShot === 'hit'
                          ? 'bg-rose-600 text-white border-2 border-rose-300 shadow-lg shadow-rose-900/60'
                          : defShot === 'miss'
                          ? 'bg-slate-800/90 text-cyan-400 border border-cyan-700/30'
                          : shipOnCell
                          ? 'bg-gradient-to-tr from-cyan-900 to-indigo-800 text-cyan-200 border border-cyan-500/50 shadow-inner'
                          : 'bg-slate-900 border border-slate-800'
                      }`}
                    >
                      {defShot === 'hit' && <Flame className="w-4 h-4 text-amber-200 animate-bounce" />}
                      {defShot === 'miss' && <Waves className="w-3.5 h-3.5 text-cyan-400/60" />}
                      {!defShot && shipOnCell && (
                        <span className="text-sm select-none" title={shipOnCell.name}>
                          {shipOnCell.icon}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Fleet Status Summary */}
          <div className="w-full mt-3 grid grid-cols-2 gap-2 text-left">
            {myFleet.map((ship) => {
              const isSunk = ship.hits >= ship.size;
              return (
                <div
                  key={ship.id}
                  className={`p-2 rounded-xl border text-xs flex items-center justify-between ${
                    isSunk
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 line-through opacity-70'
                      : 'bg-slate-900/80 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{ship.icon}</span>
                    <span className="font-semibold truncate">{ship.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                    {ship.size - ship.hits}/{ship.size}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Combat Activity Log */}
      <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
          <Navigation className="w-3.5 h-3.5" />
          <span>Naval Command Communications</span>
        </div>
        <div className="space-y-1">
          {logMessages.map((msg, i) => (
            <div key={i} className={`truncate ${i === 0 ? 'text-white font-semibold' : 'text-slate-500'}`}>
              {msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
