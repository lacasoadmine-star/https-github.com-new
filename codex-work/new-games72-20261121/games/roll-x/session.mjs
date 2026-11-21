import { RoundRecoveryClient, RecoveryError, createSameOriginTransport } from '../../shared/round-recovery.mjs';
import { GAME_ID, OBSERVED_TARGETS_BPS, READINESS } from './evaluator.mjs';
import { freezeCopy, validateRollXReceipt } from './receipt.mjs';

const identity = value => ['mathVersion', 'engineVersion', 'mathSha256'].map(key => value?.[key]).join(':');

/**
 * Read-only-by-release integration with the existing session/recovery client.
 * No URL flag or local setting can turn cash play on. A future target-selection
 * backend contract must bind target to the persisted request/math identity.
 */
export function createUnreleasedRollXSession(options = {}) {
  const { onState = () => {}, ...dependencies } = options;
  const transport = dependencies.request ?? createSameOriginTransport();
  let client;
  let unavailableReason = 'RELEASE_NOT_READY';
  const wrapSnapshot = () => {
    const state = client.snapshot;
    const unresolved = state.pending || ['PENDING', 'AUTH_REQUIRED', 'OTHER_GAME_PENDING'].includes(state.phase);
    return freezeCopy({
      ...state,
      phase: unresolved ? state.phase : state.phase === 'READY' ? 'UNAVAILABLE' : state.phase,
      canSpin: false,
      canAuto: false,
      releaseReason: unavailableReason,
      cashEnabled: READINESS.cashEnabled,
      kind: 'production',
    });
  };
  client = new RoundRecoveryClient({
    ...dependencies,
    gameId: GAME_ID,
    request(path, body, requestOptions) {
      // Even recovery's authoritative replay-miss path cannot open a wager
      // before release. Already accepted receipts remain recoverable.
      if (path === '/api/slots/spin' && body?.replayOnly !== true) {
        throw new RecoveryError('RELEASE_NOT_READY');
      }
      return transport(path, body, requestOptions);
    },
    validateModel(game) {
      if (game.id !== GAME_ID) throw new RecoveryError('ROLLX_MODEL_IDENTITY');
      // A disabled model can still expose the authenticated current balance.
      // A server flag alone must not override this unreleased client's gates.
      if (game.rollX?.targetBps !== undefined && !OBSERVED_TARGETS_BPS.includes(game.rollX.targetBps)) {
        throw new RecoveryError('ROLLX_TARGET_NOT_VERIFIED');
      }
    },
    validateReceipt(receipt, context) {
      if (receipt.testOnly === true) throw new RecoveryError('ROLLX_FIXTURE_RECEIPT_REJECTED');
      if (identity(context.action) !== identity(context.currentModel)) throw new RecoveryError('ROLLX_ACCEPTED_MODEL_NOT_RETAINED');
      const target = context.currentModel?.rollX?.targetBps;
      if (!OBSERVED_TARGETS_BPS.includes(target)) throw new RecoveryError('ROLLX_TARGET_BINDING_UNAVAILABLE');
      validateRollXReceipt(receipt, { bet: context.action.bet, targetBps: target });
    },
    onState() { if (client) onState(wrapSnapshot()); },
  });
  return Object.freeze({
    kind: 'production',
    get snapshot() { return wrapSnapshot(); },
    supportsTarget(target) { return client.snapshot.account?.game?.rollX?.targetBps === target; },
    async connect() {
      try { return await client.connect(); }
      catch (error) {
        unavailableReason = error.code ?? 'GAME_UNAVAILABLE';
        throw error;
      }
    },
    async spin() {
      // Intentionally no call to client.spin while the whole release is closed.
      throw new RecoveryError('RELEASE_NOT_READY');
    },
    async recover() { return freezeCopy(await client.recover()); },
    async refresh() { return client.refresh(); },
    disconnect() { client.disconnect(); },
    dispose() { client.dispose(); },
  });
}
