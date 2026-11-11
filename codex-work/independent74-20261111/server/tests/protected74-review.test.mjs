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
 const flags=Object.fromEntries(['sameProtectedDatabaseVerified','actualSchemaConstraintsVerified','retainedFinancialClassHashesVerified','protectedSessionResolverVerified','protectedMachineSessionGuardVerified','accountCapsAndHouseReserveVerified','reciprocalLegacyAdmissionGuardVerified','canonicalUserHouseRowLockOrderVerified','all74ReferenceEvidenceComplete','persistentPerPlayerGameStakeCarryVerified','verifiedPerGamePolicy'].map(k=>[k,true]));
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

test('in-factory candidate uses byte-exact protected auth/transaction/balance helpers for read-only accounts; no financial helper or oldroute changes',{timeout:60000},async()=>{
 const {readFile}=await import('node:fs/promises');
 const fragments=JSON.parse(await readFile(new URL('./support/protected-runtime-readonly-fragments.json',import.meta.url)));
 assert.equal(fragments.actualRuntimeSha256,review.ACTUAL_PROTECTED_RUNTIME_SHA256);
 for(const p of Object.values(fragments.fragments)){assert.equal(hash(p.source),p.sha256);assert.equal(Buffer.byteLength(p.source),p.bytes);}
 const fixture=await createRetainedLibrary74Fixture({isolated:true});
 try{
  await fixture.sql.unsafe('CREATE TABLE sw_rebuild.sessions(token text PRIMARY KEY,user_id text,expires bigint)');
  await fixture.sql.unsafe('ALTER TABLE sw_rebuild.rounds ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()');
  await fixture.sql.unsafe('INSERT INTO sw_rebuild.sessions(token,user_id,expires) VALUES($1,$2,$3)',[hash(token),fixture.fixtureUserId,Date.now()+3600000]);
  const queries=[];const query=async(text,args=[])=>{queries.push(text);const result=await fixture.db.query(text,args);return{rows:result.rows,rowCount:result.rows.length};};
  const pool={query,connect:async()=>({query,release(){}})};
  const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
  // Execute ONLY the hash-verified helper definitions against isolated PGlite;
  // no deployment bootstrap, networkdriver, moneyfunction or financialfactory.
  const helpers=new Function('pool','fail','hash',Object.values(fragments.fragments).map(p=>p.source).join('\n')+'\nreturn{transaction,authenticate,balance,cash};')(pool,fail,hash);
  let legacyCalls=0,forbiddenCalls=0;
  const namespace=review.createProtected74ClosureReviewNamespace({previous:{fetch:()=>{legacyCalls++;return new Response('legacy-unchanged');}},capabilities:{...helpers,move:()=>{forbiddenCalls++;throw Error('NO_TRANSFER_ALLOWED');},lockWallets:()=>{forbiddenCalls++;throw Error('NO_MUTATING_LOCK_ALLOWED');}}});
  const id=review.protected64Math.listGameDefinitions()[0].id;
  const request=route=>new Request(base+route+'?game_id='+id,{headers:{cookie:'sw_session='+token}});
  const before=await fixture.sql.unsafe('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id');
  const result=await namespace.fetch(request('state'));assert.equal(result.status,200);const state=await result.json();assert.equal(state.balance,'100000000.00');assert.equal(state.currency,'ETB');assert.equal(state.accepting,false);assert.equal(state.walletSource,'existing-protected-account');assert.equal(state.user_id,undefined);assert.equal(state.sessionGuard,undefined,'Do not invent a machine-session value the protected issuer has not verified.');
  const history=await namespace.fetch(request('history'));assert.equal(history.status,200);assert.deepEqual((await history.json()).history,[]);
  const unauthorized=await namespace.fetch(new Request(base+'state?game_id='+id));assert.equal(unauthorized.status,401);
  const polluted=await namespace.fetch(new Request(base+'state?game_id='+id+'&user_id=attacker',{headers:{cookie:'sw_session='+token}}));assert.equal(polluted.status,404);
  const closed=await namespace.fetch(post({user_id:'attacker',enabled:true,stake:'50000.00'}));assert.equal(closed.status,503);
  assert.equal(forbiddenCalls,0);assert.equal(legacyCalls,0);assert(queries.some(q=>q==='SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY'));
  assert(queries.every(q=>/^(?:BEGIN|COMMIT|ROLLBACK|SET|SELECT)\b/i.test(q.trim())),'Namespace may perform no mutating SQL.');
  const old=await namespace.fetch(new Request(origin+'/api/slots/games/multi_hot_5_video'));assert.equal(await old.text(),'legacy-unchanged');assert.equal(legacyCalls,1);
  assert.deepEqual(await fixture.sql.unsafe('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id'),before);
 }finally{await fixture.close();}
});

