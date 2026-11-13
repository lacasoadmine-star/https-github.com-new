import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {games} from './games.mjs';
import {cents,amount} from './account.mjs';

const code=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
const html=await readFile(new URL('./game.html',import.meta.url),'utf8');
class Target {
  constructor(id=''){this.id=id;this.listeners=new Map();this.disabled=false;this.hidden=false;this.open=false;this.dataset={};this.style={};this.children=[];this.tagName='BUTTON';this.value='';this.attributes=new Map();this.parts=new Map();this.textContent='';}
  addEventListener(type,listener){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(listener);}
  emit(type,event={}){for(const listener of this.listeners.get(type)||[])listener({target:this,type,...event});}
  querySelector(selector){if(!this.parts.has(selector))this.parts.set(selector,new Target());return this.parts.get(selector);}
  getBoundingClientRect(){return {width:this.id==='game'?390:64,height:this.id==='game'?700:64};}
  getClientRects(){return [this.getBoundingClientRect()];}
  getContext(){return new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(object,key)=>key in object?object[key]:()=>{},set:(object,key,value)=>{object[key]=value;return true;}});}
  setAttribute(key,value){this.attributes.set(key,value);}
  replaceChildren(...children){this.children=children;}
  append(...children){this.children.push(...children);}
  showModal(){this.open=true;}
  close(){this.open=false;this.emit('close');}
}
async function fixture({assetFailure=false,reducedMotion=true}={}){
  const game=games[1],elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>[match[1],new Target(match[1])]));
  elements.get('auto-spins').value='10';elements.get('loss-limit').value='10.00';
  const document=new Target(),window=new Target(),frames=new Map(),intervals=new Map(),time={now:0};
  const f={elements,document,window,frames,intervals,connectCalls:0,spinCalls:0,assetCalls:0,assetFailure,failConnect:false,fullscreenRequests:0,gameFullscreenRequests:0,resizeDisconnected:0};
  document.getElementById=id=>{if(!elements.has(id))throw Error('Missing real markup ID '+id);return elements.get(id);};
  document.querySelectorAll=selector=>selector==='dialog'?[...elements.values()].filter(node=>node.id.endsWith('-dialog')):[];
  document.querySelector=selector=>selector==='dialog[open]'?[...elements.values()].find(node=>node.id.endsWith('-dialog')&&node.open)||null:null;
  document.createElement=()=>new Target();document.hidden=false;document.fullscreenEnabled=true;
  document.documentElement={requestFullscreen:async()=>{f.fullscreenRequests++;}};
  elements.get('game').requestFullscreen=async()=>{f.gameFullscreenRequests++;};
  document.exitFullscreen=async()=>{document.fullscreenElement=null;};
  let frameNumber=0,timerNumber=0;
  const serverState=()=>({authenticated:true,accepting:true,balance:'100.00',model:{betLevels:['2.00']},round:null,gamble:null});
  class Account {
    constructor(){this.state=null;this.stale=true;this.pending=null;f.account=this;}
    async connect(){f.connectCalls++;this.stale=true;if(this.state)this.state.accepting=false;if(f.failConnect)throw Error('offline');this.state=serverState();this.stale=false;return this.state;}
    spin(){f.spinCalls++;return new Promise(resolve=>{f.finishSpin=()=>{this.state.balance='98.00';resolve({result:{grid:game.preview,wheelMultiplier:2,winLines:[],finalWin:'0.00'}});};});}
    history(){return Promise.resolve({items:[]});}
  }
  class Art {constructor(frames){this.frames=frames;}async load(){}draw(){}canvas(){}}
  const context=vm.createContext({document,window,location:{pathname:'/new74/'+game.id},performance:{now:()=>time.now},devicePixelRatio:1,matchMedia:()=>({matches:reducedMotion}),
    Audio:class {play(){return Promise.resolve();}pause(){}},
    localStorage:{getItem:()=>'{"effects":false,"music":false,"volume":0.6}',setItem(){}},
    fetch:async()=>{f.assetCalls++;return {ok:!f.assetFailure,json:async()=>({[game.art]:{}})};},
    requestAnimationFrame:callback=>{const id=++frameNumber;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),
    setTimeout,clearTimeout,setInterval:callback=>{const id=++timerNumber;intervals.set(id,callback);return id;},clearInterval:id=>intervals.delete(id),
    ResizeObserver:class {observe(){}disconnect(){f.resizeDisconnected++;}},Date,console,
  });
  const module=new vm.SourceTextModule(code,{context,identifier:'pair-app'});
  const modules={
    './games.mjs':new vm.SyntheticModule(['games'],function(){this.setExport('games',games);},{context}),
    './account.mjs':new vm.SyntheticModule(['Account','cents','amount'],function(){this.setExport('Account',Account);this.setExport('cents',cents);this.setExport('amount',amount);},{context}),
    './art.mjs':new vm.SyntheticModule(['Art'],function(){this.setExport('Art',Art);},{context}),
  };
  await module.link(name=>modules[name]);await module.evaluate();
  f.flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  f.advance=now=>{time.now=now;const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback(now);};
  f.dispose=()=>window.emit('pagehide',{persisted:false});
  return f;
}

