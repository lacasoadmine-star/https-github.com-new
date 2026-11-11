import test from 'node:test';
import assert from 'node:assert/strict';
import { FreshAccountClient, validateReceipt, validateState } from '../client/fresh74-account.mjs';
import { GUARD, OTHER_GUARD, MATH_HASH, ROUND_ID, REQUEST_IDS, receipt, state, storage, mockApi, ids } from './fixtures.mjs';

function client(steps, saved = storage()) {
  const api = mockApi(steps);
  return { account: new FreshAccountClient({ fetchImpl: api.fetchImpl, storage: saved, newId: ids() }), saved, ...api };
}
const code = expected => error => error.code === expected;

test('an uncertain spin persists its original token and retries only the old receipt', async () => {
  const result = receipt();
  const { account, saved, requests } = client([state(), Error('network lost'), result,
    state({ result, balance: result.walletReceipt.balanceAfter })]);
  await account.refresh();
  await assert.rejects(account.start(200), error => error.ambiguous === true);
  assert.equal(account.pending.body.roundToken, REQUEST_IDS[0]);
  assert.equal(saved.values().length, 1);
  assert.throws(() => account.start(200), code('ACTION_IN_PROGRESS'));
  const replay = await account.retry();
  assert.equal(replay.needsRefresh, false);
  const posts = requests.filter(r => r.method === 'POST');
  assert.equal(posts.length, 2);
  assert.deepEqual(posts[1].body, { ...posts[0].body, replayOnly: true });
  assert.equal(posts[0].body.replayOnly, undefined);
  assert.equal(account.pending, null);
  assert.equal(saved.values().length, 0);
});

test('reload restores a pending receipt only for its original authenticated session', async () => {
  const saved = storage();
  const first = client([state(), Error('response unavailable')], saved);
  await first.account.refresh();
  await assert.rejects(first.account.start(200));
  const result = receipt();
  const reloaded = client([state(), result, state({ result, balance: '102.00' })], saved);
  assert.equal(reloaded.account.pending.guard, GUARD);
  await reloaded.account.refresh();
  assert.equal(reloaded.account.pending.body.roundToken, REQUEST_IDS[0]);
  await reloaded.account.retry();
  const post = reloaded.requests.find(r => r.method === 'POST');
  assert.equal(post.body.replayOnly, true);
  assert.equal(post.body.roundToken, REQUEST_IDS[0]);
});

test('switching accounts discards the old session pending receipt without sending it', async () => {
  const saved = storage();
  const first = client([state(), Error('response unavailable')], saved);
  await first.account.refresh();
  await assert.rejects(first.account.start(200));
  const reloaded = client([state({ guard: OTHER_GUARD })], saved);
  await reloaded.account.refresh();
  assert.equal(reloaded.account.sessionChanged, true);
  assert.equal(reloaded.account.pending, null);
  assert.equal(saved.values().length, 0);
  assert.equal(reloaded.requests.filter(r => r.method === 'POST').length, 0);
  assert.throws(() => reloaded.account.retry(), code('NO_PENDING_ACTION'));
});

test('malformed settlement retains pending receipt and cannot enable a second spin', async () => {
  const malformed = receipt();
  malformed.walletReceipt.balanceAfter = '999.00';
  const { account, saved, requests } = client([state(), malformed]);
  await account.refresh();
  await assert.rejects(account.start(200), error => error.code === 'INVALID_ACCOUNT_RESPONSE' && error.ambiguous);
  assert.equal(account.pending.body.roundToken, REQUEST_IDS[0]);
  assert.equal(saved.values().length, 1);
  assert.equal(account.snapshot.balance, '100.00');
  assert.throws(() => account.start(200), code('ACTION_IN_PROGRESS'));
  assert.equal(requests.length, 2);
});

