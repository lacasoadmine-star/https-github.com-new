import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';
import { MultiHot10Controls } from '../controls.mjs';
import { createMultiHot10DeferredController } from '../backend/deferred-controller.mjs';
import { DEFERRED_PATHS } from '../backend/deferred-protocol.mjs';
import { GAME_ID, SYMBOLS } from '../evaluator.mjs';
import { CONTROL_RECTS, STAGE } from '../render/layout.mjs';

// Exercise the actual application entry and actual deferred controller. Only
// browser drawing/audio and the remote server are replaced. The syntax-only
// wrapper supplies ES-module bindings to a VM; it does not copy entry logic.
const source = await readFile(new URL('../main.mjs', import.meta.url), 'utf8');
const entry = source.replace(/^import .*;\r?\n/gm, '')
  .replace('export async function mountMultiHot10', 'async function mountMultiHot10')
  .replaceAll('import.meta.url', '__moduleURL');
assert.equal(/^import |^export /m.test(entry), false, 'entry module wrapper must bind every import');

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event); }
}
class Element extends Target {
  constructor(tag = 'div') {
    super(); this.tagName = tag; this.style = {}; this.dataset = {}; this.children = [];
    this.attributes = new Map(); this.hidden = false; this.disabled = false; this.nodes = new Map();
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  append(value) { this.children.push(value); }
  replaceChildren(...children) { this.children = children; }
  querySelector(selector) {
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element(selector));
    return this.nodes.get(selector);
  }
}
class Renderer {
  constructor(_canvas, _atlas, { onEvent }) {
    this.onEvent = onEvent; this.phase = 'IDLE'; this.round = null; this.seen = new Set(); this.stopRequested = false;
  }
  get snapshot() { return { phase: this.phase, roundId: this.round?.roundId ?? null, stopRequested: this.stopRequested }; }
  beginSpin(key) { this.phase = 'SPINNING'; this.requestKey = key; this.round = null; return true; }
  present(view) {
    if (this.seen.has(view.roundId)) return false;
    this.seen.add(view.roundId); this.round = structuredClone(view); this.phase = 'SETTLING'; return true;
  }
  update(value) { this.state = value; }
  collected() { this.round = null; }
  requestStop() { this.stopRequested = true; return true; }
  setPressed() {}
  resize() {}
  dispose() { this.disposed = true; }
  finish() {
    assert.equal(this.phase, 'SETTLING', 'a complete received round must exist before presentation ends');
    this.phase = 'IDLE';
    this.onEvent({ type: 'round-presented', id: this.round.roundId, winAmount: this.round.winAmount });
  }
}
class Audio {
  constructor() { this.events = []; }
  handle(event) { this.events.push(event); }
  settings() {}
  unlock() {}
  once() {}
  setHidden(hidden) { this.hidden = hidden; }
  dispose() {}
}

const math = { mathVersion: 'isolated-entry-fixture-v1', engineVersion: 'isolated-entry-fixture-v1', mathSha256: 'b'.repeat(64) };
const guard = 'a'.repeat(64);
const grid = [
  ['lemon', 'bell', 'cherry', 'grapes', 'orange'],
  ['orange', 'lemon', 'bell', 'cherry', 'grapes'],
  ['grapes', 'orange', 'lemon', 'bell', 'cherry'],
];
const money = value => (value / 100n).toString() + '.' + (value % 100n).toString().padStart(2, '0');
export async function until(predicate, label = 'fixture condition') {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.ok(predicate(), label);
}
export async function flush() { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); }

