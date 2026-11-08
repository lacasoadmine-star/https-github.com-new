// Execute the real app wiring against the real session/controller in an isolated
// host. All fetch responses, account state and receipts below are local fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {ExpansionSession,formatMoney,fromMinor,moneyMinor,getRoundActions,bindPlayerEvents} from '../client/session.mjs';
import {themeKind,frameList,featureLabel,displayFamily,gridGeometry,drawSymbol,presentationFrame,providedRules,confirmedTowerAmounts} from '../client/scene.mjs';
import {stakeChoices,mineChoices,selectedChoice} from '../client/controls.mjs';
import {AutoplayController,autoplayProfile} from '../client/autoplay.mjs';

const ID='multihot40_native',SID='isolated-autoplay-session',MODEL='isolated-autoplay-v1';
const roundId=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const definition={id:ID,name:'Isolated MultiHot40',version:MODEL,launchable:true,type:'slots',family:'slots',minStake:'1.00',maxStake:'2.00',maxWin:'10000.00',defaultStake:'1.00',stakeValues:['1.00','2.00'],columns:5,rows:3,paylines:40,symbols:[{id:'a',label:'A',mark:'A',color:'#ffffff'}]};
const settled=(n,extra={})=>({game_id:ID,round_id:roundId(n),model_version:MODEL,version:0,status:'settled',stakeMinor:'100',payoutMinor:'0',grid:[['a']],wins:[],frames:[{grid:[['a']],wins:[],payoutMinor:'0'},{grid:[['a']],wins:[],payoutMinor:'0'}],actions:[],...extra});
const serverState=(extra={})=>({game:definition,game_id:ID,authenticated:true,sessionId:SID,accepting:true,balance:'100.00',currency:'ETB',server_now:1000,round:settled(99),other_active_game:null,...extra});
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(data)});
const defer=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));

class Element {
 constructor(tag='div') {this.tagName=tag.toUpperCase();this.children=[];this.handlers=new Map();this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this._value='';this.style={setProperty(){}};this.classList={toggle(){},add(){}};}
 get options(){return this.children.filter(child=>child?.tagName==='OPTION');}
 get value(){return this._value;}
 set value(value){const text=String(value);this._value=this.tagName==='SELECT'&&!this.options.some(option=>option.value===text)?'':text;}
 get selectedIndex(){return this.options.findIndex(option=>option.value===this._value);}
 set selectedIndex(value){this._value=this.options[value]?.value??'';}
 get lastElementChild(){return this.children.filter(child=>child instanceof Element).at(-1)??(this._fallback??=new Element('span'));}
 get lastChild(){return this.children.at(-1)??this.lastElementChild;}
 replaceChildren(...children){this.children=children;if(this.tagName==='SELECT')this.selectedIndex=0;}
 append(...children){this.children.push(...children);}
 setAttribute(name,value){this[name]=String(value);}
 addEventListener(name,fn){if(!this.handlers.has(name))this.handlers.set(name,[]);this.handlers.get(name).push(fn);}
 removeEventListener(name,fn){this.handlers.set(name,(this.handlers.get(name)||[]).filter(item=>item!==fn));}
 emit(name,extra={}){for(const fn of this.handlers.get(name)||[])fn({type:name,target:this,preventDefault(){},...extra});}
 showModal(){this.open=true;}
 close(){this.open=false;}
 getBoundingClientRect(){return {left:0,top:0,right:400,bottom:500,width:400,height:500};}
}
const storage=()=>{const entries=new Map();return {entries,getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};};
const appSource=await readFile(new URL('../client/app.mjs',import.meta.url),'utf8');

