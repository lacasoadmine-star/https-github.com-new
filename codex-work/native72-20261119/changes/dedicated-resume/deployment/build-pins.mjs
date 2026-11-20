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
  multihot40: { release: 'zplay-multihot40-20261120-r3', gameId: 'multihot40_native', accountPath: '/games/multihot40_native' },
  safari: { release: 'zplay-safari-20261120-r4', gameId: 'fresh_safarisimba', accountPath: '/new74/037-safari-simba' },
});
const safariManifest = new URL('../../safari-r4/release-manifest.json', import.meta.url);
const catalogIds = { multihot40: 'ind74_official_multihot40', safari: 'ind74_official_safarisimba' };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const catalogUrl = new URL('./verified-target-catalog.json', import.meta.url);
const canonical = path => path?.endsWith('/') ? path.slice(0, -1) : path;
async function loadCatalog() {
  const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));
  if (catalog.targets !== 72 || catalog.games?.length !== 72) throw Error('INVALID_TARGET_CATALOG');
  const byRoute = new Map(), identities = new Set();
  for (const game of catalog.games) {
    if (!game.catalogId || identities.has(game.catalogId)) throw Error('DUPLICATE_CATALOG_ID');
    identities.add(game.catalogId);
    if (game.accountPath) {
      const path = canonical(game.accountPath);
      if (byRoute.has(path)) throw Error('DUPLICATE_CATALOG_ROUTE');
      byRoute.set(path, game);
    }
  }
  return byRoute;
}


export async function buildReleaseModules(stageDirectory, outputDirectory = here) {
  const stage = resolve(stageDirectory), output = resolve(outputDirectory);
  const report = JSON.parse(await readFile(join(stage, 'package-report.json'), 'utf8'));
  const pins = {}, catalog = await loadCatalog();
  if (!Array.isArray(report.packages) || new Set(report.packages.map(item => item.name)).size !== report.packages.length
    || !report.packages.some(item => item.name === 'shared') || report.packages.length < 2) {
    throw Error('INVALID_PACKAGE_SELECTION');
  }
  const defined = Object.entries(expected).filter(([name]) => report.packages.some(item => item.name === name))
    .map(([name, identity]) => {
      const record = report.packages.find(item => item.name === name);
      if (Object.hasOwn(catalogIds, name)) {
        const game = catalog.get(identity.accountPath);
        if (record.release !== identity.release || game?.catalogId !== catalogIds[name]) {
          throw Error('INVALID_CATALOG_PACKAGE:' + name);
        }
        return [name, identity];
      }
      const family = name === 'shared' ? 'shared' : 'machines';
      const suffix = name === 'shared' ? '' : name === 'habesha' ? 'habesha-' : 'mh5deluxe-';
      if (!new RegExp('^zplay-native-' + family + '-\\d{8}-' + suffix + 'r\\d+$').test(record.release)) {
        throw Error('INVALID_PACKAGE_RELEASE:' + name);
      }
      return [name, { ...identity, release: record.release }];
    });
  const additional = report.packages.filter(item => !Object.hasOwn(expected, item.name));
  if (defined.length + additional.length - 1 > 72) throw Error('TOO_MANY_GAME_RELEASES');
  for (const candidate of additional) {
    if (typeof candidate.name !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(candidate.name)
      || typeof candidate.release !== 'string' || typeof candidate.gameId !== 'string'
      || typeof candidate.accountPath !== 'string') throw Error('INVALID_ADDITIONAL_PACKAGE');
    const catalogGame = catalog.get(canonical(candidate.accountPath));
    if (!catalogGame || !catalogGame.reference.demo || !candidate.qaEvidence
      || candidate.qaEvidence.referenceCompared !== true
      || candidate.qaEvidence.gameplayTested !== true
      || candidate.qaEvidence.settlementContractTested !== true) {
      throw Error('UNVERIFIED_GAME_PACKAGE:' + candidate.name);
    }
    if (Object.values(expected).some(item => item.gameId === candidate.gameId)) {
      throw Error('DUPLICATE_GAME_PACKAGE');
    }
    defined.push([candidate.name, { release: candidate.release,
      gameId: candidate.gameId, accountPath: canonical(candidate.accountPath) }]);
  }
  for (const [name, identity] of defined) {
    const bytes = await readFile(join(stage, `${name}-manifest.json`));
    if (name === 'safari' && !bytes.equals(await readFile(safariManifest))) throw Error('SAFARI_MANIFEST_CHANGED');
    const manifestSha256 = digest(bytes);
    const record = report.packages.find(item => item.name === name);
    if (!record || record.manifestSha256 !== manifestSha256 || record.manifestBytes !== bytes.length
      || record.manifestKey !== `native72/manifests/${manifestSha256}`
      || record.release !== identity.release || record.gameId !== identity.gameId
      || (identity.accountPath && canonical(record.accountPath) !== identity.accountPath)) {
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
  if (pins.multihot40 && !pins.habesha) throw Error('MULTIHOT40_REQUIRES_HABESHA_PACKAGE');
  if (pins.safari && !pins.multihot40) throw Error('SAFARI_REQUIRES_MULTIHOT40_PACKAGE');
  if (pins.safari && output === here) throw Error('SAFARI_REQUIRES_SEPARATE_OUTPUT');
  const releasePins = {
    presencePath: '/player-v236/presence.63ed199a80b6c700.mjs',
    shared: pins.shared,
    games: pins.safari ? [pins.safari] : defined.filter(([name]) => name !== 'shared').map(([name]) => pins[name]),
  };
  const namespace = pins.safari ? 'native72dedicatedsafarir4'
    : pins.multihot40 ? 'native72dedicatedmh40r3' : 'native72dedicatedr1';
  const requiredLiveRelease = pins.safari ? pins.multihot40.release : pins.multihot40 && pins.habesha.release;
  const baselineEntry = pins.safari ? 'native72dedicatedmh40r3/entry.mjs' : 'native72habesha7/entry.mjs';
  await mkdir(output, { recursive: true });
  for (const name of ['entry.mjs', 'handler.mjs']) {
    if (resolve(here, name) !== resolve(output, name)) await copyFile(join(here, name), join(output, name));
  }
  if (pins.safari) {
    const entry = await readFile(join(here, 'entry.mjs'), 'utf8');
    await writeFile(join(output, 'entry.mjs'), entry.replaceAll('native72habesha7/entry.mjs', baselineEntry));
  }
  await writeFile(join(output, 'release-pins.mjs'),
    '// Generated from verified, exact package manifest bytes by build-pins.mjs.\n'
      + `export const releasePins = ${JSON.stringify(releasePins)};\n`);
  const modules = [];
  for (const name of ['entry.mjs', 'handler.mjs', 'release-pins.mjs']) {
    const bytes = await readFile(join(output, name));
    modules.push({ name: `${namespace}/${name}`, file: join(output, name),
      type: 'application/javascript+module', size: bytes.length, sha256: digest(bytes) });
  }
  const inventory = {
    ...(!pins.safari ? { baselineVersion: '11ec5499-9697-4063-bf3f-92252c32f89d' } : {}),
    baselineEntry,
    mainModule: `${namespace}/entry.mjs`,
    ...(requiredLiveRelease ? { requiresLiveGameRelease: requiredLiveRelease } : {}),
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
