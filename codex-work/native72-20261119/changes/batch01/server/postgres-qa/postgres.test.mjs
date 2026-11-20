import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createFixture,uid,house,cookie,guard,hash,request,dataFor} from './existing-ledger.mjs';

// Refuse all inherited production URLs. Only run.mjs supplies this random local database.
const url=new URL(process.env.ZPLAY_PG_QA_URL??'postgresql://invalid/');
const database=process.env.ZPLAY_PG_QA_DATABASE;
assert.equal(process.env.ZPLAY_PG_QA_DISPOSABLE,'1','Use npm test to create a disposable local database');
assert.match(database??'',/^zplay_qa_[a-f0-9]{16}$/);
assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/'+database);
assert.equal(url.username,'zplay_qa');assert.ok(url.port);
const pool=new pg.Pool({connectionString:url.href,max:12});
const games=['fresh_multihot20','fresh_multihot5burnwilds'];
const body=(id=games[0],token=randomUUID())=>dataFor(id,token);
const wallets=async()=>Object.fromEntries((await pool.query('SELECT id,balance FROM sw_rebuild.wallets ORDER BY id')).rows.map(r=>[r.id,r.balance]));
async function counts(){
  const r=await pool.query(`SELECT
   (SELECT count(*)::int FROM sw_rebuild.transfers) transfers,
   (SELECT count(*)::int FROM sw_rebuild.ledger) ledger,
   (SELECT count(*)::int FROM sw_rebuild.rounds) rounds,
   (SELECT count(*)::int FROM sw_nine.wallet_transactions) audit,
   (SELECT count(*)::int FROM sw_nine.game_rounds) game_rounds`);
  return r.rows[0];
}
const empty={transfers:0,ledger:0,rounds:0,audit:0,game_rounds:0};
async function unchanged(){
  assert.deepEqual(await wallets(),{house:'10000000',[uid]:'10000'});
  assert.deepEqual(await counts(),empty);
}
before(async()=>{
  const r=await pool.query('SELECT current_database() db,version() version');
  assert.equal(r.rows[0].db,database);
  console.log('Disposable local PostgreSQL:',r.rows[0].version);
  await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
});
beforeEach(async()=>{
  // Only the random database created by our runner can reach this reset.
  await pool.query('TRUNCATE sw_rebuild.users,sw_rebuild.wallets,sw_rebuild.rounds,sw_native_library.rounds CASCADE');
  await pool.query("INSERT INTO sw_rebuild.users VALUES($1,'player','active')",[uid]);
  await pool.query('INSERT INTO sw_rebuild.wallets VALUES($1,10000),($2,10000000)',[uid,house]);
  await pool.query('INSERT INTO sw_rebuild.sessions VALUES($1,$2,$3)',[hash(cookie),uid,Date.now()+3600000]);
});
after(async()=>{await pool.end()});

for(const id of games){
  test(id+' settles exact cents through actual PostgreSQL debit, credit, audit and round SQL',async()=>{
    const x=createFixture(pool),d=body(id),r=await x.api(request,d);
    const win=BigInt(r.finalWin.replace('.',''));
    assert.ok(win>0n);assert.equal(r.walletReceipt.currency,'ETB');assert.equal(r.bet,d.bet);
    assert.deepEqual(await wallets(),{house:String(10000000n+100n-win),[uid]:String(10000n-100n+win)});
    assert.deepEqual(await counts(),{transfers:2,ledger:4,rounds:1,audit:2,game_rounds:1});
    const zero=(await pool.query('SELECT sum(delta)::text total FROM sw_rebuild.ledger')).rows[0].total;
    assert.equal(zero,'0');
    const audit=(await pool.query('SELECT type,amount,balance_after FROM sw_nine.wallet_transactions ORDER BY type')).rows;
    assert.deepEqual(audit,[{type:'BET',amount:'100',balance_after:'9900'},
      {type:'WIN',amount:String(win),balance_after:String(9900n+win)}]);
    assert.equal((await pool.query('SELECT outcome FROM sw_rebuild.rounds')).rows[0].outcome.roundId,r.roundId);
  });
  test(id+' eight concurrent same-token requests commit only one bet under real row locks',async()=>{
    const x=createFixture(pool),d=body(id);
    const receipts=await Promise.all(Array.from({length:8},()=>x.api(request,d)));
    for(const r of receipts)assert.deepEqual(r,receipts[0]);
    assert.ok(x.metrics().maxActiveTransactions>1,'independent PostgreSQL transactions really overlapped');
    assert.deepEqual(await counts(),{transfers:2,ledger:4,rounds:1,audit:2,game_rounds:1});
    assert.equal((await pool.query("SELECT count(*)::int n FROM sw_nine.wallet_transactions WHERE type='BET'")).rows[0].n,1);
  });
  test(id+' failure after actual payout SQL rolls back every table and both balances',async()=>{
    const x=createFixture(pool,{failAfterWin:true});
    await assert.rejects(()=>x.api(request,body(id)),/SIMULATED_FAILURE_AFTER_ACTUAL_WIN_SQL/);
    await unchanged();
  });
}

