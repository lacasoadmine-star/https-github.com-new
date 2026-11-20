import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_REFERENCE, OFFICIAL_LINE_PATHS, asETB, cents, evaluateCapturedMath,
  requireApprovedProfile, spinCertifiedMath, settleExistingPlayerRound
} from './official-math.mjs';

const M20='fresh_multihot20', BURN='fresh_multihot5burnwilds';
// Exactly archived game-specific charts (NOT guessed paylines).
const lines20=OFFICIAL_LINE_PATHS.fresh_multihot20;
const lines5=OFFICIAL_LINE_PATHS.fresh_multihot5burnwilds;
function board(fill='cherry'){return Array.from({length:3},()=>Array(5).fill(fill));}
function fakeCertifiedProfile(gameId){
 const symbols=gameId===M20?['seven','bell','cherry','grape']:['seven','bell','cherry','wild'];
 return {gameId,productionApproved:true,probabilityModelAudited:true,
  auditReference:'QA_FIXTURE_NOT_PRODUCTION_VALID',mathSha256:'a'.repeat(64),
  mathVersion:'qa-only-1',engineVersion:'qa-only-1',
  linePaths:gameId===M20?lines20:lines5,
  reelStrips:Array.from({length:5},(_,col)=>col===1&&gameId===BURN?['wild','cherry','seven','bell']:['seven','cherry','bell','grape'].filter(s=>symbols.includes(s))),
  wheelWeights:[1,2,3,4,5]};
}

test('exact archived SmartSoft coefficients for the first two batch-1 games',()=>{
 assert.equal(GAME_REFERENCE[M20].paytable.seven[3],50);
 assert.equal(GAME_REFERENCE[M20].paytable.seven[4],400);
 assert.equal(GAME_REFERENCE[M20].paytable.seven[5],2000);
 assert.equal(GAME_REFERENCE[M20].paytable.bell[5],200);
 assert.equal(GAME_REFERENCE[BURN].paytable.seven[2],5);
 assert.equal(GAME_REFERENCE[BURN].paytable.seven[3],40);
 assert.equal(GAME_REFERENCE[BURN].paytable.seven[5],1000);
 assert.equal(GAME_REFERENCE[M20].foundationBet,1);
 assert.equal(GAME_REFERENCE[BURN].foundationBet,2);
 assert.equal(GAME_REFERENCE[BURN].paytable.wild[3],undefined);
 assert.equal(OFFICIAL_LINE_PATHS[M20].length,20);
 assert.equal(OFFICIAL_LINE_PATHS[BURN].length,5);
 assert.deepEqual(OFFICIAL_LINE_PATHS[BURN][0],[1,1,1,1,1]);
});
test('ETB money uses integer cents with no floating-point rounding',()=>{
 assert.equal(cents('40000.00'),4000000n);
 assert.equal(asETB(4000000n),'40000.00');
 assert.equal(asETB(1n),'0.01');
 assert.throws(()=>cents('1.001'),/INVALID_ETB_AMOUNT/);
 assert.throws(()=>cents('-1.00'),/INVALID_ETB_AMOUNT/);
 assert.throws(()=>cents('1e3'),/INVALID_ETB_AMOUNT/);
});
test('Multi Hot 20: two verified winning lines with 3 sevens, multiplier 3 gives ETB 15.00',()=>{
 const grid=[['seven','seven','seven','bell','grape'],['cherry','bell','grape','cherry','seven'],['lemon','orange','plum','watermelon','bell']];
 const x=evaluateCapturedMath({gameId:M20,grid,linePaths:lines20,bet:'1.00',wheelMultiplier:3});
 assert.equal(x.winLines.filter(w=>w.symbol==='seven'&&w.count===3).length,2);
 assert.equal(x.winLines.find(w=>w.line===1).baseWin,'2.50');
 assert.equal(x.finalWin,'15.00');
 assert.deepEqual(x.expandedWildReels,[]);
});
test('Multi Hot 20: five sevens are 2,000 times the per-line bet',()=>{
 const grid=[Array(5).fill('seven'),['cherry','bell','grape','lemon','orange'],['plum','watermelon','bell','cherry','grape']];
 const x=evaluateCapturedMath({gameId:M20,grid,linePaths:lines20,bet:'1.00',wheelMultiplier:1});
 assert.equal(x.winLines.find(w=>w.line===1).baseWin,'100.00');
 assert.equal(x.finalWin,'120.00');
});
test('Multi Hot 20: total bet must split exactly among 20 lines',()=>{
 assert.throws(()=>evaluateCapturedMath({gameId:M20,grid:board(),linePaths:lines20,bet:'1.01',wheelMultiplier:1}),/BET_NOT_DIVISIBLE_BY_PAYLINES/);
 assert.throws(()=>evaluateCapturedMath({gameId:M20,grid:board(),linePaths:lines20,bet:'0.20',wheelMultiplier:1}),/BET_OUTSIDE_WORKER_POLICY/);
 assert.throws(()=>evaluateCapturedMath({gameId:M20,grid:board(),linePaths:lines20,bet:'40000.01',wheelMultiplier:1}),/BET_OUTSIDE_WORKER_POLICY/);
});
test('Burn Wilds: one winning Wild expands over the full middle reel then reevaluates all fixed lines',()=>{
 const grid=[
  ['seven','wild','seven','lemon','grape'],
  ['seven','cherry','seven','lemon','grape'],
  ['orange','cherry','seven','cherry','plum']
 ];
 const x=evaluateCapturedMath({gameId:BURN,grid,linePaths:lines5,bet:'1.00',wheelMultiplier:2});
 assert.deepEqual(x.expandedWildReels,[1]);
 assert.equal(x.initialGrid[1][1],'cherry');
 assert.equal(x.grid[1][1],'wild');
 assert.equal(x.grid[2][1],'wild');
 assert.equal(x.winLines.filter(w=>w.symbol==='seven').length,3);
 assert.equal(x.finalWin,'24.00');
});
test('Burn Wilds: seven pays even for two matching symbols; no invented Wild expansion',()=>{
 const grid=board('cherry');grid[0]=['seven','seven','bell','cherry','cherry'];
 const x=evaluateCapturedMath({gameId:BURN,grid,linePaths:lines5,bet:'1.00',wheelMultiplier:1});
 assert.equal(x.winLines.find(w=>w.line===2).count,2);
 assert.equal(x.winLines.find(w=>w.line===2).baseWin,'0.50');
 assert.deepEqual(x.expandedWildReels,[]);
});

