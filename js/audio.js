// ============================================================
// audio.js — WebAudio-synthesized sound effects
// ============================================================

NP.Audio = {
  ctx: null,
  master: null,

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(this.ctx.destination);
  },

  blip(freq, duration, type = 'sine', gain = 0.1, slide = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + duration);
    }
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + duration + 0.02);
  },

  noise(duration, gain = 0.15, filter = 800) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'lowpass'; bp.frequency.value = filter;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(t0);
  },
};

NP.sfx = {
  shoot:     () => NP.Audio.blip(900, 0.06, 'square', 0.04, -400),
  spread:    () => { NP.Audio.blip(700, 0.05, 'square', 0.03, -200); NP.Audio.blip(1000, 0.05, 'square', 0.03, -200); },
  laser:     () => NP.Audio.blip(1800, 0.18, 'sawtooth', 0.05, -1200),
  missile:   () => NP.Audio.blip(300, 0.15, 'sawtooth', 0.06, 200),
  lightning: () => { NP.Audio.blip(2400, 0.04, 'square', 0.04, -1800); NP.Audio.noise(0.08, 0.05, 4000); },
  hit:       () => NP.Audio.blip(1400, 0.05, 'square', 0.07, -800),
  explode:   () => { NP.Audio.noise(0.3, 0.18, 600); NP.Audio.blip(120, 0.25, 'sawtooth', 0.1, -80); },
  bigExplode:() => { NP.Audio.noise(0.6, 0.28, 400); NP.Audio.blip(80, 0.5, 'sawtooth', 0.18, -40); NP.Audio.blip(160, 0.4, 'square', 0.1, -100); },
  damage:    () => { NP.Audio.blip(220, 0.2, 'sawtooth', 0.18, -100); NP.Audio.noise(0.15, 0.1, 800); },
  pickup:    () => { NP.Audio.blip(800, 0.08, 'sine', 0.1, 400); NP.Audio.blip(1200, 0.1, 'sine', 0.08, 600); NP.Audio.blip(1800, 0.06, 'sine', 0.06, 400); },
  dash:      () => NP.Audio.blip(400, 0.15, 'sawtooth', 0.06, 800),
  overdrive: () => { NP.Audio.blip(80, 0.6, 'sine', 0.15, 800); NP.Audio.blip(160, 0.6, 'sine', 0.1, 400); },
  boss:      () => { NP.Audio.noise(1.2, 0.25, 200); NP.Audio.blip(60, 1.2, 'sawtooth', 0.18, -20); NP.Audio.blip(40, 1.0, 'sine', 0.12, -10); },
  waveStart: () => {
    NP.Audio.blip(440, 0.1, 'sine', 0.08);
    setTimeout(() => NP.Audio.blip(660, 0.1, 'sine', 0.08), 80);
    setTimeout(() => NP.Audio.blip(880, 0.15, 'sine', 0.08), 160);
  },
};
