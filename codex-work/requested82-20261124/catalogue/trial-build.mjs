import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validTrialManifest} from './trial-public.mjs';
import {TRIAL_KV_PREFIX,validTrialConfig} from './trial-worker.mjs';
export const TRIAL_MODULE_PREFIX='requested82pairr1/';
const directory=dirname(fileURLToPath(import.meta.url)),repository=resolve(directory,'../../..'),require=createRequire(import.meta.url);
const digest=value=>createHash('sha256').update(value).digest('hex'),limit=64*1024*1024;
const sources=['first-pair.json','trial-public.mjs','trial-client.mjs','trial.css','trial-worker.mjs','trial-build.mjs'];
export async function buildFirstPairRelease({baseline,sourceCommit,enabled=true,verifySourceCommit=true,esbuild=require('esbuild')}={}){
  if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(baseline?.versionId||'')||!Number.isSafeInteger(baseline.versionNumber)||baseline.versionNumber<1||
    !/^[-a-zA-Z0-9_./]+\.mjs$/.test(baseline.mainModule||'')||baseline.mainModule.startsWith('/')||baseline.mainModule.split('/').includes('..')||baseline.mainModule.startsWith(TRIAL_MODULE_PREFIX)||
    !Number.isSafeInteger(baseline.moduleCount)||baseline.moduleCount<1||!Number.isSafeInteger(baseline.totalBytes)||baseline.totalBytes<1||baseline.totalBytes>=limit||
    !/^[a-f0-9]{40}$/.test(sourceCommit||'')||typeof enabled!=='boolean'||typeof verifySourceCommit!=='boolean')throw Error('FIRST_PAIR_BUILD_INPUT_INVALID');
  const text=new Map(await Promise.all(sources.map(async name=>[name,await readFile(resolve(directory,name),'utf8')]))),manifest=JSON.parse(text.get('first-pair.json'));
  if(!validTrialManifest(manifest))throw Error('FIRST_PAIR_MANIFEST_INVALID');
  const common={bundle:true,write:false,format:'esm',target:'es2022',minify:true,charset:'utf8',legalComments:'none',logLevel:'silent',metafile:true};
  const app=await esbuild.build({...common,entryPoints:[resolve(directory,'trial-client.mjs')],platform:'browser'});
  const worker=await esbuild.build({...common,entryPoints:[resolve(directory,'trial-worker.mjs')],platform:'browser'});
  const style=await esbuild.transform(text.get('trial.css'),{loader:'css',minify:true,charset:'utf8',legalComments:'none'});
  if(app.warnings.length||worker.warnings.length||style.warnings.length||app.outputFiles.length!==1||worker.outputFiles.length!==1||
    [...Object.values(app.metafile.outputs),...Object.values(worker.metafile.outputs)].some(output=>output.imports.length))throw Error('FIRST_PAIR_BUNDLE_INVALID');
  const records=[['app.mjs',app.outputFiles[0].text,'text/javascript; charset=utf-8'],['style.css',style.code,'text/css; charset=utf-8'],['manifest.json',JSON.stringify(manifest),'application/json; charset=utf-8']].map(([name,source,contentType])=>{
    const sha256=digest(source);return {name,source,contentType,bytes:Buffer.byteLength(source),sha256,key:TRIAL_KV_PREFIX+sha256+'/'+name};
  });
  const resources=records.map(({source,...pin})=>pin),revision=digest(JSON.stringify({sourceCommit,resources}));
  const config={schema:'zplay/first-pair-dashboard-release/v1',enabled,sourceCommit,revision,manifest,resources};
  if(!validTrialConfig(config))throw Error('FIRST_PAIR_CONFIG_INVALID');
  const from=JSON.stringify('../'+baseline.mainModule),entry=`import previous from ${from};\nexport * from ${from};\nimport config from './config.mjs';\nimport {createFirstPairWorker} from './worker.mjs';\nexport default createFirstPairWorker(previous,config);\n`;
  const modules=[];for(const [name,source]of [['entry.mjs',entry],['worker.mjs',worker.outputFiles[0].text],['config.mjs','export default '+JSON.stringify(config)+';\n']]){
    const result=await esbuild.transform(source,{loader:'js',format:'esm',minify:true,target:'es2022',charset:'utf8',legalComments:'none'});if(result.warnings.length)throw Error('FIRST_PAIR_MODULE_INVALID');
    modules.push({name:TRIAL_MODULE_PREFIX+name,source:result.code,bytes:Buffer.byteLength(result.code),sha256:digest(result.code),contentType:'application/javascript+module'});
  }
  const totalBytes=modules.reduce((n,m)=>n+m.bytes,0);if(baseline.totalBytes+totalBytes>limit)throw Error('FIRST_PAIR_WORKER_BYTE_BUDGET');
  const sourcePins=sources.map(name=>({path:relative(repository,resolve(directory,name)),bytes:Buffer.byteLength(text.get(name)),sha256:digest(text.get(name))}));
  if(verifySourceCommit)for(const pin of sourcePins){let body;try{body=execFileSync('git',['-C',repository,'show',sourceCommit+':'+pin.path],{maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});}catch{throw Error('FIRST_PAIR_SOURCE_COMMIT_UNAVAILABLE:'+pin.path);}if(body.length!==pin.bytes||digest(body)!==pin.sha256)throw Error('FIRST_PAIR_SOURCE_COMMIT_PIN_MISMATCH:'+pin.path);}
  const prior=Object.fromEntries(['versionId','versionNumber','mainModule','moduleCount','totalBytes'].map(key=>[key,baseline[key]]));
  return {config,modules,records,report:{schema:'zplay/first-pair-dashboard-build/v1',baseline:prior,sourceCommit,sourceCommitVerified:verifySourceCommit,publicationReady:verifySourceCommit,
    revision,enabled,totalBytes,projectedWorkerBytes:prior.totalBytes+totalBytes,projectedModuleCount:prior.moduleCount+modules.length,allowedGameCount:2,
    completionClaim:false,liveVerified:false,verifiedProductionSpinCount:0,otherRequestedGamesAdmitted:false,
    coverReferences:manifest.games.map(game=>({gameId:game.gameId,...game.cover})),sourcePins,records:resources.map(pin=>({...pin,file:'kv/'+pin.sha256+'/'+pin.name})),modules:modules.map(({source,...pin})=>pin)}};
}
export async function writeFirstPairRelease(output,result){if(!validTrialConfig(result?.config))throw Error('FIRST_PAIR_CONFIG_INVALID');const destination=resolve(output);await mkdir(resolve(destination,TRIAL_MODULE_PREFIX),{recursive:true});
  for(const module of result.modules){if(![TRIAL_MODULE_PREFIX+'entry.mjs',TRIAL_MODULE_PREFIX+'worker.mjs',TRIAL_MODULE_PREFIX+'config.mjs'].includes(module.name)||Buffer.byteLength(module.source)!==module.bytes||digest(module.source)!==module.sha256)throw Error('FIRST_PAIR_MODULE_PIN_MISMATCH');await writeFile(resolve(destination,module.name),module.source);}
  for(const record of result.records){if(!['app.mjs','style.css','manifest.json'].includes(record.name)||Buffer.byteLength(record.source)!==record.bytes||digest(record.source)!==record.sha256)throw Error('FIRST_PAIR_RESOURCE_PIN_MISMATCH');const file=resolve(destination,'kv',record.sha256,record.name);await mkdir(dirname(file),{recursive:true});await writeFile(file,record.source);}
  await writeFile(resolve(destination,'first-pair-build-report.json'),JSON.stringify(result.report,null,2)+'\n');
}
export async function loadFirstPairRelease(output){
  const destination=resolve(output),report=JSON.parse(await readFile(resolve(destination,'first-pair-build-report.json'),'utf8'));
  const names=['entry.mjs','worker.mjs','config.mjs'].map(name=>TRIAL_MODULE_PREFIX+name);
  if(report?.schema!=='zplay/first-pair-dashboard-build/v1'||!Array.isArray(report.modules)||JSON.stringify(report.modules.map(pin=>pin.name))!==JSON.stringify(names)||
    !Array.isArray(report.records)||report.records.length!==3||typeof report.sourceCommitVerified!=='boolean'||report.publicationReady!==report.sourceCommitVerified)throw Error('FIRST_PAIR_ARTIFACT_INVALID');
  const modules=[];for(const pin of report.modules){const source=await readFile(resolve(destination,pin.name),'utf8');
    if(Buffer.byteLength(source)!==pin.bytes||digest(source)!==pin.sha256||pin.contentType!=='application/javascript+module')throw Error('FIRST_PAIR_MODULE_PIN_MISMATCH');modules.push({...pin,source});}
  const {default:config}=await import('data:text/javascript;base64,'+Buffer.from(modules.at(-1).source).toString('base64'));
  if(!validTrialConfig(config)||config.sourceCommit!==report.sourceCommit||config.revision!==report.revision||config.enabled!==report.enabled||
    report.totalBytes!==modules.reduce((n,module)=>n+module.bytes,0)||report.projectedWorkerBytes!==report.baseline.totalBytes+report.totalBytes||report.projectedWorkerBytes>limit)throw Error('FIRST_PAIR_ARTIFACT_INVALID');
  const records=[];for(let index=0;index<report.records.length;index++){const pin=report.records[index],expected=config.resources[index];
    if(JSON.stringify(expected)!==JSON.stringify(Object.fromEntries(Object.entries(pin).filter(([key])=>key!=='file')))||pin.file!=='kv/'+pin.sha256+'/'+pin.name)throw Error('FIRST_PAIR_ARTIFACT_INVALID');
    const source=await readFile(resolve(destination,pin.file),'utf8');if(Buffer.byteLength(source)!==pin.bytes||digest(source)!==pin.sha256)throw Error('FIRST_PAIR_RESOURCE_PIN_MISMATCH');records.push({...expected,source});
  }return {config,modules,records,report};
}
