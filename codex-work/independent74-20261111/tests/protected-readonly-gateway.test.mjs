import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createGateway} from '../gateway.mjs';
const id='ind74_official_rollx',sessionId='a'.repeat(64),cookie='sw_session='+'b'.repeat(64);
const definition={id,version:'library74-v1:test',currency:'ETB',accepting:false,launchable:false};
const identity={authenticated:true,currency:'ETB',balance:'50000.25',sessionId};
function fixture(value=identity){
 const calls=[];const handler=createGateway({accountTransport:'protected-readonly',accountGames:[definition],previous:{fetch(request){calls.push({path:new URL(request.url).pathname,headers:Object.fromEntries(request.headers)});return Response.json(value,{headers:{'set-cookie':'retained=value; Secure; HttpOnly'}});}},fetchImpl(){throw Error('OTHER_FINANCIAL_BACKEND_MUST_NOT_BE_CONTACTED');}});
 const request=(path='state?game_id='+id,{body,guard=sessionId}={})=>handler(new Request('https://player.invalid/independent74/account-api/'+path,{method:body?'POST':'GET',headers:{cookie,...(body?{origin:'https://player.invalid','content-type':'application/json','x-independent74-session':guard}:{})},...(body?{body:JSON.stringify(body)}:{})}),{},{});
 return {calls,request};
}
test('production readonly transport uses the exact existing account balance and opaque binding, without another financial service',async()=>{
 const f=fixture(),response=await f.request(),state=await response.json();
 assert.equal(response.status,200);assert.equal(state.balance,'50000.25');assert.equal(state.sessionGuard,sessionId);assert.equal(state.currency,'ETB');assert.equal(state.accepting,false);assert.equal(state.game.launchable,false);assert.equal(state.activeRecoveryVerified,false);assert.equal(state.historyAvailable,false);assert.equal(state.existingWalletReadOnly,true);
 assert.equal(response.headers.get('set-cookie'),'retained=value; Secure; HttpOnly');assert.deepEqual(f.calls,[{path:'/api/machine-session',headers:{accept:'application/json',cookie}}]);
});
test('readonly transport never accepts a wager or pretends its new game history is available',async()=>{
 const f=fixture(),body={request_id:randomUUID(),game_id:id,model_version:definition.version,type:'start',stake:'1.00',options:{target:50}};
 const denied=await f.request('action',{body});assert.equal(denied.status,503);assert.equal((await denied.json()).error.code,'GAME_RELEASE_NOT_READY');
 const csrf=await f.request('action',{body,guard:'c'.repeat(64)});assert.equal(csrf.status,403);
 const history=await f.request('history?game_id='+id);assert.equal(history.status,503);const value=await history.json();assert.equal(value.error.code,'GAME_HISTORY_NOT_AVAILABLE');assert.equal(value.history,undefined);
 assert(f.calls.every(c=>c.path==='/api/machine-session'));
});
test('a valid existing session never creates a fake balance or bypasses exact query and identity checks',async()=>{
 for(const changed of [{balance:'-1.00'},{balance:50000.25},{balance:'1e6'},{balance:'50000.251'},{currency:'DEMO'},{sessionId:'wrong'}])assert.equal((await fixture({...identity,...changed}).request()).status,502);
 const f=fixture();for(const query of ['state?game_id=unknown','state?game_id='+id+'&user_id=other','state?game_id='+id+'&game_id='+id])assert.equal((await f.request(query)).status,400);
 const response=await fixture({authenticated:false}).request();assert.equal(response.status,401);assert.equal((await response.json()).balance,undefined);
});
