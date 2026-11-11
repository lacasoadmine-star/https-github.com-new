import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  NATIVE60_GAME_IDS, NATIVE60_RELEASE, NATIVE60_HOST_CONTRACT, native60Math,
  auditExistingNative60Sql, installNative60Registration,
  assertNoNative60ActiveInProtectedTransaction, native60OperatorPolicies,
} from '../native60-registration.mjs';
import { createRetainedLibrary74Fixture } from './support/retained-library-fixture.mjs';
import { createRegistry, seededRandom } from './support/retained-library/library-service.mjs';
import { integerRngFromLibrary } from '../existing-library74-adapter.mjs';
import { EXISTING_WALLET_ROUTES } from '../../client/existing-wallet-routes.mjs';
import { writeNative60Evidence } from './support/write-native60-evidence.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const stubPrevious = { fetch(request,...context) { return Response.json({legacyPath:new URL(request.url).pathname,contextCount:context.length}); } };
async function fixture(options={}) {
  const f = await createRetainedLibrary74Fixture({isolated:true,reviewedGameIds:[],allowNewRounds:false,math:native60Math,...options});
  const schema = JSON.parse(await readFile(new URL('./support/protected-slot-schema.json',import.meta.url)));
  assert.equal(hash(schema.schema),schema.schemaSha256);
  assert.equal(schema.privateDeploymentMetadataPublished,false);assert.equal(schema.privateDeploymentPinsRequired,true);assert.equal(Object.hasOwn(schema,'sourceRuntimeSha256'),false);
  await f.db.exec(schema.schema);
  await f.sql.unsafe('ALTER TABLE sw_rebuild.rounds ADD COLUMN IF NOT EXISTS settled_order bigint GENERATED ALWAYS AS IDENTITY');
  f.service.registry = createRegistry([]);
  const remaining = () => ({retained_native:{id:'retained_native',version:'unchanged'}});
  f.service.registry.remainingDefinitions = remaining;
  const dependencies={service:f.service,verifyNative:f.verifyNative,readNativeBody:f.readNativeBody,
    engineSecret:'isolated-fixture-secret-only-'.repeat(3),resolveSessionUser:async()=>f.fixtureUserId};
  return {...f,dependencies};
}
function fixtureRelease(proof,{enabled=true}={}) {
  return {enabled,protectedDatabaseIdentitySha256:proof.report.databaseIdentitySha256,
    protectedAdmissionGuard:{version:NATIVE60_RELEASE,enabled:true,status:'observed',rollbackConfirmed:true,sameNativeDatabaseVerified:true,databaseIdentitySha256:proof.report.databaseIdentitySha256},canonicalTriggerSemanticsReviewed:true,
    games:Object.fromEntries(native60Math.listGameDefinitions().map(game=>[game.id,{reviewed:true,
      modelVersion:'library74-v1:'+game.mathVersion,maxBetMinor:'400000',maxWinMinor:'999999999999999'}]))};
}
const start=(facade,id,extra={})=>({request_id:randomUUID(),type:'start',game_id:id,model_version:facade.adapter.definitions[id].version,stake:'1.00',options:{},...extra});
const fingerprint=async f=>JSON.stringify({wallets:await f.sql.unsafe('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id'),transfers:await f.sql.unsafe('SELECT id FROM sw_rebuild.transfers ORDER BY id'),rounds:await f.sql.unsafe('SELECT id FROM sw_native_library.rounds ORDER BY id'),requests:await f.sql.unsafe('SELECT request_id FROM sw_native_library.requests ORDER BY request_id')});

