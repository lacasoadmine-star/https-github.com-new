// Tests the exact deployed session bridge and r5 controller functions locally.
// Collaborators are deterministic in-memory fixtures; no production request,
// user credentials, real wallet, PostgreSQL, Redis or browser is involved.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {frontendSnapshot,extractFunction,root} from './qa-module-loader.mjs';
import {extendWithNative72} from './native72-deployed.mjs';

const checks=[];
async function check(name,fn){try{const detail=await fn();checks.push({name,passed:true,...(detail?{detail}:{})});console.log('PASS',name);}catch(error){checks.push({name,passed:false,error:error.stack});console.error('FAIL',name,error.message);}}
const sourceRoot=path.join(root,'current-worker/modules');
const sessionModule=await import(pathToFileURL(path.join(sourceRoot,'player-session-v236.mjs')).href);
let machineSource=await readFile(path.join(sourceRoot,'machine-routes.mjs'),'utf8');
machineSource=machineSource.replace("from './player-session-v236.mjs'","from "+JSON.stringify(pathToFileURL(path.join(sourceRoot,'player-session-v236.mjs')).href)).replace("import {assets,release,htmlTemplate} from './machine-assets-20261106.mjs';","const assets={},release='qa-exact-session-functions',htmlTemplate='';");
const {machineAPI,sessionIdentity}=await import('data:text/javascript;base64,'+Buffer.from(machineSource).toString('base64'));
const origin='https://superwin-player.apdiy61.workers.dev',tokenA='1'.repeat(64),tokenB='2'.repeat(64),cookieA='sw_session='+tokenA;
const sessionA=createHash('sha256').update('zplay-machine-session:'+tokenA).digest('hex');
const req=(pathname,{method='GET',cookie=cookieA,headers={},body}={})=>new Request(origin+pathname,{method,headers:{...(cookie?{cookie}:{}),...headers},...(body?{body}:{} )});
const localUpstream=(authenticated=true,wallet={currency:'ETB',balance:'1000.00'})=>{const calls=[];return {calls,fetch:async request=>{calls.push({url:request.url,method:request.method,cookie:request.headers.get('cookie')});return Response.json(new URL(request.url).pathname==='/api/slots/session'?{authenticated}:wallet);}};};

await check('machine-session uses only the existing authenticated Player cookie and server ETB balance',async()=>{
 const upstream=localUpstream();const response=await machineAPI(req('/api/machine-session'),{},null,upstream),data=await response.json();
 assert.deepEqual(data,{authenticated:true,currency:'ETB',balance:'1000.00',sessionId:sessionA});assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual(upstream.calls.map(r=>[new URL(r.url).pathname,r.method,r.cookie]),[['/api/slots/session','GET',cookieA],['/api/slots/balance','GET',cookieA]]);
 assert.equal(JSON.stringify(data).includes(tokenA),false);assert.equal(await sessionIdentity(req('/api/machine-session')),sessionA);
});
await check('missing or unauthenticated sessions cannot receive an authenticated balance',async()=>{
 const upstream=localUpstream();const missing=await machineAPI(req('/api/machine-session',{cookie:''}),{},null,upstream);assert.deepEqual(await missing.json(),{authenticated:false});assert.equal(upstream.calls.length,0);
 const unauthenticated=localUpstream(false);const response=await machineAPI(req('/api/machine-session'),{},null,unauthenticated);assert.deepEqual(await response.json(),{authenticated:false});assert.equal(unauthenticated.calls.length,1);
});
await check('machine-session rejects malformed or non-ETB wallet snapshots',async()=>{
 for(const wallet of [{currency:'USD',balance:'1000.00'},{currency:'ETB',balance:1000},{currency:'ETB',balance:'1000.001'}]){const response=await machineAPI(req('/api/machine-session'),{},null,localUpstream(true,wallet));assert.equal(response.status,502);assert.deepEqual(await response.json(),{detail:'INVALID_WALLET_RESPONSE'});}
});
await check('client-bound spin and gamble reject changed Player sessions and foreign origins before forwarding',async()=>{
 for(const endpoint of ['/api/slots/spin','/api/slots/gamble']){
  for(const opts of [{cookie:'sw_session='+tokenB,origin},{cookie:cookieA,origin:'https://foreign.invalid'},{cookie:cookieA,origin:''}]){
   let calls=0;const response=await machineAPI(req(endpoint,{method:'POST',cookie:opts.cookie,headers:{origin:opts.origin,'X-Zplay-Machine-Session':sessionA}}),{},null,{fetch:()=>{calls++;throw Error('must not forward');}});
   assert.equal(response.status,403);assert.deepEqual(await response.json(),{detail:'MACHINE_SESSION_CHANGED'});assert.equal(calls,0);
  }
  assert.equal(await machineAPI(req(endpoint,{method:'POST',headers:{origin,'X-Zplay-Machine-Session':sessionA}}),{},null,{}),null);
 }
});
await check('existing presence lease remains bound to the same Player session before paid API forwarding',async()=>{
 const now=1000000,secret='local-fixture-presence-secret-32-bytes-long',env={PLAYER_PRESENCE_KEY:secret},lease=await sessionModule.issue(tokenA,secret,now);
 const valid=await sessionModule.sessionGate(req('/api/slots/spin',{method:'POST',cookie:cookieA+'; __Host-zplay_presence='+lease,headers:{origin}}),env,{},null,{now});assert.equal(valid,null);
 for(const cookie of [cookieA,'sw_session='+tokenB+'; __Host-zplay_presence='+lease]){const response=await sessionModule.sessionGate(req('/api/slots/spin',{method:'POST',cookie,headers:{origin}}),env,{},null,{now});assert.equal(response.status,401);assert.equal((await response.json()).detail,'PLAYER_SESSION_EXPIRED');}
 const expired=await sessionModule.sessionGate(req('/api/slots/spin',{method:'POST',cookie:cookieA+'; __Host-zplay_presence='+lease,headers:{origin}}),env,{},null,{now:now+sessionModule.TTL});assert.equal(expired.status,401);
});

