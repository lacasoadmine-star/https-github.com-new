import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import * as math from '../math/official72.mjs';
import {GATES_MERLYN_ID,evaluateGatesMerlynGrid,gatesMerlynStakeTerms} from '../math/gates-of-merlyn.mjs';
import {regularBoard,boardDraws,finiteDraws,gatesMagicFixture,gatesBonusFeatureFixture} from './support/gates-merlyn-fixtures.mjs';

const d=math.getGameDefinition(GATES_MERLYN_ID);
const start=args=>math.startRound({gameId:d.id,...args});
const rowGrid=cells=>Array.from({length:5},(_,row)=>cells.slice(row*6,row*6+6));
const publicOutcome=round=>math.publicRound(round).outcome;
function seeded(seed){let s=seed>>>0;return bound=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s%bound;};}
const reordered=value=>Array.isArray(value)?value.map(reordered):value&&typeof value==='object'
  ?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reordered(item)])):value;

test('Gates uses observed6×5 geometry and rendered public awards while disclosing independent probabilities and processing rules',async()=>{
  assert.equal(d.mathVersion,'official72-gatesofmerlyn-r4');assert.equal(d.slotMechanic,'tumble');
  assert.equal(d.rows,5);assert.equal(d.cols,6);assert.deepEqual(d.paylines,[]);
  assert.equal(d.layout.kind,'cascade-grid');assert.equal(d.layout.geometryVerified,true);
  assert.equal(d.layout.paylines,0);assert.equal(d.proratedStake,false);
  assert.equal(d.tumbleFeature.paytableVerified,true);assert.equal(d.tumbleFeature.minimumMatchVerified,true);
  assert.equal(d.tumbleFeature.providerProbabilitiesVerified,false);assert.equal(d.nominalReturn.verified,false);
  assert.equal(d.tumbleFeature.processingSafety.action,'award-full-maximum-and-finish');
  const help=JSON.parse(await readFile(new URL('../references/official-slot-help-en-20261111.json',import.meta.url),'utf8')).captions;
  assert.match(help['help.slots.gatesofmerlyn.symbols.description'],/no paylines/i);
  assert.match(help['help.slots.gatesofmerlyn.buybonus.description3'],/15 free spins/i);
  assert.match(help['help.slots.gatesofmerlyn.freespins.description1'],/5 additional free spins/i);
  assert.match(help['help.slots.gatesofmerlyn.otherrules.description3'],/5000X/);
});

test('count prizes use all matching cells anywhere, the highest attained tier and integer minor units',()=>{
  for(const count of [7,8,9,10,11,12,30]){
    const cells=Array.from({length:30},(_,i)=>d.symbols[i<count?0:1+(i-count)%8].id);
    // Spread positions across columns so the evaluator cannot be a line scan.
    const shuffled=cells.map((_,i)=>cells[i*7%30]);
    const scored=evaluateGatesMerlynGrid(d,'300',rowGrid(shuffled));
    const tier=d.tumbleFeature.countPaytable[0].tiers.filter(item=>count>=item.minimumCount).at(-1);
    assert.equal(scored.winningGroups.length,tier?1:0);
    assert.equal(scored.rawAwardMinor,tier?(300n*BigInt(tier.multiplierBps)/10000n).toString():'0');
    if(tier){assert.equal(scored.winningGroups[0].positions.length,count);assert.equal(scored.winningGroups[0].count,count);}
  }
  assert.throws(()=>evaluateGatesMerlynGrid(d,'100',[[d.symbols[0].id]]),{code:'INVALID_GRID'});
  assert.throws(()=>evaluateGatesMerlynGrid(d,'100',rowGrid(Array(30).fill('unknown'))),{code:'INVALID_GRID'});
});

