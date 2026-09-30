export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'declined'
  | 'busy';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  statusMood?: string;
  lastActive?: number;
}

export type SpaceType = 'couple' | 'friends';

export interface PendingSpaceDeletion {
  requestedBy: { id: string; name: string; avatar: string };
  requestedAt: number;
  agreedUserIds: string[];
  status: 'pending' | 'cancelled' | 'confirmed';
  totalRequired?: number;
}

export interface SavedSpaceRecord {
  roomId: string;
  passkey: string;
  spaceType: SpaceType;
  title: string;
  partnerOrGroupName: string;
  partnerOrGroupAvatar: string;
  myRole: 'partner1' | 'partner2' | 'member';
  myName: string;
  myAvatar: string;
  lastVisitedAt: number;
  unreadCount?: number;
  isCurrent?: boolean;
  lastMessageText?: string;
  lastMessageTime?: number;
  createdAt?: number;
}

export interface CoupleSpaceConfig {
  roomId: string;
  passkey: string;
  spaceType?: SpaceType;
  groupName?: string;
  groupEmoji?: string;
  userRole: 'partner1' | 'partner2' | 'member';
  userName: string;
  userAvatar: string;
  partnerName: string;
  partnerAvatar: string;
  anniversaryDate?: string;
  autoDeleteTimer?: number; // in seconds (0 = off)
  isVerified?: boolean;
}

export interface CallLogDetails {
  callType: CallType;
  status: 'missed' | 'completed' | 'declined' | 'unanswered';
  duration?: number; // duration in seconds
  callerId: string;
  callerName: string;
  isSquadCall?: boolean;
  groupName?: string;
}

export interface EncryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'love_ping' | 'call_log';
  ciphertext: string; // Base64 AES-GCM encrypted payload
  iv: string;         // Base64 12-byte IV
  timestamp: number;
  expiresAt?: number;
  reactions?: Record<string, string[]>; // emoji -> list of userIds
  fileMetadata?: {
    mimeType: string;
    fileName?: string;
    fileSize?: number;
    duration?: number; // for audio voice notes / video duration
  };
  callLog?: CallLogDetails;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    type: string;
  };
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
  isEdited?: boolean;
  editedAt?: number;
}

export interface DecryptedMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'love_ping' | 'call_log';
  content: string; // decrypted plaintext or local objectURL for media
  timestamp: number;
  expiresAt?: number;
  reactions?: Record<string, string[]>;
  fileMetadata?: {
    mimeType: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
  };
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    type: string;
  };
  callLog?: CallLogDetails;
  isDecrypted: boolean;
  decryptionError?: boolean;
  isDeleted?: boolean;
  deletedForEveryone?: boolean;
  isEdited?: boolean;
  editedAt?: number;
}

export interface StatusComment {
  id: string;
  statusId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
}

export interface FriendStatus {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'text' | 'image';
  text?: string;
  color?: string; // background color for text status
  mediaUrl?: string; // photo/image object URL or data URL
  caption?: string; // caption for photo
  timestamp: number;
  expiresAt: number; // 24 hours after timestamp
  viewers?: string[]; // userIds of friends who viewed this status
  comments?: StatusComment[];
}

