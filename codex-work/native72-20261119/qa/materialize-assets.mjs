// Reconstruct exact deployed browser assets for local-only QA. This script
// performs public GET requests, verifies each byte stream against the deployed
// Worker/KV metadata, and never calls any account or gameplay API.
import {readFile,writeFile,mkdir,copyFile,rename,unlink,stat} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run=promisify(execFile),root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const recovery=path.resolve(option('--recovery',path.resolve(root,'../../../live-recovery')));
const destination=path.resolve(option('--out',path.resolve(root,'../../../local-qa')));
const concurrency=Number(option('--concurrency','12'));
const origin='https://superwin-player.apdiy61.workers.dev';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inventory=JSON.parse(await readFile(path.join(recovery,'worker-v457-module-inventory.json'),'utf8'));
const moduleByName=new Map(inventory.parts.map(part=>[part.name,part]));

async function assetMap(moduleName){
 const source=await readFile(path.join(recovery,'worker-modules',moduleName),'utf8');
 const expected=moduleByName.get(moduleName);
 if(!expected||sha(source)!==expected.sha256)throw Error('MODULE_HASH_MISMATCH:'+moduleName);
 const scope={};
 const code=source.replace(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?\s*$/gm,(_,name,relative)=>{
  const full=path.posix.normalize(path.posix.join(path.posix.dirname(moduleName),relative));
  const meta=moduleByName.get(full);if(!meta)throw Error('BASELINE_MODULE_MISSING:'+full);
  scope[name]={baselineModule:full,size:meta.size,sha256:meta.sha256};return '';
 }).replace(/export const /g,'const ');
 const result=vm.runInNewContext(code+';({assets,htmlTemplate})',scope,{timeout:1000});
 for(const asset of Object.values(result.assets))if(asset.body){
  if(typeof asset.body==='string'){
   if(asset.size!==Buffer.byteLength(asset.body))throw Error('INLINE_SIZE_MISMATCH');
   asset.sha256=sha(asset.body);asset.inlineBody=asset.body;
  }else{
   if(asset.size!==asset.body.size)throw Error('BASELINE_SIZE_MISMATCH:'+asset.body.baselineModule);
   asset.sha256=asset.body.sha256;asset.baselineModule=asset.body.baselineModule;
  }
  delete asset.body;
 }
 return result;
}

