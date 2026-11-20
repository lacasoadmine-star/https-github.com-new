import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildReleaseModules} from '../dedicated-resume/deployment/build-pins.mjs';
import {installDedicatedReleases} from '../dedicated-resume/deployment/handler.mjs';
import {createProductionHandler} from '../dedicated-resume/tests/fixtures/native72habesha3-routes.mjs';

const dir=new URL('./',import.meta.url);
const previous=new URL('../safari-r3/',import.meta.url);
const read=(name,base=dir)=>readFile(new URL(name,base),'utf8');
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
const manifest=JSON.parse(await read('release-manifest.json'));
const prior=JSON.parse(await read('release-manifest.json',previous));
test('Safari r4 retains the one existing Player route and references verified content only',()=>{
 assert.equal(manifest.release,'zplay-safari-20261120-r4');
 assert.equal(manifest.gameId,'fresh_safarisimba');
 assert.equal(manifest.accountPath,'/new74/037-safari-simba/');
 assert.match(manifest.htmlTemplate,/\{\{GAME\}\}/);
 assert.match(manifest.htmlTemplate,/\{\{PRESENTATION_GAME\}\}/);
 assert.match(manifest.htmlTemplate,/\/zplay-safari-20261120-r4\/startup\.mjs/);
 assert.doesNotMatch(manifest.htmlTemplate,/(?:play demo|mock wallet|fake balance)/i);
 const stylePath='/new74/037-safari-simba/style.css';
 const {[stylePath]:stylesheet,...dependencies}=manifest.externalDependencies;
 const {[stylePath]:priorStylesheet,...priorDependencies}=prior.externalDependencies;
 assert.deepEqual(dependencies,priorDependencies);
 assert.ok(manifest.htmlTemplate.includes(`href="${stylePath}"`));
 for(const path of [manifest.accountPath,manifest.accountPath.slice(0,-1)]){
  assert.equal(new URL(stylePath,'https://qa.invalid'+path).pathname,stylePath);
 }
 assert.equal(stylesheet.source,'public');
 assert.equal(stylesheet.size,4058);
 assert.match(stylesheet.sha256,/^[a-f0-9]{64}$/);
 assert.notEqual(stylesheet.sha256,priorStylesheet.sha256);
});
test('new Safari source exactly matches staged KV hashes and has no fake payout path',async()=>{
 for(const name of ['game.mjs','auto-start-policy.mjs']){
  const source=await read(name,previous),asset=manifest.assets[name];
  assert.equal(asset.size,Buffer.byteLength(source),name);
  assert.equal(asset.sha256,hash(source),name);
  assert.equal(asset.kvKey,'native72/'+manifest.release+'/'+asset.sha256);
  assert.doesNotMatch(source,/\b(?:Math\.random|localStorage\.balance)\b/);
 }
});
test('all relative game imports are listed in the immutable release and all pin hashes validate',async()=>{
 const source=await read('game.mjs',previous);
 const imports=[...source.matchAll(/from\s*['"](\.\/[\w.-]+)['"]/g)].map(x=>x[1].slice(2));
 assert.deepEqual(imports.sort(),['session.mjs','resume-sync.mjs','auto-start-policy.mjs','expansion.mjs'].sort());
 for(const name of ['startup.mjs','session.mjs','session-core.mjs','expansion.mjs','resume-sync.mjs','game.mjs','auto-start-policy.mjs']){
  const asset=manifest.assets[name];
  assert.ok(asset,name+' is missing');
  assert.match(asset.sha256,/^[0-9a-f]{64}$/);
  assert.match(asset.kvKey,/^native72\/[a-z0-9_-]+\/[0-9a-f]{64}$/);
  assert.ok(asset.kvKey.endsWith('/'+asset.sha256));
 }
 assert.deepEqual(manifest.assets['resume-sync.mjs'],prior.assets['resume-sync.mjs']);
});
test('the Worker 1 ETB minimum is reflected in Safari BET and AUTO, not simulated payouts',async()=>{
 const source=await read('game.mjs',previous);
 const policy=await read('auto-start-policy.mjs',previous);
 assert.match(source,/playableSafariBets\(h\.account\)/);
 assert.match(source,/for\(let e of playableSafariBets\(h\.account\)\)/);
 assert.match(source,/canStartSafariAuto/);
 assert.match(policy,/100n/);
 assert.doesNotMatch(policy,/api\/slots\/spin/);
});

test('the staged Safari wrapper serves its two launch URLs and delegates existing routes',async(t)=>{
 const stage=await mkdtemp(join(tmpdir(),'safari-r4-stage-'));
 t.after(()=>rm(stage,{recursive:true,force:true}));
 const checkpoint=new URL('../../releases/20261120-habesha-http/',dir);
 const shared=await read('shared-manifest.json',checkpoint);
 const habesha=await read('habesha-manifest.json',checkpoint);
 const multihot40=JSON.stringify({
  release:'zplay-multihot40-20261120-r3',gameId:'multihot40_native',accountPath:'/games/multihot40_native',
  htmlTemplate:'<body data-game="{{PRESENTATION_GAME}}" data-machine="{{GAME}}"></body>',
  assets:{'startup.mjs':manifest.assets['startup.mjs']},
 });
 const packages=[];
 for(const [name,source] of Object.entries({shared,habesha,multihot40})){
  const {release,gameId,accountPath}=JSON.parse(source),manifestSha256=hash(source);
  await writeFile(join(stage,name+'-manifest.json'),source);
  packages.push({name,release,gameId,accountPath,manifestSha256,manifestBytes:Buffer.byteLength(source),
   manifestKey:'native72/manifests/'+manifestSha256});
 }
 await writeFile(join(stage,'package-report.json'),JSON.stringify({packages,uploads:[]}));
 execFileSync(process.execPath,[fileURLToPath(new URL('stage-release.mjs',dir)),stage]);
 const output=join(stage,'worker');
 const inventory=await buildReleaseModules(stage,output);
 assert.equal(inventory.mainModule,'native72dedicatedsafarir4/entry.mjs');
 assert.equal(inventory.baselineEntry,'native72dedicatedmh40r3/entry.mjs');
 assert.equal(inventory.requiresLiveGameRelease,'zplay-multihot40-20261120-r3');
 assert.match(await readFile(join(output,'entry.mjs'),'utf8'),/from '\.\.\/native72dedicatedmh40r3\/entry\.mjs'/);
 const {releasePins}=await import(pathToFileURL(join(output,'release-pins.mjs')));
 assert.deepEqual(releasePins.games.map(pin=>pin.gameId),[manifest.gameId]);
 const worker=installDedicatedReleases({fetch:req=>new Response(new URL(req.url).pathname)},
  {...releasePins,createProductionHandler});
 const origin='https://fixture.invalid';
 const get=(path,method='GET')=>worker.fetch(new Request(origin+path,{method}),{PORTAL:'player'});
 for(const path of [manifest.accountPath,manifest.accountPath.slice(0,-1)]){
  const response=await get(path);
  assert.equal(response.headers.get('x-zplay-release'),manifest.release);
  assert.match(await response.text(),/href="\/new74\/037-safari-simba\/style\.css"/);
 }
 for(const path of ['/new74/037-safari-simba/style.css','/games/multihot40_native','/games/habesha_fortune_5_native','/api/slots/spin']){
  assert.equal(await (await get(path,path.startsWith('/api/')?'POST':'GET')).text(),path);
 }
});