test('registration scope is exactly60 and preserves all14 existing route identities',()=>{
  assert.equal(NATIVE60_GAME_IDS.length,60);assert.equal(new Set(NATIVE60_GAME_IDS).size,60);
  for(const id of Object.keys(EXISTING_WALLET_ROUTES)){assert(!NATIVE60_GAME_IDS.includes(id));assert.equal(native60Math.getGameDefinition(id),null);}
  assert.equal(NATIVE60_HOST_CONTRACT.initializedServiceExport,'app.existingLibraryDependencies.service');
  assert.deepEqual(Object.keys(NATIVE60_HOST_CONTRACT).sort(),['initializedServiceExport','privateDeploymentPinsRequired','privateHostMetadataPublished']);
  assert.equal(NATIVE60_HOST_CONTRACT.privateDeploymentPinsRequired,true);
  assert.equal(NATIVE60_HOST_CONTRACT.privateHostMetadataPublished,false);
  assert.deepEqual(native60OperatorPolicies(),{});
  const id=NATIVE60_GAME_IDS[0],policy=native60OperatorPolicies({reviewedGameIds:[id]});
  assert.equal(policy[id].maxBetMinor,'2000');assert.equal(policy[id].reviewed,true);
  assert.throws(()=>native60OperatorPolicies({reviewedGameIds:[Object.keys(EXISTING_WALLET_ROUTES)[0]]}));
  for(const id of ['ind74_official_multihot20','ind74_official_multihotways','ind74_official_dragonscode'])assert.throws(()=>native60OperatorPolicies({reviewedGameIds:[id]}),/REAL_MONEY_MODEL_REVIEW_BLOCKED/);
});

test('bounded audit executes only reads on the exact retainedSQL; no player or house balance amounts are returned',{timeout:60000},async()=>{
  const f=await fixture();try{
    const before=await fingerprint(f),queries=[];f.setQueryFault((sql,args)=>{queries.push(sql);});
    const proof=await auditExistingNative60Sql(f.dependencies);f.setQueryFault(undefined);
    assert.equal(proof.report.success,true,JSON.stringify(proof.report));assert.equal(proof.report.schemaCompatible,true);
    assert.match(proof.report.databaseIdentitySha256,/^[a-f0-9]{64}$/);
    assert.equal(proof.report.balanceAmountsReturned,0);assert.equal(proof.report.individualAccountRowsReturned,0);
    assert.equal(proof.report.sameProtectedDatabaseVerified,false);assert.equal(proof.report.triggerFunctionSemanticsVerified,false);
    assert(queries.length>=9);assert(queries.every(q=>/^(?:SET|SELECT)\b/.test(q)));
    assert(queries[0].includes('READ ONLY'));assert.equal(await fingerprint(f),before);
    assert.equal(proof.report.house.has_funds,true);assert.equal(proof.report.existingActiveReservesFunded,true);
  }finally{await f.close();}
});

