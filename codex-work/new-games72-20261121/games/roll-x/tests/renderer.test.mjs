import test from 'node:test';
import assert from 'node:assert/strict';
import { RollXRenderer, settledAngle, visualArc, wheelMarkup } from '../renderer.mjs';
import { fixtureReceipt } from './fixture-session.mjs';

function frameEnvironment() {
  const callbacks = new Map(), cancelled = [], transforms = [];
  let next = 0;
  const element = { innerHTML: '', querySelector: () => ({ setAttribute: (key, value) => transforms.push([key, value]) }) };
  const renderer = new RollXRenderer({ element, now: () => 0,
    requestFrame: callback => { const id = ++next; callbacks.set(id, callback); return id; },
    cancelFrame: id => { cancelled.push(id); callbacks.delete(id); } });
  return { renderer, element, callbacks, cancelled, transforms,
    frame(time) { const pair = callbacks.entries().next().value; assert(pair); callbacks.delete(pair[0]); pair[1](time); } };
}

test('green and empty receipts place the decorative sector under the pointer for each supported target', () => {
  for (const target of [14_000, 20_000]) {
    const greenAtPointer = (360 - settledAngle('green', target)) % 360;
    const emptyAtPointer = (360 - settledAngle('empty', target)) % 360;
    assert(greenAtPointer > 0 && greenAtPointer < visualArc(target));
    assert(emptyAtPointer > visualArc(target) && emptyAtPointer < 360);
  }
  assert.throws(() => settledAngle('bonus', 14_000));
  assert.throws(() => visualArc(300_000));
});

test('SVG presentation escapes receipt labels and has no provider image, video or script asset', () => {
  const svg = wheelMarkup({ label: '<img src=x onerror=alert(1)>', amount: '1 & <2>', fixture: true });
  assert(svg.includes('&lt;img')); assert(svg.includes('1 &amp; &lt;2&gt;'));
  assert(svg.includes('ISOLATED TEST')); assert(!/<(?:script|image|foreignObject|video)\b/i.test(svg));
  assert.throws(() => wheelMarkup({ angle: Infinity }));
});

test('reduced-motion receipt presentation settles immediately without an animation frame', async () => {
  const env = frameEnvironment();
  env.renderer.setPreview(14_000, true);
  await env.renderer.presentReceipt(fixtureReceipt(), { duration: 0 });
  assert.equal(env.callbacks.size, 0);
  assert(env.element.innerHTML.includes('WIN CONFIRMED')); assert(env.element.innerHTML.includes('0.28 ETB'));
  assert(env.element.innerHTML.includes('ISOLATED TEST'));
  env.renderer.dispose();
});

test('STOP finishes the current receipt once and cancels pending animation work', async () => {
  const env = frameEnvironment(); let ticks = 0;
  const promise = env.renderer.presentReceipt(fixtureReceipt(), { onTick: () => ticks++ });
  env.frame(300); assert.equal(ticks, 1); assert.equal(env.callbacks.size, 1);
  env.renderer.finishPresentation(); env.renderer.finishPresentation();
  assert.deepEqual(await promise, { cancelled: false }); assert.equal(env.callbacks.size, 0);
  assert(env.element.innerHTML.includes('0.28 ETB')); assert.equal(env.renderer.animation, null);
  env.renderer.dispose();
});

test('dispose invalidates already queued animation callbacks and resolves the waiting presenter', async () => {
  const env = frameEnvironment(); let ticks = 0;
  const promise = env.renderer.presentReceipt(fixtureReceipt(), { onTick: () => ticks++ });
  const stale = env.callbacks.values().next().value;
  env.renderer.dispose(); const html = env.element.innerHTML;
  stale(1500);
  assert.deepEqual(await promise, { cancelled: true });
  assert.equal(ticks, 0); assert.equal(env.element.innerHTML, html); assert.equal(env.callbacks.size, 0);
  assert.deepEqual(await env.renderer.presentReceipt(fixtureReceipt()), { cancelled: true });
});

test('abort stops presentation without inventing a settled outcome or money event', async () => {
  const env = frameEnvironment(), signal = new AbortController();
  const promise = env.renderer.presentReceipt(fixtureReceipt(), { signal: signal.signal });
  signal.abort();
  assert.deepEqual(await promise, { cancelled: true }); assert.equal(env.callbacks.size, 0);
  assert(!env.element.innerHTML.includes('WIN CONFIRMED')); env.renderer.dispose();
});

test('normal animation completes from the immutable empty-sector receipt', async () => {
  const env = frameEnvironment();
  const receipt = fixtureReceipt(2, { payout: '0.00', sector: 'empty' });
  const promise = env.renderer.presentReceipt(receipt);
  env.frame(0); env.frame(750); env.frame(1500);
  assert.deepEqual(await promise, { cancelled: false });
  assert.equal(env.callbacks.size, 0); assert(env.element.innerHTML.includes('ROUND COMPLETE'));
  assert(env.element.innerHTML.includes('0.00 ETB')); assert.equal(receipt.rollX.sector, 'empty');
  env.renderer.dispose();
});
