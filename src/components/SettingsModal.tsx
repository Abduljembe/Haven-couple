import React, { useState } from 'react';
import {
  X,
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
} from 'lucide-react';
import { CoupleSpaceConfig } from '../types';
import { AvatarPicker } from './AvatarPicker';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CoupleSpaceConfig;
  roomMembers?: import('../types').UserProfile[];
  onUpdateConfig: (updated: Partial<CoupleSpaceConfig>) => void;
  onWipeHistory: () => void;
  onLeaveSpace: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  roomMembers = [],
  onUpdateConfig,
  onWipeHistory,
  onLeaveSpace,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div 
        id="settings-modal-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 fill-white" />
            <h2 className="text-lg font-bold font-serif">Space Settings & Invite</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
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

            {/* Anniversary Date */}
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
          </div>

          {/* Danger Zone: Wipe Chat / Leave Space */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Privacy Controls
            </h3>

            {confirmWipe ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Permanently wipe chat history?</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  This will delete all encrypted messages for both you and your partner. This cannot be undone.
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

            <button
              onClick={onLeaveSpace}
              className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave / Switch Space</span>
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
