import test from 'node:test';
import assert from 'node:assert/strict';
import {installNativeCatalog,PREFIX,RELEASE} from '../worker/native-catalog.mjs';
const installPortal=(previous,assets)=>installNativeCatalog(previous,assets).fetch;
import {gzipSync} from 'node:zlib';
const assets={'portal.css':{body:'body{}',type:'text/css',etag:'"css-r9"'}};
test('only Player homepage receives presentation files; response and security headers survive',async()=>{
 const seen=[],previous={fetch:async(...args)=>{seen.push(args);return new Response('<html><head><script src="/player-portal-20261106-r9/portal.mjs"></script></head><body>account</body></html>',{headers:{'Content-Type':'text/html','Set-Cookie':'session=preserved; HttpOnly','Content-Security-Policy':"default-src 'self'",ETag:'old'}});}};
 const fetch=installPortal(previous,assets),request=new Request('https://player.example/'),env={PORTAL:'player'},ctx={};
 const response=await fetch(request,env,ctx);assert.equal(seen[0][0],request);assert.equal(seen[0][1],env);assert.equal(seen[0][2],ctx);
 assert.equal(response.headers.get('Set-Cookie'),'session=preserved; HttpOnly');assert.equal(response.headers.get('Content-Security-Policy'),"default-src 'self'");assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Zplay-Native-Catalog-Release'),RELEASE);assert.equal(response.headers.get('ETag'),null);
 const html=await response.text();assert.ok(html.includes(PREFIX+'portal.mjs'));assert.ok(html.includes('account'));
});
test('auth, payments, games and other portals pass original requests and responses through unchanged',async()=>{
 for(const [path,method,portal]of [['/api/login','POST','player'],['/api/withdrawal','POST','player'],['/api/slots/spin','POST','player'],['/games/multi_hot_5_video','GET','player'],['/','GET','agent'],['/','GET','admin'],['/','HEAD','player']]){
  const original=new Response('unchanged',{headers:{'Content-Type':'text/html'}}),request=new Request('https://player.example'+path,{method}),env={PORTAL:portal},ctx={};
  const fetch=installPortal({fetch:async(r,e,c)=>{assert.equal(r,request);assert.equal(e,env);assert.equal(c,ctx);return original;}},assets);
  assert.equal(await fetch(request,env,ctx),original);
 }
});
test('static files support immutable caching, conditional and HEAD requests',async()=>{
 let called=false;const fetch=installPortal({fetch:async()=>{called=true;return new Response();}},assets),env={PORTAL:'player'};
 const response=await fetch(new Request('https://player.example'+PREFIX+'portal.css'),env);assert.equal(await response.text(),'body{}');assert.match(response.headers.get('Cache-Control'),/immutable/);assert.equal(called,false);
 assert.equal((await fetch(new Request('https://player.example'+PREFIX+'portal.css',{headers:{'If-None-Match':'"css-r9"'}}),env)).status,304);
 const head=await fetch(new Request('https://player.example'+PREFIX+'portal.css',{method:'HEAD'}),env);assert.equal(await head.text(),'');assert.equal(head.headers.get('ETag'),'"css-r9"');
 assert.equal((await fetch(new Request('https://player.example'+PREFIX+'missing.mjs'),env)).status,404);
 assert.equal((await fetch(new Request('https://player.example'+PREFIX+'portal.css',{method:'POST'}),env)).status,405);
});
test('GET and HEAD If-None-Match weak validators, lists and wildcard return 304',async()=>{
 const fetch=installPortal({fetch:async()=>{throw Error('Unexpected delegation');}},assets),env={PORTAL:'player'};
 for(const method of ['GET','HEAD'])for(const value of ['W/"css-r9"','"other", W/"css-r9"','W/"other", "css-r9"','W/"other,opaque", W/"css-r9"','*']){
  const response=await fetch(new Request('https://player.example'+PREFIX+'portal.css',{method,headers:{'If-None-Match':value}}),env);
  assert.equal(response.status,304,method+' '+value);assert.equal(await response.text(),'');assert.equal(response.headers.get('ETag'),'"css-r9"');
 }
});
test('nonmatching opaque validators never match prefixes, case changes or malformed values',async()=>{
 const fetch=installPortal({fetch:async()=>{throw Error('Unexpected delegation');}},assets),env={PORTAL:'player'};
 for(const method of ['GET','HEAD'])for(const value of ['W/"other"','"other", W/"css-r9-more"','W/"CSS-r9"','"css-r"','css-r9','W/"css-r9']){
  const response=await fetch(new Request('https://player.example'+PREFIX+'portal.css',{method,headers:{'If-None-Match':value}}),env);
  assert.equal(response.status,200,method+' '+value);assert.equal(await response.text(),method==='HEAD'?'':'body{}');
 }
});
test('non-matching or already decorated documents are not rewritten',async()=>{
 for(const body of ['<html><head></head><body>Other app</body></html>','<head><script src="/player-portal-20261106-r9/portal.mjs"></script><link id="zplay-native-catalog-css"></head>']){
  const original=new Response(body,{headers:{'Content-Type':'text/html'}}),fetch=installPortal({fetch:async()=>original},assets);
  assert.equal(await fetch(new Request('https://player.example/'),{PORTAL:'player'}),original);
 }
});
test('compressed and already-decoded gzip responses both receive the portal safely',async()=>{
 const html='<head><script src="/player-portal-20261106-r9/portal.mjs"></script></head><body>Existing account</body>';
 for(const body of [gzipSync(html),html]){
  const original=new Response(body,{headers:{'Content-Type':'text/html','Content-Encoding':'gzip'}}),fetch=installPortal({fetch:async()=>original},assets);
  const response=await fetch(new Request('https://player.example/'),{PORTAL:'player'});
  assert.ok((await response.text()).includes(PREFIX+'portal.mjs'));assert.equal(response.headers.get('Content-Encoding'),null);
 }
});
test('failed gzip decoding preserves the original response instead of breaking the homepage',async()=>{
 const original=new Response(new Uint8Array([31,139,0]),{headers:{'Content-Type':'text/html','Content-Encoding':'gzip'}}),fetch=installPortal({fetch:async()=>original},assets);
 assert.equal(await fetch(new Request('https://player.example/'),{PORTAL:'player'}),original);
 assert.deepEqual(new Uint8Array(await original.arrayBuffer()),new Uint8Array([31,139,0]));
});

