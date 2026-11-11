import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {hasPaidFeatureModes,paidFeatureDefinition} from '../client/paid74-feature.mjs';
import {isChargingWilds} from '../client/charging74-presentation.mjs';

const source=await readFile(new URL('../client/machine74-controller.mjs',import.meta.url),'utf8');
function fixture({active=false}={}){
 const first={id:'ind74_official_gatesofmerlyn',family:'slots'},second={id:'ind74_official_multihot10',family:'slots'};
 const nodes=new Map(),shown=[],refreshes=[];
 const $=id=>{if(!nodes.has(id))nodes.set(id,{value:'',open:false,replaceChildren(){},setAttribute(){}});return nodes.get(id);};
 $('bet').value='500.00';
 const context={working:false,refreshing:false,snapshot:active?{round:{status:'active'}}:{round:{status:'settled'}},game:first,definitions:[first,second],
  autoplay:true,chickenAutoTask:null,historyLoaded:true,pendingBallAmount:null,committedBallAmount:1,restorePlinkoOptions:false,restoreWheelBets:false,restoreTumbleOptions:false,committedTumbleMode:'buy500',restoreChargingOptions:false,committedChargingAnte:1,
  $,isPlinkoX:()=>false,isDestiny:()=>false,hasPaidFeatureModes,paidFeatureDefinition,isChargingWilds,currency:'ETB',existingWalletRoute:()=>null,machineSignInHref:()=>'/sign-in',
  history:{replaceState(){}},createOptions:()=>shown.push($('bet').value),draw(){},refresh:async()=>refreshes.push(context.game.id)};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function stopAutoplay(){'),source.indexOf('\nfunction chickenAutoSelection('))+source.slice(source.indexOf('async function select('),source.indexOf('\nasync function present(')),context);
 return{context,$,shown,refreshes,first,second};
}
test('changing title does not carry an earlier feature-purchase total into a new ordinary spin',async()=>{
 const f=fixture();await f.context.select(f.second.id);
 assert.equal(f.$('bet').value,'1.00');assert.deepEqual(f.shown,['1.00']);assert.deepEqual(f.refreshes,[f.second.id]);
 f.$('bet').value='17.00';await f.context.select(f.second.id);assert.equal(f.$('bet').value,'17.00');
});
test('an active round blocks title changes without altering the committed stake',async()=>{
 const f=fixture({active:true});await f.context.select(f.second.id);
 assert.equal(f.$('bet').value,'500.00');assert.equal(f.context.game.id,f.first.id);assert.deepEqual(f.shown,[]);assert.deepEqual(f.refreshes,[]);
});
