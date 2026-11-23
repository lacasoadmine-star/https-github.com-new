import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createBurnTestRuntime, bindBurnTestFetch, BURN_TEST_BASE, BURN_TEST_PLAYER_BASE } from './simulation.mjs';
import { BURN_WILDS_GAME_ID } from '../expansion.mjs';
import { quoteBurnWildsFinalGrid, auditBurnWildsPayout } from '../outcome-audit.mjs';

const origin = 'https://superwin-player.apdiy61.workers.dev';
const key = () => webcrypto.randomUUID();
const clean = value => structuredClone(value);
function fixtureSampler(win = true) {
  return { approved: false, sampleOutcome({ betMinor }) {
    const originalGrid = win ? Array.from({ length: 5 }, () => ['orange', 'orange', 'orange']) :
      [['orange', 'orange', 'orange'], ['lemon', 'lemon', 'lemon'], ['plum', 'plum', 'plum'],
        ['bell', 'bell', 'bell'], ['seven', 'seven', 'seven']];
    const quote = quoteBurnWildsFinalGrid({ finalGrid: originalGrid, betMinor, multiplier: 1 });
    return { originalGrid, finalGrid: clean(originalGrid), multiplier: 1, expandedColumns: [],
      winMinor: quote.totalWinMinor, winLines: quote.winLines.map(({ id, rows, winMinor }) => ({ id, rows, winMinor })) };
  }, maximumPayoutMinor: bet => bet * 2500n };
}
function harness(options = {}) {
  let time = 1_800_000_000_000; const logs = [];
  const runtime = createBurnTestRuntime({ cryptoImpl: webcrypto, now: () => time,
    logger: entry => logs.push(entry), ...options });
  const request = (route, { token, body, method = body === undefined ? 'GET' : 'POST',
    requestOrigin = origin, headers = {}, base = BURN_TEST_BASE } = {}) => new Request(origin + base + '/' + route, {
    method, headers: { ...(requestOrigin === null ? {} : { origin: requestOrigin }),
      ...(token ? { 'x-burn-test-session': token } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
    ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
  const call = async (route, options) => {
    const response = await runtime.fetch(request(route, options));
    return { status: response.status, data: await response.json(), headers: response.headers };
  };
  async function session() {
    const result = await call('session', { body: { mode: 'SIMULATION' } });
    assert.equal(result.status, 201);
    return { token: result.data.testSessionToken, subject: result.data.state.subject, initial: result.data.state };
  }
  const action = (s, type, extra = {}) => ({ gameId: BURN_WILDS_GAME_ID, action: type,
    testSubject: s.subject, requestKey: key(), ...(type === 'SPIN' ? { betMinor: 100, auto: false, collectRoundId: null } : {}), ...extra });
  return { runtime, request, call, session, action, logs, advance: ms => { time += ms; } };
}

test('explicit ephemeral TEST ETB session is never an authenticated player or cash wallet', async () => {
  const h = harness();
  const noMode = await h.call('session', { body: {} });
  assert.equal(noMode.status, 400);
  const s = await h.session();
  assert.match(s.token, /^[a-f0-9]{64}$/);
  assert.notEqual(s.token, s.subject);
  assert.equal(s.initial.currency, 'ETB');
  assert.equal(s.initial.mode, 'SIMULATION');
  assert.equal(s.initial.authenticated, false);
  assert.equal(s.initial.cashEnabled, false);
  assert.equal(s.initial.balanceMinor, 2_000_000);
  assert.deepEqual(s.initial.betLevelsMinor, [100, 200, 500, 1000, 2000]);
  const health = await h.call('health', { requestOrigin: null });
  assert.equal(health.data.productionWalletUsed, false);
  assert.equal(health.data.databaseUsed, false);
  assert.equal(health.data.providerProbabilityModel, false);
  assert.equal(health.data.verifiedRtp, null);
});

test('twenty fresh cryptographic candidate rounds preserve test balance and replay identity', async () => {
  const h = harness(), s = await h.session(); let balance = s.initial.balanceMinor;
  const grids = new Set(), ids = new Set();
  for (let i = 0; i < 20; i++) {
    const a = h.action(s, 'SPIN', { betMinor: [100, 200, 500, 1000, 2000][i % 5] });
    const first = await h.call('spin', { token: s.token, body: a });
    assert.equal(first.status, 200);
    auditBurnWildsPayout(first.data);
    balance -= a.betMinor;
    assert.equal(first.data.balanceMinor, balance);
    assert.equal(first.data.pendingWinMinor, first.data.winMinor);
    assert.equal(first.data.subject, s.subject);
    assert.equal(first.data.cashEnabled, false);
    const repeated = await h.call('spin', { token: s.token, body: { ...a, replayOnly: true } });
    assert.deepEqual(repeated.data, first.data);
    grids.add(JSON.stringify(first.data.originalGrid)); ids.add(first.data.roundId);
    if (first.data.winMinor > 0) {
      const taken = await h.call('take', { token: s.token,
        body: h.action(s, 'TAKE', { roundId: first.data.roundId }) });
      balance += first.data.winMinor;
      assert.equal(taken.status, 200); assert.equal(taken.data.balanceMinor, balance);
      assert.equal(taken.data.pendingWinMinor, 0);
    }
    assert.equal((await h.call('state', { token: s.token })).data.balanceMinor, balance);
    h.advance(1000);
  }
  assert.equal(ids.size, 20); assert.ok(grids.size > 1);
  const history = (await h.call('history', { token: s.token })).data;
  assert.equal(history.history.filter(row => row.action === 'SPIN').length, 20);
  assert.equal(h.logs.filter(row => row.event === 'test-action-accepted' && row.action === 'SPIN').length, 20);
});

test('a winning SPIN holds its win until one TAKE; replay after collection cannot credit again', async () => {
  const h = harness({ sampler: fixtureSampler() }), s = await h.session(), a = h.action(s, 'SPIN');
  const spun = (await h.call('spin', { token: s.token, body: a })).data;
  assert.equal(spun.balanceMinor, s.initial.balanceMinor - 100);
  assert.equal(spun.pendingWinMinor, 2500);
  assert.equal((await h.call('state', { token: s.token })).data.pendingWinMinor, 2500);
  const take = h.action(s, 'TAKE', { roundId: spun.roundId });
  const results = await Promise.all(Array.from({ length: 20 }, () => h.call('take', { token: s.token, body: take })));
  for (const result of results) { assert.equal(result.status, 200); assert.deepEqual(result.data, results[0].data); }
  assert.equal(results[0].data.balanceMinor, s.initial.balanceMinor - 100 + 2500);
  const duplicate = await h.call('take', { token: s.token, body: h.action(s, 'TAKE', { roundId: spun.roundId }) });
  assert.equal(duplicate.status, 409);
  const oldSpin = await h.call('spin', { token: s.token, body: { ...a, replayOnly: true } });
  assert.deepEqual(oldSpin.data, spun);
  assert.equal((await h.call('state', { token: s.token })).data.pendingWinMinor, 0);
});

test('next SPIN collects only its exact pending parent atomically', async () => {
  const h = harness({ sampler: fixtureSampler() }), s = await h.session();
  const first = (await h.call('spin', { token: s.token, body: h.action(s, 'SPIN') })).data;
  const wrong = await h.call('spin', { token: s.token, body: h.action(s, 'SPIN') });
  assert.equal(wrong.status, 409);
  const second = await h.call('spin', { token: s.token,
    body: h.action(s, 'SPIN', { betMinor: 200, collectRoundId: first.roundId }) });
  assert.equal(second.status, 200);
  assert.equal(second.data.balanceMinor, first.balanceMinor + first.winMinor - 200);
  assert.equal(second.data.pendingWinMinor, 5000);
});

test('DOUBLE red against ace of clubs loses pending win without another balance debit', async () => {
  const h = harness({ sampler: fixtureSampler(), cardSampler: () => ({ rank: 'A', suit: 'CLUBS', color: 'BLACK' }) });
  const s = await h.session(), spun = (await h.call('spin', { token: s.token, body: h.action(s, 'SPIN') })).data;
  const a = h.action(s, 'DOUBLE', { roundId: spun.roundId, choice: 'RED', expectedStakeMinor: spun.pendingWinMinor });
  const lost = await h.call('double', { token: s.token, body: a });
  assert.equal(lost.status, 200); assert.equal(lost.data.won, false);
  assert.equal(lost.data.balanceMinor, spun.balanceMinor); assert.equal(lost.data.pendingWinMinor, 0);
  assert.deepEqual(lost.data.card, { rank: 'A', suit: 'CLUBS', color: 'BLACK' });
  assert.deepEqual((await h.call('double', { token: s.token, body: { ...a, replayOnly: true } })).data, lost.data);
});

test('DOUBLE success holds doubled amount, enforces expected stake and attempt cap', async () => {
  const h = harness({ sampler: fixtureSampler(), cardSampler: () => ({ rank: 'K', suit: 'HEARTS', color: 'RED' }) });
  const s = await h.session(), spun = (await h.call('spin', { token: s.token, body: h.action(s, 'SPIN') })).data;
  let pending = spun.pendingWinMinor;
  for (let i = 0; i < 5; i++) {
    const changed = await h.call('double', { token: s.token,
      body: h.action(s, 'DOUBLE', { roundId: spun.roundId, choice: 'RED', expectedStakeMinor: pending + 1 }) });
    assert.equal(changed.status, 409);
    const won = await h.call('double', { token: s.token,
      body: h.action(s, 'DOUBLE', { roundId: spun.roundId, choice: 'RED', expectedStakeMinor: pending }) });
    pending *= 2; assert.equal(won.status, 200); assert.equal(won.data.pendingWinMinor, pending);
    assert.equal(won.data.balanceMinor, spun.balanceMinor); assert.equal(won.data.canDouble, i < 4);
  }
  assert.equal((await h.call('double', { token: s.token,
    body: h.action(s, 'DOUBLE', { roundId: spun.roundId, choice: 'RED', expectedStakeMinor: pending }) })).status, 409);
});

test('recovery succeeds at zero test balance while a new wager fails', async () => {
  const h = harness({ initialBalanceMinor: 100, sampler: fixtureSampler(false) }), s = await h.session();
  const a = h.action(s, 'SPIN'), first = await h.call('spin', { token: s.token, body: a });
  assert.equal(first.data.balanceMinor, 0);
  assert.equal((await h.call('spin', { token: s.token, body: h.action(s, 'SPIN') })).status, 402);
  assert.deepEqual((await h.call('spin', { token: s.token, body: { ...a, replayOnly: true } })).data, first.data);
});

test('twenty concurrent original requests sample once; changed parameters and missing replay fail', async () => {
  let samples = 0; const sample = fixtureSampler(false), original = sample.sampleOutcome;
  sample.sampleOutcome = input => { samples++; return original(input); };
  const h = harness({ sampler: sample }), s = await h.session(), a = h.action(s, 'SPIN');
  const results = await Promise.all(Array.from({ length: 20 }, () => h.call('spin', { token: s.token, body: a })));
  assert.equal(samples, 1);
  for (const result of results) { assert.equal(result.status, 200); assert.deepEqual(result.data, results[0].data); }
  assert.equal((await h.call('spin', { token: s.token, body: { ...a, betMinor: 200 } })).status, 409);
  assert.equal((await h.call('spin', { token: s.token, body: h.action(s, 'SPIN', { replayOnly: true }) })).status, 404);
});

test('sampler failure rolls back automatic collection and stake without recording acceptance', async () => {
  let count = 0; const sample = fixtureSampler(), original = sample.sampleOutcome;
  sample.sampleOutcome = input => { if (++count > 1) throw new Error('private failure text'); return original(input); };
  const h = harness({ sampler: sample }), s = await h.session();
  const first = (await h.call('spin', { token: s.token, body: h.action(s, 'SPIN') })).data;
  const failed = await h.call('spin', { token: s.token,
    body: h.action(s, 'SPIN', { collectRoundId: first.roundId }) });
  assert.equal(failed.status, 503); assert.equal(failed.data.definitiveRejection, false);
  assert.ok(!JSON.stringify(failed.data).includes('private failure'));
  const state = (await h.call('state', { token: s.token })).data;
  assert.equal(state.balanceMinor, first.balanceMinor); assert.equal(state.pendingWinMinor, first.pendingWinMinor);
  assert.equal((await h.call('history', { token: s.token })).data.records.length, 1);
});

test('foreign test session cannot recover, collect, change subject or see another session logs', async () => {
  const h = harness({ sampler: fixtureSampler() }), a = await h.session(), b = await h.session();
  const spin = h.action(a, 'SPIN'), result = (await h.call('spin', { token: a.token, body: spin })).data;
  assert.equal((await h.call('spin', { token: b.token, body: { ...spin, replayOnly: true } })).status, 403);
  assert.equal((await h.call('spin', { token: b.token, body: { ...spin, testSubject: b.subject, replayOnly: true } })).status, 404);
  assert.equal((await h.call('take', { token: b.token, body: h.action(b, 'TAKE', { roundId: result.roundId }) })).status, 409);
  assert.equal((await h.call('history', { token: b.token })).data.records.length, 0);
  const ownLogs = JSON.stringify((await h.call('logs', { token: b.token })).data);
  assert.ok(!ownLogs.includes(a.subject)); assert.ok(!ownLogs.includes(a.token)); assert.ok(!ownLogs.includes(b.token));
  assert.ok(!JSON.stringify(h.logs).includes(a.token)); assert.ok(!JSON.stringify(h.logs).includes(b.token));
});

test('origin, method, body size, unknown authority fields and unsupported bets are rejected', async () => {
  const h = harness(), s = await h.session();
  assert.equal((await h.call('spin', { token: s.token, body: h.action(s, 'SPIN'), requestOrigin: null })).status, 403);
  assert.equal((await h.call('spin', { token: s.token, body: h.action(s, 'SPIN'), requestOrigin: 'https://other.example' })).status, 403);
  assert.equal((await h.call('state')).status, 401);
  assert.equal((await h.call('spin', { token: s.token })).status, 405);
  assert.equal((await h.call('spin', { token: s.token, body: h.action(s, 'SPIN', { winMinor: 1000 }) })).status, 400);
  assert.equal((await h.call('spin', { token: s.token, body: h.action(s, 'SPIN', { betMinor: 99 }) })).status, 422);
  assert.equal((await h.call('spin', { token: s.token, body: '{"padding":"' + 'x'.repeat(9000) + '"}' })).status, 413);
  assert.equal((await h.call('spin', { token: s.token, body: '{' })).status, 400);
  assert.equal((await h.call('spin', { token: s.token, body: '[]' })).status, 400);
  assert.equal((await h.call('state?unexpected=1', { token: s.token })).status, 400);
  assert.equal((await h.call('state', { token: s.token, base: BURN_TEST_PLAYER_BASE })).status, 200);
  assert.equal((await h.call('state', { token: s.token })).data.balanceMinor, s.initial.balanceMinor);
});

test('session expiration, capacity and round/action caps are bounded without deleting cash data', async () => {
  const h = harness({ sessionTtlMs: 1000, maxSessions: 1, maxRounds: 1, maxActions: 2, sampler: fixtureSampler(false) });
  const s = await h.session();
  assert.equal((await h.call('session', { body: { mode: 'SIMULATION' } })).status, 429);
  const a = h.action(s, 'SPIN'), result = await h.call('spin', { token: s.token, body: a });
  assert.equal(result.status, 200);
  assert.equal((await h.call('spin', { token: s.token, body: h.action(s, 'SPIN') })).status, 429);
  assert.deepEqual((await h.call('spin', { token: s.token, body: a })).data, result.data);
  h.advance(1000);
  assert.equal((await h.call('state', { token: s.token })).status, 410);
  const next = await h.session(); assert.notEqual(next.subject, s.subject);
});

test('unrelated existing fetch keeps its Request, context and arguments exactly', async () => {
  const prior = new Response('existing backend'), req = new Request(origin + '/api/slots/spin');
  const context = { retained: true }, arg = { server: true }; let called = 0;
  const fetch = bindBurnTestFetch(function(request, server) {
    called++; assert.equal(this, context); assert.equal(request, req); assert.equal(server, arg); return prior;
  }, { cryptoImpl: webcrypto, logger() {} });
  assert.equal(fetch.call(context, req, arg), prior); assert.equal(called, 1);
});
