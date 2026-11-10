import {bounded,fail} from './reference-resources-r14.mjs';
import {GAME_GROUPS,PRESENTATION_PREFIX} from './presentation-service-r23.mjs';
const previousPrefix='/native-library/remaining20/20261110-rounds-r21/';
const shellPrefix='/native-library/remaining20/20261111-native-shell-r22/';
function retainedAssetFallback(path,method){
 const entry=path.match(/^\/native-ui\/entry\/([a-z0-9_]+)\.mjs$/);
 const app=path.match(/^\/native-ui\/releases\/r\d+[a-z]?\/([a-f0-9]{16})\/app\.mjs$/);
 const group=entry?GAME_GROUPS[entry[1]]:app&&Object.values(GAME_GROUPS).includes(app[1])?app[1]:null;
 let body,type='application/javascript; charset=utf-8';
 if(group)body='import '+JSON.stringify(previousPrefix+group+'/app.mjs')+';\n';
 else if(path==='/native-ui/shell.mjs'||/^\/native-ui\/releases\/r\d+[a-z]?\/shell\.mjs$/.test(path))body='import '+JSON.stringify(shellPrefix+'shell.mjs')+';\n';
 else if(path==='/native-ui/shell.css'||/^\/native-ui\/releases\/r\d+[a-z]?\/shell\.css$/.test(path)){body='@import url('+JSON.stringify(shellPrefix+'shell.css')+');\n';type='text/css; charset=utf-8';}
 if(!body)return fail('PRESENTATION_SERVICE_UNAVAILABLE');
 return new Response(method==='HEAD'?null:body,{headers:{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','x-superwin-presentation-fallback':'r22'}});
}
export function presentationHTML(html,id){
 const group=GAME_GROUPS[id];
 if(!group||!html.includes('data-native-shell="r22"'))throw Error('PRESENTATION_SHELL_CONTRACT_CHANGED');
 if(html.includes('data-presentation-service="bound"')&&html.includes('src="'+PRESENTATION_PREFIX+'entry/'+id+'.mjs"'))return html;
 const app=previousPrefix+group+'/app.mjs';
 if(html.split('src="'+app+'"').length!==2)throw Error('PRESENTATION_APP_CONTRACT_CHANGED');
 return html.replace('src="'+app+'"','src="'+PRESENTATION_PREFIX+'entry/'+id+'.mjs"')
  .replaceAll(shellPrefix+'shell.css',PRESENTATION_PREFIX+'shell.css')
  .replaceAll(shellPrefix+'shell.mjs',PRESENTATION_PREFIX+'shell.mjs')
  .replace('<html ','<html data-presentation-service="bound" ');
}
function pageResponse(response,body,method){
 const headers=new Headers(response.headers);
 for(const key of ['content-length','content-encoding','etag','last-modified'])headers.delete(key);
 headers.set('cache-control','no-store');headers.set('x-superwin-presentation-service','superwin-native-presentation');
 return new Response(method==='HEAD'?null:body,{status:response.status,headers});
}
export function installPresentationPlayer(previous){
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),path=url.pathname;
  if(path.startsWith(PRESENTATION_PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
   if(typeof env.NATIVE_PRESENTATION?.fetch!=='function')return retainedAssetFallback(path,request.method);
   try{
    // Only public presentation bytes enter the child. Original cookies,
    // account headers, queries and all financial endpoints stay in Player.
    const target=new Request('https://native-presentation.internal'+path,{method:request.method,headers:{accept:'*/*'},redirect:'manual',signal:request.signal});
    const response=await env.NATIVE_PRESENTATION.fetch(target);
    if(response.status>=500)return retainedAssetFallback(path,request.method);
    if(![200,400,404,405].includes(response.status))return fail('PRESENTATION_SERVICE_INVALID_RESPONSE',502);
    const headers=new Headers(response.headers);headers.delete('set-cookie');
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
   }catch{return retainedAssetFallback(path,request.method);}
  }
  const id=path.match(/^\/(?:demo\/)?games\/([a-z0-9_]+)$/)?.[1];
  if(!Object.hasOwn(GAME_GROUPS,id)||!['GET','HEAD'].includes(request.method)||typeof env.NATIVE_PRESENTATION?.fetch!=='function')return previous.fetch(request,env,ctx);
  const response=await previous.fetch(new Request(request,{method:'GET'}),env,ctx);
  if(response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  try{
   let bytes=await bounded(response.clone().body,131072);
   if(response.headers.get('content-encoding')==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),131072);
   return pageResponse(response,presentationHTML(new TextDecoder('utf-8',{fatal:true}).decode(bytes),id),request.method);
  }catch{
   // A changed retained page can still use the complete R22 implementation.
   console.error(JSON.stringify({event:'native_presentation_shell_fallback',game:id}));
   return request.method==='HEAD'?pageResponse(response,null,'HEAD'):response;
  }
 }};
}
