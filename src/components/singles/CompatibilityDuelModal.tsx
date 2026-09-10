import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Sparkles, CheckCircle2, Heart, MessageCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { SingleProfile, DuelQuestion } from '../../types';
import { playDilemmaSelectSound, playSparkCelebrationSound } from '../../utils/sounds';

interface CompatibilityDuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: SingleProfile;
  currentUserName?: string;
  onSendWaveWithDuel: (partner: SingleProfile, score: number, answersCount: number) => void;
  onStartOneOnOneSpace?: (roomId: string, passkey: string, partner: SingleProfile) => void;
}

export const DUEL_QUESTIONS: DuelQuestion[] = [
  {
    id: 'duel-1',
    category: 'lifestyle',
    question: 'Sunday Morning Energy',
    optionA: { text: 'Fresh Bakery Run at 8 AM', emoji: '🥐', subtitle: 'Warm croissants, quiet morning walk' },
    optionB: { text: 'Sleep in until Noon', emoji: '☕', subtitle: 'Sunlight through blinds, coffee in bed' },
  },
  {
    id: 'duel-2',
    category: 'date_night',
    question: 'Ideal First Date Vibe',
    optionA: { text: 'Hidden Jazz Speakeasy', emoji: '🎷', subtitle: 'Dim candlelights, live music, craft drinks' },
    optionB: { text: 'Golden Hour Sunset Picnic', emoji: '🌅', subtitle: 'Cozy blanket, curated playlist, ocean air' },
  },
  {
    id: 'duel-3',
    category: 'vibe',
    question: 'Travel Philosophy',
    optionA: { text: 'Spontaneous & Unplanned', emoji: '✈️', subtitle: 'Book a flight, wander alleyways, discover' },
    optionB: { text: 'Curated Food & Cafe Itinerary', emoji: '🗺️', subtitle: 'The best local bakeries, sights mapped out' },
  },
  {
    id: 'duel-4',
    category: 'comfort',
    question: 'Late Night Movie Night',
    optionA: { text: 'Gripping Mind-Bending Mystery', emoji: '🎬', subtitle: 'Plot twists, guessing the ending together' },
    optionB: { text: 'Warm Comfort Anime or Rom-Com', emoji: '🍿', subtitle: 'Cozy blankets, tea, heartfelt nostalgic vibes' },
  },
  {
    id: 'duel-5',
    category: 'values',
    question: 'Little Things That Win Your Heart',
    optionA: { text: 'Remembering a Tiny Detail', emoji: '🌟', subtitle: 'Bringing your favorite snack unprompted' },
    optionB: { text: 'Making You Laugh Until You Cry', emoji: '😂', subtitle: 'Uncontrollable silly giggles in public' },
  },
];

