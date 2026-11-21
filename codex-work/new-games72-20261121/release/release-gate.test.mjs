import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validateRegistry, reviewRelease, createNewGameGate, hashObject, releaseSubject,
  requiredReportChecks, fileArtifactReader } from './release-gate.mjs';

// Synthetic completeness fixtures, created in memory only. None are official
// captures, licensed runtime media, actual peer-review work or game tests.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const date = '2026-11-21T12:00:00.000Z';
const png = label => Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(16), Buffer.from(label)]);
const video = label => Buffer.concat([Buffer.from('1a45dfa3', 'hex'), Buffer.from('synthetic-header-only-' + label)]);

function fixture() {
  const files = new Map();
  const artifact = (filename, data, mediaType = 'application/json') => {
    const bytes = Buffer.isBuffer(data) ? data : Buffer.from(mediaType === 'application/json' ? JSON.stringify(data) : data);
    files.set(filename, bytes);
    return { path: filename, sha256: hash(bytes), byteLength: bytes.length, mediaType };
  };
  const edit = (descriptor, update) => {
    const value = JSON.parse(files.get(descriptor.path)); update(value);
    return artifact(descriptor.path, value);
  };
  const baseline = { gameIds: ['legacy_one', 'legacy_two'], routes: ['/', '/games/legacy-one', '/legacy-two'],
    assetPrefixes: ['/legacy-assets/v1'] };
  const registry = { schema: 'zplay/new-games72-registry/v1', releaseId: 'new-games72-fixture-r1',
    games: Array.from({ length: 72 }, (_, index) => {
      const ordinal = index + 1, id = 'new72_fixture_' + ordinal, root = 'fixtures/' + id;
      return { ordinal, gameId: id, officialName: 'Fixture Game ' + ordinal, provider: 'Fixture Provider',
        variant: { key: 'Fixture' + ordinal, category: 'Slots' }, route: '/new72/fixture-' + ordinal + '/',
        modulePath: root + '/frontend.mjs',
        backend: { configurationPath: root + '/server/config.json', evaluatorPath: root + '/server/evaluator.mjs',
          enabled: false, rulesVersion: 'fixture-rules-1', engineVersion: 'fixture-engine-1' },
        assets: { prefix: '/new72-assets/' + id + '/', manifestPath: root + '/assets/manifest.json', rightsStatus: 'VERIFIED' },
        evidence: { referenceManifestPath: 'evidence/' + id + '/capture.json', rulesSpecPath: root + '/rules.json' },
        status: 'RELEASE_READY', owners: { implementation: 'fixture-author' } };
    }) };
  const manifest = { schema: 'zplay/new-games72-release-evidence/v1', releaseId: registry.releaseId,
    sourceCommit: 'a'.repeat(40), frontendVersion: 'fixture-front-1', backendVersion: 'fixture-server-1',
    registrySha256: hashObject(registry), baselineSha256: hashObject(baseline), games: [] };
  for (const game of registry.games) {
    const root = 'fixtures/' + game.gameId, captureArtifacts = [];
    const capturedAsset = (label, kind, role, actionIds = [], controlId = null) => {
      const extension = kind === 'video' ? 'webm' : 'png', mediaType = kind === 'video' ? 'video/webm' : 'image/png';
      const relativePath = game.gameId + '/artifacts/' + label + '.' + extension;
      const descriptor = artifact('evidence/' + relativePath, kind === 'video' ? video(label) : png(label), mediaType);
      const item = { artifactId: label, kind, captureRole: role, actionIds, controlId,
        relativePath, sha256: descriptor.sha256, byteLength: descriptor.byteLength, mediaType,
        durationMs: kind === 'video' ? 10000 : null, capturedAt: date, provenance: 'synthetic-test-only' };
      captureArtifacts.push(item); return item.artifactId;
    };
    const actions = [], rounds = [];
    for (let index = 0; index < 7; index++) {
      const actionId = game.gameId + '-action-' + index, label = 'spin-' + String(index + 1).padStart(2, '0');
      actions.push({ actionId, label, initiationAttempted: true, inputAttemptedAt: date });
      const screenshots = Object.fromEntries(['before', 'afterInput', 'result'].map(role =>
        [role, capturedAsset(label + '-' + role, 'screenshot', role, [actionId])]));
      rounds.push({ actionId, label, observedRoundKey: game.gameId + '-round-' + index,
        gameId: game.gameId, providerGameName: game.variant.key, sessionId: game.gameId + '-session',
        initiationMode: 'individual-input', phase: 'complete', screen: 'gameplay-result', inputAccepted: true,
        activePhaseObserved: true, completionObserved: true, autoWasDisabled: true, holdWasNotUsed: true,
        completionEvidence: 'fixture observation', roundKeySource: 'fixture journal', observedAt: date, screenshots });
    }
    capturedAsset('recording', 'video', null, actions.map(action => action.actionId));
    const controlImage = capturedAsset('control-spin', 'screenshot', 'control', [], 'SPIN');
    const capture = { schemaVersion: 1, gameId: game.gameId, officialName: game.officialName,
      providerGameName: game.variant.key, officialPageUrl: 'https://official.test/games/' + game.gameId,
      officialLaunchUrl: 'https://demo.official.test/GameLauncher/Loader.aspx?GameName=' + game.variant.key + '&Token=DEMO&PortalName=DEMO',
      startedAt: date, completedAt: date, status: 'REFERENCE_CAPTURED', pendingAction: null, blocker: null,
      session: { sessionId: game.gameId + '-session', viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
        orientation: 'portrait', captureSupport: { audio: { supported: false, methodOrReason: 'synthetic fixture' } } },
      actions, rounds, artifacts: captureArtifacts, inspectedControls: [{ id: 'SPIN' }],
      controls: [{ controlId: 'SPIN', actionObserved: true, responseObserved: true, observation: 'fixture action response',
        screenshotArtifactIds: [controlImage] }] };
    const runtimeAsset = artifact(root + '/assets/symbol.png', png(game.gameId), 'image/png');
    const ruleSource = artifact(root + '/evidence/official-rules.txt', 'Synthetic official-source-shaped fixture: exact payout rule.', 'text/plain');
    const entry = { gameId: game.gameId, sourceAuthors: ['fixture-author'], referenceArtifactRoot: 'evidence',
      references: artifact(game.evidence.referenceManifestPath, capture),
      pins: {
        frontend: artifact(game.modulePath, 'export const synthetic = true;', 'application/javascript'),
        backendConfiguration: artifact(game.backend.configurationPath, { gameId: game.gameId, enabled: false }),
        evaluator: artifact(game.backend.evaluatorPath, 'export const syntheticEvaluator = true;', 'application/javascript'),
        rules: artifact(game.evidence.rulesSpecPath, { schema: 'zplay/new72-rules/v1', gameId: game.gameId,
          rulesVersion: game.backend.rulesVersion, engineVersion: game.backend.engineVersion,
          sources: [{ url: 'https://official.test/games/' + game.gameId, capturedAt: date, artifact: ruleSource }],
          criticalRules: [{ id: 'payout', statement: 'synthetic fixture rule', sourceSha256: ruleSource.sha256 }],
          unverifiedCriticalRules: [], controls: ['SPIN'] }),
        assets: artifact(game.assets.manifestPath, { schema: 'zplay/new72-assets/v1', gameId: game.gameId,
          files: [{ ...runtimeAsset, publicPath: game.assets.prefix + 'symbol.png', kind: 'symbol' }] }),
      }, reports: {} };
    const subject = hashObject(releaseSubject(registry, manifest, game, entry));
    const bound = schema => ({ schema, gameId: game.gameId, subjectSha256: subject });
    const reviewer = { reviewerId: 'fixture-independent-reviewer', reviewedAt: date, conclusion: 'APPROVED' };
    const producer = (role, inputSha256) => artifact(root + '/evidence/' + role + '-producer.json', {
      schema: 'zplay/new72-review-provenance/v1', producerId: reviewer.reviewerId,
      role, subjectSha256: subject, taskId: 'fixture-peer-' + role, process: 'Synthetic structural fixture only.',
      recordedAt: date, inputSha256: [...new Set(inputSha256)],
    });
    const mathChecks = ['integer-money', 'payout-calculation', 'probability-model', 'version-pinning', 'maximum-win'].map(id => ({
      id, result: 'PASS', evidence: artifact(root + '/evidence/math-' + id + '.json',
        { subjectSha256: subject, checkId: id, result: 'PASS', observations: 'Synthetic arithmetic evidence for structural validation only.' }),
    }));
    entry.mathAudit = artifact(root + '/evidence/math-audit.json', { ...bound('zplay/new72-math-audit/v1'), ...reviewer,
      providerRngReproduced: false, providerCertified: false, method: 'synthetic-independent-fixture', findings: [], checks: mathChecks,
      producerEvidence: producer('math', [entry.pins.evaluator.sha256, entry.pins.rules.sha256, ...mathChecks.map(item => item.evidence.sha256)]) });
    for (const [kind, ids] of Object.entries(requiredReportChecks)) {
      const checks = ids.map(id => ({ id, result: 'PASS', evidence: artifact(root + '/evidence/' + kind + '-' + id + '.json',
        { subjectSha256: subject, testId: id, result: 'PASS', assertions: [{ description: 'Synthetic assertion of ' + id, passed: true }] }) }));
      entry.reports[kind] = artifact(root + '/evidence/' + kind + '.json', { ...bound('zplay/new72-test-report/v1'), kind,
        environment: { production: false, database: 'disposable-isolated', description: 'Synthetic structural fixture, no actual DB.' },
        command: 'synthetic-test-only', checks, summary: { passed: checks.length, failed: 0, skipped: 0, cancelled: 0 },
        ...(kind === 'mobile' ? { viewports: [{ width: 390, height: 844 }, { width: 1440, height: 900 }] } : {}) });
    }
    const referenceImage = captureArtifacts.find(item => item.artifactId === controlImage);
    entry.comparison = artifact(root + '/evidence/comparison.json', { ...bound('zplay/new72-comparison/v1'),
      referenceSha256: entry.references.sha256, frontendSha256: entry.pins.frontend.sha256,
      actions: [{ controlId: 'SPIN', result: 'PASS', observation: 'Synthetic comparison only.',
        referenceEvidence: { path: 'evidence/' + referenceImage.relativePath, sha256: referenceImage.sha256,
          byteLength: referenceImage.byteLength, mediaType: referenceImage.mediaType },
        implementationEvidence: artifact(root + '/evidence/implementation.png', png('synthetic-runtime'), 'image/png') }] });
    entry.defects = artifact(root + '/evidence/defects.json', { ...bound('zplay/new72-defects/v1'), items: [] });
    const grant = artifact(root + '/evidence/rights-grant.txt', 'SYNTHETIC TEST DOCUMENT. No actual licensing assertion.', 'text/plain');
    entry.rightsReview = artifact(root + '/evidence/rights.json', { ...bound('zplay/new72-rights-review/v1'), ...reviewer,
      assets: [{ sha256: runtimeAsset.sha256, basis: 'owned-original', grantEvidence: grant }],
      producerEvidence: producer('rights', [entry.pins.assets.sha256, grant.sha256]) });
    entry.releaseReview = artifact(root + '/evidence/review.json', { ...bound('zplay/new72-independent-release-review/v1'), ...reviewer,
      mathAuditSha256: entry.mathAudit.sha256, rightsReviewSha256: entry.rightsReview.sha256,
      comparisonSha256: entry.comparison.sha256, defectsSha256: entry.defects.sha256,
      reportSha256: Object.fromEntries(Object.entries(entry.reports).map(([kind, descriptor]) => [kind, descriptor.sha256])),
      producerEvidence: producer('release', [entry.mathAudit.sha256, entry.rightsReview.sha256, entry.comparison.sha256,
        entry.defects.sha256, ...Object.values(entry.reports).map(descriptor => descriptor.sha256)]) });
    manifest.games.push(entry);
  }
  const policy = { officialHosts: ['official.test', 'demo.official.test'], referenceNotBefore: '2026-11-21T00:00:00.000Z',
    reviewProducers: { math: ['fixture-independent-reviewer'], rights: ['fixture-independent-reviewer'], release: ['fixture-independent-reviewer'] } };
  const readArtifact = async filename => {
    if (!files.has(filename)) throw Error('missing synthetic file');
    return files.get(filename);
  };
  const review = () => reviewRelease({ registry, baseline, attestationManifest: manifest, readArtifact, policy });
  const rebindRegistry = () => { manifest.registrySha256 = hashObject(registry); manifest.baselineSha256 = hashObject(baseline); };
  const activation = () => ({ registry, baseline, sourceCommit: manifest.sourceCommit,
    frontendVersion: manifest.frontendVersion, backendVersion: manifest.backendVersion });
  return { files, artifact, edit, registry, baseline, manifest, policy, readArtifact, review, rebindRegistry, activation };
}
const has = (result, code) => result.issues.some(issue => issue.code === code);

