import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  Shield,
  Clock,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Share2,
  X,
  User,
  MapPin,
  Flame,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface RescueCallModalProps {
  onClose: () => void;
  defaultDatePartnerName?: string;
}

export const RescueCallModal: React.FC<RescueCallModalProps> = ({
  onClose,
  defaultDatePartnerName = 'Date Companion',
}) => {
  const [activeTab, setActiveTab] = useState<'rescue_call' | 'safety_checkin'>('rescue_call');

  // Rescue Call State
  const [callerPreset, setCallerPreset] = useState<'mom' | 'roommate' | 'boss' | 'doctor'>('roommate');
  const [delaySeconds, setDelaySeconds] = useState<number>(5);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRinging, setIsRinging] = useState<boolean>(false);
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Safety Check-In State
  const [checkInMinutes, setCheckInMinutes] = useState<number>(30);
  const [safetyPartnerName, setSafetyPartnerName] = useState(defaultDatePartnerName);
  const [venueLocation, setVenueLocation] = useState('');
  const [emergencyFriendPhone, setEmergencyFriendPhone] = useState('');
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [remainingTimeSec, setRemainingTimeSec] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringOscRef = useRef<OscillatorNode | null>(null);

  // Presets definition
  const CALLER_PRESETS = {
    roommate: {
      name: 'Roommate Sarah 🔑',
      subtitle: 'Mobile • Calling...',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      reason: 'Apartment Emergency (Locked out / Water leak)',
      script: '"Hey! What’s going on? Oh shoot, the upstairs pipe is leaking into our kitchen?! Okay, don’t panic, I’m heading back right now to help you shut off the valve. See you in 15 minutes!"',
    },
    mom: {
      name: 'Mom ❤️',
      subtitle: 'Home • Calling...',
      avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150',
      reason: 'Family Check-in (Urgent errand)',
      script: '"Hi Mom! Everything alright? Oh, you need me to pick up Uncle Joe’s prescription from the pharmacy before it closes at 8? Sure, no problem at all, I can leave right now!"',
    },
    boss: {
      name: 'Dave (Team Lead) 💼',
      subtitle: 'Work • Calling...',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      reason: 'Production Server Incident',
      script: '"Hey Dave, sorry for taking a second. Wait, the production auth service is throwing 500s?! Yeah, let me jump on my laptop right away and inspect the container logs. Pulling it up now."',
    },
    doctor: {
      name: 'Northwest Clinic 🏥',
      subtitle: 'Clinic Office • Calling...',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
      reason: 'Appointment Reschedule',
      script: '"Hello, yes this is me. Oh wonderful, a cancellation opened up for this evening? Perfect, I can head straight over right away. Thank you so much for calling!"',
    },
  };

  const currentCaller = CALLER_PRESETS[callerPreset];

  // Ringer sound synthesis
  const startRingingSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      ringOscRef.current = osc;

      // Pulse ring cadence
      const pulseInterval = setInterval(() => {
        if (!osc) {
          clearInterval(pulseInterval);
          return;
        }
        gain.gain.setValueAtTime(gain.gain.value > 0.01 ? 0.001 : 0.12, ctx.currentTime);
      }, 900);
    } catch {
      // Audio not permitted
    }

    // Try vibration if available on mobile
    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 600]);
    }
  };

  const stopRingingSound = () => {
    if (ringOscRef.current) {
      try {
        ringOscRef.current.stop();
        ringOscRef.current.disconnect();
      } catch {
        // Ignored
      }
      ringOscRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // Ignored
      }
      audioCtxRef.current = null;
    }
  };

  // Trigger rescue call countdown
  const handleScheduleRescueCall = () => {
    setCountdown(delaySeconds);
  };

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      setCountdown(null);
      setIsRinging(true);
      startRingingSound();
    }
  }, [countdown]);

  // In-call duration timer
  useEffect(() => {
    if (!isInCall) return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isInCall]);

  // Safety check-in countdown timer
  useEffect(() => {
    if (!isTimerActive || remainingTimeSec <= 0) return;
    const interval = setInterval(() => {
      setRemainingTimeSec((prev) => {
        if (prev <= 1) {
          setIsTimerActive(false);
          alert('🛡️ Safety Check-in: Please confirm you are safe!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerActive, remainingTimeSec]);

  const handleAnswerCall = () => {
    stopRingingSound();
    setIsRinging(false);
    setIsInCall(true);
    setCallDuration(0);
  };

  const handleDeclineCall = () => {
    stopRingingSound();
    setIsRinging(false);
    setIsInCall(false);
    setCountdown(null);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const generateSafetyShareText = () => {
    return `Haven Date Safety Check-in: I'm currently on a date with ${safetyPartnerName}${venueLocation ? ` at ${venueLocation}` : ''}. If I don't check back in with you by ${new Date(Date.now() + checkInMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, please give me a call!`;
  };

  const handleCopySafetyDetails = () => {
    navigator.clipboard.writeText(generateSafetyShareText());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // FULLSCREEN RINGING PHONE SCREEN
  if (isRinging) {
    return (
      <div className="fixed inset-0 z-[120] bg-stone-950/95 flex flex-col justify-between items-center py-12 px-6 text-white animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center mt-8">
          <div className="relative mb-4">
            <img
              src={currentCaller.avatar}
              alt={currentCaller.name}
              className="w-28 h-28 rounded-full object-cover border-4 border-emerald-400 shadow-2xl animate-pulse"
            />
            <span className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-stone-950 flex items-center justify-center">
              <PhoneIncoming className="w-3.5 h-3.5 text-white" />
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">{currentCaller.name}</h2>
          <p className="text-sm text-stone-300 mt-1">{currentCaller.subtitle}</p>
          <span className="mt-3 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            {currentCaller.reason}
          </span>
        </div>

        {/* Teleprompter preview */}
        <div className="max-w-sm w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-4 text-xs text-stone-300 text-center shadow-lg">
          <p className="text-[11px] font-bold text-amber-400 mb-1">🎭 Suggested Exit Teleprompter:</p>
          <p className="italic text-stone-200">{currentCaller.script}</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-around w-full max-w-xs mb-8">
          {/* Decline */}
          <button
            onClick={handleDeclineCall}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full bg-rose-600 group-hover:bg-rose-500 flex items-center justify-center text-white shadow-xl shadow-rose-600/30 transition transform active:scale-95">
              <PhoneOff className="w-7 h-7" />
            </div>
            <span className="text-xs text-stone-300">Decline</span>
          </button>

          {/* Answer */}
          <button
            onClick={handleAnswerCall}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-600 group-hover:bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-600/30 transition transform active:scale-95 animate-bounce">
              <PhoneCall className="w-7 h-7" />
            </div>
            <span className="text-xs text-emerald-300 font-bold">Answer</span>
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE IN-CALL SCREEN
  if (isInCall) {
    return (
      <div className="fixed inset-0 z-[120] bg-stone-950 flex flex-col justify-between items-center py-12 px-6 text-white animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center mt-6">
          <img
            src={currentCaller.avatar}
            alt={currentCaller.name}
            className="w-24 h-24 rounded-full object-cover border-2 border-emerald-400/80 mb-3 shadow-lg"
          />
          <h2 className="text-2xl font-bold text-white">{currentCaller.name}</h2>
          <div className="flex items-center gap-2 mt-1 text-emerald-400 font-mono text-sm font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{formatTimer(callDuration)}</span>
          </div>
        </div>

        {/* Teleprompter Script Card */}
        <div className="max-w-md w-full bg-stone-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Your Exit Script (Read Aloud Naturally)
            </span>
            <span className="text-[10px] text-stone-400">Polite & Convincing</span>
          </div>
          <p className="text-sm font-medium text-stone-100 leading-relaxed bg-stone-950/70 p-3 rounded-xl border border-stone-800">
            {currentCaller.script}
          </p>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
            💡 <strong>Next Step:</strong> Tell your date: <em>"I am so sorry, my roommate is locked out with a leak, I have to step out. Thank you for this evening!"</em>
          </div>
        </div>

        {/* In-Call Controls */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition ${
              isMuted ? 'bg-amber-600' : 'bg-stone-800 hover:bg-stone-700'
            }`}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
          <button
            onClick={handleDeclineCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-xl shadow-rose-600/40 transition active:scale-95"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Date Safety & Rescue Companion
              </h3>
              <p className="text-[11px] text-stone-400">
                Discreet exit tools & proactive check-in timer
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

        {/* Nav Tabs */}
        <div className="px-5 pt-3 border-b border-stone-800 bg-stone-950/30 flex gap-2">
          <button
            onClick={() => setActiveTab('rescue_call')}
            className={`pb-2.5 text-xs font-semibold px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'rescue_call'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Fake Rescue Call</span>
          </button>
          <button
            onClick={() => setActiveTab('safety_checkin')}
            className={`pb-2.5 text-xs font-semibold px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'safety_checkin'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Safety Check-In & Share</span>
          </button>
        </div>

        {/* Tab 1: Rescue Call Generator */}
        {activeTab === 'rescue_call' && (
          <div className="p-5 overflow-y-auto space-y-4">
            {countdown !== null ? (
              <div className="p-6 bg-rose-950/40 border border-rose-500/50 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-400 flex items-center justify-center text-rose-300 font-mono text-2xl font-bold animate-pulse">
                  {countdown}s
                </div>
                <h4 className="text-base font-bold text-white">Rescue Call Scheduled!</h4>
                <p className="text-xs text-stone-300 max-w-xs">
                  Your phone will ring in <strong>{countdown} seconds</strong> from <strong>{currentCaller.name}</strong> with a realistic calling screen.
                </p>
                <button
                  onClick={() => setCountdown(null)}
                  className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-300 transition"
                >
                  Cancel Scheduled Call
                </button>
              </div>
            ) : (
              <>
                {/* Caller Persona Selector */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-2">
                    Select Simulated Caller & Excuse
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(Object.keys(CALLER_PRESETS) as Array<keyof typeof CALLER_PRESETS>).map((key) => {
                      const item = CALLER_PRESETS[key];
                      const isSelected = callerPreset === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setCallerPreset(key)}
                          className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition ${
                            isSelected
                              ? 'bg-rose-950/40 border-rose-500 text-white shadow-md shadow-rose-900/20'
                              : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 text-stone-300'
                          }`}
                        >
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="w-10 h-10 rounded-full object-cover border border-stone-700 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate text-white">{item.name}</div>
                            <div className="text-[10px] text-stone-400 truncate">{item.reason}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Delay Trigger Selector */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-2">
                    When should the call ring?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { sec: 5, label: 'Immediate (5s)' },
                      { sec: 60, label: '1 Minute' },
                      { sec: 300, label: '5 Minutes' },
                      { sec: 900, label: '15 Minutes' },
                    ].map((opt) => (
                      <button
                        key={opt.sec}
                        type="button"
                        onClick={() => setDelaySeconds(opt.sec)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                          delaySeconds === opt.sec
                            ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/20'
                            : 'bg-stone-950/60 border-stone-800 text-stone-300 hover:bg-stone-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Card */}
                <div className="p-3.5 bg-stone-950/80 rounded-2xl border border-stone-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-200">Excuse Script Preview:</span>
                    <span className="text-[10px] text-rose-400 font-semibold">{currentCaller.name}</span>
                  </div>
                  <p className="text-xs text-stone-300 italic bg-stone-900/90 p-2.5 rounded-xl border border-stone-800/80">
                    {currentCaller.script}
                  </p>
                </div>

                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={handleScheduleRescueCall}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition active:scale-98"
                >
                  <PhoneIncoming className="w-4 h-4" />
                  <span>Start Rescue Call Countdown ({delaySeconds}s)</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Safety Check-in & Share */}
        {activeTab === 'safety_checkin' && (
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* Active status banner */}
            {isTimerActive && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <div className="font-bold text-emerald-300 text-xs">
                      Safety Check-In Active: {formatTimer(remainingTimeSec)}
                    </div>
                    <div className="text-[10px] text-stone-400">
                      Discreet notification will alert your device
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsTimerActive(false)}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-[11px] text-stone-300"
                >
                  I am Safe / Cancel
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-stone-300 mb-1">
                  Date Companion Name
                </label>
                <input
                  type="text"
                  value={safetyPartnerName}
                  onChange={(e) => setSafetyPartnerName(e.target.value)}
                  placeholder="Who are you meeting?"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-300 mb-1">
                  Location or Venue
                </label>
                <input
                  type="text"
                  value={venueLocation}
                  onChange={(e) => setVenueLocation(e.target.value)}
                  placeholder="e.g. Blue Bottle Coffee, 4th & Market"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-300 mb-1">
                  Check-in Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setCheckInMinutes(mins)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        checkInMinutes === mins
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-stone-950 border-stone-800 text-stone-300'
                      }`}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Share Card */}
            <div className="p-3.5 bg-stone-950/80 border border-stone-800 rounded-2xl space-y-2">
              <span className="font-bold text-stone-200 block text-[11px]">
                Pre-Written Emergency Friend Notification:
              </span>
              <p className="text-stone-300 text-[11px] leading-relaxed bg-stone-900/90 p-2.5 rounded-xl border border-stone-800/80">
                {generateSafetyShareText()}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopySafetyDetails}
                  className="flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied to Clipboard!' : 'Copy Notification'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Haven Date Safety Note',
                        text: generateSafetyShareText(),
                      }).catch(() => {});
                    } else {
                      handleCopySafetyDetails();
                    }
                  }}
                  className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send to Friend</span>
                </button>
              </div>
            </div>

            {/* Start timer */}
            <button
              type="button"
              onClick={() => {
                setRemainingTimeSec(checkInMinutes * 60);
                setIsTimerActive(true);
              }}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition"
            >
              <Clock className="w-4 h-4" />
              <span>Arm {checkInMinutes}-Minute Check-In Timer</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