export const CompatibilityDuelModal: React.FC<CompatibilityDuelModalProps> = ({
  isOpen,
  onClose,
  partner,
  currentUserName = 'You',
  onSendWaveWithDuel,
  onStartOneOnOneSpace,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, 'A' | 'B'>>({});
  const [isFinished, setIsFinished] = useState(false);

  // Derive partner answers deterministically based on partner's interests/id so it feels authentic & consistent
  const partnerAnswers = React.useMemo<Record<string, 'A' | 'B'>>(() => {
    const answers: Record<string, 'A' | 'B'> = {};
    DUEL_QUESTIONS.forEach((q, idx) => {
      // Use partner ID characters and interests to select A or B
      const charCode = (partner.id || partner.name).charCodeAt(idx % (partner.id || partner.name).length);
      answers[q.id] = (charCode + idx) % 2 === 0 ? 'A' : 'B';
    });
    return answers;
  }, [partner.id, partner.name]);

  if (!isOpen) return null;

  const currentQ = DUEL_QUESTIONS[currentStep];

  const handleSelectOption = (choice: 'A' | 'B') => {
    playDilemmaSelectSound();
    const updated = { ...userAnswers, [currentQ.id]: choice };
    setUserAnswers(updated);

    if (currentStep < DUEL_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 400);
    } else {
      setTimeout(() => {
        setIsFinished(true);
        playSparkCelebrationSound();
      }, 500);
    }
  };

  // Calculate matching score
  const matchesCount = DUEL_QUESTIONS.reduce((acc, q) => {
    if (userAnswers[q.id] && userAnswers[q.id] === partnerAnswers[q.id]) {
      return acc + 1;
    }
    return acc;
  }, 0);
  const matchPercentage = Math.round((matchesCount / DUEL_QUESTIONS.length) * 100);

  const handleReset = () => {
    setUserAnswers({});
    setCurrentStep(0);
    setIsFinished(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-stone-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-stone-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Compatibility Mini-Duel
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-normal">
                  5 Dilemmas
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                You vs. <span className="text-white font-medium">{partner.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-1">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
            style={{ width: `${((isFinished ? 5 : currentStep) / 5) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!isFinished ? (
              <motion.div
                key={`step-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="text-center space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold">
                    Round {currentStep + 1} of 5 • {currentQ.category}
                  </span>
                  <h4 className="text-xl font-bold text-white">{currentQ.question}</h4>
                  <p className="text-xs text-stone-400">Tap the option that sounds most like you</p>
                </div>

                {/* Option Cards */}
                <div className="grid grid-cols-1 gap-3 pt-2">
                  {(['A', 'B'] as const).map((optKey) => {
                    const opt = optKey === 'A' ? currentQ.optionA : currentQ.optionB;
                    const isSelected = userAnswers[currentQ.id] === optKey;

                    return (
                      <button
                        key={optKey}
                        onClick={() => handleSelectOption(optKey)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all duration-150 relative group ${
                          isSelected
                            ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/10'
                            : 'bg-stone-800/60 hover:bg-stone-800 border-white/10 text-stone-200 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <span className="text-3xl p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform">
                            {opt.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className="text-base font-bold text-white">{opt.text}</h5>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-rose-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                              {opt.subtitle}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              /* Results View */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 text-center py-2"
              >
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 p-1 mx-auto shadow-xl shadow-rose-500/25">
                    <div className="w-full h-full rounded-full bg-stone-900 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-pink-400">
                        {matchPercentage}%
                      </span>
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                        Chemistry
                      </span>
                    </div>
                  </div>
                  <span className="absolute -top-1 -right-1 text-2xl">✨</span>
                </div>

                <div>
                  <h4 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                    {matchPercentage >= 60 ? 'High Spark Alignment! 🔥' : 'Intriguing Opposites Attract! ⚡'}
                  </h4>
                  <p className="text-xs text-stone-300 mt-1 max-w-sm mx-auto">
                    You and {partner.name} matched on{' '}
                    <span className="text-amber-400 font-bold">{matchesCount} of 5</span> vibe dilemmas.
                    {matchPercentage >= 60
                      ? " You share a remarkably similar rhythm in lifestyle and date nights!"
                      : " Your different answers mean great conversations and introducing each other to new worlds."}
                  </p>
                </div>

                {/* Question Breakdown List */}
                <div className="space-y-2 text-left bg-stone-800/40 p-3 rounded-2xl border border-white/5 max-h-48 overflow-y-auto">
                  {DUEL_QUESTIONS.map((q) => {
                    const isMatch = userAnswers[q.id] === partnerAnswers[q.id];
                    const userChoice = userAnswers[q.id] === 'A' ? q.optionA : q.optionB;
                    const partnerChoice = partnerAnswers[q.id] === 'A' ? q.optionA : q.optionB;

                    return (
                      <div key={q.id} className="text-xs p-2 rounded-xl bg-stone-800/60 border border-white/5 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-stone-200 truncate">{q.question}</p>
                          <p className="text-[11px] text-stone-400 truncate">
                            You: <span className="text-white">{userChoice.emoji} {userChoice.text}</span>
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isMatch ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isMatch ? 'Match! ✨' : 'Different 🎨'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      onSendWaveWithDuel(partner, matchPercentage, 5);
                      onClose();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 active:scale-95 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Wave with {matchPercentage}% Score
                  </button>

                  <button
                    onClick={handleReset}
                    className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Play Again
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
