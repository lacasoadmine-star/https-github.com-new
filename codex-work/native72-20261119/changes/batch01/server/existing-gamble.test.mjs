import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createExistingGamble,GAMBLE_POLICY} from './existing-gamble.mjs';

const user='qa-player',cookie='a'.repeat(64),hash=s=>createHash('sha256').update(s).digest('hex');
const gameId='fresh_multihot20',roundId='7126534b-d5d0-4cbe-8a77-74a2d768a5d1',roundToken='6126534b-d5d0-4cbe-8a77-74a2d768a5d1';
const body={gameId,roundId,roundToken,choice:'RED',expectedAttempt:1,expectedStake:'1.00',
  sessionGuard:hash('fresh-account-session-v1\0'+user+'\0'+cookie),mathVersion:'qa',engineVersion:'qa',mathSha256:'a'.repeat(64)};
const request=new Request('https://qa.invalid/api/slots/gamble',{method:'POST',headers:{cookie:'sw_session='+cookie}});
function fixture({saved=false,conflict=false,reauthUser=user}={}){
  let transactions=0,auths=0,locks=0,profileCalls=0,mutations=0;
  const receipt={kind:'GAMBLE',gameId,roundId,roundToken,actionId:'5126534b-d5d0-4cbe-8a77-74a2d768a5d1',
    stake:'1.00',payout:'2.00',attempt:1,choice:'RED',currency:'ETB'};
  const fingerprint=hash(JSON.stringify({uid:user,kind:'GAMBLE',gameId,roundId,choice:'RED',expectedAttempt:1,expectedStake:'1.00'}));
  const client={query:async sql=>{
    if(sql.startsWith('SELECT request_hash,result_json FROM sw_nine.actions'))return {rowCount:saved?1:0,rows:saved?[{request_hash:conflict?'0'.repeat(64):fingerprint,result_json:receipt}]:[]};
    if(sql.startsWith('SELECT 1 FROM sw_nine.game_rounds'))return {rowCount:0,rows:[]};
    mutations++;throw Error('UNEXPECTED_WRITE_OR_RELEASE_QUERY');
  }};
  const api=createExistingGamble({hash,authenticate:async()=>{auths++;return auths===1?user:reauthUser},
    transaction:async fn=>{transactions++;return fn(client)},lockWallets:async()=>{locks++},
    move:async()=>{mutations++;throw Error('NO_WAGER_EXPECTED')},balance:async()=>0n,houseFor:()=>'house',
    accepting:()=>false,publicGames:()=>[],profileForGame:async()=>{profileCalls++;throw Error('PROFILE_STORE_UNAVAILABLE')},
    assertOperatorWagerEnabled:async()=>{throw Error('RELEASE_CLOSED')},assertNoActive:async()=>{},assertPlayerCapacity:async()=>{}});
  return{api,receipt,metrics:()=>({transactions,auths,locks,profileCalls,mutations})};
}
test('ETB operator X2 limits are explicit and do not convert provider demo currency',()=>{
  assert.deepEqual(GAMBLE_POLICY,{maxAttempts:5,maxStake:'500.00',expiresMs:600000,probability:'1/2',operatorLimit:true,providerCurrencyConverted:false});
});
test('stored action replay succeeds with closed release and unavailable profile storage',async()=>{
  const x=fixture({saved:true});assert.deepEqual(await x.api.gamble(request,{...body,replayOnly:true}),x.receipt);
  assert.deepEqual(x.metrics(),{transactions:1,auths:2,locks:1,profileCalls:0,mutations:0});
});
test('missing replay cannot open a new gamble or call the current profile',async()=>{
  const x=fixture();await assert.rejects(()=>x.api.gamble(request,{...body,replayOnly:true}),e=>e.code==='ROUND_NOT_FOUND_FOR_REPLAY'&&e.status===404);
  assert.equal(x.metrics().profileCalls,0);assert.equal(x.metrics().mutations,0);
});
test('reused action token rejects parameter conflict before profile lookup or money mutation',async()=>{
  const x=fixture({saved:true,conflict:true});
  await assert.rejects(()=>x.api.gamble(request,body),/IDEMPOTENCY_PARAMETER_CONFLICT/);
  assert.equal(x.metrics().profileCalls,0);assert.equal(x.metrics().mutations,0);
});
test('wrong session guard is rejected without starting a transaction',async()=>{
  const x=fixture();await assert.rejects(()=>x.api.gamble(request,{...body,sessionGuard:'0'.repeat(64)}),e=>e.code==='PLAYER_SESSION_CHANGED'&&e.status===403);
  assert.equal(x.metrics().transactions,0);
});
test('reauthentication changing Player identity rejects before acquiring wallet ownership',async()=>{
  const x=fixture({reauthUser:'someone-else'});
  await assert.rejects(()=>x.api.gamble(request,body),/PLAYER_SESSION_CHANGED/);
  assert.equal(x.metrics().locks,0);assert.equal(x.metrics().mutations,0);
});
test('client payout and probability overrides never enter a transaction',async()=>{
  const x=fixture();await assert.rejects(()=>x.api.gamble(request,{...body,payout:'500.00'}),e=>e.code==='CLIENT_MATH_OR_PROFILE_OVERRIDE_NOT_ALLOWED'&&e.status===400);
  assert.equal(x.metrics().transactions,0);
});
test('invalid colour and malformed expected stake fail before any possible debit',async()=>{
  const x=fixture();await assert.rejects(()=>x.api.gamble(request,{...body,choice:'green'}),/INVALID_CHOICE/);
  await assert.rejects(()=>x.api.gamble(request,{...body,expectedStake:'NaN'}),/INVALID_ETB_AMOUNT/);
  assert.equal(x.metrics().transactions,0);assert.equal(x.metrics().mutations,0);
});
