import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateIndependentAudit} from './independent-audit.mjs';
import {deriveExactWheelWeights,fraction,INDEPENDENT_DESIGNS} from './independent-profiles.mjs';
import {evaluateCapturedMath,requireApprovedProfile,spinCertifiedMath} from './official-math.mjs';

// Fully enumerate the real evaluator again: not a sample, frontend outcome,
// Monte Carlo estimate, or an assumption that wheel returns scale without caps.
const actual=await generateIndependentAudit();
const archived=JSON.parse(await readFile(new URL('./independent-operator-audit.json',import.meta.url),'utf8'));
test('committed operator audit exactly matches a fresh exhaustive evaluator run',()=>{
  assert.deepEqual(actual,archived);
  assert.equal(actual.results.fresh_multihot20.audit.enumeration.boardCount,36864);
  assert.equal(actual.results.fresh_multihot5burnwilds.audit.enumeration.boardCount,140608);
  assert.equal(actual.rejectedDraft.enumeration.boardCount,46656);
});

for(const [gameId,{audit,profile}] of Object.entries(actual.results)){
  test(gameId+' exact RTP proof holds with positive bounded cryptographic wheel weights',()=>{
    assert.ok(profile);assert.equal(audit.mixture.feasible,true);
    const weights=profile.wheelWeights.map(BigInt),total=weights.reduce((a,b)=>a+b,0n);
    assert.ok(weights.every(weight=>weight>0n));assert.ok(total<=0xFFFFFFFFn);
    const payout=audit.enumeration.perWheel.reduce((sum,row,index)=>sum+BigInt(row.payoutSumCents)*weights[index],0n);
    const denominator=BigInt(audit.enumeration.returnDenominator)*total;
    const p=BigInt(audit.target.numerator),q=BigInt(audit.target.denominator);
    assert.equal(q*payout,p*denominator);
    assert.deepEqual(fraction(payout,denominator),profile.targetReturn);
    assert.equal(BigInt(audit.enumeration.maximumObservedWinCents),100n*BigInt(audit.officialLiabilityCapX),'the advertised maximum must actually be reachable');
    const witness=audit.enumeration.perWheel[4].maximumWitness;
    const confirmed=evaluateCapturedMath({gameId,grid:witness.initialGrid,bet:'1.00',wheelMultiplier:5});
    assert.equal(confirmed.finalWinCents,100n*BigInt(audit.officialLiabilityCapX));
    assert.equal(confirmed.finalWin,witness.finalWin);
  });
  test(gameId+' remains an explicitly independent, unapproved operator candidate',()=>{
    assert.equal(profile.productionApproved,false);assert.equal(profile.probabilityModelAudited,false);
    assert.equal(profile.providerRngReproduced,false);assert.equal(profile.providerCertified,false);
    assert.equal(audit.providerRngReproduced,false);assert.equal(audit.productionApproved,false);
    assert.throws(()=>requireApprovedProfile(profile),/UNCERTIFIED_MATH_PROFILE/);
  });
  test(gameId+' exact payout scales across every legal denomination including maximum stake',()=>{
    const strips=profile.reelStrips,denomination=BigInt(audit.paylines*audit.foundationBet);
    for(let sample=0;sample<40;sample++){
      const stops=strips.map((strip,column)=>(sample*7+column*3)%strip.length);
      const grid=Array.from({length:3},(_,row)=>stops.map((stop,column)=>strips[column][(stop+row-1+strips[column].length)%strips[column].length]));
      for(const cents of [100n,100n+denomination,4000000n])for(let wheel=1;wheel<=5;wheel++){
        const base=evaluateCapturedMath({gameId,grid,bet:'1.00',wheelMultiplier:wheel});
        const bet=`${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
        const scaled=evaluateCapturedMath({gameId,grid,bet,wheelMultiplier:wheel});
        assert.equal(scaled.finalWinCents*100n,base.finalWinCents*cents);
      }
    }
  });
  test(gameId+' existing server cumulative-weight sampler selects each intended wheel boundary',()=>{
    // A deliberate local QA copy exercises guarded sampler code. The committed
    // artifact and any live operator flags are not changed by this test.
    const qa={...profile,productionApproved:true,probabilityModelAudited:true,auditReference:'QA_ONLY_NOT_PRODUCTION'};
    let lower=0;
    for(let wheel=1;wheel<=5;wheel++){
      const values=[0,0,0,0,0,lower];
      const result=spinCertifiedMath({profile:qa,bet:'1.00',drawIndex:bound=>{
        const value=values.shift();assert.ok(value>=0&&value<bound);return value;
      },newRoundId:()=>'7126534b-d5d0-4cbe-8a77-74a2d768a5d1'});
      assert.equal(result.wheelMultiplier,wheel);assert.equal(values.length,0);
      lower+=profile.wheelWeights[wheel-1];
    }
  });
}

test('uniform Burn draft is numerically rejected rather than claiming impossible 96.55 percent RTP',()=>{
  const rejected=actual.rejectedDraft;
  assert.equal(rejected.mixture.feasible,false);
  const minimum=rejected.enumeration.perWheel[0].returnFraction;
  assert.ok(BigInt(minimum.numerator)*2000n>1931n*BigInt(minimum.denominator));
  assert.equal(rejected.mixture.reason,'TARGET_OUTSIDE_POSITIVE_WHEEL_MIXTURE');
  assert.deepEqual(INDEPENDENT_DESIGNS.fresh_multihot5burnwilds.reelStrips.map(strip=>strip.length),[8,13,13,13,8]);
});

test('weight derivation handles exact uniform mean and both strict-bound directions',()=>{
  const enumeration={returnDenominator:'100',perWheel:[20,40,60,80,100].map(value=>({payoutSumCents:String(value)}))};
  for(const target of [{numerator:'3',denominator:'5'},{numerator:'2',denominator:'5'},{numerator:'4',denominator:'5'}]){
    const result=deriveExactWheelWeights(enumeration,target);
    assert.equal(result.feasible,true);assert.equal(result.proof.left,result.proof.right);
  }
  assert.equal(deriveExactWheelWeights(enumeration,{numerator:'1',denominator:'5'}).feasible,false);
  assert.equal(deriveExactWheelWeights(enumeration,{numerator:'2',denominator:'1'}).feasible,false);
});
