const test=require('node:test');
const assert=require('node:assert/strict');
const {catalogue,createEngine}=require('./engine.js');
const rng=()=>0.47;
test('26 unique supported game IDs and valid modes',()=>{
 assert.equal(catalogue.length,26);
 assert.equal(new Set(catalogue.map(x=>x.id)).size,26);
 assert.ok(catalogue.every(x=>['cascade','crash','mines','path','tower','slot','roulette','wheel','plinko'].includes(x.mode)));
});
for(const game of catalogue){
 test(game.name+' 20 deterministic no-money rounds and idempotent stop',()=>{
   const e=createEngine(game.id,rng);
   for(let i=1;i<=20;i++){
     assert.equal(e.start(),true);
     assert.equal(e.rounds,i);
     assert.equal(e.start(),false);
     const k=game.mode;
     if(['mines','path','tower'].includes(k)){
       const pick=k==='mines'?0:1;
       e.act('pick',pick);
       if(e.phase==='running')e.act('collect');
     } else if(['crash','cascade'].includes(k)){
       e.tick(250);e.act('collect');
     } else {
       e.tick(250);e.act('stop');assert.equal(e.rounds,i);
       for(let a=0;a<20&&e.phase==='running';a++) e.tick(250);
     }
     assert.equal(e.phase,'complete');
     assert.ok(['win','loss','complete'].includes(e.outcome));
     assert.equal(e.history[0].round,i);
     assert.ok(!('wallet' in e)&&!('balance' in e));
   }
   assert.equal(e.rounds,20);
   assert.equal(e.history.length,20);
 });
}
test('unplayable actions do not change round or fake a wager',()=>{
 const e=createEngine('mine-island',rng);
 assert.equal(e.act('collect'),false);
 assert.equal(e.act('pick',0),false);
 assert.equal(e.act('level',99),false);
 e.start();
 assert.equal(e.act('play'),false);
 assert.equal(e.act('stop'),false);
 assert.equal(e.rounds,1);
});