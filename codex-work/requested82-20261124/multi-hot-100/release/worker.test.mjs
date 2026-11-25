import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createM100ReleaseWorker,validConfig,renderGameHTML,resourcePath,resourceType,
  GAME_PATH,MEDIA_PREFIX,KV_PREFIX,MEDIA_NAMES,AUDIO_NAMES,GAME_ID,BACKEND_GAME_ID} from './worker.mjs';
import {buildM100Release,writeM100Release,loadM100Release,MODULE_PREFIX,WORKER_BYTE_LIMIT} from './build.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const hash=data=>createHash('sha256').update(data).digest('hex');
const bytes=text=>new TextEncoder().encode(text).buffer;
const baseline={versionId:'8eca6097-07b7-427b-acb9-8c9a13d4eb6f',versionNumber:472,mainModule:'new90m20r1/entry.mjs',moduleCount:425,totalBytes:66950468};
function fixture(audio=false){
  const bodies=new Map(),names=['app.mjs','page.css','asset-pins.json',...MEDIA_NAMES.map(n=>'media/'+n),...(audio?(audio==='partial'?AUDIO_NAMES.slice(0,8):AUDIO_NAMES).map(n=>'audio/'+n):[])];
  const resources=names.map(name=>{const data=bytes('isolated-static-fixture:'+name),sha256=hash(new Uint8Array(data));
    const record={name,sha256,bytes:data.byteLength,key:KV_PREFIX+sha256+'/'+name,contentType:resourceType(name)};bodies.set(record.key,data);return record;});
  const config={schema:'zplay/m100-existing-host-release/v1',enabled:true,gameId:GAME_ID,backendGameId:BACKEND_GAME_ID,
    revision:'a'.repeat(64),sourceCommit:'b'.repeat(40),baseline,resources};
  const gets=[],env={SSG_OFFICIAL_REFERENCES:{get(key,options){gets.push([key,options]);return bodies.get(key);}}};
  return {config,bodies,gets,env};
}

test('configuration accepts only the exact own20static resources and genuine8or9audio groups',()=>{
  assert.equal(MEDIA_NAMES.length,20);assert.equal(AUDIO_NAMES.length,9);
  assert(validConfig(fixture().config));assert(validConfig(fixture(true).config));assert(validConfig(fixture('partial').config));
  const wrongEight=fixture(true).config;wrongEight.resources=wrongEight.resources.filter(record=>record.name!=='audio/Start/ReelStop5.mp3');
  assert.equal(validConfig(wrongEight),false,'eight clips cannot silently replace a missing reel stop with another clip');
  const edits=[c=>c.resources.pop(),c=>c.resources.push({...c.resources[0]}),c=>c.resources[0].name='../private.png',
    c=>c.resources[0].key='legacy/key',c=>c.resources[0].sha256='a'.repeat(63),c=>c.resources[0].bytes=0,
    c=>c.resources[0].contentType='text/html',c=>delete c.resources[0].name,c=>c.gameId='multi_hot_100',
    c=>c.backendGameId='multi_hot_100',c=>c.sourceCommit='dirty',c=>c.baseline={...c.baseline,mainModule:'../private.mjs'},
    c=>c.baseline={...c.baseline,versionId:'staged-not-a-version'},c=>c.revision='<script>'];
  for(const edit of edits){const c=structuredClone(fixture().config);edit(c);assert.equal(validConfig(c),false);assert.throws(()=>createM100ReleaseWorker({fetch(){}},c));}
});

test('page exposes only pinned same-origin resources, empty gameplay root and strict CSP',async()=>{
  const {config,env}=fixture(true),previous={fetch(){throw Error('UNEXPECTED_DELEGATION');}},worker=createM100ReleaseWorker(previous,config);
  const response=await worker.fetch(new Request('https://player.invalid'+GAME_PATH),env,{}),html=await response.text();
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.match(response.headers.get('Content-Security-Policy'),/script-src 'self'/);assert.match(response.headers.get('Content-Security-Policy'),/connect-src 'self'/);
  assert.match(response.headers.get('Content-Security-Policy'),/img-src 'self' data: blob:/);assert.doesNotMatch(response.headers.get('Content-Security-Policy'),/unsafe-eval|unsafe-inline|https?:/);
  assert.match(html,/id="m100-game"/);assert.match(html,/data-game-id="zplay72_multi_hot_100_v1"/);assert.match(html,/data-audio-base="\/_zplay\/requested82-m100\/[a-f0-9]{64}\/audio\/"/);
  assert.match(html,/data-asset-base="\/_zplay\/requested82-m100\/[a-f0-9]{64}\/media\/"/);
  assert.match(html,/asset-pins\.[a-f0-9]{64}\.json/);assert.doesNotMatch(html,/ssgportal|<canvas|balance|token|<script>.*startM100Page/);
  assert.equal((html.match(/<script /g)||[]).length,1);assert.equal(await(await worker.fetch(new Request('https://player.invalid'+GAME_PATH,{method:'HEAD'}),env,{})).text(),'');
  const silent=renderGameHTML(fixture().config);assert.match(silent,/data-audio-base=""/);
});

