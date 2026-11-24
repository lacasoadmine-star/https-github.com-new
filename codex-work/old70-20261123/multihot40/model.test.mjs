import test from 'node:test';
import {MH40_LINES, MH40_LINE_PROVENANCE} from './line-paths.mjs';
import assert from 'node:assert/strict';
import {MH40_MODEL, minorAmount, validateBetMinor, validateLinePaths, validateGrid, evaluateGrid,
  secureIndex, sampleRound} from './model.mjs';

// Synthetic geometry exercises the evaluator; it is deliberately not shipped as
// Multi Hot 40's unverified provider line geometry.
const lines = () => Array.from({length: 40}, (_, index) => {
  let value = index;
  return Array.from({length: 5}, () => { const row = value % 4; value = Math.floor(value / 4); return row; });
});
const board = row => Array.from({length: 4}, () => [...row]);

test('requires forty explicit distinct four-row line paths, including dense coordinates', () => {
  assert.throws(() => validateLinePaths(), /40_EXPLICIT_LINES/);
  assert.throws(() => validateLinePaths(lines().slice(1)), /40_EXPLICIT_LINES/);
  const duplicate = lines(); duplicate[39] = duplicate[0];
  assert.throws(() => validateLinePaths(duplicate), /DUPLICATE_LINE_PATH/);
  const outside = lines(); outside[0][1] = 4;
  assert.throws(() => validateLinePaths(outside), /INVALID_LINE_PATH/);
  assert.throws(() => validateLinePaths(Array(40)), /INVALID_LINE_PATH/);
  const sparse = lines(); delete sparse[0][1];
  assert.throws(() => validateLinePaths(sparse), /INVALID_LINE_PATH/);
  const paths = lines(), accepted = validateLinePaths(paths); paths[0][0] = 3;
  assert.equal(accepted[0][0], 0);
  assert.equal(Object.isFrozen(accepted[0]), true);
});

test('rejects invalid money and preserves integer line denominations without rounding', () => {
  for (const value of ['1.2', '-40', '040', 'Infinity', NaN, 1.5, null, undefined])
    assert.throws(() => minorAmount(value), /INVALID_MINOR_AMOUNT/);
  assert.equal(minorAmount(40), 40n);
  assert.equal(validateBetMinor(80n), 80n);
  assert.throws(() => validateBetMinor('0'), /INVALID_MINOR_AMOUNT/);
  assert.throws(() => validateBetMinor('100'), /BET_DENOMINATION/);
  assert.throws(() => minorAmount('9007199254740992'), /INVALID_MINOR_AMOUNT/);
});

test('only accepts a complete 4x5 board of the eight title-specific symbol indices', () => {
  assert.deepEqual(validateGrid(board([0, 1, 2, 3, 4])), board([0, 1, 2, 3, 4]));
  assert.throws(() => validateGrid(Array(4)), /INVALID_GRID/);
  const sparse = board([0, 1, 2, 3, 4]); delete sparse[0][0];
  assert.throws(() => validateGrid(sparse), /INVALID_GRID/);
  assert.throws(() => validateGrid(board([0, 1, 2, 3, 8])), /INVALID_GRID/);
  assert.throws(() => validateGrid(board([0, 1, 2, 3, '4'])), /INVALID_GRID/);
});

test('matches all captured MH40 symbol coefficients for longest 3,4,5 matches', () => {
  for (let symbol = 0; symbol < 8; symbol++) {
    for (const count of [3, 4, 5]) {
      const row = Array(5).fill(symbol);
      if (count < 5) row[count] = (symbol + 1) % 8;
      const result = evaluateGrid({grid: board(row), betMinor: '40', multiplier: 3, linePaths: lines()});
      assert.equal(result.wins.length, 40);
      assert.equal(result.baseWinMinor, String(40 * MH40_MODEL.coefficients[symbol][count - 3]));
      assert.equal(result.winMinor, String(120 * MH40_MODEL.coefficients[symbol][count - 3]));
      assert.ok(result.wins.every(win => win.count === count && win.positions.length === count));
    }
  }
});

test('does not pay right-to-left matches or two matches; sums winning lines once', () => {
  for (const row of [[0, 1, 1, 1, 1], [0, 0, 1, 1, 1]]) {
    const result = evaluateGrid({grid: board(row), betMinor: '40', multiplier: 5, linePaths: lines()});
    assert.equal(result.winMinor, '0');
    assert.equal(result.wins.length, 0);
  }
  const win = evaluateGrid({grid: board([0, 0, 0, 1, 2]), betMinor: '80', multiplier: 2, linePaths: lines()});
  assert.equal(win.winMinor, '3200');
  assert.deepEqual(win.wins[0].positions, [{row: 0, column: 0}, {row: 0, column: 1}, {row: 0, column: 2}]);
});