test('complete synthetic evidence passes structural review but starts with all new gates closed', async () => {
  const f = fixture(), result = await f.review();
  assert.deepEqual(result.issues, []); assert.equal(result.allowed, true); assert.equal(result.verifiedGameCount, 72);
  const gate = createNewGameGate({ registry: f.registry, baseline: f.baseline, review: result });
  assert.equal(gate.snapshot().enabledGameIds.length, 0);
  assert.equal(gate.activate(f.activation()).enabledGameIds.length, 72);
});

test('71 or 73 entries cannot inflate or truncate the exact 72 new-game requirement', () => {
  for (const count of [71, 73]) {
    const f = fixture(); f.registry.games = count === 71 ? f.registry.games.slice(0, 71) : [...f.registry.games, f.registry.games[0]];
    assert.ok(has(validateRegistry(f.registry, f.baseline), 'EXACTLY_72_NEW_GAMES_REQUIRED'));
  }
});

test('aliases cannot fill the count using punctuation, category, route or asset variations', () => {
  const f = fixture(), first = f.registry.games[0], second = f.registry.games[1];
  second.officialName = 'FIXTURE-GAME-1'; second.variant = { ...first.variant, category: 'DifferentAliasCategory' };
  second.route = first.route.slice(0, -1); second.assets.prefix = first.assets.prefix;
  const result = validateRegistry(f.registry, f.baseline);
  for (const code of ['DUPLICATE_NAME', 'DUPLICATE_VARIANT', 'DUPLICATE_ROUTE', 'DUPLICATE_ASSET']) assert.ok(has(result, code));
});

