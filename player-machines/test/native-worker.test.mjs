import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {nativeMachinePage,resolveNativeGame,nativeFamilies} from '../worker/native-machine-routes.mjs';
import {installNativeMachines} from '../worker/native-machine-entry.mjs';
import {assets,release} from '../worker/native-machine-assets.mjs';
import {machinePage} from '../worker/machine-routes.mjs';
import {release as oldRelease} from '../worker/machine-assets-20261106.mjs';
const base='https://native-worker.example',config={presence:'presence.63ed199a80b6c700.mjs'},hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile(new URL('../worker/native-machine-assets-manifest.json',import.meta.url),'utf8'));
test('only new native routes resolve and actual wallet IDs stay separate from presentation family IDs',async()=>{
 for(const [id,family]of Object.entries(nativeFamilies))for(const suffix of ['', '/', '?native=1']){
  const url=new URL(base+'/games/'+id+suffix);assert.equal(resolveNativeGame(url),id);const response=nativeMachinePage(new Request(url)),html=await response.text();
  assert.equal(response.status,200);assert.ok(html.includes('data-game="'+family+'"'));assert.ok(html.includes('data-machine="'+id+'"'));assert.ok(!html.includes('{{GAME}}')&&!html.includes('{{PRESENTATION_GAME}}'));assert.ok(html.includes('/player-v236/'+config.presence));
  assert.equal(response.headers.get('Cache-Control'),'no-store');assert.match(response.headers.get('Content-Security-Policy'),/script-src 'self'/);assert.ok(!response.headers.get('Content-Security-Policy').includes('unsafe-inline'));
  assert.equal((await nativeMachinePage(new Request(url,{method:'HEAD'})).arrayBuffer()).byteLength,0);
 }
 for(const path of ['/games/multi_hot_5_video','/games/hot_foxy_20','/games/multi_hot_100','/games/wild_multi_stars','/games/multi-hot-5-new','/slots/game.html?game=multi_hot_5_native','/api/slots/spin','/games/foxy_hot_20_native/nested','/'])assert.equal(nativeMachinePage(new Request(base+path)),null,path);
});
test('new native bootstrap serves four external assets and byte-original GIF without changing old bootstrap',async()=>{
 for(const id of Object.keys(nativeFamilies)){
  const page=new URL('/games/'+id,base),html=await nativeMachinePage(new Request(page)).text(),paths=[];
  for(const match of html.matchAll(/<(link|script)\b[^>]*>/gi)){
   if(match[1]==='link'&&!/rel="stylesheet"/.test(match[0]))continue;
   const target=match[0].match(/(?:src|href)="([^"]+)"/)?.[1];if(!target||target.startsWith('/player-v236/'))continue;
   const url=new URL(target,page),response=nativeMachinePage(new Request(url));assert.equal(url.origin,page.origin);assert.equal(response?.status,200,url.pathname);paths.push(url.pathname.split('/').at(-1));
  }
  assert.deepEqual(paths.sort(),['controller.mjs','official-startup-critical.css','official-startup-guard.js','style.css']);
 }
 const gif=nativeMachinePage(new Request(base+'/'+release+'/official-startup-logo.gif'));assert.equal(gif.headers.get('Content-Type'),'image/gif');assert.equal(Buffer.from(await gif.arrayBuffer()).subarray(0,6).toString(),'GIF89a');
 const old=await machinePage(new Request(base+'/games/multi_hot_5_video'),config).text();assert.ok(!old.includes('official-startup'));assert.ok(old.includes('/'+oldRelease+'/controller.mjs'));assert.ok(!old.includes('data-machine='));
});
test('all native asset bytes match current public source and shared baseline buffers survive cancellation',async()=>{
 for(const item of manifest.assets){
  const source=await readFile(new URL('../public/'+item.name,import.meta.url));assert.equal(source.length,item.bytes);assert.equal(hash(source),item.sha256);
  if(item.storage!=='array-buffer')continue;
  const response=nativeMachinePage(new Request(base+'/'+release+'/'+item.name));assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),item.type);assert.equal(response.headers.get('Content-Length'),String(item.bytes));assert.deepEqual(Buffer.from(await response.arrayBuffer()),source);
  const head=nativeMachinePage(new Request(base+'/'+release+'/'+item.name,{method:'HEAD'}));assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
 }
 const shared=manifest.assets.find(a=>a.reusedBaseline&&a.bytes>65536);assert.ok(shared);const before=await machinePage(new Request(base+'/'+oldRelease+'/'+shared.name),config).arrayBuffer();
 const reader=nativeMachinePage(new Request(base+'/'+release+'/'+shared.name)).body.getReader();assert.equal((await reader.read()).value.byteLength,65536);await reader.cancel();assert.equal(assets[shared.name].body.byteLength,shared.bytes);
 const after=await machinePage(new Request(base+'/'+oldRelease+'/'+shared.name),config).arrayBuffer();assert.deepEqual(Buffer.from(after),Buffer.from(before));
 for(const name of ['index.html','constructor','toString','__proto__','missing.mjs'])assert.equal(nativeMachinePage(new Request(base+'/'+release+'/'+name)).status,404);
});
test('native wrapper preserves original requests, receiver, lifecycle and all old routes',async()=>{
 const calls=[],env={PORTAL:'player'},ctx={marker:true};const previous={tag:'old',fetch(request,e,c){assert.equal(this,previous);calls.push({request,e,c});return new Response('original');},scheduled(event,e,c){assert.equal(this,previous);return [event,e,c];},queue(batch){assert.equal(this,previous);return batch;}};
 const wrapper=installNativeMachines(previous);
 for(const [path,method,e]of [['/games/multi_hot_5_video','GET',env],['/games/hot_foxy_20','GET',env],['/games/multi_hot_100','GET',env],['/games/wild_multi_stars','GET',env],['/api/slots/spin','POST',env],['/api/machine-session','GET',env],['/games/foxy_hot_20_native','POST',env],['/games/foxy_hot_20_native','GET',{PORTAL:'agent'}]]){
  const request=new Request(base+path,{method});assert.equal(await (await wrapper.fetch(request,e,ctx)).text(),'original');const row=calls.at(-1);assert.equal(row.request,request);assert.equal(row.e,e);assert.equal(row.c,ctx);
 }
 const before=calls.length;assert.equal(wrapper.fetch(new Request(base+'/games/foxy_hot_20_native'),env,ctx).status,200);assert.equal(calls.length,before);const event={};assert.deepEqual(wrapper.scheduled(event,env,ctx),[event,env,ctx]);assert.equal(wrapper.queue(event),event);
});
