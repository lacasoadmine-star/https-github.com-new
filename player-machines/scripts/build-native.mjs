import {RELEASE} from '../public/registry.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {packNativeWorkerAssets} from './pack-native-worker-assets.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=await packNativeWorkerAssets({publicDirectory:root+'public',workerDirectory:root+'worker',release:RELEASE});
for(const name of ['native-machine-routes.mjs','native-machine-entry.mjs','native-entry-20261107.mjs']){const bytes=await readFile(root+'worker/'+name);manifest.modules.push({name,file:'worker/'+name,type:'application/javascript+module',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(root+'worker/native-machine-assets-manifest.json',JSON.stringify(manifest,null,2)+'\n');
const catalog=JSON.parse(await readFile(root+'worker/native-catalog-manifest.json','utf8'));
for(const module of catalog.modules){if(!/^native-catalog(?:-assets)?\.mjs$/.test(module.name)&&!/^native-catalog-data\/(?:portal\.mjs|native-catalog\.mjs|native-catalog\.css|foxy-hot-20\.webp|multi-hot-5\.webp)\.bin$/.test(module.name))throw Error('Unexpected native catalog module');const bytes=await readFile(root+'worker/'+module.name),type=module.name.endsWith('.bin')?'application/octet-stream':'application/javascript+module';if(module.type!==type||bytes.length!==module.bytes||createHash('sha256').update(bytes).digest('hex')!==module.sha256)throw Error('Native catalog manifest mismatch: '+module.name);}
const modules=[...manifest.modules,...catalog.modules.map(m=>({...m,file:'worker/'+m.name}))];
if(new Set(modules.map(m=>m.name)).size!==modules.length)throw Error('Duplicate native module name');
const additive={schemaVersion:1,release:RELEASE,packaging:'additive-native-machines',mainModule:'native-entry-20261107.mjs',originalMainModule:'restore-20261102.mjs',baselineVersionId:'2fad5f75-d154-41a0-8d64-12597a95d42e',preservedBaselineModules:156,modules,frontendManifest:manifest,catalogManifest:catalog,addedBytes:modules.reduce((sum,m)=>sum+m.bytes,0)};
await writeFile(root+'worker/native-worker-manifest.json',JSON.stringify(additive,null,2)+'\n');
console.log(JSON.stringify({release:manifest.release,assets:manifest.assets.length,reusedBaselineModules:manifest.reusedBaselineModules.length,addedBinaryBytes:manifest.addedBinaryBytes,addedModules:modules.length,addedBytes:additive.addedBytes,manifest:'worker/native-worker-manifest.json'}));
