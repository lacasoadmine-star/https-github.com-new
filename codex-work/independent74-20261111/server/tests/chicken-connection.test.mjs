import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import * as math from '../../math/official72.mjs';
import {createExistingLibrary74Adapter,integerRngFromLibrary} from '../existing-library74-adapter.mjs';
import {createRetainedLibrary74Fixture} from './support/retained-library-fixture.mjs';
import {seededRandom} from './support/retained-library/library-service.mjs';
import {createDemoStorageFixture} from './support/demo-storage-fixture.mjs';
import {demo74Catalog,handleDemo74Request,handleDemo74Alarm} from '../demo74-worker.mjs';

const ID='ind74_official_chickenhighway',EPOCH=1794355200000;
const ledgerKey='independent74:demo:ledger:v1';
const startBody=version=>({request_id:randomUUID(),type:'start',game_id:ID,model_version:version,stake:'1.00',options:{mode:'easy'}});
const command=(round,action='sync',input={})=>({request_id:randomUUID(),type:'action',game_id:ID,model_version:round.model_version,round_id:round.round_id,expected_version:round.version,action,input});
function adapter(){return createExistingLibrary74Adapter({reviewedGameIds:[ID],allowNewRounds:true,gameLimits:{[ID]:{maxBetMinor:'2000',maxWinMinor:'999999999999999'}}});}

async function nativeFixture(){
  let now=EPOCH;
  const roundId='95000000-0000-4000-8000-000000000001';let seed;
  // Select disposable fixture entropy to guarantee three safe crossings;
  // actual retained HMAC sampling and every financial method remain intact.
  for(let i=0;i<100;i++){
    const candidate=createHash('sha256').update('isolated-chicken-presence:'+i).digest('hex');
    const round=math.startRound({gameId:ID,betMinor:'100',options:{mode:'easy'},now,rng:integerRngFromLibrary(seededRandom(candidate,roundId+':0'))});
    if(round.private.survival.slice(0,3).every(Boolean)){seed=candidate;break;}
  }
  assert(seed);
  const f=await createRetainedLibrary74Fixture({isolated:true,now:()=>now,seed:()=>seed,id:()=>roundId});
  const user=f.fixtureUserId;
  return {...f,user,get now(){return now;},setTime(value){now=value;},advance(ms){now+=ms;},
    start:()=>f.facade.action(user,startBody(f.facade.adapter.definitions[ID].version)),
    balance:async who=>BigInt((await f.sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[who??user]))[0].balance),
    stored:async()=> (await f.sql.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1',[roundId]))[0],
    total:async()=> (await f.sql.unsafe('SELECT SUM(balance)::text AS value FROM sw_rebuild.wallets'))[0].value,
  };
}
function demoFixture({beforeOperation}={}){
  let now=EPOCH;
  const ctx=createDemoStorageFixture({beforeOperation}),guard='a'.repeat(64),game=demo74Catalog().games.find(g=>g.id===ID);
  const request=async(route,body,gameId=ID)=>{
    const response=await handleDemo74Request(ctx,new Request('https://isolated.invalid/independent74-demo-internal/'+route+(body?'':'?game_id='+gameId),{
      method:body?'POST':'GET',headers:{'x-demo-session-guard':guard,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})
    }),{now:()=>now,random:()=>0});
    return {status:response.status,data:await response.json()};
  };
  return {ctx,game,request,get now(){return now;},advance(ms){now+=ms;},setTime(value){now=value;},
    start:()=>request('action',startBody(game.version)),
    alarm:()=>handleDemo74Alarm(ctx,{now:()=>now,random:()=>0}),
    saved:()=>structuredClone(ctx.data),
  };
}

