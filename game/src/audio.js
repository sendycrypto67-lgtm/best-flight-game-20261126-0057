// audio.js — synthesised WebAudio sounds only; no audio files.
export function createAudio() {
  return {
    ctx: null, master: null, engine: null, engineGain: null,
    muted: false,
    ensure() {
      if (this.ctx || typeof window === 'undefined') return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        // engine drone: two detuned saws through a lowpass
        this.engine = this.ctx.createOscillator();
        this.engine.type = 'sawtooth';
        this.engine.frequency.value = 55;
        const sub = this.ctx.createOscillator();
        sub.type = 'sine'; sub.frequency.value = 110;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 420;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.0;
        this.engine.connect(filt); sub.connect(filt);
        filt.connect(this.engineGain); this.engineGain.connect(this.master);
        this.engine.start(); sub.start();
        this._sub = sub; this._filt = filt;
      } catch (e) { this.ctx = null; }
    },
    setEngine(throttle, speed) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.06, t, 0.1);
      this.engine.frequency.setTargetAtTime(48 + throttle * 40 + speed * 0.08, t, 0.1);
      this._filt.frequency.setTargetAtTime(320 + throttle * 500, t, 0.1);
    },
    blip(freq, dur, type = 'sine', vol = 0.25) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), gn = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      gn.gain.setValueAtTime(vol, t);
      gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(gn); gn.connect(this.master);
      o.start(t); o.stop(t + dur);
    },
    ring() { this.blip(880, 0.18); setTimeout(() => this.blip(1318, 0.22), 90); },
    alarm() { this.blip(520, 0.12, 'square', 0.12); },
    thud() { this.blip(90, 0.3, 'sine', 0.4); },
    crash() { this.blip(70, 0.6, 'sawtooth', 0.35); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.25), i * 130)); },
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
      return this.muted;
    },
  };
}
