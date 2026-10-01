import React, { useRef, useState } from 'react';
import { Camera, Upload, Check, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';
import { DEFAULT_AVATARS, cropAndCompressAvatar } from '../utils/avatarUtils';

interface AvatarPickerProps {
  currentAvatar: string;
  onChange: (avatarUrl: string) => void;
  label?: string;
  idPrefix?: string;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  currentAvatar,
  onChange,
  label = 'Choose Avatar',
  idPrefix = 'avatar',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WEBP, etc.)');
      return;
    }

    try {
      setIsProcessing(true);
      const compressedDataUrl = await cropAndCompressAvatar(file, 256, 0.85);
      onChange(compressedDataUrl);
    } catch (err) {
      console.error('Failed to process avatar photo:', err);
      alert('Could not process this image. Please try another photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // reset input
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const isCustomPhoto = !DEFAULT_AVATARS.includes(currentAvatar);

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
          {isCustomPhoto && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
              Custom Photo Active
            </span>
          )}
        </div>
      )}

      {/* Main Avatar Display & Upload Trigger */}
      <div className="flex items-center gap-3">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative group w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all shrink-0 ${
            isDragging
              ? 'border-rose-500 ring-4 ring-rose-500/20 scale-105'
              : 'border-rose-200 hover:border-rose-400 shadow-sm'
          }`}
          title="Click or drop a photo to set your custom avatar"
        >
          <img
            src={currentAvatar}
            alt="Selected Avatar"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />

          {/* Change Avatar Overlay / Indicator */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
            <Camera className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Change</span>
          </div>
          <div className="sm:hidden absolute bottom-1 right-1 p-1 bg-black/70 rounded-full text-white">
            <Camera className="w-3 h-3" />
          </div>

          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Buttons and Info */}
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id={`${idPrefix}-upload-btn`}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Your Photo</span>
            </button>

            {isCustomPhoto && (
              <button
                type="button"
                onClick={() => onChange(DEFAULT_AVATARS[0])}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
                title="Reset to default preset avatar"
              >
                Reset
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            JPG, PNG, or WEBP from your computer/phone. Automatically cropped to high-res square.
          </p>

          <input
            id={`${idPrefix}-file-input`}
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Preset Avatars Carousel */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-slate-500">Or pick a preset avatar:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {DEFAULT_AVATARS.map((avatar, idx) => {
            const isSelected = currentAvatar === avatar;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onChange(avatar)}
                className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-rose-500 ring-2 ring-rose-500/30 scale-105 shadow-sm'
                    : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                }`}
                title={`Preset Avatar ${idx + 1}`}
              >
                <img src={avatar} alt={`Avatar option ${idx + 1}`} className="w-full h-full object-cover" />
                {isSelected && (
                  <div className="absolute inset-0 bg-rose-600/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