test('every current JS,CSS,pin,media and audio resource is read by its own hash key and verified before GET/HEAD',async()=>{
  const {config,env,gets,bodies}=fixture(true),worker=createM100ReleaseWorker({fetch(){throw Error('UNEXPECTED_DELEGATION');}},config);
  for(const record of config.resources){
    const path=resourcePath(config,record),response=await worker.fetch(new Request('https://player.invalid'+path),env,{});
    assert.equal(response.status,200,record.name);assert.equal(response.headers.get('Content-Type'),record.contentType);
    assert.equal(response.headers.get('Content-Length'),String(record.bytes));assert.equal(response.headers.get('ETag'),'"'+record.sha256+'"');
    assert.match(response.headers.get('Cache-Control'),/max-age=31536000, immutable/);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
    assert.deepEqual(await response.arrayBuffer(),bodies.get(record.key));assert.deepEqual(gets.at(-1),[record.key,{type:'arrayBuffer'}]);
    const head=await worker.fetch(new Request('https://player.invalid'+path,{method:'HEAD'}),env,{});assert.equal(head.status,200);assert.equal(await head.text(),'');
  }
  assert(resourcePath(config,config.resources.find(r=>r.name==='media/Spine/Logo/multi hot 100 logo.json')).includes('multi%20hot%20100%20logo.json'));
});

test('missing, inaccessible, wrong-length and same-length-corrupt KV bodies fail closed',async()=>{
  const {config,bodies}=fixture(),record=config.resources[0],path=resourcePath(config,record),worker=createM100ReleaseWorker({fetch(){throw Error('UNEXPECTED_DELEGATION');}},config);
  for(const env of [{},{SSG_OFFICIAL_REFERENCES:{get(){throw Error('private exception must not leak');}}},{SSG_OFFICIAL_REFERENCES:{get(){return null;}}}]){
    const response=await worker.fetch(new Request('https://player.invalid'+path),env,{});assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private exception/);
  }
  for(const bad of [bytes('short'),new Uint8Array(new Uint8Array(bodies.get(record.key)).map(n=>n^1)).buffer]){
    const env={SSG_OFFICIAL_REFERENCES:{get(){return bad;}}};
    const response=await worker.fetch(new Request('https://player.invalid'+path),env,{});assert.equal(response.status,502);assert.equal(response.headers.get('Cache-Control'),'no-store');
    assert.equal((await worker.fetch(new Request('https://player.invalid'+path,{method:'HEAD'}),env,{})).status,502);
  }
});

test('own page/redirect/static namespace reject writes and unknown static resources cannot reach old handlers',async()=>{
  const {config,env}=fixture(),worker=createM100ReleaseWorker({fetch(){throw Error('UNEXPECTED_DELEGATION');}},config),root=MEDIA_PREFIX+config.revision+'/';
  for(const path of [GAME_PATH,GAME_PATH.slice(0,-1),resourcePath(config,config.resources[0]),root+'unknown.json']){
    for(const method of ['POST','PUT','DELETE','PATCH']){
      const response=await worker.fetch(new Request('https://player.invalid'+path,{method}),env,{});assert.equal(response.status,405);assert.equal(response.headers.get('Allow'),'GET, HEAD');
    }
  }
  const redirect=await worker.fetch(new Request('https://player.invalid'+GAME_PATH.slice(0,-1)),env,{});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('Location'),GAME_PATH);
  const unknown=await worker.fetch(new Request('https://player.invalid'+root+'unknown.json'),env,{});assert.equal(unknown.status,404);assert.equal(unknown.headers.get('Cache-Control'),'no-store');
});

