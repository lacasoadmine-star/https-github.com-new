import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_ID, MATH_VERSION, TARGET_RETURN_BPS, mineIslandDefinition,
  startMineIslandRound, advanceMineIslandRound, collectMineIslandRound,
  publicMineIslandRound, mineIslandReturnAtStep,
} from './index.mjs';

const alwaysSurvive = () => 0;
const start = (options = {}) => startMineIslandRound({ betMinor: '10', rng: alwaysSurvive, ...options });
const assertCode = (fn, code) => assert.throws(fn, error => error.code === code);

test('stake debit and first collection reconcile a complete round in minor units', () => {
  const balanceBefore = 2000000n;
  let round = start();
  const balanceAfterDebit = balanceBefore - BigInt(round.betMinor);
  round = advanceMineIslandRound(round, { cell: 7 });
  assert.equal(round.multiplierBps, 11000);
  assert.equal(publicMineIslandRound(round).collectibleMinor, '11');
  round = collectMineIslandRound(round);
  assert.equal(round.status, 'collected');
  assert.equal(round.winMinor, '11');
  assert.equal(balanceAfterDebit + BigInt(round.winMinor), 2000001n);
});

test('first jump can fail and no stake or win is invented', () => {
  const round = advanceMineIslandRound(start({ rng: bound => bound - 1 }));
  assert.equal(round.status, 'lost');
  assert.equal(round.winMinor, '0');
  assert.equal(publicMineIslandRound(round).collectibleMinor, '0');
  assert.equal(publicMineIslandRound(round).nextMultiplierBps, null);
});

test('an unsuccessful later jump forfeits an uncollected earlier amount', () => {
  let calls = 0;
  let round = start({ rng: bound => calls++ === 1 ? bound - 1 : 0 });
  round = advanceMineIslandRound(round);
  assert.equal(publicMineIslandRound(round).collectibleMinor, '11');
  round = advanceMineIslandRound(round);
  assert.equal(round.status, 'lost');
  assert.equal(round.winMinor, '0');
  assert.equal(publicMineIslandRound(round).collectibleMinor, '0');
});

test('every bounded first-step outcome exactly supports the advertised first-step return', () => {
  let wins = 0;
  let payouts = 0n;
  for (let ticket = 0; ticket < 11000; ticket++) {
    let calls = 0;
    let round = start({ rng: () => calls++ === 0 ? ticket : 0 });
    round = advanceMineIslandRound(round);
    if (round.status === 'active') {
      wins++;
      payouts += BigInt(collectMineIslandRound(round).winMinor);
    }
  }
  assert.equal(wins, 9600);
  assert.equal(payouts, 105600n);
  assert.equal(payouts * 100n, 11000n * 10n * 96n);
});

for (const mode of mineIslandDefinition.modes) {
  test(`${mode}: ten successful jumps collect automatically within the defined payout cap`, () => {
    let round = start({ mode, betMinor: mineIslandDefinition.limits.maxBetMinor });
    for (let i = 0; i < 10; i++) round = advanceMineIslandRound(round);
    assert.equal(round.status, 'collected');
    assert.equal(round.step, 10);
    const finalMultiplier = mineIslandDefinition.paytable.find(row => row.mode === mode).rows.at(-1).multiplierBps;
    assert.equal(BigInt(round.winMinor), 100000n * BigInt(finalMultiplier) / 10000n);
    assert.ok(BigInt(round.winMinor) <= BigInt(mineIslandDefinition.limits.maxWinMinor));
    assertCode(() => advanceMineIslandRound(round), 'ROUND_FINISHED');
    assertCode(() => collectMineIslandRound(round), 'ROUND_FINISHED');
  });

  test(`${mode}: all ten conditional probabilities telescope to exactly 96 percent return`, () => {
    const rows = mineIslandDefinition.paytable.find(row => row.mode === mode).rows;
    let numerator = 1n;
    let denominator = 1n;
    for (const row of rows) {
      numerator *= BigInt(row.conditionalSurvival.numerator);
      denominator *= BigInt(row.conditionalSurvival.denominator);
      assert.equal(numerator * BigInt(row.multiplierBps), BigInt(TARGET_RETURN_BPS) * denominator);
      const expected = mineIslandReturnAtStep({ mode, step: row.step, betMinor: '10' });
      assert.equal(BigInt(expected.expectedReturnNumerator) * 100n, BigInt(expected.expectedReturnDenominator) * 96n);
    }
  });
}

