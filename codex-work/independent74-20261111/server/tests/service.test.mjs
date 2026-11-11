import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameService } from '../service.mjs';
import { MemoryRepository } from './support/memory-repository.mjs';
import { GAME_ID } from '../../math/mine-island2.mjs';

const session = 'a'.repeat(64);
const anotherSession = 'b'.repeat(64);
const id = () => crypto.randomUUID();
function setup(options = {}) {
  const repository = new MemoryRepository(options);
  repository.addAccount(session, { balanceMinor: '10000' });
  const service = createGameService({ repository, rng: () => 0 });
  return { service, repository };
}
function play(overrides = {}) { return { request_id: id(), game_id: GAME_ID, type: 'play', stake_minor: '100', options: { mode: 'easy' }, ...overrides }; }
function collect(round, overrides = {}) { return { request_id: id(), game_id: GAME_ID, type: 'collect', round_id: round.id, expected_version: round.version, ...overrides }; }
function reveal(round, overrides = {}) { return { request_id: id(), game_id: GAME_ID, type: 'reveal', round_id: round.id, expected_version: round.version, options: { cell: round.step }, ...overrides }; }
async function rejectsCode(promise, code) { await assert.rejects(promise, error => error.code === code); }

test('play debits once and exposes a safe first-jump state', async () => {
  const { service, repository } = setup(); const response = await service.action(session, play());
  assert.equal(response.wallet.balance_minor, '9900'); assert.equal(response.activeRound.step, 1);
  assert.equal(response.activeRound.multiplierBps, 11000); assert.equal(response.activeRound.collectibleMinor, '110');
  assert.equal(response.activeRound.private, undefined); assert.equal(response.round.private, undefined);
  assert.equal(repository.snapshot(session).ledger.length, 1);
});

test('same UUID and semantic payload replays without another debit', async () => {
  const { service, repository } = setup(); const action = play();
  const first = await service.action(session, action);
  const replay = await service.action(session, { options: { mode: 'easy' }, stake_minor: '100', type: 'play', game_id: GAME_ID, request_id: action.request_id });
  assert.equal(replay.replayed, true); assert.equal(replay.round.id, first.round.id);
  assert.equal(replay.wallet.balance_minor, '9900'); assert.equal(repository.snapshot(session).ledger.length, 1);
});

test('same UUID with altered stake conflicts and leaves the wallet unchanged', async () => {
  const { service, repository } = setup(); const action = play(); await service.action(session, action);
  await rejectsCode(service.action(session, { ...action, stake_minor: '200' }), 'IDEMPOTENCY_CONFLICT');
  assert.equal(repository.snapshot(session).balanceMinor, '9900');
});

test('concurrent identical plays produce one round, one debit and a replay', async () => {
  const { service, repository } = setup(); const action = play();
  const results = await Promise.all(Array.from({ length: 12 }, () => service.action(session, action)));
  assert.equal(new Set(results.map(result => result.round.id)).size, 1);
  assert.equal(results.filter(result => !result.replayed).length, 1);
  assert.equal(repository.snapshot(session).ledger.length, 1);
});

test('distinct concurrent plays permit only one active round', async () => {
  const { service, repository } = setup();
  const results = await Promise.allSettled([service.action(session, play()), service.action(session, play())]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'ACTIVE_ROUND_EXISTS');
  assert.equal(repository.snapshot(session).balanceMinor, '9900');
});

test('concurrent duplicate collect credits exactly once', async () => {
  const { service, repository } = setup(); const started = await service.action(session, play()); const action = collect(started.round);
  const results = await Promise.all(Array.from({ length: 12 }, () => service.action(session, action)));
  assert.equal(results.filter(result => !result.replayed).length, 1);
  assert.equal(results[0].wallet.balance_minor, '10010');
  assert.equal(repository.snapshot(session).ledger.filter(row => row.kind === 'credit').length, 1);
});

