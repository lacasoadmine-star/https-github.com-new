import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as math from '../../math/official72.mjs';
import {createRetainedLibrary74Fixture} from './support/retained-library-fixture.mjs';

test('Tiger base-plus-respin is one reserved stake and one settled payout under repeated delivery', {timeout:60000},async t=>{
  const fixture=await createRetainedLibrary74Fixture({isolated:true});
  t.after(()=>fixture.close());
  const {sql,facade}=fixture,id='ind74_official_poweroftiger',d=math.getGameDefinition(id),user=fixture.fixtureUserId;
  const best=d.symbols.reduce((index,symbol,i)=>symbol.pays[3]>d.symbols[index].pays[3]?i:index,0);
  const balance=async who=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[who]))[0].balance);
  const all=async()=>(await sql.unsafe('SELECT SUM(balance)::text AS value FROM sw_rebuild.wallets'))[0].value;
  // Explicit local branch fixture: retain every SQL/financial class while
  // supplying an exact test-only sequence at the adapter RNG boundary.
  // No production entropy, account or official-demo round is involved.
  const originalStart=facade.adapter.start;
  facade.adapter.start=(gameId,options,random,now)=>{
    if(gameId!==id)return originalStart(gameId,options,random,now);
    const tickets=[...Array(9).fill(best),3,0,best,3,...Array(9).fill(0)];let index=0;
    return originalStart(gameId,options,()=>{
      assert.ok(index<tickets.length,'Unexpected fixture draw.');
      return tickets[index++]/2**53;
    },now);
  };
  const before=await balance(user),total=await all();
  const body={request_id:randomUUID(),type:'start',game_id:id,model_version:facade.adapter.definitions[id].version,stake:'20.00',options:{}};
  const results=await Promise.all(Array.from({length:6},()=>facade.action(user,body)));
  assert.equal(results.filter(r=>r.replayed).length,5);
  const first=results.find(r=>!r.replayed),round=first.round;
  assert.equal(round.status,'settled');
  assert.equal(round.outcome.bonusTriggered,true);
  assert.equal(round.outcome.baseMultiplier,20);
  assert.equal(round.outcome.featureMultiplier,20);
  assert.equal(round.outcome.featureFinishedReason,'full-board');
  assert.equal(round.payoutMinor,math.maximumPayoutMinor({gameId:id,betMinor:'2000'}));
  assert.equal(await balance(user),before-2000n+BigInt(round.payoutMinor));
  const stored=(await sql.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1',[round.round_id]))[0];
  assert.equal(await balance(stored.reserve_wallet),0n);
  assert.equal((await sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'",[user])).length,1);
  assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.transfers WHERE id=$1',['nl:'+round.round_id+':payout'])).length,1);
  assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.rounds WHERE id=$1',['native-library:'+round.round_id])).length,1);
  assert.equal((await sql.unsafe('SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING SUM(delta)<>0')).length,0);
  assert.equal(await all(),total);
  const reloaded=await facade.state(user,id);
  assert.equal(reloaded.round.round_id,round.round_id);
  assert.equal(reloaded.round.payoutMinor,round.payoutMinor);
  assert.equal(await balance(user),before-2000n+BigInt(round.payoutMinor));
});
