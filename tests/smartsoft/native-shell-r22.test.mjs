import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installNativePlayer,nativeShellHTML,projectDemoHTML,mergeDemoPresentation,SHELL_PREFIX,TITLE_IDS} from '../../deploy/smartsoft/native-player-r22.mjs';
const html='<html lang="en"><head></head><body><main id="machineShell"><button id="play">Spin</button><p id="notice"></p></main></body></html>';
const env={PORTAL:'player'};
test('all nine account and demo shells retain their existing controller and buttons',async()=>{
 const calls=[];
 const app=installNativePlayer({async fetch(r){calls.push([new URL(r.url).pathname,r.method]);return new Response(html,{headers:{'content-type':'text/html','etag':'old'}});}},{css:'css',script:'script'});
 for(const id of TITLE_IDS)for(const mode of ['','demo/']){
  const response=await app.fetch(new Request('https://test/'+mode+'games/'+id),env,{});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.text();assert.match(body,/data-native-shell="r22"/);assert.match(body,/<button id="play">Spin<\/button>/);
  assert.equal(nativeShellHTML(body,id),body);
 }
 assert.equal(calls.length,18);
});
test('protected games, APIs, other portals and non-HTML errors pass through unchanged',async()=>{
 const response=new Response('unchanged',{status:401});
 const app=installNativePlayer({fetch:async()=>response},{css:'css',script:'script'});
 for(const path of ['/games/multi_hot_5_native','/games/foxy_hot_20_native','/api/remaining20/action','/games/burningice40_native'])assert.equal(await app.fetch(new Request('https://test'+path),env,{}),response);
 assert.equal(await app.fetch(new Request('https://test/games/burningice40_native'),{PORTAL:'admin'},{}),response);
});
test('shell resources allow only read methods and HEAD has no body',async()=>{
 const app=installNativePlayer({fetch:()=>{throw Error('UNEXPECTED_UPSTREAM');}},{css:'css',script:'script'});
 assert.equal((await app.fetch(new Request('https://test'+SHELL_PREFIX+'shell.css',{method:'POST'}),env,{})).status,405);
 assert.equal((await app.fetch(new Request('https://test'+SHELL_PREFIX+'unknown'),env,{})).status,404);
 const head=await app.fetch(new Request('https://test'+SHELL_PREFIX+'shell.mjs',{method:'HEAD'}),env,{});
 assert.equal(await head.text(),'');assert.match(head.headers.get('content-type'),/javascript/);
});
test('cabinet stays hidden before assets load and attention/collection remain available',async()=>{
 const css=await readFile(new URL('../../deploy/smartsoft/native-shell-r22.css',import.meta.url),'utf8');
 for(const selector of ['.title-row','.feature-strip','.result-strip','.player-bar'])assert.ok(css.includes(selector));
 assert.ok(css.includes('[data-native-ready="false"] #scene {visibility:hidden}'));
 assert.ok(css.includes('[data-native-attention="false"] #notice'));
 assert.ok(css.includes('[data-native-collect="true"] #collect'));
 assert.ok(css.includes('display:flex!important;flex-direction:column;gap:4px;'));
 assert.throws(()=>nativeShellHTML('<html></html>',TITLE_IDS[0]),/CONTRACT_CHANGED/);
});
test('demo uses the repaired runtime and preserves credit amounts and rules',()=>{
 const old='<html lang="en"><head><script src="/native-library/remaining20/20261110-accepted-controls-r12/b38851a17f300bbc/app.mjs"></script></head></html>';
 const projected=projectDemoHTML(old,'burningice40_native');
 assert.match(projected,/20261110-rounds-r21\/cc0f22635df0e9c7\/app.mjs/);
 assert.match(projected,/data-reference-frame="r14"/);
 const demo=[{id:'burningice40_native',version:'v1',demo:true,demoCreditsOnly:true,currency:'CREDITS',stakeValues:['1.00'],referencePresentation:{old:true}}];
 const catalog=[{id:'burningice40_native',version:'v1',stakeValues:['100.00'],referencePresentation:{current:true}}];
 const [merged]=mergeDemoPresentation(demo,catalog);
 assert.deepEqual(merged.stakeValues,['1.00']);assert.deepEqual(merged.referencePresentation,{current:true});assert.equal(merged.currency,'CREDITS');
 assert.deepEqual(demo[0].referencePresentation,{old:true});
 assert.throws(()=>mergeDemoPresentation(demo,[{...catalog[0],version:'changed'}]),/NOT_VERIFIED/);
 assert.throws(()=>mergeDemoPresentation([{...demo[0],currency:'ETB'}],catalog),/NOT_VERIFIED/);
});
test('the demo page retains its credits-only session cookie while assets remain public',async()=>{
 const app=installNativePlayer({fetch:async()=>new Response(html,{headers:{'content-type':'text/html','set-cookie':'demo-session=fixture; Secure; HttpOnly; SameSite=Lax'}})},{css:'css',script:'script'});
 const response=await app.fetch(new Request('https://test/demo/games/multihot100_native'),env,{});
 assert.equal(response.headers.get('set-cookie'),'demo-session=fixture; Secure; HttpOnly; SameSite=Lax');
 const asset=await app.fetch(new Request('https://test'+SHELL_PREFIX+'shell.mjs'),env,{});
 assert.equal(asset.headers.get('set-cookie'),null);
});
