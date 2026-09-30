import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Camera,
  Pencil,
  Eye,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  Smile,
  Palette,
  Image as ImageIcon,
  MessageCircle,
  Clock,
  Sparkles,
  Heart,
  Flame,
  Check,
} from 'lucide-react';
import { FriendStatus, UserProfile, StatusComment } from '../types';
import { triggerHaptic } from '../utils/haptics';

export interface HavenStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name: string;
    avatar: string;
  };
  statuses: FriendStatus[];
  onPostStatus: (data: {
    type: 'text' | 'image';
    text?: string;
    color?: string;
    mediaUrl?: string;
    caption?: string;
  }) => void;
  onDeleteStatus: (statusId: string) => void;
  onViewStatus: (statusId: string) => void;
  onAddComment: (statusId: string, commentText: string) => void;
  initialViewStatusId?: string | null;
  isDark?: boolean;
}

const STATUS_COLORS = [
  '#00a884', // Haven Emerald
  '#111b21', // Haven Dark Slate
  '#e11d48', // Crimson Rose
  '#4f46e5', // Royal Indigo
  '#7c3aed', // Vibrant Purple
  '#d97706', // Amber Sunset
  '#0891b2', // Ocean Cyan
  '#be185d', // Deep Magenta
];

const EMOJI_REACTIONS = ['😍', '😂', '😮', '😢', '🙏', '👏', '🔥', '❤️'];

