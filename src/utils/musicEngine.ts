import { MusicTrack } from '../types';

export const MUSIC_CATALOG: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'Midnight Starlight Lofi',
    artist: 'Haven Chill Session',
    genre: 'Lofi Chill / Rhodes',
    duration: 180,
    coverEmoji: '✨',
    coverGradient: 'from-purple-600 via-indigo-600 to-pink-500',
    mood: 'lofi',
    bpm: 76,
    synthTheme: 'lofi',
  },
  {
    id: 'track-2',
    title: 'Golden Hour Romance',
    artist: 'Acoustic Whispers',
    genre: 'Romantic Acoustic',
    duration: 195,
    coverEmoji: '🌅',
    coverGradient: 'from-amber-500 via-rose-500 to-pink-500',
    mood: 'romantic',
    bpm: 80,
    synthTheme: 'romantic',
  },
  {
    id: 'track-3',
    title: 'Rainy Night In Paris',
    artist: 'Café de L\'Amour',
    genre: 'Cozy Rain & Accordion',
    duration: 210,
    coverEmoji: '🌧️',
    coverGradient: 'from-blue-600 via-slate-700 to-indigo-800',
    mood: 'cafe',
    bpm: 72,
    synthTheme: 'cafe',
  },
  {
    id: 'track-4',
    title: 'Under the Stars (Piano Solo)',
    artist: 'Nocturne Sanctuary',
    genre: 'Classical Gentle Piano',
    duration: 185,
    coverEmoji: '🎹',
    coverGradient: 'from-sky-600 via-indigo-700 to-slate-900',
    mood: 'peaceful',
    bpm: 65,
    synthTheme: 'peaceful',
  },
  {
    id: 'track-5',
    title: 'Warm Honey Hugs',
    artist: 'Sweetheart Acoustics',
    genre: 'Warm Acoustic Duo',
    duration: 170,
    coverEmoji: '🍯',
    coverGradient: 'from-amber-400 via-orange-500 to-rose-400',
    mood: 'romantic',
    bpm: 84,
    synthTheme: 'romantic',
  },
  {
    id: 'track-6',
    title: 'Cosmic Voyage Synth',
    artist: 'Galaxy Lovers',
    genre: 'Mellow Synthwave',
    duration: 200,
    coverEmoji: '🚀',
    coverGradient: 'from-violet-700 via-fuchsia-600 to-indigo-900',
    mood: 'synth',
    bpm: 92,
    synthTheme: 'synth',
  },
  {
    id: 'track-7',
    title: 'Sweet Dreams Lullaby',
    artist: 'Dreamcatcher Ensemble',
    genre: 'Celesta & Ambient Strings',
    duration: 220,
    coverEmoji: '🌙',
    coverGradient: 'from-indigo-900 via-purple-900 to-slate-950',
    mood: 'ambient',
    bpm: 60,
    synthTheme: 'ambient',
  },
  {
    id: 'track-8',
    title: 'Sunday Morning Coffee',
    artist: 'Chillout Lounge',
    genre: 'Neo-Soul Groove',
    duration: 190,
    coverEmoji: '☕',
    coverGradient: 'from-amber-600 via-yellow-600 to-rose-700',
    mood: 'lofi',
    bpm: 82,
    synthTheme: 'lofi',
  },
  {
    id: 'track-9',
    title: 'Cherry Blossom Walk',
    artist: 'Zen Garden Sessions',
    genre: 'Koto & Gentle Wind',
    duration: 205,
    coverEmoji: '🌸',
    coverGradient: 'from-pink-400 via-rose-300 to-amber-200',
    mood: 'peaceful',
    bpm: 68,
    synthTheme: 'peaceful',
  },
  {
    id: 'track-10',
    title: 'Deep Cloud Reverie',
    artist: 'Sleep Sanctuary Labs',
    genre: 'Binaural Sleep Drone',
    duration: 240,
    coverEmoji: '☁️',
    coverGradient: 'from-teal-600 via-cyan-800 to-slate-900',
    mood: 'ambient',
    bpm: 55,
    synthTheme: 'ambient',
  },
];

