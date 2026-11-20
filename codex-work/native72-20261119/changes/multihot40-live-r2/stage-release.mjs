import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Append to a separate copy of the verified Habesha stage for sequential rollout.
const [stagePath, baselinePath] = process.argv.slice(2);
if (!stagePath || !baselinePath) throw Error('Usage: node stage-release.mjs STAGE BASELINE_HTML');
const stage = resolve(stagePath);
const report = JSON.parse(await readFile(join(stage, 'package-report.json'), 'utf8'));
const name = 'multihot40';
const release = 'zplay-multihot40-20261120-r3';
const gameId = 'multihot40_native';
const accountPath = '/games/' + gameId;
const existing = '/native-library/existing-new/20261110-etb1-40000-r1/multihot40/';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
if (report.packages.some(item => item.name === name)) throw Error('MULTIHOT40_ALREADY_STAGED');
const baseline = await readFile(baselinePath);
if (sha256(baseline) !== '73353929b9d17746bdf5a8198656af20e55f11345450ca68f486216b33a642b4') throw Error('MULTIHOT40_BASELINE_CHANGED');

function replaceOnce(source, needle, replacement) {
  if (source.split(needle).length !== 2) throw Error('MULTIHOT40_REFERENCE_CHANGED: ' + needle);
  return source.replace(needle, replacement);
}

let htmlTemplate = baseline.toString('utf8');
htmlTemplate = replaceOnce(htmlTemplate, '/zplay-fixes/mh40-20261117/multihot40-app.mjs', `/${release}/multihot40-app.mjs`);
htmlTemplate = replaceOnce(htmlTemplate, ' <script type="module" src="/player-v236/presence.63ed199a80b6c700.mjs?v=20261108-fetch1"></script>\n', '');
htmlTemplate = replaceOnce(htmlTemplate, '<main id="machine"', '<main id="machine" data-machine="{{GAME}}" data-game="{{PRESENTATION_GAME}}"');
htmlTemplate = replaceOnce(htmlTemplate, 'type="submit">START</button>', 'type="submit">START PLAY</button>');

const assets = {}, directory = join(stage, name);
await mkdir(directory, { recursive: true });
const uploads = [];
for (const filename of ['multihot40-app.mjs', 'multihot40-motion.mjs', 'multihot40-presentation.mjs']) {
  let source = await readFile(new URL(filename, import.meta.url), 'utf8');
  if (filename === 'multihot40-app.mjs') {
    source = replaceOnce(source, existing + 'multihot40-presentation.mjs?v=20261108-fetch1', './multihot40-presentation.mjs');
  }
  if (filename === 'multihot40-presentation.mjs') {
    source = replaceOnce(source, './presentation/multihot40-motion.mjs?v=20261108-fetch1', './multihot40-motion.mjs');
    source = source.replaceAll("from './presentation/", `from '${existing}presentation/`);
  }
  const bytes = Buffer.from(source), hash = sha256(bytes), file = join(directory, filename);
  const asset = { kvKey: `native72/${release}/${hash}`, size: bytes.length, sha256: hash, type: 'application/javascript; charset=utf-8' };
  assets[filename] = asset;
  uploads.push({ key: asset.kvKey, size: asset.size, sha256: hash, type: asset.type, file });
  await writeFile(file, bytes);
}

const manifestFile = join(stage, `${name}-manifest.json`);
const manifest = Buffer.from(JSON.stringify({ release, gameId, accountPath, htmlTemplate, assets }) + '\n');
const manifestSha256 = sha256(manifest), manifestKey = `native72/manifests/${manifestSha256}`;
uploads.push({ key: manifestKey, size: manifest.length, sha256: manifestSha256, type: 'application/json; charset=utf-8', file: manifestFile });
report.packages.push({ name, release, gameId, accountPath, manifestKey, manifestSha256, manifestBytes: manifest.length, manifestFile,
  assets: Object.keys(assets).length, assetBytes: Object.values(assets).reduce((total, asset) => total + asset.size, 0) });
report.uploads.push(...uploads);
await writeFile(manifestFile, manifest);
await writeFile(join(stage, 'package-report.json'), JSON.stringify(report, null, 2) + '\n');
await writeFile(join(stage, 'kv-uploads.json'), JSON.stringify(report.uploads, null, 2) + '\n');
