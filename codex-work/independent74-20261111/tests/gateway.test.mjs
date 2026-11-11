import test from 'node:test';
import assert from 'node:assert/strict';
import {createGateway, hash, csrfGuard} from '../gateway.mjs';

const ORIGIN='https://player.example';
const TOKEN='local-qa-session-token-only';
const GAME='ind74_mineisland2';
const REQUEST_ID='00000000-0000-4000-8000-000000000001';
const ENV={NATIVE_ENGINE_ORIGIN:'https://engine.example',NATIVE_ENGINE_SECRET:'local-test-signing-key-only'};
const validState=()=>({authenticated:true,currency:'ETB',wallet:{balance_minor:'990'},game:{id:GAME},activeRound:null,history:[]});
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
function fixture({fetchImpl=async()=>json(validState()),identity=()=>json({authenticated:true})}={}){
  const previousCalls=[];
  const previous={fetch:async(request,env,ctx)=>{previousCalls.push({request,env,ctx});return new URL(request.url).pathname==='/api/machine-session'?identity():new Response('legacy-response',{status:207,headers:{'x-legacy':'preserved'}});}};
  const handler=createGateway({previous,fetchImpl,games:[{id:GAME}],assets:{'/index.html':{body:'<html>local QA</html>',type:'text/html; charset=utf-8',etag:'"index-test"'},'/app.mjs':{body:'export const localQA=true;',type:'application/javascript',etag:'"app-test"'}}});
  return {handler,previousCalls};
}
function stateRequest(cookie='sw_session='+TOKEN){return new Request(ORIGIN+'/independent74/api/state?game_id='+GAME,{headers:cookie?{cookie}:{}});}
async function actionRequest(body={},headers={}){
  return new Request(ORIGIN+'/independent74/api/action',{method:'POST',headers:{cookie:'sw_session='+TOKEN,origin:ORIGIN,'content-type':'application/json','x-independent74-session':await csrfGuard(TOKEN),...headers},body:JSON.stringify({request_id:REQUEST_ID,game_id:GAME,type:'play',stake_minor:'10',...body})});
}

test('legacy routes and POST requests delegate with unchanged object, env and context',async()=>{
  const {handler,previousCalls}=fixture();const context={tag:'qa-context'};
  for(const path of ['/','/api/config','/games/existing_native','/independent74-other']){
    const request=new Request(ORIGIN+path,{method:'POST',body:'unchanged-legacy-body'});
    const response=await handler(request,ENV,context);
    assert.equal(response.status,207);assert.equal(await response.text(),'legacy-response');
    const call=previousCalls.at(-1);assert.equal(call.request,request);assert.equal(call.env,ENV);assert.equal(call.ctx,context);
  }
});

test('missing, empty and duplicate session cookies fail before contacting identity/backend',async()=>{
  for(const cookie of ['', 'sw_session=', 'sw_session=one; sw_session=two']){
    let network=0;const {handler,previousCalls}=fixture({fetchImpl:async()=>{network++;return json(validState());}});
    const response=await handler(stateRequest(cookie),ENV,{});
    assert.equal(response.status,401);assert.equal(previousCalls.length,0);assert.equal(network,0);
  }
});

test('POST rejects another origin, missing guard and client payout authority',async()=>{
  let network=0;const {handler}=fixture({fetchImpl:async()=>{network++;return json(validState());}});
  for(const [body,headers,status] of [
    [{},{origin:'https://other.example'},403],
    [{},{'x-independent74-session':''},403],
    [{payout_minor:'100000000'},{},400],
    [{balance_minor:'100000000'},{},400],
    [{options:{win:true}},{},400],
  ]){const response=await handler(await actionRequest(body,headers),ENV,{});assert.equal(response.status,status);}
  assert.equal(network,0);
});

test('missing backend fails closed without emitting a free balance',async()=>{
  let network=0;const {handler}=fixture({fetchImpl:async()=>{network++;return json(validState());}});
  const response=await handler(stateRequest(),{},{});const body=await response.json();
  assert.equal(response.status,503);assert.equal(body.error.code,'ACCOUNT_SERVICE_UNAVAILABLE');assert.equal('wallet' in body,false);assert.equal(network,0);
});

