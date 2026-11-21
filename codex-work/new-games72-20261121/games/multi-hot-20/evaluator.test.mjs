import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inspectCandidateLines, quoteObservedLine } from './evaluator.mjs';

const request = (symbol, matchedReels, totalBetMinor = 20, multiplier = 1) => ({ symbol, matchedReels, totalBetMinor, multiplier });
const all = (symbol) => Array.from({ length: 3 }, () => Array(5).fill(symbol));
const inspect = (rows, totalBetMinor = 20, multiplier = 1) => inspectCandidateLines({ rows, totalBetMinor, multiplier });
const quote = (...args) => quoteObservedLine(request(...args));

test('refreshed 0.20 DMO screenshot values bind all eight symbols and three match lengths', () => {
  const expected = {
    seven: [50, 400, 2000], bell: [20, 100, 200],
    grapes: [10, 50, 100], watermelon: [10, 50, 100],
    lemon: [5, 10, 50], plum: [5, 10, 50], orange: [5, 10, 50], cherry: [5, 10, 50],
  };
  for (const [symbol, amounts] of Object.entries(expected)) {
    for (let offset = 0; offset < 3; offset += 1) {
      const result = quote(symbol, offset + 3);
      assert.equal(result.beforeMultiplier.exactMinor, amounts[offset], `${symbol}/${offset + 3}`);
      assert.equal(result.afterMultiplier.exactMinor, amounts[offset]);
      assert.equal(result.reference.source, 'REFRESHED_0_20_DMO_TABLE');
      assert.equal(result.settlementEligible, false);
    }
  }
});

test('0.40 DMO preview independently confirms scaling for the four fully visible symbol groups', () => {
  const expected = { seven: [100, 800, 4000], bell: [40, 200, 400], grapes: [20, 100, 200], watermelon: [20, 100, 200] };
  for (const [symbol, amounts] of Object.entries(expected)) {
    for (let offset = 0; offset < 3; offset += 1) assert.equal(quote(symbol, offset + 3, 40).afterMultiplier.exactMinor, amounts[offset]);
  }
});

test('the inconsistent first paint is not accepted as a paytable amount', () => {
  assert.equal(quote('seven', 3).beforeMultiplier.exactMinor, 50);
  assert.equal(quote('bell', 3).beforeMultiplier.exactMinor, 20);
  assert.equal(quote('lemon', 3).beforeMultiplier.exactMinor, 5);
});

test('documented multiplier applies exactly once to a candidate', () => {
  for (let multiplier = 1; multiplier <= 5; multiplier += 1) {
    const result = quote('seven', 5, 20, multiplier);
    assert.equal(result.beforeMultiplier.exactMinor, 2000);
    assert.equal(result.afterMultiplier.exactMinor, 2000 * multiplier);
  }
});

test('fractional minor units remain exact rationals and are never rounded', () => {
  assert.deepEqual(quote('cherry', 3, 1, 3).afterMultiplier, {
    numerator: '3', denominator: '4', exactMinor: null, roundingApplied: false,
  });
  assert.deepEqual(quote('cherry', 3, 1, 4).afterMultiplier, {
    numerator: '1', denominator: '1', exactMinor: 1, roundingApplied: false,
  });
});

test('already-bound table amounts are not multiplied by the chart length or divided twice', () => {
  assert.equal(quote('seven', 5, 20, 1).afterMultiplier.exactMinor, 2000);
});

test('right-hand runs do not pay without a matching leftmost prefix', () => {
  assert.equal(inspect(Array.from({ length: 3 }, () => ['bell', 'lemon', 'seven', 'seven', 'seven'])).candidates.length, 0);
});

test('two symbols or a gap cannot be promoted to a three-symbol prefix', () => {
  assert.equal(inspect(Array.from({ length: 3 }, () => ['seven', 'seven', 'bell', 'seven', 'seven'])).candidates.length, 0);
});

test('four-symbol prefix quotes only its longest match, not nested three-symbol wins', () => {
  const result = inspect(Array.from({ length: 3 }, () => ['bell', 'bell', 'bell', 'bell', 'lemon']));
  assert.equal(result.candidates.length, 20);
  assert.ok(result.candidates.every((line) => line.matchedReels === 4 && line.afterMultiplier.exactMinor === 100));
});

test('twenty five-symbol candidates stay individually quoted with no invented settlement', () => {
  const result = inspect(all('seven'), 20, 5);
  assert.equal(result.candidates.length, 20);
  assert.equal(new Set(result.candidates.map((line) => line.line)).size, 20);
  assert.ok(result.candidates.every((line) => line.matchedReels === 5 && line.afterMultiplier.exactMinor === 10000));
  assert.equal(result.aggregatePayoutMinor, null);
  assert.equal(result.aggregationPolicy, 'UNRESOLVED');
  assert.equal(result.settlementEligible, false);
  assert.equal(result.legalOutcomeVerified, false);
  assert.equal(result.randomOutcomeGenerated, false);
});

