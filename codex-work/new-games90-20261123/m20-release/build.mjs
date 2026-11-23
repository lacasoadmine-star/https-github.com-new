import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {MEDIA_NAMES,KV_PREFIX,validConfig} from './worker.mjs';

export const MODULE_PREFIX='new90m20r1/';
const directory=dirname(fileURLToPath(import.meta.url)),require=createRequire(import.meta.url);
const digest=value=>createHash('sha256').update(value).digest('hex');
function compiler(){return require(require.resolve('esbuild',{paths:[directory,...(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]:[])]}));}

/** Prepare one same-game entry. Activation and financial gates stay separate. */
export async function buildM20Release({activeMainModule,enabled=false,sourceCommit=null,esbuild=compiler()}={}){
  if(!/^[-A-Za-z0-9_./]+\.mjs$/.test(activeMainModule||'')||activeMainModule.startsWith('/')||
    activeMainModule.split('/').includes('..')||activeMainModule.startsWith(MODULE_PREFIX))throw Error('M20_ACTIVE_ENTRY_INVALID');
  if(typeof enabled!=='boolean'||sourceCommit!==null&&!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('M20_BUILD_INPUT_INVALID');
  const app=await esbuild.build({entryPoints:[resolve(directory,'browser.mjs')],bundle:true,write:false,platform:'browser',
    format:'esm',target:'es2022',minify:true,charset:'utf8',legalComments:'none',logLevel:'silent',metafile:true});
  if(app.warnings.length||app.outputFiles.length!==1)throw Error('M20_BUNDLE_INVALID');
  const appSource=app.outputFiles[0].text;
  const rawStyle=await readFile(resolve(directory,'../m20/style.css'),'utf8')+'\n'+await readFile(resolve(directory,'host.css'),'utf8');
  const css=await esbuild.transform(rawStyle,{loader:'css',minify:true,charset:'utf8',target:'es2022',legalComments:'none'});
  if(css.warnings.length)throw Error('M20_STYLE_INVALID');
  const styleSource=css.code,sourceManifest=JSON.parse(await readFile(resolve(directory,'../m20/native/assets.json'),'utf8'));
  const files=Object.fromEntries(MEDIA_NAMES.map(name=>{const record=sourceManifest.files[name];
    if(!record)throw Error('M20_MEDIA_RECORD_MISSING:'+name);return[name,{bytes:record.bytes,sha256:record.sha256,contentType:record.contentType}];}));
  const manifestSource=JSON.stringify({schema:sourceManifest.schema,gameId:sourceManifest.gameId,revision:'new90-m20-r1',
    baseUrl:'./assets/',symbols:sourceManifest.symbols,files});
  const config={enabled,revision:digest(appSource+'\0'+styleSource+'\0'+manifestSource).slice(0,24),
    appSha256:digest(appSource),styleSha256:digest(styleSource),manifestSha256:digest(manifestSource),appSource,styleSource,manifestSource,
    media:MEDIA_NAMES.map(name=>({name,key:KV_PREFIX+name,...files[name]}))};
  const staticFiles=[['appAsset','app.mjs',appSource,'text/javascript; charset=utf-8'],['styleAsset','style.css',styleSource,'text/css; charset=utf-8'],
    ['manifestAsset','assets.json',manifestSource,'application/json; charset=utf-8']].map(([field,name,source,contentType])=>{
      const record={key:'new90/m20/'+config.revision+'/'+name,bytes:Buffer.byteLength(source),sha256:digest(source),contentType};
      config[field]=record;return{...record,name,source};});
  delete config.appSource;delete config.styleSource;delete config.manifestSource;
  if(!validConfig(config))throw Error('M20_CONFIG_INVALID');
  const from=JSON.stringify('../'+activeMainModule);
  const entry=`import previous from ${from};\nexport {LocalDemoWallet,NativeGameResources} from ${from};\nimport config from './config.mjs';\nimport {createM20ReleaseWorker} from './worker.mjs';\nexport default createM20ReleaseWorker(previous,config);\n`;
  const contents=[['entry.mjs',entry],['worker.mjs',await readFile(resolve(directory,'worker.mjs'),'utf8')],['config.mjs','export default '+JSON.stringify(config)+';\n']];
  const modules=[];
  for(const[name,source]of contents){const result=await esbuild.transform(source,{loader:'js',format:'esm',target:'es2022',minify:true,charset:'utf8',legalComments:'none'});
    if(result.warnings.length)throw Error('M20_MODULE_INVALID:'+name);const text=result.code;
    modules.push({name:MODULE_PREFIX+name,source:text,bytes:Buffer.byteLength(text),sha256:digest(text),contentType:'application/javascript+module'});}
  const inputs=await Promise.all(Object.keys(app.metafile.inputs).map(async path=>{const data=await readFile(resolve(path));return{path,bytes:data.length,sha256:digest(data)};}));
  return{config,modules,staticFiles,report:{schema:'zplay/m20-existing-host-build/v1',sourceCommit,activeMainModule,enabled,
    gameId:'zplay72_multi_hot_20_v1',backendGameId:'fresh_multihot20',route:'/new-games72/multi-hot-20/',revision:config.revision,
    totalBytes:modules.reduce((n,m)=>n+m.bytes,0),mediaBytes:config.media.reduce((n,m)=>n+m.bytes,0),
    nativeMedia:'Retained same-game verified M20 assets; no fresh-download or 1:1 parity claim.',
    settlementMode:'SERVER_IMMEDIATE',financialRoutes:['/api/slots/fresh-state','/api/slots/spin','/api/slots/gamble'],
    cashFlagsChanged:false,liveVerified:false,inputs,staticFiles:staticFiles.map(({source,...pin})=>pin),modules:modules.map(({source,...pin})=>pin)}};
}
export async function writeM20Release(output,result){const destination=resolve(output);await mkdir(resolve(destination,MODULE_PREFIX),{recursive:true});
  for(const module of result.modules)await writeFile(resolve(destination,module.name),module.source);
  await mkdir(resolve(destination,'assets'),{recursive:true});for(const file of result.staticFiles)await writeFile(resolve(destination,'assets',file.name),file.source);
  await writeFile(resolve(destination,'m20-build-report.json'),JSON.stringify(result.report,null,2)+'\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const[activeMainModule,output]=process.argv.slice(2);if(!activeMainModule||!output)throw Error('Usage: node build.mjs ACTIVE_MAIN_MODULE OUTPUT_DIRECTORY');
  const result=await buildM20Release({activeMainModule,enabled:process.env.ZPLAY_M20_RELEASE_ENABLED==='true',sourceCommit:process.env.GITHUB_SHA||null});
  await writeM20Release(output,result);console.log(JSON.stringify(result.report));
}
