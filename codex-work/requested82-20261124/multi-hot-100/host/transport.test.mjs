import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import model from './verified-model.json' with {type:'json'};
import {createExistingM100Transport,M100_PENDING_KEY,M100_STATE_PATH,M100_ACTION_PATH} from './transport.mjs';
import {VIEW_GAME_ID,BACKEND_GAME_ID,MODEL_VERSION,MODEL_SHA256,OPERATOR_RELEASE,clone,NATIVE_SYMBOLS,money} from './model.mjs';
import {quoteM100Grid} from '../rules/quote.mjs';

import {createM100NativeFixture as fixture,key,board,loss,spin,take,gamble,storage} from './test-support.mjs';

test('current own model pin and current reference100paths agree',async()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(model)).digest('hex'),MODEL_SHA256);
 const f=fixture(),transport=f.make(),connected=await transport.connect();
 assert.equal(connected.hostPolicy.gameId,VIEW_GAME_ID);assert.equal(connected.hostPolicy.backendGameId,BACKEND_GAME_ID);
 assert.equal(connected.hostPolicy.currency,'ETB');assert.equal(connected.hostPolicy.balance,'100.00');assert.equal(f.posts,0);
 const result=await transport.submit(spin(1));assert.equal(result.winAmount,'12.60');assert.equal(result.balance,'99.00');assert.equal(result.winningLines.length,49);assert.ok(result.winningLines.includes(46));
 assert.deepEqual(result.grid,board);assert.equal(f.draws,1);assert.equal(f.storage.getItem(M100_PENDING_KEY),null);
});

test('take uses the original collect action exactly once and conserves the pending award',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();const result=await transport.submit(spin(2));
 const intent=take(3,result.roundId),ack=await transport.submit(intent);
 assert.equal(ack.collectedAmount,'12.60');assert.equal(ack.balance,'111.60');assert.equal(ack.creditedByTake,true);
 assert.equal((await transport.submit(intent)).balance,'111.60');assert.equal(f.posts,2);assert.equal(f.draws,1);
});

test('nextspin journals both fixed collection/start keys before either POST',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();const first=await transport.submit(spin(4));
 f.drop('start');await assert.rejects(transport.submit(spin(5,first.roundId)),/lost response/);
 const saved=JSON.parse(f.storage.getItem(M100_PENDING_KEY));assert.equal(saved.steps.length,2);assert.equal(saved.steps[0].kind,'PRECOLLECT');assert.equal(saved.steps[1].body.request_id,key(5));
 assert.notEqual(saved.steps[0].body.request_id,saved.steps[1].body.request_id);assert.equal(f.draws,2);assert.equal(f.state.balance,'110.60');
 const before=f.posts;const result=await transport.recover(spin(5,first.roundId));assert.equal(result.balance,'110.60');assert.equal(f.draws,2);assert.equal(f.posts,before+2);
});

test('lost first start recovers identical original body without another outcome or debit',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();f.drop('start');
 await assert.rejects(transport.submit(spin(6)),/lost response/);const saved=JSON.parse(f.storage.getItem(M100_PENDING_KEY));
 const result=await transport.recover(spin(6));assert.equal(result.requestKey,key(6));assert.equal(result.balance,'99.00');assert.equal(f.draws,1);
 assert.deepEqual(JSON.parse(f.requests.filter(r=>r.options.method==='POST').at(-1).options.body),saved.steps[0].body);
});

test('new view restores journal but still confirms every stored acceptance with the host',async()=>{
 const f=fixture(),first=f.make();await first.connect();f.drop('start');await assert.rejects(first.submit(spin(7)),/lost response/);
 const restored=f.make(),connected=await restored.connect();assert.deepEqual(connected.pendingIntent,spin(7));
 const result=await restored.recover(spin(7));assert.equal(result.winAmount,'12.60');assert.equal(f.draws,1);assert.equal(f.posts,2);
});

test('gamble uses confirmed color/2x amount, same pending wallet, and original same-key recovery',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();const round=await transport.submit(spin(8));f.drop('gamble');
 const intent=gamble(9,round.roundId,'black');await assert.rejects(transport.submit(intent),/lost response/);
 const result=await transport.recover(intent);assert.equal(result.winAmount,'25.20');assert.equal(result.correct,true);assert.equal(result.card,'Ace_Spades');
 assert.equal(result.balance,'99.00');assert.equal(f.state.round.gambleHistory.length,1);
 const ack=await transport.submit(take(10,round.roundId));assert.equal(ack.collectedAmount,'25.20');assert.equal(ack.balance,'124.20');
});

test('already settled server collection is acknowledged through GET without crediting again',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();const round=await transport.submit(spin(11));await transport.submit(take(12,round.roundId));
 const before=f.posts;const ack=await transport.submit(take(13,round.roundId));assert.equal(ack.creditedByTake,false);assert.equal(ack.balance,'111.60');assert.equal(f.posts,before);
});

