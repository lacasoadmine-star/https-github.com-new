import test from 'node:test';
import assert from 'node:assert/strict';
import {RoundController, RoundRejected} from './round-controller.mjs';

function deferred() {let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;});return {promise,resolve,reject};}
function fixture(overrides={}) {
  const request=deferred(), recovery=deferred(), animation=deferred();
  const starts=[],lookups=[],states=[];let stops=0,cancels=0,serial=0;
  const controller=new RoundController({gameId:'observed-test-game',
    startRound:p=>{starts.push(p);return request.promise;},
    recoverRound:p=>{lookups.push(p);return recovery.promise;},
    validateResult:r=>r,
    present:()=>({finished:animation.promise,stop:()=>{stops++;},cancel:()=>{cancels++;}}),
    nextToken:()=>`round-${++serial}`,onState:s=>states.push(s),...overrides});
  return {controller,request,recovery,animation,starts,lookups,states,get stops(){return stops;},get cancels(){return cancels;},
    result:()=>({...starts[0],grid:[['a']],balanceMinor:9900,winMinor:0})};
}
test('double tap and STOP during request issue one wager and retain the authoritative balance', async()=>{
  const f=fixture(), task=f.controller.spin(100);
  await assert.rejects(f.controller.spin(100),/resolved/);
  assert.equal(f.controller.stop(),true);assert.equal(f.controller.stop(),false);
  f.request.resolve(f.result());await new Promise(setImmediate);assert.equal(f.stops,1);
  assert.equal(f.controller.state,'presenting');f.animation.resolve({cancelled:false});
  const result=await task;assert.equal(f.starts.length,1);assert.equal(result.balanceMinor,9900);assert.equal(f.controller.state,'idle');
});
test('network uncertainty locks the next bet and recovery uses the identical round token',async()=>{
  const f=fixture(),task=f.controller.spin(100);f.request.reject(new Error('network timeout'));await task;
  assert.equal(f.controller.state,'uncertain');await assert.rejects(f.controller.spin(100),/resolved/);
  const retry=f.controller.recover();assert.deepEqual(f.lookups,[f.starts[0]]);
  f.recovery.resolve(f.result());f.animation.resolve({cancelled:false});await retry;
  assert.equal(f.starts.length,1);assert.equal(f.controller.state,'idle');
});
test('missing recovery response remains uncertain without creating or refunding a wager',async()=>{
  const f=fixture(),task=f.controller.spin(100);f.request.reject(new Error('network'));await task;
  const retry=f.controller.recover();f.recovery.resolve(null);await retry;
  assert.equal(f.controller.state,'uncertain');assert.equal(f.starts.length,1);
});
test('wrong round, game or amount cannot enter presentation',async()=>{
  for(const change of [{roundId:'wrong'},{gameId:'wrong'},{betMinor:200}]){
    const f=fixture(),task=f.controller.spin(100);f.request.resolve({...f.result(),...change});await task;
    assert.equal(f.controller.state,'uncertain');assert.equal(f.controller.result,null);
  }
});
test('confirmed server non-acceptance releases a round while preserving token uniqueness',async()=>{
  const f=fixture({nextToken:()=> 'same-token'}),task=f.controller.spin(100);
  f.request.reject(new RoundRejected('Bet was not accepted'));await task;
  assert.equal(f.controller.state,'idle');await assert.rejects(f.controller.spin(100),/unique/);assert.equal(f.starts.length,1);
});
test('presentation failure can replay the settled result without any new server request',async()=>{
  const second=deferred();let presentations=0;
  const f=fixture({present:()=>{presentations++;if(presentations===1)throw new Error('canvas lost');return {finished:second.promise,stop(){},cancel(){}};}});
  const task=f.controller.spin(100);f.request.resolve(f.result());await task;
  assert.equal(f.controller.state,'presentation-error');const replay=f.controller.replayPresentation();second.resolve({cancelled:false});await replay;
  assert.equal(f.starts.length,1);assert.equal(f.lookups.length,0);assert.equal(f.controller.state,'idle');
});
test('dispose prevents late responses from mounting another canvas or issuing another request',async()=>{
  let presentations=0;const f=fixture({present:()=>{presentations++;}}),task=f.controller.spin(100);
  f.controller.dispose();f.request.resolve(f.result());await task;
  assert.equal(f.controller.state,'disposed');assert.equal(presentations,0);assert.equal(f.controller.pending.roundId,'round-1');
});
test('result is immutable and detached from a mutable server response',async()=>{
  const f=fixture(),task=f.controller.spin(100),result=f.result();f.request.resolve(result);await new Promise(setImmediate);
  result.grid[0][0]='changed';assert.equal(f.controller.result.grid[0][0],'a');assert.ok(Object.isFrozen(f.controller.result.grid[0]));
  f.animation.resolve({cancelled:false});await task;
});
test('invalid amount or result validation failure cannot launch an animation',async()=>{
  const f=fixture({validateResult:()=>{throw new Error('unknown symbol');}});
  await assert.rejects(f.controller.spin(NaN),/minor/);assert.equal(f.starts.length,0);
  const task=f.controller.spin(100);f.request.resolve(f.result());await task;assert.equal(f.controller.state,'uncertain');
});
