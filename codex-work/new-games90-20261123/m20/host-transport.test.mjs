import test from 'node:test';
import assert from 'node:assert/strict';
import {createExistingM20Transport,EXISTING_M20_PENDING_KEY} from './host-transport.mjs';
import {createHostPresentation,isHostPresentation} from './host-presentation.mjs';
import {GAME_ID,PAYLINES} from './presentation-quote.mjs';
import {MultiHot20Controls,validatePresentation} from './controls.mjs';
import {MultiHot20Controller} from './controller.mjs';

const key='1b591b88-3ba9-49c6-b94e-0cc0d1c7cf78',round='7876466b-7df6-4b9d-aaf5-f228f37db15d',guard='a'.repeat(64);
const model=()=>({id:'fresh_multihot20',currency:'ETB',reels:5,rows:3,paylines:20,foundationBet:1,maxWinMultiplier:1000,
  symbols:['seven','bell','grape','watermelon','lemon','plum','orange','cherry'],multiplierValues:[1,2,3,4,5],
  betLevels:['1.00','2.00','200.00','40000.00'],availableBetLevels:['1.00','2.00','200.00','40000.00'],
  enabled:true,freshReleaseReady:true,productionApproved:true,probabilityModelAudited:true,wagerAvailability:'available',
  mathVersion:'accepted-m20-v1',engineVersion:'existing-engine',mathSha256:'b'.repeat(64)});
