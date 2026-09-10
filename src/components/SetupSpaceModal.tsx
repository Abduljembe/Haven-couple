import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShieldCheck,
  KeyRound,
  Sparkles,
  User,
  Users,
  Calendar,
  ArrowRight,
  Lock,
  PartyPopper,
  Gamepad2,
} from 'lucide-react';
import { CoupleSpaceConfig, SpaceType } from '../types';
import { generateRandomPasskey } from '../utils/crypto';
import { AvatarPicker } from './AvatarPicker';
import { DEFAULT_AVATARS } from '../utils/avatarUtils';
import { HavenLogo } from './HavenLogo';

interface SetupSpaceModalProps {
  onComplete: (config: CoupleSpaceConfig) => void;
  initialError?: string | null;
  onOpenSingles?: () => void;
}

export const SetupSpaceModal: React.FC<SetupSpaceModalProps> = ({ onComplete, initialError, onOpenSingles }) => {
  const [spaceType, setSpaceType] = useState<SpaceType>('couple');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState('🎉');
  const [roomId, setRoomId] = useState('');
  const [passkey, setPasskey] = useState('');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState(DEFAULT_AVATARS[0]);
  const [partnerName, setPartnerName] = useState('');
  const [partnerAvatar, setPartnerAvatar] = useState(DEFAULT_AVATARS[1]);
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [error, setError] = useState(initialError || '');

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  // Check URL params for pre-filled room and key
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      const urlKey = params.get('key');
      const urlType = params.get('type') as SpaceType | null;
      const urlAnniversary = params.get('since');
      const urlGroupName = params.get('group');
      const urlMode = params.get('mode');

      if (urlMode === 'singles' && onOpenSingles) {
        onOpenSingles();
      }

      if (urlType === 'friends') {
        setSpaceType('friends');
      }
      if (urlGroupName) {
        setGroupName(urlGroupName);
      }

      if (urlRoom) {
        setRoomId(urlRoom);
        setMode('join');
      } else {
        const prefix = spaceType === 'friends' ? 'squad' : 'haven';
        const randId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        setRoomId(randId);
      }

      if (urlKey) {
        setPasskey(urlKey);
      } else {
        setPasskey(generateRandomPasskey());
      }

      if (urlAnniversary) {
        setAnniversaryDate(urlAnniversary);
      }
    } catch {
      setRoomId(`haven-${Math.floor(1000 + Math.random() * 9000)}`);
      setPasskey(generateRandomPasskey());
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError('Please enter your name or nickname');
      return;
    }
    if (!roomId.trim()) {
      setError('Please provide a Room ID');
      return;
    }
    if (!passkey.trim()) {
      setError('Please provide an encryption secret passkey');
      return;
    }

    const defaultPartnerName =
      spaceType === 'friends'
        ? groupName.trim() || 'Squad Members'
        : mode === 'create'
        ? 'My Love'
        : 'Partner';

    const config: CoupleSpaceConfig = {
      roomId: roomId.trim().toLowerCase(),
      passkey: passkey.trim(),
      spaceType,
      groupName: spaceType === 'friends' ? groupName.trim() || 'Besties Squad' : undefined,
      groupEmoji: spaceType === 'friends' ? groupEmoji : '💖',
      userRole: mode === 'create' ? 'partner1' : 'partner2',
      userName: userName.trim(),
      userAvatar: userAvatar,
      partnerName: partnerName.trim() || defaultPartnerName,
      partnerAvatar: partnerAvatar,
      anniversaryDate: anniversaryDate || undefined,
      autoDeleteTimer: 0,
      isVerified: false,
    };

    // Save to local storage for quick reconnection
    try {
      localStorage.setItem('haven_couple_config', JSON.stringify(config));
    } catch {
      // ignore
    }

    onComplete(config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div
        id="setup-space-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Header Visual */}
        <div
          className={`relative px-6 pt-7 pb-6 text-white text-center overflow-hidden transition-colors ${
            spaceType === 'friends'
              ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500'
              : 'bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600'
          }`}
        >
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/10 blur-lg pointer-events-none" />

          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner mb-3">
            <HavenLogo
              size="lg"
              variant={spaceType === 'friends' ? 'friends' : 'couple'}
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight font-serif">
            {spaceType === 'friends' ? 'Haven for Friends & Squads' : 'Haven for Couples'}
          </h1>
          <p className="text-rose-100 text-sm mt-1 max-w-xs mx-auto">
            {spaceType === 'friends'
              ? 'Private party room with group games, watch parties, live soundboard, and encrypted chats!'
              : 'Your private sanctuary for encrypted chats, HD video calls, and romantic rituals.'}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-rose-100 text-xs font-medium backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Client-Side End-to-End Encrypted (AES-256-GCM)</span>
          </div>
        </div>

        {/* Space Type Selector (Couples vs Friends Squad) */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Choose Space Type
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                id="btn-select-couple-mode"
                onClick={() => {
                  setSpaceType('couple');
                  if (mode === 'create') setRoomId(`haven-${Math.floor(1000 + Math.random() * 9000)}`);
                }}
                className={`py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  spaceType === 'couple'
                    ? 'bg-white text-rose-600 shadow-sm border border-rose-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span>Couple Space</span>
              </button>
              <button
                type="button"
                id="btn-select-friends-mode"
                onClick={() => {
                  setSpaceType('friends');
                  if (mode === 'create') setRoomId(`squad-${Math.floor(1000 + Math.random() * 9000)}`);
                }}
                className={`py-2.5 px-3 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  spaceType === 'friends'
                    ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PartyPopper className="w-4 h-4 text-indigo-600" />
                <span>Friends & Squad 🎉</span>
              </button>
            </div>
            {spaceType === 'friends' && (
              <p className="text-[11px] text-indigo-700 bg-indigo-50/90 border border-indigo-200/70 rounded-xl p-2.5 mt-2.5 text-center font-medium">
                👥 <strong>Friends & Squad:</strong> Connect up to <strong>5 friends</strong> for group chat, synchronized music, and group audio/video conference calls!
              </p>
            )}

            {/* Singles Lounge Banner */}
            {onOpenSingles && (
              <div className="mt-3.5 p-3 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                      <span>Are you Single?</span>
                      <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[9px] font-extrabold uppercase tracking-wide shrink-0">
                        NEW
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600 truncate">
                      Register your profile, discover matches, or invite people!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-open-singles-lounge-from-setup"
                  onClick={onOpenSingles}
                  className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Enter Lounge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tab Toggle: Create vs Join */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-5">
            <button
              id="tab-create-space"
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'create'
                  ? spaceType === 'friends'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {spaceType === 'friends' ? 'Create Squad Room' : 'Create New Space'}
            </button>
            <button
              id="tab-join-space"
              type="button"
              onClick={() => setMode('join')}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                mode === 'join'
                  ? spaceType === 'friends'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {spaceType === 'friends' ? 'Join Squad Room' : "Join Partner's Space"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {error}
              </div>
            )}

            {/* If Friends Squad: Group Name & Emoji */}
            {spaceType === 'friends' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Squad / Hangout Name
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="input-squad-name"
                      type="text"
                      placeholder="e.g. The Chaos Club, Friday Gamers, Besties"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <select
                    value={groupEmoji}
                    onChange={(e) => setGroupEmoji(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg cursor-pointer focus:outline-none focus:border-indigo-500"
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

            {/* User Details */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Nickname
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="input-user-name"
                  type="text"
                  required
                  placeholder="e.g. Alex, Sam, Jordan"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Avatar Picker */}
            <AvatarPicker
              label="Your Profile Photo / Avatar"
              idPrefix="setup-user"
              currentAvatar={userAvatar}
              onChange={(newAvatar) => setUserAvatar(newAvatar)}
            />

            {/* Partner Name (Only if Couple Space) */}
            {spaceType === 'couple' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Partner's Name / Pet Name (Optional)
                </label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="input-partner-name"
                    type="text"
                    placeholder="e.g. Maya, My Queen, Sweetheart"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Space ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Room Code / ID
              </label>
              <div className="relative">
                <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="input-room-id"
                  type="text"
                  required
                  placeholder="e.g. squad-friday-hangout"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {spaceType === 'friends'
                  ? 'Share this Room Code and Passkey with any number of friends to let them join!'
                  : 'Share this Room Code with your partner so they can join your private space.'}
              </p>
            </div>

            {/* Secret Passkey (Encryption Key) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Secret Room Passkey (E2EE Key)
                </label>
                <button
                  type="button"
                  onClick={() => setPasskey(generateRandomPasskey())}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                >
                  Generate New
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="input-passkey"
                  type="text"
                  required
                  placeholder="e.g. secret-squad-pass-777"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                />
              </div>
              <div className="flex items-start gap-1.5 mt-1.5 p-2 bg-amber-50/70 border border-amber-100 rounded-lg text-[11px] text-amber-800">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  This passkey is used on client devices to encrypt all chat messages, drawings, and media.
                </span>
              </div>
            </div>

            {/* Anniversary Date (Optional for Couples) */}
            {spaceType === 'couple' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Relationship Start Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="input-anniversary-date"
                    type="date"
                    value={anniversaryDate}
                    onChange={(e) => setAnniversaryDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="btn-enter-space"
                type="submit"
                className={`w-full py-3.5 px-6 rounded-2xl text-white font-semibold text-sm shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  spaceType === 'friends'
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-indigo-500/25 hover:shadow-indigo-500/40'
                    : 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 shadow-rose-500/25 hover:shadow-rose-500/40'
                }`}
              >
                <span>
                  {mode === 'create'
                    ? spaceType === 'friends'
                      ? 'Launch Friends Hangout Room 🚀'
                      : 'Create & Enter Our Space'
                    : spaceType === 'friends'
                    ? 'Join Squad Hangout 🎉'
                    : 'Connect to Our Space'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
