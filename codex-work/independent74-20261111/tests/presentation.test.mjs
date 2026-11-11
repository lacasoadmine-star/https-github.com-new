import test from 'node:test';
import assert from 'node:assert/strict';
import {winTier} from '../client/presentation.mjs';
import {getGameDefinition,startRound} from '../math/requested72.mjs';
test('independent tier boundaries use the actual round stake and exact integer return',()=>{
 for(const [returnMinor,tier]of [['0','none'],['99','win'],['999','win'],['1000','nice'],['1999','nice'],['2000','big'],['4999','big'],['5000','fantastic']])assert.equal(winTier('100',returnMinor).id,tier);
 assert.equal(winTier('200','2000').id,'nice');assert.equal(winTier('200','1000').id,'win');
 assert.equal(winTier('10000000000000001','500000000000000050').id,'fantastic');
});
test('observed Multi Hot100 5×4 shape and published awards scale exactly at 1, 2, 40000 test points',()=>{
 const game=getGameDefinition('ind74_multihot100');assert.equal(game.rows,4);assert.equal(game.paylines.length,100);assert.equal(new Set(game.paylines.map(String)).size,100);
 assert(game.paylines.every(line=>line.length===5&&line.every(row=>row>=0&&row<4)));
 for(const bet of ['100','200','4000000']){
  const round=startRound({gameId:game.id,betMinor:bet,rng:bound=>bound===5?4:0});
  assert.equal(round.outcome.grid.length,4);assert.equal(round.outcome.grid.flat().length,20);assert.equal(round.outcome.reelMultiplier,5);
  assert.equal(round.winMinor,String(BigInt(bet)*2500n));
  assert.equal(round.outcome.lineWins.reduce((s,w)=>s+BigInt(w.winMinor),0n),BigInt(round.winMinor));
 }
 assert.equal(game.nominalReturn.numerator,'125700');assert.equal(game.nominalReturn.denominator,'163840');
 assert.equal(game.provenance.officialDemoFullyVerified,false);
});
