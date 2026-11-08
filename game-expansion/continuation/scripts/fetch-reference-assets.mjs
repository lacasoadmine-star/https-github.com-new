#!/usr/bin/env node
// Public static artwork only. This module never loads or executes provider code.
import {createHash} from 'node:crypto';
import {readFile, writeFile, readdir, mkdir, rename, rm, stat} from 'node:fs/promises';
import {resolve, dirname, extname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const runFile = promisify(execFile);
export const MAX_TRANSFER_BYTES = 200_000_000;
export const MAX_ASSET_BYTES = 16_000_000;
export const DEFAULT_GAMES = ['multihot40_native', 'multihot100_native'];
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC_HOSTS = new Set(['static.ssg-public.com']);
const EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif', '.json', '.txt', '.mp3', '.ogg', '.wav', '.woff', '.woff2', '.ttf', '.otf']);
const HASH = /^[a-f0-9]{64}$/;

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function validateSourceURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !STATIC_HOSTS.has(url.hostname) || url.username || url.password || url.port || url.search || url.hash) {
    throw new Error('Only the inventoried public static HTTPS asset host is accepted');
  }
  const path = decodeURIComponent(url.pathname);
  if (!path.startsWith('/cache/') || path.split('/').some(part => part === '..' || part === '.')) throw new Error('Invalid static asset path');
  return url;
}