test('Burn Wilds original FoundationBet=2 prevents double-paying the 5-seven payline',()=>{
 // Archived SmartSoft machine state: FoundationBet=2, linePlay=5, chipCoef=.01.
 // Paytable help client formula: winning coefficient * totalBet / 5 / 2.
 const grid=[Array(5).fill('seven'),
  ['cherry','bell','grape','plum','orange'],
  ['lemon','watermelon','orange','cherry','grape']];
 const x=evaluateCapturedMath({gameId:BURN,grid,linePaths:lines5,bet:'1.00',wheelMultiplier:1});
 assert.equal(x.winLines.find(w=>w.line===2).baseWin,'100.00');
 // At the original DMO 0.10 total stake, 5 sevens pay 10 DMO on this payline.
 assert.equal(x.winLines.find(w=>w.line===2).factor,1000);
 assert.throws(()=>evaluateCapturedMath({gameId:BURN,grid,linePaths:lines5,bet:'1.05',wheelMultiplier:1}),/BET_NOT_DIVISIBLE_BY_PAYLINES/);
});

test('Burn Wild cannot appear in reel one or five',()=>{
 const grid=board('cherry');grid[1][0]='wild';
 assert.throws(()=>evaluateCapturedMath({gameId:BURN,grid,linePaths:lines5,bet:'1.00',wheelMultiplier:1}),/ILLEGAL_WILD_REEL/);
 grid[1][0]='cherry';grid[1][4]='wild';
 assert.throws(()=>evaluateCapturedMath({gameId:BURN,grid,linePaths:lines5,bet:'1.00',wheelMultiplier:1}),/ILLEGAL_WILD_REEL/);
});
test('reject guessed paylines, invalid wheel multipliers and unknown symbols',()=>{
 const grid=board('cherry');
 assert.throws(()=>evaluateCapturedMath({gameId:M20,grid,linePaths:lines5,bet:'1.00',wheelMultiplier:1}),/UNVERIFIED_PAYLINE_COUNT/);
 assert.throws(()=>evaluateCapturedMath({gameId:M20,grid,linePaths:lines20.map((p,i)=>i===0?[0,0,0,0,1]:p),bet:'1.00',wheelMultiplier:1}),/OFFICIAL_PAYLINE_CHART_MISMATCH/);
 assert.throws(()=>evaluateCapturedMath({gameId:M20,grid,linePaths:lines20,bet:'1.00',wheelMultiplier:6}),/MULTIPLIER_UNVERIFIED/);
 grid[0][0]='invented';
 assert.throws(()=>evaluateCapturedMath({gameId:M20,grid,linePaths:lines20,bet:'1.00',wheelMultiplier:1}),/INVALID_REEL_SYMBOL/);
});
test('cannot permit production outcome sampling without certified strips, wheel and independent audit',()=>{
 const p=fakeCertifiedProfile(M20);
 assert.throws(()=>requireApprovedProfile({...p,productionApproved:false}),/UNCERTIFIED_MATH_PROFILE/);
 assert.throws(()=>requireApprovedProfile({...p,probabilityModelAudited:false}),/UNCERTIFIED_MATH_PROFILE/);
 assert.throws(()=>requireApprovedProfile({...p,linePaths:lines5}),/UNVERIFIED_PAYLINE_COUNT/);
 assert.throws(()=>requireApprovedProfile({...p,wheelWeights:[1,1,1,1]}),/UNVERIFIED_WHEEL_WEIGHTS/);
});
test('QA certified profile builds verifiable deterministic server receipt from strips',()=>{
 const p=fakeCertifiedProfile(M20);
 const roundId='bf4c5335-b711-44c5-a8bd-13d114b15f88';
 const out=spinCertifiedMath({profile:p,bet:'1.00',drawIndex:()=>0,newRoundId:()=>roundId});
 assert.equal(out.roundId,roundId);
 assert.equal(out.isFree,false);
 assert.equal(out.bet,'1.00');
 assert.equal(out.gameId,M20);
 assert.equal(out.mathSha256,p.mathSha256);
 assert.equal(out.currency,'ETB');
 assert.equal(out.grid.length,3);
 assert.equal(out.grid[0].length,5);
});

