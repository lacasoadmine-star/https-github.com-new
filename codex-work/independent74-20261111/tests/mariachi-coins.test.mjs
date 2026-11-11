import test from 'node:test';
import assert from 'node:assert/strict';
import {configureMariachiCoins,startMariachiCoins,validateMariachiRound,publicMariachiRound,maximumMariachiPayout,mariachiMaximumMultiplierBps,MARIACHI_COINS_ID} from '../math/mariachi-coins.mjs';
import {holdSlotWin,gambleSlotWin} from '../math/official72-mechanics.mjs';
import {independentPaylines} from '../math/official72-layouts.mjs';

const definition=()=>configureMariachiCoins({id:MARIACHI_COINS_ID,family:'slots',cols:5,rows:3,
 symbols:[{id:'a',label:'A',pays:{3:2,4:4,5:8}},{id:'b',label:'B',pays:{3:1,4:3,5:6}}],
 paylines:independentPaylines(5,3,5),limits:{minBetMinor:'100',maxBetMinor:'4000100',betStepMinor:'100',maxWinMinor:'999999999999999'},rules:[],provenance:{}});
function baseDraws(d,special={}){
 const list=[],regular=d.symbols.length*32;
 for(let row=0;row<3;row++)for(let col=0;col<5;col++){
  const value=special[row+':'+col];
  if(value==='wild')list.push(regular);
  else if(value==='male'||value==='female')list.push(regular+1);
  else if(typeof value==='number'){list.push(regular+1,value);}
  else list.push((row+col)%2);
 }
 return list;
}
function resolve(d,special,after=[],betMinor='100'){
 const queue=[...baseDraws(d,special),...after];let cursor=0;
 return startMariachiCoins(d,{betMinor,rng:bound=>queue[cursor++]??(bound===64?63:0)});
}
const trigger={'0:0':'male','0:1':0,'0:4':'female'};

