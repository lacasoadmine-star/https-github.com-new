// Read-only validation precedes the one version-upload operation. Deployment is separate.
// This function is serialized for the connected Cloudflare execute environment.
export async function stageVerifiedRelease(input) {
  if (accountId !== input.account) throw new Error('ACCOUNT_CHANGED');
  const root = '/accounts/' + accountId + '/workers';
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const bindingSet = value => [...value].sort((a, b) => a.name.localeCompare(b.name));
  const sha = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  const [activeResult, latestResult, deploymentResult, settingsResult] = await Promise.all([
    cloudflare.request({method:'GET',path:root+'/workers/'+input.worker+'/versions/'+input.baseline.version.id,query:{include:'modules'}}),
    cloudflare.request({method:'GET',path:root+'/workers/'+input.worker+'/versions/latest'}),
    cloudflare.request({method:'GET',path:root+'/scripts/'+input.worker+'/deployments',query:{per_page:1}}),
    cloudflare.request({method:'GET',path:root+'/scripts/'+input.worker+'/settings'}),
  ]);
  const active=activeResult.result, latest=latestResult.result, settings=settingsResult.result;
  const deployment=deploymentResult.result.deployments[0];
  if (latest.id!==input.latestId) throw new Error('LATEST_VERSION_CHANGED');
  if (deployment.versions.length!==1 || deployment.versions[0].version_id!==active.id || deployment.versions[0].percentage!==100) throw new Error('ACTIVE_DEPLOYMENT_CHANGED');
  if (active.main_module!==input.baseline.version.main_module || active.modules.length!==input.baseline.inventory.length) throw new Error('ACTIVE_MODULE_SHAPE_CHANGED');
  for (const source of [active,latest,settings]) {
    if (!equal(bindingSet(source.bindings),bindingSet(input.baseline.version.bindings))) throw new Error('BINDINGS_CHANGED');
    if (source.compatibility_date!==input.baseline.version.compatibility_date || !equal(source.compatibility_flags||[],input.baseline.version.compatibility_flags||[])) throw new Error('RUNTIME_CHANGED');
  }
  if (!equal(active.assets,latest.assets) || !equal(active.assets,input.baseline.version.assets)) throw new Error('STATIC_ASSETS_CHANGED');
  if (!equal(active.exports,input.baseline.version.exports) || !equal(latest.exports,active.exports)) throw new Error('EXPORTS_CHANGED');
  if ((active.migration_tag||null)!==(input.baseline.version.migration_tag||null) || (latest.migration_tag||null)!==(active.migration_tag||null)) throw new Error('MIGRATION_CHANGED');
  const expected=new Map(input.baseline.inventory.map(m=>[m.name,m]));
  let retainedBytes=0;
  for (const module of active.modules) {
    const prior=expected.get(module.name), bytes=Uint8Array.from(atob(module.content_base64),c=>c.charCodeAt(0));
    if (!prior || module.content_type!==prior.content_type || bytes.length!==prior.size || await sha(bytes)!==prior.sha256) throw new Error('BASELINE_HASH_CHANGED:'+module.name);
    retainedBytes+=bytes.length;
  }
  const compressed=Uint8Array.from(atob(input.payload.gzip),c=>c.charCodeAt(0));
  const raw=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  if (raw.length!==input.payload.bytes || await sha(raw)!==input.payload.sha256) throw new Error('PAYLOAD_MISMATCH');
  const modules=JSON.parse(new TextDecoder().decode(raw));
  if (!equal(modules.map(m=>m.name).sort(),input.moduleNames.slice().sort())) throw new Error('NEW_MODULE_SET_CHANGED');
  const names=new Set(active.modules.map(m=>m.name));
  for (const module of modules) {
    if (names.has(module.name)) throw new Error('MODULE_COLLISION:'+module.name);
    const bytes=Uint8Array.from(atob(module.content_base64),c=>c.charCodeAt(0));
    if (bytes.length!==module.size || await sha(bytes)!==module.sha256) throw new Error('NEW_MODULE_HASH_MISMATCH:'+module.name);
    names.add(module.name);
  }
  const metadata={main_module:input.mainModule,compatibility_date:settings.compatibility_date,compatibility_flags:settings.compatibility_flags||[],usage_model:settings.usage_model,keep_assets:true,exports:active.exports,bindings:settings.bindings.map(b=>b.type==='secret_text'?{name:b.name,type:'inherit'}:b),annotations:{'workers/commit_sha':input.commit,'workers/message':input.message}};
  const form=new FormData();form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));
  for(const module of [...active.modules,...modules]) form.append(module.name,new Blob([Uint8Array.from(atob(module.content_base64),c=>c.charCodeAt(0))],{type:module.content_type}),module.name);
  const [finalLatest,finalDeployment]=await Promise.all([
    cloudflare.request({method:'GET',path:root+'/workers/'+input.worker+'/versions/latest'}),
    cloudflare.request({method:'GET',path:root+'/scripts/'+input.worker+'/deployments',query:{per_page:1}}),
  ]);
  if (finalLatest.result.id!==input.latestId || !equal(finalDeployment.result.deployments[0].versions,deployment.versions)) throw new Error('STATE_CHANGED_DURING_PREPARATION');
  const uploaded=await cloudflare.request({method:'POST',path:root+'/scripts/'+input.worker+'/versions',query:{bindings_inherit:'strict'},body:form});
  return {success:uploaded.success,worker:input.worker,version:uploaded.result,rollbackVersion:active.id,previousLatest:latest.id,preservedModules:active.modules.length,preservedBytes:retainedBytes,newModules:modules.map(({name,size,sha256})=>({name,size,sha256})),keepAssets:true,productionDeploymentChanged:false};
}
