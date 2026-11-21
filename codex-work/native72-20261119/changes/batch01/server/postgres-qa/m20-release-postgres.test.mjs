// Actual accepted-policy binding -> original ledger SQL -> disposable PostgreSQL.
// Attestations are synthetic TEST INPUTS only, never production acceptance.
// No provider request, real Player account, production DB or production wager.
import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createFixture,uid,house,cookie,guard,hash,request} from './existing-ledger.mjs';
import {createNative72Batch01Binding} from '../railway-binding.mjs';
import {createReleaseTestFixture} from '../m20-release-test-fixture.mjs';
import {M20_GAME_ID,M20_MATH_SHA256,M20_ARTIFACT_SHA256,M20_EVALUATOR_SHA256,
  REQUIRED_SOURCE_PATHS,releaseSha256,sourceSnapshotSha256} from '../m20-release-policy.mjs';
import {asETB,evaluateCapturedMath} from '../official-math.mjs';
import {Session} from '../../multihot20/session.mjs';

const url=new URL(process.env.ZPLAY_PG_QA_URL??'postgresql://invalid/'),database=process.env.ZPLAY_PG_QA_DATABASE;
assert.equal(process.env.ZPLAY_PG_QA_DISPOSABLE,'1','Use the disposable PostgreSQL runner');
assert.match(database??'',/^zplay_qa_[a-f0-9]{16}$/);assert.equal(url.hostname,'127.0.0.1');
assert.equal(url.pathname,'/'+database);assert.equal(url.username,'zplay_qa');assert.ok(url.port);
const pool=new pg.Pool({connectionString:url.href,max:12}),burn='fresh_multihot5burnwilds';
const output=process.env.ZPLAY_PG_QA_REPORT_DIR??fileURLToPath(new URL('./reports/',import.meta.url));
const scenarios=[],outcomes=[],sourceDigests={},qaSourceDigests={};let postgresVersion=null;
const startedAt=new Date().toISOString();
const qaPaths=['server/postgres-qa/m20-release-postgres.test.mjs','server/postgres-qa/run.mjs',
  'server/postgres-qa/existing-ledger.mjs','server/postgres-qa/schema.sql','server/postgres-qa/package-lock.json',
  'server/m20-release-test-fixture.mjs'];
const bytes=path=>readFile(new URL('../../'+path,import.meta.url));
function scenario(name,fn){
  scenarios.push(name);test(name,async t=>{
    try{await fn(t);outcomes.push({name,status:'PASS'})}
    catch(error){outcomes.push({name,status:'FAIL',error:error.message});throw error}
  });
}
before(async()=>{
  const r=await pool.query("SELECT current_database() db,to_regclass('sw_nine.game_rounds') registered,version() version");
  assert.equal(r.rows[0].db,database);assert.equal(r.rows[0].registered,'sw_nine.game_rounds');postgresVersion=r.rows[0].version;
  for(const path of REQUIRED_SOURCE_PATHS)sourceDigests[path]=releaseSha256(await bytes(path));
  for(const path of qaPaths)qaSourceDigests[path]=releaseSha256(await bytes(path));
});
beforeEach(async()=>{
  await pool.query('TRUNCATE sw_rebuild.users,sw_rebuild.wallets,sw_rebuild.rounds,sw_native_library.rounds CASCADE');
  await pool.query("INSERT INTO sw_rebuild.users VALUES($1,'player','active')",[uid]);
  await pool.query('INSERT INTO sw_rebuild.wallets VALUES($1,10000),($2,10000000)',[uid,house]);
  await pool.query('INSERT INTO sw_rebuild.sessions VALUES($1,$2,$3)',[hash(cookie),uid,Date.now()+3600000]);
});
after(async()=>{
  const drift=[];
  try{
    for(const [path,digest] of Object.entries({...sourceDigests,...qaSourceDigests}))
      if(releaseSha256(await bytes(path))!==digest)drift.push(path);
  }finally{await pool.end()}
  const passed=outcomes.filter(o=>o.status==='PASS').length,failed=outcomes.filter(o=>o.status==='FAIL').length;
  const skipped=scenarios.length-outcomes.length,status=passed===scenarios.length&&failed===0&&skipped===0&&drift.length===0?'PASS':'FAIL';
  const report={schema:'zplay/m20-accepted-policy-postgres/v1',status,startedAt,finishedAt:new Date().toISOString(),
    database:'PostgreSQL',postgresVersion,disposable:true,productionWagers:0,providerRequests:0,
    schemaScope:'Original sw_nine DDL with documented minimal sw_rebuild/sw_native_library QA fixtures; not a production-DDL claim',
    approvalScope:'SYNTHETIC_ATTESTATIONS_IN_DISPOSABLE_QA_ONLY',productionAcceptanceGranted:false,
    gameId:M20_GAME_ID,mathSha256:M20_MATH_SHA256,artifactSha256:M20_ARTIFACT_SHA256,evaluatorSha256:M20_EVALUATOR_SHA256,
    sourceDigests,sourceSha256:sourceSnapshotSha256(sourceDigests),qaSourceDigests,sourceDrift:drift,
    ci:{sourceCommit:process.env.GITHUB_SHA??null,runId:process.env.GITHUB_RUN_ID??null,job:process.env.GITHUB_JOB??null},
    tests:{passed,failed,skipped,cancelled:0,total:scenarios.length},
    acceptedPolicyRouteIntegration:status==='PASS',outcomes};
  await mkdir(output,{recursive:true});await writeFile(join(output,'m20-release-postgres.json'),JSON.stringify(report,null,2)+'\n');
  assert.deepEqual(drift,[],'source changed during PostgreSQL acceptance');
});
const wallets=async()=>Object.fromEntries((await pool.query('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id')).rows.map(r=>[r.id,r.balance]));
const counts=async()=>(await pool.query(`SELECT
 (SELECT count(*)::int FROM sw_rebuild.transfers) transfers,
 (SELECT count(*)::int FROM sw_rebuild.ledger) ledger,
 (SELECT count(*)::int FROM sw_rebuild.rounds) rounds,
 (SELECT count(*)::int FROM sw_nine.game_rounds) results,
 (SELECT count(*)::int FROM sw_nine.actions) actions,
 (SELECT count(*)::int FROM sw_nine.wallet_transactions WHERE type='BET') bets,
 (SELECT count(*)::int FROM sw_nine.wallet_transactions WHERE type='GAMBLE_BET') gamble_bets`)).rows[0];
