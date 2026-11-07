import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// Execute the shipped client against an isolated DOM and HTTP fixture. No
// browser session, live service, production account or database is contacted.
const source=await readFile(new URL('../balloon.js',import.meta.url),'utf8');
const GAME='balloon_native',SESSION='a'.repeat(64),ROUND='11111111-1111-4111-8111-111111111111';
const game={id:GAME,version:'superwin-balloon-1',minStake:'0.10',maxStake:'100.00'};
const active=(extra={})=>({game_id:GAME,round_id:ROUND,model_version:game.version,status:'active',version:1,startedAt:Date.now(),stakeMinor:'10',expiresAt:Date.now()+3000,maxMultiplier:25000,...extra});
const settled=(extra={})=>active({status:'settled',version:2,payoutMinor:'11',coefficient:110,reason:'COLLECTED',...extra});
const state=(extra={})=>({sessionId:SESSION,game,game_id:GAME,model_version:game.version,balance:'10.00',currency:'ETB',server_now:Date.now(),accepting:true,other_active_game:null,round:null,...extra});
const receipt=(body,extra={})=>state({status:'SUCCESS',request_id:body.request_id,...extra});
const reply=(body,status=200)=>Response.json(body,{status});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function until(check){for(let i=0;i<50;i++){if(check())return;await flush();}assert.fail('Fixture did not reach expected state');}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
async function fixture(initial=state()){
 const elements=new Map(),intervals=new Map(),windowEvents=new Map(),requests=[];let timerId=0;
 let handler=async()=>reply(initial);
 function element(id){
  if(elements.has(id))return elements.get(id);
  const listeners=new Map(),classes=new Set();
  const e={id,textContent:'',disabled:false,attributes:{},selectedIndex:0,options:[{value:'0.10'},{value:'1.00'}],
   classList:{add(k){classes.add(k);},remove(k){classes.delete(k);},toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},
   setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,v){listeners.set(k,v);},
   getBoundingClientRect(){return {width:390,height:500};},getContext(){return {setTransform(){}};},setPointerCapture(){},listeners};
  Object.defineProperty(e,'value',{get(){return this.options[this.selectedIndex].value;}});
  elements.set(id,e);return e;
 }
 const context=vm.createContext({console,crypto:webcrypto,Response,Date,AbortController,
  fetch:(url,opts)=>{requests.push({url,body:opts?.body,headers:opts?.headers,method:opts?.method||'GET'});return handler(url,opts);},
  document:{getElementById:element,visibilityState:'visible',addEventListener(){}},
  window:{devicePixelRatio:1,addEventListener(k,v){windowEvents.set(k,v);}},requestAnimationFrame(){},
  setInterval(fn,ms){const id=++timerId;intervals.set(id,{fn,ms});return id;},clearInterval(id){intervals.delete(id);},
  // Retry backoff is immediate in tests; actual fetch timeout remains 5s.
  setTimeout(fn,ms){return setTimeout(fn,ms===150||ms===350?0:ms);},clearTimeout});
 vm.runInContext(source+'\nglobalThis.api={status,apply,canStart,loadState,perform,startRound,collectRound,retryPending,pointerDown,pointerUp,stopHeartbeat};',context);
 await flush();
 return {api:context.api,elements,intervals,windowEvents,requests,setFetch(fn){handler=fn;},posts(){return requests.filter(r=>r.method==='POST');}};
}

test('disabled new rounds and other active games cannot submit a new stake',async()=>{
 for(const initial of [state({accepting:false}),state({other_active_game:'jetx_native'}),state({accepting:undefined})]){
  const f=await fixture(initial);assert.equal(f.api.canStart(),false);assert.equal(f.elements.get('holdButton').disabled,true);
  await f.api.startRound();assert.equal(f.posts().length,0);
 }
});

test('accepted round collects under its stored model even after new betting is disabled',async()=>{
 const f=await fixture(state({accepting:false,game:{...game,version:'superwin-balloon-2'},round:active()}));
 f.setFetch(async(url,opts)=>reply(receipt(JSON.parse(opts.body),{accepting:false,game:{...game,version:'superwin-balloon-2'},round:settled()})));
 const result=await f.api.perform('collect');assert.equal(result.ok,true);
 const body=JSON.parse(f.posts()[0].body);assert.equal(body.model_version,'superwin-balloon-1');assert.equal(body.action,'collect');
});

