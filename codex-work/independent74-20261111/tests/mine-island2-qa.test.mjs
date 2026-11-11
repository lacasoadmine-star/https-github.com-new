import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_ID, mineIslandDefinition, startMineIslandRound,
  advanceMineIslandRound, collectMineIslandRound,
  publicMineIslandRound, mineIslandReturnAtStep,
} from '../math/mine-island2.mjs';

test('authored ladder validates exact stakes, modes and RNG boundaries', () => {
  for (const betMinor of ['0','-10','9','11','100001','1e3','10.0','010',NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) {
    assert.throws(() => startMineIslandRound({betMinor}), {code: 'INVALID_BET'});
  }
  assert.throws(() => startMineIslandRound({betMinor:'10',mode:'unknown'}), {code:'INVALID_MODE'});
  for (const rng of [() => -1, bound => bound, () => 0.5, () => NaN]) {
    assert.throws(() => startMineIslandRound({betMinor:'10',rng}), {code:'INVALID_RNG'});
  }
  const bounds = [];
  const round = startMineIslandRound({betMinor:'10', rng: bound => {bounds.push(bound); return 0;}});
  assert.equal(round.gameId, GAME_ID);
  assert.equal(bounds.length, 10);
  assert.equal(round.status, 'active');
});

test('successful jump and collect preserve exact 0.10 to 0.11 payout', () => {
  const initial = startMineIslandRound({betMinor:'10',rng:()=>0});
  const before = structuredClone(initial);
  const jumped = advanceMineIslandRound(initial,{cell:0});
  assert.deepEqual(initial,before,'math does not mutate stored prior round');
  assert.equal(jumped.step,1);
  assert.equal(jumped.multiplierBps,11000);
  assert.equal(publicMineIslandRound(jumped).collectibleMinor,'11');
  const collected = collectMineIslandRound(jumped);
  assert.equal(collected.winMinor,'11');
  assert.equal(collected.status,'collected');
  assert.throws(()=>collectMineIslandRound(collected),{code:'ROUND_FINISHED'});
  assert.throws(()=>advanceMineIslandRound(collected,{cell:1}),{code:'ROUND_FINISHED'});
});

test('failed first jump cannot pay or collect', () => {
  const initial = startMineIslandRound({betMinor:'100',rng:bound=>bound-1});
  assert.throws(()=>collectMineIslandRound(initial),{code:'NO_PROGRESS'});
  const failed = advanceMineIslandRound(initial,{cell:0});
  assert.equal(failed.status,'lost');
  assert.equal(failed.winMinor,'0');
  assert.equal(publicMineIslandRound(failed).collectibleMinor,'0');
  assert.throws(()=>collectMineIslandRound(failed),{code:'ROUND_FINISHED'});
});

test('all ten steps settle automatically once and hide future outcomes', () => {
  for(const mode of ['easy','medium','hard']) {
    let round=startMineIslandRound({betMinor:'100000',mode,rng:()=>0});
    for(let step=0;step<10;step++) {
      const publicState=publicMineIslandRound(round);
      assert.equal('private' in publicState,false);
      assert.equal('survival' in publicState,false);
      assert.equal(publicState.history.length,step);
      round=advanceMineIslandRound(round,{cell:step});
    }
    assert.equal(round.status,'collected');
    assert.equal(round.step,10);
    assert.ok(BigInt(round.winMinor)<=BigInt(mineIslandDefinition.limits.maxWinMinor));
    assert.throws(()=>collectMineIslandRound(round),{code:'ROUND_FINISHED'});
  }
});

test('chosen cell validation rejects out-of-range and duplicate visual choices', () => {
  const initial=startMineIslandRound({betMinor:'10',rng:()=>0});
  for(const cell of [-1,10,0.5,'0',NaN]) assert.throws(()=>advanceMineIslandRound(initial,{cell}),{code:'INVALID_CELL'});
  const jumped=advanceMineIslandRound(initial,{cell:3});
  assert.throws(()=>advanceMineIslandRound(jumped,{cell:3}),{code:'INVALID_CELL'});
});

test('declared original expected return equals 96 percent at every published mode and step', () => {
  for(const mode of ['easy','medium','hard'])for(let step=1;step<=10;step++) {
    const result=mineIslandReturnAtStep({mode,step,betMinor:'1000'});
    assert.equal(BigInt(result.expectedReturnNumerator)*100n,BigInt(result.expectedReturnDenominator)*96n,`${mode}:${step}`);
  }
});
