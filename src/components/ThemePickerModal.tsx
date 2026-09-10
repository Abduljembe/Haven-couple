import React from 'react';
import { X, Sparkles, Check, Wallpaper } from 'lucide-react';
import { THEME_PRESETS, ThemeId } from '../utils/theme';

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onOpenWallpaperPicker?: () => void;
}

export const ThemePickerModal: React.FC<ThemePickerModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
  onOpenWallpaperPicker,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div 
        id="theme-picker-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif">Color Palette & Atmosphere</h2>
              <p className="text-xs text-white/80">Customize the colors, glow, and vibe of your space</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Grid */}
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {Object.values(THEME_PRESETS).map((theme) => {
              const isSelected = currentThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  id={`theme-btn-${theme.id}`}
                  onClick={() => {
                    onSelectTheme(theme.id);
                  }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'border-slate-900 shadow-lg scale-[1.02] bg-slate-50/50 ring-2 ring-slate-900/10'
                      : 'border-slate-200 hover:border-slate-400 hover:shadow-md bg-white'
                  }`}
                >
                  {/* Top Swatch Gradient Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{theme.emoji}</span>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{theme.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{theme.tagline}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Gradient Color Swatch Preview Bar */}
                  <div className="w-full h-8 rounded-xl overflow-hidden shadow-inner flex border border-black/10">
                    {theme.swatchColors.map((color, idx) => (
                      <div
                        key={idx}
                        className="flex-1 h-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Active Indicator Chip */}
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${theme.glowColor}20`,
                        color: theme.glowColor,
                      }}
                    >
                      {theme.id} vibe
                    </span>
                    <span className="text-slate-400 text-[10px] group-hover:text-slate-700 font-medium">
                      {isSelected ? 'Active Atmosphere' : 'Click to Apply'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 text-center text-xs text-slate-500">
            Themes are saved automatically and give your bubbles, glow rings, and backgrounds custom radiant tones!
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {onOpenWallpaperPicker ? (
            <button
              id="btn-switch-to-wallpaper-picker"
              onClick={() => {
                onClose();
                onOpenWallpaperPicker();
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer hover:underline"
            >
              <Wallpaper className="w-4 h-4 text-emerald-600" />
              <span>Customize WhatsApp Wallpaper →</span>
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