test('a delayed pre-start poll cannot replace a new round or restore the old balance',async()=>{
 const oldRound=settled(),f=await fixture(state({round:oldRound})),poll=deferred();
 const freshRound=active({round_id:'22222222-2222-4222-8222-222222222222',version:0});
 f.setFetch(async(url,opts)=>{
  if(opts.method!=='POST')return poll.promise;
  const body=JSON.parse(opts.body);return reply(receipt(body,{round:{...freshRound,version:body.type==='start'?0:1},balance:'9.90'}));
 });
 const pendingPoll=f.api.loadState({quiet:true});f.api.status.pointerDown=true;
 await f.api.startRound();await until(()=>!f.api.status.working);f.api.stopHeartbeat();
 poll.resolve(reply(state({round:oldRound,balance:'10.00'})));await pendingPoll;
 assert.equal(f.api.status.round.round_id,freshRound.round_id);assert.equal(f.api.status.round.status,'active');assert.equal(f.api.status.balance,'9.90');
 assert.equal(f.posts().filter(r=>JSON.parse(r.body).type==='start').length,1);
});

test('manual refresh during a mutation does not start a competing state request',async()=>{
 const f=await fixture(state({round:active()})),post=deferred();f.setFetch(()=>post.promise);
 const pending=f.api.perform('collect');const count=f.requests.length;
 assert.equal(await f.api.loadState(),null);assert.equal(f.requests.length,count);
 post.resolve(reply(receipt(JSON.parse(f.posts()[0].body),{round:settled()})));await pending;
 assert.equal(f.api.status.round.status,'settled');
});

test('lost start response retries one frozen wager intent and reads fresh state after replay',async()=>{
 const f=await fixture(),fresh=state({round:settled(),balance:'10.01'});let count=0;
 f.api.status.pointerDown=true;
 f.setFetch(async(url,opts)=>{
  if(opts.method!=='POST')return reply(fresh);
  const body=JSON.parse(opts.body);count++;
  if(count===1)throw TypeError('response lost after commit');
  return reply(receipt(body,{round:active({version:0}),balance:'9.90',current_balance:'10.01',replayed:true}));
 });
 await f.api.startRound();const posts=f.posts();assert.equal(posts.length,2);
 assert.equal(posts[0].body,posts[1].body);assert.equal(posts[0].headers['X-Zplay-Balloon-Session'],posts[1].headers['X-Zplay-Balloon-Session']);
 assert.equal(new Set(posts.map(r=>JSON.parse(r.body).request_id)).size,1);
 assert.equal(f.api.status.round.status,'settled');assert.equal(f.api.status.balance,'10.01');assert.equal(f.api.status.requestInFlight,null);
});

test('uncertain collect retries identical bytes and does not restore the replay receipt snapshot',async()=>{
 const f=await fixture(state({round:active()}));let count=0;
 const latest=settled({version:3,payoutMinor:'12'});
 f.setFetch(async(url,opts)=>{
  if(opts.method!=='POST')return reply(state({round:latest,balance:'10.02'}));
  const body=JSON.parse(opts.body);if(++count===1)return reply({error:'RETRY_SAME_REQUEST'},503);
  return reply(receipt(body,{round:settled({version:2}),balance:'10.01',current_balance:'10.02',replayed:true}));
 });
 await f.api.collectRound();assert.equal(f.posts().length,2);assert.equal(f.posts()[0].body,f.posts()[1].body);
 assert.equal(f.api.status.round.version,3);assert.equal(f.api.status.balance,'10.02');assert.equal(f.api.status.collectRequested,false);
});