export function assetKind(urlString) {
  const path = decodeURIComponent(new URL(urlString).pathname);
  const ext = extname(path).toLowerCase();
  if (!EXTENSIONS.has(ext)) return null;
  if (ext === '.txt') return path.endsWith('.atlas.txt') ? 'spine-atlas' : null;
  if (ext === '.json') {
    if (/\/Spine\//.test(path)) return 'spine-skeleton';
    return /\/(?:Sprites|Sprite)\//.test(path) ? 'texture-atlas' : null;
  }
  if (['.mp3', '.ogg', '.wav'].includes(ext)) return 'audio';
  if (['.woff', '.woff2', '.ttf', '.otf'].includes(ext)) return 'font';
  return 'image';
}

export function assetFileName(asset) {
  if (!HASH.test(asset.sha256)) throw new Error('Invalid asset hash');
  const ext = extname(decodeURIComponent(new URL(asset.urls[0]).pathname)).toLowerCase();
  if (!EXTENSIONS.has(ext)) throw new Error('Unsupported asset extension');
  return asset.sha256 + ext;
}

export function buildAssetLock(inventories) {
  const byHash = new Map(), games = {};
  for (const inventory of [...inventories].sort((a, b) => String(a.machineId).localeCompare(String(b.machineId)))) {
    if (!inventory.machineId || !Array.isArray(inventory.presentationAssets)) continue;
    const id = inventory.machineId;
    const item = games[id] = {name: inventory.officialGameName, grid: inventory.grid, officialDemo: inventory.reference?.officialDemo, inventoryObservedAt: inventory.reference?.observedAt, sourceURLs:inventory.reference?.sourceURLs||[], presentation:inventory.presentation||{}, assets: [], excludedCodeAssets: 0};
    for (const entry of inventory.presentationAssets) {
      const kind = assetKind(entry.url);
      if (!kind) { item.excludedCodeAssets++; continue; }
      validateSourceURL(entry.url);
      if (!HASH.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > MAX_ASSET_BYTES) throw new Error('Invalid inventoried size/hash: ' + entry.url);
      let asset = byHash.get(entry.sha256);
      if (!asset) {
        asset = {sha256: entry.sha256, bytes: entry.bytes, mimeType: entry.type, kinds: [], games: [], urls: [],references:[]};
        byHash.set(entry.sha256, asset);
      }
      if (asset.bytes !== entry.bytes) throw new Error('Conflicting size for content hash');
      if (!asset.kinds.includes(kind)) asset.kinds.push(kind);
      if (!asset.games.includes(id)) asset.games.push(id);
      if (!asset.urls.includes(entry.url)) asset.urls.push(entry.url);
      let reference=asset.references.find(item=>item.url===entry.url);
      if(!reference){reference={url:entry.url,games:[]};asset.references.push(reference);}
      if(!reference.games.includes(id))reference.games.push(id);
      if (!item.assets.includes(entry.sha256)) item.assets.push(entry.sha256);
    }
  }
  const assets = [...byHash.values()].sort((a, b) => a.sha256.localeCompare(b.sha256));
  for (const asset of assets) {
    asset.urls.sort(); asset.games.sort(); asset.kinds.sort();
    asset.references.sort((a,b)=>a.url.localeCompare(b.url));for(const reference of asset.references)reference.games.sort();
    asset.file = assetFileName(asset);
  }
  return {schemaVersion: 1, source: 'references/public-models/*_native.json plus presentation/supplemental-inventories.json: presentationAssets', constraints: {publicStaticOnly: true, providerJavaScriptIncluded: false, productionLaunchEnabled: false, maximumTransferBytes: MAX_TRANSFER_BYTES}, uniqueBytes: assets.reduce((sum, item) => sum + item.bytes, 0), games, assets};
}

export function selectAssets(lock, gameIds) {
  if (!gameIds.length) throw new Error('Select at least one game');
  for (const id of gameIds) if (!lock.games[id]) throw new Error('No static inventory for ' + id);
  const wanted = new Set(gameIds);
  const selected = lock.assets.filter(asset => asset.games.some(id => wanted.has(id)));
  const bytes = selected.reduce((sum, asset) => sum + asset.bytes, 0);
  if (bytes > MAX_TRANSFER_BYTES) throw new Error('Selected artwork exceeds the 200 MB transfer budget');
  return selected;
}

export function verifyAssetBytes(asset, bytes) {
  if (bytes.byteLength !== asset.bytes) throw new Error('Size mismatch: ' + asset.file + ' expected ' + asset.bytes + ', received ' + bytes.byteLength);
  const actual = sha256(bytes);
  if (actual !== asset.sha256) throw new Error('SHA-256 mismatch: ' + asset.file);
  return true;
}

async function receiveFetch(url, limit, fetchImpl) {
  const response = await fetchImpl(url, {redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(35000)});
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const size = Number(response.headers.get('content-length') || 0);
  if (size > limit) throw new Error('Response exceeds inventoried size');
  const chunks = []; let total = 0;
  for await (const chunk of response.body) {
    total += chunk.byteLength;
    if (total > limit) throw new Error('Response exceeds inventoried size');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, total);
}

async function receiveCurl(url, limit) {
  const {stdout} = await runFile('curl', ['--silent', '--show-error', '--fail', '--proto', '=https', '--max-redirs', '0', '--connect-timeout', '15', '--max-time', '35', '--max-filesize', String(limit), url], {encoding: 'buffer', maxBuffer: limit + 1024});
  return stdout;
}

export async function fetchLockedAssets(lock, {gameIds = DEFAULT_GAMES, cacheDir, verifyOnly = false, concurrency = 4, transport = 'fetch', fetchImpl = globalThis.fetch, onProgress = () => {}} = {}) {
  if (!cacheDir) throw new Error('A cache directory is required');
  if (!['fetch', 'curl'].includes(transport)) throw new Error('Unsupported transport');
  const selected = selectAssets(lock, gameIds);
  const count = Math.max(1, Math.min(6, Math.trunc(concurrency) || 1));
  await mkdir(cacheDir, {recursive: true});
  let cursor = 0, transferredBytes = 0;
  const receipts = [], failures = [];
  async function worker() {
    for (;;) {
      const index = cursor++;
      if (index >= selected.length) return;
      const asset = selected[index], file = join(cacheDir, asset.file);
      try {
        let cached;
        try { cached = await readFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (cached) {
          try {
            verifyAssetBytes(asset, cached);
            receipts.push({sha256: asset.sha256, file: asset.file, bytes: cached.length, status: 'verified-cache'});
            onProgress({completed: receipts.length + failures.length, total: selected.length, status: 'verified-cache', file: asset.file});
            continue;
          } catch (error) { if (verifyOnly) throw error; }
        } else if (verifyOnly) throw new Error('Missing cached asset: ' + asset.file);
        let received, lastError;
        // An alias is an already inventoried URL for exactly the same hash, not a new source.
        for (const url of asset.urls.slice(0, 2)) {
          validateSourceURL(url);
          if (transferredBytes + asset.bytes > MAX_TRANSFER_BYTES) throw new Error('Transfer budget exhausted');
          transferredBytes += asset.bytes;
          try {
            received = transport === 'curl' ? await receiveCurl(url, asset.bytes) : await receiveFetch(url, asset.bytes, fetchImpl);
            verifyAssetBytes(asset, received);
            lastError = null; break;
          } catch (error) { lastError = error; }
        }
        if (lastError) throw lastError;
        const temporary = file + '.part-' + process.pid;
        try { await writeFile(temporary, received, {flag: 'w'}); await rename(temporary, file); }
        finally { await rm(temporary, {force: true}); }
        receipts.push({sha256: asset.sha256, file: asset.file, bytes: received.length, status: 'downloaded-and-verified'});
        onProgress({completed: receipts.length + failures.length, total: selected.length, status: 'downloaded-and-verified', file: asset.file});
      } catch (error) {
        failures.push({sha256: asset.sha256, file: asset.file, error: String(error.message)});
        onProgress({completed: receipts.length + failures.length, total: selected.length, status: 'failed', file: asset.file, error: String(error.message)});
      }
    }
  }
  await Promise.all(Array.from({length: count}, worker));
  receipts.sort((a, b) => a.file.localeCompare(b.file)); failures.sort((a, b) => a.file.localeCompare(b.file));
  return {schemaVersion: 1, verifiedAt: new Date().toISOString(), games: [...gameIds].sort(), selectedAssets: selected.length, verifiedAssets: receipts.length, verifiedBytes: receipts.reduce((sum, item) => sum + item.bytes, 0), transferredBytesUpperBound: transferredBytes, cacheDir: resolve(cacheDir), complete: failures.length === 0, receipts, failures};
}

async function main() {
  const args = process.argv.slice(2), option = name => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; };
  const inventoryDir = join(ROOT, 'references/public-models');
  const names = (await readdir(inventoryDir)).filter(name => name.endsWith('_native.json')).sort();
  const inventories = await Promise.all(names.map(async name => JSON.parse(await readFile(join(inventoryDir, name), 'utf8'))));
  try{const supplemental=JSON.parse(await readFile(join(ROOT,'presentation/supplemental-inventories.json'),'utf8'));inventories.push(...supplemental.inventories);}catch(error){if(error.code!=='ENOENT')throw error;}
  const lock = buildAssetLock(inventories), presentationDir = join(ROOT, 'presentation');
  await mkdir(presentationDir, {recursive: true});
  await writeFile(join(presentationDir, 'reference-assets.lock.json'), JSON.stringify(lock, null, 2) + '\n');
  const gameIds = args.includes('--all') ? Object.keys(lock.games) : option('--games')?.split(',') || DEFAULT_GAMES;
  const selected = selectAssets(lock, gameIds);
  console.log(JSON.stringify({event: 'plan', games: gameIds, assets: selected.length, bytes: selected.reduce((sum, item) => sum + item.bytes, 0), uniqueInventoryBytes: lock.uniqueBytes}));
  if (args.includes('--manifest-only')) return;
  const receipt = await fetchLockedAssets(lock, {gameIds, cacheDir: option('--cache-dir') || join(presentationDir, 'assets'), verifyOnly: args.includes('--verify-only'), concurrency: Number(option('--concurrency') || 4), transport: option('--transport') || 'fetch', onProgress: item => { if (item.status === 'failed' || item.completed % 10 === 0 || item.completed === item.total) console.log(JSON.stringify(item)); }});
  await mkdir(join(presentationDir, 'evidence'), {recursive: true});
  await writeFile(join(presentationDir, 'evidence/asset-verification.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({event: 'complete', complete: receipt.complete, verifiedAssets: receipt.verifiedAssets, verifiedBytes: receipt.verifiedBytes, failures: receipt.failures.length}));
  if (!receipt.complete) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
