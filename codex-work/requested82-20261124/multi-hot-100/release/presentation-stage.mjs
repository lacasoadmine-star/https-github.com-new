/** Execute inside the authorized Cloudflare connector. Stage only the owned
 * presentation config replacement; preserve every other live module/config.
 * Activation and independent staged readback remain separate operations.
 */
export async function stageM100PresentationUpdate(cloudflare,accountId,plan){
  const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
  const bytes=s=>{const raw=atob(s),b=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);return b;};
  const enc=new TextEncoder(),canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
  const configuration=v=>Object.fromEntries(['assets','bindings','cache_options','compatibility_date','compatibility_flags','containers','exports','limits','package_dependencies','placement','usage_model'].map(k=>[k,k==='bindings'?[...(v[k]||[])].sort((a,b)=>a.name.localeCompare(b.name)):['compatibility_flags','containers'].includes(k)?v[k]||[]:v[k]??null]));
  const target='requested82m100r1/config.mjs',base='/accounts/'+accountId+'/workers',versions=base+'/workers/superwin-player/versions/';
  if(plan?.sourceCommit!=='46853da6bf407ce1fb18e5b664337714d8871bb5'||plan.baselineId!=='87fb62ad-9378-44c9-b611-6bfed03acdc1'||
    plan.replacement?.name!==target||plan.replacement.sha256!=='d23126b7022090fda0a9b588500b183b04a246f41430e8c55126edd289257130'||
    plan.replacement.bytes!==3929||plan.resourceReadbacks?.length!==2||plan.resourceReadbacks.some(p=>p.readbackVerified!==true))throw Error('M100_PRESENTATION_PLAN');
  const resourcePins=[['app.mjs',92058,'be246015f41b6c29b798639a438cd402e30cea213e97d5c30fa58266f164a649'],['page.css',22118,'9e4cfbd31c6a723946ef549f1553171ac2bf7e132ac3800d978dd124273af2b0']];
  if(resourcePins.some(([name,length,sha])=>!plan.resourceReadbacks.some(p=>p.name===name&&p.bytes===length&&p.sha256===sha&&p.key==='requested82/m100/sha256/'+sha+'/'+name)))throw Error('M100_PRESENTATION_RESOURCES');
  const deployed=async()=>(await cloudflare.request({method:'GET',path:base+'/scripts/superwin-player/deployments',query:{per_page:1}})).result.deployments[0];
  const active=await deployed(),matches=d=>d.id===active.id&&d.versions.length===1&&d.versions[0].version_id===plan.baselineId&&d.versions[0].percentage===100;
  if(!matches(active))throw Error('M100_PRESENTATION_ACTIVE_CHANGED');
  const old=(await cloudflare.request({method:'GET',path:versions+plan.baselineId,query:{include:'modules'}})).result;
  if(old.id!==plan.baselineId||old.modules?.length!==434||old.main_module!=='requested82pairr1/entry.mjs'||old.bindings?.length!==18||
    old.exports?.LocalDemoWallet?.storage!=='sqlite'||old.exports?.NativeGameResources?.storage!=='sqlite')throw Error('M100_PRESENTATION_BASELINE_CHANGED');
  const configSha=await hash(enc.encode(canonical(configuration(old))));
  if(configSha!=='15c22f1d5bd108a582fbf099ee7c774c2a26d3b914b3cfaccae683b3c201b928')throw Error('M100_PRESENTATION_RUNTIME_CHANGED');
  const inventory=[];let totalBytes=0;
  for(const module of old.modules){const b=bytes(module.content_base64);totalBytes+=b.length;inventory.push({name:module.name,bytes:b.length,contentType:module.content_type,sha256:await hash(b)});}
  if(totalBytes!==66966145)throw Error('M100_PRESENTATION_SIZE_CHANGED');
  const previous=inventory.find(p=>p.name===target);
  if(previous?.bytes!==3929||previous.sha256!=='57019e59783ab4a40e316eeafc0782e0857fb958cd917ffc6125ac9e38bfee6b')throw Error('M100_PRESENTATION_PREVIOUS_PIN');
  const retained=inventory.filter(p=>p.name!==target).sort((a,b)=>a.name.localeCompare(b.name));
  const originals=retained.filter(p=>!p.name.startsWith('requested82pairr1/'));
  if(originals.length!==430||await hash(enc.encode(JSON.stringify(originals)))!=='87c3a0878f8910e5380eccc315f65ece054678cec257dec84bac85813cd6f448')throw Error('M100_PRESENTATION_ORIGINAL_HASHES');
  const pairPins={'requested82pairr1/entry.mjs':'e2ec875958d25aac7d0eafc08cdedfc67f287c87b548c1b781e6201ed7e2b491','requested82pairr1/config.mjs':'1c18d5c4d3812bfe33f024b4a44a5035bcac97711cf06eef29037fbe93d6fef1','requested82pairr1/worker.mjs':'4ee75f9adc7b3426c3cca5bb6216e8fe976c2bbffe300c291ccbe78deb92547f'};
  if(Object.entries(pairPins).some(([name,sha])=>!retained.some(p=>p.name===name&&p.sha256===sha)))throw Error('M100_PRESENTATION_PAIR_CHANGED');
  const latest=(await cloudflare.request({method:'GET',path:versions+'latest'})).result;
  if(latest.id!==plan.baselineId||await hash(enc.encode(canonical(configuration(latest))))!==configSha)throw Error('M100_PRESENTATION_LATEST_CHANGED');
  const b=enc.encode(plan.replacement.source);
  if(b.length!==plan.replacement.bytes||await hash(b)!==plan.replacement.sha256)throw Error('M100_PRESENTATION_NEW_PIN');
  const replacement=old.modules.find(p=>p.name===target);let binary='';for(const v of b)binary+=String.fromCharCode(v);replacement.content_base64=btoa(binary);
  if(!matches(await deployed())||(await cloudflare.request({method:'GET',path:versions+'latest'})).result.id!==plan.baselineId)throw Error('M100_PRESENTATION_CONCURRENT_CHANGE');
  const staged=(await cloudflare.request({method:'PATCH',path:versions+'latest',query:{deploy:false},contentType:'application/merge-patch+json',body:{main_module:old.main_module,modules:old.modules,annotations:{'workers/message':'M100 authenticated catalogue compatibility fix; source '+plan.sourceCommit+'; 433 retained modules, 20 native media and 9 audio unchanged','workers/tag':'requested20-m100-auth-20261126'}}})).result;
  if(!staged?.id)throw Error('M100_PRESENTATION_STAGE_ID');
  return{schema:'zplay/m100-presentation-staged/v1',sourceCommit:plan.sourceCommit,baselineId:plan.baselineId,id:staged.id,number:staged.number,
    mainModule:old.main_module,moduleCount:434,retainedModules:433,changedModules:1,totalBytes,configurationSha256:configSha,
    retainedInventorySha256:await hash(enc.encode(JSON.stringify(retained))),newConfigSha256:plan.replacement.sha256,
    fullReadbackRequired:true,activated:false};
}