async function unchanged(){
  assert.deepEqual(await wallets(),{house:'10000000',[uid]:'10000'});
  assert.deepEqual(await counts(),{transfers:0,ledger:0,rounds:0,results:0,actions:0,bets:0,gamble_bets:0});
}
async function bind(options={}){
  const accepted=await createReleaseTestFixture(),fixture=createFixture(pool,options);let enabled=true;
  const retained={id:'multi_hot_5_native',enabled:true};
  const dependencies={...fixture.dependencies,cash:asETB,accepting:()=>enabled,
    publicGames:()=>[retained,{id:'fresh_multihot10',betLevels:['0.20','1.00','2.00']},
      {id:M20_GAME_ID,freshReleaseReady:true},{id:burn,freshReleaseReady:true}]};
  const routes=await createNative72Batch01Binding(dependencies,{releaseAcceptance:accepted.inputs});
  assert.equal(accepted.registry.profileForGame(M20_GAME_ID).productionApproved,false);
  assert.equal(accepted.registry.profileForGame(burn).productionApproved,false);
  assert.equal(routes.publicGames()[0],retained);
  return{routes,fixture,registry:accepted.registry,dependencies,stop:()=>{enabled=false}};
}
const body=(x,gameId=M20_GAME_ID)=>({gameId,bet:'1.00',roundToken:randomUUID(),sessionGuard:guard,
  ...Object.fromEntries(['mathVersion','engineVersion','mathSha256'].map(k=>[k,x.registry.profileForGame(gameId)[k]]))});
function smallWinStops(profile){
  const strips=profile.reelStrips,total=strips.reduce((n,s)=>n*s.length,1);
  for(let i=0;i<total;i++){
    let cursor=i;const stops=strips.map(s=>{const n=cursor%s.length;cursor=Math.floor(cursor/s.length);return n});
    const grid=Array.from({length:3},(_,r)=>stops.map((stop,c)=>strips[c][(stop+r-1+strips[c].length)%strips[c].length]));
    const win=evaluateCapturedMath({gameId:M20_GAME_ID,grid,bet:'1.00',wheelMultiplier:1}).finalWinCents;
    if(win>0n&&win<=100n)return stops;
  }
  throw Error('QA_SMALL_WIN_NOT_FOUND');
}
function winningDraws(t,x){
  const draws=[...smallWinStops(x.registry.profileForGame(M20_GAME_ID)),0];
  t.mock.method(globalThis.crypto,'getRandomValues',array=>{array.fill(0);array[0]=draws.shift()??0;return array});
}
const action=(parent,options={})=>({gameId:M20_GAME_ID,roundId:parent.roundId,roundToken:randomUUID(),sessionGuard:guard,
  choice:'RED',expectedAttempt:1,expectedStake:parent.finalWin,
  ...Object.fromEntries(['mathVersion','engineVersion','mathSha256'].map(k=>[k,parent[k]])),...options});
