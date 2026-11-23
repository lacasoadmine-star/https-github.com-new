import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_WILDS_GAME_ID} from './expansion.mjs';
import {BURN_STATE_PATH,BURN_SPIN_PATH,createBurnWildsExistingHostTransport} from './host-transport.mjs';
import {quoteBurnWildsFinalGrid} from './outcome-audit.mjs';

const sessionGuard='a'.repeat(64);
const mathSha256='b'.repeat(64);
const requestKey='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const model={gameId:BURN_WILDS_GAME_ID,mathVersion:'burn-v1.0.1',engineVersion:'own-v1',mathSha256,
  betLevels:['0.10','0.20'],enabled:true,freshReleaseReady:true,productionApproved:true,
  probabilityModelAudited:true,assetRightsVerified:true,settlementMode:'SERVER_IMMEDIATE',
  wagerAvailability:'ready'};
const serverState=()=>({authenticated:true,currency:'ETB',sessionGuard,balance:'100.00',
  blockedByActiveGame:false,round:null,game:{...model}});
const grid=[
  ['orange','seven','plum'],['bell','seven','watermelon'],
  ['seven','seven','orange'],['plum','seven','bell'],
  ['grapes','seven','cherry']
];
const receipt=(body)=>{const win=quoteBurnWildsFinalGrid({finalGrid:grid,betMinor:10,multiplier:2});
  return {gameId:BURN_WILDS_GAME_ID,roundId:'server-round-01',clientToken:body.roundToken,
    originalGrid:grid,finalGrid:grid,expandedColumns:[],
    winLines:win.winLines.map(({id,rows,winMinor})=>({id,rows:[...rows],winMinor})),
    betMinor:10,multiplier:2,winMinor:win.totalWinMinor,balanceMinor:11990,
    balance:'119.90',settlementMode:'SERVER_IMMEDIATE',
    mathVersion:body.mathVersion,engineVersion:body.engineVersion,mathSha256:body.mathSha256};
};
function harness({server=serverState(),modifyReceipt=x=>x,spinStatus=200}={}){
 const calls=[];
 const json=(body,status=200)=>({ok:status<400,status,redirected:false,
   headers:{get:()=> 'application/json; charset=utf-8'},json:async()=>body});
 const fetcher=async(path,init)=>{calls.push({path,init});
   if(path===BURN_STATE_PATH)return json(server);
   if(path===BURN_SPIN_PATH)return json(spinStatus===200?modifyReceipt(receipt(JSON.parse(init.body))):{code:'INSUFFICIENT_FUNDS'},spinStatus);
   throw new Error('Unexpected host route');
 };
 return {calls,transport:createBurnWildsExistingHostTransport({fetcher})};
}
const action=()=>({action:'SPIN',gameId:BURN_WILDS_GAME_ID,requestKey,betMinor:10,auto:false,collectRoundId:null});
test('the game uses only the existing authenticated Player state and same-origin SPIN route',async()=>{
  const h=harness();
  const state=await h.transport.state();
  assert.equal(state.authenticated,true);assert.equal(state.canPlay,true);assert.equal(state.balanceMinor,10000);
  const accepted=await h.transport.dispatch(h.transport.prepare(action()));
  assert.equal(accepted.winMinor,2000);assert.equal(accepted.balanceMinor,11990);
  assert.equal(h.calls.length,2);
  assert.deepEqual(h.calls.map(x=>x.path),[BURN_STATE_PATH,BURN_SPIN_PATH]);
  assert.equal(h.calls[0].init.credentials,'same-origin');
  assert.equal(h.calls[1].init.credentials,'same-origin');
  assert.equal(h.calls[1].init.redirect,'error');
  const sent=JSON.parse(h.calls[1].init.body);
  assert.equal(sent.roundToken,requestKey);
  assert.equal(sent.bet,'0.10');
  assert.equal(sent.sessionGuard,sessionGuard);
  assert.equal(sent.mathSha256,mathSha256);
  assert.equal(sent.replayOnly,undefined);
  assert.equal('grid' in sent,false);
  assert.equal('balance' in sent,false);
  assert.equal('winMinor' in sent,false);
});
test('missing live financial approval leaves SPIN closed without an HTTP wager',async()=>{
 for(const patch of [
   {productionApproved:false},{probabilityModelAudited:false},
   {assetRightsVerified:false},{freshReleaseReady:false},{enabled:false},
   {settlementMode:'UNKNOWN'}
 ]){
   const s=serverState();Object.assign(s.game,patch);
   const h=harness({server:s});const state=await h.transport.state();
   assert.equal(state.canPlay,false);
   assert.throws(()=>h.transport.prepare(action()),/WAGER_NOT_APPROVED/);
   assert.equal(h.calls.length,1);
 }
});
test('replay sends only original prepared authority and never silently sends a second original wager',async()=>{
 const h=harness();await h.transport.state();
 const prepared=h.transport.prepare(action());
 const first=await h.transport.dispatch(prepared);
 const second=await h.transport.recover(prepared);
 assert.deepEqual(first,second);
 assert.equal(h.calls.length,3);
 const body=JSON.parse(h.calls[2].init.body);
 assert.equal(body.roundToken,requestKey);
 assert.equal(body.replayOnly,true);
 assert.equal(body.bet,'0.10');
});
test('tampered payout and identity cannot become an accepted financial receipt',async()=>{
 for(const modifyReceipt of [
   x=>({...x,winMinor:x.winMinor+1}),
   x=>({...x,gameId:'another-game'}),
   x=>({...x,clientToken:'wrong-key'}),
   x=>({...x,mathSha256:'f'.repeat(64)}),
   x=>({...x,settlementMode:'CLIENT_LOCAL'}),
   x=>({...x,balance:'999.99'})
 ]){
   const h=harness({modifyReceipt});
   await h.transport.state();
   await assert.rejects(()=>h.transport.dispatch(h.transport.prepare(action())));
   assert.equal(h.calls.filter(x=>x.path===BURN_SPIN_PATH).length,1);
 }
});
test('no invented login, balance, model or test session is accepted',async()=>{
 for(const change of [
  x=>{x.authenticated=false},x=>{x.currency='DMO'},x=>{x.sessionGuard='no-session'},
  x=>{x.game=null},x=>{x.balance='fake'},x=>{x.round={roundId:'history'}},
  x=>{x.game.mathSha256='missing'}
 ]){
  const s=serverState();change(s);const h=harness({server:s});
  await assert.rejects(()=>h.transport.state());
  assert.equal(h.calls.length,1);
 }
});
test('definitive server rejection remains explicit and never credits the account',async()=>{
 const h=harness({spinStatus:402});await h.transport.state();
 const prepared=h.transport.prepare(action());
 await assert.rejects(()=>h.transport.dispatch(prepared),error=>{
   assert.equal(error.status,402);assert.equal(error.definitiveRejection,true);return true;
 });
 assert.equal(h.calls.length,2);
});