test('signed transport uses the exact retained signature and session resolvers; wronguser/system/blockedaccount cannot act',{timeout:60000},async()=>{
  const f=await fixture();try{
    const auth=JSON.parse(await readFile(new URL('./support/native-session-resolver.json',import.meta.url)));
    assert.equal(hash(auth.source),auth.sourceSha256);
    const resolveSessionUser=new Function('fail',auth.source.replace(/^import[^\n]+\n/,'').replace('export async function','async function')+'\nreturn resolveSessionUser;')((message,status)=>{throw Object.assign(new Error(message),{status});});
    await f.sql.unsafe('CREATE TABLE sw_rebuild.sessions(token text PRIMARY KEY,user_id text NOT NULL,expires bigint NOT NULL)');
    const token='9'.repeat(64),subject='@session:'+hash(token),secret=f.dependencies.engineSecret;
    await f.sql.unsafe('INSERT INTO sw_rebuild.sessions(token,user_id,expires) VALUES($1,$2,$3)',[hash(token),f.fixtureUserId,Date.now()+3600000]);
    const proof=await auditExistingNative60Sql(f.dependencies),release=fixtureRelease(proof);
    release.games=native60OperatorPolicies({reviewedGameIds:NATIVE60_GAME_IDS.filter(id=>!native60Math.getGameDefinition(id).releaseReview?.realMoneyAdmissionBlocked),maximumStakeMinor:'2000'});
    const installed=installNative60Registration(stubPrevious,{...f.dependencies,resolveSessionUser},{auditProof:proof,release});
    const game=native60Math.listGameDefinitions().find(d=>d.family==='dice');assert(game);
    const request=(path,{body,as=subject}={})=>{
      const url=new URL(path,'https://native.test'),method=body?'POST':'GET',raw=body?JSON.stringify(body):'',time=String(Date.now());
      const signature=createHmac('sha256',secret).update([method,url.pathname+url.search,time,as,hash(raw)].join('\n')).digest('hex');
      return new Request(url,{method,headers:{'x-native-user':as,'x-native-time':time,'x-native-signature':signature,...(body?{'content-type':'application/json'}:{})},...(body?{body:raw}:{})});
    };
    const path='/v2/independent74/state?game_id='+game.id;
    assert.equal((await installed.app.fetch(new Request('https://native.test'+path))).status,401);
    assert.equal((await installed.app.fetch(request(path,{as:'@system'}))).status,401);
    assert.equal((await installed.app.fetch(request(path,{as:f.fixtureUserId}))).status,401);
    const state=await installed.app.fetch(request(path));assert.equal(state.status,200);assert.equal((await state.json()).currency,'ETB');
    const before=await fingerprint(f),tooLarge=start(installed.facade,game.id,{stake:'21.00'});
    const rejected=await installed.app.fetch(request('/v2/independent74/action',{body:tooLarge}));assert.equal(rejected.status,422);assert.equal(await fingerprint(f),before);
    const accepted=start(installed.facade,game.id,{stake:'20.00'});
    const first=await installed.app.fetch(request('/v2/independent74/action',{body:accepted}));assert.equal(first.status,200);const round=await first.json();assert.equal(round.round.stakeMinor,'2000');
    const replay=await installed.app.fetch(request('/v2/independent74/action',{body:accepted}));assert.equal((await replay.json()).replayed,true);
    await f.sql.unsafe("UPDATE sw_rebuild.users SET status='blocked' WHERE id=$1",[f.fixtureUserId]);
    assert.equal((await installed.app.fetch(request(path))).status,401);
  }finally{await f.close();}
});

test('installer defaultsclosed and cannot enable with fabricated audit, mutableproof or browserinput; exact oldmethods untouched',{timeout:60000},async()=>{
  const f=await fixture();try{
    const protectedMethods=['action','state','reserve','persist','reconcile','migrate','recoverTimers'];
    const originals=Object.fromEntries(protectedMethods.map(k=>[k,f.service[k]]));
    const walletMethods=Object.fromEntries(['transaction','move','balance','changed'].map(k=>[k,f.shared[k]]));
    const registry=f.service.registry,remaining=registry.remainingDefinitions,before=await fingerprint(f);
    const fake={report:{success:true,databaseIdentitySha256:'a'.repeat(64)}};
    const installed=installNative60Registration(stubPrevious,f.dependencies,{auditProof:fake,release:fixtureRelease(fake)});
    assert.equal(installed.service,f.service);assert.equal(f.service.shared,f.shared);assert.equal(f.service.sql,f.sql);
    assert.equal(f.service.registry.remainingDefinitions,remaining);assert.deepEqual(f.service.registry.remainingDefinitions(),remaining());
    for(const key of protectedMethods)assert.equal(f.service[key],originals[key]);
    for(const [key,value]of Object.entries(walletMethods))assert.equal(f.shared[key],value);
    assert(installed.facade.definitions().every(d=>!d.accepting));
    assert(installed.readiness().reasons.includes('ACTUAL_EXISTING_SQL_AUDIT_REQUIRED'));
    const request=start(installed.facade,NATIVE60_GAME_IDS[0]);
    await assert.rejects(installed.facade.action(f.fixtureUserId,request),/INDEPENDENT74_NEW_ROUNDS_DISABLED/);
    assert.equal(await fingerprint(f),before);
    const health=await installed.app.fetch(new Request('https://native.test/v2/independent74/health'));
    assert.equal(health.status,200);const h=await health.json();assert.equal(h.games.length,60);assert.equal(h.accepting,false);
    const legacy=await installed.app.fetch(new Request('https://native.test/api/slots/spin'),'unchanged');
    assert.deepEqual(await legacy.json(),{legacyPath:'/api/slots/spin',contextCount:1});
    installed.restoreBeforeUse();assert.equal(f.service.registry,registry);
  }finally{await f.close();}
});