test('Chicken lease has a strict8second boundary; empty sync changes no draw, stake, step or award',()=>{
  const a=adapter(),d=a.definitions[ID];assert.equal(d.mathVersion,'official72-chickenhighway-r4');
  assert.equal(d.connectionPolicy.disconnectAfterMs,8000);assert.equal(d.connectionPolicy.includesAutoplay,true);assert.equal(d.connectionPolicy.stateReadsRenew,false);
  const start=a.start(ID,{stakeMinor:'100',mode:'easy'},()=>0,EPOCH),state=start.state;
  assert.equal(state.expiresAt,EPOCH+8001);assert.equal(state.mathState.step,1);
  assert(a.publicState(state,EPOCH+8000).allowedActions.includes('sync'));
  assert.equal(a.publicState(state,EPOCH+8000).connectionDeadlineAt,EPOCH+8001);
  assert.throws(()=>a.expire(state,()=>{throw Error('unexpected RNG');},EPOCH+8000),/ROUND_NOT_EXPIRED/);
  let draws=0;const renewed=a.act(state,{type:'sync'},()=>{draws++;return 0;},EPOCH+8000);
  assert.equal(draws,0);assert.equal(renewed.debitMinor,'0');assert.equal(renewed.payoutMinor,null);assert.equal(renewed.maxPayoutMinor,start.maxPayoutMinor);
  assert.deepEqual(renewed.state.mathState,state.mathState);assert.equal(renewed.state.expiresAt,EPOCH+16001);
  for(const supplied of [{now:EPOCH+99999},{expiresAt:EPOCH+99999},{disconnected:false},{payoutMinor:'999999'}])assert.throws(()=>a.act(state,{type:'sync',...supplied},()=>0,EPOCH+1),/INVALID_LIBRARY_OPTIONS/);
  const expired=a.act(state,{type:'sync'},()=>{throw Error('unexpected RNG');},EPOCH+8001);
  assert.equal(expired.state.status,'settled');assert.equal(expired.payoutMinor,'102');assert.equal(expired.state.settlementReason,'CONNECTION_TIMEOUT_CASHOUT');
  assert.throws(()=>a.act(expired.state,{type:'sync'},()=>0,EPOCH+9000),/ROUND_ALREADY_SETTLED/);
});

