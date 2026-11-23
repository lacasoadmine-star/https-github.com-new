import {createHash} from 'node:crypto';

const MODULE_FILES = ['entry.mjs','public.mjs','worker.mjs','worker-assets.mjs'];

export function deploymentPlan({baseline,build,sourceCommit}) {
  const namespace = build.modules?.find(m=>m.name.endsWith('/entry.mjs'))?.name.split('/')[0];
  if (!/^newrequested90r[123]$/.test(namespace || '')) throw Error('UNVERIFIED_DEPLOYMENT_NAMESPACE');
  const ownModules = MODULE_FILES.map(name=>namespace+'/'+name);
  if (!baseline?.id || baseline.moduleCount !== baseline.inventory?.length || !baseline.moduleCount
    || !/^[a-f0-9]{40}$/.test(sourceCommit || '') || build.report.sourceCommit !== sourceCommit
    || build.report.requestedCount !== 90 || build.report.activeMainModule !== baseline.main_module
    || build.modules.length !== ownModules.length || !ownModules.every(name=>build.modules.some(m=>m.name===name)))
    throw Error('UNVERIFIED_DEPLOYMENT_PLAN');
  for (const item of build.modules) {
    if (baseline.inventory.some(old=>old.name===item.name) || item.contentType !== 'application/javascript+module'
      || Buffer.byteLength(item.source) !== item.bytes
      || createHash('sha256').update(item.source).digest('hex') !== item.sha256) throw Error('NEW_MODULE_PIN_CHANGED');
  }
  if (baseline.totalBytes + build.report.totalBytes >= 64*1024*1024) throw Error('WORKER_SIZE_LIMIT');
  return {schema:'zplay/new90-stage-plan/v1',worker:'superwin-player',sourceCommit,baseline,
    modules:build.modules,mainModule:namespace+'/entry.mjs'};
}

