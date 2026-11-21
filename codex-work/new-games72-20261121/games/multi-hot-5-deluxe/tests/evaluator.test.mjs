import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  evaluatePaylines, GAME_ID, PAYLINES, SYMBOL_PAYOUT_FACTORS,
} from '../evaluator.mjs';

const fixtures = JSON.parse(await readFile(new URL('../payout-fixtures.json', import.meta.url)));
const oneLine = symbolId => [
  ['dollar', 'bell', 'watermelon'],
  [symbolId, symbolId, symbolId],
  ['lemon', 'orange', 'cherry'],
];
const evaluate = (gridRows, totalBetMinor = 5, multiplier = 1) =>
  evaluatePaylines({ gridRows, totalBetMinor, multiplier });
const hasCode = code => error => error?.code === code;

for (const observed of fixtures.boundPaytableSamples) {
  test(`bound ${observed.selectedBetDemo} DMO paytable matches every observed symbol`, () => {
    for (const [symbolId, expectedMinor] of Object.entries(observed.expectedThreeOfKindMinor)) {
      const result = evaluate(oneLine(symbolId), observed.selectedBetMinor, 1);
      assert.equal(result.totalWinMinor, expectedMinor, symbolId);
      assert.equal(result.winningLines.length, 1);
      assert.equal(result.winningLines[0].lineId, 1);
      assert.equal(result.settlementEligible, false);
    }
  });
}

for (const observed of fixtures.capturedWinningRounds) {
  test(`captured ${observed.roundLabel}: grid, multiplier and total payout match`, () => {
    const result = evaluate(observed.gridRows, observed.totalBetMinor, observed.multiplier);
    assert.equal(result.totalWinMinor, observed.totalWinMinor);
    assert.deepEqual(result.winningLines.map(line => line.lineId), observed.winningLineIds);
  });
}

test('each of the five observed multipliers scales the same accepted line', () => {
  for (let multiplier = 1; multiplier <= 5; multiplier += 1) {
    assert.equal(evaluate(oneLine('grapes'), 5, multiplier).totalWinMinor, 20 * multiplier);
  }
});

test('three different horizontal wins add before applying the shared multiplier', () => {
  const result = evaluate([
    ['bell', 'bell', 'bell'],
    ['cherry', 'cherry', 'cherry'],
    ['grapes', 'grapes', 'grapes'],
  ], 10, 3);
  assert.equal(result.baseWinMinor, 110);
  assert.equal(result.totalWinMinor, 330);
  assert.deepEqual(result.winningLines.map(line => [line.lineId, line.baseWinMinor]), [[1, 20], [2, 50], [3, 40]]);
});

test('descending diagonal uses observed line 4 and correct highlight coordinates', () => {
  const result = evaluate([
    ['seven77', 'bell', 'lemon'],
    ['dollar', 'seven77', 'orange'],
    ['plum', 'grapes', 'seven77'],
  ], 5, 2);
  assert.equal(result.totalWinMinor, 150);
  assert.deepEqual(result.winningLines.map(line => line.lineId), [4]);
  assert.deepEqual(result.winningLines[0].cells, [{ row: 0, reel: 0 }, { row: 1, reel: 1 }, { row: 2, reel: 2 }]);
});

test('ascending diagonal uses observed line 5', () => {
  const result = evaluate([
    ['bell', 'dollar', 'seven77'],
    ['grapes', 'seven77', 'plum'],
    ['seven77', 'lemon', 'cherry'],
  ]);
  assert.equal(result.totalWinMinor, 75);
  assert.deepEqual(result.winningLines.map(line => line.lineId), [5]);
});

test('coinciding paylines that share the center cell both contribute', () => {
  const result = evaluate([
    ['cherry', 'bell', 'cherry'],
    ['grapes', 'cherry', 'lemon'],
    ['cherry', 'dollar', 'cherry'],
  ], 5, 3);
  assert.equal(result.totalWinMinor, 60);
  assert.deepEqual(result.winningLines.map(line => line.lineId), [4, 5]);
});

test('all five qualifying lines are summed exactly once', () => {
  const result = evaluate(Array.from({ length: 3 }, () => ['cherry', 'cherry', 'cherry']), 5, 5);
  assert.equal(result.totalWinMinor, 250);
  assert.deepEqual(result.winningLines.map(line => line.lineId), [1, 2, 3, 4, 5]);
});

test('two matching symbols or nonadjacent matches alone do not pay', () => {
  for (const middle of [['cherry', 'cherry', 'bell'], ['cherry', 'bell', 'cherry'], ['bell', 'cherry', 'cherry']]) {
    assert.equal(evaluate([['dollar', 'bell', 'watermelon'], middle, ['lemon', 'orange', 'grapes']]).totalWinMinor, 0);
  }
});

