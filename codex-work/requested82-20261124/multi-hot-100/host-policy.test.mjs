import assert from 'node:assert/strict';
import test from 'node:test';
import {MultiHot100Controls,validateM100RoundView,MULTI_HOT_100_GAME_ID} from './controls.mjs';
const betLevels=['1.00','10.00','40000.00'];
const policy=()=>({gameId:MULTI_HOT_100_GAME_ID,backendGameId:'multihot100_native',currency:'ETB',serverAuthoritative:true,
  balance:'37.50',betLevels:[...betLevels],mathVersion:'isolated-shape-fixture',engineVersion:'isolated-shape-fixture',mathSha256:'a'.repeat(64)});
test('ETB needs an explicit matching existing-host policy; reference defaults stay DMO without funds',()=>{
  assert.throws(()=>new MultiHot100Controls({currency:'ETB'}),/HOST_POLICY/);
  const reference=new MultiHot100Controls().snapshot();assert.equal(reference.currency,'DMO');assert.equal(reference.balance,null);assert.equal(reference.cashEnabled,false);
  for(const change of [{backendGameId:'multi_hot_100'},{balance:'37.500'},{currency:'DMO'},{serverAuthoritative:false},{mathSha256:'unverified'},{betLevels:['2.00']}]){
    assert.throws(()=>new MultiHot100Controls({currency:'ETB',betLevels,hostPolicy:{...policy(),...change}}),/HOST_POLICY/);
  }
});
test('existing host balance and permitted ETB bets are copied without creating a balance or outcome',()=>{
  const hostPolicy=policy(),controls=new MultiHot100Controls({currency:'ETB',betLevels,hostPolicy});
  hostPolicy.balance='999.00';hostPolicy.betLevels[0]='999.00';
  assert.equal(controls.snapshot().balance,'37.50');assert.equal(controls.snapshot().round,null);
  assert.equal(controls.selectBet('40000.00'),true);assert.equal(controls.selectBet('40001.00'),false);
  const intent=controls.requestSpin('isolated-policy-request').intents[0];assert.equal(intent.currency,'ETB');assert.equal(intent.bet,'40000.00');
  const receipt={gameId:MULTI_HOT_100_GAME_ID,requestKey:intent.requestKey,roundId:'isolated-policy-round',currency:'ETB',bet:intent.bet,
    winAmount:'0.00',grid:Array.from({length:4},()=>Array(5).fill('lemon')),multiplier:1};
  assert.equal(validateM100RoundView(receipt,intent).currency,'ETB');
  assert.throws(()=>validateM100RoundView({...receipt,currency:'DMO'},intent),/CURRENCY/);
  assert.throws(()=>validateM100RoundView({...receipt,currency:undefined},intent),/CURRENCY/);
});