export async function mountFixture({ before, after, allowNewRounds = true } = {}) {
  const root = new Element('main'), document = new Target(), window = new Target();
  Object.assign(document, { hidden: false, createElement: tag => new Element(tag), getElementById: () => null });
  const context = vm.createContext({
    MultiHot10Controls, createMultiHot10DeferredController, CONTROL_RECTS, STAGE,
    SpriteAtlas: { load: async () => ({}) }, NativeMultiHot10Logo: { load: async () => null },
    MultiHot10Renderer: Renderer, MultiHot10Audio: Audio,
    MultiHot10Dialogs: class { show() {} dispose() {} },
    HTMLElement: Element, Image: class { async decode() {} }, ResizeObserver: class { observe() {} disconnect() {} },
    document, window, URL, crypto: { randomUUID }, structuredClone, queueMicrotask,
    setTimeout, clearTimeout, __moduleURL: new URL('../main.mjs', import.meta.url).href,
  });
  const mount = vm.runInContext(entry + '\nmountMultiHot10;', context, { filename: 'actual-m10-main-entry.mjs' });
  let balance = 100000n, latest = null, activeGuard = guard, release = true;
  const posts = [], reads = [], accepted = new Map(), saved = new Map();
  const state = () => ({ authenticated: true, currency: 'ETB', sessionGuard: activeGuard, balance: money(balance),
    game: { id: GAME_ID, enabled: release, freshReleaseReady: release, currency: 'ETB', reels: 5, rows: 3,
      paylines: 10, symbols: [...SYMBOLS], betLevels: ['0.10', '0.20'], multiplierValues: [1, 2, 3, 4, 5], ...math },
    round: latest ? { receipt: structuredClone(latest), pendingWinAmount: '0.00', collection: null, gambleActions: [] } : null });
  const transport = async (path, body) => {
    if (body) posts.push({ path, body: structuredClone(body) }); else reads.push(path);
    if (before) await before(path, body);
    let result;
    if (path === DEFERRED_PATHS.state) result = state();
    else if (path === DEFERRED_PATHS.spin) {
      if (accepted.has(body.roundToken)) result = structuredClone(accepted.get(body.roundToken));
      else if (body.replayOnly) throw Object.assign(new Error('ROUND_NOT_FOUND_FOR_REPLAY'), { code: 'ROUND_NOT_FOUND_FOR_REPLAY', status: 404 });
      else {
        const beforeBalance = balance; balance -= BigInt(body.bet.replace('.', ''));
        latest = { schema: 'zplay/m10-deferred-round-receipt/v1', kind: 'SPIN', gameId: GAME_ID,
          requestKey: body.roundToken, roundId: randomUUID(), currency: 'ETB', bet: body.bet,
          ...math, grid: structuredClone(grid), multiplier: 1, winAmount: '0.00',
          collectionStatus: 'NOT_REQUIRED', previousCollection: null,
          walletReceipt: { currency: 'ETB', chargedStake: body.bet, creditedWin: '0.00', reservedWin: '0.00',
            balanceBefore: money(beforeBalance), balanceAfter: money(balance) } };
        accepted.set(body.roundToken, structuredClone(latest)); result = structuredClone(latest);
      }
    } else throw new Error('No other route exists in this isolated fixture');
    return after ? await after(path, body, result) : result;
  };
  const controls = new MultiHot10Controls({ betLevels: ['0.10', '0.20'], selectedBet: '0.10', currency: 'ETB' });
  const app = await mount({ root, controls, host: {
    allowNewRounds, request: transport, retry: { attempts: 1 }, lock: async (_name, fn) => fn(),
    storage: { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) },
    resolveMath: async identity => identity.mathSha256 === math.mathSha256 ? {
      gameId: GAME_ID, ...math, fullEngineVerified: true, outcomeLegalityVerified: true,
      collectionLifecycleVerified: true, roundingVerified: true,
      verifyDeferredRound: receipt => receipt.winAmount === '0.00' && JSON.stringify(receipt.grid) === JSON.stringify(grid),
    } : null,
  } });
  await until(() => app.controller.snapshot.phase === 'READY', 'the actual deferred controller should connect');
  const buttons = new Map(root.children[0].querySelector('.m10-hitboxes').children.map(node => [node.dataset.control, node]));
  return { app, root, document, window, posts, reads, buttons, accepted, saved,
    disableRelease() { release = false; }, changeSession() { activeGuard = 'c'.repeat(64); },
    async startAuto() { await app.action('auto'); await app.action('auto-count', 25); await app.action('auto-start'); },
    async finish() { app.renderer.finish(); await flush(); },
  };
}
