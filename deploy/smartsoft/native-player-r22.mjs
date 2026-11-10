import {bounded,reply,fail,bundledResource} from './reference-resources-r14.mjs';
export const SHELL_PREFIX='/native-library/remaining20/20261111-native-shell-r22/';
export const TITLE_IDS=['multihot100_native','habeshafortune5_native','multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native'];
const ids=new Set(TITLE_IDS);
const demoIds=new Set(TITLE_IDS);
const runtime='/native-library/remaining20/20261110-rounds-r21/';
const demoGroups={'5fddea498e1f0d39':'5fddea498e1f0d39','7161514f85b0565e':'7161514f85b0565e','b930310f3d5338cd':'b930310f3d5338cd','3d420e4fe5830b46':'3d420e4fe5830b46','fe6fe5c2996189a2':'fe6fe5c2996189a2','cc0f22635df0e9c7':'b38851a17f300bbc'};
// Demo and account shells retain their own original controllers and API paths.
export function nativeShellHTML(html,id){
 if(!ids.has(id)||!html.includes('id="machineShell"')||!html.includes('</head>'))throw Error('NATIVE_SHELL_CONTRACT_CHANGED');
 if(html.includes('data-native-shell="r22"'))return html;
 return html.replace('<html ','<html data-native-shell="r22" data-native-ready="false" ')
  .replace('</head>','<link rel="stylesheet" href="'+SHELL_PREFIX+'shell.css"><script type="module" src="'+SHELL_PREFIX+'shell.mjs"></script></head>');
}
export function projectDemoHTML(html,id){
 if(!demoIds.has(id))return html;
 const prefix='/native-library/remaining20/20261110-accepted-controls-r12/';
 html=html.replaceAll(prefix+'b38851a17f300bbc/',runtime+'cc0f22635df0e9c7/').replaceAll(prefix,runtime);
 if(!html.includes('data-reference-frame='))html=html.replace('<html ','<html data-reference-frame="r14" ')
  .replace('</head>','<link rel="stylesheet" href="'+runtime+'frame.css"><script type="module" src="'+runtime+'frame.mjs"></script></head>');
 return html;
}
export function mergeDemoPresentation(demo,catalog){
 if(!Array.isArray(demo)||!Array.isArray(catalog))throw Error('DEMO_CATALOG_CHANGED');
 const scoped=demo.filter(game=>catalog.some(row=>row.id===game.id));
 if(!scoped.length)throw Error('DEMO_CATALOG_EMPTY');
 return scoped.map(game=>{
  const current=catalog.find(row=>row.id===game.id&&row.version===game.version);
  if(!current?.referencePresentation||game.demo!==true||game.demoCreditsOnly!==true||game.currency!=='CREDITS')throw Error('DEMO_PRESENTATION_NOT_VERIFIED');
  return {...game,referencePresentation:current.referencePresentation};
 });
}
export function installNativePlayer(previous,{css,script}){
 return {...previous,async fetch(request,env,ctx){
  const path=new URL(request.url).pathname;
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const demoCatalog=path.startsWith(runtime)&&path.slice(runtime.length).match(/^([a-f0-9]{16})\/demo-games\.json$/);
  if(demoCatalog&&Object.hasOwn(demoGroups,demoCatalog[1])){
   if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
   try{
    const group=demoCatalog[1],base=new URL(request.url);
    const target=name=>new Request(new URL(name,base),{method:'GET',headers:{accept:'application/json'},redirect:'manual'});
    const [demo,catalog]=await Promise.all([
     previous.fetch(target('/native-library/remaining20/20261110-accepted-controls-r12/'+demoGroups[group]+'/demo-games.json'),env,ctx),
     previous.fetch(target(runtime+group+'/games.json'),env,ctx),
    ]);
    if(!demo.ok||!catalog.ok)throw Error('CATALOG_UNAVAILABLE');
    const merged=mergeDemoPresentation(await demo.json(),await catalog.json());
    return new Response(request.method==='HEAD'?null:JSON.stringify(merged),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
   }catch{return fail('DEMO_PRESENTATION_UNAVAILABLE');}
  }
  if(path.startsWith(SHELL_PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
   const name=path.slice(SHELL_PREFIX.length),source=name==='shell.css'?css:name==='shell.mjs'?script:null;
   if(source===null)return fail('NOT_FOUND',404);
   if(typeof source==='object')return bundledResource(source,request.method);
   return new Response(request.method==='HEAD'?null:source,{headers:{'content-type':name.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8','cache-control':'public, max-age=31536000, immutable'}});
  }
  const match=/^\/(?:demo\/)?games\/([a-z0-9_]+)$/.exec(path);
  if(!ids.has(match?.[1])||!['GET','HEAD'].includes(request.method))return previous.fetch(request,env,ctx);
  const response=await previous.fetch(new Request(request,{method:'GET'}),env,ctx);
  if(response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  try{
   let bytes=await bounded(response.body,131072);
   if(response.headers.get('content-encoding')==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),131072);
   let html=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
   if(path.startsWith('/demo/'))html=projectDemoHTML(html,match[1]);
   html=nativeShellHTML(html,match[1]);
   const result=reply(response,html,request.method,'text/html; charset=utf-8');
   // The demo HTML creates its credits-only session. Public asset responses
   // strip cookies, but this same-origin page must retain its own session cookie.
   if(path.startsWith('/demo/')){
    const cookies=response.headers.getSetCookie?.()??(response.headers.get('set-cookie')?[response.headers.get('set-cookie')]:[]);
    for(const cookie of cookies)result.headers.append('set-cookie',cookie);
   }
   return result;
  }catch{return fail('NATIVE_SHELL_UNAVAILABLE');}
 }};
}