test('legacy game ID, deep link and assets cannot be claimed by the new release', () => {
  for (const [kind, expected] of [['id', 'LEGACY_GAME_ID_COLLISION'], ['route', 'LEGACY_ROUTE_COLLISION'], ['asset', 'LEGACY_ASSET_COLLISION']]) {
    const f = fixture(), game = f.registry.games[0];
    if (kind === 'id') game.gameId = 'legacy_one';
    if (kind === 'route') game.route = '/games/legacy-one/extra/';
    if (kind === 'asset') game.assets.prefix = '/legacy-assets/';
    assert.ok(has(validateRegistry(f.registry, f.baseline), expected));
  }
});

test('a root namespace and overlapping new routes fail closed', () => {
  const f = fixture(); f.registry.games[0].assets.prefix = '/';
  assert.ok(has(validateRegistry(f.registry, f.baseline), 'NEW_GAME_ROOT_NAMESPACE_FORBIDDEN'));
  f.registry.games[0].assets.prefix = '/fresh-one'; f.registry.games[1].route = f.registry.games[0].route + 'nested/';
  assert.ok(has(validateRegistry(f.registry, f.baseline), 'OVERLAPPING_NEW_GAME_ROUTES'));
});

test('separate evaluator and configuration identities are required for every game', () => {
  const f = fixture(), a = f.registry.games[0], b = f.registry.games[1];
  b.backend = { ...a.backend }; b.modulePath = a.modulePath;
  const result = validateRegistry(f.registry, f.baseline);
  for (const code of ['DUPLICATE_EVALUATOR', 'DUPLICATE_CONFIGURATION', 'DUPLICATE_MODULE']) assert.ok(has(result, code));
});

