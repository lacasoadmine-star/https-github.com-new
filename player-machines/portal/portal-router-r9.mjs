export const RELEASE='player-portal-20261106-r9';
export const PREFIX='/'+RELEASE+'/';

// GET/HEAD If-None-Match uses weak comparison: compression may add W/ without
// changing the opaque validator. Parse quoted tags so commas inside remain data.
function ifNoneMatch(value,current){
 if(!value||!current)return false;
 if(value.trim()==='*')return true;
 const expected=current.replace(/^W\//,'');let i=0,matched=false;
 while(i<value.length){
  while(i<value.length&&/[\t ,]/.test(value[i]))i++;
  if(i===value.length)break;
  if(value.slice(i,i+2)==='W/')i+=2;
  if(value[i]!== '"')return false;
  const start=i++;
  while(i<value.length&&value[i]!=='"'){
   const code=value.charCodeAt(i);if(code!==33&&(code<35||code>255||code===127))return false;i++;
  }
  if(i===value.length)return false;i++;
  if(value.slice(start,i)===expected)matched=true;
  while(i<value.length&&/[\t ]/.test(value[i]))i++;
  if(i<value.length&&value[i]!==',')return false;
 }
 return matched;
}

// The existing Worker owns every API, session, identity and financial action.
// This wrapper serves four public presentation files and decorates only '/'.
export function installPortal(previous,assets){
 return async function fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const path=new URL(request.url).pathname,read=request.method==='GET'||request.method==='HEAD';
  if(path.startsWith(PREFIX)){
   if(!read)return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
   const name=path.slice(PREFIX.length);if(!Object.hasOwn(assets,name))return new Response('Not found',{status:404});const asset=assets[name];
   const headers={'Content-Type':asset.type,'Cache-Control':'public, max-age=31536000, immutable','ETag':asset.etag,'X-Content-Type-Options':'nosniff','X-Zplay-Portal-Release':RELEASE};
   if(ifNoneMatch(request.headers.get('If-None-Match'),asset.etag))return new Response(null,{status:304,headers});
   return new Response(request.method==='HEAD'?null:asset.body,{headers});
  }
  const response=await previous.fetch(request,env,ctx);
  if(path!=='/'||request.method!=='GET'||response.status!==200||!response.headers.get('Content-Type')?.includes('text/html'))return response;
  const encoding=response.headers.get('Content-Encoding');if(encoding&&encoding!=='identity'&&encoding!=='gzip')return response;
  let source;
  try{
   const bytes=new Uint8Array(await response.clone().arrayBuffer());
   // Upstream fetch can return decoded HTML with a retained gzip header. Only
   // decompress actual gzip bytes; leave the original response usable on error.
   source=encoding==='gzip'&&bytes[0]===31&&bytes[1]===139
    ?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
    :new TextDecoder().decode(bytes);
  }catch{return response;}
  if(!source.includes('player-reference-v2138.js')||source.includes('zplay-portal-r9-css'))return response;
  const addition='<link id="zplay-portal-r9-css" rel="stylesheet" href="'+PREFIX+'portal.css"><link rel="stylesheet" href="'+PREFIX+'surfaces.css"><script type="module" src="'+PREFIX+'portal.mjs"></script>';
  const body=source.replace('</head>',addition+'</head>');if(body===source)return response;
  const headers=new Headers(response.headers);for(const name of ['Content-Encoding','Content-Length','ETag','Last-Modified'])headers.delete(name);
  headers.set('Cache-Control','no-store');headers.set('X-Zplay-Portal-Release',RELEASE);
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
 };
}