test('collect before progress and all repeated terminal actions are rejected', () => {
  assertCode(() => collectMineIslandRound(start()), 'NO_PROGRESS');
  const won = collectMineIslandRound(advanceMineIslandRound(start()));
  assertCode(() => collectMineIslandRound(won), 'ROUND_FINISHED');
  const lost = advanceMineIslandRound(start({ rng: bound => bound - 1 }));
  assertCode(() => advanceMineIslandRound(lost), 'ROUND_FINISHED');
  assertCode(() => collectMineIslandRound(lost), 'ROUND_FINISHED');
});

test('minor-unit stake validation rejects floating, unsafe, signed, exponential and out-of-range values', () => {
  for (const betMinor of ['9', '11', '100010', '0', '-10', '10.0', '1e2', '010', '', null, NaN, 10.5, Number.MAX_SAFE_INTEGER + 1]) {
    assertCode(() => start({ betMinor }), 'INVALID_BET');
  }
  assert.equal(start({ betMinor: 10 }).betMinor, '10');
});

test('RNG injection must obey the requested bounded integer contract', () => {
  for (const rng of [() => -1, bound => bound, () => 0.5, () => NaN]) assertCode(() => start({ rng }), 'INVALID_RNG');
});

test('mode and server-round identity are checked', () => {
  for (const mode of ['unknown', '__proto__', 'constructor']) assertCode(() => start({ mode }), 'INVALID_MODE');
  assertCode(() => advanceMineIslandRound({ ...start(), gameId: 'other' }), 'INVALID_ROUND');
  assertCode(() => advanceMineIslandRound({ ...start(), mathVersion: 'old' }), 'INVALID_ROUND');
});

test('transitions leave prior state unchanged and round state is JSON serializable', () => {
  const initial = start();
  const original = JSON.stringify(initial);
  const stepped = advanceMineIslandRound(initial, { cell: 9 });
  assert.equal(JSON.stringify(initial), original);
  const steppedBefore = JSON.stringify(stepped);
  collectMineIslandRound(stepped);
  assert.equal(JSON.stringify(stepped), steppedBefore);
  assert.deepEqual(JSON.parse(JSON.stringify(stepped)), stepped);
  assert.equal(stepped.gameId, GAME_ID);
  assert.equal(stepped.mathVersion, MATH_VERSION);
});

test('visual island choices cannot improve outcomes and repeated or invalid cells fail', () => {
  const initial = start();
  const left = advanceMineIslandRound(initial, { cell: 0 });
  const right = advanceMineIslandRound(initial, { cell: 9 });
  assert.equal(left.multiplierBps, right.multiplierBps);
  assert.equal(left.status, right.status);
  assertCode(() => advanceMineIslandRound(left, { cell: 0 }), 'INVALID_CELL');
  for (const cell of [-1, 10, 1.5, '1']) assertCode(() => advanceMineIslandRound(initial, { cell }), 'INVALID_CELL');
});

test('public projection contains only past outcomes and cannot mutate private server state', () => {
  const server = advanceMineIslandRound(start());
  const visible = publicMineIslandRound(server);
  assert.equal(visible.step, 1);
  assert.equal(visible.history.length, 1);
  assert.equal(visible.private, undefined);
  assert.ok(!JSON.stringify(visible).includes('survival'));
  visible.history[0].survived = false;
  visible.path[0].multiplierBps = 999999999;
  visible.revealedCells.push(8);
  assert.equal(server.history[0].survived, true);
  assert.equal(server.history[0].multiplierBps, 11000);
  assert.equal(server.history.length, 1);
});
