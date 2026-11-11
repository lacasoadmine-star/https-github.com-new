import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/requested72.mjs';
import {rouletteBps,sicboBps,kenoMultiplier,handTotal} from '../math/engines/table-games.mjs';

const definitions=math.listGameDefinitions();
test('latest scope contains 71 independent wager models and one non-wager lobby, excluding the two protected titles',()=>{
 assert.equal(definitions.length,72);assert.equal(definitions.filter(d=>d.family!=='lobby').length,71);
 assert.equal(new Set(definitions.map(d=>d.id)).size,72);
 assert.equal(math.getGameDefinition('ind74_multihot5'),null);assert.equal(math.getGameDefinition('ind74_foxyhot20'),null);
 assert.throws(()=>math.startRound({gameId:definitions.find(d=>d.family==='lobby').id,betMinor:'100'}));
});
for(const d of definitions.filter(d=>d.family!=='lobby'))test(d.catalogName+': 1–40000 ETB boundaries, serializable server outcomes and bounded exact payouts',()=>{
 for(const stake of ['100','200','4000000']){
  let round=math.startRound({gameId:d.id,betMinor:stake,rng:()=>0,now:100000});
  assert.equal(round.betMinor,stake);assert.equal(round.mathVersion,d.mathVersion);
  assert.doesNotThrow(()=>JSON.stringify(round));
  assert(BigInt(round.winMinor)<=BigInt(math.maximumPayoutMinor({gameId:d.id,betMinor:stake})));
  const view=math.publicRound(round,100000);assert.equal('private' in view,false);assert.equal('deck' in view,false);
  if(d.family==='slots')assert.equal(BigInt(round.winMinor),round.outcome.lineWins.reduce((sum,w)=>sum+BigInt(w.winMinor),0n));
 }
 for(const stake of ['0','99','101','4000001','1e2','NaN'])assert.throws(()=>math.startRound({gameId:d.id,betMinor:stake,rng:()=>0,now:100000}));
});
test('roulette total returns are 36/37 or 36/38 across the complete finite sample space',()=>{
 for(const pockets of [37,38])for(const choice of ['straight','red','black','odd','even','low','high','dozen1','dozen2','dozen3','column1','column2','column3']){
  let total=0;for(let pocket=0;pocket<pockets;pocket++)total+=rouletteBps(pockets,pocket,{choice,number:0});
  assert.equal(total,360000,`${pockets}/${choice}`);
 }
});
test('Sic Bo excludes all triples from Big/Small and has exactly 105 winning outcomes each',()=>{
 for(const choice of ['small','big']){let total=0;for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)total+=sicboBps([a,b,c],{choice});assert.equal(total,2100000);}
 assert.equal(sicboBps([1,1,1],{choice:'small'}),0);assert.equal(sicboBps([6,6,6],{choice:'big'}),0);
});
test('Keno prizes grow with distinct selection count and selected numbers cannot be duplicated',()=>{
 for(let n=1;n<=5;n++){assert(Number.isSafeInteger(kenoMultiplier(n)));if(n>1)assert(kenoMultiplier(n)>kenoMultiplier(n-1));}
 assert.throws(()=>math.startRound({gameId:'ind74_keno',betMinor:'100',options:{numbers:[1,1]},rng:()=>0}));
 const r=math.startRound({gameId:'ind74_keno',betMinor:'100',rng:()=>0});assert.equal(new Set(r.outcome.drawn).size,10);
});
test('Blackjack hides dealer hole/shoe, stands correctly and rejects a repeated terminal action',()=>{
 let r=math.startRound({gameId:'ind74_blackjack',betMinor:'100',rng:()=>0});
 assert.equal(r.status,'active');const view=math.publicRound(r);assert.equal(view.outcome.dealer[1],null);assert.equal(JSON.stringify(view).includes('deck'),false);
 r=math.collectRound(r,{},0,()=>0);assert.notEqual(r.status,'active');assert.throws(()=>math.collectRound(r));
 assert.equal(handTotal([0,13]),12);assert.equal(handTotal([0,9]),21);
});
test('Baccarat uses the third-card tableau and a finite eight-deck shoe',()=>{
 const r=math.startRound({gameId:'ind74_baccarat',betMinor:'100',rng:()=>0});
 assert.equal(r.outcome.player.length,3);assert.equal(r.outcome.banker.length,2);assert.equal(r.outcome.playerTotal,8);assert.equal(r.outcome.bankerTotal,7);
 assert.equal(new Set([...r.outcome.player,...r.outcome.banker]).size,5);assert.equal(r.winMinor,'200');
});