export interface SignalData {
  type: 'offer' | 'answer' | 'candidate' | 'renegotiate';
  targetId?: string;
  senderId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface CallEventData {
  callType: CallType;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  roomId: string;
  timestamp: number;
  isSquadCall?: boolean;
}

export interface SquadCallParticipant {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking?: boolean;
  joinedAt: number;
}

export interface ActiveSquadCallState {
  roomId: string;
  callType: CallType;
  startedBy: { id: string; name: string; avatar: string };
  startedAt: number;
  participants: SquadCallParticipant[];
}

export interface LoveBurstEvent {
  id: string;
  senderId: string;
  emoji: string;
  x: number;
  y: number;
}

// Live Love Canvas Types
export interface CanvasStrokePoint {
  x: number;
  y: number;
}

export interface CanvasStroke {
  id: string;
  userId: string;
  tool: 'pen' | 'glow' | 'highlighter' | 'eraser' | 'stamp';
  color: string;
  size: number;
  stampEmoji?: string;
  points: CanvasStrokePoint[];
}

export interface CanvasCursor {
  userId: string;
  userName: string;
  userAvatar: string;
  x: number;
  y: number;
  isDrawing: boolean;
  color: string;
}

// Watch Together / Media Lounge Types
export interface MediaItem {
  id: string;
  title: string;
  artist?: string;
  year?: string | number;
  genre?: string;
  category?: 'romance' | 'comedy' | 'animation' | 'classic' | 'cozy' | 'short_film' | 'scifi' | 'horror' | 'documentary' | 'custom' | string;
  type: 'youtube' | 'audio' | 'video' | 'embed';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  description?: string;
  rating?: string;
  tags?: string[];
  source?: 'archive' | 'blender' | 'youtube' | 'cdn' | 'custom' | 'viduki' | string;
  badge?: string;
  streamQuality?: string;
  backdropUrl?: string;
  streamSourceType?: 'direct_stream' | 'trailer' | 'screen_share' | 'custom' | 'viduki_embed';
  cast?: string[];
  availableOn?: string[];
  matchScore?: number;
  imdbId?: string;
  tmdbId?: string;
  embedUrl?: string;
  durationStr?: string;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  server?: 1 | 2 | 3 | 4 | number;
  color?: string;
  fallbackAvailable?: boolean;
}

export interface VidukiConfig {
  apiKey: string;
  baseUrl?: string;
  embedTemplate?: string;
  enabled: boolean;
  preferredQuality?: string;
  defaultServer?: 1 | 2 | 3 | 4;
  themeColor?: string;
  autoFallbackOnFailure?: boolean;
}

export interface VidukiFailedEvent {
  type: 'viduki:all-servers-failed';
  source?: string;
  stage?: 'initial' | 'manual-switch' | 'playback-error' | string;
  status?: number;
  message?: string;
  media?: {
    type?: 'movie' | 'tv';
    tmdbid?: string;
    imdbid?: string;
    season?: string | number;
    episode?: string | number;
  };
}

export interface VidukiWatchProgress {
  id: string;
  type: 'movie' | 'tv';
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  progress?: {
    watched: number;
    duration: number;
  };
  last_updated?: number;
  number_of_episodes?: number;
  number_of_seasons?: number;
  last_season_watched?: string | number;
  last_episode_watched?: string | number;
  show_progress?: Record<string, {
    season: number | string;
    episode: number | string;
    progress: {
      watched: number;
      duration: number;
    };
    last_updated: number;
  }>;
}

export interface InMovieComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  color?: string;
  timestamp: number;
  videoTime?: number;
  yPercent?: number;
}

export interface MovieWatchlistEntry {
  id: string;
  movie: MediaItem;
  addedBy: string;
  addedByName: string;
  addedAt: number;
  isWatched: boolean;
}

export interface MediaSyncState {
  currentMedia: MediaItem | null;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
  actionType?: 'play' | 'pause' | 'seek' | 'change' | 'next';
  actionText?: string;
}

// Time Capsule ("Open When...") Sealed Letters
export type UnlockConditionType = 'date' | 'milestone' | 'mood' | 'manual';

export interface TimeCapsuleLetter {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  title: string;
  conditionType: UnlockConditionType;
  unlockPrompt: string; // e.g. "Open when you miss me", "Open on Christmas morning", "Open when you need courage"
  unlockTimestamp?: number; // target date timestamp if conditionType === 'date'
  encryptedContent: {
    ciphertext: string;
    iv: string;
  };
  sealColor: string;
  sealEmoji: string;
  isUnlocked: boolean;
  unlockedAt?: number;
  createdAt: number;
}

// Daily Spark (Double-Blind Question of the Day)
export interface DailyPrompt {
  id: string;
  question: string;
  category: 'romantic' | 'deep' | 'fun' | 'memory' | 'future';
  emoji: string;
}

export interface DailySparkAnswer {
  userId: string;
  userName: string;
  userAvatar: string;
  encryptedAnswer: {
    ciphertext: string;
    iv: string;
  };
  submittedAt: number;
}

export interface DailySparkState {
  prompt: DailyPrompt;
  dateKey: string; // YYYY-MM-DD
  answers: Record<string, DailySparkAnswer>; // userId -> Answer
}

// Live Touch Pulse (Virtual Hand Holding)
export interface TouchPoint {
  userId: string;
  userName: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  intensity: number; // 0-1
  color: string;
  isActive: boolean;
  updatedAt: number;
}

