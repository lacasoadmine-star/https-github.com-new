export const PREFIX='/mh5-video-v1/';
export const GAME_ROUTE='/play/multi-hot-5-new';
export function assetReply(asset,head){return new Response(head?null:asset.encoding==='base64'?Uint8Array.from(atob(asset.content),c=>c.charCodeAt(0)):asset.content,{headers:{'Content-Type':asset.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-MH5-Source':'42726.mp4'}});}
export function install(previous,assets){return async(request,env,ctx)=>{
 const url=new URL(request.url),head=request.method==='HEAD';
 if(request.method!=='GET'&&!head)return previous.fetch(request,env,ctx);
 if(url.pathname.startsWith(PREFIX)){const key=url.pathname.substring(PREFIX.length);return Object.hasOwn(assets,key)?assetReply(assets[key],head):new Response('Not found',{status:404});}
 if(url.pathname===GAME_ROUTE){const r=assetReply(assets['index.html'],head);r.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");return r;}
 const response=await previous.fetch(request,env,ctx);
 if(request.method!=='GET'||!['/','/index.html','/player','/player/'].includes(url.pathname)||response.status!==200||!response.headers.get('Content-Type')?.includes('text/html'))return response;
 let bytes=response.clone().body;const encoding=response.headers.get('Content-Encoding');if(encoding&&encoding!=='identity'){if(encoding!=='gzip')return response;bytes=bytes.pipeThrough(new DecompressionStream('gzip'));}
 const html=await new Response(bytes).text();if(!html.includes('</head>')||html.includes('mh5-video-new-loader'))return response;
 const addition='<link rel="stylesheet" href="'+PREFIX+'entry.css"><script id="mh5-video-new-loader" type="module" src="'+PREFIX+'entry.mjs"></script>';
 const headers=new Headers(response.headers);for(const field of ['Content-Encoding','Content-Length','ETag','Last-Modified'])headers.delete(field);headers.set('Cache-Control','no-store');
 return new Response(html.replace('</head>',addition+'</head>'),{status:response.status,statusText:response.statusText,headers});
};}

