// Run through the connected Cloudflare execute tool, passing the two local sources.
// Only the existing superwin-player script's content is replaced; config is retained.
export async function deployNew74({cloudflare,accountId,entry,router,expectedVersion='a8a7033f-74cb-49b8-8c17-24b226879d68',expectedModuleCount=316}){
 const base='/accounts/'+accountId+'/workers/scripts/superwin-player';
 const expected=expectedVersion;
 const latest=(await cloudflare.request({method:'GET',path:base+'/deployments',query:{per_page:1}})).result.deployments[0];
 if(latest.versions.length!==1||latest.versions[0].version_id!==expected||latest.versions[0].percentage!==100)throw Error('LIVE_VERSION_CHANGED');
 const beforeSettings=await cloudflare.request({method:'GET',path:base+'/settings'});
 const raw=await cloudflare.request({method:'GET',path:base});
 if(!(raw instanceof Uint8Array))throw Error('EXPECTED_BINARY_MULTIPART');
 const text=new TextDecoder(),enc=new TextEncoder(),boundary=text.decode(raw.slice(0,160)).split('\r\n')[0];
 if(!/^--[a-z0-9]+$/i.test(boundary))throw Error('INVALID_BOUNDARY');
 const separator=enc.encode('\r\n'+boundary),headersEnd=enc.encode('\r\n\r\n');
 function find(haystack,needle,start){outer:for(let i=start;i<=haystack.length-needle.length;i++){for(let j=0;j<needle.length;j++)if(haystack[i+j]!==needle[j])continue outer;return i;}return -1;}
 const original=[];let start=boundary.length+2;
 while(start<raw.length){
  const headerEnd=find(raw,headersEnd,start);if(headerEnd<0)throw Error('INVALID_PART_HEADER');
  const header=text.decode(raw.subarray(start,headerEnd)),name=/name="([^"]+)"/.exec(header)?.[1],end=find(raw,separator,headerEnd+4);
  if(!name||end<0)throw Error('INVALID_MULTIPART');
  const bytes=raw.subarray(headerEnd+4,end),type=/Content-Type:\s*([^\r\n]+)/i.exec(header)?.[1]||(name.endsWith('.mjs')?'application/javascript+module':'application/octet-stream');
  original.push({name,bytes,type});const after=end+separator.length;
  if(raw[after]===45&&raw[after+1]===45)break;
  if(raw[after]!==13||raw[after+1]!==10)throw Error('INVALID_PART_DELIMITER');start=after+2;
 }
 if(original.length!==expectedModuleCount||new Set(original.map(p=>p.name)).size!==original.length||!original.some(p=>p.name==='native-game-entry-r23.mjs'))throw Error('UNEXPECTED_ORIGINAL_MODULES');
 const retained=original.filter(p=>!['new74-entry-r1.mjs','new74-router-r1.mjs'].includes(p.name));
 const sha=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const hashes=await Promise.all(retained.map(async p=>({name:p.name,bytes:p.bytes.length,sha256:await sha(p.bytes)})));
 const form=new FormData();form.append('metadata',new Blob([JSON.stringify({main_module:'new74-entry-r1.mjs'})],{type:'application/json'}));
 for(const p of retained)form.append(p.name,new Blob([p.bytes],{type:p.type}),p.name);
 for(const[name,code]of [['new74-entry-r1.mjs',entry],['new74-router-r1.mjs',router]])form.append(name,new Blob([code],{type:'application/javascript+module'}),name);
 const uploaded=await cloudflare.request({method:'PUT',path:base+'/content',body:form});
 if(!uploaded.success)throw Error('CONTENT_UPLOAD_FAILED');
 const afterSettings=await cloudflare.request({method:'GET',path:base+'/settings'});
 const configuration=value=>{const {annotations,...rest}=value;return rest;};
 if(JSON.stringify(configuration(beforeSettings.result))!==JSON.stringify(configuration(afterSettings.result)))throw Error('SETTINGS_CHANGED_AFTER_CONTENT_UPLOAD');
 const deployed=(await cloudflare.request({method:'GET',path:base+'/deployments',query:{per_page:1}})).result.deployments[0];
 return {previousVersion:expected,deployedVersion:deployed.versions,settingsUnchanged:true,oldModuleCount:retained.length,oldModuleBytes:retained.reduce((n,p)=>n+p.bytes.length,0),addedModules:['new74-entry-r1.mjs','new74-router-r1.mjs'],originalModuleHashes:hashes};
}
