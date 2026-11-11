import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';

const id='ind74_official_poweroftiger',d=math.getGameDefinition(id);
const symbols=d.symbols.map(s=>s.id),wild=d.wildSymbol.id;
const noWin=Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>symbols[(r*3+c)%8]));
const gridTickets=grid=>grid.flat().map(id=>id===wild?256:symbols.indexOf(id));
const drawSequence=values=>{
  let index=0;
  return bound=>{assert.ok(index<values.length,'Unexpected extra RNG request.');const value=values[index++];assert.ok(value>=0&&value<bound,'Fixture draw outside bound.');return value;};
};
const start=(values,betMinor='100')=>math.startRound({gameId:id,betMinor,rng:drawSequence(values)});

test('Tiger feature rules and unresolved aggregation choices remain explicitly distinguished',()=>{
  assert.equal(d.mathVersion,'official72-poweroftiger-r4');
  assert.deepEqual(d.baseGameMultiplier.values,[5,10,15,20]);
  assert.equal(d.respinFeature.maximumFrames,9);
  assert.equal(d.respinFeature.providerProbabilitiesVerified,false);
  assert.equal(d.respinFeature.providerAggregationVerified,false);
  assert.equal(d.nominalReturn.verified,false);
  assert.match(d.rules.join(' '),/Provider initial holds and award aggregation remain unverified/);
  assert.match(d.rules.join(' '),/Intermediate feature boards do not create extra payments/);
});

test('identical full base boards and non-identical all-five-line wins select the documented multiplier',()=>{
  const full=Array.from({length:3},()=>Array(3).fill(symbols[0]));
  const first=start([...gridTickets(full),3,1]);
  assert.equal(first.outcome.baseQualifiers.identicalFullBoard,true);
  assert.equal(first.outcome.baseMultiplier,20);
  assert.equal(first.winMinor,(BigInt(first.outcome.baseRawAwardMinor)*20n).toString());
  const mixed=full.map(row=>[...row]);mixed[1][1]=wild;
  const second=start([...gridTickets(mixed),1,1]);
  assert.equal(second.outcome.baseQualifiers.identicalFullBoard,false);
  assert.equal(second.outcome.baseQualifiers.allFiveLinesWin,true);
  assert.equal(second.outcome.baseMultiplier,10);
  assert.equal(second.winMinor,(BigInt(second.outcome.baseRawAwardMinor)*10n).toString());
});

test('a partial base win receives no conditional multiplier',()=>{
  const grid=[[symbols[0],symbols[0],symbols[0]],[symbols[1],symbols[2],symbols[3]],[symbols[4],symbols[5],symbols[6]]];
  const round=start([...gridTickets(grid),1]);
  assert.equal(round.outcome.lineWins.length,1);
  assert.equal(round.outcome.baseMultiplier,1);
  assert.equal(round.outcome.bonusTriggered,false);
  assert.equal(round.winMinor,(100n*BigInt(d.symbols[0].pays[3])/5n).toString());
});

test('partial respins lock selected symbols and wilds, continue on new locks and end immediately on none',()=>{
  const first=[0,8,0,63,63,63,63,63,63];
  const second=[0,0,63,63,63,63];
  const last=[63,63,63,63];
  const round=start([...gridTickets(noWin),0,0,3,...first,...second,...last]);
  const o=round.outcome;
  assert.equal(o.bonusTriggered,true);
  assert.equal(o.featureMultiplier,20);
  assert.deepEqual(o.bonusFrames.map(f=>f.lockedCells),[3,5,5]);
  assert.deepEqual(o.bonusFrames.map(f=>f.newLocks),[3,2,0]);
  assert.deepEqual(o.bonusFrames.map(f=>f.multiplierApplied),[1,1,1]);
  assert.equal(o.bonusFrames[2].grid[0][1],wild);
  assert.equal(o.featureFinishedReason,'no-new-locks');
  assert.equal(o.bonusAwardMinor,(100n*BigInt(d.symbols[0].pays[3])/5n).toString());
  assert.equal(round.winMinor,o.bonusAwardMinor,'Only the final feature board pays; intermediate boards are not accumulated.');
});

test('no-new-locks on the first feature board ends without extra respins or a payment',()=>{
  const round=start([...gridTickets(noWin),0,0,3,...Array(9).fill(63)]);
  assert.equal(round.outcome.bonusFrames.length,1);
  assert.equal(round.outcome.featureFinishedReason,'no-new-locks');
  assert.equal(round.outcome.bonusAwardMinor,'0');
  assert.equal(round.status,'lost');
});

test('nine cells prove the maximum feature length; full boards alone receive the selected feature multiplier',()=>{
  const cells=[];
  for(let remaining=9;remaining>=1;remaining--)cells.push(remaining%2?0:8,...Array(remaining-1).fill(63));
  const round=start([...gridTickets(noWin),0,0,3,...cells]);
  const frames=round.outcome.bonusFrames;
  assert.equal(frames.length,9);
  assert.deepEqual(frames.map(f=>f.lockedCells),[1,2,3,4,5,6,7,8,9]);
  assert.ok(frames.slice(0,-1).every(f=>f.multiplierApplied===1&&!f.terminal));
  assert.equal(frames.at(-1).multiplierApplied,20);
  assert.equal(round.outcome.featureFinishedReason,'full-board');
  assert.equal(frames.at(-1).displayedAwardMinor,(BigInt(frames.at(-1).rawAwardMinor)*20n).toString());
});

test('one fully resolved base-plus-feature result attains the complete reserved bound at small and large stakes',()=>{
  const best=d.symbols.reduce((index,symbol,i)=>symbol.pays[3]>d.symbols[index].pays[3]?i:index,0);
  const full=Array.from({length:3},()=>Array(3).fill(symbols[best]));
  for(const betMinor of ['100','2000','5000000',d.limits.maxBetMinor]) {
    const round=start([...gridTickets(full),3,0,best,3,...Array(9).fill(0)],betMinor);
    assert.equal(round.outcome.baseMultiplier,20);
    assert.equal(round.outcome.featureMultiplier,20);
    assert.equal(round.winMinor,math.maximumPayoutMinor({gameId:id,betMinor}));
    assert.ok(BigInt(round.winMinor)<=999999999999999n);
    assert.equal(round.status,'collected');
    assert.throws(()=>math.collectRound(round),{code:'ROUND_FINISHED'});
    assert.throws(()=>math.advanceRound(round),{code:'ROUND_FINISHED'});
  }
});

test('completed feature frames expose past presentation only and reject altered awards or lock history',()=>{
  const round=start([...gridTickets(noWin),0,0,3,0,8,0,63,63,63,63,63,63,...Array(6).fill(63)]);
  const view=math.publicRound(round),before=JSON.stringify(round);
  assert.equal(view.private,undefined);assert.equal(view.seed,undefined);
  assert.equal(view.outcome.bonusFrames.length,2);
  view.outcome.bonusFrames[0].grid[0][0]='changed';
  assert.equal(JSON.stringify(round),before);
  for(const alter of [
    copy=>{copy.outcome.bonusAwardMinor='999999';},
    copy=>{copy.outcome.bonusFrames[1].grid[0][0]=null;},
    copy=>{copy.outcome.bonusFrames[0].multiplierApplied=20;},
    copy=>{copy.outcome.baseMultiplier=20;},
    copy=>{copy.winMinor=String(BigInt(copy.winMinor)+1n);},
  ]){const copy=structuredClone(round);alter(copy);assert.throws(()=>math.publicRound(copy));}
});
