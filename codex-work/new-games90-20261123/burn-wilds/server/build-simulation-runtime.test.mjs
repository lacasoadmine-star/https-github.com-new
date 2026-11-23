import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { brotliDecompressSync } from 'node:zlib';
import { bundleBurnTestRuntime, buildBurnTestFunction, wrapBurnTestRuntimeSource,
  BURN_TEST_BOOT_ANCHOR, BURN_TEST_SERVE_ANCHOR, BURN_TEST_MODULE_PATH } from './build-simulation-runtime.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');

test('the exact self-contained bundle imports and exposes only isolated simulation health', async () => {
  const bundle = await bundleBurnTestRuntime();
  const module = await import('data:text/javascript;base64,' + Buffer.from(bundle.code).toString('base64'));
  const runtime = module.createBurnTestRuntime({ cryptoImpl: webcrypto, logger() {} });
  const response = await runtime.fetch(new Request('https://service.example/api/new-games90/burn-wilds/test/health'));
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.mode, 'SIMULATION');
  assert.equal(health.databaseUsed, false);
  assert.equal(health.cashEnabled, false);
  assert.equal(runtime.handles(new Request('https://service.example/api/spin')), false);
  assert.deepEqual(Object.keys(bundle.sourcePins).sort(),
    ['candidate-math.mjs', 'expansion.mjs', 'outcome-audit.mjs', 'rules.mjs', 'server/simulation.mjs']);
});

test('actual bootstrap insertion preserves all retained Function text and unrelated modules', async () => {
  const source = '// retained loader and all existing integrity checks\n' + BURN_TEST_BOOT_ANCHOR + '\n// retained final imports\n';
  const bundle = await bundleBurnTestRuntime(), built = buildBurnTestFunction(source, bundle, sha(source));
  assert.equal(built.retainedFunctionUnchangedExceptInsertion, true);
  assert.equal(built.code.replace(built.insertion + '\n', ''), source);
  const nativeSource = '// untouched old handlers\nconst service = { fetch(request) { return request; } };\n' +
    BURN_TEST_SERVE_ANCHOR + '\n// untouched exports';
  const unrelated = { path: 'native72-batch01/retained.mjs', source: 'export const untouched = true;' };
  const files = [{ path: 'native-slot-runtime.mjs', source: nativeSource }, unrelated];
  new Function('files', 'brotliDecompressSync', 'createHash', 'console', built.insertion)(
    files, brotliDecompressSync, createHash, { info() {} });
  assert.equal(files[1], unrelated);
  assert.equal(files[1].source, 'export const untouched = true;');
  assert.equal(files[0].source, wrapBurnTestRuntimeSource(nativeSource));
  assert.equal(files[0].sha256, sha(files[0].source));
  assert.equal(files[0].bytes, Buffer.byteLength(files[0].source));
  assert.equal(files[2].path, BURN_TEST_MODULE_PATH);
  assert.equal(files[2].source, bundle.code);
  assert.equal(files[2].sha256, bundle.sha256);
});

test('changed running source, ambiguous serve anchors and altered bundle abort packaging', async () => {
  const source = BURN_TEST_BOOT_ANCHOR, bundle = await bundleBurnTestRuntime();
  assert.throws(() => buildBurnTestFunction(source + '\nchanged', bundle, sha(source)), /CURRENT_FUNCTION_CHANGED/);
  assert.throws(() => buildBurnTestFunction(source, { ...bundle, code: bundle.code + 'changed' }, sha(source)), /BUNDLE_INTEGRITY/);
  assert.throws(() => wrapBurnTestRuntimeSource('other runtime'), /SERVE_ANCHOR_MISMATCH/);
  assert.throws(() => wrapBurnTestRuntimeSource(BURN_TEST_SERVE_ANCHOR + BURN_TEST_SERVE_ANCHOR), /SERVE_ANCHOR_MISMATCH/);
  assert.throws(() => wrapBurnTestRuntimeSource(wrapBurnTestRuntimeSource(BURN_TEST_SERVE_ANCHOR)), /SERVE_ANCHOR_MISMATCH/);
});
