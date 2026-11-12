import test from 'node:test';
import assert from 'node:assert/strict';
import {Account,receipt,cents,amount} from '../src/account.mjs';
import {games} from '../src/games.mjs';
import {guard,model,round,fixtures} from './fixture.mjs';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
function setup(game){const calls=[],disk=storage();let override=null;const account=new Account(game,{storage:disk,fetcher:async(path,options)=>{calls.push({path,options});const body=options.body?JSON.parse(options.body):undefined;if(override){const response=await override(path,options,body);if(response)return response;}return Response.json(fixtures(path,body));}});return {account,calls,disk,override:f=>override=f};}
test('money arithmetic rejects malformed values and avoids floating point',()=>{assert.equal(amount(cents('9999999999999.99')),'9999999999999.99');for(const v of [NaN,1,'1e2','-1.00','0.001'])assert.throws(()=>cents(v));});
for(const game of games){
 test(game.name+': one in-flight wager; recovery reuses the original request token',async()=>{
  const t=setup(game);await t.account.connect();let release;t.override(async path=>{if(path.endsWith('/spin')){await new Promise(r=>release=r);throw Error('lost response');}});
  const first=t.account.spin('0.10');await assert.rejects(()=>t.account.spin('0.10'),/PENDING_ROUND/);release();await assert.rejects(()=>first,/CONNECTION_UNCONFIRMED/);const p=t.account.pending;assert.ok(p);assert.equal(JSON.parse(t.disk.getItem(t.account.key)).body.roundToken,p.body.roundToken);
  t.override(null);const result=await t.account.retry();const posts=t.calls.filter(c=>c.options.method==='POST');assert.equal(posts.length,2);assert.equal(JSON.parse(posts[1].options.body).roundToken,p.body.roundToken);assert.equal(result.result.balanceAfter,'99.90');assert.equal(t.account.pending,null);
  if(game.transport==='fresh')assert.equal(JSON.parse(posts[1].options.body).replayOnly,true);else assert.equal(posts[0].options.headers['X-Zplay-Machine-Session'],guard);
 });
 test(game.name+': inconsistent receipts keep the round pending and block another wager',async()=>{
  const t=setup(game);await t.account.connect();t.override(async(path,opts,body)=>path.endsWith('/spin')?Response.json(round(game,body,{after:'1000.00'})):null);
  await assert.rejects(()=>t.account.spin('0.10'),/INVALID_RECEIPT/);assert.equal(t.account.state.balance,'100.00');assert.ok(t.account.pending);await assert.rejects(()=>t.account.spin('0.10'),/PENDING_ROUND/);
 });
 test(game.name+': pending wager survives reload but is discarded on an account change',async()=>{
  const t=setup(game);await t.account.connect();t.override(async p=>{if(p.endsWith('/spin'))throw Error();});await assert.rejects(()=>t.account.spin('0.10'));
  const restored=new Account(game,{storage:t.disk,fetcher:t.account.fetcher});await restored.connect();assert.equal(restored.pending.body.roundToken,t.account.pending.body.roundToken);
  t.override(async p=>{const value=fixtures(p);if(!value)return null;if(value.sessionId)value.sessionId='c'.repeat(64);if(value.sessionGuard)value.sessionGuard='c'.repeat(64);return Response.json(value);});await restored.connect();assert.equal(restored.pending,null);assert.equal(t.disk.getItem(restored.key),null);
 });
 test(game.name+': a definite insufficient-funds rejection can be retried as a new wager',async()=>{const t=setup(game);await t.account.connect();t.override(async p=>p.endsWith('/spin')?Response.json({detail:'INSUFFICIENT_FUNDS'},{status:402}):null);await assert.rejects(()=>t.account.spin('0.10'),/INSUFFICIENT_FUNDS/);assert.equal(t.account.pending,null);});
 test(game.name+': invalid symbol, line position, model or denomination cannot settle',()=>{const b={bet:'0.10'},m=model(game),pending={body:b};for(const change of [{currency:'USD'},{mathVersion:'bad'},{grid:[['invented']]},{winLines:[{positions:[{row:20,col:0}]}]}])assert.throws(()=>receipt({...round(game,b),...change},game,pending,m));});
}
test('fresh gamble must match the wallet debit, payout, colour and attempt',async()=>{
 const t=setup(games[1]);await t.account.connect();t.account.state.round=round(games[1],{bet:'0.10'});t.account.state.gamble={available:true,attempt:0,stake:'1.00'};
 t.override(async(p,o,b)=>p.endsWith('/gamble')?Response.json({roundId:b.roundId,choice:b.choice,revealed:'RED',won:true,attempt:1,maxAttempts:3,payout:'2.00',balanceAfter:'101.00',walletReceipt:{currency:'ETB',balanceBefore:'100.00',chargedStake:'1.00',finalWin:'2.00',balanceAfter:'101.00'}}):null);
 await t.account.gamble('RED');assert.equal(t.account.state.balance,'101.00');assert.equal(t.account.state.gamble.stake,'2.00');
});
test('backend house capacity can disable bets without inventing a balance or bet',async()=>{const t=setup(games[1]);t.override(async p=>{const value=fixtures(p);value.game.betLevels=[];value.game.wagerAvailability='house_capacity';return Response.json(value);});const s=await t.account.connect();assert.equal(s.accepting,false);await assert.rejects(()=>t.account.spin('0.10'),/GAME_UNAVAILABLE/);});
