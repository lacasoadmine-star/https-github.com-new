import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createExistingServerRoutes} from './existing-server-routes.mjs';
import {validateModel as validateM20,validateReceipt as receiptM20} from '../multihot20/controller.mjs';
import {validateModel as validateBurn,validateReceipt as receiptBurn} from '../multihot5burnwilds/controller.mjs';
import {Session as M20Session} from '../multihot20/session.mjs';
import {Session as BurnSession} from '../multihot5burnwilds/session.mjs';

// Real exhaustive-audit candidate files, copied only inside this test. The
// approved test variants never overwrite the original artifacts or live gates.
const candidates=JSON.parse(await readFile(new URL('./independent-operator-audit.json',import.meta.url),'utf8')).results;
const user='qa-existing-player',house='qa-existing-house',cookie='c'.repeat(64);
const hash=value=>createHash('sha256').update(value).digest('hex');
const guard=hash('fresh-account-session-v1\0'+user+'\0'+cookie);
const token='dc0cc50f-61eb-45f5-8221-762f5c20bcc2';
const cash=value=>`${BigInt(value)/100n}.${String(BigInt(value)%100n).padStart(2,'0')}`;
const request=()=>new Request('https://existing-player.invalid/api/slots/spin',{
 method:'POST',headers:{cookie:'sw_session='+cookie}});
const rejection=(code,status)=>Object.assign(new Error(code),{code,status});
function fixture(gameId,{approved=false,reserve=1000000000n,activeGame=null}={}){
 let profile={...structuredClone(candidates[gameId].profile),
  ...(approved?{productionApproved:true,probabilityModelAudited:true,auditReference:'QA_ONLY_NOT_PRODUCTION'}:{})};
 const state={auth:true,lockedAuth:true,catalogueUp:true,profileUp:true,accepting:true,operator:true,
  releaseReady:true,activeGame,reserve};
 let db={wallets:{[user]:1000000n,[house]:reserve},rounds:new Map(),moves:[],legacy:[]};
 const metrics={profiles:0,transactions:0,auth:0,catalogue:0};let serial=Promise.resolve();
 const transaction=fn=>{
  const work=serial.catch(()=>{}).then(async()=>{
   metrics.transactions++;const local=structuredClone(db);
   const client={state:local,async query(sql,args){
    if(sql.startsWith('SELECT game_id FROM sw_native_library.rounds'))return {rows:state.activeGame?[{game_id:state.activeGame}]:[],rowCount:state.activeGame?1:0};
    if(sql.startsWith('SELECT r.round_id,r.result_json,r.created_at,r.total_win')){
     const found=[...local.rounds.values()].filter(r=>r.user_id===args[0]&&r.game_id===args[1]).at(-1);
     return {rows:found?[found]:[],rowCount:found?1:0};
    }
    if(sql.startsWith('SELECT request_hash,result_json FROM sw_nine.game_rounds')){
     const found=local.rounds.get(args[0]+'|'+args[1]);return{rows:found?[found]:[],rowCount:found?1:0};
    }
    if(sql.startsWith('SELECT 1 FROM sw_nine.actions'))return{rows:[],rowCount:0};
    if(sql.startsWith('INSERT INTO sw_nine.game_rounds')){
     const [round_id,user_id,game_id,bet,base,total_win,wheel,key,request_hash,json]=args;
     assert.equal(bet,base);assert.ok(!local.rounds.has(user_id+'|'+key));
     local.rounds.set(user_id+'|'+key,{round_id,user_id,game_id,total_win,request_hash,result_json:JSON.parse(json),created_at:'2026-11-21T00:00:00Z'});
     return{rows:[],rowCount:1};
    }
    if(sql.startsWith('INSERT INTO sw_rebuild.rounds')){local.legacy.push(args);return{rows:[],rowCount:1}}
    throw Error('UNEXPECTED_TEST_SQL:'+sql);
   }};
   const result=await fn(client);db=local;return result;
  });serial=work.catch(()=>{});return work;
 };
 const dependencies={
  authenticate:async(req,client,locked)=>{
   metrics.auth++;if(!state.auth||locked&&!state.lockedAuth)throw rejection('ACTIVE_PLAYER_SESSION_REQUIRED',401);
   assert.ok(req.headers.get('cookie'));return user;
  },transaction,lockWallets:async client=>Object.entries(client.state.wallets).map(([id,balance])=>({id,balance})),
  move:async(client,uid,roundId,id,kind,amount,from,to)=>{
   assert.equal(uid,user);assert.equal(id,gameId);assert.ok(amount>0n&&client.state.wallets[from]>=amount);
   client.state.wallets[from]-=amount;client.state.wallets[to]+=amount;
   client.state.moves.push({roundId,kind,amount});
  },balance:async(client,id)=>client.state.wallets[id],houseFor:()=>house,hash,cash,
  accepting:()=>state.accepting,sessionGuard:()=>guard,
  publicGames:()=>{metrics.catalogue++;if(!state.catalogueUp)throw Error('CATALOGUE_OUTAGE');return [{id:gameId,freshReleaseReady:state.releaseReady,betLevels:['0.20','1.00','1.05','1.20','2.00','40000.00']}]},
  profileForGame:async id=>{metrics.profiles++;assert.equal(id,gameId);if(!state.profileUp)throw Error('PROFILE_OUTAGE');return profile},
  assertOperatorWagerEnabled:async()=>{if(!state.operator)throw rejection('OPERATOR_RELEASE_DISABLED',503)},
  assertNoActive:async()=>{if(state.activeGame)throw rejection('FINISH_ACTIVE_ROUND:'+state.activeGame,409)},
  assertPlayerCapacity:async()=>{},
 };
 const routes=createExistingServerRoutes(dependencies);
 const body=()=>({gameId,bet:'1.00',roundToken:token,sessionGuard:guard,
  mathVersion:profile.mathVersion,engineVersion:profile.engineVersion,mathSha256:profile.mathSha256});
 return {routes,dependencies,state,metrics,body,db:()=>db,changeProfile:value=>{profile=value},profile:()=>profile};
}

