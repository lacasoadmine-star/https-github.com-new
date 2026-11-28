import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {publishVerifiedPairPresentation} from './publish-pair-presentation.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
function fixture(){
 const names=['requested82m20r1/config.mjs','requested82m20r1/worker.mjs','requested82m100r1/config.mjs'];
 const id='d237db5b-ad05-4fbc-afc4-87544a15a58e',base='e0dcd1cb-151b-4824-93a0-7d441a9d0312',before='dfef0728-14ac-4ef5-b5ac-d61ab6769297',after='7ca1d869-63f3-4a6c-9da7-a1aa0b5b51c1';
 const modules=[...names,...Array.from({length:431},(_,i)=>'retained/'+i+'.mjs')].map((name,i)=>({name,content_type:'application/javascript+module',content_base64:Buffer.from('export const fixture='+i).toString('base64')}));
 const inventory=modules.map(m=>{const b=Buffer.from(m.content_base64,'base64');return {name:m.name,bytes:b.length,sha256:hash(b),contentType:m.content_type};}).sort((a,b)=>a.name.localeCompare(b.name));
 const v={id,number:483,main_module:'requested82pairr1/entry.mjs',modules,bindings:Array.from({length:18},(_,i)=>({name:'fixture'+String(i).padStart(2,'0'),type:'plain_text',text:'explicit isolated fixture'})),migration_tag:'local-demo-v1',exports:{LocalDemoWallet:{storage:'sqlite'},NativeGameResources:{storage:'sqlite'}},compatibility_flags:[],containers:[]};
 const cfg=Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(k=>[k,v[k]??null]));
 const resources=Array.from({length:4},(_,i)=>({key:'fixture-resource-'+i,bytes:7,sha256:hash('fixture')}));
 const staged={schema:'zplay/pair-presentation-staged/v1',sourceCommit:'a'.repeat(40),id,baselineId:base,number:483,mainModule:v.main_module,moduleCount:434,retainedModules:431,changedModules:3,activated:false,fullReadbackRequired:true,totalBytes:inventory.reduce((n,m)=>n+m.bytes,0),configurationSha256:hash(canonical(cfg)),retainedInventorySha256:hash(JSON.stringify(inventory.filter(m=>!names.includes(m.name)))),replacementPins:inventory.filter(m=>names.includes(m.name)),resources};
 const f={v,staged,posts:0,staleLease:false,corruptResource:false,activated:false};
 f.cloudflare={async request(r){
  if(r.method==='POST'){f.posts++;f.activated=true;return {success:true,result:{id:after}};}
  if(r.path.endsWith('/deployments'))return {result:{deployments:[{id:f.activated?after:f.staleLease?after:before,versions:[{version_id:f.activated?id:base,percentage:100}]}]}};
  if(r.path.endsWith('/latest'))return {result:{id}};
  if(r.path.includes('/versions/'))return {result:v};
  if(r.path.includes('/values/'))return f.corruptResource?'bad':'fixture';
  throw Error('Unexpected fixture endpoint');
 }};
 return {...f,get posts(){return f.posts;},set staleLease(value){f.staleLease=value;},set corruptResource(value){f.corruptResource=value;},expectedDeploymentId:before};
}
test('failed pre-activation metadata check cannot send the deployment POST',async()=>{
 const f=fixture();delete f.v.exports.NativeGameResources;
 await assert.rejects(publishVerifiedPairPresentation(f.cloudflare,'fixture-account',f),/VERSION_METADATA_MISMATCH/);assert.equal(f.posts,0);
});
test('corrupt retained module prevents activation',async()=>{
 const f=fixture();f.v.modules[20].content_base64=Buffer.from('changed').toString('base64');
 await assert.rejects(publishVerifiedPairPresentation(f.cloudflare,'fixture-account',f),/INVENTORY|RETAINED/);assert.equal(f.posts,0);
});
test('corrupt resource prevents activation',async()=>{
 const f=fixture();f.corruptResource=true;
 await assert.rejects(publishVerifiedPairPresentation(f.cloudflare,'fixture-account',f),/RESOURCE_PIN/);assert.equal(f.posts,0);
});
test('changed live lease prevents activation after a good readback',async()=>{
 const f=fixture();f.staleLease=true;
 await assert.rejects(publishVerifiedPairPresentation(f.cloudflare,'fixture-account',f),/LEASE_CHANGED/);assert.equal(f.posts,0);
});
test('successful publication verifies both sides and changes traffic once',async()=>{
 const f=fixture(),r=await publishVerifiedPairPresentation(f.cloudflare,'fixture-account',f);
 assert.equal(f.posts,1);assert.equal(r.preActivationReadback.verified,true);assert.equal(r.postActivationReadback.verified,true);assert.equal(r.trafficPercent,100);
});
