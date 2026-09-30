import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tv,
  Radio,
  Heart,
  Sparkles,
  MessageCircle,
  Users,
  Flame,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  FastForward,
  Send,
  Compass,
  Search,
  Plus,
  Maximize2,
  Minimize2,
  ExternalLink,
  Dices,
  Film,
  Music,
  Check,
  Smile,
  RefreshCw,
  AlertCircle,
  Clock,
  Sparkle,
  Loader2,
} from 'lucide-react';
import { SingleProfile } from '../../types';
import { fetchDirectYouTubeVideo, searchYouTubeDirect } from '../../utils/movieCatalog';

interface CoViewingLoungeViewProps {
  socket: any;
  currentProfile: SingleProfile;
  singles: SingleProfile[];
  onWaveProfile: (profile: SingleProfile, type: 'wave' | 'crush' | 'spark' | 'invite') => void;
  onInspectProfile: (profile: SingleProfile) => void;
}

export type TheaterCategory = 'all' | 'cinema' | 'lofi' | 'walk' | 'nature' | 'animation' | 'comedy';

export interface MiniTheater {
  id: string;
  title: string;
  category: 'cinema' | 'lofi' | 'walk' | 'nature' | 'animation' | 'comedy';
  badge: string;
  type: 'youtube' | 'video';
  streamUrl: string;
  youtubeId?: string;
  thumbnail: string;
  description: string;
  qualityBadge: string;
  activeCount: number;
  tags: string[];
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('.') && !trimmed.includes('?')) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

