import {readFile, writeFile, mkdir, rename, readdir, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

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

// official72 consumes exactly one requested-list definition, at two fixed
// callsites. Capture its lossless data instead of evaluating the unrelated
// requested-list constructor inside the Worker. Other importers are untouched.
export async function captureFixedRequestedModel({rootDir=ROOT,sourceOverride}={}) {
  const officialPath=resolve(rootDir,'math','official72.mjs');
  const source=sourceOverride??await required(officialPath);
  const {transform}=await import('esbuild');
  // Parse/reprint before inspecting references: comments and escaped identifier
  // spellings cannot hide a dynamic consumer from this conservative guard.
  const normalized=(await transform(source,{loader:'js',minifyWhitespace:true,minifySyntax:false,minifyIdentifiers:false,treeShaking:false,legalComments:'none',charset:'utf8',target:'es2022'})).code;
  const imports=[...normalized.matchAll(/import\{getGameDefinition as revisedModel\}from"\.\/requested72\.mjs";/g)];
  const references=[...normalized.matchAll(/\brevisedModel\b/g)];
  const calls=[...normalized.matchAll(/\brevisedModel\("ind74_multihot100"\)/g)];
  if(imports.length!==1||calls.length!==2||references.length!==calls.length+1)throw new Error('Fixed requested-model packing requires exactly two literal Multi Hot 100 calls and no other revisedModel references.');
  const requestedPath=resolve(rootDir,'math','requested72.mjs');
  const requested=await import(pathToFileURL(requestedPath).href);
  const definition=requested.getGameDefinition('ind74_multihot100');
  if(definition?.id!=='ind74_multihot100')throw new Error('The exact requested Multi Hot 100 definition is unavailable.');
  const serialized=js(definition);
  if(!isDeepStrictEqual(definition,JSON.parse(serialized)))throw new Error('The requested Multi Hot 100 definition is not lossless JSON data.');
  return {officialPath,definition,serialized,sourceSha256:sha(source),definitionSha256:sha(serialized),definitionBytes:Buffer.byteLength(serialized),fixedCallCount:calls.length};
}

export async function fixedRequestedModelPlugin({rootDir=ROOT}={}) {
  const captured=await captureFixedRequestedModel({rootDir});
  const report={edge:'math/official72.mjs -> ./requested72.mjs',modelId:'ind74_multihot100',fixedCallCount:captured.fixedCallCount,sourceSha256:captured.sourceSha256,definitionSha256:captured.definitionSha256,definitionBytes:captured.definitionBytes,interceptedImports:0};
  const plugin={name:'independent74-fixed-requested-model',setup(builder){
    builder.onResolve({filter:/^\.\/requested72\.mjs$/},args=>{
      if(args.kind!=='import-statement'||resolve(args.importer)!==captured.officialPath)return;
      report.interceptedImports++;
      return {path:'captured-requested72-multihot100',namespace:'ind74-fixed-requested'};
    });
    builder.onLoad({filter:/.*/,namespace:'ind74-fixed-requested'},()=>({loader:'js',contents:`const definition=${captured.serialized};export const getGameDefinition=id=>structuredClone(id==="ind74_multihot100"?definition:null);`}));
  }};
  return {plugin,report,definition:captured.definition};
}

export function publicProgress74({scope,status,routes,sourceCommit=null,builtAt=new Date().toISOString()}) {
  if(!Array.isArray(scope)||scope.length!==74||new Set(scope.map(g=>g.gameId)).size!==74)throw Error('Progress requires74 exact catalogue IDs.');
  if(sourceCommit!==null&&!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('IND74_SOURCE_COMMIT must be a full commit hash.');
  const rows=new Map((status.games??[]).map(g=>[g.gameId,g]));
  const games=scope.map(g=>{const row=rows.get(g.gameId);if(!row||!Number.isSafeInteger(row.verifiedCompletedOfficialRounds)||row.verifiedCompletedOfficialRounds<0)throw Error('Missing verified progress count: '+g.gameId);const route=Object.hasOwn(routes,g.gameId)?routes[g.gameId]:null;if(route&&!/^\/games\/[a-z0-9_]+$/.test(route))throw Error('Unsafe existing game route.');return {number:g.number,gameId:g.gameId,name:g.name,verifiedRounds:row.verifiedCompletedOfficialRounds,build:g.protected?'Existing protected engine preserved':'Independent source exists; incomplete',comparison:'Full provider parity unverified',wallet:route?'Existing engine route; new model closed':'New model wallet actions closed',existingRoute:route,newReleasePublished:false};});
  return {updatedAt:status.createdAt,builtAt,sourceCommit,newReleasePublished:false,games,phase2:{target:1000,records:0,status:'not-started',gated:true,gate:'all74-complete-published-verified',baselineIds:scope.map(g=>g.gameId)},futureTotal:1074};
}

export async function build({rootDir=ROOT,outDir=join(rootDir,'dist'),release='r1',expectedVersion='3ae79dd2-afba-4dcd-bd20-a071ada030a7',sourceCommit=process.env.IND74_SOURCE_COMMIT||null}={}) {
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
  if(names.includes('progress.html')) {
    const scope=JSON.parse(await required(join(rootDir,'scope','official74.json'))).entries;
    const status=JSON.parse(await required(join(rootDir,'reports','current74-status.json')));
    const {EXISTING_WALLET_ROUTES}=await import(pathToFileURL(join(rootDir,'client','existing-wallet-routes.mjs')).href);
    sources['progress74-data.mjs']='export const progress='+js(publicProgress74({scope,status,routes:EXISTING_WALLET_ROUTES,sourceCommit}))+';\n';
    names.push('progress74-data.mjs');
  }
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
  const demoSource=join(rootDir,'server','demo74-worker.mjs');
  const hasDemo=await access(demoSource).then(()=>true,()=>false);
  let demoEngine='',demoGateway='',gatewayOutput=gateway;
  let requestedModelPacking=null;
  const DEMO='independent74-demo-'+release+'.mjs',DEMO_GATEWAY='independent74-demo-gateway-'+release+'.mjs';
  if(hasDemo){
    const {build:bundle,transform}=await import('esbuild');
    const packing=await fixedRequestedModelPlugin({rootDir});
    const bundled=await bundle({stdin:{contents:`export * from ${js(demoSource)}; export {publicLibrary74Definitions as account74Catalog} from ${js(join(rootDir,'server','existing-library74-adapter.mjs'))};`,resolveDir:rootDir,sourcefile:'independent74-demo-entry.mjs'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,alias:{'node:crypto':join(rootDir,'server','demo74-rng.mjs')},plugins:[packing.plugin],metafile:true});
    if(packing.report.interceptedImports!==1||Object.keys(bundled.metafile.inputs).some(name=>/(^|\/)math\/requested72\.mjs$/.test(name)))throw new Error('The fixed requested-model packing did not isolate its one approved import edge.');
    requestedModelPacking={...packing.report,unrelatedRequestedRegistryBundled:false};
    demoEngine=bundled.outputFiles[0].text;
    demoGateway=(await required(join(rootDir,'demo-gateway.mjs'))).replaceAll("'./gateway.mjs'",js('./'+NAMES.gateway));
    checkModule(demoEngine,DEMO);checkModule(demoGateway,DEMO_GATEWAY);
    gatewayOutput=(await transform(gateway,{loader:'js',minify:true,target:'es2022'})).code;
    demoGateway=(await transform(demoGateway,{loader:'js',minify:true,target:'es2022'})).code;
    // The existing Worker is close to its module-size limit. Compact only
    // this release's client assets; every inherited module stays byte-exact.
    for(const name of names.filter(name=>/\.(mjs|css)$/.test(name)))sources[name]=(await transform(sources[name],{loader:name.endsWith('.css')?'css':'js',minify:true,target:'es2022'})).code;
  }
  const assets=Object.fromEntries(names.map(name=>{
    const extension=name.slice(name.lastIndexOf('.'));
    const body=sources[name],digest=sha(body);
    return ['/'+name,{type:MIME[extension],etag:'"independent74-'+digest+'"',body}];
  }));
  const files={
    [NAMES.assets]:hasDemo?`// Compressed independent assets only; inherited modules remain byte-exact.\nlet cached;\nexport async function loadAssets(){\n if(cached)return cached;\n const bytes=Uint8Array.from(atob(${js(gzipSync(JSON.stringify(assets),{level:9}).toString('base64'))}),c=>c.charCodeAt(0));\n const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();\n cached=Object.freeze(Object.assign(Object.create(null),JSON.parse(text)));return cached;\n}\n`:`// Generated from current independent client source. No legacy assets are included.\nexport const assets=Object.freeze(Object.assign(Object.create(null),${js(assets)}));\n`,
    [NAMES.catalog]:`// Public definitions only. Outcomes and wallet state stay on the existing account server.\n${hasDemo?`import {account74Catalog} from './${DEMO}';\n`:''}export const games=Object.freeze(${serializedGames});\nexport const accountGames=Object.freeze(${hasDemo?'account74Catalog()':serializedAccountGames});\n`,
    [NAMES.gateway]:gatewayOutput,
    [NAMES.entry]:`import previous${hasDemo?", {LocalDemoWallet as PreviousDemoWallet}":''} from './presentation-player-entry-r23.mjs';\nexport * from './presentation-player-entry-r23.mjs';\nimport {${hasDemo?'loadAssets':'assets'}} from './${NAMES.assets}';\nimport {games,accountGames} from './${NAMES.catalog}';\nimport {createGateway} from './${NAMES.gateway}';\n${hasDemo?`import {handleDemo74Request} from './${DEMO}';\nimport {createDemoGateway} from './${DEMO_GATEWAY}';\nexport class LocalDemoWallet extends PreviousDemoWallet {\n constructor(ctx,env){super(ctx,env);this.__independent74Context=ctx;}\n fetch(request){return new URL(request.url).pathname.startsWith('/independent74-demo-internal/')?handleDemo74Request(this.__independent74Context,request):super.fetch(request);}\n}\nlet handler;\nexport default {...previous,async fetch(request,env,ctx){\n const path=new URL(request.url).pathname;\n if(path!=='/'&&path!=='/independent74'&&!path.startsWith('/independent74/'))return previous.fetch(request,env,ctx);\n try{if(!handler)handler=createGateway({previous,assets:await loadAssets(),games,accountGames,demoHandler:createDemoGateway({previous}),homeEnhancement:true,accountTransport:'protected-readonly'});return handler(request,env,ctx);}\n catch{if(path==='/')return previous.fetch(request,env,ctx);return new Response(JSON.stringify({error:{code:'GAME_UI_UNAVAILABLE'}}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});}\n}};\n`:`export default {...previous,fetch:createGateway({previous,assets,games,accountGames})};\n`}`,
    ...(hasDemo?{[DEMO]:demoEngine,[DEMO_GATEWAY]:demoGateway}:{})
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
    accountWallet:hasDemo?'Existing protected account session, read-only ETB; new financial actions disabled':'Retained service fixture; no new wallet or database',
    accountTransport:'protected-readonly',
    gameIds:[...ids],
    legacyMain:'presentation-player-entry-r23.mjs',
    legacySourcesChanged:false,
    presenceModule:PRESENCE,
    deploymentPerformed:false,
    freeDemoServerEnabled:hasDemo,
    freeDemoCurrency:hasDemo?'DEMO':null,
    freeDemoStorage:hasDemo?'existing LOCAL_DEMO_WALLETS; independent74-demo object IDs and KV keys; no financial ledger':null,
    sourceCommit,
    gatewaySha256:sha(gateway),
    requestedModelPacking,
    ownModuleBytes:Object.values(files).reduce((sum,source)=>sum+Buffer.byteLength(source),0),
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
