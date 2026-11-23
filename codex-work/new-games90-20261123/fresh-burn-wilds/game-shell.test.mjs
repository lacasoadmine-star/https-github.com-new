import test from 'node:test';
import assert from 'node:assert/strict';
import {mountBurnWildsGameShell} from './game-shell.mjs';

class Element {
  constructor(tag='div') {
    this.tagName=tag.toUpperCase();this.dataset={};this.style={};this.children=[];
    this.textContent='';this.hidden=false;this.disabled=false;
    this.parentNode=null;this.listeners=new Map();
  }
  setAttribute(key,value){this[key]=value;}
  replaceChildren(...children){this.children=children;for(const child of children)child.parentNode=this;}
  append(...children){for(const child of children){this.children.push(child);child.parentNode=this;}}
  contains(node){let item=node;while(item){if(item===this)return true;item=item.parentNode;}return false;}
  addEventListener(type,fn){this.listeners.set(type,fn);}
  removeEventListener(type){this.listeners.delete(type);}
}
const doc=()=>{
  const document={createElement:type=>new Element(type),listeners:new Map()};
  document.addEventListener=(k,v)=>document.listeners.set(k,v);
  document.removeEventListener=k=>document.listeners.delete(k);
  return document;
};
const fixture=()=>{
  const document=doc(),root=new Element(),calls=[];
  const state={phase:'READY',canSpin:true,canBet:true,needsRecovery:false,
    balanceMinor:10250,betMinor:200,muted:true,autoplayRemaining:0,
    autoplayCounts:[25,50,100],betLevelsMinor:[100,200,400]};
  const controls={
    controller:{snapshot:()=>({...state})},notify:()=>{},
    view:()=>({...state}),
    spin:async()=>{calls.push('spin');state.phase='ANIMATING';state.canSpin=false;},
    stop:()=>{calls.push('stop');return true;},
    setBet:n=>{calls.push('bet:'+n);state.betMinor=n;},
    startAutoplay:async n=>{calls.push('auto:'+n);state.autoRemaining=n;},
    cancelAutoplay:()=>{calls.push('cancel');},
    toggleMute:()=>{calls.push('mute');state.muted=!state.muted;},
    openPanel:()=>{},closePanel:()=>{},
    keyboard:()=>false
  };
  const ui=mountBurnWildsGameShell({root,document,controls});
  return {ui,controls,state,root,document,calls};
};
test('creates code-based canvas with nine accessible actions',()=>{
  const {ui,root}=fixture();
  assert.equal(root.children.length,1);
  assert.equal(ui.canvas.tagName,'CANVAS');
  assert.ok(ui.button('spin'));
  assert.ok(ui.button('stop'));
  assert.ok(ui.button('settings'));
  assert.ok(ui.button('take-win').disabled);
  assert.ok(ui.button('turbo').disabled);
  assert.ok(ui.button('paytable').disabled);
});
test('binds a single real SPIN event and disables double input',async()=>{
  const {ui,calls,state}=fixture();
  assert.equal(await ui.execute('spin'),true);
  assert.deepEqual(calls,['spin']);
  assert.equal(ui.button('spin').disabled,true);
});
test('STOP invokes game controller without any financial debit',async()=>{
  const {ui,calls}=fixture();
  assert.equal(await ui.execute('stop'),true);
  assert.deepEqual(calls,['stop']);
});
test('bet popup uses the server-provided denomination ladder',async()=>{
  const {ui,calls}=fixture();
  assert.equal(await ui.execute('bet'),true);
  assert.equal(await ui.execute('set-bet','400'),true);
  assert.deepEqual(calls,['bet:400']);
});
test('sound toggle and settings are independent of wallet',async()=>{
  const {ui,calls}=fixture();
  await ui.execute('settings');await ui.execute('sound');
  assert.deepEqual(calls,['mute']);
  assert.ok(ui.button('sound').textContent.includes('ON'));
});
test('autoplay requires explicit selection of a round count',async()=>{
  const {ui,calls}=fixture();
  await ui.execute('autoplay');
  assert.equal(calls.length,0);
  await ui.execute('start-auto','25');
  assert.deepEqual(calls,['auto:25']);
});
test('payment rules and turbo not silently enabled without source and server support',async()=>{
  const {ui}=fixture();
  assert.equal(ui.button('take-win').disabled,true);
  assert.equal(ui.button('turbo').disabled,true);
  assert.equal(await ui.execute('turbo'),false);
  assert.equal(await ui.execute('take-win'),false);
});
test('disposes click and keyboard listeners',()=>{
  const {ui,document}=fixture();
  assert.ok(document.listeners.has('keydown'));
  ui.dispose();
  assert.equal(document.listeners.has('keydown'),false);
});
