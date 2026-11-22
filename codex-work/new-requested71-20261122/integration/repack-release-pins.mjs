/** Lossless packaging of one pinned, already deployed metadata object. No game implementation. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const METADATA_MODULE = 'native72dedicatedr1/release-pins.mjs';
export const METADATA_SOURCE_PATH = 'codex-work/native72-20261119/changes/dedicated-resume/deployment/release-pins.mjs';
export const METADATA_BEFORE = Object.freeze({ bytes: 127134,
  sha256: 'db96f12990fe8d48d62e1c04de2e7611d9f3ba117bd791f733fa75af75b2cf10',
  contentType: 'application/javascript+module' });
export const MIN_METADATA_SAVINGS = 90000;
const hash = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value);
const keys = (value, expected) => assert.deepEqual(Object.keys(value), expected, 'Pinned metadata shape changed');

/** Parse only the exact known JSON export; never execute the original module. */
export function parsePinnedMetadata(bytes) {
  assert.equal(bytes.length, METADATA_BEFORE.bytes, 'Pinned metadata byte count changed');
  assert.equal(hash(bytes), METADATA_BEFORE.sha256, 'Pinned metadata source hash changed');
  const match = bytes.toString('utf8').match(/^\/\/ Generated[^\n]*\nexport const releasePins = ([\s\S]+);\s*$/);
  assert(match, 'Pinned metadata must remain a plain JSON export');
  return JSON.parse(match[1]);
}

export async function readPinnedMetadata(repository) {
  return parsePinnedMetadata(await readFile(resolve(repository, METADATA_SOURCE_PATH)));
}

export function metadataProof(value) {
  keys(value, ['presencePath', 'shared', 'games']);
  assert.equal(value.games.length, 2);
  let assetCount = 0;
  const manifests = [value.shared, ...value.games].map((pin, index) => {
    keys(pin, index ? ['release', 'gameId', 'manifestKey', 'manifestSha256', 'manifestSize', 'inlineManifest']
      : ['release', 'manifestKey', 'manifestSha256', 'manifestSize', 'inlineManifest']);
    const bytes = Buffer.from(pin.inlineManifest);
    assert.equal(bytes.length, pin.manifestSize, 'Inline manifest byte count changed');
    assert.equal(hash(bytes), pin.manifestSha256, 'Inline manifest hash changed');
    assert.equal(pin.manifestKey, 'native72/manifests/' + pin.manifestSha256);
    const manifest = JSON.parse(pin.inlineManifest);
    keys(manifest, index ? ['release', 'gameId', 'htmlTemplate', 'assets'] : ['release', 'assets']);
    assert.equal(json(manifest) + '\n', pin.inlineManifest, 'Inline manifest JSON bytes are not canonical');
    assert.equal(manifest.release, pin.release);
    if (index) assert.equal(manifest.gameId, pin.gameId);
    const assets = Object.entries(manifest.assets);
    for (const [name, asset] of assets) {
      assert.equal(typeof name, 'string');
      keys(asset, ['kvKey', 'size', 'sha256', 'type']);
      assert.match(asset.sha256, /^[a-f0-9]{64}$/);
      assert(asset.kvKey.endsWith('/' + asset.sha256), 'Unexpected content-addressed KV key');
      assert(Number.isSafeInteger(asset.size) && asset.size >= 0);
      assert.equal(typeof asset.type, 'string');
    }
    assetCount += assets.length;
    return { release: pin.release, manifestKey: pin.manifestKey, bytes: bytes.length,
      sha256: hash(bytes), assetCount: assets.length, assetSemanticSha256: hash(json(assets)),
      htmlSha256: index ? hash(manifest.htmlTemplate) : null };
  });
  assert.equal(assetCount, 321, 'Pinned asset inventory changed');
  return { semanticSha256: hash(json(value)), assetCount, manifests };
}