const snapshot=await frontendSnapshot();
const contract=await snapshot.load('contract.mjs'),registry=await snapshot.load('registry.mjs'),wallet=await snapshot.load('wallet.mjs');
const controller=await readFile(path.join(snapshot.target,'controller.mjs'),'utf8');
const core=extendWithNative72({MATH:{games:{},betLevels:[]},publicGames:()=>[]},{enabled:true,deluxeEnabled:true});
const gameId='habesha_fortune_5_native',model=core.getGame(gameId);
const minor=s=>{const[a,b='']=s.split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0').slice(0,2));};
const money=n=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
function winningReceipt(){
 const values=[...model.strips.map(s=>s.indexOf('symbol_0')),0];
 const result=core.spin(gameId,'1.00',{draw:()=>values.shift()});
 const finalWin=money(contract.units(result.finalWin)/100n),win=minor(finalWin),balanceAfter=money(100000n-100n+win);
 const receipt={currency:'ETB',balanceBefore:'1000.00',chargedStake:'1.00',finalWin,balanceAfter,netChange:money(win-100n)};
 return Object.assign(result,receipt,{walletReceipt:receipt,freeSpinsRemaining:0,totalWinningLines:result.winLines.length,roundBreakdown:{winLines:result.winLines.length,stages:1,wheelMultiplier:result.wheelMultiplier,mathVersion:result.mathVersion}});
}
const newStorage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key),data};};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const nextTick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let i=0;i<40;i++){if(predicate())return;await nextTick();}throw Error('LOCAL_HARNESS_PROGRESS_TIMEOUT');}

await check('WalletAdapter sends same-origin session binding and retains one idempotency token across interrupted retry',async()=>{
 const storage=newStorage(),calls=[];let interrupted=true;
 const api=new wallet.WalletAdapter({storage,fetcher:async(path,options)=>{calls.push({path,options});if(interrupted){interrupted=false;throw Error('local transport interrupted');}return Response.json(winningReceipt());}});api.bind(sessionA,gameId);
 await assert.rejects(api.spin('1.00',core.modelIdentity(gameId)));const saved=api.pending();await api.spin('1.00',core.modelIdentity(gameId));
 assert.equal(JSON.parse(calls[0].options.body).roundToken,JSON.parse(calls[1].options.body).roundToken);assert.equal(saved.roundToken,JSON.parse(calls[1].options.body).roundToken);
 for(const {path,options}of calls){assert.equal(path,'/api/slots/spin');assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.headers['X-Zplay-Machine-Session'],sessionA);}
 api.bind('b'.repeat(64),gameId);assert.equal(api.pending(),null);assert.equal(storage.data.size,1);api.close();
});

