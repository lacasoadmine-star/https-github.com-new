import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as math from '../math/official72.mjs';
import {WHEEL_OF_DESTINY_ID as id} from '../math/wheel-of-destiny.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineGeometry,machineMarkup,wheelRotation} from '../client/machine74-renderer.mjs';
const d=math.getGameDefinition(id),source=JSON.parse(fs.readFileSync(new URL('../references/wheel-of-destiny-display-20261111.json',import.meta.url)));
test('Wheel of Destiny separates the source-backed50 display segments from its nine betting fields',()=>{
 assert.equal(d.mathVersion,'official72-wheelofdestiny-r4');assert.equal(d.sectors.length,50);assert.equal(d.betFields.length,9);
 assert.deepEqual(d.displayWheelSymbolIndexes,source.displaySymbolIndexOrder);assert.equal(d.layout.sectorCountVerified,true);
 assert.equal(d.betFields[8].implemented,true);assert.equal(d.nominalReturn.verified,false);assert.match(d.nominalReturn.scope,/no single global/);
 const view=publicLibrary74Definition(d);assert.equal(view.betFields.length,9);assert.deepEqual(machineGeometry(view),{sectors:50});
 const markup=machineMarkup(view);assert.equal([...markup.matchAll(/data-sector=/g)].length,50);assert.match(markup,/fifty-segment ring/);
 d.sectors.forEach((sector,index)=>assert.equal(wheelRotation(view,{outcome:{sector:sector.id}}),-(index+.5)*360/50));
});
test('matched regular allocations pay their own gross prize; all other staked fields lose',()=>{
 const bets=d.betFields.slice(0,8).map(field=>({symbolIndex:field.symbolIndex,amountMinor:'100'})),options={bets};let total=0n;
 const bound=math.maximumPayoutMinor({gameId:id,betMinor:'800',options});assert.equal(bound,'4800','Only one field can win; do not reserve48 times the whole800total.');
 for(let index=0;index<50;index++) {
  const sector=d.sectors[index],round=math.startRound({gameId:id,betMinor:'800',options,rng:()=>index});
  const expected=sector.symbolIndex===8?'0':String(BigInt(d.betFields[sector.symbolIndex].multiplierBps)/100n);
  assert.equal(round.winMinor,expected);assert.equal(round.outcome.sectorIndex,index);assert.equal(round.outcome.symbolIndex,sector.symbolIndex);
  assert.equal(round.outcome.settledBets.filter(b=>b.payoutMinor!=='0').length,sector.symbolIndex===8?0:1);
  assert.equal(math.publicRound(round).winMinor,round.winMinor);assert.equal(round.betMinor,'800');total+=BigInt(round.winMinor);
 }
 assert.equal(total,38400n,'Independent uniform50 tickets give96% only to the regular subset.');
});
test('each regular allocation has an attainable exact bound at normal and large stakes',()=>{
 for(let symbolIndex=0;symbolIndex<8;symbolIndex++)for(const betMinor of ['100','2000','4000100',d.limits.maxBetMinor]) {
  const options={bets:[{symbolIndex,amountMinor:betMinor}]},index=d.sectors.findIndex(s=>s.symbolIndex===symbolIndex);
  const round=math.startRound({gameId:id,betMinor,options,rng:()=>index});
  assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor,options}));assert(BigInt(round.winMinor)<=999999999999999n);
  assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});
 }
 const bets=[{symbolIndex:0,amountMinor:'10000'},{symbolIndex:7,amountMinor:'100'}];
 assert.equal(math.maximumPayoutMinor({gameId:id,betMinor:'10100',options:{bets}}),'30000','The larger allocated stake, not the highest nominal multiplier, determines this reserve.');
});
test('invalid allocations, duplicate fields, fake totals and out-of-range fields fail before entropy is used',()=>{
 const attempt=(betMinor,bets,code)=>{let draws=0;assert.throws(()=>math.startRound({gameId:id,betMinor,options:{bets},rng:()=>{draws++;return 0;}}),{code});assert.equal(draws,0);assert.throws(()=>math.maximumPayoutMinor({gameId:id,betMinor,options:{bets}}),{code});};
 attempt('100',[],'INVALID_WHEEL_BETS');attempt('100',[{symbolIndex:0,amountMinor:'200'}],'INVALID_WHEEL_BETS');
 attempt('200',[{symbolIndex:0,amountMinor:'100'},{symbolIndex:0,amountMinor:'100'}],'INVALID_WHEEL_BETS');
 attempt('100',[{symbolIndex:0,amountMinor:'0100'}],'INVALID_WHEEL_BETS');attempt('100',[{symbolIndex:'0',amountMinor:'100'}],'INVALID_WHEEL_BETS');
 attempt('100',[{symbolIndex:0,amountMinor:'100',winMinor:'999999'}],'INVALID_WHEEL_BETS');attempt('100',[{symbolIndex:9,amountMinor:'100'}],'INVALID_WHEEL_BETS');
});
test('stored segment, allocation totals and matched award must agree on recovery',()=>{
 const index=d.sectors.findIndex(s=>s.symbolIndex===0),round=math.startRound({gameId:id,betMinor:'200',options:{bets:[{symbolIndex:0,amountMinor:'100'},{symbolIndex:1,amountMinor:'100'}]},rng:()=>index});
 for(const change of [r=>r.outcome.symbolIndex=1,r=>r.outcome.sectorIndex=String(index),r=>r.outcome.matchedStakeMinor='200',r=>r.outcome.settledBets[0].payoutMinor='600',r=>r.winMinor='600']) {
  const changed=structuredClone(round);change(changed);assert.throws(()=>math.publicRound(changed),{code:'INVALID_ROUND'});
 }
});

