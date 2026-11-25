import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiHot20Controls} from './controls.mjs';
import {MultiHot20Controller} from './controller.mjs';
import {createNativeSceneRenderer} from './native-scene-adapter.mjs';
import {createHostPresentation} from '../../new-games90-20261123/m20/host-presentation.mjs';
import {PAYLINES} from '../../new-games90-20261123/m20/presentation-quote.mjs';

const gameId='zplay72_multi_hot_20_v1', roundId='7876466b-7df6-4b9d-aaf5-f228f37db15d';
const model={id:'fresh_multihot20',currency:'ETB',reels:5,rows:3,paylines:20,foundationBet:1,maxWinMultiplier:1000,
  symbols:['seven','bell','grape','watermelon','lemon','plum','orange','cherry'],multiplierValues:[1,2,3,4,5],
  betLevels:['1.00'],mathVersion:'isolated-fixture',engineVersion:'isolated-fixture',mathSha256:'b'.repeat(64)};
const grid=[['bell','bell','watermelon','lemon','bell'],['bell','orange','bell','bell','watermelon'],['seven','orange','bell','bell','watermelon']];
function view(intent) {
  const action={...model,gameId:model.id,roundToken:intent.requestKey,bet:intent.bet};
  return createHostPresentation({gameId:model.id,roundId,currency:'ETB',bet:'1.00',isFree:false,grid,wheelMultiplier:5,
    winLines:[{line:6,symbol:'bell',count:4,positions:PAYLINES[5].slice(0,4).map((r,c)=>[r,c]),baseWin:'5.00'},
      {line:18,symbol:'bell',count:3,positions:PAYLINES[17].slice(0,3).map((r,c)=>[r,c]),baseWin:'1.00'}],
    baseWin:'6.00',finalWin:'30.00',maxWinCapped:false,mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256,
    walletReceipt:{currency:'ETB',balanceBefore:'100.00',chargedStake:'1.00',finalWin:'30.00',balanceAfter:'129.00'}},{model,action});
}
function setup({settle,acceptThrows=false,onChange,onError}={}) {
  const calls=[],errors=[],sceneCalls=[];let drawFails=0;
  const ctx=new Proxy({globalAlpha:1},{get:(o,key)=>key in o?o[key]:key==='drawImage'?()=>{if(drawFails-->0)throw Error('fixture draw failed');}:()=>{}});
  const doc={createElement(){return {width:600,height:600,getContext:()=>ctx};}},win={performance:{now:()=>0}};
  class Scene {inspect(){return {}}start(){sceneCalls.push('start')}settle(raw){sceneCalls.push('settle');return settle?settle(raw):Promise.resolve();}
    reset(){sceneCalls.push('reset')}restore(raw){sceneCalls.push(['restore',raw.roundId])}speedUp(){return true}dismissResultPresentation(){}dispose(){}}
  const native=createNativeSceneRenderer({canvas:doc.createElement(),document:doc,window:win,Scene,
    resources:{manifest:{symbols:model.symbols},images:{__background:{width:1363,height:766},__title:{width:633,height:152}}}});
  const renderer=acceptThrows?{...native,accept(){throw Error('fixture accept failed')}}:native;
  const controls=new MultiHot20Controls({bet:'1.00',betLevels:['1.00'],roundIntentsEnabled:true,serverAuthoritative:true});
  const transport={submit:async intent=>{calls.push({...intent});return intent.action==='SPIN'?view(intent):{...intent,collected:true,amount:'30.00',balance:'129.00'};},
    recover:async intent=>{calls.push({recovered:true,...intent});throw Error('Unexpected financial recovery');}};
  const controller=new MultiHot20Controller({controls,renderer,transport,keyFactory:()=>crypto.randomUUID(),now:()=>0,
    onChange,onError:error=>{errors.push(error);onError?.(error);}});
  return {controller,controls,renderer,calls,errors,sceneCalls,failDraw(count=1){drawFails=count}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('accepted SPIN recovers a synchronous presentation failure locally without another server operation',async()=>{
  const f=setup({acceptThrows:true});assert.equal(await f.controller.spin(),false);
  const accepted=f.controls.snapshot().round;
  assert.equal(f.controls.snapshot().phase,'RECOVERY_REQUIRED');assert.equal(f.controls.snapshot().pending,null);
  assert.equal(await f.controller.recover(),true);assert.equal(f.controls.snapshot().phase,'WIN_PENDING');
  assert.deepEqual(f.controls.snapshot().round,accepted);assert.equal(f.controls.snapshot().balance,'129.00');
  assert.equal(f.calls.length,1);assert.equal(await f.controller.recover(),false);
  assert.equal(await f.controller.take(),true);assert.equal(f.calls.length,2);assert.equal(f.calls[1].action,'TAKE');
  assert.equal(f.controls.snapshot().balance,'129.00');
});
test('a rejected asynchronous native settle is caught and restores exactly the already accepted win',async()=>{
  const f=setup({settle:()=>Promise.reject(Error('fixture settle failed'))});assert.equal(await f.controller.spin(),true);
  await tick();assert.equal(f.renderer.snapshot().phase,'ERROR');f.controller.frame(100);
  assert.equal(f.controls.snapshot().phase,'RECOVERY_REQUIRED');assert.equal(f.errors.length,1);
  for(let n=0;n<5;n++)f.controller.frame(200+n);assert.equal(f.errors.length,1);
  assert.equal(await f.controller.recover(),true);assert.equal(f.controls.currentWin(),'30.00');
  assert.equal(f.calls.length,1);assert.equal(f.renderer.snapshot().grid.length,3);
  assert.equal(f.sceneCalls.filter(x=>x==='start').length,1);assert.equal(f.sceneCalls.filter(x=>x==='settle').length,1);
});
test('a failed static draw remains locally recoverable on a second attempt',async()=>{
  const f=setup({acceptThrows:true});await f.controller.spin();f.failDraw();
  assert.equal(await f.controller.recover(),false);assert.equal(f.controls.snapshot().phase,'RECOVERY_REQUIRED');
  assert.equal(await f.controller.recover(),true);assert.equal(f.calls.length,1);
  assert.equal(f.controls.snapshot().phase,'WIN_PENDING');
});
test('frame draw failures cancel AUTO and retain the accepted receipt until explicit local recovery',async()=>{
  let neverResolve;
  const f=setup({settle:()=>new Promise(resolve=>{neverResolve=resolve})});
  await f.controller.spin();await tick();f.failDraw();f.controller.frame(100);
  assert.equal(f.controls.snapshot().phase,'RECOVERY_REQUIRED');assert.equal(await f.controller.spin(),false);
  assert.equal(await f.controller.recover(),true);neverResolve();await tick();
  assert.equal(f.renderer.snapshot().phase,'IDLE');assert.equal(f.controls.snapshot().phase,'WIN_PENDING');assert.equal(f.calls.length,1);
});
test('hidden or disposed local recovery cannot draw, submit or replace an accepted receipt',async()=>{
  const f=setup({acceptThrows:true});await f.controller.spin();f.controller.setHidden(true);
  assert.equal(await f.controller.recover(),false);f.controller.setHidden(false);f.controller.dispose();
  assert.equal(await f.controller.recover(),false);assert.equal(f.calls.length,1);assert.equal(f.controls.snapshot().phase,'RECOVERY_REQUIRED');
});
test('conflicting static recovery cannot introduce another round or modify the accepted grid',async()=>{
  const f=setup({acceptThrows:true});await f.controller.spin();const accepted=f.controls.acceptedPresentationRecovery();
  assert.throws(()=>f.controls.markPresentationUncertain({...accepted,roundId:crypto.randomUUID()}),/RECEIPT_MISMATCH/);
  assert.throws(()=>f.renderer.restoreAccepted({...accepted,grid:[]}));assert.deepEqual(f.controls.acceptedPresentationRecovery(),accepted);
  assert.equal(await f.controller.recover(),true);assert.equal(f.calls.length,1);
});
test('throwing and reentrant reporting callbacks cannot create another wager during local recovery',async()=>{
  let controller;
  const f=setup({acceptThrows:true,onChange(){if(controller)void controller.spin();throw Error('fixture callback failure')},onError(){throw Error('fixture reporting failure')}});
  controller=f.controller;await f.controller.spin();assert.equal(await f.controller.recover(),true);await tick();
  assert.equal(f.calls.length,1);assert.equal(f.controls.snapshot().phase,'WIN_PENDING');
});
