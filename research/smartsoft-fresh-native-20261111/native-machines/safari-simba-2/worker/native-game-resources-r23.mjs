// Read-only serving for fresh game resources. Populate only through Cloudflare's
// authenticated Durable Objects SQL API; this class has no public upload action.
export const NATIVE_RESOURCE_PREFIX='/independent74/native/';
export const NATIVE_RESOURCE_GAMES=Object.freeze(['shared','multi-hot-10-2','multi-hot-20','multi-hot-40','multi-hot-100','multi-hot-5-deluxe','burning-ice-41','blazing-hot-10','burning-ice-40','hab','hot-samba','boca-jamba-10','multi-hot-wild-ways','multi-hot-5-wild','multi-hot-5-super-wilds','scene-v2-multi-hot-100','scene-v2-multi-hot-5-deluxe','scene-v2-multi-hot-wild-ways','scene-v2-multi-hot-5-wild','scene-v2-multi-hot-5-super-wilds','scene-v2-hab','scene-v2-burning-ice-41','scene-v2-blazing-hot-10','scene-v2-burning-ice-40','scene-v2-safari-simba-2']);
export const NATIVE_RESOURCE_CHUNK_BYTES=1048576;
const TYPES={html:'text/html; charset=utf-8',mjs:'application/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',webp:'image/webp',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',js:'application/javascript; charset=utf-8',txt:'text/plain; charset=utf-8',woff:'font/woff',ttf:'font/ttf',otf:'font/otf',mp3:'audio/mpeg',ogg:'audio/ogg',woff2:'font/woff2'};
export const NATIVE_RESOURCE_SCHEMA=`CREATE TABLE IF NOT EXISTS native_game_files(path TEXT PRIMARY KEY,version TEXT NOT NULL,bytes INTEGER NOT NULL,chunks INTEGER NOT NULL,sha256 TEXT NOT NULL);CREATE TABLE IF NOT EXISTS native_game_chunks(path TEXT NOT NULL,version TEXT NOT NULL,part INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(path,version,part)) WITHOUT ROWID;`;

export function nativeResourceGame(path){
 if(!path.startsWith(NATIVE_RESOURCE_PREFIX))return null;
 const parts=path.slice(NATIVE_RESOURCE_PREFIX.length).split('/'),game=parts.shift();
 if(!NATIVE_RESOURCE_GAMES.includes(game))return null;
 const file=parts.join('/');
 return /^(?:(?:index|scene-v2)\.html|[a-z0-9-]+\.mjs|(?:style|scene|fonts)\.css|profile\.json|assets\/[a-z0-9-]+\.(?:webp|png|jpg|jpeg|mp3|ogg|woff2|woff|ttf|otf|js|json|txt))$/.test(file)?game:null;
}
export const nativeResourceInstance=game=>'native-game-resources:'+game+':v1';

export class NativeGameResources{
 constructor(ctx){
  this.sql=ctx.storage.sql;
  ctx.blockConcurrencyWhile(async()=>{this.sql.exec(NATIVE_RESOURCE_SCHEMA);});
 }
 async fetch(request){
  const path=new URL(request.url).pathname;
  if(!nativeResourceGame(path))return new Response('Not found',{status:404});
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD'}});
  const file=this.sql.exec('SELECT version,bytes,chunks,sha256 FROM native_game_files WHERE path=?',path).toArray()[0];
  if(!file)return new Response('Game resource unavailable',{status:404,headers:{'cache-control':'no-store'}});
  if(!Number.isSafeInteger(file.bytes)||file.bytes<1||file.bytes>25*1024*1024||file.chunks!==Math.ceil(file.bytes/NATIVE_RESOURCE_CHUNK_BYTES)||!/^[a-f0-9]{64}$/.test(file.sha256))return new Response('Game resource unavailable',{status:503});
  const extension=path.split('.').at(-1),headers=new Headers({'content-type':TYPES[extension],'content-length':String(file.bytes),'etag':'"'+file.sha256+'"','cache-control':['html','mjs','css','json'].includes(extension)?'no-store':'public, max-age=300','accept-ranges':'bytes','x-content-type-options':'nosniff','referrer-policy':'same-origin'});
  if(extension==='html')headers.set('content-security-policy',"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
  if(request.headers.get('if-none-match')===headers.get('etag')){headers.delete('content-length');return new Response(null,{status:304,headers});}
  let start=0,end=file.bytes-1,status=200;
  const range=request.headers.get('range');
  if(range&&(!request.headers.has('if-range')||request.headers.get('if-range')===headers.get('etag'))){
   const m=/^bytes=(\d*)-(\d*)$/.exec(range);
   if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'content-range':'bytes */'+file.bytes}});
   start=m[1]?Number(m[1]):Math.max(0,file.bytes-Number(m[2]));end=m[1]&&m[2]?Math.min(end,Number(m[2])):end;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=file.bytes||(!m[1]&&Number(m[2])===0))return new Response(null,{status:416,headers:{'content-range':'bytes */'+file.bytes}});
   status=206;headers.set('content-range',`bytes ${start}-${end}/${file.bytes}`);headers.set('content-length',String(end-start+1));
  }
  if(request.method==='HEAD')return new Response(null,{status,headers});
  try{
   const first=Math.floor(start/NATIVE_RESOURCE_CHUNK_BYTES),last=Math.floor(end/NATIVE_RESOURCE_CHUNK_BYTES);
   const chunks=this.sql.exec('SELECT part,data FROM native_game_chunks WHERE path=? AND version=? AND part>=? AND part<=? ORDER BY part',path,file.version,first,last).toArray();
   if(chunks.length!==last-first+1)throw Error('MISSING_CHUNK');
   const output=new Uint8Array(end-start+1);let offset=0;
   for(let i=0;i<chunks.length;i++){
    const chunk=chunks[i];if(chunk.part!==first+i)throw Error('MISSING_CHUNK');
    const binary=atob(chunk.data),expected=Math.min(NATIVE_RESOURCE_CHUNK_BYTES,file.bytes-chunk.part*NATIVE_RESOURCE_CHUNK_BYTES);
    if(binary.length!==expected)throw Error('CHUNK_LENGTH');
    const from=Math.max(0,start-chunk.part*NATIVE_RESOURCE_CHUNK_BYTES),to=Math.min(expected,end-chunk.part*NATIVE_RESOURCE_CHUNK_BYTES+1);
    for(let j=from;j<to;j++)output[offset++]=binary.charCodeAt(j);
   }
   return new Response(output,{status,headers});
  }catch{return new Response('Game resource unavailable',{status:503,headers:{'cache-control':'no-store'}});}
 }
}