const state=()=>({authenticated:true,currency:'ETB',sessionGuard:guard,balance:'100.00',blockedByActiveGame:null,game:model()});
const intent=()=>({gameId:GAME_ID,action:'SPIN',requestKey:key,bet:'1.00',collectRoundId:null});
function reply(action) {
  return {gameId:'fresh_multihot20',roundId:round,currency:'ETB',bet:action.bet,isFree:false,
    grid:[['bell','bell','watermelon','lemon','bell'],['bell','orange','bell','bell','watermelon'],['seven','orange','bell','bell','watermelon']],
    wheelMultiplier:5,winLines:[{line:6,symbol:'bell',count:4,positions:PAYLINES[5].slice(0,4).map((r,c)=>[r,c]),baseWin:'5.00'},
      {line:18,symbol:'bell',count:3,positions:PAYLINES[17].slice(0,3).map((r,c)=>[r,c]),baseWin:'1.00'}],baseWin:'6.00',finalWin:'30.00',maxWinCapped:false,
    mathVersion:action.mathVersion,engineVersion:action.engineVersion,mathSha256:action.mathSha256,
    walletReceipt:{currency:'ETB',balanceBefore:'100.00',chargedStake:'1.00',finalWin:'30.00',balanceAfter:'129.00'}};
}
function fixture({onSpin,onState}={}) {
  const records=new Map(),calls=[];let current=state();
  const storage={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value),removeItem:key=>records.delete(key)};
  const fetcher=async(path,options)=>{const body=options.body?JSON.parse(options.body):null;calls.push({path,method:options.method,body,credentials:options.credentials,redirect:options.redirect});
    if(options.method==='GET')return Response.json(onState?onState(current):current);
    return onSpin?onSpin(body):Response.json(reply(body));};
  const make=()=>createExistingM20Transport({fetcher,storage});
  return{storage,calls,records,make,setState(value){current=value;}};
}
test('M20 host uses existing cookie-authenticated endpoints and GET-only TAKE without a second credit',async()=>{
  const f=fixture(),t=f.make();await t.connect();assert.equal(t.canPlay,true);
  const view=await t.submit(intent());assert.equal(view.gameId,GAME_ID);assert.equal(view.backendGameId,'fresh_multihot20');
  assert.equal(view.balance,'129.00');assert.equal(view.winAmount,'30.00');assert.equal(view.settlementMode,'SERVER_IMMEDIATE');
  f.setState({...state(),balance:'129.00'});
  const taken=await t.submit({gameId:GAME_ID,action:'TAKE',requestKey:'3fa777aa-ec78-492d-bcaa-78890724baf4',roundId:round});
  assert.equal(taken.creditedByTake,false);assert.equal(taken.amount,'30.00');assert.equal(taken.balance,'129.00');
  assert.equal(f.calls.filter(x=>x.method==='POST').length,1);
  assert(f.calls.every(x=>x.path.startsWith('/api/slots/')&&x.credentials==='same-origin'&&x.redirect==='error'));
  const payload=f.calls.find(x=>x.method==='POST').body;assert.equal(payload.gameId,'fresh_multihot20');
  assert.equal(payload.roundToken,key);assert.equal(payload.sessionGuard,guard);assert.equal('collectRoundId'in payload,false);
  assert.equal(f.storage.getItem(EXISTING_M20_PENDING_KEY),null);
});
test('lost accepted SPIN survives reload and replays the original token without a new wager',async()=>{
  let accepted;
  const f=fixture({onSpin:body=>{if(!body.replayOnly){accepted=reply(body);throw Error('lost accepted response');}return Response.json(accepted);}});
  const t=f.make();await t.connect();await assert.rejects(t.submit(intent()),/lost/);
  const saved=JSON.parse(f.storage.getItem(EXISTING_M20_PENDING_KEY));assert.equal(saved.roundToken,key);
  const restored=f.make(),state=await restored.connect();assert.equal(state.pendingIntent.requestKey,key);
  const result=await restored.recover(state.pendingIntent);assert.equal(result.roundId,round);
  assert.equal(f.calls.filter(x=>x.method==='POST'&&!x.body.replayOnly).length,1);
  assert.equal(f.calls.at(-1).body.replayOnly,true);assert.equal(f.calls.at(-1).body.roundToken,key);
});
test('an authenticated replay miss resubmits only the original still-eligible request',async()=>{
  let first=true;
  const f=fixture({onSpin:body=>{if(first){first=false;throw Error('request did not arrive');}
    if(body.replayOnly)return Response.json({detail:'ROUND_NOT_FOUND_FOR_REPLAY'},{status:404});return Response.json(reply(body));}});
  const t=f.make();await t.connect();await assert.rejects(t.submit(intent()));await t.recover(intent());
  const posts=f.calls.filter(x=>x.method==='POST');assert.equal(posts.length,3);
  assert(posts.every(x=>x.body.roundToken===key));const {replayOnly,...replayed}=posts[1].body;
  assert.deepEqual(posts[0].body,replayed);assert.deepEqual(posts[0].body,posts[2].body);
});
test('a replay miss under a changed model cannot silently create a different wager',async()=>{
  let first=true;
  const f=fixture({onSpin:body=>{if(first){first=false;throw Error('missing request');}return Response.json({detail:'ROUND_NOT_FOUND_FOR_REPLAY'},{status:404});}});
  const t=f.make();await t.connect();await assert.rejects(t.submit(intent()));const changed=state();changed.game.mathSha256='c'.repeat(64);f.setState(changed);
  await assert.rejects(t.recover(intent()),/SAVED_ROUND_REPLAY_ONLY/);
  assert.equal(f.calls.filter(x=>x.method==='POST'&&!x.body.replayOnly).length,1);assert(f.storage.getItem(EXISTING_M20_PENDING_KEY));
});
test('malformed or conflicting wallet receipt remains recoverable instead of fabricating a balance',async()=>{
  const f=fixture({onSpin:body=>Response.json({...reply(body),walletReceipt:{...reply(body).walletReceipt,balanceAfter:'130.00'}})});
  const t=f.make();await t.connect();await assert.rejects(t.submit(intent()),/HOST_WALLET_RECEIPT/);
  assert(f.storage.getItem(EXISTING_M20_PENDING_KEY));assert.equal(t.snapshot().balance,'100.00');
});
test('explicit unaccepted stake rejection clears only its pending token',async()=>{
  const f=fixture({onSpin:()=>Response.json({detail:'INSUFFICIENT_FUNDS'},{status:402})}),t=f.make();await t.connect();
  await assert.rejects(t.submit(intent()),error=>error.definitiveRejection===true&&error.status===402);
  assert.equal(f.storage.getItem(EXISTING_M20_PENDING_KEY),null);assert.equal(t.pendingIntent(),null);
});
test('another login cannot recover the original session token and no cookie is exposed to code',async()=>{
  const f=fixture({onSpin:()=>{throw Error('lost');}}),t=f.make();await t.connect();await assert.rejects(t.submit(intent()));
  f.setState({...state(),sessionGuard:'d'.repeat(64)});const second=f.make();await assert.rejects(second.connect(),/PENDING_SESSION_MISMATCH/);
  assert.equal(second.canPlay,false);assert(f.storage.getItem(EXISTING_M20_PENDING_KEY));assert.equal(f.calls.filter(x=>x.method==='POST').length,1);
});
test('server release and house capacity gates prevent submission before a token is saved',async()=>{
  for(const mutate of [s=>s.game.enabled=false,s=>s.game.productionApproved=false,s=>s.game.wagerAvailability='house_capacity']){
    const f=fixture(),s=state();mutate(s);f.setState(s);const t=f.make();await t.connect();
    assert.equal(t.canPlay,false);await assert.rejects(t.submit(intent()),/HOST_WAGER_UNAVAILABLE/);
    assert.equal(f.storage.getItem(EXISTING_M20_PENDING_KEY),null);assert.equal(f.calls.length,1);
  }
});
test('authoritative capped ETB receipt can render beyond the separate DMO reference quote limit',()=>{
  const m=model(),action={gameId:'fresh_multihot20',bet:'40000.00',roundToken:key,...Object.fromEntries(['mathVersion','engineVersion','mathSha256'].map(k=>[k,m[k]]))};
  const raw={...reply(action),grid:Array.from({length:3},()=>Array(5).fill('seven')),
    winLines:PAYLINES.map((path,index)=>({line:index+1,symbol:'seven',count:5,positions:path.map((r,c)=>[r,c]),baseWin:'4000000.00'})),
    baseWin:'80000000.00',finalWin:'40000000.00',maxWinCapped:true,
    walletReceipt:{currency:'ETB',balanceBefore:'50000.00',chargedStake:'40000.00',finalWin:'40000000.00',balanceAfter:'40010000.00'}};
  const view=createHostPresentation(raw,{model:m,action});assert(isHostPresentation(view));assert.equal(validatePresentation(view),view);
  const controls=new MultiHot20Controls({bet:'40000.00',betLevels:m.betLevels,roundIntentsEnabled:true,serverAuthoritative:true});
  controls.requestSpin(key);controls.acceptReceipt(view);controls.finishPresentation(round);
  assert.equal(controls.snapshot().round.winAmount,'40000000.00');assert.equal(controls.snapshot().balance,'40010000.00');
  assert.throws(()=>validatePresentation({...view}),/REFERENCE_BET_REQUIRED/);
});
test('host pending restoration cannot create a second intent and retains original stake',()=>{
  const c=new MultiHot20Controls({bet:'1.00',betLevels:model().betLevels,roundIntentsEnabled:true});c.restorePending(intent());
  assert.equal(c.snapshot().phase,'RECOVERY_REQUIRED');assert.equal(c.snapshot().pending.requestKey,key);
  assert.throws(()=>c.requestSpin('another-new-request-0001'),/SPIN_LOCKED/);
});