test('backend identity signs only sw_session token hash and does not forward raw cookies',async()=>{
  const calls=[];const {handler}=fixture({fetchImpl:async(target,options)=>{calls.push({target,options});return json(validState());}});
  const response=await handler(stateRequest('irrelevant=first; sw_session='+TOKEN+'; tracking=last'),ENV,{});
  assert.equal(response.status,200);assert.equal(calls.length,1);
  const {target,options}=calls[0];assert.equal(target.href,'https://engine.example/v1/independent74/state?game_id='+GAME);
  assert.equal(options.headers['x-native-user'],'@session:'+await hash(TOKEN));
  assert.equal(options.headers.cookie,undefined);assert.equal(JSON.stringify(options.headers).includes(TOKEN),false);
  const text=['GET',target.pathname+target.search,options.headers['x-native-time'],options.headers['x-native-user'],await hash('')].join('\n');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(ENV.NATIVE_ENGINE_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(text)));
  assert.equal(options.headers['x-native-signature'],Buffer.from(bytes).toString('hex'));
  assert.equal((await response.json()).sessionGuard,await csrfGuard(TOKEN));
});

test('malformed successful account payloads are rejected as upstream failures',async()=>{
  for(const value of [{authenticated:true,currency:'USD',wallet:{balance_minor:'10'},game:{id:GAME}}, {authenticated:true,currency:'ETB',wallet:{balance_minor:'-1'},game:{id:GAME}}, {authenticated:true,currency:'ETB',wallet:{balance_minor:'10'},game:{id:'another-game'}}]){
    const {handler}=fixture({fetchImpl:async()=>json(value)});const response=await handler(stateRequest(),ENV,{});assert.equal(response.status,502);
  }
  for(const raw of ['{broken-json','null']){
    const {handler}=fixture({fetchImpl:async()=>new Response(raw,{headers:{'content-type':'application/json'}})});const response=await handler(stateRequest(),ENV,{});assert.equal(response.status,502,raw);
  }
});

test('unknown POST transport outcome is ambiguous and never retried',async()=>{
  let calls=0;const {handler}=fixture({fetchImpl:async()=>{calls++;throw new DOMException('timed out','AbortError');}});
  const response=await handler(await actionRequest(),ENV,{});const body=await response.json();
  assert.equal(response.status,503);assert.equal(body.error.code,'ACTION_UNCONFIRMED');assert.equal(body.retryable,true);assert.equal(calls,1);assert.equal('wallet' in body,false);
});

test('isolated assets honor missing/HEAD/304 boundaries and CSP',async()=>{
  const {handler}=fixture();
  const unknown=await handler(new Request(ORIGIN+'/independent74/missing.mjs'),ENV,{});assert.equal(unknown.status,404);
  const inherited=await handler(new Request(ORIGIN+'/independent74/toString'),ENV,{});assert.equal(inherited.status,404);
  const head=await handler(new Request(ORIGIN+'/independent74/app.mjs',{method:'HEAD'}),ENV,{});assert.equal(head.status,200);assert.equal(await head.text(),'');
  const unchanged=await handler(new Request(ORIGIN+'/independent74/app.mjs',{headers:{'if-none-match':'"app-test"'}}),ENV,{});assert.equal(unchanged.status,304);assert.equal(await unchanged.text(),'');
  const page=await handler(new Request(ORIGIN+'/independent74/'),ENV,{});assert.ok(page.headers.get('content-security-policy').includes("connect-src 'self'"));
  const post=await handler(new Request(ORIGIN+'/independent74/app.mjs',{method:'POST'}),ENV,{});assert.equal(post.status,405);
});

test('homepage enhancement preserves account headers and restricts the added image source',async()=>{
  const html='<!doctype html><html><head></head><body><div id="root">Existing account and navigation</div></body></html>';
  const policy="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'none'; form-action 'self'";
  const previous={fetch:async()=>new Response(html,{headers:{'content-type':'text/html','content-security-policy':policy,'set-cookie':'retained-account=test; HttpOnly; Secure','etag':'old-page'}})};
  const handler=createGateway({previous,homeEnhancement:true});
  const response=await handler(new Request(ORIGIN+'/'),ENV,{}),body=await response.text();
  assert.ok(body.includes('Existing account and navigation'));assert.equal(body.split('/independent74/lobby74.mjs').length,2);assert.equal(body.split('/independent74/lobby74.css').length,2);
  assert.equal(response.headers.get('set-cookie'),'retained-account=test; HttpOnly; Secure');assert.equal(response.headers.get('etag'),null);
  assert.equal(response.headers.get('content-security-policy'),policy.replace("img-src 'self' data:","img-src 'self' data: https://cdn.prod.website-files.com"));
  const other=await handler(new Request(ORIGIN+'/games/retained'),ENV,{});assert.equal(await other.text(),html);assert.equal(other.headers.get('content-security-policy'),policy);
});
