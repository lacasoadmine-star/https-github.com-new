import test from 'node:test';
import assert from 'node:assert/strict';
import { createM10HostIntegration, COMPONENT } from './host-integration.mjs';
import { createMultiHot10DeferredLifecycle } from './deferred-lifecycle.mjs';
import { GAME_ID } from '../../new-games72-20261121/games/multi-hot-10/backend/contract.mjs';
import { fixture, acceptedRound, oldParent, existingGambleFactory, oldDependencies, userId, oldGameId, guard, modelIdentity } from './test-support.mjs';

test('a newly registered M10 loss expires the actual old gamble state without invoking its RNG or wallet move', async () => {
  const h = fixture(), parent = oldParent(); await h.seedOld(parent);
  const gamble = (await existingGambleFactory())(oldDependencies(h));
  const describe = () => h.transaction(async client => { await h.lockWallets(client, userId); return gamble.describe(client, userId, parent, { enabled: true, currentProfile: modelIdentity }); });
  assert.equal((await describe()).available, true);
  const round = acceptedRound();
  await h.transaction(async (client, draft) => { h.insertJournal(draft, round); await h.ownership.registerRound(client, round); });
  const state = await describe(); assert.equal(state.available, false); assert.equal(state.reason, 'GAMBLE_EXPIRED');
  assert.equal(h.snapshot().orders.get('new-m10:' + round.roundId).payout, '0');
  assert.deepEqual(h.snapshot().orders.get('nine:' + parent.round_id).outcome, parent.result_json);
});

test('duplicate registration preserves one shared row and the database-generated stored order', async () => {
  const h = fixture(), round = acceptedRound({ winAmount: '3.00' });
  const first = await h.transaction(async (client, draft) => { h.insertJournal(draft, round); return h.ownership.registerRound(client, round); });
  const attempts = await Promise.all(Array.from({ length: 12 }, () => h.transaction(client => h.ownership.registerRound(client, round))));
  assert.ok(attempts.every(value => value.settledOrder === first.settledOrder)); assert.equal(h.snapshot().orders.size, 1);
  const saved = h.snapshot().orders.get(first.sharedRoundId);
  assert.equal(saved.payout, '300'); assert.equal(saved.outcome.collectionStatus, 'PENDING');
  assert.equal(saved.outcome.walletReceipt.creditedWin, '0.00');
});

test('a conflicting shared owner or outcome is rejected without overwriting the shared history', async () => {
  for (const change of [{ user_id: 'someone-else' }, { payout: '1' }, { outcome: { altered: true } }]) {
    const h = fixture(), round = acceptedRound();
    await h.transaction(async (client, draft) => { h.insertJournal(draft, round); await h.ownership.registerRound(client, round); Object.assign(draft.orders.get('new-m10:' + round.roundId), change); });
    const before = h.snapshot();
    await assert.rejects(() => h.transaction(client => h.ownership.registerRound(client, round)), /M10_SHARED_ROUND_CONFLICT/);
    assert.deepEqual(h.snapshot(), before);
  }
});

test('failure after shared registration rolls back the new journal/order and leaves old eligibility unchanged', async () => {
  const h = fixture(), parent = oldParent(); await h.seedOld(parent);
  const before = h.snapshot(), round = acceptedRound();
  await assert.rejects(() => h.transaction(async (client, draft) => { h.insertJournal(draft, round); await h.ownership.registerRound(client, round); throw Error('SYNTHETIC_REQUEST_INSERT_FAILURE'); }), /SYNTHETIC_REQUEST_INSERT_FAILURE/);
  assert.deepEqual(h.snapshot(), before);
  const gamble = (await existingGambleFactory())(oldDependencies(h));
  await h.transaction(async client => { await h.lockWallets(client, userId); assert.equal((await gamble.describe(client, userId, parent, { enabled: true, currentProfile: modelIdentity })).available, true); });
});

test('registration requires the exact accepted M10 journal and deferred money identity', async () => {
  const h = fixture(), round = acceptedRound();
  await assert.rejects(() => h.transaction(client => h.ownership.registerRound(client, round)), /M10_SHARED_ROUND_JOURNAL_MISMATCH/);
  const invalid = structuredClone(round); invalid.receipt.walletReceipt.creditedWin = '1.00';
  await assert.rejects(() => h.transaction(async (client, draft) => { h.insertJournal(draft, invalid); await h.ownership.registerRound(client, invalid); }), /M10_SHARED_ROUND_INVALID/);
  assert.equal(h.snapshot().orders.size, 0); assert.equal(h.snapshot().journal.size, 0);
});

