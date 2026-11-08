// Build code for the connected Cloudflare execute tool. No network calls occur
// while this file runs locally. The emitted upload code stages a version only.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const account = '288bc182291438b87a68193627f36ca0';
const worker = 'superwin-player';
const baselineId = 'eba8230c-8b57-49ca-8156-4f40a5103606';
const newNames = [
  'expansion-client-assets-20261108.mjs',
  'expansion-worker-20261108.mjs',
  'expansion-player-entry-20261108.mjs',
];
const evidenceUrl = new URL('../evidence/cloudflare-v314-baseline.json', import.meta.url);

async function stage(input) {
  if (accountId !== input.account) throw new Error('UNEXPECTED_CLOUDFLARE_ACCOUNT');
  const base = `/accounts/${accountId}/workers`;
  const canonical = value => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
    return value;
  };
  const fingerprintBindings = bindings => JSON.stringify(canonical([...bindings].sort((a,b) => a.name.localeCompare(b.name))));
  const [v, s, d] = await Promise.all([
    cloudflare.request({method:'GET',path:`${base}/workers/${input.worker}/versions/latest`,query:{include:'modules'}}),
    cloudflare.request({method:'GET',path:`${base}/scripts/${input.worker}/settings`}),
    cloudflare.request({method:'GET',path:`${base}/scripts/${input.worker}/deployments`,query:{per_page:1}}),
  ]);
  const current = v.result;
  const active = d.result.deployments[0];
  if (current.id !== input.baselineId || current.main_module !== input.mainBaseline) throw new Error('LATEST_VERSION_CHANGED');
  if (active.versions.length !== 1 || active.versions[0].version_id !== input.baselineId || active.versions[0].percentage !== 100) throw new Error('ACTIVE_DEPLOYMENT_CHANGED');
  if (current.modules.length !== input.baselineModules.length) throw new Error('BASELINE_MODULE_COUNT_CHANGED');
  if (fingerprintBindings(current.bindings) !== fingerprintBindings(input.baselineBindings) || fingerprintBindings(s.result.bindings) !== fingerprintBindings(input.baselineBindings)) throw new Error('BASELINE_BINDINGS_CHANGED');
  if (s.result.compatibility_date !== input.compatibilityDate || JSON.stringify(s.result.compatibility_flags || []) !== JSON.stringify(input.compatibilityFlags)) throw new Error('BASELINE_RUNTIME_CHANGED');
  if (!current.assets?.config?.run_worker_first) throw new Error('BASELINE_STATIC_ASSET_CONFIG_CHANGED');
  const expected = new Map(input.baselineModules.map(m => [m.name,m]));
  let retainedBytes = 0;
  for (const m of current.modules) {
    const prior = expected.get(m.name);
    if (!prior || prior.content_type !== m.content_type) throw new Error('BASELINE_MODULE_CHANGED: ' + m.name);
    const bytes = Uint8Array.from(atob(m.content_base64),c => c.charCodeAt(0));
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b => b.toString(16).padStart(2,'0')).join('');
    if (bytes.length !== prior.size || digest !== prior.sha256) throw new Error('BASELINE_MODULE_HASH_CHANGED: ' + m.name);
    retainedBytes += bytes.length;
  }
  const names = new Set(current.modules.map(m => m.name));
  for (const m of input.modules) {
    if (names.has(m.name)) throw new Error('NEW_MODULE_NAME_COLLISION: ' + m.name);
    names.add(m.name);
  }
  const metadata = {
    main_module:input.mainModule,
    compatibility_date:s.result.compatibility_date,
    compatibility_flags:s.result.compatibility_flags || [],
    usage_model:s.result.usage_model,
    keep_assets:true,
    bindings:s.result.bindings.map(binding => binding.type === 'secret_text' ? {name:binding.name,type:'inherit'} : binding),
    annotations:input.annotations,
  };
  const form = new FormData();
  form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));
  for (const m of [...current.modules,...input.modules]) {
    const bytes = Uint8Array.from(atob(m.content_base64),c => c.charCodeAt(0));
    form.append(m.name,new Blob([bytes],{type:m.content_type}),m.name);
  }
  // Resolve inherited secrets only against the verified latest version.
  const latest = await cloudflare.request({method:'GET',path:`${base}/workers/${input.worker}/versions/latest`});
  if (latest.result.id !== input.baselineId) throw new Error('VERSION_CHANGED_DURING_PREPARATION');
  const result = await cloudflare.request({
    method:'POST',path:`${base}/scripts/${input.worker}/versions`,
    query:{bindings_inherit:'strict'},body:form,
  });
  return {
    success:result.success,
    stagedVersion:result.result,
    retainedModules:current.modules.length,
    retainedBytes,
    addedModules:input.modules.map(m => m.name),
    retainedBindings:s.result.bindings.map(b => ({name:b.name,type:b.type})),
    keepAssetsRequested:true,
    productionDeploymentChanged:false,
    rollbackVersion:input.baselineId,
  };
}