test('requires exact existing-service dependencies; handles only the two additive game IDs',()=>{
 assert.throws(()=>createExistingServerRoutes({}),/EXISTING_RAILWAY_DEPENDENCY_REQUIRED_authenticate/);
 const f=fixture('fresh_multihot20');
 assert.equal(f.routes.handles('fresh_multihot20'),true);assert.equal(f.routes.handles('fresh_multihot5burnwilds'),true);
 for(const id of ['fresh_multihot10','multihot40_native','/api/slots/spin',null,'__proto__'])assert.equal(f.routes.handles(id),false);
});

for(const [gameId,validateModel,validateReceipt] of [
 ['fresh_multihot20',validateM20,receiptM20],['fresh_multihot5burnwilds',validateBurn,receiptBurn]]){
 test(gameId+' authenticates before profile, catalogue, transaction or balance disclosure',async()=>{
  const f=fixture(gameId);f.state.auth=false;
  await assert.rejects(()=>f.routes.state(request(),gameId),e=>e.status===401);
  await assert.rejects(()=>f.routes.spin(request(),f.body()),e=>e.status===401);
  assert.equal(f.metrics.profiles,0);assert.equal(f.metrics.catalogue,0);assert.equal(f.metrics.transactions,0);
 });
 test(gameId+' exposes the independent candidate truthfully without enabling wagering or leaking strips',async()=>{
  const f=fixture(gameId),result=await f.routes.state(request(),gameId);
  assert.equal(validateModel(result.game),result.game);
  assert.equal(result.authenticated,true);assert.equal(result.balance,'10000.00');assert.equal(result.sessionGuard,guard);
  assert.equal(result.game.enabled,false);assert.equal(result.game.freshReleaseReady,false);
  assert.equal(result.game.providerRngReproduced,false);assert.equal(result.game.providerCertified,false);
  assert.equal(result.game.modelKind,'independent_operator_probability_model');
  assert.equal(result.game.offlineExactEnumerationVerified,true);
  assert.ok(result.game.betLevels.includes('1.00'));assert.ok(!result.game.betLevels.includes('0.20'));
  assert.ok(!result.game.betLevels.includes('1.05'),'full provider denomination is enforced in the ladder');
  assert.doesNotMatch(JSON.stringify(result),/reelStrips|wheelWeights|auditReference|qa-existing-house/);
  assert.equal(f.db().moves.length,0);assert.equal(f.db().rounds.size,0);
  await assert.rejects(()=>f.routes.spin(request(),f.body()),/UNCERTIFIED_MATH_PROFILE/);
  assert.equal(f.db().moves.length,0);
 });
 test(gameId+' guard and client profile/math overrides cannot reach model storage or settlement',async()=>{
  const f=fixture(gameId,{approved:true});
  await assert.rejects(()=>f.routes.spin(request(),{...f.body(),sessionGuard:'0'.repeat(64)}),e=>e.code==='PLAYER_SESSION_CHANGED'&&e.status===403);
  for(const overrides of [{profile:f.profile()},{reelStrips:[]},{wheelWeights:[1,1,1,1,1]},{productionApproved:true},{paytable:{seven:{5:999999}}},{grid:[]}]){
   await assert.rejects(()=>f.routes.spin(request(),{...f.body(),...overrides}),/CLIENT_MATH_OR_PROFILE_OVERRIDE_NOT_ALLOWED/);
  }
  assert.equal(f.metrics.profiles,0);assert.equal(f.metrics.transactions,0);assert.equal(f.db().moves.length,0);
 });
 test(gameId+' approved QA copy uses the existing ledger and both dedicated-client receipt validators',async()=>{
  const f=fixture(gameId,{approved:true}),account=await f.routes.state(request(),gameId);
  assert.equal(account.game.enabled,true);assert.equal(validateModel(account.game),account.game);
  const [a,b]=await Promise.all([f.routes.spin(request(),f.body()),f.routes.spin(request(),f.body())]);
  assert.deepEqual(a,b);assert.equal(validateReceipt(a,account.game,'1.00'),a);
  assert.equal(a.providerRngReproduced,false);assert.equal(a.providerCertified,false);
  assert.equal(f.db().moves.filter(move=>move.kind==='BET').length,1);
  assert.equal(f.db().rounds.size,1);assert.equal(f.db().legacy.length,1);
  assert.equal(f.db().wallets[user],1000000n-100n+BigInt(a.finalWin.replace('.','')));
  const refreshed=await f.routes.state(request(),gameId);
  assert.equal(refreshed.balance,a.walletReceipt.balanceAfter);
  assert.equal(refreshed.round.result.roundId,a.roundId);
 });
 test(gameId+' same-token replay survives profile/catalogue outage and disabled release without a new debit',async()=>{
  const f=fixture(gameId,{approved:true}),a=await f.routes.spin(request(),f.body());
  const priorProfiles=f.metrics.profiles,priorCatalogue=f.metrics.catalogue;
  f.state.profileUp=false;f.state.catalogueUp=false;f.state.operator=false;f.state.accepting=false;
  const b=await f.routes.spin(request(),{...f.body(),replayOnly:true});
  assert.deepEqual(b,a);assert.equal(f.metrics.profiles,priorProfiles);assert.equal(f.metrics.catalogue,priorCatalogue);
  assert.equal(f.db().moves.filter(move=>move.kind==='BET').length,1);
  await assert.rejects(()=>f.routes.spin(request(),{...f.body(),replayOnly:true,roundToken:'72e5ade4-52e6-42f5-a4ad-49b6b7c3dad9'}),/ROUND_NOT_FOUND_FOR_REPLAY/);
  assert.equal(f.db().moves.filter(move=>move.kind==='BET').length,1);
 });
 test(gameId+' current dedicated Session completes connect, server spin and ledger refresh through these hooks',async()=>{
  const f=fixture(gameId,{approved:true}),entries=new Map();
  const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
  const Session=gameId==='fresh_multihot20'?M20Session:BurnSession;
  const session=new Session({storage,uuid:()=>token,request:async(path,body)=>{
   if(path==='/api/slots/fresh-state?gameId='+gameId)return f.routes.state(request(),gameId);
   assert.equal(path,'/api/slots/spin');return f.routes.spin(request(),body);
  }});
  const before=await session.connect();assert.equal(before.balance,'10000.00');assert.equal(session.phase,'READY');
  const receipt=await session.spin('1.00');assert.equal(session.phase,'SHOWING_RESULT');
  assert.equal(session.account.balance,receipt.walletReceipt.balanceAfter);assert.equal(entries.size,0);
  const after=await session.finish();assert.equal(session.phase,'READY');
  assert.equal(after.balance,receipt.walletReceipt.balanceAfter);assert.equal(after.round.result.roundId,receipt.roundId);
  assert.equal(f.db().moves.filter(move=>move.kind==='BET').length,1);
 });
 test(gameId+' active library ownership remains visible and blocks debit in the existing transaction',async()=>{
  const f=fixture(gameId,{approved:true,activeGame:'other_existing_game'});
  const account=await f.routes.state(request(),gameId);assert.equal(account.blockedByActiveGame,'other_existing_game');
  await assert.rejects(()=>f.routes.spin(request(),f.body()),/FINISH_ACTIVE_ROUND:other_existing_game/);
  assert.equal(f.db().moves.length,0);
 });
 test(gameId+' house-capacity state preserves a readable disabled model and rejects actual debit',async()=>{
  const f=fixture(gameId,{approved:true,reserve:1n}),account=await f.routes.state(request(),gameId);
  assert.equal(validateModel(account.game),account.game);
  assert.equal(account.game.wagerAvailability,'house_capacity');assert.deepEqual(account.game.availableBetLevels,[]);
  await assert.rejects(()=>f.routes.spin(request(),f.body()),/HOUSE_RESERVE_INSUFFICIENT/);
  assert.equal(f.db().moves.length,0);
 });
}

