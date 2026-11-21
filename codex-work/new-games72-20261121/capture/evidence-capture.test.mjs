import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { CaptureError, EvidenceCaptureCoordinator, validateEvidence, validateIdentity } from './evidence-capture.mjs';
import { FileEvidenceStore } from './file-evidence-store.mjs';

// Unit fixtures only. These are never copied into reference evidence or production.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhXsAAAAASUVORK5CYII=', 'base64');
const WEBM_HEADER_FIXTURE = Buffer.from('1a45dfa3000000000000000000000000', 'hex');
const HASH = 'a'.repeat(64);
function identity(suffix = 'a') {
  return { gameId: `new72_${suffix}`, officialName: `Fixture ${suffix}`, providerGameName: `Fixture${suffix}`,
    officialPageUrl: `https://www.smartsoftgaming.com/games/fixture-${suffix}`,
    officialLaunchUrl: `https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameName=Fixture${suffix}&Token=DEMO&PortalName=DEMO`,
    referenceSha256: HASH };
}

async function fixture(t, identities = [identity()], options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'new72-reference-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = new FileEvidenceStore(root);
  const coordinator = new EvidenceCaptureCoordinator({ allowlist: identities, store, ...options });
  return { root, store, coordinator };
}

function driverFor(id, overrides = {}) {
  const calls = { start: 0, observe: 0, open: 0, controls: 0 };
  const driver = {
    gameId: id.gameId, providerGameName: id.providerGameName, inspectionSha256: HASH, calls,
    async open() {
      calls.open++;
      return { sessionId: 'session-' + id.gameId, targetId: 'page-' + id.gameId,
        viewport: { width: 390, height: 844, deviceScaleFactor: 1 }, orientation: 'portrait',
        gameVersion: null, gameVersionObservation: 'No version displayed in inspected fixture.',
        captureSupport: { screenshot: { supported: true, methodOrReason: 'Unit fixture screenshot' },
          video: { supported: true, methodOrReason: 'Unit fixture recording metadata' },
          audio: { supported: false, methodOrReason: 'Unit fixture has no audio capture support' } } };
    },
    async inspect() { return { gameId: id.gameId, providerGameName: id.providerGameName,
      screen: 'gameplay-ready', identityEvidence: 'Inspected fixture identity', controls: [{ id: 'start' }, { id: 'help' }] }; },
    async screenshot() { return { bytes: PNG, mediaType: 'image/png', provenance: 'Unit fixture' }; },
    async startRound() { calls.start++; },
    async observeRound({ action, session }) {
      calls.observe++;
      return { gameId: id.gameId, providerGameName: id.providerGameName, sessionId: session.sessionId,
        phase: 'complete', screen: 'gameplay-result', initiationMode: 'individual-input',
        actionId: action.actionId, inputAccepted: true, activePhaseObserved: true, completionObserved: true,
        completionEvidence: 'Inspected fixture active-to-result transition', observedRoundKey: `fixture-round-${calls.observe}`,
        roundKeySource: 'Fixture round counter', autoWasDisabled: true, holdWasNotUsed: true };
    },
    async captureControls() {
      calls.controls++;
      return ['start', 'help'].map(controlId => ({ controlId, actionObserved: true,
        responseObserved: true, observation: 'Fixture response observed',
        screenshots: [{ bytes: PNG, mediaType: 'image/png', provenance: 'Unit fixture' }] }));
    },
    async finishRecording({ completedActions }) { return [{ kind: 'video', mediaType: 'video/webm',
      bytes: WEBM_HEADER_FIXTURE, actionIds: completedActions.map(action => action.actionId),
      durationMs: 7000, provenance: 'Unit fixture, not an actual reference recording' }]; },
  };
  return Object.assign(driver, overrides);
}

test('seven separate inputs produce seven observations; identical outcome images are allowed', async t => {
  const id = identity();
  const { coordinator, store } = await fixture(t);
  const driver = driverFor(id);
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.status, 'REFERENCE_CAPTURED');
  assert.equal(driver.calls.start, 7);
  assert.equal(result.rounds.length, 7);
  assert.deepEqual(result.rounds.map(round => round.label), Array.from({ length: 7 }, (_, i) => `spin-0${i + 1}`));
  assert.equal(result.validation.soundParityVerified, false);
  assert.equal(result.validation.releaseReady, false);
  assert.equal(new Set(result.artifacts.filter(a => a.kind === 'screenshot').map(a => a.sha256)).size, 1);
  await store.verifyArtifacts(result);
  const again = await coordinator.run(id.gameId, driver);
  assert.equal(again.status, 'REFERENCE_CAPTURED');
  assert.equal(driver.calls.start, 7, 'completed reference is not recaptured');
});

