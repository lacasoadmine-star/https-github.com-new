// Reference evidence only: no game rules, wallet, selectors, coordinates, or browser launch.
import { createHash, randomUUID } from 'node:crypto';

const ID = /^[a-z0-9][a-z0-9_-]{0,127}$/i;
const SHA = /^[a-f0-9]{64}$/i;
const clone = value => structuredClone(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const iso = now => new Date(now()).toISOString();
const REQUIRED_ROUNDS = 7;

export class CaptureError extends Error {
  constructor(code, { status = 0, retryAfterMs = null, detail = '' } = {}) {
    super(code);
    this.name = 'CaptureError';
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    // detail is intentionally not serialized: external errors can contain credentials.
    this.detail = detail;
  }
}

function requireThat(condition, code) {
  if (!condition) throw new CaptureError(code);
}

function publicOfficialUrl(value, { launch = false } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new CaptureError('INVALID_OFFICIAL_URL'); }
  requireThat(url.protocol === 'https:' && !url.username && !url.password && !url.hash,
    'INVALID_OFFICIAL_URL');
  const hosts = launch ? ['eu-server.ssgportal.com'] : ['www.smartsoftgaming.com', 'smartsoftgaming.com'];
  requireThat(hosts.includes(url.hostname) && !url.port, 'UNAPPROVED_OFFICIAL_HOST');
  if (launch) {
    requireThat(url.pathname === '/GameLauncher/Loader.aspx', 'UNAPPROVED_LAUNCH_PATH');
    requireThat(['DEMO', 'DEMO_EXH'].includes(url.searchParams.get('Token')) &&
      /^demo$/i.test(url.searchParams.get('PortalName') ?? ''), 'NON_DEMO_LAUNCH_REJECTED');
    requireThat([...url.searchParams.keys()].every(key =>
      ['GameCategory', 'GameName', 'Token', 'PortalName', 'ReturnUrl', 'Lang'].includes(key)),
    'UNEXPECTED_LAUNCH_PARAMETER');
    requireThat(new Set(url.searchParams.keys()).size === [...url.searchParams.keys()].length,
      'DUPLICATE_LAUNCH_PARAMETER');
    if (url.searchParams.has('ReturnUrl')) {
      const back = new URL(url.searchParams.get('ReturnUrl'));
      requireThat(back.protocol === 'https:' && ['www.smartsoftgaming.com', 'smartsoftgaming.com'].includes(back.hostname) &&
        !back.username && !back.password && !back.port, 'UNAPPROVED_RETURN_URL');
    }
  } else requireThat(url.pathname.startsWith('/games/') && !url.search, 'UNAPPROVED_PRODUCT_PATH');
  return url;
}

export function validateIdentity(identity) {
  requireThat(identity && ID.test(identity.gameId ?? '') &&
    typeof identity.officialName === 'string' && identity.officialName.length > 0 &&
    typeof identity.providerGameName === 'string' && identity.providerGameName.length > 0 &&
    SHA.test(identity.referenceSha256 ?? ''), 'INVALID_REFERENCE_IDENTITY');
  publicOfficialUrl(identity.officialPageUrl);
  const launch = publicOfficialUrl(identity.officialLaunchUrl, { launch: true });
  requireThat(launch.searchParams.get('GameName') === identity.providerGameName,
    'LAUNCH_IDENTITY_MISMATCH');
  return identity;
}

function identityFingerprint(identity) {
  return digest(JSON.stringify(['gameId', 'officialName', 'providerGameName', 'officialPageUrl',
    'officialLaunchUrl', 'referenceSha256'].map(key => identity[key])));
}

