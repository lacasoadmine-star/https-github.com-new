import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {REQUESTED_NAMES} from './requested.mjs';
import {publicCatalogue,releaseReady} from './model.mjs';
import {validCatalogue,lobbyCatalogue,validLobbyCatalogue,renderSection,renderPage,escapeHtml,SECTION_PATH,CATALOGUE_PATH} from './public.mjs';
import {createRequested82Worker} from './worker.mjs';
import {buildDeployment,MODULE_PREFIX} from './build.mjs';
import {installSearch} from './client.mjs';

const registry=JSON.parse(await readFile(new URL('registry.json',import.meta.url),'utf8'));
const request=JSON.parse(await readFile(new URL('../requested.json',import.meta.url),'utf8'));
const catalogue=publicCatalogue(registry),root='/_zplay/requested82/'+'a'.repeat(24)+'/';
const config={catalogue,assetRevision:'a'.repeat(24),clientSource:'// client',publicSource:'// public',requestedSource:'// requested',stylesheetSource:'/* style */'};

function qualified(index=0){
  const game=structuredClone(registry.games[index]);
  return {...game,identityReservedOnly:false,
    reference:{identityStatus:'CATALOGUE_IDENTITY_VERIFIED',manualReferenceRounds:7,freshEvidenceManifestPath:'synthetic-reference.json',rulesSource:'synthetic-rules.json'},
    frontend:{route:game.route,implemented:true},backend:{enabled:true,mountedModuleSha256:'b'.repeat(64)},
    assets:{runtimeAssetsVerified:true,manifestSha256:'c'.repeat(64)},tests:{implemented:true,passed:true,financialIntegrationVerified:true},
    release:{ready:true,enabled:true,liveVerified:true,proof:{gameId:game.gameId,sourceCommit:'a'.repeat(40),workerVersion:'12345678-abcd-1234-abcd-123456789abc',
      evidenceSha256:'d'.repeat(64),verifiedAt:'2026-11-24T00:00:00Z',serverAuthoritative:true,controlsVerified:true,audioVerified:true,visualParityVerified:true,
      playwrightVerified:true,existingBackendConnected:true,liveGameplayVerified:true}}};
}
function released(indices=[0]){const value=structuredClone(registry);value.publicActivation=true;for(const index of indices)value.games[index]=qualified(index);return publicCatalogue(value);}

test('source keeps exact active82 order, including similar labels, and separate new identities',()=>{
  assert.deepEqual(REQUESTED_NAMES,request.requestedNames);assert.deepEqual(catalogue.games.map(g=>g.name),request.requestedNames);
  assert.equal(catalogue.games.length,82);assert.equal(new Set(registry.games.map(g=>g.gameId)).size,82);assert.equal(new Set(registry.games.map(g=>g.route)).size,82);
  assert.notEqual(registry.games[10].gameId,registry.games[41].gameId);
  assert.equal(registry.games[0].gameId,'zplay72_multi_hot_100_v1');assert.equal(registry.games[0].route,'/new-games72/multi-hot-100/');
  assert.equal(registry.games.find(g=>g.displayName==='Samba Da Deusa').referenceMetadata,null,'do not silently substitute Hot Samba');
  assert.equal(registry.games.find(g=>g.displayName==='Gates of Meryln').referenceMetadata,null,'do not assert an unverified spelling alias');
  assert.equal(catalogue.readyCount,0);
});

test('no cards, loader or new section is injected when no working release qualifies',async()=>{
  const lobby=lobbyCatalogue(catalogue);assert(validLobbyCatalogue(lobby));assert.equal(lobby.games.length,0);assert.equal(renderSection(lobby),'');
  const response=new Response('<html><head></head><body>Existing MultiHot5 and all old cards</body></html>',{headers:{'Content-Type':'text/html','ETag':'keep'}});
  class ForbiddenRewriter{constructor(){throw Error('MUST_NOT_REWRITE');}}
  const wrapper=createRequested82Worker({fetch(){return response;}},config,ForbiddenRewriter);
  assert.equal(await wrapper.fetch(new Request('https://player.invalid/')),response);
  assert.equal(response.headers.get('ETag'),'keep');
  const endpoint=await wrapper.fetch(new Request('https://player.invalid'+CATALOGUE_PATH));
  const data=await endpoint.json();assert.equal(data.readyCount,0);assert.deepEqual(data.games,[]);assert.equal(Object.hasOwn(data,'requestedCount'),false);
  const page=await(await wrapper.fetch(new Request('https://player.invalid'+SECTION_PATH))).text();
  assert.doesNotMatch(page,/requested82-card|Dhisid ku jira|script type=/);
});

