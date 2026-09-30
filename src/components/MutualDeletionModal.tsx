import React, { useState } from 'react';
import { Trash2, AlertTriangle, ShieldCheck, HeartCrack, Clock, X, Check, Users, Lock } from 'lucide-react';
import { PendingSpaceDeletion } from '../types';

interface MutualDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingDeletion: PendingSpaceDeletion | null;
  currentUserId: string;
  currentUserName: string;
  partnerName: string;
  roomId: string;
  spaceType?: 'couple' | 'friends';
  onRequestDeletion: (reason?: string) => void;
  onRespondDeletion: (agree: boolean) => void;
  onCancelDeletion: () => void;
  isDark?: boolean;
}

export const MutualDeletionModal: React.FC<MutualDeletionModalProps> = ({
  isOpen,
  onClose,
  pendingDeletion,
  currentUserId,
  currentUserName,
  partnerName,
  roomId,
  spaceType = 'couple',
  onRequestDeletion,
  onRespondDeletion,
  onCancelDeletion,
  isDark = true,
}) => {
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isSquad = spaceType === 'friends' || roomId.toLowerCase().startsWith('squad-');
  const entityLabel = isSquad ? 'squad members' : 'both partners';

  // Has someone already initiated a deletion request?
  const hasActiveRequest = pendingDeletion && pendingDeletion.status === 'pending';
  const isRequester = hasActiveRequest && pendingDeletion.requestedBy.id === currentUserId;
  const isRecipient = hasActiveRequest && !isRequester;

  const handleInitiateRequest = () => {
    if (!confirmedCheckbox) return;
    setSubmitting(true);
    onRequestDeletion(reason.trim() || undefined);
    setSubmitting(false);
  };

  const handleAgree = () => {
    setSubmitting(true);
    onRespondDeletion(true);
    setSubmitting(false);
  };

  const handleDecline = () => {
    setSubmitting(true);
    onRespondDeletion(false);
    setSubmitting(false);
    onClose();
  };

  const handleCancelMyRequest = () => {
    onCancelDeletion();
    onClose();
  };

  return (
    <div
      id="mutual-deletion-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="mutual-deletion-modal-container"
        className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative overflow-hidden ${
          isDark
            ? 'bg-slate-900/95 border-rose-900/50 text-slate-100 shadow-rose-950/40'
            : 'bg-white border-rose-200 text-slate-900 shadow-rose-100'
        }`}
      >
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-red-600" />

        {/* Close Button */}
        <button
          type="button"
          id="btn-close-mutual-deletion"
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
            isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER ICON & TITLE */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
            {hasActiveRequest ? (
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            ) : (
              <Trash2 className="w-6 h-6" />
            )}
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Mutual Consent Privacy Guard
            </span>
            <h2 className="text-lg font-bold font-serif leading-tight">
              {isRecipient
                ? 'Partner Requested Space Deletion'
                : isRequester
                ? 'Waiting for Partner Agreement'
                : 'Delete Space Permanently'}
            </h2>
          </div>
        </div>

        {/* --- CASE 1: RECIPIENT MODE (Partner asked to delete) --- */}
        {isRecipient && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                isDark
                  ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <p className="font-semibold mb-2 flex items-center gap-2">
                <HeartCrack className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  {pendingDeletion?.requestedBy?.name || partnerName || 'Your partner'} wants to permanently delete this space (
                  <span className="font-mono font-bold">#{roomId}</span>).
                </span>
              </p>
              <p className="text-xs opacity-90">
                Because this is a private sanctuary, <span className="font-bold underline">{entityLabel} must both agree</span> before any data can be wiped. If you agree, all chat messages, photos, videos, and memories will be erased forever.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>You hold the key:</span>
              </div>
              <p>If you click Decline, the deletion is cancelled immediately and the space remains intact.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                id="btn-agree-delete-space"
                onClick={handleAgree}
                disabled={submitting}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Agree & Delete</span>
              </button>

              <button
                type="button"
                id="btn-decline-delete-space"
                onClick={handleDecline}
                disabled={submitting}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Decline & Keep Safe</span>
              </button>
            </div>
          </div>
        )}

        {/* --- CASE 2: REQUESTER MODE (I requested, waiting for partner) --- */}
        {isRequester && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-2xl border text-sm leading-relaxed ${
                isDark
                  ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold mb-2 text-amber-400">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Waiting for {partnerName || 'Partner'} to approve</span>
              </div>
              <p className="text-xs opacity-90 mb-2">
                Your request to permanently erase space <span className="font-mono font-bold">#{roomId}</span> is pending. A prompt has been sent to your partner.
              </p>
              <p className="text-xs opacity-90">
                The space will remain live and safe until they review and confirm agreement. If you changed your mind, you can cancel your request below at any time.
              </p>
            </div>

            <button
              type="button"
              id="btn-cancel-my-deletion-request"
              onClick={handleCancelMyRequest}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4 text-rose-400" />
              <span>Cancel Deletion Request</span>
            </button>
          </div>
        )}

        {/* --- CASE 3: INITIATE REQUEST MODE (Not requested yet) --- */}
        {!hasActiveRequest && (
          <div className="space-y-4">
            <div
              className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                isDark
                  ? 'bg-slate-800/60 border-slate-700/80 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <p className="font-semibold text-slate-100 dark:text-slate-200 mb-1">
                🔒 Permanent Storage Guarantee:
              </p>
              <p>
                All messages, shared photos, audio recordings, and Spotify playlists in space{' '}
                <span className="font-mono font-bold">#{roomId}</span> remain securely saved forever.
              </p>
              <p className="mt-1.5 text-rose-400 font-medium">
                To prevent accidental loss or unilateral wipes, permanent deletion requires{' '}
                <span className="underline font-bold">both parties to explicitly agree</span>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Reason / Note for {partnerName || 'Partner'} (Optional):
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. We decided to create a brand new space together..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-rose-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
                }`}
              />
            </div>

            {/* Checkbox confirmation */}
            <label className="flex items-start gap-3 cursor-pointer select-none group pt-1">
              <input
                type="checkbox"
                id="checkbox-confirm-permanent-deletion"
                checked={confirmedCheckbox}
                onChange={(e) => setConfirmedCheckbox(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-600 cursor-pointer"
              />
              <span className="text-xs text-slate-400 group-hover:text-slate-300 leading-snug">
                I understand that permanent deletion will irreversibly wipe all messages, media, and records for both members, and will only execute if {partnerName || 'my partner'} agrees.
              </span>
            </label>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                id="btn-submit-mutual-deletion-request"
                onClick={handleInitiateRequest}
                disabled={!confirmedCheckbox || submitting}
                className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                  confirmedCheckbox && !submitting
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/30 cursor-pointer active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Request Permanent Deletion</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`w-full sm:w-auto py-3 px-4 rounded-xl font-medium text-xs transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
