import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {machineMarkup,rollXRotation,minorText} from '../client/machine74-renderer.mjs';

const full=math.getGameDefinition('ind74_official_rollx'),view=publicLibrary74Definition(full);
const sample=roll=>math.publicRound(math.startRound({gameId:full.id,betMinor:'100',options:{target:50},rng:()=>roll,now:1700000000000}),1700000000000);

test('Roll X uses the observed continuous green/black dial and fixed pointer without inventing provider1.4× semantics',()=>{
 const ready=machineMarkup(view),selected=machineMarkup(view,null,{selectedOptions:{target:75}});
 assert.match(ready,/m74-rollx-dial/);assert.match(ready,/m74-rollx-green/);assert.match(ready,/m74-rollx-dark/);assert.match(ready,/m74-rollx-pointer/);
 assert.doesNotMatch(ready,/m74-roll-result|m74-dice-track|1\.40×/);
 assert.match(ready,/TARGET 50 \/ 100/);assert.match(selected,/TARGET 75 \/ 100/);
 assert.throws(()=>machineMarkup(view,null,{selectedOptions:{target:101}}),/published Roll X target/);
 // The generic dice presentation remains available to another registered
 // title if a future public definition selects that family.
 assert.match(machineMarkup({...view,id:'ind74_official_doublex'}),/m74-roll-result/);
});

test('Roll X paints the public confirmed return and outcome; dial rotation preserves each independent server roll',()=>{
 for(let roll=0;roll<100;roll++){
  const round=sample(roll),before=JSON.stringify(round),markup=machineMarkup(view,round);
  assert.equal(rollXRotation(round),-(roll+.5)*3.6);
  assert.match(markup,new RegExp('rotate\\('+String(rollXRotation(round)).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' 300 300\\)'));
  assert.match(markup,roll<50?/>WON</:/>TRY AGAIN</);
  if(roll<50)assert.ok(markup.includes('<strong>'+minorText(round.winMinor)+'</strong>'));
  const dial=markup.split('class="m74-rollx-dial"')[1].split('class="m74-stage-strip"')[0];
  assert.doesNotMatch(dial,/ROLL [0-9]|00—99|target below/);
  assert.equal(JSON.stringify(round),before);
 }
});
