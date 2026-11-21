/** Deployment packaging only. Never rewrites retained Worker or served asset bytes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import config from './worker-assets.mjs';
import manifest from '../preview/preview-manifest.mjs';
import { BASE_DEPLOYMENT_MODULES, PREVIEW_DEPLOYMENT_MODULES, MODULE_PREFIX } from './additive-upload.mjs';
import { visualPreviewEntry } from '../preview/composition.mjs';
import { MODULE_ROOT, REPOSITORY_ROOT, validateManifest } from '../preview/preview-worker.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, '../../..');
const ownPath = 'codex-work/new-requested71-20261122/';
const SOURCE_PATHS = Object.freeze(['integration/catalogue.mjs', 'integration/worker.mjs', 'integration/worker-assets.mjs',
  'preview/preview-worker.mjs', 'preview/preview-manifest.mjs', 'preview/composition.mjs',
  'integration/additive-upload.mjs', 'integration/compact-deployment.mjs'].map(path => ownPath + path).concat('package-lock.json'));
export const COMPACT_BYTE_BUDGET = 30000;
export const ESBUILD_VERSION = '0.25.12';
export const COMPACT_MODULE_NAMES = Object.freeze([...BASE_DEPLOYMENT_MODULES, ...PREVIEW_DEPLOYMENT_MODULES]);
const options = Object.freeze({ loader: 'js', format: 'esm', target: 'es2022', charset: 'utf8',
  minifyWhitespace: true, minifyIdentifiers: true, minifySyntax: true,
  treeShaking: false, legalComments: 'none', sourcemap: false });
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value);
const fromSource = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const sameKeys = (value, keys, label) => assert.deepEqual(Object.keys(value), keys, label);

/** Repeated row fields become shared defaults; IDs are preserved literally, never inferred from names. */
export function compactWorkerAssetsSource(value) {
  sameKeys(value, ['catalogue', 'clientSource', 'stylesheetSource', 'assetRevision'], 'Unexpected worker config fields');
  const { catalogue, ...assets } = value;
  sameKeys(catalogue, ['schema', 'releaseId', 'requestedCount', 'readyCount', 'games'], 'Unexpected catalogue fields');
  assert.equal(catalogue.schema, 'zplay/new71-public-catalogue/v1');
  assert.equal(catalogue.games.length, 71);
  const fields = ['status', 'playable', 'route', 'previewRoute'];
  const defaults = Object.fromEntries(fields.map(field => {
    const counts = new Map();
    for (const game of catalogue.games) counts.set(json(game[field]), (counts.get(json(game[field])) || 0) + 1);
    const mostCommon = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    return [field, JSON.parse(mostCommon)];
  }));
  const rows = catalogue.games.map((game, index) => {
    sameKeys(game, ['ordinal', 'gameId', 'name', ...fields], 'Unexpected catalogue game fields');
    assert.equal(game.ordinal, index + 1, 'Catalogue order must remain exact');
    assert.match(game.gameId, /^zplay7[12]_[a-z0-9_]+_v1$/);
    const row = [game.gameId.slice(6, -3), game.name];
    const overrides = Object.fromEntries(fields.filter(field => json(game[field]) !== json(defaults[field])).map(field => [field, game[field]]));
    if (Object.keys(overrides).length) row.push(overrides);
    return row;
  });
  const { games, ...header } = catalogue;
  return `const defaults=${json(defaults)};\nconst catalogue={...${json(header)},games:${json(rows)}.map(([id,name,overrides],index)=>({ordinal:index+1,gameId:'zplay7'+id+'_v1',name,...defaults,...overrides}))};\nexport default {catalogue,...${json(assets)}};\n`;
}

