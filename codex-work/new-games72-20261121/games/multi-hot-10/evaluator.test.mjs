import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GAME_ID, PAYLINES, SYMBOLS, TABLE_MINOR_AT_ANCHOR,
  quoteSymbolWin, evaluateLineCandidates,
} from './evaluator.mjs';

const json = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const observed = json('./fixtures/observed-seven-rounds.json');
const specification = json('./specification.json');
const evidence = json('./evidence-index.json');
const controls = json('./controls-state-spec.json');
const q = (symbol, matchCount, totalBetMinor = 10, multiplier = 1) =>
  quoteSymbolWin({ symbol, matchCount, totalBetMinor, multiplier });
const evaluate = (grid, totalBetMinor = 10, multiplier = 1) =>
  evaluateLineCandidates({ grid, totalBetMinor, multiplier });
const isCode = (code) => (error) => error.code === code;

test('bound 0.10 DMO amounts for all displayed symbol/count entries', () => {
  const rows = [
    ['seven', [50, 200, 1000]], ['bell', [20, 100, 200]],
    ['grapes', [10, 50, 100]], ['watermelon', [10, 50, 100]],
    ['lemon', [5, 10, 50]], ['plum', [5, 10, 50]],
    ['orange', [5, 10, 50]], ['cherry', [5, 10, 50]],
  ];
  for (const [symbol, amounts] of rows) for (let i = 0; i < 3; i += 1) {
    const quote = q(symbol, i + 3);
    assert.equal(quote.multiplied.exactMinor, amounts[i], `${symbol}/${i + 3}`);
    assert.equal(quote.settlementEligible, false);
  }
});

test('independently captured 0.20 DMO table binds the displayed-total-bet scale', () => {
  const expected = { seven: [100, 400, 2000], bell: [40, 200, 400],
    grapes: [20, 100, 200], watermelon: [20, 100, 200],
    lemon: [10, 20, 100], plum: [10, 20, 100], orange: [10, 20, 100], cherry: [10, 20, 100] };
  for (const [symbol, amounts] of Object.entries(expected)) {
    for (let i = 0; i < 3; i += 1) assert.equal(q(symbol, i + 3, 20).multiplied.exactMinor, amounts[i]);
  }
});

test('only documented multipliers 1..5 are applied exactly once', () => {
  for (let x = 1; x <= 5; x += 1) {
    const quote = q('bell', 4, 20, x);
    assert.equal(quote.base.exactMinor, 200);
    assert.equal(quote.multiplied.exactMinor, 200 * x);
  }
});

test('fractions are exact and retain unresolved rounding rather than truncating', () => {
  const quote = q('lemon', 3, 3, 3);
  assert.deepEqual(quote.base, { numerator: '3', denominator: '2', exactMinor: null });
  assert.deepEqual(quote.multiplied, { numerator: '9', denominator: '2', exactMinor: null });
  assert.equal(quote.roundingApplied, false);
  assert.equal(quote.requiresRoundingPolicy, true);
});

test('an integer after multiplication does not hide an unresolved fractional base stage', () => {
  const quote = q('cherry', 3, 1, 2);
  assert.equal(quote.base.exactMinor, null);
  assert.equal(quote.multiplied.exactMinor, 1);
  assert.equal(quote.requiresRoundingPolicy, true);
  assert.equal(quote.settlementEligible, false);
});

test('DMO demo min/max are not silently imposed as ETB or other unit policy', () => {
  assert.equal(q('seven', 3, 1).multiplied.exactMinor, 5);
  assert.equal(q('seven', 3, 20_001).multiplied.exactMinor, 100_005);
});