test('readonly audit failure, schema drift and protectedDB mismatch stayclosed without guessed wagercaps',{timeout:60000},async()=>{
  const f=await fixture();try{
    f.setQueryFault(q=>{if(q.includes('current_database()'))throw Object.assign(new Error('private detail must not leak'),{code:'AUDIT_TEST_FAILURE'});});
    const failure=await auditExistingNative60Sql(f.dependencies);f.setQueryFault(undefined);
    assert.equal(failure.report.success,false);assert.equal(failure.report.failureCode,'AUDIT_TEST_FAILURE');assert(!JSON.stringify(failure).includes('private detail'));
    f.setQueryFault(q=>{if(q.includes('information_schema.columns'))throw Object.assign(new Error('not returned'),{code:'AUDIT_METADATA_DENIED'});});
    const partial=await auditExistingNative60Sql(f.dependencies);f.setQueryFault(undefined);assert.equal(partial.report.success,false);assert.match(partial.report.databaseIdentitySha256,/^[a-f0-9]{64}$/);assert.equal(partial.report.failureCode,'AUDIT_METADATA_DENIED');
    const proof=await auditExistingNative60Sql(f.dependencies),release=fixtureRelease(proof);
    release.protectedDatabaseIdentitySha256='f'.repeat(64);
    const installed=installNative60Registration(stubPrevious,f.dependencies,{auditProof:proof,release});
    assert.equal(installed.readiness().sameProtectedDatabaseVerified,false);assert(installed.facade.definitions().every(g=>!g.accepting));
    installed.restoreBeforeUse();
    await f.sql.unsafe('DROP INDEX sw_native_library.library_one_active_round_per_player');
    const drift=await auditExistingNative60Sql(f.dependencies);assert.equal(drift.report.activeIndex,false);assert.equal(drift.report.success,false);
  }finally{await f.close();}
});

