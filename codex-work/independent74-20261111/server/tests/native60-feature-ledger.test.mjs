import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRetainedLibrary74Fixture} from './support/retained-library-fixture.mjs';
import {seededRandom} from './support/retained-library/library-service.mjs';
import {integerRngFromLibrary} from '../existing-library74-adapter.mjs';
import * as math from '../../math/official72.mjs';

test('purchased Gates, Genie and Coins features use one effective debit, one bounded final credit and compact persisted state',{timeout:60000},async()=>{
 const f=await createRetainedLibrary74Fixture({isolated:true,seed:()=>createHash('sha256').update('purchased-feature-isolated-fixture').digest('hex')});
 try{
  const balance=async user=>BigInt((await f.sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[user]))[0].balance);
  for(const item of [
   {id:'ind74_official_gatesofmerlyn',mode:'buy100',stake:'100.00',maximum:'500000',initialFreeSpins:15},
   {id:'ind74_official_gatesofmerlyn',mode:'buy500',stake:'500.00',maximum:'500000',initialFreeSpins:15},
   {id:'ind74_official_geniesbonanza',mode:'buy100',stake:'100.00',maximum:'300000',initialFreeSpins:10},
   {id:'ind74_official_coinsofatlantis',mode:'buy60',stake:'60.00',maximum:'250000'},
  ]){
   const user=await f.addPlayer(),before=await balance(user),houseBefore=await balance('house');
   const body={request_id:randomUUID(),type:'start',game_id:item.id,model_version:f.facade.adapter.definitions[item.id].version,stake:item.stake,options:{mode:item.mode}};
   const result=await f.facade.action(user,body),round=result.round,total=BigInt(item.stake.replace('.',''));
   assert.equal(result.currency,'ETB');assert.equal(result.freePlay,undefined);assert.equal(round.status,'settled');
   assert.equal(round.stakeMinor,String(total));assert.equal(round.totalBetMinor,String(total));assert.equal(round.baseBetMinor,'100');assert.equal(round.mode,item.mode);
   if(item.initialFreeSpins){assert(round.outcome.freeSpinsAwarded>=item.initialFreeSpins||round.outcome.capReached);assert.equal(round.outcome.freeSpinsRemaining,0);}
   else{assert.equal(round.outcome.bonusTriggered,true);assert(round.outcome.bonusFrames.length>0);assert.equal(typeof round.outcome.featureFinishedReason,'string');}
   assert.equal(await balance(user),before-total+BigInt(round.payoutMinor));assert.equal(await balance('house'),houseBefore+total-BigInt(round.payoutMinor));
   const stored=(await f.sql.unsafe('SELECT state,reserve_wallet,liability FROM sw_native_library.rounds WHERE id=$1',[round.round_id]))[0];
   assert.equal(String(stored.liability),item.maximum);assert(Buffer.byteLength(JSON.stringify(stored.state))<128*1024);assert.equal(await balance(stored.reserve_wallet),0n);
   assert.equal(round.private,undefined);assert.equal(round.mathState,undefined);assert.equal(round.outcome.draws,undefined);
   const bets=await f.sql.unsafe("SELECT amount FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'",[user]);assert.equal(bets.length,1);assert.equal(String(bets[0].amount),String(total));
   const paid=(await f.sql.unsafe("SELECT COALESCE(sum(amount),0)::text AS amount FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_win'",[user]))[0].amount;assert.equal(paid,round.payoutMinor);
   const replay=await f.facade.action(user,body);assert.equal(replay.replayed,true);assert.equal(replay.round.round_id,round.round_id);assert.equal(await balance(user),before-total+BigInt(round.payoutMinor));
   const state=await f.facade.state(user,item.id);assert.equal(state.round.round_id,round.round_id);assert.deepEqual(state.round.outcome,round.outcome);
  }
 }finally{await f.close();}
});

test('Mariachi collector feature holds its resolved award under the full X2 reserve and collects once',{timeout:90000},async()=>{
 const gameId='ind74_official_mariachicoins',d=math.getGameDefinition(gameId),now=1794355200000,roundId='94000000-0000-4000-8000-000000000001';
 assert(d.mariachiFeature);
 let selected;
 // Select only disposable fixture entropy. This reaches the rare collector
 // branch through the actual retained HMAC RNG, not a production seed/account.
 for(let attempt=0;attempt<50000;attempt++){
  const seed=createHash('sha256').update('mariachi-ledger-fixture:'+attempt).digest('hex');
  const round=math.startRound({gameId,betMinor:'100',options:{holdWin:true},now,rng:integerRngFromLibrary(seededRandom(seed,roundId+':0'))});
  const view=math.publicRound(round,now);
  if(round.status==='active'&&view.outcome.bonusTriggered&&view.outcome.bonusFrames.length){selected={seed,round,view};break;}
 }
 assert(selected,'The isolated fixture reaches a collector feature.');
 const f=await createRetainedLibrary74Fixture({isolated:true,now:()=>now,seed:()=>selected.seed,id:()=>roundId});
 try{
  const user=f.fixtureUserId,balance=async id=>BigInt((await f.sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[id]))[0].balance),before=await balance(user);
  const body={request_id:randomUUID(),type:'start',game_id:gameId,model_version:f.facade.adapter.definitions[gameId].version,stake:'1.00',options:{holdWin:true}};
  const started=await f.facade.action(user,body);assert.equal(started.round.status,'active');assert.equal(started.round.outcome.bonusTriggered,true);assert.equal(await balance(user),before-100n);
  const pending=BigInt(started.round.pendingWinMinor);assert.equal(pending,BigInt(started.round.outcome.baseAwardMinor)+BigInt(started.round.outcome.bonusAwardMinor));
  const stored=(await f.sql.unsafe('SELECT state,liability,reserve_wallet FROM sw_native_library.rounds WHERE id=$1',[roundId]))[0];
  assert.equal(String(stored.liability),'2000000');assert.equal(await balance(stored.reserve_wallet),2000000n);assert(Buffer.byteLength(JSON.stringify(stored.state))<128*1024);
  assert.equal(started.round.private,undefined);assert.equal(started.round.mathState,undefined);assert.equal(started.round.outcome.draws,undefined);
  const collect={request_id:randomUUID(),type:'action',game_id:gameId,model_version:body.model_version,round_id:roundId,expected_version:started.round.version,action:'collect',input:{}};
  const settled=await f.facade.action(user,collect);assert.equal(settled.round.payoutMinor,String(pending));assert.equal(await balance(user),before-100n+pending);assert.equal(await balance(stored.reserve_wallet),0n);
  const replay=await f.facade.action(user,collect);assert.equal(replay.replayed,true);assert.equal(await balance(user),before-100n+pending);
  assert.equal((await f.sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'",[user])).length,1);
  assert.equal((await f.sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_win'",[user])).length,1);
 }finally{await f.close();}
});