test('line 12 follows the four top-row symbols then the middle symbol from the observed chart', () => {
  const rows = [
    ['seven', 'seven', 'seven', 'seven', 'bell'],
    ['orange', 'lemon', 'grapes', 'plum', 'seven'],
    ['cherry', 'bell', 'orange', 'watermelon', 'cherry'],
  ];
  const line = inspect(rows).candidates.find((candidate) => candidate.line === 12);
  assert.deepEqual(line.rows, [0, 0, 0, 0, 1]);
  assert.equal(line.matchedReels, 5);
  assert.equal(line.afterMultiplier.exactMinor, 2000);
});

test('line 20 follows middle-bottom-middle-bottom-middle without borrowing another chart', () => {
  const rows = [
    ['bell', 'lemon', 'cherry', 'grapes', 'orange'],
    ['seven', 'bell', 'seven', 'lemon', 'seven'],
    ['orange', 'seven', 'cherry', 'seven', 'watermelon'],
  ];
  const line = inspect(rows, 20, 3).candidates.find((candidate) => candidate.line === 20);
  assert.deepEqual(line.rows, [1, 2, 1, 2, 1]);
  assert.equal(line.matchedReels, 5);
  assert.equal(line.afterMultiplier.exactMinor, 6000);
});

test('mixed fruit symbols are not treated as interchangeable or as wild substitutes', () => {
  assert.equal(inspect(Array.from({ length: 3 }, () => ['lemon', 'plum', 'orange', 'cherry', 'lemon'])).candidates.length, 0);
});

test('the seven fresh manual demo observations independently contain no candidate prefixes', () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/observed-seven-rounds.json', import.meta.url), 'utf8'));
  assert.equal(fixture.rounds.length, 7);
  assert.deepEqual(fixture.rounds.map((round) => round.observation), ['spin-01', 'spin-02', 'spin-03', 'spin-04', 'spin-05', 'spin-06', 'spin-07']);
  for (const round of fixture.rounds) {
    assert.equal(inspect(round.rows, round.totalBetMinor, round.multiplier).candidates.length, 0, round.observation);
    assert.equal(round.displayedWin, null);
  }
});

test('demo bet limits are metadata and are not silently imposed as ETB operator limits', () => {
  assert.equal(quote('bell', 3, 1).afterMultiplier.exactMinor, 1);
  assert.equal(quote('bell', 3, 20001).afterMultiplier.exactMinor, 20001);
});

test('the maximum safe input can remain a precise fraction without Number multiplication', () => {
  assert.deepEqual(quote('lemon', 3, Number.MAX_SAFE_INTEGER).afterMultiplier, {
    numerator: String(Number.MAX_SAFE_INTEGER), denominator: '4', exactMinor: null, roundingApplied: false,
  });
});

test('overflow of a candidate or its multiplied amount is rejected', () => {
  assert.throws(() => quote('seven', 5, Number.MAX_SAFE_INTEGER), RangeError);
  assert.throws(() => quote('bell', 3, Number.MAX_SAFE_INTEGER, 5), RangeError);
  assert.throws(() => inspect(all('seven'), Number.MAX_SAFE_INTEGER, 5), RangeError);
});

test('invalid symbols including prototype property names are rejected', () => {
  for (const symbol of ['wild', 'scatter', 'constructor', '__proto__', 'Seven', '', null, 7]) assert.throws(() => quote(symbol, 3), TypeError);
});

test('invalid match counts cannot select absent or ambiguous rows', () => {
  for (const matchedReels of [0, 1, 2, 6, -1, 3.5, '3', null, NaN, Infinity]) assert.throws(() => quote('seven', matchedReels));
});

test('invalid bet types, zero, negatives, fractions and unsafe integers are rejected', () => {
  for (const totalBetMinor of [0, -1, 0.2, '20', 20n, null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => quoteObservedLine({ symbol: 'bell', matchedReels: 3, totalBetMinor, multiplier: 1 }));
  }
});

test('only the five documented integer multipliers are accepted', () => {
  for (const multiplier of [0, 6, -1, 1.5, '2', null, NaN, Infinity]) assert.throws(() => quote('bell', 3, 20, multiplier));
});

test('malformed, sparse and wrongly oriented windows are rejected', () => {
  const invalid = [null, [], all('bell').slice(0, 2), Array.from({ length: 5 }, () => Array(3).fill('bell')), new Array(3), [new Array(5), ...all('bell').slice(1)]];
  for (const rows of invalid) assert.throws(() => inspect(rows));
  const unknown = all('bell');
  unknown[2][4] = 'wild';
  assert.throws(() => inspect(unknown));
});

test('request objects and required fields are validated', () => {
  for (const bad of [null, undefined, [], 20, 'request']) {
    assert.throws(() => quoteObservedLine(bad));
    assert.throws(() => inspectCandidateLines(bad));
  }
  assert.throws(() => quoteObservedLine({ symbol: 'seven', matchedReels: 3 }));
  assert.throws(() => inspectCandidateLines({ rows: all('bell'), totalBetMinor: 20 }));
});

test('caller mutation cannot alter the private line chart or other requests', () => {
  const rows = all('bell');
  const before = structuredClone(rows);
  const result = inspect(rows);
  result.candidates[0].rows[0] = 2;
  assert.deepEqual(rows, before);
  assert.deepEqual(inspect(rows).candidates[0].rows, [0, 0, 0, 0, 0]);
});