function controllerHarness({spinResponse=()=>Response.json(winningReceipt()),balanceResponse=()=>Response.json({currency:'ETB',balance:'1000.00'})}={}){
 const elements=new Map(),calls=[],audioEvents=[],rendererEvents=[],notices=[],storage=newStorage(),animation=deferred();
 const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,disabled:false});return elements.get(id);};
 const api=new wallet.WalletAdapter({storage,fetcher:async(path,options)=>{calls.push({path,options});if(path==='/api/slots/spin')return spinResponse(path,options);if(path==='/api/slots/balance')return balanceResponse(path,options);throw Error('UNEXPECTED_LOCAL_REQUEST:'+path);}});api.bind(sessionA,gameId);
 const renderer={presentedAt:0,dirty:false,particles:{clear(){}},beginPendingSpin(){const token={elapsed:0};this.pending=token;rendererEvents.push('pending');return token;},cancelPendingSpin(token){if(this.pending===token)this.pending=null;rendererEvents.push('cancel-pending');},setGameModel(){},start(){rendererEvents.push('start');return animation.promise;},speedUp(){rendererEvents.push('speed-up');},enableNativePresentation(){}};
 const state={value:'ready',get locked(){return !['ready','presenting','pending'].includes(this.value);}};
 const globals={...contract,...registry,...wallet,$:element,api,renderer,state,document:{hidden:false},matchMedia:()=>({matches:false}),console,
  disposed:false,signedIn:true,legacy:false,actionBusy:false,epoch:0,free:0,auto:0,autoEpoch:0,displayPendingWin:false,canGamble:false,gambleValue:'0.00',gambleAttempt:0,lastWin:'0.00',lastRound:null,lastRoundModel:null,latestKnown:null,balance:'1000.00',walletDisplayRevision:0,
  g:registry.gameConfig(gameId),currentModel:registry.gameConfig(gameId),machineId:gameId,gameId,versionedGame:true,authoritativeBalanceDisplay:true,
  bet:()=> '1.00',pending:()=>api.pending(),sameSession:async()=>true,nextSpinModel:async()=>{},selectNextModel:()=>{},update:()=>{},scheduleRefresh:()=>{},boot:async()=>{},
  setState(value){state.value=value;},notice:(text,retry)=>notices.push({text,retry}),signOut:()=>{globals.signedIn=false;state.value='signedout';},
  audio:{unlock:async()=>{},event:name=>audioEvents.push(name),collected:()=>audioEvents.push('collect'),stop:group=>audioEvents.push('stop:'+group)}
 };
 const context=vm.createContext(globals);
 for(const name of ['setBalance','refreshBalance','oneRound','collectWin'])vm.runInContext(extractFunction(controller,name),context,{filename:'r5-controller:'+name});
 context.setBalance('1000.00');
 return {context,api,storage,calls,elements,animation,rendererEvents,audioEvents,notices,renderer,state,close:()=>api.close()};
}
await check('valid native win appears at receipt time and Collect only finishes presentation without another credit',async()=>{
 const response=deferred(),h=controllerHarness({spinResponse:()=>response.promise}),receipt=winningReceipt();
 try{
  const round=h.context.oneRound();await until(()=>h.rendererEvents.includes('pending'));assert.equal(h.context.balance,'1000.00');assert.equal(h.state.value,'requesting');
  response.resolve(Response.json(receipt));await until(()=>h.rendererEvents.includes('start'));
  assert.equal(h.state.value,'animating');assert.equal(h.context.balance,receipt.balanceAfter);assert.equal(h.elements.get('balance').textContent,receipt.balanceAfter);
  h.animation.resolve();assert.equal(await round,true);assert.equal(h.context.balance,receipt.balanceAfter);assert.equal(h.context.displayPendingWin,false);assert.equal(h.api.pending(),null);
  const count=h.calls.length;h.context.collectWin();assert.equal(h.context.balance,receipt.balanceAfter);assert.equal(h.elements.get('balance').textContent,receipt.balanceAfter);assert.equal(h.context.gambleValue,'0.00');assert.equal(h.calls.length,count);assert.equal(h.audioEvents.filter(e=>e==='collect').length,1);
  h.context.collectWin();assert.equal(h.calls.length,count);assert.equal(h.audioEvents.filter(e=>e==='collect').length,1);
  return {balanceBefore:receipt.balanceBefore,balanceAfter:receipt.balanceAfter,win:receipt.finalWin,spinPosts:h.calls.filter(c=>c.path==='/api/slots/spin').length,collectPosts:0};
 }finally{h.close();}
});
await check('definite reserve 503 clears the saved request, stops pending motion and permits a fresh spin',async()=>{
 let reject=true;const h=controllerHarness({spinResponse:()=>reject?Response.json({detail:'HOUSE_RESERVE_INSUFFICIENT'},{status:503}):Response.json(winningReceipt())});try{assert.equal(await h.context.oneRound(),false);assert.equal(h.state.value,'ready');assert.equal(h.api.pending(),null);assert.equal(h.renderer.pending,null);assert.equal(h.context.balance,'1000.00');assert.equal(h.context.auto,0);assert.equal(h.rendererEvents.filter(e=>e==='start').length,0);assert.ok(h.notices.some(n=>/no/i.test(n.text)&&/charg/i.test(n.text)));const first=JSON.parse(h.calls[0].options.body).roundToken;reject=false;const retry=h.context.oneRound();await until(()=>h.rendererEvents.includes('start'));assert.notEqual(JSON.parse(h.calls[1].options.body).roundToken,first);h.animation.resolve();assert.equal(await retry,true);assert.equal(h.state.value,'ready');assert.equal(h.api.pending(),null);}finally{h.close();}
});
await check('unclassified 503 retains the same pending request for confirmation instead of risking another wager',async()=>{
 const h=controllerHarness({spinResponse:()=>Response.json({detail:'TEMPORARY_TRANSPORT_FAILURE'},{status:503})});try{assert.equal(await h.context.oneRound(),false);const saved=h.api.pending();assert.ok(saved);assert.equal(h.state.value,'pending');assert.equal(h.renderer.pending,null);assert.equal(h.context.balance,'1000.00');assert.equal(wallet.definitelyRejected(new wallet.ApiError('unknown',503,'TEMPORARY_TRANSPORT_FAILURE')),false);await h.context.oneRound();assert.equal(h.api.pending().roundToken,saved.roundToken);}finally{h.close();}
});
await check('late idle balance refresh cannot overwrite a newer settled spin receipt',async()=>{
 const delayed=deferred(),h=controllerHarness({balanceResponse:()=>delayed.promise}),receipt=winningReceipt();try{
  const refresh=h.context.refreshBalance();await until(()=>h.calls.some(c=>c.path==='/api/slots/balance'));
  const round=h.context.oneRound();await until(()=>h.rendererEvents.includes('start'));h.animation.resolve();assert.equal(await round,true);assert.equal(h.context.balance,receipt.balanceAfter);assert.equal(h.state.value,'ready');
  delayed.resolve(Response.json({currency:'ETB',balance:'1000.00'}));await refresh;assert.equal(h.context.balance,receipt.balanceAfter);assert.equal(h.elements.get('balance').textContent,receipt.balanceAfter);
  return {lateSnapshot:'1000.00',retainedReceipt:receipt.balanceAfter};
 }finally{h.close();}
});
await check('unchanged idle refresh still updates the server balance and stale old-session responses do not',async()=>{
 const unchanged=controllerHarness({balanceResponse:()=>Response.json({currency:'ETB',balance:'900.00'})});try{await unchanged.context.refreshBalance();assert.equal(unchanged.context.balance,'900.00');}finally{unchanged.close();}
 const delayed=deferred(),h=controllerHarness({balanceResponse:()=>delayed.promise});try{const refresh=h.context.refreshBalance();await until(()=>h.calls.length);h.api.bind('b'.repeat(64),gameId);h.context.setBalance('777.00');delayed.resolve(Response.json({currency:'ETB',balance:'1000.00'}));await refresh;assert.equal(h.context.balance,'777.00');}finally{h.close();}
});
await check('native receipt validation rejects tampered balance or final win before presentation',async()=>{
 const receipt=winningReceipt(),model=registry.gameConfigForReceipt(receipt);assert.equal(contract.validateRound(receipt,model,'1.00').balanceAfter,receipt.balanceAfter);
 for(const changed of [{balanceAfter:'99999.00'},{walletReceipt:{...receipt.walletReceipt,balanceAfter:'99999.00'}},{finalWin:'99999.00'}])assert.throws(()=>contract.validateRound({...receipt,...changed},model,'1.00'));
});

const report={generatedAt:new Date().toISOString(),source:'exact Worker session handlers and r5 frontend controller/WalletAdapter/contract',productionTransactions:0,networkCalls:0,browserRun:false,scope:'Source-function integration with mocked document elements, session and animation collaborators. Does not prove live authenticated gameplay, browser rendering, sound output, PostgreSQL/Redis concurrency or official probability equivalence.',files:Object.fromEntries(['controller.mjs','wallet.mjs','contract.mjs','registry.mjs'].map(name=>[name,snapshot.provenance[name]])),checks,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length};
await writeFile(path.join(root,'railway-recovery/session-controller-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,productionTransactions:0}));
if(report.failed)process.exitCode=1;
