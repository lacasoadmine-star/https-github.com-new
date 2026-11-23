import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_WILDS_GAME_ID,validateBurnWildsReceipt} from './expansion.mjs';
import {auditBurnWildsPayout} from './outcome-audit.mjs';
import {BURN_CANDIDATE_OUTER_WEIGHTS,BURN_CANDIDATE_INNER_WEIGHTS,
  BURN_CANDIDATE_WHEEL,BURN_CANDIDATE_MATH_VERSION,
  createBurnWildsCandidateSampler} from './candidate-math.mjs';

const input={gameId:BURN_WILDS_GAME_ID,roundId:'candidate-sample-01',betMinor:10};
const samplerFor=(draws)=>{
 const values=[...draws];let count=0;
 const getEntropy=bytes=>{
   const value=values[count++]??0;
   bytes[0]=value>>8;bytes[1]=value&255;
   return bytes;
 };
 return {sampler:createBurnWildsCandidateSampler({getEntropy}),calls:()=>count};
};
const receiptFor=(input,outcome)=>({
 ...outcome,gameId:BURN_WILDS_GAME_ID,roundId:input.roundId,
 clientToken:'synthetic-only',betMinor:input.betMinor,balanceMinor:10000
});
test('candidate has a distinct non-approved ZPLAY distribution, not a claimed provider RNG',()=>{
 const model=createBurnWildsCandidateSampler({getEntropy:x=>x.fill(0)});
 assert.equal(model.approved,false);
 assert.equal(model.cashReleaseReady,false);
 assert.equal(model.licensedArtwork,false);
 assert.equal(model.verifiedRtp,null);
 assert.equal(model.mathVersion,BURN_CANDIDATE_MATH_VERSION);
 assert.equal(Object.values(model.verification).every(value=>value===false),true);
 assert.equal(BURN_CANDIDATE_OUTER_WEIGHTS.reduce((n,[,w])=>n+w,0),1000);
 assert.equal(BURN_CANDIDATE_INNER_WEIGHTS.reduce((n,[,w])=>n+w,0),1000);
 assert.deepEqual(BURN_CANDIDATE_WHEEL,[1,3,5,2,4]);
 assert.equal(BURN_CANDIDATE_OUTER_WEIGHTS.some(([s])=>s==='wild'),false);
 assert.equal(BURN_CANDIDATE_INNER_WEIGHTS.some(([s])=>s==='wild'),true);
});
test('CSPRNG candidate builds fresh 5x3 code-driven reels and audited wins without canned rounds',()=>{
 const {sampler,calls}=samplerFor([]);
 const output=sampler.sampleOutcome(input);
 assert.equal(calls(),16);
 assert.equal(output.originalGrid.length,5);
 assert.ok(output.originalGrid.every(col=>col.length===3));
 assert.ok(output.originalGrid.every(col=>col.every(symbol=>symbol==='orange')));
 assert.equal(output.multiplier,1);
 assert.deepEqual(output.expandedColumns,[]);
 assert.equal(output.winMinor,250);
 assert.equal(output.winLines.length,5);
 assert.equal(auditBurnWildsPayout(receiptFor(input,output)).payoutConsistent,true);
 assert.deepEqual(validateBurnWildsReceipt(receiptFor(input,output)).finalGrid,output.finalGrid);
});
test('a WILD crossing a winning payline expands only its own middle reel',()=>{
 const raw=Array(16).fill(0);
 raw[4]=990; // original column 2, middle row, 57/1000 WILD tail
 const {sampler}=samplerFor(raw);
 const output=sampler.sampleOutcome(input);
 assert.equal(output.originalGrid[1][1],'wild');
 assert.deepEqual(output.expandedColumns,[1]);
 assert.deepEqual(output.finalGrid[1],['wild','wild','wild']);
 assert.equal(output.originalGrid[0].includes('wild'),false);
 assert.equal(output.originalGrid[4].includes('wild'),false);
 assert.equal(auditBurnWildsPayout(receiptFor(input,output)).payoutConsistent,true);
});
test('entropy rejection rejects overflow draws without bias or pre-recorded outcome frames',()=>{
 const {sampler,calls}=samplerFor([65535,0]);
 const output=sampler.sampleOutcome(input);
 assert.equal(calls(),17);
 assert.equal(output.originalGrid[0][0],'orange');
 assert.equal(auditBurnWildsPayout(receiptFor(input,output)).payoutConsistent,true);
});
test('candidate maximum is a conservative five-line 5x seven exposure, not an invented cap',()=>{
 const sampler=createBurnWildsCandidateSampler({getEntropy:x=>x.fill(0)});
 assert.equal(sampler.maximumPayoutMinor(10n),25000n);
 assert.equal(sampler.maximumPayoutMinor(20n),50000n);
 assert.throws(()=>sampler.maximumPayoutMinor(1n),/CANDIDATE_STAKE/);
 assert.throws(()=>sampler.maximumPayoutMinor(11n),/CANDIDATE_STAKE/);
});
test('invalid stake, foreign game and malformed entropy fail closed',()=>{
 const sampler=createBurnWildsCandidateSampler({getEntropy:x=>x.fill(0)});
 assert.throws(()=>sampler.sampleOutcome({...input,gameId:'another-game'}),/CANDIDATE_INPUT/);
 assert.throws(()=>sampler.sampleOutcome({...input,betMinor:1}),/CANDIDATE_INPUT/);
 assert.throws(()=>sampler.sampleOutcome({...input,roundId:''}),/CANDIDATE_INPUT/);
 const bad=createBurnWildsCandidateSampler({getEntropy:()=>new Uint8Array(3)});
 assert.throws(()=>bad.sampleOutcome(input),/CANDIDATE_ENTROPY_LENGTH/);
 const stuck=createBurnWildsCandidateSampler({getEntropy:x=>{x.fill(255);return x;}});
 assert.throws(()=>stuck.sampleOutcome(input),/CANDIDATE_ENTROPY_EXHAUSTED/);
});

