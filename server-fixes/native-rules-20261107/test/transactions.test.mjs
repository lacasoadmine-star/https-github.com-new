import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { bindTransactions } from '../artifacts/transaction-bodies.mjs';
import { runtime, legacy, revised } from '../artifacts/versioned-core.mjs';

const uid='synthetic-player',gameId='hot_foxy_20';
const hash=x=>createHash('sha256').update(x).digest('hex');
const cash=x=>{x=BigInt(x);return `${x/100n}.${String(x%100n).padStart(2,'0')}`;};
const cents=x=>BigInt(Math.round(Number(x)*100));
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const key=()=>randomUUID();
const seed=initial=>{let x=initial;return n=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x%n;};};

function harness(options={}){
 let state={wallets:{[uid]:options.player??100000n,house:options.house??1000000000n},rounds:[],actions:[],free:{remaining:options.remaining??0,bet:options.freeBet??'100'},moves:[],mirror:[]};
 let calls=0,queue=Promise.resolve();
 const rows=a=>({rowCount:a.length,rows:a});
 const query=async(sql,p)=>{
  if(sql.startsWith('SELECT request_hash,result_json FROM sw_nine.game_rounds'))return rows(state.rounds.filter(r=>r.user_id===p[0]&&r.request_key===p[1]));
  if(sql.startsWith('SELECT request_hash,result_json FROM sw_nine.actions'))return rows(state.actions.filter(r=>r.user_id===p[0]&&r.request_key===p[1]));
  if(sql.startsWith('SELECT 1 FROM sw_nine.actions WHERE user_id'))return rows(state.actions.filter(r=>r.user_id===p[0]&&r.request_key===p[1]));
  if(sql.startsWith('SELECT 1 FROM sw_nine.game_rounds WHERE user_id')&&sql.includes('request_key'))return rows(state.rounds.filter(r=>r.user_id===p[0]&&r.request_key===p[1]));
  if(sql.startsWith('SELECT remaining,bet FROM sw_nine.free_spins'))return rows([state.free]);
  if(sql.startsWith('INSERT INTO sw_nine.free_spins')){state.free={remaining:p[2],bet:p[3]};return rows([]);}
  if(sql.startsWith('INSERT INTO sw_nine.game_rounds')){
   state.rounds.push({round_id:p[0],user_id:p[1],game_id:p[2],bet:p[3],base_bet:p[4],total_win:p[5],request_key:p[7],request_hash:p[8],result_json:JSON.parse(p[9]),math_sha256:p[10],is_free:p[11],created_at:new Date().toISOString()});return rows([]);
  }
  if(sql.startsWith('INSERT INTO sw_rebuild.rounds')){state.mirror.push(p);return rows([]);}
  if(sql.startsWith('SELECT * FROM sw_nine.game_rounds'))return rows(state.rounds.filter(r=>r.round_id===p[0]&&r.user_id===p[1]));
  if(sql.startsWith('SELECT 1 FROM sw_nine.game_rounds')&&sql.includes('created_at>'))return rows([]);
  if(sql.startsWith('SELECT attempt,result_json FROM sw_nine.actions'))return rows(state.actions.filter(r=>r.parent_id===p[0]&&r.kind==='GAMBLE').sort((a,b)=>b.attempt-a.attempt).slice(0,1));
  if(sql.startsWith('INSERT INTO sw_nine.actions')){state.actions.push({id:p[0],parent_id:p[1],user_id:p[2],kind:p[3],request_key:p[4],request_hash:p[5],attempt:p[6],result_json:JSON.parse(p[7])});return rows([]);}
  throw new Error('Unexpected query: '+sql);
 };
 const dependencies={...runtime,authenticate:async()=>uid,keyOK:x=>typeof x==='string'&&x.length>=16,fail,hash,
  locked:async(u,k,fn)=>{const old=queue;let done;queue=new Promise(r=>done=r);await old;try{return await fn();}finally{done();}},
  transaction:async fn=>{const before=structuredClone(state);try{return await fn({query});}catch(e){state=before;throw e;}},
  lockWallets:async()=>{},accepting:true,integer:BigInt,cents,cash,balance:async(c,id)=>state.wallets[id],houseFor:()=> 'house',
  spin:(id,bet,opts)=>{calls++;return runtime.spin(id,bet,{...opts,draw:options.draw?.()??seed(options.seed??17)});},
  move:async(c,u,r,g,kind,amount,from,to)=>{if(state.wallets[from]<amount)fail(from===uid?402:503,'INSUFFICIENT_FUNDS');state.wallets[from]-=amount;state.wallets[to]+=amount;state.moves.push({roundId:r,kind,amount,from,to});},
  fault:point=>{if(point===options.fault)throw new Error('INJECTED_FAULT');},
  settlementReceipt:(b,s,w,a)=>{assert.equal(b-s+w,a);return {currency:'ETB',balanceBefore:cash(b),chargedStake:cash(s),finalWin:cash(w),balanceAfter:cash(a),netChange:Number(w-s)/100<0?'-'+cash(s-w):cash(w-s)};},
  randomUUID,gambleDraw:(choice,stake)=>legacy.gambleDraw(choice,stake,()=>0),
 };
 const api=bindTransactions(dependencies);
 return {...api,get state(){return state;},get spinCalls(){return calls;},
  addParent(core=legacy,bet='1.00',win=100n){const r=core.spin(gameId,bet,{draw:seed(2)});r.finalWin=cash(win);const row={round_id:r.roundId,user_id:uid,game_id:gameId,bet:String(cents(bet)),base_bet:String(cents(bet)),total_win:String(win),created_at:new Date().toISOString(),request_key:key(),request_hash:'unused',result_json:r};state.rounds.push(row);return row;},
 };
}
const body=(overrides={})=>({gameId,bet:'1.00',roundToken:key(),...runtime.modelIdentity(gameId),...overrides});
const error=message=>e=>e.message===message;

