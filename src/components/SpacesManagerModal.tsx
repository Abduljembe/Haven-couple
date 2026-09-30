import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Heart, 
  ArrowRight, 
  Trash2, 
  Clock, 
  KeyRound, 
  ShieldCheck, 
  Plus, 
  Check, 
  Share2,
  Copy,
  Search,
  Lock,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { SavedSpaceRecord } from '../types';
import { getSavedSpaces, removeSavedSpace, clearAllSavedSpaces } from '../utils/spaceRegistry';

interface SpacesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId?: string;
  onSwitchSpace: (record: SavedSpaceRecord) => void;
  onOpenNewSpaceSetup: () => void;
  onOpenMutualDeletion?: () => void;
}

export const SpacesManagerModal: React.FC<SpacesManagerModalProps> = ({
  isOpen,
  onClose,
  currentRoomId,
  onSwitchSpace,
  onOpenNewSpaceSetup,
  onOpenMutualDeletion,
}) => {
  const [spaces, setSpaces] = useState<SavedSpaceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSpaces(getSavedSpaces());
      setConfirmDeleteId(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteSpace = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    const updated = removeSavedSpace(roomId);
    setSpaces(updated);
    setConfirmDeleteId(null);
  };

  const handleCopyLink = async (e: React.MouseEvent, sp: SavedSpaceRecord) => {
    e.stopPropagation();
    const origin = window.location.origin;
    const shareUrl = `${origin}/?room=${encodeURIComponent(sp.roomId)}&key=${encodeURIComponent(sp.passkey)}&type=${sp.spaceType}`;
    const shareText = sp.spaceType === 'friends'
      ? `Join our Squad Room "${sp.title || sp.partnerOrGroupName}"! Code: #${sp.roomId}\n${shareUrl}`
      : `Join our private Sanctuary space! Room Code: #${sp.roomId}\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Space #${sp.roomId}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if share cancelled
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedRoomId(sp.roomId);
      setTimeout(() => setCopiedRoomId(null), 2500);
    } catch {
      // ignore
    }
  };

  const formatLastActive = (timestamp: number) => {
    if (!timestamp) return 'Recently';
    const diffMin = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return 'Active just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const filteredSpaces = spaces.filter((sp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sp.roomId.toLowerCase().includes(q) ||
      (sp.title && sp.title.toLowerCase().includes(q)) ||
      (sp.partnerOrGroupName && sp.partnerOrGroupName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="spaces-manager-dialog"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10 p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">Your Spaces & Sanctuaries</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Indefinite Storage 🟢
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Switch instantly between all your created & joined rooms
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Search bar */}
          {spaces.length > 2 && (
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spaces by name or room code..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-rose-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          )}
        </div>

        {/* Space List */}
        <div className="p-5 max-h-[55vh] overflow-y-auto space-y-3">
          {spaces.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No Other Saved Spaces
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Any space you create with your unique room code is stored forever. All shared media and messages persist unless both members agree to delete.
              </p>
            </div>
          ) : filteredSpaces.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No spaces match "{searchQuery}"
            </div>
          ) : (
            filteredSpaces.map((sp) => {
              const isCurrent = currentRoomId && sp.roomId.toLowerCase() === currentRoomId.toLowerCase();
              const isFriends = sp.spaceType === 'friends';
              const isCopied = copiedRoomId === sp.roomId;

              return (
                <div
                  key={sp.roomId}
                  onClick={() => {
                    if (!isCurrent) {
                      onSwitchSpace(sp);
                      onClose();
                    }
                  }}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar / Emoji */}
                    <div className="relative shrink-0">
                      {isFriends ? (
                        <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xl shadow-inner">
                          {sp.partnerOrGroupAvatar || '🎉'}
                        </div>
                      ) : (
                        <img
                          src={sp.partnerOrGroupAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={sp.partnerOrGroupName}
                          className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                      )}
                      <span
                        className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] text-white shadow ${
                          isFriends ? 'bg-indigo-600' : 'bg-rose-500'
                        }`}
                      >
                        {isFriends ? <Users className="w-2.5 h-2.5" /> : <Heart className="w-2.5 h-2.5 fill-white" />}
                      </span>
                    </div>

                    {/* Information */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold truncate">
                          {sp.title || sp.partnerOrGroupName}
                        </h4>
                        {isCurrent && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono bg-slate-200/70 dark:bg-slate-700/60 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                          #{sp.roomId}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3" />
                          {formatLastActive(sp.lastVisitedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Copy Link, Open, Remove */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Share / Copy Link Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, sp)}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-200/60 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                      title="Share link or room code"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="hidden sm:inline text-[10px]">Invite</span>
                        </>
                      )}
                    </button>

                    {isCurrent ? (
                      <span className="text-xs text-rose-500 dark:text-rose-400 font-medium px-2 py-1">
                        Current
                      </span>
                    ) : (
                      <button
                        id={`btn-switch-to-${sp.roomId}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSwitchSpace(sp);
                          onClose();
                        }}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-600 text-white dark:bg-slate-700 dark:hover:bg-rose-600 transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        title="Switch to this space"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {confirmDeleteId === sp.roomId ? (
                      <div className="flex items-center gap-1 animate-in fade-in" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDeleteSpace(e, sp.roomId)}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold"
                          title="Remove from device shortcut list"
                        >
                          Remove
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(sp.roomId);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Remove shortcut from this device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Info & Mutual Deletion hint */}
        <div className="px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Permanent Storage Guarantee (Both must agree to delete)</span>
          </div>
          {onOpenMutualDeletion && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMutualDeletion();
              }}
              className="text-rose-500 hover:underline font-medium text-[11px] cursor-pointer"
            >
              Mutual Deletion
            </button>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Encrypted per-space keys stored locally</span>
            </div>
            {spaces.length > 0 && (
              <button
                type="button"
                id="btn-clear-all-saved-spaces"
                onClick={() => {
                  const empty = clearAllSavedSpaces();
                  setSpaces(empty);
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                title="Remove all saved spaces from this device"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Spaces</span>
              </button>
            )}
          </div>

          <button
            id="btn-join-another-space"
            onClick={() => {
              onClose();
              onOpenNewSpaceSetup();
            }}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create or Join Another Space</span>
          </button>
        </div>
      </div>
    </div>
  );
};