test('metadata, component tests, switches, previews or installed host alone never create a dashboard Play link',()=>{
  const copied=structuredClone(registry);copied.publicActivation=true;
  for(const game of copied.games){game.identityReservedOnly=false;game.frontend.implemented=true;game.backend.enabled=true;game.assets.runtimeAssetsVerified=true;
    game.tests={implemented:true,passed:true,financialIntegrationVerified:true};game.release={ready:true,enabled:true,liveVerified:true};
    game.runtime={installed:true,existingWallet:true,authRequired:true,financialGatePassed:true};}
  const projected=publicCatalogue(copied);assert.equal(projected.readyCount,0);assert.equal(renderSection(lobbyCatalogue(projected)),'');
  copied.games[0].frontend.visualPreview={enabled:true,readOnly:true,assetClosureVerified:true,assetManifestSha256:'a'.repeat(64),sourceCommit:'a'.repeat(40),route:copied.games[0].route+'preview/'};
  assert.notEqual(publicCatalogue(copied).games[0].previewRoute,null);
  assert.equal(lobbyCatalogue(publicCatalogue(copied)).games.length,0,'a visual preview never appears as dashboard gameplay');
});

test('all live controls, backend connection and Playwright qualification flags are mandatory',()=>{
  const game=qualified();assert(releaseReady(game));
  for(const field of ['serverAuthoritative','controlsVerified','audioVerified','visualParityVerified','playwrightVerified','existingBackendConnected','liveGameplayVerified']){
    const copy=structuredClone(game);copy.release.proof[field]=false;assert(!releaseReady(copy),field);
  }
  for(const edit of [g=>g.reference.manualReferenceRounds=6,g=>g.identityReservedOnly=true,g=>g.backend.mountedModuleSha256='bad',g=>g.assets.manifestSha256='',g=>g.tests.financialIntegrationVerified=false]){
    const copy=structuredClone(game);edit(copy);assert(!releaseReady(copy));
  }
  const lobby=lobbyCatalogue(released([0,3]));assert.equal(lobby.games.length,2);assert.deepEqual(lobby.games.map(g=>g.ordinal),[1,4]);
  const html=renderSection(lobby);assert.equal((html.match(/class="requested82-card"/g)||[]).length,2);
  assert.match(html,/href="\/new-games72\/multi-hot-100\/"/);assert.doesNotMatch(html,/Dhisid ku jira|preview|aria-disabled|requested82-pending/);
});

test('exact labels, order, game IDs and protected or unsafe routes cannot be altered',()=>{
  for(const edit of [r=>r.games.reverse(),r=>r.games.pop(),r=>r.games[0].displayName='MultiHot5',r=>r.games[0].route='/native/multihot5/',
    r=>r.games[0].route='//evil.invalid/',r=>r.games[0].route='/new-games82/../wallet/',r=>r.games[1].route=r.games[0].route,r=>r.games[1].gameId=r.games[0].gameId]){
    const copy=structuredClone(registry);edit(copy);assert.throws(()=>publicCatalogue(copy));
  }
  for(const edit of [r=>r.readyCount++,r=>r.games[0].route='/api/spin',r=>r.games[0].name='<script>alert(1)</script>',r=>r.games[0].playable=false]){
    const copy=structuredClone(lobbyCatalogue(released()));edit(copy);assert(!validLobbyCatalogue(copy));assert.throws(()=>renderSection(copy));
  }
  const broken=structuredClone(catalogue);broken.games[0].previewRoute='javascript:alert(1)';assert(!validCatalogue(broken));
  assert.equal(escapeHtml('<img src=x onerror="x"> & \'a\''),'&lt;img src=x onerror=&quot;x&quot;&gt; &amp; &#39;a&#39;');
  assert.throws(()=>renderPage(lobbyCatalogue(released()),'//evil.invalid/style'));
});

test('all old game, auth, financial and portal requests preserve identity and response',async()=>{
  const calls=[],response=new Response('original',{status:201,headers:{'Set-Cookie':'fixture=1'}}),scheduled=()=>{};
  const previous={scheduled,fetch(...args){calls.push(args);return response;}},env={},ctx={};
  const wrapper=createRequested82Worker(previous,config);assert.equal(wrapper.scheduled,scheduled);
  for(const path of ['/api/spin','/api/wallet','/api/auth/login','/deposit','/telebirr','/native/multihot5/','/native/foxyhot20/','/new-games90/','/new-games72/multi-hot-20/','/agent','/admin']){
    const request=new Request('https://player.invalid'+path,{method:'POST',body:'original input'});
    assert.equal(await wrapper.fetch(request,env,ctx),response);assert.deepEqual(calls.at(-1),[request,env,ctx]);
  }
});

