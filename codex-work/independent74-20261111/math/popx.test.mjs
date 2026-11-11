import test from 'node:test';
import assert from 'node:assert/strict';
import { configurePopxCascade, evaluatePopxGrid, startPopxCascade, syncPopxCascade, collectPopxCascade, publicPopxCascade, validatePopxCascade } from './popx.mjs';

const d = configurePopxCascade({ id: 'ind74_official_popx', catalogName: 'PopX', limits: { minBetMinor: '100', maxBetMinor: '400000', betStepMinor: '100', maxWinMinor: '40000000' } });
const at = 1794355200000;
const zero = () => 0;
function oneWin() {
  let risk = 0;
  return startPopxCascade(d, { betMinor: '100', now: at, rng: bound => bound >= 10000 ? (++risk === 1 ? 0 : bound - 1) : 0 });
}

test('PopX declares the public board rule and its independently authored single-player parameters', () => {
  assert.equal(d.rows, 5); assert.equal(d.cols, 6); assert.equal(d.symbols.length, 11);
  assert.equal(d.crashMechanic, 'cascade'); assert.equal(d.minMatch, 8);
  assert.equal(d.cascadeMs, 1500); assert.equal(d.maxMultiplierBps, 1000000);
  assert.equal(d.cascadeRules.sharedSessionImplemented, false);
  assert.equal(d.cascadeRules.providerProbabilitiesVerified, false);
  assert.equal(d.cascadeRules.providerTimingVerified, false);
  assert.equal(d.cascadeRules.providerMultiplierScheduleVerified, false);
  assert.equal(d.growthBpsPerSecond, undefined); assert.equal(d.ticketCount, undefined);
});

test('eight matching symbols anywhere wins and every simultaneous matching group is removed', () => {
  const ids = d.symbols.map(symbol => symbol.id);
  const order = Array.from({ length: 30 }, (_, index) => index * 7 % 30);
  const cells = Array(30);
  for (let index = 0; index < 30; index++) cells[order[index]] = index < 8 ? ids[0] : index < 16 ? ids[1] : ids[2 + (index - 16) % 9];
  const grid = Array.from({ length: 5 }, (_, row) => cells.slice(row * 6, row * 6 + 6));
  const match = evaluatePopxGrid(d, grid);
  assert.equal(match.winning, true); assert.equal(match.matchedPositions.length, 16);
  assert.deepEqual(match.matchedSymbols, [{ symbolId: ids[0], count: 8 }, { symbolId: ids[1], count: 8 }]);
  const seven = Array.from({ length: 30 }, (_, index) => index < 7 ? ids[0] : ids[1 + (index - 7) % 10]);
  assert.equal(evaluatePopxGrid(d, Array.from({ length: 5 }, (_, row) => seven.slice(row * 6, row * 6 + 6))).winning, false);
  assert.throws(() => evaluatePopxGrid(d, [['unknown']]), error => error.code === 'INVALID_GRID');
});

test('each generated cascade keeps surviving symbols in order and fills only holes above them', () => {
  const round = startPopxCascade(d, { betMinor: '100', rng: zero, now: at });
  assert.equal(round.private.sequence.length, 12);
  for (let index = 1; index < round.private.sequence.length; index++) {
    const previous = round.private.sequence[index - 1], next = round.private.sequence[index];
    const removedIds = new Set(previous.matchedSymbols.map(group => group.symbolId));
    assert.ok(previous.matchedPositions.length >= 8);
    assert.deepEqual(next.removedPositions, previous.matchedPositions);
    for (let col = 0; col < d.cols; col++) {
      const survivors = previous.grid.map(row => row[col]).filter(id => !removedIds.has(id));
      assert.deepEqual(next.grid.slice(d.rows - survivors.length).map(row => row[col]), survivors);
    }
    assert.equal(evaluatePopxGrid(d, next.grid).winning, true);
  }
  assert.ok(Buffer.byteLength(JSON.stringify(round)) < 128 * 1024);
});

test('only the current confirmed grid and multiplier are public at a given server time', () => {
  const round = startPopxCascade(d, { betMinor: '100', rng: zero, now: at });
  const before = structuredClone(round);
  const first = publicPopxCascade(d, round, at + 1499);
  assert.equal(first.cascadeIndex, 0); assert.equal(first.multiplierBps, 11500);
  assert.deepEqual(first.outcome.grid, round.private.sequence[0].grid);
  assert.equal(first.nextCascadeAt, at + 1500); assert.equal(first.history.length, 1);
  const second = publicPopxCascade(d, round, at + 1500);
  assert.equal(second.cascadeIndex, 1); assert.equal(second.multiplierBps, 14000);
  assert.equal(second.history.length, 2); assert.equal(second.nextCascadeAt, at + 3000);
  assert.deepEqual(second.grid, round.private.sequence[1].grid);
  assert.doesNotMatch(JSON.stringify(second), /"(?:private|sequence|terminalAt|seed|future)"/);
  second.grid[0][0] = 'client mutation'; second.outcome.grid[0][0] = 'client mutation';
  assert.deepEqual(round, before);
});