test('five successive rounds for each exact60 use retained wallet reserves, settle, reload and replay without duplicate debit',{timeout:300000},async()=>{
  let now=1794355200000;
  const f=await fixture({now:()=>now});try{
    const proof=await auditExistingNative60Sql(f.dependencies);assert.equal(proof.report.success,true);
    const installed=installNative60Registration(stubPrevious,f.dependencies,{auditProof:proof,release:fixtureRelease(proof)});
    assert.equal(installed.facade.definitions().filter(g=>g.accepting).length,native60Math.listGameDefinitions().filter(g=>!g.releaseReview?.realMoneyAdmissionBlocked).length);
    const evidence=[];
    for(const game of native60Math.listGameDefinitions()){
      const blocked=game.releaseReview?.realMoneyAdmissionBlocked===true;
      if(blocked){const untouched=await fingerprint(f);await assert.rejects(installed.facade.action(f.fixtureUserId,start(installed.facade,game.id)),/INDEPENDENT74_NEW_ROUNDS_DISABLED/);assert.equal(await fingerprint(f),untouched);}
      // A known math-policy rejection is exercised only by a separate, explicit
      // disposable technical fixture. The production namespace stays closed.
      const run=blocked?await createRetainedLibrary74Fixture({isolated:true,math:native60Math,reviewedGameIds:[game.id],allowNewRounds:true,now:()=>now}):f;
      const play=blocked?run.facade:installed.facade;
      const balance=async user=>BigInt((await run.sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[user]))[0].balance);
      const user=await run.addPlayer();let previousCarry=null;const rounds=[];
      try{ 
      for(let spin=1;spin<=5;spin++){
        now+=10;
        const before=await balance(user),request=start(play,game.id);
        const total=BigInt((await run.sql.unsafe('SELECT sum(balance)::text AS value FROM sw_rebuild.wallets'))[0].value);
        let response=await play.action(user,request);
        const replay=await play.action(user,request);assert.equal(replay.replayed,true,game.id+' spin '+spin);assert.equal(replay.round.round_id,response.round.round_id);
        const reloaded=await play.state(user,game.id);assert.equal(reloaded.round.round_id,response.round.round_id);
        response=reloaded;
        if(response.round.status==='active'){
          const row=(await run.sql.unsafe('SELECT reserve_wallet,liability FROM sw_native_library.rounds WHERE id=$1',[response.round.round_id]))[0];
          assert.equal(await balance(row.reserve_wallet),BigInt(row.liability),game.id);
          assert.equal(await balance(user),before-100n,game.id+' active debit '+spin);
          response=await play.action(user,{request_id:randomUUID(),type:'action',game_id:game.id,model_version:response.round.model_version,round_id:response.round.round_id,expected_version:response.round.version,action:'collect',input:{}});
        }
        assert.equal(response.round.status,'settled',game.id);
        assert.equal(await balance(user),before-100n+BigInt(response.round.payoutMinor),game.id+' spin '+spin);
        assert.equal(BigInt((await run.sql.unsafe('SELECT sum(balance)::text AS value FROM sw_rebuild.wallets'))[0].value),total,game.id);
        assert.equal((await run.sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'",[user])).length,spin,game.id);
        const saved=(await run.sql.unsafe('SELECT state FROM sw_native_library.rounds WHERE id=$1',[response.round.round_id]))[0].state.mathState;
        if(game.chargingFeature){
          assert.equal(saved.carryAfter.paidSpins,String(spin),game.id+' retained counter');
          if(previousCarry)assert.deepEqual(saved.carryBefore,previousCarry,game.id+' spin2+ prior carry');
          previousCarry=structuredClone(saved.carryAfter);
        }
        assert.equal(response.round.private,undefined);assert.equal(response.round.mathState,undefined);
        rounds.push({spin,beforeMinor:String(before),debitMinor:'100',payoutMinor:response.round.payoutMinor,afterMinor:String(await balance(user)),status:response.round.status,replayDebitedAgain:false,houseAndWalletSumConserved:true,...(saved.carryAfter?{paidSpins:saved.carryAfter.paidSpins}: {})});
      }
      const history=await play.history(user,game.id);assert.equal(history.history.length,5,game.id);
      assert.equal((await run.sql.unsafe("SELECT id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active'",[user])).length,0);
      evidence.push({id:game.id,title:game.title,modelVersion:play.adapter.definitions[game.id].version,isolatedNamespaceAccepting:!blocked,productionNamespaceAccepting:false,technicalFixtureOnly:true,mathReviewBlocked:blocked,rounds});
      }finally{if(blocked)await run.close();}
    }
    await writeNative60Evidence('native60-five-rounds.json',{engine:'Exact retained LibraryService and SharedWallet in disposable PGlite',hostContract:NATIVE60_HOST_CONTRACT,gateInProduction:'closed',gameCount:60,acceptedRounds:300,settledRounds:300,roundsPerGame:5,multiProcessDatabaseLockingVerified:false,games:evidence});
  }finally{await f.close();}
});

test('newpaid requests respect unresolved protected free-spins and bonus; protected readguard rejects active new60 but ignores receipt replay elsewhere',{timeout:60000},async()=>{
  const f=await fixture();try{
    const proof=await auditExistingNative60Sql(f.dependencies),installed=installNative60Registration(stubPrevious,f.dependencies,{auditProof:proof,release:fixtureRelease(proof)});
    const id='ind74_official_mineisland2',user=f.fixtureUserId;
    await f.sql.unsafe('INSERT INTO sw_nine.free_spins(user_id,game_id,remaining,bet) VALUES($1,$2,3,100)',[user,'multi_hot_5_video']);
    const before=await fingerprint(f);
    await assert.rejects(installed.facade.action(user,start(installed.facade,id)),/FINISH_ACTIVE_ROUND:multi_hot_5_video/);
    assert.equal(await fingerprint(f),before);
    await f.sql.unsafe('DELETE FROM sw_nine.free_spins WHERE user_id=$1',[user]);
    const bonusId=randomUUID();
    await f.sql.unsafe('INSERT INTO sw_nine.game_rounds(round_id,user_id,game_id,bet,base_bet,total_win,wheel_multiplier,request_key,request_hash,result_json,math_sha256) VALUES($1,$2,$3,0,100,0,1,$4,$5,$6::jsonb,$5)',[bonusId,user,'safari_simba','fixture-bonus',hash('fixture-bonus'),JSON.stringify({pendingBonusPick:true})]);
    await assert.rejects(installed.facade.action(user,start(installed.facade,id)),/FINISH_ACTIVE_ROUND:safari_simba/);
    await f.sql.unsafe('INSERT INTO sw_nine.actions(id,parent_id,user_id,kind,request_key,request_hash,attempt,result_json) VALUES($1,$2,$3,$4,$5,$6,1,$7::jsonb)',[randomUUID(),bonusId,user,'PICK','fixture-pick',hash('fixture-pick'),JSON.stringify({payout:'0.00'})]);
    // Search a deterministic test seed with a surviving first ladder step;
    // an unconditional active assertion would intermittently fail on a fair loss.
    const roundId=randomUUID();let chosen;
    for(let n=0;n<100;n++){const seed=hash('protected-active-fixture:'+n);const candidate=native60Math.startRound({gameId:id,betMinor:'100',now:Date.now(),rng:integerRngFromLibrary(seededRandom(seed,roundId+':0'))});if(candidate.status==='active'){chosen=seed;break;}}
    assert(chosen);f.service.seed=()=>chosen;f.service.id=()=>roundId;
    const round=await installed.facade.action(user,start(installed.facade,id));assert.equal(round.round.status,'active');
    const connection={query:async(sql,args)=>({rows:await f.sql.unsafe(sql,args)})};
    await assert.rejects(assertNoNative60ActiveInProtectedTransaction(connection,user),/FINISH_ACTIVE_ROUND:ind74_official_mineisland2/);
    await installed.facade.action(user,{request_id:randomUUID(),type:'action',game_id:id,model_version:round.round.model_version,round_id:round.round.round_id,expected_version:round.round.version,action:'collect',input:{}});
    await assertNoNative60ActiveInProtectedTransaction(connection,user);
  }finally{await f.close();}
});

test('Charging carry follows accepted canonical order across stake buckets, duplicate races and transaction rollback',{timeout:90000},async()=>{
 const now=1794355200000,f=await fixture({now:()=>now});try{
  const proof=await auditExistingNative60Sql(f.dependencies),installed=installNative60Registration(stubPrevious,f.dependencies,{auditProof:proof,release:fixtureRelease(proof)});
  for(const gameId of ['ind74_official_multifruitschargingwilds','ind74_official_gemscrownchargingwilds']){
   const user=await f.addPlayer(),d=native60Math.getGameDefinition(gameId),empty=native60Math.emptyChargingCarry();
   const choose=({stake='1.00',options={},priorCarry=empty,want=()=>true}={})=>{
    const id=randomUUID(),betMinor=String(BigInt(stake.replace('.',''))),bucket=native60Math.chargingCarryBucket(d,betMinor,options),context={bucket,priorCarry};let selected;
    for(let n=0;n<10000;n++){
     const seed=hash('charging-ledger:'+id+':'+n),round=native60Math.startRound({gameId,betMinor,options,context,now,rng:integerRngFromLibrary(seededRandom(seed,id+':0'))});
     if(want(round)){selected={seed,round};break;}
    }
    assert(selected,'deterministic isolated trajectory found');f.service.id=()=>id;f.service.seed=()=>selected.seed;
    return {body:start(installed.facade,gameId,{stake,options}),expected:selected.round,context};
   };
   const lost=choose({want:r=>r.winMinor==='0'&&r.carryAfter.wilds.length>0});
   const first=await installed.facade.action(user,lost.body);assert.equal(first.round.carryAfter.paidSpins,'1');assert.deepEqual(first.round.carryAfter,lost.expected.carryAfter);
   const before1=first.round.carryAfter;
   const other=choose({stake:'2.00',want:r=>r.winMinor==='0'});const otherRound=await installed.facade.action(user,other.body);assert.equal(otherRound.round.carryAfter.paidSpins,'1');
   const next=choose({priorCarry:before1,want:r=>BigInt(r.winMinor)>0n});
   const race=await Promise.all(Array.from({length:8},()=>installed.facade.action(user,next.body)));
   assert.equal(race.filter(r=>!r.replayed).length,1);assert.equal(new Set(race.map(r=>r.round.round_id)).size,1);
   const second=race[0];assert.deepEqual(second.round.carryBefore,before1);assert.equal(second.round.carryAfter.paidSpins,'2');assert.deepEqual(second.round.carryAfter,next.expected.carryAfter);
   const state=await installed.facade.state(user,gameId);assert.equal(state.round.round_id,second.round.round_id,'same-timestamp reload uses accepted settlement order');
   const history=await installed.facade.history(user,gameId);assert.deepEqual(history.history.map(r=>r.round_id),[second.round.round_id,otherRound.round.round_id,first.round.round_id]);
   assert.equal((await f.sql.unsafe("SELECT count(*)::int AS count FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'",[user]))[0].count,3);
   const saved=second.round.carryAfter,pending=choose({priorCarry:saved}),before=await fingerprint(f);
   f.setQueryFault(sql=>{if(sql.startsWith('INSERT INTO sw_native_library.requests'))throw Object.assign(new Error('isolated before-commit fault'),{code:'FIXTURE_ROLLBACK'});});
   await assert.rejects(installed.facade.action(user,pending.body),/isolated before-commit fault/);f.setQueryFault(undefined);
   assert.equal(await fingerprint(f),before);assert.equal((await installed.facade.state(user,gameId)).round.round_id,second.round.round_id);
   const accepted=await installed.facade.action(user,pending.body);assert.deepEqual(accepted.round.carryBefore,saved);assert.equal(accepted.round.carryAfter.paidSpins,'3');
   const forged=start(installed.facade,gameId,{options:{priorCarry:empty}}),untouched=await fingerprint(f);
   await assert.rejects(installed.facade.action(user,forged),error=>error.code==='INVALID_OPTIONS'&&error.status===422);assert.equal(await fingerprint(f),untouched);
   // Canonical account-cap admission failure cannot consume the saved charge.
   const current=(await f.sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[user]))[0].balance;
   await f.sql.unsafe('INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES($1,$2)',[user,current]);
   const capped=choose({priorCarry:accepted.round.carryAfter}),beforeCap=await fingerprint(f);
   await assert.rejects(installed.facade.action(user,capped.body),/POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT/);assert.equal(await fingerprint(f),beforeCap);
   await f.sql.unsafe('DELETE FROM sw_rebuild.account_limits WHERE user_id=$1',[user]);
   const resumed=await installed.facade.action(user,capped.body);assert.deepEqual(resumed.round.carryBefore,accepted.round.carryAfter);assert.equal(resumed.round.carryAfter.paidSpins,'4');
   if(d.chargingFeature.anteValues.includes(5)){
    const ante=choose({stake:'5.00',options:{ante:5}}),a=await installed.facade.action(user,ante.body);assert.deepEqual(a.round.carryBucket,{baseBetMinor:'100',ante:5});assert.equal(a.round.carryAfter.paidSpins,'1');assert.equal(a.round.outcome.initialAnteGuarantee,true);
    const restore=choose({priorCarry:resumed.round.carryAfter}),r=await installed.facade.action(user,restore.body);assert.deepEqual(r.round.carryBefore,resumed.round.carryAfter);assert.equal(r.round.carryAfter.paidSpins,'5');
   }
  }
 }finally{await f.close();}
});

