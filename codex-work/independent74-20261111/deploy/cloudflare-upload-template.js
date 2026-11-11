async () => {
  // Replace this token with a JSON object before passing the function to Cloudflare execute.
  // dryRun defaults to true; only dryRun:false performs the version upload.
  // modules: [{name, type:'application/javascript+module', source}], additionalBindings: [].
  const cfg = __UPLOAD_CONFIG__;
  const expected = cfg.expectedVersion || '3ae79dd2-afba-4dcd-bd20-a071ada030a7';
  const script = cfg.scriptName || 'superwin-player';
  const workerId = cfg.workerId || 'de2bde7dad5e46b8ace8b00c0daf5450';
  const main = cfg.mainModule || 'independent74-entry-r1.mjs';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const canonical = value => JSON.stringify(value, function(_key,v) {
    return v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v;
  });
  const base = `/accounts/${accountId}/workers/scripts/${script}`;
  const versionBase = `/accounts/${accountId}/workers/workers/${workerId}/versions`;
  const request = async options => {
    const r = await cloudflare.request(options);
    if (r && typeof r === 'object' && 'success' in r && !r.success) throw Error('CLOUDFLARE_API_FAILED');
    return r;
  };
  const active = async () => {
    const r = await request({method:'GET',path:base+'/deployments',query:{per_page:1}});
    const a = r.result?.deployments?.[0]?.versions;
    if (!a || a.length !== 1 || a[0].version_id !== expected || a[0].percentage !== 100) throw Error('DEPLOYED_VERSION_CHANGED');
  };
  const latest = async () => (await request({method:'GET',path:versionBase+'/latest'})).result;
  const assertLatest = async () => {
    const r = await latest();
    if (r.id !== expected) throw Error('LATEST_UPLOADED_VERSION_CHANGED');
    return r;
  };
  await active();
  const current = await assertLatest();
  if (!current.main_module || !current.bindings || !current.exports) throw Error('CURRENT_METADATA_INCOMPLETE');
  const raw = await request({method:'GET',path:base+'/content/v2'});
  if (!(raw instanceof Uint8Array) || raw.byteLength < 1000) throw Error('EXPECTED_MULTIPART_BYTES');
  const lineEnd = raw.indexOf(13);
  if (lineEnd < 3 || lineEnd > 200) throw Error('INVALID_MULTIPART_BOUNDARY');
  const firstBoundary = dec.decode(raw.subarray(0,lineEnd));
  if (!firstBoundary.startsWith('--')) throw Error('INVALID_MULTIPART_BOUNDARY');
  const boundary = firstBoundary.slice(2);
  const sha = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const scan = async (bytes,token) => {
    const mark = enc.encode('--'+token), marks = [];
    for (let i=0;i<bytes.length;i++) {
      if (bytes[i] !== 45 || (i > 0 && (bytes[i-2] !== 13 || bytes[i-1] !== 10))) continue;
      let match=true;
      for (let j=0;j<mark.length;j++) if (bytes[i+j] !== mark[j]) {match=false;break;}
      if (match) {marks.push(i);i+=mark.length-1;}
    }
    if (marks.length < 2 || bytes[marks.at(-1)+mark.length] !== 45) throw Error('MULTIPART_TERMINATOR_MISSING');
    const parts=[];
    for (let k=0;k<marks.length-1;k++) {
      const p=marks[k], header=dec.decode(bytes.subarray(p,Math.min(p+8192,marks[k+1])));
      const end=header.indexOf('\r\n\r\n');
      const name=/Content-Disposition:[^\r\n]*\bname="([^"]+)"/i.exec(header)?.[1];
      const type=/Content-Type:\s*([^\r\n]+)/i.exec(header)?.[1];
      if (end<0 || !name || !type) throw Error('PART_HEADERS_INCOMPLETE');
      const body=bytes.subarray(p+end+4,marks[k+1]-2);
      parts.push({name,type,size:body.byteLength,sha256:await sha(body),start:p,end:marks[k+1]});
    }
    return parts;
  };
  const scanned = await scan(raw,boundary);
  const original = scanned.map(({start,end,...part})=>part);
  if (!original.some(p=>p.name === current.main_module) || original.some(p=>p.name === 'metadata')) throw Error('SOURCE_MAIN_MODULE_MISSING_OR_UNEXPECTED_METADATA');
  // Only our own previously deployed namespace can be replaced. Exact hashes
  // bind the operation to the inspected release; legacy modules cannot enter it.
  const removed=new Set();
  for(const part of cfg.replaceModules||[]) {
    if(!/^independent74-(assets|catalog|gateway|entry)-r[1-9][0-9]*\.mjs$/.test(part.name)||removed.has(part.name))throw Error('REPLACEMENT_OUTSIDE_OWN_NAMESPACE');
    const previous=original.find(p=>p.name===part.name);
    if(!previous||previous.sha256!==part.sha256)throw Error('REPLACEMENT_HASH_MISMATCH');
    removed.add(part.name);
  }
  const preserved=original.filter(p=>!removed.has(p.name));
  const existing = new Set(original.map(p=>p.name));
  const added = cfg.modules || [];
  const moduleNames = new Set();
  const typeAllowed = new Set(['application/javascript+module','text/javascript+module','application/javascript','text/javascript','text/plain','application/octet-stream','application/wasm','application/source-map']);
  for (const m of added) {
    if (!/^[a-zA-Z0-9_./-]+$/.test(m.name) || m.name.includes('..') || existing.has(m.name) || moduleNames.has(m.name)) throw Error('MODULE_NAME_COLLISION_OR_INVALID');
    if (!typeAllowed.has(m.type) || typeof m.source !== 'string') throw Error('INVALID_NEW_MODULE');
    moduleNames.add(m.name);
  }
  if (!moduleNames.has(main)) throw Error('NEW_MAIN_MODULE_MISSING');
  const inherited = current.bindings.map(b=>({name:b.name,type:'inherit',version_id:'latest'}));
  const names = new Set(inherited.map(b=>b.name));
  const additions = cfg.additionalBindings || [];
  for (const b of additions) {
    if (!b.name || !b.type || names.has(b.name)) throw Error('BINDING_NAME_COLLISION_OR_INVALID');
    names.add(b.name);
  }
  const metadata = {
    main_module:main,
    compatibility_date:current.compatibility_date,
    compatibility_flags:current.compatibility_flags || [],
    bindings:[...inherited,...additions],
    keep_assets:true,
    assets:{config:current.assets?.config || {}},
    exports:current.exports,
    usage_model:current.usage_model,
    annotations:{'workers/message':cfg.message || 'Add isolated independent74 routes; preserve all legacy modules and bindings'}
  };
  for (const key of ['cache_options','placement','limits']) if (current[key]) metadata[key]=current[key];
  const manifestSha256=await sha(enc.encode(JSON.stringify(original)));
  const plan={expectedVersion:expected,previousMain:current.main_module,newMain:main,originalModules:preserved.length,replacedOwnModules:[...removed],originalBytes:raw.byteLength,manifestSha256,addedModules:added.map(m=>m.name),bindingNames:[...names],assetsConfig:metadata.assets.config,exports:metadata.exports};
  if (cfg.dryRun !== false) return {dryRun:true,plan,originalManifest:preserved};
  let prefix=`--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  for (const m of added) prefix+=`--${boundary}\r\nContent-Disposition: form-data; name="${m.name}"; filename="${m.name}"\r\nContent-Type: ${m.type}\r\n\r\n${m.source}\r\n`;
  const intro=enc.encode(prefix);
  const chunks=removed.size?[...scanned.filter(p=>!removed.has(p.name)).map(p=>raw.subarray(p.start,p.end)),raw.subarray(scanned.at(-1).end)]:[raw];
  let phase=0,offset=0,chunk=0;
  const body=new ReadableStream({pull(controller){
    if (phase===0) {controller.enqueue(intro);phase=1;return;}
    while(chunk<chunks.length&&offset>=chunks[chunk].length){chunk++;offset=0;}
    if (chunk<chunks.length) {const bytes=chunks[chunk],end=Math.min(offset+65536,bytes.length);controller.enqueue(bytes.subarray(offset,end));offset=end;return;}
    controller.close();
  }});
  // Recheck after downloading/hashing the large source to avoid staging over a concurrent upload.
  await active();
  await assertLatest();
  const uploaded=await request({method:'POST',path:base+'/versions',query:{bindings_inherit:'strict'},contentType:`multipart/form-data; boundary=${boundary}`,body});
  const id=uploaded.result?.id;
  if (!id) throw Error('VERSION_UPLOAD_ID_MISSING');
  // A version upload must not change production traffic.
  await active();
  const after=(await request({method:'GET',path:versionBase+'/'+id})).result;
  if (after.main_module !== main || after.compatibility_date !== current.compatibility_date) throw Error('UPLOADED_VERSION_CONFIGURATION_MISMATCH');
  const afterNames=new Set((after.bindings || []).map(b=>b.name));
  if (afterNames.size !== names.size || [...names].some(n=>!afterNames.has(n))) throw Error('UPLOADED_BINDINGS_MISMATCH');
  for (const b of current.bindings) if (canonical((after.bindings || []).find(a=>a.name===b.name)) !== canonical(b)) throw Error('INHERITED_BINDING_CONFIGURATION_MISMATCH:'+b.name);
  if (canonical(after.assets?.config) !== canonical(current.assets?.config)) throw Error('UPLOADED_ASSETS_CONFIGURATION_MISMATCH');
  if (canonical(after.exports) !== canonical(current.exports)) throw Error('UPLOADED_EXPORTS_MISMATCH');
  return {uploaded:true,deployed:false,id,number:after.number,plan,originalManifest:preserved};
}
