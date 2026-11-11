import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { memoryDatabase } from './pg-fixture.mjs';

// Disposable PostgreSQL/WASM only. Network connections are not implemented by
// either fixture transport. No production credentials or accounts are used.
process.env.FRESH74_ACCOUNT_RELEASE = 'mh10-v1';
const candidateModule = await import('./candidate-service-fixture.mjs');
const baselineModule = await import('./baseline-service-fixture.mjs');
const user = 'fixture-player', other = 'fixture-other', cookie = 'a'.repeat(64), otherCookie = 'b'.repeat(64);
const origin = 'https://fixture.invalid';
const digest = value => createHash('sha256').update(value).digest('hex');
let db, candidate, baseline, faultStage = null;
const schema = `
CREATE SCHEMA sw_rebuild;
CREATE TABLE sw_rebuild.users(id text PRIMARY KEY,role text NOT NULL,status text NOT NULL);
CREATE TABLE sw_rebuild.sessions(token text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),expires bigint NOT NULL);
CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY,balance bigint NOT NULL CHECK(balance>=0),credit_limit bigint NOT NULL DEFAULT 0);
CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY REFERENCES sw_rebuild.users(id),max_balance bigint);
CREATE TABLE sw_rebuild.transfers(id text PRIMARY KEY,sender text NOT NULL REFERENCES sw_rebuild.wallets(id),recipient text NOT NULL REFERENCES sw_rebuild.wallets(id),amount bigint NOT NULL CHECK(amount>0),kind text NOT NULL,actor text NOT NULL REFERENCES sw_rebuild.users(id));
CREATE TABLE sw_rebuild.ledger(transfer_id text NOT NULL REFERENCES sw_rebuild.transfers(id),wallet_id text NOT NULL REFERENCES sw_rebuild.wallets(id),delta bigint NOT NULL);
CREATE TABLE sw_rebuild.rounds(id text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),game text NOT NULL,bet bigint NOT NULL,payout bigint NOT NULL,outcome jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),settled_order bigint GENERATED ALWAYS AS IDENTITY);
CREATE SCHEMA sw_native_library;
CREATE TABLE sw_native_library.rounds(id uuid PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),game_id text NOT NULL,status text NOT NULL,created_at bigint NOT NULL DEFAULT 0);
`;

before(async () => {
  db = await memoryDatabase('memory:release');
  await db.exec(schema);
  const options = { databaseUrl: 'memory:release', redisUrl: 'memory:fixture-only', enabled: true, origin, fault: stage => { if (stage === faultStage) throw Error('INJECTED_' + stage); } };
  candidate = await candidateModule.createSlotService({ ...options, migration: candidateModule.migration });
  baseline = await baselineModule.createSlotService({ ...options, migration: baselineModule.migration });
});

beforeEach(async () => {
  faultStage = null;
  candidate.setEnabled(true); baseline.setEnabled(true);
  await db.exec('TRUNCATE sw_rebuild.users,sw_rebuild.wallets CASCADE');
  await db.query('INSERT INTO sw_rebuild.users VALUES($1,$2,$3),($4,$2,$3)', [user, 'player', 'active', other]);
  await db.query('INSERT INTO sw_rebuild.sessions VALUES($1,$2,$3),($4,$5,$3)', [digest(cookie), user, Date.now() + 3600000, digest(otherCookie), other]);
  await db.query('INSERT INTO sw_rebuild.wallets(id,balance) VALUES($1,10000),($2,10000),($3,200000000)', [user, other, 'house']);
});

after(async () => { await candidate.close(); await baseline.close(); await db.close(); });

