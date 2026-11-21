// Real PostgreSQL X2 acceptance. All invented records and approvals belong only
// to the disposable database initialized by the runner's first test suite.
import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
import {createFixture,uid,house,cookie,guard,hash,request} from './existing-ledger.mjs';
import {createIndependentRegistry} from '../independent-registry.mjs';
import {createExistingServerRoutes} from '../existing-server-routes.mjs';
import {evaluateCapturedMath,asETB} from '../official-math.mjs';

const url=new URL(process.env.ZPLAY_PG_QA_URL??'postgresql://invalid/');
const database=process.env.ZPLAY_PG_QA_DATABASE;
assert.equal(process.env.ZPLAY_PG_QA_DISPOSABLE,'1');assert.match(database??'',/^zplay_qa_[a-f0-9]{16}$/);
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/'+database);assert.equal(url.username,'zplay_qa');assert.ok(url.port);
const pool=new pg.Pool({connectionString:url.href,max:12});
const artifactBytes=await readFile(new URL('../independent-operator-audit.json',import.meta.url));
const artifact=JSON.parse(artifactBytes);
const registry=createIndependentRegistry({artifactBytes,evaluatorBytes:await readFile(new URL('../official-math.mjs',import.meta.url)),
  expectedArtifactSha256:createHash('sha256').update(artifactBytes).digest('hex')});
const games=['fresh_multihot20','fresh_multihot5burnwilds'];
before(async()=>{
  const r=await pool.query("SELECT current_database() db,to_regclass('sw_nine.actions') registered");
  assert.equal(r.rows[0].db,database);assert.equal(r.rows[0].registered,'sw_nine.actions','Run after the schema-initializing suite');
});
beforeEach(async()=>{
  await pool.query('TRUNCATE sw_rebuild.users,sw_rebuild.wallets,sw_rebuild.rounds,sw_native_library.rounds CASCADE');
  await pool.query("INSERT INTO sw_rebuild.users VALUES($1,'player','active')",[uid]);
  await pool.query('INSERT INTO sw_rebuild.wallets VALUES($1,10000),($2,10000000)',[uid,house]);
  await pool.query('INSERT INTO sw_rebuild.sessions VALUES($1,$2,$3)',[hash(cookie),uid,Date.now()+3600000]);
});
after(async()=>{await pool.end()});
const wallets=async()=>Object.fromEntries((await pool.query('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id')).rows.map(r=>[r.id,r.balance]));
const actionCount=async()=>(await pool.query('SELECT count(*)::int n FROM sw_nine.actions')).rows[0].n;
const gambleCounts=async()=>(await pool.query("SELECT type,count(*)::int n FROM sw_nine.wallet_transactions WHERE type LIKE 'GAMBLE_%' GROUP BY type ORDER BY type")).rows;
const smallStops=new Map();
function lowWinStops(gameId){
  if(smallStops.has(gameId))return smallStops.get(gameId);
  const strips=registry.profileForGame(gameId).reelStrips,total=strips.reduce((n,s)=>n*s.length,1);
  for(let i=0;i<total;i++){
    let cursor=i;const stops=strips.map(strip=>{const stop=cursor%strip.length;cursor=Math.floor(cursor/strip.length);return stop});
    const grid=Array.from({length:3},(_,row)=>stops.map((stop,column)=>strips[column][(stop+row-1+strips[column].length)%strips[column].length]));
    const win=evaluateCapturedMath({gameId,grid,bet:'1.00',wheelMultiplier:1}).finalWinCents;
    if(win>0n&&win<=100n){smallStops.set(gameId,stops);return stops}
  }
  throw Error('QA_SMALL_WIN_NOT_FOUND');
}
function binding(){
  const fixture=createFixture(pool);let profileOutage=false,release=true,draw=0,failWin=false;
  const profileForGame=async gameId=>{
    if(profileOutage)throw Error('QA_PROFILE_STORE_UNAVAILABLE');
    return {...structuredClone(registry.profileForGame(gameId)),productionApproved:true,probabilityModelAudited:true,
      auditReference:'QA_ONLY_GAMBLE_DISPOSABLE_DATABASE_NOT_PRODUCTION'};
  };
  const originalMove=fixture.dependencies.move;
  const routes=createExistingServerRoutes({...fixture.dependencies,profileForGame,cash:asETB,
    sessionGuard:()=>guard,accepting:()=>release,
    publicGames:()=>games.map(id=>({id,freshReleaseReady:release,betLevels:['1.00','2.00']})),
    drawIndex:bound=>{assert.equal(bound,2);return draw},
    move:async(...args)=>{await originalMove(...args);if(failWin&&args[4]==='GAMBLE_WIN')throw Error('QA_FAILURE_AFTER_REAL_GAMBLE_WIN_SQL')}
  });
  return {routes,fixture,setDraw:value=>{draw=value},setOutage:value=>{profileOutage=value},
    closeRelease:()=>{release=false},failWinningMove:()=>{failWin=true}};
}
async function seed(t,binding,gameId,{maximum=false}={}){
  const p=registry.profileForGame(gameId);
  const stops=maximum?artifact.results[gameId].audit.enumeration.perWheel[4].maximumWitness.stops:lowWinStops(gameId);
  const draws=[...stops,maximum?p.wheelWeights.slice(0,4).reduce((a,b)=>a+b,0):0];
  t.mock.method(globalThis.crypto,'getRandomValues',array=>{array.fill(0);array[0]=draws.shift()??0;return array});
  const r=await binding.routes.spin(request,{gameId,bet:'1.00',roundToken:randomUUID(),sessionGuard:guard,
    mathVersion:p.mathVersion,engineVersion:p.engineVersion,mathSha256:p.mathSha256});
  assert.ok(BigInt(r.finalWin.replace('.',''))>0n);assert.equal(draws.length,0);
  if(!maximum)assert.ok(BigInt(r.finalWin.replace('.',''))<=100n);
  return r;
}
const body=(receipt,{choice='RED',attempt=1,stake=receipt.finalWin,token=randomUUID()}={})=>({
  gameId:receipt.gameId,roundId:receipt.roundId,roundToken:token,sessionGuard:guard,
  mathVersion:receipt.mathVersion,engineVersion:receipt.engineVersion,mathSha256:receipt.mathSha256,
  choice,expectedAttempt:attempt,expectedStake:stake});
