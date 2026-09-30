import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Copy,
  Check,
  Heart,
  Share2,
  Calendar,
  Trash2,
  Lock,
  Sparkles,
  LogOut,
  User,
  Users,
  ShieldCheck,
  AlertTriangle,
  Bell,
  BellRing,
} from 'lucide-react';
import { CoupleSpaceConfig, PendingSpaceDeletion } from '../types';
import { AvatarPicker } from './AvatarPicker';
import { PWAInstallButton } from './PWAInstallButton';
import { getNotificationPermission, requestPushPermission, sendPushNotification } from '../utils/notifications';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CoupleSpaceConfig;
  roomMembers?: import('../types').UserProfile[];
  onUpdateConfig: (updated: Partial<CoupleSpaceConfig>) => void;
  onWipeHistory: () => void;
  onLeaveSpace: () => void;
  onOpenSpacesManager?: () => void;
  onOpenMutualDeletion?: () => void;
  pendingDeletion?: PendingSpaceDeletion | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  roomMembers = [],
  onUpdateConfig,
  onWipeHistory,
  onLeaveSpace,
  onOpenSpacesManager,
  onOpenMutualDeletion,
  pendingDeletion,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [userName, setUserName] = useState(config.userName);
  const [userAvatar, setUserAvatar] = useState(config.userAvatar);
  const [groupName, setGroupName] = useState(config.groupName || '');
  const [groupEmoji, setGroupEmoji] = useState(config.groupEmoji || '🎉');
  const [partnerName, setPartnerName] = useState(config.partnerName);
  const [partnerAvatar, setPartnerAvatar] = useState(config.partnerAvatar);
  const [anniversaryDate, setAnniversaryDate] = useState(config.anniversaryDate || '');
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [notificationPerm, setNotificationPerm] = useState(getNotificationPermission());
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setNotificationPerm(getNotificationPermission());
    if (granted) {
      await sendPushNotification({
        title: 'Haven Notifications Activated 💕',
        body: 'You will now receive incoming call rings and messages even when your phone is locked!',
        tag: 'haven-welcome-push',
      });
      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);
    }
  };

  const handleTestPush = async () => {
    await sendPushNotification({
      title: 'Haven Ring Test 🔔',
      body: 'Lock-screen and background push notification working perfectly!',
      tag: 'haven-test',
    });
    setTestNotificationSent(true);
    setTimeout(() => setTestNotificationSent(false), 3000);
  };

  if (!isOpen) return null;

  const isFriends = config.spaceType === 'friends';

  // Generate invite link with room and secret passkey
  const generateInviteLink = () => {
    const origin = window.location.origin;
    const url = new URL(origin);
    url.searchParams.set('room', config.roomId);
    url.searchParams.set('key', config.passkey);
    if (isFriends) {
      url.searchParams.set('type', 'friends');
      if (groupName) url.searchParams.set('group', groupName);
    } else if (anniversaryDate) {
      url.searchParams.set('since', anniversaryDate);
    }
    return url.toString();
  };

  const handleCopyLink = () => {
    const link = generateInviteLink();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(
      `Room Code: ${config.roomId}\nSecret Passkey: ${config.passkey}`
    );
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveProfile = () => {
    onUpdateConfig({
      userName: userName.trim() || config.userName,
      userAvatar: userAvatar || config.userAvatar,
      groupName: isFriends ? groupName.trim() || config.groupName : undefined,
      groupEmoji: isFriends ? groupEmoji : undefined,
      partnerName: partnerName.trim() || config.partnerName,
      partnerAvatar: partnerAvatar || config.partnerAvatar,
      anniversaryDate: anniversaryDate || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div 
        id="settings-modal-card"
        className="w-full max-w-lg bg-white rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className={`relative px-4 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0 sticky top-0 z-20 ${
          isFriends ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700' : 'bg-gradient-to-r from-rose-500 to-pink-500'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven-Style Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-settings-mobile-back"
              className="p-1.5 -ml-1 text-white hover:bg-white/20 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs shrink-0">
              {isFriends ? (
                <Users className="w-5 h-5 text-white" />
              ) : (
                <Heart className="w-5 h-5 fill-white text-white" />
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold font-serif truncate">
              {isFriends ? 'Squad Settings & Invite' : 'Space Settings & Invite'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Invite Box */}
          <div className={`${isFriends ? 'bg-indigo-50/70 border-indigo-100' : 'bg-rose-50/70 border-rose-100'} border rounded-2xl p-4`}>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm mb-1">
              <Share2 className={`w-4 h-4 ${isFriends ? 'text-indigo-600' : 'text-rose-600'}`} />
              <span>{isFriends ? 'Invite Friends to Squad Hangout' : 'Invite Your Partner'}</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              {isFriends
                ? 'Send this 1-click link to your friends. Anyone with this link can join the private voice/video lounge and play party games!'
                : 'Send this 1-click link to your partner. It automatically configures the private room and encryption key on their device.'}
            </p>

            <div className="flex items-center gap-2">
              <button
                id="btn-copy-invite-link"
                onClick={handleCopyLink}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  isFriends
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy 1-Click Invite Link'}</span>
              </button>

              <button
                id="btn-copy-room-codes"
                onClick={handleCopyCode}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
                title="Copy Room & Key Credentials"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block">Room Code:</span>
                <span className="font-semibold text-slate-800">{config.roomId}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Encryption Passkey:</span>
                <span className="font-semibold text-slate-800 truncate block">{config.passkey}</span>
              </div>
            </div>
          </div>

          {/* Active Members in Room */}
          {roomMembers.length > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Active Squad Members ({roomMembers.length}/5)</span>
                </h4>
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  {roomMembers.length < 5 ? `${5 - roomMembers.length} slots open` : 'Squad Full (5/5)'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {roomMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs text-xs text-slate-800"
                  >
                    <img src={m.avatar} alt={m.name} className="w-4 h-4 rounded-full object-cover" />
                    <span className="font-medium">{m.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile & Pet Names */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isFriends ? 'Your Profile & Squad Details' : 'Names & Love Profile'}
            </h3>

            {isFriends && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Squad Hangout Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. Chaos Crew, Friday Gamers"
                  />
                  <select
                    value={groupEmoji}
                    onChange={(e) => setGroupEmoji(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base cursor-pointer focus:outline-none"
                  >
                    <option value="🎉">🎉 Party</option>
                    <option value="🎮">🎮 Gaming</option>
                    <option value="🍕">🍕 Chill</option>
                    <option value="🚀">🚀 Squad</option>
                    <option value="🌟">🌟 Stars</option>
                    <option value="🎧">🎧 Music</option>
                    <option value="🍿">🍿 Movie</option>
                    <option value="💖">💖 Love</option>
                  </select>
                </div>
              </div>
            )}

            {/* User Avatar Picker */}
            <AvatarPicker
              label="Your Profile Photo / Avatar"
              idPrefix="settings-user"
              currentAvatar={userAvatar}
              onChange={(newAv) => setUserAvatar(newAv)}
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Your Nickname
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {!isFriends && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Partner's Nickname
                </label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
            )}

            {/* Anniversary Date (Only in Couple Space) */}
            {!isFriends && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Relationship Start Date / Anniversary
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={anniversaryDate}
                    onChange={(e) => setAnniversaryDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Web Push & Lock Screen Notifications */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-rose-500" />
                <span>Web Push & Lock-Screen Alerts</span>
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                notificationPerm === 'granted'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {notificationPerm === 'granted' ? 'Active 🔔' : 'Not Enabled'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-purple-500/10 border border-rose-500/20 space-y-2.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Receive real-time incoming call rings and messages even when Haven is minimized, in the background, or your phone screen is locked.
              </p>

              <div className="flex items-center gap-2">
                {notificationPerm !== 'granted' ? (
                  <button
                    type="button"
                    id="btn-enable-push-notifications"
                    onClick={handleEnablePush}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Enable Lock-Screen Alerts</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    id="btn-test-push-notifications"
                    onClick={handleTestPush}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <BellRing className="w-3.5 h-3.5 text-rose-400" />
                    <span>{testNotificationSent ? 'Test Alert Sent! 🔔' : 'Send Test Notification'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Install Application (PWA) */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Application & Mobile
            </h3>
            <PWAInstallButton variant="full" />
          </div>

          {/* Space Deletion & Privacy Controls */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Space Privacy & Permanence
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Indefinite Storage 🟢
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800 mb-1">
                🔒 Permanent Space Guarantee:
              </p>
              <p>
                {isFriends ? (
                  'All shared photos, messages, voice notes, and canvas memories in this squad hangout are saved indefinitely.'
                ) : (
                  <>
                    All shared photos, messages, voice notes, and canvas memories in this room are saved indefinitely. To protect your memories, a space can <span className="font-bold text-rose-600">only be permanently deleted if both members mutually agree</span>.
                  </>
                )}
              </p>
            </div>

            {/* Mutual Permanent Deletion Button (Couple Space Only, never on Friends setting) */}
            {onOpenMutualDeletion && !isFriends && (
              <button
                type="button"
                id="btn-open-mutual-deletion-settings"
                onClick={() => {
                  onClose();
                  onOpenMutualDeletion();
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                  pendingDeletion && pendingDeletion.status === 'pending'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md animate-pulse'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span className="font-bold">
                    {pendingDeletion && pendingDeletion.status === 'pending'
                      ? '⚠️ Deletion Pending Agreement (Click to review)'
                      : 'Permanently Delete Space (Mutual Agreement)'}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold opacity-80">
                  {pendingDeletion ? 'Review' : 'Requires Both'}
                </span>
              </button>
            )}

            {confirmWipe ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Permanently wipe chat history?</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  {isFriends
                    ? 'This will delete all encrypted messages for everyone in this squad hangout. This cannot be undone.'
                    : 'This will delete all encrypted messages for both you and your partner. This cannot be undone.'}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      onWipeHistory();
                      setConfirmWipe(false);
                      onClose();
                    }}
                    className="flex-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
                  >
                    Yes, Wipe Everything
                  </button>
                  <button
                    onClick={() => setConfirmWipe(false)}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmWipe(true)}
                className="w-full py-2.5 px-4 bg-slate-50 hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Wipe Space Messages</span>
              </button>
            )}

            {onOpenSpacesManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSpacesManager();
                }}
                className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-indigo-500" />
                <span>Switch to Another Space</span>
              </button>
            )}

            <button
              onClick={onLeaveSpace}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Current Space</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveProfile}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
