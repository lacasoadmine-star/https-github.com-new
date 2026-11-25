import test from 'node:test';
import assert from 'node:assert/strict';
import { MULTI_HOT_100_GAME_ID as GAME_ID, MultiHot100Controls, validateM100RoundView } from './controls.mjs';
import { MultiHot100Presentation } from './presentation.mjs';
import { MultiHot100Controller } from './controller.mjs';

// Isolated shape/protocol fixtures; no provider observation, production account or live wager.
const receipt=(requestKey,roundId='fixture-round-0001',winAmount='0.00')=>({
  gameId:GAME_ID,requestKey,roundId,bet:'1.00',winAmount,multiplier:3,balance:'100.00',
  grid:Array.from({length:4},()=>['lemon','plum','orange','seven','bell'])
});
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const money=n=>(n/100n).toString()+'.'+(n%100n).toString().padStart(2,'0');
function setup({win='0.00',submit,recover,onChange,onError,presentation}={}) {
  const controls=new MultiHot100Controls(),view=presentation??new MultiHot100Presentation();
  const calls=[],errors=[],replies=new Map();let key=0,round=0,clock=0;
  const makeReply=intent=>{
    if(replies.has(intent.requestKey))return structuredClone(replies.get(intent.requestKey));
    let result;
    if(intent.kind==='SPIN')result=receipt(intent.requestKey,'fixture-round-'+String(++round).padStart(4,'0'),win);
    else if(intent.kind==='TAKE_WIN')result={gameId:GAME_ID,requestKey:intent.requestKey,roundId:intent.roundId,collected:true,collectedAmount:controls.snapshot().pendingWin,balance:'100.40'};
    else result={gameId:GAME_ID,requestKey:intent.requestKey,roundId:intent.roundId,choice:intent.choice,card:'Ace_Hearts',correct:intent.choice==='red',winAmount:intent.choice==='red'?money(BigInt(controls.snapshot().pendingWin.replace('.',''))*2n):'0.00'};
    replies.set(intent.requestKey,result);return structuredClone(result);
  };
  const transport={
    submit:intent=>{calls.push({mode:'submit',intent:structuredClone(intent)});return submit?submit(intent,makeReply):makeReply(intent);},
    recover:intent=>{calls.push({mode:'recover',intent:structuredClone(intent)});return recover?recover(intent,makeReply):makeReply(intent);}
  };
  const controller=new MultiHot100Controller({controls,presentation:view,transport,keyFactory:()=> 'fixture-request-'+String(++key).padStart(4,'0'),
    onChange:onChange??(()=>{}),onError:error=>{errors.push(error);onError?.(error);}});
  return {controls,presentation:view,controller,calls,errors,replies,makeReply,
    finish(){return controller.frame({clockMs:++clock,progress:1});}};
}
test('an explicit host preflight failure releases only an undispatched intent',async()=>{
  const s=setup({submit(){throw Object.assign(new Error('isolated preflight failure'),{safeToCancel:true});}});
  assert.equal(await s.controller.spin(),false);
  assert.equal(s.controls.snapshot().phase,'IDLE');assert.equal(s.controls.snapshot().pending,null);
  assert.equal(s.presentation.snapshot().moving,false);assert.equal(s.presentation.snapshot().receipt,null);
  assert.equal(await s.controller.recover(),false);assert.equal(s.calls.length,1);
});
test('partial collect/start uncertainty retains its original request instead of cancelling',async()=>{
  const s=setup({submit(){throw Object.assign(new Error('isolated reply lost after collect'),{safeToCancel:false});}});
  assert.equal(await s.controller.spin(),false);
  const original=s.calls[0].intent;
  assert.equal(s.controls.snapshot().phase,'RECOVERY_REQUIRED');
  assert.equal(await s.controller.recover(),true);
  assert.deepEqual(s.calls[1].intent,original);assert.equal(s.calls[1].mode,'recover');
  s.finish();assert.equal(s.controls.snapshot().phase,'IDLE');
});
test('one input submits once; pending repeated inputs request only one STOP',async()=>{
  const held=defer(),s=setup({submit:()=>held.promise});const first=s.controller.spin();await Promise.resolve();
  assert.equal(s.calls.length,1);assert.equal(await s.controller.spin(),true);assert.equal(await s.controller.spin(),false);
  s.finish();assert.equal(s.controls.snapshot().phase,'SPIN_PENDING');assert.equal(s.calls.length,1);
  held.resolve(s.makeReply(s.calls[0].intent));assert.equal(await first,true);s.finish();assert.equal(s.controls.snapshot().phase,'IDLE');
});
test('STOP after receipt changes presentation without submitting an action',async()=>{
  const s=setup();await s.controller.spin();assert.equal(s.controller.stop(),true);assert.equal(s.controller.stop(),false);
  s.finish();assert.equal(s.calls.length,1);assert.equal(s.presentation.snapshot().moving,false);
});
test('time and STOP cannot produce an outcome before a host receipt',async()=>{
  const held=defer(),s=setup({submit:()=>held.promise});const first=s.controller.spin();await Promise.resolve();s.controller.stop();
  const view=s.controller.frame({clockMs:1000000,progress:1});assert.equal(view.receipt,null);assert.equal(view.moving,true);assert.equal(view.outcomesGenerated,0);
  held.resolve(s.makeReply(s.calls[0].intent));await first;s.controller.frame({clockMs:1000001,progress:1});assert.equal(s.controls.snapshot().phase,'IDLE');
});
test('lost reply blocks BET/new SPIN and recovers the exact original intent',async()=>{
  const s=setup({submit:(intent,make)=>{make(intent);throw new Error('lost reply');}});assert.equal(await s.controller.spin(),false);
  const original=s.calls[0].intent;assert.equal(s.controls.snapshot().phase,'RECOVERY_REQUIRED');assert.equal(s.controls.selectBet('2.00'),false);
  assert.equal(await s.controller.spin(),false);assert.equal(s.calls.length,1);assert.equal(await s.controller.recover(),true);
  assert.deepEqual(s.calls[1],{mode:'recover',intent:original});assert.equal(s.replies.size,1);s.finish();assert.equal(s.controls.snapshot().phase,'IDLE');
});
test('synchronous host failure preserves the original recovery key',async()=>{
  const s=setup({submit:()=>{throw new Error('synchronous failure');}});assert.equal(await s.controller.spin(),false);
  assert.equal(s.controls.snapshot().pending.requestKey,s.calls[0].intent.requestKey);assert.equal(await s.controller.recover(),true);s.finish();assert.equal(s.calls.length,2);
});
test('a stale SPIN response cannot strand or replace the next pending request',async()=>{
  let stale;const s=setup({submit:(intent,make)=>{if(stale)return stale;stale=make(intent);return stale;}});
  await s.controller.spin();s.finish();assert.equal(await s.controller.spin(),false);const second=s.calls[1].intent;
  assert.notEqual(second.requestKey,stale.requestKey);assert.equal(s.controls.snapshot().phase,'RECOVERY_REQUIRED');
  assert.equal(s.controls.snapshot().pending.requestKey,second.requestKey);assert.equal(s.controls.snapshot().round.roundId,stale.roundId);
  assert.equal(await s.controller.recover(),true);assert.deepEqual(s.calls[2].intent,second);s.finish();assert.equal(s.controls.snapshot().round.requestKey,second.requestKey);
});
test('direct stale round delivery rejects without changing the later pending action',()=>{
  const c=new MultiHot100Controls();c.requestSpin('fixture-request-one');const first=receipt('fixture-request-one');c.applyRoundView(first);c.finishPresentation(first.roundId);
  c.requestSpin('fixture-request-two');const before=c.snapshot();assert.throws(()=>c.applyRoundView(first),/STALE_RECEIPT/);assert.deepEqual(c.snapshot(),before);
});
test('identical accepted receipt remains idempotent when no later request is pending',async()=>{
  const s=setup();await s.controller.spin();const accepted=s.presentation.snapshot().receipt;s.finish();const before=s.controls.snapshot();
  assert.equal(s.controls.applyRoundView(accepted),false);assert.equal(s.presentation.accept(accepted),false);assert.deepEqual(s.controls.snapshot(),before);
});
test('a conflicting same-round grid cannot replace the accepted presentation',async()=>{
  const s=setup();await s.controller.spin();const changed=structuredClone(s.presentation.snapshot().receipt);changed.grid[0][0]='seven';
  assert.throws(()=>s.presentation.accept(changed),/RECEIPT_CONFLICT/);assert.equal(s.presentation.snapshot().receipt.grid[0][0],'lemon');
});
test('TAKE collects the pending amount once and locks repeated input',async()=>{
  const held=defer(),s=setup({win:'0.40',submit:(intent,make)=>intent.kind==='TAKE_WIN'?held.promise:make(intent)});
  await s.controller.spin();s.finish();assert.equal(s.controls.snapshot().pendingWin,'0.40');const take=s.controller.take();await Promise.resolve();
  assert.equal(await s.controller.take(),false);assert.equal(await s.controller.spin(),false);
  const intent=s.calls[1].intent;held.resolve(s.makeReply(intent));assert.equal(await take,true);assert.equal(s.controls.snapshot().phase,'IDLE');
  assert.equal(s.controls.snapshot().pendingWin,'0.00');assert.equal(s.controls.applyTakeAcknowledgement(s.replies.get(intent.requestKey)),false);assert.equal(s.calls.length,2);
});
test('lost TAKE response recovers the same collection action',async()=>{
  const s=setup({win:'0.40',submit:(intent,make)=>{const reply=make(intent);if(intent.kind==='TAKE_WIN')throw new Error('lost collect');return reply;}});
  await s.controller.spin();s.finish();assert.equal(await s.controller.take(),false);const original=s.calls[1].intent;
  assert.equal(s.controls.snapshot().phase,'RECOVERY_REQUIRED');assert.equal(await s.controller.recover(),true);assert.deepEqual(s.calls[2].intent,original);
  assert.equal(s.controls.snapshot().pendingWin,'0.00');assert.equal(s.replies.size,2);
});
test('old collection acknowledgement cannot acknowledge a later pending collection',async()=>{
  const s=setup({win:'0.40'});await s.controller.spin();s.finish();await s.controller.take();const old=s.replies.get(s.calls[1].intent.requestKey);
  await s.controller.spin();s.finish();s.controls.requestTakeWin('fixture-new-take-key');const before=s.controls.snapshot();
  assert.throws(()=>s.controls.applyTakeAcknowledgement(old),/STALE_COLLECTION_ACK/);assert.deepEqual(s.controls.snapshot(),before);
});
test('lost gamble response recovers the same choice and verifies the own 2x contract',async()=>{
  const s=setup({win:'0.40',submit:(intent,make)=>{const reply=make(intent);if(intent.kind==='GAMBLE')throw new Error('lost gamble');return reply;}});
  await s.controller.spin();s.finish();assert.equal(s.controls.openModal('double'),true);assert.equal(await s.controller.gamble('red'),false);const original=s.calls[1].intent;
  assert.equal(await s.controller.recover(),true);assert.deepEqual(s.calls[2].intent,original);assert.equal(s.controls.snapshot().pendingWin,'0.80');assert.equal(s.replies.size,2);
});
test('old gamble acknowledgement cannot replace a later pending choice',async()=>{
  const s=setup({win:'0.40'});await s.controller.spin();s.finish();s.controls.openModal('double');await s.controller.gamble('red');
  const old=s.replies.get(s.calls[1].intent.requestKey);s.controls.requestGamble('fixture-next-gamble','black');const before=s.controls.snapshot();
  assert.throws(()=>s.controls.applyGambleView(old),/STALE_GAMBLE_ACK/);assert.deepEqual(s.controls.snapshot(),before);
});
test('sparse grids and sparse winning lines reject before state changes',()=>{
  for(const kind of ['row','cell','line']){const c=new MultiHot100Controls();c.requestSpin('fixture-invalid-grid');const bad=receipt('fixture-invalid-grid');
    if(kind==='row')delete bad.grid[1];else if(kind==='cell')delete bad.grid[2][3];else bad.winningLines=new Array(1);
    assert.throws(()=>validateM100RoundView(bad),/RECEIPT_GRID|UNVERIFIED_WINNING_LINE/);
    assert.throws(()=>c.applyRoundView(bad),/RECEIPT_GRID|UNVERIFIED_WINNING_LINE/);assert.equal(c.snapshot().pending.requestKey,'fixture-invalid-grid');assert.equal(c.snapshot().round,null);}
});
test('invalid host amount or foreign game stays unaccepted and recoverable',async()=>{
  for(const patch of [{winAmount:'NaN'},{gameId:'another-game'}]){const s=setup({submit:(intent,make)=>({...make(intent),...patch})});
    assert.equal(await s.controller.spin(),false);assert.equal(s.controls.snapshot().phase,'RECOVERY_REQUIRED');assert.equal(s.controls.snapshot().round,null);assert.equal(s.presentation.snapshot().receipt,null);}
});
test('hiding retains uncertain work while accepting the original in-flight response',async()=>{
  const held=defer(),s=setup({submit:()=>held.promise});const first=s.controller.spin();await Promise.resolve();s.controller.setHidden(true);
  assert.equal(s.controls.snapshot().phase,'RECOVERY_REQUIRED');assert.equal(await s.controller.spin(),false);assert.equal(await s.controller.recover(),false);
  held.resolve(s.makeReply(s.calls[0].intent));assert.equal(await first,true);s.controller.setHidden(false);s.finish();assert.equal(s.controls.snapshot().phase,'IDLE');assert.equal(s.calls.length,1);
});
test('disposed controller cannot submit again or accept a late response',async()=>{
  const held=defer(),s=setup({submit:()=>held.promise});const first=s.controller.spin();await Promise.resolve();s.controller.dispose();
  held.resolve(s.makeReply(s.calls[0].intent));assert.equal(await first,false);assert.equal(await s.controller.spin(),false);assert.equal(await s.controller.recover(),false);
  assert.equal(s.controls.snapshot().round,null);assert.equal(s.calls.length,1);
});
test('throwing reporting callbacks cannot lose an accepted financial request',async()=>{
  const s=setup({onChange:()=>{throw new Error('view failed');},onError:()=>{throw new Error('logger failed');}});
  assert.equal(await s.controller.spin(),true);s.finish();assert.equal(s.calls.length,1);assert.equal(s.controls.snapshot().phase,'IDLE');assert.ok(s.errors.length>0);
});
test('reentrant change notification cannot dispatch another recovery',async()=>{
  let s,reentered=false;s=setup({submit:()=>{throw new Error('offline');},onChange:state=>{
    if(state.phase==='RECOVERY_REQUIRED'&&state.inFlight&&!reentered){reentered=true;void s.controller.recover();}}});
  await s.controller.spin();assert.equal(await s.controller.recover(),true);assert.equal(reentered,true);assert.equal(s.calls.length,2);s.finish();
});
test('local presentation-start failure cancels only an unsent request',async()=>{
  const s=setup({presentation:{begin(){throw new Error('renderer unavailable');},cancelUnsent(){return false;}}});
  assert.equal(await s.controller.spin(),false);assert.equal(s.calls.length,0);assert.equal(s.controls.snapshot().phase,'IDLE');assert.equal(s.controls.snapshot().pending,null);
});
test('host mutation of an immutable intent cannot change the pending bet',async()=>{
  const s=setup({submit:intent=>{intent.bet='5.00';return receipt(intent.requestKey);}});
  assert.equal(await s.controller.spin(),false);assert.equal(s.controls.snapshot().phase,'RECOVERY_REQUIRED');assert.equal(s.controls.snapshot().pending.bet,'1.00');
});
test('cash activation, provider timing and outcome generation remain unclaimed',async()=>{
  const s=setup();await s.controller.spin();s.finish();assert.equal(s.controls.snapshot().cashEnabled,false);assert.equal(s.presentation.snapshot().providerTimingVerified,false);
  assert.equal(s.presentation.snapshot().outcomesGenerated,0);assert.equal(s.presentation.snapshot().financiallyActionable,false);
});

