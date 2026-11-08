#!/usr/bin/env node
/**
 * Offline assembly of the four reference-art asset sets.
 *
 * readInventory() / buildInventory() need only checked-in JSON metadata, never
 * cached binaries or network access. copyStaticAssets() additionally requires
 * every declared byte, verifies it before writing, and atomically publishes a
 * NEW LOCAL directory. This is not a Cloudflare deployment or asset upload.
 *
 * Future deployment MUST merge these routes into the preserved existing static
 * asset manifest. Replacing NATIVE_LIBRARY_ASSETS or its existing routes with
 * this partial reference-art directory is not supported by this tool.
 */
import {createHash, randomUUID} from 'node:crypto';
import {readFile, writeFile, mkdir, mkdtemp, rename, rm, lstat, link} from 'node:fs/promises';
import {dirname, basename, join, relative, resolve, isAbsolute, sep} from 'node:path';
import {tmpdir} from 'node:os';
import {performance} from 'node:perf_hooks';
import {fileURLToPath, pathToFileURL} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(HERE, '../../..');
export const PUBLIC_PREFIX = '/native-library/reference-art/r1';
export const GROUP_INDEXES = Object.freeze({
  smartsoft: 'renderer-manifest.json',
  'remaining-slots': 'remaining-slots/index.json',
  arcade: 'arcade/index.json',
  legends: 'legends/index.json',
});
export const DEFAULT_CACHE_ROOTS = Object.freeze({
  smartsoft: '/tmp/zplay-reference-presentation-assets',
  'remaining-slots': '/tmp/zplay-remaining-slot-assets',
  arcade: '/tmp/zplay-arcade-assets',
  legends: '/tmp/zplay-legends-assets',
});
export const MIME_TYPES = Object.freeze({
  png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml', mp3: 'audio/mpeg',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf',
  otf: 'font/otf', json: 'application/json', atlas: 'text/plain; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
});
const HASH = /^[a-f0-9]{64}$/;
const FILE = /^([a-f0-9]{64})\.([a-z0-9]+)$/;
const GAME_ID = /^[a-z][a-z0-9_]*$/;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const encoded = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
function fail(code, message, details) {const error = new Error(message); error.code = code; if (details) error.details = details; throw error;}
function sortedRecord(entries) {return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));}
function relativeFile(file) {
  if (typeof file !== 'string' || !file || isAbsolute(file) || /[\\\0?#]/.test(file) || file.split('/').some(part => !part || part === '.' || part === '..')) fail('INVALID_SOURCE_PATH', 'Only normalized relative source paths are allowed');
  return file;
}
function lockedMetadata(entry, label) {
  if (!record(entry) || !HASH.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1) fail('INVALID_ASSET_METADATA', 'Invalid locked hash or byte count: ' + label);
}
function safeFile(file, entry) {
  const match = typeof file === 'string' ? FILE.exec(file) : null;
  if (!match || !Object.hasOwn(MIME_TYPES, match[2])) fail('UNSUPPORTED_ASSET_TYPE', 'Only content-addressed inert art/data files may be assembled: ' + file);
  lockedMetadata(entry, file);
  if (match[1] !== entry.sha256 || (entry.file !== undefined && entry.file !== file)) fail('CONTENT_NAME_MISMATCH', 'Asset filename and declared SHA-256 differ: ' + file);
  const urls = [entry.sourceURL, ...(Array.isArray(entry.urls) ? entry.urls : [])].filter(Boolean);
  for (const url of urls) {
    let pathname;
    try {
      const source = new URL(url);
      if (source.protocol !== 'https:' || source.username || source.password) throw new Error('Invalid static source');
      pathname = decodeURIComponent(source.pathname);
    } catch {fail('INVALID_SOURCE_URL', 'Invalid asset provenance URL');}
    if (/\.(?:[cm]?js|html?|exe|dll|so|wasm|sh|py)(?:$|\/)/i.test(pathname)) fail('EXECUTABLE_SOURCE', 'Provider executable code cannot be included as reference art');
  }
  return MIME_TYPES[match[2]];
}

/** Pure metadata function. Each group contains name, indexFile, indexHash,
 * indexBytes, and games:[{id,manifestFile,manifestHash,manifestBytes,manifest}]. */
export function buildInventory(groups) {
  if (!Array.isArray(groups) || !groups.length || groups.some(group => !record(group) || typeof group.name !== 'string')) fail('INVALID_GROUPS', 'At least one known presentation group is required');
  const files = new Map(), outputGroups = new Map(), sourceDocuments = new Map(), hashes = new Map(), gameIds = new Set();
  let manifestReferences = 0, gameCount = 0;
  for (const group of [...groups].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!Object.hasOwn(GROUP_INDEXES, group.name) || outputGroups.has(group.name)) fail('INVALID_GROUP', 'Unknown or duplicate presentation group');
    const indexFile = relativeFile(group.indexFile);
    if (indexFile !== GROUP_INDEXES[group.name]) fail('INVALID_INDEX_PATH', 'A presentation group must use its checked-in index path');
    lockedMetadata({sha256: group.indexHash, bytes: group.indexBytes}, indexFile);
    sourceDocuments.set(indexFile, {sha256: group.indexHash, bytes: group.indexBytes});
    if (!Array.isArray(group.games) || group.games.some(item => !record(item) || typeof item.id !== 'string')) fail('INVALID_GAMES', 'Presentation group must declare its game manifests');
    const assetBaseURL = PUBLIC_PREFIX + '/' + group.name + '/assets/';
    const outputGames = new Map();
    for (const item of [...group.games].sort((a, b) => a.id.localeCompare(b.id))) {
      if (!GAME_ID.test(item.id) || gameIds.has(item.id) || !record(item.manifest) || item.manifest.id !== item.id || item.manifest.schemaVersion !== 1 || !record(item.manifest.files)) fail('INVALID_MANIFEST', 'Invalid game identity or file manifest');
      if (item.manifest.productionLaunchEnabled !== false || item.manifest.financialActions === true || item.manifest.capabilities?.financialActions === true) fail('UNSAFE_PRESENTATION_MANIFEST', 'Reference-art manifests must not enable production or financial actions');
      gameIds.add(item.id);
      const manifestFile = relativeFile(item.manifestFile);
      lockedMetadata({sha256: item.manifestHash, bytes: item.manifestBytes}, manifestFile);
      if (sourceDocuments.has(manifestFile)) fail('DUPLICATE_SOURCE', 'Two source entries refer to the same manifest path');
      sourceDocuments.set(manifestFile, {sha256: item.manifestHash, bytes: item.manifestBytes});
      let gameBytes = 0;
      for (const [file, entry] of Object.entries(item.manifest.files)) {
        const mime = safeFile(file, entry), path = assetBaseURL + file;
        const old = files.get(path);
        if (old && (old.sha256 !== entry.sha256 || old.bytes !== entry.bytes || old.mime !== mime)) fail('CONFLICTING_ASSET', 'Shared asset metadata disagrees: ' + path);
        if (hashes.has(entry.sha256) && hashes.get(entry.sha256) !== entry.bytes) fail('CONFLICTING_ASSET', 'Identical hashes must have identical byte counts');
        hashes.set(entry.sha256, entry.bytes);
        const value = old || {sha256: entry.sha256, bytes: entry.bytes, mime, group: group.name, file, games: []};
        value.games.push(item.id); files.set(path, value);
        gameBytes += entry.bytes; manifestReferences++;
      }
      outputGames.set(item.id, {manifestFile, manifestSha256: item.manifestHash, manifestBytes: item.manifestBytes, assetBaseURL, fileCount: Object.keys(item.manifest.files).length, bytes: gameBytes});
      gameCount++;
    }
    const groupFiles = [...files.values()].filter(item => item.group === group.name);
    outputGroups.set(group.name, {assetBaseURL, sourceIndex: {file: indexFile, sha256: group.indexHash, bytes: group.indexBytes}, games: sortedRecord([...outputGames]), fileCount: groupFiles.length, bytes: groupFiles.reduce((total, item) => total + item.bytes, 0)});
  }
  for (const entry of files.values()) entry.games.sort();
  return {
    schemaVersion: 1, publicPrefix: PUBLIC_PREFIX,
    mergeStrategy: 'additive-preserve-existing', requiresExistingAssetManifestMerge: true,
    replacesExistingAssetManifest: false, deploymentPerformed: false,
    binaryVerification: 'Required before copying or deployment; metadata enumeration alone does not verify cached bytes.',
    groups: sortedRecord([...outputGroups]), sourceDocuments: sortedRecord([...sourceDocuments]),
    files: sortedRecord([...files]),
    totals: {groups: outputGroups.size, games: gameCount, manifestReferences, files: files.size, bytes: [...files.values()].reduce((total, item) => total + item.bytes, 0), uniqueContentFiles: hashes.size, uniqueContentBytes: [...hashes.values()].reduce((total, value) => total + value, 0)},
  };
}

async function readSource(root, file) {
  const path = join(root, relativeFile(file));
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('INVALID_SOURCE_FILE', 'Source metadata must be a regular file: ' + file);
  const bytes = await readFile(path);
  return {data: JSON.parse(bytes.toString('utf8')), sha256: sha256(bytes), bytes: bytes.length};
}

/** Enumerate all four checked-in source indexes. This function never touches an
 * asset cache, writes files, makes a network request, or executes provider code. */
export async function readInventory({presentationRoot = HERE} = {}) {
  const root = resolve(presentationRoot);
  const groups = await Promise.all(Object.entries(GROUP_INDEXES).map(async ([name, indexFile]) => {
    const index = await readSource(root, indexFile);
    if (index.data.schemaVersion !== 1 || index.data.productionLaunchEnabled !== false || !record(index.data.games)) fail('INVALID_INDEX', 'Invalid presentation index: ' + indexFile);
    const games = await Promise.all(Object.entries(index.data.games).map(async ([id, entry]) => {
      if (!record(entry)) fail('INVALID_INDEX_ENTRY', 'Invalid game index entry');
      relativeFile(entry.file);
      const manifestFile = relative(root, join(root, dirname(indexFile), entry.file)).split(sep).join('/');
      const manifest = await readSource(root, manifestFile);
      return {id, manifestFile, manifestHash: manifest.sha256, manifestBytes: manifest.bytes, manifest: manifest.data};
    }));
    return {name, indexFile, indexHash: index.sha256, indexBytes: index.bytes, games};
  }));
  return buildInventory(groups);
}

function textContent(bytes) {
  try {return new TextDecoder('utf-8', {fatal: true}).decode(bytes);} catch {fail('INVALID_STATIC_DATA', 'Text asset is not valid UTF-8');}
}
export function verifyStaticBytes(file, entry, bytes) {
  const mime = safeFile(file, entry);
  if (bytes.byteLength !== entry.bytes || sha256(bytes) !== entry.sha256) fail('ASSET_CHANGED', 'Cached asset byte count or SHA-256 changed: ' + file);
  const ext = file.slice(file.lastIndexOf('.') + 1), ascii = bytes.subarray(0, 16).toString('latin1');
  let correct = true;
  if (ext === 'png') correct = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  else if (ext === 'jpg') correct = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  else if (ext === 'gif') correct = /^GIF8[79]a/.test(ascii);
  else if (ext === 'webp') correct = ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  else if (ext === 'woff') correct = ascii.startsWith('wOFF');
  else if (ext === 'woff2') correct = ascii.startsWith('wOF2');
  else if (ext === 'otf') correct = ascii.startsWith('OTTO');
  else if (ext === 'ttf') correct = bytes.subarray(0, 4).equals(Buffer.from([0, 1, 0, 0])) || ascii.startsWith('true');
  else if (ext === 'mp3') correct = ascii.startsWith('ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224);
  else {
    const source = textContent(bytes);
    if (/<\s*(?:!doctype\s+html|html\b|script\b)|^\s*#!/i.test(source)) fail('EXECUTABLE_CONTENT', 'HTML or executable content cannot be assembled as static art');
    if (ext === 'json') {
      try {JSON.parse(source);} catch {fail('INVALID_STATIC_DATA', 'Static JSON is not valid JSON');}
      if (/"type"\s*:\s*"Script"|"(?:javascript|scriptCode)"\s*:/i.test(source)) fail('EXECUTABLE_CONTENT', 'Provider script resource cannot be included in static JSON');
    } else if (ext === 'svg') {
      if (!/<svg[\s>]/i.test(source) || /<foreignObject\b|<!DOCTYPE|<!ENTITY|<\?xml-stylesheet\b|@import\b|\bon[a-z]+\s*=/i.test(source)) fail('EXECUTABLE_CONTENT', 'Unsupported active SVG content');
      for (const match of source.matchAll(/(?:href\s*=\s*["']|url\(\s*["']?)([^"')\s>]+)/gi)) if (!match[1].startsWith('#')) fail('EXECUTABLE_CONTENT', 'External references are not permitted in locked SVG images');
    } else if (/^\s*(?:import\s|export\s|(?:var|let|const)\s|\(?function\b|\(\(\)\s*=>)/.test(source)) fail('EXECUTABLE_CONTENT', 'Script text cannot be included as an atlas');
  }
  if (!correct) fail('MIME_MISMATCH', 'Static asset signature does not match its allowed type: ' + mime);
  return true;
}

function normalizedRoots(cacheRoots) {
  return Object.fromEntries(Object.keys(GROUP_INDEXES).map(group => {
    const value = cacheRoots?.[group] || DEFAULT_CACHE_ROOTS[group];
    const roots = Array.isArray(value) ? value : [value];
    if (!roots.length || roots.some(path => typeof path !== 'string' || !path)) fail('INVALID_CACHE_PATH', 'Explicit cache roots must be nonempty local paths');
    return [group, roots.map(path => resolve(path))];
  }));
}

export async function inspectAssetAvailability(inventory, {cacheRoots} = {}) {
  if (!record(inventory) || inventory.schemaVersion !== 1 || inventory.publicPrefix !== PUBLIC_PREFIX || !record(inventory.files)) fail('INVALID_INVENTORY', 'Invalid reference-art inventory');
  const roots = normalizedRoots(cacheRoots), locations = new Map(), missing = [], missingByGroup = {};
  for (const [path, entry] of Object.entries(inventory.files)) {
    if (!record(entry) || !Object.hasOwn(GROUP_INDEXES, entry.group) || path !== PUBLIC_PREFIX + '/' + entry.group + '/assets/' + entry.file) fail('INVALID_PUBLIC_PATH', 'Inventory contains a route outside the fixed reference-art prefix');
    if (safeFile(entry.file, entry) !== entry.mime) fail('MIME_MISMATCH', 'Inventory MIME type does not match its allowed file type');
    for (const directory of roots[entry.group] || []) {
      const candidate = join(directory, entry.file);
      try {
        const stat = await lstat(candidate);
        if (!stat.isFile() || stat.isSymbolicLink()) fail('INVALID_CACHE_FILE', 'Cached assets must be regular files, not links: ' + path);
        locations.set(path, candidate); break;
      } catch (error) {if (error.code !== 'ENOENT') throw error;}
    }
    if (!locations.has(path)) {missing.push(path); missingByGroup[entry.group] = (missingByGroup[entry.group] || 0) + 1;}
  }
  return {locations, missing, missingByGroup};
}
async function verifySourceDocuments(inventory, presentationRoot) {
  if (!presentationRoot) return;
  for (const [file, entry] of Object.entries(inventory.sourceDocuments)) {
    const current = await readSource(resolve(presentationRoot), file);
    if (current.sha256 !== entry.sha256 || current.bytes !== entry.bytes) fail('SOURCE_CHANGED', 'Presentation source changed after inventory generation: ' + file);
  }
}
async function atomicWrite(path, bytes) {
  await mkdir(dirname(path), {recursive: true});
  const temporary = join(dirname(path), '.' + basename(path) + '.' + randomUUID() + '.part');
  try {await writeFile(temporary, bytes, {flag: 'wx', mode: 0o644}); await rename(temporary, path);}
  finally {await rm(temporary, {force: true});}
}
function outsideSourceTree(output) {
  const rel = relative(REPOSITORY_ROOT, output);
  if (!rel || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel))) fail('OUTPUT_INSIDE_SOURCE', 'Binary asset output must stay outside the source repository');
}
async function newOutput(outputDir) {
  const output = outputDir ? resolve(outputDir) : join(tmpdir(), 'zplay-reference-static-' + randomUUID());
  outsideSourceTree(output);
  try {await lstat(output); fail('OUTPUT_EXISTS', 'Refusing to replace an existing output directory: ' + output);} catch (error) {if (error.code !== 'ENOENT') throw error;}
  await mkdir(dirname(output), {recursive: true});
  return {output, stage: await mkdtemp(join(dirname(output), '.zplay-reference-static-stage-'))};
}

/** Verify every runtime asset then create an atomic NEW LOCAL bundle. Duplicate
 * content across groups is hard-linked within the output, never to source files.
 * Passing presentationRoot also pins all source indexes/manifests throughout. */
export async function copyStaticAssets(inventory, {cacheRoots, outputDir, presentationRoot} = {}) {
  const start = performance.now();
  await verifySourceDocuments(inventory, presentationRoot);
  const available = await inspectAssetAvailability(inventory, {cacheRoots});
  if (available.missing.length) fail('MISSING_ASSETS', 'Reference-art cache is incomplete; no asset directory was assembled', {missingCount: available.missing.length, missingByGroup: available.missingByGroup, firstMissingPaths: available.missing.slice(0, 12)});
  const {output, stage} = await newOutput(outputDir);
  let complete = false, copyCount = 0, hardlinkCount = 0, writtenBytes = 0;
  const copied = new Map();
  try {
    for (const [path, entry] of Object.entries(inventory.files)) {
      const bytes = await readFile(available.locations.get(path));
      verifyStaticBytes(entry.file, entry, bytes);
      const destination = join(stage, 'static', path.slice(1));
      const existing = copied.get(entry.sha256);
      if (existing) {
        await mkdir(dirname(destination), {recursive: true});
        const temporary = destination + '.' + randomUUID() + '.part';
        try {await link(existing, temporary); await rename(temporary, destination); hardlinkCount++;}
        catch (error) {
          await rm(temporary, {force: true});
          if (!['EXDEV', 'ENOTSUP', 'EPERM'].includes(error.code)) throw error;
          await atomicWrite(destination, bytes); copyCount++; writtenBytes += bytes.length;
        }
      } else {await atomicWrite(destination, bytes); copied.set(entry.sha256, destination); copyCount++; writtenBytes += bytes.length;}
    }
    await verifySourceDocuments(inventory, presentationRoot);
    const inventoryBytes = encoded(inventory), inventoryHash = sha256(inventoryBytes);
    await atomicWrite(join(stage, 'asset-inventory.json'), inventoryBytes);
    const receipt = {
      schemaVersion: 1, createdAt: new Date().toISOString(), outputDirectory: output,
      staticDirectory: join(output, 'static'), inventoryPath: join(output, 'asset-inventory.json'),
      inventorySha256: inventoryHash, inventoryBytes: inventoryBytes.length,
      totals: inventory.totals, verifiedFiles: Object.keys(inventory.files).length,
      copiedContents: copyCount, hardlinkedPaths: hardlinkCount, writtenAssetBytes: writtenBytes,
      elapsedMilliseconds: Math.round(performance.now() - start), binaryVerified: true,
      networkRequests: 0, providerCodeIncluded: false, deploymentPerformed: false,
      replacesExistingAssetManifest: false, mergeStrategy: 'additive-preserve-existing',
      integrationRequirement: 'Merge these new routes with the preserved existing Cloudflare asset manifest. This directory must not replace the existing NATIVE_LIBRARY_ASSETS binding or remove its current routes.',
    };
    await atomicWrite(join(stage, 'build-receipt.json'), encoded(receipt));
    // The directory becomes visible at the requested location only when every
    // byte and source manifest has passed validation.
    try {await lstat(output); fail('OUTPUT_EXISTS', 'Output appeared during assembly; refusing to replace it');} catch (error) {if (error.code !== 'ENOENT') throw error;}
    await rename(stage, output); complete = true;
    return receipt;
  } finally {if (!complete) await rm(stage, {recursive: true, force: true});}
}

const HELP = `Usage: node presentation/build-static-assets.mjs [options]
  --inventory-only           Write metadata inventory without cached binaries
  --output-dir PATH          New external output directory (default: new /tmp path)
  --smartsoft-cache PATH      First11 exact byte cache
  --remaining-slots-cache PATH Vegas/Book/help exact byte cache
  --arcade-cache PATH         TowerX/TowerRush/CoinMiner exact byte cache
  --legends-cache PATH        Originals AND derived pose PNG cache

No network fetch, provider execution, asset upload, or deployment occurs.
Actual assembly fails if any declared file is missing or changed. Output assets
are under static/native-library/reference-art/r1/<group>/assets/<hash>.<ext>.
Future Cloudflare publication MUST preserve and add to the existing static asset
manifest. This tool does not replace that manifest or the existing asset binding.
`;
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {console.log(HELP); return;}
  const known = new Set(['--inventory-only', '--output-dir', ...Object.keys(GROUP_INDEXES).map(group => '--' + group + '-cache')]);
  const values = {}, flags = new Set();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]; if (!known.has(arg)) fail('INVALID_ARGUMENT', 'Unknown argument: ' + arg);
    if (arg === '--inventory-only') flags.add(arg);
    else {if (!args[i + 1] || args[i + 1].startsWith('--')) fail('INVALID_ARGUMENT', 'Missing argument value: ' + arg); values[arg] = args[++i];}
  }
  const inventory = await readInventory();
  if (flags.has('--inventory-only')) {
    const {output, stage} = await newOutput(values['--output-dir']);
    try {
      const bytes = encoded(inventory);
      await atomicWrite(join(stage, 'asset-inventory.json'), bytes);
      await rename(stage, output);
      console.log(JSON.stringify({inventoryPath: join(output, 'asset-inventory.json'), inventorySha256: sha256(bytes), inventoryBytes: bytes.length, totals: inventory.totals, binaryVerified: false, staticDirectory: null, networkRequests: 0, deploymentPerformed: false, mergeStrategy: inventory.mergeStrategy}, null, 2));
    } catch (error) {await rm(stage, {recursive: true, force: true}); throw error;}
    return;
  }
  const cacheRoots = Object.fromEntries(Object.keys(GROUP_INDEXES).map(group => [group, values['--' + group + '-cache'] || DEFAULT_CACHE_ROOTS[group]]));
  const receipt = await copyStaticAssets(inventory, {cacheRoots, outputDir: values['--output-dir'], presentationRoot: HERE});
  console.log(JSON.stringify(receipt, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {console.error(JSON.stringify({error: error.code || 'BUILD_FAILED', message: error.message, details: error.details || null}, null, 2)); process.exitCode = 1;});
}