export function buildPlayerStageCode(files, {commitSha,message} = {}) {
  const baseline = JSON.parse(fs.readFileSync(evidenceUrl,'utf8'));
  if (baseline.version.id !== baselineId || baseline.modules.length !== 213) throw new Error('Unexpected pinned baseline');
  if (files.length !== newNames.length || newNames.some(name => !files.some(f => f.name === name))) throw new Error('Exactly the three reviewed new modules are required');
  const modules = files.map(file => ({
    name:file.name,
    content_type:'application/javascript+module',
    content_base64:fs.readFileSync(file.file).toString('base64'),
  }));
  const annotations = {
    'workers/tag':'multihot40-native-r1',
    'workers/message':message || 'Owner-authorized MultiHot40 continuation. Retain all213 v314 modules,14 bindings,static assets,existing expansion100 routes and scheduled handler. Existing wallet authority preserved.',
  };
  if (commitSha) {
    if (!/^[a-f0-9]{40,64}$/.test(commitSha)) throw new Error('Invalid commit SHA');
    annotations['workers/commit_sha'] = commitSha;
  }
  const input = {
    account,worker,baselineId,mainBaseline:baseline.version.main_module,
    mainModule:'expansion-player-entry-20261108.mjs',
    compatibilityDate:baseline.version.compatibility_date,
    compatibilityFlags:baseline.version.compatibility_flags || [],
    baselineModules:baseline.modules.map(({name,size,sha256,content_type}) => ({name,size,sha256,content_type})),
    baselineBindings:baseline.version.bindings,
    modules,annotations,
  };
  return `async () => { return (${stage.toString()})(${JSON.stringify(input)}); }`;
}

export function buildPlayerDeployCode(versionId) {
  if (!/^[a-f0-9-]{36}$/.test(versionId)) throw new Error('Invalid version ID');
  return `async () => {
    if (accountId !== ${JSON.stringify(account)}) throw new Error('UNEXPECTED_CLOUDFLARE_ACCOUNT');
    const base = '/accounts/' + accountId + '/workers';
    const [v,d] = await Promise.all([
      cloudflare.request({method:'GET',path:base+'/workers/${worker}/versions/latest'}),
      cloudflare.request({method:'GET',path:base+'/scripts/${worker}/deployments',query:{per_page:1}})
    ]);
    const active=d.result.deployments[0].versions;
    if(v.result.id!==${JSON.stringify(versionId)}||active.length!==1||active[0].version_id!==${JSON.stringify(baselineId)}||active[0].percentage!==100)throw new Error('DEPLOYMENT_STATE_CHANGED');
    return cloudflare.request({method:'POST',path:base+'/scripts/${worker}/deployments',body:{strategy:'percentage',versions:[{version_id:${JSON.stringify(versionId)},percentage:100}],annotations:{'workers/message':'Owner-authorized reviewed MultiHot40 release. Preserve original v314 modules,bindings,assets and existing account ledger. Rollback ${baselineId}.'}}});
  }`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node build-player-upload.mjs <JSON module file list>');
  const request = JSON.parse(fs.readFileSync(file,'utf8'));
  process.stdout.write(buildPlayerStageCode(request.files,request));
}
