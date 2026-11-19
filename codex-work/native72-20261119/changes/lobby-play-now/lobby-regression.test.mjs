import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {games as originalGames} from '../../current-worker/tests/fixtures/catalog-data.mjs';
import {games} from './assets/catalog-data.mjs';
import {sha} from '../../railway-recovery/qa-module-loader.mjs';
import {rootScriptAction, transformRoot, PREFIX, RETIRED_SCRIPTS, RETIRED_ELEMENTS} from './root-transform.mjs';
import {assets} from './worker-assets.mjs';
import {installPlayerPresentation} from './worker-wrapper.mjs';

const directory = new URL('./', import.meta.url);
const lobby = await readFile(new URL('assets/lobby.mjs', directory), 'utf8');
const player = await readFile(new URL('assets/player-app.mjs', directory), 'utf8');
const baselinePlayer = await readFile(new URL('baseline/player-app.mjs', directory), 'utf8');
const results = [];
async function test(name, run) {try {await run(); results.push({name, status: 'passed'});} catch (error) {results.push({name, status: 'failed', error: error.stack});}}
function deferred() {let resolve, reject;const promise = new Promise((a,b) => {resolve=a;reject=b;});return {promise,resolve,reject};}
async function flush() {for(let index=0;index<8;index++)await Promise.resolve();}
function extractFunction(source,name){
  const found=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(source);assert.ok(found,name);
  const start=found.index;let quote='',depth=0,body=-1;
  for(let index=source.indexOf('(',start);index<source.length;index++){
    const c=source[index];if(quote){if(c==='\\')index++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='(')depth++;else if(c===')'&&--depth===0){body=source.indexOf('{',index);break;}
  }
  assert.ok(body>=0,name);depth=0;quote='';
  for(let index=body;index<source.length;index++){
    const c=source[index];if(quote){if(c==='\\')index++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,index+1);
  }
  throw Error('Unclosed '+name);
}

// Deliberately narrow DOM collaborators exercise actual catalogue creation and
// event functions. They do not claim to render CSS or validate browser layout.
class Node {
  constructor(tag) {this.tagName=tag.toUpperCase();this.children=[];this.attributes=new Map();this.dataset={};this.style={overflow:'',setProperty(){}};this.listeners=new Map();this.className='';this._text='';this.parentElement=null;this.open=false;this.disabled=false;this.hidden=false;this.classList={add:(name)=>{this.className += ' '+name;}};}
  set textContent(value){this._text=String(value);this.children=[];} get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  setAttribute(key,value){this.attributes.set(key,String(value));if(key==='id')this.id=String(value);if(key==='class')this.className=String(value);if(key==='href')this.href=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=String(value);}
  getAttribute(key){if(key==='id')return this.id??null;if(key==='class')return this.className;if(key==='href')return this.href??null;if(key.startsWith('data-'))return this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]??null;return this.attributes.get(key)??null;}
  removeAttribute(key){this.attributes.delete(key);if(key==='href')delete this.href;if(key==='open')this.open=false;}
  append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  prepend(node){node.remove();node.parentElement=this;this.children.unshift(node);}
  replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this._text='';this.append(...nodes);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(node=>node!==this);this.parentElement=null;}
  get isConnected(){return this.tagName==='HTML'||!!this.parentElement?.isConnected;}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==fn));}
  emit(type,event={}){for(const fn of this.listeners.get(type)||[])fn({...event,target:event.target||this});}
  focus(){globalDocument.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;this.emit('close');}
  matches(selector){
    selector=selector.trim();
    if(selector.includes(':not([disabled])')){if(this.disabled)return false;selector=selector.replace(':not([disabled])','');}
    const tag=selector.match(/^[a-z]+/i)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;
    const id=selector.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;
    for(const match of selector.matchAll(/\.([\w-]+)/g))if(!this.className.split(/\s+/).includes(match[1]))return false;
    for(const match of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){const value=this.getAttribute(match[1]);if(value===null||match[2]!==undefined&&value!==match[2])return false;}
    return true;
  }
  querySelectorAll(selector){const matches=[];for(const node of this.children){if(selector.split(',').some(part=>node.matches(part)))matches.push(node);matches.push(...node.querySelectorAll(selector));}return matches;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const globalDocument=new Node('html');globalDocument.documentElement=globalDocument;globalDocument.head=new Node('head');globalDocument.body=new Node('body');globalDocument.append(globalDocument.head,globalDocument.body);globalDocument.createElement=tag=>new Node(tag);
const storage=new Map();
const browser=new Node('window');browser.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};browser.scrollTo=()=>{};
const context=vm.createContext({window:browser,document:globalDocument,URL,location:{href:'https://example.test/'},games,CATALOG_RELEASE:'test',requestAnimationFrame:()=>1,cancelAnimationFrame(){},MutationObserver:class{observe(){}disconnect(){}}});
vm.runInContext(lobby.replace(/^import[^\n]+\n/,'').replaceAll('import.meta.url',JSON.stringify('https://example.test'+PREFIX+'lobby.mjs'))+'\nglobalThis.qa={cardFor,openDetails,closeDetails,createCatalogue,playable,eligible,selectedGames};',context);
const qa=context.qa;

