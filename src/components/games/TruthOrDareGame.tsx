import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Heart,
  Flame,
  Shuffle,
  RotateCcw,
  Smile,
  CheckCircle2,
  History,
  CornerDownRight,
  MessageCircle,
  HelpCircle,
  PenTool,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  playSparkCelebrationSound,
  playMessageChime,
  playLevelUp,
  playBoardMoveSound,
} from '../../utils/sounds';

export interface TodCard {
  type: 'truth' | 'dare';
  text: string;
  chosenBy: string;
  chosenByName: string;
  timestamp: number;
}

export interface TodReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface TodAnswer {
  replyText: string;
  answeredBy: string;
  answeredByName: string;
  answeredAvatar?: string;
  answeredAt: number;
  reactions: TodReaction[];
}

export interface TodHistoryItem {
  id: string;
  card: TodCard;
  answer: TodAnswer;
}

const TRUTH_PRESETS: string[] = [
  "What was the exact moment you realized you had genuine feelings for me?",
  "What is your favorite romantic memory or date we have shared so far?",
  "If you could relive one single day from our relationship, which one would it be?",
  "What is one cute little habit of mine that secretly melts your heart?",
  "What is something you dream about us doing or achieving together in the future?",
  "What song instantly reminds you of me whenever you hear it playing?",
  "What was your very first thought or impression when you first saw me?",
  "What is one thing I do that makes you feel deeply loved and appreciated?",
  "If we had a completely free 3-day weekend with no phones, how would we spend it?",
  "What is a small detail about me that you noticed without me having to tell you?",
  "What is the most attractive or endearing thing I do without even realizing it?",
  "If you had to describe our love story in three words, what would they be?",
  "What is something you were nervous to tell me at first, but are glad you did?",
  "What is your favorite place in the world to be with me?",
  "What made you laugh the hardest when we were together?",
  "What is one romantic surprise you would love to experience together?",
];

const DARE_PRESETS: string[] = [
  "Send a 10-second voice note telling me what you love most about me right now.",
  "Give me the sweetest, most specific compliment you haven't said in a while.",
  "Promise me a personalized romantic coupon (e.g. 20 min massage, favorite dinner cooked).",
  "Take a photo or send a selfie with your sweetest smile or cute silly face right now.",
  "Whisper your favorite secret nickname for me into a quick audio or message.",
  "Draw a cute mini heart or love doodle on the Live Canvas right now.",
  "Describe our next dream romantic date together in vivid sensory detail.",
  "Name three specific things you find irresistibly attractive about me.",
  "Write a quick 4-line mini romantic poem dedicated to us.",
  "Tell me your favorite outfit of yours and why you love wearing it around me.",
  "Share the top song on your playlist that reminds you of us.",
  "Plan a mystery surprise treat for our next virtual or in-person date.",
  "Re-enact the exact moment or words when you asked me out or confessed your feelings.",
  "Change your status message to a sweet phrase or emoji dedicated to me.",
];

const QUICK_MOOD_TAGS = [
  "From my heart ❤️",
  "Honest truth 🤞",
  "Challenge completed! 🔥",
  "You make me blush 🙈",
  "Forever yours 💕",
];

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '🥺', '👏', '💯'];

interface TruthOrDareGameProps {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  partnerName: string;
  partnerAvatar?: string;
  isPlayer1?: boolean;
  onBroadcastAction: (actionData: any) => void;
  incomingAction?: any;
}

