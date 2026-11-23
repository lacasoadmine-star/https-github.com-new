import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {patchSignInReturn,gameAccountHref,ACCOUNT_GAME_IDS,ORIGINAL_SIGN_IN_SHA256} from '../../deploy/smartsoft/sign-in-return-r18.mjs';
// Exact public retained helper. Tests execute its original login verification,
// not a replacement implementation or a production account.
const ORIGINAL="\nconst allowed=new Set(['jetx_native','multihot40_native']),key='zplay.native.launch.return';\nconst link=new URL(location.href);let id=link.searchParams.get('play');\nif(!allowed.has(id)){const back=link.searchParams.get('return')||'';id=back.startsWith('/games/')?back.slice(7):'';}\nlet target=allowed.has(id)?'/games/'+id:'';\nconst query=new URL(location.href);\nlet requested=!!target;\ntry{if(requested)sessionStorage.setItem(key,target);else{const saved=sessionStorage.getItem(key)||'';if(allowed.has(saved.slice(7))&&saved.startsWith('/games/')){target=saved;requested=true;}}}catch{}\nif(requested){\n let stopped=false,opened=false,checking=false,sawSignedIn=false;\n const original=window.fetch.bind(window);\n const clear=()=>{try{sessionStorage.removeItem(key);sessionStorage.removeItem('zplay.jetx.return');}catch{}};\n const check=async()=>{\n  if(stopped||checking||document.hidden)return;checking=true;\n  try{\n   const r=await original('/api/machine-session',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});\n   if(r.ok&&(await r.json()).authenticated===true){stopped=true;clear();observer.disconnect();location.replace(target);}\n  }catch{}finally{checking=false;}\n };\n const show=()=>{\n  if(stopped)return;\n  if(!opened){const button=document.querySelector('.login-button');if(button){opened=true;button.click();}}\n  if(!sawSignedIn&&document.querySelector('.signed-in-header')){sawSignedIn=true;void check();}\n };\n const observer=new MutationObserver(show);\n observer.observe(document.documentElement,{subtree:true,childList:true});\n window.fetch=async(input,options)=>{\n  const response=await original(input,options);\n  let url;try{url=new URL(typeof input==='string'?input:input.url,location.href);}catch{return response;}\n  if(!stopped&&url.origin===location.origin&&response.ok&&(response.headers.get('X-Zplay-Session')==='started'||/\\/api\\/(?:(?:auth|player)\\/)?(?:login|register)$/.test(url.pathname)))void check();\n  return response;\n };\n window.addEventListener('pageshow',()=>void check());\n document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});\n window.addEventListener('pagehide',()=>{stopped=true;observer.disconnect();},{once:true});\n if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{show();void check();},{once:true});\n else{show();void check();}\n}\n";

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function browser(query,{authenticated=false,sessionStatus=200,saved='',failRead=false}={}){
 const calls=[],redirects=[],events={},storage=new Map(saved?[['zplay.native.launch.return',saved]]:[]);
 let loginOpened=0;
 const state={authenticated,sessionStatus,failRead,loginStatus:200};
 const reply=(status,data,session=false)=>({ok:status>=200&&status<300,status,headers:{get:name=>session&&name==='X-Zplay-Session'?'started':null},json:async()=>data});
 const originals=[];
 const original=async(input,options)=>{
  const url=new URL(typeof input==='string'?input:input.url,'https://player.example');calls.push({path:url.pathname,method:options?.method??'GET'});
  if(url.pathname==='/api/machine-session'){
   if(state.failRead)throw Error('OFFLINE');
   const result=reply(state.sessionStatus,{authenticated:state.authenticated});originals.push({path:url.pathname,response:result});return result;
  }
  const result=reply(url.pathname==='/api/login'?state.loginStatus:200,{ok:true},url.pathname==='/api/login'&&state.loginStatus===200);originals.push({path:url.pathname,response:result});return result;
 };
 class Observer{observe(){} disconnect(){}}
 const document={hidden:false,readyState:'complete',documentElement:{},
  querySelector:selector=>selector==='.login-button'?{click(){loginOpened++;}}:null,
  addEventListener:(name,fn)=>{events[name]=fn;}};
 const context={URL,MutationObserver:Observer,document,
  location:{href:'https://player.example/'+query,origin:'https://player.example',replace:path=>redirects.push(path)},
  sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  window:{fetch:original,addEventListener:(name,fn)=>{events[name]=fn;}}};
 vm.runInNewContext(patchSignInReturn(ORIGINAL),context);
 return {context,state,calls,redirects,storage,originals,loginOpened:()=>loginOpened,events};
}

