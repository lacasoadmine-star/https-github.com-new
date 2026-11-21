import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, validateRollXReceipt } from '../receipt.mjs';
import { fixtureReceipt } from './fixture-session.mjs';

const validate = receipt => validateRollXReceipt(receipt, { bet: '0.20', targetBps: 14_000 });
const change = edit => { const receipt = structuredClone(fixtureReceipt()); edit(receipt); return receipt; };

test('receipt validation retains an immutable server receipt, including its exact round identity', () => {
  const input = structuredClone(fixtureReceipt());
  const result = validate(input);
  assert.equal(result.roundId, input.roundId);
  assert(Object.isFrozen(result)); assert(Object.isFrozen(result.rollX)); assert(Object.isFrozen(result.walletReceipt));
  input.walletReceipt.balanceAfter = '1.00';
  assert.equal(result.walletReceipt.balanceAfter, '100.08');
});

test('receipt from another game, currency, round or unversioned engine is rejected', () => {
  for (const edit of [r => { r.gameId = 'legacy_roll_x'; }, r => { r.currency = 'DMO'; },
    r => { r.roundId = 'not-a-round'; }, r => { r.mathSha256 = ''; },
    r => { r.engineVersion = ''; }, r => { r.isFree = true; }]) {
    assert.throws(() => validate(change(edit)), { code: 'ROLLX_RECEIPT_IDENTITY' });
  }
});

test('receipt bet and target cannot replace the bound requested wager', () => {
  assert.throws(() => validate(change(r => { r.bet = '0.50'; })), { code: 'ROLLX_RECEIPT_BET' });
  assert.throws(() => validate(change(r => { r.rollX.targetBps = 20_000; })), { code: 'ROLLX_RECEIPT_TARGET' });
  assert.throws(() => validate(change(r => { r.rollX.sector = 'unknown'; })), { code: 'INVALID_OUTCOME' });
});

test('an inconsistent visible win or ledger settlement is rejected before presentation', () => {
  assert.throws(() => validate(change(r => { r.finalWin = '9.00'; })), { code: 'ROLLX_RECEIPT_PAYOUT' });
  for (const edit of [r => { r.walletReceipt.balanceAfter = '100.28'; },
    r => { r.walletReceipt.chargedStake = '0.00'; }, r => { r.walletReceipt.finalWin = '0.00'; },
    r => { r.walletReceipt.currency = 'DMO'; }]) {
    assert.throws(() => validate(change(edit)), { code: 'ROLLX_RECEIPT_SETTLEMENT' });
  }
});

test('money parsing is exact and rejects noncanonical or floating currency values', () => {
  assert.equal(parseAmount('9999999999999.99'), 999999999999999n);
  assert.equal(parseAmount('0.00'), 0n);
  for (const value of ['0.2', '.20', '00.20', '1e2', '-0.20', '1.234', 'NaN', 'Infinity', 0.2, null]) {
    assert.throws(() => parseAmount(value), { code: 'INVALID_AMOUNT' });
  }
});
