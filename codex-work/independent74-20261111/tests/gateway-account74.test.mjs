import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createLocalMachine74Harness} from './support/machine74-local-harness.mjs';
import {validateNativeAction,createGateway} from '../gateway.mjs';

test('isolated library74 fixture transport uses retained signature verifier, session gate and ledger end to end',async t=>{
  const h=await createLocalMachine74Harness({isolated:true});t.after(()=>h.close());
  const id='ind74_official_rollx',prefix='/independent74/account-api/';
  const request=async(path,{body,cookie=true,origin=h.base,guard,headers={}}={})=>fetch(h.base+path,{method:body?'POST':'GET',headers:{...(cookie?{cookie:'sw_session='+h.token}:{}),...(body?{origin,'content-type':'application/json','x-independent74-session':guard||''}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const catalog=await request(prefix+'catalog',{cookie:false});assert.equal(catalog.status,200);assert.equal((await catalog.json()).games.length,72);
  const missing=await request(prefix+'state?game_id='+id,{cookie:false});assert.equal(missing.status,401);assert.equal(h.metrics.states,0);
  const state=await (await request(prefix+'state?game_id='+id)).json();assert.equal(state.authenticated,true);assert.equal(state.currency,'ETB');assert.equal(state.game.id,id);assert.match(state.sessionGuard,/^[a-f0-9]{64}$/);assert.equal(state.user_id,undefined);
  const action={request_id:randomUUID(),game_id:id,model_version:state.game.version,type:'start',stake:'1.00',options:{target:50}};
  for(const wrong of [{origin:'https://other.invalid',guard:state.sessionGuard},{guard:'0'.repeat(64)},{guard:state.sessionGuard,cookie:false}]){
    const response=await request(prefix+'action',{body:action,...wrong});assert.ok([401,403].includes(response.status));
  }
  assert.equal(h.metrics.actions,0);
  const started=await request(prefix+'action',{body:action,guard:state.sessionGuard});assert.equal(started.status,200);const result=await started.json();assert.equal(result.round.status,'settled');assert.equal(result.round.stakeMinor,'100');assert.equal(result.round.game_id,id);assert.equal(result.round.revealed_seed,undefined);assert.equal(result.round.private,undefined);
  const replay=await (await request(prefix+'action',{body:action,guard:state.sessionGuard})).json();assert.equal(replay.replayed,true);assert.equal(replay.round.round_id,result.round.round_id);assert.equal(replay.current_balance,result.balance);
  const history=await (await request(prefix+'history?game_id='+id)).json();assert.equal(history.game_id,id);assert.equal(history.history.length,1);assert.equal(history.history[0].round_id,result.round.round_id);
  const rows=await h.fixture.sql.unsafe('SELECT count(*)::int AS n FROM sw_native_library.rounds');assert.equal(rows[0].n,1);
  const deltas=await h.fixture.sql.unsafe('SELECT transfer_id,sum(delta)::text AS net,count(*)::int AS legs FROM sw_rebuild.ledger GROUP BY transfer_id');assert.ok(deltas.length>0);for(const entry of deltas){assert.equal(entry.net,'0');assert.equal(entry.legs,2);}
  const unsigned=await h.backend.fetch(new Request('https://fixture-engine.invalid/v2/independent74/state?game_id='+id));assert.equal(unsigned.status,401);
  for(const path of ['catalog?other=1','state?game_id='+id+'&game_id='+id,'history?game_id='+id+'&user_id=elsewhere'])assert.equal((await request(prefix+path)).status,400);
  const protectedRoute=await fetch(h.base+'/games/multi_hot_5_video');assert.equal(await protectedRoute.text(),'Isolated machine74 QA');
  const oldBundle=await fetch(h.base+'/independent74/test72-bundle.mjs');assert.equal(oldBundle.status,404);
  const alias=await fetch(h.base+'/independent74/official74.html');assert.equal(alias.status,200);assert.match(await alias.text(),/machine74-controller/);
});

test('action boundary rejects client money/identity/outcome injection and validates X2 inputs',()=>{
  const id='ind74_official_multihot100',ids=new Set([id]),base={request_id:randomUUID(),game_id:id,model_version:'library74-v1:official72-r3',type:'start',stake:'1.00',options:{holdWin:true}};
  assert.equal(validateNativeAction(base,ids),base);
  for(const stake of ['1.00','20.00','4001.00','40000.00','50000.00','99999999999.00'])assert.equal(validateNativeAction({...base,stake},ids).stake,stake);
  for(const stake of ['0.99','4000.01','0.00','01.00','100000000000.00','1e6','1','NaN'])assert.throws(()=>validateNativeAction({...base,stake},ids));
  for(const changed of [{user_id:'attacker'},{payoutMinor:'900000'},{balance:'999.00'},{seed:'chosen'},{stake:'1.01'},{options:{holdWin:'true'}},{options:{ballMultiplier:10}},{game_id:'ind74_official_multihot5'}])assert.throws(()=>validateNativeAction({...base,...changed},ids));
  const action={request_id:randomUUID(),game_id:id,model_version:base.model_version,type:'action',round_id:randomUUID(),expected_version:1,action:'gamble',input:{color:'red'}};
  assert.equal(validateNativeAction(action,ids),action);
  for(const changed of [{input:{color:'blue'}},{input:{color:'black',payoutMinor:'100'}},{input:{cell:2}},{action:'collect',input:{color:'red'}},{expected_version:1.2}])assert.throws(()=>validateNativeAction({...action,...changed},ids));
});

test('bad upstream snapshots never become successful authenticated account state',async()=>{
  const id='ind74_official_rollx',env={NATIVE_ENGINE_ORIGIN:'https://fixture-engine.invalid',NATIVE_ENGINE_SECRET:'fixture-key-with-at-least-forty-characters-long'};
  for(const bad of [{authenticated:true,currency:'USD',game:{id},balance:'5.00',accepting:true},{authenticated:true,currency:'ETB',game:{id:'other'},balance:'5.00',accepting:true},{authenticated:true,currency:'ETB',game:{id},balance:'-1.00',accepting:true}]){
    const handler=createGateway({accountTransport:'library74',previous:{fetch:()=>Response.json({authenticated:true})},accountGames:[{id}],fetchImpl:()=>Promise.resolve(Response.json(bad))});
    const response=await handler(new Request('https://player.example/independent74/account-api/state?game_id='+id,{headers:{cookie:'sw_session=fixture'}}),env,{});assert.equal(response.status,502);
  }
});

test('missing engine route cannot mislabel a verified player session as signed out',async()=>{
  const id='ind74_official_rollx',env={NATIVE_ENGINE_ORIGIN:'https://fixture-engine.invalid',NATIVE_ENGINE_SECRET:'fixture-key-with-at-least-forty-characters-long'};
  const handler=createGateway({accountTransport:'library74',previous:{fetch:()=>Response.json({authenticated:true})},accountGames:[{id}],fetchImpl:()=>Promise.resolve(Response.json({error:'UNAUTHORIZED'},{status:401}))});
  const response=await handler(new Request('https://player.example/independent74/account-api/state?game_id='+id,{headers:{cookie:'sw_session=fixture'}}),env,{});
  assert.equal(response.status,503);const value=await response.json();assert.equal(value.error.code,'GAME_ACCOUNT_ROUTE_UNAVAILABLE');assert.equal(value.wallet,undefined);assert.equal(value.balance,undefined);
});
