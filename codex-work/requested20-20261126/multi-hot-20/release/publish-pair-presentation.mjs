export async function verifyPairPresentation(cloudflare,accountId,expected){
 const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join(''),enc=new TextEncoder(),decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
 const v=(await cloudflare.request({method:'GET',path:'/accounts/'+accountId+'/workers/workers/superwin-player/versions/'+expected.id,query:{include:'modules'}})).result;
 if(v.id!==expected.id||v.number!==expected.number||v.main_module!==expected.mainModule||v.modules.length!==434||v.bindings.length!==18||v.migration_tag!=='local-demo-v1'||v.exports?.LocalDemoWallet?.storage!=='sqlite'||v.exports?.NativeGameResources?.storage!=='sqlite')throw Error('VERSION_METADATA_MISMATCH');
 const cfg=Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(k=>[k,k==='bindings'?[...(v[k]||[])].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0):['compatibility_flags','containers'].includes(k)?v[k]||[]:v[k]??null]));
 if(await hash(enc.encode(canonical(cfg)))!==expected.configurationSha256)throw Error('RUNTIME_CHANGED');
 const inventory=[];for(const m of v.modules){const b=decode(m.content_base64);inventory.push({name:m.name,bytes:b.length,sha256:await hash(b),contentType:m.content_type});}
 inventory.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
 if(new Set(inventory.map(x=>x.name)).size!==434||inventory.reduce((s,x)=>s+x.bytes,0)!==expected.totalBytes)throw Error('MODULE_INVENTORY_MISMATCH');
 for(const p of expected.replacementPins)if(canonical(inventory.find(x=>x.name===p.name))!==canonical(p))throw Error('OWNED_MODULE_PIN');
 const retained=inventory.filter(x=>!expected.replacementPins.some(p=>p.name===x.name));
 if(await hash(enc.encode(JSON.stringify(retained)))!==expected.retainedInventorySha256)throw Error('RETAINED_MODULE_CHANGED');
 for(const p of [...expected.resources,...(expected.mediaResources||[]),...(expected.nativeResources||[])]){const raw=await cloudflare.request({method:'GET',path:'/accounts/'+accountId+'/storage/kv/namespaces/361c2fbf17b747ae8b76fb0e9540555a/values/'+p.key}),b=typeof raw==='string'?enc.encode(raw):raw;if(b.length!==p.bytes||await hash(b)!==p.sha256)throw Error('RESOURCE_PIN '+p.name);}
 return {verified:true,verifiedAt:new Date().toISOString(),version:v.number,id:v.id,moduleCount:434,totalBytes:expected.totalBytes,retainedModuleCount:retained.length,runtimeSha256:expected.configurationSha256,immutableResourcePinsVerified:expected.resources.length+(expected.mediaResources?.length||0)+(expected.nativeResources?.length||0)};
}
/** One connector call owns the verification and activation sequence. A thrown
 * precheck cannot become an ignored MCP isError result before a later POST. */
export async function publishVerifiedPairPresentation(cloudflare,accountId,{staged,expectedDeploymentId}={}){
 const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
 if(staged?.schema!=='zplay/pair-presentation-staged/v1'||staged.activated!==false||staged.fullReadbackRequired!==true||
   !((staged.changedModules===3&&staged.retainedModules===431)||(staged.changedModules===4&&staged.retainedModules===430))||!uuid.test(staged.id||'')||!uuid.test(staged.baselineId||'')||
   !uuid.test(expectedDeploymentId||'')||!/^[a-f0-9]{40}$/.test(staged.sourceCommit||''))throw Error('PUBLISH_INPUT');
 const proof=await verifyPairPresentation(cloudflare,accountId,staged);
 const root='/accounts/'+accountId+'/workers';
 const current=async()=>(await cloudflare.request({method:'GET',path:root+'/scripts/superwin-player/deployments'})).result.deployments[0];
 const before=await current(),latest=(await cloudflare.request({method:'GET',path:root+'/workers/superwin-player/versions/latest'})).result;
 if(before.id!==expectedDeploymentId||before.versions.length!==1||before.versions[0].version_id!==staged.baselineId||
   before.versions[0].percentage!==100||latest.id!==staged.id)throw Error('PUBLISH_LEASE_CHANGED');
 const activation=await cloudflare.request({method:'POST',path:root+'/scripts/superwin-player/deployments',body:{strategy:'percentage',versions:[{version_id:staged.id,percentage:100}]}});
 if(activation.success!==true||!uuid.test(activation.result?.id||''))throw Error('ACTIVATION_NOT_ACKNOWLEDGED');
 const verified=await verifyPairPresentation(cloudflare,accountId,staged),after=await current();
 if(after.id!==activation.result.id||after.versions.length!==1||after.versions[0].version_id!==staged.id||after.versions[0].percentage!==100)throw Error('ACTUAL_TRAFFIC_CHANGED');
 return {preActivationReadback:proof,postActivationReadback:verified,deploymentId:after.id,trafficPercent:100,activated:true};
}

