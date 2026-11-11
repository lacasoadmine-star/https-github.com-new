import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as math from '../math/official72.mjs';
import {OBSERVED_PLINKOX_ID as id,configureObservedPlinkoX} from '../math/observed-plinkox.mjs';
const rendered=JSON.parse(fs.readFileSync(new URL('../reports/current74-evidence-nonslots/ind74_official_plinkox-rendered-buckets.json',import.meta.url)));
const d=math.getGameDefinition(id),observation=JSON.parse(fs.readFileSync(new URL('./evidence/official-demo-observations-plinkox20.json',import.meta.url))).observations.find(o=>o.gameId===id);
function ballRng(bucket,ticket) {let call=0;return bound=>{const step=call++%17;if(step===16){assert.equal(bound,1000);return ticket;}assert.equal(bound,2);return step<bucket?1:0;};}
test('non-Classic Plinko X follows its observed16-row three-risk boards and preserves evidence boundaries',()=>{
 assert.equal(observation.verifiedCompletedRounds,20);assert.equal(d.mathVersion,'official72-plinkox-r4');
 assert.equal(d.rows,observation.geometry.rows);assert.equal(d.bucketMultipliersBps.length,observation.geometry.buckets);
 const minorBps=s=>{const[w,f='']=s.split('.');return Number(BigInt(w)*10000n+BigInt(f.padEnd(4,'0')));};
 assert.deepEqual(d.bucketMultipliersBps,observation.geometry.lowBucketMultipliers.map(minorBps));
 assert.deepEqual(d.observedPegboard.pegCountsByRow,observation.geometry.pegCountsByRow);
 assert.deepEqual(d.ballSelection.map(({type,multiplier})=>({type,multiplier})),[{type:'pink',multiplier:1},{type:'yellow',multiplier:5},{type:'blue',multiplier:10}]);
 assert.equal(d.layout.geometryVerified,true);assert.equal(d.nominalReturn.verified,false);
 assert.equal(d.riskLevels.find(r=>r.id==='low').implemented,true);
 assert(d.riskLevels.every(r=>r.implemented===true));
 for(const item of rendered.risks) {
  const values=item.rendered.children.filter(x=>x.visible&&x.alpha>0).map(x=>x.text.replace(/\s*x\s*$/i,'').trim());
  assert.equal(values.length,17);assert.deepEqual(d.bucketTablesBps[item.risk.toLowerCase()],values.map(minorBps));
 }
 assert.equal(rendered.newWagers,0);assert.equal(d.maximumMultiplierBps,100000000);
 assert.match(d.rules.join(' '),/not verified provider probabilities/);
 assert.match(d.rules.join(' '),/batch accounting contract is independently authored/);
 const classic=math.getGameDefinition('ind74_official_plinkoxclassic'),copy=structuredClone(classic);
 assert.throws(()=>configureObservedPlinkoX(copy));assert.deepEqual(copy,classic);
 assert.equal(classic.mathVersion,'official72-plinkoxclassic-r3');
 assert.deepEqual(classic.ballSelection.map(b=>b.type),['pink','orange','fire']);
});
test('every bucket and displayed color factor has exact integer payout for normal and large stakes',()=>{
 for(const risk of ['low','medium','high'])for(const betMinor of ['100','2000','4000100'])for(let bucket=0;bucket<17;bucket++)for(const[ticket,factor,type]of [[0,1,'pink'],[995,5,'yellow'],[999,10,'blue']]){
  const round=math.startRound({gameId:id,betMinor,options:{risk},rng:ballRng(bucket,ticket)});
  const expected=BigInt(betMinor)*BigInt(d.bucketTablesBps[risk][bucket])*BigInt(factor)/10000n;
  assert.equal(round.outcome.bucket,bucket);assert.equal(round.outcome.ballType,type);assert.equal(round.outcome.ballMultiplier,factor);
  assert.equal(round.winMinor,expected.toString());assert.equal(round.status,'collected');
  assert.equal(math.publicRound(round).winMinor,round.winMinor);
  assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});
 }
});
test('all supported batch amounts debit a single accepted TOTAL stake and sum completed per-ball awards',()=>{
 for(const risk of ['low','medium','high'])for(const ballAmount of [1,5,10,25]) {
  const betMinor=String(ballAmount*100),options={risk,ballAmount};
  const round=math.startRound({gameId:id,betMinor,options,rng:ballRng(8,995)});
  assert.equal(round.betMinor,betMinor);assert.equal(round.totalBetMinor,betMinor);assert.equal(round.perBallBetMinor,'100');
  assert.equal(round.outcome.balls.length,ballAmount);assert.equal(round.outcome.balls.reduce((s,b)=>s+BigInt(b.winMinor),0n).toString(),round.winMinor);
  assert(round.outcome.balls.every(b=>b.winMinor===String(BigInt(d.bucketTablesBps[risk][8])*5n/100n)));
  const view=math.publicRound(round);assert.equal(view.ballAmount,ballAmount);assert.equal(view.totalBetMinor,betMinor);assert.equal(view.outcome.balls.length,ballAmount);
 }
});
test('each risk maximum is exact200/1000/10000 times TOTAL, including batches and storage ceilings',()=>{
 for(const[risk,max]of [['low',200n],['medium',1000n],['high',10000n]]) {
  for(const ballAmount of [1,5,10,25])for(const total of [BigInt(ballAmount)*100n,5000000n]) {
   const betMinor=total.toString(),options={risk,ballAmount};
   const round=math.startRound({gameId:id,betMinor,options,rng:ballRng(0,999)});
   assert.equal(round.winMinor,(total*max).toString());assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor,options}));
  }
  const betMinor=d.limits.maxBetMinor,options={risk},round=math.startRound({gameId:id,betMinor,options,rng:ballRng(16,999)});
  assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor,options}));assert(BigInt(round.winMinor)<=999999999999999n);
 }
});
test('unverified risks, client outcomes, invalid amount and invalid equal-stake split reject before any RNG',()=>{
 const attempt=(betMinor,options,code)=>{
  let draws=0;assert.throws(()=>math.startRound({gameId:id,betMinor,options,rng:()=>{draws++;return 0;}}),{code});assert.equal(draws,0);
  assert.throws(()=>math.maximumPayoutMinor({gameId:id,betMinor,options}),{code});
 };
 attempt('100',{risk:'extreme'},'UNVERIFIED_RISK');attempt('100',{risk:'LOW'},'UNVERIFIED_RISK');attempt('100',{risk:['low']},'UNVERIFIED_RISK');
 attempt('100',{ballAmount:2},'INVALID_BALL_AMOUNT');attempt('100',{ballType:'blue'},'INVALID_OPTIONS');attempt('100',{ballMultiplier:10},'INVALID_OPTIONS');
 attempt('100',{ballAmount:5},'INVALID_BALL_STAKE');attempt('2000',{ballAmount:25},'INVALID_BALL_STAKE');attempt('600',{ballAmount:5},'INVALID_BALL_STAKE');
});
test('stored ball paths, color factors, batch count and total payouts must agree before public recovery',()=>{
 const round=math.startRound({gameId:id,betMinor:'500',options:{ballAmount:5},rng:ballRng(8,995)});
 for(const mutate of [r=>r.outcome.balls[0].path.fill(0),r=>r.outcome.balls[0].ballMultiplier=10,r=>r.outcome.balls.push(structuredClone(r.outcome.balls[0])),r=>r.winMinor=String(BigInt(r.winMinor)+1n),r=>delete r.risk,r=>r.totalBetMinor='100']) {
  const bad=structuredClone(round);mutate(bad);assert.throws(()=>math.publicRound(bad),{code:'INVALID_ROUND'});
 }
});
