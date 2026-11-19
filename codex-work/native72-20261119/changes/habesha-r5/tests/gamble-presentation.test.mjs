import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {test} from 'node:test';
import * as layoutModule from '../assets/habesha-gamble-layout.mjs';
import * as pack from '../assets/habesha-gamble-assets.mjs';

const loaded=[];
const context=vm.createContext({URL,AbortController,setTimeout,clearTimeout,performance});
const synthetic=values=>new vm.SyntheticModule(Object.keys(values),function(){for(const [name,value]of Object.entries(values))this.setExport(name,value);},{context});
const contract=new vm.SourceTextModule(await readFile(new URL('../../../live-frontend/zplay-native-machines-20261119-habesha-r4/contract.mjs',import.meta.url),'utf8'),{context});
await contract.link(specifier=>{assert.equal(specifier,'./registry.mjs');return synthetic({gameConfig:()=>{throw Error('Unused in presentation');},gameConfigForReceipt:()=>{throw Error('Unused in presentation');},isLegacyModel:()=>false,presentationGameId:id=>id});});
await contract.evaluate();
const source=new vm.SourceTextModule(await readFile(new URL('../assets/official-gamble-presentation.mjs',import.meta.url),'utf8'),{context,initializeImportMeta(meta){meta.url=new URL('../assets/official-gamble-presentation.mjs',import.meta.url).href;},importModuleDynamically:async specifier=>{
 loaded.push(specifier);assert.equal(specifier,'./habesha-gamble-assets.mjs');const module=synthetic(pack);await module.link(()=>{});await module.evaluate();return module;
}});
await source.link(specifier=>{if(specifier==='./contract.mjs')return contract;if(specifier==='./habesha-gamble-layout.mjs')return synthetic(layoutModule);throw Error(specifier);});
await source.evaluate();
const {createOfficialGamblePresentation,gambleCard}=source.namespace;