for (const screen of ['lobby', 'loading', 'error', 'gameplay-ready']) {
  test(`${screen} cannot be counted as a completed round`, async t => {
    const id = identity(); const { coordinator } = await fixture(t);
    const driver = driverFor(id);
    const observe = driver.observeRound.bind(driver);
    driver.observeRound = async ctx => ({ ...await observe(ctx), screen });
    const result = await coordinator.run(id.gameId, driver);
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.blocker.code, 'ROUND_NOT_COMPLETE');
    assert.equal(result.rounds.length, 0);
    assert.equal(driver.calls.start, 1);
  });
}

test('loading page blocks before any round input', async t => {
  const id = identity(); const { coordinator } = await fixture(t);
  const driver = driverFor(id); const inspect = driver.inspect.bind(driver);
  driver.inspect = async ctx => ({ ...await inspect(ctx), screen: 'loading' });
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.blocker.code, 'DEMO_NOT_READY');
  assert.equal(driver.calls.start, 0);
});

test('AUTO or held rounds cannot fill the seven individually initiated observations', async t => {
  const id = identity(); const { coordinator } = await fixture(t);
  const driver = driverFor(id); const observe = driver.observeRound.bind(driver);
  driver.observeRound = async ctx => ({ ...await observe(ctx), initiationMode: 'auto' });
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.rounds.length, 0);
  assert.equal(result.blocker.code, 'ROUND_WAS_NOT_INDIVIDUALLY_INITIATED');
});

test('extra bonus/AUTO observations are recorded but do not replace manual observations', async t => {
  const id = identity(); const { coordinator } = await fixture(t);
  const driver = driverFor(id); const observe = driver.observeRound.bind(driver);
  driver.observeRound = async ctx => ({ ...await observe(ctx), extraRounds: [
    { initiationMode: 'bonus', observedRoundKey: 'bonus-' + ctx.action.actionId },
    { initiationMode: 'auto', observedRoundKey: 'auto-' + ctx.action.actionId },
  ] });
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.rounds.length, 7);
  assert.equal(result.extraRounds.length, 14);
  assert.equal(driver.calls.start, 7);
  assert.ok(result.extraRounds.every(round => round.countedTowardSeven === false));
});

test('a repeated provider/observed round ID cannot satisfy another round', async t => {
  const id = identity(); const { coordinator } = await fixture(t);
  const driver = driverFor(id); const observe = driver.observeRound.bind(driver);
  driver.observeRound = async ctx => ({ ...await observe(ctx), observedRoundKey: 'same-round' });
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.rounds.length, 1);
  assert.equal(result.blocker.code, 'DUPLICATE_ROUND_OBSERVATION');
});

test('lost start response keeps pending action and resumes observation without a second input', async t => {
  let now = Date.now();
  const id = identity(); const { coordinator, store } = await fixture(t, [id], { now: () => now });
  const driver = driverFor(id); const start = driver.startRound.bind(driver);
  let first = true;
  driver.startRound = async ctx => { await start(ctx); if (first) { first = false; throw new CaptureError('NETWORK_UNAVAILABLE'); } };
  let result = await coordinator.run(id.gameId, driver);
  const pendingId = result.pendingAction.actionId;
  assert.equal(driver.calls.start, 1);
  assert.equal((await store.load(id.gameId)).pendingAction.actionId, pendingId);
  now += 3000;
  const observe = driver.observeRound.bind(driver);
  driver.observeRound = async ctx => ({ ...await observe(ctx),
    recoveredAfterInputScreenshot: { bytes: PNG, mediaType: 'image/png', provenance: 'Saved fixture screenshot recovered by driver' } });
  result = await coordinator.run(id.gameId, driver);
  assert.equal(result.status, 'REFERENCE_CAPTURED');
  assert.equal(result.rounds[0].actionId, pendingId);
  assert.equal(driver.calls.start, 7, 'recovery adds only the six remaining independent inputs');
});