export function assertMetadataEquivalent(expected, actual) {
  assert.deepEqual(actual, expected);
  assert.equal(json(actual), json(expected), 'Metadata JSON property order changed');
  const before = metadataProof(expected), after = metadataProof(actual);
  assert.deepEqual(after, before);
  for (const [index, pin] of [expected.shared, ...expected.games].entries()) {
    const other = [actual.shared, ...actual.games][index];
    assert.equal(other.inlineManifest, pin.inlineManifest, 'Inline manifest text changed');
    const entries = Object.entries(JSON.parse(pin.inlineManifest).assets);
    const actualEntries = Object.entries(JSON.parse(other.inlineManifest).assets);
    assert.equal(actualEntries.length, entries.length);
    entries.forEach(([path, asset], at) => {
      assert.equal(actualEntries[at][0], path, 'Asset path or order changed');
      for (const field of ['kvKey', 'size', 'sha256', 'type']) assert.equal(actualEntries[at][1][field], asset[field]);
    });
  }
  return before;
}

/**
 * Fold repeated literals into tables. A filename reuses an asset SHA only when
 * that exact SHA literally occurs once in the original filename. HTML is split
 * into exact lines and joined unchanged. No guessing, compression stream or I/O.
 */
export function metadataRepackSource(value) {
  const proof = metadataProof(value);
  const tables = { names: [], types: [], prefixes: [], htmlLines: [] };
  const intern = (table, item) => { let index = tables[table].indexOf(item);
    if (index < 0) { index = tables[table].length; tables[table].push(item); } return index; };
  let reusedNameDigests = 0;
  const packed = [value.shared, ...value.games].map(pin => {
    const manifest = JSON.parse(pin.inlineManifest);
    const header = Object.entries(manifest).filter(([key]) => key !== 'assets').map(([key, item]) =>
      [key, key === 'htmlTemplate' ? item.split('\n').map(line => intern('htmlLines', line)) : item]);
    const rows = Object.entries(manifest.assets).map(([path, asset]) => {
      const pieces = path.split(asset.sha256);
      const name = pieces.length === 2 ? (reusedNameDigests++, pieces.map(part => intern('names', part))) : intern('names', path);
      return [name, asset.size, Buffer.from(asset.sha256, 'hex').toString('base64'),
        intern('types', asset.type), intern('prefixes', asset.kvKey.slice(0, -64))];
    });
    return [header, rows];
  });
  const outer = structuredClone(value);
  [outer.shared, ...outer.games].forEach((pin, index) => { pin.inlineManifest = index; });
  const source = `// Lossless table representation of one pinned existing metadata export.\n`
    + `const tables=${json(tables)},packed=${json(packed)};\n`
    + `const texts=packed.map(([header,rows])=>{const manifest=Object.fromEntries(header.map(([key,value])=>[key,key==='htmlTemplate'?value.map(i=>tables.htmlLines[i]).join('\\n'):value]));manifest.assets=Object.fromEntries(rows.map(([name,size,digest,type,prefix])=>{const sha256=Array.from(atob(digest),c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');const path=Array.isArray(name)?tables.names[name[0]]+sha256+tables.names[name[1]]:tables.names[name];return[path,{kvKey:tables.prefixes[prefix]+sha256,size,sha256,type:tables.types[type]}];}));return JSON.stringify(manifest)+'\\n';});\n`
    + `export const releasePins=${json(outer)};\n`
    + `for(const pin of[releasePins.shared,...releasePins.games])pin.inlineManifest=texts[pin.inlineManifest];\n`;
  assert(METADATA_BEFORE.bytes - Buffer.byteLength(source) >= MIN_METADATA_SAVINGS, 'Metadata repack must save at least 90k before minification');
  return { source, proof, tables: Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.length])), reusedNameDigests };
}

export async function verifyMetadataRepackModule(source, expected) {
  const exports = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  assert.deepEqual(Object.keys(exports), ['releasePins'], 'Metadata export surface changed');
  return assertMetadataEquivalent(expected, exports.releasePins);
}
