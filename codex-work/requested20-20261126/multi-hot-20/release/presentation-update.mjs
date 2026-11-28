const enc=new TextEncoder();
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value)),n=>n.toString(16).padStart(2,'0')).join('');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

/** Local preparation only. baseline must come from an independent active-version
 * readback, including the exact deployed M20 entry and original config facts. */
export async function createM20PresentationPlan({build,baseline,deploymentId}={}){
  const prefix='requested82m20r1/',candidate='requested20m20r2/';
  if(build?.report?.schema!=='zplay/m20-accepted-presentation-recovery-build/v1'||
    !/^[a-f0-9]{40}$/.test(build.report.sourceCommit||'')||build.report.stylesChanged!==true||
    build.report.oldMediaUnchanged!==true||build.report.financialRequestsChanged!==false||
    build.report.backendGameId!=='fresh_multihot20'||build.modules?.length!==3||build.staticFiles?.length!==2||
    !same(build.modules.map(m=>m.name),['entry.mjs','config.mjs','worker.mjs'].map(n=>candidate+n))||
    baseline?.previousAppPath!==build.config?.previousAppPath||baseline.baselineRevision!==build.config.baselineRevision||
    baseline.previousStylePath!==build.config.previousStylePath)throw Error('M20_PRESENTATION_BUILD');
  for(const module of build.modules){
    const bytes=enc.encode(module.source);
    if(module.contentType!=='application/javascript+module'||bytes.length!==module.bytes||await digest(bytes)!==module.sha256)throw Error('M20_PRESENTATION_BUILD_MODULE');
  }
  if(build.modules[0].sha256!==baseline.entrySha256)throw Error('M20_PRESENTATION_ENTRY_CHANGED');
  const resources=[];
  for(const name of ['app.mjs','style.css']){
    const resource=build.staticFiles.find(r=>r.name===name),isApp=name==='app.mjs';
    if(!resource||resource.key!==build.config[isApp?'appKey':'styleKey']||resource.sha256!==build.config[isApp?'appSha256':'styleSha256']||
      resource.bytes!==build.config[isApp?'appBytes':'styleBytes']||resource.bytes!==enc.encode(resource.source).length||await digest(enc.encode(resource.source))!==resource.sha256)
      throw Error('M20_PRESENTATION_BUILD_RESOURCE');
    resources.push({name,key:resource.key,bytes:resource.bytes,sha256:resource.sha256});
  }
  const replacements=build.modules.slice(1).map(module=>({...module,name:prefix+module.name.slice(candidate.length),previous:baseline.ownedPins?.find(pin=>pin.name===prefix+module.name.slice(candidate.length))}));
  if(replacements.some(r=>!r.previous))throw Error('M20_PRESENTATION_OLD_PINS');
  return{schema:'zplay/m20-presentation-update/v1',sourceCommit:build.report.sourceCommit,deploymentId,baseline:{
    id:baseline.id,number:baseline.number,mainModule:baseline.mainModule,moduleCount:baseline.moduleCount,totalBytes:baseline.totalBytes,
    inventorySha256:baseline.inventorySha256,configurationSha256:baseline.configurationSha256,entrySha256:baseline.entrySha256},replacements,resources};
}

/** Execute only inside the authorized Cloudflare connector. This function is
 * self-contained so its source can be passed to that connector. It stages two
 * owned module replacements; it never uploads resources or activates traffic. */
