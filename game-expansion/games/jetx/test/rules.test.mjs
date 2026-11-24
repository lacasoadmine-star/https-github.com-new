import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LIMITS,money,quote,payout,verifyCommitment,coefficientAt,newRound,phase,publicRound,dueResult,drawCrash,reachesAt} from '../rules.mjs';
const reference=JSON.parse(await readFile(new URL('../evidence/official-reference.json',import.meta.url)));

test('official observed limits and all public history commitments are preserved',()=>{
 assert.equal(Number(LIMITS.minStake)/100,reference.configuration.MinBetAmount);
 assert.equal(Number(LIMITS.maxStake)/100,reference.configuration.MaxBetAmount);
 assert.equal(Number(LIMITS.maxWin)/100,reference.configuration.MaxWinAmount);
 assert.equal(LIMITS.maxMultiplier/100,reference.maxCashoutCoefficient);
 for(const sample of reference.roundCommitmentSamples){assert.ok(verifyCommitment(sample.revealedInfo,sample.commitment));assert.ok(!verifyCommitment(sample.revealedInfo+'x',sample.commitment));}
});
test('cashout truncates santim exactly as the played public demo',()=>{
 assert.equal(payout(money('5.50'),101),555n);
 assert.equal(payout(money('0.50'),101),50n);
 assert.equal(payout(money('5.00'),120),600n);
 assert.equal(payout(money('100.00'),2500000),1000000n);
 assert.equal(money('0.10'),10n);
});
test('stakes, panel limits, and automatic cashout bounds reject unsafe input',()=>{
 assert.deepEqual(quote('0.10','1.01'),{amount:10n,target:101,liability:10n});
 assert.equal(quote('100.00').liability,LIMITS.maxWin);
 for(const stake of ['0.00','0.09','100.01','-1.00','01.00','1e2','Infinity',1])assert.throws(()=>quote(stake));
 for(const target of ['1.00','1000.01','1e2','NaN',2])assert.throws(()=>quote('1.00',target));
});
test('flight progression matches observed response steps and is server-time based',()=>{
 for(const [step,value] of [[1,1.01],[11,1.17],[21,1.34],[31,1.55],[41,1.79],[51,2.07],[61,2.39],[71,2.75],[81,3.18],[91,3.66],[101,4.23],[111,4.88],[121,5.63]])assert.equal(coefficientAt(1000,1000+step*150),Math.round(value*100));
 assert.equal(coefficientAt(1000,999),100);
});
test('active snapshots never reveal the crash point or the commitment preimage',()=>{
 const round=newRound('1',0,{draw:()=>400,idSource:()=> 'test-id'});
 assert.equal(phase(round,0),'betting');assert.equal(phase(round,round.startsAt),'flight');
 const publicState=publicRound(round,round.startsAt+150);
 for(const key of ['crash','info','revealedInfo','crashesAt','crashedAt','endsAt'])assert.ok(!(key in publicState));
 const end=publicRound(round,round.crashesAt);assert.equal(end.phase,'finished');assert.equal(end.crash,400);assert.ok(verifyCommitment(end.revealedInfo,end.commitment));
});
test('auto cashout and forced caps settle during disconnection, before a later crash',()=>{
 const round=newRound('1',0,{draw:()=>2500000});
 const bet={status:'active',stake:'550',auto:101};
 assert.equal(dueResult(bet,round,round.startsAt),null);
 assert.deepEqual(dueResult(bet,round,reachesAt(round.startsAt,101)),{payout:555n,coefficient:101,reason:'AUTO_CASHOUT'});
 assert.deepEqual(dueResult({status:'active',stake:'10000',auto:null},round,round.crashesAt),{payout:1000000n,coefficient:10000,reason:'MAX_WIN'});
 const loss=newRound('2',0,{draw:()=>100});assert.equal(dueResult(bet,loss,loss.crashesAt).payout,0n);
});
test('independent RNG boundaries are explicit and never called provider math',()=>{
 assert.equal(drawCrash(()=>Buffer.alloc(7)),LIMITS.maxMultiplier);
 assert.equal(drawCrash(()=>Buffer.alloc(7,255)),100);
 assert.equal(reference.outcomeDistribution.verified,false);
});
