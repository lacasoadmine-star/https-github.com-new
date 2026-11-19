// Retained behavioral suite redirected to the isolated Deluxe release.
// Exercises the actual startup helper with a small event-capable document.
// No browser, network, credentials, game API or wallet transaction is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

class Node extends EventTarget {
  constructor(tag='div') {
    super(); this.tagName=tag.toUpperCase(); this.children=[]; this.dataset={};
    this.attributes=new Map(); this.styles=new Map(); this.style={setProperty:(k,v)=>this.styles.set(k,v)};
    this.classes=new Set(); this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),contains:x=>this.classes.has(x)};
    this.inert=false; this.hidden=false; this.open=false; this.disabled=false; this.textContent='';
  }
  set className(v){this.classes=new Set(v.split(/\s+/).filter(Boolean));}
  get className(){return [...this.classes].join(' ');}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);if(this.tagName==='HEAD'&&child.tagName==='LINK')queueMicrotask(()=>child.dispatchEvent(new Event('load')));}}
  setAttribute(k,v){this.attributes.set(k,String(v));}
  removeAttribute(k){this.attributes.delete(k);if(k.startsWith('data-'))delete this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
  showModal(){this.open=true;}
  close(){this.open=false;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  querySelectorAll(selector){
    const match=n=>selector.startsWith('#')?n.id===selector.slice(1):selector.startsWith('.')?n.classes.has(selector.slice(1)):selector==='dialog[open]'?n.tagName==='DIALOG'&&n.open:n.tagName===selector.toUpperCase();
    const all=[];const visit=n=>{for(const c of n.children){if(match(c))all.push(c);visit(c);}};visit(this);return all;
  }
  set innerHTML(value){
    // The helper's only HTML template is its presentation-only loading bar.
    assert.match(value,/official-loader-progress/);this.children=[];
    const progress=new Node();progress.className='official-loader-progress';
    const icon=new Node('span');icon.className='official-loader-icon';progress.append(icon);this.append(progress);
  }
}
function documentFixture(previousChoice=null){
  const body=new Node('body'),head=new Node('head'),document=new Node('document');document.append(head,body);document.body=body;document.head=head;body.dataset={game:'multi_hot_5_deluxe_native',state:'loading'};
  const add=(id,tag='div',parent=body)=>{const node=new Node(tag);node.id=id;parent.append(node);return node;};
  const machine=add('machine'),brand=add('brand');brand.className='brandbar';
  const loader=add('official-startup'),logo=add('logo','div',loader);logo.className='official-loader-logo';
  const dialog=add('sound-consent','dialog'),question=add('sound-question','h2',dialog),yes=add('sound-yes','button',dialog),no=add('sound-no','button',dialog);
  const notice=add('notice');add('notice-text','p',notice);
  document.getElementById=id=>document.querySelector('#'+id);document.createElement=tag=>new Node(tag);
  const originalAll=document.querySelectorAll.bind(document);document.querySelectorAll=s=>s==='#machine,.brandbar'?[machine,brand]:originalAll(s);
  document.fonts={add(){},delete(){}};
  document.defaultView={setTimeout,clearTimeout,localStorage:{getItem:()=>previousChoice},Image:class{naturalWidth=300;decode(){return Promise.resolve();}},MutationObserver:class{observe(){}disconnect(){}}};
  return {document,body,machine,brand,loader,dialog,question,yes,no};
}
async function load(){
  const context=vm.createContext({URL,AbortController,Uint8Array,console,fetch:()=>{throw Error('STARTUP_MUST_NOT_REQUEST_NETWORK');}});
  const assets=new vm.SyntheticModule(['assets'],function(){this.setExport('assets',{logo:'data:image/gif;base64,R0lGODlh',bar:'bar',icon:'icon',yes:'yes',no:'no',font:''});},{context});
  const source=await readFile(new URL('../games/deluxe/deluxe-startup.mjs',import.meta.url),'utf8');
  const module=new vm.SourceTextModule(source,{context,initializeImportMeta:m=>{m.url='https://fixture.invalid/release/official-startup.mjs';}});
  await module.link(()=>assets);await module.evaluate();return module.namespace;
}
const pending=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('Deluxe loading holds controls until all assets are ready, then offers sound without a round',async t=>{
  const f=documentFixture(),{createOfficialStartup}=await load(),art=pending(),choices=[];
  const startup=createOfficialStartup({document:f.document,gameId:'multi_hot_5_deluxe_native',onSoundChoice:v=>choices.push(v)});assert.ok(startup);t.after(()=>startup.destroy());
  startup.begin();const complete=startup.complete([art.promise]);await tick();
  assert.equal(f.machine.inert,true);assert.equal(f.brand.inert,true);assert.equal(startup.diagnostics().loading,true);assert.equal(f.dialog.open,false);assert.deepEqual(choices,[]);
  art.resolve();assert.equal(await complete,true);f.body.dataset.state='ready';
  assert.equal(f.machine.inert,false);assert.equal(f.loader.hidden,true);assert.equal(await startup.askSound(),true);assert.equal(f.dialog.open,true);assert.deepEqual(choices,[]);
});

test('double tapping sound Yes invokes the choice once and does not trigger gameplay',async t=>{
  const f=documentFixture(),{createOfficialStartup}=await load(),choice=pending(),choices=[];
  const startup=createOfficialStartup({document:f.document,gameId:'multi_hot_5_deluxe_native',onSoundChoice:async v=>{choices.push(v);await choice.promise;}});t.after(()=>startup.destroy());
  startup.begin();await startup.complete();f.body.dataset.state='ready';await startup.askSound();
  f.yes.dispatchEvent(new Event('click'));f.yes.dispatchEvent(new Event('click'));assert.deepEqual(choices,[true]);assert.equal(f.yes.disabled,true);
  choice.resolve();await tick();assert.equal(f.dialog.open,false);assert.equal(startup.diagnostics().choiceCalls,1);assert.equal(await startup.askSound(),false);
});

test('a saved sound choice is honored and signed-out failure releases the loader',async t=>{
  const f=documentFixture('no'),{createOfficialStartup}=await load();
  const startup=createOfficialStartup({document:f.document,gameId:'multi_hot_5_deluxe_native',onSoundChoice:()=>{throw Error('unexpected choice');}});t.after(()=>startup.destroy());
  startup.begin();await startup.complete();f.body.dataset.state='ready';assert.equal(await startup.askSound(),false);
  startup.begin();f.body.dataset.state='signedout';startup.fail('signedout');
  assert.equal(f.machine.inert,false);assert.equal(f.brand.inert,false);assert.equal(f.loader.hidden,true);assert.equal(f.dialog.open,false);assert.equal(await startup.askSound(),false);
});

test('asset failure removes the cover and retains a retryable failure instead of hiding the sign-in/error state',async t=>{
  const f=documentFixture(),{createOfficialStartup}=await load();
  const startup=createOfficialStartup({document:f.document,gameId:'multi_hot_5_deluxe_native',onSoundChoice:()=>{}});t.after(()=>startup.destroy());
  startup.begin();const assets=pending();const complete=startup.complete([assets.promise]);assets.reject(Error('ART_UNAVAILABLE'));
  assert.equal(await complete,false);assert.equal(f.machine.inert,false);assert.equal(f.loader.hidden,true);assert.equal(startup.diagnostics().failure,'ART_UNAVAILABLE');assert.equal(await startup.askSound(),false);
});

test('dismissing the sound dialog chooses No once and never starts a round',async t=>{
  const f=documentFixture(),{createOfficialStartup}=await load(),choices=[];
  const startup=createOfficialStartup({document:f.document,gameId:'multi_hot_5_deluxe_native',onSoundChoice:v=>choices.push(v)});t.after(()=>startup.destroy());
  startup.begin();await startup.complete();f.body.dataset.state='ready';await startup.askSound();
  const cancel=new Event('cancel',{cancelable:true});f.dialog.dispatchEvent(cancel);await tick();
  assert.equal(cancel.defaultPrevented,true);assert.deepEqual(choices,[false]);assert.equal(f.dialog.open,false);
});
