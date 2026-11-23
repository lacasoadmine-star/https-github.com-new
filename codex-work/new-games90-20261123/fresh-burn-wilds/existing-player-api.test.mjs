import test from 'node:test';
import assert from 'node:assert/strict';
import {createBurnExistingPlayerAPI} from './existing-player-api.mjs';
import {GAME_ID} from './contract.mjs';

const origin='https://superwin-player.apdiy61.workers.dev/';
const game = {
  id:GAME_ID,serverCertified:true,ledgerSettled:true,
  nativeReceiptContract:'burn-wilds-v1',cashReleaseApproved:true,
  modelVersion:'approved-model-v1',assetManifestId:'licensed-burn-assets-v1',
  betLevelsMinor:[100,200]
};
const profile={id:'test-player',balanceMinor:1000};
const reply=(url,data,status=200)=>({
  ok:status>=200 && status<300,
  status,url,redirected:false,
  headers:{get:()=> 'application/json; charset=utf-8'},
  json:async()=>data
});
const round={
  gameId:GAME_ID,subject:'test-player',requestKey:'unique-idempotency-key',
  serverSettled:true,nativeReceiptContract:'burn-wilds-v1',
  roundId:'round-1',betMinor:100,winMinor:0,balanceMinor:900,
  currency:'ETB',modelVersion:'approved-model-v1',multiplier:1,
  ledger:{betTxId:'debit-1'},historyRecorded:true,expandedColumns:[],
  winningLines:[],finalGrid:Array.from({length:5},()=>['a','b','wild'])
};
const action={gameId:GAME_ID,subject:'test-player',
  modelVersion:'approved-model-v1',betMinor:100,
  requestKey:'unique-idempotency-key'};

function fixture({games=[game],responseRound=round,user=profile}={}){
  const calls=[];
  const fetcher=async(url,opts)=>{
    calls.push({url,opts});
    if(url.endsWith('/api/me'))return reply(url,user);
    if(url.endsWith('/api/config'))return reply(url,{games});
    if(url.endsWith('/api/history'))return reply(url,{rounds:[]});
    if(url.endsWith('/api/spin'))return reply(url,responseRound);
    throw Error('unexpected request '+url);
  };
  return {host:createBurnExistingPlayerAPI({origin,fetcher}),calls};
}
test('reads existing ZPLAY /api/me and /api/config without changing wallet',async()=>{
  const f=fixture();
  const state=await f.host.getState();
  assert.equal(state.subject,'test-player');
  assert.equal(state.cashReleaseApproved,true);
  assert.deepEqual(f.calls.map(x=>new URL(x.url).pathname),['/api/me','/api/config']);
  assert.ok(f.calls.every(x=>x.opts.credentials==='same-origin'));
});
test('absent native game is not a playable substitute for another slot',async()=>{
  const f=fixture({games:[]});
  const inspection=await f.host.inspect();
  assert.equal(inspection.gameRegistered,false);
  assert.equal(inspection.cashReleaseApproved,false);
  await assert.rejects(f.host.getState(),/BURN_PLAYER_GAME_RELEASE_UNVERIFIED/);
  assert.ok(f.calls.every(x=>!x.url.endsWith('/api/spin')));
});
test('listed game alone is not authorization to bet',async()=>{
  const f=fixture({games:[{id:GAME_ID,name:'Multi Hot 5 Burn Wilds'}]});
  await assert.rejects(f.host.getState(),/BURN_PLAYER_GAME_RELEASE_UNVERIFIED/);
  await assert.rejects(f.host.spin(action),/BURN_PLAYER_SPIN_NOT_AUTHORIZED/);
  assert.ok(f.calls.every(x=>!x.url.endsWith('/api/spin')));
});
test('approved spin uses existing API and original idempotency key',async()=>{
  const f=fixture();await f.host.getState();
  const settled=await f.host.spin(action);
  assert.equal(settled.roundId,'round-1');
  const request=f.calls.find(x=>x.url.endsWith('/api/spin'));
  assert.equal(request.opts.method,'POST');
  assert.deepEqual(JSON.parse(request.opts.body),{game:GAME_ID,bet:'1.00',key:'unique-idempotency-key'});
});
test('recovery replays the same key without inventing a second wager',async()=>{
  const f=fixture();await f.host.getState();
  await f.host.recover(action);
  const request=f.calls.find(x=>x.url.endsWith('/api/spin'));
  assert.deepEqual(JSON.parse(request.opts.body),{
    game:GAME_ID,bet:'1.00',key:'unique-idempotency-key',replayOnly:true
  });
});
test('other account and forged wager cannot reach financial endpoint',async()=>{
  const f=fixture();await f.host.getState();
  await assert.rejects(f.host.spin({...action,subject:'other-player'}),/BURN_PLAYER_SPIN_NOT_AUTHORIZED/);
  await assert.rejects(f.host.spin({...action,betMinor:300}),/BURN_PLAYER_SPIN_NOT_AUTHORIZED/);
  assert.equal(f.calls.filter(x=>x.url.endsWith('/api/spin')).length,0);
});
test('legacy outcome cannot masquerade as licensed Burn Wilds cash receipt',async()=>{
  const f=fixture({responseRound:{id:'round-1',payout:0,outcome:{grid:[1,2,3]}}});
  await f.host.getState();
  await assert.rejects(f.host.spin(action),/BURN_PLAYER_NATIVE_SETTLEMENT_UNVERIFIED/);
});
test('empty native receipt subject is not sufficient for server settlement',async()=>{
  const f=fixture({responseRound:{...round,subject:'other-user'}});
  await f.host.getState();
  await assert.rejects(f.host.spin(action),/BURN_PLAYER_NATIVE_SETTLEMENT_UNVERIFIED/);
});
test('same-origin only; no second account or external API is allowed',()=>{
  assert.throws(()=>createBurnExistingPlayerAPI({origin:'https://other.example/base/'}),
    /BURN_PLAYER_ORIGIN_INVALID/);
  assert.throws(()=>createBurnExistingPlayerAPI({origin:'http://other.example/'}),
    /BURN_PLAYER_ORIGIN_INVALID/);
});
