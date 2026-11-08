#!/usr/bin/env node
// Offline export: verify original assets, rasterize SVG controls in a temporary
// derived cache, then run the shared Pillow display-list renderer. No browser.
import {readFile, writeFile, mkdtemp, symlink, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {sha256, fetchRemainingAssets} from '../../scripts/fetch-remaining-slot-assets.mjs';
import {validateStaticSvg} from './renderer.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), value = name => args[args.indexOf(name) + 1];
if (!args.includes('--cache-dir')) throw new Error('An external verified image cache is required');
const cache = resolve(value('--cache-dir')), width = args.includes('--width') ? Number(value('--width')) : 390;
if (!Number.isInteger(width) || width < 240 || width > 1280) throw new Error('Unsupported review width');
const lock = JSON.parse(await readFile(join(root, 'assets.lock.json'), 'utf8'));
await fetchRemainingAssets(lock, {cacheDir: cache, verifyOnly: true});
const temporary = await mkdtemp(join(tmpdir(), 'zplay-remaining-render-'));
const sharp = createRequire(import.meta.url)('sharp');
const derivatives = {};
try {
  for (const asset of lock.assets) {
    if (!asset.file.endsWith('.svg')) {await symlink(join(cache, asset.file), join(temporary, asset.file)); continue;}
    const bytes = await readFile(join(cache, asset.file)); validateStaticSvg(bytes);
    const png = await sharp(bytes, {density: 216}).png().toBuffer();
    const hash = sha256(png), file = hash + '.png';
    await writeFile(join(temporary, file), png);
    derivatives[asset.file] = {file, sha256: hash, bytes: png.length, method: 'sharp SVG rasterization for offline review only; source remains unchanged'};
  }
  const {stdout} = await promisify(execFile)('python', [join(root, 'render-review.py'), '--cache-dir', temporary, '--width', String(width), '--derivatives', JSON.stringify(derivatives)], {maxBuffer: 1024 * 1024});
  const outputs = JSON.parse(stdout);
  const evidence = {
    schemaVersion: 1, method: 'Offline authored display-list export using shared Pillow renderer and SVG rasterization',
    browserScreenshot: false, providerRuntimeExecuted: false, sourceImagesChanged: false,
    productionLaunchEnabled: false, svgDerivatives: derivatives, outputs,
  };
  await writeFile(join(root, 'evidence', 'render-method.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(outputs, null, 2));
} finally {await rm(temporary, {recursive: true, force: true});}
