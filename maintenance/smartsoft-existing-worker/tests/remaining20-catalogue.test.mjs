// The gateway runs with isolated identity/upstream fixtures. No external request,
// player account, wager, ledger mutation or production credential is used.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { GAMES as original } from './fixtures/remaining20-catalog-original.mjs';
import { GAMES as revised } from '../games/remaining20/remaining20-catalog-20261109.mjs';

const policy = JSON.parse(await readFile(new URL('./fixtures/operator-policy-r16.json', import.meta.url), 'utf8'));
let source = await readFile(new URL('./fixtures/remaining20-worker.mjs', import.meta.url), 'utf8');
const signerImport = /import\s*\{sign\}\s*from\s*["']\.\/balloon-worker-20261108\.mjs["'];?/;
assert.equal(source.match(signerImport)?.length, 1);
source = source.replace(signerImport, 'const sign=()=>{throw Error("Test must inject its fixture signer");};');
const { installRemainingGames, appendRemainingGames } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const origin = 'https://player.example.invalid';
const cookie = 'a'.repeat(64); // An in-memory fixture, never a production session.
const guard = createHash('sha256').update('zplay-library-session:' + cookie).digest('hex');
function harness(games = revised, { authenticated = true } = {}) {
  const upstream = [], signed = [], delegated = [];
  const previous = { async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/api/machine-session') return Response.json({ authenticated });
    delegated.push(path);
    if (path === '/api/config') return Response.json({ games: [{ id: 'multi_hot_5_video', name: 'Existing Multi Hot 5' }, { id: 'hot_foxy_20', name: 'Existing Foxy Hot 20' }] });
    return new Response('Existing route: ' + path);
  } };
  const handler = installRemainingGames(previous, {
    games,
    signer: async (...args) => { signed.push(args); return { 'x-fixture-signature': 'in-memory-only' }; },
    fetchImpl: async (url, options) => {
      upstream.push({ url: String(url), ...options });
      if (new URL(url).pathname.endsWith('index.html')) return new Response('<!doctype html><title>Existing native game</title>', { headers: { 'content-type': 'text/html' } });
      return Response.json({ accepting: true, game: { id: new URL(url).searchParams.get('game_id') || JSON.parse(options.body).game_id } });
    },
  });
  const env = { PORTAL: 'player', NATIVE_ENGINE_ORIGIN: 'https://engine.example.invalid', NATIVE_ENGINE_SECRET: 'fixture-not-a-production-secret' };
  const fetch = (path, options = {}) => handler.fetch(new Request(origin + path, options), env, {});
  return { fetch, upstream, signed, delegated };
}
const playerHeaders = { cookie: 'sw_session=' + cookie };

test('only the nine already-enabled deployed model versions are promoted', () => {
  assert.equal(revised.length, 19);
  const enabled = revised.filter(game => game.launchable || game.published);
  assert.deepEqual(enabled.map(game => game.id).sort(), [...policy.gameIds].sort());
  for (const game of revised) {
    const before = original.find(entry => entry.id === game.id);
    if (policy.gameIds.includes(game.id)) {
      assert.equal(game.version, policy.versions[game.id]);
      assert.equal(game.launchable, true); assert.equal(game.published, true);
      assert.deepEqual({ ...game, version: before.version, published: before.published, launchable: before.launchable }, before);
    } else assert.deepEqual(game, before);
  }
});

test('old empty allowlist rejects a valid ready game before it reaches the backend', async () => {
  const app = harness(original);
  const response = await app.fetch('/api/remaining20/state?game_id=multihot100_native', { headers: playerHeaders });
  assert.equal(response.status, 422); assert.equal((await response.json()).error, 'INVALID_GAME_ID');
  assert.equal(app.upstream.length, 0); assert.equal(app.signed.length, 0);
});