async function request(service, path, body, rawCookie = cookie) {
  const headers = { origin, 'content-type': 'application/json' };
  if (rawCookie) headers.cookie = 'sw_session=' + rawCookie;
  const response = await service.fetch(new Request(origin + '/api/slots' + path, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}) }));
  return { status: response.status, body: await response.json() };
}
async function state() { const response = await request(candidate, '/fresh-state'); assert.equal(response.status, 200); return response.body; }
async function spinInput(extra = {}) {
  const current = await state();
  return { gameId: 'fresh_multihot10', bet: '0.10', roundToken: randomUUID(), sessionGuard: current.sessionGuard,
    mathVersion: current.game.mathVersion, engineVersion: current.game.engineVersion, mathSha256: current.game.mathSha256, ...extra };
}
async function draw(values, operation) {
  const previous = crypto.getRandomValues;
  let index = 0;
  crypto.getRandomValues = array => { array[0] = values[index++ % values.length]; return array; };
  try { return await operation(); } finally { crypto.getRandomValues = previous; }
}
const winning = async (service = candidate, { cherry = false, multiplierIndex = 0, ...extra } = {}) => {
  const input = await spinInput(extra);
  const result = await draw([...Array(15).fill(cherry ? 7 : 0), multiplierIndex], () => request(service, '/spin', input));
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return { input, result: result.body };
};
async function totals() {
  const result = await db.query("SELECT (SELECT balance::text FROM sw_rebuild.wallets WHERE id=$1) AS player,(SELECT sum(balance)::text FROM sw_rebuild.wallets) AS total,(SELECT count(*)::int FROM sw_rebuild.transfers) AS transfers,(SELECT count(*)::int FROM sw_rebuild.ledger) AS ledger,(SELECT count(*)::int FROM sw_nine.game_rounds) AS rounds,(SELECT count(*)::int FROM sw_nine.actions) AS actions", [user]);
  return result.rows[0];
}
async function gambleInput(round, extra = {}) {
  const current = await state();
  return { roundId: round.roundId, roundToken: randomUUID(), choice: 'RED', sessionGuard: current.sessionGuard,
    expectedAttempt: current.round.gamble.attempt + 1, expectedStake: current.round.gamble.stake, ...extra };
}
async function activeLibrary() {
  await db.query('INSERT INTO sw_native_library.rounds(id,user_id,game_id,status) VALUES($1,$2,$3,$4)', [randomUUID(), user, 'fixture-native-active', 'active']);
}

test('fresh release exposes only completed MH10 and retains 73 closed placeholders', async () => {
  const response = await request(candidate, '/games');
  assert.equal(response.status, 200);
  const fresh = response.body.games.filter(game => game.freshRegistration);
  assert.equal(fresh.length, 74);
  assert.deepEqual(fresh.filter(game => game.enabled).map(game => game.id), ['fresh_multihot10']);
  const current = await state();
  assert.equal(current.currency, 'ETB'); assert.equal(current.balance, '100.00');
  assert.match(current.sessionGuard, /^[a-f0-9]{64}$/);
  assert.notEqual(current.sessionGuard, cookie); assert.notEqual(current.sessionGuard, digest(cookie));
  assert.equal(current.round, null); assert.equal(current.game.providerRtpReproduced, false);
  assert.equal(current.game.buildStatus, 'ready');
  assert.equal(JSON.stringify(current).includes(user), false);
});

test('fresh account endpoints enforce valid active player session', async () => {
  assert.equal((await request(candidate, '/fresh-state', null, null)).status, 401);
  await db.query('UPDATE sw_rebuild.sessions SET expires=0 WHERE user_id=$1', [user]);
  assert.equal((await request(candidate, '/fresh-state')).status, 401);
  await db.query('UPDATE sw_rebuild.sessions SET expires=$1 WHERE user_id=$2', [Date.now() + 60000, user]);
  await db.query("UPDATE sw_rebuild.users SET role='agent' WHERE id=$1", [user]);
  assert.equal((await request(candidate, '/fresh-state')).status, 401);
  await db.query("UPDATE sw_rebuild.users SET role='player',status='blocked' WHERE id=$1", [user]);
  assert.equal((await request(candidate, '/fresh-state')).status, 401);
  assert.equal((await totals()).transfers, 0);
});

