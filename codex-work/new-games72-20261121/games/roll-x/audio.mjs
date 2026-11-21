/**
 * Original procedural ZPLAY cues. No provider audio was copied.
 * Event mapping is implemented; provider sound parity remains unverified.
 */
export const SOUND_EVENTS = Object.freeze({
  button: Object.freeze([{ frequency: 520, duration: 0.035, type: 'sine', volume: 0.05 }]),
  spin: Object.freeze([{ frequency: 160, endFrequency: 95, duration: 0.16, type: 'triangle', volume: 0.035 }]),
  tick: Object.freeze([{ frequency: 320, duration: 0.018, type: 'sine', volume: 0.02 }]),
  stop: Object.freeze([{ frequency: 220, duration: 0.07, type: 'triangle', volume: 0.05 }]),
  win: Object.freeze([
    { frequency: 523.25, duration: 0.15, type: 'sine', volume: 0.06 },
    { frequency: 659.25, duration: 0.15, offset: 0.11, type: 'sine', volume: 0.05 },
    { frequency: 783.99, duration: 0.22, offset: 0.22, type: 'sine', volume: 0.05 },
  ]),
  loss: Object.freeze([{ frequency: 185, endFrequency: 140, duration: 0.1, type: 'sine', volume: 0.025 }]),
  error: Object.freeze([{ frequency: 140, duration: 0.055, type: 'triangle', volume: 0.03 }]),
});

export class RollXAudio {
  constructor({ contextFactory = () => {
    const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    return Audio ? new Audio() : null;
  } } = {}) {
    this.contextFactory = contextFactory;
    this.context = null;
    this.nodes = new Set();
    this.muted = false; this.hidden = false; this.disposed = false;
  }
  async unlock() {
    if (this.disposed || this.hidden || this.muted) return false;
    try {
      this.context ??= this.contextFactory();
      if (!this.context) return false;
      if (this.context.state === 'suspended') await this.context.resume();
      return !this.disposed;
    } catch { return false; }
  }
  emit(event) {
    if (this.disposed || this.muted || this.hidden || !this.context ||
        this.context.state !== 'running' || !SOUND_EVENTS[event]) return false;
    for (const cue of SOUND_EVENTS[event]) {
      try {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const start = this.context.currentTime + (cue.offset ?? 0);
        oscillator.type = cue.type;
        oscillator.frequency.setValueAtTime(cue.frequency, start);
        if (cue.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(cue.endFrequency, start + cue.duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(cue.volume, start + Math.min(0.01, cue.duration / 3));
        gain.gain.exponentialRampToValueAtTime(0.0001, start + cue.duration);
        oscillator.connect(gain); gain.connect(this.context.destination);
        const node = { oscillator, gain };
        this.nodes.add(node);
        oscillator.onended = () => {
          this.nodes.delete(node);
          try { oscillator.disconnect(); gain.disconnect(); } catch { /* Already closed. */ }
        };
        oscillator.start(start); oscillator.stop(start + cue.duration + 0.015);
      } catch { /* Audio failure never changes settlement. */ }
    }
    return true;
  }
  stopAll() {
    for (const node of this.nodes) {
      try { node.oscillator.onended = null; node.oscillator.stop(); } catch { /* Already ended. */ }
      try { node.oscillator.disconnect(); node.gain.disconnect(); } catch { /* Already detached. */ }
    }
    this.nodes.clear();
  }
  setMuted(muted) {
    this.muted = muted === true;
    if (this.muted) this.stopAll();
  }
  setHidden(hidden) {
    this.hidden = hidden === true;
    if (this.hidden) {
      this.stopAll();
      try { this.context?.suspend()?.catch?.(() => {}); } catch { /* Unsupported audio. */ }
    }
    // Resume requires the next user gesture; it is not forced by tab visibility.
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.stopAll();
    try { this.context?.close()?.catch?.(() => {}); } catch { /* Already closed. */ }
    this.context = null;
  }
}
