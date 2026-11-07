import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {definitions,publicGames,start,evaluateDraftRound,act,expire,publicState,evaluateSequence,sampleOutcome,roundPayoutMinor,applyAddedWilds} from '../models/smartsoft-slots.mjs';
const models=JSON.parse(await readFile(new URL('../models/smartsoft-slots.data.json',import.meta.url),'utf8'));
const get=id=>models.find(m=>m.id===id);
const now=1794052800000;
function scripted(values,fallback=.731){let i=0;return()=>values[i++]??fallback;}
function seeded(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function spin(id,rng,stake=get(id)?.stakeMinorValues.find(value=>BigInt(value)>=100n)??'100'){return evaluateDraftRound(id,{stakeMinor:stake},rng,now);}
function specifiedGrid(id,grid,following=[.99]){
 const model=get(id),draws=grid.flatMap((reel,c)=>reel.map(symbol=>{
  const at=model.sampling[c].indexOf(symbol);assert.ok(at>=0);return(at+.25)/model.sampling[c].length;
 }));
 return scripted([...draws,...following]);
}

test('all 11 draft models have immutable versions; production start/config gates stay closed',()=>{
 assert.equal(publicGames.length,11);assert.equal(new Set(publicGames.map(g=>g.version)).size,11);
 for(const game of publicGames){
  assert.equal(game.officialPrivateMathVerified,false);assert.equal(definitions[game.id].launchable,false);
  assert.equal(game.launchable,false);assert.throws(()=>start(game.id,{stakeMinor:'100'},()=>0,now),/GAME_MODEL_NOT_READY/);
  assert.equal(game.symbols.length,get(game.id).symbols.length);assert.deepEqual(game.actions,[]);
  assert.throws(()=>{game.rows=99;},TypeError);
 }
});

test('40/100-line machines use the recovered official four-row geometry, not legacy 3-row paths',async()=>{
 for(const [id,count]of [['multihot40_native',40],['multihot100_native',100]]){
  const game=get(id),reference=JSON.parse(await readFile(new URL('../references/'+id.replace('_native','')+'-paylines.json',import.meta.url),'utf8'));
  assert.equal(game.rows,4);assert.equal(game.columns,5);assert.equal(game.paths.length,count);
  assert.deepEqual(game.paths,reference.paths);assert.equal(new Set(game.paths.map(JSON.stringify)).size,count);
  assert.ok(game.paths.some(path=>path.includes(3)));assert.equal(reference.verified,true);
 }
 assert.notDeepEqual(get('burningice40_native').paths,get('multihot40_native').paths);
});

test('sevens in MH40/MH100 do not act as wilds; verified wild titles do substitute',()=>{
 assert.equal(evaluateSequence([0,1,1,2,3],'multihot40_native').units,0);
 assert.deepEqual(evaluateSequence([0,0,0,1,2],'multihot40_native'),{units:200,symbol:0,count:3});
 assert.deepEqual(evaluateSequence([0,9,9],'multihot5wild_native'),{units:750,symbol:9,count:3});
 assert.deepEqual(evaluateSequence([0,0,0],'multihot5wild_native'),{units:1000,symbol:0,count:3});
 assert.equal(get('multihot5wild_native').symbols.length,10);
});

test('fixed lines and 27 ways award materially different combinations',()=>{
 const grid=[0,1,0, 1,0,0, 0,0,1].map(s=>s===1?.95:.25);
 const ways=sampleOutcome('multihotwildways_native',scripted([...grid,0]));
 const lines=sampleOutcome('multihot5wild_native',scripted([...grid,0]));
 assert.ok(ways.awards.some(w=>w.cells.map(c=>c[1]).join(',')==='1,0,2'));
 assert.ok(!lines.awards.some(w=>w.cells.map(c=>c[1]).join(',')==='1,0,2'));
 assert.equal(get('multihotwildways_native').paths.length,27);
});

test('Super Wild supports multiple added cells and reveals the initial grid before final evaluation',()=>{
 const base=Array.from({length:15},(_,i)=>(i%8+1+.1)/9);
 const mask=Array(15).fill(.99);mask[0]=0;mask[7]=0;
 const added=sampleOutcome('multihot5superwilds_native',scripted([...base,0,...mask]));
 const unchanged=sampleOutcome('multihot5superwilds_native',scripted([...base,0,...Array(15).fill(.99)]));
 assert.equal(added.grid[0][0],0);assert.equal(added.grid[2][1],0);
 assert.notEqual(unchanged.grid[0][0],0);assert.notEqual(unchanged.grid[2][1],0);
 assert.deepEqual(added.feature.addedWilds,[[0,0],[2,1]]);
 assert.equal(added.feature.multiplier,1);assert.equal(added.frames.length,2);
 assert.deepEqual(added.frames[0].grid,unchanged.grid);assert.equal(added.frames[0].rawUnits,0);
 assert.deepEqual(added.frames[1].grid,added.grid);assert.ok(added.awards.every(w=>w.frame===1));
 const original=[[1,0],[2,3]],transformed=applyAddedWilds(original,[[0,0],[0,0],[0,1],[1,1]]);
 assert.deepEqual(transformed.grid,[[0,0],[2,0]]);assert.deepEqual(transformed.addedWilds,[[0,0],[1,1]]);
 assert.deepEqual(original,[[1,0],[2,3]]);assert.throws(()=>applyAddedWilds(original,[[9,9]]),/INVALID_ADDED_WILD_CELL/);
});

test('Safari expansion preserves the already-existing grid and adds no invented payout',()=>{
 const x=(4+.1)/9,out=sampleOutcome('safarisimba_native',scripted([...Array(9).fill(x),0]));
 assert.deepEqual(out.feature.expandedReels,[0,1,2]);
 assert.ok(out.grid.every(reel=>reel.every(s=>s===4)));
 assert.equal(out.rawUnits,5*200);
 const ordinary=sampleOutcome('safarisimba_native',scripted([...Array(9).fill(.01),0]));
 assert.deepEqual(ordinary.feature.expandedReels,[]);
});

test('Burning Ice public line counts, row counts, scatter and coin distinctions are retained',()=>{
 assert.deepEqual(['burningice_native','burningice10_native','burningice40_native'].map(id=>[get(id).columns,get(id).rows,get(id).paths.length]),[[5,3,5],[5,3,10],[5,4,40]]);
 assert.deepEqual(get('burningice_native').scatters.map(s=>s.symbol),[8,9]);assert.deepEqual(get('burningice40_native').scatters.map(s=>s.symbol),[8]);
 assert.equal(evaluateSequence([9,0,0,0,0],'burningice_native').units,0,'scatter cannot form a line through wild substitution');
 assert.equal(evaluateSequence([8,0,0,0,0],'burningice40_native').units,0,'dollar is a scatter, not a line symbol');
 assert.equal(evaluateSequence([10,10,1,2,3],'burningice_native').units,100,'public seven two-symbol award');
});

test('frozen reels persist unchanged; respins pay only incremental new line awards and are bounded',()=>{
 let example=null;
 for(let seed=1;seed<2000&&!example;seed++){
  const value=sampleOutcome('burningice_native',seeded(seed));
  if(value.frames.length>1)example=value;
 }
 assert.ok(example,'deterministically find a real frozen-reel bonus');
 assert.ok(example.frames.length<=5);
 const credited=new Map();let sum=0;
 for(let i=0;i<example.frames.length;i++){
  const frame=example.frames[i];
  if(i)for(const reel of example.frames[i-1].feature.frozenReels)assert.deepEqual(frame.grid[reel],example.frames[i-1].grid[reel]);
  for(const win of frame.awards){sum+=win.units;if(win.line)credited.set(win.line,(credited.get(win.line)??0)+win.units);}
 }
 assert.equal(sum,example.rawUnits);
 for(const [line,paid]of credited){
  const path=get('burningice_native').paths[line-1];
  const best=Math.max(...example.frames.map(f=>evaluateSequence(path.map((r,c)=>f.grid[c][r]),'burningice_native').units));
  assert.equal(paid,best,'same frozen award is not paid repeatedly');
 }
});

test('Dollar and Pot scatters add whole-stake awards and freeze the actual winning reels',()=>{
 const id='burningice_native',grid=[[9,8,1],[2,3,4],[9,8,5],[4,5,6],[9,8,7]];
 const result=sampleOutcome(id,specifiedGrid(id,grid));
 const scatters=result.frames[0].awards.filter(w=>w.scatter);
 assert.deepEqual(scatters.map(w=>w.symbol),[8,9]);
 assert.equal(scatters[0].units,150*5);assert.equal(scatters[1].units,1000*5);
 assert.deepEqual(result.frames[0].feature.frozenReels,[0,2,4]);
 assert.equal(scatters[0].cells.length,3);assert.equal(scatters[1].cells.length,3);
});

test('clover and coin expansion preserve every scatter instead of substituting it',()=>{
 const id='burningice_native',grid=[[1,2,3],[0,8,4],[9,5,6],[3,4,5],[1,2,3]];
 const result=sampleOutcome(id,specifiedGrid(id,grid,[0,0]));
 assert.equal(result.frames[0].grid[1][1],8);
 assert.equal(result.frames[0].grid[2][0],9);
 assert.deepEqual(result.frames[0].feature.coinReels,[1]);
 assert.equal(result.frames[0].grid[1][0],11);
});

test('Burning Ice uses exact title maximum instead of the invented100×or10k caps',()=>{
 for(const [id,seven,award,bound]of [['burningice_native',10,3000n,3400n],['burningice10_native',10,5000n,5800n],['burningice40_native',9,1000n,5000n]]){
  const model=get(id),grid=Array.from({length:5},()=>Array(model.rows).fill(seven));
  assert.equal(model.winMultiplierCap,undefined);
  assert.equal(definitions[id].maxWin,'15000000.00');
  for(const stake of [model.stakeMinorValues[0],model.stakeMinorValues.at(-1)]){
   const result=spin(id,specifiedGrid(id,grid),stake),loss=spin(id,seeded(9871),stake);
   assert.equal(result.payoutMinor,String(BigInt(stake)*award));
   assert.equal(result.maxPayoutMinor,loss.maxPayoutMinor);
   assert.equal(result.maxPayoutMinor,String(BigInt(stake)*bound));
   assert.equal(expire(result.state,()=>{throw Error('expiry must not draw');},now+1).payoutMinor,result.payoutMinor);
   assert.ok(BigInt(result.maxPayoutMinor)>=BigInt(result.payoutMinor));
   assert.ok(BigInt(result.maxPayoutMinor)<=1500000000n);
   assert.equal(result.state.feature.capped,false);
  }
 }
});

test('a paid round uses integer money strings, one debit, exact award totals and an outcome-independent reserve',()=>{
 for(const game of publicGames){
  const a=spin(game.id,seeded(100),'10000'),b=spin(game.id,seeded(900),'10000');
  assert.equal(a.debitMinor,'10000');assert.equal(a.maxPayoutMinor,b.maxPayoutMinor);
  assert.equal(a.state.status,'settled');assert.equal(a.state.expiresAt,now);
  for(const value of [a.debitMinor,a.maxPayoutMinor,a.payoutMinor])assert.match(value,/^(0|[1-9]\d*)$/);
  assert.ok(BigInt(a.payoutMinor)<=BigInt(a.maxPayoutMinor));assert.ok(BigInt(a.maxPayoutMinor)<=BigInt(game.maxWin.replace('.','')));
  assert.equal(a.state.wins.reduce((sum,w)=>sum+BigInt(w.payoutMinor),0n),BigInt(a.payoutMinor));
  assert.equal(a.state.frames.reduce((sum,f)=>sum+BigInt(f.payoutMinor),0n),BigInt(a.payoutMinor));
  assert.equal(a.state.grid.length,game.columns);assert.ok(a.state.grid.every(reel=>reel.length===game.rows));
 }
});

test('100 winning lines round once and remain below the service state size bound',()=>{
 const result=spin('multihot100_native',scripted([...Array(20).fill(0),.999,.99999999]),'100');
 const model=get('multihot100_native');
 const expected=100n*500n*5n*BigInt(model.scale.numerator)/BigInt(model.scale.denominator);
 assert.equal(result.payoutMinor,String(expected));assert.equal(result.state.wins.length,100);
 assert.equal(result.state.wins.reduce((sum,w)=>sum+BigInt(w.payoutMinor),0n),expected);
 assert.ok(Buffer.byteLength(JSON.stringify(result.state))<100*1024);
});

test('fractional total money primitive pays floor/ceiling with exact stratified frequency',()=>{
 // The exact reference bet schedules make current raw awards integral. Verify
 // defensive fractional money behavior independently without allowing illegal stakes.
 let ceilings=0,total=0n;
 for(let i=0;i<1000;i++){
  const paid=roundPayoutMinor(11n,10n,100n,()=>(i+.5)/1000);
  assert.ok([1n,2n].includes(paid));if(paid===2n)ceilings++;total+=paid;
 }
 assert.equal(ceilings,100);assert.equal(total,1100n);
 assert.equal(roundPayoutMinor(11n,10n,100n,()=>0),2n);
 assert.equal(roundPayoutMinor(11n,10n,100n,()=>.999),1n);
});

test('exact totals and capped amounts consume no rounding draw',()=>{
 const noDraw=()=>{throw Error('unexpected rounding draw');};
 assert.equal(roundPayoutMinor(10n,10n,100n,noDraw),1n);
 assert.equal(roundPayoutMinor(1001n,10n,100n,noDraw),100n);
 assert.equal(roundPayoutMinor(0n,10n,100n,noDraw),0n);
 let calls=0;
 const exact=spin('multihot5wild_native',()=>{calls++;if(calls<=9)return .21;if(calls===10)return 0;throw Error('unexpected rounding draw');},'500');
 assert.equal(exact.payoutMinor,'2500');assert.equal(calls,10);
 assert.throws(()=>roundPayoutMinor(1n,0n,1n,noDraw),/INVALID_PAYOUT_RATIO/);
});

test('exact per-game public numerical maxima bound maximum-stake payouts and reserves',()=>{
 for(const model of models){
  const stake=model.stakeMinorValues.at(-1),definition=definitions[model.id];
  assert.equal(definition.maxWin,model.referenceLimits.maximumWin);
  assert.equal(definition.currencyAdaptation.source,'DMO');assert.equal(definition.currencyAdaptation.draft,'ETB');
  const a=spin(model.id,seeded(294),stake),b=spin(model.id,seeded(876),stake);
  assert.equal(a.maxPayoutMinor,b.maxPayoutMinor);
  assert.ok(BigInt(a.payoutMinor)<=BigInt(a.maxPayoutMinor));
  assert.ok(BigInt(a.maxPayoutMinor)<=BigInt(definition.maxWin.replace('.','')));
  if(model.winMultiplierCap!==undefined)assert.ok(BigInt(a.maxPayoutMinor)<=BigInt(stake)*BigInt(model.winMultiplierCap));
 }
 const top=spin('multihot40_native',scripted([...Array(20).fill(0),.999]),'10000');
 assert.equal(top.payoutMinor,'25000000');assert.equal(top.maxPayoutMinor,'25000000');
 assert.equal(top.state.wins.reduce((sum,w)=>sum+BigInt(w.payoutMinor),0n),25000000n);
 const wild=spin('multihotwildways_native',scripted([...Array(9).fill(0),.999]),'30000');
 assert.equal(wild.payoutMinor,'8850000');assert.equal(wild.maxPayoutMinor,'8850000');
 assert.equal(wild.state.feature.capped,true);
});

test('invalid stakes/options/server RNG fail without a partial transition',()=>{
 for(const stake of ['0','9','10001','01','1.0','-1','NaN',100])assert.throws(()=>spin('multihot40_native',()=>0,stake));
 for(const random of [NaN,Infinity,-.1,1])assert.throws(()=>spin('multihot40_native',()=>random),/INVALID_SERVER_RANDOM/);
 assert.throws(()=>evaluateDraftRound('multihot40_native',{stakeMinor:'100',modelVersion:'fake'},()=>0,now),/INVALID_SLOT_OPTIONS/);
 assert.throws(()=>evaluateDraftRound('multihot40_native',{stakeMinor:'40'},()=>0,-1),/INVALID_SERVER_TIME/);
 assert.throws(()=>spin('wrong_id',()=>0),/GAME_NOT_FOUND/);
});

test('settled public views reveal only resolved outcomes; no next-round seed or liability leaks',()=>{
 const result=spin('multihot5wild_native',seeded(1));
 const state={...result.state,secretSeed:'private',nextGrid:[[0]],internalCredit:'never'};
 const view=publicState(state,now);
 assert.ok(!('secretSeed'in view));assert.ok(!('nextGrid'in view));assert.ok(!('liabilityMinor'in view));assert.ok(!('internalCredit'in view));
 view.grid[0][0]='bad';assert.notEqual(state.grid[0][0],'bad');
 assert.throws(()=>act(state,{type:'collect'},()=>0,now),/ROUND_ALREADY_SETTLED/);
 const expired=expire(result.state,()=>{throw Error('must not draw');},now+1);
 assert.equal(expired.debitMinor,'0');assert.equal(expired.maxPayoutMinor,result.maxPayoutMinor);assert.equal(expired.payoutMinor,result.payoutMinor);
 assert.throws(()=>expire({...result.state,modelVersion:'future'},()=>0,now),/INVALID_SLOT_STATE/);
});

test('raw public coefficients are preserved without a payout-calibration multiplier',async()=>{
 for(const model of models){
  assert.deepEqual(model.scale,{numerator:'1',denominator:'1'});
  const bootstrap=['multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native'].includes(model.id);
  const source=JSON.parse(await readFile(new URL('../references/public-models/'+model.id+(bootstrap?'.bootstrap.json':'.json'),import.meta.url),'utf8'));
  const coeffs=(bootstrap?source.PayTable:source.paytable).Coeffs;
  assert.deepEqual(model.coefficients.slice(0,coeffs.length),coeffs.map(row=>row.Wins.map(value=>Math.round(value*10))));
 }
});

test('exact fixed demo stake schedules, including sub-0.10 minima, are enforced before RNG',()=>{
 for(const model of models){
  const def=definitions[model.id],values=model.stakeMinorValues;
  assert.equal(def.minStake,model.referenceStakeSchedule.minimum);
  assert.equal(def.maxStake,model.referenceStakeSchedule.maximum);
  assert.deepEqual(values,model.referenceStakeSchedule.perLineValues.map(v=>String(v*model.referenceStakeSchedule.lines)));
  assert.equal(def.stakeValues.length,values.length);
  for(const amount of [values[0],values.at(-1)])assert.equal(spin(model.id,seeded(33),amount).debitMinor,amount);
  const invalid=String(BigInt(values[0])+1n);
  assert.ok(!values.includes(invalid));
  assert.throws(()=>spin(model.id,()=>{throw Error('RNG must not run');},invalid),/STAKE_NOT_IN_REFERENCE_SCHEDULE/);
 }
 assert.equal(definitions.multihot40_native.minStake,'0.40');
 assert.equal(definitions.multihot100_native.minStake,'1.00');
 assert.equal(definitions.multihot5wild_native.minStake,'0.05');
 assert.equal(definitions.multihot5wild_native.maxStake,'400.00');
});

test('Wild5 numbered paths match its own public help artwork',async()=>{
 const reference=JSON.parse(await readFile(new URL('../references/multihot5wild-paylines.json',import.meta.url),'utf8'));
 assert.equal(reference.verified,true);assert.deepEqual(get('multihot5wild_native').paths,reference.paths);
 assert.deepEqual(reference.paths,[[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]]);
});

test('base Burning Ice expands a fifth-reel clover without moving the three coin positions',()=>{
 const id='burningice_native',grid=[[1,2,3],[2,3,4],[3,4,5],[4,5,6],[0,8,7]];
 const result=sampleOutcome(id,specifiedGrid(id,grid,[.99]));
 assert.deepEqual(result.frames[0].grid[4],[0,8,0]);
 assert.ok(result.frames[0].feature.expandedReels.includes(4));
 assert.deepEqual(get(id).coinReels,[1,2,3]);
 assert.deepEqual(get('burningice10_native').expandingReels,[1,2,3]);
});

test('Burning Ice40 does not invent the5/10-line lucky-coin feature',()=>{
 const m=get('burningice40_native');assert.equal(m.coinChanceDenominator,0);assert.equal(m.coinWildSymbol,null);
 assert.equal(m.symbols.length,10);assert.deepEqual(m.wildSymbols,[0]);
 const grid=Array.from({length:5},(_,c)=>Array.from({length:4},(_,r)=>1+(c+r)%7));
 const result=sampleOutcome(m.id,specifiedGrid(m.id,grid,[0,0]));
 assert.deepEqual(result.frames[0].feature.coinReels,[]);
 assert.ok(result.grid.every(reel=>reel.every(symbol=>symbol<10)));
});

test('all exact demo stake schedules make raw public award coefficients integral in minor units',()=>{
 for(const model of models){
  for(const stake of model.stakeMinorValues){
   for(let symbol=0;symbol<model.coefficients.length;symbol++){
    const divisor=model.scatters.some(s=>s.symbol===symbol)?1:model.lineStakeDivisor;
    for(const coefficient of model.coefficients[symbol]){
     assert.equal(BigInt(stake)*BigInt(coefficient)%(10n*BigInt(divisor)),0n,model.id+' '+stake+' '+symbol);
    }
   }
  }
 }
});
