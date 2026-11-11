// Reuse the retained r17 routing, authentication and transport code unchanged.
// Apply only the four reviewed response changes from the frozen r18 gateway.
import { createGateway as createRetainedGateway } from './independent74-gateway-r17.mjs';
export { hash, csrfGuard, validateNativeAction } from './independent74-gateway-r17.mjs';

function readOnlyAccountDefinition(game) {
  return {
    ...game, accepting: false, launchable: false, readOnly: true,
    modelInstalled: false, accountReadSupported: true,
    historyAvailable: false, activeRecoveryVerified: false,
    releaseStatus: 'pending', controls: { ...game.controls, actions: [] },
  };
}

export function createGateway(options) {
  const retained = createRetainedGateway(options);
  if (options.accountTransport !== undefined && options.accountTransport !== 'protected-readonly') return retained;
  return async function(request, env, context) {
    const response = await retained(request, env, context);
    const operation = new URL(request.url).pathname.match(/^\/independent74\/account-api\/(catalog|state|action|history)$/)?.[1];
    if (!operation) return response;
    const value = await response.clone().json();
    let updated;
    if (response.ok && operation === 'catalog') {
      updated = {
        ...value, games: value.games.map(readOnlyAccountDefinition),
        readOnly: true, accountReadSupported: true, modelInstalled: false,
        new_rounds_enabled: false, historyAvailable: false,
        activeRecoveryVerified: false, releaseStatus: 'pending',
      };
    } else if (response.ok && operation === 'state') {
      updated = {
        ...value, game_id: value.game.id, game: readOnlyAccountDefinition(value.game),
        model_version: value.game.version, accepting: false, new_rounds_enabled: false,
        round: null, readOnly: true, modelInstalled: false,
        accountServiceAvailable: true, accountReadSupported: true,
        activeRecoveryVerified: false, historyAvailable: false,
        existingWalletReadOnly: true, releaseStatus: 'pending',
      };
    } else if (response.status >= 500 && ['GAME_RELEASE_NOT_READY', 'GAME_HISTORY_NOT_AVAILABLE'].includes(value.error?.code)) {
      updated = { ...value, retryable: false };
    }
    if (!updated) return response;
    return new Response(JSON.stringify(updated), {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
  };
}
