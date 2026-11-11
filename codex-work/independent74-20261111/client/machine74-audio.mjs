/** Original synthesized cues. No downloaded recordings or game-outcome decisions. */
const CUES = Object.freeze({
  tap: [[660, 0, .06]], betChange: [[520, 0, .055], [780, .045, .06]],
  spin: [[180, 0, .11], [270, .06, .13]],
  reelStop: [[310, 0, .075], [930, .025, .055]],
  wheelTick: [[880, 0, .025]], wheelStop: [[440, 0, .13], [660, .07, .15]],
  multiplier: [[523, 0, .15], [784, .07, .16], [1047, .14, .2]],
  smallWin: [[440, 0, .14], [554, .08, .17], [659, .16, .22]],
  mediumWin: [[523, 0, .16], [659, .09, .18], [784, .18, .22], [1047, .29, .25]],
  bigWin: [[392, 0, .2], [523, .08, .22], [659, .16, .23], [784, .25, .25], [1047, .36, .35], [1318, .48, .4]],
  megaWin: [[523, 0, .23], [659, .09, .25], [784, .18, .28], [1047, .3, .32], [1318, .43, .36], [1568, .56, .42], [2093, .72, .5]],
  bonus: [[587, 0, .16], [880, .1, .2], [1175, .2, .24], [1760, .33, .3]],
  reveal: [[440, 0, .07], [660, .05, .1]],
  lose: [[196, 0, .15], [147, .12, .2]],
  error: [[196, 0, .07], [196, .13, .1]],
});
const ALIASES = Object.freeze({stop: 'reelStop', win: 'smallWin', nice: 'mediumWin', big: 'bigWin', fantastic: 'megaWin', mega: 'megaWin', button: 'tap', bet: 'betChange', tick: 'wheelTick', 'wheel-stop': 'wheelStop', wild: 'bonus'});

export class MachineAudio {
  constructor({AudioContext: Context, volume = .35, muted = true} = {}) {
    this.Context = Context || globalThis.AudioContext || globalThis.webkitAudioContext;
    this.context = null; this.master = null; this.voices = new Set();
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0)); this.muted = !!muted;
    this.loop = null; this.pulse = 0; this.disposed = false;
    this.onVisibility = () => { if (globalThis.document?.hidden) this.stop(); };
    globalThis.document?.addEventListener('visibilitychange', this.onVisibility);
  }
  async unlock() {
    if (this.disposed || !this.Context) return false;
    try {
      if (!this.context) {
        this.context = new this.Context();
        this.master = this.context.createGain(); this.master.connect(this.context.destination);
        this.master.gain.setValueAtTime(this.muted ? 0 : this.volume * .35, this.context.currentTime);
      }
      if (this.context.state !== 'running') await this.context.resume();
      return this.context.state === 'running';
    } catch { return false; }
  }
  setMuted(value) {
    this.muted = !!value;
    if (this.muted) this.stop();
    this.updateGain();
    return this.muted;
  }
  setVolume(value) {
    const volume = Number(value);
    if (!Number.isFinite(volume)) return this.volume;
    this.volume = Math.max(0, Math.min(1, volume)); this.updateGain(); return this.volume;
  }
  updateGain() {
    if (!this.master || !this.context) return;
    const at = this.context.currentTime, gain = this.muted ? 0 : this.volume * .35;
    this.master.gain.cancelScheduledValues(at);
    this.master.gain.setTargetAtTime(gain, at, .015);
  }
  async enable(value) { this.setMuted(!value); return value ? this.unlock() : false; }
  note(frequency, offset = 0, duration = .12, amplitude = .2, waveform = 'triangle') {
    if (this.disposed || this.muted || !this.volume || this.context?.state !== 'running' || this.voices.size >= 32) return;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    const at = this.context.currentTime + offset;
    oscillator.type = waveform; oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(amplitude, at + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(gain); gain.connect(this.master); this.voices.add(oscillator);
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + duration + .02);
  }
  cue(name) {
    const key = ALIASES[name] || name;
    for (const [frequency, offset, duration] of CUES[key] || []) this.note(frequency, offset, duration, key === 'wheelTick' ? .09 : .2, key === 'reelStop' ? 'sine' : 'triangle');
  }
  startSpin() {
    this.stopSpin(); this.cue('spin');
    if (this.disposed || this.muted || this.context?.state !== 'running') return;
    this.pulse = 0;
    this.loop = setInterval(() => { this.note([112, 126, 141, 119][this.pulse++ % 4], 0, .065, .045, 'sawtooth'); }, 92);
  }
  stopSpin() { if (this.loop !== null) clearInterval(this.loop); this.loop = null; }
  spin() { this.startSpin(); }
  endSpin() { this.stopSpin(); }
  stop() {
    this.stopSpin();
    for (const oscillator of this.voices) { try { oscillator.stop(); } catch {} }
    this.voices.clear();
  }
  dispose() {
    if (this.disposed) return;
    this.stop(); this.disposed = true;
    globalThis.document?.removeEventListener('visibilitychange', this.onVisibility);
    try { this.master?.disconnect(); } catch {}
    const closing = this.context?.close(); closing?.catch?.(() => {});
  }
}

export const machineAudioCues = Object.freeze(Object.keys(CUES));
