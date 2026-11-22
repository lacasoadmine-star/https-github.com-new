/** Separate readback avoids keeping the old and new complete Worker bodies in one service isolate. */
export async function verifyVersion(cloudflare,accountId,proof) {
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const config=version=>Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(key=>[key,
    key==='bindings'?[...(version[key]||[])].sort((a,b)=>a.name.localeCompare(b.name)):
    ['compatibility_flags','containers'].includes(key)?version[key]||[]:version[key]??null]));
  if(proof?.worker!=='superwin-player'||!Array.isArray(proof.baseline?.inventory)||proof.baseline.inventory.length!==proof.baseline.moduleCount
    ||!/^[a-f0-9]{40}$/.test(proof.sourceCommit||'')||!/^[a-f0-9-]{36}$/.test(proof.versionId||'')
    ||proof.newPins?.length!==4||proof.mainModule!=='newrequested90r1/entry.mjs')throw Error('READBACK_PROOF_REQUIRED');
  const path=`/accounts/${accountId}/workers/workers/${proof.worker}/versions/`;
  const before=(await cloudflare.request({method:'GET',path:path+proof.baseline.id})).result;
  const after=(await cloudflare.request({method:'GET',path:path+proof.versionId,query:{include:'modules'}})).result;
  if(before.id!==proof.baseline.id||before.main_module!==proof.baseline.main_module||before.migration_tag!=='local-demo-v1'
    ||after.id!==proof.versionId||after.main_module!==proof.mainModule)throw Error('READBACK_VERSION_CHANGED');
  const expected=[...proof.baseline.inventory,...proof.newPins],actual=after.modules||[];
  if(actual.length!==expected.length||new Set(actual.map(m=>m.name)).size!==expected.length||new Set(expected.map(m=>m.name)).size!==expected.length)throw Error('READBACK_MODULE_COUNT_CHANGED');
  let totalBytes=0;
  for(const pin of expected){const item=actual.find(m=>m.name===pin.name);if(!item||item.content_type!==pin.contentType)throw Error('READBACK_MODULE_CHANGED:'+pin.name);
    const bytes=Uint8Array.from(atob(item.content_base64),v=>v.charCodeAt(0));
    if(bytes.length!==pin.bytes||await hash(bytes)!==pin.sha256)throw Error('READBACK_MODULE_CHANGED:'+pin.name);totalBytes+=bytes.length;
  }
  const beforeConfig=canonical(config(before));
  if(canonical(config(after))!==beforeConfig||after.bindings?.length!==18||(after.migration_tag&&after.migration_tag!==before.migration_tag))throw Error('READBACK_CONFIGURATION_CHANGED');
  const deployments=(await cloudflare.request({method:'GET',path:`/accounts/${accountId}/workers/scripts/${proof.worker}/deployments`})).result.deployments;
  const active=deployments[0],activeVersion=proof.expectActive?proof.versionId:proof.baseline.id;
  if(active?.versions?.length!==1||active.versions[0].version_id!==activeVersion||active.versions[0].percentage!==100)throw Error('READBACK_ACTIVE_CHANGED');
  if(proof.expectActive&&after.migration_tag!==before.migration_tag)throw Error('ACTIVE_MIGRATION_TAG_CHANGED');
  return{schema:'zplay/new90-version-readback/v1',worker:proof.worker,sourceCommit:proof.sourceCommit,
    baselineVersion:before.id,baselineNumber:before.number,versionId:after.id,versionNumber:after.number,
    deploymentId:active.id,activeVersion,activated:!!proof.expectActive,retainedModules:proof.baseline.moduleCount,
    addedModules:proof.newPins.length,verifiedModules:expected.length,totalBytes,
    allOriginalModulesByteIdentical:true,configurationUnchanged:true,configurationSha256:await hash(new TextEncoder().encode(beforeConfig)),
    migrationTag:after.migration_tag||null,bindings:after.bindings.map(({name,type})=>({name,type})),newModulePins:proof.newPins};
}

export function verificationCode(proof){return `async () => {const verifyVersion=${verifyVersion.toString()};return verifyVersion(cloudflare,accountId,${JSON.stringify(proof)});}`;}
