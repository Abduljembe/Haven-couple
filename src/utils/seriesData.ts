import { MediaItem } from '../types';

export interface SeriesEpisode {
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  description?: string;
  duration?: string;
  rating?: string;
  airDate?: string;
}

export interface SeriesSeason {
  seasonNumber: number;
  seasonTitle?: string;
  episodeCount: number;
  episodes: SeriesEpisode[];
}

export interface SeriesDetails {
  id: string;
  tmdbId?: string;
  imdbId?: string;
  title: string;
  cleanTitle: string;
  totalSeasons: number;
  seasons: SeriesSeason[];
}

/**
 * Strips episode/season suffix tags like "(S1E1)" from titles
 */
export function cleanSeriesTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\s*\([Ss]\d+\s*[Ee]\d+.*?\)/gi, '')
    .replace(/\s*\([Ss]eason\s*\d+.*?\)/gi, '')
    .replace(/\s*-\s*[Ss]eason\s*\d+/gi, '')
    .trim();
}

/**
 * Checks if a MediaItem is a TV series
 */
export function isSeriesItem(item: MediaItem | null | undefined): boolean {
  if (!item) return false;
  if (item.mediaType === 'tv' || (item as any).type === 'tv') return true;
  if (item.category === 'series') return true;
  if (Boolean(item.season)) return true;
  if (item.id && (item.id.includes('-tv-') || item.id.startsWith('viduki-tv-'))) return true;
  if (item.tags && (item.tags.includes('tv_series') || item.tags.includes('series') || item.tags.includes('tv'))) return true;
  if (item.badge && (item.badge.toLowerCase().includes('tv') || item.badge.toLowerCase().includes('series'))) return true;
  if (item.rating && item.rating.toLowerCase().includes('season')) return true;
  if (item.genre && item.genre.toLowerCase().includes('series')) return true;
  if (item.title && (/\([Ss]\d+[Ee]\d+\)/i.test(item.title) || /\bseason\b/i.test(item.title))) return true;
  return false;
}

/**
 * Pre-defined rich episode catalogs for popular TV series
 */
