import test from 'node:test';
import assert from 'node:assert/strict';
import {MachineAccountClient,validateSnapshot} from '../client/machine74-api.mjs';
const gameId='ind74_official_rollx',guard='a'.repeat(64),requestId='a56f296c-a5a8-4a85-aa65-c1c6a7697299';
const snapshot=(demo=true)=>({authenticated:true,currency:demo?'DEMO':'ETB',...(demo?{mode:'demo',freePlay:true}:{}),balance:'10000.00',game:{id:gameId,version:'test-v1',launchable:true,limits:{minBetMinor:'100',maxBetMinor:'2000',betStepMinor:'100'}},sessionGuard:guard,accepting:true,round:null});
const storage=()=>{const entries=new Map();return{getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key),entries};};

test('demo and ETB snapshots require the explicitly selected currency and mode',()=>{
 assert.equal(validateSnapshot(snapshot(),gameId,{mode:'demo'}).currency,'DEMO');
 assert.equal(validateSnapshot(snapshot(false),gameId).currency,'ETB');
 for(const [value,mode] of [[snapshot(),'account'],[snapshot(false),'demo'],[{...snapshot(),currency:'ETB'},'account'],[{...snapshot(),mode:undefined},'demo']])assert.throws(()=>validateSnapshot(value,gameId,{mode}),{code:'INVALID_ACCOUNT_RESPONSE'});
 assert.throws(()=>new MachineAccountClient({mode:'unknown'}));
});

test('demo transport uses only the demo endpoint and guard header, and cannot change modes in place',async()=>{
 const calls=[];
 const client=new MachineAccountClient({mode:'demo',storage:storage(),newId:()=>requestId,fetchImpl:async(url,init)=>{calls.push({url,init});return Response.json(snapshot());}});
 await client.state(gameId);await client.start('1.00');
 assert(calls.every(call=>call.url.startsWith('/independent74/demo-api/')));
 assert.equal(calls[1].init.headers['x-demo-session-guard'],guard);
 assert.equal(calls[1].init.headers['x-independent74-session'],undefined);
 assert.throws(()=>{client.mode='account';});assert.throws(()=>{client.currency='ETB';});assert.throws(()=>{client.base='/independent74/account-api';});
});

test('demo retries cannot restore a real-wallet pending action even with a matching guard',async()=>{
 const saved=storage(),body={request_id:requestId,type:'start',game_id:gameId,model_version:'test-v1',stake:'1.00',options:{}};
 saved.setItem('zplay.independent74.pending.v1',JSON.stringify({guard,body}));
 const client=new MachineAccountClient({mode:'demo',storage:saved,fetchImpl:async()=>Response.json(snapshot())});
 await client.state(gameId);assert.equal(client.pending,null);
 assert(saved.getItem('zplay.independent74.pending.v1'));
 saved.setItem(client.storageKey,JSON.stringify({mode:'account',guard,body}));
 client.restore(guard);assert.equal(client.pending,null);
 saved.setItem(client.storageKey,JSON.stringify({mode:'demo',guard,body}));
 client.restore(guard);assert.deepEqual(client.pending.body,body);
});

test('demo history rejects ETB history and a switched-currency action remains unconfirmed',async()=>{
 let action=false;
 const client=new MachineAccountClient({mode:'demo',storage:storage(),newId:()=>requestId,fetchImpl:async(url,init)=>{
  if(url.includes('/history'))return Response.json({authenticated:true,currency:'ETB',game_id:gameId,history:[]});
  if(init.method==='POST'){action=true;return Response.json(snapshot(false));}
  return Response.json(snapshot());
 }});
 await client.state(gameId);await assert.rejects(client.history(gameId),{code:'INVALID_HISTORY'});
 await assert.rejects(client.start('1.00'),{code:'INVALID_ACCOUNT_RESPONSE'});
 assert.equal(action,true);assert.ok(client.pending);
 assert.equal(client.snapshot.currency,'DEMO');
});
