/**
 * Web Audio API synthesizer for romantic ringtones, call chimes, and heartbeat pings.
 * Completely zero-dependency and plays without external media files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

let ringtoneInterval: number | null = null;

/**
 * Play a gentle romantic incoming/outgoing ringtone loop
 */
export function startRingtone() {
  stopRingtone();
  
  const playNotes = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Melody: C5, E5, G5, A5 soft sine wave arpeggio
      const notes = [523.25, 659.25, 783.99, 880.00];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.18);
        
        gain.gain.setValueAtTime(0.0001, now + index * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + index * 0.18);
        osc.stop(now + index * 0.18 + 0.4);
      });
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  playNotes();
  ringtoneInterval = window.setInterval(playNotes, 2400);
}

export function stopRingtone() {
  if (ringtoneInterval !== null) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

/**
 * Play call connected chime
 */
export function playCallConnected() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25]; // A major chord
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });
  } catch {
    // Ignore
  }
}

/**
 * Play call ended tone
 */
export function playCallEnded() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {
    // Ignore
  }
}

/**
 * Play heartbeat double-pulse sound for Love Pings
 */
export function playHeartbeatSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const playThump = (time: number, freq: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + 0.12);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.15);
    };

    // Lub-dub double pulse
    playThump(now, 85, 0.25);
    playThump(now + 0.18, 75, 0.2);
  } catch {
    // Ignore
  }
}

/**
 * Play message sent/received chime
 */
export function playMessageChime(isSent: boolean = false) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    
    if (isSent) {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
    } else {
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12); // C6
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Ignore
  }
}

// --- FUNNY SOUNDBOARD SYNTHESIZERS ---

export function playAirhorn() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const blasts = [0, 0.13, 0.26, 0.44];
    const freqs = [466.16, 523.25, 587.33]; // Bb4, C5, D5 brass stack

    blasts.forEach((blastOffset, i) => {
      const isLong = i === blasts.length - 1;
      const blastLen = isLong ? 0.45 : 0.09;
      const blastStart = now + blastOffset;

      freqs.forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, blastStart);
        osc.frequency.exponentialRampToValueAtTime(f * 1.05, blastStart + blastLen);

        gain.gain.setValueAtTime(0.001, blastStart);
        gain.gain.exponentialRampToValueAtTime(0.12, blastStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, blastStart + blastLen);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(blastStart);
        osc.stop(blastStart + blastLen + 0.05);
      });
    });
  } catch {}
}

export function playRimshot() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Ba (low tom)
    const tom1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    tom1.type = 'triangle';
    tom1.frequency.setValueAtTime(180, now);
    tom1.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    tom1.connect(gain1);
    gain1.connect(ctx.destination);
    tom1.start(now);
    tom1.stop(now + 0.09);

    // Dum (high snare)
    const tom2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    tom2.type = 'triangle';
    tom2.frequency.setValueAtTime(240, now + 0.12);
    tom2.frequency.exponentialRampToValueAtTime(110, now + 0.2);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    tom2.connect(gain2);
    gain2.connect(ctx.destination);
    tom2.start(now + 0.12);
    tom2.stop(now + 0.21);

    // Tss (cymbal splash white noise)
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now + 0.28);
    noiseGain.gain.exponentialRampToValueAtTime(0.22, now + 0.29);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now + 0.28);
    noise.stop(now + 0.7);
  } catch {}
}

export function playVictory() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const melody = [
      { f: 523.25, d: 0.12, t: 0 },       // C5
      { f: 659.25, d: 0.12, t: 0.12 },    // E5
      { f: 783.99, d: 0.12, t: 0.24 },    // G5
      { f: 1046.50, d: 0.35, t: 0.36 },   // C6
    ];
    melody.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, now + note.t);
      gain.gain.setValueAtTime(0.001, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.12, now + note.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.t + note.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.05);
    });
  } catch {}
}

export function playBuzzer() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(140, now);
    osc2.frequency.setValueAtTime(144, now); // dissonance
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.42);
    osc2.stop(now + 0.42);
  } catch {}
}

export function playBoing() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.35);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch {}
}

export function playLaser() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {}
}

