import test from 'node:test';
import assert from 'node:assert/strict';
import {installExpansionHistory} from '../expansion-history.mjs';

function fixture({subject='@session:verified',ready=true,model=true}={}){
 const calls=[],rows=[{id:'own-settled-round',created_at:'1000',settled_at:'1200',user_id:'player-a',secret_seed:'must-never-leak-raw'}];
 const service={ready,now:()=>2000,shared:{transaction:async(user,callback)=>{calls.push({user});return callback({unsafe:async(sql,args)=>{calls.push({sql,args});return rows;}});}},registry:{get(id){if(!model||id!=='multihot40_native')throw Object.assign(Error('GAME_MODEL_UNAVAILABLE'),{status:409});}},view(row){return {round_id:row.id,game_id:'multihot40_native',status:'settled',payoutMinor:'200'};}};
 const previous={scheduled:()=>17,fetch:async()=>new Response('legacy')};
 const app=installExpansionHistory(previous,{service,verifyNative:()=>subject,readNativeBody:async()=>'',engineSecret:'isolated-test',resolveSessionUser:async(shared,subject)=>{assert.equal(subject,'@session:verified');return 'player-a';}});
 return {app,calls,service,previous};
}
const request=(path='/v2/library/history?game_id=multihot40_native',init={})=>new Request('https://engine.invalid'+path,init);

test('history authenticates and binds the player and game before reading only settled rows',async()=>{
 const f=fixture(),response=await f.app.fetch(request());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const data=await response.json();
 assert.equal(data.currency,'ETB');assert.equal(data.rows.length,1);assert.equal(data.rows[0].createdAt,1000);assert.equal(data.rows[0].round.round_id,'own-settled-round');
 assert.equal(JSON.stringify(data).includes('must-never-leak-raw'),false);assert.deepEqual(f.calls[0],{user:'player-a'});assert.deepEqual(f.calls[1].args,['player-a','multihot40_native']);assert.match(f.calls[1].sql,/WHERE user_id=\$1 AND game_id=\$2 AND status='settled'/);assert.match(f.calls[1].sql,/LIMIT 50$/);
});
test('history forbids unauthenticated and system subjects without a database read',async()=>{
 for(const subject of [null,'','@system']){const f=fixture({subject});assert.equal((await f.app.fetch(request())).status,401);assert.equal(f.calls.length,0);}
});
test('unsupported sort, unknown game and SQL-shaped values never reach a database',async()=>{
 for(const suffix of ['?game_id=multihot40_native&sort=DROP%20TABLE','?game_id=anything','?game_id=a%27%20OR%201%3D1','?sort=recent']){const f=fixture();assert.ok([409,422].includes((await f.app.fetch(request('/v2/library/history'+suffix))).status));assert.equal(f.calls.length,0);}
});
test('biggest wins uses a fixed numeric ordering and never arbitrary query syntax',async()=>{
 const f=fixture(),response=await f.app.fetch(request('/v2/library/history?game_id=multihot40_native&sort=wins'));assert.equal(response.status,200);assert.match(f.calls[1].sql,/ORDER BY \(state->>'payoutMinor'\)::bigint DESC,created_at DESC,id DESC LIMIT 50$/);
});
test('history is read-only, unavailable safely and leaves older routes and scheduled handlers intact',async()=>{
 const f=fixture();assert.equal((await f.app.fetch(request(undefined,{method:'POST'}))).status,405);assert.equal(f.calls.length,0);assert.equal(await(await f.app.fetch(request('/v2/library/state?game_id=balloon_native'))).text(),'legacy');assert.equal(f.app.scheduled,f.previous.scheduled);
 const unavailable=fixture({ready:false});assert.equal((await unavailable.app.fetch(request())).status,503);assert.equal(unavailable.calls.length,0);
});
