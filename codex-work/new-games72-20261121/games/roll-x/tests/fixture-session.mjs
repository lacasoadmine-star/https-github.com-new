// ISOLATED TEST FIXTURES ONLY. No network, cookies, account, database or real money.
// This module is never imported by index.html, main.mjs, app.mjs or session.mjs.
import assert from 'node:assert/strict';
import { GAME_ID } from '../evaluator.mjs';
import { freezeCopy, parseAmount } from '../receipt.mjs';

export const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const amount = value => (value / 100n).toString() + '.' + (value % 100n).toString().padStart(2, '0');
export function fixtureReceipt(index = 1, { before = 10000n, bet = '0.20', payout = '0.28', targetBps = 14_000, sector = 'green' } = {}) {
  return freezeCopy({
    testOnly: true,
    gameId: GAME_ID,
    currency: 'ETB',
    roundId: '00000000-0000-4000-8000-' + String(index).padStart(12, '0'),
    bet, isFree: false,
    mathVersion: 'isolated-rollx-fixture-v1',
    engineVersion: 'isolated-fixture-receipts-only',
    mathSha256: 'a'.repeat(64),
    finalWin: payout,
    rollX: { sector, targetBps },
    walletReceipt: {
      currency: 'ETB', balanceBefore: amount(before), chargedStake: bet,
      finalWin: payout, balanceAfter: amount(before - parseAmount(bet) + parseAmount(payout)),
    },
  });
}

export function fixtureSession(receipts, { beforeSpin, loseAccepted = false, refreshBalances, refreshError = false, supportedTargets = [14_000, 20_000] } = {}) {
  const immutable = freezeCopy(receipts);
  let phase = 'DISCONNECTED', current = null, pending = null;
  let balance = immutable[0]?.walletReceipt.balanceBefore ?? '100.00';
  let fresh = false, used = 0, lost = false;
  const calls = { spin: [], connect: 0, recover: 0, refresh: 0, dispose: 0 };
  const account = () => ({
    authenticated: true, currency: 'ETB', balance,
    game: { id: GAME_ID, betLevels: ['0.20', '0.50'] },
  });
  const fixture = {
    kind: 'isolated-fixture', calls,
    get snapshot() {
      return freezeCopy({ phase, account: phase === 'DISCONNECTED' ? null : account(),
        pending, receipt: current, balanceFresh: fresh, canSpin: phase === 'READY', canAuto: phase === 'READY' });
    },
    supportsTarget(value) { return supportedTargets.includes(value); },
    async connect() { calls.connect++; phase = 'READY'; fresh = true; return account(); },
    async spin(wager) {
      calls.spin.push(freezeCopy(wager)); phase = 'REQUESTING'; fresh = false;
      const selected = immutable[used++];
      assert(selected, 'Fixture receipts exhausted; no locally generated replacement is allowed.');
      assert.equal(selected.bet, wager.bet);
      assert.equal(selected.rollX.targetBps, wager.targetBps);
      await beforeSpin?.();
      current = selected;
      if (loseAccepted && !lost) {
        lost = true; phase = 'PENDING'; pending = { testOnly: true, roundId: selected.roundId };
        throw Object.assign(new Error('Response lost after fixture acceptance'), { code: 'NETWORK_UNAVAILABLE' });
      }
      phase = 'SETTLED'; return selected;
    },
    async recover() { calls.recover++; assert(pending); pending = null; phase = 'SETTLED'; return current; },
    async refresh() {
      calls.refresh++;
      if (refreshError) { phase = 'DISCONNECTED'; fresh = false; throw Object.assign(new Error('Refresh unavailable'), { code: 'NETWORK_UNAVAILABLE' }); }
      balance = refreshBalances?.[calls.refresh - 1] ?? current?.walletReceipt.balanceAfter ?? balance;
      phase = 'READY'; fresh = true; return account();
    },
    dispose() { calls.dispose++; phase = 'DISPOSED'; fresh = false; },
  };
  return fixture;
}

export function instruments({ held = false } = {}) {
  const wait = deferred();
  const events = [];
  const audio = {
    unlock: async () => true,
    emit: event => events.push(event),
    setMuted: value => events.push(['mute', value]),
    setHidden: value => events.push(['hidden', value]),
    dispose: () => events.push('disposed'),
  };
  const renderer = {
    calls: [], finishes: 0, disposed: 0,
    async presentReceipt(receipt, options) {
      renderer.calls.push({ receipt, options });
      options.signal?.addEventListener('abort', () => wait.resolve(), { once: true });
      if (held) await wait.promise;
    },
    finishPresentation() { renderer.finishes++; wait.resolve(); },
    dispose() { renderer.disposed++; wait.resolve(); },
  };
  return { renderer, audio, events, release: () => wait.resolve() };
}

export async function waitUntil(predicate) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert(predicate(), 'Expected isolated state did not arrive.');
}
