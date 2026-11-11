import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {CHARGING_WILD_IDS,emptyChargingCarry} from '../math/charging-wilds.mjs';
import {freshChargingContext,chargingGridRng,chargingLoseThenWinFixtures} from './support/charging-wilds-fixtures.mjs';

const contextFor=(d,betMinor,options,priorCarry)=>({bucket:math.chargingCarryBucket(d,betMinor,options),priorCarry});
const reordered=value=>Array.isArray(value)?value.map(reordered):value&&typeof value==='object'
  ?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reordered(item)])):value;

for(const id of CHARGING_WILD_IDS){
  const d=math.getGameDefinition(id),s=d.symbols.map(symbol=>symbol.id),w=d.wildSymbol.id;
  test(id+' retains a nonwinning Wild at its exact cell, charges once, then removes it only after a paid winning spin',()=>{
    const f=chargingLoseThenWinFixtures(d),context=freshChargingContext(d,'100');
    const rng=chargingGridRng(d,f.firstGrid),first=math.startRound({gameId:id,betMinor:'100',context,rng});
    assert.equal(rng.remaining(),0);assert.equal(first.status,'lost');assert.equal(first.winMinor,'0');
    assert.deepEqual(first.carryBefore,emptyChargingCarry());
    assert.deepEqual(first.carryAfter,{schemaVersion:1,initialized:true,paidSpins:'1',wilds:[{row:0,col:0,multiplier:2}]});
    assert.equal(first.outcome.wildsThisSpin[0].multiplier,1,'The result and next-spin charge are distinct.');
    const secondContext=contextFor(d,'100',{},first.carryAfter),secondRng=chargingGridRng(d,f.secondGrid,first.carryAfter.wilds);
    const second=math.startRound({gameId:id,betMinor:'100',context:secondContext,rng:secondRng});
    assert.equal(secondRng.remaining(),0);assert.equal(second.outcome.grid[0][0],w);
    const lineBase=100n*BigInt(d.symbols[0].pays[3])/5n;
    assert.equal(second.winMinor,(lineBase*2n).toString());assert.equal(second.outcome.lineWins.length,1);
    assert.equal(second.outcome.lineWins[0].wildMultiplier,2);
    assert.deepEqual(second.carryAfter,{schemaVersion:1,initialized:true,paidSpins:'2',wilds:[]});
    assert.equal(first.carryAfter.wilds[0].multiplier,2,'Starting another spin cannot mutate the prior accepted state.');
    assert.deepEqual(math.publicRound(reordered(second)),math.publicRound(second));
    assert.throws(()=>math.collectRound(second),{code:'ROUND_FINISHED'});
  });

  test(id+' sums multiple participating Wilds per winning line while preserving and charging unrelated Wilds',()=>{
    const carry={schemaVersion:1,initialized:true,paidSpins:'10',wilds:[{row:0,col:0,multiplier:3},{row:0,col:1,multiplier:5},{row:2,col:0,multiplier:4}]};
    const grid=[[w,w,s[0]],[s[1],s[2],s[3]],[w,s[4],s[5]]],context=contextFor(d,'100',{},carry);
    const round=math.startRound({gameId:id,betMinor:'100',context,rng:chargingGridRng(d,grid,carry.wilds)});
    assert.equal(round.outcome.lineWins.length,1);assert.equal(round.outcome.lineWins[0].wildMultiplier,8);
    assert.equal(round.winMinor,(100n*BigInt(d.symbols[0].pays[3])/5n*8n).toString());
    assert.deepEqual(round.carryAfter.wilds,[{row:2,col:0,multiplier:5}]);assert.equal(round.outcome.winningWilds.length,2);
    assert.equal(round.outcome.retainedWilds.length,1);
    const centered={schemaVersion:1,initialized:true,paidSpins:'4',wilds:[{row:1,col:1,multiplier:4}]};
    const full=Array.from({length:3},()=>Array(3).fill(s[0]));full[1][1]=w;
    const joined=math.startRound({gameId:id,betMinor:'100',context:contextFor(d,'100',{},centered),rng:chargingGridRng(d,full,centered.wilds)});
    assert.equal(joined.outcome.lineWins.length,5);assert.equal(joined.outcome.winningWilds.length,1);
    assert.equal(joined.winMinor,(100n*BigInt(d.symbols[0].pays[3])/5n*14n).toString());
    assert.deepEqual(joined.carryAfter.wilds,[]);
  });

  test(id+' actual saved-charge maximum reserves every possible winning Wild and all optional doublings',()=>{
    const carry={schemaVersion:1,initialized:true,paidSpins:'20',wilds:[{row:1,col:1,multiplier:17},{row:0,col:2,multiplier:8}]};
    for(const betMinor of ['100','2000','5000000']){
      const context=contextFor(d,betMinor,{},carry),full=Array.from({length:3},()=>Array(3).fill(w));
      const regularBound=math.maximumPayoutMinor({gameId:id,betMinor,context});
      let held=math.startRound({gameId:id,betMinor,context,options:{holdWin:true},rng:chargingGridRng(d,full,carry.wilds)});
      assert.equal(held.pendingWinMinor,regularBound);
      const heldBound=math.maximumPayoutMinor({gameId:id,betMinor,context,options:{holdWin:true}});
      assert.equal(heldBound,(BigInt(regularBound)*8n).toString());
      const after=structuredClone(held.carryAfter);assert.deepEqual(after.wilds,[]);
      for(let i=0;i<3;i++)held=math.advanceRound(held,{color:'red'},undefined,()=>0);
      assert.equal(held.winMinor,heldBound);assert.deepEqual(held.carryAfter,after,'X2 never increments a paid-spin counter.');
      assert.equal(held.carryAfter.paidSpins,'21');
      assert.ok(BigInt(heldBound)>BigInt(math.maximumPayoutMinor({gameId:id,betMinor,options:{holdWin:true},context:freshChargingContext(d,betMinor)})));
    }
  });

  test(id+' rejects missing/client/mismatched carry, malformed counters and storage overflow before outcome draws',()=>{
    const fresh=freshChargingContext(d,'100');
    for(const action of [math.startRound,math.maximumPayoutMinor]){
      assert.throws(()=>action({gameId:id,betMinor:'100'}),{code:'TRANSACTIONAL_CARRY_REQUIRED'});
      for(const options of [{carry:emptyChargingCarry()},{priorCarry:emptyChargingCarry()},{context:fresh},{ante:'1'},{ante:2}])
        assert.throws(()=>action({gameId:id,betMinor:'100',options,context:fresh}),{code:'INVALID_OPTIONS'});
    }
    const malformed=[
      {...fresh,bucket:{baseBetMinor:'200',ante:1}},
      {...fresh,priorCarry:{...emptyChargingCarry(),paidSpins:'01'}},
      {...fresh,priorCarry:{...emptyChargingCarry(),wilds:[{row:0,col:0,multiplier:2}]}},
      {...fresh,priorCarry:{schemaVersion:1,initialized:true,paidSpins:'5',wilds:[{row:3,col:0,multiplier:2}]}},
      {...fresh,priorCarry:{schemaVersion:1,initialized:true,paidSpins:'5',wilds:[{row:0,col:0,multiplier:2},{row:0,col:0,multiplier:3}]}},
      {...fresh,priorCarry:{schemaVersion:1,initialized:true,paidSpins:'1',wilds:[{row:0,col:0,multiplier:5}]}},
    ];
    for(const context of malformed){let draws=0;assert.throws(()=>math.startRound({gameId:id,betMinor:'100',context,rng:()=>{draws++;return 0;}}),{code:'INVALID_CARRY'});assert.equal(draws,0);}
    const capacity={schemaVersion:1,initialized:true,paidSpins:'1000000',wilds:[{row:0,col:0,multiplier:d.chargingFeature.counterCapacity}]};
    for(const action of [math.startRound,math.maximumPayoutMinor])assert.throws(()=>action({gameId:id,betMinor:'100',context:contextFor(d,'100',{},capacity)}),{code:'CHARGING_COUNTER_CAPACITY'});
    const huge={...capacity,wilds:[{row:0,col:0,multiplier:999999}]},total=d.limits.maxBetMinor;
    assert.throws(()=>math.maximumPayoutMinor({gameId:id,betMinor:total,context:contextFor(d,total,{},huge),options:{holdWin:true}}),{code:'INVALID_BET'});
  });

  test(id+' persists immutable carry evidence through settlement, wrong X2 and JSONB recovery without exposing draw state',()=>{
    const f=chargingLoseThenWinFixtures(d),context=freshChargingContext(d,'100');
    const first=math.startRound({gameId:id,betMinor:'100',context,rng:chargingGridRng(d,f.firstGrid)});
    const nextContext=contextFor(d,'100',{},first.carryAfter);
    const held=math.startRound({gameId:id,betMinor:'100',options:{holdWin:true},context:nextContext,rng:chargingGridRng(d,f.secondGrid,first.carryAfter.wilds)});
    const lost=math.advanceRound(held,{color:'red'},undefined,()=>1);
    assert.equal(lost.winMinor,'0');assert.deepEqual(lost.carryAfter,held.carryAfter);assert.equal(lost.carryAfter.paidSpins,'2');
    assert.deepEqual(math.publicRound(reordered(lost)),math.publicRound(lost));
    const publicState=math.publicRound(held);assert.equal(publicState.private,undefined);assert.deepEqual(publicState.carryAfter,held.carryAfter);
    publicState.carryAfter.wilds.push({row:2,col:2,multiplier:900});assert.deepEqual(held.carryAfter.wilds,[]);
    for(const mutate of [r=>r.carryAfter.paidSpins='99',r=>r.carryBucket.baseBetMinor='200',r=>r.carryBefore.wilds[0].multiplier=3,
      r=>r.outcome.lineWins[0].wildMultiplier=3,r=>r.baseWinMinor='999',r=>r.private.draws.push(0),r=>r.outcome.grid[0][0]='unknown']){
      const altered=structuredClone(held);mutate(altered);assert.throws(()=>math.publicRound(altered),{code:'INVALID_ROUND'});
    }
    assert.ok(JSON.stringify(held).length<16*1024);
  });
}

