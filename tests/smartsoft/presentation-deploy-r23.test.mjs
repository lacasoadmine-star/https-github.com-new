import test from 'node:test';
import assert from 'node:assert/strict';
import {addPresentationBinding,PRESENTATION_WORKER} from '../../deploy/smartsoft/presentation-deploy-r23.mjs';
function fixture({child=true,head='head',collision=false}={}){
 let settings={compatibility_date:'2026-10-01',compatibility_flags:['nodejs_compat'],bindings:[{name:'PORTAL',type:'plain_text',text:'player'},{name:'SECRET',type:'secret_text'},{name:'ART',type:'assets'},{name:'WALLETS',type:'durable_object_namespace',class_name:'LocalDemoWallet',namespace_id:'retained-id'}]};
 if(collision)settings.bindings.push({name:'NATIVE_PRESENTATION',type:'service',service:'another-worker'});
 let writes=0,payload;
 const cloudflare={async request(request){
  if(request.method==='GET'&&request.path.endsWith('/scripts'))return {result:[{id:'superwin-player',etag:head},...(child?[{id:PRESENTATION_WORKER}]:[])]};
  if(request.method==='GET'&&request.path.endsWith('/namespaces'))return {result:[{id:'retained-id',script:'superwin-player',class:'LocalDemoWallet',use_sqlite:true}]};
  if(request.method==='GET')return {result:structuredClone(settings)};
  assert.equal(request.method,'PATCH');writes++;payload=JSON.parse(await request.body.get('settings').text());
  assert.deepEqual(Object.keys(payload),['bindings','exports']);assert.deepEqual(payload.exports.LocalDemoWallet,{type:'durable-object',storage:'sqlite'});
  settings={...settings,bindings:payload.bindings.map(b=>b.type==='inherit'?settings.bindings.find(old=>old.name===b.name):b)};
  return {success:true};
 }};
 return {cloudflare,get writes(){return writes},get payload(){return payload}};
}
test('a new service binding inherits every prior asset, secret and wallet binding',async()=>{
 const f=fixture(),result=await addPresentationBinding({cloudflare:f.cloudflare,accountId:'account',expectedEtag:'head'});
 assert.equal(result.changed,true);assert.equal(f.writes,1);assert.equal(result.beforeFingerprint,result.retainedAfterFingerprint);
 assert.equal(result.retainedDurableNamespaceCount,1);
 assert.ok(f.payload.bindings.slice(0,-1).every(b=>b.type==='inherit'&&Object.keys(b).length===2));
 assert.equal(f.payload.bindings.at(-1).service,PRESENTATION_WORKER);
 const again=await addPresentationBinding({cloudflare:f.cloudflare,accountId:'account',expectedEtag:'head'});
 assert.equal(again.changed,false);assert.equal(f.writes,1);
});
test('missing child, stale parent or an existing unrelated binding stop before mutation',async()=>{
 for(const options of [{child:false},{head:'changed'},{collision:true}]){
  const f=fixture(options);await assert.rejects(addPresentationBinding({cloudflare:f.cloudflare,accountId:'account',expectedEtag:'head'}));assert.equal(f.writes,0);
 }
});
