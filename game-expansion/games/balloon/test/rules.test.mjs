import test from 'node:test';
import assert from 'node:assert/strict';
import {ID, VERSION, definitions, start, act, expire, publicState} from '../balloon-rules.mjs';

test('native Balloon version and independent math are explicit',()=>{
 const game=definitions[ID];assert.equal(ID,'balloon_native');
 assert.equal(VERSION,game.version);
 assert.equal(game.officialPrivateMathVerified,false);
 assert.equal(game.minStake,'0.10');assert.equal(game.maxStake,'100.00');
});
test('a hold extends the round without debiting twice',()=>{
 const t=1700000000000,initial=start(ID,{stakeMinor:'10'},()=>0.5,t);
 assert.equal(initial.state.status,'active');assert.equal(initial.debitMinor,'10');
 const held=act(initial.state,{type:'hold'},()=>0.25,t+500);
 assert.equal(held.debitMinor,'0');assert.equal(held.state.status,'active');
 assert.equal(held.state.holdUntil,t+3500);
 assert.equal(Object.hasOwn(publicState(initial.state,t+100),'crash'),false);
});
test('collect is server decided and payouts are bounded',()=>{
 const t=1700000000000,initial=start(ID,{stakeMinor:'100'},()=>0.8,t);
 const result=act(initial.state,{type:'collect'},()=>0.1,t+1000);
 assert.equal(result.state.status,'settled');
 assert.equal(result.state.reason,'COLLECTED');assert.equal(result.debitMinor,'0');
 assert.ok(BigInt(result.payoutMinor)>0n);
 assert.ok(BigInt(result.payoutMinor)<=BigInt(result.maxPayoutMinor));
});
test('immediate pop cannot be overridden into a win',()=>{
 const r=start(ID,{stakeMinor:'100'},()=>0,1700000000000);
 assert.equal(r.state.status,'settled');
 assert.equal(r.state.reason,'POPPED');assert.equal(r.payoutMinor,'0');
});
test('invalid stakes and client-specified payouts fail',()=>{
 assert.throws(()=>start(ID,{stakeMinor:'9'},()=>0.5,0),/STAKE_OUTSIDE_LIMITS/);
 assert.throws(()=>start(ID,{stakeMinor:'10001'},()=>0.5,0),/STAKE_OUTSIDE_LIMITS/);
 assert.throws(()=>start(ID,{stakeMinor:'10',payoutMinor:'999999'},()=>0.5,0),/INVALID_BALLOON_OPTIONS/);
});
test('server expiry does not debit again',()=>{
 const t=1700000000000,initial=start(ID,{stakeMinor:'10'},()=>0.5,t);
 const settled=expire(initial.state,()=>0.2,initial.state.expiresAt+10);
 assert.equal(settled.state.status,'settled');assert.equal(settled.debitMinor,'0');
 assert.throws(()=>act(settled.state,{type:'collect'},()=>0.1,t+4000),/ROUND_ALREADY_SETTLED/);
});
