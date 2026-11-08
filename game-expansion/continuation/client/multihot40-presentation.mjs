import { drawAtlasFrame, normalizeSpineRegions } from '../presentation/atlas.mjs';
import { ReferenceAssetStore } from '../presentation/machine-renderer.mjs';
import { MultiHot40Motion, multiHot40Layout, isMultiHot40Grid, MULTIHOT40_INITIAL_GRID } from '../presentation/multihot40-motion.mjs';
import { MultiHot40Skeleton } from '../presentation/multihot40-skeleton.mjs';

// Display-only machine. Authoritative outcomes, stakes, wallet changes and
// request idempotency remain wholly in the host session/backend.
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const validMinor = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) && value.length <= 32;
const money = value => {
  if (!validMinor(value)) return '—';
  const n = BigInt(value), whole = String(n / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return whole + '.' + String(n % 100n).padStart(2, '0');
};
const minorAt = (value, progress) => validMinor(value) ? String(BigInt(value) * BigInt(Math.round(clamp(progress) * 100000)) / 100000n) : '0';
const RECT = (x, y, width, height) => ({ x, y, width, height });
const ART_CYCLE = Object.freeze([7, 5, 2, 4, 6, 3, 1, 4, 7, 6, 5, 0, 3, 2]);
const defaultAssetBase = () => new URL('/static/native-library/reference-art/r1/smartsoft/assets/', globalThis.location?.href ?? 'http://localhost/').href;
const textDecoder = new TextDecoder('utf-8', { fatal: true });

class MachineAudio {
  constructor(store, manifest, onEvent) {
    this.store = store; this.manifest = manifest; this.onEvent = onEvent;
    this.context = null; this.effects = false; this.music = false; this.hidden = false;
    this.buffers = new Map(); this.nodes = new Set(); this.disposed = false; this.background = null;
  }
  async preload() {
    const files = [...new Set(Object.values(this.manifest.audio ?? {}).map(item => item.file))];
    await Promise.all(files.map(file => this.store.loadBytes(file)));
  }
  async unlock() {
    if (this.disposed) return false;
    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) { this.onEvent({ type: 'audio-unavailable' }); return false; }
    if (!this.context) this.context = new AudioContextClass();
    await this.context.resume();
    await Promise.all([...new Set(Object.values(this.manifest.audio ?? {}).map(item => item.file))].map(async file => {
      if (!this.buffers.has(file)) this.buffers.set(file, await this.context.decodeAudioData((await this.store.loadBytes(file)).slice(0)));
    }));
    if (this.disposed) return false;
    this.updateMusic(); return true;
  }
  preferences(effects, music, hidden = this.hidden) {
    const silenceEffects = !effects || hidden;
    this.effects = effects === true; this.music = music === true; this.hidden = hidden === true;
    if (silenceEffects) for (const item of [...this.nodes]) if (item.kind !== 'music') this.stop(item);
    this.updateMusic();
  }
  first(keys) { return keys.find(key => this.manifest.audio?.[key]); }
  play(key, { volume = .45, loop = false, kind = 'effect' } = {}) {
    if (this.disposed || this.hidden || !this.context || this.context.state !== 'running' || (kind === 'music' ? !this.music : !this.effects)) return null;
    const descriptor = this.manifest.audio?.[key], buffer = descriptor && this.buffers.get(descriptor.file);
    if (!buffer) return null;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.loop = loop; gain.gain.value = clamp(volume);
    source.connect(gain); gain.connect(this.context.destination);
    const item = { source, gain, kind }; this.nodes.add(item);
    source.onended = () => { this.nodes.delete(item); source.disconnect(); gain.disconnect(); if (this.background === item) this.background = null; };
    source.start(); return item;
  }
  stop(item) {
    if (!item) return;
    try { item.source.stop(); item.source.disconnect(); item.gain.disconnect(); } catch { /* Already ended. */ }
    this.nodes.delete(item); if (this.background === item) this.background = null;
  }
  updateMusic() {
    if (!this.music || this.hidden) { this.stop(this.background); return; }
    if (!this.background) this.background = this.play('Start/Background.mp3', { kind: 'music', loop: true, volume: .24 });
  }
  event(event) {
    if (event.type === 'spin-start') {
      this.play('Buttons/Spin.mp3', { volume: .5 });
      this.movement = this.play(this.first(['Start/ObjectMove.mp3', 'Start/ObjectMoveFast.mp3']), { volume: .38, loop: Boolean(this.manifest.audio?.['Start/ObjectMove.mp3']) });
    } else if (event.type === 'reel-stop') {
      this.play(this.first([`Start/ReelStop${event.column + 1}.mp3`, 'Start/ReelStop4.mp3', 'Start/ObjectMoveFast.mp3']), { volume: .42 });
    } else if (event.type === 'wheel-stop') {
      this.play(this.first(['Start/WinMultiplier.mp3', 'Buttons/Button.mp3']), { volume: .3 });
    } else if (event.type === 'reels-complete') this.stop(this.movement);
    else if (event.type === 'win-tier') {
      this.play(this.first([`Win/${event.name.replaceAll(' ', '')}.mp3`, 'Start/Win.mp3']), { volume: .55 });
      this.counter = this.play('Start/WinCounter.mp3', { volume: .28, loop: true });
    } else if (event.type === 'animation-complete') { this.stop(this.movement); this.stop(this.counter); }
  }
  dispose() { this.disposed = true; for (const item of [...this.nodes]) this.stop(item); this.context?.close().catch(() => {}); this.buffers.clear(); }
}

