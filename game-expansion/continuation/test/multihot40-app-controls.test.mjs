import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {ExpansionSession,bindPlayerEvents,moneyMinor,fromMinor,formatMoney,getRoundActions} from '../client/session.mjs';
import {AutoplayController} from '../client/autoplay.mjs';
import {SpinHold} from '../client/spin-hold.mjs';
import * as engine from '../models/multihot40-rules.mjs';

const SOURCE=await readFile(new URL('../client/multihot40-app.mjs',import.meta.url),'utf8');
const HTML=await readFile(new URL('../client/multihot40.html',import.meta.url),'utf8');
const ID=engine.ID,MODEL=engine.VERSION,SID='isolated-multihot40-session',NOW=1794096000000;
const roundId=n=>`${String(n).padStart(8,'0')}-3333-4333-8333-333333333333`;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const defer=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(data)});
const store=()=>{const values=new Map();return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const manifest={id:ID,grid:{columns:5,rows:4}},manifestBytes=Buffer.from(JSON.stringify(manifest));
const config={...structuredClone(engine.publicConfig),launchable:true,referencePresentation:{manifestURL:'/manifest.json',manifestSha256:createHash('sha256').update(manifestBytes).digest('hex'),assetBaseURL:'/art/',modelVersion:MODEL}};
function active(n=1){
 const result=engine.evaluateDraftRound(ID,{stakeMinor:'40'},()=>0,NOW);
 return {...engine.publicState(result.state,NOW),round_id:roundId(n),game_id:ID,model_version:MODEL,version:0};
}
function settled(n=1){return {...active(n),status:'settled',payoutMinor:'20000',currentCashoutMinor:'20000',reason:'COLLECTED',settledAt:NOW+1,actions:[],version:1};}
function serverState(extra={}){return {game:{...config,math:'Server description string'},game_id:ID,authenticated:true,sessionId:SID,accepting:true,balance:'10000.00',currency:'ETB',server_now:NOW,round:null,other_active_game:null,...extra};}

class Element{
 constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.handlers=new Map();this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this.value='';this.checked=false;this.href='/';this.style={setProperty(name,value){this[name]=value;}};const classes=new Set();this.classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle:(name,enabled)=>enabled===undefined?(classes.has(name)?classes.delete(name):classes.add(name)):enabled?classes.add(name):classes.delete(name)};}
 replaceChildren(...items){this.children=items;this.textContent='';}append(...items){this.children.push(...items);}setAttribute(name,value){this[name]=String(value);}
 addEventListener(name,fn){if(!this.handlers.has(name))this.handlers.set(name,[]);this.handlers.get(name).push(fn);}removeEventListener(name,fn){this.handlers.set(name,(this.handlers.get(name)||[]).filter(handler=>handler!==fn));}
 emit(name,extra={}){for(const fn of this.handlers.get(name)||[])fn({type:name,target:this,preventDefault(){},...extra});}click(){if(!this.disabled)this.emit('click');}
 showModal(){this.open=true;}close(){this.open=false;}getBoundingClientRect(){return {left:0,top:0,right:390,bottom:680,width:390,height:680};}
}
const text=node=>node.textContent+' '+node.children.map(item=>item instanceof Element?text(item):String(item)).join(' ');

