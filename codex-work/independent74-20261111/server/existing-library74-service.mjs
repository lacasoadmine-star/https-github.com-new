import { createExistingLibrary74Adapter, composeExistingLibrary74Registry } from './existing-library74-adapter.mjs';

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (code, status = 422) => { throw Object.assign(new Error(code), { code, status }); };
function trustedUser(userId) {
  if (typeof userId !== 'string' || !userId || userId.length > 100 || userId.startsWith('@') || /[\r\n]/.test(userId)) fail('RESOLVED_PLAYER_ID_REQUIRED', 401);
  return userId;
}

// Call only after the retained signature verifier and resolveSessionUser have
// authenticated the request. A browser must never choose the userId argument.
// No database, wallet, migrations, timers, or replacement service are created.
export function installExistingLibrary74({ service, ...adapterOptions } = {}) {
  if (typeof service?.state !== 'function' || typeof service?.action !== 'function' || typeof service?.snapshot !== 'function' || typeof service?.view !== 'function' || typeof service?.shared?.transaction !== 'function') throw new TypeError('An existing initialized LibraryService instance is required.');
  const adapter = createExistingLibrary74Adapter(adapterOptions);
  const registry = composeExistingLibrary74Registry(service.registry, adapter);
  service.registry = registry;
  const gameId = id => { if (!adapter.has(id)) fail('GAME_MODEL_UNAVAILABLE', 404); return id; };
  const definitions = () => Object.values(adapter.definitions).map(definition => {
    const accepting = service.accepting === true && definition.accepting === true;
    return { ...definition, accepting, launchable: accepting };
  });
  function publicSnapshot(snapshot) {
    const definition = definitions().find(game => game.id === gameId(snapshot.game_id));
    if (snapshot.currency !== 'ETB' || typeof snapshot.balance !== 'string' || !/^(0|[1-9]\d*)\.\d{2}$/.test(snapshot.balance)) fail('INVALID_ACCOUNT_SNAPSHOT', 500);
    if (snapshot.current_balance !== undefined && (typeof snapshot.current_balance !== 'string' || !/^(0|[1-9]\d*)\.\d{2}$/.test(snapshot.current_balance))) fail('INVALID_ACCOUNT_SNAPSHOT', 500);
    const { user_id: _user, ...result } = snapshot;
    if (result.round) {
      const { revealed_seed: _seed, ...round } = result.round;
      result.round = round;
    }
    return { ...result, authenticated: true, currency: 'ETB', game: definition, model_version: definition.version, accepting: snapshot.accepting === true && definition.accepting === true };
  }
  return {
    service, adapter, registry,
    definitions,
    state: async (userId, id) => publicSnapshot(await service.state(trustedUser(userId), gameId(id))),
    action: async (userId, input) => {
      if (!plain(input)) fail('INVALID_LIBRARY_REQUEST');
      gameId(input.game_id);
      return publicSnapshot(await service.action(trustedUser(userId), input));
    },
    async history(userId, id, { limit = 20 } = {}) {
      trustedUser(userId); gameId(id);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) fail('INVALID_HISTORY_LIMIT');
      if (!service.ready) fail('LIBRARY_UNAVAILABLE', 503);
      return service.shared.transaction(userId, async tx => {
        const now = service.now();
        const snapshot = publicSnapshot(await service.snapshot(tx, userId, id, now));
        const rows = await tx.unsafe('SELECT * FROM sw_native_library.rounds WHERE user_id=$1 AND game_id=$2 ORDER BY created_at DESC,id DESC LIMIT $3', [userId, id, limit]);
        const history = rows.map(row => {
          const { revealed_seed: _seed, ...round } = service.view(row, now);
          return { ...round, created_at: Number(row.created_at), settled_at: row.settled_at === null ? null : Number(row.settled_at) };
        });
        return { ...snapshot, history };
      });
    },
  };
}
