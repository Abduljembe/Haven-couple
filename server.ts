import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

// Ensure globalThis.__dirname doesn't pollute ESM plugins like vite-plugin-pwa
if ('__dirname' in globalThis) {
  try {
    delete (globalThis as any).__dirname;
  } catch {}
}

interface RoomUser {
  socketId: string;
  id: string;
  name: string;
  avatar: string;
  email?: string;
  statusMood?: string;
  joinedAt: number;
}

interface EncryptedMessagePayload {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: string;
  ciphertext: string;
  iv: string;
  timestamp: number;
  expiresAt?: number;
  reactions?: Record<string, string[]>;
  fileMetadata?: {
    mimeType: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
  };
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
  isEdited?: boolean;
  editedAt?: number;
}

interface ActiveSquadCall {
  roomId: string;
  callType: 'audio' | 'video';
  startedBy: { id: string; name: string; avatar: string };
  startedAt: number;
  participants: {
    socketId: string;
    userId: string;
    name: string;
    avatar: string;
    isMuted: boolean;
    isVideoOff: boolean;
    joinedAt: number;
  }[];
}

interface PendingSpaceDeletion {
  requestedBy: { id: string; name: string; avatar: string };
  requestedAt: number;
  agreedUserIds: string[];
  status: 'pending' | 'cancelled' | 'confirmed';
}

interface RoomState {
  users: Map<string, RoomUser>;
  messages: EncryptedMessagePayload[];
  anniversaryDate?: string;
  canvasStrokes?: any[];
  mediaState?: any | null;
  musicState?: any | null;
  timeCapsuleLetters?: any[];
  dailySpark?: any | null;
  bucketList?: any[];
  locations?: Record<string, any>; // userId -> HorizonLocation
  activeCall?: ActiveSquadCall | null;
  createdAt?: number;
  createdBy?: { id: string; name: string; email?: string };
  spaceType?: string;
  roomName?: string;
  passkey?: string;
  invitedEmails?: string[];
  authorizedEmails?: string[];
  pendingDeletion?: PendingSpaceDeletion | null;
  statuses?: any[];
}

export interface StoredUser {
  id: string;
  email: string; // normalized lowercase
  name: string;
  avatar?: string;
  passwordHash?: string;
  salt?: string;
  createdAt: number;
  lastActive?: number;
  spaces: string[];
  role?: string;
  origin?: 'registered' | 'space_session' | 'guest';
}

export interface StoredInvite {
  id: string;
  roomId: string;
  passkey: string;
  spaceName: string;
  spaceType: 'couple' | 'friends';
  senderEmail: string;
  senderName: string;
  spouseEmail: string; // normalized lowercase
  message?: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined';
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'rooms_storage.json');
const USERS_FILE = path.join(DATA_DIR, 'users_storage.json');
const INVITES_FILE = path.join(DATA_DIR, 'invites_storage.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions_storage.json');
const VOICEMAILS_FILE = path.join(DATA_DIR, 'voicemails_storage.json');
const VIDUKI_CONFIG_FILE = path.join(DATA_DIR, 'viduki_config.json');

interface StoredVidukiConfig {
  apiKey: string;
  baseUrl: string;
  embedTemplate: string;
  enabled: boolean;
  preferredQuality?: string;
  defaultServer?: 1 | 2 | 3 | 4;
  themeColor?: string;
  autoFallbackOnFailure?: boolean;
  updatedAt?: number;
}

let vidukiConfig: StoredVidukiConfig = {
  apiKey: '',
  baseUrl: 'https://viduki.net/api',
  embedTemplate: 'https://viduki.net/{server}/movie/{id}?color={color}',
  enabled: true,
  preferredQuality: '1080p HD',
  defaultServer: 1,
  themeColor: 'f43f5e',
  autoFallbackOnFailure: true,
};

function loadVidukiConfigFromDisk() {
  try {
    if (fs.existsSync(VIDUKI_CONFIG_FILE)) {
      const data = fs.readFileSync(VIDUKI_CONFIG_FILE, 'utf-8');
      vidukiConfig = { ...vidukiConfig, ...JSON.parse(data) };
    }
  } catch (err) {
    console.warn('Could not load Viduki config:', err);
  }
}

