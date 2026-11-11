import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {evaluatePublicWildGrid} from '../math/official72-mechanics.mjs';

const definition = suffix => math.getGameDefinition('ind74_official_' + suffix);
const hundred = definition('multihot100');
const wild = definition('multihot5wild');
const burn = definition('multihot5burnwilds');
const plinko = definition('plinkoxclassic');
const fullWin = (holdWin = true, betMinor = '100') => math.startRound({gameId: hundred.id, betMinor,
  options: {holdWin}, rng: bound => bound === 5 ? 4 : 0});
const gridRng = (d, grid, wheel = 0) => {
  let index = 0;
  return bound => {
    if (index === d.rows * d.cols) { index++; assert.equal(bound, 5); return wheel; }
    const id = grid[Math.floor(index / d.cols)][index++ % d.cols];
    const symbol = d.symbols.findIndex(item => item.id === id);
    return symbol >= 0 ? symbol : d.symbols.length*32;
  };
};

test('Multi Hot 5 Wild implements the public 3×3 geometry and all substitution combinations with exact independent return', () => {
  assert.equal(wild.cols, 3); assert.equal(wild.rows, 3); assert.equal(wild.paylines.length, 5);
  assert.equal(wild.layout.multiplier.placement, 'left-reel');
  const ids = [...wild.symbols.map(s => s.id), wild.wildSymbol.id];
  let weightedWin = 0n;
  for (const a of ids) for (const b of ids) for (const c of ids) {
    const triple = [a,b,c], grid = Array.from({length: 3}, () => [...triple]);
    const eligible = wild.symbols.filter(symbol => triple.every(id => id === symbol.id || id === wild.wildSymbol.id));
    const prize = Math.max(0, ...eligible.map(symbol => symbol.pays[3]),triple.every(id=>id===wild.wildSymbol.id)?wild.wildSymbol.pays[3]:0);
    const round = math.startRound({gameId: wild.id, betMinor: '500', rng: gridRng(wild, grid)});
    assert.equal(round.winMinor, String(prize * 500));
    assert.equal(round.outcome.lineWins.length, prize ? 5 : 0);
    const weight = triple.reduce((value, id) => value * (id === wild.wildSymbol.id ? 1n : 32n), 1n);
    weightedWin += BigInt(round.winMinor) * weight;
  }
  // Each line has the same marginal distribution; shared cells do not change
  // expected value. The independent multiplier mean is exactly three.
  assert.equal(weightedWin * 3n * BigInt(wild.nominalReturn.denominator),
    BigInt(wild.nominalReturn.numerator) * 500n * (BigInt(wild.symbols.length*32+1) ** 3n));
  assert.ok(BigInt(wild.nominalReturn.numerator) < BigInt(wild.nominalReturn.denominator));
});

test('Burn Wilds expands only permitted wilds participating in an initial winning line and returns both grids', () => {
  const s = burn.symbols.map(symbol => symbol.id), w = burn.wildSymbol.id;
  const grid = [[s[1],s[2],s[3],w,s[5]], [s[0],w,s[0],s[1],s[2]], [s[2],s[3],s[4],s[5],s[6]]];
  const original = structuredClone(grid);
  const round = math.startRound({gameId: burn.id, betMinor: '500', rng: gridRng(burn, grid, 4)});
  assert.deepEqual(round.outcome.originalGrid, original);
  assert.deepEqual(round.outcome.expandedColumns, [1]);
  assert.ok(round.outcome.grid.every(row => row[1] === w));
  assert.equal(round.outcome.grid[0][3], w);
  assert.notEqual(round.outcome.grid[1][3], w, 'A nonparticipating wild must not expand its entire column.');
  const evaluated = evaluatePublicWildGrid(burn, '500', round.outcome.grid);
  assert.equal(round.winMinor, (BigInt(evaluated.winMinor) * 5n).toString());
  assert.deepEqual(grid, original, 'The input grid must not mutate.');
  for (const col of [0,4]) {
    const bad = structuredClone(grid); bad[0][col] = w;
    assert.throws(() => evaluatePublicWildGrid(burn, '500', bad), {code: 'INVALID_GRID'});
  }
});

test('wild-bearing maximum outcomes stay within the exact advertised model bound without clamping', () => {
  for (const d of [wild,burn]) for (const betMinor of ['100','300','400000']) {
    const best = d.symbols.reduce((left, right) => Math.max(...Object.values(left.pays)) > Math.max(...Object.values(right.pays)) ? left : right);
    const grid = Array.from({length: d.rows}, () => Array.from({length: d.cols}, (_, col) =>
      d.wildRule.columns.includes(col) ? d.wildSymbol.id : best.id));
    const round = math.startRound({gameId: d.id, betMinor, rng: gridRng(d, grid, 4)});
    assert.equal(round.winMinor, math.maximumPayoutMinor({gameId: d.id, betMinor}));
    assert.ok(BigInt(round.winMinor) <= BigInt(d.limits.maxWinMinor));
  }
});

