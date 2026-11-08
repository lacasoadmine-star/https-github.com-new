import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as engine from '../models/multihot40-rules.mjs';
import {createFixture,firstCardColor} from './multihot40-wallet-fixture.mjs';

test('MultiHot40 pending collection and doubling use the unchanged canonical wallet in isolated PostgreSQL',async t=>{
 const fixture=await createFixture();
 const {service,sql,clock,setup,cleanup}=fixture;
 const balance=async id=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[id]))[0].balance);
 const count=async table=>Number((await sql.unsafe('SELECT count(*)::integer AS n FROM '+table))[0].n);
 const transfers=async kind=>Number((await sql.unsafe('SELECT count(*)::integer AS n FROM sw_rebuild.transfers WHERE kind=$1',[kind]))[0].n);
 const start=(extra={})=>({request_id:randomUUID(),type:'start',game_id:engine.ID,model_version:engine.VERSION,stake:'0.40',options:{},...extra});
 const action=(round,type,input={},extra={})=>({request_id:randomUUID(),type:'action',game_id:engine.ID,model_version:engine.VERSION,
  round_id:round.round_id,expected_version:round.version,action:type,input,...extra});
 const invariant=async()=>{
  assert.equal(String((await sql.unsafe('SELECT COALESCE(sum(delta),0)::text AS n FROM sw_rebuild.ledger'))[0].n),'0');
  assert.equal(String((await sql.unsafe('SELECT sum(balance)::text AS n FROM sw_rebuild.wallets'))[0].n),'10003000000');
  assert.equal(Number((await sql.unsafe('SELECT count(*)::integer AS n FROM sw_rebuild.wallets WHERE balance<0'))[0].n),0);
  assert.equal(Number((await sql.unsafe('SELECT count(*)::integer AS n FROM (SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING count(*)<>2 OR sum(delta)<>0) invalid'))[0].n),0);
 };
 try{
  await t.test('manual win debits once, remains reserved and reloads identically before Take Win',async()=>{
   await setup();const request=start(),result=await service.action('player-a',request);
   assert.equal(result.round.status,'active');assert.equal(result.round.payoutMinor,null);
   assert.equal(await balance('player-a'),999960n);assert.equal(await transfers('casino_bet'),1);assert.equal(await transfers('casino_win'),0);
   assert.equal(await count('sw_rebuild.rounds'),0);
   const row=(await sql.unsafe('SELECT reserve_wallet,liability FROM sw_native_library.rounds'))[0];
   assert.equal(String(row.liability),'100000');assert.equal(await balance(row.reserve_wallet),100000n);
   const reloaded=await service.state('player-a',engine.ID);
   assert.deepEqual(reloaded.round,result.round);assert.equal(reloaded.balance,'9999.60');
   assert.equal(reloaded.round.revealed_seed,undefined);
   await assert.rejects(service.action('player-a',start()),/FINISH_ACTIVE_ROUND:multihot40_native/);
   const replay=await service.action('player-a',request);
   assert.equal(replay.replayed,true);assert.equal(await transfers('casino_bet'),1);
   await invariant();
  });
  await t.test('concurrent duplicate collection requests credit exactly once with balanced entries',async()=>{
   await setup();const first=await service.action('player-a',start());
   const collect=action(first.round,'collect');
   const results=await Promise.all(Array.from({length:6},()=>service.action('player-a',collect)));
   assert.equal(results.filter(result=>result.replayed).length,5);
   const final=results[0];assert.equal(final.round.status,'settled');
   assert.equal(final.round.payoutMinor,first.round.currentCashoutMinor);
   assert.equal(await balance('player-a'),999960n+BigInt(final.round.payoutMinor));
   assert.equal(await transfers('casino_bet'),1);assert.equal(await transfers('casino_win'),1);
   assert.equal(await count('sw_rebuild.rounds'),1);
   assert.equal(Number((await sql.unsafe("SELECT count(*)::integer AS n FROM sw_rebuild.wallets WHERE id LIKE 'game-reserve:%' AND balance<>0"))[0].n),0);
   await assert.rejects(service.action('player-a',{...collect,input:{payoutMinor:'99999999'}}),/REQUEST_ID_CONFLICT/);
   assert.equal(await balance('player-b'),1000000n);await invariant();
  });
  await t.test('a server gamble win remains pending, is replayable and never takes another stake',async()=>{
   await setup();const first=await service.action('player-a',start());
   const request=action(first.round,'gamble',{color:firstCardColor(clock.seed)});
   const won=await service.action('player-a',request);
   assert.equal(won.round.status,'active');assert.equal(won.round.currentCashoutMinor,String(2n*BigInt(first.round.currentCashoutMinor)));
   assert.equal(won.round.gambleHistory.length,1);assert.equal(won.round.gambleHistory[0].won,true);
   assert.equal(await balance('player-a'),999960n);assert.equal(await transfers('casino_bet'),1);assert.equal(await transfers('casino_win'),0);
   assert.equal((await service.action('player-a',request)).replayed,true);
   assert.equal((await service.state('player-a',engine.ID)).round.gambleAttempts,1);
   await assert.rejects(service.action('player-a',{...request,input:{color:firstCardColor(clock.seed)==='red'?'black':'red'}}),/REQUEST_ID_CONFLICT/);
   const final=await service.action('player-a',action(won.round,'collect'));
   assert.equal(final.round.payoutMinor,won.round.currentCashoutMinor);
   assert.equal(await transfers('casino_bet'),1);assert.equal(await transfers('casino_win'),1);
   assert.equal(await balance('player-a'),999960n+BigInt(won.round.currentCashoutMinor));await invariant();
  });
  await t.test('a lost gamble settles zero and cannot collect the earlier slot win',async()=>{
   await setup();const first=await service.action('player-a',start());
   const wrong=firstCardColor(clock.seed)==='red'?'black':'red';
   const lost=await service.action('player-a',action(first.round,'gamble',{color:wrong}));
   assert.equal(lost.round.status,'settled');assert.equal(lost.round.payoutMinor,'0');
   assert.equal(lost.round.baseWinMinor,first.round.baseWinMinor);assert.equal(lost.round.reason,'GAMBLE_LOST');
   assert.equal(await balance('player-a'),999960n);assert.equal(await transfers('casino_win'),0);assert.equal(await transfers('casino_bet'),1);
   await assert.rejects(service.action('player-a',action(lost.round,'collect')),/ROUND_ALREADY_SETTLED/);
   assert.equal(await count('sw_rebuild.rounds'),1);await invariant();
  });
  await t.test('ownership, stale versions and client payout fields cannot change a pending obligation',async()=>{
   await setup();const first=await service.action('player-a',start());
   await assert.rejects(service.action('player-b',action(first.round,'collect')),/ROUND_NOT_FOUND/);
   await assert.rejects(service.action('player-a',action(first.round,'collect',{}, {expected_version:2})),/ROUND_VERSION_CHANGED/);
   await assert.rejects(service.action('player-a',action(first.round,'collect',{}, {model_version:'different'})),/GAME_RULES_UPDATED_RELOAD/);
   await assert.rejects(service.action('player-a',action(first.round,'collect',{payoutMinor:'9999999'})),/INVALID_MULTIHOT40_ACTION/);
   await assert.rejects(service.action('player-a',action(first.round,'gamble',{color:'red',grid:[]})),/INVALID_MULTIHOT40_ACTION/);
   const reloaded=await service.state('player-a',engine.ID);assert.deepEqual(reloaded.round,first.round);
   assert.equal(await transfers('casino_bet'),1);assert.equal(await transfers('casino_win'),0);await invariant();
  });
  await t.test('disabled new starts and lowered limits do not prevent collection of an accepted win',async()=>{
   await setup();const first=await service.action('player-a',start());service.accepting=false;
   await sql.unsafe("INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES('player-a',1)");
   const final=await service.action('player-a',action(first.round,'collect'));
   assert.equal(final.round.payoutMinor,first.round.currentCashoutMinor);
   assert.equal(await balance('player-a'),999960n+BigInt(first.round.currentCashoutMinor));
   await assert.rejects(service.action('player-a',start()),/LIBRARY_NEW_ROUNDS_DISABLED/);await invariant();
  });
  await t.test('disconnection expiry credits a blocked account once and releases the unused reserve',async()=>{
   await setup();const first=await service.action('player-a',start());
   await sql.unsafe("UPDATE sw_rebuild.users SET status='blocked' WHERE id='player-a'");
   await sql.unsafe("INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES('player-a',1)");
   service.accepting=false;clock.now=first.round.expiresAt+1;
   assert.equal((await service.reconcile()).settled,1);assert.equal((await service.reconcile()).settled,0);
   assert.equal(await balance('player-a'),999960n+BigInt(first.round.currentCashoutMinor));
   assert.equal(await transfers('casino_win'),1);assert.equal(await transfers('casino_bet'),1);
   assert.equal(await count('sw_rebuild.rounds'),1);
   assert.equal(Number((await sql.unsafe("SELECT count(*)::integer AS n FROM sw_rebuild.wallets WHERE id LIKE 'game-reserve:%' AND balance<>0"))[0].n),0);
   await invariant();
  });
  await t.test('autoplay collection settles in the one accepted transaction and replay does not recredit',async()=>{
   await setup();const request=start({options:{autoCollect:true}});
   const first=await service.action('player-a',request);
   assert.equal(first.round.status,'settled');assert.equal(first.round.reason,'AUTO_COLLECTED');
   assert.equal(first.round.payoutMinor,first.round.baseWinMinor);
   assert.equal(await balance('player-a'),999960n+BigInt(first.round.payoutMinor));
   assert.equal((await service.action('player-a',request)).replayed,true);
   assert.equal(await transfers('casino_bet'),1);assert.equal(await transfers('casino_win'),1);await invariant();
  });
  await t.test('failed reserve, funds and caps roll back every new round and ledger row',async()=>{
   const cases=[
    {sql:"UPDATE sw_rebuild.wallets SET balance=0 WHERE id='player-a'",error:/INSUFFICIENT_FUNDS/},
    {sql:"UPDATE sw_rebuild.wallets SET balance=0 WHERE id='house'",error:/BANKROLL_CAPACITY_UNAVAILABLE/},
    {sql:"INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES('player-a',1000000)",error:/POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT/}
   ];
   for(const fixture of cases){
    await setup();await sql.unsafe(fixture.sql);const before=await balance('player-a');
    await assert.rejects(service.action('player-a',start()),fixture.error);
    assert.equal(await balance('player-a'),before);assert.equal(await count('sw_rebuild.wallets'),4);
    for(const table of ['sw_native_library.requests','sw_native_library.rounds','sw_rebuild.transfers','sw_rebuild.ledger','sw_rebuild.rounds'])assert.equal(await count(table),0,table);
   }
  });
 }finally{await cleanup();}
});
