import { MediaItem, VidukiConfig, VidukiFailedEvent, VidukiWatchProgress } from '../types';

const STORAGE_KEY = 'haven_viduki_config';
const PROGRESS_STORAGE_KEY = 'haven_viduki_progress';

export const DEFAULT_VIDUKI_CONFIG: VidukiConfig = {
  apiKey: '',
  baseUrl: 'https://viduki.net/api',
  embedTemplate: 'https://www.viduki.net/{server}/movie/{id}?color={color}',
  enabled: true,
  preferredQuality: '1080p HD',
  defaultServer: 1,
  themeColor: 'f43f5e',
  autoFallbackOnFailure: true,
};

/**
 * Builds standard Viduki embed stream URL
 * Format:
 * Movie: https://www.viduki.net/{server}/movie/{tmdb_id or imdb_id}?color={hex}
 * TV Show: https://www.viduki.net/{server}/tv/{tmdb_id or imdb_id}/{season}/{episode}?color={hex}
 */
export function buildVidukiStreamUrl(params: {
  id: string; // TMDB ID or IMDb ID (e.g. "597" or "tt0120338")
  server?: 1 | 2 | 3 | 4 | number;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  color?: string;
}): string {
  const server = [1, 2, 3, 4].includes(Number(params.server)) ? Number(params.server) : 1;
  const cleanId = encodeURIComponent(String(params.id).trim());
  const cleanColor = (params.color || 'f43f5e').replace('#', '').trim() || 'f43f5e';

  if (params.mediaType === 'tv') {
    const s = Math.max(1, Number(params.season) || 1);
    const e = Math.max(1, Number(params.episode) || 1);
    return `https://www.viduki.net/${server}/tv/${cleanId}/${s}/${e}?color=${cleanColor}`;
  }

  return `https://www.viduki.net/${server}/movie/${cleanId}?color=${cleanColor}`;
}

/**
 * Switch an existing Viduki item to a different server (Server 1, 2, 3, or 4)
 */
export function switchVidukiServer(
  item: MediaItem,
  newServer: 1 | 2 | 3 | 4,
  themeColor: string = 'f43f5e'
): MediaItem {
  const id = item.tmdbId || item.imdbId || item.id.replace(/^viduki-(?:movie-|tv-|direct-)?/, '');
  const mediaType = item.mediaType === 'tv' ? 'tv' : 'movie';
  const newUrl = buildVidukiStreamUrl({
    id,
    server: newServer,
    mediaType,
    season: item.season || 1,
    episode: item.episode || 1,
    color: themeColor,
  });

  return {
    ...item,
    server: newServer,
    url: newUrl,
    embedUrl: newUrl,
    streamQuality: `Viduki Server ${newServer} • 1080p`,
  };
}

/**
 * Switch a TV item to a specific Season and Episode
 */
export function switchVidukiEpisode(
  item: MediaItem,
  season: number,
  episode: number,
  themeColor: string = 'f43f5e'
): MediaItem {
  const id = item.tmdbId || item.imdbId || item.id.replace(/^viduki-(?:movie-|tv-|direct-)?/, '');
  const server = (item.server && [1, 2, 3, 4].includes(item.server)) ? (item.server as 1 | 2 | 3 | 4) : 1;
  const newUrl = buildVidukiStreamUrl({
    id,
    server,
    mediaType: 'tv',
    season,
    episode,
    color: themeColor,
  });

  return {
    ...item,
    mediaType: 'tv',
    season,
    episode,
    title: `${item.title.replace(/\s*\(S\d+.*?\)/i, '')} (S${season}E${episode})`,
    url: newUrl,
    embedUrl: newUrl,
  };
}

/**
 * Curated, pre-seeded catalog of movies and TV shows ready for Viduki streaming
 */
