/** Run only inside the authenticated Cloudflare connector. Existing Worker
 * modules stay inside that service. Activation and full readback are separate.
 */
export async function stageFirstPairRelease(cloudflare,accountId,plan){
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const decode=s=>{const raw=atob(s),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;};
  const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
  const config=v=>Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(k=>[k,
    k==='bindings'?[...(v[k]||[])].sort((a,b)=>a.name.localeCompare(b.name)):
    ['compatibility_flags','containers'].includes(k)?v[k]||[]:v[k]??null]));
  const root=`/accounts/${accountId}/workers`,path=root+'/workers/superwin-player/versions/';
  if(plan?.schema!=='zplay/first-pair-guarded-stage/v1'||plan.publicationReady!==true||!/^[a-f0-9]{40}$/.test(plan.sourceCommit||'')||
    plan.mainModule!=='requested82pairr1/entry.mjs'||plan.modules?.length!==3||
    !['entry.mjs','config.mjs','worker.mjs'].every(name=>plan.modules.some(m=>m.name==='requested82pairr1/'+name))||
    !Array.isArray(plan.baseline?.inventory)||plan.baseline.inventory.length!==plan.baseline.moduleCount||
    new Set(plan.baseline.inventory.map(m=>m.name)).size!==plan.baseline.moduleCount||!Array.isArray(plan.resources)||plan.resources.length!==3||
    plan.baseline.moduleCount!==431||plan.baseline.totalBytes!==66968590)throw Error('FIRST_PAIR_STAGE_PLAN_INVALID');
  const deployed=async()=>(await cloudflare.request({method:'GET',path:root+'/scripts/superwin-player/deployments'})).result.deployments[0];
  const active=await deployed();
  const sameActive=a=>a?.id===active.id&&a.versions?.length===1&&a.versions[0].version_id===plan.baseline.id&&a.versions[0].percentage===100;
  if(!sameActive(active))throw Error('FIRST_PAIR_STAGE_ACTIVE_CHANGED');
  const baseline=(await cloudflare.request({method:'GET',path:path+plan.baseline.id,query:{include:'modules'}})).result;
  if(baseline.id!==plan.baseline.id||baseline.main_module!==plan.baseline.main_module||baseline.modules?.length!==plan.baseline.moduleCount||
    baseline.migration_tag!=='local-demo-v1'||baseline.bindings?.length!==18||
    baseline.exports?.LocalDemoWallet?.storage!=='sqlite'||baseline.exports?.NativeGameResources?.storage!=='sqlite')throw Error('FIRST_PAIR_STAGE_BASELINE_CHANGED');
  let originalBytes=0;
  for(const pin of plan.baseline.inventory){
    const m=baseline.modules.find(m=>m.name===pin.name);if(!m||m.content_type!==pin.contentType)throw Error('FIRST_PAIR_STAGE_ORIGINAL_MODULE_CHANGED');
    const b=decode(m.content_base64);if(b.length!==pin.bytes||await hash(b)!==pin.sha256)throw Error('FIRST_PAIR_STAGE_ORIGINAL_HASH_CHANGED');originalBytes+=b.length;
  }
  if(originalBytes!==plan.baseline.totalBytes)throw Error('FIRST_PAIR_STAGE_ORIGINAL_BYTES_CHANGED');
  const replacement=plan.representationReplacement,expectedPrevious='140539170057e1e4bfd56cea2a002bf4d5d7a74202ebeddc362d978941d9811c';
  let replacementDeltaBytes=0;const replacementPins=[];
  if(replacement!==undefined){
    const proof=replacement?.proof;
    if(replacement?.name!=='requested82m100r1/config.mjs'||replacement.contentType!=='application/javascript+module'||
      replacement.expectedPreviousSha256!==expectedPrevious||replacement.previousBytes!==9311||typeof replacement.source!=='string'||
      proof?.schema!=='zplay/m100-config-representation-proof/v1'||proof.name!==replacement.name||proof.unchangedRuntimeConfiguration!==true||
      proof.previousSha256!==expectedPrevious||proof.previousBytes!==9311||proof.newSha256!==replacement.sha256||proof.newBytes!==replacement.bytes||
      !/^[a-f0-9]{64}$/.test(proof.originalConfigurationJsonSha256||'')||proof.originalConfigurationJsonSha256!==proof.expandedConfigurationJsonSha256)throw Error('FIRST_PAIR_STAGE_REPRESENTATION_INVALID');
    const target=baseline.modules.find(module=>module.name===replacement.name),old=target&&decode(target.content_base64),next=new TextEncoder().encode(replacement.source);
    if(!old||old.length!==9311||await hash(old)!==expectedPrevious||next.length!==replacement.bytes||await hash(next)!==replacement.sha256||
      replacement.bytes>=9311||proof.savedBytes!==9311-replacement.bytes)throw Error('FIRST_PAIR_STAGE_REPRESENTATION_HASH_CHANGED');
    let binary='';for(const byte of next)binary+=String.fromCharCode(byte);target.content_base64=btoa(binary);
    replacementDeltaBytes=next.length-old.length;replacementPins.push({name:replacement.name,contentType:replacement.contentType,
      previousBytes:old.length,previousSha256:expectedPrevious,bytes:next.length,sha256:replacement.sha256,proof});
  }
  const originalConfig=canonical(config(baseline)),latest=(await cloudflare.request({method:'GET',path:path+'latest'})).result;
  if(latest.id!==plan.expectedLatestVersion||canonical(config(latest))!==originalConfig)throw Error('FIRST_PAIR_STAGE_LATEST_CHANGED');
  const namespace=baseline.bindings.find(b=>b.name==='SSG_OFFICIAL_REFERENCES')?.namespace_id;
  if(!namespace)throw Error('FIRST_PAIR_STAGE_KV_BINDING_MISSING');
  // Each resource is uploaded and read back in a separate fresh connector call.
  // Loading more resources here beside the retained 67 MB Worker exceeds its
  // isolate budget. Runtime serving also verifies every content hash.
  if(plan.resources.some(resource=>resource.key!==`requested82/first-pair/sha256/${resource.sha256}/${resource.name}`)||
    plan.resourceReadbacks?.length!==plan.resources.length||plan.resources.some(resource=>
      !plan.resourceReadbacks.some(proof=>proof.key===resource.key&&proof.sha256===resource.sha256&&proof.bytes===resource.bytes&&proof.readbackVerified===true)))throw Error('FIRST_PAIR_STAGE_RESOURCE_READBACK_REQUIRED');
  let addedBytes=0;const newPins=[];
  for(const m of plan.modules){
    const b=new TextEncoder().encode(m.source);
    if(baseline.modules.some(old=>old.name===m.name)||m.contentType!=='application/javascript+module'||b.length!==m.bytes||await hash(b)!==m.sha256)throw Error('FIRST_PAIR_STAGE_ADDED_HASH_CHANGED');
    let binary='';for(const byte of b)binary+=String.fromCharCode(byte);
    baseline.modules.push({name:m.name,content_type:m.contentType,content_base64:btoa(binary)});addedBytes+=b.length;
    newPins.push({name:m.name,contentType:m.contentType,bytes:m.bytes,sha256:m.sha256});
  }
  const finalBytes=originalBytes+replacementDeltaBytes+addedBytes;
  if(finalBytes>=66968590||finalBytes>=originalBytes)throw Error('FIRST_PAIR_STAGE_SIZE_LIMIT');
  if(!sameActive(await deployed())||(await cloudflare.request({method:'GET',path:path+'latest'})).result.id!==latest.id)throw Error('FIRST_PAIR_STAGE_CONCURRENT_CHANGE');
  const staged=await cloudflare.request({method:'PATCH',path:path+'latest',query:{deploy:false},contentType:'application/merge-patch+json',body:{
    main_module:plan.mainModule,modules:baseline.modules,annotations:{'workers/message':`First pair; source ${plan.sourceCommit}; ${plan.baseline.moduleCount-replacementPins.length} unchanged modules; equivalent config representation`,
    'workers/tag':'requested82-first-pair-20261125'}}});
  // Do not load another large version in this isolate. If PATCH's response is
  // interrupted, inspect latest and compare all pins before considering retry.
  if(!staged.result?.id)throw Error('FIRST_PAIR_STAGE_VERSION_ID_MISSING');
  return{schema:'zplay/first-pair-staged-release/v1',sourceCommit:plan.sourceCommit,baselineVersion:plan.baseline.id,
    stagedVersion:staged.result.id,stagedNumber:staged.result.number,mainModule:plan.mainModule,
    retainedModules:plan.baseline.moduleCount-replacementPins.length,baselineModules:plan.baseline.moduleCount,
    representationReplacedModules:replacementPins.length,addedModules:plan.modules.length,originalBytes,replacementDeltaBytes,addedBytes,finalBytes,
    configurationSha256:await hash(new TextEncoder().encode(originalConfig)),replacementPins,newPins,activated:false,fullReadbackRequired:true};
}
