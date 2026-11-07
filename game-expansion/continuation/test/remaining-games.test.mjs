import test from 'node:test';
import assert from 'node:assert/strict';
import production,{createIsolatedDraftAdapter,remainingPublicConfigs,unresolvedDrafts,towerXDistribution,towerFrozenValue,minesPayout,mineChoices,mineBoostActive,mineSafeProbability,sampleRawSlot,evaluateDraftGrid} from '../models/remaining-games.mjs';
import {bookPaylinePaths,vegasPaylinePaths,vegasVisibleReels,coin94MultipliersHundredths} from '../models/remaining-reference-data.mjs';

const games=createIsolatedDraftAdapter(),NOW=1700000000000;
function generator(seed=0x12345678){let value=seed>>>0;return()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return(value>>>0)/4294967296;};}
const sequence=(values,fallback=()=>0)=>{let i=0;return()=>i<values.length?values[i++]:fallback();};
const start=(id,stake='100',rng=generator(),options={})=>games.start(id,{stakeMinor:stake,...options},rng,NOW);
const checked=result=>{
 assert.match(result.debitMinor,/^(0|[1-9]\d*)$/);assert.match(result.maxPayoutMinor,/^(0|[1-9]\d*)$/);
 assert(BigInt(result.maxPayoutMinor)<=1000000n);assert.equal(result.state.status==='settled',result.payoutMinor!==null);
 if(result.payoutMinor!==null){assert.equal(result.state.payoutMinor,result.payoutMinor);assert(BigInt(result.payoutMinor)<=BigInt(result.maxPayoutMinor));}
 assert(Buffer.byteLength(JSON.stringify(result.state))<100*1024);
};

test('production has no unfinished games; explicit isolated factory exposes only ten known drafts',()=>{
 assert.deepEqual(Object.keys(production.definitions),[]);assert.equal(Object.keys(games.definitions).length,10);
 assert(remainingPublicConfigs.every(config=>config.launchable===false&&config.releaseReady===false));
 assert.equal(new Set(Object.values(games.definitions).map(game=>game.version)).size,10);
 for(const id of Object.keys(games.definitions))assert.throws(()=>production.start(id,{stakeMinor:'100'},generator(),NOW),/GAME_REFERENCE_UNRESOLVED/);
 assert.deepEqual(unresolvedDrafts.map(config=>config.id).sort(),['assassins_native','darkhorus_native']);
 for(const id of ['assassins_native','darkhorus_native','not_a_game'])assert.throws(()=>start(id),/GAME_REFERENCE_UNRESOLVED/);
});

test('strict monetary and option validation prevents client payout/RNG injection',()=>{
 for(const bad of [100,'1e2','100.00','0100','-100','0','9','10001',null])assert.throws(()=>start('bookofmagic_native',bad));
 assert.throws(()=>start('bookofmagic_native','100',generator(),{payoutMinor:'500000'}),/INVALID_GAME_OPTIONS/);
 for(const bad of [-1,1,NaN,Infinity])assert.throws(()=>start('bookofmagic_native','100',()=>bad),/INVALID_ENGINE_RANDOM/);
 for(const stake of ['10','10000'])checked(start('bookofmagic_native',stake));
});

test('every isolated draft replays deterministically with bounded integer liabilities and state size',()=>{
 for(const id of Object.keys(games.definitions)){
  assert.deepEqual(start(id,'100',generator(928381)),start(id,'100',generator(928381)));
  for(const stake of ['10','10000'])for(let seed=1;seed<=20;seed++)checked(start(id,stake,generator(seed*379)));
  for(const rng of [()=>0,()=>0.999999])checked(start(id,'10000',rng));
 }
});

test('reserve bounds depend on wager/options, never on sampled success or payout',()=>{
 for(const id of Object.keys(games.definitions)){
  const one=start(id,'100',()=>0),two=start(id,'100',()=>0.999999);
  assert.equal(one.maxPayoutMinor,two.maxPayoutMinor,id);checked(one);checked(two);
 }
});

test('verified Book20 and Vegas25 line geometry is used with the correct public Vegas line table',()=>{
 assert.equal(bookPaylinePaths.length,20);assert.equal(vegasPaylinePaths.length,25);
 const vegas=Array.from({length:5},(_,c)=>['vegas'+(4+c%5),'vegas3','vegas'+(5+c%4)]);
 const wins=evaluateDraftGrid('vegasnights_native',vegas).wins;
 const middle=wins.find(win=>win.line===0);assert.equal(middle.count,5);assert.equal(middle.points,150*10000/25);
 assert.equal(middle.symbol,'vegas3');
 vegas[4][1]='gold';assert.equal(evaluateDraftGrid('vegasnights_native',vegas).wins.find(win=>win.line===0).points,60000);
 const factors={'1:1':2,'4:1':3};vegas[1][1]='wild';
 assert.equal(evaluateDraftGrid('vegasnights_native',vegas,{wildMultipliers:factors}).wins.find(win=>win.line===0).points,360000);
});

