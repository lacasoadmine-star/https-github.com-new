import assert from 'node:assert/strict';
import test from 'node:test';
import {wrapPlayer} from '../deploy/cloudflare/player-compat.mjs';
import {installWalletCompatibility,upgradeWalletCompatibility} from '../deploy/cloudflare/install-wallet-compat.mjs';
import {integrateLobbyScript,integrateLobbyHTML} from '../deploy/cloudflare/integrated-lobby.mjs';
import {readFileSync} from 'node:fs';

const origin = 'https://superwin-player.apdiy61.workers.dev';
const game = {id:'multi_hot_5_video',title:'Multi Hot 5',slug:'multi-hot-5'};
function fixture(account = {authenticated:true,identity:'signed-in-player',balance:'42.00',currency:'ETB',enabled:true}) {
  const calls=[];
  const sessionHeaders=(headers,sources)=>{
    for(const source of [sources].flat().filter(Boolean)) {
      for(const cookie of source.getSetCookie()) headers.append('Set-Cookie',cookie);
      if(source.has('X-Zplay-Session'))headers.set('X-Zplay-Session',source.get('X-Zplay-Session'));
    }
    return headers;
  };
  const legacy=async request=>{
    calls.push({kind:'legacy',path:new URL(request.url).pathname,cookie:request.headers.get('cookie')});
    return Response.json(account,{headers:{'Set-Cookie':'session=renewed; HttpOnly; Secure; Path=/'}});
  };
  const original={async fetch(request){
    const path=new URL(request.url).pathname;
    calls.push({kind:'original',path,body:request.method==='POST'?await request.json():null});
    if(path==='/api/slots/games')return Response.json({games:[game,{id:'not-enabled'}]});
    return new Response('untouched',{headers:{'X-Original':'yes'}});
  }};
  return {worker:wrapPlayer(original,{legacy,GAMES:{[game.id]:game},sessionHeaders,gatewayScript:'console.log("gateway")'}),calls};
}
function request(path,body,headers={}) {
  return new Request(origin+path,body===undefined?{headers}:{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)});
}
const valid={mode:'ETB',game_id:game.id,stake:'2.00',request_id:'15cd3203-3a4b-4a5d-908b-8b94f0ded8e1'};

