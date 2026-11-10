import {bounded,reply,fail} from './reference-resources-r14.mjs';
export const PREFIX='/native-library/remaining20/20261110-rounds-r21/';
const OLD='/native-library/remaining20/20261110-construction-r20/';
const LIBRARY='/v2/remaining20/rounds-r21/';
const IDS=new Set(['multihot100_native','habeshafortune5_native','multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native']);
async function text(response){let bytes=await bounded(response.body,2097152);if(response.headers.get('content-encoding')==='gzip'&&bytes[0]===31&&bytes[1]===139)bytes=await bounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),2097152);return new TextDecoder().decode(bytes);}
export function installRoundsPlayer(previous,names){
 const resources=new Set(names),assets=new Set(names.filter(name=>name.startsWith('assets/')).map(name=>name.slice(7)));
 return {...previous,async fetch(request,env,ctx){
  if(env.PORTAL!=='player')return previous.fetch(request,env,ctx);
  const url=new URL(request.url),path=url.pathname;
  const asset=/^\/native-library\/remaining20\/20261110-reference-mobile-r14\/assets\/([a-z0-9_]+)\/([a-f0-9]{64}\.[a-z0-9]+)$/.exec(path);
  const name=asset&&IDS.has(asset[1])&&assets.has(asset[2])?'assets/'+asset[2]:path.startsWith(PREFIX)?path.slice(PREFIX.length):null;
  if(name!==null){
   if(!['GET','HEAD'].includes(request.method))return fail('METHOD_NOT_ALLOWED',405);
   if(resources.has(name)){
    if(typeof env.EXPANSION100?.fetch!=='function')return fail('EXISTING_ASSET_SERVICE_UNAVAILABLE');
    const response=await env.EXPANSION100.fetch(new Request(new URL(LIBRARY+name,url.origin),{method:request.method,headers:{accept:'*/*'}}));
    return reply(response,response.body,request.method,response.headers.get('content-type')||'application/octet-stream',response.status===200);
   }
   if(!/^(?:[a-f0-9]{16}\/[a-zA-Z0-9_./-]+|backgrounds\/[a-zA-Z0-9_.-]+|frame\.(?:css|mjs)|hood-logo\.png|reference-state\.mjs|smartsoft-mobile\.mjs|mobile-background\.mjs|mobile-display-data\.mjs)$/.test(name)||name.includes('..'))return fail('NOT_FOUND',404);
   const response=await previous.fetch(new Request(new URL(OLD+name,url.origin),{method:'GET',headers:{accept:'*/*'}}),env,ctx);
   if(response.status!==200||!name.endsWith('.mjs'))return reply(response,response.body,request.method,response.headers.get('content-type')||'application/octet-stream',response.status===200);
   return reply(response,(await text(response)).replaceAll(OLD,PREFIX),request.method,'application/javascript; charset=utf-8',true);
  }
  const response=await previous.fetch(request,env,ctx);
  const id=/^\/games\/([a-z0-9_]+)$/.exec(path)?.[1];
  if(request.method!=='GET'||response.status!==200||!response.headers.get('content-type')?.includes('text/html')||path!=='/'&&!IDS.has(id))return response;
  let html=await text(response);
  if(path==='/')html=html.replace('/native-library/remaining20/20261110-construction-r15/queue-ui-r19.mjs',PREFIX+'lobby.mjs');
  else html=html.replaceAll(OLD,PREFIX).replace('data-reference-display="r20"','data-reference-display="r21"').replace('</head>','<link rel="stylesheet" href="'+PREFIX+'rounds.css"></head>');
  return reply(response,html,request.method,'text/html; charset=utf-8');
 }};
}
