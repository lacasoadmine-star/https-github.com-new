import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWildStarsPresentation, WILD_MULTI_STARS_OBSERVATION } from '../games/wild-multi-stars/presentation-flow.mjs';

const grid = (locked=[], tag='apple') => Array.from({length:3}, (_,row) =>
  Array.from({length:5}, (_,reel) => locked.includes(reel) ? 'wild_star' : tag + row + reel));
const receipt = stages => ({
  roundId:'test-round-1',gameId:'wild_multi_stars',currency:'ETB',bet:'1.00',
  wheelMultiplier:3,walletReceipt:{currency:'ETB',balanceBefore:'100.00',balanceAfter:'99.00'},
  stages,
});
const stage = (lockedReels, value, charged) => ({
  grid:grid(lockedReels,value),lockedReels,newStakeCharged:charged,wheelMultiplier:3,
});
test('observation retains exact rules identity rather than the old generic 20-line/free-spin fallback',()=>{
  assert.equal(WILD_MULTI_STARS_OBSERVATION.paylines,10);
  assert.equal(WILD_MULTI_STARS_OBSERVATION.directions,'both_outer_reels_highest_each');
  assert.equal(WILD_MULTI_STARS_OBSERVATION.respin,'wild_reel_hold_without_new_stake');
});
test('an authoritative multi-stage Wild lock is presented without creating another wager',()=>{
  const result=buildWildStarsPresentation(receipt([
    stage([1],'A',true),
    stage([1,3],'B',false),
    stage([1,3],'C',false),
  ]),{rows:3});
  assert.equal(result.frames.length,3);
  assert.deepEqual(result.frames[1].newlyHeldReels,[3]);
  assert.deepEqual(result.frames.map(f=>f.type),['base','free_respin','free_respin']);
  assert.equal(result.frames.every(f=>f.wheelMultiplier===3&&!f.deductAdditionalStake),true);
  assert.equal(result.frames[1].grid[0][1],'wild_star');
});
test('rejects charged respins, wheel changes, moving held columns and unlocks',()=>{
  const first=stage([1],'A',true);
  const cases=[
    [first,{...stage([1,3],'B',false),newStakeCharged:true}],
    [first,{...stage([1,3],'B',false),wheelMultiplier:5}],
    [first,{...stage([1,3],'B',false),grid:grid([3],'B')}],
    [first,stage([],'B',false)],
    [first,{...stage([1,3],'B',false),lockedReels:[1,1,3]}],
  ];
  for(const stages of cases){
    assert.throws(()=>buildWildStarsPresentation(receipt(stages),{rows:3}),/WILD_STARS_/);
  }
});
test('rejects synthetic/unvalidated shape and local replacing of payout contract',()=>{
  for(const bad of [
    {...receipt([stage([1],'A',true)]),walletReceipt:null},
    {...receipt([stage([1],'A',true)]),gameId:'multi_hot_5_native'},
    {...receipt([stage([1],'A',true)]),wheelMultiplier:9},
    {...receipt([stage([1],'A',true)]),stages:[]},
  ]) assert.throws(()=>buildWildStarsPresentation(bad,{rows:3}),/WILD_STARS_/);
});
test('does not permit arbitrary endless extra respins',()=>{
  const stages=[stage([1],'A',true),stage([1],'B',false),stage([1],'C',false)];
  assert.throws(()=>buildWildStarsPresentation(receipt(stages),{rows:3}),/WILD_STARS_UNAUTHORIZED_RESPIN/);
});
