// Execute the actual app and session wiring. Only rendering, DOM, clocks and
// HTTP are local fixtures; no provider, player account, or live wager is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {ExpansionSession,formatMoney,fromMinor,moneyMinor,getRoundActions,bindPlayerEvents} from '../client/session.mjs';
import {themeKind,frameList,featureLabel,displayFamily,gridGeometry,presentationFrame,providedRules,confirmedTowerAmounts} from '../client/scene.mjs';
import {stakeChoices,mineChoices,selectedChoice} from '../client/controls.mjs';
import {AutoplayController,autoplayProfile} from '../client/autoplay.mjs';

const SID='isolated-reference-session',MODEL='isolated-reference-v1';
const roundId=n=>`${String(n).padStart(8,'0')}-2222-4222-8222-222222222222`;
const defer=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(data)});
const source=await readFile(new URL('../client/app.mjs',import.meta.url),'utf8');
function definition(id='multihot40_native'){
 const family=id==='coinminer_native'?'mines':id==='towerrush_native'?'tower':'slots';
 return{id,name:'Isolated reference '+id,version:MODEL,launchable:true,type:family,family,minStake:'1.00',maxStake:'2.00',maxWin:'10000.00',defaultStake:'1.00',stakeValues:['1.00','2.00'],columns:5,rows:family==='mines'?5:3,paylines:family==='slots'?40:undefined,symbols:[{id:'a',label:'A',providerSymbolId:1}],controls:family==='mines'?{mines:{values:[1,2,3,5,7,10,17,20,24],default:3}}:{},referencePresentation:{manifestURL:'/native-library/reference-art/r1/isolated.json',manifestSha256:'a'.repeat(64),assetBaseURL:'/native-library/reference-art/r1/arcade/assets/',modelVersion:MODEL}};
}
function active(game){return{game_id:game.id,round_id:roundId(1),model_version:game.version,version:0,status:'active',stakeMinor:'100',currentCashoutMinor:'120',bankedMinor:'0',atRiskMinor:'120',picks:[],actions:game.family==='mines'?['pick','cashout']:['step','cashout']};}
function state(game,extra={}){return{game,game_id:game.id,authenticated:true,sessionId:SID,accepting:true,balance:'100.00',currency:'ETB',server_now:1000,round:null,other_active_game:null,...extra};}
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.handlers=new Map();this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this._value='';this.style={setProperty(name,value){this[name]=value;}};this.classList={toggle(){},add(){}};}
 get options(){return this.children.filter(child=>child?.tagName==='OPTION');}
 get value(){return this._value;}set value(value){const text=String(value);this._value=this.tagName==='SELECT'&&!this.options.some(option=>option.value===text)?'':text;}
 get selectedIndex(){return this.options.findIndex(option=>option.value===this._value);}set selectedIndex(value){this._value=this.options[value]?.value??'';}
 get lastElementChild(){return this.children.filter(child=>child instanceof Element).at(-1)??(this._fallback??=new Element('span'));}get lastChild(){return this.children.at(-1)??this.lastElementChild;}
 replaceChildren(...children){this.children=children;if(this.tagName==='SELECT')this.selectedIndex=0;}append(...children){this.children.push(...children);}
 setAttribute(name,value){this[name]=String(value);}getContext(){return{};}
 addEventListener(name,fn){if(!this.handlers.has(name))this.handlers.set(name,[]);this.handlers.get(name).push(fn);}removeEventListener(name,fn){this.handlers.set(name,(this.handlers.get(name)||[]).filter(item=>item!==fn));}
 emit(name,extra={}){for(const fn of this.handlers.get(name)||[])fn({type:name,target:this,preventDefault(){},...extra});}
 showModal(){this.open=true;}close(){this.open=false;}getBoundingClientRect(){return{left:0,top:0,right:400,bottom:640,width:400,height:640};}
}
async function host({game=definition(),round=null}={}){
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element(['stake','mines','autoplayCount'].includes(id)?'select':'div'));return elements.get(id);};
 const document=new Element(),window=new Element(),entries=new Map();document.getElementById=get;document.createElement=tag=>new Element(tag);document.createTextNode=text=>({textContent:text});document.documentElement=new Element();document.body=new Element();document.visibilityState='visible';window.sessionStorage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
 const h={get,document,window,posts:[],latest:state(game,{round}),readHandler:null,postHandler:null,reference:null,generic:null,symbolDraws:0};
 const fetchImpl=async(url,options={})=>{
  if(url.endsWith('/games.json'))return response([game]);
  if(options.method==='POST'){const pending=defer(),post={url,options,body:JSON.parse(options.body),...pending};h.posts.push(post);return h.postHandler?h.postHandler(post):pending.promise;}
  return h.readHandler?h.readHandler():response(h.latest);
 };
 let request=1000;
 class Session extends ExpansionSession{constructor(options){super({...options,fetchImpl,storage:window.sessionStorage,uuid:()=>roundId(request++),now:()=>1000,pause:async()=>{},timeoutMs:1000});}}
 class Scene{constructor(){this.ctx={};this.width=400;this.height=640;this.resizes=0;this.draws=0;h.generic=this;}setGame(){}resize(){this.resizes++;}draw(){this.draws++;}}
 class Reference{
  constructor(){this.calls=[];this.invalidations=[];this.resizes=0;h.reference=this;}
  setGame(value){this.game=value;return{status:'configured'};}resize(){this.resizes++;}invalidate(reason){this.invalidations.push(reason);}
  getCoinGeometry(width,height){const scale=Math.min(width/360,height/640);return{cells:Array.from({length:25},(_,index)=>({index,x:(18+(index%5)*64)*scale,y:(142+Math.floor(index/5)*64)*scale,width:59*scale,height:57*scale}))};}
  draw(value,options){const pending=defer(),call={state:structuredClone(value),options:{...options},finished:false,resolve:status=>{call.finished=true;pending.resolve({status});}};this.calls.push(call);if(!value.connected||!value.authenticated||value.error)call.resolve('cleared');return pending.promise;}
 }
 const context=vm.createContext({document,window,location:{pathname:'/games/'+game.id,origin:'https://isolated.example'},matchMedia:()=>({matches:true}),performance:{now:()=>0},requestAnimationFrame(){},setInterval(){},queueMicrotask,fetch:fetchImpl,ExpansionSession:Session,formatMoney,fromMinor,moneyMinor,getRoundActions,bindPlayerEvents,MachineScene:Scene,ReferencePresentationHost:Reference,themeKind,frameList,featureLabel,displayFamily,gridGeometry,drawSymbol:()=>h.symbolDraws++,presentationFrame,providedRules,confirmedTowerAmounts,stakeChoices,mineChoices,selectedChoice,AutoplayController,autoplayProfile});
 vm.runInContext(source.replace(/^import .*;\n/gm,'')+'\nglobalThis.testHost={getSession:()=>session,getState:()=>currentState,getReady:()=>presentationReady,getKey:()=>presentationKey,drawState,drawReference,resize,animate,autoplay};',context,{filename:'actual-client-reference-app.mjs'});
 h.api=context.testHost;
 h.lastDraw=()=>h.reference.calls.findLast(call=>!call.finished);
 h.paint=async(status='painted')=>{const call=h.lastDraw();assert.ok(call,'a reference draw must be pending');call.resolve(status);await flush();return call;};
 h.settle=async post=>{const prior=h.latest.round,receipt={...h.latest,round:{game_id:game.id,round_id:prior?.round_id??roundId(2),model_version:h.latest.game.version,version:(prior?.version??-1)+1,status:'settled',stakeMinor:'100',payoutMinor:'120',grid:[['a']],wins:[],actions:[]}};h.latest=receipt;post.resolve(response({...receipt,status:'SUCCESS',request_id:post.body.request_id}));await flush();};
 h.begin=()=>{get('autoplay').emit('click');get('autoplayForm').emit('submit');};
 await flush();assert.equal(h.api.getState().connected,true);return h;
}