test('canonical minimum and maximum bets accepted; malformed and unsupported bets rejected', async () => {
  const input = await spinInput();
  for (const bet of ['0.00','0.01','0.15','201.00','1',1,'-0.10','0.100']) {
    const result = await request(candidate, '/spin', { ...input, bet, roundToken: randomUUID() });
    assert.equal(result.status, 400, 'bet ' + bet);
  }
  for (const bet of ['0.10', '200.00']) {
    const result = await draw([0,1,2,3,4,5,6,7], () => request(candidate, '/spin', { ...input, bet, roundToken: randomUUID() }));
    if (bet === '200.00') assert.equal(result.status, 402); // exact accepted bet; player cannot fund it
    else assert.equal(result.status, 200);
  }
  await db.query('UPDATE sw_rebuild.wallets SET balance=100000 WHERE id=$1', [user]);
  const max = await draw([0,1,2,3,4,5,6,7], () => request(candidate, '/spin', { ...input, bet: '200.00', roundToken: randomUUID() }));
  assert.equal(max.status, 200);
});

test('new fresh wagers require same session and exact current model, replay-only cannot create wagers', async () => {
  const input = await spinInput();
  for (const patch of [{ sessionGuard: undefined }, { sessionGuard: '0'.repeat(64) }, { mathVersion: undefined }, { engineVersion: 'stale' }, { mathSha256: '0'.repeat(64) }, { replayOnly: true }]) {
    const result = await request(candidate, '/spin', { ...input, ...patch });
    assert.equal(result.status, 409);
  }
  assert.equal((await totals()).transfers, 0);
});

test('spin debit, award, ledger and history conserve value; exact request replay has no second transfer', async () => {
  const before = await totals();
  const { input, result } = await winning();
  assert.equal(result.chargedStake, '0.10'); assert.equal(result.finalWin, '100.00'); assert.equal(result.balanceAfter, '199.90');
  const after = await totals();
  assert.equal(after.total, before.total); assert.equal(after.transfers, 2); assert.equal(after.ledger, 4); assert.equal(after.rounds, 1);
  const replay = await request(candidate, '/spin', { ...input, replayOnly: true });
  assert.equal(replay.status, 200); assert.deepEqual(replay.body, result); assert.deepEqual(await totals(), after);
  const conflict = await request(candidate, '/spin', { ...input, bet: '0.20' });
  assert.equal(conflict.status, 409); assert.deepEqual(await totals(), after);
  const current = await state(); assert.deepEqual(current.round.result, result); assert.equal(current.round.gamble.attempt, 0); assert.equal(current.round.gamble.stake, '100.00');
  const unbalanced = await db.query('SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING sum(delta)<>0');
  assert.equal(unbalanced.rows.length, 0);
});

test('same-user receipt survives session rotation but old pending session cannot create new spin', async () => {
  const { input, result } = await winning();
  const rotated = 'c'.repeat(64);
  await db.query('UPDATE sw_rebuild.sessions SET token=$1 WHERE user_id=$2', [digest(rotated), user]);
  const replay = await request(candidate, '/spin', { ...input, replayOnly: true }, rotated);
  assert.equal(replay.status, 200); assert.deepEqual(replay.body, result);
  const stale = await request(candidate, '/spin', { ...input, roundToken: randomUUID() }, rotated);
  assert.equal(stale.status, 409); assert.equal(stale.body.detail, 'PLAYER_SESSION_CHANGED');
  const otherUser = await request(candidate, '/spin', { ...input, replayOnly: true }, otherCookie);
  assert.equal(otherUser.status, 409); assert.equal(otherUser.body.detail, 'ROUND_NOT_CONFIRMED');
  assert.equal((await totals()).rounds, 1);
});

