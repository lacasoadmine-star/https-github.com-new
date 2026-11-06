import test from 'node:test';
import assert from 'node:assert/strict';
import {installPortal,PREFIX,RELEASE} from './portal-router-r9.mjs';
import {gzipSync} from 'node:zlib';
const assets={'portal.css':{body:'body{}',type:'text/css',etag:'"css-r9"'}};
test('only Player homepage receives presentation files; response and security headers survive',async()=>{
 const seen=[],previous={fetch:async(...args)=>{seen.push(args);return new Response('<html><head><script src="/assets/player-reference-v2138.js"></script></head><body>account</body></html>',{headers:{'Content-Type':'text/html','Set-Cookie':'session=preserved; HttpOnly','Content-Security-Policy':"default-src 'self'",ETag:'old'}});}};
 const fetch=installPortal(previous,assets),request=new Request('https://player.example/'),env={PORTAL:'player'},ctx={};
 const response=await fetch(request,env,ctx);assert.equal(seen[0][0],request);assert.equal(seen[0][1],env);assert.equal(seen[0][2],ctx);
 assert.equal(response.headers.get('Set-Cookie'),'session=preserved; HttpOnly');assert.equal(response.headers.get('Content-Security-Policy'),"default-src 'self'");assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Zplay-Portal-Release'),RELEASE);assert.equal(response.headers.get('ETag'),null);
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
test('non-matching or already decorated documents are not rewritten',async()=>{
 for(const body of ['<html><head></head><body>Other app</body></html>','<head><script src="player-reference-v2138.js"></script><link id="zplay-portal-r9-css"></head>']){
  const original=new Response(body,{headers:{'Content-Type':'text/html'}}),fetch=installPortal({fetch:async()=>original},assets);
  assert.equal(await fetch(new Request('https://player.example/'),{PORTAL:'player'}),original);
 }
});
test('compressed and already-decoded gzip responses both receive the portal safely',async()=>{
 const html='<head><script src="player-reference-v2138.js"></script></head><body>Existing account</body>';
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