test('multiplier and stake are applied exactly with no assumed RTP or cash approval', () => {
  const input = {grid: board([0, 0, 0, 0, 0]), linePaths: lines()};
  const result = evaluateGrid({...input, betMinor: '40', multiplier: 5});
  assert.equal(result.baseWinMinor, '20000');
  assert.equal(result.winMinor, '100000');
  for (const multiplier of [0, 6, 1.5, '2']) assert.throws(() =>
    evaluateGrid({...input, betMinor: '40', multiplier}), /INVALID_MULTIPLIER/);
  assert.equal(result.cashEnabled, false);
  assert.equal(result.providerRtpVerified, false);
  assert.equal(MH40_MODEL.rtp, null);
});

test('secure sampler rejects the modulo-bias tail and fails a persistently bad source', () => {
  const values = [0xFFFFFFFF, 4];
  let calls = 0;
  assert.equal(secureIndex(5, array => { calls++; array[0] = values.shift(); }), 4);
  assert.equal(calls, 2);
  assert.throws(() => secureIndex(5, array => { array[0] = 0xFFFFFFFF; }), /RANDOM_SOURCE_REJECTED/);
  assert.throws(() => secureIndex(0), /INVALID_RANDOM_SOURCE/);
});

test('independent candidate sampler uses fresh injected entropy for every cell and wheel', () => {
  let calls = 0;
  const result = sampleRound({betMinor: '40', linePaths: lines(), randomValues: array => {
    array[0] = calls === 20 ? 4 : calls % 8; calls++;
  }});
  assert.equal(calls, 21);
  assert.equal(result.multiplier, 5);
  assert.deepEqual(result.grid[0], [0, 1, 2, 3, 4]);
  assert.equal(result.probabilityModel, 'independent_uniform_cells_and_multiplier');
  assert.equal(result.providerRtpVerified, false);
});

test('all forty current official paths are dense, distinct and retain the chart provenance', () => {
  assert.equal(validateLinePaths(MH40_LINES).length, 40);
  assert.deepEqual(MH40_LINES.slice(0, 4), [0, 1, 2, 3].map(row => Array(5).fill(row)));
  assert.equal(MH40_LINE_PROVENANCE.sourceSHA256, '2a4b17a7377279ca0241ddd2087c80040d1084796d809d23373faa71371f5c9b');
  assert.equal(MH40_LINE_PROVENANCE.sourceWidth, 1442);
  assert.equal(MH40_LINE_PROVENANCE.sourceHeight, 2681);
  assert.equal(Object.isFrozen(MH40_LINES[39]), true);
});

test('evaluates each of the forty actual chart paths at its numbered positions', () => {
  for (const [index, path] of MH40_LINES.entries()) {
    const grid = Array.from({length: 4}, (_, row) =>
      Array.from({length: 5}, (_, column) => (row + column) % 7 + 1));
    path.forEach((row, column) => { grid[row][column] = 0; });
    const result = evaluateGrid({grid, betMinor: '40', multiplier: 3, linePaths: MH40_LINES});
    const target = result.wins.find(win => win.line === index + 1);
    assert.ok(target, 'Line ' + (index + 1) + ' must pay its complete matching path');
    assert.equal(target.count, 5);
    assert.equal(target.symbol, 0);
    assert.equal(target.winMinor, '1500');
    assert.deepEqual(target.positions, path.map((row, column) => ({row, column})));
    assert.equal(result.wins.filter(win => win.symbol === 0 && win.count === 5).length, 1);
  }
});

test('current official V and inverted-V line numbers pay without other false winning paths', () => {
  const grid = [[0,1,2,3,0],[4,0,5,0,6],[1,2,0,4,5],[6,7,1,2,3]];
  const result = evaluateGrid({grid, betMinor: '40', multiplier: 4, linePaths: MH40_LINES});
  assert.equal(result.wins.length, 1);
  assert.equal(result.wins[0].line, 39);
  assert.equal(result.winMinor, '2000');
  const inverted = [[0,1,2,3,4],[5,6,7,0,1],[2,7,4,7,6],[7,0,1,2,7]];
  const other = evaluateGrid({grid: inverted, betMinor: '40', multiplier: 3, linePaths: MH40_LINES});
  assert.equal(other.wins.length, 1);
  assert.equal(other.wins[0].line, 40);
  assert.equal(other.winMinor, '150');
});

test('practice stake validation admits every visible level and rejects unlisted or excessive values', () => {
  for (const level of MH40_MODEL.betLevelsMinor) assert.equal(validateBetMinor(level), BigInt(level));
  for (const bet of ['280', '240', '40000', '1000000', '9007199254740960'])
    assert.throws(() => validateBetMinor(bet), /BET_NOT_ALLOWED/);
  assert.equal(MH40_MODEL.minBetMinor, MH40_MODEL.betLevelsMinor[0]);
  assert.equal(MH40_MODEL.maxBetMinor, MH40_MODEL.betLevelsMinor.at(-1));
});
