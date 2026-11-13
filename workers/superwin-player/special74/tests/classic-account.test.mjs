import test from 'node:test';
import assert from 'node:assert/strict';
import {Account} from '../src/financial/account.mjs';

const game={id:'new-mh5-fixture',modelId:'multi_hot_5_native',transport:'classic',columns:3,symbols:{lemon:1}};
const roundId='af87429a-90e6-4b36-871f-4fe0d672f8dc';
const model={id:game.modelId,enabled:true,betLevels:['0.10'],mathVersion:'native-fixture-v1',engineVersion:'fixture-engine',mathSha256:'b'.repeat(64),features:{gambleRounds:5,gambleMaxStake:'500.00'}};
const session={authenticated:true,currency:'ETB',sessionId:'a'.repeat(64),balance:'100.00'};
const ok=value=>({ok:true,json:async()=>value});
function storage(){const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
function spinResult(){return {roundId,gameId:game.modelId,currency:'ETB',bet:'0.10',mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256,grid:Array.from({length:3},()=>['lemon','lemon','lemon']),wheelMultiplier:1,winLines:[],finalWin:'0.30',freeSpinsRemaining:0,walletReceipt:{currency:'ETB',balanceBefore:'100.00',chargedStake:'0.10',finalWin:'0.30',balanceAfter:'100.20'}};}

test('native classic requests carry the model identity required by the retained backend',async()=>{
 const account=new Account(game,{storage:storage(),fetcher:async(url,options)=>{
  if(url==='/api/machine-session')return ok(session);
  if(!options.body)return ok(model);
  const body=JSON.parse(options.body);
  // The deployed native handler rejects a paid start without mathVersion.
  if(body.mathVersion!==model.mathVersion||body.engineVersion!==model.engineVersion||body.mathSha256!==model.mathSha256)return {ok:false,status:409,json:async()=>({error:{code:'GAME_RULES_UPDATED_RELOAD'}})};
  assert.equal(options.headers['X-Zplay-Machine-Session'],session.sessionId);
  return ok(spinResult());
 }});
 await account.connect();await account.spin('0.10');assert.equal(account.state.balance,'100.20');assert.equal(account.pending,null);
});

test('a lost native Gamble reply recovers its receipt without a second wager',async()=>{
 const saved=new Map(),requests=[];let debits=0;
 const account=new Account(game,{storage:storage(),fetcher:async(url,options)=>{
  if(url==='/api/machine-session')return ok(session);
  if(!options.body)return ok(model);
  if(url.endsWith('/spin'))return ok(spinResult());
  const body=JSON.parse(options.body);requests.push(body);
  if(saved.has(body.roundToken))return ok(saved.get(body.roundToken));
  if(body.replayOnly)return {ok:false,status:409,json:async()=>({error:{code:'GAMBLE_STATE_CHANGED'}})};
  assert.equal(body.expectedAttempt,1);assert.equal(body.expectedStake,'0.30');debits++;
  saved.set(body.roundToken,{roundId,choice:'RED',revealed:'RED',won:true,payout:'0.60',attempt:1,maxAttempts:5,balanceAfter:'100.50'});
  throw Error('Reply lost after settlement');
 }});
 await account.connect();await account.spin('0.10');await assert.rejects(account.gamble('RED'),/CONNECTION_UNCONFIRMED/);
 const id=account.pending.body.roundToken;await account.retry();
 assert.equal(requests[1].roundToken,id);assert.equal(requests[1].replayOnly,true);assert.equal(debits,1);assert.equal(account.state.balance,'100.50');assert.equal(account.pending,null);
});

test('native Gamble retry does not create a wager when the first request never arrived',async()=>{
 let calls=0;
 const account=new Account(game,{storage:storage(),fetcher:async(url,options)=>{
  if(url==='/api/machine-session')return ok(session);if(!options.body)return ok(model);if(url.endsWith('/spin'))return ok(spinResult());
  const body=JSON.parse(options.body);if(++calls===1)throw Error('Request lost before arrival');
  assert.equal(body.replayOnly,true);return {ok:false,status:409,json:async()=>({error:{code:'GAMBLE_STATE_CHANGED'}})};
 }});
 await account.connect();await account.spin('0.10');await assert.rejects(account.gamble('RED'));await assert.rejects(account.retry(),/GAMBLE_STATE_CHANGED/);
 assert.equal(account.pending,null);assert.equal(account.state.balance,'100.20');
});
