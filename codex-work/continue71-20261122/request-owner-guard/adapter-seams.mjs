import { RequestOwnerError, withRequestOwnerGuard } from './request-owner-guard.mjs';

const fail = code => { throw new RequestOwnerError(code); };
const auth = async (dependencies, request, client) => {
  const userId = await dependencies.authenticate(request, client, true);
  if (typeof userId !== 'string' || !userId) throw new RequestOwnerError('PLAYER_LOGIN_REQUIRED', 401);
  return userId;
};

function guardedDependencies(dependencies, request, body, family, action, lockWallets) {
  return { ...dependencies, transaction: fn => dependencies.transaction(async client => {
    const userId = await auth(dependencies, request, client);
    // Use the actual host's stable lock ordering. The original adapter may
    // lock these rows again on the same client; PostgreSQL retains that lock.
    await lockWallets(client, userId);
    return withRequestOwnerGuard(client, { userId, requestKey: body?.roundToken,
      gameId: body?.gameId, family, action }, () => fn(client));
  }) };
}

/**
 * The factory is the original legacy SPIN or action factory supplied by host.
 * Example seam: createAction: deps => createSwNinePgAdapter(deps).
 * For a legacy action object: deps => createExistingGamble(deps).gamble.
 * No old evaluator, payout, move(), receipt or SQL body is replaced.
 */
export function createGuardedLegacyAction({ createAction, dependencies, kind = 'SPIN' } = {}) {
  if (typeof createAction !== 'function' || !['SPIN', 'GAMBLE', 'PICK'].includes(kind) ||
    !['transaction', 'authenticate', 'lockWallets'].every(name => typeof dependencies?.[name] === 'function')) {
    fail('REQUEST_OWNER_LEGACY_DEPENDENCIES_REQUIRED');
  }
  return async (request, body) => {
    const adapter = createAction(guardedDependencies(dependencies, request, body, 'legacy', kind, dependencies.lockWallets));
    if (typeof adapter !== 'function') fail('REQUEST_OWNER_LEGACY_FACTORY_INVALID');
    return adapter(request, body);
  };
}

/**
 * Use the prepared M10 PostgreSQL lifecycle factory, not its lower-level
 * in-memory transaction interface. Its transaction accepts the PG client.
 * Read-only state remains the original method; SPIN/TAKE/X2 share the guard.
 */
export function createGuardedMultiHot10Lifecycle({ createLifecycle, dependencies } = {}) {
  if (typeof createLifecycle !== 'function' || typeof dependencies?.wallet?.lockWallets !== 'function' ||
    !['transaction', 'authenticate'].every(name => typeof dependencies?.[name] === 'function')) {
    fail('REQUEST_OWNER_M10_DEPENDENCIES_REQUIRED');
  }
  const baseline = createLifecycle(dependencies);
  const methods = { spin: 'SPIN', takeWin: 'TAKE_WIN', gamble: 'GAMBLE' };
  if (!['handles', 'state', ...Object.keys(methods)].every(name => typeof baseline?.[name] === 'function')) {
    fail('REQUEST_OWNER_M10_FACTORY_INVALID');
  }
  const result = { handles: baseline.handles.bind(baseline), state: baseline.state.bind(baseline) };
  for (const [method, action] of Object.entries(methods)) {
    result[method] = async (request, body) => {
      const scoped = guardedDependencies(dependencies, request, body, 'm10', action,
        (client, userId) => dependencies.wallet.lockWallets(client, userId));
      const lifecycle = createLifecycle(scoped);
      if (typeof lifecycle?.[method] !== 'function') fail('REQUEST_OWNER_M10_FACTORY_INVALID');
      return lifecycle[method](request, body);
    };
  }
  return Object.freeze(result);
}