export class MultiHot40Presentation {
  constructor(canvas, { onEvent = () => {}, fetchImpl = globalThis.fetch, clock = () => performance.now(), ...options } = {}) {
    this.canvas = canvas?.canvas ?? canvas; this.context = canvas?.canvas ? canvas : canvas?.getContext?.('2d', { alpha: false });
    if (!this.canvas || !this.context) throw new TypeError('A Canvas2D surface is required');
    this.onEvent = onEvent; this.fetchImpl = fetchImpl; this.clock = clock;
    this.motion = new MultiHot40Motion({ clock, onEvent: event => this.event(event) });
    this.state = { phase: 'idle', balanceMinor: null, betMinor: null, winMinor: '0', pendingWinMinor: '0', soundEnabled: false, musicEnabled: false, turbo: false };
    this.images = new Map(); this.skeletons = new Map(); this.ready = false; this.disposed = false; this.loading = null;
    this.width = this.canvas.clientWidth || 390; this.height = this.canvas.clientHeight || 790;
    this.dpr = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
    this.winCycleStart = 0; this.latestTime = clock(); this.frameCount = 0; this.fonts = [];
    this.visibilityHandler = () => this.audio?.preferences(this.state.soundEnabled, this.state.musicEnabled, globalThis.document?.hidden === true);
    globalThis.document?.addEventListener('visibilitychange', this.visibilityHandler);
    if (options.manifest || options.manifestURL) this.configure(options);
  }
  event(event) {
    if (event.type === 'reels-complete') this.winCycleStart = this.latestTime;
    this.audio?.event(event);
    try { this.onEvent(event); } catch { /* Display callbacks cannot alter a financial result. */ }
  }
  configure({ manifest, manifestURL, manifestSha256, paylines, assetBase, assetBaseURL } = {}) {
    if (this.disposed) throw new Error('Presentation disposed');
    if (this.ready || this.loading) throw new Error('Configure before loading the presentation');
    if (manifest && (manifest.id !== 'multihot40_native' || manifest.grid?.columns !== 5 || manifest.grid?.rows !== 4 || !manifest.files || !manifest.frames)) throw new TypeError('Invalid MultiHot40 manifest');
    this.manifest = manifest ?? null; this.manifestURL = manifestURL; this.manifestSha256 = manifestSha256;
    this.assetBase = new URL(assetBaseURL ?? assetBase ?? defaultAssetBase(), globalThis.location?.href ?? import.meta.url).href;
    this.paylines = Array.isArray(paylines) ? paylines : Array.isArray(paylines?.paths) ? paylines.paths : [];
    return this;
  }
  async load() {
    if (this.disposed) throw new Error('Presentation disposed');
    if (this.ready) return this;
    if (this.loading) return this.loading;
    this.controller = new AbortController();
    const lockedFetch = async (url, options = {}) => {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
      const abort = () => controller.abort(); this.controller.signal.addEventListener('abort', abort, { once: true });
      try { return await this.fetchImpl(url, { ...options, method: 'GET', credentials: 'omit', redirect: 'error', signal: controller.signal }); }
      finally { clearTimeout(timeout); this.controller.signal.removeEventListener('abort', abort); }
    };
    this.loading = (async () => {
      if (!this.manifest) {
        if (!this.manifestURL || !/^[a-f0-9]{64}$/.test(this.manifestSha256 ?? '')) throw new Error('Missing locked presentation manifest');
        const response = await lockedFetch(this.manifestURL);
        if (!response.ok) throw new Error('Presentation manifest could not be loaded');
        const bytes = await response.arrayBuffer();
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
        if (digest !== this.manifestSha256) throw new Error('Presentation manifest hash mismatch');
        this.manifest = JSON.parse(textDecoder.decode(bytes));
      }
      const manifest = this.manifest;
      if (manifest.id !== 'multihot40_native' || manifest.grid?.columns !== 5 || manifest.grid?.rows !== 4) throw new TypeError('Wrong presentation manifest');
      this.store = new ReferenceAssetStore(manifest, { baseURL: this.assetBase, fetchImpl: lockedFetch });
      this.audio = new MachineAudio(this.store, manifest, event => this.event(event));
      const files = [...new Set([...Object.values(manifest.frames).map(frame => frame.file), manifest.background.file])];
      let complete = 0;
      await Promise.all(files.map(async file => {
        this.images.set(file, await this.store.loadImage(file));
        this.event({ type: 'load-progress', completed: ++complete, total: files.length + 4 });
      }));
      const groups = ['Logo', 'Win', 'WinBox', 'Start'];
      await Promise.all(groups.map(async name => {
        const source = manifest.spine.find(item => item.group === name);
        if (!source) throw new Error('Required animation data is missing: ' + name);
        const [atlasBytes, skeletonBytes, ...loadedImages] = await Promise.all([
          this.store.loadBytes(source.atlasFile), this.store.loadBytes(source.skeletonFile),
          ...source.pages.map(page => this.store.loadImage(page.file)),
        ]);
        source.pages.forEach((page, index) => this.images.set(page.file, loadedImages[index]));
        const regions = normalizeSpineRegions(textDecoder.decode(atlasBytes), Object.fromEntries(source.pages.map(page => [page.name, { file: page.file, sha256: page.sha256 }])));
        const skeleton = new MultiHot40Skeleton(JSON.parse(textDecoder.decode(skeletonBytes)), regions, this.images);
        this.skeletons.set(name, skeleton);
        this.event({ type: 'load-progress', completed: ++complete, total: files.length + groups.length });
      }));
      await Promise.all([
        this.audio.preload(),
        ...[['Intro-Black-Caps', 'ZplayMultiHotDisplay', '900'], ['Poppins-Bold', 'ZplayMultiHotText', '700']].map(async ([name, family, weight]) => {
          const descriptor = manifest.fonts?.find(item => item.name.includes(name));
          if (!descriptor || typeof FontFace === 'undefined') return;
          const face = new FontFace(family, await this.store.loadBytes(descriptor.file), { weight });
          await face.load(); if (!this.disposed) { document.fonts.add(face); this.fonts.push(face); }
        }),
      ]);
      if (this.disposed) throw new Error('Presentation disposed');
      this.ready = true; this.audio.preferences(this.state.soundEnabled, this.state.musicEnabled, globalThis.document?.hidden === true);
      this.event({ type: 'ready', gameId: 'multihot40_native', animatedGroups: groups, financialActions: false });
      return this;
    })();
    try { return await this.loading; } catch (error) { this.event({ type: 'presentation-error', message: error.message }); throw error; }
  }
  layout(width = this.width, height = this.height) {
    const result = multiHot40Layout(width, height); this.width = width; this.height = height; this.geometry = result; return result;
  }
  resize(width, height, dpr = globalThis.devicePixelRatio || 1) { this.dpr = clamp(dpr, 1, 2); return this.layout(width, height); }
  setState(next = {}) {
    if (this.disposed) return;
    const previous = this.state;
    this.state = { ...previous, ...next };
    if (Object.hasOwn(next, 'autoPlaying')) this.state.autoActive = next.autoPlaying === true;
    if (Object.hasOwn(next, 'canSpin')) this.state.canStart = next.canSpin === true;
    for (const key of ['balanceMinor', 'betMinor', 'winMinor', 'pendingWinMinor']) if (!validMinor(this.state[key])) this.state[key] = null;
    if (next.phase === undefined && previous.phase === 'error' && next.authenticated === true && validMinor(next.balanceMinor)) this.state.phase = 'idle';
    this.audio?.preferences(this.state.soundEnabled, this.state.musicEnabled, globalThis.document?.hidden === true);
    if (this.state.phase === 'error' || this.state.authenticated === false) {
      this.motion.cancel('server-state-unconfirmed');
      if (this.state.authenticated === false) {
        Object.assign(this.state, { balanceMinor: null, winMinor: '0', pendingWinMinor: '0', lines: [], grid: null, multiplier: null, roundId: null });
        this.motion.restore({ grid: MULTIHOT40_INITIAL_GRID, multiplier: 2, lines: [] });
      }
    } else if (next.phase === 'spinning' && previous.phase !== 'spinning') {
      this.motion.begin({ turbo: this.state.turbo });
    } else if (next.phase === 'result_received' && isMultiHot40Grid(this.state.grid)) {
      const result = { ...this.state, lines: this.state.lines ?? [], roundId: this.state.roundId };
      try { if (!this.motion.accept(result) && !this.motion.busy) this.motion.restore(result); }
      catch (error) { this.motion.cancel('invalid-display-receipt'); this.event({ type: 'presentation-error', message: error.message }); }
    } else if (!this.motion.busy && next.phase !== 'spinning' && isMultiHot40Grid(this.state.grid)) {
      this.motion.restore(this.state);
    }
  }
  beginSpin(options = {}) { this.setState({ ...options, phase: 'spinning' }); }
  settle(result) { this.setState({ ...result, phase: 'result_received' }); }
  speedUp() { return this.motion.speedUp(); }
  get busy() { return this.motion.busy; }
  async unlockAudio() {
    try { return this.audio && !this.disposed ? await this.audio.unlock() : false; }
    catch (error) { if (!this.disposed) this.event({ type: 'audio-unavailable', message: error.message }); return false; }
  }
  playSound(key, options) { return this.audio?.play(key, options) ?? null; }
  buttonSound() { this.audio?.play('Buttons/Button.mp3', { volume: .3 }); }

