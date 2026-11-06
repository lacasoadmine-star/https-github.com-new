import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assets,release,htmlTemplate} from '../worker/machine-assets-20261106.mjs';
import {machinePage} from '../worker/machine-routes.mjs';
import {packWorkerAssets} from '../scripts/pack-worker-assets.mjs';

const origin='https://worker-assets.example',config={presence:'presence.63ed199a80b6c700.mjs'};
const manifest=JSON.parse(await readFile(new URL('../worker/machine-assets-manifest.json',import.meta.url),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
test('every typed data module and HTTP response exactly matches the original frontend bytes',async()=>{
 assert.equal(manifest.release,release);
 assert.equal(Object.keys(assets).length,manifest.assets.length-1);
 assert.equal(manifest.packaging,'typed-binary-modules');
 for(const entry of manifest.assets){
  const source=await readFile(new URL('../public/'+entry.name,import.meta.url));
  assert.equal(source.length,entry.bytes,entry.name+' length');assert.equal(digest(source),entry.sha256,entry.name+' hash');
  if(entry.name==='index.html'){assert.deepEqual(Buffer.from(htmlTemplate),source);continue;}
  assert.ok(assets[entry.name].body instanceof ArrayBuffer,entry.name+' must not be parsed as a string');
  const file=await readFile(new URL('../worker/'+entry.module,import.meta.url));assert.deepEqual(file,source,entry.name+' typed part');
  const response=machinePage(new Request(origin+'/'+release+'/'+entry.name),config);
  assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),entry.type);assert.equal(response.headers.get('Content-Length'),String(source.length));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),source,entry.name+' HTTP bytes');
  const head=machinePage(new Request(origin+'/'+release+'/'+entry.name,{method:'HEAD'}),config);
  assert.equal(head.status,200);assert.equal(head.headers.get('Content-Length'),String(source.length));assert.equal((await head.arrayBuffer()).byteLength,0);
 }
});
test('HTML substitution remains exact for all four route identities and does not expose the raw template',async()=>{
 for(const id of ['multi_hot_5_video','hot_foxy_20','multi_hot_100','wild_multi_stars']){
  const expected=htmlTemplate.replace('{{GAME}}',id).replace('</body>','<script type="module" src="/player-v236/'+config.presence+'"></script></body>');
  const response=machinePage(new Request(origin+'/games/'+id),config);assert.equal(await response.text(),expected);assert.equal(response.headers.get('Cache-Control'),'no-store');
  const head=machinePage(new Request(origin+'/games/'+id,{method:'HEAD'}),config);assert.equal((await head.arrayBuffer()).byteLength,0);
 }
 for(const name of ['index.html','constructor','toString','__proto__','missing.mjs'])assert.equal(machinePage(new Request(origin+'/'+release+'/'+name),config).status,404,name);
});
test('large streamed responses use bounded chunks and cancellation never detaches reusable data',async()=>{
 const [name,asset]=Object.entries(assets).sort((a,b)=>b[1].size-a[1].size)[0],size=asset.body.byteLength,request=new Request(origin+'/'+release+'/'+name);
 assert.ok(size>65536);
 const one=machinePage(request,config).body.getReader(),two=machinePage(request,config).body.getReader();
 const [first,parallel]=await Promise.all([one.read(),two.read()]);assert.equal(first.value.byteLength,65536);assert.deepEqual(first.value,parallel.value);
 await one.cancel();const next=await two.read();assert.equal(next.value.byteLength,65536);assert.deepEqual(next.value,new Uint8Array(asset.body,65536,65536));await two.cancel();
 assert.equal(asset.body.byteLength,size);
 const repeat=machinePage(request,config).body.getReader();assert.deepEqual((await repeat.read()).value,first.value);await repeat.cancel();
});
test('packer preserves non-UTF8 bytes, declares octet-stream parts, and rejects stale release URLs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'machine-assets-')),publicDirectory=join(root,'public'),workerDirectory=join(root,'worker'),selectedRelease='zplay-machines-test-binary';
 try{
  await mkdir(publicDirectory);const html='<body data-game="{{GAME}}"><script src="/'+selectedRelease+'/controller.mjs"></script></body>',bytes=Buffer.from([0,255,254,253,128,10,13,0]);
  await writeFile(join(publicDirectory,'index.html'),html);await writeFile(join(publicDirectory,'sample.bin'),bytes);await writeFile(join(publicDirectory,'controller.mjs'),'export const text="£€😀";');
  const result=await packWorkerAssets({publicDirectory,workerDirectory,release:selectedRelease}),part=result.modules.find(m=>m.source==='public/sample.bin');
  assert.equal(part.type,'application/octet-stream');assert.deepEqual(await readFile(join(workerDirectory,part.name)),bytes);assert.equal(part.sha256,digest(bytes));
  const js=await readFile(join(workerDirectory,result.entryModule),'utf8');assert.match(js,/import data\d+ from "\.\/machine-data\//);assert.ok(!js.includes('export const text='));assert.ok(js.includes(html.replaceAll('"','\\"')));
  await writeFile(join(publicDirectory,'controller.mjs'),'import "/zplay-machines-stale/controller.mjs";');
  await assert.rejects(packWorkerAssets({publicDirectory,workerDirectory,release:selectedRelease}),/Stale asset release path/);
  assert.equal(await readFile(join(workerDirectory,result.entryModule),'utf8'),js,'failed build must not replace the runnable manifest');
 }finally{await rm(root,{recursive:true,force:true});}
});
