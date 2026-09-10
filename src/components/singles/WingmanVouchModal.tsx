import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Sparkles,
  CheckCircle2,
  X,
  Volume2,
  Users,
  Quote,
  Flame,
  Award,
} from 'lucide-react';
import { SingleProfile, WingmanVouchData } from '../../types';

interface WingmanVouchModalProps {
  myProfile: SingleProfile;
  onSaveVouch: (vouch: WingmanVouchData) => void;
  onClose: () => void;
}

export const WingmanVouchModal: React.FC<WingmanVouchModalProps> = ({
  myProfile,
  onSaveVouch,
  onClose,
}) => {
  const [friendName, setFriendName] = useState(myProfile.wingmanVouch?.friendName || 'Taylor');
  const [relationship, setRelationship] = useState(
    myProfile.wingmanVouch?.relationship || 'Best Friend of 5+ Years'
  );
  const [highlightTag, setHighlightTag] = useState(
    myProfile.wingmanVouch?.highlightTag || 'Green Flag Certified'
  );
  const [quote, setQuote] = useState(
    myProfile.wingmanVouch?.quote ||
      `${myProfile.name || 'They'} will literally drop whatever they are doing to help you fix a flat tire. 10/10 human being who makes the best carbonara in the city!`
  );

  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(myProfile.wingmanVouch?.durationSec || 12);
  const [hasAudio, setHasAudio] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const PRESET_VOUCHES = [
    {
      friendName: 'Marcus',
      relationship: 'College Roommate',
      highlightTag: 'Golden Retriever Energy',
      quote: `${myProfile.name} is the most emotionally mature person I know. Will always listen, gives top-tier music recommendations, and never leaves unwashed dishes!`,
    },
    {
      friendName: 'Maya',
      relationship: 'Travel Buddy',
      highlightTag: 'Green Flag Certified',
      quote: `Traveled through 4 countries with ${myProfile.name} and never had a single argument. Pure calm vibes, hilarious humor, and great taste in restaurants.`,
    },
    {
      friendName: 'Devon',
      relationship: 'Best Friend of 7 Years',
      highlightTag: 'Chef Level Cooking',
      quote: `If you want someone who actually remembers your coffee order and brings you soup when you are sick, ${myProfile.name} is your person. Highly approved by the group chat!`,
    },
  ];

  const handleToggleRecord = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setHasAudio(true);
    } else {
      // Start recording
      setIsRecording(true);
      setRecordDuration(0);
      setHasAudio(false);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 15) {
            setIsRecording(false);
            setHasAudio(true);
            if (timerRef.current) clearInterval(timerRef.current);
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setTimeout(() => setIsPlaying(false), recordDuration * 1000);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_VOUCHES[0]) => {
    setFriendName(preset.friendName);
    setRelationship(preset.relationship);
    setHighlightTag(preset.highlightTag);
    setQuote(preset.quote);
    setRecordDuration(14);
    setHasAudio(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) return;

    onSaveVouch({
      friendName: friendName.trim(),
      relationship: relationship.trim(),
      highlightTag: highlightTag.trim(),
      quote: quote.trim(),
      durationSec: recordDuration || 12,
      audioUrl: 'mock-wingman-audio.mp3',
      verifiedAt: Date.now(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Wingman Voice Vouch
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-500/30">
                  Friends Vouch
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Let your best friend vouch for your personality & green flags
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Quick presets */}
          <div>
            <span className="block font-semibold text-stone-300 mb-2 flex items-center justify-between">
              <span>Quick Authentic Presets:</span>
              <span className="text-[10px] text-purple-400">Tap to load example vouch</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_VOUCHES.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="p-2 rounded-xl bg-stone-950/60 hover:bg-purple-950/40 border border-stone-800 hover:border-purple-500/50 text-left transition group"
                >
                  <div className="font-bold text-stone-200 group-hover:text-purple-300 truncate">
                    {p.friendName} ({p.relationship.split(' ')[0]})
                  </div>
                  <div className="text-[10px] text-stone-400 truncate">{p.highlightTag}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-300 mb-1">
                Friend's Name *
              </label>
              <input
                type="text"
                required
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="e.g. Taylor"
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-300 mb-1">
                Relationship
              </label>
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Best Friend of 5 Yrs"
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-300 mb-1">
              Top Vouch Badge / Highlight Tag
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                'Green Flag Certified 🟢',
                'Golden Retriever Energy 🐕',
                '10/10 Aux Chord 🎶',
                'Master Chef 🍝',
                'Emotionally Mature 🧠',
                'Group Chat Favorite ✨',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setHighlightTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                    highlightTag === tag
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-300 mb-1">
              Friend's Quote / Endorsement Note
            </label>
            <textarea
              rows={3}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Why should someone date your friend?"
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* 15-second Audio Voice Clip Box */}
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <span>15s Friend Audio Voice Clip</span>
              </span>
              <span className="text-[10px] text-purple-300 font-mono">
                {recordDuration}s / 15s max
              </span>
            </div>

            {/* Simulated Animated Waveform */}
            <div className="h-12 bg-stone-900 rounded-xl px-4 flex items-center justify-center gap-1 overflow-hidden border border-stone-800">
              {Array.from({ length: 28 }).map((_, idx) => {
                const height =
                  isRecording || isPlaying
                    ? Math.max(15, (Math.sin(idx * 0.7 + Date.now() / 200) * 0.5 + 0.5) * 100)
                    : (idx % 4 + 1) * 20;
                return (
                  <span
                    key={idx}
                    style={{ height: `${height}%` }}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isRecording
                        ? 'bg-rose-500'
                        : isPlaying
                        ? 'bg-purple-400'
                        : 'bg-stone-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Audio Controls */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                  isRecording
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-purple-400" />}
                <span>{isRecording ? 'Stop Recording' : 'Record Friend Audio'}</span>
              </button>

              {hasAudio && (
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-purple-600/25"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Playing...' : 'Listen'}</span>
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Attach Wingman Vouch to Profile</span>
          </button>
        </form>
      </div>
    </div>
  );
};
