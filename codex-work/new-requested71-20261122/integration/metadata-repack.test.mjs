import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { METADATA_MODULE, METADATA_SOURCE_PATH, METADATA_BEFORE, MIN_METADATA_SAVINGS,
  parsePinnedMetadata, readPinnedMetadata, metadataProof, metadataRepackSource,
  verifyMetadataRepackModule, assertMetadataEquivalent } from './repack-release-pins.mjs';
import { applyPinnedMetadataRepack, sha256 } from './additive-upload.mjs';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const originalBytes = await readFile(resolve(repository, METADATA_SOURCE_PATH));
const original = await readPinnedMetadata(repository);
const packed = metadataRepackSource(original);
const digest = value => createHash('sha256').update(value).digest('hex');
const repack = { name: METADATA_MODULE, before: METADATA_BEFORE, after: {
  bytes: Buffer.byteLength(packed.source), sha256: digest(packed.source), contentType: METADATA_BEFORE.contentType },
  savedBytes: METADATA_BEFORE.bytes - Buffer.byteLength(packed.source), ...packed.proof, source: packed.source };

test('only the exact active metadata container is parsed; even semantically harmless source drift rejects', () => {
  assert.equal(originalBytes.length, 127134);
  assert.equal(digest(originalBytes), METADATA_BEFORE.sha256);
  assert.throws(() => parsePinnedMetadata(Buffer.concat([originalBytes, Buffer.from('\n')])));
  const changed = Buffer.from(originalBytes); changed[5] ^= 1;
  assert.throws(() => parsePinnedMetadata(changed), /source hash changed/);
});

test('pure table reconstruction preserves exported object/order, all3 manifest bytes and all321 asset entries', async () => {
  const proof = await verifyMetadataRepackModule(packed.source, original);
  assert.deepEqual(proof, metadataProof(original));
  assert.equal(proof.semanticSha256, '5e180abe371eca39c8bf34006ab1885bd804b3ded7e1fe52889f299d271f5fd3');
  assert.equal(proof.assetCount, 321);
  assert.deepEqual(proof.manifests.map(pin => pin.assetCount), [9, 213, 99]);
  assert.equal(packed.reusedNameDigests, 264);
  assert.equal(packed.tables.htmlLines, 26);
  assert(repack.savedBytes >= MIN_METADATA_SAVINGS);
  assert.equal(packed.source, metadataRepackSource(original).source, 'Packaging must be deterministic');
});

test('nested manifest whitespace, property order and any KV locator change fail equivalence', () => {
  const whitespace = structuredClone(original); whitespace.shared.inlineManifest += '\n';
  assert.throws(() => assertMetadataEquivalent(original, whitespace));
  const reordered = { shared: original.shared, presencePath: original.presencePath, games: original.games };
  assert.throws(() => assertMetadataEquivalent(original, reordered), /property order changed/);
  const key = structuredClone(original); key.games[0].manifestKey += '-changed';
  assert.throws(() => assertMetadataEquivalent(original, key));
});

test('table generation requires exact canonical manifest text and verified hashes before encoding', () => {
  const value = structuredClone(original);
  value.shared.inlineManifest = JSON.stringify(JSON.parse(value.shared.inlineManifest), null, 2) + '\n';
  assert.throws(() => metadataRepackSource(value), /byte count changed/);
});

test('replacement helper changes only the pinned metadata container and leaves caller baseline intact', async () => {
  const other = new Uint8Array([0, 255, 7]);
  const parts = new Map([[METADATA_MODULE, { bytes: originalBytes, contentType: METADATA_BEFORE.contentType }],
    ['old/untouched.bin', { bytes: other, contentType: 'application/octet-stream' }]]);
  const inventory = await Promise.all([...parts].map(async ([name, part]) => ({ name,
    bytes: part.bytes.length, sha256: await sha256(part.bytes), contentType: part.contentType })));
  const output = await applyPinnedMetadataRepack(parts, inventory, repack);
  assert.equal(parts.get(METADATA_MODULE).bytes, originalBytes);
  assert.equal(output.parts.get('old/untouched.bin'), parts.get('old/untouched.bin'));
  assert.deepEqual(output.inventory[1], inventory[1]);
  assert.equal(output.parts.get(METADATA_MODULE).bytes.length, repack.after.bytes);
  await assert.rejects(() => applyPinnedMetadataRepack(parts, inventory, { ...repack, name: 'old/untouched.bin' }), /NOT_PINNED/);
  await assert.rejects(() => applyPinnedMetadataRepack(parts, inventory, { ...repack, source: repack.source + ' ' }), /ARTIFACT_CHANGED/);
  await assert.rejects(() => applyPinnedMetadataRepack(parts, inventory, { ...repack, semanticSha256: '0'.repeat(64) }), /NOT_PINNED/);
});
