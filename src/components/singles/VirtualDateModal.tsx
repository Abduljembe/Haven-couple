import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Coffee,
  Film,
  Sparkles,
  Moon,
  Swords,
  CheckCircle2,
  X,
  ChevronRight,
  Send,
  Heart,
  CalendarCheck,
  DoorOpen,
} from 'lucide-react';
import { SingleProfile, VirtualDateInvite, VirtualDateTheme } from '../../types';

interface VirtualDateModalProps {
  myProfile: SingleProfile;
  targetProfile?: SingleProfile | null;
  scheduledDates: VirtualDateInvite[];
  onScheduleDate: (invite: Omit<VirtualDateInvite, 'id' | 'createdAt'>) => void;
  onAcceptDate: (inviteId: string) => void;
  onDeclineDate: (inviteId: string) => void;
  onJoinDateRoom: (invite: VirtualDateInvite) => void;
  onClose: () => void;
}

export const VirtualDateModal: React.FC<VirtualDateModalProps> = ({
  myProfile,
  targetProfile,
  scheduledDates,
  onScheduleDate,
  onAcceptDate,
  onDeclineDate,
  onJoinDateRoom,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'my_dates'>(
    targetProfile ? 'schedule' : 'my_dates'
  );

  const [selectedTheme, setSelectedTheme] = useState<VirtualDateTheme>('coffee_chat');
  const [dateOption, setDateOption] = useState<'tonight' | 'tomorrow' | 'weekend' | 'custom'>('tonight');
  const [customTime, setCustomTime] = useState<string>('20:00');
  const [customNote, setCustomNote] = useState<string>('');

  const THEMES: Record<
    VirtualDateTheme,
    { title: string; subtitle: string; icon: React.ReactNode; badge: string; color: string }
  > = {
    coffee_chat: {
      title: 'Virtual Coffee Shop Date ☕',
      subtitle: '30-minute private video chat with lo-fi cafe ambience and light icebreakers',
      icon: <Coffee className="w-5 h-5 text-amber-400" />,
      badge: 'Casual & Relaxed',
      color: 'from-amber-500/20 to-stone-900 border-amber-500/30',
    },
    movie_night: {
      title: 'Co-Viewing Movie Date 🍿',
      subtitle: 'Watch synced YouTube cinema / trailers together in the private theater with live reactions',
      icon: <Film className="w-5 h-5 text-rose-400" />,
      badge: 'Interactive & Cozy',
      color: 'from-rose-500/20 to-stone-900 border-rose-500/30',
    },
    late_night_duo: {
      title: 'Late Night Deep Talks 🌙',
      subtitle: 'Dim ambience audio/video call with curated vulnerability spark questions',
      icon: <Moon className="w-5 h-5 text-indigo-400" />,
      badge: 'Intimate Chemistry',
      color: 'from-indigo-500/20 to-stone-900 border-indigo-500/30',
    },
    trivia_clash: {
      title: 'Compatibility Duel & Trivia ⚔️',
      subtitle: '5-minute dilemmas, quick-fire trivia, and playful couple challenges',
      icon: <Swords className="w-5 h-5 text-emerald-400" />,
      badge: 'Playful & Fun',
      color: 'from-emerald-500/20 to-stone-900 border-emerald-500/30',
    },
    stargazing: {
      title: 'Ambient Music & Chill ✨',
      subtitle: 'Share your favorite tunes, vibe, and talk without any pressure',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      badge: 'Unwind',
      color: 'from-purple-500/20 to-stone-900 border-purple-500/30',
    },
  };

  const getScheduledTimestamp = () => {
    const now = new Date();
    if (dateOption === 'tonight') {
      now.setHours(20, 0, 0, 0);
      if (now.getTime() < Date.now()) now.setHours(now.getHours() + 2);
      return now.getTime();
    }
    if (dateOption === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(19, 30, 0, 0);
      return d.getTime();
    }
    if (dateOption === 'weekend') {
      const d = new Date();
      const day = d.getDay();
      const diff = (6 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(20, 0, 0, 0);
      return d.getTime();
    }
    const [h, m] = customTime.split(':');
    const d = new Date();
    d.setHours(parseInt(h) || 20, parseInt(m) || 0, 0, 0);
    return d.getTime();
  };

  const handleSendDateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProfile) return;

    const themeInfo = THEMES[selectedTheme];
    const scheduledTime = getScheduledTimestamp();

    onScheduleDate({
      fromProfile: myProfile,
      toProfile: targetProfile,
      theme: selectedTheme,
      title: themeInfo.title,
      scheduledTime,
      note: customNote.trim() || undefined,
      status: 'pending',
      roomId: `haven-date-${Date.now().toString(36)}`,
      passkey: Math.floor(1000 + Math.random() * 9000).toString(),
    });

    setActiveTab('my_dates');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Virtual First-Date Scheduler
              </h3>
              <p className="text-[11px] text-stone-400">
                Turn sparks into confirmed virtual dates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-stone-800 bg-stone-950/30 flex gap-2">
          {targetProfile && (
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-2.5 text-xs font-semibold px-3 border-b-2 flex items-center gap-1.5 transition ${
                activeTab === 'schedule'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Propose Date with {targetProfile.name}</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('my_dates')}
            className={`pb-2.5 text-xs font-semibold px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'my_dates'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled Dates ({scheduledDates.length})</span>
          </button>
        </div>

        {/* Tab 1: Propose Virtual Date */}
        {activeTab === 'schedule' && targetProfile && (
          <form onSubmit={handleSendDateInvite} className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* Target profile preview */}
            <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-2xl flex items-center gap-3">
              <img
                src={targetProfile.avatar}
                alt={targetProfile.name}
                className="w-12 h-12 rounded-full object-cover border border-purple-500/50"
              />
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1">
                  <span>Proposing date to {targetProfile.name}, {targetProfile.age}</span>
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" />
                </div>
                <div className="text-stone-400 text-[11px]">{targetProfile.city} • {targetProfile.currentVibe}</div>
              </div>
            </div>

            {/* Choose Theme */}
            <div>
              <label className="block font-semibold text-stone-300 mb-2">
                Select Virtual Date Theme
              </label>
              <div className="space-y-2">
                {(Object.keys(THEMES) as VirtualDateTheme[]).map((key) => {
                  const theme = THEMES[key];
                  const isSelected = selectedTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedTheme(key)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition bg-gradient-to-r ${
                        isSelected
                          ? `${theme.color} ring-1 ring-purple-400 shadow-md`
                          : 'from-stone-950/60 to-stone-950/60 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-stone-900/90 border border-stone-700 shrink-0">
                        {theme.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{theme.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 text-stone-300">
                            {theme.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                          {theme.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slot selector */}
            <div>
              <label className="block font-semibold text-stone-300 mb-2">
                Suggested Time Slot
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'tonight', label: 'Tonight', desc: '8:00 PM' },
                  { id: 'tomorrow', label: 'Tomorrow', desc: '7:30 PM' },
                  { id: 'weekend', label: 'Weekend', desc: 'Saturday 8 PM' },
                  { id: 'custom', label: 'Custom', desc: 'Pick time' },
                ].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setDateOption(slot.id as typeof dateOption)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      dateOption === slot.id
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                        : 'bg-stone-950/60 border-stone-800 text-stone-300 hover:bg-stone-900'
                    }`}
                  >
                    <div className="font-bold text-xs">{slot.label}</div>
                    <div className="text-[10px] opacity-80">{slot.desc}</div>
                  </button>
                ))}
              </div>

              {dateOption === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-stone-400">Set Time:</span>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white"
                  />
                </div>
              )}
            </div>

            {/* Personal Note */}
            <div>
              <label className="block font-semibold text-stone-300 mb-1">
                Personal Message / Invitation Note
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Would love to grab virtual tea and watch some funny trailers together!"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>Send Virtual Date Invitation</span>
            </button>
          </form>
        )}

        {/* Tab 2: My Scheduled Dates */}
        {activeTab === 'my_dates' && (
          <div className="p-5 overflow-y-auto space-y-3 text-xs">
            {scheduledDates.length === 0 ? (
              <div className="p-8 text-center bg-stone-950/40 rounded-2xl border border-stone-800 space-y-2">
                <Calendar className="w-8 h-8 text-stone-600 mx-auto mb-1" />
                <h4 className="text-sm font-bold text-stone-300">No dates scheduled yet</h4>
                <p className="text-stone-400 max-w-xs mx-auto text-[11px]">
                  Browse profiles in the Singles Lounge or accept date invitations to fill your calendar!
                </p>
              </div>
            ) : (
              scheduledDates.map((date) => {
                const isHost = date.fromProfile.id === myProfile.id;
                const partner = isHost ? date.toProfile : date.fromProfile;
                const formattedDate = new Date(date.scheduledTime).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={date.id}
                    className="p-4 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={partner.avatar}
                          alt={partner.name}
                          className="w-11 h-11 rounded-full object-cover border border-purple-500/40"
                        />
                        <div>
                          <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                            {partner.name}
                            <span className="text-[10px] text-stone-400 font-normal">
                              ({isHost ? 'Invited by you' : 'Invited you'})
                            </span>
                          </h4>
                          <div className="text-purple-400 text-xs font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formattedDate}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          date.status === 'accepted'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : date.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-stone-800 text-stone-400 border-stone-700'
                        }`}
                      >
                        {date.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="bg-stone-900/90 p-2.5 rounded-xl border border-stone-800 text-stone-300">
                      <span className="font-semibold text-white block">{date.title}</span>
                      {date.note && <span className="text-[11px] italic text-stone-400">"{date.note}"</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-800/80">
                      {!isHost && date.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onDeclineDate(date.id)}
                            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => onAcceptDate(date.id)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-emerald-600/20"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept Date</span>
                          </button>
                        </>
                      )}

                      {(date.status === 'accepted' || isHost) && (
                        <button
                          type="button"
                          onClick={() => onJoinDateRoom(date)}
                          className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/25"
                        >
                          <DoorOpen className="w-3.5 h-3.5" />
                          <span>Launch Date Room Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