export const TruthOrDareGame: React.FC<TruthOrDareGameProps> = ({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partnerName,
  partnerAvatar,
  isPlayer1 = true,
  onBroadcastAction,
  incomingAction,
}) => {
  const [todTurn, setTodTurn] = useState<'P1' | 'P2'>('P1');
  const [selectedCard, setSelectedCard] = useState<TodCard | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<TodAnswer | null>(null);
  const [replyInput, setReplyInput] = useState<string>('');
  const [history, setHistory] = useState<TodHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');
  const [customType, setCustomType] = useState<'truth' | 'dare'>('truth');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Deterministic Roles
  const myRole: 'P1' | 'P2' = isPlayer1 ? 'P1' : 'P2';
  const partnerRole: 'P1' | 'P2' = isPlayer1 ? 'P2' : 'P1';

  const p1Name = isPlayer1 ? (currentUserName || 'You') : (partnerName || 'Partner');
  const p2Name = isPlayer1 ? (partnerName || 'Partner') : (currentUserName || 'You');

  const p1Avatar = isPlayer1 ? currentUserAvatar : partnerAvatar;
  const p2Avatar = isPlayer1 ? partnerAvatar : currentUserAvatar;

  // Active Picker Turn
  const isMyTurnToPick = todTurn === myRole || !partnerName;
  const activePickerName = todTurn === 'P1' ? p1Name : p2Name;

  // Can the current user submit an answer?
  // Answering player is the one who drew the card (or active turn player)
  const isMyTurnToAnswer =
    selectedCard &&
    (selectedCard.chosenBy === currentUserId || (!partnerName && isMyTurnToPick));

  // Sync with incoming peer action
  useEffect(() => {
    if (!incomingAction) return;

    if (incomingAction.type === 'card_chosen') {
      setSelectedCard(incomingAction.card);
      setCurrentAnswer(null);
      setReplyInput('');
      setIsCustomMode(false);
      playSparkCelebrationSound();
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
    } else if (incomingAction.type === 'card_shuffled') {
      setSelectedCard(incomingAction.card);
      setCurrentAnswer(null);
      setReplyInput('');
      playBoardMoveSound();
    } else if (incomingAction.type === 'reply_submitted') {
      setCurrentAnswer(incomingAction.answer);
      if (incomingAction.card) {
        setSelectedCard(incomingAction.card);
      }
      setHistory((prev) => [
        {
          id: `tod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          card: incomingAction.card || selectedCard!,
          answer: incomingAction.answer,
        },
        ...prev,
      ]);
      playMessageChime(false);
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
    } else if (incomingAction.type === 'reply_reaction') {
      setCurrentAnswer((prev) => {
        if (!prev) return prev;
        const emoji = incomingAction.emoji;
        const existing = prev.reactions.find((r) => r.emoji === emoji);
        let updatedReactions;
        if (existing) {
          updatedReactions = prev.reactions.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, users: [...r.users, incomingAction.user] }
              : r
          );
        } else {
          updatedReactions = [...prev.reactions, { emoji, count: 1, users: [incomingAction.user] }];
        }
        return { ...prev, reactions: updatedReactions };
      });
      playLevelUp();
    } else if (incomingAction.type === 'next_turn') {
      setTodTurn(incomingAction.nextTurn);
      setSelectedCard(null);
      setCurrentAnswer(null);
      setReplyInput('');
      setIsCustomMode(false);
    } else if (incomingAction.type === 'reset_game') {
      setTodTurn('P1');
      setSelectedCard(null);
      setCurrentAnswer(null);
      setReplyInput('');
      setHistory([]);
      setIsCustomMode(false);
    }
  }, [incomingAction]);

  // Handle Card Picking
  const handlePickCard = (type: 'truth' | 'dare') => {
    if (!isMyTurnToPick && Boolean(partnerName)) {
      setNoticeMessage(`⏳ It is ${activePickerName}'s turn to pick! Please wait.`);
      setTimeout(() => setNoticeMessage(null), 2500);
      return;
    }

    const pool = type === 'truth' ? TRUTH_PRESETS : DARE_PRESETS;
    const randomText = pool[Math.floor(Math.random() * pool.length)];

    const newCard: TodCard = {
      type,
      text: randomText,
      chosenBy: currentUserId,
      chosenByName: currentUserName || 'You',
      timestamp: Date.now(),
    };

    setSelectedCard(newCard);
    setCurrentAnswer(null);
    setReplyInput('');
    setIsCustomMode(false);
    playSparkCelebrationSound();
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });

    onBroadcastAction({
      type: 'card_chosen',
      card: newCard,
      turn: todTurn,
    });
  };

  // Shuffle for a different prompt
  const handleShuffleCard = () => {
    if (!selectedCard) return;
    const pool = selectedCard.type === 'truth' ? TRUTH_PRESETS : DARE_PRESETS;
    const available = pool.filter((t) => t !== selectedCard.text);
    const randomText = available[Math.floor(Math.random() * available.length)];

    const updatedCard: TodCard = {
      ...selectedCard,
      text: randomText,
      timestamp: Date.now(),
    };

    setSelectedCard(updatedCard);
    playBoardMoveSound();

    onBroadcastAction({
      type: 'card_shuffled',
      card: updatedCard,
    });
  };

  // Handle Custom Prompt Creation
  const handleCreateCustomPrompt = () => {
    if (!customText.trim()) return;

    const newCard: TodCard = {
      type: customType,
      text: customText.trim(),
      chosenBy: currentUserId,
      chosenByName: currentUserName || 'You',
      timestamp: Date.now(),
    };

    setSelectedCard(newCard);
    setCurrentAnswer(null);
    setReplyInput('');
    setIsCustomMode(false);
    setCustomText('');
    playSparkCelebrationSound();
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });

    onBroadcastAction({
      type: 'card_chosen',
      card: newCard,
      turn: todTurn,
    });
  };

  // Submit Reply to Partner
  const handleSubmitReply = () => {
    if (!replyInput.trim() || !selectedCard) return;

    const answerData: TodAnswer = {
      replyText: replyInput.trim(),
      answeredBy: currentUserId,
      answeredByName: currentUserName || 'You',
      answeredAvatar: currentUserAvatar,
      answeredAt: Date.now(),
      reactions: [],
    };

    setCurrentAnswer(answerData);
    setHistory((prev) => [
      {
        id: `tod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        card: selectedCard,
        answer: answerData,
      },
      ...prev,
    ]);
    setReplyInput('');
    playMessageChime(true);
    confetti({ particleCount: 75, spread: 90, origin: { y: 0.5 } });

    onBroadcastAction({
      type: 'reply_submitted',
      card: selectedCard,
      answer: answerData,
      turn: todTurn,
    });
  };

  // React to Answer
  const handleReaction = (emoji: string) => {
    if (!currentAnswer) return;

    const existing = currentAnswer.reactions.find((r) => r.emoji === emoji);
    let updatedReactions;
    if (existing) {
      updatedReactions = currentAnswer.reactions.map((r) =>
        r.emoji === emoji
          ? { ...r, count: r.count + 1, users: [...r.users, currentUserId] }
          : r
      );
    } else {
      updatedReactions = [...currentAnswer.reactions, { emoji, count: 1, users: [currentUserId] }];
    }

    setCurrentAnswer({ ...currentAnswer, reactions: updatedReactions });
    playLevelUp();
    confetti({ particleCount: 25, spread: 50, origin: { y: 0.6 } });

    onBroadcastAction({
      type: 'reply_reaction',
      emoji,
      user: currentUserId,
    });
  };

  // Pass Turn to Partner
  const handleNextTurn = () => {
    const nextTurn: 'P1' | 'P2' = todTurn === 'P1' ? 'P2' : 'P1';
    setTodTurn(nextTurn);
    setSelectedCard(null);
    setCurrentAnswer(null);
    setReplyInput('');
    setIsCustomMode(false);

    onBroadcastAction({
      type: 'next_turn',
      nextTurn,
    });
  };

  // Reset Game
  const handleResetGame = () => {
    setTodTurn('P1');
    setSelectedCard(null);
    setCurrentAnswer(null);
    setReplyInput('');
    setHistory([]);
    setIsCustomMode(false);

    onBroadcastAction({
      type: 'reset_game',
    });
  };

  const nextTurnPlayerName = todTurn === 'P1' ? p2Name : p1Name;

  return (
    <div className="space-y-4 max-w-xl mx-auto select-none animate-in fade-in duration-300">
      {/* Notice Message if player acts out of turn */}
      {noticeMessage && (
        <div className="w-full py-2 px-3 bg-amber-500/20 border border-amber-500/40 text-amber-700 text-xs font-bold rounded-xl text-center shadow-xs animate-bounce">
          {noticeMessage}
        </div>
      )}

      {/* Top Header Turn & Player Arena */}
      <div className="flex items-center justify-between bg-gradient-to-r from-rose-50 via-pink-50 to-indigo-50 border border-rose-200/80 rounded-2xl px-4 py-2.5 shadow-xs">
        {/* Player 1 */}
        <div
          className={`flex items-center gap-2 transition-all ${
            todTurn === 'P1' ? 'opacity-100 font-bold scale-102' : 'opacity-60'
          }`}
        >
          <div className="relative w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden border-2 border-rose-300">
            {p1Avatar ? (
              <img src={p1Avatar} alt={p1Name} className="w-full h-full object-cover" />
            ) : (
              <span>❤️</span>
            )}
            {todTurn === 'P1' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-ping" />
            )}
          </div>
          <div className="text-left">
            <span className="text-xs text-slate-800 block leading-tight">
              {p1Name} {myRole === 'P1' ? '(You)' : ''}
            </span>
            <span className="text-[10px] text-rose-600 font-medium">Player 1</span>
          </div>
        </div>

        {/* Center Round / Turn Status */}
        <div className="text-center px-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono block">
            {isMyTurnToPick ? 'YOUR TURN' : 'PARTNER TURN'}
          </span>
          <span
            className={`text-xs font-black ${
              isMyTurnToPick ? 'text-rose-600 animate-pulse' : 'text-slate-600'
            }`}
          >
            {isMyTurnToPick ? '✨ Pick or Answer' : `⏳ ${activePickerName}'s Move`}
          </span>
        </div>

        {/* Player 2 */}
        <div
          className={`flex items-center gap-2 transition-all ${
            todTurn === 'P2' ? 'opacity-100 font-bold scale-102' : 'opacity-60'
          }`}
        >
          <div className="text-right">
            <span className="text-xs text-slate-800 block leading-tight">
              {p2Name} {myRole === 'P2' ? '(You)' : ''}
            </span>
            <span className="text-[10px] text-indigo-600 font-medium">Player 2</span>
          </div>
          <div className="relative w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs overflow-hidden border-2 border-indigo-300">
            {p2Avatar ? (
              <img src={p2Avatar} alt={p2Name} className="w-full h-full object-cover" />
            ) : (
              <span>✨</span>
            )}
            {todTurn === 'P2' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-ping" />
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHASE 1: CHOOSE TRUTH OR DARE (No Card Selected) */}
      {/* ========================================================================= */}
      {!selectedCard && !isCustomMode && (
        <div className="space-y-4">
          <div className="text-center py-1">
            <h3 className="text-base font-extrabold text-slate-800">
              {isMyTurnToPick
                ? `Choose Truth or Dare for ${partnerName || 'your Partner'}`
                : `Waiting for ${activePickerName} to Choose`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMyTurnToPick
                ? `Pick a card below. The question will be instantly revealed to both of you!`
                : `${activePickerName} is selecting Truth or Dare. You'll see the card right here the moment they pick.`}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Pick Truth */}
            <button
              onClick={() => handlePickCard('truth')}
              disabled={!isMyTurnToPick && Boolean(partnerName)}
              className={`p-5 sm:p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-2.5 shadow-sm cursor-pointer ${
                isMyTurnToPick || !partnerName
                  ? 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 hover:border-indigo-400 hover:shadow-md hover:scale-102 active:scale-98'
                  : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-2xl shadow-inner">
                💭
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base text-indigo-950 block">
                  Pick Truth
                </span>
                <span className="text-[11px] text-indigo-600 mt-0.5 block leading-tight">
                  Intimate, sweet & romantic confessions
                </span>
              </div>
              {isMyTurnToPick && (
                <span className="mt-1 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-xs">
                  Tap to Reveal
                </span>
              )}
            </button>

            {/* Pick Dare */}
            <button
              onClick={() => handlePickCard('dare')}
              disabled={!isMyTurnToPick && Boolean(partnerName)}
              className={`p-5 sm:p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-2.5 shadow-sm cursor-pointer ${
                isMyTurnToPick || !partnerName
                  ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 hover:border-rose-400 hover:shadow-md hover:scale-102 active:scale-98'
                  : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-2xl shadow-inner">
                🔥
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base text-rose-950 block">
                  Pick Dare
                </span>
                <span className="text-[11px] text-rose-600 mt-0.5 block leading-tight">
                  Spicy, playful tasks & cute challenges
                </span>
              </div>
              {isMyTurnToPick && (
                <span className="mt-1 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-xs">
                  Tap to Reveal
                </span>
              )}
            </button>
          </div>

          {/* Custom Question Toggle */}
          {isMyTurnToPick && (
            <div className="text-center pt-1">
              <button
                onClick={() => setIsCustomMode(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold inline-flex items-center gap-1 hover:underline cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Or write a custom Truth or Dare for {partnerName || 'Partner'}</span>
              </button>
            </div>
          )}

          {/* Waiting animation when not your turn */}
          {!isMyTurnToPick && Boolean(partnerName) && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 animate-pulse">
                <Heart className="w-4 h-4 fill-rose-500" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                {activePickerName} is browsing cards right now...
              </p>
              <span className="text-[11px] text-slate-400">
                The chosen question and reply session will automatically pop up!
              </span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM PROMPT CREATOR */}
      {/* ========================================================================= */}
      {!selectedCard && isCustomMode && (
        <div className="p-5 rounded-3xl bg-white border-2 border-rose-200 shadow-lg space-y-3 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-rose-500" />
              <span>Write a Custom Prompt</span>
            </h4>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCustomType('truth')}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  customType === 'truth' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                💭 Truth
              </button>
              <button
                onClick={() => setCustomType('dare')}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  customType === 'dare' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500'
                }`}
              >
                🔥 Dare
              </button>
            </div>
          </div>

          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={
              customType === 'truth'
                ? `What question would you love ${partnerName || 'your partner'} to answer sincerely?`
                : `What sweet or playful dare would you challenge ${partnerName || 'your partner'} to do?`
            }
            className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 resize-none h-20 text-slate-800 placeholder:text-slate-400"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setIsCustomMode(false)}
              className="text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCustomPrompt}
              disabled={!customText.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                customText.trim()
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Send Prompt</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2: ACTIVE QUESTION & REAL-TIME REPLY SESSION */}
      {/* ========================================================================= */}
      {selectedCard && (
        <div className="space-y-4 animate-in zoom-in-95 duration-200">
          {/* Card Presentation */}
          <div
            className={`p-5 sm:p-6 rounded-3xl shadow-xl text-center space-y-3 relative overflow-hidden transition-all ${
              selectedCard.type === 'truth'
                ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white'
                : 'bg-gradient-to-br from-rose-600 via-pink-600 to-amber-600 text-white'
            }`}
          >
            {/* Subtle decorative glow */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

            {/* Who chose banner */}
            <div className="flex items-center justify-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-xs flex items-center gap-1">
                {selectedCard.type === 'truth' ? '💭 Secret Truth' : '🔥 Playful Dare'}
              </span>
              <span className="text-white/80 text-xs font-medium">
                • Chosen by {selectedCard.chosenBy === currentUserId ? 'You' : selectedCard.chosenByName || partnerName}
              </span>
            </div>

            {/* The Question Text */}
            <h4 className="text-base sm:text-lg font-bold leading-relaxed px-2 drop-shadow-xs">
              "{selectedCard.text}"
            </h4>

            {/* Shuffle button if not yet answered and active user chose it */}
            {!currentAnswer && selectedCard.chosenBy === currentUserId && (
              <div className="pt-1 flex justify-center">
                <button
                  onClick={handleShuffleCard}
                  className="text-[11px] text-white/80 hover:text-white font-medium flex items-center gap-1 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-all cursor-pointer backdrop-blur-xs"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Shuffle for another question</span>
                </button>
              </div>
            )}
          </div>

          {/* ======================================================================= */}
          {/* REPLY SESSION: ACTIVE ANSWERING OR WAITING STATE */}
          {/* ======================================================================= */}
          {!currentAnswer ? (
            isMyTurnToAnswer ? (
              /* ACTIVE USER REPLY SESSION */
              <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-rose-200 shadow-md space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center text-xs">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">
                        Your Reply Session
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Type your honest answer or describe your dare to {partnerName || 'Partner'}:
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {replyInput.length} chars
                  </span>
                </div>

                {/* Reply Input Box */}
                <textarea
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder={`Write your heartfelt answer to ${partnerName || 'your partner'}...`}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 resize-none h-24 text-slate-800 placeholder:text-slate-400 shadow-inner"
                />

                {/* Quick Mood Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium mr-1">Add:</span>
                  {QUICK_MOOD_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setReplyInput((prev) => (prev ? `${prev} ${tag}` : tag))
                      }
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-[11px] text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Submit Reply Button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 italic">
                    Partner sees this live on their screen 💌
                  </span>
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyInput.trim()}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      replyInput.trim()
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white ring-2 ring-rose-300'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>Send Answer to {partnerName || 'Partner'}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* WAITING FOR PARTNER'S REPLY */
              <div className="p-6 rounded-3xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-white text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 mx-auto flex items-center justify-center animate-pulse">
                  <Heart className="w-6 h-6 fill-rose-400" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-white">
                    Waiting for {selectedCard.chosenByName || partnerName} to Reply... ✍️
                  </h5>
                  <p className="text-xs text-slate-300 mt-1">
                    They are typing their confession / answer right now. It will appear directly on your screen!
                  </p>
                </div>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  <span className="text-[11px] text-rose-300 font-mono uppercase tracking-wider">
                    Live Reply Session Active
                  </span>
                </div>
              </div>
            )
          ) : (
            /* ======================================================================= */
            /* PHASE 3: ANSWER REVEALED + INTERACTIVE REACTIONS + PASS TURN */
            /* ======================================================================= */
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white to-rose-50/50 border-2 border-rose-200 shadow-xl space-y-4 animate-in zoom-in-95">
              {/* Answer Header */}
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold overflow-hidden border border-rose-200 shadow-xs">
                    {currentAnswer.answeredAvatar ? (
                      <img
                        src={currentAnswer.answeredAvatar}
                        alt={currentAnswer.answeredByName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>💌</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 block">
                      {currentAnswer.answeredBy === currentUserId
                        ? 'Your Answer'
                        : `${currentAnswer.answeredByName}'s Answer`}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Answered just now
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Answer Received</span>
                </span>
              </div>

              {/* The Written Answer Bubble */}
              <div className="p-4 rounded-2xl bg-white border border-rose-100 shadow-xs">
                <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed italic">
                  "{currentAnswer.replyText}"
                </p>
              </div>

              {/* Interactive Emoji Reaction Bar */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 block text-center">
                  React to this answer:
                </span>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {REACTION_EMOJIS.map((emoji) => {
                    const reactData = currentAnswer.reactions.find((r) => r.emoji === emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(emoji)}
                        className={`px-3 py-1.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all border cursor-pointer hover:scale-110 active:scale-95 ${
                          reactData?.count
                            ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50'
                        }`}
                      >
                        <span>{emoji}</span>
                        {reactData?.count ? (
                          <span className="text-xs font-mono">{reactData.count}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pass Turn to Next Player Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <button
                  onClick={handleNextTurn}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 cursor-pointer ring-2 ring-rose-300"
                >
                  <span>Next Round: Pass Turn to {nextTurnPlayerName}</span>
                  <CornerDownRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* HISTORY DRAWER & SESSION CONTROLS */}
      {/* ========================================================================= */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-slate-600 hover:text-rose-600 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer py-1"
        >
          <History className="w-3.5 h-3.5" />
          <span>
            {showHistory
              ? 'Hide Past Answers'
              : `Past Answers in this Session (${history.length})`}
          </span>
        </button>

        <button
          onClick={handleResetGame}
          className="text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset ToD</span>
        </button>
      </div>

      {/* Past Answers List */}
      {showHistory && (
        <div className="space-y-3 pt-1 animate-in fade-in">
          {history.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              No answered cards yet in this session. Choose Truth or Dare above to begin!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {history.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-rose-600 flex items-center gap-1">
                      <span>Round {history.length - idx}:</span>
                      <span className="uppercase text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                        {item.card.type}
                      </span>
                    </span>
                    <span className="text-slate-400">
                      Answered by {item.answer.answeredByName}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800">
                    Q: "{item.card.text}"
                  </p>
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                    A: "{item.answer.replyText}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
