import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiHot40Motion, MULTIHOT40_INITIAL_GRID, multiHot40Layout, wheelAngle, winTier } from '../presentation/multihot40-motion.mjs';
import { MultiHot40Presentation } from '../client/multihot40-presentation.mjs';

const grid = [[0, 1, 2, 3], [4, 5, 6, 7], [3, 2, 1, 0], [7, 6, 5, 4], [2, 3, 4, 5]];
function machine() { let time = 0; const events = []; return { motion: new MultiHot40Motion({ clock: () => time, onEvent: event => events.push(event) }), events, time(value) { time = value; } }; }
const receipt = extra => ({ grid, multiplier: 5, roundId: 'canonical-round', winMinor: '0', betMinor: '40', lines: [], ...extra });

test('STOP and an arbitrarily delayed response never invent an outcome or finish a paid spin', () => {
  const { motion, events, time } = machine();
  assert.equal(motion.begin(), true); assert.equal(motion.begin(), false);
  time(500); assert.equal(motion.speedUp(), true);
  const sample = motion.sample(60000);
  assert.equal(sample.phase, 'spinning'); assert.equal(motion.busy, true);
  assert.deepEqual(sample.grid, MULTIHOT40_INITIAL_GRID);
  assert.ok(sample.columns.every(column => !column.stopped && column.target === null));
  assert.equal(events.filter(event => event.type === 'animation-complete').length, 0);
});

test('canonical grid and multiplier stop exactly once, independent of animation sampling rate', () => {
  for (const step of [16, 111, 30000]) {
    const { motion, events, time } = machine(); motion.begin(); time(300); motion.accept(receipt());
    for (let now = 300; motion.busy; now += step) motion.sample(now);
    const final = motion.sample(50000);
    assert.deepEqual(final.grid, grid); assert.equal(final.multiplier, 5); assert.equal(final.wheelAngle, wheelAngle(5));
    assert.equal(events.filter(event => event.type === 'animation-complete').length, 1);
    assert.equal(events.filter(event => event.type === 'reel-stop').length, 5);
    assert.equal(events.filter(event => event.type === 'wheel-stop').length, 1);
    assert.ok(events.filter(event => event.type !== 'spin-start').every(event => event.roundId === 'canonical-round'));
  }
});

test('winning receipts retain authoritative cells and money while speed-up only shortens presentation', () => {
  const { motion, events, time } = machine(), lines = [{ line: 1, cells: [[0, 0], [1, 0], [2, 0]], payoutMinor: '320' }];
  const result = receipt({ winMinor: '1600', lines }); motion.begin(); time(500); motion.accept(result);
  time(1000); motion.speedUp(); motion.sample(4000);
  assert.equal(motion.busy, false); assert.deepEqual(motion.grid, grid); assert.deepEqual(motion.lines, lines);
  assert.equal(result.winMinor, '1600'); assert.deepEqual(result.grid, grid);
  assert.equal(events.find(event => event.type === 'win-tier').name, 'Fantastic Win');
  assert.equal(events.filter(event => event.type === 'animation-complete').length, 1);
});

test('an unconfirmed error restores the previous display without a win and permits a later valid receipt', () => {
  const { motion, events, time } = machine(); motion.restore({ grid, multiplier: 3 }); motion.begin(); motion.sample(800);
  motion.cancel('unconfirmed'); assert.equal(motion.busy, false); assert.deepEqual(motion.grid, grid); assert.deepEqual(motion.lines, []);
  assert.equal(events.at(-1).cancelled, true); assert.equal(events.at(-1).reason, 'unconfirmed');
  assert.equal(motion.begin(), true); time(1000); motion.accept(receipt({ multiplier: 1 })); motion.sample(10000);
  assert.equal(motion.multiplier, 1); assert.equal(motion.busy, false);
});

test('malformed authoritative outcomes are rejected without transitioning from waiting', () => {
  const { motion } = machine(); motion.begin();
  for (const bad of [{ grid: [[0]], multiplier: 1 }, { grid, multiplier: 0 }, { grid, multiplier: 2.2 }, { grid: grid.map(column => column.map(() => 8)), multiplier: 1 }]) assert.throws(() => motion.accept(bad), TypeError);
  assert.equal(motion.phase, 'spinning'); assert.equal(motion.busy, true);
});

test('win tiers use exact cents and decimal thresholds, including large canonical amounts', () => {
  assert.equal(winTier('0', '40'), null); assert.equal(winTier('400', '0'), null); assert.equal(winTier('-1', '40'), null);
  assert.equal(winTier('999', '100').name, 'Win'); assert.equal(winTier('1000', '100').name, 'Nice Win');
  assert.equal(winTier('2000', '100').name, 'Big Win'); assert.equal(winTier('3000', '100').name, 'Super Win');
  assert.equal(winTier('4000', '100').name, 'Fantastic Win');
  assert.equal(winTier('40000000000000000000', '1000000000000000000').name, 'Fantastic Win');
});

test('canvas and hit-target geometry stay in the viewport at supported mobile and desktop sizes', () => {
  for (const [width, height] of [[360, 640], [390, 844], [430, 932], [844, 390], [1363, 768], [1920, 1080]]) {
    const view = multiHot40Layout(width, height);
    for (const [name, rect] of Object.entries({ ...view.controls, ...view.hud, grid: view.grid })) {
      assert.ok(rect.width > 0 && rect.height > 0, name); assert.ok(rect.x >= 0 && rect.y >= 0, name);
      assert.ok(rect.x + rect.width <= width + .001 && rect.y + rect.height <= height + .001, `${width}×${height} ${name}`);
    }
  }
});

test('logout removes prior account display data even when the host only changes authentication', () => {
  const presentation = new MultiHot40Presentation({ getContext: () => ({}) });
  presentation.setState({ authenticated: true, phase: 'idle', ...receipt({ winMinor: '1600', pendingWinMinor: '1600' }), balanceMinor: '50000' });
  assert.deepEqual(presentation.motion.grid, grid);
  presentation.setState({ authenticated: false });
  assert.equal(presentation.state.balanceMinor, null); assert.equal(presentation.state.winMinor, '0');
  assert.equal(presentation.state.pendingWinMinor, '0'); assert.equal(presentation.state.roundId, null);
  assert.deepEqual(presentation.motion.grid, MULTIHOT40_INITIAL_GRID); assert.deepEqual(presentation.motion.lines, []);
  presentation.dispose();
});

test('a fresh canonical refresh clears an error display and allows the next spin with host aliases', () => {
  const presentation = new MultiHot40Presentation({ getContext: () => ({}) });
  presentation.setState({ authenticated: true, balanceMinor: '50000', betMinor: '40', phase: 'spinning' });
  presentation.setState({ phase: 'error' }); assert.equal(presentation.busy, false);
  presentation.setState({ authenticated: true, balanceMinor: '49960', ...receipt(), canSpin: true, autoPlaying: true });
  assert.equal(presentation.state.phase, 'idle'); assert.deepEqual(presentation.motion.grid, grid);
  assert.equal(presentation.state.canStart, true); assert.equal(presentation.state.autoActive, true);
  presentation.setState({ phase: 'spinning' }); assert.equal(presentation.busy, true);
  presentation.dispose();
});