test('all nine state reads reach the existing signed backend with their original identity', async () => {
  const app = harness();
  for (const id of policy.gameIds) {
    const response = await app.fetch('/api/remaining20/state?game_id=' + id, { headers: playerHeaders });
    assert.equal(response.status, 200);
    const data = await response.json(); assert.equal(data.game.id, id); assert.equal(data.authenticated, true); assert.equal(data.sessionId, guard);
    assert.equal(app.upstream.at(-1).url, 'https://engine.example.invalid/v2/remaining20/state?game_id=' + id);
    assert.equal(app.signed.at(-1)[1], '@session:' + createHash('sha256').update(cookie).digest('hex'));
  }
});

test('an approved action forwards one exact versioned request with the session guard', async () => {
  const app = harness();
  const body = JSON.stringify({ type: 'start', request_id: '00000000-0000-4000-8000-000000000001', game_id: 'multihot100_native', model_version: policy.versions.multihot100_native, stake: '1.00', options: {} });
  const response = await app.fetch('/api/remaining20/action', { method: 'POST', headers: { ...playerHeaders, origin, 'X-Zplay-Library-Session': guard, 'content-type': 'application/json' }, body });
  assert.equal(response.status, 200); assert.equal(app.upstream.length, 1);
  assert.equal(app.upstream[0].url, 'https://engine.example.invalid/v2/remaining20/action');
  assert.equal(app.upstream[0].body, body); assert.equal(app.signed[0][4], body);
});

test('unreleased titles, missing authentication, wrong origin and stale session stay blocked', async () => {
  const app = harness();
  for (const id of revised.filter(game => !game.published).map(game => game.id)) {
    const response = await app.fetch('/api/remaining20/state?game_id=' + id, { headers: playerHeaders });
    assert.equal(response.status, 422);
  }
  assert.equal((await app.fetch('/api/remaining20/state?game_id=multihot100_native')).status, 401);
  const action = { method: 'POST', headers: { ...playerHeaders, origin: 'https://unrelated.example.invalid', 'X-Zplay-Library-Session': guard, 'content-type': 'application/json' }, body: '{"game_id":"multihot100_native"}' };
  assert.equal((await app.fetch('/api/remaining20/action', action)).status, 403);
  action.headers.origin = origin; action.headers['X-Zplay-Library-Session'] = 'stale';
  assert.equal((await app.fetch('/api/remaining20/action', action)).status, 403);
  const unauthorized = harness(revised, { authenticated: false });
  assert.equal((await unauthorized.fetch('/api/remaining20/state?game_id=multihot100_native', { headers: playerHeaders })).status, 401);
  assert.equal(app.upstream.length, 0); assert.equal(unauthorized.upstream.length, 0);
});

test('history retains its signed route and accepts only the supported ordering', async () => {
  const app = harness();
  assert.equal((await app.fetch('/api/remaining20/history?game_id=multihot100_native&sort=wins', { headers: playerHeaders })).status, 200);
  assert.equal(app.upstream[0].url, 'https://engine.example.invalid/v2/remaining20/history?game_id=multihot100_native&sort=wins');
  assert.equal((await app.fetch('/api/remaining20/history?game_id=multihot100_native&sort=unsupported', { headers: playerHeaders })).status, 422);
  assert.equal(app.upstream.length, 1);
});

test('homepage gains only the nine available titles, without duplicating existing entries', async () => {
  const app = harness();
  const response = await app.fetch('/api/config'); const data = await response.json();
  assert.equal(data.games.length, 11);
  assert.equal(new Set(data.games.map(game => game.id)).size, 11);
  for (const id of policy.gameIds) assert.equal(data.games.find(game => game.id === id)?.launch, '/games/' + id);
  const repeated = appendRemainingGames(data, revised);
  assert.equal(repeated.games.length, 11);
  for (const path of ['/games/multi_hot_5_video', '/games/hot_foxy_20']) {
    const result = await app.fetch(path); assert.equal(await result.text(), 'Existing route: ' + path);
  }
});
