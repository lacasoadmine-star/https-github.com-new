import test from 'node:test';
import assert from 'node:assert/strict';
import {gambleAmounts, gambleCard, createOfficialGamblePresentation} from '../public/official-gamble-presentation.mjs';
import {createGambleAudio} from '../public/official-gamble-audio.mjs';

test('gamble counters use exact credited stake arithmetic and keep missing recovery stakes unknown', () => {
  assert.deepEqual(gambleAmounts('0.25'), {amount: '0.25', toWin: '0.50'});
  assert.deepEqual(gambleAmounts('9999999999999.99'), {amount: '9999999999999.99', toWin: '19999999999999.98'});
  assert.deepEqual(gambleAmounts('1.2345'), {amount: '1.23', toWin: '2.46'});
  for (const value of [undefined, null, '', '-1', 'NaN', '1e4', 25]) {
    assert.deepEqual(gambleAmounts(value), {amount: '—', toWin: '—'});
  }
});

test('gamble card art represents only receipt colour, never a second random result', () => {
  assert.equal(gambleCard({cardColor: 'RED', choice: 'RED', won: true}), 'red-card');
  assert.equal(gambleCard({cardColor: 'RED', choice: 'BLACK', won: false}), 'red-card');
  assert.equal(gambleCard({cardColor: 'BLACK', choice: 'BLACK', won: true}), 'black-card');
  assert.equal(gambleCard({cardColor: 'BLACK', choice: 'RED', won: false}), 'black-card');
  for (const value of [null, {}, {cardColor: 'RED', choice: 'RED', won: false}, {cardColor: 'CLUBS', choice: 'BLACK', won: true}]) {
    assert.equal(gambleCard(value), null);
  }
});

test('native gamble helpers do not mount or load sounds for other games', () => {
  const document = {getElementById() { throw Error('must not inspect other-game DOM'); }};
  for (const gameId of ['multi_hot_100', 'wild_multi_stars', 'unknown']) {
    assert.equal(createOfficialGamblePresentation({gameId, document}), null);
    assert.equal(createGambleAudio(gameId, {}), null);
  }
});

test('gamble audio cannot load before an existing consented context or when muted/disposed', async () => {
  for (const engine of [{}, {muted: true, context: {state: 'running'}}, {disposed: true, context: {state: 'running'}}]) {
    const sound = createGambleAudio('multi_hot_5_video', engine);
    assert.equal(await sound.prepare(), false);
    assert.equal(await sound.play('win'), false);
    assert.equal(sound.diagnostics().decoded, 0);
  }
});
