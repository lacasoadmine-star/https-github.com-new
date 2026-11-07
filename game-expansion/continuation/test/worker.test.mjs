import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {installExpansion,extendCatalogue,PREFIX} from '../worker.mjs';
import {ASSETS,GAMES} from '../client-assets.mjs';

const origin='https://superwin-player.apdiy61.workers.dev';
const engine='https://engine.example.test',secret='test-key-'.repeat(8),token='b'.repeat(64);
const cookie='sw_session='+token,session=createHash('sha256').update('zplay-library-session:'+token).digest('hex');
// An isolated bridge fixture exercises authentication even while the strict
// production release gate intentionally has no completed new machines.
const available=[{...GAMES[0],launchable:true}],game=available[0];
const testConfigs=GAMES.map(row=>row.id===game.id?game:{...row,launchable:false});
const body=JSON.stringify({request_id:'fa415846-fb6a-4c92-9597-6d99fe94797f',type:'start',game_id:game.id,model_version:game.version,stake:'0.10',options:{}});
const headers={cookie,origin,'content-type':'application/json','X-Zplay-Library-Session':session};
function fixture(authenticated=true){
 const calls=[];const previous={scheduled:()=>42,fetch:async request=>{calls.push(new URL(request.url).pathname);return new URL(request.url).pathname==='/api/machine-session'?Response.json({authenticated}):new Response('retained-route');}};
 return {worker:installExpansion(previous,{gameConfigs:testConfigs}),calls,env:{PORTAL:'player',NATIVE_ENGINE_ORIGIN:engine,NATIVE_ENGINE_SECRET:secret},previous};
}
const run=(f,path,init={})=>f.worker.fetch(new Request(origin+path,init),f.env,{waitUntil(){}});

