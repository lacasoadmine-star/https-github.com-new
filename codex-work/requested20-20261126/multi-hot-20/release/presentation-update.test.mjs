import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createM20PresentationPlan,stageM20PresentationUpdate} from './presentation-update.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex'),enc=new TextEncoder();
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const config=v=>Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(k=>[k,
  k==='bindings'?[...(v[k]||[])].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0):['compatibility_flags','containers'].includes(k)?v[k]||[]:v[k]??null]));
const pin=(name,source)=>({name,source,bytes:Buffer.byteLength(source),sha256:hash(source),contentType:'application/javascript+module'});
const compact=module=>({name:module.name,bytes:Buffer.from(module.content_base64,'base64').length,sha256:hash(Buffer.from(module.content_base64,'base64')),contentType:module.content_type});
const id='aebb5b8b-4aa7-4d2d-8cbb-77a4de2e482e',deploymentId='493395b0-82ed-47a2-b972-0add3513dd86';
const prefix='requested82m20r1/',candidate='requested20m20r2/';
async function fixture(){
  const previousAppPath='/_zplay/new90-m20/'+('a'.repeat(24))+'/app.'+('b'.repeat(64))+'.mjs';
  const previousStylePath='/_zplay/new90-m20/'+('a'.repeat(24))+'/style.'+('c'.repeat(64))+'.css';
  const entry='import previous from "../new90m20r1/entry.mjs"; export default previous;\n';
  const original=[pin(prefix+'entry.mjs',entry),pin(prefix+'config.mjs','export default {retained:true};\n'),pin(prefix+'worker.mjs','export const retained=true;\n'),pin('requested82pairr1/entry.mjs','export default {};\n')];
  for(let i=0;i<430;i++)original.push(pin('retained/'+String(i).padStart(3,'0')+'.mjs','export const value='+i+';\n'));
  const old={id,number:479,main_module:'requested82pairr1/entry.mjs',migration_tag:'local-demo-v1',assets:{binding:'NATIVE_LIBRARY_ASSETS'},compatibility_date:'2026-10-01',compatibility_flags:[],exports:{LocalDemoWallet:{storage:'sqlite'},NativeGameResources:{storage:'sqlite'},default:{}},
    bindings:[{name:'SSG_OFFICIAL_REFERENCES',type:'kv_namespace',namespace_id:'fixture-kv'},...Array.from({length:17},(_,i)=>({name:'B'+i,type:'plain_text',text:'retained-value-'+i}))],
    modules:original.map(p=>({name:p.name,content_type:p.contentType,content_base64:Buffer.from(p.source).toString('base64')}))};
  const inventory=old.modules.map(compact).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  const app='export const fixtureApp=true;\n',css='.m20-scene{margin-inline:auto}\n',appSha256=hash(app),styleSha256=hash(css);
  const buildConfig={baselineRevision:'a'.repeat(24),previousAppPath,previousStylePath,appSha256,appBytes:app.length,appPath:`/_zplay/requested82-m20/${appSha256}/app.mjs`,appKey:`requested82/m20/recovery/${appSha256}/app.mjs`,styleSha256,styleBytes:css.length,stylePath:`/_zplay/requested82-m20/${styleSha256}/style.css`,styleKey:`requested82/m20/recovery/${styleSha256}/style.css`};
  const build={config:buildConfig,report:{schema:'zplay/m20-accepted-presentation-recovery-build/v1',sourceCommit:'d'.repeat(40),stylesChanged:true,oldMediaUnchanged:true,financialRequestsChanged:false,backendGameId:'fresh_multihot20'},
    modules:[pin(candidate+'entry.mjs',entry),pin(candidate+'config.mjs','export default '+JSON.stringify(buildConfig)+';\n'),pin(candidate+'worker.mjs','export const currentPresentation=true;\n')],
    staticFiles:[{name:'app.mjs',key:buildConfig.appKey,source:app,bytes:app.length,sha256:appSha256},{name:'style.css',key:buildConfig.styleKey,source:css,bytes:css.length,sha256:styleSha256}]};
  const baseline={id,number:479,mainModule:old.main_module,moduleCount:old.modules.length,totalBytes:inventory.reduce((n,m)=>n+m.bytes,0),inventorySha256:hash(JSON.stringify(inventory)),configurationSha256:hash(canonical(config(old))),entrySha256:hash(entry),ownedPins:inventory.filter(m=>[prefix+'config.mjs',prefix+'worker.mjs'].includes(m.name)),previousAppPath,previousStylePath,baselineRevision:'a'.repeat(24)};
  const plan=await createM20PresentationPlan({build,baseline,deploymentId});
  const resources=new Map(build.staticFiles.map(f=>[f.key,f.source])),requests=[];let patch=null,deploymentReads=0,latestReads=0;
  const state={old,build,baseline,plan,resources,requests,get patch(){return patch;},changeDeployment:false,changeLatest:false};
  state.cloudflare={async request(request){requests.push(request);
    if(request.path.endsWith('/deployments')){deploymentReads++;return {result:{deployments:[{id:state.changeDeployment&&deploymentReads>1?'f'.repeat(36):deploymentId,versions:[{version_id:id,percentage:100}]}]}};}
    if(request.method==='PATCH'){patch=request;return {result:{id:'new-staged-version',number:480}};}
    if(request.path.endsWith('/versions/latest')){latestReads++;return {result:{...old,modules:undefined,id:state.changeLatest&&latestReads>1?'new-other-version':id}};}
    if(request.path.endsWith('/versions/'+id))return {result:structuredClone(old)};
    const marker='/values/',index=request.path.indexOf(marker);
    if(index>=0)return resources.get(request.path.slice(index+marker.length));
    throw Error('Unexpected fake endpoint '+request.path);
  }};
  return state;
}

