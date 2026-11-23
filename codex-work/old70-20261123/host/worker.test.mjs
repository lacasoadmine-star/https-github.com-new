import test from 'node:test';
import assert from 'node:assert/strict';
import {createOld70Worker,GAME_PATH} from './worker.mjs';
const revision='a'.repeat(24),body=new TextEncoder().encode('verified symbol');
const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),b=>b.toString(16).padStart(2,'0')).join('');
const config={revision,files:{'index.html':'<title>Practice</title>','entry.mjs':'export const practice=true;'},
 media:{['media/'+sha+'.png']:{key:'allowlisted-image',sha256:sha,bytes:body.length,type:'image/png'}}};
test('previous routes retain exact request, env, context, receiver and response',async()=>{
 let seen;const response=new Response('existing');const previous={marker:1,fetch(...args){seen=[this,...args];return response;}};
 const worker=createOld70Worker(previous,config),request=new Request('https://site.example/games/multi_hot_5_native'),env={},ctx={};
 assert.equal(await worker.fetch(request,env,ctx),response);assert.deepEqual(seen,[previous,request,env,ctx]);
});
test('practice page blocks external code and has no financial endpoint',async()=>{
 const worker=createOld70Worker({fetch(){throw Error('unexpected');}},config);
 const response=await worker.fetch(new Request('https://site.example'+GAME_PATH),{},{});
 assert.equal(response.status,200);assert.equal(response.headers.get('x-zplay-mode'),'PRACTICE');
 assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/);
 assert.equal(await response.text(),config.files['index.html']);
 const post=await worker.fetch(new Request('https://site.example'+GAME_PATH,{method:'POST'}),{},{});assert.equal(post.status,405);
});
test('unknown or private resource paths never read KV',async()=>{
 let reads=0;const worker=createOld70Worker({fetch(){return new Response('old');}},config);
 for(const path of ['server/config.json','media/private-history.png','%2e%2e%2fprivate','local-session.test.mjs']){
  const response=await worker.fetch(new Request('https://site.example'+GAME_PATH+path),{OLD70_ART:{get(){reads++;}}},{});
  assert.equal(response.status,404);
 }
 assert.equal(reads,0);
});
test('only hash-verified pinned media is served and HEAD is empty',async()=>{
 const worker=createOld70Worker({fetch(){}},config),env={OLD70_ART:{async get(key,type){assert.equal(key,'allowlisted-image');assert.equal(type,'arrayBuffer');return body.buffer;}}};
 const url='https://site.example'+GAME_PATH+'media/'+sha+'.png';
 const response=await worker.fetch(new Request(url),env,{});assert.equal(await response.text(),'verified symbol');
 assert.match(response.headers.get('cache-control'),/immutable/);
 const head=await worker.fetch(new Request(url,{method:'HEAD'}),env,{});assert.equal(await head.text(),'');
 const bad=await worker.fetch(new Request(url),{OLD70_ART:{async get(){return new Uint8Array(body.length).buffer;}}},{});
 assert.equal(bad.status,503);assert.equal(bad.headers.get('cache-control'),'no-store');
});
