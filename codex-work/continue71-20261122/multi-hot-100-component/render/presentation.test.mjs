import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiHot100Presentation } from './presentation.mjs';
import { MULTI_HOT_100_GAME_ID, MultiHot100Controls, validateM100RoundView } from '../module/controls.mjs';

// Shape-only synthetic view. It is not a provider observation or legal outcome model.
const view = () => ({
  gameId: MULTI_HOT_100_GAME_ID, requestKey: 'm100-receipt-request', roundId: 'm100-receipt-round',
  bet: '1.00', winAmount: '0.00', multiplier: 3,
  grid: Array.from({ length: 4 }, () => ['lemon', 'plum', 'orange', 'seven', 'bell']),
});
const intent = receipt => ({ kind: 'SPIN', gameId: receipt.gameId, requestKey: receipt.requestKey, bet: receipt.bet });
function accepted() {
  const receipt = view(), presentation = new MultiHot100Presentation();
  presentation.begin(intent(receipt)); presentation.accept(receipt);
  presentation.advance({ clockMs: 400, progress: 0.4 });
  return { receipt, presentation };
}

test('a second round ID cannot replace the already accepted presentation', () => {
  const { receipt, presentation } = accepted(), before = presentation.snapshot();
  assert.throws(() => presentation.accept({ ...receipt, roundId: 'm100-substituted-round' }), /RECEIPT_CONFLICT/);
  assert.deepEqual(presentation.snapshot(), before);
});

test('another grid for the same round cannot replace the already accepted presentation', () => {
  const { receipt, presentation } = accepted(), changed = structuredClone(receipt), before = presentation.snapshot();
  changed.grid[0][0] = 'seven';
  assert.throws(() => presentation.accept(changed), /RECEIPT_CONFLICT/);
  assert.deepEqual(presentation.snapshot(), before);
});

test('identical delivery is a no-op both during and after presentation', () => {
  const { receipt, presentation } = accepted(), moving = presentation.snapshot();
  assert.equal(presentation.accept(structuredClone(receipt)), false);
  assert.deepEqual(presentation.snapshot(), moving);
  presentation.advance({ clockMs: 1000, progress: 1 });
  const finished = presentation.snapshot();
  assert.equal(finished.moving, false);
  assert.equal(presentation.accept(structuredClone(receipt)), false);
  assert.deepEqual(presentation.snapshot(), finished);
});

test('missing rows or cells reject before receipt state changes', () => {
  for (const missing of ['row', 'cell']) {
    const receipt = view(), bad = structuredClone(receipt), presentation = new MultiHot100Presentation();
    if (missing === 'row') delete bad.grid[1]; else delete bad.grid[2][3];
    presentation.begin(intent(receipt));
    assert.throws(() => validateM100RoundView(bad), /RECEIPT_GRID/);
    assert.throws(() => presentation.accept(bad), /RECEIPT_GRID/);
    assert.equal(presentation.snapshot().receipt, null);
    assert.equal(presentation.snapshot().pending.requestKey, receipt.requestKey);
  }
});

test('repeated STOP input creates only one presentation stop transition', () => {
  const { presentation } = accepted();
  assert.equal(presentation.requestStop(), true);
  const stopped = presentation.snapshot();
  assert.equal(presentation.requestStop(), false);
  assert.deepEqual(presentation.snapshot(), stopped);
  const controls = new MultiHot100Controls();
  controls.requestSpin('m100-stop-request');
  assert.equal(controls.requestStop().accepted, true);
  assert.deepEqual(controls.requestStop(), { accepted: false, reason: 'STOP_ALREADY_REQUESTED', intents: [] });
});

test('time and STOP never finish a round before a receipt exists', () => {
  const receipt = view(), presentation = new MultiHot100Presentation();
  presentation.begin(intent(receipt)); presentation.requestStop();
  for (const clockMs of [1000, 100000, 1000000]) {
    const snapshot = presentation.advance({ clockMs, progress: 1 });
    assert.equal(snapshot.receipt, null);
    assert.equal(snapshot.moving, true);
    assert.equal(snapshot.outcomesGenerated, 0);
  }
  presentation.accept(receipt);
  const finished = presentation.advance({ clockMs: 1000001, progress: 1 });
  assert.equal(finished.moving, false);
  assert.equal(finished.receipt.roundId, receipt.roundId);
});

test('binding failure preserves the pending request and accepts its correct receipt later', () => {
  const receipt = view(), presentation = new MultiHot100Presentation();
  presentation.begin(intent(receipt));
  assert.throws(() => presentation.accept({ ...receipt, bet: '2.00' }), /BET_MISMATCH/);
  assert.equal(presentation.snapshot().receipt, null);
  assert.equal(presentation.accept(receipt), true);
  assert.throws(() => { presentation.snapshot().receipt.grid[0][0] = 'seven'; }, TypeError);
  assert.equal(presentation.snapshot().receipt.grid[0][0], 'lemon');
});