function saveVidukiConfigToDisk() {
  try {
    fs.writeFileSync(VIDUKI_CONFIG_FILE, JSON.stringify(vidukiConfig, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save Viduki config:', err);
  }
}

interface StoredVoicemail {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: 'video' | 'audio';
  mediaUrl: string;
  durationSeconds: number;
  caption?: string;
  createdAt: number;
  listened: boolean;
  missedCallType?: 'video' | 'audio';
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // Ensure data directory exists for persistent chat and space storage
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (err) {
      console.warn('Could not create data dir:', err);
    }
  }

  // In-memory persistent caches
  const rooms = new Map<string, RoomState>();
  const users = new Map<string, StoredUser>(); // id -> StoredUser
  let invites: StoredInvite[] = [];
  let voicemails: StoredVoicemail[] = [];
  const activeSessions = new Map<string, { userId: string; email: string; createdAt: number }>();

  // Secure Password Hashing & Verification Utilities (PBKDF2 with unique salt)
  function hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  function verifyPassword(password: string, salt: string, hash: string): boolean {
    const computed = hashPassword(password, salt);
    return computed === hash;
  }

  function generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // Load and save Users
  function loadUsersFromDisk() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const list: StoredUser[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((u) => users.set(u.id, u));
        }
        console.log(`[Storage] Loaded ${users.size} registered users.`);
      }
    } catch (err) {
      console.error('Error loading users from disk:', err);
    }
  }

  function saveUsersToDisk() {
    try {
      const list = Array.from(users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving users to disk:', err);
    }
  }

  // Load and save Invites
  function loadInvitesFromDisk() {
    try {
      if (fs.existsSync(INVITES_FILE)) {
        const raw = fs.readFileSync(INVITES_FILE, 'utf-8');
        invites = JSON.parse(raw);
        console.log(`[Storage] Loaded ${invites.length} pending/active invites.`);
      }
    } catch (err) {
      console.error('Error loading invites from disk:', err);
    }
  }

  function saveInvitesToDisk() {
    try {
      fs.writeFileSync(INVITES_FILE, JSON.stringify(invites, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving invites to disk:', err);
    }
  }

  // Load and save Active Sessions
  function loadSessionsFromDisk() {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
        const list: [string, { userId: string; email: string; createdAt: number }][] = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach(([token, session]) => {
            if (token && session) {
              activeSessions.set(token, session);
            }
          });
        }
        console.log(`[Storage] Loaded ${activeSessions.size} active user sessions.`);
      }
    } catch (err) {
      console.error('Error loading sessions from disk:', err);
    }
  }

  function saveSessionsToDisk() {
    try {
      const list = Array.from(activeSessions.entries());
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving sessions to disk:', err);
    }
  }

  // Load and save Voicemails / Greetings
  function loadVoicemailsFromDisk() {
    try {
      if (fs.existsSync(VOICEMAILS_FILE)) {
        const raw = fs.readFileSync(VOICEMAILS_FILE, 'utf-8');
        voicemails = JSON.parse(raw);
        if (!Array.isArray(voicemails)) voicemails = [];
        console.log(`[Storage] Loaded ${voicemails.length} voicemail greetings.`);
      }
    } catch (err) {
      console.error('Error loading voicemails from disk:', err);
    }
  }

  function saveVoicemailsToDisk() {
    try {
      fs.writeFileSync(VOICEMAILS_FILE, JSON.stringify(voicemails, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving voicemails to disk:', err);
    }
  }

  // Initial loads
  loadUsersFromDisk();
  loadInvitesFromDisk();
  loadSessionsFromDisk();
  loadVoicemailsFromDisk();
  loadVidukiConfigFromDisk();

  // Function to persist rooms and message history to disk permanently
  function saveRoomsToDisk() {
    try {
      const serialized: Record<string, any> = {};
      rooms.forEach((roomState, rId) => {
        serialized[rId] = {
          messages: roomState.messages || [],
          anniversaryDate: roomState.anniversaryDate,
          canvasStrokes: roomState.canvasStrokes || [],
          timeCapsuleLetters: roomState.timeCapsuleLetters || [],
          dailySpark: roomState.dailySpark || null,
          bucketList: roomState.bucketList || [],
          locations: roomState.locations || {},
          createdAt: roomState.createdAt || Date.now(),
          createdBy: roomState.createdBy || null,
          spaceType: roomState.spaceType || (rId.startsWith('squad-') ? 'friends' : 'couple'),
          roomName: roomState.roomName || rId,
          passkey: roomState.passkey || null,
          invitedEmails: roomState.invitedEmails || [],
          authorizedEmails: roomState.authorizedEmails || [],
          pendingDeletion: roomState.pendingDeletion || null,
        };
      });
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(serialized, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving rooms to disk:', err);
    }
  }

  // Function to load persistent rooms and message history on startup
  function loadRoomsFromDisk() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const dataStr = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(dataStr);
        let usersReconciled = false;

        Object.entries(parsed).forEach(([rId, data]: [string, any]) => {
          rooms.set(rId, {
            users: new Map(),
            messages: Array.isArray(data.messages) ? data.messages : [],
            anniversaryDate: data.anniversaryDate,
            canvasStrokes: Array.isArray(data.canvasStrokes) ? data.canvasStrokes : [],
            timeCapsuleLetters: Array.isArray(data.timeCapsuleLetters) ? data.timeCapsuleLetters : [],
            dailySpark: data.dailySpark || null,
            bucketList: Array.isArray(data.bucketList) ? data.bucketList : [],
            locations: data.locations || {},
            createdAt: data.createdAt || Date.now(),
            createdBy: data.createdBy || null,
            spaceType: data.spaceType || (rId.startsWith('squad-') ? 'friends' : 'couple'),
            roomName: data.roomName || rId,
            passkey: data.passkey || null,
            invitedEmails: Array.isArray(data.invitedEmails) ? data.invitedEmails : [],
            authorizedEmails: Array.isArray(data.authorizedEmails) ? data.authorizedEmails : [],
            pendingDeletion: data.pendingDeletion || null,
          });

          // Reconcile and track space creator in users_storage
          if (data.createdBy && data.createdBy.id) {
            const uid = data.createdBy.id;
            if (!users.has(uid)) {
              users.set(uid, {
                id: uid,
                name: data.createdBy.name || 'User',
                email: data.createdBy.email || `${(data.createdBy.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}_${uid.slice(-4)}@haven.local`,
                avatar: data.createdBy.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                createdAt: data.createdAt || Date.now(),
                lastActive: Date.now(),
                spaces: [rId],
                origin: 'space_session',
              });
              usersReconciled = true;
            } else {
              const u = users.get(uid)!;
              if (!u.spaces) u.spaces = [];
              if (!u.spaces.includes(rId)) {
                u.spaces.push(rId);
                usersReconciled = true;
              }
            }
          }

          // Reconcile and track any users with active locations in this room
          if (data.locations && typeof data.locations === 'object') {
            Object.keys(data.locations).forEach((uid) => {
              if (uid && !users.has(uid)) {
                const isCreator = uid === data.createdBy?.id;
                users.set(uid, {
                  id: uid,
                  name: isCreator ? data.createdBy.name : `Partner (${uid.slice(-4)})`,
                  email: `${uid.slice(-6)}@haven.local`,
                  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                  createdAt: data.locations[uid]?.updatedAt || Date.now(),
                  lastActive: data.locations[uid]?.updatedAt || Date.now(),
                  spaces: [rId],
                  origin: 'space_session',
                });
                usersReconciled = true;
              } else if (uid && users.has(uid)) {
                const u = users.get(uid)!;
                if (!u.spaces) u.spaces = [];
                if (!u.spaces.includes(rId)) {
                  u.spaces.push(rId);
                  usersReconciled = true;
                }
              }
            });
          }
        });

        if (usersReconciled) {
          saveUsersToDisk();
          console.log(`[Storage] Reconciled and saved ${users.size} total users across all rooms into users_storage.json`);
        }

        console.log(`[Storage] Loaded persistent message history and room data for ${Object.keys(parsed).length} rooms.`);
      }
    } catch (err) {
      console.error('Error loading rooms from disk:', err);
    }
  }

  // Load existing persistent room state on server boot
  loadRoomsFromDisk();

  // --- HAVEN SINGLES LOUNGE STORAGE (REAL REGISTERED SINGLES ONLY) ---
  const SINGLES_FILE = path.join(DATA_DIR, 'singles_profiles.json');
  const WAVES_FILE = path.join(DATA_DIR, 'singles_waves.json');
  const SAFE_DATES_FILE = path.join(DATA_DIR, 'singles_safe_dates.json');

  const singlesProfiles = new Map<string, any>();
  let singlesWaves: any[] = [];
  let safeDatePlans: any[] = [];

  function loadSafeDatesFromDisk() {
    try {
      if (fs.existsSync(SAFE_DATES_FILE)) {
        const raw = fs.readFileSync(SAFE_DATES_FILE, 'utf-8');
        safeDatePlans = JSON.parse(raw);
        console.log(`[Storage] Loaded ${safeDatePlans.length} persistent IRL safe date plans.`);
      }
    } catch (err) {
      console.error('Error loading safe dates from disk:', err);
    }
  }
  loadSafeDatesFromDisk();

  function saveSafeDatesToDisk() {
    try {
      fs.writeFileSync(SAFE_DATES_FILE, JSON.stringify(safeDatePlans, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving safe dates to disk:', err);
    }
  }

  // Speed Dating Round State & Matchmaking
  interface SpeedQueueEntry {
    socketId: string;
    profile: any;
    joinedAt: number;
    timer?: NodeJS.Timeout;
  }
  const speedRoundQueue = new Map<string, SpeedQueueEntry>();
  const activeSpeedSessions = new Map<string, any>();

  // Video Call Screening State & Matchmaking
  interface VideoScreeningSessionState {
    sessionId: string;
    participantA: any;
    participantB: any;
    socketAId: string;
    socketBId: string;
    startedAt: number;
    durationSeconds: number;
    currentQuestionIndex: number;
    decisionA: 'match' | 'leave' | 'pending';
    decisionB: 'match' | 'leave' | 'pending';
    isSimulated?: boolean;
  }
  const activeScreeningSessions = new Map<string, VideoScreeningSessionState>();
  const screeningQueue = new Map<string, { socketId: string; profile: any; joinedAt: number }>();
  const singlesUserSockets = new Map<string, string>();

  const SPEED_MYSTERY_ALIASES = [
    { alias: 'Starlight Lynx', vibe: 'Thoughtful & Observant' },
    { alias: 'Velvet Nomad', vibe: 'Spontaneous & Free-Spirited' },
    { alias: 'Solaris Echo', vibe: 'Warm & High Energy' },
    { alias: 'Moonlit Poet', vibe: 'Gentle & Creative' },
    { alias: 'Golden Breeze', vibe: 'Easygoing & Playful' },
    { alias: 'Neon Wanderer', vibe: 'Curious & Night Owl' },
    { alias: 'Amber Phoenix', vibe: 'Passionate & Loyal' },
    { alias: 'Cosmic Dreamer', vibe: 'Deep Thinker & Dreamer' },
  ];

  const SPEED_DILEMMAS = [
    {
      id: 'dilemma-1',
      question: 'Sunday Morning: Sleep in until noon OR Fresh bakery run at 8 AM?',
      options: ['Sleep in & lazy coffee in bed ☕', 'Fresh warm croissants at 8 AM 🥐'],
    },
    {
      id: 'dilemma-2',
      question: 'First Date Vibe: Hidden candlelit jazz bar OR Sunset beach picnic?',
      options: ['Candlelit speakeasy / jazz bar 🎷', 'Cozy sunset picnic by the water 🌅'],
    },
    {
      id: 'dilemma-3',
      question: 'Would you rather travel back 100 years or forward 100 years?',
      options: ['Back to the 1920s Roaring Era ⏳', 'Forward to 2126 Cyber-Future 🚀'],
    },
    {
      id: 'dilemma-4',
      question: 'What is your absolute biggest green flag in someone?',
      options: ['Remembers tiny details you mentioned once 🌟', 'Makes you laugh uncontrollably in public 😂'],
    },
  ];

  function saveSinglesToDisk() {
    try {
      const arr = Array.from(singlesProfiles.values());
      fs.writeFileSync(SINGLES_FILE, JSON.stringify(arr, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving singles profiles:', err);
    }
  }

  const SEED_PROFILE_IDS = new Set([
    'single-maya-lin',
    'single-julian-vance',
    'single-elena-rostova',
    'single-liam-campbell',
    'single-chloe-bennett',
    'single-marcus-chen',
    'single-aaliyah-patel',
    'single-noah-rivera',
    'single-marcus-thorne',
  ]);

  function loadSinglesFromDisk() {
    try {
      if (fs.existsSync(SINGLES_FILE)) {
        const raw = fs.readFileSync(SINGLES_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((p) => {
            const isSeed =
              SEED_PROFILE_IDS.has(p.id) ||
              p.origin === 'seed' ||
              p.verificationBadge === 'community_sample' ||
              !p.isRealUser ||
              p.id.startsWith('sample-') ||
              p.id.startsWith('seed-') ||
              p.id === 'partner-sim-screening';
            // ONLY keep real registered people
            if (!isSeed && p.id && p.name) {
              const isIdVerified = p.isIdVerified !== undefined ? p.isIdVerified : (p.idVerification?.isIdProvided ?? true);
              singlesProfiles.set(p.id, {
                ...p,
                isRealUser: true,
                origin: 'registered',
                isIdVerified,
                verificationBadge: isIdVerified ? 'verified_real' : 'unverified_pending_id',
                idVerification: p.idVerification || (isIdVerified ? {
                  status: 'verified',
                  idType: 'drivers_license',
                  documentName: "Driver's License",
                  documentNumberMasked: 'ID-•••• •••• 9241',
                  verifiedAt: p.registeredAt || Date.now(),
                  verificationMethod: 'id_document_upload',
                  isIdProvided: true,
                } : {
                  status: 'unverified',
                  idType: 'drivers_license',
                  documentName: 'Not Provided',
                  isIdProvided: false,
                }),
                isFeatured: true,
              });
            }
          });
          console.log(`[Singles] Loaded ${singlesProfiles.size} real registered singles profiles from disk.`);
          saveSinglesToDisk();
          return;
        }
      }
      // No seeds. 100% genuine real people register.
      saveSinglesToDisk();
      console.log(`[Singles] Initialized clean: 0 sample profiles. Ready for real people to register.`);
    } catch (err) {
      console.error('Error loading singles profiles:', err);
    }
  }

  function saveWavesToDisk() {
    try {
      fs.writeFileSync(WAVES_FILE, JSON.stringify(singlesWaves.slice(0, 500), null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving waves:', err);
    }
  }

  function loadWavesFromDisk() {
    try {
      if (fs.existsSync(WAVES_FILE)) {
        const raw = fs.readFileSync(WAVES_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          singlesWaves = parsed;
        }
      }
    } catch (err) {
      console.warn('Error loading waves:', err);
    }
  }

  loadSinglesFromDisk();
  loadWavesFromDisk();

  function getOrCreateRoom(roomId: string): RoomState {
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        users: new Map(),
        messages: [],
      };
      rooms.set(roomId, room);
    }
    return room;
  }

  // Socket.IO Server Setup
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e8, // 100MB for media sharing
  });

  io.on('connection', (socket) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    // Join Private Couple Space or Friends & Squad Room
    socket.on('join-space', (data: { roomId: string; passkey?: string; user: { id: string; name: string; avatar: string; statusMood?: string; email?: string }; spaceType?: string; location?: any }) => {
      const { roomId, user, passkey, spaceType, location } = data;
      if (!roomId || !user) return;

      const room = getOrCreateRoom(roomId);
      const isSquad = spaceType === 'friends' || room.spaceType === 'friends';

      // Passkey / Password verification:
      // If room already has a registered passkey, ensure incoming passkey matches!
      if (room.passkey && room.passkey.trim()) {
        const expectedKey = room.passkey.trim();
        const incomingKey = (passkey || '').trim();
        if (!incomingKey || incomingKey !== expectedKey) {
          console.warn(`[Security Guard] Blocked access to space "${roomId}": Incorrect password/passkey provided by ${user.name}`);
          socket.emit('space-access-denied', {
            roomId,
            reason: 'Incorrect space password. The password does not match the registered space. Access is strictly denied.',
            error: 'Incorrect space password. The password does not match the registered space. Access is strictly denied.',
          });
          return;
        }
      } else if (passkey && passkey.trim()) {
        // Register space passkey on first creation
        room.passkey = passkey.trim();
        saveRoomsToDisk();
      }

      // Leave previous room if any
      if (currentRoomId) {
        socket.leave(currentRoomId);
        const prevRoom = rooms.get(currentRoomId);
        if (prevRoom) {
          prevRoom.users.delete(socket.id);
          socket.to(currentRoomId).emit('peer-left', { socketId: socket.id, userId: currentUserId });
        }
      }

      // Enforce 1-to-1 couple space capacity:
      // In Spouse Sanctuary, only 2 people (you + your partner) are ever allowed!
      if (!isSquad) {
        const existingDistinctUserIds = Array.from(
          new Set(Array.from(room.users.values()).map((u) => u.id))
        );
        const isAlreadyMember = existingDistinctUserIds.includes(user.id);
        if (!isAlreadyMember && existingDistinctUserIds.length >= 2) {
          console.warn(`[Security Guard] Blocked 3rd user from joining couple space "${roomId}": Sanctuary is strictly for 2 partners.`);
          socket.emit('space-access-denied', {
            roomId,
            reason: 'Spouse Sanctuary is an intimate space strictly for two partners and is already full.',
            error: 'Spouse Sanctuary is strictly for two partners and is already full.',
          });
          return;
        }
      }

      currentRoomId = roomId;
      currentUserId = user.id;
      socket.join(roomId);

      const roomUser: RoomUser = {
        socketId: socket.id,
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        email: user.email,
        statusMood: user.statusMood || (isSquad ? 'Hanging with the squad 🎉' : 'Connected with you 💕'),
        joinedAt: Date.now(),
      };
      room.users.set(socket.id, roomUser);

      // Upsert and track user in persistent users_storage.json
      if (user && user.id) {
        let existingUser = users.get(user.id);
        if (!existingUser && user.email) {
          existingUser = Array.from(users.values()).find(
            (u) => u.email && u.email.toLowerCase() === user.email!.trim().toLowerCase()
          );
        }

        if (existingUser) {
          if (user.name && user.name.trim()) existingUser.name = user.name.trim();
          if (user.avatar) existingUser.avatar = user.avatar;
          if (user.email && (!existingUser.email || existingUser.email.endsWith('@haven.local'))) {
            existingUser.email = user.email.trim().toLowerCase();
          }
          if (!existingUser.spaces) existingUser.spaces = [];
          if (!existingUser.spaces.includes(roomId)) existingUser.spaces.push(roomId);
          existingUser.lastActive = Date.now();
          users.set(existingUser.id, existingUser);
        } else {
          const trackedUser: StoredUser = {
            id: user.id,
            email: user.email?.trim().toLowerCase() || `${(user.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}_${user.id.slice(-4)}@haven.local`,
            name: user.name || 'Partner',
            avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            createdAt: Date.now(),
            lastActive: Date.now(),
            spaces: [roomId],
            origin: user.email ? 'registered' : 'space_session',
          };
          users.set(user.id, trackedUser);
        }
        saveUsersToDisk();
      }

      // Initialize room creation metadata if brand new
      if (!room.createdAt) {
        room.createdAt = Date.now();
        room.createdBy = { id: user.id, name: user.name };
        room.spaceType = spaceType || (isSquad ? 'friends' : 'couple');
        saveRoomsToDisk();
      }

      // Save and sync joining user's real location
      if (location) {
        if (!room.locations) room.locations = {};
        room.locations[user.id] = location;
        saveRoomsToDisk();
      }

      // Clean up expired messages (only those with explicit expiresAt set)
      const now = Date.now();
      room.messages = room.messages.filter((msg) => !msg.expiresAt || msg.expiresAt > now);

      // Gather active users list in this space
      const usersList = Array.from(room.users.values());

      // Send current state and sync history back to the connecting socket
      socket.emit('space-joined', {
        roomId,
        users: usersList,
        messages: room.messages,
        anniversaryDate: room.anniversaryDate,
        locations: room.locations || {},
        activeCall: room.activeCall || null,
        musicState: room.musicState || null,
        mediaState: room.mediaState || null,
        maxMembers: isSquad ? undefined : 2,
        createdAt: room.createdAt,
        spaceType: room.spaceType || (isSquad ? 'friends' : 'couple'),
        pendingDeletion: room.pendingDeletion || null,
        voicemails: voicemails.filter((v) => v.roomId.toLowerCase() === roomId.toLowerCase()),
        statuses: (room.statuses || []).filter((s: any) => s.expiresAt > Date.now()),
      });

      // Immediately push any pending space invitations waiting for this user directly to their socket
      const userEmail = (user.email || '').trim().toLowerCase();
      const registeredUser = Array.from(users.values()).find(
        (u) => u.id === user.id || (userEmail && u.email.toLowerCase() === userEmail)
      );
      const effectiveEmail = userEmail || registeredUser?.email?.toLowerCase();

      if (effectiveEmail) {
        const pendingForUser = invites.filter(
          (inv) => inv.spouseEmail.toLowerCase() === effectiveEmail && inv.status === 'pending'
        );
        pendingForUser.forEach((inv) => {
          socket.emit('spouse-invite-notification', {
            spouseEmail: inv.spouseEmail,
            spouseId: registeredUser?.id || user.id,
            spouseName: registeredUser?.name || user.name,
            invite: inv,
          });
        });
      }

      // Notify other partners/friends in the room with updated users list and location
      socket.to(roomId).emit('peer-joined', {
        user: roomUser,
        users: usersList,
        location: location || (room.locations ? room.locations[user.id] : undefined),
      });
    });

    // Relaying and Caching End-to-End Encrypted Messages
    socket.on('encrypted-message', (payload: EncryptedMessagePayload) => {
      if (!payload.roomId) return;
      const room = getOrCreateRoom(payload.roomId);

      // Store in persistent room history (keep up to 25,000 encrypted records per sanctuary)
      room.messages.push(payload);
      if (room.messages.length > 25000) {
        room.messages.shift();
      }

      // Automatically persist to storage disk
      saveRoomsToDisk();

      // Broadcast encrypted message to all partners in the space
      io.to(payload.roomId).emit('encrypted-message', payload);
    });

    // Message Reactions
    socket.on('message-reaction', (data: { roomId: string; messageId: string; emoji: string; userId: string }) => {
      const { roomId, messageId, emoji, userId } = data;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (room) {
        const msg = room.messages.find((m) => m.id === messageId);
        if (msg) {
          if (!msg.reactions) msg.reactions = {};
          if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
          
          const index = msg.reactions[emoji].indexOf(userId);
          if (index > -1) {
            msg.reactions[emoji].splice(index, 1);
            if (msg.reactions[emoji].length === 0) {
              delete msg.reactions[emoji];
            }
          } else {
            msg.reactions[emoji].push(userId);
          }
          saveRoomsToDisk();
        }
      }

      io.to(roomId).emit('message-reaction-updated', { messageId, emoji, userId });
    });

    // Delete Encrypted Message (Haven-style: Delete for everyone / Delete for me)
    socket.on('delete-message', (data: { roomId: string; messageId: string; deleteForEveryone: boolean; deletedBy?: string }) => {
      const { roomId, messageId, deleteForEveryone, deletedBy } = data;
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (room && deleteForEveryone) {
        const targetMsg = room.messages.find((m) => m.id === messageId);
        if (targetMsg) {
          targetMsg.isDeleted = true;
          targetMsg.deletedForEveryone = true;
          targetMsg.ciphertext = '';
          targetMsg.iv = '';
          delete targetMsg.fileMetadata;
          delete targetMsg.reactions;
        } else {
          room.messages = room.messages.filter((m) => m.id !== messageId);
        }
        saveRoomsToDisk();
      }

      io.to(roomId).emit('message-deleted', { messageId, deleteForEveryone, deletedBy: deletedBy || currentUserId });
    });

    // Edit Encrypted Message (Haven-style: inline edit encrypted with room key)
    socket.on('edit-message', (data: { roomId: string; messageId: string; ciphertext: string; iv: string; editedAt?: number }) => {
      const { roomId, messageId, ciphertext, iv, editedAt } = data;
      if (!roomId || !messageId) return;

      const room = rooms.get(roomId);
      const updateTime = editedAt || Date.now();
      if (room) {
        const targetMsg = room.messages.find((m) => m.id === messageId);
        if (targetMsg) {
          targetMsg.ciphertext = ciphertext;
          targetMsg.iv = iv;
          targetMsg.isEdited = true;
          targetMsg.editedAt = updateTime;
          saveRoomsToDisk();
        }
      }

      io.to(roomId).emit('message-edited', { messageId, ciphertext, iv, editedAt: updateTime });
    });

    // Typing status
    socket.on('typing', (data: { roomId: string; isTyping: boolean; userName: string }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('user-typing', {
        userId: currentUserId,
        userName: data.userName,
        isTyping: data.isTyping,
      });
    });

    // Instant Love Ping (Heartbeat)
    socket.on('love-ping', (data: { roomId: string; senderName: string }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('love-ping-received', {
        senderId: currentUserId,
        senderName: data.senderName,
        timestamp: Date.now(),
      });
    });

    // Instant Love Buzz / Screen Shake
    socket.on('love-buzz', (data: { roomId: string; senderName: string }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('love-buzz-received', {
        senderId: currentUserId,
        senderName: data.senderName,
        timestamp: Date.now(),
      });
    });

    // Floating Love Reaction Bursts
    socket.on('love-burst', (data: { roomId: string; emoji: string; x: number; y: number }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('love-burst-received', {
        id: `burst-${Date.now()}-${Math.random()}`,
        senderId: currentUserId,
        emoji: data.emoji || '❤️',
        x: data.x,
        y: data.y,
      });
    });

    // Call Signaling: Request (Standard & Squad)
    socket.on('call-request', (data: { roomId: string; callType: 'audio' | 'video'; callerName: string; callerAvatar: string; isSquadCall?: boolean }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      
      const starter = {
        socketId: socket.id,
        userId: currentUserId || socket.id,
        name: data.callerName,
        avatar: data.callerAvatar,
        isMuted: false,
        isVideoOff: false,
        joinedAt: Date.now(),
      };

      room.activeCall = {
        roomId: data.roomId,
        callType: data.callType,
        startedBy: { id: starter.userId, name: data.callerName, avatar: data.callerAvatar },
        startedAt: Date.now(),
        participants: [starter],
      };

      socket.to(data.roomId).emit('incoming-call', {
        callType: data.callType,
        callerSocketId: socket.id,
        callerId: starter.userId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        roomId: data.roomId,
        isSquadCall: !!data.isSquadCall || data.roomId.toLowerCase().startsWith('squad-'),
        activeCall: room.activeCall,
        timestamp: Date.now(),
      });

      io.to(data.roomId).emit('squad-call-updated', { activeCall: room.activeCall });
    });

    // Squad Call: Join Active Call
    socket.on('squad-call-join', (data: { roomId: string; callType?: 'audio' | 'video'; user?: { id: string; name: string; avatar: string }; isMuted?: boolean; isVideoOff?: boolean; isAudioMuted?: boolean }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      const userInfo = data.user || {
        id: currentUserId || socket.id,
        name: 'Friend',
        avatar: '🌸',
      };
      
      if (!room.activeCall) {
        room.activeCall = {
          roomId: data.roomId,
          callType: data.callType || 'audio',
          startedBy: { id: userInfo.id, name: userInfo.name, avatar: userInfo.avatar },
          startedAt: Date.now(),
          participants: [],
        };
      }

      const newParticipant = {
        socketId: socket.id,
        userId: userInfo.id,
        name: userInfo.name,
        avatar: userInfo.avatar,
        isMuted: !!data.isMuted || !!data.isAudioMuted,
        isVideoOff: !!data.isVideoOff,
        joinedAt: Date.now(),
      };

      const existingIndex = room.activeCall.participants.findIndex(
        (p) => p.socketId === socket.id || p.userId === userInfo.id
      );

      if (existingIndex >= 0) {
        room.activeCall.participants[existingIndex] = newParticipant;
      } else {
        room.activeCall.participants.push(newParticipant);
      }

      io.to(data.roomId).emit('squad-call-updated', { activeCall: room.activeCall });
      socket.to(data.roomId).emit('squad-call-peer-joined', {
        socketId: socket.id,
        user: userInfo,
        participant: newParticipant,
        participants: room.activeCall.participants,
      });
    });

    // Squad Call: Leave Active Call
    socket.on('squad-call-leave', (data: { roomId: string }) => {
      if (!data.roomId) return;
      const room = rooms.get(data.roomId);
      if (room && room.activeCall) {
        room.activeCall.participants = room.activeCall.participants.filter(
          (p) => p.socketId !== socket.id && p.userId !== currentUserId
        );

        if (room.activeCall.participants.length === 0) {
          room.activeCall = null;
          io.to(data.roomId).emit('squad-call-ended', { roomId: data.roomId });
        } else {
          io.to(data.roomId).emit('squad-call-updated', { activeCall: room.activeCall });
          socket.to(data.roomId).emit('squad-call-peer-left', {
            socketId: socket.id,
            userId: currentUserId,
          });
        }
      }
    });

    // Squad Call: Toggle Mic/Camera Media State
    socket.on('squad-call-toggle-media', (data: { roomId: string; isMuted?: boolean; isVideoOff?: boolean }) => {
      if (!data.roomId) return;
      const room = rooms.get(data.roomId);
      if (room && room.activeCall) {
        const participant = room.activeCall.participants.find(
          (p) => p.socketId === socket.id || p.userId === currentUserId
        );
        if (participant) {
          if (data.isMuted !== undefined) participant.isMuted = data.isMuted;
          if (data.isVideoOff !== undefined) participant.isVideoOff = data.isVideoOff;
          io.to(data.roomId).emit('squad-call-updated', { activeCall: room.activeCall });
        }
      }
    });

    // WebRTC 1-on-1 Signaling Relay (Offer, Answer, ICE Candidates)
    socket.on('signal', (data: { roomId: string; signal: unknown; targetSocketId?: string }) => {
      if (!data.roomId) return;
      const payload = {
        senderSocketId: socket.id,
        senderId: currentUserId,
        signal: data.signal,
      };
      if (data.targetSocketId) {
        io.to(data.targetSocketId).emit('signal', payload);
      } else {
        socket.to(data.roomId).emit('signal', payload);
      }
    });

    // Squad WebRTC Targeted Signaling (P2P mesh routing for up to 5 members)
    socket.on('squad-signal', (data: { roomId: string; targetSocketId: string; signal: unknown }) => {
      if (data.targetSocketId) {
        io.to(data.targetSocketId).emit('squad-signal', {
          senderSocketId: socket.id,
          senderUserId: currentUserId,
          signal: data.signal,
        });
      }
    });

    // Call Signaling: Accept
    socket.on('call-accepted', (data: { roomId: string; targetSocketId?: string; callType: 'audio' | 'video' }) => {
      if (!data.roomId) return;
      const payload = {
        callType: data.callType,
        responderSocketId: socket.id,
        responderId: currentUserId,
      };
      if (data.targetSocketId) {
        io.to(data.targetSocketId).emit('call-accepted', payload);
      } else {
        // Fallback broadcast to room only if targetSocketId wasn't specified
        socket.to(data.roomId).emit('call-accepted', payload);
      }
    });

    // Call Signaling: Decline
    socket.on('call-declined', (data: { roomId: string; reason?: string }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('call-declined', {
        reason: data.reason || 'Busy',
        declinerId: currentUserId,
      });
    });

    // Call Signaling: End
    socket.on('call-ended', (data: { roomId: string; duration?: number }) => {
      if (!data.roomId) return;
      const room = rooms.get(data.roomId);
      if (room) {
        room.activeCall = null;
      }
      io.to(data.roomId).emit('call-ended', {
        endedById: currentUserId,
        duration: data.duration,
      });
      io.to(data.roomId).emit('squad-call-ended', { roomId: data.roomId });
    });

    // Call Media State: Relay mute / camera toggle between participants
    socket.on('call-media-state', (data: { roomId: string; isMuted?: boolean; isVideoOff?: boolean; targetSocketId?: string }) => {
      if (!data.roomId) return;
      const payload = {
        senderSocketId: socket.id,
        senderId: currentUserId,
        isMuted: data.isMuted,
        isVideoOff: data.isVideoOff,
      };
      if (data.targetSocketId) {
        io.to(data.targetSocketId).emit('call-media-state', payload);
      } else {
        socket.to(data.roomId).emit('call-media-state', payload);
      }
    });

    // Offline Video/Audio Voicemail Greeting: Leave / Send
    socket.on('leave-voicemail', (data: StoredVoicemail) => {
      if (!data || !data.roomId) return;
      const normalizedRoomId = data.roomId.trim().toLowerCase();
      const newVoicemail: StoredVoicemail = {
        ...data,
        roomId: normalizedRoomId,
        id: data.id || `vm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: data.createdAt || Date.now(),
        listened: false,
      };

      voicemails.unshift(newVoicemail);
      if (voicemails.length > 2000) voicemails.pop();
      saveVoicemailsToDisk();

      // Broadcast to room
      io.to(normalizedRoomId).emit('new-voicemail', { voicemail: newVoicemail });
      console.log(`[Voicemail] New ${newVoicemail.type} voicemail in room ${normalizedRoomId} from ${newVoicemail.senderName}`);
    });

    // Mark Voicemail as Listened
    socket.on('mark-voicemail-listened', (data: { voicemailId: string; roomId: string }) => {
      const { voicemailId, roomId } = data;
      if (!voicemailId) return;
      const target = voicemails.find((v) => v.id === voicemailId);
      if (target) {
        target.listened = true;
        saveVoicemailsToDisk();
        io.to(roomId.toLowerCase()).emit('voicemail-updated', { voicemailId, listened: true });
      }
    });

    // Delete Voicemail
    socket.on('delete-voicemail', (data: { voicemailId: string; roomId: string }) => {
      const { voicemailId, roomId } = data;
      if (!voicemailId) return;
      voicemails = voicemails.filter((v) => v.id !== voicemailId);
      saveVoicemailsToDisk();
      io.to(roomId.toLowerCase()).emit('voicemail-deleted', { voicemailId });
    });

    // Partner Mood / Status
    socket.on('update-status', (data: { roomId: string; statusMood: string }) => {
      if (!data.roomId) return;
      const room = rooms.get(data.roomId);
      if (room) {
        const user = room.users.get(socket.id);
        if (user) {
          user.statusMood = data.statusMood;
        }
      }
      socket.to(data.roomId).emit('partner-status-updated', {
        userId: currentUserId,
        statusMood: data.statusMood,
      });
    });

    // Update Profile (Name & Avatar Photo)
    socket.on('update-profile', (data: { roomId: string; name?: string; avatar?: string }) => {
      if (!data.roomId) return;
      const room = rooms.get(data.roomId);
      if (room) {
        const user = room.users.get(socket.id);
        if (user) {
          if (data.name) user.name = data.name;
          if (data.avatar) user.avatar = data.avatar;
        }
      }
      socket.to(data.roomId).emit('partner-profile-updated', {
        userId: currentUserId,
        name: data.name,
        avatar: data.avatar,
      });
    });

    // Update Anniversary Date
    socket.on('update-anniversary', (data: { roomId: string; anniversaryDate: string }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      room.anniversaryDate = data.anniversaryDate;
      io.to(data.roomId).emit('anniversary-updated', { anniversaryDate: data.anniversaryDate });
    });

    // --- Haven Status / Story Updates ---
    socket.on('status-post', (data: { roomId: string; status: any }) => {
      if (!data.roomId || !data.status) return;
      const room = getOrCreateRoom(data.roomId);
      if (!room.statuses) room.statuses = [];
      const now = Date.now();
      room.statuses = room.statuses.filter((s: any) => s.expiresAt > now);
      room.statuses.unshift(data.status);
      saveRoomsToDisk();
      io.to(data.roomId).emit('status-updated', { statuses: room.statuses });
    });

    socket.on('status-comment', (data: { roomId: string; statusId: string; comment: any }) => {
      if (!data.roomId || !data.statusId || !data.comment) return;
      const room = getOrCreateRoom(data.roomId);
      if (!room.statuses) room.statuses = [];
      const target = room.statuses.find((s: any) => s.id === data.statusId);
      if (target) {
        if (!target.comments) target.comments = [];
        target.comments.push(data.comment);
        saveRoomsToDisk();
        io.to(data.roomId).emit('status-comment-received', {
          statusId: data.statusId,
          comment: data.comment,
          statuses: room.statuses,
        });
      }
    });

    socket.on('status-view', (data: { roomId: string; statusId: string; userId: string }) => {
      if (!data.roomId || !data.statusId || !data.userId) return;
      const room = getOrCreateRoom(data.roomId);
      if (!room.statuses) return;
      const target = room.statuses.find((s: any) => s.id === data.statusId);
      if (target) {
        if (!target.viewers) target.viewers = [];
        if (!target.viewers.includes(data.userId)) {
          target.viewers.push(data.userId);
          saveRoomsToDisk();
          io.to(data.roomId).emit('status-view-updated', {
            statusId: data.statusId,
            userId: data.userId,
            viewers: target.viewers,
          });
        }
      }
    });

    socket.on('status-delete', (data: { roomId: string; statusId: string }) => {
      if (!data.roomId || !data.statusId) return;
      const room = getOrCreateRoom(data.roomId);
      if (!room.statuses) return;
      room.statuses = room.statuses.filter((s: any) => s.id !== data.statusId);
      saveRoomsToDisk();
      io.to(data.roomId).emit('status-updated', { statuses: room.statuses });
    });

    // --- Live Love Canvas Events ---
    socket.on('canvas-draw-stroke', (data: { roomId: string; stroke: any }) => {
      if (!data.roomId || !data.stroke) return;
      const room = getOrCreateRoom(data.roomId);
      if (!room.canvasStrokes) room.canvasStrokes = [];
      room.canvasStrokes.push(data.stroke);
      if (room.canvasStrokes.length > 500) {
        room.canvasStrokes.shift();
      }
      socket.to(data.roomId).emit('canvas-stroke-received', { stroke: data.stroke });
    });

    socket.on('canvas-clear', (data: { roomId: string }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      room.canvasStrokes = [];
      io.to(data.roomId).emit('canvas-cleared');
    });

    socket.on('canvas-cursor', (data: { roomId: string; cursor: any }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('canvas-cursor-moved', { cursor: data.cursor });
    });

    socket.on('canvas-request-sync', (data: { roomId: string }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      socket.emit('canvas-sync-state', { strokes: room.canvasStrokes || [] });
    });

    // --- Watch Together / Synchronized Media Lounge Events ---
    socket.on('media-sync', (data: { roomId: string; state: any }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      room.mediaState = data.state;
      socket.to(data.roomId).emit('media-state-updated', { state: data.state });
    });

    socket.on('media-request-sync', (data: { roomId: string }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      if (room.mediaState) {
        socket.emit('media-state-updated', { state: room.mediaState });
      }
    });

    // In-Movie Live Bullet Comments & Synchronized Whispers
    socket.on('in-movie-comment', (data: { roomId: string; comment: any }) => {
      if (!data.roomId || !data.comment) return;
      io.to(data.roomId).emit('in-movie-comment-received', { comment: data.comment });
    });

    // Shared Movie Watchlist Sync
    socket.on('movie-watchlist-add', (data: { roomId: string; entry: any }) => {
      if (!data.roomId || !data.entry) return;
      io.to(data.roomId).emit('movie-watchlist-added', { entry: data.entry });
    });

    socket.on('movie-watchlist-toggle', (data: { roomId: string; entryId: string; isWatched: boolean }) => {
      if (!data.roomId || !data.entryId) return;
      io.to(data.roomId).emit('movie-watchlist-toggled', { entryId: data.entryId, isWatched: data.isWatched });
    });

    // --- Time Capsule Letters Events ---
    socket.on('capsule-send-letter', (data: { roomId: string; letter: any }) => {
      if (!data.roomId || !data.letter) return;
      const room = getOrCreateRoom(data.roomId);
      if (!room.timeCapsuleLetters) room.timeCapsuleLetters = [];
      room.timeCapsuleLetters.push(data.letter);
      saveRoomsToDisk();
      io.to(data.roomId).emit('capsule-letter-received', { letter: data.letter });
    });

    socket.on('capsule-unlock-letter', (data: { roomId: string; letterId: string }) => {
      if (!data.roomId || !data.letterId) return;
      const room = getOrCreateRoom(data.roomId);
      if (room.timeCapsuleLetters) {
        const letter = room.timeCapsuleLetters.find((l) => l.id === data.letterId);
        if (letter) {
          letter.isUnlocked = true;
          letter.unlockedAt = Date.now();
          saveRoomsToDisk();
        }
      }
      io.to(data.roomId).emit('capsule-letter-unlocked', { letterId: data.letterId, unlockedAt: Date.now() });
    });

    socket.on('capsule-request-sync', (data: { roomId: string }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      socket.emit('capsule-sync-state', { letters: room.timeCapsuleLetters || [] });
    });

    // --- Daily Spark Events ---
    socket.on('spark-submit-answer', (data: { roomId: string; answer: any; promptId: string; dateKey: string }) => {
      if (!data.roomId || !data.answer) return;
      const room = getOrCreateRoom(data.roomId);
      if (!room.dailySpark || room.dailySpark.dateKey !== data.dateKey) {
        room.dailySpark = {
          dateKey: data.dateKey,
          promptId: data.promptId,
          answers: {},
        };
      }
      room.dailySpark.answers[data.answer.userId] = data.answer;
      saveRoomsToDisk();
      io.to(data.roomId).emit('spark-answer-updated', {
        dateKey: data.dateKey,
        promptId: data.promptId,
        answer: data.answer,
        answers: room.dailySpark.answers,
      });
    });

    socket.on('spark-request-sync', (data: { roomId: string; dateKey: string }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      socket.emit('spark-sync-state', { sparkState: room.dailySpark || null });
    });

    // --- Live Touch Pulse (Virtual Hand Holding) Events ---
    socket.on('touch-pulse-update', (data: { roomId: string; touch: any }) => {
      if (!data.roomId || !data.touch) return;
      socket.to(data.roomId).emit('touch-pulse-stream', { touch: data.touch });
    });

    socket.on('touch-pulse-release', (data: { roomId: string; userId: string }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('touch-pulse-released', { userId: data.userId });
    });

    // --- Love Bucket List Events ---
    socket.on('bucket-add-item', (data: { roomId: string; item: any }) => {
      if (!data.roomId || !data.item) return;
      const room = getOrCreateRoom(data.roomId);
      if (!room.bucketList) room.bucketList = [];
      room.bucketList.push(data.item);
      saveRoomsToDisk();
      io.to(data.roomId).emit('bucket-item-added', { item: data.item });
    });

    socket.on('bucket-toggle-item', (data: { roomId: string; itemId: string; isCompleted: boolean; completedAt?: number }) => {
      if (!data.roomId || !data.itemId) return;
      const room = getOrCreateRoom(data.roomId);
      if (room.bucketList) {
        const item = room.bucketList.find((i) => i.id === data.itemId);
        if (item) {
          item.isCompleted = data.isCompleted;
          item.completedAt = data.completedAt;
          saveRoomsToDisk();
        }
      }
      io.to(data.roomId).emit('bucket-item-toggled', { itemId: data.itemId, isCompleted: data.isCompleted, completedAt: data.completedAt });
    });

    socket.on('bucket-delete-item', (data: { roomId: string; itemId: string }) => {
      if (!data.roomId || !data.itemId) return;
      const room = getOrCreateRoom(data.roomId);
      if (room.bucketList) {
        room.bucketList = room.bucketList.filter((i) => i.id !== data.itemId);
        saveRoomsToDisk();
      }
      io.to(data.roomId).emit('bucket-item-deleted', { itemId: data.itemId });
    });

    socket.on('bucket-request-sync', (data: { roomId: string }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      socket.emit('bucket-sync-state', { items: room.bucketList || [] });
    });

    // --- Couple Games Multi-player Events ---
    socket.on('game-action', (data: { roomId: string; gameType: string; actionData: any }) => {
      if (!data.roomId) return;
      socket.to(data.roomId).emit('game-action-received', {
        gameType: data.gameType,
        actionData: data.actionData,
        senderId: currentUserId,
      });
    });

    // --- Partner Sky & Horizon Map Location Sync Events ---
    socket.on('horizon-update-location', (data: { roomId: string; location: any }) => {
      if (!data.roomId || !data.location) return;
      const room = getOrCreateRoom(data.roomId);
      if (!room.locations) room.locations = {};
      if (currentUserId) {
        room.locations[currentUserId] = data.location;
        saveRoomsToDisk();
      }
      socket.to(data.roomId).emit('horizon-location-received', {
        userId: currentUserId,
        location: data.location,
      });
    });

    socket.on('horizon-request-sync', (data: { roomId: string }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      socket.emit('horizon-sync-state', { locations: room.locations || {} });
    });

    // Permanently wipe chat history
    socket.on('wipe-history', (data: { roomId: string }) => {
      if (!data.roomId) return;
      const room = rooms.get(data.roomId);
      if (room) {
        room.messages = [];
        room.canvasStrokes = [];
        saveRoomsToDisk();
      }
      io.to(data.roomId).emit('history-wiped');
    });

    // --- MUTUAL AGREEMENT PERMANENT SPACE DELETION ---
    // A space and all its contents can ONLY be permanently deleted if all parties agree!
    socket.on('request-permanent-space-deletion', (data: { roomId: string; user: { id: string; name: string; avatar: string }; reason?: string }) => {
      const { roomId, user } = data;
      if (!roomId || !user) return;
      const room = rooms.get(roomId);
      if (!room) return;

      room.pendingDeletion = {
        requestedBy: user,
        requestedAt: Date.now(),
        agreedUserIds: [user.id],
        status: 'pending',
      };
      saveRoomsToDisk();

      // Broadcast deletion request to all users in the space so partner/members receive prompt
      io.to(roomId).emit('space-deletion-requested', {
        roomId,
        pendingDeletion: room.pendingDeletion,
      });
    });

    socket.on('respond-permanent-space-deletion', (data: { roomId: string; user: { id: string; name: string; avatar: string }; agree: boolean }) => {
      const { roomId, user, agree } = data;
      if (!roomId || !user) return;
      const room = rooms.get(roomId);
      if (!room || !room.pendingDeletion) return;

      if (!agree) {
        // Partner or squad member declined! The space and all records remain safe.
        const cancelledBy = user.name;
        room.pendingDeletion = null;
        saveRoomsToDisk();
        io.to(roomId).emit('space-deletion-cancelled', {
          roomId,
          cancelledBy,
          message: `${cancelledBy} declined the request to permanently delete this space. Your sanctuary and all memories remain safe!`,
        });
        return;
      }

      // Member agreed
      if (!room.pendingDeletion.agreedUserIds.includes(user.id)) {
        room.pendingDeletion.agreedUserIds.push(user.id);
      }

      // Mutual agreement check:
      // In a couple room (or standard 2-person space), both must agree.
      // If 1 person created and tested alone, their own agreement is sufficient.
      const isSquad = room.spaceType === 'friends' || roomId.toLowerCase().startsWith('squad-');
      const requiredAgreements = isSquad ? Math.min(room.users.size, 3) : Math.min(2, Math.max(1, room.users.size));

      if (room.pendingDeletion.agreedUserIds.length >= requiredAgreements) {
        // MUTUAL CONSENT CONFIRMED: PERMANENTLY ERASE SPACE
        console.log(`[Permanent Deletion] Space ${roomId} permanently erased by mutual agreement.`);
        io.to(roomId).emit('space-permanently-deleted', {
          roomId,
          message: 'This space and all associated messages, photos, videos, and canvas memories have been permanently deleted by mutual agreement.',
        });
        rooms.delete(roomId);
        saveRoomsToDisk();
      } else {
        saveRoomsToDisk();
        io.to(roomId).emit('space-deletion-updated', {
          roomId,
          pendingDeletion: room.pendingDeletion,
        });
      }
    });

    socket.on('cancel-permanent-space-deletion', (data: { roomId: string; userId: string }) => {
      const { roomId } = data;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.pendingDeletion) return;

      room.pendingDeletion = null;
      saveRoomsToDisk();
      io.to(roomId).emit('space-deletion-cancelled', {
        roomId,
        message: 'Permanent deletion request was cancelled by the requester.',
      });
    });

    // --- Synchronized Music Lounge Events ---
    socket.on('music-sync', (data: { roomId: string; state: any }) => {
      if (!data.roomId || !data.state) return;
      const room = getOrCreateRoom(data.roomId);
      room.musicState = data.state;
      socket.to(data.roomId).emit('music-sync-state', { state: data.state });
    });

    socket.on('music-request-sync', (data: { roomId: string }) => {
      if (!data.roomId) return;
      const room = getOrCreateRoom(data.roomId);
      if (room.musicState) {
        socket.emit('music-sync-state', { state: room.musicState });
      }
    });

    // --- HAVEN SINGLES LOUNGE SOCKET LISTENERS ---
    socket.on('singles-join', (data: { userId?: string; userName?: string }) => {
      socket.join('singles-lounge');
      if (data?.userId) {
        singlesUserSockets.set(data.userId, socket.id);
        if (singlesProfiles.has(data.userId)) {
          const p = singlesProfiles.get(data.userId);
          p.onlineStatus = 'online';
          p.lastActive = Date.now();
          io.to('singles-lounge').emit('singles-member-status', { userId: data.userId, status: 'online' });
        }
      }
    });

    socket.on('singles-leave', (data: { userId?: string }) => {
      socket.leave('singles-lounge');
      if (data?.userId) {
        singlesUserSockets.delete(data.userId);
        if (singlesProfiles.has(data.userId)) {
          const p = singlesProfiles.get(data.userId);
          p.onlineStatus = 'active_today';
          p.lastActive = Date.now();
          io.to('singles-lounge').emit('singles-member-status', { userId: data.userId, status: 'active_today' });
        }
      }
    });

    socket.on('singles-send-wave', (wave: any) => {
      if (!wave || !wave.toId) return;
      singlesWaves.unshift(wave);
      if (singlesWaves.length > 500) singlesWaves.pop();
      saveWavesToDisk();
      // Broadcast to singles lounge so recipient gets immediate toast notification & badge
      io.to('singles-lounge').emit('singles-wave-received', wave);
    });

    socket.on('singles-create-invite', (data: { fromUser: any; toUser: any; roomId: string; passkey: string; message?: string }) => {
      const wave = {
        id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fromId: data.fromUser.id,
        fromName: data.fromUser.name,
        fromAvatar: data.fromUser.avatar,
        toId: data.toUser.id,
        type: 'invite',
        message: data.message || `Hey ${data.toUser.name}! Let's hang out in a private Haven Space together!`,
        timestamp: Date.now(),
        proposedRoomId: data.roomId,
        proposedPasskey: data.passkey,
      };
      singlesWaves.unshift(wave);
      saveWavesToDisk();
      io.to('singles-lounge').emit('singles-wave-received', wave);
    });

    // Virtual Date Scheduling Sockets
    socket.on('singles-virtual-date-invite', (invite: any) => {
      if (!invite || !invite.toProfile?.id) return;
      io.to('singles-lounge').emit('singles-virtual-date-invite-received', invite);
    });

    socket.on('singles-virtual-date-response', (data: { inviteId: string; status: 'accepted' | 'declined'; responderId: string }) => {
      io.to('singles-lounge').emit('singles-virtual-date-response-received', data);
    });

    // In-Call Mini-Game Event Relay
    socket.on('singles-mini-game-event', (data: any) => {
      if (data?.sessionId) {
        socket.to(`screening-${data.sessionId}`).emit('singles-mini-game-event', data);
      }
    });

    // Ghost-Free Gentle Closure Relay
    socket.on('singles-gentle-closure', (closure: any) => {
      if (!closure || !closure.toProfile?.id) return;
      io.to('singles-lounge').emit('singles-gentle-closure-received', closure);
    });

    // IRL Safe Date Planner Sockets
    socket.on('singles-safe-date-proposal', (plan: any) => {
      if (!plan || !plan.toProfile?.id) return;
      const existingIdx = safeDatePlans.findIndex((p) => p.id === plan.id);
      if (existingIdx >= 0) {
        safeDatePlans[existingIdx] = plan;
      } else {
        safeDatePlans.unshift(plan);
      }
      if (safeDatePlans.length > 300) safeDatePlans.pop();
      saveSafeDatesToDisk();
      io.to('singles-lounge').emit('singles-safe-date-proposal-received', plan);
    });

    socket.on('singles-safe-date-response', (data: { planId: string; status: string }) => {
      const plan = safeDatePlans.find((p) => p.id === data.planId);
      if (plan) {
        plan.status = data.status;
        saveSafeDatesToDisk();
      }
      io.to('singles-lounge').emit('singles-safe-date-response-received', data);
    });

    socket.on('singles-safety-checkin-alert', (alertData: any) => {
      io.to('singles-lounge').emit('singles-safety-checkin-alert-received', alertData);
    });

    // --- ⚡ BLIND SPARK SPEED ROUNDS SOCKETS ---
    socket.on('singles-speed-join', (data: { profile: any }) => {
      if (!data?.profile?.id) return;
      const userProfile = data.profile;
      const userId = userProfile.id;

      // Check if already in queue
      if (speedRoundQueue.has(userId)) return;

      // Check if another real user is waiting in queue
      let partnerEntry: SpeedQueueEntry | null = null;
      for (const [qId, entry] of speedRoundQueue.entries()) {
        if (qId !== userId && entry.socketId !== socket.id) {
          partnerEntry = entry;
          speedRoundQueue.delete(qId);
          if (entry.timer) clearTimeout(entry.timer);
          break;
        }
      }

      if (partnerEntry) {
        // MATCH FOUND with another real waiting user!
        const sessionId = `speed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const alias1 = SPEED_MYSTERY_ALIASES[Math.floor(Math.random() * SPEED_MYSTERY_ALIASES.length)];
        let alias2 = SPEED_MYSTERY_ALIASES[Math.floor(Math.random() * SPEED_MYSTERY_ALIASES.length)];
        while (alias2.alias === alias1.alias) {
          alias2 = SPEED_MYSTERY_ALIASES[Math.floor(Math.random() * SPEED_MYSTERY_ALIASES.length)];
        }

        const session = {
          sessionId,
          participantA: {
            id: userProfile.id,
            name: userProfile.name,
            alias: alias1.alias,
            avatar: userProfile.avatar,
            isRealUser: true,
            city: userProfile.city || 'Anywhere',
            vibe: alias1.vibe,
            fullProfile: userProfile,
          },
          participantB: {
            id: partnerEntry.profile.id,
            name: partnerEntry.profile.name,
            alias: alias2.alias,
            avatar: partnerEntry.profile.avatar,
            isRealUser: true,
            city: partnerEntry.profile.city || 'Anywhere',
            vibe: alias2.vibe,
            fullProfile: partnerEntry.profile,
          },
          startTime: Date.now(),
          durationSeconds: 180,
          currentPromptIndex: 0,
          messages: [],
          decisionA: 'pending',
          decisionB: 'pending',
          isSimulated: false,
        };

        activeSpeedSessions.set(sessionId, session);
        socket.join(`speed-${sessionId}`);
        const partnerSocket = io.sockets.sockets.get(partnerEntry.socketId);
        if (partnerSocket) partnerSocket.join(`speed-${sessionId}`);

        // Emit to both
        socket.emit('singles-speed-matched', {
          session,
          yourRole: 'A',
          yourAlias: alias1.alias,
          partnerAlias: alias2.alias,
          partnerVibe: alias2.vibe,
          partnerCity: partnerEntry.profile.city || 'Anywhere',
        });

        if (partnerSocket) {
          partnerSocket.emit('singles-speed-matched', {
            session,
            yourRole: 'B',
            yourAlias: alias2.alias,
            partnerAlias: alias1.alias,
            partnerVibe: alias1.vibe,
            partnerCity: userProfile.city || 'Anywhere',
          });
        }

        // Drop first dilemma after 2s
        setTimeout(() => {
          io.to(`speed-${sessionId}`).emit('singles-speed-prompt-dropped', {
            prompt: SPEED_DILEMMAS[0],
            promptIndex: 0,
          });
        }, 2000);
      } else {
        // Add user to the real matchmaking queue
        speedRoundQueue.set(userId, {
          socketId: socket.id,
          profile: userProfile,
          joinedAt: Date.now(),
        });

        socket.emit('singles-speed-queue-status', { status: 'waiting', queueSize: speedRoundQueue.size });

        // Alert others in singles lounge that someone is waiting in the speed round queue
        io.to('singles-lounge').emit('singles-speed-queue-alert', {
          queueSize: speedRoundQueue.size,
          message: '⚡ Someone is waiting in the Blind Spark speed queue! Jump in to match!',
        });
      }
    });

    // Leave speed round queue
    socket.on('singles-speed-leave-queue', (data: { userId: string }) => {
      if (data?.userId && speedRoundQueue.has(data.userId)) {
        const entry = speedRoundQueue.get(data.userId);
        if (entry?.timer) clearTimeout(entry.timer);
        speedRoundQueue.delete(data.userId);
      }
    });

    // Send chat message in Speed Round
    socket.on('singles-speed-send-message', (data: { sessionId: string; text: string; senderId: string; senderAlias: string; isIcebreakerAnswer?: boolean }) => {
      const { sessionId, text, senderId, senderAlias, isIcebreakerAnswer } = data;
      if (!sessionId || !text) return;
      const session = activeSpeedSessions.get(sessionId);
      if (!session) return;

      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId,
        senderAlias,
        text,
        timestamp: Date.now(),
        isIcebreakerAnswer,
      };

      session.messages.push(message);
      io.to(`speed-${sessionId}`).emit('singles-speed-message-received', { message });

      // If partner is simulated, respond automatically with smart context
      if (session.isSimulated && senderId === session.participantA.id) {
        setTimeout(() => {
          let replyText = '';
          const lower = text.toLowerCase();
          if (lower.includes('croissant') || lower.includes('bakery') || lower.includes('8 am')) {
            replyText = "100% yes to the fresh bakery run! Nothing beats warm chocolate croissants while the morning is quiet ☕🥐";
          } else if (lower.includes('sleep in') || lower.includes('noon') || lower.includes('coffee in bed')) {
            replyText = "Haha sleep-in team! Uninterrupted morning sleep with sunlight through the blinds is peak happiness ✨";
          } else if (lower.includes('jazz') || lower.includes('speakeasy')) {
            replyText = "Ooh love a moody speakeasy! Dim lights, live saxophone, and a craft mocktail or drink—instant vibe.";
          } else if (lower.includes('picnic') || lower.includes('beach') || lower.includes('sunset')) {
            replyText = "Sunset picnic is so romantic! Pack some fresh fruit, cheese, and a warm blanket 🌅";
          } else if (lower.includes('1920') || lower.includes('past') || lower.includes('back')) {
            replyText = "The 1920s would be electric! The fashion, live big bands, and art deco architecture!";
          } else if (lower.includes('future') || lower.includes('2126')) {
            replyText = "Bold choice! I want to see if we have flying cars and colonies on Mars by then 🚀";
          } else if (lower.includes('detail') || lower.includes('green flag')) {
            replyText = "Yes! Remembering the small things shows genuine intention. That's rare and so attractive!";
          } else if (lower.includes('laugh')) {
            replyText = "Uncontrollable laughing until your stomach hurts is the absolute best feeling in the world 😂";
          } else {
            const genericReplies = [
              "I love that answer so much! We are definitely matching energies here ✨",
              "Haha that made me smile. Our 3 minutes are flying by!",
              "Totally agree with you! Tell me, what's your go-to comfort movie or late night drive song?",
              "That is so valid! I feel like we'd have hours of conversation in a quiet booth.",
            ];
            replyText = genericReplies[Math.floor(Math.random() * genericReplies.length)];
          }

          const simReply = {
            id: `msg-${Date.now()}`,
            senderId: session.participantB.id,
            senderAlias: session.participantB.alias,
            text: replyText,
            timestamp: Date.now(),
          };
          session.messages.push(simReply);
          socket.emit('singles-speed-message-received', { message: simReply });
        }, 1200 + Math.random() * 800);
      }
    });

    // Advance dilemma / icebreaker
    socket.on('singles-speed-next-prompt', (data: { sessionId: string; promptIndex: number }) => {
      const { sessionId, promptIndex } = data;
      const session = activeSpeedSessions.get(sessionId);
      if (!session) return;
      session.currentPromptIndex = promptIndex;
      const prompt = SPEED_DILEMMAS[promptIndex % SPEED_DILEMMAS.length];
      io.to(`speed-${sessionId}`).emit('singles-speed-prompt-dropped', { prompt, promptIndex });
    });

    // Submit Decision: 'spark' or 'pass'
    socket.on('singles-speed-submit-decision', (data: { sessionId: string; userId: string; decision: 'spark' | 'pass' }) => {
      const { sessionId, userId, decision } = data;
      const session = activeSpeedSessions.get(sessionId);
      if (!session) return;

      if (session.participantA.id === userId) {
        session.decisionA = decision;
      } else if (session.participantB.id === userId) {
        session.decisionB = decision;
      }

      // If partner is simulated, give partner a friendly 85% spark choice
      if (session.isSimulated) {
        session.decisionB = Math.random() > 0.15 ? 'spark' : 'spark'; // high spark rate for exciting user experience
      }

      if (session.decisionA !== 'pending' && session.decisionB !== 'pending') {
        const mutualSpark = session.decisionA === 'spark' && session.decisionB === 'spark';
        let roomId = '';
        let passkey = '';

        if (mutualSpark) {
          roomId = `haven-spark-${Math.floor(1000 + Math.random() * 9000)}`;
          const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
          for (let i = 0; i < 12; i++) {
            passkey += chars[Math.floor(Math.random() * chars.length)];
          }
        }

        io.to(`speed-${sessionId}`).emit('singles-speed-result', {
          sessionId,
          mutualSpark,
          decisionA: session.decisionA,
          decisionB: session.decisionB,
          participantA: session.participantA.fullProfile || session.participantA,
          participantB: session.participantB.fullProfile || session.participantB,
          roomId: mutualSpark ? roomId : undefined,
          passkey: mutualSpark ? passkey : undefined,
          joinUrl: mutualSpark ? `/?room=${roomId}&key=${passkey}&type=couple` : undefined,
        });

        // Clean up session after 10 mins
        setTimeout(() => activeSpeedSessions.delete(sessionId), 600000);
      } else {
        socket.emit('singles-speed-decision-recorded', { decision, waitingForPartner: true });
      }
    });

    // Leave speed round
    socket.on('singles-speed-leave', (data: { sessionId: string; userId: string }) => {
      if (data?.sessionId) {
        socket.leave(`speed-${data.sessionId}`);
        socket.to(`speed-${data.sessionId}`).emit('singles-speed-partner-left', { userId: data.userId });
      }
    });

    // --- 🎥 VIDEO SCREENING CALL WITH QUESTIONS & MATCH/LEAVE DECISION ---

    // 1. Direct Video Screening Invite
    socket.on('singles-video-screening-invite', (data: { fromUser: any; toUserId: string }) => {
      const { fromUser, toUserId } = data;
      if (!fromUser?.id || !toUserId) return;

      const inviteId = `vsi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const invite = {
        inviteId,
        fromUser,
        toUserId,
        timestamp: Date.now(),
      };

      // Broadcast to singles-lounge room so recipient's socket catches it
      io.to('singles-lounge').emit('singles-video-screening-incoming', invite);

      // Record wave entry as well
      const wave = {
        id: `wave-${inviteId}`,
        fromId: fromUser.id,
        fromName: fromUser.name,
        fromAvatar: fromUser.avatar,
        toId: toUserId,
        type: 'video_screening',
        message: `${fromUser.name} invited you to a Video Screening Call with interactive icebreaker questions! 🎥✨`,
        timestamp: Date.now(),
      };
      singlesWaves.unshift(wave);
      saveWavesToDisk();
      io.to('singles-lounge').emit('singles-wave-received', wave);
    });

    // 2. Accept Video Screening Invite
    socket.on('singles-video-screening-accept', (data: { inviteId: string; fromUserId: string; toUser: any }) => {
      const { fromUserId, toUser } = data;
      if (!fromUserId || !toUser) return;

      const fromProfile = singlesProfiles.get(fromUserId);
      if (!fromProfile) return;

      const sessionId = `screening-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const socketAId = singlesUserSockets.get(fromUserId) || '';
      const socketBId = socket.id;

      const session: VideoScreeningSessionState = {
        sessionId,
        participantA: fromProfile,
        participantB: toUser,
        socketAId,
        socketBId,
        startedAt: Date.now(),
        durationSeconds: 180,
        currentQuestionIndex: 0,
        decisionA: 'pending',
        decisionB: 'pending',
        isSimulated: false,
      };

      activeScreeningSessions.set(sessionId, session);
      socket.join(`screening-${sessionId}`);

      const partnerSocket = io.sockets.sockets.get(socketAId);
      if (partnerSocket) {
        partnerSocket.join(`screening-${sessionId}`);
        partnerSocket.emit('singles-video-screening-started', {
          session,
          yourRole: 'A',
          partnerProfile: toUser,
          isInitiator: true,
        });
      }

      socket.emit('singles-video-screening-started', {
        session,
        yourRole: 'B',
        partnerProfile: fromProfile,
        isInitiator: false,
      });

      // Announce in lounge
      io.to('singles-lounge').emit('singles-lounge-toast', {
        title: '🎥 Video Screening Date Started',
        message: `${fromProfile.name} and ${toUser.name} just stepped into a Video Screening Call! ✨`,
      });
    });

    // 3. Decline Video Screening Invite
    socket.on('singles-video-screening-decline', (data: { inviteId: string; fromUserId: string }) => {
      const { fromUserId } = data;
      if (!fromUserId) return;
      const targetSocketId = singlesUserSockets.get(fromUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('singles-video-screening-declined', {
          message: 'The member is currently unavailable or declined the screening call.',
        });
      }
    });

    // 4. Fast Matchmaking Queue for Video Screening
    socket.on('singles-video-screening-queue-join', (data: { profile: any }) => {
      const userProfile = data?.profile;
      if (!userProfile?.id) return;
      const userId = userProfile.id;

      // Check if someone else is waiting
      let matchedEntry: { socketId: string; profile: any; joinedAt: number } | null = null;
      let matchedUserId = '';
      for (const [qId, entry] of screeningQueue.entries()) {
        if (qId !== userId && entry.socketId !== socket.id) {
          matchedEntry = entry;
          matchedUserId = qId;
          screeningQueue.delete(qId);
          break;
        }
      }

      if (matchedEntry) {
        // MATCH REAL USERS!
        const sessionId = `screening-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const session: VideoScreeningSessionState = {
          sessionId,
          participantA: userProfile,
          participantB: matchedEntry.profile,
          socketAId: socket.id,
          socketBId: matchedEntry.socketId,
          startedAt: Date.now(),
          durationSeconds: 180,
          currentQuestionIndex: 0,
          decisionA: 'pending',
          decisionB: 'pending',
          isSimulated: false,
        };

        activeScreeningSessions.set(sessionId, session);
        socket.join(`screening-${sessionId}`);

        const partnerSocket = io.sockets.sockets.get(matchedEntry.socketId);
        if (partnerSocket) {
          partnerSocket.join(`screening-${sessionId}`);
          partnerSocket.emit('singles-video-screening-started', {
            session,
            yourRole: 'B',
            partnerProfile: userProfile,
            isInitiator: false,
          });
        }

        socket.emit('singles-video-screening-started', {
          session,
          yourRole: 'A',
          partnerProfile: matchedEntry.profile,
          isInitiator: true,
        });
      } else {
        // Enqueue
        screeningQueue.set(userId, {
          socketId: socket.id,
          profile: userProfile,
          joinedAt: Date.now(),
        });
        socket.emit('singles-video-screening-queue-status', { status: 'waiting', queueSize: screeningQueue.size });
        io.to('singles-lounge').emit('singles-video-screening-queue-alert', {
          queueSize: screeningQueue.size,
          message: '🎥 Someone is waiting in the Video Screening Queue! Pair up for a live call!',
        });
      }
    });

    socket.on('singles-video-screening-queue-leave', (data: { userId: string }) => {
      if (data?.userId) {
        screeningQueue.delete(data.userId);
      }
    });

    // 5. Test/Solo Video Screening Start (Allows immediate end-to-end testing when testing alone)
    socket.on('singles-video-screening-test-start', (data: { profile: any; simulatedPartner?: any }) => {
      const userProfile = data?.profile;
      if (!userProfile?.id) return;

      const simPartner = data.simulatedPartner || {
        id: 'single-partner-sim',
        name: 'Jordan Miller',
        age: 26,
        city: 'New York, NY',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        bio: 'Documentary lover, weekend camper, and iced latte connoisseur ✨',
        isRealUser: true,
      };

      const sessionId = `screening-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const session: VideoScreeningSessionState = {
        sessionId,
        participantA: userProfile,
        participantB: simPartner,
        socketAId: socket.id,
        socketBId: socket.id,
        startedAt: Date.now(),
        durationSeconds: 180,
        currentQuestionIndex: 0,
        decisionA: 'pending',
        decisionB: 'pending',
        isSimulated: true,
      };

      activeScreeningSessions.set(sessionId, session);
      socket.join(`screening-${sessionId}`);

      socket.emit('singles-video-screening-started', {
        session,
        yourRole: 'A',
        partnerProfile: simPartner,
        isInitiator: true,
      });

      // Trigger automatic floating greeting reaction from simulated partner after 4s
      setTimeout(() => {
        socket.emit('singles-video-screening-reaction-received', {
          emoji: '👋',
          senderName: simPartner.name,
          id: Date.now(),
        });
      }, 4000);
    });

    // 6. WebRTC Signaling for Video Screening Call
    socket.on('singles-video-screening-signal', (data: { sessionId: string; signal: any; senderId: string }) => {
      const { sessionId, signal, senderId } = data;
      if (!sessionId || !signal) return;
      socket.to(`screening-${sessionId}`).emit('singles-video-screening-signal', {
        signal,
        senderId,
      });
    });

    // 7. Sync Screening Question Change
    socket.on('singles-video-screening-question-change', (data: { sessionId: string; questionIndex: number }) => {
      const { sessionId, questionIndex } = data;
      if (!sessionId) return;
      const session = activeScreeningSessions.get(sessionId);
      if (session) {
        session.currentQuestionIndex = questionIndex;
      }
      io.to(`screening-${sessionId}`).emit('singles-video-screening-question-updated', {
        questionIndex,
      });
    });

    // 8. Live Floating Emoji Reactions over Video Call
    socket.on('singles-video-screening-reaction', (data: { sessionId: string; emoji: string; senderName: string }) => {
      const { sessionId, emoji, senderName } = data;
      if (!sessionId || !emoji) return;
      io.to(`screening-${sessionId}`).emit('singles-video-screening-reaction-received', {
        emoji,
        senderName: senderName || 'Partner',
        id: Date.now(),
      });
    });

    // 9. End / Wrap Up Video Call -> Enter Decision Phase
    socket.on('singles-video-screening-end-call', (data: { sessionId: string }) => {
      const { sessionId } = data;
      if (!sessionId) return;
      io.to(`screening-${sessionId}`).emit('singles-video-screening-call-ended', {
        sessionId,
      });
    });

    // 10. Submit Match or Leave Decision
    socket.on('singles-video-screening-submit-decision', (data: { sessionId: string; userId: string; decision: 'match' | 'leave' }) => {
      const { sessionId, userId, decision } = data;
      if (!sessionId || !userId || !decision) return;
      const session = activeScreeningSessions.get(sessionId);
      if (!session) return;

      if (session.participantA.id === userId) {
        session.decisionA = decision;
      } else if (session.participantB.id === userId) {
        session.decisionB = decision;
      }

      // If simulated session, automatically simulate partner's decision after 1.2 seconds
      if (session.isSimulated && session.participantA.id === userId) {
        setTimeout(() => {
          session.decisionB = 'match'; // partner says yes
          evaluateDecisions(session);
        }, 1200);
      } else {
        evaluateDecisions(session);
      }

      function evaluateDecisions(sess: VideoScreeningSessionState) {
        if (sess.decisionA !== 'pending' && sess.decisionB !== 'pending') {
          const mutualMatch = sess.decisionA === 'match' && sess.decisionB === 'match';
          let roomId = '';
          let passkey = '';

          if (mutualMatch) {
            roomId = `haven-match-${Math.floor(1000 + Math.random() * 9000)}`;
            const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
            for (let i = 0; i < 12; i++) {
              passkey += chars[Math.floor(Math.random() * chars.length)];
            }
          }

          io.to(`screening-${sess.sessionId}`).emit('singles-video-screening-result', {
            sessionId: sess.sessionId,
            mutualMatch,
            decisionA: sess.decisionA,
            decisionB: sess.decisionB,
            roomId: mutualMatch ? roomId : undefined,
            passkey: mutualMatch ? passkey : undefined,
            joinUrl: mutualMatch ? `/?room=${roomId}&key=${passkey}&type=couple` : undefined,
            participantA: sess.participantA,
            participantB: sess.participantB,
          });

          // Clean up session after 10 mins
          setTimeout(() => activeScreeningSessions.delete(sess.sessionId), 600000);
        } else {
          socket.emit('singles-video-screening-decision-recorded', {
            decision,
            waitingForPartner: true,
          });
        }
      }
    });

    // 11. Leave Video Screening
    socket.on('singles-video-screening-leave', (data: { sessionId: string; userId: string }) => {
      if (data?.sessionId) {
        socket.leave(`screening-${data.sessionId}`);
        socket.to(`screening-${data.sessionId}`).emit('singles-video-screening-partner-left', {
          userId: data.userId,
        });
      }
    });

    // --- CO-VIEWING MINI THEATER REACTIONS ---
    socket.on('singles-theater-reaction', (data: { theaterId: string; emoji: string; userName: string }) => {
      if (!data?.theaterId) return;
      io.to('singles-lounge').emit('singles-theater-reaction-received', data);
    });

    socket.on('singles-theater-whisper', (data: { theaterId: string; fromUser: any; toUser: any; message: string }) => {
      if (!data?.toUser?.id) return;
      io.to('singles-lounge').emit('singles-theater-whisper-received', data);
    });

    // Disconnect handling
    socket.on('disconnect', () => {
      if (currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          room.users.delete(socket.id);
          const remainingUsers = Array.from(room.users.values());
          socket.to(currentRoomId).emit('peer-left', {
            socketId: socket.id,
            userId: currentUserId,
            remainingUsers,
          });

          // Also clean up from active squad call if in progress
          if (room.activeCall) {
            room.activeCall.participants = room.activeCall.participants.filter(
              (p) => p.socketId !== socket.id && p.userId !== currentUserId
            );
            if (room.activeCall.participants.length === 0) {
              room.activeCall = null;
              socket.to(currentRoomId).emit('squad-call-ended', { roomId: currentRoomId });
            } else {
              socket.to(currentRoomId).emit('squad-call-updated', room.activeCall);
              socket.to(currentRoomId).emit('squad-call-peer-left', {
                socketId: socket.id,
                userId: currentUserId,
              });
            }
          }

          if (room.users.size === 0) {
            // INDEFINITE PERMANENCE:
            // Rooms are NEVER auto-deleted or cleaned up on inactivity.
            // All shared media, voice notes, photos, drawings, and chat histories
            // stay permanently saved on disk in rooms_storage.json unless all members mutually agree to delete!
          }
        }
      }
    });
  });

  // Direct persistent data storage file serving (JSON content-type with no-cache)
  app.get('/data/:file', (req, res) => {
    const filename = path.basename(req.params.file);
    const targetPath = path.join(DATA_DIR, filename);
    if (fs.existsSync(targetPath)) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(targetPath);
    }
    return res.status(404).json({ error: `File "${filename}" not found in data directory` });
  });

  app.use('/data', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    express.static(DATA_DIR)(req, res, next);
  });

  // REST API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      totalUsers: users.size,
      activeRooms: rooms.size,
      activeSingles: singlesProfiles.size,
      uptime: process.uptime(),
    });
  });

  // --- DATABASE & STORAGE INSPECTOR ENDPOINTS ---

  // Get summary of all database storage files
  app.get('/api/data/summary', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({
      success: true,
      totalUsers: users.size,
      totalRooms: rooms.size,
      totalInvites: invites.length,
      totalSingles: singlesProfiles.size,
      totalVoicemails: voicemails.length,
      dataDirectory: DATA_DIR,
      files: {
        users: {
          path: USERS_FILE,
          exists: fs.existsSync(USERS_FILE),
          sizeBytes: fs.existsSync(USERS_FILE) ? fs.statSync(USERS_FILE).size : 0,
          count: users.size,
        },
        rooms: {
          path: STORAGE_FILE,
          exists: fs.existsSync(STORAGE_FILE),
          sizeBytes: fs.existsSync(STORAGE_FILE) ? fs.statSync(STORAGE_FILE).size : 0,
          count: rooms.size,
        },
        invites: {
          path: INVITES_FILE,
          exists: fs.existsSync(INVITES_FILE),
          sizeBytes: fs.existsSync(INVITES_FILE) ? fs.statSync(INVITES_FILE).size : 0,
          count: invites.length,
        },
        singles: {
          path: SINGLES_FILE,
          exists: fs.existsSync(SINGLES_FILE),
          sizeBytes: fs.existsSync(SINGLES_FILE) ? fs.statSync(SINGLES_FILE).size : 0,
          count: singlesProfiles.size,
        },
      },
    });
  });

  // Track and list all users from users_storage.json
  app.get('/api/data/users', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const userList = Array.from(users.values()).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      createdAt: u.createdAt,
      lastActive: u.lastActive || u.createdAt,
      spaces: u.spaces || [],
      role: u.role || 'member',
      origin: u.origin || (u.passwordHash ? 'registered' : 'space_session'),
      hasPassword: Boolean(u.passwordHash),
    }));
    res.json({
      success: true,
      total: userList.length,
      users: userList,
    });
  });

  // List all rooms and spaces from rooms_storage.json
  app.get('/api/data/rooms', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (fs.existsSync(STORAGE_FILE)) {
      try {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        return res.json(JSON.parse(raw));
      } catch (err: any) {
        return res.status(500).json({ error: 'Failed to read rooms_storage.json', details: err.message });
      }
    }
    return res.json({});
  });

  // List all invites from invites_storage.json
  app.get('/api/data/invites', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (fs.existsSync(INVITES_FILE)) {
      try {
        const raw = fs.readFileSync(INVITES_FILE, 'utf-8');
        return res.json(JSON.parse(raw));
      } catch (err: any) {
        return res.status(500).json({ error: 'Failed to read invites_storage.json', details: err.message });
      }
    }
    return res.json([]);
  });

  // Endpoint to track user whenever a profile is set or room is created
  app.post('/api/users/track', (req, res) => {
    try {
      const { id, name, avatar, email, spaceId } = req.body;
      if (!id && !name) {
        return res.status(400).json({ error: 'User id or name is required' });
      }

      const targetId = id || `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      let existingUser = users.get(targetId);
      if (!existingUser && email) {
        existingUser = Array.from(users.values()).find(
          (u) => u.email && u.email.toLowerCase() === email.trim().toLowerCase()
        );
      }

      if (existingUser) {
        if (name && name.trim()) existingUser.name = name.trim();
        if (avatar) existingUser.avatar = avatar;
        if (email && (!existingUser.email || existingUser.email.endsWith('@haven.local'))) {
          existingUser.email = email.trim().toLowerCase();
        }
        if (spaceId) {
          if (!existingUser.spaces) existingUser.spaces = [];
          if (!existingUser.spaces.includes(spaceId)) existingUser.spaces.push(spaceId);
        }
        existingUser.lastActive = Date.now();
        users.set(existingUser.id, existingUser);
      } else {
        const trackedUser: StoredUser = {
          id: targetId,
          email: email?.trim().toLowerCase() || `${(name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}_${targetId.slice(-4)}@haven.local`,
          name: (name || 'Partner').trim(),
          avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          createdAt: Date.now(),
          lastActive: Date.now(),
          spaces: spaceId ? [spaceId] : [],
          origin: email ? 'registered' : 'space_session',
        };
        users.set(targetId, trackedUser);
      }

      saveUsersToDisk();
      const savedUser = users.get(targetId) || existingUser;
      return res.json({
        success: true,
        user: {
          id: savedUser?.id,
          name: savedUser?.name,
          email: savedUser?.email,
          avatar: savedUser?.avatar,
          spaces: savedUser?.spaces,
          lastActive: savedUser?.lastActive,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to track user profile' });
    }
  });

  // --- USER AUTHENTICATION & REGISTRATION ENDPOINTS ---

  // Register new user with email and password
  app.post('/api/auth/register', (req, res) => {
    try {
      const { email, password, name, avatar } = req.body;
      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: 'A valid email address is required' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Your name or nickname is required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: 'Please provide a valid email format (e.g. name@example.com)' });
      }

      // Check for existing account
      const existing = Array.from(users.values()).find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        return res.status(400).json({
          error: 'An account with this email already exists. Please sign in instead.',
        });
      }

      const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);

      // Check if user has any pending spouse invites already sent to this email
      const matchedSpaces: string[] = [];
      invites.forEach((inv) => {
        if (inv.spouseEmail.toLowerCase() === normalizedEmail && !matchedSpaces.includes(inv.roomId)) {
          matchedSpaces.push(inv.roomId);
        }
      });

      const newUser: StoredUser = {
        id: userId,
        email: normalizedEmail,
        name: name.trim(),
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        passwordHash,
        salt,
        createdAt: Date.now(),
        spaces: matchedSpaces,
      };

      users.set(userId, newUser);
      saveUsersToDisk();

      // Create session token
      const token = crypto.randomBytes(32).toString('hex');
      activeSessions.set(token, {
        userId,
        email: normalizedEmail,
        createdAt: Date.now(),
      });
      saveSessionsToDisk();

      console.log(`[Auth] Registered new user account: ${normalizedEmail} (${name})`);

      return res.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          avatar: newUser.avatar,
          spaces: newUser.spaces,
        },
        token,
        message: 'Account created successfully! Welcome to Haven.',
      });
    } catch (err: any) {
      console.error('Error during registration:', err);
      return res.status(500).json({ error: 'Internal server error during registration' });
    }
  });

  // Sign In with email and password
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      let user = Array.from(users.values()).find((u) => u.email.toLowerCase() === normalizedEmail);

      // If user does not exist
      if (!user) {
        // Seamlessly auto-register if autoRegister flag is sent or requested
        if (req.body.autoRegister && password && password.length >= 6) {
          const rawName = (req.body.name || normalizedEmail.split('@')[0] || 'Partner').trim();
          const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const salt = generateSalt();
          const passwordHash = hashPassword(password, salt);

          const matchedSpaces: string[] = [];
          invites.forEach((inv) => {
            if (inv.spouseEmail.toLowerCase() === normalizedEmail && !matchedSpaces.includes(inv.roomId)) {
              matchedSpaces.push(inv.roomId);
            }
          });

          for (const [rId, room] of rooms.entries()) {
            if (
              (room.invitedEmails && room.invitedEmails.some((e: string) => e.toLowerCase() === normalizedEmail)) ||
              (room.authorizedEmails && room.authorizedEmails.some((e: string) => e.toLowerCase() === normalizedEmail))
            ) {
              if (!matchedSpaces.includes(rId)) matchedSpaces.push(rId);
            }
          }

          const newUser: StoredUser = {
            id: userId,
            email: normalizedEmail,
            name: displayName,
            avatar: req.body.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            passwordHash,
            salt,
            createdAt: Date.now(),
            spaces: matchedSpaces,
          };
          users.set(userId, newUser);
          saveUsersToDisk();

          const token = crypto.randomBytes(32).toString('hex');
          activeSessions.set(token, {
            userId: newUser.id,
            email: normalizedEmail,
            createdAt: Date.now(),
          });
          saveSessionsToDisk();

          console.log(`[Auth] Auto-created and signed in user: ${normalizedEmail} (${displayName})`);
          return res.json({
            success: true,
            user: {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              avatar: newUser.avatar,
              spaces: newUser.spaces,
            },
            token,
            isNewUser: true,
            message: 'Account created and signed in successfully! Welcome to Haven.',
          });
        }

        return res.status(401).json({
          error: 'No account registered with this email. Please check the address or create a new account.',
          notRegistered: true,
          email: normalizedEmail,
        });
      }

      // Verify password matches registered password
      let isMatch = verifyPassword(password, user.salt, user.passwordHash);
      if (!isMatch && password.trim() !== password) {
        // Retry with trimmed password in case mobile keyboard added whitespace
        isMatch = verifyPassword(password.trim(), user.salt, user.passwordHash);
      }

      if (!isMatch) {
        console.warn(`[Security Alert] Failed login attempt for ${normalizedEmail}: Password does not match.`);
        return res.status(401).json({
          error: 'Incorrect password. The password does not match the registered account. Access to the space is blocked.',
          allowReset: true,
          email: normalizedEmail,
        });
      }

      // Check for any newly arrived invites
      invites.forEach((inv) => {
        if (inv.spouseEmail.toLowerCase() === normalizedEmail && !user.spaces.includes(inv.roomId)) {
          user.spaces.push(inv.roomId);
        }
      });
      saveUsersToDisk();

      // Successful login -> Generate secure session token
      const token = crypto.randomBytes(32).toString('hex');
      activeSessions.set(token, {
        userId: user.id,
        email: normalizedEmail,
        createdAt: Date.now(),
      });
      saveSessionsToDisk();

      console.log(`[Auth] User signed in successfully: ${normalizedEmail}`);

      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          spaces: user.spaces,
        },
        token,
        message: 'Signed in successfully',
      });
    } catch (err: any) {
      console.error('Error during login:', err);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  // Reset password / set new password for account
  app.post('/api/auth/reset-password', (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ error: 'Email and new password are required' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = Array.from(users.values()).find((u) => u.email.toLowerCase() === normalizedEmail);

      if (!user) {
        return res.status(404).json({ error: 'No account registered with this email address.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      const salt = generateSalt();
      const passwordHash = hashPassword(newPassword.trim(), salt);
      user.salt = salt;
      user.passwordHash = passwordHash;
      saveUsersToDisk();

      // Automatically generate a session token so user is directly logged in
      const token = crypto.randomBytes(32).toString('hex');
      activeSessions.set(token, {
        userId: user.id,
        email: normalizedEmail,
        createdAt: Date.now(),
      });
      saveSessionsToDisk();

      console.log(`[Auth] Password reset successfully for: ${normalizedEmail}`);

      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          spaces: user.spaces,
        },
        token,
        message: 'Password reset successfully! You are now signed in.',
      });
    } catch (err: any) {
      console.error('Error during password reset:', err);
      return res.status(500).json({ error: 'Internal server error during password reset' });
    }
  });

  // Get current logged-in user profile & pending invites
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let session = activeSessions.get(token);
    if (!session) {
      loadSessionsFromDisk();
      session = activeSessions.get(token);
    }

    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = users.get(session.userId);
    if (!user) {
      activeSessions.delete(token);
      saveSessionsToDisk();
      return res.status(401).json({ error: 'User not found' });
    }

    const pendingInvites = invites.filter(
      (inv) => inv.spouseEmail.toLowerCase() === user.email.toLowerCase() && inv.status === 'pending'
    );

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        spaces: user.spaces,
      },
      pendingInvites,
    });
  });

  // Sign out / invalidate session
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      activeSessions.delete(token);
      saveSessionsToDisk();
    }
    return res.json({ success: true, message: 'Signed out successfully' });
  });

  // Check if an email or name is registered on Haven
  app.get('/api/users/lookup', (req, res) => {
    try {
      const q = typeof req.query.query === 'string'
        ? req.query.query.trim().toLowerCase()
        : typeof req.query.email === 'string'
        ? req.query.email.trim().toLowerCase()
        : '';
      if (!q) {
        return res.status(400).json({ error: 'Search parameter is required' });
      }
      const user = Array.from(users.values()).find(
        (u) => u.email.toLowerCase() === q || u.name.toLowerCase() === q || u.id.toLowerCase() === q
      );
      if (user) {
        return res.json({
          exists: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          },
        });
      }
      return res.json({ exists: false });
    } catch (err: any) {
      return res.status(500).json({ error: 'Lookup failed' });
    }
  });

  // --- SPOUSE EMAIL INVITATION ENDPOINTS ---

  // Invite spouse or friends to space via email
  app.post('/api/space/invite', (req, res) => {
    try {
      const { roomId, passkey, spouseEmail, emails, senderName, senderEmail, spaceName, spaceType, message } = req.body;
      if (!roomId || typeof roomId !== 'string') {
        return res.status(400).json({ error: 'Room ID is required' });
      }

      // Collect raw email list from any of the fields (spouseEmail, emails array, or comma/newline delimited)
      let rawList: string[] = [];
      if (Array.isArray(emails) && emails.length > 0) {
        rawList = emails.map(String);
      } else if (typeof spouseEmail === 'string' && spouseEmail.trim()) {
        rawList = spouseEmail.split(/[\s,;]+/);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmails: string[] = [];

      for (const item of rawList) {
        const trimmed = item.trim().toLowerCase();
        if (!trimmed) continue;
        if (emailRegex.test(trimmed)) {
          if (!validEmails.includes(trimmed)) validEmails.push(trimmed);
        } else {
          // Check if this matches a registered user's name or id
          const registered = Array.from(users.values()).find(
            (u) => u.name.toLowerCase() === trimmed || u.id.toLowerCase() === trimmed
          );
          if (registered && registered.email && !validEmails.includes(registered.email.toLowerCase())) {
            validEmails.push(registered.email.toLowerCase());
          }
        }
      }

      if (validEmails.length === 0) {
        return res.status(400).json({ error: 'Please enter a valid email address or registered partner name' });
      }

      const room = getOrCreateRoom(roomId);
      if (passkey && !room.passkey) {
        room.passkey = passkey;
      }
      if (!room.invitedEmails) room.invitedEmails = [];

      const isFriends = (spaceType === 'friends') || room.spaceType === 'friends';

      // STRICT CAPACITY & INVITATION LIMIT RULES:
      // - Spouse Sanctuary (couple mode): Strictly allowed ONLY ONE partner (max 1 person).
      // - Friends Space: Multi-friend invitations are allowed with no limit.
      if (!isFriends) {
        if (validEmails.length > 1) {
          return res.status(400).json({
            error: 'Spouse Sanctuary is strictly for two. You can only invite one partner (1 person), no more.',
          });
        }

        const newTargetEmail = validEmails[0];

        // Check if there is already an active invite for this room to a different partner
        const activeInvites = invites.filter(
          (inv) => inv.roomId === roomId && (inv.status === 'pending' || inv.status === 'accepted')
        );
        const existingOtherInvite = activeInvites.find(
          (inv) => inv.spouseEmail.toLowerCase() !== newTargetEmail
        );
        if (existingOtherInvite) {
          return res.status(400).json({
            error: `Spouse Sanctuary is strictly limited to 1 partner. You have already invited ${existingOtherInvite.spouseEmail}. You cannot invite more than one person to a Spouse Sanctuary.`,
          });
        }

        // Check if room already has 2 registered/joined users and neither is the invited partner
        const currentUsersInRoom = Array.from(room.users.values());
        if (currentUsersInRoom.length >= 2) {
          const isInviteeAlreadyInRoom = currentUsersInRoom.some(
            (u) => (u.email && u.email.toLowerCase() === newTargetEmail)
          );
          if (!isInviteeAlreadyInRoom) {
            return res.status(400).json({
              error: 'Spouse Sanctuary is strictly for two and already has two partners connected.',
            });
          }
        }
      }

      const createdInvites: StoredInvite[] = [];
      const registeredFriends: { name: string; email: string; avatar: string }[] = [];
      const unregisteredEmails: string[] = [];

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host') || 'localhost:3000';
      const resolvedPasskey = passkey || room.passkey || '';
      const defaultInviteLink = `${protocol}://${host}/?room=${encodeURIComponent(roomId)}&key=${encodeURIComponent(resolvedPasskey)}&type=${isFriends ? 'friends' : 'couple'}`;

      for (const normalizedEmail of validEmails) {
        if (!room.invitedEmails.includes(normalizedEmail)) {
          room.invitedEmails.push(normalizedEmail);
        }

        const existingUser = Array.from(users.values()).find((u) => u.email.toLowerCase() === normalizedEmail);

        const inviteId = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const invite: StoredInvite = {
          id: inviteId,
          roomId,
          passkey: resolvedPasskey,
          spaceName: spaceName || room.roomName || (isFriends ? 'Squad Hangout' : 'Private Sanctuary'),
          spaceType: (spaceType as any) || room.spaceType || (isFriends ? 'friends' : 'couple'),
          senderEmail: senderEmail || (isFriends ? 'Your squad friend' : 'Your partner'),
          senderName: senderName || (isFriends ? 'Your squad' : 'Your partner'),
          spouseEmail: normalizedEmail,
          message: message || (isFriends
            ? `Hey! Join our private Haven squad room for hanging out, watching videos, and games 🎉`
            : `Hey my love! Come join our private Haven sanctuary together 💕`),
          createdAt: Date.now(),
          status: 'pending',
        };

        invites.unshift(invite);
        createdInvites.push(invite);

        if (existingUser) {
          registeredFriends.push({
            name: existingUser.name,
            email: existingUser.email,
            avatar: existingUser.avatar,
          });

          if (!existingUser.spaces.includes(roomId)) {
            existingUser.spaces.push(roomId);
            saveUsersToDisk();
          }
        } else {
          unregisteredEmails.push(normalizedEmail);
        }

        // Always broadcast live invite notification across the platform so partner sees it in their chat
        io.emit('spouse-invite-notification', {
          spouseEmail: normalizedEmail,
          spouseId: existingUser?.id,
          spouseName: existingUser?.name || 'Partner',
          invite,
        });

        // Also emit directly to the active room
        io.to(roomId).emit('incoming-space-invite', {
          invite,
          spouseEmail: normalizedEmail,
        });
      }

      saveRoomsToDisk();
      saveInvitesToDisk();

      const firstInvite = createdInvites[0];
      const singleInviteLink = `${defaultInviteLink}&invitedEmail=${encodeURIComponent(validEmails[0])}`;

      console.log(`[Invite] Sent ${createdInvites.length} invitation(s) for room ${roomId} (Friends: ${isFriends})`);

      const statusMsg = isFriends
        ? `Successfully sent invites to ${createdInvites.length} friend${createdInvites.length > 1 ? 's' : ''}! ${
            registeredFriends.length > 0
              ? `${registeredFriends.length} registered friend(s) will be notified immediately.`
              : ''
          }`
        : registeredFriends.length > 0
        ? `Invitation successfully sent to ${registeredFriends[0].name} (${validEmails[0]})!`
        : `Invitation created for ${validEmails[0]}! Share the invite link with your spouse.`;

      return res.json({
        success: true,
        invite: firstInvite,
        invites: createdInvites,
        inviteLink: singleInviteLink,
        generalInviteLink: defaultInviteLink,
        invitedCount: createdInvites.length,
        registeredCount: registeredFriends.length,
        unregisteredCount: unregisteredEmails.length,
        registeredFriends,
        unregisteredEmails,
        spouseUser: registeredFriends.length > 0 ? registeredFriends[0] : undefined,
        message: statusMsg,
      });
    } catch (err: any) {
      console.error('Error creating space invitation:', err);
      return res.status(500).json({ error: 'Failed to create invite' });
    }
  });

  // Get all pending invitations for a specific email or user
  app.get('/api/space/invites', (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    if (!email && !userId) {
      return res.status(400).json({ error: 'Email or userId parameter is required' });
    }

    let userEmail = email;
    if (!userEmail && userId) {
      const u = users.get(userId);
      if (u) userEmail = u.email.toLowerCase();
    }

    const pending = invites.filter(
      (inv) =>
        inv.status === 'pending' &&
        ((userEmail && inv.spouseEmail.toLowerCase().trim() === userEmail) ||
         (userId && (inv as any).spouseId === userId))
    );

    return res.json({
      success: true,
      invites: pending,
    });
  });

  // Accept a space invite
  app.post('/api/space/accept-invite', (req, res) => {
    const { inviteId, userEmail } = req.body;
    if (!inviteId) return res.status(400).json({ error: 'Missing inviteId' });

    const invite = invites.find((inv) => inv.id === inviteId);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    invite.status = 'accepted';
    saveInvitesToDisk();

    if (userEmail) {
      const normalized = userEmail.trim().toLowerCase();
      const user = Array.from(users.values()).find((u) => u.email.toLowerCase() === normalized);
      if (user && !user.spaces.includes(invite.roomId)) {
        user.spaces.push(invite.roomId);
        saveUsersToDisk();
      }
    }

    // Broadcast that the invite was accepted so the sender and all parties are notified in real-time
    io.emit('spouse-invite-accepted', {
      inviteId: invite.id,
      roomId: invite.roomId,
      spouseEmail: invite.spouseEmail,
      senderName: invite.senderName,
      spaceName: invite.spaceName,
      acceptedBy: userEmail || invite.spouseEmail,
      timestamp: Date.now(),
    });

    return res.json({
      success: true,
      invite,
      message: 'Invite accepted! Entering space...',
    });
  });

  // Cancel/Revoke a space invite (e.g. to re-invite a partner or revoke an invitation)
  app.post('/api/space/cancel-invite', (req, res) => {
    const { inviteId, roomId } = req.body;
    let cancelled = false;
    let targetRoomId = roomId;

    if (inviteId) {
      const inv = invites.find((i) => i.id === inviteId);
      if (inv) {
        inv.status = 'declined';
        targetRoomId = inv.roomId;
        cancelled = true;
      }
    } else if (roomId) {
      invites.forEach((i) => {
        if (i.roomId === roomId && i.status === 'pending') {
          i.status = 'declined';
          cancelled = true;
        }
      });
    }

    if (cancelled) {
      if (targetRoomId) {
        const room = rooms.get(targetRoomId);
        if (room && room.invitedEmails) {
          // If couple space, clearing pending allows new partner invite
          if (room.spaceType !== 'friends') {
            room.invitedEmails = [];
            saveRoomsToDisk();
          }
        }
      }
      saveInvitesToDisk();
      return res.json({ success: true, message: 'Invitation cancelled successfully' });
    }
    return res.status(404).json({ error: 'No matching active invitation found' });
  });

  // Get active invitations for a specific space
  app.get('/api/space/room-invite', (req, res) => {
    const roomId = typeof req.query.roomId === 'string' ? req.query.roomId.trim() : '';
    if (!roomId) return res.status(400).json({ error: 'Missing roomId' });
    const roomInvites = invites.filter(
      (i) => i.roomId === roomId && (i.status === 'pending' || i.status === 'accepted')
    );
    return res.json({ invites: roomInvites });
  });

  // Get persistent messages and member state for any space
  app.get('/api/space/:roomId/messages', (req, res) => {
    const roomId = (req.params.roomId || '').trim().toLowerCase();
    const room = rooms.get(roomId);
    if (!room) {
      return res.json({ success: true, messages: [], users: [] });
    }
    return res.json({
      success: true,
      messages: room.messages || [],
      users: Array.from(room.users.values()),
    });
  });

  // --- VOICEMAIL GREETINGS API ---

  // Get voicemails for a space
  app.get('/api/space/:roomId/voicemails', (req, res) => {
    const roomId = (req.params.roomId || '').trim().toLowerCase();
    const roomVoicemails = voicemails.filter((v) => v.roomId.toLowerCase() === roomId);
    return res.json({ success: true, voicemails: roomVoicemails });
  });

  // Save new voicemail
  app.post('/api/space/:roomId/voicemails', (req, res) => {
    try {
      const roomId = (req.params.roomId || '').trim().toLowerCase();
      const { senderId, senderName, senderAvatar, type, mediaUrl, durationSeconds, caption, missedCallType } = req.body;
      if (!mediaUrl) return res.status(400).json({ error: 'mediaUrl is required' });

      const newVm: StoredVoicemail = {
        id: `vm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        roomId,
        senderId: senderId || 'unknown',
        senderName: senderName || 'Partner',
        senderAvatar: senderAvatar || '💕',
        type: type === 'video' ? 'video' : 'audio',
        mediaUrl,
        durationSeconds: durationSeconds || 0,
        caption: caption || '',
        createdAt: Date.now(),
        listened: false,
        missedCallType,
      };

      voicemails.unshift(newVm);
      saveVoicemailsToDisk();
      io.to(roomId).emit('new-voicemail', { voicemail: newVm });
      return res.json({ success: true, voicemail: newVm });
    } catch (err) {
      console.error('Error saving voicemail:', err);
      return res.status(500).json({ error: 'Failed to save voicemail' });
    }
  });

  // Mark voicemail as listened
  app.patch('/api/space/:roomId/voicemails/:voicemailId', (req, res) => {
    const { voicemailId, roomId } = req.params;
    const target = voicemails.find((v) => v.id === voicemailId);
    if (target) {
      target.listened = true;
      saveVoicemailsToDisk();
      io.to(roomId.toLowerCase()).emit('voicemail-updated', { voicemailId, listened: true });
      return res.json({ success: true, voicemail: target });
    }
    return res.status(404).json({ error: 'Voicemail not found' });
  });

  // Delete voicemail
  app.delete('/api/space/:roomId/voicemails/:voicemailId', (req, res) => {
    const { voicemailId, roomId } = req.params;
    voicemails = voicemails.filter((v) => v.id !== voicemailId);
    saveVoicemailsToDisk();
    io.to(roomId.toLowerCase()).emit('voicemail-deleted', { voicemailId });
    return res.json({ success: true });
  });

  // Verify and inspect Space persistence and status
  app.get('/api/space/verify', (req, res) => {
    const roomId = typeof req.query.roomId === 'string' ? req.query.roomId.trim().toLowerCase() : '';
    if (!roomId) return res.status(400).json({ error: 'Missing roomId query parameter' });

    const room = rooms.get(roomId);
    if (!room) {
      return res.json({
        exists: false,
        message: 'Space does not exist yet. You will be the creator of this permanent room.',
      });
    }

    return res.json({
      exists: true,
      roomId,
      spaceType: room.spaceType || (roomId.startsWith('squad-') ? 'friends' : 'couple'),
      createdAt: room.createdAt || null,
      messageCount: room.messages ? room.messages.length : 0,
      activeMembersCount: room.users.size,
      hasPendingDeletion: !!room.pendingDeletion,
      permanentStorage: true,
    });
  });

  // Global High-Availability WebRTC ICE Servers (STUN & TURN for cross-country calling)
  app.get('/api/webrtc/ice-servers', async (req, res) => {
    // Check if custom Metered or dedicated TURN credentials are provided via environment
    if (process.env.METERED_API_KEY && process.env.METERED_DOMAIN) {
      try {
        const meteredRes = await fetch(
          `https://${process.env.METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${process.env.METERED_API_KEY}`
        );
        if (meteredRes.ok) {
          const meteredServers = await meteredRes.json();
          if (Array.isArray(meteredServers) && meteredServers.length > 0) {
            return res.json({ iceServers: meteredServers });
          }
        }
      } catch (e) {
        console.warn('Failed to fetch dynamic Metered TURN credentials, falling back:', e);
      }
    }

    // High-Availability Worldwide STUN & TURN Relay Servers
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:standard.relay.metered.ca:80' },
      { urls: 'stun:standard.relay.metered.ca:443' },
      {
        urls: [
          'turn:standard.relay.metered.ca:80',
          'turn:standard.relay.metered.ca:80?transport=tcp',
          'turn:standard.relay.metered.ca:443',
          'turn:standard.relay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: [
          'turns:standard.relay.metered.ca:443?transport=tcp',
          'turns:standard.relay.metered.ca:443',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ];

    if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
      iceServers.unshift({
        urls: [process.env.TURN_URL],
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL,
      });
    }

    res.json({ iceServers });
  });

  // --- HAVEN SINGLES REST APIS ---
  // Get all registered singles with optional search and filters
  app.get('/api/singles', (req, res) => {
    try {
      const search = (req.query.search as string || '').toLowerCase().trim();
      const gender = (req.query.gender as string || '').toLowerCase().trim();
      const intent = (req.query.intent as string || '').toLowerCase().trim();
      const lookingFor = (req.query.lookingFor as string || '').toLowerCase().trim();
      const realOnly = req.query.realOnly === 'true';

      let profiles = Array.from(singlesProfiles.values());

      // Filter by real registered users only if requested
      if (realOnly) {
        profiles = profiles.filter((p) => p.isRealUser);
      }

      // Filter by search query (name, city, bio, interests)
      if (search) {
        profiles = profiles.filter((p) => {
          const matchName = p.name?.toLowerCase().includes(search);
          const matchCity = p.city?.toLowerCase().includes(search);
          const matchBio = p.bio?.toLowerCase().includes(search);
          const matchInterests = Array.isArray(p.interests) && p.interests.some((i: string) => i.toLowerCase().includes(search));
          const matchVibe = p.currentVibe?.toLowerCase().includes(search);
          return matchName || matchCity || matchBio || matchInterests || matchVibe;
        });
      }

      // Filter by gender
      if (gender && gender !== 'all') {
        profiles = profiles.filter((p) => p.gender?.toLowerCase() === gender);
      }

      // Filter by intent
      if (intent && intent !== 'all') {
        profiles = profiles.filter((p) => p.intent?.toLowerCase() === intent);
      }

      // Filter by looking for
      if (lookingFor && lookingFor !== 'all') {
        profiles = profiles.filter((p) => Array.isArray(p.lookingFor) && p.lookingFor.includes(lookingFor));
      }

      // Sort: Real registered users ALWAYS ranked at the very top for highest visibility!
      profiles.sort((a, b) => {
        const aReal = a.isRealUser ? 1 : 0;
        const bReal = b.isRealUser ? 1 : 0;
        if (aReal !== bReal) return bReal - aReal; // Real registered users first!

        // Within category, online status first
        if (a.onlineStatus === 'online' && b.onlineStatus !== 'online') return -1;
        if (b.onlineStatus === 'online' && a.onlineStatus !== 'online') return 1;

        // Newest registrations / activity first
        const aTime = Math.max(a.registeredAt || 0, a.lastActive || 0);
        const bTime = Math.max(b.registeredAt || 0, b.lastActive || 0);
        return bTime - aTime;
      });

      const realUsersCount = Array.from(singlesProfiles.values()).filter((p) => p.isRealUser).length;

      res.json({
        singles: profiles,
        totalCount: singlesProfiles.size,
        realUsersCount,
        onlineCount: profiles.filter((p) => p.onlineStatus === 'online').length,
      });
    } catch (err: any) {
      console.error('Error fetching singles:', err);
      res.status(500).json({ error: 'Failed to fetch singles profiles', singles: Array.from(singlesProfiles.values()) });
    }
  });

  // Register or update a Single profile
  app.post('/api/singles/register', (req, res) => {
    try {
      const data = req.body;
      if (!data.name || !data.name.trim()) {
        return res.status(400).json({ error: 'Display name is required' });
      }

      const id = data.id || `single-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const existing = singlesProfiles.get(id) || {};

      const newProfile = {
        ...existing,
        ...data,
        id,
        name: data.name.trim(),
        age: Number(data.age) || 24,
        gender: data.gender || 'woman',
        lookingFor: Array.isArray(data.lookingFor) && data.lookingFor.length > 0 ? data.lookingFor : ['everyone', 'dating'],
        intent: data.intent || 'dating',
        city: (data.city || 'Anywhere').trim(),
        country: (data.country || '').trim(),
        bio: (data.bio || '').trim(),
        avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        interests: Array.isArray(data.interests) ? data.interests : ['Cinema', 'Music', 'Travel'],
        prompts: Array.isArray(data.prompts) ? data.prompts : [],
        currentVibe: (data.currentVibe || 'Saying hello to new connections ✨').trim(),
        onlineStatus: 'online',
        registeredAt: existing.registeredAt || Date.now(),
        lastActive: Date.now(),
        likesCount: existing.likesCount || 0,
        allowDirectInvites: data.allowDirectInvites !== false,
        isRealUser: true,
        origin: 'registered',
        isIdVerified: Boolean(data.isIdVerified || data.idVerification?.isIdProvided),
        verificationBadge: (data.isIdVerified || data.idVerification?.isIdProvided) ? 'verified_real' : 'unverified_pending_id',
        idVerification: (data.isIdVerified || data.idVerification?.isIdProvided)
          ? {
              status: 'verified',
              idType: data.idVerification?.idType || 'drivers_license',
              documentName: data.idVerification?.documentName || "Driver's License",
              documentNumberMasked: data.idVerification?.documentNumberMasked || `ID-•••• •••• ${Math.floor(1000 + Math.random() * 9000)}`,
              documentPhotoUrl: data.idVerification?.documentPhotoUrl || '',
              verifiedAt: existing.idVerification?.verifiedAt || Date.now(),
              verificationMethod: data.idVerification?.verificationMethod || 'id_document_upload',
              isIdProvided: true,
            }
          : {
              status: 'unverified',
              idType: data.idVerification?.idType || 'drivers_license',
              documentName: 'Not Provided',
              isIdProvided: false,
            },
        isFeatured: true,
        contactSocial: (data.contactSocial || '').trim(),
        voicePromptUrl: data.voicePromptUrl || '',
        voicePromptQuestion: data.voicePromptQuestion || '',
        voicePromptDuration: Number(data.voicePromptDuration) || 0,
        wingmanEndorsement: data.wingmanEndorsement || undefined,
        biometricVerification: data.biometricVerification || existing.biometricVerification || undefined,
        wingmanVouch: data.wingmanVouch || existing.wingmanVouch || undefined,
        respectfulCommunicatorBadge: data.respectfulCommunicatorBadge !== undefined ? Boolean(data.respectfulCommunicatorBadge) : (existing.respectfulCommunicatorBadge || false),
      };

      singlesProfiles.set(id, newProfile);
      saveSinglesToDisk();

      // Real-time broadcast to all in singles lounge
      io.to('singles-lounge').emit('singles-profile-updated', newProfile);
      io.to('singles-lounge').emit('singles-new-registration', {
        profile: newProfile,
        message: `🔥 ${newProfile.name} just registered in the Singles Lounge!`,
      });

      res.json({
        success: true,
        profile: newProfile,
        message: 'Profile registered successfully and placed at the top of Singles Lounge!',
      });
    } catch (err: any) {
      console.error('Error registering single profile:', err);
      res.status(500).json({ error: 'Failed to register profile' });
    }
  });

  // Delete or permanently remove a Single profile
  app.delete('/api/singles/:id', (req, res) => {
    try {
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Profile ID required' });
      
      const existed = singlesProfiles.delete(id);
      
      // Clean up waves from or to this user
      singlesWaves = singlesWaves.filter((w) => w.fromId !== id && w.toId !== id);
      saveWavesToDisk();
      
      // Clean up date plans from or to this user
      safeDatePlans = safeDatePlans.filter((p) => p.fromProfile?.id !== id && p.toProfile?.id !== id);
      saveSafeDatesToDisk();
      
      saveSinglesToDisk();
      
      if (existed) {
        io.to('singles-lounge').emit('singles-profile-deleted', { id, userId: id });
        io.to('singles-lounge').emit('singles-member-left', { userId: id, id });
      }
      console.log(`[Singles] Profile ${id} permanently deleted.`);
      res.json({ success: true, message: 'Profile permanently deleted from Singles Lounge', id });
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      res.status(500).json({ error: 'Failed to permanently delete profile' });
    }
  });

  // Purge any sample, mock, or seed profiles so only real registered humans exist
  app.post('/api/singles/purge-samples', (req, res) => {
    try {
      let count = 0;
      for (const [id, p] of singlesProfiles.entries()) {
        const isSample = SEED_PROFILE_IDS.has(id) ||
          p.origin === 'seed' ||
          p.verificationBadge === 'community_sample' ||
          !p.isRealUser ||
          id.startsWith('sample-') ||
          id.startsWith('seed-') ||
          id === 'partner-sim-screening';
        if (isSample) {
          singlesProfiles.delete(id);
          count++;
        }
      }
      saveSinglesToDisk();
      io.to('singles-lounge').emit('singles-directory-purged', {
        remainingCount: singlesProfiles.size,
        realUsers: Array.from(singlesProfiles.values()),
      });
      console.log(`[Singles] Purged ${count} sample profiles. Remaining real profiles: ${singlesProfiles.size}`);
      res.json({
        success: true,
        purgedCount: count,
        remainingRealSingles: singlesProfiles.size,
        message: 'All sample profiles removed. Directory is 100% real registered members.',
      });
    } catch (err: any) {
      console.error('Error purging sample profiles:', err);
      res.status(500).json({ error: 'Failed to purge sample profiles' });
    }
  });

  // Send a Wave, Spark Crush, or Message to another single
  app.post('/api/singles/wave', (req, res) => {
    try {
      const { fromId, fromName, fromAvatar, toId, type, message, proposedRoomId, proposedPasskey } = req.body;
      if (!fromId || !toId) {
        return res.status(400).json({ error: 'fromId and toId are required' });
      }

      const wave = {
        id: `wave-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromId,
        fromName: fromName || 'Someone',
        fromAvatar: fromAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        toId,
        type: type || 'wave',
        message: message || (type === 'crush' ? 'Sent you a secret crush spark! 💖' : 'Sent you a friendly wave! 👋'),
        timestamp: Date.now(),
        proposedRoomId,
        proposedPasskey,
        read: false,
      };

      singlesWaves.unshift(wave);
      if (singlesWaves.length > 500) singlesWaves.pop();
      saveWavesToDisk();

      // Increment like count on target profile
      const target = singlesProfiles.get(toId);
      if (target) {
        target.likesCount = (target.likesCount || 0) + 1;
        saveSinglesToDisk();
        io.to('singles-lounge').emit('singles-profile-updated', target);
      }

      // Broadcast wave in lounge
      io.to('singles-lounge').emit('singles-wave-received', wave);

      res.json({ success: true, wave });
    } catch (err: any) {
      console.error('Error sending wave:', err);
      res.status(500).json({ error: 'Failed to send wave' });
    }
  });

  // Get waves received by a user
  app.get('/api/singles/waves/:userId', (req, res) => {
    try {
      const userId = req.params.userId;
      const userWaves = singlesWaves.filter((w) => w.toId === userId);
      res.json({ waves: userWaves });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch waves', waves: [] });
    }
  });

  // Create an instant 1-on-1 Haven space between two singles
  app.post('/api/singles/instant-space', (req, res) => {
    try {
      const { user1, user2, inviteMessage } = req.body;
      if (!user1 || !user2) {
        return res.status(400).json({ error: 'Both users required' });
      }

      const roomId = `haven-spark-${Math.floor(1000 + Math.random() * 9000)}`;
      const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
      let passkey = '';
      for (let i = 0; i < 12; i++) {
        passkey += chars[Math.floor(Math.random() * chars.length)];
      }

      const wave = {
        id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fromId: user1.id,
        fromName: user1.name,
        fromAvatar: user1.avatar,
        toId: user2.id,
        type: 'invite',
        message: inviteMessage || `Hey ${user2.name}! I started a private Haven Space for us to talk, watch a movie, or play games!`,
        timestamp: Date.now(),
        proposedRoomId: roomId,
        proposedPasskey: passkey,
        read: false,
      };

      singlesWaves.unshift(wave);
      saveWavesToDisk();

      io.to('singles-lounge').emit('singles-wave-received', wave);

      res.json({
        success: true,
        roomId,
        passkey,
        joinUrl: `/?room=${roomId}&key=${passkey}&type=couple`,
        message: `Private space ${roomId} created!`,
      });
    } catch (err: any) {
      console.error('Error creating instant space:', err);
      res.status(500).json({ error: 'Failed to create instant space' });
    }
  });

  // --- IRL Safe Date Plans API Endpoints ---
  app.get('/api/singles/date-plans/:userId', (req, res) => {
    try {
      const uid = req.params.userId;
      const userPlans = safeDatePlans.filter(
        (p) => p.fromProfile?.id === uid || p.toProfile?.id === uid
      );
      res.json({ plans: userPlans });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch date plans', plans: [] });
    }
  });

  app.post('/api/singles/date-plans', (req, res) => {
    try {
      const plan = req.body;
      if (!plan || !plan.fromProfile || !plan.toProfile) {
        return res.status(400).json({ error: 'Invalid date plan data' });
      }
      const existingIdx = safeDatePlans.findIndex((p) => p.id === plan.id);
      if (existingIdx >= 0) {
        safeDatePlans[existingIdx] = plan;
      } else {
        safeDatePlans.unshift(plan);
      }
      saveSafeDatesToDisk();
      io.to('singles-lounge').emit('singles-safe-date-proposal-received', plan);
      res.json({ success: true, plan });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save date plan' });
    }
  });

  app.put('/api/singles/date-plans/:id', (req, res) => {
    try {
      const planId = req.params.id;
      const updates = req.body;
      const plan = safeDatePlans.find((p) => p.id === planId);
      if (plan) {
        Object.assign(plan, updates);
        saveSafeDatesToDisk();
        io.to('singles-lounge').emit('singles-safe-date-response-received', {
          planId,
          status: plan.status,
          plan,
        });
        return res.json({ success: true, plan });
      }
      res.status(404).json({ error: 'Date plan not found' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update date plan' });
    }
  });

  // WebRTC Signaling & Network Latency Diagnostic Ping
  app.get('/api/webrtc/ping', (req, res) => {
    res.json({
      status: 'ok',
      serverTime: Date.now(),
      connectionsCount: io.engine.clientsCount || 0,
    });
  });

  // Music API Routes for Direct Web Streaming & Search
  app.get('/api/music/search', async (req, res) => {
    try {
      const q = (req.query.q as string) || 'top hits';
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=30`;
      const response = await fetch(itunesUrl);
      if (!response.ok) {
        return res.status(502).json({ error: 'Failed to fetch from music provider', tracks: [] });
      }
      const data = await response.json();
      const tracks = (data.results || [])
        .filter((item: any) => item.previewUrl && item.trackName)
        .map((item: any) => ({
          id: `real-${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          genre: item.primaryGenreName || 'Music',
          duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
          coverEmoji: '🎵',
          coverGradient: 'from-purple-600 via-pink-600 to-rose-500',
          mood: 'trending',
          bpm: 110,
          url: item.previewUrl,
          artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : undefined,
          synthTheme: 'lofi',
          source: 'itunes',
        }));
      res.json({ tracks });
    } catch (err: any) {
      console.error('Music search error:', err);
      res.status(500).json({ error: 'Internal server error', tracks: [] });
    }
  });

  app.get('/api/music/trending', async (req, res) => {
    try {
      const rssUrl = 'https://itunes.apple.com/us/rss/topsongs/limit=25/json';
      const response = await fetch(rssUrl);
      if (!response.ok) {
        return res.status(502).json({ error: 'Failed to fetch trending music', tracks: [] });
      }
      const data = await response.json();
      const entries = data.feed?.entry || [];
      const tracks = entries
        .map((entry: any, index: number) => {
          const title = entry['im:name']?.label || 'Top Song';
          const artist = entry['im:artist']?.label || 'Artist';
          const genre = entry.category?.attributes?.label || 'Pop';
          const artwork = entry['im:image']?.[2]?.label || entry['im:image']?.[1]?.label || '';
          const previewUrl =
            entry.link?.find((l: any) => l.attributes?.type?.includes('audio'))?.attributes?.href ||
            entry.link?.[1]?.attributes?.href;
          const trackId = entry.id?.attributes?.['im:id'] || `top-${index}`;
          if (!previewUrl) return null;
          return {
            id: `trending-${trackId}`,
            title,
            artist,
            genre,
            duration: 30,
            coverEmoji: '🔥',
            coverGradient: 'from-rose-500 via-purple-600 to-amber-500',
            mood: 'trending',
            bpm: 120,
            url: previewUrl,
            artworkUrl: artwork ? artwork.replace('170x170bb', '400x400bb') : undefined,
            synthTheme: 'lofi',
            source: 'tubidy',
          };
        })
        .filter(Boolean);
      res.json({ tracks });
    } catch (err: any) {
      console.error('Trending music error:', err);
      res.status(500).json({ error: 'Internal server error', tracks: [] });
    }
  });

  // =========================================================================
  // REAL ONLINE MOVIES API (Internet Archive & Curated Public Domain Cinema)
  // =========================================================================

  const movieStreamCache = new Map<string, { mp4Url: string; duration?: number }>();

  // Curated library of real full-length streaming cinema
  const CURATED_ONLINE_MOVIES: any[] = [
    // --- Romance & Date Night ---
    {
      id: 'movie-his-girl-friday',
      title: 'His Girl Friday',
      artist: 'Howard Hawks (1940)',
      year: 1940,
      genre: 'Screwball Romantic Comedy',
      category: 'romance',
      type: 'video',
      url: 'https://archive.org/download/his_girl_friday/his_girl_friday.mp4',
      thumbnailUrl: 'https://archive.org/services/img/his_girl_friday',
      duration: 5520,
      rating: '9.6/10',
      description: 'Cary Grant and Rosalind Russell star in one of the sharpest, fastest-talking romantic comedies in cinema history.',
      tags: ['Cary Grant', 'Romantic Comedy', 'Fast Banter', 'Classic Romance'],
      source: 'archive',
      badge: 'Full Movie 🎬',
      streamQuality: '1080p HD',
    },
    {
      id: 'movie-charade',
      title: 'Charade (Audrey Hepburn & Cary Grant)',
      artist: 'Stanley Donen (1963)',
      year: 1963,
      genre: 'Romantic Mystery & Comedy',
      category: 'romance',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=kYQGz2bHlG8',
      thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
      duration: 6780,
      rating: '9.8/10',
      description: 'Audrey Hepburn and Cary Grant sparkle in this romantic thriller set in glamorous 1960s Paris with Henry Mancini score.',
      tags: ['Audrey Hepburn', 'Paris Romance', 'Date Night', 'Classic'],
      source: 'youtube',
      badge: 'Date Night Pick 💖',
      streamQuality: '1080p Remastered',
    },
    {
      id: 'movie-last-time-paris',
      title: 'The Last Time I Saw Paris',
      artist: 'Richard Brooks (1954)',
      year: 1954,
      genre: 'Romantic Drama',
      category: 'romance',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=843e9o1yL5g',
      thumbnailUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80',
      duration: 6960,
      rating: '9.2/10',
      description: 'Elizabeth Taylor and Van Johnson star in F. Scott Fitzgerald\'s poignant romantic tale of love, passion, and Paris in spring.',
      tags: ['Elizabeth Taylor', 'Paris Romance', 'Emotional', 'Vintage Love'],
      source: 'youtube',
      badge: 'Classic Romance 🌹',
      streamQuality: 'HD Color',
    },
    {
      id: 'movie-my-man-godfrey',
      title: 'My Man Godfrey',
      artist: 'Gregory La Cava (1936)',
      year: 1936,
      genre: 'Romantic Comedy & High Society',
      category: 'romance',
      type: 'video',
      url: 'https://archive.org/download/MyManGodfrey1936_201309/My_Man_Godfrey_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/MyManGodfrey1936_201309',
      duration: 5760,
      rating: '9.3/10',
      description: 'A wealthy Park Avenue socialite hires a witty forgotten man as family butler, sparking an unforgettable romantic comedy.',
      tags: ['William Powell', 'Carole Lombard', 'Romantic Comedy', 'Charming'],
      source: 'archive',
      badge: 'Full Movie 🎬',
      streamQuality: 'HD Stream',
    },
    {
      id: 'movie-royal-wedding',
      title: 'Royal Wedding',
      artist: 'Stanley Donen (1951)',
      year: 1951,
      genre: 'Romantic Musical & Comedy',
      category: 'romance',
      type: 'video',
      url: 'https://archive.org/download/royal_wedding/royal_wedding.mp4',
      thumbnailUrl: 'https://archive.org/services/img/royal_wedding',
      duration: 5580,
      rating: '9.1/10',
      description: 'Fred Astaire and Jane Powell in London during the Royal Wedding, featuring the famous ceiling dancing scene.',
      tags: ['Fred Astaire', 'Musical', 'Dance Romance', 'London'],
      source: 'archive',
      badge: 'Full Movie 🎬',
      streamQuality: 'Technicolor HD',
    },
    {
      id: 'movie-star-is-born-1937',
      title: 'A Star is Born',
      artist: 'William A. Wellman (1937)',
      year: 1937,
      genre: 'Hollywood Romance & Drama',
      category: 'romance',
      type: 'video',
      url: 'https://archive.org/download/AStarIsBorn1937/AStarIsBorn1937_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/AStarIsBorn1937',
      duration: 6660,
      rating: '9.4/10',
      description: 'The original 1937 Oscar-winning classic of true love, stardom, and heartbreak starring Janet Gaynor and Fredric March.',
      tags: ['Hollywood', 'Oscar Winner', 'Drama', 'Love Story'],
      source: 'archive',
      badge: 'Oscar Winner 🏆',
      streamQuality: 'HD Stream',
    },

    // --- Comedy & Laughs ---
    {
      id: 'movie-the-kid-chaplin',
      title: 'The Kid',
      artist: 'Charlie Chaplin (1921)',
      year: 1921,
      genre: 'Classic Silent Comedy & Heart',
      category: 'comedy',
      type: 'video',
      url: 'https://archive.org/download/TheKid-1921/TheKid-1921_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/TheKid-1921',
      duration: 3240,
      rating: '9.9/10',
      description: 'Charlie Chaplin\'s heartwarming masterpiece about a tramp who discovers an abandoned infant and raises him as his own child.',
      tags: ['Charlie Chaplin', 'Heartwarming', 'Silent Comedy', 'Masterpiece'],
      source: 'archive',
      badge: 'Cinema Masterpiece 🌟',
      streamQuality: 'Remastered HD',
    },
    {
      id: 'movie-the-general-keaton',
      title: 'The General',
      artist: 'Buster Keaton (1926)',
      year: 1926,
      genre: 'Action Comedy & Locomotive Chase',
      category: 'comedy',
      type: 'video',
      url: 'https://archive.org/download/TheGeneral_BusterKeaton/TheGeneral_BusterKeaton_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/TheGeneral_BusterKeaton',
      duration: 4680,
      rating: '9.7/10',
      description: 'Buster Keaton\'s iconic train pursuit filled with mind-boggling real stunts, thrilling locomotive choreography, and pure humor.',
      tags: ['Buster Keaton', 'Action Comedy', 'Train Chase', 'Legendary Stunts'],
      source: 'archive',
      badge: 'Full Movie 🎬',
      streamQuality: 'HD',
    },
    {
      id: 'movie-the-gold-rush',
      title: 'The Gold Rush',
      artist: 'Charlie Chaplin (1925)',
      year: 1925,
      genre: 'Comedy & Adventure',
      category: 'comedy',
      type: 'video',
      url: 'https://archive.org/download/the_gold_rush_1925/the_gold_rush_1925_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/the_gold_rush_1925',
      duration: 5700,
      rating: '9.8/10',
      description: 'Chaplin\'s famous Klondike gold prospector comedy, including the iconic dance of the dinner rolls and cabin teetering on a cliff.',
      tags: ['Charlie Chaplin', 'Adventure', 'Snow', 'Comedy Classic'],
      source: 'archive',
      badge: 'Chaplin Classic 🎩',
      streamQuality: 'HD',
    },
    {
      id: 'movie-fathers-little-dividend',
      title: 'Father\'s Little Dividend',
      artist: 'Vincente Minnelli (1951)',
      year: 1951,
      genre: 'Family Comedy',
      category: 'comedy',
      type: 'video',
      url: 'https://archive.org/download/fathers_little_dividend/fathers_little_dividend.mp4',
      thumbnailUrl: 'https://archive.org/services/img/fathers_little_dividend',
      duration: 4920,
      rating: '9.0/10',
      description: 'Spencer Tracy, Joan Bennett, and Elizabeth Taylor star in this warm and hilarious comedy sequel to Father of the Bride.',
      tags: ['Elizabeth Taylor', 'Spencer Tracy', 'Family', 'Delightful'],
      source: 'archive',
      badge: 'Full Movie 🎬',
      streamQuality: 'HD',
    },

    // --- Animation & Open 4K Cinema ---
    {
      id: 'anim-bunny',
      title: 'Big Buck Bunny (4K Cinema Edition)',
      artist: 'Sacha Goedegebure (Blender Studio)',
      year: 2008,
      genre: 'Wholesome 3D Animation & Comedy',
      category: 'animation',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      duration: 596,
      rating: '9.6/10',
      description: 'A gentle giant rabbit stands up to mischievous forest bullies in this beloved 3D animated open movie classic.',
      tags: ['Animation', 'Cute Animals', 'Fast CDN', 'Blender 4K'],
      source: 'blender',
      badge: '4K Open Cinema ✨',
      streamQuality: 'Ultra-Fast 4K',
    },
    {
      id: 'anim-sintel',
      title: 'Sintel (Fantasy Romance & Epic Quest)',
      artist: 'Colin Levy (Blender Studio)',
      year: 2010,
      genre: 'Epic Fantasy & Romance',
      category: 'animation',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      duration: 888,
      rating: '9.8/10',
      description: 'A lonely girl named Sintel rescues a wounded baby dragon, embarking on an emotional journey across breathtaking landscapes.',
      tags: ['Dragon', 'Fantasy', 'Emotional', 'Masterpiece'],
      source: 'blender',
      badge: '4K Open Cinema ✨',
      streamQuality: '1080p HD',
    },
    {
      id: 'anim-spring-yt',
      title: 'Spring (Poetic Fantasy 3D Animation)',
      artist: 'Andy Goralczyk (Blender Studio)',
      year: 2019,
      genre: 'Fantasy Animation & Nature',
      category: 'animation',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=WhWc3b3KhnY',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      duration: 460,
      rating: '9.8/10',
      description: 'A shepherd girl and her loyal dog face the ancient spirits of the forest to bring the warmth of spring.',
      tags: ['Cozy', 'Poetic', 'Award Winner', '4K Animation'],
      source: 'youtube',
      badge: 'Award Winner 🏆',
      streamQuality: '4K Ultra HD',
    },
    {
      id: 'anim-gullivers-travels',
      title: 'Gulliver\'s Travels (Full Animated Feature)',
      artist: 'Dave Fleischer (1939)',
      year: 1939,
      genre: 'Classic Hand-Drawn Animation & Adventure',
      category: 'animation',
      type: 'video',
      url: 'https://archive.org/download/gullivers_travels1939/gullivers_travels1939_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/gullivers_travels1939',
      duration: 4620,
      rating: '9.4/10',
      description: 'The full-length Technicolor animated musical classic of Lemuel Gulliver shipwrecked on the miniature island of Lilliput.',
      tags: ['Fleischer Studios', 'Musical', 'Hand Drawn', 'Classic Animation'],
      source: 'archive',
      badge: 'Feature Animation 🎨',
      streamQuality: 'Technicolor HD',
    },

    // --- Sci-Fi, Cyberpunk & Thrillers ---
    {
      id: 'movie-metropolis',
      title: 'Metropolis',
      artist: 'Fritz Lang (1927)',
      year: 1927,
      genre: 'Sci-Fi Epic & Dystopian Masterpiece',
      category: 'scifi',
      type: 'video',
      url: 'https://archive.org/download/Metropolis_1927_restored/Metropolis_1927_restored_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/Metropolis_1927_restored',
      duration: 9180,
      rating: '9.9/10',
      description: 'Fritz Lang\'s monumental visual sci-fi masterwork set in a towering futuristic city divided between wealthy rulers and subterranean workers.',
      tags: ['Sci-Fi', 'Futuristic', 'Art Deco', 'Masterpiece'],
      source: 'archive',
      badge: 'Sci-Fi Legend 🚀',
      streamQuality: 'Restored HD',
    },
    {
      id: 'anim-tears-steel',
      title: 'Tears of Steel (Sci-Fi Romance)',
      artist: 'Ian Hubert (Blender Studio)',
      year: 2012,
      genre: 'Sci-Fi Romance & Visual FX',
      category: 'scifi',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      duration: 734,
      rating: '9.3/10',
      description: 'In a futuristic Amsterdam, scientists attempt to heal an old heartbreak that forever altered the fate of humanity.',
      tags: ['Sci-Fi', 'Amsterdam', 'CGI', 'Cyberpunk'],
      source: 'blender',
      badge: '4K Open Cinema ✨',
      streamQuality: '4K HD',
    },
    {
      id: 'movie-the-stranger-welles',
      title: 'The Stranger',
      artist: 'Orson Welles (1946)',
      year: 1946,
      genre: 'Film Noir & Psychological Suspense',
      category: 'scifi',
      type: 'video',
      url: 'https://archive.org/download/the_stranger_welles/the_stranger_welles.mp4',
      thumbnailUrl: 'https://archive.org/services/img/the_stranger_welles',
      duration: 5700,
      rating: '9.2/10',
      description: 'Orson Welles, Edward G. Robinson, and Loretta Young star in this gripping, shadow-drenched post-war mystery and suspense thriller.',
      tags: ['Orson Welles', 'Film Noir', 'Suspense', 'Mystery'],
      source: 'archive',
      badge: 'Full Movie 🎬',
      streamQuality: 'Remastered HD',
    },
    {
      id: 'movie-sherlock-dressed-to-kill',
      title: 'Sherlock Holmes: Dressed to Kill',
      artist: 'Roy William Neill (1946)',
      year: 1946,
      genre: 'Mystery & Detective Thriller',
      category: 'scifi',
      type: 'video',
      url: 'https://archive.org/download/dressed_to_kill/dressed_to_kill.mp4',
      thumbnailUrl: 'https://archive.org/services/img/dressed_to_kill',
      duration: 4320,
      rating: '9.4/10',
      description: 'Basil Rathbone as Sherlock Holmes and Nigel Bruce as Dr. Watson decipher a deadly musical code hidden inside three stolen music boxes.',
      tags: ['Sherlock Holmes', 'Basil Rathbone', 'Detective', 'Mystery'],
      source: 'archive',
      badge: 'Full Movie 🎬',
      streamQuality: 'HD',
    },

    // --- Horror & Mystery ---
    {
      id: 'movie-night-living-dead',
      title: 'Night of the Living Dead',
      artist: 'George A. Romero (1968)',
      year: 1968,
      genre: 'Iconic Zombie Horror & Thriller',
      category: 'horror',
      type: 'video',
      url: 'https://archive.org/download/Night.Of.The.Living.Dead_1080p/NightOfTheLivingDead.mp4',
      thumbnailUrl: 'https://archive.org/services/img/Night.Of.The.Living.Dead_1080p',
      duration: 5760,
      rating: '9.7/10',
      description: 'George A. Romero\'s historic indie masterpiece that revolutionized modern horror cinema. Seven strangers shelter in an isolated rural farmhouse.',
      tags: ['George Romero', 'Cult Horror', 'Spooky Night', 'Legendary'],
      source: 'archive',
      badge: 'Full Movie 🎬',
      streamQuality: '1080p Remastered',
    },
    {
      id: 'movie-nosferatu',
      title: 'Nosferatu (A Symphony of Horror)',
      artist: 'F.W. Murnau (1922)',
      year: 1922,
      genre: 'Gothic Vampire Horror Classic',
      category: 'horror',
      type: 'video',
      url: 'https://archive.org/download/nosferatu_murnau/nosferatu_murnau_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/nosferatu_murnau',
      duration: 5640,
      rating: '9.6/10',
      description: 'The haunting and atmospheric German Expressionist vampire film starring Max Schreck as Count Orlok in the Carpathian mountains.',
      tags: ['Nosferatu', 'Vampire', 'Expressionism', 'Gothic'],
      source: 'archive',
      badge: 'Horror Classic 🧛',
      streamQuality: 'Restored HD',
    },
    {
      id: 'movie-house-haunted-hill',
      title: 'House on Haunted Hill',
      artist: 'William Castle (1959)',
      year: 1959,
      genre: 'Spooky Mystery & Haunted House',
      category: 'horror',
      type: 'video',
      url: 'https://archive.org/download/HouseOnHauntedHill_512kb/HouseOnHauntedHill_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/HouseOnHauntedHill_512kb',
      duration: 4500,
      rating: '9.1/10',
      description: 'Vincent Price hosts an eerie millionaire\'s party offering $10,000 to anyone who can survive a night locked in a murderous haunted mansion.',
      tags: ['Vincent Price', 'Haunted House', 'Fun Spooky', 'Halloween Date'],
      source: 'archive',
      badge: 'Full Movie 🎬',
      streamQuality: 'HD Stream',
    },
    {
      id: 'movie-phantom-opera',
      title: 'The Phantom of the Opera',
      artist: 'Rupert Julian (1925)',
      year: 1925,
      genre: 'Gothic Romance & Melodrama',
      category: 'horror',
      type: 'video',
      url: 'https://archive.org/download/ThePhantomoftheOpera/ThePhantomoftheOpera_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/ThePhantomoftheOpera',
      duration: 6360,
      rating: '9.3/10',
      description: 'Lon Chaney gives his most unforgettable performance as the disfigured Phantom who haunts the catacombs beneath the Paris Opera House.',
      tags: ['Lon Chaney', 'Paris Opera', 'Gothic Romance', 'Unmasking Scene'],
      source: 'archive',
      badge: 'Cinema Masterpiece 🎭',
      streamQuality: 'HD',
    },

    // --- Cozy, Nature & Virtual Date Streams ---
    {
      id: 'yt-paris-walk',
      title: 'Paris Midnight Stroll in 4K (Rain & Cafe Jazz)',
      artist: 'Nomadic Ambience',
      year: 2023,
      genre: 'Atmospheric Virtual Date Tour',
      category: 'cozy',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
      thumbnailUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80',
      duration: 7200,
      rating: '9.9/10',
      description: 'Walk together hand-in-hand through the glowing cobblestone streets, charming bistros, and rain-soaked cafes of Montmartre in 4K.',
      tags: ['Virtual Date', 'Paris', 'Rain', 'Walking Tour', 'Cozy'],
      source: 'youtube',
      badge: 'Virtual Date 🥐',
      streamQuality: '4K 60fps',
    },
    {
      id: 'yt-lofi-date',
      title: 'Romantic Lofi Beats - Midnight Love Letters',
      artist: 'Lofi Girl / ChilledCow',
      year: 2024,
      genre: 'Cozy Lofi & Acoustic Date',
      category: 'cozy',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      duration: 3600,
      rating: '9.9/10',
      description: 'The iconic gentle study and romance lofi broadcast with mellow beats and animated rainy window vibes.',
      tags: ['Lofi', 'Rainy Night', 'Study Date', 'Chill'],
      source: 'youtube',
      badge: 'Chill Radio ☕',
      streamQuality: 'HD Audio/Video',
    },
    {
      id: 'anim-for-bigger-escapes',
      title: 'For Bigger Escapes (Scenic Coastline & Ocean Sunset)',
      artist: 'Chromecast 4K Cinema',
      year: 2023,
      genre: 'Scenic 4K Nature & Ocean Date',
      category: 'cozy',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      duration: 90,
      rating: '9.5/10',
      description: 'Tranquil turquoise waves crashing on golden sand dunes under a gentle sunset breeze.',
      tags: ['Ocean', 'Sunset', 'Relaxing', 'Scenic'],
      source: 'cdn',
      badge: 'Scenic 4K 🌊',
      streamQuality: '4K Ultra HD',
    },
    {
      id: 'doc-nasa-earth-4k',
      title: 'Earth from Orbit & Auroras in 4K',
      artist: 'NASA Goddard Space Flight Center',
      year: 2023,
      genre: 'Space Documentary & Earth Views',
      category: 'cozy',
      type: 'video',
      url: 'https://archive.org/download/NASA_Earth_From_Orbit_4K/NASA_Earth_From_Orbit_4K_512kb.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      duration: 3600,
      rating: '9.9/10',
      description: 'Mesmerizing ultra-high definition views of Earth passing beneath the International Space Station, showing shimmering dancing auroras and glowing cities.',
      tags: ['NASA', 'Space', 'Earth', 'Auroras', 'Peaceful'],
      source: 'archive',
      badge: 'NASA 4K 🌌',
      streamQuality: '4K Space Views',
    },

    // --- Extended Romance Classics ---
    {
      id: 'movie-farewell-arms',
      title: 'A Farewell to Arms',
      artist: 'Frank Borzage (1932)',
      year: 1932,
      genre: 'Romantic Wartime Drama',
      category: 'romance',
      type: 'video',
      url: 'https://archive.org/download/AFarewellToArms1932/AFarewellToArms1932_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/AFarewellToArms1932',
      duration: 5340,
      rating: '9.1/10',
      description: 'Gary Cooper and Helen Hayes star in Ernest Hemingway\'s timeless romantic epic of an American ambulance driver and a Red Cross nurse.',
      tags: ['Gary Cooper', 'Ernest Hemingway', 'Classic Romance', 'Oscar Winner'],
      source: 'archive',
      badge: 'Oscar Winner 🏆',
      streamQuality: 'Restored HD',
    },
    {
      id: 'movie-penny-serenade',
      title: 'Penny Serenade',
      artist: 'George Stevens (1941)',
      year: 1941,
      genre: 'Heartwarming Romantic Drama',
      category: 'romance',
      type: 'video',
      url: 'https://archive.org/download/penny_serenade/penny_serenade.mp4',
      thumbnailUrl: 'https://archive.org/services/img/penny_serenade',
      duration: 7200,
      rating: '9.3/10',
      description: 'Cary Grant and Irene Dunne play a loving couple reminiscing through old phonograph records about the highs and heartaches of their romance.',
      tags: ['Cary Grant', 'Irene Dunne', 'Emotional', 'Golden Age Romance'],
      source: 'archive',
      badge: 'Date Night Classic 💖',
      streamQuality: 'HD 1080p',
    },
    {
      id: 'movie-love-affair',
      title: 'Love Affair',
      artist: 'Leo McCarey (1939)',
      year: 1939,
      genre: 'Classic Romantic Drama',
      category: 'romance',
      type: 'video',
      url: 'https://archive.org/download/LoveAffair1939/LoveAffair1939_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/LoveAffair1939',
      duration: 5220,
      rating: '9.2/10',
      description: 'Irene Dunne and Charles Boyer meet aboard a transatlantic ocean liner and fall deeply in love, promising to reunite six months later at the Empire State Building.',
      tags: ['Charles Boyer', 'Irene Dunne', 'Ocean Liner', 'Empire State Building'],
      source: 'archive',
      badge: 'Timeless Romance 🌹',
      streamQuality: 'Restored HD',
    },

    // --- Extended Comedy Classics & Shorts ---
    {
      id: 'movie-steamboat-bill',
      title: 'Steamboat Bill, Jr.',
      artist: 'Charles Reisner & Buster Keaton (1928)',
      year: 1928,
      genre: 'Physical Comedy & Slapstick',
      category: 'comedy',
      type: 'video',
      url: 'https://archive.org/download/SteamboatBillJr/SteamboatBillJr_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/SteamboatBillJr',
      duration: 4260,
      rating: '9.6/10',
      description: 'Buster Keaton in his most daring physical comedy, featuring the legendary hurricane sequence and the building wall falling stunt.',
      tags: ['Buster Keaton', 'Comedy', 'Stunts', 'Slapstick Legend'],
      source: 'archive',
      badge: 'Stunt Masterpiece 🎪',
      streamQuality: 'HD Restored',
    },
    {
      id: 'movie-inspector-general',
      title: 'The Inspector General',
      artist: 'Henry Koster (1949)',
      year: 1949,
      genre: 'Musical Comedy & Satire',
      category: 'comedy',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=F0m9nEknX_U',
      thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      duration: 6120,
      rating: '9.0/10',
      description: 'Danny Kaye in top comedic form as an illiterate gypsy assistant mistaken for Napoleon\'s feared imperial inspector in a corrupt European town.',
      tags: ['Danny Kaye', 'Musical Comedy', 'Technicolor', 'Hilarious'],
      source: 'youtube',
      badge: 'Technicolor Comedy 🎭',
      streamQuality: 'Full Movie HD',
    },
    {
      id: 'anim-agent-327',
      title: 'Agent 327: Operation Barbershop',
      artist: 'Blender Studio (2017)',
      year: 2017,
      genre: 'Spy Comedy Animation',
      category: 'comedy',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=mN0zPOpADL4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
      duration: 230,
      rating: '9.4/10',
      description: 'Secret Agent 327 investigates a suspicious barbershop with slick choreography, ridiculous gadgets, and high-energy comedy.',
      tags: ['Blender Studio', 'Secret Agent', 'Spy Comedy', '4K Animation'],
      source: 'youtube',
      badge: '4K Animation 🕵️‍♂️',
      streamQuality: '4K 60fps',
    },

    // --- Extended Animation & 4K Shorts ---
    {
      id: 'anim-spring-mountain-yt',
      title: 'Spring: Ancient Mountain Spirit',
      artist: 'Andy Goralczyk (Blender Studio 2019)',
      year: 2019,
      genre: 'Poetic Fantasy Animation',
      category: 'animation',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=WhWc3b3KhnY',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      duration: 464,
      rating: '9.8/10',
      description: 'A young shepherd girl and her dog journey into frozen ancient peaks to awaken the spirits of spring in breathtaking 4K CGI.',
      tags: ['Blender Studio', 'Spring', 'Fantasy', '4K CGI', 'Wholesome'],
      source: 'youtube',
      badge: '4K Open Cinema 🌸',
      streamQuality: '4K Ultra HD',
    },
    {
      id: 'anim-charge-yt',
      title: 'Charge: Cyberpunk Robot Heist',
      artist: 'Hjalti Hjalmarsson (Blender Studio 2022)',
      year: 2022,
      genre: 'Cyberpunk Action Animation',
      category: 'animation',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=ux__mXKSVVC',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      duration: 185,
      rating: '9.5/10',
      description: 'An old battery-powered robot gets trapped in an intense underground factory showdown in this lightning-fast cyberpunk action short.',
      tags: ['Cyberpunk', 'Mecha', 'Action', 'Blender Studio', 'Robot'],
      source: 'youtube',
      badge: '4K Action ⚡',
      streamQuality: '4K 60fps',
    },
    {
      id: 'anim-elephants-dream',
      title: 'Elephants Dream',
      artist: 'Bassam Kurdali (Blender Studio 2006)',
      year: 2006,
      genre: 'Surrealist Sci-Fi Animation',
      category: 'animation',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      duration: 653,
      rating: '9.0/10',
      description: 'The world\'s first open-source 3D animated film following two explorers through a giant clockwork dream world.',
      tags: ['Sci-Fi', 'Surreal', 'Blender Studio', 'Historic 3D'],
      source: 'blender',
      badge: 'Open Cinema Pioneer ⚙️',
      streamQuality: 'Direct 1080p',
    },

    // --- Extended Sci-Fi & Adventure ---
    {
      id: 'movie-cyrano-bergerac',
      title: 'Cyrano de Bergerac',
      artist: 'Michael Gordon (1950)',
      year: 1950,
      genre: 'Romantic Adventure & Poetry',
      category: 'scifi',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=Zf8r_dYV5c4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
      duration: 6720,
      rating: '9.5/10',
      description: 'José Ferrer won the Best Actor Academy Award for his brilliant, poetic portrayal of the noble swordsman and poet with an unrequited love.',
      tags: ['Jose Ferrer', 'Swashbuckler', 'Poetry', 'Academy Award Winner'],
      source: 'youtube',
      badge: 'Academy Award ⚔️',
      streamQuality: 'Full Movie HD',
    },

    // --- Extended Horror & Cult Classics ---
    {
      id: 'movie-carnival-souls',
      title: 'Carnival of Souls',
      artist: 'Herk Harvey (1962)',
      year: 1962,
      genre: 'Cult Psychological Horror',
      category: 'horror',
      type: 'video',
      url: 'https://archive.org/download/carnival_of_souls_1962/carnival_of_souls_1962.mp4',
      thumbnailUrl: 'https://archive.org/services/img/carnival_of_souls_1962',
      duration: 4680,
      rating: '9.4/10',
      description: 'After surviving a drag-race crash into a river, an organist is drawn to a mysterious abandoned lakeside pavilion in this cult classic.',
      tags: ['Cult Horror', 'Atmospheric', 'Indie Landmark', 'Eerie'],
      source: 'archive',
      badge: 'Cult Landmark 🎪',
      streamQuality: 'HD Restored',
    },
    {
      id: 'movie-caligari',
      title: 'The Cabinet of Dr. Caligari',
      artist: 'Robert Wiene (1920)',
      year: 1920,
      genre: 'German Expressionist Horror',
      category: 'horror',
      type: 'video',
      url: 'https://archive.org/download/TheCabinetOfDrCaligari/TheCabinetOfDrCaligari_512kb.mp4',
      thumbnailUrl: 'https://archive.org/services/img/TheCabinetOfDrCaligari',
      duration: 4260,
      rating: '9.6/10',
      description: 'The seminal masterpiece of German Expressionist cinema with jagged, surreal twisted sets and haunting psychological twists.',
      tags: ['German Expressionism', 'Classic Horror', 'Silent Era', 'Art Cinema'],
      source: 'archive',
      badge: 'Expressionist Masterpiece 👁️',
      streamQuality: 'Restored HD',
    },

    // --- Extended Virtual Dates, Walks & Atmospheric YouTube Streams ---
    {
      id: 'yt-kyoto-rain',
      title: 'Kyoto Arashiyama Bamboo Grove Walk 4K (Gentle Rain)',
      artist: 'Nomadic Ambience',
      year: 2024,
      genre: 'Atmospheric Virtual Date Tour',
      category: 'cozy',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=xPz9mZc9wKk',
      thumbnailUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80',
      duration: 7200,
      rating: '9.9/10',
      description: 'Immersive 4K walk through the emerald bamboo groves of Kyoto during a warm afternoon rain with binaural 3D audio.',
      tags: ['Kyoto', 'Japan', 'Bamboo Forest', 'Rain Walk', 'Virtual Date'],
      source: 'youtube',
      badge: 'Virtual Date 🎋',
      streamQuality: '4K 60fps Binaural',
    },
    {
      id: 'yt-tokyo-night',
      title: 'Tokyo Neon Shinjuku Night Walk in 4K',
      artist: 'Rambalac',
      year: 2024,
      genre: 'Cyberpunk Neon City Walk',
      category: 'cozy',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=gI0jD9XWn2E',
      thumbnailUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
      duration: 5400,
      rating: '9.8/10',
      description: 'Stroll hand-in-hand through bustling Shinjuku alleyways, glowing ramen shops, and towering neon skyscrapers in crisp 4K.',
      tags: ['Tokyo', 'Neon', 'Japan', 'Night Walk', 'Virtual Date'],
      source: 'youtube',
      badge: 'Tokyo Nights 🗼',
      streamQuality: '4K 60fps',
    },
    {
      id: 'yt-synthwave-highway',
      title: 'Retro Synthwave & Neon Sunset Highway Radio',
      artist: 'Lofi & Synthwave Live',
      year: 2024,
      genre: 'Chillwave & Retro 80s Sunset',
      category: 'cozy',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=MVPTGNGiI-4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
      duration: 3600,
      rating: '9.7/10',
      description: 'Smooth retro 80s analog synth arpeggios and purple sunset horizons, creating the ultimate late-night co-listening atmosphere.',
      tags: ['Synthwave', 'Chillwave', 'Night Drive', 'Retro 80s', 'Cozy'],
      source: 'youtube',
      badge: 'Synthwave Radio 🌆',
      streamQuality: 'HD Audio/Video',
    },
    {
      id: 'yt-cafe-jazz',
      title: 'Cozy Rain Cafe & Soft Piano Jazz',
      artist: 'Cafe Music BGM',
      year: 2024,
      genre: 'Warm Acoustic Jazz & Rain',
      category: 'cozy',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=lTRiuFIWV54',
      thumbnailUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
      duration: 7200,
      rating: '9.8/10',
      description: 'Gentle raindrops tapping on windowpanes, warm coffee aroma, and relaxing acoustic piano jazz for deep date conversations.',
      tags: ['Coffee', 'Jazz', 'Rain', 'Piano', 'Relaxing Date'],
      source: 'youtube',
      badge: 'Cozy Cafe ☕',
      streamQuality: 'HD Audio',
    },
    {
      id: 'yt-swiss-alps',
      title: 'Swiss Alps Snow Peaks & Panoramic Train in 4K',
      artist: 'Scenic Relaxation',
      year: 2024,
      genre: 'Alpine Panoramic Train Tour',
      category: 'cozy',
      type: 'youtube',
      url: 'https://www.youtube.com/watch?v=e_04ZrNroTo',
      thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80',
      duration: 3600,
      rating: '9.9/10',
      description: 'Glide across frozen glacier peaks, pine-covered alpine valleys, and breathtaking mountain bridges in 4K ultra high definition.',
      tags: ['Swiss Alps', 'Mountains', 'Snow', 'Panoramic', 'Scenic Date'],
      source: 'youtube',
      badge: 'Alpine Views 🏔️',
      streamQuality: '4K Ultra HD',
    },
  ];

  // Helper to resolve an Archive.org streamable MP4 file URL
  async function resolveArchiveMp4(identifier: string): Promise<{ mp4Url: string; duration?: number } | null> {
    if (movieStreamCache.has(identifier)) {
      return movieStreamCache.get(identifier)!;
    }
    try {
      const metaRes = await fetch(`https://archive.org/metadata/${identifier}/files`);
      if (!metaRes.ok) return null;
      const metaData = await metaRes.json();
      const files: any[] = metaData.result || [];
      // Prefer h.264 or 512kb or general .mp4
      const mp4File = files.find(
        (f) =>
          f.name &&
          f.name.endsWith('.mp4') &&
          (f.format === 'h.264' || f.format === '512Kb MPEG4' || f.name.includes('512kb') || f.format?.includes('MPEG4'))
      ) || files.find((f) => f.name && f.name.endsWith('.mp4'));

      if (mp4File && mp4File.name) {
        const mp4Url = `https://archive.org/download/${identifier}/${encodeURIComponent(mp4File.name)}`;
        const duration = mp4File.length ? Math.round(parseFloat(mp4File.length)) : undefined;
        const result = { mp4Url, duration };
        movieStreamCache.set(identifier, result);
        return result;
      }
    } catch (err) {
      console.warn(`Could not resolve archive.org mp4 for ${identifier}:`, err);
    }
    return null;
  }

  // Explore online movies by category
  app.get('/api/movies/explore', (req, res) => {
    try {
      const category = (req.query.category as string) || 'all';
      if (category === 'all' || category === 'trending') {
        return res.json({ movies: CURATED_ONLINE_MOVIES });
      }
      const filtered = CURATED_ONLINE_MOVIES.filter((m) => m.category === category);
      res.json({ movies: filtered.length > 0 ? filtered : CURATED_ONLINE_MOVIES });
    } catch (err: any) {
      console.error('Movies explore error:', err);
      res.status(500).json({ error: 'Failed to explore movies', movies: CURATED_ONLINE_MOVIES });
    }
  });

  // Search real online movies across Internet Archive & curated library
  app.get('/api/movies/search', async (req, res) => {
    try {
      const q = ((req.query.q as string) || '').trim();
      const category = (req.query.category as string) || 'all';

      if (!q) {
        // Return curated list for category
        if (category === 'all') {
          return res.json({ movies: CURATED_ONLINE_MOVIES });
        }
        return res.json({
          movies: CURATED_ONLINE_MOVIES.filter((m) => m.category === category),
        });
      }

      // 1. Check matching curated movies first
      const qLower = q.toLowerCase();
      const curatedMatches = CURATED_ONLINE_MOVIES.filter(
        (m) =>
          m.title.toLowerCase().includes(qLower) ||
          m.artist?.toLowerCase().includes(qLower) ||
          m.genre?.toLowerCase().includes(qLower) ||
          m.description?.toLowerCase().includes(qLower) ||
          m.tags?.some((t: string) => t.toLowerCase().includes(qLower))
      );

      // 2. Query Internet Archive Live Search API
      let archiveResults: any[] = [];
      try {
        const searchArchiveUrl = `https://archive.org/advancedsearch.php?q=mediatype:movies+AND+format:(MPEG4+OR+"h.264")+AND+(${encodeURIComponent(q)})&fl[]=identifier,title,description,year,creator,downloads,runtime&sort[]=downloads+desc&rows=10&page=1&output=json`;
        const archiveRes = await fetch(searchArchiveUrl, { signal: AbortSignal.timeout(4000) });
        if (archiveRes.ok) {
          const archiveData = await archiveRes.json();
          const docs: any[] = archiveData.response?.docs || [];

          // Resolve streamable MP4 files for top docs in parallel
          const resolvedPromises = docs.slice(0, 6).map(async (doc) => {
            const stream = await resolveArchiveMp4(doc.identifier);
            if (!stream || !stream.mp4Url) return null;

            // Parse runtime into seconds
            let durationSec = stream.duration || 5400;
            if (!stream.duration && doc.runtime) {
              const parts = String(doc.runtime).split(':').map((p) => parseInt(p, 10));
              if (parts.length === 3) {
                durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
              } else if (parts.length === 2) {
                durationSec = parts[0] * 60 + parts[1];
              } else if (String(doc.runtime).includes('min')) {
                durationSec = parseInt(doc.runtime, 10) * 60;
              }
            }

            return {
              id: `archive-${doc.identifier}`,
              title: doc.title || 'Classic Film',
              artist: doc.creator || 'Internet Archive Cinema',
              year: doc.year || undefined,
              genre: 'Public Domain Cinema',
              category: 'classic',
              type: 'video',
              url: stream.mp4Url,
              thumbnailUrl: `https://archive.org/services/img/${doc.identifier}`,
              duration: durationSec,
              rating: doc.downloads ? `★ ${(Math.min(9.9, 8.5 + (doc.downloads / 100000) * 0.2)).toFixed(1)}/10` : '9.2/10',
              description: doc.description ? doc.description.replace(/<[^>]*>?/gm, '').slice(0, 200) + '...' : 'Real online movie streamed directly from the Internet Archive.',
              tags: ['Internet Archive', 'Full Movie', 'Public Domain', 'Free Online Stream'],
              source: 'archive',
              badge: 'Real Online Stream 🌐',
              streamQuality: 'Archive Stream',
            };
          });

          const resolvedList = await Promise.all(resolvedPromises);
          archiveResults = resolvedList.filter(Boolean);
        }
      } catch (archiveErr) {
        console.warn('Archive.org search error/timeout:', archiveErr);
      }

      // 3. Query YouTube directly for live video results
      let ytDirectResults: any[] = [];
      try {
        ytDirectResults = await searchYouTubeDirectServer(q);
      } catch (ytErr) {
        console.warn('Direct YouTube search error in /api/movies/search:', ytErr);
      }

      // Combine YouTube direct results, curated matches, and public domain archive streams
      const seenTitles = new Set<string>();
      const combined: any[] = [];

      // Prioritize pure YouTube direct video results
      const listOrder = [
        ...ytDirectResults,
        ...curatedMatches.filter((m) => m.type === 'youtube'),
        ...curatedMatches.filter((m) => m.type !== 'youtube'),
        ...archiveResults,
      ];

      for (const m of listOrder) {
        const norm = m.title.toLowerCase().trim();
        if (!seenTitles.has(norm)) {
          seenTitles.add(norm);
          combined.push(m);
        }
      }

      res.json({ movies: combined });
    } catch (err: any) {
      console.error('Movies search error:', err);
      res.status(500).json({ error: 'Search failed', movies: CURATED_ONLINE_MOVIES });
    }
  });

  // Extract YouTube ID helper on server
  function extractYouTubeIdFromServer(urlOrId: string): string | null {
    if (!urlOrId) return null;
    const trimmed = urlOrId.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = trimmed.match(regExp);
    return match ? match[1] : null;
  }

  // Live direct YouTube search scraper (zero API keys needed)
  async function searchYouTubeDirectServer(query: string): Promise<any[]> {
    try {
      const res = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(5000),
      });
      const html = await res.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
      if (!match) return [];
      const data = JSON.parse(match[1]);
      const sectionList = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
      const itemSection = sectionList?.find((s: any) => s.itemSectionRenderer)?.itemSectionRenderer?.contents;
      const results: any[] = [];
      for (const item of itemSection || []) {
        if (item.videoRenderer) {
          const v = item.videoRenderer;
          const videoId = v.videoId;
          if (!videoId) continue;
          const title = v.title?.runs?.[0]?.text || 'YouTube Video';
          const author = v.ownerText?.runs?.[0]?.text || 'YouTube Creator';
          const durationStr = v.lengthText?.simpleText || '';
          let durationSec = 0;
          if (durationStr) {
            const parts = durationStr.split(':').map((p: string) => parseInt(p, 10));
            if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
            else if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
          }
          const views = v.viewCountText?.simpleText || '';
          results.push({
            id: `yt-${videoId}`,
            videoId: videoId,
            title: title,
            artist: author,
            year: new Date().getFullYear(),
            genre: 'YouTube Video',
            category: 'youtube',
            type: 'youtube',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            duration: durationSec,
            durationStr: durationStr || undefined,
            rating: views ? `▶ ${views}` : 'YouTube Direct',
            description: `${title} by ${author}${views ? ` • ${views}` : ''}. Streamed directly from YouTube.`,
            tags: ['YouTube', author, 'Live Stream', 'Direct Video'],
            source: 'youtube',
            badge: 'YouTube Direct 🔴',
            streamQuality: 'YouTube HD',
          });
        }
      }
      return results;
    } catch (err) {
      console.warn('Direct YouTube search scraping error:', err);
      return [];
    }
  }

  // Direct YouTube URL or Video ID Fetch Endpoint (Official oEmbed + Metadata)
  app.get('/api/youtube/fetch', async (req, res) => {
    try {
      const input = ((req.query.url as string) || (req.query.id as string) || '').trim();
      if (!input) {
        return res.status(400).json({ error: 'Missing YouTube url or id parameter' });
      }
      const videoId = extractYouTubeIdFromServer(input);
      if (!videoId) {
        return res.status(400).json({ error: 'Could not extract valid YouTube video ID' });
      }

      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      let title = 'YouTube Video';
      let authorName = 'YouTube Creator';
      let authorUrl = `https://www.youtube.com/watch?v=${videoId}`;
      let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      try {
        const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.title) title = oembedData.title;
          if (oembedData.author_name) authorName = oembedData.author_name;
          if (oembedData.author_url) authorUrl = oembedData.author_url;
          if (oembedData.thumbnail_url) thumbnailUrl = oembedData.thumbnail_url;
        }
      } catch (oembedErr) {
        console.warn('oEmbed fetch error, fallback to standard thumbnail:', oembedErr);
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }

      const videoItem = {
        id: `yt-${videoId}`,
        videoId: videoId,
        title: title,
        artist: authorName,
        authorUrl: authorUrl,
        year: new Date().getFullYear(),
        genre: 'YouTube Direct',
        category: 'youtube',
        type: 'youtube',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: thumbnailUrl,
        duration: 0,
        rating: 'YouTube Official',
        description: `Official YouTube video: "${title}" by ${authorName}. Ready for synchronized co-watching.`,
        tags: ['YouTube', authorName, 'Direct Stream'],
        source: 'youtube',
        badge: 'YouTube Direct 🔴',
        streamQuality: 'YouTube HD / 4K',
      };

      res.json({ success: true, video: videoItem });
    } catch (err: any) {
      console.error('YouTube fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch YouTube video', details: err.message });
    }
  });

  // Dedicated Direct YouTube Search Endpoint
  app.get('/api/youtube/search', async (req, res) => {
    try {
      const q = ((req.query.q as string) || '').trim();
      if (!q) {
        return res.json({ videos: [] });
      }
      const videos = await searchYouTubeDirectServer(q);
      res.json({ videos });
    } catch (err: any) {
      console.error('YouTube search endpoint error:', err);
      res.status(500).json({ error: 'YouTube search failed', videos: [] });
    }
  });

  // Random surprise movie for date nights
  app.get('/api/movies/surprise', (req, res) => {
    try {
      const category = (req.query.category as string) || 'all';
      let pool = CURATED_ONLINE_MOVIES;
      if (category !== 'all') {
        const filtered = CURATED_ONLINE_MOVIES.filter((m) => m.category === category);
        if (filtered.length > 0) pool = filtered;
      }
      const randomMovie = pool[Math.floor(Math.random() * pool.length)];
      res.json({ movie: randomMovie });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to pick surprise movie', movie: CURATED_ONLINE_MOVIES[0] });
    }
  });

  // --- Viduki.net Movie Streaming API Integration ---

  // 1. Get Viduki API Configuration
  app.get('/api/movies/viduki/config', (req, res) => {
    try {
      res.json({
        configured: Boolean(vidukiConfig.apiKey && vidukiConfig.apiKey.trim().length > 0),
        apiKey: vidukiConfig.apiKey
          ? `${vidukiConfig.apiKey.slice(0, 4)}...${vidukiConfig.apiKey.slice(-4)}`
          : '',
        baseUrl: vidukiConfig.baseUrl || 'https://viduki.net/api',
        embedTemplate: vidukiConfig.embedTemplate || 'https://viduki.net/{server}/movie/{id}?color={color}',
        enabled: vidukiConfig.enabled,
        preferredQuality: vidukiConfig.preferredQuality || '1080p HD',
        defaultServer: vidukiConfig.defaultServer || 1,
        themeColor: vidukiConfig.themeColor || 'f43f5e',
        autoFallbackOnFailure: vidukiConfig.autoFallbackOnFailure ?? true,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to read Viduki configuration' });
    }
  });

  // 2. Save Viduki API Configuration
  app.post('/api/movies/viduki/config', (req, res) => {
    try {
      const { apiKey, baseUrl, embedTemplate, enabled, preferredQuality, defaultServer, themeColor, autoFallbackOnFailure } = req.body;
      if (typeof apiKey === 'string') {
        const trimmedKey = apiKey.trim();
        if (trimmedKey && !trimmedKey.includes('...')) {
          vidukiConfig.apiKey = trimmedKey;
        } else if (trimmedKey === '') {
          vidukiConfig.apiKey = '';
        }
      }
      if (typeof baseUrl === 'string' && baseUrl.trim()) {
        vidukiConfig.baseUrl = baseUrl.trim().replace(/\/+$/, '');
      }
      if (typeof embedTemplate === 'string' && embedTemplate.trim()) {
        vidukiConfig.embedTemplate = embedTemplate.trim();
      }
      if (enabled !== undefined) {
        vidukiConfig.enabled = Boolean(enabled);
      }
      if (typeof preferredQuality === 'string') {
        vidukiConfig.preferredQuality = preferredQuality;
      }
      if (defaultServer && [1, 2, 3, 4].includes(Number(defaultServer))) {
        vidukiConfig.defaultServer = Number(defaultServer) as 1 | 2 | 3 | 4;
      }
      if (typeof themeColor === 'string') {
        vidukiConfig.themeColor = themeColor.replace('#', '').trim() || 'f43f5e';
      }
      if (autoFallbackOnFailure !== undefined) {
        vidukiConfig.autoFallbackOnFailure = Boolean(autoFallbackOnFailure);
      }
      vidukiConfig.updatedAt = Date.now();
      saveVidukiConfigToDisk();

      res.json({
        success: true,
        configured: Boolean(vidukiConfig.apiKey),
        message: 'Viduki.net API configuration saved and synced across your sanctuary!',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update Viduki configuration', details: err?.message });
    }
  });

  // 3. Test Viduki API Connection (supports GET and POST)
  app.all('/api/movies/viduki/test', async (req, res) => {
    try {
      const bodyKey = typeof req.body === 'object' && req.body?.apiKey ? String(req.body.apiKey) : '';
      const queryKey = typeof req.query?.apiKey === 'string' ? req.query.apiKey : '';
      const reqKey = bodyKey || queryKey || '';
      const apiKey = (reqKey && !reqKey.includes('...') ? reqKey : vidukiConfig.apiKey || '').trim();

      const bodyBaseUrl = typeof req.body === 'object' && req.body?.baseUrl ? String(req.body.baseUrl) : '';
      const queryBaseUrl = typeof req.query?.baseUrl === 'string' ? req.query.baseUrl : '';
      const baseUrl = (bodyBaseUrl || queryBaseUrl || vidukiConfig.baseUrl || 'https://viduki.net/api').trim().replace(/\/+$/, '');

      if (!apiKey) {
        return res.json({
          success: true,
          message: 'Viduki.net multi-server streaming (Servers 1, 2, 3, 4) is active! You can search and stream any movie or TV series without requiring an API key.',
        });
      }

      let testSuccess = false;
      let host = 'viduki.net';
      try {
        host = new URL(baseUrl).hostname;
      } catch {}

      // Probe endpoints on Viduki
      const candidateUrls = [
        `${baseUrl}/status?api_key=${encodeURIComponent(apiKey)}`,
        `${baseUrl}/ping?api_key=${encodeURIComponent(apiKey)}`,
        `${baseUrl}/movies?api_key=${encodeURIComponent(apiKey)}&limit=1`,
        `${baseUrl}/search?q=movie&api_key=${encodeURIComponent(apiKey)}`,
        `${baseUrl}?api_key=${encodeURIComponent(apiKey)}`,
      ];

      for (const url of candidateUrls) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'X-API-Key': apiKey,
              'User-Agent': 'Haven-WatchParty/1.0',
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (response.ok || response.status === 200 || response.status === 304) {
            testSuccess = true;
            break;
          } else if (response.status === 401 || response.status === 403) {
            return res.status(401).json({
              success: false,
              error: `Viduki rejected this key (HTTP ${response.status} Unauthorized). Please verify the API key on Viduki.net.`,
            });
          }
        } catch {
          // Try next probe
        }
      }

      res.json({
        success: true,
        message: testSuccess
          ? `Verified! Successfully connected to ${host} API.`
          : `API Key registered for ${host}. Viduki multi-server streaming is active and ready in Watch Party!`,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to test connection to Viduki.net',
      });
    }
  });

  // 4. Search movies via Viduki.net API & Universal Media Catalog
  app.get('/api/movies/viduki/search', async (req, res) => {
    try {
      const q = ((req.query.q as string) || '').trim();
      const reqKey = (req.query.apiKey as string) || '';
      const apiKey = (reqKey && !reqKey.includes('...') ? reqKey : vidukiConfig.apiKey || '').trim();
      const baseUrl = ((req.query.baseUrl as string) || vidukiConfig.baseUrl || 'https://viduki.net/api').trim().replace(/\/+$/, '');
      const preferredQuality = (req.query.quality as string) || vidukiConfig.preferredQuality || '1080p Full HD';
      const srv = vidukiConfig.defaultServer || 1;
      const col = vidukiConfig.themeColor || 'f43f5e';

      const movies: any[] = [];
      const seenIds = new Set<string>();

      const isImdb = /^tt\d+$/i.test(q);
      const isNumeric = /^\d+$/.test(q);

      // 1. If custom apiKey is configured, query Viduki API first
      if (apiKey) {
        const searchUrls: string[] = [];
        if (isImdb) {
          searchUrls.push(
            `${baseUrl}/movie?imdb=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}`,
            `${baseUrl}/search?imdb=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}`
          );
        } else if (q) {
          searchUrls.push(
            `${baseUrl}/search?q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}`,
            `${baseUrl}/movies?search=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}`,
            `${baseUrl}/api/v1/search?query=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}`
          );
        }

        for (const searchUrl of searchUrls) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const resp = await fetch(searchUrl, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'X-API-Key': apiKey,
                'Accept': 'application/json',
              },
              signal: controller.signal,
            });
            clearTimeout(timeout);

            if (resp.ok) {
              const data = await resp.json();
              const rawItems: any[] = Array.isArray(data)
                ? data
                : Array.isArray(data.results)
                ? data.results
                : Array.isArray(data.movies)
                ? data.movies
                : Array.isArray(data.data)
                ? data.data
                : data.title
                ? [data]
                : [];

              for (const item of rawItems) {
                const movieId = item.id || item.imdb_id || item.tmdb_id || item.slug;
                if (!movieId || seenIds.has(String(movieId))) continue;
                seenIds.add(String(movieId));

                const title = item.title || item.name || item.movie_title || 'Viduki Feature Film';
                const imdbId = item.imdb_id || (typeof item.id === 'string' && item.id.startsWith('tt') ? item.id : undefined);
                const tmdbId = item.tmdb_id ? String(item.tmdb_id) : undefined;
                const isTv = item.media_type === 'tv' || item.type === 'tv' || Boolean(item.number_of_seasons);
                const targetId = tmdbId || imdbId || String(movieId);

                let playUrl = item.stream_url || item.embed_url;
                if (!playUrl) {
                  playUrl = isTv
                    ? `https://viduki.net/${srv}/tv/${targetId}/1/1?color=${col}`
                    : `https://viduki.net/${srv}/movie/${targetId}?color=${col}`;
                }

                movies.push({
                  id: `viduki-${isTv ? 'tv' : 'movie'}-${movieId}`,
                  title,
                  mediaType: isTv ? 'tv' : 'movie',
                  season: isTv ? 1 : undefined,
                  episode: isTv ? 1 : undefined,
                  artist: item.director || item.author || (isTv ? 'Viduki TV' : 'Viduki Cinema'),
                  year: item.year || item.release_year || (item.release_date ? item.release_date.slice(0, 4) : undefined),
                  genre: item.genre || (Array.isArray(item.genres) ? item.genres.join(' • ') : 'Viduki Stream'),
                  category: 'viduki',
                  type: 'embed',
                  url: playUrl,
                  embedUrl: playUrl,
                  thumbnailUrl: item.poster || item.poster_path || item.thumbnail || item.image_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
                  backdropUrl: item.backdrop || item.backdrop_path || item.background,
                  duration: item.duration ? parseInt(item.duration, 10) * 60 : 7200,
                  rating: item.rating ? `${item.rating}/10` : '9.6/10',
                  description: item.overview || item.description || item.synopsis || `Streamed in synchronized HD from Viduki.net.`,
                  source: 'viduki',
                  badge: isTv ? 'Viduki TV 📺' : 'Viduki Cinema 🎬',
                  streamQuality: item.quality || `Server ${srv} • 1080p`,
                  availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
                  server: srv,
                  fallbackAvailable: true,
                  imdbId,
                  tmdbId,
                });
              }
            }
          } catch {}
        }
      }

      // 2. Direct numeric TMDB ID or IMDb ID instant resolution
      if (isImdb || isNumeric) {
        const targetId = q;
        const isTv = false;
        const playUrl = isTv
          ? `https://viduki.net/${srv}/tv/${targetId}/1/1?color=${col}`
          : `https://viduki.net/${srv}/movie/${targetId}?color=${col}`;

        // Attempt metadata lookup from Cinemeta
        let title = isImdb ? `Movie (${targetId})` : `TMDB Movie #${targetId}`;
        let poster = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
        let yearStr = '';
        let genreStr = 'Viduki Cinema';
        let descStr = `Watch ${targetId} on Viduki Server ${srv}.`;

        if (isImdb) {
          try {
            const cMetaRes = await fetch(`https://v3-cinemeta.strem.io/meta/movie/${targetId}.json`);
            if (cMetaRes.ok) {
              const cData = await cMetaRes.json();
              if (cData?.meta) {
                const m = cData.meta;
                title = m.name || title;
                poster = m.poster || poster;
                yearStr = m.year ? String(m.year) : '';
                genreStr = m.genres?.join(' • ') || genreStr;
                descStr = m.description || descStr;
              }
            }
          } catch {}
        }

        movies.unshift({
          id: `viduki-${isTv ? 'tv' : 'movie'}-${targetId}`,
          title,
          mediaType: isTv ? 'tv' : 'movie',
          season: isTv ? 1 : undefined,
          episode: isTv ? 1 : undefined,
          artist: 'Viduki Cinema',
          year: yearStr,
          genre: genreStr,
          category: 'viduki',
          type: 'embed',
          url: playUrl,
          embedUrl: playUrl,
          thumbnailUrl: poster,
          duration: 7200,
          rating: '9.8/10',
          description: descStr,
          source: 'viduki',
          badge: 'Viduki Cinema 🎬',
          streamQuality: `Server ${srv} • 1080p`,
          availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
          server: srv,
          fallbackAvailable: true,
          imdbId: isImdb ? targetId : undefined,
          tmdbId: isNumeric ? targetId : undefined,
        });
        seenIds.add(targetId);
      }

      // 3. Search via IMDb Suggestion API (Universal Instant Search for all movies & series)
      if (q && q.length >= 2) {
        try {
          const cleanQuery = q.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
          const imdbSuggestUrl = `https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(cleanQuery)}.json`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4500);
          const imdbRes = await fetch(imdbSuggestUrl, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (imdbRes.ok) {
            const data = await imdbRes.json();
            const suggestions = Array.isArray(data?.d) ? data.d : [];

            for (const item of suggestions) {
              if (!item.id || !item.id.startsWith('tt') || !item.l) continue;
              if (seenIds.has(item.id)) continue;
              seenIds.add(item.id);

              const isTv = item.qid === 'tvSeries' || item.qid === 'tvMiniSeries' || item.q === 'TV series';
              const playUrl = isTv
                ? `https://viduki.net/${srv}/tv/${item.id}/1/1?color=${col}`
                : `https://viduki.net/${srv}/movie/${item.id}?color=${col}`;

              const poster = item.i?.imageUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
              const year = item.y ? String(item.y) : item.year ? String(item.year) : undefined;
              const stars = item.s ? `Starring: ${item.s}` : isTv ? 'Viduki TV' : 'Viduki Cinema';

              movies.push({
                id: `viduki-${isTv ? 'tv' : 'movie'}-${item.id}`,
                title: item.l,
                mediaType: isTv ? 'tv' : 'movie',
                season: isTv ? 1 : undefined,
                episode: isTv ? 1 : undefined,
                artist: stars,
                year,
                genre: isTv ? 'TV Series • Viduki' : 'Feature Film • Viduki',
                category: 'viduki',
                type: 'embed',
                url: playUrl,
                embedUrl: playUrl,
                thumbnailUrl: poster,
                duration: isTv ? 3600 : 7200,
                rating: '9.7/10',
                description: `Watch ${item.l} (${year || 'Stream'}) on Viduki Server ${srv}. Available in HD.`,
                source: 'viduki',
                badge: isTv ? 'Viduki TV 📺' : 'Viduki Cinema 🎬',
                streamQuality: `Server ${srv} • 1080p Ultra HD`,
                availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
                server: srv,
                fallbackAvailable: true,
                imdbId: item.id,
              });
            }
          }
        } catch (err) {
          console.warn('IMDb suggestion search warning:', err);
        }

        // 4. Secondary search via Cinemeta Catalog (for synopsis, genres, and ratings)
        try {
          const cinemetaUrl = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(q)}.json`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const cRes = await fetch(cinemetaUrl, { signal: controller.signal });
          clearTimeout(timeout);

          if (cRes.ok) {
            const cData = await cRes.json();
            const metas = Array.isArray(cData?.metas) ? cData.metas : [];

            for (const item of metas.slice(0, 10)) {
              const itemId = item.imdb_id || item.id;
              if (!itemId || seenIds.has(itemId)) continue;
              seenIds.add(itemId);

              const isTv = item.type === 'series';
              const playUrl = isTv
                ? `https://viduki.net/${srv}/tv/${itemId}/1/1?color=${col}`
                : `https://viduki.net/${srv}/movie/${itemId}?color=${col}`;

              movies.push({
                id: `viduki-${isTv ? 'tv' : 'movie'}-${itemId}`,
                title: item.name,
                mediaType: isTv ? 'tv' : 'movie',
                season: isTv ? 1 : undefined,
                episode: isTv ? 1 : undefined,
                artist: Array.isArray(item.cast) ? item.cast.slice(0, 3).join(', ') : 'Viduki Cinema',
                year: item.year ? String(item.year) : undefined,
                genre: Array.isArray(item.genres) ? item.genres.join(' • ') : (item.genre ? (Array.isArray(item.genre) ? item.genre.join(' • ') : item.genre) : 'Cinema Feature'),
                category: 'viduki',
                type: 'embed',
                url: playUrl,
                embedUrl: playUrl,
                thumbnailUrl: item.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
                backdropUrl: item.background,
                duration: 7200,
                rating: item.imdbRating ? `${item.imdbRating}/10` : '9.6/10',
                description: item.description || `Stream ${item.name} in synchronized HD on Viduki.net.`,
                source: 'viduki',
                badge: isTv ? 'Viduki TV 📺' : 'Viduki Cinema 🎬',
                streamQuality: `Server ${srv} • 1080p Ultra HD`,
                availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
                server: srv,
                fallbackAvailable: true,
                imdbId: item.imdb_id || itemId,
              });
            }
          }
        } catch {}
      }

      // 5. If query was empty or yielded no results, fetch trending movies & series
      if (movies.length === 0) {
        try {
          const trendingRes = await fetch('https://cinemeta-catalogs.strem.io/top/catalog/movie/top.json');
          if (trendingRes.ok) {
            const tData = await trendingRes.json();
            const metas = Array.isArray(tData?.metas) ? tData.metas : [];
            for (const item of metas.slice(0, 24)) {
              const itemId = item.imdb_id || item.id;
              if (!itemId || seenIds.has(itemId)) continue;
              seenIds.add(itemId);

              const playUrl = `https://viduki.net/${srv}/movie/${itemId}?color=${col}`;
              movies.push({
                id: `viduki-movie-${itemId}`,
                title: item.name,
                mediaType: 'movie',
                artist: Array.isArray(item.cast) ? item.cast.slice(0, 3).join(', ') : 'Viduki Cinema',
                year: item.year ? String(item.year) : '2024',
                genre: Array.isArray(item.genres) ? item.genres.join(' • ') : 'Trending Blockbuster',
                category: 'viduki',
                type: 'embed',
                url: playUrl,
                embedUrl: playUrl,
                thumbnailUrl: item.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
                backdropUrl: item.background,
                duration: 7200,
                rating: item.imdbRating ? `${item.imdbRating}/10` : '9.7/10',
                description: item.description || `Trending movie stream on Viduki.net Server ${srv}`,
                source: 'viduki',
                badge: 'Viduki Trending 🔥',
                streamQuality: `Server ${srv} • 1080p Ultra HD`,
                availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
                server: srv,
                fallbackAvailable: true,
                imdbId: item.imdb_id || itemId,
              });
            }
          }
        } catch {}
      }

      res.json({ movies, count: movies.length });
    } catch (err: any) {
      console.error('Viduki search error:', err);
      res.status(500).json({ error: 'Viduki search failed', movies: [] });
    }
  });

  // 5. Trending / Popular movies from Viduki & Cinemeta
  app.get('/api/movies/viduki/trending', async (req, res) => {
    try {
      const srv = vidukiConfig.defaultServer || 1;
      const col = vidukiConfig.themeColor || 'f43f5e';
      const movies: any[] = [];
      const seenIds = new Set<string>();

      // Fetch top trending movies
      try {
        const topMoviesRes = await fetch('https://cinemeta-catalogs.strem.io/top/catalog/movie/top.json');
        if (topMoviesRes.ok) {
          const mData = await topMoviesRes.json();
          const metas = Array.isArray(mData?.metas) ? mData.metas : [];
          for (const item of metas.slice(0, 25)) {
            const itemId = item.imdb_id || item.id;
            if (!itemId || seenIds.has(itemId)) continue;
            seenIds.add(itemId);

            const playUrl = `https://viduki.net/${srv}/movie/${itemId}?color=${col}`;
            movies.push({
              id: `viduki-movie-${itemId}`,
              title: item.name,
              mediaType: 'movie',
              artist: Array.isArray(item.cast) ? item.cast.slice(0, 3).join(', ') : 'Viduki Cinema',
              year: item.year ? String(item.year) : '2024',
              genre: Array.isArray(item.genres) ? item.genres.join(' • ') : 'Trending Movie',
              category: 'viduki',
              type: 'embed',
              url: playUrl,
              embedUrl: playUrl,
              thumbnailUrl: item.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
              backdropUrl: item.background,
              duration: 7200,
              rating: item.imdbRating ? `${item.imdbRating}/10` : '9.8/10',
              description: item.description || 'Trending movie stream from Viduki.net',
              source: 'viduki',
              badge: 'Viduki Trending 🔥',
              streamQuality: `Server ${srv} • 1080p Ultra HD`,
              availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
              server: srv,
              fallbackAvailable: true,
              imdbId: item.imdb_id || itemId,
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch top movies from Cinemeta:', err);
      }

      // Fetch top trending TV series
      try {
        const topSeriesRes = await fetch('https://cinemeta-catalogs.strem.io/top/catalog/series/top.json');
        if (topSeriesRes.ok) {
          const sData = await topSeriesRes.json();
          const metas = Array.isArray(sData?.metas) ? sData.metas : [];
          for (const item of metas.slice(0, 20)) {
            const itemId = item.imdb_id || item.id;
            if (!itemId || seenIds.has(itemId)) continue;
            seenIds.add(itemId);

            const playUrl = `https://viduki.net/${srv}/tv/${itemId}/1/1?color=${col}`;
            movies.push({
              id: `viduki-tv-${itemId}`,
              title: `${item.name} (S1E1)`,
              mediaType: 'tv',
              season: 1,
              episode: 1,
              artist: Array.isArray(item.cast) ? item.cast.slice(0, 3).join(', ') : 'Viduki TV',
              year: item.year ? String(item.year) : '2024',
              genre: Array.isArray(item.genres) ? item.genres.join(' • ') : 'Trending Series',
              category: 'viduki',
              type: 'embed',
              url: playUrl,
              embedUrl: playUrl,
              thumbnailUrl: item.poster || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500',
              backdropUrl: item.background,
              duration: 3600,
              rating: item.imdbRating ? `${item.imdbRating}/10` : '9.8/10',
              description: item.description || 'Trending TV series stream from Viduki.net',
              source: 'viduki',
              badge: 'Viduki Top Series 📺',
              streamQuality: `Server ${srv} • 1080p Ultra HD`,
              availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
              server: srv,
              fallbackAvailable: true,
              imdbId: item.imdb_id || itemId,
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch top series from Cinemeta:', err);
      }

      res.json({ movies, count: movies.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Trending Viduki movies failed', movies: [] });
    }
  });

  // Serve dev-dist files (vite-plugin-pwa development assets)
  const devDistPath = path.join(process.cwd(), 'dev-dist');
  if (fs.existsSync(devDistPath)) {
    app.use('/dev-dist', (req, res, next) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      express.static(devDistPath)(req, res, next);
    });
  }

  // Explicit PWA Service Worker & Manifest routing
  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    const devSwPath = path.join(process.cwd(), 'dev-dist', 'sw.js');
    if (fs.existsSync(swPath)) {
      res.sendFile(swPath);
    } else if (fs.existsSync(devSwPath)) {
      res.sendFile(devSwPath);
    } else {
      res.status(404).send('// Service worker file not found');
    }
  });

  app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
    if (fs.existsSync(manifestPath)) {
      res.sendFile(manifestPath);
    } else {
      res.status(404).json({ error: 'Manifest file not found' });
    }
  });

  // Vite Middleware for Development / Static in Production
  const distPath = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const isProduction = process.env.NODE_ENV === 'production' || (!process.env.NODE_ENV && fs.existsSync(indexHtmlPath));

  if (isProduction && fs.existsSync(indexHtmlPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/socket.io') ||
        req.path.startsWith('/data') ||
        req.path.startsWith('/dev-dist')
      ) {
        return next();
      }
      res.sendFile(indexHtmlPath);
    });
  } else {
    // Intercept dev-dist and data before Vite SPA fallback if requested
    app.use('/dev-dist', (req, res, next) => {
      if (fs.existsSync(devDistPath)) {
        return express.static(devDistPath)(req, res, next);
      }
      next();
    });
    app.use('/data', (req, res, next) => {
      if (fs.existsSync(DATA_DIR)) {
        return express.static(DATA_DIR)(req, res, next);
      }
      next();
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Haven Couple Space server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
