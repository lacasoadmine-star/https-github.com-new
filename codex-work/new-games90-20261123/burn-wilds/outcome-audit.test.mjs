import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_WILDS_GAME_ID} from './expansion.mjs';
import {auditBurnWildsPayout,quoteBurnWildsFinalGrid} from './outcome-audit.mjs';

const losingGrid = () => [
  ['orange','lemon','plum'], ['bell','cherry','watermelon'],
  ['seven','grapes','orange'], ['plum','lemon','bell'],
  ['grapes','watermelon','cherry']
];
const winningGrid = () => [
  ['orange','seven','plum'], ['bell','seven','watermelon'],
  ['seven','seven','orange'], ['plum','seven','bell'],
  ['grapes','seven','cherry']
];
function receipt(grid=losingGrid(), betMinor=10, multiplier=2) {
  const quote = quoteBurnWildsFinalGrid({finalGrid:grid,betMinor,multiplier});
  return {
    gameId:BURN_WILDS_GAME_ID, roundId:'burn-audited-01',
    originalGrid:structuredClone(grid), finalGrid:structuredClone(grid),
    expandedColumns:[], winLines:quote.winLines.map(({id,rows,winMinor})=>({id,rows:[...rows],winMinor})),
    multiplier,betMinor,winMinor:quote.totalWinMinor,balanceMinor:10000
  };
}
test('loss quote checks all five paylines without a fabricated win',()=>{
  const quote=quoteBurnWildsFinalGrid({finalGrid:losingGrid(),betMinor:10,multiplier:2});
  assert.equal(quote.totalWinMinor,0);
  assert.deepEqual(quote.winLines,[]);
  const audited=auditBurnWildsPayout(receipt());
  assert.equal(audited.payoutConsistent,true);
  assert.equal(audited.winMinor,0);
  assert.equal(audited.liveSettlementVerified,false);
  assert.equal(audited.probabilityModelVerified,false);
});
test('winning receipt must match five-seven payline and 2x wheel payout',()=>{
  const r=receipt(winningGrid());
  assert.equal(r.winMinor,2000);
  assert.deepEqual(r.winLines,[{id:1,rows:[1,1,1,1,1],winMinor:2000}]);
  const audited=auditBurnWildsPayout(r);
  assert.equal(audited.lineCount,1);
  assert.equal(audited.multiplier,2);
  assert.equal(audited.betMinor,10);
  assert.equal(audited.winMinor,2000);
});
test('a declared reel-2 expansion may change only its own symbols; all new cross-line wins are checked',()=>{
  const r=receipt(winningGrid());
  r.originalGrid[1][1]='wild';
  r.finalGrid[1]=['wild','wild','wild'];
  r.expandedColumns=[1];
  const q=quoteBurnWildsFinalGrid({finalGrid:r.finalGrid,betMinor:r.betMinor,multiplier:r.multiplier});
  r.winLines=q.winLines.map(({id,rows,winMinor})=>({id,rows:[...rows],winMinor}));
  r.winMinor=q.totalWinMinor;
  assert.equal(auditBurnWildsPayout(r).payoutConsistent,true);
  const invented=structuredClone(r);
  invented.finalGrid[2][0]='wild';
  assert.throws(()=>auditBurnWildsPayout(invented),/UNDECLARED_GRID_CHANGE/);
});
test('fake win amount, missing winning line and wrong payline rows all fail closed',()=>{
  const r=receipt(winningGrid());
  const inflated=structuredClone(r);inflated.winMinor++;
  assert.throws(()=>auditBurnWildsPayout(inflated),/TOTAL_MISMATCH/);
  const missing=structuredClone(r);missing.winLines=[];
  assert.throws(()=>auditBurnWildsPayout(missing),/LINE_COUNT_MISMATCH/);
  const wrongAmount=structuredClone(r);wrongAmount.winLines[0].winMinor++;
  assert.throws(()=>auditBurnWildsPayout(wrongAmount),/LINE_MISMATCH/);
  const wrongRows=structuredClone(r);wrongRows.winLines[0].rows=[0,0,0,0,0];
  assert.throws(()=>auditBurnWildsPayout(wrongRows),/LINE_MISMATCH/);
});
test('duplicate, out-of-range and fabricated positive winning lines fail closed',()=>{
  const r=receipt(winningGrid());
  const duplicate=structuredClone(r);duplicate.winLines.push(structuredClone(r.winLines[0]));
  assert.throws(()=>auditBurnWildsPayout(duplicate),/LINE_COUNT_MISMATCH/);
  const outOfRange=structuredClone(r);outOfRange.winLines[0].id=6;
  assert.throws(()=>auditBurnWildsPayout(outOfRange),/LINE_ID/);
  const fake=receipt();fake.winLines=[{id:1,rows:[1,1,1,1,1],winMinor:1}];
  assert.throws(()=>auditBurnWildsPayout(fake),/LINE_COUNT_MISMATCH/);
});
test('missing financial terms, wrong game and invalid stakes cannot reach a settlement gate',()=>{
  const r=receipt(winningGrid());
  const noStake=structuredClone(r);delete noStake.betMinor;
  assert.throws(()=>auditBurnWildsPayout(noStake),/FINANCIAL_FIELDS_REQUIRED/);
  const noMultiplier=structuredClone(r);delete noMultiplier.multiplier;
  assert.throws(()=>auditBurnWildsPayout(noMultiplier),/FINANCIAL_FIELDS_REQUIRED/);
  const wrongGame=structuredClone(r);wrongGame.gameId='foreign-game';
  assert.throws(()=>auditBurnWildsPayout(wrongGame),/BURN_WILDS_RECEIPT/);
  assert.throws(()=>quoteBurnWildsFinalGrid({finalGrid:losingGrid(),betMinor:0,multiplier:2}),/OUTCOME_STAKE/);
  assert.throws(()=>quoteBurnWildsFinalGrid({finalGrid:losingGrid(),betMinor:10,multiplier:6}),/OUTCOME_MULTIPLIER/);
});
