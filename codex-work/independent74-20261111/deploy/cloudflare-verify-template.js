async () => {
  // Replace this token with JSON {expectedVersion,originalManifest,newModuleNames}.
  const cfg=__VERIFY_CONFIG__;
  const base=`/accounts/${accountId}/workers/scripts/superwin-player`;
  const r=await cloudflare.request({method:'GET',path:`/accounts/${accountId}/workers/workers/de2bde7dad5e46b8ace8b00c0daf5450/versions/latest`});
  if (r.result?.id!==cfg.expectedVersion) throw Error('LATEST_VERSION_CHANGED');
  const bytes=await cloudflare.request({method:'GET',path:base+'/content/v2'});
  if (!(bytes instanceof Uint8Array)) throw Error('EXPECTED_MULTIPART_BYTES');
  const enc=new TextEncoder(),dec=new TextDecoder();
  const end=bytes.indexOf(13),boundary=dec.decode(bytes.subarray(0,end));
  const marker=enc.encode(boundary),marks=[];
  for(let i=0;i<bytes.length;i++) {
    if(bytes[i]!==45 || (i>0&&(bytes[i-2]!==13||bytes[i-1]!==10))) continue;
    let ok=true;for(let j=0;j<marker.length;j++)if(bytes[i+j]!==marker[j]){ok=false;break;}
    if(ok){marks.push(i);i+=marker.length-1;}
  }
  const actual=new Map();
  for(let k=0;k<marks.length-1;k++) {
    const p=marks[k],header=dec.decode(bytes.subarray(p,Math.min(p+8192,marks[k+1]))),h=header.indexOf('\r\n\r\n');
    const name=/Content-Disposition:[^\r\n]*\bname="([^"]+)"/i.exec(header)?.[1];
    const type=/Content-Type:\s*([^\r\n]+)/i.exec(header)?.[1];
    if(!name||!type||h<0)throw Error('INVALID_PART');
    const content=bytes.subarray(p+h+4,marks[k+1]-2);
    const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',content))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(actual.has(name))throw Error('DUPLICATE_PART');
    actual.set(name,{name,type,size:content.byteLength,sha256});
  }
  const failures=[];
  for(const old of cfg.originalManifest) {
    const now=actual.get(old.name);
    if(!now||now.type!==old.type||now.size!==old.size||now.sha256!==old.sha256)failures.push(old.name);
  }
  for(const name of cfg.newModuleNames||[])if(!actual.has(name))failures.push(name);
  const expectedCount=cfg.originalManifest.length+(cfg.newModuleNames||[]).length;
  if(actual.size!==expectedCount)failures.push('UNEXPECTED_MODULE_COUNT');
  if(failures.length)throw Error('MODULE_PRESERVATION_FAILED:'+failures.join(','));
  return {verified:true,version:cfg.expectedVersion,originalModulesPreserved:cfg.originalManifest.length,totalModules:actual.size,bytes:bytes.byteLength};
}
