// This file makes no request when imported. The caller supplies the authorized
// Cloudflare connector request function. No CLI credentials or deployment call.
const SHA256_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);

// Incremental hashing avoids allocating a second full decoded module or Worker.
export class IncrementalSHA256 {
  constructor() {
    this.h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    this.w = new Uint32Array(64); this.tail = new Uint8Array(64);
    this.used = 0; this.length = 0; this.finished = false;
  }
  block(bytes, offset) {
    const w = this.w;
    for (let i=0; i<16; i++) { const p=offset+i*4; w[i]=(bytes[p]<<24)|(bytes[p+1]<<16)|(bytes[p+2]<<8)|bytes[p+3]; }
    for (let i=16; i<64; i++) {
      const x=w[i-15], y=w[i-2];
      const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3);
      const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10);
      w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
    }
    let [a,b,c,d,e,f,g,h]=this.h;
    for (let i=0; i<64; i++) {
      const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
      const t1=(h+s1+((e&f)^(~e&g))+SHA256_K[i]+w[i])>>>0;
      const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
      const t2=(s0+((a&b)^(a&c)^(b&c)))>>>0;
      h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    const next=[a,b,c,d,e,f,g,h];
    for (let i=0; i<8; i++) this.h[i]=(this.h[i]+next[i])>>>0;
  }
  update(bytes) {
    if (this.finished) throw Error('HASH_ALREADY_FINALIZED');
    this.length += bytes.length;
    let offset=0;
    if (this.used) {
      const n=Math.min(64-this.used, bytes.length);
      this.tail.set(bytes.subarray(0,n), this.used); this.used+=n; offset+=n;
      if (this.used===64) { this.block(this.tail,0); this.used=0; }
    }
    while (offset+64<=bytes.length) { this.block(bytes,offset); offset+=64; }
    if (offset<bytes.length) { this.tail.set(bytes.subarray(offset),0); this.used=bytes.length-offset; }
    return this;
  }
  hex() {
    if (this.finished) throw Error('HASH_ALREADY_FINALIZED');
    const bits=this.length*8;
    this.tail[this.used++]=0x80;
    if (this.used>56) { this.tail.fill(0,this.used); this.block(this.tail,0); this.used=0; }
    this.tail.fill(0,this.used,56);
    const view=new DataView(this.tail.buffer);
    view.setUint32(56,Math.floor(bits/0x100000000),false); view.setUint32(60,bits>>>0,false);
    this.block(this.tail,0); this.finished=true;
    return Array.from(this.h, x=>x.toString(16).padStart(8,'0')).join('');
  }
}

export function canonical(value) {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
export function hashText(value) { return new IncrementalSHA256().update(new TextEncoder().encode(value)).hex(); }
export function hashBase64(content) {
  if (typeof content!=='string' || content.length%4) throw Error('INVALID_BASE64_MODULE');
  const hash=new IncrementalSHA256(); let bytes=0;
  for (let offset=0; offset<content.length; offset+=65536) {
    const text=content.slice(offset,offset+65536);
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text) || (offset+text.length<content.length && text.includes('='))) throw Error('INVALID_BASE64_MODULE');
    const binary=atob(text), chunk=new Uint8Array(binary.length);
    for (let i=0; i<binary.length; i++) chunk[i]=binary.charCodeAt(i);
    hash.update(chunk); bytes+=chunk.length;
  }
  return {sha256:hash.hex(),bytes};
}

export function configSnapshot(version) {
  const out={};
  const keys=['main_module','assets','bindings','cache_options','compatibility_date','containers','exports','limits','package_dependencies','placement','usage_model'];
  for (const key of keys) if (Object.hasOwn(version,key)) out[key]=version[key];
  out.compatibility_flags=[...(version.compatibility_flags || [])].sort();
  if (out.bindings) out.bindings=[...out.bindings].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  return out;
}
export function configHash(version) { return hashText(canonical(configSnapshot(version))); }

