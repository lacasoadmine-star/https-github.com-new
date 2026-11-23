import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpriteRenderer} from './sprite-renderer.mjs';
import {createReelMotion} from './reel-motion.mjs';

const timing = {spinMs: 20, staggerMs: 10, settleMs: 5, turboMs: 5, stopMs: 1};
const result = () => ({
  requestId: 'accepted-practice-round', multiplier: 4,
  grid: [[0,1,2,3,4],[5,6,7,0,1],[2,3,4,5,6],[7,0,1,2,3]],
  wins: [{positions: [{row: 0, column: 0}, {row: 1, column: 1}, {row: 2, column: 2}]}]
});

function harness({onComplete = () => {}} = {}) {
  let clock = 0, nextId = 1;
  const frames = new Map(), cancelled = [], operations = [];
  const ctx = Object.fromEntries(['save','restore','translate','rotate','scale','drawImage',
    'setTransform','fillRect','beginPath','rect','clip','strokeRect','fillText','arc','lineTo','moveTo','closePath','fill','stroke']
    .map(name => [name, (...args) => operations.push({name, args})]));
  const canvas = {width: 0, height: 0, getContext: () => ctx,
    getBoundingClientRect: () => ({width: 560, height: 840})};
  const descriptor = {frame: {x:0,y:0,w:100,h:100}, trim: {x:0,y:0,w:100,h:100},
    sourceSize: {w:100,h:100}, rotated: false};
  const artwork = {symbols: Array.from({length: 8}, (_, index) =>
    ({image: {symbol: index}, descriptor})), background: {name: 'background', width: 1000, height: 500}};
  const motion = createReelMotion({timing});
  const renderer = createSpriteRenderer({canvas, artwork, motion, onComplete,
    raf: callback => { const id = nextId++; frames.set(id, callback); return id; },
    caf: id => { if (frames.has(id)) cancelled.push(frames.get(id)); frames.delete(id); },
    now: () => clock, dpr: () => 1});
  return {renderer, motion, operations, frames, cancelled, canvas,
    setTime(value) { clock = value; },
    step(value) {
      clock = value;
      const next = frames.entries().next().value;
      assert.ok(next, 'Expected a scheduled animation frame');
      frames.delete(next[0]); next[1](value);
    },
    symbols() { return operations.filter(op => op.name === 'drawImage' && Number.isInteger(op.args[0]?.symbol))
      .map(op => op.args[0].symbol); },
    clearPaint() { operations.length = 0; }
  };
}

test('idle painting schedules no perpetual RAF and remains invalidatable after its first frame', () => {
  const h = harness();
  h.renderer.invalidate(); h.renderer.invalidate();
  assert.equal(h.frames.size, 1);
  h.step(0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.symbols().length, 20);
  h.clearPaint();
  h.renderer.invalidate(); h.renderer.invalidate();
  assert.equal(h.frames.size, 1);
  h.step(16);
  assert.equal(h.frames.size, 0);
  assert.equal(h.symbols().length, 20);
  h.renderer.dispose();
});

test('restores the exact accepted saved board and multiplier without a new spin or completion callback', () => {
  const completed = [], h = harness({onComplete: id => completed.push(id)});
  const accepted = result(), expectedGrid = structuredClone(accepted.grid);
  h.renderer.restore(accepted);
  accepted.grid[0][0] = 7; accepted.multiplier = 1;
  h.step(0);
  const expected = Array.from({length:5}, (_, column) => expectedGrid.map(row => row[column])).flat();
  assert.deepEqual(h.symbols(), expected);
  assert.ok(h.operations.some(op => op.name === 'fillText' && op.args[0] === '4×'));
  assert.equal(h.motion.snapshot(0).phase, 'idle');
  assert.equal(h.frames.size, 0);
  assert.deepEqual(completed, []);
  h.renderer.dispose();
});

