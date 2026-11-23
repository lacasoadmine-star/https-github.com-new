import test from 'node:test';
import assert from 'node:assert/strict';
import {SuperWildsController,GAME_ID,formatMoney,rendererReceipt} from './controller.mjs';

const grid=()=>[['lemon','plum','orange'],['cherry','orange','bell'],['plum','lemon','cherry'],['orange','cherry','lemon'],['seven','bell','grapes']];
const roundId='11111111-1111-4111-8111-111111111111';
const key=n=>`22222222-2222-4222-8222-${String(n).padStart(12,'0')}`;
function fixture({win=0,dispatch,canPlay=true,stateRound=null,pendingWinMinor=0,storage}={}){
  let n=0;const calls=[],recoveries=[],events=[],journal=new Map();
  const state=()=>({gameId:GAME_ID,currency:'ETB',subject:'qa-player',canPlay,canDouble:false,betLevelsMinor:[10,20,30],betMinor:10,balanceMinor:10000,round:stateRound,pendingWinMinor});
  const receipt=intent=>({gameId:GAME_ID,currency:'ETB',action:intent.action,requestKey:intent.requestKey,roundId,betMinor:intent.betMinor,
    winMinor:win,balanceMinor:9990,multiplier:2,grid:grid(),winningLines:[],pendingWinMinor:win});
  const transport={state:async()=>state(),prepare:intent=>({...intent,authority:{bet:'0.10',mathVersion:'fixture-v1',collectRoundId:intent.collectRoundId}}),
    dispatch:async intent=>{calls.push(structuredClone(intent));return dispatch?dispatch(intent,receipt):receipt(intent);},
    recover:async intent=>{recoveries.push(structuredClone(intent));return receipt(intent);}};
  const renderer={start:x=>events.push(['start',x]),stop:x=>events.push(['stop',x]),acceptReceipt:x=>events.push(['receipt',x])};
  const controller=new SuperWildsController({transport,subject:'qa-player',journalStorage:storage??{getItem:k=>journal.get(k),setItem:(k,v)=>journal.set(k,v),removeItem:k=>journal.delete(k)},
    keyFactory:()=>key(++n),renderer,now:()=>123});
  return {controller,transport,calls,recoveries,events,journal,receipt,state};
}
test('SPIN retains prepared identity and second press only STOPs while response is pending',async()=>{
  let resolve;const f=fixture({dispatch:async(i,r)=>new Promise(done=>{resolve=()=>done(r(i));})});await f.controller.connect();
  const p=f.controller.spin();await Promise.resolve();const journal=JSON.parse([...f.journal.values()][0]);
  assert.equal(journal.intent.authority.mathVersion,'fixture-v1');assert.equal('balanceMinor'in journal,false);
  assert.equal(await f.controller.spin(),false);assert.equal(f.calls.length,1);assert.equal(f.events.filter(e=>e[0]==='stop').length,1);
  resolve();assert.equal(await p,true);assert.equal(f.controller.snapshot().phase,'ANIMATING');assert.equal(f.journal.size,0);
});
test('lost reply recovers exact prepared original payload and request key',async()=>{
  const f=fixture({dispatch:()=>{throw Error('reply lost');}});await f.controller.connect();assert.equal(await f.controller.spin(),false);
  const pending=f.controller.snapshot().pending;assert.equal(f.controller.snapshot().phase,'RECOVERY');
  assert.equal(await f.controller.spin(),false);assert.equal(f.calls.length,1);
  assert.equal(await f.controller.recover(),true);assert.deepEqual(f.recoveries[0],pending);assert.equal(f.controller.snapshot().balanceMinor,9990);
});
test('journal survives reload and recovery never derives a key from current UI',async()=>{
  const f=fixture({dispatch:()=>{throw Error('reply lost');}});await f.controller.connect();await f.controller.spin();
  const pending=f.controller.snapshot().pending;
  const c=new SuperWildsController({transport:f.transport,subject:'qa-player',journalStorage:{getItem:k=>f.journal.get(k),setItem:(k,v)=>f.journal.set(k,v),removeItem:k=>f.journal.delete(k)},keyFactory:()=>key(99)});
  await c.connect();assert.equal(c.snapshot().phase,'RECOVERY');await c.recover();assert.deepEqual(f.recoveries[0],pending);
});
test('storage failure happens before any server request',async()=>{
  const f=fixture({storage:{getItem:()=>null,setItem:()=>{throw Error('storage full');},removeItem:()=>{}}});await f.controller.connect();
  await assert.rejects(f.controller.spin(),/storage full/);assert.equal(f.calls.length,0);assert.equal(f.controller.snapshot().phase,'READY');
});
test('wrong request receipt is rejected while original journal stays recoverable',async()=>{
  const f=fixture({dispatch:(i,r)=>({...r(i),requestKey:key(77)})});await f.controller.connect();await f.controller.spin();
  assert.equal(f.controller.snapshot().phase,'RECOVERY');assert.equal(f.controller.snapshot().balanceMinor,10000);assert.equal(f.journal.size,1);
});
test('TAKE WIN is one request and remains available when new wager model is disabled',async()=>{
  const prior={gameId:GAME_ID,currency:'ETB',requestKey:key(8),roundId,betMinor:10,winMinor:300,balanceMinor:10000,multiplier:1,grid:grid(),pendingWinMinor:300};
  let resolve;const f=fixture({canPlay:false,stateRound:prior,pendingWinMinor:300,dispatch:async i=>new Promise(done=>{resolve=()=>done({gameId:GAME_ID,currency:'ETB',requestKey:i.requestKey,roundId,collected:true,amountMinor:300,balanceMinor:10300});})});
  await f.controller.connect();const p=f.controller.take();await Promise.resolve();assert.equal(await f.controller.take(),false);assert.equal(f.calls.length,1);
  resolve();assert.equal(await p,true);assert.equal(f.controller.snapshot().phase,'READY');assert.equal(f.controller.snapshot().balanceMinor,10300);
});
test('next SPIN binds the previous accepted uncollected win',async()=>{
  const f=fixture({win:40});await f.controller.connect();await f.controller.spin();f.controller.finishPresentation(roundId);
  assert.equal(f.controller.snapshot().phase,'WIN_PENDING');await f.controller.spin();assert.equal(f.calls[1].collectRoundId,roundId);
});
test('presentation does not reopen TAKE on an accepted win already collected by another tab',async()=>{
  const f=fixture({win:30,dispatch:(intent,receipt)=>({...receipt(intent),pendingWinMinor:0,balanceMinor:10020})});
  await f.controller.connect();await f.controller.spin();
  assert.equal(f.controller.finishPresentation(roundId),true);
  assert.equal(f.controller.snapshot().phase,'READY');
  assert.equal(await f.controller.take(),false);
  assert.equal(f.calls.length,1);
});
test('AUTO counts only accepted rounds and stops when its selected win limit is reached',async()=>{
  const f=fixture({win:20});await f.controller.connect();f.controller.configureAuto({count:25,winLimit:20});f.controller.startAuto();
  await f.controller.spin({auto:true});assert.equal(f.controller.snapshot().auto.remaining,24);f.controller.finishPresentation(roundId);
  assert.equal(f.controller.snapshot().auto.active,false);assert.equal(f.controller.snapshot().auto.reason,'LIMIT');
});
test('AUTO balance decrease limit uses authoritative balance and stops',async()=>{
  const f=fixture();await f.controller.connect();f.controller.configureAuto({count:100,decreaseLimit:10});f.controller.startAuto();await f.controller.spin({auto:true});f.controller.finishPresentation(roundId);
  assert.equal(f.controller.snapshot().auto.active,false);assert.equal(f.controller.snapshot().balanceMinor,9990);
});
test('disconnection stops AUTO and preserves original pending action',async()=>{
  let resolve;const f=fixture({dispatch:async(i,r)=>new Promise(done=>{resolve=()=>done(r(i));})});await f.controller.connect();f.controller.configureAuto({count:100});f.controller.startAuto();
  const p=f.controller.spin({auto:true});await Promise.resolve();const action=f.controller.snapshot().pending;f.controller.disconnect();
  assert.equal(f.controller.snapshot().auto.active,false);assert.deepEqual(f.controller.snapshot().pending,action);resolve();await p;assert.equal(f.controller.snapshot().connected,false);
});
test('disabled X2 never creates a financial request',async()=>{const f=fixture({win:20});await f.controller.connect();await f.controller.spin();f.controller.finishPresentation(roundId);assert.equal(await f.controller.double('RED'),false);assert.equal(f.calls.length,1);});
test('snapshot mutation cannot modify accepted result or balance',async()=>{const f=fixture();await f.controller.connect();await f.controller.spin();const s=f.controller.snapshot();s.round.grid[0][0]='seven';s.balanceMinor=999999;assert.equal(f.controller.snapshot().round.grid[0][0],'lemon');assert.equal(f.controller.snapshot().balanceMinor,9990);});
test('a synchronous transport exception does not leave busy permanently locked',async()=>{const f=fixture();f.transport.dispatch=()=>{throw Error('sync error');};await f.controller.connect();await f.controller.spin();assert.equal(f.controller.busy,null);assert.equal(await f.controller.recover(),true);});
test('host session owner mismatch fails without creating a wallet',async()=>{const f=fixture();f.transport.state=async()=>({...f.state(),subject:'different-player'});await assert.rejects(f.controller.connect(),/SESSION_BINDING/);assert.equal(f.calls.length,0);assert.equal(f.controller.snapshot().balanceMinor,null);});
test('minor units format exactly without creating or rounding money',()=>{assert.equal(formatMoney(100001),'1,000.01');assert.equal(formatMoney(null),'—');assert.throws(()=>formatMoney(1.5),/AMOUNT_INVALID/);});
test('AUTO baselines actual start balance and cannot replace a running sequence',async()=>{
  const f=fixture();await f.controller.connect();f.controller.configureAuto({count:25,decreaseLimit:10});
  f.controller.data.balanceMinor=9000;assert.equal(f.controller.startAuto(),true);assert.equal(f.controller.snapshot().auto.startBalanceMinor,9000);
  assert.throws(()=>f.controller.configureAuto({count:100}),/AUTO_CONFIGURATION/);assert.equal(f.controller.startAuto(),false);
  f.controller.stopAuto();f.controller.data.auto.remaining=0;assert.equal(f.controller.startAuto(),false);
});
test('reconnect restores current host state without clearing an uncertain original action',async()=>{
  const f=fixture({dispatch:()=>{throw Error('lost');}});await f.controller.connect();await f.controller.spin();const pending=f.controller.snapshot().pending;
  f.controller.disconnect();await f.controller.connect();assert.equal(f.controller.snapshot().connected,true);assert.equal(f.controller.snapshot().phase,'RECOVERY');assert.deepEqual(f.controller.snapshot().pending,pending);
  await f.controller.recover();assert.equal(f.controller.snapshot().phase,'ANIMATING');
});
test('reconnect clears stale accepted game result when the authenticated server has no round',async()=>{
  const f=fixture({win:20});await f.controller.connect();await f.controller.spin();f.controller.finishPresentation(roundId);
  assert.equal(f.controller.snapshot().round.roundId,roundId);
  f.transport.state=async()=>({...f.state(),round:null,pendingWinMinor:0,balanceMinor:9980});
  f.controller.disconnect();await f.controller.connect();
  assert.equal(f.controller.snapshot().round,null);
  assert.equal(f.controller.snapshot().pendingWinMinor,0);
  assert.equal(f.controller.snapshot().balanceMinor,9980);
  assert.equal(f.controller.snapshot().phase,'READY');
  assert.equal(f.calls.length,1);
});
test('rendered accepted view ignores state-only collection metadata on recovery',()=>{
  const f=fixture(),view=f.receipt({action:'SPIN',requestKey:key(1),betMinor:10});
  assert.deepEqual(rendererReceipt({...view,balanceMinor:view.balanceMinor+10,winPending:true,acceptedAction:{key:key(1)}}),rendererReceipt(view));
});
