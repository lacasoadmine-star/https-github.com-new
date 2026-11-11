import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {configurePublicColorGamble, PUBLIC_COLOR_GAMBLE_IDS} from '../math/public-gamble.mjs';
import {readFile} from 'node:fs/promises';
import {freshChargingContext} from './support/charging-wilds-fixtures.mjs';

const ids = PUBLIC_COLOR_GAMBLE_IDS;
const winning = (gameId, betMinor = '100', holdWin = true) => math.startRound({gameId, betMinor,
  options: {holdWin},context:freshChargingContext(math.getGameDefinition(gameId),betMinor,{holdWin}),rng: bound => bound === 5 ? 4 : 0});

for (const gameId of ids) {
  test(gameId + ' optional documented X2 reserves all three doublings and collects exactly once', () => {
    const definition = math.getGameDefinition(gameId);
    assert.equal(definition.gamble.evidenceKind, 'official-public-document');
    assert.equal(definition.gamble.providerLimitVerified, false);
    assert.match(definition.gamble.source, /^https:\/\/www\.smartsoftgaming\.com\/games\//);
    assert.equal(definition.gamble.maxRounds, 3);
    assert.equal(definition.gamble.probabilityModel,'independent-fair-color');
    assert.match(definition.rules.join(' '), /operator choices|explicit independent choices/);
    for (const betMinor of ['100', '2000', '5000000']) {
      let round = winning(gameId, betMinor);
      assert.equal(round.status, 'active');
      assert.equal(round.winMinor, '0');
      const award = BigInt(round.pendingWinMinor);
      assert.ok(award > 0n);
      const context=freshChargingContext(definition,betMinor);
      const baseBound = BigInt(math.maximumPayoutMinor({gameId, betMinor,context}));
      const heldBound = BigInt(math.maximumPayoutMinor({gameId, betMinor, options: {holdWin: true},context}));
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
      assert.ok(BigInt(math.maximumPayoutMinor({gameId, betMinor: maxBet, options: {holdWin: true},context:freshChargingContext(definition,maxBet)})) <= 999999999999999n);
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

test('new color-gamble registrations match exact captured Help captions and preserve protected definitions', async () => {
  assert.equal(ids.length, 24);
  for (const id of ids) {
    const d = math.getGameDefinition(id);
    if (!d.gamble.captionKey) continue;
    const {captions} = JSON.parse(await readFile(new URL('../'+d.gamble.evidenceFile,import.meta.url),'utf8'));
    const text = captions[d.gamble.captionKey];
    assert.equal(typeof text, 'string', id);
    if(id==='ind74_official_vampires'){
      assert.match(text,/RED or BLACK/);assert.match(text,/doubled\(X2\)/);assert.match(text,/amount is lost/);
      assert.equal(d.gamble.providerCollectControlVerified,false);
    }else{
      assert.match(text, /red and black/, id);
      assert.match(text, /Take Win/, id);
      assert.match(text, /original win will be lost/, id);
    }
    if (d.gamble.helpDocument) {
      const html = await readFile(new URL('../' + d.gamble.helpDocument, import.meta.url), 'utf8');
      assert.ok(html.includes('data-caption="' + d.gamble.captionKey + '"'), id);
    } else assert.ok(d.gamble.captionKey.toLowerCase().startsWith('help.slots.' + id.slice('ind74_official_'.length) + '.'), id);
  }
  for (const id of ['ind74_official_multihot5','ind74_official_foxyhot20']) assert.equal(math.getGameDefinition(id), null);
});

test('Multi Hot10/20/40 and Dragon public multiplier factors flow through base and held awards without a second stake', () => {
  for (const suffix of ['multihot10','multihot20','multihot40','dragonscode','sugarfiesta']) {
    const gameId = 'ind74_official_' + suffix, d = math.getGameDefinition(gameId);
    assert.deepEqual(d.multiplierValues, [1,2,3,4,5]);
    for (let factor = 1; factor <= 5; factor++) {
      let i = 0;
      const round = math.startRound({gameId,betMinor:'2000',options:{holdWin:true},rng:()=>i++<d.rows*d.cols?0:factor-1});
      assert.equal(round.outcome.reelMultiplier, factor);
      const expected = BigInt(d.paylines.length) * (2000n * BigInt(d.symbols[0].pays[d.cols]) / BigInt(d.paylines.length)) * BigInt(factor);
      assert.equal(round.pendingWinMinor, expected.toString());
      assert.equal(round.betMinor, '2000');
      assert.ok(expected * 8n <= BigInt(math.maximumPayoutMinor({gameId,betMinor:'2000',options:{holdWin:true}})));
      assert.equal(math.collectRound(round).winMinor, expected.toString());
    }
  }
});
