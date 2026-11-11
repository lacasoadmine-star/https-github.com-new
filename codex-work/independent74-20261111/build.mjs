import {readFile, writeFile, mkdir, rename, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT=dirname(fileURLToPath(import.meta.url));
const PRESENCE='/player-v236/presence.63ed199a80b6c700.mjs';
// The client currently has a complete implementation for this game only.
// Registering additional server math never silently exposes an unfinished client.
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
  const requiredNames=['index.html','style.css','app.mjs','api.mjs','audio.mjs'];
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
  // These sources are already included in test72-bundle.mjs. Keeping a second
  // served copy wastes the existing Worker's limited uncompressed module size.
  const bundledOnly=new Set(['test72-entry.mjs','test72-rng.mjs','presentation.mjs','fruit-art.mjs','pegboard.mjs']);
  const names=(await webFiles(join(rootDir,'client'))).filter(name=>!bundledOnly.has(name));
  for(const name of requiredNames)if(!names.includes(name))throw new Error('Required build input is unavailable: client/'+name);
  const sources=Object.fromEntries(await Promise.all(names.map(async name=>[name,await required(join(rootDir,'client',name))])));
  for(const name of names.filter(n=>n.endsWith('.mjs')))checkModule(sources[name],'client/'+name);
  const gateway=await required(join(rootDir,'gateway.mjs'));
  checkModule(gateway,'gateway.mjs');
  if(!sources['index.html'].includes('</head>'))throw new Error('Client HTML must contain a closing head element.');
  if(!sources['index.html'].includes(PRESENCE))sources['index.html']=sources['index.html'].replace('</head>',`  <script type="module" src="${PRESENCE}"></script>\n</head>`);

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
  const assets=Object.fromEntries(names.map(name=>{
    const extension=name.slice(name.lastIndexOf('.'));
    const body=sources[name],digest=sha(body);
    return ['/'+name,{type:MIME[extension],etag:'"independent74-'+digest+'"',body}];
  }));
  const files={
    [NAMES.assets]:`// Generated from current independent client source. No legacy assets are included.\nexport const assets=Object.freeze(Object.assign(Object.create(null),${js(assets)}));\n`,
    [NAMES.catalog]:`// Public definitions only. Outcomes and wallet state stay on the account server.\nexport const games=Object.freeze(${serializedGames});\n`,
    [NAMES.gateway]:gateway,
    [NAMES.entry]:`import previous from './presentation-player-entry-r23.mjs';\nexport * from './presentation-player-entry-r23.mjs';\nimport {assets} from './${NAMES.assets}';\nimport {games} from './${NAMES.catalog}';\nimport {createGateway} from './${NAMES.gateway}';\nexport default {...previous,fetch:createGateway({previous,assets,games})};\n`
  };
  for(const [name,source]of Object.entries(files))checkModule(source,name);
  const modules=Object.entries(files).map(([name,source])=>({name,type:'application/javascript+module',source}));
  const uploadConfig={
    dryRun:true,
    scriptName:'superwin-player',
    workerId:'de2bde7dad5e46b8ace8b00c0daf5450',
    expectedVersion,
    mainModule:MAIN,
    message:`Add isolated independent game namespace (${games.length} authored game${games.length===1?'':'s'}); preserve legacy modules, exports, assets and wallet routes`,
    additionalBindings:[],
    modules
  };
  const report={
    namespace:'/independent74/',
    playableDefinitionCount:games.length,
    registeredMathDefinitionCount:definitions.length,
    clientReleaseAllowlist:CLIENT_GAME_IDS,
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