test('own browser assets are GET/HEAD only, immutable by revision, with no API write handlers',async()=>{
  const wrapper=createRequested82Worker({fetch(){throw Error('UNEXPECTED');}},config);
  for(const path of [SECTION_PATH,CATALOGUE_PATH,root+'client.mjs',root+'public.mjs',root+'requested.mjs',root+'styles.css']){
    const get=await wrapper.fetch(new Request('https://player.invalid'+path));assert.equal(get.status,200);assert.equal(get.headers.get('X-Content-Type-Options'),'nosniff');
    assert.match(get.headers.get('Cache-Control'),path.startsWith(root)?/immutable/:/no-store/);
    const head=await wrapper.fetch(new Request('https://player.invalid'+path,{method:'HEAD'}));assert.equal(await head.text(),'');
    const post=await wrapper.fetch(new Request('https://player.invalid'+path,{method:'POST'}));assert.equal(post.status,405);assert.equal(post.headers.get('Allow'),'GET, HEAD');
  }
});

test('qualified dashboard transformation targets marked request navigation and preserves old game rows',async()=>{
  const handlers=new Map();let source;
  class Rewriter{on(selector,handler){handlers.set(selector,handler);return this;}transform(response){source=response;return response;}}
  const wrapped=createRequested82Worker({fetch(){return new Response('<head></head><main>MultiHot5</main>',{headers:{'Content-Type':'text/html','Content-Length':'50','ETag':'old','Set-Cookie':'keep=1'}});}}, {...config,catalogue:released()},Rewriter);
  const result=await wrapped.fetch(new Request('https://player.invalid/'));assert.equal(result,source);assert.equal(result.headers.get('ETag'),null);assert.equal(result.headers.get('Set-Cookie'),'keep=1');
  assert(handlers.has('head'));assert(handlers.has('#zplay-requested90'));assert(!handlers.has('.game-card'));assert(!handlers.has('.home-slot-heading'));
  let append;handlers.get('head').element({append(value){append=value;}});assert.match(append,/zplay-requested82-loader/);assert.match(append,/data-zplay-requested82-style/);
});

test('search supports spacing variants, clears correctly and removes its listener',()=>{
  const data=lobbyCatalogue(released([0,27,28,41,64,65,77]));
  const handlers=new Map(),input={value:'',addEventListener(type,fn){handlers.set(type,fn);},removeEventListener(type,fn){if(handlers.get(type)===fn)handlers.delete(type);}},output={textContent:''};
  const cards=data.games.map(game=>({dataset:{requested82Id:game.gameId},hidden:false}));
  const section={querySelector(selector){return selector==='#requested82-search'?input:output;},querySelectorAll(){return cards;}};
  const search=installSearch(section,data);assert.equal(output.textContent,'7 ciyaarood');
  for(const [query,count] of [['jetx',2],['JetX3',1],['Multi Fruits',1],['CricketX',1],['Classic',1],['nothing',0],['',7]]){
    input.value=query;handlers.get('input')();assert.equal(cards.filter(c=>!c.hidden).length,count,query);assert.equal(output.textContent,count+' ciyaarood');
  }
  search.dispose();assert.equal(handlers.size,0);
});

test('additive build has a complete browser module closure and does not activate source placeholders',async()=>{
  const build=await buildDeployment({activeMainModule:'new90m20r1/entry.mjs',sourceCommit:'a'.repeat(40)});
  assert.equal(build.config.catalogue.readyCount,0);assert.equal(build.report.unavailableDashboardCards,0);assert(build.report.totalBytes<=build.report.byteBudget);
  assert.deepEqual(build.modules.map(m=>m.name),['entry.mjs','worker.mjs','public.mjs','requested.mjs','worker-assets.mjs'].map(n=>MODULE_PREFIX+n));
  assert.match(build.modules[0].source,/export \* from "\.\.\/new90m20r1\/entry.mjs"/);
  const reviewed=await buildDeployment({activeMainModule:'new90m20r1/entry.mjs',sourceCommit:'a'.repeat(40),releaseDescriptors:[qualified()]});
  assert.equal(reviewed.config.catalogue.readyCount,1);
  await assert.rejects(()=>buildDeployment({activeMainModule:'new90m20r1/entry.mjs',sourceCommit:'b'.repeat(40),releaseDescriptors:[qualified()]}),/RELEASE_UNVERIFIED/);
  await assert.rejects(()=>buildDeployment({activeMainModule:'../secret.mjs'}),/ACTIVE_ENTRY_INVALID/);
  await assert.rejects(()=>buildDeployment({activeMainModule:'new90m20r1/entry.mjs',sourceCommit:'a'.repeat(40),releaseDescriptors:[qualified(),qualified()]}),/RELEASE_UNVERIFIED/);
});