test('Mariachi exposes exact public collector positions, coin awards and unverified purchase/RTP boundary',()=>{
 const d=definition();assert.equal(d.cols,5);assert.equal(d.rows,3);
 assert.deepEqual(d.mariachiFeature.baseCollectorColumns,[0,4]);assert.deepEqual(d.mariachiFeature.baseCoinColumns,[1,2,3]);
 assert.deepEqual(d.mariachiFeature.regularValues,[1,2,3,5,8,10,15]);assert.deepEqual(d.mariachiFeature.jackpotValues,{mini:25,major:50,mega:100,grand:1000});
 assert.equal(d.mariachiFeature.buyRespin.implemented,false);assert.equal(d.mariachiFeature.collectorTimingVerified,false);
 assert.equal(d.mariachiFeature.publishedRtp.appliesTo,'provider game only; not certified for this independent engine');
 let draws=0;assert.throws(()=>startMariachiCoins(d,{betMinor:'100',options:{mode:'buy20'},rng:()=>{draws++;return 0;}}),{code:'INVALID_OPTIONS'});assert.equal(draws,0);
});
test('both collectors and a middle coin trigger three respins; lone collectors do not trigger the feature',()=>{
 const d=definition(),r=resolve(d,trigger),v=publicMariachiRound(d,r);
 assert.equal(v.outcome.bonusTriggered,true);assert.equal(v.outcome.bonusFrames.length,3);
 assert.deepEqual(v.outcome.collectors.map(c=>c.collectedMinor),['100','100']);assert.equal(v.outcome.bonusAwardMinor,'300');
 assert.deepEqual(v.outcome.bonusFrames.map(f=>f.respinsRemaining),[2,1,0]);assert.equal(v.outcome.featureFinishedReason,'respins-exhausted');
 const single=resolve(d,{'0:0':'male','0:1':6});assert.equal(single.outcome.bonusTriggered,false);assert.equal(single.outcome.baseCollectorAwardMinor,'1500');
 assert.equal(publicMariachiRound(d,single).outcome.bonusFrames.length,0);
});
test('new collector sees same-frame coins once, locked values persist and the counter resets',()=>{
 const d=definition(),r=resolve(d,trigger,[0,6,12,...Array(10).fill(63)]),o=publicMariachiRound(d,r).outcome;
 assert.equal(o.bonusFrames.length,4);assert.deepEqual(o.bonusFrames.map(f=>f.respinsRemaining),[3,2,1,0]);
 assert.equal(o.bonusFrames[0].newCoins,1);assert.equal(o.bonusFrames[0].newCollectors,1);
 assert.deepEqual(o.bonusFrames[0].collectors.map(c=>c.collectedMinor),['100','100','1600']);
 assert.deepEqual(o.bonusFrames.at(-1).collectors,o.bonusFrames[0].collectors);
 assert.equal(o.bonusAwardMinor,'3400');
});
test('a full coin/collector board doubles its feature total and settles once',()=>{
 const d=definition(),r=resolve(d,trigger,Array.from({length:12},()=>[0,6]).flat()),o=publicMariachiRound(d,r).outcome;
 assert.equal(o.bonusFrames.length,1);assert.equal(o.bonusFrames[0].lockedCells,15);
 assert.equal(o.bonusFrames[0].multiplierApplied,2);assert.equal(o.bonusAwardMinor,'36600');
 assert.equal(o.featureFinishedReason,'full-board');assert.equal(o.settlement,'single-final-credit');
 assert.equal(BigInt(r.winMinor),BigInt(o.baseAwardMinor)+BigInt(o.bonusAwardMinor));
});
test('large jackpot boards pay the explicit2500x cap without extra stake or oversized persisted transcript',()=>{
 const d=definition(),r=resolve(d,trigger,Array(12).fill(11),'4000100'),o=publicMariachiRound(d,r).outcome;
 assert.equal(r.winMinor,String(4000100n*2500n));assert.equal(o.capReached,true);assert.equal(o.featureFinishedReason,'maximum-award');
 assert.equal(o.bonusFrames.length,1);assert.equal(o.bonusFrames[0].terminal,true);
 assert.equal(maximumMariachiPayout(d,'4000100'),r.winMinor);assert.equal(mariachiMaximumMultiplierBps(d),200000000);
 assert(Buffer.byteLength(JSON.stringify(r))<128*1024);assert.equal(r.outcome.bonusFrames,undefined);
 assert.equal(JSON.stringify(o).includes('"private"'),false);assert.equal(JSON.stringify(o).includes('"draws"'),false);
});
test('participating wilds expand only their winning reels and preserve landed-board triggers',()=>{
 const d=definition();const plan=baseDraws(d,{'0:1':'wild'});plan[0]=0;plan[2]=0;plan[3]=0;plan[4]=0;
 let cursor=0;const r=startMariachiCoins(d,{betMinor:'100',rng:()=>plan[cursor++]??0});
 assert(r.outcome.expandedColumns.includes(1));assert(r.outcome.grid.every(row=>row[1]===d.wildSymbol.id));
 validateMariachiRound(d,r);
});
test('X2 is backed by the resolved award and replay validation preserves three exact doublings',()=>{
 const d=definition();let r=holdSlotWin(d,resolve(d,trigger),true);const initial=BigInt(r.baseWinMinor);
 for(let i=0;i<3;i++){validateMariachiRound(d,r);r=gambleSlotWin(d,r,{color:'red'},()=>0);}
 validateMariachiRound(d,r);assert.equal(r.status,'collected');assert.equal(BigInt(r.winMinor),initial*8n);
 assert(BigInt(r.winMinor)<=BigInt(maximumMariachiPayout(d,r.betMinor,{holdWin:true})));
 assert.equal(publicMariachiRound(d,r).outcome.bonusAwardMinor,'300');
});
test('five seeded successive accepted results remain reproducible and reject altered public awards or draws',()=>{
 const d=definition();let seed=1;const rng=bound=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%bound;};
 for(let spin=1;spin<=5;spin++){
  const r=startMariachiCoins(d,{betMinor:String(spin*100),rng});validateMariachiRound(d,r);
  assert(BigInt(r.winMinor)<=BigInt(maximumMariachiPayout(d,r.betMinor)));
  const reordered=JSON.parse(JSON.stringify(r,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).reverse()):v));validateMariachiRound(d,reordered);
  const altered=structuredClone(r);altered.outcome.initialCoinCount++;
  assert.throws(()=>validateMariachiRound(d,altered),{code:'INVALID_ROUND'});
  const changed=structuredClone(r);changed.private.draws.push(0);assert.throws(()=>validateMariachiRound(d,changed),{code:'INVALID_ROUND'});
 }
});