test('X2 holds a completed spin award without a second stake and can collect immediately exactly once', () => {
  const direct = fullWin(false), held = fullWin();
  assert.equal(direct.status, 'collected'); assert.equal(held.status, 'active');
  assert.equal(held.pendingWinMinor, direct.winMinor); assert.equal(held.winMinor, '0');
  assert.equal(held.betMinor, direct.betMinor); assert.deepEqual(held.outcome, direct.outcome);
  const view = math.publicRound(held);
  assert.deepEqual(view.allowedActions, ['gamble','collect']);
  assert.equal(view.collectibleMinor, direct.winMinor); assert.equal(view.maxGambleRounds, 3);
  const snapshot = JSON.stringify(held), collected = math.collectRound(held);
  assert.equal(collected.status, 'collected'); assert.equal(collected.winMinor, direct.winMinor);
  assert.equal(collected.pendingWinMinor, '0'); assert.equal(JSON.stringify(held), snapshot);
  assert.throws(() => math.collectRound(collected), {code: 'ROUND_FINISHED'});
  assert.throws(() => math.advanceRound(collected, {color: 'red'}, 0, () => 0), {code: 'ROUND_FINISHED'});
});

test('each successful X2 doubles only the pending award and the third success settles the fully reserved bound', () => {
  for (const betMinor of ['100','300','400000']) {
    let round = fullWin(true, betMinor);
    const original = BigInt(round.pendingWinMinor);
    assert.equal(math.maximumPayoutMinor({gameId: hundred.id, betMinor, options: {holdWin:true}}), (original * 8n).toString());
    for (let attempt = 1; attempt <= 3; attempt++) {
      let draws = 0;
      const current = round;
      round = math.advanceRound(current, {color: attempt % 2 ? 'red' : 'black'}, 0, bound => { draws++; assert.equal(bound, 2); return attempt % 2 ? 0 : 1; });
      assert.equal(draws, 1); assert.equal(round.gambleRounds, attempt);
      assert.equal(current.gambleRounds, attempt - 1);
      assert.equal(round.gambleHistory.at(-1).pendingAfterMinor, (original * (2n ** BigInt(attempt))).toString());
      if (attempt < 3) {
        assert.equal(round.status, 'active'); assert.equal(round.winMinor, '0');
        assert.equal(math.collectRound(round).winMinor, round.pendingWinMinor);
      } else {
        assert.equal(round.status, 'collected'); assert.equal(round.pendingWinMinor, '0');
        assert.equal(round.winMinor, (original * 8n).toString());
        assert.deepEqual(math.publicRound(round).allowedActions, []);
      }
    }
  }
  assert.equal(hundred.limits.maxWinMinor, math.maximumPayoutMinor({gameId: hundred.id,
    betMinor: hundred.limits.maxBetMinor, options:{holdWin:true}}));
  assert.equal(hundred.maximumMultiplierBps, 20000 * 10000);
});

test('an incorrect X2 loses only the held award, records the actual revealed color and cannot replay', () => {
  const first = fullWin(), next = math.advanceRound(first, {color:'red'}, 0, () => 1);
  assert.equal(next.status, 'lost'); assert.equal(next.winMinor, '0'); assert.equal(next.pendingWinMinor, '0');
  assert.equal(next.betMinor, first.betMinor);
  assert.deepEqual(next.gambleHistory, [{round:1,color:'red',revealedColor:'black',correct:false,
    pendingBeforeMinor:first.pendingWinMinor,pendingAfterMinor:'0'}]);
  assert.equal(math.publicRound(next).collectibleMinor, '0');
  assert.throws(() => math.advanceRound(next, {color:'black'}, 0, () => 1), {code:'ROUND_FINISHED'});
  assert.throws(() => math.collectRound(next), {code:'ROUND_FINISHED'});
});

test('gamble input and stored history validation reject client outcomes, invalid colors, invalid RNG and tampering', () => {
  const held = fullWin();
  for (const holdWin of [1,0,'true',null,{}]) for (const operation of [math.startRound,math.maximumPayoutMinor]) {
    assert.throws(() => operation({gameId:hundred.id,betMinor:'100',options:{holdWin},rng:()=>0}), {code:'INVALID_OPTIONS'});
  }
  for (const options of [{}, {color:'RED'}, {color:'green'}, {color:'red',seed:'client'}, {color:'red',winMinor:'999999'}]) {
    assert.throws(() => math.advanceRound(held, options, 0, () => 0), {code:'INVALID_OPTIONS'});
  }
  for (const rng of [() => -1, () => 2, () => .5, () => NaN]) {
    assert.throws(() => math.advanceRound(held, {color:'red'}, 0, rng), {code:'INVALID_RNG'});
  }
  const won = math.advanceRound(held, {color:'red'}, 0, () => 0);
  for (const tampered of [
    {...held,pendingWinMinor:'99999999999'}, {...held,gambleRounds:1}, {...held,baseWinMinor:'1'},
    {...won,gambleHistory:[{...won.gambleHistory[0],correct:false}]},
    {...won,gambleHistory:[{...won.gambleHistory[0],pendingBeforeMinor:'1'}]},
    {...won,gambleHistory:[{...won.gambleHistory[0],revealedColor:'blue'}]},
  ]) assert.throws(() => math.publicRound(tampered), {code:'INVALID_ROUND'});
  const view = math.publicRound(won), before = JSON.stringify(won);
  view.gambleHistory[0].revealedColor = 'changed'; view.outcome.grid[0][0] = 'changed';
  assert.equal(JSON.stringify(won), before); assert.equal(view.private, undefined);
  assert.equal(JSON.stringify(math.publicRound(held)).includes('seed'), false);
});

