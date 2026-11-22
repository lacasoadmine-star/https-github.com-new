import { createM10ReservationBridge } from '../m10-house-reservations/bridge.mjs';
import { createGuardedMultiHot10Lifecycle } from '../request-owner-guard/adapter-seams.mjs';
import { createMultiHot10PostgresLifecycle } from './postgres-lifecycle.mjs';
import { createM10RoundOwnership } from './round-ownership.mjs';
import { fail } from '../../new-games72-20261121/games/multi-hot-10/backend/contract.mjs';

export const COMPONENT = Object.freeze({ mounted: false, productionEnabled: false,
  migrationApplied: false, createsWallet: false, installsModel: false });

/** Concrete composition of the continued project-owned lifecycle, protected
 * existing wallet, symmetric request guard and shared ordering. Pass the
 * FINAL host dependency callbacks (after its native binding overrides), not
 * an outer object whose assertNoActive may be overwritten later.
 */
export function createM10HostIntegration({ dependencies, getApprovedModel, resolveApprovedModel,
  releaseEnabled, uuid, now } = {}) {
  if (!['transaction', 'authenticate', 'sessionGuard', 'hash', 'lockWallets', 'balance', 'houseFor',
    'assertNoActive', 'assertPlayerCapacity'].every(name => typeof dependencies?.[name] === 'function') ||
    dependencies.m10ReservationsAware) fail('M10_RAW_FINAL_HOST_CALLBACKS_REQUIRED');
  const d = dependencies;
  // Only the richer host hook supplies native ownership. No native row is
  // created to impersonate a new game's reservation.
  const nativeOnly = async (client, userId) => {
    // The reservation bridge owns its M10 lookup. Supplying a merged callback
    // here would count its own hold twice. This original-only read preserves
    // the existing native text ID contract.
    const result = await client.query("SELECT id,game_id FROM sw_native_library.rounds WHERE user_id=$1 AND status='active' ORDER BY created_at,id LIMIT 2", [userId]);
    if (result.rows.length > 1) fail('M10_CROSS_GAME_ACTIVE_CONFLICT');
    return result.rows[0] ? { gameId: result.rows[0].game_id, roundId: result.rows[0].id } : null;
  };
  const reservation = createM10ReservationBridge({ ...d, activeRound: nativeOnly });
  const ownership = createM10RoundOwnership({ lockWallets: reservation.wallet.lockWallets });
  const wallet = Object.freeze({ ...reservation.wallet,
    activeRound: ownership.activeRound,
    assertNoActiveRound: async (client, userId) => {
      await reservation.wallet.assertNoActiveRound(client, userId);
      await ownership.assertNoActive(client, userId);
    },
  });
  const legacyDependencies = Object.freeze({ ...reservation.legacyDependencies,
    activeRound: ownership.activeRound,
    assertNoActive: async (client, userId) => {
      await reservation.legacyDependencies.assertNoActive(client, userId);
      await ownership.assertNoActive(client, userId);
    },
  });
  const configuration = Object.fromEntries(Object.entries({ getApprovedModel, resolveApprovedModel, releaseEnabled, uuid, now })
    .filter(([, value]) => value !== undefined));
  const lifecycle = createGuardedMultiHot10Lifecycle({
    createLifecycle: createMultiHot10PostgresLifecycle,
    dependencies: { ...configuration, transaction: d.transaction, authenticate: d.authenticate,
      sessionGuard: d.sessionGuard, hash: d.hash, wallet, roundHooks: ownership },
  });
  return Object.freeze({ lifecycle, legacyDependencies, ownership });
}
