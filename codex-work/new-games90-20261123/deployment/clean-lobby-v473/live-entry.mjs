import previous from '../new90superwildsr2/entry.mjs';
export {LocalDemoWallet,NativeGameResources} from '../new90superwildsr2/entry.mjs';
import config from './config.mjs';
import {createM20ReleaseWorker} from './worker.mjs';
const player=createM20ReleaseWorker(previous,config);
export default {...player,async fetch(request,env,ctx){
  const response=await player.fetch(request,env,ctx);
  if(request.method!=='GET'||new URL(request.url).pathname!=='/'||response.status!==200||
     !/^text\/html\b/i.test(response.headers.get('content-type')||''))return response;
  const headers=new Headers(response.headers);
  for(const key of ['content-length','etag','last-modified','content-md5'])headers.delete(key);
  headers.set('cache-control','no-store');
  return new HTMLRewriter()
    .on('script#zplay-new90-loader',{element(e){e.remove();}})
    .on('link[data-zplay-new90-style]',{element(e){e.remove();}})
    .on('#zplay-requested90',{element(e){e.remove();}})
    .transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
}};