test('collection immediately before a nonmatching cascade pays; collection at its timestamp loses', () => {
  const round = oneWin();
  assert.equal(round.status, 'active'); assert.equal(round.private.sequence.length, 2);
  assert.equal(round.private.terminalAt, at + 1500);
  assert.equal(evaluatePopxGrid(d, round.private.sequence[1].grid).winning, false);
  assert.equal(collectPopxCascade(d, round, at + 1499).winMinor, '115');
  const lost = collectPopxCascade(d, round, at + 1500);
  assert.equal(lost.status, 'lost'); assert.equal(lost.winMinor, '0');
  assert.equal(lost.outcome.result, 'crash'); assert.equal(lost.outcome.matchedPositions.length, 0);
  const pending = publicPopxCascade(d, round, at + 1500);
  assert.equal(pending.pendingResolution, true); assert.equal(pending.collectibleMinor, '0');
  assert.deepEqual(pending.allowedActions, []);
});

test('an all-winning independent sequence automatically collects exactly at the declared cap', () => {
  const round = startPopxCascade(d, { betMinor: '100', rng: zero, now: at });
  const capped = syncPopxCascade(d, round, at + 11 * d.cascadeMs);
  assert.equal(capped.status, 'collected'); assert.equal(capped.winMinor, '10000');
  assert.equal(capped.multiplierBps, 1000000); assert.equal(capped.step, 12);
  assert.equal(capped.outcome.result, 'cap'); assert.equal(validatePopxCascade(d, capped), true);
  assert.deepEqual(syncPopxCascade(d, capped, at + 1000000), capped);
  assert.throws(() => collectPopxCascade(d, capped, at + 1000000), error => error.code === 'ROUND_FINISHED');
});

test('an initial nonmatching board settles immediately and never offers a free collection', () => {
  const round = startPopxCascade(d, { betMinor: '100', rng: bound => bound - 1, now: at });
  assert.equal(round.status, 'lost'); assert.equal(round.winMinor, '0');
  assert.equal(round.private.terminalAt, at); assert.equal(round.private.sequence.length, 1);
  const view = publicPopxCascade(d, round, at);
  assert.deepEqual(view.allowedActions, []); assert.equal(view.collectibleMinor, '0');
  assert.equal(evaluatePopxGrid(d, view.grid).winning, false);
  assert.throws(() => collectPopxCascade(d, round, at), error => error.code === 'ROUND_FINISHED');
});

test('backwards time and corrupted sequence, terminal time, public progress or identity are rejected', () => {
  const round = oneWin();
  assert.throws(() => syncPopxCascade(d, round, at - 1), error => error.code === 'INVALID_TIME');
  for (const mutate of [
    value => { value.private.terminalAt++; },
    value => { value.outcome.grid[0][0] = 'unknown'; },
    value => { value.private.sequence[1].grid[4][0] = 'unknown'; },
    value => { value.history[0].type = 'automatic-collect'; },
    value => { value.gameId = 'another-game'; },
    value => { value.winMinor = '999'; },
  ]) {
    const corrupted = structuredClone(round); mutate(corrupted);
    assert.throws(() => validatePopxCascade(d, corrupted), error => ['INVALID_ROUND', 'INVALID_GRID'].includes(error.code));
  }
});

test('JSONB-style object-key reordering preserves valid round recovery and collection', () => {
  const reorder = value => Array.isArray(value) ? value.map(reorder)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).reverse().map(key => [key, reorder(value[key])])) : value;
  const stored = JSON.parse(JSON.stringify(reorder(oneWin())));
  assert.equal(validatePopxCascade(d, stored), true);
  assert.equal(publicPopxCascade(d, stored, at + 500).collectibleMinor, '115');
  assert.equal(collectPopxCascade(d, stored, at + 1000).winMinor, '115');
});

test('the declared independent survival schedule has the same fixed-stage expected return before rounding', () => {
  let numerator = 1n, denominator = 1n;
  for (const [index, multiplier] of d.multipliersBps.entries()) {
    numerator *= BigInt(index ? d.multipliersBps[index - 1] : d.returnBps);
    denominator *= BigInt(multiplier);
    assert.equal(numerator * BigInt(multiplier), denominator * BigInt(d.returnBps));
  }
});
