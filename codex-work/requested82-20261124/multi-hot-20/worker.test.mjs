import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createM20RecoveryWorker,GAME_PATH} from './worker.mjs';
import {buildM20Recovery} from './build.mjs';

const revision='79bb7e48737feb68a2e905f8',previousAppPath=`/_zplay/new90-m20/${revision}/app.${'a'.repeat(64)}.mjs`;
const app='export const fixture = true;\n',appSha256=createHash('sha256').update(app).digest('hex');
const config={baselineRevision:revision,previousAppPath,appSha256,appBytes:Buffer.byteLength(app),appPath:`/_zplay/requested82-m20/${appSha256}/app.mjs`,appKey:`requested82/m20/recovery/${appSha256}/app.mjs`};
const html=`<head><link rel="stylesheet" href="/unchanged.css"><script type="module" src="${previousAppPath}"></script></head><body><main id="m20-game" data-manifest-url="/unchanged-assets.json"></main></body>`;
function setup(body=html,headers={}) {
  const calls=[],previous={marker:'preserved',fetch:async request=>{calls.push(request);return new Response(body,{headers:{'Content-Type':'text/html; charset=utf-8','X-Zplay-M20-Release':revision,'Content-Security-Policy':"default-src 'none'; script-src 'self'",'ETag':'old','Set-Cookie':'fixture=opaque; HttpOnly',...headers}})}};
  const bytes=new TextEncoder().encode(app).buffer;
  return {calls,worker:createM20RecoveryWorker(previous,config),env:{SSG_OFFICIAL_REFERENCES:{get:async()=>bytes}}};
}
test('only the exact M20 app URL changes; style, manifest, CSP and cookies stay intact',async()=>{
  const f=setup(),r=await f.worker.fetch(new Request('https://fixture'+GAME_PATH),f.env,{}),text=await r.text();
  assert.equal(text,html.replace(previousAppPath,config.appPath));assert.equal(r.headers.get('etag'),null);
  assert.equal(r.headers.get('set-cookie'),'fixture=opaque; HttpOnly');assert.equal(r.headers.get('content-security-policy'),"default-src 'none'; script-src 'self'");
  assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(f.calls.length,1);assert.equal(f.worker.marker,'preserved');
});
test('all dashboard/account/media/financial requests remain delegated unchanged',async()=>{
  const f=setup();for(const[path,method]of [['/','GET'],['/api/slots/spin','POST'],['/api/auth/login','POST'],['/player/wallet','GET'],['/unchanged.css','GET'],[GAME_PATH,'HEAD'],[GAME_PATH,'POST']]) {
    const request=new Request('https://fixture'+path,{method});await f.worker.fetch(request,f.env,{});assert.equal(f.calls.at(-1),request);
  }assert.equal(f.calls.length,7);
});
test('a stale or duplicated original page cannot silently activate mismatched code',async()=>{
  for(const f of [setup(html,{'X-Zplay-M20-Release':'f'.repeat(24)}),setup(html+html),setup('<main id="m20-game"></main>')]) {
    const r=await f.worker.fetch(new Request('https://fixture'+GAME_PATH),f.env,{});assert.equal(r.status,503);
  }
});
test('new content-addressed script validates exact KV bytes and rejects mutation or missing media',async()=>{
  const f=setup(),request=new Request('https://fixture'+config.appPath);
  const r=await f.worker.fetch(request,f.env,{});assert.equal(await r.text(),app);assert.match(r.headers.get('cache-control'),/immutable/);
  assert.equal(f.calls.length,0);assert.equal((await f.worker.fetch(new Request(request,{method:'HEAD'}),f.env,{})).body,null);
  const corrupt={SSG_OFFICIAL_REFERENCES:{get:async()=>new TextEncoder().encode(app.replace('true','fake')).buffer}};
  assert.equal((await f.worker.fetch(request,corrupt,{})).status,503);assert.equal((await f.worker.fetch(request,{},{})).status,503);
  assert.equal((await f.worker.fetch(new Request(request,{method:'POST'}),f.env,{})).status,405);
});
test('invalid paths or a reused asset key are rejected before serving',()=>{
  for(const change of [{appKey:'old/immutable/app.mjs'},{previousAppPath:'/other.js'},{appPath:'/api/slots/spin'},{appBytes:0},{baselineRevision:'other'}]) {
    assert.throws(()=>createM20RecoveryWorker({fetch(){}},{...config,...change}),/CONFIG_INVALID/);
  }
});
test('release is additive, preserves every prior export, and keeps JS out of Worker source budget',async()=>{
  const build=await buildM20Recovery({activeMainModule:'new90m20r1/entry.mjs',baselineRevision:revision,previousAppPath});
  assert.equal(build.modules.length,3);assert.equal(build.staticFiles.length,1);assert(build.report.workerBytes<10000);
  assert(build.report.appBytes>50000);assert.match(build.modules[0].source,/export\*/);
  assert(build.modules.every(m=>!m.source.includes(build.staticFiles[0].source)));assert.equal(build.report.financialRequestsChanged,false);
  assert.notEqual(build.config.appPath,previousAppPath);assert.equal(build.config.appSha256,createHash('sha256').update(build.staticFiles[0].source).digest('hex'));
});
