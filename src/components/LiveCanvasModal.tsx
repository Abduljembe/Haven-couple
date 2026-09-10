import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Palette,
  Eraser,
  RotateCcw,
  Send,
  Download,
  Trash2,
  Sparkles,
  Heart,
  Star,
  Flame,
  Smile,
  Brush,
  Sun,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { CanvasCursor, CanvasStroke, CanvasStrokePoint, UserProfile } from '../types';

interface LiveCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  partner: UserProfile | null;
  partnerName: string;
  onSendStroke: (stroke: CanvasStroke) => void;
  onClearCanvas: () => void;
  onCursorMove: (cursor: CanvasCursor) => void;
  onSendToChat: (buffer: ArrayBuffer, mimeType: string, fileName: string) => void;
  remoteStrokes: CanvasStroke[];
  remoteCursor: CanvasCursor | null;
  canvasClearedAt?: number;
}

const PALETTE = [
  '#f43f5e', // Rose
  '#e11d48', // Crimson
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#8b5cf6', // Violet
  '#3b82f6', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber/Gold
  '#ffffff', // White
  '#0f172a', // Slate
];

const STAMPS = ['❤️', '💖', '✨', '💋', '🌟', '🌹', '🧸', '💌'];

export const LiveCanvasModal: React.FC<LiveCanvasModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partner,
  partnerName,
  onSendStroke,
  onClearCanvas,
  onCursorMove,
  onSendToChat,
  remoteStrokes,
  remoteCursor,
  canvasClearedAt,
}) => {
  const [activeTool, setActiveTool] = useState<'pen' | 'glow' | 'highlighter' | 'eraser' | 'stamp'>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#f43f5e');
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [selectedStamp, setSelectedStamp] = useState<string>('❤️');
  const [localStrokes, setLocalStrokes] = useState<CanvasStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentPointsRef = useRef<CanvasStrokePoint[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync external clear
  useEffect(() => {
    if (canvasClearedAt) {
      setLocalStrokes([]);
      redrawAll([]);
    }
  }, [canvasClearedAt]);

  // Merge strokes (local + remote)
  const allStrokes = [...localStrokes, ...remoteStrokes];

  // Helper to redraw all strokes onto the canvas
  const redrawAll = useCallback((strokesToRender: CanvasStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw dark romantic textured background grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    const dotSpacing = 24;
    for (let x = dotSpacing / 2; x < canvas.width; x += dotSpacing) {
      for (let y = dotSpacing / 2; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render strokes
    strokesToRender.forEach((stroke) => {
      if (stroke.tool === 'stamp' && stroke.points.length > 0) {
        const pt = stroke.points[0];
        ctx.save();
        ctx.font = `${stroke.size * 6}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stroke.stampEmoji || '❤️', pt.x, pt.y);
        ctx.restore();
        return;
      }

      if (stroke.points.length < 2) return;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;

      if (stroke.tool === 'eraser') {
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();
      } else if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = stroke.color;
        ctx.stroke();
      } else if (stroke.tool === 'glow') {
        ctx.shadowColor = stroke.color;
        ctx.shadowBlur = stroke.size * 2.5;
        ctx.strokeStyle = stroke.color;
        ctx.stroke();
        // second pass for inner bright core
        ctx.lineWidth = Math.max(1, stroke.size * 0.4);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      } else {
        // standard pen
        ctx.strokeStyle = stroke.color;
        ctx.stroke();
      }

      ctx.restore();
    });
  }, []);

  // Sync canvas size on mount / resize
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      redrawAll(allStrokes);
    }
  }, [allStrokes, redrawAll]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        resizeCanvas();
      }, 50);
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [isOpen, resizeCanvas]);

  // Redraw when allStrokes change
  useEffect(() => {
    redrawAll(allStrokes);
  }, [remoteStrokes, localStrokes, redrawAll]);

  // Coordinates helper
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Drawing Handlers
  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    currentPointsRef.current = [coords];

    // Broadcast cursor position
    onCursorMove({
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      x: coords.x,
      y: coords.y,
      isDrawing: true,
      color: selectedColor,
    });

    if (activeTool === 'stamp') {
      const stampStroke: CanvasStroke = {
        id: `stamp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        userId: currentUserId,
        tool: 'stamp',
        color: selectedColor,
        size: strokeWidth,
        stampEmoji: selectedStamp,
        points: [coords],
      };
      setLocalStrokes((prev) => [...prev, stampStroke]);
      onSendStroke(stampStroke);
      setIsDrawing(false);
      return;
    }

    // Direct canvas preview
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = activeTool === 'eraser' ? '#0f172a' : selectedColor;
    ctx.fill();
    ctx.restore();
  };

  const handleMoveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    // Always emit cursor move
    onCursorMove({
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      x: coords.x,
      y: coords.y,
      isDrawing,
      color: selectedColor,
    });

    if (!isDrawing || activeTool === 'stamp') return;

    const points = currentPointsRef.current;
    points.push(coords);

    // Live preview segment
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || points.length < 2) return;

    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;

    if (activeTool === 'eraser') {
      ctx.strokeStyle = '#0f172a';
    } else if (activeTool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = selectedColor;
    } else if (activeTool === 'glow') {
      ctx.shadowColor = selectedColor;
      ctx.shadowBlur = strokeWidth * 2;
      ctx.strokeStyle = selectedColor;
    } else {
      ctx.strokeStyle = selectedColor;
    }

    ctx.stroke();
    ctx.restore();
  };

  const handleEndDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPointsRef.current.length > 0 && activeTool !== 'stamp') {
      const newStroke: CanvasStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        userId: currentUserId,
        tool: activeTool,
        color: selectedColor,
        size: strokeWidth,
        points: [...currentPointsRef.current],
      };

      setLocalStrokes((prev) => [...prev, newStroke]);
      onSendStroke(newStroke);
    }

    currentPointsRef.current = [];
    onCursorMove({
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      x: 0,
      y: 0,
      isDrawing: false,
      color: selectedColor,
    });
  };

  // Undo last local stroke
  const handleUndo = () => {
    if (localStrokes.length === 0) return;
    const nextStrokes = localStrokes.slice(0, -1);
    setLocalStrokes(nextStrokes);
    redrawAll([...nextStrokes, ...remoteStrokes]);
  };

  // Clear Canvas
  const handleClear = () => {
    if (confirm('Clear the entire love canvas for both of you?')) {
      setLocalStrokes([]);
      onClearCanvas();
      redrawAll([]);
    }
  };

  // Send Canvas to Encrypted Chat
  const handleSendToChat = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const buffer = await blob.arrayBuffer();
            onSendToChat(buffer, 'image/png', `love-doodle-${Date.now()}.png`);
            setIsSaving(false);
            onClose();
          }
        },
        'image/png',
        0.95
      );
    } catch (err) {
      console.error('Error generating canvas snapshot:', err);
      setIsSaving(false);
    }
  };

  // Download local PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `haven-love-canvas-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900/90 border-b border-slate-800 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">Live Love Canvas</h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30">
                  Real-Time Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Drawing together with {partner ? partner.name : partnerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Button */}
            <button
              id="btn-download-canvas"
              onClick={handleDownload}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Save doodle image"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Undo Button */}
            <button
              id="btn-undo-canvas"
              onClick={handleUndo}
              disabled={localStrokes.length === 0}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              title="Undo your last stroke"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Clear Button */}
            <button
              id="btn-clear-canvas"
              onClick={handleClear}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="Clear Canvas"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Send to Chat Button */}
            <button
              id="btn-send-canvas-to-chat"
              onClick={handleSendToChat}
              disabled={isSaving || allStrokes.length === 0}
              className="py-1.5 px-3.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send to Chat</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-canvas-modal"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas Body with partner live pointer overlay */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-slate-950 overflow-hidden select-none touch-none cursor-crosshair"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleStartDraw}
            onMouseMove={handleMoveDraw}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleMoveDraw}
            onTouchEnd={handleEndDraw}
            className="w-full h-full block"
          />

          {/* Partner's Live Cursor Indicator */}
          {remoteCursor && remoteCursor.x > 0 && remoteCursor.y > 0 && (
            <div
              className="absolute pointer-events-none transition-all duration-75 z-30"
              style={{
                left: `${remoteCursor.x}px`,
                top: `${remoteCursor.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="relative">
                {/* Pointer Dot */}
                <div
                  className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                    remoteCursor.isDrawing ? 'scale-125 animate-ping' : ''
                  }`}
                  style={{ backgroundColor: remoteCursor.color || '#ec4899' }}
                />

                {/* Partner Name Tag */}
                <div className="absolute left-4 top-2 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-[10px] text-white font-medium whitespace-nowrap shadow-md flex items-center gap-1">
                  <span>{partner ? partner.name : partnerName}</span>
                  {remoteCursor.isDrawing && <span className="text-rose-400 text-[9px]">✏️</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar Footer */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 shrink-0 z-20 flex flex-wrap items-center justify-between gap-3">
          {/* Tool Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60">
            <button
              id="tool-pen"
              onClick={() => setActiveTool('pen')}
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'pen'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Standard Pen"
            >
              <Brush className="w-4 h-4" />
              <span className="hidden md:inline">Pen</span>
            </button>

            <button
              id="tool-glow"
              onClick={() => setActiveTool('glow')}
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'glow'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Neon Glow Brush"
            >
              <Sparkles className="w-4 h-4 text-pink-300" />
              <span className="hidden md:inline">Neon Glow</span>
            </button>

            <button
              id="tool-highlighter"
              onClick={() => setActiveTool('highlighter')}
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'highlighter'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Watercolor Highlighter"
            >
              <Sun className="w-4 h-4 text-amber-300" />
              <span className="hidden md:inline">Highlight</span>
            </button>

            <button
              id="tool-stamp"
              onClick={() => setActiveTool('stamp')}
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'stamp'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Love Stamps"
            >
              <Heart className="w-4 h-4 text-rose-300 fill-rose-300" />
              <span className="hidden md:inline">Stamps</span>
            </button>

            <button
              id="tool-eraser"
              onClick={() => setActiveTool('eraser')}
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === 'eraser'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden md:inline">Eraser</span>
            </button>
          </div>

          {/* Color Palette or Stamp Palette */}
          {activeTool === 'stamp' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {STAMPS.map((stamp) => (
                <button
                  key={stamp}
                  onClick={() => setSelectedStamp(stamp)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-transform cursor-pointer ${
                    selectedStamp === stamp
                      ? 'bg-rose-500/30 border-2 border-rose-400 scale-110'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  {stamp}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-transform cursor-pointer ${
                    selectedColor === color
                      ? 'scale-125 border-white shadow-md ring-2 ring-rose-500/50'
                      : 'border-slate-700 hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}

          {/* Stroke Size Slider */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 font-medium">Size</span>
            <input
              id="slider-canvas-stroke-width"
              type="range"
              min="2"
              max="24"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-16 sm:w-24 accent-rose-500 cursor-pointer"
            />
            <div
              className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center"
              style={{
                width: `${Math.max(4, Math.min(16, strokeWidth))}px`,
                height: `${Math.max(4, Math.min(16, strokeWidth))}px`,
                backgroundColor: selectedColor,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