test('local preparation maps only the two owned modules and binds both immutable resources',async()=>{
  const f=await fixture();assert.deepEqual(f.plan.replacements.map(r=>r.name),[prefix+'config.mjs',prefix+'worker.mjs']);
  assert.equal(f.plan.baseline.entrySha256,f.baseline.entrySha256);assert.deepEqual(f.plan.resources.map(r=>r.name),['app.mjs','style.css']);
  const wrongEntry=structuredClone(f.build);wrongEntry.modules[0]=pin(candidate+'entry.mjs','export default "wrong chain";');
  await assert.rejects(createM20PresentationPlan({build:wrongEntry,baseline:f.baseline,deploymentId}),/ENTRY_CHANGED/);
  const corrupt=structuredClone(f.build);corrupt.staticFiles[1].source+='altered';
  await assert.rejects(createM20PresentationPlan({build:corrupt,baseline:f.baseline,deploymentId}),/BUILD_RESOURCE/);
  const unpinned=structuredClone(f.build);unpinned.report.sourceCommit=null;
  await assert.rejects(createM20PresentationPlan({build:unpinned,baseline:f.baseline,deploymentId}),/PRESENTATION_BUILD/);
});

test('staging changes exactly two module bodies and retains main, settings, all other modules and old keys',async()=>{
  const f=await fixture(),before=structuredClone(f.old),result=await stageM20PresentationUpdate(f.cloudflare,'fixture-account',f.plan);
  assert.equal(result.activated,false);assert.equal(result.fullReadbackRequired,true);assert.equal(result.changedModules,2);assert.equal(result.retainedModules,432);
  assert.equal(f.patch.query.deploy,false);assert.equal(f.patch.body.main_module,before.main_module);assert.equal(f.patch.body.modules.length,434);
  const changed=f.patch.body.modules.filter((module,i)=>module.content_base64!==before.modules[i].content_base64).map(m=>m.name);
  assert.deepEqual(changed,[prefix+'config.mjs',prefix+'worker.mjs']);
  for(const module of f.patch.body.modules)if(!changed.includes(module.name))assert.deepEqual(module,before.modules.find(m=>m.name===module.name));
  assert.deepEqual(f.old,before);assert.deepEqual(Object.keys(f.patch.body).sort(),['annotations','main_module','modules']);
  assert.equal(f.requests.filter(r=>r.method!=='GET'&&r.method!=='PATCH').length,0);
  assert.equal(f.requests.filter(r=>r.path.includes('/values/')).length,2);
});

for(const name of ['missing-app','corrupt-app','missing-css','corrupt-css','stale-deployment','stale-latest','old-hash','new-hash','unrelated-target','old-module-drift','runtime-drift','over-budget'])test(name+' fails before any PATCH',async()=>{
  const f=await fixture();
  if(name.startsWith('missing-'))f.resources.delete(f.plan.resources[name.endsWith('app')?0:1].key);
  if(name.startsWith('corrupt-'))f.resources.set(f.plan.resources[name.endsWith('app')?0:1].key,'corrupted bytes');
  if(name==='stale-deployment')f.changeDeployment=true;
  if(name==='stale-latest')f.changeLatest=true;
  if(name==='old-hash')f.plan.replacements[0].previous.sha256='0'.repeat(64);
  if(name==='new-hash')f.plan.replacements[0].source+='changed';
  if(name==='unrelated-target')f.plan.replacements[1].name='retained/001.mjs';
  if(name==='old-module-drift')f.old.modules[10].content_base64=Buffer.from('drift').toString('base64');
  if(name==='runtime-drift')f.old.bindings[1].text='changed';
  if(name==='over-budget'){
    const value='x'.repeat(66968590-f.baseline.totalBytes);
    f.old.modules[10].content_base64=Buffer.from(value).toString('base64');
    const inventory=f.old.modules.map(compact).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
    f.plan.baseline.totalBytes=inventory.reduce((n,m)=>n+m.bytes,0);f.plan.baseline.inventorySha256=hash(JSON.stringify(inventory));
    const source=f.plan.replacements[0].source+'x'.repeat(1000);Object.assign(f.plan.replacements[0],{source,bytes:source.length,sha256:hash(source)});
  }
  await assert.rejects(stageM20PresentationUpdate(f.cloudflare,'fixture-account',f.plan));assert.equal(f.patch,null);
});
