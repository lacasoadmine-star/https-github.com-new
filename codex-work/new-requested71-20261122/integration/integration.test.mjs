import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicCatalogue,renderCatalogueSection,renderCataloguePage} from './catalogue.mjs';
import {createAdditiveWorker} from './worker.mjs';
import {parseMultipart,partsFromVersion,sha256,verifyBaseline,makeAdditiveForm,entryModule,inheritedMetadata,MODULE_PREFIX,BASE_DEPLOYMENT_MODULES,PREVIEW_DEPLOYMENT_MODULES} from './additive-upload.mjs';

const registry=JSON.parse(await readFile(new URL('../registry.json',import.meta.url),'utf8'));
const catalogue=publicCatalogue(registry);
const assetRevision='a'.repeat(24);
const config={catalogue,clientSource:'export const test=1;',stylesheetSource:'body{}',assetRevision};

test('public catalogue preserves every exact name and ordinal from the current user continuation queue',async()=>{
  const queue=JSON.parse(await readFile(new URL('../../continue71-20261122/active-queue.json',import.meta.url),'utf8'));
  assert.equal(queue.active_queue_size,71);
  assert.deepEqual(catalogue.games.map(({ordinal,name})=>({ordinal,name})),queue.rows.map(({ordinal,requested_name})=>({ordinal,name:requested_name})));
});

test('the exact latest71 records are distinct and all unbuilt routes stay unlinked',()=>{
  assert.equal(catalogue.games.length,71);assert.equal(catalogue.readyCount,0);
  assert.equal(new Set(catalogue.games.map(game=>game.gameId)).size,71);
  assert(catalogue.games.every(game=>game.route===null&&game.status==='preparing'&&!game.playable));
  const html=renderCatalogueSection(catalogue);
  assert.equal((html.match(/new71-card/g)||[]).length,10);
  assert.equal((html.match(/new71-action/g)||[]).length,0);
  assert.equal(catalogue.games[0].previewRoute,'/new-games72/multi-hot-10/preview/');
  assert.equal((html.match(/class="new71-preview"/g)||[]).length,1);
  assert.match(html,/bet-ku ma furna/);
  assert(!html.includes('<img'));assert(!html.includes('<canvas'));assert(!html.includes('<video'));
  const full=renderCataloguePage(catalogue,'/new.css');
  assert.equal((full.match(/new71-card/g)||[]).length,71);
  for(const excluded of ['Multi Hot 5<','Foxy Hot 20','Habesha Fortune 5'])assert(!full.includes(excluded));
});

test('enabling a placeholder, alias, or incomplete financial integration cannot expose Play',()=>{
  const changed=structuredClone(registry);changed.publicActivation=true;
  changed.games[0].release={ready:true,enabled:true,liveVerified:true};
  assert.equal(publicCatalogue(changed).readyCount,0);
  const g=changed.games[0];g.identityReservedOnly=false;g.frontend.implemented=true;g.backend.enabled=true;
  g.assets.runtimeAssetsVerified=true;g.tests={implemented:true,passed:true,financialIntegrationVerified:true};
  g.reference.manualReferenceRounds=7;g.reference.freshEvidenceManifestPath='reference.json';g.reference.rulesSource='rules.json';
  assert.equal(publicCatalogue(changed).readyCount,1);
  g.duplicateOfRequestId='another';assert.equal(publicCatalogue(changed).readyCount,0);
  g.duplicateOfRequestId=null;g.tests.financialIntegrationVerified=false;assert.equal(publicCatalogue(changed).readyCount,0);
});

test('identity validation rejects old protected names, route collision, omitted records and unsafe routes',()=>{
  for(const modify of [r=>r.games[0].displayName='MultiHot5',r=>r.games[0].displayName='Foxy Hot 20',r=>r.games[0].displayName='HabeshaFortune5',r=>r.games[1].route=r.games[0].route,r=>r.games.pop(),r=>r.games[0].route='/existing-game/']){
    const changed=structuredClone(registry);modify(changed);assert.throws(()=>publicCatalogue(changed));
  }
});

