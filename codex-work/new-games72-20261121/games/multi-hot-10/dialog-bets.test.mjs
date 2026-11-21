import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dialogFixture, observedLevels } from './tests/dialog-fixture.mjs';
import { mountFixture } from './tests/main-entry-harness.mjs';

test('initial BET opening shows the first five native rows even when the selected stake is 5.00', t => {
  const h = dialogFixture(t); h.open();
  assert.deepEqual(h.visible(), ['0.10', '0.20', '0.30', '0.40', '0.50']);
  assert.equal(h.container.querySelectorAll('.m10-bet-row').length, 5);
  assert.equal(h.target('bet-page', 'previous').disabled, true);
  assert.equal(h.target('bet-page', 'next').disabled, false);
  assert.equal(h.target('close', undefined), undefined, 'The observed picker has no extra Close button');
  for (const frame of ['Bets/Popup', 'Bets/Button', 'Bets/Up', 'Bets/Down']) assert.ok(h.frames.includes(frame));
  assert.equal(h.controls.snapshot.selectedBet, '5.00');
});

test('caret clicks move exactly five observed rows and clamp the last window without choosing a stake', t => {
  const h = dialogFixture(t); h.open();
  const windows = [
    ['0.60', '0.70', '0.80', '1.00', '1.50'],
    ['2.00', '2.50', '3.00', '4.00', '5.00'],
    ['6.00', '7.00', '8.00', '10.00', '15.00'],
    ['20.00', '25.00', '30.00', '40.00', '50.00'],
    ['60.00', '70.00', '80.00', '100.00', '150.00'],
    ['70.00', '80.00', '100.00', '150.00', '200.00'],
  ];
  const visited = new Set(h.visible());
  for (const expected of windows) {
    const event = h.click(h.target('bet-page', 'next'));
    assert.equal(event.prevented, true); assert.equal(event.stopped, true);
    assert.deepEqual(h.visible(), expected); h.visible().forEach(value => visited.add(value));
    assert.equal(h.controls.snapshot.modal, 'bet'); assert.equal(h.controls.snapshot.selectedBet, '5.00');
    assert.equal(h.controls.snapshot.pending, null); assert.equal(h.actions.length, 0);
  }
  assert.equal(h.offset(), 26); assert.deepEqual([...visited], observedLevels);
  assert.equal(visited.has('0.90'), false);
  assert.equal(h.target('bet-page', 'next').disabled, true);
  h.click(h.target('bet-page', 'next')); assert.equal(h.offset(), 26);
  h.click(h.target('bet-page', 'previous'));
  assert.equal(h.offset(), 21); assert.deepEqual(h.visible(), ['25.00', '30.00', '40.00', '50.00', '60.00']);
});

test('dialog refresh and backdrop close/reopen retain the last observed window', t => {
  const h = dialogFixture(t); h.open();
  for (let n = 0; n < 6; n++) h.click(h.target('bet-page', 'next'));
  h.click(h.target('bet-page', 'previous'));
  h.dialogs.show(h.controls.snapshot); assert.equal(h.offset(), 21);
  h.click(h.container);
  assert.equal(h.controls.snapshot.modal, null); assert.equal(h.container.hidden, true);
  assert.equal(h.controls.snapshot.selectedBet, '5.00');
  h.open(); assert.equal(h.offset(), 21);
  assert.deepEqual(h.visible(), ['25.00', '30.00', '40.00', '50.00', '60.00']);
});

test('a visible stake uses the actual controller selection, closes the picker and retains its window', t => {
  const h = dialogFixture(t); h.open(); h.click(h.target('bet-page', 'next'));
  h.click(h.target('choose-bet', '0.70'));
  assert.deepEqual(h.actions, [{ name: 'choose-bet', value: '0.70' }]);
  assert.equal(h.controls.snapshot.selectedBet, '0.70'); assert.equal(h.controls.snapshot.modal, null);
  assert.equal(h.controls.snapshot.pending, null); assert.equal(h.container.hidden, true);
  h.open(); assert.equal(h.offset(), 5);
  assert.equal(h.target('choose-bet', '0.70').getAttribute('aria-pressed'), 'true');
  assert.ok(h.frames.includes('Bets/ButtonActive'));
});

test('a shorter host ladder never acquires invented stakes and clamps a retained offset', t => {
  const h = dialogFixture(t); h.open();
  for (let n = 0; n < 6; n++) h.click(h.target('bet-page', 'next'));
  h.dialogs.show({ ...h.controls.snapshot, betLevels: ['0.20', '0.50'], selectedBet: '0.20' });
  assert.equal(h.offset(), 0); assert.deepEqual(h.visible(), ['0.20', '0.50']);
  assert.equal(h.container.querySelectorAll('.m10-bet-row').length, 5);
  assert.equal(h.target('bet-page', 'previous').disabled, true);
  assert.equal(h.target('bet-page', 'next').disabled, true);
});

test('caret controls occupy separate first/last-row targets and use real native atlas frames', async t => {
  const h = dialogFixture(t); h.open();
  const rows = h.container.querySelectorAll('.m10-bet-row');
  assert.equal(h.target('bet-page', 'previous').parentElement, rows[0]);
  assert.equal(h.target('bet-page', 'next').parentElement, rows[4]);
  assert.notEqual(h.target('bet-page', 'next').parentElement, h.target('choose-bet', '0.50'));
  const atlas = JSON.parse(await readFile(new URL('./assets/runtime/Images-0.json', import.meta.url), 'utf8'));
  for (const frame of ['Bets/Button', 'Bets/ButtonActive', 'Bets/Up', 'Bets/Down']) assert.ok(atlas.frames[frame]);
});

test('the actual visual-only entry exposes all observed DMO options without creating a financial host', async t => {
  const h = await mountFixture({ previewOnly: true, useDefaultControls: true }); t.after(() => h.app.dispose());
  assert.deepEqual(h.app.controls.snapshot.betLevels, observedLevels);
  assert.equal(h.app.controls.snapshot.currency, 'DMO'); assert.equal(h.app.controller, null);
  await h.app.action('bet'); await h.app.action('choose-bet', '200.00');
  assert.equal(h.app.controls.snapshot.selectedBet, '200.00'); assert.equal(h.app.controls.snapshot.modal, null);
  await h.app.action('spin'); await h.app.action('auto-start');
  assert.equal(h.app.snapshot.cashEnabled, false); assert.equal(h.posts.length, 0); assert.equal(h.reads.length, 0);
});

test('the actual hosted entry keeps its original ETB default ladder and caller-supplied controls', async t => {
  const defaults = await mountFixture({ useDefaultControls: true }); t.after(() => defaults.app.dispose());
  assert.deepEqual(defaults.app.controls.snapshot.betLevels, ['0.10', '0.20', '0.30', '0.40', '0.50']);
  assert.equal(defaults.app.controls.snapshot.currency, 'ETB');
  await defaults.app.action('bet'); await defaults.app.action('choose-bet', '200.00');
  assert.equal(defaults.app.controls.snapshot.selectedBet, '0.10'); assert.equal(defaults.posts.length, 0);
  const supplied = await mountFixture(); t.after(() => supplied.app.dispose());
  assert.deepEqual(supplied.app.controls.snapshot.betLevels, ['0.10', '0.20']);
});
