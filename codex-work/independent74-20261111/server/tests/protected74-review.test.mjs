import test from 'node:test';import assert from 'node:assert/strict';
import{createHash}from'node:crypto';
import * as review from '../protected74-review.mjs';
import {createRetainedLibrary74Fixture}from'./support/retained-library-fixture.mjs';
import{createRegistry}from'./support/retained-library/library-service.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const token='a'.repeat(64),sessionId='b'.repeat(64),origin='https://superwin-player.apdiy61.workers.dev';
const base=origin+review.PROTECTED74_PREFIX;
const fixtureOnlyPolicy=Object.fromEntries(review.protected64Math.listGameDefinitions().map(g=>[g.id,{maxBetMinor:'5000000',maxWinMinor:'999999999999999'}]));
const post=(body={})=>new Request(base+'action',{method:'POST',headers:{cookie:'sw_session='+token,origin,'content-type':'application/json','X-Zplay-Machine-Session':sessionId},body:JSON.stringify(body)});

test('the exact protected ten catalogue identities remain excluded; all64 genuinely missing models are present',()=>{
 const c=review.protected74ReviewCatalog();assert.equal(c.games.length,64);assert.equal(c.total_catalogue_identities,74);assert.equal(Object.keys(c.existing_models).length,10);
 for(const g of c.games){assert(!Object.hasOwn(c.existing_models,g.id));assert.equal(g.accepting,false);assert.equal(g.launchable,false);assert.equal(g.maxStake,null);}
 assert.deepEqual(c.games.reduce((n,g)=>(n[g.family]=(n[g.family]??0)+1,n),{}),{crash:13,ladder:10,plinko:3,slots:32,wheel:5,dice:1});
 for(const id of Object.keys(c.existing_models))assert.equal(review.protected64Math.getGameDefinition(id),null);
});
test('money boundary preserves exact cents and protected4decimal flooring beyond40000ETB withoutNumber conversion',()=>{
 for(const n of ['0','1','100','4000100','900719925474099312345'])assert.equal(review.protectedCoreUnitsToMinor(review.protectedMinorToCoreUnits(n)),n);
 assert.equal(review.protectedDecimalToMinor('40000.0199'),'4000001');assert.equal(review.protectedCoreUnitsToMinor('400010099'),'4000100');
 for(const v of [0,1,'01','-1','1e2','NaN','1.00'])assert.throws(()=>review.protectedMinorToCoreUnits(v));
 for(const v of [1,'01.00','1.12345','-1.00','1e2'])assert.throws(()=>review.protectedDecimalToMinor(v));
});
test('append-only export candidate preserves every original byte and does not installroutes,startanother server,or enablefinance',async()=>{
 // Synthetic source is syntax-tested only; this does not execute the live
 // runtime or assert a synthetic handler is a real paid wager.
 const original='const service={identity:"existing"};export const retained=true;\n';const result=review.prepareProtectedRuntimeExportOnly(original,{expectedSha256:hash(original)});
 assert.equal(result.source.slice(0,original.length),original);assert.equal(result.manifest.changedExistingCodeBytes,0);assert.equal(result.manifest.newRoutesInstalled,0);assert.equal(result.manifest.newRoundGatesEnabled,0);
 const module=await import('data:text/javascript;base64,'+Buffer.from(result.source).toString('base64'));assert.equal(module.independent74RetainedProtectedService.identity,'existing');
 assert.throws(()=>review.prepareProtectedRuntimeExportOnly(original),/EXACT_PROTECTED_RUNTIME_SHA256_REQUIRED/);
});
test('harddisabled namespace cannot enable financial actions through evidence,body,headers or injectedservice; legacy requests pass verbatim',async()=>{
 const forbidden=new Proxy({}, {get(){throw Error('FINANCIAL_SERVICE_MUST_NOT_BE_ACCESSED');}});
 const flags=Object.fromEntries(['sameProtectedDatabaseVerified','actualSchemaConstraintsVerified','retainedFinancialClassHashesVerified','protectedSessionResolverVerified','protectedMachineSessionGuardVerified','accountCapsAndHouseReserveVerified','reciprocalLegacyAdmissionGuardVerified','canonicalUserHouseRowLockOrderVerified','all74ReferenceEvidenceComplete','verifiedPerGamePolicy'].map(k=>[k,true]));
 const seen=[],previous={fetch(request,...args){seen.push({request,args,self:this});return new Response('existing-protected-handler');}};
 const namespace=review.createProtected74ReviewNamespace({previous,facade:forbidden,evidence:flags,resolveAuthenticatedPlayer:()=>{throw Error('NO_AUTH_OR_ACCOUNT_CALL_FOR_BLOCKED_ACTION');}});
 for(const body of [{},{type:'start',userId:'attacker',allowNewRounds:true},{stake:'50000.00',enabled:true}]){const r=await namespace.fetch(post(body));assert.equal(r.status,503);assert.equal((await r.json()).error.code,'PROTECTED74_REVIEW_ONLY_NEW_ROUNDS_DISABLED');}
 for(const path of ['/api/slots/spin','/api/slots/gamble','/api/slots/games/multi_hot_5_video','/api/slots/games/hot_foxy_20']){const request=new Request(origin+path);const r=await namespace.fetch(request,'context');assert.equal(await r.text(),'existing-protected-handler');assert.equal(seen.at(-1).request,request);assert.equal(seen.at(-1).self,previous);assert.deepEqual(seen.at(-1).args,['context']);}
 assert.equal(review.protected74ReviewReadiness(flags).readyForSeparateReleaseReview,true);assert.equal(review.protected74ReviewReadiness(flags).newRoundsEnabled,false);
});
test('guard follows existing cookie+machine-session contract and cannot use a client-selecteduser identity',()=>{
 assert(review.validateProtected74MachineSessionHeaders(post(),{playerOrigin:origin,sessionId}));
 for(const request of [new Request(base+'action',{method:'POST',headers:{origin,'content-type':'application/json'}}),new Request(base+'action',{method:'POST',headers:{cookie:'sw_session='+token,origin:'https://attacker.test','content-type':'application/json','x-zplay-machine-session':sessionId}}),new Request(base+'action',{method:'POST',headers:{cookie:'sw_session='+token,origin,'content-type':'application/json','x-zplay-machine-session':'c'.repeat(64)}})])assert.throws(()=>review.validateProtected74MachineSessionHeaders(request,{playerOrigin:origin,sessionId}));
 assert.throws(()=>review.validateProtected74MachineSessionHeaders(post(),{playerOrigin:origin}),/VERIFIED_MACHINE_SESSION_REQUIRED/);
});
test('unverifiedactualdatabase/class/session evidence prevents attachment and fakeETB account snapshots',async()=>{
 assert.throws(()=>review.attachProtected74ReviewModels({}),/EXISTING_RETAINED_LIBRARY_INSTANCE_REQUIRED/);
 assert.throws(()=>review.attachProtected74ReviewModels({retainedLibrary:{}}),/ACTUAL_PROTECTED_DATABASE_AND_RETAINED_CLASS_PROOF_REQUIRED/);
 const namespace=review.createProtected74ReviewNamespace({previous:{fetch:()=>new Response('legacy')}}),id=review.protected64Math.listGameDefinitions()[0].id;
 const r=await namespace.fetch(new Request(base+'state?game_id='+id,{headers:{cookie:'sw_session='+token}}));assert.equal(r.status,503);const result=await r.json();assert.equal(result.balance,undefined);assert.equal(result.currency,undefined);
});

