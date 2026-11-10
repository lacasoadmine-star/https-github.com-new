import {bounded,reply,fail} from './reference-resources-r14.mjs';
const PREFIX='/native-library/remaining20/20261110-construction-r17/';
const RECENT='/native-library/remaining20/20261110-construction-r16b/';
const SHARED='/native-library/remaining20/20261110-construction-r15/';
const EARLIER='/native-library/remaining20/20261110-construction-r16/';
const PREVIOUS='/native-library/remaining20/20261110-reference-mobile-r14/';
const IDS=new Set(['multihot100_native','habeshafortune5_native','multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native','coinminer_native']);
const GROUPS=new Set(['5fddea498e1f0d39','7161514f85b0565e','b930310f3d5338cd','3d420e4fe5830b46','fe6fe5c2996189a2','6d57eebb88faa105','cc0f22635df0e9c7']);
async function text(response,limit){
 let bytes=await bounded(response.body,limit);
 if(response.headers.get('content-encoding')==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),limit);
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export function installMobileDisplay(previous){
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),path=url.pathname;
  const resourcePrefix=[PREFIX,RECENT,EARLIER,SHARED].find(prefix=>path.startsWith(prefix));
  if(resourcePrefix){
   const name=path.slice(resourcePrefix.length),match=name.match(/^([a-f0-9]{16})\/([a-zA-Z0-9_./-]+)$/);
   if(match&&GROUPS.has(match[1])&&!match[2].includes('..')||name==='frame.css'||name==='hood-logo.png'||name==='reference-state.mjs'){
    if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
    if(resourcePrefix===PREFIX&&match&&/^(?:app|smartsoft-startup)\.mjs$/.test(match[2])){
     const target=new URL(SHARED+'runtime-r17/'+name,url.origin);
     const patched=await previous.fetch(new Request(target,{method:request.method,headers:{accept:'*/*'},redirect:'manual'}),env,ctx);
     if(patched.status!==404)return patched;
    }
    url.pathname=PREVIOUS+name;url.search='';
    const response=await previous.fetch(new Request(url,{headers:{accept:'*/*'},redirect:'manual'}),env,ctx);
    if(response.status!==200||!name.endsWith('.mjs'))return reply(response,response.body,request.method,response.headers.get('content-type')||'application/octet-stream',response.status===200);
    try{
     let source=(await text(response,2097152)).replaceAll(PREVIOUS,resourcePrefix);
     if(match?.[2]==='scene.mjs'){
      const opaque="canvas.getContext('2d',{alpha:false})";
      if(source.split(opaque).length!==2)throw Error('REFERENCE_CANVAS_CONTRACT_CHANGED');
      source=source.replace(opaque,"canvas.getContext('2d',{alpha:true})");
     }
     return reply(response,source,request.method,'application/javascript; charset=utf-8',true);
    }catch{return fail('REFERENCE_MODULE_CHANGED');}
   }
   // The R14 projection is imported by the R15 display wrapper, never recursively.
   if(name==='smartsoft-mobile.mjs'){
    const target=new URL(SHARED+(resourcePrefix===PREFIX?'runtime-r17/mobile-runtime-r17.mjs':resourcePrefix===RECENT?'mobile-controls-r16b.mjs':resourcePrefix===EARLIER?'mobile-controls-r16.mjs':'mobile-display.mjs'),url.origin);
    return previous.fetch(new Request(target,{method:request.method,redirect:'manual'}),env,ctx);
   }
   // New immutable URLs reuse the original assets and the shared projection.
   // These public requests never carry account headers to the asset binding.
   const target=new URL(SHARED+name,url.origin);
   return previous.fetch(new Request(target,{method:request.method,redirect:'manual'}),env,ctx);
  }
  const id=path.match(/^\/games\/([a-z0-9_]+)$/)?.[1];
  if(!IDS.has(id))return previous.fetch(request,env,ctx);
  if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
  const response=await previous.fetch(new Request(request,{method:'GET'}),env,ctx);
  if(response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  try{
   const html=await text(response,131072);
   if(!html.includes(PREVIOUS)||!html.includes('</head>'))return fail('REFERENCE_SHELL_CHANGED');
   const current=id!=='coinminer_native';
   return reply(response,html.replaceAll(PREVIOUS,current?PREFIX:RECENT).replace('<html ',current?'<html data-reference-display="r17" data-native-entry="loading" ':'<html data-reference-display="r16" ')
    .replace('</head>',current?'<style>html[data-native-entry="loading"] #machineShell{visibility:hidden}</style><script type="module" src="'+SHARED+'runtime-r17/entry.mjs"></script></head>':'</head>'),request.method,'text/html; charset=utf-8');
  }catch{return fail('REFERENCE_PAGE_UNAVAILABLE');}
 }};
}
