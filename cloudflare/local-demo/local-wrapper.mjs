import base from './worker.mjs';
import { handleLocalDemo } from './local-demo.mjs';
export { LocalDemoWallet } from './local-demo.mjs';
export * from './worker.mjs';

const LINK='<a href="/local-demo" style="display:block;margin:12px 18px;padding:14px;text-align:center;border:1px solid #5de364;border-radius:10px;background:#133721;color:#a5ffad;font-weight:800;text-decoration:none">▶ Superwin Local · Wallet tijaabo ah</a>';
export default {
  ...base,
  async fetch(request,env,ctx){
    const local=await handleLocalDemo(request,env);if(local)return local;
    const response=await base.fetch(request,env,ctx),path=new URL(request.url).pathname;
    if(request.method!=='GET'||!['/','/games','/games/','/casino','/catalog','/player','/player/'].includes(path)||!response.ok||!response.headers.get('Content-Type')?.includes('text/html'))return response;
    const headers=new Headers(response.headers);for(const key of ['Content-Length','Content-Encoding','ETag'])headers.delete(key);
    headers.set('Cache-Control','no-store');headers.set('X-Superwin-Local-Demo','v1');
    return new HTMLRewriter()
      .on('#main',{element(el){el.prepend(LINK,{html:true});}})
      .on('#play-demo',{element(el){el.after(LINK,{html:true});}})
      .on('#zplay-demo-footer',{element(el){el.append(LINK,{html:true});}})
      .transform(new Response(response.body,{status:response.status,headers}));
  },
};
