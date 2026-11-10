import {bounded,reply,fail} from './reference-resources-r14.mjs';
const PREFIX='/native-library/remaining20/20261110-construction-r15/';
const LIBRARY_PREFIX='/v2/remaining20/construction-r15/';
const QUEUE_API='/api/game-construction-queue';

export function installConstructionPlayer(previous){
 if(typeof previous?.fetch!=='function')throw Error('EXISTING_PLAYER_REQUIRED');
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),path=url.pathname;
  if(path===QUEUE_API||path.startsWith(PREFIX)){
   if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
   if(typeof env.EXPANSION100?.fetch!=='function')return fail('EXISTING_ASSET_SERVICE_UNAVAILABLE');
   const name=path===QUEUE_API?'games.json':path.slice(PREFIX.length);
   if(!/^(?:auth-r18\/(?:entry|sign-in)\.mjs|runtime-r(?:17|20)\/(?:[a-f0-9]{16}\/(?:app|session|smartsoft-startup|presentation\/smartsoft-motion)|entry|mobile-runtime-r17|autoplay-visual-r17)\.mjs|games\.json|queue\.json|queue-ui(?:-r(?:16|19))?\.mjs|queue\.css|frame\.mjs|(?:mobile-controls|control-state|control-data)-r16b?\.mjs|mobile-(?:display(?:-data)?|background)\.mjs|backgrounds\/[a-f0-9]{64}\.(?:png|jpg)|covers\/[a-z0-9]+:[A-Za-z0-9_-]{1,100})$/.test(name))return fail('NOT_FOUND',404);
   const target=new URL(LIBRARY_PREFIX+name,url.origin);if(name==='games.json')target.search=url.search;
   // The existing asset binding receives public GET/HEAD only. No session,
   // Authorization, account balance or financial request can enter this route.
   const response=await env.EXPANSION100.fetch(new Request(target,{method:request.method,headers:{accept:'*/*'},redirect:'manual',signal:request.signal}));
   return reply(response,response.body,request.method,response.headers.get('content-type')||'application/octet-stream',response.status===200&&name!=='games.json');
  }
  const response=await previous.fetch(request,env,ctx);
  if(path!=='/'||request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html'))return response;
  try{
   let bytes=await bounded(response.body,131072);
   if(response.headers.get('content-encoding')==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),131072);
   const html=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace('/jetx-sign-in-20261107.mjs',PREFIX+'auth-r18/sign-in.mjs')
    .replace(/<script\b[^>]*data-zplay-account-entry-r13[^>]*>\s*<\/script>/g,'')
    .replace(new RegExp(PREFIX+'queue-ui(?:-r16)?\\.mjs','g'),PREFIX+'queue-ui-r19.mjs');
   if(!html.includes('</head>')||html.includes('data-construction-r15'))return reply(response,html,'GET','text/html; charset=utf-8');
   return reply(response,html.replace('</head>','<link rel="stylesheet" href="'+PREFIX+'queue.css"><script data-construction-r15 type="module" src="'+PREFIX+'queue-ui-r19.mjs"></script></head>'),'GET','text/html; charset=utf-8');
  }catch{return fail('PLAYER_PAGE_UNAVAILABLE');}
 }};
}
