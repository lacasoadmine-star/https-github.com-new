import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {configurePublicColorGamble} from '../math/public-gamble.mjs';

const ids = ['ind74_official_multihot5wild', 'ind74_official_multihot5burnwilds'];
const winning = (gameId, betMinor = '100', holdWin = true) => math.startRound({gameId, betMinor,
  options: {holdWin}, rng: bound => bound === 5 ? 4 : 0});

for (const gameId of ids) {
  test(gameId + ' optional documented X2 reserves all three doublings and collects exactly once', () => {
    const definition = math.getGameDefinition(gameId);
    assert.equal(definition.gamble.evidenceKind, 'official-public-document');
    assert.equal(definition.gamble.providerLimitVerified, false);
    assert.match(definition.gamble.source, /^https:\/\/www\.smartsoftgaming\.com\/games\//);
    assert.equal(definition.gamble.maxRounds, 3);
    assert.match(definition.rules.join(' '), /operator choices; provider equivalence is not established/);
    for (const betMinor of ['100', '2000', '5000000']) {
      let round = winning(gameId, betMinor);
      assert.equal(round.status, 'active');
      assert.equal(round.winMinor, '0');
      const award = BigInt(round.pendingWinMinor);
      assert.ok(award > 0n);
      const baseBound = BigInt(math.maximumPayoutMinor({gameId, betMinor}));
      const heldBound = BigInt(math.maximumPayoutMinor({gameId, betMinor, options: {holdWin: true}}));
      assert.equal(heldBound, baseBound * 8n);
      assert.ok(award * 8n <= heldBound);
      for (let step = 1; step <= 3; step++) {
        const prior = structuredClone(round);
        round = math.advanceRound(round, {color: 'red'}, undefined, () => 0);
        assert.deepEqual(prior.gambleHistory.length, step - 1);
        assert.equal(round.betMinor, betMinor);
        assert.equal(round.gambleRounds, step);
        if (step < 3) assert.equal(round.pendingWinMinor, (award * 2n ** BigInt(step)).toString());
      }
      assert.equal(round.status, 'collected');
      assert.equal(round.winMinor, (award * 8n).toString());
      assert.equal(round.pendingWinMinor, '0');
      assert.throws(() => math.collectRound(round));
      assert.throws(() => math.advanceRound(round, {color: 'red'}, undefined, () => 0));
      const maxBet = definition.limits.maxBetMinor;
      assert.ok(BigInt(math.maximumPayoutMinor({gameId, betMinor: maxBet, options: {holdWin: true}})) <= 999999999999999n);
    }
  });

  test(gameId + ' wrong color loses only the held award; collect preserves award and optional flow', () => {
    const held = winning(gameId);
    const lost = math.advanceRound(held, {color: 'red'}, undefined, () => 1);
    assert.equal(lost.status, 'lost');
    assert.equal(lost.winMinor, '0');
    assert.equal(lost.pendingWinMinor, '0');
    assert.equal(lost.betMinor, held.betMinor);
    const collected = math.collectRound(held);
    assert.equal(collected.winMinor, held.pendingWinMinor);
    assert.equal(collected.betMinor, held.betMinor);
    const direct = winning(gameId, '100', false);
    assert.equal(direct.status, 'collected');
    assert.equal(direct.winMinor, held.pendingWinMinor);
    assert.throws(() => math.advanceRound(held, {color: 'blue'}, undefined, () => 0));
    const visible = math.publicRound(held);
    assert.deepEqual(visible.allowedActions, ['gamble', 'collect']);
    visible.outcome.grid[0][0] = 'modified';
    assert.notEqual(held.outcome.grid[0][0], 'modified');
  });
}

test('public color configuration cannot accidentally enable an undocumented or protected game', () => {
  for (const id of ['ind74_official_multihot5', 'ind74_official_foxyhot20', 'ind74_official_popx']) {
    assert.throws(() => configurePublicColorGamble({id, family: 'slots', rules: []}));
  }
});