test('asset failure offers a working retry without a page reload or account request',async()=>{
  const f=await fixture({assetFailure:true});
  assert.equal(f.elements.get('spin').disabled,true);assert.equal(f.connectCalls,0);
  assert.equal(f.elements.get('recover').hidden,false);assert.match(f.elements.get('recover').textContent,/Dib u fur/);
  f.assetFailure=false;await f.elements.get('recover').onclick();
  assert.equal(f.assetCalls,2);assert.equal(f.connectCalls,1);assert.equal(f.elements.get('spin').disabled,false);f.dispose();
});

test('visibility resumes animation and STOP never starts a second request',async()=>{
  const f=await fixture({reducedMotion:false});f.elements.get('spin').onclick();assert.equal(f.spinCalls,1);
  f.document.hidden=true;f.document.emit('visibilitychange');assert.equal(f.frames.size,0);
  f.document.hidden=false;f.document.emit('visibilitychange');assert.equal(f.frames.size,1);
  f.elements.get('spin').onclick();assert.equal(f.spinCalls,1);
  f.finishSpin();await f.flush();f.advance(5000);await f.flush();assert.equal(f.elements.get('spin-label').textContent,'HOLD\n&\nSPIN');f.dispose();
});

test('failed account refresh disables SPIN and gives read-only reconnect control',async()=>{
  const f=await fixture();f.failConnect=true;
  f.document.hidden=true;f.document.emit('visibilitychange');f.document.hidden=false;f.document.emit('visibilitychange');await f.flush();
  assert.equal(f.elements.get('spin').disabled,true);assert.equal(f.elements.get('balance').textContent,'—');assert.equal(f.elements.get('recover').hidden,false);
  f.failConnect=false;await f.elements.get('recover').onclick();assert.equal(f.elements.get('spin').disabled,false);assert.equal(f.spinCalls,0);f.dispose();
});

test('bfcache pause/resume has one clock and one animation; permanent disposal releases both',async()=>{
  const f=await fixture({reducedMotion:false});assert.equal(f.intervals.size,1);assert.equal(f.frames.size,1);
  f.window.emit('pagehide',{persisted:true});assert.equal(f.intervals.size,0);assert.equal(f.frames.size,0);
  f.window.emit('pageshow',{persisted:true});await f.flush();assert.equal(f.intervals.size,1);assert.equal(f.frames.size,1);assert.equal(f.spinCalls,0);
  f.dispose();assert.equal(f.intervals.size,0);assert.equal(f.frames.size,0);assert.equal(f.resizeDisconnected,1);
});

test('reduced motion keeps no decorative frame loop while still settling a verified mocked receipt',async()=>{
  const f=await fixture();assert.equal(f.frames.size,0);f.elements.get('spin').onclick();assert.equal(f.spinCalls,1);
  f.document.hidden=true;f.document.emit('visibilitychange');f.document.hidden=false;f.document.emit('visibilitychange');assert.equal(f.frames.size,0);
  f.elements.get('spin').onclick();assert.equal(f.spinCalls,1);f.finishSpin();await f.flush();assert.equal(f.frames.size,0);assert.equal(f.elements.get('spin-label').textContent,'HOLD\n&\nSPIN');f.dispose();
});

test('fullscreen targets the document so the game retains its contained aspect ratio',async()=>{
  const f=await fixture();await f.elements.get('fullscreen').onclick();assert.equal(f.fullscreenRequests,1);assert.equal(f.gameFullscreenRequests,0);f.dispose();
});

test('a mixed cached account module without freshness support cannot enable a new spin',async()=>{
  const f=await fixture();f.account.stale=undefined;f.window.emit('blur');assert.equal(f.elements.get('spin').disabled,true);f.elements.get('spin').onclick();assert.equal(f.spinCalls,0);f.dispose();
});