/** Runs entirely inside the authenticated Cloudflare service. Only hashes and metadata leave it. */
export async function executeStage(cloudflare,accountId,plan) {
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const bytes=base64=>Uint8Array.from(atob(base64),x=>x.charCodeAt(0));
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const config=version=>Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(key=>[key,
    key==='bindings'?[...(version[key]||[])].sort((a,b)=>a.name.localeCompare(b.name)):
    ['compatibility_flags','containers'].includes(key)?version[key]||[]:version[key]??null]));
  const prefix=`/accounts/${accountId}/workers`;
  if (plan?.schema!=='zplay/new90-stage-plan/v1'||plan.worker!=='superwin-player'||!/^[a-f0-9]{40}$/.test(plan.sourceCommit||'')
    ||!/^newrequested90r[123]\/entry\.mjs$/.test(plan.mainModule||'')||!Array.isArray(plan.baseline?.inventory)
    ||plan.baseline.inventory.length!==plan.baseline.moduleCount||new Set(plan.baseline.inventory.map(x=>x.name)).size!==plan.baseline.moduleCount)
    throw Error('STAGE_PLAN_INVALID');
  const expectedNames=['entry.mjs','public.mjs','worker.mjs','worker-assets.mjs'].map(n=>plan.mainModule.split('/')[0]+'/'+n);
  if (plan.modules?.length!==4||new Set(plan.modules.map(m=>m.name)).size!==4||!expectedNames.every(n=>plan.modules.some(m=>m.name===n))) throw Error('STAGE_MODULE_SET_INVALID');
  const deployments=async()=>{
    const result=await cloudflare.request({method:'GET',path:prefix+`/scripts/${plan.worker}/deployments`});
    return result.result.deployments[0];
  };
  const active=await deployments();
  if (active?.versions?.length!==1||active.versions[0].version_id!==plan.baseline.id||active.versions[0].percentage!==100) throw Error('ACTIVE_VERSION_CHANGED');
  const getVersion=async id=>(await cloudflare.request({method:'GET',path:prefix+`/workers/${plan.worker}/versions/${id}`,query:{include:'modules'}})).result;
  const before=await getVersion('latest');
  if (before.id!==plan.baseline.id||before.main_module!==plan.baseline.main_module) throw Error('LATEST_VERSION_CHANGED');
  const inventory=async version=>{
    const result=[];
    for(const m of version.modules||[]) {const body=bytes(m.content_base64);result.push({name:m.name,contentType:m.content_type,bytes:body.length,sha256:await hash(body)});}
    return result;
  };
  const sameInventory=(actual,expected)=>{
    if(actual.length!==expected.length||new Set(actual.map(x=>x.name)).size!==expected.length)throw Error('MODULE_COUNT_CHANGED');
    for(const pin of expected){const item=actual.find(x=>x.name===pin.name);if(!item||canonical(item)!==canonical(pin))throw Error('RETAINED_MODULE_CHANGED:'+pin.name);}
  };
  sameInventory(await inventory(before),plan.baseline.inventory);
  const beforeConfig=canonical(config(before));
  if(before.bindings?.length!==18||before.exports?.LocalDemoWallet?.storage!=='sqlite'||before.exports?.NativeGameResources?.storage!=='sqlite'
    ||before.exports?.default?.type!=='worker'||before.migration_tag!=='local-demo-v1') throw Error('RUNTIME_CONFIG_UNEXPECTED');
  const appended=[];
  for(const m of plan.modules){
    const body=new TextEncoder().encode(m.source);
    if(before.modules.some(old=>old.name===m.name)||m.contentType!=='application/javascript+module'||body.length!==m.bytes||await hash(body)!==m.sha256) throw Error('APPENDED_MODULE_CHANGED');
    let binary='';for(const b of body)binary+=String.fromCharCode(b);
    appended.push({name:m.name,content_type:m.contentType,content_base64:btoa(binary)});
  }
  const activeAgain=await deployments();
  if(activeAgain.id!==active.id)throw Error('CONCURRENT_DEPLOYMENT_CHANGED');
  const latestAgain=(await cloudflare.request({method:'GET',path:prefix+`/workers/${plan.worker}/versions/latest`})).result;
  if(latestAgain.id!==before.id)throw Error('CONCURRENT_STAGED_VERSION_CHANGED');
  const staged=await cloudflare.request({method:'PATCH',path:prefix+`/workers/${plan.worker}/versions/latest`,query:{deploy:false},contentType:'application/merge-patch+json',body:{
    main_module:plan.mainModule,modules:[...before.modules,...appended],annotations:{'workers/message':`NEW90 exact requested catalogue; source ${plan.sourceCommit}; all ${plan.baseline.moduleCount} prior modules preserved; zero new games asserted complete`,
      'workers/tag':'new90-catalogue-20261123'}}});
  const id=staged.result?.id;if(!id)throw Error('STAGED_VERSION_ID_MISSING');
  // Read the staged body in a separate service invocation: two complete large
  // versions retained together can exhaust the service's memory after upload.
  const after=(await cloudflare.request({method:'GET',path:prefix+`/workers/${plan.worker}/versions/${id}`})).result;
  if(after.main_module!==plan.mainModule||canonical(config(after))!==beforeConfig
    ||(after.migration_tag&&after.migration_tag!==before.migration_tag))throw Error('STAGED_CONFIG_CHANGED');
  const activeAfter=await deployments();if(activeAfter.id!==active.id)throw Error('STAGING_CHANGED_ACTIVE_DEPLOYMENT');
  return {schema:'zplay/new90-staged-verification/v1',worker:plan.worker,sourceCommit:plan.sourceCommit,
    baselineVersion:before.id,baselineNumber:before.number,stagedVersion:id,stagedNumber:after.number,
    activeDeployment:active.id,activeVersion:before.id,activated:false,retainedModules:before.modules.length,
    appendedModules:appended.length,verificationPending:true,
    originalModulesSentUnchanged:true,configurationUnchanged:true,configurationSha256:await hash(new TextEncoder().encode(beforeConfig)),
    newModulePins:plan.modules.map(({name,contentType,bytes,sha256})=>({name,contentType,bytes,sha256}))};
}

export function stageCode(plan) {
  return `async () => { const executeStage=${executeStage.toString()}; return executeStage(cloudflare,accountId,${JSON.stringify(plan)}); }`;
}