test('RELEASE_READY labels alone cannot produce an activation proof', async () => {
  const f = fixture();
  const result = await reviewRelease({ registry: f.registry, baseline: f.baseline });
  assert.equal(result.allowed, false);
  assert.throws(() => createNewGameGate({ registry: f.registry, baseline: f.baseline, review: { ...result, allowed: true } }),
    { code: 'VERIFIED_RELEASE_REVIEW_REQUIRED' });
});

test('one unfinished game prevents the whole release even when 71 pass', async () => {
  const f = fixture(); f.registry.games[0].status = 'FIXED_PENDING_RETEST'; f.rebindRegistry();
  const result = await f.review(); assert.equal(result.allowed, false); assert.equal(result.verifiedGameCount, 71);
  assert.ok(has(result, 'GAME_NOT_RELEASE_READY'));
});

test('partial evidence manifest cannot activate any game', async () => {
  const f = fixture(); f.manifest.games.pop(); const result = await f.review();
  assert.equal(result.allowed, false); assert.ok(has(result, 'COMPLETE_72_GAME_EVIDENCE_REQUIRED'));
});

test('missing source hash and modified pinned bytes are rejected', async () => {
  for (const mutation of ['missing', 'modified']) {
    const f = fixture(), descriptor = f.manifest.games[0].pins.frontend;
    if (mutation === 'missing') delete descriptor.sha256;
    else f.files.set(descriptor.path, Buffer.from('changed code'));
    const result = await f.review();
    assert.equal(result.allowed, false);
    assert.ok(has(result, mutation === 'missing' ? 'INVALID_ARTIFACT_DESCRIPTOR' : 'ARTIFACT_HASH_OR_SIZE_MISMATCH'));
  }
});

