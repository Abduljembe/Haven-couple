import React, { useState } from 'react';
import {
  HeartHandshake,
  X,
  Droplets,
  Heart,
  Activity,
  Coffee,
  Sparkles,
  Smile,
  Gift,
  CheckCircle2,
  Send,
  Flame,
  Award,
  Zap,
} from 'lucide-react';
import { LoveCoupon, CarePromptEvent, UserProfile } from '../types';
import confetti from 'canvas-confetti';

interface CareTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  partner?: UserProfile;
  partnerName: string;
  coupons: LoveCoupon[];
  streakDays: number;
  onRedeemCoupon: (couponId: string) => void;
  onAddCoupon: (coupon: LoveCoupon) => void;
  onSendCarePrompt: (promptType: 'water' | 'hug' | 'stretch' | 'meal' | 'kiss' | 'sleep' | 'breathe') => void;
}

const CARE_ACTIONS: {
  type: 'water' | 'hug' | 'stretch' | 'meal' | 'kiss' | 'sleep' | 'breathe';
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  border: string;
  message: string;
}[] = [
  {
    type: 'water',
    title: 'Hydration Ping',
    icon: Droplets,
    color: 'text-sky-500',
    bgColor: 'bg-sky-50',
    border: 'border-sky-200',
    message: 'Drink some fresh water, my love! Stay hydrated 💕💧',
  },
  {
    type: 'hug',
    title: 'Virtual Warm Hug',
    icon: HeartHandshake,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    border: 'border-rose-200',
    message: 'Wrapping you in a huge, warm 30-second virtual hug right now 🤗💖',
  },
  {
    type: 'stretch',
    title: 'Posture & Stretch',
    icon: Activity,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    border: 'border-emerald-200',
    message: 'Time for a 2-minute spine stretch and shoulder roll! 🧘‍♀️',
  },
  {
    type: 'meal',
    title: 'Eat a Good Meal',
    icon: Coffee,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    border: 'border-amber-200',
    message: 'Did you eat lunch yet? Take care of your energy, my sweetheart! 🍲',
  },
  {
    type: 'kiss',
    title: 'Forehead Kiss',
    icon: Heart,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    border: 'border-pink-200',
    message: 'Sending a soft, tender forehead kiss to melt all your stress away 💋✨',
  },
  {
    type: 'breathe',
    title: 'Deep Breath Together',
    icon: Sparkles,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    border: 'border-purple-200',
    message: 'Inhale deep for 4 seconds... hold for 4... exhale slow. You got this! 🌸',
  },
];

export const CareTrackerModal: React.FC<CareTrackerModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  partner,
  partnerName,
  coupons,
  streakDays,
  onRedeemCoupon,
  onAddCoupon,
  onSendCarePrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'care' | 'coupons'>('care');
  const [newCouponTitle, setNewCouponTitle] = useState<string>('');
  const [newCouponDesc, setNewCouponDesc] = useState<string>('');
  const [newCouponEmoji, setNewCouponEmoji] = useState<string>('🎟️');
  const [isCreatingCoupon, setIsCreatingCoupon] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSendPrompt = (type: 'water' | 'hug' | 'stretch' | 'meal' | 'kiss' | 'sleep' | 'breathe') => {
    onSendCarePrompt(type);
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
  };

  const handleCreateCoupon = () => {
    if (!newCouponTitle.trim()) return;

    const coupon: LoveCoupon = {
      id: `coupon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: newCouponTitle.trim(),
      description: newCouponDesc.trim() || 'Redeemable anytime for instant love and cuddles.',
      emoji: newCouponEmoji,
      category: 'treat',
      isRedeemed: false,
      createdBy: currentUserId,
    };

    onAddCoupon(coupon);
    setNewCouponTitle('');
    setNewCouponDesc('');
    setIsCreatingCoupon(false);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        id="care-tracker-modal"
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-rose-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-50 via-pink-50 to-emerald-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-200 flex items-center justify-center text-rose-600">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>Care Tracker & Love Bank</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                  <span>{streakDays} Day Streak</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Daily health care nudges & romantic coupon bank for two
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-rose-100 bg-slate-50/70 p-1.5 gap-1.5 px-6">
          <button
            onClick={() => setActiveTab('care')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'care'
                ? 'bg-white text-rose-600 shadow-xs border border-rose-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Instant Care Nudges</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'coupons'
                ? 'bg-white text-rose-600 shadow-xs border border-rose-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Love Coupons Bank ({coupons.filter((c) => !c.isRedeemed).length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Care Nudges */}
          {activeTab === 'care' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
                    🔥
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-950">Daily Connection Streak</h4>
                    <p className="text-[11px] text-rose-800/80">
                      You and {partner ? partner.name : partnerName} have taken care of each other for {streakDays} consecutive days!
                    </p>
                  </div>
                </div>
                <Award className="w-6 h-6 text-amber-500" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-3">
                  Send One-Tap Self-Care Ping to {partner ? partner.name : partnerName}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CARE_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.type}
                        onClick={() => handleSendPrompt(action.type)}
                        className={`p-4 rounded-2xl border ${action.border} ${action.bgColor} text-left transition-all hover:scale-102 flex items-start gap-3.5 cursor-pointer shadow-2xs`}
                      >
                        <div className={`p-2.5 rounded-xl bg-white shadow-2xs ${action.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                            <span>{action.title}</span>
                            <Send className="w-3 h-3 text-slate-400" />
                          </h4>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            "{action.message}"
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Love Coupons Bank */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Coupons available to redeem
                </span>
                <button
                  onClick={() => setIsCreatingCoupon(!isCreatingCoupon)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {isCreatingCoupon ? 'Cancel' : '+ Deposit New Coupon'}
                </button>
              </div>

              {/* Creator Form */}
              {isCreatingCoupon && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 animate-scale-in">
                  <h4 className="text-xs font-bold text-rose-950">Deposit Love Coupon into Bank</h4>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Emoji (e.g. 🍕)"
                      value={newCouponEmoji}
                      onChange={(e) => setNewCouponEmoji(e.target.value)}
                      className="col-span-1 px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs text-center"
                    />
                    <input
                      type="text"
                      placeholder="Coupon title (e.g. 30-min Back Massage)"
                      value={newCouponTitle}
                      onChange={(e) => setNewCouponTitle(e.target.value)}
                      className="col-span-3 px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs text-slate-800"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Short description or romantic terms..."
                    value={newCouponDesc}
                    onChange={(e) => setNewCouponDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs text-slate-800"
                  />
                  <button
                    onClick={handleCreateCoupon}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
                  >
                    Deposit in Vault ✨
                  </button>
                </div>
              )}

              {/* Coupons List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl border-2 border-dashed transition-all flex flex-col justify-between gap-3 relative ${
                      c.isRedeemed
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-gradient-to-br from-pink-50/70 to-rose-50/70 border-rose-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{c.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{c.title}</h4>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                          {c.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-rose-200/50">
                      <span className="text-[10px] text-slate-500">
                        {c.isRedeemed ? 'Redeemed ✓' : 'Valid Anytime'}
                      </span>
                      {!c.isRedeemed && (
                        <button
                          onClick={() => {
                            onRedeemCoupon(c.id);
                            confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
                          }}
                          className="px-3 py-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                        >
                          Redeem Now 🎟️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