test('pending or unavailable reference art blocks real start and autoplay handlers',async()=>{
 for(const status of ['error','unsupported','disposed']){
  const h=await host();assert.equal(h.get('play').disabled,true);assert.equal(h.get('autoplay').disabled,true);
  h.get('play').emit('click');h.begin();await flush();assert.equal(h.posts.length,0);assert.equal(h.get('autoplayDialog').open,false);
  await h.paint(status);assert.equal(h.get('presentationNote').hidden,false);assert.match(h.get('presentationNote').textContent,/unavailable/);
  h.get('play').emit('click');h.begin();await flush();assert.equal(h.posts.length,0);assert.equal(h.api.autoplay.snapshot().active,false);
 }
});

test('artwork failure stops a running autoplay batch after its already accepted receipt',async()=>{
 const h=await host();await h.paint();h.begin();await flush();assert.equal(h.posts.length,1);
 await h.settle(h.posts[0]);await h.paint('error');
 assert.equal(h.posts.length,1);assert.equal(h.api.autoplay.snapshot().active,false);assert.equal(h.get('play').disabled,true);
});

test('pending art blocks picks and steps while an accepted cashout remains available',async()=>{
 for(const id of ['coinminer_native','towerrush_native']){
  const game=definition(id),h=await host({game,round:active(game)});
  assert.equal(h.get('cashout').disabled,false);
  if(id==='coinminer_native'){assert.equal(h.get('mineGrid').hidden,true);assert.ok(h.get('mineGrid').children.every(button=>button.disabled));h.get('mineGrid').children[12].emit('click');}
  else{assert.equal(h.get('step').disabled,true);h.get('step').emit('click');}
  await flush();assert.equal(h.posts.length,0);
  await h.paint('error');h.get('cashout').emit('click');h.get('cashout').emit('click');await flush();
  assert.equal(h.posts.length,1);assert.equal(h.posts[0].body.action,'cashout');assert.equal(h.posts[0].body.model_version,MODEL);
  await h.settle(h.posts[0]);
 }
});

