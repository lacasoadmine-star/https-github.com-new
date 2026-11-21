import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { ASSETS } from './baseline/balloon-assets-20261108.mjs';
import { patchExistingNewWagerHtml } from './baseline/existing-new-wager-client-worker-r1.mjs';
import { supportsWagerProfile, STAKE_VALUES, EXPECTED_MODELS, WAGER_PROFILE_ID } from './candidate/wager-profile-client.mjs';

export const PINS = Object.freeze({
  assets: '83f5b55ca75c9c5af44692932716501c8825ac14e7072b9161bda1ea63574ff8',
  baseline: '9a54803a1636d35670537de8e3e9da32aae6fd07039ee220b0771f4fe5a6e2d5',
  candidate: 'a957319895ffca907db5a828608af684df1dd0ce4e78ebf1e81ebc31508761b9',
  dependency: '34ce4a93a0ec5b530cdff846a26eb62364bcc789a5cdfc8d7a1ac0e7e1965b79',
  higherIndex: '5b5beb868722962722dbff6817e2cb1e57850c6797026362aabab1534aff7b2f',
  higherWorker: '63b06aede739955ab11d03ee5447383964719309a50b621b2f3c3d9ffb9158d3',
  worker: '497606663471e6ffafcdebbbdf2263f49321a3e7ddaad8db71b9196ec65d3ec6',
});
export const sha = value => createHash('sha256').update(value).digest('hex');
export function clientSource(revision = 'candidate') {
  const assetBytes = readFileSync(new URL('./baseline/balloon-assets-20261108.mjs', import.meta.url));
  if (sha(assetBytes) !== PINS.assets) throw new Error('Asset module pin mismatch');
  const actual = JSON.parse(readFileSync(new URL('./baseline/actual-served-assets.json', import.meta.url), 'utf8'));
  const item = actual.assets.find(item => item.name === 'balloon/balloon.js');
  if (item.sha256 !== PINS.baseline || sha(item.body) !== PINS.baseline) throw new Error('Actual served client pin mismatch');
  const dependency = readFileSync(new URL('./candidate/wager-profile-client.mjs', import.meta.url));
  if (sha(dependency) !== PINS.dependency) throw new Error('Wager-profile dependency pin mismatch');
  for (const [name, pin] of [['existing-new-wager-client-index-r1.mjs', PINS.higherIndex], ['existing-new-wager-client-worker-r1.mjs', PINS.higherWorker]]) {
    if (sha(readFileSync(new URL('./baseline/' + name, import.meta.url))) !== pin) throw new Error('Higher wrapper source pin mismatch');
  }
  const source = revision === 'baseline' ? item.body : readFileSync(new URL('./candidate/balloon.js', import.meta.url), 'utf8');
  if (sha(source) !== PINS[revision]) throw new Error('Client source pin mismatch');
  return source;
}
export const CURRENT_CLIENT_PATH = '/native-library/existing-new/20261110-etb1-40000-r1/balloon/balloon.js';
export const CURRENT_DEPENDENCY_PATH = '/native-library/existing-new/20261110-etb1-40000-r1/balloon/wager-profile-client.mjs';
// The exact deployed higher wrapper supplies the current script and stake
// selection. Extra retained outer-layer tags can be added by routing tests.
export const currentPageHTML = patchExistingNewWagerHtml(ASSETS['index.html'], '/games/balloon_native');
export { STAKE_VALUES };

class Clock {
  now = 0;
  next = 1;
  tasks = new Map();
  add(fn, delay, interval = false) {
    const id = this.next++, duration = Math.max(1, Number(delay) || 0);
    this.tasks.set(id, { id, fn, at: this.now + duration, duration, interval });
    return id;
  }
  clear(id) { this.tasks.delete(id); }
  stopIntervals() { for (const [id, task] of this.tasks) if (task.interval) this.tasks.delete(id); }
  async flush() { for (let i = 0; i < 16; i++) await Promise.resolve(); }
  async advance(duration) {
    const until = this.now + duration;
    let steps = 0;
    for (;;) {
      const task = [...this.tasks.values()].filter(task => task.at <= until).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!task) break;
      if (++steps > 10000) throw new Error('Fixture timer loop exceeded bound');
      this.now = task.at;
      if (task.interval) task.at += task.duration;
      else this.tasks.delete(task.id);
      task.fn();
      await this.flush();
    }
    this.now = until;
    await this.flush();
  }
}

class Element {
  constructor(id) {
    this.id = id; this.textContent = ''; this.disabled = false;
    this.attributes = new Map(); this.listeners = new Map(); this.classes = new Set();
    this.options = STAKE_VALUES.map(value => ({ value }));
    this.selectedIndex = 0;
    this.classList = {
      add: name => this.classes.add(name), remove: name => this.classes.delete(name),
      toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name),
    };
  }
  get value() { return this.options[this.selectedIndex]?.value ?? ''; }
  set value(value) { this.selectedIndex = this.options.findIndex(option => option.value === value); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(fn);
  }
  dispatch(name, event = {}) { for (const fn of this.listeners.get(name) ?? []) fn(event); }
  getBoundingClientRect() { return { width: 800, height: 600 }; }
  getContext() { return { setTransform() {} }; }
}

