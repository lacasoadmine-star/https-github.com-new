import test from 'node:test';
import assert from 'node:assert/strict';
import { readScopeInputs, validateActiveScope } from './check-active-scope.mjs';

const original = await readScopeInputs();
const fixture = () => ({ ...structuredClone(original), catalogBytes: original.catalogBytes, historicalBytes: original.historicalBytes });
const reject = (change, code) => {
  const input = fixture(); change(input);
  const result = validateActiveScope(input);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.code === code), JSON.stringify(result.issues));
  assert.equal(result.releaseAllowed, false);
};

test('the actual 74 minus three catalog yields 71 ordered additive identities and 568 owned tasks', () => {
  const result = validateActiveScope(original);
  assert.equal(result.valid, true, JSON.stringify(result.issues));
  assert.equal(result.targetGames, 71);
  assert.equal(result.preservedIdentities, 70);
  assert.equal(result.activeWorkItems, 568);
  assert.equal(result.releaseAllowed, false);
  assert.equal(result.productionRequests, 0);
});

test('a previous 72-game list or an old protected game cannot fill the active scope', () => {
  reject(x => x.registry.games.push(x.historical.games[0]), 'SCOPE_COUNT');
  reject(x => x.registry.games[0].officialName = 'Multi Hot 5', 'CATALOG_ORDER');
});

test('same names in a different displayed order fail even if the total stays 71', () => {
  reject(x => [x.registry.games[0], x.registry.games[1]] = [x.registry.games[1], x.registry.games[0]], 'CATALOG_ORDER');
});

test('duplicate aliases, routes and provider variants cannot count as another game', () => {
  reject(x => x.registry.games[1].gameId = x.registry.games[0].gameId, 'GAME_ID_UNIQUE');
  reject(x => x.registry.games[1].route = x.registry.games[0].route, 'ROUTE_UNIQUE');
  reject(x => x.registry.games[1].variant = x.registry.games[0].variant, 'PROVIDER_VARIANT_UNIQUE');
});

test('carried-forward identity paths cannot silently be replaced or point at the old live route', () => {
  reject(x => x.registry.games[0].backend.configurationPath += '.old', 'PRESERVED_IDENTITY');
  reject(x => x.registry.games[0].route = x.registry.games[0].currentPlayerRoute, 'ADDITIVE_ROUTE');
});

test('the unresolved classic JetX cannot use New Era as its verified variant', () => {
  reject(x => x.registry.games.find(g => g.officialName === 'JetX').variant = { key: 'JetX', category: 'JetXNew' }, 'UNRESOLVED_VARIANT');
});

test('source pins detect changed catalog or historical identities', () => {
  reject(x => x.catalogBytes = Buffer.from('changed catalog'), 'CATALOG_PIN');
  reject(x => x.historicalBytes = Buffer.from('changed historical identities'), 'HISTORICAL_PIN');
});

test('structural preparation never grants activation or a completed-game claim', () => {
  reject(x => x.registry.publicActivation = true, 'ACTIVATION_CLOSED');
  for (const field of ['implementationComplete', 'releaseReady', 'cashReleaseEnabled']) reject(x => x.registry.games[0][field] = true, 'GAME_CLOSED');
  reject(x => x.registry.games[0].backend.enabled = true, 'GAME_CLOSED');
});

test('a missing owner or removed work area cannot disappear behind a valid game count', () => {
  reject(x => x.workItems.items[0].owner = '', 'OWNED_WORK_ITEM');
  reject(x => x.workItems.items.pop(), 'WORK_COUNT');
  reject(x => x.workItems.cohortsAreSequentialGates = true, 'WORK_AREAS');
});
