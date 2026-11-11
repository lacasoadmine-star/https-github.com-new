import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {evaluatePublicWildGrid} from '../math/official72-mechanics.mjs';
import {PUBLIC_EXPANDING_WILD_IDS, configurePublicSlotFeatures} from '../math/public-slot-features.mjs';

function gridRng(definition, grid, wheelIndex = 0) {
  let cell = 0;
  return bound => {
    if (cell === definition.rows * definition.cols) {
      cell++;
      assert.equal(bound, definition.multiplierValues.length);
      return wheelIndex;
    }
    const id = grid[Math.floor(cell / definition.cols)][cell++ % definition.cols];
    const symbol = definition.symbols.findIndex(candidate => candidate.id === id);
    return symbol >= 0 ? symbol : definition.symbols.length * 32;
  };
}

for (const gameId of PUBLIC_EXPANDING_WILD_IDS) {
  test(gameId + ' expands only participating wild columns and retains independent-source disclosures', () => {
    const d = math.getGameDefinition(gameId), symbol = d.symbols[0].id, wild = d.wildSymbol.id;
    assert.equal(d.mathVersion.endsWith(gameId==='ind74_official_coinsofatlantis'?'-r4':'-r3'), true);
    assert.deepEqual(d.wildRule.columns, [1,2,3]);
    assert.equal(d.wildRule.providerProbabilitiesVerified, false);
    assert.equal(d.nominalReturn.verified, false);
    assert.equal(d.nominalReturn.numerator, undefined, 'A regular-only return must not survive the new wild model.');
    assert.match(d.rules.join(' '), /operator choices/);
    for (const column of [1,2,3]) {
      const grid = Array.from({length:d.rows}, () => Array(d.cols).fill(symbol));
      grid[d.paylines[0][column]][column] = wild;
      const before = structuredClone(grid);
      const round = math.startRound({gameId,betMinor:'2000',rng:gridRng(d,grid)});
      assert.deepEqual(round.outcome.expandedColumns,[column]);
      assert.ok(round.outcome.grid.every(row => row[column] === wild));
      assert.deepEqual(round.outcome.originalGrid,before);
      assert.deepEqual(grid,before);
      const nonparticipating = Array.from({length:d.rows},(_,row)=>Array.from({length:d.cols},(_,col)=>d.symbols[(col+row*2)%d.symbols.length].id));
      nonparticipating[0][3] = wild;
      const lost = math.startRound({gameId,betMinor:'100',rng:gridRng(d,nonparticipating)});
      assert.equal(lost.status,'lost');
      assert.deepEqual(lost.outcome.expandedColumns,[]);
      assert.equal(lost.outcome.grid[0][3],wild);
      assert.notEqual(lost.outcome.grid[1][3],wild);
    }
    for (const column of [0,4]) {
      const invalid = Array.from({length:d.rows},()=>Array(d.cols).fill(symbol));
      invalid[0][column] = wild;
      assert.throws(()=>evaluatePublicWildGrid(d,'100',invalid),{code:'INVALID_GRID'});
    }
  });

  test(gameId + ' exact wild awards include the entire multiplier and remain within the reserved bound', () => {
    const d = math.getGameDefinition(gameId);
    const best = d.symbols.reduce((a,b)=>a.pays[5]>b.pays[5]?a:b);
    for (const betMinor of ['100','2000','5000000']) {
      const grid = Array.from({length:d.rows},()=>Array.from({length:d.cols},(_,col)=>d.wildRule.columns.includes(col)?d.wildSymbol.id:best.id));
    const wheelIndex = (d.multiplierValues??[1]).length-1, wheel = (d.multiplierValues??[1])[wheelIndex];
      const round = math.startRound({gameId,betMinor,rng:gridRng(d,grid,wheelIndex)});
      const expected = BigInt(d.paylines.length)*(BigInt(betMinor)*BigInt(best.pays[5])/BigInt(d.paylines.length))*BigInt(wheel);
      assert.equal(round.winMinor,expected.toString());
      if(gameId==='ind74_official_coinsofatlantis')assert.ok(BigInt(round.winMinor)<=BigInt(math.maximumPayoutMinor({gameId,betMinor})));
      else {assert.equal(round.winMinor,math.maximumPayoutMinor({gameId,betMinor}));assert.equal(round.outcome.reelMultiplier,wheel);}
      assert.equal(round.status,'collected');
      assert.deepEqual(math.publicRound(round).allowedActions,[]);
      assert.ok(expected<=BigInt(d.limits.maxWinMinor));
      assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});
      assert.throws(()=>math.advanceRound(round),{code:'ROUND_FINISHED'});
    }
    assert.ok(BigInt(math.maximumPayoutMinor({gameId,betMinor:d.limits.maxBetMinor}))<=999999999999999n);
  });
}

test('expanding-wild feature configuration excludes unrelated and protected game IDs', () => {
  assert.equal(PUBLIC_EXPANDING_WILD_IDS.length,3);
  for(const id of ['ind74_official_multihot5','ind74_official_foxyhot20','ind74_official_samurai']) {
    assert.throws(()=>configurePublicSlotFeatures({id,family:'slots',cols:5,symbols:[],paylines:[]}));
  }
});
