import { isDeepStrictEqual } from 'node:util';
import { GAME_ID } from '../rules.mjs';
import { minor, money, SuperWildsError } from './contract.mjs';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const copy = value => structuredClone(value);
const fail = () => { throw new SuperWildsError('SUPERWILDS_GAMBLE_JOURNAL_INVALID'); };
const same = (a, b) => ['engineVersion', 'mathVersion', 'mathSha256'].every(key => a[key] === b[key]);

/** Derive the current liability from immutable SPIN + ordered GAMBLE events.
 * Current installed models/policies are deliberately not required to restore
 * accepted history or pay an accepted win after release/model retirement.
 */
export function deriveSuperWildsPending(round, supplied) {
  if (!round || round.gameId !== GAME_ID || !Array.isArray(supplied) || supplied.length > 1000) fail();
  const base = round.receipt ?? round, history = copy(supplied);
  let pending = minor(base.winAmount), previousActionId = null, attempt = 0;
  const actions = new Set(), requests = new Set();
  for (const event of history) {
    if (!event || event.schema !== 'zplay/superwilds-gamble/v1' || event.kind !== 'GAMBLE' || event.gameId !== GAME_ID ||
      event.currency !== 'ETB' || !isDeepStrictEqual(event.round, base) || event.roundId !== base.roundId || event.bet !== base.bet || !same(event, base) ||
      !UUID.test(event.actionId ?? '') || !UUID.test(event.requestKey ?? '') ||
      event.requestKey.toLowerCase() === base.requestKey.toLowerCase() || actions.has(event.actionId.toLowerCase()) || requests.has(event.requestKey.toLowerCase()) ||
      event.attempt !== attempt + 1 || event.previousActionId !== previousActionId || pending <= 0n ||
      !['RED', 'BLACK'].includes(event.choice) || !['RED', 'BLACK'].includes(event.color) ||
      event.won !== (event.choice === event.color) || event.pendingWinBefore !== money(pending) ||
      event.pendingWinAfter !== money(event.won ? pending * 2n : 0n) ||
      typeof event.gambleVersion !== 'string' || !event.gambleVersion || !HASH.test(event.gambleSha256 ?? '') ||
      event.walletReceipt?.currency !== 'ETB' || event.walletReceipt.chargedStake !== '0.00' ||
      event.walletReceipt.creditedWin !== '0.00' || event.walletReceipt.balanceBefore !== event.walletReceipt.balanceAfter) fail();
    minor(event.walletReceipt.balanceBefore);
    const policy = event.policy;
    if (!policy || typeof policy.version !== 'string' || !policy.version || !Number.isSafeInteger(policy.maxAttempts) ||
      policy.maxAttempts < event.attempt || policy.maxAttempts > 1000 ||
      minor(policy.maxPendingWin) < pending || minor(policy.maxTargetWin) < pending * 2n) fail();
    pending = event.won ? pending * 2n : 0n;
    previousActionId = event.actionId; attempt++;
    actions.add(event.actionId.toLowerCase()); requests.add(event.requestKey.toLowerCase());
  }
  return { pendingMinor: pending, attempt, lastActionId: previousActionId, history };
}