function transport(routes,{loseResponse=false}={}){
  const posts=[];let lost=false;
  return {posts,request:async(path,input)=>{
    if(path.startsWith('/api/slots/fresh-state'))return routes.state(request,M20_GAME_ID);
    assert.ok(['/api/slots/spin','/api/slots/gamble'].includes(path),'No detached wallet or financial API');
    posts.push({path,body:structuredClone(input)});
    const result=path==='/api/slots/spin'?await routes.spin(request,input):await routes.gamble(request,input);
    if(loseResponse&&!lost){lost=true;throw Object.assign(Error('QA_COMMITTED_RESPONSE_LOST'),{code:'QA_COMMITTED_RESPONSE_LOST',status:503})}
    return result;
  }};
}
const storage=()=>{const values=new Map();return{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};

scenario('accepted policy: actual M20 Session validates audited grid and exact existing PostgreSQL debit/credit',async t=>{
  const x=await bind();winningDraws(t,x);const wire=transport(x.routes),session=new Session({request:wire.request,storage:storage()});
  const ready=await session.connect();assert.equal(ready.game.enabled,true);assert.equal(ready.balance,'100.00');
  const receipt=await session.spin('1.00');
  const evaluated=evaluateCapturedMath({gameId:M20_GAME_ID,grid:receipt.initialGrid,bet:receipt.bet,wheelMultiplier:receipt.wheelMultiplier});
  assert.deepEqual(receipt.grid,evaluated.grid);assert.deepEqual(receipt.winLines,evaluated.winLines);assert.equal(receipt.finalWin,evaluated.finalWin);
  assert.equal(receipt.mathSha256,M20_MATH_SHA256);assert.equal(receipt.providerRngReproduced,false);assert.equal(receipt.providerCertified,false);
  const win=BigInt(receipt.finalWin.replace('.',''));assert.ok(win>0n);
  assert.deepEqual(await wallets(),{house:String(10000000n+100n-win),[uid]:String(9900n+win)});
  const fresh=await session.finish();assert.equal(fresh.balance,asETB(9900n+win));assert.equal(fresh.round.result.roundId,receipt.roundId);
  assert.equal(fresh.game.productionApproved,true);assert.equal(fresh.game.probabilityModelAudited,true);
  assert.deepEqual(await counts(),{transfers:2,ledger:4,rounds:1,results:1,actions:0,bets:1,gamble_bets:0});
});
scenario('accepted policy: eight overlapping same-token requests settle one actual PostgreSQL round',async t=>{
  const x=await bind();winningDraws(t,x);const input=body(x);
  const results=await Promise.all(Array.from({length:8},()=>x.routes.spin(request,input)));
  for(const result of results)assert.deepEqual(result,results[0]);assert.ok(x.fixture.metrics().maxActiveTransactions>1);
  const record=(await pool.query('SELECT result_json,math_sha256 FROM sw_nine.game_rounds WHERE request_key=$1',[input.roundToken])).rows;
  const {modelKind,providerRngReproduced,providerCertified,...storedReceipt}=results[0];
  assert.equal(record.length,1);assert.deepEqual(record[0].result_json,storedReceipt);
  assert.equal(record[0].math_sha256,M20_MATH_SHA256);
  assert.deepEqual(await counts(),{transfers:2,ledger:4,rounds:1,results:1,actions:0,bets:1,gamble_bets:0});
});
scenario('accepted policy: global stop blocks new SPIN/X2 and preserves already settled token replay',async t=>{
  const x=await bind();winningDraws(t,x);const input=body(x),parent=await x.routes.spin(request,input);
  const gambleInput=action(parent),won=await x.routes.gamble(request,gambleInput);assert.equal(won.won,true);
  const before=await wallets(),beforeCounts=await counts();x.stop();
  assert.equal((await x.routes.state(request,M20_GAME_ID)).game.enabled,false);
  await assert.rejects(x.routes.spin(request,{...input,roundToken:randomUUID()}),/SLOT_RELEASE_NOT_ENABLED/);
  await assert.rejects(x.routes.gamble(request,action(parent,{expectedAttempt:2,expectedStake:won.payout})),/SLOT_RELEASE_NOT_ENABLED/);
  assert.deepEqual(await x.routes.spin(request,{...input,replayOnly:true}),parent);
  assert.deepEqual(await x.routes.gamble(request,{...gambleInput,replayOnly:true}),won);
  assert.deepEqual(await wallets(),before);assert.deepEqual(await counts(),beforeCounts);
});
scenario('accepted policy: Burn stays closed and missing acceptance never promotes M20',async()=>{
  const x=await bind(),burnState=await x.routes.state(request,burn);assert.equal(burnState.game.enabled,false);
  assert.equal(burnState.game.productionApproved,false);assert.equal(burnState.game.probabilityModelAudited,false);
  await assert.rejects(x.routes.spin(request,body(x,burn)),/UNCERTIFIED_MATH_PROFILE/);
  const closed=await createNative72Batch01Binding(x.dependencies);assert.equal((await closed.state(request,M20_GAME_ID)).game.enabled,false);
  await assert.rejects(closed.spin(request,body(x)),/UNCERTIFIED_MATH_PROFILE/);await unchanged();
});
scenario('accepted policy: real X2 stays in the original ledger and Session TAKE WIN adds no credit',async t=>{
  const x=await bind();winningDraws(t,x);const wire=transport(x.routes),session=new Session({request:wire.request,storage:storage()});
  await session.connect();const parent=await session.spin('1.00');await session.finish();
  const won=await session.gamble('RED');assert.equal(won.won,true);
  assert.equal(BigInt(won.payout.replace('.','')),BigInt(parent.finalWin.replace('.',''))*2n);await session.finish();
  const before=await wallets(),beforeCounts=await counts(),posts=wire.posts.length;
  const fresh=await session.takeWin();assert.equal(fresh.balance,won.balanceAfter);assert.equal(wire.posts.length,posts);
  assert.deepEqual(await wallets(),before);assert.deepEqual(await counts(),beforeCounts);
  assert.equal(beforeCounts.actions,1);assert.equal(beforeCounts.gamble_bets,1);
});
scenario('accepted policy: failure after actual payout SQL rolls back debit, credit and round',async t=>{
  const x=await bind({failAfterWin:true});winningDraws(t,x);
  await assert.rejects(x.routes.spin(request,body(x)),/SIMULATED_FAILURE_AFTER_ACTUAL_WIN_SQL/);await unchanged();
});
scenario('accepted policy: reload after a committed response loss replays the saved original token once',async t=>{
  const x=await bind();winningDraws(t,x);const wire=transport(x.routes,{loseResponse:true}),saved=storage();
  const first=new Session({request:wire.request,storage:saved});await first.connect();
  await assert.rejects(first.spin('1.00'),/QA_COMMITTED_RESPONSE_LOST/);assert.ok(first.pending);
  const before=await wallets(),beforeCounts=await counts(),originalToken=wire.posts[0].body.roundToken;
  const next=new Session({request:wire.request,storage:saved});await next.connect();const receipt=await next.recover();await next.finish();
  assert.equal(wire.posts.length,2);assert.equal(wire.posts[1].body.roundToken,originalToken);assert.equal(wire.posts[1].body.replayOnly,true);
  assert.equal(receipt.roundId,(await pool.query('SELECT round_id FROM sw_nine.game_rounds WHERE request_key=$1',[originalToken])).rows[0].round_id);
  assert.deepEqual(await wallets(),before);assert.deepEqual(await counts(),beforeCounts);assert.equal(next.pending,null);
});
scenario('accepted policy: in-transaction auth, account capacity, house reserve and active ownership still reject before debit',async()=>{
  let revoke=true;
  const x=await bind({beforeTransaction:async()=>{if(revoke){revoke=false;await pool.query("UPDATE sw_rebuild.users SET status='suspended' WHERE id=$1",[uid])}}});
  await assert.rejects(x.routes.spin(request,body(x)),/ACTIVE_PLAYER_SESSION_REQUIRED/);await unchanged();
  await pool.query("UPDATE sw_rebuild.users SET status='active' WHERE id=$1",[uid]);
  await pool.query('INSERT INTO sw_rebuild.account_limits VALUES($1,10000)',[uid]);
  await assert.rejects(x.routes.spin(request,body(x)),/ACCOUNT_BALANCE_LIMIT/);await unchanged();
  await pool.query('DELETE FROM sw_rebuild.account_limits');await pool.query('UPDATE sw_rebuild.wallets SET balance=99 WHERE id=$1',[house]);
  await assert.rejects(x.routes.spin(request,body(x)),/HOUSE_RESERVE_INSUFFICIENT/);
  await pool.query('UPDATE sw_rebuild.wallets SET balance=10000000 WHERE id=$1',[house]);await unchanged();
  await pool.query("INSERT INTO sw_native_library.rounds(id,user_id,game_id,status) VALUES('qa-active',$1,'other-game','active')",[uid]);
  await assert.rejects(x.routes.spin(request,body(x)),/FINISH_ACTIVE_ROUND:other-game/);await unchanged();
});