export function inspectModules(modules, expected) {
  if (!Array.isArray(modules) || modules.length!==expected.length) throw Error('MODULE_COUNT_CHANGED');
  const expectedMap=new Map(expected.map(m=>[m.name,m]));
  if (expectedMap.size!==expected.length) throw Error('DUPLICATE_EXPECTED_MODULE');
  const seen=new Set(), inventory=[];
  for (const module of modules) {
    const match=expectedMap.get(module.name);
    if (!match || seen.has(module.name)) throw Error('MODULE_NAMES_CHANGED');
    if (module.content_type!==match.content_type) throw Error('MODULE_TYPE_CHANGED:'+module.name);
    if (module.content_base64?.length!==match.base64_chars) throw Error('MODULE_LENGTH_CHANGED:'+module.name);
    seen.add(module.name);
    const digest=hashBase64(module.content_base64);
    if (match.sha256 && digest.sha256!==match.sha256) throw Error('MODULE_BYTES_CHANGED:'+module.name);
    inventory.push({name:module.name,content_type:module.content_type,base64_chars:module.content_base64.length,...digest});
  }
  return inventory.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
}

// All emitted chunks are <=64 KiB. Only the modules field enters the PATCH.
// Release already-sent base64 strings before reading the staged full version.
export function modulesPatchStream(modules, {release=true}={}) {
  const encoder=new TextEncoder();
  function* chunks() {
    yield encoder.encode('{"modules":[');
    for (let i=0; i<modules.length; i++) {
      const module=modules[i];
      const header=(i?',':'')+'{"name":'+JSON.stringify(module.name)+',"content_type":'+JSON.stringify(module.content_type)+',"content_base64":"';
      if (encoder.encode(header).length>65536) throw Error('MODULE_HEADER_TOO_LARGE');
      yield encoder.encode(header);
      for (let offset=0; offset<module.content_base64.length; offset+=65536) yield encoder.encode(module.content_base64.slice(offset,offset+65536));
      yield encoder.encode('"}');
      if (release) module.content_base64='';
    }
    yield encoder.encode(']}');
  }
  const iterator=chunks();
  return new ReadableStream({
    pull(controller) { const item=iterator.next(); if (item.done) controller.close(); else controller.enqueue(item.value); },
    cancel() { iterator.return(); if (release) for (const module of modules) module.content_base64=''; }
  }, {highWaterMark:1});
}

