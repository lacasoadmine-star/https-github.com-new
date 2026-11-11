import test from 'node:test';import assert from 'node:assert/strict';
import {getGameDefinition,startRound,publicRound} from '../math/requested72.mjs';
import {startTargetCrash} from '../math/engines/target-crash.mjs';
test('Speed Crash uses a target chosen before play rather than a timed manual collect model',()=>{
 const g=getGameDefinition('ind74_speedcrash');assert.equal(g.family,'target-crash');
 for(const targetBps of [10500,20000,100000000])for(const betMinor of ['100','200','4000000']){
  const win=startRound({gameId:g.id,betMinor,options:{targetBps},rng:()=>0});
  assert.equal(win.status,'collected');assert.equal(win.winMinor,String(BigInt(betMinor)*BigInt(targetBps)/10000n));
  const loss=startRound({gameId:g.id,betMinor,options:{targetBps},rng:b=>b-1});assert.equal(loss.status,'lost');assert.equal(loss.winMinor,'0');
  assert.deepEqual(publicRound(win).allowedActions,[]);
 }
 for(const targetBps of [10000,10499,100000001,10500.5,'20000'])assert.throws(()=>startRound({gameId:g.id,betMinor:'100',options:{targetBps}}));
});
test('independent Speed Crash minimum target has exactly 9500 winning tickets out of 10500',()=>{
 const g=getGameDefinition('ind74_speedcrash');let wins=0;
 for(let ticket=0;ticket<10500;ticket++)if(startTargetCrash(g,{betMinor:'100',options:{targetBps:10500},rng:()=>ticket}).status==='collected')wins++;
 assert.equal(wins,9500);assert.equal(wins*10500,9500*10500);
 assert.deepEqual(g.nominalReturn,{numerator:'95',denominator:'100',rounding:'Before payout minor-unit flooring.'});
});
