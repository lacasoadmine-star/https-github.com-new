import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {extractFunction} from '../../../railway-recovery/qa-module-loader.mjs';

// Runs the candidate's real boot/show/update/sign-out functions. API and view
// collaborators are local controlled promises; no session or wager is created.
const source=await readFile(new URL('../assets/controller.mjs',import.meta.url),'utf8');
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const flush=async()=>{for(let index=0;index<20;index++)await Promise.resolve();};
const savedChoice=()=>Object.freeze({roundId:'settled-parent',choice:'RED',expectedStake:'7.50',expectedAttempt:2});

function harness({authenticated=true,saved=null,stallAccount=false,holdStartup=false}={}){
 const log=[],account=deferred(),startup=deferred();
 const model={id:'habesha_fortune_5_native',features:{gambleRounds:5},betLevels:['0.05']};
 const parent={model,result:{roundId:'settled-parent',finalWin:'15.00'}};
 const nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',disabled:false,hidden:false,open:false,close(){this.open=false;log.push('dialog-close');},showModal(){this.open=true;log.push('dialog-open');}});return nodes.get(id);};
 node('gamble-dialog').open=true;
 const view={opened:true,state:{stake:'999.00',savedChoice:null},close(){this.opened=false;log.push('view-close');},update(value){this.state={...this.state,...value};},open(value){this.opened=true;this.state={...value};log.push('view-open');}};
 const sandbox={
  epoch:1,refreshTimer:null,signedIn:true,canGamble:true,lastRound:parent.result,lastRoundModel:model,latestKnown:parent,lastWin:'15.00',free:0,gambleValue:'999.00',displayPendingWin:false,gambleAttempt:1,
  state:{value:'presenting',locked:false},disposed:false,machineId:model.id,g:model,currentModel:model,legacy:false,balance:'1000.00',actionBusy:false,auto:0,audioControls:null,soundChoice:false,
  clearTimeout(){},notice(){},setState(value){sandbox.state.value=value;sandbox.state.locked=!['ready','presenting'].includes(value);log.push('state:'+value);},
  startupView:{begin(){log.push('startup-begin');},fail(reason){log.push('startup-fail:'+reason);},async complete(){log.push('startup-complete');if(holdStartup)await startup.promise;return true;}},
  gambleView:view,nativeControls:{ready:Promise.resolve()},helpView:{ready:Promise.resolve()},
  renderer:{artReady:Promise.resolve(),setGameModel(){},restore(){},enableNativePresentation(){},cancelPresentation(){}},
  audio:{setBackgroundEnabled(){},stop(){},event(){}},
  $:node,
  advertisedModel:async()=>{log.push('model-read');if(stallAccount)await account.promise;return{remote:{enabled:true},model};},
  api:{actionKey:'saved-action',session:async()=>{log.push('session-read');if(stallAccount)await account.promise;return{authenticated,currency:'ETB',balance:'1000.00',sessionId:'existing-session'};},bind(){log.push('bind');},legacyPending:()=>false,pending(key){log.push('pending-read:'+key);return key==='saved-action'?saved:null;},history:async()=>{log.push('history-read');return{items:[parent]};},completeAction(){throw Error('Bootstrap must not clear a saved action');}},
  pending:()=>null,selectNextModel(){},setBalance(value){sandbox.balance=value;},validateHistory:items=>items,nextSpinModel:async()=>{},
  savedGambleParent(action,entries){assert.equal(action,saved);assert.equal(entries[0],parent);log.push('saved-parent-validated');return parent;},
  endHold(){},stopAuto(){},update(){},scheduleRefresh(){},askSound(){log.push('ask-sound');}
 };
 const context=vm.createContext(sandbox);
 for(const name of ['updateGamble','showGamble','signOut','boot'])vm.runInContext(extractFunction(source,name),context);
 return{context,log,view,dialog:node('gamble-dialog'),node,account,startup,saved,run:()=>context.boot()};
}