const KNOWN_SERIES_CATALOG: Record<string, { totalSeasons: number; seasons: SeriesSeason[] }> = {
  // Game of Thrones (TMDB 1399, IMDb tt0944947)
  '1399': {
    totalSeasons: 8,
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: 'Season 1: Winter Is Coming',
        episodeCount: 10,
        episodes: [
          { episodeNumber: 1, seasonNumber: 1, title: 'Winter Is Coming', duration: '62m', description: 'Ned Stark is torn between his family and an old friend when King Robert Baratheon offers him the position of Hand of the King.' },
          { episodeNumber: 2, seasonNumber: 1, title: 'The Kingsroad', duration: '56m', description: 'While Bran recovers from his fall, Ned leaves Winterfell with daughters Sansa and Arya. Jon Snow heads north to join the Night’s Watch.' },
          { episodeNumber: 3, seasonNumber: 1, title: 'Lord Snow', duration: '58m', description: 'Ned arrives in King’s Landing to discover the Crown’s immense debt. At Castle Black, Jon Snow struggles during training.' },
          { episodeNumber: 4, seasonNumber: 1, title: 'Cripples, Bastards, and Broken Things', duration: '56m', description: 'Ned searches for clues to the death of Jon Arryn. Tyrion finds himself caught between the Starks and Lannisters.' },
          { episodeNumber: 5, seasonNumber: 1, title: 'The Wolf and the Lion', duration: '55m', description: 'Catelyn takes Tyrion captive. In King’s Landing, King Robert seeks Daenerys Targaryen’s death, sparking fierce debate.' },
          { episodeNumber: 6, seasonNumber: 1, title: 'A Golden Crown', duration: '53m', description: 'Viserys demands his crown from Khal Drogo in Vaes Dothrak. Ned issues a decree that will ignite war across the Seven Kingdoms.' },
          { episodeNumber: 7, seasonNumber: 1, title: 'You Win or You Die', duration: '58m', description: 'Ned confronts Cersei with the dangerous truth about Robert’s children. Robert is mortally wounded on a royal hunt.' },
          { episodeNumber: 8, seasonNumber: 1, title: 'The Pointy End', duration: '59m', description: 'The Lannisters consolidate power. Arya escapes, Sansa is held hostage, and Robb rallies northern bannermen to march south.' },
          { episodeNumber: 9, seasonNumber: 1, title: 'Baelor', duration: '57m', description: 'Robb negotiates a perilous bridge crossing with Walder Frey. Ned makes a fateful public confession at the Great Sept of Baelor.' },
          { episodeNumber: 10, seasonNumber: 1, title: 'Fire and Blood', duration: '53m', description: 'Tragic news echoes throughout the realm. Daenerys performs a sacred funeral pyre ceremony that awakens dragons.' },
        ],
      },
      {
        seasonNumber: 2,
        seasonTitle: 'Season 2: War of the Five Kings',
        episodeCount: 10,
        episodes: [
          { episodeNumber: 1, seasonNumber: 2, title: 'The North Remembers', duration: '53m', description: 'Tyrion arrives in King’s Landing as acting Hand. Stannis Baratheon aligns with the Red Priestess Melisandre.' },
          { episodeNumber: 2, seasonNumber: 2, title: 'The Night Lands', duration: '54m', description: 'Arya shares a secret with Gendry. Theon Greyjoy returns to Pyke seeking his father’s fleet.' },
          { episodeNumber: 3, seasonNumber: 2, title: 'What Is Dead May Never Die', duration: '53m', description: 'Tyrion orchestrates three strategic wedding alliances. Catelyn travels south to negotiate with Renly Baratheon.' },
          { episodeNumber: 4, seasonNumber: 2, title: 'Garden of Bones', duration: '51m', description: 'Joffrey tortures Sansa following Robb’s northern victories. Daenerys reaches the legendary walled city of Qarth.' },
          { episodeNumber: 5, seasonNumber: 2, title: 'The Ghost of Harrenhal', duration: '55m', description: 'Renly Baratheon is struck down by shadow magic. Jaqen H’ghar offers Arya three lives for the god of death.' },
          { episodeNumber: 6, seasonNumber: 2, title: 'The Old Gods and the New', duration: '54m', description: 'Theon seizes Winterfell. In the icy wilderness beyond the Wall, Jon Snow captures the wildling spearwife Ygritte.' },
          { episodeNumber: 7, seasonNumber: 2, title: 'A Man Without Honor', duration: '56m', description: 'Theon attempts to quell the rebellion in Winterfell. Daenerys hunts for her stolen dragons in Qarth.' },
          { episodeNumber: 8, seasonNumber: 2, title: 'The Prince of Winterfell', duration: '54m', description: 'Stannis’ armada approaches King’s Landing. Tyrion manufactures dangerous wildfire with the Alchemists’ Guild.' },
          { episodeNumber: 9, seasonNumber: 2, title: 'Blackwater', duration: '55m', description: 'The massive battle for the capital unfolds. Wildfire obliterates Stannis’ fleet, and the Hound flees the inferno.' },
          { episodeNumber: 10, seasonNumber: 2, title: 'Valar Morghulis', duration: '64m', description: 'Tywin Lannister is named Savior of the City. Daenerys enters the House of the Undying to reclaim her dragons.' },
        ],
      },
      {
        seasonNumber: 3,
        seasonTitle: 'Season 3: The Rains of Castamere',
        episodeCount: 10,
        episodes: [
          { episodeNumber: 1, seasonNumber: 3, title: 'Valar Dohaeris', duration: '55m', description: 'Jon Snow is brought before Mance Rayder, the King-Beyond-the-Wall. Tyrion demands his birthright from Tywin.' },
          { episodeNumber: 2, seasonNumber: 3, title: 'Dark Wings, Dark Words', duration: '56m', description: 'Sansa confides in Margaery and Olenna Tyrell. Bran meets the mysterious Jojen and Meera Reed.' },
          { episodeNumber: 3, seasonNumber: 3, title: 'Walk of Punishment', duration: '53m', description: 'Robb attends Hoster Tully’s funeral in Riverrun. Jaime Lannister suffers a catastrophic loss at Harrenhal.' },
          { episodeNumber: 4, seasonNumber: 3, title: 'And Now His Watch Is Ended', duration: '54m', description: 'Daenerys purchases the Unsullied army in Astapor with fire and blood: "Dracarys!"' },
          { episodeNumber: 5, seasonNumber: 3, title: 'Kissed by Fire', duration: '57m', description: 'The Hound faces Beric Dondarrion in trial by combat. Jaime confesses the truth behind the Mad King to Brienne.' },
          { episodeNumber: 6, seasonNumber: 3, title: 'The Climb', duration: '53m', description: 'Jon and Ygritte scale the colossal ice Wall. Littlefinger explains that "chaos is not a pit, chaos is a ladder."' },
          { episodeNumber: 7, seasonNumber: 3, title: 'The Bear and the Maiden Fair', duration: '58m', description: 'Dany reaches Yunkai. Jaime returns to Harrenhal to rescue Brienne from a monstrous pit bear.' },
          { episodeNumber: 8, seasonNumber: 3, title: 'Second Sons', duration: '56m', description: 'Tyrion and Sansa are forced into marriage. Daario Naharis swears loyalty to the Dragon Queen.' },
          { episodeNumber: 9, seasonNumber: 3, title: 'The Rains of Castamere', duration: '51m', description: 'The Starks attend Edmure Tully’s wedding feast at the Twins, where the treacherous Red Wedding strikes.' },
          { episodeNumber: 10, seasonNumber: 3, title: 'Mhysa', duration: '63m', description: 'Aftermath of the Red Wedding ripples through Westeros. The liberated slaves of Yunkai hail Daenerys as "Mhysa".' },
        ],
      },
      {
        seasonNumber: 4,
        seasonTitle: 'Season 4: The Lion and the Rose',
        episodeCount: 10,
        episodes: [
          { episodeNumber: 1, seasonNumber: 4, title: 'Two Swords', duration: '58m', description: 'Tywin melts Ice into two Valyrian blades. Oberyn Martell, the Red Viper of Dorne, arrives with vengeance in his heart.' },
          { episodeNumber: 2, seasonNumber: 4, title: 'The Lion and the Rose', duration: '52m', description: 'The lavish royal wedding of Joffrey and Margaery culminates in sudden, shocking poison.' },
          { episodeNumber: 3, seasonNumber: 4, title: 'Breaker of Chains', duration: '56m', description: 'Tyrion is arrested for regicide. Sansa escapes the capital with Littlefinger’s aid. Dany besieges Meereen.' },
          { episodeNumber: 4, seasonNumber: 4, title: 'Oathkeeper', duration: '55m', description: 'Jaime gifts Brienne a Valyrian steel sword to locate Sansa. The Night King converts an infant beyond the Wall.' },
          { episodeNumber: 5, seasonNumber: 4, title: 'First of His Name', duration: '53m', description: 'Tommen is crowned king. Jon Snow leads a raid against the mutineers at Craster’s Keep.' },
          { episodeNumber: 6, seasonNumber: 4, title: 'The Laws of Gods and Men', duration: '51m', description: 'Stannis visits the Iron Bank of Braavos. Tyrion delivers an electrifying speech demanding trial by combat.' },
          { episodeNumber: 7, seasonNumber: 4, title: 'Mockingbird', duration: '51m', description: 'Oberyn Martell agrees to champion Tyrion. Littlefinger pushes Lysa Arryn out of the Eyrie’s Moon Door.' },
          { episodeNumber: 8, seasonNumber: 4, title: 'The Mountain and the Viper', duration: '53m', description: 'Oberyn battles Gregor "The Mountain" Clegane in an unforgettable trial by combat.' },
          { episodeNumber: 9, seasonNumber: 4, title: 'The Watchers on the Wall', duration: '51m', description: 'The Night’s Watch defends Castle Black against Mance Rayder’s overwhelming army of giants and wildlings.' },
          { episodeNumber: 10, seasonNumber: 4, title: 'The Children', duration: '66m', description: 'Stannis arrives at the Wall. Bran reaches the Three-Eyed Raven. Tyrion takes revenge before sailing east.' },
        ],
      },
      {
        seasonNumber: 5,
        seasonTitle: 'Season 5: Mother\'s Mercy',
        episodeCount: 10,
        episodes: [
          { episodeNumber: 1, seasonNumber: 5, title: 'The Wars to Come', duration: '53m', description: 'Cersei and Jaime adjust to Tywin’s absence. Varys smuggles Tyrion into Pentos.' },
          { episodeNumber: 2, seasonNumber: 5, title: 'The House of Black and White', duration: '56m', description: 'Arya arrives in Braavos at the temple of the Many-Faced God. Jon Snow is elected Lord Commander.' },
          { episodeNumber: 3, seasonNumber: 5, title: 'High Sparrow', duration: '60m', description: 'Cersei meets the enigmatic High Sparrow. Littlefinger arranges Sansa’s betrothal to Ramsay Bolton.' },
          { episodeNumber: 4, seasonNumber: 5, title: 'Sons of the Harpy', duration: '51m', description: 'The Faith Militant executes brutal arrests in King’s Landing. Insurgents ambush Barristan and Grey Worm in Meereen.' },
          { episodeNumber: 5, seasonNumber: 5, title: 'Kill the Boy', duration: '57m', description: 'Maester Aemon counsels Jon Snow: "Kill the boy, and let the man be born." Tyrion and Jorah sail the Doom of Valyria.' },
          { episodeNumber: 6, seasonNumber: 5, title: 'Unbowed, Unbent, Unbroken', duration: '54m', description: 'Arya trains as a Faceless Man. Sansa is subjected to Ramsay’s cruelty in Winterfell.' },
          { episodeNumber: 7, seasonNumber: 5, title: 'The Gift', duration: '59m', description: 'Jon travels north to rescue wildlings. Cersei is imprisoned by the High Sparrow in the Great Sept.' },
          { episodeNumber: 8, seasonNumber: 5, title: 'Hardhome', duration: '61m', description: 'The Night King unleashes his colossal army of wights upon the wildling harbor of Hardhome.' },
          { episodeNumber: 9, seasonNumber: 5, title: 'The Dance of Dragons', duration: '53m', description: 'Stannis makes a horrific sacrifice. Drogon returns to rescue Daenerys from the fighting pits of Meereen.' },
          { episodeNumber: 10, seasonNumber: 5, title: 'Mother’s Mercy', duration: '60m', description: 'Cersei endures the Walk of Atonement. Stannis falls, and mutineers assassinate Jon Snow.' },
        ],
      },
      {
        seasonNumber: 6,
        seasonTitle: 'Season 6: The Winds of Winter',
        episodeCount: 10,
        episodes: [
          { episodeNumber: 1, seasonNumber: 6, title: 'The Red Woman', duration: '50m', description: 'Jon Snow’s corpse is guarded by loyal brothers. Melisandre reveals her true ancient form.' },
          { episodeNumber: 2, seasonNumber: 6, title: 'Home', duration: '54m', description: 'Melisandre attempts a resurrection ritual. Bran visits Winterfell’s past through weirwood greensight.' },
          { episodeNumber: 3, seasonNumber: 6, title: 'Oathbreaker', duration: '53m', description: 'Jon executes the conspirators and announces: "My watch has ended." Daenerys is presented to the Dosh Khaleen.' },
          { episodeNumber: 4, seasonNumber: 6, title: 'Book of the Stranger', duration: '59m', description: 'Sansa reunites with Jon at Castle Black. Daenerys burns the Khals and emerges unburnt.' },
          { episodeNumber: 5, seasonNumber: 6, title: 'The Door', duration: '57m', description: 'The origin of the White Walkers is revealed. Hodor holds the door against an unstoppable swarm.' },
          { episodeNumber: 6, seasonNumber: 6, title: 'Blood of My Blood', duration: '52m', description: 'Benjen Stark rescues Bran and Meera. Samwell Tarly steals his ancestral Valyrian sword Heartsbane.' },
          { episodeNumber: 7, seasonNumber: 6, title: 'The Broken Man', duration: '51m', description: 'Sandor Clegane survives living peacefully with Septon Ray. The Starks seek northern bannermen.' },
          { episodeNumber: 8, seasonNumber: 6, title: 'No One', duration: '59m', description: 'Arya defeats the Waif and declares her identity: "A girl is Arya Stark of Winterfell, and I’m going home."' },
          { episodeNumber: 9, seasonNumber: 6, title: 'Battle of the Bastards', duration: '60m', description: 'Jon Snow’s forces clash with Ramsay Bolton’s phalanxes in an epic, breathtaking clash for Winterfell.' },
          { episodeNumber: 10, seasonNumber: 6, title: 'The Winds of Winter', duration: '68m', description: 'Cersei ignites wildfire under the Great Sept. Jon is proclaimed King in the North. Dany sets sail for Westeros.' },
        ],
      },
      {
        seasonNumber: 7,
        seasonTitle: 'Season 7: The Spoils of War',
        episodeCount: 7,
        episodes: [
          { episodeNumber: 1, seasonNumber: 7, title: 'Dragonstone', duration: '59m', description: 'Arya poisons House Frey. Daenerys returns home to Dragonstone: "Shall we begin?"' },
          { episodeNumber: 2, seasonNumber: 7, title: 'Stormborn', duration: '59m', description: 'Euron Greyjoy ambushes the Targaryen fleet. Jon receives Daenerys’ royal summons.' },
          { episodeNumber: 3, seasonNumber: 7, title: 'The Queen’s Justice', duration: '63m', description: 'Jon and Daenerys meet face-to-face. Cersei exacts revenge on Ellaria Sand.' },
          { episodeNumber: 4, seasonNumber: 7, title: 'The Spoils of War', duration: '50m', description: 'Drogon and the Dothraki horde decimate the Lannister loot train in a blaze of fire and fury.' },
          { episodeNumber: 5, seasonNumber: 7, title: 'Eastwatch', duration: '59m', description: 'Jon touches Drogon. An expedition beyond the Wall is proposed to capture a living wight.' },
          { episodeNumber: 6, seasonNumber: 7, title: 'Beyond the Wall', duration: '71m', description: 'Jon’s squad is trapped on a frozen lake. Daenerys flies north to the rescue with devastating consequences.' },
          { episodeNumber: 7, seasonNumber: 7, title: 'The Dragon and the Wolf', duration: '81m', description: 'The factions convene at the Dragonpit. The Night King obliterates Eastwatch-by-the-Sea.' },
        ],
      },
      {
        seasonNumber: 8,
        seasonTitle: 'Season 8: The Final Battle',
        episodeCount: 6,
        episodes: [
          { episodeNumber: 1, seasonNumber: 8, title: 'Winterfell', duration: '54m', description: 'Dany arrives at Winterfell. Samwell reveals Jon’s true royal heritage as Aegon Targaryen.' },
          { episodeNumber: 2, seasonNumber: 8, title: 'A Knight of the Seven Kingdoms', duration: '58m', description: 'On the eve of the army of the dead’s arrival, Jaime knights Brienne of Tarth.' },
          { episodeNumber: 3, seasonNumber: 8, title: 'The Long Night', duration: '82m', description: 'The cataclysmic battle against the Night King envelops Winterfell in total darkness.' },
          { episodeNumber: 4, seasonNumber: 8, title: 'The Last of the Starks', duration: '78m', description: 'Victors mourn the fallen. Daenerys turns her wrath toward King’s Landing.' },
          { episodeNumber: 5, seasonNumber: 8, title: 'The Bells', duration: '79m', description: 'Surrender bells ring across King’s Landing, but the Dragon Queen burns the capital to ash.' },
          { episodeNumber: 6, seasonNumber: 8, title: 'The Iron Throne', duration: '80m', description: 'In the smoldering ruins of the Red Keep, the fate of Westeros and the Iron Throne is decided.' },
        ],
      },
    ],
  },

  // Stranger Things (TMDB 66732, IMDb tt4574334)
  '66732': {
    totalSeasons: 4,
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: 'Season 1: The Vanishing of Will Byers',
        episodeCount: 8,
        episodes: [
          { episodeNumber: 1, seasonNumber: 1, title: 'Chapter One: The Vanishing of Will Byers', duration: '48m', description: 'A young boy vanishes into thin air in Hawkins, Indiana. Friends find a mysterious shaved-head girl with telekinetic powers.' },
          { episodeNumber: 2, seasonNumber: 1, title: 'Chapter Two: The Weirdo on Maple Street', duration: '55m', description: 'Mike hides Eleven in his basement. Joyce receives mysterious staticky phone calls from Will.' },
          { episodeNumber: 3, seasonNumber: 1, title: 'Chapter Three: Holly, Jolly', duration: '51m', description: 'Joyce paints the alphabet on her living room wall with Christmas lights to communicate with the Upside Down.' },
          { episodeNumber: 4, seasonNumber: 1, title: 'Chapter Four: The Body', duration: '50m', description: 'Refusing to believe Will’s alleged corpse is real, Hopper uncovers dark experiments at Hawkins National Laboratory.' },
          { episodeNumber: 5, seasonNumber: 1, title: 'Chapter Five: The Flea and the Acrobat', duration: '52m', description: 'The boys ask their science teacher Mr. Clarke how to travel between parallel dimensions.' },
          { episodeNumber: 6, seasonNumber: 1, title: 'Chapter Six: The Monster', duration: '46m', description: 'Jonathan and Nancy arm themselves for the Demogorgon. Eleven confronts past trauma in the void.' },
          { episodeNumber: 7, seasonNumber: 1, title: 'Chapter Seven: The Bathtub', duration: '42m', description: 'The kids construct a makeshift sensory deprivation tank in the school gymnasium.' },
          { episodeNumber: 8, seasonNumber: 1, title: 'Chapter Eight: The Upside Down', duration: '55m', description: 'Hopper and Joyce venture into the toxic Upside Down. Eleven faces off against the Demogorgon.' },
        ],
      },
      {
        seasonNumber: 2,
        seasonTitle: 'Season 2: The Mind Flayer',
        episodeCount: 9,
        episodes: [
          { episodeNumber: 1, seasonNumber: 2, title: 'Chapter One: MADMAX', duration: '48m', description: 'A new arcade master "MADMAX" arrives. Will experiences terrifying episodes of a giant shadow monster.' },
          { episodeNumber: 2, seasonNumber: 2, title: 'Chapter Two: Trick or Treat, Freak', duration: '56m', description: 'On Halloween, Will spots the shadowy entity. Hopper visits Eleven in his hidden woodland cabin.' },
          { episodeNumber: 3, seasonNumber: 2, title: 'Chapter Three: The Pollywog', duration: '51m', description: 'Dustin discovers a bizarre slug-like creature in his trash can and names it Dart.' },
          { episodeNumber: 4, seasonNumber: 2, title: 'Chapter Four: Will the Wise', duration: '46m', description: 'Will draws interconnected vines spreading beneath the town. Hopper digs into the subterranean tunnels.' },
          { episodeNumber: 5, seasonNumber: 2, title: 'Chapter Five: Dig Dug', duration: '58m', description: 'Bob Newby uses his puzzle-solving genius to map Hawkins’ underground rot network.' },
          { episodeNumber: 6, seasonNumber: 2, title: 'Chapter Six: The Spy', duration: '52m', description: 'The Demodogs swarm Hawkins Lab while Will’s connection to the Mind Flayer deepens.' },
          { episodeNumber: 7, seasonNumber: 2, title: 'Chapter Seven: The Lost Sister', duration: '45m', description: 'Eleven travels to Chicago to find Kali (008), a fellow runaway with illusion abilities.' },
          { episodeNumber: 8, seasonNumber: 2, title: 'Chapter Eight: The Mind Flayer', duration: '47m', description: 'Hawkins Lab is in lockdown. Bob makes a heroic sprint to restore power.' },
          { episodeNumber: 9, seasonNumber: 2, title: 'Chapter Nine: The Gate', duration: '62m', description: 'Eleven unleashes her maximum power to seal the colossal interdimensional rift.' },
        ],
      },
      {
        seasonNumber: 3,
        seasonTitle: 'Season 3: The Battle of Starcourt',
        episodeCount: 8,
        episodes: [
          { episodeNumber: 1, seasonNumber: 3, title: 'Chapter One: Suzie, Do You Copy?', duration: '51m', description: 'Summer of 1985 in Hawkins. Starcourt Mall opens, and Dustin intercepts secret Russian code on his radio tower.' },
          { episodeNumber: 2, seasonNumber: 3, title: 'Chapter Two: The Mall Rats', duration: '50m', description: 'Steve and Robin work Scoops Ahoy to translate the Russian broadcast. Billy is infected by a sinister force.' },
          { episodeNumber: 3, seasonNumber: 3, title: 'Chapter Three: The Case of the Missing Lifeguard', duration: '50m', description: 'Eleven and Max spy on Billy. Nancy and Jonathan investigate rabid fertilizer-eating rats.' },
          { episodeNumber: 4, seasonNumber: 3, title: 'Chapter Four: The Sauna Test', duration: '53m', description: 'The gang traps Billy in a sweltering sauna to confirm his possession by the Mind Flayer.' },
          { episodeNumber: 5, seasonNumber: 3, title: 'Chapter Five: The Flayed', duration: '52m', description: 'Hopper and Joyce capture a quirky Russian scientist named Alexei. Robin and Steve discover an underground bunker.' },
          { episodeNumber: 6, seasonNumber: 3, title: 'Chapter Six: E Pluribus Unum', duration: '60m', description: 'Eleven enters Billy’s childhood memories to understand the Mind Flayer’s flesh avatar.' },
          { episodeNumber: 7, seasonNumber: 3, title: 'Chapter Seven: The Bite', duration: '55m', description: 'Fireworks illuminate Fourth of July carnival as the monster attacks Starcourt Mall.' },
          { episodeNumber: 8, seasonNumber: 3, title: 'Chapter Eight: The Battle of Starcourt', duration: '77m', description: 'The explosive showdown at the mall requires high sacrifices to save Hawkins from the Upside Down.' },
        ],
      },
      {
        seasonNumber: 4,
        seasonTitle: 'Season 4: Vecna\'s Curse',
        episodeCount: 9,
        episodes: [
          { episodeNumber: 1, seasonNumber: 4, title: 'Chapter One: The Hellfire Club', duration: '76m', description: 'Spring 1986. The kids navigate high school and D&D with Eddie Munson while a gruesome curse claims a cheerleader.' },
          { episodeNumber: 2, seasonNumber: 4, title: 'Chapter Two: Vecna’s Curse', duration: '77m', description: 'A terrifying dark sorcerer named Vecna stalks traumatized Hawkins teens.' },
          { episodeNumber: 3, seasonNumber: 4, title: 'Chapter Three: The Monster and the Superhero', duration: '63m', description: 'Eleven struggles in California. Joyce and Murray fly to Alaska to rescue Hopper from Kamchatka.' },
          { episodeNumber: 4, seasonNumber: 4, title: 'Chapter Four: Dear Billy', duration: '78m', description: 'Max falls into Vecna’s trance. Kate Bush’s "Running Up That Hill" plays in a gripping sprint for her life.' },
          { episodeNumber: 5, seasonNumber: 4, title: 'Chapter Five: The Nina Project', duration: '76m', description: 'Dr. Brenner places Eleven into the NINA tank to restore her lost telekinetic powers.' },
          { episodeNumber: 6, seasonNumber: 4, title: 'Chapter Six: The Dive', duration: '73m', description: 'Steve, Nancy, Robin, and Eddie dive into Lovers Lake and are dragged into the Upside Down.' },
          { episodeNumber: 7, seasonNumber: 4, title: 'Chapter Seven: The Massacre at Hawkins Lab', duration: '98m', description: 'Eleven’s memories reveal the horrifying origin of One and how Vecna was created.' },
          { episodeNumber: 8, seasonNumber: 4, title: 'Chapter Eight: Papa', duration: '85m', description: 'Military soldiers assault the bunker. Hawkins friends prepare for a coordinated multi-realm assault.' },
          { episodeNumber: 9, seasonNumber: 4, title: 'Chapter Nine: The Piggyback', duration: '142m', description: 'Eddie shreds Metallica’s "Master of Puppets" in the Upside Down in an unforgettable season finale.' },
        ],
      },
    ],
  },

  // Breaking Bad (TMDB 1396, IMDb tt0903747)
  '1396': {
    totalSeasons: 5,
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: 'Season 1: Pilot & Beginnings',
        episodeCount: 7,
        episodes: [
          { episodeNumber: 1, seasonNumber: 1, title: 'Pilot', duration: '58m', description: 'Diagnosed with inoperable lung cancer, high school chemistry teacher Walter White partners with former student Jesse Pinkman.' },
          { episodeNumber: 2, seasonNumber: 1, title: 'Cat’s in the Bag...', duration: '48m', description: 'Walt and Jesse attempt to dispose of two rival drug dealers in a remote RV.' },
          { episodeNumber: 3, seasonNumber: 1, title: '...And the Bag’s in the River', duration: '48m', description: 'Walt bonds with Krazy-8 before making a grim, irrevocable choice.' },
          { episodeNumber: 4, seasonNumber: 1, title: 'Cancer Man', duration: '48m', description: 'Walt reveals his cancer diagnosis to his stunned family. Jesse visits his parents.' },
          { episodeNumber: 5, seasonNumber: 1, title: 'Gray Matter', duration: '48m', description: 'Walt rejects financial charity from former wealthy business partners.' },
          { episodeNumber: 6, seasonNumber: 1, title: 'Crazy Handful of Nothin\'', duration: '48m', description: 'Walt shaves his head, adopts the pseudonym "Heisenberg", and uses fulminated mercury against Tuco.' },
          { episodeNumber: 7, seasonNumber: 1, title: 'A No-Rough-Stuff-Type Deal', duration: '48m', description: 'Walt and Jesse execute a midnight heist for methylamine to cook pure blue meth.' },
        ],
      },
      {
        seasonNumber: 2,
        seasonTitle: 'Season 2: Better Call Saul',
        episodeCount: 13,
        episodes: [
          { episodeNumber: 1, seasonNumber: 2, title: 'Seven Thirty-Seven', duration: '47m', description: 'Walt calculates the exact dollar sum required to provide for his family.' },
          { episodeNumber: 2, seasonNumber: 2, title: 'Grilled', duration: '48m', description: 'Tuco holds Walt and Jesse hostage in the desert alongside his disabled uncle Hector.' },
          { episodeNumber: 3, seasonNumber: 2, title: 'Bit by a Dead Bee', duration: '47m', description: 'Walt fabricates a fugue state alibi. Hank searches for Jesse.' },
          { episodeNumber: 4, seasonNumber: 2, title: 'Down', duration: '48m', description: 'Jesse is evicted from his house. Walt attempts to repair domestic life.' },
          { episodeNumber: 5, seasonNumber: 2, title: 'Breakage', duration: '48m', description: 'Hank experiences PTSD. Jesse recruits his neighborhood friends to distribute meth.' },
          { episodeNumber: 6, seasonNumber: 2, title: 'Peekaboo', duration: '47m', description: 'Jesse attempts to collect money from drug addicts and bonds with their neglected child.' },
          { episodeNumber: 7, seasonNumber: 2, title: 'Negro y Azul', duration: '48m', description: 'A Mexican narcocorrido ballad chronicles the legend of Heisenberg.' },
          { episodeNumber: 8, seasonNumber: 2, title: 'Better Call Saul', duration: '47m', description: 'When Badger is arrested, Walt and Jesse hire flamboyant criminal attorney Saul Goodman.' },
          { episodeNumber: 9, seasonNumber: 2, title: '4 Days Out', duration: '47m', description: 'Walt and Jesse spend four marathon days cooking meth in the desert when the RV battery dies.' },
          { episodeNumber: 10, seasonNumber: 2, title: 'Over', duration: '47m', description: 'Walt learns his cancer is in remission and feels unfulfilled without his secret empire.' },
          { episodeNumber: 11, seasonNumber: 2, title: 'Mandala', duration: '48m', description: 'Saul connects Walt with mysterious, disciplined kingpin Gustavo Fring.' },
          { episodeNumber: 12, seasonNumber: 2, title: 'Phoenix', duration: '48m', description: 'Walt misses his daughter’s birth to make a million-dollar dropoff and observes a tragic event.' },
          { episodeNumber: 13, seasonNumber: 2, title: 'ABQ', duration: '47m', description: 'Air traffic control grief causes a catastrophic aerial collision over Albuquerque.' },
        ],
      },
      {
        seasonNumber: 3,
        seasonTitle: 'Season 3: The Superlab',
        episodeCount: 13,
        episodes: [
          { episodeNumber: 1, seasonNumber: 3, title: 'No Más', duration: '47m', description: 'Skyler demands a divorce. Two silent Salamanca cartel hitmen cross the border seeking Walt.' },
          { episodeNumber: 6, seasonNumber: 3, title: 'Sunset', duration: '47m', description: 'Hank tracks the RV to a junkyard with Walt and Jesse trapped inside.' },
          { episodeNumber: 7, seasonNumber: 3, title: 'One Minute', duration: '47m', description: 'Hank receives an anonymous warning one minute before the Salamanca twins ambush him.' },
          { episodeNumber: 10, seasonNumber: 3, title: 'Fly', duration: '47m', description: 'Walt becomes obsessed with a single contaminant fly inside the high-tech subterranean superlab.' },
          { episodeNumber: 12, seasonNumber: 3, title: 'Half Measures', duration: '47m', description: 'Mike delivers his famous "no more half measures" parable. Walt intervenes to save Jesse.' },
          { episodeNumber: 13, seasonNumber: 3, title: 'Full Measure', duration: '47m', description: 'With Gus planning their execution, Walt and Jesse make a desperate countermove against Gale.' },
        ],
      },
      {
        seasonNumber: 4,
        seasonTitle: 'Season 4: Face Off',
        episodeCount: 13,
        episodes: [
          { episodeNumber: 1, seasonNumber: 4, title: 'Box Cutter', duration: '47m', description: 'Gus delivers a chilling silent message with a box cutter inside the superlab.' },
          { episodeNumber: 8, seasonNumber: 4, title: 'Hermanos', duration: '47m', description: 'Flashbacks reveal the genesis of Gus Fring’s hatred for Don Eladio and Hector Salamanca.' },
          { episodeNumber: 10, seasonNumber: 4, title: 'Salud', duration: '47m', description: 'Gus and Mike bring Jesse to Mexico to wipe out the entire cartel leadership.' },
          { episodeNumber: 11, seasonNumber: 4, title: 'Crawl Space', duration: '47m', description: 'Walt discovers Skyler gave his emergency cash to Ted Beneke, triggering maniacal laughter in the crawl space.' },
          { episodeNumber: 13, seasonNumber: 4, title: 'Face Off', duration: '51m', description: 'Walt conspires with Hector Salamanca to execute Gus Fring: "I won."' },
        ],
      },
      {
        seasonNumber: 5,
        seasonTitle: 'Season 5: Ozymandias & Felina',
        episodeCount: 16,
        episodes: [
          { episodeNumber: 1, seasonNumber: 5, title: 'Live Free or Die', duration: '43m', description: 'Walt uses high-powered industrial electromagnets to erase evidence in police lockup.' },
          { episodeNumber: 5, seasonNumber: 5, title: 'Dead Freight', duration: '48m', description: 'A precision heist drains thousands of gallons of methylamine from a freight train.' },
          { episodeNumber: 7, seasonNumber: 5, title: 'Say My Name', duration: '48m', description: 'Walt demands respect from rival distributors: "Say my name." "Heisenberg." "You’re goddamn right."' },
          { episodeNumber: 8, seasonNumber: 5, title: 'Gliding Over All', duration: '48m', description: 'Hank finds Leaves of Grass with Gale’s inscription in Walt’s bathroom.' },
          { episodeNumber: 14, seasonNumber: 5, title: 'Ozymandias', duration: '48m', description: 'Tragedy in the desert shatters the White family in what is widely regarded as one of television’s finest hours.' },
          { episodeNumber: 15, seasonNumber: 5, title: 'Granite State', duration: '54m', description: 'Walt lives isolated in a snowy New Hampshire cabin as Heisenberg’s empire crumbles.' },
          { episodeNumber: 16, seasonNumber: 5, title: 'Felina', duration: '55m', description: 'Walt returns to Albuquerque with an automated machine gun turret to tie up all loose ends.' },
        ],
      },
    ],
  },

  // Wednesday (TMDB 119051, IMDb tt13443470)
  '119051': {
    totalSeasons: 2,
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: 'Season 1: Nevermore Academy',
        episodeCount: 8,
        episodes: [
          { episodeNumber: 1, seasonNumber: 1, title: 'Chapter I: Wednesday’s Child Is Full of Woe', duration: '59m', description: 'Expelled from public school for pirating piranhas, Wednesday Addams is enrolled at Nevermore Academy for outcasts.' },
          { episodeNumber: 2, seasonNumber: 1, title: 'Chapter II: Woe Is the Loneliest Number', duration: '48m', description: 'Wednesday participates in the annual Poe Cup boat race alongside cheerful roommate Enid.' },
          { episodeNumber: 3, seasonNumber: 1, title: 'Chapter III: Friend or Woe', duration: '48m', description: 'During town outreach day in Jericho, Wednesday investigates Pilgrim World founder Joseph Crackstone.' },
          { episodeNumber: 4, seasonNumber: 1, title: 'Chapter IV: Woe What a Night', duration: '49m', description: 'The Nevermore Rave’N dance features Wednesday’s iconic dance to The Cramps’ "Goo Goo Muck".' },
          { episodeNumber: 5, seasonNumber: 1, title: 'Chapter V: You Reap What You Woe', duration: '52m', description: 'Parents weekend stirs family secrets. Morticia and Gomez confront murder charges from 30 years ago.' },
          { episodeNumber: 6, seasonNumber: 1, title: 'Chapter VI: Quid Pro Woe', duration: '50m', description: 'Wednesday summons ancestor Goody Addams to uncover the identity of the forest Hyde monster.' },
          { episodeNumber: 7, seasonNumber: 1, title: 'Chapter VII: If You Don’t Woe Me by Now', duration: '47m', description: 'Uncle Fester arrives with an electric shock. The Hyde monster’s master is unveiled.' },
          { episodeNumber: 8, seasonNumber: 1, title: 'Chapter VIII: A Murder of Woes', duration: '52m', description: 'Enid transforms beneath the blood moon to battle the monster and protect Nevermore.' },
        ],
      },
      {
        seasonNumber: 2,
        seasonTitle: 'Season 2: Shadows of Nevermore',
        episodeCount: 8,
        episodes: [
          { episodeNumber: 1, seasonNumber: 2, title: 'Chapter IX: Here We Woe Again', duration: '55m', description: 'A new semester begins with fresh perils and a stalker threatening Wednesday’s sanctuary.' },
          { episodeNumber: 2, seasonNumber: 2, title: 'Chapter X: The Nevermore Return', duration: '50m', description: 'Wednesday investigates strange seismic disturbances around the Nevermore crypts.' },
          { episodeNumber: 3, seasonNumber: 2, title: 'Chapter XI: Shadows in the Mist', duration: '52m', description: 'Enid and Thing decipher cryptographic warnings hidden in ancient gargoyles.' },
          { episodeNumber: 4, seasonNumber: 2, title: 'Chapter XII: Black Dahlia', duration: '53m', description: 'A grand masquerade ball turns into a game of wits against dark forces.' },
          { episodeNumber: 5, seasonNumber: 2, title: 'Chapter XIII: Out of the Crypt', duration: '51m', description: 'Wednesday visits the Addams family ancestral archives for ancient countermeasures.' },
          { episodeNumber: 6, seasonNumber: 2, title: 'Chapter XIV: The Raven’s Cry', duration: '54m', description: 'Psychic visions test Wednesday’s sanity as the true antagonist emerges from the shadows.' },
          { episodeNumber: 7, seasonNumber: 2, title: 'Chapter XV: Blood Moon Rising', duration: '56m', description: 'Allies and outcasts join forces to defend Nevermore against an ancient curse.' },
          { episodeNumber: 8, seasonNumber: 2, title: 'Chapter XVI: Curse of the Woes', duration: '58m', description: 'The thrilling confrontation concludes with a revelation that changes the Addams lineage forever.' },
        ],
      },
    ],
  },

  // House of the Dragon (TMDB 94997, IMDb tt11198330)
  '94997': {
    totalSeasons: 2,
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: 'Season 1: Dance of the Dragons',
        episodeCount: 10,
        episodes: [
          { episodeNumber: 1, seasonNumber: 1, title: 'The Heirs of the Dragon', duration: '66m', description: 'King Viserys I convenes a great tourney and names daughter Rhaenyra his chosen heir over brother Daemon.' },
          { episodeNumber: 2, seasonNumber: 1, title: 'The Rogue Prince', duration: '54m', description: 'Daemon seizes Dragonstone. Corlys Velaryon proposes an alliance to reclaim the Stepstones.' },
          { episodeNumber: 3, seasonNumber: 1, title: 'Second of His Name', duration: '63m', description: 'A royal royal hunt marks Prince Aegon’s second name-day. Daemon takes a desperate gamble against the Crabfeeder.' },
          { episodeNumber: 4, seasonNumber: 1, title: 'King of the Narrow Sea', duration: '63m', description: 'Daemon returns victorious. Rumors threaten Rhaenyra’s standing, prompting Viserys to arrange her marriage.' },
          { episodeNumber: 5, seasonNumber: 1, title: 'We Light the Way', duration: '60m', description: 'Rhaenyra wed Laenor Velaryon. Queen Alicent wears beacon-green, declaring House Hightower’s rebellion.' },
          { episodeNumber: 6, seasonNumber: 1, title: 'The Princess and the Queen', duration: '68m', description: 'A ten-year time jump reveals escalating friction between Rhaenyra and Alicent’s growing children.' },
          { episodeNumber: 7, seasonNumber: 1, title: 'Driftmark', duration: '59m', description: 'At Laena Velaryon’s funeral, Aemond Targaryen claims the gargantuan dragon Vhagar, sparking bloodshed.' },
          { episodeNumber: 8, seasonNumber: 1, title: 'The Lord of the Tides', duration: '67m', description: 'An ailing Viserys makes his final, agonized walk to the Iron Throne to defend Rhaenyra’s lineage.' },
          { episodeNumber: 9, seasonNumber: 1, title: 'The Green Council', duration: '60m', description: 'Following Viserys’ death, the Greens hastily crown Aegon II in the Dragonpit before Rhaenys disrupts the coup.' },
          { episodeNumber: 10, seasonNumber: 1, title: 'The Black Queen', duration: '59m', description: 'Rhaenyra is crowned at Dragonstone. Lucerys flies to Storm’s End, where Vhagar strikes the first fatal blow of war.' },
        ],
      },
      {
        seasonNumber: 2,
        seasonTitle: 'Season 2: Blood and Fire',
        episodeCount: 8,
        episodes: [
          { episodeNumber: 1, seasonNumber: 2, title: 'A Son for a Son', duration: '64m', description: 'Grief-stricken by Lucerys’ death, Daemon enlists assassins Blood and Cheese inside the Red Keep.' },
          { episodeNumber: 2, seasonNumber: 2, title: 'Rhaenyra the Cruel', duration: '72m', description: 'The Green court uses royal tragedy for political propaganda. Arryk and Erryk duel to the death.' },
          { episodeNumber: 3, seasonNumber: 2, title: 'The Burning Mill', duration: '70m', description: 'Bracken and Blackwood rivalries erupt into full war. Rhaenyra sneaks into King’s Landing in a final plea for peace.' },
          { episodeNumber: 4, seasonNumber: 2, title: 'The Red Dragon and the Gold', duration: '54m', description: 'The Battle at Rook’s Rest pits Sunfyre, Meleys, and Vhagar against each other in spectacular dragon warfare.' },
          { episodeNumber: 5, seasonNumber: 2, title: 'Regent', duration: '71m', description: 'Aemond is appointed Prince Regent while King Aegon lies horribly burned.' },
          { episodeNumber: 6, seasonNumber: 2, title: 'Smallfolk', duration: '70m', description: 'Starvation sparks riots in the capital. Rhaenyra searches for dragonseeds among the smallfolk.' },
          { episodeNumber: 7, seasonNumber: 2, title: 'The Red Sowing', duration: '67m', description: 'Commoners with Targaryen blood face the dragon Vermithor in the fiery trial of the Red Sowing.' },
          { episodeNumber: 8, seasonNumber: 2, title: 'The Queen Who Ever Was', duration: '73m', description: 'Armadas gather and armies march toward the Riverlands in anticipation of a grand campaign.' },
        ],
      },
    ],
  },

  // The Last of Us (TMDB 100088, IMDb tt3581920)
  '100088': {
    totalSeasons: 1,
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: 'Season 1: Journey Across the Wasteland',
        episodeCount: 9,
        episodes: [
          { episodeNumber: 1, seasonNumber: 1, title: 'When You’re Lost in the Darkness', duration: '81m', description: 'Twenty years after a fungal outbreak devastates humanity, hardened survivor Joel is tasked with smuggling 14-year-old Ellie.' },
          { episodeNumber: 2, seasonNumber: 1, title: 'Infected', duration: '53m', description: 'Joel, Tess, and Ellie navigate the flooded ruins of Boston and encounter terrifying Clickers.' },
          { episodeNumber: 3, seasonNumber: 1, title: 'Long, Long Time', duration: '75m', description: 'The deeply moving story of survivalist Bill and unexpected partner Frank over two decades in an isolated sanctuary.' },
          { episodeNumber: 4, seasonNumber: 1, title: 'Please Hold to My Hand', duration: '45m', description: 'Joel and Ellie are ambushed by revolutionary hunters in Kansas City while traveling west.' },
          { episodeNumber: 5, seasonNumber: 1, title: 'Endure and Survive', duration: '59m', description: 'Teaming up with Henry and Sam, Joel and Ellie escape through tunnels before an infected swarm erupts from the earth.' },
          { episodeNumber: 6, seasonNumber: 1, title: 'Kin', duration: '59m', description: 'Joel reunites with brother Tommy in Jackson, Wyoming, and grapples with his emotional bond with Ellie.' },
          { episodeNumber: 7, seasonNumber: 1, title: 'Left Behind', duration: '56m', description: 'Flashbacks recount Ellie’s fateful adventure in an abandoned shopping mall with best friend Riley.' },
          { episodeNumber: 8, seasonNumber: 1, title: 'When We Are in Need', duration: '51m', description: 'While protecting a wounded Joel, Ellie encounters a charismatic preacher leading a desperate, hungry flock.' },
          { episodeNumber: 9, seasonNumber: 1, title: 'Look for the Light', duration: '43m', description: 'At the Salt Lake City hospital, Joel faces an agonizing moral ultimatum regarding humanity’s cure.' },
        ],
      },
    ],
  },

  // Shōgun (TMDB 205715, IMDb tt2788316)
  '205715': {
    totalSeasons: 1,
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: 'Season 1: The Way of the Warrior',
        episodeCount: 10,
        episodes: [
          { episodeNumber: 1, seasonNumber: 1, title: 'Chapter One: Anjin', duration: '70m', description: 'English pilot John Blackthorne is shipwrecked in feudal Japan, becoming a pawn in Lord Toranaga’s political chess match.' },
          { episodeNumber: 2, seasonNumber: 1, title: 'Chapter Two: Servants of Two Masters', duration: '59m', description: 'Toranaga appoints noblewoman Lady Mariko as translator. Blackthorne survives an assassin in Osaka Castle.' },
          { episodeNumber: 3, seasonNumber: 1, title: 'Chapter Three: Tomorrow Is Tomorrow', duration: '56m', description: 'A thrilling night escape from Osaka forces Toranaga and Blackthorne to make dangerous alliances.' },
          { episodeNumber: 4, seasonNumber: 1, title: 'Chapter Four: The Eightfold Fence', duration: '58m', description: 'Blackthorne is awarded the rank of Hatamoto and begins training Toranaga’s samurai in Western naval artillery.' },
          { episodeNumber: 5, seasonNumber: 1, title: 'Chapter Five: Broken to the Fist', duration: '57m', description: 'An unexpected earthquake strikes Toranaga’s encampment. Blackthorne saves Toranaga from a crumbling landslide.' },
          { episodeNumber: 6, seasonNumber: 1, title: 'Chapter Six: Ladies of the Willow World', duration: '59m', description: 'Toranaga’s past is explored while Mariko and Blackthorne navigate forbidden affection in the Tea House.' },
          { episodeNumber: 7, seasonNumber: 1, title: 'Chapter Seven: A Stick of Time', duration: '57m', description: 'Toranaga’s brother arrives with betrayal. A surprise raid tests family loyalties.' },
          { episodeNumber: 8, seasonNumber: 1, title: 'Chapter Eight: The Abyss of Life', duration: '58m', description: 'Toranaga feigns complete surrender to lure his enemies into overconfident complacency.' },
          { episodeNumber: 9, seasonNumber: 1, title: 'Chapter Nine: Crimson Sky', duration: '60m', description: 'Lady Mariko arrives in Osaka with iron resolve, defying Ishido and shaking the Council of Regents to its foundation.' },
          { episodeNumber: 10, seasonNumber: 1, title: 'Chapter Ten: A Dream of a Dream', duration: '64m', description: 'The masterstroke of Toranaga’s grand strategy is revealed as the dawn of a new shogunate approaches.' },
        ],
      },
    ],
  },

  // Fallout (TMDB 209867, IMDb tt12637874)
  '209867': {
    totalSeasons: 1,
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: 'Season 1: Welcome to the Wasteland',
        episodeCount: 8,
        episodes: [
          { episodeNumber: 1, seasonNumber: 1, title: 'The End', duration: '74m', description: 'When raiders breach Vault 33 and kidnap her father, optimistic Lucy MacLean ventures into the radiated Los Angeles wasteland.' },
          { episodeNumber: 2, seasonNumber: 1, title: 'The Target', duration: '65m', description: 'Lucy, the mutated bounty hunter Ghoul, and Brotherhood of Steel squire Maximus cross paths in the town of Filly.' },
          { episodeNumber: 3, seasonNumber: 1, title: 'The Head', duration: '56m', description: 'Lucy carries a rogue scientist’s severed head containing a cold fusion particle while the Ghoul uses her as bait.' },
          { episodeNumber: 4, seasonNumber: 1, title: 'The Ghouls', duration: '48m', description: 'Trapped in an automated organ-harvesting Super Duper Mart, Lucy discovers the cruel truth of wasteland survival.' },
          { episodeNumber: 5, seasonNumber: 1, title: 'The Past', duration: '45m', description: 'Maximus and Lucy bond while traversing irradiated craters. Back in Vault 33, Norm investigates Vault 32’s massacre.' },
          { episodeNumber: 6, seasonNumber: 1, title: 'The Trap', duration: '60m', description: 'Lucy and Maximus find shelter in Vault 4, where seemingly utopian dwellers worship an ominous cyclops.' },
          { episodeNumber: 7, seasonNumber: 1, title: 'The Radio', duration: '60m', description: 'Pre-war flashbacks reveal actor Cooper Howard discovering Vault-Tec’s sinister corporate agenda.' },
          { episodeNumber: 8, seasonNumber: 1, title: 'The Beginning', duration: '71m', description: 'The battle for the cold fusion reactor unfolds at the Griffith Observatory, revealing who truly dropped the first bombs.' },
        ],
      },
    ],
  },

  // Arcane (TMDB 94605, IMDb tt11126994)
  '94605': {
    totalSeasons: 2,
    seasons: [
      {
        seasonNumber: 1,
        seasonTitle: 'Season 1: Piltover & Zaun',
        episodeCount: 9,
        episodes: [
          { episodeNumber: 1, seasonNumber: 1, title: 'Welcome to the Playground', duration: '43m', description: 'Orphan sisters Vi and Powder lead a heist in the wealthy city of Piltover that goes disastrously wrong.' },
          { episodeNumber: 2, seasonNumber: 1, title: 'Some Mysteries Are Better Left Unsolved', duration: '44m', description: 'Idealistic scientist Jayce Talis experiments with dangerous arcane magic despite warning from the Academy.' },
          { episodeNumber: 3, seasonNumber: 1, title: 'The Base Violence Necessary for Change', duration: '44m', description: 'A tragic explosion tears the sisters apart, leading Powder into the arms of the underworld boss Silco.' },
          { episodeNumber: 4, seasonNumber: 1, title: 'Happy Progress Day!', duration: '40m', description: 'Years later, Piltover celebrates its technological golden age while an unstable Jinx sows chaos.' },
          { episodeNumber: 5, seasonNumber: 1, title: 'Everybody Wants to Be My Enemy', duration: '40m', description: 'Enforcer Caitlyn recruits Vi from prison to investigate corruption in the undercity.' },
          { episodeNumber: 6, seasonNumber: 1, title: 'When These Walls Come Tumbling Down', duration: '41m', description: 'The long-awaited reunion between Vi and Jinx is derailed by the emergence of the Firelights.' },
          { episodeNumber: 7, seasonNumber: 1, title: 'The Boy Savior', duration: '39m', description: 'Ekko battles his childhood friend Jinx on the bridge in a poignant time-bending confrontation.' },
          { episodeNumber: 8, seasonNumber: 1, title: 'Oil and Water', duration: '39m', description: 'Mel and Jayce negotiate political independence for Zaun while Vi arms herself with Hextech gauntlets.' },
          { episodeNumber: 9, seasonNumber: 1, title: 'The Monster You Created', duration: '41m', description: 'A tense tea party dinner forces Jinx to make an irrevocable choice with a rocket aimed at the council chamber.' },
        ],
      },
      {
        seasonNumber: 2,
        seasonTitle: 'Season 2: The Cycle Breaks',
        episodeCount: 9,
        episodes: [
          { episodeNumber: 1, seasonNumber: 2, title: 'Heavy Is the Crown', duration: '44m', description: 'In the wake of the council attack, Piltover mobilizes for total war against Zaun.' },
          { episodeNumber: 2, seasonNumber: 2, title: 'Watch It All Burn', duration: '42m', description: 'Vi dons enforcer armor to hunt down Jinx, who has become a symbol of revolutionary defiance.' },
          { episodeNumber: 3, seasonNumber: 2, title: 'Finally Got the Name Right', duration: '45m', description: 'Viktor’s transformation deepens as the Hexcore reshapes human biology.' },
          { episodeNumber: 4, seasonNumber: 2, title: 'Paint the Town Blue', duration: '43m', description: 'Zaun rallies around the blue flame of Jinx in a massive underground uprising.' },
          { episodeNumber: 5, seasonNumber: 2, title: 'Blisters and Bedrock', duration: '41m', description: 'Sisters collide once more in the deepest levels of the sump.' },
          { episodeNumber: 6, seasonNumber: 2, title: 'The Message Hidden in the Pattern', duration: '44m', description: 'Ancient magic and modern Hextech clash with catastrophic consequences.' },
          { episodeNumber: 7, seasonNumber: 2, title: 'Now You’ll See', duration: '42m', description: 'Alliances fracture as the true cost of Hextech is laid bare.' },
          { episodeNumber: 8, seasonNumber: 2, title: 'Blood and Iron', duration: '45m', description: 'Noxian forces intervene as the final battle for the twin cities begins.' },
          { episodeNumber: 9, seasonNumber: 2, title: 'The Cycle Breaks', duration: '48m', description: 'The stunning conclusion to Vi and Jinx’s story, forever altering the destiny of Runeterra.' },
        ],
      },
    ],
  },
};

