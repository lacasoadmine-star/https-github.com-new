import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { memoryDatabase } from './pg-fixture.mjs';

// A separate node:test process imports the actual candidate with the release
// variable absent. This reproduces the existing Railway configuration.
delete process.env.FRESH74_ACCOUNT_RELEASE;
const runtime = await import('./candidate-service-fixture.mjs');
const baseline = await readFile(process.env.FRESH_BASELINE_RUNTIME, 'utf8');
const candidate = await readFile(process.env.FRESH_CANDIDATE_RUNTIME, 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
const token = 'd'.repeat(64), origin = 'https://fixture.invalid', userId = 'disabled-fixture-player';
let db, service;

before(async () => {
  db = await memoryDatabase('memory:disabled-release');
  // Reuse the same literal schema as the substantive financial regression suite.
  // This is authored fixture SQL, never a production database or connection.
  const authoredTest = await readFile(new URL('./fresh-release.test.mjs', import.meta.url), 'utf8');
  const schema = authoredTest.match(/const schema = `([\s\S]*?)`;/)?.[1];
  assert.ok(schema);
  await db.exec(schema);
  service = await runtime.createSlotService({ databaseUrl: 'memory:disabled-release', redisUrl: 'memory:fixture-only',
    migration: runtime.migration, enabled: true, origin });
  await db.query("INSERT INTO sw_rebuild.users VALUES($1,'player','active')", [userId]);
  await db.query('INSERT INTO sw_rebuild.sessions VALUES($1,$2,$3)', [digest(token), userId, Date.now() + 3600000]);
  await db.query("INSERT INTO sw_rebuild.wallets(id,balance) VALUES($1,10000),('house',200000000)", [userId]);
});
after(async () => { await service.close(); await db.close(); });

async function fetch(path, body, authenticated = true) {
  const headers = { origin, 'content-type': 'application/json', ...(authenticated ? { cookie: 'sw_session=' + token } : {}) };
  const response = await service.fetch(new Request(origin + '/api/slots' + path, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}) }));
  return { status: response.status, body: await response.json() };
}

test('all preexisting environment-controlled release expressions remain byte-identical', () => {
  const envLines = source => source.split('\n').filter(line => /(?:process|Bun)\.env\b/.test(line));
  assert.deepEqual(envLines(candidate), envLines(baseline));
  const originalGate = "enabled:process.env.FRESH74_ACCOUNT_RELEASE==='mh10-v1'";
  assert.equal(baseline.split(originalGate).length, 2);
  assert.equal(candidate.split(originalGate).length, 2);
  assert.equal(candidate.includes('process.env.FRESH74_ACCOUNT_RELEASE='), true); // equality expression only
  assert.equal(/process\.env\.FRESH74_ACCOUNT_RELEASE\s*=(?!=)/.test(candidate), false);
  assert.equal(candidate.match(/process\.env\.FRESH74_ACCOUNT_RELEASE/g)?.length, 1);
  const globalGate = "enabled:process.env.SLOT_ENGINE_ENABLED==='true'";
  assert.equal(candidate.split(globalGate).length, baseline.split(globalGate).length);
});

