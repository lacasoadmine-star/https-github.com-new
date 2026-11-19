#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReleasePin } from './handler.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const expected = Object.freeze({
  shared: { release: 'zplay-native-shared-20261119-r1' },
  habesha: { release: 'zplay-native-machines-20261119-habesha-r8', gameId: 'habesha_fortune_5_native' },
  deluxe: { release: 'zplay-native-machines-20261119-mh5deluxe-r2', gameId: 'multi_hot_5_deluxe_native' },
});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export async function buildReleaseModules(stageDirectory, outputDirectory = here) {
  const stage = resolve(stageDirectory), output = resolve(outputDirectory);
  const report = JSON.parse(await readFile(join(stage, 'package-report.json'), 'utf8'));
  const pins = {};
  for (const [name, identity] of Object.entries(expected)) {
    const bytes = await readFile(join(stage, `${name}-manifest.json`));
    const manifestSha256 = digest(bytes);
    const record = report.packages.find(item => item.name === name);
    if (!record || record.manifestSha256 !== manifestSha256 || record.manifestBytes !== bytes.length
      || record.manifestKey !== `native72/manifests/${manifestSha256}`
      || record.release !== identity.release || record.gameId !== identity.gameId) {
      throw new Error(`PACKAGE_REPORT_MISMATCH:${name}`);
    }
    const pin = {
      ...identity,
      manifestKey: record.manifestKey,
      manifestSha256,
      manifestSize: bytes.length,
      inlineManifest: bytes.toString('utf8'),
    };
    validateReleasePin(pin, { game: Boolean(identity.gameId) });
    pins[name] = pin;
  }
  const releasePins = {
    presencePath: '/player-v236/presence.63ed199a80b6c700.mjs',
    shared: pins.shared,
    games: [pins.habesha, pins.deluxe],
  };
  await mkdir(output, { recursive: true });
  for (const name of ['entry.mjs', 'handler.mjs']) {
    if (resolve(here, name) !== resolve(output, name)) await copyFile(join(here, name), join(output, name));
  }
  await writeFile(join(output, 'release-pins.mjs'),
    '// Generated from verified, exact package manifest bytes by build-pins.mjs.\n'
      + `export const releasePins = ${JSON.stringify(releasePins)};\n`);
  const modules = [];
  for (const name of ['entry.mjs', 'handler.mjs', 'release-pins.mjs']) {
    const bytes = await readFile(join(output, name));
    modules.push({ name: `native72dedicatedr1/${name}`, file: join(output, name),
      type: 'application/javascript+module', size: bytes.length, sha256: digest(bytes) });
  }
  const inventory = {
    baselineVersion: '11ec5499-9697-4063-bf3f-92252c32f89d',
    baselineEntry: 'native72habesha7/entry.mjs',
    mainModule: 'native72dedicatedr1/entry.mjs',
    preserveExistingModules: true,
    preserveExistingBindings: true,
    preserveExistingAssets: true,
    modules,
    manifests: Object.entries(pins).map(([name, pin]) => ({
      name, release: pin.release, gameId: pin.gameId,
      key: pin.manifestKey, size: pin.manifestSize, sha256: pin.manifestSha256,
    })),
  };
  await writeFile(join(output, 'module-inventory.json'), JSON.stringify(inventory, null, 2) + '\n');
  return inventory;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node build-pins.mjs STAGE_DIRECTORY [OUTPUT_DIRECTORY]');
  const result = await buildReleaseModules(process.argv[2], process.argv[3]);
  process.stdout.write(JSON.stringify({ mainModule: result.mainModule,
    modules: result.modules.map(({ name, size, sha256 }) => ({ name, size, sha256 })),
    manifests: result.manifests }, null, 2) + '\n');
}
