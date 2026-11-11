import test from 'node:test';
import assert from 'node:assert/strict';
import {listGameDefinitions,startRound,advanceRound,collectRound,publicRound,maximumPayoutMinor,reconcileRound,getGameDefinition} from './index.mjs';
const games=listGameDefinitions();
for(const d of games){
 test(`${d.catalogName}: generic contract completes a bounded server-only round`,()=>{
  const options=d.family==='dice'?{target:50}:{};const betMinor=d.limits.minBetMinor;
  let round=startRound({gameId:d.id,betMinor,options,rng:()=>0,now:1000});
  const cap=BigInt(maximumPayoutMinor({gameId:d.id,betMinor,options}));
  const before=JSON.stringify(round);let view=publicRound(round,1000);
  assert.equal(view.private,undefined);assert.equal(view.betMinor,betMinor);
  assert.ok(!JSON.stringify(view).includes('survival'));assert.ok(!JSON.stringify(view).includes('bustMultiplierBps'));
  assert.equal(JSON.stringify(round),before);
  if(d.family==='mines'){round=advanceRound(round,{cell:d.mines},1000);round=collectRound(round,{},1000);}
  else if(round.status==='active')round=collectRound(round,{},d.family==='crash'?2000:1000);
  assert.ok(['lost','collected'].includes(round.status));assert.ok(BigInt(round.winMinor)<=cap);
  assert.equal(typeof round.winMinor,'string');assert.equal(typeof round.betMinor,'string');
  assert.doesNotThrow(()=>JSON.stringify(round));view=publicRound(round,2000);assert.equal(view.private,undefined);
  assert.throws(()=>collectRound(round,{},2000),{code:'ROUND_FINISHED'});
 });
}
test('registry metadata cannot mutate payout configuration',()=>{const d=getGameDefinition('ind74_multihot20');d.symbols[0].pays[5]=999999999;assert.notEqual(getGameDefinition(d.id).symbols[0].pays[5],999999999);});
test('generic game choices cannot include client financial fields or unsupported modes',()=>{assert.throws(()=>startRound({gameId:'ind74_popx',betMinor:'10',options:{winMinor:'999999'}}),{code:'INVALID_OPTIONS'});const singleMode=games.find(g=>g.family==='ladder'&&g.id!=='ind74_mineisland2');assert.throws(()=>startRound({gameId:singleMode.id,betMinor:'10',options:{mode:'hard'}}),{code:'INVALID_MODE'});});
test('reconciliation changes only expired timed rounds, never advances a revealed-island game',()=>{
 const mine=startRound({gameId:'ind74_mineisland2',betMinor:'10',rng:()=>0,now:1000});assert.equal(reconcileRound(mine,1000000),mine);
 const crash=startRound({gameId:'ind74_popx',betMinor:'10',rng:()=>499999,now:1000});assert.equal(reconcileRound(crash,1000),crash);const finished=reconcileRound(crash,1000000);assert.equal(finished.status,'lost');assert.equal(crash.status,'active');
});
