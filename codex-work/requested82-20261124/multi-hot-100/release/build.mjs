import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {MEDIA_NAMES,AUDIO_NAMES,KV_PREFIX,GAME_ID,BACKEND_GAME_ID,GAME_PATH,resourceType,validConfig} from './worker.mjs';

export const MODULE_PREFIX='requested82m100r1/';
export const WORKER_BYTE_LIMIT=64*1024*1024;
const directory=dirname(fileURLToPath(import.meta.url)),repository=resolve(directory,'../../../..'),require=createRequire(import.meta.url);
const digest=value=>createHash('sha256').update(value).digest('hex');
const SHA=/^[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
function compiler(){return require(require.resolve('esbuild',{paths:[directory,...(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]:[])]}));}
function baselineValue(value){
  if(!UUID.test(value?.versionId||'')||!Number.isSafeInteger(value.versionNumber)||value.versionNumber<1||
    !/^[-A-Za-z0-9_./]+\.mjs$/.test(value.mainModule||'')||value.mainModule.startsWith('/')||value.mainModule.split('/').includes('..')||value.mainModule.startsWith(MODULE_PREFIX)||
    !Number.isSafeInteger(value.moduleCount)||value.moduleCount<1||!Number.isSafeInteger(value.totalBytes)||value.totalBytes<1||value.totalBytes>=WORKER_BYTE_LIMIT)throw Error('M100_BASELINE_REQUIRED');
  return {versionId:value.versionId,versionNumber:value.versionNumber,mainModule:value.mainModule,moduleCount:value.moduleCount,totalBytes:value.totalBytes};
}
function validPins(pins,names){return Array.isArray(pins)&&pins.length===names.length&&new Set(pins.map(p=>p?.path)).size===names.length&&
  names.every(name=>pins.some(p=>p.path===name))&&pins.every(p=>Number.isSafeInteger(p.bytes)&&p.bytes>0&&p.bytes<=8*1024*1024&&/^[a-f0-9]{64}$/.test(p.sha256||''));}

