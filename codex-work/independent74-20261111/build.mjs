import {readFile, writeFile, mkdir, rename, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT=dirname(fileURLToPath(import.meta.url));
const PRESENCE='/player-v236/presence.63ed199a80b6c700.mjs';
// Preserve the prepared v1 API catalog for compatibility. The 72 new machines
// use the distinct account-api and retained LibraryService catalog below.
export const CLIENT_GAME_IDS=Object.freeze(['ind74_mineisland2']);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'application/javascript; charset=utf-8'};
const sha=value=>createHash('sha256').update(value).digest('hex');
const js=value=>JSON.stringify(value).replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');

async function required(path) {
  let source;
  try {source=await readFile(path,'utf8');}
  catch(error){throw new Error('Required build input is unavailable: '+path,{cause:error});}
  if(!source.trim())throw new Error('Required build input is empty: '+path);
  return source;
}
function checkModule(source,name) {
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
  if(result.status!==0)throw new Error('Invalid JavaScript in '+name+': '+(result.stderr||result.error?.message||'syntax check failed'));
}
async function writeAtomic(path,content) {
  const temporary=path+'.build-tmp';
  await writeFile(temporary,content,{mode:0o600});
  await rename(temporary,path);
}

export async function build({rootDir=ROOT,outDir=join(rootDir,'dist'),release='r1',expectedVersion='3ae79dd2-afba-4dcd-bd20-a071ada030a7'}={}) {
  if(!/^r[1-9][0-9]*$/.test(release))throw new Error('Use an explicit release identifier.');
  const MAIN='independent74-entry-'+release+'.mjs';
  const NAMES=Object.fromEntries(['assets','catalog','gateway','entry'].map(name=>[name,'independent74-'+name+'-'+release+'.mjs']));
  const requiredNames=['index.html','style.css','app.mjs','api.mjs','audio.mjs','machines74.html','machines74.css','machine74-controller.mjs','machine74-api.mjs','machine74-renderer.mjs','machine74-renderer.css','machine74-audio.mjs'];
  async function webFiles(directory,prefix='') {
    const entries=await readdir(directory,{withFileTypes:true});
    const result=[];
    for(const entry of entries) {
      const name=prefix+entry.name;
      if(entry.isDirectory())result.push(...await webFiles(join(directory,entry.name),name+'/'));
      else if(/\.(?:mjs|css|html)$/.test(name))result.push(name);
    }
    return result.sort();
  }
  // Keep the historical point models in source for offline regression only.
  // The new machine client accepts account state from the retained server.
  const bundledOnly=new Set(['test72-entry.mjs','test72-rng.mjs','test72-bundle.mjs','test72.css','test72.html','official74.html','presentation.mjs']);
  const names=(await webFiles(join(rootDir,'client'))).filter(name=>!bundledOnly.has(name));
  for(const name of requiredNames)if(!names.includes(name))throw new Error('Required build input is unavailable: client/'+name);
  const sources=Object.fromEntries(await Promise.all(names.map(async name=>[name,await required(join(rootDir,'client',name))])));
  for(const name of names.filter(n=>n.endsWith('.mjs')))checkModule(sources[name],'client/'+name);
  const gateway=await required(join(rootDir,'gateway.mjs'));
  checkModule(gateway,'gateway.mjs');
  if(!sources['index.html'].includes('</head>'))throw new Error('Client HTML must contain a closing head element.');
  if(!sources['index.html'].includes(PRESENCE))sources['index.html']=sources['index.html'].replace('</head>',`  <script type="module" src="${PRESENCE}"></script>\n</head>`);
  if(!sources['machines74.html'].includes('</head>'))throw new Error('Machine HTML must contain a closing head element.');
  if(!sources['machines74.html'].includes(PRESENCE))sources['machines74.html']=sources['machines74.html'].replace('</head>',`  <script type="module" src="${PRESENCE}"></script>\n</head>`);

  // Build-time only: the Worker receives public definitions as JSON, never Node math or round state.
  const registry=await import(pathToFileURL(join(rootDir,'math/index.mjs')).href+'?build='+Date.now());
  if(typeof registry.listGameDefinitions!=='function')throw new Error('The public game registry is unavailable.');
  const definitions=registry.listGameDefinitions();
  if(!Array.isArray(definitions))throw new Error('The public registry must return an array.');
  const readyIds=new Set(CLIENT_GAME_IDS);
  const games=structuredClone(definitions.filter(game=>readyIds.has(game?.id)));
  if(!Array.isArray(games)||games.length===0)throw new Error('At least one authored public game definition is required.');
  const ids=new Set();
  for(const game of games) {
    if(!game||typeof game!=='object'||!/^ind74_[a-z0-9_]+$/.test(game.id)||ids.has(game.id))throw new Error('Public game identifiers must be unique independent IDs.');
    if(!game.title||!game.mathVersion||!Array.isArray(game.rules)||!Array.isArray(game.paytable))throw new Error('A public game definition is incomplete: '+game.id);
    for(const forbidden of ['private','survival','wallet','balance_minor','seed','secret','sessionToken'])if(Object.hasOwn(game,forbidden))throw new Error('Private state is forbidden in the public catalog: '+forbidden);
    ids.add(game.id);
  }
  const serializedGames=js(games);
  const adapter=await import(pathToFileURL(join(rootDir,'server/existing-library74-adapter.mjs')).href+'?build='+Date.now());
  const accountGames=adapter.publicLibrary74Definitions();
  if(!Array.isArray(accountGames)||accountGames.length!==72||new Set(accountGames.map(g=>g.id)).size!==72)throw new Error('All 72 independent account definitions are required.');
  if(accountGames.some(g=>!/^ind74_official_[a-z0-9_]+$/.test(g.id)||g.currency!=='ETB'||g.accepting!==false||g.launchable!==false))throw new Error('New account definitions must default to closed release gates.');
  const serializedAccountGames=js(accountGames);
  const assets=Object.fromEntries(names.map(name=>{
    const extension=name.slice(name.lastIndexOf('.'));
    const body=sources[name],digest=sha(body);
    return ['/'+name,{type:MIME[extension],etag:'"independent74-'+digest+'"',body}];
  }));
  const files={
    [NAMES.assets]:`// Generated from current independent client source. No legacy assets are included.\nexport const assets=Object.freeze(Object.assign(Object.create(null),${js(assets)}));\n`,
    [NAMES.catalog]:`// Public definitions only. Outcomes and wallet state stay on the existing account server.\nexport const games=Object.freeze(${serializedGames});\nexport const accountGames=Object.freeze(${serializedAccountGames});\n`,
    [NAMES.gateway]:gateway,
    [NAMES.entry]:`import previous from './presentation-player-entry-r23.mjs';\nexport * from './presentation-player-entry-r23.mjs';\nimport {assets} from './${NAMES.assets}';\nimport {games,accountGames} from './${NAMES.catalog}';\nimport {createGateway} from './${NAMES.gateway}';\nexport default {...previous,fetch:createGateway({previous,assets,games,accountGames})};\n`
  };
  for(const [name,source]of Object.entries(files))checkModule(source,name);
  const modules=Object.entries(files).map(([name,source])=>({name,type:'application/javascript+module',source}));
  const uploadConfig={
    dryRun:true,
    scriptName:'superwin-player',
    workerId:'de2bde7dad5e46b8ace8b00c0daf5450',
    expectedVersion,
    mainModule:MAIN,
    message:'Build 72 server-authoritative independent machines for the existing shared wallet; preserve protected games and legacy modules. Release gates remain closed until reviewed.',
    additionalBindings:[],
    modules
  };
  const report={
    namespace:'/independent74/',
    preparedV1DefinitionCount:games.length,
    supportedMachineCount:accountGames.length,
    realMoneyReleaseEnabledCount:accountGames.filter(game=>game.launchable).length,
    registeredMathDefinitionCount:definitions.length,
    clientReleaseAllowlist:CLIENT_GAME_IDS,
    accountDefinitionCount:accountGames.length,
    browserOutcomeEngineServed:false,
    accountWallet:'retained LibraryService; no new wallet or database',
    gameIds:[...ids],
    legacyMain:'presentation-player-entry-r23.mjs',
    legacySourcesChanged:false,
    presenceModule:PRESENCE,
    deploymentPerformed:false,
    gatewaySha256:sha(gateway),
    assets:Object.fromEntries(Object.entries(assets).map(([name,asset])=>[name,{type:asset.type,bytes:Buffer.byteLength(asset.body),etag:asset.etag}])),
    modules:Object.fromEntries(Object.entries(files).map(([name,source])=>[name,{bytes:Buffer.byteLength(source),sha256:sha(source)}]))
  };
  await mkdir(outDir,{recursive:true});
  for(const [name,source]of Object.entries(files))await writeAtomic(join(outDir,name),source);
  await writeAtomic(join(outDir,'upload-config.json'),JSON.stringify(uploadConfig,null,2)+'\n');
  await writeAtomic(join(outDir,'build-report.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const report=await build({...(process.env.IND74_RELEASE?{release:process.env.IND74_RELEASE}:{}),...(process.env.IND74_EXPECTED_VERSION?{expectedVersion:process.env.IND74_EXPECTED_VERSION}:{})});console.log(JSON.stringify({built:true,namespace:report.namespace,games:report.playableDefinitionCount,modules:Object.keys(report.modules),deploymentPerformed:false},null,2));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
