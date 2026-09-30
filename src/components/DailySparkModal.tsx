import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  Sparkles,
  Lock,
  Unlock,
  Heart,
  Send,
  HelpCircle,
  Shuffle,
  CheckCircle2,
  Calendar,
  Flame,
} from 'lucide-react';
import { DailyPrompt, DailySparkState, DailySparkAnswer, UserProfile } from '../types';
import { encryptText, decryptText } from '../utils/crypto';

interface DailySparkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  partner: UserProfile | null;
  partnerName: string;
  cryptoKey: CryptoKey | null;
  dailySparkState: DailySparkState | null;
  onSubmitAnswer: (promptId: string, dateKey: string, answer: DailySparkAnswer) => void;
}

const DAILY_PROMPTS_POOL: DailyPrompt[] = [
  {
    id: 'spark-1',
    category: 'romantic',
    emoji: '💖',
    question: 'What is one specific moment with me that you will never forget, and why?',
  },
  {
    id: 'spark-2',
    category: 'deep',
    emoji: '🌌',
    question: 'In what ways do you think we have helped each other grow the most?',
  },
  {
    id: 'spark-3',
    category: 'memory',
    emoji: '📸',
    question: 'What was the exact moment or vibe when you knew you had fallen deeply in love with me?',
  },
  {
    id: 'spark-4',
    category: 'future',
    emoji: '✈️',
    question: 'If we could wake up anywhere in the world tomorrow morning together, where are we and what are we doing?',
  },
  {
    id: 'spark-5',
    category: 'fun',
    emoji: '🍕',
    question: 'What is our funniest or most chaotic inside joke or memory?',
  },
  {
    id: 'spark-6',
    category: 'romantic',
    emoji: '🎶',
    question: 'What song immediately makes you think of me whenever you hear it playing?',
  },
  {
    id: 'spark-7',
    category: 'cozy' as any,
    emoji: '☕',
    question: 'Describe your perfect lazy Sunday with me from morning to night.',
  },
];

