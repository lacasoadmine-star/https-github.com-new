import { createSuperWildsHostIntegration } from './host-integration.mjs';
import { createSuperWildsHttpHandler } from './http.mjs';
import { GAME_ID, SuperWildsError } from './lifecycle.mjs';
import { withSharedRequestOwner, createGuardedSuperWildsLegacyAction,
  createGuardedSuperWildsM10Lifecycle } from './ownership.mjs';

const fail = code => { throw new SuperWildsError(code); };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const RUNTIME_SQL = Object.freeze({
  nativeActive: "SELECT id,game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 2",
  parent: 'SELECT game_id FROM sw_nine.game_rounds WHERE round_id=$1::uuid AND user_id=$2',
  claimed: `SELECT 1 FROM sw_nine.game_rounds WHERE user_id=$1 AND (request_key=$2 OR ($3::text IS NOT NULL AND lower(request_key)=$3))
 UNION ALL SELECT 1 FROM sw_nine.actions WHERE user_id=$1 AND (request_key=$2 OR ($3::text IS NOT NULL AND lower(request_key)=$3))`,
  newer: `SELECT 1 FROM sw_rebuild.rounds newer JOIN sw_rebuild.rounds parent
 ON parent.id=$2 AND parent.user_id=newer.user_id
 WHERE newer.user_id=$1 AND newer.settled_order>parent.settled_order LIMIT 1`,
  journals: `SELECT to_regclass('sw_new_superwilds.requests') IS NOT NULL AS requests,
 to_regclass('sw_new_superwilds.rounds') IS NOT NULL AS rounds,
 to_regclass('sw_new_superwilds.collections') IS NOT NULL AS collections,
 to_regclass('sw_new_superwilds.gambles') IS NOT NULL AS gambles,
 to_regclass('sw_new_m10.requests') IS NOT NULL AS m10_requests,
 to_regclass('sw_rebuild.rounds') IS NOT NULL AS shared_rounds`,
});

/** Called once INSIDE the existing native binding, after its final session,
 * capacity, native-ownership and model callbacks have been constructed.
 * rawBalance/rawLockWallets are the retained unwrapped core callbacks.
 * The configuration is server code; no request may supply it.
 */
