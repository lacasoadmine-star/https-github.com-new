import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {gatesMerlynStakeTerms} from '../math/gates-of-merlyn.mjs';
import {gatesMagicFixture,gatesBonusFeatureFixture,finiteDraws} from './support/gates-merlyn-fixtures.mjs';
import {gatesPublicFrames,gatesStakePreview,gatesModeTotal} from '../client/gates74-presentation.mjs';
import {machineMarkup,animateRound,machineGeometry} from '../client/machine74-renderer.mjs';
const id='ind74_official_gatesofmerlyn',full=math.getGameDefinition(id),definition=publicLibrary74Definition(full);
const fixture=recipe=>{const {draws,...input}=recipe;return math.publicRound(math.startRound({gameId:id,...input,rng:finiteDraws(draws),now:1700000000000}));};
const count=(markup,pattern)=>[...markup.matchAll(pattern)].length;

test('Gates public definition and presentation expose a6×5 count-anywhere board, without private draws or paylines',()=>{
  assert.equal(definition.slotMechanic,'tumble');assert.equal(definition.tumbleFeature.ticketWeights,undefined);
  assert.deepEqual(machineGeometry(definition),{rows:5,columns:6});
  const ready=machineMarkup(definition);
  assert.equal(count(ready,/data-tumble-cell="/g),30);assert.match(ready,/NO PAYLINES/);
  assert.doesNotMatch(ready,/m74-reel-window|m74-paylines|data-m74-cell|undefined/);
});

test('Gates mode costs show the complete one-time debit and agree with accepted server stake terms',()=>{
  for(const [mode,total]of [['base','1.00'],['ante','3.00'],['buy100','100.00'],['buy500','500.00']]){
    const preview=gatesStakePreview(definition,total,mode),terms=gatesMerlynStakeTerms(full,preview.totalBetMinor,{mode});
    assert.equal(preview.totalStake,total);assert.equal(preview.baseBetMinor,terms.baseBetMinor);assert.equal(preview.totalBetMinor,terms.totalBetMinor);
  }
  assert.equal(gatesModeTotal(definition,'1.00','base','ante'),'3.00');
  assert.equal(gatesModeTotal(definition,'3.00','ante','buy100'),'200.00');
  assert.equal(gatesModeTotal(definition,'500.00','buy500','base'),'1.00');
  for(const [total,mode]of [['1.50','ante'],['1.00','buy100'],['0.00','base'],['-1.00','base'],['1.00','unknown']])assert.throws(()=>gatesStakePreview(definition,total,mode));
});

test('MAGIC and tumble highlights use the completed supplied target, groups and multiplier labels',()=>{
  const round=fixture(gatesMagicFixture()),before=JSON.stringify(round),frames=gatesPublicFrames(definition,round);
  assert.equal(frames[0].frame.action,'magic');assert.equal(frames[1].frame.action,'tumble');
  const magic=machineMarkup(definition,round,{tumbleFrameIndex:0});
  assert.equal(count(magic,/is-magic-target/g),1);assert.equal(count(magic,/data-removing="true"/g),2);
  const match=machineMarkup(definition,round,{tumbleFrameIndex:1});assert.equal(count(match,/m74-tumble-cell is-winning/g),8);
  assert.match(match,/Server winning groups/);assert.equal(JSON.stringify(round),before);
  assert.equal(machineMarkup(definition,{...round,private:{future:'NEVER_DISPLAY',draws:[1,2,3]}}),machineMarkup(definition,round));
});

test('free-spin transcript renders retriggers, cumulative multipliers and the exact final server total',()=>{
  const round=fixture(gatesBonusFeatureFixture()),frames=gatesPublicFrames(definition,round);
  assert.equal(frames.length,25);assert.equal(round.outcome.spins.length,21);assert.equal(round.outcome.freeSpinsPlayed,20);assert.equal(round.winMinor,'440');
  const firstFree=frames.find(frame=>frame.spinIndex===1),markup=machineMarkup(definition,round,{tumbleFrameIndex:firstFree.index});
  assert.match(markup,/FREE SPIN 1/);assert.match(markup,/SPIN FACTOR 2×/);assert.match(markup,/2×<\/b>/);
  assert.match(markup,/data-multiplier-tone="blue"/);
  const final=machineMarkup(definition,round);assert.match(final,/4\.40/);assert.match(final,/20 \/ 20/);assert.match(final,/FEATURE COMPLETE/);
});

test('inconsistent public frame geometry, labels and final boards fail before rendering',()=>{
  const original=fixture(gatesBonusFeatureFixture());
  const mutations=[
    r=>r.outcome.spins[0].frames[0].grid[0][0]='unknown',
    r=>r.outcome.spins[1].frames[0].multiplierSymbols[0].value=999,
    r=>r.outcome.spins[1].frames[0].winningGroups[0].positions[0].row=99,
    r=>r.outcome.spins[1].frames[0].refills[0].col=99,
    r=>r.outcome.grid[0][0]='gatesofmerlyn-ruby',
  ];
  for(const mutate of mutations){const bad=structuredClone(original);mutate(bad);assert.throws(()=>machineMarkup(definition,bad),/Gates|server reel grid/);}
});

class Stage{
  constructor(){this.innerHTML='';this.listeners=new Map();this.classes=new Set();this.style={setProperty(){}};this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
  replaceChildren(){} querySelector(){return null;} querySelectorAll(){return [];} addEventListener(t,h){this.listeners.set(t,h);} removeEventListener(t,h){if(this.listeners.get(t)===h)this.listeners.delete(t);} contains(){return true;}
}
test('Gates STOP exposes the immutable final board and one total without replaying a financial action',async()=>{
  const round=fixture(gatesBonusFeatureFixture()),before=JSON.stringify(round),stage=new Stage(),actions=[],cues=[];
  const animation=animateRound(stage,definition,null,round,{onAction:action=>actions.push(action),audio:{cue:cue=>cues.push(cue),startSpin(){},stopSpin(){}}});
  animation.stop();animation.stop();assert.deepEqual(await animation.promise,{cancelled:false});
  assert.equal(stage.innerHTML,machineMarkup(definition,round,{disabled:true}));assert.equal(JSON.stringify(round),before);assert.deepEqual(actions,[]);
  assert.equal(cues.filter(cue=>cue.endsWith('Win')||cue==='lose').length,1);assert.equal(stage.classes.has('m74-animating'),false);
});
