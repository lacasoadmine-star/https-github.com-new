import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {REQUESTED_NAMES, EXCLUDED_NAMES, canonicalName} from './requested.mjs';
import {publicCatalogue} from './model.mjs';
import {validCatalogue, renderSection, renderPage} from './public.mjs';
import {createNew90Worker} from './worker.mjs';
import {buildDeployment, entryModule, BYTE_BUDGET,writeDeployment,loadDeployment} from './build.mjs';

const registry = JSON.parse(await readFile(new URL('./registry.json',import.meta.url),'utf8'));
const catalogue = publicCatalogue(registry);
const config = {catalogue,assetRevision:'a'.repeat(24),clientSource:'export const client = true;',publicSource:'export const publicModule = true;',stylesheetSource:'#zplay-requested90{}'};

test('exact latest90 names and ordering supersede the historical CubeNova queue',() => {
  assert.equal(REQUESTED_NAMES.length,90);
  assert.deepEqual(catalogue.games.map(game => game.name),REQUESTED_NAMES);
  assert.deepEqual(catalogue.games.map(game => game.ordinal),Array.from({length:90},(_,index) => index+1));
  assert.equal(REQUESTED_NAMES[0],'Multi Hot 5 Burn Wilds');
  assert.equal(REQUESTED_NAMES[47],'JetX');
  assert.equal(REQUESTED_NAMES[89],'Fortune Catch');
  assert.equal(new Set(registry.games.map(game => game.gameId)).size,90);
  assert.equal(new Set(registry.games.map(game => game.route)).size,90);
  for (const name of EXCLUDED_NAMES) assert(!REQUESTED_NAMES.some(value => canonicalName(value) === canonicalName(name)));
  assert(!REQUESTED_NAMES.some(name => name.startsWith('Cube Nova')));
});