test('failure after debit, credit or final history insert rolls back every financial write', async () => {
  for (const stage of ['after_debit', 'after_credit', 'before_commit']) {
    const input = await spinInput(), before = await totals();
    faultStage = stage;
    const failed = await draw(Array(16).fill(0), () => request(candidate, '/spin', input));
    assert.equal(failed.status, 503); assert.deepEqual(await totals(), before);
    faultStage = null;
    const retried = await draw(Array(16).fill(0), () => request(candidate, '/spin', input));
    assert.equal(retried.status, 200); assert.equal((await totals()).rounds, before.rounds + 1);
  }
});

test('insufficient player and insufficient house reserve reject before debit', async () => {
  const input = await spinInput();
  await db.query('UPDATE sw_rebuild.wallets SET balance=0 WHERE id=$1', [user]);
  let rejected = await request(candidate, '/spin', input); assert.equal(rejected.status, 402);
  await db.query('UPDATE sw_rebuild.wallets SET balance=10000 WHERE id=$1', [user]);
  await db.query("UPDATE sw_rebuild.wallets SET balance=49999 WHERE id='house'");
  rejected = await request(candidate, '/spin', input); assert.equal(rejected.status, 503); assert.equal(rejected.body.detail, 'HOUSE_RESERVE_INSUFFICIENT');
  assert.equal((await totals()).transfers, 0);
});

test('maximum MH10 all-seven award is exactly 5000x and fully funded', async () => {
  const before = await totals();
  const { result } = await winning(candidate, { multiplierIndex: 2 });
  assert.equal(result.wheelMultiplier, 5); assert.equal(result.finalWin, '500.00'); assert.equal(result.balanceAfter, '599.90');
  assert.equal((await totals()).total, before.total);
});

test('baseline active-library admission gap reproduced; candidate blocks only fresh identities', async () => {
  await activeLibrary();
  const input = await spinInput();
  const rejected = await request(candidate, '/spin', input);
  assert.equal(rejected.status, 409); assert.match(rejected.body.detail, /^FINISH_ACTIVE_ROUND:/); assert.equal((await totals()).transfers, 0);
  const observedBaseline = await draw(Array(16).fill(0), () => request(baseline, '/spin', input));
  assert.equal(observedBaseline.status, 200, 'baseline defect must remain reproduced');
  const legacy = await request(candidate, '/spin', { gameId: 'multi_hot_40', bet: '0.10', roundToken: randomUUID() });
  assert.equal(legacy.status, 200, JSON.stringify(legacy.body));
});

test('fresh gamble requires exact attempt/stake; old receipt replay remains idempotent', async () => {
  const { result } = await winning(candidate, { cherry: true });
  assert.equal(result.finalWin, '5.00');
  const input = await gambleInput(result), before = await totals();
  for (const patch of [{ expectedAttempt: undefined }, { expectedStake: undefined }, { expectedAttempt: 2 }, { expectedStake: '10.00' }, { sessionGuard: '0'.repeat(64) }, { replayOnly: true }]) {
    const rejected = await request(candidate, '/gamble', { ...input, ...patch }); assert.equal(rejected.status, 409); assert.deepEqual(await totals(), before);
  }
  const accepted = await draw([0], () => request(candidate, '/gamble', input));
  assert.equal(accepted.status, 200); assert.equal(accepted.body.payout, '10.00'); assert.equal(accepted.body.attempt, 1);
  assert.equal(accepted.body.gameId, 'fresh_multihot10');
  assert.deepEqual(accepted.body.walletReceipt, { currency: 'ETB', balanceBefore: '104.90', chargedStake: '5.00', finalWin: '10.00', balanceAfter: '109.90', netChange: '5.00' });
  const after = await totals();
  assert.equal(after.total, before.total);
  const replay = await request(candidate, '/gamble', { ...input, replayOnly: true });
  assert.equal(replay.status, 200); assert.deepEqual(replay.body, accepted.body); assert.deepEqual(await totals(), after);
  const stale = await request(candidate, '/gamble', { ...input, roundToken: randomUUID() });
  assert.equal(stale.status, 409); assert.equal(stale.body.detail, 'GAMBLE_STATE_CHANGED'); assert.deepEqual(await totals(), after);
});

