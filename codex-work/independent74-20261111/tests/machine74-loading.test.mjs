import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../client/machine74-controller.mjs',import.meta.url),'utf8');
function fixture(catalog){
 const nodes=new Map(),selected=[],errors=[];
 const $=id=>{if(!nodes.has(id))nodes.set(id,{children:[],attributes:{},setAttribute(key,value){this.attributes[key]=value;},replaceChildren(){this.children=[];},append(value){this.children.push(value);}});return nodes.get(id);};
 const context={loadingCatalogue:false,disposed:false,working:false,refreshing:false,definitions:[],game:null,autoplay:false,chickenAutoTask:null,$,
  api:{catalog},location:{hash:'#ind74_official_multihot10'},document:{createElement:()=>({})},
  message(){},failure:error=>errors.push(error.message),select:async id=>selected.push(id)};
 context.updateControls=()=>{$('refresh').disabled=context.loadingCatalogue;};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function stopAutoplay(){'),source.indexOf('\nfunction chickenAutoSelection('))+source.slice(source.indexOf('async function loadCatalogue(){'),source.indexOf('\nawait loadCatalogue();'))+
  source.slice(source.indexOf('async function refresh('),source.indexOf('\nasync function select(')),context);
 return{context,$,selected,errors};
}

test('initial catalogue failure leaves a usable retry that loads the selected machine',async()=>{
 let requests=0;const f=fixture(async()=>{if(++requests===1)throw Error('offline');return[{id:'ind74_official_multihot10',title:'Multi Hot10'}];});
 await f.context.loadCatalogue();
 assert.equal(f.context.loadingCatalogue,false);assert.equal(f.$('refresh').disabled,false);
 assert.equal(f.$('stage').attributes['aria-busy'],'false');assert.match(f.$('loading-label').textContent,/Dib u hubi/);
 assert.deepEqual(f.errors,['offline']);assert.deepEqual(f.selected,[]);
 await f.context.refresh();
 assert.equal(requests,2);assert.deepEqual(f.selected,['ind74_official_multihot10']);
 assert.equal(f.$('game-select').children[0].value,'ind74_official_multihot10');
 assert.equal(f.$('refresh').disabled,false);
});

test('repeated refresh while the catalogue loads makes only one request',async()=>{
 let resolve,requests=0;const pending=new Promise(value=>{resolve=value;});const f=fixture(()=>{requests++;return pending;});
 const first=f.context.loadCatalogue();await f.context.refresh();await f.context.loadCatalogue();
 assert.equal(requests,1);assert.equal(f.$('refresh').disabled,true);
 assert.equal(f.$('stage').attributes['aria-busy'],'true');
 resolve([{id:'ind74_official_multihot10',title:'Multi Hot10'}]);await first;
 assert.equal(f.$('refresh').disabled,false);assert.equal(f.selected.length,1);
});
