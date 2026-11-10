import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyObservedControlState} from '../../deploy/smartsoft/control-state-r16b.mjs';
import {CONTROL_PROFILES} from '../../deploy/smartsoft/control-data-r16b.mjs';
import {CONTROL_RESOURCES} from '../../deploy/smartsoft/operator-control-sources-r16.mjs';
import {installOperationalLibrary} from '../../deploy/smartsoft/operator-status-r16.mjs';
const scene=(id='multihot100_native')=>({modernMobileLayout:true,mobileState:{pending:true,stake:'1.00',balance:'137.25'},
 commands:[{type:'sprite',role:'mobile-control',control:'play',frame:'stop',box:{x:10,y:20,width:CONTROL_PROFILES[id].width,height:CONTROL_PROFILES[id].height}},
  {type:'sprite',role:'mobile-control',control:'bet',frame:'bet',box:{x:210,y:20,width:70,height:70}},
  {type:'text',role:'mobile-balance-amount',text:'137.25 ETB'}],acceptedReceipt:{round_id:'unchanged',payoutMinor:'100'}});
const manifest=id=>({id,controls:{bet:{disabled:'Buttons/BetDisabled'}},frames:{stop:{original:{width:188,height:174}},'@Mobile/Buttons/BetDisabled':{original:{width:70,height:70}}}});

test('each observed title gets its own exact STOP style and locked Bet artwork without changing a receipt',()=>{
 assert.equal(Object.keys(CONTROL_PROFILES).length,6);
 for(const [id,profile]of Object.entries(CONTROL_PROFILES)){
  const original=scene(id),result=applyObservedControlState(original,manifest(id),CONTROL_PROFILES),stop=result.commands.find(c=>c.text==='STOP');
  assert.equal(stop.x,10+profile.x);assert.equal(stop.y,20+profile.y);assert.equal(stop.color,profile.color);assert.equal(stop.size,profile.size);
  assert.equal(result.commands[1].frame,'@Mobile/Buttons/BetDisabled');assert.equal(result.acceptedReceipt,original.acceptedReceipt);assert.equal(result.mobileState,original.mobileState);assert.equal(result.commands[2],original.commands[2]);
  assert.equal(original.commands[1].frame,'bet');assert.equal(original.commands.length,3);
  const idle=scene();idle.mobileState.pending=false;assert.equal(applyObservedControlState(idle,manifest(id),CONTROL_PROFILES),idle);
 }
 const unobserved=scene();assert.equal(applyObservedControlState(unobserved,manifest('coinminer_native'),CONTROL_PROFILES),unobserved);
 const legacy=scene();legacy.modernMobileLayout=false;assert.equal(applyObservedControlState(legacy,manifest('multihot5wild_native'),CONTROL_PROFILES),legacy);
});

test('control coordinates scale with native bounds and their immutable public source needs no account access',async()=>{
 const id='multihot100_native',original=scene();original.commands[0].box.width/=2;original.commands[0].box.height/=2;
 const stop=applyObservedControlState(original,manifest(id),CONTROL_PROFILES).commands.find(c=>c.text==='STOP');
 assert.equal(stop.x,10+94/2);assert.equal(stop.y,20+114/2);assert.equal(stop.size,7.5);
 for(const [name,source]of Object.entries(CONTROL_RESOURCES))assert.equal(source,await readFile(new URL('../../deploy/smartsoft/'+name,import.meta.url),'utf8'));
 const previous={fetch(){throw Error('NO_ACCOUNT_OR_OTHER_SERVICE_ALLOWED');}};
 const app=installOperationalLibrary(previous,{uiSource:'export {};',controlResources:CONTROL_RESOURCES});
 const response=await app.fetch(new Request('https://library.test/v2/remaining20/construction-r15/control-state-r16b.mjs',{headers:{cookie:'private'}}));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'public, max-age=31536000, immutable');assert.equal(await response.text(),CONTROL_RESOURCES['control-state-r16b.mjs']);
 assert.equal((await app.fetch(new Request('https://library.test/v2/remaining20/construction-r15/control-state-r16b.mjs',{method:'POST'}))).status,405);
});
