import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
const root = new URL('../', import.meta.url);
const runtime = await readFile(new URL('source/runtime-after.mjs', root));
const manifest = JSON.parse(await readFile(new URL('artifacts/build-manifest.json', root), 'utf8'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
if (runtime.length !== manifest.runtimeBytes || sha256(runtime) !== manifest.runtimeSha256) throw Error('RUNTIME_MANIFEST_MISMATCH');
const compressed = gzipSync(runtime, { level: 9 });
if (!gunzipSync(compressed).equals(runtime)) throw Error('COMPRESSION_ROUNDTRIP_FAILED');
// These direct imports let Railway's source analyzer discover both runtime packages.
const wrapper = `import pg from 'pg';\nimport Redis from 'ioredis';\nimport { gunzipSync } from 'node:zlib';\nimport { createHash } from 'node:crypto';\nimport { writeFile } from 'node:fs/promises';\nvoid pg; void Redis;\nconst runtimeBytes = gunzipSync(Buffer.from('${compressed.toString('base64')}', 'base64'));\nif (runtimeBytes.length !== ${runtime.length} || createHash('sha256').update(runtimeBytes).digest('hex') !== '${sha256(runtime)}') throw new Error('NATIVE_RUNTIME_INTEGRITY_MISMATCH');\nconst runtimeURL = new URL('./native-slot-runtime.mjs', import.meta.url);\nawait writeFile(runtimeURL, runtimeBytes, { mode: 0o600 });\nawait import(runtimeURL.href);\n`;
const wrapperBytes = Buffer.from(wrapper);
const encoded = wrapperBytes.toString('base64');
if (Buffer.byteLength(encoded) + 1 >= 131072) throw Error('WRAPPER_EXCEEDS_LINUX_ARGUMENT_BOUND');
await writeFile(new URL('artifacts/deployment-wrapper.mjs', root), wrapper);
const report = { runtimePath: 'source/runtime-after.mjs', runtimeBytes: runtime.length, runtimeSha256: sha256(runtime),
  gzipBytes: compressed.length, wrapperPath: 'artifacts/deployment-wrapper.mjs', wrapperBytes: wrapperBytes.length,
  wrapperSha256: sha256(wrapperBytes), wrapperBase64Bytes: encoded.length, argumentBytesIncludingNull: encoded.length + 1,
  linuxSingleArgumentLimit: 131072, runtimeLocation: 'native-slot-runtime.mjs beside wrapper/index.tsx',
  packageImports: ['pg', 'ioredis'], byteForBytePreserved: true };
await writeFile(new URL('artifacts/deployment-wrapper-manifest.json', root), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
