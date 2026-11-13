const REVISION='20261113-all74-r2';
const FILES=new Map(['index.html','game.html','style.css','app.mjs','account.mjs','library-account.mjs','art.mjs','games.mjs','catalog.json','deluxe-logo.json','sprites.json','lobby.css','lobby.mjs','entry-link.mjs'].map(name=>[name,name]));
const GAMES=new Set(['001-multi-hot-5','002-multi-hot-10','003-multi-hot-40','004-multi-hot-deluxe']);
const TYPES={html:'text/html; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json',png:'image/png',jpg:'image/jpeg',mp3:'audio/mpeg',otf:'font/otf'};
const CSP="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'";
export async function new74(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/new74')return Response.redirect(url.origin+'/new74/',308);
 if(!url.pathname.startsWith('/new74/'))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const path=url.pathname.slice(7),name=path===''?'index.html':GAMES.has(path)?'game.html':FILES.get(path)||(/^assets\/(multihot5|multihot10|fonts)\/[a-z0-9.-]+$/.test(path)?path:null);
 if(!name)return new Response('Not found',{status:404});
 const key=`new74/${REVISION}/${name}`,entry=await env.SSG_OFFICIAL_REFERENCES.getWithMetadata(key,{type:'arrayBuffer'});
 if(!entry.value)return new Response('Ciyaarta ayaa soo diyaargaroobaysa.',{status:503,headers:{'Retry-After':'60'}});
 const ext=name.split('.').at(-1),type=TYPES[ext]||'application/octet-stream',headers=new Headers({'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Superwin-New74':REVISION,'Cache-Control':name.startsWith('assets/')?'public, max-age=86400':'no-cache'});
 if(ext==='html'){headers.set('Content-Security-Policy',CSP);headers.set('Cache-Control','no-store');}
 const etag=entry.metadata?.sha256?`"${entry.metadata.sha256}"`:null;if(etag)headers.set('ETag',etag);
 if(etag&&request.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers});
 const size=entry.value.byteLength;headers.set('Accept-Ranges','bytes');
 const range=request.headers.get('Range');
 if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range),start=match?Number(match[1]):NaN,end=match&&match[2]?Math.min(Number(match[2]),size-1):size-1;if(!Number.isSafeInteger(start)||start<0||start>=size||end<start){headers.set('Content-Range',`bytes */${size}`);return new Response(null,{status:416,headers});}headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));return new Response(request.method==='HEAD'?null:entry.value.slice(start,end+1),{status:206,headers});}
 headers.set('Content-Length',String(size));return new Response(request.method==='HEAD'?null:entry.value,{headers});
}
