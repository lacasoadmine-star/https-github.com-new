import test from 'node:test';
import assert from 'node:assert/strict';
import {createCleanPlayerLobby} from './worker.mjs';
class Rewriter {
  constructor(){this.removals=[];}
  on(selector,handler){this.removals.push([selector,handler]);return this;}
  async transform(response){
    let html=await response.text();
    for(const [selector,handler] of this.removals) {
      let remove=false; handler.element({remove(){remove=true;}});
      if(!remove)continue;
      if(selector==='script#zplay-new90-loader')html=html.replace(/<script id="zplay-new90-loader"[^>]*><\/script>/g,'');
      if(selector==='link[data-zplay-new90-style]')html=html.replace(/<link data-zplay-new90-style[^>]*>/g,'');
      if(selector==='#zplay-requested90')html=html.replace(/<section id="zplay-requested90"[^>]*><\/section>/g,'');
    }
    return new Response(html,{status:response.status,headers:response.headers});
  }
}
test('hides misleading NEW90 placeholders, keeps retained Player cards',async()=>{
  const html='<html><head><script id="zplay-new90-loader"></script><link data-zplay-new90-style href="/fake.css"></head><body><div class="old-game">Multi Hot 5</div><section id="zplay-requested90"></section></body></html>';
  const host={fetch:async()=>new Response(html,{headers:{'content-type':'text/html','content-length':String(html.length),'etag':'"old"'}})};
  const app=createCleanPlayerLobby(host,Rewriter);
  const r=await app.fetch(new Request('https://player.example/'),{},{});
  const body=await r.text();
  assert.match(body,/Multi Hot 5/);assert.doesNotMatch(body,/zplay-new90-loader|zplay-requested90|new90-style/);
  assert.equal(r.headers.get('content-length'),null);assert.equal(r.headers.get('etag'),null);
});
test('delegates every existing game, API, login and financial request unchanged',async()=>{
  const host={fetch:async()=>new Response('old-host',{headers:{'content-type':'text/plain'}})};
  const app=createCleanPlayerLobby(host,Rewriter);
  for(const path of ['/games/multi_hot_5_native','/api/slots/new-games90/superwilds/spin','/api/auth/login','/new-games72/multi-hot-20/']){
    const r=await app.fetch(new Request('https://player.example'+path),{},{});
    assert.equal(await r.text(),'old-host');
  }
});