test('distinct concurrent collect requests still cannot double credit', async () => {
  const { service, repository } = setup(); const started = await service.action(session, play());
  const results = await Promise.allSettled([service.action(session, collect(started.round)), service.action(session, collect(started.round))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'ROUND_FINISHED');
  assert.equal(repository.snapshot(session).balanceMinor, '10010');
});

test('failure before transaction commit rolls back debit, round and receipt together', async () => {
  const { service, repository } = setup({ beforeCommit: () => { throw new Error('injected commit failure'); } });
  await assert.rejects(service.action(session, play()), /injected commit failure/);
  const snapshot = repository.snapshot(session);
  assert.equal(snapshot.balanceMinor, '10000'); assert.equal(snapshot.rounds.size, 0);
  assert.equal(snapshot.receipts.size, 0); assert.equal(snapshot.requests.size, 0); assert.equal(snapshot.ledger.length, 0);
  assert.equal(repository.snapshotHouse().liabilities.size, 0);
});

test('failure after a computed payout rolls back credit and leaves the active round retryable', async () => {
  const { service, repository } = setup(); const started = await service.action(session, play()); const action = collect(started.round);
  repository.beforeCommit = ({ result }) => { if (result.round?.status === 'collected') throw new Error('injected payout failure'); };
  await assert.rejects(service.action(session, action), /injected payout failure/);
  let snapshot = repository.snapshot(session); assert.equal(snapshot.balanceMinor, '9900'); assert.equal(snapshot.rounds.get(started.round.id).status, 'active');
  assert.equal(snapshot.ledger.filter(row => row.kind === 'credit').length, 0); assert.equal(snapshot.requests.has(action.request_id), false);
  repository.beforeCommit = undefined; const retried = await service.action(session, action);
  assert.equal(retried.wallet.balance_minor, '10010'); assert.equal(retried.round.status, 'collected');
});

test('stale reveal version is rejected without mutating state', async () => {
  const { service, repository } = setup(); const started = await service.action(session, play());
  const advanced = await service.action(session, reveal(started.round));
  assert.equal(advanced.round.step, 2);
  await rejectsCode(service.action(session, reveal(started.round, { options: { cell: 2 } })), 'STALE_ROUND');
  assert.equal(repository.snapshot(session).rounds.get(started.round.id).version, 2);
});

test('losing first jump settles with zero credit and the stake remains debited', async () => {
  const { repository } = setup(); const service = createGameService({ repository, rng: bound => bound - 1 });
  const result = await service.action(session, play());
  assert.equal(result.round.status, 'lost'); assert.equal(result.receipt.payout_minor, '0'); assert.equal(result.activeRound, null);
  assert.equal(result.wallet.balance_minor, '9900'); assert.equal(repository.snapshot(session).ledger.length, 1);
});

test('tenth jump auto-collects server-computed payout with one credit', async () => {
  const { service, repository } = setup(); let result = await service.action(session, play());
  for (let step = 1; step < 10; step++) result = await service.action(session, reveal(result.round));
  assert.equal(result.round.status, 'collected'); assert.equal(result.receipt.payout_minor, '10000');
  assert.equal(result.wallet.balance_minor, '19900'); assert.equal(repository.snapshot(session).ledger.filter(row => row.kind === 'credit').length, 1);
});

test('cross-account round identifiers cannot reveal or collect another user’s round', async () => {
  const { service, repository } = setup(); repository.addAccount(anotherSession, { balanceMinor: '10000' });
  const started = await service.action(session, play());
  await rejectsCode(service.action(anotherSession, collect(started.round)), 'ROUND_NOT_FOUND');
  assert.equal(repository.snapshot(anotherSession).balanceMinor, '10000');
});

test('history retains current verified wallet and game contract', async () => {
  const { service } = setup(); const started = await service.action(session, play()); await service.action(session, collect(started.round));
  const history = await service.history(session, GAME_ID);
  assert.equal(history.wallet.balance_minor, '10010'); assert.equal(history.game.id, GAME_ID);
  assert.equal(history.history[0].payout_minor, '110');
});

test('payout injection, malformed amounts and insufficient funds never debit', async () => {
  const { service, repository } = setup();
  await rejectsCode(service.action(session, play({ payout_minor: '99999999' })), 'INVALID_ACTION');
  await rejectsCode(service.action(session, play({ stake_minor: '01' })), 'INVALID_BET');
  await rejectsCode(service.action(session, play({ stake_minor: '10010' })), 'INSUFFICIENT_FUNDS');
  assert.equal(repository.snapshot(session).balanceMinor, '10000');
});

test('expired, revoked and inactive sessions cannot reach a wallet', async () => {
  const { service, repository } = setup();
  await rejectsCode(service.state('c'.repeat(64), GAME_ID), 'AUTH_REQUIRED');
  repository.sessions.get(session).expiresAt = Date.now() - 1;
  await rejectsCode(service.state(session, GAME_ID), 'AUTH_REQUIRED');
  repository.sessions.get(session).expiresAt = Date.now() + 100000;
  repository.accounts.get(repository.sessions.get(session).userId).status = 'blocked';
  await rejectsCode(service.state(session, GAME_ID), 'AUTH_REQUIRED');
});

test('insufficient bank reserve refuses a stake before any debit', async () => {
  const { service, repository } = setup({ houseBalanceMinor: '1' });
  await rejectsCode(service.action(session, play()), 'HOUSE_RESERVE_INSUFFICIENT');
  assert.equal(repository.snapshot(session).balanceMinor, '10000'); assert.equal(repository.snapshot(session).ledger.length, 0);
  assert.equal(repository.snapshotHouse().liabilities.size, 0);
});

test('active rounds retain a bank liability until settled', async () => {
  const { service, repository } = setup(); const started = await service.action(session, play());
  assert.equal(repository.snapshotHouse().liabilities.has(started.round.id), true);
  await service.action(session, collect(started.round));
  assert.equal(repository.snapshotHouse().liabilities.has(started.round.id), false);
});