test('RECOVER preserves original token and model after a release closes without allowing a new SPIN',async()=>{
 const h=harness();
 await h.transport.state();
 const original=h.transport.prepare(action());
 const closed=serverState();
 closed.game.enabled=false;
 closed.game.productionApproved=false;
 closed.game.freshReleaseReady=false;
 closed.game.betLevels=[];
 delete closed.game.mathVersion;
 delete closed.game.engineVersion;
 delete closed.game.mathSha256;
 // The existing Player may withdraw a model while one prior accepted
 // request is still awaiting a replay. Its actual journal owns the result.
 const altered=harness({server:closed});
 const s=await altered.transport.state();
 assert.equal(s.canPlay,false);
 assert.deepEqual(s.betLevelsMinor,[]);
 assert.equal(s.model,null);
 assert.throws(()=>altered.transport.prepare(action()),/WAGER_NOT_APPROVED/);
 const reply=await altered.transport.recover(original);
 assert.equal(reply.clientToken,requestKey);
 assert.equal(reply.winMinor,2000);
 assert.equal(altered.calls.length,2);
 const replay=JSON.parse(altered.calls[1].init.body);
 assert.equal(replay.replayOnly,true);
 assert.equal(replay.roundToken,requestKey);
 assert.equal(replay.mathVersion,original.mathVersion);
 assert.equal(replay.mathSha256,original.mathSha256);
 assert.equal(altered.calls.filter(v=>v.path===BURN_SPIN_PATH).length,1);
});
test('RECOVER uses immutable accepted-round authority across model rotation',async()=>{
 const h=harness();
 await h.transport.state();
 const original=h.transport.prepare(action());
 const rotated=serverState();
 rotated.game.mathVersion='burn-rotated-v2';
 rotated.game.mathSha256='d'.repeat(64);
 rotated.game.betLevels=['0.25'];
 const altered=harness({server:rotated});
 const state=await altered.transport.state();
 assert.equal(state.model.mathVersion,'burn-rotated-v2');
 assert.deepEqual(state.betLevelsMinor,[25]);
 await assert.rejects(async()=>altered.transport.dispatch(original),/WAGER_NOT_APPROVED/);
 const reply=await altered.transport.recover(original);
 assert.equal(reply.winMinor,2000);
 const sent=JSON.parse(altered.calls.at(-1).init.body);
 assert.equal(sent.replayOnly,true);
 assert.equal(sent.roundToken,requestKey);
 assert.equal(sent.mathSha256,mathSha256);
 assert.equal(altered.calls.length,2);
});
test('recovery still blocks a changed authenticated player or forged original model identity',async()=>{
 const h=harness();
 await h.transport.state();
 const original=h.transport.prepare(action());
 const other=serverState();other.sessionGuard='c'.repeat(64);other.game.enabled=false;
 const altered=harness({server:other});
 await altered.transport.state();
 await assert.rejects(async()=>altered.transport.recover(original),/ACTION_CHANGED/);
 const forged={...original,mathSha256:'not-a-sha256'};
 await assert.rejects(async()=>h.transport.recover(forged),/ACTION_CHANGED/);
 assert.equal(altered.calls.length,1);
 assert.equal(h.calls.length,1);
});
