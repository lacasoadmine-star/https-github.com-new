import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import {validTrialManifest,renderTrialCard,renderTrialSheet,FIRST_PAIR} from './trial-public.mjs';
import {createFirstPairWorker,validTrialConfig,renderTrialHead,trialResourcePath,TRIAL_KV_PREFIX,TRIAL_PREFIX} from './trial-worker.mjs';
import {buildFirstPairRelease,TRIAL_MODULE_PREFIX} from './trial-build.mjs';
import {publicCatalogue} from './model.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const manifest=JSON.parse(await readFile(new URL('first-pair.json',import.meta.url),'utf8')),hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(){const bodies=new Map(),resources=[['app.mjs','text/javascript; charset=utf-8'],['style.css','text/css; charset=utf-8'],['manifest.json','application/json; charset=utf-8']].map(([name,contentType])=>{
  const bytes=new TextEncoder().encode(name==='manifest.json'?JSON.stringify(manifest):'own isolated '+name).buffer,sha256=hash(new Uint8Array(bytes));
  const record={name,contentType,bytes:bytes.byteLength,sha256,key:TRIAL_KV_PREFIX+sha256+'/'+name};bodies.set(record.key,bytes);return record;
});return {config:{v:1,on:true,s:'b'.repeat(40),r:'a'.repeat(64),a:resources.map(record=>[record.sha256,record.bytes])},resources,bodies};}

test('latest explicit first-pair admission preserves all completion/live/production-round claims as false and other80closed',async()=>{
  assert(validTrialManifest(manifest));assert.deepEqual(manifest.games.map(game=>game.gameId),FIRST_PAIR.map(game=>game.gameId));
  assert.equal(manifest.allowedGameCount,2);assert.equal(manifest.verifiedProductionSpinCount,0);assert.equal(manifest.otherRequestedGamesAdmitted,false);
  const registry=JSON.parse(await readFile(new URL('registry.json',import.meta.url),'utf8'));assert.equal(publicCatalogue(registry).readyCount,0,'trial admission never rewrites the completed-game qualification registry');
  for(const edit of [m=>m.games.push(m.games[0]),m=>m.games.reverse(),m=>m.games[0].route='/games/multihot100_native',m=>m.games[1].route='/api/slots/spin',
    m=>m.games[0].authRequired=false,m=>m.games[1].existingBackend=false,m=>m.liveVerified=true,m=>m.completionClaim=true,m=>m.verifiedProductionSpinCount=7,
    m=>m.games[0].cover.path='https://untrusted.invalid/a.webp',m=>m.games[0].cover.bytes=1,m=>m.games[0].cover.sha256='a'.repeat(64)]){
    const copy=structuredClone(manifest);edit(copy);assert(!validTrialManifest(copy));
  }
});

test('new cards and phone preview use exact real routes/own public covers without impersonating old card events',()=>{
  for(const game of manifest.games){const card=renderTrialCard(game),sheet=renderTrialSheet(game,{liked:true,favorite:true});
    assert.match(card,/class="restored-game-card requested82-trial-card"/);assert(card.includes('href="'+game.route+'"'));assert(card.includes('src="'+game.cover.path+'"'));
    assert.doesNotMatch(card,/data-game-details=|data-catalog-game=|data-game-launch=|Diyaarin|Weli lama heli karo|disabled/);
    assert.match(sheet,/data-r82-pair-like aria-pressed="true"/);assert.match(sheet,/data-r82-pair-favorite aria-pressed="true"/);assert(sheet.includes('href="'+game.route+'"'));assert.match(sheet,/restored-sheet-art/);
  }
});

test('all preexisting requests, cookies, portal handlers and game routes delegate by identity',async()=>{
  const {config}=fixture(),calls=[],response=new Response('unchanged',{status:201,headers:{'Set-Cookie':'opaque=fixture'}}),queue=()=>{};
  const previous={queue,fetch(...args){calls.push(args);return response;}},worker=createFirstPairWorker(previous,config),env={},ctx={};assert.equal(worker.queue,queue);
  for(const [path,method]of [['/','POST'],['/player/login','GET'],['/api/remaining20/state?game_id=multihot100_native','GET'],['/api/remaining20/action','POST'],['/api/slots/spin','POST'],
    ['/games/multi_hot_5_native','GET'],['/games/foxy_hot_20_native','GET'],['/new-games72/multi-hot-100/','GET'],['/new-games72/multi-hot-20/','GET'],['/admin','GET'],['/telebirr','POST'],[manifest.games[0].cover.path,'GET']]){
    const request=new Request('https://player.invalid'+path,{method,...(method==='POST'?{body:'same request'}:{})});assert.equal(await worker.fetch(request,env,ctx),response);assert.deepEqual(calls.at(-1),[request,env,ctx]);
  }
});

