import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Tv,
  Plus,
  Heart,
  Sparkles,
  Users,
  SkipForward,
  FastForward,
  SkipBack,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneCall,
  PhoneOff,
  Search,
  Film,
  Bookmark,
  BookmarkCheck,
  Send,
  MessageSquare,
  Maximize,
  Minimize,
  Maximize2,
  Minimize2,
  Sliders,
  Flame,
  Laugh,
  Eye,
  Info,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Copy,
  Loader2,
  Globe,
  Dices,
  Clapperboard,
  Sparkle,
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
  EyeOff,
  Key,
  ShieldCheck,
  HelpCircle,
  Server,
  Palette,
  RefreshCw,
  Layers,
} from 'lucide-react';
import {
  MediaItem,
  MediaSyncState,
  UserProfile,
  InMovieComment,
  MovieWatchlistEntry,
  CallType,
  CallStatus,
  VidukiConfig,
  VidukiFailedEvent,
  VidukiWatchProgress,
} from '../types';
import { FEATURED_MOVIES, extractYouTubeId, searchOrFetchMovie, fetchOnlineMovies, searchOnlineMovies, getSurpriseMovie, fetchDirectYouTubeVideo, searchYouTubeDirect } from '../utils/movieCatalog';
import {
  getVidukiConfig,
  saveVidukiConfig,
  testVidukiConnection,
  searchVidukiMovies,
  fetchVidukiTrending,
  DEFAULT_VIDUKI_CONFIG,
  switchVidukiServer,
  switchVidukiEpisode,
  buildVidukiStreamUrl,
  saveVidukiProgress,
  getVidukiProgress,
  FEATURED_VIDUKI_CATALOG,
} from '../utils/vidukiService';
import { VerifiedBadgeOverlay } from './common/VerifiedBadgeOverlay';
import { useHavenVoiceAssistant } from '../hooks/useHavenVoiceAssistant';
import { HavenVoiceControl } from './HavenVoiceControl';
import { SeriesSeasonPickerModal } from './SeriesSeasonPickerModal';
import { isSeriesItem, cleanSeriesTitle, getSeriesSeasons } from '../utils/seriesData';

interface WatchTogetherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  partner: UserProfile | null;
  partnerName: string;
  mediaSyncState: MediaSyncState | null;
  onSyncMedia: (state: MediaSyncState) => void;
  onSendLoveBurst: (emoji: string) => void;
  // Space Type & Squad Context
  spaceType?: 'couple' | 'friends';
  groupName?: string;
  groupEmoji?: string;
  roomMembers?: UserProfile[];
  // Voice & Video Call Integration for talking during movies
  activeCallType: CallType | null;
  callStatus: CallStatus;
  isMuted: boolean;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onStartCall: (type: CallType) => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSendInMovieComment?: (comment: InMovieComment) => void;
  incomingInMovieComment?: InMovieComment | null;
}

