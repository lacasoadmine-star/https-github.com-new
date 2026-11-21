import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createProductionHandler,installProductionGame} from '../baseline/native72deluxe-routes.mjs';
import {sha256} from '../geometry-fixture.mjs';

const oldRelease='zplay-native-machines-20261119-mh5deluxe-r1';
const release='zplay-native-machines-20261121-mh5deluxe-r1';
const oldHash='73c5c1150c90f604576c53eff055e369a19dba52afe9d44384d0f4a203bdc195';
const newHash='8d35b7ab7fa693792c213d68ab9cf5605fd6fdcab7942297e471c85ef03768b8';
const bytes=fs.readFileSync(new URL('../candidate/mh5deluxe-renderer.mjs',import.meta.url));
const source=fs.readFileSync(new URL('./entry.mjs',import.meta.url),'utf8');
const oldAssets={
  'mh5deluxe-renderer.mjs':{type:'application/javascript; charset=utf-8',size:10529,sha256:oldHash,kvKey:`native72/${oldRelease}/${oldHash}`},
  'controller.mjs':{type:'application/javascript; charset=utf-8',size:37533,sha256:'023818aa72b4cd0ff30f81c68118296f0f2fbd051244eb205cab5e236d58e7cf',kvKey:`native72/${oldRelease}/023818aa72b4cd0ff30f81c68118296f0f2fbd051244eb205cab5e236d58e7cf`},
};
const oldHTML=`<!doctype html><html><head><link rel="stylesheet" href="/${oldRelease}/style.css"></head><body data-machine="{{GAME}}" data-game="{{PRESENTATION_GAME}}"><script type="module" src="/${oldRelease}/controller.mjs"></script></body></html>`;
function load({assets=oldAssets,html=oldHTML}={}){
  const previousCalls=[],storageReads=[];
  const previous={marker:'retained-worker',async fetch(request){previousCalls.push({method:request.method,path:new URL(request.url).pathname});return new Response('retained:'+new URL(request.url).pathname,{status:202});},scheduled(){return this.marker;}};
  const linked=source.replace(/^import .*;$/gm,'').replace(/^export \* from .*;$/gm,'').replace('export default ', 'globalThis.worker = ');
  const context=vm.createContext({previous,createProductionHandler,installProductionGame,retainedAssets:assets,retainedHTML:html});
  new vm.Script(linked,{filename:'native72deluxefix20261121/entry.mjs'}).runInContext(context);
  const env={PORTAL:'player',SSG_OFFICIAL_REFERENCES:{async get(key,type){storageReads.push({key,type});if(key===`native72/${release}/${newHash}`)return Uint8Array.from(bytes).buffer;throw Error('Unexpected fixture KV request');}}};
  return {worker:context.worker,env,previousCalls,storageReads};
}
const request=(path,method='GET')=>new Request('https://player.invalid'+path,{method});

test('route factory and candidate renderer are pinned to verified source bytes',()=>{
  const route=fs.readFileSync(new URL('../baseline/native72deluxe-routes.mjs',import.meta.url));
  assert.equal(route.length,2970);
  assert.equal(sha256(route),'2d677af6bf3a35a845c56e9fe334342d0a132d3803d21e21a3bfefea7f0016d9');
  assert.equal(bytes.length,10566);assert.equal(sha256(bytes),newHash);
  assert.match(source,/export \* from '\.\.\/native72mh40r4\/entry\.mjs'/);
});

test('canonical Deluxe page selects the new immutable paths without mutating retained assets',async()=>{
  const before=JSON.stringify(oldAssets),{worker,env,storageReads,previousCalls}=load();
  const response=await worker.fetch(request('/games/multi_hot_5_deluxe_native'),env,{}),html=await response.text();
  assert.equal(response.status,200);assert.equal(response.headers.get('X-Zplay-Release'),release);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.ok(html.includes(`/${release}/controller.mjs`));assert.ok(html.includes(`/${release}/style.css`));
  assert.ok(!html.includes(`/${oldRelease}/`));
  assert.ok(html.includes('/player-v236/presence.63ed199a80b6c700.mjs'));
  assert.equal(JSON.stringify(oldAssets),before);assert.equal(storageReads.length,0);assert.equal(previousCalls.length,0);
});

test('GET and HEAD each read the new pinned renderer once and never read the old key',async()=>{
  for(const method of ['GET','HEAD']){
    const {worker,env,storageReads}=load();
    const response=await worker.fetch(request(`/${release}/mh5deluxe-renderer.mjs`,method),env,{});
    assert.equal(response.status,200);assert.equal(response.headers.get('ETag'),`"${newHash}"`);
    assert.equal(response.headers.get('Cache-Control'),'public, max-age=31536000, immutable');
    assert.deepEqual(storageReads,[{key:`native72/${release}/${newHash}`,type:'arrayBuffer'}]);
    assert.equal((await response.arrayBuffer()).byteLength,method==='HEAD'?0:10566);
  }
});

test('corrupt or unavailable new renderer fails closed with no fallback',async()=>{
  for(const body of [null,new Uint8Array(10566).buffer]){
    const {worker,env,previousCalls}=load();let reads=0;
    env.SSG_OFFICIAL_REFERENCES.get=async()=>{reads++;return body;};
    const response=await worker.fetch(request(`/${release}/mh5deluxe-renderer.mjs`),env,{});
    assert.equal(response.status,503);assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.equal(reads,1);assert.equal(previousCalls.length,0);
  }
});

test('unknown assets do not substitute an old asset or delegate the new prefix',async()=>{
  const {worker,env,previousCalls,storageReads}=load();
  const response=await worker.fetch(request(`/${release}/unknown.mjs`),env,{});
  assert.equal(response.status,404);assert.equal(previousCalls.length,0);assert.equal(storageReads.length,0);
});

test('all old immutable paths, protected native games, other games and API calls are preserved',async()=>{
  const {worker,env,previousCalls,storageReads}=load();
  const cases=[
    [`/${oldRelease}/mh5deluxe-renderer.mjs`,'GET'],
    ['/games/multi_hot_5_native','GET'],['/games/foxy_hot_20_native','GET'],
    ['/zplay74/multi-hot-10/','GET'],['/new74/multi-hot-20/','GET'],
    ['/api/slots/spin','POST'],['/api/slots/session','GET'],
    ['/games/multi_hot_5_deluxe_native','POST'],
  ];
  for(const [path,method]of cases){const response=await worker.fetch(request(path,method),env,{});assert.equal(response.status,202);assert.equal(await response.text(),'retained:'+path);}
  assert.deepEqual(previousCalls,cases.map(([path,method])=>({path,method})));assert.equal(storageReads.length,0);
  assert.equal(worker.scheduled(),'retained-worker');
});

test('agent and admin portals continue through the previous Worker',async()=>{
  for(const portal of ['agent','admin']){
    const {worker,env,previousCalls}=load();env.PORTAL=portal;
    const response=await worker.fetch(request('/games/multi_hot_5_deluxe_native'),env,{});
    assert.equal(response.status,202);assert.equal(previousCalls.length,1);
  }
});

test('unexpected old renderer pin or HTML is rejected before publication',()=>{
  assert.throws(()=>load({assets:{...oldAssets,'mh5deluxe-renderer.mjs':{...oldAssets['mh5deluxe-renderer.mjs'],sha256:'0'.repeat(64)}}}),/BASELINE_MISMATCH/);
  assert.throws(()=>load({html:'<html><body>Unexpected release</body></html>'}),/TEMPLATE_MISMATCH/);
});
