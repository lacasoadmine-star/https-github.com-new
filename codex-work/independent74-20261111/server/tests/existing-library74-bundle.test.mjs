import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildExistingLibrary74 } from '../build-existing-library74.mjs';
import { createRegistry } from './support/retained-library/library-service.mjs';
import { createRetainedLibrary74Fixture } from './support/retained-library-fixture.mjs';

test('the backend artifact loads from a data URL and uses injected native auth and existing ledger', async () => {
  const outdir = await mkdtemp(join(tmpdir(), 'library74-bundle-review-'));
  let fixture;
  try {
    const { artifactPath, manifest } = await buildExistingLibrary74({ outdir });
    assert.equal(manifest.containsFinancialServiceImplementation, false);
    assert.equal(manifest.createsDatabase, false); assert.equal(manifest.deploysAnything, false);
    assert.equal(manifest.independentModelCount, 72); assert.equal(manifest.defaultNewRoundsEnabled, false);
    assert.deepEqual(manifest.stakeRange, { currency: 'ETB', minimum: '1.00', maximum: '4000.00', minMinor: '100', maxMinor: '400000' });
    assert.deepEqual(manifest.runtimeImports, ['node:crypto']);
    const code = await readFile(artifactPath);
    assert.equal(createHash('sha256').update(code).digest('hex'), manifest.sha256);
    const bundle = await import('data:text/javascript;base64,' + code.toString('base64'));
    fixture = await createRetainedLibrary74Fixture({ isolated: true });
    // No fixture round has been accepted. Install the built module into this
    // existing retained instance, rather than creating another wallet/service.
    fixture.service.registry = createRegistry([]);
    const ids = bundle.publicLibrary74Definitions().map(game => game.id);
    let enabled = false;
    const facade = bundle.installExistingLibrary74({ service: fixture.service, reviewedGameIds: ids, allowNewRounds: () => enabled });
    assert.equal(facade.service, fixture.service); assert.equal(facade.service.shared, fixture.shared);
    const secret = 'isolated-bundle-fixture-secret-never-production-' + '0'.repeat(16);
    const subject = '@session:' + 'a'.repeat(64);
    const app = bundle.installExistingLibrary74Http({ fetch: () => new Response(null, { status: 204 }) }, {
      service: fixture.service, facade, verifyNative: fixture.verifyNative, readNativeBody: fixture.readNativeBody,
      engineSecret: secret, resolveSessionUser: async (shared, value) => {
        assert.equal(shared, fixture.shared); assert.equal(value, subject); return fixture.fixtureUserId;
      },
    });
    const signed = (path, body, user = subject) => {
      const method = body === undefined ? 'GET' : 'POST', raw = body === undefined ? '' : JSON.stringify(body);
      const time = String(Date.now()), digest = createHash('sha256').update(raw).digest('hex');
      const signature = createHmac('sha256', secret).update([method, path, time, user, digest].join('\n')).digest('hex');
      return new Request('http://isolated.fixture' + path, { method, ...(body === undefined ? {} : { body: raw }), headers: { 'content-type': 'application/json', 'x-native-user': user, 'x-native-time': time, 'x-native-signature': signature } });
    };
    const health = await (await app.fetch(new Request('http://isolated.fixture/v2/independent74/health'))).json();
    assert.equal(health.ready, true); assert.equal(health.accepting, false); assert.equal(health.games.length, 72);
    assert.ok(health.games.every(game => game.minStake === '1.00' && game.maxStake === '4000.00'));
    const game = facade.definitions().find(game => game.family === 'slots');
    assert.equal((await app.fetch(new Request('http://isolated.fixture/v2/independent74/state?game_id=' + game.id))).status, 401);
    assert.equal((await app.fetch(signed('/v2/independent74/state?game_id=' + game.id, undefined, '@system'))).status, 401);
    enabled = true;
    const request = { request_id: randomUUID(), type: 'start', game_id: game.id, model_version: game.version, stake: '1.00', options: {} };
    const accepted = await app.fetch(signed('/v2/independent74/action', request));
    assert.equal(accepted.status, 200);
    const result = await accepted.json();
    assert.equal(result.authenticated, true); assert.equal(result.currency, 'ETB'); assert.equal(result.round.status, 'settled');
    assert.equal(result.user_id, undefined); assert.equal(result.round.revealed_seed, undefined);
    const replay = await (await app.fetch(signed('/v2/independent74/action', request))).json();
    assert.equal(replay.replayed, true); assert.equal(replay.round.round_id, result.round.round_id);
    const excessive = await app.fetch(signed('/v2/independent74/action', { ...request, request_id: randomUUID(), stake: '4000.01' }));
    assert.equal(excessive.status, 422); assert.equal((await excessive.json()).error.code, 'INVALID_BET');
    assert.equal((await fixture.sql.unsafe("SELECT id FROM sw_rebuild.transfers WHERE actor=$1 AND kind='casino_bet'", [fixture.fixtureUserId])).length, 1);
    assert.equal((await app.fetch(new Request('http://isolated.fixture/retained-route'))).status, 204);
  } finally {
    if (fixture) await fixture.close();
    await rm(outdir, { recursive: true, force: true });
  }
});
