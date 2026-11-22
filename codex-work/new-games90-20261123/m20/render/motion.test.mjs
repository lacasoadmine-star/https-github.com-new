import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiHot20Renderer, WHEEL_ANGLE } from './renderer.mjs';
import { GAME_ID } from '../presentation-quote.mjs';

// Synthetic presentation-only receipt: no adjacent winning prefix on any path.
// It is neither a reference observation nor a proposed legal financial outcome.
function receipt(multiplier = 3, suffix = 'base') {
  return {
    gameId: GAME_ID,
    requestKey: `m20-motion-request-${suffix}`,
    roundId: `m20-motion-round-${suffix}`,
    bet: '0.20', multiplier, winAmount: '0.00', balance: null,
    grid: Array.from({ length: 3 }, () => ['lemon', 'plum', 'orange', 'seven', 'bell']),
  };
}

function fixture() {
  const rotations = [], events = [];
  const context = new Proxy({ rotate: value => rotations.push(value) }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
  });
  const renderer = new MultiHot20Renderer({
    canvas: { getContext: () => context }, atlas: { draw() {} },
    background: { width: 2470, height: 1220 }, onEvent: event => events.push(event),
  });
  return {
    renderer, events,
    angleAt(now) {
      rotations.length = 0;
      renderer.drawWheel(now);
      assert(rotations.length > 0, 'the actual wheel drawing must rotate the native number image');
      return rotations[0];
    },
  };
}

function begin(renderer, view, now = 0) {
  return renderer.begin({ action: 'SPIN', gameId: GAME_ID, requestKey: view.requestKey, bet: view.bet }, now);
}

function sameVisibleAngle(a, b, message) {
  const gap = Math.atan2(Math.sin(a - b), Math.cos(a - b));
  assert(Math.abs(gap) < 1e-9, `${message}: visible angle jumped ${gap} radians`);
}

test('a late receipt preserves the wheel angle at acceptance for every observed multiplier', () => {
  for (const acceptedAt of [500, 2000, 7000]) {
    for (const multiplier of [1, 2, 3, 4, 5]) {
      const { renderer, angleAt } = fixture(), view = receipt(multiplier, `${acceptedAt}-${multiplier}`);
      begin(renderer, view);
      const before = angleAt(acceptedAt);
      assert.equal(renderer.accept(view, acceptedAt), true);
      sameVisibleAngle(angleAt(acceptedAt), before, `receipt at ${acceptedAt}, multiplier ${multiplier}`);
      assert.equal(renderer.snapshot().phase, 'SETTLING');
      assert.equal(renderer.snapshot().round, null);
      renderer.render(acceptedAt + 2100);
      sameVisibleAngle(angleAt(acceptedAt + 2100), WHEEL_ANGLE[multiplier], 'final native selected sector');
      assert.deepEqual(renderer.snapshot().grid, view.grid);
    }
  }
});

test('STOP accelerates from the drawn angle without changing the accepted round', () => {
  const { renderer, angleAt, events } = fixture(), view = receipt(5);
  begin(renderer, view); renderer.accept(view, 0);
  const before = angleAt(748);
  assert.equal(renderer.requestStop(748), true);
  sameVisibleAngle(angleAt(748), before, 'STOP input');
  assert.equal(renderer.requestStop(800), false);
  renderer.render(1048); renderer.render(1200);
  sameVisibleAngle(angleAt(1200), WHEEL_ANGLE[5], 'STOP selected sector');
  assert.equal(renderer.snapshot().phase, 'IDLE');
  assert.equal(renderer.snapshot().round.roundId, view.roundId);
  assert.deepEqual(renderer.snapshot().grid, view.grid);
  for (const name of ['spin', 'stop-request', 'settled']) {
    assert.equal(events.filter(event => event.name === name).length, 1, `${name} emits once`);
  }
});

test('STOP before a delayed receipt keeps waiting and preserves motion when that receipt arrives', () => {
  const { renderer, angleAt, events } = fixture(), view = receipt(1, 'stop-before-delivery');
  begin(renderer, view); renderer.requestStop(400); renderer.render(5000);
  assert.equal(renderer.snapshot().phase, 'WAITING');
  assert.equal(renderer.snapshot().round, null);
  assert.equal(events.some(event => event.name === 'settled'), false);
  const before = angleAt(5000);
  renderer.accept(view, 5000);
  sameVisibleAngle(angleAt(5000), before, 'receipt after STOP');
  renderer.render(5300);
  assert.equal(renderer.snapshot().round.requestKey, view.requestKey);
  sameVisibleAngle(angleAt(5300), WHEEL_ANGLE[1], 'delayed STOP selected sector');
});

test('the retained normal reel sequence and accepted grid stay unchanged', () => {
  const { renderer, events } = fixture(), view = receipt(3, 'normal-timing');
  begin(renderer, view); renderer.accept(view, 0);
  renderer.render(775);
  assert.deepEqual(events.filter(event => event.name.startsWith('reel-stop-')).map(event => event.name), ['reel-stop-1']);
  renderer.render(1284);
  assert.equal(events.filter(event => event.name.startsWith('reel-stop-')).length, 3);
  renderer.render(1824);
  assert.equal(events.filter(event => event.name.startsWith('reel-stop-')).length, 5);
  assert.equal(renderer.snapshot().phase, 'SETTLING');
  renderer.render(2074); renderer.render(3000);
  assert.deepEqual(renderer.snapshot().grid, view.grid);
  assert.equal(events.filter(event => event.name === 'settled').length, 1);
});

test('duplicate or conflicting delivery cannot restart or redirect wheel motion', () => {
  const { renderer, angleAt } = fixture(), view = receipt(4, 'replay');
  begin(renderer, view); renderer.accept(view, 1200);
  const before = angleAt(1500);
  assert.equal(renderer.accept(view, 1500), false);
  sameVisibleAngle(angleAt(1500), before, 'duplicate delivery');
  assert.throws(() => renderer.accept({ ...view, multiplier: 1 }, 1500), /CONFLICTING_RENDER_REPLAY/);
  sameVisibleAngle(angleAt(1500), before, 'conflicting delivery');
  renderer.render(4000);
  assert.equal(renderer.snapshot().round.multiplier, 4);
});
