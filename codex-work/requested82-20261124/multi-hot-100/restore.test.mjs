import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiHot100Controls,MULTI_HOT_100_GAME_ID as gameId} from './controls.mjs';
import {MultiHot100Presentation} from './presentation.mjs';
const policy=balance=>({gameId,backendGameId:'multihot100_native',currency:'ETB',serverAuthoritative:true,balance,betLevels:['1.00','2.00'],
  mathVersion:'isolated-restoration-fixture',engineVersion:'isolated-restoration-fixture',mathSha256:'a'.repeat(64)});
const controls=balance=>new MultiHot100Controls({currency:'ETB',betLevels:['1.00','2.00'],hostPolicy:policy(balance)});
const view=(collected=false)=>({gameId,currency:'ETB',requestKey:'read-only-round-0001',roundId:'read-only-round-0001',bet:'1.00',winAmount:'0.40',
  balance:collected?'20.40':'20.00',grid:Array.from({length:4},()=>['lemon','plum','orange','seven','bell']),multiplier:2,
  collected,readOnlyRestoration:true});
test('read-only existing win restores for presentation and TAKE without generating a spin',()=>{
  const c=controls('20.00'),source=view(),accepted=c.restoreHostRound(source),p=new MultiHot100Presentation({initialView:source});
  assert.equal(c.snapshot().phase,'WIN_PENDING');assert.equal(c.snapshot().pendingWin,'0.40');assert.equal(c.snapshot().pending,null);
  assert.deepEqual(p.snapshot().receipt.grid,accepted.grid);assert.equal(p.snapshot().moving,false);
  const intent=c.requestTakeWin('new-collection-0001').intents[0];assert.equal(intent.roundId,source.roundId);assert.equal(intent.currency,'ETB');
  c.applyTakeAcknowledgement({...intent,collected:true,collectedAmount:'0.40',balance:'20.40'});
  assert.equal(c.snapshot().phase,'IDLE');assert.equal(c.snapshot().pendingWin,'0.00');
});
test('already collected server state never exposes another TAKE or duplicate credit',()=>{
  const c=controls('20.40');c.restoreHostRound(view(true));assert.equal(c.snapshot().phase,'IDLE');assert.equal(c.requestTakeWin('new-collection-0002').accepted,false);
  assert.equal(c.snapshot().balance,'20.40');assert.equal(c.requestSpin('read-only-round-0001').accepted,false);
});
test('foreign or unconfirmed restoration rejects atomically and cannot replace pending work',()=>{
  const c=controls('20.00');
  for(const change of [{currency:'DMO'},{balance:'999.00'},{readOnlyRestoration:false},{collected:undefined}]){
    assert.throws(()=>c.restoreHostRound({...view(),...change}));assert.equal(c.snapshot().round,null);assert.equal(c.snapshot().balance,'20.00');
  }
  const intent=c.requestSpin('original-pending-0001').intents[0];assert.throws(()=>c.restoreHostRound(view()),/RESTORE_UNAVAILABLE/);
  assert.deepEqual(c.snapshot().pending,intent);
});
