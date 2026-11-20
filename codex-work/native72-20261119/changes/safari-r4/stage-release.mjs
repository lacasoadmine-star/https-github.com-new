import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const stagePath = process.argv[2];
if (!stagePath) throw Error('Usage: node stage-release.mjs STAGE');
const stage = resolve(stagePath);
const reportFile = join(stage, 'package-report.json');
const report = JSON.parse(await readFile(reportFile, 'utf8'));
const name = 'safari';
if (report.packages.some(item => item.name === name)) throw Error('SAFARI_ALREADY_STAGED');
if (!report.packages.some(item => item.name === 'multihot40' && item.release === 'zplay-multihot40-20261120-r3')) {
  throw Error('SAFARI_REQUIRES_MULTIHOT40_PACKAGE');
}

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = await readFile(new URL('./release-manifest.json', import.meta.url));
const { release, gameId, accountPath, assets } = JSON.parse(manifest);
const manifestSha256 = digest(manifest);
const manifestKey = 'native72/manifests/' + manifestSha256;
const manifestFile = join(stage, name + '-manifest.json');
const directory = join(stage, name);
const ownedAssets = Object.entries(assets).filter(([, asset]) => asset.kvKey.startsWith('native72/' + release + '/'));
const uploads = await Promise.all(ownedAssets.map(async ([filename, asset]) => {
  const bytes = await readFile(new URL('../safari-r3/' + filename, import.meta.url));
  if (bytes.length !== asset.size || digest(bytes) !== asset.sha256) throw Error('SAFARI_ASSET_CHANGED:' + filename);
  return { bytes, file: join(directory, filename), key: asset.kvKey, size: asset.size, sha256: asset.sha256, type: asset.type };
}));

await mkdir(directory, { recursive: true });
for (const { bytes, ...upload } of uploads) {
  await writeFile(upload.file, bytes);
  report.uploads.push(upload);
}
await writeFile(manifestFile, manifest);
report.uploads.push({ key: manifestKey, size: manifest.length, sha256: manifestSha256,
  type: 'application/json; charset=utf-8', file: manifestFile });
report.packages.push({ name, release, gameId, accountPath, manifestKey, manifestSha256,
  manifestBytes: manifest.length, manifestFile, assets: Object.keys(assets).length,
  assetBytes: Object.values(assets).reduce((total, asset) => total + asset.size, 0) });
await writeFile(join(stage, 'kv-uploads.json'), JSON.stringify(report.uploads, null, 2) + '\n');
await writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