test('Multi Fruits ANTE5/10 debit one exact total, guarantee only the first bucket spin and isolate each saved bet/ANTE',()=>{
  const d=math.getGameDefinition(CHARGING_WILD_IDS[0]),s=d.symbols.map(symbol=>symbol.id);
  assert.deepEqual(d.chargingFeature.anteValues,[1,5,10]);
  for(const ante of [5,10]){
    const total=String(100*ante),options={ante},context=freshChargingContext(d,total,options);let draws=0;
    const first=math.startRound({gameId:d.id,betMinor:total,options,context,rng:bound=>draws++<9?0:4});
    assert.equal(first.betMinor,total);assert.equal(first.baseBetMinor,'100');assert.equal(first.ante,ante);
    assert.equal(first.outcome.guaranteedWildAdded,true);assert.equal(first.outcome.wildsThisSpin[0].multiplier,ante);
    assert.deepEqual(first.carryAfter.wilds,[]);assert.equal(first.carryAfter.initialized,true);
    const nextContext=contextFor(d,total,options,first.carryAfter),grid=Array.from({length:3},()=>Array(3).fill(s[0]));
    const second=math.startRound({gameId:d.id,betMinor:total,options,context:nextContext,rng:chargingGridRng(d,grid)});
    assert.equal(second.outcome.initialAnteGuarantee,false);assert.equal(second.outcome.guaranteedWildAdded,false);assert.equal(second.outcome.wildsThisSpin.length,0);
    assert.equal(second.winMinor,String(100*d.symbols[0].pays[3]));
    assert.notDeepEqual(first.carryBucket,math.chargingCarryBucket(d,total,{ante:1}));
    assert.throws(()=>math.startRound({gameId:d.id,betMinor:String(200*ante),options,context,rng:()=>0}),{code:'INVALID_CARRY'});
    assert.throws(()=>math.maximumPayoutMinor({gameId:d.id,betMinor:String(100*ante+100),options,context}),{code:'INVALID_BET'});
  }
  const gems=math.getGameDefinition(CHARGING_WILD_IDS[1]);assert.deepEqual(gems.chargingFeature.anteValues,[1]);
  assert.throws(()=>math.startRound({gameId:gems.id,betMinor:'500',options:{ante:5},context:freshChargingContext(gems,'500')}),{code:'INVALID_OPTIONS'});
});