export function playLevelUp() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [440, 554, 659, 880, 1108, 1318];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.05);
      gain.gain.setValueAtTime(0.001, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.05 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.15);
    });
  } catch {}
}

export function playQuack() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.25);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {}
}

export function playApplause() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Rapid clapping bursts
    for (let c = 0; c < 12; c++) {
      const clapTime = now + c * 0.05 + Math.random() * 0.02;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350 + Math.random() * 200, clapTime);
      gain.gain.setValueAtTime(0.15, clapTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(clapTime);
      osc.stop(clapTime + 0.05);
    }
  } catch {}
}

export function playDrama() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now); // A2 deep brass
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.3);
  } catch {}
}

export const SOUNDBOARD_PRESETS = [
  { id: 'airhorn', name: 'Air Horn', emoji: '📢', play: playAirhorn, color: 'from-amber-500 to-orange-500' },
  { id: 'rimshot', name: 'Ba-Dum-Tss', emoji: '🥁', play: playRimshot, color: 'from-blue-500 to-indigo-500' },
  { id: 'victory', name: 'Victory', emoji: '🏆', play: playVictory, color: 'from-emerald-500 to-teal-500' },
  { id: 'buzzer', name: 'Buzzer Fail', emoji: '❌', play: playBuzzer, color: 'from-rose-500 to-red-600' },
  { id: 'boing', name: 'Boing Spring', emoji: '🦘', play: playBoing, color: 'from-yellow-400 to-amber-500' },
  { id: 'laser', name: 'Laser Pew', emoji: '🔫', play: playLaser, color: 'from-purple-500 to-pink-500' },
  { id: 'levelup', name: 'Level Up', emoji: '✨', play: playLevelUp, color: 'from-cyan-500 to-blue-500' },
  { id: 'quack', name: 'Duck Quack', emoji: '🦆', play: playQuack, color: 'from-lime-500 to-green-500' },
  { id: 'applause', name: 'Applause', emoji: '👏', play: playApplause, color: 'from-fuchsia-500 to-rose-500' },
  { id: 'drama', name: 'Drama Horn', emoji: '😱', play: playDrama, color: 'from-slate-700 to-slate-900' },
];

export function playSoundboardById(id: string) {
  const sound = SOUNDBOARD_PRESETS.find((s) => s.id === id);
  if (sound) {
    sound.play();
  }
}

// --- Live Chess Audio Cues ---
export function playChessMoveSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch {}
}

export function playChessCaptureSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch {}
}

export function playChessCheckSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc2.frequency.setValueAtTime(880, now + 0.08); // A5

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.28);
  } catch {}
}

/**
 * Play a sparkling celebratory sound when mutual spark occurs
 */
export function playSparkCelebrationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 987.77, 1046.5]; // C5, E5, G5, B5, C6
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.001, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.09 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.65);
    });
  } catch {}
}

/**
 * Play a soft tick for speed round countdown
 */
export function playSpeedRoundTickSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  } catch {}
}

/**
 * Play dilemma answer select pop
 */
export function playDilemmaSelectSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch {}
}

/**
 * Synthesize a warm melodic voice note prompt playback
 */
export function playVoicePromptSynthesizer(durationSec: number = 7, onEnded?: () => void): () => void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return () => {};
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 440.00, 523.25, 392.00, 329.63, 261.63, 293.66, 349.23, 440.00, 523.25];
    const oscillators: OscillatorNode[] = [];
    const stepDuration = 0.55;
    const count = Math.floor(durationSec / stepDuration);

    for (let i = 0; i < count; i++) {
      const freq = notes[i % notes.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = now + i * stepDuration;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);
      // Gentle vibrato
      osc.frequency.linearRampToValueAtTime(freq * 1.02, noteStart + 0.2);
      osc.frequency.linearRampToValueAtTime(freq, noteStart + 0.45);

      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + stepDuration - 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + stepDuration);
      oscillators.push(osc);
    }

    const timer = setTimeout(() => {
      onEnded?.();
    }, durationSec * 1000);

    return () => {
      clearTimeout(timer);
      oscillators.forEach(o => {
        try { o.stop(); } catch {}
      });
    };
  } catch {
    return () => {};
  }
}