test('Coin overlay uses each reference cell rectangle and submits the selected index exactly once',async()=>{
 const game=definition('coinminer_native'),h=await host({game,round:active(game)});await h.paint();
 const grid=h.get('mineGrid'),geometry=h.reference.getCoinGeometry(h.generic.width,h.generic.height);
 assert.equal(grid.hidden,false);assert.equal(grid.style.display,'block');assert.equal(grid.style.pointerEvents,'none');assert.equal(grid.children.length,25);
 for(let index=0;index<25;index++){const button=grid.children[index],cell=geometry.cells[index];for(const[key,value]of Object.entries({left:cell.x,top:cell.y,width:cell.width,height:cell.height}))assert.equal(button.style[key],value+'px');assert.equal(button.style.position,'absolute');assert.equal(button.style.pointerEvents,'auto');}
 grid.children[17].emit('click');grid.children[17].emit('click');await flush();
 assert.equal(h.posts.length,1);assert.equal(h.posts[0].body.action,'pick');assert.deepEqual(h.posts[0].body.input,{index:17});assert.equal(h.posts[0].body.expected_version,0);
 await h.settle(h.posts[0]);
});

test('reference loading and failure never paint a generic substitute or synthesized help symbols',async()=>{
 const h=await host();h.api.animate(1000);await h.paint('error');h.api.animate(2000);h.get('help').emit('click');
 assert.equal(h.generic.draws,0);assert.equal(h.symbolDraws,0);assert.equal(h.get('rulesDialog').open,true);assert.equal(h.get('sound').hidden,true);
});

test('logout and delayed old paints cannot restore the balance, controls or Coin hit targets',async()=>{
 const game=definition('coinminer_native'),h=await host({game,round:active(game)}),old=h.lastDraw();
 h.window.emit('zplay:logout');assert.equal(h.get('wallet').textContent,'—');assert.equal(h.get('cashout').disabled,true);assert.equal(h.get('mineGrid').hidden,true);
 old.resolve('painted');await flush();
 assert.equal(h.api.getState().authenticated,false);assert.equal(h.api.getReady(),false);assert.equal(h.get('wallet').textContent,'—');assert.equal(h.get('mineGrid').hidden,true);
 h.get('cashout').emit('click');h.get('mineGrid').children[1].emit('click');h.get('play').emit('click');await flush();assert.equal(h.posts.length,0);
});

test('same-state completion never creates a resize loop and geometry/model changes invalidate the old paint',async()=>{
 const h=await host();const resizes=h.generic.resizes,draws=h.reference.calls.length;await h.paint();
 h.api.drawState(h.api.getState());h.api.animate(1000);await flush();assert.equal(h.generic.resizes,resizes);assert.equal(h.reference.calls.length,draws);
 const key=h.api.getKey();h.generic.width=430;h.api.resize();const resized=h.lastDraw();assert.notEqual(h.api.getKey(),key);assert.equal(h.get('play').disabled,true);assert.equal(resized.options.width,430);
 const next={...h.latest.game,version:'isolated-reference-v2',referencePresentation:{...h.latest.game.referencePresentation,modelVersion:'isolated-reference-v2'}};h.latest={...h.latest,game:next};await h.api.getSession().refresh();await flush();
 const current=h.lastDraw();assert.notEqual(current,resized);assert.equal(current.state.game.version,next.version);
 resized.resolve('painted');await flush();assert.equal(h.get('play').disabled,true);current.resolve('painted');await flush();assert.equal(h.get('play').disabled,false);
});

test('page suspension and offline events disable every action without accepting a late paint',async()=>{
 for(const event of ['pagehide','offline']){
  const game=definition('towerrush_native'),h=await host({game,round:active(game)});await h.paint();
  h.api.resize();const old=h.lastDraw();h.window.emit(event);
  assert.equal(h.get('step').disabled,true);assert.equal(h.get('cashout').disabled,true);
  old.resolve('painted');await flush();h.get('step').emit('click');h.get('cashout').emit('click');await flush();assert.equal(h.posts.length,0);
 }
});

test('explicit Refresh holds a new start until both the state read and reference repaint finish',async()=>{
 const h=await host();await h.paint();const read=defer();h.readHandler=()=>read.promise;
 h.get('refresh').emit('click');assert.equal(h.get('play').disabled,true);h.get('play').emit('click');await flush();assert.equal(h.posts.length,0);
 await h.paint();h.get('play').emit('click');await flush();
 const duringRead=h.posts.length;
 // Resolve all local I/O even if this assertion finds a regression.
 h.readHandler=null;read.resolve(response(h.latest));await flush();for(const post of h.posts)await h.settle(post);
 assert.equal(duringRead,0,'an explicit refresh must finish before a new paid start');
 if(h.lastDraw())await h.paint();assert.equal(h.get('play').disabled,false);
});
