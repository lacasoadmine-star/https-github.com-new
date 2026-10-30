from pathlib import Path
import json
p=Path(__file__).resolve().parent/'patch'
assets={route:{'body':(p/name).read_text(),'type':typ} for route,name,typ in [('/slots/js/dashboard.js','dashboard.js','application/javascript; charset=utf-8'),('/assets/internal-games/lobby-v2161.js','lobby-original.js','application/javascript; charset=utf-8'),('/zplay-presentation-v203.css','presentation.css','text/css; charset=utf-8')]}
code="import previous from './zplay-rebuild-entry-v197.mjs';\nconst assets="+json.dumps(assets,separators=(',',':'))+";\n"+'''export default {async fetch(request,env,ctx){
 const url=new URL(request.url),asset=assets[url.pathname];
 if(asset){if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD'}});return new Response(request.method==='HEAD'?null:asset.body,{headers:{'content-type':asset.type,'cache-control':'no-store','x-content-type-options':'nosniff','x-zplay-presentation':'v203'}});}
 const response=await previous.fetch(request,env,ctx);
 if(request.method!=='GET'||!response.ok||!response.headers.get('content-type')?.includes('text/html'))return response;
 const out=new HTMLRewriter().on('head',{element(e){e.append('<link rel="stylesheet" href="/zplay-presentation-v203.css">',{html:true});}}).transform(response);
 out.headers.set('x-zplay-presentation','v203');out.headers.set('cache-control','no-store');out.headers.delete('content-length');out.headers.delete('etag');return out;
}};
'''
(p/'zplay-presentation-v203.mjs').write_text(code)
