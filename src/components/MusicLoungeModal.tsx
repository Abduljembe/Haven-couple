import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  X,
  Radio,
  Sparkles,
  Link,
  Search,
  Users,
  Flame,
  Globe,
  Upload,
  Tv,
  Disc,
  Headphones,
} from 'lucide-react';
import { MusicTrack, SyncMusicState } from '../types';
import { musicEngine } from '../utils/musicEngine';
import { useHavenVoiceAssistant } from '../hooks/useHavenVoiceAssistant';
import { HavenVoiceControl } from './HavenVoiceControl';

interface MusicLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncMusicState: SyncMusicState;
  onUpdateSyncState: (state: Partial<SyncMusicState>) => void;
  currentUserName: string;
  partnerName: string;
  isPartnerOnline: boolean;
  spaceType?: 'couple' | 'friends';
  onOpenWatchTogether?: () => void;
}

const DEFAULT_WEB_TRACK: MusicTrack = {
  id: 'web-default-1',
  title: 'Sunflower (Spider-Man: Into the Spider-Verse)',
  artist: 'Post Malone & Swae Lee',
  genre: 'Pop / Hip-Hop',
  duration: 158,
  coverEmoji: '🌻',
  coverGradient: 'from-amber-400 via-rose-500 to-purple-600',
  mood: 'trending',
  bpm: 90,
  url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/21/df/b8/21dfb8ea-017e-c5ee-49a3-53e7dcfb276b/mzaf_7867375276378292850.plus.aac.p.m4a',
  artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/bf/25/61/bf256193-c40d-d48e-f1b2-1135b1d55e09/18UMGIM70020.rgb.jpg/400x400bb.jpg',
  synthTheme: 'lofi',
  source: 'itunes',
};

