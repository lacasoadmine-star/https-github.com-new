import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoGateway} from '../demo-gateway.mjs';

const origin='https://player.example',id='ind74_official_rollx';
function fixture(authenticated=false){
 const calls=[],identities=[];
 const gateway=createDemoGateway({previous:{fetch:async request=>{identities.push(new URL(request.url).pathname);return Response.json({authenticated});}}});
 const env={LOCAL_DEMO_WALLETS:{idFromName:name=>name,get:name=>({fetch:async request=>{calls.push({name,request});return Response.json({mode:'demo',currency:'DEMO',realMoney:false,sessionGuard:request.headers.get('x-demo-session-guard')});}})}};
 return {gateway,env,calls,identities};
}
test('anonymous demo creates a secure independent session and never calls an account route',async()=>{
 const h=fixture(),r=await h.gateway(new Request(origin+'/independent74/demo-api/state?game_id='+id),h.env,{}),body=await r.json();
 assert.equal(r.status,200);assert.equal(body.currency,'DEMO');assert.match(r.headers.get('set-cookie'),/^__Host-ind74_demo=[a-f0-9]{64}; Path=\/; Secure; HttpOnly; SameSite=Strict/);
 assert.deepEqual(h.identities,[]);assert.match(h.calls[0].name,/^independent74-demo:[a-f0-9]{64}$/);assert.equal(h.calls[0].request.headers.get('cookie'),null);
});
test('a verified existing account gets a separate demo object, never its financial wallet',async()=>{
 const h=fixture(true),cookie='sw_session=test-existing-account-session',request=new Request(origin+'/independent74/demo-api/state?game_id='+id,{headers:{cookie}});
 const first=await h.gateway(request,h.env,{}),a=await first.json();const second=await h.gateway(request,h.env,{}),b=await second.json();
 assert.equal(first.headers.get('x-demo-account-linked'),'true');assert.deepEqual(h.identities,['/api/machine-session','/api/machine-session']);assert.equal(a.sessionGuard,b.sessionGuard);assert.equal(h.calls[0].name,h.calls[1].name);
 assert.equal(h.calls[0].request.headers.get('cookie'),null);assert.equal(h.calls[0].name.includes('test-existing'),false);
});
test('demo POST requires its own session guard and origin; only the demo stub sees accepted bytes',async()=>{
 const h=fixture(),cookie='__Host-ind74_demo='+'a'.repeat(64),url=origin+'/independent74/demo-api/action';
 const state=await (await h.gateway(new Request(origin+'/independent74/demo-api/state?game_id='+id,{headers:{cookie}}),h.env,{})).json();
 const post=(originHeader,guard,body='{}')=>new Request(url,{method:'POST',headers:{cookie,origin:originHeader,'content-type':'application/json','x-demo-session-guard':guard},body});
 assert.equal((await h.gateway(post('https://other.example',state.sessionGuard),h.env,{})).status,403);
 assert.equal((await h.gateway(post(origin,'0'.repeat(64)),h.env,{})).status,403);
 assert.equal(h.calls.length,1);
 const result=await h.gateway(post(origin,state.sessionGuard,'{"test":"demo-only"}'),h.env,{});assert.equal(result.status,200);assert.equal(await h.calls[1].request.text(),'{"test":"demo-only"}');assert.deepEqual(h.identities,[]);
 assert.equal((await h.gateway(post(origin,state.sessionGuard,'x'.repeat(8193)),h.env,{})).status,413);
});
test('malformed sessions, query injection and unavailable demo storage fail closed',async()=>{
 const h=fixture();
 for(const suffix of ['state?game_id='+id+'&game_id='+id,'history?game_id='+id+'&user_id=other','catalog?game_id='+id])assert.equal((await h.gateway(new Request(origin+'/independent74/demo-api/'+suffix),h.env,{})).status,400);
 assert.equal((await h.gateway(new Request(origin+'/independent74/demo-api/state?game_id='+id,{headers:{cookie:'__Host-ind74_demo=x'}}),h.env,{})).status,400);
 assert.equal((await h.gateway(new Request(origin+'/independent74/demo-api/state?game_id='+id),{},{})).status,503);assert.equal(h.calls.length,0);
});