await test('All 74 titles, canonical account routes and preparing gates are retained; demo destinations are removed',()=>{
  assert.equal(games.length,74);assert.equal(games.filter(qa.playable).length,17);assert.equal(games.filter(game=>game.status==='preparing').length,57);
  for(let index=0;index<games.length;index++){assert.deepEqual({...games[index],demoPath:originalGames[index].demoPath},originalGames[index]);assert.equal(games[index].demoPath,null);}
  for(const key of ['multihot5','foxyhot20'])assert.equal(games.find(game=>game.sourceKey===key).accountPath,originalGames.find(game=>game.sourceKey===key).accountPath);
});
await test('Actual card creation renders exact Play Now links only for the 17 existing account routes',()=>{
  for(const game of games){const card=qa.cardFor(game),links=card.querySelectorAll('a[href]');if(qa.playable(game)){assert.equal(links.length,1);assert.equal(links[0].textContent,'Play Now');assert.equal(links[0].href,game.accountPath);}else{assert.equal(links.length,0);assert.match(card.textContent,/Weli lama heli karo/);}assert.doesNotMatch(card.textContent,/demo|credits/i);}
});
await test('Actual modal creation exposes one Play Now account link, or a disabled preparing action, never a demo action',()=>{
  for(const game of games){qa.openDetails(game,null);const sheet=globalDocument.querySelector('#zplay-game-detail-sheet'),links=sheet.querySelectorAll('a[href]');if(qa.playable(game)){assert.equal(links.length,1);assert.equal(links[0].textContent,'Play Now');assert.equal(links[0].href,game.accountPath);}else{assert.equal(links.length,0);assert.equal(sheet.querySelector('.restored-sheet-unavailable').disabled,true);}assert.doesNotMatch(sheet.textContent,/demo|credits/i);qa.closeDetails(false);assert.equal(globalDocument.body.style.overflow,'');}
});
await test('A stale account destination cannot make a preparing, demo or external card playable',()=>{
  const game=games.find(qa.playable);assert.equal(qa.playable({...game,status:'preparing'}),false);
  for(const accountPath of ['/demo/games/multihot100_native','https://external.example/games/test','//external.example/games/test','/games/test?mode=demo'])assert.equal(qa.playable({...game,accountPath}),false);
});
await test('Favorites still use the existing title-preference key; the Demo filter is absent',()=>{
  const game=games[0];qa.openDetails(game,null);const favorite=globalDocument.querySelector('[data-sheet-favorite]');favorite.emit('click');assert.deepEqual(JSON.parse(storage.get('zplay:favorite-game-ids:v1')),[game.id]);assert.equal(favorite.getAttribute('aria-pressed'),'true');favorite.emit('click');assert.deepEqual(JSON.parse(storage.get('zplay:favorite-game-ids:v1')),[]);qa.closeDetails(false);
  const catalog=qa.createCatalogue();assert.equal(catalog.querySelectorAll('[data-catalog-filter]').some(node=>node.dataset.catalogFilter==='demo'),false);
});
await test('Root HTML rewrite removes obsolete demo producers and static demo markup while retaining account/session scripts',()=>{
  const report=JSON.parse(execFileSync('python',['changes/lobby-play-now/verify-root-html.py'],{encoding:'utf8'}));assert.equal(report.containsDemoLaunch,false);
  assert.equal(report.fallback.containsDemoLaunch,false);assert.equal(report.fallback.unavailableMessageRetained,true);assert.deepEqual(report.fallback.removedScripts,['/new-machines/launcher.mjs']);
  for(const src of RETIRED_SCRIPTS)assert.deepEqual(rootScriptAction(src+'?cache=old'),{remove:true});
  for(const src of report.retainedScripts){if(src.startsWith(PREFIX))continue;assert.equal(rootScriptAction(src),null,src);}
  const registrations=[];class Rewriter{on(selector,handler){registrations.push({selector,handler});return this;}transform(response){return response;}}
  const response={};assert.equal(transformRoot(response,Rewriter),response);
  const scripts=registrations.find(row=>row.selector==='script[src]');let removed=false;const element={getAttribute:()=>'/remaining20-catalogue/20261109-r3/lobby.mjs',remove(){removed=true;}};scripts.handler.element(element);assert.equal(removed,true);
  const nodes=registrations.find(row=>row.selector==='[id]');for(const id of RETIRED_ELEMENTS){removed=false;nodes.handler.element({getAttribute:()=>id,remove(){removed=true;}});assert.equal(removed,true);}
});