/** Deduplicate only the exact known directory pairs and MIME strings; every SHA and length stays literal. */
export function compactPreviewManifestSource(value) {
  validateManifest(value, { allowUnpinned: true });
  sameKeys(value, ['schema', 'repository', 'sourceCommit', 'revision', 'entry', 'status', 'visualPreviewOnly', 'financialOperations', 'entries'], 'Unexpected preview manifest fields');
  const prefixes = [[MODULE_ROOT, REPOSITORY_ROOT], ['/new-games72/shared/', 'codex-work/new-games72-20261121/shared/']];
  const types = [];
  const rows = value.entries.map(entry => {
    sameKeys(entry, ['path', 'repositoryPath', 'bytes', 'sha256', 'contentType'], 'Unexpected preview entry fields');
    const group = prefixes.findIndex(([publicRoot, sourceRoot]) => entry.path.startsWith(publicRoot)
      && entry.repositoryPath === sourceRoot + entry.path.slice(publicRoot.length));
    assert(group >= 0, 'Unknown preview directory pair');
    let type = types.indexOf(entry.contentType);
    if (type < 0) { type = types.length; types.push(entry.contentType); }
    const row = [entry.path.slice(prefixes[group][0].length), entry.bytes, entry.sha256, type];
    if (group) row.push(group);
    return row;
  });
  const { entries, ...header } = value;
  return `const prefixes=${json(prefixes)},types=${json(types)};\nexport default {...${json(header)},entries:${json(rows)}.map(([suffix,bytes,sha256,type,group=0])=>({path:prefixes[group][0]+suffix,repositoryPath:prefixes[group][1]+suffix,bytes,sha256,contentType:types[type]}))};\n`;
}

export async function buildCompactDeployment({ activeMainModule, minifier, sourceCommit = process.env.GITHUB_SHA || null } = {}) {
  // This also validates the caller-supplied real active module name.
  const entry = visualPreviewEntry(activeMainModule);
  validateManifest(manifest);
  if (sourceCommit !== null && !/^[a-f0-9]{40}$/.test(sourceCommit)) throw Error('COMPACT_SOURCE_COMMIT_INVALID');
  if (!minifier) minifier = createRequire(import.meta.url)('esbuild');
  if (minifier.version !== ESBUILD_VERSION || typeof minifier.transform !== 'function') throw Error('LOCKED_ESBUILD_REQUIRED');
  const lock = JSON.parse(await readFile(resolve(repository, 'package-lock.json'), 'utf8'));
  assert.equal(lock.packages['node_modules/esbuild'].version, ESBUILD_VERSION, 'Use the already locked platform build dependency');
  const sourcePins = await Promise.all(SOURCE_PATHS.map(async path => {
    const bytes = await readFile(resolve(repository, path));
    return { path, bytes: bytes.length, sha256: hash(bytes) };
  }));
  const raw = new Map([
    ['entry.mjs', entry],
    ['catalogue.mjs', await readFile(resolve(directory, 'catalogue.mjs'), 'utf8')],
    ['worker.mjs', await readFile(resolve(directory, 'worker.mjs'), 'utf8')],
    ['worker-assets.mjs', compactWorkerAssetsSource(config)],
    ['preview-worker.mjs', await readFile(resolve(directory, '../preview/preview-worker.mjs'), 'utf8')],
    ['preview-manifest.mjs', compactPreviewManifestSource(manifest)],
  ]);
  const modules = [];
  for (const [name, source] of raw) {
    const result = await minifier.transform(source, { ...options, sourcefile: name });
    if (result.warnings.length) throw Error('COMPACT_MINIFIER_WARNINGS:' + name);
    modules.push({ name: MODULE_PREFIX + name, source: result.code,
      bytes: Buffer.byteLength(result.code), sha256: hash(result.code) });
  }
  assert.deepEqual(modules.map(item => item.name), COMPACT_MODULE_NAMES);
  // Evaluate the two standalone data modules. This checks the minifier output,
  // including exact served JS/CSS strings and JSON property/array ordering.
  const assets = (await fromSource(modules.find(item => item.name.endsWith('/worker-assets.mjs')).source)).default;
  const preview = (await fromSource(modules.find(item => item.name.endsWith('/preview-manifest.mjs')).source)).default;
  assert.deepEqual(assets, config); assert.equal(json(assets), json(config));
  assert.deepEqual(preview, manifest); assert.equal(json(preview), json(manifest));
  const totalBytes = modules.reduce((sum, item) => sum + item.bytes, 0);
  if (totalBytes > COMPACT_BYTE_BUDGET) throw Error(`COMPACT_BYTE_BUDGET_EXCEEDED:${totalBytes}>${COMPACT_BYTE_BUDGET}`);
  const report = { schema: 'zplay/new71-compact-deployment/v1', sourceCommit, activeMainModule,
    esbuildVersion: ESBUILD_VERSION, options, byteBudget: COMPACT_BYTE_BUDGET, totalBytes,
    assetRevision: config.assetRevision, previewSourceCommit: manifest.sourceCommit,
    previewRevision: manifest.revision, previewSourceFileCount: manifest.entries.length,
    exactDataEquivalence: true, sourcePins,
    modules: modules.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })) };
  return { modules, report };
}

