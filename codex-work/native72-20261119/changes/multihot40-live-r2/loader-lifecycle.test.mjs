// Execute the exact asset transport used by the live presentation. No network,
// Player session or wallet callbacks are used by this regression.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('./multihot40-presentation.mjs',import.meta.url),'utf8');
const begin=source.indexOf('    const lockedFetch = async');
const end=source.indexOf('    this.loading = ',begin);
assert.ok(begin>=0&&end>begin);
function transport(fetchImpl,{timeout=20000,aborted=false}={}){
  const presenter={controller:new AbortController(),fetchImpl};
  if(aborted)presenter.controller.abort();
  const context=vm.createContext({AbortController,Response,Error,
    setTimeout:(callback,ms)=>setTimeout(callback,ms===20000?timeout:ms),clearTimeout,presenter});
  vm.runInContext(`presenter.fetchAsset=(function(){${source.slice(begin,end)}return lockedFetch;}).call(presenter);`,context);
  return presenter;
}
const stalledBody=(signal,onRead=()=>{})=>({ok:true,status:200,statusText:'OK',headers:new Headers(),arrayBuffer:()=>{
  onRead();return new Promise((_,reject)=>{
    if(signal.aborted)reject(Error('ASSET_BODY_ABORTED'));
    else signal.addEventListener('abort',()=>reject(Error('ASSET_BODY_ABORTED')),{once:true});
  });
}});

test('outer loader abort still reaches an asset body after HTTP headers have arrived',async()=>{
  let signal,read=false;
  const presenter=transport(async(_url,options)=>{signal=options.signal;return stalledBody(signal,()=>{read=true})});
  const pending=presenter.fetchAsset('https://qa.invalid/atlas');
  // Allow fetch headers and, after the fix, the body read to start.
  await new Promise(resolve=>setImmediate(resolve));
  presenter.controller.abort();
  await assert.rejects(()=>pending,/ASSET_BODY_ABORTED/);
  assert.equal(read,true);assert.equal(signal.aborted,true);
});

test('asset timeout includes body consumption rather than ending at HTTP headers',async()=>{
  let signal,read=false;
  const presenter=transport(async(_url,options)=>{signal=options.signal;return stalledBody(signal,()=>{read=true})},{timeout:10});
  await assert.rejects(()=>presenter.fetchAsset('https://qa.invalid/sound'),/ASSET_BODY_ABORTED/);
  assert.equal(read,true);assert.equal(signal.aborted,true);
});

test('completed asset retains exact bytes, status and headers for the hash-verifying store',async()=>{
  let options;
  const bytes=Uint8Array.from([0,255,127,4]);
  const presenter=transport(async(_url,input)=>{options=input;return new Response(bytes,{status:200,statusText:'Asset OK',headers:{'content-type':'application/octet-stream','x-asset-marker':'qa'}})});
  const response=await presenter.fetchAsset('https://qa.invalid/atlas',{method:'POST',credentials:'include'});
  assert.equal(response.status,200);assert.equal(response.statusText,'Asset OK');
  assert.equal(response.headers.get('x-asset-marker'),'qa');assert.equal(response.headers.get('content-type'),'application/octet-stream');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
  assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
});

test('an already-aborted presentation starts no later asset request',async()=>{
  let calls=0;
  const presenter=transport(async()=>{calls++;return new Response('asset')},{aborted:true});
  await assert.rejects(()=>presenter.fetchAsset('https://qa.invalid/late'),/aborted/i);
  assert.equal(calls,0);
});
