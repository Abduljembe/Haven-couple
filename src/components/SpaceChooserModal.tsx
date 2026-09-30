import React from 'react';
import {
  Heart,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tv,
  Phone,
  Compass,
  X,
  Zap,
} from 'lucide-react';
import { AuthUser } from '../types';

interface SpaceChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: AuthUser | null;
  onSelectDestination: (destination: 'spouse' | 'friends' | 'single') => void;
}

export const SpaceChooserModal: React.FC<SpaceChooserModalProps> = ({
  isOpen,
  onClose,
  authUser,
  onSelectDestination,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="modal-space-chooser"
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-white flex items-center gap-2">
                <span>Welcome to Haven</span>
                {authUser && (
                  <span className="text-xs font-normal text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                    {authUser.name}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Choose where you would like to go today
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-space-chooser"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Space Options Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* OPTION 1: SPOUSE SANCTUARY */}
            <div
              id="card-choose-spouse"
              onClick={() => onSelectDestination('spouse')}
              className="group relative p-5 rounded-2xl bg-gradient-to-b from-rose-950/40 via-slate-800/80 to-slate-900 border-2 border-rose-500/40 hover:border-rose-400 hover:shadow-xl hover:shadow-rose-500/20 transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 text-[10px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 rounded-full flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5 fill-current" />
                  <span>Primary</span>
                </span>
              </div>

              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center mb-3 shadow-md shadow-rose-500/30 group-hover:scale-105 transition-transform">
                  <Heart className="w-6 h-6 fill-current" />
                </div>

                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5 group-hover:text-rose-300 transition">
                  <span>Spouse Sanctuary</span>
                </h3>
                <p className="text-xs font-medium text-rose-400/90 mb-3">
                  For You & Your Partner
                </p>

                <p className="text-[11px] text-slate-300 leading-relaxed mb-4">
                  1-on-1 private encrypted sanctuary. Jump straight to intimate chat, YouTube co-watching, HD video calls, touch pings, and email invitations.
                </p>

                <div className="space-y-1.5 text-[10px] text-slate-400 mb-4">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>256-bit AES-GCM Encrypted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tv className="w-3 h-3 text-rose-400" />
                    <span>Live YouTube Watch Party</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Real-Time Touch Buzz</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-select-spouse-space"
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-rose-500/20 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Enter Spouse Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* OPTION 2: FRIENDS SPACE */}
            <div
              id="card-choose-friends"
              onClick={() => onSelectDestination('friends')}
              className="group relative p-5 rounded-2xl bg-gradient-to-b from-indigo-950/40 via-slate-800/80 to-slate-900 border-2 border-indigo-500/30 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center mb-3 shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>

                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5 group-hover:text-indigo-300 transition">
                  <span>Friends Space</span>
                </h3>
                <p className="text-xs font-medium text-indigo-400/90 mb-3">
                  Squad Hangout (Max 5)
                </p>

                <p className="text-[11px] text-slate-300 leading-relaxed mb-4">
                  Group watch parties, squad video and audio calls, co-op games, soundboards, and encrypted banter with your closest inner circle.
                </p>

                <div className="space-y-1.5 text-[10px] text-slate-400 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-indigo-400" />
                    <span>Squad HD Group Calls</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Tv className="w-3 h-3 text-indigo-400" />
                    <span>Synchronized Co-Watching</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-indigo-400" />
                    <span>Up to 5 Friends Live</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-select-friends-space"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 group-hover:bg-indigo-600 text-slate-200 group-hover:text-white font-semibold text-xs border border-indigo-500/40 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Enter Friends Space</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* OPTION 3: SINGLES LOUNGE */}
            <div
              id="card-choose-single"
              onClick={() => onSelectDestination('single')}
              className="group relative p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 via-slate-800/80 to-slate-900 border-2 border-purple-500/30 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-amber-500 text-white flex items-center justify-center mb-3 shadow-md shadow-purple-500/30 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>

                <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5 group-hover:text-purple-300 transition">
                  <span>Single</span>
                </h3>
                <p className="text-xs font-medium text-purple-400/90 mb-3">
                  Singles Lounge & Match
                </p>

                <p className="text-[11px] text-slate-300 leading-relaxed mb-4">
                  Discover genuine singles, participate in 3-minute blind speed dates, propose safe real-world date plans with emergency check-ins.
                </p>

                <div className="space-y-1.5 text-[10px] text-slate-400 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>3-Min Blind Spark Rounds</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>ID Verification Badges</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3 h-3 text-purple-400" />
                    <span>Safe Date Coordination</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="btn-select-single-space"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 group-hover:bg-purple-600 text-slate-200 group-hover:text-white font-semibold text-xs border border-purple-500/40 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Enter Singles Lounge</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
