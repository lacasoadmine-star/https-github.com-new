// Focused client-contract regressions. Simulated HTTP/ledger, never production funds.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Session,GAMBLE_STORAGE_KEY,STORAGE_KEY} from './multihot20/session.mjs';
import {GameController,GAME_ID,validateGambleReceipt} from './multihot20/controller.mjs';

const GUARD='f'.repeat(64),PARENT='c4353465-1182-48dc-b1a2-617ccebe7def';
const etb=n=>(n/100n)+'.'+(n%100n).toString().padStart(2,'0');
const cents=v=>BigInt(v.replace('.',''));
const fault=(code,status)=>Object.assign(new Error(code),{code,status});
function fixture(){
 const game={id:GAME_ID,enabled:true,freshReleaseReady:true,reels:5,rows:3,paylines:20,
  mathVersion:'qa-m20',engineVersion:'qa-existing',mathSha256:'a'.repeat(64),
  symbols:['seven','cherry'],betLevels:['1.00','2.00'],paytable:{seven:{3:50}}};
 const parent={gameId:GAME_ID,roundId:PARENT,bet:'1.00',currency:'ETB',isFree:false,
  mathVersion:game.mathVersion,engineVersion:game.engineVersion,mathSha256:game.mathSha256,
  grid:Array.from({length:3},()=>Array(5).fill('seven')),wheelMultiplier:1,winLines:[],finalWin:'2.00',
  walletReceipt:{currency:'ETB',balanceBefore:'99.00',chargedStake:'1.00',finalWin:'2.00',balanceAfter:'100.00'}};
 let balance=10000n,attempt=0,stake=200n,guard=GUARD,last=null,debits=0,mode=null,reject=null,hold=null,mutate=null,getFailure=false;
 const requests=[],receipts=new Map(),spinReceipts=new Map(),map=new Map();
 let currentParent=parent,spinPayout=0n;
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const state=()=>({authenticated:true,currency:'ETB',sessionGuard:guard,balance:etb(balance),game:structuredClone(game),
  round:{result:structuredClone(currentParent),gamble:{attempt,stake:etb(stake),available:stake>0n&&attempt<5,
   maxAttempts:5,maxStake:'500.00',reason:stake===0n?'NO_GAMBLE_WINNINGS':null,...(last?{lastResult:structuredClone(last)}:{})}}});
 const request=async(path,body)=>{
  requests.push({path,body:body?structuredClone(body):null});
  if(path.startsWith('/api/slots/fresh-state')){if(getFailure)throw fault('TEMPORARY_READ_ERROR',503);return state()}
  if(path==='/api/slots/spin'){
   if(mode==='before'){mode=null;throw fault('NETWORK_LOST',503)}
   let result=spinReceipts.get(body.roundToken);
   if(!result){
    if(body.replayOnly)throw fault('ROUND_NOT_FOUND_FOR_REPLAY',404);
    const before=balance;balance=before-cents(body.bet)+spinPayout;debits++;
    result={...structuredClone(parent),roundId:randomUUID(),bet:body.bet,finalWin:etb(spinPayout),
     walletReceipt:{currency:'ETB',balanceBefore:etb(before),chargedStake:body.bet,finalWin:etb(spinPayout),balanceAfter:etb(balance)}};
    spinReceipts.set(body.roundToken,result);currentParent=result;stake=spinPayout;attempt=0;last=null;
   }
   if(mode==='after'){mode=null;throw fault('NETWORK_LOST',503)}
   return structuredClone(result);
  }
  assert.equal(path,'/api/slots/gamble');
  if(hold)await hold;
  if(reject)throw reject;
  if(mode==='before'){mode=null;throw fault('NETWORK_LOST',503)}
  let result=receipts.get(body.roundToken);
  if(!result){
   if(body.replayOnly)throw fault('ROUND_NOT_FOUND_FOR_REPLAY',404);
   assert.equal(body.expectedAttempt,attempt+1);assert.equal(body.expectedStake,etb(stake));assert.equal(body.roundId,currentParent.roundId);
   const before=balance,color='RED',won=body.choice===color,payout=won?stake*2n:0n;
   debits++;balance=before-stake+payout;attempt++;
   result={kind:'GAMBLE',actionId:randomUUID(),roundId:currentParent.roundId,roundToken:body.roundToken,gameId:GAME_ID,
    currency:'ETB',choice:body.choice,color,won,stake:etb(stake),payout:etb(payout),attempt,maxAttempts:5,maxStake:'500.00',
    balanceAfter:etb(balance),walletReceipt:{currency:'ETB',balanceBefore:etb(before),chargedStake:etb(stake),finalWin:etb(payout),balanceAfter:etb(balance)},
    mathVersion:game.mathVersion,engineVersion:game.engineVersion,mathSha256:game.mathSha256};
   stake=payout;last=result;receipts.set(body.roundToken,result);
  }
  if(mode==='after'){mode=null;throw fault('NETWORK_LOST',503)}
  const copy=structuredClone(result);return mutate?mutate(copy):copy;
 };
 const session=()=>new Session({request,storage,uuid:randomUUID});
 return {session,storage,state,requests,parent,game,metrics:()=>({debits,balance:etb(balance),attempt}),
  loseBefore:()=>mode='before',loseAfter:()=>mode='after',reject:e=>reject=e,changeGuard:()=>guard='e'.repeat(64),
  hold:p=>hold=p,mutate:f=>mutate=f,readFailure:v=>getFailure=v,spinWin:v=>spinPayout=cents(v)};
}