/** Compile own browser implementation and pin actual static bytes. Remote upload/activation is separate. */
export async function buildM100Release({baseline,sourceCommit,assetDirectory,audioPins=null,audioDirectory=assetDirectory,enabled=false,verifySourceCommit=true,esbuild=compiler()}={}){
  const prior=baselineValue(baseline);
  if(!SHA.test(sourceCommit||'')||typeof enabled!=='boolean'||typeof verifySourceCommit!=='boolean'||!isAbsolute(assetDirectory||''))throw Error('M100_BUILD_INPUT_INVALID');
  const audioNames=audioPins?.length===8?AUDIO_NAMES.slice(0,8):AUDIO_NAMES;
  if(audioPins!==null&&(!isAbsolute(audioDirectory||'')||!validPins(audioPins,audioNames)))throw Error('M100_AUDIO_PINS_INVALID');
  const pinSource=await readFile(resolve(directory,'../asset-pins.json'),'utf8'),pinManifest=JSON.parse(pinSource);
  if(pinManifest.schema!=='zplay/m100-current-static-pins/v1'||pinManifest.providerProgramIncluded!==false||
    pinManifest.privateReferenceCapturesIncluded!==false||!validPins(pinManifest.pins,MEDIA_NAMES))throw Error('M100_STATIC_PINS_INVALID');
  if(audioPins!==null){
    const audioModule=resolve(directory,'../audio.mjs'),audioSource=await readFile(audioModule);
    const ownAudio=await import(pathToFileURL(audioModule).href+'?build-pin='+digest(audioSource));
    if(!validPins(ownAudio.M100_AUDIO_PINS,audioNames)||audioNames.some(path=>{
      const actual=audioPins.find(pin=>pin.path===path),expected=ownAudio.M100_AUDIO_PINS.find(pin=>pin.path===path);
      return actual.bytes!==expected.bytes||actual.sha256!==expected.sha256;
    }))throw Error('M100_AUDIO_MODULE_PIN_MISMATCH');
  }
  const app=await esbuild.build({entryPoints:[resolve(directory,'browser.mjs')],bundle:true,write:false,platform:'browser',format:'esm',
    target:'es2022',minify:true,charset:'utf8',legalComments:'none',logLevel:'silent',metafile:true});
  if(app.warnings.length||app.outputFiles.length!==1||Object.values(app.metafile.outputs).some(output=>output.imports.length))throw Error('M100_BROWSER_CLOSURE_INVALID');
  const inputs=await Promise.all(Object.keys(app.metafile.inputs).map(async name=>{
    const absolute=resolve(name),path=relative(repository,absolute).split('\\').join('/');
    if(path.startsWith('../')||path==='..'||!/^codex-work\/.+\.(?:mjs|json)$/.test(path))throw Error('M100_BROWSER_SOURCE_OUTSIDE_OWN_IMPLEMENTATION');
    const body=await readFile(absolute);return {path,bytes:body.length,sha256:digest(body)};
  }));
  const css=await esbuild.build({entryPoints:[resolve(directory,'../page.css')],bundle:true,write:false,minify:true,
    charset:'utf8',target:'es2022',legalComments:'none',logLevel:'silent',metafile:true});
  if(css.warnings.length||css.outputFiles.length!==1||Object.values(css.metafile.outputs).some(output=>output.imports.length))throw Error('M100_STYLE_INVALID');
  const records=[];
  function add(name,body){
    const data=Buffer.isBuffer(body)?body:Buffer.from(body),sha256=digest(data),contentType=resourceType(name);
    if(!contentType||!data.length||data.length>8*1024*1024)throw Error('M100_RESOURCE_INVALID:'+name);
    records.push({name,key:KV_PREFIX+sha256+'/'+name,bytes:data.length,sha256,contentType,data});
  }
  add('app.mjs',app.outputFiles[0].text);add('page.css',css.outputFiles[0].text);add('asset-pins.json',pinSource);
  for(const pin of pinManifest.pins){
    const data=await readFile(resolve(assetDirectory,pin.path));
    if(data.length!==pin.bytes||digest(data)!==pin.sha256)throw Error('M100_MEDIA_SOURCE_PIN_MISMATCH:'+pin.path);
    add('media/'+pin.path,data);
  }
  if(audioPins!==null)for(const pin of audioPins){
    const data=await readFile(resolve(audioDirectory,pin.path));
    if(data.length!==pin.bytes||digest(data)!==pin.sha256)throw Error('M100_AUDIO_SOURCE_PIN_MISMATCH:'+pin.path);
    add('audio/'+pin.path,data);
  }
  const resources=records.map(({data,...record})=>record),revision=digest(JSON.stringify({sourceCommit,resources}));
  const config={schema:'zplay/m100-existing-host-release/v1',gameId:GAME_ID,backendGameId:BACKEND_GAME_ID,
    enabled,revision,sourceCommit,baseline:prior,resources};
  if(!validConfig(config))throw Error('M100_RELEASE_CONFIG_INVALID');
  const from=JSON.stringify('../'+prior.mainModule),entry=`import previous from ${from};\nexport * from ${from};\nimport config from './config.mjs';\nimport {createM100ReleaseWorker} from './worker.mjs';\nexport default createM100ReleaseWorker(previous,config);\n`;
  const modules=[];
  for(const [name,source]of [['entry.mjs',entry],['worker.mjs',await readFile(resolve(directory,'worker.mjs'),'utf8')],['config.mjs','export default '+JSON.stringify(config)+';\n']]){
    const result=await esbuild.transform(source,{loader:'js',format:'esm',minify:true,target:'es2022',charset:'utf8',legalComments:'none'});
    if(result.warnings.length)throw Error('M100_WORKER_MODULE_INVALID:'+name);
    modules.push({name:MODULE_PREFIX+name,source:result.code,bytes:Buffer.byteLength(result.code),sha256:digest(result.code),contentType:'application/javascript+module'});
  }
  const totalBytes=modules.reduce((n,module)=>n+module.bytes,0);
  if(totalBytes>128*1024||prior.totalBytes+totalBytes>WORKER_BYTE_LIMIT)throw Error('M100_EXISTING_WORKER_BYTE_BUDGET');
  const sourceFiles=['build.mjs','worker.mjs','browser.mjs','../asset-pins.json','../view.css','../page.css'];
  const sourcePins=await Promise.all(sourceFiles.map(async name=>{const path=resolve(directory,name),data=await readFile(path);return{path:relative(repository,path).split('\\').join('/'),bytes:data.length,sha256:digest(data)};}));
  const allSourcePins=[...new Map([...inputs,...sourcePins].map(pin=>[pin.path,pin])).values()];
  if(verifySourceCommit)for(const pin of allSourcePins){
    let body;try{body=execFileSync('git',['-C',repository,'show',sourceCommit+':'+pin.path],{maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});}
    catch{throw Error('M100_SOURCE_COMMIT_FILE_UNAVAILABLE:'+pin.path);}
    if(body.length!==pin.bytes||digest(body)!==pin.sha256)throw Error('M100_SOURCE_COMMIT_PIN_MISMATCH:'+pin.path);
  }
  return {config,modules,records,report:{schema:'zplay/m100-existing-host-build/v1',sourceCommit,baseline:prior,enabled,gameId:GAME_ID,
    backendGameId:BACKEND_GAME_ID,route:GAME_PATH,revision,totalBytes,projectedWorkerBytes:prior.totalBytes+totalBytes,
    workerByteLimit:WORKER_BYTE_LIMIT,projectedModuleCount:prior.moduleCount+modules.length,
    recordsBytes:records.reduce((n,record)=>n+record.bytes,0),mediaCount:MEDIA_NAMES.length,audioCount:audioPins?.length??0,
    missingAudioPaths:AUDIO_NAMES.filter(path=>!audioPins?.some(pin=>pin.path===path)),
    sourceCommitVerified:verifySourceCommit,publicationReady:verifySourceCommit,verifiedSourceFileCount:verifySourceCommit?allSourcePins.length:0,
    publicationReadinessScope:'Exact source/artifact publication only; no live gameplay, production settlement or completed-game claim.',
    cashFlagsChanged:false,dashboardChanged:false,financialRoutesChanged:false,liveVerified:false,completedGameClaim:false,
    privateReferenceCapturesIncluded:false,providerProgramsIncluded:false,
    existingFinancialRoutes:['/api/remaining20/state?game_id='+BACKEND_GAME_ID,'/api/remaining20/action'],
    inputs,sourcePins,records:resources.map(record=>({...record,file:'kv/'+record.sha256+'/'+record.name})),modules:modules.map(({source,...pin})=>pin)}};
}

