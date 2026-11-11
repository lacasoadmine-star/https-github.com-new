// Link separately verified, private retained files for offline tests only.
// No file contents are copied, downloaded or deployed.
import { lstat, readlink, realpath, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
const moduleDirectory = process.env.PLAYER_RETAINED_MODULES_DIR;
const assetDirectory = process.env.PLAYER_RETAINED_ASSETS_DIR;
if (!moduleDirectory || !assetDirectory) throw Error('Explicit PLAYER_RETAINED_MODULES_DIR and PLAYER_RETAINED_ASSETS_DIR are required');
const root = new URL('./', import.meta.url);
async function link(target, relativePath) {
  target = await realpath(target);
  const local = new URL(relativePath, root);
  try {
    const info = await lstat(local);
    if (!info.isSymbolicLink() || await realpath(local) !== target) throw Error('Refusing to replace an existing local file: ' + relativePath);
    return;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await symlink(target, local);
}
for (const name of ['independent74-assets-r17.mjs', 'independent74-catalog-r17.mjs', 'independent74-gateway-r17.mjs']) {
  await link(resolve(moduleDirectory, name), 'modules/' + name);
}
for (const name of ['independent74-assets-r17.mjs', 'independent74-gateway-r17.mjs']) {
  await link(resolve(moduleDirectory, name), 'compact/modules/' + name);
}
await link(assetDirectory, 'private-retained-assets');
console.log('Private retained inputs linked locally; no contents published.');
