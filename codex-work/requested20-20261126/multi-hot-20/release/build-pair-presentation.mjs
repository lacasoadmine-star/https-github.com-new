import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {buildM20Recovery,writeM20Recovery} from '../../../requested82-20261124/multi-hot-20/build.mjs';
import {validConfig as validM100} from '../../../requested82-20261124/multi-hot-100/release/worker.mjs';
import {createM20PresentationPlan} from './presentation-update.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),require=createRequire(import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const [baselinePath,output,sourceCommit]=process.argv.slice(2);
if(!baselinePath||!output||!/^[a-f0-9]{40}$/.test(sourceCommit||''))throw Error('Usage: build-pair-presentation.mjs VERIFIED_BASELINE_JSON SCRATCH_OUTPUT COMMITTED_SOURCE_SHA');
const out=resolve(output);
if(out===resolve(root)||out.startsWith(resolve(root)+'/'))throw Error('Keep generated resources outside source');
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==sourceCommit)throw Error('COMMITTED_SOURCE_REQUIRED');
execFileSync('git',['diff','--exit-code','--quiet'],{cwd:root});
const baseline=JSON.parse(await readFile(baselinePath,'utf8'));
const esbuild=require('esbuild');
async function deployedConfig(name,rewrite=false){
 const source=baseline.ownedSources?.find(x=>x.name===name)?.source,pin=baseline.ownedPins?.find(x=>x.name===name);
 if(!source||!pin||Buffer.byteLength(source)!==pin.bytes||hash(source)!==pin.sha256)throw Error('BASELINE_SOURCE_PIN');
 const code=rewrite?source.replace('"./worker.mjs"',JSON.stringify(pathToFileURL(resolve(root,'codex-work/requested82-20261124/multi-hot-100/release/worker.mjs')).href)):source;
 return (await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
}
await mkdir(out,{recursive:true});
const previousM20=await deployedConfig('requested82m20r1/config.mjs');
const options={activeMainModule:'new90m20r1/entry.mjs',baselineRevision:previousM20.baselineRevision,previousAppPath:previousM20.previousAppPath,previousStylePath:previousM20.previousStylePath,sourceCommit};
const build=await buildM20Recovery(options);await writeM20Recovery(resolve(out,'m20'),build);
Object.assign(baseline,{baselineRevision:options.baselineRevision,previousAppPath:options.previousAppPath,previousStylePath:options.previousStylePath});
const plan=await createM20PresentationPlan({build,baseline,deploymentId:baseline.deploymentId});
plan.schema='zplay/pair-presentation-update/v1';
const compiled=[];
for(const [name,entry] of [['app.mjs','browser.mjs'],['page.css','../page.css']]){
 const result=await esbuild.build({entryPoints:[resolve(root,'codex-work/requested82-20261124/multi-hot-100/release',entry)],bundle:true,write:false,platform:'browser',format:'esm',target:'es2022',minify:true,charset:'utf8',legalComments:'none',logLevel:'silent',metafile:true});
 if(result.warnings.length||result.outputFiles.length!==1||Object.values(result.metafile.outputs).some(x=>x.imports.length))throw Error('M100_BUNDLE_NOT_CLOSED');
 const source=result.outputFiles[0].text,sha256=hash(source),bytes=Buffer.byteLength(source),key='requested82/m100/sha256/'+sha256+'/'+name;
 compiled.push({name,source,sha256,bytes,key});
 await writeFile(resolve(out,name==='app.mjs'?'m100-app.mjs':'m100-style.css'),source);
 plan.resources.push({name:name==='app.mjs'?'m100-app.mjs':'m100-style.css',sha256,bytes,key});
}
const previous=await deployedConfig('requested82m100r1/config.mjs',true);
const config={...previous,sourceCommit,resources:previous.resources.map(p=>{const next=compiled.find(x=>x.name===p.name);return next?{...p,key:next.key,sha256:next.sha256,bytes:next.bytes}:p;})};
config.revision=hash(JSON.stringify({sourceCommit,resources:config.resources}));
if(!validM100(config)||config.resources.length!==previous.resources.length)throw Error('M100_CONFIG_INVALID');
for(const old of previous.resources)if(!compiled.some(x=>x.name===old.name)&&JSON.stringify(config.resources.find(x=>x.name===old.name))!==JSON.stringify(old))throw Error('RETAINED_M100_RESOURCE_CHANGED');
const tuples=config.resources.map(p=>[p.name,p.bytes,p.sha256]);
const props=Object.entries(config).map(([key,value])=>JSON.stringify(key)+':'+(key==='resources'?'r.map(([name,bytes,sha256])=>({name,key:p+sha256+"/"+name,bytes,sha256,contentType:t(name)}))':JSON.stringify(value)));
const source=(await esbuild.transform('import{resourceType as t,KV_PREFIX as p}from"./worker.mjs";const r='+JSON.stringify(tuples)+';export default{'+props.join(',')+'};',{loader:'js',format:'esm',minify:true,target:'es2022',charset:'utf8',legalComments:'none'})).code;
const name='requested82m100r1/config.mjs';
plan.replacements.push({name,source,bytes:Buffer.byteLength(source),sha256:hash(source),contentType:'application/javascript+module',previous:baseline.ownedPins.find(x=>x.name===name)});
const projectedWorkerBytes=baseline.totalBytes+plan.replacements.reduce((sum,p)=>sum+p.bytes-p.previous.bytes,0);
if(projectedWorkerBytes>66968590)throw Error('OWNED_MODULE_BYTE_BUDGET');
await writeFile(resolve(out,'plan.json'),JSON.stringify(plan,null,2)+'\n');
await writeFile(resolve(out,'m100-config.mjs'),source);
console.log(JSON.stringify({sourceCommit,baselineVersion:baseline.number,projectedWorkerBytes,resources:plan.resources}));