/** Persist exact upload artifacts only; never copy private captures or active customer state. */
export async function writeM100Release(output,result){
  if(!validConfig(result?.config))throw Error('M100_ARTIFACT_CONFIG_INVALID');
  const destination=resolve(output);await mkdir(resolve(destination,MODULE_PREFIX),{recursive:true});
  for(const module of result.modules){
    if(![MODULE_PREFIX+'entry.mjs',MODULE_PREFIX+'worker.mjs',MODULE_PREFIX+'config.mjs'].includes(module.name)||
      Buffer.byteLength(module.source)!==module.bytes||digest(module.source)!==module.sha256)throw Error('M100_ARTIFACT_MODULE_PIN_MISMATCH');
    await writeFile(resolve(destination,module.name),module.source);
  }
  for(const record of result.records){
    if(record.key!==KV_PREFIX+record.sha256+'/'+record.name||!resourceType(record.name)||record.data.length!==record.bytes||digest(record.data)!==record.sha256)throw Error('M100_ARTIFACT_RESOURCE_PIN_MISMATCH');
    const file=resolve(destination,'kv',record.sha256,record.name);await mkdir(dirname(file),{recursive:true});await writeFile(file,record.data);
  }
  await writeFile(resolve(destination,'m100-build-report.json'),JSON.stringify(result.report,null,2)+'\n');
}

/** Read back the exact emitted bytes. A source publication alone never proves a running game. */
export async function loadM100Release(output){
  const destination=resolve(output),report=JSON.parse(await readFile(resolve(destination,'m100-build-report.json'),'utf8'));
  const names=['entry.mjs','worker.mjs','config.mjs'].map(name=>MODULE_PREFIX+name);
  if(report?.schema!=='zplay/m100-existing-host-build/v1'||!SHA.test(report.sourceCommit||'')||
    !Array.isArray(report.modules)||JSON.stringify(report.modules.map(pin=>pin.name))!==JSON.stringify(names)||
    !Array.isArray(report.records)||typeof report.sourceCommitVerified!=='boolean'||report.publicationReady!==report.sourceCommitVerified||
    !Number.isSafeInteger(report.verifiedSourceFileCount)||report.verifiedSourceFileCount<0||
    (report.sourceCommitVerified?report.verifiedSourceFileCount<1:report.verifiedSourceFileCount!==0))throw Error('M100_ARTIFACT_REPORT_INVALID');
  baselineValue(report.baseline);
  const modules=[];
  for(const pin of report.modules){
    const source=await readFile(resolve(destination,pin.name),'utf8');
    if(Buffer.byteLength(source)!==pin.bytes||digest(source)!==pin.sha256||pin.contentType!=='application/javascript+module')throw Error('M100_ARTIFACT_MODULE_PIN_MISMATCH');
    modules.push({...pin,source});
  }
  const {default:config}=await import('data:text/javascript;base64,'+Buffer.from(modules.at(-1).source).toString('base64'));
  if(!validConfig(config)||config.sourceCommit!==report.sourceCommit||config.revision!==report.revision||
    JSON.stringify(config.baseline)!==JSON.stringify(report.baseline)||config.enabled!==report.enabled||
    config.resources.length!==report.records.length||report.totalBytes!==modules.reduce((n,m)=>n+m.bytes,0)||
    report.projectedWorkerBytes!==report.baseline.totalBytes+report.totalBytes||report.projectedWorkerBytes>WORKER_BYTE_LIMIT)throw Error('M100_ARTIFACT_REPORT_INVALID');
  const records=[];
  for(let index=0;index<report.records.length;index++){
    const pin=report.records[index],expected=config.resources[index];
    if(!expected||JSON.stringify(expected)!==JSON.stringify(Object.fromEntries(Object.entries(pin).filter(([key])=>key!=='file')))||
      pin.file!=='kv/'+pin.sha256+'/'+pin.name)throw Error('M100_ARTIFACT_REPORT_INVALID');
    const data=await readFile(resolve(destination,pin.file));
    if(data.length!==pin.bytes||digest(data)!==pin.sha256)throw Error('M100_ARTIFACT_RESOURCE_PIN_MISMATCH');
    records.push({...expected,data});
  }
  return {config,modules,records,report};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  throw Error('Use buildM100Release with the confirmed active baseline/source commit and local pinned media. This helper never deploys.');
}