class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private customAudio: HTMLAudioElement | null = null;
  private customSource: MediaElementAudioSourceNode | null = null;
  private loopInterval: number | null = null;

  private currentTrack: MusicTrack | null = null;
  private isPlaying = false;
  private playbackStartTime = 0;
  private pausedAtTime = 0;
  private volume = (() => {
    try {
      const saved = localStorage.getItem('haven_music_volume');
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    } catch {}
    return 0.75;
  })();

  private noteStep = 0;

  private getAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode | null {
    this.getAudioContext();
    return this.analyser;
  }

  public play(track: MusicTrack, seekSeconds = 0) {
    this.getAudioContext();
    this.stopInternal();

    this.currentTrack = track;
    this.isPlaying = true;
    this.pausedAtTime = seekSeconds;
    this.playbackStartTime = Date.now() - seekSeconds * 1000;
    this.noteStep = Math.floor(seekSeconds * 2);

    if (track.url) {
      // Stream custom audio URL (using standard HTMLAudioElement for reliable mobile playback)
      try {
        if (!this.customAudio) {
          this.customAudio = new Audio();
          this.customAudio.loop = true;
        }
        this.customAudio.src = track.url;
        this.customAudio.currentTime = seekSeconds;
        this.customAudio.volume = Math.max(0, Math.min(1, this.volume));
        this.customAudio.muted = this.volume === 0;
        this.customAudio.play().catch(() => {});
      } catch {
        // fallback
      }
    } else {
      // Start Procedural Synthesizer
      this.startSynthesizer(track);
    }
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.pausedAtTime = this.getCurrentTime();
    this.stopInternal();
  }

  public resume() {
    if (!this.currentTrack) {
      this.play(MUSIC_CATALOG[0], 0);
      return;
    }
    this.play(this.currentTrack, this.pausedAtTime);
  }

  public seek(seconds: number) {
    if (!this.currentTrack) return;
    const wasPlaying = this.isPlaying;
    this.play(this.currentTrack, seconds);
    if (!wasPlaying) {
      this.pause();
      this.pausedAtTime = seconds;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('haven_music_volume', this.volume.toString());
    } catch {}

    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
      if (this.ctx && this.ctx.state === 'running') {
        try {
          this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        } catch {
          // Ignore automation curve errors
        }
      }
    }
    if (this.customAudio) {
      this.customAudio.volume = this.volume;
      this.customAudio.muted = this.volume === 0;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentTime(): number {
    if (!this.currentTrack) return 0;
    if (!this.isPlaying) return this.pausedAtTime;
    const elapsed = (Date.now() - this.playbackStartTime) / 1000;
    return elapsed % this.currentTrack.duration;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  private stopInternal() {
    if (this.loopInterval !== null) {
      window.clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.customAudio) {
      this.customAudio.pause();
    }
  }

  private startSynthesizer(track: MusicTrack) {
    const ctx = this.getAudioContext();
    const intervalMs = Math.round((60 / track.bpm) * 500); // 8th notes

    // Chords and scales for different musical atmospheres
    const scales: Record<string, number[][]> = {
      lofi: [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0],  // Am7
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [196.0, 246.94, 293.66, 349.23], // G7
      ],
      romantic: [
        [329.63, 392.0, 493.88, 659.25], // Em
        [261.63, 329.63, 392.0, 523.25], // C
        [196.0, 246.94, 293.66, 392.0],  // G
        [293.66, 369.99, 440.0, 587.33], // D
      ],
      cafe: [
        [261.63, 311.13, 392.0, 466.16], // Cm7
        [174.61, 207.65, 261.63, 311.13], // Fm7
        [233.08, 293.66, 349.23, 415.3], // Bb7
        [155.56, 196.0, 233.08, 277.18], // Ebmaj7
      ],
      peaceful: [
        [523.25, 659.25, 783.99, 1046.5], // C5 arpeggio
        [440.0, 523.25, 659.25, 880.0],   // A4
        [349.23, 440.0, 523.25, 698.46],  // F4
        [392.0, 493.88, 587.33, 783.99],  // G4
      ],
      ambient: [
        [130.81, 196.0, 261.63, 392.0],   // C3 open 5th
        [110.0, 164.81, 220.0, 329.63],   // A2
        [87.31, 130.81, 174.61, 261.63],  // F2
        [98.0, 146.83, 196.0, 293.66],    // G2
      ],
      synth: [
        [130.81, 261.63, 311.13, 392.0],  // Cm retro
        [116.54, 233.08, 293.66, 349.23], // Bb retro
        [103.83, 207.65, 261.63, 311.13], // Ab retro
        [98.0, 196.0, 246.94, 293.66],    // G retro
      ],
    };

    const activeScale = scales[track.synthTheme] || scales.lofi;

    const playBeat = () => {
      if (!this.isPlaying || !this.masterGain) return;
      try {
        const now = ctx.currentTime;
        const chordIndex = Math.floor(this.noteStep / 8) % activeScale.length;
        const chord = activeScale[chordIndex];
        const noteIndex = this.noteStep % chord.length;
        const freq = chord[noteIndex];

        // 1. Lead Arpeggio Melody
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (track.synthTheme === 'synth') {
          osc.type = 'sawtooth';
        } else if (track.synthTheme === 'ambient') {
          osc.type = 'sine';
        } else if (track.synthTheme === 'peaceful') {
          osc.type = 'triangle';
        } else {
          osc.type = 'sine';
        }

        osc.frequency.setValueAtTime(freq, now);

        const attackTime = track.synthTheme === 'ambient' ? 0.2 : 0.03;
        const releaseTime = track.synthTheme === 'ambient' ? 1.2 : 0.45;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + attackTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + releaseTime + 0.1);

        // 2. Soft warm bass on first beat of chord
        if (this.noteStep % 8 === 0) {
          const bassOsc = ctx.createOscillator();
          const bassGain = ctx.createGain();
          bassOsc.type = 'sine';
          bassOsc.frequency.setValueAtTime(chord[0] / 2, now);
          bassGain.gain.setValueAtTime(0.0001, now);
          bassGain.gain.exponentialRampToValueAtTime(0.24, now + 0.05);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
          bassOsc.connect(bassGain);
          bassGain.connect(this.masterGain);
          bassOsc.start(now);
          bassOsc.stop(now + 1.3);
        }

        // 3. Gentle Vinyl / Rimshot tick on alternate beats (for lofi/cafe)
        if ((track.synthTheme === 'lofi' || track.synthTheme === 'cafe') && this.noteStep % 2 === 1) {
          const noiseOsc = ctx.createOscillator();
          const noiseGain = ctx.createGain();
          noiseOsc.type = 'triangle';
          noiseOsc.frequency.setValueAtTime(800 + Math.random() * 400, now);
          noiseGain.gain.setValueAtTime(0.02, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
          noiseOsc.connect(noiseGain);
          noiseGain.connect(this.masterGain);
          noiseOsc.start(now);
          noiseOsc.stop(now + 0.06);
        }

        this.noteStep++;
      } catch {
        // Ignore audio interruptions
      }
    };

    playBeat();
    this.loopInterval = window.setInterval(playBeat, intervalMs);
  }
}

export const musicEngine = new MusicEngine();
