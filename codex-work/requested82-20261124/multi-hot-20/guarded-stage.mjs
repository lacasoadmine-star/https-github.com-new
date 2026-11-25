/** Runs inside the authenticated Cloudflare connector. No credentials or old
 * Worker source leave that service. This stages code only; activation is separate.
 */
export async function stageM20Recovery(cloudflare,accountId,plan) {
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
  const config=v=>Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(k=>[k,
    k==='bindings'?[...(v[k]||[])].sort((a,b)=>a.name.localeCompare(b.name)):
    ['compatibility_flags','containers'].includes(k)?v[k]||[]:v[k]??null]));
  const root=`/accounts/${accountId}/workers`,path=root+'/workers/superwin-player/versions/';
  if(plan?.schema!=='zplay/m20-guarded-stage/v1'||!/^[a-f0-9]{40}$/.test(plan.sourceCommit||'')||
    plan.mainModule!=='requested82m20r1/entry.mjs'||plan.modules?.length!==3||
    !['entry.mjs','config.mjs','worker.mjs'].every(name=>plan.modules.some(m=>m.name==='requested82m20r1/'+name))||
    !Array.isArray(plan.baseline?.inventory)||plan.baseline.inventory.length!==plan.baseline.moduleCount||
    new Set(plan.baseline.inventory.map(m=>m.name)).size!==plan.baseline.moduleCount)throw Error('M20_STAGE_PLAN_INVALID');
  const deployed=async()=>(await cloudflare.request({method:'GET',path:root+'/scripts/superwin-player/deployments'})).result.deployments[0];
  const active=await deployed();
  const sameActive=a=>a?.id===active.id&&a.versions?.length===1&&a.versions[0].version_id===plan.baseline.id&&a.versions[0].percentage===100;
  if(!sameActive(active))throw Error('M20_STAGE_ACTIVE_CHANGED');
  const baseline=(await cloudflare.request({method:'GET',path:path+plan.baseline.id,query:{include:'modules'}})).result;
  if(baseline.id!==plan.baseline.id||baseline.main_module!==plan.baseline.main_module||baseline.modules?.length!==plan.baseline.moduleCount||
    baseline.migration_tag!=='local-demo-v1'||baseline.bindings?.length!==18||
    baseline.exports?.LocalDemoWallet?.storage!=='sqlite'||baseline.exports?.NativeGameResources?.storage!=='sqlite')throw Error('M20_STAGE_BASELINE_CHANGED');
  let originalBytes=0;
  for(const pin of plan.baseline.inventory){
    const m=baseline.modules.find(m=>m.name===pin.name);if(!m||m.content_type!==pin.contentType)throw Error('M20_STAGE_ORIGINAL_MODULE_CHANGED');
    const b=decode(m.content_base64);if(b.length!==pin.bytes||await hash(b)!==pin.sha256)throw Error('M20_STAGE_ORIGINAL_HASH_CHANGED');originalBytes+=b.length;
  }
  if(originalBytes!==plan.baseline.totalBytes)throw Error('M20_STAGE_ORIGINAL_BYTES_CHANGED');
  const originalConfig=canonical(config(baseline));
  const latest=(await cloudflare.request({method:'GET',path:path+'latest'})).result;
  // A pre-existing unactivated version is retained in version history. The new
  // body explicitly copies the deployed source, never that unreviewed source.
  if(latest.id!==plan.expectedLatestVersion||canonical(config(latest))!==originalConfig)throw Error('M20_STAGE_LATEST_CHANGED');
  const added=[];let addedBytes=0;
  for(const m of plan.modules){
    const b=new TextEncoder().encode(m.source);
    if(baseline.modules.some(old=>old.name===m.name)||m.contentType!=='application/javascript+module'||b.length!==m.bytes||await hash(b)!==m.sha256)throw Error('M20_STAGE_ADDED_HASH_CHANGED');
    let binary='';for(const byte of b)binary+=String.fromCharCode(byte);
    added.push({name:m.name,content_type:m.contentType,content_base64:btoa(binary)});addedBytes+=b.length;
  }
  if(originalBytes+addedBytes>=64*1024*1024)throw Error('M20_STAGE_SIZE_LIMIT');
  const namespace=baseline.bindings.find(b=>b.name==='SSG_OFFICIAL_REFERENCES')?.namespace_id;
  if(!namespace||plan.app.key!==`requested82/m20/recovery/${plan.app.sha256}/app.mjs`)throw Error('M20_STAGE_APP_KEY');
  const value=await cloudflare.request({method:'GET',path:`/accounts/${accountId}/storage/kv/namespaces/${namespace}/values/${plan.app.key}`});
  const app=typeof value==='string'?new TextEncoder().encode(value):value;
  if(!(app instanceof Uint8Array)||app.length!==plan.app.bytes||await hash(app)!==plan.app.sha256)throw Error('M20_STAGE_APP_UNVERIFIED');
  if(!sameActive(await deployed())||(await cloudflare.request({method:'GET',path:path+'latest'})).result.id!==latest.id)throw Error('M20_STAGE_CONCURRENT_CHANGE');
  const staged=await cloudflare.request({method:'PATCH',path:path+'latest',query:{deploy:false},contentType:'application/merge-patch+json',body:{
    main_module:plan.mainModule,modules:[...baseline.modules,...added],annotations:{'workers/message':`M20 accepted-result recovery; source ${plan.sourceCommit}; all425deployed modules retained; original account/wallet/media routes`,
    'workers/tag':'requested82-m20-recovery-20261125'}}});
  const id=staged.result?.id;if(!id)throw Error('M20_STAGE_VERSION_ID_MISSING');
  // Keep post-write readback in a fresh connector call. The 67 MB retained
  // Worker can exhaust an isolate if another version is loaded here. A failed
  // tool response after PATCH is ambiguous: reconcile latest before retrying.
  return {schema:'zplay/m20-staged-recovery/v1',sourceCommit:plan.sourceCommit,baselineVersion:baseline.id,baselineNumber:baseline.number,
    priorUnactivatedVersion:latest.id,stagedVersion:id,stagedNumber:staged.result.number,mainModule:plan.mainModule,
    retainedModules:baseline.modules.length,addedModules:added.length,originalBytes,addedBytes,
    configurationSha256:await hash(new TextEncoder().encode(originalConfig)),app:{key:plan.app.key,sha256:plan.app.sha256,bytes:plan.app.bytes},
    newPins:plan.modules.map(({name,bytes,sha256,contentType})=>({name,bytes,sha256,contentType})),
    activated:false,fullReadbackRequired:true};
}
