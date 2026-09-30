import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft, Lock, CheckCircle2, Copy, Check, X, ShieldAlert, Sparkles, KeyRound } from 'lucide-react';

interface SecurityVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  fingerprint: {
    numericBlocks: string[];
    emojiSequence: string[];
    rawHash: string;
  };
  isVerified: boolean;
  onToggleVerified: (verified: boolean) => void;
  partnerName: string;
}

export const SecurityVerifyModal: React.FC<SecurityVerifyModalProps> = ({
  isOpen,
  onClose,
  roomId,
  fingerprint,
  isVerified,
  onToggleVerified,
  partnerName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const text = `Haven Security Safety Number for Space [${roomId}]:\n${fingerprint.numericBlocks.join(' ')}\nEmojis: ${fingerprint.emojiSequence.join(' ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div 
        id="security-verify-modal"
        className="w-full max-w-md bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="relative bg-slate-900 px-4 sm:px-6 py-4 sm:py-6 text-white shrink-0 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven-Style Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-security-mobile-back"
              className="p-1.5 -ml-1 text-emerald-400 hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">End-to-End Encryption</h2>
              <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium mt-0.5 truncate">
                <Lock className="w-3 h-3 shrink-0" /> AES-256-GCM + DTLS-SRTP
              </p>
            </div>
          </div>

          <button
            id="btn-close-security-modal"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          <p className="text-xs text-slate-600 leading-relaxed">
            Messages, voice notes, photos, and video/audio calls in this space are encrypted on your device. Only you and <span className="font-semibold text-slate-900">{partnerName}</span> possess the keys. Not even the server can inspect your conversations.
          </p>

          {/* Safety Emoji Sequence */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              Security Emoji Sequence
            </span>
            <div className="flex items-center justify-center gap-3 text-3xl py-1">
              {fingerprint.emojiSequence.map((emoji, idx) => (
                <span key={idx} className="p-2 bg-white rounded-xl shadow-xs border border-slate-200/60">
                  {emoji}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Verify these 4 emojis match on {partnerName}'s screen
            </p>
          </div>

          {/* Safety Number Grid */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Safety Number Fingerprint
              </span>
              <button
                id="btn-copy-safety-number"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center font-mono text-sm font-bold text-slate-800 tracking-wider">
              {fingerprint.numericBlocks.map((block, idx) => (
                <div key={idx} className="bg-white py-2 px-1 rounded-xl border border-slate-200/60 shadow-xs">
                  {block}
                </div>
              ))}
            </div>
          </div>

          {/* Verification Switch */}
          <div className="flex items-center justify-between p-3.5 bg-rose-50/60 border border-rose-100 rounded-2xl">
            <div className="flex items-center gap-2.5">
              {isVerified ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {isVerified ? 'Space Identity Verified' : 'Mark as Verified'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isVerified ? `You and ${partnerName} confirmed safety numbers` : 'Toggle when verified together'}
                </div>
              </div>
            </div>

            <button
              id="btn-toggle-verify-status"
              type="button"
              onClick={() => onToggleVerified(!isVerified)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isVerified ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isVerified ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Close button */}
          <button
            id="btn-close-verify"
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white font-medium text-sm rounded-xl hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