test('Book substituting wild doubles once; its free-spin multiplier is3 and retriggers add15',()=>{
 const board=Array.from({length:5},(_,c)=>[['a','k','q','j','ten'][c],'wizard',['ten','j','q','k','a'][c]]);
 const plain=evaluateDraftGrid('bookofmagic_native',board).wins.find(win=>win.line===0).points;
 board[1][1]='wild';board[2][1]='wild';
 assert.equal(evaluateDraftGrid('bookofmagic_native',board).wins.find(win=>win.line===0).points,plain*2);
 assert.equal(evaluateDraftGrid('bookofmagic_native',board,{free:true}).wins.find(win=>win.line===0).points,plain*6);
 const scatterGrid=[0.99999,0.1,0.2,0.99999,0.3,0.4,0.99999,0.5,0.6,0.1,0.2,0.3,0.4,0.5,0.6];
 const bonus=start('bookofmagic_native','100',sequence([...scatterGrid,...scatterGrid],()=>0));checked(bonus);
 assert.equal(bonus.state.bonusSpins,30);assert.equal(bonus.state.frames[1].multiplier,3);assert(bonus.state.capped);
});

test('Vegas golden centre adds exactly3 extra-wild respins; scatters award5FS, not10',()=>{
 const lengths=vegasVisibleReels.reel_set0.map(reel=>reel.length);
 const gold=sampleRawSlot('vegasnights_native',sequence([0,0,0,0,23.1/lengths[4]],generator(77)));
 assert.equal(gold.frames[0].grid[4][1],'gold');assert.equal(gold.frames.filter(frame=>frame.kind==='extra-wild-respin').length,3);
 const bonus=sampleRawSlot('vegasnights_native',sequence([0,3.1/lengths[1],6.1/lengths[2],1.1/lengths[3],0],generator(83)));
 assert.equal(bonus.frames[0].wins.find(win=>win.symbol==='scatter').points,20000);
 assert.equal(bonus.bonusSpins,5);
 const extra=gold.frames.find(frame=>frame.kind==='extra-wild-respin');assert(extra.grid.slice(1).flat().includes('royal-wild'));
});

test('ways bonuses retain15/20/25 awards and stop resolution only at an explicit payout cap',()=>{
 for(const id of ['moonstone_native','samurai_native']){
  const result=start(id,'100',()=>0.999999);checked(result);assert.equal(result.state.bonusSpins,25);assert.equal(result.state.freeSpinsRemaining,0);
  const win=start(id,'100',()=>0);assert(win.state.capped);assert.equal(win.payoutMinor,'10000');
 }
});

test('Legends pay-anywhere wild substitution excludes all-wild-only results',()=>{
 for(const id of ['egyptianlegends_native','olympianlegends_native']){
  assert.equal(evaluateDraftGrid(id,Array.from({length:6},()=>Array(5).fill('wild'))).wins.length,0);
  const symbol=id==='egyptianlegends_native'?'ankh':'majorYellow';
  const grid=Array.from({length:6},()=>Array(5).fill('scatter'));grid[0]=Array(5).fill(symbol);grid[1]=['wild','wild','wild','scatter','scatter'];
  const wins=evaluateDraftGrid(id,grid).wins;assert.equal(wins.length,1);assert.equal(wins[0].count,8);
 }
});

test('Legends queue powers from crashed-symbol progress, with game-specific god order',()=>{
 const colors=[0.02,0.10,0.20,0.30,0.43,0.58,0.73,0.91];
 for(const[id,gods]of [['egyptianlegends_native',['Bastet','Sobek','Isis','Anubis','Horus']],['olympianlegends_native',['Poseidon','Hecate','Atlas','Hephaestus','Zeus']]]){
  let at=0;const rng=sequence(Array(150).fill(0),()=>colors[(at++)%colors.length]);
  const result=sampleRawSlot(id,rng,{record:true,maxRawPoints:100000000});
  assert(result.progress>=110);assert.deepEqual(result.featureEvents.slice(0,5).map(event=>event.god),gods);
  const firstFeature=result.frames.findIndex(frame=>frame.kind==='mythic-feature');
  assert(firstFeature>0);assert.equal(result.frames[firstFeature-1].wins.length,0);
  if(id==='egyptianlegends_native'){
   const horus=result.frames.find(frame=>frame.god==='Horus'&&frame.wins.length);
   assert(horus.multiplier>1);
   assert.equal(horus.points,evaluateDraftGrid(id,horus.grid).totalPoints*horus.multiplier);
  }
 }
});