async function host({initial=serverState(),storage=store(),artFailure=false}={}){
 const elements=new Map([...HTML.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],new Element('div',match[1])]));
 const get=id=>{if(!elements.has(id))elements.set(id,new Element('div',id));return elements.get(id);};
 const document=new Element(),window=new Element();document.getElementById=get;document.querySelectorAll=selector=>selector==='[id]'?[...elements.values()]:[];
 document.createElement=tag=>new Element(tag);document.createElementNS=(namespace,tag)=>Object.assign(new Element(tag),{namespaceURI:namespace});document.visibilityState='visible';document.activeElement=new Element('body');
 const h={get,document,window,storage,posts:[],history:[],latest:structuredClone(initial),postHandler:null,historyHandler:null,presenter:null};
 const fetchImpl=async(input,options={})=>{
  const url=String(input);
  if(url.endsWith('/games.json'))return response([config]);
  if(url.endsWith('/manifest.json'))return {ok:true,status:200,arrayBuffer:async()=>Uint8Array.from(manifestBytes).buffer};
  if(url.includes('/api/expansion/history')){
   const pending=defer(),request={url,options,...pending};h.history.push(request);return h.historyHandler?h.historyHandler(request):pending.promise;
  }
  if(options.method==='POST'){
   const pending=defer(),post={url,options,body:JSON.parse(options.body),...pending};h.posts.push(post);return h.postHandler?h.postHandler(post):pending.promise;
  }
  return response(h.latest);
 };
 let sequence=100;
 class Session extends ExpansionSession{constructor(options){super({...options,fetchImpl,storage,uuid:()=>roundId(++sequence),now:()=>NOW,pause:async()=>{},timeoutMs:1000});}}
 class Presentation{
  constructor(canvas,{onEvent}){this.onEvent=onEvent;this.calls=[];this.speeds=0;this.state={};h.presenter=this;}
  configure(){}async load(){if(artFailure)throw Error('fixture artwork unavailable');}layout(){return {controls:{}};}resize(){}render(){}
  setState(value){this.calls.push(structuredClone(value));Object.assign(this.state,value);}speedUp(){this.speeds++;}dispose(){this.disposed=true;}
  complete(id=this.state.roundId){this.onEvent({type:'animation-complete',roundId:id});}
 }
 const context=vm.createContext({document,window,location:{pathname:'/games/'+ID,origin:'https://isolated.example',href:''},
  localStorage:store(),sessionStorage:storage,crypto:webcrypto,URL,TextDecoder,TextEncoder,Uint8Array,Date,
  fetch:fetchImpl,queueMicrotask,requestAnimationFrame:()=>1,cancelAnimationFrame(){},setInterval(){},
  ExpansionSession:Session,bindPlayerEvents,moneyMinor,fromMinor,formatMoney,getRoundActions,AutoplayController,SpinHold,MultiHot40Presentation:Presentation});
 const source=SOURCE.replace(/^import .*;\n/gm,'').replace('void boot();','globalThis.bootPromise=boot();');
 vm.runInContext(source+'\nglobalThis.testHost={doStart,collectWin,gamble,showHistory,showReplay,enteredGame,canStart,actionAllowed,getSession:()=>session,getState:()=>state,getVisualBusy:()=>visualBusy,auto,hold};',context,{filename:'actual-multihot40-app.mjs'});
 h.api=context.testHost;await context.bootPromise;
 if(!artFailure){assert.equal(h.api.getSession()?.state.connected,true);h.api.enteredGame(false);}
 h.receipt=(post,extra={})=>{h.latest=serverState({...h.latest,...extra});return response({...h.latest,status:'SUCCESS',request_id:post.body.request_id});};
 h.beginAuto=({count=25,win='',loss='',gain=''}={})=>{get('auto').click();get('autoCount').value=String(count);get('autoWin').value=win;get('autoLoss').value=loss;get('autoGain').value=gain;get('autoForm').emit('submit');};
 return h;
}

test('collect then Spin is ordered, uses one new request ID and never spends before collection confirms',async()=>{
 const h=await host({initial:serverState({round:active(1)})});
 const play=h.api.doStart();assert.equal(h.posts.length,1);assert.equal(h.posts[0].body.action,'collect');
 h.get('spin').emit('click');assert.equal(h.posts.length,1);
 h.posts[0].resolve(h.receipt(h.posts[0],{round:settled(1),balance:'10200.00'}));await flush();
 assert.equal(h.posts.length,2);assert.equal(h.posts[1].body.type,'start');assert.equal(h.posts[1].body.stake,'0.40');
 assert.notEqual(h.posts[0].body.request_id,h.posts[1].body.request_id);
 h.posts[1].resolve(h.receipt(h.posts[1],{round:active(2),balance:'10199.60'}));await play;
 assert.equal(h.posts.length,2);
});

test('page navigation or hiding during collection prevents the following paid Spin',async()=>{
 for(const event of ['pagehide','hidden']){
  const h=await host({initial:serverState({round:active(1)})});
  const play=h.api.doStart();assert.equal(h.posts[0].body.action,'collect');
  if(event==='pagehide')h.window.emit('pagehide');else{h.document.visibilityState='hidden';h.document.emit('visibilitychange');}
  h.postHandler=post=>h.receipt(post,{round:active(2),balance:'10199.60'});
  h.posts[0].resolve(h.receipt(h.posts[0],{round:settled(1),balance:'10200.00'}));await play;
  assert.equal(h.posts.length,1,event+' must not submit a new paid start after collection');
 }
});

test('releasing HOLD during collection prevents the next paid Spin',async()=>{
 const h=await host({initial:serverState({round:active(1)})});h.api.hold.active=true;
 const play=h.api.doStart({holding:true});assert.equal(h.posts.length,1);assert.equal(h.posts[0].body.action,'collect');
 h.api.hold.stop();h.posts[0].resolve(h.receipt(h.posts[0],{round:settled(1),balance:'10200.00'}));await play;
 assert.equal(h.posts.length,1);assert.equal(h.api.hold.active,false);
});

test('STOP during a pending or confirmed spin accelerates only the presentation',async()=>{
 const h=await host(),play=h.api.doStart();assert.equal(h.posts.length,1);
 h.get('spin').emit('click');h.get('spin').emit('click');assert.equal(h.presenter.speeds,2);assert.equal(h.posts.length,1);
 h.posts[0].resolve(h.receipt(h.posts[0],{round:active(1),balance:'9999.60'}));await play;
 h.get('spin').emit('click');assert.equal(h.presenter.speeds,3);assert.equal(h.posts.length,1);
 h.presenter.complete();assert.equal(h.api.getVisualBusy(),false);
});