test('root transformation replaces request-only90navigation and appends one scoped trial loader; all74originalcards stay untouched',async()=>{
  const {config}=fixture(),handlers=new Map();class Rewriter{on(selector,handler){handlers.set(selector,handler);return this;}transform(response){return response;}}
  const worker=createFirstPairWorker({fetch(){return new Response('<html><head></head><body>74 retained cards</body></html>',{headers:{'Content-Type':'text/html','ETag':'old','Content-Length':'8','Set-Cookie':'keep=1'}});}},config,Rewriter);
  const response=await worker.fetch(new Request('https://player.invalid/'));assert.equal(response.headers.get('ETag'),null);assert.equal(response.headers.get('Set-Cookie'),'keep=1');
  assert.equal(response.headers.get('Cache-Control'),'no-store');assert(handlers.has('#zplay-requested90'));assert(!handlers.has('#zplay-live-catalog'));assert(!handlers.has('.restored-game-card'));
  let html;handlers.get('head').element({append(value){html=value;}});assert.equal(html,renderTrialHead(config));assert.equal((html.match(/<script/g)||[]).length,1);assert.match(html,/data-manifest-url=/);
});

test('only immutable hashed app/style/manifest GET/HEAD are owned; corrupt KV is closed and no financial POST handler exists',async()=>{
  const {config,resources,bodies}=fixture(),env={SSG_OFFICIAL_REFERENCES:{get(key){return bodies.get(key);}}},worker=createFirstPairWorker({fetch(){throw Error('UNEXPECTED');}},config);
  for(const record of resources){const path=trialResourcePath(config,record),get=await worker.fetch(new Request('https://player.invalid'+path),env,{});
    assert.equal(get.status,200);assert.equal(get.headers.get('ETag'),'"'+record.sha256+'"');assert.match(get.headers.get('Cache-Control'),/immutable/);assert.deepEqual(await get.arrayBuffer(),bodies.get(record.key));
    assert.equal(await(await worker.fetch(new Request('https://player.invalid'+path,{method:'HEAD'}),env,{})).text(),'');
    assert.equal((await worker.fetch(new Request('https://player.invalid'+path,{method:'POST'}),env,{})).status,405);
    const corrupt={SSG_OFFICIAL_REFERENCES:{get(){return new Uint8Array(record.bytes).buffer;}}};assert.equal((await worker.fetch(new Request('https://player.invalid'+path),corrupt,{})).status,503);
  }
  assert.equal((await worker.fetch(new Request('https://player.invalid'+TRIAL_PREFIX+config.r+'/not-owned'),env,{})).status,404);
  const bad=structuredClone(config);bad.a[0][0]='old/key';assert(!validTrialConfig(bad));assert.throws(()=>createFirstPairWorker({fetch(){}},bad));
});

test('actual compiled trial app/worker close their imports and add only three modules under the confirmed byte budget',async()=>{
  const baseline={versionId:'8eca6097-07b7-427b-acb9-8c9a13d4eb6f',versionNumber:474,mainModule:'requested82m20r1/entry.mjs',moduleCount:428,totalBytes:66953445};
  const build=await buildFirstPairRelease({baseline,sourceCommit:'b'.repeat(40),verifySourceCommit:false});
  assert.equal(build.report.publicationReady,false);assert.equal(build.report.allowedGameCount,2);assert.equal(build.report.completionClaim,false);assert.equal(build.records.length,3);
  assert.deepEqual(build.modules.map(module=>module.name),['entry.mjs','worker.mjs','config.mjs'].map(name=>TRIAL_MODULE_PREFIX+name));
  assert.match(build.modules[0].source,/export\*from"\.\.\/requested82m20r1\/entry.mjs"/);assert(build.report.projectedWorkerBytes<64*1024*1024);
  assert(build.report.sourcePins.every(pin=>pin.path.startsWith('codex-work/requested82-20261124/catalogue/')));
  await assert.rejects(()=>buildFirstPairRelease({baseline:{...baseline,mainModule:'../wrong.mjs'},sourceCommit:'b'.repeat(40)}),/BUILD_INPUT_INVALID/);
});
