import test from 'node:test';
import assert from 'node:assert/strict';
import {model,uniformBelow,multiplierForTicket,evaluate,spin,gamble} from '../operator-math/multi-hot-5.mjs';

test('operator RTP is exactly 24/25 by exhaustive line outcomes and multiplier tickets',()=>{
 // Each payline observes three independent uniform cells. Summing expectations
 // over five overlapping lines is valid without assuming lines are independent.
 let weightedReturn=0n;const counts=[0,0,0,0,0];
 for(let ticket=0;ticket<5750;ticket++)counts[multiplierForTicket(ticket)-1]++;
 assert.deepEqual(counts,model.multiplierWeights);
 for(let a=0;a<9;a++)for(let b=0;b<9;b++)for(let c=0;c<9;c++){
  for(let m=1;m<=5;m++)if(a===b&&b===c)weightedReturn+=BigInt(model.linePays[a]*m*counts[m-1]);
 }
 assert.equal(weightedReturn*25n,729n*5750n*24n);
 assert.deepEqual(model.theoreticalRtp,{numerator:24,denominator:25});
});
test('all five lines settle exactly in minor units and maximum exposure is bounded',()=>{
 const best=evaluate({betMinor:40000,grid:Array.from({length:3},()=>['777','777','777']),multiplier:5});
 assert.equal(best.wins.length,5);assert.equal(best.payoutMinor,'15000000');
 assert.equal(best.maxBaseLiabilityMinor,best.payoutMinor);
 const single=evaluate({betMinor:5,grid:[['777','orange','plum'],['dollar','dollar','dollar'],['cherry','lemon','grapes']],multiplier:3});
 assert.equal(single.payoutMinor,'150');assert.deepEqual(single.wins.map(w=>w.line),[1]);
 const diagonal=evaluate({betMinor:5,grid:[['777','orange','plum'],['dollar','777','lemon'],['cherry','grapes','777']],multiplier:2});
 assert.equal(diagonal.payoutMinor,'150');assert.deepEqual(diagonal.wins.map(w=>w.line),[4]);
});
test('invalid stakes, cells and random words fail before a payable outcome',()=>{
 let draws=0;const rng=()=>{draws++;return 0;};
 for(const bet of [0,-5,1,6,0.05,40005,NaN,Infinity,'5'])assert.throws(()=>spin(bet,rng));
 assert.equal(draws,0);
 assert.throws(()=>evaluate({betMinor:5,grid:[['777']],multiplier:1}));
 assert.throws(()=>evaluate({betMinor:5,grid:[Array(3),['777','777','777'],['orange','orange','orange']],multiplier:1}));
 assert.throws(()=>uniformBelow(9,()=>-1));
 assert.throws(()=>uniformBelow(9,()=>0xffffffff),/failed rejection/);
});
test('rejection sampling discards biased tail and normal spin uses server entropy only',()=>{
 const words=[0xffffffff,0xfffffffc,8];let calls=0;
 assert.equal(uniformBelow(9,()=>{calls++;return words.shift();}),8);assert.equal(calls,3);
 const result=spin(5,()=>0);assert.equal(result.payoutMinor,'50');assert.equal(result.multiplier,1);
 assert.equal(result.modelId,'special74_multi_hot_5_v1');assert.equal(model.claimsProviderMath,false);
});
test('gamble is fair 2x with amount and attempt limits enforced server-side',()=>{
 for(const choice of ['red','black']){
  const payouts=[0,1].map(word=>Number(gamble({amountMinor:49999,attempt:4,choice},()=>word).payoutMinor));
  assert.equal(payouts[0]+payouts[1],99998);
 }
 for(const invalid of [{amountMinor:50001,attempt:0,choice:'red'},{amountMinor:1,attempt:5,choice:'red'},{amountMinor:1,attempt:0,choice:'blue'}])assert.throws(()=>gamble(invalid));
});
