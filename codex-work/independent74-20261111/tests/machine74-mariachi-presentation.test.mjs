import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineMarkup,animateRound} from '../client/machine74-renderer.mjs';
import {mariachiPublicView} from '../client/mariachi74-presentation.mjs';
import {hasPaidFeatureModes} from '../client/paid74-feature.mjs';
const id='ind74_official_mariachicoins',full=math.getGameDefinition(id),definition=publicLibrary74Definition(full);
const count=(markup,pattern)=>[...markup.matchAll(pattern)].length;
function fixture(branch='reset',options={}){
 const draws=[],regular=full.symbols.length*32;
 for(let row=0;row<3;row++)for(let col=0;col<5;col++){
  if(row===0&&(col===0||col===4))draws.push(regular+1);
  else if(row===0&&col===1)draws.push(regular+1,0);
  else draws.push((row+col)%full.symbols.length);
 }
 if(branch==='reset')draws.push(0,6,12,...Array(10).fill(63));
 if(branch==='full')draws.push(...Array.from({length:12},()=>[0,6]).flat());
 if(branch==='maximum')draws.push(...Array(12).fill(11));
 let cursor=0;const rng=bound=>{if(cursor<draws.length){const n=draws[cursor++];assert(n<bound);return n;}assert.equal(bound,64);return 63;};
 return math.publicRound(math.startRound({gameId:id,betMinor:'100',options,rng,now:1700000000000}));
}

test('Mariachi has separate collector portraits and no unverified purchase or Atlantis coin header',()=>{
 assert.equal(hasPaidFeatureModes(definition),false);
 const markup=machineMarkup(definition);assert.match(markup,/m74-mariachi-header/);assert.match(markup,/BOTH COLLECTORS \+ COIN/);
 assert.doesNotMatch(markup,/5 COINS · 3 RESPINS|BUY RESPIN|undefined/);assert.equal(count(markup,/m74-reel-window/g),5);assert.equal(count(markup,/data-symbol="/g),15);
});

test('new Mariachi collectors display their confirmed saved amount and keep prior amounts immutable',()=>{
 const round=fixture(),before=JSON.stringify(round),view=mariachiPublicView(definition,round);
 assert.equal(view.frames.length,4);assert.deepEqual(view.frames[0].frame.collectors.map(item=>item.collectedMinor),['100','100','1600']);
 const first=machineMarkup(definition,round,{bonusFrameIndex:0}),final=machineMarkup(definition,round);
 assert.match(first,/RESPINS 3 \/ 3/);assert.match(final,/RESPINS 0 \/ 3/);
 assert.equal(count(first,/data-collector="/g),3);assert.equal(count(first,/data-locked="true"/g),5);assert.equal(count(first,/data-new-lock="true"/g),2);
 assert.match(first,/16\.00/);assert.match(final,/FEATURE AWARD 34\.00/);assert.equal(JSON.stringify(round),before);
});

test('full-board doubling and the explicit maximum use the server receipt labels',()=>{
 const fullRound=fixture('full'),maxRound=fixture('maximum');
 assert.match(machineMarkup(definition,fullRound),/FULL BOARD · 2×/);assert.equal(count(machineMarkup(definition,fullRound),/data-locked="true"/g),15);
 assert.equal(maxRound.outcome.capReached,true);assert.match(machineMarkup(definition,maxRound),/data-maximum-award="true"/);
 assert.match(machineMarkup(definition,maxRound),/GRAND/);assert.match(machineMarkup(definition,maxRound),/2,500\.00|2500\.00/);
});

test('Mariachi held win keeps the resolved feature visible without treating X2 as another respin',()=>{
 const round=fixture('reset',{holdWin:true});assert.equal(round.status,'active');assert(round.allowedActions.includes('gamble'));
 const markup=machineMarkup(definition,round);assert.match(markup,/data-mariachi-frame="4"/);assert.match(markup,/WIN TO COLLECT|m74-pending-win/);
});

test('Mariachi rejects changed locked values, missing cells and premature terminal counters',()=>{
 const round=fixture();for(const change of [r=>r.outcome.bonusFrames[1].collectors[0].collectedMinor='999',r=>r.outcome.bonusFrames[0].grid[0][0]=null,r=>r.outcome.bonusFrames[0].terminal=true,r=>r.outcome.finalCoinValues[0].multiplier=999]){const bad=structuredClone(round);change(bad);assert.throws(()=>machineMarkup(definition,bad),/Mariachi/);}
});

class Stage{constructor(){this.innerHTML='';this.classes=new Set();this.style={setProperty(){}};this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}replaceChildren(){}querySelector(){return null;}querySelectorAll(){return [];}addEventListener(){}removeEventListener(){}}
test('Mariachi repeated STOP reveals one immutable final feature without a financial callback',async()=>{
 const round=fixture(),before=JSON.stringify(round),stage=new Stage(),actions=[];
 const animation=animateRound(stage,definition,null,round,{onAction:action=>actions.push(action)});animation.stop();animation.stop();await animation.promise;
 assert.equal(stage.innerHTML,machineMarkup(definition,round,{disabled:true}));assert.equal(JSON.stringify(round),before);assert.deepEqual(actions,[]);
});