async function host({reducedMotion=false,store=storage(),initial=serverState()}={}) {
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,new Element(['stake','mines','autoplayCount'].includes(id)?'select':id.startsWith('autoplay')&&!['autoplayDialog','autoplayForm','autoplayRunning','autoplayStatus'].includes(id)?'input':'div'));return elements.get(id);};
 const document=new Element(),window=new Element();document.getElementById=get;document.createElement=tag=>new Element(tag);document.createTextNode=text=>({textContent:text});document.documentElement=new Element();document.body=new Element();document.visibilityState='visible';window.sessionStorage=store;
 const h={elements,get,document,window,store,posts:[],latest:initial,postHandler:null,api:null};
 const fetchImpl=async(url,options={})=>{
  if(url.endsWith('/games.json'))return response([definition]);
  if(options.method==='POST'){
   const pending=defer(),post={url,options,body:JSON.parse(options.body),...pending};h.posts.push(post);
   return h.postHandler?h.postHandler(post,h.posts.length):pending.promise;
  }
  return response(h.latest);
 };
 let request=1000;
 class IsolatedSession extends ExpansionSession {constructor(options){super({...options,fetchImpl,storage:store,uuid:()=>roundId(request++),now:()=>1000,pause:async()=>{},timeoutMs:1000});}}
 class Scene {constructor(){this.width=400;this.height=340;}setGame(){}resize(){}draw(){}}
 class ReferenceScene {setGame(){return{status:'unsupported'};}resize(){}invalidate(){}getCoinGeometry(){return null;}async draw(){return{status:'unsupported'};}}
 const context=vm.createContext({document,window,location:{pathname:'/games/'+ID,origin:'https://isolated.example'},matchMedia:()=>({matches:reducedMotion}),performance:{now:()=>0},requestAnimationFrame(){},setInterval(){},queueMicrotask,fetch:fetchImpl,ExpansionSession:IsolatedSession,formatMoney,fromMinor,moneyMinor,getRoundActions,bindPlayerEvents,MachineScene:Scene,ReferencePresentationHost:ReferenceScene,themeKind,frameList,featureLabel,displayFamily,gridGeometry,drawSymbol,presentationFrame,providedRules,confirmedTowerAmounts,stakeChoices,mineChoices,selectedChoice,AutoplayController,autoplayProfile});
 vm.runInContext(appSource.replace(/^import .*;\n/gm,'')+'\nglobalThis.testHost={autoplay,getSession:()=>session,getState:()=>currentState,getAnimation:()=>animation,drawState,queueAutoplay};',context,{filename:'actual-client-app.mjs'});
 h.api=context.testHost;
 h.receipt=(post,n,{balance=(100-n).toFixed(2),round=settled(n),...extra}={})=>{h.latest=serverState({balance,round,...extra});return response({...h.latest,status:'SUCCESS',request_id:post.body.request_id});};
 h.begin=({count=autoplayProfile(ID).counts[0],loss='',gain='',win=''}={})=>{get('autoplay').emit('click');assert.equal(get('autoplayDialog').open,true);get('autoplayCount').value=String(count);get('autoplayLoss').value=loss;get('autoplayGain').value=gain;get('autoplayWin').value=win;get('autoplayForm').emit('submit');};
 await flush();assert.equal(h.api.getSession().state.connected,true);return h;
}

test('real app waits for a new receipt and animation after the synchronous pending-before-busy emit',async()=>{
 const h=await host();h.begin();await flush();
 assert.equal(h.posts.length,1);assert.equal(h.api.autoplay.snapshot().active,true);assert.equal(h.api.autoplay.snapshot().completed,0);
 assert.equal(h.api.getState().round.round_id,roundId(99));assert.equal(h.api.getState().pending,true);
 h.posts[0].resolve(h.receipt(h.posts[0],1));await flush();
 assert.equal(h.api.autoplay.snapshot().completed,1);assert(h.api.getAnimation());assert.equal(h.posts.length,1);
 h.get('skip').emit('click');await flush();assert.equal(h.posts.length,2);
 assert.notEqual(h.posts[1].body.request_id,h.posts[0].body.request_id);assert.equal(h.posts[1].body.stake,'1.00');
 h.get('stopAutoplay').emit('click');h.posts[1].resolve(h.receipt(h.posts[1],2));await flush();h.get('skip').emit('click');await flush();
 assert.equal(h.posts.length,2);assert.equal(h.api.autoplay.snapshot().active,false);
});

test('closing settings, explicit stop, and pagehide before the queued callback produce no POST',async()=>{
 for(const action of ['close','stop','pagehide']){
  const h=await host();
  if(action==='close'){h.get('autoplay').emit('click');h.get('closeAutoplay').emit('click');}
  else {h.begin();if(action==='stop')h.get('stopAutoplay').emit('click');else h.window.emit('pagehide');}
  await flush();assert.equal(h.posts.length,0,action);assert.equal(h.api.autoplay.snapshot().active,false,action);
 }
});

test('a session change while an autoplay request is pending prevents all following starts',async()=>{
 const h=await host({reducedMotion:true});h.begin();await flush();assert.equal(h.posts.length,1);
 h.window.emit('zplay:session-changing');assert.equal(h.api.autoplay.snapshot().active,false);
 h.posts[0].resolve(h.receipt(h.posts[0],1));await flush();
 assert.equal(h.posts.length,1);assert.equal(h.api.getState().authenticated,false);assert.equal(h.store.entries.size,1);
 h.latest=serverState({sessionId:'different-session',balance:'12.00',round:null});h.window.emit('zplay:session-ready');await flush();
 assert.equal(h.api.getState().sessionId,'different-session');assert.equal(h.posts.length,1);assert.equal(h.api.autoplay.snapshot().active,false);
});