const DEFAULT_THEATERS: MiniTheater[] = [
  // 1. Cozy Lo-Fi & Study Radio
  {
    id: 'theater-lofi-girl',
    title: 'Midnight Lofi & Chill Beats Radio',
    category: 'lofi',
    badge: 'Cozy Beats ☕',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    youtubeId: 'jfKfPfyJRdk',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    description: 'Soft romantic chillhop beats & gentle raindrops on windowpane, perfect for relaxed late night talks.',
    qualityBadge: '24/7 Live Radio',
    activeCount: 38,
    tags: ['Lofi', 'Chillhop', 'Study', 'Cozy', 'Rain', 'Beats'],
  },

  // 2. Romantic Paris Midnight Stroll
  {
    id: 'theater-paris-walk',
    title: 'Paris Midnight Stroll in 4K (Rain & Cafe Jazz)',
    category: 'walk',
    badge: 'Virtual Date 🥐',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    youtubeId: '4xDzrJKXOOY',
    thumbnail: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80',
    description: 'Walk together hand-in-hand through rain-washed cobblestone streets, glowing bistros, and the sparkling Eiffel Tower.',
    qualityBadge: '4K 60fps Ultra HD',
    activeCount: 26,
    tags: ['Paris', 'Virtual Date', 'Rain', 'Walking Tour', 'Jazz'],
  },

  // 3. Midnight Classic Cinema: Charade
  {
    id: 'theater-charade',
    title: 'Midnight Classic: Charade (Audrey Hepburn & Cary Grant)',
    category: 'cinema',
    badge: 'Classic Romance 🍿',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=kYQGz2bHlG8',
    youtubeId: 'kYQGz2bHlG8',
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
    description: 'Audrey Hepburn and Cary Grant sparkle in this witty romantic mystery in 1960s Paris with Henry Mancini score.',
    qualityBadge: '1080p Remastered',
    activeCount: 19,
    tags: ['Audrey Hepburn', 'Cary Grant', 'Romance', 'Mystery', 'Classic Cinema'],
  },

  // 4. Tokyo Night Cyberpunk Walk
  {
    id: 'theater-tokyo-night',
    title: 'Tokyo Neon Shinjuku Night Walk 4K',
    category: 'walk',
    badge: 'Tokyo Nights 🗼',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=gI0jD9XWn2E',
    youtubeId: 'gI0jD9XWn2E',
    thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
    description: 'Immersive binaural 4K stroll through glowing neon alleyways, izakayas, and mist-drenched Shinjuku skyscrapers.',
    qualityBadge: '4K Binaural Sound',
    activeCount: 22,
    tags: ['Tokyo', 'Neon', 'Japan', 'Night Walk', 'Cyberpunk'],
  },

  // 5. Classic Romantic Drama: The Last Time I Saw Paris
  {
    id: 'theater-last-time-paris',
    title: 'The Last Time I Saw Paris (Elizabeth Taylor)',
    category: 'cinema',
    badge: 'Golden Age 🌹',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=843e9o1yL5g',
    youtubeId: '843e9o1yL5g',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    description: 'Elizabeth Taylor and Van Johnson in F. Scott Fitzgerald\'s heart-stirring post-war romance in the City of Light.',
    qualityBadge: 'Technicolor HD',
    activeCount: 15,
    tags: ['Elizabeth Taylor', 'Paris', 'Vintage Romance', 'F. Scott Fitzgerald'],
  },

  // 6. Rainy Day Cafe & Jazz Radio
  {
    id: 'theater-cafe-jazz',
    title: 'Cozy Rain Cafe & Soft Piano Jazz',
    category: 'lofi',
    badge: 'Warm Cafe ☕',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=lTRiuFIWV54',
    youtubeId: 'lTRiuFIWV54',
    thumbnail: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
    description: 'Fresh espresso aroma, gentle acoustic piano harmonies, and rhythmic raindrops against foggy cafe windows.',
    qualityBadge: 'Warm Acoustics',
    activeCount: 29,
    tags: ['Jazz', 'Coffee', 'Rain', 'Piano', 'Relax'],
  },

  // 7. Cyberpunk Sci-Fi Cinema: Tears of Steel
  {
    id: 'theater-tears-of-steel',
    title: 'Tears of Steel: Cyberpunk Sci-Fi Cinema',
    category: 'cinema',
    badge: 'Sci-Fi Romance 🚀',
    type: 'video',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    description: 'Futuristic Amsterdam romance where former lovers reunite amid giant defense mechs and time-bending tech.',
    qualityBadge: 'Direct 1080p Cinema',
    activeCount: 17,
    tags: ['Sci-Fi', 'Cyberpunk', 'Mecha', 'Indie Cinema'],
  },

  // 8. Animation Classic: Big Buck Bunny
  {
    id: 'theater-big-buck-bunny',
    title: 'Big Buck Bunny: 4K Animated Masterpiece',
    category: 'animation',
    badge: 'Animated Fun 🐰',
    type: 'video',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    description: 'The beloved open-source cartoon about a peaceful giant rabbit defending the enchanted forest with ingenious traps.',
    qualityBadge: 'Direct 1080p 60fps',
    activeCount: 14,
    tags: ['Animation', 'Comedy', 'Family', 'Cartoon', 'Wholesome'],
  },

  // 9. Fantasy Epic: Sintel
  {
    id: 'theater-sintel',
    title: 'Sintel: Cinematic Fantasy Dragon Tale',
    category: 'animation',
    badge: 'Fantasy Adventure 🐉',
    type: 'video',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    description: 'A lonely warrior girl braves towering frozen peaks and dangerous desert ruins to rescue her baby dragon companion.',
    qualityBadge: 'Direct 1080p Cinema',
    activeCount: 16,
    tags: ['Fantasy', 'Dragon', 'Emotional', 'Animation'],
  },

  // 10. Cosmic Earth Views: NASA ISS Orbit
  {
    id: 'theater-nasa-earth',
    title: 'Earth from Orbit & Aurora Borealis (NASA 4K)',
    category: 'nature',
    badge: 'Cosmic Vibe 🌌',
    type: 'video',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    description: 'Breathtaking 4K aerial vistas of continents, glowing night city clusters, and emerald dancing auroras.',
    qualityBadge: '4K Scenic',
    activeCount: 31,
    tags: ['Space', 'NASA', 'Earth', 'Aurora', 'Peaceful'],
  },

  // 11. Campfire & Night Sky ASMR
  {
    id: 'theater-campfire',
    title: 'Campfire Beneath Galaxy Stars & Forest ASMR',
    category: 'nature',
    badge: 'Campfire ASMR 🔥',
    type: 'video',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=800&auto=format&fit=crop&q=80',
    description: 'Crackling cedar firewood flames, gentle forest winds, and the sparkling Milky Way stretching overhead.',
    qualityBadge: 'Deep Binaural Audio',
    activeCount: 25,
    tags: ['Campfire', 'ASMR', 'Night Sky', 'Stars', 'Relaxation'],
  },

  // 12. Feel-Good Stand-Up & Date Night Banter
  {
    id: 'theater-comedy-lounge',
    title: 'Laughs & Roadtrips: Comedy Special Clips',
    category: 'comedy',
    badge: 'Comedy Club 😂',
    type: 'video',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    description: 'Hilarious roadtrip banter, comic mishaps, and feel-good upbeat date moments to get conversations flowing.',
    qualityBadge: 'Fun High Energy',
    activeCount: 20,
    tags: ['Comedy', 'Laughs', 'Roadtrip', 'Fun', 'High Energy'],
  },

  // 13. Kyoto Bamboo Grove & Gentle Rain 4K
  {
    id: 'theater-kyoto-rain',
    title: 'Kyoto Arashiyama Bamboo Grove Walk 4K (Gentle Rain)',
    category: 'walk',
    badge: 'Kyoto Rain 🎋',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=xPz9mZc9wKk',
    youtubeId: 'xPz9mZc9wKk',
    thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=80',
    description: 'Peaceful 4K stroll under emerald bamboo stalks swaying in misty mountain rain with authentic binaural nature audio.',
    qualityBadge: '4K Binaural Sound',
    activeCount: 27,
    tags: ['Kyoto', 'Japan', 'Bamboo', 'Rain', 'Walking Tour', 'Peaceful'],
  },

  // 14. Retro Synthwave & Chill Drive
  {
    id: 'theater-synthwave-drive',
    title: 'Retro Synthwave & Neon Sunset Highway Radio',
    category: 'lofi',
    badge: 'Synthwave 🌆',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=MVPTGNGiI-4',
    youtubeId: 'MVPTGNGiI-4',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
    description: 'Nostalgic 80s analog synthesizers, retro-wave arpeggios, and purple sunset grid horizons for late night drives.',
    qualityBadge: '24/7 Neon Synth',
    activeCount: 34,
    tags: ['Synthwave', 'Retro', 'Chillwave', 'Night Drive', '80s'],
  },

  // 15. Spring: Enchanted Mountain Tale (Blender Studio 4K)
  {
    id: 'theater-spring-animation',
    title: 'Spring: Enchanted Ancient Mountain Spirit',
    category: 'animation',
    badge: 'Blender 4K 🌸',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=WhWc3b3KhnY',
    youtubeId: 'WhWc3b3KhnY',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    description: 'A shepherd girl and her faithful dog face ancient spirits to bring about the turning of the seasons in gorgeous 4K CGI.',
    qualityBadge: '4K CGI Open Movie',
    activeCount: 24,
    tags: ['Animation', 'Nature', 'Fantasy', 'Blender Studio', 'Poetic'],
  },

  // 16. Charge: Cyberpunk Mecha Heist
  {
    id: 'theater-charge-mecha',
    title: 'Charge: Cyberpunk Robot Action Thriller',
    category: 'animation',
    badge: 'Cyberpunk 4K ⚡',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=ux__mXKSVVC',
    youtubeId: 'ux__mXKSVVC',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    description: 'High-octane cyberpunk sci-fi action short featuring a battery-powered security droid in an intense subterranean battle.',
    qualityBadge: 'Direct 4K 60fps',
    activeCount: 18,
    tags: ['Animation', 'Cyberpunk', 'Mecha', 'Action', 'Sci-Fi'],
  },

  // 17. Agent 327: Operation Barbershop
  {
    id: 'theater-agent-327',
    title: 'Agent 327: Operation Barbershop (Secret Agent Comedy)',
    category: 'comedy',
    badge: 'Secret Agent 😂',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=mN0zPOpADL4',
    youtubeId: 'mN0zPOpADL4',
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
    description: 'Top secret agent investigates a suspicious barbershop with hilariously slick gadgetry and physical comedy choreography.',
    qualityBadge: '4K Cartoon Comedy',
    activeCount: 21,
    tags: ['Comedy', 'Spy', 'Animation', 'Cartoon', 'Action'],
  },

  // 18. His Girl Friday (Cary Grant & Rosalind Russell)
  {
    id: 'theater-his-girl-friday',
    title: 'His Girl Friday: Rapid-Fire Screwball Romance',
    category: 'cinema',
    badge: 'Classic Banter 📰',
    type: 'video',
    streamUrl: 'https://archive.org/download/his_girl_friday/his_girl_friday.mp4',
    thumbnail: 'https://archive.org/services/img/his_girl_friday',
    description: 'Cary Grant and Rosalind Russell deliver the fastest, sharpest romantic banter ever filmed in 1940s Chicago newspaper world.',
    qualityBadge: '1080p Restored',
    activeCount: 19,
    tags: ['Cary Grant', 'Romance', 'Comedy', 'Classic Cinema', 'Journalism'],
  },

  // 19. The General (Buster Keaton)
  {
    id: 'theater-the-general',
    title: 'The General: Buster Keaton Masterpiece',
    category: 'comedy',
    badge: 'Comedy Legend 🚂',
    type: 'video',
    streamUrl: 'https://archive.org/download/TheGeneral1926/TheGeneral1926_512kb.mp4',
    thumbnail: 'https://archive.org/services/img/TheGeneral1926',
    description: 'Widely voted one of the greatest comedies in cinematic history, packed with jaw-dropping practical train stunts and physical wit.',
    qualityBadge: 'Restored Classic',
    activeCount: 16,
    tags: ['Buster Keaton', 'Comedy', 'Trains', 'Stunts', 'Legendary'],
  },

  // 20. Royal Wedding (Fred Astaire)
  {
    id: 'theater-royal-wedding',
    title: 'Royal Wedding: Fred Astaire & Jane Powell',
    category: 'cinema',
    badge: 'Musical Romance 🎩',
    type: 'video',
    streamUrl: 'https://archive.org/download/RoyalWedding1951_512kb/RoyalWedding1951_512kb.mp4',
    thumbnail: 'https://archive.org/services/img/RoyalWedding1951',
    description: 'Fred Astaire\'s legendary dancing on the walls and ceiling, set during royal London festivities with sparkling romantic charm.',
    qualityBadge: 'Technicolor HD',
    activeCount: 14,
    tags: ['Fred Astaire', 'Musical', 'Dance', 'Romance', 'London'],
  },

  // 21. Swiss Alps Panoramic Glacier Express 4K
  {
    id: 'theater-swiss-alps',
    title: 'Swiss Alps Snow Peaks & Panoramic Train 4K',
    category: 'nature',
    badge: 'Alpine Vistas 🏔️',
    type: 'youtube',
    streamUrl: 'https://www.youtube.com/watch?v=e_04ZrNroTo',
    youtubeId: 'e_04ZrNroTo',
    thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80',
    description: 'Glide through snow-capped Swiss mountain summits, frozen alpine lakes, and quaint wooden chalets in pristine 4K.',
    qualityBadge: '4K 60fps Scenery',
    activeCount: 28,
    tags: ['Swiss Alps', 'Snow', 'Mountains', 'Scenic', 'Train', 'Nature'],
  },

  // 22. Sunset Ocean Waves & Beach Fire
  {
    id: 'theater-sunset-ocean',
    title: 'Golden Sunset Ocean Waves & Coastline',
    category: 'nature',
    badge: 'Ocean Breeze 🌊',
    type: 'video',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    description: 'Gentle golden hour tide washing over sunlit sands, seabirds, and warm glowing horizon colors for soothing talks.',
    qualityBadge: '4K Nature Video',
    activeCount: 23,
    tags: ['Ocean', 'Sunset', 'Waves', 'Peaceful', 'Nature'],
  },

  // 23. Night of the Living Dead (George A. Romero)
  {
    id: 'theater-living-dead',
    title: 'Night of the Living Dead (Original 1968)',
    category: 'cinema',
    badge: 'Cult Classic 🧟',
    type: 'video',
    streamUrl: 'https://archive.org/download/Night.Of.The.Living.Dead_1080p/NightOfTheLivingDead.mp4',
    thumbnail: 'https://archive.org/services/img/Night.Of.The.Living.Dead_1080p',
    description: 'George A. Romero\'s historic indie thriller that created the modern zombie cinema genre. Perfect for late-night chills.',
    qualityBadge: '1080p HD Remaster',
    activeCount: 22,
    tags: ['Horror', 'Cult Classic', 'Late Night', 'Indie Cinema'],
  },

  // 24. Elephants Dream (Sci-Fi Surrealist Classic)
  {
    id: 'theater-elephants-dream',
    title: 'Elephants Dream: Infinite Surreal Machine',
    category: 'animation',
    badge: 'Sci-Fi Art ⚙️',
    type: 'video',
    streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    description: 'Two travelers navigate an infinite, shifting clockwork mechanism in this pioneering surrealist computer animation.',
    qualityBadge: 'Direct 1080p Stream',
    activeCount: 15,
    tags: ['Animation', 'Sci-Fi', 'Surreal', 'Blender Studio'],
  },
];

