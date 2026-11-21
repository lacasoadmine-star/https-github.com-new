import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const gameRoot = new URL('../', import.meta.url);
const additiveRoot = new URL('../../../', import.meta.url);
const route = JSON.parse(await readFile(new URL('frontend-route.json', gameRoot), 'utf8'));
const registry = JSON.parse(await readFile(new URL('registry.json', additiveRoot), 'utf8'));
const origin = 'https://isolated-route.invalid';
const html = await readFile(new URL('index.html', gameRoot), 'utf8');
const mainSource = html.match(/<script\s+type="module"\s+src="([^"]+)"/)[1];
const cssSource = html.match(/<link\s+rel="stylesheet"\s+href="([^"]+)"/)[1];

test('authored Roll X document route matches its stable registry identity and stays disabled', () => {
  const row = registry.games.find(game => game.gameId === route.gameId);
  assert(row);
  assert.equal(route.route, row.route);
  assert.equal(route.route, '/new-games72/roll-x/');
  assert.equal(route.resources[route.route], 'index.html');
  assert.equal(route.enabled, false);
  assert.equal(route.deploymentStatus, 'NOT_DEPLOYED');
});

test('canonical player HTML resolves its real script and stylesheet through the authored mapping', async () => {
  for (const [source, expected] of [[mainSource, 'main.mjs'], [cssSource, 'style.css']]) {
    const resolved = new URL(source, origin + route.route);
    assert.equal(resolved.origin, origin);
    assert.equal(route.resources[resolved.pathname], expected,
      'The registry route must not depend on the QA-only directory depth.');
    assert((await readFile(new URL(expected, gameRoot))).length > 0);
  }
});

test('every runtime module import resolves to an existing mapped source from the canonical entry', async () => {
  const pending = [new URL(mainSource, origin + route.route).pathname], visited = new Set();
  while (pending.length) {
    const pathname = pending.pop();
    if (visited.has(pathname)) continue;
    visited.add(pathname);
    assert.equal(typeof route.resources[pathname], 'string', 'Unmapped module URL: ' + pathname);
    const file = new URL(route.resources[pathname], gameRoot);
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/^\s*import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gm)) {
      assert(match[1].startsWith('.'), 'This graph contains only explicit relative module imports.');
      const resolved = new URL(match[1], origin + pathname);
      assert.equal(resolved.origin, origin);
      assert.equal(typeof route.resources[resolved.pathname], 'string', 'Import would produce a 404: ' + resolved.pathname);
      pending.push(resolved.pathname);
    }
  }
  assert(visited.has(route.sharedModulePath));
  assert(visited.has(route.modulePrefix + 'session.mjs'));
});

test('mapping exposes only new runtime resources and does not alias a different player route or fixtures', async () => {
  assert.equal(route.resources[route.modulePrefix + 'index.html'], undefined);
  assert.equal(route.resources[route.route + 'fixture.html'], undefined);
  assert.equal(route.resources[route.modulePrefix + 'qa/browser-fixture.mjs'], undefined);
  assert.equal(route.resources['/shared/round-recovery.mjs'], undefined);
  const rootPath = fileURLToPath(additiveRoot);
  for (const [urlPath, relative] of Object.entries(route.resources)) {
    assert(urlPath.startsWith('/new-games72/'));
    const resolved = fileURLToPath(new URL(relative, gameRoot));
    assert(resolved.startsWith(rootPath + (rootPath.endsWith(path.sep) ? '' : path.sep)));
    assert(!relative.includes('evidence/') && !relative.includes('tests/') && !relative.includes('qa/'));
    assert((await readFile(resolved)).length > 0);
  }
});
