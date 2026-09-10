import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
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
  RotateCcw,
  ExternalLink,
  Loader2,
  Globe,
  Dices,
  Clapperboard,
  Sparkle,
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
} from 'lucide-react';
import { MediaItem, MediaSyncState, UserProfile, InMovieComment, MovieWatchlistEntry, CallType, CallStatus } from '../types';
import { FEATURED_MOVIES, extractYouTubeId, searchOrFetchMovie, fetchOnlineMovies, searchOnlineMovies, getSurpriseMovie, fetchDirectYouTubeVideo, searchYouTubeDirect } from '../utils/movieCatalog';
import { VerifiedBadgeOverlay } from './common/VerifiedBadgeOverlay';

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
  const [currentMedia, setCurrentMedia] = useState<MediaItem>(FEATURED_MOVIES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [movieVolume, setMovieVolume] = useState(0.85);
  const [isMutedMovie, setIsMutedMovie] = useState(false);
  const [lastSyncBy, setLastSyncBy] = useState<string>('');

  // Movie Fetcher & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'youtube' | 'all'>('youtube');
  const [selectedCategory, setSelectedCategory] = useState<string>('youtube');
  const [searchResults, setSearchResults] = useState<MediaItem[]>(FEATURED_MOVIES);
  const [isSearching, setIsSearching] = useState(false);
  const [showCatalog, setShowCatalog] = useState(true);
  const [showCustomLinkInput, setShowCustomLinkInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [ytFetchLoading, setYtFetchLoading] = useState(false);
  const [ytPreviewItem, setYtPreviewItem] = useState<MediaItem | null>(null);

  // Netflix / Amazon Prime Style Showcase Spotlight & Screen Share States
  const [spotlightMovie, setSpotlightMovie] = useState<MediaItem>(FEATURED_MOVIES[0]);
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
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

          // Duck movie volume if partner is speaking
          if (videoRef.current) {
            if (speaking) {
              videoRef.current.volume = Math.max(0.15, movieVolume * 0.3);
            } else {
              videoRef.current.volume = isMutedMovie ? 0 : movieVolume;
            }
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

    if (mediaSyncState.currentMedia && mediaSyncState.currentMedia.id !== currentMedia.id) {
      setCurrentMedia(mediaSyncState.currentMedia);
    }

    setLastSyncBy(mediaSyncState.updatedByName || partnerName);

    if (videoRef.current && currentMedia.type === 'video') {
      const video = videoRef.current;
      const timeDiff = Math.abs(video.currentTime - mediaSyncState.currentTime);
      if (timeDiff > 2.5) {
        video.currentTime = mediaSyncState.currentTime;
      }

      if (mediaSyncState.isPlaying && video.paused) {
        video.play().catch(() => {});
        setIsPlaying(true);
      } else if (!mediaSyncState.isPlaying && !video.paused) {
        video.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(mediaSyncState.isPlaying);
      setCurrentTime(mediaSyncState.currentTime);
    }
  }, [mediaSyncState, currentMedia.id, currentMedia.type, partnerName]);

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

  // Play / Pause Toggle
  const togglePlayPause = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (currentMedia.type === 'video' && videoRef.current) {
      if (nextState) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }

    broadcastSync(nextState, videoRef.current ? videoRef.current.currentTime : currentTime);
  };

  // Screen Share Toggle (Watch Netflix / Prime / Tab with Audio)
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
        audio: true, // Captures tab and movie audio from Netflix, Prime Video, YouTube
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

  // Smooth shelf scroll helper
  const handleScrollRow = (rowId: string, direction: 'left' | 'right') => {
    const el = document.getElementById(rowId);
    if (el) {
      const amount = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

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

  // Resolve the next video in sequence from current search results, watchlist, or featured catalog
  const getNextVideo = useCallback((): MediaItem => {
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

    // 3. Fallback to FEATURED_MOVIES catalog sequence
    const featIdx = FEATURED_MOVIES.findIndex((m) => m.id === currentMedia.id || m.url === currentMedia.url);
    if (featIdx !== -1 && FEATURED_MOVIES.length > 1) {
      return FEATURED_MOVIES[(featIdx + 1) % FEATURED_MOVIES.length];
    }

    // 4. Default fallback to next available movie in catalog
    const remaining = FEATURED_MOVIES.filter((m) => m.id !== currentMedia.id);
    return remaining.length > 0 ? remaining[0] : FEATURED_MOVIES[0];
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

      // Check if YouTube emitted an ended event (state 0)
      const isEnded =
        (data.event === 'onStateChange' && (data.info === 0 || data.info?.playerState === 0)) ||
        (data.event === 'infoDelivery' && data.info && (data.info.playerState === 0 || data.info.playerState === '0'));

      if (isEnded) {
        handleVideoFinished();
      }
    };

    window.addEventListener('message', handleMessage);

    // Periodically notify YouTube iframe that parent is listening for API events
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
      handleVideoFinished();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
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
    }
    broadcastSync(isPlaying, seconds);
  };

  // Skip relative (+/- 10s)
  const handleSkip = (deltaSeconds: number) => {
    const next = Math.max(0, currentTime + deltaSeconds);
    handleSeek(next);
  };

  // Load online movie catalog on mount
  useEffect(() => {
    let isMounted = true;
    fetchOnlineMovies('all').then((movies) => {
      if (isMounted && movies.length > 0) {
        setSearchResults(movies);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Search or Fetch real online movies / YouTube direct / Archive.org
  const handlePerformSearch = async (query: string, modeOverride?: 'youtube' | 'all') => {
    setSearchQuery(query);
    const activeMode = modeOverride || searchMode;
    const trimmed = query.trim();

    if (!trimmed) {
      if (activeMode === 'youtube') {
        setIsSearching(true);
        try {
          const ytResults = await searchYouTubeDirect('trending music video relax 4k');
          setSearchResults(ytResults.length > 0 ? ytResults : FEATURED_MOVIES.filter(m => m.type === 'youtube'));
        } catch (e) {
          console.warn(e);
        } finally {
          setIsSearching(false);
        }
        return;
      }
      filterByCategory(selectedCategory);
      return;
    }

    setIsSearching(true);
    try {
      if (activeMode === 'youtube' || selectedCategory === 'youtube') {
        const ytResults = await searchYouTubeDirect(trimmed);
        setSearchResults(ytResults);
      } else {
        const results = await searchOnlineMovies(trimmed, selectedCategory);
        setSearchResults(results);
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Filter catalog by category (fetches from online library or YouTube)
  const filterByCategory = async (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'watchlist') {
      setSearchResults(watchlist.map((w) => w.movie));
      return;
    }
    if (cat === 'youtube') {
      setSearchMode('youtube');
      setIsSearching(true);
      try {
        const query = searchQuery.trim() || 'trending music video relax 4k';
        const ytResults = await searchYouTubeDirect(query);
        setSearchResults(ytResults.length > 0 ? ytResults : FEATURED_MOVIES.filter(m => m.type === 'youtube'));
      } catch (err) {
        console.warn('YouTube category error:', err);
      } finally {
        setIsSearching(false);
      }
      return;
    }
    setIsSearching(true);
    try {
      const movies = await fetchOnlineMovies(cat);
      setSearchResults(movies);
    } catch (err) {
      console.warn('Filter category error:', err);
    } finally {
      setIsSearching(false);
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

  // Surprise random date night movie picker
  const handlePickSurpriseMovie = async () => {
    setIsSearching(true);
    try {
      const category = selectedCategory === 'watchlist' ? 'all' : selectedCategory;
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

  // Render a Netflix/Amazon Prime style horizontal shelf row
  const renderMovieShelf = (rowId: string, title: string, movies: MediaItem[]) => {
    if (!movies || movies.length === 0) return null;

    return (
      <div key={rowId} className="space-y-2">
        {/* Row Title & Navigation Arrows */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-white font-serif tracking-tight">
              {title}
            </h4>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
              {movies.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleScrollRow(rowId, 'left')}
              className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer shadow-sm"
              title="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScrollRow(rowId, 'right')}
              className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer shadow-sm"
              title="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel Container */}
        <div
          id={rowId}
          className="flex gap-3 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar"
        >
          {movies.map((movie) => {
            const isActive = currentMedia.id === movie.id;
            const isInWatchlist = watchlist.some((w) => w.movie.id === movie.id);
            const isSpotlight = spotlightMovie?.id === movie.id;

            return (
              <div
                key={movie.id}
                className={`w-32 sm:w-40 md:w-44 shrink-0 group relative rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/20'
                    : isSpotlight
                    ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'border-slate-800/90 hover:border-rose-500/60 hover:scale-[1.03]'
                } bg-slate-900 flex flex-col shadow-md`}
                onClick={() => setSpotlightMovie(movie)}
              >
                {/* 2:3 Vertical Poster */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                  <img
                    src={movie.thumbnailUrl || movie.backdropUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500'}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/40" />

                  {/* Top Badges */}
                  <span className="absolute top-1.5 left-1.5 bg-emerald-950/90 border border-emerald-500/40 text-[8px] font-bold text-emerald-300 px-1.5 py-0.5 rounded shadow-sm">
                    {movie.matchScore || '98%'} Match
                  </span>

                  {movie.rating && (
                    <span className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-xs text-[8px] font-bold text-amber-300 px-1 py-0.5 rounded">
                      ★ {movie.rating}
                    </span>
                  )}

                  {/* Quality Badge */}
                  {movie.streamQuality && (
                    <span className="absolute bottom-1.5 right-1.5 bg-slate-900/90 text-rose-300 text-[8px] font-bold px-1.5 py-0.5 rounded border border-rose-500/20">
                      {movie.streamQuality}
                    </span>
                  )}

                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-2 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChangeMovie(movie);
                      }}
                      className="w-10 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                      title="Play movie together"
                    >
                      <Play className="w-5 h-5 ml-0.5 fill-white" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleWatchlist(movie);
                        }}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-200 hover:text-amber-400 transition-colors cursor-pointer"
                        title={isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                      >
                        {isInWatchlist ? (
                          <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSpotlightMovie(movie);
                        }}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-200 hover:text-rose-400 transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Title & Info */}
                <div className="p-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h5 className="text-[11px] sm:text-xs font-bold text-white truncate font-serif" title={movie.title}>
                      {movie.title}
                    </h5>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {movie.year ? `${movie.year} • ` : ''}
                      {movie.artist || movie.genre}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const ytId = currentMedia.type === 'youtube' ? extractYouTubeId(currentMedia.url) : null;
  const isCustomMovie = currentMedia.category === 'custom';
  const isImmersive = isFullscreen || theaterMode;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isImmersive ? 'p-0 bg-black' : 'p-2 sm:p-4 bg-black/90 backdrop-blur-md'
      } animate-in fade-in select-none`}
    >
      {/* Hidden Partner Remote Audio Playback Element */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div
        className={`relative w-full ${
          isImmersive ? 'h-full max-w-none rounded-none border-0' : 'max-w-5xl rounded-3xl max-h-[95vh] border border-slate-800'
        } bg-slate-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-300`}
      >
        {/* =========================================================================
            CINEMA HEADER & TALK / VOICE OVERLAY STATUS
        ========================================================================= */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3 shrink-0 z-30 transition-all duration-300 ${
            isImmersive
              ? `absolute top-0 left-0 right-0 bg-gradient-to-b from-black/95 via-black/70 to-transparent ${
                  !showControlsInFullscreen && isPlaying ? 'opacity-0 pointer-events-none -translate-y-3' : 'opacity-100 translate-y-0'
                }`
              : 'bg-slate-900/95 border-b border-slate-800'
          }`}
        >
          {/* Left: Movie & Room Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white font-serif tracking-tight truncate max-w-[180px] sm:max-w-xs">
                  {currentMedia.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-semibold border border-rose-500/30 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-rose-400" />
                  <span>{isImmersive ? 'Full Screen Cinema' : isFriends ? 'Squad Cinema' : 'Synced Cinema'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {isFriends
                    ? `Watching with ${groupEmoji ? `${groupEmoji} ` : ''}${effectiveGroupName} (${squadMembersCount} in squad)`
                    : `Watching with ${partner ? partner.name : partnerName}`}
                </span>
                {currentMedia.genre && (
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

            {/* Quick Toggle Online Movies Catalog */}
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                showCatalog
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
              title="Browse Real Online Movies"
            >
              <Film className="w-3.5 h-3.5 text-rose-400" />
              <span>{showCatalog ? 'Hide Movies' : 'Discover Movies'}</span>
            </button>

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
        <div
          onDoubleClick={handleToggleFullscreen}
          className={`relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden select-none group/player ${
            isImmersive ? 'h-full min-h-0' : 'min-h-[300px] sm:min-h-[420px]'
          }`}
        >
          {/* Quick Floating Fullscreen / Exit Hint Pill in Top Corner */}
          <div className="absolute top-4 right-4 z-20 opacity-0 group-hover/player:opacity-100 transition-opacity duration-200">
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

          {/* 0. Real-time Screen Streaming (Netflix / Prime / Any Browser Tab) */}
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
                <span>Streaming Screen (Netflix / Prime) with Audio</span>
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
            <div className={`w-full h-full aspect-video ${isImmersive ? 'max-h-full' : 'max-h-[62vh]'}`}>
              <iframe
                ref={ytIframeRef}
                id="yt-cinema-iframe"
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                title={currentMedia.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            /* 3. Audio / Visualizer Stream */
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
                  <span>Video Finished • Playing Next in {nextCountdown.secondsLeft}s</span>
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
                      {nextCountdown.nextMovie.artist || nextCountdown.nextMovie.genre || 'Up Next'}
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
                    <span>Play Next Now</span>
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
            <div className="absolute top-0 right-0 bottom-0 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 z-30 flex flex-col p-3 shadow-2xl animate-in slide-in-from-right">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                  <span>Movie Whispers & Reactions</span>
                </div>
                <button
                  onClick={() => setShowSideChat(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Comments Feed */}
              <div className="flex-1 overflow-y-auto py-2 space-y-2 text-xs">
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
              <div className="flex items-center justify-around py-1.5 border-t border-slate-800 bg-slate-900/50">
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
              <form onSubmit={handleSendBulletComment} className="flex gap-1.5 pt-2">
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
              {/* Movie Sound Volume */}
              <div className="flex items-center gap-1.5 text-slate-400">
                <button
                  onClick={() => {
                    const next = !isMutedMovie;
                    setIsMutedMovie(next);
                    if (videoRef.current) videoRef.current.muted = next;
                  }}
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
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMovieVolume(v);
                    setIsMutedMovie(false);
                    if (videoRef.current) {
                      videoRef.current.volume = v;
                      videoRef.current.muted = false;
                    }
                  }}
                  className="w-14 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  title="Movie volume"
                />
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
                id="btn-movie-play-pause"
                onClick={togglePlayPause}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? 'Pause for both' : 'Play for both'}
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

              {/* Stream Netflix / Screen Share Button */}
              <button
                onClick={handleToggleScreenShare}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isScreenSharing
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/25 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white'
                }`}
                title="Stream your Netflix, Prime Video, or browser tab with full audio synchronization"
              >
                <Tv className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden md:inline">{isScreenSharing ? 'Stop Screen Stream' : 'Stream Netflix / Tab'}</span>
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
            MOVIE FETCHER & CURATED THEATER CATALOG DRAWER
        ========================================================================= */}
        {showCatalog && (
          <div className="p-4 bg-slate-950/95 border-t border-slate-800/90 max-h-[68vh] sm:max-h-[74vh] overflow-y-auto z-20 space-y-3 animate-in fade-in">
            {/* Search Source Toggle & Action Bar */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode('youtube');
                      setSelectedCategory('youtube');
                      handlePerformSearch(searchQuery || (isFriends ? 'trending gaming clips 2025' : 'trending music video relax 4k'), 'youtube');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      searchMode === 'youtube'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span>🔴 {isFriends ? 'Search YouTube for Squad' : 'Search YouTube Directly'}</span>
                    <span className="text-[10px] bg-red-950/80 text-red-200 border border-red-500/40 px-1.5 py-0.2 rounded font-mono">
                      No URL Needed
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchMode('all');
                      if (selectedCategory === 'youtube') setSelectedCategory('all');
                      handlePerformSearch(searchQuery, 'all');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      searchMode === 'all'
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>🎬 Cinema & Netflix Shelves</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    {searchMode === 'youtube'
                      ? (isFriends ? 'Search any video, gaming stream, or podcast on YouTube for the squad' : 'Type any video title, artist, or topic on YouTube')
                      : 'Search universal cinema, classics & open media'}
                  </span>
                </div>
              </div>

              {/* Live Search Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePerformSearch(searchQuery, searchMode);
                }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <div className="relative flex-1">
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2 animate-spin" />
                  ) : searchMode === 'youtube' ? (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold">🔴</span>
                  ) : (
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  )}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      handlePerformSearch(val, searchMode);
                    }}
                    placeholder={
                      searchMode === 'youtube'
                        ? (isFriends
                            ? 'Search ANY video on YouTube for squad (e.g. Gaming, MrBeast, Podcasts, Music, Anime, Memes)...'
                            : 'Search ANY video on YouTube (e.g. MrBeast, Ed Sheeran, Podcast, Anime, Standup, Lofi)...')
                        : 'Search any movie in the world (e.g. Inception, Interstellar, Audrey Hepburn, Chaplin, Romance)...'
                    }
                    className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        handlePerformSearch('', searchMode);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSearching}
                    className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      searchMode === 'youtube'
                        ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {isSearching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>{searchMode === 'youtube' ? 'Search YouTube' : 'Search Cinema'}</span>
                  </button>

                  {/* Random Surprise Movie / Video */}
                  <button
                    type="button"
                    onClick={handlePickSurpriseMovie}
                    disabled={isSearching}
                    className="px-3 py-2 bg-gradient-to-r from-rose-600/30 to-amber-600/30 hover:from-rose-600/50 hover:to-amber-600/50 text-rose-200 hover:text-white text-xs font-semibold rounded-xl border border-rose-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
                    title={isFriends ? 'Pick a random surprise video for squad hangout' : 'Pick a random surprise movie for date night'}
                  >
                    <Dices className="w-3.5 h-3.5 text-amber-300" />
                    <span className="hidden sm:inline">{isFriends ? 'Squad Surprise 🎲' : 'Surprise Us 🎲'}</span>
                  </button>

                  {/* Custom Link / Fetch Movie Button */}
                  <button
                    type="button"
                    onClick={() => setShowCustomLinkInput(!showCustomLinkInput)}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title="Have a specific YouTube or MP4 link? Paste it here"
                  >
                    <Plus className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">Paste URL</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Search Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
              <span className="text-slate-500 font-medium whitespace-nowrap text-[10px] uppercase tracking-wider">
                {searchMode === 'youtube' ? (isFriends ? 'Squad Ideas:' : 'YouTube Ideas:') : 'Cinema Ideas:'}
              </span>
              {(searchMode === 'youtube'
                ? (isFriends
                    ? [
                        { label: '🔥 Trending 2025', q: 'trending music video 2025' },
                        { label: '🎮 Gaming Clips', q: 'funny gaming moments compilation' },
                        { label: '⚡ MrBeast Challenges', q: 'mrbeast stunts challenges' },
                        { label: '😂 Stand-Up & Memes', q: 'stand up comedy best clips' },
                        { label: '🎧 Squad Lofi Hangout', q: 'chill lofi beats study hangout' },
                        { label: '🎵 Billboard Hits & Rap', q: 'top billboard music videos' },
                        { label: '🎙️ Joe Rogan & Podcasts', q: 'popular podcast clips' },
                        { label: '🐰 Anime Sakuga 4K', q: 'anime sakuga fight scenes 4k' },
                        { label: '🍿 Movie Trailers 4K', q: 'new movie trailers 2025 4k' },
                      ]
                    : [
                        { label: '🔥 Trending YouTube', q: 'trending music video 2025' },
                        { label: '💖 Date Night Romance', q: 'romantic date night movie scene' },
                        { label: '☕ Lofi Girl Radio', q: 'lofi hip hop radio beats to relax' },
                        { label: '🗼 Tokyo 4K Rain Walk', q: 'tokyo 4k rain walk ambience' },
                        { label: '🎵 Romantic Acoustic', q: 'romantic acoustic love songs' },
                        { label: '😂 Stand-Up Comedy', q: 'stand up comedy best clips' },
                        { label: '🐰 Sweet Animation 4K', q: 'cute animated short film 4k' },
                        { label: '🚀 Interstellar 4K', q: 'interstellar movie scene 4k' },
                        { label: '🍳 Street Food 4K', q: 'street food around the world 4k' },
                      ])
                : [
                    { label: 'Charlie Chaplin', q: 'Charlie Chaplin' },
                    { label: 'Sherlock Holmes', q: 'Sherlock Holmes' },
                    { label: 'Audrey Hepburn', q: 'Audrey Hepburn' },
                    { label: 'Buster Keaton', q: 'Buster Keaton' },
                    { label: 'Romance', q: 'Romance' },
                    { label: 'Horror', q: 'Horror' },
                    { label: 'Sci-Fi', q: 'Sci-Fi' },
                    { label: 'Vincent Price', q: 'Vincent Price' },
                    { label: 'Big Buck Bunny', q: 'Big Buck Bunny' },
                    { label: 'NASA 4K', q: 'NASA 4K' },
                  ]
              ).map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setSearchQuery(chip.q);
                    handlePerformSearch(chip.q, searchMode);
                  }}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-200 border border-slate-800 hover:border-rose-500/30 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[10px]"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Direct YouTube & Custom Video Fetcher Drawer */}
            {showCustomLinkInput && (
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-rose-500/30 shadow-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <Tv className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Fetch Direct from YouTube or Video Link</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-red-600/30 text-red-300 border border-red-500/40 rounded font-semibold">
                          🔴 Live Fetch
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Paste any YouTube link, video ID, or direct MP4/WebM URL. Metadata is fetched automatically!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomLinkInput(false);
                      setYtPreviewItem(null);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
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
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 pr-8"
                    />
                    {ytFetchLoading && (
                      <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFetchYouTubePreview(customUrlInput)}
                      disabled={ytFetchLoading || !customUrlInput.trim()}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 disabled:opacity-50 transition cursor-pointer shrink-0"
                    >
                      {ytFetchLoading ? 'Fetching...' : 'Fetch Details'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSearching || (!customUrlInput.trim() && !ytPreviewItem)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-600/20 transition cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Stream Together</span>
                    </button>
                  </div>
                </form>

                {/* Fetched Preview Card */}
                {ytPreviewItem && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-24 sm:w-28 aspect-video rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700 shadow">
                        <img
                          src={ytPreviewItem.thumbnailUrl}
                          alt={ytPreviewItem.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 text-white px-1 rounded font-mono">
                          HD
                        </span>
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Fetched from YouTube
                        </span>
                        <h5 className="text-xs font-bold text-white truncate">{ytPreviewItem.title}</h5>
                        <p className="text-[10px] text-slate-400">{ytPreviewItem.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleWatchlist(ytPreviewItem)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Bookmark className="w-3 h-3 text-amber-400" />
                        <span>Watchlist</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCustomUrl()}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Stream with Partner</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Instant Try Suggestion Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-1 border-t border-slate-800/80 no-scrollbar">
                  <span className="text-slate-500 text-[10px] font-medium whitespace-nowrap">Try YouTube:</span>
                  {[
                    { label: 'Lofi Girl Radio ☕', query: 'lofi hip hop radio' },
                    { label: 'Tokyo Rain 4K Walk 🗼', query: 'kyoto bamboo rain walk nomadic ambience' },
                    { label: 'Studio Ghibli Piano 🎹', query: 'relaxing ghibli piano cafe music' },
                    { label: 'NASA Earth 4K 🌌', query: 'earth from orbit ISS 4K' },
                    { label: 'Interstellar Trailer 🚀', query: 'interstellar official trailer' },
                  ].map((sug) => (
                    <button
                      key={sug.label}
                      type="button"
                      onClick={() => {
                        handlePerformSearch(sug.query);
                        filterByCategory('youtube');
                      }}
                      className="px-2 py-0.5 bg-slate-950 hover:bg-rose-950/40 text-slate-300 hover:text-rose-200 border border-slate-800 hover:border-rose-500/30 rounded-lg whitespace-nowrap text-[10px] cursor-pointer transition"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Real Online Movie Banner */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-200">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  <strong>Online Cinema & YouTube Direct:</strong> Stream thousands of real full-length movies, YouTube channels & 4K tours directly with {partner ? partner.name : partnerName}.
                </span>
              </div>
              <span className="text-[10px] text-rose-300/70 hidden md:inline">
                Real-time synchronized HD
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: '🎬 Netflix Shelves' },
                  { id: 'youtube', label: '🔴 YouTube Direct' },
                  { id: 'romance', label: '💖 Romance & Date' },
                  { id: 'comedy', label: '🍿 Comedy' },
                  { id: 'animation', label: '✨ Animation & 4K' },
                  { id: 'scifi', label: '🚀 Sci-Fi & Action' },
                  { id: 'horror', label: '👻 Horror & Thriller' },
                  { id: 'cozy', label: '🌌 Cozy Dates' },
                  { id: 'watchlist', label: `⭐ Watchlist (${watchlist.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => filterByCategory(tab.id)}
                    className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === tab.id
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MAIN CONTENT AREA: HERO SPOTLIGHT + HORIZONTAL SHELVES (OR SEARCH RESULTS GRID) */}
            {searchResults.length === 0 && !isSearching ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
                <Clapperboard className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-200 font-semibold">
                  No online movies found matching &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try searching for classic titles, directors, actors (like Inception, Audrey Hepburn, Charlie Chaplin, Buster Keaton), or popular genres.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    filterByCategory('all');
                  }}
                  className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  Return to Netflix Browse Shelves
                </button>
              </div>
            ) : !searchQuery.trim() && selectedCategory === 'all' ? (
              /* NETFLIX & AMAZON PRIME HOME EXPERIENCE */
              <div className="space-y-6 pt-1">
                {/* 1. HERO SPOTLIGHT BILLBOARD */}
                {spotlightMovie && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                    <div className="relative h-48 sm:h-64 md:h-72 w-full overflow-hidden">
                      <img
                        src={spotlightMovie.backdropUrl || spotlightMovie.thumbnailUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200'}
                        alt={spotlightMovie.title}
                        className="w-full h-full object-cover object-center scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
                    </div>

                    <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end z-10">
                      <div className="max-w-2xl space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {spotlightMovie.matchScore || '98%'} Match
                          </span>
                          {spotlightMovie.rating && (
                            <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-300" />
                              {spotlightMovie.rating}
                            </span>
                          )}
                          <span className="bg-slate-800/80 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">
                            {spotlightMovie.streamQuality || '1080p Ultra HD'}
                          </span>
                          {spotlightMovie.year && (
                            <span className="text-slate-400 font-semibold text-[11px]">{spotlightMovie.year}</span>
                          )}
                          <span className="bg-rose-950/60 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full text-[10px]">
                            {spotlightMovie.genre || 'Cinema Feature'}
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white font-serif tracking-tight drop-shadow-md">
                          {spotlightMovie.title}
                        </h3>

                        {spotlightMovie.description && (
                          <p className="text-xs sm:text-sm text-slate-300/90 line-clamp-2 max-w-xl drop-shadow-sm font-sans">
                            {spotlightMovie.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <button
                            onClick={() => handleChangeMovie(spotlightMovie)}
                            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all cursor-pointer hover:scale-105"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Play Together</span>
                          </button>

                          <button
                            onClick={handleToggleScreenShare}
                            className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm rounded-xl border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
                            title="Stream your real Netflix / Prime / Tab screen with audio"
                          >
                            <Tv className="w-4 h-4 text-red-400" />
                            <span>Stream Netflix / Tab</span>
                          </button>

                          <button
                            onClick={() => handleToggleWatchlist(spotlightMovie)}
                            className={`p-2 rounded-xl border transition-all cursor-pointer ${
                              watchlist.some((w) => w.movie.id === spotlightMovie.id)
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                            }`}
                            title="Add or remove from shared watchlist"
                          >
                            {watchlist.some((w) => w.movie.id === spotlightMovie.id) ? (
                              <BookmarkCheck className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. HORIZONTAL SHELVES (NETFLIX CAROUSEL ROWS) */}
                <div className="space-y-6">
                  {/* Shelf 1: Trending Now */}
                  {renderMovieShelf('shelf-trending', '🔥 Trending on Haven Cinema', FEATURED_MOVIES.slice(0, 8))}

                  {/* Shelf 2: Shared Watchlist (if any) */}
                  {watchlist.length > 0 &&
                    renderMovieShelf(
                      'shelf-watchlist',
                      isFriends ? `⭐ Squad Shared Watchlist (${watchlist.length})` : `⭐ Your Shared Couple Watchlist (${watchlist.length})`,
                      watchlist.map((w) => w.movie)
                    )}

                  {/* Shelf 3: Date Night Romance */}
                  {renderMovieShelf(
                    'shelf-romance',
                    isFriends ? '✨ Chill & Feel-Good Vibes' : '💖 Date Night Romance & Rom-Coms',
                    FEATURED_MOVIES.filter((m) => m.category === 'romance')
                  )}

                  {/* Shelf 4: Comedy & Banter */}
                  {renderMovieShelf(
                    'shelf-comedy',
                    isFriends ? '🍿 Comedy, Memes & Squad Banter' : '🍿 Comedy & Laughs Together',
                    FEATURED_MOVIES.filter((m) => m.category === 'comedy')
                  )}

                  {/* Shelf 5: Sci-Fi & Action */}
                  {renderMovieShelf(
                    'shelf-scifi',
                    '🚀 Action, Sci-Fi & Thrillers',
                    FEATURED_MOVIES.filter((m) => m.category === 'scifi')
                  )}

                  {/* Shelf 6: Horror & Late Night */}
                  {renderMovieShelf(
                    'shelf-horror',
                    '👻 Spooky & Late Night Thrillers',
                    FEATURED_MOVIES.filter((m) => m.category === 'horror')
                  )}

                  {/* Shelf 7: Animation & Open Cinema */}
                  {renderMovieShelf(
                    'shelf-animation',
                    '✨ 4K Animation & Creative Shorts',
                    FEATURED_MOVIES.filter((m) => m.category === 'animation')
                  )}

                  {/* Shelf 8: 4K Virtual Date Tours & Scenic Escapes */}
                  {renderMovieShelf(
                    'shelf-cozy',
                    isFriends ? '🗼 4K Virtual Squad Escapes & Cozy Radios' : '🗼 4K Virtual Date Tours & Scenic Escapes',
                    FEATURED_MOVIES.filter((m) => m.category === 'cozy')
                  )}
                </div>
              </div>
            ) : (
              /* UNIVERSAL SEARCH RESULTS / CATEGORY GRID */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center gap-2">
                    {searchMode === 'youtube' || selectedCategory === 'youtube' ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        🔴 YouTube Direct Results
                      </span>
                    ) : null}
                    <span>
                      Showing {searchResults.length} {searchMode === 'youtube' ? 'video' : 'movie'}{searchResults.length !== 1 ? 's' : ''}{' '}
                      {searchQuery ? `for "${searchQuery}"` : `in ${selectedCategory}`}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchMode('all');
                      filterByCategory('all');
                    }}
                    className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    View All Netflix Shelves
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {searchResults.map((movie) => {
                    const isActive = currentMedia.id === movie.id;
                    const isInWatchlist = watchlist.some((w) => w.movie.id === movie.id);
                    const durationFormatted = movie.duration
                      ? movie.duration >= 3600
                        ? `${Math.floor(movie.duration / 3600)}h ${Math.floor((movie.duration % 3600) / 60)}m`
                        : `${Math.floor(movie.duration / 60)}m`
                      : null;

                    return (
                      <div
                        key={movie.id}
                        className={`group relative flex flex-col rounded-2xl border transition-all overflow-hidden ${
                          isActive
                            ? 'bg-rose-500/15 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Poster with Badges */}
                        <div className="relative aspect-[16/10] sm:aspect-[3/2] w-full overflow-hidden bg-slate-950">
                          <img
                            src={movie.thumbnailUrl || movie.backdropUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500'}
                            alt={movie.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                          {/* Match Score Badge */}
                          <span className="absolute top-2 left-2 bg-emerald-950/90 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 px-1.5 py-0.5 rounded shadow-sm">
                            {movie.matchScore || '97%'} Match
                          </span>

                          {/* Rating Badge */}
                          {movie.rating && (
                            <span className="absolute top-2 right-2 bg-black/75 backdrop-blur-xs text-[9px] font-bold text-amber-300 px-1.5 py-0.5 rounded">
                              ★ {movie.rating}
                            </span>
                          )}

                          {/* YouTube Duration Pill or Stream Quality */}
                          {movie.durationStr ? (
                            <span className="absolute bottom-2 right-2 bg-black/90 text-[9px] font-mono font-bold text-white px-1.5 py-0.5 rounded shadow border border-white/10">
                              {movie.durationStr}
                            </span>
                          ) : movie.streamQuality ? (
                            <span className="absolute bottom-2 right-2 bg-rose-950/85 backdrop-blur-xs text-[8px] font-bold text-rose-300 px-1 py-0.5 rounded border border-rose-500/20">
                              {movie.streamQuality}
                            </span>
                          ) : null}

                          {/* Add to Watchlist Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWatchlist(movie);
                            }}
                            className="absolute bottom-2 left-2 p-1 rounded-lg bg-black/60 hover:bg-black/80 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                            title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                          >
                            {isInWatchlist ? (
                              <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Bookmark className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Card Body */}
                        <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                          <div>
                            <h5 className="text-xs font-bold text-white truncate font-serif" title={movie.title}>
                              {movie.title}
                            </h5>

                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate mt-0.5">
                              {movie.type === 'youtube' ? (
                                <span className="text-rose-400 font-semibold flex items-center gap-1">
                                  <span>🔴</span>
                                  <span className="truncate">{movie.artist || 'YouTube'}</span>
                                </span>
                              ) : (
                                <span>{movie.artist || movie.genre}</span>
                              )}
                              {movie.year && <span>• {movie.year}</span>}
                              {durationFormatted && !movie.durationStr && <span>• {durationFormatted}</span>}
                            </div>

                            {/* Available on badges */}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(movie.availableOn || ['Direct Stream']).map((platform) => (
                                <span
                                  key={platform}
                                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md border ${
                                    platform === 'Netflix'
                                      ? 'bg-red-950/60 text-red-300 border-red-500/30'
                                      : platform === 'Prime Video'
                                      ? 'bg-blue-950/60 text-blue-300 border-blue-500/30'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  {platform}
                                </span>
                              ))}
                            </div>

                            {movie.description && (
                              <p className="text-[10px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                                {movie.description}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() => handleChangeMovie(movie)}
                              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-rose-500 text-white shadow-xs'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                              }`}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isActive ? 'Playing' : isFriends ? 'Stream with Squad' : 'Stream Together'}</span>
                            </button>

                            <button
                              onClick={handleToggleScreenShare}
                              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-semibold border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Stream via Screen Share"
                            >
                              <Tv className="w-3 h-3 text-red-400" />
                              <span className="hidden sm:inline">Screen</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
