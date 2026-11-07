import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,createHash} from 'node:crypto';
import {installJetX,addCatalog,signedHeaders} from '../worker.mjs';
const origin='https://superwin.test',secret='test-only-secret-'.repeat(4),cookie='1'.repeat(64);
const priorRows=[{id:'multi_hot_5_video',name:'Multi Hot 5',favorite_key:'old-one'},{id:'foxy_hot_20_native',name:'Foxy Hot 20',sourceId:'original-native'}];
const env={PORTAL:'player',NATIVE_ENGINE_SECRET:secret,NATIVE_ENGINE_ORIGIN:'https://native.test'};
const previous={async fetch(request){const url=new URL(request.url);if(url.pathname==='/api/machine-session')return Response.json({authenticated:true,currency:'ETB',balance:'10.00'});if(url.pathname==='/api/native-families/state')throw Error('UNDEPLOYED_IDENTITY_ROUTE');if(url.pathname==='/api/config')return Response.json({games:priorRows,otherField:{value:1}});return new Response('preserved:'+url.pathname,{headers:{'x-previous':'true'}});}};
const app=installJetX(previous);
const request=(pathname,options={})=>new Request(origin+pathname,options);
const sessionId=createHash('sha256').update('zplay-jetx-session:'+cookie).digest('hex');
const headers={cookie:'sw_session='+cookie,origin,'content-type':'application/json','X-Zplay-JetX-Session':sessionId};

test('catalogue addition preserves every existing object, identifier, order and field',()=>{
 const source={games:priorRows,otherField:{value:1}},result=addCatalog(source);
 assert.deepEqual(result.games.slice(0,-1),priorRows);assert.equal(result.games.at(-1).id,'jetx_native');assert.equal(result.otherField,source.otherField);assert.equal(source.games.length,2);
 assert.throws(()=>addCatalog(result),/COLLISION/);
});
test('all old game, financial, login, agent and admin routes retain their handler',async()=>{
 for(const path of ['/games/hot_foxy_20','/games/multi_hot_5_native','/games/foxy_hot_20_native','/games/multi_hot_100','/native/ssg-jetx','/api/slots/spin','/account','/agent','/admin']){
  const response=await app.fetch(request(path),env,{});assert.equal(response.headers.get('x-previous'),'true');assert.equal(await response.text(),'preserved:'+path);
 }
 const response=await app.fetch(request('/api/jetx/state'),{...env,PORTAL:'admin'},{});assert.equal(response.headers.get('x-previous'),'true');
});
test('missing sessions, cross-origin writes, stale session bindings and oversized streaming bodies fail closed',async()=>{
 assert.equal((await app.fetch(request('/api/jetx/state'),env,{})).status,401);
 assert.equal((await app.fetch(request('/api/jetx/action',{method:'POST',headers:{...headers,origin:'https://attacker.test'},body:'{}'}),env,{})).status,403);
 assert.equal((await app.fetch(request('/api/jetx/action',{method:'POST',headers:{...headers,'X-Zplay-JetX-Session':'2'.repeat(64)},body:'{}'}),env,{})).status,403);
 const response=await app.fetch(request('/api/jetx/action',{method:'POST',headers,body:'x'.repeat(9000)}),env,{});assert.equal(response.status,413);
});
test('HMAC exactly matches the existing native server protocol including query and body',async()=>{
 const method='POST',path='/v2/jetx/action',body='{"stake":"5.50"}',now=1700000000000;
 const result=await signedHeaders(secret,'canonical-player',method,path,body,now);
 const expected=createHmac('sha256',secret).update([method,path,String(now),'canonical-player',createHash('sha256').update(body).digest('hex')].join('\n')).digest('hex');
 assert.equal(result['x-native-signature'],expected);
});
test('the actual machine-session contract signs a session digest without forwarding raw cookies or browser identities',async()=>{
 const originalFetch=globalThis.fetch;let captured;
 globalThis.fetch=async(url,options)=>{captured={url:String(url),options};return Response.json({gameId:'jetx_native',userId:'canonical-player',balance:'10.00'});};
 try{
  const response=await app.fetch(request('/api/jetx/state',{headers:{cookie:'sw_session='+cookie,'x-native-user':'attacker'}}),env,{}),data=await response.json();
  assert.equal(data.userId,'canonical-player');assert.equal(data.sessionId,sessionId);assert.equal(captured.options.headers['x-native-user'],'@session:'+createHash('sha256').update(cookie).digest('hex'));assert.equal(captured.options.headers.cookie,undefined);
  assert.equal(captured.url,'https://native.test/v2/jetx/state');
 }finally{globalThis.fetch=originalFetch;}
});
test('a signed-out machine-session response cannot open a JetX API route',async()=>{
 const signedOut=installJetX({fetch:async()=>Response.json({authenticated:false})});
 const response=await signedOut.fetch(request('/api/jetx/state',{headers:{cookie:'sw_session='+cookie}}),env,{});assert.equal(response.status,401);assert.equal((await response.json()).error,'PLAYER_LOGIN_REQUIRED');
});
test('session denial from the existing presence gate is retained verbatim',async()=>{
 const denied=installJetX({fetch:async()=>new Response('expired',{status:401,headers:{'set-cookie':'sw_session=; Max-Age=0'}})});
 const response=await denied.fetch(request('/api/jetx/state',{headers:{cookie:'sw_session='+cookie}}),env,{});assert.equal(response.status,401);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
});
test('the existing JetX sign-in link opens the real player login instead of a missing account page',async()=>{
 const redirect=await app.fetch(request('/account?view=login'),env,{});assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),origin+'/?play=jetx_native');
 const module=await app.fetch(request('/jetx-sign-in-20261107.mjs'),env,{});assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);
});