test('baseline stale gamble/new token gap reproduced; candidate rejects it', async () => {
  const { result } = await winning(candidate, { cherry: true });
  const input = await gambleInput(result);
  const accepted = await draw([0], () => request(candidate, '/gamble', input)); assert.equal(accepted.status, 200);
  const stale = { ...input, roundToken: randomUUID(), replayOnly: true };
  const candidateResult = await request(candidate, '/gamble', stale); assert.equal(candidateResult.status, 409);
  const baselineResult = await draw([0], () => request(baseline, '/gamble', stale));
  assert.equal(baselineResult.status, 200); assert.equal(baselineResult.body.attempt, 2);
});

test('canonical newer-round order blocks fresh gamble even when timestamps tie', async () => {
  const { result } = await winning(candidate, { cherry: true });
  const input = await gambleInput(result);
  await db.query("INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome,created_at) SELECT $1,$2,$3,0,0,'{}',created_at FROM sw_rebuild.rounds WHERE id=$4", ['fixture:newer', user, 'fixture-other-game', 'nine:' + result.roundId]);
  const current = await state(); assert.equal(current.round.gamble.available, false); assert.equal(current.round.gamble.reason, 'GAMBLE_EXPIRED');
  const rejected = await request(candidate, '/gamble', input); assert.equal(rejected.status, 409); assert.equal(rejected.body.detail, 'GAMBLE_EXPIRED');
});

test('active library blocks fresh gamble and the five-attempt limit remains', async () => {
  const { result } = await winning(candidate, { cherry: true });
  await activeLibrary();
  let current = await state(); assert.equal(current.round.gamble.available, false); assert.equal(current.blockedByActiveGame, 'fixture-native-active');
  let input = await gambleInput(result), rejected = await request(candidate, '/gamble', input); assert.equal(rejected.status, 409);
  await db.exec('DELETE FROM sw_native_library.rounds');
  for (let attempt = 1; attempt <= 5; attempt++) {
    input = await gambleInput(result);
    const accepted = await draw([0], () => request(candidate, '/gamble', input)); assert.equal(accepted.status, 200); assert.equal(accepted.body.attempt, attempt);
  }
  current = await state(); assert.equal(current.round.gamble.available, false); assert.equal(current.round.gamble.reason, 'GAMBLE_LIMIT');
  rejected = await request(candidate, '/gamble', await gambleInput(result)); assert.equal(rejected.status, 409); assert.equal(rejected.body.detail, 'GAMBLE_LIMIT');
});

test('configured account cap rejects a full-liability admission before drawing outcome', async () => {
  const input = await spinInput();
  await db.query('INSERT INTO sw_rebuild.account_limits VALUES($1,11000)', [user]);
  let drawCount = 0, previous = crypto.getRandomValues;
  crypto.getRandomValues = array => { drawCount++; array[0] = 0; return array; };
  let rejected;
  try { rejected = await request(candidate, '/spin', input); } finally { crypto.getRandomValues = previous; }
  assert.equal(rejected.status, 409); assert.equal(rejected.body.detail, 'ACCOUNT_BALANCE_LIMIT'); assert.equal(drawCount, 0); assert.equal((await totals()).transfers, 0);
  await db.query('UPDATE sw_rebuild.account_limits SET max_balance=59990 WHERE user_id=$1', [user]);
  const accepted = await draw(Array(16).fill(0), () => request(candidate, '/spin', input)); assert.equal(accepted.status, 200);
});

