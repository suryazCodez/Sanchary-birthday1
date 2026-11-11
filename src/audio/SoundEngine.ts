/**
 * Procedural Web Audio API sound engine for cozy mountain ambience,
 * dynamic wind simulation, snowy footsteps, fireplace crackle, and birthday celebration.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windLfo: OscillatorNode | null = null;
  private fireGain: GainNode | null = null;
  private fireInterval: number | null = null;
  private isInside: boolean = false;
  private windIntensity: number = 0.5; // 0 to 1
  private isInitialized: boolean = false;

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startWind();
      this.startFireplace();
      this.isInitialized = true;
    } catch (err) {
      console.warn('Web Audio init failed or user interaction required', err);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.1);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setEnvironment(isInside: boolean) {
    this.isInside = isInside;
    if (!this.ctx || !this.windFilter || !this.windGain || !this.fireGain) return;

    const t = this.ctx.currentTime;
    if (isInside) {
      // Muffled outside wind through cabin walls
      this.windFilter.frequency.setTargetAtTime(220, t, 0.8);
      this.windFilter.Q.setTargetAtTime(1.5, t, 0.8);
      this.windGain.gain.setTargetAtTime(0.18, t, 0.8);
      // Hearth crackle becomes intimate and warm
      this.fireGain.gain.setTargetAtTime(0.35, t, 0.8);
    } else {
      // Crisp alpine mountain wind
      this.windFilter.frequency.setTargetAtTime(520, t, 0.8);
      this.windFilter.Q.setTargetAtTime(3.0, t, 0.8);
      this.windGain.gain.setTargetAtTime(0.42, t, 0.8);
      // Muffled distant fire
      this.fireGain.gain.setTargetAtTime(0.04, t, 0.8);
    }
  }

  public setWindIntensity(intensity: number) {
    this.windIntensity = Math.max(0.1, Math.min(1.0, intensity));
    if (!this.ctx || !this.windGain || !this.windFilter) return;

    const t = this.ctx.currentTime;
    const baseGain = this.isInside ? 0.15 : 0.35;
    const targetGain = baseGain * (0.6 + this.windIntensity * 0.8);
    this.windGain.gain.setTargetAtTime(targetGain, t, 0.3);

    const baseFreq = this.isInside ? 200 : 450;
    this.windFilter.frequency.setTargetAtTime(baseFreq + this.windIntensity * 320, t, 0.3);
  }

  private startWind() {
    if (!this.ctx || !this.masterGain) return;

    // Create 5 seconds buffer of pink/white noise
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Resonant bandpass filter
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.38, this.ctx.currentTime);

    // Subtle LFO for breathing wind gust swells
    this.windLfo = this.ctx.createOscillator();
    this.windLfo.frequency.setValueAtTime(0.18, this.ctx.currentTime); // ~5.5s cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);

    this.windLfo.connect(lfoGain);
    lfoGain.connect(this.windFilter.frequency);

    whiteNoise.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    whiteNoise.start();
    this.windLfo.start();
  }

  private startFireplace() {
    if (!this.ctx || !this.masterGain) return;

    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    this.fireGain.connect(this.masterGain);

    // Procedural random crackle generator
    this.fireInterval = window.setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const popProbability = this.isInside ? 0.75 : 0.25;
      if (Math.random() < popProbability) {
        this.triggerFireCrackle();
      }
    }, 120);
  }

  private triggerFireCrackle() {
    if (!this.ctx || !this.fireGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = Math.random() > 0.5 ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(120 + Math.random() * 480, this.ctx.currentTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 + Math.random() * 1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(4, this.ctx.currentTime);

    const now = this.ctx.currentTime;
    const dur = 0.015 + Math.random() * 0.035;
    const vol = (0.05 + Math.random() * 0.15) * (this.isInside ? 1.0 : 0.2);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.fireGain);

    osc.start(now);
    osc.stop(now + dur);
  }

  public playSnowFootstep() {
    if (!this.ctx || this.isMuted || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Snow crunch: low thud + filtered high crunch
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90 + Math.random() * 30, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.isInside ? 250 : 650, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.15);

    // Crunch texture
    if (!this.isInside) {
      const bufferSize = this.ctx.sampleRate * 0.08;
      const noise = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noise;
      const crunchFilter = this.ctx.createBiquadFilter();
      crunchFilter.type = 'highpass';
      crunchFilter.frequency.setValueAtTime(1400, now);

      const crunchGain = this.ctx.createGain();
      crunchGain.gain.setValueAtTime(0.09, now);
      crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noiseNode.connect(crunchFilter);
      crunchFilter.connect(crunchGain);
      crunchGain.connect(this.masterGain);

      noiseNode.start(now);
    }
  }

  public playDoorCreak() {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.7);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.9);
  }

  public playChestOpen() {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Magical sparkle chime arpeggio: C5, E5, G5, B5, C6
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      const noteTime = now + idx * 0.08;
      gain.gain.setValueAtTime(0.15, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.55);
    });
  }

  public playCandleBlowPuff() {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    // Soft airy whoosh
    const bufferSize = this.ctx.sampleRate * 0.45;
    const noise = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(280, now + 0.45);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseNode.start(now);
  }

  public playCheerAndFanfare() {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Joyous celebratory chime chords
    const chord1 = [523.25, 659.25, 783.99, 1046.5]; // C major
    const chord2 = [587.33, 739.99, 880.0, 1174.66]; // D major
    const chord3 = [659.25, 830.61, 987.77, 1318.51]; // E major

    const playChord = (frequencies: number[], start: number, duration: number) => {
      frequencies.forEach(f => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.09, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + duration);
      });
    };

    playChord(chord1, now, 0.4);
    playChord(chord2, now + 0.35, 0.4);
    playChord(chord3, now + 0.7, 1.2);

    // Warm clapping simulation
    for (let i = 0; i < 18; i++) {
      const clapTime = now + 0.2 + Math.random() * 1.5;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320 + Math.random() * 200, clapTime);

      gain.gain.setValueAtTime(0.06, clapTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(clapTime);
      osc.stop(clapTime + 0.05);
    }
  }

  public playBirthdayMelody() {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Happy Birthday notes:
    // C4, C4, D4, C4, F4, E4
    // C4, C4, D4, C4, G4, F4
    // C4, C4, C5, A4, F4, E4, D4
    // Bb4, Bb4, A4, F4, G4, F4
    const notes: [number, number, number][] = [
      // freq, startOffset, duration
      [261.63, 0.0, 0.25],
      [261.63, 0.28, 0.25],
      [293.66, 0.56, 0.45],
      [261.63, 1.05, 0.45],
      [349.23, 1.55, 0.45],
      [329.63, 2.05, 0.8],

      [261.63, 3.0, 0.25],
      [261.63, 3.28, 0.25],
      [293.66, 3.56, 0.45],
      [261.63, 4.05, 0.45],
      [392.00, 4.55, 0.45],
      [349.23, 5.05, 0.8],

      [261.63, 6.0, 0.25],
      [261.63, 6.28, 0.25],
      [523.25, 6.56, 0.45],
      [440.00, 7.05, 0.45],
      [349.23, 7.55, 0.45],
      [329.63, 8.05, 0.45],
      [293.66, 8.55, 0.8],

      [466.16, 9.5, 0.25],
      [466.16, 9.78, 0.25],
      [440.00, 10.06, 0.45],
      [349.23, 10.55, 0.45],
      [392.00, 11.05, 0.45],
      [349.23, 11.55, 1.2],
    ];

    notes.forEach(([freq, offset, dur]) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine'; // Warm celesta / music box tone
      osc.frequency.setValueAtTime(freq, now + offset);

      const startTime = now + offset;
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);
    });
  }

  public playCakeCutSlice() {
    if (!this.ctx || this.isMuted || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public dispose() {
    if (this.fireInterval) {
      clearInterval(this.fireInterval);
      this.fireInterval = null;
    }
    if (this.windLfo) {
      try { this.windLfo.stop(); } catch { /* ignore */ }
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      try { this.ctx.close(); } catch { /* ignore */ }
    }
    this.isInitialized = false;
  }
}

export const soundEngine = new SoundEngine();
