import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
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
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

// Use the real checked-out game source and actual media manifest. Binary media
// is only pinned here; browser acceptance verifies and decodes its real bytes.
async function currentM20Candidate(){
 const candidate=structuredClone(pins),bodies=new Map();candidate.release='batch01-20261121-r6';
 for(const [slug,game] of Object.entries(candidate.games))for(const [name,pin] of Object.entries(game.files))
  pin.key='native72/'+candidate.release+'/'+slug+'/'+name;
 const game=candidate.games.multihot20;game.published=true;game.files={};
 const mime={mjs:'application/javascript; charset=utf-8',html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json'};
 for(const name of ['app.mjs','index.html','style.css','scene.mjs','assets.mjs','controller.mjs','session.mjs','assets.json']){
  const body=await readFile(new URL('./multihot20/'+name,import.meta.url));
  const pin={key:'native72/'+candidate.release+'/multihot20/'+name,bytes:body.length,sha256:digest(body),type:mime[name.split('.').at(-1)]};
  game.files[name]=pin;bodies.set(pin.key,{body,pin});
 }
 const manifest=JSON.parse(bodies.get(game.files['assets.json'].key).body.toString('utf8'));
 for(const [name,pin] of Object.entries(manifest.files))game.files['assets/'+name]={
  key:'native72/'+candidate.release+'/multihot20/assets/'+name,bytes:pin.bytes,sha256:pin.sha256,type:pin.contentType};
 return {candidate,manifest,bodies};
}

test('all 57 source, wheel, artwork and sound paths are pinned to exactly two isolated games, no fake wallet',()=>{
 const validated=validateGamePins(pins);
 assert.equal(Object.keys(validated.games).length,2);
 assert.equal(get.size,57);
 assert.ok(Object.values(pins.games).every(g=>g.files['assets/wheel.png']), 'multiplier wheel texture must be accessible to gameplay');
 assert.ok(Object.values(pins.games).every(g=>g.files['assets/music.mp3']), 'original opt-in music must be accessible');
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

test('actual thirteen-file M20 manifest forms a valid atlas package and serves exact current source bytes',async()=>{
 const {candidate,manifest,bodies}=await currentM20Candidate(),validated=validateGamePins(candidate);
 assert.equal(Object.keys(manifest.files).length,13);
 assert.equal(Object.keys(validated.games.multihot20.files).length,21);
 assert.deepEqual(Object.keys(validated.games.multihot20.files).filter(name=>name.startsWith('assets/')).sort(),
  Object.keys(manifest.files).map(name=>'assets/'+name).sort());
 assert.equal(validated.games.multihot20.files['assets/seven.png'],undefined);
 assert.equal(validated.games.multihot20.files['assets/other-fruits.png'],undefined);
 for(const file of ['wins.png','wins2.png'])assert.equal(validated.games.multihot20.files['assets/'+file].sha256,manifest.files[file].sha256);
 const expectedBurn=structuredClone(pins.games.multihot5burnwilds);
 for(const [name,pin] of Object.entries(expectedBurn.files))pin.key='native72/'+candidate.release+'/multihot5burnwilds/'+name;
 assert.deepEqual(validated.games.multihot5burnwilds,expectedBurn);
 const env={PORTAL:'player',SSG_OFFICIAL_REFERENCES:{async getWithMetadata(key){
  const entry=bodies.get(key);assert.ok(entry,'this test serves actual source files only');
  return {value:entry.body,metadata:{bytes:entry.pin.bytes,sha256:entry.pin.sha256,contentType:entry.pin.type}};
 }}};
 const route=createBatch01Routes({pins:candidate});
 for(const name of ['index.html','assets.json','app.mjs']){
  const url=ORIGIN+candidate.games.multihot20.path+(name==='index.html'?'':name);
  const response=await route(new Request(url),env),expected=bodies.get(candidate.games.multihot20.files[name].key);
  assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),expected.body);
  const head=await route(new Request(url,{method:'HEAD'}),env);assert.equal(head.status,200);
  assert.equal(head.headers.get('Content-Length'),String(expected.body.length));assert.equal((await head.arrayBuffer()).byteLength,0);
 }
 assert.equal((await route(new Request(ORIGIN+candidate.games.multihot5burnwilds.path),env)).status,503);
});

test('M20 refuses old published sprites, missing atlas media, and mixed old/new packages',async()=>{
 const legacy=structuredClone(pins);legacy.games.multihot20.published=true;
 assert.throws(()=>validateGamePins(legacy),/INCOMPLETE_GAME_PACKAGE_multihot20/);
 assert.equal(validateGamePins(pins).games.multihot20.published,false,'retained closed base pins remain usable by the release builder');
 const {candidate}=await currentM20Candidate();
 for(const name of Object.keys(candidate.games.multihot20.files)){
  const missing=structuredClone(candidate);delete missing.games.multihot20.files[name];
  assert.throws(()=>validateGamePins(missing),/INCOMPLETE_GAME_PACKAGE_multihot20/,name+' is required');
 }
 const mixed=structuredClone(candidate);
 mixed.games.multihot20.files['assets/seven.png']={...pins.games.multihot20.files['assets/seven.png'],
  key:'native72/'+mixed.release+'/multihot20/assets/seven.png'};
 assert.throws(()=>validateGamePins(mixed),/INCOMPLETE_GAME_PACKAGE_multihot20/);
 for(const name of ['assets/wins.png','assets/wins2.png']){
  const closedPartial=structuredClone(mixed);closedPartial.games.multihot20.published=false;
  delete closedPartial.games.multihot20.files[name];
  closedPartial.games.multihot20.files['assets/other-fruits.png']={...pins.games.multihot20.files['assets/other-fruits.png'],
   key:'native72/'+closedPartial.release+'/multihot20/assets/other-fruits.png'};
  assert.throws(()=>validateGamePins(closedPartial),/INCOMPLETE_GAME_PACKAGE_multihot20/,'legacy sprites cannot mask a missing WIN sheet');
 }
 for(const name of ['assets/seven.png','assets/other-fruits.png']){
  const missingBurn=structuredClone(candidate);delete missingBurn.games.multihot5burnwilds.files[name];
  assert.throws(()=>validateGamePins(missingBurn),/INCOMPLETE_GAME_PACKAGE_multihot5burnwilds/);
 }
});

test('GET, HEAD, ETag and module MIME types on two isolated routes',async()=>{
 const route=createBatch01Routes({pins,verifyAsset:fakeVerifier,allowUnpublishedForQA:true});
 for(const game of Object.values(pins.games)){
  const url=ORIGIN+game.path;
  const html=await route(new Request(url),allowed());
  assert.equal(html.status,200);
  assert.equal(html.headers.get('Content-Type'),'text/html; charset=utf-8');
  assert.equal(html.headers.get('X-Zplay-Release'),pins.release);
  assert.match(html.headers.get('Content-Security-Policy'),/media-src 'self'/);
  assert.equal((await html.arrayBuffer()).byteLength,game.files['index.html'].bytes);
  const js=await route(new Request(url+'app.mjs'),allowed());
  assert.equal(js.status,200);
  assert.match(js.headers.get('Content-Type'),/application\/javascript/);
  const etag=js.headers.get('ETag');
  const notModified=await route(new Request(url+'app.mjs',{headers:{'If-None-Match':etag}}),allowed());
  assert.equal(notModified.status,304);
  const wheel=await route(new Request(url+'assets/wheel.png'),allowed());
  assert.equal(wheel.status,200);
  assert.equal(wheel.headers.get('Content-Type'),'image/png');
  const head=await route(new Request(url+'assets/seven.png',{method:'HEAD'}),allowed());
  assert.equal(head.status,200);
  assert.equal((await head.arrayBuffer()).byteLength,0);
 }
});

test('router delegates all wallet APIs, earlier games and Durable Object exports intact',async()=>{
 const received=[];
 class ExistingWallet {}
 const prev={LocalDemoWallet:ExistingWallet,async fetch(request,env,ctx){
  assert.equal(this,prev);received.push({request,env,ctx});return new Response('ORIGINAL',{status:209});
 }};
 const {candidate}=await currentM20Candidate(),wrapped=wrapBatch01Player(prev,candidate);
 assert.equal(wrapped.LocalDemoWallet,ExistingWallet);
 for(const path of ['/api/slots/spin','/api/slots/gamble','/api/slots/fresh-state?gameId=fresh_multihot20',
  '/games/multihot40_native','/new74/multi-hot-100/']){
  const post=path==='/api/slots/spin'||path==='/api/slots/gamble',body=post?JSON.stringify({gameId:'fresh_multihot20',roundToken:'FIXTURE_ONLY'}):undefined;
  const request=new Request(ORIGIN+path,{method:post?'POST':'GET',body,
   headers:{cookie:'sw_session=FIXTURE_ONLY',authorization:'Bearer FIXTURE_ONLY'}}),env=allowed(),ctx={marker:'original-context'};
  const res=await wrapped.fetch(request,env,ctx);
  assert.equal(res.status,209);
  const observed=received.at(-1);assert.equal(observed.request,request);assert.equal(observed.env,env);assert.equal(observed.ctx,ctx);
  assert.equal(observed.request.headers.get('cookie'),'sw_session=FIXTURE_ONLY');
  assert.equal(observed.request.headers.get('authorization'),'Bearer FIXTURE_ONLY');
  assert.equal(await observed.request.clone().text(),body??'');assert.equal(observed.request.url,ORIGIN+path);
 }
 assert.equal(received.length,5);
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