test('autoplay requests automatic collection and cannot start again before animation or after its win limit',async()=>{
 const h=await host();h.beginAuto({win:'0.01'});await flush();assert.equal(h.posts.length,1);
 assert.deepEqual(h.posts[0].body.options,{autoCollect:true});assert.equal(h.api.auto.snapshot().active,true);
 h.posts[0].resolve(h.receipt(h.posts[0],{round:settled(1),balance:'10199.60'}));await flush();
 assert.equal(h.posts.length,1);assert.equal(h.api.auto.snapshot().active,false);assert.equal(h.api.auto.snapshot().reason,'win_limit');
 h.presenter.complete();await flush();assert.equal(h.posts.length,1);
});

test('unconfirmed delivery retains one body and Retry never creates a fresh wager',async()=>{
 const h=await host();h.postHandler=()=>{throw Error('isolated lost response');};
 assert.equal(await h.api.doStart(),false);assert.equal(h.posts.length,3);
 assert.equal(new Set(h.posts.map(post=>post.options.body)).size,1);assert.equal(h.api.getState().pending,true);
 assert.equal(h.api.canStart(),false);
 h.latest=serverState({round:active(1),balance:'9999.60'});
 h.postHandler=post=>response({...h.latest,status:'SUCCESS',request_id:post.body.request_id,replayed:true});
 assert.equal(await h.api.getSession().retry(),true);
 assert.equal(h.posts.length,4);assert.equal(new Set(h.posts.map(post=>post.options.body)).size,1);assert.equal(h.api.getState().pending,false);
});

test('a session change during a pending wager cannot revive the old account or submit another start',async()=>{
 const h=await host(),play=h.api.doStart();h.window.emit('zplay:session-changing');
 h.posts[0].resolve(h.receipt(h.posts[0],{round:active(1),balance:'9999.60'}));await play;
 assert.equal(h.api.getState().authenticated,false);assert.equal(h.posts.length,1);assert.equal(h.storage.values.size,1);
 h.latest=serverState({sessionId:'isolated-other-session',round:null,balance:'300.00'});
 await h.api.getSession().refresh();assert.equal(h.api.getState().sessionId,'isolated-other-session');assert.equal(h.posts.length,1);
});

test('history requested by the old session never paints after identity changes',async()=>{
 const h=await host(),history=h.api.showHistory();assert.equal(h.history.length,1);
 h.latest=serverState({sessionId:'isolated-other-session',balance:'300.00'});await h.api.getSession().refresh();
 h.history[0].resolve(response({authenticated:true,sessionId:SID,game_id:ID,currency:'ETB',rows:[{createdAt:NOW,round:{...settled(1),stakeMinor:'1234500',payoutMinor:'9876500'}}]}));
 await history;
 assert.ok(!text(h.get('historyContent')).includes('98,765.00'),'old account history must not appear');
});

test('read-only history replay creates no financial request or live-round change',async()=>{
 const h=await host({initial:serverState({round:active(2)})}),before=structuredClone(h.api.getState().round);
 h.api.showReplay({createdAt:NOW,round:settled(1)});
 assert.equal(h.posts.length,0);assert.deepEqual(h.api.getState().round,before);assert.equal(h.presenter.speeds,0);
});

test('a string server math description retains the catalogue exact native profile in the session',async()=>{
 const h=await host();assert.equal(h.api.getState().game.math.nativeReturn.percent,'95.9014892578125');
 assert.equal(h.api.getState().game.math.officialPrivateMathVerified,false);
});

test('artwork failure leaves authenticated Take Win available without entering or placing another wager',async()=>{
 const h=await host({initial:serverState({round:active(1)}),artFailure:true});
 assert.equal(h.api.getState().authenticated,true);assert.equal(h.api.getState().connected,true);
 assert.equal(h.api.canStart(),false);assert.equal(h.api.actionAllowed('gamble'),false);
 assert.equal(h.api.actionAllowed('collect'),true);assert.equal(h.get('recoveryPanel').hidden,false);
 assert.equal(h.get('recoveryCollect').hidden,false);assert.equal(h.get('recoveryCollect').disabled,false);
 const collect=h.api.collectWin();assert.equal(h.posts.length,1);assert.equal(h.posts[0].body.action,'collect');
 h.posts[0].resolve(h.receipt(h.posts[0],{round:settled(1),balance:'10200.00'}));await collect;
 assert.equal(h.api.getState().round.status,'settled');assert.equal(h.posts.length,1);
 assert.equal(h.api.canStart(),false);assert.equal(h.get('recoveryCollect').hidden,true);
});