test('same-name prior additive IDs and routes are retained without aliasing different titles',async () => {
  const prior = JSON.parse(await readFile(new URL('../../new-requested71-20261122/registry.json',import.meta.url),'utf8'));
  const priorMap = new Map(prior.games.map(game => [canonicalName(game.displayName),game]));
  let count = 0;
  for (const game of registry.games) {
    const original = priorMap.get(canonicalName(game.displayName));
    if (game.displayName === 'JetX') {
      assert.equal(game.gameId,'zplay71_jetx_v1'); assert.equal(game.route,'/new-games71/jetx/');
      assert.equal(game.notAnAliasOf,'zplay72_new_era_of_jetx_v1');
      assert.notEqual(game.gameId,original.gameId); assert.notEqual(game.route,original.route);
    }
    else if (original) { count++; assert.equal(game.gameId,original.gameId); assert.equal(game.route,original.route); }
    else { assert.match(game.gameId,/^zplay90_/); assert.match(game.route,/^\/new-games90\//); }
  }
  assert.equal(count,33);
  assert.equal(registry.games[5].displayName,'Multi Hot Ways');
  assert.equal(registry.games[5].gameId,'zplay90_multi_hot_ways_v1');
  const names=new Map(registry.games.map(game=>[game.displayName,game]));
  assert.notEqual(names.get('Burning Ice 10').gameId,names.get('Blazing Hot 10').gameId);
  assert.notEqual(names.get('Burning Ice 40').gameId,names.get('Blazing Hot 40').gameId);
  assert.notEqual(names.get('JetX').gameId,names.get('Next Level JetX').gameId);
  assert.equal(names.get('JetX3').duplicateOfGameId,names.get('Aviastar').gameId);
});

test('registration, references and component work alone cannot expose Play or count finished games',() => {
  assert.equal(catalogue.readyCount,0);
  assert(catalogue.games.every(game => !game.playable && game.route===null && game.status==='preparing'));
  const copied = structuredClone(registry);
  copied.publicActivation=true;
  for(const game of copied.games) game.release={ready:true,enabled:true,liveVerified:true};
  assert.equal(publicCatalogue(copied).readyCount,0);
  const g=copied.games[2];
  g.identityReservedOnly=false; g.reference={identityStatus:'CATALOGUE_IDENTITY_VERIFIED',manualReferenceRounds:7,freshEvidenceManifestPath:'reviewed.json',rulesSource:'rules.json'};
  g.frontend.implemented=true;g.backend.enabled=true;g.assets.runtimeAssetsVerified=true;g.tests={implemented:true,passed:true,financialIntegrationVerified:true};
  assert.equal(publicCatalogue(copied).readyCount,0,'live evidence is mandatory');
  g.release.proof={gameId:g.gameId,sourceCommit:'b'.repeat(40),workerVersion:'12345678-abcd-1234-abcd-123456789abc',evidenceSha256:'c'.repeat(64),verifiedAt:'2026-11-23T00:00:00Z',serverAuthoritative:true,controlsVerified:true,audioVerified:true,visualParityVerified:true};
  assert.equal(publicCatalogue(copied).readyCount,1);
  for (const field of ['serverAuthoritative','controlsVerified','audioVerified','visualParityVerified']) {
    g.release.proof[field]=false;assert.equal(publicCatalogue(copied).readyCount,0,field);g.release.proof[field]=true;
  }
  g.duplicateOfGameId='alias';assert.equal(publicCatalogue(copied).readyCount,0);
});

test('preview links require their own read-only and verified asset closure',() => {
  assert.equal(catalogue.games[2].previewRoute,'/new-games72/multi-hot-10/preview/');
  const copied=structuredClone(registry),preview=copied.games[2].frontend.visualPreview;
  preview.assetClosureVerified=false;assert.equal(publicCatalogue(copied).games[2].previewRoute,null);
  preview.assetClosureVerified=true;preview.readOnly=false;assert.equal(publicCatalogue(copied).games[2].previewRoute,null);
  preview.readOnly=true;preview.route='https://untrusted.invalid/';assert.equal(publicCatalogue(copied).games[2].previewRoute,null);
});

test('exact exclusions, reordered names and protected/duplicate/unsafe routes are rejected',() => {
  const attempts=[
    r=>r.games[0].displayName='MultiHot5',r=>r.games[0].displayName='Foxy Hot 20',r=>r.games[0].displayName='HabeshaFortune5',
    r=>[r.games[0].displayName,r.games[1].displayName]=[r.games[1].displayName,r.games[0].displayName],
    r=>r.games[1].gameId=r.games[0].gameId,r=>r.games[1].route=r.games[0].route,
    r=>r.games[0].route='/native/multihot5/',r=>r.games[0].route='//evil.invalid/game/',
    r=>r.games[0].route='/new-games90/../wallet/',r=>r.games.pop()
  ];
  for(const change of attempts){const copied=structuredClone(registry);change(copied);assert.throws(()=>publicCatalogue(copied));}
});

test('public HTML presents10 or90 exact cards, touch-size links and escaped names',async () => {
  const section=renderSection(catalogue),page=renderPage(catalogue,'/styles.css');
  assert.equal((section.match(/class="new90-card"/g)||[]).length,10);
  assert.equal((page.match(/class="new90-card"/g)||[]).length,90);
  assert.match(section,/style="display:block!important"/);
  assert.match(section,/Eeg dhammaan 90/);
  assert.doesNotMatch(section,/class="new90-action"/);
  assert.match(page,/Texas Hold&#39;em Poker/);
  assert.doesNotMatch(page,/<img|<canvas|<video/);
  const bad=structuredClone(catalogue);bad.games[0].name='<img onerror="x">';
  assert.match(renderSection(bad),/&lt;img onerror=&quot;x&quot;&gt;/);
  const css=await readFile(new URL('./styles.css',import.meta.url),'utf8');
  assert.match(css,/min-height:44px/);assert.match(css,/min-height:48px/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/focus-visible/);
});

test('malformed public data cannot mount a fake ready card or unsafe link',() => {
  const changes=[v=>v.readyCount++,v=>v.games[0].playable=true,v=>v.games[0].status='ready',v=>v.games[0].route='/api/spin',v=>v.games[0].previewRoute='javascript:alert(1)',v=>v.games[1].gameId=v.games[0].gameId,v=>v.games[0].name='MultiHot5'];
  for(const change of changes){const copied=structuredClone(catalogue);change(copied);assert(!validCatalogue(copied));assert.throws(()=>renderSection(copied));}
});

test('wallet, auth, payment, legacy catalogue and every original game request retain identity and response',async () => {
  const calls=[],handler=()=>{},response=new Response('original',{status:201,headers:{'Set-Cookie':'session=fixture'}});
  const previous={scheduled:handler,queue:handler,fetch(...args){calls.push(args);return response;}};
  const wrapper=createNew90Worker(previous,config),env={},ctx={};
  for(const path of ['/api/spin','/api/wallet','/login','/deposit','/telebirr','/new-games71/','/new-games72/multi-hot-10/preview/','/native/multihot5/','/agent','/admin']){
    const request=new Request('https://player.invalid'+path,{method:'POST',body:'unchanged'});
    assert.equal(await wrapper.fetch(request,env,ctx),response);
    assert.deepEqual(calls.at(-1),[request,env,ctx]);
  }
  assert.equal(wrapper.scheduled,handler);assert.equal(wrapper.queue,handler);
});

test('own endpoints are GET/HEAD only with immutable versioned assets and uncached catalogue',async () => {
  const wrapper=createNew90Worker({fetch(){throw Error('UNEXPECTED_DELEGATION');}},config);
  for(const path of ['/new-games90/','/new-games90/catalogue.json']){
    const get=await wrapper.fetch(new Request('https://player.invalid'+path));
    assert.equal(get.status,200);assert.equal(get.headers.get('Cache-Control'),'no-store');
    assert.equal(get.headers.get('X-Content-Type-Options'),'nosniff');
    if(path==='/new-games90/')assert.match(get.headers.get('Content-Security-Policy'),/default-src 'none'; script-src 'self'; connect-src 'self'/);
    const head=await wrapper.fetch(new Request('https://player.invalid'+path,{method:'HEAD'}));assert.equal(await head.text(),'');
    const post=await wrapper.fetch(new Request('https://player.invalid'+path,{method:'POST',body:'x'}));assert.equal(post.status,405);
  }
  for(const name of ['client.mjs','public.mjs','styles.css']){
    const asset=await wrapper.fetch(new Request('https://player.invalid/_zplay/new90/'+config.assetRevision+'/'+name));
    assert.match(asset.headers.get('Cache-Control'),/immutable/);assert.equal(asset.status,200);
  }
});

test('root transformation removes only former active catalogue loader while preserving response/session headers',async () => {
  const selectors=[],removed=[],appended=[];
  class Rewriter {
    on(selector,handler){selectors.push(selector);handler.element({remove(){removed.push(selector);},append(value){appended.push(value);}});return this;}
    transform(response){return response;}
  }
  const html='<html><head></head><body><main>old rows</main></body></html>';
  const previous={fetch(){return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','ETag':'old','Last-Modified':'old','Set-Cookie':'session=fixture','X-Existing':'retained','Content-Security-Policy':"default-src 'self'"}});}};
  const response=await createNew90Worker(previous,config,Rewriter).fetch(new Request('https://player.invalid/'));
  assert.deepEqual(selectors,['script#zplay-new71-loader','link[data-zplay-new71-style]','head']);
  assert.deepEqual(removed,['script#zplay-new71-loader','link[data-zplay-new71-style]']);
  assert.match(appended.join(''),/id="zplay-new90-loader"/);
  assert.equal(response.headers.get('Set-Cookie'),'session=fixture');assert.equal(response.headers.get('X-Existing'),'retained');
  assert.equal(response.headers.get('Content-Security-Policy'),"default-src 'self'");
  assert.equal(response.headers.get('ETag'),null);assert.equal(response.headers.get('Last-Modified'),null);
  assert.equal(await response.text(),html);
});

test('non-HTML, unsuccessful, non-root and HEAD responses bypass HTML transformation',async () => {
  class ForbiddenRewriter {constructor(){throw Error('UNEXPECTED_TRANSFORM');}}
  for(const [path,method,status,type] of [['/','GET',200,'application/json'],['/','GET',503,'text/html'],['/login','GET',200,'text/html'],['/','HEAD',200,'text/html']]){
    const original=new Response(method==='HEAD'?null:'old',{status,headers:{'Content-Type':type}});
    const wrapper=createNew90Worker({fetch(){return original;}},config,ForbiddenRewriter);
    assert.equal(await wrapper.fetch(new Request('https://player.invalid'+path,{method})),original);
  }
});

test('additive build contains exactly four new modules, exact data and immutable existing entry import',async () => {
  const build=await buildDeployment({activeMainModule:'newrequested71r1/entry.mjs'});
  assert.equal(build.modules.length,4);assert(build.report.totalBytes<=BYTE_BUDGET);assert.equal(build.report.readyCount,0);
  assert.deepEqual(build.config.catalogue,catalogue);
  assert.match(build.modules[0].source,/\.\.\/newrequested71r1\/entry\.mjs/);
  assert.match(build.modules[0].source,/export \{LocalDemoWallet,NativeGameResources\}/);
  for(const name of ['../escape.mjs','/root.mjs','newrequested90r1/entry.mjs','entry.js'])assert.throws(()=>entryModule(name));
});

test('optional M20 visual preview needs reviewed per-game route and pinned own asset closure',async () => {
  const descriptor={gameId:'zplay72_multi_hot_20_v1',route:'/new-games72/multi-hot-20/preview/',enabled:true,readOnly:true,assetClosureVerified:true,sourceCommit:'d'.repeat(40),assetManifestSha256:'e'.repeat(64)};
  const build=await buildDeployment({activeMainModule:'newrequested71r1/entry.mjs',previewDescriptors:[descriptor]});
  assert.equal(build.config.catalogue.games[3].previewRoute,descriptor.route);
  assert.equal(build.config.catalogue.games[3].playable,false);
  assert.equal(build.report.previewDescriptors[0].assetManifestSha256,descriptor.assetManifestSha256);
  for(const change of [d=>d.readOnly=false,d=>d.assetClosureVerified=false,d=>delete d.sourceCommit,d=>d.route='/new-games72/multi-hot-10/preview/',d=>d.gameId='zplay90_unknown_v1']){
    const copied=structuredClone(descriptor);change(copied);
    await assert.rejects(()=>buildDeployment({activeMainModule:'newrequested71r1/entry.mjs',previewDescriptors:[copied]}),/NEW90_PREVIEW_DESCRIPTOR_UNVERIFIED/);
  }
});

test('exact generated artifact rejects module drift before runtime loading',async () => {
  const directory=await mkdtemp(resolve(tmpdir(),'zplay90-artifact-'));
  try {
    const build=await buildDeployment({activeMainModule:'newrequested71r1/entry.mjs'});
    await writeDeployment(directory,build);
    const loaded=await loadDeployment(directory);
    assert.deepEqual(loaded.config,build.config);
    await writeFile(resolve(directory,build.modules[0].name),build.modules[0].source+' ');
    await assert.rejects(()=>loadDeployment(directory),/NEW90_ARTIFACT_PIN_MISMATCH/);
  } finally {await rm(directory,{recursive:true,force:true});}
});
