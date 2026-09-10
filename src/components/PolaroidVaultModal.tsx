import React, { useState, useRef } from 'react';
import {
  Camera,
  X,
  Sparkles,
  Heart,
  Upload,
  Layers,
  Wand2,
  Trash2,
  Lock,
  Eye,
  Hand,
  Check,
} from 'lucide-react';
import { PolaroidPhoto, UserProfile } from '../types';
import confetti from 'canvas-confetti';

interface PolaroidVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: PolaroidPhoto[];
  currentUserId: string;
  currentUserName: string;
  partner?: UserProfile;
  partnerName: string;
  onAddPhoto: (photo: PolaroidPhoto) => void;
  onDeletePhoto: (photoId: string) => void;
  onLikePhoto: (photoId: string) => void;
  onRevealPhoto: (photoId: string) => void;
}

const FILTERS = [
  { id: 'vintage', label: 'Vintage Warm', css: 'sepia-[0.3] contrast-[1.1] brightness-[1.05]' },
  { id: 'warm', label: 'Golden Hour', css: 'saturate-[1.3] brightness-[1.08] hue-rotate-[-5deg]' },
  { id: 'noir', label: 'Classic Noir', css: 'grayscale contrast-[1.2]' },
  { id: 'dreamy', label: 'Dreamy Pastel', css: 'brightness-[1.1] contrast-[0.95] saturate-[1.2]' },
  { id: 'film', label: '35mm Film', css: 'contrast-[1.15] saturate-[1.1] sepia-[0.15]' },
] as const;

