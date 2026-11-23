import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_ID} from './contract.mjs';
import {createBurnSameOriginHost} from './same-origin-host.mjs';

const origin='https://superwin-player.apdiy61.workers.dev/';
const paths={session:'/player/session',spin:'/game/spin',recover:'/game/recovery',
  wallet:'/player/wallet',history:'/player/history',dashboard:'/player/dashboard'};
const intent={gameId:GAME_ID,requestKey:'unique-recovery-key',
  modelVersion:'approved-rules',subject:'player-1',betMinor:100};
const response = (url, data={authenticated:true})=>({
  ok:true,status:200,url,redirected:false,
  headers:{get:()=> 'application/json; charset=utf-8'},
  json:async()=>data
});
test('calls only explicit current-origin endpoints and forwards credentials',async()=>{
  const calls=[];
  const host=createBurnSameOriginHost({origin,paths,
    request:async(url,opts)=>{calls.push({url,opts});return response(url);}});
  await host.getState();await host.getWallet();await host.getHistory();await host.getDashboard();
  assert.equal(calls.length,4);
  assert.ok(calls.every(({url,opts})=>new URL(url).origin===new URL(origin).origin &&
    opts.method==='GET' && opts.credentials==='same-origin' && opts.redirect==='error'));
});
test('spin sends one idempotency key to the designated same-host API only',async()=>{
  const calls=[];
  const host=createBurnSameOriginHost({origin,paths,
    request:async(url,opts)=>{calls.push({url,opts});return response(url,{serverSettled:true});}});
  await host.spin(intent);
  const payload=JSON.parse(calls[0].opts.body);
  assert.equal(calls.length,1);
  assert.equal(payload.requestKey,intent.requestKey);
  assert.equal(payload.betMinor,100);
  assert.equal(payload.replayOnly,false);
  assert.equal(calls[0].url,origin.replace(/\/$/,'')+paths.spin);
});
test('recovery is on distinct endpoint, always replayOnly with unchanged identity',async()=>{
  const calls=[];
  const host=createBurnSameOriginHost({origin,paths,
    request:async(url,opts)=>{calls.push({url,opts});return response(url);}});
  await host.recover(intent);
  const payload=JSON.parse(calls[0].opts.body);
  assert.equal(payload.replayOnly,true);
  assert.equal(payload.requestKey,intent.requestKey);
  assert.equal(calls[0].url,origin.replace(/\/$/,'')+paths.recover);
});
test('no invented paths, http origins or shared origin proxies allowed',()=>{
  assert.throws(()=>createBurnSameOriginHost({origin:'http://insecure.local/',paths}),/BURN_HOST_CONFIGURATION_INVALID/);
  assert.throws(()=>createBurnSameOriginHost({origin,paths:{...paths,spin:'https://external.example/spin'}}),/BURN_HOST_CONFIGURATION_INVALID/);
  assert.throws(()=>createBurnSameOriginHost({origin,paths:{...paths,recover:paths.spin}}),/BURN_HOST_CONFIGURATION_INVALID/);
});
test('forged actions fail before any network call',async()=>{
  let count=0;
  const host=createBurnSameOriginHost({origin,paths,request:async()=>{count++;return response(origin);}});
  await assert.rejects(host.spin({...intent,betMinor:0}),/BURN_HOST_ACTION_INVALID/);
  await assert.rejects(host.spin({...intent,gameId:'different-game'}),/BURN_HOST_ACTION_INVALID/);
  assert.equal(count,0);
});
test('expired session and non-json regional block fail closed',async()=>{
  const host=createBurnSameOriginHost({origin,paths,request:async url=>({
    ...response(url),status:401,ok:false
  })});
  await assert.rejects(host.getWallet(),/BURN_HOST_SESSION_EXPIRED/);
  const regional=createBurnSameOriginHost({origin,paths,request:async url=>({
    ...response(url),headers:{get:()=> 'text/html'}
  })});
  await assert.rejects(regional.getState(),/BURN_HOST_RESPONSE_INVALID/);
});
test('network ambiguity cannot create a guessed successful round',async()=>{
  const host=createBurnSameOriginHost({origin,paths,request:async()=>{throw Error('network lost')}});
  await assert.rejects(host.spin(intent),/BURN_HOST_NETWORK_UNCERTAIN/);
});
