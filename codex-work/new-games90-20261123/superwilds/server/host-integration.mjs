import { createSuperWildsReservationBridge } from './reservations.mjs';
import { createSuperWildsPostgresService } from './postgres.mjs';
import { createSuperWildsRoundOwnership, withSuperWildsRequestOwner } from './ownership.mjs';
import { SuperWildsError } from './lifecycle.mjs';
import { createSuperWildsHttpHandler } from './http.mjs';

/** All callbacks are the FINAL ones used by the existing authenticated host.
 * Construction does not run SQL, enable a model or install a route. The host
 * must use legacyDependencies and the symmetric guard for its old routes too.
 */
export function createSuperWildsHostIntegration({ dependencies, getApprovedModel, releaseEnabled, getApprovedGambleModel, gambleEnabled, uuid, now } = {}) {
  const required = ['transaction', 'authenticate', 'sessionGuard', 'hash', 'lockWallets', 'balance',
    'houseFor', 'assertNoActive', 'assertPlayerCapacity', 'activeRound'];
  if (!required.every(name => typeof dependencies?.[name] === 'function') ||
    dependencies.m10ReservationsAware || dependencies.superWildsReservationsAware) {
    throw new SuperWildsError('SUPERWILDS_RAW_FINAL_HOST_CALLBACKS_REQUIRED');
  }
  const d = dependencies, reservation = createSuperWildsReservationBridge(d);
  const ownership = createSuperWildsRoundOwnership({ lockWallets: reservation.wallet.lockWallets });
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
  const configuration = Object.fromEntries(Object.entries({ getApprovedModel, releaseEnabled, getApprovedGambleModel, gambleEnabled, uuid, now })
    .filter(([, value]) => value !== undefined));
  const lifecycle = createSuperWildsPostgresService({ ...configuration,
    transaction: d.transaction, authenticate: d.authenticate, sessionGuard: d.sessionGuard, hash: d.hash,
    wallet, withRequestOwner: withSuperWildsRequestOwner, registerRound: ownership.registerRound });
  return Object.freeze({ lifecycle, wallet, ownership, legacyDependencies,
    describeLegacyState: ownership.describeLegacyState });
}

/** Concrete fetch attachment inside the current server. Existing routes
 * retain their original handler; their FINAL dependency factory must consume
 * legacyDependencies and the symmetric guard exported by ownership.mjs.
 */
export function createSuperWildsExistingHostBinding({ existingFetch, assertWriteOrigin, ...configuration } = {}) {
  const integration = createSuperWildsHostIntegration(configuration);
  return Object.freeze({ ...integration, fetch: createSuperWildsHttpHandler({
    lifecycle: integration.lifecycle, existingFetch, assertWriteOrigin,
  }) });
}