test('unrelated routes, game HTML, sessions and methods pass through unchanged',async()=>{
  const original=new Response('existing',{status:201,headers:{'Content-Type':'text/html','Set-Cookie':'session=fixture'}});
  const calls=[];const scheduled=()=>{};const previous={scheduled,fetch(...args){calls.push(args);return original;}};
  const worker=createAdditiveWorker(previous,config);
  const env={},ctx={};const request=new Request('https://player.invalid/api/spin',{method:'POST',body:'fixture'});
  assert.equal(await worker.fetch(request,env,ctx),original);
  assert.deepEqual(calls,[[request,env,ctx]]);assert.equal(worker.scheduled,scheduled);
  for(const path of ['/new-games72/multi-hot-10/','/login','/agent','/assets/old.png'])assert.equal(await worker.fetch(new Request('https://player.invalid'+path),env,ctx),original);
});

test('new routes are readonly and no-store; immutable client assets have content-addressed paths',async()=>{
  const worker=createAdditiveWorker({fetch(){throw Error('UNEXPECTED_DELEGATION');}},config);
  const response=await worker.fetch(new Request('https://player.invalid/new-games71/catalogue.json'));
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal((await response.json()).readyCount,0);
  const post=await worker.fetch(new Request('https://player.invalid/new-games71/',{method:'POST',body:'x'}));
  assert.equal(post.status,405);
  const head=await worker.fetch(new Request('https://player.invalid/new-games71/',{method:'HEAD'}));assert.equal(await head.text(),'');
  const js=await worker.fetch(new Request(`https://player.invalid/_zplay/new71/${assetRevision}/new-section.mjs`));
  assert.match(js.headers.get('Cache-Control'),/immutable/);
});

test('root HTML adds only own loader and drops obsolete validators without losing session headers',async()=>{
  let injected='';
  class Rewriter {on(selector,handler){assert.equal(selector,'head');handler.element({append(html){injected+=html;}});return this;}transform(response){return response;}}
  const original=new Response('<html><head></head><body><main>existing</main></body></html>',{headers:{'Content-Type':'text/html','ETag':'old','Last-Modified':'yesterday','Set-Cookie':'session=fixture','X-Old':'retained'}});
  const worker=createAdditiveWorker({fetch(){return original;}},config,Rewriter);
  const result=await worker.fetch(new Request('https://player.invalid/'));
  assert.equal(result.headers.get('etag'),null);assert.equal(result.headers.get('last-modified'),null);
  assert.equal(result.headers.get('set-cookie'),'session=fixture');assert.equal(result.headers.get('x-old'),'retained');
  assert.match(injected,/new71\/[a-f0-9]{24}\/new-section\.mjs/);
  assert.equal(await result.text(),'<html><head></head><body><main>existing</main></body></html>');
});

