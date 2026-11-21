/** Original declared Multi Hot 10 sound files; audible/timing parity awaits QA. */
export const SOUND_EVENTS = Object.freeze({
  music: 'music.mp3', spin: 'spin.mp3', button: 'button.mp3',
  'reel-motion': 'reel-motion.mp3', win: 'win.mp3', 'take-win': 'take-win.mp3',
  'multiplier-win': 'multiplier-win.mp3', 'win-counter': 'win-counter.mp3',
  'quick-stop': 'quick-stop.mp3',
  'reel-stop-1': 'reel-stop-1.mp3', 'reel-stop-2': 'reel-stop-2.mp3',
  'reel-stop-3': 'reel-stop-3.mp3', 'reel-stop-4': 'reel-stop-4.mp3',
  'reel-stop-5': 'reel-stop-5.mp3',
});
export class MultiHot10Audio {
  constructor(baseURL, { audioFactory = url => new Audio(url) } = {}) {
    this.baseURL = baseURL; this.audioFactory = audioFactory;
    this.effects = true; this.music = true; this.unlocked = false;
    this.hidden = false; this.disposed = false; this.played = new Set();
    this.active = new Set(); this.loops = new Map(); this.eventsPlayed = 0;
  }
  unlock() { if (!this.disposed) { this.unlocked = true; this._music(); } }
  settings({ effects, music }) {
    this.effects = effects; this.music = music;
    if (!effects) { for (const audio of this.active) audio.pause(); this.active.clear(); this.stopLoop('reel-motion'); }
    this._music();
  }
  _ready() { return this.unlocked && !this.hidden && !this.disposed; }
  _audio(event) {
    const audio = this.audioFactory(new URL(SOUND_EVENTS[event], this.baseURL).href);
    audio.preload = 'none'; return audio;
  }
  once(event, identity) {
    const key = event + ':' + identity;
    if (!SOUND_EVENTS[event] || !identity || this.played.has(key)) return false;
    this.played.add(key); // Suppressed historical events must not replay on unmute.
    if (!this._ready() || !this.effects) return false;
    const audio = this._audio(event); this.active.add(audio);
    audio.addEventListener?.('ended', () => this.active.delete(audio), { once: true });
    Promise.resolve(audio.play()).catch(() => this.active.delete(audio)); this.eventsPlayed++; return true;
  }
  loop(event) {
    if (!this._ready() || (event === 'music' ? !this.music : !this.effects) || this.loops.has(event)) return;
    const audio = this._audio(event); audio.loop = true; this.loops.set(event, audio);
    Promise.resolve(audio.play()).catch(() => { audio.pause(); this.loops.delete(event); });
  }
  stopLoop(event) { const audio = this.loops.get(event); if (audio) { audio.pause(); this.loops.delete(event); } }
  _music() { if (this._ready() && this.music) this.loop('music'); else this.stopLoop('music'); }
  handle(event) {
    if (event.type === 'spin-start') { this.once('spin', event.id); this.loop('reel-motion'); }
    if (event.type === 'reel-stop') this.once('reel-stop-' + (Number(event.id.split(':').at(-1)) + 1), event.id);
    if (event.type === 'round-presented') {
      this.stopLoop('reel-motion');
      if (BigInt(event.winAmount.replace('.', '')) > 0n) this.once('win', event.id);
    }
  }
  setHidden(value) {
    this.hidden = value;
    if (value) { for (const audio of this.active) audio.pause(); this.active.clear(); for (const key of this.loops.keys()) this.stopLoop(key); }
    else this._music();
  }
  dispose() { this.setHidden(true); this.disposed = true; }
}
