import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Heart,
  Send,
  Copy,
  Check,
  Sparkles,
  Clock,
  ShieldCheck,
  Coffee,
  Compass,
  MessageSquare,
  RefreshCw,
  Flame,
  Award,
  AlertTriangle,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import {
  SingleProfile,
  GentleClosureCategory,
  GentleClosureTone,
  GentleClosureTemplate,
  GentleClosureMessage,
  ActiveConversationItem,
} from '../../types';

interface GentleClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: SingleProfile;
  targetProfile?: SingleProfile | null;
  activeConversations: ActiveConversationItem[];
  onSendClosure: (closure: GentleClosureMessage) => void;
  onPledgeZeroGhost: () => void;
  onReviveConversation?: (partnerProfile: SingleProfile, icebreaker: string) => void;
  onScheduleDate?: (partnerProfile: SingleProfile) => void;
}

const CLOSURE_TEMPLATES: GentleClosureTemplate[] = [
  {
    id: 'no_spark',
    category: 'no_spark',
    categoryLabel: 'No Romantic Spark',
    categoryEmoji: '💖',
    title: 'Warm & Honest About Chemistry',
    preview: 'Enjoyed chatting, but didn\'t feel the romantic spark.',
    templateText:
      "Hi {name}! I really enjoyed chatting with you and getting to know your vibe. However, after reflecting on things, I don't feel a strong romantic spark between us. Rather than leave you wondering or disappear, I wanted to be straightforward and respectful. I genuinely wish you the absolute best on your journey!",
    tags: ['Most Popular', 'Respectful', 'Clear'],
  },
  {
    id: 'different_goals',
    category: 'different_goals',
    categoryLabel: 'Different Life Goals',
    categoryEmoji: '🧭',
    title: 'Misaligned Dating Intentions',
    preview: 'Looking for different things right now.',
    templateText:
      "Hey {name}, thanks for taking the time to share your perspective with me! You seem wonderful, but as we talked more, I realized we're looking for different things in dating and life right now. I think it's best for both of us to find what truly fits our goals. Thank you for being so genuine and kind!",
    tags: ['Intentional', 'Future-Focused'],
  },
  {
    id: 'friends_vibe',
    category: 'friends_vibe',
    categoryLabel: 'Platonic Friend Energy',
    categoryEmoji: '☕',
    title: 'Great Friend Chemistry Only',
    preview: 'Felt awesome banter, but more as a friend.',
    templateText:
      "Hey {name}! Honestly, I think you're awesome and super interesting, but I feel much more of a great friend / hangout vibe between us rather than romantic chemistry. If you'd ever be open to strictly platonic connection or trivia banter, I'd welcome it; if not, no pressure at all and I wish you wonderful dates ahead!",
    tags: ['Friendship', 'Low Pressure'],
  },
  {
    id: 'taking_break',
    category: 'taking_break',
    categoryLabel: 'Stepping Back from Dating',
    categoryEmoji: '⏸️',
    title: 'Pausing Dating Apps',
    preview: 'Need to focus on personal priorities right now.',
    templateText:
      "Hi {name}, I wanted to reach out because you've been so kind to talk to. I've realized that I don't currently have the emotional capacity or time to date intentionally right now, and I'm stepping away from the app. I didn't want to just fade out or leave you hanging. Thank you for the pleasant conversations!",
    tags: ['Self-Care', 'Transparent'],
  },
  {
    id: 'bad_timing',
    category: 'bad_timing',
    categoryLabel: 'Mismatched Timing & Pacing',
    categoryEmoji: '⏳',
    title: 'Schedule & Pacing Mismatch',
    preview: 'Hard to align schedules without giving half-energy.',
    templateText:
      "Hey {name}, it feels like our schedules and communication pacing are a bit out of sync right now. You deserve someone who can match your energy fully and make time consistently, and right now I can't provide that. Wishing you nothing but great connections and happiness!",
    tags: ['Timing', 'Empathetic'],
  },
];

const REVIVAL_ICEBREAKERS = [
  "⚡ Quick truth check: What's your most controversial food take that you will defend to the grave?",
  "☕ If we had 10 minutes to grab a coffee or matcha right now, what would your order be?",
  "✈️ If you could teleport anywhere for a 48-hour spontaneous weekend escape, where are we landing?",
  "🎶 Aux cord test: What is that one song you will never skip, no matter who is in the car?",
  "🎬 What is a movie you think everyone pretends to love, but is actually completely overrated?",
];