test('all retained compressed model payloads and migration bytes are unchanged', () => {
  const compressed = source => [...source.matchAll(/const (coreBytes|revisedBytes|fresh74Bytes)=gunzipSync\(Buffer\.from\('([^']+)'/g)].map(match => [match[1], digest(match[2])]);
  assert.equal(compressed(baseline).length, 3);
  assert.deepEqual(compressed(candidate), compressed(baseline));
  const migration = source => source.slice(source.indexOf('const migration='), source.indexOf('const service=await createSlotService('));
  assert.equal(migration(candidate), migration(baseline));
  for (const closedGate of ["if(!accepting)fail(503,'SLOT_RELEASE_NOT_ENABLED')", 'let accepting=enabled']) {
    assert.equal(candidate.split(closedGate).length, baseline.split(closedGate).length);
  }
});

test('retained transaction, authentication, wallet locking and double-entry helpers are exact', () => {
  const shared = source => source.slice(source.indexOf(' async function transaction(fn)'), source.indexOf('// Added inside the existing service closure'));
  assert.equal(shared(candidate), shared(baseline));
  assert.match(candidate, /if\(gameId==='fresh_multihot10'\)\{if\(body\.replayOnly===true\)fail\(409,'ROUND_NOT_CONFIRMED'\);freshRelease\.assertEnabled\(\)/);
  assert.match(candidate, /if\(parent\.game_id==='fresh_multihot10'\)\{freshRelease\.assertEnabled\(\)/);
});

test('authenticated new state endpoint defaults to disabled and all 74 fresh registrations remain closed', async () => {
  assert.equal(process.env.FRESH74_ACCOUNT_RELEASE, undefined);
  const state = await fetch('/fresh-state');
  assert.equal(state.status, 200);
  assert.equal(state.body.balance, '100.00');
  assert.equal(state.body.game.enabled, false);
  assert.equal(state.body.game.freshReleaseReady, false);
  assert.equal(state.body.game.buildStatus, 'draft');
  assert.deepEqual(state.body.game.betLevels, []);
  assert.equal(state.body.round, null);
  const catalog = await fetch('/games');
  const fresh = catalog.body.games.filter(game => game.freshRegistration);
  assert.equal(fresh.length, 74);
  assert.ok(fresh.every(game => game.enabled === false && game.freshReleaseReady === false && game.betLevels.length === 0));
  assert.equal(catalog.body.games.find(game => game.id === 'multi_hot_40').enabled, true);
});

test('unsigned new state, fresh spin and gamble reject before any financial operation', async () => {
  const spin = { gameId: 'fresh_multihot10', bet: '0.10', roundToken: randomUUID() };
  const gamble = { roundId: randomUUID(), roundToken: randomUUID(), choice: 'RED' };
  for (const [path, body] of [['/fresh-state', null], ['/spin', spin], ['/gamble', gamble]]) {
    const response = await fetch(path, body, false);
    assert.equal(response.status, 401);
    assert.equal(response.body.detail, 'PLAYER_LOGIN_REQUIRED');
  }
});

test('even valid authenticated client requests cannot activate absent release flag', async () => {
  const state = (await fetch('/fresh-state')).body;
  const body = { gameId: state.game.id, bet: '0.10', roundToken: randomUUID(), sessionGuard: state.sessionGuard,
    mathVersion: state.game.mathVersion, engineVersion: state.game.engineVersion, mathSha256: state.game.mathSha256,
    enabled: true, freshReleaseReady: true, release: 'mh10-v1' };
  const result = await fetch('/spin', body);
  assert.equal(result.status, 503);
  assert.equal(result.body.detail, 'FRESH_RELEASE_NOT_ENABLED');
  const writes = await db.query('SELECT (SELECT count(*)::int FROM sw_rebuild.transfers) AS transfers,(SELECT count(*)::int FROM sw_rebuild.ledger) AS ledger,(SELECT count(*)::int FROM sw_nine.game_rounds) AS rounds,(SELECT count(*)::int FROM sw_nine.actions) AS actions');
  assert.deepEqual(writes.rows[0], { transfers: 0, ledger: 0, rounds: 0, actions: 0 });
  const balance = await db.query('SELECT balance::text FROM sw_rebuild.wallets WHERE id=$1', [userId]);
  assert.equal(balance.rows[0].balance, '10000');
});

test('closed fresh release still returns a preexisting immutable matching receipt', async () => {
  const roundId = randomUUID(), roundToken = randomUUID();
  const gameId = 'fresh_multihot10', bet = '0.10';
  const stored = { roundId, gameId, bet, currency: 'ETB', finalWin: '0.00', balanceAfter: '100.00', historicalFixture: true };
  const requestHash = digest(JSON.stringify({ uid: userId, gameId, bet, action: 'SPIN' }));
  await db.query('INSERT INTO sw_nine.game_rounds(round_id,user_id,game_id,bet,base_bet,total_win,wheel_multiplier,request_key,request_hash,result_json,math_sha256,is_free) VALUES($1,$2,$3,10,10,0,1,$4,$5,$6,$7,false)', [roundId, userId, gameId, roundToken, requestHash, JSON.stringify(stored), '3'.repeat(64)]);
  const replay = await fetch('/spin', { gameId, bet, roundToken, replayOnly: true });
  assert.equal(replay.status, 200);
  assert.deepEqual(replay.body, stored);
  const writes = await db.query('SELECT (SELECT count(*)::int FROM sw_rebuild.transfers) AS transfers,(SELECT count(*)::int FROM sw_rebuild.ledger) AS ledger,(SELECT count(*)::int FROM sw_nine.game_rounds) AS rounds');
  assert.deepEqual(writes.rows[0], { transfers: 0, ledger: 0, rounds: 1 });
});
