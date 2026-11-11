import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {entries} from '../client/official74-data.mjs';
import {existingWalletRoute} from '../client/existing-wallet-routes.mjs';
import {MachineAccountClient} from '../client/machine74-api.mjs';
import {gamblePresentation,canStartRound,slotSpinLabel,roundNeedsRecovery} from '../client/machine74-controls.mjs';
import {hasPaidFeatureModes} from '../client/paid74-feature.mjs';
import {hasChickenAutoplay,chickenAutoplayPlan} from '../client/chicken74-autoplay.mjs';
import {createExistingLibrary74Adapter} from '../server/existing-library74-adapter.mjs';
const source=await readFile(new URL('../client/machine74-controller.mjs',import.meta.url),'utf8');
function controls(snapshot,{pending=null,working=false,presenceNeedsRefresh=false,autoplay=false,gameDefinition={id:'ind74_official_multihot10',family:'slots'}}={}){
  const nodes=new Map();
  const $=id=>{if(['wheel-total-preview','batch-preview','tumble-total-preview','charging-total-preview','chicken-auto-preview'].includes(id))return null;if(!nodes.has(id))nodes.set(id,{classList:{toggle(){}},querySelectorAll:()=>[],open:false});return nodes.get(id);};
  const context=vm.createContext({currency:'ETB',$,snapshot,working,refreshing:false,loadingCatalogue:false,presenceNeedsRefresh,api:{pending},game:gameDefinition,animation:null,autoplay,chickenAutoProgress:null,definitions:[{}],gamblePresentation,canStartRound,slotSpinLabel,roundNeedsRecovery,hasPaidFeatureModes,hasChickenAutoplay,chickenAutoSelection:()=>chickenAutoplayPlan(gameDefinition,{stake:'1.00',mode:gameDefinition.defaultMode,rounds:5,targetStep:1}),options:()=>({}),isPlinkoX:()=>false,isDestiny:()=>false,batchPreview:()=>null,tumblePreview:()=>null,chargingPreview:()=>null,wheelPreview:()=>null,collectAllowed:()=>snapshot?.round?.allowedActions?.includes('collect')===true,decimal:x=>x});
  vm.runInContext(source.slice(source.indexOf('function updateControls(){'),source.indexOf('\nfunction draw(){'))+'\nupdateControls();',context);
  return $;
}
test('all 74 catalogue games retain their exact existing route or resolve to an authored machine',async()=>{
  const lobby=await readFile(new URL('../client/lobby74.mjs',import.meta.url),'utf8');
  const declaration=lobby.match(/const machineUrl=game=>[^;]+;/)[0];
  const resolve=vm.runInNewContext(declaration+'machineUrl;',{url:g=>existingWalletRoute(g.gameId),encodeURIComponent});
  assert.equal(entries.length,74);
  for(const g of entries){const route=resolve(g);if(existingWalletRoute(g.gameId))assert.equal(route,existingWalletRoute(g.gameId));else assert.equal(new URL(route,'https://zplay.test').hash.slice(1),g.gameId);}
});
test('signed-out and settlement-pending players can configure the machine but cannot wager',()=>{
  for(const snapshot of [null,{accepting:false,game:{launchable:false},historyAvailable:false}]){const $=controls(snapshot);assert.equal($('play').disabled,true);assert.equal($('auto').disabled,true);for(const id of ['bet','bet-less','bet-more'])assert.equal($(id).disabled,false);}
});
test('accepted active rounds and uncertain requests lock stake configuration',()=>{
  for(const [snapshot,opts] of [[{accepting:true,round:{status:'active'}},{}],[{accepting:true},{pending:{body:{game_id:'ind74_official_multihot10'}}}],[{accepting:true},{working:true}]]){const $=controls(snapshot,opts);assert.equal($('play').disabled,true);assert.equal($('bet').disabled,true);}
});
test('an unconfirmed Chicken connection disables GO and CASHOUT while keeping recovery controls usable',()=>{
  const gameDefinition={id:'ind74_official_chickenhighway',family:'ladder'},snapshot={accepting:true,round:{status:'active',step:1,collectibleMinor:'102',allowedActions:['reveal','collect','sync']}};
  const ready=controls(snapshot,{gameDefinition});assert.equal(ready('next').disabled,false);assert.equal(ready('collect').disabled,false);
  const blocked=controls(snapshot,{gameDefinition,presenceNeedsRefresh:true});
  assert.equal(blocked('next').disabled,true);assert.equal(blocked('collect').disabled,true);assert.equal(blocked('play').disabled,true);assert.equal(blocked('refresh').disabled,false);
  const pending={body:{game_id:gameDefinition.id,action:'sync'}},recover=controls(snapshot,{gameDefinition,presenceNeedsRefresh:true,pending});
  assert.equal(recover('retry').hidden,false);assert.equal(recover('retry').disabled,false);
});
test('only the documented Chicken capability reveals ladder AUTO and manual financial controls remain locked during a batch',()=>{
  const id='ind74_official_chickenhighway',definition=createExistingLibrary74Adapter().definitions[id];
  const ready={accepting:true,game:{launchable:true},round:null};
  assert.equal(controls(ready,{gameDefinition:definition})('auto').hidden,false);
  assert.equal(controls(ready,{gameDefinition:definition})('auto').disabled,false);
  assert.equal(controls(ready,{gameDefinition:{...definition,id:'ind74_official_mineisland'}})('auto').hidden,true);
  const active={...ready,round:{status:'active',step:1,collectibleMinor:'102',allowedActions:['reveal','collect','sync']}};
  const $=controls(active,{gameDefinition:definition,autoplay:true});
  assert.equal($('next').disabled,true);assert.equal($('collect').disabled,true);assert.equal($('play').disabled,true);assert.equal($('auto').disabled,false);assert.equal($('bet').disabled,true);
});
test('closed server snapshot never sends a money action when configuration is changed',async()=>{
  let posts=0;const id='ind74_official_multihot10';const api=new MachineAccountClient({storage:null,fetchImpl:async(_url,init)=>{if(init.method==='POST')posts++;return Response.json({authenticated:true,currency:'ETB',balance:'0.00',accepting:false,sessionGuard:'a'.repeat(64),round:null,game:{id,version:'closed',limits:{minBetMinor:'100',betStepMinor:'100',maxBetMinor:'2000'}}});}});
  await api.state(id);await assert.rejects(api.start('2.00'),{code:'NEW_ROUND_UNAVAILABLE'});assert.equal(posts,0);
});
