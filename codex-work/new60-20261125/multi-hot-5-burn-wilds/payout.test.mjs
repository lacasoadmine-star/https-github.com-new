import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { quoteObservedFinalGrid, ReferenceQuoteError } from './payout.mjs';
import { OBSERVED_CONFIG } from './observed-config.mjs';

const nonwinningGrid = () => [
  ['lemon', 'seven', 'bell'],
  ['plum', 'grapes', 'orange'],
  ['cherry', 'watermelon', 'plum'],
  ['orange', 'bell', 'lemon'],
  ['grapes', 'cherry', 'watermelon'],
];

function quote(grid, overrides = {}) {
  return quoteObservedFinalGrid({
    grid, currency: 'DMO', betMinorUnits: 10,
    winningMultiplier: 1, finalExpansionComplete: true, ...overrides,
  });
}

function winningGrid(symbol, count, lineId = 1) {
  const grid = nonwinningGrid();
  const line = OBSERVED_CONFIG.paylines.find(value => value.id === lineId);
  for (let column = 0; column < count; column++) grid[column][line.rows[column]] = symbol;
  if (count < 5) grid[count][line.rows[count]] = symbol === 'seven' ? 'lemon' : 'seven';
  return grid;
}

test('quotes the exact independently observed 0.10 and 0.20 DMO amounts', () => {
  const displayed = {
    seven: { 2: 5, 3: 40, 4: 100, 5: 1000 },
    grapes: { 3: 20, 4: 40, 5: 200 },
    watermelon: { 3: 20, 4: 40, 5: 200 },
    bell: { 3: 10, 4: 20, 5: 100 },
    lemon: { 3: 5, 4: 10, 5: 50 },
    plum: { 3: 5, 4: 10, 5: 50 },
    orange: { 3: 5, 4: 10, 5: 50 },
    cherry: { 3: 5, 4: 10, 5: 50 },
  };
  for (const [symbol, paytable] of Object.entries(displayed)) {
    for (const [count, amount] of Object.entries(paytable)) {
      for (const betMinorUnits of [10, 20]) {
        const line = quote(winningGrid(symbol, Number(count)), { betMinorUnits }).lineQuotes[0];
        assert.equal(line.baseMinorUnits, amount * (betMinorUnits / 10), `${symbol}:${count}:${betMinorUnits}`);
        assert.equal(line.matchedCount, Number(count));
      }
    }
  }
});

test('uses all five fixed lines and pays only the longest adjacent leftmost run on each', () => {
  for (const lineId of [1, 2, 3, 4, 5]) {
    const result = quote(winningGrid('seven', 5, lineId));
    const line = result.lineQuotes.find(value => value.lineId === lineId);
    assert.equal(line.baseMinorUnits, 1000);
    assert.equal(line.matchedCount, 5);
  }
  assert.equal(quote(nonwinningGrid()).hasWinningLine, false);
  const grid = winningGrid('seven', 2);
  grid[3][1] = 'seven'; grid[4][1] = 'seven';
  assert.equal(quote(grid).lineQuotes[0].baseMinorUnits, 5, 'matching symbols after a gap do not extend a run');
  const rightOnly = nonwinningGrid();
  rightOnly[2][1] = 'seven'; rightOnly[3][1] = 'seven'; rightOnly[4][1] = 'seven';
  assert.equal(quote(rightOnly).lineQuotes[0].baseMinorUnits, 0, 'right-side runs do not pay');
});

test('substitutes already expanded wilds on the permitted reels without generating an expansion', () => {
  const grid = winningGrid('seven', 5);
  for (const column of [1, 2, 3]) grid[column] = ['wild', 'wild', 'wild'];
  const before = structuredClone(grid);
  const result = quote(grid, { winningMultiplier: 5 });
  assert.equal(result.lineQuotes[0].baseMinorUnits, 1000);
  assert.equal(result.lineQuotes[0].multipliedMinorUnits, 5000);
  assert.deepEqual(result.lineQuotes[0].wildColumns, [1, 2, 3]);
  assert.deepEqual(grid, before);
  assert.equal(result.outcomeGenerated, false);
});

