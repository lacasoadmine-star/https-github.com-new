// Native gamble clips share the existing consent, mute, master gain and node
// lifecycle. They do not alter the reel banks or their decoded-sample counts.
const loaders = {
  multi_hot_5_video: () => import('./official-mh5-gamble-audio.mjs'),
  hot_foxy_20: () => import('./official-foxy-gamble-audio.mjs')
};

export function createGambleAudio(gameId, engine) {
  if (!loaders[gameId] || !engine) return null;
  let context, pending, decoded = new Map(), disposed = false, sequence = 0;
  const usable = () => !disposed && !engine.disposed && !engine.muted && !engine.playbackSuspended;
  const prepare = () => {
    if (!usable() || !engine.context || engine.context.state === 'closed') return Promise.resolve(false);
    if (context !== engine.context) { context = engine.context; decoded = new Map(); pending = null; }
    if (pending) return pending;
    const owner = context;
    pending = loaders[gameId]().then(async ({samples}) => {
      const entries = await Promise.all(Object.entries(samples).map(async ([name, source]) => {
        const bytes = Uint8Array.from(atob(source), char => char.charCodeAt(0));
        return [name, await owner.decodeAudioData(bytes.buffer)];
      }));
      if (disposed || owner !== engine.context || owner !== context) return false;
      decoded = new Map(entries); return true;
    }).catch(() => { if (context === owner) pending = null; return false; });
    return pending;
  };
  const start = (name, token, requestedAt) => {
    if (!usable() || context !== engine.context || context?.state !== 'running' ||
        (name !== 'take' && token !== sequence) || Date.now() - requestedAt > 350) return false;
    const buffer = decoded.get(name); if (!buffer || !engine.master) return false;
    const group = name === 'take' ? 'gamble-take' : 'gamble';
    engine.stopNodes(group);
    let node;
    try {
      const osc = context.createBufferSource(), gain = context.createGain();
      const volume = gameId === 'hot_foxy_20' && name === 'take' ? .5 : 1;
      osc.buffer = buffer; gain.gain.setValueAtTime(volume, context.currentTime);
      osc.connect(gain).connect(engine.master);
      node = {osc, gain, group, sample: 'gamble-' + name, buffer, baseVolume: volume, startedAt: context.currentTime, offset: 0};
      engine.nodes.add(node); osc.onended = () => engine.release(node); osc.start(); return true;
    } catch { if (node) engine.release(node); return false; }
  };
  return {
    prepare,
    play(name) {
      const token = ++sequence, requestedAt = Date.now();
      if (decoded.has(name) && context === engine.context) return start(name, token, requestedAt);
      return prepare().then(() => start(name, token, requestedAt));
    },
    stop() { sequence++; engine.stopNodes('gamble'); },
    dispose() { disposed = true; sequence++; engine.stopNodes('gamble'); engine.stopNodes('gamble-take'); decoded.clear(); },
    diagnostics() { return {decoded: decoded.size, names: [...decoded.keys()], disposed}; }
  };
}
