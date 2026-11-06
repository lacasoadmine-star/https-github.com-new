import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const wrapper = await readFile(new URL('artifacts/deployment-wrapper.mjs', root), 'utf8');
const manifest = JSON.parse(await readFile(new URL('artifacts/deployment-wrapper-manifest.json', root), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('deployment wrapper preserves exact final runtime bytes and declares analyzed dependencies', async () => {
  const encoded = wrapper.match(/gunzipSync\(Buffer\.from\('([^']+)', 'base64'\)\)/)[1];
  const bytes = gunzipSync(Buffer.from(encoded, 'base64'));
  assert.deepEqual(bytes, await readFile(new URL('source/runtime-after.mjs', root)));
  assert.equal(bytes.length, manifest.runtimeBytes);assert.equal(sha(bytes), manifest.runtimeSha256);
  assert.equal(sha(wrapper), manifest.wrapperSha256);assert.equal(Buffer.byteLength(wrapper), manifest.wrapperBytes);
  assert.match(wrapper, /import pg from 'pg'/);assert.match(wrapper, /import Redis from 'ioredis'/);
  assert.match(wrapper, /new URL\('\.\/native-slot-runtime\.mjs', import\.meta\.url\)/);
  assert.match(wrapper, /await writeFile\(runtimeURL, runtimeBytes/);assert.match(wrapper, /await import\(runtimeURL\.href\)/);
});

test('base64 wrapper travels as one real Linux process argument below the single argument bound', () => {
  const encoded = Buffer.from(wrapper).toString('base64');assert.equal(encoded.length, manifest.wrapperBase64Bytes);
  assert.ok(encoded.length + 1 < 131072);
  const child = spawnSync(process.execPath, ['-e', "const c=require('node:crypto');process.stdout.write(c.createHash('sha256').update(Buffer.from(process.argv[1],'base64')).digest('hex'))", encoded], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(child.error, undefined);assert.equal(child.status, 0);assert.equal(child.stdout, manifest.wrapperSha256);
});
