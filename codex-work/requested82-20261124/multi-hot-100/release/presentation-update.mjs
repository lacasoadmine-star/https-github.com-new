import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,relative,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildM100Release} from './build.mjs';
import {validConfig,KV_PREFIX,resourceType} from './worker.mjs';
const directory=dirname(fileURLToPath(import.meta.url)),repository=resolve(directory,'../../../..');
const hash=s=>createHash('sha256').update(s).digest('hex');
const require=createRequire(import.meta.url),moduleValue=async s=>(await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'))).default;
const fields=p=>JSON.stringify([p.name,p.key,p.bytes,p.sha256,p.contentType]);
const bindWorker=s=>{
  if(s.split('"./worker.mjs"').length!==2)throw Error('M100_UPDATE_CONFIG_IMPORT');
  return s.replace('"./worker.mjs"',JSON.stringify(pathToFileURL(resolve(directory,'worker.mjs')).href));
};

/** Rebuild only own app/CSS; keep every existing native media/audio pin and wrapper.
 * No remote write, round, account, policy, outcome or balance is created here.
 */
export async function buildM100PresentationUpdate({baseline,baselineConfigSource,expectedConfigSha256,sourceCommit,assetDirectory}={}){
  if(!/^[a-f0-9]{64}$/.test(expectedConfigSha256||'')||hash(baselineConfigSource)!==expectedConfigSha256)throw Error('M100_UPDATE_BASELINE_CONFIG_PIN');
  const ownPath=relative(repository,fileURLToPath(import.meta.url)).split('\\').join('/');
  const own=await readFile(fileURLToPath(import.meta.url)),committed=execFileSync('git',['-C',repository,'show',sourceCommit+':'+ownPath],{stdio:['ignore','pipe','pipe']});
  if(!own.equals(committed))throw Error('M100_UPDATE_SOURCE_NOT_COMMITTED');
  const previous=await moduleValue(bindWorker(baselineConfigSource));
  if(!validConfig(previous)||previous.resources.length!==32||previous.resources.filter(p=>p.name.startsWith('audio/')).length!==9)throw Error('M100_UPDATE_BASELINE_REQUIRED');
  const compiled=await buildM100Release({baseline,sourceCommit,assetDirectory,enabled:previous.enabled,audioPins:null});
  const allowed=new Set(['app.mjs','page.css']),replacement=new Map();
  for(const record of compiled.records){
    const old=previous.resources.find(p=>p.name===record.name);
    if(!old||!allowed.has(record.name)&&fields(old)!==fields(record))throw Error('M100_UPDATE_MEDIA_PIN_CHANGED:'+record.name);
    if(allowed.has(record.name)){const {data,...pin}=record;replacement.set(record.name,{...pin,data});}
  }
  if(replacement.size!==2||!compiled.report.sourceCommitVerified)throw Error('M100_UPDATE_SOURCE_REQUIRED');
  const resources=previous.resources.map(p=>{const record=replacement.get(p.name);if(!record)return p;const {data,...pin}=record;return pin;});
  const revision=hash(JSON.stringify({sourceCommit,resources})),config={...previous,sourceCommit,revision,resources};
  if(!validConfig(config)||config.resources.filter(p=>p.name.startsWith('audio/')).length!==9)throw Error('M100_UPDATE_CONFIG_INVALID');
  const tuples=resources.map(p=>[p.name,p.bytes,p.sha256]);
  const properties=Object.entries(config).map(([name,value])=>JSON.stringify(name)+':'+(name==='resources'?'r.map(([name,bytes,sha256])=>({name,key:p+sha256+"/"+name,bytes,sha256,contentType:t(name)}))':JSON.stringify(value)));
  const generated='import{resourceType as t,KV_PREFIX as p}from"./worker.mjs";const r='+JSON.stringify(tuples)+';export default{'+properties.join(',')+'};';
  const transformed=await require('esbuild').transform(generated,{loader:'js',format:'esm',minify:true,target:'es2022',charset:'utf8',legalComments:'none'});
  const source=transformed.code,expanded=await moduleValue(bindWorker(source));
  if(transformed.warnings.length||JSON.stringify(expanded)!==JSON.stringify(config))throw Error('M100_UPDATE_SERIALIZATION_CHANGED');
  const module={name:'requested82m100r1/config.mjs',source,bytes:Buffer.byteLength(source),sha256:hash(source),contentType:'application/javascript+module'};
  const records=[...replacement.values()];
  const report={schema:'zplay/m100-presentation-update/v1',baseline,sourceCommit,sourceCommitVerified:true,
    expectedPreviousConfigSha256:expectedConfigSha256,previousConfigBytes:Buffer.byteLength(baselineConfigSource),
    module:{...module,source:undefined},records:records.map(({data,...pin})=>pin),revision,
    projectedWorkerBytes:baseline.totalBytes-Buffer.byteLength(baselineConfigSource)+module.bytes,
    unchangedResourceCount:resources.length-records.length,unchangedMediaCount:20,unchangedAudioCount:9,
    unchangedWrapperModules:true,financialRoutesChanged:false,accountOrBalanceCreated:false,
    originalRuntimeConfigurationUnchanged:true,completionClaim:false,liveVerified:false,
    sourcePins:[...compiled.report.inputs,...compiled.report.sourcePins,{path:ownPath,bytes:own.length,sha256:hash(own)}]};
  if(report.projectedWorkerBytes>baseline.totalBytes+1024)throw Error('M100_UPDATE_BUDGET');
  return{config,module,records,report};
}

export async function writeM100PresentationUpdate(output,update){
  const destination=resolve(output);await mkdir(destination,{recursive:true});
  await writeFile(resolve(destination,'config.mjs'),update.module.source);
  for(const record of update.records){const file=resolve(destination,'kv',record.sha256,record.name);await mkdir(dirname(file),{recursive:true});await writeFile(file,record.data);}
  await writeFile(resolve(destination,'presentation-update-report.json'),JSON.stringify(update.report,null,2)+'\n');
}
