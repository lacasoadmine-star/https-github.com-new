import test from 'node:test';
import assert from 'node:assert/strict';
import {games,gameFamilies} from './catalog.mjs';
import {makePreviewEngine} from './engine.mjs';
import {fixtureFor} from './fixtures.mjs';
const complete=e=>{for(let i=0;i<30&&e.state==='running';i++){if(e.family==='mines'){const j=e.round.hazards.findIndex((x,k)=>!x&&!e.revealed.includes(k));if(j>=0)e.reveal(j);else break;}else if(e.family==='path'){const choice=e.round.steps[e.progress].options.findIndex(x=>x===true);e.choose(choice<0?0:choice);}else e.tick(1000);}return e;};
test('catalogue 26 unique official pages, 10 distinct mechanical families, all money disabled',()=>{
 assert.equal(games.length,26);assert.equal(new Set(games.map(g=>g.id)).size,26);
 assert.equal(gameFamilies.length,10);
 for(const g of games){assert.match(g.officialPage,/^https:\/\/www\.smartsoftgaming\.com\/games\//);assert.equal(g.productionEnabled,false);assert.equal(g.walletEnabled,false);assert.equal(g.reference.insideDemo,'not-verified');}
});
for(const game of games){test(game.name+'—QA-only round, 20 independent actions/rounds, no duplicate IDs',()=>{
 const e=makePreviewEngine(game.id);
 for(let i=1;i<=20;i++){
  if(game.family==='hybrid')assert.equal(e.setMode(i%2?'slot':'crash'),true);
  const r=fixtureFor(game.id,i,e.mode);
  assert.equal(e.start(r),true);
  assert.equal(e.start(r),false,'in-flight round must not be replayed');
  assert.equal(e.snapshot().roundId,r.id);
  if(e.family==='slot'){assert.equal(e.stop(),true);assert.equal(e.stop(),false,'stop never starts another round');}
  complete(e);
  assert.ok(['lost','result','collected'].includes(e.state),e.state);
  assert.equal(e.used.size,i);
  assert.equal(e.history[0].id,r.id);
  assert.equal(e.start(r),false,'finished round cannot replay');
 }
 assert.equal(e.used.size,20);
 assert.equal(e.history.length,20);
});}
test('crash cashout is idempotent and lanes independent',()=>{
 const e=makePreviewEngine('jetx_new');const r=fixtureFor('jetx_new',1);
 assert.equal(e.start(r),true);e.tick(500);
 assert.equal(e.collect(0),true);assert.equal(e.collect(0),false);
 assert.equal(e.collected[1],null);
 assert.equal(e.collect(1),true);assert.equal(e.collect(2),true);assert.equal(e.collect(3),true);
 assert.equal(e.state,'collected');assert.equal(e.collect(0),false);
});
test('invalid fixture and financial result are rejected',()=>{
 const e=makePreviewEngine('mine_island');
 assert.throws(()=>e.start({id:'bad',gameId:'mine_island',source:'real-money',hazards:Array(25).fill(false)}),/Only no-money/);
 assert.throws(()=>e.start({id:'bad',gameId:'mine_island',source:'qa-fixture',hazards:[],multipliers:[]}),/Invalid mine/);
 assert.equal(e.used.size,0);
});
test('mines reject repeat, and cashout requires safe reveal',()=>{
 const e=makePreviewEngine('mine_island'),r=fixtureFor('mine_island',2);e.start(r);
 assert.equal(e.collect(),false);
 const safe=r.hazards.findIndex(x=>!x),unsafe=r.hazards.findIndex(x=>x);
 assert.equal(e.reveal(safe),true);assert.equal(e.reveal(safe),false);
 assert.equal(e.collect(),true);assert.equal(e.reveal(unsafe),false);
});
test('path rejects invalid choice and makes losing step terminal',()=>{
 const e=makePreviewEngine('chicken_ways'),r=fixtureFor('chicken_ways',1);e.start(r);
 assert.equal(e.choose(-1),false);
 let unsafe=false;
 for(const step of r.steps){
  const bad=step.options.findIndex(x=>!x);
  if(bad>=0){assert.equal(e.choose(bad),true);unsafe=true;break;}
  assert.equal(e.choose(0),true);
 }
 assert.equal(unsafe,true);assert.equal(e.state,'lost');assert.equal(e.collect(),false);
});
test('slot stop shortens animation, no second round or debit',()=>{
 const e=makePreviewEngine('samurai'),r=fixtureFor('samurai',10);e.start(r);e.tick(450);
 assert.equal(e.stop(),true);assert.equal(e.stopAt<r.durationMs,true);
 e.tick(500);assert.equal(e.state,'result');assert.equal(e.used.size,1);
 assert.equal(e.round.multiplier,r.multiplier);
});
test('Cai Balao cannot change mode during active round',()=>{
 const e=makePreviewEngine('cai_balao_cappadocia');e.setMode('crash');e.start(fixtureFor(e.game.id,1,e.mode));
 assert.equal(e.setMode('slot'),false);complete(e);assert.equal(e.setMode('slot'),true);
});
test('cascade validates grid geometry and reaches crash without cashout',()=>{
 const e=makePreviewEngine('popx');const f=fixtureFor('popx',1);
 assert.equal(f.frames[0].grid.length,5);assert.equal(f.frames[0].grid[0].length,6);
 e.start(f);e.tick(f.stepMs);assert.equal(e.collect(),true);assert.equal(e.state,'collected');
 const f2=fixtureFor('popx',2);e.start(f2);complete(e);assert.equal(e.state,'lost');
});
test('missing server result never creates a game round',()=>{
 const e=makePreviewEngine('balloonx');
 assert.equal(e.tick(200),false);assert.equal(e.collect(),false);assert.equal(e.used.size,0);
});