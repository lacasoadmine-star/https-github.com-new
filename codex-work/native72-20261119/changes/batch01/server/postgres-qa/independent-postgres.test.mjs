// Existing Session classes -> additive existing-server route hooks -> real PG.
// Run after postgres.test.mjs in the same runner-owned disposable database.
import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
import {createFixture,uid,house,cookie,guard,hash,request} from './existing-ledger.mjs';
import {createExistingServerRoutes} from '../existing-server-routes.mjs';
import {createIndependentRegistry} from '../independent-registry.mjs';
import {asETB,evaluateCapturedMath} from '../official-math.mjs';
import {Session as M20Session} from '../../multihot20/session.mjs';
import {Session as BurnSession} from '../../multihot5burnwilds/session.mjs';

const url=new URL(process.env.ZPLAY_PG_QA_URL??'postgresql://invalid/');
const database=process.env.ZPLAY_PG_QA_DATABASE;
assert.equal(process.env.ZPLAY_PG_QA_DISPOSABLE,'1','Use the disposable PostgreSQL runner');
assert.match(database??'',/^zplay_qa_[a-f0-9]{16}$/);assert.equal(url.hostname,'127.0.0.1');
assert.equal(url.pathname,'/'+database);assert.equal(url.username,'zplay_qa');assert.ok(url.port);
const pool=new pg.Pool({connectionString:url.href,max:12});
const artifactBytes=await readFile(new URL('../independent-operator-audit.json',import.meta.url));
const evaluatorBytes=await readFile(new URL('../official-math.mjs',import.meta.url));
const registry=createIndependentRegistry({artifactBytes,evaluatorBytes,
  expectedArtifactSha256:createHash('sha256').update(artifactBytes).digest('hex')});
const variants=[['fresh_multihot20',M20Session],['fresh_multihot5burnwilds',BurnSession]];

before(async()=>{
  const r=await pool.query("SELECT current_database() db,to_regclass('sw_nine.game_rounds') registered");
  assert.equal(r.rows[0].db,database);assert.equal(r.rows[0].registered,'sw_nine.game_rounds','The runner must initialize its QA schema with postgres.test.mjs first');
});
beforeEach(async()=>{
  await pool.query('TRUNCATE sw_rebuild.users,sw_rebuild.wallets,sw_rebuild.rounds,sw_native_library.rounds CASCADE');
  await pool.query("INSERT INTO sw_rebuild.users VALUES($1,'player','active')",[uid]);
  await pool.query('INSERT INTO sw_rebuild.wallets VALUES($1,10000),($2,10000000)',[uid,house]);
  await pool.query('INSERT INTO sw_rebuild.sessions VALUES($1,$2,$3)',[hash(cookie),uid,Date.now()+3600000]);
});
after(async()=>{await pool.end()});
const deterministicWin=t=>t.mock.method(globalThis.crypto,'getRandomValues',array=>{array.fill(0);return array});
const wallets=async()=>Object.fromEntries((await pool.query('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id')).rows.map(r=>[r.id,r.balance]));
async function ledgerCounts(){
  return (await pool.query(`SELECT
    (SELECT count(*)::int FROM sw_rebuild.transfers) transfers,
    (SELECT count(*)::int FROM sw_rebuild.ledger) ledger,
    (SELECT count(*)::int FROM sw_rebuild.rounds) rounds,
    (SELECT count(*)::int FROM sw_nine.wallet_transactions WHERE type='BET') bets,
    (SELECT count(*)::int FROM sw_nine.game_rounds) results`)).rows[0];
}
async function unchanged(){
  assert.deepEqual(await wallets(),{house:'10000000',[uid]:'10000'});
  assert.deepEqual(await ledgerCounts(),{transfers:0,ledger:0,rounds:0,bets:0,results:0});
}
function bindRoutes({approved=true,failAfterWin=false}={}){
  const fixture=createFixture(pool,{failAfterWin});let outage=false;
  // Only this disposable fixture receives an explicitly approved QA COPY.
  // Registry candidates, artifact bytes and all production flags remain false.
  const profileForGame=async gameId=>{
    if(outage)throw Error('QA_PROFILE_STORE_UNAVAILABLE');
    const profile=structuredClone(registry.profileForGame(gameId));
    return approved?{...profile,productionApproved:true,probabilityModelAudited:true,
      auditReference:'QA_ONLY_DISPOSABLE_POSTGRES_NOT_A_PRODUCTION_APPROVAL'}:profile;
  };
  const routes=createExistingServerRoutes({...fixture.dependencies,
    profileForGame,cash:asETB,sessionGuard:()=>guard,
    publicGames:()=>variants.map(([id])=>({id,freshReleaseReady:true,betLevels:['1.00','1.05','1.10','1.20','2.00','40000.00']}))});
  return {fixture,routes,setOutage:value=>{outage=value}};
}
function clientTransport(routes,{dropFirstResponse=false,dropBeforeFirstRequest=false}={}){
  const attempts=[],serverAttempts=[];let dropped=false;
  return {attempts,serverAttempts,request:async(path,body)=>{
    const target=new URL(path,'https://qa.invalid');
    const req=new Request(target,{method:body?'POST':'GET',headers:{cookie:'sw_session='+cookie}});
    if(target.pathname==='/api/slots/fresh-state')return routes.state(req,target.searchParams.get('gameId'));
    assert.equal(target.pathname,'/api/slots/spin');attempts.push(structuredClone(body));
    if(dropBeforeFirstRequest&&!dropped){dropped=true;throw Object.assign(new Error('QA_REQUEST_LOST_BEFORE_SERVER'),{status:503,code:'QA_REQUEST_LOST_BEFORE_SERVER'})}
    serverAttempts.push(structuredClone(body));
    const response=await routes.spin(req,body);
    if(dropFirstResponse&&!dropped){dropped=true;throw Object.assign(new Error('QA_LOST_COMMITTED_RESPONSE'),{status:503,code:'QA_LOST_COMMITTED_RESPONSE'})}
    return response;
  }};
}
function storage(){const entries=new Map();return{getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)}}
const spinBody=gameId=>{
  const p=registry.profileForGame(gameId);
  return {gameId,bet:'1.00',roundToken:randomUUID(),sessionGuard:guard,
    mathVersion:p.mathVersion,engineVersion:p.engineVersion,mathSha256:p.mathSha256};
};

