import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {packNativeWorkerAssets} from '../scripts/pack-native-worker-assets.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),release='zplay-native-machines-20261107-r1';
const fixture=async()=>{
 const root=await mkdtemp(join(tmpdir(),'native-worker-pack-')),publicDirectory=join(root,'public'),workerDirectory=join(root,'worker');await mkdir(publicDirectory);await mkdir(join(workerDirectory,'machine-data'),{recursive:true});
 const shared=Buffer.from('export const asset="unchanged original bytes";\n'),changed=Buffer.from('old shared name, old bytes');
 const assets=[];for(const [name,body]of [['shared.mjs',shared],['changed.mjs',changed]]){const module='machine-data/'+name+'.bin';await writeFile(join(workerDirectory,module),body);assets.push({name,module,storage:'array-buffer',bytes:body.length,sha256:sha(body)});}
 const baseline=JSON.stringify({release:'zplay-machines-20261106-r12',packaging:'typed-binary-modules',assets});await writeFile(join(workerDirectory,'machine-assets-manifest.json'),baseline);await writeFile(join(workerDirectory,'machine-assets-20261106.mjs'),'old immutable entry');await writeFile(join(workerDirectory,'machine-routes.mjs'),'old immutable routes');
 const gif=Buffer.from([71,73,70,56,57,97,...Array.from({length:256},(_,i)=>i),255,192]);
 await writeFile(join(publicDirectory,'index.html'),'<body data-game="{{PRESENTATION_GAME}}" data-machine="{{GAME}}"><script type="module" src="/'+release+'/shared.mjs"></script></body>');await writeFile(join(publicDirectory,'shared.mjs'),shared);await writeFile(join(publicDirectory,'changed.mjs'),'new native bytes only');await writeFile(join(publicDirectory,'original.gif'),gif);
 return{root,publicDirectory,workerDirectory,baseline,shared,changed,gif};
};
test('native pack shares identical baseline bytes and adds only different bytes without touching any old file',async()=>{
 const f=await fixture();try{
  const manifest=await packNativeWorkerAssets({...f,release});
  assert.equal(manifest.packaging,'additive-typed-binary-modules');assert.deepEqual(manifest.reusedBaselineModules,['machine-data/shared.mjs.bin']);
  assert.equal(manifest.assets.find(a=>a.name==='shared.mjs').module,'machine-data/shared.mjs.bin');assert.equal(manifest.assets.find(a=>a.name==='changed.mjs').module,'native-machine-data/changed.mjs.bin');
  const gif=manifest.assets.find(a=>a.name==='original.gif');assert.equal(gif.type,'image/gif');assert.equal(gif.sha256,sha(f.gif));assert.deepEqual(await readFile(join(f.workerDirectory,gif.module)),f.gif);
  assert.equal(await readFile(join(f.workerDirectory,'machine-assets-manifest.json'),'utf8'),f.baseline);assert.deepEqual(await readFile(join(f.workerDirectory,'machine-data/shared.mjs.bin')),f.shared);assert.deepEqual(await readFile(join(f.workerDirectory,'machine-data/changed.mjs.bin')),f.changed);assert.equal(await readFile(join(f.workerDirectory,'machine-assets-20261106.mjs'),'utf8'),'old immutable entry');assert.equal(await readFile(join(f.workerDirectory,'machine-routes.mjs'),'utf8'),'old immutable routes');
  const source=await readFile(join(f.workerDirectory,'native-machine-assets.mjs'),'utf8');assert.ok(source.includes('"./machine-data/shared.mjs.bin"'));assert.ok(!source.includes('"./native-machine-data/shared.mjs.bin"'));
  await writeFile(join(f.workerDirectory,'native-machine-data/stale.bin'),'stale generated native bytes');await packNativeWorkerAssets({...f,release});await assert.rejects(readFile(join(f.workerDirectory,'native-machine-data/stale.bin')),/ENOENT/);assert.deepEqual(await readFile(join(f.workerDirectory,'machine-data/changed.mjs.bin')),f.changed);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
test('native packing rejects changed old assets, old release paths and missing actual/family markers',async()=>{
 const f=await fixture();try{
  await writeFile(join(f.workerDirectory,'machine-data/shared.mjs.bin'),'tampered');await assert.rejects(packNativeWorkerAssets({...f,release}),/Baseline Data module changed/);await writeFile(join(f.workerDirectory,'machine-data/shared.mjs.bin'),f.shared);
  await writeFile(join(f.publicDirectory,'changed.mjs'),'export const path="/zplay-machines-20261106-r12/controller.mjs";');await assert.rejects(packNativeWorkerAssets({...f,release}),/Stale native release/);await writeFile(join(f.publicDirectory,'changed.mjs'),'new native bytes only');
  await writeFile(join(f.publicDirectory,'index.html'),'<body data-game="{{GAME}}"></body>');await assert.rejects(packNativeWorkerAssets({...f,release}),/Native HTML identity markers/);
 }finally{await rm(f.root,{recursive:true,force:true});}
});
