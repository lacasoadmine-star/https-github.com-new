// Infrastructure helper only: it never reads gameplay, alters a prior module, or deploys.
export const MODULE_PREFIX = 'newrequested71r1/';
export const BASE_DEPLOYMENT_MODULES = Object.freeze(
  ['entry.mjs','catalogue.mjs','worker.mjs','worker-assets.mjs'].map(name=>MODULE_PREFIX+name),
);
export const PREVIEW_DEPLOYMENT_MODULES = Object.freeze(
  ['preview-worker.mjs','preview-manifest.mjs'].map(name=>MODULE_PREFIX+name),
);

export function parseMultipart(input) {
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  const encoder=new TextEncoder(),decoder=new TextDecoder();
  const find=(needle,from=0)=>{outer:for(let i=from;i<=bytes.length-needle.length;i++){if(bytes[i]!==needle[0])continue;for(let j=1;j<needle.length;j++)if(bytes[i+j]!==needle[j])continue outer;return i;}return -1;};
  const first=find(encoder.encode('\r\n'));
  if(first<3||first>256||bytes[0]!==45||bytes[1]!==45)throw Error('INVALID_MULTIPART_BOUNDARY');
  const boundary=decoder.decode(bytes.subarray(2,first));
  const delimiter=encoder.encode('\r\n--'+boundary),headerEnd=encoder.encode('\r\n\r\n'),parts=new Map();
  let position=first+2;
  while(position<bytes.length){
    const endHeaders=find(headerEnd,position);
    if(endHeaders<0||endHeaders-position>8192)throw Error('INVALID_PART_HEADERS');
    const headers=decoder.decode(bytes.subarray(position,endHeaders));
    const name=headers.match(/(?:^|\r\n)Content-Disposition:\s*form-data;\s*name="([^"]+)"/i)?.[1];
    const contentType=headers.match(/(?:^|\r\n)Content-Type:\s*([^\r\n]+)/i)?.[1];
    if(!name||parts.has(name)||!/^[-A-Za-z0-9_./]+$/.test(name)||name.startsWith('/')||name.split('/').includes('..')||!contentType)throw Error('INVALID_PART_NAME');
    const next=find(delimiter,endHeaders+4);
    if(next<0)throw Error('MISSING_PART_DELIMITER');
    parts.set(name,{bytes:bytes.subarray(endHeaders+4,next),contentType});
    const end=next+delimiter.length;
    if(bytes[end]===45&&bytes[end+1]===45){
      if(end+2!==bytes.length&&!(end+4===bytes.length&&bytes[end+2]===13&&bytes[end+3]===10))throw Error('UNEXPECTED_MULTIPART_SUFFIX');
      return parts;
    }
    if(bytes[end]!==13||bytes[end+1]!==10)throw Error('INVALID_MULTIPART_SEPARATOR');
    position=end+2;
  }
  throw Error('UNTERMINATED_MULTIPART');
}

export async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
}

export function partsFromVersion(version) {
  if(!version?.id||!Array.isArray(version.modules)||!version.modules.length)throw Error('VERSION_MODULES_REQUIRED');
  const parts=new Map();
  for(const module of version.modules){
    if(typeof module.name!=='string'||!/^[-A-Za-z0-9_./]+$/.test(module.name)||module.name.startsWith('/')||module.name.split('/').includes('..')
      ||parts.has(module.name)||typeof module.content_type!=='string'||typeof module.content_base64!=='string')throw Error('VERSION_MODULE_INVALID');
    const bytes=Uint8Array.from(atob(module.content_base64),value=>value.charCodeAt(0));
    parts.set(module.name,{bytes,contentType:module.content_type});
  }
  if(!parts.has(version.main_module))throw Error('VERSION_MAIN_MODULE_MISSING');
  return parts;
}

export async function verifyBaseline(parts,inventory) {
  if(!Array.isArray(inventory)||inventory.length===0||parts.size!==inventory.length)throw Error('BASELINE_MODULE_COUNT_CHANGED');
  const names=new Set();
  for(const pin of inventory){
    const part=parts.get(pin.name);
    if(names.has(pin.name)||!part||part.bytes.length!==pin.bytes||await sha256(part.bytes)!==pin.sha256||part.contentType!==pin.contentType)throw Error('BASELINE_MODULE_CHANGED:'+pin.name);
    names.add(pin.name);
  }
  return true;
}

