// Reproducible size-only packaging. The four authored r18 source files and all
// retained Worker modules are read-only inputs; no remote operation is made.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { transform, version as esbuildVersion } from 'esbuild';
import { ACCOUNT_ASSET_OVERRIDES } from '../modules/independent74-account-assets-r18.mjs';
import { FRESH_ACCOUNT_ASSETS } from '../modules/independent74-connected-assets-r18.mjs';

const root = new URL('./', import.meta.url), hash = value => createHash('sha256').update(value).digest('hex');
await mkdir(new URL('modules/', root), { recursive: true });
const names = ['independent74-connected-assets-r18.mjs', 'independent74-entry-r18.mjs', 'independent74-gateway-r18.mjs'];
const authoredManifest = JSON.parse(await readFile(new URL('../module-manifest.json', root)));
const inputs = [];
for (const item of authoredManifest.modules) {
  const bytes = await readFile(new URL('../modules/' + item.name, root));
  if (bytes.length !== item.bytes || hash(bytes) !== item.sha256) throw new Error('FROZEN_AUTHORED_SOURCE_CHANGED');
  inputs.push(item);
}
const overrides = { ...ACCOUNT_ASSET_OVERRIDES, ...FRESH_ACCOUNT_ASSETS };
if (Object.keys(overrides).length !== 8) throw new Error('EXACT_EIGHT_OVERRIDES_REQUIRED');
const json = JSON.stringify(overrides), packed = gzipSync(Buffer.from(json), { level: 9 });
const source = `// Eight exact public text asset overrides, compressed only for upload size.\n` +
  `import {loadAssets as retainedAssets} from './independent74-assets-r17.mjs';\n` +
  `const packed=${JSON.stringify(packed.toString('base64'))};\n` +
  `export async function loadAssets(){\n` +
  ` const bytes=Uint8Array.from(atob(packed),value=>value.charCodeAt(0));\n` +
  ` const overrides=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();\n` +
  ` return {...await retainedAssets(),...overrides};\n}\n`;
await writeFile(new URL('asset-loader.mjs', root), source);
const adapter = await readFile(new URL('gateway-adapter.mjs', root), 'utf8');
const entry = await readFile(new URL('../modules/independent74-entry-r18.mjs', root), 'utf8');
const transformed = {};
for (const [name, input] of [
  [names[0], source], [names[1], entry], [names[2], adapter],
]) {
  transformed[name] = (await transform(input, { format: 'esm', target: 'es2022', minify: true, legalComments: 'none' })).code;
  await writeFile(new URL('modules/' + name, root), transformed[name]);
}
if (transformed[names[1]].includes('account-assets-r18') || transformed[names[0]].includes('account-assets-r18')) throw new Error('UNUPLOADED_MODULE_DEPENDENCY');
if (!transformed[names[1]].includes('protected-readonly')) throw new Error('PROTECTED_READONLY_ENTRY_REQUIRED');
const modules = names.map(name => ({ name, bytes: Buffer.byteLength(transformed[name]), sha256: hash(transformed[name]) }));
const total = modules.reduce((sum, module) => sum + module.bytes, 0);
if (total >= 45000) throw new Error('COMPACT_ADDITION_MUST_BE_UNDER_45000_BYTES');
await writeFile(new URL('modules.json', root), JSON.stringify(transformed));
await writeFile(new URL('overrides.json', root), json);

// Run the existing gateway assertions unchanged except their import location.
// Static source-preservation assertions still inspect the frozen authored files.
const originalTest = new URL('../worker-integration.test.mjs', root);
let ported = await readFile(originalTest, 'utf8');
const parentRelative = path => '../' + (path.startsWith('./') ? path.slice(2) : path);
ported = ported.replace(/from\s+(['"])(\.[^'"]*)\1/g, (whole, quote, path) => {
  const target = path === './modules/independent74-gateway-r18.mjs' ? path : parentRelative(path);
  return 'from ' + JSON.stringify(target);
});
ported = ported.replace(/new URL\((['"])(\.[^'"]*)\1, import\.meta\.url\)/g,
  (whole, quote, path) => 'new URL(' + JSON.stringify(parentRelative(path)) + ', import.meta.url)');
await writeFile(new URL('ported-worker-integration.test.mjs', root), ported);

const retainedBodyBytes = 66889617, retainedMultipartOverhead = 43677, additionalMultipartAllowance = 10000;
const manifest = {
  format: 'existing-player-wallet-readonly-compact-r18-v1', main_module: names[1],
  moduleCount: 3, addedModuleBytes: total, unchangedRetainedModuleCount: 310,
  retainedModuleBodiesChanged: 0, authoredInputModules: inputs, modules,
  assetPacking: { method: 'gzip-level9-json-base64', assetCount: 8, jsonBytes: Buffer.byteLength(json),
    jsonSha256: hash(json), gzipBytes: packed.length, gzipSha256: hash(packed), base64Bytes: packed.toString('base64').length,
    keys: Object.keys(overrides) },
  gateway: { method: 'retained-r17-factory-with-four-approved-response-changes',
    source: 'gateway-adapter.mjs', sourceBytes: Buffer.byteLength(adapter), sourceSha256: hash(adapter),
    addedFinancialPostForwarding: 0, accountTransport: 'protected-readonly' },
  entry: { source: '../modules/independent74-entry-r18.mjs', method: 'esbuild-minify-only' },
  requestEstimate: {
    retainedBodyBytes, retainedMultipartOverhead, addedModuleBytes: total,
    additionalMultipartAllowance,
    conservativeTotalBytes: retainedBodyBytes + retainedMultipartOverhead + total + additionalMultipartAllowance,
    thresholdBytes: 67000000,
    headroomBytes: 67000000 - retainedBodyBytes - retainedMultipartOverhead - total - additionalMultipartAllowance,
    exactMultipartMustBeMeasuredByUploader: true,
  },
  remoteWrites: 0,
};
await writeFile(new URL('manifest.json', root), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(new URL('source-builder-record.json', root), JSON.stringify({
  format: manifest.format,
  tool: { name: 'esbuild', version: esbuildVersion,
    options: { format: 'esm', target: 'es2022', minify: true, legalComments: 'none' } },
  gzip: { library: 'node:zlib', level: 9, input: 'JSON.stringify({...ACCOUNT_ASSET_OVERRIDES,...FRESH_ACCOUNT_ASSETS})' },
  authoredInputs: inputs, compiledOutputs: modules,
  gatewayAdapterSha256: hash(adapter), assetLoaderSha256: hash(source),
  originalGatewayTestSha256: hash(await readFile(originalTest)), portedGatewayTestSha256: hash(ported),
  testPorting: 'Only imports and static file URL bases are relocated; assertion bodies are unchanged.',
  noRemoteOperations: true,
}, null, 2) + '\n');
console.log(JSON.stringify({ moduleCount: 3, addedModuleBytes: total, modules, requestEstimate: manifest.requestEstimate }, null, 2));
