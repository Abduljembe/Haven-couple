import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Heart,
  Send,
  Share2,
  UserPlus,
  Users,
  Search,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Tv,
  Flame,
  Smile,
  MapPin,
  Compass,
  Coffee,
  Music,
  Globe,
  RefreshCw,
  X,
  ChevronRight,
  QrCode,
  ArrowRight,
  Lock,
  Shield,
  Eye,
  Camera,
  ThumbsUp,
  SlidersHorizontal,
  Bell,
  Sparkle,
  Radio,
  Gamepad2,
  Film,
  CheckCircle2,
  Zap,
  Swords,
  Mic,
  Trash2,
  Video,
  PhoneCall,
  PhoneIncoming,
  ShieldCheck,
  FileCheck,
  FileText,
  ScanLine,
  AlertCircle,
  BadgeCheck,
  Upload,
  Calendar,
  CalendarCheck,
  LifeBuoy,
  PhoneForwarded,
  Award,
} from 'lucide-react';
import {
  SingleProfile,
  SingleSparkWave,
  SingleGender,
  SingleIntent,
  SingleLookingFor,
  CoupleSpaceConfig,
  IdDocumentType,
  IdVerificationData,
  WingmanVouchData,
  VirtualDateInvite,
  GentleClosureMessage,
  ActiveConversationItem,
  SafeDatePlan,
  SafeDateVenue,
} from '../types';
import { DEFAULT_AVATARS, cropAndCompressAvatar, compressIdDocumentImage, generateDemoIdCard } from '../utils/avatarUtils';
import { SpeedRoundModal } from './singles/SpeedRoundModal';
import { CompatibilityDuelModal } from './singles/CompatibilityDuelModal';
import { CoViewingLoungeView } from './singles/CoViewingLoungeView';
import { VoicePromptPlayer } from './singles/VoicePromptPlayer';
import { VideoScreeningModal } from './singles/VideoScreeningModal';
import { LivenessCheckModal } from './singles/LivenessCheckModal';
import { RescueCallModal } from './singles/RescueCallModal';
import { VirtualDateModal } from './singles/VirtualDateModal';
import { WingmanVouchModal } from './singles/WingmanVouchModal';
import { GentleClosureModal } from './singles/GentleClosureModal';
import { SafeDatePlannerModal } from './singles/SafeDatePlannerModal';
import { startRingtone, stopRingtone } from '../utils/sounds';

interface SinglesLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket?: any;
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onStartOneOnOneSpace: (roomId: string, passkey: string, partnerProfile?: SingleProfile) => void;
}

type TabType = 'discover' | 'speed' | 'watch' | 'profile' | 'inbox' | 'share' | 'mixer';

const CURATED_PASSIONS = [
  'Cinema & Films',
  'Film Photography',
  'Lofi Music',
  'Indie Gaming',
  'Museums & Art',
  'Studio Ghibli',
  'Coffee Roasting',
  'Night Drives',
  'Houseplants',
  'Chess & Strategy',
  'Italian Cooking',
  'Anime & Manga',
  'Astrophotography',
  'Acoustic Guitar',
  'Vintage Thrifting',
  'Graphic Design',
  'Sci-Fi Books',
  'Matcha & Tea',
  'Standup Comedy',
  'Hiking & Nature',
  'Baking & Pastry',
  'Mechanical Keyboards',
  'Cats & Dogs',
  'Vinyl Records',
];

const PROMPT_QUESTIONS = [
  'A movie I can watch 100 times',
  'The quickest way to my heart is',
  'My ideal Sunday looks like',
  'Two truths and a lie',
  'We will get along if',
  'My love language is',
  'A shower thought I had recently',
  'The secret to a great first date',
  'Teach me something about',
];

