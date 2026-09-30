import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart,
  ShieldCheck,
  Play,
  Pause,
  Users,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  Tv,
  PhoneCall,
  Calendar,
  Compass,
  CheckCircle2,
  LogIn,
  UserPlus,
  ChevronDown,
  Globe,
  Clock,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  MessageSquare,
  Smile,
  Film,
  Zap,
  Check,
  Share2,
  Camera,
  Layers,
  Flame,
  Radio,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AuthUser, SpaceEmailInvite, SpaceType } from '../types';
import { HavenLogo } from './HavenLogo';
import {
  playHeartbeatSound,
  playMessageChime,
  playSparkCelebrationSound,
} from '../utils/sounds';

export interface LandingPageProps {
  authUser: AuthUser | null;
  pendingInvites: SpaceEmailInvite[];
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenSpaceChooser: () => void;
  onAcceptInvite: (invite: SpaceEmailInvite) => void;
  onLogout: () => void;
  onEnterSpouseChat?: () => void;
  onOpenSetup?: (mode: 'create' | 'join', type?: SpaceType) => void;
}

// Preset cities for the interactive geodesic distance explorer
interface CityPreset {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  utcOffset: number; // in hours
}

const CITY_PRESETS: CityPreset[] = [
  { id: 'nyc', name: 'New York', country: 'USA', lat: 40.7128, lng: -74.006, timezone: 'EDT', utcOffset: -4 },
  { id: 'london', name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, timezone: 'BST', utcOffset: 1 },
  { id: 'paris', name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, timezone: 'CEST', utcOffset: 2 },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, timezone: 'JST', utcOffset: 9 },
  { id: 'sf', name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194, timezone: 'PDT', utcOffset: -7 },
  { id: 'sydney', name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, timezone: 'AEST', utcOffset: 10 },
  { id: 'toronto', name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, timezone: 'EDT', utcOffset: -4 },
  { id: 'singapore', name: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198, timezone: 'SGT', utcOffset: 8 },
];