test('gamble preserves 500 ETB stake ceiling and ten-minute expiry', async () => {
  const { result } = await winning();
  for (let attempt = 1; attempt <= 3; attempt++) {
    const accepted = await draw([0], () => gambleInput(result).then(input => request(candidate, '/gamble', input)));
    assert.equal(accepted.status, 200); assert.equal(accepted.body.attempt, attempt);
  }
  let current = await state(); assert.equal(current.round.gamble.stake, '800.00'); assert.equal(current.round.gamble.reason, 'GAMBLE_STAKE_LIMIT');
  let rejected = await request(candidate, '/gamble', await gambleInput(result)); assert.equal(rejected.status, 409); assert.equal(rejected.body.detail, 'GAMBLE_STAKE_LIMIT');
  await db.exec('DELETE FROM sw_nine.actions');
  await db.query("UPDATE sw_nine.game_rounds SET created_at=now()-interval '11 minutes' WHERE round_id=$1", [result.roundId]);
  current = await state(); assert.equal(current.round.gamble.reason, 'GAMBLE_EXPIRED');
  rejected = await request(candidate, '/gamble', await gambleInput(result)); assert.equal(rejected.status, 409); assert.equal(rejected.body.detail, 'GAMBLE_EXPIRED');
});

test('fresh gamble cap preflight and losing receipt preserve exact value', async () => {
  const { result } = await winning(candidate, { cherry: true });
  const input = await gambleInput(result), before = await totals();
  await db.query('INSERT INTO sw_rebuild.account_limits VALUES($1,10989)', [user]);
  const rejected = await request(candidate, '/gamble', input); assert.equal(rejected.status, 409); assert.equal(rejected.body.detail, 'ACCOUNT_BALANCE_LIMIT'); assert.deepEqual(await totals(), before);
  await db.query('UPDATE sw_rebuild.account_limits SET max_balance=10990 WHERE user_id=$1', [user]);
  const lost = await draw([1], () => request(candidate, '/gamble', input));
  assert.equal(lost.status, 200); assert.equal(lost.body.won, false);
  assert.deepEqual(lost.body.walletReceipt, { currency: 'ETB', balanceBefore: '104.90', chargedStake: '5.00', finalWin: '0.00', balanceAfter: '99.90', netChange: '-5.00' });
  assert.equal((await totals()).total, before.total); assert.equal((await state()).round.gamble.available, false);
});

test('concurrent identical request token causes at most one committed spin', async () => {
  const input = await spinInput();
  const responses = await draw(Array(16).fill(0), () => Promise.all([request(candidate, '/spin', input), request(candidate, '/spin', input)]));
  assert.ok(responses.some(response => response.status === 200));
  assert.ok(responses.every(response => [200, 409].includes(response.status)));
  assert.equal((await totals()).rounds, 1); assert.equal((await totals()).transfers, 2);
  const replay = await request(candidate, '/spin', { ...input, replayOnly: true }); assert.equal(replay.status, 200); assert.equal((await totals()).rounds, 1);
});

test('concurrent fresh gamble requests with distinct tokens cannot consume stale award twice', async () => {
  const { result } = await winning(candidate, { cherry: true });
  const input = await gambleInput(result);
  const responses = await draw([0], () => Promise.all([request(candidate, '/gamble', input), request(candidate, '/gamble', { ...input, roundToken: randomUUID() })]));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal((await totals()).actions, 1); assert.equal((await state()).round.gamble.attempt, 1);
});

test('global disabled state prevents new wagers but preserves exact settled receipt replay', async () => {
  const { input, result } = await winning();
  candidate.setEnabled(false);
  const current = await state(); assert.equal(current.game.enabled, false); assert.equal(current.round.gamble.available, false);
  const replay = await request(candidate, '/spin', { ...input, replayOnly: true }); assert.equal(replay.status, 200); assert.deepEqual(replay.body, result);
  const rejected = await request(candidate, '/spin', { ...input, roundToken: randomUUID() }); assert.equal(rejected.status, 503);
});
