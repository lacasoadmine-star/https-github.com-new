import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createRegistry} from '../shared/registry-core.mjs';
import {createContract} from '../shared/contract-core.mjs';
import {WalletAdapter,definitelyRejected} from '../shared/wallet.mjs';
import {MachineLifecycle} from '../shared/lifecycle.mjs';
import {SoundEngine} from '../shared/native-audio.mjs';
import {habesha} from '../games/habesha/habesha-model.mjs';
import {mh5deluxe} from '../games/deluxe/mh5deluxe-model.mjs';
import {extendWithNative72} from '../../../railway-recovery/native72-deployed.mjs';
import {extractFunction} from '../../../railway-recovery/qa-module-loader.mjs';
// All requests below use in-memory fixtures. No real wallet or network is used.
const engine=extendWithNative72({MATH:{games:{},betLevels:[]},publicGames:()=>[]},{enabled:true,deluxeEnabled:true});
const cases=[['habesha',habesha,'9b9ce28d00e73c55df5bfc6c36fb856c7c9f0e754480c64be16bb96a43c02881'],['deluxe',mh5deluxe,'340c951e96195158bc437b63f6e292ca2e8598040d57889feeaefb95161f4abb']];
const sessionA='a'.repeat(64),sessionB='b'.repeat(64);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key),data};};
async function until(predicate){for(let n=0;n<60;n++){if(predicate())return;await new Promise(resolve=>setImmediate(resolve));}throw Error('HARNESS_TIMEOUT');}
const source=await readFile(new URL('../shared/controller-core.mjs',import.meta.url),'utf8');
const cents=value=>{const [whole,fraction='']=value.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0').slice(0,2));};
const decimal=value=>`${value/100n}.${String(value%100n).padStart(2,'0')}`;
function receiptFor(definition){
 const game=engine.getGame(definition.id),draws=[...game.strips.map(strip=>strip.indexOf('symbol_0')),0],result=engine.spin(game.id,'1.00',{draw:()=>draws.shift()});
 const contract=createContract(createRegistry(definition,{},'fixture')),finalWin=decimal(contract.units(result.finalWin)/100n),balanceAfter=decimal(100000n-100n+cents(finalWin));
 const walletReceipt={currency:'ETB',balanceBefore:'1000.00',chargedStake:'1.00',finalWin,balanceAfter,netChange:decimal(cents(finalWin)-100n)};
 return Object.assign(result,walletReceipt,{walletReceipt,freeSpinsRemaining:0});
}
function harness(definition,{spinResponse=()=>Response.json(receiptFor(definition)),gambleResponse=()=>Response.json({}),balanceResponse=()=>Response.json({currency:'ETB',balance:'1000.00'}),sessionResponse=()=>Response.json({authenticated:true,sessionId:sessionA,currency:'ETB',balance:'1000.00'})}={}){
 const registry=createRegistry(definition,{},'fixture'),contract=createContract(registry),items=storage(),calls=[],elements=new Map(),animation=deferred(),rendererEvents=[],notices=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,disabled:false,open:false,close(){this.open=false;}});return elements.get(id);};
 const api=new WalletAdapter({storage:items,fetcher:async(path,options)=>{calls.push({path,options});if(path==='/api/slots/spin')return spinResponse(path,options);if(path==='/api/slots/gamble')return gambleResponse(path,options);if(path==='/api/slots/balance')return balanceResponse(path,options);if(path==='/api/machine-session')return sessionResponse(path,options);throw Error('UNEXPECTED_REQUEST:'+path);}});api.bind(sessionA,definition.id);
 const renderer={presentedAt:0,dirty:false,particles:{clear(){}},beginPendingSpin(){const token={};this.pending=token;rendererEvents.push('pending');return token;},cancelPendingSpin(token){if(this.pending===token)this.pending=null;rendererEvents.push('cancel-pending');},setGameModel(){},start(){rendererEvents.push('start');return animation.promise;},speedUp(){},enableNativePresentation(){},cancelPresentation(){}};
 const state=new contract.SpinState();state.move('ready');
 const globals={...registry,...contract,definitelyRejected,api,renderer,state,$:element,document:{hidden:false},matchMedia:()=>({matches:false}),console,
  disposed:false,signedIn:true,legacy:false,actionBusy:false,epoch:0,free:0,auto:0,autoEpoch:0,displayPendingWin:false,canGamble:false,gambleValue:'0.00',gambleAttempt:0,lastWin:'0.00',lastRound:null,lastRoundModel:null,latestKnown:null,balance:'1000.00',walletDisplayRevision:0,
  g:registry.gameConfig(definition.id),currentModel:registry.gameConfig(definition.id),machineId:definition.id,gameId:definition.id,versionedGame:true,authoritativeBalanceDisplay:true,
  bet:()=> '1.00',pending:()=>api.pending(),sameSession:async()=>true,nextSpinModel:async()=>{},selectNextModel:()=>{},update:()=>{},updateGamble:()=>{},scheduleRefresh:()=>{},boot:async()=>{},
  setState(value){state.move(value);},notice:(text,retry)=>notices.push({text,retry}),signOut:()=>{globals.signedIn=false;state.value='signedout';globals.epoch++;},gambleView:null,
  audio:{unlock:async()=>{},event(){},collected(){},stop(){},gambleSettled(){}},
 };
 const context=vm.createContext(globals);
 for(const name of ['setBalance','refreshBalance','oneRound','collectWin','gamble'])vm.runInContext(extractFunction(source,name),context,{filename:'shared-controller:'+name});
 context.setBalance('1000.00');return {context,api,storage:items,calls,elements,animation,rendererEvents,notices,renderer,state,close:()=>api.close()};
}
for(const [label,definition,pin] of cases){
 test(label+': isolated registry retains exact math and rejects foreign identity',()=>{
  const registry=createRegistry(definition,{},'fixture');assert.deepEqual(registry.games,[definition.id]);assert.equal(registry.gameConfig().mathSha256,pin);const actual=registry.gameConfig();for(const key of Object.keys(definition))assert.deepEqual(actual[key],definition[key]);
  assert.throws(()=>registry.gameConfig(cases.find(c=>c[1]!==definition)[1].id),/UNKNOWN_GAME/);assert.throws(()=>registry.gameConfig(definition.id,{...definition,mathSha256:'0'.repeat(64)}),/UNKNOWN_GAME_MODEL/);assert.throws(()=>registry.gameConfigForReceipt({...receiptFor(definition),gameId:'foreign-game'}),/ROUND_IDENTITY/);
  const mutable=registry.gameConfig();mutable.strips[0][0]='tampered';assert.notEqual(registry.gameConfig().strips[0][0],'tampered');
 });
 test(label+': receipt accepts a settled win and rejects ledger tampering',()=>{
  const registry=createRegistry(definition,{},'fixture'),contract=createContract(registry),receipt=receiptFor(definition),model=registry.gameConfig();assert.equal(contract.validateRound(receipt,model,'1.00'),receipt);
  for(const change of [{balanceAfter:'99999.00'},{finalWin:'99999.00'},{mathSha256:'0'.repeat(64)},{walletReceipt:{...receipt.walletReceipt,balanceAfter:'99999.00'}}])assert.throws(()=>contract.validateRound({...receipt,...change},model,'1.00'));
 });
 test(label+': all 3645 reel and multiplier combinations preserve the pinned engine payout',()=>{
  const registry=createRegistry(definition,{},'fixture'),contract=createContract(registry),model=registry.gameConfig();
  for(let a=0;a<9;a++)for(let b=0;b<9;b++)for(let c=0;c<9;c++)for(let wheel=0;wheel<5;wheel++){
   const draws=[a,b,c,wheel],result=engine.spin(definition.id,'1.00',{draw:()=>draws.shift()}),evaluation=contract.evaluate(model,contract.gridFromStops(model,[a,b,c]),'1.00',model.wheel.values[wheel]);assert.equal(contract.units(result.finalWin),evaluation.final);assert.equal(result.mathSha256,pin);
  }
 });
 test(label+': a verified settled spin survives a failed client renderer without CONFIRM or a second debit',async()=>{
  const receipt=receiptFor(definition),h=harness(definition,{spinResponse:()=>Response.json(receipt)});
  try{
   h.renderer.start=()=>{h.rendererEvents.push('start');return Promise.reject(Error('RENDERER_CRASH_AFTER_SETTLEMENT'));};
   assert.equal(await h.context.oneRound(),false);
   assert.equal(h.state.value,'ready');
   assert.equal(h.context.balance,receipt.balanceAfter);
   assert.equal(h.api.pending(),null,'a settled receipt must not stay pending');
   assert.equal(h.calls.filter(c=>c.path==='/api/slots/spin').length,1);
   assert.equal(h.context.lastRound.roundId,receipt.roundId);
   assert.ok(h.notices.some(n=>/round settled/i.test(n.text)));
  }finally{h.close();}
 });
 test(label+': settled balance precedes animation and Collect sends no request',async()=>{
  const h=harness(definition),receipt=receiptFor(definition);try{const round=h.context.oneRound();await until(()=>h.rendererEvents.includes('start'));assert.equal(h.context.balance,receipt.balanceAfter);h.animation.resolve();assert.equal(await round,true);assert.equal(h.api.pending(),null);assert.equal(h.state.value,'ready');const calls=h.calls.length;h.context.collectWin();assert.equal(h.context.balance,receipt.balanceAfter);assert.equal(h.context.gambleValue,'0.00');assert.equal(h.calls.length,calls);}finally{h.close();}
 });
 for(const [status,code]of [[402,'INSUFFICIENT_FUNDS'],[503,'HOUSE_RESERVE_INSUFFICIENT'],[503,'GAME_UNAVAILABLE']])test(label+': '+code+' resets CONFIRM',async()=>{
  const h=harness(definition,{spinResponse:()=>Response.json({detail:code},{status})});try{assert.equal(await h.context.oneRound(),false);assert.equal(h.state.value,'ready');assert.equal(h.api.pending(),null);assert.equal(h.context.balance,'1000.00');assert.equal(h.renderer.pending,null);assert.equal(h.rendererEvents.includes('start'),false);}finally{h.close();}
 });
 test(label+': unknown failure keeps original idempotency token',async()=>{
  const h=harness(definition,{spinResponse:()=>Response.json({detail:'UNKNOWN_UPSTREAM_FAILURE'},{status:503})});try{assert.equal(await h.context.oneRound(),false);const token=h.api.pending().roundToken;assert.equal(h.state.value,'pending');assert.equal(await h.context.oneRound(),false);assert.equal(h.api.pending().roundToken,token);const posts=h.calls.filter(c=>c.path==='/api/slots/spin');assert.equal(JSON.parse(posts[0].options.body).roundToken,JSON.parse(posts[1].options.body).roundToken);}finally{h.close();}
 });
 for(const reject of [false,true])test(label+': late '+(reject?'rejection':'receipt')+' cannot erase a newer token or balance',async()=>{
  const response=deferred(),h=harness(definition,{spinResponse:()=>response.promise});try{const old=h.context.oneRound();await until(()=>h.api.pending());const newer={...h.api.pending(),roundToken:crypto.randomUUID()};h.storage.setItem(h.api.key,JSON.stringify(newer));response.resolve(reject?Response.json({detail:'INSUFFICIENT_FUNDS'},{status:402}):Response.json(receiptFor(definition)));assert.equal(await old,false);assert.equal(h.api.pending().roundToken,newer.roundToken);assert.equal(h.context.balance,'1000.00');assert.equal(h.rendererEvents.includes('start'),false);assert.equal(h.state.value,'pending');}finally{h.close();}
 });
 test(label+': old account response cannot overwrite or sign out a new session',async()=>{
  for(const responseValue of [Response.json(receiptFor(definition)),Response.json({detail:'MACHINE_SESSION_CHANGED'},{status:403})]){
   const response=deferred(),h=harness(definition,{spinResponse:()=>response.promise});try{const old=h.context.oneRound();await until(()=>h.api.pending());h.context.epoch++;h.api.bind(sessionB,definition.id);h.context.setBalance('777.00');h.state.value='ready';response.resolve(responseValue);assert.equal(await old,false);assert.equal(h.context.balance,'777.00');assert.equal(h.context.signedIn,true);assert.equal(h.state.value,'ready');}finally{h.close();}
  }
 });
 test(label+': idle snapshot cannot overwrite a newer receipt',async()=>{
  const response=deferred(),h=harness(definition,{balanceResponse:()=>response.promise});try{const refresh=h.context.refreshBalance();await until(()=>h.calls.some(c=>c.path==='/api/slots/balance'));const round=h.context.oneRound();await until(()=>h.rendererEvents.includes('start'));h.animation.resolve();await round;const balance=h.context.balance;response.resolve(Response.json({currency:'ETB',balance:'1000.00'}));await refresh;assert.equal(h.context.balance,balance);}finally{h.close();}
 });
 test(label+': delayed session lookup cannot sign out a newer session',async()=>{
  const response=deferred(),h=harness(definition,{sessionResponse:()=>response.promise});try{vm.runInContext(extractFunction(source,'sameSession'),h.context);const check=h.context.sameSession();await until(()=>h.calls.length);h.context.epoch++;h.api.bind(sessionB,definition.id);h.context.setBalance('777.00');response.resolve(Response.json({authenticated:false}));assert.equal(await check,false);assert.equal(h.context.signedIn,true);assert.equal(h.context.balance,'777.00');}finally{h.close();}
 });
 test(label+': late gamble response leaves newer action and balance intact',async()=>{
  const response=deferred(),h=harness(definition,{gambleResponse:()=>response.promise});try{h.context.lastRound=receiptFor(definition);h.context.lastRoundModel=h.context.g;h.context.canGamble=true;h.context.gambleValue=h.context.lastRound.finalWin;const action=h.context.gamble('RED');await until(()=>h.api.pending(h.api.actionKey));const newer={...h.api.pending(h.api.actionKey),roundToken:crypto.randomUUID()};h.storage.setItem(h.api.actionKey,JSON.stringify(newer));response.resolve(Response.json({}));await action;assert.equal(h.api.pending(h.api.actionKey).roundToken,newer.roundToken);assert.equal(h.context.balance,'1000.00');assert.equal(h.context.actionBusy,false);}finally{h.close();}
 });
 test(label+': old-session gamble failure cannot sign out or unlock new session',async()=>{
  const response=deferred(),h=harness(definition,{gambleResponse:()=>response.promise});try{h.context.lastRound=receiptFor(definition);h.context.lastRoundModel=h.context.g;h.context.canGamble=true;h.context.gambleValue=h.context.lastRound.finalWin;const old=h.context.gamble('RED');await until(()=>h.api.pending(h.api.actionKey));h.context.epoch++;h.api.bind(sessionB,definition.id);h.context.setBalance('777.00');h.context.actionBusy=true;response.resolve(Response.json({detail:'MACHINE_SESSION_CHANGED'},{status:403}));await old;assert.equal(h.context.signedIn,true);assert.equal(h.context.balance,'777.00');assert.equal(h.context.actionBusy,true);}finally{h.close();}
 });
}
test('completion requires exact token and current session',async()=>{
 const data=storage(),api=new WalletAdapter({storage:data,fetcher:async()=>Response.json({})});api.bind(sessionA,habesha.id);await api.spin('1.00',habesha);const old=api.pending(),newer={...old,roundToken:crypto.randomUUID()};data.setItem(api.key,JSON.stringify(newer));assert.equal(api.complete(),false);assert.equal(api.complete(old),false);assert.equal(api.pending().roundToken,newer.roundToken);assert.equal(api.complete(newer),true);assert.equal(api.pending(),null);api.close();
});
test('old-session finally cannot release a newer busy operation',async()=>{
 const data=storage(),first=deferred(),second=deferred();let count=0;const api=new WalletAdapter({storage:data,fetcher:()=>++count===1?first.promise:second.promise});api.bind(sessionA,habesha.id);const old=api.spin('1.00',habesha),oldRecord=api.pending();api.bind(sessionB,habesha.id);const next=api.spin('1.00',habesha),newRecord=api.pending();assert.equal(api.busy,true);first.resolve(Response.json({}));await old;assert.equal(api.busy,true);assert.equal(api.complete(oldRecord),false);assert.equal(api.pending().roundToken,newRecord.roundToken);second.resolve(Response.json({}));await next;assert.equal(api.busy,false);api.close();
});
test('POST transport preserves captured session, same-origin and no-store',async()=>{
 const calls=[],api=new WalletAdapter({storage:storage(),fetcher:async(path,options)=>{calls.push({path,options});return Response.json({});}});api.bind(sessionA,habesha.id);await api.spin('1.00',habesha);assert.equal(calls[0].options.headers['X-Zplay-Machine-Session'],sessionA);assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.cache,'no-store');api.close();
});
test('pause reasons compose without automatic play restart',()=>{
 const calls=[],renderer={pause(){calls.push('pause');},resume(){calls.push('resume');}},life=new MachineLifecycle(renderer,{onPause(){calls.push('stop-auto');}});life.blur();life.visibility(true);life.focus(true);life.pageHide();life.visibility(false);life.focus(false);assert.deepEqual(calls,['pause','stop-auto']);life.pageShow({hidden:false,focused:true});assert.deepEqual(calls,['pause','stop-auto','resume']);life.dispose();life.focus(false);life.pageShow({hidden:false,focused:true});assert.deepEqual(calls,['pause','stop-auto','resume','pause','stop-auto']);
});
test('audio base owns no bank and respects suspension',async()=>{
 const audio=new SoundEngine();assert.deepEqual(audio.audioSamples,{});assert.equal(await audio.preload(),false);assert.equal(await audio.preloadBackground(),false);audio.reelWanted=true;audio.setSuspended(true);assert.equal(audio.playbackSuspended,true);assert.equal(audio.playSample('tap'),false);assert.equal(audio.backgroundLoop(),false);assert.equal(audio.reelWanted,true);await audio.dispose();
});
test('shared code imports no game models, renderers, art or audio banks',async()=>{
 for(const file of ['controller-core.mjs','native-audio.mjs','wallet.mjs','registry-core.mjs','contract-core.mjs','lifecycle.mjs'])assert.doesNotMatch(await readFile(new URL('../shared/'+file,import.meta.url),'utf8'),/habesha|mh5deluxe|hot_foxy|multi_hot_5_video|official-foxy|official-mh5|audio-banks\.mjs|audio-samples\.mjs/);
 for(const [game,definition]of cases){const text=await readFile(new URL('../games/'+game+'/registry.mjs',import.meta.url),'utf8');assert.equal([...text.matchAll(/from ['"]([^'"]+-model\.mjs)['"]/g)].length,1);assert.match(text,new RegExp(definition===habesha?'habesha-model':'mh5deluxe-model'));}
});
test('AUTO counts select only; START PLAY reads options',()=>{
 assert.doesNotMatch(source,/\[data-auto\][^\n]*click[^\n]*startAuto\(Number/);assert.match(source,/selectedAutoCount=Number\(b\.dataset\.auto\)/);assert.match(source,/official-auto-start[\s\S]*readAutoOptions/);
});
for(const [label]of cases)test(label+': START PLAY preserves an invalid helper result and only starts validated options',()=>{
 const listeners=new Map(),elements=new Map(),started=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{id});return elements.get(id);};
 const choices=[20,100].map(count=>({dataset:{auto:String(count)},setAttribute(){}}));
 let helperResult=null,reads=0;
 const controls={readAutoOptions(){assert.equal(this,controls);reads++;return helperResult;}};
 const context=vm.createContext({$:element,document:{querySelectorAll:()=>choices},
  listen:(node,event,callback)=>listeners.set(node,callback),nativeControls:controls,
  startAuto:options=>started.push(options),endHold(){},stopAuto(){},auto:0});
 // Execute the production event registrations, then dispatch actual stored click
 // handlers. An invalid enabled loss/win limit is represented by helper null.
 const handlers=source.slice(source.indexOf("listen($('auto'),'click'"),source.indexOf("\nlisten($('gamble-menu')"));
 vm.runInContext(handlers,context);
 listeners.get(choices[0])();
 assert.equal(started.length,0,'choosing a count cannot start autoplay');
 listeners.get(element('official-auto-start'))();
 assert.equal(reads,1);assert.equal(started.length,0,'invalid helper result must not fall back to a wager count');
 helperResult={count:20,stopOnWin:true,lossLimit:'4.00',winLimit:null};
 listeners.get(element('official-auto-start'))();
 assert.equal(reads,2);assert.equal(started.length,1);assert.equal(started[0],helperResult);
 context.nativeControls={};
 listeners.get(element('official-auto-start'))();
 assert.equal(started.length,2);assert.equal(started[1].count,20,'only a missing helper uses selected count');
});
for(const [label,definition]of cases)test(label+': delayed model or state lookup cannot replace newer session state',async()=>{
 for(const delayAt of ['model','state']){
  const response=deferred(),h=harness(definition);try{
   const initial=h.context.currentModel,code=source.slice(source.indexOf('async function nextSpinModel('),source.indexOf('\nfunction renderBetOptions'));
   let selected=0;h.context.selectNextModel=()=>selected++;
   h.context.advertisedModel=delayAt==='model'?()=>response.promise:async()=>({model:initial,remote:{...initial,enabled:true}});
   h.api.state=delayAt==='state'?()=>response.promise:async()=>{throw Error('STALE_LOOKUP_CONTINUED');};
   vm.runInContext(code,h.context);const next=h.context.nextSpinModel({refresh:true});await Promise.resolve();await Promise.resolve();
   h.context.epoch++;h.api.bind(sessionB,definition.id);const newer={...initial,marker:'newer-session'};h.context.currentModel=newer;h.context.free=0;
   response.resolve(delayAt==='model'?{model:initial,remote:{...initial,enabled:false}}:{gameId:definition.id,freeSpinsRemaining:0,...h.context.modelIdentity(initial)});
   assert.equal(await next,null);assert.equal(h.context.currentModel,newer);assert.equal(selected,0);
  }finally{h.close();}
 }
});
test('audio suspension stops both active and already retiring nodes immediately',async()=>{
 const audio=new SoundEngine(),stops=[],disconnects=[];
 audio.context={state:'running',currentTime:10,close:async()=>{}};
 const node=name=>({osc:{stop(...args){stops.push([name,...args]);},disconnect(){disconnects.push(name);}},gain:{disconnect(){},gain:{value:1,cancelScheduledValues(){throw Error('FADE_NOT_ALLOWED_WHEN_HIDDEN');}}},group:'effect'});
 audio.nodes.add(node('active'));audio.retiring.add(node('retiring'));audio.setSuspended(true);
 assert.equal(audio.nodes.size,0);assert.equal(audio.retiring.size,0);assert.deepEqual(stops,[['active'],['retiring']]);assert.deepEqual(disconnects,['active','retiring']);await audio.dispose();
});
