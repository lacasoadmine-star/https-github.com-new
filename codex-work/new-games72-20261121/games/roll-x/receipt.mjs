import { GAME_ID, evaluateObservedRollXPayout } from './evaluator.mjs';

const AMOUNT = /^(0|[1-9]\d{0,12})\.\d{2}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/i;

export function parseAmount(value) {
  if (typeof value !== 'string' || !AMOUNT.test(value)) throw Object.assign(new Error('INVALID_AMOUNT'), { code: 'INVALID_AMOUNT' });
  return BigInt(value.replace('.', ''));
}

export function freezeCopy(value) {
  const copy = structuredClone(value);
  const visit = item => {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(visit);
      Object.freeze(item);
    }
    return item;
  };
  return visit(copy);
}

export function validateRollXReceipt(receipt, { bet, targetBps } = {}) {
  const reject = code => { throw Object.assign(new Error(code), { code }); };
  if (!receipt || receipt.gameId !== GAME_ID || receipt.currency !== 'ETB' ||
      !UUID.test(receipt.roundId ?? '') || receipt.isFree !== false ||
      typeof receipt.mathVersion !== 'string' || !receipt.mathVersion ||
      typeof receipt.engineVersion !== 'string' || !receipt.engineVersion ||
      !HASH.test(receipt.mathSha256 ?? '')) reject('ROLLX_RECEIPT_IDENTITY');
  if (bet !== undefined && receipt.bet !== bet) reject('ROLLX_RECEIPT_BET');
  if (!receipt.rollX || receipt.rollX.targetBps !== targetBps) reject('ROLLX_RECEIPT_TARGET');
  const result = evaluateObservedRollXPayout({
    betMinor: parseAmount(receipt.bet),
    targetBps,
    outcome: receipt.rollX.sector,
  });
  if (parseAmount(receipt.finalWin) !== BigInt(result.payoutMinor)) reject('ROLLX_RECEIPT_PAYOUT');
  const wallet = receipt.walletReceipt;
  if (!wallet || wallet.currency !== 'ETB' ||
      parseAmount(wallet.chargedStake) !== parseAmount(receipt.bet) ||
      parseAmount(wallet.finalWin) !== parseAmount(receipt.finalWin) ||
      parseAmount(wallet.balanceBefore) - parseAmount(wallet.chargedStake) +
        parseAmount(wallet.finalWin) !== parseAmount(wallet.balanceAfter)) reject('ROLLX_RECEIPT_SETTLEMENT');
  return freezeCopy(receipt);
}
