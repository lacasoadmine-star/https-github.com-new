import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { quoteLineCandidates } from './presentation-quote.mjs';
import { inspectCandidateLines } from '../../new-games72-20261121/games/multi-hot-20/evaluator.mjs';

const observed = JSON.parse(await readFile(new URL('./current-winning-observation.json', import.meta.url), 'utf8'));
test('current official two-line winning grid matches the sum of both independently quoted lines', () => {
  const quote = quoteLineCandidates({ gameId: observed.gameId, gridRows: observed.gridRows, totalBetMinor: 20, multiplier: observed.multiplier });
  assert.deepEqual(quote.lines.map(x => [x.lineId, x.symbol, x.count, x.baseMinor, x.quotedMinor]), [
    [6, 'bell', 4, 100, 500], [18, 'bell', 3, 20, 100],
  ]);
  assert.equal(quote.lineQuoteSumMinor, 600);
  assert.notEqual(Math.max(...quote.lines.map(x => x.quotedMinor)), 600);
  assert.equal(quote.settlementValidated, false);
});
test('accepted bounded evaluator corroborates both current lines without silently enabling aggregate settlement', () => {
  const result = inspectCandidateLines({ rows: observed.gridRows, totalBetMinor: 20, multiplier: observed.multiplier });
  assert.equal(result.aggregatePayoutMinor, null);
  assert.equal(result.aggregationPolicy, 'UNRESOLVED');
  assert.equal(result.candidates.length, 2);
});
