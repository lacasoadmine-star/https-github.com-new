import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {freshChargingContext,chargingGridRng,chargingLoseThenWinFixtures} from './support/charging-wilds-fixtures.mjs';
import {chargingStakePreview,chargingAnteTotal,chargingPublicView,chargingRoundMatchesSelection} from '../client/charging74-presentation.mjs';
import {machineMarkup,animateRound} from '../client/machine74-renderer.mjs';

const ids=['ind74_official_multifruitschargingwilds','ind74_official_gemscrownchargingwilds'];
function sequence(id){
  const full=math.getGameDefinition(id),definition=publicLibrary74Definition(full),{firstGrid,secondGrid}=chargingLoseThenWinFixtures(full);
  const first=math.startRound({gameId:id,betMinor:'100',context:freshChargingContext(full,'100'),rng:chargingGridRng(full,firstGrid)});
  const second=math.startRound({gameId:id,betMinor:'100',context:{bucket:first.carryBucket,priorCarry:first.carryAfter},rng:chargingGridRng(full,secondGrid,first.carryAfter.wilds)});
  return {full,definition,first:math.publicRound(first),second:math.publicRound(second)};
}

for(const id of ids)test(id+': saved Wild labels survive the next accepted spin and clear only after the server uses them',()=>{
  const {definition,first,second}=sequence(id),before=JSON.stringify([first,second]);
  assert.equal(definition.slotMechanic,'charging-wilds');assert.equal(definition.wildRule.regularSymbolWeight,undefined);
  const firstView=chargingPublicView(definition,first),secondView=chargingPublicView(definition,second);
  assert.equal(firstView.current.get('0:0').multiplier,1);assert.equal(firstView.after.get('0:0').multiplier,2);
  assert.equal(secondView.before.get('0:0').multiplier,2);assert.equal(secondView.current.get('0:0').multiplier,2);assert.equal(secondView.after.size,0);
  const firstMarkup=machineMarkup(definition,first),secondMarkup=machineMarkup(definition,second);
  assert.match(firstMarkup,/data-charging-wild="1" data-retained-multiplier="2"/);assert.match(firstMarkup,/NEXT 2×/);
  assert.match(secondMarkup,/data-charging-wild="2" data-used-wild="true"/);assert.match(secondMarkup,/SAVED FOR NEXT SPIN <b>0 WILDS/);
  const spinning=machineMarkup(definition,second,{chargingCarryOverlay:true});assert.match(spinning,/data-saved-position="0:0"/);assert.match(spinning,/<b>2×<\/b><small>SAVED/);
  assert.equal(machineMarkup(definition,{...first,private:{carry:'DO_NOT_DISPLAY',draws:[1,2,3]}}),firstMarkup);
  assert.equal(JSON.stringify([first,second]),before);
});

test('ANTE controls show one total debit consistent with the server bucket and never invent Gems ANTE',()=>{
  const {full,definition}=sequence(ids[0]);
  for(const ante of definition.chargingFeature.anteValues){const preview=chargingStakePreview(definition,(ante*2)+'.00',ante),bucket=math.chargingCarryBucket(full,preview.totalBetMinor,{ante});assert.equal(preview.baseBetMinor,bucket.baseBetMinor);assert.equal(preview.ante,bucket.ante);assert.equal(preview.totalBetMinor,String(ante*200));}
  assert.equal(chargingAnteTotal(definition,'2.00',1,5),'10.00');assert.equal(chargingAnteTotal(definition,'10.00',5,10),'20.00');assert.equal(chargingAnteTotal(definition,'20.00',10,1),'2.00');
  assert.throws(()=>chargingStakePreview(definition,'1.00',5));assert.throws(()=>chargingStakePreview(definition,'1.50',1));
  const gems=sequence(ids[1]).definition;assert.deepEqual(gems.chargingFeature.anteValues,[1]);assert.throws(()=>chargingStakePreview(gems,'5.00',5));
});

test('changing total stake or ANTE clears the previous bucket display until a matching server receipt exists',()=>{
  const {definition,first}=sequence(ids[0]);
  assert.equal(chargingRoundMatchesSelection(definition,first,'1.00',1),true);
  for(const [total,ante]of [['2.00',1],['5.00',5],['10.00',10],['invalid',1]])assert.equal(chargingRoundMatchesSelection(definition,first,total,ante),false);
  assert.equal(chargingRoundMatchesSelection(definition,null,'1.00',1),false);
  const ready=machineMarkup(definition,null,{selectedOptions:{ante:5}});assert.match(ready,/SERVER CONFIRMS/);assert.doesNotMatch(ready,/data-charging-wild|data-saved-position/);
});

test('malformed carry positions, labels or a different Wild grid fail before display',()=>{
  const {definition,first}=sequence(ids[0]);
  for(const corrupt of [r=>r.outcome.wildsThisSpin[0].row=99,r=>r.outcome.wildsThisSpin[0].multiplier=NaN,r=>r.outcome.retainedWilds[0].multiplier=99,r=>r.outcome.grid[0][0]=definition.symbols[0].id]){const bad=structuredClone(first);corrupt(bad);assert.throws(()=>machineMarkup(definition,bad),/Charging/);}
});

class Stage{
  constructor(){this.innerHTML='';this.listeners=new Map();this.classes=new Set();this.style={setProperty(){}};this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
  replaceChildren(){}querySelector(){return null;}querySelectorAll(){return [];}addEventListener(t,h){this.listeners.set(t,h);}removeEventListener(t,h){if(this.listeners.get(t)===h)this.listeners.delete(t);}contains(){return true;}
}
test('STOP removes the prior-spin carry overlay and shows the immutable second receipt without another action',async()=>{
  const {definition,first,second}=sequence(ids[0]),stage=new Stage(),actions=[],before=JSON.stringify(second);
  const handle=animateRound(stage,definition,first,second,{action:'start',onAction:a=>actions.push(a)});
  assert.match(stage.innerHTML,/data-saved-position="0:0"/);handle.stop();handle.stop();assert.deepEqual(await handle.promise,{cancelled:false});
  assert.equal(stage.innerHTML,machineMarkup(definition,second,{disabled:true,action:'start'}));assert.doesNotMatch(stage.innerHTML,/data-saved-position/);
  assert.equal(JSON.stringify(second),before);assert.deepEqual(actions,[]);
});
