import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {JetXService} from '../service.mjs';
import {VERSION,reachesAt} from '../rules.mjs';
import {fixtureWalletClass} from './wallet-fixture.mjs';

const enabled=process.env.RUN_JETX_DB_TESTS==='1';
test('canonical PostgreSQL wallet, idempotency, ownership and concurrency',{skip:!enabled},async t=>{
 const url=process.env.JETX_TEST_DATABASE||'postgres://postgres:local-test-only@127.0.0.1:55439/jetx_test';
 const parsed=new URL(url);assert.equal(parsed.hostname,'127.0.0.1');assert.equal(parsed.port,'55439');assert.equal(parsed.pathname,'/jetx_test');
 const {default:postgres}=await import('postgres');
 const sql=postgres(url,{max:10,onnotice:()=>{}});
 const SharedWalletStore=await fixtureWalletClass();
 let now=1700000000000,draw=400;
 const shared=new SharedWalletStore(sql,{now:()=>now});
 try{
  // This database is a disposable loopback-only test container. Never use a
  // service DATABASE_URL, an existing project database or production accounts.
  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS sw_rebuild;
   CREATE TABLE IF NOT EXISTS sw_rebuild.users(id text PRIMARY KEY,role text NOT NULL,status text NOT NULL,parent_id text);
   CREATE TABLE IF NOT EXISTS sw_rebuild.wallets(id text PRIMARY KEY,balance bigint NOT NULL CHECK(balance>=0),credit_limit bigint NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS sw_rebuild.transfers(id text PRIMARY KEY,sender text NOT NULL,recipient text NOT NULL,amount bigint NOT NULL CHECK(amount>0),kind text,actor text,notes text);
   CREATE TABLE IF NOT EXISTS sw_rebuild.ledger(transfer_id text NOT NULL,wallet_id text NOT NULL,delta bigint NOT NULL,PRIMARY KEY(transfer_id,wallet_id));
   CREATE TABLE IF NOT EXISTS sw_rebuild.audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor text,event text,target text,details jsonb);
   CREATE TABLE IF NOT EXISTS sw_rebuild.account_limits(user_id text PRIMARY KEY,max_balance bigint);
   CREATE TABLE IF NOT EXISTS sw_rebuild.live_revisions(user_id text PRIMARY KEY,revision bigint NOT NULL);
   CREATE TABLE IF NOT EXISTS sw_rebuild.rounds(id text PRIMARY KEY,user_id text,game text,bet bigint,payout bigint,outcome jsonb);
   CREATE OR REPLACE FUNCTION sw_rebuild.sw_live_touch(text[]) RETURNS void LANGUAGE sql AS 'SELECT NULL::void';`);
  await shared.migrate();
  const service=new JetXService(shared,{now:()=>now,roundOptions:{draw:()=>draw},accepting:true});await service.migrate();
  const setup=async()=>{
   now=1700000000000;draw=400;
   await sql.unsafe('TRUNCATE sw_jetx_native.requests,sw_jetx_native.bets,sw_jetx_native.boards,sw_native_family.requests,sw_native_family.rounds,sw_rebuild.ledger,sw_rebuild.transfers,sw_rebuild.rounds,sw_rebuild.audit,sw_rebuild.account_limits,sw_rebuild.live_revisions,sw_rebuild.wallets,sw_rebuild.users CASCADE');
   await sql.unsafe("INSERT INTO sw_rebuild.users(id,role,status) VALUES('player-a','player','active'),('player-b','player','active'),('blocked','player','blocked'),('admin','admin','active')");
   await sql.unsafe("INSERT INTO sw_rebuild.wallets(id,balance) VALUES('player-a',1000000),('player-b',1000000),('blocked',1000000),('house',10000000000)");
   service.accepting=true;return service.state('player-a');
  };
  const body=(board,extra={})=>({request_id:randomUUID(),type:'bet',board_id:board.id,position:0,stake:'5.50',auto_cashout:'1.01',model_version:VERSION,...extra});
  const balance=async who=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[who]))[0].balance);
  const invariant=async()=>{
   assert.equal((await sql.unsafe('SELECT COALESCE(sum(delta),0)::text AS total FROM sw_rebuild.ledger'))[0].total,'0');
   assert.equal((await sql.unsafe('SELECT sum(balance)::text AS total FROM sw_rebuild.wallets'))[0].total,'10003000000');
   assert.equal((await sql.unsafe('SELECT count(*)::integer AS n FROM sw_rebuild.wallets WHERE balance<0'))[0].n,0);
  };
  await t.test('automatic cashout during disconnection matches observed 5.50×1.01 = 5.55',async()=>{
   const {board}=await setup();await service.action('player-a',body(board));assert.equal(await balance('player-a'),999450n);
   now=reachesAt(board.startsAt,101);await service.reconcile();assert.equal(await balance('player-a'),1000005n);
   await service.reconcile();assert.equal(await balance('player-a'),1000005n);await invariant();
   assert.equal((await sql.unsafe("SELECT game FROM sw_rebuild.rounds"))[0].game,'jetx_native');
  });
  await t.test('parallel identical requests debit once and return the saved receipt',async()=>{
   const {board}=await setup(),request=body(board);const responses=await Promise.all(Array.from({length:12},()=>service.action('player-a',request)));
   assert.equal(responses.filter(r=>r.replayed).length,11);assert.equal(await balance('player-a'),999450n);
   await assert.rejects(service.action('player-a',{...request,stake:'6.00'}),/REQUEST_ID_CONFLICT/);await invariant();
  });
  await t.test('all four panels have separate bets; duplicate and fifth positions fail atomically',async()=>{
   const {board}=await setup();await Promise.all([0,1,2,3].map(position=>service.action('player-a',body(board,{position}))));
   assert.equal(await balance('player-a'),997800n);
   await assert.rejects(service.action('player-a',body(board)),/BET_ALREADY_PLACED/);
   await assert.rejects(service.action('player-a',body(board,{position:4})),/INVALID_BET_POSITION/);
   now=reachesAt(board.startsAt,101);await service.reconcile();assert.equal(await balance('player-a'),1000020n);await invariant();
  });
  await t.test('accepted bet cancellation refunds exactly once and permits a new bet in that position',async()=>{
   const {board}=await setup();await service.action('player-a',body(board));
   const cancel=body(board,{type:'cancel',stake:undefined,auto_cashout:undefined});
   await service.action('player-a',cancel);await service.action('player-a',cancel);
   assert.equal(await balance('player-a'),1000000n);assert.equal((await sql.unsafe('SELECT count(*)::integer AS n FROM sw_rebuild.rounds'))[0].n,0);
   await service.action('player-a',body(board));assert.equal(await balance('player-a'),999450n);await invariant();
  });
  await t.test('manual cashout uses server time; client multiplier and cross-account actions fail',async()=>{
   const {board}=await setup();await service.action('player-a',body(board,{auto_cashout:null}));now=board.startsAt+49*150;
   const request=body(board,{type:'cashout',stake:undefined,auto_cashout:undefined});
   await assert.rejects(service.action('player-b',request),/BET_NOT_FOUND/);
   await assert.rejects(service.action('player-a',{...request,coefficient:100000}),/INVALID_JETX_REQUEST/);
   await service.action('player-a',request);assert.equal(await balance('player-a'),1000555n);await invariant();
  });
  await t.test('late cashout loses, stale board bets fail, and settled rounds cannot pay twice',async()=>{
   const {board}=await setup();await service.action('player-a',body(board,{auto_cashout:null}));now=board.startsAt+20000;
   const cashout=body(board,{type:'cashout',stake:undefined,auto_cashout:undefined});await service.action('player-a',cashout);await service.action('player-a',cashout);
   assert.equal(await balance('player-a'),999450n);
   now+=10000;await service.state('player-a');await assert.rejects(service.action('player-a',body(board)),/BETTING_CLOSED/);await invariant();
  });
  await t.test('pending liability from every panel is included in the account cap',async()=>{
   const {board}=await setup();await sql.unsafe("INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES('player-a',1000100)");
   await service.action('player-a',body(board,{stake:'5.00',auto_cashout:'1.20'}));
   await assert.rejects(service.action('player-a',body(board,{position:1,stake:'5.00',auto_cashout:'1.20'})),/POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT/);
   assert.equal(await balance('player-a'),999500n);await invariant();
  });
  await t.test('house capacity and account blocking roll back every wallet and game write',async()=>{
   const {board}=await setup();await sql.unsafe("UPDATE sw_rebuild.wallets SET balance=1 WHERE id='house'");
   await assert.rejects(service.action('player-a',body(board,{auto_cashout:null})),/BANKROLL_CAPACITY_UNAVAILABLE/);
   assert.equal(await balance('player-a'),1000000n);
   assert.equal((await sql.unsafe('SELECT count(*)::integer AS n FROM sw_jetx_native.bets'))[0].n,0);
   await assert.rejects(service.action('blocked',body(board)),/ACCOUNT_BLOCKED/);await assert.rejects(service.state('admin'),/PLAYER_REQUIRED/);
  });
  await t.test('blocking an account after acceptance does not prevent a due payout',async()=>{
   const {board}=await setup();await service.action('player-a',body(board));await sql.unsafe("UPDATE sw_rebuild.users SET status='blocked' WHERE id='player-a'");
   now=reachesAt(board.startsAt,101);await service.reconcile();assert.equal(await balance('player-a'),1000005n);await invariant();
  });
  await t.test('rollback preserves all legacy family rows and unrelated accounts',async()=>{
   const {board}=await setup();await sql.unsafe("INSERT INTO sw_native_family.rounds(id,user_id,game_id,game_config,state,secret_seed,commitment,reserve_wallet,liability,status,version,expires_at) VALUES($1,'player-a','legacy-game','{}','{}',$2,$2,'house',1,'active',0,$3)",[randomUUID(),'a'.repeat(64),now+60000]);
   await assert.rejects(service.action('player-a',body(board)),/FINISH_EXISTING_ACTIVE_ROUND/);assert.equal(await balance('player-b'),1000000n);
   assert.equal((await sql.unsafe('SELECT game_id FROM sw_native_family.rounds'))[0].game_id,'legacy-game');await invariant();
  });
  await t.test('concurrent timer scheduling keeps the earliest payout and settles without a client request',async()=>{
   const {board}=await setup();let latest;
   const timed=new JetXService(shared,{now:()=>now,roundOptions:{draw:()=>400},accepting:true,autoTimers:true,setTimer:(fn,ms)=>(latest={fn,ms,unref(){}}),clearTimer:()=>{}});await timed.migrate();
   await Promise.all([timed.action('player-a',body(board,{auto_cashout:'2.00'})),timed.action('player-a',body(board,{position:1,auto_cashout:'1.01'}))]);
   await timed.schedule('player-a');assert.equal(latest.ms,reachesAt(board.startsAt,101)-now+2);
   now=reachesAt(board.startsAt,101)+2;await latest.fn();assert.equal(await balance('player-a'),999455n);
   now=reachesAt(board.startsAt,200)+2;await latest.fn();assert.equal(await balance('player-a'),1000555n);assert.equal(timed.timers.size,0);await invariant();
  });
  await t.test('public player rows mask other identities, while chat enforces server rate limits and idempotency',async()=>{
   const {board}=await setup();await service.action('player-b',body(board));
   const view=await service.state('player-a');assert.equal(view.publicPlayers.length,1);assert.notEqual(view.publicPlayers[0].id,'player-b');assert.match(view.publicPlayers[0].name,/^Player [a-f0-9]{8}$/);
   const message={requestId:randomUUID(),message:'local fixture <text>'};await service.chat('player-a','0',message);await service.chat('player-a','0',message);
   const chat=await service.chat('player-b');assert.equal(chat[1].length,1);assert.equal(chat[1][0].Message,message.message);
   await assert.rejects(service.chat('player-a','0',{requestId:randomUUID(),message:'second message'}),/CHAT_RATE_LIMIT/);
   await assert.rejects(service.chat('player-a','0',{...message,message:'changed'}),/REQUEST_ID_CONFLICT/);await invariant();
  });
 }finally{await sql.end({timeout:1});}
});