const baseline=await assetMap('native72/native-machine-assets.mjs');
const deluxe=await assetMap('native72deluxe/native-machine-assets.mjs');
const manifestBytes=await readFile(path.join(recovery,'habesha-r7-manifest.json'));
if(sha(manifestBytes)!=='3a8e4473e7daf6727f95e9fd4baebb5e6742205e08c2817e180997245579689f')throw Error('HABESHA_MANIFEST_HASH_MISMATCH');
const habesha=JSON.parse(manifestBytes);
for(const [name,asset]of Object.entries(habesha.assets))if(asset.baselineName){
 if(!baseline.assets[asset.baselineName])throw Error('BASELINE_ASSET_MISSING:'+asset.baselineName);
 habesha.assets[name]={...baseline.assets[asset.baselineName]};
}
const games=[
 {name:'habesha',release:'zplay-native-machines-20261119-habesha-r7',html:'habesha.html',...habesha},
 {name:'deluxe',release:'zplay-native-machines-20261119-mh5deluxe-r1',html:'deluxe.html',...deluxe}
];
const cache=path.join(destination,'cache');await mkdir(cache,{recursive:true});
const fetched=new Map(),results=[];
const candidates=[
 path.join(root,'changes/habesha-r7/assets'),path.join(root,'changes/habesha-r6/assets'),
 path.join(root,'changes/habesha-r5/assets'),path.join(root,'live-frontend/zplay-native-machines-20261119-habesha-r4')
];
async function validated(file,meta){
 try{const info=await stat(file);if(info.size!==meta.size)return false;return sha(await readFile(file))===meta.sha256;}catch{return false;}
}
async function materialize(game,name,meta){
 if(!/^[a-f0-9]{64}$/.test(meta.sha256)||!Number.isInteger(meta.size))throw Error('MISSING_INTEGRITY_METADATA:'+game.name+'/'+name);
 const target=path.join(destination,game.name,name);
 if(await validated(target,meta))return {game:game.name,name,bytes:meta.size,sha256:meta.sha256,source:'verified-existing-stage'};
 const cached=path.join(cache,meta.sha256);
 if(!fetched.has(meta.sha256))fetched.set(meta.sha256,(async()=>{
  if(await validated(cached,meta))return {source:'verified-cache'};
  if(typeof meta.inlineBody==='string'){
   await writeFile(cached,meta.inlineBody);
   if(!await validated(cached,meta))throw Error('INLINE_HASH_MISMATCH:'+name);
   return {source:'verified-inline-worker-asset'};
  }
  for(const source of [path.join(recovery,game.release,name),...candidates.map(dir=>path.join(dir,name))]){
   if(await validated(source,meta)){await copyFile(source,cached);return {source};}
  }
  const url=origin+'/'+game.release+'/'+name,temp=cached+'.download';
  let failure;
  for(let attempt=0;attempt<3;attempt++){
   try{
    const {stdout}=await run('curl',['--silent','--show-error','--max-time','45','-w','%{http_code}','-o',temp,url],{maxBuffer:1024*1024});
    if(stdout!=='200')throw Error('HTTP_'+stdout+':'+url);
    if(!await validated(temp,meta))throw Error('ASSET_HASH_MISMATCH:'+url);
    await rename(temp,cached);return {source:url,status:200};
   }catch(error){failure=error;await unlink(temp).catch(()=>{});}
  }
  throw failure;
 })());
 const provenance=await fetched.get(meta.sha256);
 await mkdir(path.dirname(target),{recursive:true});await copyFile(cached,target);
 return {game:game.name,name,bytes:meta.size,sha256:meta.sha256,...provenance};
}
const tasks=[];
for(const game of games){
 await mkdir(path.join(destination,game.name),{recursive:true});
 await copyFile(path.join(recovery,game.html),path.join(destination,game.name,'index.html'));
 await writeFile(path.join(destination,game.name,'qa-baseline-manifest.json'),JSON.stringify({release:game.release,assets:game.assets},null,2)+'\n');
 // The asset index also carries an unsubstituted route template named index.html.
 // Local QA uses the exact publicly served route HTML already copied above.
 for(const [name,meta]of Object.entries(game.assets))if(name!=='index.html')tasks.push({game,name,meta});
}
tasks.sort((a,b)=>Number(!/\.(mjs|js|json|css|html|txt)$/.test(a.name))-Number(!/\.(mjs|js|json|css|html|txt)$/.test(b.name)));
console.log(JSON.stringify({phase:'start',assets:tasks.length,totalBytes:tasks.reduce((n,t)=>n+t.meta.size,0),concurrency,destination}));
let next=0,completed=0;
async function worker(){
 while(next<tasks.length){const task=tasks[next++];try{results.push(await materialize(task.game,task.name,task.meta));}catch(error){results.push({game:task.game.name,name:task.name,error:String(error.message)});}
  completed++;if(completed%40===0)console.log(JSON.stringify({phase:'progress',completed,total:tasks.length,failed:results.filter(r=>r.error).length}));
 }
}
await Promise.all(Array.from({length:concurrency},worker));
const failed=results.filter(r=>r.error),report={createdAt:new Date().toISOString(),workerVersion:inventory.version,productionTransactions:0,files:results,passed:results.length-failed.length,failed:failed.length};
await writeFile(path.join(destination,'materialization-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({phase:'complete',passed:report.passed,failed:failed.length,failures:failed}));
if(failed.length)process.exitCode=1;