test('missing after-input evidence is not fabricated during recovery', async t => {
  let now = Date.now(); const id = identity();
  const { coordinator } = await fixture(t, [id], { now: () => now });
  const driver = driverFor(id); const start = driver.startRound.bind(driver);
  let first = true;
  driver.startRound = async ctx => { await start(ctx); if (first) { first = false; throw new CaptureError('NETWORK_UNAVAILABLE'); } };
  await coordinator.run(id.gameId, driver);
  now += 3000;
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.status, 'CAPTURE_INCOMPLETE');
  assert.ok(result.validation.errors.includes('SCREENSHOT_AFTERINPUT_MISSING'));
});

test('403 is durable and cannot trigger an automatic retry', async t => {
  const id = identity(); const { coordinator, store } = await fixture(t);
  const driver = driverFor(id, { async open() { this.calls.open++; throw new CaptureError('HTTP_ERROR', { status: 403 }); } });
  let result = await coordinator.run(id.gameId, driver);
  assert.equal(result.blocker.code, 'ACCESS_FORBIDDEN');
  result = await coordinator.run(id.gameId, driver);
  assert.equal(driver.calls.open, 1);
  assert.equal((await store.load(id.gameId)).status, 'BLOCKED');
});

test('429 honors Retry-After, persists progress, and limits repeated automatic resumes', async t => {
  let now = Date.now(); const id = identity();
  const { coordinator } = await fixture(t, [id], { now: () => now, maxAutomaticResumes: 2 });
  const driver = driverFor(id, { async open() { this.calls.open++;
    throw new CaptureError('HTTP_ERROR', { status: 429, retryAfterMs: 60000 }); } });
  let result = await coordinator.run(id.gameId, driver);
  assert.equal(result.blocker.retryAt, new Date(now + 60000).toISOString());
  await coordinator.run(id.gameId, driver);
  assert.equal(driver.calls.open, 1);
  for (let i = 0; i < 4; i++) { now += 60001; result = await coordinator.run(id.gameId, driver); }
  assert.equal(driver.calls.open, 3);
  assert.equal(result.status, 'BLOCKED');
});

test('one browser session cannot be reused for another game', async t => {
  const a = identity('a'), b = identity('b'); const { coordinator } = await fixture(t, [a, b]);
  const first = driverFor(a); await coordinator.run(a.gameId, first);
  const second = driverFor(b); const open = second.open.bind(second);
  second.open = async ctx => ({ ...await open(ctx), sessionId: 'session-' + a.gameId });
  const result = await coordinator.run(b.gameId, second);
  assert.equal(result.blocker.code, 'SESSION_ALREADY_USED_FOR_ANOTHER_GAME');
  assert.equal(second.calls.start, 0);
});

test('resume cannot replace the original session or viewport metadata silently', async t => {
  let now = Date.now(); const id = identity();
  const { coordinator } = await fixture(t, [id], { now: () => now });
  const driver = driverFor(id); const inspect = driver.inspect.bind(driver);
  driver.inspect = async () => { throw new CaptureError('DEMO_NOT_READY'); };
  await coordinator.run(id.gameId, driver); now += 3000;
  driver.inspect = inspect;
  const open = driver.open.bind(driver);
  driver.open = async ctx => ({ ...await open(ctx), sessionId: 'different-session' });
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.blocker.code, 'SESSION_CHANGED_REQUIRES_NEW_CAPTURE');
  assert.equal(driver.calls.start, 0);
});

test('bounded worker pool runs other games when one is blocked', async t => {
  const ids = [identity('a'), identity('b'), identity('c'), identity('d')];
  const { coordinator } = await fixture(t, ids, { maxConcurrent: 2 });
  let active = 0, peak = 0;
  const requests = ids.map((id, i) => {
    const driver = driverFor(id); const open = driver.open.bind(driver);
    driver.open = async ctx => { active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 5)); active--;
      if (i === 0) throw new CaptureError('HTTP_ERROR', { status: 403 });
      return open(ctx); };
    return { gameId: id.gameId, driver };
  });
  const results = await coordinator.runMany(requests);
  assert.equal(peak, 2);
  assert.equal(results[0].value.status, 'BLOCKED');
  assert.ok(results.slice(1).every(result => result.value.status === 'REFERENCE_CAPTURED'));
});