test('lifecycle handlers retain their original receiver and old asset URLs never get intercepted',async()=>{
 const previous={scheduled(){assert.equal(this,previous);return 'scheduled';},queue(){assert.equal(this,previous);return 'queue';},fetch:async()=>new Response('old immutable asset')};
 const wrapper=installNativeCatalog(previous,assets);assert.equal(wrapper.scheduled(),'scheduled');assert.equal(wrapper.queue(),'queue');
 const response=await wrapper.fetch(new Request('https://player.example/player-portal-20261106-r9/portal.mjs'),{PORTAL:'player'});assert.equal(await response.text(),'old immutable asset');
});
test('original provider cover bytes are served with correct image content type',async()=>{
 const {assets:built}=await import('../worker/native-catalog-assets.mjs');const {readFile}=await import('node:fs/promises');
 const wrapper=installNativeCatalog({fetch:()=>{throw Error('Unexpected delegation');}},built);
 for(const name of ['foxy-hot-20.webp','multi-hot-5.webp']){const response=await wrapper.fetch(new Request('https://player.example'+PREFIX+name),{PORTAL:'player'});assert.equal(response.headers.get('Content-Type'),'image/webp');assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(new URL('./'+name,import.meta.url)));}
});
test('typed catalogue files stream exact bytes in bounded chunks without detaching shared assets',async()=>{
 const {assets:built}=await import('../worker/native-catalog-assets.mjs');const {readFile}=await import('node:fs/promises');
 const wrapper=installNativeCatalog({fetch:()=>{throw Error('Unexpected delegation');}},built);
 for(const [name,asset] of Object.entries(built)){
  const original=await readFile(new URL('./'+name,import.meta.url)),before=asset.body.byteLength;
  assert.equal(before,original.length);assert.ok(asset.body instanceof ArrayBuffer);
  for(let attempt=0;attempt<2;attempt++){
   const response=await wrapper.fetch(new Request('https://player.example'+PREFIX+name),{PORTAL:'player'}),reader=response.body.getReader(),chunks=[];
   for(;;){const {done,value}=await reader.read();if(done)break;assert.ok(value.byteLength<=65536);chunks.push(value);}
   assert.deepEqual(Buffer.concat(chunks),original);assert.equal(asset.body.byteLength,before);
  }
  for(const options of [{method:'HEAD'},{headers:{'If-None-Match':asset.etag}}]){
   const response=await wrapper.fetch(new Request('https://player.example'+PREFIX+name,options),{PORTAL:'player'});assert.equal(response.status,options.method?200:304);assert.equal((await response.arrayBuffer()).byteLength,0);assert.equal(asset.body.byteLength,before);
  }
 }
});
