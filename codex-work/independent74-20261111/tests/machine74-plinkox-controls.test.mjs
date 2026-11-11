import test from'node:test';import assert from'node:assert/strict';import{plinkoxBatch,plinkoxRiskAvailable,plinkoxTable}from'../client/plinkox-controls.mjs';import{getGameDefinition}from'../math/official72.mjs';import{publicLibrary74Definition}from'../server/existing-library74-adapter.mjs';import{machineMarkup,plinkoGeometry}from'../client/machine74-renderer.mjs';import*as math from'../math/official72.mjs';
const id='ind74_official_plinkox',full=getGameDefinition(id),definition=publicLibrary74Definition(full);
const count=(text,pattern)=>[...text.matchAll(pattern)].length;
function round(amount=5,risk='low'){let draw=0;const stored=math.startRound({gameId:id,betMinor:String(amount*100),options:{risk,ballAmount:amount},rng:bound=>bound===1000?[0,995,999][draw++%3]:0});return math.publicRound(stored);}
test('per-ball input becomes one exact accepted total without floating-point arithmetic or a new arbitrary cap',()=>{
 for(const amount of[1,5,10,25]){const batch=plinkoxBatch(definition,'1.00',{risk:'low',ballAmount:amount});assert.equal(batch.totalStake,amount+'.00');assert.equal(batch.perBallBetMinor,'100');}
 assert.equal(plinkoxBatch(definition,'40001.00',{risk:'low',ballAmount:25}).totalStake,'1000025.00');
 for(const[stake,options]of[['1.01',{ballAmount:1}],['0.00',{ballAmount:1}],['1.00',{ballAmount:3}],['1.00',{risk:'unknown',ballAmount:1}],[1,{ballAmount:1}]])assert.throws(()=>plinkoxBatch(definition,stake,options));
});
test('Plinko X matches observed LOW16rows/17buckets and pink/yellow/blue legend without changing Classic color identities',()=>{
 const ready=machineMarkup(definition);assert.equal(count(ready,/data-bucket="/g),17);assert.equal(count(ready.match(/<g class="m74-pegs">([\s\S]*?)<\/g>/)[1],/<circle cx=/g),168);assert.match(ready,/m74-ball-blue/);assert.match(ready,/m74-ball-yellow/);assert.match(ready,/LOW · 1 BALLS/);
 const observed=[20,10,5,2,1.5,1.3,1.1,.8,.5,.8,1.1,1.3,1.5,2,5,10,20];assert.deepEqual(definition.bucketMultipliersBps,observed.map(value=>Math.round(value*10000)));
 const classic=publicLibrary74Definition(getGameDefinition('ind74_official_plinkoxclassic'));assert.deepEqual(classic.ballTypes.map(item=>item.type),['pink','orange','fire']);assert.doesNotMatch(machineMarkup(classic),/m74-plinkox-board|m74-ball-yellow|m74-ball-blue/);
});
test('every settled batch ball renders the supplied path, color and landing; aggregate result is not resampled or changed',()=>{
 for(const amount of[1,5,10,25]){const receipt=round(amount),before=JSON.stringify(receipt),markup=machineMarkup(definition,receipt);assert.equal(count(markup,/data-ball-index="/g),amount);assert.equal(receipt.outcome.balls.length,amount);assert.equal(JSON.stringify(receipt),before);for(const ball of receipt.outcome.balls){const end=plinkoGeometry(definition,ball.path).points.at(-1);assert(markup.includes('data-ball-index="'+ball.index+'" cx="'+end.x+'" cy="'+end.y+'"'));}}
 const receipt=round();for(const alter of[r=>r.outcome.balls[2].path[0]=2,r=>r.outcome.balls[1].bucket=3,r=>r.outcome.balls[0].ballType='fire',r=>r.outcome.ballAmount=10]){const copy=structuredClone(receipt);alter(copy);assert.throws(()=>machineMarkup(definition,copy),/Plinko X/);}
});

test('all risk tables are explicit and missing profiles cannot silently fall back to LOW',()=>{for(const risk of ['low','medium','high']){assert(plinkoxRiskAvailable(definition,risk));assert.equal(plinkoxTable(definition,risk).length,17);const ready=machineMarkup(definition,null,{selectedOptions:{risk}});assert(ready.includes(risk.toUpperCase()+' · 1 BALLS'));machineMarkup(definition,round(5,risk));}const missing=structuredClone(definition);delete missing.bucketTablesBps.high;assert.equal(plinkoxRiskAvailable(missing,'medium'),false);assert.equal(plinkoxRiskAvailable(missing,'high'),false);assert.throws(()=>plinkoxBatch(missing,'1.00',{risk:'high',ballAmount:1}));assert.throws(()=>plinkoxTable(missing,'medium'));assert.equal(plinkoxRiskAvailable(definition,'unknown'),false);});