export const PolaroidVaultModal: React.FC<PolaroidVaultModalProps> = ({
  isOpen,
  onClose,
  photos,
  currentUserId,
  currentUserName,
  partner,
  partnerName,
  onAddPhoto,
  onDeletePhoto,
  onLikePhoto,
  onRevealPhoto,
}) => {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'vintage' | 'warm' | 'noir' | 'dreamy' | 'film'>('vintage');
  const [shakeToReveal, setShakeToReveal] = useState<boolean>(false);
  const [activePhoto, setActivePhoto] = useState<PolaroidPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPreviewUrl(event.target.result);
        setIsCapturing(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePolaroid = () => {
    if (!previewUrl) return;

    const newPhoto: PolaroidPhoto = {
      id: `polaroid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUserId,
      senderName: currentUserName,
      caption: caption.trim() || 'A sweet moment together ✨',
      dateStr: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      photoUrl: previewUrl,
      filter: selectedFilter,
      isShakeToReveal: shakeToReveal,
      isRevealed: !shakeToReveal,
      heartsCount: 0,
      createdAt: Date.now(),
    };

    onAddPhoto(newPhoto);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });

    // Reset capture form
    setPreviewUrl(null);
    setCaption('');
    setIsCapturing(false);
    setShakeToReveal(false);
  };

  const handleSimulateShake = (photoId: string) => {
    onRevealPhoto(photoId);
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.5 } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div
        id="polaroid-vault-modal"
        className="w-full max-w-4xl bg-amber-50/90 rounded-3xl shadow-2xl overflow-hidden border border-amber-200/80 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-100/90 via-rose-100/80 to-amber-100/90 border-b border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-300 flex items-center justify-center text-amber-800">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-950 flex items-center gap-2">
                <span>Secret Polaroid Vault</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-semibold border border-amber-300">
                  {photos.length} Keepsakes
                </span>
              </h2>
              <p className="text-xs text-amber-800/80">
                Encrypted vintage snaps & "Shake to Reveal" memories for two
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Snap Polaroid</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-amber-800/70 hover:text-amber-950 hover:bg-amber-200/50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* New Polaroid Editor Form (when user uploads image) */}
          {isCapturing && previewUrl && (
            <div className="p-5 rounded-3xl bg-white border border-amber-300 shadow-md space-y-4 animate-scale-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4 text-amber-600" />
                  <span>Customize Your Vintage Polaroid</span>
                </span>
                <button
                  onClick={() => setIsCapturing(false)}
                  className="text-xs text-amber-700 hover:underline"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Polaroid Frame Preview */}
                <div className="flex justify-center">
                  <div className="w-56 bg-white p-3 pb-8 rounded-lg shadow-xl border border-amber-200 flex flex-col items-center">
                    <div className="w-full aspect-square bg-zinc-900 rounded overflow-hidden shadow-inner">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className={`w-full h-full object-cover ${
                          FILTERS.find((f) => f.id === selectedFilter)?.css || ''
                        }`}
                      />
                    </div>
                    <p className="mt-3 font-serif text-xs text-zinc-700 italic text-center px-1">
                      {caption || 'Add your caption below...'}
                    </p>
                  </div>
                </div>

                {/* Filter and Caption Controls */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-amber-900 block mb-1.5">
                      Handwritten Caption
                    </label>
                    <input
                      type="text"
                      maxLength={60}
                      placeholder="e.g. Our sunset picnic in the park 💕"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-amber-900 block mb-1.5">
                      Analog Film Filter
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {FILTERS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFilter(f.id)}
                          className={`p-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                            selectedFilter === f.id
                              ? 'bg-amber-800 text-white border-amber-800'
                              : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="chk-shake"
                      checked={shakeToReveal}
                      onChange={(e) => setShakeToReveal(e.target.checked)}
                      className="w-4 h-4 accent-amber-700 rounded cursor-pointer"
                    />
                    <label htmlFor="chk-shake" className="text-xs text-amber-900 font-medium cursor-pointer">
                      "Shake to Develop" surprise for {partner ? partner.name : partnerName}
                    </label>
                  </div>

                  <button
                    onClick={handleSavePolaroid}
                    className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    Seal Polaroid in Vault ✨
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Polaroid Mosaic Gallery */}
          {photos.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white/60 border border-dashed border-amber-300">
              <Camera className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-amber-950">Your Photo Vault is Waiting</h3>
              <p className="text-xs text-amber-800/80 max-w-sm mx-auto mt-1 mb-4">
                Snap photos together, apply vintage analog filters, and build a private visual history of your relationship.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-amber-800 text-white text-xs font-semibold cursor-pointer shadow-sm"
              >
                Add First Polaroid
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {photos.map((p) => {
                const isHidden = p.isShakeToReveal && !p.isRevealed;
                const filterCss = FILTERS.find((f) => f.id === p.filter)?.css || '';

                return (
                  <div
                    key={p.id}
                    className="bg-white p-3.5 pb-7 rounded-xl shadow-lg border border-amber-200 flex flex-col justify-between transform hover:-rotate-1 hover:scale-102 transition-all group relative"
                  >
                    {/* Delete button on hover */}
                    {p.senderId === currentUserId && (
                      <button
                        onClick={() => onDeletePhoto(p.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Image Area */}
                    <div className="w-full aspect-square bg-zinc-900 rounded overflow-hidden relative shadow-inner">
                      {isHidden ? (
                        <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-4 text-center text-amber-200">
                          <Hand className="w-8 h-8 text-amber-400 animate-pulse mb-2" />
                          <p className="text-xs font-semibold">Undeveloped Polaroid</p>
                          <p className="text-[10px] text-amber-300/70 mt-1">
                            {p.senderName} sealed this photo.
                          </p>
                          <button
                            onClick={() => handleSimulateShake(p.id)}
                            className="mt-3 px-3 py-1 rounded-full bg-amber-500 text-amber-950 text-[11px] font-bold shadow-md cursor-pointer hover:bg-amber-400"
                          >
                            Shake to Reveal ✨
                          </button>
                        </div>
                      ) : (
                        <img
                          src={p.photoUrl}
                          alt={p.caption}
                          className={`w-full h-full object-cover ${filterCss}`}
                        />
                      )}
                    </div>

                    {/* Caption & Metadata */}
                    <div className="mt-3 text-center">
                      <p className="font-serif text-xs text-zinc-800 italic px-1 line-clamp-2">
                        "{p.caption}"
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 px-1">
                        <span>{p.dateStr}</span>
                        <button
                          onClick={() => onLikePhoto(p.id)}
                          className="flex items-center gap-1 text-rose-500 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Heart className="w-3.5 h-3.5 fill-rose-500" />
                          <span>{p.heartsCount || 1}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
