const test = require('node:test');
const assert = require('node:assert/strict');
const { Study } = require('./engine.js');
const create = (rows = 3) => new Study({ rows, grid: Array.from({length: 5}, () => Array(rows).fill('a')), symbols: ['a','b','c','d'] });

test('rapid repeated touches cannot start overlapping spins', () => {
  const model = create();
  assert.equal(model.spin(0), true);
  for (let i = 1; i < 30; i++) assert.equal(model.spin(i), false);
  model.advance(5000);
  assert.equal(model.completed, 1);
  assert.equal(model.sequence, 1);
  assert.equal(model.phase, 'idle');
});
test('STOP during a running autoplay sequence cancels future spins and settles all reels', () => {
  const model = create(); model.startAuto(25, 0); model.advance(500); model.stop(500);
  assert.equal(model.autoRemaining, 0);
  assert.ok(model.advance(600).some(frame => frame.moving));
  model.advance(1000); model.advance(10000);
  assert.equal(model.completed, 1); assert.equal(model.phase, 'idle');
  assert.equal(model.sequence, 1);
});
test('STOP between autoplay spins prevents a queued spin', () => {
  const model = create(); model.startAuto(5, 0); model.advance(3000);
  assert.equal(model.phase, 'waiting'); model.stop(3001); model.advance(20000);
  assert.equal(model.sequence, 1); assert.equal(model.phase, 'idle');
});
test('autoplay runs the exact requested finite count, including after a large clock jump', () => {
  const model = create(4); model.startAuto(5, 0);
  for (let now = 1000; now < 100000; now += 1000) model.advance(now);
  assert.equal(model.sequence, 5); assert.equal(model.completed, 5);
  assert.equal(model.phase, 'idle'); assert.equal(model.autoRemaining, 0);
  assert.ok(model.grid.every(column => column.length === 4));
});
test('switching titles disposes the old animation and queue', () => {
  const model = create(); model.startAuto(10, 0); model.dispose();
  assert.deepEqual(model.advance(10000), []); assert.equal(model.spin(10001), false);
  assert.equal(model.startAuto(5, 10001), false); assert.equal(model.autoRemaining, 0);
});
test('animation starts with the exact observed grid and settles on integral cell boundaries', () => {
  const model = create(); model.spin(0);
  for (const frame of model.advance(0)) assert.deepEqual(frame.strip.slice(frame.position, frame.position + 3), ['a','a','a']);
  for (const frame of model.advance(5000)) {
    assert.equal(frame.position, 0); assert.equal(frame.moving, false); assert.equal(frame.strip.length, 3);
  }
});
test('invalid counts and clocks do not enter a run', () => {
  const model = create();
  for (const count of [-1,0,1.5,51,Infinity]) assert.equal(model.startAuto(count,0), false);
  assert.equal(model.spin(NaN), false); assert.equal(model.phase,'idle');
});