export const MusicLoungeModal: React.FC<MusicLoungeModalProps> = ({
  isOpen,
  onClose,
  syncMusicState,
  onUpdateSyncState,
  currentUserName,
  partnerName,
  isPartnerOnline,
  spaceType = 'couple',
  onOpenWatchTogether,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'trending' | 'custom'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(() => musicEngine.getVolume());
  const [isMuted, setIsMuted] = useState(() => musicEngine.getVolume() === 0);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customTitleInput, setCustomTitleInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  const currentlyPlayingTrack = syncMusicState.customTrack || DEFAULT_WEB_TRACK;

  // Keep audio engine synchronized with syncMusicState (track, play/pause, seek)
  // NOTE: Device volume remains 100% individual and local to each user's phone/computer
  useEffect(() => {
    if (syncMusicState.isPlaying) {
      const engineTrack = musicEngine.getCurrentTrack();
      const targetTrack = syncMusicState.customTrack || DEFAULT_WEB_TRACK;
      if (!engineTrack || engineTrack.id !== targetTrack.id) {
        musicEngine.play(targetTrack, syncMusicState.currentTime);
      } else if (!musicEngine.getIsPlaying()) {
        musicEngine.play(targetTrack, syncMusicState.currentTime);
      }
    } else {
      if (musicEngine.getIsPlaying()) {
        musicEngine.pause();
      }
    }
  }, [syncMusicState.isPlaying, syncMusicState.trackId, syncMusicState.customTrack]);

  // Public Music API Search (dual: server proxy + direct web API fallback)
  const searchPublicMusicApi = async (queryText: string): Promise<MusicTrack[]> => {
    const q = queryText.trim() || 'trending hits';

    // 1. Try server proxy
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          return data.tracks;
        }
      }
    } catch (e) {
      console.warn('Server music search proxy failed, attempting direct web API:', e);
    }

    // 2. Direct public web iTunes API fallback
    try {
      const directUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=30`;
      const fallbackRes = await fetch(directUrl);
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        if (data.results && data.results.length > 0) {
          return data.results
            .filter((item: any) => item.previewUrl && item.trackName)
            .map((item: any) => ({
              id: `real-${item.trackId}`,
              title: item.trackName,
              artist: item.artistName,
              genre: item.primaryGenreName || 'Popular Music',
              duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
              coverEmoji: '🎵',
              coverGradient: 'from-purple-600 via-pink-600 to-rose-500',
              mood: 'trending' as const,
              bpm: 110,
              url: item.previewUrl,
              artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : undefined,
              synthTheme: 'lofi',
              source: 'itunes' as const,
            }));
        }
      }
    } catch (err) {
      console.error('Direct public web music search failed:', err);
    }

    return [];
  };

  // Direct Web Music Search function
  const handleSearchMusic = async (queryText: string) => {
    const q = queryText.trim() || 'popular hits';
    try {
      setIsSearching(true);
      const tracks = await searchPublicMusicApi(q);
      setSearchResults(tracks);
    } catch (err) {
      console.error('Search music failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Load Initial Web Music & Trending Chart on open
  useEffect(() => {
    if (!isOpen) return;
    fetchTrendingMusic();
    if (searchResults.length === 0) {
      handleSearchMusic('top hits');
    }
  }, [isOpen]);

  const fetchTrendingMusic = async () => {
    try {
      setIsLoadingTrending(true);
      // 1. Try server proxy
      const res = await fetch('/api/music/trending');
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          setTrendingTracks(data.tracks);
          return;
        }
      }
    } catch (e) {
      console.warn('Server trending proxy error, trying direct public feed:', e);
    }

    // 2. Direct public web RSS feed
    try {
      const topUrl = 'https://itunes.apple.com/us/rss/topsongs/limit=25/json';
      const response = await fetch(topUrl);
      if (response.ok) {
        const data = await response.json();
        const entries = data.feed?.entry || [];
        const tracks: MusicTrack[] = entries
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
              mood: 'trending' as const,
              bpm: 120,
              url: previewUrl,
              artworkUrl: artwork ? artwork.replace('170x170bb', '400x400bb') : undefined,
              synthTheme: 'lofi',
              source: 'tubidy' as const,
            };
          })
          .filter(Boolean);

        if (tracks.length > 0) {
          setTrendingTracks(tracks);
        }
      }
    } catch (err) {
      console.error('Direct trending fetch failed:', err);
    } finally {
      setIsLoadingTrending(false);
    }
  };

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearchMusic(val);
    }, 450);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    handleSearchMusic(searchQuery);
  };

  // Update current time display
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(musicEngine.getCurrentTime());
    }, 400);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Audio Visualizer Canvas Loop
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = musicEngine.getAnalyser();
    const dataArray = new Uint8Array(32);

    const renderVisualizer = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (analyser && syncMusicState.isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        dataArray.fill(6);
      }

      const barWidth = (canvas.width / 24) - 2;
      for (let i = 0; i < 24; i++) {
        const val = dataArray[i % dataArray.length];
        const barHeight = Math.max(4, (val / 255) * canvas.height * 0.9);
        const x = i * (barWidth + 2);
        const y = canvas.height - barHeight;

        const grad = ctx.createLinearGradient(0, y, 0, canvas.height);
        grad.addColorStop(0, '#1ed760');
        grad.addColorStop(0.5, '#1DB954');
        grad.addColorStop(1, '#116e2e');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(renderVisualizer);
    };

    renderVisualizer();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, syncMusicState.isPlaying]);

  const handleSelectTrack = (track: MusicTrack) => {
    musicEngine.play(track, 0);
    onUpdateSyncState({
      trackId: track.id,
      isPlaying: true,
      customTrack: track,
      currentTime: 0,
      updatedAt: Date.now(),
      updatedBy: currentUserName,
    });
  };

  const handleTogglePlay = () => {
    const nextPlaying = !syncMusicState.isPlaying;
    if (nextPlaying) {
      musicEngine.play(currentlyPlayingTrack, currentTime);
    } else {
      musicEngine.pause();
    }

    onUpdateSyncState({
      isPlaying: nextPlaying,
      customTrack: currentlyPlayingTrack,
      currentTime: musicEngine.getCurrentTime(),
      updatedAt: Date.now(),
      updatedBy: currentUserName,
    });
  };

  const currentTrackList =
    activeTab === 'trending'
      ? trendingTracks
      : searchResults.length > 0
      ? searchResults
      : trendingTracks;

  const handleNextTrack = () => {
    if (currentTrackList.length > 0) {
      const currentIndex = currentTrackList.findIndex((t) => t.id === currentlyPlayingTrack.id);
      const nextIndex = (currentIndex + 1) % currentTrackList.length;
      handleSelectTrack(currentTrackList[nextIndex]);
    }
  };

  const handlePrevTrack = () => {
    if (currentTrackList.length > 0) {
      const currentIndex = currentTrackList.findIndex((t) => t.id === currentlyPlayingTrack.id);
      const prevIndex = (currentIndex - 1 + currentTrackList.length) % currentTrackList.length;
      handleSelectTrack(currentTrackList[prevIndex]);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSeconds = parseFloat(e.target.value);
    setCurrentTime(newSeconds);
    musicEngine.seek(newSeconds);
    onUpdateSyncState({
      currentTime: newSeconds,
      updatedAt: Date.now(),
      updatedBy: currentUserName,
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const clamped = Math.max(0, Math.min(1, val));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    musicEngine.setVolume(clamped);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      const restored = volume > 0 ? volume : 0.75;
      setVolume(restored);
      setIsMuted(false);
      musicEngine.setVolume(restored);
    } else {
      setIsMuted(true);
      musicEngine.setVolume(0);
    }
  };

  // Alexa-style Voice Recognition Assistant for Music Lounge
  const handleVoicePlayMusic = async (query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    setActiveTab('search');
    try {
      const tracks = await searchPublicMusicApi(query);
      if (tracks.length > 0) {
        setSearchResults(tracks);
        handleSelectTrack(tracks[0]);
      }
    } catch (err) {
      console.warn('Voice play music error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const voiceAssistant = useHavenVoiceAssistant({
    context: 'music',
    onPlayQuery: handleVoicePlayMusic,
    onPlayVideoQuery: (_query) => {
      if (onOpenWatchTogether) {
        onClose();
        onOpenWatchTogether();
      }
    },
    onPause: () => {
      if (syncMusicState.isPlaying) handleTogglePlay();
    },
    onResume: () => {
      if (!syncMusicState.isPlaying) handleTogglePlay();
    },
    onNext: handleNextTrack,
    onPrevious: handlePrevTrack,
    onVolumeUp: () => {
      const nextV = Math.min(1, Math.round((musicEngine.getVolume() + 0.15) * 100) / 100);
      setVolume(nextV);
      setIsMuted(false);
      musicEngine.setVolume(nextV);
    },
    onVolumeDown: () => {
      const nextV = Math.max(0, Math.round((musicEngine.getVolume() - 0.15) * 100) / 100);
      setVolume(nextV);
      musicEngine.setVolume(nextV);
    },
    onMute: () => {
      setIsMuted(true);
      musicEngine.setVolume(0);
    },
    onUnmute: () => {
      setIsMuted(false);
      musicEngine.setVolume(volume || 0.75);
    },
  });

  const handlePlayCustomStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;

    const customTrack: MusicTrack = {
      id: `custom-${Date.now()}`,
      title: customTitleInput.trim() || 'Custom Audio Stream',
      artist: currentUserName,
      genre: 'Live Web Stream',
      duration: 3600,
      coverEmoji: '📻',
      coverGradient: 'from-fuchsia-600 to-pink-600',
      mood: 'trending',
      bpm: 110,
      url: customUrlInput.trim(),
      synthTheme: 'lofi',
    };

    handleSelectTrack(customTrack);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAudio(true);
      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch('/api/music/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.track) {
          handleSelectTrack(data.track);
        }
      }
    } catch (err) {
      console.error('Failed to upload audio:', err);
    } finally {
      setUploadingAudio(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0f2d18]/70 via-[#121212] to-[#0a0a0a] text-white rounded-none sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border-0 sm:border border-white/10 overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[92vh]">
        {/* Ambient Spotify Mesh Lighting Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-gradient-to-b from-[#1DB954]/30 via-[#1DB954]/10 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/2 -right-24 w-[300px] h-[300px] bg-[#1DB954]/10 blur-3xl pointer-events-none rounded-full" />

        {/* Header */}
        <div className="px-3 sm:px-5 py-3 sm:py-3.5 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10 text-white flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-music-mobile-back"
              className="p-1.5 -ml-1 text-white hover:bg-white/10 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat (Music keeps playing)"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            {/* Spotify Green Icon */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1DB954] shadow-lg shadow-[#1DB954]/30 flex items-center justify-center shrink-0 text-black">
              <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black flex items-center gap-1.5 sm:gap-2 truncate tracking-tight text-white">
                <span>Spotify Lounge</span>
                <span className="hidden xs:inline-block text-[10px] font-bold uppercase tracking-wider bg-[#1DB954]/20 text-[#1ed760] border border-[#1DB954]/40 px-2 py-0.5 rounded-full shrink-0">
                  Spotify Style 🟢
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 truncate">
                <Users className="w-3 h-3 text-[#1DB954] shrink-0" />
                <span className="truncate">
                  Listening with <strong className="text-zinc-200">{partnerName || 'Partner'}</strong>
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-ping ml-1 shrink-0" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              context="music"
              variant="pill"
            />

            <button
              onClick={onClose}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all border border-white/10"
              title="Close modal and continue listening in background while chatting"
            >
              <span>Minimize</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Close modal (Music plays in background)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shared DJ Parity Control Banner */}
        <div className="px-4 py-2 bg-[#181818] border-b border-white/5 flex items-center justify-between text-xs text-zinc-300 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse shrink-0" />
            <span className="font-bold text-white">Shared DJ Session:</span>
            <span className="text-zinc-400 truncate">
              Both you and <strong className="text-zinc-200">{partnerName || 'Partner'}</strong> have collaborative real-time playback control.
            </span>
          </div>
          {syncMusicState.updatedBy && (
            <span className="text-[10px] text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 font-semibold shrink-0 ml-2">
              Action: <strong>{syncMusicState.updatedBy === currentUserName ? 'You' : syncMusicState.updatedBy}</strong>
            </span>
          )}
        </div>

        {/* Hero Active Player Card */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-[#222222] via-[#181818] to-[#121212] border-b border-white/10 shrink-0 relative">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            {/* Spinning Vinyl / Album Art with Spotify Shadow */}
            <div className="relative shrink-0">
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl p-1 bg-gradient-to-br ${currentlyPlayingTrack.coverGradient} shadow-2xl shadow-black/90 flex items-center justify-center relative overflow-hidden ring-1 ring-white/10 ${
                  syncMusicState.isPlaying ? 'animate-pulse' : ''
                }`}
              >
                {currentlyPlayingTrack.artworkUrl ? (
                  <img
                    src={currentlyPlayingTrack.artworkUrl}
                    alt={currentlyPlayingTrack.title}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-zinc-900 flex flex-col items-center justify-center text-2xl">
                    <span>{currentlyPlayingTrack.coverEmoji}</span>
                    <Disc className="w-6 h-6 text-zinc-600 mt-1" />
                  </div>
                )}
              </div>

              {/* Live Synced Badge */}
              {syncMusicState.isPlaying && (
                <span className="absolute -top-1.5 -right-1.5 px-2.5 py-0.5 rounded-full bg-[#1DB954] text-black text-[10px] font-black shadow-lg uppercase tracking-wider">
                  PLAYING 🎵
                </span>
              )}
            </div>

            {/* Track Info & Visualizer */}
            <div className="flex-1 min-w-0 text-center sm:text-left w-full">
              <div className="flex items-center justify-center sm:justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1ed760] bg-[#1DB954]/15 border border-[#1DB954]/30 px-2.5 py-0.5 rounded-full">
                  {currentlyPlayingTrack.genre}
                </span>
                <span className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#1DB954]" />
                  <span>Web Audio Stream</span>
                </span>
              </div>

              <h3 className="text-base sm:text-xl font-black text-white truncate tracking-tight">
                {currentlyPlayingTrack.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium truncate mb-2">
                {currentlyPlayingTrack.artist}
              </p>

              {/* Spotify Green Waveform Canvas */}
              <div className="h-8 w-full bg-black/60 rounded-xl px-2 py-1 flex items-center justify-center overflow-hidden mb-2.5 border border-white/5">
                <canvas ref={canvasRef} width={280} height={32} className="w-full h-full" />
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={currentlyPlayingTrack.duration}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-[#1DB954] cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono font-medium px-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(currentlyPlayingTrack.duration)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Master Controls Row */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-4">
            {/* Volume Control (Individual to your device) */}
            <div className="flex items-center gap-2 w-32 sm:w-40">
              <button
                onClick={handleToggleMute}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-[#1DB954]" />}
              </button>
              <input
                id="slider-music-volume"
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-[#1DB954] cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                title="Your device audio volume"
              />
              <span className="text-[10px] text-zinc-400 font-mono w-7 text-right select-none shrink-0">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            {/* Transport Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevTrack}
                className="p-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-transform active:scale-90 cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                id="btn-music-play-pause"
                onClick={handleTogglePlay}
                className="w-12 h-12 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-lg shadow-[#1DB954]/35 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title={syncMusicState.isPlaying ? 'Pause' : 'Play Synchronized'}
              >
                {syncMusicState.isPlaying ? (
                  <Pause className="w-6 h-6 fill-black" />
                ) : (
                  <Play className="w-6 h-6 fill-black ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNextTrack}
                className="p-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-transform active:scale-90 cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Synced Indicator */}
            <div className="text-right hidden sm:block">
              <span className="text-[11px] font-semibold text-[#1ed760] flex items-center justify-end gap-1">
                <Radio className="w-3.5 h-3.5 text-[#1DB954] animate-pulse" />
                Synced Live
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Spotify Web API</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Spotify Pill Style) */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10 bg-[#121212] shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Direct Web Music Search */}
            <button
              onClick={() => setActiveTab('search')}
              className={`py-1.5 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'search'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#242424] text-zinc-300 hover:text-white hover:bg-[#2e2e2e]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Music</span>
            </button>

            {/* Top Trending Web Hits */}
            <button
              onClick={() => setActiveTab('trending')}
              className={`py-1.5 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'trending'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#242424] text-zinc-300 hover:text-white hover:bg-[#2e2e2e]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Top Hits 🔥</span>
            </button>

            {/* Custom Web Stream / Audio */}
            <button
              onClick={() => setActiveTab('custom')}
              className={`py-1.5 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'custom'
                  ? 'bg-white text-black shadow-md'
                  : 'bg-[#242424] text-zinc-300 hover:text-white hover:bg-[#2e2e2e]'
              }`}
            >
              <Link className="w-3.5 h-3.5 text-zinc-400" />
              <span>Custom / MP3 📻</span>
            </button>
          </div>

          {/* Quick Switch to Watch Party / YouTube Cinema */}
          {onOpenWatchTogether && (
            <button
              type="button"
              id="btn-music-switch-watch-together"
              onClick={() => {
                onClose();
                onOpenWatchTogether();
              }}
              className="text-xs font-bold text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ml-auto whitespace-nowrap"
              title={spaceType === 'friends' ? 'Switch to Squad Watch Party & YouTube Search' : 'Switch to Watch Together & YouTube Search'}
            >
              <Tv className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>{spaceType === 'friends' ? '🍿 Squad YouTube' : '🍿 YouTube Cinema'}</span>
            </button>
          )}
        </div>

        {/* TAB 1: DIRECT WEB MUSIC SEARCH */}
        {activeTab === 'search' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#121212]">
            {/* Alexa-style Voice Control Banner */}
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
              context="music"
              variant="banner"
            />

            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={onSearchInputChange}
                  placeholder="Search any artist, song, album, or genre..."
                  className="w-full pl-11 pr-10 py-2.5 text-xs sm:text-sm bg-[#242424] text-white placeholder:text-zinc-500 border border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1DB954] font-medium transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      handleSearchMusic('top hits');
                    }}
                    className="absolute right-3 top-2.5 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-[#1DB954]/20 shrink-0 flex items-center gap-1.5"
              >
                {isSearching ? (
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>Search</span>
              </button>
            </form>

            {/* Direct Web Query Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 shrink-0">Popular:</span>
              {[
                '🔥 Top Hits',
                'Taylor Swift',
                'Drake',
                'The Weeknd',
                'Afrobeats',
                'Burna Boy',
                'Billie Eilish',
                'Coldplay',
                'Ed Sheeran',
                'R&B Love',
                'Bruno Mars',
                'Lofi Chill',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const clean = tag.replace('🔥 ', '');
                    setSearchQuery(clean);
                    handleSearchMusic(clean);
                  }}
                  className="px-3 py-1 rounded-full bg-[#242424] hover:bg-[#2e2e2e] text-zinc-300 hover:text-white border border-white/5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-transform active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Search Results List */}
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
                  <span>Found {searchResults.length} tracks</span>
                  <span className="text-[#1ed760]">Tap song to play in sync</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {searchResults.map((track) => {
                    const isThisActive = currentlyPlayingTrack.id === track.id;
                    const isThisPlaying = isThisActive && syncMusicState.isPlaying;

                    return (
                      <div
                        key={track.id}
                        onClick={() => handleSelectTrack(track)}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                          isThisActive
                            ? 'border-[#1DB954]/60 bg-[#282828] shadow-lg shadow-black/40 ring-1 ring-[#1DB954]/40'
                            : 'border-white/5 hover:border-white/15 bg-[#181818] hover:bg-[#222222]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {track.artworkUrl ? (
                            <img
                              src={track.artworkUrl}
                              alt={track.title}
                              className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0 group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-zinc-800 text-[#1DB954] flex items-center justify-center text-xl shrink-0">
                              🎵
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className={`text-xs sm:text-sm font-bold truncate ${isThisActive ? 'text-[#1ed760]' : 'text-white'}`}>
                              {track.title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {track.artist}
                            </p>
                            <span className="text-[10px] text-[#1DB954] font-medium">
                              {track.genre}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            isThisPlaying
                              ? 'bg-[#1DB954] text-black animate-pulse'
                              : 'bg-white/10 text-white group-hover:bg-[#1DB954] group-hover:text-black shadow-sm'
                          }`}
                        >
                          {isThisPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : !isSearching ? (
              <div className="text-center py-12 text-zinc-400 space-y-2">
                <Music className="w-10 h-10 mx-auto text-zinc-600 mb-1" />
                <p className="text-sm font-bold text-white">No tracks found for "{searchQuery}"</p>
                <p className="text-xs text-zinc-400">Search for another artist name or song title from the web.</p>
                <button
                  type="button"
                  onClick={() => handleSearchMusic('top hits')}
                  className="mt-2 px-4 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-black shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  Load Top Global Hits
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-400">
                <div className="w-8 h-8 border-3 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#1ed760]">Searching web music catalog...</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TOP TRENDING WEB HITS */}
        {activeTab === 'trending' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#121212]">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
              <span className="flex items-center gap-1.5 text-zinc-200">
                <Flame className="w-4 h-4 text-amber-400" />
                Today's Top Global Songs
              </span>
              <span className="text-[#1ed760]">Updated in real-time</span>
            </div>

            {isLoadingTrending ? (
              <div className="text-center py-12 text-zinc-400">
                <div className="w-8 h-8 border-3 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#1ed760]">Fetching global trending charts...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {trendingTracks.map((track, idx) => {
                  const isThisActive = currentlyPlayingTrack.id === track.id;
                  const isThisPlaying = isThisActive && syncMusicState.isPlaying;

                  return (
                    <div
                      key={track.id}
                      onClick={() => handleSelectTrack(track)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                        isThisActive
                          ? 'border-[#1DB954]/60 bg-[#282828] shadow-lg shadow-black/40 ring-1 ring-[#1DB954]/40'
                          : 'border-white/5 hover:border-white/15 bg-[#181818] hover:bg-[#222222]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-center text-xs font-black text-zinc-500 group-hover:text-[#1ed760]">
                          {idx + 1}
                        </span>

                        {track.artworkUrl ? (
                          <img
                            src={track.artworkUrl}
                            alt={track.title}
                            className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-zinc-800 text-amber-400 flex items-center justify-center text-xl shrink-0">
                            🔥
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${isThisActive ? 'text-[#1ed760]' : 'text-white'}`}>
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {track.artist}
                          </p>
                          <span className="text-[10px] text-[#1DB954] font-medium">
                            {track.genre}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                          isThisPlaying
                            ? 'bg-[#1DB954] text-black animate-pulse'
                            : 'bg-white/10 text-white group-hover:bg-[#1DB954] group-hover:text-black shadow-sm'
                        }`}
                      >
                        {isThisPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CUSTOM AUDIO STREAM & UPLOAD MP3 */}
        {activeTab === 'custom' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-[#121212]">
            {/* Upload MP3 File */}
            <div className="p-4 rounded-2xl bg-[#181818] border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-[#1DB954]" />
                    Upload Local MP3 Audio
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Upload any full-length song to broadcast directly to your partner
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="music-upload-input"
                />
                <label
                  htmlFor="music-upload-input"
                  className={`px-3.5 py-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-black shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    uploadingAudio ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {uploadingAudio ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Choose MP3</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Direct Web Audio URL Form */}
            <form onSubmit={handlePlayCustomStream} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Audio Stream or Direct MP3 URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/audio.mp3 or web radio stream"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#242424] text-white placeholder:text-zinc-500 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Song or Radio Station Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cozy Midnight Lofi Radio"
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#242424] text-white placeholder:text-zinc-500 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black text-xs font-black shadow-lg shadow-[#1DB954]/25 transition-transform active:scale-98 cursor-pointer"
              >
                Broadcast & Play Together 🎵
              </button>
            </form>

            {/* Web Radio Presets */}
            <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 text-xs space-y-2">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#1DB954]" />
                Live Web Radio Presets
              </h4>
              <p className="text-[11px] text-zinc-400">
                Tap any radio station below to instantly stream in real-time together:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {[
                  { title: 'Lofi Chill Café', url: 'https://ice1.somafm.com/groovesalad-128-mp3' },
                  { title: 'Drone Zone Ambient', url: 'https://ice1.somafm.com/dronezone-128-mp3' },
                  { title: 'Secret Agent Jazz', url: 'https://ice1.somafm.com/secretagent-128-mp3' },
                  { title: 'PopTron Indie Dance', url: 'https://ice1.somafm.com/poptron-128-mp3' },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCustomUrlInput(preset.url);
                      setCustomTitleInput(preset.title);
                    }}
                    className="p-2.5 rounded-xl bg-[#242424] hover:bg-[#2e2e2e] border border-white/5 text-left text-xs font-semibold text-zinc-200 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <span className="group-hover:text-white">{preset.title}</span>
                    <span className="text-[10px] text-[#1DB954] font-bold">Load</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
