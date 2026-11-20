import test from 'node:test';
import assert from 'node:assert/strict';
import pins from './player-route-pins.json' with {type:'json'};
import {validateGamePins,createBatch01Routes,wrapBatch01Player} from './player-kv-route.mjs';

const ORIGIN='https://superwin-player.apdiy61.workers.dev';
const get=new Map();
for(const game of Object.values(pins.games))for(const item of Object.values(game.files))get.set(item.key,item);
const allowed=()=>({PORTAL:'player',SSG_OFFICIAL_REFERENCES:{
 async getWithMetadata(key){
  const item=get.get(key);if(!item)return null;
  return {value:new Uint8Array(item.bytes).buffer,metadata:{bytes:item.bytes,sha256:item.sha256,contentType:item.type}};
 }
}});
const fakeVerifier=async bytes=>{
 for(const item of get.values())if(item.bytes===bytes.length)return item.sha256;
 return '0'.repeat(64);
};

test('all 45 paths are pinned to exactly two isolated games, no fake wallet',()=>{
 const validated=validateGamePins(pins);
 assert.equal(Object.keys(validated.games).length,2);
 assert.equal(get.size,45);
 assert.equal(validated.games.multihot20.id,'fresh_multihot20');
 assert.equal(validated.games.multihot5burnwilds.id,'fresh_multihot5burnwilds');
 assert.equal(validated.games.multihot20.published,false);
 assert.equal(validated.games.multihot5burnwilds.published,false);
 assert.ok([...get.keys()].every(key=>key.startsWith('native72/batch01-20261120-r1/')));
});

test('never publish unapproved Player games from a route-only patch',async()=>{
 const route=createBatch01Routes({pins});
 const response=await route(new Request(ORIGIN+'/new74/multi-hot-20/'),allowed());
 assert.equal(response.status,503);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
});

test('GET, HEAD, ETag and module MIME types on two isolated routes',async()=>{
 const route=createBatch01Routes({pins,verifyAsset:fakeVerifier,allowUnpublishedForQA:true});
 for(const game of Object.values(pins.games)){
  const url=ORIGIN+game.path;
  const html=await route(new Request(url),allowed());
  assert.equal(html.status,200);
  assert.equal(html.headers.get('Content-Type'),'text/html; charset=utf-8');
  assert.equal(html.headers.get('X-Zplay-Release'),pins.release);
  assert.equal((await html.arrayBuffer()).byteLength,game.files['index.html'].bytes);
  const js=await route(new Request(url+'app.mjs'),allowed());
  assert.equal(js.status,200);
  assert.match(js.headers.get('Content-Type'),/application\/javascript/);
  const etag=js.headers.get('ETag');
  const notModified=await route(new Request(url+'app.mjs',{headers:{'If-None-Match':etag}}),allowed());
  assert.equal(notModified.status,304);
  const head=await route(new Request(url+'assets/seven.png',{method:'HEAD'}),allowed());
  assert.equal(head.status,200);
  assert.equal((await head.arrayBuffer()).byteLength,0);
 }
});

test('router delegates all wallet APIs, earlier games and Durable Object exports intact',async()=>{
 let count=0;
 class ExistingWallet {}
 const prev={LocalDemoWallet:ExistingWallet,fetch:async()=>{count++;return new Response('ORIGINAL',{status:209})}};
 const wrapped=wrapBatch01Player(prev,pins,{allowUnpublishedForQA:true});
 assert.equal(wrapped.LocalDemoWallet,ExistingWallet);
 for(const path of ['/api/slots/spin','/api/slots/fresh-state','/games/multihot40_native','/new74/multi-hot-100/']){
  const res=await wrapped.fetch(new Request(ORIGIN+path,{method:path.includes('spin')?'POST':'GET'}),allowed(),{});
  assert.equal(res.status,209);
 }
 assert.equal(count,4);
});

test('reject modified/corrupt binary even when KV metadata claims correct SHA',async()=>{
 const route=createBatch01Routes({pins,verifyAsset:async()=> '0'.repeat(64),allowUnpublishedForQA:true});
 const res=await route(new Request(ORIGIN+'/new74/multi-hot-20/app.mjs'),allowed());
 assert.equal(res.status,503);
});

test('reject path escapes, mutation and unpinned resources, never touch balances',async()=>{
 const route=createBatch01Routes({pins,verifyAsset:fakeVerifier,allowUnpublishedForQA:true});
 assert.equal((await route(new Request(ORIGIN+'/new74/multi-hot-20/unknown.js'),allowed())).status,404);
 assert.equal((await route(new Request(ORIGIN+'/new74/multi-hot-20/',{method:'POST'}),allowed())).status,405);
 const redirect=await route(new Request(ORIGIN+'/new74/multi-hot-20'),allowed());
 assert.equal(redirect.status,308);
 assert.equal(redirect.headers.get('Location'),ORIGIN+'/new74/multi-hot-20/');
});

test('cross-contaminated symbol keys and routes fail validation',()=>{
 const tampered=structuredClone(pins);
 tampered.games.multihot20.files['assets/seven.png'].key=tampered.games.multihot5burnwilds.files['assets/seven.png'].key;
 assert.throws(()=>validateGamePins(tampered),/INVALID_GAME_ASSET_PIN/);
 const other=structuredClone(pins);
 other.games.multihot5burnwilds.path='/new74/multi-hot-20/';
 assert.throws(()=>validateGamePins(other),/UNRECOGNIZED_GAME_RELEASE/);
});