test('legacy wrong model, altered46, coefficients or disabled release fail before any wager',async()=>{
 for(const mutateModel of [game=>{game.id='multi_hot_100'},game=>{game.paylinePaths[45]=[2,2,2,1,1]},game=>{game.paytable[0].counts[5].value=1000},game=>{game.launchable=false},game=>{game.maxWinMultiplier=5000},game=>{game.math.multiplierWeights=[1,1,1,1,1]}]){
  const f=fixture({mutateModel}),transport=f.make();await assert.rejects(transport.connect(),/M100_/);assert.equal(f.posts,0);assert.equal(f.state.balance,'100.00');
 }
});

test('foreign account/session cannot replay a saved wager',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();f.drop('start');await assert.rejects(transport.submit(spin(14)),/lost response/);
 const before=f.posts;f.state={...f.state,sessionId:'isolated-different-player-session'};await assert.rejects(transport.recover(spin(14)),/SESSION_CHANGED/);
 assert.equal(f.posts,before);assert.notEqual(f.storage.getItem(M100_PENDING_KEY),null);
});

test('old native pending operation and unavailable durable storage block before POST',async()=>{
 const f=fixture();f.storage.setItem('zplay-remaining20:pending:v1:'+BACKEND_GAME_ID+':isolated-player-session-a','{"retained":true}');
 await assert.rejects(f.make().connect(),/EXISTING_PENDING_ACTION/);assert.equal(f.posts,0);
 const broken=fixture({storageImpl:{getItem:()=>null,setItem:()=>{throw Error('quota')},removeItem:()=>{}}}),transport=broken.make();await transport.connect();
 await assert.rejects(transport.submit(spin(15)),/STORAGE_UNAVAILABLE/);assert.equal(broken.posts,0);
});

test('tampered nonce/action journal does not turn recovery into a new wager',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();f.drop('start');await assert.rejects(transport.submit(spin(16)),/lost response/);
 const saved=JSON.parse(f.storage.getItem(M100_PENDING_KEY));saved.steps[0].body.stake='40000.00';f.storage.setItem(M100_PENDING_KEY,JSON.stringify(saved));
 const fresh=f.make();await assert.rejects(fresh.connect(),/JOURNAL_STEPS/);assert.equal(f.draws,1);
});

test('logout during committed response cannot expose a late accepted receipt to another account',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();let release;f.pause(new Promise(resolve=>{release=resolve}));const pending=transport.submit(spin(17));
 while(f.draws===0)await new Promise(setImmediate);transport.disconnect();release();await assert.rejects(pending,/STALE_SESSION/);assert.equal(f.draws,1);assert.notEqual(f.storage.getItem(M100_PENDING_KEY),null);
});


test('changed line quote, omitted winner, session or balance never becomes an accepted view',async()=>{
 for(const corrupt of [reply=>{reply.round.wins[0].payoutMinor='999';return reply},reply=>{reply.round.wins.pop();return reply},reply=>{reply.sessionId='different-account';return reply},reply=>{reply.balance='999.999';return reply}]){
  const f=fixture(),transport=f.make();await transport.connect();f.corrupt(corrupt);
  await assert.rejects(transport.submit(spin(18)),/M100_/);assert.notEqual(f.storage.getItem(M100_PENDING_KEY),null);assert.equal(f.draws,1);
  const confirmed=await transport.recover(spin(18));assert.equal(confirmed.winAmount,'12.60');assert.equal(confirmed.balance,'99.00');assert.equal(f.draws,1);
 }
});

test('mathematically valid forged checkpoint is never accepted without a host replay',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();f.drop('start');await assert.rejects(transport.submit(spin(19)),/lost response/);
 const saved=JSON.parse(f.storage.getItem(M100_PENDING_KEY)),fake=clone(f.cache.get(key(19)));
 const fakeGrid=Array.from({length:4},()=>Array(5).fill('seven')),quote=quoteM100Grid({grid:fakeGrid,betMinor:100n,multiplier:3});
 fake.round.grid=Array.from({length:5},()=>Array(4).fill(0));fake.round.currentCashoutMinor=String(quote.winMinor);
 fake.round.wins=quote.lines.map(line=>({line:line.lineId,symbol:'0',cells:Array.from({length:line.count},(_,column)=>[column,line.path[column]]),payoutMinor:String(line.winMinor)}));
 saved.checkpoints=[fake];f.storage.setItem(M100_PENDING_KEY,JSON.stringify(saved));
 const restored=f.make();await restored.connect();const before=f.posts,result=await restored.recover(spin(19));
 assert.equal(f.posts,before+1);assert.equal(result.winAmount,'12.60');assert.notDeepEqual(result.grid,fakeGrid);assert.equal(f.draws,1);
});

test('known preflight failure is safely cancellable and nextspin may use its pending collected funds',async()=>{
 const f=fixture(),transport=f.make();await transport.connect();f.state={...f.state,balance:'0.50'};
 await assert.rejects(transport.submit(spin(20)),error=>error.safeToCancel===true&&error.noWagerDispatched===true);
 assert.equal(f.posts,0);assert.equal(f.storage.getItem(M100_PENDING_KEY),null);
 f.state={...f.state,balance:'100.00'};const first=await transport.submit(spin(21));f.state={...f.state,balance:'0.50'};
 const second=await transport.submit(spin(22,first.roundId));assert.equal(second.balance,'12.10');assert.equal(f.draws,2);
});