const actionKey='8ff1bc55-43b2-4016-aef7-efeb20808871';
const actionIntent=()=>({action:'GAMBLE',gameId:GAME_ID,requestKey:actionKey,roundId:round,choice:'RED',expectedAttempt:1,expectedStake:'30.00'});
function gambleReply(action,{won=true}={}){
  return{kind:'GAMBLE',gameId:'fresh_multihot20',currency:'ETB',roundId:round,roundToken:action.roundToken,
    actionId:'5140fb9d-fd2b-433c-b3bc-1ce508818991',choice:action.choice,color:won?action.choice:action.choice==='RED'?'BLACK':'RED',
    won,attempt:action.expectedAttempt,stake:action.expectedStake,payout:won?'60.00':'0.00',balanceAfter:won?'159.00':'99.00',
    maxAttempts:5,maxStake:'500.00',...Object.fromEntries(['mathVersion','engineVersion','mathSha256'].map(k=>[k,action[k]])),
    walletReceipt:{currency:'ETB',balanceBefore:'129.00',chargedStake:'30.00',finalWin:won?'60.00':'0.00',balanceAfter:won?'159.00':'99.00'}};
}
function gambleFixture({onAction}={}){
  let parent=null,lastResult=null;
  const f=fixture({onState:()=>({...state(),balance:lastResult?.balanceAfter??(parent?'129.00':'100.00'),
    round:parent?{result:parent,gamble:{attempt:lastResult?.attempt??0,stake:lastResult?.payout??'30.00',available:!lastResult||lastResult.won,
      maxAttempts:5,maxStake:'500.00',lastResult}}:null}),onSpin:body=>{
    if(body.choice){lastResult=gambleReply(body);return onAction?onAction(body,lastResult):Response.json(lastResult);}
    parent=reply(body);return Response.json(parent);
  }});return f;
}
test('X2 uses the existing gamble route, validates its wallet movement, and TAKE acknowledges the doubled amount only',async()=>{
  const f=gambleFixture(),t=f.make();await t.connect();const spin=await t.submit(intent());const g=await t.refreshGamble();
  assert.equal(g.stake,'30.00');assert.equal(g.available,true);
  const doubled=await t.submit(actionIntent());assert.equal(doubled.payout,'60.00');assert.equal(t.snapshot().balance,'159.00');
  const c=new MultiHot20Controls({bet:'1.00',betLevels:model().betLevels,roundIntentsEnabled:true,serverAuthoritative:true});
  c.restoreRound(spin);c.updateGamble(g);c.requestGamble(actionKey,'RED');c.acceptGamble(doubled);
  const take=c.requestTake('2451b2e6-87da-4840-81a5-7c01ef50341f'),ack=await t.submit(take);c.acceptTake(ack);
  assert.equal(ack.amount,'60.00');assert.equal(ack.creditedByTake,false);assert.equal(c.snapshot().phase,'READY');
  assert.equal(f.calls.filter(x=>x.path==='/api/slots/gamble').length,1);assert.equal(f.calls.filter(x=>x.method==='POST').length,2);
});
test('lost accepted X2 survives reload and replays the original action without another colour choice',async()=>{
  const f=gambleFixture({onAction:(body,receipt)=>{if(!body.replayOnly)throw Error('lost X2 reply');return Response.json(receipt);}});
  const t=f.make();await t.connect();await t.submit(intent());await t.refreshGamble();await assert.rejects(t.submit(actionIntent()),/lost X2/);
  const restored=f.make(),s=await restored.connect();assert.equal(s.pendingIntent.action,'GAMBLE');assert.equal(s.pendingIntent.requestKey,actionKey);
  assert.equal(s.lastPresentation.roundId,round);const result=await restored.recover(s.pendingIntent);assert.equal(result.payout,'60.00');
  const posts=f.calls.filter(x=>x.path==='/api/slots/gamble');assert.equal(posts.length,2);assert.equal(posts[1].body.replayOnly,true);
  assert.equal(posts[0].body.roundToken,posts[1].body.roundToken);assert.equal(posts[0].body.choice,posts[1].body.choice);
});
test('invalid X2 wallet receipt retains the saved action and leaves the last verified balance',async()=>{
  const f=gambleFixture({onAction:(body,receipt)=>Response.json({...receipt,walletReceipt:{...receipt.walletReceipt,balanceAfter:'160.00'}})});
  const t=f.make();await t.connect();await t.submit(intent());await t.refreshGamble();await assert.rejects(t.submit(actionIntent()),/GAMBLE_WALLET_RECEIPT/);
  assert.equal(t.pendingIntent().requestKey,actionKey);assert.equal(t.snapshot().balance,'129.00');
});
test('TAKE cannot overtake a delayed X2 reply and then acknowledges its exact doubled amount',async()=>{
  let release;
  const f=gambleFixture({onAction:(body,receipt)=>new Promise(resolve=>{release=()=>resolve(Response.json(receipt));})});
  const t=f.make();await t.connect();const spin=await t.submit(intent()),g=await t.refreshGamble();
  const c=new MultiHot20Controls({bet:'1.00',betLevels:model().betLevels,roundIntentsEnabled:true,serverAuthoritative:true});
  c.restoreRound(spin);c.updateGamble(g);c.setBalance('129.00');
  const renderer={applyGamble(){},collect(){},snapshot:()=>({phase:'IDLE',round:spin})};let keyCount=0;
  const controller=new MultiHot20Controller({controls:c,renderer,transport:t,keyFactory:()=>keyCount++? '355d65a7-e46e-4d09-bd71-c0df58a08bd8':actionKey});
  const delayed=controller.gamble('RED');await Promise.resolve();assert.equal(c.snapshot().phase,'GAMBLE_PENDING');
  assert.equal(await controller.take(),false);assert.equal(f.calls.filter(x=>x.path==='/api/slots/gamble').length,1);
  release();assert.equal(await delayed,true);assert.equal(await controller.take(),true);assert.equal(c.snapshot().balance,'159.00');
  assert.equal(c.snapshot().phase,'READY');assert.equal(f.calls.filter(x=>x.method==='POST').length,2);
});
