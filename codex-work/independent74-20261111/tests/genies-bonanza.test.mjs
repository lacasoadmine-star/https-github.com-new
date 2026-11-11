import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as math from '../math/official72.mjs';
import {GENIES_BONANZA_ID} from '../math/genies-bonanza.mjs';
import {evaluateGatesMerlynGrid} from '../math/gates-of-merlyn.mjs';
import {genieRegularBoard,genieBoardDraws,genieBonusFeatureFixture,genieCarpetFixture} from './support/genies-bonanza-fixtures.mjs';
import {finiteDraws} from './support/gates-merlyn-fixtures.mjs';
const d=math.getGameDefinition(GENIES_BONANZA_ID),start=args=>math.startRound({gameId:d.id,...args});
const resolve=fixture=>{const rng=finiteDraws(fixture.draws),round=start({...fixture,rng});assert.equal(rng.remaining(),0);return round;};
const reordered=value=>Array.isArray(value)?value.map(reordered):value&&typeof value==='object'
  ?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reordered(v)])):value;

test('Genie has its observed6×5 count board and title-specific10/+5 bonus, without Gates MAGIC or accumulated multipliers',async()=>{
  assert.equal(d.mathVersion,'official72-geniesbonanza-r4');assert.equal(d.rows,5);assert.equal(d.cols,6);assert.equal(d.symbols.length,10);
  assert.equal(d.layout.kind,'cascade-grid');assert.equal(d.layout.geometryVerified,true);assert.deepEqual(d.paylines,[]);
  assert.equal(d.magicSymbol,undefined);assert.equal(d.tumbleFeature.initialFreeSpins,10);assert.equal(d.tumbleFeature.retriggerFreeSpins,5);
  assert.equal(d.tumbleFeature.bonusOnlyMultipliers,true);assert.equal(d.tumbleFeature.multiplierPersistence,'sequence');
  assert.deepEqual(d.tumbleFeature.modes,['base','buy100']);assert.equal(d.tumbleFeature.paytableVerified,true);
  const help=JSON.parse(await readFile(new URL('../references/official-slot-help-en-20261111.json',import.meta.url),'utf8')).captions;
  const relevant=Object.entries(help).filter(([key])=>key.startsWith('help.slots.geniesbonanza.')).map(([,value])=>value).join(' ');
  assert.match(relevant,/10 free spins/i);assert.match(relevant,/5 (?:additional|extra) free spins/i);assert.match(relevant,/Carpet/i);
  const base=resolve({betMinor:'100',draws:genieBoardDraws(genieRegularBoard())});
  assert.equal(base.status,'lost');assert.deepEqual(math.publicRound(base).outcome.multiplierSymbols,[]);
  assert.throws(()=>start({betMinor:'100',rng:()=>328}),{code:'INVALID_RNG'},'Base cells cannot draw bonus-only multiplier tickets.');
});

test('one purchased total debit resolves10free spins, a5-spin retrigger and sequence multipliers that reset instead of accumulate',()=>{
  const round=resolve(genieBonusFeatureFixture()),o=math.publicRound(round).outcome;
  assert.equal(round.betMinor,'10000');assert.equal(round.totalBetMinor,'10000');assert.equal(round.baseBetMinor,'100');
  assert.equal(o.spins.length,16);assert.equal(o.freeSpinsAwarded,15);assert.equal(o.freeSpinsPlayed,15);assert.equal(o.freeSpinsRemaining,0);
  assert.equal(o.spins[0].freeSpinsAwarded,10);assert.equal(o.spins[0].awardMinor,'500');
  assert.equal(o.spins[1].appliedMultiplier,2);assert.equal(o.spins[1].awardMinor,'80');
  assert.equal(o.spins[2].appliedMultiplier,3);assert.equal(o.spins[2].awardMinor,'120');
  assert.equal(o.spins[3].appliedMultiplier,100);assert.equal(o.spins[3].awardMinor,'0');assert.equal(o.spins[3].freeSpinsAwarded,5);
  assert.equal(o.spins[4].appliedMultiplier,1);assert.ok(o.spins.every(spin=>spin.accumulatedMultiplier===0));
  assert.equal(round.winMinor,'700');assert.equal(o.totalAwardMinor,'700');
  assert.equal(o.spins.reduce((sum,spin)=>sum+BigInt(spin.awardMinor),0n),700n);
  assert.equal(round.outcome.spins,undefined);assert.equal(o.settlement,'single-final-credit');
  assert.deepEqual(math.publicRound(round).allowedActions,[]);assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});
});

test('Carpet reveals distinct server-selected cloud cells before a free-spin tumble, preserving other cells and normal gravity',()=>{
  const round=resolve(genieCarpetFixture()),o=math.publicRound(round).outcome,spin=o.spins[1];
  assert.equal(round.winMinor,'540');assert.equal(spin.carpet.cloudCount,4);assert.equal(spin.carpet.symbolId,d.symbols[0].id);
  assert.deepEqual(spin.carpet.positions.map(p=>[p.row,p.col]),[[0,0],[0,1],[0,2],[0,3]]);
  for(const cell of spin.carpet.positions)assert.equal(spin.frames[0].grid[cell.row][cell.col],cell.symbolId);
  assert.deepEqual(spin.frames.map(frame=>frame.action),['tumble','end']);assert.equal(spin.frames[0].removedPositions.length,8);
  assert.equal(spin.frames[0].refills.length,8);assert.equal(spin.awardMinor,'40');
  assert.ok(o.spins.slice(2).every(item=>item.carpet===undefined));
});

