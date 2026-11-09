import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import vm from 'node:vm';
import {ASSETS} from './remaining20-new-controls-assets-r6.mjs';
import {PREFIX,LIBRARY_PREFIX,FAMILIES,LEGACY_PATHS,ASSET_NAMES} from './remaining20-new-controls-index-r6.mjs';
import {installNewControlsR6} from './remaining20-new-controls-worker-r6.mjs';
import {installNewControlsR6Assets} from './remaining20-new-controls-library-r6.mjs';
import {installNewGameZoomWorker} from './new-game-zoom-worker-r1.mjs';
import {NEW_GAME_IDS,ZOOM_PREFIX} from './new-game-zoom-policy-r1.mjs';
import {ICE_STARTUP_STYLE_PATH} from './ice-startup-layout-r1.mjs';
import {installIceControls} from '../controls-recovered/remaining20-ice-controls-worker-r4.mjs';
import {installIceAssets} from '../controls-recovered/remaining20-ice-controls-library-r4.mjs';
import {installIceControlsR5} from '../ice-controls-r5/remaining20-ice-controls-worker-r5.mjs';
import {installIceControlsR5Assets} from '../ice-controls-r5/remaining20-ice-controls-library-r5.mjs';
import {FIRST,SEVEN,DELUXE,COIN,FAMILY_MAPS,STATIC_MAPS,sources} from './load-client-families.mjs';

const ORIGIN='https://offline-r6.test',sha=value=>createHash('sha256').update(value).digest('hex'),checks=[];
const report={scope:'Ten catalogue-r3 demo routes only; offline route/import/hash/regression checks',networkCalls:0,financialActions:0,tests:checks,sourceModules:sources};
async function check(name,run){await run();checks.push(name);}
const stored=[];
const responseFor=(item,method='GET')=>new Response(method==='HEAD'?null:item.encoding==='base64'?Buffer.from(item.body,'base64'):item.body,{headers:{'content-type':item.type,'x-zplay-remaining-sha256':item.sha256,'cache-control':'no-store','set-cookie':'sw_remaining20_demo=local-test-only; Secure; HttpOnly'}});
const base={scheduled(){return'preserved';},async fetch(request){
 const url=new URL(request.url);stored.push({path:url.pathname,method:request.method,request});
 if(url.pathname.startsWith('/demo/games/')&&request.method==='GET'){
  const id=url.pathname.slice('/demo/games/'.length),map=['multihot100_native','habeshafortune5_native'].includes(id)?FIRST:id==='multihotdeluxe_native'?DELUXE:id==='coinminer_native'?COIN:SEVEN;
  if(NEW_GAME_IDS.includes(id))return responseFor(map['demo.html']);
 }
 for(const[prefix,map]of STATIC_MAPS)if(url.pathname.startsWith(prefix)){
  const name=url.pathname.slice(prefix.length),item=map[name];return item?responseFor(item,request.method):new Response('Missing retained path '+name,{status:404});
 }
 return new Response('delegated:'+url.pathname,{status:209,headers:{'x-retained-handler':'yes'}});
}};
const library=installNewControlsR6Assets(installIceControlsR5Assets(installIceAssets(base)));
const env={PORTAL:'player',EXPANSION100:{fetch:request=>{assert(!request.headers.has('cookie'));assert(!request.headers.has('authorization'));return library.fetch(request,{},{});}}};
const priorPlayer=installIceControlsR5(installIceControls(base));
const player=installNewGameZoomWorker(installNewControlsR6(priorPlayer));
const fetchAsset=(path,init={})=>player.fetch(new Request(new URL(path,ORIGIN),init),env,{});