export const GentleClosureModal: React.FC<GentleClosureModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  targetProfile,
  activeConversations,
  onSendClosure,
  onPledgeZeroGhost,
  onReviveConversation,
  onScheduleDate,
}) => {
  const [activeTab, setActiveTab] = useState<'closure' | 'momentum' | 'pledge'>('closure');
  const [selectedPartner, setSelectedPartner] = useState<SingleProfile | null>(
    targetProfile || (activeConversations[0]?.partnerProfile ?? null)
  );
  const [selectedCategory, setSelectedCategory] = useState<GentleClosureCategory>('no_spark');
  const [selectedTone, setSelectedTone] = useState<GentleClosureTone>('gentle');
  const [customText, setCustomText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [revivalCopied, setRevivalCopied] = useState<string | null>(null);

  // Initialize text when category or partner changes
  React.useEffect(() => {
    const template = CLOSURE_TEMPLATES.find((t) => t.category === selectedCategory);
    if (template) {
      const partnerName = selectedPartner ? selectedPartner.name : 'there';
      let text = template.templateText.replace(/\{name\}/g, partnerName);

      // Adjust tone slightly if direct vs gentle
      if (selectedTone === 'direct') {
        text = text
          .replace(/rather than leave you wondering or disappear, /gi, '')
          .replace(/honestly, /gi, '');
      } else if (selectedTone === 'playful') {
        text = `✨ ${text} Thanks for being a delight to converse with!`;
      }
      setCustomText(text);
    }
  }, [selectedCategory, selectedPartner, selectedTone]);

  if (!isOpen) return null;

  const handleCopyText = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSend = () => {
    if (!selectedPartner) return;
    const closureMsg: GentleClosureMessage = {
      id: `closure_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      fromProfile: currentProfile,
      toProfile: selectedPartner,
      category: selectedCategory,
      tone: selectedTone,
      text: customText,
      sentAt: Date.now(),
    };
    onSendClosure(closureMsg);
    setIsSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 bg-stone-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300">
              <Compass className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Ghost-Free Dating & Gentle Closure
                </h3>
                {currentProfile.respectfulCommunicatorBadge && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-bold flex items-center gap-1">
                    <Award className="w-3 h-3 text-pink-400" />
                    Zero-Ghost Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                Exit conversations with kindness, emotional maturity, and zero ambiguity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-stone-800 bg-stone-950/40 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('closure')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'closure'
                ? 'border-pink-500 text-pink-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gentle Closure Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('momentum')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'momentum'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>48h Momentum Compass ({activeConversations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pledge')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'pledge'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Respectful Pledge Badge</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: GENTLE CLOSURE GENERATOR */}
          {activeTab === 'closure' && (
            <div className="space-y-5">
              {isSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-300 mx-auto flex items-center justify-center">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="text-base font-bold text-white">
                    Gentle Closure Delivered Gracefully
                  </h4>
                  <p className="text-xs text-stone-300 max-w-md mx-auto">
                    You chose emotional maturity over ghosting. Your respectful communication
                    makes the dating scene safer, kinder, and clearer for everyone.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setIsSent(false)}
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition"
                    >
                      Write Another
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                    >
                      Back to Lounge
                    </button>
                  </div>
                </motion.div>
              ) : (
                <>
                  {/* Select Recipient */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-300 flex items-center justify-between">
                      <span>1. Select Recipient:</span>
                      <span className="text-[11px] text-stone-400">
                        {activeConversations.length} active match(es)
                      </span>
                    </label>

                    {activeConversations.length > 0 ? (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {activeConversations.map((conv) => {
                          const isSelected = selectedPartner?.id === conv.partnerProfile.id;
                          return (
                            <button
                              key={conv.partnerProfile.id}
                              type="button"
                              onClick={() => setSelectedPartner(conv.partnerProfile)}
                              className={`px-3 py-2 rounded-xl border transition flex items-center gap-2 shrink-0 text-left ${
                                isSelected
                                  ? 'bg-pink-950/50 border-pink-500/60 text-white'
                                  : 'bg-stone-800/60 border-stone-700/60 text-stone-300 hover:bg-stone-800'
                              }`}
                            >
                              <img
                                src={conv.partnerProfile.avatar}
                                alt={conv.partnerProfile.name}
                                className="w-6 h-6 rounded-full object-cover border border-stone-600"
                              />
                              <span className="text-xs font-semibold">{conv.partnerProfile.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : selectedPartner ? (
                      <div className="p-3 bg-stone-800/60 border border-stone-700 rounded-xl flex items-center gap-3">
                        <img
                          src={selectedPartner.avatar}
                          alt={selectedPartner.name}
                          className="w-8 h-8 rounded-full object-cover border border-stone-600"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{selectedPartner.name}</div>
                          <div className="text-[11px] text-stone-400">
                            {selectedPartner.city} • {selectedPartner.age}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-stone-800/40 border border-stone-800 rounded-xl text-xs text-stone-400">
                        Enter message or select a profile from the Lounge.
                      </div>
                    )}
                  </div>

                  {/* 2. Choose Scenario */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-300">
                      2. Choose Polite Closure Theme:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CLOSURE_TEMPLATES.map((tmpl) => {
                        const isSelected = selectedCategory === tmpl.category;
                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => setSelectedCategory(tmpl.category)}
                            className={`p-3 rounded-2xl border text-left transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-pink-950/60 to-purple-950/60 border-pink-500/70 shadow-md ring-1 ring-pink-500/40'
                                : 'bg-stone-800/50 border-stone-700/60 hover:bg-stone-800 text-stone-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{tmpl.categoryEmoji}</span>
                              <span className="text-xs font-bold text-white">
                                {tmpl.categoryLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-400 line-clamp-1">{tmpl.preview}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Tone Selector */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-stone-300">Tone Flavor:</span>
                    <div className="flex items-center gap-1.5">
                      {(
                        [
                          { key: 'gentle', label: '🌸 Warm & Kind' },
                          { key: 'direct', label: '🎯 Direct' },
                          { key: 'playful', label: '✨ Friendly' },
                        ] as const
                      ).map((tone) => (
                        <button
                          key={tone.key}
                          type="button"
                          onClick={() => setSelectedTone(tone.key)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            selectedTone === tone.key
                              ? 'bg-pink-600 text-white shadow'
                              : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {tone.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Editable Text Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-stone-300">
                        Message Preview & Customization:
                      </label>
                      <span className="text-[10px] text-stone-400">
                        {customText.length} characters
                      </span>
                    </div>
                    <textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={4}
                      className="w-full p-3.5 bg-stone-950 border border-stone-700 rounded-2xl text-xs text-stone-200 leading-relaxed focus:border-pink-500 focus:outline-none resize-none shadow-inner"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied for SMS / Haven!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-stone-400" />
                          <span>Copy Message Text</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!selectedPartner}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Polite Closure via Haven</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: 48-HOUR CONVERSATION MOMENTUM COMPASS */}
          {activeTab === 'momentum' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-stone-300 space-y-1">
                  <div className="font-bold text-amber-300">The 48-Hour Momentum Rule</div>
                  <p>
                    Conversations that stall for over 48 hours without a date proposal or fresh spark
                    almost always end in silent ghosting. Keep momentum alive by asking a fresh
                    curated icebreaker, planning a virtual date, or closing with grace!
                  </p>
                </div>
              </div>

              {activeConversations.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs border border-dashed border-stone-800 rounded-2xl">
                  No open conversations right now. Start a Blind Spark or wave at singles in the Lounge!
                </div>
              ) : (
                <div className="space-y-3">
                  {activeConversations.map((conv) => {
                    const elapsedHours = Math.floor(
                      (Date.now() - conv.lastActiveTimestamp) / (1000 * 60 * 60)
                    );
                    const isDecaying = elapsedHours >= 24;
                    const isCritical = elapsedHours >= 40;

                    return (
                      <div
                        key={conv.id}
                        className="p-4 rounded-2xl bg-stone-800/40 border border-stone-700/60 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={conv.partnerProfile.avatar}
                              alt={conv.partnerProfile.name}
                              className="w-10 h-10 rounded-full object-cover border border-stone-600"
                            />
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{conv.partnerProfile.name}</span>
                                <span className="text-[10px] text-stone-400 font-normal">
                                  ({conv.partnerProfile.city})
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-400 line-clamp-1 italic">
                                "{conv.lastMessageText || 'Chatting in progress...'}"
                              </p>
                            </div>
                          </div>

                          {/* Time elapsed badge */}
                          <div className="text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isCritical
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : isDecaying
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {elapsedHours}h ago
                            </span>
                            <div className="text-[9px] text-stone-400 mt-0.5">
                              {isCritical ? 'Critical (Stalling)' : isDecaying ? 'Fading' : 'Active'}
                            </div>
                          </div>
                        </div>

                        {/* Momentum Actions */}
                        <div className="pt-2 border-t border-stone-700/50 flex flex-wrap items-center gap-2">
                          {/* Revive with icebreaker */}
                          <button
                            type="button"
                            onClick={() => {
                              const prompt =
                                REVIVAL_ICEBREAKERS[
                                  Math.floor(Math.random() * REVIVAL_ICEBREAKERS.length)
                                ];
                              if (onReviveConversation) {
                                onReviveConversation(conv.partnerProfile, prompt);
                              } else {
                                navigator.clipboard.writeText(prompt);
                                setRevivalCopied(conv.id);
                                setTimeout(() => setRevivalCopied(null), 2500);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-bold rounded-xl transition flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>{revivalCopied === conv.id ? 'Icebreaker Copied!' : 'Revive with Icebreaker ⚡'}</span>
                          </button>

                          {/* Plan date */}
                          <button
                            type="button"
                            onClick={() => onScheduleDate && onScheduleDate(conv.partnerProfile)}
                            className="px-2.5 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-200 text-[11px] font-bold rounded-xl transition flex items-center gap-1"
                          >
                            <Coffee className="w-3 h-3 text-pink-400" />
                            <span>Schedule Virtual Date 📅</span>
                          </button>

                          {/* Gentle closure */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPartner(conv.partnerProfile);
                              setActiveTab('closure');
                            }}
                            className="px-2.5 py-1.5 bg-stone-700 hover:bg-stone-600 text-stone-200 text-[11px] font-bold rounded-xl transition flex items-center gap-1 ml-auto"
                          >
                            <Compass className="w-3 h-3 text-stone-400" />
                            <span>Send Closure 🕊️</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RESPECTFUL COMMUNICATOR PLEDGE */}
          {activeTab === 'pledge' && (
            <div className="space-y-5">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/40 via-stone-900 to-pink-950/30 border border-pink-500/30 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/40 mx-auto flex items-center justify-center">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    The Zero-Ghosting Honor Pledge
                  </h4>
                  <p className="text-xs text-stone-300 max-w-md mx-auto mt-1 leading-relaxed">
                    By activating this badge, you pledge to respect other people's time and heart.
                    If the vibe isn't right, you promise to send a polite closure note instead of
                    disappearing.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left pt-2">
                  <div className="p-3 bg-stone-900/80 border border-stone-800 rounded-2xl space-y-1">
                    <span className="text-base">🤝</span>
                    <div className="text-xs font-bold text-white">Mutual Dignity</div>
                    <p className="text-[10px] text-stone-400">Treat people as humans, not matches on a screen.</p>
                  </div>
                  <div className="p-3 bg-stone-900/80 border border-stone-800 rounded-2xl space-y-1">
                    <span className="text-base">🕊️</span>
                    <div className="text-xs font-bold text-white">Clear Closure</div>
                    <p className="text-[10px] text-stone-400">One short message saves days of overthinking.</p>
                  </div>
                  <div className="p-3 bg-stone-900/80 border border-stone-800 rounded-2xl space-y-1">
                    <span className="text-base">⭐</span>
                    <div className="text-xs font-bold text-white">Profile Prestige</div>
                    <p className="text-[10px] text-stone-400">Get 2x more replies from high-intent singles.</p>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      onPledgeZeroGhost();
                    }}
                    className={`px-6 py-3 rounded-2xl font-bold text-xs transition shadow-lg flex items-center justify-center gap-2 mx-auto ${
                      currentProfile.respectfulCommunicatorBadge
                        ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300 cursor-default'
                        : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {currentProfile.respectfulCommunicatorBadge
                        ? '✓ You Pledged: Zero-Ghost Verified Member'
                        : 'Sign the Pledge & Get Verified Badge 🕊️'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
