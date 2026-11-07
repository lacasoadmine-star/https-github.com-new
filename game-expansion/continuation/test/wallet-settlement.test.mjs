import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {LibraryService,createRegistry} from '../backend-baseline/library-service.mjs';
import {JetXService} from '../backend-baseline/jetx-service.mjs';
import {VERSION as jetxVersion} from '../backend-baseline/jetx-rules.mjs';
import {installCrossActiveGuards} from '../backend-baseline/library-backend.mjs';
import * as balloon from '../backend-baseline/balloon-rules.mjs';
import {isolatedDraftAdapters,ordinaryStake,cash} from './isolated-draft-fixture.mjs';

const registry=createRegistry([balloon,...isolatedDraftAdapters()]);
const newIds=Object.keys(registry.definitions()).filter(id=>id!=='balloon_native');

// The fixture uses PostgreSQL in memory. It never reads a database URL or opens
// a service connection. Only the test copy exports the existing wallet class.
async function walletFixture(){
 const source=await readFile(new URL('../backend-baseline/native-family-preserved.mjs',import.meta.url),'utf8');
 const manifest=JSON.parse(await readFile(new URL('../evidence/backend-baseline-manifest.json',import.meta.url),'utf8'));
 assert.equal(createHash('sha256').update(source).digest('hex'),manifest['native-family-preserved.mjs']);
 const directory=await mkdtemp(join(tmpdir(),'zplay-wallet-settlement-'));
 const filename=join(directory,'wallet.mjs');
 await writeFile(filename,source+'\nexport {q as SharedWalletStore};\n');
 const previous=globalThis.Bun;
 globalThis.Bun={SQL:class{constructor(){throw new Error('TEST_FIXTURE_REJECTED_SERVICE_DATABASE');}}};
 try{return {SharedWalletStore:(await import(pathToFileURL(filename))).SharedWalletStore,directory};}
 finally{if(previous===undefined)delete globalThis.Bun;else globalThis.Bun=previous;}
}

function sqlAdapter(db){
 return {
  async unsafe(statement,parameters=[]){
   if(parameters.length)return (await db.query(statement,parameters)).rows;
   const results=await db.exec(statement);return results.at(-1)?.rows??[];
  },
  begin:callback=>db.transaction(transaction=>callback(sqlAdapter(transaction)))
 };
}