test('applies every supplied observed multiplier with exact integer arithmetic', () => {
  for (const winningMultiplier of [1, 2, 3, 4, 5]) {
    const line = quote(winningGrid('seven', 2), { winningMultiplier }).lineQuotes[0];
    assert.equal(line.multipliedMinorUnits, 5 * winningMultiplier);
    assert.equal(Number.isSafeInteger(line.multipliedMinorUnits), true);
  }
});

test('matches the freshly observed official spin 04 single-line cherry win', () => {
  const observed = JSON.parse(readFileSync(new URL('./fixtures/official-spin-04.json', import.meta.url), 'utf8'));
  const result = quoteObservedFinalGrid(observed.input);
  assert.equal(result.gameId, observed.gameId);
  assert.deepEqual(result.lineQuotes.map(line => line.winning), [false, false, true, false, false]);
  const line = result.lineQuotes.find(value => value.winning);
  for (const [key, value] of Object.entries(observed.observedWinningLine)) {
    assert.deepEqual(line[key], value, key);
  }
  assert.equal(line.multipliedMinorUnits, observed.observedDisplayedWinMinorUnits);
  assert.equal(result.aggregationVerified, false, 'one winning line cannot prove concurrent-line aggregation');
  assert.equal(result.settlementAuthorized, false);
});

test('does not assert an aggregate round payout or authorize settlement', () => {
  const result = quote(Array.from({ length: 5 }, () => ['seven', 'seven', 'seven']));
  assert.equal(result.lineQuotes.filter(line => line.winning).length, 5);
  assert.equal(result.aggregationVerified, false);
  assert.equal(result.settlementAuthorized, false);
  for (const key of ['totalWin', 'totalWinMinorUnits', 'payout', 'balance', 'roundId', 'rtp']) {
    assert.equal(Object.hasOwn(result, key), false);
  }
});

test('rejects inputs requiring unobserved facts or a financial currency', () => {
  const checks = [
    [{ currency: 'ETB' }, 'UNVERIFIED_CURRENCY'],
    [{ betMinorUnits: 30 }, 'UNVERIFIED_BET'],
    [{ betMinorUnits: 0.1 }, 'UNVERIFIED_BET'],
    [{ betMinorUnits: '10' }, 'UNVERIFIED_BET'],
    [{ winningMultiplier: 0 }, 'INVALID_MULTIPLIER'],
    [{ winningMultiplier: 6 }, 'INVALID_MULTIPLIER'],
    [{ winningMultiplier: 1.5 }, 'INVALID_MULTIPLIER'],
    [{ winningMultiplier: '1' }, 'INVALID_MULTIPLIER'],
    [{ finalExpansionComplete: false }, 'FINAL_GRID_REQUIRED'],
    [{ finalExpansionComplete: undefined }, 'FINAL_GRID_REQUIRED'],
    [{ totalWin: 100 }, 'UNSUPPORTED_INPUT'],
    [{ grid: new Array(5) }, 'INVALID_GRID'],
    [{ grid: Array.from({ length: 5 }, () => new Array(3)) }, 'INVALID_GRID'],
    [{ grid: Array.from({ length: 5 }, () => ['unknown', 'seven', 'seven']) }, 'INVALID_GRID'],
  ];
  for (const [overrides, code] of checks) {
    assert.throws(() => quote(nonwinningGrid(), overrides), error => error instanceof ReferenceQuoteError && error.code === code);
  }
  for (const column of [0, 4]) {
    const grid = nonwinningGrid(); grid[column][0] = 'wild';
    assert.throws(() => quote(grid), { code: 'INVALID_WILD_POSITION' });
  }
  const unexpanded = winningGrid('seven', 5); unexpanded[1][1] = 'wild';
  assert.throws(() => quote(unexpanded), { code: 'UNEXPANDED_WINNING_WILD' });
});

test('freezes reference configuration and quote records', () => {
  assert.throws(() => { OBSERVED_CONFIG.paylines[0].rows[0] = 0; }, TypeError);
  assert.throws(() => { OBSERVED_CONFIG.paytableMinorUnits.seven[5] = 1; }, TypeError);
  const result = quote(nonwinningGrid());
  assert.throws(() => { result.lineQuotes[0].baseMinorUnits = 1000; }, TypeError);
});
