import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineMarkup,machineGeometry,animateRound} from '../client/machine74-renderer.mjs';
import {gatesPublicFrames,gatesStakePreview} from '../client/gates74-presentation.mjs';
import {bookPublicFrames} from '../client/book74-presentation.mjs';
import {finiteDraws} from './support/gates-merlyn-fixtures.mjs';
import {genieBonusFeatureFixture,genieCarpetFixture} from './support/genies-bonanza-fixtures.mjs';
import {bookBonusFeatureFixture} from './support/book-bonanza-fixtures.mjs';
const fixture=(name,recipe)=>{const id='ind74_official_'+name,{draws,...input}=recipe,full=math.getGameDefinition(id);return{definition:publicLibrary74Definition(full),round:math.publicRound(math.startRound({gameId:id,...input,rng:finiteDraws(draws),now:1700000000000}))};};
const count=(markup,pattern)=>[...markup.matchAll(pattern)].length;

test('Genie uses a6×5 count-anywhere board and its own supplied feature costs',()=>{
 const{definition,round}=fixture('geniesbonanza',genieBonusFeatureFixture());
 assert.deepEqual(machineGeometry(definition),{rows:5,columns:6});
 assert.equal(count(machineMarkup(definition),/data-tumble-cell="/g),30);
 assert.doesNotMatch(machineMarkup(definition),/m74-reel-window|undefined|MAGIC/);
 assert.equal(gatesStakePreview(definition,'100.00','buy100').baseBetMinor,'100');
 assert.throws(()=>gatesStakePreview(definition,'3.00','ante'));
 assert.equal(round.outcome.freeSpinsPlayed,15);assert.equal(round.winMinor,'700');
});

test('Genie reads each confirmed sequence factor without accumulating the previous free spin',()=>{
 const{definition,round}=fixture('geniesbonanza',genieBonusFeatureFixture()),frames=gatesPublicFrames(definition,round),before=JSON.stringify(round);
 for(const [spinIndex,factor]of [[1,2],[2,3],[3,100],[4,1]]){
  const entry=frames.find(item=>item.spinIndex===spinIndex);
  assert.match(machineMarkup(definition,round,{tumbleFrameIndex:entry.index}),new RegExp('SPIN FACTOR '+factor+'×'));
 }
 assert.equal(JSON.stringify(round),before);assert.match(machineMarkup(definition,round),/7\.00/);
});

test('Genie cloud changes use exactly the four public carpet positions and reject invented cells',()=>{
 const{definition,round}=fixture('geniesbonanza',genieCarpetFixture()),entries=gatesPublicFrames(definition,round),entry=entries.find(item=>item.spin.carpet);
 assert.equal(entry.spin.carpet.cloudCount,4);
 const markup=machineMarkup(definition,round,{tumbleFrameIndex:entry.index});
 assert.equal(count(markup,/is-carpet-change/g),4);assert.match(markup,/CARPET · 4 CLOUDS/);
 const bad=structuredClone(round);bad.outcome.spins[entry.spinIndex].carpet.positions[0].row=50;
 assert.throws(()=>machineMarkup(definition,bad),/carpet|Carpet|Gates/);
});

test('Book renders6×4 geometry, twenty supplied free spins and only confirmed expansion cells',()=>{
 const{definition,round}=fixture('bookofbonanza',bookBonusFeatureFixture()),before=JSON.stringify(round),frames=bookPublicFrames(definition,round);
 assert.deepEqual(machineGeometry(definition),{rows:4,columns:6});assert.equal(frames.length,20);
 const expanded=frames.find(frame=>frame.expandedColumns.length),index=frames.indexOf(expanded);
 assert.deepEqual(expanded.expandedColumns,[0,2,4]);
 const beforeExpansion=machineMarkup(definition,round,{bonusFrameIndex:index,bookExpanded:false});
 assert.equal(count(beforeExpansion,/data-book-expanded="true"/g),0);
 const after=machineMarkup(definition,round,{bonusFrameIndex:index});
 assert.equal(count(after,/data-book-expanded="true"/g),expanded.expandedPositions.length);
 assert.match(after,/EXPANDING SYMBOL/);assert.match(after,/FREE SPIN 2 \/ 20/);
 assert.equal(count(after,/data-locked="true"/g),0);assert.equal(JSON.stringify(round),before);
 assert.match(machineMarkup(definition,round),/0 LEFT/);
 assert.match(machineMarkup(definition,round),/1,560\.00/);
});

test('Book displays all forty confirmed winning lines and the observed Chinese symbol categories',()=>{
 const id='ind74_official_bookofbonanza',full=math.getGameDefinition(id),definition=publicLibrary74Definition(full);
 const betMinor=bookBonusFeatureFixture().betMinor;
 const win=math.publicRound(math.startRound({gameId:id,betMinor,rng:()=>0,now:1700000000000}));
 assert.equal(win.outcome.baseLineWins.length,40);
 const markup=machineMarkup(definition,win);
 assert.equal(count(markup,/<polyline class="m74-payline /g),40);
 assert.match(markup,/40 LINES/);assert.match(markup,/m74-book-roof/);
 let cursor=0;
 const regularTickets=full.symbols.length*full.wildRule.regularSymbolWeight;
 const allSymbols=math.publicRound(math.startRound({gameId:id,betMinor,now:1700000000000,rng:bound=>{
  assert.equal(bound,regularTickets+full.wildRule.wildWeight);
  const index=cursor++%(full.symbols.length+1);return index===full.symbols.length?regularTickets:index;
 }}));
 const categories=machineMarkup(definition,allSymbols);
 for(const symbol of [...definition.symbols,definition.bookSymbol])assert.match(categories,new RegExp('data-book-art="'+symbol.id.replace('bookofbonanza-','')+'"'));
 assert.doesNotMatch(categories,/data-book-art="(?:sapphire|emerald|scarab|pharaoh)"/);
});

test('Book rejects changed final boards and inconsistent expansion labels before display',()=>{
 const{definition,round}=fixture('bookofbonanza',bookBonusFeatureFixture());
 for(const change of [r=>r.outcome.bonusFrames[1].expandedPositions[0].row=40,r=>r.outcome.bonusFrames[1].selectedSymbolId='invented',r=>r.outcome.grid[0][0]='invented']){
  const bad=structuredClone(round);change(bad);assert.throws(()=>machineMarkup(definition,bad),/Book|server reel grid/);
 }
});

class Stage{constructor(){this.innerHTML='';this.classes=new Set();this.style={setProperty(){}};this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}replaceChildren(){}querySelector(){return null;}querySelectorAll(){return [];}addEventListener(){}removeEventListener(){}}
for(const[name,recipe]of [['geniesbonanza',genieBonusFeatureFixture],['bookofbonanza',bookBonusFeatureFixture]])test(name+' STOP reveals the immutable complete receipt and never submits another action',async()=>{
 const{definition,round}=fixture(name,recipe()),before=JSON.stringify(round),stage=new Stage(),actions=[];
 const animation=animateRound(stage,definition,null,round,{onAction:action=>actions.push(action)});
 animation.stop();animation.stop();await animation.promise;
 assert.equal(stage.innerHTML,machineMarkup(definition,round,{disabled:true}));assert.equal(JSON.stringify(round),before);assert.deepEqual(actions,[]);assert.equal(stage.classes.has('m74-animating'),false);
});
