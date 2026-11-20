import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSwNinePgAdapter} from './sw-nine-pg-adapter.mjs';
import {OFFICIAL_LINE_PATHS} from './official-math.mjs';

const gameId='fresh_multihot20',uid='player-123',house='house-1';
const token='7835a955-4116-4010-b2d1-67ce4f1e584e';
const cookie='b'.repeat(64);
const hash=s=>createHash('sha256').update(s).digest('hex');
const guard=hash('fresh-account-session-v1\0'+uid+'\0'+cookie);
const paths20=OFFICIAL_LINE_PATHS.fresh_multihot20;
const profile={gameId,productionApproved:true,probabilityModelAudited:true,auditReference:'QA_ONLY_NOT_PRODUCTION',mathSha256:'c'.repeat(64),mathVersion:'qa-v1',engineVersion:'qa-r1',linePaths:paths20,reelStrips:Array.from({length:5},()=>['seven','cherry','bell']),wheelWeights:[1,2,3,4,5]};
const request=new Request('https://superwin-player.apdiy61.workers.dev/api/slots/spin',{method:'POST',headers:{cookie:'sw_session='+cookie}});
const data={gameId,bet:'1.00',roundToken:token,sessionGuard:guard,mathSha256:profile.mathSha256,mathVersion:profile.mathVersion,engineVersion:profile.engineVersion};
function env({player=10000n,houseBalance=10000000n,accepting=true,operator=true,brokenPayout=false}={}){
 let db={wallets:{[uid]:player,[house]:houseBalance},rounds:new Map(),legacyRounds:[],moves:[],version:0};
 let serial=Promise.resolve();let activeProfile=profile;
 const transaction=fn=>{
   const work=serial.catch(()=>{}).then(async()=>{
     const local=structuredClone(db);
     const c={
       state:local,
       async query(q,args){
         if(q.startsWith('SELECT request_hash,result_json FROM sw_nine.game_rounds')){
           const record=local.rounds.get(args[0]+'|'+args[1]);
           return {rows:record?[{request_hash:record.request_hash,result_json:record.result_json}]:[],rowCount:record?1:0};
         }
         if(q.startsWith('SELECT 1 FROM sw_nine.actions'))return {rows:[],rowCount:0};
         if(q.startsWith('INSERT INTO sw_nine.game_rounds')){
           const [roundId,userId,g,bet,base,total,wheel,key,fingerprint,json,math,isFree]=args;
           assert.equal(g,gameId);assert.equal(isFree,false);assert.equal(bet,base);
           assert.equal(fingerprint,hash(JSON.stringify({uid:userId,gameId:g,bet:json?JSON.parse(json).bet:'',action:'SPIN'})));
           assert.ok(!local.rounds.has(userId+'|'+key));
           local.rounds.set(userId+'|'+key,{request_hash:fingerprint,result_json:JSON.parse(json),roundId,total,wheel,math});
           return {rowCount:1,rows:[]};
         }
         if(q.startsWith('INSERT INTO sw_rebuild.rounds')){
           local.legacyRounds.push(args);return{rowCount:1,rows:[]};
         }
         throw Error('UNEXPECTED_SQL: '+q.slice(0,90));
       }
     };
     const result=await fn(c);db=local;db.version++;return result;
   });
   serial=work.catch(()=>{});return work;
 };
 const api=createSwNinePgAdapter({
   authenticate:async()=>uid,
   transaction,
   lockWallets:async(c,userId)=>{assert.equal(userId,uid);return []},
   balance:async(c,userId)=>c.state.wallets[userId],
   houseFor:()=>house,
   hash,
   accepting:()=>accepting,
   profileForGame:async()=>activeProfile,
   assertOperatorWagerEnabled:async(id)=>{if(!operator)throw Error('DISABLED_OPERATOR_MODEL');assert.equal(id,gameId)},
   move:async(c,user,round,g,kind,amount,from,to)=>{
     assert.equal(user,uid);assert.equal(g,gameId);assert.ok(['BET','WIN'].includes(kind));
     assert.ok(amount>0n);assert.ok(c.state.wallets[from]>=amount);
     c.state.wallets[from]-=amount;c.state.wallets[to]+=amount;
     c.state.moves.push({user,round,kind,amount,from,to});
     if(brokenPayout&&kind==='WIN')throw Error('SIMULATED_TRANSFER_FAILURE');
   }
 });
 return{api,read:()=>db,disableProfile:()=>{activeProfile=null}};
}