function validateSession(session) {
  requireThat(session && typeof session.sessionId === 'string' && session.sessionId.length > 0 &&
    typeof session.targetId === 'string' && session.targetId.length > 0, 'INVALID_CAPTURE_SESSION');
  const view = session.viewport;
  requireThat(view && Number.isInteger(view.width) && view.width > 0 &&
    Number.isInteger(view.height) && view.height > 0 &&
    Number.isFinite(view.deviceScaleFactor) && view.deviceScaleFactor > 0,
  'INVALID_CAPTURE_VIEWPORT');
  requireThat(session.orientation === (view.width <= view.height ? 'portrait' : 'landscape'),
    'ORIENTATION_MISMATCH');
  requireThat(typeof session.gameVersion === 'string' || session.gameVersion === null,
    'GAME_VERSION_OBSERVATION_REQUIRED');
  requireThat(session.gameVersion !== null ||
    typeof session.gameVersionObservation === 'string' && session.gameVersionObservation.length > 0,
  'GAME_VERSION_OBSERVATION_REQUIRED');
  for (const kind of ['screenshot', 'video', 'audio']) {
    const support = session.captureSupport?.[kind];
    requireThat(support && typeof support.supported === 'boolean' &&
      typeof support.methodOrReason === 'string' && support.methodOrReason.length > 0,
    'CAPTURE_SUPPORT_OBSERVATION_REQUIRED');
  }
  requireThat(session.captureSupport.screenshot.supported, 'SCREENSHOT_UNSUPPORTED');
}

function validateInspection(inspected, identity) {
  requireThat(inspected?.gameId === identity.gameId &&
    inspected.providerGameName === identity.providerGameName &&
    typeof inspected.identityEvidence === 'string' && inspected.identityEvidence.length > 0,
  'OBSERVED_IDENTITY_MISMATCH');
  requireThat(inspected.screen === 'gameplay-ready', 'DEMO_NOT_READY');
  requireThat(Array.isArray(inspected.controls) && inspected.controls.length > 0 &&
    inspected.controls.every(control => typeof control.id === 'string' && control.id.length > 0) &&
    new Set(inspected.controls.map(control => control.id)).size === inspected.controls.length,
  'INSPECTED_CONTROL_INVENTORY_REQUIRED');
}

function validateRound(round, identity, action, session) {
  requireThat(round?.gameId === identity.gameId && round.providerGameName === identity.providerGameName &&
    round.sessionId === session.sessionId, 'ROUND_IDENTITY_MISMATCH');
  requireThat(round.screen === 'gameplay-result' && round.phase === 'complete', 'ROUND_NOT_COMPLETE');
  requireThat(round.initiationMode === 'individual-input' && round.actionId === action.actionId,
    'ROUND_WAS_NOT_INDIVIDUALLY_INITIATED');
  requireThat(round.inputAccepted === true && round.activePhaseObserved === true &&
    round.completionObserved === true && typeof round.completionEvidence === 'string' &&
    round.completionEvidence.length > 0, 'ROUND_TRANSITIONS_NOT_OBSERVED');
  requireThat(typeof round.observedRoundKey === 'string' && round.observedRoundKey.length > 0 &&
    typeof round.roundKeySource === 'string' && round.roundKeySource.length > 0,
  'ROUND_OBSERVATION_KEY_REQUIRED');
  requireThat(round.autoWasDisabled === true && round.holdWasNotUsed === true,
    'AUTOMATED_OR_HELD_ROUND_NOT_COUNTABLE');
}

