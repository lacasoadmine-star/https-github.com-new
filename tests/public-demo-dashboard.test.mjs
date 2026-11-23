import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PUBLIC_DEMO_CATALOG as catalog,validDemoURL,providerReadiness} from '../deploy/cloudflare/public-demo-catalog.mjs';
import {integrateLobbyHTML,integrateLobbyScript} from '../deploy/cloudflare/integrated-lobby.mjs';
import {readFile} from 'node:fs/promises';
import {wrapPlayer} from '../deploy/cloudflare/player-compat.mjs';
const html=await readFile(new URL('./fixtures/live-lobby-v244.html',import.meta.url),'utf8');
const source=await readFile(new URL('./fixtures/live-lobby-v244.mjs',import.meta.url),'utf8');
test('official demos have distinct IDs, approved launchers and source provenance',()=>{
 assert.ok(catalog.total_games>300);assert.equal(new Set(catalog.games.map(g=>g.id)).size,catalog.total_games);
 assert.equal(catalog.requested_games,1000);assert.equal(catalog.providers.smartsoft+catalog.providers.pragmatic,catalog.total_games);
 for(const game of catalog.games){if(game.launcher_verified)assert.ok(validDemoURL(game.launch_url),game.id);else assert.equal(game.demo_resolution,'official_provider_page');assert.equal(game.settlement_enabled,false);assert.equal(game.etb_enabled,false);assert.ok(game.provider_game_id||game.demo_resolution==='official_provider_page');assert.ok(!JSON.stringify(game).includes('TRUNCATED'));}
});
test('host validation rejects lookalikes, live portals, unsafe protocols and credentials',()=>{
 for(const value of ['javascript:alert(1)','https://demogamesfree.pragmaticplay.net.evil.test/gs2c/openGame.do?gameSymbol=x','https://x@y@eu-server.ssgportal.com/GameLauncher/Loader.aspx','https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?PortalName=LIVE&Token=DEMO&GameName=x'])assert.equal(validDemoURL(value),null);
});
test('restored dashboard preserves account links, original assets and accessible controls',()=>{
 const page=integrateLobbyHTML(html),script=integrateLobbyScript(source);
 for(const value of ['id="zplay-home"','id="catalog-more"','data-provider="pragmatic"','/account?view=deposit','/account?view=withdraw','id="demo-player"','LIVESTREAM','VIRTUAL SPORT','ZPLAY JETX'])assert.ok(page.includes(value),value);
 assert.ok(script.includes('games.slice(0,catalogLimit)'));assert.ok(script.includes('catalogLimit+=48'));assert.ok(page.includes('/player-live-v244/presence.mjs'));
});
test('future provider ETB launch is explicit and cannot mutate the wallet',async()=>{
 let touches=0;const worker=wrapPlayer({fetch:()=>{touches++;return new Response('legacy');}},{legacy:()=>{touches++;return new Response('legacy');},GAMES:{},sessionHeaders:h=>h});
 for(const key of ['smartsoft','pragmatic']){
  const game=catalog.games.find(g=>g.provider_key===key);
  for(const mode of ['DEMO','ETB']){
   const result=await worker.fetch(new Request('https://player.test/api/providers/launch',{method:'POST',headers:{origin:'https://player.test','content-type':'application/json'},body:JSON.stringify({game_id:game.id,mode})}),{});
   const body=await result.json();assert.equal(result.status,mode==='DEMO'?200:409);assert.equal(body.settlement_enabled,false);if(mode==='DEMO')assert.equal(body.launch_url,game.launch_url);else assert.equal(body.error,'PROVIDER_API_NOT_CONFIGURED');
  }
 }
 assert.equal(touches,0);assert.ok(providerReadiness().providers.every(p=>!p.live_enabled));
});
test('account styling preserves real account HTML, session cookies and forms',async()=>{
 const original={fetch:async()=>new Response('<html><head></head><body><form action="/api/login"><input name="password" type="password"></form></body></html>',{headers:{'content-type':'text/html','set-cookie':'existing=account; Secure; HttpOnly'}})};
 const worker=wrapPlayer(original,{legacy:()=>assert.fail('unexpected legacy override'),GAMES:{},sessionHeaders:h=>h});
 const r=await worker.fetch(new Request('https://player.test/account?view=profile'),{});assert.equal(r.headers.get('set-cookie'),'existing=account; Secure; HttpOnly');const body=await r.text();assert.match(body,/account.css/);assert.match(body,/<form action="\/api\/login">/);assert.match(body,/name="password"/);assert.ok(!body.includes('100.00'));
});
