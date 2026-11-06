import test from 'node:test';
import assert from 'node:assert/strict';
import {machineAPI,machinePage,sessionIdentity,resolveGame} from '../worker/machine-routes.mjs';
import {install} from '../worker/player-router-v236.mjs';
import {issue} from '../worker/player-session-v236.mjs';
import {release} from '../worker/machine-assets-20261106.mjs';
const base='https://superwin-player.apdiy61.workers.dev',config={presence:'presence.63ed199a80b6c700.mjs'},env={PORTAL:'player',PLAYER_PRESENCE_KEY:'test-only-key-'.repeat(8)},token='a'.repeat(64);
test('all existing selected routes return one replacement document',()=>{for(const path of ['/games/multi_hot_100','/games/wild_multi_stars','/games/multi-hot-100','/games/wild-multi-stars','/games/multi_hot_5_video','/games/hot_foxy_20','/games/hot-foxy-20','/slots/game.html?game=multi_hot_5_video','/play/multi-hot-5-new','/mh5-video-v1/index.html']){assert.ok(resolveGame(new URL(base+path)));const page=machinePage(new Request(base+path),config);assert.equal(page.status,200);assert.equal(page.headers.get('Cache-Control'),'no-store');}for(const path of ['/games/multi_hot_40','/games/jungle_sisters','/','/api/config'])assert.equal(resolveGame(new URL(base+path)),null);});
test('replacement contains no legacy controllers, iframe or video',async()=>{const r=machinePage(new Request(base+'/games/hot_foxy_20'),config),html=await r.text();assert.equal((html.match(/id="machine-canvas"/g)||[]).length,1);assert.equal((html.match(/id="spin"/g)||[]).length,1);assert.ok(!/<(?:video|iframe)\b/.test(html));assert.ok(!/game-repair|zplaybet-v232|mh5-video/.test(html));assert.ok(html.includes(config.presence));assert.ok(r.headers.get('Content-Security-Policy').includes("script-src 'self'"));});
for(const game of ['multi_hot_5_video','hot_foxy_20','multi_hot_100','wild_multi_stars']){
 test('generated '+game+' HTML loads its stylesheet and controller through the deployed asset routes',async()=>{
  const pageURL=new URL('/games/'+game,base),page=machinePage(new Request(pageURL),config);
  assert.equal(page.status,200);
  const html=await page.text(),references=[];
  for(const match of html.matchAll(/<(link|script)\b[^>]*>/gi)){
   const tag=match[0],kind=match[1].toLowerCase();
   if(kind==='link'&&!/\brel\s*=\s*["']stylesheet["']/i.test(tag))continue;
   const value=tag.match(/\b(?:href|src)\s*=\s*["']([^"']+)["']/i)?.[1];
   if(!value)continue;
   const url=new URL(value,pageURL);
   // The existing presence module is served by the outer Player router.
   if(kind==='script'&&url.pathname==='/player-v236/'+config.presence)continue;
   references.push({kind,url});
  }
  const expectedFiles=['controller.mjs','official-startup-critical.css','official-startup-guard.js','style.css'];
  assert.deepEqual(references.map(({url})=>url.pathname.split('/').at(-1)).sort(),expectedFiles,'the page declares the controller, stylesheet, and independent first-paint bootstrap');
  for(const {kind,url}of references){
   assert.equal(url.origin,pageURL.origin,'bootstrap assets remain same-origin');
   const asset=machinePage(new Request(url),config);
   assert.ok(asset instanceof Response,game+': rendered asset URL is not served: '+url.pathname);
   assert.equal(asset.status,200,game+': '+url.pathname);
   assert.equal(asset.headers.get('X-Zplay-Release'),release);
   assert.equal(url.pathname,'/'+release+'/'+url.pathname.split('/').at(-1));
   assert.match(asset.headers.get('Content-Type')||'',kind==='link'?/^text\/css\b/:/^application\/javascript\b/);
   assert.match(asset.headers.get('Cache-Control')||'',/immutable/);
   const source=await asset.text();assert.ok(source.length>0,'bootstrap asset must contain its actual source');
   if(url.pathname.endsWith('/official-startup-critical.css')){
    const logoPath=source.match(/url\(['"]?(\.\/official-startup-logo\.gif)['"]?\)/)?.[1];assert.ok(logoPath,'first-paint stylesheet must reference the original GIF');
    const logo=machinePage(new Request(new URL(logoPath,url)),config);assert.equal(logo?.status,200);assert.equal(logo.headers.get('Content-Type'),'image/gif');assert.equal(new TextDecoder().decode((await logo.arrayBuffer()).slice(0,6)),'GIF89a');
   }
  }
 });
}
test('guest session never requests a balance',async()=>{const r=await machineAPI(new Request(base+'/api/machine-session'),env,{}, {fetch(){throw Error('No backend calls for guest')}});assert.deepEqual(await r.json(),{authenticated:false});});
test('authenticated read-only adapter exposes no authentication token',async()=>{const calls=[],req=new Request(base+'/api/machine-session',{headers:{cookie:'sw_session='+token}});const r=await machineAPI(req,env,{}, {fetch:async req=>{calls.push(req);return Response.json(req.url.endsWith('/session')?{authenticated:true}:{balance:'42.00',currency:'ETB'});}});const data=await r.json();assert.equal(data.balance,'42.00');assert.equal(data.sessionId,await sessionIdentity(req));assert.notEqual(data.sessionId,token);assert.ok(calls.every(r=>r.method==='GET'));});
test('account switch and cross-origin request stop before financial backend',async()=>{for(const headers of [{cookie:'sw_session='+token,'X-Zplay-Machine-Session':'b'.repeat(64),origin:base},{cookie:'sw_session='+token,'X-Zplay-Machine-Session':await sessionIdentity(new Request(base,{headers:{cookie:'sw_session='+token}})),origin:'https://wrong.example'}]){const r=await machineAPI(new Request(base+'/api/slots/spin',{method:'POST',headers}),env,{},{});assert.equal(r.status,403);}});
test('existing presence lease still required for bound wallet access',async()=>{let calls=0;const handler=install({fetch:async()=>{calls++;return Response.json({})}},{},config);const r=await handler(new Request(base+'/api/machine-session',{headers:{cookie:'sw_session='+token}}),env,{});assert.equal(r.status,401);assert.equal(calls,0);});
test('valid presence lease and session route reaches existing ledger read only',async()=>{const lease=await issue(token,env.PLAYER_PRESENCE_KEY),calls=[];const handler=install({fetch:async req=>{calls.push(req.url);return Response.json(req.url.endsWith('/session')?{authenticated:true}:{currency:'ETB',balance:'25.00'})}},{},config);const r=await handler(new Request(base+'/api/machine-session',{headers:{cookie:'sw_session='+token+'; __Host-zplay_presence='+lease}}),env,{});assert.equal((await r.json()).balance,'25.00');assert.equal(calls.length,2);});
test('Agent portal and unrelated API routes retain original handler',async()=>{let calls=0;const handler=install({fetch:async()=>{calls++;return new Response('original')}},{},config);assert.equal(await (await handler(new Request(base+'/games/hot_foxy_20'),{PORTAL:'agent'},{})).text(),'original');assert.equal(await (await handler(new Request(base+'/api/config'),env,{})).text(),'original');assert.equal(calls,2);});
test('every vector control surface loads as a same-origin immutable SVG',async()=>{
 const css=await machinePage(new Request(base+'/'+release+'/style.css'),config).text();
 const files=[...css.matchAll(/url\('\.\/([^']+\.svg)'\)/g)].map(m=>m[1]);assert.equal(new Set(files).size,4);
 for(const file of new Set(files)){const response=machinePage(new Request(base+'/'+release+'/'+file),config);assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/^image\/svg\+xml/);assert.match(response.headers.get('Cache-Control'),/immutable/);const xml=await response.text();assert.match(xml,/viewBox=/);assert.ok(!/<(?:image|script|foreignObject)\b|(?:href|src)=/.test(xml));}
});
