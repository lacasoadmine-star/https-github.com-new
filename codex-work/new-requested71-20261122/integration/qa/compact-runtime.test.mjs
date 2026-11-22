import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sourceConfig from '../worker-assets.mjs';
import sourceManifest from '../../preview/preview-manifest.mjs';
import * as sourceCatalogue from '../catalogue.mjs';
import { createAdditiveWorker as originalAdditive } from '../worker.mjs';
import { createVisualPreviewWorker as originalPreview, immutableBase } from '../../preview/preview-worker.mjs';
import { loadCompactDeployment, writeCompactDeployment, COMPACT_BYTE_BUDGET, COMPACT_MODULE_NAMES } from '../compact-deployment.mjs';
import { makeAdditiveForm, inheritedMetadata, parseMultipart, sha256, verifyBaseline, applyPinnedMetadataRepack } from '../additive-upload.mjs';
import { METADATA_MODULE, METADATA_SOURCE_PATH, METADATA_BEFORE, MIN_METADATA_SAVINGS } from '../repack-release-pins.mjs';

assert(process.env.ZPLAY_COMPACT_MODULE_ROOT, 'Run against the exact generated artifact; no uncompiled fallback');
const compact = await loadCompactDeployment(process.env.ZPLAY_COMPACT_MODULE_ROOT);
const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const responseSnapshot = async response => ({ status: response.status, statusText: response.statusText,
  headers: [...response.headers].sort(([a], [b]) => a.localeCompare(b)), body: Buffer.from(await response.arrayBuffer()) });

test('locked esbuild output is six pinned modules within 30k; all source/data/asset pins match', () => {
  assert.equal(compact.report.esbuildVersion, '0.25.12');
  assert(compact.report.totalBytes <= COMPACT_BYTE_BUDGET);
  assert.deepEqual(compact.modules.map(item => item.name), COMPACT_MODULE_NAMES);
  assert.deepEqual(compact.config, sourceConfig);
  assert.deepEqual(compact.manifest, sourceManifest);
  assert.equal(compact.report.activeMainModule, 'balloonstatefix20261121/entry.mjs');
  assert.equal(compact.manifest.entries.length, 41);
  assert.equal(compact.metadataRepack.name, METADATA_MODULE);
  assert.deepEqual(compact.metadataRepack.before, METADATA_BEFORE);
  assert(compact.metadataRepack.savedBytes >= MIN_METADATA_SAVINGS);
  assert.equal(compact.metadataRepack.assetCount, 321);
  assert(compact.report.netAddedBytes < 0);
});

test('compiled catalogue exports and rendered pages match the reviewed source byte-for-byte', () => {
  assert.deepEqual(Object.keys(compact.catalogue), Object.keys(sourceCatalogue));
  for (const expanded of [false, true]) {
    assert.equal(compact.catalogue.renderCatalogueSection(compact.config.catalogue, { expanded }), sourceCatalogue.renderCatalogueSection(sourceConfig.catalogue, { expanded }));
  }
  assert.equal(compact.catalogue.renderCataloguePage(compact.config.catalogue, '/style?x="&'), sourceCatalogue.renderCataloguePage(sourceConfig.catalogue, '/style?x="&'));
});

test('compiled additive routes preserve exact JSON/HTML/JS/CSS responses, headers and readonly methods', async () => {
  const previous = { fetch() { throw Error('Unexpected old route'); } };
  const original = originalAdditive(previous, sourceConfig), deployed = compact.createAdditiveWorker(previous, compact.config);
  for (const path of ['/new-games71/', '/new-games71/catalogue.json',
    `/_zplay/new71/${sourceConfig.assetRevision}/new-section.mjs`, `/_zplay/new71/${sourceConfig.assetRevision}/new-section.css`]) {
    for (const method of ['GET', 'HEAD', 'POST']) {
      const request = new Request('https://fixture.invalid' + path, { method });
      assert.deepEqual(await responseSnapshot(await deployed.fetch(request)), await responseSnapshot(await original.fetch(request)), method + ' ' + path);
    }
  }
});

