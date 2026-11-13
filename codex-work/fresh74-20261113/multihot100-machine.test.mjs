import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiHot100Machine, parseMinor} from './multihot100-machine.mjs';

// Isolated data fixtures, not provider mathematics or production wallet data.
const grid=Array.from({length:5},()=>['lemon','cherry','orange','plum']);
function make(overrides={}) {
  const requests=[], audio=[];let id=0,stops=0;
  const machine=new MultiHot100Machine({gameId:'multihot100-fixture',allowedBets:[100,200,300,400,500],balanceMinor:10000,currency:'DMO',
    initialBetMinor:100,symbols:new Set(grid.flat()),nextToken:()=>`round-${++id}`,
    startRound:async p=>{requests.push(p);return {...p,currency:'DMO',balanceMinor:9900,winMinor:0,multiplier:2,grid};},
    recoverRound:async p=>({...p,currency:'DMO',balanceMinor:9900,winMinor:0,multiplier:2,grid}),
    present:()=>({finished:Promise.resolve({cancelled:false}),stop(){stops++;},cancel(){}}),onAudio:s=>audio.push(s),...overrides});
  return {machine,requests,audio,get stops(){return stops;}};
}
test('the five-by-four machine exposes only server-authoritative money and multiplier',async()=>{
  const f=make();await f.machine.spin();const s=f.machine.snapshot();
  assert.equal(s.balanceMinor,9900);assert.equal(s.winMinor,0);assert.equal(s.multiplier,2);assert.equal(s.state,'idle');
});
test('bet selection closes its panel and cannot change while a result is pending',async()=>{
  let resolve;const f=make({startRound:p=>new Promise(r=>{resolve=()=>r({...p,currency:'DMO',balanceMinor:9800,winMinor:0,multiplier:1,grid});})});
  f.machine.openPanel('bet');f.machine.setBet(200);assert.equal(f.machine.panel,null);
  const task=f.machine.spin();assert.throws(()=>f.machine.setBet(300),/cannot change/);assert.throws(()=>f.machine.openPanel('history'),/unavailable/);
  assert.equal(f.machine.stop(),true);resolve();await task;assert.equal(f.stops,1);
});
test('autoplay runs exactly the selected count and does not accept bet changes mid-run',async()=>{
  const f=make();f.machine.openPanel('autoplay');const task=f.machine.startAutoplay({count:25});
  assert.throws(()=>f.machine.setBet(200),/cannot change/);await task;
  assert.equal(f.requests.length,25);assert.equal(new Set(f.requests.map(x=>x.roundId)).size,25);assert.equal(f.machine.snapshot().autoRemaining,0);
});
test('autoplay stop thresholds use returned balances and stop after the current round',async()=>{
  for(const [threshold,result] of [
    [{winLimitMinor:500},{balanceMinor:10400,winMinor:500}],
    [{lossLimitMinor:300},{balanceMinor:9700,winMinor:0}],
    [{gainLimitMinor:400},{balanceMinor:10400,winMinor:500}]
  ]){
    let calls=0;const f=make({startRound:async p=>{calls++;return {...p,currency:'DMO',multiplier:5,grid,...result};}});
    await f.machine.startAutoplay({count:25,...threshold});assert.equal(calls,1);assert.equal(f.machine.balanceMinor,result.balanceMinor);
  }
});
test('STOP ends autoplay without a second request or cancelling an accepted result',async()=>{
  let resolve;const f=make({present:()=>({finished:new Promise(r=>{resolve=r;}),stop(){},cancel(){throw Error('must not cancel');}})});
  const task=f.machine.startAutoplay({count:100});await new Promise(setImmediate);f.machine.stop();resolve({cancelled:false});await task;
  assert.equal(f.requests.length,1);assert.equal(f.machine.balanceMinor,9900);assert.equal(f.machine.round.state,'idle');
});
test('network uncertainty stops autoplay and recovery does not send a replacement wager',async()=>{
  let calls=0;const f=make({startRound:async()=>{calls++;throw Error('offline');}});
  await f.machine.startAutoplay({count:25});assert.equal(calls,1);assert.equal(f.machine.round.state,'uncertain');
  await f.machine.recover();assert.equal(calls,1);assert.equal(f.machine.balanceMinor,9900);
});
test('invalid symbols, dimensions, multiplier or currency never change displayed balance',async()=>{
  for(const change of [{grid:[['lemon']]},{grid:grid.map(c=>c.map(()=> 'unknown'))},{multiplier:99},{currency:'USD'},{winningPaths:[[0,0,0,0,5]]}]){
    const f=make({startRound:async p=>({...p,currency:'DMO',balanceMinor:1,winMinor:0,multiplier:2,grid,...change})});
    await f.machine.spin();assert.equal(f.machine.round.state,'uncertain');assert.equal(f.machine.balanceMinor,10000);
  }
});
test('audio controls are independent and snapshots cannot mutate the machine',()=>{
  const f=make();f.machine.setAudio('effects',false);assert.deepEqual(f.audio,[{effects:false,music:true}]);
  assert.throws(()=>{f.machine.snapshot().settings.music=false;},TypeError);assert.equal(f.machine.settings.music,true);
});
test('invalid autoplay choices and decimal amounts are rejected before any request',async()=>{
  const f=make();await assert.rejects(f.machine.startAutoplay({count:10}),/invalid count/);
  await assert.rejects(f.machine.startAutoplay({count:25,winLimitMinor:0}),/threshold/);assert.equal(f.requests.length,0);
  assert.equal(parseMinor('1.01'),101);assert.equal(parseMinor('20'),2000);assert.equal(parseMinor('0.10'),10);
  for(const amount of ['1.005','-1','NaN','1e3','9007199254740991'])assert.throws(()=>parseMinor(amount));
});