test('fresh rendered Gates regular and Scatter prizes map to their exact observed symbol categories and stake ratios',async()=>{
  const expected=[[2000,6000,20000],[4000,8000,40000],[8000,15000,80000],[5000,10000,50000],[10000,20000,100000],
    [30000,50000,200000],[20000,40000,150000],[15000,30000,120000],[50000,100000,500000]];
  for(const[index,entry]of d.tumbleFeature.countPaytable.entries()){
    assert.equal(entry.symbolId,d.symbols[index].id);assert.deepEqual(entry.tiers.map(t=>t.minimumCount),[8,10,12]);
    assert.deepEqual(entry.tiers.map(t=>t.multiplierBps),expected[index]);
  }
  assert.equal(d.symbols[0].label,'White crystal');assert.equal(d.symbols[3].label,'Yellow crystal');
  assert.deepEqual(d.tumbleFeature.scatterPaytable,[{minimumCount:4,multiplierBps:20000},{minimumCount:5,multiplierBps:50000},{minimumCount:6,multiplierBps:200000}]);
  for(const path of d.tumbleFeature.paytableSource.regularAndScatter)await access(new URL('../'+path,import.meta.url));
});

test('tumbling removes every paid position, preserves column survivor order, refills only holes and multiplies the whole sequence',()=>{
  const cells=Array.from({length:30},(_,i)=>i<8?0:i===8?{multiplierIndex:0}:i===9?{multiplierIndex:1}:1+(i-10)%8);
  const rng=finiteDraws([...boardDraws(cells),...Array.from({length:8},(_,i)=>i)]);
  const round=start({betMinor:'100',rng}),o=publicOutcome(round),spin=o.spins[0];
  assert.equal(rng.remaining(),0);assert.equal(spin.frames.length,2);assert.equal(spin.frames[0].action,'tumble');
  assert.equal(spin.rawAwardMinor,'20');assert.equal(spin.landedMultiplierTotal,5);assert.equal(spin.appliedMultiplier,5);
  assert.equal(round.winMinor,'100');assert.equal(spin.frames[0].removedPositions.length,8);assert.equal(spin.frames[0].refills.length,8);
  for(let col=0;col<6;col++){
    const before=spin.frames[0].grid.map((row,rowIndex)=>({id:row[col],row:rowIndex}));
    const survivors=before.filter(item=>!spin.frames[0].removedPositions.some(position=>position.row===item.row&&position.col===col));
    assert.deepEqual(spin.frames[1].grid.slice(5-survivors.length).map(row=>row[col]),survivors.map(item=>item.id));
  }
  assert.deepEqual(o.lineWins,[]);assert.equal(o.settlement,'single-final-credit');
});

test('MAGIC acts only after a nonwinning board, consumes one orb and a regular cell, then resumes ordinary tumbles',()=>{
  const fixture=gatesMagicFixture(),rng=finiteDraws(fixture.draws),round=start({...fixture,rng}),o=publicOutcome(round);
  assert.equal(rng.remaining(),0);assert.equal(round.winMinor,'20');
  const frames=o.spins[0].frames;
  assert.deepEqual(frames.map(frame=>frame.action),['magic','tumble','end']);
  assert.deepEqual(frames[0].winningGroups,[]);assert.equal(frames[0].removedPositions.length,2);
  assert.deepEqual(frames[0].magic,{orb:{row:0,col:0},target:{row:1,col:2},scope:'one-regular-cell'});
  assert.equal(frames[1].winningGroups[0].count,8);
  const initial=Array.from({length:30},(_,i)=>i<8?0:i===8?'X':1+(i-9)%8);
  let count=0;const fallback=bound=>count++%9;
  const script=boardDraws(initial);let index=0;
  const next=start({betMinor:'100',rng:bound=>index<script.length?script[index++]:fallback(bound)});
  assert.equal(publicOutcome(next).spins[0].frames[0].action,'tumble','Winning groups take precedence over MAGIC.');
});

