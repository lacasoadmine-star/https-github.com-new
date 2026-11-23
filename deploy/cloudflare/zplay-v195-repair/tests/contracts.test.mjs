import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateRound,SpinLifecycle} from '../slots/js/round-contract.mjs';
import {cruising,landing,sample} from '../slots/js/reel-motion.mjs';
const models=JSON.parse(fs.readFileSync(new URL('../slots/catalog.json',import.meta.url))).games;
const result=m=>({roundId:'test-round',gameId:m.id,bet:'2.00',balanceAfter:'98.00',finalWin:'0.0000',wheelMultiplier:m.wheel.values[0],grid:Array.from({length:m.rows},(_,r)=>m.previewReels.map(s=>s[r])),winLines:[]});
test('500 responses across the five current engine contracts are valid; malformed results fail closed',()=>{
 for(const m of models)for(let i=0;i<100;i++)assert.equal(validateRound(result(m),m,'2.00').gameId,m.id);
 const m=models[0];for(const patch of [{bet:'5.00'},{gameId:'wrong'},{roundId:''},{balanceAfter:'NaN'},{finalWin:-1},{wheelMultiplier:99},{grid:[['wrong']]},{winLines:[{positions:[[9,9]]}]}])assert.throws(()=>validateRound({...result(m),...patch},m,'2.00'),/UNVERIFIED/);
});
test('pending requests preserve their lifecycle and cannot become a second new wager',()=>{
 const l=new SpinLifecycle();l.move('REQUESTING');assert.throws(()=>l.move('REQUESTING'));
 l.move('RETRYABLE_PENDING');assert.throws(()=>l.move('IDLE'));l.move('REQUESTING');
 for(const state of ['SPINNING','STOPPING','REVEALING','WIN_PRESENTATION','SETTLED','IDLE'])l.move(state);
 assert.equal(l.state,'IDLE');
});
test('acceleration and stopping positions are continuous, monotone and land on exact symbol boundaries',()=>{
 for(const ms of [0,100,180,250,750,2000,25000])for(const duration of [180,760,1200]){
  const m=cruising(ms,12,180),p=landing(m.position,m.velocity,ms,duration);let prev=m.position;
  assert.equal(sample(p,ms).position,m.position);
  for(let t=0;t<=duration;t+=1){const x=sample(p,ms+t).position;assert.ok(x>=prev-1e-8);prev=x;}
  assert.equal(sample(p,ms+duration).position,p.to);assert.ok(Number.isInteger(p.to));
  const halfway=sample(p,ms+duration/2),stopped=landing(halfway.position,halfway.velocity,ms+duration/2,100,p.to);
  assert.equal(sample(stopped,stopped.start).position,halfway.position);assert.equal(sample(stopped,stopped.start+100).position,p.to);
 }
});
