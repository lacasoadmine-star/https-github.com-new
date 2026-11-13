import test from 'node:test';
import assert from 'node:assert/strict';
import {installPairFreeze, FREEZE_PREFIX, GAME_IDS, pausedPath} from './pair-freeze.mjs';
import {mergeNativeGames, homeGames} from './pair-catalog.mjs';
const env = {PORTAL: 'player'}, ctx = {};
const req = (path, options) => new Request('https://player.example' + path, options);
function fixture() {
  const calls = [];
  const current = {marker: 'current', async fetch(request, e, c) {assert.equal(this, current); calls.push({kind:'current', request, env:e, ctx:c}); return Response.json(new URL(request.url).pathname === '/api/config' ? {currency:'ETB', games:[...GAME_IDS.map(id=>({id})), {id:'jetx_native'}], accounts:'retained'} : {retained: true});}, scheduled(controller, e, c) {assert.equal(this,current);calls.push({kind:'scheduled',controller,env:e,ctx:c});return 'reconciled';}};
  const baseline = {async fetch(request,e,c) {calls.push({kind:'baseline',request,env:e,ctx:c}); const path=new URL(request.url).pathname; return path==='/' ? new Response('<html><script type="module" src="/player-native-catalog-20261107-r1/portal.mjs"></script></html>',{headers:{'Content-Type':'text/html','ETag':'old','Cache-Control':'public'}}) : path.endsWith('/portal.mjs') ? new Response("import {mergeNativeGames} from './native-catalog.mjs';",{headers:{'Content-Type':'application/javascript'}}) : new Response('original pair page');}};
  return {app:installPairFreeze(current,baseline,'export const pair = true;'),calls,current};
}
test('only the two protected financial IDs are exposed by catalog and home',()=>{
  const source=[{id:'jetx_native'},{id:'multi_hot_5_video'},...GAME_IDS.map(id=>({id}))];
  const games=mergeNativeGames(source,{games:source});
  assert.deepEqual(new Set(games.map(g=>g.id)),new Set(GAME_IDS));
  assert.equal(homeGames([...games,{id:'jetx_native'}]).length,2);
  assert.equal(mergeNativeGames(source,{games:[{id:GAME_IDS[0],enabled:false}]}).length,1);
});
test('both original native routes and their trailing slashes remain allowed',async()=>{
  for(const id of GAME_IDS)for(const suffix of ['', '/']){const {app,calls}=fixture();const r=await app.fetch(req('/games/'+id+suffix),env,ctx);assert.equal(r.status,200);assert.equal(await r.text(),'original pair page');assert.equal(calls[0].kind,'baseline');}
});
test('later catalogues and all other game launch routes are stopped before dispatch',async()=>{
  for(const path of ['/new74/','/new74/games/multi-hot-10/','/independent74/index.html','/native-expansion100/','/native-ui/main.mjs','/native-library/remaining20/foo','/games/jetx_native','/games/multi_hot_100_native','/play/multi-hot-5-new','/slots/game.html','/api/game-construction-queue']){const {app,calls}=fixture();assert.equal(pausedPath(path),true);assert.equal((await app.fetch(req(path),env,ctx)).status,410);assert.equal(calls.length,0);}
});
test('existing financial POST bodies, identity, session and replay reads pass unchanged',async()=>{
  for(const [path,options] of [['/api/slots/spin',{method:'POST',body:'{"game":"paused_game","client_token":"existing-token"}'}],['/api/slots/gamble',{method:'POST',body:'{"round":"existing-parent"}'}],['/api/slots/rounds'],['/api/machine-session'],['/api/slots/state/jetx_native']]){const {app,calls}=fixture();const request=req(path,options);assert.equal((await app.fetch(request,env,ctx)).status,200);assert.equal(calls.length,1);assert.equal(calls[0].kind,'current');assert.equal(calls[0].request,request);assert.equal(calls[0].env,env);assert.equal(calls[0].ctx,ctx);}
});
test('existing scheduled monetary reconciliation and its receiver are retained',()=>{
  const {app,calls}=fixture(),controller={cron:'* * * * *'};assert.equal(app.scheduled(controller,env,ctx),'reconciled');assert.equal(calls[0].kind,'scheduled');assert.equal(calls[0].controller,controller);
});
test('legacy independent74 financial replay and history routes remain current',async()=>{
  for(const family of ['account-api','api'])for(const action of ['state','action','history']){const {app,calls}=fixture();const request=req('/independent74/'+family+'/'+action,action==='action'?{method:'POST',body:'{"client_token":"existing-round"}'}:undefined);assert.equal((await app.fetch(request,env,ctx)).status,200);assert.equal(calls.length,1);assert.equal(calls[0].kind,'current');assert.equal(calls[0].request,request);}
});
test('public configuration hides other games while retaining other fields',async()=>{
  const {app}=fixture();const r=await app.fetch(req('/api/config'),env,ctx),data=await r.json();assert.deepEqual(data.games.map(g=>g.id),GAME_IDS);assert.equal(data.accounts,'retained');assert.equal(data.currency,'ETB');
});
test('home uses the new cache-safe catalog entry and preserves original markup',async()=>{
  const {app,calls}=fixture();const r=await app.fetch(req('/'),env,ctx),body=await r.text();assert.ok(body.includes(FREEZE_PREFIX+'portal.mjs'));assert.ok(!body.includes('new74'));assert.equal(r.headers.get('Cache-Control'),'no-store');assert.equal(r.headers.get('ETag'),null);assert.equal(calls[0].kind,'baseline');
});
test('new portal redirects only the catalog import and HEAD has no body',async()=>{
  const {app}=fixture();const body=await(await app.fetch(req(FREEZE_PREFIX+'portal.mjs'),env,ctx)).text();assert.ok(body.includes(FREEZE_PREFIX+'catalog.mjs'));const h=await app.fetch(req(FREEZE_PREFIX+'catalog.mjs',{method:'HEAD'}),env,ctx);assert.equal(await h.text(),'');
});
test('new presentation resources reject mutation; unrelated portal uses current',async()=>{
  const {app,calls}=fixture();assert.equal((await app.fetch(req(FREEZE_PREFIX+'catalog.mjs',{method:'POST'}),env,ctx)).status,405);assert.equal((await app.fetch(req('/'),{PORTAL:'agent'},ctx)).status,200);assert.equal(calls[0].kind,'current');
});