test('one purchased debit resolves15free spins, a5spin retrigger, accumulated multipliers and MAGIC with one final award',()=>{
  const fixture=gatesBonusFeatureFixture(),rng=finiteDraws(fixture.draws),round=start({...fixture,rng}),o=publicOutcome(round);
  assert.equal(rng.remaining(),0);assert.equal(round.betMinor,'10000');assert.equal(round.totalBetMinor,'10000');assert.equal(round.baseBetMinor,'100');
  assert.equal(o.spins.length,21);assert.equal(o.freeSpinsAwarded,20);assert.equal(o.freeSpinsPlayed,20);assert.equal(o.freeSpinsRemaining,0);
  assert.equal(o.spins[0].scatterCount,4);assert.equal(o.spins[0].freeSpinsAwarded,15);
  assert.equal(o.spins[0].awardMinor,'200');assert.equal(o.spins[1].scatterAwardMinor,'0');
  assert.equal(o.spins[1].freeSpinsAwarded,5);assert.equal(o.spins[1].appliedMultiplier,2);assert.equal(o.spins[1].awardMinor,'40');
  assert.equal(o.spins[2].appliedMultiplier,5);assert.equal(o.spins[2].awardMinor,'100');
  assert.deepEqual(o.spins[3].frames.map(frame=>frame.action),['magic','tumble','end']);assert.equal(o.spins[3].awardMinor,'100');
  assert.equal(o.spins[4].landedMultiplierTotal,500);assert.equal(o.spins[4].awardMinor,'0');
  assert.equal(o.spins[4].accumulatedMultiplier,5,'A losing free spin must not collect its multiplier.');
  assert.equal(round.winMinor,'440');assert.equal(o.totalAwardMinor,'440');
  assert.equal(o.spins.reduce((sum,spin)=>sum+BigInt(spin.awardMinor),0n),440n);
  assert.equal(round.outcome.spins,undefined,'Persisted state stores compact replay evidence.');
  assert.equal(round.outcome.spinCount,21);assert.deepEqual(math.publicRound(round).allowedActions,[]);
  assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});assert.throws(()=>math.advanceRound(round),{code:'ROUND_FINISHED'});
  assert.equal(math.reconcileRound(round,Date.now()),round);
});

test('purchase500 enforces minimum10x multiplier values for the entire purchased round',()=>{
  const round=start({betMinor:'50000',options:{mode:'buy500'},rng:bound=>bound===298?296:0}),o=publicOutcome(round);
  assert.equal(round.betMinor,'50000');assert.equal(round.baseBetMinor,'100');assert.equal(o.spins.length,16);
  const values=o.spins.flatMap(spin=>spin.frames.flatMap(frame=>frame.multiplierSymbols.map(item=>item.value)));
  assert.ok(values.length>0);assert.ok(values.every(value=>value>=10));assert.ok(values.every(value=>value===10));
  assert.equal(o.spins[0].scatterCount,4);assert.equal(o.spins[0].freeSpinsAwarded,15);
  assert.equal(math.maximumPayoutMinor({gameId:d.id,betMinor:'50000',options:{mode:'buy500'}}),'500000');
});

test('mode costs use the accepted total exactly and reject partial base units, unknown modes and client outcomes before RNG',()=>{
  for(const[mode,total,base]of [['base','100','100'],['ante','300','200'],['buy100','10000','100'],['buy500','50000','100']]){
    assert.equal(gatesMerlynStakeTerms(d,total,{mode}).baseBetMinor,base);
    assert.equal(math.maximumPayoutMinor({gameId:d.id,betMinor:total,options:{mode}}),(BigInt(base)*5000n).toString());
  }
  for(const[mode,betMinor]of [['ante','100'],['ante','200'],['buy100','100'],['buy100','10100'],['buy500','10000'],['buy500','50100']]){
    let calls=0;assert.throws(()=>start({betMinor,options:{mode},rng:()=>{calls++;return 0;}}),{code:'INVALID_BET'});assert.equal(calls,0);
  }
  for(const options of [{mode:'bogus'},{holdWin:true},{mode:'base',payoutMinor:'500000'},{mode:'base',seed:'client'},null,[]])
    assert.throws(()=>start({betMinor:'100',options,rng:()=>0}),{code:'INVALID_OPTIONS'});
  assert.throws(()=>start({betMinor:'100',rng:()=>298}),{code:'INVALID_RNG'});
});