test('known current request settles once, records active hash and balances double-entry',async()=>{
 const h=harness(),b=body();const before=h.state.wallets[uid]+h.state.wallets.house;
 const r=await h.settle({},b);assert.equal(r.mathSha256,revised.mathSha256);assert.equal(h.state.rounds[0].math_sha256,revised.mathSha256);
 assert.equal(r.chargedStake,'1.00');assert.equal(h.state.wallets[uid]+h.state.wallets.house,before);
 assert.deepEqual(await h.settle({},b),r);assert.equal(h.spinCalls,1);assert.equal(h.state.rounds.length,1);assert.equal(h.state.mirror.length,1);
});
test('unversioned/stale paid request is rejected before any movement or record',async()=>{
 for(const pin of [{mathVersion:undefined},{mathVersion:'2026-10-27-reference-v3000'},{mathSha256:'unknown'},{engineVersion:'unknown'}]){
  const h=harness(),before=structuredClone(h.state);await assert.rejects(h.settle({},body(pin)),error('GAME_RULES_UPDATED_RELOAD'));assert.deepEqual(h.state,before);assert.equal(h.spinCalls,0);
 }
});
test('old receipt with removed200ETB bet replays before new model or allowed-bet guards',async()=>{
 const h=harness(),parent=h.addParent(legacy,'200.00'),b={gameId,bet:'200.00',roundToken:parent.request_key};
 parent.request_hash=hash(JSON.stringify({uid,gameId,bet:b.bet,action:'SPIN'}));const before=structuredClone(h.state);
 assert.deepEqual(await h.settle({},b),parent.result_json);assert.deepEqual(h.state,before);assert.equal(h.spinCalls,0);
 await assert.rejects(h.settle({},{...b,bet:'400.00'}),error('IDEMPOTENCY_PARAMETER_CONFLICT'));
});
test('old maximum4000ETB paid receipts replay for both targets; new attempts cannot spend it',async()=>{
 for(const id of [gameId,'multi_hot_5_video']){
  const h=harness(),p=h.addParent(legacy,'4000.00');p.game_id=id;p.result_json=legacy.spin(id,'4000.00',{draw:seed(2)});
  const b={gameId:id,bet:'4000.00',roundToken:p.request_key};p.request_hash=hash(JSON.stringify({uid,gameId:id,bet:b.bet,action:'SPIN'}));
  const before=structuredClone(h.state);assert.deepEqual(await h.settle({},b),p.result_json);assert.deepEqual(h.state,before);assert.equal(h.spinCalls,0);
  await assert.rejects(h.settle({},{...b,roundToken:key()}),error('GAME_RULES_UPDATED_RELOAD'));
  await assert.rejects(h.settle({},{...b,roundToken:key(),...runtime.modelIdentity(id)}),error('GAME_BET_OR_TOKEN_INVALID'));
  await assert.rejects(h.settle({},{...b,roundToken:'bad'}),error('GAME_BET_OR_TOKEN_INVALID'));
  assert.deepEqual(h.state,before);assert.equal(h.spinCalls,0);
 }
});
test('zero-balance owed free spin keeps removed bet and full legacy retrigger rules',async()=>{
 const g=legacy.getGame(gameId),stops=g.reelStrips.map(s=>s.indexOf('scatter'));
 const h=harness({player:0n,remaining:2,freeBet:'20000',draw:()=>{let i=0;return n=>(stops[i++]??0)%n;}});
 const r=await h.settle({},{gameId,bet:'200.00',roundToken:key()});
 assert.equal(r.isFree,true);assert.equal(r.chargedStake,'0.00');assert.equal(r.mathSha256,legacy.mathSha256);assert.equal(r.bonusSpinsAwarded,10);assert.equal(r.freeSpinsRemaining,11);assert.equal(h.state.moves.some(m=>m.kind==='BET'),false);
});
test('owed free spin enforces its original locked bet',async()=>{
 const h=harness({remaining:2,freeBet:'20000'});await assert.rejects(h.settle({},{gameId,bet:'100.00',roundToken:key()}),error('FREE_SPIN_BET_LOCKED'));assert.equal(h.spinCalls,0);
});
test('last earned free is legacy, following paid request is current',async()=>{
 const h=harness({remaining:1,seed:17});const old=await h.settle({},{gameId,bet:'1.00',roundToken:key()});assert.equal(old.mathSha256,legacy.mathSha256);assert.equal(old.freeSpinsRemaining,0);
 const before=structuredClone(h.state);await assert.rejects(h.settle({},body(runtime.modelIdentity(gameId,{legacy:true}))),error('GAME_RULES_UPDATED_RELOAD'));assert.deepEqual(h.state,before);
 const next=await h.settle({},body());assert.equal(next.isFree,false);assert.equal(next.mathSha256,revised.mathSha256);
});
test('insufficient player or house funds prevent new settlement',async()=>{
 for(const [options,reason] of [[{player:0n},'INSUFFICIENT_FUNDS'],[{house:1n},'HOUSE_RESERVE_INSUFFICIENT']]){
  const h=harness(options),before=structuredClone(h.state);await assert.rejects(h.settle({},body()),error(reason));assert.deepEqual(h.state,before);assert.equal(h.spinCalls,0);
 }
});
for(const fault of ['after_debit','after_credit','before_commit'])test(`transaction rollback preserves wallets/history at ${fault}`,async()=>{
 const h=harness({fault}),before=structuredClone(h.state);await assert.rejects(h.settle({},body()),error('INJECTED_FAULT'));assert.deepEqual(h.state,before);
});
test('simultaneous duplicate calls produce one spin and same receipt',async()=>{
 const h=harness(),b=body(),results=await Promise.all([h.settle({},b),h.settle({},b)]);assert.deepEqual(results[0],results[1]);assert.equal(h.spinCalls,1);assert.equal(h.state.rounds.length,1);
});
test('current parent allows five gambles, legacy parent allows three',async()=>{
 for(const [core,max] of [[legacy,3],[revised,5]]){
  const h=harness(),p=h.addParent(core);for(let i=1;i<=max;i++){
   const r=await h.action({},{roundId:p.round_id,roundToken:key(),choice:'RED'},'GAMBLE');assert.equal(r.attempt,i);assert.equal(r.maxAttempts,max);
  }
  const before=structuredClone(h.state);await assert.rejects(h.action({},{roundId:p.round_id,roundToken:key(),choice:'RED'},'GAMBLE'),error('GAMBLE_LIMIT'));assert.deepEqual(h.state,before);
 }
});
test('unknown parent identity cannot authorize a new gamble; saved action still replays',async()=>{
 const h=harness(),p=h.addParent(revised),b={roundId:p.round_id,roundToken:key(),choice:'BLACK'};
 const r=await h.action({},b,'GAMBLE');p.result_json.mathSha256='unknown';const before=structuredClone(h.state);
 assert.deepEqual(await h.action({},b,'GAMBLE'),r);assert.deepEqual(h.state,before);
 await assert.rejects(h.action({},{...b,roundToken:key()},'GAMBLE'),error('ROUND_MODEL_NOT_SUPPORTED'));assert.deepEqual(h.state,before);
});
test('explicit new local operator profile allows500ETB stake but blocks over500 before debit',async()=>{
 for(const id of [gameId,'multi_hot_5_video']){
  const h=harness({player:1000000n}),p=h.addParent(revised,'1.00',50000n);p.game_id=id;p.result_json=revised.spin(id,'1.00',{draw:seed(2)});
  const first={roundId:p.round_id,roundToken:key(),choice:'RED'},r=await h.action({},first,'GAMBLE');assert.equal(r.stake,'500.0000');assert.equal(r.payout,'1000.00');
  const before=structuredClone(h.state);assert.deepEqual(await h.action({},first,'GAMBLE'),r);
  await assert.rejects(h.action({},{...first,roundToken:key()},'GAMBLE'),error('GAMBLE_STAKE_LIMIT'));assert.deepEqual(h.state,before);
  const over=h.addParent(revised,'1.00',50001n);over.game_id=id;over.result_json=revised.spin(id,'1.00',{draw:seed(2)});const afterParent=structuredClone(h.state);
  await assert.rejects(h.action({},{roundId:over.round_id,roundToken:key(),choice:'RED'},'GAMBLE'),error('GAMBLE_STAKE_LIMIT'));assert.deepEqual(h.state,afterParent);
 }
});
test('legacy parent over500ETB retains its original gamble entitlement',async()=>{
 const h=harness({player:1000000n}),p=h.addParent(legacy,'1.00',50100n),r=await h.action({},{roundId:p.round_id,roundToken:key(),choice:'RED'},'GAMBLE');assert.equal(r.stake,'501.0000');assert.equal(r.maxAttempts,3);
});
test('stale concurrent-tab gamble state is rejected atomically before debit',async()=>{
 const h=harness(),p=h.addParent(revised),first={roundId:p.round_id,roundToken:key(),choice:'RED',expectedStake:'1.0000',expectedAttempt:1};
 const accepted=await h.action({},first,'GAMBLE');assert.equal(accepted.payout,'2.00');
 const before=structuredClone(h.state);await assert.rejects(h.action({},{...first,roundToken:key()},'GAMBLE'),error('GAMBLE_STATE_CHANGED'));assert.deepEqual(h.state,before);
 // Replaying an accepted key returns its original receipt even after another action and mismatched new guards.
 assert.deepEqual(await h.action({},{...first,expectedStake:'999.0000',expectedAttempt:5},'GAMBLE'),accepted);assert.deepEqual(h.state,before);
 const next=await h.action({},{...first,roundToken:key(),expectedStake:'2.00',expectedAttempt:2},'GAMBLE');assert.equal(next.attempt,2);assert.equal(next.stake,'2.0000');
});
test('each optional expected gamble guard validates independently; absent guards retain old behavior',async()=>{
 for(const fields of [{expectedStake:'1.0001'},{expectedStake:1},{expectedStake:'NaN'},{expectedAttempt:2},{expectedAttempt:'1'},{expectedAttempt:1.5}]){
  const h=harness(),p=h.addParent(revised),before=structuredClone(h.state);
  await assert.rejects(h.action({},{roundId:p.round_id,roundToken:key(),choice:'RED',...fields},'GAMBLE'),error('GAMBLE_STATE_CHANGED'));assert.deepEqual(h.state,before);
 }
 for(const fields of [{},{expectedStake:'1.00'},{expectedAttempt:1}]){
  const h=harness(),p=h.addParent(legacy);const r=await h.action({},{roundId:p.round_id,roundToken:key(),choice:'RED',...fields},'GAMBLE');assert.equal(r.attempt,1);
 }
});
test('replayOnly recovers an already settled action but cannot create a new gamble',async()=>{
 const h=harness(),p=h.addParent(legacy),original={roundId:p.round_id,roundToken:key(),choice:'RED'};
 const accepted=await h.action({},original,'GAMBLE');
 // Another tab advances the parent; the legacy saved key must still return its original receipt.
 await h.action({},{...original,roundToken:key()},'GAMBLE');
 const before=structuredClone(h.state);assert.deepEqual(await h.action({},{...original,replayOnly:true},'GAMBLE'),accepted);assert.deepEqual(h.state,before);
 await assert.rejects(h.action({},{...original,roundToken:key(),replayOnly:true},'GAMBLE'),error('GAMBLE_STATE_CHANGED'));assert.deepEqual(h.state,before);
 const missing=harness();await assert.rejects(missing.action({},{roundId:randomUUID(),roundToken:key(),choice:'RED',replayOnly:true},'GAMBLE'),error('GAMBLE_STATE_CHANGED'));assert.equal(missing.state.actions.length,0);assert.equal(missing.state.moves.length,0);
});