// Love Bucket List & Scrapbook
export interface BucketListItem {
  id: string;
  title: string;
  category: 'travel' | 'adventure' | 'date_night' | 'milestone' | 'cozy';
  targetDate?: string;
  isCompleted: boolean;
  completedAt?: number;
  completedPhotoUrl?: string;
  memoryNote?: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

// 1. Sleep Sanctuary & Ambient Soundscapes Types
export type SoundscapeType = 'rain' | 'campfire' | 'ocean' | 'cafe' | 'thunder' | 'whitenoise';

export interface SleepSanctuaryState {
  isActive: boolean;
  soundscape: SoundscapeType;
  volume: number; // 0 - 1
  isOledDimmed: boolean;
  sleepStartedAt?: number;
  partnerAsleep: boolean;
  alarmTime?: string; // HH:MM
}

// 2. Couple & Group Games Lounge Types
export type GameType =
  | 'chess'
  | 'connect_hearts'
  | 'draughts'
  | 'ludo'
  | 'candy_crush'
  | 'battleship'
  | 'dots_and_boxes'
  | 'deep_cards'
  | 'know_me'
  | 'this_or_that'
  | 'most_likely'
  | 'truth_or_dare'
  | 'spin_bottle'
  | 'buzzer_battle'
  | 'group_trivia';


export interface KnowMeQuestion {
  id: string;
  question: string;
  options: string[];
  targetUserId: string; // whose truth is it
  correctIndex?: number;
  partnerGuessIndex?: number;
}

export interface ThisOrThatRound {
  id: string;
  optionA: { text: string; emoji: string };
  optionB: { text: string; emoji: string };
  userChoices: Record<string, 'A' | 'B'>; // userId -> choice
}

export interface MostLikelyRound {
  id: string;
  statement: string;
  votes: Record<string, string>; // voterUserId -> chosenUserId
}

// 3. Secret Polaroids Vault Types
export interface PolaroidPhoto {
  id: string;
  senderId: string;
  senderName: string;
  caption: string;
  dateStr: string;
  photoUrl: string; // encrypted dataUrl
  filter: 'vintage' | 'warm' | 'noir' | 'dreamy' | 'film';
  isShakeToReveal: boolean;
  isRevealed: boolean;
  heartsCount: number;
  createdAt: number;
}

// 4. Partner Weather, Local Time & Distance Horizon
export interface HorizonLocation {
  city: string;
  timezone: string;
  latitude: number;
  longitude: number;
  weatherCondition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'clear_night' | 'sunset';
  tempC: number;
  tempF: number;
  updatedAt: number;
}

// 5. Couples Habit & Care Tracker (Love Badges & Hug Bank)
export interface LoveCoupon {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: 'affection' | 'service' | 'treat' | 'adventure';
  isRedeemed: boolean;
  redeemedAt?: number;
  createdBy: string;
}

export interface CarePromptEvent {
  id: string;
  senderId: string;
  senderName: string;
  promptType: 'water' | 'hug' | 'stretch' | 'meal' | 'kiss' | 'sleep' | 'breathe';
  message: string;
  timestamp: number;
}

// 6. Music Lounge & Synced Jukebox Types
export type MusicMood = 'romantic' | 'lofi' | 'ambient' | 'peaceful' | 'cafe' | 'synth' | 'pop' | 'afro' | 'hiphop' | 'trending';

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: number; // in seconds
  coverEmoji: string;
  coverGradient: string;
  mood: MusicMood;
  bpm: number;
  url?: string;
  artworkUrl?: string;
  synthTheme: string;
  source?: 'tubidy' | 'itunes' | 'archive' | 'local' | 'stream';
}

export interface SyncMusicState {
  trackId: string;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
  updatedBy: string;
  volume: number;
  customTrack?: MusicTrack;
}

// 7. Haven Singles Lounge & Discovery Types
export type SingleGender = 'woman' | 'man' | 'non-binary' | 'other';
export type SingleLookingFor = 'men' | 'women' | 'everyone' | 'dating' | 'movie_buddy' | 'gaming' | 'deep_talks';
export type SingleIntent = 'dating' | 'long_term' | 'movie_buddy' | 'gaming_partner' | 'deep_talks' | 'open_to_vibes';

export interface SinglePrompt {
  id?: string;
  question: string;
  answer: string;
}

export type IdDocumentType = 'drivers_license' | 'passport' | 'national_id' | 'student_id';

export interface IdVerificationData {
  status: 'verified' | 'unverified';
  idType: IdDocumentType;
  documentName: string;
  documentNumberMasked?: string;
  documentPhotoUrl?: string;
  verifiedAt?: number;
  verificationMethod?: 'id_document_upload' | 'digital_id_scan';
  isIdProvided: boolean;
  notes?: string;
}