function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const LandingPage: React.FC<LandingPageProps> = ({
  authUser,
  pendingInvites,
  onOpenAuth,
  onOpenSpaceChooser,
  onAcceptInvite,
  onLogout,
  onEnterSpouseChat,
  onOpenSetup,
}) => {
  // Interactive Sandbox Tab State
  const [activeSandboxTab, setActiveSandboxTab] = useState<'watch' | 'chat' | 'distance' | 'spark'>('watch');

  // Watch Together Interactive Simulator State
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const [videoProgress, setVideoProgress] = useState(24);
  const [bulletComments, setBulletComments] = useState<Array<{ id: string; text: string; top: number; author: string }>>([
    { id: 'b1', text: 'This soundtrack is breathtaking 💕', top: 18, author: 'Alex' },
    { id: 'b2', text: 'Pause at 01:42, look at that skyline! 🍿', top: 54, author: 'Sam' },
  ]);
  const [customWhisper, setCustomWhisper] = useState('');

  // Encrypted Chat Sandbox State
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'me' | 'partner'; text: string; time: string }>>([
    { id: 'm1', sender: 'partner', text: 'I just smelled lavender and immediately thought of you 🌸', time: '10:14 PM' },
    { id: 'm2', sender: 'me', text: 'Counting down the days until next month. Missing you so much.', time: '10:15 PM' },
    { id: 'm3', sender: 'partner', text: 'Sending you a live heartbeat pulse right now... hold your phone ❤️', time: '10:16 PM' },
  ]);
  const [newInputText, setNewInputText] = useState('');
  const [isHeartPulsing, setIsHeartPulsing] = useState(false);
  const [autoDeleteTime, setAutoDeleteTime] = useState<'off' | '5m' | '1h' | '24h'>('24h');

  // Geodesic Distance Simulator State
  const [city1Id, setCity1Id] = useState('sf');
  const [city2Id, setCity2Id] = useState('london');

  // Daily Spark Interactive Card State
  const [isSparkRevealed, setIsSparkRevealed] = useState(false);
  const [sparkResponse, setSparkResponse] = useState('');
  const [partnerSparkAnswered, setPartnerSparkAnswered] = useState(true);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Video progress tick
  useEffect(() => {
    if (!isPlayingVideo) return;
    const interval = setInterval(() => {
      setVideoProgress((prev) => (prev >= 100 ? 0 : prev + 1));
    }, 900);
    return () => clearInterval(interval);
  }, [isPlayingVideo]);

  // Handle adding a live reaction / bullet comment in Watch simulator
  const handleSendBullet = (text: string) => {
    if (!text.trim()) return;
    const newComment = {
      id: `bc-${Date.now()}`,
      text: text.trim(),
      top: Math.floor(Math.random() * 60) + 15,
      author: 'You',
    };
    setBulletComments((prev) => [...prev.slice(-6), newComment]);
    setCustomWhisper('');
    playMessageChime(true);
  };

  // Handle send message in interactive chat
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInputText.trim()) return;
    const text = newInputText.trim();
    const newMsg = {
      id: `m-${Date.now()}`,
      sender: 'me' as const,
      text,
      time: 'Just now',
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setNewInputText('');
    playMessageChime(true);

    // Automated partner echo for delight
    setTimeout(() => {
      const echoReplies = [
        'I felt that instantly in my heart 🥰',
        'Saving this to our private Polaroid vault! 📸',
        'You always know how to make me smile from miles away 💕',
      ];
      const randomReply = echoReplies[Math.floor(Math.random() * echoReplies.length)];
      setChatMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now() + 1}`,
          sender: 'partner',
          text: randomReply,
          time: 'Just now',
        },
      ]);
      playMessageChime(false);
    }, 1200);
  };

  // Heart pulse simulation
  const handleTriggerHeartPulse = () => {
    setIsHeartPulsing(true);
    playHeartbeatSound();
    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#f43f5e', '#ec4899', '#fda4af'],
      disableForReducedMotion: true,
    });
    setTimeout(() => {
      playHeartbeatSound();
    }, 380);
    setTimeout(() => {
      setIsHeartPulsing(false);
    }, 1400);
  };

  // Distance calculation
  const c1 = CITY_PRESETS.find((c) => c.id === city1Id) || CITY_PRESETS[4];
  const c2 = CITY_PRESETS.find((c) => c.id === city2Id) || CITY_PRESETS[1];
  const distanceMiles = useMemo(() => {
    return calculateDistanceMiles(c1.lat, c1.lng, c2.lat, c2.lng);
  }, [c1, c2]);
  const distanceKm = Math.round(distanceMiles * 1.60934);
  const timeDifferenceHours = Math.abs(c1.utcOffset - c2.utcOffset);

  const faqs = [
    {
      q: 'Is Haven really end-to-end encrypted? Can anyone else read our messages?',
      a: 'Yes, absolutely. Haven implements client-side zero-knowledge AES-256-GCM encryption. Your messages, audio calls, voice notes, and shared polaroids are encrypted in your browser before ever reaching our transit relay. Nobody—not even server administrators or ISPs—can decrypt your intimate sanctuary.',
    },
    {
      q: 'How does Watch Together work across long distances?',
      a: 'Our synchronized media engine locks timestamps in real-time between both devices using millisecond-accurate network time-sync. When you play, pause, or scrub through a video or music stream, your partner’s player syncs instantaneously, accompanied by floating bullet reactions and live movie whispers.',
    },
    {
      q: 'Can I invite my spouse if they don’t have an account yet?',
      a: 'Yes! Simply type your spouse or partner’s email address inside Haven. We create a cryptographically linked invitation token. When they click the link or register with that email, their account automatically unlocks your shared couple space with zero complicated pairing codes required.',
    },
    {
      q: 'Does Haven work on iPhone, Android, and desktop?',
      a: 'Yes. Haven is built as a responsive Progressive Web App (PWA) with native Capacitor support. You can install it straight to your iOS or Android home screen with one tap for a full-screen, notification-enabled native experience without app store bloat.',
    },
    {
      q: 'What if we also want to hang out with friends or family?',
      a: 'Haven features dedicated multi-space architecture. While your Spouse Sanctuary remains strictly locked and private to you two, you can switch seamlessly to your Friends Squad lounge for group video calls, shared music, and board games.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white font-sans overflow-x-hidden antialiased">
      {/* Subtle Background Atmospheric Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-gradient-to-b from-rose-900/18 via-purple-900/10 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-[35%] -left-48 w-[600px] h-[600px] bg-rose-600/8 rounded-full blur-[160px]" />
        <div className="absolute top-[65%] -right-48 w-[600px] h-[600px] bg-indigo-600/8 rounded-full blur-[160px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3.5">
            <HavenLogo size="md" variant="couple" />
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl text-white tracking-tight leading-none">
                Haven
              </span>
              <span className="text-[11px] text-rose-300 font-medium tracking-wide mt-0.5">
                Private Digital Sanctuary
              </span>
            </div>
          </div>

          {/* Editorial Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#interactive-preview" className="hover:text-white transition-colors relative py-1 group">
              <span>Interactive Sandbox</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-400 group-hover:w-full transition-all duration-300" />
            </a>
            <a href="#features" className="hover:text-white transition-colors relative py-1 group">
              <span>Sanctuary Features</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-400 group-hover:w-full transition-all duration-300" />
            </a>
            <a href="#distance-bridge" className="hover:text-white transition-colors relative py-1 group">
              <span>Distance Bridge</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-400 group-hover:w-full transition-all duration-300" />
            </a>
            <a href="#security" className="hover:text-white transition-colors relative py-1 group">
              <span>Zero-Knowledge Security</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-400 group-hover:w-full transition-all duration-300" />
            </a>
            <a href="#faq" className="hover:text-white transition-colors relative py-1 group">
              <span>FAQ</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-rose-400 group-hover:w-full transition-all duration-300" />
            </a>
          </nav>

          {/* User Auth Action Hub */}
          <div className="flex items-center gap-3">
            {authUser ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-white/[0.1] text-xs">
                  <img
                    src={authUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80'}
                    alt={authUser.name}
                    className="w-5 h-5 rounded-full object-cover border border-rose-400/60"
                  />
                  <span className="font-semibold text-slate-200 max-w-[110px] truncate">
                    {authUser.name}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-nav-logout"
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04]"
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  id="btn-nav-enter-space"
                  onClick={onOpenSpaceChooser}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:opacity-95 shadow-md shadow-rose-500/20 active:scale-[0.98] transition cursor-pointer flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Enter Space</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  id="btn-nav-signin"
                  onClick={() => onOpenAuth('login')}
                  className="py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/[0.06] transition cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  id="btn-nav-register"
                  onClick={() => onOpenAuth('register')}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:opacity-95 shadow-md shadow-rose-500/20 active:scale-[0.98] transition cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Sanctuary</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Pending Spouse Invitations Alert Banner */}
      {pendingInvites && pendingInvites.length > 0 && (
        <div className="relative z-40 bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-700 text-white py-3.5 px-4 shadow-xl">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-white/20 shadow-inner">
                <Heart className="w-4 h-4 fill-white" />
              </span>
              <span>
                <strong>Spouse Sanctuary Invitation Pending!</strong>{' '}
                <span className="font-semibold text-rose-100">{pendingInvites[0].senderName}</span> has invited you to enter your private couple sanctuary "{pendingInvites[0].spaceName}".
              </span>
            </div>
            <button
              type="button"
              id="btn-banner-accept-invite"
              onClick={() => onAcceptInvite(pendingInvites[0])}
              className="py-2 px-5 rounded-xl bg-white text-rose-700 font-bold hover:bg-rose-50 transition shadow-md active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs"
            >
              <span>Accept & Step Inside</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Hero Section */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Subtle Top Metadata Line */}
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-rose-300/90 mb-6 tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Zero-Knowledge AES-256</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Synchronized YouTube Streaming</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Real-Time Touch Pulse</span>
          </div>

          {/* Hero Headline */}
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-white leading-[1.12] mb-6">
            The Private Digital Sanctuary Built Exclusively For Two.
          </h1>

          {/* Hero Subtitle */}
          <p className="text-slate-300 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
            Where physical distance ceases to matter. Co-watch movies and music in millisecond sync, whisper live reactions, speak in peer-to-peer encrypted HD video, exchange intimate time capsules, and feel live touch pulses from across the globe.
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-6">
            {authUser ? (
              <>
                <button
                  type="button"
                  id="btn-hero-choose-space"
                  onClick={onOpenSpaceChooser}
                  className="w-full sm:w-auto py-4 px-8 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:opacity-95 shadow-xl shadow-rose-500/25 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2.5"
                >
                  <Compass className="w-4 h-4" />
                  <span>Open Your Sanctuary Space</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {onEnterSpouseChat && (
                  <button
                    type="button"
                    id="btn-hero-spouse-chat"
                    onClick={onEnterSpouseChat}
                    className="w-full sm:w-auto py-4 px-7 rounded-2xl font-semibold text-sm text-rose-200 bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800/70 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
                    <span>Enter Spouse Chat</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  id="btn-hero-register"
                  onClick={() => onOpenAuth('register')}
                  className="w-full sm:w-auto py-4 px-8 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:opacity-95 shadow-xl shadow-rose-500/25 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Free Sanctuary</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  id="btn-hero-login"
                  onClick={() => onOpenAuth('login')}
                  className="w-full sm:w-auto py-4 px-7 rounded-2xl font-semibold text-sm text-slate-200 bg-slate-900 hover:bg-slate-800 border border-white/[0.12] transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-rose-400" />
                  <span>Sign In with Email</span>
                </button>

                <button
                  type="button"
                  id="btn-hero-guest-demo"
                  onClick={onOpenSpaceChooser}
                  className="w-full sm:w-auto py-4 px-6 rounded-2xl font-semibold text-sm text-amber-300 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/30 transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Instant Guest Tour</span>
                </button>
              </>
            )}
          </div>

          {/* Editorial Trust Statement */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              100% Free & No Ads
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Spouse Email Auto-Link
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Progressive Web App (PWA)
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Password Guarded
            </span>
          </div>
        </div>
      </section>

      {/* Interactive Sanctuary Sandbox (The Core Feature Showcase) */}
      <section id="interactive-preview" className="relative z-10 py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section Kicker */}
          <div className="text-center mb-8">
            <div className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
              Live Interactive Sandbox
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              Experience The Intimacy In Action
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto mt-2">
              Try out real Haven features right here before you sign in. Tap buttons, send live whispers, and feel the connection.
            </p>
          </div>

          {/* Interactive Feature Tab Selector */}
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-white/[0.08] shadow-lg max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSandboxTab('watch')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeSandboxTab === 'watch'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Watch Together</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSandboxTab('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeSandboxTab === 'chat'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Encrypted Chat & Pulse</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSandboxTab('distance')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeSandboxTab === 'distance'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Geodesic Horizon</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSandboxTab('spark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeSandboxTab === 'spark'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Daily Spark Prompt</span>
              </button>
            </div>
          </div>

          {/* Interactive Sandbox Canvas Container */}
          <div className="rounded-3xl bg-slate-900/90 border border-white/[0.1] shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300">
            {/* Top Device Bar */}
            <div className="px-5 py-3.5 bg-slate-950/80 border-b border-white/[0.08] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="font-semibold text-slate-300 ml-2">
                  {activeSandboxTab === 'watch' && 'Synchronized Cinema Lounge · Alex & Sam'}
                  {activeSandboxTab === 'chat' && 'AES-256 End-to-End Encrypted Couple Stream'}
                  {activeSandboxTab === 'distance' && 'Global Geodesic Distance & Sky Tracker'}
                  {activeSandboxTab === 'spark' && 'Intimacy Spark · Daily Deep Question'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Zero Latency Live Sync</span>
              </div>
            </div>

            {/* TAB 1: WATCH TOGETHER SIMULATOR */}
            {activeSandboxTab === 'watch' && (
              <div className="p-4 sm:p-6 space-y-4">
                {/* Simulated Video Player */}
                <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-white/[0.06] overflow-hidden flex flex-col justify-between p-4 shadow-inner">
                  {/* Subtle video background art */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-rose-950/40 via-purple-950/30 to-slate-950 pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <Film className="w-36 h-36 text-white" />
                  </div>

                  {/* Flying Bullet Comments (Danmaku) */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                    {bulletComments.map((bc) => (
                      <div
                        key={bc.id}
                        style={{ top: `${bc.top}%` }}
                        className="absolute right-0 animate-bullet-slide bg-slate-950/80 border border-rose-500/30 text-rose-200 text-xs px-3 py-1 rounded-full shadow-lg whitespace-nowrap font-medium flex items-center gap-1.5"
                      >
                        <span className="text-[10px] text-slate-400">{bc.author}:</span>
                        <span>{bc.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Top Player Status */}
                  <div className="relative z-10 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-white/[0.1] text-rose-300">
                      <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      <span>Streaming: Midnight Starlight Lo-Fi & Cinematic Sunset</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">2 Co-Watchers Connected</span>
                    </div>
                  </div>

                  {/* Center Play Button Overlay */}
                  <div className="relative z-10 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                      className="w-16 h-16 rounded-full bg-rose-500/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/30 active:scale-95 transition cursor-pointer"
                    >
                      {isPlayingVideo ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                    </button>
                  </div>

                  {/* Bottom Video Controls Bar */}
                  <div className="relative z-10 space-y-2">
                    {/* Scrub bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden cursor-pointer">
                      <div
                        className="bg-gradient-to-r from-rose-500 to-pink-500 h-full transition-all duration-300"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px]">0{Math.floor(videoProgress / 10)}:{(videoProgress * 2) % 60} / 12:45</span>
                        <span className="text-emerald-400 text-[10px]">● In Sync</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {['💖', '🍿', '😂', '🥺', '🔥'].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleSendBullet(emoji)}
                            className="p-1 hover:scale-125 transition active:scale-90 text-sm cursor-pointer"
                            title={`Send ${emoji} reaction to stream`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Whisper Input for the Video */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customWhisper}
                    onChange={(e) => setCustomWhisper(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendBullet(customWhisper)}
                    placeholder="Whisper a bullet reaction during movie (e.g. 'Look at this part!')..."
                    className="flex-1 bg-slate-950 border border-white/[0.1] rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendBullet(customWhisper || 'So cozy watching this with you ❤️')}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-semibold hover:opacity-95 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Whisper</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ENCRYPTED CHAT & HEART PULSE SIMULATOR */}
            {activeSandboxTab === 'chat' && (
              <div className="p-4 sm:p-6 space-y-4">
                {/* Chat Stream Box */}
                <div className="bg-slate-950/70 border border-white/[0.08] rounded-2xl p-4 h-72 overflow-y-auto space-y-3 flex flex-col justify-end">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs ${
                          msg.sender === 'me'
                            ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-br-sm shadow-md'
                            : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/[0.06]'
                        }`}
                      >
                        <p>{msg.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {msg.time} · {msg.sender === 'me' ? 'Read by partner' : 'Delivered'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Controls and Input */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-white/[0.06]">
                  {/* Interactive Heart Pulse Action */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleTriggerHeartPulse}
                      className={`py-2 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isHeartPulsing
                          ? 'bg-rose-500 text-white scale-105 shadow-lg shadow-rose-500/40 animate-pulse'
                          : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isHeartPulsing ? 'fill-white' : 'fill-rose-400 text-rose-400'}`} />
                      <span>{isHeartPulsing ? 'Heartbeat Pulsing...' : 'Tap To Pulse Heartbeat'}</span>
                    </button>

                    {/* Ephemeral Timer Selector */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-white/[0.08]">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Shred:</span>
                      {(['off', '5m', '24h'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAutoDeleteTime(t)}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${
                            autoDeleteTime === t ? 'bg-rose-500 text-white font-bold' : 'hover:text-white'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat message form */}
                  <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <input
                      type="text"
                      value={newInputText}
                      onChange={(e) => setNewInputText(e.target.value)}
                      placeholder="Type encrypted message..."
                      className="flex-1 bg-slate-950 border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="submit"
                      className="py-2 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-semibold hover:opacity-95 transition cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 3: GEODESIC HORIZON & DISTANCE TRACKER */}
            {activeSandboxTab === 'distance' && (
              <div className="p-4 sm:p-6 space-y-6">
                {/* City Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* City 1 (You) */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/[0.08] space-y-2">
                    <div className="text-[11px] font-semibold text-rose-300 flex items-center justify-between">
                      <span>Your Location</span>
                      <span className="text-slate-400">{c1.timezone}</span>
                    </div>
                    <select
                      value={city1Id}
                      onChange={(e) => setCity1Id(e.target.value)}
                      className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    >
                      {CITY_PRESETS.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}, {city.country}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Local Coordinates: {c1.lat.toFixed(2)}°N, {c1.lng.toFixed(2)}°E</span>
                    </div>
                  </div>

                  {/* City 2 (Your Partner) */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-white/[0.08] space-y-2">
                    <div className="text-[11px] font-semibold text-indigo-300 flex items-center justify-between">
                      <span>Partner's Location</span>
                      <span className="text-slate-400">{c2.timezone}</span>
                    </div>
                    <select
                      value={city2Id}
                      onChange={(e) => setCity2Id(e.target.value)}
                      className="w-full bg-slate-900 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {CITY_PRESETS.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}, {city.country}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                      <Moon className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Local Coordinates: {c2.lat.toFixed(2)}°N, {c2.lng.toFixed(2)}°E</span>
                    </div>
                  </div>
                </div>

                {/* Live Geodesic Metric Box */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-950 border border-rose-500/20 text-center space-y-3">
                  <div className="text-xs uppercase tracking-widest text-rose-300 font-semibold">
                    Real Geodesic Distance Calculated
                  </div>
                  <div className="font-serif text-4xl sm:text-5xl font-extrabold text-white">
                    {distanceMiles.toLocaleString()} <span className="text-lg font-sans font-normal text-rose-300">miles</span>
                    <span className="text-slate-500 text-xl font-sans font-light mx-2">/</span>
                    {distanceKm.toLocaleString()} <span className="text-lg font-sans font-normal text-slate-400">km</span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    {timeDifferenceHours === 0
                      ? 'You are in the same time zone! Every moment aligns perfectly.'
                      : `A ${timeDifferenceHours}-hour time difference. When one sleeps, Haven preserves your messages until morning.`}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: DAILY SPARK INTIMACY PROMPT */}
            {activeSandboxTab === 'spark' && (
              <div className="p-4 sm:p-6 space-y-5">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-rose-950/20 to-slate-950 border border-rose-500/20 text-center space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span>Daily Spark Prompt #42</span>
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white max-w-xl mx-auto">
                    "What is one tiny habit of mine that made you realize you were falling completely in love?"
                  </h3>

                  {isSparkRevealed ? (
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-white/[0.1] text-left space-y-2 animate-in fade-in duration-300">
                      <div className="text-[11px] font-semibold text-rose-300 flex items-center justify-between">
                        <span>Partner's Sealed Answer Unlocked 💌</span>
                        <span className="text-slate-500">Answered today</span>
                      </div>
                      <p className="text-xs text-slate-200 italic leading-relaxed">
                        "The way you quietly hum without even noticing when you're making morning coffee. It felt like coming home the very first time I heard it."
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-white/[0.1] text-xs text-slate-400 flex flex-col items-center gap-2">
                      <Lock className="w-5 h-5 text-rose-400" />
                      <span>Partner has already answered this question today!</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSparkRevealed(true);
                          playSparkCelebrationSound();
                        }}
                        className="py-2 px-4 rounded-xl bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition cursor-pointer"
                      >
                        Reveal Partner's Answer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Sanctuary Pillars (Features Grid) */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
              Architecture For Intimacy
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white">
              Engineered For The Distance That Matters Most
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-3">
              Not a bloated social network. A quiet, private haven carefully crafted with every feature two people need to feel intimately close.
            </p>
          </div>

          {/* 6 Feature Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Watch Together */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-rose-500/40 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Tv className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Watch Together via YouTube
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Stream movie trailers, late-night lo-fi sessions, and favorite channels together with zero drift. Co-play, pause, seek, and fire floating bullet comments without interrupting playback.
              </p>
            </div>

            {/* Feature 2: Zero-Knowledge Encryption */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Zero-Knowledge Encryption
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Client-side AES-256-GCM encryption transforms every word, image, and voice note before transmission. Our servers never hold your decryption keys or private conversations.
              </p>
            </div>

            {/* Feature 3: Touch Pulse & ThumbKiss */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-pink-500/40 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Touch Pulse & ThumbKiss
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hold your thumb to the glass. When your partner touches their screen at the same moment, your phones pulse in simultaneous vibration and a romantic glow lights up both displays.
              </p>
            </div>

            {/* Feature 4: HD Video & Audio Calling */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-purple-500/40 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <PhoneCall className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Peer-to-Peer HD Calls
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Encrypted WebRTC video calls with automatic speaker amplification, shared canvas doodling while talking, interactive soundboard laughs, and audio-only low-bandwidth sleep mode.
              </p>
            </div>

            {/* Feature 5: Virtual Horizon & Celestial Sky */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-amber-500/40 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Virtual Horizon & Weather
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Real-time geodesic distance counter, city time synchronizer, and ambient local weather. Glance at your sanctuary top bar and immediately know if it’s raining or sunset where they are.
              </p>
            </div>

            {/* Feature 6: Time Capsules & Polaroid Vault */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] hover:border-indigo-500/40 transition-all duration-300 group hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                Time Capsules & Milestones
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Lock handwritten digital love notes to remain sealed until your next anniversary. Collect vintage polaroid memories in your private vault with custom captions and dates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Geodesic Distance Bridge Section */}
      <section id="distance-bridge" className="relative z-10 py-16 px-4 sm:px-6 bg-slate-900/40 border-y border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-widest">
            The Long-Distance Bridge
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
            "Thousands of Miles, But Only One Tap Away."
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
            Haven was created by long-distance partners who grew frustrated with noisy messaging apps that treated intimate conversations like business work tickets. Here, every feature is devoted to emotional closeness.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/[0.08]">
              <div className="font-serif text-2xl font-bold text-rose-400">0 ms</div>
              <div className="text-[11px] text-slate-400 mt-1">Watch Synchronization Drift</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/[0.08]">
              <div className="font-serif text-2xl font-bold text-emerald-400">256-bit</div>
              <div className="text-[11px] text-slate-400 mt-1">AES-GCM Encryption</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/[0.08]">
              <div className="font-serif text-2xl font-bold text-indigo-400">100%</div>
              <div className="text-[11px] text-slate-400 mt-1">No Tracking or Data Selling</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/[0.08]">
              <div className="font-serif text-2xl font-bold text-amber-400">1 Tap</div>
              <div className="text-[11px] text-slate-400 mt-1">PWA Home Screen Install</div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Cryptography Trust Architecture */}
      <section id="security" className="relative z-10 py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/80 border border-white/[0.1] shadow-2xl relative overflow-hidden">
            <div className="max-w-2xl relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-Knowledge Security Architecture</span>
              </div>

              <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white">
                Your Most Vulnerable Moments Belong Only To You Two.
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Mainstream social networks scan personal chats for advertising profiles. Haven is fundamentally different. Our cryptography engine executes on your local browser. Your passkey generates cryptographic key pairs that never leave your device.
              </p>

              <div className="space-y-2.5 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Passkey and password verification strictly denies unauthorized entries.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Ephemeral message shredder burns confidential notes on customizable timers.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct WebRTC peer-to-peer audio & video relay with no eavesdropping intermediaries.</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block absolute -right-12 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
              <Lock className="w-96 h-96 text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Love Stories & Couple Testimonials */}
      <section className="relative z-10 py-16 px-4 sm:px-6 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
              Love Across Borders
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              Real Couples Connected By Haven
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/[0.08] space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "We’ve been living 5,400 miles apart between London and San Francisco for 18 months. Being able to watch YouTube movies in sync while whispering bullet reactions saved our Friday date nights."
              </p>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                <span className="font-semibold text-white">Emma & Liam</span>
                <span className="text-rose-400">London ⇄ SF</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/[0.08] space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "The Touch Pulse feature makes my stomach flutter every time. Knowing she's pressing her thumb to the screen at the exact same second makes the distance feel non-existent."
              </p>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                <span className="font-semibold text-white">Kenji & Maya</span>
                <span className="text-rose-400">Tokyo ⇄ Toronto</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/[0.08] space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "The password protection and zero-knowledge encryption gave us total peace of mind. We have a space that is genuinely ours, free from algorithms, ads, and prying eyes."
              </p>
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                <span className="font-semibold text-white">Sofia & Mateo</span>
                <span className="text-rose-400">Madrid ⇄ Buenos Aires</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="relative z-10 py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold text-rose-400 uppercase tracking-widest mb-2">
              Everything You Need To Know
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/60 border border-white/[0.08] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between text-sm font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-rose-400 transition-transform duration-300 shrink-0 ml-4 ${
                      expandedFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFaq === idx && (
                  <div className="px-6 pb-5 text-xs text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="relative z-10 py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-rose-950/70 via-purple-950/40 to-slate-950 border border-rose-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="max-w-xl mx-auto space-y-3">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
                Step Into Your Private Sanctuary Today.
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Invite your spouse, set your password, and begin sharing intimate moments in a space engineered solely for you two.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3.5">
              {authUser ? (
                <button
                  type="button"
                  id="btn-cta-choose-space"
                  onClick={onOpenSpaceChooser}
                  className="py-4 px-8 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:opacity-95 shadow-xl shadow-rose-500/25 active:scale-[0.98] transition cursor-pointer flex items-center gap-2"
                >
                  <Compass className="w-4 h-4" />
                  <span>Choose Your Space</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    id="btn-cta-register"
                    onClick={() => onOpenAuth('register')}
                    className="py-4 px-8 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:opacity-95 shadow-xl shadow-rose-500/25 active:scale-[0.98] transition cursor-pointer flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Your Sanctuary Free</span>
                  </button>
                  <button
                    type="button"
                    id="btn-cta-login"
                    onClick={() => onOpenAuth('login')}
                    className="py-4 px-7 rounded-2xl font-semibold text-sm text-slate-200 bg-slate-900 hover:bg-slate-800 border border-white/[0.12] transition active:scale-[0.98] cursor-pointer flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4 text-rose-400" />
                    <span>Sign In</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Refined Footer */}
      <footer className="relative z-10 py-10 px-4 sm:px-6 bg-slate-950 border-t border-white/[0.06] text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <HavenLogo size="sm" variant="couple" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-300">Haven Sanctuary</span>
              <span className="text-[11px] text-slate-500">Zero-Knowledge Private Digital Sanctuary for Couples & Close Relationships</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span>AES-256-GCM Verified</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>No Telemetry</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>WebRTC HD Audio & Video</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
