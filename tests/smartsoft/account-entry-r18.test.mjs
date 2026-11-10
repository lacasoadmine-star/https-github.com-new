import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {installConstructionPlayer} from '../../deploy/smartsoft/construction-player-r15.mjs';
import {installMobileDisplay} from '../../deploy/smartsoft/mobile-display-player-r15.mjs';
import {installAccountLibrary,ACCOUNT_PREFIX} from '../../deploy/smartsoft/account-library-r18.mjs';
import {ACCOUNT_GAME_IDS} from '../../deploy/smartsoft/sign-in-return-r18.mjs';
const source=await readFile(new URL('../../deploy/smartsoft/account-entry-r18.mjs',import.meta.url),'utf8');
const context=vm.createContext({AbortController,setTimeout,clearTimeout});
vm.runInContext(source.replace(/^import .*\n/,'').replace('export async function','async function'),context);
const check=context.checkGameAccount;

test('only a verified signed-out original account returns to the same-origin login',async()=>{
 for(const id of ACCOUNT_GAME_IDS){
  const calls=[],destinations=[];
  const result=await check({location:{pathname:'/games/'+id},ids:ACCOUNT_GAME_IDS,
   fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json({authenticated:false});},navigate:path=>destinations.push(path)});
  assert.equal(result,'sign-in');assert.deepEqual(destinations,['/?play='+id]);assert.equal(calls.length,1);
  assert.equal(calls[0].url,'/api/machine-session');assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].options.method,undefined);
 }
});

test('authenticated, unavailable, malformed and out-of-scope states never redirect or wager',async()=>{
 for(const[status,body,expected]of [[200,{authenticated:true},'authenticated'],[503,{authenticated:false},'unavailable'],[200,{},'unavailable'],[401,{error:'UNAUTHORIZED'},'unavailable']]){
  const result=await check({location:{pathname:'/games/multihotdeluxe_native'},ids:ACCOUNT_GAME_IDS,fetchImpl:async()=>Response.json(body,{status}),navigate:()=>assert.fail('unexpected redirect')});assert.equal(result,expected);
 }
 assert.equal(await check({location:{pathname:'/games/multihotdeluxe_native'},ids:ACCOUNT_GAME_IDS,fetchImpl:async()=>{throw Error('offline');},navigate:()=>assert.fail('offline redirect')}),'unavailable');
 for(const path of ['/games/coinminer_native','/games/foxy_hot_20_native','/games/multihotdeluxe_native/extra','//evil.example','/'])assert.equal(await check({location:{pathname:path},ids:ACCOUNT_GAME_IDS,fetchImpl:()=>assert.fail('out of scope request')}),'outside-scope');
});

test('existing root sign-in gains immutable revised helper and nine pages retain validated return destination',async()=>{
 const original='<html><head><script type="module" src="/jetx-sign-in-20261107.mjs"></script></head><body>existing account</body></html>';
 const app=installConstructionPlayer({fetch:async()=>new Response(original,{headers:{'content-type':'text/html'}})});
 const html=await(await app.fetch(new Request('https://player.test/'),{PORTAL:'player'})).text();assert.ok(html.includes('auth-r18/sign-in.mjs'));assert.ok(html.includes('existing account'));assert.ok(!html.includes('src="/jetx-sign-in-20261107.mjs"'));
 const old='<html><head><script src="/native-library/remaining20/20261110-reference-mobile-r14/fe6fe5c2996189a2/app.mjs"></script></head><body><a href="/" class="account-link" id="accountLink">Account</a></body></html>';
 const game=installMobileDisplay({fetch:async()=>new Response(old,{headers:{'content-type':'text/html'}})});
 for(const id of ACCOUNT_GAME_IDS){const response=await game.fetch(new Request('https://player.test/games/'+id),{PORTAL:'player'}),body=await response.text();assert.ok(body.includes('href="/?play='+id+'"'));assert.ok(body.includes('auth-r18/entry.mjs'));}
});

test('public account resources strip credentials and all financial requests keep original identity',async()=>{
 const calls=[],assets=[],previous={scheduled(){},fetch:async r=>{calls.push(r);return new Response('retained');}},env={PORTAL:'player',EXPANSION100:{fetch:async r=>{assets.push(r);return new Response('public');}}};
 const app=installConstructionPlayer(previous);
 for(const name of ['entry','sign-in']){await app.fetch(new Request('https://player.test/native-library/remaining20/20261110-construction-r15/auth-r18/'+name+'.mjs',{headers:{cookie:'private',authorization:'private'}}),env);assert.equal(assets.at(-1).headers.get('cookie'),null);assert.equal(assets.at(-1).headers.get('authorization'),null);}
 const library=installAccountLibrary(previous,{'entry.mjs':{text:'export {};',type:'application/javascript'}});
 assert.equal((await library.fetch(new Request('https://library.test'+ACCOUNT_PREFIX+'entry.mjs',{method:'HEAD'}),{})).status,200);
 assert.equal((await library.fetch(new Request('https://library.test'+ACCOUNT_PREFIX+'entry.mjs',{method:'POST'}),{})).status,405);
 assert.equal((await library.fetch(new Request('https://library.test'+ACCOUNT_PREFIX+'../private.mjs'),{})).status,200); // normalized out of this public prefix, delegated
 for(const path of ['/api/machine-session','/api/remaining20/state?game_id=multihotdeluxe_native','/api/remaining20/action','/api/wallet/transfer']){
  const request=new Request('https://player.test'+path,{headers:{cookie:'original'}});await app.fetch(request,env);assert.equal(calls.at(-1),request);await library.fetch(request,{});assert.equal(calls.at(-1),request);
 }
});