export interface SingleProfile {
  id: string;
  name: string;
  age: number;
  gender: SingleGender;
  lookingFor: SingleLookingFor[];
  intent: SingleIntent;
  city: string;
  country?: string;
  bio: string;
  avatar: string;
  interests: string[];
  prompts: SinglePrompt[];
  currentVibe: string;
  onlineStatus: 'online' | 'active_today' | 'in_hangout';
  registeredAt: number;
  lastActive: number;
  likesCount?: number;
  allowDirectInvites?: boolean;
  isRealUser?: boolean;
  origin?: 'registered' | 'seed';
  verificationBadge?: 'verified_real' | 'verified_id' | 'unverified_pending_id' | 'new_member' | 'top_spark' | string;
  isIdVerified?: boolean;
  idVerification?: IdVerificationData;
  isBiometricVerified?: boolean;
  biometricVerifiedAt?: number;
  biometricConfidence?: number;
  biometricSnapshotUrl?: string;
  isFeatured?: boolean;
  contactSocial?: string;
  voicePromptUrl?: string;
  voicePromptQuestion?: string;
  voicePromptDuration?: number;
  voicePromptDurationSec?: number;
  wingmanEndorsement?: string | {
    text: string;
    friendName?: string;
    tag?: string;
  };
  wingmanVouch?: WingmanVouchData;
  respectfulCommunicatorBadge?: boolean;
  biometricVerification?: any;
}

export interface SpeedRoundParticipant {
  id: string;
  name: string;
  alias: string;
  avatar: string;
  isRealUser?: boolean;
  city?: string;
  vibe?: string;
}

export interface SpeedRoundMessage {
  id: string;
  senderId: string;
  senderAlias: string;
  text: string;
  timestamp: number;
  isIcebreakerAnswer?: boolean;
}

export interface SpeedRoundPrompt {
  id: string;
  question: string;
  options?: string[];
}

export interface SpeedRoundSession {
  sessionId: string;
  participantA: SpeedRoundParticipant;
  participantB: SpeedRoundParticipant;
  startTime: number;
  durationSeconds: number;
  currentPromptIndex: number;
  messages: SpeedRoundMessage[];
  decisionA?: 'spark' | 'pass' | 'pending';
  decisionB?: 'spark' | 'pass' | 'pending';
  isMatched?: boolean;
  revealed?: boolean;
  roomId?: string;
  passkey?: string;
}

export interface DuelQuestion {
  id: string;
  question: string;
  optionA: { text: string; emoji: string; subtitle?: string };
  optionB: { text: string; emoji: string; subtitle?: string };
  category: 'vibe' | 'date_night' | 'lifestyle' | 'comfort' | 'values';
}

export interface CompatibilityDuel {
  id: string;
  partner: SingleProfile;
  questions: DuelQuestion[];
  userAnswers: Record<string, 'A' | 'B'>;
  partnerAnswers: Record<string, 'A' | 'B'>;
  calculatedScore?: number;
  isCompleted: boolean;
}

export interface SingleSparkWave {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId: string;
  type: 'wave' | 'crush' | 'spark' | 'invite' | 'video_screening';
  message: string;
  timestamp: number;
  proposedRoomId?: string;
  proposedPasskey?: string;
  read?: boolean;
}

export interface ScreeningQuestion {
  id: string;
  category: 'values' | 'romance' | 'lifestyle' | 'quirky';
  categoryLabel: string;
  categoryEmoji: string;
  question: string;
  subtext?: string;
  suggestedAnswers?: string[];
}

export interface VideoScreeningSession {
  sessionId: string;
  participantA: SingleProfile;
  participantB: SingleProfile;
  startedAt: number;
  durationSeconds: number;
  currentQuestionIndex: number;
  decisionA?: 'match' | 'leave' | 'pending';
  decisionB?: 'match' | 'leave' | 'pending';
  isMatched?: boolean;
  roomId?: string;
  passkey?: string;
  isSimulated?: boolean;
}

export interface VideoScreeningInvite {
  inviteId: string;
  fromUser: SingleProfile;
  toUserId: string;
  timestamp: number;
}

// 8. Wingman Voice Vouch
export interface WingmanVouchData {
  friendName: string;
  relationship: string;
  audioUrl?: string;
  durationSec: number;
  quote: string;
  verifiedAt: number;
  highlightTag: string;
}

// 9. Virtual Date Scheduler
export type VirtualDateTheme = 'movie_night' | 'coffee_chat' | 'late_night_duo' | 'trivia_clash' | 'stargazing';

