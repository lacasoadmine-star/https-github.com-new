import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_WILDS_GAME_ID} from '../expansion.mjs';
import {BURN_HTTP_BASE,BURN_UPSTREAM_BASE,createBurnWildsExistingHttpBinding} from './http.mjs';

const origin='https://isolated-burn.invalid';
const action={gameId:BURN_WILDS_GAME_ID,roundToken:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 sessionGuard:'a'.repeat(64),bet:'0.10',engineVersion:'fixture',mathVersion:'fixture',
 mathSha256:'f'.repeat(64)};
function fixture(){
 const calls=[],delegated=[];
 const lifecycle={
  state:async request=>{calls.push({kind:'state',request});return {authenticated:true,gameId:BURN_WILDS_GAME_ID};},
  spin:async(request,input)=>{calls.push({kind:'spin',request,input});return {gameId:BURN_WILDS_GAME_ID,settled:true};}
 };
 const binding=createBurnWildsExistingHttpBinding({
  lifecycle,assertWriteOrigin:request=>request.headers.get('origin')===origin,
  existingFetch:async request=>{delegated.push(request);return new Response('legacy-unmodified',{status:203});}
 });
 return {calls,delegated,binding};
}
test('both existing proxy and upstream paths reach the same server state and spin',async()=>{
 const h=fixture();
 for(const base of [BURN_HTTP_BASE,BURN_UPSTREAM_BASE]){
  const req=new Request(origin+base+'/state');
  const state=await h.binding(req);assert.equal(state.status,200);
  assert.equal((await state.json()).authenticated,true);
  const spinReq=new Request(origin+base+'/spin',{method:'POST',headers:{origin,
    'content-type':'application/json'},body:JSON.stringify(action)});
  const spin=await h.binding(spinReq);
  assert.equal(spin.status,200);assert.equal((await spin.json()).settled,true);
 }
 assert.equal(h.calls.length,4);
 assert.ok(h.calls.every(x=>x.request instanceof Request));
 assert.equal(h.calls.filter(x=>x.kind==='spin').length,2);
 assert.equal(h.delegated.length,0);
});
test('all other legacy requests, including existing spin POST, keep original untouched',async()=>{
 const h=fixture(),body='old original wager payload';
 const req=new Request(origin+'/api/slots/spin',{method:'POST',body});
 const result=await h.binding(req);
 assert.equal(result.status,203);assert.equal(await result.text(),'legacy-unmodified');
 assert.equal(h.delegated[0],req);
 assert.equal(await req.text(),body);
 assert.equal(h.calls.length,0);
});
test('same-origin, HTTP method, JSON body and size checks reject before calling financial lifecycle',async()=>{
 const h=fixture(),base=origin+BURN_HTTP_BASE;
 const cases=[
  [new Request(base+'/spin',{method:'GET'}),405],
  [new Request(base+'/state',{method:'POST'}),405],
  [new Request(base+'/spin',{method:'POST',headers:{origin:'https://other.invalid',
      'content-type':'application/json'},body:JSON.stringify(action)}),403],
  [new Request(base+'/spin',{method:'POST',headers:{origin,
      'content-type':'text/plain'},body:JSON.stringify(action)}),415],
  [new Request(base+'/spin',{method:'POST',headers:{origin,
      'content-type':'application/json'},body:'{'}),400],
  [new Request(base+'/spin',{method:'POST',headers:{origin,
      'content-type':'application/json'},body:JSON.stringify({...action,payload:'x'.repeat(9000)})}),413],
  [new Request(base+'/state?spoof=1'),400]
 ];
 for(const [req,status] of cases){
   const response=await h.binding(req);
   assert.equal(response.status,status);
   assert.equal(response.headers.get('cache-control'),'no-store');
 }
 assert.equal(h.calls.length,0);
});
test('missing host configuration refuses attachment rather than inventing wallet or login',()=>{
 assert.throws(()=>createBurnWildsExistingHttpBinding({existingFetch:async()=>null}),
   /EXISTING_HOST_REQUIRED/);
});