export async function writeCompactDeployment(output, build) {
  const root = resolve(output);
  await mkdir(resolve(root, MODULE_PREFIX), { recursive: true });
  for (const item of build.modules) await writeFile(resolve(root, item.name), item.source);
  await writeFile(resolve(root, 'compact-report.json'), json(build.report) + '\n');
  return root;
}

/** Load only hash-checked files of this exact checkout/run for semantic and browser QA. */
export async function loadCompactDeployment(output, { expectedSourceCommit = process.env.GITHUB_SHA || null } = {}) {
  const root = resolve(output);
  const report = JSON.parse(await readFile(resolve(root, 'compact-report.json'), 'utf8'));
  assert.equal(report.schema, 'zplay/new71-compact-deployment/v1');
  assert.equal(report.esbuildVersion, ESBUILD_VERSION);
  assert.equal(report.byteBudget, COMPACT_BYTE_BUDGET);
  assert.equal(report.exactDataEquivalence, true);
  assert.equal(report.assetRevision, config.assetRevision);
  assert.equal(report.previewSourceCommit, manifest.sourceCommit);
  assert.equal(report.previewRevision, manifest.revision);
  assert.equal(report.previewSourceFileCount, manifest.entries.length);
  if (expectedSourceCommit) assert.equal(report.sourceCommit, expectedSourceCommit, 'Artifact must come from this exact source run');
  assert.deepEqual(report.modules.map(item => item.name), COMPACT_MODULE_NAMES);
  assert.equal(report.totalBytes, report.modules.reduce((sum, item) => sum + item.bytes, 0));
  assert(report.totalBytes <= COMPACT_BYTE_BUDGET);
  assert.deepEqual(report.sourcePins.map(pin => pin.path), SOURCE_PATHS);
  for (const pin of report.sourcePins) {
    assert(!pin.path.startsWith('/') && !pin.path.split('/').includes('..'), 'Invalid source pin');
    const bytes = await readFile(resolve(repository, pin.path));
    assert.equal(bytes.length, pin.bytes); assert.equal(hash(bytes), pin.sha256, 'Source drift: ' + pin.path);
  }
  const modules = [];
  for (const pin of report.modules) {
    const bytes = await readFile(resolve(root, pin.name));
    assert.equal(bytes.length, pin.bytes); assert.equal(hash(bytes), pin.sha256, 'Compact module drift: ' + pin.name);
    modules.push({ ...pin, source: bytes.toString('utf8') });
  }
  const assets = (await import(pathToFileURL(resolve(root, MODULE_PREFIX + 'worker-assets.mjs')))).default;
  const preview = (await import(pathToFileURL(resolve(root, MODULE_PREFIX + 'preview-manifest.mjs')))).default;
  assert.deepEqual(assets, config); assert.equal(json(assets), json(config));
  assert.deepEqual(preview, manifest); assert.equal(json(preview), json(manifest));
  const catalogue = await import(pathToFileURL(resolve(root, MODULE_PREFIX + 'catalogue.mjs')));
  const worker = await import(pathToFileURL(resolve(root, MODULE_PREFIX + 'worker.mjs')));
  const previewWorker = await import(pathToFileURL(resolve(root, MODULE_PREFIX + 'preview-worker.mjs')));
  return { root, report, modules, config: assets, manifest: preview, catalogue, ...worker, ...previewWorker };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), at = name => args[args.indexOf(name) + 1];
  if (!args.includes('--active-main') || !args.includes('--output')) throw Error('Usage: compact-deployment.mjs --active-main EXACT_ACTIVE_MAIN.mjs --output ARTIFACT_DIRECTORY');
  const build = await buildCompactDeployment({ activeMainModule: at('--active-main') });
  await writeCompactDeployment(at('--output'), build);
  console.log(json({ passed: true, totalBytes: build.report.totalBytes, byteBudget: COMPACT_BYTE_BUDGET,
    modules: build.report.modules, output: resolve(at('--output')) }));
}
