import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {publicCatalogue, releaseReady} from './model.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
export const MODULE_PREFIX = 'newrequested90r2/';
export const BYTE_BUDGET = 60000;
const sourceNames = ['requested.mjs','model.mjs','public.mjs','client.mjs','worker.mjs','styles.css','registry.json','build.mjs'];
const hash = value => createHash('sha256').update(value).digest('hex');
const compactOptions = {loader:'js', format:'esm', target:'es2022', charset:'utf8', minifyWhitespace:true,
  minifyIdentifiers:true, minifySyntax:true, treeShaking:false, legalComments:'none', sourcemap:false};

export function entryModule(activeMainModule) {
  if (!/^[-A-Za-z0-9_./]+\.mjs$/.test(activeMainModule || '') || activeMainModule.startsWith('/')
    || activeMainModule.split('/').includes('..') || activeMainModule.startsWith(MODULE_PREFIX)) throw Error('ACTIVE_ENTRY_INVALID');
  const from = JSON.stringify('../' + activeMainModule);
  return `import previous from ${from};\nexport {LocalDemoWallet,NativeGameResources} from ${from};\nimport config from './worker-assets.mjs';\nimport {createNew90Worker} from './worker.mjs';\nexport default createNew90Worker(previous,config);\n`;
}

function packedAssets(config) {
  const {games, ...header} = config.catalogue;
  const rows = games.map(({gameId,name,playable,route,status,previewRoute}) =>
    playable ? [gameId,name,previewRoute,route] : previewRoute ? [gameId,name,previewRoute] : [gameId,name]);
  return `const catalogue={...${JSON.stringify(header)},games:${JSON.stringify(rows)}.map(([gameId,name,previewRoute=null,route=null],index)=>({ordinal:index+1,gameId,name,status:route?'ready':'preparing',playable:route!==null,route,previewRoute}))};\nexport default {catalogue,clientSource:${JSON.stringify(config.clientSource)},publicSource:${JSON.stringify(config.publicSource)},stylesheetSource:${JSON.stringify(config.stylesheetSource)},assetRevision:${JSON.stringify(config.assetRevision)}};\n`;
}

export async function buildDeployment({activeMainModule, minifier = null, sourceCommit = null, previewDescriptors = [], releaseDescriptors = []} = {}) {
  const entry = entryModule(activeMainModule);
  if (sourceCommit !== null && !/^[a-f0-9]{40}$/.test(sourceCommit)) throw Error('SOURCE_COMMIT_INVALID');
  const sources = new Map(await Promise.all(sourceNames.map(async name => [name, await readFile(resolve(directory,name),'utf8')])));
  const minify = async (name, source) => {
    if (!minifier) return source;
    if (typeof minifier.transform !== 'function') throw Error('INVALID_MINIFIER');
    const result = await minifier.transform(source,{...compactOptions,sourcefile:name});
    if (result.warnings?.length) throw Error('NEW90_MINIFIER_WARNINGS:' + name);
    return result.code;
  };
  const registry = JSON.parse(sources.get('registry.json'));
  if (!Array.isArray(releaseDescriptors)) throw Error('NEW90_RELEASE_DESCRIPTORS_INVALID');
  const releaseIds = new Set();
  for (const descriptor of releaseDescriptors) {
    const game = registry.games.find(game => game.gameId === descriptor?.gameId);
    if (!game || game.duplicateOfGameId || releaseIds.has(game.gameId) || descriptor.route !== game.route
      || descriptor.frontend?.route !== game.route || descriptor.displayName !== game.displayName
      || descriptor.ordinal !== game.ordinal || descriptor.duplicateOfGameId
      || !/^[a-f0-9]{64}$/.test(descriptor.assets?.manifestSha256 || '')
      || !/^[a-f0-9]{64}$/.test(descriptor.backend?.mountedModuleSha256 || '')) throw Error('NEW90_RELEASE_DESCRIPTOR_UNVERIFIED');
    const candidate = {...game,...structuredClone(descriptor)};
    if (!releaseReady(candidate)) throw Error('NEW90_RELEASE_DESCRIPTOR_UNVERIFIED');
    releaseIds.add(game.gameId);
    Object.assign(game,candidate);
  }
  if (releaseIds.size) registry.publicActivation = true;
  if (!Array.isArray(previewDescriptors)) throw Error('NEW90_PREVIEW_DESCRIPTORS_INVALID');
  const previewIds = new Set();
  for (const descriptor of previewDescriptors) {
    const game = registry.games.find(game => game.gameId === descriptor?.gameId);
    if (!game || previewIds.has(game.gameId) || descriptor.route !== game.route + 'preview/'
      || descriptor.enabled !== true || descriptor.readOnly !== true || descriptor.assetClosureVerified !== true
      || !/^[a-f0-9]{40}$/.test(descriptor.sourceCommit || '') || !/^[a-f0-9]{64}$/.test(descriptor.assetManifestSha256 || '')) throw Error('NEW90_PREVIEW_DESCRIPTOR_UNVERIFIED');
    previewIds.add(game.gameId);
    game.frontend.visualPreview = structuredClone(descriptor);
  }
  const catalogue = publicCatalogue(registry);
  const [clientSource, publicSource] = await Promise.all([
    minify('client.mjs',sources.get('client.mjs')), minify('public.mjs',sources.get('public.mjs'))
  ]);
  const stylesheetSource = sources.get('styles.css');
  const assetRevision = hash(clientSource + '\0' + publicSource + '\0' + stylesheetSource).slice(0,24);
  const config = {catalogue,clientSource,publicSource,stylesheetSource,assetRevision};
  const raw = [ ['entry.mjs',entry], ['public.mjs',publicSource], ['worker.mjs',sources.get('worker.mjs')], ['worker-assets.mjs',packedAssets(config)] ];
  const modules = [];
  for (const [name,source] of raw) {
    const code = await minify(name,source);
    modules.push({name:MODULE_PREFIX + name,source:code,bytes:Buffer.byteLength(code),sha256:hash(code),contentType:'application/javascript+module'});
  }
  const decoded = (await import('data:text/javascript;base64,' + Buffer.from(modules.at(-1).source).toString('base64'))).default;
  assert.deepEqual(decoded,config,'Packing must retain exact catalogue and served asset bytes');
  assert.equal(JSON.stringify(decoded),JSON.stringify(config),'Public JSON ordering must be preserved');
  const totalBytes = modules.reduce((sum,module) => sum + module.bytes,0);
  if (totalBytes > BYTE_BUDGET) throw Error('NEW90_BYTE_BUDGET_EXCEEDED:' + totalBytes);
  return {modules,config,report:{schema:'zplay/new90-additive-build/v1',sourceCommit,activeMainModule,
    releaseId:catalogue.releaseId,requestedCount:90,readyCount:catalogue.readyCount,assetRevision,totalBytes,
    byteBudget:BYTE_BUDGET,minifier:minifier?.version || null,exactAssetEquivalence:true,previewDescriptors:structuredClone(previewDescriptors),
    releaseDescriptors:releaseDescriptors.map(descriptor=>({gameId:descriptor.gameId,route:descriptor.route,
      sourceCommit:descriptor.release.proof.sourceCommit,workerVersion:descriptor.release.proof.workerVersion,
      evidenceSha256:descriptor.release.proof.evidenceSha256,assetManifestSha256:descriptor.assets.manifestSha256,
      mountedModuleSha256:descriptor.backend.mountedModuleSha256})),
    retainedModulePolicy:'Every active module byte is retained. Four new r2 modules are appended; marked prior catalogue loaders/styles and the prior NEW90 section are replaced only in the transformed root response.',
    sourcePins:sourceNames.map(name => ({path:'codex-work/new-games90-20261123/catalogue/' + name,bytes:Buffer.byteLength(sources.get(name)),sha256:hash(sources.get(name))})),
    modules:modules.map(({name,bytes,sha256,contentType}) => ({name,bytes,sha256,contentType}))}};
}

