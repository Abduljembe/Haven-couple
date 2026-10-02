import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { triggerHaptic } from './utils/haptics';
import {
  CallStatus,
  CallType,
  CoupleSpaceConfig,
  DecryptedMessage,
  EncryptedMessage,
  LoveBurstEvent,
  UserProfile,
  CanvasStroke,
  CanvasCursor,
  MediaSyncState,
  TimeCapsuleLetter,
  DailySparkState,
  DailySparkAnswer,
  TouchPoint,
  BucketListItem,
  SleepSanctuaryState,
  GameType,
  PolaroidPhoto,
  HorizonLocation,
  LoveCoupon,
  InMovieComment,
  SyncMusicState,
  ActiveSquadCallState,
  SingleProfile,
  VoicemailGreeting,
  CallLogDetails,
  FriendStatus,
  StatusComment,
} from './types';
import {
  deriveKeyFromPasskey,
  encryptText,
  decryptText,
  encryptBinary,
  decryptBinary,
  generateSecurityFingerprint,
} from './utils/crypto';
import {
  startRingtone,
  stopRingtone,
  playCallConnected,
  playCallEnded,
  playHeartbeatSound,
  playMessageChime,
  playSoundboardById,
  unlockAudioContext,
} from './utils/sounds';
import { WebRTCManager, fetchFreshIceServers } from './utils/webrtc';
import { MediaRelayBridge } from './utils/mediaRelayBridge';
import { SquadCallManager } from './utils/squadCallManager';
import { Music, Play, Pause, Heart, X } from 'lucide-react';
import { SetupSpaceModal } from './components/SetupSpaceModal';
import { SpaceChooserModal } from './components/SpaceChooserModal';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { InviteSpouseModal } from './components/InviteSpouseModal';
import { TopBar } from './components/TopBar';
import { ChatArea } from './components/ChatArea';
import { AudioCallModal } from './components/AudioCallModal';
import { VideoCallModal } from './components/VideoCallModal';
import { CallDiagnosticsModal } from './components/CallDiagnosticsModal';
import { SquadCallModal } from './components/SquadCallModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { SecurityVerifyModal } from './components/SecurityVerifyModal';
import { SettingsModal } from './components/SettingsModal';
import { LoveBurstOverlay } from './components/LoveBurstOverlay';
import { LiveCanvasModal } from './components/LiveCanvasModal';
import { WatchTogetherModal } from './components/WatchTogetherModal';
import { TimeCapsuleModal } from './components/TimeCapsuleModal';
import { DailySparkModal } from './components/DailySparkModal';
import { TouchPulseModal } from './components/TouchPulseModal';
import { BucketListModal } from './components/BucketListModal';
import { SleepSanctuaryModal } from './components/SleepSanctuaryModal';
import { CoupleGamesModal } from './components/CoupleGamesModal';
import { ChessModal } from './components/ChessModal';
import { PolaroidVaultModal } from './components/PolaroidVaultModal';
import { LongDistanceHorizonModal } from './components/LongDistanceHorizonModal';
import { CareTrackerModal } from './components/CareTrackerModal';
import { ThemePickerModal } from './components/ThemePickerModal';
import { WallpaperPickerModal } from './components/WallpaperPickerModal';
import { VibeSelectorModal } from './components/VibeSelectorModal';
import { MusicLoungeModal } from './components/MusicLoungeModal';
import { SoundboardModal } from './components/SoundboardModal';
import { SpaceFeaturesModal } from './components/SpaceFeaturesModal';
import { SinglesLoungeModal } from './components/SinglesLoungeModal';
import { HavenStatusModal } from './components/HavenStatusModal';
import { HavenBottomNav } from './components/HavenBottomNav';
import { ActivityLogModal } from './components/ActivityLogModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SpacesManagerModal } from './components/SpacesManagerModal';
import { QRCodePairingModal } from './components/QRCodePairingModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { VoicemailModal } from './components/VoicemailModal';
import {
  sendBrowserNotification,
  sendIncomingCallPushNotification,
  sendMessagePushNotification,
  sendVoicemailPushNotification,
} from './utils/notifications';
import {
  recordSpaceVisit,
  spaceRecordToConfig,
  getSavedSpaces,
  updateSpaceLastMessage,
  saveMessagesForSpace,
  getMessagesForSpace,
} from './utils/spaceRegistry';
import { SavedSpaceRecord, AuthUser, SpaceEmailInvite, SpaceType } from './types';
import { MUSIC_CATALOG, musicEngine } from './utils/musicEngine';
import { getSavedTheme, saveTheme, THEME_PRESETS, ThemeConfig, ThemeId, ColorMode, getSavedColorMode, saveColorMode } from './utils/theme';
import { WallpaperSettings, getSavedWallpaperSettings, saveWallpaperSettings } from './utils/wallpaper';
import { detectRealDeviceLocation } from './utils/geolocation';
import { getStoredAuthUser, getMe, logoutUser, acceptSpaceInvite, getInvitesForEmail, trackUserProfile } from './utils/authService';
import { DEFAULT_AVATARS } from './utils/avatarUtils';

