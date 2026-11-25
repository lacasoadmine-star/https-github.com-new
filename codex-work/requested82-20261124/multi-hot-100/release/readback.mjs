/** Fresh connector call after staging: verify all retained/new bytes without
 * loading a second full Worker version into the same isolate. No activation.
 */
export async function verifyStagedM100Release(cloudflare,accountId,plan){
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
  const config=v=>Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(k=>[k,
    k==='bindings'?[...(v[k]||[])].sort((a,b)=>a.name.localeCompare(b.name)):
    ['compatibility_flags','containers'].includes(k)?v[k]||[]:v[k]??null]));
  if(!/^[a-f0-9]{64}$/.test(plan.configurationSha256||'')||!Array.isArray(plan.inventory)||
    plan.inventory.length!==plan.retainedModules+3||new Set(plan.inventory.map(x=>x.name)).size!==plan.inventory.length)throw Error('M100_READBACK_PLAN_INVALID');
  const root=`/accounts/${accountId}/workers`;
  const v=(await cloudflare.request({method:'GET',path:root+'/workers/superwin-player/versions/'+plan.id,query:{include:'modules'}})).result;
  if(v.id!==plan.id||v.main_module!==plan.mainModule||v.modules?.length!==plan.inventory.length||
    v.migration_tag!==undefined&&v.migration_tag!=='local-demo-v1'||v.exports?.LocalDemoWallet?.storage!=='sqlite'||
    v.exports?.NativeGameResources?.storage!=='sqlite')throw Error('M100_READBACK_METADATA_CHANGED');
  let totalBytes=0;
  for(const pin of plan.inventory){
    const m=v.modules.find(m=>m.name===pin.name);
    if(!m||m.content_type!==pin.contentType)throw Error('M100_READBACK_MODULE_MISMATCH');
    const raw=atob(m.content_base64),b=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);
    if(b.length!==pin.bytes||await hash(b)!==pin.sha256)throw Error('M100_READBACK_HASH_MISMATCH:'+pin.name);
    totalBytes+=b.length;
  }
  if(totalBytes!==plan.expectedBytes)throw Error('M100_READBACK_BYTES_MISMATCH');
  const configurationSha256=await hash(new TextEncoder().encode(canonical(config(v))));
  if(configurationSha256!==plan.configurationSha256)throw Error('M100_READBACK_CONFIGURATION_CHANGED');
  const d=(await cloudflare.request({method:'GET',path:root+'/scripts/superwin-player/deployments'})).result.deployments[0];
  if(d.versions.length!==1||d.versions[0].version_id!==plan.baselineId||d.versions[0].percentage!==100)throw Error('M100_READBACK_ACTIVE_CHANGED');
  return{schema:'zplay/m100-full-staged-readback/v1',sourceCommit:plan.sourceCommit,baselineVersion:plan.baselineId,
    stagedVersion:v.id,stagedNumber:v.number,mainModule:v.main_module,verifiedModules:v.modules.length,
    retainedModules:plan.retainedModules,addedModules:3,totalBytes,configurationSha256,
    allOriginalModulesByteIdentical:true,configurationUnchanged:true,durableObjectExportsUnchanged:true,
    stagedMigrationTag:v.migration_tag??null,activeMigrationTagMustBeVerified:'local-demo-v1',activeVersion:plan.baselineId,activated:false};
}