class Node extends EventTarget {
 constructor(tag='div'){super();this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.className='';this.style={setProperty(name,value){this[name]=value;},removeProperty(name){delete this[name];}};this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(' '),...names])].filter(Boolean).join(' ');}};}
 append(...nodes){for(const node of nodes){if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(n=>n!==node);node.parentElement=this;this.children.push(node);}}
 prepend(node){this.append(node);this.children.unshift(this.children.pop());}
 replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 closest(selector){if(selector==='[data-choice]'&&this.attributes['data-choice'])return this;return null;}
 querySelector(selector){const match=node=>selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):selector==='[data-close="gamble-dialog"]'?node.attributes['data-close']==='gamble-dialog':false;for(const child of this.children){if(match(child))return child;const deeper=child.querySelector(selector);if(deeper)return deeper;}return null;}
 click(){if(!this.disabled)this.dispatchEvent(new Event('click',{cancelable:true}));}
 close(){this.open=false;this.dispatchEvent(new Event('close'));}
}
class Document extends EventTarget {
 constructor(){super();this.hidden=false;this.focused=true;this.head=new Node('head');this.body=new Node('body');this.defaultView=Object.assign(new EventTarget(),{innerHeight:936});this.ids=new Map();for(const id of ['gamble-dialog','collect','gamble','red','black','machine']){const node=new Node(id==='gamble-dialog'?'dialog':'button');node.id=id;this.ids.set(id,node);}this.ids.get('red').setAttribute('data-choice','RED');this.ids.get('black').setAttribute('data-choice','BLACK');const close=new Node('button');close.setAttribute('data-close','gamble-dialog');this.ids.get('gamble-dialog').append(close,this.ids.get('red'),this.ids.get('black'));this.ids.get('gamble-dialog').open=true;this.machine={left:0,top:26,width:1366,height:768};this.ids.get('machine').getBoundingClientRect=()=>this.machine;}
 createElement(tag){return new Node(tag);}
 getElementById(id){return this.ids.get(id)||null;}
 hasFocus(){return this.focused;}
 querySelector(selector){return selector==='link[data-official-gamble-css]'?this.head.children.find(node=>Object.hasOwn(node.dataset,'officialGambleCss')):null;}
}
function timers(){let now=0,id=0;const jobs=new Map();return {options:{now:()=>now,setTimer:(fn,ms)=>{const key=++id;jobs.set(key,{fn,at:now+ms});return key;},clearTimer:key=>jobs.delete(key)},advance(ms){const until=now+ms;for(;;){const next=[...jobs].filter(([,job])=>job.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=until;},pending:()=>jobs.size};}
async function fixture({portrait=false}={}){
 const document=new Document();if(portrait)document.machine={left:0,top:0,width:420,height:900};
 const sounds=[],stops=[],collections=[],audio={unlock:async()=>{},stop:group=>stops.push(group),playSample:(name,options)=>sounds.push({name,...options})};
 const presentation=createOfficialGamblePresentation({gameId:'habesha_fortune_5_native',document,audio,onCollect:()=>collections.push('collected')});
 const timer=timers();presentation.presentationClock.clearAll();presentation.presentationClock=new layoutModule.HabeshaGambleClock(timer.options);
 presentation.open({stake:'10.00',attempt:0,maxAttempts:5});await presentation.prepare();await Promise.resolve();
 return {document,presentation,timer,sounds,stops,collections};
}
const receipt={roundId:'round-test',attempt:1,maxAttempts:5,stake:'10.00',payout:'20.00',choice:'RED',cardColor:'RED',won:true};
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};

test('Habesha selects only its own original pack and responsive geometry',async()=>{
 const {document,presentation}=await fixture();assert.equal(document.getElementById('gamble-dialog').dataset.officialGamble,'habesha');assert.equal(document.getElementById('gamble-dialog').dataset.gambleLayout,'landscape');assert.equal(presentation.stage.style.aspectRatio,'1234/681');assert.ok(presentation.sprites.background.includes('habesha-gamble-'));assert.equal(document.body.dataset.nativeGambleControls,undefined);
 document.machine={left:0,top:0,width:420,height:900};presentation.position();assert.equal(document.getElementById('gamble-dialog').dataset.gambleLayout,'portrait');assert.equal(presentation.stage.style.aspectRatio,'511/864');assert.equal(parseFloat(presentation.red.style.left),26/511*100);assert.ok(loaded.every(path=>path==='./habesha-gamble-assets.mjs'));presentation.dispose();
});
test('validated colour receipts reveal once, preserve the amount, and use Habesha gamble audio',async()=>{
 const {presentation,timer,sounds,collections}=await fixture();const before=JSON.stringify(receipt);assert.equal(presentation.pending('RED'),true);assert.equal(presentation.outcome(receipt,{canGamble:true}),true);assert.equal(presentation.outcome(receipt,{canGamble:true}),true);timer.advance(0);await flush();
 assert.equal(presentation.card.src,presentation.sprites['red-card']);assert.equal(presentation.card.alt,'RED card colour');assert.equal(sounds.filter(s=>s.name==='gamble-win').length,1);assert.equal(sounds.filter(s=>s.name==='tap').length,1);assert.equal(JSON.stringify(receipt),before);assert.equal(collections.length,0);timer.advance(2000);assert.equal(presentation.card.src,presentation.sprites.hidden);assert.equal(presentation.state.stake,'20.00');assert.equal(presentation.dialog.open,true);presentation.dispose();
});
test('untrusted or inconsistent colour receipts cannot create a card outcome',()=>{
 assert.equal(gambleCard({...receipt,cardColor:'PURPLE'}),null);assert.equal(gambleCard({...receipt,cardColor:'BLACK',won:true}),null);assert.equal(gambleCard({...receipt,cardColor:'BLACK',won:false}),'black-card');
});
test('blur and visibility pause the reveal hold without replaying a receipt or starting a new action',async()=>{
 const {document,presentation,timer,sounds,collections}=await fixture();presentation.outcome(receipt,{canGamble:false});timer.advance(0);await flush();timer.advance(750);document.focused=false;document.defaultView.dispatchEvent(new Event('blur'));assert.equal(presentation.presentationClock.paused,true);timer.advance(10000);assert.equal(presentation.dialog.open,true);assert.equal(presentation.revealing,true);assert.equal(collections.length,0);
 document.hidden=true;document.focused=true;document.defaultView.dispatchEvent(new Event('focus'));assert.equal(presentation.presentationClock.paused,true);document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));timer.advance(1249);assert.equal(presentation.dialog.open,true);timer.advance(1);assert.equal(presentation.dialog.open,false);assert.equal(collections.length,1);assert.equal(sounds.filter(s=>s.name==='gamble-win').length,1);presentation.dispose();
});
test('TAKE preserves a pending saved choice and performs no collection or fake result',async()=>{
 const {presentation,collections,sounds}=await fixture();presentation.update({stake:'10.00',savedChoice:'RED',recover:true,busy:false});presentation.take.click();assert.equal(collections.length,0);assert.equal(presentation.state.savedChoice,'RED');assert.equal(presentation.state.recover,true);assert.equal(presentation.dialog.open,false);assert.equal(sounds.length,0);presentation.dispose();
});
test('rapid TAKE taps invoke the existing collect callback once and do not duplicate its sound',async()=>{
 const {presentation,collections,sounds}=await fixture();presentation.take.click();presentation.take.click();assert.equal(collections.length,1);assert.equal(sounds.length,0);assert.equal(presentation.dialog.open,false);presentation.dispose();
});
test('closing or disposing a presentation clears queued reveal callbacks',async()=>{
 const {presentation,timer,sounds}=await fixture();presentation.outcome(receipt,{canGamble:false});presentation.dispose();timer.advance(3000);await flush();assert.equal(sounds.length,0);assert.equal(timer.pending(),0);
});
test('both panel layouts fit a short viewport and leave space for the actual gamble terms',()=>{
 for(const machine of [{left:0,top:0,width:420,height:900},{left:0,top:26,width:1366,height:768}]){const b=layoutModule.habeshaGambleBounds(machine,{height:700});assert.ok(b.width<=machine.width);assert.ok(b.top>=12);assert.ok(b.top+b.height<=630);}
});
