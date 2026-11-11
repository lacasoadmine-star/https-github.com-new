import test from'node:test';
import assert from'node:assert/strict';
import{createHash,randomUUID}from'node:crypto';
import{seededRandom}from'./support/retained-library/library-service.mjs';
import{createRetainedLibrary74Fixture}from'./support/retained-library-fixture.mjs';
import{createExistingLibrary74Adapter}from'../existing-library74-adapter.mjs';
const id='ind74_official_plinkox',now=1794355200000;
const minor=cash=>BigInt(cash.replace('.',''));
test('PlinkoX total-batch debit/reserve/payout uses unchanged retained financial classes; authored colors never multiply the debit',{timeout:120000},async t=>{
 const f=await createRetainedLibrary74Fixture({isolated:true,now:()=>now});
 const{sql,facade,service}=f,definition=facade.adapter.definitions[id];let serial=0;
 const wallet=async user=>BigInt((await sql.unsafe('SELECT balance FROM sw_rebuild.wallets WHERE id=$1',[user]))[0].balance);
 const total=async()=>BigInt((await sql.unsafe('SELECT SUM(balance)::text AS value FROM sw_rebuild.wallets'))[0].value);
 const body=(stake,ballAmount,risk='low')=>({request_id:randomUUID(),type:'start',game_id:id,model_version:definition.version,stake,options:{risk,ballAmount}});
 async function start(user,stake,n,predicate,risk='low'){
  const rid='97000000-0000-4000-8000-'+String(++serial).padStart(12,'0');let seed;
  for(let attempt=0;attempt<30000;attempt++){
   const candidate=createHash('sha256').update('plinkox-ledger-offline:'+attempt).digest('hex');
   const result=facade.adapter.start(id,{stakeMinor:minor(stake).toString(),risk,ballAmount:n},seededRandom(candidate,rid+':0'),now);
   if(predicate(result.state.mathState)){seed=candidate;break;}
  }
  assert.ok(seed,'Fixture-only deterministic entropy reaches required authored branch');
  const oldId=service.id,oldSeed=service.seed;service.id=()=>rid;service.seed=()=>seed;
  const request=body(stake,n,risk);
  try{return{request,result:await facade.action(user,request)};}finally{service.id=oldId;service.seed=oldSeed;}
 }
 try{
  assert.deepEqual(definition.ballAmounts,[1,5,10,25]);assert.equal(definition.batchTotalStake,true);
  for(const[n,stake,predicate,risk='low',bound=200n]of[
   [1,'1.00',r=>r.outcome.balls[0].ballType==='pink'&&BigInt(r.winMinor)<BigInt(r.betMinor)],
   [5,'5.00',r=>r.outcome.balls.some(b=>b.ballType==='yellow')],
   [25,'25.00',r=>r.outcome.balls.some(b=>b.ballType==='blue')],
   [5,'40005.00',r=>BigInt(r.winMinor)>4000000n],
   [5,'5.00',r=>r.outcome.balls.some(b=>b.ballType==='yellow'),'medium',1000n],
   [25,'25.00',r=>r.outcome.balls.some(b=>b.ballType==='blue')&&BigInt(r.winMinor)>0n,'high',10000n],
   [5,'5.00',r=>BigInt(r.winMinor)<BigInt(r.betMinor),'high',10000n],
   [5,'40005.00',r=>BigInt(r.winMinor)>4000000n,'high',10000n],
  ])await t.test(risk+' '+n+'balls total'+stake,async()=>{
   const user=await f.addPlayer(),before=await wallet(user),conserved=await total();
   const{request,result}=await start(user,stake,n,predicate,risk),round=result.round;
   const balls=round.outcome.balls,unit=minor(stake)/BigInt(n);
   const awards=balls.map(ball=>unit*BigInt(ball.bucketMultiplierBps)*BigInt(ball.ballMultiplier)/10000n);
   const sum=awards.reduce((a,b)=>a+b,0n);
   assert.equal(round.stakeMinor,minor(stake).toString());assert.equal(round.totalBetMinor,round.stakeMinor);
   assert.equal(round.perBallBetMinor,unit.toString());assert.equal(round.ballAmount,n);assert.equal(balls.length,n);
   assert.deepEqual(balls.map(b=>b.winMinor),awards.map(String));assert.equal(round.payoutMinor,sum.toString());
   assert.equal(await wallet(user),before-minor(stake)+sum);assert.equal(await total(),conserved);
   const row=(await sql.unsafe('SELECT * FROM sw_native_library.rounds WHERE id=$1',[round.round_id]))[0];
   assert.equal(String(row.liability),(minor(stake)*bound).toString());assert.equal(await wallet(row.reserve_wallet),0n);
   const transfers=await sql.unsafe('SELECT id,amount FROM sw_rebuild.transfers WHERE id LIKE $1',['nl:'+row.id+':%']);
   for(const[suffix,amount]of[[':0:stake',minor(stake)],[':0:reserve',minor(stake)*bound],[':payout',sum]]){
    const found=transfers.filter(x=>x.id.endsWith(suffix));assert.equal(found.length,amount===0n?0:1);if(amount>0n)assert.equal(String(found[0].amount),amount.toString());
   }
   const count=transfers.length;
   const replay=await facade.action(user,request);assert.equal(replay.replayed,true);assert.equal(replay.round.round_id,round.round_id);
   assert.equal((await facade.state(user,id)).round.round_id,round.round_id);
   assert.equal(await wallet(user),before-minor(stake)+sum);
   assert.equal((await sql.unsafe('SELECT id FROM sw_rebuild.transfers WHERE id LIKE $1',['nl:'+row.id+':%'])).length,count);
   assert.equal((await facade.history(user,id)).history.filter(x=>x.round_id===row.id).length,1);
   await assert.rejects(facade.action(user,{request_id:randomUUID(),type:'action',game_id:id,model_version:definition.version,round_id:round.round_id,expected_version:0,action:'collect',input:{}}),/ROUND_ALREADY_SETTLED/);
  });
  await t.test('HIGH accountcap and fundedhouse use TOTAL×10000 liability and rejected batch leaves money/history unchanged',async()=>{
   for(const reason of['account','house']){
    const user=await f.addPlayer(),before=await wallet(user),count=(await sql.unsafe('SELECT id FROM sw_native_library.rounds')).length;
    if(reason==='account')await sql.unsafe('INSERT INTO sw_rebuild.account_limits(user_id,max_balance) VALUES($1,$2)',[user,String(before+100n)]);
    else await sql.unsafe("UPDATE sw_rebuild.wallets SET balance=0 WHERE id='house'");
    await assert.rejects(facade.action(user,body('40005.00',5,'high')),reason==='account'?/POTENTIAL_PAYOUT_EXCEEDS_ACCOUNT_LIMIT/:/BANKROLL_CAPACITY_UNAVAILABLE/);
    assert.equal(await wallet(user),before);assert.equal((await sql.unsafe('SELECT id FROM sw_native_library.rounds')).length,count);
   }
  });
 }finally{await f.close();}
});
test('PlinkoX server policy counts TOTAL before RNG and rejects split/options/large-limit violations',()=>{
 const adapter=createExistingLibrary74Adapter({reviewedGameIds:[id],allowNewRounds:true,gameLimits:{[id]:{maxBetMinor:'2000',maxWinMinor:'400000'}}});
 let draws=0;const rng=()=>{draws++;return 0;};
 for(const options of[{stakeMinor:'100',risk:'unknown'}, {stakeMinor:'100',ballAmount:2}, {stakeMinor:'2500',ballAmount:25},{stakeMinor:'2100',ballAmount:1},{stakeMinor:'100',ballAmount:5},{stakeMinor:'600',ballAmount:5},{stakeMinor:'500',ballAmount:5,color:'blue'},{stakeMinor:'500',ballAmount:5,ballMultiplier:10}])assert.throws(()=>adapter.start(id,options,rng,now));
 assert.equal(draws,0);
 assert.throws(()=>adapter.start(id,{stakeMinor:'2000',ballAmount:10,risk:'high'},rng,now),/PAYOUT_LIMIT_EXCEEDED/);
 assert.equal(draws,0);
 const accepted=adapter.start(id,{stakeMinor:'2000',ballAmount:10},rng,now);assert.equal(accepted.debitMinor,'2000');assert.equal(accepted.maxPayoutMinor,'400000');
});

test('PlinkoX global storage ceiling uses HIGH10000x while per-risk reserve stays exact',()=>{
 const a=createExistingLibrary74Adapter({reviewedGameIds:[id],allowNewRounds:true,gameLimits:{[id]:{maxBetMinor:'999999999999999',maxWinMinor:'999999999999999'}}}),d=a.definitions[id];
 assert.equal(d.maximumMultiplierBps,100000000);
 assert(BigInt(d.limits.maxBetMinor)*10000n<=999999999999999n);
 assert((BigInt(d.limits.maxBetMinor)+100n)*10000n>999999999999999n);
 for(const[risk,bound]of[['low',200n],['medium',1000n],['high',10000n]]){const r=a.start(id,{stakeMinor:'4000100',risk},()=>0,now);assert.equal(r.debitMinor,'4000100');assert.equal(r.maxPayoutMinor,(4000100n*bound).toString());}
});
