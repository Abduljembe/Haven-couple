import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  Flame,
  Wine,
  Smile,
  RefreshCw,
  Trophy,
  CheckCircle2,
  Share2,
  ChevronRight,
  ChevronLeft,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  playBoardMoveSound,
  playSparkCelebrationSound,
  playApplause,
  playHeartbeatSound,
  playVictory,
} from '../../utils/sounds';

export type CardCategory = 'never_have_i_ever' | 'deep_bonding' | 'spicy_confession' | 'quirky_fun';

export interface CardPrompt {
  id: string;
  category: CardCategory;
  prompt: string;
  subtext?: string;
  icon: string;
}

export const DEEP_CARDS_CATALOG: CardPrompt[] = [
  // 1. NEVER HAVE I EVER
  {
    id: 'nhie_1',
    category: 'never_have_i_ever',
    prompt: 'Never have I ever stalked someone\'s ex or profile before meeting them.',
    subtext: 'Be completely honest! Both reveal simultaneously.',
    icon: '🥂',
  },
  {
    id: 'nhie_2',
    category: 'never_have_i_ever',
    prompt: 'Never have I ever pretended to be asleep just to avoid getting out of bed.',
    subtext: 'We both know the cozy trap...',
    icon: '🛌',
  },
  {
    id: 'nhie_3',
    category: 'never_have_i_ever',
    prompt: 'Never have I ever re-read old romantic texts from you and smiled like an idiot.',
    subtext: 'The late-night butterflies count!',
    icon: '📱',
  },
  {
    id: 'nhie_4',
    category: 'never_have_i_ever',
    prompt: 'Never have I ever practiced a difficult conversation in the shower or mirror.',
    subtext: 'Rehearsing lines with dramatic hand gestures.',
    icon: '🚿',
  },
  {
    id: 'nhie_5',
    category: 'never_have_i_ever',
    prompt: 'Never have I ever bought something cute or nice and hid the real price tag.',
    subtext: '"Oh this? It was on super sale!"',
    icon: '🛍️',
  },
  {
    id: 'nhie_6',
    category: 'never_have_i_ever',
    prompt: 'Never have I ever ugly-cried during an animated or cheesy romance movie.',
    subtext: 'Pixar movies and tearjerkers get all of us.',
    icon: '🍿',
  },
  {
    id: 'nhie_7',
    category: 'never_have_i_ever',
    prompt: 'Never have I ever sent a risky text and immediately thrown my phone across the bed.',
    subtext: 'Heart racing at 200 BPM waiting for the typing bubbles.',
    icon: '💥',
  },
  {
    id: 'nhie_8',
    category: 'never_have_i_ever',
    prompt: 'Never have I ever eaten the last piece of food or snack and blamed it on someone else.',
    subtext: 'The missing dessert mystery!',
    icon: '🍰',
  },

  // 2. DEEP BONDING & INTIMACY
  {
    id: 'deep_1',
    category: 'deep_bonding',
    prompt: 'What was the exact moment or memory when you first realized you had real feelings for me?',
    subtext: 'Take your time and describe the setting and feeling.',
    icon: '💖',
  },
  {
    id: 'deep_2',
    category: 'deep_bonding',
    prompt: 'What is a small, quiet habit of mine that you love, but you\'ve never told me before?',
    subtext: 'The little things nobody else notices.',
    icon: '✨',
  },
  {
    id: 'deep_3',
    category: 'deep_bonding',
    prompt: 'If you had one wish for where we will be 3 years from today, what does that day look like?',
    subtext: 'Dream big — home, travels, mornings, milestones.',
    icon: '🏡',
  },
  {
    id: 'deep_4',
    category: 'deep_bonding',
    prompt: 'What is something you\'ve been quietly stressed or worried about lately that I can help with?',
    subtext: 'A safe space to let down your guard.',
    icon: '🤝',
  },
  {
    id: 'deep_5',
    category: 'deep_bonding',
    prompt: 'What song or melody immediately reminds you of us every time it plays?',
    subtext: 'Queue it up in our music lounge next!',
    icon: '🎵',
  },
  {
    id: 'deep_6',
    category: 'deep_bonding',
    prompt: 'What is the greatest lesson about love or patience you\'ve learned through our bond?',
    subtext: 'How we grow stronger together.',
    icon: '🌱',
  },

  // 3. SPICY & PLAYFUL CONFESSIONS
  {
    id: 'spicy_1',
    category: 'spicy_confession',
    prompt: 'What outfit, hairstyle, or look of mine makes you look twice every single time?',
    subtext: 'Don\'t hold back on the details!',
    icon: '🔥',
  },
  {
    id: 'spicy_2',
    category: 'spicy_confession',
    prompt: 'Dare: Look directly into each other\'s eyes on camera for 20 seconds without looking away or laughing.',
    subtext: 'Count down together right now!',
    icon: '👀',
  },
  {
    id: 'spicy_3',
    category: 'spicy_confession',
    prompt: 'Whisper or type the most unfiltered thought currently on your mind about us.',
    subtext: 'No filters allowed in Haven.',
    icon: '🤫',
  },
  {
    id: 'spicy_4',
    category: 'spicy_confession',
    prompt: 'What is your idea of the ultimate, unforgettable romantic getaway just for the two of us?',
    subtext: 'Private villas, moonlight dips, secluded mountains...',
    icon: '🌴',
  },
  {
    id: 'spicy_5',
    category: 'spicy_confession',
    prompt: 'Dare: Send a spontaneous candid photo right now — no posing or filters allowed!',
    subtext: 'Capture the genuine cozy moment.',
    icon: '📸',
  },

  // 4. QUIRKY & FUN HYPOTHETICALS
  {
    id: 'fun_1',
    category: 'quirky_fun',
    prompt: 'If a Hollywood movie was made about how we met, who plays each of us and what\'s the genre?',
    subtext: 'Romantic comedy, spy thriller, or chaotic sitcom?',
    icon: '🎬',
  },
  {
    id: 'fun_2',
    category: 'quirky_fun',
    prompt: 'If we were trapped together in an IKEA overnight, what would our survival plan be?',
    subtext: 'Claiming the showroom beds and eating endless meatballs!',
    icon: '🛋️',
  },
  {
    id: 'fun_3',
    category: 'quirky_fun',
    prompt: 'If we woke up tomorrow with $10,000 that we had to spend in 24 hours together, what do we do?',
    subtext: 'Zero saving allowed — pure adventure.',
    icon: '💎',
  },
  {
    id: 'fun_4',
    category: 'quirky_fun',
    prompt: 'What is the absolute weirdest food combination you secretly enjoy when nobody is looking?',
    subtext: 'Dipping fries in milkshakes? Peanut butter on pickles?',
    icon: '🍟',
  },
];

