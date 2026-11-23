import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createBurnWildsExistingServer} from './lifecycle.mjs';
import {BURN_WILDS_GAME_ID} from '../expansion.mjs';
import {quoteBurnWildsFinalGrid,auditBurnWildsPayout} from '../outcome-audit.mjs';
import {createBurnWildsCandidateSampler} from '../candidate-math.mjs';
const TOKEN='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GUARD='a'.repeat(64);
const grid=[['orange','seven','plum'],['bell','seven','watermelon'],['seven','seven','orange'],['plum','seven','bell'],['grapes','seven','cherry']];
function harness({release=true,approved=true,invalid=false}={}){
  const model={gameId:BURN_WILDS_GAME_ID,approved,engineVersion:'fixture-engine',
    mathVersion:'fixture-math',mathSha256:'f'.repeat(64),betLevels:['0.10','0.20'],
    verification:Object.fromEntries(['legalOutcomesVerified','outcomeDistributionVerified','aggregatePayoutVerified','roundingVerified','immediateLifecycleVerified','etbPolicyVerified','assetRightsVerified'].map(x=>[x,true])),
    maximumPayoutMinor:()=>100000n,
    sampleOutcome:()=>{
      const quote=quoteBurnWildsFinalGrid({finalGrid:grid,betMinor:10,multiplier:2});
      return {originalGrid:grid,finalGrid:grid,expandedColumns:[],
        winLines:quote.winLines.map(({id,rows,winMinor})=>({id,rows:[...rows],winMinor})),
        multiplier:2,winMinor:quote.totalWinMinor+(invalid?1:0)};
    }
  };
  let db={player:10000n,house:1000000n,reserved:0n,ledger:[],
    requests:new Map(),rounds:[],owners:new Map()};
  let chain=Promise.resolve(),failAt=null,sequence=1;
  const key=(u,t)=>u+':'+t.toLowerCase();
  const transaction=fn=>{
    const job=chain.then(async()=>{
      const before=structuredClone(db);
      const tx={
        authenticate:async()=> 'fixture-player',lockWallets:async()=>{},
        assertReady:async()=>{},
        withRequestOwner:async({userId,gameId,kind,requestKey},operation)=>{
          const original=db.owners.get(key(userId,requestKey));
          if(original&&(original.gameId!==gameId||original.kind!==kind))throw Error('OWNER_CONFLICT');
          return operation();
        },
        findRequest:async(u,t)=>structuredClone(db.requests.get(key(u,t))||null),
        insertRequest:async(u,t,kind,fingerprint,receipt)=>{
          if(db.requests.has(key(u,t)))throw Error('DUPLICATE_REQUEST');
          db.requests.set(key(u,t),structuredClone({kind,fingerprint,receipt}));
          db.owners.set(key(u,t),{kind,gameId:BURN_WILDS_GAME_ID});
        },
        playerBalance:async()=>db.player,houseBalance:async()=>db.house-db.reserved,
        reservedBalance:async()=>db.reserved,
        activeRound:async()=>null,assertNoActiveRound:async()=>{},assertPlayerCapacity:async()=>{},
        debitStake:async({roundId,amountMinor})=>{
          db.player-=amountMinor;db.house+=amountMinor;
          db.ledger.push({kind:'BET',roundId,amountMinor});
        },
        reserveWin:async({amountMinor})=>{
          if(db.house-db.reserved<amountMinor)throw Error('NO_HOUSE_CAPACITY');
          db.reserved+=amountMinor;
        },
        creditReservedWin:async({roundId,amountMinor})=>{
          if(failAt==='credit')throw Error('INJECTED_CREDIT_FAILURE');
          db.reserved-=amountMinor;db.house-=amountMinor;db.player+=amountMinor;
          db.ledger.push({kind:'WIN',roundId,amountMinor});
        },
        insertRound:async round=>{
          if(failAt==='insertRound')throw Error('INJECTED_INSERT_FAILURE');
          db.rounds.push(structuredClone(round));
        },
        registerRound:async()=>{}
      };
      try{return await fn(tx);}catch(error){db=before;throw error;}
    });
    chain=job.catch(()=>{});return job;
  };
  const dependencies={authenticate:async()=> 'fixture-player',sessionGuard:async()=>GUARD,
    transaction,hash:async s=>createHash('sha256').update(s).digest('hex'),
    getApprovedModel:async()=>model,releaseEnabled:async()=>release,
    uuid:()=> '00000000-0000-4000-8000-'+String(sequence++).padStart(12,'0')};
  const server=createBurnWildsExistingServer(dependencies);
  const request=()=>new Request('https://fixture.invalid/api/slots/spin');
  const action=(values={})=>({
    gameId:BURN_WILDS_GAME_ID,roundToken:TOKEN,sessionGuard:GUARD,
    bet:'0.10',engineVersion:model.engineVersion,mathVersion:model.mathVersion,
    mathSha256:model.mathSha256,...values
  });
  return {server,request,action,model,setFail:x=>failAt=x,
    snapshot:()=>structuredClone(db)};
}
test('one approved spin debits exactly once and credits the one verified win',async()=>{
  const h=harness();const state=await h.server.state(h.request());
  assert.equal(state.balance,'100.00');assert.equal(state.game.enabled,true);
  const receipt=await h.server.spin(h.request(),h.action());
  assert.equal(receipt.betMinor,10);assert.equal(receipt.winMinor,2000);
  assert.equal(receipt.balance,'119.90');assert.equal(receipt.settlementMode,'SERVER_IMMEDIATE');
  const db=h.snapshot();
  assert.equal(db.player,11990n);assert.equal(db.house,998010n);assert.equal(db.reserved,0n);
  assert.deepEqual(db.ledger.map(x=>x.kind),['BET','WIN']);
  assert.equal(db.rounds.length,1);assert.equal(db.requests.size,1);
});
test('replay and concurrent same-key spin return identical receipt without double debit',async()=>{
  const h=harness();
  const [one,two]=await Promise.all([h.server.spin(h.request(),h.action()),h.server.spin(h.request(),h.action())]);
  assert.deepEqual(two,one);
  assert.deepEqual(await h.server.spin(h.request(),h.action({replayOnly:true})),one);
  assert.equal(h.snapshot().ledger.length,2);
  assert.equal(h.snapshot().rounds.length,1);
});
test('unseen replay, conflicting stake and client-selected outcomes are rejected',async()=>{
  const h=harness();
  await assert.rejects(()=>h.server.spin(h.request(),h.action({replayOnly:true})),/ROUND_NOT_FOUND_FOR_REPLAY/);
  assert.equal(h.snapshot().ledger.length,0);
  await h.server.spin(h.request(),h.action());
  await assert.rejects(()=>h.server.spin(h.request(),h.action({bet:'0.20'})),/IDEMPOTENCY_PARAMETER_CONFLICT/);
  await assert.rejects(()=>h.server.spin(h.request(),h.action({winMinor:90000})),/CLIENT_AUTHORITY_REJECTED/);
  assert.equal(h.snapshot().ledger.length,2);
});
test('invalid payout and injected failure roll back the entire wallet and ledger',async()=>{
  for(const mode of ['invalid','credit','insertRound']){
    const h=harness({invalid:mode==='invalid'});
    if(mode!=='invalid')h.setFail(mode);
    await assert.rejects(()=>h.server.spin(h.request(),h.action()));
    const db=h.snapshot();
    assert.equal(db.player,10000n);
    assert.equal(db.house,1000000n);
    assert.equal(db.reserved,0n);
    assert.equal(db.ledger.length,0);
    assert.equal(db.rounds.length,0);
    assert.equal(db.requests.size,0);
  }
});
test('no real-money release or unapproved model can settle a spin',async()=>{
  for(const opts of [{release:false},{approved:false}]){
    const h=harness(opts);
    await assert.rejects(()=>h.server.spin(h.request(),h.action()),/RELEASE_DISABLED|APPROVED_MODEL_REQUIRED/);
    assert.equal(h.snapshot().ledger.length,0);
  }
});
test('missing login, foreign model identity and negative/invalid cash fail closed',async()=>{
  const h=harness();
  await assert.rejects(()=>h.server.spin(h.request(),h.action({sessionGuard:'c'.repeat(64)})),/SESSION_CHANGED/);
  await assert.rejects(()=>h.server.spin(h.request(),h.action({mathSha256:'c'.repeat(64)})),/MODEL_CHANGED/);
  await assert.rejects(()=>h.server.spin(h.request(),h.action({bet:'-0.10'})),/ACTION|MONEY/);
  assert.equal(h.snapshot().ledger.length,0);
});


