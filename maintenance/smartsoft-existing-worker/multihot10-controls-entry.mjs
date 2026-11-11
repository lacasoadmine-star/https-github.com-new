import previous from './independent74-entry-r18.mjs';
export * from './independent74-entry-r18.mjs';
const PREFIX='/independent74/mh10/';
const TYPE={webp:'image/webp',png:'image/png',mp3:'audio/mpeg',mjs:'application/javascript; charset=utf-8',css:'text/css; charset=utf-8',html:'text/html; charset=utf-8',woff2:'font/woff2'};
const overrides=new Map([
 ['/independent74/fresh74.html','page.html'],
 ['/independent74/lobby74.mjs','lobby74.mjs'],
 ['/independent74/machine74-boot.mjs','machine74-boot.mjs'],
 ['/independent74/fresh74-lobby.mjs','fresh74-lobby.mjs']
]);
const LIVE_PATCHES=[["let autoRemaining=0,autoStartBalance=0,autoLossLimit=1000,autoStopWin=true,animationEpoch=0,wheelAngle=0,acknowledged=new Set();\n","let autoRemaining=0,autoStartBalance=0,autoLossLimit=1000,autoStopWin=true,animationEpoch=0,wheelAngle=0,acknowledged=new Set(),releaseVisualWait=null,lastStopAt=-1000;\n"],["  if(epoch!==animationEpoch||!busy())return;\n","  if(epoch!==animationEpoch||!busy()||fastStop)return;\n"],[" for(const reel of columns){reel.classList.remove('stopping');reel.classList.add('spinning');}\n"," for(const reel of columns){reel.classList.remove('stopping','paused');reel.classList.add('spinning');}\n"],[" animationEpoch++;\n"," animationEpoch++;soundCache.get('moving')?.pause();\n"],[" for(const reel of columns){reel.classList.remove('spinning');reel.classList.add('stopping');}\n"," for(const reel of columns){reel.classList.remove('spinning','paused');reel.classList.add('stopping');}\n"],[" if(busy()){fastStop=true;autoRemaining=0;update();return null;}\n"," if(busy()){fastStop=true;lastStopAt=performance.now();autoRemaining=0;for(const reel of columns)reel.classList.add('paused');soundCache.get('moving')?.pause();releaseVisualWait?.();message('Hubinaya natiijada wareegga\u2026');update();return null;}\n if(performance.now()-lastStopAt<180)return null;\n"],["  const minimum=reduced()?0:(fast||fastStop?220:950);if(elapsed<minimum)await delay(minimum-elapsed);\n","  const minimum=reduced()?0:(fast||fastStop?220:950);if(elapsed<minimum){await Promise.race([delay(minimum-elapsed),new Promise(resolve=>{releaseVisualWait=resolve;})]);releaseVisualWait=null;}\n"],["  autoRemaining=0;animationEpoch++;for(const reel of columns)reel.classList.remove('spinning');renderGrid(grid);\n","  autoRemaining=0;animationEpoch++;for(const reel of columns)reel.classList.remove('spinning','paused');soundCache.get('moving')?.pause();releaseVisualWait=null;renderGrid(grid);\n"]];
const PHONE_CSS="\n.reel.paused .cell{animation-play-state:paused}.game{height:calc(100dvh - 26px)}.topbar{padding-left:max(10px,env(safe-area-inset-left));padding-right:max(10px,env(safe-area-inset-right))}.account-bar{bottom:calc(1.6% + env(safe-area-inset-bottom))}.play-controls{bottom:calc(9.9% + env(safe-area-inset-bottom))}@media(min-aspect-ratio:1/1){.account-bar{bottom:calc(3% + env(safe-area-inset-bottom))}.play-controls{bottom:calc(20% + env(safe-area-inset-bottom))}}\n\n.account-bar{min-height:32px}@media(min-aspect-ratio:1/1){.machine{left:25.5%;width:49%;top:31%}.message{left:2%;width:20%;top:55%}.win-display{left:2%;width:20%;top:65%}.win-display strong{font-size:clamp(18px,3vh,25px)}.account-field>span{font-size:clamp(8px,1.4vh,11px);line-height:1.1}.account-field strong{font-size:clamp(10px,2vh,15px)}}\n";
async function gameFile(request,env,key){
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 if(!env.SSG_OFFICIAL_REFERENCES)return new Response('Game resources unavailable',{status:503});
 const extension=key.split('.').at(-1),type=TYPE[extension];if(!type)return new Response('Not found',{status:404});
 const range=request.headers.get('range');
 const resource=await env.SSG_OFFICIAL_REFERENCES.getWithMetadata('games/multihot10/'+key,{type:range?'arrayBuffer':(key==='live.mjs'||key==='style.css')?'text':'stream'});
 if(!resource.value)return new Response('Game resource unavailable',{status:404});
 const headers=new Headers({'content-type':type,'cache-control':['mjs','css','html'].includes(extension)?'no-store':'public, max-age=300','x-content-type-options':'nosniff','referrer-policy':'same-origin'});
 const bytes=resource.metadata?.bytes;if(Number.isSafeInteger(bytes))headers.set('content-length',String(bytes));
 if(resource.metadata?.sha256)headers.set('etag','"'+resource.metadata.sha256+'"');
 if(extension==='html')headers.set('content-security-policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
 let body=resource.value,status=200;
 if(key==='live.mjs'){for(const [before,after]of LIVE_PATCHES){if(!body.includes(before))throw Error('GAME_CODE_PATCH_CONFLICT');body=body.replace(before,after);}}
 if(key==='style.css')body=body.replace('min-height:550px','min-height:0').replace('min-height:400px','min-height:0')+PHONE_CSS;
 if(key==='live.mjs'||key==='style.css'){headers.delete('content-length');headers.delete('etag');return new Response(request.method==='HEAD'?null:body,{headers});}

 if(range){
  const match=/^bytes=(\d+)-(\d*)$/.exec(range),size=body.byteLength;
  if(!match)return new Response(null,{status:416,headers:{'content-range':'bytes */'+size}});
  const start=Number(match[1]),end=match[2]?Math.min(size-1,Number(match[2])):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return new Response(null,{status:416,headers:{'content-range':'bytes */'+size}});
  body=body.slice(start,end+1);status=206;headers.set('content-range',`bytes ${start}-${end}/${size}`);headers.set('content-length',String(end-start+1));
 }
 if(['webp','png','mp3','woff2'].includes(extension))headers.set('accept-ranges','bytes');
 if(request.method==='HEAD'){if(!range)await body.cancel();return new Response(null,{status,headers});}
 return new Response(body,{status,headers});
}
export default {...previous,async fetch(request,env,ctx){
 const path=new URL(request.url).pathname;
 let key=overrides.get(path);
 if(!key&&path.startsWith(PREFIX)){
  const part=path.slice(PREFIX.length);
  if(/^(?:live\.mjs|style\.css|assets\/[a-z0-9-]+\.(?:webp|mp3|png|woff2))$/.test(part))key=part;
 }
 if(!key)return previous.fetch(request,env,ctx);
 try{return await gameFile(request,env,key);}catch(error){console.error(JSON.stringify({event:'multihot10_live_resource_error',name:error?.name||'Error'}));return new Response('Game resource unavailable',{status:503,headers:{'cache-control':'no-store'}});}
}};