test('existing dashboard, all financial/auth/player APIs and prior game assets remain byte-identical delegated responses',async()=>{
  const {config,env}=fixture(),response=new Response('exact-existing-response',{status:201,headers:{'Set-Cookie':'existing-session=opaque','ETag':'old'}}),calls=[],scheduled=()=>{},queue=()=>{};
  const previous={scheduled,queue,fetch(...args){calls.push(args);return response;}},worker=createM100ReleaseWorker(previous,config),ctx={};
  assert.equal(worker.scheduled,scheduled);assert.equal(worker.queue,queue);
  const cases=[['/','GET'],['/api/remaining20/state?game_id=multihot100_native','GET'],['/api/remaining20/action','POST'],['/api/player/wallet','GET'],
    ['/api/auth/login','POST'],['/api/slots/spin','POST'],['/telebirr','POST'],['/player/login','GET'],['/native/multihot5/','GET'],
    ['/native/foxyhot20/','GET'],['/new-games72/multi-hot-20/','GET'],['/new-games90/','GET'],['/agent','GET'],['/admin','GET'],
    [MEDIA_PREFIX+'c'.repeat(64)+'/app.old.mjs','GET']];
  for(const [path,method]of cases){
    const request=new Request('https://player.invalid'+path,{method,headers:{'X-Zplay-Library-Session':'test-opaque'},...(method==='POST'?{body:'unchanged accepted-request payload'}:{})});
    assert.equal(await worker.fetch(request,env,ctx),response);assert.deepEqual(calls.at(-1),[request,env,ctx]);
  }
  assert.equal(response.headers.get('Set-Cookie'),'existing-session=opaque');assert.equal(response.headers.get('ETag'),'old');
});

test('disabled staged release delegates even its own route with no KV read',async()=>{
  const {config,env,gets}=fixture(),response=new Response('retained'),calls=[],previous={fetch(...args){calls.push(args);return response;}};
  const worker=createM100ReleaseWorker(previous,{...config,enabled:false}),ctx={};
  for(const path of [GAME_PATH,resourcePath(config,config.resources[0])]){
    const request=new Request('https://player.invalid'+path);assert.equal(await worker.fetch(request,env,ctx),response);assert.deepEqual(calls.at(-1),[request,env,ctx]);
  }
  assert.equal(gets.length,0);
});

test('build rejects unknown source/baseline versions, unsafe entry and impossible baseline byte budget before compilation',async()=>{
  const esbuild={build(){throw Error('MUST_NOT_COMPILE');}},common={baseline,sourceCommit:'b'.repeat(40),assetDirectory:'/isolated-fixture',esbuild};
  for(const input of [{...common,baseline:null},{...common,sourceCommit:'dirty'},{...common,baseline:{...baseline,mainModule:'../private.mjs'}},
    {...common,baseline:{...baseline,totalBytes:WORKER_BYTE_LIMIT}},{...common,assetDirectory:'relative/path'},
    {...common,audioPins:[{path:'../private.mp3',bytes:1,sha256:'c'.repeat(64)}]}]){
    await assert.rejects(()=>buildM100Release(input),/M100_(?:BASELINE_REQUIRED|BUILD_INPUT_INVALID|AUDIO_PINS_INVALID)/);
  }
});

test('emitted modules and KV media must survive exact hash-verified artifact reload; byte drift cannot be staged',async()=>{
  const {config,bodies}=fixture(),destination=await mkdtemp(resolve(tmpdir(),'m100-release-test-'));
  const module=(name,source)=>({name:MODULE_PREFIX+name,source,bytes:Buffer.byteLength(source),sha256:hash(source),contentType:'application/javascript+module'});
  const modules=[module('entry.mjs','export default {};\n'),module('worker.mjs','export const isolatedFixture = true;\n'),module('config.mjs','export default '+JSON.stringify(config)+';\n')];
  const records=config.resources.map(record=>({...record,data:Buffer.from(bodies.get(record.key))})),totalBytes=modules.reduce((n,m)=>n+m.bytes,0);
  const report={schema:'zplay/m100-existing-host-build/v1',sourceCommit:config.sourceCommit,revision:config.revision,baseline,enabled:true,totalBytes,
    sourceCommitVerified:false,publicationReady:false,verifiedSourceFileCount:0,projectedWorkerBytes:baseline.totalBytes+totalBytes,
    modules:modules.map(({source,...pin})=>pin),records:config.resources.map(record=>({...record,file:'kv/'+record.sha256+'/'+record.name}))};
  try{
    await writeM100Release(destination,{config,modules,records,report});
    const loaded=await loadM100Release(destination);assert.deepEqual(loaded.config,config);assert.equal(loaded.records.length,23);assert.equal(loaded.report.publicationReady,false);
    const record=report.records[0],path=resolve(destination,record.file),original=await readFile(path);
    await writeFile(path,Buffer.from(original.map(n=>n^1)));await assert.rejects(()=>loadM100Release(destination),/RESOURCE_PIN_MISMATCH/);await writeFile(path,original);
    const workerPath=resolve(destination,MODULE_PREFIX,'worker.mjs');await writeFile(workerPath,modules[1].source+'// drift');
    await assert.rejects(()=>loadM100Release(destination),/MODULE_PIN_MISMATCH/);
    const bad=structuredClone(records[0]);bad.data[0]^=1;
    await assert.rejects(()=>writeM100Release(destination,{config,modules,records:[bad],report}),/RESOURCE_PIN_MISMATCH/);
  }finally{await rm(destination,{recursive:true,force:true});}
});
