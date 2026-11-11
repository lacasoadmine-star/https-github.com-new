import test from 'node:test';import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';import {ballPath} from '../client/pegboard.mjs';
const gameId='ind74_official_plinkoxclassic';
test('fresh pink-ball board replaces the old 8-row model and reproduces the observed 50-to-100 payout',()=>{
 const d=math.getGameDefinition(gameId);assert.equal(d.rows,16);assert.equal(d.bucketMultipliersBps.length,17);assert.equal(d.completeProviderBallTypesImplemented,false);
 for(const betMinor of ['100','200','5000','4000000']){let calls=0;const r=math.startRound({gameId,betMinor,rng:()=>calls++<5?1:0});assert.equal(r.outcome.bucket,5);assert.equal(r.winMinor,String(BigInt(betMinor)*2n));assert.equal(r.outcome.path.length,16);}
});
test('each of the 17 paths lands in its payout bucket and stays inside the exact wager cap',()=>{
 for(let rights=0;rights<=16;rights++){let calls=0;const r=math.startRound({gameId,betMinor:'4000000',rng:()=>calls++<rights?1:0});const path=ballPath(r.outcome.path);assert.equal(path.at(-1).x,58+24*rights);assert.equal(path.at(-1).y,308);assert.equal(r.outcome.bucket,rights);assert(BigInt(r.winMinor)<=BigInt(math.maximumPayoutMinor({gameId,betMinor:'4000000'})));}
 const d=math.getGameDefinition(gameId);let weighted=0n;for(const row of d.paytable)weighted+=BigInt(row.probabilityNumerator)*BigInt(row.multiplierBps);assert.equal(weighted*163840n,158963n*65536n*10000n);
});