for(const [choice,payout,balance] of [['RED','4.00','102.00'],['BLACK','0.00','98.00']]){
 test('M20 '+choice+' uses server X2 receipt and refreshes existing ledger once',async()=>{
  const f=fixture(),s=f.session();await s.connect();
  const r=await s.gamble(choice);assert.equal(r.payout,payout);assert.equal(s.account.balance,balance);
  assert.equal(s.phase,'SHOWING_ACTION');assert.equal(f.storage.getItem(GAMBLE_STORAGE_KEY),null);
  assert.equal((await s.finish()).balance,balance);assert.equal(s.phase,'READY');assert.equal(f.metrics().debits,1);
  assert.equal(f.parent.finalWin,'2.00','original spin history is immutable');
 });
}
for(const loss of ['loseBefore','loseAfter']){
 test('M20 '+loss+' X2 recovery preserves the chosen card, stake, attempt and action token across refresh',async()=>{
  const f=fixture(),first=f.session();await first.connect();f[loss]();
  await assert.rejects(first.gamble('RED'),/NETWORK_LOST/);const saved=JSON.parse(f.storage.getItem(GAMBLE_STORAGE_KEY));
  assert.equal(first.phase,'WAITING_FOR_ACTION');await assert.rejects(first.spin('1.00'),/ROUND_NOT_READY/);
  const resumed=f.session();await resumed.connect();assert.equal(resumed.phase,'WAITING_FOR_ACTION');
  const r=await resumed.recoverAction();assert.equal(r.roundToken,saved.roundToken);await resumed.finish();
  const posts=f.requests.filter(x=>x.body);
  assert.equal(posts.length,loss==='loseBefore'?3:2);
  for(const p of posts){const body={...p.body};delete body.replayOnly;assert.deepEqual(body,saved)}
  assert.equal(f.metrics().debits,1);assert.equal(resumed.account.balance,'102.00');
 });
}
test('M20 malformed X2 settlement stays pending and recovers the committed receipt without second debit',async()=>{
 const f=fixture(),s=f.session();await s.connect();f.mutate(r=>({...r,payout:'40.00'}));
 await assert.rejects(s.gamble('RED'),/INVALID_GAMBLE_SETTLEMENT/);assert.ok(s.pendingAction);
 f.mutate(null);await s.recoverAction();await s.finish();assert.equal(f.metrics().debits,1);assert.equal(s.account.balance,'102.00');
});
test('M20 receipt validator rejects foreign round, action token, colour and mismatched wallet totals',async()=>{
 const f=fixture(),s=f.session();await s.connect();const r=await s.gamble('RED');
 const action=f.requests.find(x=>x.body).body;
 for(const patch of [{roundId:randomUUID()},{roundToken:randomUUID()},{color:'BLACK'},{balanceAfter:'1000.00'}])
  assert.throws(()=>validateGambleReceipt({...r,...patch},action),/GAMBLE_RECEIPT_IDENTITY_MISMATCH|INVALID_GAMBLE_SETTLEMENT/);
});
test('M20 late previous-session X2 response cannot update a replacement Player',async()=>{
 const f=fixture(),s=f.session();await s.connect();let release;f.hold(new Promise(r=>release=r));
 const pending=s.gamble('RED');s.logout();release();await assert.rejects(pending,/STALE_SESSION_RESPONSE/);
 assert.equal(s.account,null);assert.equal(s.phase,'DISCONNECTED');assert.ok(f.storage.getItem(GAMBLE_STORAGE_KEY));
 f.changeGuard();await assert.rejects(s.connect(),/SAVED_GAMBLE_BELONGS_TO_ANOTHER_SESSION/);assert.equal(f.metrics().debits,1);
});
test('M20 explicit rejected X2 attempt unlocks the UI without clearing an ambiguous request',async()=>{
 const f=fixture(),s=f.session();await s.connect();f.reject(fault('GAMBLE_EXPIRED',409));
 await assert.rejects(s.gamble('RED'),/GAMBLE_EXPIRED/);assert.equal(s.pendingAction,null);assert.equal(s.phase,'READY');assert.equal(f.metrics().debits,0);
 f.reject(fault('TEMPORARY_ERROR',503));await assert.rejects(s.gamble('BLACK'));
 assert.ok(s.pendingAction);assert.equal(s.phase,'WAITING_FOR_ACTION');
});
test('M20 TAKE WIN does only a ledger GET and cannot discard an unresolved X2',async()=>{
 const f=fixture(),s=f.session();await s.connect();await s.takeWin();await s.takeWin();
 assert.equal(f.requests.filter(x=>x.body).length,0);assert.equal(s.account.balance,'100.00');
 f.loseAfter();await assert.rejects(s.gamble('RED'));
 await assert.rejects(s.takeWin(),/NO_SETTLED_WIN/);assert.ok(f.storage.getItem(GAMBLE_STORAGE_KEY));
});
test('M20 refreshed X2 confirmation never replays slot reels or re-credits TAKE WIN',async()=>{
 const f=fixture(),s=f.session();let renders=0;
 const c=new GameController({session:s,scene:{reset(){},start(){renders++},settle(){renders++}}});
 c.connect(await s.connect());f.loseAfter();assert.equal(await c.gamble('RED'),false);
 assert.equal(c.phase,'confirm');assert.equal(c.status().actionKind,'GAMBLE');
 assert.equal(await c.reconcile(),true);assert.equal(renders,0);assert.equal(c.phase,'ready');
 assert.equal(c.status().gamble.stake,'4.00');assert.equal(c.status().lastAction.payout,'4.00');
 assert.equal(await c.takeWin(),true);assert.equal(c.status().gamble.available,false);assert.equal(c.status().gamble.reason,'WIN_TAKEN');
 assert.equal(f.metrics().debits,1);assert.equal(c.account.balance,'102.00');
});
test('M20 double X2 clicks send one choice and a failed balance refresh uses GET reconciliation only',async()=>{
 const f=fixture(),s=f.session();const c=new GameController({session:s,scene:{reset(){}}});c.connect(await s.connect());
 let release;f.hold(new Promise(r=>release=r));const pending=c.gamble('RED');assert.equal(await c.gamble('BLACK'),false);
 f.readFailure(true);release();assert.equal(await pending,false);assert.equal(c.phase,'confirm');
 assert.equal(c.status().actionPending,false);f.readFailure(false);assert.equal(await c.reconcile(),true);
 assert.equal(f.requests.filter(x=>x.body).length,1);assert.equal(f.metrics().debits,1);
});
test('M20 pending spin and X2 records cannot coexist or be overwritten by a new action',async()=>{
 const f=fixture(),s=f.session();await s.connect();f.loseBefore();await assert.rejects(s.gamble('RED'));
 f.storage.setItem(STORAGE_KEY,JSON.stringify({gameId:GAME_ID,roundToken:randomUUID(),sessionGuard:GUARD,bet:'1.00'}));
 await assert.rejects(f.session().connect(),/PERSISTED_ACTION_CONFLICT/);assert.equal(f.metrics().debits,0);
});