test('exhausted uncertain starts block replacement wagers; Retry keeps the original stake and ID',async()=>{
 const f=await fixture();f.api.status.pointerDown=true;
 f.setFetch(async(url,opts)=>{if(opts.method==='POST')throw TypeError('network unavailable');return reply(state());});
 await f.api.startRound();assert.equal(f.posts().length,3);assert.notEqual(f.api.status.requestInFlight,null);assert.equal(f.api.canStart(),false);
 const frozen=f.posts()[0].body;await f.api.startRound();assert.equal(f.posts().length,3);
 f.elements.get('stake').selectedIndex=1;
 f.setFetch(async(url,opts)=>reply(receipt(JSON.parse(opts.body),{round:settled({reason:'POPPED',payoutMinor:'0',coefficient:0}),balance:'9.90'})));
 await f.api.retryPending();assert.equal(f.posts().length,4);assert.ok(f.posts().every(r=>r.body===frozen));
 assert.equal(JSON.parse(f.posts()[3].body).stake,'0.10');assert.equal(f.api.status.requestInFlight,null);
});

test('an account session change stops retry instead of using the new session for the old stake',async()=>{
 const f=await fixture(),nextSession='b'.repeat(64);
 f.setFetch(async(url,opts)=>{
  if(opts.method!=='POST')return reply(state({sessionId:nextSession}));
  f.api.status.session=nextSession;throw TypeError('session changed during outage');
 });
 await f.api.startRound();assert.equal(f.posts().length,1);assert.equal(f.posts()[0].headers['X-Zplay-Balloon-Session'],SESSION);
 assert.equal(f.api.status.requestInFlight,null);assert.equal(f.api.status.session,nextSession);
});

test('a definitive version rejection refreshes and creates a new collect ID at the new version',async()=>{
 const f=await fixture(state({round:active()}));let count=0;
 f.setFetch(async(url,opts)=>{
  if(opts.method!=='POST')return reply(state({round:active({version:2})}));
  const body=JSON.parse(opts.body);if(++count===1)return reply({error:'ROUND_VERSION_CHANGED'},409);
  return reply(receipt(body,{round:settled({version:3})}));
 });
 await f.api.collectRound();const bodies=f.posts().map(r=>JSON.parse(r.body));
 assert.equal(bodies.length,2);assert.notEqual(bodies[0].request_id,bodies[1].request_id);assert.equal(bodies[0].expected_version,1);assert.equal(bodies[1].expected_version,2);
 assert.equal(f.api.status.round.status,'settled');
});

test('release during an in-flight hold stops heartbeats and collects once after that hold resolves',async()=>{
 const f=await fixture(state({round:active()})),hold=deferred();
 f.setFetch(async(url,opts)=>{const body=JSON.parse(opts.body);return body.action==='hold'?hold.promise:reply(receipt(body,{round:settled({version:3})}));});
 f.api.pointerDown({button:0,pointerId:1});assert.equal(f.posts().length,1);
 f.api.pointerUp();assert.equal(f.intervals.size,1); // only the ordinary state poll remains
 hold.resolve(reply(receipt(JSON.parse(f.posts()[0].body),{round:active({version:2})})));
 await until(()=>f.api.status.round.status==='settled');
 const actions=f.posts().map(r=>JSON.parse(r.body).action);assert.deepEqual(actions,['hold','collect']);
 assert.equal(JSON.parse(f.posts()[1].body).expected_version,2);
});

test('a keyboard release on window is retained while the initial stake is pending',async()=>{
 const f=await fixture(),start=deferred();
 f.setFetch(async(url,opts)=>{const body=JSON.parse(opts.body);return body.type==='start'?start.promise:reply(receipt(body,{round:settled()}));});
 f.elements.get('holdButton').listeners.get('keydown')({code:'Space',repeat:false,preventDefault(){}});
 assert.equal(f.api.status.pendingStart,true);assert.equal(f.elements.get('holdButton').disabled,false);
 f.windowEvents.get('keyup')({code:'Space',preventDefault(){}});assert.equal(f.api.status.pointerDown,false);
 start.resolve(reply(receipt(JSON.parse(f.posts()[0].body),{round:active({version:0}),balance:'9.90'})));
 await until(()=>f.api.status.round?.status==='settled');
 assert.deepEqual(f.posts().map(r=>JSON.parse(r.body).type==='start'?'start':JSON.parse(r.body).action),['start','collect']);
});

test('known disabled-start rejection is definitive even though its HTTP status is 503',async()=>{
 const f=await fixture();f.setFetch(async(url,opts)=>opts.method==='POST'?reply({error:'LIBRARY_NEW_ROUNDS_DISABLED'},503):reply(state({accepting:false})));
 await f.api.startRound();assert.equal(f.posts().length,1);assert.equal(f.api.status.requestInFlight,null);assert.equal(f.api.canStart(),false);
});