test('multipart preservation keeps binary bytes and rejects changes or module replacement',async()=>{
  const form=new FormData();const payload=new Uint8Array([0,255,13,10,198,128,4]);
  form.append('existing.bin',new Blob([payload],{type:'application/octet-stream'}),'existing.bin');
  const source='export default {};';form.append('old/entry.mjs',new Blob([source],{type:'application/javascript+module'}),'old/entry.mjs');
  const request=new Request('https://upload.invalid',{method:'POST',body:form});
  const parts=parseMultipart(await request.arrayBuffer());assert.deepEqual(parts.get('existing.bin').bytes,payload);
  const inventory=await Promise.all([...parts].map(async([name,p])=>({name,bytes:p.bytes.length,contentType:p.contentType,sha256:await sha256(p.bytes)})));
  assert.equal(await verifyBaseline(parts,inventory),true);
  const modules=await Promise.all(['entry.mjs','catalogue.mjs','worker.mjs','worker-assets.mjs'].map(async name=>({name:MODULE_PREFIX+name,source,bytes:new TextEncoder().encode(source).length,sha256:await sha256(new TextEncoder().encode(source))})));
  const uploaded=await makeAdditiveForm(parts,inventory,modules,{main_module:MODULE_PREFIX+'entry.mjs'});
  assert.deepEqual(new Uint8Array(await uploaded.get('existing.bin').arrayBuffer()),payload);
  assert.equal(await uploaded.get('old/entry.mjs').text(),source);
  const previewModules=await Promise.all(['preview-worker.mjs','preview-manifest.mjs'].map(async name=>({name:MODULE_PREFIX+name,source,bytes:new TextEncoder().encode(source).length,sha256:await sha256(new TextEncoder().encode(source))})));
  const previewUpload=await makeAdditiveForm(parts,inventory,[...modules,...previewModules],{main_module:MODULE_PREFIX+'entry.mjs'});
  assert.equal(await previewUpload.get(MODULE_PREFIX+'preview-worker.mjs').text(),source);
  assert.deepEqual(new Uint8Array(await previewUpload.get('existing.bin').arrayBuffer()),payload);
  await assert.rejects(()=>makeAdditiveForm(parts,inventory,[...modules,previewModules[0]],{main_module:MODULE_PREFIX+'entry.mjs'}),/NEW_MODULE_SET_INVALID/);
  await assert.rejects(()=>makeAdditiveForm(parts,inventory,[...modules,...previewModules,{...previewModules[0],name:MODULE_PREFIX+'unreviewed.mjs'}],{main_module:MODULE_PREFIX+'entry.mjs'}),/NEW_MODULE_SET_INVALID/);
  parts.get('existing.bin').bytes[0]=1;await assert.rejects(()=>makeAdditiveForm(parts,inventory,modules,{main_module:MODULE_PREFIX+'entry.mjs'}),/BASELINE_MODULE_CHANGED/);
});

test('entry generation explicitly names active entry; metadata inherits config and never values',()=>{
  const entry=entryModule('active/entry.mjs');
  assert.match(entry,/\.\.\/active\/entry\.mjs/);
  const bindings=Array.from({length:18},(_,index)=>({name:index===0?'NATIVE_LIBRARY_ASSETS':'B'+index,type:index===0?'assets':'secret_text',text:'must-not-copy'}));
  const assets={html_handling:'none',not_found_handling:'none',run_worker_first:true,base_path:'/'};
  const version={id:'active',assets:{config:assets},resources:{bindings,script_runtime:{compatibility_date:'2026-10-01',usage_model:'standard',exports:{LocalDemoWallet:{type:'durable-object',storage:'sqlite'},NativeGameResources:{type:'durable-object',storage:'sqlite'},default:{type:'worker'}}}}};
  const metadata=inheritedMetadata(version,{expectedActiveVersion:'active',activeMainModule:'old/entry.mjs',downloadInventory:[{name:'old/entry.mjs'}],commitSha:'a'.repeat(40),message:'Add NEW71 catalogue'});
  assert(metadata.keep_assets);assert.equal(metadata.bindings.length,18);assert(metadata.bindings.every(binding=>binding.type==='inherit'));
  assert(!JSON.stringify(metadata).includes('must-not-copy'));assert.equal(metadata.exports.LocalDemoWallet.storage,'sqlite');
  assert.deepEqual(metadata.assets.config,assets);
  assert.throws(()=>inheritedMetadata(version,{expectedActiveVersion:'other',activeMainModule:'old/entry.mjs',downloadInventory:[{name:'old/entry.mjs'}],commitSha:'a'.repeat(40)}),/ACTIVE_BASELINE_NOT_PROVEN/);
});

test('version-specific API modules preserve exact binary content and expose their actual entry',()=>{
  const payload=new Uint8Array([0,255,42,198,128]);
  const version={id:'pinned',main_module:'actual/entry.mjs',modules:[{name:'asset.bin',content_type:'application/octet-stream',content_base64:Buffer.from(payload).toString('base64')},{name:'actual/entry.mjs',content_type:'application/javascript+module',content_base64:Buffer.from('export default {};').toString('base64')}]};
  const parts=partsFromVersion(version);assert.deepEqual(parts.get('asset.bin').bytes,payload);
  assert.equal(new TextDecoder().decode(parts.get('actual/entry.mjs').bytes),'export default {};');
  assert.throws(()=>partsFromVersion({...version,main_module:'missing.mjs'}),/VERSION_MAIN_MODULE_MISSING/);
});