test('64newmodel fixture reserves and pays a large heldwin once; accountandhouse failures rollback using existing classes',{timeout:120000},async()=>{
 const {seededRandom}=await import('./support/retained-library/library-service.mjs');
 let time=1794355200000;const fixture=await createRetainedLibrary74Fixture({isolated:true,math:review.protected64Math,now:()=>time});
 try{
 const {service,facade,sql}=fixture;const game=review.protected64Math.listGameDefinitions().find(g=>g.family==='slots'&&g.gamble?.enabled&&!g.chargingFeature&&!g.releaseReview?.realMoneyAdmissionBlocked);
 assert(game);const roundId='370f0300-1234-4234-8234-123456789abc';let winningSeed;
 for(let i=0;i<4096;i++){const candidate=hash('protected64-large-fixture:'+i),r=facade.adapter.start(game.id,{stakeMinor:'4000100',holdWin:true},seededRandom(candidate,roundId+':0'),time);if(r.state.status==='active'&&BigInt(r.state.mathState.pendingWinMinor)>4000000n){winningSeed=candidate;break;}}
 assert(winningSeed);const oldId=service.id,oldSeed=service.seed;service.id=()=>roundId;service.seed=()=>winningSeed;
 const user=await fixture.addPlayer(),wallet=async id=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[id]))[0].balance),before=await wallet(user),total=BigInt((await sql.unsafe('SELECT sum(balance)::text AS total FROM sw_rebuild.wallets'))[0].total);
 const start={request_id:crypto.randomUUID(),type:'start',game_id:game.id,model_version:facade.adapter.definitions[game.id].version,stake:'40001.00',options:{holdWin:true}};
 let accepted;try{accepted=await facade.action(user,start);}finally{service.id=oldId;service.seed=oldSeed;}
 assert.equal(accepted.round.stakeMinor,'4000100');assert(BigInt(accepted.round.pendingWinMinor)>4000000n);const row=(await sql.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1',[roundId]))[0];assert.equal(await wallet(row.reserve_wallet),BigInt(row.liability));
 const replay=await facade.action(user,start);assert.equal(replay.replayed,true);assert.equal(await wallet(user),before-4000100n);
 const collect={request_id:crypto.randomUUID(),type:'action',game_id:game.id,model_version:accepted.round.model_version,round_id:roundId,expected_version:accepted.round.version,action:'collect',input:{}};time++;
 const results=await Promise.all([facade.action(user,collect),facade.action(user,collect)]);assert.equal(results.filter(x=>!x.replayed).length,1);const payout=BigInt(results[0].round.payoutMinor);assert(payout>4000000n);assert.equal(await wallet(user),before-4000100n+payout);assert.equal(await wallet(row.reserve_wallet),0n);assert.equal(BigInt((await sql.unsafe('SELECT sum(balance)::text AS total FROM sw_rebuild.wallets'))[0].total),total);
 const failureUser=await fixture.addPlayer(),request=()=>({...start,request_id:crypto.randomUUID(),stake:'1.00'}),footprint=async()=>JSON.stringify({wallets:await sql.unsafe('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id'),transfers:await sql.unsafe('SELECT id FROM sw_rebuild.transfers ORDER BY id'),rounds:await sql.unsafe('SELECT id FROM sw_native_library.rounds ORDER BY id')});
 const house=await wallet('house');await sql.unsafe("UPDATE sw_rebuild.wallets SET balance=0 WHERE id='house'");let original=await footprint();await assert.rejects(facade.action(failureUser,request()),e=>e.message==='BANKROLL_CAPACITY_UNAVAILABLE');assert.equal(await footprint(),original);await sql.unsafe("UPDATE sw_rebuild.wallets SET balance=$1 WHERE id='house'",[String(house)]);
 await sql.unsafe('INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES($1,$2)',[failureUser,String(await wallet(failureUser))]);original=await footprint();await assert.rejects(facade.action(failureUser,request()),e=>e.message==='POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT');assert.equal(await footprint(),original);
 }finally{await fixture.close();}
});
test('retainedSQL facade reuses the exact existing protectedpool/transaction without newdrivers or ledger SQL',async()=>{
 const calls=[],connection={query:async(text,parameters)=>{calls.push({context:'existing-transaction',text,parameters});return{rows:[{value:'tx'}]};}},pool={query:async(text,parameters)=>{calls.push({context:'existing-pool',text,parameters});return{rows:[{value:'pool'}]};}};
 let transactions=0;const facade=review.createProtectedSqlFacade({pool,transaction:async callback=>{transactions++;return callback(connection);}});
 assert(review.assertProtectedSqlPool(facade,pool));assert(Object.isFrozen(facade));assert.deepEqual(await facade.unsafe('SELECT1',[]),[{value:'pool'}]);assert.deepEqual(await facade.begin(tx=>tx.unsafe('SELECT2',['bound'])),[{value:'tx'}]);assert.equal(transactions,1);assert.deepEqual(calls,[{context:'existing-pool',text:'SELECT1',parameters:[]},{context:'existing-transaction',text:'SELECT2',parameters:['bound']}]);
 assert.throws(()=>review.assertProtectedSqlPool({unsafe:facade.unsafe,begin:facade.begin},pool),/RETAINED_CLASSES_MUST_USE_EXACT_PROTECTED_POOL/);assert.throws(()=>review.assertProtectedSqlPool(facade,{}),/RETAINED_CLASSES_MUST_USE_EXACT_PROTECTED_POOL/);
});