test('all64 models settle,replay andrecover with exact retained financial class bytes in isolatedPostgreSQL only',{timeout:180000},async()=>{
 // The existing fixture hash-verifies actual retained LibraryService and
 // SharedWallet class source. No external DB,QAservice or playeraccount exists.
 let time=1794355200000;
 const fixture=await createRetainedLibrary74Fixture({isolated:true,math:review.protected64Math,now:()=>time});
 try{
 const {facade,sql}=fixture;const cashMinor=x=>BigInt(x.replace('.',''));const wallet=async id=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[id]))[0].balance);
 for(const g of review.protected64Math.listGameDefinitions()){
  const user=await fixture.addPlayer();const before=await wallet(user),total=BigInt((await sql.unsafe('SELECT sum(balance)::text AS value FROM sw_rebuild.wallets'))[0].value);
  const request={request_id:crypto.randomUUID(),type:'start',game_id:g.id,model_version:facade.adapter.definitions[g.id].version,stake:'1.00',options:{}};
  let r=await facade.action(user,request);const first=structuredClone(r);
  const replay=await facade.action(user,request);assert.equal(replay.replayed,true);assert.equal(replay.round.round_id,r.round.round_id);
  const reloaded=await facade.state(user,g.id);assert.equal(reloaded.round.round_id,r.round.round_id);
  if(r.round.status==='active'){time+=1000;r=await facade.action(user,{request_id:crypto.randomUUID(),type:'action',game_id:g.id,model_version:r.round.model_version,round_id:r.round.round_id,expected_version:r.round.version,action:'collect',input:{}});}
  assert.equal(r.round.status,'settled',g.id);assert.equal(await wallet(user),before-100n+BigInt(r.round.payoutMinor),g.id);
  assert.equal(BigInt((await sql.unsafe('SELECT sum(balance)::text AS value FROM sw_rebuild.wallets'))[0].value),total);
  assert.equal((await sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'",[user])).length,1);
  assert.equal((await sql.unsafe("SELECT count(*)::int AS n FROM sw_native_library.rounds WHERE user_id=$1 AND status='active'",[user]))[0].n,0);
  assert.equal(cashMinor(first.balance),before-100n+(first.round.status==='settled'?BigInt(first.round.payoutMinor):0n));
 }
 }finally{await fixture.close();}
});

