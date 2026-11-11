import test from 'node:test';
import assert from 'node:assert/strict';
import configs from './generated-registry.mjs';
import popx from './games/popx.mjs';
import multi from './games/multihot20.mjs';
import {mineIslandDefinition} from './mine-island2.mjs';
import {calculateSlotReturn,startSlot} from './engines/slots.mjs';
import {startCrash,advanceCrash,publicCrash,crashReturn} from './engines/crash.mjs';
import {startLadder,advanceLadder,collectLadder,publicLadder} from './engines/ladder.mjs';
import {choose,startMines,advanceMines,collectMines,publicMines,mineMultiplier} from './engines/mines.mjs';
import {startInstant} from './engines/instant.mjs';
const all=[mineIslandDefinition,popx,multi,...configs];
test('74 distinct titles have individual source modules and distinct configured models',()=>{
 assert.equal(all.length,74);assert.equal(new Set(all.map(x=>x.id)).size,74);
 const slots=all.filter(x=>x.family==='slots');assert.equal(slots.length,42);
 assert.equal(new Set(slots.map(x=>JSON.stringify(x.symbols.map(s=>s.pays)))).size,42);
 for(const d of all){assert.ok(d.provenance.designed);assert.ok(d.rules.length);assert.ok(BigInt(d.limits.maxWinMinor)>0n);}
});
for(const d of configs){
 test(`${d.catalogName}: original ${d.family} model, payout arithmetic and probability invariants`,()=>{
  const min=d.limits.minBetMinor;const max=d.limits.maxBetMinor;const cap=BigInt(d.limits.maxWinMinor);let round;
  if(d.family==='slots'){
   assert.equal(d.paylines.length,new Set(d.paylines.map(x=>x.join(','))).size);
   assert.ok(d.paylines.every(l=>l.length===5&&l.every(n=>Number.isInteger(n)&&n>=0&&n<3)));
   const r=calculateSlotReturn(d);assert.equal(BigInt(r.numerator)*BigInt(d.nominalReturn.denominator),BigInt(d.nominalReturn.numerator)*BigInt(r.denominator));
   round=startSlot(d,{betMinor:max,rng:()=>7});assert.equal(BigInt(round.winMinor),cap);assert.equal(round.outcome.lineWins.length,d.paylines.length);
  }else if(d.family==='crash'){
   round=startCrash(d,{betMinor:max,rng:()=>0,now:0});assert.equal(publicCrash(d,round,1).private,undefined);
   const at=Math.ceil((d.maxMultiplierBps-10000)*1000/d.growthBpsPerSecond);round=advanceCrash(d,round,{},at);assert.equal(round.status,'collected');assert.equal(BigInt(round.winMinor),cap);
   assert.equal(startCrash(d,{betMinor:min,rng:b=>b-1,now:0}).status,'lost');
   for(const targetBps of [10000,11000,20000,d.maxMultiplierBps]){const r=crashReturn(d,{betMinor:min,targetBps});assert.ok(BigInt(r.expectedReturnNumerator)*10000n<=BigInt(r.expectedReturnDenominator)*BigInt(d.returnBps));}
  }else if(d.family==='ladder'){
   let n=1n,den=1n;for(let i=0;i<d.multipliersBps.length;i++){const m=d.multipliersBps[i];assert.ok(m>(d.multipliersBps[i-1]??d.returnBps));n*=BigInt(i?d.multipliersBps[i-1]:d.returnBps);den*=BigInt(m);assert.equal(n*BigInt(m),BigInt(d.returnBps)*den);}
   round=startLadder(d,{betMinor:max,rng:()=>0});assert.equal(publicLadder(d,round).private,undefined);assert.ok(BigInt(collectLadder(d,round).winMinor)>BigInt(max));
   while(round.status==='active')round=advanceLadder(d,round,{});assert.equal(round.status,'collected');assert.equal(BigInt(round.winMinor),cap);
   assert.equal(startLadder(d,{betMinor:min,rng:b=>b-1}).status,'lost');
  }else if(d.family==='mines'){
   round=startMines(d,{betMinor:max,rng:()=>0});assert.equal(new Set(round.private.mines).size,d.mines);assert.equal(publicMines(d,round).mineCells,undefined);
   const lost=advanceMines(d,round,{cell:0});assert.equal(lost.status,'lost');assert.equal(lost.winMinor,'0');
   for(let i=0;i<d.maxPicks;i++)round=advanceMines(d,round,{cell:d.mines+i});assert.equal(round.status,'collected');assert.equal(BigInt(round.winMinor),cap);
   for(let k=1;k<=d.maxPicks;k++){const m=BigInt(mineMultiplier(d,k));assert.ok(choose(d.cells-d.mines,k)*m<=choose(d.cells,k)*BigInt(d.returnBps));}
  }else if(d.family==='wheel'){
   const denominator=d.sectors.reduce((n,s)=>n+s.weight,0);assert.equal(denominator,100);const ideal=d.sectors.reduce((n,s)=>n+BigInt(s.weight)*BigInt(s.multiplierBps),0n);assert.equal(ideal*BigInt(d.nominalReturn.denominator),BigInt(d.nominalReturn.numerator)*1000000n);
   const counts=new Map();let total=0n;for(let ticket=0;ticket<100;ticket++){const r=startInstant(d,{betMinor:min,rng:()=>ticket});counts.set(r.outcome.sector,(counts.get(r.outcome.sector)??0)+1);total+=BigInt(r.winMinor);}
   for(const s of d.sectors)assert.equal(counts.get(s.id),s.weight);assert.ok(total*10000n<=ideal*BigInt(min));
   round=startInstant(d,{betMinor:max,rng:()=>99});assert.equal(BigInt(round.winMinor),cap);
  }else if(d.family==='plinko'){
   const paths=2**d.rows;let ideal=0n;for(let k=0;k<=d.rows;k++)ideal+=choose(d.rows,k)*BigInt(d.bucketMultipliersBps[k]);assert.equal(ideal*BigInt(d.nominalReturn.denominator),BigInt(d.nominalReturn.numerator)*BigInt(paths)*10000n);
   const counts=Array(d.rows+1).fill(0);let total=0n;for(let bits=0;bits<paths;bits++){let i=0;const r=startInstant(d,{betMinor:min,rng:()=>bits>>i++&1});counts[r.outcome.bucket]++;total+=BigInt(r.winMinor);}
   for(let k=0;k<=d.rows;k++)assert.equal(BigInt(counts[k]),choose(d.rows,k));assert.ok(total*10000n<=ideal*BigInt(min));
   round=startInstant(d,{betMinor:max,rng:()=>0});assert.equal(BigInt(round.winMinor),cap);
  }else if(d.family==='dice'){
   for(const target of [10,25,50,75,90]){let wins=0,total=0n;for(let roll=0;roll<100;roll++){const r=startInstant(d,{betMinor:min,rng:()=>roll,options:{target}});if(r.outcome.success)wins++;total+=BigInt(r.winMinor);}assert.equal(wins,target);assert.ok(total*10000n<=100n*BigInt(min)*BigInt(d.returnBps));}
   round=startInstant(d,{betMinor:max,rng:()=>0,options:{target:10}});assert.equal(BigInt(round.winMinor),cap);
   assert.throws(()=>startInstant(d,{betMinor:min,rng:()=>0,options:{target:9}}),{code:'INVALID_TARGET'});
  }else assert.fail('Unknown family '+d.family);
  assert.doesNotThrow(()=>JSON.stringify(round));
 });
}
