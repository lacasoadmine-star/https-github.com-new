import test from 'node:test';
import assert from 'node:assert/strict';
import {BurnWildsLiveController} from './live-controller.mjs';
import {GAME_ID} from './contract.mjs';

const state=()=>({authenticated:true,gameId:GAME_ID,currency:'ETB',subject:'player-test',
  balanceMinor:1000,betLevelsMinor:[100,200],cashReleaseApproved:true,
  modelVersion:'approved-v1',assetManifestId:'own-images'});
const receipt=a=>({gameId:GAME_ID,serverSettled:true,requestKey:a.requestKey,
  betMinor:a.betMinor,roundId:'round-1',subject:'player-test',winMinor:0,balanceMinor:900,
  multiplier:1,currency:'ETB',modelVersion:'approved-v1',
  ledger:{betTxId:'tx-1'},historyRecorded:true,
  finalGrid:[['a','b','a'],['a','a','b'],['a','b','a'],['b','a','a'],['a','b','b']],
  expandedColumns:[],winningLines:[]});
function fixture({gate=true,spinError=false}={}) {
  const keys=new Map(),calls=[];
  const host={getState:async()=>({...state(),cashReleaseApproved:gate}),
    spin:async a=>{calls.push(['spin',a]);if(spinError)throw Error('NETWORK_LOST');return receipt(a);},
    recover:async a=>{calls.push(['recover',a]);return receipt(a);}};
  const storage={getItem:k=>keys.get(k)??null,setItem:(k,v)=>keys.set(k,v),removeItem:k=>keys.delete(k)};
  const renderer={start:o=>calls.push(['start',o]),accept:r=>calls.push(['accept',r]),
    accelerate:()=>calls.push(['accelerate']),finish:id=>calls.push(['finish',id])};
  const controller=new BurnWildsLiveController({host,renderer,storage,
    symbols:['a','b','wild'],keyFactory:()=> 'nonce-1'});
  return {controller,host,storage,calls,keys};
}
test('one host SPIN produces one validated server-settled receipt',async()=>{
  const {controller,calls}=fixture();await controller.connect();
  const r=await controller.spin(100);assert.equal(r.roundId,'round-1');
  assert.equal(controller.snapshot().balanceMinor,900);
  assert.deepEqual(calls.map(x=>x[0]),['start','spin','accept']);
});
test('STOP accelerates only; no second debit request',async()=>{
  const {controller,calls}=fixture();await controller.connect();await controller.spin(100);
  assert.equal(controller.stop(),true);assert.equal(calls.filter(x=>x[0]==='spin').length,1);
});
test('only accepted round can finish visual presentation',async()=>{
  const {controller}=fixture();await controller.connect();await controller.spin(100);
  assert.equal(controller.presentationFinished('wrong'),false);
  assert.equal(controller.presentationFinished('round-1'),true);
  assert.equal(controller.snapshot().phase,'READY');
});
test('input lock prevents overlapping SPIN',async()=>{
  const {controller,calls}=fixture();await controller.connect();await controller.spin(100);
  await assert.rejects(controller.spin(100),/BURN_INPUT_LOCK/);
  assert.equal(calls.filter(x=>x[0]==='spin').length,1);
});
test('unapproved production gate blocks all financial requests',async()=>{
  const {controller,calls}=fixture({gate:false});await controller.connect();
  await assert.rejects(controller.spin(100),/BURN_FINANCIAL_GATE_CLOSED/);
  assert.equal(calls.length,0);
});
test('lost reply retains original request identity; recovery is replay-only',async()=>{
  const {controller,calls,keys}=fixture({spinError:true});await controller.connect();
  await assert.rejects(controller.spin(100),/NETWORK_LOST/);
  assert.equal(controller.snapshot().needsRecovery,true);assert.equal(keys.size,1);
  const r=await controller.recover();assert.equal(r.roundId,'round-1');assert.equal(keys.size,0);
  assert.equal(calls.filter(x=>x[0]==='spin').length,1);
  assert.equal(calls.filter(x=>x[0]==='recover').length,1);
});
test('cross-account recovery is denied',async()=>{
  const a=fixture({spinError:true});await a.controller.connect();
  await assert.rejects(a.controller.spin(100));
  a.host.getState=async()=>({...state(),subject:'different-player'});
  await assert.rejects(a.controller.connect(),/BURN_SAVED_ACTION_ACCOUNT_MISMATCH/);
  assert.equal(a.controller.snapshot().phase,'BLOCKED');
});
test('invalid bet never reaches the host',async()=>{
  const a=fixture();await a.controller.connect();
  await assert.rejects(a.controller.spin(500),/BURN_NEW_SPIN_BLOCKED/);
  assert.equal(a.calls.length,0);
});