test('reviewattachment staysclosed even using an initialized exact-classfixture; typed HTTP accountidentity is server-resolved',{timeout:60000},async()=>{
 const fixture=await createRetainedLibrary74Fixture({isolated:true,reviewedGameIds:[],allowNewRounds:false});
 try{
 fixture.service.registry=createRegistry([]);
 const evidence={sameProtectedDatabaseVerified:true,actualSchemaConstraintsVerified:true,retainedFinancialClassHashesVerified:true,protectedSessionResolverVerified:true,protectedMachineSessionGuardVerified:true};
 const {facade,readiness}=review.attachProtected74ReviewModels({retainedLibrary:fixture.service,evidence});assert.equal(facade.service,fixture.service);assert.equal(facade.definitions().length,64);assert(facade.definitions().every(g=>!g.accepting));assert.equal(readiness.newRoundsEnabled,false);
 let calls=0;const ns=review.createProtected74ReviewNamespace({previous:{fetch:()=>new Response('legacy')},facade,evidence,resolveAuthenticatedPlayer:request=>{calls++;assert.equal(request.headers.get('cookie'),'sw_session='+token);return {userId:fixture.fixtureUserId,machineSessionId:sessionId};}});
 const id=facade.definitions()[0].id;const r=await ns.fetch(new Request(base+'state?game_id='+id,{headers:{cookie:'sw_session='+token}}));assert.equal(r.status,200);const state=await r.json();assert.equal(state.currency,'ETB');assert.equal(state.accepting,false);assert.equal(state.user_id,undefined);assert.equal(calls,1);
 const bad=await ns.fetch(new Request(base+'state?game_id='+id+'&user_id=attacker',{headers:{cookie:'sw_session='+token}}));assert.equal(bad.status,404);assert.equal(calls,1);
 const blocked=await ns.fetch(post({game_id:id,type:'start',stake:'1.00'}));assert.equal(blocked.status,503);assert.equal(calls,1);
 }finally{await fixture.close();}
});
