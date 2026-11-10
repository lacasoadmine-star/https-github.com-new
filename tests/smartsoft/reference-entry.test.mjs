import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installReferenceFrame,patchConfig,patchPresentation,verifiedAsset,PREFIX} from '../../deploy/smartsoft/reference-entry-r14.mjs';
import {REFERENCE_SOURCES} from '../../deploy/smartsoft/reference-sources-r14.mjs';
import {projectCommand,bindMobileScene,projectMobileScene} from '../../deploy/smartsoft/smartsoft-mobile-r14.mjs';
import {MOBILE_PROFILES} from '../../deploy/smartsoft/mobile-profiles-r14.mjs';
import {resizeMobileProfile} from '../../deploy/smartsoft/smartsoft-mobile-r14.mjs';
import {mergeReferenceGame} from '../../deploy/smartsoft/reference-state-r14.mjs';
import {REFERENCE_SOURCES as PLAYER_SOURCES} from '../../deploy/smartsoft/reference-player-sources-r14.mjs';
import {installReferenceLibrary,LIBRARY_PREFIX} from '../../deploy/smartsoft/reference-library-r14.mjs';

test('financial requests, protected games, portals, exports and original bodies pass through',async()=>{
 const requests=[];const marker={};const previous={marker,scheduled(){},async fetch(request){requests.push(request);return new Response('retained');}};
 const app=installReferenceFrame(previous,REFERENCE_SOURCES);
 assert.equal(app.marker,marker);assert.equal(app.scheduled,previous.scheduled);
 for(const path of ['/api/remaining20/action','/api/wallet','/games/foxy_hot_20_native','/games/multi_hot_5_native','/demo/games/burningice10_native']){
  const request=new Request('https://player.test'+path,{method:'POST',body:'original',headers:{cookie:'original-session'}});
  assert.equal(await (await app.fetch(request,{PORTAL:'player'},{})).text(),'retained');assert.equal(requests.at(-1),request);
 }
 const request=new Request('https://player.test/games/burningice_native');await app.fetch(request,{PORTAL:'agent'},{});assert.equal(requests.at(-1),request);
});
test('the existing asset service serves the same public bytes without account cookies or new backend routes',async()=>{
 let captured;const retained=[];const oldLibrary={async fetch(request){retained.push(request);return new Response('old asset service');}};
 const library=installReferenceLibrary(oldLibrary,REFERENCE_SOURCES);
 const app=installReferenceFrame({async fetch(){return new Response('retained player');}},PLAYER_SOURCES);
 const response=await app.fetch(new Request('https://player.test'+PREFIX+'frame.mjs',{headers:{cookie:'sw_session=private',authorization:'Bearer private'}}),{PORTAL:'player',EXPANSION100:{async fetch(request){captured=request;return library.fetch(request,{},{});}}},{});
 assert.equal(response.status,200);assert.match(await response.text(),/reference-hood/);assert.equal(new URL(captured.url).pathname,LIBRARY_PREFIX+'frame.mjs');assert.equal(captured.headers.has('cookie'),false);assert.equal(captured.headers.has('authorization'),false);
 const original=new Request('https://assets.test/v2/remaining20/state',{headers:{cookie:'retained-session'}});await library.fetch(original,{},{});assert.equal(retained.at(-1),original);
 assert.equal((await library.fetch(new Request('https://assets.test'+LIBRARY_PREFIX+'frame.mjs',{method:'POST'}),{},{})).status,405);
});
test('player metadata contains only references while all nine complete manifests stay in the existing asset service',()=>{
 assert.equal(Object.keys(PLAYER_SOURCES.resources).length,0);assert.equal(PLAYER_SOURCES.remoteAssets.length,61);
 assert.deepEqual(PLAYER_SOURCES.bindings,REFERENCE_SOURCES.bindings);
 for(const id of Object.keys(REFERENCE_SOURCES.bindings))assert.ok(PLAYER_SOURCES.remoteResources.includes('manifests/'+id+'.json'));
});
test('presentation descriptors change without changing money, versions, release flags or rules',()=>{
 const [id,b]=Object.entries(REFERENCE_SOURCES.bindings)[0];
 const original={id,version:'existing',minStake:'1.00',maxStake:'40000.00',currency:'ETB',launchable:false,stakeValues:['1.00','40000.00'],referencePresentation:{manifestSha256:b.previousManifestSha256,assetBaseURL:b.previousAssetBaseURL,modelVersion:'existing'}};
 const [changed]=patchConfig([original],REFERENCE_SOURCES);
 assert.deepEqual({...changed,referencePresentation:original.referencePresentation},original);assert.match(changed.referencePresentation.manifestURL,/r14\/manifests\//);
 assert.throws(()=>patchConfig([{...original,referencePresentation:{...original.referencePresentation,manifestSha256:'changed'}}],REFERENCE_SOURCES),/DESCRIPTOR_CHANGED/);
});
test('the retained server can refresh a game without reverting its pinned media or changing financial authority',()=>{
 const catalog={id:'burningice_native',version:'existing',launchable:true,minStake:'5.00',referencePresentation:{manifestSha256:'a'.repeat(64),retainedManifestSha256:'b'.repeat(64),modelVersion:'existing'}};
 const server={id:catalog.id,version:'existing',launchable:false,minStake:'1.00',maxStake:'40000.00',math:{rules:'retained'},referencePresentation:{manifestSha256:'b'.repeat(64),modelVersion:'existing'}};
 const copy=structuredClone(server),result=mergeReferenceGame(catalog,server);
 assert.equal(result.referencePresentation,catalog.referencePresentation);assert.equal(result.launchable,false);assert.equal(result.minStake,'1.00');assert.equal(result.math,server.math);assert.deepEqual(server,copy);
 for(const changed of [{...server,id:'foxy_hot_20_native'},{...server,version:'changed'},{...server,referencePresentation:{manifestSha256:'c'.repeat(64),modelVersion:'changed'}}])assert.equal(mergeReferenceGame(catalog,changed),changed);
 assert.equal(mergeReferenceGame(catalog,{...server,referencePresentation:{manifestSha256:'c'.repeat(64),modelVersion:'existing'}}).referencePresentation,catalog.referencePresentation);
});
test('asset mirror rejects changed bytes, off-host URLs and redirects and caches only verified public bytes',async()=>{
 const bytes=new TextEncoder().encode('original-public-image'),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 const descriptor={url:'https://static.ssg-public.com/cache/image.png',bytes:bytes.length,sha256:sha,type:'image/png'},request=new Request('https://player.test/image');
 let put=0;const cache={async match(){return null;},async put(key,response){assert.equal(new URL(key.url).origin,'https://player.test');assert.equal(response.headers.get('set-cookie'),null);put++;}};
 const good=await verifiedAsset(request,descriptor,{cache,fetchImpl:async(url,options)=>{assert.equal(options.credentials,'omit');assert.equal(options.redirect,'manual');return new Response(bytes,{headers:{'set-cookie':'discard'}});}});
 assert.equal(good.status,200);assert.equal(put,1);assert.equal(good.headers.get('set-cookie'),null);
 const bad=await verifiedAsset(request,descriptor,{cache,fetchImpl:async()=>new Response(new Uint8Array(bytes.length))});assert.equal(bad.status,503);assert.equal(put,1);
 const redirected=await verifiedAsset(request,descriptor,{cache,fetchImpl:async()=>new Response(bytes,{status:302,headers:{location:'https://elsewhere.test'}})});assert.equal(redirected.status,503);assert.equal(put,1);
 assert.equal((await verifiedAsset(request,{...descriptor,url:'https://untrusted.test/image'})).status,404);
});
test('projection preserves the receipt and moves every clip and animation anchor consistently',()=>{
 const command={type:'native-animation',box:{x:10,y:20,width:30,height:40},clip:{x:10,y:20,width:30,height:40},rotateAt:{x:25,y:40},clipPolygon:[{x:10,y:20}],size:10,nativeScale:2,role:'winning-symbol',payoutMinor:'300'};
 const original=structuredClone(command),result=projectCommand(command,{x:10,y:20,width:30,height:40},{x:100,y:200,width:60,height:80});
 assert.deepEqual(command,original);assert.deepEqual(result.box,{x:100,y:200,width:60,height:80});assert.deepEqual(result.clip,result.box);assert.deepEqual(result.rotateAt,{x:130,y:240});assert.equal(result.payoutMinor,'300');assert.equal(result.nativeScale,4);
});
test('four missing modern win tiers use the official common component; Wild titles keep their own mappings',async()=>{
 for(const id of ['multihot100_native','habeshafortune5_native','multihot5superwilds_native','multihotdeluxe_native']){
  const r=REFERENCE_SOURCES.resources['manifests/'+id+'.json'];const bytes=Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0));const manifest=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
  const hashes=[];for(const event of ['Win2','Win3','Win4','Win5','WinEnd']){const entry=manifest.audio['Start/'+event+'.mp3'];assert.equal(entry.sourceKey,event);const file=manifest.files[entry.file];assert.match(file.urls[0],/\/Sound\/Common\/Win\//);hashes.push(file.sha256);}assert.equal(new Set(hashes).size,5);
 }
 for(const id of ['multihotwildways_native','multihot5wild_native']){
  const r=REFERENCE_SOURCES.resources['manifests/'+id+'.json'];const m=await new Response(new Blob([Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).json();assert.notEqual(m.audio['Start/Win3.mp3'].sourceComponent,'New/Components/win.js; common:true');
 }
});
test('every modern mobile profile has its own source board, complete locked sprites and matching tap geometry',async()=>{
 for(const [id,profile]of Object.entries(MOBILE_PROFILES)){
  const r=REFERENCE_SOURCES.resources['manifests/'+id+'.json'];const m=await new Response(new Blob([Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
  assert.ok(m.frames['@Mobile/'+profile.board.frame],id+' missing its mobile board');
  const source={gameId:id,width:420,height:900,commands:[],gridGeometry:{x:10,y:200,width:390,height:330}},snapshot={balance:'137.25',stake:'1.00',currency:'ETB',round:null};
  const bound=bindMobileScene(source,m,snapshot,{width:360,height:642});assert.equal(bound.modernMobileLayout,true,id);
  const painted=projectMobileScene(bound,m);assert.deepEqual(painted.controlsGeometry.play,profile.controls.play.box);assert.equal(painted.commands.some(c=>c.text==='ZPLAY'),false);
  for(const c of painted.commands)if(c.type==='sprite'){assert.ok(m.frames[c.frame],c.frame);assert.ok(m.files[m.frames[c.frame].file]);}
  assert.equal(snapshot.balance,'137.25');assert.equal(snapshot.round,null);
 }
});
test('taller phones keep each title\'s observed board behavior while bottom controls follow the viewport',()=>{
 for(const [id,p]of Object.entries(MOBILE_PROFILES)){
  const large=resizeMobileProfile(p,{width:390,height:818});assert.equal(large.width,560);assert.equal(large.height,1174);
  assert.equal(large.controls.play.box.y,p.controls.play.box.y+168);assert.equal(large.controls.play.box.x,p.controls.play.box.x-2);
  assert.equal(large.board.box.y,p.board.box.y+168*p.responsive.boardY);
  assert.deepEqual(MOBILE_PROFILES[id],p);
 }
 assert.equal(MOBILE_PROFILES.habeshafortune5_native.responsive.boardY,0);
 assert.equal(MOBILE_PROFILES.multihot100_native.responsive.boardY,.5);
});
test('published reference queue has 69 distinct official identities and no false financial releases',async()=>{
 const queue=JSON.parse(await readFile(new URL('../../deploy/smartsoft/official-queue-69.json',import.meta.url),'utf8'));
 assert.equal(queue.games.length,69);assert.equal(new Set(queue.games.map(g=>g.providerKey)).size,69);
 for(const game of queue.games){assert.match(game.officialPage,/^https:\/\/www\.smartsoftgaming\.com\/games\//);assert.match(game.officialDemo,/^https:\/\/eu-server\.ssgportal\.com\/GameLauncher\/Loader\.aspx\?/);assert.equal(game.financialRelease,false);}
});