// Each grid is a separate diagram-derived fixture. No path array from the
// implementation is used to construct a winning fixture.
const geometryCases = [
  [1, [['seven','seven','seven','seven','seven'],['bell','grapes','lemon','plum','orange'],['orange','lemon','plum','grapes','bell']]],
  [2, [['bell','grapes','lemon','plum','orange'],['seven','seven','seven','seven','seven'],['orange','lemon','plum','grapes','bell']]],
  [3, [['bell','grapes','lemon','plum','orange'],['orange','lemon','plum','grapes','bell'],['seven','seven','seven','seven','seven']]],
  [4, [['seven','grapes','bell','cherry','seven'],['bell','seven','orange','seven','lemon'],['orange','cherry','seven','watermelon','grapes']]],
  [5, [['orange','cherry','seven','watermelon','grapes'],['bell','seven','orange','seven','lemon'],['seven','grapes','bell','cherry','seven']]],
  [6, [['seven','seven','bell','cherry','lemon'],['bell','grapes','seven','orange','plum'],['orange','cherry','lemon','seven','seven']]],
  [7, [['orange','cherry','lemon','seven','seven'],['bell','grapes','seven','orange','plum'],['seven','seven','bell','cherry','lemon']]],
  [8, [['bell','seven','seven','seven','grapes'],['seven','orange','plum','lemon','seven'],['watermelon','cherry','orange','bell','plum']]],
  [9, [['watermelon','cherry','orange','bell','plum'],['seven','orange','plum','lemon','seven'],['bell','seven','seven','seven','grapes']]],
  [10,[['seven','grapes','bell','cherry','seven'],['bell','seven','seven','seven','lemon'],['orange','cherry','lemon','watermelon','grapes']]],
];

for (const [lineId, grid] of geometryCases) test(`official line ${lineId} geometry yields its independent five-seven candidate`, () => {
  const result = evaluate(grid, 10, 2);
  assert.equal(result.candidateCount, 1);
  assert.equal(result.candidates[0].lineId, lineId);
  assert.equal(result.candidates[0].matchCount, 5);
  assert.equal(result.candidates[0].quote.multiplied.exactMinor, 2000);
  assert.deepEqual(result.candidates[0].winningCells.map(({ row, reel }) => grid[row][reel]), Array(5).fill('seven'));
});

for (const round of observed.rounds) test(`fresh ${round.observationId} observation is consistent with no qualifying line candidate`, () => {
  const result = evaluate(round.grid, round.totalBetMinor, round.multiplier);
  assert.equal(round.observedWinMinor, 0);
  assert.equal(result.candidateCount, 0);
  assert.equal(result.aggregatePayoutMinor, null); // Observation is not wallet settlement.
  assert.equal(result.outcomeLegalityVerified, false);
});

test('three matching symbols after the leftmost reel do not qualify', () => {
  const grid = [['bell','seven','seven','seven','orange'],['lemon','plum','orange','grapes','bell'],['grapes','orange','lemon','bell','plum']];
  assert.equal(evaluate(grid).candidateCount, 0);
});

test('a gap terminates the prefix, so scattered matches are not collected', () => {
  const grid = [['seven','seven','bell','seven','seven'],['lemon','plum','orange','grapes','bell'],['grapes','orange','lemon','bell','plum']];
  assert.equal(evaluate(grid).candidateCount, 0);
});

test('shared low-fruit paytable does not turn different fruits into substitutes', () => {
  const grid = [['lemon','plum','orange','cherry','lemon'],['bell','grapes','watermelon','seven','bell'],['grapes','watermelon','seven','bell','grapes']];
  assert.equal(evaluate(grid).candidateCount, 0);
});

test('only the longest prefix is quoted; three and four are not stacked', () => {
  const grid = [['seven','seven','seven','seven','bell'],['lemon','plum','orange','grapes','bell'],['grapes','orange','lemon','bell','plum']];
  const result = evaluate(grid);
  assert.equal(result.candidateCount, 1);
  assert.equal(result.candidates[0].matchCount, 4);
  assert.equal(result.candidates[0].quote.multiplied.exactMinor, 200);
});

test('all ten candidates remain separate without inventing a sum, global maximum or cap', () => {
  const result = evaluate(Array.from({ length: 3 }, () => Array(5).fill('seven')), 10, 5);
  assert.equal(result.candidateCount, 10);
  assert.equal(new Set(result.candidates.map((c) => c.lineId)).size, 10);
  assert.ok(result.candidates.every((c) => c.quote.multiplied.exactMinor === 5000));
  assert.equal(result.aggregatePayoutMinor, null);
  assert.equal(result.aggregatePolicy, 'UNRESOLVED');
  assert.equal(result.settlementEligible, false);
  assert.equal(result.outcomeLegalityVerified, false);
  assert.equal(result.rngUsed, false);
});

