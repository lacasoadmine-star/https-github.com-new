import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {coinsBaseTickets,coinsNoWinGrid,fiveMajorGrid,coinsMaximumBase,coinFixtureRng} from './support/coins-atlantis-fixtures.mjs';

const id='ind74_official_coinsofatlantis',d=math.getGameDefinition(id),empty=n=>Array(n).fill(63);
const start=(tickets,betMinor='100')=>math.startRound({gameId:id,betMinor,rng:coinFixtureRng(tickets)});

test('Coins uses observed5×4 geometry and documented regular/+1/MINI/MAJOR feature subset',()=>{
  assert.equal(d.mathVersion,'official72-coinsofatlantis-r4');
  assert.equal(d.rows,4);assert.equal(d.cols,5);
  assert.deepEqual(d.coinFeature.regularValues,[1,2,3,4,5,6,7,8,9,10,15,20]);
  assert.equal(d.coinFeature.miniValue,25);assert.equal(d.coinFeature.majorValue,50);
  assert.equal(d.coinFeature.maximumFrames,60);
  assert.equal(d.coinFeature.providerProbabilitiesVerified,false);
  assert.deepEqual(d.coinFeature.unsupportedCoinTypes,['mega','grand']);
  assert.equal(d.nominalReturn.verified,false);
  assert.match(d.rules.join(' '),/base-plus-feature aggregation and coin\/expansion ordering remain unverified/);
});

test('four coins cannot trigger; five locked initial coins pay once after three empty respins',()=>{
  const four=coinsNoWinGrid(d);for(let col=0;col<4;col++)four[0][col]={kind:'major'};
  const noFeature=start(coinsBaseTickets(d,four));
  assert.equal(noFeature.outcome.initialCoinCount,4);
  assert.equal(noFeature.outcome.bonusTriggered,false);
  assert.equal(noFeature.outcome.bonusAwardMinor,'0');
  const round=start([...coinsBaseTickets(d,fiveMajorGrid(d)),...empty(15*3)]);
  assert.equal(round.outcome.bonusTriggered,true);
  assert.deepEqual(round.outcome.bonusFrames.map(f=>f.respinsRemaining),[2,1,0]);
  assert.ok(round.outcome.bonusFrames.every(f=>f.lockedCells===5));
  assert.equal(round.outcome.featureFinishedReason,'respins-exhausted');
  assert.equal(round.outcome.bonusAwardMinor,'25000');
  assert.equal(round.winMinor,'25000','Intermediate frame awards are not additional payouts.');
});

test('+1 coin changes resets to4 and a subsequent ordinary coin resets the same persistent allowance',()=>{
  const tickets=[...coinsBaseTickets(d,fiveMajorGrid(d)),...empty(30),10,11,...empty(14),0,0,...empty(13),...empty(13*4)];
  const round=start(tickets),o=round.outcome;
  assert.deepEqual(o.bonusFrames.map(f=>f.respinsRemaining),[2,1,4,4,3,2,1,0]);
  assert.deepEqual(o.bonusFrames.map(f=>f.resetLimit),[3,3,4,4,4,4,4,4]);
  assert.equal(o.featureResetLimit,4);
  assert.equal(o.finalCoinValues.find(c=>c.kind==='plus-one').multiplier,20);
  assert.equal(o.bonusAwardMinor,'27100');
  assert.equal(o.bonusFrames[2].grid[1][0],d.plusRespinSymbol.id);
});

test('a full initial board ends immediately and doubles the sum of all coin values',()=>{
  const grid=Array.from({length:4},()=>Array.from({length:5},()=>({kind:'major'})));
  const round=start(coinsBaseTickets(d,grid));
  assert.equal(round.outcome.initialCoinCount,20);
  assert.equal(round.outcome.bonusFrames.length,0);
  assert.equal(round.outcome.featureFinishedReason,'full-board');
  assert.equal(round.outcome.bonusAwardMinor,'200000');
});

test('regular and MINI values use the accepted total stake rather than floating-point line stakes',()=>{
  const grid=fiveMajorGrid(d);grid[0][0]={kind:'mini'};grid[0][1]={kind:'regular',multiplier:15};
  const round=start([...coinsBaseTickets(d,grid),...empty(45)],'2000');
  assert.equal(round.outcome.bonusAwardMinor,(2000n*(25n+15n+3n*50n)).toString());
});

test('capacity proves a finite bound even when every later new coin arrives on its last allowed respin',()=>{
  const tickets=[...coinsBaseTickets(d,fiveMajorGrid(d)),...empty(30),10,0,...empty(14)];
  for(let emptyCells=14;emptyCells>=1;emptyCells--)tickets.push(...empty(emptyCells*3),0,0,...empty(emptyCells-1));
  const round=start(tickets),frames=round.outcome.bonusFrames;
  assert.equal(frames.length,59);
  assert.ok(frames.length<=4*(20-round.outcome.initialCoinCount));
  assert.equal(frames.at(-1).lockedCells,20);
  assert.equal(frames.at(-1).multiplierApplied,2);
  assert.equal(round.outcome.featureFinishedReason,'full-board');
});

test('base expanding-wild and full MAJOR-board awards attain the full unclamped liability bound',()=>{
  const base=coinsMaximumBase(d);
  for(const betMinor of ['100','2000','5000000',d.limits.maxBetMinor]){
    const round=start([...coinsBaseTickets(d,base),...Array(15).fill(9)],betMinor);
    assert.equal(round.outcome.initialCoinCount,5);
    assert.deepEqual(round.outcome.expandedColumns,[1,2,3]);
    assert.equal(round.outcome.finalCoinValues.length,20);
    assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor}));
    assert.ok(BigInt(round.winMinor)<=999999999999999n);
    assert.equal(round.status,'collected');
    assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});
  }
});

test('public frames are immutable past results and changed coin locks/counters/awards are rejected',()=>{
  const round=start([...coinsBaseTickets(d,fiveMajorGrid(d)),...empty(45)]),before=JSON.stringify(round),view=math.publicRound(round);
  assert.equal(view.private,undefined);assert.equal(view.seed,undefined);
  view.outcome.bonusFrames[0].coinValues[0].multiplier=999;
  assert.equal(JSON.stringify(round),before);
  for(const alter of [
    r=>{r.outcome.bonusFrames[0].coinValues[0].multiplier=25;},
    r=>{r.outcome.bonusFrames[0].respinsRemaining=3;},
    r=>{r.outcome.bonusAwardMinor='0';},
    r=>{r.outcome.finalCoinValues[0].kind='grand';},
    r=>{r.winMinor=String(BigInt(r.winMinor)+1n);},
  ]){const altered=structuredClone(round);alter(altered);assert.throws(()=>math.publicRound(altered));}
});