function ledgerFixture({user=10000n,house=10000000n,badLedger=false,ready=true}={}){
 let state={user,house,records:new Map(),debits:0};
 let queue=Promise.resolve();
 const withExistingTransaction=fn=>{
  const task=queue.catch(()=>{}).then(async()=>{
   const local={...state,records:new Map(state.records)};
   const tx={
    async lockExistingWallets(){},
    async findExistingRound(uid,token){return local.records.get(uid+'|'+token)||null;},
    async assertReleaseEnabled(){if(!ready)throw Error('PRODUCTION_RELEASE_DISABLED');},
    async balanceCents(){return local.user;},
    async houseReserveCents(){return local.house;},
    async applyExistingLedger({wagerCents,winCents}){
     const before=local.user,houseBefore=local.house;
     local.user=before-wagerCents+winCents;
     local.house=houseBefore+wagerCents-winCents;
     local.debits++;
     return{balanceBeforeCents:before,balanceAfterCents:local.user+(badLedger?1n:0n),houseBeforeCents:houseBefore,houseAfterCents:local.house};
    },
    async recordExistingRound({userId,gameId,bet,roundToken,receipt}){
     const key=userId+'|'+roundToken;if(local.records.has(key))throw Error('IDEMPOTENCY_UNIQUE_VIOLATION');
     local.records.set(key,{userId,gameId,bet,receipt});
    },
   };
   const value=await fn(tx);state=local;return value;
  });
  queue=task.catch(()=>{});return task;
 };
 return{get state(){return state},withExistingTransaction};
}
const uuid1='bf4c5335-b711-44c5-a8bd-13d114b15f88';
const token='41030c67-a204-40bf-a848-94dfa6c0a086';
function request(ledger,overrides={}){
 return {userId:'user_7',gameId:M20,bet:'1.00',roundToken:token,
  profile:fakeCertifiedProfile(M20),withExistingTransaction:ledger.withExistingTransaction,
  drawIndex:()=>0,newRoundId:()=>uuid1,...overrides};
}
test('two concurrent identical SPIN requests yield one ledger transfer and identical round receipt',async()=>{
 const ledger=ledgerFixture();
 const [r1,r2]=await Promise.all([settleExistingPlayerRound(request(ledger)),settleExistingPlayerRound(request(ledger))]);
 assert.deepEqual(r1,r2);
 assert.equal(ledger.state.debits,1);
 assert.equal(ledger.state.records.size,1);
 assert.equal(cents(r1.walletReceipt.balanceBefore),10000n);
 assert.equal(cents(r1.walletReceipt.balanceAfter),10000n-cents(r1.bet)+cents(r1.finalWin));
 assert.equal(ledger.state.house,10000000n+cents(r1.bet)-cents(r1.finalWin));
 assert.equal(ledger.state.user,cents(r1.walletReceipt.balanceAfter));
});
test('replayOnly recovers same previous round but never invents a second wager',async()=>{
 const ledger=ledgerFixture();
 const r1=await settleExistingPlayerRound(request(ledger));
 const r2=await settleExistingPlayerRound(request(ledger,{replayOnly:true}));
 assert.deepEqual(r1,r2);
 assert.equal(ledger.state.debits,1);
 await assert.rejects(()=>settleExistingPlayerRound(request(ledger,{roundToken:'877290e1-112f-4e6e-8904-4d8f3fe8a297',replayOnly:true})),/ROUND_NOT_FOUND_FOR_REPLAY/);
 assert.equal(ledger.state.debits,1);
});
test('same token with different bet cannot be used to tamper with a settled round',async()=>{
 const ledger=ledgerFixture();
 await settleExistingPlayerRound(request(ledger));
 await assert.rejects(()=>settleExistingPlayerRound(request(ledger,{bet:'2.00'})),/IDEMPOTENCY_PARAMETER_CONFLICT/);
 assert.equal(ledger.state.debits,1);
});
test('insufficient player balance and insufficient house reserve reject with zero ledger writes',async()=>{
 const broke=ledgerFixture({user:50n});
 await assert.rejects(()=>settleExistingPlayerRound(request(broke)),e=>e.code==='INSUFFICIENT_FUNDS'&&e.status===402);
 assert.equal(broke.state.debits,0);
 const noReserve=ledgerFixture({house:1000n});
 await assert.rejects(()=>settleExistingPlayerRound(request(noReserve)),e=>e.code==='HOUSE_RESERVE_INSUFFICIENT'&&e.status===503);
 assert.equal(noReserve.state.debits,0);
});
test('a failed existing-ledger receipt rolls back the transaction rather than losing ETB',async()=>{
 const ledger=ledgerFixture({badLedger:true});
 await assert.rejects(()=>settleExistingPlayerRound(request(ledger)),/EXISTING_LEDGER_SETTLEMENT_MISMATCH/);
 assert.equal(ledger.state.user,10000n);
 assert.equal(ledger.state.house,10000000n);
 assert.equal(ledger.state.records.size,0);
 assert.equal(ledger.state.debits,0);
});
test('game remains closed on unsupported player game release or incomplete DB transaction adapter',async()=>{
 const db=ledgerFixture({ready:false});
 await assert.rejects(()=>settleExistingPlayerRound(request(db)),/PRODUCTION_RELEASE_DISABLED/);
 assert.equal(db.state.debits,0);
 await assert.rejects(()=>settleExistingPlayerRound(request(db,{withExistingTransaction:async fn=>fn({})})),/INCOMPLETE_EXISTING_LEDGER_ADAPTER/);
});