function autoFixture(wins){
 const f=fixture();let balance=10000n,calls=0;
 const session={phase:'READY',pending:null,spin:async()=>{
  const before=balance,payout=cents(wins[Math.min(calls,wins.length-1)]);calls++;balance=before-100n+payout;
  return {...structuredClone(f.parent),roundId:randomUUID(),finalWin:etb(payout),
   walletReceipt:{currency:'ETB',balanceBefore:etb(before),chargedStake:'1.00',finalWin:etb(payout),balanceAfter:etb(balance)}};
 },finish:async()=>({...f.state(),balance:etb(balance)})};
 const c=new GameController({session,scene:{reset(){},start(){},async settle(){}}});c.connect(f.state());
 return {c,calls:()=>calls};
}
for(const [name,wins,limits,expectedCount,reason] of [
 ['individual win',['2.00'],{winLimit:'2.00'},1,'WIN_LIMIT'],
 ['cumulative balance decrease',['0.00'],{lossLimit:'2.00'},2,'LOSS_LIMIT'],
 ['cumulative balance increase',['2.00'],{balanceIncreaseLimit:'2.00'},2,'BALANCE_INCREASE_LIMIT']
]){
 test('M20 AUTO stops exactly at '+name+' threshold after authoritative settlement',async()=>{
  const {c,calls}=autoFixture(wins);assert.equal(c.armAuto(25,limits),true);assert.equal(calls(),0);
  await c.startPlay();await new Promise(r=>setImmediate(r));assert.equal(calls(),expectedCount);
  assert.equal(c.auto.started,false);assert.equal(c.auto.armed,0);assert.equal(c.auto.stopReason,reason);
 });
}
test('M20 AUTO refuses invalid thresholds and no autoplay starts on count selection',async()=>{
 const {c,calls}=autoFixture(['0.00']);
 for(const options of [{winLimit:'0.00'},{lossLimit:'1'},{balanceIncreaseLimit:-1},{clientOdds:'2.00'}])assert.equal(c.armAuto(25,options),false);
 for(const count of [25,50,100,500,1000]){assert.equal(c.armAuto(count),true);assert.equal(calls(),0)}
});
test('M20 AUTO STOP between settlement and queued continuation prevents another request',async()=>{
 const {c,calls}=autoFixture(['0.00']);const original=globalThis.queueMicrotask,queued=[];
 globalThis.queueMicrotask=fn=>queued.push(fn);
 try{c.armAuto(25);await c.startPlay();assert.equal(calls(),1);assert.equal(queued.length,1);c.stopAuto();queued[0]();await Promise.resolve();assert.equal(calls(),1)}
 finally{globalThis.queueMicrotask=original}
});
test('M20 AUTO hide stops further starts while an already submitted spin settles',async()=>{
 const {c,calls}=autoFixture(['0.00']);let release;const original=c.scene.settle;
 c.scene.settle=()=>new Promise(r=>release=r);c.armAuto(25);const spin=c.startPlay();await Promise.resolve();c.onHidden();release();
 await spin;await new Promise(r=>setImmediate(r));assert.equal(calls(),1);assert.equal(c.auto.started,false);assert.equal(c.phase,'ready');c.scene.settle=original;
});