test('composed preview upload preserves all 405 baseline modules and exactly 18 inherited bindings',async()=>{
  const parts=new Map();
  for(let index=0;index<405;index++){
    const name=index===0?'active/entry.mjs':`retained/module-${index}.${index%2?'bin':'mjs'}`;
    const bytes=new Uint8Array([index&255,255,0,13,10,198,128,(index>>8)&255]);
    parts.set(name,{bytes,contentType:index%2?'application/octet-stream':'application/javascript+module'});
  }
  const inventory=await Promise.all([...parts].map(async([name,part])=>({name,bytes:part.bytes.length,sha256:await sha256(part.bytes),contentType:part.contentType})));
  const version={id:'active',main_module:'active/entry.mjs',assets:{config:{html_handling:'none',not_found_handling:'none',run_worker_first:true,base_path:'/'}},
    resources:{bindings:Array.from({length:18},(_,index)=>({name:index?'B'+index:'NATIVE_LIBRARY_ASSETS',type:index?'secret_text':'assets',text:'do-not-publish-binding-values'})),
      script_runtime:{compatibility_date:'2026-10-01',compatibility_flags:['nodejs_compat'],usage_model:'standard',exports:{LocalDemoWallet:{type:'durable-object',storage:'sqlite'},NativeGameResources:{type:'durable-object',storage:'sqlite'},default:{type:'worker'}}}}};
  const metadata=inheritedMetadata(version,{expectedActiveVersion:'active',activeMainModule:'active/entry.mjs',downloadInventory:inventory,commitSha:'b'.repeat(40),message:'Add reviewed NEW71 catalogue and M10 visual preview'});
  const names=[...BASE_DEPLOYMENT_MODULES,...PREVIEW_DEPLOYMENT_MODULES];
  const additions=await Promise.all(names.map(async name=>{
    const source=`export default ${JSON.stringify(name)};\n`,bytes=new TextEncoder().encode(source);
    return {name,source,bytes:bytes.length,sha256:await sha256(bytes)};
  }));
  const form=await makeAdditiveForm(parts,inventory,additions,metadata);
  assert.equal([...form.keys()].length,412);
  const uploadedMetadata=JSON.parse(await form.get('metadata').text());
  assert.deepEqual(uploadedMetadata.bindings,version.resources.bindings.map(({name})=>({name,type:'inherit'})));
  assert.deepEqual(uploadedMetadata.compatibility_flags,['nodejs_compat']);
  assert.deepEqual(uploadedMetadata.exports,version.resources.script_runtime.exports);
  assert.deepEqual(uploadedMetadata.assets,version.assets);
  assert.equal(uploadedMetadata.keep_assets,true);
  assert.doesNotMatch(JSON.stringify(uploadedMetadata),/do-not-publish-binding-values/);
  for(const [name,part] of parts){
    const uploaded=form.get(name);
    assert.equal(uploaded.type,part.contentType);
    assert.deepEqual(new Uint8Array(await uploaded.arrayBuffer()),part.bytes);
  }
  const roundtrip=parseMultipart(await new Request('https://upload.invalid',{method:'POST',body:form}).arrayBuffer());
  const recovered=new Map(inventory.map(({name})=>[name,roundtrip.get(name)]));
  assert.equal(await verifyBaseline(recovered,inventory),true);
  assert.deepEqual([...roundtrip.keys()].filter(name=>name.startsWith(MODULE_PREFIX)).sort(),names.sort());
  for(const omitted of PREVIEW_DEPLOYMENT_MODULES){
    await assert.rejects(()=>makeAdditiveForm(parts,inventory,additions.filter(item=>item.name!==omitted),metadata),/NEW_MODULE_SET_INVALID/);
  }
  const changed=additions.map(item=>({...item}));changed.at(-1).source+='changed';
  await assert.rejects(()=>makeAdditiveForm(parts,inventory,changed,metadata),/NEW_MODULE_PIN_MISMATCH/);
});
