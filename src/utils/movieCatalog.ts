import { MediaItem } from '../types';

export const FEATURED_MOVIES: MediaItem[] = [
  // --- Romance & Date Night Cinema ---
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

  // --- Comedy & Banter ---
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

  // --- Animation & Open Cinema ---
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
    description: 'A shepherd girl and her loyal dog face ancient forest spirits to bring the warmth of spring in award-winning 4K animation.',
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

  // --- Sci-Fi & Thrillers ---
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
    description: 'George A. Romero\'s historic indie masterpiece that revolutionized modern horror cinema. Seven strangers shelter in an isolated farmhouse.',
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
    id: 'anim-spring-yt',
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

// Helper to extract YouTube ID from any YouTube URL
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Fetch online movies from backend API
export async function fetchOnlineMovies(category: string = 'all'): Promise<MediaItem[]> {
  try {
    const res = await fetch(`/api/movies/explore?category=${encodeURIComponent(category)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.movies) && data.movies.length > 0) {
        return data.movies;
      }
    }
  } catch (err) {
    console.warn('Could not fetch from /api/movies/explore, using fallback catalog:', err);
  }

  // Fallback to local catalog
  if (category === 'all' || category === 'trending') return FEATURED_MOVIES;
  const filtered = FEATURED_MOVIES.filter((m) => m.category === category);
  return filtered.length > 0 ? filtered : FEATURED_MOVIES;
}

// Directly fetch real video metadata from YouTube via server API or oEmbed
export async function fetchDirectYouTubeVideo(urlOrId: string): Promise<MediaItem | null> {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  try {
    const res = await fetch(`/api/youtube/fetch?url=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.video) {
        return data.video;
      }
    }
  } catch (err) {
    console.warn('Could not fetch from /api/youtube/fetch, trying client fallback:', err);
  }

  // Client-side fallback via noembed
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    let title = 'YouTube Video';
    let author = 'YouTube Channel';
    try {
      const oembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${ytId}`);
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        if (oembed.title) title = oembed.title;
        if (oembed.author_name) author = oembed.author_name;
      }
    } catch {}

    return {
      id: `yt-${ytId}-${Date.now()}`,
      title: title,
      artist: author,
      type: 'youtube',
      category: 'youtube',
      url: `https://www.youtube.com/watch?v=${ytId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      description: `Official YouTube video streamed directly: ${title} by ${author}.`,
      rating: 'YouTube Direct',
      badge: 'YouTube Direct 🔴',
    };
  }

  return null;
}

// Directly search YouTube for live videos
export async function searchYouTubeDirect(query: string): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.videos) && data.videos.length > 0) {
        return data.videos;
      }
    }
  } catch (err) {
    console.warn('Direct YouTube search API error:', err);
  }

  return [];
}

// Live search real online movies across Internet Archive & curated library
export async function searchOnlineMovies(query: string, category: string = 'all'): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return fetchOnlineMovies(category);
  }

  // If user specifically requests YouTube search, query YouTube endpoint directly
  if (category === 'youtube') {
    const ytResults = await searchYouTubeDirect(trimmed);
    if (ytResults.length > 0) return ytResults;
  }

  try {
    const res = await fetch(`/api/movies/search?q=${encodeURIComponent(trimmed)}&category=${encodeURIComponent(category)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.movies) && data.movies.length > 0) {
        return data.movies;
      }
    }
  } catch (err) {
    console.warn('Could not search /api/movies/search:', err);
  }

  // Fallback local matching
  const q = trimmed.toLowerCase();
  return FEATURED_MOVIES.filter((m) => {
    return (
      m.title.toLowerCase().includes(q) ||
      m.genre?.toLowerCase().includes(q) ||
      m.artist?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.tags?.some((t) => t.toLowerCase().includes(q)) ||
      m.category?.toLowerCase().includes(q)
    );
  });
}

// Surprise date night movie randomizer
export async function getSurpriseMovie(category: string = 'all'): Promise<MediaItem> {
  try {
    const res = await fetch(`/api/movies/surprise?category=${encodeURIComponent(category)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.movie && data.movie.id) {
        return data.movie;
      }
    }
  } catch (err) {
    console.warn('Could not fetch surprise movie from server:', err);
  }

  let pool = FEATURED_MOVIES;
  if (category !== 'all') {
    const filtered = FEATURED_MOVIES.filter((m) => m.category === category);
    if (filtered.length > 0) pool = filtered;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// Helper to parse and fetch metadata from arbitrary URLs or query
export async function searchOrFetchMovie(queryOrUrl: string): Promise<MediaItem[]> {
  const trimmed = queryOrUrl.trim();
  if (!trimmed) return FEATURED_MOVIES;

  const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') || /^[a-zA-Z0-9_-]{11}$/.test(trimmed);

  if (isUrl) {
    // Attempt direct YouTube metadata fetch first
    const directYt = await fetchDirectYouTubeVideo(trimmed);
    if (directYt) {
      return [directYt];
    }

    // Direct Video Link (.mp4, .webm, .ogg)
    const urlParts = trimmed.split('/');
    const lastPart = urlParts[urlParts.length - 1].split('?')[0];
    const cleanTitle = decodeURIComponent(lastPart).replace(/\.[^/.]+$/, '') || 'Custom Shared Movie';

    return [
      {
        id: `stream-${Date.now()}`,
        title: cleanTitle,
        artist: 'Direct Web Video',
        type: 'video',
        category: 'custom',
        url: trimmed,
        thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
        description: 'Direct streamable movie web link.',
        rating: 'Direct Stream',
        badge: 'Direct Link 🔗',
      },
    ];
  }

  // Live search online movies (includes direct YouTube results)
  return searchOnlineMovies(trimmed);
}