test('Plinko draws each public ball factor on the server and applies it to one unchanged stake', () => {
  for (const ball of plinko.ballSelection) for (const betMinor of ['100','300','400000']) {
    const colorTicket = ball.type==='pink'?0:ball.type==='orange'?995:999;
    for (let bucket = 0; bucket <= 16; bucket++) {
      let calls = 0;
      const round = math.startRound({gameId:plinko.id,betMinor,rng:bound => bound===1000?colorTicket:calls++ < bucket ? 1 : 0});
      assert.equal(round.betMinor, betMinor); assert.equal(round.totalBetMinor, betMinor);
      assert.equal(round.baseBetMinor, betMinor); assert.equal(round.ballMultiplier, ball.multiplier);
      assert.equal(round.outcome.ballType, ball.type); assert.equal(round.outcome.ballMultiplier, ball.multiplier);
      assert.equal(round.winMinor, (BigInt(betMinor) * BigInt(plinko.bucketMultipliersBps[bucket]) * BigInt(ball.multiplier) / 10000n).toString());
      assert.ok(BigInt(round.winMinor) <= BigInt(math.maximumPayoutMinor({gameId:plinko.id,betMinor})));
      assert.equal(math.publicRound(round).baseBetMinor, betMinor);
    }
  }
  for (const options of [{ballMultiplier:1},{ballMultiplier:5},{ballMultiplier:10},{ballMultiplier:'5'},{ballMultiplier:5,baseBetMinor:'100'}]) {
    assert.throws(() => math.startRound({gameId:plinko.id,betMinor:'1000',options}), {code:'INVALID_OPTIONS'});
    assert.throws(() => math.maximumPayoutMinor({gameId:plinko.id,betMinor:'1000',options}), {code:'INVALID_OPTIONS'});
  }
  assert.equal(plinko.maximumMultiplierBps,10000*10000);
  assert.equal(math.maximumPayoutMinor({gameId:plinko.id,betMinor:'100'}),'1000000');
  assert.ok(BigInt(plinko.nominalReturn.numerator)<BigInt(plinko.nominalReturn.denominator));
  const counts={pink:0,orange:0,fire:0};
  for(let ticket=0;ticket<1000;ticket++) {
    const round=math.startRound({gameId:plinko.id,betMinor:'100',rng:bound=>bound===1000?ticket:0});
    counts[round.outcome.ballType]++;
  }
  assert.deepEqual(counts,{pink:995,orange:4,fire:1});
  const choose=(n,k)=>{let v=1n;for(let j=1;j<=k;j++)v=v*BigInt(n-j+1)/BigInt(j);return v;};
  const pathAwards=plinko.bucketMultipliersBps.reduce((sum,bps,i)=>sum+BigInt(bps)*choose(16,i),0n);
  assert.equal(pathAwards*1025n*BigInt(plinko.nominalReturn.denominator),
    BigInt(plinko.nominalReturn.numerator)*65536n*10000n*1000n);
});

test('additional public three-reel geometry and fixed line counts reach the actual evaluator',()=>{
  for(const name of ['multihot5deluxe','safarisimba','habeshafortune5','baoslot5x']) {
    const d=definition(name);assert.equal(d.rows,3);assert.equal(d.cols,3);
    assert.equal(d.layout.geometryVerified,true);
    let draws=0;const r=math.startRound({gameId:d.id,betMinor:'100',rng:bound=>{draws++;assert.equal(bound,8);return 0;}});
    assert.equal(draws,9);assert.ok(r.outcome.grid.every(row=>row.length===3));
    assert.ok(r.outcome.lineWins.every(line=>line.matches===3&&line.positions.length===3));
  }
  for(const [name,count] of [['poweroftiger',5],['gemscrownchargingwilds',5],['burningice',5],['junglesistersdeluxe',20],['sugarfiesta',3]]) {
    const d=definition(name);assert.equal(d.paylines.length,count);assert.equal(d.layout.paylineCountVerified,true);
    assert.equal(d.layout.paylinesVerified,false);
  }
});
