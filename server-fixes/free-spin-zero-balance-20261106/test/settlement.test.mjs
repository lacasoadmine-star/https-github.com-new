// Executes the extracted live SQL settlement function with an isolated in-memory transaction adapter.
// It does not connect to PostgreSQL/Redis or prove database locking semantics.
import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {bindSettle as original} from '../src/production-settle-original.mjs';
import {bindSettle as fixed} from '../src/production-settle-fixed.mjs';
import {MATH,getGame,spin,toUnits,mathSha256} from './runtime-core.mjs';
import {bindHelpers} from '../src/production-helpers.mjs';
const req={uid:'synthetic-player'},body={gameId:'wild_multi_stars',bet:'2.00',roundToken:'synthetic-round-token-001'};
function harness({balance=10000n,remaining=0,enabled=true,bind=fixed,faultAt=null,win='0.0000',bonus=0}={}){
 let state={balance,house:1000000000n,remaining,freeBet:200n,rounds:new Map(),actions:new Map(),ledger:[],history:[]},draws=0,failPoint=faultAt;
 const oldSpin=spin('wild_multi_stars','2.00',{draw:()=>0});const locks=new Set();
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 const {cents,keyOK,settlementReceipt}=bindHelpers(fail);
 const c={async query(sql,values=[]){
  if(sql.startsWith('SELECT request_hash,result_json')){const prior=state.rounds.get(values[1]);return {rowCount:prior?1:0,rows:prior?[prior]:[]};}
  if(sql.startsWith('SELECT 1 FROM sw_nine.actions'))return {rowCount:state.actions.has(values[1])?1:0,rows:[]};
  if(sql.startsWith('SELECT remaining,bet'))return {rowCount:1,rows:[{remaining:state.remaining,bet:state.freeBet.toString()}]};
  if(sql.startsWith('INSERT INTO sw_nine.free_spins')){state.remaining=values[2];state.freeBet=BigInt(values[3]);return {};}
  if(sql.startsWith('INSERT INTO sw_nine.game_rounds')){assert(!state.rounds.has(values[7]));state.rounds.set(values[7],{request_hash:values[8],result_json:JSON.parse(values[9]),math_sha256:values[10]});return {};}
  if(sql.startsWith('INSERT INTO sw_rebuild.rounds')){state.history.push(values);return {};}
  throw Error('UNEXPECTED_SQL:'+sql.slice(0,80));
 }};
 const deps={MATH,getGame,toUnits,mathSha256,fail,cents,integer:BigInt,accepting:enabled,keyOK,hash:x=>createHash('sha256').update(x).digest('hex'),
  authenticate:async r=>{assert.equal(r.uid,req.uid);return r.uid;},lockWallets:async()=>{},houseFor:()=> 'synthetic-house',
  balance:async(_c,id)=>id===req.uid?state.balance:state.house,
  locked:async(uid,token,fn)=>{const key=uid+token;if(locks.has(key))fail(409,'REQUEST_IN_PROGRESS');locks.add(key);try{return await fn();}finally{locks.delete(key);}},
  transaction:async fn=>{const before=structuredClone(state);try{return await fn(c);}catch(e){state=before;throw e;}},
  spin:(id,bet,opts)=>{draws++;return {...structuredClone(oldSpin),gameId:id,bet,isFree:opts.isFree,chargedStake:opts.isFree?'0.0000':'2.0000',finalWin:win,bonusSpinsAwarded:bonus};},
  move:async(_c,uid,round,game,kind,amount,from,to)=>{assert(amount>0n);assert(!state.ledger.some(t=>t.round===round&&t.kind===kind));const delta=to===uid?amount:-amount;state.balance+=delta;state.house-=delta;state.ledger.push({round,kind,amount,playerDelta:delta,houseDelta:-delta});},
  fault:point=>{if(point===failPoint)throw Error('SYNTHETIC_FAULT_'+point);},
  settlementReceipt
 };
 return {settle:bind(deps),state:()=>state,draws:()=>draws,clearFault:()=>{failPoint=null;},setEnabled:v=>{deps.accepting=v;return bind(deps);}};
}
test('reproduces production regression: awarded free spin at zero balance is rejected',async()=>{const h=harness({balance:0n,remaining:2,bind:original});await assert.rejects(h.settle(req,body),e=>e.status===402&&e.message==='INSUFFICIENT_FUNDS');assert.equal(h.draws(),0);assert.equal(h.state().remaining,2);});
test('one-line fix completes awarded legacy free spin at zero balance with no debit',async()=>{const h=harness({balance:0n,remaining:2});const r=await h.settle(req,body);assert.equal(r.isFree,true);assert.equal(r.chargedStake,'0.00');assert.equal(r.finalWin,'0.00');assert.equal(r.freeSpinsRemaining,1);assert.equal(h.state().ledger.length,0);assert.equal(h.state().rounds.size,1);assert.equal(r.mathVersion,'2026-10-27-reference-v3000');});
test('paid zero-balance round is still rejected without drawing or writing',async()=>{const h=harness({balance:0n});await assert.rejects(h.settle(req,body),/INSUFFICIENT_FUNDS/);assert.equal(h.draws(),0);assert.equal(h.state().rounds.size,0);});
test('legacy free-spin bet lock and retrigger count remain unchanged',async()=>{const h=harness({balance:0n,remaining:2,bonus:12});await assert.rejects(h.settle(req,{...body,bet:'1.00'}),/FREE_SPIN_BET_LOCKED/);const r=await h.settle(req,body);assert.equal(r.freeSpinsRemaining,13);assert.equal(h.state().freeBet,200n);});
test('paid round transfers once, floors once to cents and balances both ledger sides',async()=>{const h=harness({win:'1.2399'});const r=await h.settle(req,body);assert.equal(r.chargedStake,'2.00');assert.equal(r.finalWin,'1.23');assert.equal(r.balanceAfter,'99.23');assert.equal(h.state().ledger.length,2);assert(h.state().ledger.every(t=>t.playerDelta+t.houseDelta===0n));assert.equal(h.state().balance+h.state().house,1000010000n);});
test('duplicate token replays original saved receipt even after release disable and never redraws',async()=>{const h=harness({win:'1.2399'});const first=await h.settle(req,body);const disabled=h.setEnabled(false);const replay=await disabled(req,body);assert.deepEqual(replay,first);assert.equal(replay.mathSha256,mathSha256);assert.equal(h.draws(),1);assert.equal(h.state().ledger.length,2);assert.equal(h.state().rounds.size,1);});
test('same token with changed parameters rejects before drawing',async()=>{const h=harness();await h.settle(req,body);await assert.rejects(h.settle(req,{...body,bet:'1.00'}),/IDEMPOTENCY_PARAMETER_CONFLICT/);assert.equal(h.draws(),1);});
test('spin token cannot collide with an earlier action token',async()=>{const h=harness();h.state().actions.set(body.roundToken,{});await assert.rejects(h.settle(req,body),/IDEMPOTENCY_PARAMETER_CONFLICT/);assert.equal(h.draws(),0);assert.equal(h.state().ledger.length,0);});
for(const point of ['after_debit','after_credit','before_commit'])test(`failure ${point} rolls back wallet, ledger, free state and receipt; same-token retry settles once`,async()=>{const h=harness({faultAt:point,win:'1.2399'});const before=structuredClone(h.state());await assert.rejects(h.settle(req,body),new RegExp('SYNTHETIC_FAULT_'+point));assert.deepEqual(h.state(),before);h.clearFault();const result=await h.settle(req,body);assert.equal(result.balanceAfter,'99.23');assert.equal(h.state().ledger.length,2);assert.equal(h.state().rounds.size,1);});
test('concurrent same-token requests cannot both debit in the injected production lock boundary',async()=>{const h=harness();const results=await Promise.allSettled([h.settle(req,body),h.settle(req,body)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.message,'REQUEST_IN_PROGRESS');assert.equal(h.draws(),1);assert.equal(h.state().rounds.size,1);assert.equal(h.state().ledger.length,1);});
test('winning zero-balance free spin credits only once, including duplicate response recovery',async()=>{const h=harness({balance:0n,remaining:2,win:'1.2399'});const r=await h.settle(req,body);assert.equal(r.chargedStake,'0.00');assert.equal(r.balanceAfter,'1.23');assert.equal(r.netChange,'1.23');assert.equal(r.freeSpinsRemaining,1);assert.deepEqual(h.state().ledger.map(t=>t.kind),['WIN']);const replay=await h.settle(req,body);assert.deepEqual(replay,r);assert.equal(h.state().remaining,1);assert.equal(h.draws(),1);assert.equal(h.state().ledger.length,1);});
test('negative wallet balances reject both paid and free requests',async()=>{for(const remaining of [0,2]){const h=harness({balance:-1n,remaining});await assert.rejects(h.settle(req,body),/INSUFFICIENT_FUNDS/);assert.equal(h.draws(),0);assert.equal(h.state().rounds.size,0);}});
test('invalid, zero and negative bets reject without drawing or modifying state',async()=>{for(const bet of ['-2.00','0.00','NaN','2.001',2,null]){const h=harness({balance:0n,remaining:2});await assert.rejects(h.settle(req,{...body,bet}),/GAME_BET_OR_TOKEN_INVALID/);assert.equal(h.draws(),0);assert.equal(h.state().remaining,2);}});
test('exact-balance paid round still spends only its stake and can finish at zero',async()=>{const h=harness({balance:200n});const r=await h.settle(req,body);assert.equal(r.balanceAfter,'0.00');assert.equal(r.chargedStake,'2.00');assert.equal(r.netChange,'-2.00');assert.equal(h.state().ledger.length,1);});
