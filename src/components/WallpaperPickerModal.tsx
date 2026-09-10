import React, { useState, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Check,
  Sparkles,
  Sliders,
  RotateCcw,
  Upload,
  Heart,
  Eye,
  Lock,
} from 'lucide-react';
import {
  WALLPAPER_CATALOG,
  WallpaperSettings,
  ParticleType,
  getSvgForPattern,
} from '../utils/wallpaper';

interface WallpaperPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WallpaperSettings;
  onUpdateSettings: (newSettings: Partial<WallpaperSettings>) => void;
}

export const WallpaperPickerModal: React.FC<WallpaperPickerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewSettings, setPreviewSettings] = useState<WallpaperSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredWallpapers = WALLPAPER_CATALOG.filter((w) => {
    if (activeCategory === 'all') return true;
    return w.category === activeCategory;
  });

  const selectedWallpaper =
    WALLPAPER_CATALOG.find((w) => w.id === previewSettings.selectedId) ||
    WALLPAPER_CATALOG[0];

  const handleSelectWallpaper = (id: string) => {
    const wp = WALLPAPER_CATALOG.find((w) => w.id === id);
    const updated: WallpaperSettings = {
      ...previewSettings,
      selectedId: id,
      doodleOpacity: wp ? wp.defaultOpacity : previewSettings.doodleOpacity,
    };
    setPreviewSettings(updated);
    onUpdateSettings(updated);
  };

  const handleOpacityChange = (val: number) => {
    const updated = { ...previewSettings, doodleOpacity: val };
    setPreviewSettings(updated);
    onUpdateSettings({ doodleOpacity: val });
  };

  const handleDimmingChange = (val: number) => {
    const updated = { ...previewSettings, dimming: val };
    setPreviewSettings(updated);
    onUpdateSettings({ dimming: val });
  };

  const handleToggleParticles = () => {
    const updated = {
      ...previewSettings,
      interactiveParticles: !previewSettings.interactiveParticles,
    };
    setPreviewSettings(updated);
    onUpdateSettings({ interactiveParticles: updated.interactiveParticles });
  };

  const handleParticleTypeChange = (type: ParticleType) => {
    const updated = { ...previewSettings, particleType: type };
    setPreviewSettings(updated);
    onUpdateSettings({ particleType: type });
  };

  const handleResetToDefault = () => {
    const classic = WALLPAPER_CATALOG.find((w) => w.id === 'whatsapp-classic');
    const resetSettings: WallpaperSettings = {
      selectedId: 'whatsapp-classic',
      doodleOpacity: classic ? classic.defaultOpacity : 0.28,
      interactiveParticles: true,
      particleType: 'hearts',
      dimming: 0,
      customImageUrl: null,
      customBgColor: null,
    };
    setPreviewSettings(resetSettings);
    onUpdateSettings(resetSettings);
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updated: WallpaperSettings = {
        ...previewSettings,
        selectedId: 'custom',
        customImageUrl: dataUrl,
      };
      setPreviewSettings(updated);
      onUpdateSettings(updated);
    };
    reader.readAsDataURL(file);
  };

  // Preview SVG pattern for mini chat box
  const rawSvg = getSvgForPattern(selectedWallpaper.patternType);
  const coloredSvg = rawSvg ? rawSvg.replace(/currentColor/g, selectedWallpaper.doodleColor) : '';
  const previewPatternUri = coloredSvg ? `url("data:image/svg+xml,${encodeURIComponent(coloredSvg.trim())}")` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div
        id="wallpaper-picker-dialog"
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <ImageIcon className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Chat Wallpaper & Ambiance</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                  WhatsApp Style
                </span>
              </div>
              <p className="text-xs text-white/80">Choose WhatsApp doodles, romantic couple patterns, or personal photos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Live Mini Preview Box */}
          <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Chat Preview ({selectedWallpaper.name})</span>
              </div>
              <span className="text-[11px] text-slate-500">Updates live as you adjust</span>
            </div>

            <div
              className="relative h-44 sm:h-52 w-full p-4 flex flex-col justify-end gap-2.5 overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: previewSettings.selectedId === 'custom' && previewSettings.customImageUrl ? undefined : selectedWallpaper.bgColor,
                backgroundImage: previewSettings.selectedId === 'custom' && previewSettings.customImageUrl ? `url("${previewSettings.customImageUrl}")` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Pattern Layer */}
              {previewPatternUri && (
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                  style={{
                    backgroundImage: previewPatternUri,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '220px 220px',
                    opacity: previewSettings.doodleOpacity,
                    mixBlendMode: selectedWallpaper.isDark ? 'screen' : 'multiply',
                  }}
                />
              )}

              {/* Dimming Layer */}
              {previewSettings.dimming > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none bg-black transition-opacity"
                  style={{ opacity: previewSettings.dimming }}
                />
              )}

              {/* Sample Incoming Partner Bubble */}
              <div className="relative z-10 self-start max-w-[80%] bg-white rounded-2xl rounded-tl-xs px-3.5 py-2 shadow-md border border-black/5 text-xs text-slate-800 animate-in fade-in">
                <p className="font-semibold text-[10px] text-emerald-600 mb-0.5">Partner</p>
                <p>Do you like this chat wallpaper? Feels just like WhatsApp! 🥰</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                  <span>10:42 AM</span>
                  <Lock className="w-2.5 h-2.5 text-emerald-500" />
                </div>
              </div>

              {/* Sample Outgoing User Bubble */}
              <div className="relative z-10 self-end max-w-[80%] bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2 shadow-md text-xs animate-in fade-in">
                <p>I love it! The doodles and interactive touch sparks are so cozy 💕</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-emerald-100">
                  <span>10:43 AM</span>
                  <span>✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Wallpapers' },
              { id: 'whatsapp', label: 'WhatsApp Classic' },
              { id: 'romantic', label: 'Couple & Love 💕' },
              { id: 'nature', label: 'Nature & Zen 🌿' },
              { id: 'dark', label: 'Dark Mode 🌙' },
              { id: 'solid', label: 'Minimal / Solid' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Wallpapers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredWallpapers.map((wp) => {
              const isSelected = previewSettings.selectedId === wp.id;
              const wpSvg = getSvgForPattern(wp.patternType);
              const wpColoredSvg = wpSvg ? wpSvg.replace(/currentColor/g, wp.doodleColor) : '';
              const cardPatternUri = wpColoredSvg
                ? `url("data:image/svg+xml,${encodeURIComponent(wpColoredSvg.trim())}")`
                : null;

              return (
                <button
                  key={wp.id}
                  id={`btn-wallpaper-${wp.id}`}
                  onClick={() => handleSelectWallpaper(wp.id)}
                  className={`group text-left rounded-2xl border-2 p-2.5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/20 bg-emerald-50/20 scale-[1.02]'
                      : 'border-slate-200 hover:border-slate-400 bg-white hover:shadow-xs'
                  }`}
                >
                  {/* Miniature Tile Canvas */}
                  <div
                    className="relative w-full h-24 rounded-xl border border-black/10 overflow-hidden mb-2.5 flex items-end justify-end p-2 transition-transform group-hover:scale-[1.01]"
                    style={{
                      backgroundColor: wp.bgColor,
                    }}
                  >
                    {cardPatternUri && (
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: cardPatternUri,
                          backgroundRepeat: 'repeat',
                          backgroundSize: '120px 120px',
                          opacity: wp.defaultOpacity,
                          mixBlendMode: wp.isDark ? 'screen' : 'multiply',
                        }}
                      />
                    )}

                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">{wp.name}</span>
                      {wp.isDark && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-200">
                          Dark
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{wp.tagline}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Photo Upload Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Custom Couple Wallpaper</h4>
                <p className="text-[11px] text-slate-500">Upload a picture of the two of you to set as your encrypted chat background</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>
            </div>
          </div>

          {/* Sliders & Interactive Settings (WhatsApp Style) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-bold text-slate-800">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Wallpaper Adjustments & Interactivity</span>
            </div>

            {/* Doodle Opacity Slider */}
            {selectedWallpaper.patternType !== 'none' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Doodle Intensity (Pattern Opacity)</span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {Math.round(previewSettings.doodleOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.02"
                  value={previewSettings.doodleOpacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Subtle (WhatsApp default)</span>
                  <span>Prominent</span>
                </div>
              </div>
            )}

            {/* Background Dimming Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Wallpaper Dimming (Darkness)</span>
                <span className="font-mono text-slate-500 text-[11px]">
                  {Math.round(previewSettings.dimming * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.60"
                step="0.05"
                value={previewSettings.dimming}
                onChange={(e) => handleDimmingChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Bright</span>
                <span>Dimmed</span>
              </div>
            </div>

            {/* Interactive Touch & Cursor Sparks */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span>Interactive Touch & Cursor Sparkles</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Spawns soft floating hearts, starlight, or gentle sparks when touching or moving across the chat wallpaper
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleParticles}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    previewSettings.interactiveParticles ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={previewSettings.interactiveParticles}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      previewSettings.interactiveParticles ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Particle Type Selector */}
            {previewSettings.interactiveParticles && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-600">Sparkle Style:</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'hearts' as ParticleType, label: 'Hearts 💕' },
                    { id: 'stars' as ParticleType, label: 'Starlight ✨' },
                    { id: 'sparks' as ParticleType, label: 'Golden Sparks 🔥' },
                    { id: 'bubbles' as ParticleType, label: 'Bubbles 🫧' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleParticleTypeChange(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        previewSettings.particleType === p.id
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to WhatsApp Classic</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            Done & Keep Wallpaper
          </button>
        </div>
      </div>
    </div>
  );
};
