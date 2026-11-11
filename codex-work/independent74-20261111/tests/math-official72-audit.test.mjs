import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {OBSERVED_LAYOUTS, independentPaylines} from '../math/official72-layouts.mjs';

const definitions = math.listGameDefinitions();
const family = name => definitions.filter(d => d.family === name);
const optionsFor = d => d.family === 'ladder' ? d.modes.map(mode => ({mode}))
  : d.family === 'dice' ? Array.from({length: d.maxTarget - d.minTarget + 1}, (_, i) => ({target: d.minTarget + i}))
  : d.gamble?.enabled ? [{holdWin: false}, {holdWin: true}] : [{}];
const money = (bet, bps) => (BigInt(bet) * BigInt(bps) / 10000n).toString();
const byId = id => math.getGameDefinition('ind74_official_' + id);
const NOW = 1794355200000;

// Reproducible test draws only. Production uses bounded cryptographic integer
// draws; the application never accepts this fixture seed from a player.
function fixtureIntegerRng(seed) {
  let state = seed >>> 0;
  return bound => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % bound; };
}

function finish(d, round) {
  let next = round;
  if (d.family === 'crash' && next.status === 'active') {
    return math.reconcileRound(next, NOW + (d.crashMechanic==='cascade'?(d.maxSteps-1)*d.cascadeMs:Math.ceil((d.maxMultiplierBps - 10000) * 1000 / d.growthBpsPerSecond)));
  }
  while (next.status === 'active') {
    if (d.family === 'mines') {
      const used = new Set(next.history.map(item => item.cell));
      const cell = Array.from({length: d.cells}, (_, i) => i).find(i => !used.has(i) && !next.private.mines.includes(i));
      next = math.advanceRound(next, {cell}, NOW);
    } else if (d.family === 'ladder') {
      const used = new Set(next.history.map(item => item.cell));
      const cell = Array.from({length: next.maxSteps}, (_, i) => i).find(i => !used.has(i));
      next = math.advanceRound(next, {cell}, NOW);
    } else if (d.gamble?.enabled) next = math.collectRound(next);
    else throw new Error('Unexpected active instant family: ' + d.family);
  }
  return next;
}

test('all 72 models have consistent geometry, public evidence boundaries and independent disclosures', () => {
  assert.equal(definitions.length, 72);
  assert.deepEqual(definitions.reduce((counts, d) => { counts[d.family] = (counts[d.family] ?? 0) + 1; return counts; }, {}),
    {crash: 13, ladder: 10, plinko: 3, slots: 40, wheel: 5, dice: 1});
  assert.equal(new Set(definitions.map(d => d.id)).size, 72);
  assert.equal(math.getGameDefinition('ind74_official_multihot5'), null);
  assert.equal(math.getGameDefinition('ind74_official_foxyhot20'), null);
  for (const d of definitions) {
    assert.equal(d.modelDisclosure.providerPrivateMathVerified, false);
    assert.equal(d.layout.fullReferenceParityVerified, false);
    assert.equal(d.layout.geometryVerified, Object.hasOwn(OBSERVED_LAYOUTS, d.id));
    assert.ok(d.layout.source.length > 0);
    assert.ok(d.layout.limitations.length > 0);
    assert.equal(d.limits.minBetMinor, '100', d.id);
    assert(BigInt(d.limits.maxBetMinor)>4000000n,d.id); assert.equal(d.limits.storageDerived,true);
    assert.equal(d.limits.betStepMinor, '100', d.id);
    assert.ok(BigInt(d.limits.maxWinMinor) > 0n);
    if (d.family === 'slots') {
      assert.equal(d.cols, ['Multi Hot 5 Wild','Multi Hot 5 Deluxe','Safari Simba','Habesha Fortune 5','Bao Slot 5X','Multi Hot Wild Ways','Power of Tiger','Multi Hot Ways','Multi Fruits Charging Wilds','Gems Crown Charging Wilds'].includes(d.catalogName) ? 3 : 5);
      assert.equal(d.layout.rows, d.rows);
      assert.equal(d.layout.columns, d.cols);
      assert.equal(d.layout.paylines, d.ways ? null : d.paylines.length);
      assert.equal(new Set(d.paylines.map(line => line.join(','))).size, d.paylines.length);
      assert.ok(d.paylines.every(line => line.length === d.cols && line.every(row => Number.isInteger(row) && row >= 0 && row < d.rows)));
      assert.equal(d.symbols.length, d.id==='ind74_official_multihot5wild'?9:8);
      assert.equal(new Set(d.symbols.map(symbol => symbol.id)).size, d.symbols.length);
      assert.ok(d.symbols.every(symbol => symbol.weight === 1 && Object.entries(symbol.pays).every(([count, prize]) => Number(count) <= d.cols && Number.isSafeInteger(prize) && prize > 0)));
    }
    if (d.family === 'plinko') assert.equal(d.bucketMultipliersBps.length, d.rows + 1);
    if (d.family === 'mines') assert.equal(d.rows * d.cols, d.cells);
  }
});