export const WatchTogetherModal: React.FC<WatchTogetherModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  partner,
  partnerName,
  mediaSyncState,
  onSyncMedia,
  onSendLoveBurst,
  spaceType = 'couple',
  groupName,
  groupEmoji,
  roomMembers,
  activeCallType,
  callStatus,
  isMuted,
  isVideoEnabled,
  localStream,
  remoteStream,
  onStartCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onSendInMovieComment,
  incomingInMovieComment,
}) => {
  const isFriends = spaceType === 'friends';
  const effectiveGroupName = groupName || 'Squad Hangout';
  const squadMembersCount = roomMembers && roomMembers.length > 0 ? roomMembers.length : 1;
  const [currentMedia, setCurrentMedia] = useState<MediaItem>(FEATURED_VIDUKI_CATALOG[0]);
  const ytId = currentMedia.type === 'youtube' ? extractYouTubeId(currentMedia.url) : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerActive, setIsPlayerActive] = useState<boolean>(() => {
    return Boolean(mediaSyncState?.isPlaying);
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [movieVolume, setMovieVolume] = useState(0.85);
  const [isMutedMovie, setIsMutedMovie] = useState(false);
  const [lastSyncBy, setLastSyncBy] = useState<string>('');

  // Movie Fetcher & Search States (Viduki.net & YouTube ONLY)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'youtube' | 'viduki'>('viduki');
  const [selectedCategory, setSelectedCategory] = useState<string>('viduki');
  const [searchResults, setSearchResults] = useState<MediaItem[]>(FEATURED_VIDUKI_CATALOG);
  const [isSearching, setIsSearching] = useState(false);
  const [showCatalog, setShowCatalog] = useState(true);
  const [showCustomLinkInput, setShowCustomLinkInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [ytFetchLoading, setYtFetchLoading] = useState(false);
  const [ytPreviewItem, setYtPreviewItem] = useState<MediaItem | null>(null);

  // Viduki.net Movie Streaming API State
  const [vidukiConfig, setVidukiConfig] = useState<VidukiConfig>(DEFAULT_VIDUKI_CONFIG);
  const [showVidukiModal, setShowVidukiModal] = useState(false);
  const [vidukiKeyInput, setVidukiKeyInput] = useState('');
  const [vidukiBaseUrlInput, setVidukiBaseUrlInput] = useState('https://viduki.net/api');
  const [vidukiTemplateInput, setVidukiTemplateInput] = useState('https://viduki.net/{server}/movie/{id}?color={color}');
  const [vidukiQualityInput, setVidukiQualityInput] = useState('1080p Ultra HD');
  const [vidukiServerInput, setVidukiServerInput] = useState<1 | 2 | 3 | 4>(1);
  const [vidukiColorInput, setVidukiColorInput] = useState('f43f5e');
  const [showVidukiKey, setShowVidukiKey] = useState(false);
  const [isTestingViduki, setIsTestingViduki] = useState(false);
  const [vidukiTestResult, setVidukiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSavingViduki, setIsSavingViduki] = useState(false);
  const [vidukiSearchQuery, setVidukiSearchQuery] = useState('');
  const [vidukiTestMovies, setVidukiTestMovies] = useState<MediaItem[]>([]);
  const [isSearchingVidukiTest, setIsSearchingVidukiTest] = useState(false);
  const [vidukiNotice, setVidukiNotice] = useState<{ type: 'info' | 'warning' | 'error'; message: string } | null>(null);
  const [seriesModalItem, setSeriesModalItem] = useState<MediaItem | null>(null);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Showcase Spotlight & Screen Share States
  const [spotlightMovie, setSpotlightMovie] = useState<MediaItem>(FEATURED_VIDUKI_CATALOG[0]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Shared Couple / Squad Watchlist
  const watchlistKey = isFriends ? 'haven_squad_watchlist' : 'haven_movie_watchlist';
  const [watchlist, setWatchlist] = useState<MovieWatchlistEntry[]>(() => {
    try {
      const saved = localStorage.getItem(isFriends ? 'haven_squad_watchlist' : 'haven_movie_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Talking / Voice Chat & Audio Ducking
  const [autoDucking, setAutoDucking] = useState(true);
  const [showCamPiP, setShowCamPiP] = useState(true);
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [partnerVoiceVolume, setPartnerVoiceVolume] = useState(1.0);

  // In-Movie Live Bullet Comments (Danmaku)
  const [liveComments, setLiveComments] = useState<InMovieComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [showSideChat, setShowSideChat] = useState(false);
  const [isSideChatFullscreen, setIsSideChatFullscreen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControlsInFullscreen, setShowControlsInFullscreen] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Autoplay & Next Video Management
  const [isAutoplayNext, setIsAutoplayNext] = useState<boolean>(true);
  const [nextCountdown, setNextCountdown] = useState<{
    active: boolean;
    secondsLeft: number;
    nextMovie: MediaItem;
  } | null>(null);
  const hasTriggeredEndedRef = useRef<boolean>(false);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const vidukiIframeRef = useRef<HTMLIFrameElement | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Send control commands to embedded YouTube iframe
  const sendYouTubeCommand = useCallback((func: string, args: any[] = []) => {
    if (ytIframeRef.current?.contentWindow) {
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func,
            args,
          }),
          '*'
        );
        // Also post with empty string args if args is empty, ensuring universal YouTube embed compatibility
        if (args.length === 0) {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func,
              args: '',
            }),
            '*'
          );
        }
      } catch (err) {
        console.warn('Failed to post command to YouTube iframe:', err);
      }
    }
  }, []);

  // Send play/pause commands to embedded Viduki cinema iframe
  const sendVidukiCommand = useCallback((action: 'play' | 'pause') => {
    const iframe = vidukiIframeRef.current;
    if (!iframe?.contentWindow) return;
    const targetFunc = action === 'play' ? 'playVideo' : 'pauseVideo';
    const payloads = [
      { event: 'command', func: targetFunc, args: [] },
      { event: 'command', func: action, args: [] },
      { action },
      { method: action },
      { type: action },
      { type: `player:${action}` },
      { event: action },
      action,
    ];
    payloads.forEach((payload) => {
      try {
        iframe.contentWindow?.postMessage(typeof payload === 'string' ? payload : JSON.stringify(payload), '*');
        if (typeof payload !== 'string') {
          iframe.contentWindow?.postMessage(payload, '*');
        }
      } catch {
        // Cross-origin message safety
      }
    });
  }, []);

  // Synchronized movie volume change handler (supports HTML5 video and YouTube)
  const handleMovieVolumeChange = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setMovieVolume(clamped);
    const muted = clamped === 0;
    setIsMutedMovie(muted);

    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = muted;
    }

    if (muted) {
      sendYouTubeCommand('mute');
    } else {
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('setVolume', [Math.round(clamped * 100)]);
    }
  }, [sendYouTubeCommand]);

  // Synchronized mute toggle handler
  const handleToggleMovieMute = useCallback(() => {
    const nextMuted = !isMutedMovie;
    setIsMutedMovie(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted) {
        videoRef.current.volume = movieVolume > 0 ? movieVolume : 0.85;
      }
    }

    if (nextMuted) {
      sendYouTubeCommand('mute');
    } else {
      sendYouTubeCommand('unMute');
      const target = movieVolume > 0 ? movieVolume : 0.85;
      sendYouTubeCommand('setVolume', [Math.round(target * 100)]);
    }
  }, [isMutedMovie, movieVolume, sendYouTubeCommand]);

  const isCallActive = callStatus === 'connected';

  // Attach local and remote streams to video/audio tags
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, showCamPiP]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = partnerVoiceVolume;
    }
  }, [remoteStream, showCamPiP, partnerVoiceVolume]);

  // Voice Activity Detection / Audio Ducking:
  // When partner voice stream has active audio, smoothly duck the movie volume
  useEffect(() => {
    if (!remoteStream || !isCallActive || !autoDucking) return;

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId: number;

    try {
      const audioTrack = remoteStream.getAudioTracks()[0];
      if (audioTrack) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContext = new AudioCtx();
        const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudioLevel = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const speaking = average > 25; // voice threshold
          setIsPartnerSpeaking(speaking);

          // Duck movie volume if partner is speaking (supports both HTML5 and YouTube)
          const targetVol = isMutedMovie
            ? 0
            : speaking
            ? Math.max(0.15, movieVolume * 0.3)
            : movieVolume;

          if (videoRef.current) {
            videoRef.current.volume = targetVol;
          }
          if (ytId && !isMutedMovie) {
            sendYouTubeCommand('setVolume', [Math.round(targetVol * 100)]);
          }

          animationFrameId = requestAnimationFrame(checkAudioLevel);
        };

        checkAudioLevel();
      }
    } catch {
      // ignore web audio restrictions
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [remoteStream, isCallActive, autoDucking, movieVolume, isMutedMovie]);

  // Listen for incoming in-movie bullet comments
  useEffect(() => {
    if (incomingInMovieComment) {
      setLiveComments((prev) => [...prev.slice(-25), incomingInMovieComment]);
    }
  }, [incomingInMovieComment]);

  // Sync state from incoming partner updates
  useEffect(() => {
    if (!mediaSyncState) return;

    // Ignore self-broadcasts to prevent race condition feedback loops
    if (mediaSyncState.updatedBy === currentUserId) return;

    if (mediaSyncState.currentMedia && mediaSyncState.currentMedia.id !== currentMedia.id) {
      setCurrentMedia(mediaSyncState.currentMedia);
      setIsPlayerActive(true);
    }

    if (mediaSyncState.isPlaying) {
      setIsPlayerActive(true);
    }

    setLastSyncBy(mediaSyncState.updatedByName || partnerName);

    if (videoRef.current && currentMedia.type === 'video') {
      const video = videoRef.current;
      const timeDiff = Math.abs(video.currentTime - mediaSyncState.currentTime);
      if (timeDiff > 2.5) {
        video.currentTime = mediaSyncState.currentTime;
      }

      if (mediaSyncState.isPlaying) {
        video.play().catch(() => {});
        setIsPlaying(true);
        isPlayingRef.current = true;
      } else {
        video.pause();
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    } else {
      setIsPlaying(mediaSyncState.isPlaying);
      isPlayingRef.current = mediaSyncState.isPlaying;
      setCurrentTime(mediaSyncState.currentTime);

      const isYt = currentMedia.type === 'youtube' || Boolean(ytId);
      if (isYt) {
        sendYouTubeCommand(mediaSyncState.isPlaying ? 'playVideo' : 'pauseVideo');
      } else {
        sendVidukiCommand(mediaSyncState.isPlaying ? 'play' : 'pause');
      }
    }
  }, [mediaSyncState, currentMedia.id, currentMedia.type, partnerName, currentUserId, ytId, sendYouTubeCommand, sendVidukiCommand]);

  // Broadcast sync state helper
  const broadcastSync = useCallback(
    (newPlaying: boolean, newTime: number, media: MediaItem = currentMedia) => {
      onSyncMedia({
        currentMedia: media,
        isPlaying: newPlaying,
        currentTime: newTime,
        updatedAt: Date.now(),
        updatedBy: currentUserId,
        updatedByName: currentUserName,
      });
    },
    [currentMedia, currentUserId, currentUserName, onSyncMedia]
  );

  // Play / Pause Toggle (Supports HTML5 video, YouTube, Viduki cinema & embeds)
  const togglePlayPause = useCallback(
    (forceState?: boolean | React.MouseEvent | any) => {
      const isExplicitBool = typeof forceState === 'boolean';
      const currentState = isPlayingRef.current;
      const nextState = isExplicitBool ? forceState : !currentState;

      setIsPlaying(nextState);
      isPlayingRef.current = nextState;
      if (nextState) {
        setIsPlayerActive(true);
      }

      const mediaType = currentMedia.type;
      const isYt = mediaType === 'youtube' || Boolean(ytId);

      if (mediaType === 'video' && videoRef.current) {
        if (nextState) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      } else if (isYt) {
        sendYouTubeCommand(nextState ? 'playVideo' : 'pauseVideo');
      } else {
        // Viduki & embedded streaming cinema
        sendVidukiCommand(nextState ? 'play' : 'pause');
      }

      broadcastSync(nextState, videoRef.current ? videoRef.current.currentTime : currentTime);
    },
    [currentMedia.type, ytId, sendYouTubeCommand, sendVidukiCommand, broadcastSync, currentTime]
  );

  // Screen Share Toggle (Watch Screen / Tab with Audio)
  const handleToggleScreenShare = async () => {
    if (isScreenSharing && localScreenStream) {
      localScreenStream.getTracks().forEach((t) => t.stop());
      setLocalScreenStream(null);
      setIsScreenSharing(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: true, // Captures tab and movie audio from browser tab, video, or YouTube
      });

      setLocalScreenStream(stream);
      setIsScreenSharing(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0].onended = () => {
        stream.getTracks().forEach((t) => t.stop());
        setLocalScreenStream(null);
        setIsScreenSharing(false);
      };
    } catch (err) {
      console.warn('Screen share cancelled or not supported:', err);
    }
  };

  useEffect(() => {
    if (screenVideoRef.current && localScreenStream) {
      screenVideoRef.current.srcObject = localScreenStream;
    }
  }, [localScreenStream, isScreenSharing]);

  // Change Movie or Stream
  const handleChangeMovie = useCallback((media: MediaItem) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setNextCountdown(null);
    hasTriggeredEndedRef.current = false;

    setCurrentMedia(media);
    setSpotlightMovie(media);
    setIsPlayerActive(true);
    setIsPlaying(true);
    setCurrentTime(0);

    // Stop screen sharing if user selects a catalog movie
    if (isScreenSharing && localScreenStream) {
      localScreenStream.getTracks().forEach((t) => t.stop());
      setLocalScreenStream(null);
      setIsScreenSharing(false);
    }

    if (media.type === 'video' && videoRef.current) {
      videoRef.current.src = media.url;
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    broadcastSync(true, 0, media);
  }, [isScreenSharing, localScreenStream, broadcastSync]);

  // Resolve the next video in sequence: TV series auto-advances to next episode/season, or next movie in queue
  const getNextVideo = useCallback((): MediaItem => {
    // 0. TV Series Autoplay: Auto-advance to next episode or next season seamlessly
    if (isSeriesItem(currentMedia)) {
      const currentSeason = currentMedia.season || 1;
      const currentEp = currentMedia.episode || 1;
      const seasons = getSeriesSeasons(currentMedia);
      const seasonObj = seasons.find((s) => s.seasonNumber === currentSeason);
      const totalEpisodesInSeason = seasonObj?.episodeCount || 10;
      const maxSeason = seasons.length > 0 ? seasons[seasons.length - 1].seasonNumber : 1;

      let targetSeason = currentSeason;
      let targetEp = currentEp + 1;

      if (currentEp >= totalEpisodesInSeason) {
        // Current season has finished! Transition to the first episode of the next season
        if (currentSeason < maxSeason) {
          targetSeason = currentSeason + 1;
          targetEp = 1;
        } else {
          // Wrapped around the final season: loop back to Season 1 Episode 1
          targetSeason = 1;
          targetEp = 1;
        }
      }

      const color = vidukiConfig.themeColor || vidukiColorInput || 'f43f5e';
      return switchVidukiEpisode(currentMedia, targetSeason, targetEp, color);
    }

    // 1. If currently browsing/searching with multiple results, pick the next one in the shelf
    if (searchResults && searchResults.length > 1) {
      const idx = searchResults.findIndex((m) => m.id === currentMedia.id || m.url === currentMedia.url);
      if (idx !== -1) {
        return searchResults[(idx + 1) % searchResults.length];
      }
    }

    // 2. Check if currently watching something from the shared watchlist
    if (watchlist && watchlist.length > 1) {
      const wIdx = watchlist.findIndex((w) => w.movie.id === currentMedia.id || w.movie.url === currentMedia.url);
      if (wIdx !== -1) {
        return watchlist[(wIdx + 1) % watchlist.length].movie;
      }
    }

    // 3. Fallback to FEATURED_VIDUKI_CATALOG sequence
    const vIdx = FEATURED_VIDUKI_CATALOG.findIndex((m) => m.id === currentMedia.id || m.url === currentMedia.url);
    if (vIdx !== -1 && FEATURED_VIDUKI_CATALOG.length > 1) {
      return FEATURED_VIDUKI_CATALOG[(vIdx + 1) % FEATURED_VIDUKI_CATALOG.length];
    }

    // 4. Default fallback to next available movie in catalog
    const remaining = FEATURED_VIDUKI_CATALOG.filter((m) => m.id !== currentMedia.id);
    return remaining.length > 0 ? remaining[0] : FEATURED_VIDUKI_CATALOG[0];
  }, [searchResults, currentMedia.id, currentMedia.url, watchlist]);

  // Triggered when any video (HTML5 or YouTube) finishes playing
  const handleVideoFinished = useCallback(() => {
    if (hasTriggeredEndedRef.current) return;
    hasTriggeredEndedRef.current = true;

    if (!isAutoplayNext) {
      setIsPlaying(false);
      return;
    }

    const nextMovie = getNextVideo();
    if (!nextMovie) {
      setIsPlaying(false);
      return;
    }

    // Start 3-second countdown to jump to next video with clear HUD banner
    setNextCountdown({ active: true, secondsLeft: 3, nextMovie });

    let count = 3;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setNextCountdown(null);
        hasTriggeredEndedRef.current = false;
        handleChangeMovie(nextMovie);
      } else {
        setNextCountdown((prev) => (prev ? { ...prev, secondsLeft: count } : null));
      }
    }, 1000);
  }, [isAutoplayNext, getNextVideo, handleChangeMovie]);

  // Manually jump to next video immediately
  const handlePlayNext = useCallback((immediate: boolean = true) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setNextCountdown(null);

    const next = getNextVideo();
    if (next) {
      handleChangeMovie(next);
    }
  }, [getNextVideo, handleChangeMovie]);

  // Cancel next video countdown if user wants to stay on current screen
  const handleCancelNextCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setNextCountdown(null);
    setIsPlaying(false);
  };

  // YouTube iFrame API message listener for automatic next video progression
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;

      // YouTube Player States: -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
      if (data.event === 'onStateChange' || (data.event === 'infoDelivery' && data.info)) {
        const state = data.info?.playerState !== undefined ? data.info.playerState : data.info;
        if (state === 1) {
          setIsPlaying(true);
          isPlayingRef.current = true;
        } else if (state === 2) {
          setIsPlaying(false);
          isPlayingRef.current = false;
        } else if (state === 0) {
          setIsPlaying(false);
          isPlayingRef.current = false;
          handleVideoFinished();
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Periodically notify YouTube iframe that parent is listening for API events and ensure volume is synced
    const pingIframe = () => {
      if (ytIframeRef.current?.contentWindow) {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
          '*'
        );
        // Guarantee volume and mute match current settings
        if (isMutedMovie) {
          sendYouTubeCommand('mute');
        } else {
          sendYouTubeCommand('unMute');
          sendYouTubeCommand('setVolume', [Math.round(movieVolume * 100)]);
        }
      }
    };

    const intervalId = setInterval(pingIframe, 2500);
    pingIframe();

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(intervalId);
    };
  }, [handleVideoFinished]);

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // HTML5 Video element event bindings
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentMedia.type !== 'video') return;

    const handlePlay = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
    };

    const handlePause = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Extra safety check for video end
      if (video.duration && video.duration > 5 && video.currentTime >= video.duration - 0.4) {
        handleVideoFinished();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || currentMedia.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      handleVideoFinished();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentMedia, handleVideoFinished]);

  // Seek
  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    if (currentMedia.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = seconds;
    } else {
      sendYouTubeCommand('seekTo', [seconds, true]);
    }
    broadcastSync(isPlaying, seconds);
  };

  // Skip relative (+/- 10s)
  const handleSkip = (deltaSeconds: number) => {
    const next = Math.max(0, currentTime + deltaSeconds);
    handleSeek(next);
  };

  // Load Viduki config & catalog on mount
  useEffect(() => {
    let isMounted = true;
    setSearchResults(FEATURED_VIDUKI_CATALOG);
    // Load Viduki config & full trending catalog
    getVidukiConfig().then((cfg) => {
      if (!isMounted) return;
      setVidukiConfig(cfg);
      setVidukiKeyInput(cfg.apiKey || '');
      setVidukiBaseUrlInput(cfg.baseUrl || 'https://viduki.net/api');
      setVidukiTemplateInput(cfg.embedTemplate || 'https://viduki.net/{server}/movie/{id}?color={color}');
      setVidukiQualityInput(cfg.preferredQuality || '1080p Ultra HD');
      setVidukiServerInput(cfg.defaultServer || 1);
      setVidukiColorInput(cfg.themeColor || 'f43f5e');

      // Fetch dynamic trending movies from server/Cinemeta
      fetchVidukiTrending(cfg).then((trending) => {
        if (!isMounted) return;
        if (trending && trending.length > 0) {
          setSearchResults(trending);
        }
      });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Switch to cinema fallback API when Viduki all servers fail (or user requests)
  const switchToFallbackApi = useCallback(
    (failedMedia?: any) => {
      const cleanTitle = currentMedia.title.replace(/\s*\(S\d+.*?\)/i, '').trim();
      setVidukiNotice({
        type: 'warning',
        message: `Viduki servers reported content unavailable (404). Switched to fallback stream for "${cleanTitle}".`,
      });

      // Try searching YouTube direct for this title
      searchYouTubeDirect(`${cleanTitle} full movie trailer soundtrack 4k`).then((results) => {
        if (results.length > 0) {
          const fallbackItem: MediaItem = {
            ...results[0],
            title: `${cleanTitle} (YouTube Fallback)`,
            badge: 'YouTube Fallback 🎬',
            description: `YouTube fallback stream for "${cleanTitle}" after Viduki servers reported unavailable.`,
          };
          handleChangeMovie(fallbackItem);
        } else {
          // Alternative Viduki blockbuster
          const alt = FEATURED_VIDUKI_CATALOG.find((m) => m.id !== currentMedia.id) || FEATURED_VIDUKI_CATALOG[0];
          handleChangeMovie(alt);
        }
      });
    },
    [currentMedia, handleChangeMovie]
  );

  // Switch Viduki Server (1, 2, 3, or 4)
  const handleSwitchVidukiServer = useCallback(
    (server: 1 | 2 | 3 | 4) => {
      const color = vidukiConfig.themeColor || vidukiColorInput || 'f43f5e';
      const updated = switchVidukiServer(currentMedia, server, color);
      setCurrentMedia(updated);
      setVidukiNotice({
        type: 'info',
        message: `Switched stream to Viduki Server ${server} for you and your partner.`,
      });

      // Broadcast to partner so partner syncs to the new server
      onSyncMedia({
        currentMedia: updated,
        currentTime: 0,
        isPlaying: true,
        lastUpdatedBy: currentUserName,
        timestamp: Date.now(),
      });
    },
    [currentMedia, vidukiConfig.themeColor, vidukiColorInput, onSyncMedia, currentUserName]
  );

  // Switch Viduki TV Season / Episode
  const handleSwitchVidukiEpisode = useCallback(
    (season: number, episode: number) => {
      const color = vidukiConfig.themeColor || vidukiColorInput || 'f43f5e';
      const updated = switchVidukiEpisode(currentMedia, season, episode, color);
      setCurrentMedia(updated);
      setVidukiNotice({
        type: 'info',
        message: `Now streaming Season ${season}, Episode ${episode}.`,
      });

      // Broadcast to partner
      onSyncMedia({
        currentMedia: updated,
        currentTime: 0,
        isPlaying: true,
        lastUpdatedBy: currentUserName,
        timestamp: Date.now(),
      });
    },
    [currentMedia, vidukiConfig.themeColor, vidukiColorInput, onSyncMedia, currentUserName]
  );

  // Select Season & Episode from Series Picker Modal
  const handleSelectSeriesEpisode = useCallback(
    (series: MediaItem, seasonNum: number, episodeNum: number, serverOverride?: 1 | 2 | 3 | 4) => {
      const color = vidukiConfig.themeColor || vidukiColorInput || 'f43f5e';
      const targetServer = serverOverride || (series.server as 1 | 2 | 3 | 4) || vidukiConfig.defaultServer || 1;
      const updated = switchVidukiEpisode({ ...series, server: targetServer }, seasonNum, episodeNum, color);

      handleChangeMovie(updated);
      setSeriesModalItem(null);
      setVidukiNotice({
        type: 'info',
        message: `Now streaming ${cleanSeriesTitle(series.title)} (Season ${seasonNum}, Episode ${episodeNum}) with partner.`,
      });
    },
    [vidukiConfig.themeColor, vidukiConfig.defaultServer, vidukiColorInput, handleChangeMovie]
  );

  // Viduki Event Listener: window.addEventListener("message", ...)
  useEffect(() => {
    const handleVidukiMessage = (event: MessageEvent) => {
      // Security check: only process events from viduki.net
      if (
        event.origin !== 'https://www.viduki.net' &&
        event.origin !== 'https://viduki.net'
      ) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // 1. Handle: viduki:all-servers-failed
      if (data.type === 'viduki:all-servers-failed') {
        console.warn('Viduki: All servers failed event received:', data);
        const currentServer = (currentMedia.server && [1, 2, 3, 4].includes(currentMedia.server))
          ? currentMedia.server
          : 1;

        // Attempt automatic switch to next server if < 4
        if (currentServer < 4 && vidukiConfig.autoFallbackOnFailure !== false) {
          const nextServer = (currentServer + 1) as 1 | 2 | 3 | 4;
          setVidukiNotice({
            type: 'warning',
            message: `Viduki Server ${currentServer} reported 404. Automatically switching to Server ${nextServer}...`,
          });
          handleSwitchVidukiServer(nextServer);
        } else {
          // All servers exhausted or manual fallback
          switchToFallbackApi(data.media);
        }
      }

      // 2. Handle watch progress events if dispatched
      if (data.type === 'viduki:progress' || (data.progress && typeof data.progress.watched === 'number')) {
        const id = data.media?.tmdbid || currentMedia.tmdbId || currentMedia.id;
        saveVidukiProgress({
          id: String(id),
          type: (data.media?.type || currentMedia.mediaType || 'movie') as 'movie' | 'tv',
          title: currentMedia.title,
          progress: {
            watched: data.progress.watched,
            duration: data.progress.duration || currentMedia.duration || 7200,
          },
          last_season_watched: data.media?.season || currentMedia.season,
          last_episode_watched: data.media?.episode || currentMedia.episode,
        });
      }

      // 3. Handle video ended event from Viduki / embed player to auto-advance episodes and seasons
      if (
        data.type === 'viduki:ended' ||
        data.type === 'ended' ||
        data.event === 'ended' ||
        data.event === 'onEnded' ||
        data.action === 'ended' ||
        (data.progress && typeof data.progress.watched === 'number' && typeof data.progress.duration === 'number' && data.progress.duration > 30 && data.progress.watched >= data.progress.duration - 2)
      ) {
        handleVideoFinished();
      }
    };

    window.addEventListener('message', handleVidukiMessage);
    return () => {
      window.removeEventListener('message', handleVidukiMessage);
    };
  }, [currentMedia, vidukiConfig, handleSwitchVidukiServer, switchToFallbackApi, handleVideoFinished]);

  // Save Viduki configuration
  const handleSaveVidukiConfig = async () => {
    setIsSavingViduki(true);
    setVidukiTestResult(null);
    try {
      const res = await saveVidukiConfig({
        apiKey: vidukiKeyInput.trim(),
        baseUrl: vidukiBaseUrlInput.trim(),
        embedTemplate: vidukiTemplateInput.trim(),
        enabled: true,
        preferredQuality: vidukiQualityInput,
        defaultServer: vidukiServerInput,
        themeColor: vidukiColorInput.replace('#', '').trim() || 'f43f5e',
        autoFallbackOnFailure: true,
      });

      if (res.success) {
        const updated = await getVidukiConfig();
        setVidukiConfig(updated);
        setVidukiTestResult({
          success: true,
          message: 'Viduki API configured and synced with your partner successfully!',
        });
        // Immediately fetch trending movies from Viduki
        const trending = await fetchVidukiTrending(updated);
        if (trending.length > 0) {
          setSearchResults(trending);
          setSelectedCategory('viduki');
        }
        setTimeout(() => setShowVidukiModal(false), 1400);
      } else {
        setVidukiTestResult({ success: false, message: res.message || 'Failed to save configuration.' });
      }
    } catch (err: any) {
      setVidukiTestResult({ success: false, message: err?.message || 'Error saving settings.' });
    } finally {
      setIsSavingViduki(false);
    }
  };

  // Test Viduki API connection
  const handleTestVidukiConnection = async () => {
    setIsTestingViduki(true);
    setVidukiTestResult(null);
    try {
      const res = await testVidukiConnection({
        apiKey: vidukiKeyInput.trim(),
        baseUrl: vidukiBaseUrlInput.trim(),
      });
      setVidukiTestResult(res);
    } catch (err: any) {
      setVidukiTestResult({ success: false, message: err?.message || 'Connection test failed.' });
    } finally {
      setIsTestingViduki(false);
    }
  };

  // Quick search in Viduki setup modal
  const handleSearchVidukiTest = async () => {
    if (!vidukiSearchQuery.trim()) return;
    setIsSearchingVidukiTest(true);
    try {
      const results = await searchVidukiMovies(vidukiSearchQuery.trim(), {
        apiKey: vidukiKeyInput.trim() || vidukiConfig.apiKey,
        baseUrl: vidukiBaseUrlInput.trim() || vidukiConfig.baseUrl,
        embedTemplate: vidukiTemplateInput.trim() || vidukiConfig.embedTemplate,
        enabled: true,
        preferredQuality: vidukiQualityInput,
      });
      setVidukiTestMovies(results);
    } catch (err) {
      console.warn('Viduki test search error:', err);
    } finally {
      setIsSearchingVidukiTest(false);
    }
  };

  // Universal Search Handler (Viduki.net & YouTube ONLY)
  const handlePerformSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      if (selectedCategory === 'viduki') {
        setSearchResults(FEATURED_VIDUKI_CATALOG);
      } else {
        const ytDefaults = await searchYouTubeDirect('trending music video relax 4k');
        setSearchResults(ytDefaults);
      }
      return;
    }

    setIsSearching(true);
    try {
      if (selectedCategory === 'viduki') {
        const vidukiResults = await searchVidukiMovies(trimmed, vidukiConfig);
        setSearchResults(vidukiResults);
      } else {
        const ytResults = await searchYouTubeDirect(trimmed);
        setSearchResults(ytResults);
      }
    } catch (err) {
      console.warn('Movie search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Filter catalog by source: Viduki, YouTube, or Watchlist ONLY
  const filterByCategory = async (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'watchlist') {
      setSearchResults(watchlist.map((w) => w.movie));
      return;
    }
    if (cat === 'viduki') {
      setIsSearching(true);
      try {
        if (searchQuery.trim()) {
          const results = await searchVidukiMovies(searchQuery.trim(), vidukiConfig);
          setSearchResults(results);
        } else {
          setSearchResults(FEATURED_VIDUKI_CATALOG);
        }
      } catch (err) {
        console.warn('Viduki category error:', err);
        setSearchResults(FEATURED_VIDUKI_CATALOG);
      } finally {
        setIsSearching(false);
      }
      return;
    }
    if (cat === 'youtube') {
      setIsSearching(true);
      try {
        const query = searchQuery.trim() || 'trending music video relax 4k';
        const ytResults = await searchYouTubeDirect(query);
        setSearchResults(ytResults);
      } catch (err) {
        console.warn('YouTube category error:', err);
      } finally {
        setIsSearching(false);
      }
      return;
    }
  };

  // Directly fetch YouTube video details for instant preview
  const handleFetchYouTubePreview = async (urlOrId: string) => {
    const trimmed = urlOrId.trim();
    if (!trimmed) {
      setYtPreviewItem(null);
      return;
    }
    setYtFetchLoading(true);
    try {
      const direct = await fetchDirectYouTubeVideo(trimmed);
      if (direct) {
        setYtPreviewItem(direct);
      } else {
        const fetched = await searchOrFetchMovie(trimmed);
        if (fetched.length > 0) setYtPreviewItem(fetched[0]);
      }
    } catch (err) {
      console.warn('Direct preview error:', err);
    } finally {
      setYtFetchLoading(false);
    }
  };

  // Surprise random date night movie picker (Viduki or YouTube ONLY)
  const handlePickSurpriseMovie = async () => {
    setIsSearching(true);
    try {
      const category = selectedCategory === 'youtube' ? 'youtube' : 'viduki';
      const surprise = await getSurpriseMovie(category);
      if (surprise) {
        handleChangeMovie(surprise);
      }
    } catch (err) {
      console.warn('Surprise movie error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Add custom URL / Movie stream
  const handleAddCustomUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customUrlInput.trim() && !ytPreviewItem) return;

    setIsSearching(true);
    const targetItem = ytPreviewItem || (await searchOrFetchMovie(customUrlInput.trim()))[0];
    if (targetItem) {
      handleChangeMovie(targetItem);
      setCustomUrlInput('');
      setYtPreviewItem(null);
      setShowCustomLinkInput(false);
    }
    setIsSearching(false);
  };

  // Alexa-style Haven Voice Assistant for Watch Party (Viduki.net & YouTube ONLY)
  const handleVoicePlayVideo = useCallback(
    async (query: string, rawText?: string) => {
      setIsSearching(true);
      setSearchQuery(query);
      setShowCatalog(true);
      const combined = `${query} ${rawText || ''}`.toLowerCase();

      try {
        // 1. If voice command specifically asks for Viduki, mentions movie/series/show, or matches a Viduki title / TMDB / IMDb ID
        const wantsViduki =
          combined.includes('viduki') ||
          combined.includes('movie') ||
          combined.includes('series') ||
          combined.includes('film') ||
          combined.includes('cinema') ||
          combined.includes('server') ||
          combined.includes('season') ||
          combined.includes('episode') ||
          /^tt\d+/i.test(query.trim()) ||
          /^\d+$/.test(query.trim()) ||
          FEATURED_VIDUKI_CATALOG.some((m) => combined.includes(m.title.toLowerCase()));

        if (wantsViduki) {
          setSelectedCategory('viduki');
          const cleanQuery = query
            .replace(/\b(on|from)?\s*viduki(\.net)?\b/gi, '')
            .replace(/\b(the\s+)?(movie|film|series|show)\b/gi, '')
            .trim() || query;
          const vidukiResults = await searchVidukiMovies(cleanQuery, vidukiConfig);
          if (vidukiResults.length > 0) {
            setSearchResults(vidukiResults);
            handleChangeMovie(vidukiResults[0]);
            return;
          }
        }

        // 2. Query YouTube direct (e.g. "play lofi girl", "play song bien")
        setSelectedCategory('youtube');
        const cleanYtQuery = query
          .replace(/\b(on|from)?\s*youtube\b/gi, '')
          .replace(/\b(the\s+)?(video|song|clip|trailer)\b/gi, '')
          .trim() || query;
        const ytResults = await searchYouTubeDirect(cleanYtQuery);
        if (ytResults.length > 0) {
          setSearchResults(ytResults);
          handleChangeMovie(ytResults[0]);
          return;
        }

        // 3. Fallback: Check Viduki as well
        const fallbackViduki = await searchVidukiMovies(query, vidukiConfig);
        if (fallbackViduki.length > 0) {
          setSelectedCategory('viduki');
          setSearchResults(fallbackViduki);
          handleChangeMovie(fallbackViduki[0]);
        }
      } catch (err) {
        console.warn('Voice play video failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [handleChangeMovie, vidukiConfig]
  );

  const voiceAssistant = useHavenVoiceAssistant({
    context: 'watch',
    onPlayVideoQuery: handleVoicePlayVideo,
    onPlayQuery: handleVoicePlayVideo,
    onPause: () => {
      togglePlayPause(false);
    },
    onResume: () => {
      togglePlayPause(true);
    },
    onNext: () => handlePlayNext(true),
    onVolumeUp: () => {
      handleMovieVolumeChange(Math.min(1, movieVolume + 0.15));
    },
    onVolumeDown: () => {
      handleMovieVolumeChange(Math.max(0, movieVolume - 0.15));
    },
    onMute: () => {
      if (!isMutedMovie) handleToggleMovieMute();
    },
    onUnmute: () => {
      if (isMutedMovie) handleToggleMovieMute();
    },
  });

  // Toggle Couple Watchlist
  const handleToggleWatchlist = (movie: MediaItem) => {
    const exists = watchlist.some((w) => w.movie.id === movie.id);
    let updated: MovieWatchlistEntry[];
    if (exists) {
      updated = watchlist.filter((w) => w.movie.id !== movie.id);
    } else {
      const newEntry: MovieWatchlistEntry = {
        id: `watch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        movie,
        addedBy: currentUserId,
        addedByName: currentUserName,
        addedAt: Date.now(),
        isWatched: false,
      };
      updated = [newEntry, ...watchlist];
    }
    setWatchlist(updated);
    localStorage.setItem(watchlistKey, JSON.stringify(updated));
  };

  // Send In-Movie Live Danmaku Bullet Comment
  const handleSendBulletComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newCommentText.trim();
    if (!text) return;

    const colors = ['#f43f5e', '#ec4899', '#38bdf8', '#fbbf24', '#a855f7', '#34d399', '#ffffff'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const comment: InMovieComment = {
      id: `comment-${Date.now()}-${Math.random()}`,
      userId: currentUserId,
      userName: currentUserName,
      text,
      color: randomColor,
      timestamp: Date.now(),
      videoTime: currentTime,
      yPercent: Math.floor(15 + Math.random() * 65), // randomized vertical lane
    };

    setLiveComments((prev) => [...prev.slice(-25), comment]);
    if (onSendInMovieComment) {
      onSendInMovieComment(comment);
    }
    setNewCommentText('');
  };

  // Quick Emoji Reaction inside Cinema
  const handleQuickMovieReaction = (emoji: string) => {
    onSendLoveBurst(emoji);
    handleSendBulletCommentDirect(emoji);
  };

  const handleSendBulletCommentDirect = (text: string) => {
    const comment: InMovieComment = {
      id: `comment-${Date.now()}-${Math.random()}`,
      userId: currentUserId,
      userName: currentUserName,
      text,
      color: '#f43f5e',
      timestamp: Date.now(),
      videoTime: currentTime,
      yPercent: Math.floor(20 + Math.random() * 55),
    };
    setLiveComments((prev) => [...prev.slice(-25), comment]);
    if (onSendInMovieComment) {
      onSendInMovieComment(comment);
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Fullscreen listeners & state synchronization
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = Boolean(document.fullscreenElement);
      setIsFullscreen(isFS);
      if (isFS) {
        setShowCatalog(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts (F for Fullscreen, T for Theater, Space for Play/Pause, M for Mute, Esc to exit)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setTheaterMode((prev) => !prev);
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMutedMovie((prev) => {
          const next = !prev;
          if (videoRef.current) videoRef.current.muted = next;
          return next;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.key === 'Escape') {
        if (theaterMode && !document.fullscreenElement) {
          setTheaterMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isFullscreen, theaterMode, isPlaying, currentTime]);

  // Autohide controls during playback in fullscreen or theater mode
  const handleMouseMove = () => {
    setShowControlsInFullscreen(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if ((isFullscreen || theaterMode) && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControlsInFullscreen(false);
      }, 3500);
    }
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current) {
          if (containerRef.current.requestFullscreen) {
            await containerRef.current.requestFullscreen();
          } else if ((containerRef.current as any).webkitRequestFullscreen) {
            await (containerRef.current as any).webkitRequestFullscreen();
          }
        }
        setIsFullscreen(true);
        setShowCatalog(false);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen API unavailable or restricted in iframe, toggling theater mode instead:', err);
      setTheaterMode((prev) => !prev);
      setShowCatalog(false);
    }
  };

  /**
   * Reusable Movie & Video Showcase / Search component
   * Renders either as full-height Browse View (without video screen) or as expandable drawer below screen
   */
  const renderCatalogContent = (isBrowseMode: boolean) => (
    <div
      className={
        isBrowseMode
          ? 'p-4 sm:p-6 bg-slate-950 flex-1 w-full overflow-y-auto space-y-4 animate-in fade-in'
          : 'p-4 bg-slate-950/95 border-t border-slate-800/90 max-h-[68vh] sm:max-h-[74vh] overflow-y-auto z-20 space-y-3.5 animate-in fade-in'
      }
    >
      {/* If in Browse Mode and there is already a movie loaded/playing, show quick return strip */}
      {isBrowseMode && currentMedia && (isPlaying || currentTime > 0) && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/70 border border-rose-500/40 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-14 rounded-lg overflow-hidden shrink-0 border border-rose-500/30 shadow">
              <img
                src={currentMedia.thumbnailUrl || currentMedia.backdropUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500'}
                alt={currentMedia.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1.5">
                <Radio className="w-2.5 h-2.5 text-rose-400 animate-pulse" />
                {isPlaying ? 'Currently Streaming' : 'Paused in Player'}
              </span>
              <h4 className="text-sm font-bold text-white truncate">{currentMedia.title}</h4>
              <p className="text-[11px] text-slate-400 truncate">{currentMedia.genre || currentMedia.rating || 'Cinema Stream'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isSeriesItem(currentMedia) && (
              <button
                type="button"
                id="btn-return-episodes"
                onClick={() => setSeriesModalItem(currentMedia)}
                className="px-3 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow"
                title="Browse and select another episode"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Choose Episode</span>
              </button>
            )}

            <button
              type="button"
              id="btn-return-to-screen"
              onClick={() => {
                setIsPlayerActive(true);
                if (!isPlaying) togglePlayPause(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer shrink-0 transition hover:scale-105 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Show Movie Screen</span>
            </button>
          </div>
        </div>
      )}

      {/* Haven Voice Control Banner */}
      <HavenVoiceControl
        isListening={voiceAssistant.isListening}
        isHandsFree={voiceAssistant.isHandsFree}
        transcript={voiceAssistant.transcript}
        interimTranscript={voiceAssistant.interimTranscript}
        lastActionMessage={voiceAssistant.lastActionMessage}
        errorNotice={voiceAssistant.errorNotice}
        isSpeaking={voiceAssistant.isSpeaking}
        isSupported={voiceAssistant.isSupported}
        onToggleHandsFree={voiceAssistant.toggleHandsFree}
        onTriggerPushToTalk={voiceAssistant.triggerPushToTalk}
        onQuickCommand={(cmd) => voiceAssistant.parseAndExecuteCommand(cmd)}
        context="watch"
        variant="banner"
      />

      {/* Haven Voice Command Quick Tips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
        <span className="text-rose-400 font-bold whitespace-nowrap text-[10px] uppercase tracking-wider flex items-center gap-1">
          <Mic className="w-3 h-3 text-rose-400" />
          <span>Try Saying:</span>
        </span>
        {[
          { label: '“Play Deadpool on Viduki”', query: 'Deadpool' },
          { label: '“Play Titanic on Viduki”', query: 'Titanic' },
          { label: '“Watch Game of Thrones”', query: 'Game of Thrones' },
          { label: '“Play Inception”', query: 'Inception' },
          { label: '“Play Lofi Girl on YouTube”', query: 'lofi hip hop radio' },
          { label: '“Play Tokyo 4K on YouTube”', query: 'tokyo 4k rain walk' },
          { label: '“Hey Haven, pause”', query: '' },
        ].map((tip) => (
          <button
            key={tip.label}
            type="button"
            onClick={() => {
              if (tip.query) {
                setSearchQuery(tip.query);
                handlePerformSearch(tip.query);
              } else {
                togglePlayPause();
              }
            }}
            className="px-2 py-0.5 bg-slate-900/90 hover:bg-rose-950/40 text-slate-300 hover:text-rose-200 border border-slate-800 hover:border-rose-500/30 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[10px]"
          >
            {tip.label}
          </button>
        ))}
      </div>

      {/* Primary Source Navigation Tabs & Viduki Config Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => filterByCategory('viduki')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              selectedCategory === 'viduki'
                ? 'bg-rose-600 text-white shadow-rose-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>🎬 Viduki Movies & Series</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-md font-mono text-rose-200">
              Server {vidukiConfig.defaultServer || 1}
            </span>
          </button>

          <button
            type="button"
            onClick={() => filterByCategory('youtube')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
              selectedCategory === 'youtube'
                ? 'bg-red-600 text-white shadow-red-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span>🔴 YouTube Video Search</span>
          </button>

          {watchlist.length > 0 && (
            <button
              type="button"
              onClick={() => filterByCategory('watchlist')}
              className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedCategory === 'watchlist'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Watchlist ({watchlist.length})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePickSurpriseMovie}
            disabled={isSearching}
            className="px-3 py-1.5 bg-gradient-to-r from-rose-600/30 to-amber-600/30 hover:from-rose-600/50 hover:to-amber-600/50 text-rose-200 hover:text-white text-xs font-semibold rounded-xl border border-rose-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Pick a random movie or video"
          >
            <Dices className="w-3.5 h-3.5 text-amber-300" />
            <span>Surprise Me 🎲</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVidukiModal(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
            title="Configure Viduki API keys, multi-servers 1–4, and player settings"
          >
            <Key className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Viduki Settings</span>
          </button>
        </div>
      </div>

      {/* Context Search Bar & Options */}
      {selectedCategory === 'viduki' ? (
        <div className="space-y-2.5 bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-800/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePerformSearch(searchQuery);
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="relative flex-1">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2 animate-spin" />
              ) : (
                <Film className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  handlePerformSearch(val);
                }}
                placeholder="Search Viduki movies, shows, or IMDb ID (e.g. Deadpool, Titanic, Inception, tt1375666)..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    handlePerformSearch('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                id="btn-search-viduki"
                disabled={isSearching}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/25 transition cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Search Viduki</span>
              </button>

              <button
                type="button"
                onClick={() => filterByCategory('youtube')}
                className="px-3 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                title="Switch to YouTube Search"
              >
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="hidden sm:inline">Switch to YouTube</span>
              </button>
            </div>
          </form>

          {/* Quick Genre Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-800/60 text-[11px] no-scrollbar">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">
              Genres:
            </span>
            {[
              { label: 'All Movies', q: '' },
              { label: '🔥 Trending 2024/25', q: 'trending' },
              { label: '🦸 Action & Marvel', q: 'action' },
              { label: '🍿 Blockbusters', q: 'blockbuster' },
              { label: '🎨 Animation & Kids', q: 'animation' },
              { label: '🚀 Sci-Fi & Fantasy', q: 'sci-fi' },
              { label: '😂 Comedy', q: 'comedy' },
              { label: '❤️ Romance', q: 'romance' },
              { label: '📺 TV Series', q: 'series' },
            ].map((genre) => (
              <button
                key={genre.label}
                type="button"
                onClick={() => {
                  setSearchQuery(genre.q);
                  handlePerformSearch(genre.q);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  searchQuery === genre.q
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800/80 hover:text-white'
                }`}
              >
                {genre.label}
              </button>
            ))}
          </div>

          {/* Viduki Active Server Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">
                Viduki Server:
              </span>
              {[1, 2, 3, 4].map((srv) => (
                <button
                  key={srv}
                  type="button"
                  onClick={() => {
                    setVidukiServerInput(srv as 1 | 2 | 3 | 4);
                    setVidukiConfig((prev) => ({ ...prev, defaultServer: srv as 1 | 2 | 3 | 4 }));
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                    (vidukiConfig.defaultServer || 1) === srv
                      ? 'bg-rose-600 text-white ring-1 ring-rose-400'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  Server {srv}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400">
              Auto-Failover Protection Active
            </span>
          </div>
        </div>
      ) : selectedCategory === 'youtube' ? (
        <div className="space-y-2.5 bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-800/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePerformSearch(searchQuery);
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <div className="relative flex-1">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-red-400 absolute left-3 top-1/2 -translate-y-1/2 animate-spin" />
              ) : (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 text-xs font-bold select-none">🔴</span>
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  handlePerformSearch(val);
                }}
                placeholder="Search YouTube (e.g. Music, Podcasts, Trailers, Gaming, Documentaries, Lofi)..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    handlePerformSearch('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                id="btn-search-youtube"
                disabled={isSearching}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/25 transition cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Search YouTube</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCustomLinkInput(!showCustomLinkInput)}
                className="px-3 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                title="Paste YouTube link or direct video URL"
              >
                <Plus className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Paste URL</span>
              </button>
            </div>
          </form>

          {/* YouTube Suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-800/60 text-[11px] no-scrollbar">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">
              Suggestions:
            </span>
            {[
              { label: '🔥 Trending 2025', q: 'trending music video 2025' },
              { label: '☕ Lofi Girl Radio', q: 'lofi hip hop radio beats to relax' },
              { label: '🍿 Movie Trailers 4K', q: 'official movie trailers 4k' },
              { label: '🗼 Tokyo Rain 4K', q: 'tokyo 4k rain walk ambience' },
              { label: '😂 Stand-Up Comedy', q: 'stand up comedy best clips' },
              { label: '🌌 Space & Earth 4K', q: 'earth from orbit ISS 4K' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setSearchQuery(chip.q);
                  handlePerformSearch(chip.q);
                }}
                className="px-2 py-0.5 bg-slate-950 hover:bg-red-950/40 text-slate-300 hover:text-red-200 border border-slate-800 hover:border-red-500/30 rounded-lg whitespace-nowrap transition cursor-pointer text-[10px]"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Direct YouTube Link Fetch Drawer */}
          {showCustomLinkInput && (
            <div className="p-3 bg-slate-950 rounded-xl border border-rose-500/30 space-y-2 mt-2 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-rose-400" />
                  <span>Paste Direct YouTube Video Link</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomLinkInput(false);
                    setYtPreviewItem(null);
                  }}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomUrl} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomUrlInput(val);
                      if (val.includes('youtube.com') || val.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(val.trim())) {
                        handleFetchYouTubePreview(val);
                      }
                    }}
                    placeholder="Paste YouTube watch URL (e.g. https://www.youtube.com/watch?v=... or youtu.be/...)"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  {ytFetchLoading && (
                    <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!customUrlInput.trim() && !ytPreviewItem}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Stream Video</span>
                </button>
              </form>
            </div>
          )}
        </div>
      ) : null}

      {/* Results Grid Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-white font-serif tracking-tight flex items-center gap-1.5">
            {selectedCategory === 'viduki' ? (
              <>
                <span>🎬 Featured Viduki Movies & Series</span>
                <span className="text-[10px] font-semibold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-500/30">
                  {searchResults.length} {searchResults.length === 1 ? 'title' : 'titles'}
                </span>
              </>
            ) : selectedCategory === 'youtube' ? (
              <>
                <span>🔴 YouTube Results</span>
                <span className="text-[10px] font-semibold text-red-300 bg-red-950/60 px-2 py-0.5 rounded-full border border-red-500/30">
                  {searchResults.length} {searchResults.length === 1 ? 'video' : 'videos'}
                </span>
              </>
            ) : (
              <>
                <span>⭐ Shared Watchlist</span>
                <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {searchResults.length}
                </span>
              </>
            )}
          </span>
        </div>

        <span className="text-[10px] text-slate-400 hidden sm:inline">
          {selectedCategory === 'viduki'
            ? `viduki.net • Server ${vidukiConfig.defaultServer || 1} • Auto-Sync Active`
            : selectedCategory === 'youtube'
            ? 'Real-time synchronized YouTube HD'
            : 'Saved for movie night'}
        </span>
      </div>

      {/* Empty State */}
      {searchResults.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <Clapperboard className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">
            No {selectedCategory === 'viduki' ? 'Viduki titles' : 'YouTube videos'} found {searchQuery ? `for "${searchQuery}"` : ''}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {selectedCategory === 'viduki'
              ? 'Try searching by title (e.g. Deadpool, Titanic, Inception), TMDB ID (e.g. 533535), or IMDb ID (e.g. tt6263850).'
              : 'Try searching for music videos, podcast channels, video clips, or gaming highlights.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              if (selectedCategory === 'viduki') {
                setSearchResults(FEATURED_VIDUKI_CATALOG);
              } else {
                searchYouTubeDirect('trending music video relax 4k').then(setSearchResults);
              }
            }}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer"
          >
            {selectedCategory === 'viduki' ? 'Reset to Featured Viduki Catalog' : 'Load Trending YouTube'}
          </button>
        </div>
      ) : (
        /* Movie & Video Cards Grid */
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {searchResults.map((movie, idx) => {
            const isActive = currentMedia.id === movie.id;
            const isInWatchlist = watchlist.some((w) => w.movie.id === movie.id);
            const isVidukiItem = movie.source === 'viduki' || selectedCategory === 'viduki';
            const isSeries = isSeriesItem(movie);

            return (
              <div
                key={`card-${movie.id}-${idx}`}
                className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 bg-slate-900 flex flex-col shadow-md hover:shadow-xl hover:-translate-y-0.5 ${
                  isActive
                    ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-rose-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Media Thumbnail / Poster */}
                <div
                  onClick={() => {
                    if (isSeries) {
                      setSeriesModalItem(movie);
                    } else {
                      handleChangeMovie(movie);
                    }
                  }}
                  className={`relative w-full overflow-hidden bg-slate-950 cursor-pointer ${isVidukiItem ? 'aspect-[2/3]' : 'aspect-video'}`}
                >
                  <img
                    src={movie.thumbnailUrl || movie.backdropUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500'}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Play Button Overlay (Visible on Touch, High-Intent on Hover) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                    <div className={`px-3 py-1.5 rounded-full ${isSeries ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-rose-600/90 hover:bg-rose-500'} text-white flex items-center gap-1.5 shadow-xl shadow-rose-600/40 transform scale-90 group-hover:scale-100 transition-transform text-xs font-bold`}>
                      {isSeries ? (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>Choose Episode</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                          <span>Play</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 z-10">
                    {isVidukiItem ? (
                      <span className={`${isSeries ? 'bg-purple-950/90 border-purple-500/40 text-purple-200' : 'bg-rose-950/90 border-rose-500/40 text-rose-300'} border text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1`}>
                        {isSeries ? (
                          <>
                            <Tv className="w-2.5 h-2.5 text-purple-400" />
                            <span>TV Series 📺</span>
                          </>
                        ) : (
                          <span>Viduki 🎬</span>
                        )}
                      </span>
                    ) : (
                      <span className="bg-red-950/90 border border-red-500/40 text-[9px] font-bold text-red-300 px-2 py-0.5 rounded-md shadow-sm">
                        🔴 YouTube
                      </span>
                    )}

                    {isVidukiItem && (
                      <span className="bg-black/80 backdrop-blur-xs text-[9px] font-bold text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        Server {movie.server || vidukiConfig.defaultServer || 1}
                      </span>
                    )}
                  </div>

                  {/* Rating or Duration Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    {movie.rating ? (
                      <span className="bg-black/80 backdrop-blur-xs text-[9px] font-bold text-amber-300 px-1.5 py-0.5 rounded shadow">
                        ★ {movie.rating}
                      </span>
                    ) : movie.duration ? (
                      <span className="bg-black/80 backdrop-blur-xs text-[9px] font-bold text-slate-200 px-1.5 py-0.5 rounded shadow">
                        {typeof movie.duration === 'number'
                          ? `${Math.floor(movie.duration / 60)}m`
                          : movie.duration}
                      </span>
                    ) : null}
                  </div>

                  {/* Watchlist Toggle Bookmark */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWatchlist(movie);
                    }}
                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/75 hover:bg-black text-slate-300 hover:text-amber-400 transition cursor-pointer shadow z-10"
                    title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  >
                    {isInWatchlist ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Card Content & Actions */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h5
                      onClick={() => {
                        if (isSeries) {
                          setSeriesModalItem(movie);
                        } else {
                          handleChangeMovie(movie);
                        }
                      }}
                      className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-300 transition-colors cursor-pointer"
                      title={movie.title}
                    >
                      {isSeries ? cleanSeriesTitle(movie.title) : movie.title}
                    </h5>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      {movie.year && <span>{movie.year}</span>}
                      {movie.year && (movie.artist || movie.genre) && <span>•</span>}
                      {(movie.artist || movie.genre) && (
                        <span className="truncate">{movie.artist || movie.genre}</span>
                      )}
                    </div>

                    {/* TV Show season & episode metadata */}
                    {isSeries && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-500/30 rounded font-semibold flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5 text-purple-400" />
                          <span>
                            {movie.season ? `Season ${movie.season} • Episode ${movie.episode || 1}` : 'All Seasons & Episodes'}
                          </span>
                        </span>
                      </div>
                    )}

                    {movie.description && (
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {movie.description}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                    {isSeries ? (
                      <button
                        type="button"
                        id={`btn-choose-episodes-${movie.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSeriesModalItem(movie);
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-600/25 active:scale-95"
                        title="View all seasons and choose an episode"
                      >
                        <Layers className="w-3.5 h-3.5 text-purple-200" />
                        <span>{isActive ? `S${movie.season || 1}:E${movie.episode || 1} • Episodes` : 'Choose Episode'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleChangeMovie(movie)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm ${
                          isActive
                            ? 'bg-rose-500 text-white shadow-rose-500/30'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>
                          {isActive ? 'Now Playing' : isFriends ? 'Stream with Squad' : 'Stream Together'}
                        </span>
                      </button>
                    )}

                    {/* Pop-out Tab for Viduki */}
                    {isVidukiItem && (movie.url || movie.embedUrl) && (
                      <a
                        href={movie.url || movie.embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1 transition cursor-pointer shrink-0"
                        title="Open stream in a new tab on viduki.net"
                      >
                        <ExternalLink className="w-3 h-3 text-rose-400" />
                        <span className="text-[10px] hidden sm:inline">Pop-out</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  const isCustomMovie = currentMedia.category === 'custom';
  const isImmersive = isFullscreen || theaterMode;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isImmersive ? 'p-0 bg-black' : 'p-0 sm:p-4 bg-black/90 backdrop-blur-md'
      } animate-in fade-in select-none`}
    >
      {/* Hidden Partner Remote Audio Playback Element */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="fixed -top-96 -left-96 w-1 h-1 opacity-0 pointer-events-none" />

      <div
        className={`relative w-full ${
          isImmersive ? 'h-full max-w-none rounded-none border-0' : 'max-w-5xl rounded-none sm:rounded-3xl h-[100dvh] sm:h-auto sm:max-h-[95vh] border-0 sm:border border-slate-800'
        } bg-slate-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-300`}
      >
        {/* =========================================================================
            CINEMA HEADER & TALK / VOICE OVERLAY STATUS
        ========================================================================= */}
        <div
          className={`flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 shrink-0 z-30 transition-all duration-300 ${
            isImmersive
              ? `absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 via-black/70 to-transparent ${
                  !showControlsInFullscreen && isPlaying ? 'opacity-0 pointer-events-none -translate-y-3' : 'opacity-100 translate-y-0'
                }`
              : 'bg-slate-900/95 border-b border-slate-800 sticky top-0'
          }`}
        >
          {/* Left: Movie & Room Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven-Style Mobile Back Button */}
            <button
              id="btn-cinema-mobile-back"
              onClick={onClose}
              className="p-1.5 -ml-1 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
              <Film className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white font-serif tracking-tight truncate max-w-[130px] sm:max-w-xs">
                  {isPlayerActive ? currentMedia.title : (isFriends ? 'Squad Cinema Showcase' : 'Couple Cinema Lounge')}
                </h3>
                <span className="hidden xs:inline-flex px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30 items-center gap-1 shrink-0">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-rose-400" />
                  <span>
                    {isPlayerActive
                      ? (isImmersive ? 'Full Screen Cinema' : isFriends ? 'Squad Cinema' : 'Synced Cinema')
                      : 'Movie Lounge'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {isPlayerActive
                    ? (isFriends
                        ? `Watching with ${groupEmoji ? `${groupEmoji} ` : ''}${effectiveGroupName} (${squadMembersCount} in squad)`
                        : `Watching with ${partner ? partner.name : partnerName}`)
                    : 'Search YouTube & Viduki or pick any movie below'}
                </span>
                {isPlayerActive && currentMedia.genre && (
                  <span className="hidden sm:inline text-slate-500">• {currentMedia.genre}</span>
                )}
              </p>
            </div>
          </div>

          {/* Right: Movie Talking Voice Bar & Theater Actions */}
          <div className="flex items-center gap-2">
            {/* Live Movie Talk / Voice Call Controls */}
            {isCallActive ? (
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-rose-500/40 rounded-2xl px-2.5 py-1 shadow-sm">
                {/* Partner Talking Audio Wave Indicator */}
                <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700">
                  <div className="relative">
                    <img
                      src={
                        partner?.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={partnerName}
                      className={`w-6 h-6 rounded-full object-cover border ${
                        isPartnerSpeaking
                          ? 'border-emerald-400 ring-2 ring-emerald-400/50 animate-pulse'
                          : 'border-slate-600'
                      }`}
                    />
                    {isPartnerSpeaking && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-900" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-slate-200 hidden md:inline">
                    {isPartnerSpeaking ? `${partnerName} talking...` : 'Voice Live'}
                  </span>
                </div>

                {/* Local Mic Toggle */}
                <button
                  id="btn-movie-toggle-mic"
                  onClick={onToggleMute}
                  className={`p-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                {/* Local Cam Toggle */}
                <button
                  id="btn-movie-toggle-cam"
                  onClick={onToggleVideo}
                  className={`p-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isVideoEnabled
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
                      : 'bg-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                </button>

                {/* Cam PiP Bubble Toggle */}
                <button
                  onClick={() => setShowCamPiP(!showCamPiP)}
                  className={`p-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    showCamPiP ? 'text-rose-400' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Reaction Cam PiP"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                {/* Hang up Movie Call */}
                <button
                  id="btn-movie-end-voice"
                  onClick={onEndCall}
                  className="p-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                  title="End Movie Voice Chat"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-start-movie-voice"
                onClick={() => onStartCall('audio')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-2xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer animate-pulse"
                title="Talk to partner while watching movie"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Talk During Movie</span>
              </button>
            )}

            {/* Side Chat Drawer Toggle */}
            <button
              onClick={() => setShowSideChat(!showSideChat)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                showSideChat
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-slate-800 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
              title="Toggle Whisper Chat & Danmaku"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* If Series Active: All Seasons & Episodes Header Trigger */}
            {isPlayerActive && isSeriesItem(currentMedia) && (
              <button
                type="button"
                id="btn-movie-header-episodes"
                onClick={() => setSeriesModalItem(currentMedia)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 border border-purple-500/40 text-xs font-bold transition cursor-pointer shadow-sm"
                title="Browse all seasons and select an episode"
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Episodes (S{currentMedia.season || 1}:E{currentMedia.episode || 1})</span>
                <span className="sm:hidden">S{currentMedia.season || 1}:E{currentMedia.episode || 1}</span>
              </button>
            )}

            {/* Browse Movies / Return to Playing Movie Button */}
            {isPlayerActive ? (
              <button
                type="button"
                id="btn-movie-header-browse"
                onClick={() => setIsPlayerActive(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition cursor-pointer shadow-sm"
                title="Browse and search movies without closing"
              >
                <Film className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Browse Movies</span>
              </button>
            ) : (
              (isPlaying || currentTime > 0) && (
                <button
                  type="button"
                  id="btn-movie-header-resume"
                  onClick={() => {
                    setIsPlayerActive(true);
                    if (!isPlaying) togglePlayPause(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition cursor-pointer"
                  title={`Return to movie screen: ${currentMedia.title}`}
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span className="hidden sm:inline">Resume:</span>
                  <span className="truncate max-w-[110px]">{currentMedia.title}</span>
                </button>
              )
            )}

            {/* Alexa-style Voice Assistant Pill */}
            <HavenVoiceControl
              isListening={voiceAssistant.isListening}
              isHandsFree={voiceAssistant.isHandsFree}
              transcript={voiceAssistant.transcript}
              interimTranscript={voiceAssistant.interimTranscript}
              lastActionMessage={voiceAssistant.lastActionMessage}
              errorNotice={voiceAssistant.errorNotice}
              isSpeaking={voiceAssistant.isSpeaking}
              isSupported={voiceAssistant.isSupported}
              onToggleHandsFree={voiceAssistant.toggleHandsFree}
              onTriggerPushToTalk={voiceAssistant.triggerPushToTalk}
              context="watch"
              variant="pill"
            />

            {/* Fullscreen Toggle Button in Header */}
            <button
              id="btn-header-toggle-fullscreen"
              onClick={handleToggleFullscreen}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                isImmersive
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm'
                  : 'bg-slate-800 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
              title={isImmersive ? 'Exit Full Screen (F / Esc)' : 'Watch in Full Screen (F)'}
            >
              {isImmersive ? <Minimize2 className="w-4 h-4 text-rose-400" /> : <Maximize2 className="w-4 h-4 text-slate-300" />}
              <span className="hidden md:inline text-xs font-semibold">{isImmersive ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>

            {/* Close Modal */}
            <button
              id="btn-close-cinema-modal"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            CINEMA STAGE: MOVIE PLAYER + FLOATING DANMAKU + WEBRTC REACTION CAM PIP
        ========================================================================= */}
        {isPlayerActive ? (
          <>
            <div
              onDoubleClick={handleToggleFullscreen}
              className={`relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden select-none group/player ${
                isImmersive ? 'h-full min-h-0' : 'min-h-[300px] sm:min-h-[420px]'
              }`}
            >
          {/* Quick Floating Fullscreen / Exit Hint Pill in Top Corner */}
          <div className="absolute top-4 right-4 z-20 opacity-90 sm:opacity-0 sm:group-hover/player:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFullscreen();
              }}
              className="px-3 py-1.5 bg-black/75 hover:bg-black/90 backdrop-blur-md rounded-full border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 shadow-xl cursor-pointer transition-transform hover:scale-105"
              title={isImmersive ? 'Exit Full Screen (Esc)' : 'Watch Full Screen (F)'}
            >
              {isImmersive ? <Minimize2 className="w-3.5 h-3.5 text-rose-400" /> : <Maximize2 className="w-3.5 h-3.5 text-rose-400" />}
              <span>{isImmersive ? 'Exit Full Screen (Esc)' : 'Full Screen (F)'}</span>
            </button>
          </div>

          {/* 0. Real-time Screen Streaming (Any Browser Tab or Screen) */}
          {isScreenSharing && localScreenStream ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-contain ${isImmersive ? 'max-h-full' : 'max-h-[62vh]'}`}
              />
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/95 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-xl animate-pulse z-20">
                <Tv className="w-3.5 h-3.5" />
                <span>Streaming Screen / Tab with Audio</span>
                <button
                  onClick={handleToggleScreenShare}
                  className="ml-2 bg-black/40 hover:bg-black/60 px-2 py-0.5 rounded-full text-[10px] text-white cursor-pointer"
                >
                  Stop
                </button>
              </div>
            </div>
          ) : currentMedia.type === 'video' ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={currentMedia.url}
                className={`w-full h-full object-contain cursor-pointer ${isImmersive ? 'max-h-full' : 'max-h-[62vh]'}`}
                playsInline
                preload="auto"
                onClick={togglePlayPause}
                onEnded={handleVideoFinished}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleToggleFullscreen();
                }}
              />
              {/* Big Center Play/Pause Overlay */}
              {!isPlaying && (
                <div
                  onClick={togglePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs cursor-pointer z-10 transition-all hover:bg-black/30"
                >
                  <button className="w-18 h-18 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 cursor-pointer">
                    <Play className="w-8 h-8 ml-1 fill-white" />
                  </button>
                </div>
              )}
            </div>
          ) : ytId ? (
            /* 2. Embedded Synced YouTube Player */
            <div className={`w-full h-full aspect-video ${isImmersive ? 'max-h-full' : 'max-h-[62vh]'} relative flex items-center justify-center`}>
              <iframe
                ref={ytIframeRef}
                id="yt-cinema-iframe"
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                title={currentMedia.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={() => {
                  if (isMutedMovie) {
                    sendYouTubeCommand('mute');
                  } else {
                    sendYouTubeCommand('unMute');
                    sendYouTubeCommand('setVolume', [Math.round(movieVolume * 100)]);
                  }
                  if (!isPlayingRef.current) {
                    sendYouTubeCommand('pauseVideo');
                  }
                }}
              />
              {/* YouTube Paused Overlay */}
              {!isPlaying && (
                <div
                  onClick={() => togglePlayPause(true)}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs cursor-pointer z-10 animate-in fade-in select-none"
                  title="Click to resume playback"
                >
                  <button
                    type="button"
                    className="w-18 h-18 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 mb-3 cursor-pointer"
                  >
                    <Play className="w-8 h-8 ml-1 fill-white" />
                  </button>
                  <div className="px-4 py-1.5 rounded-full bg-slate-950/90 border border-slate-700 text-white text-xs font-semibold shadow-xl flex items-center gap-2">
                    <Pause className="w-3.5 h-3.5 text-rose-400" />
                    <span>Paused • Click or Press Space to Resume</span>
                  </div>
                </div>
              )}
            </div>
          ) : (currentMedia.type === 'embed' || currentMedia.source === 'viduki' || Boolean(currentMedia.embedUrl)) ? (
            /* 3. Embedded Synced Viduki Cinema Player */
            <div className={`w-full h-full aspect-video ${isImmersive ? 'max-h-full' : 'max-h-[62vh]'} relative bg-black flex items-center justify-center overflow-hidden`}>
              <iframe
                ref={vidukiIframeRef}
                id="viduki-cinema-iframe"
                src={currentMedia.embedUrl || currentMedia.url}
                title={currentMedia.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />

              {/* Viduki Cinema Paused Overlay */}
              {!isPlaying && (
                <div
                  onClick={() => togglePlayPause(true)}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs cursor-pointer z-10 animate-in fade-in select-none"
                  title="Click to resume playback"
                >
                  <button
                    type="button"
                    className="w-18 h-18 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 mb-3 border border-rose-300/40 cursor-pointer"
                  >
                    <Play className="w-8 h-8 ml-1 fill-white" />
                  </button>
                  <div className="px-4 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-xs font-semibold shadow-xl flex items-center gap-2 backdrop-blur-md">
                    <Pause className="w-3.5 h-3.5 text-rose-400" />
                    <span>Cinema Paused • Click or Press Space to Resume</span>
                  </div>
                </div>
              )}

              {/* Viduki Cinema Floating Top Control Bar */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-20 pointer-events-auto">
                {/* Left: Source Badge & Current Server */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/90 backdrop-blur-md rounded-xl border border-rose-500/30 text-[10px] text-rose-300 shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="font-bold text-white tracking-wide">Viduki Cinema</span>
                  <span className="text-slate-400 border-l border-slate-700 pl-1.5">
                    Server {currentMedia.server || 1}
                  </span>
                  {isSeriesItem(currentMedia) && (
                    <button
                      type="button"
                      onClick={() => setSeriesModalItem(currentMedia)}
                      className="bg-purple-950/90 hover:bg-purple-900 text-purple-200 px-2 py-0.5 rounded-lg border border-purple-500/40 font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                      title="View all seasons and choose an episode"
                    >
                      <Layers className="w-2.5 h-2.5 text-purple-400" />
                      <span>S{currentMedia.season || 1}:E{currentMedia.episode || 1}</span>
                    </button>
                  )}
                </div>

                {/* Right: Multi-Server Switcher & Episode Controls */}
                <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 px-1 hidden sm:inline">
                    Server:
                  </span>
                  {[1, 2, 3, 4].map((srv) => {
                    const isActive = (currentMedia.server || 1) === srv;
                    return (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => handleSwitchVidukiServer(srv as 1 | 2 | 3 | 4)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/40 ring-1 ring-rose-400'
                            : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                        title={`Switch stream to Viduki Server ${srv}`}
                      >
                        S{srv}
                      </button>
                    );
                  })}

                  {/* TV Episode Navigator (if TV show) */}
                  {isSeriesItem(currentMedia) && (
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-700/80">
                      <button
                        type="button"
                        onClick={() => {
                          const currSeason = currentMedia.season || 1;
                          const currEp = currentMedia.episode || 1;
                          if (currEp > 1) {
                            handleSwitchVidukiEpisode(currSeason, currEp - 1);
                          } else if (currSeason > 1) {
                            // Jump to previous season's last episode
                            const seasons = getSeriesSeasons(currentMedia);
                            const prevSeasonObj = seasons.find((s) => s.seasonNumber === currSeason - 1);
                            const prevEpCount = prevSeasonObj?.episodeCount || 10;
                            handleSwitchVidukiEpisode(currSeason - 1, prevEpCount);
                          }
                        }}
                        disabled={(currentMedia.season || 1) <= 1 && (currentMedia.episode || 1) <= 1}
                        className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 text-[9px] font-semibold cursor-pointer"
                        title="Previous Episode / Season"
                      >
                        ◀ Ep
                      </button>

                      {/* All Seasons & Episodes Button */}
                      <button
                        type="button"
                        id="btn-series-picker-player-bar"
                        onClick={() => setSeriesModalItem(currentMedia)}
                        className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 transition"
                        title="Browse all seasons and choose an episode"
                      >
                        <Layers className="w-3 h-3" />
                        <span>S{currentMedia.season || 1}:E{currentMedia.episode || 1}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const currSeason = currentMedia.season || 1;
                          const currEp = currentMedia.episode || 1;
                          const seasons = getSeriesSeasons(currentMedia);
                          const seasonObj = seasons.find((s) => s.seasonNumber === currSeason);
                          const totalEpisodesInSeason = seasonObj?.episodeCount || 10;
                          const maxSeason = seasons.length > 0 ? seasons[seasons.length - 1].seasonNumber : 1;

                          if (currEp < totalEpisodesInSeason) {
                            handleSwitchVidukiEpisode(currSeason, currEp + 1);
                          } else if (currSeason < maxSeason) {
                            // Next Season, Episode 1!
                            handleSwitchVidukiEpisode(currSeason + 1, 1);
                          } else {
                            // Final episode of final season: loop back to S1E1
                            handleSwitchVidukiEpisode(1, 1);
                          }
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 hover:text-white text-[9px] font-semibold cursor-pointer"
                        title="Next Episode / Next Season"
                      >
                        Ep ▶
                      </button>
                    </div>
                  )}

                  {/* Quick Fallback Switcher */}
                  <button
                    type="button"
                    onClick={() => switchToFallbackApi()}
                    className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-[10px] font-medium border border-slate-700 transition cursor-pointer flex items-center gap-1"
                    title="If Viduki servers are buffering or 404, switch to cinema fallback"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">Fallback</span>
                  </button>

                  {/* Pop-out Stream (Plays directly in standalone tab without editor sandbox) */}
                  <a
                    href={currentMedia.embedUrl || currentMedia.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 shadow"
                    title="Open Viduki Stream in a new tab without sandbox restrictions"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">Pop-out</span>
                  </a>
                </div>
              </div>

              {/* Viduki Active Notice Banner */}
              {vidukiNotice && (
                <div
                  className={`absolute top-14 left-4 right-4 z-30 px-3.5 py-2 rounded-xl backdrop-blur-md border text-xs flex items-center justify-between gap-2 shadow-2xl animate-in fade-in ${
                    vidukiNotice.type === 'error'
                      ? 'bg-red-950/90 border-red-500/50 text-red-200'
                      : vidukiNotice.type === 'warning'
                      ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                      : 'bg-slate-900/90 border-rose-500/40 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-rose-400 animate-pulse" />
                    <span className="truncate">{vidukiNotice.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVidukiNotice(null)}
                    className="text-slate-400 hover:text-white p-1 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Sandbox Detection Banner (shown when inside editor preview iframe) */}
              {isInIframe && (
                <div className="absolute bottom-2 left-2 right-2 z-20 px-3 py-2 bg-slate-950/95 backdrop-blur-md rounded-xl border border-amber-500/40 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2 shadow-2xl animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[11px] leading-snug">
                      <strong>Editor Sandbox Detected:</strong> AI Studio's preview window restricts popups. Open in a standalone tab to play, or use Fallback Stream.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={currentMedia.embedUrl || currentMedia.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] flex items-center gap-1 transition shadow cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Watch in New Tab
                    </a>
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-[10px] border border-slate-700 transition cursor-pointer"
                      title="Opens Haven outside the AI Studio preview frame without any sandbox restrictions"
                    >
                      Open Haven in Tab
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentMedia.embedUrl || currentMedia.url);
                        setIsCopiedLink(true);
                        setTimeout(() => setIsCopiedLink(false), 2000);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-[10px] border border-slate-700 transition cursor-pointer flex items-center gap-1"
                      title="Copy direct stream link"
                    >
                      {isCopiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopiedLink ? 'Copied' : 'Copy Link'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchToFallbackApi()}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-[10px] transition cursor-pointer"
                    >
                      Fallback Stream
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 4. Audio / Visualizer Stream */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-8 bg-radial from-rose-950/40 to-slate-950">
              <div className="relative w-40 h-40 rounded-3xl overflow-hidden border-2 border-rose-500/30 shadow-2xl mb-4 group">
                <img
                  src={currentMedia.thumbnailUrl || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500'}
                  alt={currentMedia.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="text-xl font-bold text-white font-serif">{currentMedia.title}</h4>
              <p className="text-xs text-rose-300 mt-1">{currentMedia.artist}</p>
            </div>
          )}

          {/* Autoplay Next Video Countdown Overlay */}
          {nextCountdown && nextCountdown.active && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
              <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-5 text-center shadow-2xl space-y-4">
                <div className="flex items-center justify-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>
                    {isSeriesItem(nextCountdown.nextMovie) && nextCountdown.nextMovie.season !== currentMedia.season
                      ? `Season ${currentMedia.season || 1} Complete • Next Season in ${nextCountdown.secondsLeft}s`
                      : isSeriesItem(nextCountdown.nextMovie)
                      ? `Episode Finished • Next Episode in ${nextCountdown.secondsLeft}s`
                      : `Video Finished • Playing Next in ${nextCountdown.secondsLeft}s`}
                  </span>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/90 p-3 rounded-xl border border-slate-700 text-left">
                  <img
                    src={nextCountdown.nextMovie.thumbnailUrl || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300'}
                    alt={nextCountdown.nextMovie.title}
                    className="w-16 h-12 object-cover rounded-lg border border-slate-600 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate font-serif">{nextCountdown.nextMovie.title}</h4>
                    <p className="text-xs text-rose-300/80 truncate mt-0.5">
                      {isSeriesItem(nextCountdown.nextMovie)
                        ? `Season ${nextCountdown.nextMovie.season || 1} • Episode ${nextCountdown.nextMovie.episode || 1}`
                        : nextCountdown.nextMovie.artist || nextCountdown.nextMovie.genre || 'Up Next'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleCancelNextCountdown}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
                  >
                    Stay on Screen
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlayNext(true)}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {isSeriesItem(nextCountdown.nextMovie) && nextCountdown.nextMovie.season !== currentMedia.season
                        ? 'Start Next Season'
                        : 'Play Next Episode'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Bullet Comments (Danmaku) Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {liveComments.map((comment) => (
              <div
                key={comment.id}
                style={{ top: `${comment.yPercent || 30}%` }}
                className="absolute whitespace-nowrap text-sm sm:text-base font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-danmaku-slide"
              >
                <span
                  style={{ color: comment.color || '#ffffff' }}
                  className="bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-xs font-serif"
                >
                  <span className="text-white/70 text-xs mr-1.5 font-sans font-normal">{comment.userName}:</span>
                  {comment.text}
                </span>
              </div>
            ))}
          </div>

          {/* Floating Picture-in-Picture (PiP) Couple Reaction Cam Bubble */}
          {isCallActive && showCamPiP && (
            <div className={`absolute z-30 flex gap-2 p-2 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl transition-all ${
              isImmersive ? 'bottom-20 right-4 sm:bottom-24' : 'bottom-4 right-4'
            }`}>
              {/* Partner Video Cam */}
              <div className="relative w-28 h-20 sm:w-36 sm:h-24 bg-slate-800 rounded-xl overflow-hidden border border-rose-500/40">
                {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 p-2">
                    <img
                      src={partner?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={partnerName}
                      className="w-8 h-8 rounded-full object-cover border border-rose-400 mb-1"
                    />
                    <span className="text-[10px] text-slate-300 truncate">{partnerName}</span>
                  </div>
                )}
                {isPartnerSpeaking && (
                  <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                )}
                <span className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
                  {partnerName}
                </span>
              </div>

              {/* Local User Cam */}
              {isVideoEnabled && (
                <div className="relative w-24 h-20 sm:w-28 sm:h-24 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                  <VerifiedBadgeOverlay
                    videoRef={localVideoRef}
                    isVideoOff={!isVideoEnabled}
                    position="top-right"
                    size="sm"
                  />
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
                    You
                  </span>
                </div>
              )}
            </div>
          )}

          {/* In-Movie Whisper / Danmaku Side Drawer */}
          {showSideChat && (
            <div className={`absolute top-0 right-0 bottom-0 ${
              isSideChatFullscreen ? 'left-0 w-full z-40 bg-slate-950/98' : 'w-72 sm:w-80 bg-slate-900/95'
            } backdrop-blur-md border-l border-slate-800 z-30 flex flex-col p-3 shadow-2xl animate-in slide-in-from-right`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                  <span>Movie Whispers & Reactions</span>
                  {isSideChatFullscreen && (
                    <span className="text-[10px] text-rose-400 font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                      Full Screen Chat
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsSideChatFullscreen(!isSideChatFullscreen)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title={isSideChatFullscreen ? "Restore sidebar chat" : "Extend chat area to full screen"}
                  >
                    {isSideChatFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-rose-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSideChat(false);
                      setIsSideChatFullscreen(false);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Close chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comments Feed */}
              <div className={`flex-1 overflow-y-auto py-2 space-y-2 text-xs ${isSideChatFullscreen ? 'max-w-2xl mx-auto w-full' : ''}`}>
                {liveComments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                    <Sparkles className="w-6 h-6 text-rose-400/40 mb-2" />
                    <p>No whispers yet.</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Send a message or reaction to float it across the cinema screen!
                    </p>
                  </div>
                ) : (
                  liveComments.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2 rounded-xl text-xs ${
                        c.userId === currentUserId
                          ? 'bg-rose-500/15 border border-rose-500/30 text-rose-200 ml-3'
                          : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 mr-3'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className="font-semibold">{c.userName}</span>
                        {c.videoTime !== undefined && (
                          <span className="font-mono">{formatTime(c.videoTime)}</span>
                        )}
                      </div>
                      <p className="font-medium break-words">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Reaction Tray */}
              <div className={`flex items-center justify-around py-1.5 border-t border-slate-800 bg-slate-900/50 ${isSideChatFullscreen ? 'max-w-2xl mx-auto w-full' : ''}`}>
                {['💖', '🍿', '😂', '🥺', '😭', '🔥', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleQuickMovieReaction(emoji)}
                    className="p-1 text-base hover:scale-125 transition-transform cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendBulletComment} className={`flex gap-1.5 pt-2 ${isSideChatFullscreen ? 'max-w-2xl mx-auto w-full' : ''}`}>
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Whisper during movie..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* =========================================================================
            CINEMA CONTROLS BAR: TIMELINE, VOLUME DUCKING, PLAY/PAUSE, SYNC
        ========================================================================= */}
        <div
          className={`p-3 sm:p-4 shrink-0 space-y-2.5 z-30 transition-all duration-300 ${
            isImmersive
              ? `absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent ${
                  !showControlsInFullscreen && isPlaying ? 'opacity-0 pointer-events-none translate-y-3' : 'opacity-100 translate-y-0'
                }`
              : 'bg-slate-900 border-t border-slate-800'
          }`}
        >
          {/* Progress Timeline Slider */}
          {currentMedia.type === 'video' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                {lastSyncBy && (
                  <span className="text-[10px] text-rose-300/80 bg-rose-950/30 px-2 py-0.5 rounded-full border border-rose-500/20">
                    Synced by {lastSyncBy}
                  </span>
                )}
                <span>{formatTime(duration || currentMedia.duration || 3600)}</span>
              </div>
              <input
                id="slider-movie-progress"
                type="range"
                min="0"
                max={duration || currentMedia.duration || 3600}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>
          )}

          {/* Master Controls & Live Voice Balancing */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
            {/* Left: Movie & Partner Audio Controls */}
            <div className="flex items-center gap-3">
              {/* Movie Sound Volume with % feedback */}
              <div className="flex items-center gap-1.5 text-slate-400">
                <button
                  onClick={handleToggleMovieMute}
                  className="p-1.5 hover:text-white transition-colors cursor-pointer"
                  title={isMutedMovie ? 'Unmute movie' : 'Mute movie'}
                >
                  {isMutedMovie ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  id="slider-movie-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMutedMovie ? 0 : movieVolume}
                  onChange={(e) => handleMovieVolumeChange(Number(e.target.value))}
                  className="w-14 sm:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  title="Movie volume"
                />
                <span className="text-[10px] text-slate-400 font-mono w-7 text-right select-none">
                  {isMutedMovie ? '0%' : `${Math.round(movieVolume * 100)}%`}
                </span>
              </div>

              {/* Auto Voice Ducking Toggle */}
              {isCallActive && (
                <button
                  onClick={() => setAutoDucking(!autoDucking)}
                  className={`px-2 py-1 rounded-xl text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                    autoDucking
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title="Auto-duck movie audio when you or your partner speaks"
                >
                  <Sliders className="w-3 h-3" />
                  <span className="hidden sm:inline">Voice Ducking: {autoDucking ? 'ON' : 'OFF'}</span>
                </button>
              )}
            </div>

            {/* Center: Playback Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                id="btn-movie-rewind-10"
                onClick={() => handleSkip(-10)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                title="Rewind 10s"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="btn-movie-play-pause"
                onClick={togglePlayPause}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? 'Pause for both (Space)' : 'Play for both (Space)'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>

              <button
                id="btn-movie-forward-10"
                onClick={() => handleSkip(10)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                title="Forward 10s"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Jump to Next Video */}
              <button
                id="btn-movie-next-video"
                onClick={() => handlePlayNext(true)}
                className="p-2 text-slate-400 hover:text-rose-300 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                title={`Jump to next video (${getNextVideo()?.title || 'Next'})`}
              >
                <FastForward className="w-4 h-4" />
              </button>

              {/* Autoplay Next Toggle */}
              <button
                id="btn-movie-autoplay-toggle"
                onClick={() => setIsAutoplayNext(!isAutoplayNext)}
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                  isAutoplayNext
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
                title={isAutoplayNext ? 'Autoplay is ON: advances to next video when finished' : 'Autoplay is OFF'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoplayNext ? 'bg-rose-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>Auto-Next</span>
              </button>
            </div>

            {/* Right: Quick Danmaku / Whisper Input + Screen Share + Catalog + Fullscreen */}
            <div className="flex items-center gap-2">
              <form onSubmit={handleSendBulletComment} className="hidden sm:flex items-center gap-1.5">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Whisper on screen..."
                  className="w-32 md:w-44 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer"
                  title="Send flying comment"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>

              {/* Stream Screen / Tab Button */}
              <button
                onClick={handleToggleScreenShare}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isScreenSharing
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/25 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white'
                }`}
                title="Stream your browser tab or desktop screen with synchronized audio"
              >
                <Tv className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden md:inline">{isScreenSharing ? 'Stop Screen Stream' : 'Stream Screen / Tab'}</span>
                <span className="md:hidden">{isScreenSharing ? 'Stop' : 'Screen'}</span>
              </button>

              {/* Toggle Movie Catalog / Search */}
              <button
                onClick={() => setShowCatalog(!showCatalog)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showCatalog
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>{showCatalog ? 'Hide Movies' : 'Browse Movies'}</span>
              </button>

              {/* If TV Series: Browse All Seasons & Episodes */}
              {isSeriesItem(currentMedia) && (
                <button
                  type="button"
                  id="btn-movie-bottom-episodes"
                  onClick={() => setSeriesModalItem(currentMedia)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-500/40 bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
                  title="Browse all seasons and select an episode"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Episodes ({currentMedia.season || 1}:{currentMedia.episode || 1})</span>
                </button>
              )}

              {/* Fullscreen Button */}
              <button
                id="btn-movie-toggle-fullscreen"
                onClick={handleToggleFullscreen}
                className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isImmersive
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title={isImmersive ? 'Exit Full Screen (F / Esc)' : 'Watch in Full Screen (F)'}
              >
                {isImmersive ? <Minimize2 className="w-3.5 h-3.5 text-rose-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-300" />}
                <span className="hidden sm:inline">{isImmersive ? 'Exit Full Screen' : 'Full Screen'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            DISCOVER MOVIES DRAWER: VIDUKI MOVIES, YOUTUBE SEARCH & HAVEN VOICE ONLY
        ========================================================================= */}
        {showCatalog && renderCatalogContent(false)}
      </>
    ) : (
      renderCatalogContent(true)
    )}

        {/* =========================================================================
            SERIES ALL SEASONS & EPISODES PICKER MODAL
        ========================================================================= */}
        <SeriesSeasonPickerModal
          isOpen={Boolean(seriesModalItem)}
          onClose={() => setSeriesModalItem(null)}
          series={seriesModalItem}
          currentActiveMedia={currentMedia}
          onSelectEpisode={handleSelectSeriesEpisode}
          currentServer={(vidukiConfig.defaultServer || 1) as 1 | 2 | 3 | 4}
          onServerChange={(srv) => {
            setVidukiServerInput(srv);
            setVidukiConfig((prev) => ({ ...prev, defaultServer: srv }));
          }}
          isFriends={isFriends}
        />

        {/* =========================================================================
            VIDUKI.NET MOVIE STREAMING API SETUP MODAL
        ========================================================================= */}
        {showVidukiModal && (
          <div
            id="modal-viduki-settings"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          >
            <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header */}
              <div className="p-4 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-pink-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Viduki.net Movie API</h3>
                      {vidukiConfig.apiKey ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Connected
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-semibold">
                          Setup Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Fetch, search & stream real movies directly from Viduki into your Watch Party
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVidukiModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
                {/* Guide Box */}
                <div className="p-3 bg-gradient-to-r from-rose-950/40 to-slate-950 rounded-xl border border-rose-500/25 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    <span>How to stream movies from Viduki.net</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Paste your personal <strong>Viduki API Key</strong> below. Once saved, it will be synchronized across your sanctuary so both you and {partner ? partner.name : partnerName} can search movies by title or IMDb ID (e.g. <code className="bg-slate-900 px-1 py-0.5 rounded text-rose-300 font-mono text-[10px]">tt1375666</code>) and watch together in real time!
                  </p>
                </div>

                {/* API Key Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-rose-400" />
                      Viduki API Key
                    </span>
                    {vidukiConfig.apiKey && (
                      <span className="text-[10px] text-emerald-400 font-normal">
                        Key saved on server
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      id="input-viduki-api-key"
                      type={showVidukiKey ? 'text' : 'password'}
                      value={vidukiKeyInput}
                      onChange={(e) => setVidukiKeyInput(e.target.value)}
                      placeholder={vidukiConfig.apiKey ? 'Enter new key or keep saved key...' : 'e.g. viduki_live_sec_...'}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowVidukiKey(!showVidukiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showVidukiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Your key is securely stored and never shared publicly.
                  </p>
                </div>

                {/* Multi-Server & Player Appearance Settings */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-rose-400" />
                      Default Viduki Server
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Servers 1-4 supported with auto-failover
                    </span>
                  </div>

                  {/* Server Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((srv) => (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => setVidukiServerInput(srv as 1 | 2 | 3 | 4)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 border ${
                          vidukiServerInput === srv
                            ? 'bg-rose-600/25 border-rose-500 text-rose-200 ring-2 ring-rose-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <span>Server {srv}</span>
                        <span className="text-[9px] font-normal text-slate-400">viduki.net/{srv}</span>
                      </button>
                    ))}
                  </div>

                  {/* Player Hex Theme Color & Streaming Quality */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Palette className="w-3 h-3 text-rose-400" />
                          Player Theme Color
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">?color={vidukiColorInput}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg border border-slate-700 shrink-0 shadow-inner"
                          style={{ backgroundColor: `#${vidukiColorInput.replace('#', '') || 'f43f5e'}` }}
                        />
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">#</span>
                          <input
                            type="text"
                            value={vidukiColorInput}
                            onChange={(e) => setVidukiColorInput(e.target.value.replace('#', '').trim())}
                            placeholder="f43f5e"
                            maxLength={8}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                          />
                        </div>
                        {/* Quick Color Swatches */}
                        {['f43f5e', 'e11d48', '8b5cf6', '06b6d4'].map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setVidukiColorInput(col)}
                            className="w-5 h-5 rounded-full border border-white/20 shrink-0 hover:scale-110 transition-transform cursor-pointer"
                            style={{ backgroundColor: `#${col}` }}
                            title={`#${col}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                        <span>Streaming Quality</span>
                      </label>
                      <select
                        value={vidukiQualityInput}
                        onChange={(e) => setVidukiQualityInput(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
                      >
                        <option value="1080p Ultra HD">1080p Full HD (Recommended)</option>
                        <option value="4K Cinema">4K Cinema / HDR</option>
                        <option value="720p HD">720p Fast Stream</option>
                      </select>
                    </div>
                  </div>

                  {/* Viduki Stream URL Syntax Specs */}
                  <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1 text-[11px] font-mono text-slate-300">
                    <div className="flex items-center justify-between text-slate-400 font-sans text-[10px]">
                      <span className="font-semibold uppercase tracking-wider text-rose-400">Stream Formats Supported</span>
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <Check className="w-3 h-3" /> Auto 404 Failover Active
                      </span>
                    </div>
                    <div className="truncate text-slate-300">
                      <span className="text-slate-500">Movie: </span>
                      https://viduki.net/<span className="text-rose-400">{vidukiServerInput}</span>/movie/<span className="text-pink-300">{'{id}'}</span>?color=<span className="text-purple-300">{vidukiColorInput || 'f43f5e'}</span>
                    </div>
                    <div className="truncate text-slate-300">
                      <span className="text-slate-500">TV: </span>
                      https://viduki.net/<span className="text-rose-400">{vidukiServerInput}</span>/tv/<span className="text-pink-300">{'{id}'}</span>/<span className="text-amber-300">{'{season}'}</span>/<span className="text-amber-300">{'{episode}'}</span>?color=<span className="text-purple-300">{vidukiColorInput || 'f43f5e'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Presets / TMDB & IMDb Shortcuts */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    Quick Launch Favorites (TMDB IDs)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Titanic', id: '597', type: 'movie' },
                      { name: 'Game of Thrones', id: '1399', type: 'tv' },
                      { name: 'Inception', id: '27205', type: 'movie' },
                      { name: 'Stranger Things', id: '66732', type: 'tv' },
                      { name: 'Interstellar', id: '157336', type: 'movie' },
                      { name: 'Breaking Bad', id: '1396', type: 'tv' },
                    ].map((fav) => (
                      <button
                        key={fav.id}
                        type="button"
                        onClick={() => {
                          setVidukiSearchQuery(fav.id);
                          const matching = FEATURED_VIDUKI_CATALOG.find((m) => m.tmdbId === fav.id);
                          if (matching) {
                            setVidukiTestMovies([matching]);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>{fav.name}</span>
                        <span className="text-rose-400 font-mono text-[9px]">#{fav.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Test Result Feedback Banner */}
                {vidukiTestResult && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 animate-in fade-in ${
                      vidukiTestResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-red-950/40 border-red-500/40 text-red-200'
                    }`}
                  >
                    {vidukiTestResult.success ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="text-[11px] leading-relaxed">
                      <p className="font-semibold">{vidukiTestResult.success ? 'Success!' : 'Verification Notice'}</p>
                      <p className="opacity-90">{vidukiTestResult.message}</p>
                    </div>
                  </div>
                )}

                {/* Test Live Movie Search Section */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-300 block text-xs">
                    Test Fetching a Movie from Viduki
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vidukiSearchQuery}
                      onChange={(e) => setVidukiSearchQuery(e.target.value)}
                      placeholder="e.g. Inception, Barbie, or tt1375666"
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleSearchVidukiTest}
                      disabled={isSearchingVidukiTest || !vidukiSearchQuery.trim()}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-1 cursor-pointer transition"
                    >
                      {isSearchingVidukiTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      <span>Fetch</span>
                    </button>
                  </div>

                  {/* Test Search Results */}
                  {vidukiTestMovies.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800 animate-in fade-in">
                      {vidukiTestMovies.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={m.thumbnailUrl}
                              alt={m.title}
                              className="w-9 h-12 rounded object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <h5 className="font-bold text-white text-xs truncate">{m.title}</h5>
                              <p className="text-[10px] text-slate-400 truncate">{m.genre || 'Viduki Stream'}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleChangeMovie(m);
                              setShowVidukiModal(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0 transition"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Stream Now</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  id="btn-test-viduki-api"
                  onClick={handleTestVidukiConnection}
                  disabled={isTestingViduki}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer transition"
                >
                  {isTestingViduki ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{isTestingViduki ? 'Testing Connection...' : 'Test Viduki Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowVidukiModal(false)}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-medium text-xs cursor-pointer transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    id="btn-save-viduki-config"
                    onClick={handleSaveVidukiConfig}
                    disabled={isSavingViduki}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-40 text-white font-semibold text-xs shadow-lg shadow-rose-500/25 flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    {isSavingViduki ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isSavingViduki ? 'Saving...' : 'Save & Sync with Partner'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
