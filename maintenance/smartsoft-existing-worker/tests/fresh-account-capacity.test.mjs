// Pure transport and state tests. No network, real account, wager or DB mutation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';
import { FreshAccountClient, validateState, GAME_ID, MODEL_VERSION } from '../games/shared/fresh74-account.mjs';

const addon = await readFile(new URL('../reference-finance-addon.mjs', import.meta.url), 'utf8');
const capacitySource = addon.slice(addon.indexOf('function referenceAvailableGame('), addon.indexOf('function referenceReceiptVerification('));
const capacity = new vm.Script(capacitySource + '\nreferenceAvailableGame;').runInNewContext();
const patches = JSON.parse(await readFile(new URL('../capacity-source-patches.json', import.meta.url), 'utf8'));
const fixtureGame = () => ({
  id: GAME_ID, mathVersion: MODEL_VERSION, mathSha256: 'a'.repeat(64), engineVersion: 'zplay-fresh-slot-v1',
  enabled: true, freshReleaseReady: true, maxWinMultiplier: 5000,
  betLevels: ['0.10', '0.20', '0.50', '1.00', '2.00', '5.00'], features: { gambleRounds: 5, gambleMaxStake: '500.00' },
});
const state = () => ({
  authenticated: true, currency: 'ETB', sessionGuard: 'b'.repeat(64), balance: '100.00',
  game: fixtureGame(), round: null, blockedByActiveGame: null,
});
const memory = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key), values };
};
const ids = () => { let n = 0; return () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0'); };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

test('available stakes use exact maximum-payout bound, including the boundary', () => {
  const original = fixtureGame();
  const available = capacity(original, 250000n);
  assert.deepEqual(Array.from(available.betLevels), ['0.10', '0.20', '0.50']);
  assert.equal(available.wagerAvailability, 'available');
  assert.equal(original.betLevels.length, 6);
  assert.deepEqual(Array.from(capacity(original, 249999n).betLevels), ['0.10', '0.20']);
  assert.equal(Object.hasOwn(available, 'houseReserve'), false);
});

test('BigInt capacity filtering preserves amounts beyond Number precision', () => {
  const game = { maxWinMultiplier: 3, betLevels: ['900719925474.09', '900719925474.10'] };
  assert.deepEqual(Array.from(capacity(game, 270215977642227n).betLevels), ['900719925474.09']);
  assert.throws(() => capacity({ ...game, maxWinMultiplier: 0 }, 1n), /INVALID_GAME_CAPACITY/);
  assert.throws(() => capacity({ ...game, betLevels: ['1e3'] }, 1n), /INVALID_GAME_CAPACITY/);
});

test('private state filters while using its existing locked wallet snapshot', async () => {
  let source = await readFile(new URL('./fixtures/fresh-release-hooks.mjs', import.meta.url), 'utf8');
  for (const [before, after] of patches) {
    assert.equal(source.split(before).length - 1, 1, 'capacity patch must match exactly once');
    source = source.replace(before, after);
  }
  const hooks = new vm.Script(capacitySource + '\n' + source + '\ncreateFreshReleaseHooks;').runInNewContext({ Date });
  let locks = 0, balanceReads = 0;
  const dependencies = {
    hash: () => 'b'.repeat(64), authenticate: async () => 'fixture-player',
    balance: async () => { balanceReads++; return 10000n; },
    lockWallets: async () => { locks++; return [{ id: 'house', balance: '250000' }, { id: 'fixture-player', balance: '10000' }]; },
    transaction: async fn => fn({ query: async () => ({ rows: [], rowCount: 0 }) }),
    cash: () => '100.00', publicGames: () => [fixtureGame()], modelIdentity: () => ({}),
    fail: (status, code) => { throw Object.assign(Error(code), { status }); }, isAccepting: () => true,
  };
  const result = await hooks(dependencies).state(new Request('https://example.invalid/api/fresh-state', { headers: { cookie: 'sw_session=' + 'a'.repeat(64) } }), 'fixture-player');
  assert.deepEqual(Array.from(result.game.betLevels), ['0.10', '0.20', '0.50']);
  assert.equal(locks, 1);
  assert.equal(balanceReads, 1, 'no second house-balance query: reuse the locked rows');
  assert.equal(result.sessionGuard, 'b'.repeat(64));
});

test('empty levels are accepted only for explicit capacity unavailability and cannot submit', async () => {
  const blocked = state(); blocked.game = capacity(blocked.game, 49999n);
  assert.equal(blocked.game.betLevels.length, 0);
  validateState(blocked);
  let requests = 0;
  const client = new FreshAccountClient({ storage: memory(), fetchImpl: async () => { requests++; return json(blocked); } });
  await client.refresh();
  assert.throws(() => client.start(10), error => error.code === 'HOUSE_RESERVE_INSUFFICIENT');
  assert.equal(requests, 1);
  assert.equal(client.pending, null);
  const unexplained = state(); unexplained.game.betLevels = [];
  assert.throws(() => validateState(unexplained), /INVALID_BET_LEVELS/);
});

test('explicit 503 reserve rejection clears pending and requires a new state', async () => {
  const storage = memory(); const requests = [];
  const client = new FreshAccountClient({ storage, newId: ids(), fetchImpl: async (path, options) => {
    requests.push({ path, options });
    return path.endsWith('fresh-state') ? json(state()) : json({ detail: 'HOUSE_RESERVE_INSUFFICIENT' }, 503);
  } });
  await client.refresh();
  await assert.rejects(client.start(10), error => error.code === 'HOUSE_RESERVE_INSUFFICIENT' && !error.ambiguous);
  assert.equal(client.pending, null); assert.equal(storage.values.size, 0); assert.equal(client.busy, false);
  assert.throws(() => client.start(10), /REFRESH_REQUIRED/);
  assert.equal(requests.length, 2);
});

test('unconfirmed 503 retains same token and replay retrieves exactly one settlement', async () => {
  const storage = memory(); const bodies = []; let settlements = 0, saved = null;
  const client = new FreshAccountClient({ storage, newId: ids(), fetchImpl: async (path, options) => {
    if (path.endsWith('fresh-state')) { const current = state(); if (saved) current.balance = saved.balanceAfter; return json(current); }
    const body = JSON.parse(options.body); bodies.push(body);
    if (!saved) {
      settlements++;
      saved = {
        roundId: '10000000-0000-4000-8000-000000000001', gameId: GAME_ID, mathVersion: MODEL_VERSION,
        mathSha256: body.mathSha256, engineVersion: body.engineVersion, currency: 'ETB', bet: '0.10', finalWin: '0.00', balanceAfter: '99.90',
        wheelMultiplier: 1, grid: Array.from({ length: 3 }, () => ['seven', 'bell', 'grape', 'watermelon', 'lemon']), winLines: [],
        walletReceipt: { currency: 'ETB', balanceBefore: '100.00', chargedStake: '0.10', finalWin: '0.00', balanceAfter: '99.90' },
      };
      return json({ detail: 'ACTION_UNCONFIRMED' }, 503);
    }
    return json(saved);
  } });
  await client.refresh();
  await assert.rejects(client.start(10), error => error.ambiguous === true);
  assert.ok(client.pending); assert.equal(storage.values.size, 1);
  const pendingId = client.pending.body.roundToken;
  await client.retry();
  assert.equal(bodies[0].roundToken, pendingId); assert.equal(bodies[1].roundToken, pendingId);
  assert.equal(bodies[1].replayOnly, true); assert.equal(settlements, 1);
  assert.equal(client.pending, null); assert.equal(storage.values.size, 0);
});

test('network failure and noncanonical 502 reserve response remain ambiguous', async () => {
  for (const response of [() => { throw Error('connection reset'); }, () => json({ detail: 'HOUSE_RESERVE_INSUFFICIENT' }, 502)]) {
    const client = new FreshAccountClient({ storage: memory(), newId: ids(), fetchImpl: async path => path.endsWith('fresh-state') ? json(state()) : response() });
    await client.refresh(); await assert.rejects(client.start(10), error => error.ambiguous === true);
    assert.ok(client.pending);
  }
});