export interface VirtualDateInvite {
  id: string;
  fromProfile: SingleProfile;
  toProfile: SingleProfile;
  theme: VirtualDateTheme;
  title: string;
  scheduledTime: number;
  note?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  roomId?: string;
  passkey?: string;
  createdAt: number;
}

// 10. Date Safety & Rescue Call
export interface RescueCallConfig {
  triggerAfterSeconds: number;
  callerName: string;
  callerRole: string;
  callerAvatar?: string;
  voiceScenario: 'roommate_emergency' | 'work_crisis' | 'mom_checkin' | 'delivery_urgent';
  customNote?: string;
}

export interface SafetyCheckInTimer {
  id: string;
  durationMinutes: number;
  startedAt: number;
  alertSent: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  locationNote?: string;
}

// 11. Interactive In-Call Mini-Games
export type ScreeningMiniGameType = 'none' | 'two_truths' | 'dealbreakers' | 'scribble';

export interface TwoTruthsLieGame {
  statements: { text: string; isLie: boolean; guessedAsLieByPartner?: boolean }[];
  authorId: string;
  authorName: string;
  revealed: boolean;
}

export interface DealbreakerItem {
  id: number;
  title: string;
  category: 'dating' | 'lifestyle' | 'quirks';
  emoji: string;
}

export interface DealbreakerGameState {
  currentIndex: number;
  myVote?: 'dealbreaker' | 'tolerable' | 'love_it';
  partnerVote?: 'dealbreaker' | 'tolerable' | 'love_it';
}

// 12. Ghost-Free Dating & Gentle Closure Assistant
export type GentleClosureCategory =
  | 'no_spark'
  | 'different_goals'
  | 'friends_vibe'
  | 'taking_break'
  | 'bad_timing';

export type GentleClosureTone = 'gentle' | 'direct' | 'playful' | 'deep';

export interface GentleClosureTemplate {
  id: string;
  category: GentleClosureCategory;
  categoryLabel: string;
  categoryEmoji: string;
  title: string;
  preview: string;
  templateText: string;
  tags: string[];
}

export interface GentleClosureMessage {
  id: string;
  fromProfile: SingleProfile;
  toProfile: SingleProfile;
  category: GentleClosureCategory;
  tone: GentleClosureTone;
  text: string;
  sentAt: number;
  acknowledged?: boolean;
}

export interface ActiveConversationItem {
  id: string;
  partnerProfile: SingleProfile;
  lastMessageText: string;
  lastSenderId: string;
  lastActiveTimestamp: number;
  isFading?: boolean;
  isArchived?: boolean;
  closureMessage?: GentleClosureMessage;
}

// 13. IRL Safe Date Planner & Venue Directory
export type SafeDateVenueCategory =
  | 'coffee_tea'
  | 'museum_art'
  | 'arcade_games'
  | 'rooftop_lounge'
  | 'dessert_gelato'
  | 'park_stroll'
  | 'pottery_craft';

export interface SafeDateVenue {
  id: string;
  name: string;
  category: SafeDateVenueCategory;
  categoryLabel: string;
  city: string;
  neighborhood: string;
  address: string;
  googleMapsQuery: string;
  imageUrl: string;
  priceTier: '$' | '$$' | '$$$';
  noiseLevel: 'quiet' | 'moderate' | 'lively';
  vibeTags: string[];
  safetyPerks: string[];
  openingHours: string;
  suggestedDuration: string;
  suggestedIcebreaker: string;
  isVerifiedSafeSpot: boolean;
  rating: number;
  reviewsCount: number;
}

export type SafeDateBillPreference =
  | 'my_treat'
  | 'split_5050'
  | 'take_turns'
  | 'free_activity';

export interface SafeDatePlan {
  id: string;
  fromProfile: SingleProfile;
  toProfile: SingleProfile;
  venue: SafeDateVenue;
  dateTime: number; // scheduled timestamp
  durationMinutes: number;
  billPreference: SafeDateBillPreference;
  specialNote?: string;
  status: 'proposed' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  safetyTimerActive?: boolean;
  safetyCheckInDeadline?: number;
  safetyCheckInStatus?: 'pending' | 'checked_in_safe' | 'alert_triggered' | 'extended';
  createdAt: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt?: number;
  spaces?: string[];
}

export interface SpaceEmailInvite {
  id: string;
  roomId: string;
  passkey: string;
  spaceName: string;
  spaceType: SpaceType;
  senderEmail: string;
  senderName: string;
  spouseEmail: string;
  message?: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined';
}

export interface VoicemailGreeting {
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


