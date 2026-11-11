import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRetainedLibrary74Fixture} from './support/retained-library-fixture.mjs';
test('Chicken modes reserve their accepted route once and collect one large first-crossing award under duplicate delivery',{timeout:60000},async t=>{
 const f=await createRetainedLibrary74Fixture({isolated:true});t.after(()=>f.close());
 const {sql,facade}=f,id='ind74_official_chickenhighway',user=f.fixtureUserId;
 const balance=async who=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[who]))[0].balance);
 const total=async()=>(await sql.unsafe('SELECT SUM(balance)::text AS value FROM sw_rebuild.wallets'))[0].value;
 const initialTotal=await total(),original=facade.adapter.start;
 facade.adapter.start=(gameId,opts,rng,now)=>original(gameId,opts,gameId===id?()=>0:rng,now);
 for(const[mode,first,max]of [['easy',102n,20n],['medium',112n,1000n],['hard',125n,10000n]]){
   const before=await balance(user),body={request_id:randomUUID(),type:'start',game_id:id,model_version:facade.adapter.definitions[id].version,stake:'40001.00',options:{mode}};
   const starts=await Promise.all(Array.from({length:6},()=>facade.action(user,body)));assert.equal(starts.filter(r=>r.replayed).length,5);
   const active=starts.find(r=>!r.replayed).round;assert.equal(active.status,'active');
   const stored=(await sql.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1',[active.round_id]))[0];
   assert.equal(await balance(user),before-4000100n);assert.equal(await balance(stored.reserve_wallet),4000100n*max);
   const collect={request_id:randomUUID(),type:'action',game_id:id,model_version:active.model_version,round_id:active.round_id,expected_version:0,action:'collect',input:{}};
   const results=await Promise.all(Array.from({length:6},()=>facade.action(user,collect)));assert.equal(results.filter(r=>r.replayed).length,5);
   const final=results.find(r=>!r.replayed).round,payout=4000100n*first/100n;assert.equal(final.payoutMinor,payout.toString());
   assert(payout>4000000n);assert.equal(await balance(user),before-4000100n+payout);assert.equal(await balance(stored.reserve_wallet),0n);
   assert.equal((await facade.state(user,id)).round.payoutMinor,final.payoutMinor);
   assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.transfers WHERE id=$1',['nl:'+active.round_id+':payout'])).length,1);
 }
 assert.equal((await sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'",[user])).length,3);
 assert.equal((await sql.unsafe('SELECT transfer_id FROM sw_rebuild.ledger GROUP BY transfer_id HAVING SUM(delta)<>0')).length,0);
 assert.equal(await total(),initialTotal);
});