test('registry and source commit evidence cannot silently change after review inputs were pinned', async () => {
  const f = fixture(); f.registry.games[0].backend.engineVersion = 'changed-engine';
  assert.ok(has(await f.review(), 'RELEASE_INPUT_BINDING_MISMATCH'));
  f.rebindRegistry(); f.manifest.sourceCommit = 'b'.repeat(40);
  assert.equal((await f.review()).allowed, false);
});

test('seven labels with six observations or duplicated action IDs cannot pass reference review', async () => {
  for (const mode of ['six', 'duplicate']) {
    const f = fixture(), entry = f.manifest.games[0];
    entry.references = f.edit(entry.references, capture => {
      if (mode === 'six') capture.rounds.pop(); else capture.rounds[6].actionId = capture.rounds[0].actionId;
    });
    assert.ok(has(await f.review(), 'SEVEN_DISTINCT_INITIATED_COMPLETED_ROUNDS_REQUIRED'));
  }
});

test('completed capture labels do not replace the actual recording and control artifacts', async () => {
  for (const mode of ['video', 'control']) {
    const f = fixture(), entry = f.manifest.games[0];
    entry.references = f.edit(entry.references, capture => {
      if (mode === 'video') capture.artifacts = capture.artifacts.filter(artifact => artifact.kind !== 'video');
      else capture.controls = [];
    });
    assert.ok(has(await f.review(), mode === 'video' ? 'ROUND_VIDEO_EVIDENCE_REQUIRED' : 'CONTROL_ACTION_EVIDENCE_REQUIRED'));
  }
});

test('old capture dates and absent screenshot bytes are rejected', async () => {
  for (const mode of ['date', 'missing']) {
    const f = fixture(), entry = f.manifest.games[0];
    if (mode === 'date') entry.references = f.edit(entry.references, capture => { capture.startedAt = '2026-10-01T00:00:00Z'; });
    else {
      const capture = JSON.parse(f.files.get(entry.references.path));
      f.files.delete(entry.referenceArtifactRoot + '/' + capture.artifacts[0].relativePath);
    }
    assert.ok(has(await f.review(), mode === 'date' ? 'FRESH_REFERENCE_DATE_REQUIRED' : 'EVIDENCE_UNREADABLE'));
  }
});

test('unverified payout rules cannot be masked by passing test reports', async () => {
  const f = fixture(), entry = f.manifest.games[0];
  entry.pins.rules = f.edit(entry.pins.rules, rules => { rules.unverifiedCriticalRules = ['payout']; });
  assert.ok(has(await f.review(), 'VERIFIED_CRITICAL_RULES_REQUIRED'));
});

test('a passing report for a different source hash does not count', async () => {
  const f = fixture(), entry = f.manifest.games[0];
  entry.reports.recovery = f.edit(entry.reports.recovery, report => { report.subjectSha256 = '0'.repeat(64); });
  assert.ok(has(await f.review(), 'EVIDENCE_SOURCE_BINDING_MISMATCH'));
});

test('test execution evidence must match the subject and requested check', async () => {
  const f = fixture(), entry = f.manifest.games[0];
  entry.reports.ledger = f.edit(entry.reports.ledger, report => {
    report.checks[0].evidence = f.edit(report.checks[0].evidence, evidence => { evidence.testId = 'unrelated-check'; });
  });
  assert.ok(has(await f.review(), 'TEST_EXECUTION_EVIDENCE_MISMATCH'));
});

test('a failing or skipped test and production-ledger testing do not satisfy readiness', async () => {
  for (const mode of ['failed', 'skipped', 'production']) {
    const f = fixture(), entry = f.manifest.games[0];
    entry.reports.ledger = f.edit(entry.reports.ledger, report => {
      if (mode === 'failed') report.summary.failed = 1;
      if (mode === 'skipped') report.summary.skipped = 1;
      if (mode === 'production') report.environment.production = true;
    });
    assert.ok(has(await f.review(), 'REQUIRED_TEST_REPORT_INCOMPLETE'));
  }
});

