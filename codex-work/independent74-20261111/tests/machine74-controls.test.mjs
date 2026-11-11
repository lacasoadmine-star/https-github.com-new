import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineSignInHref,requestPlayerSignIn,notifyPlayerWallet,canStartRound,startRoundOptions,gamblePresentation,slotSpinLabel,slotPaytable,roundNeedsRecovery,publicCurrentRound,activeRoundStake} from '../client/machine74-controls.mjs';

const gameId='ind74_official_multihot10';
function browserFixture(){const calls=[];const hostWindow={location:{origin:'https://superwin-player.apdiy61.workers.dev'},parent:{postMessage:(body,target)=>calls.push({body,target})}};return {calls,hostWindow};}

test('embedded sign-in keeps the selected game and sends only a same-origin navigation request',()=>{
  const {calls,hostWindow}=browserFixture();let prevented=0;
  assert.equal(machineSignInHref(gameId),'/?ind74='+gameId);
  assert.equal(requestPlayerSignIn({preventDefault:()=>prevented++},{gameId,embedded:true,hostWindow}),true);
  assert.equal(prevented,1);
  assert.deepEqual(calls,[{body:{type:'independent74:sign-in',gameId},target:hostWindow.location.origin}]);
  assert.equal(requestPlayerSignIn({preventDefault:()=>prevented++},{gameId,embedded:false,hostWindow}),false);
  hostWindow.parent=hostWindow;
  assert.equal(requestPlayerSignIn({preventDefault:()=>prevented++},{gameId,embedded:true,hostWindow}),false);
  assert.equal(prevented,1);
  assert.throws(()=>machineSignInHref('https://other.example/'),/identity/);
  assert.throws(()=>machineSignInHref(gameId+'&token=secret'),/identity/);
});

test('wallet change notifications never include financial data or originate from DEMO',()=>{
  const {calls,hostWindow}=browserFixture();
  assert.equal(notifyPlayerWallet({gameId,embedded:true,demo:true,hostWindow}),false);
  assert.equal(notifyPlayerWallet({gameId,embedded:false,demo:false,hostWindow}),false);
  assert.equal(notifyPlayerWallet({gameId,embedded:true,demo:false,hostWindow}),true);
  assert.deepEqual(calls,[{body:{type:'independent74:wallet-changed',gameId},target:hostWindow.location.origin}]);
});

test('new starts require an accepting snapshot without any active or pending round',()=>{
  const ready={accepting:true,game:{launchable:true},round:null};
  assert.equal(canStartRound(ready),true);
  assert.equal(canStartRound({...ready,round:{status:'settled'}}),true);
  for(const state of [null,{}, {...ready,accepting:false},{...ready,game:{launchable:false}},{...ready,other_active_game:'another'},...['active','pending'].map(status=>({...ready,round:{status}}))])assert.equal(canStartRound(state),false);
});

test('manual X2 holds a real public model win while AUTO receives a settled credited win',()=>{
  const definition=publicLibrary74Definition(math.getGameDefinition(gameId)),selected={holdWin:true};
  const manual=math.startRound({gameId,betMinor:'100',options:startRoundOptions(definition,selected),rng:()=>0,now:1700000000000});
  const automatic=math.startRound({gameId,betMinor:'100',options:startRoundOptions(definition,selected,{autoplay:true}),rng:()=>0,now:1700000000000});
  assert.equal(manual.status,'active');assert(BigInt(manual.pendingWinMinor)>0n);
  assert.notEqual(automatic.status,'active');assert(BigInt(automatic.winMinor)>0n);
  assert.deepEqual(selected,{holdWin:true});
  assert.equal(gamblePresentation(definition,math.publicRound(manual)).canGamble,true);
  assert.equal(gamblePresentation(definition,{...math.publicRound(manual),allowedActions:[]}).canGamble,false);
  assert.equal(gamblePresentation(definition,{...math.publicRound(manual),allowedActions:[]}).canCollect,false);
  assert.equal(gamblePresentation(definition,math.publicRound(automatic)).pending,false);
});

test('older unresolved models preserve their receipt but cannot be drawn or restarted using the current model',()=>{
  const round={status:'active',previous_model:true,recovery_required:true,pendingWinMinor:'850',allowedActions:[],outcome:{oldGeometry:'retained'}};
  const snapshot={accepting:true,balance:'19.50',recovery_required:true,round},before=JSON.stringify(snapshot);
  assert.equal(roundNeedsRecovery(snapshot),true);assert.equal(canStartRound(snapshot),false);assert.equal(publicCurrentRound(snapshot),null);
  assert.equal(gamblePresentation({gamble:{enabled:true,maxRounds:3}},round).pending,false);
  assert.equal(JSON.stringify(snapshot),before);
  const settled={accepting:true,round:{status:'settled',previous_model:true,payoutMinor:'850'}};
  assert.equal(canStartRound(settled),true);assert.equal(publicCurrentRound(settled),null);
  const current={accepting:true,round:{status:'settled',payoutMinor:'850',outcome:{grid:[]}}};assert.equal(publicCurrentRound(current),current.round);
});

test('published controls and paytable include two-symbol entries and Wild awards without invented columns',()=>{
  assert.equal(slotSpinLabel({id:gameId}),'HOLD & SPIN');
  assert.equal(slotSpinLabel({id:'unlisted'}),'SPIN');
  const table=slotPaytable({symbols:[{id:'seven',label:'Seven',pays:{2:1,3:10,5:50}}],wildSymbol:{id:'wild',label:'Wild',pays:{3:100}}});
  assert.deepEqual(table.counts,[2,3,5]);
  assert.deepEqual(table.rows,[{id:'seven',label:'Seven',awards:[1,10,50]},{id:'wild',label:'Wild',awards:[null,100,null]}]);
  const half=slotPaytable({symbolPrizeDivisor:2,symbols:[{id:'seven',label:'Seven',pays:{2:5,3:40,4:100,5:1000}}]});
  assert.deepEqual(half.rows[0].awards,[2.5,20,50,500]);
  assert.throws(()=>slotPaytable({symbolPrizeDivisor:0,symbols:[]}),/divisor/);
});

test('active receipt restores its committed total stake without treating a settled round as the next bet',()=>{
 const state={round:{status:'active',betMinor:'500',pendingWinMinor:'900'}},before=JSON.stringify(state);assert.equal(activeRoundStake(state),'500');assert.equal(activeRoundStake({round:{...state.round,totalBetMinor:'1500'}}),'1500');assert.equal(activeRoundStake({round:{...state.round,status:'settled'}}),null);assert.equal(activeRoundStake({round:{...state.round,betMinor:'NaN'}}),null);assert.equal(activeRoundStake({round:{...state.round,previous_model:true,recovery_required:true}}),'500');assert.equal(JSON.stringify(state),before);
});
