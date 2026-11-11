import test from 'node:test';
import assert from 'node:assert/strict';
import {MachineAccountClient,validateSnapshot} from '../client/machine74-api.mjs';
const id='ind74_official_multihot100',second='ind74_official_rollx',guard='a'.repeat(64),requestId='a56f296c-a5a8-4a85-aa65-c1c6a7697299';
const snap=(extra={})=>({authenticated:true,currency:'ETB',balance:'500.00',game:{id,version:'fixture-r2',launchable:true},accepting:true,sessionGuard:guard,round:null,...extra});
const round=(extra={})=>({game_id:id,round_id:'b56f296c-a5a8-4a85-aa65-c1c6a7697299',model_version:'fixture-r2',status:'settled',version:1,stakeMinor:'100',payoutMinor:'500',...extra});
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};};
test('snapshot rejects another account currency, game, numeric money and malformed round',()=>{
  for(const value of [snap({currency:'USD'}),snap({authenticated:false}),snap({balance:5}),snap({game:{id:second,version:'v1'}}),snap({sessionGuard:'x'}),snap({round:round({stakeMinor:100})}),snap({round:round({game_id:second})})])assert.throws(()=>validateSnapshot(value,id));
  assert.equal(validateSnapshot(snap({balance:'500.00',current_balance:'520.00',round:round()}),id).balance,'520.00');
});
test('account client accepts 1 and 4000 ETB and rejects stakes outside the requested range before transport',async()=>{
  const sent=[];
  const client=new MachineAccountClient({storage:storage(),newId:()=>requestId,fetchImpl:async(url,init)=>{
    if(init.method==='GET')return Response.json(snap({balance:'10000.00'}));
    sent.push(JSON.parse(init.body));return Response.json(snap({balance:'10000.00',round:round()}));
  }});
  await client.state(id);
  for(const stake of ['0.00','0.99','1.01','4000.01','4001.00','40000.00'])await assert.rejects(client.start(stake),{code:'INVALID_STAKE'});
  assert.equal(sent.length,0);assert.equal(client.pending,null);
  await client.start('1.00');await client.start('4000.00');
  assert.deepEqual(sent.map(body=>body.stake),['1.00','4000.00']);
});
test('uncertain action survives reload and retries exactly the original request identity',async()=>{
  const saved=storage(),calls=[];let committed=false;
  const fetchImpl=async(url,init)=>{if(init.method==='GET')return Response.json(snap());calls.push(JSON.parse(init.body));if(!committed){committed=true;throw Error('response lost after server commit');}return Response.json(snap({balance:'504.00',round:round(),replayed:true}));};
  const first=new MachineAccountClient({storage:saved,fetchImpl,newId:()=>requestId});await first.state(id);
  await assert.rejects(first.start('1.00'),{code:'ACTION_UNCONFIRMED'});assert.ok(first.pending);
  await assert.rejects(first.start('1.00'),{code:'PENDING_ACTION'});assert.equal(calls.length,1);
  const reopened=new MachineAccountClient({storage:saved,fetchImpl,newId:()=>{throw Error('must not allocate a new request');}});await reopened.state(id);
  const result=await reopened.retryPending();assert.equal(result.balance,'504.00');assert.deepEqual(calls[0],calls[1]);assert.equal(reopened.pending,null);assert.equal(saved.data.size,0);
});
test('a changed login never replays a different session pending wager',async()=>{
  const saved=storage();saved.setItem('zplay.independent74.pending.v1',JSON.stringify({guard,body:{request_id:requestId,type:'start',game_id:id}}));
  const client=new MachineAccountClient({storage:saved,fetchImpl:async()=>Response.json(snap({sessionGuard:'b'.repeat(64)}))});await client.state(id);
  assert.equal(client.pending,null);await assert.rejects(client.retryPending(),{code:'PENDING_SESSION_MISMATCH'});
});
test('pending request in a different game remains available until that same game is selected',async()=>{
  const saved=storage(),body={request_id:requestId,type:'start',game_id:id,model_version:'fixture-r2',stake:'1.00',options:{}};
  saved.setItem('zplay.independent74.pending.v1',JSON.stringify({guard,body}));
  const client=new MachineAccountClient({storage:saved,fetchImpl:async url=>Response.json(snap({game:{id:url.includes(second)?second:id,version:'fixture-r2'}}))});
  await client.state(second);assert.deepEqual(client.pending.body,body);await assert.rejects(client.retryPending(),{code:'PENDING_SESSION_MISMATCH'});
  await client.state(id);assert.deepEqual(client.pending.body,body);
});
test('duplicate clicks are blocked while the first request is awaiting confirmation',async()=>{
  let finish,calls=0;const client=new MachineAccountClient({storage:storage(),newId:()=>requestId,fetchImpl:async(url,init)=>{if(init.method==='GET')return Response.json(snap());calls++;return new Promise(resolve=>finish=()=>resolve(Response.json(snap({round:round()}))));}});await client.state(id);
  const pending=client.start('1.00');await assert.rejects(client.start('1.00'),{code:'PENDING_ACTION'});assert.equal(calls,1);finish();await pending;
});
test('known rejection clears pending but a malformed success retains it',async()=>{
  for(const [response,keep] of [[Response.json({error:{code:'INSUFFICIENT_FUNDS'}},{status:422}),false],[Response.json({balance:'bad'}),true]]){
    const client=new MachineAccountClient({storage:storage(),newId:()=>requestId,fetchImpl:async(url,init)=>init.method==='GET'?Response.json(snap()):response});await client.state(id);await assert.rejects(client.start('1.00'));assert.equal(!!client.pending,keep);
  }
});
test('active round action uses its original model version and optimistic version',async()=>{
  let sent;const client=new MachineAccountClient({storage:storage(),newId:()=>requestId,fetchImpl:async(url,init)=>{if(init.method==='GET')return Response.json(snap({game:{id,version:'new-r3'},round:round({status:'active',model_version:'old-r2',version:7})}));sent=JSON.parse(init.body);return Response.json(snap({round:round({version:8})}));}});await client.state(id);await client.act('collect');assert.equal(sent.model_version,'old-r2');assert.equal(sent.expected_version,7);assert.equal(sent.round_id,round().round_id);
});
test('stale read cannot replace a newer account state',async()=>{
  const waiting=[];const client=new MachineAccountClient({storage:storage(),fetchImpl:()=>new Promise(resolve=>waiting.push(resolve))});
  const old=client.state(id),fresh=client.state(second);waiting[1](Response.json(snap({game:{id:second,version:'r2'}})));await fresh;waiting[0](Response.json(snap()));await assert.rejects(old,{code:'STALE_RESPONSE'});assert.equal(client.gameId,second);
});