export const DailySparkModal: React.FC<DailySparkModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partner,
  partnerName,
  cryptoKey,
  dailySparkState,
  onSubmitAnswer,
}) => {
  const todayDateKey = new Date().toISOString().split('T')[0];
  
  // Pick prompt based on today's date index
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const defaultPrompt = DAILY_PROMPTS_POOL[dayOfYear % DAILY_PROMPTS_POOL.length];

  const currentPrompt = dailySparkState?.prompt || defaultPrompt;
  
  const [answerInput, setAnswerInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Decrypted answers
  const [myDecryptedAnswer, setMyDecryptedAnswer] = useState<string | null>(null);
  const [partnerDecryptedAnswer, setPartnerDecryptedAnswer] = useState<string | null>(null);

  const myAnswer = dailySparkState?.answers?.[currentUserId];
  const partnerId = partner?.id;
  const partnerAnswer = partnerId ? dailySparkState?.answers?.[partnerId] : (Object.values(dailySparkState?.answers || {}) as DailySparkAnswer[]).find(a => a.userId !== currentUserId);

  const bothAnswered = Boolean(myAnswer && partnerAnswer);

  // Decrypt my answer
  useEffect(() => {
    if (!myAnswer || !cryptoKey) {
      setMyDecryptedAnswer(null);
      return;
    }
    decryptText(
      myAnswer.encryptedAnswer.ciphertext,
      myAnswer.encryptedAnswer.iv,
      cryptoKey
    )
      .then(setMyDecryptedAnswer)
      .catch(() => setMyDecryptedAnswer('Failed to decrypt answer'));
  }, [myAnswer, cryptoKey]);

  // Decrypt partner answer only when both have answered
  useEffect(() => {
    if (!bothAnswered || !partnerAnswer || !cryptoKey) {
      setPartnerDecryptedAnswer(null);
      return;
    }
    decryptText(
      partnerAnswer.encryptedAnswer.ciphertext,
      partnerAnswer.encryptedAnswer.iv,
      cryptoKey
    )
      .then(setPartnerDecryptedAnswer)
      .catch(() => setPartnerDecryptedAnswer('Failed to decrypt partner answer'));
  }, [bothAnswered, partnerAnswer, cryptoKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || !cryptoKey) return;

    setIsSubmitting(true);
    try {
      const encrypted = await encryptText(answerInput.trim(), cryptoKey);
      const answerPayload: DailySparkAnswer = {
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        encryptedAnswer: {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
        },
        submittedAt: Date.now(),
      };

      onSubmitAnswer(currentPrompt.id, todayDateKey, answerPayload);
      setAnswerInput('');
      setIsSubmitting(false);
    } catch (err) {
      console.error('Failed to encrypt daily spark answer:', err);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border-0 sm:border border-slate-800 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-slate-900/90 border-b border-slate-800 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven-Style Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-spark-mobile-back"
              className="p-1.5 -ml-1 text-rose-400 hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">Daily Couple Spark</h3>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30 shrink-0">
                  Double-Blind
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Answers stay hidden until both submit!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Prompt Banner */}
          <div className="relative p-6 rounded-3xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/30 border border-rose-500/30 text-center shadow-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold mb-3 border border-rose-500/30">
              <span>{currentPrompt.emoji}</span>
              <span className="capitalize">{currentPrompt.category} Prompt of the Day</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white font-serif leading-snug max-w-lg mx-auto">
              "{currentPrompt.question}"
            </h2>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* My Answer Card */}
            <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between min-h-[170px]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{currentUserAvatar}</span>
                    <span className="text-xs font-bold text-white">You ({currentUserName})</span>
                  </div>
                  {myAnswer ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Answered</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                      Pending
                    </span>
                  )}
                </div>

                {myAnswer ? (
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/40">
                    {myDecryptedAnswer || 'Decrypting...'}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    You haven't submitted your spark answer yet. Fill in the form below!
                  </p>
                )}
              </div>

              {myAnswer && (
                <div className="text-[10px] text-slate-500 mt-2">
                  Submitted {new Date(myAnswer.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {/* Partner's Answer Card */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between min-h-[170px] ${
              bothAnswered
                ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-500/5'
                : 'bg-slate-800/40 border-slate-700/60'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{partner?.avatar || '💖'}</span>
                    <span className="text-xs font-bold text-white">{partner ? partner.name : partnerName}</span>
                  </div>

                  {partnerAnswer ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Submitted</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-[10px] font-semibold">
                      Waiting...
                    </span>
                  )}
                </div>

                {bothAnswered ? (
                  <div className="animate-in zoom-in-95 duration-300">
                    <p className="text-xs sm:text-sm text-rose-100 leading-relaxed font-sans bg-rose-950/40 p-3.5 rounded-xl border border-rose-500/30">
                      {partnerDecryptedAnswer || 'Decrypting partner answer...'}
                    </p>
                  </div>
                ) : partnerAnswer ? (
                  <div className="text-center py-5 space-y-2">
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                      <Lock className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-rose-300">
                      {partner ? partner.name : partnerName} has submitted their answer!
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Submit your own answer to reveal what they wrote.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-5 space-y-2 text-slate-500">
                    <Lock className="w-6 h-6 mx-auto text-slate-600" />
                    <p className="text-xs">
                      Awaiting {partner ? partner.name : partnerName}'s response...
                    </p>
                  </div>
                )}
              </div>

              {bothAnswered && (
                <div className="text-[10px] text-rose-400/80 font-medium flex items-center gap-1 mt-2">
                  <Sparkles className="w-3 h-3" />
                  <span>Revealed to both of you!</span>
                </div>
              )}
            </div>
          </div>

          {/* Form to submit answer */}
          {!myAnswer ? (
            <form onSubmit={handleSubmit} className="space-y-3 bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl">
              <label className="block text-xs font-bold text-white">
                Your Answer to Today's Question
              </label>
              <textarea
                rows={3}
                required
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="Be honest, romantic, or playful... it's locked until your partner answers too."
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !answerInput.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Encrypting & Submitting...' : 'Submit Secret Answer'}</span>
                </button>
              </div>
            </form>
          ) : bothAnswered ? (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center flex items-center justify-center gap-2 text-xs font-medium text-emerald-300">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400 animate-pulse" />
              <span>Today's Couple Spark is complete! Come back tomorrow for a new spark prompt.</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