export function entryModule(activeMainModule) {
  if(!/^[-A-Za-z0-9_./]+\.mjs$/.test(activeMainModule)||activeMainModule.startsWith('/')||activeMainModule.split('/').includes('..')||activeMainModule.startsWith(MODULE_PREFIX))throw Error('ACTIVE_ENTRY_INVALID');
  const from=JSON.stringify('../'+activeMainModule);
  return `import previous from ${from};\nexport {LocalDemoWallet,NativeGameResources} from ${from};\nimport config from './worker-assets.mjs';\nimport {createAdditiveWorker} from './worker.mjs';\nexport default createAdditiveWorker(previous,config);\n`;
}

export function inheritedMetadata(version,{expectedActiveVersion,activeMainModule,downloadInventory,commitSha,message}) {
  if(version.id!==expectedActiveVersion||!downloadInventory.some(item=>item.name===activeMainModule))throw Error('ACTIVE_BASELINE_NOT_PROVEN');
  if(!/^[a-f0-9]{40}$/.test(commitSha))throw Error('COMMIT_SHA_REQUIRED');
  const runtime=version.resources?.script_runtime||version,bindings=version.resources?.bindings||version.bindings;
  if(version.main_module&&version.main_module!==activeMainModule)throw Error('ACTIVE_MAIN_MODULE_CHANGED');
  if(!runtime||runtime.compatibility_date!=='2026-10-01'||runtime.usage_model!=='standard'||!Array.isArray(bindings)||bindings.length!==18
    ||new Set(bindings.map(item=>item.name)).size!==18||runtime.exports?.LocalDemoWallet?.storage!=='sqlite'
    ||runtime.exports?.NativeGameResources?.storage!=='sqlite'||runtime.exports?.default?.type!=='worker'
    ||Object.keys(runtime.exports).length!==3||!bindings.some(item=>item.type==='assets'&&item.name==='NATIVE_LIBRARY_ASSETS'))throw Error('UNEXPECTED_BASELINE_CONFIG');
  const assets=version.assets?.config||(runtime.assets?{html_handling:runtime.assets.html_handling,not_found_handling:runtime.assets.not_found_handling,run_worker_first:runtime.assets.raw_run_worker_first,base_path:runtime.assets.base_path}:null);
  if(!assets||assets.html_handling!=='none'||assets.not_found_handling!=='none'||assets.run_worker_first!==true||assets.base_path!=='/')throw Error('ASSET_CONFIGURATION_NOT_PROVEN');
  return {main_module:MODULE_PREFIX+'entry.mjs',bindings:bindings.map(({name})=>({name,type:'inherit'})),keep_assets:true,assets:{config:structuredClone(assets)},
    exports:structuredClone(runtime.exports),compatibility_date:runtime.compatibility_date,
    compatibility_flags:runtime.compatibility_flags||[],usage_model:runtime.usage_model,
    annotations:{'workers/message':String(message).slice(0,1000),'workers/tag':'new-requested71-20261122-r1','workers/commit_sha':commitSha}};
}

export async function makeAdditiveForm(parts,inventory,newModules,metadata) {
  await verifyBaseline(parts,inventory);
  if(!Array.isArray(newModules))throw Error('NEW_MODULE_SET_INVALID');
  const withPreview=newModules.some(item=>PREVIEW_DEPLOYMENT_MODULES.includes(item?.name));
  const expected=[...BASE_DEPLOYMENT_MODULES,...(withPreview?PREVIEW_DEPLOYMENT_MODULES:[])];
  if(newModules.length!==expected.length||new Set(newModules.map(x=>x.name)).size!==expected.length||!expected.every(name=>newModules.some(item=>item.name===name))||metadata.main_module!==MODULE_PREFIX+'entry.mjs')throw Error('NEW_MODULE_SET_INVALID');
  const form=new FormData();
  form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));
  for(const [name,part] of parts)form.append(name,new Blob([part.bytes],{type:part.contentType}),name);
  for(const item of newModules){
    if(parts.has(item.name)||typeof item.source!=='string'||!item.source)throw Error('NON_ADDITIVE_MODULE');
    const bytes=new TextEncoder().encode(item.source);
    if(bytes.length!==item.bytes||await sha256(bytes)!==item.sha256)throw Error('NEW_MODULE_PIN_MISMATCH:'+item.name);
    form.append(item.name,new Blob([bytes],{type:'application/javascript+module'}),item.name);
  }
  return form;
}