test('new game settlement uses the unchanged canonical wallet and real isolated PostgreSQL',async t=>{
 const db=await PGlite.create();
 const sql=sqlAdapter(db),{SharedWalletStore,directory}=await walletFixture();
 let now=1700000000000,roundSequence=1;
 const shared=new SharedWalletStore(sql,{now:()=>now});
 const service=new LibraryService(shared,{registry,now:()=>now,id:()=>`00000000-0000-4000-8000-${String(++roundSequence).padStart(12,'0')}`,seed:()=>createHash('sha256').update('isolated-zplay-financial-fixture').digest('hex'),accepting:true});
 const jetx=new JetXService(shared,{now:()=>now,roundOptions:{draw:()=>400},accepting:true});
 const balance=async id=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[id]))[0].balance);
 const count=async table=>Number((await sql.unsafe('SELECT count(*)::integer AS n FROM '+table))[0].n);
 const start=(id,extra={})=>({request_id:randomUUID(),type:'start',game_id:id,model_version:registry.get(id).version,stake:cash(ordinaryStake(registry.get(id).definition)),options:{},...extra});
 const action=(round,type,input={},extra={})=>({request_id:randomUUID(),type:'action',game_id:round.game_id,model_version:round.model_version,round_id:round.round_id,expected_version:round.version,action:type,input,...extra});
 const invariant=async(total='10003000000')=>{
  assert.equal(String((await sql.unsafe('SELECT COALESCE(sum(delta),0)::text AS n FROM sw_rebuild.ledger'))[0].n),'0');
  assert.equal(String((await sql.unsafe('SELECT sum(balance)::text AS n FROM sw_rebuild.wallets'))[0].n),total);
  assert.equal(Number((await sql.unsafe('SELECT count(*)::integer AS n FROM sw_rebuild.wallets WHERE balance<0'))[0].n),0);
  assert.equal(Number((await sql.unsafe('SELECT count(*)::integer AS n FROM (SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING count(*)<>2 OR sum(delta)<>0) bad'))[0].n),0);
 };
 try{
  await sql.unsafe(`CREATE SCHEMA sw_rebuild;
   CREATE TABLE sw_rebuild.users(id text PRIMARY KEY,role text NOT NULL,status text NOT NULL,parent_id text);
   CREATE TABLE sw_rebuild.wallets(id text PRIMARY KEY,balance bigint NOT NULL CHECK(balance>=0),credit_limit bigint NOT NULL DEFAULT 0);
   CREATE TABLE sw_rebuild.sessions(token text PRIMARY KEY,user_id text NOT NULL REFERENCES sw_rebuild.users(id),expires bigint NOT NULL);
   CREATE TABLE sw_rebuild.transfers(id text PRIMARY KEY,sender text NOT NULL,recipient text NOT NULL,amount bigint NOT NULL CHECK(amount>0),kind text,actor text,notes text);
   CREATE TABLE sw_rebuild.ledger(transfer_id text NOT NULL,wallet_id text NOT NULL,delta bigint NOT NULL,PRIMARY KEY(transfer_id,wallet_id));
   CREATE TABLE sw_rebuild.audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor text,event text,target text,details jsonb);
   CREATE TABLE sw_rebuild.account_limits(user_id text PRIMARY KEY,max_balance bigint);
   CREATE TABLE sw_rebuild.live_revisions(user_id text PRIMARY KEY,revision bigint NOT NULL);
   CREATE TABLE sw_rebuild.rounds(id text PRIMARY KEY,user_id text,game text,bet bigint,payout bigint,outcome jsonb);
   CREATE FUNCTION sw_rebuild.sw_live_touch(text[]) RETURNS void LANGUAGE sql AS 'SELECT NULL::void';`);
  await shared.migrate();await jetx.migrate();await service.migrate();
  installCrossActiveGuards(shared,service,{jetx});
  const setup=async()=>{
   now=1700000000000;roundSequence=1;service.accepting=true;
   await sql.unsafe('TRUNCATE sw_native_library.requests,sw_native_library.rounds,sw_jetx_native.requests,sw_jetx_native.bets,sw_jetx_native.boards,sw_native_family.requests,sw_native_family.rounds,sw_rebuild.ledger,sw_rebuild.transfers,sw_rebuild.rounds,sw_rebuild.audit,sw_rebuild.account_limits,sw_rebuild.live_revisions,sw_rebuild.wallets,sw_rebuild.users CASCADE');
   await sql.unsafe("INSERT INTO sw_rebuild.users(id,role,status,parent_id) VALUES('player-a','player','active','agent-a'),('player-b','player','active',null),('blocked','player','blocked',null),('agent-a','agent','active',null)");
   await sql.unsafe("INSERT INTO sw_rebuild.wallets(id,balance) VALUES('player-a',1000000),('player-b',1000000),('blocked',1000000),('house',10000000000)");
  };
  await t.test('all21 identified drafts settle without changing another account or creating money',async()=>{
   await setup();
   assert.equal(newIds.length,21);
   for(const id of newIds){
    const before=await balance('player-a');
    const request=start(id),debit=BigInt(request.stake.replace('.',''));
    let result=await service.action('player-a',request);
    if(result.round.status==='active'){
     now=Number(result.round.expiresAt)+1;
     assert.equal((await service.reconcile()).settled,1);
     result=await service.state('player-a',id);
    }
    assert.equal(result.round.status,'settled',id);
    assert.equal(await balance('player-a'),before-debit+BigInt(result.round.payoutMinor),id);
    now++;
   }
   assert.equal(await count('sw_rebuild.rounds'),newIds.length);
   assert.equal(await balance('player-b'),1000000n);
   assert.equal(Number((await sql.unsafe("SELECT count(*)::integer AS n FROM sw_rebuild.wallets WHERE id LIKE 'game-reserve:%' AND balance<>0"))[0].n),0);
   assert.ok(Number((await sql.unsafe("SELECT revision FROM sw_rebuild.live_revisions WHERE user_id='agent-a'"))[0].revision)>=newIds.length);
   await invariant();
  });
  await t.test('simultaneous retries produce one round, one stake and immutable receipts',async()=>{
   await setup();const request=start('multihot40_native');
   const results=await Promise.all(Array.from({length:8},()=>service.action('player-a',request)));
   assert.equal(results.filter(result=>result.replayed).length,7);
   assert.equal(new Set(results.map(result=>result.round.round_id)).size,1);
   assert.equal(await count('sw_native_library.requests'),1);
   assert.equal(await count('sw_rebuild.rounds'),1);
   assert.equal(Number((await sql.unsafe("SELECT count(*)::integer AS n FROM sw_rebuild.transfers WHERE kind='casino_bet'"))[0].n),1);
   await assert.rejects(service.action('player-a',{...request,stake:'2.00'}),/REQUEST_ID_CONFLICT/);
   await invariant();
  });
  await t.test('failed funds, bankroll, cap and unavailable-model requests leave no partial financial rows',async()=>{
   const cases=[
    {sql:"UPDATE sw_rebuild.wallets SET balance=0 WHERE id='player-a'",error:/INSUFFICIENT_FUNDS/},
    {sql:"UPDATE sw_rebuild.wallets SET balance=0 WHERE id='house'",error:/BANKROLL_CAPACITY_UNAVAILABLE/},
    {sql:"INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES('player-a',1000000)",error:/POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT/}
   ];
   for(const entry of cases){
    await setup();await sql.unsafe(entry.sql);const before=await balance('player-a');
    await assert.rejects(service.action('player-a',start('coinminer_native')),entry.error);
    assert.equal(await balance('player-a'),before);assert.equal(await count('sw_rebuild.wallets'),4);
    for(const table of ['sw_native_library.requests','sw_native_library.rounds','sw_rebuild.transfers','sw_rebuild.ledger'])assert.equal(await count(table),0,table);
   }
   await setup();
   await assert.rejects(service.action('player-a',{...start('coinminer_native'),game_id:'darkhorus_native'}),/GAME_MODEL_UNAVAILABLE/);
   await assert.rejects(service.action('blocked',start('coinminer_native')),/ACCOUNT_BLOCKED/);
   await assert.rejects(service.state('agent-a','coinminer_native'),/PLAYER_REQUIRED/);
   await invariant();
  });
  await t.test('interactive actions never take a second stake and reject ownership or version changes',async()=>{
   await setup();const result=await service.action('player-a',start('coinminer_native'));
   assert.equal(result.round._mineIndices,undefined);assert.equal(result.round.revealed_seed,undefined);
   await assert.rejects(service.action('player-b',action(result.round,'cashout')),/ROUND_NOT_FOUND/);
   await assert.rejects(service.action('player-a',action(result.round,'cashout',{}, {expected_version:99})),/ROUND_VERSION_CHANGED/);
   const final=await service.action('player-a',action(result.round,'cashout'));
   assert.equal(final.round.status,'settled');assert.equal(final.round.payoutMinor,'100');
   assert.equal(await balance('player-a'),1000000n);
   assert.equal(Number((await sql.unsafe("SELECT count(*)::integer AS n FROM sw_rebuild.transfers WHERE kind='casino_bet'"))[0].n),1);
   await invariant();
  });
  await t.test('accepted exposure is settled after starts are disabled, including a lower account cap',async()=>{
   await setup();const first=await service.action('player-a',start('coinminer_native'));
   // The deterministic test seed/round ID draws a safe first pick. CoinMiner
   // now resolves each action at request time; no hidden fixed board exists.
   assert.equal(first.round.boardPredetermined,false);
   const picked=await service.action('player-a',action(first.round,'pick',{index:0}));
   assert.equal(picked.round.status,'active');assert.equal(picked.round._mineIndices,undefined);
   service.accepting=false;
   await sql.unsafe("INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES('player-a',1)");
   const final=await service.action('player-a',action(picked.round,'cashout'));
   assert.equal(final.round.payoutMinor,picked.round.currentCashoutMinor);
   assert.equal(await balance('player-a'),999900n+BigInt(final.round.payoutMinor));
   await assert.rejects(service.action('player-a',start('coinminer_native')),/LIBRARY_NEW_ROUNDS_DISABLED/);
   await invariant();
  });
  await t.test('expiry settles a blocked player exactly once and returns all unused reserve',async()=>{
   await setup();const first=await service.action('player-a',start('towerrush_native'));
   await sql.unsafe("UPDATE sw_rebuild.users SET status='blocked' WHERE id='player-a'");
   await sql.unsafe("INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES('player-a',1)");
   service.accepting=false;now=Number(first.round.expiresAt)+1;
   assert.equal((await service.reconcile()).settled,1);
   assert.equal((await service.reconcile()).settled,0);
   assert.equal(await balance('player-a'),1000000n);assert.equal(await count('sw_rebuild.rounds'),1);
   assert.equal(Number((await sql.unsafe("SELECT count(*)::integer AS n FROM sw_rebuild.wallets WHERE id LIKE 'game-reserve:%' AND balance<>0"))[0].n),0);
   await invariant();
  });
  await t.test('new active rounds exclude legacy and JetX starts; a prior JetX bet excludes a new round',async()=>{
   await setup();await service.action('player-a',start('coinminer_native'));
   const {board}=await jetx.state('player-a');
   const bet={request_id:randomUUID(),type:'bet',board_id:board.id,position:0,stake:'1.00',auto_cashout:'1.01',model_version:jetxVersion};
   await assert.rejects(jetx.action('player-a',bet),/FINISH_ACTIVE_ROUND:coinminer_native/);
   await assert.rejects(shared.perform('player-a',{request_id:randomUUID(),type:'start',game_id:'ssg-multi-hot-40',stake:'1.00',options:{}}),/FINISH_ACTIVE_ROUND:coinminer_native/);
   assert.equal(await count('sw_jetx_native.bets'),0);await invariant();
   await setup();const secondBoard=(await jetx.state('player-a')).board;
   await jetx.action('player-a',{...bet,request_id:randomUUID(),board_id:secondBoard.id});
   await assert.rejects(service.action('player-a',start('multihot40_native')),/FINISH_ACTIVE_ROUND:jetx_native/);
   assert.equal(await count('sw_native_library.rounds'),0);await invariant();
  });
 }finally{service.close();await db.close();await rm(directory,{recursive:true,force:true});}
});