test('supported audio and motion must have actual indexed artifacts covering all seven inputs', async t => {
  const id = identity(); const { coordinator } = await fixture(t);
  const driver = driverFor(id); const open = driver.open.bind(driver);
  driver.open = async ctx => { const session = await open(ctx);
    session.captureSupport.audio = { supported: true, methodOrReason: 'Audio support claimed by fixture' }; return session; };
  driver.finishRecording = async () => [];
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.status, 'CAPTURE_INCOMPLETE');
  assert.ok(result.validation.errors.includes('MOTION_RECORDING_INCOMPLETE'));
  assert.ok(result.validation.errors.includes('SUPPORTED_AUDIO_NOT_RECORDED'));
  assert.equal(result.validation.audioCaptured, false);
});

test('tampered evidence files invalidate a previously completed capture', async t => {
  const id = identity(); const { coordinator, root } = await fixture(t);
  const driver = driverFor(id); const result = await coordinator.run(id.gameId, driver);
  await writeFile(path.join(root, result.artifacts[0].relativePath), Buffer.from('tampered'));
  const resumed = await coordinator.run(id.gameId, driver);
  assert.equal(resumed.status, 'BLOCKED');
  assert.equal(resumed.blocker.code, 'ARTIFACT_HASH_MISMATCH');
  assert.equal(driver.calls.start, 7);
});

test('unknown identities, production tokens, uninspected drivers and forged image payloads are rejected', async t => {
  const id = identity(); const { coordinator, store } = await fixture(t);
  await assert.rejects(coordinator.run('not-allowlisted', driverFor(id)), { code: 'GAME_NOT_ALLOWLISTED' });
  assert.throws(() => validateIdentity({ ...id, officialLaunchUrl: id.officialLaunchUrl.replace('Token=DEMO', 'Token=REAL') }),
    { code: 'NON_DEMO_LAUNCH_REJECTED' });
  await assert.rejects(coordinator.run(id.gameId, { ...driverFor(id), inspectionSha256: '' }), { code: 'INSPECTED_DRIVER_REQUIRED' });
  await assert.rejects(store.putArtifact(id.gameId, { kind: 'screenshot', mediaType: 'image/png', bytes: Buffer.from('<html>loading</html>') }, 'fake'),
    { code: 'INVALID_ARTIFACT_CONTENT' });
});

test('validator does not mistake seven click logs for seven completed observations', () => {
  const result = validateEvidence({ actions: Array.from({ length: 7 }, (_, index) => ({ actionId: String(index) })), rounds: [] });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('SEVEN_INDIVIDUAL_ROUNDS_REQUIRED'));
});

test('a lost control response is not replayed automatically', async t => {
  let now = Date.now(); const id = identity();
  const { coordinator } = await fixture(t, [id], { now: () => now });
  const driver = driverFor(id);
  driver.captureControls = async () => { driver.calls.controls++; throw new CaptureError('NETWORK_UNAVAILABLE'); };
  let result = await coordinator.run(id.gameId, driver);
  assert.equal(result.rounds.length, 7);
  assert.equal(result.pendingControlBatch, true);
  now += 3000;
  result = await coordinator.run(id.gameId, driver);
  assert.equal(result.blocker.code, 'CONTROL_RESPONSE_UNRESOLVED');
  assert.equal(driver.calls.controls, 1);
  assert.equal(driver.calls.start, 7);
});

test('recording recovery does not repeat controls or the seven inputs', async t => {
  let now = Date.now(); const id = identity();
  const { coordinator } = await fixture(t, [id], { now: () => now });
  const driver = driverFor(id); const finish = driver.finishRecording.bind(driver);
  let first = true;
  driver.finishRecording = async ctx => { if (first) { first = false; throw new CaptureError('NETWORK_UNAVAILABLE'); } return finish(ctx); };
  await coordinator.run(id.gameId, driver); now += 3000;
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.status, 'REFERENCE_CAPTURED');
  assert.equal(driver.calls.controls, 1);
  assert.equal(driver.calls.start, 7);
});

