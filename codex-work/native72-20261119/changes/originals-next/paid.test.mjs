import assert from 'node:assert/strict';
import test from 'node:test';
import { CashGame } from './cash.mjs';
import { extendOriginals } from './paid-core.mjs';
import { games } from './games/catalog.mjs';

const existing = { GAMES: [{ id: 'existing' }], VERSION: 'current',
  math: () => ({ maxMultiplier: 20 }), spin: () => 'retained' };
const game = games[0];
const id = game.slug.replaceAll('-', '_');
const extended = extendOriginals(existing, {
  paidIds: games.filter(item => !item.previewOnly).map(item => item.slug.replaceAll('-', '_')),
});

test('cash models use distinct identities, retain the old engine and require explicit activation', () => {
  assert.deepEqual(extendOriginals(existing).nextManifest, []);
  assert.deepEqual(extended.GAMES.slice(0, 1), existing.GAMES);
  assert.equal(extended.spin('existing', 1), 'retained');
  for (const model of extended.nextManifest) {
    for (const mode of [() => 0, max => max - 1, undefined]) {
      for (let tries = 0; tries < 25; tries++) {
        const result = extended.spin(model.id, 1, mode);
        assert.equal(result.gameId, model.id);
        assert.equal(result.grid.length, model.columns);
        assert.equal(result.mathSha256, model.mathSha256);
        assert.ok(result.multiplier >= 0 && result.multiplier <= extended.math(model).maxMultiplier);
      }
    }
  }
  assert.throws(() => extendOriginals(existing, { paidIds: ['unknown'] }), /ORIGINALS_MODEL_SELECTION_INVALID/);
  assert.throws(() => extendOriginals(existing, { paidIds: ['tidal_relay'] }), /ORIGINALS_MODEL_SELECTION_INVALID/);
});

test('an interrupted paid spin reuses the same request and accepts only a server ETB receipt', async () => {
  const model = extended.nextManifest[0];
  const storage = new Map(), submitted = [];
  let authenticated = true, balance = '10.00', currentIdentity = 'account-a';
  const adapter = new CashGame(game, {
    storage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key) },
    fetcher: async (path, options) => {
      if (path === '/api/slots/originals/session') {
        return Response.json({ authenticated, identity: currentIdentity, balance, currency: 'ETB',
          enabled: true, nextGames: [model] });
      }
      assert.equal(path, '/api/slots/originals/spin');
      assert.equal(options.method, 'POST');
      submitted.push(JSON.parse(options.body));
      balance = '9.00';
      if (submitted.length === 1) throw Error('connection interrupted');
      return Response.json({ ...extended.spin(id, 1), walletSettled: true, currency: 'ETB',
        chargedStake: '1.00', balanceBefore: '10.00', balanceAfter: '9.00', finalWin: '0.00' });
    },
  });
  await adapter.connect();
  await assert.rejects(adapter.spin('1.00'), /connection interrupted/);
  assert.equal(storage.size, 1);
  assert.equal((await adapter.spin('2.00')).displayBalance, '9.00');
  assert.deepEqual(submitted[0], submitted[1]);
  assert.equal(storage.size, 0);
  currentIdentity = 'account-b';
  await assert.rejects(adapter.spin('1.00'), /PLAYER_SESSION_CHANGED/);
  assert.equal(submitted.length, 2);
  authenticated = false;
  await assert.rejects(adapter.connect(), /PLAYER_LOGIN_REQUIRED/);
  assert.equal(adapter.current, null);
});

test('only a definitive spin rejection clears a saved wager', async () => {
  const model = extended.nextManifest[0];
  const values = new Map(), wagers = [];
  let outcome = 'network';
  let refreshRejected = false;
  const adapter = new CashGame(game, {
    storage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key) },
    fetcher: async (path, options) => {
      if (path.endsWith('/session')) {
        if (refreshRejected) return Response.json({ detail: 'SLOT_RELEASE_NOT_ENABLED' }, { status: 503 });
        return Response.json({ authenticated: true, identity: 'account-a', balance: '10.00',
          currency: 'ETB', enabled: true, nextGames: [model] });
      }
      wagers.push(JSON.parse(options.body));
      if (outcome === 'network') throw Error('INSUFFICIENT_FUNDS');
      if (outcome === 'wrong-status') return Response.json({ detail: 'INSUFFICIENT_FUNDS' }, { status: 503 });
      if (outcome === 'definitive') return Response.json({ detail: 'INSUFFICIENT_FUNDS' }, { status: 402 });
      refreshRejected = true;
      return Response.json({ ...extended.spin(id, 1), walletSettled: true, currency: 'ETB',
        chargedStake: '1.00', balanceBefore: '10.00', balanceAfter: '9.00', finalWin: '0.00' });
    },
  });
  await adapter.connect();
  await assert.rejects(adapter.spin('1.00'), /INSUFFICIENT_FUNDS/);
  assert.equal(values.size, 1);
  outcome = 'wrong-status';
  await assert.rejects(adapter.spin('1.00'), /INSUFFICIENT_FUNDS/);
  assert.equal(values.size, 1);
  outcome = 'settled';
  await assert.rejects(adapter.spin('1.00'), /SLOT_RELEASE_NOT_ENABLED/);
  assert.equal(values.size, 1);
  assert.deepEqual(wagers[0], wagers[1]);
  assert.deepEqual(wagers[1], wagers[2]);
  refreshRejected = false;
  outcome = 'definitive';
  await assert.rejects(adapter.spin('1.00'), /INSUFFICIENT_FUNDS/);
  assert.equal(values.size, 0);
  assert.equal(adapter.busy, false);
});

test('a late spin cannot replace the balance or delete the pending wager for a newer session', async () => {
  const model = extended.nextManifest[0];
  const values = new Map();
  let identity = 'older-account';
  let balance = '10.00';
  let releaseSpin;
  let spinStarted;
  const started = new Promise(resolve => { spinStarted = resolve; });
  const delayed = new Promise(resolve => { releaseSpin = resolve; });
  const adapter = new CashGame(game, {
    storage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key) },
    fetcher: async path => {
      if (path.endsWith('/session')) {
        return Response.json({ authenticated: true, identity, balance,
          currency: 'ETB', enabled: true, nextGames: [model] });
      }
      spinStarted();
      return delayed;
    },
  });
  await adapter.connect();
  const spin = adapter.spin('1.00');
  await started;
  identity = 'newer-account';
  balance = '47.00';
  await adapter.connect();
  const newKey = 'zplay:originals:round:' + id + ':' + identity;
  values.set(newKey, 'pending-newer-round');
  releaseSpin(Response.json({ ...extended.spin(id, 1), walletSettled: true, currency: 'ETB',
    chargedStake: '1.00', balanceBefore: '10.00', balanceAfter: '9.00', finalWin: '0.00' }));
  await assert.rejects(spin, /PLAYER_SESSION_CHANGED/);
  assert.equal(adapter.current.balance, '47.00');
  assert.equal(values.get(newKey), 'pending-newer-round');
  assert.equal(adapter.busy, false);
});
