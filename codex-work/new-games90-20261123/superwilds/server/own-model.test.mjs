import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { GAME_ID, SYMBOLS, quoteGrid } from '../rules.mjs';
import { createSuperWildsOwnModel, createUnbiasedInteger, MODEL_SPEC, MODEL_IDENTITY, auditOwnModel } from './own-model.mjs';

const context = (stake = 100n) => ({ gameId: GAME_ID, roundId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', betMinor: stake });
const toBytes = (value, length) => {
  const bytes = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) { bytes[i] = Number(value & 255n); value >>= 8n; }
  assert.equal(value, 0n); return bytes;
};
const scriptedBytes = values => length => {
  assert.ok(values.length, 'unexpected entropy request'); return toBytes(BigInt(values.shift()), length);
};
function seededBytes(seed) {
  let counter = 0;
  return length => {
    const result = createHash('sha256').update(seed + ':' + counter++).digest();
    assert.ok(length <= result.length); return result.subarray(0, length);
  };
}

test('exhaustive exact own audit proves9651/10000 return without claiming provider RNG', () => {
  const a = auditOwnModel();
  assert.equal(a.exactLineCombinations, '59049');
  assert.equal(a.summedLineAwardNumeratorsOverTwo, '19018');
  assert.equal(a.positiveLineCombinations, '4617');
  assert.deepEqual(a.baseRtp, { numerator: '47545', denominator: '19683' });
  assert.deepEqual(a.ownExpectedRtp, { numerator: '9651', denominator: '10000' });
  const b = a.baseRtp, q = a.baseDistributionWeight;
  assert.equal(BigInt(b.numerator) * BigInt(q.numerator) * 10000n,
    BigInt(b.denominator) * BigInt(q.denominator) * 9651n);
  assert.equal(a.maximumWinTimesStake, 1000);
  assert.equal(a.productionEnabled, false); assert.equal(a.providerProbabilityModel, false);
  assert.equal(MODEL_SPEC.providerRtpReproduced, false);
  assert.equal(MODEL_IDENTITY.mathSha256, createHash('sha256').update(JSON.stringify(MODEL_SPEC)).digest('hex'));
  assert.ok(Object.isFrozen(a) && Object.isFrozen(MODEL_SPEC.paylines[0]));
});

test('unbiased integer rejects out-of-range values instead of reducing modulo the bound', () => {
  const values = [255, 250, 249];
  const uniform = createUnbiasedInteger({ randomBytes: scriptedBytes(values) });
  assert.equal(uniform(10n), 9n); assert.equal(values.length, 0);
  assert.equal(uniform(1n), 0n); // No entropy required for a singleton.
  assert.throws(() => uniform(0n), /ENTROPY_BOUND_INVALID/);
});

test('invalid or exhausted entropy produces an error and never a fabricated losing outcome', () => {
  const bad = createUnbiasedInteger({ randomBytes: () => new Uint8Array(0) });
  assert.throws(() => bad(9n), /ENTROPY_BYTES_INVALID/);
  let calls = 0;
  const stuck = createUnbiasedInteger({ randomBytes: length => { calls++; return new Uint8Array(length).fill(255); } });
  assert.throws(() => stuck(9n), /ENTROPY_REJECTION_LIMIT/); assert.equal(calls, 128);
  const model = createSuperWildsOwnModel({ betLevels: ['1.00'], randomBytes: () => { throw Error('ENTROPY_OFFLINE'); } });
  assert.throws(() => model.sampleOutcome(context()), /ENTROPY_OFFLINE/);
});

test('positive base branch can reach the full1000x all-WILD maximum with exact five-line amounts', () => {
  const values = [0, ...Array(15).fill(0), 4];
  const model = createSuperWildsOwnModel({ betLevels: ['0.10', '1.00'], randomBytes: scriptedBytes(values) });
  const r = model.sampleOutcome(context(10n));
  assert.equal(r.multiplier, 5); assert.equal(r.totalWinMinor, 10000n);
  assert.equal(r.winLines.length, 5);
  assert.deepEqual(r.winLines.map(line => line.winMinor), [2000, 2000, 2000, 2000, 2000]);
  assert.ok(r.grid.every(row => row.every(symbol => symbol === 'wild')));
  assert.equal(model.maximumPayoutMinor(10n), 10000n);
  assert.equal(model.validateOutcome(r, context(10n)), true);
  assert.equal(values.length, 0);
});

test('exact mixture boundary selects a freshly constructed zero-win grid with no resampling of a winning grid', () => {
  const values = [BigInt(MODEL_SPEC.baseDistributionWeight.numerator), 0, 1, 2, 0, 1, 2,
    ...Array.from({ length: 9 }, (_, i) => i), 4];
  const model = createSuperWildsOwnModel({ betLevels: ['1.00'], randomBytes: scriptedBytes(values) });
  const r = model.sampleOutcome(context());
  assert.equal(r.totalWinMinor, 0n); assert.equal(r.winLines.length, 0); assert.equal(r.multiplier, 5);
  const first = r.grid.map(row => row[0]), second = r.grid.map(row => row[1]);
  assert.equal(first.includes('wild'), false); assert.equal(second.includes('wild'), false);
  assert.ok(second.every(symbol => !first.includes(symbol)));
  assert.equal(values.length, 0); assert.equal(model.validateOutcome(r, context()), true);
});

test('fractional minor stakes, unsafe maximums and unapproved ladders fail before entropy', () => {
  let calls = 0; const entropy = length => { calls++; return new Uint8Array(length); };
  for (const betLevels of [undefined, [], ['0.00'], ['0.01'], ['1'], ['1.001'], ['1.00', '1.00'], ['90071992547.42']]) {
    assert.throws(() => createSuperWildsOwnModel({ betLevels, randomBytes: entropy }));
  }
  const m = createSuperWildsOwnModel({ betLevels: ['0.10', '1.00'], randomBytes: entropy });
  assert.throws(() => m.sampleOutcome(context(1n)), /EXACT_STAKE_REQUIRED/);
  assert.throws(() => m.sampleOutcome(context(200n)), /BET_OUTSIDE_HOST_LADDER/);
  assert.throws(() => m.maximumPayoutMinor(200n), /BET_OUTSIDE_HOST_LADDER/);
  assert.throws(() => m.sampleOutcome({ ...context(), gameId: 'multihot5_native' }), /CONTEXT_REQUIRED/);
  assert.equal(calls, 0);
});

test('candidate never approves itself or claims unperformed host lifecycle/ETB acceptance', () => {
  const levels = ['1.00', '2.00']; const m = createSuperWildsOwnModel({ betLevels: levels }); levels[0] = '50.00';
  assert.equal(m.approved, false); assert.equal(m.verification.deferredLifecycleVerified, false);
  assert.equal(m.verification.etbPolicyVerified, false);
  assert.deepEqual(m.betLevels, ['1.00', '2.00']); assert.ok(Object.isFrozen(m.verification));
});

test('fresh cryptographic test entropy produces varied unbounded receipts and exact deterministic full validation', () => {
  const m = createSuperWildsOwnModel({ betLevels: ['0.10', '1.00'], randomBytes: seededBytes('disposable-own-model-qa') });
  const seen = new Set(), multipliers = new Set(); let wins = 0, losses = 0;
  for (let i = 0; i < 1000; i++) {
    const c = context(i % 2 ? 100n : 10n), r = m.sampleOutcome(c);
    assert.equal(m.validateOutcome(r, c), true); assert.ok(r.totalWinMinor <= c.betMinor * 1000n);
    const columns = Array.from({ length: 5 }, (_, index) => r.grid.map(row => row[index]));
    const quote = quoteGrid({ grid: columns, betMinor: Number(c.betMinor), multiplier: r.multiplier });
    assert.equal(r.totalWinMinor, BigInt(quote.winMinor)); assert.deepEqual(r.winLines, quote.winningLines);
    seen.add(JSON.stringify(r.grid)); multipliers.add(r.multiplier); r.totalWinMinor ? wins++ : losses++;
  }
  assert.equal(seen.size, 1000); assert.equal(multipliers.size, 5); assert.ok(wins > 0 && losses > 0);
  // This verifies varying outcomes/amounts, not an estimated or certified RTP.
});

test('validator rejects changed awards, line aggregation, symbols, multipliers, shape and extra authority', () => {
  const m = createSuperWildsOwnModel({ betLevels: ['1.00'], randomBytes: scriptedBytes([0, ...Array(15).fill(0), 4]) });
  const c = context(), accepted = m.sampleOutcome(c);
  const mutate = fn => { const value = structuredClone(accepted); fn(value); return value; };
  for (const altered of [
    mutate(r => r.totalWinMinor++), mutate(r => r.totalWinMinor = Number(r.totalWinMinor)),
    mutate(r => r.winLines.pop()), mutate(r => r.winLines[0].winMinor++),
    mutate(r => r.winLines[0].rows[0] = 0), mutate(r => r.grid[0][0] = 'unknown'),
    mutate(r => r.multiplier = 6), mutate(r => r.multiplier = 4),
    mutate(r => r.grid.pop()), mutate(r => r.balanceMinor = 10000000),
  ]) assert.equal(m.validateOutcome(altered, c), false);
  assert.equal(m.validateOutcome(accepted, context(10n)), false);
  assert.equal(m.validateOutcome(accepted, { ...c, roundId: 'not-a-round' }), false);
  assert.equal(accepted.totalWinMinor, 100000n); assert.ok(Object.isFrozen(accepted.grid[0]));
});

test('all9^5 base line combinations independently match the current deterministic rules and exact audit', () => {
  let sum = 0n, positives = 0n;
  const center = Array(5);
  const enumerate = position => {
    if (position < 5) { for (const symbol of SYMBOLS) { center[position] = symbol; enumerate(position + 1); } return; }
    const grid = center.map((symbol, column) => [SYMBOLS[(column + 2) % SYMBOLS.length], symbol, SYMBOLS[(column + 4) % SYMBOLS.length]]);
    const quote = quoteGrid({ grid, betMinor: 2, multiplier: 1 });
    const value = quote.winningLines.find(line => line.line === 1)?.winMinor ?? 0;
    sum += BigInt(value); if (value) positives++;
  };
  enumerate(0);
  assert.equal(String(sum), auditOwnModel().summedLineAwardNumeratorsOverTwo);
  assert.equal(String(positives), auditOwnModel().positiveLineCombinations);
});
