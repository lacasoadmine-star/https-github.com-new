/** Own M20 native audio adapter. Callers bind reviewed event URLs; no synthesized samples. */
export class MultiHot20Audio {
  constructor({ samples = {}, audioFactory = url => new Audio(url) } = {}) {
    this.samples = Object.freeze({ ...samples }); this.audioFactory = audioFactory;
    this.effects = true; this.music = true; this.unlocked = false; this.hidden = false; this.disposed = false;
    this.active = new Map(); this.loops = new Map(); this.seen = new Set(); this.generation = 0;
  }
  get ready() { return this.unlocked && !this.hidden && !this.disposed; }
  unlock() { if (!this.disposed) { this.unlocked = true; this.syncMusic(); } }
  setting({ effects, music }) {
    if (typeof effects !== 'boolean' || typeof music !== 'boolean') throw new TypeError('M20_AUDIO_SETTINGS');
    this.effects = effects; this.music = music;
    if (!effects) { for (const [audio, kind] of this.active) if (kind !== 'music') this.stop(audio); this.stopLoop('reel-motion'); }
    this.syncMusic();
  }
  stop(audio) { audio.pause(); try { audio.currentTime = 0; } catch {} this.active.delete(audio); }
  play(event, { loop = false } = {}) {
    const url = this.samples[event];
    if (!url || !this.ready || !(event === 'music' ? this.music : this.effects)) return null;
    const audio = this.audioFactory(url); audio.preload = 'none'; audio.loop = loop;
    const generation = this.generation; this.active.set(audio, event);
    const cleanup = () => { this.active.delete(audio); if (this.loops.get(event) === audio) this.loops.delete(event); };
    audio.addEventListener?.('ended', cleanup, { once: true }); audio.addEventListener?.('error', cleanup, { once: true });
    try { Promise.resolve(audio.play()).then(() => {
      if (this.disposed || generation !== this.generation || !this.ready || !(event === 'music' ? this.music : this.effects)) { this.stop(audio); cleanup(); }
    }, cleanup); } catch { cleanup(); }
    return audio;
  }
  once(event, identity) {
    if (typeof identity !== 'string' || !identity) throw new TypeError('M20_AUDIO_IDENTITY');
    const key = `${event}:${identity}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key); return !!this.play(event);
  }
  loop(event) {
    if (this.loops.has(event)) return false;
    const audio = this.play(event, { loop: true }); if (!audio) return false;
    this.loops.set(event, audio); return true;
  }
  stopLoop(event) { const audio = this.loops.get(event); if (audio) this.stop(audio); this.loops.delete(event); }
  syncMusic() { if (this.ready && this.music) this.loop('music'); else this.stopLoop('music'); }
  handle(event) {
    if (!event || event.gameId !== 'zplay72_multi_hot_20_v1') throw new TypeError('M20_AUDIO_GAME');
    if (event.name === 'spin') { this.once('spin', event.key); this.loop('reel-motion'); }
    else if (/^reel-stop-[1-5]$/.test(event.name)) this.once(event.name, event.key);
    else if (event.name === 'stop-request') this.once('quick-stop', event.key);
    else if (event.name === 'settled') this.stopLoop('reel-motion');
    else if (event.name === 'collect') this.once('take-win', event.key);
    else if (event.name === 'win') this.once('win', event.key);
    else if (event.name === 'multiplier') this.once('multiplier-stop', event.key);
  }
  setHidden(hidden) {
    if (this.hidden === !!hidden) return;
    this.hidden = !!hidden; this.generation++;
    if (hidden) { for (const audio of this.active.keys()) this.stop(audio); this.loops.clear(); }
    else this.syncMusic();
  }
  dispose() { this.setHidden(true); this.disposed = true; this.seen.clear(); }
}
