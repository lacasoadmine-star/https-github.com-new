import test from 'node:test';
import assert from 'node:assert/strict';
import { RecoveryError, RoundRecoveryClient, createSameOriginTransport,
  createExclusiveLock, pendingStorageKey, retryAfterMilliseconds } from './round-recovery.mjs';

// Contract-shaped, in-memory test transport only. No live host, account, cookie,
// database, provider math or real money is accessed by this test suite.
const GAME = 'new72_recovery_fixture';
const GUARD_A = 'a'.repeat(64), GUARD_B = 'b'.repeat(64), HASH = 'c'.repeat(64);
const token = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const etb = amount => `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function model(gameId = GAME) {
  return { id: gameId, currency: 'ETB', enabled: true, freshReleaseReady: true,
    betLevels: ['1.00', '2.00'], availableBetLevels: ['1.00', '2.00'],
    mathVersion: 'fixture-rules-1', engineVersion: 'fixture-engine-1', mathSha256: HASH };
}
function ledgerFixture() {
  const f = { guard: GUARD_A, game: model(), calls: [], debitCount: 0, creditCount: 0,
    records: new Map(), balances: new Map([[GUARD_A, 10000n], [GUARD_B, 25000n]]), before: null, after: null };
  f.fetch = async (path, options) => {
    const body = options.body ? JSON.parse(options.body) : undefined;
    const event = { path, body, options };
    f.calls.push(event);
    const intercept = await f.before?.(event);
    if (intercept instanceof Response) return intercept;
    let response, receipt;
    if (path.startsWith('/api/slots/fresh-state?')) {
      const gameId = new URL(path, 'https://fixture.invalid').searchParams.get('gameId');
      response = Response.json({ authenticated: true, currency: 'ETB', sessionGuard: f.guard,
        balance: etb(f.balances.get(f.guard)), game: { ...f.game, id: gameId }, blockedByActiveGame: null });
    } else if (path === '/api/slots/spin') {
      assert.equal(options.method, 'POST');
      assert.deepEqual(Object.keys(body).sort(), ['bet', 'engineVersion', 'gameId', 'mathSha256',
        'mathVersion', 'roundToken', 'sessionGuard', ...(body.replayOnly ? ['replayOnly'] : [])].sort());
      if (body.sessionGuard !== f.guard) return Response.json({ code: 'PLAYER_SESSION_CHANGED' }, { status: 403 });
      const key = f.guard + ':' + body.roundToken, stored = f.records.get(key);
      if (stored) {
        if (stored.gameId !== body.gameId || stored.bet !== body.bet) return Response.json({ code: 'IDEMPOTENCY_PARAMETER_CONFLICT' }, { status: 409 });
        receipt = structuredClone(stored);
      } else if (body.replayOnly) return Response.json({ code: 'ROUND_NOT_FOUND_FOR_REPLAY' }, { status: 404 });
      else {
        if (!f.game.enabled) return Response.json({ code: 'SLOT_RELEASE_NOT_ENABLED' }, { status: 503 });
        if (['mathVersion', 'engineVersion', 'mathSha256'].some(key => body[key] !== f.game[key])) return Response.json({ code: 'PLAYER_MATH_VERSION_STALE' }, { status: 409 });
        // Atomic for this isolated fake: no await occurs between lookup/debit/save.
        // PostgreSQL locks and constraints are not represented by this test.
        const before = f.balances.get(f.guard), stake = BigInt(body.bet.replace('.', '')), win = 200n;
        if (before < stake) return Response.json({ code: 'INSUFFICIENT_FUNDS' }, { status: 402 });
        f.debitCount++; f.creditCount++;
        const after = before - stake + win;
        f.balances.set(f.guard, after);
        receipt = { gameId: body.gameId, bet: body.bet, currency: 'ETB', roundId: token(1000 + f.debitCount),
          isFree: false, mathVersion: body.mathVersion, engineVersion: body.engineVersion,
          mathSha256: body.mathSha256, finalWin: etb(win), fixtureOutcome: 'known-test-result',
          walletReceipt: { currency: 'ETB', balanceBefore: etb(before), chargedStake: body.bet,
            finalWin: etb(win), balanceAfter: etb(after) } };
        f.records.set(key, structuredClone(receipt));
      }
      response = Response.json(receipt);
    } else throw Error('UNEXPECTED_TEST_ENDPOINT');
    const changed = await f.after?.({ ...event, receipt, response });
    return changed instanceof Response ? changed : response;
  };
  return f;
}
function makeClient(f = ledgerFixture(), options = {}) {
  const storage = options.storage ?? memoryStorage(), events = [], states = [], delays = [];
  let timestamp = 1800000000000, generated = 0;
  const clock = options.clock ?? { now: () => timestamp, advance: ms => { timestamp += ms; } };
  const client = new RoundRecoveryClient({ gameId: GAME, storage,
    request: createSameOriginTransport({ fetcher: f.fetch, timeoutMs: 1000, now: clock.now }),
    uuid: () => token(++generated), now: clock.now,
    delay: async ms => { delays.push(ms); clock.advance(ms); },
    validateModel: game => { assert.equal(game.id, options.gameId ?? GAME); },
    validateReceipt: receipt => { if (receipt.fixtureOutcome !== 'known-test-result') throw new RecoveryError('GAME_RECEIPT_INVALID'); },
    onState: state => states.push(state), onEvent: event => events.push(event), ...options });
  return { client, f, storage, events, states, delays, clock, generated: () => generated };
}
const posts = f => f.calls.filter(call => call.path === '/api/slots/spin');
async function loseAccepted(h) {
  let dropped = false;
  h.f.after = event => {
    if (event.receipt && !event.body.replayOnly && !dropped) { dropped = true; throw Error('test response lost after acceptance'); }
  };
  await h.client.connect();
  await assert.rejects(h.client.spin('1.00'), { code: 'NETWORK_UNAVAILABLE' });
  h.f.after = null;
  assert.equal(h.f.debitCount, 1);
}

test('requires per-game model and receipt validation before it can be constructed', () => {
  assert.throws(() => new RoundRecoveryClient({ gameId: GAME, storage: memoryStorage() }), { code: 'RECOVERY_DEPENDENCIES_REQUIRED' });
});

test('persists only request identity before POST and enables next round after authoritative refresh', async () => {
  const h = makeClient();
  h.f.before = event => {
    if (!event.body) return;
    const saved = JSON.parse(h.storage.getItem(pendingStorageKey(GUARD_A)));
    assert.equal(saved.action.roundToken, event.body.roundToken);
    assert.equal(saved.action.bet, '1.00');
    assert.deepEqual(Object.keys(saved).sort(), ['action', 'retryAt', 'schema']);
    assert.equal(saved.action.balance, undefined);
    assert.equal(saved.action.cookie, undefined);
    assert.equal(saved.action.password, undefined);
  };
  await h.client.connect();
  assert.equal(h.client.canSpin, true);
  const receipt = await h.client.spin('1.00');
  assert.equal(receipt.walletReceipt.balanceAfter, '101.00');
  assert.equal(h.client.snapshot.phase, 'SETTLED');
  assert.equal(h.client.snapshot.canAuto, false);
  assert.equal(h.client.snapshot.balanceFresh, false);
  assert.equal(h.client.snapshot.account.balance, '100.00'); // Never fabricate/overwrite current balance from old receipt.
  assert.equal(h.storage.values.size, 0);
  h.f.balances.set(GUARD_A, 9900n); // Separate already-settled activity in another tab.
  await h.client.refresh();
  assert.equal(h.client.snapshot.account.balance, '99.00');
  assert.equal(h.client.snapshot.canAuto, true);
  await h.client.spin('1.00');
  assert.equal(h.f.debitCount, 2);
  assert.equal(h.generated(), 2);
});

test('lost response after accepted settlement replays original receipt with no second debit or credit', async () => {
  const h = makeClient(); await loseAccepted(h);
  assert.equal(h.client.snapshot.phase, 'PENDING');
  assert.equal(h.client.snapshot.canAuto, false);
  await assert.rejects(h.client.spin('2.00'), { code: 'ROUND_NOT_READY' });
  const recovered = await h.client.recover();
  assert.equal(recovered.roundId, token(1001));
  assert.equal(h.f.debitCount, 1); assert.equal(h.f.creditCount, 1);
  assert.equal(h.generated(), 1);
  assert.deepEqual(posts(h.f).map(call => [call.body.roundToken, !!call.body.replayOnly]), [[token(1), false], [token(1), true]]);
});

test('lost request before acceptance first checks replay, then resends exact same key after explicit miss', async () => {
  const h = makeClient(); let dropped = false;
  h.f.before = event => {
    if (event.body && !event.body.replayOnly && !dropped) { dropped = true; throw Error('test request never arrived'); }
  };
  await h.client.connect();
  await assert.rejects(h.client.spin('1.00'), { code: 'NETWORK_UNAVAILABLE' });
  assert.equal(h.f.debitCount, 0);
  const beforeRecovery = h.f.calls.length;
  await h.client.recover();
  assert.deepEqual(h.f.calls.slice(beforeRecovery).map(call => call.body ? !!call.body.replayOnly : 'state'), [true, 'state', false]);
  assert.equal(h.f.debitCount, 1); assert.equal(h.generated(), 1);
  const bodies = posts(h.f).map(call => call.body);
  assert.deepEqual(bodies[0], bodies[2]);
});

test('refresh reconstruction retains pending request and never invents a replacement token', async () => {
  const h = makeClient(); await loseAccepted(h); h.client.dispose();
  const resumed = makeClient(h.f, { storage: h.storage, uuid: () => { throw Error('must not generate replacement'); } });
  await resumed.client.connect();
  assert.equal(resumed.client.snapshot.phase, 'PENDING');
  await resumed.client.recover();
  assert.equal(h.f.debitCount, 1); assert.equal(h.storage.values.size, 0);
});

test('late first acceptance racing the same-key resend still settles once in the contract fake', async () => {
  const f = ledgerFixture(); let delayedFirst = null, arrivedLate = false;
  const request = createSameOriginTransport({ fetcher: async (path, options) => {
    const body = options.body ? JSON.parse(options.body) : null;
    if (body && !body.replayOnly && !delayedFirst) {
      delayedFirst = { path, options };
      throw Error('network reports loss while first delivery is delayed');
    }
    if (body && !body.replayOnly && !arrivedLate) {
      arrivedLate = true;
      // The first delivery commits after the replay miss but before the retry.
      await f.fetch(delayedFirst.path, delayedFirst.options);
    }
    return f.fetch(path, options);
  } });
  const h = makeClient(f, { request });
  await h.client.connect(); await assert.rejects(h.client.spin('1.00'));
  const receipt = await h.client.recover();
  assert.equal(receipt.roundId, token(1001)); assert.equal(f.debitCount, 1); assert.equal(f.creditCount, 1);
  assert.equal(h.generated(), 1);
  assert.deepEqual(posts(f).map(call => !!call.body.replayOnly), [true, false, false]);
});

test('generic 404 is not the explicit replay miss and cannot authorize resubmission', async () => {
  const h = makeClient(); await loseAccepted(h);
  h.f.before = event => event.body?.replayOnly ? Response.json({ code: 'ROUTE_NOT_FOUND' }, { status: 404 }) : undefined;
  await assert.rejects(h.client.recover(), { code: 'ROUTE_NOT_FOUND' });
  assert.equal(posts(h.f).filter(call => !call.body.replayOnly).length, 1);
  assert.equal(h.client.snapshot.phase, 'PENDING');
});

test('bounded 5xx replay retries retain request and emit delay reasons', async () => {
  const h = makeClient(); await loseAccepted(h);
  h.f.before = event => event.body?.replayOnly ? Response.json({ code: 'SERVICE_UNAVAILABLE' }, { status: 503 }) : undefined;
  await assert.rejects(h.client.recover(), { code: 'SERVICE_UNAVAILABLE', status: 503 });
  assert.equal(posts(h.f).filter(call => call.body.replayOnly).length, 3);
  assert.deepEqual(h.delays, [250, 500]);
  assert.equal(h.events.filter(event => event.reason === 'bounded_read_only_retry').length, 2);
  assert.equal(h.events.at(-1).reason, 'saved_request_retained');
  assert.equal(h.f.debitCount, 1); assert.equal(h.client.snapshot.phase, 'PENDING');
});

test('429 Retry-After delays the same read-only request before retry', async () => {
  const h = makeClient(); await loseAccepted(h); let limited = false;
  h.f.before = event => {
    if (event.body?.replayOnly && !limited) { limited = true; return Response.json({ code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '1' } }); }
  };
  await h.client.recover();
  assert.deepEqual(h.delays, [1000]);
  assert.equal(h.f.debitCount, 1);
});

test('long Retry-After is persisted, defers without shortening it, and survives refresh', async () => {
  const h = makeClient(); await loseAccepted(h);
  h.f.before = event => event.body?.replayOnly ? Response.json({ code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': '120' } }) : undefined;
  const start = h.clock.now();
  await assert.rejects(h.client.recover(), { code: 'RETRY_DEFERRED', status: 429 });
  assert.equal(h.delays.length, 0);
  assert.equal(JSON.parse(h.storage.getItem(pendingStorageKey(GUARD_A))).retryAt, start + 120000);
  h.client.dispose(); h.f.before = null;
  const resumed = makeClient(h.f, { storage: h.storage, clock: h.clock });
  await resumed.client.connect();
  const before = posts(h.f).length;
  await assert.rejects(resumed.client.recover(), { code: 'RETRY_DEFERRED' });
  assert.equal(posts(h.f).length, before);
  h.clock.advance(120000);
  await resumed.client.recover();
  assert.equal(h.f.debitCount, 1);
});

for (const status of [401, 403]) test(`${status} preserves original pending identity and requires account recovery`, async () => {
  const h = makeClient(); await h.client.connect();
  h.f.before = event => event.body ? Response.json({ code: status === 401 ? 'PLAYER_LOGIN_REQUIRED' : 'PLAYER_SESSION_CHANGED' }, { status }) : undefined;
  await assert.rejects(h.client.spin('1.00'), { status });
  assert.equal(h.client.snapshot.phase, 'AUTH_REQUIRED');
  assert.equal(h.client.snapshot.pending.roundToken, token(1));
  assert.equal(h.storage.values.size, 1);
  assert.equal(h.client.snapshot.canAuto, false);
  assert.equal(h.f.debitCount, 0);
  h.f.before = null;
  await h.client.recover(); // Authenticated replay miss, then same original request.
  assert.equal(h.f.debitCount, 1); assert.equal(h.generated(), 1);
});

test('pre-spin fresh-state detects replaced session before any financial request', async () => {
  const h = makeClient(); await h.client.connect(); h.f.guard = GUARD_B;
  await assert.rejects(h.client.spin('1.00'), { code: 'SESSION_CHANGED', status: 403 });
  assert.equal(posts(h.f).length, 0); assert.equal(h.storage.values.size, 0);
});

test('new account has independent scope while old pending remains available under its original guard', async () => {
  const h = makeClient(); await loseAccepted(h); h.client.disconnect(); h.f.guard = GUARD_B;
  await h.client.connect();
  assert.equal(h.client.snapshot.account.balance, '250.00');
  assert.equal(h.client.snapshot.pending, null);
  await h.client.spin('1.00');
  assert.ok(h.storage.getItem(pendingStorageKey(GUARD_A)));
  assert.equal(h.storage.getItem(pendingStorageKey(GUARD_B)), null);
  h.client.disconnect(); h.f.guard = GUARD_A;
  await h.client.connect(); await h.client.recover();
  assert.equal(h.f.debitCount, 2); assert.equal(h.storage.values.size, 0);
});

test('late accepted response after session replacement cannot update new session or erase old request', async () => {
  const h = makeClient(), reached = deferred(), release = deferred();
  await h.client.connect();
  h.f.after = async event => { if (event.receipt) { reached.resolve(); await release.promise; } };
  const old = h.client.spin('1.00'); await reached.promise;
  h.client.disconnect(); h.f.guard = GUARD_B; await h.client.connect();
  const stateCount = h.states.length;
  release.resolve(); await assert.rejects(old, { code: 'STALE_OPERATION' });
  assert.equal(h.states.length, stateCount);
  assert.equal(h.client.snapshot.account.sessionGuard, GUARD_B);
  assert.equal(h.client.snapshot.account.balance, '250.00');
  assert.ok(h.storage.getItem(pendingStorageKey(GUARD_A)));
});

test('dispose ignores a late accepted response and preserves request for another instance', async () => {
  const h = makeClient(), reached = deferred(), release = deferred(); await h.client.connect();
  h.f.after = async event => { if (event.receipt) { reached.resolve(); await release.promise; } };
  const action = h.client.spin('1.00'); await reached.promise;
  h.client.dispose(); const count = h.states.length; release.resolve();
  await assert.rejects(action, { code: 'STALE_OPERATION' });
  assert.equal(h.states.length, count); assert.equal(h.client.snapshot.phase, 'DISPOSED');
  assert.ok(h.storage.getItem(pendingStorageKey(GUARD_A)));
  await assert.rejects(h.client.connect(), { code: 'CLIENT_DISPOSED' });
  h.client.disconnect(); assert.equal(h.client.snapshot.phase, 'DISPOSED');
});

test('malformed authoritative wallet receipt remains recoverable and cannot fabricate a payout', async () => {
  const h = makeClient(); await h.client.connect();
  h.f.after = event => event.receipt ? Response.json({ ...event.receipt,
    walletReceipt: { ...event.receipt.walletReceipt, balanceAfter: '99999.00' } }) : undefined;
  await assert.rejects(h.client.spin('1.00'), { code: 'INVALID_AUTHORITATIVE_SETTLEMENT' });
  assert.equal(h.client.snapshot.phase, 'PENDING'); assert.equal(h.client.snapshot.account.balance, '100.00');
  h.f.after = null; await h.client.recover(); assert.equal(h.f.debitCount, 1);
});

for (const [label, changed] of [['game', { gameId: 'wrong_game' }], ['stake', { bet: '2.00' }],
  ['math', { mathVersion: 'another-version' }], ['request', { roundToken: token(999) }]]) {
  test(`mismatched ${label} in response preserves pending without another financial request`, async () => {
    const h = makeClient(); await h.client.connect();
    h.f.after = event => event.receipt ? Response.json({ ...event.receipt, ...changed }) : undefined;
    await assert.rejects(h.client.spin('1.00'));
    assert.equal(h.client.snapshot.phase, 'PENDING');
    assert.equal(h.f.debitCount, 1); assert.equal(posts(h.f).length, 1);
  });
}

test('per-game receipt validation is mandatory even when common wallet fields are valid', async () => {
  const h = makeClient(undefined, { validateReceipt: () => { throw new RecoveryError('GAME_RULE_NOT_CONFIRMED'); } });
  await h.client.connect();
  await assert.rejects(h.client.spin('1.00'), { code: 'GAME_RULE_NOT_CONFIRMED' });
  assert.equal(h.client.snapshot.phase, 'PENDING'); assert.equal(h.storage.values.size, 1);
});

test('current model change before first submit requires review and cannot silently change accepted rules', async () => {
  const h = makeClient(); await h.client.connect(); h.f.game.mathVersion = 'fixture-rules-2';
  await assert.rejects(h.client.spin('1.00'), { code: 'GAME_RULES_UPDATED_RELOAD' });
  assert.equal(posts(h.f).length, 0); assert.equal(h.storage.values.size, 0);
});

test('model change after replay miss prevents same token becoming a wager under different rules', async () => {
  const h = makeClient(); let dropped = false;
  h.f.before = event => { if (event.body && !event.body.replayOnly && !dropped) { dropped = true; throw Error('dropped before arrival'); } };
  await h.client.connect(); await assert.rejects(h.client.spin('1.00'));
  h.f.game.mathVersion = 'fixture-rules-2';
  await assert.rejects(h.client.recover(), { code: 'SAVED_ROUND_REPLAY_ONLY' });
  assert.equal(h.f.debitCount, 0); assert.equal(posts(h.f).length, 2);
  assert.equal(h.client.snapshot.pending.mathVersion, 'fixture-rules-1');
});

test('previously settled round can replay while game is disabled and current model has advanced', async () => {
  const h = makeClient(); await loseAccepted(h); h.client.disconnect();
  h.f.game.enabled = false; h.f.game.mathVersion = 'fixture-rules-2';
  await h.client.connect();
  const receipt = await h.client.recover();
  assert.equal(receipt.mathVersion, 'fixture-rules-1'); assert.equal(h.f.debitCount, 1);
  await h.client.refresh(); assert.equal(h.client.snapshot.phase, 'UNAVAILABLE');
});

test('double click or repeated key activation cannot queue another spin', async () => {
  const h = makeClient(), reached = deferred(), release = deferred(); await h.client.connect();
  h.f.after = async event => { if (event.receipt) { reached.resolve(); await release.promise; } };
  const first = h.client.spin('1.00'); await reached.promise;
  await assert.rejects(h.client.spin('1.00'), { code: 'ROUND_NOT_READY' });
  release.resolve(); await first;
  assert.equal(posts(h.f).length, 1); assert.equal(h.f.debitCount, 1);
});

test('cooperating instances reject concurrent action and share unresolved request across games', async () => {
  const f = ledgerFixture(), storage = memoryStorage(), lock = createExclusiveLock(null);
  const a = makeClient(f, { storage, lock }), b = makeClient(f, { storage, lock, gameId: 'new72_other_fixture' });
  await a.client.connect(); await b.client.connect();
  const reached = deferred(), release = deferred();
  f.after = async event => { if (event.receipt) { reached.resolve(); await release.promise; throw Error('response lost'); } };
  const first = a.client.spin('1.00'); await reached.promise;
  await assert.rejects(b.client.spin('1.00'), { code: 'ROUND_BUSY' });
  release.resolve(); await assert.rejects(first);
  f.after = null; await b.client.connect();
  assert.equal(b.client.snapshot.phase, 'OTHER_GAME_PENDING');
  assert.equal(b.client.snapshot.canAuto, false);
  await assert.rejects(b.client.spin('1.00'), { code: 'ROUND_NOT_READY' });
  await assert.rejects(b.client.recover(), { code: 'ROUND_NOT_RECOVERABLE' });
  await a.client.recover(); assert.equal(f.debitCount, 1);
});

test('a late result cannot remove newer persisted ownership', async () => {
  const h = makeClient(), reached = deferred(), release = deferred(); await h.client.connect();
  h.f.after = async event => { if (event.receipt) { reached.resolve(); await release.promise; } };
  const action = h.client.spin('1.00'); await reached.promise;
  const saved = JSON.parse(h.storage.getItem(pendingStorageKey(GUARD_A)));
  saved.action.roundToken = token(999);
  h.storage.setItem(pendingStorageKey(GUARD_A), JSON.stringify(saved));
  release.resolve(); await assert.rejects(action, { code: 'PENDING_REQUEST_CHANGED' });
  assert.equal(JSON.parse(h.storage.getItem(pendingStorageKey(GUARD_A))).action.roundToken, token(999));
  assert.equal(h.client.snapshot.receipt, null);
});

test('corrupt or cross-session persisted metadata blocks without sending it or deleting it', async () => {
  for (const raw of ['{broken', JSON.stringify({ schema: 'zplay-new72-pending-v1', retryAt: 0,
    action: { gameId: GAME, bet: '1.00', roundToken: token(1), sessionGuard: GUARD_B,
      mathVersion: 'fixture-rules-1', engineVersion: 'fixture-engine-1', mathSha256: HASH } })]) {
    const h = makeClient(); h.storage.setItem(pendingStorageKey(GUARD_A), raw);
    await assert.rejects(h.client.connect());
    assert.equal(posts(h.f).length, 0); assert.equal(h.storage.getItem(pendingStorageKey(GUARD_A)), raw);
  }
});

test('failed persistence cannot precede a financial POST', async () => {
  const storage = memoryStorage(); storage.setItem = () => { throw Error('quota unavailable'); };
  const h = makeClient(undefined, { storage }); await h.client.connect();
  await assert.rejects(h.client.spin('1.00'), /quota unavailable/);
  assert.equal(posts(h.f).length, 0); assert.equal(h.f.debitCount, 0);
});

test('known initial pre-settlement rejection clears request but unknown 400 preserves it', async () => {
  for (const [status, code, retained] of [[402, 'INSUFFICIENT_FUNDS', false],
    [422, 'BET_OUTSIDE_EXISTING_LADDER', false], [400, 'UNEXPECTED_SERVER_FAILURE', true]]) {
    const h = makeClient(); await h.client.connect();
    h.f.before = event => event.body ? Response.json({ code }, { status }) : undefined;
    await assert.rejects(h.client.spin('1.00'), { status, code });
    assert.equal(h.storage.values.size, retained ? 1 : 0);
    assert.equal(h.f.debitCount, 0);
  }
});

test('read-only preflight retries exhaust without sending a wager', async () => {
  const h = makeClient(); await h.client.connect();
  h.f.before = () => Response.json({ code: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  await assert.rejects(h.client.spin('1.00'), { code: 'SERVICE_UNAVAILABLE' });
  assert.equal(posts(h.f).length, 0); assert.deepEqual(h.delays, [250, 500]);
});

test('idempotency conflict during recovery remains visible and cannot create a fresh request', async () => {
  const h = makeClient(); await loseAccepted(h);
  h.f.before = event => event.body?.replayOnly ? Response.json({ code: 'IDEMPOTENCY_PARAMETER_CONFLICT' }, { status: 409 }) : undefined;
  await assert.rejects(h.client.recover(), { code: 'IDEMPOTENCY_PARAMETER_CONFLICT' });
  assert.equal(h.client.snapshot.phase, 'PENDING'); assert.equal(h.generated(), 1); assert.equal(h.f.debitCount, 1);
});

test('timeout leaves a recoverable token; aborted transport never implies rollback', async () => {
  const f = ledgerFixture(); let first = true;
  const fetcher = async (path, options) => {
    if (path === '/api/slots/spin' && first) {
      first = false;
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('abort')), { once: true }));
    }
    return f.fetch(path, options);
  };
  const h = makeClient(f, { request: createSameOriginTransport({ fetcher, timeoutMs: 5 }) });
  await h.client.connect();
  await assert.rejects(h.client.spin('1.00'), { code: 'REQUEST_TIMEOUT' });
  assert.equal(h.client.snapshot.phase, 'PENDING');
  await h.client.recover();
  assert.equal(f.debitCount, 1); assert.equal(h.generated(), 1);
});

test('money format is exact and rejected locally without financial request', async () => {
  for (const bet of ['1', '01.00', '1.001', 1, '-1.00']) {
    const h = makeClient(); await h.client.connect();
    await assert.rejects(h.client.spin(bet));
    assert.equal(posts(h.f).length, 0);
  }
});

test('transport only addresses the two existing routes with same-origin cookie policy', async () => {
  const seen = [];
  const request = createSameOriginTransport({ fetcher: async (path, options) => {
    seen.push({ path, options }); return Response.json({ ok: true });
  } });
  for (const path of ['https://elsewhere.invalid/api/slots/spin', '//elsewhere.invalid/api/slots/spin',
    '/api/new-wallet', '/api/slots/spin?host=bad', '/api/slots/fresh-state?gameId=' + GAME + '&extra=1']) {
    await assert.rejects(request(path, {}), { code: 'INVALID_EXISTING_ROUTE' });
  }
  assert.equal(seen.length, 0);
  await request('/api/slots/fresh-state?gameId=' + GAME);
  await request('/api/slots/spin', { fixture: true });
  for (const { options } of seen) {
    assert.equal(options.credentials, 'same-origin'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.equal(options.headers.cookie, undefined); assert.equal(options.headers.authorization, undefined);
  }
});

test('Retry-After accepts server seconds and HTTP-date without time truncation', () => {
  const now = Date.parse('2026-11-21T20:00:00Z');
  assert.equal(retryAfterMilliseconds('3', now), 3000);
  assert.equal(retryAfterMilliseconds('Sat, 21 Nov 2026 20:00:05 GMT', now), 5000);
  assert.equal(retryAfterMilliseconds('Sat, 21 Nov 2026 19:59:59 GMT', now), 0);
  assert.equal(retryAfterMilliseconds('not-a-date', now), null);
});

test('UI observer failure cannot erase a successful result or repeat settlement', async () => {
  const h = makeClient(undefined, { onState: () => { throw Error('renderer callback failed'); } });
  await h.client.connect(); await h.client.spin('1.00');
  assert.equal(h.f.debitCount, 1); assert.equal(h.client.snapshot.phase, 'SETTLED'); assert.equal(h.storage.values.size, 0);
});

for (const method of ['connect', 'refresh', 'spin']) test(
  `${method} cannot restore a disconnected session after the fresh-state await boundary`, async () => {
    let invalidate = method === 'connect', h;
    h = makeClient(undefined, { validateModel: () => {
      if (invalidate) queueMicrotask(() => queueMicrotask(() => h.client.disconnect()));
    } });
    if (method !== 'connect') { await h.client.connect(); invalidate = true; }
    await assert.rejects(method === 'spin' ? h.client.spin('1.00') : h.client[method](), { code: 'STALE_OPERATION' });
    assert.equal(h.client.snapshot.phase, 'DISCONNECTED');
    assert.equal(h.client.snapshot.account, null);
    assert.equal(h.client.canSpin, false); assert.equal(h.client.snapshot.canAuto, false);
    assert.equal(posts(h.f).length, 0); assert.equal(h.storage.values.size, 0);
  });

test('disconnect after replay-miss fresh-state prevents a same-key resend and retains pending intent', async () => {
  let invalidate = false, h;
  h = makeClient(undefined, { validateModel: () => {
    if (invalidate) queueMicrotask(() => queueMicrotask(() => h.client.disconnect()));
  } });
  h.f.before = event => { if (event.body && !event.body.replayOnly) throw Error('request lost before arrival'); };
  await h.client.connect(); await assert.rejects(h.client.spin('1.00'), { code: 'NETWORK_UNAVAILABLE' });
  const saved = h.storage.getItem(pendingStorageKey(GUARD_A));
  invalidate = true; h.f.before = null;
  await assert.rejects(h.client.recover(), { code: 'STALE_OPERATION' });
  assert.equal(h.client.snapshot.phase, 'DISCONNECTED'); assert.equal(h.client.snapshot.account, null);
  assert.deepEqual(posts(h.f).map(call => !!call.body.replayOnly), [false, true]);
  assert.equal(h.storage.getItem(pendingStorageKey(GUARD_A)), saved); assert.equal(h.f.debitCount, 0);
});

for (const method of ['spin', 'recover']) test(
  `${method} does not publish an accepted receipt after disconnect during lock return`, async () => {
    let invalidate = false, h;
    h = makeClient(undefined, { onState: state => {
      if (invalidate && state.phase === 'SETTLED') queueMicrotask(() => h.client.disconnect());
    } });
    if (method === 'recover') await loseAccepted(h);
    else await h.client.connect();
    invalidate = true;
    await assert.rejects(method === 'spin' ? h.client.spin('1.00') : h.client.recover(), { code: 'STALE_OPERATION' });
    assert.equal(h.client.snapshot.phase, 'DISCONNECTED'); assert.equal(h.client.snapshot.receipt, null);
    assert.equal(h.f.debitCount, 1); assert.equal(h.f.creditCount, 1);
    assert.equal(h.storage.values.size, 0, 'settled request must not be re-created by stale caller cancellation');
  });

for (const method of ['connect', 'refresh']) test(
  `${method} rejects a synchronous disconnect from the READY observer`, async () => {
    let invalidate = method === 'connect', h;
    h = makeClient(undefined, { onState: state => {
      if (invalidate && state.phase === 'READY') h.client.disconnect();
    } });
    if (method === 'refresh') { await h.client.connect(); invalidate = true; }
    await assert.rejects(h.client[method](), { code: 'STALE_OPERATION' });
    assert.equal(h.client.snapshot.phase, 'DISCONNECTED'); assert.equal(h.client.canSpin, false);
  });

for (const discover of ['refresh', 'spin']) test(
  `cooperating client discovering pending through ${discover} honors its saved Retry-After`, async () => {
    const f = ledgerFixture(), storage = memoryStorage();
    const first = makeClient(f, { storage });
    const waiting = makeClient(f, { storage, clock: first.clock });
    await waiting.client.connect();
    await loseAccepted(first);
    f.before = event => event.body?.replayOnly ? Response.json({ code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': '120' } }) : undefined;
    await assert.rejects(first.client.recover(), { code: 'RETRY_DEFERRED' });
    f.before = null;
    if (discover === 'refresh') await waiting.client.refresh();
    else await assert.rejects(waiting.client.spin('1.00'), { code: 'PENDING_ROUND_REQUIRES_RECOVERY' });
    const before = posts(f).length;
    await assert.rejects(waiting.client.recover(), { code: 'RETRY_DEFERRED' });
    assert.equal(posts(f).length, before, 'shared cooldown must prevent even a replay request');
    assert.equal(waiting.client.snapshot.retryAt, first.clock.now() + 120000);
    first.clock.advance(120000);
    await waiting.client.recover();
    assert.equal(f.debitCount, 1); assert.equal(f.creditCount, 1);
  });

test('recovery reloads a newer Retry-After written by another cooperating client', async () => {
  const first = makeClient(); await loseAccepted(first);
  const waiting = makeClient(first.f, { storage: first.storage, clock: first.clock });
  await waiting.client.connect();
  assert.equal(waiting.client.snapshot.retryAt, null);
  first.f.before = event => event.body?.replayOnly ? Response.json({ code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': '120' } }) : undefined;
  await assert.rejects(first.client.recover(), { code: 'RETRY_DEFERRED' });
  first.f.before = null;
  const before = posts(first.f).length;
  await assert.rejects(waiting.client.recover(), { code: 'RETRY_DEFERRED' });
  assert.equal(posts(first.f).length, before);
  assert.equal(waiting.client.snapshot.retryAt, first.clock.now() + 120000);
  first.clock.advance(120000);
  await waiting.client.recover();
  assert.equal(first.f.debitCount, 1); assert.equal(first.f.creditCount, 1);
});