// The input journal is a causal record, not a counter. A missing/changed pending
// marker must never turn an uncertain attempted input into permission to click.
function validateCheckpoint(state) {
  const valid = condition => requireThat(condition, 'INVALID_CAPTURE_CHECKPOINT');
  valid(state && typeof state === 'object' && !Array.isArray(state) && state.schemaVersion === 1 &&
    ID.test(state.gameId ?? '') && ID.test(state.captureId ?? '') &&
    typeof state.providerGameName === 'string' && state.providerGameName.length > 0 &&
    ['CAPTURING', 'BLOCKED', 'CAPTURE_INCOMPLETE', 'REFERENCE_CAPTURED'].includes(state.status) &&
    ['actions', 'rounds', 'extraRounds', 'artifacts', 'controls', 'inspectedControls', 'blockers']
      .every(key => Array.isArray(state[key])) &&
    Number.isInteger(state.consecutiveResumes) && state.consecutiveResumes >= 0);
  valid(state.actions.length <= REQUIRED_ROUNDS && state.rounds.length <= REQUIRED_ROUNDS &&
    state.actions.length >= state.rounds.length &&
    new Set(state.actions.map(action => action?.actionId)).size === state.actions.length &&
    new Set(state.rounds.map(round => round?.observedRoundKey)).size === state.rounds.length &&
    new Set(state.artifacts.map(artifact => artifact?.artifactId)).size === state.artifacts.length);
  if (state.session !== null) {
    try { validateSession(state.session); } catch { valid(false); }
  }
  valid(state.session !== null || !state.actions.length && !state.rounds.length && !state.pendingAction);
  const artifacts = new Map(state.artifacts.map(artifact => [artifact?.artifactId, artifact]));
  const validShots = (shots, actionId, beforeRequired = false) => {
    valid(shots && typeof shots === 'object' && !Array.isArray(shots) &&
      Object.keys(shots).every(role => ['before', 'afterInput', 'result'].includes(role)) &&
      (!beforeRequired || typeof shots.before === 'string'));
    for (const [role, artifactId] of Object.entries(shots)) {
      const artifact = artifacts.get(artifactId);
      valid(typeof artifactId === 'string' && artifact?.kind === 'screenshot' &&
        artifact.captureRole === role && artifact.actionIds?.includes(actionId));
    }
  };
  for (const [index, action] of state.actions.entries()) {
    valid(action && ID.test(action.actionId ?? '') &&
      action.label === `spin-${String(index + 1).padStart(2, '0')}` &&
      action.initiationMode === 'individual-input' && action.initiationAttempted === true &&
      typeof action.createdAt === 'string' && Number.isFinite(Date.parse(action.createdAt)) &&
      typeof action.inputAttemptedAt === 'string' && Number.isFinite(Date.parse(action.inputAttemptedAt)));
    validShots(action.screenshots, action.actionId, true);
  }
  for (const [index, round] of state.rounds.entries()) {
    const action = state.actions[index];
    valid(round?.actionId === action?.actionId && round?.label === action?.label);
    try { validateRound(round, state, action, state.session); } catch { valid(false); }
    validShots(round.screenshots, round.actionId, true);
  }
  const pending = state.pendingAction;
  if (pending !== null) {
    valid(pending && state.rounds.length < REQUIRED_ROUNDS && ID.test(pending.actionId ?? '') &&
      pending.label === `spin-${String(state.rounds.length + 1).padStart(2, '0')}` &&
      pending.initiationMode === 'individual-input' && typeof pending.initiationAttempted === 'boolean' &&
      typeof pending.createdAt === 'string' && Number.isFinite(Date.parse(pending.createdAt)) &&
      !state.rounds.some(round => round.actionId === pending.actionId));
    validShots(pending.screenshots, pending.actionId, pending.initiationAttempted);
    if (pending.initiationAttempted) {
      const journaled = state.actions[state.rounds.length];
      valid(state.actions.length === state.rounds.length + 1 && journaled &&
        ['actionId', 'label', 'initiationMode', 'createdAt', 'inputAttemptedAt']
          .every(key => pending[key] === journaled[key]) &&
        pending.screenshots.before === journaled.screenshots.before);
    } else valid(state.actions.length === state.rounds.length && pending.inputAttemptedAt === undefined &&
      !state.actions.some(action => action.actionId === pending.actionId));
  } else valid(state.actions.length === state.rounds.length);
  valid([undefined, false, true].includes(state.pendingControlBatch) &&
    [undefined, false, true].includes(state.controlsCompleted) &&
    !(state.pendingControlBatch && state.controlsCompleted) &&
    (!state.pendingControlBatch || state.controls.length === 0 &&
      !state.extraRounds.some(round => round?.controlId !== undefined)) &&
    (!(state.pendingControlBatch || state.controlsCompleted) || state.rounds.length === REQUIRED_ROUNDS));
}