test('a callback that never resolves is bounded and receives an aborted signal', async t => {
  const id = identity(); const { coordinator } = await fixture(t, [id], { operationTimeoutMs: 15 });
  let signal;
  const driver = driverFor(id, { async open(ctx) { signal = ctx.signal; return new Promise(() => {}); } });
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.blocker.code, 'OPERATION_TIMEOUT');
  assert.equal(signal.aborted, true);
  assert.equal(driver.calls.start, 0);
});

test('separate coordinators cannot write or initiate the same game concurrently', async t => {
  const id = identity(); const { coordinator, store } = await fixture(t);
  const secondCoordinator = new EvidenceCaptureCoordinator({ allowlist: [id], store });
  let release, started;
  const gate = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { started = resolve; });
  const first = driverFor(id); const open = first.open.bind(first);
  first.open = async ctx => { started(); await gate; return open(ctx); };
  const running = coordinator.run(id.gameId, first);
  await entered;
  await assert.rejects(secondCoordinator.run(id.gameId, driverFor(id)), { code: 'CAPTURE_ALREADY_RUNNING' });
  release();
  const result = await running;
  assert.equal(result.status, 'REFERENCE_CAPTURED');
  assert.equal(first.calls.start, 7);
});

test('viewport changes require a new capture rather than mixing evidence', async t => {
  let now = Date.now(); const id = identity();
  const { coordinator } = await fixture(t, [id], { now: () => now });
  const driver = driverFor(id); const inspect = driver.inspect.bind(driver);
  driver.inspect = async () => { throw new CaptureError('DEMO_NOT_READY'); };
  await coordinator.run(id.gameId, driver); now += 3000; driver.inspect = inspect;
  const open = driver.open.bind(driver);
  driver.open = async ctx => ({ ...await open(ctx), viewport: { width: 430, height: 932, deviceScaleFactor: 1 } });
  const result = await coordinator.run(id.gameId, driver);
  assert.equal(result.blocker.code, 'VIEWPORT_CHANGED_REQUIRES_NEW_CAPTURE');
  assert.equal(driver.calls.start, 0);
});

test('duplicate launch parameters cannot hide a non-demo token', () => {
  const id = identity();
  assert.throws(() => validateIdentity({ ...id, officialLaunchUrl: id.officialLaunchUrl + '&Token=REAL' }),
    { code: 'DUPLICATE_LAUNCH_PARAMETER' });
});

test('review regression: a lost completed-observation response resumes the same round in recovery mode', async t => {
  let now = Date.now(); const id = identity();
  const { coordinator } = await fixture(t, [id], { now: () => now });
  const driver = driverFor(id), observe = driver.observeRound.bind(driver);
  let savedResult = null;
  driver.observeRound = async ctx => {
    if (!savedResult) { savedResult = await observe(ctx); throw new CaptureError('NETWORK_UNAVAILABLE'); }
    if (ctx.action.actionId === savedResult.actionId) {
      if (!ctx.recovery) throw new CaptureError('COMPLETED_ROUND_REQUIRES_RECOVERY');
      return savedResult;
    }
    return observe(ctx);
  };
  const failed = await coordinator.run(id.gameId, driver);
  assert.ok(failed.pendingAction.screenshots.afterInput, 'input acknowledgement was already captured');
  assert.equal(failed.rounds.length, 0); assert.equal(driver.calls.start, 1);
  now += 3000;
  const resumed = await coordinator.run(id.gameId, driver);
  assert.equal(resumed.status, 'REFERENCE_CAPTURED');
  assert.equal(resumed.rounds[0].observedRoundKey, savedResult.observedRoundKey);
  assert.equal(resumed.rounds[0].actionId, failed.pendingAction.actionId);
  assert.equal(driver.calls.start, 7, 'the completed first action is never clicked again');
});