export const statePayload = (changes = {}) => ({
  user_id: 'fixture-player',
  game: { id: 'balloon_native', version: EXPECTED_MODELS.balloon_native, minStake: '1.00', maxStake: '40000.00',
    launchable: true, stakeValues: [...STAKE_VALUES], operatorWagerProfile: { id: WAGER_PROFILE_ID, currency: 'ETB' } },
  game_id: 'balloon_native', model_version: EXPECTED_MODELS.balloon_native,
  accepting: true, balance: '10.00', currency: 'ETB', server_now: 0,
  round: null, other_active_game: null, sessionId: '1'.repeat(64), ...changes,
});

export async function serverState({ authenticated = true, identityStatus = 200 } = {}) {
  const source = readFileSync(new URL('./baseline/balloon-worker-20261108.mjs', import.meta.url), 'utf8');
  if (sha(source) !== PINS.worker) throw new Error('Live Worker source pin mismatch');
  let upstreamCalls = 0;
  const body = source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  const { installBalloon } = new vm.Script('(function(){\n' + body + '\nreturn {installBalloon};})()').runInNewContext({
    ASSETS, Request, Response, Headers, URL, TextEncoder, crypto: webcrypto,
    fetch: async () => {
      upstreamCalls++;
      const payload = statePayload(); delete payload.sessionId;
      return Response.json(payload);
    },
  });
  const previous = { async fetch() {
    return Response.json(identityStatus === 200 ? { authenticated } : { error: 'UNAUTHORIZED' }, { status: identityStatus });
  } };
  const handler = installBalloon(previous);
  const response = await handler.fetch(new Request('https://player.example.test/api/library/state?game_id=balloon_native', {
    headers: { cookie: 'sw_session=' + 'a'.repeat(64) },
  }), {
    PORTAL: 'player', NATIVE_ENGINE_ORIGIN: 'https://fixture-engine.example.test',
    NATIVE_ENGINE_SECRET: 'fixture-only-not-a-production-credential-'.repeat(2),
  }, {});
  return { status: response.status, body: await response.json(), upstreamCalls };
}

export function createFixture(options = {}) {
  const revision = options.revision ?? (process.env.BALLOON_REVIEW_BASELINE === '1' ? 'baseline' : 'candidate');
  const clock = new Clock(), nodes = new Map(), calls = [];
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, new Element(id));
    return nodes.get(id);
  };
  node('notice').textContent = /id="notice"[^>]*>([^<]+)/.exec(currentPageHTML)[1];
  const document = {
    getElementById: node, visibilityState: 'visible',
    addEventListener() {},
  };
  const window = { devicePixelRatio: 1, addEventListener() {} };
  const fetch = (url, init = {}) => {
    if (url !== '/api/library/state?game_id=balloon_native') throw new Error('Fixture forbids non-state requests: ' + url);
    const index = calls.length;
    const reply = options.replies?.[index] ?? {};
    const call = { index, url, startedAt: clock.now, settledAt: null, aborted: false };
    calls.push(call);
    return new Promise((resolve, reject) => {
      let done = false;
      const settle = () => {
        if (done) return; done = true; call.settledAt = clock.now;
        init.signal?.removeEventListener('abort', abort);
        if (reply.reject) { reject(new Error(reply.reject)); return; }
        const status = reply.status ?? 200;
        const body = reply.body ?? statePayload({ server_now: clock.now });
        resolve({ ok: status >= 200 && status < 300, status,
          async json() { if (reply.invalidJSON) throw new Error('Invalid fixture JSON'); return structuredClone(body); } });
      };
      const timer = reply.never ? null : clock.add(settle, reply.delay ?? options.latency ?? 1940);
      const abort = () => {
        if (done) return; done = true; call.aborted = true; call.settledAt = clock.now;
        clock.clear(timer);
        const error = new Error('Fixture aborted'); error.name = 'AbortError'; reject(error);
      };
      if (init.signal?.aborted) abort();
      else init.signal?.addEventListener('abort', abort, { once: true });
    });
  };
  class FixtureDate extends Date { static now() { return clock.now; } }
  const context = vm.createContext({
    document, window, fetch, AbortController, structuredClone, supportsWagerProfile,
    Date: FixtureDate, crypto: { randomUUID: () => 'fixture-request-id' },
    setTimeout: (fn, delay) => clock.add(fn, delay),
    clearTimeout: id => clock.clear(id),
    setInterval: (fn, delay) => clock.add(fn, delay, true),
    clearInterval: id => clock.clear(id),
    requestAnimationFrame: () => 1,
  });
  // Execute the full actually served client; only its import is linked to the
  // exact unchanged dependency above. Host DOM/clock/network surfaces are
  // fixtures; no client function body is replaced and no Canvas frame is drawn.
  const linked = clientSource(revision).replace("import {supportsWagerProfile} from './wager-profile-client.mjs';\n", '');
  new vm.Script(linked, { filename: revision + '/balloon.js' }).runInContext(context);
  const api = new vm.Script('({status,loadState,clearSession,canStart,render,pendingReads:()=>typeof pendingStateReads==="undefined"?null:pendingStateReads})').runInContext(context);
  return { clock, nodes, calls, api, pausePolling: () => clock.stopIntervals(), node,
    summary() {
      return { connected: api.status.connected, authenticated: api.status.authenticated,
        hasSession: !!api.status.session, hasBalance: api.status.balance !== null,
        buttonDisabled: node('holdButton').disabled,
        statusText: node('roundStatus').textContent, notice: node('notice').textContent,
        requestCount: calls.length, completedRequests: calls.filter(call => call.settledAt !== null).length };
    } };
}