test('new60 cannot bypass namespace admission through an old generic service action',{timeout:60000},async()=>{
 const f=await fixture();try{
  const proof=await auditExistingNative60Sql(f.dependencies),installed=installNative60Registration(stubPrevious,f.dependencies,{auditProof:proof,release:fixtureRelease(proof)});
  const game=native60Math.listGameDefinitions().find(d=>d.family==='dice'),body=start(installed.facade,game.id),before=await fingerprint(f);
  await assert.rejects(f.service.action(f.fixtureUserId,body),/NATIVE60_GUARDED_ADMISSION_REQUIRED/);assert.equal(await fingerprint(f),before);
  const valid=await installed.facade.action(f.fixtureUserId,body);assert.equal(valid.round.status,'settled');
  const health=await(await installed.app.fetch(new Request('https://native.test/v2/independent74/health'))).json();
  assert.equal(health.capability.databaseIdentitySha256,proof.report.databaseIdentitySha256);assert.equal(health.capability.schemaMetadataSha256,proof.report.schemaMetadataSha256);
  assert.equal(health.capability.columns,undefined);assert.equal(health.capability.indexes,undefined);assert.equal(health.capability.balance,undefined);
 }finally{await f.close();}
});

test('every explicit math rejection overrides reviewed policies and passing isolated SQL proofs',{timeout:60000},async()=>{
 const f=await fixture();try{
  const proof=await auditExistingNative60Sql(f.dependencies),installed=installNative60Registration(stubPrevious,f.dependencies,{auditProof:proof,release:fixtureRelease(proof)});
  for(const definition of native60Math.listGameDefinitions().filter(g=>g.releaseReview?.realMoneyAdmissionBlocked)){
   const game=installed.facade.definitions().find(g=>g.id===definition.id);assert.equal(game.accepting,false);assert.equal(game.launchable,false);assert.equal(game.releaseReview.realMoneyAdmissionBlocked,true);
   assert.throws(()=>native60OperatorPolicies({reviewedGameIds:[game.id]}),/REAL_MONEY_MODEL_REVIEW_BLOCKED/);
   assert(installed.readiness().games.find(g=>g.id===game.id).reasons.includes('REAL_MONEY_MODEL_REVIEW_BLOCKED'));
  }
  for(const[id,numerator,denominator]of[['ind74_official_multihot20','198600','163840'],['ind74_official_multihotways','4080','2560'],['ind74_official_dragonscode','474480','163840']]){
   const game=installed.facade.definitions().find(g=>g.id===id);assert.equal(game.accepting,false);assert.equal(game.launchable,false);
   assert.equal(game.releaseReview.realMoneyAdmissionBlocked,true);assert.equal(game.releaseReview.independentAnalyticReturn.numerator,numerator);assert.equal(game.releaseReview.independentAnalyticReturn.denominator,denominator);
   const readiness=installed.readiness().games.find(g=>g.id===id);assert(readiness.reasons.includes('REAL_MONEY_MODEL_REVIEW_BLOCKED'));assert(readiness.reasons.includes('INDEPENDENT_RETURN_ABOVE_STAKE'));
   const before=await fingerprint(f);await assert.rejects(installed.facade.action(f.fixtureUserId,start(installed.facade,id)),/INDEPENDENT74_NEW_ROUNDS_DISABLED/);assert.equal(await fingerprint(f),before);
  }
 }finally{await f.close();}
});