test('only the exact retained allowlist changes; unknown source fails closed',()=>{
 assert.equal(createHash('sha256').update(ORIGINAL).digest('hex'),ORIGINAL_SIGN_IN_SHA256);
 const projected=patchSignInReturn(ORIGINAL);
 const originalAnchor="const allowed=new Set(['jetx_native','multihot40_native']),key='zplay.native.launch.return';";
 const nextAnchor="const allowed=new Set("+JSON.stringify(['jetx_native','multihot40_native',...ACCOUNT_GAME_IDS])+"),key='zplay.native.launch.return';";
 assert.equal(projected.replace(nextAnchor,originalAnchor),ORIGINAL);
 assert.throws(()=>patchSignInReturn(projected),/RETAINED_SIGN_IN_RETURN_CHANGED/);
 assert.throws(()=>patchSignInReturn(ORIGINAL.replace('location.replace(target)','location.replace(unsafe)')),/RETAINED_SIGN_IN_RETURN_CHANGED/);
 for(const id of ACCOUNT_GAME_IDS)assert.equal(gameAccountHref(id),'/?play='+id);
 for(const id of ['coinminer_native','multi_hot_5_native','foxy_hot_20_native','//evil.example','../admin','jetx_native',''])assert.throws(()=>gameAccountHref(id),/UNRELEASED_ACCOUNT_RETURN_TARGET/);
});

test('all nine NEW returns use the existing login and wait for verified account state',async()=>{
 for(const id of ACCOUNT_GAME_IDS){
  const b=browser('?play='+id);await tick();
  assert.equal(b.loginOpened(),1);assert.deepEqual(b.redirects,[]);
  assert.deepEqual(b.calls,[{path:'/api/machine-session',method:'GET'}]);
  assert.equal(b.storage.get('zplay.native.launch.return'),'/games/'+id);
  // A failed login must return its exact response and cannot enter the game.
  b.state.loginStatus=401;
  const failed=await b.context.window.fetch('/api/login',{method:'POST'});await tick();
  assert.equal(failed,b.originals.findLast(x=>x.path==='/api/login').response);assert.deepEqual(b.redirects,[]);
  // Even HTTP200 login is insufficient until original machine-session confirms.
  b.state.loginStatus=200;
  const unconfirmed=await b.context.window.fetch('/api/login',{method:'POST'});
  assert.equal(unconfirmed,b.originals.findLast(x=>x.path==='/api/login').response);await tick();assert.deepEqual(b.redirects,[]);
  b.state.authenticated=true;
  const accepted=await b.context.window.fetch('/api/login',{method:'POST'});
  assert.equal(accepted,b.originals.findLast(x=>x.path==='/api/login').response);await tick();
  assert.deepEqual(b.redirects,['/games/'+id]);assert.equal(b.storage.has('zplay.native.launch.return'),false);
  assert.equal(b.calls.filter(x=>x.method==='POST').length,3);
  assert.ok(b.calls.every(x=>['/api/machine-session','/api/login'].includes(x.path)));
 }
});

test('original JetX/MultiHot40 and validated return paths remain supported',async()=>{
 for(const query of ['?play=jetx_native','?play=multihot40_native','?return=%2Fgames%2Fmultihotdeluxe_native']){
  const b=browser(query,{authenticated:true});await tick();
  const id=query.includes('return=')?'multihotdeluxe_native':query.split('=')[1];
  assert.deepEqual(b.redirects,['/games/'+id]);
 }
 const saved=browser('',{saved:'/games/burningice40_native',authenticated:true});await tick();assert.deepEqual(saved.redirects,['/games/burningice40_native']);
 for(const query of ['?play=coinminer_native','?play=foxy_hot_20_native','?return=//evil.example/steal','?return=/games/../admin','?return=https://evil.example/games/multihotdeluxe_native']){
  const b=browser(query,{authenticated:true});await tick();assert.deepEqual(b.calls,[]);assert.deepEqual(b.redirects,[]);assert.equal(b.loginOpened(),0);
 }
 const savedBad=browser('',{saved:'//evil.example',authenticated:true});await tick();assert.deepEqual(savedBad.redirects,[]);assert.deepEqual(savedBad.calls,[]);
});

test('unavailable identity never redirects and unrelated fetch returns retain identity',async()=>{
 for(const options of [{authenticated:true,sessionStatus:503},{authenticated:true,failRead:true}]){
  const b=browser('?play=multihotdeluxe_native',options);await tick();assert.deepEqual(b.redirects,[]);
  const response=await b.context.window.fetch('/api/balance');assert.equal(response,b.originals.findLast(x=>x.path==='/api/balance').response);await tick();assert.deepEqual(b.redirects,[]);
 }
});
