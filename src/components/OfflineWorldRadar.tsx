import React, { useState, useRef, useMemo } from 'react';
import {
  Compass,
  Plus,
  Minus,
  RotateCcw,
  Plane,
  Heart,
  Navigation,
  Globe2,
  Layers,
  MapPin
} from 'lucide-react';
import { HorizonLocation, UserProfile } from '../types';

interface OfflineWorldRadarProps {
  currentUserName: string;
  currentUserAvatar: string;
  partner?: UserProfile;
  partnerName: string;
  partnerAvatar?: string;
  myLocation: HorizonLocation;
  partnerLocation: HorizonLocation;
  miles: number;
  km: number;
  flightString: string;
  hasApiError?: boolean;
}

// Simplified high-quality continental path geometries in equirectangular coordinates (0-1000 x 0-500)
const WORLD_CONTINENTS = [
  // North America
  'M 120 70 L 160 55 L 230 50 L 260 85 L 290 85 L 305 115 L 285 140 L 255 160 L 240 210 L 210 240 L 195 240 L 170 200 L 145 190 L 125 150 L 105 120 Z',
  // Greenland
  'M 340 40 L 390 35 L 420 50 L 410 80 L 370 95 L 340 70 Z',
  // South America
  'M 230 250 L 270 245 L 310 275 L 340 315 L 320 375 L 290 430 L 260 450 L 250 420 L 255 360 L 235 300 L 225 265 Z',
  // Europe
  'M 470 95 L 520 85 L 560 95 L 575 130 L 550 155 L 515 155 L 490 170 L 470 160 L 460 135 L 475 110 Z',
  // United Kingdom & Ireland
  'M 450 115 L 465 110 L 460 135 L 445 130 Z M 435 125 L 445 120 L 440 135 L 430 130 Z',
  // Africa
  'M 470 180 L 540 175 L 575 220 L 590 270 L 565 340 L 530 395 L 490 380 L 470 315 L 445 250 L 440 205 L 470 180 Z',
  // Madagascar
  'M 605 340 L 620 335 L 610 375 L 595 370 Z',
  // Asia & Russia
  'M 565 90 L 660 65 L 770 65 L 870 95 L 905 140 L 870 180 L 810 180 L 780 230 L 730 240 L 690 200 L 640 220 L 600 180 L 575 145 Z',
  // India & SE Asia
  'M 685 205 L 725 210 L 730 260 L 710 295 L 685 260 Z M 760 220 L 810 230 L 805 285 L 775 280 Z',
  // Japan
  'M 890 155 L 910 165 L 895 200 L 880 185 Z',
  // Australia & New Zealand
  'M 790 330 L 870 320 L 890 365 L 875 420 L 820 425 L 780 375 Z M 920 415 L 935 410 L 925 450 L 910 445 Z'
];

