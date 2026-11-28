import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const MODULE_PREFIX='requested82m20r1/';
export const PRESENTATION_MODULE_PREFIX='requested20m20r2/';
const directory=dirname(fileURLToPath(import.meta.url)),require=createRequire(import.meta.url);
const digest=value=>createHash('sha256').update(value).digest('hex');
export async function buildM20Recovery({activeMainModule,baselineRevision,previousAppPath,previousStylePath=null,sourceCommit=null,esbuild}={}) {
  if(!/^[-A-Za-z0-9_./]+\.mjs$/.test(activeMainModule||'')||activeMainModule.startsWith('/')||activeMainModule.split('/').includes('..')||activeMainModule.startsWith(previousStylePath?PRESENTATION_MODULE_PREFIX:MODULE_PREFIX)||
     !/^[a-f0-9]{24}$/.test(baselineRevision||'')||!(new RegExp('^/_zplay/new90-m20/'+baselineRevision+'/app\\.[a-f0-9]{64}\\.mjs$').test(previousAppPath||'')||/^\/_zplay\/requested82-m20\/[a-f0-9]{64}\/app\.mjs$/.test(previousAppPath||''))||
     previousStylePath!==null&&!new RegExp('^/_zplay/new90-m20/'+baselineRevision+'/style\\.[a-f0-9]{64}\\.css$').test(previousStylePath)||
     sourceCommit!==null&&!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('M20_RECOVERY_BUILD_INPUT_INVALID');
  esbuild??=require(require.resolve('esbuild',{paths:[directory,...(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]:[])]}));
  const bundled=await esbuild.build({entryPoints:[resolve(directory,'browser.mjs')],bundle:true,write:false,platform:'browser',format:'esm',target:'es2022',minify:true,charset:'utf8',legalComments:'none',logLevel:'silent',metafile:true});
  if(bundled.warnings.length||bundled.outputFiles.length!==1)throw Error('M20_RECOVERY_BUNDLE_INVALID');
  const source=bundled.outputFiles[0].text,appSha256=digest(source),appBytes=Buffer.byteLength(source);
  const config={baselineRevision,previousAppPath,appSha256,appBytes,appPath:`/_zplay/requested82-m20/${appSha256}/app.mjs`,appKey:`requested82/m20/recovery/${appSha256}/app.mjs`};
  const staticFiles=[{key:config.appKey,name:'app.mjs',source,bytes:appBytes,sha256:appSha256,contentType:'text/javascript; charset=utf-8'}];
  const styleInputs=[];
  if(previousStylePath!==null){
    const paths=['../../new-games90-20261123/m20/style.css','../../new-games90-20261123/m20-release/host.css','../pair-opening.css'];
    const sources=await Promise.all(paths.map(async path=>{const absolute=resolve(directory,path),bytes=await readFile(absolute);styleInputs.push({path:absolute,bytes:bytes.length,sha256:digest(bytes)});return bytes.toString('utf8');}));
    const css=await esbuild.transform(sources.join('\n'),{loader:'css',minify:true,target:'es2022',charset:'utf8',legalComments:'none'});
    if(css.warnings.length)throw Error('M20_PRESENTATION_STYLE_INVALID');
    const styleSha256=digest(css.code),styleBytes=Buffer.byteLength(css.code);
    Object.assign(config,{previousStylePath,styleSha256,styleBytes,stylePath:`/_zplay/requested82-m20/${styleSha256}/style.css`,styleKey:`requested82/m20/recovery/${styleSha256}/style.css`});
    staticFiles.push({key:config.styleKey,name:'style.css',source:css.code,bytes:styleBytes,sha256:styleSha256,contentType:'text/css; charset=utf-8'});
  }
  const prefix=previousStylePath?PRESENTATION_MODULE_PREFIX:MODULE_PREFIX;
  const from=JSON.stringify('../'+activeMainModule),entry=`import previous from ${from};export * from ${from};import config from './config.mjs';import {createM20RecoveryWorker} from './worker.mjs';export default createM20RecoveryWorker(previous,config);`;
  const modules=[];
  for(const[name,body]of [['entry.mjs',entry],['config.mjs','export default '+JSON.stringify(config)+';'],['worker.mjs',await readFile(resolve(directory,'worker.mjs'),'utf8')]]) {
    const result=await esbuild.transform(body,{loader:'js',format:'esm',target:'es2022',minify:true,charset:'utf8',legalComments:'none'});
    if(result.warnings.length)throw Error('M20_RECOVERY_MODULE_INVALID');
    modules.push({name:prefix+name,source:result.code,bytes:Buffer.byteLength(result.code),sha256:digest(result.code),contentType:'application/javascript+module'});
  }
  const inputs=await Promise.all(Object.keys(bundled.metafile.inputs).map(async path=>{const bytes=await readFile(resolve(path));return {path,bytes:bytes.length,sha256:digest(bytes)}}));
  inputs.push(...styleInputs);
  return {config,modules,staticFiles,report:{schema:'zplay/m20-accepted-presentation-recovery-build/v1',sourceCommit,activeMainModule,
    gameId:'zplay72_multi_hot_20_v1',backendGameId:'fresh_multihot20',route:'/new-games72/multi-hot-20/',mainModule:prefix+'entry.mjs',
    appSha256,appBytes,workerBytes:modules.reduce((sum,m)=>sum+m.bytes,0),previousAppPath,appPath:config.appPath,
    financialRequestsChanged:false,oldMediaAndStylesUnchanged:previousStylePath===null,oldMediaUnchanged:true,stylesChanged:previousStylePath!==null,previousStylePath,stylePath:config.stylePath??null,inputs,modules:modules.map(({source,...pin})=>pin),staticFiles:staticFiles.map(({source,...pin})=>pin)}};
}
export async function writeM20Recovery(output,build) {
  const root=resolve(output);await mkdir(resolve(root,dirname(build.report.mainModule)),{recursive:true});
  for(const file of build.modules)await writeFile(resolve(root,file.name),file.source);
  for(const file of build.staticFiles)await writeFile(resolve(root,file.name),file.source);
  await writeFile(resolve(root,'build-report.json'),JSON.stringify(build.report,null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [activeMainModule,baselineRevision,previousAppPath,output]=process.argv.slice(2);
  if(!output)throw Error('Usage: build.mjs ACTIVE_MAIN_MODULE BASELINE_REVISION PREVIOUS_APP_PATH OUTPUT');
  const build=await buildM20Recovery({activeMainModule,baselineRevision,previousAppPath,sourceCommit:process.env.GITHUB_SHA||null});
  await writeM20Recovery(output,build);console.log(JSON.stringify(build.report));
}