export async function stageNew74Version(request, cfg) {
  if (!/^[a-f0-9]{32}$/.test(cfg.accountId || '') || cfg.scriptName!=='superwin-player') throw Error('UNREVIEWED_TARGET');
  if (cfg.changedModule!=='new74-router-r1.mjs' || !Array.isArray(cfg.expectedModules) || cfg.expectedModules.length!==cfg.expectedModuleCount) throw Error('INVALID_REPLACEMENT_SCOPE');
  if (!/^[a-f0-9-]{36}$/.test(cfg.expectedVersion || '') || !Number.isInteger(cfg.expectedVersionNumber)) throw Error('INVALID_BASELINE');
  const replacement=hashBase64(cfg.replacementBase64);
  if (replacement.sha256!==cfg.replacementSha256) throw Error('REPLACEMENT_HASH_MISMATCH');
  const versionBase=`/accounts/${cfg.accountId}/workers/workers/${cfg.scriptName}/versions`;
  const scriptBase=`/accounts/${cfg.accountId}/workers/scripts/${cfg.scriptName}`;
  let stagedVersionId=null, stageWriteAttempted=false;
  const call=async options=>{
    const result=await request(options);
    if (result && result.success===false) throw Error('CLOUDFLARE_REQUEST_FAILED');
    return result?.result ?? result;
  };
  const active=async expectedDeploymentId=>{
    const data=await call({method:'GET',path:scriptBase+'/deployments',query:{per_page:1}});
    const deployment=data?.deployments?.[0], versions=deployment?.versions;
    if (!deployment?.id || versions?.length!==1 || versions[0].version_id!==cfg.expectedVersion || versions[0].percentage!==100) throw Error('DEPLOYED_VERSION_CHANGED');
    if (expectedDeploymentId && deployment.id!==expectedDeploymentId) throw Error('DEPLOYMENT_CHANGED');
    return deployment.id;
  };
  const latest=async (expectedId=cfg.expectedVersion, expectedConfig=cfg.expectedConfigSha256)=>{
    const version=await call({method:'GET',path:versionBase+'/latest'});
    if (version.id!==expectedId || (expectedId===cfg.expectedVersion && version.number!==cfg.expectedVersionNumber)) throw Error('LATEST_UPLOADED_VERSION_CHANGED');
    if (configHash(version)!==expectedConfig) throw Error('LATEST_CONFIGURATION_CHANGED');
    return version;
  };
  try {
    const deploymentId=await active(); await latest();
    let source=await call({method:'GET',path:versionBase+'/'+cfg.expectedVersion,query:{include:'modules'}});
    if (source.id!==cfg.expectedVersion || source.number!==cfg.expectedVersionNumber || source.main_module!==cfg.expectedMainModule || configHash(source)!==cfg.expectedConfigSha256) throw Error('SOURCE_BASELINE_MISMATCH');
    const before=inspectModules(source.modules,cfg.expectedModules);
    const changed=before.find(m=>m.name===cfg.changedModule);
    if (!changed || changed.sha256!==cfg.originalRouterSha256) throw Error('ORIGINAL_ROUTER_HASH_MISMATCH');
    if (changed.sha256===replacement.sha256) throw Error('REPLACEMENT_IS_UNCHANGED');
    const afterExpected=before.map(m=>m.name===cfg.changedModule?{...m,base64_chars:cfg.replacementBase64.length,...replacement}:m);
    const plan={
      script:cfg.scriptName,baselineVersion:cfg.expectedVersion,baselineNumber:cfg.expectedVersionNumber,
      activeDeploymentId:deploymentId,mainModule:cfg.expectedMainModule,modules:before.length,
      changedModules:[cfg.changedModule],unchangedModules:before.length-1,patchFields:['modules'],
      configBeforeSha256:cfg.expectedConfigSha256,
      modulesBeforeSha256:hashText(canonical(before)),modulesExpectedAfterSha256:hashText(canonical(afterExpected)),
      originalRouterSha256:changed.sha256,replacementRouterSha256:replacement.sha256,
      streamChunkLimitBytes:65536,deploy:false
    };
    // The full source read and hashing can take time. Repeat both guards now.
    await active(deploymentId); await latest();
    if (cfg.stage!==true) return {ok:true,dryRun:true,staged:false,deployed:false,plan};
    source.modules.find(m=>m.name===cfg.changedModule).content_base64=cfg.replacementBase64;
    stageWriteAttempted=true;
    const response=await call({method:'PATCH',path:versionBase+'/latest',query:{deploy:false},contentType:'application/merge-patch+json',body:modulesPatchStream(source.modules)});
    // No references to the large source survive into the next full source GET.
    for (const module of source.modules) module.content_base64='';
    source=null;
    stagedVersionId=response?.id;
    if (!stagedVersionId || stagedVersionId===cfg.expectedVersion) throw Error('STAGED_VERSION_ID_MISSING');
    if (response.modules) delete response.modules;
    await active(deploymentId);
    await latest(stagedVersionId);
    const after=await call({method:'GET',path:versionBase+'/'+stagedVersionId,query:{include:'modules'}});
    if (after.id!==stagedVersionId || after.main_module!==cfg.expectedMainModule) throw Error('STAGED_MAIN_MODULE_CHANGED');
    const configAfterSha256=configHash(after);
    if (configAfterSha256!==cfg.expectedConfigSha256) throw Error('STAGED_CONFIGURATION_CHANGED');
    const inventory=inspectModules(after.modules,afterExpected);
    const modulesAfterSha256=hashText(canonical(inventory));
    if (modulesAfterSha256!==plan.modulesExpectedAfterSha256) throw Error('STAGED_MODULE_INVENTORY_CHANGED');
    for (const module of after.modules) module.content_base64='';
    await active(deploymentId); await latest(stagedVersionId);
    return {ok:true,dryRun:false,staged:true,deployed:false,stagedVersionId,stagedVersionNumber:after.number,plan,verification:{allModuleBytesVerified:true,unchangedModuleCount:before.length-1,changedModuleCount:1,configAfterSha256,modulesAfterSha256,productionDeploymentUnchanged:true}};
  } catch (error) {
    if (stagedVersionId) error.stagedVersionId=stagedVersionId;
    error.stageWriteAttempted=stageWriteAttempted;
    throw error;
  }
}
