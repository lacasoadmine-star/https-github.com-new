import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {installBalloon,addCatalog,sign,BALLOON_PREFIX} from '../worker.mjs';

const origin='https://superwin-player.apdiy61.workers.dev';
const engine='https://engine.example.test';
const secret='key-'.repeat(16);
const token='a'.repeat(64),cookie='sw_session='+token;
const session=createHash('sha256').update('zplay-balloon-session:'+token).digest('hex');
const start={request_id:'cedef982-b793-4917-92c0-784ca4382fbf',type:'start',game_id:'balloon_native',model_version:'superwin-balloon-1',stake:'0.10',options:{}};
function fixture(authenticated=true){
 const previous={fetch:async request=>{
  const path=new URL(request.url).pathname;
  if(path==='/api/machine-session')return Response.json({authenticated});
  if(path==='/api/config')return Response.json({games:[{id:'jetx_native'}]});
  return new Response('legacy');
 }};
 const env={PORTAL:'player',NATIVE_ENGINE_ORIGIN:engine,NATIVE_ENGINE_SECRET:secret};
 return {worker:installBalloon(previous),env};
}
function run(f,path,init={}){return f.worker.fetch(new Request(origin+path,init),f.env,{waitUntil(){}});}
const signedHeaders=(extra={})=>({cookie,...extra});

test('denies unauthenticated library state and wagers',async()=>{
 const f=fixture(),body=JSON.stringify(start);
 let response=await run(f,'/api/library/state?game_id=balloon_native');
 assert.equal(response.status,401);
 response=await run(f,'/api/library/action',{method:'POST',headers:{origin,'content-type':'application/json'},body});
 assert.equal(response.status,401);
 response=await run(f,'/api/library/state?game_id=balloon_native',{headers:signedHeaders()});
 assert.equal(response.status,503); 
});

test('canonical player identity is required even with a session cookie',async()=>{
 const f=fixture(false);
 const r=await run(f,'/api/library/state?game_id=balloon_native',{headers:signedHeaders()});
 assert.equal(r.status,401);
});

test('serves Canvas code as same-origin resources; no iframe screenshot',async()=>{
 const f=fixture();
 const r=await run(f,'/games/balloon_native');assert.equal(r.status,200);
 const html=await r.text();
 assert.match(html,/<canvas id="scene"/);assert.ok(!html.includes('<iframe'));
 assert.ok(html.includes(BALLOON_PREFIX+'balloon.js'));
 const css=await run(f,BALLOON_PREFIX+'balloon.css');assert.equal(css.status,200);
 assert.match(css.headers.get('content-type'),/text\/css/);
 const js=await run(f,BALLOON_PREFIX+'balloon.js');assert.equal(js.status,200);
 assert.match(await js.text(),/function balloon/);
});

test('GET engine request is signed to the authenticated user',async t=>{
 const f=fixture(),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);
 let target,options;
 globalThis.fetch=async (url,opts)=>{target=url.toString();options=opts;return Response.json({balance:'10.00',currency:'ETB',game:{id:'balloon_native',version:'superwin-balloon-1'},round:null});};
 const r=await run(f,'/api/library/state?game_id=balloon_native',{headers:signedHeaders()});
 assert.equal(r.status,200);
 const value=await r.json();assert.equal(value.balance,'10.00');assert.equal(value.sessionId,session);
 assert.equal(target,engine+'/v2/library/state?game_id=balloon_native');
 const h=options.headers;
 assert.equal(h['x-native-user'],'@session:'+createHash('sha256').update(token).digest('hex'));
 const content=['GET','/v2/library/state?game_id=balloon_native',h['x-native-time'],h['x-native-user'],createHash('sha256').update('').digest('hex')].join('\n');
 assert.equal(h['x-native-signature'],createHmac('sha256',secret).update(content).digest('hex'));
});

test('POST cannot cross origin or forge session',async()=>{
 const f=fixture(),body=JSON.stringify(start);
 for(const [extra,expected] of [
  [{origin:'https://malicious.test','content-type':'application/json'},403],
  [{origin,'content-type':'application/json','X-Zplay-Balloon-Session':'wrong'},403]
 ]){
  const r=await run(f,'/api/library/action',{method:'POST',headers:signedHeaders(extra),body});
  assert.equal(r.status,expected);
 }
});

test('one signed stake forwarded once; backend alone returns the wallet',async t=>{
 const f=fixture(),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);
 let requests=0,options;
 globalThis.fetch=async (url,opts)=>{requests++;options=opts;return Response.json({balance:'9.90',currency:'ETB',round:{status:'active',version:0}});};
 const r=await run(f,'/api/library/action',{method:'POST',headers:signedHeaders({origin,'content-type':'application/json','X-Zplay-Balloon-Session':session}),body:JSON.stringify(start)});
 assert.equal(r.status,200);assert.equal(requests,1);
 assert.deepEqual(JSON.parse(options.body),start);assert.equal((await r.json()).balance,'9.90');
});

test('engine failure does not invent money or demo success',async t=>{
 const f=fixture(),old=globalThis.fetch;t.after(()=>globalThis.fetch=old);
 globalThis.fetch=async()=>{throw Error('offline');};
 const r=await run(f,'/api/library/state?game_id=balloon_native',{headers:signedHeaders()});
 assert.equal(r.status,503);assert.equal((await r.json()).error,'RETRY_SAME_REQUEST');
});

test('original catalog remains and Balloon appears at most once',()=>{
 const current={games:[{id:'jetx_native'},{id:'multihot5'}]};
 const updated=addCatalog(current);
 assert.deepEqual(updated.games.map(x=>x.id),['jetx_native','multihot5','balloon_native']);
 assert.equal(addCatalog(updated),updated);
});

test('agent and admin portals do not inherit Balloon',async()=>{
 const f=fixture();f.env.PORTAL='agent';
 const r=await run(f,'/games/balloon_native');assert.equal(await r.text(),'legacy');
});

test('HMAC never accepts a weak or absent secret',async()=>{
 await assert.rejects(()=>sign('short','u','GET','/v2/library/state'),/SECRET_MISSING/);
});
