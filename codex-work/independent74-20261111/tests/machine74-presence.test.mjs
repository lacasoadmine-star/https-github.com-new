import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {MachineAccountClient} from '../client/machine74-api.mjs';
import {CHICKEN_HEARTBEAT_MS,hasChickenPresence,canSyncChickenPresence,pendingChickenSync,renewChickenPresence} from '../client/chicken74-presence.mjs';
import {activeRoundStake,roundNeedsRecovery} from '../client/machine74-controls.mjs';
import {hasChickenAutoplay} from '../client/chicken74-autoplay.mjs';
import {createExistingLibrary74Adapter} from '../server/existing-library74-adapter.mjs';

const id='ind74_official_chickenhighway',requestId='a56f296c-a5a8-4a85-aa65-c1c6a7697299';
const definition={id,family:'ladder',connectionPolicy:{kind:'authenticated-presence-lease',heartbeatAction:'sync',heartbeatIntervalMs:2000,disconnectAfterMs:8000,timeoutComparison:'strictly-greater',stateReadsRenew:false,includesAutoplay:true}};
const receipt=(extra={})=>({game_id:id,round_id:'b56f296c-a5a8-4a85-aa65-c1c6a7697299',model_version:'presence-fixture-r4',status:'active',version:1,stakeMinor:'100',step:1,allowedActions:['advance','collect','sync'],...extra});
const snapshot=(extra={})=>({authenticated:true,currency:'ETB',balance:'499.00',accepting:true,sessionGuard:'a'.repeat(64),game:{id,version:'presence-fixture-r4',launchable:true},round:receipt(),...extra});
const storage=()=>{const data=new Map();return{getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};

test('the real Chicken adapter publishes the client capability and renews only an accepted empty sync without a debit or draw',()=>{
  const adapter=createExistingLibrary74Adapter({reviewedGameIds:[id],allowNewRounds:true,gameLimits:{[id]:{maxBetMinor:'5000000',maxWinMinor:'999999999999999'}}});
  const published=adapter.definitions[id],now=1700000000000;
  assert.equal(hasChickenPresence(published),true);
  const started=adapter.start(id,{stakeMinor:'100'},()=>0,now),first=adapter.publicState(started.state,now);
  assert.ok(first.allowedActions.includes('sync'));assert.equal(first.connectionDeadlineAt,now+8001);
  assert.equal(canSyncChickenPresence(published,{round:{...first,game_id:id}}),true);
  assert.equal(adapter.publicState(started.state,now+2000).connectionDeadlineAt,first.connectionDeadlineAt);
  const renewed=adapter.act(started.state,{type:'sync'},()=>{throw Error('Heartbeat must not draw an outcome');},now+2000);
  const next=adapter.publicState(renewed.state,now+2000);
  assert.equal(renewed.debitMinor,'0');assert.equal(next.step,first.step);
  assert.equal(next.connectionDeadlineAt,now+10001);assert.equal(next.lastContactAt,now+2000);assert.equal(next.serverNow,now+2000);
});

test('Chicken presence requires the published capability, current active permission and a visible idle client',()=>{
  assert.equal(CHICKEN_HEARTBEAT_MS,2000);assert.equal(hasChickenPresence(definition),true);
  assert.equal(canSyncChickenPresence(definition,snapshot()),true);
  assert.equal(canSyncChickenPresence(definition,snapshot({accepting:false})),true,'Closing new wagers must not strand an accepted round.');
  for(const flags of [{hidden:true},{working:true},{refreshing:true},{pending:{}},{disposed:true},{needsRefresh:true}])assert.equal(canSyncChickenPresence(definition,snapshot(),flags),false);
  for(const state of [null,snapshot({recovery_required:true}),snapshot({round:receipt({recovery_required:true})}),snapshot({round:receipt({previous_model:true})}),snapshot({round:receipt({status:'settled'})}),snapshot({round:receipt({allowedActions:['advance','collect']})}),snapshot({round:receipt({game_id:'ind74_official_mineisland'})})])assert.equal(canSyncChickenPresence(definition,state),false);
  for(const game of [{...definition,connectionPolicy:undefined},{...definition,id:'ind74_official_mineisland'},{...definition,connectionPolicy:{...definition.connectionPolicy,stateReadsRenew:true}}])assert.equal(hasChickenPresence(game),false);
});

test('normal heartbeat uses an empty sync action and no stake, clock, disconnect or settlement input',async()=>{
  const calls=[];const api=new MachineAccountClient({storage:storage(),newId:()=>requestId,fetchImpl:async(url,init)=>{
    calls.push({url,method:init.method,body:init.body?JSON.parse(init.body):null});
    return Response.json(snapshot({round:receipt({version:init.method==='POST'?2:1})}));
  }});
  await api.state(id);const next=await renewChickenPresence(api);
  assert.equal(next.round.version,2);assert.equal(calls.length,2);
  assert.deepEqual(calls[1].body,{request_id:requestId,type:'action',game_id:id,model_version:'presence-fixture-r4',round_id:receipt().round_id,expected_version:1,action:'sync',input:{}});
  assert.equal(api.pending,null);
});

test('lost heartbeat responses replay the same identity then fetch current settlement before another action',async()=>{
  const calls=[],saved=storage();let posts=0;
  const api=new MachineAccountClient({storage:saved,newId:()=>requestId,fetchImpl:async(url,init)=>{
    calls.push({method:init.method,body:init.body?JSON.parse(init.body):null});
    if(init.method==='POST'){
      if(++posts===1)throw Error('Response lost after accepted heartbeat');
      return Response.json(snapshot({round:receipt({version:2})}));
    }
    return Response.json(posts===2?snapshot({balance:'500.02',round:receipt({version:3,status:'settled',payoutMinor:'102',allowedActions:[]})}):snapshot());
  }});
  await api.state(id);
  await assert.rejects(renewChickenPresence(api),{code:'ACTION_UNCONFIRMED'});
  assert.equal(pendingChickenSync(api.pending),true);
  await assert.rejects(renewChickenPresence(api),{code:'PENDING_ACTION'});
  const result=await renewChickenPresence(api,{retry:true});
  assert.deepEqual(calls.map(call=>call.method),['GET','POST','POST','GET']);
  assert.deepEqual(calls[1].body,calls[2].body);
  assert.equal(result.round.status,'settled');assert.equal(result.round.version,3);assert.equal(result.balance,'500.02');
  assert.equal(canSyncChickenPresence(definition,result),false);assert.equal(api.pending,null);
});

test('presence retries cannot reinterpret a pending wager or another action as a heartbeat',async()=>{
  for(const body of [{type:'start',game_id:id,action:'sync',input:{}},{type:'action',game_id:id,action:'collect',input:{}},{type:'action',game_id:id,action:'sync',input:{disconnected:true}}]){
    const api={gameId:id,pending:{body},retryPending(){throw Error('Must not submit');}};
    assert.equal(pendingChickenSync(api.pending),false);
    await assert.rejects(renewChickenPresence(api,{retry:true}),/matching Chicken/);
  }
});

const source=await readFile(new URL('../client/machine74-controller.mjs',import.meta.url),'utf8');
test('the controller action handler rejects GO, CASHOUT and a new start until presence uncertainty is resolved',async()=>{
  let calls=0;
  const context={working:false,refreshing:false,snapshot:snapshot(),disposed:false,presenceNeedsRefresh:true,chickenAutoTask:null,roundNeedsRecovery,api:{act:()=>calls++,start:()=>calls++}};
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf('async function run('),source.indexOf('\nconst play=')),context);
  for(const action of ['advance','collect','start'])assert.equal(await context.run(action),false);
  assert.equal(calls,0);
});
function controller(api){
  const nodes=new Map(),effects={draws:0,controls:0,wallet:0,messages:[]};
  const $=key=>{if(!nodes.has(key))nodes.set(key,{value:'1.00'});return nodes.get(key);};
  const context={api,game:structuredClone(definition),snapshot:snapshot(),disposed:false,working:false,refreshing:false,presenceNeedsRefresh:false,document:{hidden:false},autoplay:true,chickenAutoTask:null,animation:null,historyLoaded:true,demo:false,$,
    canSyncChickenPresence,pendingChickenSync,renewChickenPresence,activeRoundStake,roundNeedsRecovery,hasChickenAutoplay,
    updateControls:()=>effects.controls++,draw:()=>effects.draws++,walletChanged:()=>effects.wallet++,message:(text,error)=>effects.messages.push({text,error}),
    isPlinkoX:()=>false,isDestiny:()=>false,restorePlinkoOptions:false,restoreWheelBets:false,restoreTumbleOptions:false,restoreChargingOptions:false,
    audio:new Proxy({},{get(){throw Error('Presence must not play audio');}}),failure:error=>{throw error;}};
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function stopAutoplay(){'),source.indexOf('\nfunction chickenAutoSelection('))+source.slice(source.indexOf('async function syncPresence('),source.indexOf('\nfunction failure('))+
    source.slice(source.indexOf('async function refresh('),source.indexOf('\nasync function select(')),context);
  return {context,effects};
}

test('controller heartbeat updates only the receipt version without replaying the stage or notifying wallet unchanged',async()=>{
  const sent=[],api={gameId:id,pending:null,act:async(action,input)=>{sent.push({action,input});return snapshot({round:receipt({version:2})});}};
  const {context,effects}=controller(api);
  assert.equal(await context.syncPresence(),true);
  assert.deepEqual(sent,[{action:'sync',input:{}}]);assert.equal(context.snapshot.round.version,2);
  assert.equal(effects.draws,0);assert.equal(effects.wallet,0);assert.equal(context.animation,null);assert.equal(context.refreshing,false);
});

test('controller keeps GO blocked if replay succeeds but the fresh state read fails, until an explicit refresh succeeds',async()=>{
  let reads=0,posts=0;
  const api={gameId:id,pending:{body:{type:'action',game_id:id,action:'sync',input:{}}},
    retryPending:async()=>{posts++;api.pending=null;return snapshot({round:receipt({version:2})});},
    state:async()=>{if(++reads===1)throw Error('Fresh state unavailable');return snapshot({round:receipt({version:3})});}};
  const {context,effects}=controller(api);context.presenceNeedsRefresh=true;
  assert.equal(await context.syncPresence({retry:true}),false);
  assert.equal(posts,1);assert.equal(context.presenceNeedsRefresh,true);assert.equal(context.snapshot.round.version,1);
  assert.equal(await context.syncPresence(),false);assert.equal(posts,1);
  assert.equal(effects.draws,0);assert.equal(effects.wallet,0);
  await context.refresh({silent:true});
  assert.equal(context.presenceNeedsRefresh,false);assert.equal(context.snapshot.round.version,3);
  assert.equal(effects.draws,1);assert.equal(effects.wallet,0);
});

test('controller draws and reports only a server-confirmed timeout settlement',async()=>{
  const api={gameId:id,pending:null,act:async()=>snapshot({balance:'500.02',round:receipt({status:'settled',version:2,payoutMinor:'102',allowedActions:[]})})};
  const {context,effects}=controller(api);
  assert.equal(await context.syncPresence(),true);
  assert.equal(context.snapshot.round.status,'settled');assert.equal(effects.draws,1);assert.equal(effects.wallet,1);
  assert.equal(context.historyLoaded,false);assert.equal(effects.messages.length,1);
});