test('legacy round insert SQL error rolls back already-recorded game round and ledger',async()=>{
  await pool.query("CREATE FUNCTION sw_rebuild.qa_reject_round() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'QA_LEGACY_ROUND_INSERT_FAILURE'; END $$");
  await pool.query('CREATE TRIGGER qa_reject_round BEFORE INSERT ON sw_rebuild.rounds FOR EACH ROW EXECUTE FUNCTION sw_rebuild.qa_reject_round()');
  try{
    await assert.rejects(()=>createFixture(pool).api(request,body()),/QA_LEGACY_ROUND_INSERT_FAILURE/);
    await unchanged();
  }finally{
    await pool.query('DROP TRIGGER qa_reject_round ON sw_rebuild.rounds');
    await pool.query('DROP FUNCTION sw_rebuild.qa_reject_round()');
  }
});

test('missing cookie, expired or inactive Player and wrong guard make zero ledger writes',async()=>{
  const x=createFixture(pool);
  await assert.rejects(()=>x.api(new Request('https://qa.invalid/'),body()),/PLAYER_LOGIN_REQUIRED/);
  await assert.rejects(()=>x.api(request,{...body(),sessionGuard:'0'.repeat(64)}),/PLAYER_SESSION_CHANGED/);
  await pool.query('UPDATE sw_rebuild.sessions SET expires=0');
  await assert.rejects(()=>x.api(request,body()),/ACTIVE_PLAYER_SESSION_REQUIRED/);
  await pool.query('UPDATE sw_rebuild.sessions SET expires=$1',[Date.now()+3600000]);
  await pool.query("UPDATE sw_rebuild.users SET status='suspended'");
  await assert.rejects(()=>x.api(request,body()),/ACTIVE_PLAYER_SESSION_REQUIRED/);
  assert.equal(x.metrics().transactions,0);await unchanged();
});

test('transaction reauth rejects a session invalidated after first authentication',async()=>{
  const x=createFixture(pool,{afterFirstAuth:()=>pool.query("UPDATE sw_rebuild.users SET status='suspended' WHERE id=$1",[uid])});
  await assert.rejects(()=>x.api(request,body()),/ACTIVE_PLAYER_SESSION_REQUIRED/);
  assert.equal(x.metrics().transactions,1);await unchanged();
});

test('read-only replay survives profile outage and closed release without another debit',async()=>{
  const x=createFixture(pool),d=body(),r=await x.api(request,d);
  const savedWallets=await wallets(),savedCounts=await counts();
  x.setProfileOutage(true);x.setOperator(false);
  assert.deepEqual(await x.api(request,{...d,replayOnly:true}),r);
  await assert.rejects(()=>x.api(request,body()),/PROFILE_STORE_UNAVAILABLE/);
  assert.deepEqual(await wallets(),savedWallets);assert.deepEqual(await counts(),savedCounts);
});

test('unknown replay token returns 404 and never opens a new wager',async()=>{
  const x=createFixture(pool,{profileLookupFails:true});
  await assert.rejects(()=>x.api(request,{...body(),replayOnly:true}),e=>e.code==='ROUND_NOT_FOUND_FOR_REPLAY'&&e.status===404);
  await unchanged();
});

test('FoundationBet preflight and stale model never start a PostgreSQL transaction',async()=>{
  const x=createFixture(pool);
  await assert.rejects(()=>x.api(request,{...body(games[1]),bet:'1.05'}),/BET_OUTSIDE_WORKER_POLICY/);
  await assert.rejects(()=>x.api(request,{...body(),mathSha256:'0'.repeat(64)}),/PLAYER_MATH_VERSION_STALE/);
  assert.equal(x.metrics().transactions,0);await unchanged();
});

test('same token with a different stake rejects without modifying the original settlement',async()=>{
  const x=createFixture(pool),d=body();await x.api(request,d);
  const savedWallets=await wallets(),savedCounts=await counts();
  await assert.rejects(()=>x.api(request,{...d,bet:'2.00'}),/IDEMPOTENCY_PARAMETER_CONFLICT/);
  assert.deepEqual(await wallets(),savedWallets);assert.deepEqual(await counts(),savedCounts);
});

test('active existing library round prevents a new slot debit',async()=>{
  await pool.query("INSERT INTO sw_native_library.rounds(id,user_id,game_id,status) VALUES('qa-active',$1,'qa-existing-game','active')",[uid]);
  await assert.rejects(()=>createFixture(pool).api(request,body()),/FINISH_ACTIVE_ROUND:qa-existing-game/);
  await unchanged();
});

test('existing account balance limit rejects settlement before any debit',async()=>{
  await pool.query('INSERT INTO sw_rebuild.account_limits VALUES($1,10000)',[uid]);
  await assert.rejects(()=>createFixture(pool).api(request,body()),/ACCOUNT_BALANCE_LIMIT/);
  await unchanged();
});

test('insufficient Player funds, house reserve and release flag each prevent debit',async()=>{
  await pool.query('UPDATE sw_rebuild.wallets SET balance=10 WHERE id=$1',[uid]);
  await assert.rejects(()=>createFixture(pool).api(request,body()),/INSUFFICIENT_FUNDS/);
  assert.deepEqual(await counts(),empty);
  await pool.query('UPDATE sw_rebuild.wallets SET balance=10000 WHERE id=$1',[uid]);
  await pool.query('UPDATE sw_rebuild.wallets SET balance=100 WHERE id=$1',[house]);
  await assert.rejects(()=>createFixture(pool).api(request,body()),/HOUSE_RESERVE_INSUFFICIENT/);
  assert.deepEqual(await counts(),empty);
  await pool.query('UPDATE sw_rebuild.wallets SET balance=10000000 WHERE id=$1',[house]);
  await assert.rejects(()=>createFixture(pool,{accepting:false}).api(request,body()),/SLOT_RELEASE_NOT_ENABLED/);
  await unchanged();
});
