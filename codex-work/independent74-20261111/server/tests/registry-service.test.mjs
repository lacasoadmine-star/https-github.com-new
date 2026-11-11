import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../../math/index.mjs';
import { createGameService } from '../service.mjs';
import { MemoryRepository } from './support/memory-repository.mjs';

const sessionHash = 'a'.repeat(64);
const id = () => crypto.randomUUID();
const definitions = math.listGameDefinitions();

test('all 74 original models settle through the same atomic wallet service', async () => {
  assert.equal(definitions.length, 74);
  for (const game of definitions) {
    const repository = new MemoryRepository(); repository.addAccount(sessionHash, { balanceMinor: '100000000' });
    let milliseconds = 1794355200000;
    const service = createGameService({ repository, rng: () => 0, clock: () => new Date(milliseconds) });
    const stake = game.limits.minBetMinor; const requestId = id();
    let response = await service.action(sessionHash, { request_id: requestId, game_id: game.id, type: 'play', stake_minor: stake });
    if (response.round.status === 'active' && game.family === 'mines') {
      response = await service.action(sessionHash, { request_id: id(), game_id: game.id, type: 'reveal', round_id: response.round.id, expected_version: response.round.version, options: { cell: game.cells - 1 } });
    }
    if (response.round.status === 'active') {
      if (game.family === 'crash') milliseconds += 1000;
      response = await service.action(sessionHash, { request_id: id(), game_id: game.id, type: 'collect', round_id: response.round.id, expected_version: response.round.version });
    }
    assert.ok(['lost', 'collected'].includes(response.round.status), game.id);
    const expected = 100000000n - BigInt(stake) + BigInt(response.receipt.payout_minor);
    assert.equal(response.wallet.balance_minor, expected.toString(), game.id);
    assert.equal(repository.snapshotHouse().balanceMinor, (1000000000000n + BigInt(stake) - BigInt(response.receipt.payout_minor)).toString(), game.id);
    assert.equal(repository.snapshotHouse().liabilities.size, 0, game.id);
    assert.equal(response.receipt.request_id, requestId, game.id);
    assert.equal(response.round.private, undefined, game.id);
    assert.equal(response.activeRound, null, game.id);
  }
});

test('timed crash cap is persisted and credited by a state transaction exactly once', async () => {
  const repository = new MemoryRepository(); repository.addAccount(sessionHash, { balanceMinor: '10000' });
  let milliseconds = 1794355200000;
  const service = createGameService({ repository, rng: () => 0, clock: () => new Date(milliseconds) });
  const started = await service.action(sessionHash, { request_id: id(), game_id: 'ind74_popx', type: 'play', stake_minor: '100' });
  assert.equal(started.round.status, 'active'); milliseconds += 500000;
  const results = await Promise.all(Array.from({ length: 10 }, () => service.state(sessionHash, 'ind74_popx')));
  for (const response of results) { assert.equal(response.activeRound, null); assert.equal(response.wallet.balance_minor, '19900'); assert.equal(response.history[0].status, 'collected'); }
  assert.equal(repository.snapshot(sessionHash).ledger.filter(item => item.kind === 'credit').length, 1);
  assert.equal(repository.snapshotHouse().liabilities.size, 0);
});

test('failed timed credit rolls back the terminal status and keeps its reserve', async () => {
  const repository = new MemoryRepository(); repository.addAccount(sessionHash, { balanceMinor: '10000' });
  let milliseconds = 1794355200000;
  const service = createGameService({ repository, rng: () => 0, clock: () => new Date(milliseconds) });
  const started = await service.action(sessionHash, { request_id: id(), game_id: 'ind74_popx', type: 'play', stake_minor: '100' });
  milliseconds += 500000;
  repository.beforeCommit = ({ result }) => { if (result.activeRound === null) throw new Error('injected timed settlement failure'); };
  await assert.rejects(service.state(sessionHash, 'ind74_popx'), /injected timed settlement failure/);
  assert.equal(repository.snapshot(sessionHash).balanceMinor, '9900');
  assert.equal(repository.snapshot(sessionHash).rounds.get(started.round.id).status, 'active');
  assert.equal(repository.snapshotHouse().liabilities.has(started.round.id), true);
  repository.beforeCommit = undefined;
  assert.equal((await service.state(sessionHash, 'ind74_popx')).wallet.balance_minor, '19900');
});

test('dice target and hidden-mine cell validation match their family contracts', async () => {
  const dice = definitions.find(game => game.family === 'dice');
  const mines = definitions.find(game => game.family === 'mines');
  const repository = new MemoryRepository(); repository.addAccount(sessionHash);
  const service = createGameService({ repository, rng: () => 0 });
  const die = await service.action(sessionHash, { request_id: id(), game_id: dice.id, type: 'play', stake_minor: dice.limits.minBetMinor, options: { target: 10 } });
  assert.equal(die.round.status, 'collected'); assert.equal(die.round.outcome.target, 10);
  const started = await service.action(sessionHash, { request_id: id(), game_id: mines.id, type: 'play', stake_minor: mines.limits.minBetMinor });
  const revealed = await service.action(sessionHash, { request_id: id(), game_id: mines.id, type: 'reveal', round_id: started.round.id, expected_version: started.round.version, options: { cell: 24 } });
  assert.equal(revealed.round.history[0].cell, 24);
});

test('state includes full selected game but only bounded summaries for the lobby', async () => {
  const repository = new MemoryRepository(); repository.addAccount(sessionHash);
  const response = await createGameService({ repository }).state(sessionHash, math.GAME_ID);
  assert.equal(response.games.length, 74); assert.ok(response.game.paytable.length);
  assert.equal(response.games[0].paytable, undefined);
  assert.ok(JSON.stringify(response).length < 80000);
});
