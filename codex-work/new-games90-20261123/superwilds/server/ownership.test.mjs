import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_ID } from './lifecycle.mjs';
import { M10_GAME_ID, REQUEST_SQL, ROUND_SQL, COMPONENT, withSharedRequestOwner, withSuperWildsRequestOwner,
  createSuperWildsRoundOwnership, createGuardedSuperWildsLegacyAction, createGuardedSuperWildsM10Lifecycle } from './ownership.mjs';
import { createExistingGamble } from '../../../native72-20261119/changes/batch01/server/existing-gamble.mjs';

const USER = 'isolated-user', OLD = 'fresh_multihot20', KEY = 'abcdefab-abcd-4abc-8abc-abcdefabcdef';
const ROUND = '01234567-89ab-4cde-8f01-23456789abcd', OLD_ROUND = '98765432-10ab-4cde-8fab-9876543210ab';
const MODEL = { engineVersion: 'synthetic-engine', mathVersion: 'synthetic-math', mathSha256: 'a'.repeat(64) };
const guard = 'b'.repeat(64), modelDate = '2026-11-23T00:00:00.000Z';
const copy = value => structuredClone(value);
const familyGame = family => family === 'superwilds' ? GAME_ID : family === 'm10' ? M10_GAME_ID : OLD;
const result = array => ({ rows: copy(array), rowCount: array.length });
const request = () => new Request('https://isolated.invalid/slots', { headers: { cookie: 'sw_session=' + 'c'.repeat(64) } });
const body = (family, key = KEY) => ({ gameId: familyGame(family), roundToken: key });

function round({ gameId = GAME_ID, win = '3.00', key = KEY, roundId = ROUND } = {}) {
  const receipt = { schema: gameId === GAME_ID ? 'zplay/superwilds-round/v1' : 'zplay/m10-deferred-round-receipt/v1',
    kind: 'SPIN', gameId, roundId, requestKey: key, bet: '1.00', winAmount: win, currency: 'ETB', ...MODEL,
    createdAt: modelDate, multiplier: 1, grid: Array.from({ length: 3 }, () => Array(5).fill('synthetic-symbol')),
    collectionStatus: win === '0.00' ? 'NOT_REQUIRED' : 'PENDING', previousCollection: null,
    walletReceipt: { currency: 'ETB', balanceBefore: '10.00', chargedStake: '1.00', creditedWin: '0.00', reservedWin: win, balanceAfter: '9.00' } };
  return { userId: USER, gameId, roundId, requestKey: key, bet: '1.00', winAmount: win, receipt };
}
function savedRound(value) {
  return { round_id: value.roundId.toLowerCase(), user_id: value.userId, game_id: value.gameId,
    request_key: value.requestKey.toLowerCase(), stake_minor: '100', win_minor: BigInt(value.winAmount.replace('.', '')).toString(), receipt: copy(value.receipt) };
}
function hold(value, amount = value.winAmount.replace('.', '')) {
  return { ...savedRound(value), round_user_id: value.userId, user_id: value.userId,
    house_wallet_id: 'isolated-house', amount_minor: amount, closed_reason: null, collection_id: null };
}