const REACTION_EMOJIS = ['❤️', '🍿', '🔥', '✨', '🥂', '😂', '🥺', '💯', '🎶'];

export const CoViewingLoungeView: React.FC<CoViewingLoungeViewProps> = ({
  socket,
  currentProfile,
  singles,
  onWaveProfile,
  onInspectProfile,
}) => {
  const [theatersList, setTheatersList] = useState<MiniTheater[]>(DEFAULT_THEATERS);
  const [selectedTheater, setSelectedTheater] = useState<MiniTheater>(DEFAULT_THEATERS[0]);
  const [activeCategory, setActiveCategory] = useState<TheaterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(120);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Social states
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number; senderName?: string }[]>([]);
  const [bulletComments, setBulletComments] = useState<{ id: string; text: string; sender: string; avatar: string; y: number }[]>([]);
  const [quickDanmakuText, setQuickDanmakuText] = useState('');
  const [whisperTarget, setWhisperTarget] = useState<SingleProfile | null>(null);
  const [whisperText, setWhisperText] = useState('');
  const [whisperSentSuccess, setWhisperSentSuccess] = useState(false);

  // Custom Stream Modal & Direct YouTube Search
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [modalTab, setModalTab] = useState<'search' | 'url'>('search');
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customCategory, setCustomCategory] = useState<'cinema' | 'lofi' | 'walk' | 'nature' | 'animation' | 'comedy'>('cinema');
  const [isFetchingYt, setIsFetchingYt] = useState(false);
  const [fetchedYtInfo, setFetchedYtInfo] = useState<{ title: string; artist?: string; thumbnail?: string } | null>(null);

  // YouTube Search States
  const [ytSearchInput, setYtSearchInput] = useState('');
  const [ytSearchResults, setYtSearchResults] = useState<any[]>([]);
  const [isSearchingYt, setIsSearchingYt] = useState(false);

  // Lounge Catalog YouTube Search States
  const [loungeYtResults, setLoungeYtResults] = useState<any[]>([]);
  const [isSearchingLoungeYt, setIsSearchingLoungeYt] = useState(false);
  const [showLoungeYtSearch, setShowLoungeYtSearch] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  // Send control commands to embedded YouTube iframe
  const sendYouTubeCommand = useCallback((func: string, args: any[] = []) => {
    if (ytIframeRef.current?.contentWindow) {
      try {
        ytIframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (err) {
        console.warn('YouTube command error:', err);
      }
    }
  }, []);

  // Pick co-viewers from community singles
  const attendees = useMemo(() => {
    // Return a lively subset of singles tailored to this theater
    const hash = selectedTheater.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const startIndex = hash % Math.max(1, singles.length - 4);
    return singles.slice(startIndex, startIndex + 6);
  }, [singles, selectedTheater.id]);

  // Filtered theaters by category and search
  const filteredTheaters = useMemo(() => {
    return theatersList.filter((th) => {
      const matchCategory = activeCategory === 'all' || th.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        th.title.toLowerCase().includes(q) ||
        th.description.toLowerCase().includes(q) ||
        th.tags.some((t) => t.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [theatersList, activeCategory, searchQuery]);

  // Handle Socket reactions & in-theater whispers
  useEffect(() => {
    if (!socket) return;

    const handleReaction = (data: { theaterId: string; emoji: string; userName: string }) => {
      if (data.theaterId === selectedTheater.id) {
        const id = `rx-${Date.now()}-${Math.random()}`;
        setFloatingReactions((prev) => [
          ...prev.slice(-14),
          { id, emoji: data.emoji, x: 15 + Math.random() * 70, senderName: data.userName },
        ]);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2400);
      }
    };

    const handleWhisper = (data: { theaterId: string; fromUser: any; toUser: any; message: string }) => {
      if (data.theaterId === selectedTheater.id) {
        // Render as bullet Danmaku comment on the video stage!
        const id = `danmaku-${Date.now()}-${Math.random()}`;
        setBulletComments((prev) => [
          ...prev.slice(-8),
          {
            id,
            text: data.message,
            sender: data.fromUser?.name || 'Someone',
            avatar: data.fromUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
            y: 15 + Math.random() * 60,
          },
        ]);
        setTimeout(() => {
          setBulletComments((prev) => prev.filter((b) => b.id !== id));
        }, 6000);
      }
    };

    socket.on('singles-theater-reaction-received', handleReaction);
    socket.on('singles-theater-whisper-received', handleWhisper);

    return () => {
      socket.off('singles-theater-reaction-received', handleReaction);
      socket.off('singles-theater-whisper-received', handleWhisper);
    };
  }, [socket, selectedTheater.id]);

  // Auto-advance to next video/theater when finished
  const handlePlayNextTheater = useCallback(() => {
    const list = filteredTheaters.length > 1 ? filteredTheaters : theatersList;
    const currentIndex = list.findIndex((t) => t.id === selectedTheater.id);
    const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % list.length : 0;
    const nextTheater = list[nextIndex];
    if (nextTheater) {
      setSelectedTheater(nextTheater);
      setIsPlaying(true);
      setCurrentTime(0);
      setHasVideoError(false);
    }
  }, [filteredTheaters, theatersList, selectedTheater.id]);

  // YouTube iframe message listener for auto-advancing when video finishes
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

      const isEnded =
        (data.event === 'onStateChange' && (data.info === 0 || data.info?.playerState === 0)) ||
        (data.event === 'infoDelivery' && data.info && (data.info.playerState === 0 || data.info.playerState === '0'));

      if (isEnded) {
        handlePlayNextTheater();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handlePlayNextTheater]);

  // Video synchronization & time tracking
  useEffect(() => {
    setHasVideoError(false);
    const video = videoRef.current;
    if (!video || selectedTheater.type !== 'video') return;

    video.volume = volume;
    video.muted = isMuted;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
        // Safety end detection if near video finish
        if (video.currentTime >= video.duration - 0.4 && video.duration > 3) {
          handlePlayNextTheater();
        }
      }
    };

    const handleError = () => {
      console.warn('Video failed to load stream:', selectedTheater.streamUrl);
      setHasVideoError(true);
    };

    const handleEnded = () => {
      handlePlayNextTheater();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);

    if (isPlaying) {
      video.play().catch(() => {
        // Autoplay may need muted first
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
    };
  }, [selectedTheater, volume, isMuted, isPlaying, handlePlayNextTheater]);

  // Play/Pause toggle
  const handleTogglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (selectedTheater.type === 'video' && videoRef.current) {
      if (next) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    } else {
      sendYouTubeCommand(next ? 'playVideo' : 'pauseVideo');
    }
  };

  // Mute / Unmute toggle
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
    }
    if (next) {
      sendYouTubeCommand('mute');
    } else {
      sendYouTubeCommand('unMute');
      sendYouTubeCommand('setVolume', [Math.round((volume > 0 ? volume : 0.8) * 100)]);
    }
  };

  // Volume slider change handler
  const handleVolumeChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(1, newVal));
    setVolume(clamped);
    const muted = clamped === 0;
    setIsMuted(muted);
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
  };

  // Seek video
  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Send floating reaction
  const sendReaction = (emoji: string) => {
    const id = `rx-${Date.now()}-${Math.random()}`;
    setFloatingReactions((prev) => [
      ...prev.slice(-14),
      { id, emoji, x: 20 + Math.random() * 60, senderName: currentProfile.name },
    ]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2400);

    if (socket) {
      socket.emit('singles-theater-reaction', {
        theaterId: selectedTheater.id,
        emoji,
        userName: currentProfile.name,
      });
    }
  };

  // Send Quick Danmaku Bullet
  const handleSendDanmaku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDanmakuText.trim()) return;

    const text = quickDanmakuText.trim();
    const id = `danmaku-${Date.now()}-${Math.random()}`;

    setBulletComments((prev) => [
      ...prev.slice(-8),
      {
        id,
        text,
        sender: currentProfile.name,
        avatar: currentProfile.avatar,
        y: 15 + Math.random() * 60,
      },
    ]);
    setTimeout(() => {
      setBulletComments((prev) => prev.filter((b) => b.id !== id));
    }, 6000);

    if (socket) {
      socket.emit('singles-theater-whisper', {
        theaterId: selectedTheater.id,
        fromUser: currentProfile,
        toUser: null,
        message: text,
      });
    }

    setQuickDanmakuText('');
  };

  // Send Direct Whisper
  const handleSendWhisper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whisperTarget || !whisperText.trim()) return;

    setWhisperSentSuccess(true);
    if (socket) {
      socket.emit('singles-theater-whisper', {
        theaterId: selectedTheater.id,
        fromUser: currentProfile,
        toUser: whisperTarget,
        message: whisperText.trim(),
      });
    }

    setTimeout(() => {
      setWhisperSentSuccess(false);
      setWhisperTarget(null);
      setWhisperText('');
    }, 1400);
  };

  // Random Vibe / Surprise Me
  const handleSurpriseMe = () => {
    const others = theatersList.filter((t) => t.id !== selectedTheater.id);
    if (others.length > 0) {
      const random = others[Math.floor(Math.random() * others.length)];
      setSelectedTheater(random);
    }
  };

  // Add Custom Link to Theaters
  const handleAddCustomTheater = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    const url = customUrl.trim();
    const ytId = extractYouTubeId(url);
    const isYt = Boolean(ytId);

    let resolvedTitle = customTitle.trim();
    let resolvedThumbnail = isYt && ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80';

    if (fetchedYtInfo) {
      if (!resolvedTitle) resolvedTitle = fetchedYtInfo.title;
      if (fetchedYtInfo.thumbnail) resolvedThumbnail = fetchedYtInfo.thumbnail;
    } else if (isYt) {
      try {
        const fetched = await fetchDirectYouTubeVideo(url);
        if (fetched) {
          if (!resolvedTitle) resolvedTitle = fetched.title;
          if (fetched.thumbnailUrl) resolvedThumbnail = fetched.thumbnailUrl;
        }
      } catch {}
    }

    const newTheater: MiniTheater = {
      id: `custom-${Date.now()}`,
      title: resolvedTitle || (isYt ? 'Custom YouTube Stream' : 'Shared Video Stream'),
      category: customCategory,
      badge: isYt ? 'YouTube Direct 🔴' : 'Direct Stream 🍿',
      type: isYt ? 'youtube' : 'video',
      streamUrl: url,
      youtubeId: ytId || undefined,
      thumbnail: resolvedThumbnail,
      description: `Custom stream brought in by ${currentProfile.name}. Enjoy together!`,
      qualityBadge: isYt ? 'YouTube HD' : 'Direct MP4',
      activeCount: 1,
      tags: ['Custom', isYt ? 'YouTube' : 'Video', customCategory],
    };

    setTheatersList((prev) => [newTheater, ...prev]);
    setSelectedTheater(newTheater);
    setShowAddCustomModal(false);
    setCustomTitle('');
    setCustomUrl('');
    setFetchedYtInfo(null);
  };

  const handleFetchYtDetails = async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) {
      setFetchedYtInfo(null);
      return;
    }
    const ytId = extractYouTubeId(trimmed);
    if (!ytId && !trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) return;

    setIsFetchingYt(true);
    try {
      const info = await fetchDirectYouTubeVideo(trimmed);
      if (info) {
        setFetchedYtInfo({
          title: info.title,
          artist: info.artist,
          thumbnail: info.thumbnailUrl,
        });
        if (!customTitle.trim()) {
          setCustomTitle(info.title);
        }
      }
    } catch (err) {
      console.warn('Could not auto-fetch YouTube video info:', err);
    } finally {
      setIsFetchingYt(false);
    }
  };

  const handleSearchYouTubeInModal = async (query: string) => {
    setYtSearchInput(query);
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearchingYt(true);
    try {
      const results = await searchYouTubeDirect(trimmed);
      setYtSearchResults(results);
    } catch (err) {
      console.warn('Lounge YouTube search error:', err);
    } finally {
      setIsSearchingYt(false);
    }
  };

  const handleSearchYouTubeInLounge = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setShowLoungeYtSearch(false);
      setLoungeYtResults([]);
      return;
    }
    setIsSearchingLoungeYt(true);
    setShowLoungeYtSearch(true);
    try {
      const results = await searchYouTubeDirect(trimmed);
      setLoungeYtResults(results);
    } catch (err) {
      console.warn('Lounge YouTube search error:', err);
    } finally {
      setIsSearchingLoungeYt(false);
    }
  };

  const handleSelectYtVideoForLounge = (video: any, category: string = 'cinema') => {
    const ytId = extractYouTubeId(video.url) || video.videoId;
    const cat = (category === 'all' ? 'cinema' : category) as any;
    const newTheater: MiniTheater = {
      id: `custom-yt-${video.id || ytId || Date.now()}`,
      title: video.title,
      category: cat,
      badge: 'YouTube Live 🔴',
      type: 'youtube',
      streamUrl: video.url,
      youtubeId: ytId || undefined,
      thumbnail: video.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800'),
      description: video.description || `YouTube video streamed by ${currentProfile.name}. Channel: ${video.artist || 'YouTube'}.`,
      qualityBadge: video.durationStr || 'YouTube HD',
      activeCount: 1,
      tags: ['YouTube', video.artist || 'Direct', cat],
    };

    setTheatersList((prev) => [newTheater, ...prev.filter((t) => t.id !== newTheater.id)]);
    setSelectedTheater(newTheater);
    setShowAddCustomModal(false);
    setShowLoungeYtSearch(false);
    setYtSearchInput('');
    setYtSearchResults([]);
    setCustomTitle('');
    setCustomUrl('');
    setFetchedYtInfo(null);
  };

  // Parse YouTube ID of currently selected theater
  const currentYtId = selectedTheater.youtubeId || (selectedTheater.type === 'youtube' ? extractYouTubeId(selectedTheater.streamUrl) : null);

  return (
    <div className="space-y-5 pb-6">
      {/* Top Banner & Search / Filter Controls */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Tv className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                  <span>Watch & Vibe Cinema Lounge</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold animate-pulse">
                    24+ LIVE CHANNELS
                  </span>
                </h3>
                <p className="text-xs text-stone-400">
                  Co-watch classic movies, chillhop radio, binaural 4K walks, and anime with singles hanging out right now.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Surprise Me Button */}
            <button
              onClick={handleSurpriseMe}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 text-xs font-bold transition shadow-sm cursor-pointer"
              title="Hop to a random live theater"
            >
              <Dices className="w-3.5 h-3.5 text-purple-400" />
              <span>Surprise Me</span>
            </button>

            {/* Custom URL Input Button */}
            <button
              onClick={() => setShowAddCustomModal(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md shadow-rose-600/20 cursor-pointer"
              title="Paste any YouTube or video link to watch"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Video</span>
            </button>
          </div>
        </div>

        {/* Category Filters and Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-stone-800/80">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { key: 'all', label: 'All Channels', icon: '✨' },
              { key: 'cinema', label: 'Cinema & Romance', icon: '🍿' },
              { key: 'lofi', label: 'Cozy Lo-Fi', icon: '☕' },
              { key: 'walk', label: '4K City Walks', icon: '🗼' },
              { key: 'nature', label: 'Cosmos & Nature', icon: '🌌' },
              { key: 'animation', label: 'Animation', icon: '🐰' },
              { key: 'comedy', label: 'Comedy & Laughs', icon: '😂' },
            ].map((cat) => {
              const isSelected = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key as TheaterCategory)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                      : 'bg-stone-800/80 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-700/50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Search & Direct YouTube Search */}
          <div className="flex items-center gap-1.5 shrink-0 sm:w-72">
            <div className="relative flex-1">
              {isSearchingLoungeYt ? (
                <Loader2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) {
                    setShowLoungeYtSearch(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSearchYouTubeInLounge(searchQuery);
                  }
                }}
                placeholder="Search theaters or any YouTube video..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700/70 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowLoungeYtSearch(false);
                    setLoungeYtResults([]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => handleSearchYouTubeInLounge(searchQuery)}
                disabled={isSearchingLoungeYt}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 transition shadow cursor-pointer shrink-0"
                title="Search YouTube directly without pasting URL"
              >
                {isSearchingLoungeYt ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <span>🔴 Search YT</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Screening Stage (Video Player & Co-Viewing HUD) */}
      <div
        ref={stageContainerRef}
        className="relative rounded-3xl overflow-hidden border border-stone-700/80 bg-black aspect-video sm:aspect-[21/9] shadow-2xl flex items-center justify-center group"
      >
        {/* 1. Direct HTML5 Video Player */}
        {selectedTheater.type === 'video' && !hasVideoError ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={selectedTheater.streamUrl}
              autoPlay
              playsInline
              className="w-full h-full object-contain cursor-pointer"
              onClick={handleTogglePlay}
              onEnded={handlePlayNextTheater}
            />

            {/* Centered Big Play Overlay When Paused */}
            {!isPlaying && (
              <div
                onClick={handleTogglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs cursor-pointer z-10"
              >
                <button className="w-16 h-16 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 ml-1 fill-white" />
                </button>
              </div>
            )}
          </div>
        ) : currentYtId ? (
          /* 2. Embedded YouTube Player */
          <div className="relative w-full h-full aspect-video">
            <iframe
              ref={ytIframeRef}
              src={`https://www.youtube-nocookie.com/embed/${currentYtId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
              title={selectedTheater.title}
              className="w-full h-full border-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => {
                if (isMuted) {
                  sendYouTubeCommand('mute');
                } else {
                  sendYouTubeCommand('unMute');
                  sendYouTubeCommand('setVolume', [Math.round((volume > 0 ? volume : 0.8) * 100)]);
                }
              }}
            />
          </div>
        ) : (
          /* 3. Fallback Video Canvas / Error state */
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-stone-950 p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Film className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Stream Initializing...</h4>
              <p className="text-xs text-stone-400 max-w-sm mt-1">
                Connecting to synced broadcast room or mirror stream.
              </p>
            </div>
            <button
              onClick={() => {
                setHasVideoError(false);
                setSelectedTheater(DEFAULT_THEATERS[0]);
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Switch to Live Lofi Radio
            </button>
          </div>
        )}

        {/* Floating live Danmaku bullet comments across video */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          <AnimatePresence>
            {bulletComments.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 1, x: '100%' }}
                animate={{ opacity: 1, x: '-150%' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 7, ease: 'linear' }}
                style={{ top: `${b.y}%` }}
                className="absolute flex items-center gap-2 bg-black/70 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-bold text-white shadow-xl whitespace-nowrap"
              >
                <img src={b.avatar} alt={b.sender} className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
                <span className="text-rose-300 font-semibold">{b.sender}:</span>
                <span>{b.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Floating live emoji reactions */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          <AnimatePresence>
            {floatingReactions.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 1, y: 140, scale: 0.8 }}
                animate={{ opacity: 0, y: -90, scale: 1.8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.2, ease: 'easeOut' }}
                style={{ left: `${r.x}%` }}
                className="absolute bottom-10 flex flex-col items-center select-none"
              >
                <span className="text-3xl sm:text-4xl drop-shadow-md">{r.emoji}</span>
                {r.senderName && (
                  <span className="text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.2 rounded-full mt-0.5">
                    {r.senderName}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Top Info Bar Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
          <div className="flex items-center gap-2 bg-stone-950/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/15 text-xs pointer-events-auto shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-extrabold text-white truncate max-w-[160px] sm:max-w-xs">
              {selectedTheater.title}
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
              {selectedTheater.qualityBadge}
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 bg-stone-950/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/15 text-xs text-stone-300 shadow-lg">
              <Users className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-bold text-white">{selectedTheater.activeCount} Singles Here</span>
            </div>
            <button
              onClick={handleToggleFullscreen}
              className="p-2 rounded-xl bg-stone-950/85 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/15 transition shadow-lg cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Bottom Control Bar Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 pointer-events-none z-30">
          {/* For direct HTML5 MP4: Scrubber timeline & Audio volume */}
          {selectedTheater.type === 'video' && (
            <div className="bg-stone-950/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15 flex items-center justify-between gap-3 pointer-events-auto shadow-xl">
              {/* Play / Pause & Next Video */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleTogglePlay}
                  className="p-1.5 hover:text-white text-stone-300 transition cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>
                <button
                  onClick={handlePlayNextTheater}
                  className="p-1.5 hover:text-rose-400 text-stone-300 transition cursor-pointer"
                  title="Jump to Next Video / Theater"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Slider */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] font-mono text-stone-400">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 120}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <span className="text-[10px] font-mono text-stone-400">{formatTime(duration)}</span>
              </div>

              {/* Audio Volume / Unmute */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleMute}
                  className="p-1.5 hover:text-white text-stone-300 transition cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-16 sm:w-20 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <span className="text-[10px] text-stone-400 font-mono w-6 text-right select-none">
                  {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                </span>
              </div>
            </div>
          )}

          {/* Quick Reaction Bar & Danmaku Input */}
          <div className="flex items-center justify-between gap-2 pointer-events-auto">
            {/* Live Danmaku Whisper Input */}
            <form onSubmit={handleSendDanmaku} className="flex items-center gap-1.5 flex-1 max-w-sm">
              <input
                type="text"
                value={quickDanmakuText}
                onChange={(e) => setQuickDanmakuText(e.target.value)}
                placeholder="Whisper bullet comment across video..."
                maxLength={90}
                className="w-full px-3 py-1.5 bg-stone-950/85 backdrop-blur-md border border-white/15 rounded-xl text-xs text-white placeholder:text-stone-400 focus:outline-none focus:border-rose-500 shadow-xl"
              />
              <button
                type="submit"
                disabled={!quickDanmakuText.trim()}
                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 transition shadow-lg cursor-pointer"
                title="Send live floating comment"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Reaction Emojis */}
            <div className="flex items-center gap-1 bg-stone-950/85 backdrop-blur-md px-2.5 py-1 rounded-2xl border border-white/15 shadow-xl ml-auto">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mr-1 hidden md:inline">
                React:
              </span>
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-base sm:text-lg p-0.5 hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                  title={`Send ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Theater Channel Guide (Live Carousel & Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-rose-400" />
              <span>Explore Live Channels ({filteredTheaters.length})</span>
            </h4>
            <p className="text-xs text-stone-400">
              Click any theater channel below to switch streams and watch with singles in that room.
            </p>
          </div>
        </div>

        {/* YouTube Direct Search Results Shelf (if active) */}
        {showLoungeYtSearch && loungeYtResults.length > 0 && (
          <div className="space-y-3 p-4 bg-red-950/20 border border-red-500/30 rounded-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>🔴 YouTube Search Results for "{searchQuery}"</span>
                  <span className="text-[10px] text-red-300 font-normal">({loungeYtResults.length} videos found)</span>
                </h5>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLoungeYtSearch(false);
                  setLoungeYtResults([]);
                }}
                className="text-stone-400 hover:text-white text-xs cursor-pointer"
              >
                Clear Results ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {loungeYtResults.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleSelectYtVideoForLounge(video, activeCategory === 'all' ? 'cinema' : activeCategory)}
                  className="group relative rounded-2xl overflow-hidden border border-red-500/30 p-3 bg-stone-900/90 hover:bg-stone-850 hover:border-red-500/60 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-2 bg-stone-950">
                    <img
                      src={video.thumbnailUrl || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800'}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    {video.durationStr && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/90 font-mono text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow">
                        {video.durationStr}
                      </span>
                    )}
                    <span className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                      🔴 YouTube
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h6 className="text-xs font-bold text-white line-clamp-1 group-hover:text-red-300">
                      {video.title}
                    </h6>
                    <p className="text-[10px] text-stone-400 truncate">
                      {video.artist || 'YouTube Channel'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-2.5 w-full py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow cursor-pointer transition"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    Stream in Lounge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channel Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredTheaters.map((th) => {
            const isSelected = selectedTheater.id === th.id;
            return (
              <div
                key={th.id}
                onClick={() => {
                  setSelectedTheater(th);
                  setIsPlaying(true);
                }}
                className={`group relative rounded-2xl overflow-hidden border p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-rose-950/40 border-rose-500/80 shadow-lg shadow-rose-500/15 ring-2 ring-rose-500/40'
                    : 'bg-stone-900/70 border-stone-800 hover:border-stone-700 hover:bg-stone-850'
                }`}
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-2.5 bg-stone-950">
                  <img
                    src={th.thumbnail}
                    alt={th.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Top Badge */}
                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10">
                    {th.badge}
                  </span>

                  {/* Live watching count */}
                  <span className="absolute bottom-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-600/90 text-white font-bold flex items-center gap-1 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {th.activeCount} watching
                  </span>

                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-rose-950/40 backdrop-blur-xs">
                      <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-lg">
                        <Check className="w-3 h-3" /> NOW WATCHING
                      </span>
                    </div>
                  )}
                </div>

                {/* Title & Description */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h5 className="text-xs font-extrabold text-white line-clamp-1 group-hover:text-rose-300 transition-colors">
                      {th.title}
                    </h5>
                    <p className="text-[11px] text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                      {th.description}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1 overflow-hidden mt-2.5 pt-2 border-t border-stone-800/80">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono">
                      {th.qualityBadge}
                    </span>
                    {th.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800/60 text-stone-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Co-Viewers Row (Singles Currently in Selected Room) */}
      <div className="bg-stone-900/60 border border-stone-800/80 rounded-3xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-400" />
              <span>Singles in This Room ({attendees.length} Active Co-Viewers)</span>
            </h4>
            <p className="text-xs text-stone-400">
              Co-viewing creates effortless chemistry. Wave, whisper a reaction, or invite someone to private video!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {attendees.map((person) => (
            <div
              key={person.id}
              className="p-3 rounded-2xl bg-stone-850/80 border border-stone-700/60 hover:border-rose-500/40 transition-all flex flex-col items-center text-center group cursor-pointer shadow-sm"
              onClick={() => onInspectProfile(person)}
            >
              <div className="relative mb-2">
                <img
                  src={person.avatar}
                  alt={person.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-500/30 group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-stone-900" />
              </div>
              <h5 className="text-xs font-bold text-white truncate max-w-full">
                {person.name}, {person.age}
              </h5>
              <p className="text-[10px] text-stone-400 truncate max-w-full">
                {person.city || 'Anywhere'}
              </p>

              <div className="flex items-center gap-1.5 mt-2.5 w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setWhisperTarget(person);
                  }}
                  className="flex-1 py-1 px-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Whisper about the movie"
                >
                  <MessageCircle className="w-2.5 h-2.5" />
                  Whisper
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWaveProfile(person, 'wave');
                  }}
                  className="py-1 px-2 rounded-lg bg-stone-700/60 hover:bg-stone-600 text-stone-200 text-[10px] transition-colors cursor-pointer"
                  title="Send friendly wave"
                >
                  👋
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Whisper Compose Modal */}
      {whisperTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-stone-900 border border-stone-700 rounded-3xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={whisperTarget.avatar}
                  alt={whisperTarget.name}
                  className="w-10 h-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h5 className="text-sm font-bold text-white">Whisper to {whisperTarget.name}</h5>
                  <p className="text-[10px] text-stone-400">Co-viewing {selectedTheater.title}</p>
                </div>
              </div>
              <button
                onClick={() => setWhisperTarget(null)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendWhisper} className="space-y-3">
              <textarea
                value={whisperText}
                onChange={(e) => setWhisperText(e.target.value)}
                placeholder={`"Love this scene!" or "That track is so cozy..."`}
                maxLength={200}
                rows={3}
                className="w-full bg-stone-850 border border-stone-700 rounded-xl p-3 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={!whisperText.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/25 disabled:opacity-40 cursor-pointer"
              >
                {whisperSentSuccess ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Whisper Sent! ✨
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send In-Theater Whisper
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Custom Video / YouTube Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <Tv className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Stream Video in Co-Viewing Lounge</h4>
                  <p className="text-[10px] text-stone-400">Search YouTube directly or paste any custom link</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="w-7 h-7 rounded-full bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center gap-1 p-1 bg-stone-850 border border-stone-700 rounded-xl">
              <button
                type="button"
                onClick={() => setModalTab('search')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modalTab === 'search'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                <span>🔴 Search YouTube</span>
                <span className="text-[9px] bg-red-950/80 text-red-200 border border-red-500/40 px-1 py-0.2 rounded">
                  No URL Needed
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('url')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modalTab === 'url'
                    ? 'bg-stone-750 text-white shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <span>🔗 Paste Direct Link</span>
              </button>
            </div>

            {/* TAB 1: Search YouTube Directly */}
            {modalTab === 'search' && (
              <div className="space-y-3.5">
                {/* Search Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearchYouTubeInModal(ytSearchInput);
                  }}
                  className="space-y-2"
                >
                  <label className="block text-xs font-semibold text-stone-300 flex items-center justify-between">
                    <span>Search Any YouTube Video</span>
                    <span className="text-[10px] text-rose-400">Full catalog search</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={ytSearchInput}
                        onChange={(e) => setYtSearchInput(e.target.value)}
                        placeholder="Search video, artist, channel (e.g. Ed Sheeran, MrBeast, Lofi)..."
                        className="w-full pl-9 pr-3 py-2 bg-stone-850 border border-stone-700 rounded-xl text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!ytSearchInput.trim() || isSearchingYt}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40 shrink-0"
                    >
                      {isSearchingYt ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>Search</span>
                    </button>
                  </div>
                </form>

                {/* Quick Topic Chips */}
                <div className="space-y-1">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: '🔥 Trending 2025', q: 'trending music video 2025' },
                      { label: '☕ Lofi Girl Radio', q: 'lofi hip hop radio beats to relax' },
                      { label: '🗼 Tokyo Rain 4K', q: 'tokyo 4k rain walk ambience' },
                      { label: '😂 Stand-Up Comedy', q: 'stand up comedy best moments' },
                      { label: '🐰 Animation 4K', q: 'big buck bunny 4k animation' },
                      { label: '🎵 Ed Sheeran Hits', q: 'ed sheeran greatest hits' },
                      { label: '🚀 Interstellar 4K', q: 'interstellar movie scene 4k' },
                    ].map((sug) => (
                      <button
                        key={sug.label}
                        type="button"
                        onClick={() => {
                          setYtSearchInput(sug.q);
                          handleSearchYouTubeInModal(sug.q);
                        }}
                        className="px-2 py-0.5 bg-stone-800 hover:bg-rose-950/40 text-stone-300 hover:text-rose-200 border border-stone-700 hover:border-rose-500/30 rounded-lg text-[10px] cursor-pointer transition"
                      >
                        {sug.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Category Assignment */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Channel Vibe for Lounge</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-stone-850 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="cinema">🍿 Cinema & Movies</option>
                    <option value="lofi">☕ Cozy Lo-Fi & Beats</option>
                    <option value="walk">🗼 4K City Walks</option>
                    <option value="nature">🌌 Nature & Space</option>
                    <option value="animation">🐰 Animation & Anime</option>
                    <option value="comedy">😂 Comedy & Laughs</option>
                  </select>
                </div>

                {/* Results List */}
                {isSearchingYt ? (
                  <div className="py-8 text-center text-stone-400 text-xs flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                    <span>Searching YouTube directly...</span>
                  </div>
                ) : ytSearchResults.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <span className="text-[11px] font-bold text-stone-300">
                      Found {ytSearchResults.length} Videos:
                    </span>
                    {ytSearchResults.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-stone-850 border border-stone-700/80 hover:border-rose-500/50 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-stone-950 shrink-0">
                          <img
                            src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800'}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {item.durationStr && (
                            <span className="absolute bottom-1 right-1 bg-black/85 text-[8px] font-mono font-bold text-white px-1 py-0.2 rounded">
                              {item.durationStr}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h5 className="text-xs font-bold text-white line-clamp-1">{item.title}</h5>
                          <p className="text-[10px] text-rose-400 truncate">🔴 {item.artist || 'YouTube'}</p>
                          {item.rating && (
                            <span className="text-[9px] text-stone-400 block">{item.rating}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectYtVideoForLounge(item, customCategory)}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg shadow shrink-0 flex items-center gap-1 cursor-pointer transition"
                        >
                          <Play className="w-2.5 h-2.5 fill-white" />
                          <span>Stream</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* TAB 2: Paste Direct Link */}
            {modalTab === 'url' && (
              <form onSubmit={handleAddCustomTheater} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span>Video URL (YouTube Watch URL or Direct MP4)</span>
                    <span className="text-[10px] text-rose-400 font-normal">🔴 Auto-fetches Title & Thumbnail</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomUrl(val);
                        handleFetchYtDetails(val);
                      }}
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="w-full px-3 py-2 bg-stone-850 border border-stone-700 rounded-xl text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-500 pr-10"
                    />
                    {isFetchingYt && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* YouTube Fetched Preview Card */}
                {fetchedYtInfo && (
                  <div className="p-2.5 bg-stone-850/80 rounded-2xl border border-rose-500/30 flex items-center gap-3 animate-in fade-in">
                    {fetchedYtInfo.thumbnail && (
                      <img
                        src={fetchedYtInfo.thumbnail}
                        alt={fetchedYtInfo.title}
                        className="w-20 aspect-video rounded-lg object-cover shrink-0 border border-stone-700"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">
                        YouTube Video Fetched
                      </span>
                      <h5 className="text-xs font-bold text-white truncate">{fetchedYtInfo.title}</h5>
                      {fetchedYtInfo.artist && (
                        <p className="text-[10px] text-stone-400">{fetchedYtInfo.artist}</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Channel / Video Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. My Favorite Romantic Anime Trailer"
                    className="w-full px-3 py-2 bg-stone-850 border border-stone-700 rounded-xl text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Category Vibe</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-850 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="cinema">🍿 Cinema & Movies</option>
                    <option value="lofi">☕ Cozy Lo-Fi & Beats</option>
                    <option value="walk">🗼 4K City Walks</option>
                    <option value="nature">🌌 Nature & Space</option>
                    <option value="animation">🐰 Animation & Anime</option>
                    <option value="comedy">😂 Comedy & Laughs</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!customUrl.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/25 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Launch Shared Channel
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