export async function stageM20PresentationUpdate(cloudflare,accountId,plan){
  const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
  const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),encode=new TextEncoder();
  const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
  const configuration=v=>Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(k=>[k,
    k==='bindings'?[...(v[k]||[])].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0):['compatibility_flags','containers'].includes(k)?v[k]||[]:v[k]??null]));
  const SHA=/^[a-f0-9]{64}$/,UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
  const targets=['requested82m20r1/config.mjs','requested82m20r1/worker.mjs'],maximumBytes=66968590;
  const root=`/accounts/${accountId}/workers`,versions=root+'/workers/superwin-player/versions/';
  if(plan?.schema!=='zplay/m20-presentation-update/v1'||!/^[a-f0-9]{40}$/.test(plan.sourceCommit||'')||!UUID.test(plan.deploymentId||'')||
    !UUID.test(plan.baseline?.id||'')||!Number.isSafeInteger(plan.baseline.number)||plan.baseline.number<1||
    plan.baseline.mainModule!=='requested82pairr1/entry.mjs'||plan.baseline.moduleCount!==434||
    !Number.isSafeInteger(plan.baseline.totalBytes)||plan.baseline.totalBytes<1||plan.baseline.totalBytes>maximumBytes||
    !SHA.test(plan.baseline.inventorySha256||'')||!SHA.test(plan.baseline.configurationSha256||'')||!SHA.test(plan.baseline.entrySha256||'')||
    plan.replacements?.length!==2||plan.resources?.length!==2||
    targets.some((name,i)=>plan.replacements[i]?.name!==name)||
    plan.replacements.some(r=>r.contentType!=='application/javascript+module'||!SHA.test(r.sha256||'')||!Number.isSafeInteger(r.bytes)||r.bytes<1||
      r.previous?.name!==r.name||r.previous.contentType!==r.contentType||!SHA.test(r.previous.sha256||'')||!Number.isSafeInteger(r.previous.bytes)||r.previous.bytes<1)||
    ['app.mjs','style.css'].some((name,i)=>plan.resources[i]?.name!==name||!SHA.test(plan.resources[i]?.sha256||'')||
      !Number.isSafeInteger(plan.resources[i]?.bytes)||plan.resources[i].bytes<1||plan.resources[i].bytes>1048576||
      plan.resources[i].key!==`requested82/m20/recovery/${plan.resources[i].sha256}/${name}`))throw Error('M20_PRESENTATION_PLAN');
  const deployed=async()=>(await cloudflare.request({method:'GET',path:root+'/scripts/superwin-player/deployments',query:{per_page:1}})).result.deployments[0];
  const matches=d=>d?.id===plan.deploymentId&&d.versions?.length===1&&d.versions[0].version_id===plan.baseline.id&&d.versions[0].percentage===100;
  if(!matches(await deployed()))throw Error('M20_PRESENTATION_ACTIVE_CHANGED');
  const old=(await cloudflare.request({method:'GET',path:versions+plan.baseline.id,query:{include:'modules'}})).result;
  if(old.id!==plan.baseline.id||old.number!==plan.baseline.number||old.main_module!==plan.baseline.mainModule||old.modules?.length!==434||
    old.bindings?.length!==18||old.migration_tag!=='local-demo-v1'||old.exports?.LocalDemoWallet?.storage!=='sqlite'||
    old.exports?.NativeGameResources?.storage!=='sqlite'||new Set(old.modules.map(m=>m.name)).size!==434)throw Error('M20_PRESENTATION_BASELINE');
  const configurationSha256=await hash(encode.encode(canonical(configuration(old))));
  if(configurationSha256!==plan.baseline.configurationSha256)throw Error('M20_PRESENTATION_RUNTIME_CHANGED');
  const inventory=[];let totalBytes=0;
  for(const module of old.modules){const bytes=decode(module.content_base64);totalBytes+=bytes.length;inventory.push({name:module.name,bytes:bytes.length,sha256:await hash(bytes),contentType:module.content_type});}
  inventory.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  if(totalBytes!==plan.baseline.totalBytes||await hash(encode.encode(JSON.stringify(inventory)))!==plan.baseline.inventorySha256||
    inventory.find(m=>m.name==='requested82m20r1/entry.mjs')?.sha256!==plan.baseline.entrySha256)throw Error('M20_PRESENTATION_INVENTORY_CHANGED');
  const latest=async()=>(await cloudflare.request({method:'GET',path:versions+'latest'})).result;
  const current=await latest();
  if(current.id!==plan.baseline.id||await hash(encode.encode(canonical(configuration(current))))!==configurationSha256)throw Error('M20_PRESENTATION_LATEST_CHANGED');
  const encoded=[];let nextTotalBytes=totalBytes;
  for(const replacement of plan.replacements){
    const previous=inventory.find(m=>m.name===replacement.name),bytes=encode.encode(replacement.source);
    if(!previous||canonical(previous)!==canonical(replacement.previous)||bytes.length!==replacement.bytes||await hash(bytes)!==replacement.sha256)throw Error('M20_PRESENTATION_REPLACEMENT_PIN');
    nextTotalBytes+=bytes.length-previous.bytes;
    let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte);
    encoded.push({...old.modules.find(m=>m.name===replacement.name),content_base64:btoa(raw)});
  }
  if(nextTotalBytes>maximumBytes)throw Error('M20_PRESENTATION_SIZE_LIMIT');
  const namespace=old.bindings.find(b=>b.name==='SSG_OFFICIAL_REFERENCES'&&b.type==='kv_namespace')?.namespace_id;
  if(!namespace)throw Error('M20_PRESENTATION_NAMESPACE');
  for(const resource of plan.resources){
    const value=await cloudflare.request({method:'GET',path:`/accounts/${accountId}/storage/kv/namespaces/${namespace}/values/${resource.key}`});
    const body=typeof value==='string'?encode.encode(value):value;
    if(!(body instanceof Uint8Array)||body.length!==resource.bytes||await hash(body)!==resource.sha256)throw Error('M20_PRESENTATION_RESOURCE_PIN');
  }
  if(!matches(await deployed())||(await latest()).id!==plan.baseline.id)throw Error('M20_PRESENTATION_CONCURRENT_CHANGE');
  const modules=old.modules.map(module=>encoded.find(replacement=>replacement.name===module.name)||module);
  const staged=(await cloudflare.request({method:'PATCH',path:versions+'latest',query:{deploy:false},contentType:'application/merge-patch+json',body:{
    main_module:old.main_module,modules,annotations:{'workers/message':'M20 compact viewport and sign-in presentation; source '+plan.sourceCommit+'; 432 other modules and original runtime configuration retained',
      'workers/tag':'requested20-m20-presentation-20261127'}}})).result;
  if(!staged?.id)throw Error('M20_PRESENTATION_STAGE_ID');
  return{schema:'zplay/m20-presentation-staged/v1',sourceCommit:plan.sourceCommit,baselineId:old.id,id:staged.id,number:staged.number,
    mainModule:old.main_module,moduleCount:434,retainedModules:432,changedModules:2,totalBytes:nextTotalBytes,maximumBytes,configurationSha256,
    retainedInventorySha256:await hash(encode.encode(JSON.stringify(inventory.filter(m=>!targets.includes(m.name))))),
    replacementPins:plan.replacements.map(({source,previous,...pin})=>pin),resources:plan.resources,fullReadbackRequired:true,activated:false};
}