test('compiled preview preserves CSP, import map, safe aliases, asset verification and redirect rejection', async () => {
  const entry = sourceManifest.entries.find(item => item.path.endsWith('/main.mjs'));
  const bytes = await readFile(resolve(repository, entry.repositoryPath));
  const base = immutableBase(sourceManifest);
  const cryptoImpl = { subtle: webcrypto.subtle, getRandomValues(value) { value.fill(7); return value; } };
  const options = { cache: null, cryptoImpl, async fetchImpl(url, init) {
    assert.equal(url, `https://raw.githubusercontent.com/${sourceManifest.repository}/${sourceManifest.sourceCommit}/${entry.repositoryPath}`);
    assert.equal(init.redirect, 'manual'); assert.equal(init.credentials, 'omit');
    assert.deepEqual(init.headers, { Accept: '*/*' });
    return new Response(bytes, { headers: { 'Content-Type': entry.contentType } });
  } };
  const previous = { fetch() { throw Error('Unexpected old route'); } };
  const original = originalPreview(previous, sourceManifest, options), deployed = compact.createVisualPreviewWorker(previous, compact.manifest, options);
  for (const [path, method] of [
    ['/new-games72/multi-hot-10/preview/', 'GET'], ['/new-games72/multi-hot-10/preview/', 'HEAD'],
    ['/new-games72/multi-hot-10/preview/', 'POST'], ['/new-games72/multi-hot-10/preview', 'GET'],
    ['/new-games72/multi-hot-10/preview/?unsafe=1', 'GET'], [base + entry.path, 'GET'], [base + entry.path, 'HEAD'],
    [base + '/unknown.mjs', 'GET'], ['/_zplay/m10-preview/unpinned/file.mjs', 'GET'],
  ]) {
    const request = new Request('https://fixture.invalid' + path, { method, headers: { Authorization: 'fixture-only', Cookie: 'fixture-only' } });
    assert.deepEqual(await responseSnapshot(await deployed.fetch(request)), await responseSnapshot(await original.fetch(request)), method + ' ' + path);
  }
  let calls = 0;
  const redirected = compact.createVisualPreviewWorker(previous, compact.manifest, { cache: null, async fetchImpl() {
    calls++; return new Response(null, { status: 302, headers: { Location: 'https://offscope.invalid/' } });
  } });
  assert.equal((await redirected.fetch(new Request('https://fixture.invalid' + base + entry.path))).status, 502);
  assert.equal(calls, 1);
});

test('exact composed deployment entry retains both Durable Object exports and old-response identity', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'zplay-compact-entry-'));
  const previousFetch = globalThis.fetch;
  try {
    await writeCompactDeployment(root, compact);
    await mkdir(dirname(resolve(root, compact.report.activeMainModule)), { recursive: true });
    await writeFile(resolve(root, compact.report.activeMainModule), `export class LocalDemoWallet {}\nexport class NativeGameResources {}\nexport const calls=[];\nexport default {scheduled(){return 'retained';},fetch(request,env,ctx){const response=new Response('old route',{status:202,headers:{'Set-Cookie':'fixture=retained'}});calls.push({request,env,ctx,response});return response;}};\n`);
    globalThis.fetch = () => { throw Error('No network allowed in composed fixture'); };
    const entry = await import(pathToFileURL(resolve(root, 'newrequested71r1/entry.mjs')));
    const old = await import(pathToFileURL(resolve(root, compact.report.activeMainModule)));
    assert.equal(entry.LocalDemoWallet, old.LocalDemoWallet); assert.equal(entry.NativeGameResources, old.NativeGameResources);
    assert.equal(entry.default.scheduled, old.default.scheduled);
    for (const path of ['/api/spin', '/api/wallet', '/api/session', '/agent', '/admin', '/telebirr/callback', '/new-games72/multi-hot-10/', '/old.png']) {
      const request = new Request('https://fixture.invalid' + path, { method: 'POST' }), env = {}, ctx = {};
      const response = await entry.default.fetch(request, env, ctx), call = old.calls.at(-1);
      assert.equal(response, call.response); assert.equal(request, call.request); assert.equal(env, call.env); assert.equal(ctx, call.ctx);
    }
    const catalogue = await entry.default.fetch(new Request('https://fixture.invalid/new-games71/catalogue.json'));
    assert.deepEqual(await catalogue.json(), sourceConfig.catalogue);
    const page = await entry.default.fetch(new Request('https://fixture.invalid/new-games72/multi-hot-10/preview/'));
    assert.equal(page.status, 200); assert.match(await page.text(), /previewOnly: true/);
  } finally { globalThis.fetch = previousFetch; await rm(root, { recursive: true, force: true }); }
});