test('actual continued M10 state preserves an unrelated native TEXT round ID', async () => {
  const h = fixture();
  await h.transaction(async (client, draft) => { draft.native.push({ user_id: userId, id: 'native:existing/opaque-round', game_id: 'existing-native-game' }); });
  const lifecycle = createMultiHot10DeferredLifecycle({ authenticate: async () => userId, sessionGuard: async () => guard, hash: async () => guard,
    transaction: fn => h.transaction(client => fn(new Proxy({ authenticate: async () => userId,
      lockWallets: owner => h.lockWallets(client, owner), latestRound: async () => null,
      activeRound: owner => h.ownership.activeRound(client, owner), houseBalance: async () => 10000n, playerBalance: async () => 1000n },
    { get: (target, property) => property in target ? target[property] : async () => { throw Error('UNEXPECTED_STATE_MUTATION_' + String(property)); } }))) });
  const state = await lifecycle.state(new Request('https://synthetic.invalid/state'));
  assert.equal(state.blockedByActiveGame, 'existing-native-game'); assert.equal(state.balance, '10.00'); assert.equal(state.game.enabled, false);
  await h.transaction(async client => assert.deepEqual(await h.ownership.activeRound(client, userId), { gameId: 'existing-native-game', roundId: 'native:existing/opaque-round' }));
});

test('merged legacy state passes M10 ownership into the actual old nested gamble description on the same client', async () => {
  const h = fixture(), parent = oldParent(), round = acceptedRound({ winAmount: '3.00' }); await h.seedOld(parent);
  await h.transaction(async (client, draft) => { h.insertJournal(draft, round); draft.holds.set(round.roundId, { round_id: round.roundId, user_id: userId, amount_minor: '300' }); });
  const gamble = (await existingGambleFactory())(oldDependencies(h));
  await h.transaction(async client => {
    const state = await h.ownership.describeLegacyState(client, userId, {
      readSnapshot: async (sameClient, sameOwner) => { assert.equal(sameClient, client); assert.equal(sameOwner, userId);
        return { state: { authenticated: true, currency: 'ETB', sessionGuard: guard, balance: '10.00', game: { id: oldGameId, enabled: true, preservedField: 'existing' } }, parent, currentProfile: modelIdentity }; },
      describeGamble: (...args) => { assert.equal(args[0], client); return gamble.describe(...args); },
    });
    assert.equal(state.blockedByActiveGame, GAME_ID); assert.equal(state.round.gamble.available, false);
    assert.equal(state.round.gamble.reason, 'FINISH_ACTIVE_ROUND:' + GAME_ID);
    assert.equal(state.game.preservedField, 'existing'); assert.deepEqual(state.round.result, parent.result_json);
  });
});

test('simultaneous old and M10 ownership fails before exposing a misleading state snapshot', async () => {
  const h = fixture(), round = acceptedRound({ winAmount: '3.00' });
  await h.transaction(async (client, draft) => { h.insertJournal(draft, round); draft.holds.set(round.roundId, { round_id: round.roundId, user_id: userId, amount_minor: '300' });
    draft.native.push({ user_id: userId, id: 'native:opaque', game_id: 'existing-native-game' }); });
  let read = false;
  await assert.rejects(() => h.transaction(client => h.ownership.describeLegacyState(client, userId, {
    readSnapshot: async () => { read = true; }, describeGamble: async () => {},
  })), /M10_CROSS_GAME_ACTIVE_CONFLICT/);
  assert.equal(read, false);
});

test('a pending reservation cannot impersonate another owner or a collected round', async () => {
  for (const mode of ['missing-parent', 'different-owner', 'already-collected']) {
    const h = fixture(), round = acceptedRound({ winAmount: '3.00' });
    await h.transaction(async (client, draft) => {
      if (mode !== 'missing-parent') h.insertJournal(draft, round);
      if (mode === 'different-owner') draft.journal.get(round.roundId).user_id = 'another-owner';
      if (mode === 'already-collected') draft.collections.set(round.roundId, 'some-collection');
      draft.holds.set(round.roundId, { round_id: round.roundId, user_id: userId, amount_minor: '300' });
    });
    await assert.rejects(() => h.transaction(client => h.ownership.activeRound(client, userId)), /M10_ACTIVE_JOURNAL_MISMATCH/);
  }
});

test('composition creates no route-side activity or model and refuses already wrapped dependencies', () => {
  const names = ['transaction', 'authenticate', 'sessionGuard', 'hash', 'lockWallets', 'balance', 'houseFor', 'assertNoActive', 'assertPlayerCapacity'];
  const dependencies = Object.fromEntries(names.map(name => [name, () => { throw Error('CONSTRUCTION_MUST_NOT_CALL_' + name); }]));
  const composed = createM10HostIntegration({ dependencies });
  assert.equal(COMPONENT.productionEnabled, false); assert.equal(COMPONENT.installsModel, false);
  assert.equal(composed.lifecycle.handles(GAME_ID), true); assert.equal(composed.lifecycle.handles(oldGameId), false);
  assert.throws(() => createM10HostIntegration({ dependencies: { ...dependencies, m10ReservationsAware: true } }), /M10_RAW_FINAL_HOST_CALLBACKS_REQUIRED/);
});