  sprite(name, target, { opacity = 1, padding = false, fit = 'contain' } = {}) {
    const frame = this.manifest?.frames[name], image = frame && this.images.get(frame.file);
    if (image) drawAtlasFrame(this.context, image, frame, target, { opacity, padding, fit });
  }
  label(value, x, y, size, { color = '#ffffff', align = 'center', face = 'text', weight = 700, maxWidth } = {}) {
    const context = this.context;
    context.save(); context.font = `${weight} ${size}px ${face === 'display' ? 'ZplayMultiHotDisplay' : 'ZplayMultiHotText'},Arial,sans-serif`;
    context.textAlign = align; context.textBaseline = 'middle'; context.fillStyle = color;
    maxWidth ? context.fillText(String(value), x, y, maxWidth) : context.fillText(String(value), x, y); context.restore();
  }
  background() {
    const context = this.context, image = this.images.get(this.manifest.background.file);
    context.fillStyle = '#002e25'; context.fillRect(0, 0, this.width, this.height);
    if (!image) return;
    const scale = Math.max(this.width / image.width, this.height / image.height);
    context.drawImage(image, (this.width - image.width * scale) / 2, (this.height - image.height * scale) / 2, image.width * scale, image.height * scale);
  }
  wheel(view, sample) {
    const context = this.context, scale = view.board.width / 993 * (view.portrait ? .845 : 1);
    const origin = { x: view.board.x + view.board.width / 2, y: view.board.y + (view.portrait ? 408 : 392) * scale };
    const normal = [202, 367, 305, 269, 417, 198, 516, 161, 581, 367, 738, 367, 801, 161, 918, 204, 1015, 268, 1124, 368, 1037, 368, 273, 367];
    const light = [543, 170, 657, 145, 773, 170, 720, 358, 592, 358];
    this.sprite('Multiplier/Background', RECT(origin.x - 660 * scale, origin.y - 660 * scale, 1320 * scale, 1320 * scale), { padding: true, fit: 'stretch' });
    for (const [frameName, polygon] of [['Multiplier/Numbers', normal], ['Multiplier/Light', light]]) {
      context.save(); context.beginPath();
      for (let i = 0; i < polygon.length; i += 2) {
        const x = origin.x + (polygon[i] - 660) * scale, y = origin.y + (polygon[i + 1] - 760) * scale;
        i ? context.lineTo(x, y) : context.moveTo(x, y);
      }
      context.closePath(); context.clip();
      const pivotY = origin.y - 60 * scale;
      context.translate(origin.x, pivotY); context.rotate(sample.wheelAngle); context.translate(-origin.x, -pivotY);
      this.sprite(frameName, RECT(origin.x - 582 * scale, origin.y - 642 * scale, 1164 * scale, 1164 * scale), { padding: true, fit: 'stretch' });
      context.restore();
    }
    if (sample.lines?.length && this.skeletons.has('Start')) {
      const skeleton = this.skeletons.get('Start'), seconds = Math.max(0, (this.latestTime - this.winCycleStart) / 1000);
      const pose = skeleton.sample('charcho cecxli loop', seconds, { loop: true });
      const bounds = skeleton.bounds(skeleton.sample('charcho cecxli loop', .3));
      if (bounds?.width && bounds?.height) {
        const target = RECT(origin.x - 79 * scale, view.board.y - 214 * scale, 158 * scale, 210 * scale);
        const factor = Math.min(target.width / bounds.width, target.height / bounds.height);
        context.save(); context.beginPath(); context.rect(view.board.x, view.board.y - 250 * scale, view.board.width, 250 * scale); context.clip();
        skeleton.draw(context, pose, { x: target.x + (target.width - bounds.width * factor) / 2 - bounds.x * factor, y: target.y + (target.height - bounds.height * factor) / 2 + (bounds.y + bounds.height) * factor, scale: factor });
        context.restore();
      }
    }
  }
  drawLogo(view) {
    const skeleton = this.skeletons.get('Logo');
    if (!skeleton) { this.sprite(this.manifest.logo.frame, view.logo); return; }
    const factor = Math.min(view.logo.width / 645, view.logo.height / 163);
    skeleton.draw(this.context, skeleton.sample('animation', this.latestTime / 1000, { loop: true }), { x: view.logo.x, y: view.logo.y, scale: factor });
  }
  symbol(id, cell, { blur = false } = {}) {
    const descriptor = this.manifest.symbols[String(id)], name = blur ? descriptor?.blurFrame : descriptor?.frame;
    const frame = this.manifest.frames[name];
    if (!frame) return;
    // The source artwork is positioned on a 500px untrimmed canvas in each
    // 190px reference cell. Fitting its trimmed bounds to a cell shrinks the
    // visible fruit and changes sizes between symbols and blur frames.
    const scale = this.geometry?.portrait
      ? Math.min(cell.width / 102, cell.height / 100) * .46
      : Math.min(cell.width, cell.height) / 190;
    this.sprite(name, RECT(cell.x + cell.width / 2 - frame.original.width * scale / 2,
      cell.y + cell.height / 2 - frame.original.height * scale / 2,
      frame.original.width * scale, frame.original.height * scale), { padding: true, fit: 'stretch' });
  }
  reels(view, sample) {
    const context = this.context, grid = view.grid, cellWidth = grid.width / 5, cellHeight = grid.height / 4;
    this.sprite('Box/Background', view.board, { fit: 'stretch' });
    for (let column = 0; column < 5; column++) {
      const motion = sample.columns?.[column];
      context.save(); context.beginPath(); context.rect(grid.x + column * cellWidth, grid.y, cellWidth, grid.height); context.clip();
      const distance = motion?.distance ?? 0, step = Math.floor(distance), fraction = distance - step;
      for (let row = -1; row <= 4; row++) {
        let symbol;
        if (!motion || motion.stopped) { if (row < 0 || row > 3) continue; symbol = sample.grid[column][row]; }
        else {
          const stripIndex = motion.target === null ? row - step : row + motion.target - step;
          const final = motion.target !== null;
          if (stripIndex >= 0 && stripIndex < 4) symbol = (final ? sample.grid : this.motion.previousGrid)[column][stripIndex];
          else symbol = ART_CYCLE[((stripIndex + column * 3) % ART_CYCLE.length + ART_CYCLE.length) % ART_CYCLE.length];
        }
        const offset = motion && !motion.stopped ? fraction : 0;
        const cell = RECT(grid.x + column * cellWidth, grid.y + (row + offset) * cellHeight, cellWidth, cellHeight);
        this.symbol(symbol, cell, { blur: Boolean(motion?.blur && !motion.stopped) });
      }
      context.restore();
    }
  }
  winningLines(view, sample) {
    if (this.state.phase === 'error' || this.state.authenticated === false) return;
    const currentWin = this.state.pendingWinMinor && BigInt(this.state.pendingWinMinor) > 0n ? this.state.pendingWinMinor : this.state.winMinor;
    if (!validMinor(currentWin) || BigInt(currentWin) === 0n) return;
    const lines = (sample.lines ?? []).filter(win => Array.isArray(win.cells) && win.cells.length && win.cells.every(cell => Array.isArray(cell) && cell.length === 2 && Number.isInteger(cell[0]) && Number.isInteger(cell[1]) && cell[0] >= 0 && cell[0] < 5 && cell[1] >= 0 && cell[1] < 4));
    if (!lines.length) return;
    const context = this.context, elapsed = Math.max(0, this.latestTime - this.winCycleStart), active = lines[Math.floor(elapsed / 1700) % lines.length];
    const grid = view.grid, cw = grid.width / 5, ch = grid.height / 4;
    context.save(); context.beginPath(); context.rect(grid.x, grid.y, grid.width, grid.height); context.clip();
    context.fillStyle = 'rgba(0,10,8,.38)'; context.fillRect(grid.x, grid.y, grid.width, grid.height);
    for (const [column, row] of active.cells) {
      context.save(); context.beginPath(); context.rect(grid.x + column * cw, grid.y, cw, grid.height); context.clip();
      this.symbol(sample.grid[column][row], RECT(grid.x + column * cw, grid.y + row * ch, cw, ch));
      context.restore();
    }
    const lineFrame = `Box/Line/${active.line}`;
    if (this.manifest.frames[lineFrame]) {
      const sx = 4 * cw / 742, sy = ch / 190;
      this.sprite(lineFrame, RECT(grid.x + cw / 2 - 75 * sx, grid.y + ch / 2 - 68 * sy, 888 * sx, 704 * sy), { padding: true, fit: 'stretch', opacity: .9 });
    } else {
      const path = this.paylines[Number(active.line) - 1];
      if (Array.isArray(path) && path.length === 5 && path.every(row => Number.isInteger(row) && row >= 0 && row < 4)) {
        context.strokeStyle = '#ffd542'; context.lineWidth = Math.max(1.5, cw * .018); context.shadowBlur = cw * .06; context.shadowColor = '#ff9d00'; context.beginPath();
        path.forEach((row, column) => column ? context.lineTo(grid.x + (column + .5) * cw, grid.y + (row + .5) * ch) : context.moveTo(grid.x + cw / 2, grid.y + (row + .5) * ch)); context.stroke();
      }
    }
    const fire = this.skeletons.get('WinBox');
    if (fire) {
      const pose = fire.sample('animation', (elapsed % 1700) / 1000, { loop: true });
      for (const [column, row] of active.cells) {
        const factor = Math.min(cw / 319, ch / 261) * 1.32;
        fire.draw(context, pose, { x: grid.x + (column + .5) * cw - 130.57 * factor, y: grid.y + (row + .5) * ch - 90.95 * factor, scale: factor });
      }
    }
    context.restore();
  }
  controls(view, sample) {
    const pending = validMinor(this.state.pendingWinMinor) && BigInt(this.state.pendingWinMinor) > 0n;
    const spinning = this.motion.busy;
    const unconfirmed = this.state.phase === 'error' || this.state.authenticated === false || this.state.balanceMinor === null;
    const opacity = unconfirmed || (!spinning && this.state.canStart === false && !pending) ? .38 : 1;
    const modes = {
      spin: this.state.turbo ? spinning ? 'Buttons/SpinTurboStop' : 'Buttons/SpinTurbo' : spinning ? 'Buttons/SpinStop' : 'Buttons/Spin',
      auto: this.state.autoActive ? 'Buttons/AutoPlayStop' : 'Buttons/AutoPlay', bet: 'Buttons/Bet', menu: 'Buttons/Menu',
      sound: this.state.soundEnabled || this.state.musicEnabled ? 'Buttons/SoundOn' : 'Buttons/SoundOff',
      turbo: this.state.turbo ? 'Buttons/QuickPlayTurbo' : 'Buttons/QuickPlay', collect: 'Buttons/DoubleTake', gamble: 'Buttons/Double',
    };
    for (const [name, frame] of Object.entries(modes)) {
      if ((name === 'collect' || name === 'gamble') && !pending) continue;
      const disabled = unconfirmed || (spinning && !['spin', 'sound', 'menu', 'turbo'].includes(name)) || (name === 'gamble' && this.state.canGamble === false);
      this.sprite(frame, view.controls[name], { opacity: disabled && name !== 'sound' && name !== 'menu' ? .35 : name === 'spin' ? opacity : 1 });
    }
    const b = view.controls.spin, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    if (this.state.autoActive && Number.isInteger(this.state.autoRemaining)) this.label(this.state.autoRemaining, cx, cy, b.width * .19, { face: 'display', color: '#ffffff' });
    else if (!spinning) { this.label('HOLD', cx, cy - b.height * .11, b.width * .084, { face: 'display' }); this.label('&', cx, cy, b.width * .074, { face: 'display' }); this.label('SPIN', cx, cy + b.height * .11, b.width * .084, { face: 'display' }); }
  }
  hud(view, sample) {
    const entries = [['balance', 'Start/FooterBalance', 'BALANCE', this.state.balanceMinor], ['bet', 'Start/FooterBet', 'BET', this.state.betMinor]];
    const value = sample.celebration ? minorAt(sample.celebration.winMinor, 1 - (1 - sample.celebration.progress) ** 2) : this.state.pendingWinMinor && BigInt(this.state.pendingWinMinor) > 0n ? this.state.pendingWinMinor : this.state.winMinor;
    if (validMinor(value) && BigInt(value) > 0n && this.state.phase !== 'error' && this.state.authenticated !== false && sample.phase !== 'spinning' && sample.phase !== 'settling') entries.push(['win', 'Start/FooterWin', 'WIN', value]);
    for (const [name, frame, title, amount] of entries) {
      const box = view.hud[name]; this.sprite(frame, box, { fit: 'stretch' });
      this.label(title, box.x + box.width / 2, box.y + box.height * .31, box.height * .28, { color: '#fbf13e', weight: 500 });
      this.label(money(amount) + (validMinor(amount) ? ' ETB' : ''), box.x + box.width / 2, box.y + box.height * .66, box.height * .29, { maxWidth: box.width * .91 });
    }
  }
  celebration(view, sample) {
    const win = sample.celebration, skeleton = this.skeletons.get('Win');
    if (!win || win.name === 'Win' || !skeleton) return;
    const context = this.context, reference = { x: -229.26, y: -1047.22, width: 1341.14, height: 1227.91 };
    const targetWidth = Math.min(view.viewport.width * .96, view.board.width * 1.5), factor = targetWidth / reference.width;
    const targetHeight = reference.height * factor, centerX = view.board.x + view.board.width / 2, centerY = view.board.y + view.board.height / 2;
    const originX = centerX - targetWidth / 2 - reference.x * factor;
    const originY = centerY - targetHeight / 2 + (reference.y + reference.height) * factor;
    const fade = Math.min(1, win.age / 180, Math.max(0, (win.duration - win.age) / 220));
    context.save(); context.globalAlpha = .55 * fade; context.fillStyle = '#001c16'; context.fillRect(0, 0, this.width, this.height); context.restore();
    const pose = skeleton.sample(win.name, win.age / 1000, { loop: false });
    skeleton.draw(context, pose, { x: originX, y: originY, scale: factor, opacity: fade });
    const anchor = pose.worlds[pose.bones.get('Numbers And Gel')];
    if (anchor) {
      const number = money(minorAt(win.winMinor, 1 - (1 - win.progress) ** 2));
      this.label(number, originX + anchor.x * factor, originY - anchor.y * factor, 54 * factor, { face: 'display', color: '#fff26a', maxWidth: 480 * factor });
      this.label('ETB', originX + anchor.x * factor, originY - anchor.y * factor + 38 * factor, 22 * factor, { face: 'display', color: '#fff26a' });
    }
  }
  render(timestamp = this.clock()) {
    if (this.disposed || !this.ready) return { ready: false, busy: this.busy };
    this.latestTime = timestamp; this.frameCount++;
    const view = this.geometry ?? this.layout(), width = Math.round(this.width * this.dpr), height = Math.round(this.height * this.dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    const context = this.context; context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    const sample = this.motion.sample(timestamp);
    this.background(); this.wheel(view, sample); this.drawLogo(view); this.reels(view, sample);
    this.winningLines(view, sample); this.controls(view, sample); this.hud(view, sample); this.celebration(view, sample);
    return { ready: true, busy: this.busy, phase: sample.phase, layout: view, frame: this.frameCount };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.controller?.abort(); this.audio?.dispose();
    for (const skeleton of this.skeletons.values()) skeleton.dispose(); this.skeletons.clear();
    this.store?.dispose(); this.images.clear();
    for (const face of this.fonts) globalThis.document?.fonts?.delete(face); this.fonts = [];
    globalThis.document?.removeEventListener('visibilitychange', this.visibilityHandler);
  }
}

export { multiHot40Layout };