test('all available distinct machine routes serve the bundled client and same-origin resources',async()=>{
 const f=fixture();assert.ok(available.length>0);
 for(const game of available){const response=await run(f,'/games/'+game.id);assert.equal(response.status,200);assert.equal(await response.text(),ASSETS['index.html']);assert.match(response.headers.get('content-security-policy'),/connect-src 'self'/);const art=await run(f,'/assets/zplay-'+game.id+'.svg');assert.equal(art.status,200);assert.match(await art.text(),/<svg/);}
 assert.equal((await run(f,PREFIX+'missing.js')).status,404);
 assert.equal((await run(f,'/games/'+game.id,{method:'POST'})).status,405);
});
test('reference-pending models never become wagerable machines or catalogue entries',async()=>{
 const f=fixture(),catalogue=extendCatalogue({games:[]},available);
 for(const game of testConfigs.filter(game=>!game.launchable)){
  assert.equal((await run(f,'/games/'+game.id)).status,503);
  assert.equal((await run(f,'/api/expansion/state?game_id='+game.id,{headers:{cookie}})).status,422);
  assert.equal(catalogue.games.some(entry=>entry.id===game.id),false);
 }
});
test('legacy games, Balloon, JetX, other portals and scheduled handler remain delegated',async()=>{
 const f=fixture();for(const path of ['/games/balloon_native','/games/jetx_native','/games/multi_hot_5_video','/games/multi_hot_5_native','/games/hot_foxy_20','/games/foxy_hot_20_native','/api/library/state?game_id=balloon_native'])assert.equal(await(await run(f,path)).text(),'retained-route');
 assert.equal(f.worker.scheduled,f.previous.scheduled);
 for(const portal of ['agent','admin']){f.env.PORTAL=portal;assert.equal(await(await run(f,'/games/'+game.id)).text(),'retained-route');}
});
test('unauthenticated and invalid identities cannot read or submit wagers',async()=>{
 const f=fixture();assert.equal((await run(f,'/api/expansion/state?game_id='+game.id)).status,401);
 assert.equal((await run(f,'/api/expansion/action',{method:'POST',headers:{origin},body})).status,401);
 assert.equal((await run(fixture(false),'/api/expansion/state?game_id='+game.id,{headers:{cookie}})).status,401);
});
test('cross-origin and changed-session actions are rejected before contacting the engine',async()=>{
 const f=fixture();for(const extra of [{origin:'https://unrelated.example'},{'X-Zplay-Library-Session':'wrong'}]){const r=await run(f,'/api/expansion/action',{method:'POST',headers:{...headers,...extra},body});assert.equal(r.status,403);}
 assert.equal(f.calls.length,0);
});
test('malformed, oversized and wrong-game requests cannot reach the engine',async()=>{
 const f=fixture();for(const [body,status] of [['{',400],['x'.repeat(8193),413],[JSON.stringify({game_id:'balloon_native'}),422]])assert.equal((await run(f,'/api/expansion/action',{method:'POST',headers,body})).status,status);
 assert.equal(f.calls.length,0);
});
test('read-only state uses authenticated subject and exact signed upstream path',async t=>{
 const f=fixture(),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);let seen;
 globalThis.fetch=async(url,options)=>{seen={url:String(url),options};return Response.json({game,balance:'12.34',currency:'ETB',round:null});};
 const response=await run(f,'/api/expansion/state?game_id='+game.id,{headers:{cookie}});assert.equal(response.status,200);const result=await response.json();assert.equal(result.balance,'12.34');assert.equal(result.sessionId,session);assert.equal(result.authenticated,true);
 const path='/v2/library/state?game_id='+game.id;assert.equal(seen.url,engine+path);
 const signed=seen.options.headers;const canonical=['GET',path,signed['x-native-time'],signed['x-native-user'],createHash('sha256').update('').digest('hex')].join('\n');
 assert.equal(signed['x-native-user'],'@session:'+createHash('sha256').update(token).digest('hex'));
 assert.equal(signed['x-native-signature'],createHmac('sha256',secret).update(canonical).digest('hex'));
});
test('one frozen wager body is forwarded once and only server balance is returned',async t=>{
 const f=fixture(),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);let count=0,seen;
 globalThis.fetch=async(url,options)=>{count++;seen=options;return Response.json({balance:'12.24',round:{status:'settled',payoutMinor:'0'}});};
 const response=await run(f,'/api/expansion/action',{method:'POST',headers,body});assert.equal(response.status,200);assert.equal(count,1);assert.equal(seen.body,body);assert.equal((await response.json()).balance,'12.24');
});
test('upstream uncertainty never creates a success, balance or replacement wager',async t=>{
 const f=fixture(),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);globalThis.fetch=async()=>{throw Error('disconnected');};
 const response=await run(f,'/api/expansion/action',{method:'POST',headers,body});assert.equal(response.status,503);const data=await response.json();assert.equal(data.error,'RETRY_SAME_REQUEST');assert.equal(data.balance,undefined);
});
test('catalogue preserves old entries byte-for-byte and introduces each new title once',()=>{
 const entries=['multi_hot_5_video','multi_hot_5_native','hot_foxy_20','foxy_hot_20_native','jetx_native','balloon_native'].map(id=>({id,unchanged:'original'}));
 const once=extendCatalogue({games:entries},available),twice=extendCatalogue(once,available);
 assert.deepEqual(once.games.slice(0,entries.length),entries);assert.deepEqual(twice,once);assert.equal(new Set(once.games.map(game=>game.id)).size,once.games.length);assert.equal(once.games.length,entries.length+available.length);
});
test('the generated catalogue exports every symbol imported by the retained lobby',async()=>{
 const localCatalogue=new URL('../../games/balloon/catalog.mjs',import.meta.url).href;
 const source=ASSETS['catalog.mjs'].replace('/native-library/balloon/v1/catalog.mjs',localCatalogue);
 const catalogue=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const names=ASSETS['lobby.mjs'].match(/import\s*\{([^}]+)\}\s*from\s*'\.\/catalog\.mjs'/)[1].split(',').map(name=>name.trim());
 for(const name of names)assert.notEqual(catalogue[name],undefined,'Missing lobby import: '+name);
 const original=[{id:'multi_hot_5_video',title:'Multi Hot 5'}],configuration=extendCatalogue({games:[]});
 const rows=catalogue.mergeNativeGames(original,configuration);
 assert.equal(rows.filter(row=>GAMES.some(game=>game.id===row.id)).length,GAMES.filter(game=>game.launchable).length);
 assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
});
test('the current production entry keeps every incomplete A-to-Z machine unpublished',async()=>{
 assert.equal(GAMES.filter(game=>game.launchable).length,0);
 assert.equal(extendCatalogue({games:[]}).games.length,0);
 const f=fixture();f.worker=installExpansion(f.previous);
 for(const game of GAMES)assert.equal((await run(f,'/games/'+game.id)).status,503);
});