test('Egyptian verified3/5/100 scatter awards apply only within the bonus, with exact retriggers',()=>{
 const colors=[0.02,0.10,0.20,0.30,0.43,0.58,0.73,0.91];
 for(const[count,prize,retrigger]of [[4,3,3],[5,5,5],[6,100,10]]){
  let n=0;const board=Array.from({length:30},(_,i)=>i%5===0&&Math.floor(i/5)<count?0.99999:colors[n++%colors.length]);
  let fallbackIndex=0;
  const raw=sampleRawSlot('egyptianlegends_native',sequence([...board,...board],()=>colors[fallbackIndex++%colors.length]),{maxRawPoints:100000000});
  assert.equal(raw.frames[0].kind,'base');assert.equal(raw.frames[0].points,0);
  assert.equal(raw.frames[1].kind,'free-spin');
  assert.equal(raw.frames[2].kind,'scatter-award');assert.equal(raw.frames[2].points,prize*10000);
  assert.equal(raw.bonusSpins,10+retrigger);
 }
});

test('frame accounting is atomic and final displayed wins match the final grid after omitted frames',()=>{
 for(const id of Object.keys(games.definitions).filter(id=>!['coinminer_native','towerrush_native','towerx_native'].includes(id))){
  for(const rng of [()=>0,()=>0.999999,generator(72912)]){
   const result=start(id,'10000',rng),state=result.state;
   assert.equal(state.frames.reduce((sum,frame)=>sum+BigInt(frame.payoutMinor),0n)+BigInt(state.omittedPayoutMinor),BigInt(result.payoutMinor));
   for(const frame of state.frames)assert.equal(frame.wins.reduce((sum,win)=>sum+BigInt(win.payoutMinor),0n),BigInt(frame.payoutMinor));
   assert.deepEqual(state.grid,state.finalFrame.grid);assert.deepEqual(state.wins,state.finalFrame.wins);checked(result);
  }
 }
});

test('TowerX exact independent expectation is97% with public cost/ranges and no active cashout',()=>{
 let previous=0,weighted=0;
 for(const outcome of towerXDistribution){weighted+=(outcome.threshold-previous)*outcome.sum;previous=outcome.threshold;}
 assert.equal(previous,1000000);assert.equal(weighted,97000000);
 const maximum=start('towerx_native','10000',()=>0.999999);checked(maximum);assert.equal(maximum.payoutMinor,'500000');assert.equal(maximum.state.totalBuildingMultiplier,5000);
 const ranges={suburb:[1,5],city:[6,10],green:[15,40],elite:[50,90],neon:[100,1000]};
 for(let seed=1;seed<=100;seed++){
  const state=start('towerx_native','100',generator(seed*1234)).state;assert.equal(state.floors.reduce((sum,floor)=>sum+floor.multiplier,0),state.totalBuildingMultiplier);
  for(const floor of state.floors){const[min,max]=ranges[floor.type];assert(floor.multiplier>=min&&floor.multiplier<=max);}
  assert.deepEqual(state.actions,[]);
 }
});

test('TowerRush full frozen bank is protected and its continuation option is priced before award',()=>{
 assert.equal(towerFrozenValue(125,125),163.75);
 const initial=start('towerrush_native').state,threshold=97/163.75;
 const frozen=games.act(initial,{type:'step'},sequence([0.89,threshold-1e-9]),NOW+1);checked(frozen);
 assert.equal(frozen.state.lockedPayoutMinor,'125');assert(frozen.state.frozen);
 const rejected=games.act(initial,{type:'step'},sequence([0.89,threshold]),NOW+1);assert.equal(rejected.payoutMinor,'0');
 const collapse=games.act(frozen.state,{type:'step'},()=>0.9,NOW+2);assert.equal(collapse.payoutMinor,'125');
 const next=games.act(frozen.state,{type:'step'},()=>0,NOW+2);assert.equal(next.state.currentCashoutMinor,'187');assert.equal(next.state.floors.at(-1).type,'normal');
 assert.equal(next.state.lockedPayoutMinor,'125');
});

