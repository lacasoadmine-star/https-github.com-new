import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import vm from 'node:vm';
import {assets} from './worker-assets.mjs';
import {installPlayerPresentation} from './worker-wrapper.mjs';

const context = vm.createContext({});
const entry = new vm.SourceTextModule(await readFile(new URL('./entry.mjs', import.meta.url), 'utf8'), {context});
await entry.link(async specifier => {
  if (specifier.endsWith('/worker-wrapper.mjs')) {
    return new vm.SyntheticModule(['installPlayerPresentation'], function () {
      this.setExport('installPlayerPresentation', installPlayerPresentation);
    }, {context});
  }
  const value = specifier.endsWith('.txt')
    ? await readFile(new URL(specifier, import.meta.url), 'utf8')
    : {fetch() { throw Error('Unexpected route'); }};
  return new vm.SyntheticModule(['default'], function () { this.setExport('default', value); }, {context});
});
await entry.evaluate();

for (const [path, asset] of Object.entries(assets)) {
  test(path + ' returns its pinned release on missing, damaged or unavailable KV', async () => {
    const expected = await readFile(new URL('./assets/' + path.split('/').pop(), import.meta.url));
    for (const get of [() => null, () => new Uint8Array(asset.bytes), () => { throw Error('KV unavailable'); }]) {
      const env = {PORTAL: 'player', SSG_OFFICIAL_REFERENCES: {get}};
      for (const method of ['GET', 'HEAD']) {
        const result = await entry.namespace.default.fetch(new Request('https://player.test' + path, {method}), env, {});
        assert.equal(result.status, 200);
        assert.deepEqual(Buffer.from(await result.arrayBuffer()), method === 'GET' ? expected : Buffer.alloc(0));
      }
    }
  });
}
