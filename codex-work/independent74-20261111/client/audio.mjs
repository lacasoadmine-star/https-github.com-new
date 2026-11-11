export class AudioEngine {
  constructor() {
    this.context = null;
    this.muted = true;
    try { this.muted = localStorage.getItem('ind74.sound') !== 'on'; } catch {}
  }
  async unlock() {
    if (this.muted) return;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return;
    this.context ||= new Context();
    if (this.context.state === 'suspended') await this.context.resume().catch(() => {});
  }
  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem('ind74.sound', this.muted ? 'off' : 'on'); } catch {}
    if (!this.muted) this.unlock();
    return this.muted;
  }
  note(frequency, offset = 0, duration = 0.09, volume = 0.035, wave = 'sine') {
    if (this.muted || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime + offset, oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = wave; oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now); gain.gain.exponentialRampToValueAtTime(volume, now + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(now); oscillator.stop(now + duration + 0.02);
  }
  play(kind) {
    if (kind === 'start') [220, 330, 440].forEach((f, i) => this.note(f, i * 0.04, 0.09, 0.025, 'triangle'));
    else if (kind === 'tick') this.note(600, 0, 0.035, 0.012, 'triangle');
    else if (kind === 'win') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.note(f, i * 0.085, 0.23));
    else if (kind === 'big') [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.note(f, i * 0.10, 0.36, 0.045, 'triangle'));
    else if (kind === 'lose') [220, 164.81].forEach((f, i) => this.note(f, i * 0.12, 0.18, 0.02, 'triangle'));
  }
  destroy() { this.context?.close().catch(() => {}); }
}
