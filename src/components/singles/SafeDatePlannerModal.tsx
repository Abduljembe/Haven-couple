import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  PhoneForwarded,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Heart,
  Share2,
  Compass,
  Coffee,
  Landmark,
  Gamepad2,
  IceCream,
  Trees,
  Search,
  Volume2,
  X,
  ChevronRight,
  Send,
  Lock,
  ArrowRight,
  Navigation,
  MessageCircleHeart,
  FileText,
  UserCheck,
} from 'lucide-react';
import {
  SingleProfile,
  SafeDateVenue,
  SafeDatePlan,
  SafeDateVenueCategory,
  SafeDateBillPreference,
} from '../../types';
import { CURATED_SAFE_VENUES, VENUE_CATEGORIES_META } from '../../data/safeVenuesData';

interface SafeDatePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: SingleProfile;
  targetProfile?: SingleProfile | null;
  candidatesList?: SingleProfile[];
  existingPlans?: SafeDatePlan[];
  onSendDateProposal: (plan: SafeDatePlan) => void;
  onUpdatePlanStatus?: (planId: string, status: SafeDatePlan['status']) => void;
  onTriggerRescueCall?: () => void;
}

type TabType = 'directory' | 'plan_builder' | 'safety_timer' | 'my_dates';

export const SafeDatePlannerModal: React.FC<SafeDatePlannerModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  targetProfile,
  candidatesList = [],
  existingPlans = [],
  onSendDateProposal,
  onUpdatePlanStatus,
  onTriggerRescueCall,
}) => {
  if (!isOpen) return null;

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>(targetProfile ? 'plan_builder' : 'directory');

  // Directory Filters
  const [selectedCategory, setSelectedCategory] = useState<SafeDateVenueCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedVenue, setSelectedVenue] = useState<SafeDateVenue | null>(
    CURATED_SAFE_VENUES[0] || null
  );

  // Plan Builder State
  const [selectedPartner, setSelectedPartner] = useState<SingleProfile | null>(
    targetProfile || candidatesList.find((p) => p.id !== currentProfile.id) || null
  );
  const [builderVenue, setBuilderVenue] = useState<SafeDateVenue>(
    CURATED_SAFE_VENUES[0]
  );
  const [dateString, setDateString] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [timeString, setTimeString] = useState<string>('18:30');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [billPreference, setBillPreference] = useState<SafeDateBillPreference>('split_5050');
  const [specialNote, setSpecialNote] = useState<string>('');
  const [emergencyContactName, setEmergencyContactName] = useState<string>('Best Friend / Roommate');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');

  // Safety Timer State
  const [activeTimerPlan, setActiveTimerPlan] = useState<SafeDatePlan | null>(() => {
    const active = existingPlans.find((p) => p.safetyTimerActive && p.safetyCheckInStatus === 'pending');
    return active || null;
  });
  const [timerMinutesLeft, setTimerMinutesLeft] = useState<number>(45);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [isAlertState, setIsAlertState] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Filtered Venues
  const filteredVenues = useMemo(() => {
    return CURATED_SAFE_VENUES.filter((venue) => {
      const matchCat = selectedCategory === 'all' || venue.category === selectedCategory;
      const matchCity = selectedCity === 'all' || venue.city.toLowerCase().includes(selectedCity.toLowerCase());
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        venue.name.toLowerCase().includes(query) ||
        venue.neighborhood.toLowerCase().includes(query) ||
        venue.vibeTags.some((t) => t.toLowerCase().includes(query));
      return matchCat && matchCity && matchQuery;
    });
  }, [selectedCategory, selectedCity, searchQuery]);

  // Available Cities
  const cities = useMemo(() => {
    const set = new Set<string>();
    CURATED_SAFE_VENUES.forEach((v) => {
      const parts = v.city.split(',');
      set.add(parts[0].trim());
    });
    return Array.from(set);
  }, []);

  // Safety Timer countdown ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerMinutesLeft > 0) {
      interval = setInterval(() => {
        setTimerMinutesLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            setIsAlertState(true);
            return 0;
          }
          return prev - 1;
        });
      }, 60000); // 1 minute ticks (for demo or live)
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerMinutesLeft]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Create & Send Date Proposal
  const handleProposeDate = () => {
    if (!selectedPartner) return;

    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    const scheduledTimestamp = new Date(year, month - 1, day, hours, minutes).getTime();

    const newPlan: SafeDatePlan = {
      id: `date-plan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromProfile: currentProfile,
      toProfile: selectedPartner,
      venue: builderVenue,
      dateTime: scheduledTimestamp,
      durationMinutes,
      billPreference,
      specialNote: specialNote.trim() || undefined,
      status: 'proposed',
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
      createdAt: Date.now(),
    };

    onSendDateProposal(newPlan);
    setActiveTab('my_dates');
  };

  // Start Safety Check-in Timer for a Date
  const handleStartSafetyTimer = (plan: SafeDatePlan) => {
    setActiveTimerPlan(plan);
    setTimerMinutesLeft(plan.durationMinutes || 45);
    setTimerRunning(true);
    setIsAlertState(false);
    setActiveTab('safety_timer');
  };

  // Mark Safe
  const handleCheckInSafe = () => {
    setTimerRunning(false);
    setIsAlertState(false);
    if (activeTimerPlan && onUpdatePlanStatus) {
      onUpdatePlanStatus(activeTimerPlan.id, 'completed');
    }
  };

  // Briefing card for best friend
  const generateFriendBriefingText = (plan: SafeDatePlan) => {
    const dateFormatted = new Date(plan.dateTime).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `🛡️ Haven Safe Date Briefing:
I'm meeting ${plan.toProfile.name} on ${dateFormatted}.
📍 Venue: ${plan.venue.name} (${plan.venue.address})
⏱️ Planned Window: ${plan.durationMinutes} mins
☕ Low-pressure escape plan set. If I haven't texted you by 45 mins past end time, please give me a ring!`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900 border border-stone-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/70 via-stone-900 to-amber-950/40 border-b border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-md">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-1.5">
                  IRL Safe Date Planner & Venue Directory
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Public & Verified
                </span>
              </div>
              <p className="text-xs text-stone-300">
                Curated safe public spots, zero-awkwardness itineraries & emergency walk-me-home safety timer.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS BAR */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-stone-800/80 bg-stone-950/50 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2.5 font-bold rounded-t-xl transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-emerald-500 text-emerald-300 bg-stone-900/80'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Safe Venue Directory ({CURATED_SAFE_VENUES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('plan_builder')}
            className={`px-3.5 py-2.5 font-bold rounded-t-xl transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'plan_builder'
                ? 'border-amber-500 text-amber-300 bg-stone-900/80'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Plan & Propose Date</span>
            {selectedPartner && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('safety_timer')}
            className={`px-3.5 py-2.5 font-bold rounded-t-xl transition flex items-center gap-1.5 border-b-2 whitespace-nowrap relative ${
              activeTab === 'safety_timer'
                ? 'border-rose-500 text-rose-300 bg-stone-900/80'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>Walk-Me-Home Safety Timer</span>
            {timerRunning && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[9px] text-white font-mono animate-pulse">
                {timerMinutesLeft}m
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('my_dates')}
            className={`px-3.5 py-2.5 font-bold rounded-t-xl transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'my_dates'
                ? 'border-teal-500 text-teal-300 bg-stone-900/80'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileText className="w-4 h-4 text-teal-400" />
            <span>My Planned Dates ({existingPlans.length})</span>
          </button>
        </div>

        {/* TAB BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-950/60">

          {/* TAB 1: VENUE DIRECTORY */}
          {activeTab === 'directory' && (
            <div className="space-y-5">
              
              {/* Filter controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Search */}
                <div className="sm:col-span-6 relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cafes, parks, arcades, neighborhoods..."
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* City selector */}
                <div className="sm:col-span-3">
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">🌍 All Metros & Cities</option>
                    {cities.map((city) => (
                      <option key={city} value={city}>
                        📍 {city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Safety Guarantee pill */}
                <div className="sm:col-span-3 flex items-center justify-center p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% Public & Staffed</span>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/20'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                  }`}
                >
                  ✨ All Categories
                </button>
                {VENUE_CATEGORIES_META.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedCategory(cat.category)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                      selectedCategory === cat.category
                        ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/20'
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Venue Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVenues.map((venue) => {
                  const isSelected = selectedVenue?.id === venue.id;
                  return (
                    <div
                      key={venue.id}
                      onClick={() => setSelectedVenue(venue)}
                      className={`group cursor-pointer rounded-2xl bg-stone-900/90 border transition-all overflow-hidden flex flex-col ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl'
                          : 'border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {/* Image header */}
                      <div className="relative h-40 w-full overflow-hidden bg-stone-950">
                        <img
                          src={venue.imageUrl}
                          alt={venue.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
                        
                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 backdrop-blur-md text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Verified Safe Spot
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/30">
                            {venue.priceTier} • {venue.noiseLevel}
                          </span>
                        </div>

                        {/* Rating */}
                        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 backdrop-blur-md text-white border border-stone-700 flex items-center gap-1">
                          <span>★ {venue.rating}</span>
                          <span className="text-stone-400 font-normal">({venue.reviewsCount})</span>
                        </div>

                        {/* Title overlay */}
                        <div className="absolute bottom-2.5 left-3 right-3">
                          <h3 className="text-sm font-extrabold text-white leading-tight drop-shadow">
                            {venue.name}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] text-stone-300 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{venue.neighborhood} • {venue.city}</span>
                          </div>
                        </div>
                      </div>

                      {/* Venue Details */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                        
                        {/* Safety Perks List */}
                        <div className="space-y-1 bg-stone-950/50 p-2.5 rounded-xl border border-stone-800/80">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 mb-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Safety & Low-Pressure Architecture
                          </div>
                          {venue.safetyPerks.map((perk, idx) => (
                            <div key={idx} className="text-[11px] text-stone-300 flex items-center gap-1.5">
                              <span>✓</span>
                              <span className="line-clamp-1">{perk}</span>
                            </div>
                          ))}
                        </div>

                        {/* Icebreaker Prompt Box */}
                        <div className="bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl text-[11px] text-amber-200/90 italic flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{venue.suggestedIcebreaker}</span>
                        </div>

                        {/* Buttons Row */}
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.googleMapsQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition flex items-center gap-1.5"
                          >
                            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Maps</span>
                            <ExternalLink className="w-3 h-3 text-stone-500" />
                          </a>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBuilderVenue(venue);
                              setActiveTab('plan_builder');
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Plan Date Here</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PLAN BUILDER & PROPOSE */}
          {activeTab === 'plan_builder' && (
            <div className="max-w-2xl mx-auto space-y-5">
              
              {/* Match selector */}
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3">
                <label className="block text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>1. Select Date Partner / Match</span>
                </label>

                {candidatesList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {candidatesList.filter((p) => p.id !== currentProfile.id).map((candidate) => {
                      const isChosen = selectedPartner?.id === candidate.id;
                      return (
                        <div
                          key={candidate.id}
                          onClick={() => setSelectedPartner(candidate)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition ${
                            isChosen
                              ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/50'
                              : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                          }`}
                        >
                          <img
                            src={candidate.avatar}
                            alt={candidate.name}
                            className="w-10 h-10 rounded-full object-cover border border-stone-700"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                              <span>{candidate.name}, {candidate.age}</span>
                              {candidate.respectfulCommunicatorBadge && (
                                <span className="text-[10px]" title="Zero-Ghost Verified">🕊️</span>
                              )}
                            </div>
                            <p className="text-[10px] text-stone-400 truncate">{candidate.city || 'Anywhere'}</p>
                          </div>
                          {isChosen && <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-stone-950/80 rounded-xl text-xs text-stone-400 flex items-center justify-between">
                    <span>{selectedPartner ? `Inviting: ${selectedPartner.name}` : 'No connections selected yet.'}</span>
                    <button
                      onClick={() => setActiveTab('directory')}
                      className="text-xs text-emerald-400 underline font-semibold"
                    >
                      Browse Lounge
                    </button>
                  </div>
                )}
              </div>

              {/* Chosen Venue Card */}
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>2. Selected Safe-Spot Venue</span>
                  </label>
                  <button
                    onClick={() => setActiveTab('directory')}
                    className="text-xs text-emerald-400 hover:underline font-bold"
                  >
                    Change Venue
                  </button>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-950/60 border border-stone-800">
                  <img
                    src={builderVenue.imageUrl}
                    alt={builderVenue.name}
                    className="w-16 h-16 rounded-xl object-cover border border-stone-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{builderVenue.name}</h4>
                    <p className="text-[11px] text-stone-400 truncate">{builderVenue.address}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-emerald-400">
                      <span>✓ {builderVenue.safetyPerks[0]}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date, Time, Duration & Bill Split Preferences */}
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-4">
                <label className="block text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. Low-Pressure Schedule & Expectations</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={dateString}
                      onChange={(e) => setDateString(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Meeting Time</label>
                    <input
                      type="time"
                      value={timeString}
                      onChange={(e) => setTimeString(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-stone-400 mb-1">Low-Pressure Window</label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value={30}>30 mins (Quick Coffee / Scoop)</option>
                      <option value={45}>45 mins (Recommended First Date)</option>
                      <option value={60}>60 mins (Museum / Arcade)</option>
                      <option value={90}>90 mins (Casual Evening)</option>
                    </select>
                  </div>
                </div>

                {/* Upfront Bill Splitting Preference */}
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1.5">
                    Upfront Bill Preference (Transparent & Zero-Awkwardness)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'split_5050', label: 'Go 50 / 50', icon: '🤝' },
                      { key: 'my_treat', label: 'My Treat', icon: '🎁' },
                      { key: 'take_turns', label: 'You Buy Next', icon: '🔄' },
                      { key: 'free_activity', label: 'Free Stroll', icon: '🌿' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setBillPreference(opt.key as SafeDateBillPreference)}
                        className={`p-2 rounded-xl text-xs font-semibold border text-center transition flex flex-col items-center justify-center gap-1 ${
                          billPreference === opt.key
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                            : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <span className="text-base">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">
                    Warm Invitation Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={specialNote}
                    onChange={(e) => setSpecialNote(e.target.value)}
                    placeholder="e.g. Would love to grab a matcha and check out that sunny courtyard!"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Best Friend Briefing Preview */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-stone-900 to-stone-900 border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-emerald-300">
                      Auto-Generated Wingman Briefing Text
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPartner) {
                        const fakePlan: SafeDatePlan = {
                          id: 'preview',
                          fromProfile: currentProfile,
                          toProfile: selectedPartner,
                          venue: builderVenue,
                          dateTime: Date.now() + 86400000,
                          durationMinutes,
                          billPreference,
                          status: 'proposed',
                          createdAt: Date.now(),
                        };
                        handleCopy(generateFriendBriefingText(fakePlan), 'briefing');
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-900/40 hover:bg-emerald-800 text-emerald-200 text-[11px] font-bold rounded-lg border border-emerald-500/30 transition flex items-center gap-1"
                  >
                    {copiedText === 'briefing' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === 'briefing' ? 'Copied Text!' : 'Copy to Text Friend'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed font-mono bg-stone-950/60 p-2.5 rounded-xl border border-stone-800">
                  {selectedPartner
                    ? `I'm meeting ${selectedPartner.name} at ${builderVenue.name} (${builderVenue.neighborhood}). Window: ${durationMinutes} mins. Haven Safety Check-in timer will be active!`
                    : 'Select a partner above to see the auto-generated safety briefing for your roommate or best friend.'}
                </p>
              </div>

              {/* Submit Proposal */}
              <button
                type="button"
                disabled={!selectedPartner}
                onClick={handleProposeDate}
                className="w-full py-3 bg-gradient-to-r from-amber-600 via-rose-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>
                  {selectedPartner ? `Send Safe Date Proposal to ${selectedPartner.name}` : 'Select a Partner Above'}
                </span>
              </button>
            </div>
          )}

          {/* TAB 3: WALK-ME-HOME SAFETY TIMER */}
          {activeTab === 'safety_timer' && (
            <div className="max-w-xl mx-auto space-y-5">
              <div className="p-6 rounded-3xl bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 shadow-2xl text-center space-y-5">
                
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-rose-500/20 via-amber-500/20 to-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center relative">
                  <ShieldCheck className="w-10 h-10 text-emerald-400 animate-pulse" />
                  {timerRunning && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping" />
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    Walk-Me-Home & Safe Check-In Timer
                  </h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                    Set your expected date window. If you do not check in as safe by the deadline, Haven can trigger a discreet rescue escape call or alert your emergency contact.
                  </p>
                </div>

                {/* Countdown Dial */}
                <div className="p-6 rounded-2xl bg-stone-950 border border-stone-800/80 inline-block w-full max-w-sm">
                  <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-wider text-emerald-400">
                    {String(Math.floor(timerMinutesLeft / 60)).padStart(2, '0')}:
                    {String(timerMinutesLeft % 60).padStart(2, '0')}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-2 font-medium">
                    {timerRunning
                      ? '⏱️ Live Safety Timer Active'
                      : 'Timer Paused / Ready to Start'}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleCheckInSafe}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I'm Safe! Check In & Conclude</span>
                  </button>

                  <button
                    onClick={() => {
                      setTimerMinutesLeft((prev) => prev + 30);
                      setTimerRunning(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>+30 Mins (Going Great!)</span>
                  </button>
                </div>

                {/* Emergency Escape Integration */}
                <div className="pt-4 border-t border-stone-800/80 space-y-3 text-left">
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Need an immediate discreet exit?</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (onTriggerRescueCall) {
                          onTriggerRescueCall();
                        }
                      }}
                      className="p-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-200 text-xs font-bold transition flex items-center gap-2"
                    >
                      <PhoneForwarded className="w-4 h-4 text-red-400 shrink-0" />
                      <div>
                        <div className="font-bold">Trigger Fake Rescue Call</div>
                        <div className="text-[10px] text-red-300/80 font-normal">Incoming call with voice prompt in 15s</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        const text = `🚨 Haven Safety Alert: I am on a date at ${activeTimerPlan?.venue.name || 'a meetup'} and need you to call me with an emergency excuse right away!`;
                        handleCopy(text, 'sos');
                      }}
                      className="p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-200 text-xs font-bold transition flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold">
                          {copiedText === 'sos' ? 'Copied Alert!' : 'Copy SOS Text Message'}
                        </div>
                        <div className="text-[10px] text-amber-300/80 font-normal">Ready to text your roommate</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MY PLANNED DATES */}
          {activeTab === 'my_dates' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span>Your Scheduled IRL Meetups</span>
                </h3>
                <button
                  onClick={() => setActiveTab('directory')}
                  className="text-xs text-emerald-400 hover:underline font-semibold"
                >
                  + Plan New Date
                </button>
              </div>

              {existingPlans.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-stone-900/50 border border-stone-800/80 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center mx-auto text-stone-400">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No Planned Dates Yet</h4>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    Browse verified safe venues and invite your match to a relaxed, low-pressure meetup.
                  </p>
                  <button
                    onClick={() => setActiveTab('directory')}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow transition"
                  >
                    Explore Safe Venue Directory
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {existingPlans.map((plan) => {
                    const partner = plan.fromProfile.id === currentProfile.id ? plan.toProfile : plan.fromProfile;
                    const dateFormatted = new Date(plan.dateTime).toLocaleString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={plan.id}
                        className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-3 shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={partner.avatar}
                              alt={partner.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-stone-700"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{partner.name}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  plan.status === 'accepted'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : plan.status === 'completed'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {plan.status}
                                </span>
                              </div>
                              <div className="text-xs text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{plan.venue.name}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-bold text-stone-200">{dateFormatted}</div>
                            <div className="text-[10px] text-stone-400">{plan.durationMinutes} mins window</div>
                          </div>
                        </div>

                        {/* Venue address & note */}
                        <div className="p-2.5 rounded-xl bg-stone-950/60 border border-stone-800/80 text-xs text-stone-300 flex items-center justify-between">
                          <span className="truncate">{plan.venue.address}</span>
                          <span className="text-[10px] font-bold text-amber-300 shrink-0 ml-2">
                            Bill: {plan.billPreference.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan.venue.googleMapsQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition flex items-center gap-1"
                          >
                            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Navigate</span>
                          </a>

                          <button
                            onClick={() => handleCopy(generateFriendBriefingText(plan), plan.id)}
                            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition flex items-center gap-1"
                          >
                            {copiedText === plan.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedText === plan.id ? 'Copied Briefing!' : 'Share Briefing'}</span>
                          </button>

                          <button
                            onClick={() => handleStartSafetyTimer(plan)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Start Safety Timer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
