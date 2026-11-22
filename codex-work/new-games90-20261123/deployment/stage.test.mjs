import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deploymentPlan,executeStage,stageCode} from './stage.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const commit='a'.repeat(40);
const module=(name,source)=>({name,source,bytes:Buffer.byteLength(source),sha256:sha(source),contentType:'application/javascript+module'});
const encoded=m=>({name:m.name,content_type:m.contentType,content_base64:Buffer.from(m.source).toString('base64')});
function fixture() {
  const old=[module('old/entry.mjs','export default {fetch(){return new Response("legacy")}};'),module('old/ledger.mjs','export const identity="preserved";')];
  const baseline={id:'11111111-1111-4111-8111-111111111111',number:468,main_module:'old/entry.mjs',moduleCount:2,totalBytes:old.reduce((s,m)=>s+m.bytes,0),inventory:old.map(({name,bytes,sha256,contentType})=>({name,bytes,sha256,contentType}))};
  const modules=['entry.mjs','public.mjs','worker.mjs','worker-assets.mjs'].map(name=>module('newrequested90r1/'+name,'export default '+JSON.stringify(name)+';'));
  const build={modules,report:{sourceCommit:commit,requestedCount:90,activeMainModule:baseline.main_module,totalBytes:modules.reduce((s,m)=>s+m.bytes,0)}};
  const plan=deploymentPlan({baseline,build,sourceCommit:commit});
  let before={id:baseline.id,number:468,main_module:baseline.main_module,modules:old.map(encoded),bindings:Array.from({length:18},(_,i)=>({name:'binding'+i,type:i?'service':'secret_text',...(i?{service:'retained-'+i}:{})})),
    exports:{LocalDemoWallet:{type:'durable-object',storage:'sqlite'},NativeGameResources:{type:'durable-object',storage:'sqlite'},default:{type:'worker'}},
    migration_tag:'local-demo-v1',compatibility_date:'2026-10-01',assets:{config:{html_handling:'none',not_found_handling:'none',run_worker_first:true,base_path:'/'}},usage_model:'standard'};
  let active={id:'active-deployment',versions:[{version_id:baseline.id,percentage:100}]},after;
  const requests=[];
  const cloudflare={async request(request){requests.push(request);
    if(request.path.endsWith('/deployments'))return{result:{deployments:[structuredClone(active)]}};
    if(request.method==='PATCH'){
      after={...structuredClone(before),...structuredClone(request.body),id:'22222222-2222-4222-8222-222222222222',number:469};
      delete after.migration_tag;
      return{result:{id:after.id}};
    }
    return{result:structuredClone(request.path.endsWith('/latest')?before:after)};
  }};
  return{old,baseline,build,plan,cloudflare,requests,changeBefore(fn){fn(before);},changeActive(fn){fn(active);},changeAfter(fn){const original=cloudflare.request.bind(cloudflare);cloudflare.request=async q=>{const r=await original(q);if(q.method==='GET'&&!q.path.endsWith('/latest')&&!q.path.endsWith('/deployments'))fn(r.result);return r;};}};
}

test('a verified plan adds four pinned modules without exposing source in its receipt',async()=>{
  const f=fixture(),result=await executeStage(f.cloudflare,'account',f.plan);
  assert.equal(result.activated,false);assert.equal(result.allOriginalModulesByteIdentical,true);assert.equal(result.configurationUnchanged,true);
  assert.equal(result.retainedModules,2);assert.equal(result.verifiedModules,6);
  const mutations=f.requests.filter(q=>q.method!=='GET');assert.equal(mutations.length,1);
  assert.equal(mutations[0].method,'PATCH');assert.deepEqual(mutations[0].query,{deploy:false});
  assert.equal(mutations[0].contentType,'application/merge-patch+json');
  for(const field of ['bindings','env','exports','migrations','assets','compatibility_date'])assert.equal(Object.hasOwn(mutations[0].body,field),false,field+' inherited');
  assert.deepEqual(mutations[0].body.modules.slice(0,2),f.old.map(encoded));
  assert.doesNotMatch(JSON.stringify(result),/content_base64|export default|binding0|retained-1/);
});
test('the remote function is self contained in its service execution scope',async()=>{
  const f=fixture(),run=new Function('cloudflare','accountId','return ('+stageCode(f.plan)+')()');
  assert.equal((await run(f.cloudflare,'account')).verifiedModules,6);
});
test('a changed active version or traffic split cannot stage any source',async()=>{
  for(const change of [v=>v.versions[0].version_id='other',v=>v.versions[0].percentage=50]){
    const f=fixture();f.changeActive(change);await assert.rejects(executeStage(f.cloudflare,'account',f.plan),/ACTIVE_VERSION_CHANGED/);
    assert.equal(f.requests.some(q=>q.method!=='GET'),false);
  }
});
test('an independently staged latest version cannot be overwritten',async()=>{
  const f=fixture();f.changeBefore(v=>v.id='different');await assert.rejects(executeStage(f.cloudflare,'account',f.plan),/LATEST_VERSION_CHANGED/);
  assert.equal(f.requests.some(q=>q.method!=='GET'),false);
});
test('a mutated retained byte, content type, module name or count aborts before staging',async()=>{
  for(const change of [v=>v.modules[1].content_base64=Buffer.from('changed').toString('base64'),v=>v.modules[1].content_type='text/plain',v=>v.modules[1].name='wrong.mjs',v=>v.modules.pop()]){
    const f=fixture();f.changeBefore(change);await assert.rejects(executeStage(f.cloudflare,'account',f.plan),/RETAINED_MODULE_CHANGED|MODULE_COUNT_CHANGED/);
    assert.equal(f.requests.some(q=>q.method!=='GET'),false);
  }
});
test('staged config or retained-body corruption is rejected without activating',async()=>{
  for(const change of [v=>v.bindings[1].service='wrong-service',v=>v.assets.config.run_worker_first=false,v=>v.modules[0].content_base64=Buffer.from('changed').toString('base64'),v=>v.migration_tag='wrong']){
    const f=fixture();f.changeAfter(change);await assert.rejects(executeStage(f.cloudflare,'account',f.plan),/STAGED_CONFIG_CHANGED|RETAINED_MODULE_CHANGED/);
    assert.equal(f.requests.some(q=>q.path.endsWith('/deployments')&&q.method!=='GET'),false);
  }
});
test('unpublished commit identity, altered modules, duplicate names and size limit fail locally',()=>{
  const f=fixture();
  assert.throws(()=>deploymentPlan({baseline:f.baseline,build:f.build,sourceCommit:'b'.repeat(40)}),/UNVERIFIED/);
  const changed=structuredClone(f.build);changed.modules[0].source+=' ';
  assert.throws(()=>deploymentPlan({baseline:f.baseline,build:changed,sourceCommit:commit}),/PIN_CHANGED/);
  const duplicate=structuredClone(f.build);duplicate.modules[1]=duplicate.modules[0];
  assert.throws(()=>deploymentPlan({baseline:f.baseline,build:duplicate,sourceCommit:commit}),/UNVERIFIED/);
  assert.throws(()=>deploymentPlan({baseline:{...f.baseline,totalBytes:64*1024*1024},build:f.build,sourceCommit:commit}),/SIZE_LIMIT/);
});