test('uses existing sw_rebuild wallet accounts, transfers and sw_nine round tables without new DB',async()=>{
 const x=env();const r=await x.api(request,data);assert.equal(r.gameId,gameId);
 assert.equal(r.walletReceipt.currency,'ETB');
 assert.equal(x.read().rounds.size,1);
 assert.equal(x.read().legacyRounds.length,1);
 assert.equal(x.read().moves.filter(m=>m.kind==='BET').length,1);
 assert.equal(x.read().wallets[uid],10000n-100n+BigInt(r.finalWin.replace('.','')));
 assert.equal(x.read().wallets[house],10000000n+100n-BigInt(r.finalWin.replace('.','')));
 assert.equal(r.roundId,x.read().legacyRounds[0][0].replace(/^nine:/,''));
});
test('two simultaneous requests with same token produce one existing-ledger debit',async()=>{
 const x=env();const [a,b]=await Promise.all([x.api(request,data),x.api(request,data)]);
 assert.deepEqual(a,b);assert.equal(x.read().rounds.size,1);
 assert.equal(x.read().moves.filter(m=>m.kind==='BET').length,1);
});
test('replayOnly works even if original server math profile was disabled after first settlement',async()=>{
 const x=env();const a=await x.api(request,data);x.disableProfile();
 const b=await x.api(request,{...data,replayOnly:true});
 assert.deepEqual(a,b);assert.equal(x.read().moves.filter(m=>m.kind==='BET').length,1);
});
test('sessionGuard prevents cross-account spin, and wrong player identity never reaches ledger',async()=>{
 const x=env();await assert.rejects(()=>x.api(request,{...data,sessionGuard:'0'.repeat(64)}),/PLAYER_SESSION_CHANGED/);
 await assert.rejects(()=>x.api(request,{...data,identity:'someone-else'}),/PLAYER_SESSION_CHANGED/);
 assert.equal(x.read().moves.length,0);
});
test('new wagers reject client mathVersion tampering but replay uses stored receipt',async()=>{
 const x=env();await assert.rejects(()=>x.api(request,{...data,mathSha256:'0'.repeat(64)}),/PLAYER_MATH_VERSION_STALE/);
 const a=await x.api(request,data);
 const b=await x.api(request,{...data,replayOnly:true,mathSha256:'0'.repeat(64)});
 assert.deepEqual(a,b);assert.equal(x.read().moves.filter(m=>m.kind==='BET').length,1);
});
test('reused round token with different bet fails the current sw_nine fingerprint',async()=>{
 const x=env();await x.api(request,data);
 await assert.rejects(()=>x.api(request,{...data,bet:'2.00'}),/IDEMPOTENCY_PARAMETER_CONFLICT/);
 assert.equal(x.read().moves.filter(m=>m.kind==='BET').length,1);
});
test('insufficient existing Player ETB balance rejects before any wallet transfer',async()=>{
 const x=env({player:10n});
 await assert.rejects(()=>x.api(request,data),e=>e.code==='INSUFFICIENT_FUNDS'&&e.status===402);
 assert.equal(x.read().moves.length,0);
});
test('existing house reserve and active operator release both gate new wagers',async()=>{
 const x=env({houseBalance:100n});await assert.rejects(()=>x.api(request,data),/HOUSE_RESERVE_INSUFFICIENT/);
 assert.equal(x.read().moves.length,0);
 const disabled=env({operator:false});await assert.rejects(()=>disabled.api(request,data),/DISABLED_OPERATOR_MODEL/);assert.equal(disabled.read().moves.length,0);
 const globalOff=env({accepting:false});await assert.rejects(()=>globalOff.api(request,data),/SLOT_RELEASE_NOT_ENABLED/);assert.equal(globalOff.read().moves.length,0);
});
test('failed existing house-to-Player transfer rolls back bet, win and round atomically',async()=>{
 const x=env({brokenPayout:true});
 await assert.rejects(()=>x.api(request,data),/SIMULATED_TRANSFER_FAILURE/);
 assert.equal(x.read().wallets[uid],10000n);assert.equal(x.read().wallets[house],10000000n);
 assert.equal(x.read().moves.length,0);assert.equal(x.read().rounds.size,0);
});