for(const [gameId,Session] of variants){
  test(gameId+' real Session sees the hash-loaded candidate as unavailable without a debit',async()=>{
    const {routes}=bindRoutes({approved:false}),transport=clientTransport(routes);
    const session=new Session({request:transport.request,storage:storage()});
    const state=await session.connect();
    assert.equal(state.game.mathSha256,registry.profileForGame(gameId).mathSha256);
    assert.equal(state.game.productionApproved,false);assert.equal(state.game.enabled,false);
    assert.equal(session.phase,'UNAVAILABLE');
    await assert.rejects(()=>session.spin('1.00'),/ROUND_NOT_READY/);
    assert.equal(transport.attempts.length,0);await unchanged();
  });

  test(gameId+' real Session connects, spins and refreshes exact PostgreSQL settlement through existing routes',async t=>{
    deterministicWin(t);
    const {routes}=bindRoutes(),transport=clientTransport(routes);
    const session=new Session({request:transport.request,storage:storage()});
    assert.equal((await session.connect()).balance,'100.00');assert.equal(session.phase,'READY');
    const receipt=await session.spin('1.00');assert.equal(session.phase,'SHOWING_RESULT');
    const win=BigInt(receipt.finalWin.replace('.',''));assert.ok(win>0n,'the deterministic candidate stops must actually win');
    const independentlyEvaluated=evaluateCapturedMath({gameId,grid:receipt.initialGrid,bet:receipt.bet,wheelMultiplier:receipt.wheelMultiplier});
    assert.equal(receipt.finalWin,independentlyEvaluated.finalWin);
    assert.equal(receipt.mathSha256,registry.profileForGame(gameId).mathSha256);
    assert.equal(receipt.providerRngReproduced,false);assert.equal(receipt.providerCertified,false);
    assert.deepEqual(await wallets(),{house:String(10000000n+100n-win),[uid]:String(9900n+win)});
    const state=await session.finish();assert.equal(session.phase,'READY');
    assert.equal(state.balance,asETB(9900n+win));assert.equal(state.round.result.roundId,receipt.roundId);
    assert.equal(session.pending,null);assert.equal(transport.attempts.length,1);
    assert.deepEqual(await ledgerCounts(),{transfers:2,ledger:4,rounds:1,bets:1,results:1});
  });

  test(gameId+' eight overlapping route submissions with the candidate hash commit one BET',async t=>{
    deterministicWin(t);
    const {routes,fixture}=bindRoutes(),body=spinBody(gameId);
    const receipts=await Promise.all(Array.from({length:8},()=>routes.spin(request,body)));
    for(const receipt of receipts)assert.deepEqual(receipt,receipts[0]);
    assert.ok(fixture.metrics().maxActiveTransactions>1,'real PostgreSQL transactions overlapped');
    assert.deepEqual(await ledgerCounts(),{transfers:2,ledger:4,rounds:1,bets:1,results:1});
  });

  test(gameId+' a true winning candidate payout failure rolls back the whole PostgreSQL transaction',async t=>{
    deterministicWin(t);
    const {routes}=bindRoutes({failAfterWin:true});
    await assert.rejects(()=>routes.spin(request,spinBody(gameId)),/SIMULATED_FAILURE_AFTER_ACTUAL_WIN_SQL/);
    await unchanged();
  });

  test(gameId+' refresh after a lost committed response replays the saved token through profile outage',async t=>{
    deterministicWin(t);
    const binding=bindRoutes(),transport=clientTransport(binding.routes,{dropFirstResponse:true}),saved=storage();
    const first=new Session({request:transport.request,storage:saved});await first.connect();
    await assert.rejects(()=>first.spin('1.00'),/QA_LOST_COMMITTED_RESPONSE/);
    assert.equal(first.phase,'WAITING_FOR_RESULT');
    const committedWallets=await wallets(),committedCounts=await ledgerCounts();
    const reloaded=new Session({request:transport.request,storage:saved});
    await reloaded.connect();assert.equal(reloaded.phase,'WAITING_FOR_RESULT');
    binding.setOutage(true);
    const receipt=await reloaded.recover();assert.equal(reloaded.phase,'SHOWING_RESULT');
    assert.equal(transport.attempts.length,2);
    assert.equal(transport.attempts[0].roundToken,transport.attempts[1].roundToken);
    assert.equal(transport.attempts[1].replayOnly,true);
    assert.equal(receipt.mathSha256,registry.profileForGame(gameId).mathSha256);
    assert.deepEqual(await wallets(),committedWallets);assert.deepEqual(await ledgerCounts(),committedCounts);
    binding.setOutage(false);await reloaded.finish();assert.equal(reloaded.phase,'READY');
    assert.equal(reloaded.pending,null);
  });

  test(gameId+' request lost before the server recovers the original token after exact replay-not-found',async t=>{
    deterministicWin(t);
    const binding=bindRoutes(),transport=clientTransport(binding.routes,{dropBeforeFirstRequest:true}),saved=storage();
    const first=new Session({request:transport.request,storage:saved});await first.connect();
    await assert.rejects(()=>first.spin('1.00'),/QA_REQUEST_LOST_BEFORE_SERVER/);
    assert.equal(first.phase,'WAITING_FOR_RESULT');assert.ok(first.pending);
    assert.equal(transport.serverAttempts.length,0);await unchanged();
    const original=structuredClone(transport.attempts[0]);
    const reloaded=new Session({request:transport.request,storage:saved});
    await reloaded.connect();assert.equal(reloaded.phase,'WAITING_FOR_RESULT');
    const receipt=await reloaded.recover();
    assert.equal(reloaded.phase,'SHOWING_RESULT');assert.equal(reloaded.pending,null);
    assert.equal(transport.attempts.length,3,'lost original, lookup-only replay, then exact original retry');
    assert.equal(transport.serverAttempts.length,2,'only the not-found lookup and one original-token wager reach the server');
    assert.equal(transport.serverAttempts[0].replayOnly,true);
    assert.notEqual(transport.serverAttempts[1].replayOnly,true);
    for(const attempt of transport.attempts)for(const key of ['roundToken','gameId','bet','sessionGuard','mathVersion','engineVersion','mathSha256'])assert.equal(attempt[key],original[key]);
    const win=BigInt(receipt.finalWin.replace('.',''));assert.ok(win>0n);
    assert.deepEqual(await ledgerCounts(),{transfers:2,ledger:4,rounds:1,bets:1,results:1});
    assert.deepEqual(await wallets(),{house:String(10000000n+100n-win),[uid]:String(9900n+win)});
    const fresh=await reloaded.finish();assert.equal(reloaded.phase,'READY');assert.equal(fresh.balance,asETB(9900n+win));
    assert.equal(reloaded.pending,null);assert.equal(transport.attempts.length,3);
  });
}