test('symbol groups share pay factors but mixed fruit symbols are not substitutes', () => {
  const result = evaluate([
    ['watermelon', 'grapes', 'watermelon'],
    ['plum', 'lemon', 'orange'],
    ['lemon', 'orange', 'cherry'],
  ]);
  assert.equal(result.totalWinMinor, 0);
  assert.equal(result.winningLines.length, 0);
});

test('synthetic outcomes above published 145x are flagged, never capped or licensed for settlement', () => {
  const result = evaluate(Array.from({ length: 3 }, () => ['seven77', 'seven77', 'seven77']), 5, 5);
  assert.equal(result.totalWinMinor, 1875); // Arithmetic 375x, NOT an assertion of an admissible outcome.
  assert.equal(result.exceedsPublishedDemoMax, true);
  assert.equal(result.outcomeLegalityVerified, false);
  assert.equal(result.settlementEligible, false);
});

test('DMO demo limits are not mistaken for ETB stake authorization', () => {
  for (const bet of [1, 40001]) {
    const result = evaluate(oneLine('cherry'), bet, 1);
    assert.equal(result.totalWinMinor, bet * 2);
    assert.equal(result.settlementEligible, false);
  }
});

test('input grid and frozen rule tables cannot be changed by evaluation', () => {
  const grid = oneLine('bell');
  const before = JSON.stringify(grid);
  const result = evaluate(grid);
  assert.equal(JSON.stringify(grid), before);
  assert.equal(result.gameId, GAME_ID);
  assert.throws(() => { SYMBOL_PAYOUT_FACTORS.bell = 999; }, TypeError);
  assert.throws(() => { PAYLINES[0].rows[0] = 2; }, TypeError);
  assert.throws(() => { result.winningLines[0].cells[0].row = 0; }, TypeError);
});

test('invalid bet amounts are rejected without coercion or rounding', () => {
  for (const bet of [undefined, null, 0, -1, 1.5, NaN, Infinity, '5', 5n, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => evaluatePaylines({ gridRows: oneLine('bell'), totalBetMinor: bet, multiplier: 1 }), hasCode('INVALID_BET'));
  }
});

test('a missing or unobserved multiplier is rejected instead of defaulting to 1x', () => {
  for (const multiplier of [undefined, null, 0, -1, 6, 1.5, NaN, Infinity, '2', 2n]) {
    assert.throws(() => evaluatePaylines({ gridRows: oneLine('bell'), totalBetMinor: 5, multiplier }), hasCode('INVALID_MULTIPLIER'));
  }
});

test('wrong-size and sparse grids are rejected', () => {
  for (const gridRows of [undefined, null, [], [[], [], []], oneLine('bell').slice(0, 2), [...oneLine('bell'), []], new Array(3)]) {
    assert.throws(() => evaluate(gridRows), hasCode('INVALID_GRID'));
  }
  assert.throws(() => evaluate([new Array(3), oneLine('bell')[1], oneLine('bell')[2]]), hasCode('UNKNOWN_SYMBOL'));
});

test('unknown, inherited-key, WILD and scatter symbols are not silently evaluated', () => {
  for (const symbol of ['wild', 'scatter', 'toString', '__proto__', 'seven', '', null, 7]) {
    const grid = oneLine('bell');
    grid[0][0] = symbol;
    assert.throws(() => evaluate(grid), hasCode('UNKNOWN_SYMBOL'));
  }
});

test('invalid top-level input is rejected', () => {
  for (const input of [null, undefined, 5, 'spin', []]) {
    assert.throws(() => evaluatePaylines(input), hasCode('INVALID_INPUT'));
  }
});

test('large but exactly representable payout uses integer arithmetic', () => {
  const bet = Math.floor(Number.MAX_SAFE_INTEGER / 15);
  assert.equal(evaluate(oneLine('seven77'), bet).totalWinMinor, Number(BigInt(bet) * 15n));
});

test('individual line, multiplier and aggregate payout overflow are each rejected', () => {
  assert.throws(() => evaluate(oneLine('seven77'), Number.MAX_SAFE_INTEGER), hasCode('PAYOUT_OVERFLOW'));
  assert.throws(() => evaluate(oneLine('seven77'), Math.floor(Number.MAX_SAFE_INTEGER / 15), 5), hasCode('PAYOUT_OVERFLOW'));
  assert.throws(() => evaluate(Array.from({ length: 3 }, () => ['cherry', 'cherry', 'cherry']), Math.floor(Number.MAX_SAFE_INTEGER / 6)), hasCode('PAYOUT_OVERFLOW'));
});

test('large losing stake returns exact zero without speculative award multiplication', () => {
  const result = evaluate([
    ['seven77', 'dollar', 'bell'],
    ['watermelon', 'grapes', 'plum'],
    ['lemon', 'orange', 'cherry'],
  ], Number.MAX_SAFE_INTEGER, 5);
  assert.equal(result.totalWinMinor, 0);
  assert.equal(result.exceedsPublishedDemoMax, false);
});