test('Multi Hot 40 uses all four rows, Multi Hot 100 places its observed multiplier on the left, and Plinko remains a 16-row board', () => {
  const forty = byId('multihot40');
  assert.equal(forty.rows, 4);
  assert.equal(forty.cols, 5);
  assert.equal(forty.paylines.length, 40);
  assert.ok(forty.paylines.some(line => line.every(row => row === 3)), 'The new bottom row needs an actual winning line.');
  assert.equal(forty.layout.multiplier.placement, 'top-arc');
  assert.equal(forty.layout.multiplier.calculationImplemented, false);
  const hundred = byId('multihot100');
  assert.equal(hundred.layout.multiplier.placement, 'left-reel');
  assert.deepEqual(hundred.layout.multiplier.implementedValues, [1, 2, 3, 4, 5]);
  assert.equal(hundred.layout.multiplier.providerProbabilitiesVerified, false);
  const plinko = byId('plinkoxclassic');
  assert.equal(plinko.layout.rows, 16);
  assert.equal(plinko.layout.buckets, 17);
  assert.deepEqual(plinko.layout.implementedBallMultipliers, [1,5,10]);
  assert.equal(plinko.layout.completeBallMechanicsVerified, false);
  assert.throws(() => independentPaylines(5, 4, 1025));
  assert.throws(() => independentPaylines(0, 4, 40));
});

test('every model and valid start option is reproducible with injected integer draws and completes within its accepted payout bound', () => {
  for (const d of definitions) for (const options of optionsFor(d)) for (const base of ['100', '300', '1900', '400000']) {
    const betMinor = base === '400000' ? base : String(Number(base) * (options.ballMultiplier ?? 1));
    const seed = d.id.length * 97 + Number(betMinor) + (options.target ?? 0);
    const first = math.startRound({gameId: d.id, betMinor, options, now: NOW, rng: fixtureIntegerRng(seed)});
    const second = math.startRound({gameId: d.id, betMinor, options, now: NOW, rng: fixtureIntegerRng(seed)});
    assert.deepEqual(second, first, d.id);
    assert.doesNotThrow(() => JSON.stringify(first), d.id);
    if (first.status === 'active') assert.equal(first.winMinor, '0', d.id);
    const final = finish(d, first);
    assert.ok(['collected', 'lost'].includes(final.status), d.id);
    const bound = BigInt(math.maximumPayoutMinor({gameId: d.id, betMinor, options}));
    assert.ok(BigInt(final.winMinor) <= bound, d.id + ' ' + JSON.stringify(options));
    assert.ok(bound <= BigInt(d.limits.maxWinMinor), d.id);
    assert.equal(math.publicRound(final, d.family === 'crash' ? final.lastObservedAt : NOW).allowedActions.length, 0, d.id);
    assert.equal(math.reconcileRound(final, d.family === 'crash' ? final.lastObservedAt : NOW), final, d.id);
  }
});