await check('exact derived asset bodies match manifest and isolated reviewed inputs',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',import.meta.url)));
 assert.deepEqual(Object.keys(ASSETS).sort(),ASSET_NAMES.toSorted());assert.deepEqual(manifest.scope,[...NEW_GAME_IDS]);
 for(const[name,item]of Object.entries(ASSETS)){assert.equal(item.bytes,Buffer.byteLength(item.body));assert.equal(item.sha256,sha(item.body));assert.deepEqual(manifest.assets[name],Object.fromEntries(Object.entries(item).filter(([key])=>key!=='body')));}
 assert.equal(ASSETS['ice/presentation/smartsoft-native-presentation.mjs'].sha256,'026fbba3dfe9b99f352f89d3d4e01d9e457d5d845c1720f6ef05840c9c6f2994');
 assert.equal(ASSETS['habesha/autoplay-control-audio.mjs'].sha256,'e9d6da1167f3d41ac0c3ef85585216e2b186a841f36878f85ab64c90277458a1');
 assert.equal(ASSETS['shared/legacy-auto-currency.css'].sha256,'a9c902142625dbe463fc0b8990e59c0a6bf706d74dc77ce193fadf4dfb13b983');
 assert.match(ASSETS['shared/legacy-auto-currency.css'].body,/\.smartsoft-native-stage\.smartsoft-legacy-auto \.info \.input \.currency/);
 assert.notEqual(ASSETS['habesha/app.mjs'].sha256,ASSETS['modern/app.mjs'].sha256);assert.equal(ASSETS['modern/app.mjs'],ASSETS['deluxe/app.mjs']);
 for(const record of [...manifest.modules.player,...manifest.modules.library,...manifest.requiredPlayerModules]){const bytes=await fs.readFile(record.file);assert.equal(bytes.length,record.bytes);assert.equal(sha(bytes),record.sha256);}
 report.moduleBytes={player:manifest.modules.player.reduce((n,m)=>n+m.bytes,0),library:manifest.modules.library.reduce((n,m)=>n+m.bytes,0)};
});

await check('only selected families change client prefix; all ten demos receive zoom and three legacy demos receive order-independent CSS',async()=>{
 for(const id of NEW_GAME_IDS){
  const path='/demo/games/'+id,response=await fetchAsset(path),html=await response.text();assert.equal(response.status,200);assert.match(html,/data-zplay-new-zoom-script/);assert.match(html,/maximum-scale=1/);assert.equal(response.headers.get('set-cookie'),'sw_remaining20_demo=local-test-only; Secure; HttpOnly');
  const family=FAMILIES.find(f=>f.ids.includes(id)),app=html.match(/<script[^>]+src="([^"]+app\.mjs)"/)[1];
  if(family)assert.equal(app,PREFIX+family.key+'/app.mjs');else assert(!app.startsWith(PREFIX));
  if(LEGACY_PATHS.includes(path)){assert.match(html,/data-zplay-new-legacy-auto/);assert(html.includes('shared/legacy-auto-currency.css'));}
  else assert(!html.includes('data-zplay-new-legacy-auto'));
  if(['burningice10_native','burningice40_native'].includes(id)){assert.match(html,/data-zplay-ice-startup="1"/);assert(html.includes(ICE_STARTUP_STYLE_PATH));}
  else assert(!html.includes('data-zplay-ice-startup='));
  assert.equal(response.headers.get('cache-control'),'no-store');
 }
 assert.equal(player.scheduled(),base.scheduled());
});

await check('protected games, existing cash routes, API actions and other portals delegate unchanged',async()=>{
 for(const path of ['/games/multi_hot_5_native','/games/foxy_hot_20_native','/games/multihot5_native','/games/foxyhot20_native','/demo/games/multihot5_native','/demo/games/foxyhot20_native','/games/burningice40_native','/api/demo/library/action','/api/library/action','/'])for(const method of ['GET','POST']){
  const request=new Request(ORIGIN+path,{method,...(method==='POST'?{body:'unchanged-body'}:{})}),response=await player.fetch(request,env,{});assert.equal(response.status,209);assert.equal(stored.at(-1).request,request);
 }
 const request=new Request(ORIGIN+PREFIX+'ice/app.mjs');const response=await player.fetch(request,{...env,PORTAL:'agent'},{});assert.equal(response.status,209);assert.equal(stored.at(-1).request,request);
});

