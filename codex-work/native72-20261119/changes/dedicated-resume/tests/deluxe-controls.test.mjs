import test from 'node:test';
import assert from 'node:assert/strict';
import {installOfficialAutoBetPresentation} from '../games/deluxe/deluxe-controls.mjs';

// An event-capable DOM fixture exercises the actual adapter. It has no wallet,
// network, browser globals or mechanism that can submit a production round.
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attributes=new Map();this.events=new Map();this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),toggle:(x,v)=>v?this.classes.add(x):this.classes.delete(x)};this.style={setProperty(){}};this.hidden=false;this.disabled=false;this.open=false;this.value='';this.validity='';}
 append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
 replaceChildren(...items){this.children=[];this.append(...items);}
 addEventListener(type,fn,{signal}={}){const entry={fn,signal};this.events.set(type,[...(this.events.get(type)||[]),entry]);}
 fire(type,event={target:this}){for(const {fn,signal} of this.events.get(type)||[])if(!signal?.aborted)fn(event);if(type==='click'&&this.parent)this.parent.fire(type,event);}
 setAttribute(key,value){this.attributes.set(key,String(value));}
 getAttribute(key){return this.attributes.get(key)??null;}
 matches(selector){return selector==='button[data-bet]'&&this.tagName==='button'&&this.dataset.bet!==undefined;}
 closest(selector){return selector==='button[data-bet]:not(:disabled)'&&this.matches('button[data-bet]')&&!this.disabled?this:this.parent?.closest(selector)||null;}
 getBoundingClientRect(){return {width:1366,height:768,top:26,left:0,bottom:794};}
 close(){this.open=false;}
 focus(){this.focused=true;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 setCustomValidity(value){this.validity=value;}
 reportValidity(){return !this.validity&&(!this.required||!!this.value)&&(!this.value||new RegExp('^(?:'+this.pattern+')$').test(this.value));}
}
function fixture(){
 const nodes=new Map(),head=new Element('head');
 for(const id of ['auto-dialog','settings','bets','bet-options','machine']){const n=new Element();n.id=id;nodes.set(id,n);}
 const settings=nodes.get('settings'),bets=nodes.get('bets'),options=nodes.get('bet-options');settings.append(bets);bets.append(options);
 for(const [index,bet] of ['0.05','0.10','0.20','0.30','0.40','0.50','0.60','0.80','1.00'].entries()){const b=new Element('button');b.dataset.bet=bet;b.setAttribute('aria-pressed',String(index===0));options.append(b);}
 const win=new Element();win.innerHeight=900;win.MutationObserver=win.ResizeObserver=class{observe(){}disconnect(){}};
 const document={head,defaultView:win,getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag)};
 const presentation=installOfficialAutoBetPresentation(document,'multi_hot_5_deluxe_native');
 const find=(root,match)=>{for(const child of root.children){if(match(child))return child;const found=find(child,match);if(found)return found;}return null;};
 const byClass=name=>find(nodes.get('auto-dialog'),n=>n.className===name);
 return {nodes,options,settings,presentation,byClass,find};
}
test('Deluxe count selection waits for START PLAY and retains all stop thresholds',()=>{
 const f=fixture();try{
  const choices=f.byClass('official-auto-counts'),start=f.byClass('official-auto-start');let starts=0;start.addEventListener('click',()=>starts++);
  assert.deepEqual(choices.children.map(n=>Number(n.dataset.autoCount)),[25,50,100,500,1000]);
  assert.equal(f.presentation.readAutoOptions().count,100);
  choices.children[0].fire('click');assert.equal(f.presentation.readAutoOptions().count,25);assert.equal(starts,0);
  assert.equal(choices.children[0].getAttribute('aria-pressed'),'true');assert.equal(choices.children[2].getAttribute('aria-pressed'),'false');
  assert.ok(choices.children.every(n=>n.dataset.auto===undefined));
  start.fire('click');assert.equal(starts,1);
 }finally{f.presentation.destroy();}
});
test('enabled stop thresholds reject zero, invalid decimals and blank input',()=>{
 const f=fixture();try{
  const row=f.byClass('official-auto-row'),check=f.find(row,n=>n.className==='official-auto-check'),input=f.find(row,n=>n.className==='official-auto-input');
  assert.equal(input.disabled,true);assert.equal(f.presentation.readAutoOptions().stopWin,null);
  check.checked=true;check.fire('change');assert.equal(input.disabled,false);assert.equal(input.required,true);
  for(const value of ['', '0','0.00','-1','1.001','1e3']){input.value=value;assert.equal(f.presentation.readAutoOptions(),null,value);}
  input.value=' 1.25 ';assert.equal(f.presentation.readAutoOptions().stopWin,'1.25');
  check.checked=false;check.fire('change');assert.equal(f.presentation.readAutoOptions().stopWin,null);
 }finally{f.presentation.destroy();}
});
test('right-side bet list displays five actual allowed levels, scrolls and closes on selection',()=>{
 const f=fixture();try{
  const visible=()=>f.options.children.filter(n=>!n.hidden).map(n=>n.dataset.bet);
  assert.deepEqual(visible(),['0.05','0.10','0.20','0.30','0.40']);
  const next=f.nodes.get('bets').children.find(n=>n.className==='official-bet-down');next.fire('click');assert.deepEqual(visible(),['0.10','0.20','0.30','0.40','0.50']);
  f.settings.open=true;f.options.children[3].fire('click');assert.equal(f.settings.open,false);
  f.options.children.forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.bet==='1.00')));f.presentation.updateBetOptions();
  assert.deepEqual(visible(),['0.40','0.50','0.60','0.80','1.00']);assert.equal(next.disabled,true);
 }finally{f.presentation.destroy();}
});