test('regular slot evaluators pay their symbol awards without a hidden clamp; Tiger and Coins have separate conditional-feature coverage', () => {
  const simple=family('slots').filter(d=>!['ind74_official_poweroftiger','ind74_official_coinsofatlantis'].includes(d.id));
  assert.equal(simple.length,38);
  for (const d of simple) for (const betMinor of ['100', '300', '400000']) {
    let greatest = 0n;
    const wheelIndex = (d.multiplierValues ?? [1]).indexOf(Math.max(...(d.multiplierValues ?? [1])));
    const wheel = (d.multiplierValues ?? [1])[wheelIndex];
    for (let symbolIndex = 0; symbolIndex < d.symbols.length; symbolIndex++) for (const matches of Object.keys(d.symbols[symbolIndex].pays).map(Number)) {
      let calls = 0;
      const rng = () => {
        const i = calls++;
        if (i >= d.rows * d.cols) return wheelIndex;
        return i % d.cols < matches ? symbolIndex : (symbolIndex + 1) % d.symbols.length;
      };
      const round = math.startRound({gameId: d.id, betMinor, rng});
      const expected = BigInt(d.paylines.length) * (BigInt(betMinor) * BigInt(d.symbols[symbolIndex].pays[matches]) / BigInt(d.paylines.length)) * BigInt(wheel);
      assert.equal(BigInt(round.winMinor), expected, d.id + ' matches=' + matches);
      assert.equal(round.outcome.lineWins.length, d.paylines.length);
      assert.equal(round.outcome.grid.length, d.rows);
      assert.ok(round.outcome.lineWins.every(line => line.matches === matches));
      greatest = expected > greatest ? expected : greatest;
    }
    if(d.wildSymbol?.pays) {
      let i=0;const r=math.startRound({gameId:d.id,betMinor,rng:()=>i++<d.rows*d.cols?d.symbols.length*32:wheelIndex});
      greatest=BigInt(r.winMinor)>greatest?BigInt(r.winMinor):greatest;
    }
    assert.equal(BigInt(math.maximumPayoutMinor({gameId: d.id, betMinor})), greatest, d.id);
  }
});

test('four direct-award wheels and every Plinko bucket settle the displayed multiplier exactly', () => {
  for (const d of family('wheel').filter(d=>d.id!=='ind74_official_wheelofdestiny')) for (const betMinor of ['100', '400000']) {
    let offset = 0;
    for (const sector of d.sectors) {
      const round = math.startRound({gameId: d.id, betMinor, rng: () => offset});
      assert.equal(round.outcome.sector, sector.id, d.id);
      assert.equal(round.winMinor, money(betMinor, sector.multiplierBps), d.id);
      offset += sector.weight;
    }
  }
  for (const d of family('plinko')) for (let bucket = 0; bucket <= d.rows; bucket++) {
    let calls = 0;
    const round = math.startRound({gameId: d.id, betMinor: '400000', rng: () => calls++ < bucket ? 1 : 0});
    assert.equal(round.outcome.bucket, bucket, d.id);
    assert.equal(round.outcome.path.length, d.rows, d.id);
    assert.equal(round.winMinor, money('400000', d.bucketMultipliersBps[bucket]), d.id);
    assert.ok(BigInt(round.winMinor) <= BigInt(math.maximumPayoutMinor({gameId: d.id, betMinor: '400000'})));
  }
});

test('Roll X validates all 81 target choices and reserves the selected target rather than the unrelated maximum', () => {
  const d = byId('rollx');
  for (let target = d.minTarget; target <= d.maxTarget; target++) {
    const options = {target}, coefficient = Math.floor(d.returnBps * 100 / target);
    const bound = math.maximumPayoutMinor({gameId: d.id, betMinor: '400000', options});
    assert.equal(bound, money('400000', coefficient));
    let totalWin = 0n;
    for (let roll = 0; roll < 100; roll++) {
      const round = math.startRound({gameId: d.id, betMinor: '100', options, rng: () => roll});
      assert.equal(round.outcome.success, roll < target);
      assert.equal(round.winMinor, roll < target ? money('100', coefficient) : '0');
      totalWin += BigInt(round.winMinor);
    }
    assert.ok(totalWin <= 9600n, 'Independent nominal return must remain at most 96% before money floors.');
  }
  assert.equal(math.maximumPayoutMinor({gameId: d.id, betMinor: '100', options: {target: 50}}), '192');
  assert.equal(math.maximumPayoutMinor({gameId: d.id, betMinor: '100', options: {target: 90}}), '106');
});