export async function writeDeployment(output, build) {
  const root = resolve(output);
  await mkdir(resolve(root,MODULE_PREFIX),{recursive:true});
  for (const module of build.modules) await writeFile(resolve(root,module.name),module.source);
  await writeFile(resolve(root,'new90-build-report.json'),JSON.stringify(build.report,null,2)+'\n');
  await writeFile(resolve(root,'public-catalogue.json'),JSON.stringify(build.config.catalogue,null,2)+'\n');
}

/** Read exactly the built artifact and reject byte drift before loading its modules. */
export async function loadDeployment(output) {
  const root = resolve(output);
  const report = JSON.parse(await readFile(resolve(root,'new90-build-report.json'),'utf8'));
  const expected = ['entry.mjs','public.mjs','worker.mjs','worker-assets.mjs'].map(name => MODULE_PREFIX + name);
  if (report.schema !== 'zplay/new90-additive-build/v1' || !Array.isArray(report.modules)
    || JSON.stringify(report.modules.map(module => module.name)) !== JSON.stringify(expected)) throw Error('NEW90_BUILD_REPORT_INVALID');
  entryModule(report.activeMainModule);
  const modules = [];
  for (const pin of report.modules) {
    const source = await readFile(resolve(root,pin.name),'utf8');
    if (Buffer.byteLength(source) !== pin.bytes || hash(source) !== pin.sha256 || pin.contentType !== 'application/javascript+module') throw Error('NEW90_ARTIFACT_PIN_MISMATCH:' + pin.name);
    modules.push({...pin,source});
  }
  if (modules.reduce((sum,module) => sum + module.bytes,0) !== report.totalBytes || report.totalBytes > BYTE_BUDGET) throw Error('NEW90_BUILD_BYTES_INVALID');
  const [{default:config},{createNew90Worker},publicModule] = await Promise.all([
    import(pathToFileURL(resolve(root,MODULE_PREFIX+'worker-assets.mjs'))),
    import(pathToFileURL(resolve(root,MODULE_PREFIX+'worker.mjs'))),
    import(pathToFileURL(resolve(root,MODULE_PREFIX+'public.mjs')))
  ]);
  if (!publicModule.validCatalogue(config.catalogue) || report.assetRevision !== config.assetRevision
    || report.readyCount !== config.catalogue.readyCount || report.requestedCount !== config.catalogue.requestedCount) throw Error('NEW90_BUILD_CONFIG_INVALID');
  return {modules,report,config,createNew90Worker,publicModule};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [activeMainModule,output] = process.argv.slice(2);
  if (!activeMainModule || !output) throw Error('Usage: node build.mjs ACTIVE_MAIN_MODULE OUTPUT_DIRECTORY');
  const build = await buildDeployment({activeMainModule,sourceCommit:process.env.GITHUB_SHA || null});
  await writeDeployment(output,build);
  console.log(JSON.stringify(build.report));
}
