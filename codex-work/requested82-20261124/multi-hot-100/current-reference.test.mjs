import assert from 'node:assert/strict';
import test from 'node:test';
import {validateM100RoundView,MULTI_HOT_100_GAME_ID} from './controls.mjs';
import {quoteM100Grid} from './rules/quote.mjs';

// Separately initiated current public DMO round, visually transcribed on
// 24 November2026. No production account or financial fixture is involved.
const grid=[['orange','orange','orange','watermelon','bell'],
  ['orange','orange','orange','orange','bell'],
  ['lemon','orange','orange','orange','bell'],
  ['lemon','orange','cherry','orange','plum']];

test('fresh NICE WIN with its corrected line46 is accepted without discarding the real result',()=>{
  const quote=quoteM100Grid({grid,betMinor:100n,multiplier:3});
  assert.equal(quote.winMinor,1260n);
  assert.equal(quote.lines.find(x=>x.lineId===46).winMinor,15n);
  const receipt={gameId:MULTI_HOT_100_GAME_ID,requestKey:'current-reference-001',roundId:'reference-round-001',
    bet:'1.00',winAmount:'12.60',grid,multiplier:3,winTier:'NICE WIN',winningLines:quote.lines.map(x=>x.lineId)};
  const view=validateM100RoundView(receipt);
  assert.equal(view.winTier,'NICE WIN');assert.equal(view.winningLines.length,49);
  assert(view.winningLines.includes(46));
  assert.throws(()=>validateM100RoundView({...receipt,winningLines:[101]}),/WINNING_LINE/);
  assert.throws(()=>validateM100RoundView({...receipt,winningLines:[46,46]}),/WINNING_LINE/);
});