for (const mutation of ['missing-pending', 'attempted-flag-cleared', 'pending-identity-changed']) test(
  `review regression: corrupt ${mutation} checkpoint preserves input intent without another click`, async t => {
    let now = Date.now(); const id = identity();
    const { coordinator, store, root } = await fixture(t, [id], { now: () => now });
    const driver = driverFor(id), start = driver.startRound.bind(driver);
    driver.startRound = async ctx => { await start(ctx); throw new CaptureError('NETWORK_UNAVAILABLE'); };
    const failed = await coordinator.run(id.gameId, driver);
    if (mutation === 'missing-pending') failed.pendingAction = null;
    else if (mutation === 'attempted-flag-cleared') failed.pendingAction.initiationAttempted = false;
    else failed.pendingAction.actionId = 'different-action';
    await store.save(id.gameId, failed);
    const checkpoint = path.join(root, id.gameId, 'capture.json');
    const before = await readFile(checkpoint, 'utf8'); now += 3000;
    await assert.rejects(coordinator.run(id.gameId, driver), { code: 'INVALID_CAPTURE_CHECKPOINT' });
    assert.equal(driver.calls.start, 1); assert.equal(await readFile(checkpoint, 'utf8'), before);
  });

test('review regression: completed evidence rejects orphan attempted action logs', async t => {
  const id = identity(); const { coordinator } = await fixture(t);
  const completed = await coordinator.run(id.gameId, driverFor(id));
  completed.actions.push({ ...completed.actions[0], actionId: 'orphan-attempt', label: 'spin-08' });
  const result = validateEvidence(completed);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('INVALID_CAPTURE_CHECKPOINT'));
});

test('review regression: lock release failure does not retain an in-process running slot', async t => {
  const id = identity(); const { coordinator, store } = await fixture(t);
  const acquire = store.acquireGame.bind(store); let first = true;
  store.acquireGame = async gameId => {
    const release = await acquire(gameId);
    return async () => { await release(); if (first) { first = false; throw new CaptureError('RELEASE_IO_FAILURE'); } };
  };
  const driver = driverFor(id);
  await assert.rejects(coordinator.run(id.gameId, driver), { code: 'RELEASE_IO_FAILURE' });
  assert.equal(coordinator.running.size, 0);
  const resumed = await coordinator.run(id.gameId, driver);
  assert.equal(resumed.status, 'REFERENCE_CAPTURED'); assert.equal(driver.calls.start, 7);
});

test('review regression: invalid extra-round metadata cannot half-commit the pending manual round', async t => {
  const id = identity(); const { coordinator } = await fixture(t);
  const driver = driverFor(id), observe = driver.observeRound.bind(driver);
  let malformed = true;
  driver.observeRound = async ctx => ({ ...await observe(ctx), observedRoundKey: 'round-' + ctx.action.actionId,
    extraRounds: malformed ? [{ initiationMode: 'unconfirmed-origin' }] : [] });
  const failed = await coordinator.run(id.gameId, driver);
  assert.equal(failed.blocker.code, 'EXTRA_ROUND_ORIGIN_REQUIRED');
  assert.equal(failed.rounds.length, 0); assert.equal(driver.calls.start, 1);
  malformed = false;
  const resumed = await coordinator.run(id.gameId, driver, { recheckBlocked: true });
  assert.equal(resumed.status, 'REFERENCE_CAPTURED'); assert.equal(driver.calls.start, 7);
});

test('review regression: a malformed control batch cannot persist partial controls or double-count extra rounds', async t => {
  const id = identity(); const { coordinator } = await fixture(t);
  const driver = driverFor(id), controls = driver.captureControls.bind(driver);
  let actualControls;
  driver.captureControls = async ctx => {
    actualControls = await controls(ctx);
    actualControls[0].extraRounds = [{ initiationMode: 'auto', observedRoundKey: 'one-control-auto-round' }];
    const malformed = structuredClone(actualControls);
    malformed[1].extraRounds = [{ initiationMode: 'unconfirmed-origin' }];
    return malformed;
  };
  driver.recoverControls = async () => actualControls;
  const failed = await coordinator.run(id.gameId, driver);
  assert.equal(failed.blocker.code, 'EXTRA_ROUND_ORIGIN_REQUIRED');
  assert.equal(failed.controls.length, 0); assert.equal(failed.extraRounds.length, 0);
  const resumed = await coordinator.run(id.gameId, driver, { recheckBlocked: true });
  assert.equal(resumed.status, 'REFERENCE_CAPTURED');
  assert.equal(resumed.controls.length, 2); assert.equal(resumed.extraRounds.length, 1);
  assert.equal(driver.calls.controls, 1); assert.equal(driver.calls.start, 7);
});
