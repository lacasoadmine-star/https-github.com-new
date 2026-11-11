import test from 'node:test';import assert from 'node:assert/strict';
import * as math from '../math/requested72.mjs';
const gameId='ind74_coinminer';
test('Coin Miner stores risk once, hides mines while active and reproduces observed first-reveal offer',()=>{
 let round=math.startRound({gameId,betMinor:'200',options:{mineCount:1},rng:()=>0});assert.equal(round.maxSteps,24);assert.equal(round.mineCount,1);
 assert.equal(math.publicRound(round).mineCells,undefined);
 assert.equal(math.publicRound(round).nextMultiplierBps,9800);
 round=math.advanceRound(round,{cell:24});assert.equal(math.publicRound(round).collectibleMinor,'196');
 round=math.collectRound(round);assert.equal(round.winMinor,'196');assert.deepEqual(math.publicRound(round).mineCells,[0]);
});
test('all 24 Coin Miner risks settle without exceeding their own exact reserve cap',()=>{
 for(let mineCount=1;mineCount<=24;mineCount++){
  let round=math.startRound({gameId,betMinor:'4000000',options:{mineCount},rng:()=>0});
  const cap=BigInt(math.maximumPayoutMinor({gameId,betMinor:'4000000',options:{mineCount}}));
  for(let cell=mineCount;cell<25;cell++)round=math.advanceRound(round,{cell});
  assert.equal(round.status,'collected');assert.equal(BigInt(round.winMinor),cap);assert(BigInt(round.winMinor)<=BigInt(math.getGameDefinition(gameId).limits.maxWinMinor));
 }
 for(const mineCount of [0,25,1.5,'1'])assert.throws(()=>math.startRound({gameId,betMinor:'100',options:{mineCount}}));
});