test('a rejected old-session start never collects the newly signed-in account round',async()=>{
 const f=await fixture(),nextSession='b'.repeat(64),otherRound=active({round_id:'22222222-2222-4222-8222-222222222222'});
 f.setFetch(async(url,opts)=>opts.method==='POST'?reply({error:'BALLOON_SESSION_CHANGED'},403):reply(state({sessionId:nextSession,round:otherRound})));
 await f.api.startRound();await flush();
 assert.equal(f.posts().length,1);assert.equal(JSON.parse(f.posts()[0].body).type,'start');
 assert.equal(f.api.status.session,nextSession);assert.equal(f.api.status.round.round_id,otherRound.round_id);assert.equal(f.api.status.collectRequested,false);
});

test('retrying an old collection never collects a newer round from another tab',async()=>{
 const f=await fixture(state({round:active()}));
 f.setFetch(async(url,opts)=>{if(opts.method==='POST')throw TypeError('network unavailable');return reply(state({round:active()}));});
 await f.api.collectRound();assert.equal(f.posts().length,3);
 const nextRound=active({round_id:'22222222-2222-4222-8222-222222222222',version:0});
 f.setFetch(async(url,opts)=>opts.method==='POST'?reply(receipt(JSON.parse(opts.body),{round:settled(),replayed:true})):reply(state({round:nextRound})));
 await f.api.retryPending();await flush();
 assert.equal(f.posts().length,4);assert.ok(f.posts().every(r=>JSON.parse(r.body).round_id===ROUND));
 assert.equal(f.api.status.round.round_id,nextRound.round_id);
});

test('a replayed start cannot begin a heartbeat for a different later round',async()=>{
 const f=await fixture();f.api.status.pointerDown=true;let count=0;
 const nextRound=active({round_id:'22222222-2222-4222-8222-222222222222',version:0});
 f.setFetch(async(url,opts)=>{
  if(opts.method!=='POST')return reply(state({round:nextRound}));
  if(++count===1)throw TypeError('start response lost');
  return reply(receipt(JSON.parse(opts.body),{round:active({version:0}),replayed:true}));
 });
 await f.api.startRound();await flush();
 assert.equal(f.posts().length,2);assert.ok(f.posts().every(r=>JSON.parse(r.body).type==='start'));
 assert.equal(f.api.status.holdLoop,null);assert.equal(f.api.status.round.round_id,nextRound.round_id);
});

test('release intent resumes after a replay state-read failure without claiming round completion',async()=>{
 const f=await fixture();let postCount=0;
 f.setFetch(async(url,opts)=>{
  if(opts.method!=='POST')throw TypeError('state read temporarily unavailable');
  if(++postCount===1)throw TypeError('start response lost');
  return reply(receipt(JSON.parse(opts.body),{round:active({version:0}),replayed:true}));
 });
 await f.api.startRound();
 assert.equal(f.api.status.connected,false);assert.equal(f.api.status.confirming,true);assert.equal(f.api.status.collectRequested,true);
 assert.notEqual(f.elements.get('notice').textContent,'Round complete.');assert.equal(f.posts().length,2);
 f.setFetch(async(url,opts)=>opts.method==='POST'?reply(receipt(JSON.parse(opts.body),{round:settled()})):reply(state({round:active({version:0}),balance:'9.90'})));
 await f.api.loadState({quiet:true});await until(()=>f.api.status.round?.status==='settled');
 assert.equal(f.posts().length,3);const collection=JSON.parse(f.posts()[2].body);
 assert.equal(collection.action,'collect');assert.equal(collection.round_id,ROUND);assert.equal(f.api.status.confirming,false);
});

test('a definitively rejected new stake does not collect an unrelated pre-existing round',async()=>{
 const f=await fixture();f.setFetch(async(url,opts)=>opts.method==='POST'?reply({error:'FINISH_ACTIVE_ROUND:balloon_native'},409):reply(state({round:active()})));
 await f.api.startRound();await flush();
 assert.equal(f.posts().length,1);assert.equal(JSON.parse(f.posts()[0].body).type,'start');assert.equal(f.api.status.intentRound,null);
});