test('TowerRush Temple has the verified freeze section and Triple adds3 guaranteed extra floors',()=>{
 const initial=start('towerrush_native').state;
 const temple=games.act(initial,{type:'step'},sequence([0.94,0.9999,0]),NOW+1);checked(temple);assert(temple.state.frozen);assert.equal(temple.state.floors[0].wheelSection,'freeze');
 const triple=games.act(initial,{type:'step'},sequence([0.98,0]),NOW+1);checked(triple);
 assert.equal(triple.state.floors.length,4);assert.equal(triple.state.level,4);assert.equal(triple.state.currentCashoutMinor,'243');
 assert(triple.state.floors.slice(1).every(floor=>floor.type==='triple-additional'&&floor.multiplier>=1));
 const normal=games.act(initial,{type:'step'},sequence([0.1,0.775999]),NOW+1);assert.equal(normal.state.currentCashoutMinor,'125');
 const loss=games.act(initial,{type:'step'},sequence([0.1,0.776]),NOW+1);assert.equal(loss.payoutMinor,'0');
});

test('Coin Miner uses only verified discrete choices and the current official94-variant coefficients',()=>{
 assert.deepEqual(mineChoices,[1,2,3,5,7,10,17,20,24]);
 assert.equal(minesPayout(100n,1,24),2350n);assert.equal(minesPayout(100n,24,1),2350n);assert.equal(minesPayout(100n,7,18),97229n);
 for(const mines of [0,4,6,25,'3',1.5])assert.throws(()=>start('coinminer_native','100',generator(),{mines}),/INVALID_MINE_COUNT/);
 for(const mines of mineChoices)assert.deepEqual(remainingPublicConfigs.find(config=>config.id==='coinminer_native').controls.mines.values,mineChoices);
});

test('Coin outcomes are per-pick, no hidden board; real rescue outcomes and duplicate prevention are exposed',()=>{
 const initial=start('coinminer_native','100',generator(),{mines:10}).state;
 assert.equal(initial.boardPredetermined,false);assert(!Object.keys(initial).some(key=>key.startsWith('_')));
 const rescued=games.act(initial,{type:'pick',index:4},()=>0.62,NOW+1);checked(rescued);assert.equal(rescued.state.picks[0].treasureBoost,true);assert.equal(rescued.state.currentCashoutMinor,'146');
 assert.equal(rescued.state.treasureBoost.rescuedPicks,1);assert.throws(()=>games.act(rescued.state,{type:'pick',index:4},()=>0,NOW+2),/TILE_ALREADY_REVEALED/);
 assert.equal(games.act(initial,{type:'pick',index:4},()=>0.99,NOW+1).payoutMinor,'0');
 for(const index of [-1,25,'1',0.2])assert.throws(()=>games.act(initial,{type:'pick',index},()=>0,NOW+1),/INVALID_MINE_PICK/);
 const view=games.publicState(rescued.state,NOW+2);assert(!('revealedMines'in view));assert.deepEqual(view.picks,rescued.state.picks);
});

test('Coin boost thresholds and complete finite stopping-return table stay at or below94.40% before caps',()=>{
 assert(!mineBoostActive(3,17));assert(mineBoostActive(3,18));assert(!mineBoostActive(5,0));assert(mineBoostActive(5,1));
 for(const mines of [7,10,17,20])assert(mineBoostActive(mines,0));
 for(const mines of [1,2,24])assert(!mineBoostActive(mines,0));
 let maximum=0;
 for(const mines of mineChoices){
  let survival=1;
  const table=coin94MultipliersHundredths[String(mines)];
  for(let opened=0;opened<table.length;opened++){
   const odds=mineSafeProbability(mines,opened);assert(odds.probability>=odds.baseline&&odds.probability<=1);survival*=odds.probability;
   const expected=survival*table[opened]/100;assert(expected<=0.94400000001);assert(expected>=0.93);maximum=Math.max(maximum,expected);
   if(odds.boostActive)assert(expected>=0.94-1e-10);
  }
 }
 assert(Math.abs(maximum-0.944)<1e-10);
});

test('active timeout pays earned cashout or unused-stake refund with no second debit',()=>{
 for(const id of ['coinminer_native','towerrush_native']){
  const initial=start(id).state,expired=games.expire(initial,generator(),NOW+1800001);checked(expired);assert.equal(expired.payoutMinor,'100');assert.equal(expired.debitMinor,'0');
  const input=id==='coinminer_native'?{type:'pick',index:0}:{type:'step'};
  const earned=games.act(initial,input,()=>0,NOW+1).state,settled=games.expire(earned,generator(),NOW+1800001);assert.equal(settled.payoutMinor,earned.currentCashoutMinor);assert.equal(settled.debitMinor,'0');
  assert.equal(games.act(initial,{type:'cashout'},generator(),NOW+1800001).payoutMinor,'100');
  assert.throws(()=>games.act(initial,{type:'cashout',payoutMinor:'1000000'},generator(),NOW+1),/INVALID_GAME_ACTION/);
 }
});
