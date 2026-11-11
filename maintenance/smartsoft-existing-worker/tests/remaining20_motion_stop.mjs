import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// The renderer owns decoration only. This test has no wallet, HTTP or RNG.
const root = resolve(import.meta.dirname, '..');
const matrix = [
  ['multihot100', 'multihot100_native'],
  ['multihotdeluxe', 'multihotdeluxe_native'],
  ['habeshafortune5', 'habeshafortune5_native'],
  ['burningice', 'burningice_native'],
  ['burningice40', 'burningice10_native'],
  ['burningice40', 'burningice40_native'],
  ['multihotdeluxe', 'multihotwildways_native'],
  ['multihotdeluxe', 'multihot5wild_native'],
  ['burningice', 'multihot5superwilds_native'],
];
const checks = [];
for (const [file, id] of matrix) {
  const {SmartSoftMotion, SMARTSOFT_MOTION_PROFILES} = await import(
    pathToFileURL(resolve(root, 'games/remaining20', file + '-smartsoft-motion.mjs'))
  );
  const profile = SMARTSOFT_MOTION_PROFILES[id];
  const initial = Array.from({length: profile.columns}, () => Array(profile.rows).fill('0'));
  const accepted = Array.from({length: profile.columns}, (_, c) => Array.from({length: profile.rows}, (_, r) => String((c + r + 1) % 8)));
  const events = [];
  const motion = new SmartSoftMotion({id, symbols: ['0','1','2','3','4','5','6','7','8','9'], onEvent: event => events.push(event)});
  motion.begin(0, {previousGrid: initial, previousFeature: {multiplier: 1}});
  motion.sample(250);
  motion.speedUp(250);
  const stopped = motion.sample(251);
  const waiting = motion.sample(5251);
  assert.equal(waiting.elapsed, stopped.elapsed, id + ': STOP must freeze decoration while the actual response is pending');
  assert.equal(waiting.pending, true);
  assert.equal(waiting.grid, null);
  assert.equal(waiting.complete, false);
  assert.equal(events.filter(event => event.type === 'animation-complete').length, 0);
  assert.equal(motion.accept([['bad']], 5300), false, 'Invalid grid cannot finish a round');
  assert.equal(motion.accept(accepted, 5400, {feature: {multiplier: 2}, roundId: 'verified-test-receipt'}), true);
  let result;
  for (let clock = 5416; clock < 15400; clock += 16) {
    result = motion.sample(clock);
    if (result.complete) break;
  }
  assert.equal(result.complete, true, id + ': Validated receipt must still land after STOP');
  assert.deepEqual(result.grid, accepted);
  assert.equal(result.roundId, 'verified-test-receipt');
  assert.equal(events.filter(event => event.type === 'animation-complete').length, 1);
  motion.speedUp(15500);
  motion.sample(16000);
  assert.equal(events.filter(event => event.type === 'animation-complete').length, 1, 'Repeated STOP cannot complete twice');
  checks.push({id, passed: true, decorativePause: true, noFabricatedReceipt: true, oneCompletion: true});
}
const report = {status: 'passed', scope: 'Pure renderer clocks and supplied test receipts; no HTTP, wallet, RNG or database', checks};
await writeFile(resolve(root, 'reports/remaining20-stop-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