/** Serial transactional relation fixture, not a PostgreSQL-lock proof. */
function fixture({ installed = { m10: true, superwilds: true } } = {}) {
  let state = { owners: [], journal: new Map(), orders: new Map(), ordinal: 0, native: [], m10: [], superwilds: [], mutations: 0 };
  let tail = Promise.resolve(); const queries = [], locks = [];
  const activeInstallation = Object.fromEntries(['m10', 'superwilds'].flatMap(family =>
    ['reservations', 'rounds', 'collections'].map(table => [family + '_' + table, installed[family]])));
  function clientFor(draft) {
    const client = {
      accept(family, userId, gameId, key, action = 'SPIN') {
        draft.mutations++;
        draft.owners.push({ journal: family === 'legacy' ? action === 'SPIN' ? 'legacy-round' : 'legacy-action' : family,
          user_id: userId, game_id: gameId, action, key,
          ...(family !== 'legacy' ? { request_key: key.toLowerCase(), receipt_kind: action, receipt_request_key: key } : {}) });
      },
      async query(sql, params = []) {
        queries.push({ sql, params: copy(params) });
        if (sql === REQUEST_SQL.lock) return result([{}]);
        if (sql === REQUEST_SQL.installation) return result([installed]);
        if (sql === ROUND_SQL.installation) return result([activeInstallation]);
        if ([REQUEST_SQL.legacyOwners, REQUEST_SQL.m10Owners, REQUEST_SQL.superwildsOwners].includes(sql)) {
          const family = sql === REQUEST_SQL.legacyOwners ? 'legacy' : sql === REQUEST_SQL.m10Owners ? 'm10' : 'superwilds';
          return result(draft.owners.filter(row => row.user_id === params[0] &&
            (family === 'legacy' ? row.journal.startsWith('legacy-') : row.journal === family) &&
            (family === 'legacy' ? row.key === params[1] || params[2] !== null && row.key.toLowerCase() === params[2] : row.key.toLowerCase() === params[1])));
        }
        if (sql === ROUND_SQL.gambles) return result(draft.gambles?.get(params[1]) ?? []);
        if (sql === ROUND_SQL.journal) return result(draft.journal.has(params[0].toLowerCase()) ? [draft.journal.get(params[0].toLowerCase())] : []);
        if (sql === ROUND_SQL.insertOrder) {
          if (draft.orders.has(params[0])) return result([]);
          const [id, user_id, game, bet, payout, encoded] = params;
          const value = { id, user_id, game, bet, payout, outcome: JSON.parse(encoded), settled_order: String(++draft.ordinal) };
          draft.orders.set(id, value); return result([{ settled_order: value.settled_order }]);
        }
        if (sql === ROUND_SQL.order) return result(draft.orders.has(params[0]) ? [draft.orders.get(params[0])] : []);
        if (sql === ROUND_SQL.nativeActive) return result(draft.native.filter(row => row.user_id === params[0]).slice(0, 2));
        if (sql === ROUND_SQL.m10Active || sql === ROUND_SQL.superwildsActive) return result(draft[sql === ROUND_SQL.m10Active ? 'm10' : 'superwilds'].filter(row => row.user_id === params[0]).slice(0, 2));
        if (sql === "SELECT attempt,result_json FROM sw_nine.actions WHERE parent_id=$1 AND kind='GAMBLE' ORDER BY attempt DESC LIMIT 1") return result([]);
        if (sql === 'SELECT settled_order FROM sw_rebuild.rounds WHERE id=$1 AND user_id=$2') {
          const value = draft.orders.get(params[0]); return result(value?.user_id === params[1] ? [{ settled_order: value.settled_order }] : []);
        }
        if (sql === 'SELECT 1 FROM sw_rebuild.rounds WHERE user_id=$1 AND settled_order>$2::bigint LIMIT 1') return result([...draft.orders.values()].some(row => row.user_id === params[0] && BigInt(row.settled_order) > BigInt(params[1])) ? [{ exists: 1 }] : []);
        throw Error('UNEXPECTED_FIXTURE_QUERY: ' + sql);
      },
    };
    return client;
  }
  const transaction = operation => {
    const job = tail.then(async () => { const draft = copy(state); const value = await operation(clientFor(draft), draft); state = draft; return value; });
    tail = job.catch(() => {}); return job;
  };
  const lockWallets = async (client, userId) => { assert.equal(typeof client.query, 'function'); locks.push(userId); return [{ id: userId }, { id: 'isolated-house' }]; };
  const ownership = createSuperWildsRoundOwnership({ lockWallets });
  const act = (family, { action = 'SPIN', userId = USER, gameId = familyGame(family), key = KEY, after = () => {}, record = true } = {}) => transaction(async client => {
    await lockWallets(client, userId);
    return withSharedRequestOwner(client, { family, action, userId, gameId, requestKey: key }, async () => {
      const found = state.owners.find(row => row.user_id === userId && row.key.toLowerCase() === key.toLowerCase());
      if (!found && record) client.accept(family, userId, gameId, key, action);
      await after(client); return { family, action, key };
    });
  });
  return { transaction, lockWallets, ownership, act, queries, locks, installed, activeInstallation, snapshot: () => copy(state) };
}
const conflict = callback => assert.rejects(callback, error => error.code === 'IDEMPOTENCY_PARAMETER_CONFLICT' && error.status === 409);

