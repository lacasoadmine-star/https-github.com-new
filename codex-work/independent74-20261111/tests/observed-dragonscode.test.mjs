import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineGeometry,machineMarkup} from '../client/machine74-renderer.mjs';
const id='ind74_official_dragonscode',d=math.getGameDefinition(id);
test('Dragon geometry follows its observed20 cells and exact title Help50-payline statement',()=>{
 const help=JSON.parse(fs.readFileSync(new URL('../reports/current74-evidence-slots-secondary/ind74_official_dragonscode-official-help-en.json',import.meta.url)));
 assert.match(help.captions['help.slots.dragonscode.multiplier.reel.description.second'],/50-payline/);
 assert.equal(d.mathVersion,'official72-dragonscode-r3');assert.equal(d.rows,4);assert.equal(d.cols,5);assert.equal(d.paylines.length,50);
 assert.equal(d.layout.geometryVerified,true);assert.equal(d.layout.paylineCountVerified,true);assert.equal(d.layout.paylinesVerified,false);
 assert(d.paylines.some(line=>line.every(row=>row===3)),'The fourth row must participate in actual awards.');
 const view=publicLibrary74Definition(d);assert.deepEqual(machineGeometry(view),{rows:4,columns:5});
 assert.equal([...machineMarkup(view).matchAll(/data-symbol=/g)].length,20);assert.match(d.rules.join(' '),/not implemented/);
});
test('Dragon fourth-row winners and all50-line maximum settle with exact bounded money',()=>{
 const best=d.symbols.reduce((idx,s,i)=>s.pays[5]>d.symbols[idx].pays[5]?i:idx,0),grid=Array.from({length:4},(_,row)=>Array.from({length:5},(_,col)=>row===3?best:(row+col+1)%8));
 let call=0;const bottom=math.startRound({gameId:id,betMinor:'2000',rng:()=>grid[Math.floor(call/5)][call++%5]});
 assert(bottom.outcome.lineWins.some(line=>line.payline.every(row=>row===3)));
 for(const betMinor of ['100','2000','4000100',d.limits.maxBetMinor]){
  const round=math.startRound({gameId:id,betMinor,rng:()=>best});assert.equal(round.outcome.grid.length,4);assert(round.outcome.grid.every(row=>row.length===5));
  assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor}));assert(BigInt(round.winMinor)<=999999999999999n);assert.equal(math.publicRound(round).winMinor,round.winMinor);
 }
});