export const HavenStatusModal: React.FC<HavenStatusModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  statuses,
  onPostStatus,
  onDeleteStatus,
  onViewStatus,
  onAddComment,
  initialViewStatusId = null,
  isDark = false,
}) => {
  // Mode: 'list' (Updates tab), 'create_text', 'create_photo', 'viewer'
  const [mode, setMode] = useState<'list' | 'create_text' | 'create_photo' | 'viewer'>('list');

  // Creator state
  const [statusText, setStatusText] = useState('');
  const [statusColor, setStatusColor] = useState(STATUS_COLORS[0]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Viewer state
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [viewingStatusesList, setViewingStatusesList] = useState<FriendStatus[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [commentInput, setCommentInput] = useState('');
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active (unexpired) statuses within 24h
  const now = Date.now();
  const validStatuses = statuses.filter((s) => s.expiresAt > now);

  const myStatuses = validStatuses.filter((s) => s.userId === currentUser.id);
  const friendsStatuses = validStatuses.filter((s) => s.userId !== currentUser.id);

  // Group friends' statuses by user
  const groupedFriendsStatuses: Record<string, FriendStatus[]> = {};
  friendsStatuses.forEach((s) => {
    if (!groupedFriendsStatuses[s.userId]) {
      groupedFriendsStatuses[s.userId] = [];
    }
    groupedFriendsStatuses[s.userId].push(s);
  });

  // Separate viewed vs unviewed
  const unviewedFriends: Array<{ user: { id: string; name: string; avatar: string }; statuses: FriendStatus[] }> = [];
  const viewedFriends: Array<{ user: { id: string; name: string; avatar: string }; statuses: FriendStatus[] }> = [];

  Object.values(groupedFriendsStatuses).forEach((userStatuses) => {
    const sorted = [...userStatuses].sort((a, b) => b.timestamp - a.timestamp);
    const first = sorted[0];
    const user = { id: first.userId, name: first.userName, avatar: first.userAvatar };
    const allViewed = sorted.every((s) => s.viewers?.includes(currentUser.id));
    if (allViewed) {
      viewedFriends.push({ user, statuses: sorted });
    } else {
      unviewedFriends.push({ user, statuses: sorted });
    }
  });

  // Open directly into viewer if initialViewStatusId is passed
  useEffect(() => {
    if (isOpen && initialViewStatusId) {
      const target = validStatuses.find((s) => s.id === initialViewStatusId);
      if (target) {
        // Collect all statuses of this user
        const userStatuses = validStatuses.filter((s) => s.userId === target.userId);
        const idx = userStatuses.findIndex((s) => s.id === target.id);
        setViewingStatusesList(userStatuses);
        setActiveStatusIndex(idx >= 0 ? idx : 0);
        setMode('viewer');
        onViewStatus(target.id);
      }
    } else if (isOpen) {
      setMode('list');
    }
  }, [isOpen, initialViewStatusId]);

  // Story Progress Auto-Advance Timer (5 seconds per slide)
  useEffect(() => {
    if (mode !== 'viewer' || isPaused || showCommentsDrawer) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Advance to next status
          handleNextStatus();
          return 0;
        }
        return prev + 2; // 50 ticks * 100ms = 5000ms
      });
    }, 100);

    return () => clearInterval(interval);
  }, [mode, isPaused, activeStatusIndex, viewingStatusesList, showCommentsDrawer]);

  const currentViewingStatus: FriendStatus | undefined = viewingStatusesList[activeStatusIndex];

  // Mark status as viewed when it appears
  useEffect(() => {
    if (mode === 'viewer' && currentViewingStatus) {
      setProgress(0);
      onViewStatus(currentViewingStatus.id);
    }
  }, [activeStatusIndex, mode, currentViewingStatus?.id]);

  const handleNextStatus = () => {
    if (activeStatusIndex < viewingStatusesList.length - 1) {
      setActiveStatusIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      // Exit viewer
      setMode('list');
      setProgress(0);
    }
  };

  const handlePrevStatus = () => {
    if (activeStatusIndex > 0) {
      setActiveStatusIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const openUserStatusViewer = (userStatuses: FriendStatus[]) => {
    if (userStatuses.length === 0) return;
    setViewingStatusesList(userStatuses);
    // Start with the first unviewed, or 0
    const unviewedIdx = userStatuses.findIndex((s) => !s.viewers?.includes(currentUser.id));
    setActiveStatusIndex(unviewedIdx >= 0 ? unviewedIdx : 0);
    setMode('viewer');
    triggerHaptic('light');
  };

  // Submit Text Status
  const handlePostTextStatus = () => {
    if (!statusText.trim()) return;
    onPostStatus({
      type: 'text',
      text: statusText.trim(),
      color: statusColor,
    });
    setStatusText('');
    setMode('list');
    triggerHaptic('success');
    showToast('Status posted successfully! ✨');
  };

  // Submit Photo Status
  const handlePostPhotoStatus = () => {
    if (!photoUrl) return;
    onPostStatus({
      type: 'image',
      mediaUrl: photoUrl,
      caption: photoCaption.trim() || undefined,
    });
    setPhotoUrl(null);
    setPhotoCaption('');
    setMode('list');
    triggerHaptic('success');
    showToast('Photo status posted! 📸');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result as string);
        setMode('create_photo');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendComment = (textToSend?: string) => {
    const text = textToSend || commentInput;
    if (!text.trim() || !currentViewingStatus) return;

    onAddComment(currentViewingStatus.id, text.trim());
    setCommentInput('');
    triggerHaptic('medium');
    showToast('Comment sent! 💬');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const formatStatusTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    const isToday = new Date().toDateString() === date.toDateString();
    return `${isToday ? 'Today' : 'Yesterday'} at ${hours}:${mins}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 select-none font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-6 z-50 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-xl animate-in slide-in-from-top-3 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Image Status */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* ========================================================================= */}
      {/* 1. STATUS LIST / UPDATES OVERVIEW (Haven Style)                           */}
      {/* ========================================================================= */}
      {mode === 'list' && (
        <div className="relative w-full max-w-lg h-[90vh] max-h-[720px] bg-white dark:bg-[#111b21] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
          {/* Header Bar */}
          <div className="px-5 py-4 bg-[#008069] dark:bg-[#202c33] text-white flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">Status & Stories</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-medium">Haven Updates</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/90 hover:text-white cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* MY STATUS CARD */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  My Status
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusText('');
                      setStatusColor(STATUS_COLORS[0]);
                      setMode('create_text');
                    }}
                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    title="Write a text status"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white transition-colors cursor-pointer shadow-xs"
                    title="Add a photo status"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {myStatuses.length === 0 ? (
                /* Empty My Status Banner */
                <div
                  onClick={() => {
                    setStatusText('');
                    setMode('create_text');
                  }}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#202c33]/70 hover:bg-slate-100 dark:hover:bg-[#202c33] border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00a884] text-white flex items-center justify-center border-2 border-white dark:border-[#111b21] shadow-xs">
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">My Status</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Tap to add status update</p>
                  </div>
                </div>
              ) : (
                /* My Existing Status */
                <div className="space-y-2">
                  {myStatuses.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#202c33]/70 border border-slate-200 dark:border-slate-800"
                    >
                      <div
                        onClick={() => openUserStatusViewer(myStatuses)}
                        className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                      >
                        <div className="w-12 h-12 rounded-full p-0.5 ring-2 ring-[#00a884] ring-offset-2 ring-offset-white dark:ring-offset-[#111b21] shrink-0">
                          {st.type === 'text' ? (
                            <div
                              style={{ backgroundColor: st.color || '#00a884' }}
                              className="w-full h-full rounded-full flex items-center justify-center text-white text-[10px] font-bold overflow-hidden p-1 text-center"
                            >
                              {st.text?.slice(0, 10)}...
                            </div>
                          ) : (
                            <img
                              src={st.mediaUrl}
                              alt="My status"
                              className="w-full h-full rounded-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">My status</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{formatStatusTime(st.timestamp)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[#00a884]">
                              <Eye className="w-3 h-3" />
                              <span>{st.viewers?.length || 0} views</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteStatus(st.id);
                          showToast('Status deleted');
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition cursor-pointer"
                        title="Delete status"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RECENT UPDATES (FRIENDS' STATUSES) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recent Updates ({unviewedFriends.length})
                </span>
              </div>

              {unviewedFriends.length === 0 ? (
                <div className="p-4 text-center rounded-2xl bg-slate-50/70 dark:bg-[#202c33]/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  No new status updates from your friends right now.
                </div>
              ) : (
                <div className="space-y-2">
                  {unviewedFriends.map(({ user, statuses: uStatuses }) => {
                    const latest = uStatuses[0];
                    return (
                      <div
                        key={user.id}
                        onClick={() => openUserStatusViewer(uStatuses)}
                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#202c33] transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          {/* Vibrant Haven Green Story Ring */}
                          <div className="relative w-12 h-12 rounded-full p-0.5 ring-2 ring-[#00a884] ring-offset-2 ring-offset-white dark:ring-offset-[#111b21] shrink-0 animate-pulse">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                            {uStatuses.length > 1 && (
                              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#00a884] text-white text-[9px] font-bold rounded-full border border-white dark:border-[#111b21]">
                                {uStatuses.length}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#00a884] transition-colors">
                              {user.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {formatStatusTime(latest.timestamp)}
                            </p>
                          </div>
                        </div>

                        {latest.comments && latest.comments.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-[#00a884] font-medium bg-[#00a884]/10 px-2 py-0.5 rounded-full">
                            <MessageCircle className="w-3 h-3" />
                            <span>{latest.comments.length}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* VIEWED UPDATES */}
            {viewedFriends.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">
                  Viewed Updates ({viewedFriends.length})
                </span>
                <div className="space-y-2 opacity-80 hover:opacity-100 transition-opacity">
                  {viewedFriends.map(({ user, statuses: uStatuses }) => {
                    const latest = uStatuses[0];
                    return (
                      <div
                        key={user.id}
                        onClick={() => openUserStatusViewer(uStatuses)}
                        className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#202c33] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          {/* Grey viewed story ring */}
                          <div className="relative w-12 h-12 rounded-full p-0.5 ring-2 ring-slate-300 dark:ring-slate-700 ring-offset-2 ring-offset-white dark:ring-offset-[#111b21] shrink-0">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {user.name}
                            </h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              {formatStatusTime(latest.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CREATE TEXT STATUS (Full screen colored canvas like Haven)             */}
      {/* ========================================================================= */}
      {mode === 'create_text' && (
        <div
          style={{ backgroundColor: statusColor }}
          className="relative w-full max-w-lg h-[90vh] max-h-[720px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-6 transition-colors duration-300 animate-in zoom-in-95 text-white"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between z-10">
            <button
              onClick={() => setMode('list')}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
              title="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              {/* Color Swatch Picker */}
              <button
                type="button"
                onClick={() => {
                  const nextIdx = (STATUS_COLORS.indexOf(statusColor) + 1) % STATUS_COLORS.length;
                  setStatusColor(STATUS_COLORS[nextIdx]);
                  triggerHaptic('light');
                }}
                className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
                title="Change background color"
              >
                <Palette className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Centered Large Textarea */}
          <div className="my-auto text-center px-4">
            <textarea
              autoFocus
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="Type a status..."
              maxLength={280}
              rows={4}
              className="w-full bg-transparent text-white placeholder-white/60 text-2xl sm:text-3xl font-bold text-center resize-none outline-none leading-relaxed"
            />
            <span className="text-xs text-white/60 block mt-2 font-mono">
              {statusText.length}/280
            </span>
          </div>

          {/* Bottom Floating Bar */}
          <div className="flex items-center justify-between z-10 pt-4">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {['❤️', '🎉', '🔥', '✨', '🥰', '☕', '🌟'].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setStatusText((prev) => prev + em)}
                  className="text-2xl p-1 hover:scale-125 transition-transform cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>

            <button
              type="button"
              id="btn-submit-text-status"
              onClick={handlePostTextStatus}
              disabled={!statusText.trim()}
              className="w-13 h-13 rounded-full bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Post status"
            >
              <Send className="w-5 h-5 text-[#00a884]" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CREATE PHOTO STATUS (Image Preview & Caption)                          */}
      {/* ========================================================================= */}
      {mode === 'create_photo' && photoUrl && (
        <div className="relative w-full max-w-lg h-[90vh] max-h-[720px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between bg-black text-white animate-in zoom-in-95">
          {/* Top Bar */}
          <div className="p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/70 to-transparent">
            <button
              onClick={() => {
                setPhotoUrl(null);
                setMode('list');
              }}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold">Photo Preview</span>
          </div>

          {/* Photo Main Image */}
          <div className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden">
            <img
              src={photoUrl}
              alt="Preview"
              className="max-h-full max-w-full object-contain rounded-xl"
            />
          </div>

          {/* Caption Input & Send FAB */}
          <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-10">
            <div className="flex items-center gap-2 bg-[#202c33] rounded-full px-4 py-2 border border-slate-700">
              <input
                type="text"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={120}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-400"
              />
              <button
                type="button"
                onClick={handlePostPhotoStatus}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shrink-0 shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FULL-SCREEN STATUS VIEWER WITH COMMENTING (Haven Story Mode)           */}
      {/* ========================================================================= */}
      {mode === 'viewer' && currentViewingStatus && (
        <div
          className="relative w-full max-w-lg h-[92vh] max-h-[760px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between bg-black text-white select-none animate-in zoom-in-95"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          {/* Top Segmented Progress Bars */}
          <div className="absolute top-0 left-0 right-0 p-3 z-30 flex items-center gap-1.5 bg-gradient-to-b from-black/80 to-transparent">
            {viewingStatusesList.map((_, idx) => (
              <div
                key={idx}
                className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
              >
                <div
                  style={{
                    width:
                      idx < activeStatusIndex
                        ? '100%'
                        : idx === activeStatusIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                  className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                />
              </div>
            ))}
          </div>

          {/* User Info Header Bar */}
          <div className="relative pt-6 px-4 pb-2 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-3">
              <img
                src={currentViewingStatus.userAvatar}
                alt={currentViewingStatus.userName}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/80"
              />
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">
                  {currentViewingStatus.userName}
                  {currentViewingStatus.userId === currentUser.id && ' (You)'}
                </h3>
                <span className="text-[11px] text-white/70 font-mono">
                  {formatStatusTime(currentViewingStatus.timestamp)}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setMode('list');
                setProgress(0);
              }}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tap Left / Right Zones to Navigate Slides */}
          <div className="absolute inset-0 z-10 flex">
            <div
              className="w-1/3 h-full cursor-pointer"
              onClick={handlePrevStatus}
            />
            <div
              className="w-1/3 h-full cursor-default"
              onClick={() => setIsPaused((prev) => !prev)}
            />
            <div
              className="w-1/3 h-full cursor-pointer"
              onClick={handleNextStatus}
            />
          </div>

          {/* STATUS MAIN CONTENT */}
          <div className="flex-1 flex items-center justify-center p-6 relative z-15 min-h-0">
            {currentViewingStatus.type === 'text' ? (
              <div
                style={{ backgroundColor: currentViewingStatus.color || '#00a884' }}
                className="w-full h-full rounded-2xl flex flex-col items-center justify-center p-6 shadow-inner text-center"
              >
                <p className="text-2xl sm:text-3xl font-bold text-white leading-relaxed break-words max-w-sm">
                  {currentViewingStatus.text}
                </p>
              </div>
            ) : (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img
                  src={currentViewingStatus.mediaUrl}
                  alt="Status"
                  className="max-h-full max-w-full object-contain rounded-2xl"
                />
                {currentViewingStatus.caption && (
                  <div className="absolute bottom-4 left-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-xl text-center text-sm font-medium">
                    {currentViewingStatus.caption}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* COMMENTS DRAWER / POPUP */}
          {showCommentsDrawer && (
            <div
              className="absolute inset-x-0 bottom-0 max-h-[60%] z-40 bg-[#1f2c34] rounded-t-3xl p-4 flex flex-col border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-[#00a884]" />
                  <span>Comments ({currentViewingStatus.comments?.length || 0})</span>
                </span>
                <button
                  onClick={() => setShowCommentsDrawer(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-48 pr-1">
                {(!currentViewingStatus.comments || currentViewingStatus.comments.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  currentViewingStatus.comments.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/80 text-xs"
                    >
                      <img
                        src={c.userAvatar}
                        alt={c.userName}
                        className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-200 truncate">{c.userName}</span>
                          <span className="text-[10px] text-slate-400">{formatStatusTime(c.timestamp)}</span>
                        </div>
                        <p className="text-slate-300 mt-0.5 break-words">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* BOTTOM REPLY / COMMENT BAR (Haven Style) */}
          <div
            className="relative z-30 p-3 sm:p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Emoji Reaction Pill Bar */}
            <div className="flex items-center justify-center gap-2">
              {EMOJI_REACTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => handleSendComment(em)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-125 text-base flex items-center justify-center transition-all cursor-pointer"
                  title={`React with ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>

            {/* Comment Input */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[#202c33]/90 backdrop-blur-md rounded-full px-4 py-2 border border-slate-700 focus-within:border-[#00a884]">
                <input
                  type="text"
                  value={commentInput}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder={`Reply to ${currentViewingStatus.userName}...`}
                  className="flex-1 bg-transparent text-white text-xs sm:text-sm outline-none placeholder-slate-400"
                />

                {currentViewingStatus.comments && currentViewingStatus.comments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCommentsDrawer((prev) => !prev)}
                    className="p-1 text-slate-400 hover:text-[#00a884] flex items-center gap-1 text-xs cursor-pointer"
                    title="View existing comments"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{currentViewingStatus.comments.length}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                id="btn-send-status-comment"
                onClick={() => handleSendComment()}
                disabled={!commentInput.trim()}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-40 text-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer shrink-0"
                title="Send reply to chat"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const WhatsAppStatusModal = HavenStatusModal;
export type WhatsAppStatusModalProps = HavenStatusModalProps;
