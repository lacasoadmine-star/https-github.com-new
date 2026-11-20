// Byte-preserving additive upload helpers. The caller supplies reviewed modules,
// pins the current version, and keeps deployment as a separate verified action.
export function parseMultipart(input) {
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 const encoder=new TextEncoder(),decoder=new TextDecoder();
 const find=(needle,from=0)=>{outer:for(let i=from;i<=bytes.length-needle.length;i++){if(bytes[i]!==needle[0])continue;for(let j=1;j<needle.length;j++)if(bytes[i+j]!==needle[j])continue outer;return i;}return -1;};
 const crlf=encoder.encode('\r\n'),first=find(crlf);
 if(first<3||first>256||bytes[0]!==45||bytes[1]!==45)throw Error('INVALID_MULTIPART_BOUNDARY');
 const boundary=decoder.decode(bytes.subarray(2,first));
 const delimiter=encoder.encode('\r\n--'+boundary),headerEnd=encoder.encode('\r\n\r\n'),parts=new Map();
 let position=first+2;
 while(position<bytes.length){
  const headersEnd=find(headerEnd,position);if(headersEnd<0||headersEnd-position>8192)throw Error('INVALID_PART_HEADERS');
  const headers=decoder.decode(bytes.subarray(position,headersEnd));
  const name=headers.match(/(?:^|\r\n)Content-Disposition:\s*form-data;\s*name="([^"]+)"/i)?.[1];
  if(!name||parts.has(name)||!/^[-A-Za-z0-9_./]+\.(?:mjs|bin)$/.test(name)||name.split('/').includes('..'))throw Error('INVALID_PART_NAME');
  const next=find(delimiter,headersEnd+4);if(next<0)throw Error('MISSING_PART_DELIMITER');
  parts.set(name,bytes.subarray(headersEnd+4,next));
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

export async function verifyParts(parts,inventory) {
 if(parts.size!==inventory.length)throw Error('BASELINE_MODULE_COUNT_CHANGED');
 for(const item of inventory){
  const bytes=parts.get(item.name);
  if(!bytes||bytes.length!==item.size||await sha256(bytes)!==item.sha256)throw Error('BASELINE_MODULE_CHANGED:'+item.name);
 }
 return true;
}

export function versionMetadata(version,{mainModule,commitSha,message,tag}) {
 if(!/^[0-9a-f]{40}$/.test(commitSha))throw Error('COMMIT_SHA_REQUIRED');
 const runtime=version.resources?.script_runtime,bindings=version.resources?.bindings;
 if(!runtime||!Array.isArray(bindings)||bindings.length!==18||runtime.compatibility_date!=='2026-10-01'
   ||runtime.exports?.LocalDemoWallet?.storage!=='sqlite'||runtime.exports?.NativeGameResources?.storage!=='sqlite'
   ||runtime.exports?.default?.type!=='worker'||Object.keys(runtime.exports).length!==3)throw Error('UNEXPECTED_BASELINE_CONFIG');
 return {
  main_module:mainModule,
  bindings:bindings.map(({name})=>({name,type:'inherit'})),
  keep_assets:true,
  exports:structuredClone(runtime.exports),
  compatibility_date:runtime.compatibility_date,
  compatibility_flags:runtime.compatibility_flags||[],
  usage_model:runtime.usage_model,
  annotations:{'workers/message':message,'workers/tag':tag,'workers/commit_sha':commitSha},
 };
}

export function makeUploadForm(parts,newModules,metadata) {
 const main=metadata.main_module?.match(/^(native72dedicated(?:r1|mh40r3|safarir4))\/entry\.mjs$/);
 if(!main||!newModules.some(({name})=>name===metadata.main_module))throw Error('INVALID_UPLOAD_ENTRY');
 const added=new Set(parts.keys());
 const form=new FormData();form.append('metadata',new Blob([JSON.stringify(metadata)],{type:'application/json'}));
 for(const [name,bytes]of parts)form.append(name,new Blob([bytes],{type:name.endsWith('.mjs')?'application/javascript+module':'application/octet-stream'}),name);
 for(const {name,source} of newModules){
  if(added.has(name)||!name.startsWith(main[1]+'/')||!/^\w[\w-]*\.mjs$/.test(name.slice(main[1].length+1)))throw Error('NON_ADDITIVE_MODULE');
  added.add(name);
  form.append(name,new Blob([source],{type:'application/javascript+module'}),name);
 }
 return form;
}
