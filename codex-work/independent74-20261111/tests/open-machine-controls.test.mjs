import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {entries} from '../client/official74-data.mjs';
import {existingWalletRoute} from '../client/existing-wallet-routes.mjs';
import {MachineAccountClient} from '../client/machine74-api.mjs';
const source=await readFile(new URL('../client/machine74-controller.mjs',import.meta.url),'utf8');
function controls(snapshot,{pending=null,working=false}={}){
  const nodes=new Map();
  const $=id=>{if(id==='wheel-total-preview'||id==='batch-preview')return null;if(!nodes.has(id))nodes.set(id,{classList:{toggle(){}},querySelectorAll:()=>[],open:false});return nodes.get(id);};
  const context=vm.createContext({currency:'ETB',$,snapshot,working,refreshing:false,api:{pending},game:{id:'ind74_official_multihot10',family:'slots'},animation:null,autoplay:false,definitions:[{}],isPlinkoX:()=>false,isDestiny:()=>false,batchPreview:()=>null,wheelPreview:()=>null,collectAllowed:()=>false,decimal:x=>x});
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
test('closed server snapshot never sends a money action when configuration is changed',async()=>{
  let posts=0;const id='ind74_official_multihot10';const api=new MachineAccountClient({storage:null,fetchImpl:async(_url,init)=>{if(init.method==='POST')posts++;return Response.json({authenticated:true,currency:'ETB',balance:'0.00',accepting:false,sessionGuard:'a'.repeat(64),round:null,game:{id,version:'closed',limits:{minBetMinor:'100',betStepMinor:'100',maxBetMinor:'2000'}}});}});
  await api.state(id);await assert.rejects(api.start('2.00'),{code:'NEW_ROUND_UNAVAILABLE'});assert.equal(posts,0);
});