test('suspended approved model leaves authenticated STATE read-only and old settled round replayable',async()=>{
 const h=harness();
 const original=h.action();
 const accepted=await h.server.spin(h.request(),original);
 h.model.approved=false;
 const state=await h.server.state(h.request());
 assert.equal(state.authenticated,true);
 assert.equal(state.balance,'119.90');
 assert.equal(state.game.enabled,false);
 assert.equal(state.game.productionApproved,false);
 assert.deepEqual(state.game.betLevels,[]);
 const recovered=await h.server.spin(h.request(),h.action({replayOnly:true}));
 assert.deepEqual(recovered,accepted);
 assert.equal(h.snapshot().ledger.length,2);
 assert.equal(h.snapshot().rounds.length,1);
 const fresh=h.action({roundToken:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'});
 await assert.rejects(()=>h.server.spin(h.request(),fresh),/APPROVED_MODEL_REQUIRED/);
 assert.equal(h.snapshot().ledger.length,2);
});


test('twenty distinct candidate-origin spins settle through disposable atomic server ledger without canned rounds',async()=>{
  const h=harness();
  // This approval is fixture-local: the production candidate remains
  // approved:false, no claim of certified RTP or licensed media.
  let counter=0;
  const entropy=bytes=>{
    counter=(counter+997)%65000;
    bytes[0]=counter>>8;bytes[1]=counter&255;
    return bytes;
  };
  const candidate=createBurnWildsCandidateSampler({getEntropy:entropy});
  h.model.sampleOutcome=candidate.sampleOutcome;
  h.model.maximumPayoutMinor=candidate.maximumPayoutMinor;
  const reelSets=new Set();
  let winningRounds=0;
  for(let i=0;i<20;i++){
    const roundToken='11111111-1111-4111-8111-'+String(i+1).padStart(12,'0');
    const request=h.action({roundToken});
    const receipt=await h.server.spin(h.request(),request);
    assert.equal(receipt.betMinor,10);
    assert.equal(receipt.clientToken,roundToken);
    assert.equal(receipt.pendingWinMinor,0);
    assert.equal(receipt.settlementMode,'SERVER_IMMEDIATE');
    assert.equal(auditBurnWildsPayout(receipt).payoutConsistent,true);
    reelSets.add(JSON.stringify(receipt.originalGrid));
    if(receipt.winMinor>0)winningRounds++;
    if(i%3===0){
      const same=await h.server.spin(h.request(),h.action({roundToken,replayOnly:true}));
      assert.deepEqual(same,receipt);
    }
  }
  const db=h.snapshot();
  assert.equal(db.rounds.length,20);
  assert.equal(db.requests.size,20);
  assert.equal(db.ledger.filter(entry=>entry.kind==='BET').length,20);
  assert.equal(db.ledger.filter(entry=>entry.kind==='WIN').length,winningRounds);
  assert.equal(db.player+db.house,1010000n);
  assert.equal(db.reserved,0n);
  assert.ok(reelSets.size>10,'server must produce fresh symbol layouts');
  assert.ok(counter>0);
});
