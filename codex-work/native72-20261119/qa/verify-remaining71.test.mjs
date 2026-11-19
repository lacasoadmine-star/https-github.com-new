import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { REQUIRED_PROOFS, validateGame } from './verify-remaining71.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(here, 'remaining71-readiness.json'), 'utf8'));
const proof = sourceKey => ({
  sourceKey,
  productionFinancialWrites: false,
  newWalletOrBackend: false,
  proofs: Object.fromEntries(REQUIRED_PROOFS.map(key => [key, {
    passed: true, artifact: 'synthetic-test-only/' + key, verifiedAt: '2026-11-20T00:00:00Z'
  }]))
});

test('exact 71 targets and no protected original or Habesha', () => {
  assert.equal(manifest.entries.length, 71);
  assert.equal(new Set(manifest.entries.map(g => g.sourceKey)).size, 71);
  for (const key of ['multihot5','foxyhot20','habeshafortune5']) {
    assert.equal(manifest.entries.some(g => g.sourceKey === key), false);
  }
  assert.equal(manifest.entries.filter(g => g.playNowExposed).length, 14);
  assert.equal(manifest.entries.filter(g => !g.playNowExposed).length, 57);
  assert.equal(manifest.entries.filter(g => !g.officialDemo).length, 1);
  assert.equal(manifest.entries.find(g => !g.officialDemo).title, 'JetX');
  assert.ok(manifest.entries.every(g => g.readyForLive === false));
});

test('never accept missing evidence, fake route or unverified game', () => {
  for (const g of manifest.entries) {
    assert.equal(validateGame({manifest,sourceKey:g.sourceKey,evidence:null}).ready,false,g.title);
  }
  const unavailable = manifest.entries.find(g => !g.playNowExposed && !!g.officialDemo);
  const result = validateGame({manifest,sourceKey:unavailable.sourceKey,evidence:proof(unavailable.sourceKey)});
  assert.equal(result.ready,false);
  assert.ok(result.failures.some(x => x.startsWith('accountRoute:')));
});

test('fail closed on missing captures and forbidden financial writes', () => {
  const key = 'multihot40';
  const missing = proof(key);
  delete missing.proofs.animationAndAudioLifecycle;
  assert.equal(validateGame({manifest,sourceKey:key,evidence:missing}).ready,false);
  const forbidden = proof(key);
  forbidden.productionFinancialWrites = true;
  assert.equal(validateGame({manifest,sourceKey:key,evidence:forbidden}).ready,false);
});

test('complete evidence contract can pass only for exposed route', () => {
  // This synthetic fixture tests validator logic; it is not production evidence.
  const result = validateGame({manifest,sourceKey:'multihot40',evidence:proof('multihot40')});
  assert.equal(result.ready,true);
  assert.deepEqual(result.failures,[]);
});