export const FEATURED_VIDUKI_CATALOG: MediaItem[] = [
  {
    id: 'viduki-movie-533535',
    tmdbId: '533535',
    imdbId: 'tt6263850',
    title: 'Deadpool & Wolverine',
    mediaType: 'movie',
    artist: 'Shawn Levy • Ryan Reynolds, Hugh Jackman',
    year: '2024',
    genre: 'Action • Comedy • Marvel Sci-Fi',
    category: 'comedy',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/533535?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/533535?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/yDHYTjA3R0jFYba16jBB1jv8vpH.jpg',
    duration: 7620,
    durationStr: '2h 7m',
    rating: 'R • 98% Match',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'A listless Wade Wilson toils in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit up with an even more reluctant Wolverine.',
    tags: ['marvel', 'blockbuster', 'trending', 'action', 'comedy'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-912649',
    tmdbId: '912649',
    imdbId: 'tt16366836',
    title: 'Venom: The Last Dance',
    mediaType: 'movie',
    artist: 'Kelly Marcel • Tom Hardy, Chiwetel Ejiofor',
    year: '2024',
    genre: 'Action • Sci-Fi • Thriller',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/912649?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/912649?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/aosm8Vh9yuzIMZXhxT9TXQCEv9K.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/3V4kLQg0kSqPLctI5ziYWMEAZYF.jpg',
    duration: 6540,
    durationStr: '1h 49m',
    rating: 'PG-13 • New Release',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Eddie and Venom are on the run. Hunted by both of their worlds and with the net closing in, the duo are forced into a devastating decision that will bring the curtains down on their last dance.',
    tags: ['venom', 'marvel', 'trending', 'action'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-693134',
    tmdbId: '693134',
    imdbId: 'tt15239678',
    title: 'Dune: Part Two',
    mediaType: 'movie',
    artist: 'Denis Villeneuve • Timothée Chalamet, Zendaya',
    year: '2024',
    genre: 'Sci-Fi • Adventure • Epic',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/693134?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/693134?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s520b22.jpg',
    duration: 10020,
    durationStr: '2h 47m',
    rating: 'PG-13 • 8.6 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family, facing a choice between the love of his life and the fate of the known universe.',
    tags: ['epic', 'sci_fi', 'trending', 'masterpiece'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-1022789',
    tmdbId: '1022789',
    imdbId: 'tt22022452',
    title: 'Inside Out 2',
    mediaType: 'movie',
    artist: 'Kelsey Mann • Amy Poehler, Maya Hawke',
    year: '2024',
    genre: 'Animation • Comedy • Family',
    category: 'animation',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/1022789?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/1022789?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/xg270vgjbkHN9VeJJ73xQ604x30.jpg',
    duration: 5760,
    durationStr: '1h 36m',
    rating: 'PG • Global Hit',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Teenager Riley’s mind headquarters is undergoing a sudden demolition to make room for unexpected new Emotions: Anxiety, Envy, Ennui, and Embarrassment.',
    tags: ['disney', 'pixar', 'animation', 'family', 'trending'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-653346',
    tmdbId: '653346',
    imdbId: 'tt11384502',
    title: 'Kingdom of the Planet of the Apes',
    mediaType: 'movie',
    artist: 'Wes Ball • Owen Teague, Freya Allan',
    year: '2024',
    genre: 'Action • Sci-Fi • Adventure',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/653346?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/653346?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/gKkl37BQuKTanygYQG1pyYgLVgf.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/fqv8v6A9o517qP53G2w7qjCgyhM.jpg',
    duration: 8700,
    durationStr: '2h 25m',
    rating: 'PG-13 • Hit',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Several generations following Caesar’s reign, apes are now the dominant species living harmoniously while humans have been reduced to living in the shadows.',
    tags: ['apes', 'sci_fi', 'action', 'trending'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-823464',
    tmdbId: '823464',
    imdbId: 'tt14539740',
    title: 'Godzilla x Kong: The New Empire',
    mediaType: 'movie',
    artist: 'Adam Wingard • Rebecca Hall, Brian Tyree Henry',
    year: '2024',
    genre: 'Action • Sci-Fi • Monster Adventure',
    category: 'action',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/823464?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/823464?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/bQ2ywkch09upzgGFi0whzR7TslD.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/qrGtVF3YZvJp7q7dY77h6o1QfD.jpg',
    duration: 6900,
    durationStr: '1h 55m',
    rating: 'PG-13 • MonsterVerse',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'An all-new adventure pits the almighty Kong and the fearsome Godzilla against a colossal undiscovered threat hidden within our world, challenging their very existence.',
    tags: ['godzilla', 'kong', 'action', 'trending'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-1011985',
    tmdbId: '1011985',
    imdbId: 'tt21692408',
    title: 'Kung Fu Panda 4',
    mediaType: 'movie',
    artist: 'Mike Mitchell • Jack Black, Awkwafina',
    year: '2024',
    genre: 'Animation • Action • Comedy',
    category: 'animation',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/1011985?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/1011985?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/1XDDXPXGiI8id7MrUxK36ke7gkX.jpg',
    duration: 5640,
    durationStr: '1h 34m',
    rating: 'PG • Family Favorite',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Po is gearing up to become the spiritual leader of his Valley of Peace, but also needs someone to take his place as Dragon Warrior. Along the way, he encounters a wicked sorceress who can shape-shift.',
    tags: ['kung_fu_panda', 'animation', 'comedy', 'family'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-455476',
    tmdbId: '455476',
    imdbId: 'tt6528290',
    title: 'Knights of the Zodiac',
    mediaType: 'movie',
    artist: 'Tomasz Baginski • Mackenyu, Famke Janssen',
    year: '2023',
    genre: 'Fantasy • Action • Adventure',
    category: 'action',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/455476?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/455476?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/qW4bpFTuhss3JH97vLioDYq6zfd.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/eG0oOQxJge9stVQI3YIqNqWbsn0.jpg',
    duration: 6720,
    durationStr: '1h 52m',
    rating: 'PG-13 • Fantasy Action',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'When a headstrong street teen unwittingly taps into mystical powers, he discovers his destiny to protect a reincarnated goddess in this anime live-action epic.',
    tags: ['anime', 'action', 'fantasy'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-597',
    tmdbId: '597',
    imdbId: 'tt0120338',
    title: 'Titanic',
    mediaType: 'movie',
    artist: 'James Cameron • Leonardo DiCaprio, Kate Winslet',
    year: '1997',
    genre: 'Romance • Drama',
    category: 'romance',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/597?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/597?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/sCzcYW9h55WcesOqA12cgEr9Exw.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/sCzcYW9h55WcesOqA12cgEr9Exw.jpg',
    duration: 11690,
    durationStr: '3h 14m',
    rating: 'PG-13 • 98% Match',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'An aristocratic girl and a penniless artist fall in love aboard the luxurious, ill-fated R.M.S. Titanic.',
    tags: ['romance', 'classic', 'date_night', 'trending'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-1399',
    tmdbId: '1399',
    imdbId: 'tt0944947',
    title: 'Game of Thrones (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'David Benioff, D.B. Weiss • Emilia Clarke, Peter Dinklage',
    year: '2011',
    genre: 'Fantasy • Drama',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/1399/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/1399/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg',
    duration: 3696,
    durationStr: '1h 2m',
    rating: 'TV-MA • 8 Seasons',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.',
    tags: ['tv_series', 'fantasy', 'binge', 'squad'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-27205',
    tmdbId: '27205',
    imdbId: 'tt1375666',
    title: 'Inception',
    mediaType: 'movie',
    artist: 'Christopher Nolan • Leonardo DiCaprio, Joseph Gordon-Levitt',
    year: '2010',
    genre: 'Sci-Fi • Mind-Bending Action',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/27205?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/27205?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    duration: 8880,
    durationStr: '2h 28m',
    rating: 'PG-13 • 8.8 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    tags: ['mind_bending', 'sci_fi', 'thriller'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-157336',
    tmdbId: '157336',
    imdbId: 'tt0816692',
    title: 'Interstellar',
    mediaType: 'movie',
    artist: 'Christopher Nolan • Matthew McConaughey, Anne Hathaway',
    year: '2014',
    genre: 'Sci-Fi • Cosmic Romance & Adventure',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/157336?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/157336?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    duration: 10140,
    durationStr: '2h 49m',
    rating: 'PG-13 • 8.7 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft along with a team of researchers through a wormhole across space.",
    tags: ['space', 'cosmic', 'emotional', 'date_night'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-11036',
    tmdbId: '11036',
    imdbId: 'tt0332280',
    title: 'The Notebook',
    mediaType: 'movie',
    artist: 'Nick Cassavetes • Ryan Gosling, Rachel McAdams',
    year: '2004',
    genre: 'Romance • Drama',
    category: 'romance',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/11036?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/11036?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/qj8f2Rfxk5u7uOdfyV3LwVn19aF.jpg',
    duration: 7380,
    durationStr: '2h 3m',
    rating: 'PG-13 • Essential Romance',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'An elderly man reads to a woman with dementia the story of two young lovers whose romance is tested by social class differences.',
    tags: ['romance', 'couple_favorite', 'date_night'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-313369',
    tmdbId: '313369',
    imdbId: 'tt3783958',
    title: 'La La Land',
    mediaType: 'movie',
    artist: 'Damien Chazelle • Ryan Gosling, Emma Stone',
    year: '2016',
    genre: 'Romance • Musical Comedy',
    category: 'romance',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/313369?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/313369?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkVJt0Rf0.jpg',
    duration: 7680,
    durationStr: '2h 8m',
    rating: 'PG-13 • 6 Oscars',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.',
    tags: ['music', 'romance', 'cozy'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-66732',
    tmdbId: '66732',
    imdbId: 'tt4574334',
    title: 'Stranger Things (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'The Duffer Brothers • Millie Bobby Brown, Winona Ryder',
    year: '2016',
    genre: 'Sci-Fi • Horror Mystery',
    category: 'horror',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/66732/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/66732/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    duration: 2880,
    durationStr: '48m',
    rating: 'TV-14 • 4 Seasons',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    tags: ['retro', 'mystery', '80s', 'binge'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-569094',
    tmdbId: '569094',
    imdbId: 'tt9362722',
    title: 'Spider-Man: Across the Spider-Verse',
    mediaType: 'movie',
    artist: 'Joaquim Dos Santos • Shameik Moore, Hailee Steinfeld',
    year: '2023',
    genre: 'Animation • Superhero Action',
    category: 'animation',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/569094?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/569094?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    duration: 8400,
    durationStr: '2h 20m',
    rating: 'PG • 9.0 Rating',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
    tags: ['animation', 'superhero', 'visual_masterpiece'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-1396',
    tmdbId: '1396',
    imdbId: 'tt0903747',
    title: 'Breaking Bad (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Vince Gilligan • Bryan Cranston, Aaron Paul',
    year: '2008',
    genre: 'Crime • Thriller Drama',
    category: 'horror',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/1396/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/1396/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    duration: 3480,
    durationStr: '58m',
    rating: 'TV-MA • 9.5 IMDb',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student.",
    tags: ['crime', 'suspense', 'legendary'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-346698',
    tmdbId: '346698',
    imdbId: 'tt1517268',
    title: 'Barbie',
    mediaType: 'movie',
    artist: 'Greta Gerwig • Margot Robbie, Ryan Gosling',
    year: '2023',
    genre: 'Comedy • Adventure',
    category: 'comedy',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/346698?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/346698?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
    duration: 6840,
    durationStr: '1h 54m',
    rating: 'PG-13 • Blockbuster',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land until they get a chance to go to the real world.',
    tags: ['comedy', 'fun', 'colorful'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-872585',
    tmdbId: '872585',
    imdbId: 'tt15398776',
    title: 'Oppenheimer',
    mediaType: 'movie',
    artist: 'Christopher Nolan • Cillian Murphy, Emily Blunt',
    year: '2023',
    genre: 'Biography • Drama History',
    category: 'custom',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/872585?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/872585?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    duration: 10800,
    durationStr: '3h 0m',
    rating: 'R • 7 Oscars',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    tags: ['drama', 'epic', 'history'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-119051',
    tmdbId: '119051',
    imdbId: 'tt13443470',
    title: 'Wednesday (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Tim Burton • Jenna Ortega, Gwendoline Christie',
    year: '2022',
    genre: 'Comedy • Crime Fantasy',
    category: 'horror',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/119051/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/119051/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20vMyW9Up1vA.jpg',
    duration: 3120,
    durationStr: '52m',
    rating: 'TV-14 • Global Sensation',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Follows Wednesday Addams’ years as a student at Nevermore Academy, attempting to master her emerging psychic ability.',
    tags: ['gothic', 'mystery', 'teen'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-693134',
    tmdbId: '693134',
    imdbId: 'tt15239678',
    title: 'Dune: Part Two',
    mediaType: 'movie',
    artist: 'Denis Villeneuve • Timothée Chalamet, Zendaya',
    year: '2024',
    genre: 'Sci-Fi • Epic Adventure',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/693134?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/693134?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5200SV.jpg',
    duration: 9960,
    durationStr: '2h 46m',
    rating: 'PG-13 • 8.6 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    tags: ['sci_fi', 'epic', 'trending', 'desert'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-155',
    tmdbId: '155',
    imdbId: 'tt0468569',
    title: 'The Dark Knight',
    mediaType: 'movie',
    artist: 'Christopher Nolan • Christian Bale, Heath Ledger',
    year: '2008',
    genre: 'Action • Crime Drama',
    category: 'custom',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/155?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/155?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    duration: 9120,
    durationStr: '2h 32m',
    rating: 'PG-13 • 9.0 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest tests.',
    tags: ['superhero', 'crime', 'legendary'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-299534',
    tmdbId: '299534',
    imdbId: 'tt4154796',
    title: 'Avengers: Endgame',
    mediaType: 'movie',
    artist: 'Anthony Russo, Joe Russo • Robert Downey Jr., Chris Evans',
    year: '2019',
    genre: 'Action • Sci-Fi Adventure',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/299534?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/299534?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    duration: 10860,
    durationStr: '3h 1m',
    rating: 'PG-13 • All-Time Peak',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'After the devastating events of Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more.',
    tags: ['marvel', 'action', 'blockbuster'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-603',
    tmdbId: '603',
    imdbId: 'tt0133093',
    title: 'The Matrix',
    mediaType: 'movie',
    artist: 'Lana Wachowski, Lilly Wachowski • Keanu Reeves, Laurence Fishburne',
    year: '1999',
    genre: 'Sci-Fi • Cyberpunk Action',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/603?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/603?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    duration: 8160,
    durationStr: '2h 16m',
    rating: 'R • 8.7 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth: his reality is a simulation.',
    tags: ['sci_fi', 'matrix', 'classic'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-533535',
    tmdbId: '533535',
    imdbId: 'tt6263850',
    title: 'Deadpool & Wolverine',
    mediaType: 'movie',
    artist: 'Shawn Levy • Ryan Reynolds, Hugh Jackman',
    year: '2024',
    genre: 'Action • Superhero Comedy',
    category: 'comedy',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/533535?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/533535?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    duration: 7620,
    durationStr: '2h 7m',
    rating: 'R • 2024 Smash Hit',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary behind him, until the TVA recruits him.',
    tags: ['marvel', 'comedy', 'action', 'fun'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-1022789',
    tmdbId: '1022789',
    imdbId: 'tt22022452',
    title: 'Inside Out 2',
    mediaType: 'movie',
    artist: 'Kelsey Mann • Amy Poehler, Maya Hawke',
    year: '2024',
    genre: 'Animation • Family Comedy',
    category: 'animation',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/1022789?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/1022789?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    duration: 5760,
    durationStr: '1h 36m',
    rating: 'PG • Animation Hit',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Follow Riley, in her teenage years, encountering new emotions including Anxiety, Envy, Ennui, and Embarrassment.',
    tags: ['animation', 'pixar', 'heartwarming'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-278',
    tmdbId: '278',
    imdbId: 'tt0111161',
    title: 'The Shawshank Redemption',
    mediaType: 'movie',
    artist: 'Frank Darabont • Tim Robbins, Morgan Freeman',
    year: '1994',
    genre: 'Drama • Crime',
    category: 'custom',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/278?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/278?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
    duration: 8520,
    durationStr: '2h 22m',
    rating: 'R • #1 IMDb Rated (9.3)',
    source: 'viduki',
    badge: 'Viduki Masterpiece 🏆',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'A banker convicted of uxoricide forms a friendship over a quarter of a century with a hardened convict, maintaining his hope of freedom.',
    tags: ['masterpiece', 'classic', 'drama'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-680',
    tmdbId: '680',
    imdbId: 'tt0110912',
    title: 'Pulp Fiction',
    mediaType: 'movie',
    artist: 'Quentin Tarantino • John Travolta, Samuel L. Jackson, Uma Thurman',
    year: '1994',
    genre: 'Crime • Cult Classic',
    category: 'custom',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/680?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/680?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    duration: 9240,
    durationStr: '2h 34m',
    rating: 'R • 8.9 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
    tags: ['cult', 'tarantino', 'crime'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-550',
    tmdbId: '550',
    imdbId: 'tt0137523',
    title: 'Fight Club',
    mediaType: 'movie',
    artist: 'David Fincher • Brad Pitt, Edward Norton',
    year: '1999',
    genre: 'Drama • Psychological Thriller',
    category: 'custom',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/550?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/550?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    duration: 8340,
    durationStr: '2h 19m',
    rating: 'R • 8.8 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.',
    tags: ['thriller', 'cult', 'mind_bending'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-13',
    tmdbId: '13',
    imdbId: 'tt0109830',
    title: 'Forrest Gump',
    mediaType: 'movie',
    artist: 'Robert Zemeckis • Tom Hanks, Robin Wright',
    year: '1994',
    genre: 'Drama • Romance',
    category: 'romance',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/13?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/13?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/arw2VCBveWOVZr6pxd9XTd1TdQa.jpg',
    duration: 8520,
    durationStr: '2h 22m',
    rating: 'PG-13 • 6 Oscars',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man.',
    tags: ['romance', 'inspiring', 'heartwarming'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-94997',
    tmdbId: '94997',
    imdbId: 'tt11198330',
    title: 'House of the Dragon (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Ryan J. Condal • Matt Smith, Emma D\'Arcy',
    year: '2022',
    genre: 'Fantasy • Action Drama',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/94997/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/94997/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/1X4h40fcB4WWUmIBK0auT4zRBAV.jpg',
    duration: 3960,
    durationStr: '1h 6m',
    rating: 'TV-MA • Targaryen Dynasties',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'An internal succession war within House Targaryen at the height of its power, 172 years before Daenerys Targaryen.',
    tags: ['dragons', 'fantasy', 'binge'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-100088',
    tmdbId: '100088',
    imdbId: 'tt3581920',
    title: 'The Last of Us (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Craig Mazin, Neil Druckmann • Pedro Pascal, Bella Ramsey',
    year: '2023',
    genre: 'Drama • Sci-Fi Adventure',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/100088/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/100088/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrne.jpg',
    duration: 4860,
    durationStr: '1h 21m',
    rating: 'TV-MA • 8.8 IMDb',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity’s last hope.',
    tags: ['post_apocalyptic', 'survival', 'drama'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-205715',
    tmdbId: '205715',
    imdbId: 'tt2788316',
    title: 'Shōgun (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Rachel Kondo, Justin Marks • Hiroyuki Sanada, Cosmo Jarvis',
    year: '2024',
    genre: 'Drama • Historical Adventure',
    category: 'custom',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/205715/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/205715/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg',
    duration: 4200,
    durationStr: '1h 10m',
    rating: 'TV-MA • Record 18 Emmys',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'When a mysterious European ship is found marooned in a nearby fishing village, Lord Yoshii Toranaga discovers secrets that could tip the scales of power.',
    tags: ['japan', 'samurai', 'masterpiece', 'binge'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-209867',
    tmdbId: '209867',
    imdbId: 'tt12637874',
    title: 'Fallout (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Graham Wagner, Geneva Robertson-Dworet • Ella Purnell, Walton Goggins',
    year: '2024',
    genre: 'Sci-Fi • Action Adventure',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/209867/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/209867/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/AnsSKR9LuK0T9bAILJJniRIDqiK.jpg',
    duration: 4440,
    durationStr: '1h 14m',
    rating: 'TV-MA • 8.4 IMDb',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'In a future post-apocalyptic Los Angeles brought about by nuclear decimation, citizens must live in underground bunkers to protect themselves from radiation.',
    tags: ['gaming', 'wasteland', 'sci_fi'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-372058',
    tmdbId: '372058',
    imdbId: 'tt5311514',
    title: 'Your Name. (Kimi no Na wa)',
    mediaType: 'movie',
    artist: 'Makoto Shinkai • Ryunosuke Kamiki, Mone Kamishiraishi',
    year: '2016',
    genre: 'Animation • Romance Fantasy',
    category: 'romance',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/372058?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/372058?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6qFsxDo7qECU.jpg',
    duration: 6360,
    durationStr: '1h 46m',
    rating: 'PG • 8.4 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Two teenagers share a profound, magical connection upon discovering they are swapping bodies across time and distance.',
    tags: ['anime', 'romance', 'emotional', 'date_night'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-129',
    tmdbId: '129',
    imdbId: 'tt0245429',
    title: 'Spirited Away',
    mediaType: 'movie',
    artist: 'Hayao Miyazaki • Studio Ghibli',
    year: '2001',
    genre: 'Animation • Fantasy Adventure',
    category: 'animation',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/129?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/129?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/393mh1AJ0GYWVD7Desq9KkFaBqH.jpg',
    duration: 7500,
    durationStr: '2h 5m',
    rating: 'PG • Oscar Winner',
    source: 'viduki',
    badge: 'Viduki Masterpiece 🏆',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'During her family’s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches and spirits.',
    tags: ['ghibli', 'animation', 'magical'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-361743',
    tmdbId: '361743',
    imdbId: 'tt1745960',
    title: 'Top Gun: Maverick',
    mediaType: 'movie',
    artist: 'Joseph Kosinski • Tom Cruise, Miles Teller',
    year: '2022',
    genre: 'Action • Drama',
    category: 'custom',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/361743?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/361743?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
    duration: 7800,
    durationStr: '2h 10m',
    rating: 'PG-13 • 8.3 IMDb',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOP GUN’s elite graduates.',
    tags: ['aviation', 'action', 'blockbuster'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-4348',
    tmdbId: '4348',
    imdbId: 'tt0414387',
    title: 'Pride & Prejudice',
    mediaType: 'movie',
    artist: 'Joe Wright • Keira Knightley, Matthew Macfadyen',
    year: '2005',
    genre: 'Romance • Period Drama',
    category: 'romance',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/4348?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/4348?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/sGjI2Hi122V1bZh0257aqq1cGvL.jpg',
    duration: 7620,
    durationStr: '2h 7m',
    rating: 'PG • Beloved Romance',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Sparks fly when spirited Elizabeth Bennet meets single, rich, and proud Mr. Darcy. But Mr. Darcy reluctantly finds himself falling in love with a woman beneath his class.',
    tags: ['romance', 'classic', 'date_night'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-122906',
    tmdbId: '122906',
    imdbId: 'tt2194499',
    title: 'About Time',
    mediaType: 'movie',
    artist: 'Richard Curtis • Domhnall Gleeson, Rachel McAdams',
    year: '2013',
    genre: 'Romance • Sci-Fi Comedy',
    category: 'romance',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/122906?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/122906?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/iR1bVfURbNipcFLQAGpmUOpDRSe.jpg',
    duration: 7380,
    durationStr: '2h 3m',
    rating: 'R • Couple Favorite',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'At the age of 21, Tim discovers he can travel in time and change what happens and has happened in his own life. His decision to make his world a better place by getting a girlfriend turns out not to be that easy.',
    tags: ['romance', 'time_travel', 'date_night', 'emotional'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-movie-50646',
    tmdbId: '50646',
    imdbId: 'tt1570728',
    title: 'Crazy, Stupid, Love.',
    mediaType: 'movie',
    artist: 'Glenn Ficarra, John Requa • Steve Carell, Ryan Gosling, Emma Stone',
    year: '2011',
    genre: 'Comedy • Romance',
    category: 'romance',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/movie/50646?color=f43f5e',
    embedUrl: 'https://viduki.net/1/movie/50646?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/hYg56641XwKjF0i4k1zMsqFwFkM.jpg',
    duration: 7080,
    durationStr: '1h 58m',
    rating: 'PG-13 • Rom-Com Hit',
    source: 'viduki',
    badge: 'Viduki Cinema 🎬',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'A middle-aged husband’s life changes dramatically when his wife asks for a divorce. He seeks to rediscover his manhood with help from a newfound friend.',
    tags: ['comedy', 'romance', 'fun', 'date_night'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-94605',
    tmdbId: '94605',
    imdbId: 'tt11126994',
    title: 'Arcane (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Christian Linke, Alex Yee • Hailee Steinfeld, Ella Purnell',
    year: '2021',
    genre: 'Animation • Sci-Fi Action',
    category: 'animation',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/94605/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/94605/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn397FvFeNz9H.jpg',
    duration: 2580,
    durationStr: '43m',
    rating: 'TV-14 • 9.0 IMDb',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Set in utopian Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions-and the power that will tear them apart.',
    tags: ['animation', 'masterpiece', 'action'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-9140554',
    tmdbId: '84958',
    imdbId: 'tt9140554',
    title: 'Loki (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Michael Waldron • Tom Hiddleston, Owen Wilson',
    year: '2021',
    genre: 'Sci-Fi • Fantasy Adventure',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/84958/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/84958/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/voHUmlvjysvRnn9khE5L9jE4Pqj.jpg',
    duration: 3180,
    durationStr: '53m',
    rating: 'TV-14 • Marvel Multiverse',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'The mercurial villain Loki resumes his role as the God of Mischief in a new series that takes place after the events of Avengers: Endgame.',
    tags: ['marvel', 'multiverse', 'time_travel'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-10919420',
    tmdbId: '93405',
    imdbId: 'tt10919420',
    title: 'Squid Game (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Hwang Dong-hyuk • Lee Jung-jae, Park Hae-soo',
    year: '2021',
    genre: 'Mystery • Thriller Drama',
    category: 'custom',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/93405/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/93405/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/dDlG1TzM6a5U0b1q4C6o60k02A0.jpg',
    duration: 3600,
    durationStr: '1h 0m',
    rating: 'TV-MA • Global Phenomenon',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'Hundreds of cash-strapped players accept a strange invitation to compete in children’s games. Inside, a tempting prize awaits with deadly high stakes.',
    tags: ['thriller', 'survival', 'binge'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
  {
    id: 'viduki-tv-76479',
    tmdbId: '76479',
    imdbId: 'tt1190634',
    title: 'The Boys (S1E1)',
    mediaType: 'tv',
    season: 1,
    episode: 1,
    artist: 'Eric Kripke • Karl Urban, Jack Quaid, Antony Starr',
    year: '2019',
    genre: 'Action • Sci-Fi Satire',
    category: 'scifi',
    type: 'embed',
    server: 1,
    color: 'f43f5e',
    url: 'https://viduki.net/1/tv/76479/1/1?color=f43f5e',
    embedUrl: 'https://viduki.net/1/tv/76479/1/1?color=f43f5e',
    thumbnailUrl: 'https://image.tmdb.org/t/p/w500/2ZmAVncBsfsoRB69A64pQxW3qYx.jpg',
    duration: 3600,
    durationStr: '1h 0m',
    rating: 'TV-MA • 8.7 IMDb',
    source: 'viduki',
    badge: 'Viduki TV 📺',
    streamQuality: '1080p Ultra HD • Server 1',
    description: 'A group of vigilantes set out to take down corrupt superheroes who abuse their superpowers.',
    tags: ['superhero', 'satire', 'action'],
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  },
];

// Retrieve local & remote Viduki config
export async function getVidukiConfig(): Promise<VidukiConfig> {
  // 1. Check server saved config first
  try {
    const res = await fetch('/api/movies/viduki/config');
    if (res.ok) {
      const data = await res.json();
      if (data && data.configured) {
        return {
          apiKey: data.apiKey || '',
          baseUrl: data.baseUrl || DEFAULT_VIDUKI_CONFIG.baseUrl,
          embedTemplate: data.embedTemplate || DEFAULT_VIDUKI_CONFIG.embedTemplate,
          enabled: data.enabled ?? true,
          preferredQuality: data.preferredQuality || '1080p HD',
          defaultServer: (data.defaultServer && [1, 2, 3, 4].includes(data.defaultServer)) ? data.defaultServer : 1,
          themeColor: data.themeColor || 'f43f5e',
          autoFallbackOnFailure: data.autoFallbackOnFailure ?? true,
        };
      }
    }
  } catch (err) {
    console.warn('Could not fetch server Viduki config, checking local storage:', err);
  }

  // 2. Check localStorage fallback
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      return { ...DEFAULT_VIDUKI_CONFIG, ...parsed };
    }
  } catch {}

  return DEFAULT_VIDUKI_CONFIG;
}

// Save Viduki configuration to local storage and sync to server for partner
export async function saveVidukiConfig(config: Partial<VidukiConfig>): Promise<{ success: boolean; message?: string }> {
  try {
    const current = await getVidukiConfig();
    const updated: VidukiConfig = { ...current, ...config };

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    // Save to server
    const res = await fetch('/api/movies/viduki/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });

    if (res.ok) {
      return { success: true };
    }
    return { success: true, message: 'Saved locally, server sync partial.' };
  } catch (err: any) {
    console.error('Failed to save Viduki config:', err);
    return { success: false, message: err?.message || 'Failed to save configuration' };
  }
}

// Test connection to Viduki.net API
export async function testVidukiConnection(config: { apiKey: string; baseUrl?: string }): Promise<{
  success: boolean;
  message: string;
  count?: number;
}> {
  try {
    const res = await fetch('/api/movies/viduki/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: config.apiKey?.trim(),
        baseUrl: config.baseUrl?.trim(),
      }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Connection successful! Viduki API servers (1-4) are ready.',
        count: data.count,
      };
    } else {
      return {
        success: false,
        message: data.error || data.message || 'Connection test failed. Please check your API key.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error connecting to Viduki server.',
    };
  }
}

// Search movies from Viduki.net
export async function searchVidukiMovies(query: string, config?: VidukiConfig): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return fetchVidukiTrending(config);
  }

  // 1. Direct TMDB ID match (numeric, e.g. "597" or "1399")
  if (/^\d+$/.test(trimmed)) {
    const existing = FEATURED_VIDUKI_CATALOG.find((m) => m.tmdbId === trimmed);
    if (existing) return [existing];

    const isLikelyTv = Number(trimmed) === 1399 || Number(trimmed) === 66732 || Number(trimmed) === 1396 || Number(trimmed) === 119051 || Number(trimmed) === 94997 || Number(trimmed) === 100088;
    const mediaType = isLikelyTv ? 'tv' : 'movie';
    const server = config?.defaultServer || 1;
    const color = config?.themeColor || 'f43f5e';
    const streamUrl = buildVidukiStreamUrl({ id: trimmed, server, mediaType, season: 1, episode: 1, color });

    return [
      {
        id: `viduki-${mediaType}-${trimmed}`,
        tmdbId: trimmed,
        title: `Viduki Stream (TMDB #${trimmed})`,
        artist: 'Viduki Multi-Server Stream',
        mediaType,
        season: 1,
        episode: 1,
        server,
        color,
        type: 'embed',
        category: 'custom',
        url: streamUrl,
        embedUrl: streamUrl,
        thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
        badge: isLikelyTv ? 'Viduki TV 📺' : 'Viduki Cinema 🎬',
        source: 'viduki',
        streamQuality: `Server ${server} • 1080p Ultra HD`,
        description: `Direct TMDB stream #${trimmed} on Viduki Server ${server}.`,
        availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
        fallbackAvailable: true,
      },
    ];
  }

  // 2. Direct IMDb ID match (e.g. "tt0120338" or "tt1375666")
  if (/^tt\d+$/i.test(trimmed)) {
    const existing = FEATURED_VIDUKI_CATALOG.find(
      (m) => m.imdbId?.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return [existing];

    const server = config?.defaultServer || 1;
    const color = config?.themeColor || 'f43f5e';
    const streamUrl = buildVidukiStreamUrl({ id: trimmed, server, mediaType: 'movie', color });

    return [
      {
        id: `viduki-imdb-${trimmed}`,
        imdbId: trimmed,
        title: `Viduki Cinema (${trimmed})`,
        artist: 'Viduki Multi-Server Stream',
        mediaType: 'movie',
        server,
        color,
        type: 'embed',
        category: 'custom',
        url: streamUrl,
        embedUrl: streamUrl,
        thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
        badge: 'Viduki Cinema 🎬',
        source: 'viduki',
        streamQuality: `Server ${server} • 1080p Ultra HD`,
        description: `Direct IMDb movie stream ${trimmed} on Viduki Server ${server}.`,
        availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
        fallbackAvailable: true,
      },
    ];
  }

  // 3. Search curated local library first
  const queryLower = trimmed.toLowerCase();
  const isSeriesFilter =
    queryLower === 'series' ||
    queryLower === 'tv' ||
    queryLower === 'tv series' ||
    queryLower === 'show' ||
    queryLower === 'shows';

  const matchedCurated = FEATURED_VIDUKI_CATALOG.filter((m) => {
    if (isSeriesFilter) {
      return (
        m.mediaType === 'tv' ||
        (m as any).type === 'tv' ||
        m.tags?.includes('tv_series') ||
        Boolean(m.season) ||
        (m.rating && m.rating.toLowerCase().includes('season'))
      );
    }
    return (
      m.title.toLowerCase().includes(queryLower) ||
      m.genre?.toLowerCase().includes(queryLower) ||
      m.artist?.toLowerCase().includes(queryLower) ||
      m.tags?.some((t) => t.toLowerCase().includes(queryLower))
    );
  });

  // 4. Query server proxy (which queries IMDb Suggest API, Cinemeta, and configured Viduki API)
  try {
    const params = new URLSearchParams();
    params.set('q', trimmed);
    if (config?.apiKey) params.set('apiKey', config.apiKey.trim());
    if (config?.baseUrl) params.set('baseUrl', config.baseUrl.trim());

    const res = await fetch(`/api/movies/viduki/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.movies) && data.movies.length > 0) {
        // Merge without duplicates
        const combined = [...matchedCurated];
        for (const item of data.movies) {
          if (!combined.some((c) => (c.imdbId && c.imdbId === item.imdbId) || c.title.toLowerCase() === item.title.toLowerCase())) {
            combined.push(item);
          }
        }
        return combined;
      }
    }
  } catch (err) {
    console.warn('Error fetching movies from Viduki server route:', err);
  }

  // 5. Client-side fallback to IMDb Suggestion API if server route is unavailable
  try {
    const cleanQuery = queryLower.replace(/[^a-z0-9\s]/g, '').trim();
    if (cleanQuery.length >= 2) {
      const imdbRes = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(cleanQuery)}.json`);
      if (imdbRes.ok) {
        const imdbData = await imdbRes.json();
        const suggestions = Array.isArray(imdbData?.d) ? imdbData.d : [];
        const clientResults: MediaItem[] = [];
        const server = config?.defaultServer || 1;
        const color = config?.themeColor || 'f43f5e';

        for (const item of suggestions) {
          if (!item.id || !item.id.startsWith('tt') || !item.l) continue;
          const isTv = item.qid === 'tvSeries' || item.qid === 'tvMiniSeries';
          const playUrl = isTv
            ? `https://viduki.net/${server}/tv/${item.id}/1/1?color=${color}`
            : `https://viduki.net/${server}/movie/${item.id}?color=${color}`;

          clientResults.push({
            id: `viduki-${isTv ? 'tv' : 'movie'}-${item.id}`,
            title: item.l,
            mediaType: isTv ? 'tv' : 'movie',
            season: isTv ? 1 : undefined,
            episode: isTv ? 1 : undefined,
            artist: item.s ? `Starring: ${item.s}` : isTv ? 'Viduki TV' : 'Viduki Cinema',
            year: item.y ? String(item.y) : undefined,
            genre: isTv ? 'TV Series • Viduki' : 'Feature Film • Viduki',
            category: 'viduki',
            type: 'embed',
            url: playUrl,
            embedUrl: playUrl,
            thumbnailUrl: item.i?.imageUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
            duration: isTv ? 3600 : 7200,
            rating: '9.7/10',
            description: `Stream ${item.l} on Viduki Server ${server}.`,
            source: 'viduki',
            badge: isTv ? 'Viduki TV 📺' : 'Viduki Cinema 🎬',
            streamQuality: `Server ${server} • 1080p Ultra HD`,
            availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
            server,
            fallbackAvailable: true,
            imdbId: item.id,
          });
        }

        if (clientResults.length > 0) {
          const combined = [...matchedCurated];
          for (const c of clientResults) {
            if (!combined.some((m) => m.imdbId === c.imdbId || m.title.toLowerCase() === c.title.toLowerCase())) {
              combined.push(c);
            }
          }
          return combined;
        }
      }
    }
  } catch (clientErr) {
    console.warn('Client fallback search failed:', clientErr);
  }

  return matchedCurated;
}

// Fetch trending/popular releases from Viduki.net & Cinemeta
export async function fetchVidukiTrending(config?: VidukiConfig): Promise<MediaItem[]> {
  try {
    const params = new URLSearchParams();
    if (config?.apiKey) params.set('apiKey', config.apiKey.trim());
    if (config?.baseUrl) params.set('baseUrl', config.baseUrl.trim());

    const res = await fetch(`/api/movies/viduki/trending?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.movies) && data.movies.length > 0) {
        const combined = [...data.movies];
        // Merge featured items
        for (const item of FEATURED_VIDUKI_CATALOG) {
          if (!combined.some((c) => (c.imdbId && c.imdbId === item.imdbId) || c.title.toLowerCase() === item.title.toLowerCase())) {
            combined.push(item);
          }
        }
        return combined;
      }
    }
  } catch (err) {
    console.warn('Could not fetch Viduki trending:', err);
  }

  return FEATURED_VIDUKI_CATALOG;
}

// Parse Viduki.net URL directly (e.g. pasted into search or direct input)
export function parseVidukiUrl(input: string): MediaItem | null {
  const trimmed = input.trim();
  if (!trimmed.includes('viduki.net') && !trimmed.includes('viduki')) {
    return null;
  }

  // Examples:
  // https://viduki.net/1/movie/597?color=f43f5e
  // https://viduki.net/2/movie/tt0120338?color=f43f5e
  // https://viduki.net/3/tv/1399/1/1?color=f43f5e
  const serverMatch = trimmed.match(/viduki\.net\/([1-4])\//i);
  const server = serverMatch ? (Number(serverMatch[1]) as 1 | 2 | 3 | 4) : 1;

  const tvMatch = trimmed.match(/\/tv\/([a-zA-Z0-9_-]+)\/(\d+)\/(\d+)/i);
  const movieMatch = trimmed.match(/\/movie\/([a-zA-Z0-9_-]+)/i);

  const imdbMatch = trimmed.match(/imdb[=_/](tt\d+)/i);
  const tmdbMatch = trimmed.match(/tmdb[=_/](\d+)/i);

  let id = '597';
  let mediaType: 'movie' | 'tv' = 'movie';
  let season = 1;
  let episode = 1;

  if (tvMatch) {
    mediaType = 'tv';
    id = tvMatch[1];
    season = Number(tvMatch[2]) || 1;
    episode = Number(tvMatch[3]) || 1;
  } else if (movieMatch) {
    mediaType = 'movie';
    id = movieMatch[1];
  } else if (imdbMatch) {
    id = imdbMatch[1];
  } else if (tmdbMatch) {
    id = tmdbMatch[1];
  }

  const existing = FEATURED_VIDUKI_CATALOG.find(
    (m) => m.tmdbId === id || m.imdbId?.toLowerCase() === id.toLowerCase()
  );

  const title = existing
    ? existing.title
    : mediaType === 'tv'
    ? `Viduki Series S${season}E${episode} (${id})`
    : `Viduki Cinema (${id})`;

  return {
    id: `viduki-direct-${id}`,
    tmdbId: /^\d+$/.test(id) ? id : undefined,
    imdbId: /^tt\d+/i.test(id) ? id : undefined,
    title,
    artist: 'Viduki Multi-Server Cinema',
    mediaType,
    season,
    episode,
    server,
    type: 'embed',
    category: 'custom',
    url: trimmed,
    embedUrl: trimmed,
    source: 'viduki',
    badge: 'Viduki.net 🎬',
    streamQuality: `Viduki Server ${server} • 1080p`,
    rating: 'Viduki Stream',
    description: `Direct stream from Viduki.net: ${trimmed}`,
    thumbnailUrl: existing?.thumbnailUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
    availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
    fallbackAvailable: true,
  };
}

// Save watch progress locally
export function saveVidukiProgress(progress: VidukiWatchProgress): void {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    const map: Record<string, VidukiWatchProgress> = raw ? JSON.parse(raw) : {};
    map[progress.id] = {
      ...map[progress.id],
      ...progress,
      last_updated: Date.now(),
    };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not save Viduki progress:', err);
  }
}

// Get watch progress for a movie/tv show
export function getVidukiProgress(id: string): VidukiWatchProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const map: Record<string, VidukiWatchProgress> = JSON.parse(raw);
    return map[id] || null;
  } catch {
    return null;
  }
}

// Get all watch progress
export function getAllVidukiProgress(): Record<string, VidukiWatchProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