test('caller input is preserved and returned grids/quotes cannot mutate shared state', () => {
  const grid = structuredClone(geometryCases[0][1]);
  const before = structuredClone(grid);
  const result = evaluate(grid);
  assert.deepEqual(grid, before);
  grid[0][0] = 'bell';
  assert.equal(result.grid[0][0], 'seven');
  assert.throws(() => { result.grid[0][0] = 'bell'; }, TypeError);
  assert.throws(() => { result.candidates[0].quote.multiplied.exactMinor = 1; }, TypeError);
  assert.throws(() => { PAYLINES[0].rows[0] = 2; }, TypeError);
  assert.throws(() => { TABLE_MINOR_AT_ANCHOR.seven[5] = 1; }, TypeError);
});

test('invalid bets and coercions are rejected even for a loss grid', () => {
  for (const value of [0, -1, 0.1, NaN, Infinity, '10', 10n, null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => evaluateLineCandidates({ grid: observed.rounds[0].grid, totalBetMinor: value }), isCode('INVALID_BET_MINOR'));
  }
});

test('unsafe payouts are rejected without floating-point multiplication', () => {
  assert.throws(() => q('seven', 5, Number.MAX_SAFE_INTEGER, 5), isCode('PAYOUT_OVERFLOW'));
  assert.equal(q('lemon', 4, Number.MAX_SAFE_INTEGER).multiplied.exactMinor, Number.MAX_SAFE_INTEGER);
});

test('unverified multipliers, symbols and counts are rejected', () => {
  for (const x of [0, 6, 1.5, '2', null, NaN]) assert.throws(() => q('seven', 3, 10, x), isCode('UNVERIFIED_MULTIPLIER'));
  for (const s of ['wild','scatter','7','__proto__','constructor',null]) assert.throws(() => q(s, 3), isCode('UNVERIFIED_SYMBOL'));
  for (const count of [0, 1, 2, 6, 3.5, '3', null]) assert.throws(() => q('seven', count), isCode('UNVERIFIED_MATCH_COUNT'));
});

test('malformed, transposed, sparse and unknown-symbol grids are rejected', () => {
  for (const grid of [null, [], Array(5).fill(Array(3).fill('seven')), [['seven']], Array(3).fill(Array(4).fill('seven'))]) {
    assert.throws(() => evaluate(grid), isCode('INVALID_GRID'));
  }
  const unknown = structuredClone(observed.rounds[0].grid); unknown[0][0] = 'wild';
  assert.throws(() => evaluate(unknown), isCode('UNVERIFIED_SYMBOL'));
  const sparse = Array.from({ length: 3 }, () => new Array(5));
  assert.throws(() => evaluate(sparse), isCode('UNVERIFIED_SYMBOL'));
  for (const input of [null, undefined, [], 10, 'grid']) assert.throws(() => evaluateLineCandidates(input), isCode('INVALID_INPUT'));
});

test('specification, fixture sources and assets retain their evidence/release boundaries', () => {
  assert.equal(specification.gameId, GAME_ID);
  assert.deepEqual(specification.paylines.lines, PAYLINES);
  assert.deepEqual(specification.payoutEvidence.tableMinorAtAnchorBet, TABLE_MINOR_AT_ANCHOR);
  assert.equal(evidence.fileCount, 30);
  assert.equal(evidence.successfulSession.completedManualRounds, 7);
  assert.equal(observed.rounds.length, 7);
  const imageHashes = new Map(evidence.files.map((f) => [f.path, f.sha256]));
  for (const round of observed.rounds) assert.equal(imageHashes.get(round.source.path), round.source.sha256);
  assert.ok(evidence.files.every((f) => !f.path.includes('history')));
  assert.equal(specification.release.settlementEligible, false);
  assert.equal(specification.release.rngImplemented, false);
  assert.equal(specification.release.rendererImplemented, false);
  assert.equal(controls.settings.audibleSoundVerified, false);
  assert.equal(controls.autoOptions.executionVerified, false);
  assert.equal(controls.placeholderGameplay, false);
  const assets = json('./assets-manifest.json');
  assert.deepEqual(assets.rendererAssets, []);
  assert.deepEqual(assets.soundAssets, []);
  assert.equal(assets.referenceFilesAreRuntimeAssets, false);
  assert.deepEqual(assets.symbolIds, SYMBOLS);
});
