import test from 'node:test';
import assert from 'node:assert/strict';
import { createUnreleasedRollXSession } from '../session.mjs';
import { GAME_ID } from '../evaluator.mjs';
import { pendingStorageKey, RecoveryError } from '../../../shared/round-recovery.mjs';
import { fixtureReceipt } from './fixture-session.mjs';

function environment({ pending = false, replayMiss = false, fixtureFlag = false,
  targetBps = 14_000, differentMath = false } = {}) {
  const data = new Map(), calls = [];
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const guard = 'b'.repeat(64);
  const receipt = structuredClone(fixtureReceipt());
  if (!fixtureFlag) delete receipt.testOnly;
  const account = {
    authenticated: true, currency: 'ETB', balance: '98.00', sessionGuard: guard,
    blockedByActiveGame: null,
    game: { id: GAME_ID, currency: 'ETB', enabled: true, freshReleaseReady: true,
      betLevels: ['0.20', '0.50'], rollX: { targetBps }, mathVersion: receipt.mathVersion,
      engineVersion: receipt.engineVersion, mathSha256: receipt.mathSha256 },
  };
  const action = { gameId: GAME_ID, bet: '0.20',
    roundToken: '00000000-0000-4000-8000-000000000071', sessionGuard: guard,
    mathVersion: receipt.mathVersion, engineVersion: receipt.engineVersion, mathSha256: receipt.mathSha256 };
  if (pending) storage.setItem(pendingStorageKey(guard), JSON.stringify({ schema: 'zplay-new72-pending-v1', action, retryAt: 0 }));
  if (differentMath) account.game.mathVersion = 'a-new-unretained-version';
  const session = createUnreleasedRollXSession({ storage, retry: { attempts: 1 },
    async request(path, body) {
      calls.push(structuredClone({ path, body }));
      if (body === undefined) return structuredClone(account);
      if (replayMiss) throw new RecoveryError('ROUND_NOT_FOUND_FOR_REPLAY', 404);
      return structuredClone(receipt);
    },
  });
  return { session, calls, storage, guard, action, account };
}

test('even an enabled server model cannot override the unreleased cash gate or issue a wager', async () => {
  const env = environment(); await env.session.connect();
  assert.equal(env.session.kind, 'production');
  assert.equal(env.session.snapshot.cashEnabled, false);
  assert.equal(env.session.snapshot.canSpin, false); assert.equal(env.session.snapshot.canAuto, false);
  assert.equal(env.session.snapshot.phase, 'UNAVAILABLE'); assert.equal(env.session.snapshot.account.balance, '98.00');
  assert.equal(env.session.supportsTarget(14_000), true); assert.equal(env.session.supportsTarget(20_000), false);
  await assert.rejects(env.session.spin({ bet: '0.20', targetBps: 14_000 }), { code: 'RELEASE_NOT_READY' });
  assert.deepEqual(env.calls, [{ path: '/api/slots/fresh-state?gameId=' + GAME_ID, body: undefined }]);
  env.session.dispose();
});

test('missing or unverified target binding never produces a default playable multiplier', async () => {
  const missing = environment({ targetBps: null });
  await assert.rejects(missing.session.connect(), { code: 'ROLLX_TARGET_NOT_VERIFIED' });
  assert.equal(missing.session.supportsTarget(14_000), false); missing.session.dispose();
  const unverified = environment({ targetBps: 300_000 });
  await assert.rejects(unverified.session.connect(), { code: 'ROLLX_TARGET_NOT_VERIFIED' });
  assert.equal(unverified.calls.length, 1); unverified.session.dispose();
});

test('an existing accepted round can be read through replay while new cash play stays disabled', async () => {
  const env = environment({ pending: true }); await env.session.connect();
  assert.equal(env.session.snapshot.phase, 'PENDING');
  const receipt = await env.session.recover();
  assert.equal(receipt.finalWin, '0.28'); assert(Object.isFrozen(receipt));
  assert.equal(env.calls.length, 2); assert.equal(env.calls[1].body.replayOnly, true);
  assert.equal(env.calls[1].body.roundToken, env.action.roundToken);
  assert.equal(env.session.snapshot.account.balance, '98.00');
  assert.equal(env.session.snapshot.balanceFresh, false); assert.equal(env.session.snapshot.canSpin, false);
  assert.equal(env.storage.getItem(pendingStorageKey(env.guard)), null); env.session.dispose();
});

test('an authoritative replay miss cannot fall through to a new wager before release', async () => {
  const env = environment({ pending: true, replayMiss: true }); await env.session.connect();
  await assert.rejects(env.session.recover(), { code: 'RELEASE_NOT_READY' });
  const posts = env.calls.filter(call => call.body !== undefined);
  assert.equal(posts.length, 1); assert.equal(posts[0].body.replayOnly, true);
  assert.equal(env.session.snapshot.pending.roundToken, env.action.roundToken);
  assert(env.storage.getItem(pendingStorageKey(env.guard)));
  assert.equal(env.session.snapshot.canSpin, false); env.session.dispose();
});

test('production recovery rejects fixture receipts and preserves pending identity for investigation', async () => {
  const env = environment({ pending: true, fixtureFlag: true }); await env.session.connect();
  await assert.rejects(env.session.recover(), { code: 'ROLLX_FIXTURE_RECEIPT_REJECTED' });
  assert.equal(env.session.snapshot.pending.roundToken, env.action.roundToken);
  assert(env.storage.getItem(pendingStorageKey(env.guard))); env.session.dispose();
});

test('recovery fails closed if the current model cannot retain the accepted target/math binding', async () => {
  const env = environment({ pending: true, differentMath: true }); await env.session.connect();
  await assert.rejects(env.session.recover(), { code: 'ROLLX_ACCEPTED_MODEL_NOT_RETAINED' });
  assert.equal(env.session.snapshot.pending.roundToken, env.action.roundToken);
  assert.equal(env.calls.filter(call => call.body !== undefined).length, 1); env.session.dispose();
});
