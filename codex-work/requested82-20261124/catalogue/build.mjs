import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {publicCatalogue,releaseReady} from './model.mjs';

export const MODULE_PREFIX='requested82v1/';
export const BYTE_BUDGET=100000;
const hash=value=>createHash('sha256').update(value).digest('hex');
const sourceNames=['requested.mjs','registry.json','model.mjs','public.mjs','client.mjs','worker.mjs','styles.css','build.mjs'];

/** Build an additive wrapper, preserving all prior named exports and original modules. */
export async function buildDeployment({activeMainModule,sourceCommit=null,releaseDescriptors=[]}={}){
  if(!/^[-A-Za-z0-9_./]+\.mjs$/.test(activeMainModule || '') || activeMainModule.startsWith('/') ||
    activeMainModule.split('/').includes('..') || activeMainModule.startsWith(MODULE_PREFIX))throw Error('REQUESTED82_ACTIVE_ENTRY_INVALID');
  if(sourceCommit!==null && !/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('REQUESTED82_SOURCE_COMMIT_INVALID');
  if(!Array.isArray(releaseDescriptors))throw Error('REQUESTED82_RELEASE_DESCRIPTORS_INVALID');
  const sources=new Map(await Promise.all(sourceNames.map(async name=>[name,await readFile(new URL(name,import.meta.url),'utf8')])));
  const registry=JSON.parse(sources.get('registry.json')),seen=new Set();
  for(const descriptor of releaseDescriptors){
    const original=registry.games.find(game=>game.gameId===descriptor?.gameId);
    if(!original || seen.has(descriptor.gameId) || descriptor.displayName!==original.displayName ||
      descriptor.ordinal!==original.ordinal || descriptor.route!==original.route || descriptor.frontend?.route!==original.route ||
      !releaseReady(descriptor) || descriptor.release.proof.sourceCommit!==sourceCommit)throw Error('REQUESTED82_RELEASE_UNVERIFIED');
    Object.assign(original,structuredClone(descriptor));seen.add(original.gameId);
  }
  registry.publicActivation=seen.size>0;
  const catalogue=publicCatalogue(registry);
  const config={catalogue,clientSource:sources.get('client.mjs'),publicSource:sources.get('public.mjs'),
    requestedSource:sources.get('requested.mjs'),stylesheetSource:sources.get('styles.css')};
  config.assetRevision=hash([config.clientSource,config.publicSource,config.requestedSource,config.stylesheetSource].join('\0')).slice(0,24);
  const previous=JSON.stringify('../'+activeMainModule);
  const entry=`import previous from ${previous};\nexport * from ${previous};\nimport config from './worker-assets.mjs';\nimport {createRequested82Worker} from './worker.mjs';\nexport default createRequested82Worker(previous,config);\n`;
  const raw=[['entry.mjs',entry],['worker.mjs',sources.get('worker.mjs')],['public.mjs',sources.get('public.mjs')],
    ['requested.mjs',sources.get('requested.mjs')],['worker-assets.mjs','export default '+JSON.stringify(config)+';\n']];
  const modules=raw.map(([name,source])=>({name:MODULE_PREFIX+name,source,bytes:Buffer.byteLength(source),sha256:hash(source),contentType:'application/javascript+module'}));
  const totalBytes=modules.reduce((n,module)=>n+module.bytes,0);
  if(totalBytes>BYTE_BUDGET)throw Error('REQUESTED82_BYTE_BUDGET_EXCEEDED');
  return {modules,config,report:{schema:'zplay/requested82-additive-build/v1',sourceCommit,activeMainModule,
    requestedCount:82,readyCount:catalogue.readyCount,unavailableDashboardCards:0,assetRevision:config.assetRevision,
    totalBytes,byteBudget:BYTE_BUDGET,configSha256:hash(JSON.stringify(config)),
    dashboardPolicy:'Only qualified working releases appear. With none, the root response and original cards are returned unchanged.',
    sourcePins:sourceNames.map(name=>({path:'codex-work/requested82-20261124/catalogue/'+name,bytes:Buffer.byteLength(sources.get(name)),sha256:hash(sources.get(name))})),
    modules:modules.map(({name,bytes,sha256,contentType})=>({name,bytes,sha256,contentType}))}};
}

export async function writeDeployment(output,build){
  const directory=resolve(output);await mkdir(resolve(directory,MODULE_PREFIX),{recursive:true});
  for(const module of build.modules){
    if(!module.name.startsWith(MODULE_PREFIX) || module.name.includes('..') || Buffer.byteLength(module.source)!==module.bytes || hash(module.source)!==module.sha256)throw Error('REQUESTED82_ARTIFACT_PIN_MISMATCH');
    await writeFile(resolve(directory,module.name),module.source);
  }
  await writeFile(resolve(directory,'requested82-build-report.json'),JSON.stringify(build.report,null,2)+'\n');
}