const bonusOptions={bets:[{symbolIndex:8,amountMinor:'100'}]},mainBonus=d.sectors.findIndex(s=>s.symbolIndex===8);
function sequenceRng(sequence){let index=0;return bound=>{assert.equal(bound,50);assert(index<sequence.length,'No extra bonus draw after terminal prize.');return sequence[index++];};}
test('documented bonus table and two-Double conversion resolve at mostthree frames within one stake',()=>{
 const table=JSON.parse(fs.readFileSync(new URL('../reports/current74-evidence-nonslots/ind74_official_wheelofdestiny-official-help-tables.json',import.meta.url)));
 const counts={};for(const symbol of d.bonusDisplaySymbolIndexes){const key=symbol===8?'DOUBLE':d.bonusPrizes[symbol]+'x';counts[key]=(counts[key]??0)+1;}assert.deepEqual(counts,table.bonusSectors);
 const double=d.bonusDisplaySymbolIndexes.indexOf(8),thirteen=d.bonusDisplaySymbolIndexes.indexOf(1),highest=d.bonusDisplaySymbolIndexes.indexOf(7);
 for(const[spins,coefficient,labels]of [[[thirteen],13,['13x']],[[double,highest],300,['DOUBLE','300x']],[[double,double,highest],600,['DOUBLE','DOUBLE','600x']],[[double,double,double],1200,['DOUBLE','DOUBLE','1200x']]]){
  const round=math.startRound({gameId:id,betMinor:'100',options:bonusOptions,rng:sequenceRng([mainBonus,...spins])});
  assert.equal(round.outcome.bonusTriggered,true);assert.equal(round.winMinor,String(coefficient*100));assert.deepEqual(round.outcome.bonusFrames.map(f=>f.label),labels);
  assert.equal(round.outcome.bonusFrames.at(-1).terminal,true);assert.equal(round.outcome.bonusMultiplierBps,coefficient*10000);assert.equal(math.publicRound(round).winMinor,round.winMinor);
 }
 assert.equal(d.maximumMultiplierBps,12000000);
 for(const betMinor of ['100','2000','5000000',d.limits.maxBetMinor]){
  const options={bets:[{symbolIndex:8,amountMinor:betMinor}]},round=math.startRound({gameId:id,betMinor,options,rng:()=>0});
  assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor,options}));assert.equal(round.winMinor,String(BigInt(betMinor)*1200n));assert(BigInt(round.winMinor)<=999999999999999n);
 }
 assert.equal(math.maximumPayoutMinor({gameId:id,betMinor:'200',options:{bets:[{symbolIndex:7,amountMinor:'100'},{symbolIndex:8,amountMinor:'100'}]}}),'120000');
});
test('whole authored BONUS expectation is computed from every reachable bounded branch, distinct from provider RTP',()=>{
 let total=0n;const order=d.bonusDisplaySymbolIndexes;
 for(let first=0;first<50;first++){
  if(order[first]!==8){total+=BigInt(math.startRound({gameId:id,betMinor:'100',options:bonusOptions,rng:sequenceRng([mainBonus,first])}).winMinor)*2500n;continue;}
  for(let second=0;second<50;second++){
   if(order[second]!==8){total+=BigInt(math.startRound({gameId:id,betMinor:'100',options:bonusOptions,rng:sequenceRng([mainBonus,first,second])}).winMinor)*50n;continue;}
   for(let third=0;third<50;third++)total+=BigInt(math.startRound({gameId:id,betMinor:'100',options:bonusOptions,rng:sequenceRng([mainBonus,first,second,third])}).winMinor);
  }
 }
 assert.equal(total,600090000n);assert.equal(total*62500n,60009n*125000n*50n*100n);
 assert.deepEqual(d.nominalReturn.regular,{numerator:'24',denominator:'25'});assert.deepEqual(d.nominalReturn.bonus,{numerator:'60009',denominator:'62500'});assert.equal(d.nominalReturn.verified,false);
});
test('bonus frame tampering and continuation after a final prize reject during recovery',()=>{
 const round=math.startRound({gameId:id,betMinor:'100',options:bonusOptions,rng:()=>0});
 for(const mutate of [r=>r.outcome.bonusFrames[0].prizeScaleAfter=4,r=>r.outcome.bonusFrames[2].multiplierBps=48000000,r=>r.outcome.bonusFrames.push(structuredClone(r.outcome.bonusFrames[2]))]){const changed=structuredClone(round);mutate(changed);assert.throws(()=>math.publicRound(changed),{code:'INVALID_ROUND'});}
});
