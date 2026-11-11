import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {integerRngFromLibrary} from '../existing-library74-adapter.mjs';
import {seededRandom} from './support/retained-library/library-service.mjs';
import {createRetainedLibrary74Fixture} from './support/retained-library-fixture.mjs';

test('new documented wild-slot X2 flows retain one debit and one payout under duplicate delivery', {timeout: 60000}, async t => {
  const fixture = await createRetainedLibrary74Fixture({isolated: true});
  t.after(() => fixture.close());
  const {sql, facade, service} = fixture;
  const balance = async user => BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1', [user]))[0].balance);
  const total = async () => (await sql.unsafe('SELECT SUM(balance)::text AS value FROM sw_rebuild.wallets'))[0].value;
  for (const gameId of ['ind74_official_multihot5wild', 'ind74_official_multihot5burnwilds']) {
    await t.test(gameId, async () => {
      const user = await fixture.addPlayer(), before = await balance(user), beforeTotal = await total();
      const roundId = randomUUID(), now = service.now();
      let seed;
      // Choose only disposable fixture entropy to cover a held win. This does
      // not read/select a production seed or simulate an official-demo round.
      for (let i = 0; i < 4096; i++) {
        const candidate = createHash('sha256').update('public-X2-fixture:' + i).digest('hex');
        const result = facade.adapter.start(gameId, {stakeMinor: '2000', holdWin: true}, seededRandom(candidate, roundId + ':0'), now);
        if (result.state.status === 'active') {seed = candidate; break;}
      }
      assert.ok(seed, 'Fixture should cover a held award.');
      const originalId = service.id, originalSeed = service.seed;
      let started;
      service.id = () => roundId; service.seed = () => seed;
      try {
        started = await facade.action(user, {request_id: randomUUID(), type: 'start', game_id: gameId,
          model_version: facade.adapter.definitions[gameId].version, stake: '20.00', options: {holdWin: true}});
      } finally {service.id = originalId; service.seed = originalSeed;}
      const stored = (await sql.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1', [roundId]))[0];
      const pending = BigInt(started.round.pendingWinMinor);
      assert.equal(await balance(user), before - 2000n);
      assert.equal(await balance(stored.reserve_wallet), BigInt(stored.liability));
      const color = ['red', 'black'][integerRngFromLibrary(seededRandom(seed, roundId + ':1'))(2)];
      const request = {request_id: randomUUID(), type: 'action', game_id: gameId,
        model_version: started.round.model_version, round_id: roundId, expected_version: 0, action: 'gamble', input: {color}};
      const responses = await Promise.all(Array.from({length: 6}, () => facade.action(user, request)));
      assert.equal(responses.filter(value => value.replayed).length, 5);
      const progressed = responses.find(value => !value.replayed);
      assert.equal(progressed.round.pendingWinMinor, String(pending * 2n));
      assert.equal(await balance(user), before - 2000n);
      const collect = {...request, request_id: randomUUID(), expected_version: 1, action: 'collect', input: {}};
      const settled = await facade.action(user, collect);
      const replay = await facade.action(user, collect);
      assert.equal(replay.replayed, true);
      assert.equal(settled.round.payoutMinor, String(pending * 2n));
      assert.equal(await balance(user), before - 2000n + pending * 2n);
      assert.equal(await balance(stored.reserve_wallet), 0n);
      assert.equal((await sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'", [user])).length, 1);
      assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.transfers WHERE id=$1', ['nl:' + roundId + ':payout'])).length, 1);
      assert.equal((await sql.unsafe('SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING SUM(delta)<>0')).length, 0);
      assert.equal(await total(), beforeTotal);
    });
  }
});
