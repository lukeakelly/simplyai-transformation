import { STORAGE_KEYS } from '../game/config';

type SfxType =
  | 'collect'
  | 'bash'
  | 'combo'
  | 'mission'
  | 'powerup'
  | 'ability'
  | 'warn'
  | 'client'
  | 'one_firm'
  | 'boss_hit'
  | 'boss_defeat'
  | 'hit'
  | 'ui_click'
  | 'ui_hover';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private muted = false;
  private musicVol = 0.55;
  private sfxVol = 0.75;
  private musicNodes: OscillatorNode[] = [];
  private musicGainNodes: GainNode[] = [];
  private musicInterval: number | null = null;
  private comboLevel = 0;
  private oneFirmActive = false;
  private surgeActive = false;
  private started = false;

  constructor() {
    this.muted = localStorage.getItem(STORAGE_KEYS.SOUND_MUTE) === '1';
    this.musicVol = parseFloat(localStorage.getItem(STORAGE_KEYS.MUSIC_VOL) ?? '0.55');
    this.sfxVol = parseFloat(localStorage.getItem(STORAGE_KEYS.SFX_VOL) ?? '0.75');
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.applyVolumes();
      this.started = true;
    } catch {
      // audio not available
    }
  }

  private applyVolumes() {
    if (!this.ctx) return;
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.musicGain.gain.value = this.musicVol;
    this.sfxGain.gain.value = this.sfxVol;
  }

  setMute(muted: boolean) {
    this.muted = muted;
    this.applyVolumes();
    localStorage.setItem(STORAGE_KEYS.SOUND_MUTE, muted ? '1' : '0');
  }

  toggleMute() {
    this.setMute(!this.muted);
    return this.muted;
  }

  isMuted() { return this.muted; }

  setMusicVol(v: number) {
    this.musicVol = Math.max(0, Math.min(1, v));
    this.applyVolumes();
    localStorage.setItem(STORAGE_KEYS.MUSIC_VOL, String(this.musicVol));
  }

  setSfxVol(v: number) {
    this.sfxVol = Math.max(0, Math.min(1, v));
    this.applyVolumes();
    localStorage.setItem(STORAGE_KEYS.SFX_VOL, String(this.sfxVol));
  }

  // ─── Procedural SFX ─────────────────────────────────────────────────────────

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3, ramp = true) {
    if (!this.ctx || !this.started) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      if (ramp) g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch { /* ignore */ }
  }

  private chord(freqs: number[], duration: number, type: OscillatorType = 'sine', gain = 0.2) {
    freqs.forEach((f) => this.tone(f, duration, type, gain));
  }

  playSfx(type: SfxType) {
    if (!this.ctx || !this.started) return;
    const t = this.ctx.currentTime;
    switch (type) {
      case 'collect':
        this.tone(880, 0.12, 'sine', 0.25);
        setTimeout(() => this.tone(1100, 0.1, 'sine', 0.2), 80);
        break;
      case 'bash':
        this.noise(0.08, 0.4);
        this.tone(120, 0.15, 'sawtooth', 0.4);
        break;
      case 'combo':
        this.chord([523, 659, 784], 0.2, 'sine', 0.2);
        break;
      case 'mission':
        this.chord([523, 659, 784, 1046], 0.4, 'triangle', 0.25);
        setTimeout(() => this.tone(1200, 0.3, 'sine', 0.3), 150);
        break;
      case 'powerup':
        this.tone(440, 0.08, 'sine', 0.3);
        setTimeout(() => this.tone(660, 0.08, 'sine', 0.3), 80);
        setTimeout(() => this.tone(880, 0.15, 'sine', 0.3), 160);
        break;
      case 'ability':
        this.chord([330, 440, 550, 660], 0.5, 'triangle', 0.25);
        this.noise(0.05, 0.6);
        break;
      case 'warn':
        this.tone(330, 0.15, 'sawtooth', 0.35);
        setTimeout(() => this.tone(280, 0.15, 'sawtooth', 0.35), 200);
        break;
      case 'client':
        this.chord([523, 784, 1046], 0.35, 'sine', 0.3);
        this.noise(0.03, 0.2);
        break;
      case 'one_firm':
        this.chord([261, 329, 392, 523, 659, 784], 1.2, 'sine', 0.22);
        this.noise(0.12, 0.5);
        break;
      case 'boss_hit':
        this.tone(80, 0.2, 'sawtooth', 0.5);
        this.noise(0.1, 0.3);
        break;
      case 'boss_defeat':
        this.chord([261, 329, 392, 523, 659, 784, 1046], 2, 'sine', 0.3);
        this.noise(0.2, 0.5);
        break;
      case 'hit':
        this.tone(150, 0.1, 'sawtooth', 0.4);
        this.noise(0.05, 0.15);
        break;
      case 'ui_click':
        this.tone(600, 0.08, 'sine', 0.2);
        break;
      case 'ui_hover':
        this.tone(800, 0.05, 'sine', 0.1);
        break;
    }
    void t;
  }

  private noise(duration: number, gain = 0.3) {
    if (!this.ctx || !this.started) return;
    try {
      const bufSize = this.ctx.sampleRate * duration;
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      src.connect(g);
      g.connect(this.sfxGain);
      src.start();
    } catch { /* ignore */ }
  }

  // ─── Music ──────────────────────────────────────────────────────────────────

  startMusic() {
    if (!this.ctx || !this.started || this.musicInterval !== null) return;
    this.tickBeat(0);
  }

  private beatStep = 0;
  private tickBeat(step: number) {
    if (!this.ctx || !this.started) return;
    this.beatStep = step;
    const bpm = this.oneFirmActive ? 165 : this.surgeActive ? 148 : 125;
    const interval = (60 / bpm) * 1000 * 0.5; // 8th notes

    this.playBeat(step);

    this.musicInterval = window.setTimeout(() => {
      this.tickBeat((step + 1) % 32);
    }, interval);
  }

  private playBeat(step: number) {
    if (!this.ctx || !this.started) return;
    const bpm = this.oneFirmActive ? 165 : this.surgeActive ? 148 : 125;
    const beatDur = (60 / bpm) * 0.45;

    // Kick on beat 0, 8, 16, 24
    if (step % 8 === 0) {
      this.musicTone(60, beatDur * 1.5, 'sine', this.musicGain, 0.5);
    }

    // Snare on 4, 12, 20, 28
    if (step % 8 === 4) {
      this.musicNoise(beatDur * 0.5, this.musicGain, 0.3);
    }

    // Hi-hat every 2 steps
    if (step % 2 === 0) {
      this.musicNoise(beatDur * 0.15, this.musicGain, 0.08);
    }

    // Bass line
    const bassNotes = [55, 55, 49, 52, 55, 58, 55, 52];
    if (step % 2 === 0) {
      const note = bassNotes[(step / 2) % bassNotes.length];
      this.musicTone(note, beatDur * 0.8, 'sawtooth', this.musicGain, 0.18);
    }

    // Melody (higher layers unlock with combo)
    if (this.comboLevel >= 2 || this.oneFirmActive) {
      const melNotes = [523, 659, 784, 1046, 784, 659, 523, 0, 587, 740, 880, 1047, 880, 740, 587, 0];
      const mn = melNotes[step % melNotes.length];
      if (mn > 0) {
        this.musicTone(mn, beatDur * 0.6, 'triangle', this.musicGain, this.oneFirmActive ? 0.25 : 0.12);
      }
    }

    // Harmony layer on surge/one firm
    if (this.oneFirmActive && step % 4 === 0) {
      this.chord([261, 329, 392], beatDur * 1.5, 'sine', 0.08);
    }
  }

  private musicTone(freq: number, duration: number, type: OscillatorType, dest: GainNode, gain: number) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(g);
      g.connect(dest);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch { /* ignore */ }
  }

  private musicNoise(duration: number, dest: GainNode, gain: number) {
    if (!this.ctx) return;
    try {
      const bufSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      src.connect(g);
      g.connect(dest);
      src.start();
    } catch { /* ignore */ }
  }

  stopMusic() {
    if (this.musicInterval !== null) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
    this.musicNodes.forEach((n) => { try { n.stop(); } catch { /**/ } });
    this.musicNodes = [];
    this.musicGainNodes = [];
  }

  setComboLevel(level: number) {
    this.comboLevel = level;
  }

  setOneFirmMode(active: boolean) {
    this.oneFirmActive = active;
    if (active) this.playSfx('one_firm');
  }

  setSurgeMode(active: boolean) {
    this.surgeActive = active;
    if (active) this.playSfx('warn');
  }

  playVictory() {
    this.playSfx('boss_defeat');
  }
}

export const audioManager = new AudioManager();