function exactReceipt(r){
  const w=r.walletReceipt,minor=value=>BigInt(value.replace('.',''));
  assert.equal(w.chargedStake,r.stake);assert.equal(w.finalWin,r.payout);
  assert.equal(minor(w.balanceBefore)-minor(w.chargedStake)+minor(w.finalWin),minor(w.balanceAfter));
  assert.equal(r.balanceAfter,w.balanceAfter);assert.equal(r.providerRngReproduced,false);
}

for(const gameId of games){
  test(gameId+' fair RED/BLACK results double or lose the exact existing-ledger stake and update state',async t=>{
    const x=binding(),parent=await seed(t,x,gameId);
    let r=await x.routes.gamble(request,body(parent));exactReceipt(r);assert.equal(r.color,'RED');assert.equal(r.won,true);
    assert.equal(BigInt(r.payout.replace('.','')),2n*BigInt(parent.finalWin.replace('.','')));
    x.setDraw(1);
    r=await x.routes.gamble(request,body(parent,{choice:'BLACK',attempt:2,stake:r.payout}));exactReceipt(r);assert.equal(r.color,'BLACK');assert.equal(r.won,true);
    r=await x.routes.gamble(request,body(parent,{choice:'RED',attempt:3,stake:r.payout}));exactReceipt(r);assert.equal(r.won,false);assert.equal(r.payout,'0.00');
    assert.equal(await actionCount(),3);
    assert.deepEqual(await gambleCounts(),[{type:'GAMBLE_BET',n:3},{type:'GAMBLE_WIN',n:2}]);
    const state=await x.routes.state(request,gameId);
    assert.equal(state.balance,r.balanceAfter);assert.equal(state.round.gamble.attempt,3);
    assert.equal(state.round.gamble.stake,'0.00');assert.equal(state.round.gamble.available,false);
    assert.equal(state.round.gamble.reason,'NO_GAMBLE_WINNINGS');assert.equal(state.round.gamble.lastResult.actionId,r.actionId);
    const transferKinds=(await pool.query("SELECT kind,count(*)::int n FROM sw_rebuild.transfers WHERE kind LIKE 'gamble_%' GROUP BY kind ORDER BY kind")).rows;
    assert.deepEqual(transferKinds,[{kind:'gamble_bet',n:3},{kind:'gamble_win',n:2}]);
  });

  test(gameId+' eight concurrent same-action tokens replay one gamble debit and parameter changes conflict',async t=>{
    const x=binding(),parent=await seed(t,x,gameId),input=body(parent);
    const results=await Promise.all(Array.from({length:8},()=>x.routes.gamble(request,input)));
    for(const r of results)assert.deepEqual(r,results[0]);assert.ok(x.fixture.metrics().maxActiveTransactions>1);
    assert.equal(await actionCount(),1);assert.deepEqual(await gambleCounts(),[{type:'GAMBLE_BET',n:1},{type:'GAMBLE_WIN',n:1}]);
    const balance=await wallets();
    await assert.rejects(()=>x.routes.gamble(request,{...input,choice:'BLACK'}),/IDEMPOTENCY_PARAMETER_CONFLICT/);
    assert.deepEqual(await wallets(),balance);assert.equal(await actionCount(),1);
  });

  test(gameId+' concurrent different action tokens at the same expected attempt mutate only once',async t=>{
    const x=binding(),parent=await seed(t,x,gameId);
    const results=await Promise.allSettled(Array.from({length:8},()=>x.routes.gamble(request,body(parent))));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const rejected=results.filter(r=>r.status==='rejected');assert.equal(rejected.length,7);
    for(const r of rejected)assert.equal(r.reason.code,'GAMBLE_STATE_CHANGED');
    assert.equal(await actionCount(),1);assert.deepEqual(await gambleCounts(),[{type:'GAMBLE_BET',n:1},{type:'GAMBLE_WIN',n:1}]);
  });

  test(gameId+' persisted action replays through profile failure and closed release without another debit',async t=>{
    const x=binding(),parent=await seed(t,x,gameId),input=body(parent),result=await x.routes.gamble(request,input);
    const before=await wallets();x.setOutage(true);x.closeRelease();x.fixture.setOperator(false);
    assert.deepEqual(await x.routes.gamble(request,{...input,replayOnly:true}),result);
    await assert.rejects(()=>x.routes.gamble(request,{...input,roundToken:randomUUID(),replayOnly:true}),e=>e.code==='ROUND_NOT_FOUND_FOR_REPLAY'&&e.status===404);
    assert.deepEqual(await wallets(),before);assert.equal(await actionCount(),1);
  });

  test(gameId+' failure after actual gamble payout SQL rolls back both transfers and the action',async t=>{
    const x=binding(),parent=await seed(t,x,gameId),before=await wallets();x.failWinningMove();
    await assert.rejects(()=>x.routes.gamble(request,body(parent)),/QA_FAILURE_AFTER_REAL_GAMBLE_WIN_SQL/);
    assert.deepEqual(await wallets(),before);assert.equal(await actionCount(),0);assert.deepEqual(await gambleCounts(),[]);
  });

  test(gameId+' active game, account cap, expiry and newer legacy round each block X2 without writes',async t=>{
    const x=binding(),parent=await seed(t,x,gameId),before=await wallets(),input=body(parent);
    await pool.query("INSERT INTO sw_native_library.rounds(id,user_id,game_id,status) VALUES('qa-active',$1,'other-game','active')",[uid]);
    await assert.rejects(()=>x.routes.gamble(request,input),/FINISH_ACTIVE_ROUND:other-game/);
    await pool.query('DELETE FROM sw_native_library.rounds');
    await pool.query('INSERT INTO sw_rebuild.account_limits VALUES($1,$2)',[uid,before[uid]]);
    await assert.rejects(()=>x.routes.gamble(request,input),/ACCOUNT_BALANCE_LIMIT/);
    await pool.query('DELETE FROM sw_rebuild.account_limits');
    await pool.query("UPDATE sw_nine.game_rounds SET created_at=now()-interval '11 minutes' WHERE round_id=$1",[parent.roundId]);
    await assert.rejects(()=>x.routes.gamble(request,input),/GAMBLE_EXPIRED/);
    await pool.query('UPDATE sw_nine.game_rounds SET created_at=now() WHERE round_id=$1',[parent.roundId]);
    await pool.query("INSERT INTO sw_rebuild.rounds(id,user_id,game,bet,payout,outcome) VALUES('qa-newer',$1,'other-game',0,0,'{}')",[uid]);
    await assert.rejects(()=>x.routes.gamble(request,input),/GAMBLE_EXPIRED/);
    assert.deepEqual(await wallets(),before);assert.equal(await actionCount(),0);assert.deepEqual(await gambleCounts(),[]);
  });

  test(gameId+' five-attempt limit and explicit 500 ETB maximum stake are enforced',async t=>{
    const x=binding(),parent=await seed(t,x,gameId);let stake=parent.finalWin;
    for(let attempt=1;attempt<=5;attempt++){
      const r=await x.routes.gamble(request,body(parent,{attempt,stake}));exactReceipt(r);assert.equal(r.attempt,attempt);stake=r.payout;
    }
    await assert.rejects(()=>x.routes.gamble(request,body(parent,{attempt:6,stake})),/GAMBLE_LIMIT/);
    assert.equal((await x.routes.state(request,gameId)).round.gamble.reason,'GAMBLE_LIMIT');
    const large=await seed(t,x,gameId,{maximum:true}),before=await wallets();
    assert.ok(BigInt(large.finalWin.replace('.',''))>50000n);
    await assert.rejects(()=>x.routes.gamble(request,body(large)),/GAMBLE_STAKE_LIMIT/);
    assert.deepEqual(await wallets(),before);assert.equal(await actionCount(),5);
  });

  test(gameId+' action insert failure rolls back real gamble debit and credit together',async t=>{
    const x=binding(),parent=await seed(t,x,gameId),before=await wallets();
    await pool.query("CREATE FUNCTION sw_nine.qa_reject_action() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'QA_ACTION_INSERT_FAILURE'; END $$");
    await pool.query('CREATE TRIGGER qa_reject_action BEFORE INSERT ON sw_nine.actions FOR EACH ROW EXECUTE FUNCTION sw_nine.qa_reject_action()');
    try{
      await assert.rejects(()=>x.routes.gamble(request,body(parent)),/QA_ACTION_INSERT_FAILURE/);
      assert.deepEqual(await wallets(),before);assert.equal(await actionCount(),0);assert.deepEqual(await gambleCounts(),[]);
    }finally{
      await pool.query('DROP TRIGGER qa_reject_action ON sw_nine.actions');await pool.query('DROP FUNCTION sw_nine.qa_reject_action()');
    }
  });
}
