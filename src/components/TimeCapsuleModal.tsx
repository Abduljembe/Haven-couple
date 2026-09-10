import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  Unlock,
  Sparkles,
  Calendar,
  Heart,
  Plus,
  Clock,
  Send,
  Eye,
  Gift,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { TimeCapsuleLetter, UnlockConditionType, UserProfile } from '../types';
import { encryptText, decryptText } from '../utils/crypto';

interface TimeCapsuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  letters: TimeCapsuleLetter[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  partner: UserProfile | null;
  partnerName: string;
  cryptoKey: CryptoKey | null;
  onSendLetter: (letter: TimeCapsuleLetter) => void;
  onUnlockLetter: (letterId: string) => void;
}

const PRESET_CONDITIONS: { label: string; conditionType: UnlockConditionType; prompt: string; icon: string }[] = [
  { label: 'When you miss me', conditionType: 'mood', prompt: 'Open when you are missing me late at night', icon: '🥺' },
  { label: 'On our next anniversary', conditionType: 'date', prompt: 'Open on our anniversary celebration', icon: '💍' },
  { label: 'When you feel stressed or down', conditionType: 'mood', prompt: 'Open when you need a warm embrace and reminder of my love', icon: '🫂' },
  { label: 'When we have a disagreement', conditionType: 'mood', prompt: 'Open when we argue to remember what matters most', icon: '🕊️' },
  { label: 'On your birthday', conditionType: 'date', prompt: 'Open on your birthday morning', icon: '🎂' },
  { label: 'When you achieve something big', conditionType: 'milestone', prompt: 'Open when you hit a goal you worked hard for', icon: '🥂' },
];

const WAX_SEALS = [
  { color: '#e11d48', label: 'Ruby Red', emoji: '💌' },
  { color: '#a855f7', label: 'Royal Purple', emoji: '✨' },
  { color: '#f59e0b', label: 'Warm Gold', emoji: '👑' },
  { color: '#0ea5e9', label: 'Ocean Sky', emoji: '🌊' },
  { color: '#10b981', label: 'Emerald Mint', emoji: '🌿' },
  { color: '#ec4899', label: 'Rose Gold', emoji: '💖' },
];

