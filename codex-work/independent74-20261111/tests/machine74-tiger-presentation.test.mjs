import test from 'node:test';import assert from 'node:assert/strict';
import {machineMarkup,animateRound,minorText} from '../client/machine74-renderer.mjs';
import {tigerPresentationFixture} from './support/tiger-presentation-fixtures.mjs';
const count=(text,pattern)=>[...text.matchAll(pattern)].length;
test('Tiger public feature definitions preserve documented factors and uncertainty flags without exposing RNG tickets',()=>{
 const {definition,round}=tigerPresentationFixture();
 assert.deepEqual(definition.baseGameMultiplier.values,[5,10,15,20]);assert.equal(definition.respinFeature.maximumFrames,9);
 assert.equal(definition.respinFeature.providerAggregationVerified,false);assert.equal(definition.respinFeature.providerProbabilitiesVerified,false);
 for(const key of ['triggerTickets','triggerTicket','cellTickets','selectedSymbolTickets','wildTickets'])assert.equal(definition.respinFeature[key],undefined);
 assert.equal(round.status,'settled');assert.equal(round.private,undefined);assert.equal(round.mathState,undefined);
 assert.equal(round.outcome.bonusFrames.length,3);assert(round.outcome.bonusFrames.some(frame=>frame.grid.flat().includes(null)));
});
test('completed Tiger respins display blanks, stable locks and conditional selected-versus-applied multipliers',()=>{
 const {definition,round}=tigerPresentationFixture(),before=JSON.stringify(round);
 const base=machineMarkup(definition,round,{bonusFrameIndex:-1}),first=machineMarkup(definition,round,{bonusFrameIndex:0}),final=machineMarkup(definition,round);
 assert.doesNotMatch(base,/m74-respin-meter/);assert.match(base,/BASE MULTIPLIER 1×/);
 assert.equal(count(first,/data-blank="true"/g),6);assert.equal(count(first,/data-locked="true"/g),3);assert.match(first,/RESPIN FACTOR 20× · APPLIED 1×/);
 assert.equal(count(final,/data-blank="true"/g),4);assert.equal(count(final,/data-locked="true"/g),5);assert.match(final,/data-frame="3"/);assert.match(final,/FEATURE COMPLETE/);
 assert(final.includes(minorText(round.payoutMinor)));assert.equal(JSON.stringify(round),before);
 const complete=tigerPresentationFixture('full'),markup=machineMarkup(complete.definition,complete.round);
 assert.equal(count(markup,/data-locked="true"/g),9);assert.doesNotMatch(markup,/data-blank="true"/);assert.match(markup,/RESPIN FACTOR 20× · APPLIED 20×/);
 const baseOnly=tigerPresentationFixture('base');assert.match(machineMarkup(baseOnly.definition,baseOnly.round),/BASE MULTIPLIER 20×/);
});
test('contradictory Tiger lock history and malformed frame metadata are rejected before markup',()=>{
 const {definition,round}=tigerPresentationFixture();
 for(const alter of [r=>r.outcome.bonusFrames[1].grid[0][0]=null,r=>r.outcome.bonusFrames[0].index='1\" onclick=bad',r=>r.outcome.bonusFrames[0].lockedCells=8,r=>r.outcome.bonusFrames[0].grid[0][0]='unknown']){
  const changed=structuredClone(round);alter(changed);assert.throws(()=>machineMarkup(definition,changed),/server respin/);
 }
});
class Stage{constructor(){this.innerHTML='';this.classes=new Set();this.listeners=new Map();this.style={setProperty(){}};this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}replaceChildren(){}querySelector(){return null;}querySelectorAll(){return [];}addEventListener(k,v){this.listeners.set(k,v);}removeEventListener(k,v){if(this.listeners.get(k)===v)this.listeners.delete(k);}}
test('Tiger STOP before animation fast-forwards directly to the immutable last completed respin with one result cue and zero actions',async()=>{
 const {definition,round}=tigerPresentationFixture('full'),before=JSON.stringify(round),stage=new Stage(),actions=[],cues=[];
 const animation=animateRound(stage,definition,null,round,{onAction:a=>actions.push(a),audio:{cue:name=>cues.push(name)}});
 assert.doesNotMatch(stage.innerHTML,/m74-respin-meter/);animation.stop();animation.stop();assert.deepEqual(await animation.promise,{cancelled:false});await Promise.resolve();
 assert.equal(stage.innerHTML,machineMarkup(definition,round,{disabled:true}));assert.equal(JSON.stringify(round),before);assert.deepEqual(actions,[]);
 assert.equal(cues.filter(name=>name.endsWith('Win')||name==='lose').length,1);
});