export const SinglesLoungeModal: React.FC<SinglesLoungeModalProps> = ({
  isOpen,
  onClose,
  socket,
  currentUserId = 'local-user',
  currentUserName = 'You',
  currentUserAvatar = DEFAULT_AVATARS[0],
  onStartOneOnOneSpace,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [singles, setSingles] = useState<SingleProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'real_first' | 'recent' | 'recommended' | 'online' | 'likes'>('real_first');
  const [realOnlyFilter, setRealOnlyFilter] = useState<boolean>(false);
  
  // Waves & Inbox
  const [myWaves, setMyWaves] = useState<SingleSparkWave[]>([]);
  const [unreadWaveCount, setUnreadWaveCount] = useState(0);

  // Selected Profile for detail view
  const [inspectedProfile, setInspectedProfile] = useState<SingleProfile | null>(null);

  // Wave / Message Compose Modal
  const [wavingToProfile, setWavingToProfile] = useState<SingleProfile | null>(null);
  const [waveType, setWaveType] = useState<'wave' | 'crush' | 'spark' | 'invite'>('wave');
  const [customWaveMessage, setCustomWaveMessage] = useState('');
  const [isSendingWave, setIsSendingWave] = useState(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Interactive Features State (Speed Round, Mini-Duel, Video Screening)
  const [isSpeedRoundOpen, setIsSpeedRoundOpen] = useState(false);
  const [duelPartner, setDuelPartner] = useState<SingleProfile | null>(null);
  const [isVideoScreeningOpen, setIsVideoScreeningOpen] = useState(false);
  const [videoScreeningPartner, setVideoScreeningPartner] = useState<SingleProfile | null>(null);
  const [videoScreeningSession, setVideoScreeningSession] = useState<any | null>(null);
  const [incomingScreeningInvite, setIncomingScreeningInvite] = useState<any | null>(null);

  // Registration / Profile Edit State
  const [myProfile, setMyProfile] = useState<SingleProfile>(() => {
    try {
      const saved = localStorage.getItem('haven_singles_my_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: currentUserId || `single-${Date.now()}`,
      name: currentUserName !== 'You' ? currentUserName : '',
      age: 24,
      gender: 'woman' as SingleGender,
      lookingFor: ['everyone', 'dating'] as SingleLookingFor[],
      intent: 'dating' as SingleIntent,
      city: '',
      bio: '',
      avatar: currentUserAvatar || DEFAULT_AVATARS[0],
      interests: ['Cinema & Films', 'Lofi Music', 'Coffee Roasting'],
      prompts: [
        { question: 'A movie I can watch 100 times', answer: '' },
        { question: 'My ideal Sunday looks like', answer: '' },
      ],
      currentVibe: 'Excited to meet good people ✨',
      onlineStatus: 'online',
      registeredAt: Date.now(),
      lastActive: Date.now(),
      likesCount: 0,
      allowDirectInvites: true,
      isRealUser: true,
      origin: 'registered',
      isIdVerified: true,
      verificationBadge: 'verified_real',
      idVerification: {
        status: 'verified',
        idType: 'drivers_license',
        documentName: "Driver's License",
        documentNumberMasked: 'ID-•••• •••• 9241',
        verifiedAt: Date.now(),
        verificationMethod: 'id_document_upload',
        isIdProvided: true,
      },
      isFeatured: true,
      contactSocial: '',
      voicePromptQuestion: 'My late night drive vibe 🎙️',
      voicePromptDurationSec: 7,
      wingmanEndorsement: 'Authentic, deeply kind, and makes the best coffee.',
    };
  });

  const [isRegistered, setIsRegistered] = useState<boolean>(() => {
    return localStorage.getItem('haven_singles_registered') === 'true';
  });

  // ID Verification Form & Discovery Filter State
  const [wantsIdVerification, setWantsIdVerification] = useState<boolean>(true);
  const [idDocType, setIdDocType] = useState<IdDocumentType>(() => {
    return myProfile.idVerification?.idType || 'drivers_license';
  });
  const [idNumberInput, setIdNumberInput] = useState<string>(() => {
    return myProfile.idVerification?.documentNumberMasked || '';
  });
  const [idDocPhoto, setIdDocPhoto] = useState<string>(() => {
    return myProfile.idVerification?.documentPhotoUrl || '';
  });
  const [isScanningId, setIsScanningId] = useState<boolean>(false);
  const [idFilterOnly, setIdFilterOnly] = useState<boolean>(false);

  // 5 New Advanced Singles Features State
  const [isLivenessModalOpen, setIsLivenessModalOpen] = useState(false);
  const [isRescueCallModalOpen, setIsRescueCallModalOpen] = useState(false);
  const [isVirtualDateModalOpen, setIsVirtualDateModalOpen] = useState(false);
  const [virtualDateTarget, setVirtualDateTarget] = useState<SingleProfile | null>(null);
  const [scheduledDates, setScheduledDates] = useState<VirtualDateInvite[]>(() => {
    try {
      const saved = localStorage.getItem('haven_singles_scheduled_dates');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [isWingmanModalOpen, setIsWingmanModalOpen] = useState(false);
  const [isGentleClosureModalOpen, setIsGentleClosureModalOpen] = useState(false);
  const [gentleClosureTarget, setGentleClosureTarget] = useState<SingleProfile | null>(null);
  const [activeConversations, setActiveConversations] = useState<ActiveConversationItem[]>(() => {
    try {
      const saved = localStorage.getItem('haven_singles_active_convs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // IRL Safe Date Planner State
  const [isSafeDateModalOpen, setIsSafeDateModalOpen] = useState(false);
  const [safeDateTarget, setSafeDateTarget] = useState<SingleProfile | null>(null);
  const [safeDatePlans, setSafeDatePlans] = useState<SafeDatePlan[]>(() => {
    try {
      const saved = localStorage.getItem('haven_singles_safe_date_plans');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [customTagInput, setCustomTagInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareTextTemplate, setShareTextTemplate] = useState('chill');

  // Count real registered singles
  const realSingles = useMemo(() => singles.filter((p) => p.isRealUser), [singles]);

  // Load singles from backend
  const fetchSingles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/singles');
      if (res.ok) {
        const data = await res.json();
        const loadedSingles: SingleProfile[] = data.singles || [];
        setSingles(loadedSingles);

        // Seed active conversations for momentum compass if currently empty
        setActiveConversations((prev) => {
          if (prev.length > 0) return prev;
          const candidates = loadedSingles.filter((s) => s.id !== myProfile.id).slice(0, 3);
          if (candidates.length === 0) return [];
          const now = Date.now();
          return [
            {
              id: `conv_${candidates[0]?.id || '1'}`,
              partnerProfile: candidates[0],
              lastMessageText: "I loved that indie film recommendation! Have you seen their earlier works?",
              lastSenderId: candidates[0]?.id || '1',
              lastActiveTimestamp: now - 6 * 3600 * 1000, // 6h ago (fresh)
            },
            ...(candidates[1]
              ? [
                  {
                    id: `conv_${candidates[1].id}`,
                    partnerProfile: candidates[1],
                    lastMessageText: "Totally agree on the coffee shop vibe. Are you free this Thursday?",
                    lastSenderId: myProfile.id,
                    lastActiveTimestamp: now - 31 * 3600 * 1000, // 31h ago (fading)
                  },
                ]
              : []),
            ...(candidates[2]
              ? [
                  {
                    id: `conv_${candidates[2].id}`,
                    partnerProfile: candidates[2],
                    lastMessageText: "Hey! What kind of music do you usually put on when studying?",
                    lastSenderId: candidates[2].id,
                    lastActiveTimestamp: now - 44 * 3600 * 1000, // 44h ago (critical stalling)
                  },
                ]
              : []),
          ];
        });
      }
    } catch (err) {
      console.warn('Could not fetch singles from server:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load waves
  const fetchWaves = async () => {
    if (!myProfile.id) return;
    try {
      const res = await fetch(`/api/singles/waves/${myProfile.id}`);
      if (res.ok) {
        const data = await res.json();
        const waves: SingleSparkWave[] = data.waves || [];
        setMyWaves(waves);
        const unread = waves.filter((w) => !w.read).length;
        setUnreadWaveCount(unread);
      }
    } catch (err) {
      console.warn('Could not fetch waves:', err);
    }
  };

  // Load persistent safe date plans
  const fetchDatePlans = async () => {
    if (!myProfile.id) return;
    try {
      const res = await fetch(`/api/singles/date-plans/${myProfile.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.plans) && data.plans.length > 0) {
          setSafeDatePlans(data.plans);
          try {
            localStorage.setItem('haven_singles_safe_date_plans', JSON.stringify(data.plans));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Could not fetch date plans from server:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSingles();
      fetchWaves();
      fetchDatePlans();

      // Subscribe to socket events for live lounge
      if (socket) {
        socket.emit('singles-join', { userId: myProfile.id, userName: myProfile.name });

        const handleProfileUpdated = (updatedProfile: SingleProfile) => {
          setSingles((prev) => {
            const index = prev.findIndex((p) => p.id === updatedProfile.id);
            if (index >= 0) {
              const clone = [...prev];
              clone[index] = updatedProfile;
              return clone;
            }
            return [updatedProfile, ...prev];
          });
        };

        const handleNewRegistration = (data: { profile: SingleProfile; message?: string }) => {
          if (data?.profile) {
            setSingles((prev) => {
              const filtered = prev.filter((p) => p.id !== data.profile.id);
              return [data.profile, ...filtered];
            });
            if (data.profile.id !== myProfile.id) {
              showToast(data.message || `🔥 ${data.profile.name} just registered in the Singles Lounge!`);
            }
          }
        };

        const handleWaveReceived = (wave: SingleSparkWave) => {
          if (wave.toId === myProfile.id) {
            setMyWaves((prev) => [wave, ...prev]);
            setUnreadWaveCount((c) => c + 1);
            showToast(`💌 ${wave.fromName} ${wave.type === 'crush' ? 'sent you a secret crush spark!' : 'sent you a wave!'}`);
          }
        };

        const handleStatus = ({ userId, status }: { userId: string; status: any }) => {
          setSingles((prev) =>
            prev.map((p) => (p.id === userId ? { ...p, onlineStatus: status } : p))
          );
        };

        const handleProfileDeleted = ({ id }: { id: string }) => {
          setSingles((prev) => prev.filter((p) => p.id !== id));
        };

        // 🎥 Video Screening Socket Handlers
        const handleVideoScreeningIncoming = (invite: any) => {
          if (invite?.toUserId === myProfile.id) {
            setIncomingScreeningInvite(invite);
            try {
              startRingtone();
            } catch {}
            showToast(`🎥 ${invite.fromUser?.name || 'A member'} invited you to a live Video Screening Call!`);
          }
        };

        const handleVideoScreeningStarted = (data: { session: any; partnerProfile: SingleProfile }) => {
          try {
            stopRingtone();
          } catch {}
          setIncomingScreeningInvite(null);
          setVideoScreeningPartner(data.partnerProfile);
          setVideoScreeningSession(data.session);
          setIsVideoScreeningOpen(true);
        };

        const handleVideoScreeningDeclined = (data: { message?: string }) => {
          showToast(data?.message || 'Video screening call was declined or unavailable.');
        };

        const handleVideoScreeningQueueAlert = (data: { message?: string }) => {
          if (!isVideoScreeningOpen) {
            showToast(data?.message || '🎥 A member is waiting in the Video Screening queue!');
          }
        };

        const handleVirtualDateInviteReceived = (invite: VirtualDateInvite) => {
          if (invite.toProfile?.id === myProfile.id) {
            setScheduledDates((prev) => {
              const updated = [invite, ...prev.filter((d) => d.id !== invite.id)];
              try {
                localStorage.setItem('haven_singles_scheduled_dates', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            showToast(`📅 ${invite.fromProfile.name} invited you to a virtual date: ${invite.title}!`);
          }
        };

        const handleVirtualDateResponseReceived = (data: { inviteId: string; status: 'accepted' | 'declined'; responderId: string }) => {
          setScheduledDates((prev) => {
            const updated = prev.map((d) => (d.id === data.inviteId ? { ...d, status: data.status } : d));
            try {
              localStorage.setItem('haven_singles_scheduled_dates', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          if (data.status === 'accepted') {
            showToast('🎉 Your virtual date invitation was accepted!');
          }
        };

        const handleGentleClosureReceived = (closure: GentleClosureMessage) => {
          if (closure.toProfile?.id === myProfile.id) {
            setActiveConversations((prev) => {
              const updated = prev.map((c) =>
                c.partnerProfile.id === closure.fromProfile.id
                  ? { ...c, closureMessage: closure, isArchived: true }
                  : c
              );
              try {
                localStorage.setItem('haven_singles_active_convs', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            showToast(`🕊️ ${closure.fromProfile.name} sent you a gentle and respectful closure note.`);
          }
        };

        const handleSafeDateProposalReceived = (plan: SafeDatePlan) => {
          if (plan.toProfile?.id === myProfile.id || plan.fromProfile?.id === myProfile.id) {
            setSafeDatePlans((prev) => {
              const updated = [plan, ...prev.filter((p) => p.id !== plan.id)];
              try {
                localStorage.setItem('haven_singles_safe_date_plans', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            if (plan.toProfile?.id === myProfile.id) {
              showToast(`📍 ${plan.fromProfile.name} invited you to an IRL safe date at ${plan.venue.name}!`);
            }
          }
        };

        const handleSafeDateResponseReceived = (data: { planId: string; status: string; plan?: SafeDatePlan }) => {
          setSafeDatePlans((prev) => {
            const updated = prev.map((p) => (p.id === data.planId ? { ...p, status: data.status as any } : p));
            try {
              localStorage.setItem('haven_singles_safe_date_plans', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          if (data.status === 'accepted') {
            showToast('🎉 Your safe date invitation was accepted!');
          }
        };

        const handleSafetyCheckInAlertReceived = (data: any) => {
          showToast(`🚨 Safety Check-in update: ${data.message || 'Safety alert acknowledged'}`);
        };

        socket.on('singles-profile-updated', handleProfileUpdated);
        socket.on('singles-new-registration', handleNewRegistration);
        socket.on('singles-wave-received', handleWaveReceived);
        socket.on('singles-member-status', handleStatus);
        socket.on('singles-profile-deleted', handleProfileDeleted);
        socket.on('singles-video-screening-incoming', handleVideoScreeningIncoming);
        socket.on('singles-video-screening-started', handleVideoScreeningStarted);
        socket.on('singles-video-screening-declined', handleVideoScreeningDeclined);
        socket.on('singles-video-screening-queue-alert', handleVideoScreeningQueueAlert);
        socket.on('singles-virtual-date-invite-received', handleVirtualDateInviteReceived);
        socket.on('singles-virtual-date-response-received', handleVirtualDateResponseReceived);
        socket.on('singles-gentle-closure-received', handleGentleClosureReceived);
        socket.on('singles-safe-date-proposal-received', handleSafeDateProposalReceived);
        socket.on('singles-safe-date-response-received', handleSafeDateResponseReceived);
        socket.on('singles-safety-checkin-alert-received', handleSafetyCheckInAlertReceived);

        return () => {
          socket.emit('singles-leave', { userId: myProfile.id });
          socket.off('singles-profile-updated', handleProfileUpdated);
          socket.off('singles-new-registration', handleNewRegistration);
          socket.off('singles-wave-received', handleWaveReceived);
          socket.off('singles-member-status', handleStatus);
          socket.off('singles-profile-deleted', handleProfileDeleted);
          socket.off('singles-video-screening-incoming', handleVideoScreeningIncoming);
          socket.off('singles-video-screening-started', handleVideoScreeningStarted);
          socket.off('singles-video-screening-declined', handleVideoScreeningDeclined);
          socket.off('singles-video-screening-queue-alert', handleVideoScreeningQueueAlert);
          socket.off('singles-virtual-date-invite-received', handleVirtualDateInviteReceived);
          socket.off('singles-virtual-date-response-received', handleVirtualDateResponseReceived);
          socket.off('singles-gentle-closure-received', handleGentleClosureReceived);
          socket.off('singles-safe-date-proposal-received', handleSafeDateProposalReceived);
          socket.off('singles-safe-date-response-received', handleSafeDateResponseReceived);
          socket.off('singles-safety-checkin-alert-received', handleSafetyCheckInAlertReceived);
          try {
            stopRingtone();
          } catch {}
        };
      }
    }
  }, [isOpen, socket, myProfile.id]);

  const showToast = (msg: string) => {
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 4000);
  };

  // --- 5 ADVANCED SINGLES SUITE HANDLERS ---
  const handleSendDateInvite = (invite: VirtualDateInvite) => {
    setScheduledDates((prev) => {
      const updated = [invite, ...prev.filter((d) => d.id !== invite.id)];
      try {
        localStorage.setItem('haven_singles_scheduled_dates', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (socket) {
      socket.emit('singles-virtual-date-invite', invite);
    }
    showToast(`📅 Virtual date proposal sent to ${invite.toProfile.name}!`);
  };

  const handleAcceptDateInvite = (inviteId: string) => {
    setScheduledDates((prev) => {
      const updated = prev.map((d) => (d.id === inviteId ? { ...d, status: 'accepted' as const } : d));
      try {
        localStorage.setItem('haven_singles_scheduled_dates', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (socket) {
      socket.emit('singles-virtual-date-response', {
        inviteId,
        status: 'accepted',
        responderId: myProfile.id,
      });
    }
    showToast('🎉 Virtual date accepted! Ready on the calendar.');
  };

  const handleDeclineDateInvite = (inviteId: string) => {
    setScheduledDates((prev) => {
      const updated = prev.map((d) => (d.id === inviteId ? { ...d, status: 'declined' as const } : d));
      try {
        localStorage.setItem('haven_singles_scheduled_dates', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (socket) {
      socket.emit('singles-virtual-date-response', {
        inviteId,
        status: 'declined',
        responderId: myProfile.id,
      });
    }
    showToast('Virtual date declined.');
  };

  const handleLaunchDateRoom = (invite: VirtualDateInvite) => {
    setIsVirtualDateModalOpen(false);
    const partner = invite.fromProfile.id === myProfile.id ? invite.toProfile : invite.fromProfile;
    onStartOneOnOneSpace(invite.roomId, invite.passkey, partner);
  };

  const handleBiometricSuccess = (bioData: any) => {
    const updated = {
      ...myProfile,
      biometricVerification: bioData,
    };
    setMyProfile(updated);
    try {
      localStorage.setItem('haven_single_profile', JSON.stringify(updated));
    } catch {}

    // Also persist to backend
    fetch(`/api/singles/${myProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ biometricVerification: bioData }),
    }).catch((err) => console.warn('Could not sync biometric data:', err));

    showToast('👤✨ Real Face Verified! Compulsory anti-catfish verification complete.');
  };

  const handleWingmanVouchSave = (vouch: WingmanVouchData) => {
    const updated = {
      ...myProfile,
      wingmanVouch: vouch,
      wingmanEndorsement: vouch.quote,
    };
    setMyProfile(updated);
    try {
      localStorage.setItem('haven_single_profile', JSON.stringify(updated));
    } catch {}

    // Persist to backend
    fetch(`/api/singles/${myProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wingmanVouch: vouch, wingmanEndorsement: vouch.quote }),
    }).catch((err) => console.warn('Could not sync wingman vouch:', err));

    showToast(`🎙️ Friend Vouch from ${vouch.friendName} saved!`);
  };

  const handleSendClosure = (closure: GentleClosureMessage) => {
    // 1. Update local conversations
    setActiveConversations((prev) => {
      const updated = prev.map((c) =>
        c.partnerProfile.id === closure.toProfile.id
          ? { ...c, closureMessage: closure, isArchived: true }
          : c
      );
      try {
        localStorage.setItem('haven_singles_active_convs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Award Respectful Communicator badge if not already pledged
    if (!myProfile.respectfulCommunicatorBadge) {
      handlePledgeZeroGhost();
    }

    // 3. Emit via socket
    if (socket) {
      socket.emit('singles-gentle-closure', closure);
    }

    // 4. Also post as a gentle spark wave record
    fetch('/api/singles/wave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromId: myProfile.id,
        fromName: myProfile.name,
        fromAvatar: myProfile.avatar,
        toId: closure.toProfile.id,
        type: 'spark',
        message: `🕊️ Gentle Closure: "${closure.text.slice(0, 100)}..."`,
      }),
    }).catch((err) => console.warn('Could not post closure wave:', err));

    showToast('🕊️ Gentle closure delivered with kindness and grace!');
  };

  const handlePledgeZeroGhost = () => {
    const updated = {
      ...myProfile,
      respectfulCommunicatorBadge: true,
    };
    setMyProfile(updated);
    try {
      localStorage.setItem('haven_single_profile', JSON.stringify(updated));
    } catch {}

    fetch(`/api/singles/${myProfile.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respectfulCommunicatorBadge: true }),
    }).catch((err) => console.warn('Could not sync pledge badge:', err));

    showToast('🕊️ Honor Pledge Signed! You earned the Zero-Ghost Verified badge.');
  };

  const handleReviveConversation = (partnerProfile: SingleProfile, icebreaker: string) => {
    if (socket) {
      socket.emit('singles-wave', {
        fromId: myProfile.id,
        fromName: myProfile.name,
        fromAvatar: myProfile.avatar,
        toId: partnerProfile.id,
        type: 'spark',
        message: icebreaker,
      });
    }

    // Update last active time for conversation
    setActiveConversations((prev) => {
      const updated = prev.map((c) =>
        c.partnerProfile.id === partnerProfile.id
          ? {
              ...c,
              lastMessageText: icebreaker,
              lastSenderId: myProfile.id,
              lastActiveTimestamp: Date.now(),
            }
          : c
      );
      try {
        localStorage.setItem('haven_singles_active_convs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    showToast(`⚡ Icebreaker spark sent to ${partnerProfile.name}!`);
  };

  // IRL Safe Date Handlers
  const handleSendSafeDateProposal = async (plan: SafeDatePlan) => {
    setSafeDatePlans((prev) => {
      const updated = [plan, ...prev.filter((p) => p.id !== plan.id)];
      try {
        localStorage.setItem('haven_singles_safe_date_plans', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (socket) {
      socket.emit('singles-safe-date-proposal', plan);
    }

    try {
      await fetch('/api/singles/date-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });
    } catch (err) {
      console.warn('Could not persist date plan to server:', err);
    }

    try {
      await fetch('/api/singles/wave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: myProfile.id,
          fromName: myProfile.name,
          fromAvatar: myProfile.avatar,
          toId: plan.toProfile.id,
          type: 'spark',
          message: `📍 Safe Date Proposal: ${plan.venue.name} (${plan.venue.neighborhood}) on ${new Date(plan.dateTime).toLocaleDateString()} at ${new Date(plan.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Split: ${plan.billPreference.replace('_', ' ')}.`,
        }),
      });
    } catch (err) {}

    showToast(`📍 Safe date proposal delivered to ${plan.toProfile.name}!`);
  };

  const handleUpdateSafeDateStatus = async (planId: string, status: 'accepted' | 'declined' | 'completed' | 'cancelled') => {
    setSafeDatePlans((prev) => {
      const updated = prev.map((p) => (p.id === planId ? { ...p, status } : p));
      try {
        localStorage.setItem('haven_singles_safe_date_plans', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (socket) {
      socket.emit('singles-safe-date-response', { planId, status });
    }

    try {
      await fetch(`/api/singles/date-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.warn('Could not update date plan status on server:', err);
    }

    showToast(status === 'accepted' ? '🎉 Safe date proposal accepted! Have a safe and wonderful time!' : 'Date plan status updated.');
  };


  // Calculate Match Score between current user and profile
  const getMatchScore = (profile: SingleProfile): number => {
    if (!profile) return 85;
    let score = 70;
    // Shared interests
    const myInterests = myProfile.interests || [];
    const theirInterests = profile.interests || [];
    const shared = myInterests.filter((i) => theirInterests.includes(i));
    score += shared.length * 5;

    // Intent match
    if (myProfile.intent === profile.intent) {
      score += 10;
    }

    // City proximity bonus
    if (myProfile.city && profile.city && myProfile.city.toLowerCase() === profile.city.toLowerCase()) {
      score += 10;
    }

    return Math.min(99, Math.max(75, score));
  };

  // Filtered singles
  const filteredSingles = useMemo(() => {
    return singles.filter((p) => {
      // Filter real registered singles only if toggle is active
      if (realOnlyFilter && !p.isRealUser) return false;

      // Filter ID Verified singles only
      if (idFilterOnly) {
        const isVerified = Boolean(p.isIdVerified || p.verificationBadge === 'verified_real' || p.verificationBadge === 'verified_id');
        if (!isVerified) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCity = p.city?.toLowerCase().includes(q);
        const matchBio = p.bio?.toLowerCase().includes(q);
        const matchInterests = p.interests?.some((i) => i.toLowerCase().includes(q));
        const matchVibe = p.currentVibe?.toLowerCase().includes(q);
        if (!matchName && !matchCity && !matchBio && !matchInterests && !matchVibe) return false;
      }

      // Gender filter
      if (genderFilter !== 'all') {
        if (p.gender !== genderFilter) return false;
      }

      // Intent filter
      if (intentFilter !== 'all') {
        if (p.intent !== intentFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      // User's own registered profile is always #1 at the top of their discover feed
      if (isRegistered) {
        if (a.id === myProfile.id) return -1;
        if (b.id === myProfile.id) return 1;
      }

      if (sortBy === 'real_first') {
        // Real registered users ALWAYS ranked first
        const aReal = a.isRealUser ? 1 : 0;
        const bReal = b.isRealUser ? 1 : 0;
        if (aReal !== bReal) return bReal - aReal;

        // ID Verified members prioritized over unverified
        const aVer = (a.isIdVerified || a.verificationBadge === 'verified_real') ? 1 : 0;
        const bVer = (b.isIdVerified || b.verificationBadge === 'verified_real') ? 1 : 0;
        if (aVer !== bVer) return bVer - aVer;

        // Online first
        if (a.onlineStatus === 'online' && b.onlineStatus !== 'online') return -1;
        if (b.onlineStatus === 'online' && a.onlineStatus !== 'online') return 1;

        // Newest registration / activity first
        return (b.registeredAt || b.lastActive || 0) - (a.registeredAt || a.lastActive || 0);
      } else if (sortBy === 'recent') {
        return (b.registeredAt || b.lastActive || 0) - (a.registeredAt || a.lastActive || 0);
      } else if (sortBy === 'online') {
        if (a.onlineStatus === 'online' && b.onlineStatus !== 'online') return -1;
        if (b.onlineStatus === 'online' && a.onlineStatus !== 'online') return 1;
        return (b.lastActive || 0) - (a.lastActive || 0);
      } else if (sortBy === 'likes') {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      return getMatchScore(b) - getMatchScore(a);
    });
  }, [singles, searchQuery, genderFilter, intentFilter, sortBy, realOnlyFilter, idFilterOnly, myProfile, isRegistered]);

  // ID Verification Helpers
  const handleUseDemoIdPass = () => {
    setIsScanningId(true);
    const demoCard = generateDemoIdCard(myProfile.name || 'Haven Member', idDocType === 'passport' ? 'Passport' : "Driver's License");
    setTimeout(() => {
      setIdDocPhoto(demoCard);
      if (!idNumberInput.trim()) {
        setIdNumberInput(`ID-•••• •••• ${Math.floor(1000 + Math.random() * 9000)}`);
      }
      setWantsIdVerification(true);
      setIsScanningId(false);
      showToast("✓ Verified ID credential attached! You are now eligible for the Verified Member badge.");
    }, 500);
  };

  const handleIdFileUpload = async (file: File) => {
    setIsScanningId(true);
    try {
      const compressed = await compressIdDocumentImage(file, 700, 450, 0.85);
      setIdDocPhoto(compressed);
      if (!idNumberInput.trim()) {
        setIdNumberInput(`ID-•••• •••• ${Math.floor(1000 + Math.random() * 9000)}`);
      }
      setWantsIdVerification(true);
      showToast('✓ ID document uploaded & encrypted! You will be verified upon registering.');
    } catch (err) {
      console.error(err);
      showToast('Could not process ID document. Please try a clear photo.');
    } finally {
      setIsScanningId(false);
    }
  };

  // Handle Register Profile
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!myProfile.name.trim()) {
      showToast('⚠️ Please provide your display name.');
      return;
    }

    // 🛑 COMPULSORY: Live Camera Face Verification (Mandatory for all members)
    if (!myProfile.biometricVerification?.verified) {
      showToast('⚠️ Live camera face verification is COMPULSORY for all singles. Please complete your quick face check now!');
      setIsLivenessModalOpen(true);
      return;
    }

    // Check if ID is provided for verification
    const isIdProvided = Boolean(
      (idDocPhoto && idDocPhoto.trim().length > 0) ||
      (idNumberInput && idNumberInput.trim().length > 0)
    );

    // Rule: To get verified, a member must provide their ID upon registering
    if (wantsIdVerification && !isIdProvided) {
      showToast('⚠️ To get verified, please upload your ID document or click "Use Demo ID Pass" upon registering.');
      return;
    }

    try {
      const docNameMap: Record<IdDocumentType, string> = {
        drivers_license: "Driver's License",
        passport: "Passport",
        national_id: "National Identity Card",
        student_id: "Student / State ID",
      };

      const isVerified = isIdProvided && wantsIdVerification;
      const verificationBadge = isVerified ? 'verified_real' : 'unverified_pending_id';

      const idVerificationData: IdVerificationData = isVerified ? {
        status: 'verified',
        idType: idDocType,
        documentName: docNameMap[idDocType] || "Government ID",
        documentNumberMasked: idNumberInput.trim() ? idNumberInput.trim() : `ID-•••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
        documentPhotoUrl: idDocPhoto || undefined,
        verifiedAt: Date.now(),
        verificationMethod: idDocPhoto ? 'id_document_upload' : 'digital_id_scan',
        isIdProvided: true,
      } : {
        status: 'unverified',
        idType: idDocType,
        documentName: 'Not Provided',
        isIdProvided: false,
      };

      const payload: SingleProfile = {
        ...myProfile,
        isRealUser: true,
        origin: 'registered',
        isIdVerified: isVerified,
        verificationBadge,
        idVerification: idVerificationData,
        isFeatured: true,
      };

      const res = await fetch('/api/singles/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setMyProfile(data.profile);
        setIsRegistered(true);
        localStorage.setItem('haven_singles_registered', 'true');
        localStorage.setItem('haven_singles_my_profile', JSON.stringify(data.profile));

        // Immediately update singles list with user's profile at index 0 (top priority)
        setSingles((prev) => {
          const rest = prev.filter((p) => p.id !== data.profile.id);
          return [data.profile, ...rest];
        });

        if (isVerified) {
          showToast('🎉 ID Verified! Your real, verified profile is now LIVE at the top of Singles Lounge! 🪪');
        } else {
          showToast('✓ Profile registered as Unverified. Provide your ID in Edit Profile to unlock your Verified badge!');
        }
        setActiveTab('discover');
      } else {
        showToast('Failed to save profile. Please try again.');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error saving profile.');
    }
  };

  // Handle Unregister / Delete Profile
  const handleDeleteProfile = async () => {
    if (!window.confirm('Are you sure you want to remove your profile from the Singles Lounge?')) return;
    try {
      const res = await fetch(`/api/singles/${myProfile.id}`, { method: 'DELETE' });
      if (res.ok) {
        setIsRegistered(false);
        localStorage.removeItem('haven_singles_registered');
        localStorage.removeItem('haven_singles_my_profile');
        setSingles((prev) => prev.filter((p) => p.id !== myProfile.id));
        showToast('Your profile has been removed from Singles Lounge.');
        setActiveTab('discover');
      } else {
        showToast('Failed to remove profile.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error removing profile.');
    }
  };

  // Handle Send Wave / Spark
  const handleSendWaveSubmit = async () => {
    if (!wavingToProfile) return;
    setIsSendingWave(true);

    try {
      const payload = {
        fromId: myProfile.id,
        fromName: myProfile.name || currentUserName || 'Haven Member',
        fromAvatar: myProfile.avatar || currentUserAvatar,
        toId: wavingToProfile.id,
        type: waveType,
        message:
          customWaveMessage.trim() ||
          (waveType === 'crush'
            ? 'Sent you a secret crush spark! 💖'
            : waveType === 'spark'
            ? 'Sparked your profile! ✨ Want to chat or watch something?'
            : 'Sent you a friendly wave! 👋'),
      };

      const res = await fetch('/api/singles/wave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(
          waveType === 'crush'
            ? `💖 Secret spark sent to ${wavingToProfile.name}!`
            : `👋 Wave delivered to ${wavingToProfile.name}!`
        );
        setWavingToProfile(null);
        setCustomWaveMessage('');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to send wave.');
    } finally {
      setIsSendingWave(false);
    }
  };

  // Handle Send Wave with Compatibility Duel Score
  const handleSendWaveWithDuel = async (partner: SingleProfile, score: number, answersCount: number) => {
    try {
      const payload = {
        fromId: myProfile.id,
        fromName: myProfile.name || currentUserName || 'Haven Member',
        fromAvatar: myProfile.avatar || currentUserAvatar,
        toId: partner.id,
        type: 'spark',
        message: `⚔️ Compatibility Duel: We matched ${score}% on 5 vibe dilemmas! Let's chat or watch something ✨`,
      };

      const res = await fetch('/api/singles/wave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(`✨ Wave with ${score}% Duel Match delivered to ${partner.name}!`);
      }
    } catch (err) {
      console.error(err);
      showToast(`Wave delivered to ${partner.name}!`);
    }
  };

  // Handle Instant 1-on-1 Space Invitation
  const handleCreateInstantSpaceWith = async (partner: SingleProfile) => {
    try {
      const res = await fetch('/api/singles/instant-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user1: {
            id: myProfile.id,
            name: myProfile.name || currentUserName,
            avatar: myProfile.avatar || currentUserAvatar,
          },
          user2: {
            id: partner.id,
            name: partner.name,
            avatar: partner.avatar,
          },
          inviteMessage: `Hey ${partner.name}! Let's hang out in a private Haven Space together!`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`✨ Private Haven Space initialized with ${partner.name}! Connecting...`);
        // Immediately launch into this private space!
        setTimeout(() => {
          onStartOneOnOneSpace(data.roomId, data.passkey, partner);
          onClose();
        }, 800);
      }
    } catch (err) {
      console.error(err);
      showToast('Could not start instant space.');
    }
  };

  // Handle Join Communal Singles Mixer Room
  const handleJoinCommunalMixer = () => {
    const mixerRoomId = 'haven-singles-mixer';
    const mixerPasskey = 'singles-mixer-open-2026';
    showToast('☕ Entering the Communal Singles Hangout Mixer...');
    setTimeout(() => {
      onStartOneOnOneSpace(mixerRoomId, mixerPasskey, {
        id: 'singles-mixer-hub',
        name: 'Singles Mixer Hub ☕',
        age: 0,
        gender: 'other',
        lookingFor: ['everyone'],
        intent: 'open_to_vibes',
        city: 'Global Lounge',
        bio: 'Open hangout space for all singles to break the ice and chat live!',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
        interests: ['Community', 'Icebreakers', 'Music', 'Games'],
        prompts: [],
        currentVibe: 'Live community hangout table',
        onlineStatus: 'online',
        registeredAt: Date.now(),
        lastActive: Date.now(),
      });
      onClose();
    }, 500);
  };

  // 🎥 Handle Start Video Screening Call with Partner
  const handleStartVideoScreening = (partner: SingleProfile) => {
    setVideoScreeningPartner(partner);
    if (socket) {
      socket.emit('singles-video-screening-invite', {
        fromUser: myProfile,
        toUserId: partner.id,
      });
      showToast(`🎥 Inviting ${partner.name} to a live Video Screening Call...`);

      // If testing solo or partner is simulated, auto start session
      if (!partner.isRealUser || singles.length <= 1) {
        socket.emit('singles-video-screening-test-start', {
          profile: myProfile,
          simulatedPartner: partner,
        });
      } else {
        setIsVideoScreeningOpen(true);
      }
    } else {
      setIsVideoScreeningOpen(true);
    }
  };

  // Accept Incoming Video Screening Call
  const handleAcceptIncomingScreening = (invite: any) => {
    try {
      stopRingtone();
    } catch {}
    if (socket) {
      socket.emit('singles-video-screening-accept', {
        inviteId: invite.inviteId,
        fromUserId: invite.fromUser.id,
        toUser: myProfile,
      });
    }
    setVideoScreeningPartner(invite.fromUser);
    setIncomingScreeningInvite(null);
    setIsVideoScreeningOpen(true);
  };

  // Decline Incoming Video Screening Call
  const handleDeclineIncomingScreening = (invite: any) => {
    try {
      stopRingtone();
    } catch {}
    if (socket) {
      socket.emit('singles-video-screening-decline', {
        inviteId: invite.inviteId,
        fromUserId: invite.fromUser.id,
      });
    }
    setIncomingScreeningInvite(null);
    showToast('Video screening invitation dismissed.');
  };

  // Quick Video Screening Queue Pair Up
  const handleStartQuickVideoScreening = () => {
    if (singles.length > 1) {
      const otherSingles = singles.filter((s) => s.id !== myProfile.id);
      const randomPartner = otherSingles[Math.floor(Math.random() * otherSingles.length)];
      handleStartVideoScreening(randomPartner);
    } else {
      // Test mode with demo partner
      const demoPartner: SingleProfile = {
        id: 'partner-sim-screening',
        name: 'Jordan Miller',
        age: 26,
        gender: 'woman',
        lookingFor: ['everyone', 'dating'],
        intent: 'dating',
        city: 'New York, NY',
        bio: 'Documentary filmmaker, weekend camper, and iced latte connoisseur ✨',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        interests: ['Cinema & Films', 'Coffee Roasting', 'Photography'],
        prompts: [{ question: 'A movie I can watch 100 times', answer: 'Before Sunrise' }],
        currentVibe: 'Curious about values and good music ☕',
        onlineStatus: 'online',
        registeredAt: Date.now(),
        lastActive: Date.now(),
        likesCount: 14,
        allowDirectInvites: true,
        isRealUser: true,
        origin: 'registered',
        verificationBadge: 'verified_real',
      };
      handleStartVideoScreening(demoPartner);
    }
  };

  // Generate Invite URL
  const inviteUrl = useMemo(() => {
    const origin = window.location.origin;
    const ref = encodeURIComponent(myProfile.name || 'someone');
    return `${origin}/?mode=singles&ref=${ref}`;
  }, [myProfile.name]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    showToast('📋 Singles Lounge invite link copied to clipboard!');
  };

  const getShareMessage = () => {
    if (shareTextTemplate === 'movie') {
      return `Hey! I'm in the Haven Singles Lounge watching movies and meeting fun people. Join me here: ${inviteUrl}`;
    }
    if (shareTextTemplate === 'flirty') {
      return `Hey! Register your profile on the Haven Singles Lounge so we can match and hang out: ${inviteUrl}`;
    }
    return `Come join the Haven Singles Lounge! Make a quick profile to meet great people, talk, or watch films together: ${inviteUrl}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-stone-900 border border-stone-700/70 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-100">
        
        {/* TOP HEADER */}
        <div className="px-5 py-4 border-b border-stone-800 bg-stone-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20 text-white font-bold">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Singles Lounge & Spark Hub
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {singles.length} Singles Total
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {realSingles.length} Real Members
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Register your profile to get top-priority visibility, discover matches, send waves, or launch 1-on-1 spaces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isRegistered ? (
              <button
                onClick={() => setActiveTab('profile')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register My Profile
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('profile')}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg border border-stone-700 transition flex items-center gap-2"
                title="Edit your singles profile"
              >
                <img
                  src={myProfile.avatar}
                  alt={myProfile.name}
                  className="w-5 h-5 rounded-full object-cover border border-stone-600"
                />
                <span className="truncate max-w-[90px]">{myProfile.name}</span>
                <span className="text-[10px] text-rose-400 underline">Edit</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-5 border-b border-stone-800 bg-stone-900/90 flex items-center justify-between overflow-x-auto gap-2 scrollbar-none">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'discover'
                  ? 'border-rose-500 text-rose-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Discover People ({filteredSingles.length})
            </button>

            {/* ⚡ 3-Min Blind Spark Button */}
            <button
              onClick={() => setIsSpeedRoundOpen(true)}
              className="px-3.5 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 whitespace-nowrap border-transparent text-amber-300 hover:text-white bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-transparent hover:bg-stone-800/80"
              title="Join 3-Minute Mystery Blind Spark Dating"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>3-Min Blind Spark</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold animate-pulse">
                LIVE
              </span>
            </button>

            {/* 🍿 Watch & Vibe Tab */}
            <button
              onClick={() => setActiveTab('watch')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'watch'
                  ? 'border-rose-500 text-rose-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Tv className="w-4 h-4 text-rose-400" />
              Watch & Vibe (Live Theaters 🍿)
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-rose-500 text-rose-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              {isRegistered ? 'My Profile & Vibe' : 'Register Profile'}
            </button>

            <button
              onClick={() => {
                setActiveTab('inbox');
                setUnreadWaveCount(0);
              }}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 border-b-2 whitespace-nowrap relative ${
                activeTab === 'inbox'
                  ? 'border-rose-500 text-rose-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              Sparks & Waves ({myWaves.length})
              {unreadWaveCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadWaveCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('share')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'share'
                  ? 'border-amber-500 text-amber-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Share2 className="w-4 h-4" />
              Invite & Get People Here ✨
            </button>

            <button
              onClick={() => setActiveTab('mixer')}
              className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === 'mixer'
                  ? 'border-purple-500 text-purple-400 bg-stone-800/60'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Coffee className="w-4 h-4" />
              Singles Hangout Table
            </button>

            {/* 📅 Virtual Dates Scheduler Tab */}
            <button
              onClick={() => {
                setVirtualDateTarget(null);
                setIsVirtualDateModalOpen(true);
              }}
              className="px-3.5 py-2.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 whitespace-nowrap border-transparent text-pink-300 hover:text-white bg-pink-950/30 hover:bg-pink-900/40"
              title="Schedule virtual dates & sync Google/iCal"
            >
              <Calendar className="w-4 h-4 text-pink-400" />
              <span>Virtual Dates ({scheduledDates.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-1.5 shrink-0">
            {/* 📍 IRL Safe Date Planner & Venue Directory */}
            <button
              onClick={() => {
                setSafeDateTarget(null);
                setIsSafeDateModalOpen(true);
              }}
              className="px-2.5 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="IRL Safe Date Planner & Verified Public Venues Directory"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Safe Dates</span>
              {safeDatePlans.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-[9px] text-stone-950 font-mono font-bold">
                  {safeDatePlans.length}
                </span>
              )}
            </button>

            {/* 🕊️ Ghost-Free Dating & Gentle Closure Assistant */}
            <button
              onClick={() => {
                setGentleClosureTarget(null);
                setIsGentleClosureModalOpen(true);
              }}
              className="px-2.5 py-1.5 bg-purple-950/50 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Ghost-Free Dating: 48h Conversation Momentum & Gentle Closure Generator"
            >
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Ghost-Free (48h)</span>
              {myProfile.respectfulCommunicatorBadge && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* 🛡️ Date Safety & Rescue Call Button */}
            <button
              onClick={() => setIsRescueCallModalOpen(true)}
              className="px-2.5 py-1.5 bg-red-950/50 hover:bg-red-900/70 border border-red-500/40 text-red-200 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
              title="Schedule an instant fake incoming phone call to gracefully escape an uncomfortable date"
            >
              <PhoneForwarded className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Rescue Call</span>
            </button>

            {/* 👤 Compulsory Live Camera Face Liveness Button */}
            <button
              onClick={() => setIsLivenessModalOpen(true)}
              className={`px-2.5 py-1.5 border text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm ${
                myProfile.biometricVerification?.verified
                  ? 'bg-emerald-950/50 hover:bg-emerald-900/70 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/70 hover:bg-rose-900/80 border-rose-500/60 text-rose-200 animate-pulse'
              }`}
              title="Compulsory Real-Face Verification: Verify your webcam face to unlock full Singles Lounge privileges"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${myProfile.biometricVerification?.verified ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className="hidden sm:inline">
                {myProfile.biometricVerification?.verified ? 'Face Verified ✓' : 'Face Scan (Compulsory)'}
              </span>
            </button>
          </div>
        </div>

        {/* TOAST ALERT */}
        {actionSuccessToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-800 border border-rose-500/50 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{actionSuccessToast}</span>
          </div>
        )}

        {/* TAB 1: DISCOVER SINGLES */}
        {activeTab === 'discover' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-stone-900/50">
            {/* Search and Filters Bar */}
            <div className="p-4 border-b border-stone-800/80 bg-stone-950/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[240px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search by interests (e.g. Cinema, Lofi, Gaming, Books), name, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-stone-800/90 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:border-rose-500 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-stone-800/80 p-0.5 rounded-lg border border-stone-700/80 text-xs">
                  <span className="text-[10px] text-stone-400 px-2 uppercase tracking-wider font-semibold">
                    Show:
                  </span>
                  {(['all', 'woman', 'man', 'non-binary'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(g)}
                      className={`px-2 py-1 rounded text-xs capitalize transition ${
                        genderFilter === g
                          ? 'bg-rose-600 text-white font-medium'
                          : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      {g === 'all' ? 'All' : g}
                    </button>
                  ))}
                </div>

                <select
                  value={intentFilter}
                  onChange={(e) => setIntentFilter(e.target.value)}
                  aria-label="Filter singles by intent"
                  className="bg-stone-800/80 border border-stone-700 text-stone-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500"
                >
                  <option value="all">Any Intent</option>
                  <option value="dating">Dating</option>
                  <option value="long_term">Long-Term</option>
                  <option value="movie_buddy">Movie Buddy</option>
                  <option value="gaming_partner">Gaming Partner</option>
                  <option value="deep_talks">Deep Talks</option>
                  <option value="open_to_vibes">Open to Vibes</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  aria-label="Sort singles profiles"
                  className="bg-stone-800/80 border border-stone-700 text-stone-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500"
                >
                  <option value="real_first">🌟 Real Registered First</option>
                  <option value="id_verified">🪪 ID Verified First</option>
                  <option value="recent">⚡ Recently Active</option>
                  <option value="recommended">Best Match %</option>
                  <option value="online">Online First</option>
                  <option value="likes">Most Liked</option>
                </select>

                <button
                  onClick={() => setIdFilterOnly(!idFilterOnly)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                    idFilterOnly
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border-stone-700 hover:text-white'
                  }`}
                  title="Filter to show only members who provided their ID upon registering"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ID Verified Only</span>
                  {idFilterOnly && (
                    <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-700 rounded-full text-[10px]">
                      {singles.filter((p) => p.isIdVerified || p.verificationBadge === 'verified_real').length}
                    </span>
                  )}
                </button>

                <div className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real Members ({singles.length})</span>
                </div>

                <button
                  onClick={fetchSingles}
                  className="p-1.5 text-stone-400 hover:text-stone-200 bg-stone-800 rounded-lg transition"
                  title="Refresh singles"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Singles Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* 🎥 NEW: Live Video Screening Date with Questions & Match/Leave Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/70 via-stone-900 to-amber-950/70 border border-rose-500/50 p-4 sm:p-5 shadow-xl">
                <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-sm shadow-rose-500/30 flex items-center gap-1">
                        <Video className="w-3 h-3 animate-pulse" /> LIVE VIDEO SCREENING
                      </span>
                      <span className="text-[11px] text-amber-300 font-medium">
                        Interactive Icebreakers • Match or Leave Decision
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      Video Call Screening with Questions 🎥✨
                    </h3>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Pair up for a live face-to-face video call with guided screening questions! When the call concludes, choose to <span className="text-rose-300 font-semibold">Get Matched</span> or <span className="text-stone-300 font-semibold">Leave</span> with zero awkwardness.
                    </p>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto shrink-0">
                    <button
                      onClick={handleStartQuickVideoScreening}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Video className="w-4 h-4 fill-white" />
                      <span>Start Video Screening 🎥</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ⚡ Interactive Speed Round & Mystery Spark Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/60 via-stone-900 to-rose-950/60 border border-rose-500/40 p-4 sm:p-5 shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500 text-white shadow-sm shadow-rose-500/30 flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-white" /> NEW INTERACTIVE FEATURE
                      </span>
                      <span className="text-[11px] text-amber-300 font-medium">
                        3-Minute Timed Mystery Chat
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      Blind Spark Speed Rounds ⚡
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                        Anonymous Icebreakers
                      </span>
                    </h3>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      Skip endless scrolling! Get paired with an anonymous mystery single for a 3-minute timed round with dilemmas. Photos unlock only if you both feel a spark!
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => setIsSpeedRoundOpen(true)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-rose-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Enter Speed Queue ⚡</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('watch')}
                      className="hidden md:flex px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-white/10 transition-colors items-center gap-1.5"
                    >
                      <Tv className="w-3.5 h-3.5 text-rose-400" />
                      <span>Watch Rooms</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Registered Singles Priority Callout */}
              <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-rose-950/30 border border-amber-500/30 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Flame className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                        100% Real Registered Community
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {singles.length} Registered
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300">
                      {isRegistered
                        ? 'Your profile is live in the lounge! You have priority placement.'
                        : 'Sample profiles have been cleared! Register your profile in 30 seconds to be featured in the Lounge.'}
                    </p>
                  </div>
                </div>

                {!isRegistered ? (
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Register My Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      You Are Live in the Lounge
                    </span>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg transition"
                    >
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>

              {singles.length === 0 ? (
                <div className="h-full py-16 flex flex-col items-center justify-center text-center p-6 text-stone-300">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500/20 via-pink-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 shadow-xl">
                    <Sparkles className="w-10 h-10 text-rose-400 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Welcome to the Singles Lounge!</h3>
                  <p className="text-xs sm:text-sm text-stone-300 max-w-md mb-6 leading-relaxed">
                    All sample profiles have been removed. This lounge is 100% reserved for real people to register, meet, co-watch, and connect.
                  </p>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="px-6 py-3 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-500/25 active:scale-95 transition flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Be the First to Register Your Profile</span>
                  </button>
                </div>
              ) : filteredSingles.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                  <div className="w-16 h-16 rounded-2xl bg-stone-800/80 flex items-center justify-center mb-3 text-stone-500">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-stone-200 mb-1">No singles match your filters</h3>
                  <p className="text-xs max-w-sm mb-4">
                    Try loosening your search keywords, or invite other singles to join this space!
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setGenderFilter('all');
                        setIntentFilter('all');
                      }}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-xs text-stone-200 rounded-lg transition"
                    >
                      Clear Filters
                    </button>
                    <button
                      onClick={() => setActiveTab('share')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs text-white rounded-lg transition flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Invite Other People
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSingles.map((profile) => {
                    const matchScore = getMatchScore(profile);
                    const isOnline = profile.onlineStatus === 'online';
                    const isMe = isRegistered && profile.id === myProfile.id;
                    const isRealUser = Boolean(profile.isRealUser);

                    return (
                      <div
                        key={profile.id}
                        className={`border rounded-2xl overflow-hidden transition duration-200 flex flex-col shadow-lg group ${
                          isMe
                            ? 'bg-gradient-to-b from-stone-800/90 to-stone-900 border-rose-500/80 shadow-rose-500/10 ring-1 ring-rose-500/30'
                            : isRealUser
                            ? 'bg-gradient-to-b from-stone-800/95 to-stone-900 border-amber-500/70 hover:border-amber-400 shadow-amber-500/10 ring-1 ring-amber-500/30'
                            : 'bg-stone-800/70 hover:bg-stone-800 border-stone-700/60 hover:border-rose-500/50 hover:shadow-rose-500/5'
                        }`}
                      >
                        {/* Profile Header Card */}
                        <div className="relative h-44 bg-stone-950 overflow-hidden cursor-pointer" onClick={() => setInspectedProfile(profile)}>
                          <img
                            src={profile.avatar}
                            alt={profile.name}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/30 to-transparent" />

                          {/* Top Badges */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                            {isMe ? (
                              <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 border border-rose-300/30">
                                <Sparkles className="w-3 h-3 text-white" />
                                <span>YOU (Top Priority)</span>
                              </div>
                            ) : isRealUser ? (
                              <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 border border-amber-300/40 animate-pulse">
                                <Flame className="w-3.5 h-3.5 fill-amber-200 text-amber-200" />
                                <span>REAL MEMBER</span>
                              </div>
                            ) : (
                              <div className="bg-stone-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1 text-xs font-semibold text-amber-300">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>{matchScore}% Match</span>
                              </div>
                            )}
                          </div>

                            {/* Online status indicator & Verified badge */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
                            {profile.respectfulCommunicatorBadge && (
                              <div className="bg-purple-950/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-purple-400/60 flex items-center gap-1 text-[10px] font-bold text-purple-300 shadow-sm" title="Zero-Ghost Guaranteed: Always provides kind closure">
                                <Award className="w-3 h-3 text-purple-400" />
                                <span>Zero-Ghost</span>
                              </div>
                            )}
                            {(profile.isIdVerified || profile.verificationBadge === 'verified_real') ? (
                              <div className="bg-emerald-950/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-emerald-400/60 flex items-center gap-1 text-[11px] font-bold text-emerald-300 shadow-sm shadow-emerald-500/20" title="ID Verified with official document upon registration">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>ID Verified</span>
                              </div>
                            ) : isRealUser ? (
                              <div className="bg-stone-900/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-stone-700 flex items-center gap-1 text-[10px] text-stone-400" title="Profile registered without ID">
                                <Shield className="w-3 h-3 text-stone-400" />
                                <span>Unverified</span>
                              </div>
                            ) : null}
                            <div className="bg-stone-900/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-stone-700 flex items-center gap-1.5 text-[11px] text-stone-300">
                              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                              <span>{isOnline ? 'Online' : 'Active today'}</span>
                            </div>
                          </div>

                          {/* Profile bottom info */}
                          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-base font-bold text-white leading-none drop-shadow flex items-center gap-1">
                                  {profile.name}
                                  {(profile.isIdVerified || profile.verificationBadge === 'verified_real') ? (
                                    <ShieldCheck className="w-4 h-4 text-emerald-400 fill-emerald-400/20 shrink-0" title="Official ID Verified upon registration" />
                                  ) : isRealUser ? (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-stone-800/90 text-stone-400 border border-stone-700">ID Pending</span>
                                  ) : null}
                                </h4>
                                <span className="text-sm font-semibold text-stone-300">
                                  {profile.age}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-stone-300 mt-1">
                                <MapPin className="w-3 h-3 text-rose-400" />
                                <span>{profile.city || 'Anywhere'}</span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {isRealUser && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  ★ Featured
                                </span>
                              )}
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 capitalize">
                                {profile.intent.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Profile Body */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                          {/* Bio */}
                          <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                            {profile.bio || 'Exploring new connections, movie nights, and meaningful talks.'}
                          </p>

                          {/* Current Vibe */}
                          {profile.currentVibe && (
                            <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <span>✨</span>
                              <span className="truncate italic">{profile.currentVibe}</span>
                            </div>
                          )}

                          {/* Interests Tags */}
                          <div className="flex flex-wrap gap-1">
                            {(profile.interests || []).slice(0, 4).map((interest, idx) => {
                              const isShared = myProfile.interests?.includes(interest);
                              return (
                                <span
                                  key={idx}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                                    isShared
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold'
                                      : 'bg-stone-700/50 text-stone-300'
                                  }`}
                                >
                                  {interest}
                                </span>
                              );
                            })}
                            {(profile.interests?.length || 0) > 4 && (
                              <span className="text-[10px] text-stone-400 px-1 py-0.5">
                                +{(profile.interests?.length || 0) - 4} more
                              </span>
                            )}
                          </div>

                          {/* Voice Note Prompt Player (if present or on featured/real users) */}
                          {(profile.voicePromptQuestion || profile.voicePromptUrl || profile.isRealUser) && (
                            <VoicePromptPlayer
                              question={profile.voicePromptQuestion || 'Listen to my vibe 🎙️'}
                              audioUrl={profile.voicePromptUrl}
                              durationSec={profile.voicePromptDurationSec || 7}
                              compact
                            />
                          )}

                          {/* Biometric Verification Badge */}
                          {profile.biometricVerification?.verified && (
                            <div className="px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-[11px] text-emerald-300">
                              <span className="flex items-center gap-1 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Face Liveness Verified</span>
                              </span>
                              <span className="text-[10px] text-emerald-400/80 font-mono">100% Real Match</span>
                            </div>
                          )}

                          {/* Wingman Friend Vouch Card */}
                          {profile.wingmanVouch ? (
                            <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-purple-300 flex items-center gap-1">
                                  🛡️ Vouched by {profile.wingmanVouch.friendName} ({profile.wingmanVouch.friendRelation})
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30 font-semibold">
                                  {profile.wingmanVouch.highlightTag}
                                </span>
                              </div>
                              <p className="text-[11px] italic text-stone-300 leading-snug">
                                "{profile.wingmanVouch.quote}"
                              </p>
                            </div>
                          ) : profile.wingmanEndorsement ? (
                            <div className="p-2 rounded-xl bg-purple-950/20 border border-purple-500/20 text-[11px] italic text-purple-200">
                              <span>🛡️ Wingman: "{profile.wingmanEndorsement}"</span>
                            </div>
                          ) : null}

                          {/* Quick Actions Row */}
                          <div className="pt-2 border-t border-stone-700/60">
                            {isMe ? (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Your Live Profile (#1)
                                </span>
                                <button
                                  onClick={() => setActiveTab('profile')}
                                  className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-white text-xs font-semibold rounded-lg transition"
                                >
                                  Edit Profile
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="grid grid-cols-3 gap-1.5">
                                  <button
                                    onClick={() => {
                                      setWavingToProfile(profile);
                                      setWaveType('wave');
                                    }}
                                    className="px-2 py-1.5 bg-stone-700/60 hover:bg-stone-700 text-stone-200 text-xs rounded-lg font-medium transition flex items-center justify-center gap-1"
                                    title="Send friendly wave"
                                  >
                                    <span>👋</span>
                                    <span>Wave</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setWavingToProfile(profile);
                                      setWaveType('crush');
                                    }}
                                    className="px-2 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs rounded-lg font-medium transition flex items-center justify-center gap-1"
                                    title="Send secret crush spark"
                                  >
                                    <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                                    <span>Spark</span>
                                  </button>

                                  <button
                                    onClick={() => handleCreateInstantSpaceWith(profile)}
                                    className="px-2 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs rounded-lg font-semibold transition flex items-center justify-center gap-1 shadow-sm"
                                    title="Invite to private 1-on-1 Haven Space (Watch/Chat)"
                                  >
                                    <Tv className="w-3.5 h-3.5" />
                                    <span>Invite</span>
                                  </button>
                                </div>

                                {/* ⚔️ Compatibility Mini-Duel Button */}
                                <button
                                  onClick={() => setDuelPartner(profile)}
                                  className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 hover:from-amber-500/20 hover:to-rose-500/20 border border-white/10 hover:border-rose-400/40 text-stone-200 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all group/duel"
                                  title="Play 5-question compatibility mini-duel"
                                >
                                  <Swords className="w-3.5 h-3.5 text-amber-400 group-hover/duel:rotate-12 transition-transform" />
                                  <span>Play Compatibility Mini-Duel (5 Dilemmas)</span>
                                </button>

                                {/* 🎥 Video Screening Call Button */}
                                <button
                                  onClick={() => handleStartVideoScreening(profile)}
                                  className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-600/20 via-pink-600/20 to-amber-600/20 hover:from-rose-600/30 hover:to-amber-600/30 border border-rose-500/40 hover:border-rose-400 text-rose-200 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all group/call"
                                  title="Start Video Screening Call with questions and match/leave decision"
                                >
                                  <Video className="w-3.5 h-3.5 text-rose-400 group-hover/call:scale-110 transition-transform" />
                                  <span>Video Screening Call (Q&A + Decide) 🎥</span>
                                </button>

                                {/* 📅 Schedule Virtual First-Date Button */}
                                <button
                                  onClick={() => {
                                    setVirtualDateTarget(profile);
                                    setIsVirtualDateModalOpen(true);
                                  }}
                                  className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600/30 hover:to-purple-600/30 border border-pink-500/30 hover:border-pink-400 text-pink-200 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                                  title="Schedule a virtual first date with synced calendar invite (Google/iCal)"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-pink-400" />
                                  <span>Schedule Virtual First-Date 📅</span>
                                </button>

                                {/* 📍 Plan Safe IRL Date Button */}
                                <button
                                  onClick={() => {
                                    setSafeDateTarget(profile);
                                    setIsSafeDateModalOpen(true);
                                  }}
                                  className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 hover:border-emerald-400 text-emerald-200 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                                  title="Plan an IRL safe date at a verified public venue with walk-me-home safety timer"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Plan Safe IRL Date 📍</span>
                                </button>

                                {/* 🕊️ Gentle Closure / Polite Letdown Button */}
                                <button
                                  onClick={() => {
                                    setGentleClosureTarget(profile);
                                    setIsGentleClosureModalOpen(true);
                                  }}
                                  className="w-full py-1 px-3 rounded-xl bg-purple-950/20 hover:bg-purple-900/30 border border-purple-500/20 hover:border-purple-400/40 text-purple-300/90 hover:text-purple-200 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                                  title="Send a polite closure note or check 48h conversation momentum"
                                >
                                  <Compass className="w-3 h-3 text-purple-400" />
                                  <span>Polite Closure & Momentum 🕊️</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: WATCH & VIBE (CO-VIEWING MINI THEATERS) */}
        {activeTab === 'watch' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-stone-900/60">
            <CoViewingLoungeView
              socket={socket}
              currentProfile={myProfile}
              singles={singles}
              onWaveProfile={(person, type) => {
                setWavingToProfile(person);
                setWaveType(type);
              }}
              onInspectProfile={(person) => setInspectedProfile(person)}
            />
          </div>
        )}

        {/* TAB 2: REGISTER OR EDIT MY PROFILE */}
        {activeTab === 'profile' && (
          <div className="flex-1 overflow-y-auto p-5 bg-stone-900/60">
            <div className="max-w-2xl mx-auto bg-stone-800/70 border border-stone-700/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-stone-700 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-rose-400" />
                    {isRegistered ? 'Your Singles Profile & Broadcast' : 'Register Your Singles Profile'}
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Other singles will discover you, send waves, and invite you to private watch parties.
                  </p>
                </div>
                {isRegistered && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                    ✓ Broadcast Live
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* 🔴 COMPULSORY LIVE CAMERA FACE VERIFICATION BANNER */}
                <div className={`p-4 rounded-2xl border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition-all ${
                  myProfile.biometricVerification?.verified
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
                    : 'bg-rose-950/50 border-rose-500/70 text-rose-100 ring-1 ring-rose-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                      myProfile.biometricVerification?.verified
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-500/60 text-rose-300 animate-pulse'
                    }`}>
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">
                          Live Camera Face Verification
                        </h4>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          myProfile.biometricVerification?.verified
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500 text-white border-rose-400'
                        }`}>
                          {myProfile.biometricVerification?.verified ? '✓ Verified (Compulsory Met)' : 'Compulsory • Required'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 mt-0.5">
                        {myProfile.biometricVerification?.verified
                          ? 'Real face biometric verified! Your profile is protected against catfishing & impersonation.'
                          : 'Live webcam face check is COMPULSORY for all members before broadcasting your profile.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLivenessModalOpen(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md ${
                      myProfile.biometricVerification?.verified
                        ? 'bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/40'
                        : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-500/30'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{myProfile.biometricVerification?.verified ? 'Re-Verify Face' : 'Start Face Check 👤'}</span>
                  </button>
                </div>

                {/* 1. Avatar selection */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                    Profile Photo / Avatar
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={myProfile.avatar}
                      alt="Avatar preview"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500 shadow-md"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {DEFAULT_AVATARS.map((av, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setMyProfile({ ...myProfile, avatar: av })}
                            className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition ${
                              myProfile.avatar === av ? 'border-rose-500 scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={av} alt={`Option ${idx}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer text-[11px] text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload Custom Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await cropAndCompressAvatar(file, 300, 0.85);
                                  setMyProfile({ ...myProfile, avatar: compressed });
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Basic Info (Name, Age, Gender) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Display Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex"
                      value={myProfile.name}
                      onChange={(e) => setMyProfile({ ...myProfile, name: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Age</label>
                    <input
                      type="number"
                      min={18}
                      max={99}
                      value={myProfile.age}
                      onChange={(e) => setMyProfile({ ...myProfile, age: Number(e.target.value) || 24 })}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">I am a</label>
                    <select
                      value={myProfile.gender}
                      onChange={(e: any) => setMyProfile({ ...myProfile, gender: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                    >
                      <option value="woman">Woman</option>
                      <option value="man">Man</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* 3. Location and Intent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">City / Region</label>
                    <input
                      type="text"
                      placeholder="e.g. Brooklyn, NY or London"
                      value={myProfile.city}
                      onChange={(e) => setMyProfile({ ...myProfile, city: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Relationship Goal / Intent</label>
                    <select
                      value={myProfile.intent}
                      onChange={(e: any) => setMyProfile({ ...myProfile, intent: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                    >
                      <option value="dating">Dating & Romance</option>
                      <option value="long_term">Long-Term Relationship</option>
                      <option value="movie_buddy">Movie Buddy / Watch Parties</option>
                      <option value="gaming_partner">Co-Op Gaming Partner</option>
                      <option value="deep_talks">Late-Night Deep Talks</option>
                      <option value="open_to_vibes">Open to Whatever Feels Right</option>
                    </select>
                  </div>
                </div>

                {/* 4. Bio */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Bio / About You</label>
                  <textarea
                    rows={2}
                    placeholder="What do you enjoy? What are you passionate about? Give people a fun reason to say hello..."
                    value={myProfile.bio}
                    onChange={(e) => setMyProfile({ ...myProfile, bio: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none resize-none"
                  />
                </div>

                {/* 5. Current Vibe Status */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Current Vibe (Displayed on Card)</label>
                  <input
                    type="text"
                    placeholder="e.g. Down for a cozy late-night movie stream ☕"
                    value={myProfile.currentVibe}
                    onChange={(e) => setMyProfile({ ...myProfile, currentVibe: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-amber-300 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                {/* 6. Passions & Interests Tags */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-2">
                    Passions & Interests (Select what you love)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-stone-900/70 border border-stone-700 rounded-xl mb-2">
                    {CURATED_PASSIONS.map((tag) => {
                      const isSelected = myProfile.interests?.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const cur = myProfile.interests || [];
                            if (isSelected) {
                              setMyProfile({ ...myProfile, interests: cur.filter((i) => i !== tag) });
                            } else {
                              setMyProfile({ ...myProfile, interests: [...cur, tag] });
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                            isSelected
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Tag */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add custom interest..."
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customTagInput.trim()) {
                          e.preventDefault();
                          const val = customTagInput.trim();
                          if (!myProfile.interests?.includes(val)) {
                            setMyProfile({ ...myProfile, interests: [...(myProfile.interests || []), val] });
                          }
                          setCustomTagInput('');
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customTagInput.trim()) {
                          const val = customTagInput.trim();
                          if (!myProfile.interests?.includes(val)) {
                            setMyProfile({ ...myProfile, interests: [...(myProfile.interests || []), val] });
                          }
                          setCustomTagInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-xs text-white rounded-xl transition"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* 7. Fun Spark Prompts */}
                <div className="space-y-3 pt-2 border-t border-stone-700">
                  <label className="block text-xs font-semibold text-stone-300">
                    Spark Prompt & Icebreaker Question
                  </label>
                  <div className="space-y-2">
                    <select
                      value={myProfile.prompts?.[0]?.question || PROMPT_QUESTIONS[0]}
                      onChange={(e) => {
                        const q = e.target.value;
                        const existingAnswer = myProfile.prompts?.[0]?.answer || '';
                        setMyProfile({
                          ...myProfile,
                          prompts: [{ question: q, answer: existingAnswer }],
                        });
                      }}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-amber-300 focus:border-rose-500 focus:outline-none"
                    >
                      {PROMPT_QUESTIONS.map((pq, idx) => (
                        <option key={idx} value={pq}>
                          {pq}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Write your answer here..."
                      value={myProfile.prompts?.[0]?.answer || ''}
                      onChange={(e) => {
                        const ans = e.target.value;
                        const curQ = myProfile.prompts?.[0]?.question || PROMPT_QUESTIONS[0];
                        setMyProfile({
                          ...myProfile,
                          prompts: [{ question: curQ, answer: ans }],
                        });
                      }}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 8. Voice Note Prompt & Audio Vibe */}
                <div className="space-y-3 pt-2 border-t border-stone-700">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-rose-400" />
                      <span>Audio Voice Note Prompt (Hear Your Vibe)</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-medium">
                      Audio Synthetic + Voice Wave
                    </span>
                  </div>
                  <div className="space-y-2">
                    <select
                      value={myProfile.voicePromptQuestion || 'My late night drive vibe 🎙️'}
                      onChange={(e) => {
                        setMyProfile({
                          ...myProfile,
                          voicePromptQuestion: e.target.value,
                          voicePromptDurationSec: 7,
                        });
                      }}
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-rose-300 focus:border-rose-500 focus:outline-none"
                    >
                      <option value="My late night drive vibe 🎙️">My late night drive vibe 🎙️</option>
                      <option value="My most controversial food opinion 🎙️">My most controversial food opinion 🎙️</option>
                      <option value="Saying hello and giving a warm wave 🎙️">Saying hello and giving a warm wave 🎙️</option>
                      <option value="A comfort song I will sing out loud 🎙️">A comfort song I will sing out loud 🎙️</option>
                      <option value="What makes me laugh till my stomach hurts 🎙️">What makes me laugh till my stomach hurts 🎙️</option>
                    </select>

                    <div className="p-3 bg-stone-900/80 border border-stone-700/80 rounded-xl flex items-center justify-between gap-3">
                      <VoicePromptPlayer
                        question={myProfile.voicePromptQuestion || 'My late night drive vibe 🎙️'}
                        durationSec={7}
                        compact
                      />
                      <span className="text-[10px] text-stone-400 italic">
                        Preview how others hear your prompt
                      </span>
                    </div>
                  </div>
                </div>

                {/* 9. Wingman Endorsement & Friend Voice Vouch */}
                <div className="space-y-3 pt-2 border-t border-stone-700">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                      <span>🛡️ Wingman Endorsement & Friend Voice Vouch</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsWingmanModalOpen(true)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <Mic className="w-3 h-3" />
                      <span>{myProfile.wingmanVouch ? 'Edit Friend Vouch' : '+ Add Voice Vouch'}</span>
                    </button>
                  </div>

                  {myProfile.wingmanVouch ? (
                    <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-200 flex items-center gap-1">
                          🎙️ Vouched by {myProfile.wingmanVouch.friendName} ({myProfile.wingmanVouch.friendRelation})
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[10px] font-bold">
                          {myProfile.wingmanVouch.highlightTag}
                        </span>
                      </div>
                      <p className="text-xs italic text-stone-200">
                        "{myProfile.wingmanVouch.quote}"
                      </p>
                      {myProfile.wingmanVouch.audioUrl && (
                        <div className="pt-1">
                          <VoicePromptPlayer
                            question={`Friend Review by ${myProfile.wingmanVouch.friendName}`}
                            audioUrl={myProfile.wingmanVouch.audioUrl}
                            durationSec={myProfile.wingmanVouch.audioDurationSec || 15}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="e.g. 'Can cook anything from scratch and never leaves a friend hanging.' — Sam"
                        value={myProfile.wingmanEndorsement || ''}
                        onChange={(e) => setMyProfile({ ...myProfile, wingmanEndorsement: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                      />
                      <p className="text-[11px] text-stone-400">
                        Have a close friend vouch for you with audio or a personal review to build massive credibility.
                      </p>
                    </div>
                  )}
                </div>

                {/* 10. Official ID Verification Section */}
                <div className="pt-3 border-t border-stone-700/80 space-y-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-stone-900 to-stone-900 border border-emerald-500/40 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                              Official ID Verification
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                              Required for Verified Badge
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-300 mt-0.5">
                            To get verified, provide an official ID upon registering. Verified members earn the official shield badge (✓ 🪪) & top priority lounge ranking.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Toggle: Wants Verification */}
                    <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="wants-id-verification-check"
                          checked={wantsIdVerification}
                          onChange={(e) => setWantsIdVerification(e.target.checked)}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />
                        <label htmlFor="wants-id-verification-check" className="text-xs font-semibold text-stone-200 cursor-pointer">
                          I want to provide my ID upon registering to get the Verified Badge
                        </label>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        wantsIdVerification ? 'text-emerald-400 bg-emerald-500/10' : 'text-stone-400 bg-stone-800'
                      }`}>
                        {wantsIdVerification ? 'Badge Requested' : 'Unverified'}
                      </span>
                    </div>

                    {wantsIdVerification ? (
                      <div className="space-y-3 pt-1">
                        {/* ID Document Type Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Select ID Document Type</span>
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { type: 'drivers_license', label: "Driver's License", icon: '🪪' },
                              { type: 'passport', label: 'Passport', icon: '🛂' },
                              { type: 'national_id', label: 'National ID', icon: '🆔' },
                              { type: 'student_id', label: 'Student / State ID', icon: '🎓' },
                            ].map((item) => (
                              <button
                                key={item.type}
                                type="button"
                                onClick={() => setIdDocType(item.type as IdDocumentType)}
                                className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                                  idDocType === item.type
                                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                                    : 'bg-stone-900/80 hover:bg-stone-900 text-stone-300 border-stone-800'
                                }`}
                              >
                                <span>{item.icon}</span>
                                <span className="truncate">{item.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ID Document Number Masked */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-300 mb-1">
                            Document Identification / Reference Number *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. DL-92847194 or Last 4 Digits"
                            value={idNumberInput}
                            onChange={(e) => setIdNumberInput(e.target.value)}
                            className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        {/* Document Photo / Scan Upload or Instant Demo Pass */}
                        <div>
                          <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <ScanLine className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Provide ID Document Photo or Digital Pass</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium">
                              🔒 256-Bit Encrypted & Kept Private
                            </span>
                          </label>

                          {idDocPhoto ? (
                            <div className="bg-stone-950/80 border border-emerald-500/50 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <img
                                  src={idDocPhoto}
                                  alt="ID Document Preview"
                                  className="w-24 h-16 rounded-lg object-cover border border-emerald-500/40 shadow-sm"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    <span>ID Document Attached</span>
                                  </div>
                                  <p className="text-[11px] text-stone-300 mt-0.5">
                                    {idDocType.replace('_', ' ').toUpperCase()} • Watermarked for verification
                                  </p>
                                  <span className="inline-block mt-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    Ready for Verified Badge on Save
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <label className="cursor-pointer px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition">
                                  <span>Change Photo</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleIdFileUpload(file);
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setIdDocPhoto('')}
                                  className="px-2.5 py-1.5 text-stone-400 hover:text-rose-400 text-xs transition"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Upload custom image */}
                              <label className="cursor-pointer border-2 border-dashed border-stone-700 hover:border-emerald-500/60 bg-stone-900/50 hover:bg-stone-900 rounded-xl p-3 flex flex-col items-center justify-center text-center transition group">
                                <Upload className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition" />
                                <span className="text-xs font-semibold text-stone-200">
                                  Upload ID Photo or Scan
                                </span>
                                <span className="text-[10px] text-stone-400 mt-0.5">
                                  JPG, PNG, WebP (Front of ID)
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleIdFileUpload(file);
                                  }}
                                />
                              </label>

                              {/* Instant demo ID pass generator */}
                              <button
                                type="button"
                                onClick={handleUseDemoIdPass}
                                disabled={isScanningId}
                                className="border border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/50 rounded-xl p-3 flex flex-col items-center justify-center text-center transition group active:scale-98"
                              >
                                <BadgeCheck className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition" />
                                <span className="text-xs font-semibold text-emerald-300">
                                  {isScanningId ? 'Generating Encrypted Pass...' : '⚡ Use Instant Demo ID Pass'}
                                </span>
                                <span className="text-[10px] text-emerald-400/80 mt-0.5">
                                  Generates official resident ID pass for instant testing
                                </span>
                              </button>
                            </div>
                          )}

                          <div className="mt-2.5 flex items-start gap-1.5 text-[11px] text-stone-400">
                            <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                            <span>
                              <strong>Anti-Catfish Guarantee:</strong> Haven ID verification encrypts your document with an irreversible watermark. Your actual ID is never displayed to other members; only your Verified Member badge is displayed.
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          Without providing your ID, you can still register, but your profile will show as <strong>Unverified (ID Pending)</strong> and will not receive the verified badge.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 11. Compulsory Live Camera Face-Match & Liveness Verification */}
                <div className="pt-3 border-t border-stone-700/80 space-y-3">
                  <div className={`p-4 rounded-2xl border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    myProfile.biometricVerification?.verified
                      ? 'bg-gradient-to-br from-emerald-950/30 via-stone-900 to-stone-900 border-emerald-500/30'
                      : 'bg-gradient-to-br from-rose-950/40 via-stone-900 to-stone-900 border-rose-500/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        myProfile.biometricVerification?.verified
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                      }`}>
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            Live Camera Face-Match & Liveness Check
                          </h4>
                          {myProfile.biometricVerification?.verified ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ✓ Compulsory Met ({myProfile.biometricVerification.confidenceScore}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/50 uppercase tracking-wider">
                              Compulsory • Required
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-300 mt-0.5">
                          Compulsory for all singles to maintain a trusted, catfish-free space. Tests live camera movements (smile & head tilt) to verify you match your real photos.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsLivenessModalOpen(true)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md ${
                        myProfile.biometricVerification?.verified
                          ? 'bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-500/20'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{myProfile.biometricVerification?.verified ? 'Re-Verify Face' : 'Start Compulsory Face Check 👤'}</span>
                    </button>
                  </div>
                </div>

                {/* 12. Zero-Ghosting Honor Pledge */}
                <div className="pt-3 border-t border-stone-700/80 space-y-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 via-stone-900 to-stone-900 border border-purple-500/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                        <Award className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            Zero-Ghosting Honor Pledge
                          </h4>
                          {myProfile.respectfulCommunicatorBadge ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              ✓ Active Member Badge
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-700 text-stone-300">
                              Optional Boost
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-300 mt-0.5">
                          Commit to kind and mature dating. Promise to send a polite closure message instead of suddenly disappearing or ghosting matches.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !myProfile.respectfulCommunicatorBadge;
                        setMyProfile({ ...myProfile, respectfulCommunicatorBadge: nextVal });
                        if (nextVal) {
                          handlePledgeZeroGhost();
                        } else {
                          showToast('Pledge removed from profile.');
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-md ${
                        myProfile.respectfulCommunicatorBadge
                          ? 'bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-400/40'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                      <span>{myProfile.respectfulCommunicatorBadge ? 'Pledged ✓' : 'Take Pledge 🕊️'}</span>
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-4 flex items-center justify-between gap-3 border-t border-stone-800">
                  {isRegistered ? (
                    <button
                      type="button"
                      onClick={handleDeleteProfile}
                      className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove / Unregister Profile</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-stone-400">
                      ✨ Join the real member directory
                    </span>
                  )}

                  <button
                    type="submit"
                    className={`px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 ${
                      myProfile.biometricVerification?.verified
                        ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-rose-500/20'
                        : 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-rose-500/30 ring-2 ring-rose-400/40 animate-pulse'
                    }`}
                  >
                    {myProfile.biometricVerification?.verified ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                    <span>
                      {!myProfile.biometricVerification?.verified
                        ? 'Verify Face & Join Lounge 👤'
                        : isRegistered
                        ? 'Update & Save Profile'
                        : 'Save & Broadcast Profile'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: SPARKS & WAVES INBOX */}
        {activeTab === 'inbox' && (
          <div className="flex-1 overflow-y-auto p-5 bg-stone-900/60">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-rose-400" />
                    Sparks & Space Invitations
                  </h3>
                  <p className="text-xs text-stone-400">
                    Waves, secret crushes, and private Haven space invites sent directly to you.
                  </p>
                </div>
                <button
                  onClick={fetchWaves}
                  className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>

              {myWaves.length === 0 ? (
                <div className="bg-stone-800/40 border border-stone-700/60 rounded-2xl p-8 text-center text-stone-400">
                  <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-3 text-stone-500">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-stone-200 mb-1">No sparks yet</h4>
                  <p className="text-xs max-w-sm mx-auto mb-4">
                    Send waves to singles in the Discover tab or invite people to get the conversation started!
                  </p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white rounded-xl transition"
                  >
                    Explore Singles Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myWaves.map((wave) => {
                    const isInvite = wave.type === 'invite' && wave.proposedRoomId;
                    const isCrush = wave.type === 'crush';

                    return (
                      <div
                        key={wave.id}
                        className={`p-4 rounded-2xl border transition ${
                          isInvite
                            ? 'bg-gradient-to-r from-amber-950/40 to-rose-950/40 border-amber-500/40 shadow-md'
                            : 'bg-stone-800/70 border-stone-700/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={wave.fromAvatar || DEFAULT_AVATARS[0]}
                              alt={wave.fromName}
                              className="w-11 h-11 rounded-xl object-cover border border-stone-700"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{wave.fromName}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    isInvite
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : isCrush
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  }`}
                                >
                                  {isInvite ? '🎬 Private Space Invite' : isCrush ? '💖 Secret Crush Spark' : '👋 Wave'}
                                </span>
                              </div>
                              <p className="text-xs text-stone-300 mt-1">{wave.message}</p>
                            </div>
                          </div>

                          <span className="text-[10px] text-stone-500 whitespace-nowrap">
                            {new Date(wave.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Invite Accept Action */}
                        {isInvite && (
                          <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between">
                            <span className="text-xs text-amber-300 font-medium flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5" />
                              Private Room: {wave.proposedRoomId}
                            </span>
                            <button
                              onClick={() => {
                                if (wave.proposedRoomId && wave.proposedPasskey) {
                                  onStartOneOnOneSpace(wave.proposedRoomId, wave.proposedPasskey, {
                                    id: wave.fromId,
                                    name: wave.fromName,
                                    avatar: wave.fromAvatar,
                                    age: 24,
                                    gender: 'other',
                                    lookingFor: ['everyone'],
                                    intent: 'dating',
                                    city: 'Haven Space',
                                    bio: '',
                                    interests: [],
                                    prompts: [],
                                    currentVibe: 'In private date space',
                                    onlineStatus: 'online',
                                    registeredAt: Date.now(),
                                    lastActive: Date.now(),
                                  });
                                  onClose();
                                }
                              }}
                              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
                            >
                              <span>Enter Private Space Together</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SHARE & GET OTHER PEOPLE HERE */}
        {activeTab === 'share' && (
          <div className="flex-1 overflow-y-auto p-5 bg-stone-900/60">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center mx-auto text-white shadow-lg shadow-rose-500/20">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Get Other People in the Singles Lounge</h3>
                <p className="text-xs text-stone-400 max-w-md mx-auto">
                  Share your link with singles you know or post it in group chats. Anyone who clicks can register their profile and connect with you!
                </p>
              </div>

              {/* Share URL Card */}
              <div className="bg-stone-800/80 border border-stone-700/80 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-semibold text-stone-300">
                  Your Personal Singles Lounge Invite Link
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-stone-900 rounded-xl border border-stone-700 text-xs text-stone-200 font-mono truncate">
                    {inviteUrl}
                  </div>
                  <button
                    onClick={copyInviteLink}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Pre-written message templates */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-stone-300">
                  Choose an Icebreaker Invite Template
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'chill', label: 'Casual & Chill 🌿' },
                    { id: 'movie', label: 'Movie Watch Buddy 🎬' },
                    { id: 'flirty', label: 'Sparks & Dating 💖' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setShareTextTemplate(t.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                        shareTextTemplate === t.id
                          ? 'bg-rose-950/50 border-rose-500 text-rose-300'
                          : 'bg-stone-800/60 border-stone-700 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-xl text-xs text-stone-300 font-medium italic">
                  "{getShareMessage()}"
                </div>
              </div>

              {/* Direct Social Share Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(getShareMessage())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-emerald-300 font-semibold transition"
                >
                  <span className="text-base">📱</span>
                  <span>WhatsApp</span>
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(getShareMessage())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-sky-950/40 hover:bg-sky-900/40 border border-sky-800/40 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-sky-300 font-semibold transition"
                >
                  <span className="text-base">✈️</span>
                  <span>Telegram</span>
                </a>

                {/* X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareMessage())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-stone-800/80 hover:bg-stone-800 border border-stone-700 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-stone-200 font-semibold transition"
                >
                  <span className="text-base">🐦</span>
                  <span>X / Twitter</span>
                </a>

                {/* Native Share */}
                <button
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'Haven Singles Lounge',
                          text: getShareMessage(),
                          url: inviteUrl,
                        });
                      } catch {}
                    } else {
                      copyInviteLink();
                    }
                  }}
                  className="p-3 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/40 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-rose-300 font-semibold transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Anywhere</span>
                </button>
              </div>

              {/* QR Code Scan Section */}
              <div className="p-4 bg-stone-800/60 border border-stone-700 rounded-2xl flex items-center gap-4">
                <div className="w-20 h-20 bg-white p-2 rounded-xl flex items-center justify-center shrink-0">
                  {/* Visual QR Code Generator */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteUrl)}`}
                    alt="Singles Invite QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-amber-400" />
                    Scan to Join with Phone
                  </h4>
                  <p className="text-xs text-stone-400 mt-1">
                    At a party, event, or with friends? Open your phone camera to scan and register directly into the Haven Singles Lounge!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SINGLES HANGOUT / MIXER */}
        {activeTab === 'mixer' && (
          <div className="flex-1 overflow-y-auto p-5 bg-stone-900/60 flex flex-col items-center justify-center text-center">
            <div className="max-w-md w-full bg-stone-800/80 border border-stone-700/80 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400">
                <Coffee className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">The Communal Singles Mixer</h3>
                <p className="text-xs text-stone-400 mt-1">
                  Want to hang out with other singles right now? Jump into the open communal room to chat, share music, play casual games, or watch movies together.
                </p>
              </div>

              <div className="p-3.5 bg-stone-900/90 border border-stone-800 rounded-xl text-left space-y-1.5 text-xs text-stone-300">
                <div className="flex items-center gap-2 font-medium text-purple-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Communal Table Features:</span>
                </div>
                <p className="text-stone-400">• Open to all registered singles without needing private invites</p>
                <p className="text-stone-400">• Synchronized music player & watch party</p>
                <p className="text-stone-400">• Casual group games & icebreaker prompts</p>
              </div>

              <button
                onClick={handleJoinCommunalMixer}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <Coffee className="w-4 h-4" />
                <span>Enter Communal Singles Lounge Now</span>
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM STATUS FOOTER */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Safe & End-to-End Encrypted 1-on-1 Spaces
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-500">
              Haven Community Singles Lounge • v2.0
            </span>
          </div>
        </div>

        {/* COMPOSE WAVE / SPARK MODAL */}
        {wavingToProfile && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-stone-900 border border-stone-700 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={wavingToProfile.avatar}
                    alt={wavingToProfile.name}
                    className="w-10 h-10 rounded-xl object-cover border border-stone-700"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Connect with {wavingToProfile.name}
                    </h4>
                    <p className="text-[11px] text-stone-400">
                      {wavingToProfile.age} • {wavingToProfile.city}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWavingToProfile(null)}
                  className="p-1 rounded-lg hover:bg-stone-800 text-stone-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Wave Type Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setWaveType('wave')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    waveType === 'wave'
                      ? 'bg-blue-950/50 border-blue-500 text-blue-300'
                      : 'bg-stone-800/60 border-stone-700 text-stone-300'
                  }`}
                >
                  <span>👋</span>
                  <span>Friendly Wave</span>
                </button>

                <button
                  onClick={() => setWaveType('crush')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    waveType === 'crush'
                      ? 'bg-rose-950/50 border-rose-500 text-rose-300'
                      : 'bg-stone-800/60 border-stone-700 text-stone-300'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" />
                  <span>Secret Crush Spark</span>
                </button>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Add an Icebreaker Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    waveType === 'crush'
                      ? 'Hey! Loved your taste in music and films...'
                      : 'Hey! Saw we both love cinema and lofi, thought I’d say hi!'
                  }
                  value={customWaveMessage}
                  onChange={(e) => setCustomWaveMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setWavingToProfile(null)}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendWaveSubmit}
                  disabled={isSendingWave}
                  className="px-4 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingWave ? 'Sending...' : 'Send to ' + wavingToProfile.name}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULL PROFILE DETAIL MODAL */}
        {inspectedProfile && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Image banner */}
              <div className="relative h-64 bg-stone-950">
                <img
                  src={inspectedProfile.avatar}
                  alt={inspectedProfile.name}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />
                <button
                  onClick={() => setInspectedProfile(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white leading-none flex items-center gap-1.5">
                        {inspectedProfile.name}, {inspectedProfile.age}
                        {(inspectedProfile.isIdVerified || inspectedProfile.verificationBadge === 'verified_real') ? (
                          <ShieldCheck className="w-5 h-5 text-emerald-400 fill-emerald-400/20" title="Official ID Verified upon registration" />
                        ) : inspectedProfile.isRealUser ? (
                          <Shield className="w-4 h-4 text-stone-400" title="ID Pending" />
                        ) : null}
                      </h3>
                      {(inspectedProfile.isIdVerified || inspectedProfile.verificationBadge === 'verified_real') ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Official ID Verified
                        </span>
                      ) : inspectedProfile.isRealUser ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-stone-400" />
                          Unverified (ID Pending)
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-stone-300 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      {inspectedProfile.city || 'Anywhere'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40 capitalize">
                    {inspectedProfile.intent.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Official Identity Verification Trust Banner */}
                {(inspectedProfile.isIdVerified || inspectedProfile.verificationBadge === 'verified_real') ? (
                  <div className="p-3.5 bg-gradient-to-r from-emerald-950/50 via-stone-900 to-stone-900 border border-emerald-500/40 rounded-xl space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-bold text-emerald-300 text-xs">
                          Official ID Verified Member
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                        100% Anti-Catfish Protected
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      Verified with official {inspectedProfile.idVerification?.documentName || "government ID document"} upon registration.
                      {inspectedProfile.idVerification?.documentNumberMasked && (
                        <span className="text-emerald-400/80 block mt-0.5 font-mono text-[10px]">
                          Encrypted Ref: {inspectedProfile.idVerification.documentNumberMasked}
                        </span>
                      )}
                    </p>
                  </div>
                ) : inspectedProfile.isRealUser ? (
                  <div className="p-3 bg-stone-900/90 border border-stone-700/80 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-stone-400">
                      <AlertCircle className="w-4 h-4 text-stone-400 shrink-0" />
                      <span>Unverified Member — ID was not provided upon registering</span>
                    </div>
                    {inspectedProfile.id === myProfile.id && (
                      <button
                        onClick={() => {
                          setInspectedProfile(null);
                          setActiveTab('profile');
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition shrink-0"
                      >
                        Verify My ID
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Current Vibe */}
                {inspectedProfile.currentVibe && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>"{inspectedProfile.currentVibe}"</span>
                  </div>
                )}

                {/* Voice Note Prompt Player */}
                {(inspectedProfile.voicePromptQuestion || inspectedProfile.voicePromptUrl || inspectedProfile.isRealUser) && (
                  <div className="space-y-1">
                    <h5 className="font-semibold text-stone-300 flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 text-rose-400" />
                      <span>Voice Note Vibe</span>
                    </h5>
                    <VoicePromptPlayer
                      question={inspectedProfile.voicePromptQuestion || 'Listen to my vibe 🎙️'}
                      audioUrl={inspectedProfile.voicePromptUrl}
                      durationSec={inspectedProfile.voicePromptDurationSec || 7}
                    />
                  </div>
                )}

                {/* Wingman Endorsement Quote */}
                {inspectedProfile.wingmanEndorsement && (
                  <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                      🛡️ Wingman Endorsement
                    </span>
                    <p className="text-stone-200 italic">"{inspectedProfile.wingmanEndorsement}"</p>
                  </div>
                )}

                {/* Bio */}
                <div>
                  <h5 className="font-semibold text-stone-300 mb-1">About Me</h5>
                  <p className="text-stone-300 leading-relaxed">{inspectedProfile.bio}</p>
                </div>

                {/* Interests */}
                <div>
                  <h5 className="font-semibold text-stone-300 mb-1.5">Passions & Interests</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectedProfile.interests?.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-200 border border-stone-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prompts */}
                {inspectedProfile.prompts && inspectedProfile.prompts.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-stone-300">Prompts & Thoughts</h5>
                    {inspectedProfile.prompts.map((pr, idx) => (
                      <div key={idx} className="p-3 bg-stone-800/60 border border-stone-700/80 rounded-xl">
                        <div className="text-[11px] font-semibold text-rose-400 mb-0.5">{pr.question}</div>
                        <div className="text-stone-200 italic">{pr.answer}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="p-4 border-t border-stone-800 bg-stone-950 space-y-2">
                <button
                  onClick={() => {
                    const target = inspectedProfile;
                    setInspectedProfile(null);
                    setDuelPartner(target);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-white/10 rounded-xl text-xs font-bold text-amber-300 hover:text-white flex items-center justify-center gap-2 transition-all"
                >
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span>Play Compatibility Mini-Duel (5 Dilemmas)</span>
                </button>

                {/* 🎥 Video Screening Call Button */}
                <button
                  onClick={() => {
                    const target = inspectedProfile;
                    setInspectedProfile(null);
                    handleStartVideoScreening(target);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Video Screening Call (Q&A + Match/Leave) 🎥</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const target = inspectedProfile;
                      setInspectedProfile(null);
                      setWavingToProfile(target);
                      setWaveType('wave');
                    }}
                    className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>👋 Send Wave</span>
                  </button>
                  <button
                    onClick={() => {
                      const target = inspectedProfile;
                      setInspectedProfile(null);
                      handleCreateInstantSpaceWith(target);
                    }}
                    className="flex-1 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>Invite to 1-on-1 Space</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ⚡ 3-MINUTE BLIND SPARK SPEED ROUND MODAL */}
        {isSpeedRoundOpen && (
          <SpeedRoundModal
            isOpen={isSpeedRoundOpen}
            onClose={() => setIsSpeedRoundOpen(false)}
            socket={socket}
            currentProfile={myProfile}
            onStartOneOnOneSpace={(roomId, passkey, partner) => {
              setIsSpeedRoundOpen(false);
              onStartOneOnOneSpace(roomId, passkey, partner);
            }}
          />
        )}

        {/* ⚔️ COMPATIBILITY MINI-DUEL MODAL */}
        {duelPartner && (
          <CompatibilityDuelModal
            isOpen={!!duelPartner}
            onClose={() => setDuelPartner(null)}
            partnerProfile={duelPartner}
            currentProfile={myProfile}
            onSendWaveWithDuel={(score, answersCount) => {
              handleSendWaveWithDuel(duelPartner, score, answersCount);
            }}
            onInviteToSpace={(partner) => {
              setDuelPartner(null);
              handleCreateInstantSpaceWith(partner);
            }}
          />
        )}

        {/* 🎥 INCOMING VIDEO SCREENING CALL RINGING BANNER */}
        {incomingScreeningInvite && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md bg-stone-900/95 backdrop-blur-xl border-2 border-rose-500 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-bounce">
            <div className="flex items-center gap-3">
              <img
                src={incomingScreeningInvite.fromUser.avatar}
                alt={incomingScreeningInvite.fromUser.name}
                className="w-12 h-12 rounded-xl object-cover border border-rose-400"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                  <Video className="w-3.5 h-3.5 animate-pulse" />
                  <span>INCOMING VIDEO SCREENING CALL</span>
                </div>
                <h4 className="text-sm font-bold text-white truncate">
                  {incomingScreeningInvite.fromUser.name} ({incomingScreeningInvite.fromUser.age})
                </h4>
                <p className="text-[11px] text-stone-300">
                  Wants to do a 3-minute video screening call with icebreaker questions!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDeclineIncomingScreening(incomingScreeningInvite)}
                className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
              >
                Decline
              </button>
              <button
                onClick={() => handleAcceptIncomingScreening(incomingScreeningInvite)}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5"
              >
                <Video className="w-4 h-4" />
                <span>Accept Call 🎥</span>
              </button>
            </div>
          </div>
        )}

        {/* 🎥 VIDEO SCREENING DATE MODAL */}
        {isVideoScreeningOpen && videoScreeningPartner && (
          <VideoScreeningModal
            isOpen={isVideoScreeningOpen}
            onClose={() => {
              setIsVideoScreeningOpen(false);
              setVideoScreeningPartner(null);
              setVideoScreeningSession(null);
            }}
            socket={socket}
            currentProfile={myProfile}
            partnerProfile={videoScreeningPartner}
            initialSession={videoScreeningSession}
            onStartOneOnOneSpace={(roomId, passkey, partner) => {
              setIsVideoScreeningOpen(false);
              onStartOneOnOneSpace(roomId, passkey, partner);
            }}
          />
        )}

        {/* 👤 LIVE CAMERA FACE LIVENESS CHECK MODAL */}
        {isLivenessModalOpen && (
          <LivenessCheckModal
            isOpen={isLivenessModalOpen}
            onClose={() => setIsLivenessModalOpen(false)}
            profile={myProfile}
            userName={myProfile.name}
            avatarUrl={myProfile.avatar}
            isMandatory={true}
            onSuccess={handleBiometricSuccess}
          />
        )}

        {/* 🛡️ RESCUE CALL & DATE SAFETY MODAL */}
        {isRescueCallModalOpen && (
          <RescueCallModal
            isOpen={isRescueCallModalOpen}
            onClose={() => setIsRescueCallModalOpen(false)}
            partnerName={videoScreeningPartner?.name || virtualDateTarget?.name || 'Your Date'}
          />
        )}

        {/* 📅 VIRTUAL FIRST-DATE SCHEDULER & CALENDAR SYNC MODAL */}
        {isVirtualDateModalOpen && (
          <VirtualDateModal
            isOpen={isVirtualDateModalOpen}
            onClose={() => {
              setIsVirtualDateModalOpen(false);
              setVirtualDateTarget(null);
            }}
            currentProfile={myProfile}
            targetProfile={virtualDateTarget}
            scheduledDates={scheduledDates}
            onSendInvite={handleSendDateInvite}
            onAcceptInvite={handleAcceptDateInvite}
            onDeclineInvite={handleDeclineDateInvite}
            onLaunchRoom={handleLaunchDateRoom}
          />
        )}

        {/* 🛡️ WINGMAN FRIEND VOICE VOUCH MODAL */}
        {isWingmanModalOpen && (
          <WingmanVouchModal
            isOpen={isWingmanModalOpen}
            onClose={() => setIsWingmanModalOpen(false)}
            profileName={myProfile.name}
            existingVouch={myProfile.wingmanVouch}
            onSaveVouch={handleWingmanVouchSave}
          />
        )}

        {/* 🕊️ GHOST-FREE DATING & GENTLE CLOSURE MODAL */}
        {isGentleClosureModalOpen && (
          <GentleClosureModal
            isOpen={isGentleClosureModalOpen}
            onClose={() => {
              setIsGentleClosureModalOpen(false);
              setGentleClosureTarget(null);
            }}
            currentProfile={myProfile}
            targetProfile={gentleClosureTarget}
            activeConversations={activeConversations}
            onSendClosure={handleSendClosure}
            onPledgeZeroGhost={handlePledgeZeroGhost}
            onReviveConversation={handleReviveConversation}
            onScheduleDate={(target) => {
              setIsGentleClosureModalOpen(false);
              setVirtualDateTarget(target);
              setIsVirtualDateModalOpen(true);
            }}
          />
        )}

        {/* 📍 IRL SAFE DATE PLANNER & VENUE DIRECTORY MODAL */}
        {isSafeDateModalOpen && (
          <SafeDatePlannerModal
            isOpen={isSafeDateModalOpen}
            onClose={() => {
              setIsSafeDateModalOpen(false);
              setSafeDateTarget(null);
            }}
            currentProfile={myProfile}
            targetProfile={safeDateTarget}
            existingPlans={safeDatePlans}
            onSendDateProposal={handleSendSafeDateProposal}
            onUpdatePlanStatus={handleUpdateSafeDateStatus}
          />
        )}

      </div>
    </div>
  );
};
