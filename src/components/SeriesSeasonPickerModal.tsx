import React, { useState, useMemo } from 'react';
import {
  X,
  Play,
  Film,
  Layers,
  Sparkles,
  Server,
  Star,
  Clock,
  Check,
  ChevronRight,
  Tv,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
} from 'lucide-react';
import { MediaItem } from '../types';
import {
  getSeriesSeasons,
  cleanSeriesTitle,
  SeriesSeason,
  SeriesEpisode,
} from '../utils/seriesData';

interface SeriesSeasonPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: MediaItem | null;
  currentActiveMedia?: MediaItem | null;
  onSelectEpisode: (series: MediaItem, season: number, episode: number, server?: 1 | 2 | 3 | 4) => void;
  currentServer?: 1 | 2 | 3 | 4;
  onServerChange?: (server: 1 | 2 | 3 | 4) => void;
  isFriends?: boolean;
}

export const SeriesSeasonPickerModal: React.FC<SeriesSeasonPickerModalProps> = ({
  isOpen,
  onClose,
  series,
  currentActiveMedia,
  onSelectEpisode,
  currentServer = 1,
  onServerChange,
  isFriends = false,
}) => {
  if (!isOpen || !series) return null;

  const seasons: SeriesSeason[] = useMemo(() => {
    return getSeriesSeasons(series);
  }, [series]);

  // Determine initial selected season
  const initialSeason = useMemo(() => {
    if (
      currentActiveMedia &&
      (currentActiveMedia.id === series.id || currentActiveMedia.tmdbId === series.tmdbId) &&
      currentActiveMedia.season
    ) {
      return currentActiveMedia.season;
    }
    return series.season || (seasons[0]?.seasonNumber ?? 1);
  }, [currentActiveMedia, series, seasons]);

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(initialSeason);
  const [selectedServer, setSelectedServer] = useState<1 | 2 | 3 | 4>(
    (series.server as 1 | 2 | 3 | 4) || currentServer || 1
  );

  // Custom season/episode jump state
  const [customSeasonInput, setCustomSeasonInput] = useState<string>('');
  const [customEpisodeInput, setCustomEpisodeInput] = useState<string>('');

  const currentSeasonData = useMemo(() => {
    const found = seasons.find((s) => s.seasonNumber === selectedSeasonNumber);
    if (found) return found;

    // Fallback if season number was custom selected
    const fallbackEpisodes: SeriesEpisode[] = [];
    for (let i = 1; i <= 10; i++) {
      fallbackEpisodes.push({
        episodeNumber: i,
        seasonNumber: selectedSeasonNumber,
        title: `Episode ${i}`,
        duration: '48m',
        description: `Stream Season ${selectedSeasonNumber}, Episode ${i} of ${cleanSeriesTitle(series.title)} on Viduki.`,
      });
    }
    return {
      seasonNumber: selectedSeasonNumber,
      seasonTitle: `Season ${selectedSeasonNumber}`,
      episodeCount: 10,
      episodes: fallbackEpisodes,
    };
  }, [seasons, selectedSeasonNumber, series.title]);

  const pureTitle = cleanSeriesTitle(series.title);

  const handleEpisodeClick = (seasonNum: number, epNum: number) => {
    onSelectEpisode(series, seasonNum, epNum, selectedServer);
    onClose();
  };

  const handleCustomJump = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseInt(customSeasonInput, 10) || selectedSeasonNumber || 1;
    const ep = parseInt(customEpisodeInput, 10) || 1;
    onSelectEpisode(series, Math.max(1, s), Math.max(1, ep), selectedServer);
    onClose();
  };

  const handleServerSelect = (srv: 1 | 2 | 3 | 4) => {
    setSelectedServer(srv);
    if (onServerChange) {
      onServerChange(srv);
    }
  };

  return (
    <div
      id="modal-series-seasons-picker"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none"
    >
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[94vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* =========================================================================
            SERIES HERO HEADER
        ========================================================================= */}
        <div className="relative bg-slate-950 border-b border-slate-800 shrink-0 overflow-hidden">
          {/* Background backdrop banner image with gradient overlay */}
          {series.backdropUrl && (
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
              <img
                src={series.backdropUrl}
                alt=""
                className="w-full h-full object-cover blur-xs scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />
            </div>
          )}

          <div className="relative p-4 sm:p-6 flex items-start justify-between gap-4 z-10">
            <div className="flex items-start gap-4 min-w-0">
              {/* Poster Thumbnail */}
              <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl overflow-hidden shadow-2xl border border-rose-500/30 shrink-0 bg-slate-900">
                <img
                  src={series.thumbnailUrl || series.backdropUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500'}
                  alt={pureTitle}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[9px] shadow">
                  TV
                </span>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold tracking-wide flex items-center gap-1 uppercase">
                    <Tv className="w-3 h-3 text-rose-400" />
                    <span>TV Series</span>
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'} Available
                  </span>
                  {series.rating && (
                    <span className="px-2 py-0.5 rounded bg-black/60 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      {series.rating}
                    </span>
                  )}
                  {series.year && (
                    <span className="text-xs font-mono text-slate-400">{series.year}</span>
                  )}
                </div>

                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                  {pureTitle}
                </h2>

                <p className="text-xs text-slate-300 font-medium line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl">
                  {series.description || 'Choose any season and episode below to begin synchronized watch party playback.'}
                </p>

                {/* Viduki Server Switcher directly in series header */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider flex items-center gap-1">
                    <Server className="w-3 h-3 text-rose-400" />
                    <span>Server:</span>
                  </span>
                  {[1, 2, 3, 4].map((srv) => (
                    <button
                      key={srv}
                      type="button"
                      onClick={() => handleServerSelect(srv as 1 | 2 | 3 | 4)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                        selectedServer === srv
                          ? 'bg-rose-600 text-white ring-1 ring-rose-400 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      Server {srv}
                    </button>
                  ))}
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    • Auto-Failover Protection
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              id="btn-close-series-picker"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition cursor-pointer shrink-0"
              title="Close Seasons & Episodes"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* =========================================================================
              SEASONS SELECTOR TABS
          ========================================================================= */}
          <div className="px-4 sm:px-6 py-2 bg-slate-950/80 border-t border-slate-900 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-rose-400" />
                <span>Seasons:</span>
              </span>

              {seasons.map((season) => {
                const isSelected = selectedSeasonNumber === season.seasonNumber;
                return (
                  <button
                    key={season.seasonNumber}
                    type="button"
                    onClick={() => setSelectedSeasonNumber(season.seasonNumber)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/30 ring-1 ring-rose-400'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>Season {season.seasonNumber}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                        isSelected ? 'bg-black/30 text-rose-100' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {season.episodeCount} eps
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick jump to S1E1 instant play */}
            <button
              type="button"
              onClick={() => handleEpisodeClick(1, 1)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold whitespace-nowrap cursor-pointer transition shrink-0"
              title="Start from Season 1, Episode 1"
            >
              <Play className="w-3 h-3 fill-rose-400" />
              <span>Play from S1:E1</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            EPISODES LIST GRID
        ========================================================================= */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 bg-slate-900/90">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-rose-400" />
              <span>
                {currentSeasonData.seasonTitle || `Season ${selectedSeasonNumber}`}
              </span>
              <span className="text-xs font-normal text-slate-400">
                ({currentSeasonData.episodes.length} episodes)
              </span>
            </h3>

            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Click any episode to stream with partner / squad
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentSeasonData.episodes.map((ep) => {
              const isCurrentlyPlaying =
                currentActiveMedia &&
                (currentActiveMedia.id === series.id || currentActiveMedia.tmdbId === series.tmdbId) &&
                (currentActiveMedia.season || 1) === ep.seasonNumber &&
                (currentActiveMedia.episode || 1) === ep.episodeNumber;

              return (
                <div
                  key={`${ep.seasonNumber}-${ep.episodeNumber}`}
                  onClick={() => handleEpisodeClick(ep.seasonNumber, ep.episodeNumber)}
                  className={`group relative p-3 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 ${
                    isCurrentlyPlaying
                      ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/40 shadow-xl shadow-rose-500/20'
                      : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800/80 hover:border-rose-500/40 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Episode Number Badge Box */}
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border shadow-inner ${
                        isCurrentlyPlaying
                          ? 'bg-rose-600 border-rose-400 text-white font-black'
                          : 'bg-slate-900 group-hover:bg-rose-950/60 border-slate-800 group-hover:border-rose-500/40 text-slate-300 group-hover:text-rose-200'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-semibold tracking-wider opacity-80">
                        EP
                      </span>
                      <span className="text-base font-bold leading-none">
                        {ep.episodeNumber}
                      </span>
                    </div>

                    {/* Episode Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-300 transition-colors truncate">
                          {ep.title}
                        </h4>
                        {ep.duration && (
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            {ep.duration}
                          </span>
                        )}
                      </div>

                      {ep.description && (
                        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                          {ep.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Strip */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      S{ep.seasonNumber} • Ep {ep.episodeNumber}
                    </span>

                    {isCurrentlyPlaying ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Streaming Now</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEpisodeClick(ep.seasonNumber, ep.episodeNumber);
                        }}
                        className="px-3 py-1 rounded-xl bg-rose-600 group-hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/25 active:scale-95 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>{isFriends ? 'Stream with Squad' : 'Stream Episode'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* =========================================================================
              CUSTOM SEASON & EPISODE LAUNCHER (for long running shows or specific episodes)
          ========================================================================= */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>Jump to Any Custom Season & Episode</span>
              </span>
              <span className="text-[10px] text-slate-500">
                e.g. Season 3, Episode 12
              </span>
            </div>

            <form onSubmit={handleCustomJump} className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">Season:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={customSeasonInput}
                  onChange={(e) => setCustomSeasonInput(e.target.value)}
                  placeholder={String(selectedSeasonNumber)}
                  className="w-16 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-center focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">Episode:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customEpisodeInput}
                  onChange={(e) => setCustomEpisodeInput(e.target.value)}
                  placeholder="1"
                  className="w-16 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-center focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 hover:border-rose-500 transition flex items-center gap-1.5 cursor-pointer shadow-sm ml-auto"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Launch Episode</span>
              </button>
            </form>
          </div>
        </div>

        {/* =========================================================================
            MODAL FOOTER
        ========================================================================= */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-2 truncate">
            <span className="font-semibold text-rose-400">{pureTitle}</span>
            <span>•</span>
            <span>Playing via Viduki Server {selectedServer}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