test('Genie costs and supported options validate before RNG and never accept B+ progress, forced clouds or client payouts',()=>{
  assert.equal(math.maximumPayoutMinor({gameId:d.id,betMinor:'10000',options:{mode:'buy100'}}),'300000');
  assert.equal(math.maximumPayoutMinor({gameId:d.id,betMinor:'5000000'}),'15000000000');
  for(const options of [{mode:'ante'},{mode:'buy500'},{bonusBet:true},{bonusRisk:10},{carpet:true},{progress:100},{holdWin:true}]){
    let count=0;assert.throws(()=>start({betMinor:'10000',options,rng:()=>{count++;return 0;}}),{code:'INVALID_OPTIONS'});assert.equal(count,0);
  }
  for(const betMinor of ['100','10100'])assert.throws(()=>start({betMinor,options:{mode:'buy100'},rng:()=>0}),{code:'INVALID_BET'});
});

test('Genie pathological tumbles and retriggers award the disclosed maximum within storage/processing bounds and never leak the server trace',()=>{
  for(const rng of [()=>0,bound=>bound===328||bound===329?320:bound===64?63:0]){
    const round=start({betMinor:'100',rng}),o=math.publicRound(round).outcome;
    assert.equal(round.winMinor,'300000');assert.equal(o.capReached,true);assert.equal(o.processingLimitReached,true);assert.equal(o.boardsEvaluated,256);
    assert.ok(BigInt(o.processingMaximumAwardMinor)>0n);assert.ok(round.private.draws.length<=d.tumbleFeature.processingSafety.maximumRandomDraws);
    assert.ok(JSON.stringify({mathState:round,modelVersion:d.mathVersion,reservedPayoutMinor:'300000'}).length<120*1024);
    assert.equal(JSON.stringify(math.publicRound(round)).includes('"draws"'),false);
  }
});

test('Genie replay survives JSONB key ordering, rejects feature or award tampering and returns detached public frames',()=>{
  const f=genieBonusFeatureFixture(),round=resolve(f);assert.deepEqual(round,resolve(f));
  assert.deepEqual(math.publicRound(reordered(round)),math.publicRound(round));
  for(const mutate of [r=>r.winMinor='701',r=>r.outcome.freeSpinsPlayed++,r=>r.outcome.accumulatedMultiplier=100,
    r=>r.outcome.maximumAwardMinor='1',r=>r.private.draws.pop(),r=>r.private.draws.push(0),r=>r.mode='ante']){
    const bad=structuredClone(round);mutate(bad);assert.throws(()=>math.publicRound(bad),{code:'INVALID_ROUND'});
  }
  const view=math.publicRound(round);view.outcome.spins[0].frames[0].grid[0][0]='client-edit';
  assert.notEqual(math.publicRound(round).outcome.spins[0].frames[0].grid[0][0],'client-edit');
});

test('Genie exact rendered8–9,10–11and12+ count prizes scale from the displayed0.20DMO total',async()=>{
  const amounts={'blue-gem':[8,16,80],'green-gem':[12,20,100],'pink-gem':[16,24,140],
    'red-gem':[20,30,160],'yellow-gem':[4,12,40],necklace:[24,40,200],ring:[50,120,400],
    hourglass:[30,50,240],lamp:[40,80,300],crown:[100,200,1000]};
  assert.equal(d.tumbleFeature.minimumMatchVerified,true);assert.equal(d.tumbleFeature.paytableSource.displayedTotalBetMinor,'20');
  for(const symbol of d.symbols)for(const count of [8,9,10,11,12,30]){
    const others=d.symbols.filter(other=>other.id!==symbol.id),cells=Array.from({length:30},(_,i)=>i<count?symbol.id:others[(i-count)%others.length].id);
    const grid=Array.from({length:5},(_,row)=>cells.slice(row*6,row*6+6)),scored=evaluateGatesMerlynGrid(d,'20',grid);
    const expected=amounts[symbol.id.replace('geniesbonanza-','')][count<10?0:count<12?1:2];
    assert.equal(scored.winningGroups.find(group=>group.symbolId===symbol.id).awardMinor,String(expected));
  }
  assert.ok((await readFile(new URL('../'+d.tumbleFeature.paytableSource.regular,import.meta.url))).length>0);
  assert.equal(d.tumbleFeature.providerProbabilitiesVerified,false);
});

test('Genie pays the observed flat5× at four or more Scatters and no invented three-Scatter cash prize',()=>{
  assert.deepEqual(d.tumbleFeature.scatterPaytable,[{minimumCount:4,multiplierBps:50000}]);
  for(const count of [3,4,5,6,30]){
    const cells=genieRegularBoard();for(let i=0;i<count;i++)cells[i]='S';
    const draws=[...genieBoardDraws(cells),...(count>=4?Array.from({length:10},()=>[63,...genieBoardDraws(genieRegularBoard())]).flat():[])];
    const round=resolve({betMinor:'100',draws}),o=math.publicRound(round).outcome;
    assert.equal(o.spins[0].scatterCount,count);assert.equal(o.spins[0].scatterAwardMinor,count>=4?'500':'0');
    assert.equal(round.winMinor,count>=4?'500':'0');assert.equal(o.freeSpinsPlayed,count>=4?10:0);
  }
});