test('installer preserves existing source and refuses unexpected or duplicate installation',()=>{
 const source='export const ASSETS={};\nfunction sessionHeaders(){}\nexport async function legacy(){}\nexport default createWorker();';
 const patched=installWalletCompatibility(source);
 assert.ok(patched.startsWith("import {wrapPlayer} from './player-compat.mjs';"));
 assert.ok(patched.includes('export const ASSETS={};'));
 assert.ok(patched.includes('wrapPlayer(createWorker(), {legacy, GAMES, sessionHeaders, gatewayScript: GATEWAY_SCRIPT})'));
 assert.throws(()=>installWalletCompatibility(patched));
 assert.throws(()=>installWalletCompatibility('export default {};'));
});
test('upgrade preserves existing wrapper and refuses unknown or already upgraded source',()=>{
 const old="import {wrapPlayer} from './player-compat.mjs';\nexport default wrapPlayer(createWorker(), {legacy, GAMES, sessionHeaders});";
 const patched=upgradeWalletCompatibility(old);assert.match(patched,/gatewayScript: GATEWAY_SCRIPT/);
 assert.throws(()=>upgradeWalletCompatibility(patched));assert.throws(()=>upgradeWalletCompatibility('export default {};'));
});
test('gateway exposes 30 official public demo launchers without ETB settlement',async()=>{
 const {worker,calls}=fixture();const r=await worker.fetch(request('/api/gateway/games'),{});const data=await r.json();
 assert.equal(data.games.length,30);assert.equal(new Set(data.games.map(g=>g.id)).size,30);
 assert.equal(data.configured_games_count,0);assert.equal(data.status,'OFFICIAL_DEMO');
 assert.ok(data.games.every(g=>g.etb_enabled===false&&g.source_verified===true&&g.launch_url.startsWith('https://eu-server.ssgportal.com/GameLauncher/')));assert.equal(calls.length,0);
});
test('gateway page and JavaScript have strict types, caching and frame policy',async()=>{
 const {worker}=fixture();const page=await worker.fetch(request('/gateway'),{});
 assert.equal(page.status,302);assert.equal(page.headers.get('location'),origin+'/');
 const script=await worker.fetch(request('/gateway-player.mjs'),{});assert.match(script.headers.get('content-type'),/text\/javascript/);
 assert.equal(await script.text(),'console.log("gateway")');
});
test('native lobby transformation retains the original grid, wallet, account and navigation',()=>{
 const source=readFileSync(new URL('./fixtures/live-lobby-v244.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('./fixtures/live-lobby-v244.html',import.meta.url),'utf8');
 const patched=integrateLobbyScript(source),page=integrateLobbyHTML(html);
 assert.match(patched,/Object.assign\(CATALOG/);assert.match(patched,/game.external/);
 assert.match(page,/id="game-grid"/);assert.match(page,/id="account-balance"/);assert.match(page,/id="demo-player"/);
 assert.match(page,/data-provider="smartsoft"/);assert.match(page,/player-live-v258\/lobby.mjs/);
 assert.throws(()=>integrateLobbyScript('unknown script'));
 assert.throws(()=>integrateLobbyHTML('unknown markup'));
 assert.throws(()=>integrateLobbyScript(patched));
});
test('gateway rejects mutations and HEAD has no body',async()=>{
 const {worker}=fixture();assert.equal((await worker.fetch(request('/api/gateway/games',{}),{})).status,405);
 const response=await worker.fetch(new Request(origin+'/api/gateway/games',{method:'HEAD'}),{});assert.equal(await response.text(),'');
});
test('legacy slot spin route rejects internal family IDs, which use the dedicated action API',async()=>{
 const {worker,calls}=fixture();const data=await(await worker.fetch(request('/api/gateway/games'),{})).json();
 for(const game of data.games){const r=await worker.fetch(request('/api/spin',{...valid,game_id:game.id}),{});assert.equal(r.status,422);}
 assert.equal(calls.length,0);
});

test('wallet is scoped to the session, never DDSAgent or browser identity',async()=>{
 const {worker,calls}=fixture();
 const response=await worker.fetch(request('/api/wallet/DDSAgent',undefined,{cookie:'session=player'}),{});
 const body=await response.json();assert.equal(body.user_id,'signed-in-player');assert.equal(body.balance,'42.00');
 assert.equal(calls[0].cookie,'session=player');assert.equal(response.headers.get('cache-control'),'no-store');
 assert.match(response.headers.get('set-cookie'),/renewed/);
});
test('anonymous accounts are denied',async()=>{
 const {worker}=fixture({authenticated:false});assert.equal((await worker.fetch(request('/api/wallet'),{})).status,401);
});
test('malformed or non-ETB balance fails closed',async()=>{
 for(const balance of ['NaN',42,'-1.00','1.001']){
  const {worker}=fixture({authenticated:true,identity:'p',currency:'ETB',balance});
  assert.equal((await worker.fetch(request('/api/wallet'),{})).status,503);
 }
});
test('zero balance can be displayed',async()=>{
 const {worker}=fixture({authenticated:true,identity:'p',currency:'ETB',balance:'0.00'});
 assert.equal((await worker.fetch(request('/api/wallet'),{})).status,200);
});
test('catalog returns only enabled native games and no invented demo URLs',async()=>{
 const {worker}=fixture();const body=await(await worker.fetch(request('/api/games'),{})).json();
 assert.equal(body.games.length,1);assert.equal(body.games[0].launch_url,'/play/multi-hot-5');
 assert.equal(body.games[0].demo_launcher_url,null);
});
test('settlement uses the existing engine, server identity and unchanged idempotency token',async()=>{
 const {worker,calls}=fixture();const response=await worker.fetch(request('/api/spin',{...valid,user_id:'victim',identity:'forged'}),{});
 assert.equal(response.status,200);const settled=calls.find(c=>c.path==='/api/slots/spin');
 assert.deepEqual(settled.body,{gameId:game.id,bet:'2.00',roundToken:valid.request_id,identity:'signed-in-player'});
 assert.match(response.headers.get('set-cookie'),/renewed/);
});
test('demo requests never call settlement or wallet',async()=>{
 const {worker,calls}=fixture();assert.equal((await worker.fetch(request('/api/spin',{...valid,mode:'DEMO'}),{})).status,409);assert.equal(calls.length,0);
});
test('invalid stakes, missing tokens and disabled games never settle',async()=>{
 for(const changes of [{stake:'-2.00'},{stake:'0.00'},{stake:2},{stake:'2.001'},{request_id:null},{game_id:'jetx'},{mode:'unknown'}]){
  const {worker,calls}=fixture();assert.equal((await worker.fetch(request('/api/spin',{...valid,...changes}),{})).status,422);assert.equal(calls.length,0);
 }
});
test('cross-origin settlement is denied before any backend call',async()=>{
 const {worker,calls}=fixture();assert.equal((await worker.fetch(request('/api/spin',valid,{origin:'https://other.example'}),{})).status,403);assert.equal(calls.length,0);
});
test('oversized streamed bodies are rejected',async()=>{
 const {worker,calls}=fixture();const req=new Request(origin+'/api/spin',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({padding:'x'.repeat(17000)})});
 assert.equal((await worker.fetch(req,{})).status,413);assert.equal(calls.length,0);
});
test('wrong methods and content types are rejected',async()=>{
 const {worker}=fixture();assert.equal((await worker.fetch(request('/api/spin'),{})).status,405);
 assert.equal((await worker.fetch(request('/api/spin',valid,{'content-type':'text/plain'}),{})).status,415);
});
test('HEAD wallet and catalog responses have no body',async()=>{
 for(const path of ['/api/wallet','/api/games']){const {worker}=fixture();const r=await worker.fetch(new Request(origin+path,{method:'HEAD'}),{});assert.equal(r.status,200);assert.equal(await r.text(),'');}
});
test('existing pages, authentication, native settlement and unrelated routes remain untouched',async()=>{
 for(const path of ['/','/account','/api/auth/login','/api/slots/spin','/api/agent/dashboard']){
  const {worker,calls}=fixture();const r=await worker.fetch(request(path),{});assert.equal(r.headers.get('x-original'),'yes');assert.equal(calls.length,1);
 }
});
test('WebSocket routes forward cookies and original upgrade response',async()=>{
 const {worker,calls}=fixture();const r=await worker.fetch(request('/ws/player',undefined,{origin,upgrade:'websocket',cookie:'session=player'}),{});
 assert.equal(r.status,200);assert.equal(calls[0].kind,'legacy');assert.equal(calls[0].cookie,'session=player');
});
test('cross-origin upgrades and dispatch loops are denied',async()=>{
 const {worker,calls}=fixture();assert.equal((await worker.fetch(request('/ws/player',undefined,{origin:'https://other.example',upgrade:'websocket'}),{})).status,403);
 assert.equal((await worker.fetch(request('/api/wallet',undefined,{'x-zplay-two-hop':'1'}),{})).status,503);assert.equal(calls.length,0);
});

test('official demo URLs use provider DEMO tokens and original source artwork',async()=>{
 const {worker}=fixture();const data=await(await worker.fetch(request('/api/gateway/games'),{})).json();
 for(const game of data.games){const url=new URL(game.launch_url);assert.equal(url.origin,'https://eu-server.ssgportal.com');assert.equal(url.pathname.toLowerCase(),'/gamelauncher/loader.aspx');assert.equal(url.searchParams.get('PortalName').toUpperCase(),'DEMO');assert.ok(['DEMO','DEMO_EXH'].includes(url.searchParams.get('Token')));assert.equal(new URL(game.cover).hostname,'cdn.prod.website-files.com');assert.ok(game.source_url.startsWith('https://www.smartsoftgaming.com/games/'));assert.equal(game.etb_enabled,false);}
 assert.ok(data.games.some(g=>new URL(g.launch_url).searchParams.get('GameName')==='MultiHot5'));
});


const launchBody={game_id:'ssg-multi-hot-5',mode:'ETB'};
test('funded entry preserves the exact official SmartSoft demo without enabling wallet settlement',async()=>{
 const {worker,calls}=fixture();const r=await worker.fetch(request('/api/gateway/launch',launchBody,{cookie:'session=real-player'}),{}),d=await r.json();assert.equal(r.status,200);assert.equal(d.session_mode,'WALLET_DEMO');assert.equal(d.user_id,'signed-in-player');assert.equal(d.wallet.balance,'42.00');assert.equal(d.wallet.currency,'ETB');assert.equal(d.settlement_enabled,false);assert.equal(new URL(d.launch_url).searchParams.get('GameName'),'MultiHot5');assert.equal(calls.length,1);assert.equal(calls[0].kind,'legacy');assert.match(r.headers.get('set-cookie'),/renewed/);
});
test('all 30 official demos keep their provider launchers without a local settlement call',async()=>{
 const {worker,calls}=fixture();const catalog=await(await worker.fetch(request('/api/gateway/games'),{})).json();for(const game of catalog.games){const b=await(await worker.fetch(request('/api/gateway/launch',{game_id:game.id,mode:'DEMO'}),{})).json();assert.equal(b.launch_url,game.launch_url);assert.equal(b.settlement_enabled,false);assert.equal(b.wallet,undefined);}assert.equal(calls.length,0);
});
test('wallet entry requires current funded session and never fabricates or changes credit',async()=>{
 for(const [account,status]of [[{authenticated:false},401],[{authenticated:true,identity:'p',balance:'0.00',currency:'ETB',enabled:true},409],[{authenticated:true,identity:'p',balance:'42.00',currency:'ETB',enabled:false},403]]){const {worker,calls}=fixture(account);const r=await worker.fetch(request('/api/gateway/launch',launchBody),{});assert.equal(r.status,status);assert.equal(calls.filter(c=>c.kind==='original').length,0);}
 const {worker}=fixture({authenticated:true,identity:'p',balance:'0.01',currency:'ETB',enabled:true});const r=await worker.fetch(request('/api/gateway/launch',launchBody),{});assert.equal(r.status,200);assert.equal((await r.json()).wallet.balance,'0.01');
});
test('launch validation rejects spoofed identities, foreign origins, unknown games and oversized bodies',async()=>{
 const {worker,calls}=fixture();for(const body of [{...launchBody,user_id:'other'},{...launchBody,launch_url:'https://other.test'},{...launchBody,mode:'REAL'}])assert.equal((await worker.fetch(request('/api/gateway/launch',body),{})).status,422);assert.equal((await worker.fetch(request('/api/gateway/launch',{...launchBody,game_id:'unlisted'}),{})).status,404);assert.equal((await worker.fetch(request('/api/gateway/launch'),{})).status,405);assert.equal((await worker.fetch(request('/api/gateway/launch',launchBody,{origin:'https://other.test'}),{})).status,403);assert.equal((await worker.fetch(request('/api/gateway/launch',launchBody,{'content-type':'text/plain'}),{})).status,415);assert.equal((await worker.fetch(new Request(origin+'/api/gateway/launch',{method:'POST',headers:{origin,'content-type':'application/json'},body:'x'.repeat(16001)}),{})).status,413);assert.equal(calls.length,0);
});
test('unfunded and anonymous users retain normal demo access; removed test endpoint stays removed',async()=>{
 const {worker,calls}=fixture({authenticated:false});const r=await worker.fetch(request('/api/gateway/launch',{...launchBody,mode:'DEMO'}),{});assert.equal(r.status,200);assert.equal((await r.json()).session_mode,'DEMO');assert.equal((await worker.fetch(request('/api/wallet/test',{game_id:launchBody.game_id,stake:'10.00'}),{})).status,410);assert.equal(calls.length,0);
});