test('every ladder mode publishes its selected mode and reserves exactly its final step', () => {
  for (const d of family('ladder')) for (const options of optionsFor(d)) {
    const table = d.paytable.find(row => row.mode === options.mode);
    const multipliers = table?.rows?.map(row => row.multiplierBps) ?? d.multipliersBps;
    let round = math.startRound({gameId: d.id, betMinor: '300', options, rng: () => 0});
    const cap = math.maximumPayoutMinor({gameId: d.id, betMinor: '300', options});
    assert.equal(cap, money('300', multipliers.at(-1)), d.id);
    assert.equal(math.publicRound(round).mode, options.mode, d.id);
    while (round.status === 'active') {
      const snapshot = JSON.stringify(round);
      const collected = math.collectRound(round);
      assert.equal(collected.winMinor, money('300', multipliers[round.step - 1]), d.id);
      assert.equal(JSON.stringify(round), snapshot, d.id);
      assert.throws(() => math.collectRound(collected), {code: 'ROUND_FINISHED'});
      round = math.advanceRound(round, {cell: round.step});
    }
    assert.equal(round.winMinor, cap, d.id);
    assert.equal(round.step, multipliers.length, d.id);
  }
  assert.equal(math.maximumPayoutMinor({gameId: math.GAME_ID, betMinor: '100', options: {mode: 'easy'}}), '10000');
  assert.equal(math.maximumPayoutMinor({gameId: math.GAME_ID, betMinor: '100', options: {mode: 'medium'}}), '25000');
  assert.equal(math.maximumPayoutMinor({gameId: math.GAME_ID, betMinor: '100', options: {mode: 'hard'}}), '50000');
});

test('Mine Island follows its observed ascending ladder, rejects duplicate steps and cannot lose more than its stake', () => {
  const d = byId('mineisland');
  const first = math.startRound({gameId: d.id, betMinor: '100', rng: () => 0});
  const view = math.publicRound(first);
  assert.equal(d.family, 'ladder');
  assert.equal(view.collectibleMinor, '110');
  assert.deepEqual(view.allowedActions, ['reveal','collect']);
  assert.equal(math.collectRound(first).winMinor,'110');
  const safe = math.advanceRound(first, {cell: 1});
  assert.ok(BigInt(math.publicRound(safe).collectibleMinor) > 0n);
  assert.throws(() => math.advanceRound(safe, {cell: 1}), {code: 'INVALID_CELL'});
  const lost = math.startRound({gameId:d.id,betMinor:'100',rng:bound=>bound-1});
  assert.equal(lost.status, 'lost');
  assert.equal(lost.winMinor, '0');
  assert.equal(math.publicRound(lost).collectibleMinor, '0');
  assert.throws(() => math.collectRound(lost), {code: 'ROUND_FINISHED'});
});

test('crash views never credit a future result before reconciliation and maximum surviving rounds settle exactly once', () => {
  for (const d of family('crash')) {
    const round = math.startRound({gameId: d.id, betMinor: '100', rng: () => 0, now: NOW});
    const at = NOW + (d.crashMechanic==='cascade'?(d.maxSteps-1)*d.cascadeMs:Math.ceil((d.maxMultiplierBps - 10000) * 1000 / d.growthBpsPerSecond));
    const view = math.publicRound(round, at);
    assert.equal(view.status, 'active', d.id);
    assert.equal(view.winMinor, '0', d.id);
    assert.equal(view.collectibleMinor, '0', d.id);
    assert.equal(view.pendingResolution, true, d.id);
    assert.equal(Object.hasOwn(view, 'bustMultiplierBps'), false, d.id);
    const final = math.reconcileRound(round, at);
    assert.equal(final.status, 'collected', d.id);
    assert.equal(final.winMinor, math.maximumPayoutMinor({gameId: d.id, betMinor: '100'}), d.id);
    assert.equal(math.reconcileRound(final, at + 10000), final, d.id);
    assert.throws(() => math.collectRound(final, {}, at), {code: 'ROUND_FINISHED'});
    const immediateLoss = math.startRound({gameId: d.id, betMinor: '100', rng: bound => bound - 1, now: NOW});
    assert.equal(immediateLoss.status, 'lost', d.id);
    assert.equal(immediateLoss.winMinor, '0', d.id);
  }
});