/**
 * Returns complete Seasons and Episodes structure for any TV series
 * Works for both pre-seeded hit TV shows and dynamically searched TV series!
 */
export function getSeriesSeasons(item: MediaItem): SeriesSeason[] {
  if (!item) return [];

  const tmdbKey = String(item.tmdbId || '').trim();
  const idKey = String(item.id || '').replace(/^viduki-(?:movie-|tv-|direct-)?/, '').trim();

  // 1. Direct hit in curated catalog
  if (tmdbKey && KNOWN_SERIES_CATALOG[tmdbKey]) {
    return KNOWN_SERIES_CATALOG[tmdbKey].seasons;
  }
  if (idKey && KNOWN_SERIES_CATALOG[idKey]) {
    return KNOWN_SERIES_CATALOG[idKey].seasons;
  }

  // Check by clean title
  const cleanTitle = cleanSeriesTitle(item.title).toLowerCase();
  for (const [key, entry] of Object.entries(KNOWN_SERIES_CATALOG)) {
    if (cleanTitle.includes('game of thrones') && key === '1399') return entry.seasons;
    if (cleanTitle.includes('stranger things') && key === '66732') return entry.seasons;
    if (cleanTitle.includes('breaking bad') && key === '1396') return entry.seasons;
    if (cleanTitle.includes('wednesday') && key === '119051') return entry.seasons;
    if (cleanTitle.includes('house of the dragon') && key === '94997') return entry.seasons;
    if (cleanTitle.includes('last of us') && key === '100088') return entry.seasons;
    if (cleanTitle.includes('shogun') && key === '205715') return entry.seasons;
    if (cleanTitle.includes('shōgun') && key === '205715') return entry.seasons;
    if (cleanTitle.includes('fallout') && key === '209867') return entry.seasons;
    if (cleanTitle.includes('arcane') && key === '94605') return entry.seasons;
  }

  // 2. Dynamic generation for ANY other TV show:
  // Determine season count from item rating (e.g. "TV-MA • 4 Seasons"), description, or default
  let estimatedSeasons = 3;
  const ratingMatch = (item.rating || '').match(/(\d+)\s*Seasons?/i);
  const descMatch = (item.description || '').match(/(\d+)\s*Seasons?/i);
  if (ratingMatch) {
    estimatedSeasons = Math.max(1, Math.min(20, parseInt(ratingMatch[1], 10)));
  } else if (descMatch) {
    estimatedSeasons = Math.max(1, Math.min(20, parseInt(descMatch[1], 10)));
  } else if (item.season && item.season > 3) {
    estimatedSeasons = Math.max(item.season, 4);
  }

  const generatedSeasons: SeriesSeason[] = [];

  for (let s = 1; s <= estimatedSeasons; s++) {
    // Standard TV seasons have 8 to 12 episodes
    const epsInSeason = s === 1 ? 10 : 8;
    const episodes: SeriesEpisode[] = [];

    for (let e = 1; e <= epsInSeason; e++) {
      episodes.push({
        episodeNumber: e,
        seasonNumber: s,
        title: `Episode ${e}`,
        duration: '48m',
        description: `Stream Season ${s}, Episode ${e} of ${cleanSeriesTitle(item.title)} on Viduki.`,
      });
    }

    generatedSeasons.push({
      seasonNumber: s,
      seasonTitle: `Season ${s}`,
      episodeCount: epsInSeason,
      episodes,
    });
  }

  return generatedSeasons;
}