test('navigation bootstrap closes stale gamble before any account wait and preserves the saved action',async()=>{
 const saved=savedChoice(),h=harness({saved,stallAccount:true});void h.run();
 assert.equal(h.dialog.open,false);assert.equal(h.view.opened,false);
 assert.deepEqual(h.log.slice(0,2),['view-close','dialog-close']);
 assert.equal(h.context.gambleValue,'0.00');assert.equal(h.context.canGamble,false);assert.equal(h.context.lastRound,null);
 await flush();assert.ok(h.log.includes('session-read'));assert.ok(!h.log.some(value=>value.startsWith('pending-read:')));
 assert.equal(h.saved,saved);assert.equal(saved.expectedStake,'7.50');
});

test('only a saved action reopens after authenticated history and startup restoration',async()=>{
 const saved=savedChoice(),h=harness({saved,holdStartup:true}),boot=h.run();await flush();
 assert.equal(h.dialog.open,false);assert.equal(h.view.opened,false);assert.ok(h.log.includes('saved-parent-validated'));
 assert.equal(h.context.gambleValue,'7.50');assert.equal(h.context.gambleAttempt,1);assert.ok(!h.log.includes('view-open'));
 h.startup.resolve();await boot;
 assert.equal(h.dialog.open,true);assert.equal(h.view.opened,true);assert.equal(h.view.state.stake,'7.50');assert.equal(h.view.state.savedChoice,'RED');assert.equal(h.view.state.recover,true);
 assert.equal(h.node('red').disabled,false);assert.equal(h.node('black').disabled,true);
 assert.ok(h.log.indexOf('view-open')>h.log.indexOf('startup-complete'));assert.equal(h.saved,saved);
});

test('authenticated restoration without a saved action leaves the old gamble closed',async()=>{
 const h=harness();await h.run();assert.equal(h.context.state.value,'ready');
 assert.equal(h.dialog.open,false);assert.equal(h.view.opened,false);assert.ok(!h.log.includes('view-open'));
 assert.equal(h.context.gambleValue,'0.00');assert.equal(h.context.canGamble,false);assert.equal(h.context.lastRound,null);
});

test('signed-out restoration never reopens gamble or clears an unconfirmed saved choice',async()=>{
 const saved=savedChoice(),h=harness({saved,authenticated:false});await h.run();
 assert.equal(h.context.state.value,'signedout');assert.equal(h.dialog.open,false);assert.equal(h.view.opened,false);
 assert.ok(h.log.includes('startup-fail:signedout'));assert.ok(!h.log.includes('bind'));assert.ok(!h.log.includes('history-read'));assert.ok(!h.log.includes('view-open'));
 assert.equal(h.saved,saved);assert.equal(saved.choice,'RED');assert.equal(saved.expectedStake,'7.50');
});

test('a delayed session check cannot sign out a newly bound Player',async()=>{
 const h=harness(),response=deferred();
 h.context.api.sessionId='first';
 h.context.api.session=()=>response.promise;
 vm.runInContext(extractFunction(source,'sameSession'),h.context);
 const check=h.context.sameSession();
 h.context.epoch++;
 h.context.api.sessionId='second';
 response.resolve({authenticated:false});
 assert.equal(await check,false);
 assert.equal(h.context.signedIn,true);
});

test('late gamble rejection preserves the next session and its active gamble',async()=>{
 const h=harness(),response=deferred(),sent=deferred();
 Object.assign(h.context,{sameSession:async()=>true});
 h.context.audio.unlock=async()=>{};
 h.view.pending=()=>true;
 h.context.api.gamble=()=>{sent.resolve();return response.promise;};
 vm.runInContext(extractFunction(source,'gamble'),h.context);
 const gamble=h.context.gamble('RED');
 await sent.promise;
 h.context.epoch++;
 h.context.api.sessionId='second';
 response.resolve(Promise.reject(Object.assign(new Error('session expired'),{status:401})));
 await gamble;
 assert.equal(h.context.signedIn,true);
 assert.equal(h.context.actionBusy,true);
});

test('Deluxe closes its previous gamble before the account check',async()=>{
 const h=harness({stallAccount:true});
 h.context.machineId='multi_hot_5_deluxe_native';
 void h.run();
 assert.equal(h.dialog.open,false);
 assert.equal(h.view.opened,false);
});