// A committed round outlives the current wager ladder and probability model.
// This fixture returns the historical stored receipt for replay-only requests,
// while checking the current model/ladder on every genuinely new wager.
function spinRecoveryFixture(){
 const source=fixture(),game=structuredClone(source.game),requests=[],records=new Map(),map=new Map();
 const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
 let balance=10000n,debits=0,tokens=0,loss=null,mutate=null,hold=null;
 const stateOptions={};
 const state=()=>({authenticated:true,currency:'ETB',sessionGuard:GUARD,balance:etb(balance),
  game:structuredClone(game),...structuredClone(stateOptions)});
 const request=async(path,body)=>{
  requests.push({path,body:body?structuredClone(body):null});
  if(path.startsWith('/api/slots/fresh-state'))return state();
  assert.equal(path,'/api/slots/spin');assert.equal(body.sessionGuard,GUARD);
  if(hold)await hold;
  if(loss==='before'){loss=null;throw fault('NETWORK_LOST',503)}
  let result=records.get(body.roundToken);
  if(!result){
   if(body.replayOnly===true)throw fault('ROUND_NOT_FOUND_FOR_REPLAY',404);
   assert.ok(game.betLevels.includes(body.bet),'new wager must use the current ladder');
   for(const key of ['mathVersion','engineVersion','mathSha256'])assert.equal(body[key],game[key],'new wager must use current math');
   const before=balance,payout=300n;balance=before-cents(body.bet)+payout;debits++;
   result={...structuredClone(source.parent),roundId:randomUUID(),bet:body.bet,
    mathVersion:body.mathVersion,engineVersion:body.engineVersion,mathSha256:body.mathSha256,
    finalWin:etb(payout),walletReceipt:{currency:'ETB',balanceBefore:etb(before),chargedStake:body.bet,
     finalWin:etb(payout),balanceAfter:etb(balance)}};
   records.set(body.roundToken,result);
  }
  if(loss==='after'){loss=null;throw fault('NETWORK_LOST',503)}
  const copy=structuredClone(result);return mutate?mutate(copy):copy;
 };
 return {game,stateOptions,state,storage,requests,
  session:()=>new Session({request,storage,uuid:()=>{tokens++;return randomUUID()}}),
  lose:where=>loss=where,mutate:f=>mutate=f,hold:p=>hold=p,
  metrics:()=>({debits,tokens,balance:etb(balance),posts:requests.filter(r=>r.body).length})};
}
async function saveLostSpin(f,where='after'){
 const session=f.session();await session.connect();f.lose(where);
 await assert.rejects(session.spin('2.00'),/NETWORK_LOST/);
 return JSON.parse(f.storage.getItem(STORAGE_KEY));
}
for(const [name,change] of [
 ['filtered current wager ladder',game=>game.betLevels=['1.00']],
 ['revised math identity',game=>Object.assign(game,{mathVersion:'qa-m20-next',engineVersion:'qa-existing-next',mathSha256:'c'.repeat(64)})],
 ['filtered ladder and revised math',game=>Object.assign(game,{betLevels:['1.00'],mathVersion:'qa-m20-next',engineVersion:'qa-existing-next',mathSha256:'c'.repeat(64)})]
]){
 test('M20 replays the original settled spin despite '+name+' without another debit',async()=>{
  const f=spinRecoveryFixture(),saved=await saveLostSpin(f);change(f.game);
  const resumed=f.session();await resumed.connect();assert.equal(resumed.phase,'WAITING_FOR_RESULT');
  const result=await resumed.recover();assert.equal(result.bet,saved.bet);
  for(const key of ['mathVersion','engineVersion','mathSha256'])assert.equal(result[key],saved[key]);
  assert.deepEqual(f.requests.filter(r=>r.body).at(-1).body,{...saved,replayOnly:true});
  assert.equal(f.storage.getItem(STORAGE_KEY),null);assert.equal(f.metrics().debits,1);assert.equal(f.metrics().tokens,1);
  const current=await resumed.finish();assert.deepEqual(current.game,f.game);assert.equal(current.balance,'101.00');
  if(!f.game.betLevels.includes('2.00')){
   await assert.rejects(resumed.spin('2.00'),/INVALID_BET/);
   assert.equal(f.metrics().posts,2,'historical receipt cannot authorize a removed stake');
  }
 });
}
test('M20 replay still rejects wrong original stake, math, symbols and settlement after current model changes',async()=>{
 const f=spinRecoveryFixture(),saved=await saveLostSpin(f);
 Object.assign(f.game,{betLevels:['1.00'],mathVersion:'qa-m20-next',mathSha256:'c'.repeat(64)});
 const resumed=f.session();await resumed.connect();
 for(const [patch,code] of [
  [r=>({...r,bet:'1.00'}),'RECEIPT_IDENTITY_MISMATCH'],
  [r=>({...r,mathVersion:f.game.mathVersion,mathSha256:f.game.mathSha256}),'RECEIPT_MATH_CHANGED'],
  [r=>({...r,grid:Array.from({length:3},()=>Array(5).fill('unverified-symbol'))}),'RECEIPT_GRID_INVALID'],
  [r=>({...r,walletReceipt:{...r.walletReceipt,balanceAfter:'1000.00'}}),'INVALID_AUTHORITATIVE_SETTLEMENT']
 ]){
  f.mutate(patch);await assert.rejects(resumed.recover(),{code});
  assert.deepEqual(JSON.parse(f.storage.getItem(STORAGE_KEY)),saved);assert.equal(resumed.phase,'WAITING_FOR_RESULT');
 }
 f.mutate(null);await resumed.recover();await resumed.finish();assert.equal(f.metrics().debits,1);
 assert.equal(f.metrics().tokens,1);assert.ok(f.requests.filter(r=>r.body).slice(1).every(r=>r.body.replayOnly===true));
});
for(const [name,change] of [
 ['stake removed',f=>f.game.betLevels=['1.00']],
 ['math revised',f=>f.game.mathVersion='qa-m20-next'],
 ['engine revised',f=>f.game.engineVersion='qa-existing-next'],
 ['math hash revised',f=>f.game.mathSha256='c'.repeat(64)],
 ['game disabled',f=>f.game.enabled=false],
 ['release disabled',f=>f.game.freshReleaseReady=false],
 ['house capacity unavailable',f=>f.game.wagerAvailability='house_capacity'],
 ['another active game',f=>f.stateOptions.blockedByActiveGame='fresh_other_game'],
 ['balance below saved stake',f=>f.stateOptions.balance='1.00']
]){
 test('M20 replay miss cannot turn into a new wager when '+name,async()=>{
  const f=spinRecoveryFixture(),saved=await saveLostSpin(f,'before');change(f);
  const resumed=f.session();await resumed.connect();
  await assert.rejects(resumed.recover(),{code:'SAVED_ROUND_REPLAY_ONLY'});
  await assert.rejects(resumed.recover(),{code:'SAVED_ROUND_REPLAY_ONLY'});
  assert.deepEqual(JSON.parse(f.storage.getItem(STORAGE_KEY)),saved);assert.equal(resumed.phase,'WAITING_FOR_RESULT');
  assert.equal(f.metrics().debits,0);assert.equal(f.metrics().tokens,1);assert.equal(f.metrics().posts,3);
  assert.ok(f.requests.filter(r=>r.body).slice(1).every(r=>r.body.replayOnly===true));
  await assert.rejects(resumed.spin('1.00'),/ROUND_NOT_READY/);assert.equal(f.metrics().posts,3);
 });
}
test('M20 eligible replay miss resubmits exactly the same original request and token once',async()=>{
 const f=spinRecoveryFixture(),saved=await saveLostSpin(f,'before'),resumed=f.session();
 await resumed.connect();await resumed.recover();await resumed.finish();
 const posts=f.requests.filter(r=>r.body).map(r=>r.body);
 assert.deepEqual(posts,[saved,{...saved,replayOnly:true},saved]);
 assert.equal(f.metrics().debits,1);assert.equal(f.metrics().tokens,1);assert.equal(resumed.account.balance,'101.00');
});
test('M20 controller restores pending original BET and moves to the current ladder only after recovery',async()=>{
 const f=spinRecoveryFixture(),saved=await saveLostSpin(f);
 Object.assign(f.game,{betLevels:['1.00'],mathVersion:'qa-m20-next',engineVersion:'qa-existing-next',mathSha256:'c'.repeat(64)});
 const resumed=f.session();let renders=0;
 const c=new GameController({session:resumed,scene:{reset(){},start(){},async settle(r){renders++;assert.equal(r.gameId,GAME_ID)}}});
 c.connect(await resumed.connect());assert.equal(c.phase,'confirm');assert.equal(c.bet,'2.00');
 assert.equal(await c.spin(),false);assert.equal(f.metrics().posts,1);
 assert.equal(await c.reconcile(),true);assert.equal(c.phase,'ready');assert.equal(renders,1);
 assert.equal(c.lastReceipt.bet,'2.00');assert.equal(c.lastReceipt.mathVersion,saved.mathVersion);
 assert.equal(c.account.game.mathVersion,f.game.mathVersion);assert.equal(c.bet,'1.00');
 assert.equal(c.setBet('2.00'),false);assert.equal(await c.spin(),true);
 const last=f.requests.filter(r=>r.body).at(-1).body;
 assert.equal(last.bet,'1.00');assert.equal(last.mathVersion,f.game.mathVersion);
 assert.notEqual(last.roundToken,saved.roundToken);assert.equal(f.metrics().debits,2);
});
test('M20 controller keeps replay-only state without starting or rendering a replacement wager',async()=>{
 const f=spinRecoveryFixture(),saved=await saveLostSpin(f,'before');f.game.betLevels=['1.00'];
 const resumed=f.session();let renders=0;
 const c=new GameController({session:resumed,scene:{reset(){},start(){renders++},settle(){renders++}}});
 c.connect(await resumed.connect());assert.equal(await c.reconcile(),false);
 assert.equal(c.phase,'confirm');assert.equal(c.error,'SAVED_ROUND_REPLAY_ONLY');assert.equal(c.bet,'2.00');
 assert.equal(c.pending,false);assert.equal(renders,0);assert.equal(f.metrics().debits,0);
 assert.deepEqual(JSON.parse(f.storage.getItem(STORAGE_KEY)),saved);
});
test('M20 AUTO stops after settlement if the current ladder removes its selected BET',async()=>{
 const f=spinRecoveryFixture(),session=f.session();
 const c=new GameController({session,scene:{reset(){},start(){},async settle(){f.game.betLevels=['1.00']}}});
 c.connect(await session.connect());assert.equal(c.setBet('2.00'),true);c.armAuto(25);
 assert.equal(await c.startPlay(),true);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.metrics().posts,1);assert.equal(f.metrics().debits,1);
 assert.equal(c.phase,'ready');assert.equal(c.bet,'1.00');assert.equal(c.auto.started,false);
 assert.equal(c.auto.stopReason,'BET_LEVEL_CHANGED');
});
test('M20 late historical replay cannot overwrite a replacement Player session',async()=>{
 const f=spinRecoveryFixture(),saved=await saveLostSpin(f),resumed=f.session();await resumed.connect();
 let release;f.hold(new Promise(resolve=>release=resolve));
 const recovery=resumed.recover();resumed.logout();release();
 await assert.rejects(recovery,/STALE_SESSION_RESPONSE/);
 assert.equal(resumed.account,null);assert.equal(resumed.phase,'DISCONNECTED');
 assert.deepEqual(JSON.parse(f.storage.getItem(STORAGE_KEY)),saved);assert.equal(f.metrics().debits,1);
});
test('M20 saved historical requests still require the original session, canonical stake and complete math identity',async()=>{
 const f=spinRecoveryFixture(),saved=await saveLostSpin(f);
 for(const patch of [
  {sessionGuard:'e'.repeat(64)},{gameId:'fresh_multihot5burnwilds'},{roundToken:'invalid'},
  {bet:'2'},{bet:'0.20'},{bet:'1.05'},{bet:'40000.20'},
  {mathVersion:''},{engineVersion:''},{mathSha256:'invalid'}
 ]){
  f.storage.setItem(STORAGE_KEY,JSON.stringify({...saved,...patch}));
  await assert.rejects(f.session().connect());assert.equal(f.metrics().posts,1);
  assert.ok(f.storage.getItem(STORAGE_KEY),'invalid saved data is never silently erased');
 }
});
for(const [code,status] of [['PLAYER_LOGIN_REQUIRED',401],['PLAYER_SESSION_CHANGED',403]]){
 test('M20 '+code+' clears stale account controls and retains the pending spin for its original Player',async()=>{
  const f=spinRecoveryFixture(),session=f.session(),request=session.request;
  let attempts=0;
  session.request=async(path,body)=>{if(body){attempts++;throw fault(code,status)}return request(path,body)};
  const c=new GameController({session,scene:{reset(){},start(){},pauseAudio(){}}});
  c.connect(await session.connect());c.armAuto(25);assert.equal(await c.startPlay(),false);
  assert.equal(c.phase,'disconnected');assert.equal(c.account,null);assert.equal(c.pending,false);
  assert.equal(c.auto.started,false);assert.equal(c.error,code);assert.equal(session.account,null);
  assert.equal(session.phase,'DISCONNECTED');assert.equal(attempts,1);assert.equal(f.metrics().debits,0);
  const saved=JSON.parse(f.storage.getItem(STORAGE_KEY));assert.equal(saved.sessionGuard,GUARD);
  const resumed=f.session();await resumed.connect();assert.equal(resumed.phase,'WAITING_FOR_RESULT');
  assert.equal(resumed.pending.roundToken,saved.roundToken,'reauthentication preserves the original request');
 });
}
test('M20 login expiry during X2 clears stale account but keeps the exact pending card action',async()=>{
 const f=fixture(),session=f.session(),c=new GameController({session,scene:{reset(){},pauseAudio(){}}});
 c.connect(await session.connect());f.reject(fault('PLAYER_SESSION_CHANGED',403));
 assert.equal(await c.gamble('RED'),false);assert.equal(c.phase,'disconnected');assert.equal(c.account,null);
 assert.equal(session.account,null);assert.equal(f.metrics().debits,0);
 const saved=JSON.parse(f.storage.getItem(GAMBLE_STORAGE_KEY));assert.equal(saved.choice,'RED');assert.equal(saved.sessionGuard,GUARD);
});
test('M20 session change during post-spin refresh clears old display without another wager',async()=>{
 const f=spinRecoveryFixture(),session=f.session();
 const c=new GameController({session,scene:{reset(){},start(){},pauseAudio(){},async settle(){f.stateOptions.sessionGuard='e'.repeat(64)}}});
 c.connect(await session.connect());assert.equal(await c.spin(),true);
 assert.equal(c.phase,'disconnected');assert.equal(c.error,'SESSION_CHANGED');assert.equal(c.account,null);
 assert.equal(session.account,null);assert.equal(f.metrics().debits,1);assert.equal(f.metrics().posts,1);
 assert.equal(f.storage.getItem(STORAGE_KEY),null,'the validated settled receipt was already acknowledged');
});
test('M20 TAKE WIN authentication failure clears the old account without a debit or payout',async()=>{
 const f=fixture(),session=f.session(),c=new GameController({session,scene:{reset(){},pauseAudio(){}}});
 c.connect(await session.connect());session.request=async()=>{throw fault('PLAYER_LOGIN_REQUIRED',401)};
 assert.equal(await c.takeWin(),false);assert.equal(c.phase,'disconnected');assert.equal(c.account,null);
 assert.equal(session.account,null);assert.equal(f.metrics().debits,0);assert.equal(f.requests.filter(r=>r.body).length,0);
});
test('M20 recovery authentication failure preserves the committed round token without exposing the old balance',async()=>{
 const f=spinRecoveryFixture(),saved=await saveLostSpin(f),session=f.session();
 const c=new GameController({session,scene:{reset(){},pauseAudio(){}}});c.connect(await session.connect());
 session.request=async()=>{throw fault('PLAYER_LOGIN_REQUIRED',401)};
 assert.equal(await c.reconcile(),false);assert.equal(c.phase,'disconnected');assert.equal(c.account,null);
 assert.equal(session.account,null);assert.equal(f.metrics().debits,1);
 assert.deepEqual(JSON.parse(f.storage.getItem(STORAGE_KEY)),saved);
});
test('M20 recovering a losing SPIN after X2 and TAKE WIN cannot display the previous action payout',async()=>{
 const f=fixture(),session=f.session();let displayed=null;
 const c=new GameController({session,scene:{reset(){},start(){},async settle(r){displayed=r}}});
 c.connect(await session.connect());assert.equal(await c.gamble('RED'),true);
 assert.equal(c.lastAction.payout,'4.00');assert.equal(c.lastAction.roundId,PARENT);
 assert.equal(await c.takeWin(),true);assert.equal(c.takenRoundId,PARENT);
 f.loseAfter();assert.equal(await c.spin(),false);assert.equal(c.phase,'confirm');
 assert.equal(f.metrics().debits,2,'one X2 stake and one spin have committed');
 assert.equal(await c.reconcile(),true);assert.equal(c.phase,'ready');
 const state=c.status();assert.notEqual(state.lastReceipt.roundId,PARENT);assert.equal(state.lastReceipt.finalWin,'0.00');
 assert.equal(state.lastAction,null);assert.equal(c.takenRoundId,null);assert.equal(state.gamble.lastResult,null);
 assert.equal(displayed.roundId,state.lastReceipt.roundId);
 const card=state.gamble.lastResult??state.lastAction;
 assert.equal(card?card.payout:state.lastReceipt.finalWin,'0.00','displayed payout belongs to the recovered spin');
 assert.equal(f.metrics().debits,2,'recovery never adds another debit');assert.equal(c.account.balance,'101.00');
});
test('M20 TAKE WIN keeps the local choice closed after a failed ledger read and GET-only recovery',async()=>{
 const f=fixture(),session=f.session(),c=new GameController({session,scene:{reset(){}}});
 c.connect(await session.connect());f.readFailure(true);
 assert.equal(await c.takeWin(),false);assert.equal(c.phase,'confirm');
 f.readFailure(false);assert.equal(await c.reconcile(),true);
 assert.equal(c.phase,'ready');assert.equal(c.status().gamble.available,false);
 assert.equal(c.status().gamble.reason,'WIN_TAKEN');assert.equal(c.takenRoundId,PARENT);
 assert.equal(f.requests.filter(r=>r.body).length,0);assert.equal(f.metrics().debits,0);
 assert.equal(c.account.balance,'100.00');assert.equal(await c.gamble('RED'),false);
});
test('M20 X2 cannot target a later server round while an earlier receipt is displayed',async()=>{
 const f=fixture(),session=f.session();f.spinWin('2.00');
 let displayed=null,later=null;
 const scene={reset(){displayed=null},restore(r){displayed=r},start(){},async settle(r){
  displayed=r;
  // Another tab settles the same game before the first tab refreshes its
  // wallet. The latest authoritative balance must still be accepted.
  const other=f.session();await other.connect();later=await other.spin('1.00');await other.finish();
 }};
 const c=new GameController({session,scene});c.connect(await session.connect());
 assert.equal(await c.spin(),true);assert.equal(c.phase,'ready');
 assert.notEqual(displayed.roundId,later.roundId);assert.equal(c.lastReceipt.roundId,displayed.roundId);
 assert.equal(c.account.round.result.roundId,later.roundId);assert.equal(c.account.balance,'102.00');
 assert.equal(c.status().gamble.roundId,later.roundId);assert.equal(c.status().gamble.available,false);
 assert.equal(c.status().gamble.reason,'ROUND_CHANGED');
 assert.equal(await c.gamble('RED'),false);
 assert.equal(f.requests.filter(r=>r.path==='/api/slots/gamble').length,0);
 assert.equal(f.metrics().debits,2,'the stale displayed round creates no X2 debit');
 const current=await session.connect();c.connect(current);
 // Root app restores the authenticated parent on reconnect before it exposes
 // its win actions. A matching displayed round may use X2 normally.
 scene.restore(current.round.result);c.lastReceipt=current.round.result;
 assert.equal(c.status().gamble.available,true);assert.equal(await c.gamble('RED'),true);
 assert.equal(f.requests.filter(r=>r.path==='/api/slots/gamble')[0].body.roundId,displayed.roundId);
 assert.equal(c.lastAction.roundId,later.roundId);assert.equal(c.account.balance,'104.00');
 assert.equal(f.metrics().debits,3);
});
