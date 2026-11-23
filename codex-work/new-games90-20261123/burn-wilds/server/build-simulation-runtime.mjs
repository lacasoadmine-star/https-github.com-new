import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { brotliCompressSync, constants } from 'node:zlib';

export const BURN_TEST_SOURCE_PIN = 'd0cac692564db9e3e7c93958c9a5d993be2a827f15c5f13ab5628e428e7422ef';
export const BURN_TEST_SERVE_ANCHOR = 'Bun.serve({ hostname: "0.0.0.0", port: Number(process.env.PORT || 3e3), fetch: service.fetch });';
export const BURN_TEST_MODULE_PATH = 'native72-batch01/burn-test-simulation.mjs';
export const BURN_TEST_BOOT_ANCHOR = "await mkdir(new URL('./native72-batch01/',import.meta.url),{recursive:true,mode:0o700});";
const SHA = text => createHash('sha256').update(text).digest('hex');
const here = path.dirname(fileURLToPath(import.meta.url));

/** Bundle only these local pure modules in dependency order, keeping each
 * module's lexical scope. No dependency download or third-party runtime.
 */
export async function bundleBurnTestRuntime() {
  const allowed = new Set(['expansion.mjs', 'rules.mjs', 'outcome-audit.mjs', 'candidate-math.mjs', 'server/simulation.mjs']);
  const base = path.resolve(here, '..'), cache = new Map(), sourcePins = {};
  async function visit(relative) {
    if (cache.has(relative)) return cache.get(relative).name;
    if (!allowed.has(relative)) throw Error('BURN_TEST_UNEXPECTED_BUNDLE_DEPENDENCY');
    const source = await readFile(path.join(base, relative), 'utf8');
    sourcePins[relative] = { bytes: Buffer.byteLength(source), sha256: SHA(source) };
    const imports = [...source.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];\s*$/gm)];
    let text = source;
    for (const match of imports) {
      if (!match[2].startsWith('.')) throw Error('BURN_TEST_EXTERNAL_DEPENDENCY');
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[2]));
      const target = await visit(resolved);
      text = text.replace(match[0], 'const {' + match[1].replace(/\bas\b/g, ':') + '} = ' + target + ';\n');
    }
    if (/^import\s/m.test(text)) throw Error('BURN_TEST_UNBUNDLED_IMPORT');
    const exports = [...text.matchAll(/^export\s+(?:(?:async\s+)?function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map(match => match[1]);
    text = text.replace(/^export\s+/gm, '');
    if (exports.length === 0 || /^export\s/m.test(text)) throw Error('BURN_TEST_UNSUPPORTED_EXPORT');
    const name = '__burnModule' + cache.size;
    cache.set(relative, { name, source: 'const ' + name + ' = (() => {\n' + text + '\nreturn {' + exports.join(',') + '};\n})();\n', exports });
    return name;
  }
  const entry = await visit('server/simulation.mjs');
  const exports = cache.get('server/simulation.mjs').exports;
  const code = '// Explicit ZPLAY TEST ETB simulation; no cash database.\n' +
    [...cache.values()].map(module => module.source).join('\n') +
    '\nexport const {' + exports.join(',') + '} = ' + entry + ';\n';
  return { code, sourcePins, bytes: Buffer.byteLength(code), sha256: SHA(code) };
}

export function wrapBurnTestRuntimeSource(source) {
  if (typeof source !== 'string' || source.split(BURN_TEST_SERVE_ANCHOR).length !== 2 ||
      source.includes('./' + BURN_TEST_MODULE_PATH)) throw Error('BURN_TEST_NATIVE_SERVE_ANCHOR_MISMATCH');
  const replacement = "const { bindBurnTestFetch } = await import('./" + BURN_TEST_MODULE_PATH + "');\n" +
    'Bun.serve({ hostname: "0.0.0.0", port: Number(process.env.PORT || 3e3), ' +
    'fetch: bindBurnTestFetch(service.fetch, { playerOrigin: process.env.PLAYER_ORIGIN }) });';
  return source.replace(BURN_TEST_SERVE_ANCHOR, replacement);
}

/** Add one isolated module AFTER the existing loader's pinned transformations.
 * Prior archive bytes, source checks and all unrelated modules stay intact.
 * The complete Function contains private retained material: keep it outside git.
 */
export function buildBurnTestFunction(existingSource, bundle, expectedSha256 = BURN_TEST_SOURCE_PIN, pinnedBundleUrl = null) {
  if (SHA(existingSource) !== expectedSha256) throw Error('BURN_TEST_CURRENT_FUNCTION_CHANGED');
  if (existingSource.split(BURN_TEST_BOOT_ANCHOR).length !== 2 || existingSource.includes('BURN_TEST_SIMULATION_BOOTSTRAP'))
    throw Error('BURN_TEST_FUNCTION_BOOT_ANCHOR_MISMATCH');
  if (typeof bundle?.code !== 'string' || bundle.bytes !== Buffer.byteLength(bundle.code) ||
      bundle.sha256 !== SHA(bundle.code)) throw Error('BURN_TEST_BUNDLE_INTEGRITY');
  if (pinnedBundleUrl !== null && !/^https:\/\/raw\.githubusercontent\.com\/lacasoadmine-star\/https-github\.com-new\/[a-f0-9]{40}\/codex-work\/new-games90-20261123\/burn-wilds\/server\/release\/simulation-runtime-r1\.mjs$/.test(pinnedBundleUrl))
    throw Error('BURN_TEST_IMMUTABLE_PUBLIC_BUNDLE_REQUIRED');
  const compressed = brotliCompressSync(Buffer.from(bundle.code), { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).toString('base64');
  const insertion = [
    '// BURN_TEST_SIMULATION_BOOTSTRAP: isolated ephemeral TEST ETB only.',
    pinnedBundleUrl === null ?
      "const burnTestBundle = brotliDecompressSync(Buffer.from('" + compressed + "','base64')).toString('utf8');" :
      'const burnTestBundle = (await fetchM20PublicArtifact(' + JSON.stringify(pinnedBundleUrl) + ',' +
        bundle.bytes + ',' + JSON.stringify(bundle.sha256) + ",15000)).toString('utf8');",
    'if(Buffer.byteLength(burnTestBundle)!==' + bundle.bytes + "||createHash('sha256').update(burnTestBundle).digest('hex')!==" + JSON.stringify(bundle.sha256) + ")throw Error('BURN_TEST_BUNDLE_INTEGRITY');",
    "const burnTestNative = files.find(file=>file.path==='native-slot-runtime.mjs');",
    'const burnTestServeAnchor = ' + JSON.stringify(BURN_TEST_SERVE_ANCHOR) + ';',
    "if(!burnTestNative||burnTestNative.source.split(burnTestServeAnchor).length!==2||files.some(file=>file.path===" + JSON.stringify(BURN_TEST_MODULE_PATH) + "))throw Error('BURN_TEST_NATIVE_SERVE_ANCHOR_MISMATCH');",
    'const burnTestServeReplacement = ' + JSON.stringify(wrapBurnTestRuntimeSource(BURN_TEST_SERVE_ANCHOR)) + ';',
    'burnTestNative.source=burnTestNative.source.replace(burnTestServeAnchor,burnTestServeReplacement);',
    "burnTestNative.bytes=Buffer.byteLength(burnTestNative.source);burnTestNative.sha256=createHash('sha256').update(burnTestNative.source).digest('hex');",
    'files.push({path:' + JSON.stringify(BURN_TEST_MODULE_PATH) + ',source:burnTestBundle,bytes:' + bundle.bytes + ',sha256:' + JSON.stringify(bundle.sha256) + '});',
    "console.info(JSON.stringify({event:'burn_test_simulation_mounted',mode:'SIMULATION',cashEnabled:false,databaseUsed:false,version:'burn-wilds-server-simulation-20261123-r1'}));",
    ''
  ].join('\n');
  const code = existingSource.replace(BURN_TEST_BOOT_ANCHOR, insertion + '\n' + BURN_TEST_BOOT_ANCHOR);
  return { code, bytes: Buffer.byteLength(code), sha256: SHA(code), insertion,
    previousSha256: expectedSha256, bundleSha256: bundle.sha256, bundleBytes: bundle.bytes,
    bundleTransport: pinnedBundleUrl === null ? 'inline-brotli' : 'pinned-github', pinnedBundleUrl,
    sourcePins: bundle.sourcePins, target: 'existing-superwin-nine-slot-engine',
    mode: 'SIMULATION', cashEnabled: false, databaseChanges: false,
    retainedFunctionUnchangedExceptInsertion: code.replace(insertion + '\n', '') === existingSource };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output, manifestPath, pinnedBundleUrl] = process.argv.slice(2);
  if (!input || !output || !manifestPath) throw Error('Usage: node build-simulation-runtime.mjs private-before.tsx private-after.tsx manifest.json');
  const source = await readFile(input, 'utf8'), bundle = await bundleBurnTestRuntime();
  const result = buildBurnTestFunction(source, bundle, BURN_TEST_SOURCE_PIN, pinnedBundleUrl || null);
  await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, result.code, { mode: 0o600 });
  await writeFile(output + '.bundle.mjs', bundle.code, { mode: 0o600 });
  const { code, insertion, ...manifest } = result;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ output, manifestPath, bytes: result.bytes, sha256: result.sha256,
    bundleBytes: result.bundleBytes, bundleSha256: result.bundleSha256,
    retainedFunctionUnchangedExceptInsertion: result.retainedFunctionUnchangedExceptInsertion }));
}