test('FIXED_PENDING_RETEST remains an open defect', async () => {
  const f = fixture(), entry = f.manifest.games[0];
  entry.defects = f.edit(entry.defects, report => {
    report.items = [{ id: 'fixture-bug', status: 'FIXED_PENDING_RETEST', retestCheck: 'recovery:refresh' }];
  });
  assert.ok(has(await f.review(), 'OPEN_OR_UNRETESTED_DEFECT'));
});

test('VERIFIED asset rights label needs full hash-matched grant evidence', async () => {
  const f = fixture(), entry = f.manifest.games[0];
  const rights = JSON.parse(f.files.get(entry.rightsReview.path));
  f.files.delete(rights.assets[0].grantEvidence.path);
  assert.ok(has(await f.review(), 'EVIDENCE_UNREADABLE'));
});

test('math peer review needs a separate task and hash-bound producer record, not a boolean', async () => {
  for (const mode of ['self', 'boolean']) {
    const f = fixture();
    if (mode === 'self') f.manifest.games[0].sourceAuthors.push('fixture-independent-reviewer');
    else f.manifest.games[0].mathAudit = f.edit(f.manifest.games[0].mathAudit, report => { report.producerEvidence = true; });
    assert.ok(has(await f.review(), mode === 'self' ? 'INDEPENDENT_REVIEW_REQUIRED' : 'JSON_EVIDENCE_REQUIRED'));
  }
});

test('a copied allowed decision is not an issued in-process review proof', async () => {
  const f = fixture(), result = await f.review();
  assert.throws(() => createNewGameGate({ registry: f.registry, baseline: f.baseline, review: structuredClone(result) }),
    { code: 'VERIFIED_RELEASE_REVIEW_REQUIRED' });
});

test('activation rejects drift and only opens the verified complete set', async () => {
  const f = fixture(), result = await f.review(), gate = createNewGameGate({ registry: f.registry, baseline: f.baseline, review: result });
  assert.throws(() => gate.activate({ ...f.activation(), backendVersion: 'other-runtime' }), { code: 'ACTIVATION_INPUTS_CHANGED' });
  assert.equal(gate.snapshot().enabledGameIds.length, 0);
  gate.activate(f.activation()); assert.equal(gate.snapshot().enabledGameIds.length, 72);
  assert.throws(() => gate.activate(f.activation()), { code: 'RELEASE_ALREADY_ACTIVATED' });
});

test('disabling new wagers leaves legacy handling and accepted-round recovery intact', async () => {
  const f = fixture(), result = await f.review(), gate = createNewGameGate({ registry: f.registry, baseline: f.baseline, review: result });
  gate.activate(f.activation()); const gameId = f.registry.games[0].gameId;
  const accepted = new Map([['accepted-request', { roundId: 'accepted-round', bet: '1.00', finalWin: '2.00' }]]);
  const persisted = JSON.stringify([...accepted]);
  const recover = key => accepted.get(key); // Existing authenticated backend owns this lookup in production.
  gate.disableNewRounds({ gameIds: [gameId], reason: 'observed new-game defect' });
  assert.equal(gate.allowsNewRound(gameId), false); assert.equal(gate.recoveryRouteAvailable(gameId), true);
  assert.equal(gate.allowsNewRound('legacy_one'), null); assert.equal(gate.recoveryRouteAvailable('legacy_one'), null);
  assert.equal(recover('accepted-request').roundId, 'accepted-round'); assert.equal(JSON.stringify([...accepted]), persisted);
  assert.throws(() => gate.disableNewRounds({ gameIds: ['legacy_one'], reason: 'bad rollback scope' }), { code: 'ROLLBACK_SCOPE_MUST_BE_NEW_GAMES_ONLY' });
  gate.disableNewRounds({ reason: 'withdraw new release' }); assert.equal(gate.snapshot().enabledGameIds.length, 0);
  assert.equal(gate.recoveryRouteAvailable(gameId), true);
});

test('withdrawing an unactivated release prevents accidental later activation', async () => {
  const f = fixture(), result = await f.review(), gate = createNewGameGate({ registry: f.registry, baseline: f.baseline, review: result });
  gate.disableNewRounds({ reason: 'new evidence requires another review' });
  assert.throws(() => gate.activate(f.activation()), { code: 'RELEASE_REVIEW_WITHDRAWN' });
});

test('artifact traversal is rejected before filesystem access', async () => {
  await assert.rejects(fileArtifactReader('/nonexistent-fixture-root')('../credentials'), { code: 'INVALID_ARTIFACT_PATH' });
});