export function classifyBlocker(error, now = Date.now()) {
  const status = Number.isInteger(error?.status) ? error.status : 0;
  const suppliedCode = typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]{0,95}$/.test(error.code)
    ? error.code : 'CAPTURE_OPERATION_FAILED';
  const code = status === 403 ? 'ACCESS_FORBIDDEN' : status === 401 ? 'AUTHENTICATION_REQUIRED' :
    status === 429 ? 'RATE_LIMITED' : [404, 410].includes(status) ? 'SESSION_OR_RESOURCE_UNAVAILABLE' :
    suppliedCode;
  const retryable = status === 429 || status >= 500 || status === 408 ||
    ['DEMO_NOT_READY', 'ROUND_NOT_COMPLETE', 'NETWORK_UNAVAILABLE', 'OPERATION_TIMEOUT'].includes(code);
  const retryAfterMs = Number.isFinite(error?.retryAfterMs) && error.retryAfterMs >= 0
    ? Math.min(error.retryAfterMs, Math.max(0, 8640000000000000 - now)) : retryable ? 2000 : null;
  return { code, status, retryable, retryAfterMs,
    retryAt: retryAfterMs === null ? null : new Date(now + retryAfterMs).toISOString(),
    nextAction: status === 403 ? 'Verify the authorized account/scope; do not bypass access controls.' :
      status === 401 ? 'Refresh the authorized session; do not invent credentials.' :
      status === 429 ? 'Wait until retryAt, then resume this same session/action.' :
      'Reinspect the same session and pending action before issuing any additional round input.' };
}

export function validateEvidence(manifest) {
  const errors = [];
  const check = (ok, code) => { if (!ok) errors.push(code); };
  const rounds = Array.isArray(manifest?.rounds) ? manifest.rounds : [];
  check(rounds.length === REQUIRED_ROUNDS, 'SEVEN_INDIVIDUAL_ROUNDS_REQUIRED');
  try { validateCheckpoint(manifest); }
  catch {
    errors.push('INVALID_CAPTURE_CHECKPOINT');
    return { valid: false, errors, individuallyCompletedRounds: rounds.length,
      extraObservedRounds: Array.isArray(manifest?.extraRounds) ? manifest.extraRounds.length : 0,
      videoCaptured: false, audioSupported: manifest?.session?.captureSupport?.audio?.supported === true,
      audioCaptured: false, soundParityVerified: false, fullRulesVerified: false, releaseReady: false };
  }
  check(!manifest.pendingAction, 'PENDING_ACTION_UNRESOLVED');
  check(new Set(rounds.map(round => round.actionId)).size === rounds.length, 'DUPLICATE_ACTION');
  check(new Set(rounds.map(round => round.observedRoundKey)).size === rounds.length, 'DUPLICATE_ROUND');
  const artifacts = new Map((manifest.artifacts ?? []).map(artifact => [artifact.artifactId, artifact]));
  check(artifacts.size === (manifest.artifacts ?? []).length, 'DUPLICATE_ARTIFACT_ID');
  for (const [index, round] of rounds.entries()) {
    check(round.label === `spin-${String(index + 1).padStart(2, '0')}`, 'INVALID_SPIN_SEQUENCE');
    check(round.initiationMode === 'individual-input' && round.screen === 'gameplay-result' &&
      round.phase === 'complete' && round.inputAccepted === true && round.activePhaseObserved === true &&
      round.completionObserved === true && round.autoWasDisabled === true && round.holdWasNotUsed === true,
    'INVALID_COMPLETED_OBSERVATION');
    check(round.gameId === manifest.gameId && round.providerGameName === manifest.providerGameName &&
      round.sessionId === manifest.session?.sessionId && typeof round.completionEvidence === 'string' &&
      round.completionEvidence.length > 0 && typeof round.roundKeySource === 'string' && round.roundKeySource.length > 0,
    'OBSERVATION_PROVENANCE_MISMATCH');
    check((manifest.actions ?? []).filter(action => action.actionId === round.actionId &&
      action.initiationAttempted === true).length === 1, 'ACTION_LOG_MISMATCH');
    for (const role of ['before', 'afterInput', 'result']) {
      const artifact = artifacts.get(round.screenshots?.[role]);
      check(artifact?.kind === 'screenshot' && artifact.captureRole === role &&
        artifact.actionIds?.includes(round.actionId) && SHA.test(artifact?.sha256 ?? '') && artifact.byteLength > 0,
        `SCREENSHOT_${role.toUpperCase()}_MISSING`);
    }
  }
  const expectedControls = manifest.inspectedControls ?? [];
  check(expectedControls.length > 0 && expectedControls.every(control =>
    (manifest.controls ?? []).some(observed => observed.controlId === control.id &&
      observed.actionObserved === true && observed.responseObserved === true &&
      typeof observed.observation === 'string' && observed.observation.length > 0 &&
      observed.screenshotArtifactIds?.some(id => artifacts.get(id)?.kind === 'screenshot' &&
        artifacts.get(id)?.captureRole === 'control' && artifacts.get(id)?.controlId === control.id))),
  'CONTROL_EVIDENCE_INCOMPLETE');
  const coversRounds = kind => rounds.length > 0 && rounds.every(round => (manifest.artifacts ?? []).some(artifact =>
    artifact.kind === kind && artifact.actionIds?.includes(round.actionId) && artifact.byteLength > 0 &&
    artifact.durationMs > 0 && SHA.test(artifact.sha256 ?? '')));
  const videoCaptured = manifest.session?.captureSupport?.video?.supported === true && coversRounds('video');
  const audioSupported = manifest.session?.captureSupport?.audio?.supported === true;
  const audioCaptured = audioSupported && coversRounds('audio');
  check(videoCaptured, 'MOTION_RECORDING_INCOMPLETE');
  check(!audioSupported || audioCaptured, 'SUPPORTED_AUDIO_NOT_RECORDED');
  return { valid: errors.length === 0, errors: [...new Set(errors)],
    individuallyCompletedRounds: rounds.length, extraObservedRounds: (manifest.extraRounds ?? []).length,
    videoCaptured, audioSupported, audioCaptured, soundParityVerified: false,
    fullRulesVerified: false, releaseReady: false };
}