test('invalid catalogue stakes and current model tampering cannot start a ledger transaction',async()=>{
 const f=fixture('fresh_multihot5burnwilds',{approved:true});
 for(const bet of ['1.05','0.20','3.00','40000.10'])await assert.rejects(()=>f.routes.spin(request(),{...f.body(),bet}),/BET_OUTSIDE_EXISTING_LADDER/);
 assert.equal(f.metrics.transactions,0);assert.equal(f.metrics.profiles,0);
 await assert.rejects(()=>f.routes.spin(request(),{...f.body(),mathSha256:'0'.repeat(64)}),/PLAYER_MATH_VERSION_STALE/);
 assert.equal(f.metrics.transactions,0);assert.equal(f.db().moves.length,0);
});

test('current release, locked authentication and server profile provenance remain independent gates',async()=>{
 for(const gate of ['releaseReady','accepting','operator']){
  const f=fixture('fresh_multihot20',{approved:true});f.state[gate]=false;
  assert.equal((await f.routes.state(request(),'fresh_multihot20')).game.enabled,false);
  await assert.rejects(()=>f.routes.spin(request(),f.body()),/RELEASE.*(?:DISABLED|ENABLED)/);
  assert.equal(f.db().moves.length,0);
 }
 const f=fixture('fresh_multihot20',{approved:true});f.state.lockedAuth=false;
 await assert.rejects(()=>f.routes.state(request(),'fresh_multihot20'),e=>e.status===401);
 await assert.rejects(()=>f.routes.spin(request(),f.body()),e=>e.status===401);
 assert.equal(f.db().moves.length,0);
 const wrong=fixture('fresh_multihot20');wrong.changeProfile({...wrong.profile(),providerRngReproduced:true});
 await assert.rejects(()=>wrong.routes.state(request(),'fresh_multihot20'),/INDEPENDENT_OPERATOR_PROFILE_REQUIRED/);
});