test('cover-fits the background with proportional source cropping', () => {
  const h = harness();
  h.renderer.invalidate(); h.step(0);
  const draw = h.operations.find(op => op.name === 'drawImage' && op.args[0]?.name === 'background');
  const [, sx, sy, sw, sh, dx, dy, dw, dh] = draw.args;
  assert.equal(sy, 0); assert.equal(sh, 500);
  assert.ok(Math.abs(sx - 1000 / 3) < 0.001);
  assert.ok(Math.abs(sw - 1000 / 3) < 0.001);
  assert.deepEqual([dx, dy, dw, dh], [0, 0, 560, 840]);
  assert.ok(Math.abs(sw / sh - dw / dh) < 0.000001);
  h.renderer.dispose();
});

test('completed animation calls back once and allows the callback to invalidate the settled win frame', () => {
  let h; const completed = [];
  h = harness({onComplete: id => { completed.push(id); h.renderer.invalidate(); }});
  h.renderer.start(result());
  h.step(0);
  assert.equal(h.frames.size, 1);
  h.step(66);
  assert.deepEqual(completed, ['accepted-practice-round']);
  assert.equal(h.motion.snapshot(66).phase, 'idle');
  assert.equal(h.frames.size, 1);
  h.clearPaint(); h.step(80);
  assert.equal(h.frames.size, 0);
  assert.deepEqual(completed, ['accepted-practice-round']);
  assert.equal(h.operations.filter(op => op.name === 'strokeRect' && op.args[2] === 98).length, 3);
  h.renderer.dispose();
});

test('pause cancels RAF and resume continues the remaining active presentation time', () => {
  const completed = [], h = harness({onComplete: id => completed.push(id)});
  h.renderer.start(result()); h.step(0);
  h.setTime(10); h.renderer.pause();
  assert.equal(h.frames.size, 0);
  h.renderer.invalidate(); assert.equal(h.frames.size, 0);
  h.setTime(1010); h.renderer.resume();
  assert.equal(h.frames.size, 1);
  h.step(1010);
  assert.equal(h.motion.snapshot(1010).phase, 'spinning');
  assert.equal(h.frames.size, 1);
  assert.deepEqual(completed, []);
  h.step(1066);
  assert.deepEqual(completed, ['accepted-practice-round']);
  assert.equal(h.frames.size, 0);
  h.renderer.dispose();
});

test('dispose cancels queued work and ignores a late callback or subsequent resume/invalidate', () => {
  const completed = [], h = harness({onComplete: id => completed.push(id)});
  h.renderer.start(result());
  const callback = h.frames.values().next().value;
  h.renderer.dispose(); h.renderer.dispose();
  const painted = h.operations.length;
  assert.equal(h.frames.size, 0);
  callback(100);
  h.renderer.resume(); h.renderer.invalidate();
  assert.equal(h.frames.size, 0);
  assert.equal(h.operations.length, painted);
  assert.deepEqual(completed, []);
});

test('restoring an idle board cannot replace a different accepted animation in progress', () => {
  const h = harness(); h.renderer.start(result());
  assert.throws(() => h.renderer.restore({...result(), requestId: 'other'}), /MH40_RESTORE_GRID/);
  assert.equal(h.motion.snapshot(0).round.requestId, 'accepted-practice-round');
  h.renderer.dispose();
});

test('winning presentation holds completion until count-up finishes and STOP accelerates that same award', () => {
 const completed=[],h=harness({onComplete:id=>completed.push(id)});
 const accepted={...result(),winMinor:'400',betMinor:'40'};
 h.renderer.start(accepted);h.step(66);
 assert.deepEqual(completed,[]);assert.equal(h.frames.size,1);
 h.step(1000);assert.deepEqual(completed,[]);
 h.renderer.stop();h.step(1081);
 assert.deepEqual(completed,['accepted-practice-round']);assert.equal(h.frames.size,0);
 assert.equal(accepted.winMinor,'400');h.renderer.dispose();
});
test('background time does not finish a pending win celebration', () => {
 const completed=[],h=harness({onComplete:id=>completed.push(id)});
 h.renderer.start({...result(),winMinor:'400',betMinor:'40'});h.step(66);
 h.setTime(100);h.renderer.pause();h.setTime(10100);h.renderer.resume();h.step(10100);
 assert.deepEqual(completed,[]);assert.equal(h.frames.size,1);
 h.step(13067);assert.deepEqual(completed,['accepted-practice-round']);assert.equal(h.frames.size,0);
 h.renderer.dispose();
});