test('uncertain delivery retries only identical bytes and delayed confirmation never restarts autoplay',async()=>{
 const h=await host({reducedMotion:true});h.postHandler=()=>{throw Error('simulated lost response');};h.begin();await flush();
 assert.equal(h.posts.length,3);assert.equal(new Set(h.posts.map(post=>post.options.body)).size,1);assert.equal(h.api.autoplay.snapshot().active,false);assert.equal(h.api.getState().pending,true);
 h.latest=serverState({balance:'99.00',round:settled(1)});h.postHandler=post=>response({...h.latest,status:'SUCCESS',request_id:post.body.request_id,replayed:true});
 h.get('refresh').emit('click');await flush();
 assert.equal(h.posts.length,4);assert.equal(new Set(h.posts.map(post=>post.options.body)).size,1);assert.equal(h.api.getState().pending,false);assert.equal(h.api.autoplay.snapshot().active,false);
 await h.api.getSession().refresh();await flush();assert.equal(h.posts.length,4);
});

test('reload restores an unresolved intent without restoring or starting autoplay',async()=>{
 const store=storage(),h=await host({store,reducedMotion:true});h.postHandler=()=>{throw Error('simulated lost response');};h.begin();await flush();assert.equal(h.posts.length,3);
 const reloaded=await host({store,reducedMotion:true});await flush();assert.equal(reloaded.posts.length,0);assert.equal(reloaded.api.getState().pending,true);assert.equal(reloaded.api.autoplay.snapshot().active,false);assert.equal(reloaded.api.getSession().canStart(),false);
});

test('invalid preexisting stake cannot create an autoplay request',async()=>{
 const h=await host({reducedMotion:true});h.get('stake').value='';h.begin();await flush();
 assert.equal(h.posts.length,0);assert.equal(h.api.autoplay.snapshot().active,false);assert.equal(h.get('autoplayDialog').open,true);assert.equal(h.get('autoplayError').hidden,false);
});

test('finite autoplay consumes each new confirmed round exactly once with unique paid request IDs',async()=>{
 const h=await host({reducedMotion:true});const count=autoplayProfile(ID).counts.find(value=>Number.isInteger(value));
 h.postHandler=(post,n)=>h.receipt(post,n);h.begin({count});await flush();
 assert.equal(h.posts.length,count);assert.equal(h.api.autoplay.snapshot().completed,count);assert.equal(h.api.autoplay.snapshot().active,false);assert.equal(new Set(h.posts.map(post=>post.body.request_id)).size,count);
 await h.api.getSession().refresh();h.api.drawState(h.api.getState());h.api.queueAutoplay();await flush();assert.equal(h.posts.length,count);
});

test('an old-round echo after submission stops the batch instead of authorizing another wager',async()=>{
 const h=await host({reducedMotion:true});h.begin();await flush();
 h.posts[0].resolve(h.receipt(h.posts[0],1,{balance:'100.00',round:settled(99)}));await flush();
 assert.equal(h.posts.length,1);assert.equal(h.api.autoplay.snapshot().completed,0);assert.equal(h.api.autoplay.snapshot().active,false);
});

test('a changed model version during result animation requires a fresh explicit autoplay start',async()=>{
 const h=await host();h.begin();await flush();
 h.posts[0].resolve(h.receipt(h.posts[0],1));await flush();assert(h.api.getAnimation());
 h.latest={...h.latest,game:{...definition,version:'isolated-changed-rules-v2'}};
 await h.api.getSession().refresh();await flush();
 const stopped=h.api.autoplay.snapshot().active===false;
 h.get('skip').emit('click');await flush();
 const requestsAfterChange=h.posts.length;
 // Clean up a failing implementation's second local fixture request before
 // asserting, so this regression test never leaves a promise hanging.
 if(h.posts.length>1){h.get('stopAutoplay').emit('click');h.posts[1].resolve(h.receipt(h.posts[1],2));await flush();}
 assert.equal(stopped,true,'changing the model must stop the existing batch');
 assert.equal(requestsAfterChange,1,'a new model needs a fresh explicit Start');
});

test('a confirmed balance crossing the chosen net limit before the next launch prevents an extra wager',async()=>{
 for(const options of [{loss:'2.00',balance:'97.00'},{gain:'2.00',balance:'103.00'}]){
  const h=await host();h.begin(options);await flush();
  h.posts[0].resolve(h.receipt(h.posts[0],1));await flush();assert(h.api.getAnimation());
  h.latest={...h.latest,balance:options.balance};await h.api.getSession().refresh();await flush();
  h.get('skip').emit('click');await flush();const requestsAfterLimit=h.posts.length;
  if(h.posts.length>1){h.get('stopAutoplay').emit('click');h.posts[1].resolve(h.receipt(h.posts[1],2));await flush();}
  assert.equal(requestsAfterLimit,1,'confirmed balance already crossed the configured net threshold');
  assert.equal(h.api.autoplay.snapshot().active,false);
 }
});