export const TimeCapsuleModal: React.FC<TimeCapsuleModalProps> = ({
  isOpen,
  onClose,
  letters,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partner,
  partnerName,
  cryptoKey,
  onSendLetter,
  onUnlockLetter,
}) => {
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'compose'>('received');
  
  // Compose State
  const [letterTitle, setLetterTitle] = useState('');
  const [letterText, setLetterText] = useState('');
  const [conditionType, setConditionType] = useState<UnlockConditionType>('mood');
  const [unlockPrompt, setUnlockPrompt] = useState('Open when you miss me');
  const [targetDate, setTargetDate] = useState('');
  const [selectedSeal, setSelectedSeal] = useState(WAX_SEALS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reading / Unlocking State
  const [readingLetter, setReadingLetter] = useState<TimeCapsuleLetter | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isUnsealingAnimation, setIsUnsealingAnimation] = useState(false);

  // Filter letters
  const receivedLetters = letters.filter((l) => l.senderId !== currentUserId);
  const sentLetters = letters.filter((l) => l.senderId === currentUserId);

  // Decrypt letter content when selected
  useEffect(() => {
    if (!readingLetter || !cryptoKey) {
      setDecryptedText(null);
      return;
    }

    if (readingLetter.isUnlocked || readingLetter.senderId === currentUserId) {
      setIsDecrypting(true);
      decryptText(
        readingLetter.encryptedContent.ciphertext,
        readingLetter.encryptedContent.iv,
        cryptoKey
      )
        .then((text) => {
          setDecryptedText(text);
          setIsDecrypting(false);
        })
        .catch(() => {
          setDecryptedText('Could not decrypt message payload.');
          setIsDecrypting(false);
        });
    } else {
      setDecryptedText(null);
    }
  }, [readingLetter, cryptoKey, currentUserId]);

  const handleSelectPreset = (preset: typeof PRESET_CONDITIONS[0]) => {
    setConditionType(preset.conditionType);
    setUnlockPrompt(preset.prompt);
  };

  const handleCreateLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterTitle.trim() || !letterText.trim() || !cryptoKey) return;

    setIsSubmitting(true);
    try {
      const encrypted = await encryptText(letterText.trim(), cryptoKey);
      
      const newLetter: TimeCapsuleLetter = {
        id: `capsule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        senderId: currentUserId,
        senderName: currentUserName,
        senderAvatar: currentUserAvatar,
        title: letterTitle.trim(),
        conditionType,
        unlockPrompt: unlockPrompt.trim() || 'Open when you feel ready',
        unlockTimestamp: conditionType === 'date' && targetDate ? new Date(targetDate).getTime() : undefined,
        encryptedContent: {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
        },
        sealColor: selectedSeal.color,
        sealEmoji: selectedSeal.emoji,
        isUnlocked: false,
        createdAt: Date.now(),
      };

      onSendLetter(newLetter);
      setLetterTitle('');
      setLetterText('');
      setTargetDate('');
      setIsSubmitting(false);
      setActiveTab('sent');
    } catch (err) {
      console.error('Failed to seal time capsule letter:', err);
      setIsSubmitting(false);
    }
  };

  const handleTriggerUnlock = (letter: TimeCapsuleLetter) => {
    setIsUnsealingAnimation(true);
    setTimeout(() => {
      onUnlockLetter(letter.id);
      setReadingLetter({ ...letter, isUnlocked: true });
      setIsUnsealingAnimation(false);
    }, 1200);
  };

  const isEligibleToUnlock = (letter: TimeCapsuleLetter) => {
    if (letter.isUnlocked) return true;
    if (letter.senderId === currentUserId) return true;
    if (letter.conditionType === 'date' && letter.unlockTimestamp) {
      return Date.now() >= letter.unlockTimestamp;
    }
    // Mood/milestone letters can be manually unlocked by recipient whenever the prompt happens
    return true;
  };

  const formatTargetDate = (ts?: number) => {
    if (!ts) return null;
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl h-[88vh] max-h-[720px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">Time Capsule Letters</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>"Open When..." Sealed</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Encrypted letters sealed with love for future moments with {partner ? partner.name : partnerName}
              </p>
            </div>
          </div>

          <button
            id="btn-close-capsule-modal"
            onClick={() => {
              setReadingLetter(null);
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        {!readingLetter && (
          <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 shrink-0">
            <button
              onClick={() => setActiveTab('received')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'received'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>For You ({receivedLetters.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'sent'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Sealed by You ({sentLetters.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('compose')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ml-auto ${
                activeTab === 'compose'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-amber-400 hover:text-amber-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Seal New Letter</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/20">
          {/* VIEW: READING A SPECIFIC LETTER */}
          {readingLetter ? (
            <div className="max-w-xl mx-auto space-y-4 animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setReadingLetter(null)}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 mb-2 cursor-pointer"
              >
                ← Back to all letters
              </button>

              {/* Letter Parchment Container */}
              <div className="relative bg-amber-50/95 text-slate-900 p-6 sm:p-8 rounded-3xl shadow-2xl border-4 border-amber-200/80 font-serif">
                {/* Vintage Wax Stamp Emblem */}
                <div
                  className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl mx-auto mb-4 border-2 border-white/40"
                  style={{ backgroundColor: readingLetter.sealColor }}
                >
                  {readingLetter.sealEmoji}
                </div>

                <div className="text-center pb-4 border-b border-amber-200">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-amber-800/80 bg-amber-200/60 px-3 py-1 rounded-full">
                    {readingLetter.unlockPrompt}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold mt-3 text-amber-950 font-serif">
                    {readingLetter.title}
                  </h2>
                  <p className="text-xs font-sans text-amber-800/70 mt-1">
                    Written with devotion by {readingLetter.senderName} •{' '}
                    {new Date(readingLetter.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Letter Body or Lock State */}
                <div className="py-6 min-h-[140px]">
                  {readingLetter.isUnlocked || readingLetter.senderId === currentUserId ? (
                    isDecrypting ? (
                      <div className="flex items-center justify-center py-8 text-amber-800 text-sm font-sans">
                        <Sparkles className="w-4 h-4 animate-spin mr-2 text-amber-600" />
                        <span>Decrypting time capsule letter...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base text-amber-950 selection:bg-amber-200 font-serif">
                        {decryptedText}
                      </div>
                    )
                  ) : (
                    /* Locked State with Wax Seal Breaking Prompt */
                    <div className="text-center py-6 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-amber-200/80 text-amber-800 flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-sans text-amber-900/80 max-w-sm mx-auto">
                        This letter is sealed until:{' '}
                        <strong className="text-amber-950">{readingLetter.unlockPrompt}</strong>
                      </p>

                      {isEligibleToUnlock(readingLetter) ? (
                        <button
                          onClick={() => handleTriggerUnlock(readingLetter)}
                          disabled={isUnsealingAnimation}
                          className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-sans font-bold rounded-2xl shadow-lg shadow-amber-600/30 flex items-center gap-2 mx-auto cursor-pointer active:scale-95 transition-all"
                        >
                          <Unlock className="w-4 h-4" />
                          <span>{isUnsealingAnimation ? 'Breaking Wax Seal...' : 'Break Wax Seal & Read Now'}</span>
                        </button>
                      ) : (
                        <div className="text-[11px] font-sans text-amber-800 bg-amber-200/40 p-2.5 rounded-xl max-w-xs mx-auto flex items-center gap-1.5 justify-center">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>
                            Unlocks on {formatTargetDate(readingLetter.unlockTimestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer seal signature */}
                <div className="pt-4 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-sans text-amber-800/70">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                    <span>Protected by E2EE Passkey</span>
                  </span>
                  <span>
                    {readingLetter.isUnlocked
                      ? `Opened on ${new Date(readingLetter.unlockedAt || Date.now()).toLocaleDateString()}`
                      : 'Wax Sealed'}
                  </span>
                </div>
              </div>
            </div>
          ) : activeTab === 'compose' ? (
            /* VIEW: COMPOSE NEW TIME CAPSULE */
            <form onSubmit={handleCreateLetter} className="max-w-xl mx-auto space-y-4 animate-in fade-in">
              <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Compose a Sealed Time Capsule</span>
                </h4>

                {/* Quick Presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Choose an "Open When..." Occasion
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESET_CONDITIONS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                          unlockPrompt === preset.prompt
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-sm mr-1.5">{preset.icon}</span>
                        <span className="font-medium">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Unlock Prompt */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Seal Condition / Prompt Label
                  </label>
                  <input
                    type="text"
                    required
                    value={unlockPrompt}
                    onChange={(e) => setUnlockPrompt(e.target.value)}
                    placeholder="e.g. Open on Valentine's Day 2027"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Target Date if date condition */}
                {conditionType === 'date' && (
                  <div className="animate-in fade-in">
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Target Unlock Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Letter Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Letter Envelope Title
                  </label>
                  <input
                    type="text"
                    required
                    value={letterTitle}
                    onChange={(e) => setLetterTitle(e.target.value)}
                    placeholder="e.g. A note for when you feel uncertain..."
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Letter Secret Text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Your Heartfelt Message (Encrypted)
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={letterText}
                    onChange={(e) => setLetterText(e.target.value)}
                    placeholder="Write from your heart. This will remain completely unreadable until the moment is unlocked..."
                    className="w-full px-3.5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
                  />
                </div>

                {/* Wax Seal Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Wax Stamp Seal Style
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {WAX_SEALS.map((seal) => (
                      <button
                        key={seal.label}
                        type="button"
                        onClick={() => setSelectedSeal(seal)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg border-2 transition-transform cursor-pointer ${
                          selectedSeal.label === seal.label
                            ? 'scale-110 border-white shadow-lg'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: seal.color }}
                        title={seal.label}
                      >
                        {seal.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('received')}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !letterTitle.trim() || !letterText.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Encrypting & Sealing...' : 'Seal with Wax & Send'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* VIEW: LIST OF RECEIVED OR SENT LETTERS */
            <div className="max-w-2xl mx-auto space-y-3">
              {(activeTab === 'received' ? receivedLetters : sentLetters).length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-900/40 rounded-3xl border border-slate-800/80">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {activeTab === 'received' ? 'No Letters Received Yet' : 'No Letters Sealed Yet'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {activeTab === 'received'
                      ? `${partner ? partner.name : partnerName} hasn't sealed a time capsule letter for you yet. Why not surprise them first?`
                      : 'Leave a sealed letter for your partner to open on their special day or when they miss you.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('compose')}
                    className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Seal a Time Capsule</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(activeTab === 'received' ? receivedLetters : sentLetters).map((letter) => (
                    <div
                      key={letter.id}
                      onClick={() => setReadingLetter(letter)}
                      className={`relative p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                        letter.isUnlocked
                          ? 'bg-slate-900/80 border-slate-700/80 hover:border-amber-500/50'
                          : 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-amber-500/30 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10'
                      }`}
                    >
                      {/* Top status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md shrink-0 border border-white/20"
                          style={{ backgroundColor: letter.sealColor }}
                        >
                          {letter.sealEmoji}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                            letter.isUnlocked
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {letter.isUnlocked ? (
                            <>
                              <Unlock className="w-2.5 h-2.5" />
                              <span>Opened</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5" />
                              <span>Sealed</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Content Info */}
                      <div>
                        <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block truncate">
                          {letter.unlockPrompt}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-0.5 truncate group-hover:text-amber-300 transition-colors">
                          {letter.title}
                        </h4>
                      </div>

                      {/* Footer Info */}
                      <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                        <span>From {letter.senderName}</span>
                        <span>{new Date(letter.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
