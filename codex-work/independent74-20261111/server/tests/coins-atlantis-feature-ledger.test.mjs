import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as math from '../../math/official72.mjs';
import {coinsBaseTickets,coinsMaximumBase} from '../../tests/support/coins-atlantis-fixtures.mjs';
import {createRetainedLibrary74Fixture} from './support/retained-library-fixture.mjs';

test('Coins r5 feature uses one20ETB total debit and a2500x bounded award despite retries/reload', {timeout:90000},async t=>{
  const fixture=await createRetainedLibrary74Fixture({isolated:true});
  t.after(()=>fixture.close());
  const {facade,sql}=fixture,id='ind74_official_coinsofatlantis',d=math.getGameDefinition(id),user=fixture.fixtureUserId;
  const balance=async who=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[who]))[0].balance);
  const total=async()=>(await sql.unsafe('SELECT SUM(balance)::text AS n FROM sw_rebuild.wallets'))[0].n;
  // Local branch fixture only: keep the actual retained SQL/financial classes,
  // but make the independent RNG boundary cover its attainable maximum.
  // This is not an official-demo round or a production seed selection.
  const original=facade.adapter.start;
  facade.adapter.start=(gameId,options,random,now)=>{
    if(gameId!==id)return original(gameId,options,random,now);
    const tickets=[...coinsBaseTickets(d,coinsMaximumBase(d)),...Array(15).fill(12)];let index=0;
    return original(gameId,options,()=>{assert.ok(index<tickets.length);return tickets[index++]/2**53;},now);
  };
  const before=await balance(user),allBefore=await total();
  const body={request_id:randomUUID(),type:'start',game_id:id,model_version:facade.adapter.definitions[id].version,stake:'20.00',options:{}};
  const results=await Promise.all(Array.from({length:6},()=>facade.action(user,body)));
  assert.equal(results.filter(r=>r.replayed).length,5);
  const snapshot=results.find(r=>!r.replayed),round=snapshot.round;
  assert.equal(round.status,'settled');
  assert.equal(round.outcome.featureType,'coin-respin');
  assert.equal(round.outcome.featureFinishedReason,'maximum-award');
  assert.equal(round.outcome.capReached,true);
  assert.equal(round.baseBetMinor,'2000');assert.equal(round.totalBetMinor,'2000');assert.equal(round.mode,'base');
  assert.equal(round.outcome.finalCoinValues.length,20);
  assert.equal(round.payoutMinor,math.maximumPayoutMinor({gameId:id,betMinor:'2000'}));
  assert.ok(BigInt(round.payoutMinor)>4000000n,'The isolated payout exceeds40000ETB without a fixed legacy cap.');
  assert.equal(await balance(user),before-2000n+BigInt(round.payoutMinor));
  const row=(await sql.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1',[round.round_id]))[0];
  assert.equal(await balance(row.reserve_wallet),0n);
  assert.equal((await sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'",[user])).length,1);
  assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.transfers WHERE id=$1',['nl:'+round.round_id+':payout'])).length,1);
  assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.rounds WHERE id=$1',['native-library:'+round.round_id])).length,1);
  assert.equal((await sql.unsafe('SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING SUM(delta)<>0')).length,0);
  assert.equal(await total(),allBefore);
  const reload=await facade.state(user,id);
  assert.equal(reload.round.round_id,round.round_id);
  assert.equal(reload.round.payoutMinor,round.payoutMinor);
  assert.equal(await balance(user),before-2000n+BigInt(round.payoutMinor));
});
