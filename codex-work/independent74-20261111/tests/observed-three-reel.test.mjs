import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as math from '../math/official72.mjs';
import {MULTI_HOT_WAYS_ID,CHARGING_THREE_IDS} from '../math/observed-three-reel.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineGeometry,machineMarkup} from '../client/machine74-renderer.mjs';

const observations=JSON.parse(fs.readFileSync(new URL('./evidence/official-demo-observations-slots20-remaining.json',import.meta.url))).observations;
const help=JSON.parse(fs.readFileSync(new URL('../references/official-slot-help-en-20261111.json',import.meta.url))).captions;
test('three corrected geometries follow completed result records and exact title Help, not a similarly named game',()=>{
  for(const id of [MULTI_HOT_WAYS_ID,...CHARGING_THREE_IDS]) {
    const d=math.getGameDefinition(id),o=observations.find(o=>o.gameId===id),view=publicLibrary74Definition(d);
    assert.equal(o.verifiedCompletedRounds,20);assert.equal(o.geometry.resultLengthCrossCheck,true);
    assert.equal(o.geometry.reels,3);assert.equal(o.geometry.rows,3);
    assert.deepEqual(machineGeometry(view),{rows:3,columns:3});
    assert(d.paylines.every(line=>line.length===3));
    assert.equal(d.layout.geometryVerified,true);
    if(id===MULTI_HOT_WAYS_ID) {
      assert.match(help['help.slots.multihotways.doubleDIv.description'],/27 Reel Ways Pay/);
      assert.equal(view.ways,27);assert.equal(view.paylines,undefined);
      assert.match(machineMarkup(view),/27 WAYS/);assert.equal(d.wildSymbol,undefined);
      assert.equal(d.layout.waysCountVerified,true);
      assert.match(d.rules.join(' '),/extra feature remains unimplemented/);
    } else {
      const ns=id.replace('ind74_official_','');
      assert.match(help['help.slots.'+ns+'.payline.chart'],/5 fixed active paylines/);
      assert.equal(d.layout.paylineCountVerified,true);
      assert.equal(view.paylines.length,5);assert.match(machineMarkup(view),/5 LINES/);
      assert.equal(d.wildSymbol,undefined,'Do not pretend a regular fallback carries paid-spin Wild state.');
      assert.match(d.rules.join(' '),/Documented but NOT implemented/);
      assert.match(d.rules.join(' '),/atomically/);
    }
  }
});

function rngFor(grid,wheel=0) {let cell=0;return bound=>cell<9?grid[Math.floor(cell/3)][cell++%3]:wheel;}
test('regular Multi Hot Ways pays six positional combinations and applies the selected left reel once',()=>{
  const id=MULTI_HOT_WAYS_ID,d=math.getGameDefinition(id);
  // Per reel: [A,B,C] [A,A,D] [A,A,A] => 1*2*3 winning ways.
  const round=math.startRound({gameId:id,betMinor:'2000',rng:rngFor([[0,0,0],[1,0,0],[2,3,0]],3)});
  const perWay=2000n*BigInt(d.symbols[0].pays[3])/27n;
  assert.equal(round.outcome.ways,27);assert.equal(round.outcome.winningWaysCount,6);
  assert.equal(round.outcome.reelMultiplier,4);
  assert.equal(round.winMinor,(perWay*6n*4n).toString());
  assert.equal(round.status,'collected');
  assert.equal(math.publicRound(round).winMinor,round.winMinor);
});

test('3×3 high awards remain bounded exactly at normal, large and storage-derived stakes',()=>{
  for(const id of [MULTI_HOT_WAYS_ID,...CHARGING_THREE_IDS]) {
    const d=math.getGameDefinition(id),best=d.symbols.reduce((idx,s,i)=>s.pays[3]>d.symbols[idx].pays[3]?i:idx,0);
    const grid=Array.from({length:3},()=>Array(3).fill(best));
    for(const betMinor of ['100','2000','5000000',d.limits.maxBetMinor]) {
      const round=math.startRound({gameId:id,betMinor,rng:rngFor(grid,id===MULTI_HOT_WAYS_ID?4:0)});
      assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor}));
      assert(BigInt(round.winMinor)<=999999999999999n);
      assert.equal(round.outcome.grid.length,3);assert(round.outcome.grid.every(row=>row.length===3));
      assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});
    }
  }
});