const apiSource=extractFunction(player,'ce');
const guardedReadSource=extractFunction(player,'p1');
const syncSource=extractFunction(player,'S1');
const playerContext=vm.createContext({AbortController,setTimeout,clearTimeout,fetch:()=>{throw Error('NO_NETWORK_ALLOWED')},Gn:class extends Error{constructor(message,status=0){super(message);this.status=status;}}});
vm.runInContext(apiSource+';'+guardedReadSource+';'+syncSource+';globalThis.api={ce,p1,S1};',playerContext);

await test('Existing Player read API forces fresh GETs, preserves POST body/headers and never adds a new wallet endpoint',async()=>{
  const requests=[];const fetcher=async(url,options)=>{requests.push({url,options});return{ok:true,status:200,json:async()=>({ok:true})};};
  await playerContext.api.ce('me',undefined,{fetcher});await playerContext.api.ce('sync',undefined,{fetcher});await playerContext.api.ce('fixture-action',{id:'safe-local-test'},{fetcher});
  assert.deepEqual(requests.map(row=>row.url),['/api/me','/api/sync','/api/fixture-action']);for(const row of requests.slice(0,2)){assert.equal(row.options.method,'GET');assert.equal(row.options.cache,'no-store');assert.equal(row.options.body,undefined);}
  const post=requests[2].options;assert.equal(post.method,'POST');assert.equal(post.cache,undefined);assert.equal(post.headers['content-type'],'application/json');assert.equal(post.body,'{"id":"safe-local-test"}');
});
await test('Existing latest-request guard prevents an older balance read or stale401 from replacing a newer Player state',async()=>{
  for(const fail of [false,true]){let revision=0,state={balance:1000};const old=deferred(),oldRevision=++revision;const first=playerContext.api.p1({read:()=>old.promise,update:value=>{state=value;},unavailable:()=>{},isCurrent:()=>oldRevision===revision});const newRevision=++revision;await playerContext.api.p1({read:async()=>({balance:1250}),update:value=>{state=value;},unavailable:()=>{},isCurrent:()=>newRevision===revision});if(fail)old.reject(Object.assign(Error('expired'),{status:401}));else old.resolve({balance:1000});await first;assert.equal(state.balance,1250);}
});
await test('A changed /api/sync revision refreshes /api/me; unchanged revision adds no balance request',async()=>{
  let revision='before',reads=0,refreshes=0;const scheduled=[];const sync=playerContext.api.S1({read:async()=>{reads++;return{revision}},onChange:async()=>{refreshes++;return true},schedule:(callback,ms)=>{scheduled.push({callback,ms});return scheduled.length;},cancel:()=>{},visible:()=>true});sync.start();await flush();assert.equal(refreshes,1);sync.wake();await flush();assert.equal(refreshes,1);revision='after';sync.wake();await flush();assert.equal(refreshes,2);assert.equal(reads,3);sync.stop();
});
await test('Persisted-page restore wakes the existing session sync immediately and removes the listener on cleanup',()=>{
  const start=player.indexOf('if(!o?.id)return;'),end=player.indexOf('},[o?.id])',start);const body=player.slice(start,end);let wakes=0,starts=0,stops=0;const win=new Node('window'),doc=new Node('document');const sync={wake(){wakes++},start(){starts++},stop(){stops++}};
  const sandbox=vm.createContext({o:{id:1},S1:()=>sync,ce(){},document:doc,window:win,ht(){},ie(){},U:{current:0},r(){},oe(){},$:{current:null}});
  const cleanup=vm.runInContext('(function(){'+body+'})()',sandbox);assert.equal(starts,1);win.emit('pageshow',{persisted:false});assert.equal(wakes,0);win.emit('pageshow',{persisted:true});assert.equal(wakes,1);doc.emit('visibilitychange');win.emit('focus');win.emit('online');assert.equal(wakes,4);cleanup();win.emit('pageshow',{persisted:true});assert.equal(wakes,4);assert.equal(stops,1);
});
await test('Only API GET cache and persisted-page sync listener change in the deployed Player bundle',()=>{
  const reverted=player.replace('cache:f===void 0?"no-store":void 0,','').replace(',Ve=Pe=>{Pe.persisted&&ne.wake()}','').replace(',window.addEventListener?.("pageshow",Ve)','').replace(',window.removeEventListener?.("pageshow",Ve)','');assert.equal(reverted,baselinePlayer);
});
await test('Additive Worker validates immutable KV content and passes through all engine/API writes unchanged',async()=>{
  let forwards=0;const previous={fetch:async(request)=>{forwards++;return new Response(request.method+':'+new URL(request.url).pathname)}};const worker=installPlayerPresentation(previous);const entries=Object.entries(assets);let body=await readFile(new URL('assets/lobby.mjs',directory));const [route,asset]=entries.find(([path])=>path.endsWith('/lobby.mjs'));const env={PORTAL:'player',SSG_OFFICIAL_REFERENCES:{get:async(key,type)=>{assert.equal(key,asset.key);assert.equal(type,'arrayBuffer');return body;}}};
  let response=await worker.fetch(new Request('https://example.test'+route),env,{});assert.equal(response.status,200);assert.equal(await response.text(),lobby);assert.match(response.headers.get('cache-control'),/immutable/);
  response=await worker.fetch(new Request('https://example.test'+route,{method:'HEAD'}),env,{});assert.equal(await response.text(),'');
  body=Buffer.from('corrupt');response=await worker.fetch(new Request('https://example.test'+route),env,{});assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
  for(const path of ['/api/me','/api/sync','/api/slots/habesha_fortune_5_native/spin','/games/multi_hot_5_native','/games/foxy_hot_20_native']){const method=path.endsWith('/spin')?'POST':'GET';response=await worker.fetch(new Request('https://example.test'+path,{method}),env,{});assert.equal(await response.text(),method+':'+path);}
  assert.equal(forwards,5);
  let transformed=0;globalThis.HTMLRewriter=class{on(){return this;}transform(response){transformed++;return response;}};
  const rootWorker=installPlayerPresentation({fetch:async(request)=>new URL(request.url).pathname==='/games'?new Response(null,{status:302,headers:{Location:'https://example.test/#originals'}}):new Response('<html>Game unavailable</html>',{status:200,headers:{'Content-Type':'text/html','ETag':'old-html','Last-Modified':'yesterday','Content-Length':'28'}})});
  for(const path of ['/','/games/']){response=await rootWorker.fetch(new Request('https://example.test'+path),env,{});assert.equal(response.status,200);assert.equal(await response.text(),'<html>Game unavailable</html>');assert.equal(response.headers.get('cache-control'),'no-store');for(const name of ['etag','last-modified','content-length'])assert.equal(response.headers.get(name),null);}
  response=await rootWorker.fetch(new Request('https://example.test/games'),env,{});assert.equal(response.status,302);assert.equal(response.headers.get('location'),'https://example.test/#originals');assert.equal(transformed,2);delete globalThis.HTMLRewriter;
});

const report={createdAt:new Date().toISOString(),provenance:'Exact candidate JavaScript in VM with controlled DOM/network collaborators; saved-root HTML parser; no browser, live login, wager, payment or production mutation.',sourceHashes:{lobby:sha(lobby),player:sha(player),baselinePlayer:sha(baselinePlayer)},results,passed:results.filter(result=>result.status==='passed').length,failed:results.filter(result=>result.status==='failed').length};
await writeFile(new URL('regression-results.json',directory),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
