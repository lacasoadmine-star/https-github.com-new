import test from 'node:test';
import assert from 'node:assert/strict';
import {Account} from './account.mjs';
import {games} from './games.mjs';

const game=games[1], guard='a'.repeat(64), mathHash='b'.repeat(64);
const model={id:game.modelId,enabled:true,freshReleaseReady:true,betLevels:['2.00'],mathVersion:'test-math',engineVersion:'test-engine',mathSha256:mathHash,features:{gambleRounds:0}};
const result={gameId:game.modelId,currency:'ETB',roundId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',bet:'2.00',mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:mathHash,grid:game.preview,winLines:[],wheelMultiplier:2,finalWin:'0.00',walletReceipt:{currency:'ETB',balanceBefore:'100.00',chargedStake:'2.00',finalWin:'0.00',balanceAfter:'98.00'}};
const pending={kind:'spin',game:game.id,guard,body:{gameId:game.modelId,bet:'2.00',roundToken:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sessionGuard:guard,mathVersion:model.mathVersion,mathSha256:mathHash,engineVersion:model.engineVersion}};
function memory(){const data=new Map();return {data,getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
function state(balance='100.00'){return {authenticated:true,currency:'ETB',sessionGuard:guard,balance,game:model,round:null};}
const ok=value=>({ok:true,status:200,json:async()=>structuredClone(value)});

test('a failed account refresh disables accepting wagers until a verified refresh succeeds',async()=>{
  let fail=false,posts=0;
  const account=new Account(game,{storage:memory(),fetcher:async(path,options)=>{if(options.method==='POST')posts++;if(fail)throw Error('offline');return ok(state());}});
  await account.connect();assert.equal(account.state.accepting,true);
  fail=true;await assert.rejects(account.connect(),/CONNECTION_UNCONFIRMED/);
  assert.equal(account.state.accepting,false);assert.equal(account.stale,true);
  await assert.rejects(account.spin('2.00'),/GAME_UNAVAILABLE/);assert.equal(posts,0);
  fail=false;await account.connect();assert.equal(account.stale,false);assert.equal(account.state.accepting,true);
});

test('simultaneous refresh requests share one read and cannot race the resulting state',async()=>{
  let resolve,calls=0;const read=new Promise(r=>{resolve=r;});
  const account=new Account(game,{storage:memory(),fetcher:async()=>{calls++;await read;return ok(state());}});
  const first=account.connect(),second=account.connect();resolve();await Promise.all([first,second]);
  assert.equal(calls,1);assert.equal(account.stale,false);
});

test('replaying a saved receipt refreshes current server balance and retains the same request token',async()=>{
  let reads=0;const calls=[],storage=memory();
  const account=new Account(game,{storage,fetcher:async(path,options)=>{calls.push({path,options});if(options.method==='POST')return ok(result);return ok(state(++reads===1?'100.00':'135.00'));}});
  await account.connect();account.save(structuredClone(pending));
  const replay=await account.retry();
  assert.equal(replay.result.finalWin,'0.00');assert.equal(account.state.balance,'135.00');assert.equal(account.stale,false);assert.equal(account.pending,null);
  const posts=calls.filter(c=>c.options.method==='POST');assert.equal(posts.length,1);
  assert.deepEqual(JSON.parse(posts[0].options.body),{...pending.body,replayOnly:true});
});

test('a recovered result remains available when balance refresh fails, with new wagers disabled',async()=>{
  let reads=0,posts=0;const storage=memory();
  const account=new Account(game,{storage,fetcher:async(path,options)=>{if(options.method==='POST'){posts++;return ok(result);}if(++reads>1)throw Error('offline');return ok(state());}});
  await account.connect();account.save(structuredClone(pending));
  const replay=await account.retry();
  assert.equal(replay.result.roundId,result.roundId);assert.equal(replay.stateRefreshError.code,'CONNECTION_UNCONFIRMED');
  assert.equal(account.pending,null);assert.equal(account.state.balance,'100.00');assert.equal(account.stale,true);assert.equal(account.state.accepting,false);
  await assert.rejects(account.spin('2.00'),/GAME_UNAVAILABLE/);assert.equal(posts,1);
});

test('failure to clear durable pending state retains the pending token for recovery',async()=>{
  const storage=memory();const remove=storage.removeItem;let failRemove=false;
  storage.removeItem=key=>{if(failRemove)throw Error('storage unavailable');return remove(key);};
  const account=new Account(game,{storage,fetcher:async(path,options)=>ok(options.method==='POST'?result:state())});
  await account.connect();account.save(structuredClone(pending));failRemove=true;
  await assert.rejects(account.retry(),/storage unavailable/);
  assert.equal(account.pending.body.roundToken,pending.body.roundToken);
  assert.equal(JSON.parse(storage.getItem(account.key)).body.roundToken,pending.body.roundToken);
});