test('Super Wilds, legacy and prepared M10 reject every cross-family token collision before a second mutation', async () => {
  for (const first of ['superwilds', 'legacy', 'm10']) for (const second of ['superwilds', 'legacy', 'm10']) {
    if (first === second) continue;
    const h = fixture(); await h.act(first); await conflict(() => h.act(second));
    assert.equal(h.snapshot().mutations, 1); assert.equal(h.snapshot().owners.length, 1);
  }
});
test('legacy action keys and new TAKE keys share SPIN ownership in both directions', async () => {
  for (const action of ['GAMBLE', 'PICK']) {
    const h = fixture(); await h.act('legacy', { action }); await conflict(() => h.act('superwilds', { action: 'TAKE_WIN' }));
    const reverse = fixture(); await reverse.act('superwilds', { action: 'TAKE_WIN' }); await conflict(() => reverse.act('legacy', { action }));
  }
});
test('matching replay preserves the accepted uppercase token and creates one journal claim', async () => {
  const h = fixture(); const first = await h.act('superwilds', { key: KEY.toUpperCase() });
  assert.equal((await h.act('superwilds', { key: KEY.toUpperCase() })).key, first.key);
  await conflict(() => h.act('m10', { key: KEY })); assert.equal(h.snapshot().mutations, 1);
  assert.equal(h.snapshot().owners[0].receipt_request_key, KEY.toUpperCase());
  assert.equal(new Set(h.queries.filter(row => row.sql === REQUEST_SQL.lock).map(row => row.params[0])).size, 1);
});
test('legacy non-UUID key remains exact and is never cast or interpolated into SQL', async () => {
  const h = fixture(), key = "old-key-quote-'-$1";
  await h.act('legacy', { key }); await h.act('legacy', { key });
  assert.equal(h.snapshot().mutations, 1);
  assert.equal(h.queries.some(row => [REQUEST_SQL.m10Owners, REQUEST_SQL.superwildsOwners].includes(row.sql)), false);
  assert(h.queries.every(row => !row.sql.includes(key)));
});
test('legacy keeps working before either new journal is installed; absent new family fails before callback', async () => {
  const h = fixture({ installed: { m10: false, superwilds: false } });
  await h.act('legacy'); await assert.rejects(() => h.act('superwilds'), /SUPERWILDS_REQUEST_JOURNAL_NOT_INSTALLED/);
  await assert.rejects(() => h.act('m10'), /M10_REQUEST_JOURNAL_NOT_INSTALLED/); assert.equal(h.snapshot().mutations, 1);
});
test('missing journal claim and callback failure roll back the original mutation', async () => {
  const h = fixture(); await assert.rejects(() => h.act('superwilds', { record: false }), /CLAIM_NOT_RECORDED/);
  await assert.rejects(() => h.act('superwilds', { after: () => { throw Error('ORIGINAL_CALLBACK_FAILED'); } }), /ORIGINAL_CALLBACK_FAILED/);
  assert.equal(h.snapshot().mutations, 0); await h.act('legacy'); assert.equal(h.snapshot().mutations, 1);
});
test('ambiguous historical claims and mismatched new receipt identity fail before the action', async () => {
  const h = fixture(); await h.act('superwilds');
  await h.transaction((client, draft) => { client.accept('legacy', USER, OLD, KEY, 'SPIN'); });
  await assert.rejects(() => h.act('superwilds'), /REQUEST_OWNER_AMBIGUOUS/);
  const invalid = fixture(); await invalid.act('superwilds');
  await invalid.transaction((client, draft) => { draft.owners[0].receipt_request_key = '12345678-1234-4234-8234-123456789abc'; });
  await assert.rejects(() => invalid.act('superwilds'), /REQUEST_OWNER_JOURNAL_INVALID/); assert.equal(invalid.snapshot().mutations, 1);
});
test('serialized concurrent family attempts preserve one journal owner and distinguish users', async () => {
  const h = fixture(), calls = Array.from({ length: 18 }, (_, i) => h.act(['superwilds', 'legacy', 'm10'][i % 3]));
  const results = await Promise.allSettled(calls);
  assert.equal(results.filter(row => row.status === 'fulfilled').length, 6); assert.equal(h.snapshot().mutations, 1);
  await h.act('legacy', { userId: 'second-isolated-user' }); assert.equal(h.snapshot().mutations, 2);
});
test('Super Wilds facade binds only its family and rejects contradictory action aliases', async () => {
  const h = fixture(); await assert.rejects(() => h.transaction(client => withSuperWildsRequestOwner(client,
    { family: 'legacy', userId: USER, gameId: GAME_ID, requestKey: KEY, kind: 'SPIN' }, () => {})), /IDENTITY_INVALID/);
  await assert.rejects(() => h.transaction(client => withSuperWildsRequestOwner(client,
    { userId: USER, gameId: GAME_ID, requestKey: KEY, kind: 'SPIN', action: 'TAKE_WIN' }, () => {})), /IDENTITY_INVALID/);
  assert.equal(h.snapshot().mutations, 0);
});
test('legacy final-factory seam retains original callbacks and wraps both action sides', async () => {
  const h = fixture(), marker = () => 'original', observations = [];
  const dependencies = { transaction: h.transaction, authenticate: async (...args) => { if (args[1]) observations.push(args); return USER; },
    lockWallets: h.lockWallets, move: marker, profileForGame: marker };
  const originalFactory = scoped => {
    assert.equal(scoped.move, marker); assert.equal(scoped.profileForGame, marker);
    return (req, value) => scoped.transaction(async client => { client.accept('legacy', USER, value.gameId, value.roundToken, 'PICK'); return { original: true }; });
  };
  const action = createGuardedSuperWildsLegacyAction({ createAction: originalFactory, dependencies, kind: 'PICK' });
  assert.deepEqual(await action(request(), body('legacy')), { original: true }); assert.equal(observations[0][2], true);
  await conflict(() => h.act('superwilds')); assert.equal(h.snapshot().mutations, 1);
});
test('prepared M10 final-factory seams guard SPIN TAKE and GAMBLE while state stays read-only', async () => {
  const h = fixture(), methods = { spin: 'SPIN', takeWin: 'TAKE_WIN', gamble: 'GAMBLE' };
  const createLifecycle = scoped => ({ handles: gameId => gameId === M10_GAME_ID, state: async () => ({ original: true }),
    ...Object.fromEntries(Object.entries(methods).map(([method, action]) => [method, (req, value) => scoped.transaction(async client => {
      client.accept('m10', USER, M10_GAME_ID, value.roundToken, action); return { method };
    })])) });
  const api = createGuardedSuperWildsM10Lifecycle({ createLifecycle, dependencies: {
    transaction: h.transaction, authenticate: async () => USER, wallet: { lockWallets: h.lockWallets } } });
  const before = h.queries.length; assert.deepEqual(await api.state(request()), { original: true }); assert.equal(h.queries.length, before);
  await api.spin(request(), body('m10')); await conflict(() => api.takeWin(request(), body('m10')));
  await conflict(() => api.gamble(request(), body('m10'))); await conflict(() => h.act('superwilds'));
  assert.equal(h.snapshot().mutations, 1);
});