interface DeepCardsGameProps {
  currentUserId: string;
  currentUserName: string;
  partnerName: string;
  currentUserAvatar?: string;
  partnerAvatar?: string;
  isPlayer1?: boolean;
  onBroadcastAction: (actionData: any) => void;
  incomingAction?: any;
}

export const DeepCardsGame: React.FC<DeepCardsGameProps> = ({
  currentUserId,
  currentUserName,
  partnerName,
  currentUserAvatar,
  partnerAvatar,
  isPlayer1 = true,
  onBroadcastAction,
  incomingAction,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CardCategory>('never_have_i_ever');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);

  // Voting state for Never Have I Ever: Record<userId, 'have' | 'never'>
  const [votes, setVotes] = useState<Record<string, 'have' | 'never'>>({});
  // Reaction emojis: Record<userId, string>
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [isFlipped, setIsFlipped] = useState<boolean>(true);

  // Filtered card deck based on category
  const activeDeck = DEEP_CARDS_CATALOG.filter((c) => c.category === selectedCategory);
  const currentCard = activeDeck[currentCardIndex % activeDeck.length] || activeDeck[0];

  // Incoming action handler from partner
  useEffect(() => {
    if (!incomingAction) return;

    if (incomingAction.type === 'card_change') {
      setSelectedCategory(incomingAction.category);
      setCurrentCardIndex(incomingAction.cardIndex);
      setVotes({});
      setReactions({});
      setIsFlipped(true);
      playBoardMoveSound();
    } else if (incomingAction.type === 'card_vote') {
      const updatedVotes = { ...votes, [incomingAction.userId]: incomingAction.choice };
      setVotes(updatedVotes);

      // If both players have voted, trigger audio and celebration
      const voterCount = Object.keys(updatedVotes).length;
      if (voterCount >= 2) {
        playSparkCelebrationSound();
        const choices = Object.values(updatedVotes);
        if (choices.length === 2 && choices[0] === choices[1]) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#ec4899', '#f43f5e', '#8b5cf6'],
          });
        }
      } else {
        playBoardMoveSound();
      }
    } else if (incomingAction.type === 'card_reaction') {
      setReactions((prev) => ({ ...prev, [incomingAction.userId]: incomingAction.reaction }));
      playHeartbeatSound();
    }
  }, [incomingAction, votes]);

  // Next card handler
  const handleNextCard = () => {
    const nextIdx = (currentCardIndex + 1) % activeDeck.length;
    setCurrentCardIndex(nextIdx);
    setVotes({});
    setReactions({});
    playBoardMoveSound();
    onBroadcastAction({
      type: 'card_change',
      category: selectedCategory,
      cardIndex: nextIdx,
    });
  };

  // Prev card handler
  const handlePrevCard = () => {
    const prevIdx = (currentCardIndex - 1 + activeDeck.length) % activeDeck.length;
    setCurrentCardIndex(prevIdx);
    setVotes({});
    setReactions({});
    playBoardMoveSound();
    onBroadcastAction({
      type: 'card_change',
      category: selectedCategory,
      cardIndex: prevIdx,
    });
  };

  // Shuffle random card
  const handleShuffle = () => {
    const randomIdx = Math.floor(Math.random() * activeDeck.length);
    setCurrentCardIndex(randomIdx);
    setVotes({});
    setReactions({});
    playSparkCelebrationSound();
    onBroadcastAction({
      type: 'card_change',
      category: selectedCategory,
      cardIndex: randomIdx,
    });
  };

  // Category change handler
  const handleSelectCategory = (cat: CardCategory) => {
    setSelectedCategory(cat);
    setCurrentCardIndex(0);
    setVotes({});
    setReactions({});
    playBoardMoveSound();
    onBroadcastAction({
      type: 'card_change',
      category: cat,
      cardIndex: 0,
    });
  };

  // Vote for Never Have I Ever ('have' or 'never')
  const handleVote = (choice: 'have' | 'never') => {
    const updatedVotes = { ...votes, [currentUserId]: choice };
    setVotes(updatedVotes);
    playBoardMoveSound();

    onBroadcastAction({
      type: 'card_vote',
      userId: currentUserId,
      choice,
    });
  };

  // Send an instant reaction emoji
  const handleReact = (emoji: string) => {
    setReactions((prev) => ({ ...prev, [currentUserId]: emoji }));
    playHeartbeatSound();
    onBroadcastAction({
      type: 'card_reaction',
      userId: currentUserId,
      reaction: emoji,
    });
  };

  const myVote = votes[currentUserId];
  const partnerId = isPlayer1 ? 'partner' : 'p1';
  // Check if partner voted (any other key in votes object)
  const partnerVoteKey = Object.keys(votes).find((id) => id !== currentUserId);
  const partnerVote = partnerVoteKey ? votes[partnerVoteKey] : undefined;

  const bothVoted = !!myVote && !!partnerVote;

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fade-in text-slate-800">
      {/* Category Navigation Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => handleSelectCategory('never_have_i_ever')}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedCategory === 'never_have_i_ever'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Wine className="w-3.5 h-3.5" />
          <span>Never Have I Ever</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectCategory('deep_bonding')}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedCategory === 'deep_bonding'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Deep Bonding</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectCategory('spicy_confession')}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedCategory === 'spicy_confession'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Spicy & Dares</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectCategory('quirky_fun')}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedCategory === 'quirky_fun'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Smile className="w-3.5 h-3.5" />
          <span>Quirky Fun</span>
        </button>
      </div>

      {/* Main 3D Prompt Card */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border-2 border-indigo-900/60 shadow-2xl flex flex-col items-center text-center overflow-hidden min-h-[300px] justify-between">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Card Badge */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 z-10">
          <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 font-medium">
            Card {currentCardIndex + 1} of {activeDeck.length}
          </span>
          <button
            type="button"
            onClick={handleShuffle}
            className="flex items-center gap-1 text-slate-300 hover:text-white px-2.5 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700 transition cursor-pointer"
            title="Pick a random card"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Random</span>
          </button>
        </div>

        {/* Card Center Content */}
        <div className="my-6 z-10 max-w-lg space-y-3">
          <div className="text-4xl sm:text-5xl animate-bounce mb-2">
            {currentCard.icon}
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-white leading-relaxed tracking-wide">
            "{currentCard.prompt}"
          </h3>
          {currentCard.subtext && (
            <p className="text-xs sm:text-sm text-indigo-200/80 font-medium">
              {currentCard.subtext}
            </p>
          )}
        </div>

        {/* Interactive Voting Section (For Never Have I Ever) */}
        {selectedCategory === 'never_have_i_ever' && (
          <div className="w-full z-10 pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => handleVote('have')}
                className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  myVote === 'have'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-102 ring-2 ring-rose-300'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-rose-300 border border-rose-500/30'
                }`}
              >
                <span>🙋 I Have</span>
                {myVote === 'have' && <CheckCircle2 className="w-4 h-4 text-white" />}
              </button>

              <button
                type="button"
                onClick={() => handleVote('never')}
                className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  myVote === 'never'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-102 ring-2 ring-indigo-300'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                <span>🙅 Never</span>
                {myVote === 'never' && <CheckCircle2 className="w-4 h-4 text-white" />}
              </button>
            </div>

            {/* Live Partner Voting Status */}
            <div className="flex items-center justify-center gap-3 text-xs">
              <span className="text-slate-400">
                {myVote ? '✓ You submitted' : 'Vote above to reveal'}
              </span>
              <span className="text-slate-600">•</span>
              <span className={partnerVote ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {partnerVote ? `✓ ${partnerName || 'Partner'} submitted` : `Waiting for ${partnerName || 'partner'}...`}
              </span>
            </div>

            {/* Mutual Reveal Banner */}
            {bothVoted && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-indigo-500/20 border border-rose-400/40 text-xs font-bold text-center text-rose-200 animate-fade-in">
                {myVote === partnerVote
                  ? `✨ Twin Telepathy! Both of you said "${myVote === 'have' ? 'I Have' : 'Never'}"!`
                  : `👀 Plot Twist! You said "${myVote === 'have' ? 'I Have' : 'Never'}" while ${partnerName} said "${partnerVote === 'have' ? 'I Have' : 'Never'}"! Tell the story!`}
              </div>
            )}
          </div>
        )}

        {/* Reaction Bar for general cards */}
        <div className="w-full z-10 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          {/* Reaction Emotes */}
          <div className="flex items-center gap-1.5">
            {['❤️', '😂', '🌶️', '🥺', '🤯'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReact(emoji)}
                className="w-8 h-8 rounded-full bg-slate-800/70 hover:bg-slate-700 flex items-center justify-center text-base transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                title={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Partner Reaction Badge */}
          {Object.entries(reactions).length > 0 && (
            <div className="flex items-center gap-1 text-xs text-rose-300 font-semibold animate-bounce">
              <span>Reactions:</span>
              {Object.values(reactions).map((e, idx) => (
                <span key={idx} className="text-base">{e}</span>
              ))}
            </div>
          )}

          {/* Card Next / Prev Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevCard}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Previous card"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextCard}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Next card"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