test('actual upload preserves 404 old parts, one verified metadata object and all 18 inherited bindings', async () => {
  const parts = new Map();
  const originalMetadata = await readFile(resolve(repository, METADATA_SOURCE_PATH));
  for (let index = 0; index < 405; index++) {
    const name = index === 0 ? compact.report.activeMainModule : index === 1 ? METADATA_MODULE : `retained/module-${index}.${index % 2 ? 'bin' : 'mjs'}`;
    parts.set(name, index === 1 ? { bytes: originalMetadata, contentType: METADATA_BEFORE.contentType }
      : { bytes: new Uint8Array([index & 255, 255, 0, 13, 10, 198, 128, index >> 8]), contentType: index % 2 ? 'application/octet-stream' : 'application/javascript+module' });
  }
  const inventory = await Promise.all([...parts].map(async ([name, part]) => ({ name, bytes: part.bytes.length, contentType: part.contentType, sha256: await sha256(part.bytes) })));
  const version = { id: 'fixture-active', main_module: compact.report.activeMainModule,
    assets: { config: { html_handling: 'none', not_found_handling: 'none', run_worker_first: true, base_path: '/' } },
    resources: { bindings: Array.from({ length: 18 }, (_, index) => ({ name: index ? 'B' + index : 'NATIVE_LIBRARY_ASSETS', type: index ? 'secret_text' : 'assets' })),
      script_runtime: { compatibility_date: '2026-10-01', compatibility_flags: ['nodejs_compat'], usage_model: 'standard',
        exports: { LocalDemoWallet: { type: 'durable-object', storage: 'sqlite' }, NativeGameResources: { type: 'durable-object', storage: 'sqlite' }, default: { type: 'worker' } } } } };
  const metadata = inheritedMetadata(version, { expectedActiveVersion: 'fixture-active', activeMainModule: compact.report.activeMainModule,
    downloadInventory: inventory, commitSha: compact.report.sourceCommit || 'a'.repeat(40), message: 'Compact equivalent NEW71 and M10 visual preview' });
  const repacked = await applyPinnedMetadataRepack(parts, inventory, compact.metadataRepack);
  const form = await makeAdditiveForm(repacked.parts, repacked.inventory, compact.modules, metadata);
  assert.equal([...form.keys()].length, 412);
  const output = parseMultipart(await new Request('https://upload.invalid', { method: 'POST', body: form }).arrayBuffer());
  const unchanged = inventory.filter(pin => pin.name !== METADATA_MODULE);
  assert.equal(unchanged.length, 404);
  assert.equal(await verifyBaseline(new Map(unchanged.map(({ name }) => [name, output.get(name)])), unchanged), true);
  assert.equal(await sha256(output.get(METADATA_MODULE).bytes), compact.metadataRepack.after.sha256);
  assert.equal(parts.get(METADATA_MODULE).bytes, originalMetadata, 'Original baseline map is unchanged');
  for (const item of compact.modules) assert.equal(await sha256(output.get(item.name).bytes), item.sha256);
  assert.deepEqual(JSON.parse(await form.get('metadata').text()).bindings, version.resources.bindings.map(({ name }) => ({ name, type: 'inherit' })));
});

test('compact artifact hash drift fails before runtime loading', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'zplay-compact-tamper-'));
  try {
    await writeCompactDeployment(root, compact);
    await writeFile(resolve(root, compact.modules[0].name), compact.modules[0].source + ' ');
    await assert.rejects(() => loadCompactDeployment(root));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('the separately allowed metadata artifact rejects drift before loading', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'zplay-compact-metadata-tamper-'));
  try {
    await writeCompactDeployment(root, compact);
    await writeFile(resolve(root, METADATA_MODULE), compact.metadataRepack.source + ' ');
    await assert.rejects(() => loadCompactDeployment(root));
  } finally { await rm(root, { recursive: true, force: true }); }
});