await check('overlays GET/HEAD/ETag are exact and drop client credentials before Library dispatch',async()=>{
 for(const[name,item]of Object.entries(ASSETS)){
  const response=await fetchAsset(PREFIX+name,{headers:{cookie:'private-cookie',authorization:'private-token'}});assert.equal(response.status,200);assert.equal(await response.text(),item.body);assert.equal(response.headers.get('etag'),'"'+item.sha256+'"');assert.equal(response.headers.get('set-cookie'),null);
  const head=await fetchAsset(PREFIX+name,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.equal(head.headers.get('content-length'),String(item.bytes));
  const cached=await fetchAsset(PREFIX+name,{headers:{'if-none-match':'"'+item.sha256+'"'}});assert.equal(cached.status,304);assert.equal(await cached.text(),'');assert.equal(cached.headers.get('content-length'),null);
  assert.equal((await fetchAsset(PREFIX+name,{method:'POST'})).status,405);
 }
 const startup=await fetchAsset(ICE_STARTUP_STYLE_PATH);assert.equal(startup.status,200);assert.equal(sha(await startup.text()),'82b4fac0406c838d45582d3e321d193202236e3322360e355d5fcb1804e79f50');
 assert.equal((await fetchAsset(ICE_STARTUP_STYLE_PATH,{method:'POST'})).status,405);
 for(const path of [PREFIX+'unknown/app.mjs',PREFIX+'shared/missing.css',LIBRARY_PREFIX+'missing'])assert.equal(path.startsWith(LIBRARY_PREFIX)?(await library.fetch(new Request(ORIGIN+path),{},{})).status:(await fetchAsset(path)).status,404);
});

await check('each retained family and Deluxe-specific initial-grid response stays exact',async()=>{
 for(const family of FAMILIES)for(const name of ['session.mjs','controls.mjs','machine-options.mjs','demo-mode.mjs','demo-games.json','reference-presentation.mjs','presentation/smartsoft-initial-grid.mjs']){
  const item=FAMILY_MAPS[family.key][name];assert(item,family.key+' '+name);const result=await fetchAsset(PREFIX+family.key+'/'+name);assert.equal(result.status,200);assert.equal(sha(await result.text()),item.sha256);
 }
 assert.notEqual(DELUXE['presentation/smartsoft-initial-grid.mjs'].sha256,SEVEN['presentation/smartsoft-initial-grid.mjs'].sha256);
});

await check('old immutable prefixes still return byte-identical reviewed bodies',async()=>{
 for(const[path,map]of STATIC_MAPS)for(const name of ['app.mjs','demo-mode.mjs','session.mjs']){const result=await fetchAsset(path+name);assert.equal(result.status,200);assert.equal(sha(await result.text()),map[name].sha256);}
});

await check('compressed HTML rewriting is bounded and retains the original session header',async()=>{
 const old=FIRST['demo.html'].body,compressed=gzipSync(old),prior={fetch:()=>new Response(compressed,{headers:{'content-type':'text/html','content-encoding':'gzip','content-length':String(compressed.length),'set-cookie':'preserved=1'}})};
 const p=installNewGameZoomWorker(installNewControlsR6(prior)),response=await p.fetch(new Request(ORIGIN+'/demo/games/habeshafortune5_native'),env,{}),html=await response.text();
 assert(html.includes(PREFIX+'habesha/app.mjs'));assert.match(html,/data-zplay-new-zoom-script/);assert.equal(response.headers.get('content-encoding'),null);assert.equal(response.headers.get('content-length'),null);assert.equal(response.headers.get('set-cookie'),'preserved=1');
 const huge=new Response('x'.repeat(131073),{headers:{'content-type':'text/html'}});const delegated=installNewControlsR6({fetch:()=>huge});assert.equal(await delegated.fetch(new Request(ORIGIN+'/demo/games/habeshafortune5_native'),env,{}),huge);
});

const links=[];
await check('all four actual app import graphs link through their correct composed routes',async()=>{
 for(const family of FAMILIES){
  const context=vm.createContext({URL}),modules=new Map();
  async function get(url){if(modules.has(url))return modules.get(url);const response=await fetchAsset(new URL(url).pathname);assert.equal(response.status,200,url);const body=await response.text();const module=new vm.SourceTextModule(body,{context,identifier:url,initializeImportMeta:meta=>{meta.url=url;}});modules.set(url,module);return module;}
  const appURL=ORIGIN+PREFIX+family.key+'/app.mjs',app=await get(appURL);
  await app.link((specifier,from)=>{assert(specifier.startsWith('.'));return get(new URL(specifier,from.identifier).href);});
  const source=await(await fetchAsset(new URL(appURL).pathname)).text();const expression=source.match(/const response=await gameFetch\((.+),\{credentials:'same-origin',cache:'no-store'\}\);if\(!response.ok\)throw Error\('Game list unavailable'\);/);assert(expression);
  const boot=new vm.SourceTextModule('export const target='+expression[1]+';',{context,initializeImportMeta:meta=>{meta.url=appURL;}});await boot.link(()=>{throw Error('unexpected');});await boot.evaluate();assert.equal(boot.namespace.target,ORIGIN+PREFIX+family.key+'/games.json');
  const demo=modules.get(ORIGIN+PREFIX+family.key+'/demo-mode.mjs');await demo.evaluate();
  for(const id of family.ids){let consumed;const mode=demo.namespace.createDemoMode({location:{origin:ORIGIN,pathname:'/demo/games/'+id},fetchImpl:url=>{consumed=url;return fetchAsset(new URL(url).pathname);}});const catalog=await(await mode.fetch(boot.namespace.target)).json();assert.equal(consumed,ORIGIN+PREFIX+family.key+'/demo-games.json');const game=catalog.find(g=>g.id===id);assert(game?.demoCreditsOnly===true);assert.equal(game.currency,'CREDITS');const descriptor=game.referencePresentation,response=await fetchAsset(descriptor.manifestURL);assert.equal(response.status,200);assert.equal(sha(await response.text()),descriptor.manifestSha256);}
  if(family.key==='ice')assert.equal(sha((await(await fetchAsset(PREFIX+'ice/presentation/smartsoft-native-presentation.mjs')).text())),'026fbba3dfe9b99f352f89d3d4e01d9e457d5d845c1720f6ef05840c9c6f2994');
  else assert(modules.has(ORIGIN+PREFIX+family.key+'/autoplay-control-audio.mjs'));
  links.push({family:family.key,modules:modules.size,gameIds:family.ids});
 }
});

await check('unchanged zoom bundle and required r5 Player modules are pinned for the active346 composition',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',import.meta.url)));
 assert.deepEqual(manifest.requiredPlayerModules.map(x=>x.name),['remaining20-ice-controls-player-entry-r5.mjs','remaining20-ice-controls-worker-r5.mjs','remaining20-ice-controls-index-r5.mjs']);
 const entry=await fs.readFile(new URL(manifest.entry.player,import.meta.url),'utf8');assert.match(entry,/remaining20-ice-controls-player-entry-r5/);assert.match(entry,/installNewGameZoomWorker\(installNewControlsR6\(previous\)\)/);
 assert.equal((await fetchAsset(ZOOM_PREFIX+'zoom.js')).status,200);assert.equal((await fetchAsset(ZOOM_PREFIX+'zoom.css')).status,200);
});

