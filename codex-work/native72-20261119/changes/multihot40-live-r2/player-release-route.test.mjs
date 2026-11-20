import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {installMultiHot40Release} from './player-release-route.mjs';
const prefix='/native-library/existing-new/20261110-etb1-40000-r1/multihot40/';
function fixture(mode){
 const source=new TextEncoder().encode('export const presentationOnly=true;'),bytes=source.buffer;
 const hash=createHash('sha256').update(source).digest('hex'),calls=[];
 const pins={gameId:'multihot40_native',release:'qa-release',files:Object.fromEntries(['multihot40-app.mjs','multihot40-presentation.mjs','multihot40-motion.mjs'].map(file=>[file,{sha256:hash,size:source.byteLength,kvKey:'qa/'+file}]))};
 const previous={scheduled(){return 'retained';},fetch(...args){calls.push(args);return new Response('original');}};
 const env={PORTAL:'player',SSG_OFFICIAL_REFERENCES:{async get(){if(mode==='missing')return null;if(mode==='corrupt'){const altered=source.slice();altered[0]^=1;return altered.buffer;}return bytes;}}};
 return {handler:installMultiHot40Release(previous,pins),calls,env,source};
}
test('only exact MH40 presentation GET/HEAD paths return verified pinned bytes',async()=>{
 const x=fixture();
 for(const path of ['/zplay-fixes/mh40-20261117/multihot40-app.mjs',prefix+'multihot40-app.mjs',prefix+'multihot40-presentation.mjs',prefix+'presentation/multihot40-motion.mjs']){
  const r=await x.handler.fetch(new Request('https://qa.invalid'+path+'?v=old'),x.env,{});
  assert.equal(r.status,200);assert.equal(r.headers.get('x-zplay-release'),'qa-release');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),x.source);
 }
 const head=await x.handler.fetch(new Request('https://qa.invalid'+prefix+'multihot40-app.mjs',{method:'HEAD'}),x.env,{});
 assert.equal(await head.text(),'');assert.equal(x.calls.length,0);assert.equal(x.handler.scheduled(),'retained');
});
test('wallet, Player auth, every other game and non-GET operations delegate unchanged',async()=>{
 const x=fixture(),ctx={marker:1};
 for(const [path,method] of [['/api/expansion/action','POST'],['/api/slots/spin','POST'],['/api/expansion/state','GET'],['/','GET'],['/games/multihot10_native','GET'],[prefix+'session.mjs','GET'],[prefix+'multihot40-app.mjs','POST']]){
  const req=new Request('https://qa.invalid'+path,{method});const r=await x.handler.fetch(req,x.env,ctx);
  assert.equal(await r.text(),'original');assert.deepEqual(x.calls.at(-1),[req,x.env,ctx]);
 }
 const other={...x.env,PORTAL:'admin'};await x.handler.fetch(new Request('https://qa.invalid'+prefix+'multihot40-app.mjs'),other,ctx);
 assert.equal(x.calls.at(-1)[1],other);
});
test('missing or corrupt KV media fails closed without running financial handlers',async()=>{
 for(const mode of ['missing','corrupt']){
  const x=fixture(mode),r=await x.handler.fetch(new Request('https://qa.invalid'+prefix+'multihot40-app.mjs'),x.env,{});
  assert.equal(r.status,503);assert.equal(x.calls.length,0);
 }
});