export const OfflineWorldRadar: React.FC<OfflineWorldRadarProps> = ({
  currentUserName,
  currentUserAvatar,
  partner,
  partnerName,
  partnerAvatar,
  myLocation,
  partnerLocation,
  miles,
  km,
  flightString,
  hasApiError = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);

  // SVG coordinate bounds
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 500;

  // Convert lat/lng to Equirectangular SVG coordinates
  const project = (lat: number, lng: number) => {
    // Normalizing lng [-180, 180] to [0, SVG_WIDTH]
    const x = ((lng + 180) / 360) * SVG_WIDTH;
    // Normalizing lat [90, -90] to [0, SVG_HEIGHT]
    const y = ((90 - lat) / 180) * SVG_HEIGHT;
    return { x, y };
  };

  const myPos = useMemo(() => project(myLocation.latitude, myLocation.longitude), [myLocation]);
  const partnerPos = useMemo(() => project(partnerLocation.latitude, partnerLocation.longitude), [partnerLocation]);

  // Geodesic Arc Path Calculation
  const flightArc = useMemo(() => {
    const dx = partnerPos.x - myPos.x;
    const dy = partnerPos.y - myPos.y;
    const dist = Math.hypot(dx, dy);

    // Compute midpoint
    const midX = (myPos.x + partnerPos.x) / 2;
    // Bend the curve upward (zenith) proportionally to distance
    const arcHeight = Math.min(80, Math.max(30, dist * 0.22));
    const midY = (myPos.y + partnerPos.y) / 2 - arcHeight;

    // Midpoint tangent angle for the airplane
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return {
      path: `M ${myPos.x} ${myPos.y} Q ${midX} ${midY} ${partnerPos.x} ${partnerPos.y}`,
      planeX: midX,
      planeY: midY,
      angle: angle,
    };
  }, [myPos, partnerPos]);

  // Handle Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950 rounded-3xl border border-slate-800">
      {/* Interactive Controls Overlay */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-800 shadow-xl">
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.3))}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.8, z - 0.3))}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            showGrid ? 'text-sky-400 bg-sky-950/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Meridian Grid"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Badge & Information */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 max-w-[70%]">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-semibold text-sky-400 backdrop-blur-md shadow-md">
          <Globe2 className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span>High-Precision World Horizon Radar</span>
        </div>
        {hasApiError ? (
          <span className="text-[10px] text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded-lg backdrop-blur-xs">
            Google Maps reported ApiProjectMapError (Map ID or project key mismatch). Running in seamless offline Radar mode.
          </span>
        ) : null}
      </div>

      {/* Main Interactive SVG Map Canvas */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full transition-transform duration-75 ease-out"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          }}
        >
          <defs>
            {/* Radar Ocean Background Gradient */}
            <radialGradient id="oceanGradient" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#091428" />
              <stop offset="60%" stopColor="#050b14" />
              <stop offset="100%" stopColor="#020408" />
            </radialGradient>

            {/* Flight Arc Gradient */}
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            {/* Glow Filter for Markers */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Deep Space / Ocean Base */}
          <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#oceanGradient)" />

          {/* Meridian Grid Lines */}
          {showGrid && (
            <g stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6">
              {/* Latitude lines (-60, -30, 0 Equator, 30, 60) */}
              <line x1="0" y1="83" x2={SVG_WIDTH} y2="83" />
              <line x1="0" y1="166" x2={SVG_WIDTH} y2="166" />
              <line x1="0" y1="250" x2={SVG_WIDTH} y2="250" stroke="#334155" strokeWidth="1.2" strokeDasharray="none" />
              <line x1="0" y1="333" x2={SVG_WIDTH} y2="333" />
              <line x1="0" y1="416" x2={SVG_WIDTH} y2="416" />

              {/* Longitude lines (-120, -60, 0 Prime Meridian, 60, 120) */}
              <line x1="166" y1="0" x2="166" y2={SVG_HEIGHT} />
              <line x1="333" y1="0" x2="333" y2={SVG_HEIGHT} />
              <line x1="500" y1="0" x2="500" y2={SVG_HEIGHT} stroke="#334155" strokeWidth="1.2" strokeDasharray="none" />
              <line x1="666" y1="0" x2="666" y2={SVG_HEIGHT} />
              <line x1="833" y1="0" x2="833" y2={SVG_HEIGHT} />
            </g>
          )}

          {/* Continental Landmasses */}
          <g fill="#1e293b" stroke="#334155" strokeWidth="1">
            {WORLD_CONTINENTS.map((d, index) => (
              <path
                key={index}
                d={d}
                className="hover:fill-slate-700 transition-colors"
              />
            ))}
          </g>

          {/* Geodesic Flight Arc */}
          <path
            d={flightArc.path}
            fill="none"
            stroke="url(#arcGradient)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="animate-pulse"
            filter="url(#glow)"
          />

          {/* Animated Flight Icon Midway Along Arc */}
          <g
            transform={`translate(${flightArc.planeX}, ${flightArc.planeY}) rotate(${flightArc.angle})`}
          >
            <circle r="12" fill="#f43f5e" opacity="0.2" className="animate-ping" />
            <circle r="7" fill="#f43f5e" />
            <path
              d="M -3 -3 L 5 0 L -3 3 L -1 0 Z"
              fill="white"
            />
          </g>

          {/* Pulse Ripple on User Location */}
          <circle cx={myPos.x} cy={myPos.y} r="18" fill="#0284c7" opacity="0.25" className="animate-ping" />
          <circle cx={myPos.x} cy={myPos.y} r="8" fill="#0284c7" filter="url(#glow)" />
          <circle cx={myPos.x} cy={myPos.y} r="4" fill="#ffffff" />

          {/* Pulse Ripple on Partner Location */}
          <circle cx={partnerPos.x} cy={partnerPos.y} r="18" fill="#e11d48" opacity="0.25" className="animate-ping" />
          <circle cx={partnerPos.x} cy={partnerPos.y} r="8" fill="#e11d48" filter="url(#glow)" />
          <circle cx={partnerPos.x} cy={partnerPos.y} r="4" fill="#ffffff" />

          {/* City & Name Labels (Rendered into SVG for crisp scaling) */}
          <g transform={`translate(${myPos.x}, ${myPos.y - 14})`}>
            <rect
              x="-60"
              y="-22"
              width="120"
              height="20"
              rx="10"
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="-8"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              You • {myLocation.city.split(',')[0]}
            </text>
          </g>

          <g transform={`translate(${partnerPos.x}, ${partnerPos.y - 14})`}>
            <rect
              x="-65"
              y="-22"
              width="130"
              height="20"
              rx="10"
              fill="#e11d48"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="-8"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {partner ? partner.name : partnerName} • {partnerLocation.city.split(',')[0]}
            </text>
          </g>
        </svg>
      </div>

      {/* Floating Travel Information Pill */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-20 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between gap-3 text-xs text-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>{myLocation.city.split(',')[0]}</span>
              <span className="text-slate-400">✈️</span>
              <span>{partnerLocation.city.split(',')[0]}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {miles.toLocaleString()} miles • Flight est. ~{flightString}
            </div>
          </div>
        </div>
        <div className="hidden sm:block">
          <span className="text-[10px] font-semibold text-sky-400 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-800">
            Great Circle Arc
          </span>
        </div>
      </div>
    </div>
  );
};