test('accepted spin plus failed refresh requires GET recovery and cannot resend the wager', async () => {
  const result = receipt();
  const { account, saved, requests } = client([state(), result,
    { status: 503, value: { detail: 'TEMPORARY_FAILURE' } },
    state({ result, balance: '102.00' })]);
  await account.refresh();
  const accepted = await account.start(200);
  assert.equal(accepted.result.roundId, ROUND_ID);
  assert.equal(accepted.needsRefresh, true);
  assert.equal(account.pending, null);
  assert.equal(saved.values().length, 0);
  assert.throws(() => account.start(200), code('REFRESH_REQUIRED'));
  assert.throws(() => account.retry(), code('NO_PENDING_ACTION'));
  await account.refresh();
  assert.equal(account.snapshot.balance, '102.00');
  assert.equal(account.needsRefresh, false);
  assert.deepEqual(requests.map(r => [r.path, r.method]), [
    ['/api/slots/fresh-state', 'GET'], ['/api/slots/spin', 'POST'],
    ['/api/slots/fresh-state', 'GET'], ['/api/slots/fresh-state', 'GET'],
  ]);
});

test('receipt-only lookup rejection clears the pending request but never creates a wager', async () => {
  const { account, requests } = client([state(), Error('not delivered'),
    { status: 409, value: { detail: 'ROUND_NOT_CONFIRMED' } }]);
  await account.refresh();
  await assert.rejects(account.start(200));
  await assert.rejects(account.retry(), code('ROUND_NOT_CONFIRMED'));
  assert.equal(account.pending, null);
  assert.equal(account.needsRefresh, true);
  assert.equal(requests.filter(r => r.method === 'POST').length, 2);
  assert.equal(requests.at(-1).body.replayOnly, true);
});

test('the server bet list alone authorizes stakes and preserves exact decimal values', async () => {
  const result = receipt({ bet: '3.70' });
  const { account, requests } = client([
    state({ game: { betLevels: ['3.70', '0.10'] } }), result,
    state({ result, balance: result.walletReceipt.balanceAfter, game: { betLevels: ['3.70', '0.10'] } }),
  ]);
  await account.refresh();
  assert.throws(() => account.start(200), code('INVALID_BET'));
  await account.start(370);
  const sent = requests.find(r => r.method === 'POST').body;
  assert.equal(sent.bet, '3.70');
  assert.equal(sent.mathSha256, MATH_HASH);
  assert.equal(sent.sessionGuard, GUARD);
});

test('closed release, empty enabled stake list, duplicate stakes and active other game fail closed', async () => {
  for (const bad of [state({ game: { betLevels: [] } }), state({ game: { betLevels: ['2.00', '2.00'] } }),
    state({ game: { betLevels: ['0.00'] } })]) assert.throws(() => validateState(bad));
  const closed = client([state({ game: { enabled: false, freshReleaseReady: false, betLevels: [] } })]);
  await closed.account.refresh();
  assert.throws(() => closed.account.start(200), code('FRESH_RELEASE_NOT_ENABLED'));
  const blocked = client([state({ blockedByActiveGame: 'another-game' })]);
  await blocked.account.refresh();
  assert.throws(() => blocked.account.start(200), code('OTHER_GAME_ACTIVE'));
});

