import test from 'node:test';
import assert from 'node:assert/strict';
import { SuperWildsController, GAME_ID } from './controller.mjs';

// Decision-boundary regression informed by the current official win-only AUTO
// observation: a threshold-stopped final win remains pending until TAKE.
// This is one synthetic ETB receipt, not a replay of the observed 19 rounds,
// a provider probability/RNG model, or evidence for count/manual-stop policy.
// The fixture's 10-unit stake / 30-unit award are integer minor units; no DMO
// wallet, account balance, or currency conversion is imported into the game.
const ROUND = '12345678-1234-4234-8234-123456789abc';
const key = n => `abcdefab-abcd-4abc-8abc-${String(n).padStart(12, '0')}`;
const copy = value => structuredClone(value);
const flush = async () => { for (let n = 0; n < 20; n++) await Promise.resolve(); };

function fixture({ holdTake = false, dropTake = false } = {}) {
  const bank = { balance: 10000, pending: 0, debits: 0, credits: 0 }, accepted = new Map();
  const calls = [], recoveries = [], errors = [], storage = new Map();
  let ordinal = 0, release = null;
  const transport = {
    state: async () => ({ gameId: GAME_ID, currency: 'ETB', subject: 'official-auto-fixture', canPlay: true,
      canDouble: false, betLevelsMinor: [10], betMinor: 10, balanceMinor: bank.balance, pendingWinMinor: bank.pending }),
    prepare: intent => ({ ...intent, authority: { mathVersion: 'synthetic-threshold-fixture', betMinor: intent.betMinor,
      ...(intent.action === 'SPIN' ? { collectRoundId: intent.collectRoundId } : { roundId: intent.roundId }) } }),
    async dispatch(intent) {
      calls.push(copy(intent)); assert.equal(accepted.has(intent.requestKey), false);
      let receipt;
      if (intent.action === 'SPIN') {
        assert.equal(bank.pending, 0); assert.equal(intent.collectRoundId, null);
        bank.balance -= intent.betMinor; bank.debits++; bank.pending = 30;
        receipt = { gameId: GAME_ID, currency: 'ETB', requestKey: intent.requestKey, roundId: ROUND, betMinor: intent.betMinor,
          winMinor: 30, balanceMinor: bank.balance, pendingWinMinor: 30, multiplier: 1, winningLines: [],
          grid: Array.from({ length: 5 }, () => ['synthetic-symbol', 'synthetic-symbol', 'synthetic-symbol']) };
      } else {
        assert.equal(intent.action, 'TAKE'); assert.equal(intent.roundId, ROUND); assert.equal(bank.pending, 30);
        bank.balance += bank.pending; bank.pending = 0; bank.credits++;
        receipt = { gameId: GAME_ID, currency: 'ETB', requestKey: intent.requestKey, roundId: ROUND,
          collected: true, amountMinor: 30, balanceMinor: bank.balance };
      }
      accepted.set(intent.requestKey, { intent: copy(intent), receipt: copy(receipt) });
      if (intent.action === 'TAKE' && dropTake) { dropTake = false; throw Error('SYNTHETIC_ACCEPTED_TAKE_REPLY_LOST'); }
      if (intent.action === 'TAKE' && holdTake) return new Promise(resolve => { release = () => resolve(copy(receipt)); });
      return copy(receipt);
    },
    async recover(intent) { recoveries.push(copy(intent)); const saved = accepted.get(intent.requestKey);
      assert(saved); assert.deepEqual(intent, saved.intent); return copy(saved.receipt); },
  };
  const controller = new SuperWildsController({ transport, subject: 'official-auto-fixture', keyFactory: () => key(++ordinal),
    journalStorage: { getItem: name => storage.get(name), setItem: (name, value) => storage.set(name, value), removeItem: name => storage.delete(name) },
    onError: error => errors.push(error.message) });
  const thresholdStop = async () => {
    await controller.connect(); controller.configureAuto({ count: 25, winLimit: 10 }); assert.equal(controller.startAuto(), true);
    assert.equal(await controller.spin({ auto: true }), true); const original = copy(accepted.get(calls[0].requestKey).receipt);
    assert.equal(controller.finishPresentation(ROUND), true); await flush(); return original;
  };
  return { bank, accepted, calls, recoveries, errors, controller, thresholdStop,
    release: () => { assert(release); release(); } };
}

test('win-only AUTO threshold stops without collecting its final accepted win or placing another wager', async () => {
  const f = fixture(), original = await f.thresholdStop(), snapshot = f.controller.snapshot();
  assert.equal(snapshot.auto.active, false); assert.equal(snapshot.auto.reason, 'LIMIT');
  assert.equal(snapshot.auto.winLimit, 10); assert.equal(snapshot.auto.decreaseLimit, null); assert.equal(snapshot.auto.increaseLimit, null);
  assert.equal(snapshot.phase, 'WIN_PENDING'); assert.equal(snapshot.balanceMinor, 9990); assert.equal(snapshot.round.winMinor, 30);
  assert.equal(f.bank.pending, 30); assert.equal(f.bank.debits, 1); assert.equal(f.bank.credits, 0);
  assert.deepEqual(f.calls.map(intent => intent.action), ['SPIN']);
  assert.deepEqual(f.accepted.get(f.calls[0].requestKey).receipt, original); assert.deepEqual(f.errors, []);
});

test('explicit TAKE after win-threshold stop credits that pending win once and retains the accepted SPIN receipt', async () => {
  const f = fixture({ holdTake: true }), original = await f.thresholdStop();
  const taking = f.controller.take(); await flush(); assert.equal(f.controller.snapshot().phase, 'TAKING');
  assert.equal(await f.controller.take(), false); assert.equal(f.bank.credits, 1); assert.equal(f.calls.length, 2);
  f.release(); assert.equal(await taking, true); await flush();
  assert.equal(f.controller.snapshot().phase, 'READY'); assert.equal(f.controller.snapshot().balanceMinor, 10020);
  assert.equal(f.controller.snapshot().auto.active, false); assert.equal(f.bank.pending, 0); assert.equal(f.bank.debits, 1);
  assert.deepEqual(f.calls.map(intent => intent.action), ['SPIN', 'TAKE']); assert.equal(f.bank.credits, 1);
  assert.deepEqual(f.accepted.get(f.calls[0].requestKey).receipt, original); assert.deepEqual(f.errors, []);
});

test('lost explicit TAKE reply after threshold stop recovers its exact original key without a second credit or SPIN', async () => {
  const f = fixture({ dropTake: true }), original = await f.thresholdStop(); assert.equal(await f.controller.take(), false);
  const pending = f.controller.snapshot().pending; assert.equal(pending.action, 'TAKE'); assert.equal(f.controller.snapshot().phase, 'RECOVERY');
  assert.equal(f.bank.credits, 1); assert.equal(f.bank.debits, 1); assert.equal(await f.controller.recover(), true); await flush();
  assert.deepEqual(f.recoveries, [pending]); assert.equal(f.bank.credits, 1); assert.equal(f.bank.debits, 1);
  assert.equal(f.controller.snapshot().phase, 'READY'); assert.equal(f.controller.snapshot().balanceMinor, 10020);
  assert.deepEqual(f.calls.map(intent => intent.action), ['SPIN', 'TAKE']);
  assert.deepEqual(f.accepted.get(f.calls[0].requestKey).receipt, original);
});
