import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
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
} from 'lucide-react';
import { MusicTrack, SyncMusicState } from '../types';
import { musicEngine } from '../utils/musicEngine';

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
  const [volume, setVolume] = useState(syncMusicState.volume ?? 0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customTitleInput, setCustomTitleInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  const currentlyPlayingTrack = syncMusicState.customTrack || DEFAULT_WEB_TRACK;

  // Keep audio engine synchronized with syncMusicState
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
        grad.addColorStop(0, '#ec4899');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#6366f1');

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
    setVolume(val);
    setIsMuted(val === 0);
    musicEngine.setVolume(val);
    onUpdateSyncState({ volume: val });
  };

  const handleToggleMute = () => {
    if (isMuted) {
      musicEngine.setVolume(volume || 0.7);
      setIsMuted(false);
    } else {
      musicEngine.setVolume(0);
      setIsMuted(true);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-700 via-pink-600 to-rose-500 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Music className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Live Web Music Lounge
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                  Direct Web Streaming 🌐
                </span>
              </h2>
              <p className="text-xs text-pink-100 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-pink-200" />
                <span>
                  Listening with <strong className="text-white">{partnerName || 'Partner'}</strong>
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-1" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              title="Close modal and continue listening in background while chatting"
            >
              <span>Minimize to Chat</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close modal (Music plays in background)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Active Player Card */}
        <div className="p-4 sm:p-6 bg-gradient-to-b from-purple-50/70 to-white border-b border-purple-100 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            {/* Spinning Vinyl Cover Art */}
            <div className="relative shrink-0">
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1.5 bg-gradient-to-br ${currentlyPlayingTrack.coverGradient} shadow-xl flex items-center justify-center relative overflow-hidden ${
                  syncMusicState.isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '8s' }}
              >
                {currentlyPlayingTrack.artworkUrl ? (
                  <img
                    src={currentlyPlayingTrack.artworkUrl}
                    alt={currentlyPlayingTrack.title}
                    className="w-full h-full rounded-full object-cover border-2 border-white/60 shadow-inner"
                  />
                ) : (
                  <>
                    <div className="absolute inset-1 rounded-full border border-white/20" />
                    <div className="absolute inset-3 rounded-full border border-white/25" />
                    <div className="absolute inset-6 rounded-full border border-white/30" />
                    <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-white/70 flex items-center justify-center text-xl shadow-inner z-10">
                      <span>{currentlyPlayingTrack.coverEmoji}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Live Synced Badge */}
              {syncMusicState.isPlaying && (
                <span className="absolute -top-1 -right-1 px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-md animate-pulse">
                  SYNCED 🎵
                </span>
              )}
            </div>

            {/* Track Info & Visualizer */}
            <div className="flex-1 min-w-0 text-center sm:text-left w-full">
              <div className="flex items-center justify-center sm:justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 bg-purple-100/80 px-2.5 py-0.5 rounded-full">
                  {currentlyPlayingTrack.genre}
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Globe className="w-3 h-3 text-emerald-500" />
                  <span>Real Web Audio Stream</span>
                </span>
              </div>

              <h3 className="text-base sm:text-xl font-black text-slate-900 truncate">
                {currentlyPlayingTrack.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium truncate mb-2">
                {currentlyPlayingTrack.artist}
              </p>

              {/* Waveform Canvas */}
              <div className="h-8 w-full bg-purple-100/40 rounded-xl px-2 py-1 flex items-center justify-center overflow-hidden mb-2.5 border border-purple-200/40">
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
                  className="w-full accent-purple-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(currentlyPlayingTrack.duration)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Master Controls Row */}
          <div className="mt-3.5 pt-3 border-t border-purple-100/60 flex items-center justify-between gap-4">
            {/* Volume Control */}
            <div className="flex items-center gap-2 w-28 sm:w-32">
              <button
                onClick={handleToggleMute}
                className="text-slate-500 hover:text-purple-600 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-purple-600 cursor-pointer h-1 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Transport Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevTrack}
                className="p-2 rounded-full hover:bg-purple-100 text-slate-700 transition-transform active:scale-90 cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                id="btn-music-play-pause"
                onClick={handleTogglePlay}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 transition-transform active:scale-95 cursor-pointer"
                title={syncMusicState.isPlaying ? 'Pause' : 'Play Synchronized'}
              >
                {syncMusicState.isPlaying ? (
                  <Pause className="w-6 h-6 fill-white" />
                ) : (
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNextTrack}
                className="p-2 rounded-full hover:bg-purple-100 text-slate-700 transition-transform active:scale-90 cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Synced Indicator */}
            <div className="text-right hidden sm:block">
              <span className="text-[11px] font-semibold text-purple-700 flex items-center justify-end gap-1">
                <Radio className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                Synced
              </span>
              <span className="text-[10px] text-slate-400">Direct Web API</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (100% Web Search & Direct Streaming) */}
        <div className="flex items-center justify-between px-5 pt-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Direct Web Music Search */}
            <button
              onClick={() => setActiveTab('search')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'search'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Search className="w-4 h-4 text-pink-500" />
              <span>Search Web Music 🔎</span>
            </button>

            {/* Top Trending Web Hits */}
            <button
              onClick={() => setActiveTab('trending')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'trending'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Top Web Hits 🔥</span>
            </button>

            {/* Custom Web Stream / Audio */}
            <button
              onClick={() => setActiveTab('custom')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'custom'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Link className="w-3.5 h-3.5 text-purple-500" />
              <span>Custom Stream / MP3 📻</span>
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
              className="pb-2 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ml-auto whitespace-nowrap"
              title={spaceType === 'friends' ? 'Switch to Squad Watch Party & YouTube Search' : 'Switch to Watch Together & YouTube Search'}
            >
              <Tv className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>{spaceType === 'friends' ? '🍿 Squad YouTube' : '🍿 YouTube Cinema'}</span>
            </button>
          )}
        </div>

        {/* TAB 1: DIRECT WEB MUSIC SEARCH */}
        {activeTab === 'search' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-purple-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={onSearchInputChange}
                  placeholder="Search any artist, song, album, or genre directly from the web..."
                  className="w-full pl-11 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      handleSearchMusic('top hits');
                    }}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold hover:opacity-95 transition-transform active:scale-95 cursor-pointer shadow-sm shrink-0 flex items-center gap-1.5"
              >
                {isSearching ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>
            </form>

            {/* Direct Web Query Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Popular:</span>
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
                  className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 font-semibold whitespace-nowrap cursor-pointer transition-transform active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Search Results List */}
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                  <span>Found {searchResults.length} web tracks</span>
                  <span className="text-purple-600">Tap any song to play together in sync</span>
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
                            ? 'border-purple-300 bg-purple-50/80 shadow-sm ring-1 ring-purple-400/40'
                            : 'border-slate-100 hover:border-purple-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {track.artworkUrl ? (
                            <img
                              src={track.artworkUrl}
                              alt={track.title}
                              className="w-12 h-12 rounded-xl object-cover shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center text-xl shrink-0">
                              🎵
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className={`text-xs sm:text-sm font-bold truncate ${isThisActive ? 'text-purple-700' : 'text-slate-800'}`}>
                              {track.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {track.artist}
                            </p>
                            <span className="text-[10px] text-purple-600 font-semibold">
                              {track.genre}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform shrink-0 ${
                            isThisPlaying
                              ? 'bg-purple-600 text-white animate-pulse'
                              : 'bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white'
                          }`}
                        >
                          {isThisPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : !isSearching ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Music className="w-10 h-10 mx-auto text-slate-300 mb-1" />
                <p className="text-sm font-bold text-slate-700">No tracks found for "{searchQuery}"</p>
                <p className="text-xs text-slate-400">Search for another artist name or song title from the web.</p>
                <button
                  type="button"
                  onClick={() => handleSearchMusic('top hits')}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs hover:bg-purple-700 cursor-pointer"
                >
                  Load Top Global Hits
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold text-purple-600">Searching web music catalog...</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TOP TRENDING WEB HITS */}
        {activeTab === 'trending' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span className="flex items-center gap-1 text-slate-600">
                <Flame className="w-4 h-4 text-amber-500" />
                Today's Top Global Songs
              </span>
              <span className="text-purple-600">Updated in real-time</span>
            </div>

            {isLoadingTrending ? (
              <div className="text-center py-12 text-slate-400">
                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold text-purple-600">Fetching global trending charts...</p>
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
                          ? 'border-purple-300 bg-purple-50/80 shadow-sm ring-1 ring-purple-400/40'
                          : 'border-slate-100 hover:border-purple-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-center text-xs font-black text-slate-400 group-hover:text-purple-600">
                          {idx + 1}
                        </span>

                        {track.artworkUrl ? (
                          <img
                            src={track.artworkUrl}
                            alt={track.title}
                            className="w-12 h-12 rounded-xl object-cover shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center text-xl shrink-0">
                            🔥
                          </div>
                        )}

                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${isThisActive ? 'text-purple-700' : 'text-slate-800'}`}>
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {track.artist}
                          </p>
                          <span className="text-[10px] text-purple-600 font-semibold">
                            {track.genre}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform shrink-0 ${
                          isThisPlaying
                            ? 'bg-purple-600 text-white animate-pulse'
                            : 'bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white'
                        }`}
                      >
                        {isThisPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
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
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Upload MP3 File */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/80">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-purple-600" />
                    Upload Local MP3 Audio
                  </h4>
                  <p className="text-[11px] text-slate-500">
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
                  className={`px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-sm hover:bg-purple-700 transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    uploadingAudio ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {uploadingAudio ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose MP3</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Direct Web Audio URL Form */}
            <form onSubmit={handlePlayCustomStream} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Audio Stream or Direct MP3 URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/audio.mp3 or web radio stream"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Song or Radio Station Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cozy Midnight Lofi Radio"
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-transform active:scale-98 cursor-pointer"
              >
                Broadcast & Play Together 🎵
              </button>
            </form>

            {/* Web Radio Presets */}
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200/60 text-xs text-purple-900 space-y-2">
              <h4 className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Live Web Radio Presets
              </h4>
              <p className="text-[11px] text-purple-700">
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
                    className="p-2 rounded-xl bg-white hover:bg-purple-100/50 border border-purple-200/80 text-left text-xs font-semibold text-purple-800 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>{preset.title}</span>
                    <span className="text-[10px] text-purple-500 font-bold">Load</span>
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