test('the explicit maximum and processing guarantee terminate pathological cascades/retriggers without discarding awards or exceeding retained state size',()=>{
  for(const[rng,processing,boards]of [[()=>0,true,256],[()=>288,false,250]]){
    const round=start({betMinor:'100',rng}),o=publicOutcome(round);
    assert.equal(round.winMinor,'500000');assert.equal(o.capReached,true);assert.equal(o.processingLimitReached,processing);
    assert.equal(o.boardsEvaluated,boards);assert.equal(BigInt(o.processingMaximumAwardMinor)>0n,processing);
    assert.equal(o.spins.reduce((sum,spin)=>sum+BigInt(spin.awardMinor),0n),500000n);
    assert.ok(JSON.stringify({mathState:round,modelVersion:d.mathVersion,reservedPayoutMinor:'500000'}).length<120*1024);
    assert.ok(round.private.draws.length<=d.tumbleFeature.processingSafety.maximumRandomDraws);
    const publicState=math.publicRound(round);assert.equal(publicState.private,undefined);
    assert.equal(JSON.stringify(publicState).includes('"draws"'),false);assert.equal(JSON.stringify(publicState).includes('"seed"'),false);
  }
  // A board full of regular winners plus500x already exceeds the public cap;
  // no additional tumble or bonus draw is consumed after the cap is certain.
  const board=Array(30).fill(8);board[0]={multiplierIndex:16};board[1]={multiplierIndex:16};
  const rng=finiteDraws(boardDraws(board)),round=start({betMinor:'100',rng}),o=publicOutcome(round);
  assert.equal(rng.remaining(),0);assert.equal(o.spins[0].frames[0].action,'maximum-award');
  assert.equal(round.winMinor,'500000');assert.equal(o.processingLimitReached,false);assert.equal(o.processingMaximumAwardMinor,'0');
});

test('stored draws deterministically reproduce the settled award through JSONB key reordering and reject monetary/feature tampering',()=>{
  const fixture=gatesBonusFeatureFixture();
  const first=start({...fixture,rng:finiteDraws(fixture.draws)}),second=start({...fixture,rng:finiteDraws(fixture.draws)});
  assert.deepEqual(first,second);assert.deepEqual(math.publicRound(reordered(first)),math.publicRound(first));
  for(const mutate of [
    r=>r.winMinor='741',r=>r.baseBetMinor='200',r=>r.mode='buy500',r=>r.costBps=5000000,
    r=>r.outcome.freeSpinsAwarded++,r=>r.outcome.grid[0][0]='unknown',r=>r.outcome.maximumAwardMinor='999999999',
    r=>r.private.draws.push(0),r=>r.private.draws.pop(),r=>r.private.draws[0]=10000,
    r=>r.outcome.processingMaximumAwardMinor='1',r=>r.step=2,
  ]){const changed=structuredClone(first);mutate(changed);assert.throws(()=>math.publicRound(changed),{code:'INVALID_ROUND'});}
  const view=math.publicRound(first);view.outcome.spins[0].frames[0].grid[0][0]='client-edit';
  assert.notEqual(math.publicRound(first).outcome.spins[0].frames[0].grid[0][0],'client-edit');
});

test('all modes support configured amounts above40000ETB and reserve the actual base-derived maximum without floating point',()=>{
  for(const mode of d.tumbleFeature.modes){
    const step=BigInt(d.tumbleFeature.totalStakeStepMinor[mode]);
    for(const betMinor of [(step*50000n).toString(),(BigInt(d.limits.maxBetMinor)/step*step).toString()]){
      const first=start({betMinor,options:{mode},rng:seeded(73)}),second=start({betMinor,options:{mode},rng:seeded(73)});
      assert.deepEqual(first,second);assert.equal(first.betMinor,betMinor);
      assert.ok(BigInt(first.winMinor)<=BigInt(math.maximumPayoutMinor({gameId:d.id,betMinor,options:{mode}})));
      assert.ok(BigInt(first.winMinor)<=999999999999999n);
    }
  }
  const row=math.modelAuditMatrix().find(item=>item.id===d.id);assert.equal(row.optionPayoutBounds.length,4);
  assert.deepEqual(row.optionPayoutBounds.map(item=>item.minimumStakeMinor),['100','300','10000','50000']);
});