test('positive and losing Super Wilds spins register their exact accepted journal and immutable shared order', async () => {
  for (const win of ['0.00', '3.00']) {
    const h = fixture(), accepted = round({ win, key: KEY.toUpperCase() });
    const first = await h.transaction(async (client, draft) => { draft.journal.set(ROUND, savedRound(accepted)); return h.ownership.registerRound(client, accepted); });
    for (let i = 0; i < 5; i++) assert.deepEqual(await h.transaction(client => h.ownership.registerRound(client, accepted)), first);
    const shared = h.snapshot().orders.get(first.sharedRoundId);
    assert.equal(h.snapshot().orders.size, 1); assert.equal(shared.payout, BigInt(win.replace('.', '')).toString());
    assert.deepEqual(shared.outcome, accepted.receipt); assert.equal(shared.outcome.walletReceipt.creditedWin, '0.00');
    assert.equal(shared.outcome.requestKey, KEY.toUpperCase());
  }
});
test('shared registration rejects every changed journal identity before writing an order', async () => {
  for (const change of [{ user_id: 'another-user' }, { game_id: OLD }, { request_key: '12345678-1234-4234-8234-123456789abc' },
    { stake_minor: '200' }, { win_minor: '0' }, { receipt: { altered: true } }]) {
    const h = fixture(), accepted = round();
    await assert.rejects(() => h.transaction(async (client, draft) => {
      draft.journal.set(ROUND, { ...savedRound(accepted), ...change }); await h.ownership.registerRound(client, accepted);
    }), /SHARED_ROUND_JOURNAL_MISMATCH/); assert.equal(h.snapshot().orders.size, 0);
  }
});
test('shared registration requires deferred wallet identity and does not overwrite a conflicting shared row', async () => {
  const invalid = round(); invalid.receipt.walletReceipt.creditedWin = '3.00';
  const h = fixture(); await assert.rejects(() => h.transaction(client => h.ownership.registerRound(client, invalid)), /SHARED_ROUND_INVALID/);
  const accepted = round(); await h.transaction(async (client, draft) => { draft.journal.set(ROUND, savedRound(accepted));
    await h.ownership.registerRound(client, accepted); draft.orders.get('new-superwilds:' + ROUND).payout = '1'; });
  const before = h.snapshot(); await assert.rejects(() => h.transaction(client => h.ownership.registerRound(client, accepted)), /SHARED_ROUND_CONFLICT/);
  assert.deepEqual(h.snapshot(), before);
});
test('a failure after shared registration rolls back both the journal and order', async () => {
  const h = fixture(), accepted = round();
  await assert.rejects(() => h.transaction(async (client, draft) => { draft.journal.set(ROUND, savedRound(accepted));
    await h.ownership.registerRound(client, accepted); throw Error('LATE_ORIGINAL_FAILURE'); }), /LATE_ORIGINAL_FAILURE/);
  assert.equal(h.snapshot().journal.size, 0); assert.equal(h.snapshot().orders.size, 0);
});
test('active hooks merge own holds M10 gamble holds and opaque native TEXT identities', async () => {
  const h = fixture(), accepted = round({ key: KEY.toUpperCase() });
  await h.transaction((client, draft) => { draft.superwilds.push(hold(accepted)); });
  assert.deepEqual(await h.transaction(client => h.ownership.activeRound(client, USER)), { gameId: GAME_ID, roundId: ROUND });
  await assert.rejects(() => h.transaction(client => h.ownership.assertNoActive(client, USER)), /FINISH_ACTIVE_ROUND/);
  const m10 = fixture(); await m10.transaction((client, draft) => { draft.m10.push(hold(round({ gameId: M10_GAME_ID }), '600')); });
  assert.deepEqual(await m10.transaction(client => m10.ownership.activeRound(client, USER)), { gameId: M10_GAME_ID, roundId: ROUND });
  const native = fixture(); await native.transaction((client, draft) => { draft.native.push({ user_id: USER, id: 'native:existing/opaque-round', game_id: 'existing-native' }); });
  assert.deepEqual(await native.transaction(client => native.ownership.activeRound(client, USER)), { gameId: 'existing-native', roundId: 'native:existing/opaque-round' });
});
test('multiple active families and partially installed new journals fail without selecting one owner', async () => {
  const h = fixture(); await h.transaction((client, draft) => { draft.superwilds.push(hold(round()));
    draft.native.push({ user_id: USER, id: 'native:opaque', game_id: 'existing-native' }); });
  await assert.rejects(() => h.transaction(client => h.ownership.activeRound(client, USER)), /CROSS_GAME_ACTIVE_CONFLICT/);
  const partial = fixture(); partial.activeInstallation.superwilds_collections = false;
  await assert.rejects(() => partial.transaction(client => partial.ownership.activeRound(client, USER)), /ACTIVE_INSTALLATION_INCOMPLETE/);
  const absent = fixture({ installed: { m10: false, superwilds: false } });
  assert.equal(await absent.transaction(client => absent.ownership.activeRound(client, USER)), null);
});
test('positive holds require the matching accepted owner amount and uncollected open round', async () => {
  for (const change of [{ round_user_id: 'another-user' }, { collection_id: ROUND }, { amount_minor: '200' },
    { closed_reason: 'COLLECTED' }, { receipt: null }, { house_wallet_id: USER }]) {
    const h = fixture(); await h.transaction((client, draft) => { draft.superwilds.push({ ...hold(round()), ...change }); });
    await assert.rejects(() => h.transaction(client => h.ownership.activeRound(client, USER)), /ACTIVE_JOURNAL_MISMATCH/);
  }
});