test('retained ledger does not renew Chicken on reads or receipt replay and pays timeout once',{timeout:60000},async t=>{
  const f=await nativeFixture();t.after(()=>f.close());
  const before=await f.balance(),total=await f.total(),started=await f.start();assert.equal(started.round.status,'active');
  const initial=await f.stored();assert.equal(Number(initial.expires_at),EPOCH+8001);assert.equal(await f.balance(),before-100n);
  f.advance(2000);const heartbeat=command(started.round),accepted=await f.facade.action(f.user,heartbeat);
  assert.equal(accepted.round.connectionDeadlineAt,EPOCH+10001);
  f.advance(3000);const replay=await f.facade.action(f.user,heartbeat);assert.equal(replay.replayed,true);
  const reloaded=await f.facade.state(f.user,ID);assert.equal(reloaded.round.connectionDeadlineAt,EPOCH+10001);assert.equal(reloaded.round.step,1);
  assert.equal((await f.stored()).state.lastActionAt,EPOCH+2000);assert.equal(await f.balance(),before-100n);
  f.setTime(EPOCH+10000);assert.equal((await f.service.reconcile()).settled,0);
  f.advance(1);assert.equal((await f.service.reconcile()).settled,1);assert.equal((await f.service.reconcile()).settled,0);
  const final=await f.facade.state(f.user,ID);assert.equal(final.round.status,'settled');assert.equal(final.round.payoutMinor,'102');assert.equal(final.round.settlementReason,'CONNECTION_TIMEOUT_CASHOUT');
  assert.equal(await f.balance(),before+2n);assert.equal(await f.balance(initial.reserve_wallet),0n);assert.equal(await f.total(),total);
  assert.equal((await f.sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'",[f.user])).length,1);
  assert.equal((await f.sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_win'",[f.user])).length,1);
  const lateReplay=await f.facade.action(f.user,heartbeat);assert.equal(lateReplay.replayed,true);assert.equal(await f.balance(),before+2n);
});

test('retained concurrent duplicate heartbeats and a late new heartbeat cannot extend or resurrect an expired award',{timeout:60000},async t=>{
  const f=await nativeFixture();t.after(()=>f.close());const before=await f.balance(),started=await f.start();
  f.advance(2000);const heartbeat=command(started.round),results=await Promise.all(Array.from({length:6},()=>f.facade.action(f.user,heartbeat)));
  assert.equal(results.filter(r=>!r.replayed).length,1);assert.equal(Number((await f.stored()).version),1);
  const current=results.find(r=>!r.replayed).round;
  await assert.rejects(f.facade.action(f.user,command(started.round)),/ROUND_VERSION_CHANGED/);
  f.setTime(EPOCH+10001);const late=command(current),settled=await f.facade.action(f.user,late);
  assert.equal(settled.round.status,'settled');assert.equal(settled.round.step,1);assert.equal(await f.balance(),before+2n);
  assert.equal((await f.facade.action(f.user,late)).replayed,true);
  await assert.rejects(f.facade.action(f.user,command(current,'reveal',{cell:1})),/ROUND_ALREADY_SETTLED/);
  assert.equal(await f.balance(),before+2n);
});

test('the existing retained scheduler rechecks an old alarm after heartbeat and recovers the new deadline',{timeout:60000},async t=>{
  const f=await nativeFixture();t.after(()=>f.close());const callbacks=[];
  f.service.autoTimers=true;f.service.setTimer=(callback,delay)=>{const timer={callback,delay,unref(){}};callbacks.push(timer);return timer;};f.service.clearTimer=()=>{};
  const before=await f.balance(),started=await f.start();await f.service.schedule(f.user);const original=callbacks.at(-1);
  assert.equal(original.delay,8003);
  f.advance(4000);await f.facade.action(f.user,command(started.round));await f.service.schedule(f.user);
  f.setTime(EPOCH+8003);await original.callback();assert.equal((await f.stored()).status,'active');assert.equal(await f.balance(),before-100n);
  f.service.timers.clear();await f.service.recoverTimers();const recovered=callbacks.at(-1);assert.equal(recovered.delay,4000);
  f.setTime(EPOCH+12003);await recovered.callback();await recovered.callback();
  assert.equal((await f.stored()).status,'settled');assert.equal(await f.balance(),before+2n);
  assert.equal((await f.sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_win'",[f.user])).length,1);
});

test('DEMO alarm commits with Chicken acceptance, respects8000ms exactly and credits an absent player once',async()=>{
  const h=demoFixture(),started=await h.start();assert.equal(started.status,200,JSON.stringify(started.data));assert.equal(h.ctx.alarmAt,EPOCH+8001);
  const pending=h.saved();h.advance(8000);assert.equal(await h.alarm(),true);assert.equal(h.ctx.alarmAt,EPOCH+8001);assert.deepEqual(h.saved(),pending);
  h.advance(1);assert.equal(await h.alarm(),true);assert.equal(h.ctx.alarmAt,null);
  const settled=h.saved();await h.alarm();assert.deepEqual(h.saved(),settled);
  const state=await h.request('state');assert.equal(state.data.round.status,'settled');assert.equal(state.data.round.payoutMinor,'102');assert.equal(state.data.balance,'10000.02');assert.equal(state.data.round.settlementReason,'CONNECTION_TIMEOUT_CASHOUT');
  assert.equal((await h.request('history')).data.history.length,1);
});

test('DEMO read/replay cannot renew; accepted heartbeat renews and a stale alarm uses the persisted new deadline',async()=>{
  const h=demoFixture(),started=await h.start();h.advance(3000);
  await h.request('state');assert.equal(h.ctx.alarmAt,EPOCH+8001);
  const body=command(started.data.round),heartbeat=await h.request('action',body);assert.equal(heartbeat.status,200);assert.equal(h.ctx.alarmAt,EPOCH+11001);
  h.advance(3000);const replay=await h.request('action',body);assert.equal(replay.data.replayed,true);assert.equal(h.ctx.alarmAt,EPOCH+11001);
  h.setTime(EPOCH+8001);await h.alarm();assert.equal(h.ctx.alarmAt,EPOCH+11001);assert.equal((await h.request('state')).data.round.status,'active');
  h.setTime(EPOCH+11001);const late=command(heartbeat.data.round),result=await h.request('action',late);
  assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.round.status,'settled');assert.equal(result.data.balance,'10000.02');assert.equal(h.ctx.alarmAt,null);
  assert.equal((await h.request('action',late)).data.replayed,true);await h.alarm();assert.equal((await h.request('state')).data.balance,'10000.02');
});

test('DEMO concurrent heartbeat/collect/timeout delivery never duplicates a Chicken debit or payout',async()=>{
  const h=demoFixture(),started=await h.start();h.advance(2000);const heartbeat=command(started.data.round);
  const same=await Promise.all(Array.from({length:6},()=>h.request('action',heartbeat)));
  assert.equal(same.filter(r=>r.status===200&&!r.data.replayed).length,1);assert(same.every(r=>r.status===200));
  const round=same.find(r=>!r.data.replayed).data.round,collect=command(round,'collect'),sync=command(round);
  const raced=await Promise.all([h.request('action',collect),h.request('action',sync),h.alarm()]);
  assert.equal(raced[0].status,200);assert.equal(raced[1].status,409);assert.equal(raced[2],true);
  const state=await h.request('state');assert.equal(state.data.balance,'10000.02');assert.equal(state.data.round.status,'settled');assert.equal(h.ctx.alarmAt,null);
  assert.equal((await h.request('action',collect)).data.replayed,true);assert.equal((await h.request('history')).data.history.length,1);
});

test('DEMO alarm failures roll back both credits and scheduling; retry uses the same stored earned award',async()=>{
  let failure='setAlarm';const h=demoFixture({beforeOperation:kind=>{if(kind===failure)throw Error('injected storage failure');}});
  const failed=await h.start();assert.equal(failed.status,500);assert.equal(h.ctx.data.size,0);assert.equal(h.ctx.alarmAt,null);
  failure=null;const started=await h.start();assert.equal(started.status,200);const prior=h.saved();h.advance(8001);
  failure='put';await assert.rejects(h.alarm(),/injected storage failure/);assert.deepEqual(h.saved(),prior);assert.equal(h.ctx.alarmAt,EPOCH+8001);
  failure=null;await h.alarm();assert.equal((await h.request('state')).data.balance,'10000.02');assert.equal(h.ctx.alarmAt,null);
});

test('independent alarm ownership never settles a held slot, legacy object or unrecognized prior model',async()=>{
  const legacy=createDemoStorageFixture();legacy.data.set('legacy-balance','unchanged');assert.equal(await handleDemo74Alarm(legacy),false);assert.deepEqual([...legacy.data],[['legacy-balance','unchanged']]);
  const h=demoFixture(),slot=demo74Catalog().games.find(g=>g.gamble?.enabled&&!g.chargingFeature);
  const response=await h.request('action',{...startBody(slot.version),game_id:slot.id,options:{holdWin:true}},slot.id);assert.equal(response.status,200);assert.equal(response.data.round.status,'active');assert.equal(h.ctx.alarmAt,null);
  const held=h.saved();await h.alarm();assert.deepEqual(h.saved(),held);
  const old=demoFixture(),active=await old.start();const row=old.ctx.data.get('independent74:demo:round:'+active.data.round.round_id);
  row.modelVersion='library74-v1:unavailable-prior-chicken';old.advance(8001);const untouched=old.saved();await old.alarm();assert.deepEqual(old.saved(),untouched);
  const recovery=await old.request('state');assert.equal(recovery.data.recovery_required,true);assert.equal(recovery.data.round.status,'active');assert.deepEqual(recovery.data.round.allowedActions,[]);
});

test('missing transactional alarm capability refuses Chicken acceptance without changing DEMO credits',async()=>{
  const ctx=createDemoStorageFixture(),transaction=ctx.storage.transaction;
  ctx.storage.transaction=operation=>transaction(tx=>{delete tx.setAlarm;return operation(tx);});
  const game=demo74Catalog().games.find(g=>g.id===ID),body=startBody(game.version);
  const response=await handleDemo74Request(ctx,new Request('https://isolated.invalid/independent74-demo-internal/action',{method:'POST',headers:{'x-demo-session-guard':'a'.repeat(64),'content-type':'application/json'},body:JSON.stringify(body)}),{now:()=>EPOCH,random:()=>0});
  assert.equal(response.status,503);assert.equal((await response.json()).error.code,'DEMO_RECOVERY_SCHEDULER_REQUIRED');assert.equal(ctx.data.size,0);assert.equal(ctx.alarmAt,null);
});