test('reserve and start reject the same invalid options and post-start requests cannot change stake, payout, mode, or seed', () => {
  for (const d of definitions) {
    for (const options of [null, [], 'easy', {payoutMinor: '1000000'}, {seed: 'player-chosen'}, {mode: 'unknown-mode'}]) {
      for (const action of [math.startRound, math.maximumPayoutMinor]) {
        assert.throws(() => action({gameId: d.id, betMinor: '100', options, rng: () => 0, now: NOW}), d.id);
      }
    }
    // The first over-limit minor unit and an aligned over-limit stake must
    // both fail at the derived integer storage boundary.
    for (const betMinor of ['0', '99', '101', String(BigInt(d.limits.maxBetMinor)+1n), String(BigInt(d.limits.maxBetMinor)+100n), '-1', '1e2', '0100', '100.0']) {
      for (const action of [math.startRound, math.maximumPayoutMinor]) {
        assert.throws(() => action({gameId: d.id, betMinor, rng: () => 0, now: NOW}), d.id + ' ' + betMinor);
      }
    }
    const round = math.startRound({gameId: d.id, betMinor: '100', rng: () => 0, now: NOW});
    for (const options of [null, [], {stakeMinor: '1'}, {mode: 'hard'}, {payoutMinor: '1000'}, {seed: 'client'}, {win: true}]) {
      assert.throws(() => math.advanceRound(round, options, NOW), {code: 'INVALID_OPTIONS'}, d.id);
      assert.throws(() => math.collectRound(round, options, NOW), {code: 'INVALID_OPTIONS'}, d.id);
    }
  }
});

test('all families reject invalid bounded RNG output and public snapshots cannot mutate stored state', () => {
  for (const d of definitions) {
    for (const rng of [() => -1, bound => bound, () => 0.5, () => NaN]) {
      assert.throws(() => math.startRound({gameId: d.id, betMinor: '100', rng, now: NOW}), {code: 'INVALID_RNG'}, d.id);
    }
    const round = math.startRound({gameId: d.id, betMinor: '100', rng: () => 0, now: NOW});
    const before = JSON.stringify(round), view = math.publicRound(round, NOW);
    assert.equal(Object.hasOwn(view, 'private'), false, d.id);
    assert.equal(Object.hasOwn(view, 'survival'), false, d.id);
    assert.equal(Object.hasOwn(view, 'seed'), false, d.id);
    if (round.status === 'active') assert.equal(Object.hasOwn(view, 'mineCells'), false, d.id);
    if (view.outcome?.grid) view.outcome.grid[0][0] = 'render-mutation';
    if (view.outcome?.path) view.outcome.path[0] = 999;
    if (view.history.length) view.history[0].cell = -99;
    view.allowedActions.push('invented');
    assert.equal(JSON.stringify(round), before, d.id);
    assert.throws(() => math.publicRound({...round, mathVersion: 'wrong-version'}, NOW), {code: 'INVALID_ROUND'});
    assert.throws(() => math.publicRound({...round, winMinor: '-1'}, NOW), {code: 'INVALID_ROUND'});
  }
});

test('the audit matrix covers all models, every supported option and explicit unresolved reference gaps', () => {
  const matrix = math.modelAuditMatrix();
  assert.equal(matrix.length, 72);
  assert.equal(matrix.find(item => item.family === 'dice').optionPayoutBounds.length, 81);
  assert.equal(matrix.find(item => item.id === math.GAME_ID).optionPayoutBounds.length, 3);
  assert.ok(matrix.every(item => item.providerPrivateMathVerified === false && item.fullReferenceParityVerified === false));
  assert.equal(matrix.filter(item => item.layout.geometryVerified).length, Object.keys(OBSERVED_LAYOUTS).length);
  assert.doesNotThrow(() => JSON.stringify(matrix));
});
