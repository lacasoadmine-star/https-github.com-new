import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import config from './worker-assets.mjs';
import manifest from '../preview/preview-manifest.mjs';
import { compactWorkerAssetsSource, compactPreviewManifestSource, COMPACT_MODULE_NAMES, COMPACT_BYTE_BUDGET } from './compact-deployment.mjs';
import { BASE_DEPLOYMENT_MODULES, PREVIEW_DEPLOYMENT_MODULES } from './additive-upload.mjs';

const evaluate = async source => (await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))).default;

test('catalogue tuples retain exact ordered IDs, all JSON fields and served client/CSS bytes', async () => {
  const rebuilt = await evaluate(compactWorkerAssetsSource(config));
  assert.deepEqual(rebuilt, config);
  assert.equal(JSON.stringify(rebuilt), JSON.stringify(config));
  assert.equal(rebuilt.clientSource, await readFile(new URL('./new-section.mjs', import.meta.url), 'utf8'));
  assert.equal(rebuilt.stylesheetSource, await readFile(new URL('./new-section.css', import.meta.url), 'utf8'));
  assert.equal(rebuilt.catalogue.games.length, 71);
  assert.equal(rebuilt.catalogue.readyCount, 0);
  assert.equal(rebuilt.catalogue.games.filter(game => game.previewRoute).length, 1);
  assert(Buffer.byteLength(compactWorkerAssetsSource(config)) < 12000);
});

test('row overrides retain distinct future readiness and routes without hardcoding a preparing state', async () => {
  const changed = structuredClone(config);
  Object.assign(changed.catalogue.games[10], { status: 'ready', playable: true, route: '/new-games71/magic-garden-40/', previewRoute: '/new-games71/fixture-preview/' });
  changed.catalogue.readyCount = 1;
  assert.deepEqual(await evaluate(compactWorkerAssetsSource(changed)), changed);
});

test('unexpected catalogue shape or ordinal order fails instead of losing fields', () => {
  const extra = structuredClone(config); extra.catalogue.games[0].unreviewed = true;
  assert.throws(() => compactWorkerAssetsSource(extra), /Unexpected catalogue game fields/);
  const reordered = structuredClone(config); reordered.catalogue.games.reverse();
  assert.throws(() => compactWorkerAssetsSource(reordered), /Catalogue order must remain exact/);
});

test('manifest prefix tuples preserve every source path, byte length, SHA, MIME and pin', async () => {
  const rebuilt = await evaluate(compactPreviewManifestSource(manifest));
  assert.deepEqual(rebuilt, manifest);
  assert.equal(JSON.stringify(rebuilt), JSON.stringify(manifest));
  assert.equal(rebuilt.entries.length, 41);
  assert.equal(rebuilt.financialOperations, false);
  assert.equal(rebuilt.visualPreviewOnly, true);
  assert(Buffer.byteLength(compactPreviewManifestSource(manifest)) < 6000);
});

test('manifest compaction rejects off-scope paths and unexpected fields', () => {
  const offscope = structuredClone(manifest); offscope.entries[0].repositoryPath = 'another-game/main.mjs';
  assert.throws(() => compactPreviewManifestSource(offscope), /PREVIEW_ENTRY_INVALID/);
  const extra = structuredClone(manifest); extra.entries[0].unknown = true;
  assert.throws(() => compactPreviewManifestSource(extra), /Unexpected preview entry fields/);
});

test('deployment still adds exactly the existing six allowed module names with a strict 30k budget', () => {
  assert.deepEqual(COMPACT_MODULE_NAMES, [...BASE_DEPLOYMENT_MODULES, ...PREVIEW_DEPLOYMENT_MODULES]);
  assert.equal(COMPACT_MODULE_NAMES.length, 6);
  assert.equal(COMPACT_BYTE_BUDGET, 30000);
});