test('gamble carries distinct expected attempt and currently confirmed stake for each action', async () => {
  const spin = receipt();
  const first = { roundId: ROUND_ID, attempt: 1, choice: 'RED', revealed: 'RED', won: true, payout: '8.00', balanceAfter: '106.00',
    walletReceipt: { currency: 'ETB', balanceBefore: '102.00', chargedStake: '4.00', finalWin: '8.00', balanceAfter: '106.00' } };
  const second = { roundId: ROUND_ID, attempt: 2, choice: 'BLACK', revealed: 'RED', won: false, payout: '0.00', balanceAfter: '98.00',
    walletReceipt: { currency: 'ETB', balanceBefore: '106.00', chargedStake: '8.00', finalWin: '0.00', balanceAfter: '98.00' } };
  const { account, requests } = client([
    state({ result: spin, balance: '102.00' }), first,
    state({ result: spin, balance: '106.00', gamble: { attempt: 1, stake: '8.00', lastResult: first } }),
    second, state({ result: spin, balance: '98.00', gamble: { attempt: 2, stake: '0.00', available: false, lastResult: second } }),
  ]);
  await account.refresh();
  await account.gamble('RED');
  await account.gamble('BLACK');
  const bodies = requests.filter(r => r.method === 'POST').map(r => r.body);
  assert.equal(bodies[0].expectedAttempt, 1);
  assert.equal(bodies[0].expectedStake, '4.00');
  assert.equal(bodies[1].expectedAttempt, 2);
  assert.equal(bodies[1].expectedStake, '8.00');
  assert.notEqual(bodies[0].roundToken, bodies[1].roundToken);
  assert.equal(bodies[0].roundId, bodies[1].roundId);
});

test('uncertain gamble retry preserves attempt, choice and stake with replayOnly', async () => {
  const spin = receipt();
  const accepted = { roundId: ROUND_ID, attempt: 2, choice: 'BLACK', revealed: 'BLACK', won: true, payout: '16.00', balanceAfter: '114.00',
    walletReceipt: { currency: 'ETB', balanceBefore: '106.00', chargedStake: '8.00', finalWin: '16.00', balanceAfter: '114.00' } };
  const { account, requests } = client([
    state({ result: spin, balance: '106.00', gamble: { attempt: 1, stake: '8.00' } }),
    Error('reply lost'), accepted,
    state({ result: spin, balance: '114.00', gamble: { attempt: 2, stake: '16.00', lastResult: accepted } }),
  ]);
  await account.refresh();
  await assert.rejects(account.gamble('BLACK'));
  await account.retry();
  const posts = requests.filter(r => r.method === 'POST');
  assert.deepEqual(posts[1].body, { ...posts[0].body, replayOnly: true });
  assert.equal(posts[1].body.expectedAttempt, 2);
  assert.equal(posts[1].body.expectedStake, '8.00');
});

test('invalid grid, currency or monetary equations cannot pass receipt validation', () => {
  for (const bad of [receipt({ currency: 'USD' }), receipt({ grid: [['seven']] }), receipt({ wheelMultiplier: 6 }),
    receipt({ bet: '2.01', walletReceipt: receipt().walletReceipt }), receipt({ finalWin: '999.00' })]) {
    assert.throws(() => validateReceipt(bad));
  }
});

test('a response for another stake cannot clear the submitted wager receipt', async () => {
  const { account } = client([state(), receipt({ bet: '5.00' }), state()]);
  await account.refresh();
  await assert.rejects(account.start(200), error => error.code === 'INVALID_ACCOUNT_RESPONSE' && error.ambiguous);
  assert.equal(account.pending.body.bet, '2.00');
});

test('a response for a different engine fingerprint cannot clear the pending request', async () => {
  const { account } = client([state(), receipt({ mathSha256: 'd'.repeat(64) }), state()]);
  await account.refresh();
  await assert.rejects(account.start(200), error => error.code === 'INVALID_ACCOUNT_RESPONSE' && error.ambiguous);
  assert.equal(account.pending.body.mathSha256, MATH_HASH);
});

test('an internally contradictory gamble result remains pending for recovery', async () => {
  const spin = receipt();
  const { account } = client([state({ result: spin, balance: '102.00' }),
    { roundId: ROUND_ID, attempt: 1, choice: 'RED', revealed: 'BLACK', won: false, payout: '8.00', balanceAfter: '106.00' }, state()]);
  await account.refresh();
  await assert.rejects(account.gamble('RED'), error => error.code === 'INVALID_ACCOUNT_RESPONSE' && error.ambiguous);
  assert.equal(account.pending.body.expectedStake, '4.00');
});