export async function createSuperWildsRuntimeHost({ dependencies, rawBalance, rawLockWallets,
  createRoutes, configuration, origin } = {}) {
  if (configuration?.attach !== true) return null;
  if (!dependencies || typeof rawBalance !== 'function' || typeof rawLockWallets !== 'function' ||
    typeof createRoutes !== 'function' || typeof origin !== 'string' || !origin) fail('SUPERWILDS_FINAL_RUNTIME_DEPENDENCIES_REQUIRED');
  const raw = { ...dependencies, balance: rawBalance, lockWallets: rawLockWallets,
    activeRound: async (client, userId) => {
      const result = await client.query(RUNTIME_SQL.nativeActive, [userId]);
      if (!Array.isArray(result.rows) || result.rows.length > 1) fail('SUPERWILDS_NATIVE_ACTIVE_CONFLICT');
      return result.rows[0] ? { gameId: result.rows[0].game_id, roundId: result.rows[0].id } : null;
    },
  };
  const policy = typeof configuration.resolve === 'function' ? configuration.resolve(raw) : configuration;
  if (typeof policy?.getApprovedModel !== 'function' || typeof policy.releaseEnabled !== 'function' ||
    typeof raw.accepting !== 'function') fail('SUPERWILDS_FINAL_RUNTIME_POLICY_REQUIRED');
  // The retained emergency stop applies to both wagers and X2. Collection and
  // accepted-key recovery remain available in the lifecycle after it closes.
  const releaseEnabled = async () => raw.accepting() === true && await policy.releaseEnabled() === true;
  const gambleEnabled = async () => raw.accepting() === true && typeof policy.gambleEnabled === 'function' && await policy.gambleEnabled() === true;
  const integration = createSuperWildsHostIntegration({ dependencies: raw,
    getApprovedModel: policy.getApprovedModel, releaseEnabled,
    getApprovedGambleModel: policy.getApprovedGambleModel, gambleEnabled,
    ...(configuration.uuid ? { uuid: configuration.uuid } : {}), ...(configuration.now ? { now: configuration.now } : {}) });
  // Read-only preflight before replacing any old dependency. A failure aborts
  // staging/boot; it never leaves only half of the old host wrapped.
  await raw.transaction(async client => {
    await integration.wallet.assertReady(client);
    const result = await client.query(RUNTIME_SQL.journals), row = result.rows?.[0];
    if (result.rowCount !== 1 || !row || Object.values(row).some(value => value !== true)) fail('SUPERWILDS_RUNTIME_JOURNALS_REQUIRED');
  });
  const final = integration.legacyDependencies;
  const retained = createRoutes(final);
  if (!['handles', 'state', 'spin', 'gamble'].every(name => typeof retained?.[name] === 'function')) fail('SUPERWILDS_EXISTING_ROUTE_FACTORY_REQUIRED');
  const routes = Object.freeze({ ...retained,
    spin: createGuardedSuperWildsLegacyAction({ dependencies: final, kind: 'SPIN', createAction: d => createRoutes(d).spin }),
    gamble: createGuardedSuperWildsLegacyAction({ dependencies: final, kind: 'GAMBLE', createAction: d => createRoutes(d).gamble }),
  });
  const handle = createSuperWildsHttpHandler({ lifecycle: integration.lifecycle,
    assertWriteOrigin: request => request.headers.get('origin') === origin, existingFetch: async () => null });
  async function guardLegacy(client, identity, operation) {
    const token = identity.requestKey, canonical = UUID.test(token ?? '') ? token.toLowerCase() : null;
    return withSharedRequestOwner(client, { ...identity, family: 'legacy' }, async () => {
      const previous = await client.query(RUNTIME_SQL.claimed, [identity.userId, token, canonical]);
      // Historical accepted receipts retain their original replay path even
      // when a newer game owns a pending win. New wagers must use merged owner.
      if (previous.rowCount === 0 && ['SPIN', 'GAMBLE'].includes(identity.kind)) {
        await integration.ownership.assertNoActive(client, identity.userId);
        if (identity.kind === 'GAMBLE' && identity.roundId) {
          const newer = await client.query(RUNTIME_SQL.newer, [identity.userId, 'nine:' + identity.roundId]);
          if (newer.rowCount) throw new SuperWildsError('GAMBLE_EXPIRED', 409);
        }
      }
      return operation();
    });
  }
  async function guardLegacyAction(client, identity, operation) {
    const result = await client.query(RUNTIME_SQL.parent, [identity.roundId, identity.userId]);
    // The retained callback itself verifies fingerprint/replay and requires
    // this owned parent before any transfer. Preserve its original 4xx path.
    if (result.rowCount === 0) return operation();
    if (result.rowCount !== 1 || typeof result.rows[0]?.game_id !== 'string') fail('SUPERWILDS_LEGACY_PARENT_INVALID');
    return guardLegacy(client, { ...identity, gameId: result.rows[0].game_id }, operation);
  }
  const binding = Object.freeze({ ...integration, handle, guardLegacy, guardLegacyAction,
    guardPreparedM10: (createLifecycle, dependencies) => createGuardedSuperWildsM10Lifecycle({ createLifecycle, dependencies }),
    releaseInfo: () => ({ gameId: GAME_ID, attached: true, mounted: true, schemaReady: true,
      cashEnabled: raw.accepting() === true && policy.releaseEnabled() === true,
      gambleEnabled: raw.accepting() === true && policy.gambleEnabled?.() === true,
      release: configuration.release ?? 'zplay-superwilds-runtime-1',
      probabilityModel: 'independent_zplay_model', providerProbabilityModel: false,
      existingWallet: 'sw_rebuild.wallets', existingLedger: 'sw_rebuild.ledger', independentHost: false }),
  });
  return Object.freeze({ binding, dependencies: final, routes });
}
