import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
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
} from './utils/sounds';
import { WebRTCManager } from './utils/webrtc';
import { SquadCallManager } from './utils/squadCallManager';
import { Music, Play, Pause } from 'lucide-react';
import { SetupSpaceModal } from './components/SetupSpaceModal';
import { TopBar } from './components/TopBar';
import { ChatArea } from './components/ChatArea';
import { AudioCallModal } from './components/AudioCallModal';
import { VideoCallModal } from './components/VideoCallModal';
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
import { MUSIC_CATALOG, musicEngine } from './utils/musicEngine';
import { getSavedTheme, saveTheme, THEME_PRESETS, ThemeConfig, ThemeId, ColorMode, getSavedColorMode, saveColorMode } from './utils/theme';
import { WallpaperSettings, getSavedWallpaperSettings, saveWallpaperSettings } from './utils/wallpaper';
import { detectRealDeviceLocation } from './utils/geolocation';

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
  const [showThemePickerModal, setShowThemePickerModal] = useState(false);
  const [showVibeSelectorModal, setShowVibeSelectorModal] = useState(false);
  const [isScreenRumbling, setIsScreenRumbling] = useState(false);

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

  // WhatsApp Chat Wallpaper state
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);

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

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const squadCallRef = useRef<SquadCallManager | null>(null);
  const cryptoKeyRef = useRef<CryptoKey | null>(null);
  cryptoKeyRef.current = cryptoKey;
  const lastActiveTimeRef = useRef<number>(Date.now());

  // Initialize Cryptographic Key when config changes
  useEffect(() => {
    if (!config) return;

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
      if (msg.type === 'text' || msg.type === 'call_log') {
        content = await decryptText(msg.ciphertext, msg.iv, key);
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
        isDecrypted: false,
        decryptionError: true,
        isDeleted: msg.isDeleted,
        deletedForEveryone: msg.deletedForEveryone,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
      };
    }
  }, []);

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
            signal,
          });
        }
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          setCallStatus('connected');
          stopRingtone();
          playCallConnected();
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          // Handle teardown
        }
      },
    });

    webrtcRef.current = rtc;
    return rtc;
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

    squadCallRef.current = mgr;
    return mgr;
  }, [config]);

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
        user: {
          id: currentUserId,
          name: config.userName,
          avatar: config.userAvatar,
          statusMood: userMood,
        },
        location: myLocation,
      });
    });

    // Space Joined & Initial History Sync
    socket.on('space-joined', async (data: { roomId: string; users: UserProfile[]; messages: EncryptedMessage[]; anniversaryDate?: string; locations?: Record<string, HorizonLocation>; activeCall?: ActiveSquadCallState | null }) => {
      if (data.users) {
        setRoomMembers(data.users);
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
      }
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

    // Message Deleted (WhatsApp-style: Delete for everyone / Delete for me)
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

    // Message Edited (WhatsApp-style: real-time decryption of edited text)
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
      if (!webrtcRef.current) return;
      const rtc = webrtcRef.current;
      const sig = data.signal as { type?: string; candidate?: string };

      if (sig.type === 'offer') {
        const answer = await rtc.handleOffer(sig as RTCSessionDescriptionInit);
        socket.emit('signal', {
          roomId: config.roomId,
          targetSocketId: data.senderSocketId,
          signal: answer,
        });
      } else if (sig.type === 'answer') {
        await rtc.handleAnswer(sig as RTCSessionDescriptionInit);
      } else if (sig.candidate || (sig as RTCIceCandidateInit).candidate) {
        await rtc.handleCandidate(sig as RTCIceCandidateInit);
      }
    });

    // Incoming Call Notification
    socket.on('incoming-call', (data: { callType: CallType; callerName: string; callerAvatar: string; callerSocketId: string; isSquadCall?: boolean; roomId?: string }) => {
      setIncomingCallData(data);
      startRingtone();
    });

    // Call Accepted by Partner
    socket.on('call-accepted', async (data: { callType: CallType; responderSocketId?: string }) => {
      stopRingtone();
      setCallStatus('connecting');
      if (webrtcRef.current) {
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
      setCallStatus('declined');
      setTimeout(() => {
        setCallStatus('idle');
        setActiveCallType(null);
      }, 2000);
    });

    // Call Ended
    socket.on('call-ended', () => {
      stopRingtone();
      playCallEnded();
      if (webrtcRef.current) {
        webrtcRef.current.cleanup();
      }
      setLocalStream(null);
      setRemoteStream(null);
      setCallStatus('idle');
      setActiveCallType(null);
      setIncomingCallData(null);
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

  // Persist Messages to Local Sanctuary Storage Always
  useEffect(() => {
    if (!config?.roomId || messages.length === 0) return;
    try {
      localStorage.setItem(`haven_messages_${config.roomId}`, JSON.stringify(messages));
      localStorage.setItem('haven_messages_history', JSON.stringify(messages));
    } catch (e) {
      console.warn('Could not cache messages to localStorage:', e);
    }
  }, [messages, config?.roomId]);

  // Load cached messages when room config changes
  useEffect(() => {
    if (!config?.roomId) return;
    try {
      const stored = localStorage.getItem(`haven_messages_${config.roomId}`) || localStorage.getItem('haven_messages_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages((prev) => {
            if (prev.length === 0) return parsed;
            const map = new Map<string, DecryptedMessage>();
            parsed.forEach((m) => map.set(m.id, m));
            prev.forEach((m) => map.set(m.id, m));
            return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      }
    } catch (e) {
      console.warn('Error reading cached room messages:', e);
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
    fileData?: { buffer: ArrayBuffer; mimeType: string; fileName?: string; duration?: number }
  ) => {
    if (!config || !cryptoKey || !socketRef.current) return;

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
        fileMetadata: encryptedPayload.fileMetadata,
        isDecrypted: true,
      };

      setMessages((prev) => [...prev, localDecrypted]);
      playMessageChime(true);

      // Emit to server
      socketRef.current.emit('encrypted-message', encryptedPayload);
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

  // WhatsApp-style Delete Message Handler
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

  // WhatsApp-style Edit Message Handler
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
      setIsSquadCallModalOpen(true);

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

    setActiveCallType(callType);
    setCallStatus('calling');
    startRingtone();

    const rtc = initWebRTC(callType);
    try {
      const stream = await rtc.initLocalMedia(callType);
      setLocalStream(stream);
      rtc.createPeerConnection();

      socketRef.current.emit('call-request', {
        roomId: config.roomId,
        callType,
        callerName: config.userName,
        callerAvatar: config.userAvatar,
      });
    } catch (err) {
      console.error('Error starting media call:', err);
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

    const callType = incomingCallData.callType;
    const isSquad = incomingCallData.isSquadCall || config.spaceType === 'friends';

    if (isSquad) {
      setIncomingCallData(null);
      await handleStartSquadCall(callType);
      return;
    }

    setActiveCallType(callType);
    setCallStatus('connecting');

    const rtc = initWebRTC(callType);
    try {
      const stream = await rtc.initLocalMedia(callType);
      setLocalStream(stream);
      rtc.createPeerConnection();

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
    if (incomingCallData && config && socketRef.current) {
      socketRef.current.emit('call-declined', {
        roomId: config.roomId,
        reason: reason || 'Busy',
      });
    }
    setIncomingCallData(null);
  };

  // End Active Call
  const handleEndCall = () => {
    stopRingtone();
    playCallEnded();
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
    setIsScreenSharing(false);
  };

  // Calling Media Controls
  const handleToggleMute = () => {
    if (webrtcRef.current) {
      const muted = webrtcRef.current.toggleMuteAudio();
      setIsMuted(muted);
    }
  };

  const handleToggleVideo = () => {
    if (webrtcRef.current) {
      const off = webrtcRef.current.toggleMuteVideo();
      setIsVideoOff(off);
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

  // Leave Space
  const handleLeaveSpace = () => {
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

  // If no space is configured yet, render Setup Modal & Singles Lounge
  if (!config) {
    return (
      <>
        <SetupSpaceModal
          initialError={spaceFullError}
          onOpenSingles={() => setIsSinglesLoungeOpen(true)}
          onComplete={(newConfig) => {
            setConfig(newConfig);
            setSpaceFullError(null);
          }}
        />
        {isSinglesLoungeOpen && (
          <SinglesLoungeModal
            isOpen={isSinglesLoungeOpen}
            onClose={() => setIsSinglesLoungeOpen(false)}
            currentUserId={currentUserId}
            currentUserName=""
            currentUserAvatar=""
            onStartOneOnOneSpace={handleStartOneOnOneSpace}
          />
        )}
      </>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-full ${colorMode === 'dark' ? 'bg-slate-950 text-slate-100 dark' : `${currentTheme.background} text-slate-900`} overflow-hidden font-sans transition-colors duration-500 ${isScreenRumbling ? 'animate-screen-rumble' : ''}`}>
      {/* Floating Love Reaction Overlay */}
      <LoveBurstOverlay
        bursts={loveBursts}
        onRemove={(id) => setLoveBursts((prev) => prev.filter((b) => b.id !== id))}
      />

      {/* Top Header Bar */}
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
        onOpenGamesLounge={() => setIsGamesLoungeOpen(true)}
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
        onOpenSinglesLounge={() => setIsSinglesLoungeOpen(true)}
      />

      {/* Main Encrypted Chat Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
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
        />
      </main>

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
        currentUserId={currentUserId}
        currentUserName={config.userName}
        currentUserAvatar={config.userAvatar}
        partner={partner}
        partnerName={config.partnerName}
        incomingGameData={incomingGameAction}
        onOpenChessModal={() => setIsChessModalOpen(true)}
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
      {activeCallType === 'audio' && !isWatchTogetherOpen && !isChessModalOpen && (
        <AudioCallModal
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
        />
      )}

      {/* Active HD Video Call Screen */}
      {activeCallType === 'video' && !isWatchTogetherOpen && !isChessModalOpen && (
        <VideoCallModal
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
      />

      {/* Atmosphere Theme Picker Modal */}
      <ThemePickerModal
        isOpen={showThemePickerModal}
        onClose={() => setShowThemePickerModal(false)}
        currentThemeId={currentThemeId}
        onSelectTheme={handleSelectTheme}
        onOpenWallpaperPicker={() => setShowWallpaperPickerModal(true)}
      />

      {/* WhatsApp Chat Wallpaper Picker Modal */}
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
        onOpenSinglesLounge={() => setIsSinglesLoungeOpen(true)}
      />

      {/* Singles Lounge & Spark Hub Modal */}
      {isSinglesLoungeOpen && (
        <SinglesLoungeModal
          isOpen={isSinglesLoungeOpen}
          onClose={() => setIsSinglesLoungeOpen(false)}
          currentUserId={currentUserId}
          currentUserName={config.userName}
          currentUserAvatar={config.userAvatar}
          onStartOneOnOneSpace={handleStartOneOnOneSpace}
        />
      )}
    </div>
  );
}
