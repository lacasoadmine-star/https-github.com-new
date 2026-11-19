import previous from '../native72deluxe/entry.mjs';
export * from '../native72deluxe/entry.mjs';
const catalog='/zplay-restored/20261117-details-r1/catalog-data.mjs';
const lobby='/zplay-restored/20261117-details-r1/lobby.mjs';
const obsolete='/native-new/20261118-r1/lobby-v445.mjs';
export default {...previous,async fetch(request,env,ctx){
 const path=new URL(request.url).pathname;
 if(env.PORTAL!=='player'||!['GET','HEAD'].includes(request.method))return previous.fetch.call(previous,request,env,ctx);
 const aliases={'/games/habeshafortune5_native':'/games/habesha_fortune_5_native','/games/multihotdeluxe_native':'/games/multi_hot_5_deluxe_native'};
 if(aliases[path])return new Response(null,{status:307,headers:{Location:aliases[path],'Cache-Control':'no-store'}});
 if(![catalog,obsolete,lobby].includes(path)){
  const response=await previous.fetch.call(previous,request,env,ctx);
  if(path==='/'&&request.method==='GET'&&response.headers.get('Content-Type')?.includes('text/html'))return new HTMLRewriter().on('script[src]',{element(element){const src=element.getAttribute('src');if(src?.split('?')[0]===lobby)element.setAttribute('src',lobby+'?v=native72-etb-r2');}}).transform(response);
  return response;
 }
 const headers={'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'};
 if(path===obsolete)return new Response(request.method==='HEAD'?null:'// Retired separate test-wallet promotion.\n',{headers});
 const expectedHash=path===lobby?"db5d4d9910fdbbe68850b93a39900f87649385d9b5274c0322117bb76070e885":"3d6c9ed4697d687b1f56bb283d01c230c9ddc47c311fdf81098836904e362192";
 const body=await env.SSG_OFFICIAL_REFERENCES.get('native72/catalog/'+expectedHash,'arrayBuffer');
 if(!body)return new Response('Catalogue temporarily unavailable',{status:503,headers});
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),n=>n.toString(16).padStart(2,'0')).join('');
 if(hash!==expectedHash)return new Response('Catalogue integrity check failed',{status:503,headers});
 return new Response(request.method==='HEAD'?null:body,{headers});
}};