test('1,000 deterministic independent game boards respect archived paylines, provider foundation, Wild and ETB payout cap',()=>{
 const symbols=['seven','bell','grape','watermelon','lemon','plum','orange','cherry'];
 let state=0x14f56329;
 const draw=n=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%n};
 let wildOutputs=0,paidOutcomes=0;
 for(const gameId of [M20,BURN]){
  const reference=GAME_REFERENCE[gameId];
  for(let round=0;round<500;round++){
   const grid=Array.from({length:3},(_,row)=>Array.from({length:5},(_,col)=>{
    if(gameId===BURN&&col>0&&col<4&&draw(17)===0)return 'wild';
    return symbols[draw(symbols.length)];
   }));
   const multiplier=draw(5)+1;
   const bet='2.00';
   const result=evaluateCapturedMath({gameId,grid,bet,wheelMultiplier:multiplier});
   const total=cents(result.finalWin),stake=cents(bet),base=cents(result.baseWin);
   assert(total>=0n && total<=stake*BigInt(reference.maxWinX));
   assert.equal(total,base*BigInt(multiplier)>stake*BigInt(reference.maxWinX)
    ?stake*BigInt(reference.maxWinX):base*BigInt(multiplier));
   assert(result.winLines.length<=reference.paylines);
   const expectedPaths=OFFICIAL_LINE_PATHS[gameId];
   for(const line of result.winLines){
    assert.deepEqual(line.positions,expectedPaths[line.line-1].slice(0,line.count).map((row,col)=>[row,col]));
    assert(cents(line.baseWin)>=0n);
    assert.equal(reference.paytable[line.symbol][line.count],line.factor);
   }
   if(gameId===BURN){
    for(const index of result.expandedWildReels){
     wildOutputs++;
     assert(index>=1&&index<=3);
     assert(grid.some(row=>row[index]==='wild'));
     assert(result.grid.every(row=>row[index]==='wild'));
    }
   }else assert.deepEqual(result.expandedWildReels,[]);
   if(total>0n)paidOutcomes++;
  }
 }
 assert(wildOutputs>=0 && paidOutcomes>0);
});

test('Burn Wilds nonintegral FoundationBet stake is rejected before any existing wallet transaction',async()=>{
 let transactions=0;
 const ledger=ledgerFixture();
 const withExistingTransaction=async fn=>{transactions++;return ledger.withExistingTransaction(fn)};
 await assert.rejects(
   ()=>settleExistingPlayerRound({
     userId:'user_7',gameId:BURN,bet:'1.05',roundToken:token,
     profile:fakeCertifiedProfile(BURN),withExistingTransaction
   }),
   e=>e.code==='BET_OUTSIDE_WORKER_POLICY'&&e.status===422
 );
 assert.equal(transactions,0,'invalid provider stake must not acquire DB locks or debit');
 assert.equal(ledger.state.user,10000n);
 assert.equal(ledger.state.house,10000000n);
 assert.equal(ledger.state.records.size,0);
});