await check('exact live Ice40 all-frozen receipt regression remains fixed in the composed native module',async()=>{
 if(!process.argv.includes('--reuse-artwork-evidence'))await import('../ice-artwork-followup/verify-artwork.mjs');
 const regression=JSON.parse(await fs.readFile(new URL('../ice-artwork-followup/verification.json',import.meta.url)));
 assert.equal(regression.candidateSha256,ASSETS['ice/presentation/smartsoft-native-presentation.mjs'].sha256);assert.equal(regression.evidence.length,12);assert.equal(regression.fixed,true);report.artworkRegressionCases=regression.evidence.length;report.artworkEvidenceReused=process.argv.includes('--reuse-artwork-evidence');
});

report.passed=true;report.linkedFamilies=links;report.assets=Object.fromEntries(Object.entries(ASSETS).map(([name,item])=>[name,{bytes:item.bytes,sha256:item.sha256}]));report.gameScope=[...NEW_GAME_IDS];
report.excludedAdditionalLiveNewTitles=['multihot40_native','balloon_native','jetx_native'];report.protectedUnchanged=['multi_hot_5_native','foxy_hot_20_native'];
await fs.writeFile(new URL('verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,groups:checks.length,assets:ASSET_NAMES.length,linkedFamilies:links,artworkRegressionCases:report.artworkRegressionCases,moduleBytes:report.moduleBytes,networkCalls:0,financialActions:0}));
