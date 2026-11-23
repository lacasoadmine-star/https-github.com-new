import {readFile, mkdir, writeFile, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BURN_TEST_CLIENT_FILES, BURN_TEST_PAGE} from './page-worker.mjs';

export const RETAINED_PRESENTATION_SHA256 = '4ee86c4149fc920685df98555feab00adc9662a59e6b08e1df3ad938d1e1c423';
export const RETAINED_PRESENTATION_FILENAME = 'presentation-service-entry-r23.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const gameRoot = dirname(here);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const IMPORT = /(?:\b(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?|\bimport\s*\()\s*(['"])([^'"]+)\1/g;

export function assertClientImportClosure(assets) {
  const allowed = new Set(BURN_TEST_CLIENT_FILES);
  for (const [name, source] of Object.entries(assets)) {
    if (!allowed.has(name)) throw Error('UNEXPECTED_CLIENT_ASSET:' + name);
    if (!name.endsWith('.mjs')) continue;
    for (const match of source.matchAll(IMPORT)) {
      const specifier = match[2];
      if (!specifier.startsWith('./') || !allowed.has(specifier.slice(2))) {
        throw Error('CLIENT_IMPORT_NOT_PACKAGED:' + name + ':' + specifier);
      }
    }
  }
}

/** Produces a reviewable package only. Never uploads or deploys anything. */
export async function buildBurnWildsPresentation({previousModule, outputDir}) {
  if (!previousModule || !outputDir) throw Error('PREVIOUS_MODULE_AND_OUTPUT_REQUIRED');
  const previousPath = resolve(previousModule), out = resolve(outputDir);
  if (out === here || out === gameRoot || out.startsWith(gameRoot + '/')) {
    throw Error('RELEASE_OUTPUT_MUST_BE_OUTSIDE_SOURCE');
  }
  const retained = await readFile(previousPath);
  if (sha(retained) !== RETAINED_PRESENTATION_SHA256) throw Error('RETAINED_PRESENTATION_SOURCE_CHANGED');
  const previousSettings = JSON.parse(await readFile(join(dirname(previousPath), 'settings.json'), 'utf8'));
  if (previousSettings.compatibility_date !== '2026-11-10' || previousSettings.bindings?.length !== 0) {
    throw Error('RETAINED_PRESENTATION_SETTINGS_CHANGED');
  }
  const retainedSettings = {};
  for (const key of ['placement', 'usage_model', 'tags', 'tail_consumers', 'logpush', 'observability']) {
    if (Object.hasOwn(previousSettings, key)) retainedSettings[key] = previousSettings[key];
  }
  const assets = {};
  for (const name of BURN_TEST_CLIENT_FILES) {
    const path = name === 'test-shell.css' ? join(here, name) : join(gameRoot, name);
    const source = await readFile(path, 'utf8');
    if (!source || Buffer.byteLength(source) > 512 * 1024) throw Error('CLIENT_ASSET_SIZE_INVALID:' + name);
    assets[name] = source;
  }
  assertClientImportClosure(assets);
  const workerSource = await readFile(join(here, 'page-worker.mjs'), 'utf8');
  const revision = sha(JSON.stringify({assets, workerSource})).slice(0, 24);
  const entrySource = `import previous from './${RETAINED_PRESENTATION_FILENAME}';\nimport {createBurnWildsTestPageWorker} from './burn-wilds-test-page.mjs';\nimport config from './burn-wilds-test-assets.mjs';\nexport default createBurnWildsTestPageWorker(previous, config);\n`;
  const moduleSources = {
    'burn-wilds-test-entry.mjs': entrySource,
    'burn-wilds-test-page.mjs': workerSource,
    'burn-wilds-test-assets.mjs': 'export default ' + JSON.stringify({revision, assets}) + ';\n'
  };
  await mkdir(out, {recursive: true});
  const modules = [];
  for (const [name, source] of Object.entries(moduleSources)) {
    await writeFile(join(out, name), source);
    modules.push({name, contentType: 'application/javascript+module', bytes: Buffer.byteLength(source), sha256: sha(source)});
  }
  await copyFile(previousPath, join(out, RETAINED_PRESENTATION_FILENAME));
  modules.push({name: RETAINED_PRESENTATION_FILENAME, contentType: 'application/javascript+module', bytes: retained.length, sha256: sha(retained), unchanged: true});
  const manifest = {
    schema: 'zplay/burn-wilds-presentation-release/v1', revision,
    target: 'superwin-native-presentation',
    expectedActiveVersion: 'be700a79-c11c-4094-b734-c68e1eb63c76',
    parentPlayerUnchanged: true,
    route: BURN_TEST_PAGE,
    apiBase: '/api/slots/new-games90/burn-wilds/test/',
    mode: 'SIMULATION', currencyLabel: 'TEST ETB', cashEnabled: false,
    metadata: {
      ...retainedSettings,
      main_module: 'burn-wilds-test-entry.mjs',
      compatibility_date: '2026-11-10', compatibility_flags: [], bindings: [],
      annotations: {'workers/tag': 'game1-burn-server-test-' + revision.slice(0, 8),
        'workers/message': 'Game 1 Burn Wilds server simulation page through existing Player /native-ui bridge; prior presentation module unchanged; production cash disabled.'}
    },
    modules,
    clientFiles: BURN_TEST_CLIENT_FILES.map(name => ({name, bytes: Buffer.byteLength(assets[name]), sha256: sha(assets[name])})),
    excludedFromStaticServing: ['server/', '*.test.mjs', 'candidate-math.mjs', 'official-atlas-audit.mjs', 'current-reference.json', 'player-integration/']
  };
  await writeFile(join(out, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!['--previous-module', '--out'].includes(args[index]) || !args[index + 1]) throw Error('USAGE: --previous-module PATH --out PATH');
    values[args[index]] = args[index + 1];
  }
  const result = await buildBurnWildsPresentation({previousModule: values['--previous-module'], outputDir: values['--out']});
  console.log(JSON.stringify({revision: result.revision, route: result.route, modules: result.modules,
    totalBytes: result.modules.reduce((sum, item) => sum + item.bytes, 0)}, null, 2));
}
