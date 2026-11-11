import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {configureObservedWildWays,OBSERVED_WILD_WAYS_ID as id} from '../math/ways-slot.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineMarkup,machineGeometry} from '../client/machine74-renderer.mjs';

function gridRng(d,grid,wheelIndex=0) {
  let cell=0;
  return bound=>{
    if(cell===9){cell++;assert.equal(bound,5);return wheelIndex;}
    const value=grid[Math.floor(cell/3)][cell++%3];
    const index=d.symbols.findIndex(symbol=>symbol.id===value);
    return index>=0?index:d.symbols.length*32;
  };
}

test('observed Wild Ways exposes3×3 and27ways without a fabricated fixed-payline chart',()=>{
  const d=math.getGameDefinition(id),view=publicLibrary74Definition(d);
  assert.equal(d.mathVersion,'official72-multihotwildways-r3');
  assert.equal(d.rows,3);assert.equal(d.cols,3);assert.equal(d.ways,27);
  assert.equal(d.paylines.length,27,'Internal paths enumerate every row combination.');
  assert.equal(new Set(d.paylines.map(path=>path.join(','))).size,27);
  assert.equal(d.layout.waysCountVerified,true);
  assert.equal(d.layout.paylines,null);
  assert.equal(d.layout.paylineCountVerified,false);
  assert.equal(d.layout.multiplier.placement,'left-reel');
  assert.deepEqual(d.layout.multiplier.observedValues,[1,2,3,4,5]);
  assert.equal(view.ways,27);assert.equal(view.paylines,undefined);
  assert.deepEqual(machineGeometry(view),{rows:3,columns:3});
  const markup=machineMarkup(view);
  assert.match(markup,/27 WAYS/);
  assert.doesNotMatch(markup,/27 LINES/);
  assert.equal(d.nominalReturn.verified,false);
  assert.match(d.rules.join(' '),/operator choices/);
});

test('ways count multiplies matching row choices from all three consecutive reels, including wild substitution',()=>{
  const d=math.getGameDefinition(id),[a,b,c,e]=d.symbols.map(symbol=>symbol.id);
  // By reel: [A,B,C], [A,A,D], [A,A,A] =>1×2×3=6 winning ways.
  for(const center of [a,d.wildSymbol.id]) {
    const grid=[[a,a,a],[b,center,a],[c,e,a]];
    const round=math.startRound({gameId:id,betMinor:'100',rng:gridRng(d,grid)});
    const perWay=100n*BigInt(d.symbols[0].pays[3])/27n;
    assert.equal(round.outcome.winningWaysCount,6);
    assert.equal(round.outcome.lineWins.length,6);
    assert.equal(round.winMinor,(6n*perWay).toString());
    assert.equal(round.outcome.ways,27);
    assert.deepEqual(round.outcome.expandedColumns,[]);
  }
  const noMatch=[[a,b,a],[b,c,a],[c,e,a]];
  const lost=math.startRound({gameId:id,betMinor:'100',rng:gridRng(d,noMatch)});
  assert.equal(lost.winMinor,'0');
  assert.equal(lost.outcome.winningWaysCount,0);
});

test('all-wild ways pay one highest award per path, apply one multiplier and settle within the exact reserve',()=>{
  const d=math.getGameDefinition(id),grid=Array.from({length:3},()=>Array(3).fill(d.wildSymbol.id));
  const greatest=Math.max(...d.symbols.map(symbol=>symbol.pays[3]));
  for(const betMinor of ['100','2000','5000000']) {
    const round=math.startRound({gameId:id,betMinor,rng:gridRng(d,grid,4)});
    assert.equal(round.outcome.winningWaysCount,27);
    const expected=27n*(BigInt(betMinor)*BigInt(greatest)/27n)*5n;
    assert.equal(round.winMinor,expected.toString());
    assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor}));
    assert.equal(round.status,'collected');
    assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});
  }
  assert.ok(BigInt(math.maximumPayoutMinor({gameId:id,betMinor:d.limits.maxBetMinor}))<=999999999999999n);
});

test('all other71 definitions keep their geometry and fixed charts outside the ways configuration',()=>{
  let checked=0;
  for(const d of math.listGameDefinitions().filter(d=>d.id!==id)) {
    const copy=structuredClone(d);
    assert.throws(()=>configureObservedWildWays(copy));
    assert.deepEqual(copy,d,'Rejecting unrelated IDs must not mutate them.');
    const view=publicLibrary74Definition(d);
    assert.equal(view.ways,undefined);
    if(d.family==='slots')assert.deepEqual(view.paylines,d.paylines);
    checked++;
  }
  assert.equal(checked,71);
});
