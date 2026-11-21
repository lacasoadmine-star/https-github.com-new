// ISOLATED BROWSER TEST ONLY. This entry is never loaded by the runtime page.
// Every outcome and balance is an externally supplied immutable test receipt.
import { mountRollX } from '../app.mjs';
import { RollXAudio } from '../audio.mjs';
import { freezeCopy } from '../receipt.mjs';
import { GAME_ID } from '../evaluator.mjs';

const receipts = freezeCopy(JSON.parse(document.getElementById('fixture-receipts').textContent));
if (!receipts.length || receipts.some(receipt => receipt.testOnly !== true)) throw new Error('Explicit test receipts required.');
let index = 0, phase = 'DISCONNECTED', current = null, balance = receipts[0].walletReceipt.balanceBefore;
const calls = { spin: [], refresh: 0, dispose: 0 };
const session = {
  kind: 'isolated-fixture',
  get snapshot() {
    return freezeCopy({ phase, pending: null, canSpin: phase === 'READY', canAuto: phase === 'READY', balanceFresh: phase === 'READY',
      account: phase === 'DISCONNECTED' ? null : { authenticated: true, currency: 'ETB', balance,
        game: { id: GAME_ID, betLevels: ['0.20', '0.50'] } } });
  },
  supportsTarget: target => [14_000, 20_000].includes(target),
  async connect() { phase = 'READY'; return this.snapshot.account; },
  async spin(wager) {
    const receipt = receipts[index++];
    if (!receipt || receipt.bet !== wager.bet || receipt.rollX.targetBps !== wager.targetBps) throw new Error('Fixture receipt does not match requested wager.');
    calls.spin.push(freezeCopy(wager)); phase = 'REQUESTING';
    await new Promise(resolve => setTimeout(resolve, 120));
    current = receipt; phase = 'SETTLED'; return receipt;
  },
  async recover() { throw new Error('No unresolved fixture request exists.'); },
  async refresh() { calls.refresh++; balance = current?.walletReceipt.balanceAfter ?? balance; phase = 'READY'; return this.snapshot.account; },
  dispose() { calls.dispose++; phase = 'DISPOSED'; },
};
const audio = new RollXAudio(), events = [];
const emit = audio.emit.bind(audio);
audio.emit = event => { events.push(event); return emit(event); };
const game = mountRollX({ root: document.getElementById('rollx-app'), session, audio });
globalThis.rollxTest = { game, audio, calls, events, receipts };
await game.connect();
