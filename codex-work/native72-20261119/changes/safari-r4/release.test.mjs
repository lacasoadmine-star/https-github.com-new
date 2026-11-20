import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

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