function oldParent() {
  return { round_id: OLD_ROUND, user_id: USER, game_id: OLD, total_win: '300', created_at: modelDate,
    result_json: { gameId: OLD, finalWin: '3.00', ...MODEL } };
}
function oldGamble(h) {
  const forbidden = () => { throw Error('STATE_MUST_NOT_SAMPLE_OR_TRANSFER'); };
  return createExistingGamble({ authenticate: async () => USER, transaction: h.transaction, lockWallets: h.lockWallets,
    move: forbidden, balance: async () => 10000n, houseFor: () => 'isolated-house', hash: () => guard,
    accepting: () => true, profileForGame: async () => MODEL, publicGames: () => [], assertOperatorWagerEnabled: async () => {},
    assertNoActive: async () => {}, assertPlayerCapacity: async () => {}, now: () => Date.parse(modelDate) + 1000, drawIndex: forbidden });
}
test('a newly registered Super Wilds loss expires actual existing old-game gamble eligibility', async () => {
  const h = fixture(), parent = oldParent(), gamble = oldGamble(h), accepted = round({ win: '0.00' });
  await h.transaction((client, draft) => { draft.orders.set('nine:' + OLD_ROUND, { id: 'nine:' + OLD_ROUND, user_id: USER, settled_order: String(++draft.ordinal) }); });
  const describe = () => h.transaction(client => gamble.describe(client, USER, parent, { enabled: true, currentProfile: MODEL }));
  assert.equal((await describe()).available, true);
  await h.transaction(async (client, draft) => { draft.journal.set(ROUND, savedRound(accepted)); await h.ownership.registerRound(client, accepted); });
  assert.equal((await describe()).reason, 'GAMBLE_EXPIRED'); assert.equal((await describe()).available, false);
});
test('merged state supplies active ownership before the actual old nested gamble descriptor on the same client', async () => {
  const h = fixture(), parent = oldParent(), gamble = oldGamble(h);
  await h.transaction((client, draft) => { draft.superwilds.push(hold(round())); });
  await h.transaction(async client => {
    const state = await h.ownership.describeLegacyState(client, USER, {
      readSnapshot: async (same, owner) => { assert.equal(same, client); assert.equal(owner, USER); return {
        state: { authenticated: true, currency: 'ETB', sessionGuard: guard, balance: '10.00', game: { id: OLD, enabled: true, originalField: 7 } }, parent, currentProfile: MODEL }; },
      describeGamble: (...args) => { assert.equal(args[0], client); return gamble.describe(...args); },
    });
    assert.equal(state.blockedByActiveGame, GAME_ID); assert.equal(state.game.originalField, 7);
    assert.equal(state.round.gamble.reason, 'FINISH_ACTIVE_ROUND:' + GAME_ID); assert.equal(state.round.gamble.available, false);
    assert.deepEqual(state.round.result, parent.result_json);
  });
});
test('construction is inert and invalid composition does not install a wallet model or route', () => {
  assert.equal(COMPONENT.productionEnabled, false); assert.equal(COMPONENT.createsWallet, false);
  assert.throws(() => createSuperWildsRoundOwnership(), /EXISTING_WALLET_LOCKS_REQUIRED/);
  assert.throws(() => createGuardedSuperWildsLegacyAction(), /LEGACY_GUARD_DEPENDENCIES_REQUIRED/);
  assert.throws(() => createGuardedSuperWildsM10Lifecycle(), /M10_GUARD_DEPENDENCIES_REQUIRED/);
});
