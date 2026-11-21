import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateObservedRollXPayout as evaluate,
  UnverifiedRollXRuleError,
  READINESS,
  GAME_ID,
} from '../evaluator.mjs';

function fails(code, action) {
  assert.throws(action, error => error instanceof UnverifiedRollXRuleError && error.code === code);
}

test('fresh 0.20 x 1.4 green observation returns 0.28, net +0.08', () => {
  const receipt = evaluate({ betMinor: 20, targetBps: 14_000, outcome: 'green' });
  assert.equal(receipt.gameId, GAME_ID);
  assert.equal(receipt.payoutMinor, '28');
  assert.equal(receipt.netMinor, '8');
});

test('fresh 0.20 x 1.4 empty-sector observation loses exactly the stake', () => {
  const receipt = evaluate({ betMinor: 20, targetBps: 14_000, outcome: 'empty' });
  assert.equal(receipt.payoutMinor, '0');
  assert.equal(receipt.netMinor, '-20');
});

test('fresh STOP-control round: 0.50 x 2 green returns 1.00', () => {
  const receipt = evaluate({ betMinor: 50, targetBps: 20_000, outcome: 'green' });
  assert.equal(receipt.payoutMinor, '100');
  assert.equal(receipt.netMinor, '50');
});

test('the seven manual reference observations reconcile without fabricated money', () => {
  const outcomes = ['green', 'green', 'green', 'green', 'empty', 'green', 'empty'];
  const net = outcomes.reduce((total, outcome) => total + BigInt(evaluate({ betMinor: 20, targetBps: 14_000, outcome }).netMinor), 0n);
  assert.equal(net, 0n);
  // Observed demo balance started and ended at 20000.00 DMO. No wallet is used.
});

test('integer arithmetic remains exact above IEEE-754 safe integer capacity', () => {
  const bet = '9007199254740995';
  const receipt = evaluate({ betMinor: bet, targetBps: 14_000, outcome: 'green' });
  assert.equal(receipt.payoutMinor, '12610078956637393');
  assert.equal(receipt.netMinor, '3602879701896398');
  assert.doesNotThrow(() => JSON.stringify(receipt));
});

test('fractional minor-unit potential wins are rejected on both outcomes', () => {
  for (const outcome of ['green', 'empty']) {
    fails('ROUNDING_RULE_UNVERIFIED', () => evaluate({ betMinor: 1, targetBps: 14_000, outcome }));
  }
});

test('invalid or inexact wager amounts cannot enter payout arithmetic', () => {
  for (const betMinor of [0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '', '01', '1.0', '1e3', '-1', '0', null, undefined, true, {}, []]) {
    fails('INVALID_BET_MINOR', () => evaluate({ betMinor, targetBps: 20_000, outcome: 'green' }));
  }
});

test('published target maximum is enforced without inventing a full target schedule', () => {
  fails('TARGET_ABOVE_PUBLISHED_MAXIMUM', () => evaluate({ betMinor: 50, targetBps: 300_001, outcome: 'green' }));
  fails('TARGET_NOT_VERIFIED', () => evaluate({ betMinor: 50, targetBps: 300_000, outcome: 'green' }));
  fails('TARGET_NOT_VERIFIED', () => evaluate({ betMinor: 50, targetBps: 16_000, outcome: 'green' }));
  for (const targetBps of [0, -1, 1.4, NaN, Infinity, '14000', true]) {
    fails('INVALID_TARGET', () => evaluate({ betMinor: 50, targetBps, outcome: 'green' }));
  }
});

test('unsettled or unknown outcomes never become losses or payouts by coercion', () => {
  for (const outcome of ['pending', 'GREEN', '', null, undefined, true, 1, {}]) {
    fails('INVALID_OUTCOME', () => evaluate({ betMinor: 20, targetBps: 14_000, outcome }));
  }
});

test('demo credits cannot be mislabeled as the ETB arithmetic input', () => {
  for (const currency of ['DMO', 'EUR', '', null]) {
    fails('INVALID_CURRENCY', () => evaluate({ betMinor: 20, targetBps: 14_000, outcome: 'green', currency }));
  }
});

test('the original input is unchanged and results are immutable', () => {
  const input = Object.freeze({ betMinor: 20n, targetBps: 14_000, outcome: 'green' });
  const result = evaluate(input);
  assert.equal(input.betMinor, 20n);
  assert.equal(result.betMinor, '20');
  assert(Object.isFrozen(result));
});

test('partial reference arithmetic cannot represent cash readiness or RNG implementation', () => {
  assert.equal(READINESS.cashEnabled, false);
  assert.equal(READINESS.rngImplemented, false);
  assert.equal(READINESS.probabilityModel, 'UNVERIFIED');
  assert.equal(READINESS.roundingRule, 'UNVERIFIED');
  assert.equal(READINESS.walletIntegration, 'NOT_CONNECTED');
});