/** Drivers must contain inspected per-game callbacks. No selector fallback exists. */
export class EvidenceCaptureCoordinator {
  constructor({ allowlist, store, maxConcurrent = 2, maxAutomaticResumes = 3,
    operationTimeoutMs = 30000, now = Date.now }) {
    requireThat(Array.isArray(allowlist) && allowlist.length > 0 && store && typeof now === 'function',
      'INVALID_CAPTURE_OPTIONS');
    requireThat(Number.isInteger(maxConcurrent) && maxConcurrent >= 1 && maxConcurrent <= 4 &&
      Number.isInteger(maxAutomaticResumes) && maxAutomaticResumes >= 1 && maxAutomaticResumes <= 5,
    'INVALID_CAPTURE_LIMIT');
    requireThat(Number.isInteger(operationTimeoutMs) && operationTimeoutMs >= 1 && operationTimeoutMs <= 60000,
      'INVALID_OPERATION_TIMEOUT');
    allowlist.forEach(validateIdentity);
    requireThat(new Set(allowlist.map(row => row.gameId)).size === allowlist.length &&
      new Set(allowlist.map(row => row.providerGameName)).size === allowlist.length,
    'DUPLICATE_ALLOWLIST_IDENTITY');
    this.allowlist = new Map(allowlist.map(row => [row.gameId, clone(row)]));
    this.store = store;
    this.maxConcurrent = maxConcurrent;
    this.maxAutomaticResumes = maxAutomaticResumes;
    this.now = now;
    this.operationTimeoutMs = operationTimeoutMs;
    this.running = new Set();
  }

