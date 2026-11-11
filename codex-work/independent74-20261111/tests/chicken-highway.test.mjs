import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as math from '../math/official72.mjs';
import {CHICKEN_HIGHWAY_ID as id} from '../math/chicken-highway.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineMarkup} from '../client/machine74-renderer.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../reports/current74-evidence-nonslots/ind74_official_chickenhighway-display-tables.json',import.meta.url)));
const d=math.getGameDefinition(id);
test('Chicken Highway uses the exact public three-mode road display tables, not an invented ten-lane route',()=>{
  assert.equal(d.mathVersion,'official72-chickenhighway-r4');
  assert.deepEqual(d.modes,['easy','medium','hard']);
  for(const table of d.paytable) {
    const expected=source.sourceBackedDisplayTables[table.mode].map(v=>{const[w,f]=v.split('.');return Number(BigInt(w)*10000n+BigInt(f)*100n);});
    assert.deepEqual(table.rows.map(r=>r.multiplierBps),expected);
    assert.equal(table.rows.length,source.laneCounts[table.mode]);
    const markup=machineMarkup(publicLibrary74Definition(d),null,{selectedOptions:{mode:table.mode}});
    assert.match(markup,new RegExp('data-total-lanes="'+expected.length+'"'));
  }
  assert.equal(d.paytable[0].rows[7].multiplierBps,15500,'The earlier visual reading1.54 was incorrect.');
  assert.equal(d.maximumMultiplierBps,100000000);
  assert.equal(d.layout.stepCountVerified,true);assert.equal(d.layout.stepCountScope,'default-easy');
  assert.deepEqual(d.layout.modeStepCounts,{easy:25,medium:23,hard:19});
  assert.equal(d.nominalReturn.verified,false);assert.match(d.rules.join(' '),/not recovered provider probabilities/);
});
for(const table of d.paytable) {
 test(table.mode+' first crossing, collection, collision and future-state privacy follow confirmed server progression',()=>{
   const options={mode:table.mode},round=math.startRound({gameId:id,betMinor:'100',options,rng:()=>0});
   assert.equal(round.step,1);assert.equal(round.mode,table.mode);assert.equal(round.maxSteps,table.rows.length);
   const view=math.publicRound(round);assert.equal(view.collectibleMinor,String(table.rows[0].multiplierBps/100));
   assert.equal(view.nextMultiplierBps,table.rows[1].multiplierBps);assert.equal(view.private,undefined);
   assert(!JSON.stringify(view).includes('survival'));
   const collected=math.collectRound(round);assert.equal(collected.winMinor,view.collectibleMinor);
   assert.equal(collected.status,'collected');assert.throws(()=>math.collectRound(collected),{code:'ROUND_FINISHED'});
   const lost=math.startRound({gameId:id,betMinor:'100',options,rng:n=>n-1});assert.equal(lost.status,'lost');assert.equal(lost.winMinor,'0');
   let calls=0;const firstOnly=math.startRound({gameId:id,betMinor:'100',options,rng:n=>calls++===0?0:n-1});
   const collision=math.advanceRound(firstOnly);assert.equal(collision.status,'lost');assert.equal(collision.winMinor,'0');assert.equal(collision.step,2);
 });
 test(table.mode+' terminal payout and exact reserve work above40000ETB and at the storage-derived ceiling',()=>{
   for(const betMinor of ['100','2000','4000100',d.limits.maxBetMinor]) {
     const options={mode:table.mode};let round=math.startRound({gameId:id,betMinor,options,rng:()=>0});
     while(round.status==='active')round=math.advanceRound(round);
     assert.equal(round.step,table.rows.length);assert.equal(round.status,'collected');
     const expected=BigInt(betMinor)*BigInt(table.rows.at(-1).multiplierBps)/10000n;
     assert.equal(round.winMinor,expected.toString());
     assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor,options}));
     assert(expected<=999999999999999n);assert.equal(math.publicRound(round).winMinor,round.winMinor);
   }
 });
}
test('unsupported mode and changed stored mode cannot change a previously accepted route',()=>{
  assert.throws(()=>math.startRound({gameId:id,betMinor:'100',options:{mode:'extreme'},rng:()=>0}),{code:'INVALID_MODE'});
  const round=math.startRound({gameId:id,betMinor:'100',options:{mode:'easy'},rng:()=>0});
  assert.throws(()=>math.publicRound({...round,mode:'hard'}),{code:'INVALID_ROUND'});
});