export default function App() {
  // Space & Authentication Config
  const [config, setConfig] = useState<CoupleSpaceConfig | null>(() => {
    try {
      const saved = localStorage.getItem('haven_couple_config');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentUserId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('haven_user_id');
      if (savedId) return savedId;
      const newId = `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      localStorage.setItem('haven_user_id', newId);
      return newId;
    } catch {
      return `user-${Date.now()}`;
    }
  });

  const [userMood, setUserMood] = useState('Connected with you 💕');

  // Living Atmosphere & Theme state
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(() => getSavedTheme());
  const [colorMode, setColorMode] = useState<ColorMode>(() => getSavedColorMode());
  const [isSpaceFeaturesOpen, setIsSpaceFeaturesOpen] = useState(false);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [showThemePickerModal, setShowThemePickerModal] = useState(false);
  const [showVibeSelectorModal, setShowVibeSelectorModal] = useState(false);
  const [isScreenRumbling, setIsScreenRumbling] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);

  const handleToggleChatFullscreen = useCallback(async () => {
    setIsChatFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  // Sync fullscreen change events & keyboard shortcuts (F to toggle, Esc to exit)
  useEffect(() => {
    const handleFSChange = () => {
      const isFS = Boolean(document.fullscreenElement);
      setIsChatFullscreen(isFS);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;
      if (e.key === 'Escape' && isChatFullscreen) {
        handleToggleChatFullscreen();
      } else if ((e.key === 'f' || e.key === 'F') && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        handleToggleChatFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChatFullscreen, handleToggleChatFullscreen]);

  // User Authentication & Spouse Invites State
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [pendingInvites, setPendingInvites] = useState<SpaceEmailInvite[]>([]);
  const [liveIncomingInviteToast, setLiveIncomingInviteToast] = useState<SpaceEmailInvite | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'reset'>('login');
  const [authModalReason, setAuthModalReason] = useState<string | undefined>(undefined);
  const [isInviteSpouseOpen, setIsInviteSpouseOpen] = useState(false);
  const [showLanding, setShowLanding] = useState<boolean>(() => !localStorage.getItem('haven_couple_config'));
  const [showSpaceChooser, setShowSpaceChooser] = useState(false);
  const [isSetupSpaceOpen, setIsSetupSpaceOpen] = useState(false);
  const [setupInitialMode, setSetupInitialMode] = useState<'create' | 'join'>('create');
  const [setupInitialType, setSetupInitialType] = useState<SpaceType>('couple');

  // Keep authUserRef in sync for real-time socket events and periodic sync
  const authUserRef = useRef<AuthUser | null>(authUser);
  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  // Load auth state and check for spouse invites on mount
  useEffect(() => {
    getMe().then((res) => {
      if (res) {
        setAuthUser(res.user);
        setPendingInvites(res.pendingInvites || []);
      }
    });

    try {
      const params = new URLSearchParams(window.location.search);
      const invitedEmail = params.get('invitedEmail');
      if (invitedEmail) {
        getInvitesForEmail(invitedEmail).then((invs) => {
          if (invs && invs.length > 0) {
            setPendingInvites(invs);
          }
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Robust recurring synchronization for pending space invitations
  // Ensures any invite sent to this user or registered partner immediately appears in their chat
  useEffect(() => {
    let isMounted = true;
    const syncInvites = async () => {
      const activeUser = authUserRef.current || getStoredAuthUser();
      const email = activeUser?.email?.trim().toLowerCase();
      const userId = activeUser?.id;
      if (!email && !userId) return;

      try {
        const invs = await getInvitesForEmail(email, userId);
        if (isMounted && Array.isArray(invs)) {
          const pending = invs.filter((i) => i.status === 'pending');
          setPendingInvites((prev) => {
            // Check if there is an actual change to prevent unnecessary re-renders
            const prevIds = prev.map((p) => p.id).sort().join(',');
            const nextIds = pending.map((p) => p.id).sort().join(',');
            if (prevIds !== nextIds) {
              // If a new pending invite was found, show the live incoming invite toast banner
              const newIncoming = pending.find((p) => !prev.some((old) => old.id === p.id));
              if (newIncoming) {
                setLiveIncomingInviteToast(newIncoming);
              }
              return pending;
            }
            return prev;
          });
        }
      } catch {
        // ignore
      }
    };

    // Run immediately and periodically
    syncInvites();
    const interval = setInterval(syncInvites, 3500);
    window.addEventListener('focus', syncInvites);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', syncInvites);
    };
  }, []);

  const handleSelectDestination = (destination: 'spouse' | 'friends' | 'single') => {
    setShowSpaceChooser(false);
    if (destination === 'spouse') {
      const coupleRoomId = `haven-couple-${authUser?.id?.slice(-6) || Math.floor(Math.random() * 8999 + 1000)}`;
      const couplePasskey = 'sanctuary-love';
      const newConfig: CoupleSpaceConfig = {
        roomId: coupleRoomId,
        passkey: couplePasskey,
        spaceType: 'couple',
        userRole: 'partner1',
        userName: authUser?.name || 'Spouse',
        userAvatar: authUser?.avatar || DEFAULT_AVATARS[0],
        partnerName: 'My Spouse',
        partnerAvatar: DEFAULT_AVATARS[1],
        isVerified: false,
      };
      recordSpaceVisit(newConfig);
      setConfig(newConfig);
      setShowLanding(false);
    } else if (destination === 'friends') {
      setSetupInitialMode('create');
      setSetupInitialType('friends');
      setIsSetupSpaceOpen(true);
    } else if (destination === 'single') {
      setIsSinglesLoungeOpen(true);
    }
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setAuthUser(user);
    try {
      localStorage.setItem('haven_user_id', user.id);
    } catch {
      // ignore
    }
    trackUserProfile({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      email: user.email,
      spaceId: config?.roomId,
    });
    getMe().then((res) => {
      if (res) {
        setPendingInvites(res.pendingInvites || []);
      }
    });
    // Automatically open destination chooser (Spouse, Friends, Single)
    setShowSpaceChooser(true);
  };

  // Automatically track and sync active user profile in persistent users_storage.json
  useEffect(() => {
    const activeUserId = authUser?.id || currentUserId;
    const activeName = authUser?.name || config?.userName;
    const activeAvatar = authUser?.avatar || config?.userAvatar;
    const activeEmail = authUser?.email;
    const activeSpaceId = config?.roomId;

    if (activeUserId && activeName) {
      trackUserProfile({
        id: activeUserId,
        name: activeName,
        avatar: activeAvatar,
        email: activeEmail,
        spaceId: activeSpaceId,
      });
    }
  }, [authUser?.id, authUser?.name, authUser?.email, currentUserId, config?.userName, config?.userAvatar, config?.roomId]);

  const handleLogout = async () => {
    await logoutUser();
    setAuthUser(null);
    setPendingInvites([]);
  };

  const handleAcceptInvite = async (invite: SpaceEmailInvite) => {
    try {
      // Save current messages first if in an active room
      if (config?.roomId && messages.length > 0) {
        saveMessagesForSpace(config.roomId, messages);
      }

      await acceptSpaceInvite(invite.id, authUser?.email);
      const newConfig: CoupleSpaceConfig = {
        roomId: invite.roomId,
        passkey: invite.passkey,
        spaceType: invite.spaceType,
        userRole: 'partner2',
        userName: authUser?.name || config?.userName || 'Partner',
        userAvatar: authUser?.avatar || config?.userAvatar || DEFAULT_AVATARS[1],
        partnerName: invite.senderName,
        partnerAvatar: DEFAULT_AVATARS[0],
        isVerified: false,
      };
      recordSpaceVisit(newConfig);

      // Load persistent history for this space so messages are always retained
      const cachedMsgs = getMessagesForSpace(invite.roomId);
      setMessages(cachedMsgs);

      setConfig(newConfig);
      setSavedSpaces(getSavedSpaces());
      setShowLanding(false);
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));

      playMessageChime(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Failed to accept invite:', err);
    }
  };

  // Sync dark class on documentElement for styling & Tailwind
  useEffect(() => {
    if (colorMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorMode]);

  const handleToggleColorMode = (mode?: ColorMode) => {
    setColorMode((prev) => {
      const next = mode !== undefined ? mode : (prev === 'dark' ? 'light' : 'dark');
      saveColorMode(next);
      return next;
    });
  };

  // Haven Chat Wallpaper state
  const [wallpaperSettings, setWallpaperSettings] = useState<WallpaperSettings>(() => getSavedWallpaperSettings());
  const [showWallpaperPickerModal, setShowWallpaperPickerModal] = useState(false);

  const handleUpdateWallpaperSettings = (newSettings: Partial<WallpaperSettings>) => {
    setWallpaperSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveWallpaperSettings(updated);
      return updated;
    });
  };

  const currentTheme = THEME_PRESETS[currentThemeId] || THEME_PRESETS.rose;

  // Encryption Key & Security Fingerprint
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [securityFingerprint, setSecurityFingerprint] = useState<{
    numericBlocks: string[];
    emojiSequence: string[];
    rawHash: string;
  }>({
    numericBlocks: ['48291', '94820', '19384', '74920', '84729', '38472'],
    emojiSequence: ['🔒', '💖', '🌿', '✨'],
    rawHash: 'verified',
  });

  // Partner & Squad Presence (Max 5 people in Squad mode)
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [roomMembers, setRoomMembers] = useState<UserProfile[]>([]);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [spaceFullError, setSpaceFullError] = useState<string | null>(null);

  // Friends & Squad Multi-User Calling State (Up to 5 people)
  const [activeSquadCall, setActiveSquadCall] = useState<ActiveSquadCallState | null>(null);
  const [isSquadCallModalOpen, setIsSquadCallModalOpen] = useState(false);
  const [squadRemoteStreams, setSquadRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [squadSpeakingMap, setSquadSpeakingMap] = useState<Record<string, boolean>>({});
  const [squadLocalStream, setSquadLocalStream] = useState<MediaStream | null>(null);
  const [isSquadMuted, setIsSquadMuted] = useState(false);
  const [isSquadVideoOff, setIsSquadVideoOff] = useState(false);
  const [isSquadScreenSharing, setIsSquadScreenSharing] = useState(false);

  // Chat Messages - Initialized from persistent sanctuary cache
  const [messages, setMessages] = useState<DecryptedMessage[]>(() => {
    try {
      const savedConfig = localStorage.getItem('haven_couple_config');
      const rId = savedConfig ? JSON.parse(savedConfig)?.roomId : null;
      const saved = rId ? localStorage.getItem(`haven_messages_${rId}`) : localStorage.getItem('haven_messages_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [autoDeleteTimer, setAutoDeleteTimer] = useState<number>(0);

  // Saved Spaces & Connected Toast States
  const [savedSpaces, setSavedSpaces] = useState<SavedSpaceRecord[]>(() => getSavedSpaces());
  const [partnerAcceptedToast, setPartnerAcceptedToast] = useState<{ name: string; spaceName: string } | null>(null);

  // Calling States
  const [activeCallType, setActiveCallType] = useState<CallType | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [incomingCallData, setIncomingCallData] = useState<{
    callType: CallType;
    callerName: string;
    callerAvatar: string;
    callerSocketId: string;
    isSquadCall?: boolean;
    roomId?: string;
  } | null>(null);

  // Media Calling Streams & Controls
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [partnerIsMuted, setPartnerIsMuted] = useState(false);
  const [partnerIsVideoOff, setPartnerIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioCallMinimized, setIsAudioCallMinimized] = useState(false);
  const [isSquadCallMinimized, setIsSquadCallMinimized] = useState(false);
  const [isNoiseCancellationActive, setIsNoiseCancellationActive] = useState(true);
  const [isEchoSuppressionActive, setIsEchoSuppressionActive] = useState(true);

  // Haven Call History Tracking & Ringing Timeout Context
  const callContextRef = useRef<{
    callType: CallType;
    callerId: string;
    callerName: string;
    startedAt: number;
    connectedAt: number | null;
    status: CallStatus;
    logged: boolean;
    isSquadCall?: boolean;
    groupName?: string;
  } | null>(null);
  const callRingingTimeoutRef = useRef<number | null>(null);
  const squadCallStartTimeRef = useRef<number | null>(null);

  // Live Love Canvas State
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [remoteCanvasStrokes, setRemoteCanvasStrokes] = useState<CanvasStroke[]>([]);
  const [remoteCanvasCursor, setRemoteCanvasCursor] = useState<CanvasCursor | null>(null);
  const [canvasClearedAt, setCanvasClearedAt] = useState<number | undefined>(undefined);

  // Watch Together State
  const [isWatchTogetherOpen, setIsWatchTogetherOpen] = useState(false);
  const [mediaSyncState, setMediaSyncState] = useState<MediaSyncState | null>(null);

  // Time Capsule Sealed Letters State
  const [isTimeCapsuleOpen, setIsTimeCapsuleOpen] = useState(false);
  const [timeCapsuleLetters, setTimeCapsuleLetters] = useState<TimeCapsuleLetter[]>([]);

  // Daily Spark State
  const [isDailySparkOpen, setIsDailySparkOpen] = useState(false);
  const [dailySparkState, setDailySparkState] = useState<DailySparkState | null>(null);

  // Touch Pulse State
  const [isTouchPulseOpen, setIsTouchPulseOpen] = useState(false);
  const [remoteTouchPoint, setRemoteTouchPoint] = useState<TouchPoint | null>(null);

  // Bucket List & Scrapbook State
  const [isBucketListOpen, setIsBucketListOpen] = useState(false);
  const [bucketListItems, setBucketListItems] = useState<BucketListItem[]>([]);

  // 1. Sleep Sanctuary State
  const [isSleepSanctuaryOpen, setIsSleepSanctuaryOpen] = useState(false);
  const [sleepState, setSleepState] = useState<SleepSanctuaryState>({
    isActive: false,
    soundscape: 'rain',
    volume: 0.5,
    isOledDimmed: false,
    partnerAsleep: false,
  });

  // 2. Couple Games Lounge State
  const [isGamesLoungeOpen, setIsGamesLoungeOpen] = useState(false);
  const [gamesLoungeTab, setGamesLoungeTab] = useState<GameType>('connect_hearts');
  const [isChessModalOpen, setIsChessModalOpen] = useState(false);

  // 3. Secret Polaroids Vault State
  const [isPolaroidVaultOpen, setIsPolaroidVaultOpen] = useState(false);
  const [polaroids, setPolaroids] = useState<PolaroidPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('haven_polaroids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 4. Partner Horizon & Weather State
  const [isHorizonOpen, setIsHorizonOpen] = useState(false);
  const [myLocation, setMyLocation] = useState<HorizonLocation>(() => {
    try {
      const saved = localStorage.getItem('haven_my_location');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      city: 'Paris, France',
      timezone: 'Europe/Paris',
      latitude: 48.8566,
      longitude: 2.3522,
      weatherCondition: 'sunny',
      tempC: 22,
      tempF: 72,
      updatedAt: Date.now(),
    };
  });
  const [partnerLocation, setPartnerLocation] = useState<HorizonLocation>(() => {
    try {
      const saved = localStorage.getItem('haven_partner_location');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      city: 'New York, USA',
      timezone: 'America/New_York',
      latitude: 40.7128,
      longitude: -74.006,
      weatherCondition: 'clear_night',
      tempC: 19,
      tempF: 66,
      updatedAt: Date.now(),
    };
  });

  // 5. Care Tracker & Love Coupons State
  const [isCareTrackerOpen, setIsCareTrackerOpen] = useState(false);
  const [streakDays, setStreakDays] = useState<number>(7);
  const [coupons, setCoupons] = useState<LoveCoupon[]>(() => {
    try {
      const saved = localStorage.getItem('haven_love_coupons');
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 'c-1',
              title: '30-Minute Romantic Back Massage',
              description: 'Valid anytime. Includes essential oils and gentle music.',
              emoji: '💆‍♀️',
              category: 'service',
              isRedeemed: false,
              createdBy: 'partner',
            },
            {
              id: 'c-2',
              title: 'Breakfast in Bed & Fresh Coffee',
              description: 'Pancakes, fresh fruit, and your favorite warm latte.',
              emoji: '🥞',
              category: 'treat',
              isRedeemed: false,
              createdBy: 'partner',
            },
            {
              id: 'c-3',
              title: 'Pass Any Argument Without Debate',
              description: 'Instantly win any silly debate with one warm kiss.',
              emoji: '👑',
              category: 'affection',
              isRedeemed: false,
              createdBy: 'partner',
            },
          ];
    } catch {
      return [];
    }
  });

  // Modals & Overlays
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSpacesManagerOpen, setIsSpacesManagerOpen] = useState(false);
  const [isSinglesLoungeOpen, setIsSinglesLoungeOpen] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.location.search.includes('mode=singles');
    } catch {
      return false;
    }
  });
  const [isMusicLoungeOpen, setIsMusicLoungeOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [syncMusicState, setSyncMusicState] = useState<SyncMusicState>({
    trackId: 'track-1',
    isPlaying: false,
    currentTime: 0,
    updatedAt: Date.now(),
    updatedBy: '',
    volume: 0.7,
  });
  const [loveBursts, setLoveBursts] = useState<LoveBurstEvent[]>([]);
  const [incomingInMovieComment, setIncomingInMovieComment] = useState<InMovieComment | null>(null);
  const [incomingGameAction, setIncomingGameAction] = useState<{ gameType: GameType; actionData: any; senderId: string } | null>(null);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isQRPairingOpen, setIsQRPairingOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isVideoCallMinimized, setIsVideoCallMinimized] = useState(false);
  const [voicemails, setVoicemails] = useState<VoicemailGreeting[]>([]);
  const [isVoicemailModalOpen, setIsVoicemailModalOpen] = useState(false);
  const [voicemailModalMode, setVoicemailModalMode] = useState<'record' | 'inbox'>('inbox');
  const [missedVoicemailCallType, setMissedVoicemailCallType] = useState<CallType | undefined>(undefined);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statuses, setStatuses] = useState<FriendStatus[]>([]);
  const [initialViewStatusId, setInitialViewStatusId] = useState<string | null>(null);

  const hasUnreadStatus = useMemo(() => {
    const now = Date.now();
    return statuses.some(
      (s) => s.userId !== currentUserId && s.expiresAt > now && !s.viewers?.includes(currentUserId)
    );
  }, [statuses, currentUserId]);

  const [offlineQueue, setOfflineQueue] = useState<EncryptedMessage[]>(() => {
    try {
      const saved = localStorage.getItem('haven_offline_msg_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 1-Click Magic Link Auto-Join Handler
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const magicRoom = params.get('room');
      const magicKey = params.get('key');
      const magicType = (params.get('type') as SpaceType) || 'couple';
      const magicName = params.get('name') || '';

      if (magicRoom && magicKey) {
        if (!config || config.roomId !== magicRoom || config.passkey !== magicKey) {
          const storedUser = getStoredAuthUser();
          const autoConfig: CoupleSpaceConfig = {
            roomId: magicRoom,
            passkey: magicKey,
            userRole: 'partner2',
            userName: config?.userName || (storedUser as any)?.name || (storedUser as any)?.displayName || 'My Love',
            partnerName: config?.partnerName || 'Partner',
            userAvatar: config?.userAvatar || DEFAULT_AVATARS[0],
            partnerAvatar: config?.partnerAvatar || DEFAULT_AVATARS[1],
            spaceType: magicType,
            groupName: magicName || (magicType === 'friends' ? 'Our Squad' : 'Our Sanctuary'),
            isVerified: true,
          };
          localStorage.setItem('haven_couple_config', JSON.stringify(autoConfig));
          setConfig(autoConfig);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    } catch (err) {
      console.warn('Failed to parse magic link:', err);
    }
  }, [config]);

  // Flush offline queue when socket connects and browser is online
  useEffect(() => {
    const flushQueue = () => {
      if (socketRef.current?.connected && offlineQueue.length > 0) {
        offlineQueue.forEach((msg) => {
          socketRef.current?.emit('encrypted-message', msg);
        });
        setOfflineQueue([]);
        try {
          localStorage.removeItem('haven_offline_msg_queue');
        } catch {}
      }
    };

    window.addEventListener('online', flushQueue);
    if (socketRef.current?.connected && offlineQueue.length > 0) {
      flushQueue();
    }
    return () => window.removeEventListener('online', flushQueue);
  }, [offlineQueue]);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const mediaRelayBridgeRef = useRef<MediaRelayBridge | null>(null);
  const relayEngageTimeoutRef = useRef<number | null>(null);
  const [isCloudRelayActive, setIsCloudRelayActive] = useState(false);
  const currentCallTargetSocketIdRef = useRef<string | null>(null);
  const pendingSignalsRef = useRef<{ senderSocketId: string; signal: any }[]>([]);
  const squadCallRef = useRef<SquadCallManager | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  cryptoKeyRef.current = cryptoKey;
  const lastActiveTimeRef = useRef<number>(Date.now());

  // Initialize Cryptographic Key when config changes
  useEffect(() => {
    if (!config) return;

    // Automatically record this space in the registry so user can switch back anytime
    try {
      recordSpaceVisit(config);
    } catch (e) {
      console.warn('Failed to record space in registry:', e);
    }

    let isMounted = true;
    (async () => {
      try {
        const key = await deriveKeyFromPasskey(config.passkey, config.roomId);
        if (!isMounted) return;
        setCryptoKey(key);

        const fp = await generateSecurityFingerprint(key, config.roomId);
        if (!isMounted) return;
        setSecurityFingerprint(fp);
      } catch (err) {
        console.error('Key derivation failed:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [config]);

  // Helper to Decrypt a single message
  const decryptPayload = useCallback(async (msg: EncryptedMessage, key: CryptoKey): Promise<DecryptedMessage> => {
    try {
      if (msg.isDeleted) {
        return {
          id: msg.id,
          roomId: msg.roomId,
          senderId: msg.senderId,
          senderName: msg.senderName,
          type: msg.type,
          content: '',
          timestamp: msg.timestamp,
          expiresAt: msg.expiresAt,
          isDecrypted: true,
          isDeleted: true,
          deletedForEveryone: msg.deletedForEveryone,
          isEdited: msg.isEdited,
          editedAt: msg.editedAt,
        };
      }

      let content = '';
      let callLog = msg.callLog;
      if (msg.type === 'text' || msg.type === 'call_log') {
        content = await decryptText(msg.ciphertext, msg.iv, key);
        if (!callLog && msg.type === 'call_log' && content) {
          try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object') {
              callLog = {
                callType: parsed.callType || (content.includes('video') ? 'video' : 'audio'),
                status: parsed.status || (content.toLowerCase().includes('missed') ? 'missed' : 'completed'),
                duration: parsed.duration || 0,
                callerId: parsed.callerId || msg.senderId,
                callerName: parsed.callerName || msg.senderName,
                isSquadCall: parsed.isSquadCall || false,
                groupName: parsed.groupName,
              };
            }
          } catch {}
        }
      } else if (msg.type === 'image' || msg.type === 'video' || msg.type === 'audio') {
        const decryptedBuf = await decryptBinary(msg.ciphertext, msg.iv, key);
        const mimeType = msg.fileMetadata?.mimeType || (msg.type === 'image' ? 'image/png' : msg.type === 'video' ? 'video/mp4' : 'audio/webm');
        const blob = new Blob([decryptedBuf], { type: mimeType });
        content = URL.createObjectURL(blob);
      }

      return {
        id: msg.id,
        roomId: msg.roomId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        type: msg.type,
        content,
        timestamp: msg.timestamp,
        expiresAt: msg.expiresAt,
        reactions: msg.reactions,
        fileMetadata: msg.fileMetadata,
        callLog,
        replyTo: msg.replyTo,
        isDecrypted: true,
        isDeleted: msg.isDeleted,
        deletedForEveryone: msg.deletedForEveryone,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
      };
    } catch (err) {
      console.warn('Decryption failed for message ID:', msg.id, err);
      return {
        id: msg.id,
        roomId: msg.roomId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        type: msg.type,
        content: '[Encrypted with different key]',
        timestamp: msg.timestamp,
        expiresAt: msg.expiresAt,
        reactions: msg.reactions,
        fileMetadata: msg.fileMetadata,
        replyTo: msg.replyTo,
        isDecrypted: false,
        decryptionError: true,
        isDeleted: msg.isDeleted,
        deletedForEveryone: msg.deletedForEveryone,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
      };
    }
  }, []);

  // Log Haven-style Call History to End-to-End Encrypted Chat
  const logCallHistory = useCallback(async (params: {
    callType: CallType;
    status: 'missed' | 'completed' | 'declined' | 'unanswered';
    duration?: number;
    callerId: string;
    callerName: string;
    isSquadCall?: boolean;
    groupName?: string;
  }) => {
    if (!config || !cryptoKey) return;

    try {
      const callLogData: CallLogDetails = {
        callType: params.callType,
        status: params.status,
        duration: params.duration || 0,
        callerId: params.callerId,
        callerName: params.callerName,
        isSquadCall: params.isSquadCall,
        groupName: params.groupName,
      };

      const serialized = JSON.stringify(callLogData);
      const enc = await encryptText(serialized, cryptoKey);
      const msgId = `call-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Date.now();

      const encryptedPayload: EncryptedMessage = {
        id: msgId,
        roomId: config.roomId,
        senderId: currentUserId,
        senderName: config.userName,
        type: 'call_log',
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        timestamp,
        callLog: callLogData,
      };

      const localDecrypted: DecryptedMessage = {
        id: msgId,
        roomId: config.roomId,
        senderId: currentUserId,
        senderName: config.userName,
        type: 'call_log',
        content: serialized,
        timestamp,
        callLog: callLogData,
        isDecrypted: true,
      };

      setMessages((prev) => [...prev, localDecrypted]);

      if (socketRef.current?.connected) {
        socketRef.current.emit('encrypted-message', encryptedPayload);
      }
    } catch (err) {
      console.error('Failed to log call history:', err);
    }
  }, [config, cryptoKey, currentUserId]);

  // Built-in Cloud Media Relay Initializer (Permanent cross-network fallback)
  const initMediaRelayBridge = useCallback((callType: CallType, stream: MediaStream | null) => {
    if (mediaRelayBridgeRef.current) {
      mediaRelayBridgeRef.current.stop();
    }
    if (!socketRef.current || !config) return null;

    const bridge = new MediaRelayBridge({
      socket: socketRef.current,
      roomId: config.roomId,
      callType: callType === 'audio' ? 'audio' : 'video',
      localStream: stream,
      onRemoteRelayStream: (remoteRelayStream) => {
        console.log('[MediaRelayBridge] Remote relay stream active');
        setRemoteStream(remoteRelayStream);
        setCallStatus('connected');
        stopRingtone();
        playCallConnected();
        if (callRingingTimeoutRef.current) {
          clearTimeout(callRingingTimeoutRef.current);
          callRingingTimeoutRef.current = null;
        }
        if (callContextRef.current) {
          callContextRef.current.status = 'connected';
          if (!callContextRef.current.connectedAt) {
            callContextRef.current.connectedAt = Date.now();
          }
        }
      },
      onRelayStatusChange: (active) => {
        setIsCloudRelayActive(active);
      },
    });

    mediaRelayBridgeRef.current = bridge;
    return bridge;
  }, [config]);

  // WebRTC Manager Setup
  const initWebRTC = useCallback((callType: CallType) => {
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }

    const rtc = new WebRTCManager({
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onSignalData: (signal) => {
        if (socketRef.current && config) {
          socketRef.current.emit('signal', {
            roomId: config.roomId,
            targetSocketId: currentCallTargetSocketIdRef.current || undefined,
            signal,
          });
        }
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          if (relayEngageTimeoutRef.current) {
            clearTimeout(relayEngageTimeoutRef.current);
            relayEngageTimeoutRef.current = null;
          }
          setCallStatus('connected');
          stopRingtone();
          playCallConnected();
          if (callRingingTimeoutRef.current) {
            clearTimeout(callRingingTimeoutRef.current);
            callRingingTimeoutRef.current = null;
          }
          if (callContextRef.current) {
            callContextRef.current.status = 'connected';
            if (!callContextRef.current.connectedAt) {
              callContextRef.current.connectedAt = Date.now();
            }
          }
        } else if (state === 'disconnected' || state === 'failed') {
          console.warn('WebRTC state:', state, '— activating Built-in Cloud Media Relay...');
          if (mediaRelayBridgeRef.current && !mediaRelayBridgeRef.current.getIsActive()) {
            mediaRelayBridgeRef.current.start().catch(() => {});
          }
        }
      },
      onReconnecting: () => {
        console.log('Reconnecting cross-border WebRTC stream...');
      },
    });

    rtc.setNoiseCancellation(isNoiseCancellationActive).catch(() => {});
    rtc.setEchoSuppression(isEchoSuppressionActive).catch(() => {});
    webrtcRef.current = rtc;
    return rtc;
  }, [config, isNoiseCancellationActive, isEchoSuppressionActive]);

  // Drain any queued early signals once peer connection and local media are ready
  const drainPendingSignals = useCallback(async (rtc: WebRTCManager) => {
    if (!rtc || !rtc.getIsReady()) return;
    if (pendingSignalsRef.current.length === 0) return;

    const queued = [...pendingSignalsRef.current];
    pendingSignalsRef.current = [];
    console.log(`[WebRTC] Processing ${queued.length} queued early signals`);

    for (const item of queued) {
      try {
        if (item.signal.type === 'offer') {
          console.log('[WebRTC] Processing queued offer from:', item.senderSocketId);
          const answer = await rtc.handleOffer(item.signal as RTCSessionDescriptionInit);
          if (socketRef.current && config) {
            socketRef.current.emit('signal', {
              roomId: config.roomId,
              targetSocketId: item.senderSocketId,
              signal: answer,
            });
          }
        } else if (item.signal.type === 'answer') {
          console.log('[WebRTC] Processing queued answer from:', item.senderSocketId);
          await rtc.handleAnswer(item.signal as RTCSessionDescriptionInit);
        } else {
          await rtc.handleCandidate(item.signal);
        }
      } catch (err) {
        console.warn('[WebRTC] Error processing queued signal:', err);
      }
    }
  }, [config]);

  // Squad Call Manager Initializer (Up to 5 friends mesh WebRTC)
  const initSquadCallManager = useCallback(() => {
    if (squadCallRef.current) {
      squadCallRef.current.leaveCall();
    }

    const mgr = new SquadCallManager({
      onStreamsUpdated: (streams) => {
        setSquadRemoteStreams(new Map(streams));
      },
      onSignalData: (targetSocketId, signal) => {
        if (socketRef.current && config) {
          socketRef.current.emit('squad-signal', {
            roomId: config.roomId,
            targetSocketId,
            signal,
          });
        }
      },
      onSpeakingChange: (speakingMap) => {
        setSquadSpeakingMap({ ...speakingMap });
      },
      onError: (err) => {
        console.error('SquadCallManager error:', err);
      },
    });

    mgr.setNoiseCancellation(isNoiseCancellationActive).catch(() => {});
    mgr.setEchoSuppression(isEchoSuppressionActive).catch(() => {});
    squadCallRef.current = mgr;
    return mgr;
  }, [config, isNoiseCancellationActive, isEchoSuppressionActive]);

  // Preload high-availability STUN & TURN ICE relays for cross-network WebRTC connectivity
  useEffect(() => {
    fetchFreshIceServers(config?.roomId).catch(() => {});
  }, [config?.roomId]);

  // Socket Connection & Real-Time Events
  useEffect(() => {
    if (!config || !cryptoKey) return;

    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-space', {
        roomId: config.roomId,
        passkey: config.passkey,
        user: {
          id: currentUserId,
          name: config.userName,
          avatar: config.userAvatar,
          statusMood: userMood,
          email: (authUserRef.current?.email || getStoredAuthUser()?.email || '').toLowerCase().trim(),
        },
        location: myLocation,
      });
    });

    // Listen for room TURN relay configuration updates
    socket.on('turn-config-updated', () => {
      console.log('[WebRTC] Sanctuary TURN relay updated, refreshing ICE server routes...');
      fetchFreshIceServers(config.roomId, true).catch(() => {});
    });

    // Space access denied when password doesn't match registered space
    socket.on('space-access-denied', (data: { reason?: string; error?: string; roomId: string }) => {
      console.warn('Access denied to space:', data);
      const errorMsg =
        data.reason ||
        data.error ||
        'Incorrect password. The password does not match the registered space. Access is blocked.';
      setSpaceFullError(errorMsg);
      socket.disconnect();
      setConfig(null);
      localStorage.removeItem('haven_couple_config');
      setAuthModalReason(errorMsg);
      setShowLanding(true);
      setIsSetupSpaceOpen(true);
    });

    // Receive live spouse invitations
    socket.on('spouse-invite-notification', (data: { spouseEmail: string; spouseId?: string; spouseName?: string; invite: SpaceEmailInvite }) => {
      const activeUser = authUserRef.current || getStoredAuthUser();
      const myEmail = (activeUser?.email || '').toLowerCase().trim();
      const targetEmail = (data.spouseEmail || '').toLowerCase().trim();
      const isTarget =
        (myEmail && targetEmail && myEmail === targetEmail) ||
        (activeUser?.id && data.spouseId && activeUser.id === data.spouseId) ||
        (activeUser?.name && data.spouseName && activeUser.name.toLowerCase().trim() === data.spouseName.toLowerCase().trim()) ||
        (!myEmail && data.invite?.roomId !== config?.roomId);

      if (isTarget && data.invite) {
        setPendingInvites((prev) => {
          if (prev.some((inv) => inv.id === data.invite.id)) return prev;
          return [data.invite, ...prev];
        });
        setLiveIncomingInviteToast(data.invite);
        playMessageChime(true);
        sendBrowserNotification(`Sanctuary Invitation from ${data.invite.senderName || 'Your Partner'}`, {
          body: `You are invited to step into "${data.invite.spaceName}"! Tap to connect 💕`,
        });
      }
    });

    // Real-time notification when our sent invitation is accepted
    socket.on('spouse-invite-accepted', (data: {
      inviteId: string;
      roomId: string;
      spouseEmail: string;
      senderName: string;
      spaceName: string;
      acceptedBy: string;
    }) => {
      if (config?.roomId && data.roomId.toLowerCase() === config.roomId.toLowerCase()) {
        setPartnerAcceptedToast({
          name: data.acceptedBy || 'Your partner',
          spaceName: data.spaceName || 'Sanctuary',
        });
        playMessageChime(true);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
        setTimeout(() => setPartnerAcceptedToast(null), 7000);
      }
    });

    // Space Joined & Initial History Sync
    socket.on('space-joined', async (data: {
      roomId: string;
      users: UserProfile[];
      messages: EncryptedMessage[];
      anniversaryDate?: string;
      locations?: Record<string, HorizonLocation>;
      activeCall?: ActiveSquadCallState | null;
      musicState?: SyncMusicState | null;
      mediaState?: MediaSyncState | null;
      voicemails?: VoicemailGreeting[];
      statuses?: FriendStatus[];
    }) => {
      if (data.users) {
        setRoomMembers(data.users);
      }
      if (data.voicemails) {
        setVoicemails(data.voicemails);
      }
      if (data.statuses) {
        setStatuses(data.statuses);
      }
      if (data.activeCall) {
        setActiveSquadCall(data.activeCall);
      }
      setSpaceFullError(null);

      const otherUser = data.users.find((u) => u.id !== currentUserId);
      if (otherUser) {
        setPartner(otherUser);
        setIsPartnerOnline(true);
      }

      if (data.anniversaryDate && !config.anniversaryDate) {
        setConfig((prev) => prev ? { ...prev, anniversaryDate: data.anniversaryDate } : null);
      }

      // Sync partner locations if saved
      if (data.locations) {
        Object.entries(data.locations).forEach(([uid, loc]: [string, any]) => {
          if (uid !== currentUserId && loc) {
            setPartnerLocation(loc);
            localStorage.setItem('haven_partner_location', JSON.stringify(loc));
          }
        });
      }

      // Also proactively transmit current location if available
      if (myLocation && config) {
        socket.emit('horizon-update-location', {
          roomId: config.roomId,
          location: myLocation,
        });
      }

      // Sync room music state if active
      if (data.musicState) {
        setSyncMusicState(data.musicState);
        if (data.musicState.isPlaying) {
          const track = data.musicState.customTrack || MUSIC_CATALOG.find((t) => t.id === data.musicState.trackId) || MUSIC_CATALOG[0];
          musicEngine.play(track, data.musicState.currentTime);
        }
      } else if (config) {
        socket.emit('music-request-sync', { roomId: config.roomId });
      }

      // Sync room cinema / watch party media state if active
      if (data.mediaState) {
        setMediaSyncState(data.mediaState);
      } else if (config) {
        socket.emit('media-request-sync', { roomId: config.roomId });
      }

      // Decrypt stored message history and merge with local sanctuary storage
      if (data.messages && data.messages.length > 0) {
        const decryptedList: DecryptedMessage[] = [];
        for (const msg of data.messages) {
          const dec = await decryptPayload(msg, cryptoKey);
          decryptedList.push(dec);
        }
        setMessages((prev) => {
          const msgMap = new Map<string, DecryptedMessage>();
          // Existing local cache messages
          prev.forEach((m) => msgMap.set(m.id, m));
          // Server history messages (override/supplement)
          decryptedList.forEach((m) => msgMap.set(m.id, m));
          const sorted = Array.from(msgMap.values()).sort((a, b) => a.timestamp - b.timestamp);
          return sorted;
        });
      }
    });

    // Partner / Squad Member Joined
    socket.on('peer-joined', (data: { user: UserProfile; location?: HorizonLocation }) => {
      if (data.user) {
        setRoomMembers((prev) => {
          const exists = prev.some((u) => u.id === data.user.id);
          if (exists) return prev.map((u) => (u.id === data.user.id ? data.user : u));
          return [...prev, data.user];
        });
      }

      if (data.user.id !== currentUserId) {
        setPartner(data.user);
        setIsPartnerOnline(true);
        if (data.location) {
          setPartnerLocation(data.location);
          localStorage.setItem('haven_partner_location', JSON.stringify(data.location));
        }
        // Respond back with our own location so newly joined partner sees it immediately
        if (myLocation && config) {
          socket.emit('horizon-update-location', {
            roomId: config.roomId,
            location: myLocation,
          });
        }
      }
    });

    // Partner / Squad Member Left
    socket.on('peer-left', (data: { userId: string; remainingUsers?: UserProfile[] }) => {
      if (data.remainingUsers) {
        setRoomMembers(data.remainingUsers);
      } else {
        setRoomMembers((prev) => prev.filter((u) => u.id !== data.userId));
      }

      if (data.userId !== currentUserId) {
        setIsPartnerOnline(false);
      }
    });

    // Encrypted Message Incoming
    socket.on('encrypted-message', async (encryptedMsg: EncryptedMessage) => {
      const dec = await decryptPayload(encryptedMsg, cryptoKey);
      setMessages((prev) => {
        if (prev.some((m) => m.id === dec.id)) return prev;
        return [...prev, dec];
      });

      if (encryptedMsg.senderId !== currentUserId) {
        playMessageChime(false);
        const previewText = dec.type === 'text' ? dec.content : `Sent an encrypted ${dec.type}`;
        if (typeof document !== 'undefined' && document.hidden) {
          sendBrowserNotification(dec.senderName || 'Partner in Haven', {
            body: previewText,
          });
        }
        sendMessagePushNotification(dec.senderName || 'Partner in Haven', previewText, config?.roomId);
      }
    });

    // Voicemail / Offline Greetings Socket Listeners
    socket.on('new-voicemail', (data: { voicemail: VoicemailGreeting }) => {
      if (data.voicemail) {
        setVoicemails((prev) => {
          if (prev.some((v) => v.id === data.voicemail.id)) return prev;
          return [data.voicemail, ...prev];
        });
        if (data.voicemail.senderId !== currentUserId) {
          playMessageChime(true);
          sendVoicemailPushNotification(data.voicemail.senderName, data.voicemail.type);
        }
      }
    });

    socket.on('voicemail-updated', (data: { voicemailId: string; listened: boolean }) => {
      setVoicemails((prev) =>
        prev.map((v) => (v.id === data.voicemailId ? { ...v, listened: data.listened } : v))
      );
    });

    socket.on('voicemail-deleted', (data: { voicemailId: string }) => {
      setVoicemails((prev) => prev.filter((v) => v.id !== data.voicemailId));
    });

    // Message Reaction Updated
    socket.on('message-reaction-updated', (data: { messageId: string; emoji: string; userId: string }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== data.messageId) return msg;
          const reactions = { ...(msg.reactions || {}) };
          if (!reactions[data.emoji]) reactions[data.emoji] = [];
          const idx = reactions[data.emoji].indexOf(data.userId);
          if (idx > -1) {
            reactions[data.emoji].splice(idx, 1);
            if (reactions[data.emoji].length === 0) delete reactions[data.emoji];
          } else {
            reactions[data.emoji].push(data.userId);
          }
          return { ...msg, reactions };
        })
      );
    });

    // Message Deleted (Haven-style: Delete for everyone / Delete for me)
    socket.on('message-deleted', (data: { messageId: string; deleteForEveryone: boolean; deletedBy?: string }) => {
      setMessages((prev) => {
        if (data.deleteForEveryone) {
          return prev.map((m) => {
            if (m.id === data.messageId) {
              return {
                ...m,
                isDeleted: true,
                deletedForEveryone: true,
                content: '',
                fileMetadata: undefined,
                reactions: undefined,
              };
            }
            return m;
          });
        } else {
          return prev.filter((m) => m.id !== data.messageId);
        }
      });
    });

    // Message Edited (Haven-style: real-time decryption of edited text)
    socket.on('message-edited', async (data: { messageId: string; ciphertext: string; iv: string; editedAt: number }) => {
      try {
        let updatedContent = '';
        if (cryptoKey) {
          updatedContent = await decryptText(data.ciphertext, data.iv, cryptoKey);
        }
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === data.messageId) {
              return {
                ...m,
                content: updatedContent || m.content,
                isEdited: true,
                editedAt: data.editedAt,
              };
            }
            return m;
          })
        );
      } catch (err) {
        console.warn('Failed to decrypt incoming edited message:', err);
      }
    });

    // Partner Typing
    socket.on('user-typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== currentUserId) {
        setIsPartnerTyping(data.isTyping);
      }
    });

    // Instant Love Ping (Heartbeat Nudge)
    socket.on('love-ping-received', (data: { senderId: string; senderName: string }) => {
      playHeartbeatSound();
      // Trigger romantic celebration burst
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#ec4899', '#fda4af'],
      });
      setLoveBursts((prev) => [
        ...prev,
        {
          id: `burst-ping-${Date.now()}`,
          senderId: data.senderId,
          emoji: '❤️',
          x: 50,
          y: 50,
        },
      ]);
    });

    // Instant Love Buzz / Screen Rumble
    socket.on('love-buzz-received', (data: { senderId: string; senderName: string }) => {
      playHeartbeatSound();
      setIsScreenRumbling(true);
      setTimeout(() => setIsScreenRumbling(false), 700);
      confetti({
        particleCount: 50,
        spread: 85,
        origin: { y: 0.5 },
        colors: ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'],
      });
      setLoveBursts((prev) => [
        ...prev,
        {
          id: `burst-buzz-${Date.now()}`,
          senderId: data.senderId,
          emoji: '⚡',
          x: 50,
          y: 45,
        },
      ]);
    });

    // Floating Love Reaction Bursts
    socket.on('love-burst-received', (data: LoveBurstEvent) => {
      setLoveBursts((prev) => [...prev, data]);
    });

    // WebRTC Signaling Relay (1-on-1 calls)
    socket.on('signal', async (data: { senderSocketId: string; senderId: string; signal: unknown }) => {
      // Discard signals emitted by this specific socket to avoid feedback loops
      if (data.senderSocketId === socket.id) return;
      if (data.senderSocketId) {
        currentCallTargetSocketIdRef.current = data.senderSocketId;
      }
      const rawSig = data.signal as any;
      if (!rawSig) return;

      if (!webrtcRef.current || !webrtcRef.current.getIsReady()) {
        console.log('[WebRTC] Stashing early signal until peer connection finishes initialization:', rawSig.type || 'candidate');
        pendingSignalsRef.current.push({ senderSocketId: data.senderSocketId, signal: rawSig });
        return;
      }

      const rtc = webrtcRef.current;
      try {
        if (rawSig.type === 'offer') {
          console.log('[WebRTC] Received offer from peer:', data.senderSocketId);
          const answer = await rtc.handleOffer(rawSig as RTCSessionDescriptionInit);
          socket.emit('signal', {
            roomId: config.roomId,
            targetSocketId: data.senderSocketId,
            signal: answer,
          });
        } else if (rawSig.type === 'answer') {
          console.log('[WebRTC] Received answer from peer:', data.senderSocketId);
          await rtc.handleAnswer(rawSig as RTCSessionDescriptionInit);
        } else {
          // Process ICE candidate
          await rtc.handleCandidate(rawSig);
        }
      } catch (err) {
        console.warn('Error processing WebRTC signal:', err);
      }
    });

    // Incoming Call Notification
    socket.on('incoming-call', (data: { callType: CallType; callerName: string; callerAvatar: string; callerSocketId: string; isSquadCall?: boolean; roomId?: string }) => {
      if (data.callerSocketId) {
        currentCallTargetSocketIdRef.current = data.callerSocketId;
      }
      setIncomingCallData(data);
      callContextRef.current = {
        callType: data.callType,
        callerId: data.callerSocketId || 'partner',
        callerName: data.callerName,
        startedAt: Date.now(),
        connectedAt: null,
        status: 'incoming',
        logged: false,
        isSquadCall: data.isSquadCall || config?.spaceType === 'friends',
      };
      startRingtone();
      sendIncomingCallPushNotification(data.callerName, data.callType);
    });

    // Call Accepted by Partner
    socket.on('call-accepted', async (data: { callType: CallType; responderSocketId?: string }) => {
      stopRingtone();
      setCallStatus('connecting');
      if (callRingingTimeoutRef.current) {
        clearTimeout(callRingingTimeoutRef.current);
        callRingingTimeoutRef.current = null;
      }
      if (callContextRef.current) {
        callContextRef.current.status = 'connecting';
      }
      if (data.responderSocketId) {
        currentCallTargetSocketIdRef.current = data.responderSocketId;
      }
      if (webrtcRef.current) {
        const pc = webrtcRef.current.getPeerConnection();
        // Prevent duplicate offer generation if offer is already in flight or connection already established
        if (pc && (pc.signalingState === 'have-local-offer' || pc.connectionState === 'connected')) {
          console.log('[WebRTC] Call already connecting or connected, skipping duplicate offer generation');
          return;
        }
        try {
          const offer = await webrtcRef.current.createOffer();
          socket.emit('signal', {
            roomId: config.roomId,
            targetSocketId: data.responderSocketId,
            signal: offer,
          });
        } catch (err) {
          console.error('Error creating WebRTC offer:', err);
        }
      }
    });

    // Call Declined by Partner
    socket.on('call-declined', (data: { reason: string }) => {
      stopRingtone();
      playCallEnded();
      if (callRingingTimeoutRef.current) {
        clearTimeout(callRingingTimeoutRef.current);
        callRingingTimeoutRef.current = null;
      }
      setCallStatus('declined');
      if (callContextRef.current && !callContextRef.current.logged) {
        callContextRef.current.logged = true;
        logCallHistory({
          callType: callContextRef.current.callType,
          status: 'declined',
          duration: 0,
          callerId: callContextRef.current.callerId,
          callerName: callContextRef.current.callerName,
          isSquadCall: callContextRef.current.isSquadCall,
        });
      }
      const missedType = activeCallType || 'video';
      setTimeout(() => {
        setCallStatus('idle');
        setActiveCallType(null);
        // Prompt user to record an offline voicemail greeting / video message for partner
        setVoicemailModalMode('record');
        setMissedVoicemailCallType(missedType);
        setIsVoicemailModalOpen(true);
      }, 1500);
    });

    // Call Ended
    socket.on('call-ended', () => {
      stopRingtone();
      playCallEnded();
      if (callRingingTimeoutRef.current) {
        clearTimeout(callRingingTimeoutRef.current);
        callRingingTimeoutRef.current = null;
      }
      if (callContextRef.current) {
        callContextRef.current.logged = true;
      }
      pendingSignalsRef.current = [];
      if (relayEngageTimeoutRef.current) {
        clearTimeout(relayEngageTimeoutRef.current);
        relayEngageTimeoutRef.current = null;
      }
      if (mediaRelayBridgeRef.current) {
        mediaRelayBridgeRef.current.stop();
        mediaRelayBridgeRef.current = null;
      }
      setIsCloudRelayActive(false);

      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
      setLocalStream(null);
      setRemoteStream(null);
      setCallStatus('idle');
      setActiveCallType(null);
      setIncomingCallData(null);
      setPartnerIsMuted(false);
      setPartnerIsVideoOff(false);
    });

    // Call Media State: Partner toggled mute or camera
    socket.on('call-media-state', (data: { isMuted?: boolean; isVideoOff?: boolean }) => {
      if (typeof data.isMuted === 'boolean') {
        setPartnerIsMuted(data.isMuted);
      }
      if (typeof data.isVideoOff === 'boolean') {
        setPartnerIsVideoOff(data.isVideoOff);
      }
    });

    // Space Capacity Error (Maximum 5 members in Squad space)
    socket.on('space-full', (data: { message: string; maxMembers: number }) => {
      setSpaceFullError(data.message || 'This Squad room has reached its maximum capacity of 5 members.');
      setConfig(null);
      localStorage.removeItem('haven_couple_config');
    });

    // Squad Call State Updated (Active call started, participant joined/left/toggled)
    socket.on('squad-call-updated', (data: any) => {
      const activeCall = data?.activeCall !== undefined ? data.activeCall : data;
      setActiveSquadCall(activeCall);
    });

    // Another peer joined the ongoing squad call -> establish mesh WebRTC connection
    socket.on('squad-call-peer-joined', async (data: { socketId?: string; user?: UserProfile; participant?: { socketId: string } }) => {
      const peerSocketId = data.socketId || data.participant?.socketId;
      if (squadCallRef.current && isSquadCallModalOpen && peerSocketId && peerSocketId !== socket.id) {
        try {
          await squadCallRef.current.connectToPeer(peerSocketId, true);
        } catch (err) {
          console.error('Error connecting to new squad peer:', err);
        }
      }
    });

    // A peer left the squad call -> disconnect their peer connection
    socket.on('squad-call-peer-left', (data: { socketId: string; userId: string }) => {
      if (squadCallRef.current) {
        squadCallRef.current.removePeer(data.socketId);
      }
    });

    // Squad Mesh WebRTC Signaling (Routed peer-to-peer)
    socket.on('squad-signal', async (data: { senderSocketId: string; senderUserId: string; signal: any }) => {
      if (squadCallRef.current) {
        try {
          await squadCallRef.current.handleSignal(data.senderSocketId, data.signal);
        } catch (err) {
          console.error('Error handling squad WebRTC signal:', err);
        }
      }
    });

    // Entire Squad Call Ended
    socket.on('squad-call-ended', () => {
      if (squadCallRef.current) {
        squadCallRef.current.leaveCall();
      }
      setSquadLocalStream(null);
      setSquadRemoteStreams(new Map());
      setSquadSpeakingMap({});
      setIsSquadCallModalOpen(false);
      setActiveSquadCall(null);
      playCallEnded();
    });

    // Partner Mood Updated
    socket.on('partner-status-updated', (data: { statusMood: string }) => {
      setPartner((prev) => (prev ? { ...prev, statusMood: data.statusMood } : null));
    });

    // --- Haven Status Updates & Stories ---
    socket.on('status-updated', (data: { statuses: FriendStatus[] }) => {
      setStatuses(data.statuses || []);
    });

    socket.on('status-comment-received', (data: { statusId: string; comment: any; statuses?: FriendStatus[] }) => {
      if (data.statuses) {
        setStatuses(data.statuses);
      } else if (data.comment) {
        setStatuses((prev) =>
          prev.map((s) =>
            s.id === data.statusId
              ? { ...s, comments: [...(s.comments || []), data.comment] }
              : s
          )
        );
      }
      if (data.comment?.userId !== currentUserId) {
        triggerHaptic('light');
      }
    });

    socket.on('status-view-updated', (data: { statusId: string; userId: string; viewers: string[] }) => {
      setStatuses((prev) =>
        prev.map((s) =>
          s.id === data.statusId ? { ...s, viewers: data.viewers || [...(s.viewers || []), data.userId] } : s
        )
      );
    });

    // Partner Profile & Avatar Updated
    socket.on('partner-profile-updated', (data: { userId: string; name?: string; avatar?: string }) => {
      setPartner((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          name: data.name || prev.name,
          avatar: data.avatar || prev.avatar,
        };
      });
    });

    // --- Live Love Canvas Socket Listeners ---
    socket.on('canvas-stroke-received', (data: { stroke: CanvasStroke }) => {
      setRemoteCanvasStrokes((prev) => [...prev, data.stroke]);
    });

    socket.on('canvas-cleared', () => {
      setRemoteCanvasStrokes([]);
      setCanvasClearedAt(Date.now());
    });

    socket.on('canvas-cursor-moved', (data: { cursor: CanvasCursor }) => {
      if (data.cursor.userId !== currentUserId) {
        setRemoteCanvasCursor(data.cursor);
      }
    });

    socket.on('canvas-sync-state', (data: { strokes: CanvasStroke[] }) => {
      if (data.strokes) {
        setRemoteCanvasStrokes(data.strokes);
      }
    });

    // --- Watch Together Media Sync Socket Listeners ---
    socket.on('media-state-updated', (data: { state: MediaSyncState }) => {
      setMediaSyncState(data.state);
    });

    socket.on('in-movie-comment-received', (data: { comment: InMovieComment }) => {
      setIncomingInMovieComment(data.comment);
    });

    // --- Time Capsule Sealed Letters Listeners ---
    socket.on('capsule-letter-received', (data: { letter: TimeCapsuleLetter }) => {
      setTimeCapsuleLetters((prev) => {
        if (prev.some((l) => l.id === data.letter.id)) return prev;
        return [data.letter, ...prev];
      });
      playMessageChime();
    });

    socket.on('capsule-letter-unlocked', (data: { letterId: string; unlockedAt: number }) => {
      setTimeCapsuleLetters((prev) =>
        prev.map((l) => (l.id === data.letterId ? { ...l, isUnlocked: true, unlockedAt: data.unlockedAt } : l))
      );
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
    });

    socket.on('capsule-sync-state', (data: { letters: TimeCapsuleLetter[] }) => {
      if (data.letters) {
        setTimeCapsuleLetters(data.letters);
      }
    });

    // --- Daily Spark Listeners ---
    socket.on('spark-answer-updated', (data: { dateKey: string; promptId: string; answer: DailySparkAnswer; answers: Record<string, DailySparkAnswer> }) => {
      setDailySparkState((prev) => ({
        prompt: prev?.prompt || {
          id: data.promptId,
          question: 'What is one specific moment with me that you will never forget, and why?',
          category: 'romantic',
          emoji: '💖',
        },
        dateKey: data.dateKey,
        answers: data.answers,
      }));
      // If both have now answered, trigger celebratory confetti
      const userIds = Object.keys(data.answers || {});
      if (userIds.length >= 2) {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.5 } });
      }
    });

    socket.on('spark-sync-state', (data: { sparkState: DailySparkState | null }) => {
      if (data.sparkState) {
        setDailySparkState(data.sparkState);
      }
    });

    // --- Live Touch Pulse Listeners ---
    socket.on('touch-pulse-stream', (data: { touch: TouchPoint }) => {
      if (data.touch.userId !== currentUserId) {
        setRemoteTouchPoint(data.touch);
      }
    });

    socket.on('touch-pulse-released', (data: { userId: string }) => {
      if (data.userId !== currentUserId) {
        setRemoteTouchPoint(null);
      }
    });

    // --- Bucket List Listeners ---
    socket.on('bucket-item-added', (data: { item: BucketListItem }) => {
      setBucketListItems((prev) => {
        if (prev.some((i) => i.id === data.item.id)) return prev;
        return [data.item, ...prev];
      });
    });

    socket.on('bucket-item-toggled', (data: { itemId: string; isCompleted: boolean; completedAt?: number }) => {
      setBucketListItems((prev) =>
        prev.map((i) => (i.id === data.itemId ? { ...i, isCompleted: data.isCompleted, completedAt: data.completedAt } : i))
      );
      if (data.isCompleted) {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      }
    });

    socket.on('bucket-item-deleted', (data: { itemId: string }) => {
      setBucketListItems((prev) => prev.filter((i) => i.id !== data.itemId));
    });

    socket.on('bucket-sync-state', (data: { items: BucketListItem[] }) => {
      if (data.items) {
        setBucketListItems(data.items);
      }
    });

    // --- Couple Games Action Listener ---
    socket.on('game-action-received', (data: { gameType: GameType; actionData: any; senderId: string }) => {
      setIncomingGameAction(data);
      if (data.gameType === 'chess') {
        setIsChessModalOpen(true);
      } else {
        setGamesLoungeTab(data.gameType);
        setIsGamesLoungeOpen(true);
      }
    });

    // --- Horizon Partner Live Location Sync Listeners ---
    socket.on('horizon-location-received', (data: { userId: string; location: HorizonLocation }) => {
      if (data.userId !== currentUserId && data.location) {
        setPartnerLocation(data.location);
        localStorage.setItem('haven_partner_location', JSON.stringify(data.location));
      }
    });

    socket.on('horizon-sync-state', (data: { locations: Record<string, HorizonLocation> }) => {
      if (data.locations) {
        Object.entries(data.locations).forEach(([uid, loc]) => {
          if (uid !== currentUserId && loc) {
            setPartnerLocation(loc);
            localStorage.setItem('haven_partner_location', JSON.stringify(loc));
          }
        });
      }
    });

    // --- Synchronized Music Lounge Listeners ---
    socket.on('music-sync-state', (data: { state: SyncMusicState }) => {
      if (data.state) {
        setSyncMusicState(data.state);
        if (data.state.isPlaying) {
          const track = data.state.customTrack || MUSIC_CATALOG.find((t) => t.id === data.state.trackId) || MUSIC_CATALOG[0];
          musicEngine.play(track, data.state.currentTime);
        } else {
          musicEngine.pause();
        }
      }
    });

    // --- Squad & Couple Soundboard Broadcast Listener ---
    socket.on('soundboard-received', (data: { soundId: string; soundName: string; emoji: string; senderName: string }) => {
      playSoundboardById(data.soundId);
      confetti({ particleCount: 20, spread: 60, origin: { y: 0.7 } });
      setLoveBursts((prev) => [
        ...prev,
        {
          id: `burst-sound-${Date.now()}`,
          senderId: data.senderName,
          emoji: data.emoji,
          x: 40 + Math.random() * 20,
          y: 40 + Math.random() * 20,
        },
      ]);
    });

    // History Wiped
    socket.on('history-wiped', () => {
      setMessages([]);
      if (config?.roomId) {
        localStorage.removeItem(`haven_messages_${config.roomId}`);
      }
      localStorage.removeItem('haven_messages_history');
      setRemoteCanvasStrokes([]);
      setCanvasClearedAt(Date.now());
    });

    return () => {
      socket.disconnect();
      stopRingtone();
    };
  }, [config, cryptoKey, currentUserId, userMood, decryptPayload]);

  // Persist Messages to Local Sanctuary Storage Always and maintain all conversation histories
  useEffect(() => {
    if (!config?.roomId || messages.length === 0) return;
    try {
      saveMessagesForSpace(config.roomId, messages);
      localStorage.setItem('haven_messages_history', JSON.stringify(messages));

      // Update the last message snippet in saved spaces directory
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        const text =
          lastMsg.type === 'text'
            ? lastMsg.content
            : lastMsg.type === 'image'
            ? '📷 Photo'
            : lastMsg.type === 'video'
            ? '🎥 Video'
            : lastMsg.type === 'audio'
            ? '🎙️ Voice message'
            : lastMsg.type === 'love_ping'
            ? '💕 Love wave'
            : 'Encrypted message';
        updateSpaceLastMessage(config.roomId, text, lastMsg.timestamp);
        setSavedSpaces(getSavedSpaces());
      }
    } catch (e) {
      console.warn('Could not cache messages to localStorage:', e);
    }
  }, [messages, config?.roomId]);

  // Load cached messages when room config changes
  useEffect(() => {
    if (!config?.roomId) return;
    try {
      const storedMsgs = getMessagesForSpace(config.roomId);
      if (storedMsgs.length > 0) {
        setMessages(storedMsgs);
        return;
      }
      // If no room-specific history yet, start fresh for this space
      setMessages([]);
    } catch (e) {
      console.warn('Error reading cached room messages:', e);
      setMessages([]);
    }
  }, [config?.roomId]);

  // Automatically detect real device location from user's computer on startup
  useEffect(() => {
    let isMounted = true;
    detectRealDeviceLocation()
      .then((realLoc) => {
        if (!isMounted) return;
        setMyLocation(realLoc);
        try {
          localStorage.setItem('haven_my_location', JSON.stringify(realLoc));
        } catch (e) {
          console.warn('Failed to cache device location:', e);
        }
        if (socketRef.current && config) {
          socketRef.current.emit('horizon-update-location', {
            roomId: config.roomId,
            location: realLoc,
          });
        }
      })
      .catch((err) => {
        console.warn('Initial real location detection notice:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [config?.roomId]);

  // Request initial canvas and media state when opening their modals
  useEffect(() => {
    if (isCanvasOpen && config && socketRef.current) {
      socketRef.current.emit('canvas-request-sync', { roomId: config.roomId });
    }
  }, [isCanvasOpen, config]);

  useEffect(() => {
    if (isWatchTogetherOpen && config && socketRef.current) {
      socketRef.current.emit('media-request-sync', { roomId: config.roomId });
    }
  }, [isWatchTogetherOpen, config]);

  useEffect(() => {
    if (isTimeCapsuleOpen && config && socketRef.current) {
      socketRef.current.emit('capsule-request-sync', { roomId: config.roomId });
    }
  }, [isTimeCapsuleOpen, config]);

  useEffect(() => {
    if (isDailySparkOpen && config && socketRef.current) {
      const todayDateKey = new Date().toISOString().split('T')[0];
      socketRef.current.emit('spark-request-sync', { roomId: config.roomId, dateKey: todayDateKey });
    }
  }, [isDailySparkOpen, config]);

  useEffect(() => {
    if (isBucketListOpen && config && socketRef.current) {
      socketRef.current.emit('bucket-request-sync', { roomId: config.roomId });
    }
  }, [isBucketListOpen, config]);

  // Send Encrypted Message Handler
  const handleSendMessage = async (
    text: string,
    type: 'text' | 'image' | 'video' | 'audio' = 'text',
    fileData?: { buffer: ArrayBuffer; mimeType: string; fileName?: string; duration?: number },
    replyTo?: { id: string; senderName: string; text: string; type: string }
  ) => {
    if (!config || !cryptoKey) return;

    try {
      let ciphertext = '';
      let iv = '';

      if (type === 'text') {
        const enc = await encryptText(text, cryptoKey);
        ciphertext = enc.ciphertext;
        iv = enc.iv;
      } else if (fileData) {
        const enc = await encryptBinary(fileData.buffer, cryptoKey);
        ciphertext = enc.ciphertext;
        iv = enc.iv;
      }

      const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Date.now();
      const expiresAt = autoDeleteTimer > 0 ? timestamp + autoDeleteTimer * 1000 : undefined;

      const encryptedPayload: EncryptedMessage = {
        id: msgId,
        roomId: config.roomId,
        senderId: currentUserId,
        senderName: config.userName,
        type,
        ciphertext,
        iv,
        timestamp,
        expiresAt,
        replyTo,
        fileMetadata: fileData ? {
          mimeType: fileData.mimeType,
          fileName: fileData.fileName,
          fileSize: fileData.buffer.byteLength,
          duration: fileData.duration,
        } : undefined,
      };

      // Optimistically create decrypted message locally
      let localContent = text;
      if (fileData) {
        const blob = new Blob([fileData.buffer], { type: fileData.mimeType });
        localContent = URL.createObjectURL(blob);
      }

      const localDecrypted: DecryptedMessage = {
        id: msgId,
        roomId: config.roomId,
        senderId: currentUserId,
        senderName: config.userName,
        type,
        content: localContent,
        timestamp,
        expiresAt,
        replyTo,
        fileMetadata: encryptedPayload.fileMetadata,
        isDecrypted: true,
      };

      setMessages((prev) => [...prev, localDecrypted]);
      playMessageChime(true);

      // Instant Offline Queueing: if offline or socket not connected, queue for sync
      if (!navigator.onLine || !socketRef.current?.connected) {
        setOfflineQueue((prev) => {
          const next = [...prev, encryptedPayload];
          try {
            localStorage.setItem('haven_offline_msg_queue', JSON.stringify(next));
          } catch {}
          return next;
        });
      } else {
        // Emit to server
        socketRef.current.emit('encrypted-message', encryptedPayload);
      }
    } catch (err) {
      console.error('Failed to encrypt and send message:', err);
    }
  };

  // Reaction Handler
  const handleSendReaction = (messageId: string, emoji: string) => {
    if (!config || !socketRef.current) return;
    socketRef.current.emit('message-reaction', {
      roomId: config.roomId,
      messageId,
      emoji,
      userId: currentUserId,
    });
  };

  // Haven-style Delete Message Handler
  const handleDeleteMessage = (messageId: string, deleteForEveryone: boolean) => {
    if (!config || !socketRef.current) return;
    if (deleteForEveryone) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isDeleted: true,
                deletedForEveryone: true,
                content: '',
                fileMetadata: undefined,
                reactions: undefined,
              }
            : m
        )
      );
      socketRef.current.emit('delete-message', {
        roomId: config.roomId,
        messageId,
        deleteForEveryone: true,
        deletedBy: currentUserId,
      });
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      socketRef.current.emit('delete-message', {
        roomId: config.roomId,
        messageId,
        deleteForEveryone: false,
        deletedBy: currentUserId,
      });
    }
  };

  // Haven-style Edit Message Handler
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!config || !cryptoKey || !socketRef.current || !newText.trim()) return;
    try {
      const enc = await encryptText(newText.trim(), cryptoKey);
      const editedAt = Date.now();

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: newText.trim(), isEdited: true, editedAt } : m))
      );

      socketRef.current.emit('edit-message', {
        roomId: config.roomId,
        messageId,
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        editedAt,
      });
    } catch (err) {
      console.error('Failed to encrypt edited message:', err);
    }
  };

  // Typing Handler
  const handleTyping = (isTyping: boolean) => {
    if (!config || !socketRef.current) return;
    socketRef.current.emit('typing', {
      roomId: config.roomId,
      isTyping,
      userName: config.userName,
    });
  };

  // Love Ping (Heartbeat) Handler
  const handleSendLovePing = () => {
    if (!config || !socketRef.current) return;
    playHeartbeatSound();
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#f43f5e', '#ec4899', '#fda4af'],
    });
    socketRef.current.emit('love-ping', {
      roomId: config.roomId,
      senderName: config.userName,
    });
  };

  // Floating Love Reaction Burst Handler
  const handleSendLoveBurst = (emoji: string) => {
    if (!config || !socketRef.current) return;
    const x = Math.floor(20 + Math.random() * 60);
    const y = 80;
    const newBurst: LoveBurstEvent = {
      id: `burst-${Date.now()}-${Math.random()}`,
      senderId: currentUserId,
      emoji,
      x,
      y,
    };
    setLoveBursts((prev) => [...prev, newBurst]);
    socketRef.current.emit('love-burst', {
      roomId: config.roomId,
      emoji,
      x,
      y,
    });
  };

  // Instant Love Buzz / Screen Rumble Trigger
  const handleTriggerLoveBuzz = () => {
    if (!config || !socketRef.current) return;
    playHeartbeatSound();
    setIsScreenRumbling(true);
    setTimeout(() => setIsScreenRumbling(false), 700);
    confetti({
      particleCount: 55,
      spread: 85,
      origin: { y: 0.5 },
      colors: ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#eab308'],
    });
    socketRef.current.emit('love-buzz', {
      roomId: config.roomId,
      senderName: config.userName,
    });
    handleSendLoveBurst('⚡');
  };

  // Living Atmosphere Theme Selector Handler
  const handleSelectTheme = (themeId: ThemeId) => {
    setCurrentThemeId(themeId);
    saveTheme(themeId);
  };

  // Global background music playback synchronization (continues playing seamlessly while chatting)
  useEffect(() => {
    if (syncMusicState.isPlaying) {
      const track = syncMusicState.customTrack || MUSIC_CATALOG.find((t) => t.id === syncMusicState.trackId) || MUSIC_CATALOG[0];
      const engineTrack = musicEngine.getCurrentTrack();
      if (!engineTrack || engineTrack.id !== track.id) {
        musicEngine.play(track, syncMusicState.currentTime || 0);
      } else if (!musicEngine.getIsPlaying()) {
        musicEngine.play(track, syncMusicState.currentTime || 0);
      }
    } else {
      if (musicEngine.getIsPlaying()) {
        musicEngine.pause();
      }
    }
  }, [syncMusicState.isPlaying, syncMusicState.trackId, syncMusicState.customTrack]);

  // Music Lounge Synchronized Playback Handler
  const handleUpdateMusicSync = (updates: Partial<SyncMusicState>) => {
    setSyncMusicState((prev) => {
      const next = { ...prev, ...updates };
      if (socketRef.current && config) {
        socketRef.current.emit('music-sync', {
          roomId: config.roomId,
          state: next,
        });
      }
      return next;
    });
  };

  // Squad & Couple Live Soundboard Handler
  const handleTriggerSoundboard = (soundId: string, soundName: string, emoji: string) => {
    playSoundboardById(soundId);
    if (socketRef.current && config) {
      socketRef.current.emit('soundboard-trigger', {
        roomId: config.roomId,
        soundId,
        soundName,
        emoji,
        senderName: config.userName,
      });
    }
  };

  // Squad Multi-User Call Handlers (Up to 5 friends)
  const handleStartSquadCall = async (callType: 'audio' | 'video') => {
    if (!config || !socketRef.current) return;

    try {
      const mgr = initSquadCallManager();
      const stream = await mgr.startCall(callType);
      setSquadLocalStream(stream);
      setIsSquadMuted(false);
      setIsSquadVideoOff(callType === 'audio');
      setIsSquadScreenSharing(false);
      setIsSquadCallMinimized(false);
      setIsSquadCallModalOpen(true);
      squadCallStartTimeRef.current = Date.now();

      // Notify other members in space so they receive incoming call ring
      socketRef.current.emit('call-request', {
        roomId: config.roomId,
        callType,
        callerName: config.userName,
        callerAvatar: config.userAvatar,
        isSquadCall: true,
      });

      // Join the squad call on server
      socketRef.current.emit('squad-call-join', {
        roomId: config.roomId,
        callType,
        user: {
          id: currentUserId,
          name: config.userName,
          avatar: config.userAvatar,
        },
        isAudioMuted: false,
        isVideoOff: callType === 'audio',
      });

      // If active squad call already has participants, initiate mesh connection
      if (activeSquadCall && activeSquadCall.participants) {
        for (const p of activeSquadCall.participants) {
          if (p.socketId && p.socketId !== socketRef.current.id && p.userId !== currentUserId) {
            mgr.connectToPeer(p.socketId, true);
          }
        }
      }

      playCallConnected();
    } catch (err) {
      console.error('Failed to start squad call:', err);
      alert('Could not access camera or microphone. Please check browser permissions.');
    }
  };

  const handleJoinSquadCall = async () => {
    if (!activeSquadCall || !config || !socketRef.current) return;
    await handleStartSquadCall(activeSquadCall.callType);
  };

  const handleLeaveSquadCall = () => {
    if (squadCallRef.current) {
      squadCallRef.current.leaveCall();
    }
    if (squadCallStartTimeRef.current) {
      const duration = Math.max(1, Math.round((Date.now() - squadCallStartTimeRef.current) / 1000));
      squadCallStartTimeRef.current = null;
      logCallHistory({
        callType: activeSquadCall?.callType || 'video',
        status: 'completed',
        duration,
        callerId: currentUserId,
        callerName: config?.userName || 'You',
        isSquadCall: true,
        groupName: config?.groupName,
      });
    }
    setSquadLocalStream(null);
    setSquadRemoteStreams(new Map());
    setSquadSpeakingMap({});
    setIsSquadCallModalOpen(false);
    setIsSquadMuted(false);
    setIsSquadVideoOff(false);
    setIsSquadScreenSharing(false);

    if (socketRef.current && config) {
      socketRef.current.emit('squad-call-leave', {
        roomId: config.roomId,
      });
    }
    playCallEnded();
  };

  const handleToggleSquadMute = () => {
    if (!squadCallRef.current || !config || !socketRef.current) return;
    const nextMuted = squadCallRef.current.toggleMuteAudio();
    setIsSquadMuted(nextMuted);
    socketRef.current.emit('squad-call-toggle-media', {
      roomId: config.roomId,
      isAudioMuted: nextMuted,
      isVideoOff: isSquadVideoOff,
    });
  };

  const handleToggleSquadVideo = () => {
    if (!squadCallRef.current || !config || !socketRef.current) return;
    const nextOff = squadCallRef.current.toggleMuteVideo();
    setIsSquadVideoOff(nextOff);
    socketRef.current.emit('squad-call-toggle-media', {
      roomId: config.roomId,
      isAudioMuted: isSquadMuted,
      isVideoOff: nextOff,
    });
  };

  const handleSwitchSquadCamera = () => {
    if (squadCallRef.current) {
      squadCallRef.current.switchCamera();
    }
  };

  const handleToggleSquadScreenShare = async () => {
    if (squadCallRef.current) {
      const sharing = await squadCallRef.current.toggleScreenShare();
      setIsSquadScreenSharing(sharing);
    }
  };

  // Start Outgoing Call
  const handleStartCall = async (callType: CallType) => {
    if (!config || !socketRef.current) return;

    if (config.spaceType === 'friends') {
      await handleStartSquadCall(callType);
      return;
    }

    unlockAudioContext();
    setIsMuted(false);
    setIsVideoOff(false);
    setIsAudioCallMinimized(false);
    setIsVideoCallMinimized(false);
    setIsSquadCallMinimized(false);
    setActiveCallType(callType);
    setCallStatus('calling');
    startRingtone();

    callContextRef.current = {
      callType,
      callerId: currentUserId,
      callerName: config.userName,
      startedAt: Date.now(),
      connectedAt: null,
      status: 'calling',
      logged: false,
      isSquadCall: false,
    };

    if (callRingingTimeoutRef.current) {
      clearTimeout(callRingingTimeoutRef.current);
    }
    // Haven auto-timeout after 45s if partner doesn't pick up
    callRingingTimeoutRef.current = window.setTimeout(() => {
      if (callContextRef.current && (callContextRef.current.status === 'calling' || callContextRef.current.status === 'connecting')) {
        handleEndCall();
      }
    }, 45000);

    const rtc = initWebRTC(callType);
    try {
      const stream = await rtc.initLocalMedia(callType);
      setLocalStream(stream);
      rtc.createPeerConnection();
      await drainPendingSignals(rtc);

      // Initialize Built-in Cloud Media Relay (Permanent cross-network fallback)
      const bridge = initMediaRelayBridge(callType, stream);
      if (relayEngageTimeoutRef.current) clearTimeout(relayEngageTimeoutRef.current);
      relayEngageTimeoutRef.current = window.setTimeout(() => {
        if (bridge && !bridge.getIsActive()) {
          console.log('[Call] P2P connecting timeout reached across networks — engaging Built-in Cloud Relay');
          bridge.start().catch(() => {});
        }
      }, 3500);

      socketRef.current.emit('call-request', {
        roomId: config.roomId,
        callType,
        callerName: config.userName,
        callerAvatar: config.userAvatar,
      });
    } catch (err) {
      console.error('Error starting media call:', err);
      if (callRingingTimeoutRef.current) {
        clearTimeout(callRingingTimeoutRef.current);
        callRingingTimeoutRef.current = null;
      }
      stopRingtone();
      setCallStatus('idle');
      setActiveCallType(null);
      alert('Could not access camera/microphone. Please ensure permissions are granted.');
    }
  };

  // Accept Incoming Call
  const handleAcceptCall = async () => {
    if (!incomingCallData || !config || !socketRef.current) return;
    stopRingtone();
    if (callRingingTimeoutRef.current) {
      clearTimeout(callRingingTimeoutRef.current);
      callRingingTimeoutRef.current = null;
    }

    const callType = incomingCallData.callType;
    const isSquad = incomingCallData.isSquadCall || config.spaceType === 'friends';
    if (incomingCallData.callerSocketId) {
      currentCallTargetSocketIdRef.current = incomingCallData.callerSocketId;
    }

    if (isSquad) {
      setIncomingCallData(null);
      await handleStartSquadCall(callType);
      return;
    }

    unlockAudioContext();
    setIsMuted(false);
    setIsVideoOff(false);
    setIsAudioCallMinimized(false);
    setIsVideoCallMinimized(false);
    setIsSquadCallMinimized(false);
    setActiveCallType(callType);
    setCallStatus('connecting');

    if (callContextRef.current) {
      callContextRef.current.status = 'connecting';
    }

    const rtc = initWebRTC(callType);
    try {
      const stream = await rtc.initLocalMedia(callType);
      setLocalStream(stream);
      rtc.createPeerConnection();
      await drainPendingSignals(rtc);

      // Initialize Built-in Cloud Media Relay (Permanent cross-network fallback)
      const bridge = initMediaRelayBridge(callType, stream);
      if (relayEngageTimeoutRef.current) clearTimeout(relayEngageTimeoutRef.current);
      relayEngageTimeoutRef.current = window.setTimeout(() => {
        if (bridge && !bridge.getIsActive()) {
          console.log('[Call] P2P connecting timeout reached across networks — engaging Built-in Cloud Relay');
          bridge.start().catch(() => {});
        }
      }, 3500);

      socketRef.current.emit('call-accepted', {
        roomId: config.roomId,
        targetSocketId: incomingCallData.callerSocketId,
        callType,
      });
      setIncomingCallData(null);
    } catch (err) {
      console.error('Error accepting media call:', err);
      handleEndCall();
      alert('Could not access camera/microphone to join the call.');
    }
  };

  // Decline Incoming Call
  const handleDeclineCall = (reason?: string) => {
    stopRingtone();
    if (callRingingTimeoutRef.current) {
      clearTimeout(callRingingTimeoutRef.current);
      callRingingTimeoutRef.current = null;
    }
    if (callContextRef.current && !callContextRef.current.logged) {
      callContextRef.current.logged = true;
      logCallHistory({
        callType: callContextRef.current.callType,
        status: 'declined',
        duration: 0,
        callerId: callContextRef.current.callerId,
        callerName: callContextRef.current.callerName,
        isSquadCall: callContextRef.current.isSquadCall,
      });
    }
    if (incomingCallData && config && socketRef.current) {
      socketRef.current.emit('call-declined', {
        roomId: config.roomId,
        reason: reason || 'Busy',
      });
    }
    setIncomingCallData(null);
    currentCallTargetSocketIdRef.current = null;
  };

  // End Active Call
  const handleEndCall = () => {
    stopRingtone();
    playCallEnded();
    if (callRingingTimeoutRef.current) {
      clearTimeout(callRingingTimeoutRef.current);
      callRingingTimeoutRef.current = null;
    }
    if (callContextRef.current && !callContextRef.current.logged) {
      callContextRef.current.logged = true;
      const isConnected = !!callContextRef.current.connectedAt;
      const duration = isConnected
        ? Math.max(1, Math.round((Date.now() - (callContextRef.current.connectedAt || Date.now())) / 1000))
        : 0;
      const status = isConnected ? 'completed' : 'missed';
      logCallHistory({
        callType: callContextRef.current.callType,
        status,
        duration,
        callerId: callContextRef.current.callerId,
        callerName: callContextRef.current.callerName,
        isSquadCall: callContextRef.current.isSquadCall,
      });
    }
    pendingSignalsRef.current = [];
    currentCallTargetSocketIdRef.current = null;
    if (relayEngageTimeoutRef.current) {
      clearTimeout(relayEngageTimeoutRef.current);
      relayEngageTimeoutRef.current = null;
    }
    if (mediaRelayBridgeRef.current) {
      mediaRelayBridgeRef.current.stop();
      mediaRelayBridgeRef.current = null;
    }
    setIsCloudRelayActive(false);

    if (config && socketRef.current) {
      socketRef.current.emit('call-ended', {
        roomId: config.roomId,
      });
    }
    if (webrtcRef.current) {
      webrtcRef.current.cleanup();
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setActiveCallType(null);
    setIncomingCallData(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setPartnerIsMuted(false);
    setPartnerIsVideoOff(false);
    setIsScreenSharing(false);
    setIsAudioCallMinimized(false);
  };

  // Voicemail & Offline Video Greeting Handlers
  const handleSendVoicemail = async (voicemailData: Omit<VoicemailGreeting, 'id' | 'createdAt' | 'listened'>) => {
    if (!config?.roomId || !socketRef.current) return;
    const newVm: VoicemailGreeting = {
      ...voicemailData,
      id: `vm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      roomId: config.roomId,
      createdAt: Date.now(),
      listened: false,
    };
    socketRef.current.emit('leave-voicemail', newVm);
    setVoicemails((prev) => {
      if (prev.some((v) => v.id === newVm.id)) return prev;
      return [newVm, ...prev];
    });
  };

  const handleMarkVoicemailListened = (voicemailId: string) => {
    if (!config?.roomId || !socketRef.current) return;
    socketRef.current.emit('mark-voicemail-listened', { voicemailId, roomId: config.roomId });
    setVoicemails((prev) =>
      prev.map((v) => (v.id === voicemailId ? { ...v, listened: true } : v))
    );
  };

  const handleDeleteVoicemail = (voicemailId: string) => {
    if (!config?.roomId || !socketRef.current) return;
    socketRef.current.emit('delete-voicemail', { voicemailId, roomId: config.roomId });
    setVoicemails((prev) => prev.filter((v) => v.id !== voicemailId));
  };

  // --- Haven Status Updates & Stories Handlers ---
  const handlePostStatus = useCallback((data: {
    type: 'text' | 'image';
    text?: string;
    color?: string;
    mediaUrl?: string;
    caption?: string;
  }) => {
    if (!config) return;
    const statusId = `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const expiresAt = timestamp + 24 * 60 * 60 * 1000;
    const newStatus: FriendStatus = {
      id: statusId,
      roomId: config.roomId,
      userId: currentUserId,
      userName: config.userName,
      userAvatar: config.userAvatar,
      type: data.type,
      text: data.text,
      color: data.color,
      mediaUrl: data.mediaUrl,
      caption: data.caption,
      timestamp,
      expiresAt,
      viewers: [currentUserId],
      comments: [],
    };
    setStatuses((prev) => [newStatus, ...prev.filter((s) => s.id !== statusId)]);
    if (socketRef.current?.connected) {
      socketRef.current.emit('status-post', { roomId: config.roomId, status: newStatus });
    }
  }, [config, currentUserId]);

  const handleDeleteStatus = useCallback((statusId: string) => {
    if (!config) return;
    setStatuses((prev) => prev.filter((s) => s.id !== statusId));
    if (socketRef.current?.connected) {
      socketRef.current.emit('status-delete', { roomId: config.roomId, statusId });
    }
  }, [config]);

  const handleViewStatus = useCallback((statusId: string) => {
    if (!config) return;
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id === statusId && !s.viewers?.includes(currentUserId)) {
          return { ...s, viewers: [...(s.viewers || []), currentUserId] };
        }
        return s;
      })
    );
    if (socketRef.current?.connected) {
      socketRef.current.emit('status-view', { roomId: config.roomId, statusId, userId: currentUserId });
    }
  }, [config, currentUserId]);

  const handleAddStatusComment = useCallback((statusId: string, commentText: string) => {
    if (!config) return;
    const comment: StatusComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      statusId,
      userId: currentUserId,
      userName: config.userName,
      userAvatar: config.userAvatar,
      text: commentText,
      timestamp: Date.now(),
    };
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id === statusId) {
          return { ...s, comments: [...(s.comments || []), comment] };
        }
        return s;
      })
    );
    if (socketRef.current?.connected) {
      socketRef.current.emit('status-comment', { roomId: config.roomId, statusId, comment });
    }
  }, [config, currentUserId]);

  // Manual ICE Restart Reconnection (for cross-country calling jitter)
  const handleReconnectCall = useCallback(async () => {
    if (webrtcRef.current) {
      console.log('User triggered manual WebRTC ICE restart for international reconnection...');
      await webrtcRef.current.restartIce();
    }
  }, []);

  // Calling Media Controls
  const handleToggleMute = () => {
    let nextMuted = !isMuted;
    if (webrtcRef.current) {
      nextMuted = webrtcRef.current.toggleMuteAudio();
    }
    if (mediaRelayBridgeRef.current) {
      mediaRelayBridgeRef.current.setMuted(nextMuted);
    }
    if (squadCallRef.current) {
      nextMuted = squadCallRef.current.toggleMuteAudio();
    }
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
    setIsMuted(nextMuted);
    if (socketRef.current && config) {
      socketRef.current.emit('call-media-state', {
        roomId: config.roomId,
        isMuted: nextMuted,
        targetSocketId: currentCallTargetSocketIdRef.current || undefined,
      });
    }
  };

  const handleToggleVideo = () => {
    let nextOff = !isVideoOff;
    if (webrtcRef.current) {
      nextOff = webrtcRef.current.toggleMuteVideo();
    }
    if (mediaRelayBridgeRef.current) {
      mediaRelayBridgeRef.current.setVideoOff(nextOff);
    }
    if (squadCallRef.current) {
      nextOff = squadCallRef.current.toggleMuteVideo();
    }
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !nextOff;
      });
    }
    setIsVideoOff(nextOff);
    if (socketRef.current && config) {
      socketRef.current.emit('call-media-state', {
        roomId: config.roomId,
        isVideoOff: nextOff,
        targetSocketId: currentCallTargetSocketIdRef.current || undefined,
      });
    }
  };

  const handleSwitchCamera = () => {
    if (webrtcRef.current) {
      webrtcRef.current.switchCamera();
    }
  };

  const handleToggleScreenShare = async () => {
    if (webrtcRef.current) {
      const sharing = await webrtcRef.current.toggleScreenShare();
      setIsScreenSharing(sharing);
    }
  };

  const handleToggleNoiseCancellation = useCallback(() => {
    setIsNoiseCancellationActive((prev) => {
      const next = !prev;
      if (webrtcRef.current) {
        webrtcRef.current.setNoiseCancellation(next).catch((err) => {
          console.debug('Error toggling noise cancellation on WebRTC:', err);
        });
      }
      if (squadCallRef.current) {
        squadCallRef.current.setNoiseCancellation(next).catch((err) => {
          console.debug('Error toggling noise cancellation on SquadCall:', err);
        });
      }
      return next;
    });
  }, []);

  const handleToggleEchoSuppression = useCallback(() => {
    setIsEchoSuppressionActive((prev) => {
      const next = !prev;
      if (webrtcRef.current) {
        webrtcRef.current.setEchoSuppression(next).catch((err) => {
          console.debug('Error toggling echo suppression on WebRTC:', err);
        });
      }
      if (squadCallRef.current) {
        squadCallRef.current.setEchoSuppression(next).catch((err) => {
          console.debug('Error toggling echo suppression on SquadCall:', err);
        });
      }
      return next;
    });
  }, []);

  // Mood Update
  const handleUpdateMood = (newMood: string) => {
    setUserMood(newMood);
    if (config && socketRef.current) {
      socketRef.current.emit('update-status', {
        roomId: config.roomId,
        statusMood: newMood,
      });
    }
  };

  // Wipe History
  const handleWipeHistory = () => {
    if (config && socketRef.current) {
      socketRef.current.emit('wipe-history', { roomId: config.roomId });
    }
    setMessages([]);
    setRemoteCanvasStrokes([]);
  };

  // Live Canvas Handlers
  const handleSendCanvasStroke = (stroke: CanvasStroke) => {
    if (config && socketRef.current) {
      socketRef.current.emit('canvas-draw-stroke', {
        roomId: config.roomId,
        stroke,
      });
    }
  };

  const handleClearCanvas = () => {
    if (config && socketRef.current) {
      socketRef.current.emit('canvas-clear', {
        roomId: config.roomId,
      });
    }
  };

  const handleCanvasCursorMove = (cursor: CanvasCursor) => {
    if (config && socketRef.current) {
      socketRef.current.emit('canvas-cursor', {
        roomId: config.roomId,
        cursor,
      });
    }
  };

  const handleSendCanvasToChat = (buffer: ArrayBuffer, mimeType: string, fileName: string) => {
    handleSendMessage('', 'image', { buffer, mimeType, fileName });
  };

  // Watch Together Handlers
  const handleSyncMedia = (state: MediaSyncState) => {
    setMediaSyncState(state);
    if (config && socketRef.current) {
      socketRef.current.emit('media-sync', {
        roomId: config.roomId,
        state,
      });
    }
  };

  const handleSendInMovieComment = (comment: InMovieComment) => {
    if (config && socketRef.current) {
      socketRef.current.emit('in-movie-comment', {
        roomId: config.roomId,
        comment,
      });
    }
  };

  // Time Capsule Handlers
  const handleSendTimeCapsuleLetter = (letter: TimeCapsuleLetter) => {
    setTimeCapsuleLetters((prev) => [letter, ...prev]);
    if (config && socketRef.current) {
      socketRef.current.emit('capsule-send-letter', {
        roomId: config.roomId,
        letter,
      });
    }
  };

  const handleUnlockTimeCapsuleLetter = (letterId: string) => {
    setTimeCapsuleLetters((prev) =>
      prev.map((l) => (l.id === letterId ? { ...l, isUnlocked: true, unlockedAt: Date.now() } : l))
    );
    if (config && socketRef.current) {
      socketRef.current.emit('capsule-unlock-letter', {
        roomId: config.roomId,
        letterId,
      });
    }
  };

  // Daily Spark Handlers
  const handleSubmitDailySparkAnswer = (promptId: string, dateKey: string, answer: DailySparkAnswer) => {
    setDailySparkState((prev) => ({
      prompt: prev?.prompt || {
        id: promptId,
        question: 'What is one specific moment with me that you will never forget, and why?',
        category: 'romantic',
        emoji: '💖',
      },
      dateKey,
      answers: {
        ...(prev?.answers || {}),
        [answer.userId]: answer,
      },
    }));

    if (config && socketRef.current) {
      socketRef.current.emit('spark-submit-answer', {
        roomId: config.roomId,
        promptId,
        dateKey,
        answer,
      });
    }
  };

  // Touch Pulse Handlers
  const handleSendTouchUpdate = (touch: TouchPoint) => {
    if (config && socketRef.current) {
      socketRef.current.emit('touch-pulse-update', {
        roomId: config.roomId,
        touch,
      });
    }
  };

  const handleSendTouchRelease = (userId: string) => {
    if (config && socketRef.current) {
      socketRef.current.emit('touch-pulse-release', {
        roomId: config.roomId,
        userId,
      });
    }
  };

  // Bucket List Handlers
  const handleAddBucketItem = (item: BucketListItem) => {
    setBucketListItems((prev) => [item, ...prev]);
    if (config && socketRef.current) {
      socketRef.current.emit('bucket-add-item', {
        roomId: config.roomId,
        item,
      });
    }
  };

  const handleToggleBucketItem = (itemId: string, isCompleted: boolean, completedAt?: number) => {
    setBucketListItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isCompleted, completedAt } : i))
    );
    if (config && socketRef.current) {
      socketRef.current.emit('bucket-toggle-item', {
        roomId: config.roomId,
        itemId,
        isCompleted,
        completedAt,
      });
    }
  };

  const handleDeleteBucketItem = (itemId: string) => {
    setBucketListItems((prev) => prev.filter((i) => i.id !== itemId));
    if (config && socketRef.current) {
      socketRef.current.emit('bucket-delete-item', {
        roomId: config.roomId,
        itemId,
      });
    }
  };

  // Switch directly to a previously saved space without losing passkey or history
  const handleSwitchSpace = (record: SavedSpaceRecord) => {
    if (!record?.roomId) return;
    try {
      // 1. Save current room messages first if any exist
      if (config?.roomId && messages.length > 0) {
        saveMessagesForSpace(config.roomId, messages);
      }

      // 2. Prepare new space config and persist it
      const newConfig = spaceRecordToConfig(record);
      recordSpaceVisit(newConfig);
      try {
        localStorage.setItem('haven_couple_config', JSON.stringify(newConfig));
      } catch {
        // ignore
      }

      // 3. Load all saved messages for target space
      const spaceMsgs = getMessagesForSpace(record.roomId);
      setMessages(spaceMsgs);

      // 4. Disconnect existing socket room so we cleanly join the new one
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // 5. Update room state & presence
      setConfig(newConfig);
      setSavedSpaces(getSavedSpaces());
      setIsPartnerOnline(false);
      setRoomMembers([]);
      setPartner(null);
      setIsSpacesManagerOpen(false);
      setSpaceFullError(null);
      playMessageChime(false);
    } catch (e) {
      console.error('Failed to switch space:', e);
    }
  };

  // Leave Space without forgetting it from the saved registry
  const handleLeaveSpace = () => {
    // Current space remains preserved in the saved spaces registry so you can return anytime
    if (config) {
      try {
        recordSpaceVisit(config);
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('haven_couple_config');
    setConfig(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    window.location.href = window.location.pathname;
  };

  // Launch 1-on-1 Haven Space directly from Singles Lounge
  const handleStartOneOnOneSpace = (roomId: string, passkey: string, partnerProfile?: SingleProfile) => {
    const defaultPartnerName = partnerProfile?.name || 'Haven Spark Partner';
    const defaultPartnerAvatar = partnerProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

    let myName = config?.userName;
    let myAvatar = config?.userAvatar;
    try {
      if (!myName) myName = localStorage.getItem('haven_singles_my_name') || 'Guest Spark';
      if (!myAvatar) myAvatar = localStorage.getItem('haven_singles_my_avatar') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    } catch {
      // ignore
    }

    const newConfig: CoupleSpaceConfig = {
      roomId: roomId.trim().toLowerCase(),
      passkey: passkey.trim(),
      spaceType: 'couple',
      userRole: 'partner1',
      userName: myName || 'Guest Spark',
      userAvatar: myAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      partnerName: defaultPartnerName,
      partnerAvatar: defaultPartnerAvatar,
      autoDeleteTimer: 0,
      isVerified: false,
    };

    try {
      localStorage.setItem('haven_couple_config', JSON.stringify(newConfig));
    } catch {
      // ignore
    }

    setConfig(newConfig);
    setIsSinglesLoungeOpen(false);
  };

  // If no space is configured yet or user requested landing, render LandingPage, AuthModal, SetupSpaceModal
  if (!config || showLanding) {
    return (
      <>
        <OfflineIndicator />
        <LandingPage
          authUser={authUser}
          pendingInvites={pendingInvites}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalReason(undefined);
            setIsAuthModalOpen(true);
          }}
          onOpenSpaceChooser={() => {
            if (!authUser) {
              setAuthModalMode('login');
              setAuthModalReason('Please sign in or register to choose your space destination.');
              setIsAuthModalOpen(true);
            } else {
              setShowSpaceChooser(true);
            }
          }}
          onEnterSpouseChat={() => {
            if (!authUser) {
              setAuthModalMode('login');
              setAuthModalReason('Please sign in or register to step into your private spouse chat.');
              setIsAuthModalOpen(true);
            } else {
              handleSelectDestination('spouse');
            }
          }}
          onOpenSetup={(mode, type) => {
            setSetupInitialMode(mode);
            setSetupInitialType(type || 'couple');
            setIsSetupSpaceOpen(true);
          }}
          onAcceptInvite={handleAcceptInvite}
          onLogout={handleLogout}
        />

        <SpaceChooserModal
          isOpen={showSpaceChooser}
          onClose={() => setShowSpaceChooser(false)}
          authUser={authUser}
          onSelectDestination={handleSelectDestination}
        />

        {isSetupSpaceOpen && (
          <SetupSpaceModal
            initialError={spaceFullError}
            initialMode={setupInitialMode}
            initialSpaceType={setupInitialType}
            onClose={() => setIsSetupSpaceOpen(false)}
            onOpenAuth={(mode) => {
              setAuthModalMode(mode);
              setIsAuthModalOpen(true);
            }}
            onOpenSingles={() => setIsSinglesLoungeOpen(true)}
            onComplete={(newConfig) => {
              setConfig(newConfig);
              setSpaceFullError(null);
              setIsSetupSpaceOpen(false);
              setShowLanding(false);
            }}
          />
        )}

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => {
            setIsAuthModalOpen(false);
            setAuthModalReason(undefined);
          }}
          onSuccess={handleAuthSuccess}
          initialMode={authModalMode}
          reasonMessage={authModalReason}
        />

        {isSinglesLoungeOpen && (
          <SinglesLoungeModal
            isOpen={isSinglesLoungeOpen}
            onClose={() => setIsSinglesLoungeOpen(false)}
            currentUserId={currentUserId}
            currentUserName={authUser?.name || ''}
            currentUserAvatar={authUser?.avatar || ''}
            onStartOneOnOneSpace={(roomId, passkey, partnerProfile) => {
              handleStartOneOnOneSpace(roomId, passkey, partnerProfile);
              setShowLanding(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className={`flex flex-col h-[100dvh] max-h-[100dvh] w-full ${colorMode === 'dark' ? 'bg-slate-950 text-slate-100 dark' : `${currentTheme.canvasBg || 'bg-rose-50/30'} text-slate-900`} overflow-hidden font-sans transition-colors duration-500 ${isScreenRumbling ? 'animate-screen-rumble' : ''}`}>
      {/* Floating Love Reaction Overlay */}
      <LoveBurstOverlay
        bursts={loveBursts}
        onRemove={(id) => setLoveBursts((prev) => prev.filter((b) => b.id !== id))}
      />

      {/* Top Header Bar */}
      {!isChatFullscreen && (
        <TopBar
        partner={partner}
        partnerName={config.partnerName}
        partnerAvatar={config.partnerAvatar}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        isPartnerOnline={isPartnerOnline}
        anniversaryDate={config.anniversaryDate}
        isVerified={config.isVerified || false}
        spaceType={config.spaceType}
        groupName={config.groupName}
        groupEmoji={config.groupEmoji}
        roomMembers={roomMembers}
        colorMode={colorMode}
        onToggleColorMode={handleToggleColorMode}
        onOpenAllFeatures={() => setIsSpaceFeaturesOpen(true)}
        onOpenSecurity={() => setShowSecurityModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenActivityLog={() => setShowActivityLogModal(true)}
        onStartAudioCall={() => handleStartCall('audio')}
        onStartVideoCall={() => handleStartCall('video')}
        onSendLovePing={handleSendLovePing}
        onUpdateMood={handleUpdateMood}
        userMood={userMood}
        onOpenCanvas={() => setIsCanvasOpen(true)}
        onOpenWatchTogether={() => setIsWatchTogetherOpen(true)}
        onOpenTimeCapsule={() => setIsTimeCapsuleOpen(true)}
        onOpenDailySpark={() => setIsDailySparkOpen(true)}
        onOpenTouchPulse={() => setIsTouchPulseOpen(true)}
        onOpenBucketList={() => setIsBucketListOpen(true)}
        onOpenSleepSanctuary={() => setIsSleepSanctuaryOpen(true)}
        onOpenGamesLounge={() => {
          setGamesLoungeTab('connect_hearts');
          setIsGamesLoungeOpen(true);
        }}
        onOpenDraughts={() => {
          setGamesLoungeTab('draughts');
          setIsGamesLoungeOpen(true);
        }}
        onOpenLudo={() => {
          setGamesLoungeTab('ludo');
          setIsGamesLoungeOpen(true);
        }}
        onOpenCandyCrush={() => {
          setGamesLoungeTab('candy_crush');
          setIsGamesLoungeOpen(true);
        }}
        onOpenChess={() => setIsChessModalOpen(true)}
        onOpenPolaroidVault={() => setIsPolaroidVaultOpen(true)}
        onOpenHorizon={() => setIsHorizonOpen(true)}
        onOpenCareTracker={() => setIsCareTrackerOpen(true)}
        onOpenThemePicker={() => setShowThemePickerModal(true)}
        onOpenVibeSelector={() => setShowVibeSelectorModal(true)}
        onTriggerLoveBuzz={handleTriggerLoveBuzz}
        themeConfig={currentTheme}
        onOpenMusicLounge={() => setIsMusicLoungeOpen(true)}
        onOpenSoundboard={() => setIsSoundboardOpen(true)}
        isMusicPlaying={syncMusicState.isPlaying}
        currentMusicTitle={syncMusicState.customTrack?.title || MUSIC_CATALOG.find((t) => t.id === syncMusicState.trackId)?.title}
        onOpenWallpaperPicker={() => setShowWallpaperPickerModal(true)}
        onOpenSinglesLounge={(config.spaceType as any) === 'single' ? () => setIsSinglesLoungeOpen(true) : undefined}
        onOpenStatus={() => setIsStatusModalOpen(true)}
        hasUnreadStatus={hasUnreadStatus}
        onOpenSpacesManager={() => setShowSpaceChooser(true)}
        onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
        onInviteSpouse={() => setIsInviteSpouseOpen(true)}
        onExitToLanding={() => setShowLanding(true)}
        onOpenQRPairing={() => setIsQRPairingOpen(true)}
        onOpenVoicemail={() => {
          setVoicemailModalMode('inbox');
          setIsVoicemailModalOpen(true);
        }}
        unreadVoicemailCount={voicemails.filter((v) => !v.listened && v.senderId !== currentUserId).length}
        pendingInviteCount={pendingInvites.filter((i) => i.status === 'pending' && i.roomId !== config.roomId).length}
        pendingInvitePartnerName={pendingInvites.find((i) => i.status === 'pending' && i.roomId !== config.roomId)?.senderName}
        onAcceptPendingInvite={() => {
          const inv = pendingInvites.find((i) => i.status === 'pending' && i.roomId !== config.roomId) || pendingInvites[0];
          if (inv) handleAcceptInvite(inv);
        }}
        isChatFullscreen={isChatFullscreen}
        onToggleChatFullscreen={handleToggleChatFullscreen}
      />
      )}

      {/* Main Encrypted Chat Workspace */}
      <main className={`flex-1 flex flex-col w-full min-h-0 overflow-hidden relative ${isChatFullscreen ? 'h-full' : ''}`}>
        <ChatArea
          messages={messages}
          currentUserId={currentUserId}
          currentUserAvatar={config.userAvatar}
          partner={partner}
          partnerName={config.partnerName}
          partnerAvatar={config.partnerAvatar}
          isPartnerTyping={isPartnerTyping}
          spaceType={config.spaceType}
          roomMembers={roomMembers}
          activeSquadCall={activeSquadCall}
          onJoinSquadCall={handleJoinSquadCall}
          onSendMessage={handleSendMessage}
          onSendReaction={handleSendReaction}
          onTyping={handleTyping}
          autoDeleteTimer={autoDeleteTimer}
          onChangeAutoDeleteTimer={setAutoDeleteTimer}
          onSendLoveBurst={handleSendLoveBurst}
          themeConfig={currentTheme}
          colorMode={colorMode}
          wallpaperSettings={wallpaperSettings}
          onOpenWallpaperPicker={() => setShowWallpaperPickerModal(true)}
          onTriggerLoveBuzz={handleTriggerLoveBuzz}
          onOpenThemePicker={() => setShowThemePickerModal(true)}
          onOpenMusicLounge={() => setIsMusicLoungeOpen(true)}
          onOpenSoundboard={() => setIsSoundboardOpen(true)}
          isMusicPlaying={syncMusicState.isPlaying}
          currentMusicTitle={syncMusicState.customTrack?.title || MUSIC_CATALOG.find((t) => t.id === syncMusicState.trackId)?.title}
          onToggleMusicPlayPause={() => handleUpdateMusicSync({ isPlaying: !syncMusicState.isPlaying })}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
          onOpenWatchTogether={() => setIsWatchTogetherOpen(true)}
          pendingSpouseInvite={
            pendingInvites.find((i) => i.status === 'pending' && i.roomId !== config.roomId) ||
            (pendingInvites.length > 0 && pendingInvites[0].status === 'pending' ? pendingInvites[0] : null)
          }
          onAcceptSpouseInvite={handleAcceptInvite}
          onDismissSpouseInvite={(id) => setPendingInvites((prev) => prev.filter((i) => i.id !== id))}
          onOpenInviteSpouse={() => setIsInviteSpouseOpen(true)}
          onOpenQRPairing={() => setIsQRPairingOpen(true)}
          onOpenThumbKiss={() => setIsTouchPulseOpen(true)}
          ambientHeartbeat={isPartnerOnline}
          isChatFullscreen={isChatFullscreen}
          onToggleChatFullscreen={handleToggleChatFullscreen}
          onStartAudioCall={() => handleStartCall('audio')}
          onStartVideoCall={() => handleStartCall('video')}
          onOpenStatus={() => setIsStatusModalOpen(true)}
          hasUnreadStatus={hasUnreadStatus}
        />
      </main>

      {/* Haven Mobile Bottom Navigation Bar (Phone Only) */}
      {!isChatFullscreen && (
        <HavenBottomNav
          spaceType={config.spaceType}
          isDark={colorMode === 'dark'}
          onStartAudioCall={() => handleStartCall('audio')}
          onStartVideoCall={() => handleStartCall('video')}
          onOpenWatchTogether={() => setIsWatchTogetherOpen(true)}
          onOpenMusicLounge={() => setIsMusicLoungeOpen(true)}
          onOpenVoicemail={() => {
            setVoicemailModalMode('inbox');
            setIsVoicemailModalOpen(true);
          }}
          isMusicPlaying={syncMusicState.isPlaying}
          currentMusicTitle={syncMusicState.customTrack?.title || MUSIC_CATALOG.find((t) => t.id === syncMusicState.trackId)?.title}
          onOpenSinglesLounge={(config.spaceType as any) === 'single' ? () => setIsSinglesLoungeOpen(true) : undefined}
          onOpenStatus={() => setIsStatusModalOpen(true)}
          hasUnreadStatus={hasUnreadStatus}
          onOpenFeatures={() => setIsSpaceFeaturesOpen(true)}
        />
      )}

      {/* Live Love Canvas Modal */}
      <LiveCanvasModal
        isOpen={isCanvasOpen}
        onClose={() => setIsCanvasOpen(false)}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        partner={partner}
        partnerName={config.partnerName}
        onSendStroke={handleSendCanvasStroke}
        onClearCanvas={handleClearCanvas}
        onCursorMove={handleCanvasCursorMove}
        onSendToChat={handleSendCanvasToChat}
        remoteStrokes={remoteCanvasStrokes}
        remoteCursor={remoteCanvasCursor}
        canvasClearedAt={canvasClearedAt}
      />

      {/* Watch Together Lounge & Cinema Modal */}
      <WatchTogetherModal
        isOpen={isWatchTogetherOpen}
        onClose={() => setIsWatchTogetherOpen(false)}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        partner={partner}
        partnerName={config.partnerName}
        spaceType={config.spaceType}
        groupName={config.groupName}
        groupEmoji={config.groupEmoji}
        roomMembers={roomMembers}
        mediaSyncState={mediaSyncState}
        onSyncMedia={handleSyncMedia}
        onSendLoveBurst={handleSendLoveBurst}
        activeCallType={activeCallType}
        callStatus={callStatus}
        isMuted={isMuted}
        isVideoEnabled={!isVideoOff}
        localStream={localStream}
        remoteStream={remoteStream}
        onStartCall={handleStartCall}
        onEndCall={handleEndCall}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onSendInMovieComment={handleSendInMovieComment}
        incomingInMovieComment={incomingInMovieComment}
      />

      {/* Time Capsule ("Open When...") Letters Modal */}
      <TimeCapsuleModal
        isOpen={isTimeCapsuleOpen}
        onClose={() => setIsTimeCapsuleOpen(false)}
        letters={timeCapsuleLetters}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        partner={partner}
        partnerName={config.partnerName}
        cryptoKey={cryptoKey}
        onSendLetter={handleSendTimeCapsuleLetter}
        onUnlockLetter={handleUnlockTimeCapsuleLetter}
      />

      {/* Daily Spark Double-Blind Question Modal */}
      <DailySparkModal
        isOpen={isDailySparkOpen}
        onClose={() => setIsDailySparkOpen(false)}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        partner={partner}
        partnerName={config.partnerName}
        cryptoKey={cryptoKey}
        dailySparkState={dailySparkState}
        onSubmitAnswer={handleSubmitDailySparkAnswer}
      />

      {/* Touch Pulse (Virtual Hand Holding) Modal */}
      <TouchPulseModal
        isOpen={isTouchPulseOpen}
        onClose={() => setIsTouchPulseOpen(false)}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        partner={partner}
        partnerName={config.partnerName}
        remoteTouch={remoteTouchPoint}
        onSendTouchUpdate={handleSendTouchUpdate}
        onSendTouchRelease={handleSendTouchRelease}
      />

      {/* Couple Bucket List & Scrapbook Modal */}
      <BucketListModal
        isOpen={isBucketListOpen}
        onClose={() => setIsBucketListOpen(false)}
        items={bucketListItems}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        partner={partner}
        partnerName={config.partnerName}
        onAddItem={handleAddBucketItem}
        onToggleItem={handleToggleBucketItem}
        onDeleteItem={handleDeleteBucketItem}
      />

      {/* 1. Sleep Sanctuary Modal */}
      <SleepSanctuaryModal
        isOpen={isSleepSanctuaryOpen}
        onClose={() => setIsSleepSanctuaryOpen(false)}
        state={sleepState}
        partner={partner}
        partnerName={config.partnerName}
        onUpdateState={(updates) => setSleepState((prev) => ({ ...prev, ...updates }))}
        onSendWakeupNudge={() => {
          handleSendMessage('🌅 Good morning my love! Rise and shine with a warm smile ✨', 'text');
          setIsSleepSanctuaryOpen(false);
        }}
      />

      {/* 2. Couple Games Lounge Modal */}
      <CoupleGamesModal
        isOpen={isGamesLoungeOpen}
        onClose={() => setIsGamesLoungeOpen(false)}
        initialTab={gamesLoungeTab}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        partner={partner}
        partnerName={config.partnerName}
        incomingGameData={incomingGameAction}
        onOpenChessModal={() => setIsChessModalOpen(true)}
        activeCallType={activeCallType}
        callStatus={callStatus}
        isMuted={isMuted}
        localStream={localStream}
        remoteStream={remoteStream}
        onStartCall={handleStartCall}
        onEndCall={handleEndCall}
        onToggleMute={handleToggleMute}
        onBroadcastGameAction={(gameType, actionData) => {
          if (config && socketRef.current) {
            socketRef.current.emit('game-action', {
              roomId: config.roomId,
              gameType,
              actionData,
            });
          }
        }}
      />

      {/* Live Chess Game Modal ⚔️ */}
      <ChessModal
        isOpen={isChessModalOpen}
        onClose={() => setIsChessModalOpen(false)}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        partner={partner}
        partnerName={config.partnerName}
        partnerAvatar={config.partnerAvatar}
        incomingGameData={incomingGameAction}
        activeCallType={activeCallType}
        callStatus={callStatus}
        isMuted={isMuted}
        isVideoEnabled={!isVideoOff}
        localStream={localStream}
        remoteStream={remoteStream}
        onStartCall={handleStartCall}
        onEndCall={handleEndCall}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onBroadcastGameAction={(gameType, actionData) => {
          if (config && socketRef.current) {
            socketRef.current.emit('game-action', {
              roomId: config.roomId,
              gameType,
              actionData,
            });
          }
        }}
      />

      {/* 3. Secret Polaroid Vault Modal */}
      <PolaroidVaultModal
        isOpen={isPolaroidVaultOpen}
        onClose={() => setIsPolaroidVaultOpen(false)}
        photos={polaroids}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        partner={partner}
        partnerName={config.partnerName}
        onAddPhoto={(photo) => {
          const updated = [photo, ...polaroids];
          setPolaroids(updated);
          localStorage.setItem('haven_polaroids', JSON.stringify(updated));
        }}
        onDeletePhoto={(photoId) => {
          const updated = polaroids.filter((p) => p.id !== photoId);
          setPolaroids(updated);
          localStorage.setItem('haven_polaroids', JSON.stringify(updated));
        }}
        onLikePhoto={(photoId) => {
          const updated = polaroids.map((p) =>
            p.id === photoId ? { ...p, heartsCount: (p.heartsCount || 0) + 1 } : p
          );
          setPolaroids(updated);
          localStorage.setItem('haven_polaroids', JSON.stringify(updated));
        }}
        onRevealPhoto={(photoId) => {
          const updated = polaroids.map((p) =>
            p.id === photoId ? { ...p, isRevealed: true } : p
          );
          setPolaroids(updated);
          localStorage.setItem('haven_polaroids', JSON.stringify(updated));
        }}
      />

      {/* 4. Partner Sky & Horizon Modal */}
      <LongDistanceHorizonModal
        isOpen={isHorizonOpen}
        onClose={() => setIsHorizonOpen(false)}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        partner={partner}
        partnerName={config.partnerName}
        partnerAvatar={partner?.avatar || config.partnerAvatar}
        myLocation={myLocation}
        partnerLocation={partnerLocation}
        onUpdateMyLocation={(loc) => {
          setMyLocation((prev) => {
            const next = { ...prev, ...loc, updatedAt: Date.now() };
            localStorage.setItem('haven_my_location', JSON.stringify(next));
            if (socketRef.current && config) {
              socketRef.current.emit('horizon-update-location', {
                roomId: config.roomId,
                location: next,
              });
            }
            return next;
          });
        }}
      />

      {/* 5. Care Tracker & Love Bank Modal */}
      <CareTrackerModal
        isOpen={isCareTrackerOpen}
        onClose={() => setIsCareTrackerOpen(false)}
        currentUserId={currentUserId}
        currentUserName={config.userName}
        partner={partner}
        partnerName={config.partnerName}
        coupons={coupons}
        streakDays={streakDays}
        onRedeemCoupon={(couponId) => {
          const updated = coupons.map((c) =>
            c.id === couponId ? { ...c, isRedeemed: true, redeemedAt: Date.now() } : c
          );
          setCoupons(updated);
          localStorage.setItem('haven_love_coupons', JSON.stringify(updated));
          handleSendMessage(`🎟️ Redeemed Love Coupon: "${coupons.find((c) => c.id === couponId)?.title}"! 💕`, 'text');
        }}
        onAddCoupon={(coupon) => {
          const updated = [coupon, ...coupons];
          setCoupons(updated);
          localStorage.setItem('haven_love_coupons', JSON.stringify(updated));
        }}
        onSendCarePrompt={(promptType) => {
          const careMessages: Record<string, string> = {
            water: '💧 Stay hydrated, my love! Take a big sip of fresh water right now 💕',
            hug: '🤗 Sending you a big, warm, cozy 30-second virtual hug!',
            stretch: '🧘‍♀️ Time for a quick stretch and deep breath break, honey!',
            meal: '🍲 Did you eat something delicious yet? Please take care of your body!',
            kiss: '💋 Sending a tender forehead kiss to brighten your moment ✨',
            sleep: '🌙 Time to relax and drift into sweet dreams together 😴',
            breathe: '🌸 Inhale peace... exhale tension. You are doing amazing!',
          };
          handleSendMessage(careMessages[promptType] || 'Thinking of you with love 💕', 'text');
          setStreakDays((prev) => prev + 1);
        }}
      />

      {/* Incoming Call Ringing Popup */}
      {incomingCallData && (
        <IncomingCallModal
          callType={incomingCallData.callType}
          callerName={incomingCallData.callerName}
          callerAvatar={incomingCallData.callerAvatar}
          isSquadCall={incomingCallData.isSquadCall || config.spaceType === 'friends'}
          groupName={config.groupName}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {/* Active Audio Call Screen */}
      {activeCallType === 'audio' && !isWatchTogetherOpen && !isChessModalOpen && !isGamesLoungeOpen && (
        <AudioCallModal
          roomId={config.roomId}
          partnerName={config.partnerName}
          partnerAvatar={config.partnerAvatar}
          callStatus={callStatus}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onUpgradeToVideo={() => {
            handleEndCall();
            setTimeout(() => handleStartCall('video'), 300);
          }}
          onEndCall={handleEndCall}
          onSendLoveBurst={handleSendLoveBurst}
          localStream={localStream}
          remoteStream={remoteStream}
          onReconnectCall={handleReconnectCall}
          isMinimized={isAudioCallMinimized}
          onToggleMinimize={() => setIsAudioCallMinimized((prev) => !prev)}
          onOpenGames={() => setIsGamesLoungeOpen(true)}
          isNoiseCancellationActive={isNoiseCancellationActive}
          onToggleNoiseCancellation={handleToggleNoiseCancellation}
          isEchoSuppressionActive={isEchoSuppressionActive}
          onToggleEchoSuppression={handleToggleEchoSuppression}
          partnerIsMuted={partnerIsMuted}
          isCloudRelayActive={isCloudRelayActive}
          getNetworkStats={() =>
            webrtcRef.current
              ? webrtcRef.current.getNetworkStats()
              : Promise.resolve({
                  rttMs: null,
                  packetLossPercent: 0,
                  jitterMs: null,
                  quality: 'measuring' as const,
                })
          }
        />
      )}

      {/* Active HD Video Call Screen with Picture-in-Picture (PiP) Floating Overlay */}
      {activeCallType === 'video' && (
        <VideoCallModal
          roomId={config.roomId}
          partnerName={config.partnerName}
          partnerAvatar={config.partnerAvatar}
          callStatus={callStatus}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onSwitchCamera={handleSwitchCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onEndCall={handleEndCall}
          onSendLoveBurst={handleSendLoveBurst}
          localStream={localStream}
          remoteStream={remoteStream}
          onReconnectCall={handleReconnectCall}
          isMinimized={isVideoCallMinimized || isWatchTogetherOpen || isChessModalOpen || isGamesLoungeOpen || isPolaroidVaultOpen}
          onToggleMinimize={() => setIsVideoCallMinimized((prev) => !prev)}
          isNoiseCancellationActive={isNoiseCancellationActive}
          onToggleNoiseCancellation={handleToggleNoiseCancellation}
          isEchoSuppressionActive={isEchoSuppressionActive}
          onToggleEchoSuppression={handleToggleEchoSuppression}
          partnerIsMuted={partnerIsMuted}
          partnerIsVideoOff={partnerIsVideoOff}
          isCloudRelayActive={isCloudRelayActive}
          getNetworkStats={() =>
            webrtcRef.current
              ? webrtcRef.current.getNetworkStats()
              : Promise.resolve({
                  rttMs: null,
                  packetLossPercent: 0,
                  jitterMs: null,
                  quality: 'measuring' as const,
                })
          }
        />
      )}

      {/* Active Multi-User Squad Call Screen (Up to 5 friends) */}
      {isSquadCallModalOpen && (
        <SquadCallModal
          roomId={config.roomId}
          groupName={config.groupName}
          groupEmoji={config.groupEmoji}
          callType={activeSquadCall?.callType || 'video'}
          localUser={{
            id: currentUserId,
            name: config.userName,
            avatar: config.userAvatar,
            statusMood: userMood,
          }}
          participants={activeSquadCall?.participants || []}
          localStream={squadLocalStream}
          remoteStreams={squadRemoteStreams}
          isMuted={isSquadMuted}
          isVideoOff={isSquadVideoOff}
          isScreenSharing={isSquadScreenSharing}
          speakingMap={squadSpeakingMap}
          onToggleMute={handleToggleSquadMute}
          onToggleVideo={handleToggleSquadVideo}
          onSwitchCamera={handleSwitchSquadCamera}
          onToggleScreenShare={handleToggleSquadScreenShare}
          onLeaveCall={handleLeaveSquadCall}
          onSendReaction={(emoji) => handleSendLoveBurst(emoji)}
          isNoiseCancellationActive={isNoiseCancellationActive}
          onToggleNoiseCancellation={handleToggleNoiseCancellation}
          isEchoSuppressionActive={isEchoSuppressionActive}
          onToggleEchoSuppression={handleToggleEchoSuppression}
          isMinimized={isSquadCallMinimized}
          onToggleMinimize={() => setIsSquadCallMinimized((prev) => !prev)}
        />
      )}

      {/* End-to-End Encryption Verification Modal */}
      <SecurityVerifyModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        roomId={config.roomId}
        fingerprint={securityFingerprint}
        isVerified={config.isVerified || false}
        onToggleVerified={(verified) => {
          const updated = { ...config, isVerified: verified };
          setConfig(updated);
          localStorage.setItem('haven_couple_config', JSON.stringify(updated));
        }}
        partnerName={config.partnerName}
      />

      {/* Space & Invite Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        config={config}
        roomMembers={roomMembers}
        onUpdateConfig={(updated) => {
          const newCfg = { ...config, ...updated };
          setConfig(newCfg);
          localStorage.setItem('haven_couple_config', JSON.stringify(newCfg));
          if (socketRef.current) {
            if (updated.userName || updated.userAvatar) {
              socketRef.current.emit('update-profile', {
                roomId: config.roomId,
                name: updated.userName,
                avatar: updated.userAvatar,
              });
            }
            if (updated.anniversaryDate) {
              socketRef.current.emit('update-anniversary', {
                roomId: config.roomId,
                anniversaryDate: updated.anniversaryDate,
              });
            }
          }
        }}
        onWipeHistory={handleWipeHistory}
        onLeaveSpace={handleLeaveSpace}
        onOpenSpacesManager={() => setIsSpacesManagerOpen(true)}
      />

      {/* Spaces Switcher & Multi-Space Registry Modal */}
      <SpacesManagerModal
        isOpen={isSpacesManagerOpen}
        onClose={() => setIsSpacesManagerOpen(false)}
        currentRoomId={config.roomId}
        onSwitchSpace={handleSwitchSpace}
        onOpenNewSpaceSetup={() => {
          setIsSpacesManagerOpen(false);
          // Set config to null so the user can easily create or join another space
          setConfig(null);
        }}
      />

      {/* Atmosphere Theme Picker Modal */}
      <ThemePickerModal
        isOpen={showThemePickerModal}
        onClose={() => setShowThemePickerModal(false)}
        currentThemeId={currentThemeId}
        onSelectTheme={handleSelectTheme}
        onOpenWallpaperPicker={() => setShowWallpaperPickerModal(true)}
      />

      {/* Haven Chat Wallpaper Picker Modal */}
      <WallpaperPickerModal
        isOpen={showWallpaperPickerModal}
        onClose={() => setShowWallpaperPickerModal(false)}
        settings={wallpaperSettings}
        onUpdateSettings={handleUpdateWallpaperSettings}
      />

      {/* Live Mood / Vibe Selector Modal */}
      <VibeSelectorModal
        isOpen={showVibeSelectorModal}
        onClose={() => setShowVibeSelectorModal(false)}
        currentMood={userMood}
        onSelectMood={handleUpdateMood}
      />

      {/* Synchronized Couple & Squad Music Lounge Modal */}
      <MusicLoungeModal
        isOpen={isMusicLoungeOpen}
        onClose={() => setIsMusicLoungeOpen(false)}
        syncMusicState={syncMusicState}
        onUpdateSyncState={handleUpdateMusicSync}
        currentUserName={config.userName}
        partnerName={config.partnerName}
        isPartnerOnline={isPartnerOnline}
        spaceType={config.spaceType}
        onOpenWatchTogether={() => setIsWatchTogetherOpen(true)}
      />

      {/* Live Squad & Couple Soundboard Modal */}
      <SoundboardModal
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
        onPlaySound={handleTriggerSoundboard}
        currentUserName={config.userName}
      />

      {/* All Space Features & Theme/Mode Hub Modal */}
      <SpaceFeaturesModal
        isOpen={isSpaceFeaturesOpen}
        onClose={() => setIsSpaceFeaturesOpen(false)}
        spaceType={config.spaceType}
        colorMode={colorMode}
        onToggleColorMode={handleToggleColorMode}
        currentThemeId={currentThemeId}
        onSelectTheme={handleSelectTheme}
        isMusicPlaying={syncMusicState.isPlaying}
        currentMusicTitle={syncMusicState.customTrack?.title || MUSIC_CATALOG.find((t) => t.id === syncMusicState.trackId)?.title}
        onToggleMusicPlayPause={() => handleUpdateMusicSync({ isPlaying: !syncMusicState.isPlaying })}
        onOpenMusicLounge={() => setIsMusicLoungeOpen(true)}
        onOpenSoundboard={() => setIsSoundboardOpen(true)}
        onOpenGamesLounge={() => setIsGamesLoungeOpen(true)}
        onOpenChess={() => setIsChessModalOpen(true)}
        onOpenWatchTogether={() => setIsWatchTogetherOpen(true)}
        onOpenCanvas={() => setIsCanvasOpen(true)}
        onOpenHorizon={() => setIsHorizonOpen(true)}
        onOpenPolaroidVault={() => setIsPolaroidVaultOpen(true)}
        onOpenTouchPulse={() => setIsTouchPulseOpen(true)}
        onOpenDailySpark={() => setIsDailySparkOpen(true)}
        onOpenCareTracker={() => setIsCareTrackerOpen(true)}
        onOpenSleepSanctuary={() => setIsSleepSanctuaryOpen(true)}
        onOpenTimeCapsule={() => setIsTimeCapsuleOpen(true)}
        onOpenBucketList={() => setIsBucketListOpen(true)}
        onOpenWallpaperPicker={() => setShowWallpaperPickerModal(true)}
        onOpenThemePicker={() => setShowThemePickerModal(true)}
        onOpenVibeSelector={() => setShowVibeSelectorModal(true)}
        onTriggerLoveBuzz={handleTriggerLoveBuzz}
        onOpenSinglesLounge={(config.spaceType as any) === 'single' ? () => setIsSinglesLoungeOpen(true) : undefined}
        onOpenStatus={() => setIsStatusModalOpen(true)}
        hasUnreadStatus={hasUnreadStatus}
        onOpenSecurity={() => setShowSecurityModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenActivityLog={() => setShowActivityLogModal(true)}
        onOpenQRPairing={() => setIsQRPairingOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      {/* Install Phone App & Standalone APK Modal */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Instant QR Code Pairing Modal */}
      <QRCodePairingModal
        isOpen={isQRPairingOpen}
        onClose={() => setIsQRPairingOpen(false)}
        currentSpaceConfig={config}
        onJoinFromQR={(newRoomId, newKey, newSpaceType, newName) => {
          if (!config) return;
          const updated: CoupleSpaceConfig = {
            ...config,
            roomId: newRoomId,
            passkey: newKey,
            spaceType: newSpaceType || config.spaceType,
            groupName: newName || config.groupName,
          };
          localStorage.setItem('haven_couple_config', JSON.stringify(updated));
          setConfig(updated);
          setIsQRPairingOpen(false);
        }}
      />

      {/* Haven Status Updates & Stories Modal (Haven-style 24h stories & commenting) */}
      {isStatusModalOpen && (
        <HavenStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => {
            setIsStatusModalOpen(false);
            setInitialViewStatusId(null);
          }}
          currentUser={{
            id: currentUserId,
            name: config.userName,
            avatar: config.userAvatar,
          }}
          statuses={statuses}
          onPostStatus={handlePostStatus}
          onDeleteStatus={handleDeleteStatus}
          onViewStatus={handleViewStatus}
          onAddComment={handleAddStatusComment}
          initialViewStatusId={initialViewStatusId}
          isDark={colorMode === 'dark'}
        />
      )}

      {/* Singles Lounge & Spark Hub Modal (Only accessible in explicit single space, never under friends or couple) */}
      {isSinglesLoungeOpen && (config.spaceType as any) === 'single' && (
        <SinglesLoungeModal
          isOpen={isSinglesLoungeOpen}
          onClose={() => setIsSinglesLoungeOpen(false)}
          currentUserId={currentUserId}
          currentUserName={config.userName}
          currentUserAvatar={config.userAvatar}
          onStartOneOnOneSpace={handleStartOneOnOneSpace}
        />
      )}

      {/* Activity & Security Audit Log Modal */}
      <ActivityLogModal
        isOpen={showActivityLogModal}
        onClose={() => setShowActivityLogModal(false)}
        isDark={colorMode === 'dark'}
      />

      {/* Standalone Audio & Video Call Diagnostics Modal */}
      <CallDiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        callType="video"
        roomId={config?.roomId}
        onAutoFixAndReconnect={async () => {
          unlockAudioContext();
          if (config?.roomId) {
            await fetchFreshIceServers(config.roomId, true);
          }
          if (webrtcRef.current) {
            await webrtcRef.current.restartIce();
          }
        }}
      />

      {/* Invite Spouse / Partner Modal */}
      {isInviteSpouseOpen && (
        <InviteSpouseModal
          isOpen={isInviteSpouseOpen}
          onClose={() => setIsInviteSpouseOpen(false)}
          roomId={config.roomId}
          passkey={config.passkey}
          spaceType={config.spaceType}
          spaceName={config.groupName || (config.spaceType === 'couple' ? `${config.userName} & ${config.partnerName}` : undefined)}
          senderName={config.userName}
          senderEmail={authUser?.email}
          existingPartnerName={config.partnerName}
          hasExistingPartner={config.spaceType === 'couple' && (Boolean(partner) || config.isVerified)}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthModalReason(undefined);
        }}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
        reasonMessage={authModalReason}
      />

      {/* Space Destination Chooser Modal */}
      <SpaceChooserModal
        isOpen={showSpaceChooser}
        onClose={() => setShowSpaceChooser(false)}
        authUser={authUser}
        onSelectDestination={handleSelectDestination}
      />

      {/* Partner Accepted Invitation Banner Notification */}
      {partnerAcceptedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] px-4 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="bg-emerald-600 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border-2 border-emerald-400">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 fill-white text-white animate-pulse" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm truncate">Partner Connected! 🎉</h4>
                <p className="text-xs text-emerald-100 truncate">
                  {partnerAcceptedToast.name} accepted your invitation! You are now chatting live.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPartnerAcceptedToast(null)}
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Offline Video & Voice Voicemail Greeting Modal */}
      {isVoicemailModalOpen && (
        <VoicemailModal
          isOpen={isVoicemailModalOpen}
          onClose={() => setIsVoicemailModalOpen(false)}
          roomId={config.roomId}
          currentUserId={currentUserId}
          currentUserName={config.userName}
          currentUserAvatar={config.userAvatar}
          partnerName={config.partnerName}
          partnerAvatar={config.partnerAvatar}
          voicemails={voicemails}
          onSendVoicemail={handleSendVoicemail}
          onMarkListened={handleMarkVoicemailListened}
          onDeleteVoicemail={handleDeleteVoicemail}
          onInitiateCall={(type) => handleStartCall(type)}
          initialMode={voicemailModalMode}
          missedCallType={missedVoicemailCallType}
        />
      )}

      {/* Live Incoming Partner Sanctuary Invitation Floating Banner */}
      {liveIncomingInviteToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[94%] px-2 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="bg-gradient-to-r from-rose-950 via-pink-950 to-slate-900 text-white p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-rose-500 shadow-rose-500/30">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6 fill-rose-500 text-rose-500 animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                  <span>Partner Invitation Received 💕</span>
                </div>
                <h4 className="font-bold text-sm text-white truncate">
                  {liveIncomingInviteToast.senderName} invited you to connect!
                </h4>
                <p className="text-xs text-rose-200/80 truncate">
                  Space: "{liveIncomingInviteToast.spaceName}"
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-toast-accept-invite"
                onClick={() => {
                  handleAcceptInvite(liveIncomingInviteToast);
                  setLiveIncomingInviteToast(null);
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold shadow-lg hover:opacity-95 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
                <span>Accept & Enter</span>
              </button>
              <button
                type="button"
                onClick={() => setLiveIncomingInviteToast(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}
