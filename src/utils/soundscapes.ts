// Ambient audio synthesis using Web Audio API for continuous peaceful sleep soundscapes

class SoundscapeSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: { stop?: () => void; disconnect?: () => void }[] = [];
  private currentType: string | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.masterGain && this.ctx) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.1);
    }
  }

  public stop() {
    this.activeNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {
        // ignore already stopped nodes
      }
    });
    this.activeNodes = [];
    this.currentType = null;
  }

  public play(type: 'rain' | 'campfire' | 'ocean' | 'cafe' | 'thunder' | 'whitenoise', volume = 0.5) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.stop();
    this.currentType = type;
    this.setVolume(volume);

    switch (type) {
      case 'rain':
        this.startRainSoundscape();
        break;
      case 'ocean':
        this.startOceanSoundscape();
        break;
      case 'campfire':
        this.startCampfireSoundscape();
        break;
      case 'cafe':
        this.startCafeSoundscape();
        break;
      case 'thunder':
        this.startThunderSoundscape();
        break;
      case 'whitenoise':
        this.startWhiteNoiseSoundscape();
        break;
    }
  }

  private createPinkNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private startRainSoundscape() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer();
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1200;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 350;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.6;

    noiseSource.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start();
    this.activeNodes.push(noiseSource, highpass, lowpass, gain);
  }

  private startOceanSoundscape() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer();
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    // LFO to modulate filter frequency simulating waves coming in and out
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // ~10 sec wave cycles

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 350;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = this.ctx.createGain();
    gain.gain.value = 0.8;

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start();
    lfo.start();
    this.activeNodes.push(noiseSource, filter, lfo, lfoGain, gain);
  }

  private startCampfireSoundscape() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer();
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 600;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;

    noiseSource.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start();
    this.activeNodes.push(noiseSource, lowpass, gain);
  }

  private startCafeSoundscape() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer();
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.5;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start();
    this.activeNodes.push(noiseSource, filter, gain);
  }

  private startThunderSoundscape() {
    this.startRainSoundscape();
  }

  private startWhiteNoiseSoundscape() {
    if (!this.ctx || !this.masterGain) return;
    const buffer = this.createPinkNoiseBuffer();
    if (!buffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start();
    this.activeNodes.push(noiseSource, filter, gain);
  }
}

export const soundscapePlayer = new SoundscapeSynthesizer();
