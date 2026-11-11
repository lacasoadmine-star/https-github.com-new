import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineMarkup,machineGeometry,animateRound,minorText} from '../client/machine74-renderer.mjs';
import {junglePublicFrames} from '../client/jungle74-presentation.mjs';
import {gamblePresentation,canStartRound} from '../client/machine74-controls.mjs';
import {hasPaidFeatureModes} from '../client/paid74-feature.mjs';
import {finiteDraws} from './support/gates-merlyn-fixtures.mjs';
import {jungleFeatureFixture} from './support/jungle-sisters-fixtures.mjs';

function fixture({deluxe=false,maximum=false,holdWin=false}={}){
  const recipe=jungleFeatureFixture({deluxe,maximum}),{draws,...input}=recipe;
  const full=math.getGameDefinition(input.gameId),definition=publicLibrary74Definition(full),rng=finiteDraws(draws);
  const stored=math.startRound({...input,options:{holdWin},rng,now:1700000000000});
  assert.equal(rng.remaining(),0);
  return {definition,stored,round:math.publicRound(stored)};
}
const count=(markup,pattern)=>[...markup.matchAll(pattern)].length;

for(const deluxe of [false,true])test('Jungle '+(deluxe?'Deluxe':'standard')+' renders ten confirmed free spins with its own public pool',()=>{
  const {definition,round}=fixture({deluxe}),before=JSON.stringify(round);
  assert.deepEqual(machineGeometry(definition),{rows:3,columns:5});
  assert.equal(definition.jungleFeature.ticketWeights,undefined);
  assert.equal(hasPaidFeatureModes(definition),false,'Unverified purchase controls must remain unavailable.');
  assert.equal(junglePublicFrames(definition,round).length,10);
  assert.equal(count(machineMarkup(definition),/class="m74-symbol(?: is-winning)?"/g),15);
  const pool=round.outcome.selectedBonusMultipliers;
  assert.deepEqual(pool,deluxe?[1,2,3,4,5]:[1,2,3,4,5,10,20]);
  for(const [index,frame]of round.outcome.bonusFrames.entries()){
    const markup=machineMarkup(definition,round,{bonusFrameIndex:index});
    assert.match(markup,new RegExp('data-jungle-frame="'+frame.index+'"'));
    assert.match(markup,new RegExp('data-jungle-multiplier="'+frame.spinMultiplier+'" class="is-selected"'));
    assert.equal(count(markup,/data-jungle-multiplier="/g),pool.length);
    assert.equal(count(markup,/data-jungle-multiplier="\d+" class="is-selected"/g),1);
    assert.doesNotMatch(markup,/data-locked=|m74-multiplier-reel/,'Free spins do not borrow a respin lock or the base factor reel.');
    assert.match(markup,new RegExp('THIS SPIN <b>'+minorText(frame.awardMinor).replace(/[.,]/g,'\\$&')+'</b>'));
  }
  const final=machineMarkup(definition,round);
  assert.match(final,/FREE SPIN 10/);assert.match(final,/FEATURE COMPLETE/);
  assert.equal(JSON.stringify(round),before);
  assert.equal(machineMarkup(definition,{...round,private:{draws:['DO_NOT_DISPLAY'],nextFrame:'DO_NOT_DISPLAY'}}),final);
});

test('Jungle base replay shows only the base board, while standard bonus Scatter and20× are supplied by the server',()=>{
  const {definition,round}=fixture(),initial=machineMarkup(definition,round,{bonusFrameIndex:-1});
  assert.match(initial,/data-jungle-frame="0"/);assert.match(initial,/BASE WIN/);
  assert.doesNotMatch(initial,/data-jungle-multiplier="\d+" class="is-selected"/);
  const first=round.outcome.bonusFrames[0],markup=machineMarkup(definition,round,{bonusFrameIndex:0});
  assert.equal(first.scatterCount,7);assert.equal(first.spinMultiplier,20);assert.equal(first.freeSpinsRemaining,9);
  assert.match(markup,/SPIN FACTOR <b>20×/);assert.match(markup,/9 LEFT/);
  assert.match(markup,/SCATTER <b>1,200\.00/);
  assert.equal(count(markup,new RegExp('data-symbol="'+definition.scatterSymbol.id+'"','g')),7);
});

for(const deluxe of [false,true])test('Jungle '+(deluxe?'Deluxe':'standard')+' displays the server cap and nine cancelled spins without generating frames',()=>{
  const {definition,round}=fixture({deluxe,maximum:true});
  assert.equal(junglePublicFrames(definition,round).length,1);
  const markup=machineMarkup(definition,round);
  assert.match(markup,/FREE SPIN 1/);assert.match(markup,/MAXIMUM REACHED · 9 SPINS CANCELLED/);
  assert.ok(markup.includes(minorText(round.outcome.totalAwardMinor)));
  assert.equal(round.outcome.bonusFrames.length,1);
});

test('Jungle rejects altered pools, out-of-grid positions and mismatched final boards before rendering',()=>{
  const {definition,round}=fixture({deluxe:true});
  for(const change of [
    r=>r.outcome.selectedBonusMultipliers[1]=r.outcome.selectedBonusMultipliers[0],
    r=>r.outcome.bonusFrames[0].spinMultiplier=999,
    r=>r.outcome.bonusFrames[0].lineWins[0].positions[0].col=10,
    r=>r.outcome.bonusFrames[0].awardMinor='-1',
    r=>r.outcome.grid[0][0]=definition.symbols[7].id,
  ]){
    // JSON matches the wire receipt: its final board and last frame are
    // independent arrays even if the engine reuses an in-memory reference.
    const bad=JSON.parse(JSON.stringify(round));change(bad);assert.throws(()=>machineMarkup(definition,bad),/public Jungle/);
  }
});

test('Jungle held X2 is a fully resolved feature receipt and blocks another paid start',()=>{
  const {definition,round,stored}=fixture({holdWin:true}),before=JSON.stringify(round);
  assert.equal(round.status,'active');assert.equal(junglePublicFrames(definition,round).length,10);
  assert.equal(gamblePresentation(definition,round).canGamble,true);
  assert.equal(canStartRound({accepting:true,round}),false);
  assert.match(machineMarkup(definition,round),/WIN TO COLLECT/);
  assert.equal(JSON.stringify(round),before);
  const doubled=math.publicRound(math.advanceRound(stored,{color:'red'},1700000000001,()=>0));
  assert.match(machineMarkup(definition,doubled),/Revealed red card/);
  assert.deepEqual(doubled.outcome,round.outcome,'X2 changes the held award, not the completed free-spin transcript.');
  assert.throws(()=>machineMarkup(definition,{...round,pendingWinMinor:'0'}),/confirmed held win/);
});

class Stage{
  constructor(){this.innerHTML='';this.classes=new Set();this.style={setProperty(){}};this.classList={add:(...values)=>values.forEach(value=>this.classes.add(value)),remove:(...values)=>values.forEach(value=>this.classes.delete(value)),toggle:(value,on)=>on?this.classes.add(value):this.classes.delete(value)};}
  replaceChildren(){}querySelector(){return null;}querySelectorAll(){return [];}addEventListener(){}removeEventListener(){}
}
class ReplayStage extends Stage{
  constructor(){
    super();this.presentedFrames=[];
    const seen=this.presentedFrames;
    this.area={set innerHTML(value){const match=value.match(/data-jungle-frame="(\d+)"/);if(match)seen.push(Number(match[1]));},querySelectorAll(){return [];}};
  }
  querySelector(selector){return selector==='.m74-game-area'?this.area:null;}
}
for(const deluxe of [false,true])test('Jungle '+(deluxe?'Deluxe':'standard')+' ordinary replay visits every confirmed free-spin frame in order',async()=>{
  const {definition,round}=fixture({deluxe}),before=JSON.stringify(round),stage=new ReplayStage(),actions=[];
  await animateRound(stage,definition,null,round,{turbo:true,onAction:action=>actions.push(action)}).promise;
  assert.deepEqual(stage.presentedFrames,round.outcome.bonusFrames.map(frame=>frame.index));
  assert.equal(stage.innerHTML,machineMarkup(definition,round,{turbo:true,disabled:true}));
  assert.equal(JSON.stringify(round),before);assert.deepEqual(actions,[]);
});
test('Jungle X2 and collection retain the final free-spin board during the action animation',async()=>{
  const {definition,round,stored}=fixture({holdWin:true}),stage=new Stage(),actions=[];
  for(const action of ['gamble','collect']){
    const next=math.publicRound(action==='gamble'?math.advanceRound(stored,{color:'red'},1700000000001,()=>0):math.collectRound(stored));
    const animation=animateRound(stage,definition,round,next,{action,onAction:value=>actions.push(value)});
    assert.match(stage.innerHTML,/data-jungle-frame="10"/);
    assert.doesNotMatch(stage.innerHTML,/data-jungle-frame="0"/,'Settling a held award must not flash the base board again.');
    animation.stop();await animation.promise;
  }
  assert.deepEqual(actions,[]);
});
for(const deluxe of [false,true])test('Jungle '+(deluxe?'Deluxe':'standard')+' STOP finishes the public transcript once without a game action',async()=>{
  const {definition,round}=fixture({deluxe}),before=JSON.stringify(round),stage=new Stage(),actions=[];
  const animation=animateRound(stage,definition,null,round,{onAction:action=>actions.push(action)});
  animation.stop();animation.stop();await animation.promise;
  assert.equal(stage.innerHTML,machineMarkup(definition,round,{disabled:true}));
  assert.equal(JSON.stringify(round),before);assert.deepEqual(actions,[]);assert.equal(stage.classes.has('m74-animating'),false);
});
