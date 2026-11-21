// Test entry only: this file is never a Player route or a registered game.
import { RoundRecoveryClient, RecoveryError } from '../round-recovery.mjs';

const gameId = 'new72_browser_recovery_fixture';
let tokens = 0;
const states = [], events = [];
const client = new RoundRecoveryClient({
  gameId,
  storage: globalThis.localStorage,
  // Exercise native Web Locks and native fetch; only the CI network is intercepted.
  uuid: () => { tokens++; return crypto.randomUUID(); },
  retry: { attempts: 3, baseDelayMs: 25, maxDelayMs: 250 },
  validateModel(game) {
    if (game.id !== gameId || game.mathVersion !== 'browser-fixture-rules-1') {
      throw new RecoveryError('UNEXPECTED_TEST_MODEL');
    }
  },
  validateReceipt(receipt) {
    if (receipt.testOnly !== true || receipt.fixtureOutcome !== 'known-test-result') {
      throw new RecoveryError('UNEXPECTED_TEST_RECEIPT');
    }
  },
  onState: state => states.push(state.phase),
  onEvent: event => events.push(event),
});

globalThis.recoveryQa = {
  get snapshot() { return client.snapshot; },
  get generatedTokens() { return tokens; },
  get states() { return [...states]; },
  get events() { return structuredClone(events); },
  async call(method, value) {
    if (!['spin', 'recover', 'refresh', 'connect'].includes(method)) throw Error('INVALID_TEST_METHOD');
    try {
      const result = await client[method](value);
      return { ok: true, result, snapshot: client.snapshot, generatedTokens: tokens };
    } catch (error) {
      return { ok: false, error: { code: error.code, status: error.status },
        snapshot: client.snapshot, generatedTokens: tokens };
    }
  },
  dispose() { client.dispose(); },
};
globalThis.recoveryQaReady = client.connect().then(() => true);