test('TAKE remains available inside its own pending-win double dialog',async()=>{
  const s=setup({win:'0.40'});await s.controller.spin();s.finish();assert.equal(s.controls.openModal('double'),true);
  assert.equal(await s.controller.take(),true);assert.equal(s.controls.snapshot().modal,null);
  assert.equal(s.controls.snapshot().pendingWin,'0.00');assert.equal(s.calls.length,2);
});

test('animation acceptance failure recovers the accepted win without another host request',async()=>{
  const s=setup({win:'0.40'});s.presentation.accept=()=>{throw new Error('animation failed');};
  assert.equal(await s.controller.spin(),false);const accepted=s.controls.snapshot().round;
  assert.equal(s.controls.snapshot().phase,'PRESENTING');assert.equal(s.controller.snapshot().presentationRecoveryRequired,true);
  assert.equal(await s.controller.recover(),true);assert.equal(s.calls.length,1);
  assert.deepEqual(s.presentation.snapshot().receipt,accepted);assert.equal(s.controls.snapshot().phase,'WIN_PENDING');
  assert.equal(s.controls.snapshot().pendingWin,'0.40');assert.equal(s.controller.snapshot().presentationRecoveryRequired,false);
  assert.equal(await s.controller.take(),true);assert.equal(s.calls.length,2);assert.equal(s.controls.snapshot().pendingWin,'0.00');
});
test('frame failure retains the accepted result and does not repeatedly run broken animation',async()=>{
  const s=setup();await s.controller.spin();const accepted=s.controls.snapshot().round;let attempts=0;
  s.presentation.advance=()=>{attempts++;throw new Error('frame failed');};
  assert.equal(s.controller.frame({clockMs:1,progress:0.5}),null);
  assert.equal(s.controller.frame({clockMs:2,progress:1}),null);assert.equal(attempts,1);
  assert.equal(s.controller.snapshot().presentationRecoveryRequired,true);assert.equal(await s.controller.recover(),true);
  assert.equal(s.calls.length,1);assert.deepEqual(s.presentation.snapshot().receipt,accepted);assert.equal(s.controls.snapshot().phase,'IDLE');
});
test('presentation recovery cannot run before an accepted receipt or while hidden',async()=>{
  const held=defer(),s=setup({submit:()=>held.promise});const first=s.controller.spin();await Promise.resolve();
  assert.equal(s.controller.recoverPresentation(),false);assert.equal(s.calls.length,1);
  s.presentation.accept=()=>{throw new Error('animation failed');};held.resolve(s.makeReply(s.calls[0].intent));await first;
  s.controller.setHidden(true);assert.equal(await s.controller.recover(),false);assert.equal(s.calls.length,1);
  s.controller.setHidden(false);assert.equal(await s.controller.recover(),true);assert.equal(s.calls.length,1);
});
test('static presentation recovery rejects a conflicting accepted grid',()=>{
  const original=receipt('fixture-static-receipt'),p=new MultiHot100Presentation({initialView:original});
  const changed=structuredClone(original);changed.grid[0][0]='seven';const before=p.snapshot();
  assert.throws(()=>p.restoreAccepted(changed),/RECEIPT_CONFLICT/);assert.deepEqual(p.snapshot(),before);
});
test('a failed static restore retains the accepted win and remains locally recoverable',async()=>{
  const s=setup({win:'0.40'});s.presentation.accept=()=>{throw new Error('animation failed');};await s.controller.spin();
  const accepted=s.controls.snapshot().round,restore=s.presentation.restoreAccepted.bind(s.presentation);
  s.presentation.restoreAccepted=()=>{throw new Error('view unavailable');};
  assert.equal(await s.controller.recover(),false);assert.equal(s.calls.length,1);
  assert.equal(s.controller.snapshot().presentationRecoveryRequired,true);assert.deepEqual(s.controls.snapshot().round,accepted);
  assert.equal(s.controls.snapshot().pendingWin,'0.40');s.presentation.restoreAccepted=restore;
  assert.equal(await s.controller.recover(),true);assert.equal(s.controls.snapshot().phase,'WIN_PENDING');assert.equal(s.calls.length,1);
});
test('disposing prevents presentation recovery from applying or submitting anything',async()=>{
  const s=setup();s.presentation.accept=()=>{throw new Error('animation failed');};await s.controller.spin();s.controller.dispose();
  assert.equal(s.controller.recoverPresentation(),false);assert.equal(await s.controller.recover(),false);assert.equal(s.calls.length,1);
});
test('an unbound presentation cannot introduce a fabricated accepted outcome',()=>{
  const p=new MultiHot100Presentation();assert.throws(()=>p.restoreAccepted(receipt('fixture-unbound-receipt')),/NO_INTENT/);
  assert.equal(p.snapshot().receipt,null);assert.equal(p.snapshot().outcomesGenerated,0);
});
test('a restore that fails to show the accepted result cannot finish or collect the round',async()=>{
  const s=setup({win:'0.40'});s.presentation.accept=()=>{throw new Error('animation failed');};await s.controller.spin();
  const restore=s.presentation.restoreAccepted.bind(s.presentation);s.presentation.restoreAccepted=()=>false;
  assert.equal(await s.controller.recover(),false);assert.equal(s.controls.snapshot().phase,'PRESENTING');
  assert.equal(s.controls.snapshot().pendingWin,'0.40');assert.equal(s.calls.length,1);
  s.presentation.restoreAccepted=restore;assert.equal(await s.controller.recover(),true);assert.equal(s.calls.length,1);
});
