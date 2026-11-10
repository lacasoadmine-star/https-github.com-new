export const PRESENTATION_WORKER='superwin-native-presentation';
const canon=value=>Array.isArray(value)?value.map(canon):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canon(value[k])])):value;
const settingsFingerprint=async value=>{
 const input={...value,bindings:[...(value.bindings||[])].sort((a,b)=>a.name.localeCompare(b.name))};
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canon(input))))),v=>v.toString(16).padStart(2,'0')).join('');
};
export async function addPresentationBinding({cloudflare,accountId,expectedEtag}){
 if(typeof expectedEtag!=='string'||!expectedEtag)throw Error('EXPLICIT_PLAYER_HEAD_REQUIRED');
 const root='/accounts/'+accountId+'/workers/scripts',path=root+'/superwin-player';
 const list=await cloudflare.request({method:'GET',path:root});
 if(!list.result.some(x=>x.id===PRESENTATION_WORKER))throw Error('PRESENTATION_CHILD_MUST_EXIST_FIRST');
 if(list.result.find(x=>x.id==='superwin-player')?.etag!==expectedEtag)throw Error('PLAYER_CHANGED_REVIEW_LATEST');
 const before=(await cloudflare.request({method:'GET',path:path+'/settings'})).result;
 const existing=before.bindings.find(b=>b.name==='NATIVE_PRESENTATION');
 if(existing){if(existing.type!=='service'||existing.service!==PRESENTATION_WORKER||existing.environment&&existing.environment!=='production')throw Error('PRESENTATION_BINDING_COLLISION');return {changed:false,binding:existing.name,settingsFingerprint:await settingsFingerprint(before)};}
 const bindings=before.bindings.map(binding=>({name:binding.name,type:'inherit'}));
 bindings.push({name:'NATIVE_PRESENTATION',type:'service',service:PRESENTATION_WORKER,environment:'production'});
 // The current settings API requires every already-provisioned DO class to
 // be declared. Derive its exact existing storage kind and never migrate it.
 const namespacesPath='/accounts/'+accountId+'/workers/durable_objects/namespaces';
 const namespaces=(await cloudflare.request({method:'GET',path:namespacesPath,query:{per_page:1000}})).result.filter(n=>n.script==='superwin-player');
 const exports={default:{type:'worker'}};
 for(const namespace of namespaces){
  if(typeof namespace.class!=='string'||typeof namespace.use_sqlite!=='boolean')throw Error('EXISTING_NAMESPACE_STORAGE_NOT_VERIFIED');
  exports[namespace.class]={type:'durable-object',storage:namespace.use_sqlite?'sqlite':'legacy-kv'};
 }
 for(const binding of before.bindings.filter(b=>b.type==='durable_object_namespace'&&!b.script_name))if(!namespaces.some(n=>n.id===binding.namespace_id&&n.class===binding.class_name))throw Error('EXISTING_DURABLE_BINDING_NOT_VERIFIED');
 const form=new FormData();form.append('settings',new Blob([JSON.stringify({bindings,exports})],{type:'application/json'}));
 const latest=await cloudflare.request({method:'GET',path:root});
 if(latest.result.find(x=>x.id==='superwin-player')?.etag!==expectedEtag)throw Error('PLAYER_CHANGED_DURING_BINDING_REVIEW');
 await cloudflare.request({method:'PATCH',path:path+'/settings',body:form});
 const after=(await cloudflare.request({method:'GET',path:path+'/settings'})).result;
 const added=after.bindings.find(b=>b.name==='NATIVE_PRESENTATION');
 if(added?.type!=='service'||added.service!==PRESENTATION_WORKER)throw Error('PRESENTATION_BINDING_NOT_APPLIED');
 const retained={...after,bindings:after.bindings.filter(b=>b.name!=='NATIVE_PRESENTATION')};
 const beforeHash=await settingsFingerprint(before),retainedHash=await settingsFingerprint(retained);
 if(beforeHash!==retainedHash)throw Error('RETAINED_PLAYER_SETTINGS_CHANGED');
 const afterNamespaces=(await cloudflare.request({method:'GET',path:namespacesPath,query:{per_page:1000}})).result.filter(n=>n.script==='superwin-player');
 const identity=list=>JSON.stringify(list.map(n=>({id:n.id,class:n.class,use_sqlite:n.use_sqlite})).sort((a,b)=>a.id.localeCompare(b.id)));
 if(identity(namespaces)!==identity(afterNamespaces))throw Error('EXISTING_NAMESPACE_IDENTITY_CHANGED');
 return {changed:true,binding:added.name,service:added.service,retainedBindingCount:before.bindings.length,retainedDurableNamespaceCount:namespaces.length,beforeFingerprint:beforeHash,retainedAfterFingerprint:retainedHash};
}