  async call(driver, method, input) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new CaptureError('OPERATION_TIMEOUT')); }, this.operationTimeoutMs);
    });
    try { return await Promise.race([Promise.resolve().then(() => driver[method]({ ...input, signal: controller.signal })), timeout]); }
    finally { clearTimeout(timer); }
  }

  async run(gameId, driver, { recheckBlocked = false } = {}) {
    const identity = this.allowlist.get(gameId);
    requireThat(identity, 'GAME_NOT_ALLOWLISTED');
    requireThat(!this.running.has(gameId) && this.running.size < this.maxConcurrent, 'CAPTURE_CONCURRENCY_LIMIT');
    requireThat(driver?.gameId === gameId && driver.providerGameName === identity.providerGameName &&
      SHA.test(driver.inspectionSha256 ?? ''), 'INSPECTED_DRIVER_REQUIRED');
    for (const method of ['open', 'inspect', 'screenshot', 'startRound', 'observeRound',
      'captureControls', 'finishRecording']) {
      requireThat(typeof driver[method] === 'function', 'INSPECTED_DRIVER_CALLBACK_REQUIRED');
    }
    this.running.add(gameId);
    let state;
    let release;
    let stage = 'read-checkpoint';
    try {
      release = await this.store.acquireGame(gameId);
      const saved = await this.store.load(gameId);
      if (saved !== null && saved !== undefined) {
        validateCheckpoint(saved);
        requireThat(saved.gameId === gameId &&
          ['officialName', 'providerGameName', 'referenceSha256', 'officialPageUrl', 'officialLaunchUrl']
            .every(key => saved[key] === identity[key]), 'INVALID_CAPTURE_CHECKPOINT');
      }
      state = saved ?? { schemaVersion: 1, captureId: randomUUID(), gameId,
        officialName: identity.officialName, providerGameName: identity.providerGameName,
        referenceFingerprint: identityFingerprint(identity), referenceSha256: identity.referenceSha256,
        officialPageUrl: identity.officialPageUrl, officialLaunchUrl: identity.officialLaunchUrl,
        driverInspectionSha256: driver.inspectionSha256, startedAt: iso(this.now), status: 'CAPTURING',
        session: null, actions: [], rounds: [], extraRounds: [], artifacts: [], controls: [],
        inspectedControls: [], pendingAction: null, blockers: [], consecutiveResumes: 0 };
      requireThat(state.referenceFingerprint === identityFingerprint(identity), 'REFERENCE_CHANGED_REQUIRES_NEW_CAPTURE');
      requireThat(state.driverInspectionSha256 === driver.inspectionSha256, 'DRIVER_CHANGED_REQUIRES_REVIEW');
      await this.store.verifyArtifacts(state);
      if (state.status === 'REFERENCE_CAPTURED') {
        requireThat(validateEvidence(state).valid, 'INVALID_COMPLETED_CHECKPOINT');
        return state;
      }
      if (state.blocker) {
        const retryAt = state.blocker.retryAt ? Date.parse(state.blocker.retryAt) : null;
        if (retryAt !== null && retryAt > this.now()) return state;
        if ((!state.blocker.retryable || state.consecutiveResumes >= this.maxAutomaticResumes) && !recheckBlocked)
          return state;
        state.consecutiveResumes = recheckBlocked ? 0 : state.consecutiveResumes + 1;
      }
      const save = async () => { state.updatedAt = iso(this.now); await this.store.save(gameId, state); };
      stage = 'open-same-game-session';
      if (state.session) await this.store.claimSession(state.session.sessionId, gameId);
      const opened = await this.call(driver, 'open', { identity: clone(identity), resumeSession: clone(state.session) });
      validateSession(opened);
      requireThat(!state.session || state.session.sessionId === opened.sessionId &&
        state.session.targetId === opened.targetId, 'SESSION_CHANGED_REQUIRES_NEW_CAPTURE');
      requireThat(!state.session || JSON.stringify(state.session.viewport) === JSON.stringify(opened.viewport) &&
        state.session.orientation === opened.orientation, 'VIEWPORT_CHANGED_REQUIRES_NEW_CAPTURE');
      requireThat(!state.session || state.session.gameVersion === opened.gameVersion, 'GAME_VERSION_CHANGED_REQUIRES_NEW_CAPTURE');
      await this.store.claimSession(opened.sessionId, gameId);
      state.session = Object.fromEntries(['sessionId', 'targetId', 'viewport', 'orientation', 'gameVersion',
        'gameVersionObservation', 'captureSupport'].map(key => [key, clone(opened[key])]));
      state.blocker = null;
      state.status = 'CAPTURING';
      await save();
      const context = () => ({ identity: clone(identity), session: clone(state.session) });
      stage = 'inspect-gameplay';
      const inspected = await this.call(driver, 'inspect', context());
      validateInspection(inspected, identity);
      if (state.inspectedControls.length) requireThat(JSON.stringify(state.inspectedControls.map(c => c.id)) ===
        JSON.stringify(inspected.controls.map(c => c.id)), 'CONTROL_INVENTORY_CHANGED_REQUIRES_REVIEW');
      state.inspectedControls = clone(inspected.controls);
      state.identityEvidence = inspected.identityEvidence;
      await save();
      const artifact = async (input, label) => {
        const result = await this.store.putArtifact(gameId, input, label);
        if (!state.artifacts.some(item => item.artifactId === result.artifactId)) state.artifacts.push(result);
        await save();
        return result.artifactId;
      };
      const screenshot = async (role, action) => artifact({
        ...await this.call(driver, 'screenshot', { ...context(), role, action: clone(action) }), kind: 'screenshot',
        captureRole: role, actionIds: [action.actionId],
      }, `${action.label}-${role}`);
      while (state.rounds.length < REQUIRED_ROUNDS) {
        if (!state.pendingAction) {
          const label = `spin-${String(state.rounds.length + 1).padStart(2, '0')}`;
          state.pendingAction = { actionId: randomUUID(), label, initiationMode: 'individual-input',
            createdAt: iso(this.now), initiationAttempted: false, screenshots: {} };
          await save();
        }
        const action = state.pendingAction;
        const recovery = action.initiationAttempted;
        if (!action.initiationAttempted) {
          stage = 'before-individual-input';
          action.screenshots.before = await screenshot('before', action);
          // Persist intent BEFORE invoking input: a lost response must never cause a second click.
          action.initiationAttempted = true;
          action.inputAttemptedAt = iso(this.now);
          state.actions.push(clone(action));
          await save();
          stage = 'individual-round-input';
          await this.call(driver, 'startRound', { ...context(), action: clone(action) });
          stage = 'after-individual-input';
          action.screenshots.afterInput = await screenshot('afterInput', action);
          await save();
        }
        stage = 'observe-same-pending-round';
        const result = await this.call(driver, 'observeRound', { ...context(), action: clone(action), recovery });
        validateRound(result, identity, action, state.session);
        requireThat(!state.rounds.some(round => round.observedRoundKey === result.observedRoundKey),
          'DUPLICATE_ROUND_OBSERVATION');
        const { recoveredAfterInputScreenshot, extraRounds = [], ...safeResult } = result;
        requireThat(Array.isArray(extraRounds) && extraRounds.every(extra =>
          ['auto', 'hold', 'bonus', 'unattributed'].includes(extra?.initiationMode)), 'EXTRA_ROUND_ORIGIN_REQUIRED');
        // A recovered round needs actual saved after-input evidence, not a relabelled result image.
        if (!action.screenshots.afterInput && result.recoveredAfterInputScreenshot) {
          action.screenshots.afterInput = await artifact({ ...result.recoveredAfterInputScreenshot,
            kind: 'screenshot', captureRole: 'afterInput', actionIds: [action.actionId] }, `${action.label}-afterInput-recovered`);
        }
        stage = 'round-result-screenshot';
        action.screenshots.result = await screenshot('result', action);
        state.rounds.push({ ...clone(safeResult), label: action.label,
          observedAt: iso(this.now), viewport: clone(state.session.viewport),
          orientation: state.session.orientation, gameVersion: state.session.gameVersion,
          screenshots: clone(action.screenshots) });
        for (const extra of extraRounds) {
          state.extraRounds.push({ ...clone(extra), parentActionId: action.actionId,
            countedTowardSeven: false, observedAt: iso(this.now) });
        }
        state.pendingAction = null;
        state.consecutiveResumes = 0;
        await save();
      }
      stage = 'inspect-controls';
      if (!state.controlsCompleted) {
        const recoverControls = state.pendingControlBatch === true;
        requireThat(!recoverControls || typeof driver.recoverControls === 'function', 'CONTROL_RESPONSE_UNRESOLVED');
        state.pendingControlBatch = true;
        await save();
        const controls = await this.call(driver, recoverControls ? 'recoverControls' : 'captureControls', {
          ...context(), controls: clone(state.inspectedControls), completedActions: clone(state.actions) });
        requireThat(Array.isArray(controls), 'INVALID_CONTROL_EVIDENCE');
        for (const control of controls) {
          requireThat(control && Array.isArray(control.screenshots ?? []), 'INVALID_CONTROL_EVIDENCE');
          requireThat(Array.isArray(control.extraRounds ?? []) && (control.extraRounds ?? []).every(extra =>
            ['auto', 'hold', 'bonus', 'unattributed'].includes(extra?.initiationMode)), 'EXTRA_ROUND_ORIGIN_REQUIRED');
        }
        const completedControls = [], observedExtras = [];
        for (const control of controls) {
          const { screenshots = [], extraRounds = [], ...record } = control;
          const screenshotArtifactIds = [];
          for (const [index, shot] of screenshots.entries()) {
            screenshotArtifactIds.push(await artifact({ ...shot, kind: 'screenshot', captureRole: 'control',
              controlId: control.controlId }, `control-${control.controlId}-${index}`));
          }
          completedControls.push({ ...clone(record), screenshotArtifactIds });
          for (const extra of extraRounds) {
            observedExtras.push({ ...clone(extra), controlId: control.controlId,
              countedTowardSeven: false, observedAt: iso(this.now) });
          }
        }
        // Artifact writes may checkpoint independently, but the observed batch
        // is published once so read-only recovery cannot duplicate half a batch.
        state.controls.push(...completedControls);
        state.extraRounds.push(...observedExtras);
        state.controlsCompleted = true;
        state.pendingControlBatch = false;
        await save();
      }
      stage = 'finalize-recording';
      const recordings = await this.call(driver, 'finishRecording', { ...context(), completedActions: clone(state.actions) });
      requireThat(Array.isArray(recordings), 'INVALID_RECORDING_EVIDENCE');
      for (const recording of recordings) {
        requireThat(['video', 'audio'].includes(recording.kind), 'INVALID_RECORDING_KIND');
        await artifact(recording, `session-${recording.kind}`);
      }
      state.validation = validateEvidence(state);
      state.status = state.validation.valid ? 'REFERENCE_CAPTURED' : 'CAPTURE_INCOMPLETE';
      state.completedAt = iso(this.now);
      await save();
      return state;
    } catch (error) {
      if (!state) throw error;
      const blocker = { ...classifyBlocker(error, this.now()), stage, observedAt: iso(this.now),
        pendingActionId: state.pendingAction?.actionId ?? null };
      state.status = 'BLOCKED';
      state.blocker = blocker;
      state.blockers.push(blocker);
      state.updatedAt = iso(this.now);
      await this.store.save(gameId, state);
      return state;
    } finally {
      try { await release?.(); }
      finally { this.running.delete(gameId); }
    }
  }

  async runMany(requests) {
    requireThat(Array.isArray(requests) && new Set(requests.map(request => request.gameId)).size === requests.length,
      'DUPLICATE_CAPTURE_REQUEST');
    const results = new Array(requests.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < requests.length) {
        const index = cursor++;
        const request = requests[index];
        try { results[index] = { status: 'fulfilled', value: await this.run(request.gameId, request.driver, request.options) }; }
        catch (error) { results[index] = { status: 'rejected', reason: classifyBlocker(error, this.now()) }; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.maxConcurrent, requests.length) }, worker));
    return results;
  }
}

