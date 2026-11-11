import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import * as math from '../math/official72.mjs';
import {evaluatePublicWildGrid} from '../math/official72-mechanics.mjs';
const d=math.getGameDefinition('ind74_official_multihot5burnwilds');
const board=(symbol,matches)=>Array.from({length:3},()=>Array.from({length:5},(_,col)=>d.symbols[col<matches?symbol:(symbol+1)%8].id));
const start=(grid,betMinor='100',holdWin=false,wheel=1)=>{let cursor=0;return math.startRound({gameId:d.id,betMinor,options:{holdWin},rng:()=>{
  const index=cursor++;if(index>=15)return wheel-1;
  return d.symbols.findIndex(s=>s.id===grid[Math.floor(index/5)][index%5]);
}});};

test('Burn r5 encodes the observed0.10DMO paytable exactly, including two Seven and half-unit line prizes',async()=>{
  assert.equal(d.mathVersion,'official72-multihot5burnwilds-r5');assert.equal(d.symbolPrizeDivisor,2);
  await access(new URL('../'+d.observedPaytable.source,import.meta.url));
  const displayed=[{2:5,3:40,4:100,5:1000},{3:10,4:20,5:100},{3:20,4:40,5:200},{3:20,4:40,5:200},
    {3:5,4:10,5:50},{3:5,4:10,5:50},{3:5,4:10,5:50},{3:5,4:10,5:50}];
  for(const[index,awards]of displayed.entries())for(const[count,expected]of Object.entries(awards)){
    // Pure evaluator reproduces the displayed denomination; no wager or wallet
    // operation accepts this sub-ETB amount.
    const scored=evaluatePublicWildGrid(d,'10',board(index,Number(count)));
    assert.equal(scored.lineWins.length,5);assert.ok(scored.lineWins.every(line=>line.winMinor===String(expected)));
    assert.ok(scored.lineWins.every(line=>line.matches===Number(count)));
  }
  for(let index=1;index<8;index++)assert.equal(evaluatePublicWildGrid(d,'100',board(index,2)).winMinor,'0');
});

test('rational prizes floor money exactly and public award metadata carries the actual multiplier',()=>{
  const scored=evaluatePublicWildGrid(d,'103',board(0,2));
  assert.equal(scored.winMinor,'255');
  for(const line of scored.lineWins){assert.equal(line.winMinor,'51');assert.equal(line.multiplier,2.5);assert.equal(line.prizeNumerator,5);assert.equal(line.prizeDenominator,2);}
  const direct=start(board(0,2),'100',false,5);
  assert.equal(direct.winMinor,'1250');assert.equal(direct.outcome.reelMultiplier,5);
  assert.equal(direct.outcome.lineWins[0].multiplier,2.5);assert.equal(direct.outcome.lineWins[0].winMinor,'250');
});

test('observed rational awards retain the full2500x base bound and all optional doublings without clamping to unverified1300x',()=>{
  for(const betMinor of ['100','2000','4000100',d.limits.maxBetMinor]){
    let r=start(board(0,5),betMinor,true,5);const initial=BigInt(betMinor)*2500n;
    assert.equal(r.pendingWinMinor,initial.toString());assert.equal(r.betMinor,betMinor);
    const maximum=math.maximumPayoutMinor({gameId:d.id,betMinor,options:{holdWin:true}});assert.equal(maximum,(initial*8n).toString());
    for(let step=0;step<3;step++)r=math.advanceRound(r,{color:'red'},undefined,()=>0);
    assert.equal(r.winMinor,maximum);assert.ok(BigInt(r.winMinor)<=999999999999999n);
  }
  assert.equal(d.observedPaytable.publishedMaximumMultiplier,1300);assert.equal(d.observedPaytable.maximumCouplingVerified,false);
});

test('unreviewed expansion return is explicitly blocked and never replaced by the displayed provider RTP',()=>{
  assert.equal(d.releaseReview.realMoneyAdmissionBlocked,true);
  assert.ok(d.releaseReview.codes.includes('INDEPENDENT_EXPANDING_WILD_RETURN_UNREVIEWED'));
  assert.equal(d.releaseReview.independentAnalyticReturn.verified,false);assert.equal(d.nominalReturn.verified,false);
  assert.match(d.rules.join(' '),/REAL-MONEY ADMISSION IS BLOCKED/);
  assert.equal(d.wildRule.providerProbabilitiesVerified,false);
});
