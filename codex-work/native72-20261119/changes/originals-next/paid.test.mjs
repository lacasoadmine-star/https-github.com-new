import assert from 'node:assert/strict';
import test from 'node:test';
import { CashGame } from './cash.mjs';
import { extendOriginals } from './paid-core.mjs';
import { games } from './games/catalog.mjs';

const existing = { GAMES: [{ id: 'existing' }], VERSION: 'current',
  math: () => ({ maxMultiplier: 20 }), spin: () => 'retained' };
const game = games[0];
const id = game.slug.replaceAll('-', '_');
const extended = extendOriginals(existing, { paidIds: games.map(item => item.slug.replaceAll('-', '_')) });

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
