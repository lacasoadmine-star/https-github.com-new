// Offline release validation only. No production API, SQL, wallet, deployment or
// reference browser operation is implemented here.
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const READY = new Set(['RELEASE_READY', 'LIVE_VERIFIED', 'COMPLETED']);
const registrySchema = 'zplay/new-games72-registry/v1';
const evidenceSchema = 'zplay/new-games72-release-evidence/v1';
const approvedReviews = new WeakMap();
const REQUIREMENTS = Object.freeze({
  unit: ['bet-validation', 'payouts', 'receipt-grid'],
  integration: ['frontend-route', 'backend-route', 'same-account-wallet', 'version-alignment'],
  ledger: ['debit-settlement', 'duplicate-request', 'concurrent-request', 'account-ownership', 'isolated-database'],
  mobile: ['portrait', 'landscape', 'tablet', 'desktop', 'touch-targets'],
  lifecycle: ['exit-cleanup', 'hide-resume', 'orientation-change', 'reduced-motion', 'no-cross-game-state'],
  recovery: ['accepted-response-lost', 'same-key-replay', 'refresh', 'double-click', 'two-tabs', 'retry-limit', '429-retry-after'],
});
export const requiredReportChecks = REQUIREMENTS;

export class ReleaseError extends Error {
  constructor(code, detail = '') { super(code); this.name = 'ReleaseError'; this.code = code; this.detail = detail; }
}
const check = (condition, code, detail) => { if (!condition) throw new ReleaseError(code, detail); };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
}
export const hashObject = value => digest(stable(value));
const canonicalName = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
function relativePath(value) {
  check(typeof value === 'string' && /^[A-Za-z0-9_.\/-]+$/.test(value) &&
    !value.startsWith('/') && !value.endsWith('/') &&
    value.split('/').every(part => part && part !== '.' && part !== '..'), 'INVALID_ARTIFACT_PATH');
  return value;
}
function route(value) {
  check(typeof value === 'string' && /^\/[A-Za-z0-9_./-]*$/.test(value) &&
    !value.includes('//') && !value.split('/').some(part => part === '.' || part === '..'), 'INVALID_ROUTE');
  return value.replace(/\/+$/, '').toLowerCase() || '/';
}
const overlaps = (a, b) => a === b || a !== '/' && b.startsWith(a + '/') || b !== '/' && a.startsWith(b + '/');
const unique = values => new Set(values).size === values.length;
function validDate(value) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function officialUrl(value, hosts) {
  let url; try { url = new URL(value); } catch { throw new ReleaseError('INVALID_OFFICIAL_URL'); }
  check(url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    hosts.includes(url.hostname), 'UNAPPROVED_OFFICIAL_SOURCE');
  return url;
}

// Baseline is an explicit adapter of the complete previously live inventory.
// It is not inferred from the old 74-minus-two rebuild list.
export function validateRegistry(registry, baseline) {
  const issues = [];
  const add = (code, gameId = null, detail = '') => issues.push({ code, gameId, detail });
  if (!isObject(registry) || registry.schema !== registrySchema || !text(registry.releaseId)) add('INVALID_REGISTRY_SCHEMA');
  if (!Array.isArray(registry?.games) || registry.games.length !== 72) add('EXACTLY_72_NEW_GAMES_REQUIRED');
  if (!isObject(baseline) || !['gameIds', 'routes', 'assetPrefixes'].every(key =>
    Array.isArray(baseline[key]) && baseline[key].length > 0 && baseline[key].every(text))) add('COMPLETE_LEGACY_BASELINE_REQUIRED');
  if (issues.length) return { valid: false, issues };
  const ids = new Set(baseline.gameIds.map(value => value.toLowerCase()));
  let oldRoutes, oldAssets;
  try { oldRoutes = baseline.routes.map(route); oldAssets = baseline.assetPrefixes.map(route); }
  catch (error) { add(error.code); return { valid: false, issues }; }
  const seen = Object.fromEntries(['name', 'variant', 'id', 'route', 'module', 'asset', 'configuration', 'evaluator'].map(key => [key, new Set()]));
  const claim = (kind, value, gameId) => {
    if (seen[kind].has(value)) add('DUPLICATE_' + kind.toUpperCase(), gameId);
    seen[kind].add(value);
  };
  for (const [index, game] of registry.games.entries()) {
    const id = game?.gameId ?? null;
    try {
      check(isObject(game) && game.ordinal === index + 1, 'INVALID_GAME_ORDINAL');
      check(typeof id === 'string' && /^[a-z][a-z0-9_-]{2,127}$/.test(id), 'INVALID_NEW_GAME_ID');
      check(text(game.officialName) && text(game.provider) && text(game.variant?.key) &&
        typeof game.variant?.category === 'string', 'INVALID_OFFICIAL_IDENTITY');
      check(isObject(game.backend) && typeof game.backend.enabled === 'boolean' &&
        isObject(game.assets) && isObject(game.evidence), 'INCOMPLETE_GAME_REGISTRY');
      const gameRoute = route(game.route), assets = route(game.assets.prefix);
      check(gameRoute !== '/' && assets !== '/', 'NEW_GAME_ROOT_NAMESPACE_FORBIDDEN');
      const modulePath = relativePath(game.modulePath), configuration = relativePath(game.backend.configurationPath);
      const evaluator = relativePath(game.backend.evaluatorPath);
      relativePath(game.assets.manifestPath); relativePath(game.evidence.referenceManifestPath); relativePath(game.evidence.rulesSpecPath);
      claim('name', canonicalName(game.officialName), id);
      // A category/launcher alias cannot manufacture an extra provider variant.
      claim('variant', canonicalName(game.provider) + ':' + canonicalName(game.variant.key), id);
      claim('id', id, id); claim('route', gameRoute, id); claim('module', modulePath, id);
      claim('asset', assets, id); claim('configuration', configuration, id); claim('evaluator', evaluator, id);
      check(!ids.has(id.toLowerCase()), 'LEGACY_GAME_ID_COLLISION');
      check(!oldRoutes.some(old => overlaps(gameRoute, old)), 'LEGACY_ROUTE_COLLISION');
      check(!oldAssets.some(old => overlaps(assets, old)), 'LEGACY_ASSET_COLLISION');
    } catch (error) { add(error.code ?? 'INVALID_REGISTRY_ENTRY', id); }
  }
  const prefixes = [...seen.asset], routes = [...seen.route];
  for (let i = 0; i < prefixes.length; i++) for (let j = i + 1; j < prefixes.length; j++)
    if (overlaps(prefixes[i], prefixes[j])) add('OVERLAPPING_NEW_ASSET_PREFIXES');
  for (let i = 0; i < routes.length; i++) for (let j = i + 1; j < routes.length; j++)
    if (overlaps(routes[i], routes[j])) add('OVERLAPPING_NEW_GAME_ROUTES');
  return { valid: issues.length === 0, issues };
}

export function fileArtifactReader(root) {
  const resolvedRoot = path.resolve(root);
  return async relative => {
    relativePath(relative);
    const base = await realpath(resolvedRoot), actual = await realpath(path.join(base, relative));
    check(actual.startsWith(base + path.sep), 'ARTIFACT_ESCAPES_REVIEW_ROOT');
    return readFile(actual);
  };
}

function artifactReader(readArtifact) {
  const cache = new Map();
  return async descriptor => {
    check(isObject(descriptor) && SHA.test(descriptor.sha256 ?? '') &&
      Number.isSafeInteger(descriptor.byteLength) && descriptor.byteLength > 0 &&
      descriptor.byteLength <= 100 * 1024 * 1024 && text(descriptor.mediaType), 'INVALID_ARTIFACT_DESCRIPTOR');
    relativePath(descriptor.path);
    const key = descriptor.path + ':' + descriptor.sha256;
    if (!cache.has(key)) cache.set(key, (async () => {
      const bytes = await readArtifact(descriptor.path);
      check(bytes instanceof Uint8Array, 'ARTIFACT_BYTES_REQUIRED');
      const value = Buffer.from(bytes);
      check(value.length === descriptor.byteLength && digest(value) === descriptor.sha256,
        'ARTIFACT_HASH_OR_SIZE_MISMATCH');
      return value;
    })());
    const value = await cache.get(key);
    check(value.length === descriptor.byteLength, 'ARTIFACT_HASH_OR_SIZE_MISMATCH');
    return value;
  };
}
async function jsonArtifact(read, descriptor) {
  check(descriptor?.mediaType === 'application/json', 'JSON_EVIDENCE_REQUIRED');
  const bytes = await read(descriptor);
  try { return JSON.parse(bytes.toString('utf8')); } catch { throw new ReleaseError('INVALID_JSON_EVIDENCE'); }
}
function mediaSignature(bytes, type) {
  if (type === 'image/png') return bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (type === 'image/jpeg') return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (type.endsWith('/webm')) return bytes.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'));
  if (type === 'video/mp4') return bytes.subarray(4, 8).toString() === 'ftyp';
  if (type === 'audio/wav') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE';
  if (type === 'audio/ogg') return bytes.subarray(0, 4).toString() === 'OggS';
  if (type === 'audio/mpeg') return bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 255 && (bytes[1] & 224) === 224;
  return false;
}

async function verifyReferences(game, entry, read, policy) {
  check(entry.references?.path === game.evidence.referenceManifestPath, 'REFERENCE_MANIFEST_PATH_MISMATCH');
  relativePath(entry.referenceArtifactRoot);
  const captured = await jsonArtifact(read, entry.references);
  check(captured.schemaVersion === 1 && captured.gameId === game.gameId &&
    captured.officialName === game.officialName && captured.providerGameName === game.variant.key,
    'REFERENCE_GAME_IDENTITY_MISMATCH');
  const product = officialUrl(captured.officialPageUrl, policy.officialHosts);
  const launch = officialUrl(captured.officialLaunchUrl, policy.officialHosts);
  check(product.pathname.startsWith('/games/') && launch.searchParams.get('GameName') === game.variant.key &&
    ['DEMO', 'DEMO_EXH'].includes(launch.searchParams.get('Token')) &&
    /^demo$/i.test(launch.searchParams.get('PortalName') ?? ''), 'OFFICIAL_DEMO_IDENTITY_MISMATCH');
  check(validDate(captured.startedAt) && validDate(captured.completedAt) &&
    Date.parse(captured.startedAt) >= Date.parse(policy.referenceNotBefore) &&
    Date.parse(captured.completedAt) >= Date.parse(captured.startedAt), 'FRESH_REFERENCE_DATE_REQUIRED');
  check(captured.pendingAction === null && !captured.pendingControlBatch && !captured.blocker &&
    captured.status === 'REFERENCE_CAPTURED', 'REFERENCE_CAPTURE_INCOMPLETE');
  const view = captured.session?.viewport;
  check(Number.isInteger(view?.width) && view.width > 0 && Number.isInteger(view?.height) && view.height > 0 &&
    captured.session.orientation === (view.width <= view.height ? 'portrait' : 'landscape') &&
    text(captured.session.sessionId), 'REFERENCE_VIEWPORT_REQUIRED');
  check(Array.isArray(captured.rounds) && captured.rounds.length >= 7 &&
    unique(captured.rounds.map(item => item.actionId)) && unique(captured.rounds.map(item => item.observedRoundKey)),
    'SEVEN_DISTINCT_INITIATED_COMPLETED_ROUNDS_REQUIRED');
  const index = new Map();
  check(Array.isArray(captured.artifacts), 'REFERENCE_ARTIFACTS_REQUIRED');
  for (const artifact of captured.artifacts) {
    check(text(artifact.artifactId) && !index.has(artifact.artifactId), 'DUPLICATE_REFERENCE_ARTIFACT');
    relativePath(artifact.relativePath);
    check(artifact.relativePath.startsWith(game.gameId + '/artifacts/'), 'CROSS_GAME_REFERENCE_ARTIFACT');
    const descriptor = { path: entry.referenceArtifactRoot + '/' + artifact.relativePath,
      sha256: artifact.sha256, byteLength: artifact.byteLength, mediaType: artifact.mediaType };
    const bytes = await read(descriptor);
    check(mediaSignature(bytes, artifact.mediaType), 'REFERENCE_MEDIA_SIGNATURE_MISMATCH');
    index.set(artifact.artifactId, artifact);
  }
  const actions = captured.actions ?? [];
  for (const [i, round] of captured.rounds.entries()) {
    check(round.label === 'spin-' + String(i + 1).padStart(2, '0') && text(round.actionId) && text(round.observedRoundKey) &&
      round.gameId === game.gameId && round.providerGameName === game.variant.key && round.sessionId === captured.session.sessionId &&
      round.initiationMode === 'individual-input' && round.phase === 'complete' && round.screen === 'gameplay-result' &&
      ['inputAccepted', 'activePhaseObserved', 'completionObserved', 'autoWasDisabled', 'holdWasNotUsed'].every(key => round[key] === true) &&
      text(round.completionEvidence) && text(round.roundKeySource), 'ROUND_TRANSITION_EVIDENCE_REQUIRED');
    const initiated = actions.filter(action => action.actionId === round.actionId && action.initiationAttempted === true);
    check(initiated.length === 1 && validDate(initiated[0].inputAttemptedAt) && validDate(round.observedAt) &&
      Date.parse(round.observedAt) >= Date.parse(initiated[0].inputAttemptedAt), 'ROUND_ACTION_LOG_MISMATCH');
    for (const role of ['before', 'afterInput', 'result']) {
      const image = index.get(round.screenshots?.[role]);
      check(image?.kind === 'screenshot' && image.mediaType.startsWith('image/') && image.captureRole === role &&
        image.actionIds?.includes(round.actionId), 'ROUND_SCREENSHOT_MISSING');
    }
    const recording = [...index.values()].some(artifact => artifact.kind === 'video' &&
      artifact.mediaType.startsWith('video/') && artifact.durationMs > 0 && artifact.actionIds?.includes(round.actionId));
    check(recording, 'ROUND_VIDEO_EVIDENCE_REQUIRED');
    if (captured.session.captureSupport?.audio?.supported === true) check([...index.values()].some(artifact =>
      artifact.kind === 'audio' && artifact.mediaType.startsWith('audio/') && artifact.durationMs > 0 &&
      artifact.actionIds?.includes(round.actionId)), 'SUPPORTED_AUDIO_EVIDENCE_REQUIRED');
  }
  check(Array.isArray(captured.inspectedControls) && captured.inspectedControls.length > 0 &&
    unique(captured.inspectedControls.map(control => control.id)), 'CONTROL_INVENTORY_REQUIRED');
  for (const control of captured.inspectedControls) {
    const observation = captured.controls?.find(item => item.controlId === control.id);
    check(observation?.actionObserved === true && observation.responseObserved === true && text(observation.observation) &&
      observation.screenshotArtifactIds?.some(id => index.get(id)?.kind === 'screenshot' &&
        index.get(id)?.captureRole === 'control' && index.get(id)?.controlId === control.id), 'CONTROL_ACTION_EVIDENCE_REQUIRED');
  }
  return captured;
}

export function releaseSubject(registry, manifest, game, entry) {
  return { releaseId: registry.releaseId, sourceCommit: manifest.sourceCommit, gameId: game.gameId,
    frontendVersion: manifest.frontendVersion, backendVersion: manifest.backendVersion,
    rulesVersion: game.backend.rulesVersion, engineVersion: game.backend.engineVersion,
    referenceSha256: entry.references?.sha256,
    pins: Object.fromEntries(Object.entries(entry.pins ?? {}).map(([key, item]) => [key, item.sha256])) };
}
function boundReport(report, game, subject, schema) {
  check(report?.schema === schema && report.gameId === game.gameId && report.subjectSha256 === subject,
    'EVIDENCE_SOURCE_BINDING_MISMATCH');
}
async function reviewed(report, role, read, policy, authors, subject, inputs) {
  check(text(report.reviewerId) && policy.reviewProducers?.[role]?.includes(report.reviewerId) &&
    !authors.includes(report.reviewerId) && report.conclusion === 'APPROVED' &&
    validDate(report.reviewedAt), 'INDEPENDENT_REVIEW_REQUIRED');
  // This is ordinary operational/task provenance, not a credential, signature,
  // manual approval or a substitute for the substantive audit evidence above.
  const producer = await jsonArtifact(read, report.producerEvidence);
  check(producer.schema === 'zplay/new72-review-provenance/v1' && producer.producerId === report.reviewerId &&
    producer.role === role && producer.subjectSha256 === subject && text(producer.taskId) &&
    !authors.includes(producer.taskId) && text(producer.process) && validDate(producer.recordedAt) &&
    Array.isArray(producer.inputSha256) && unique(producer.inputSha256) &&
    inputs.every(sha => producer.inputSha256.includes(sha)), 'PEER_REVIEW_PROVENANCE_MISMATCH');
}

async function verifyGame(game, entry, registry, manifest, read, policy) {
  check(READY.has(game.status), 'GAME_NOT_RELEASE_READY');
  check(text(game.backend.rulesVersion) && text(game.backend.engineVersion), 'GAME_VERSION_PINS_REQUIRED');
  check(game.assets.rightsStatus === 'VERIFIED', 'ASSET_RIGHTS_NOT_VERIFIED');
  check(entry?.gameId === game.gameId && Array.isArray(entry.sourceAuthors) && entry.sourceAuthors.length > 0 &&
    entry.sourceAuthors.every(text), 'GAME_EVIDENCE_ENTRY_REQUIRED');
  const pins = entry.pins;
  check(isObject(pins) && Object.keys(pins).length === 5 &&
    ['frontend', 'backendConfiguration', 'evaluator', 'rules', 'assets'].every(key => pins[key]), 'ALL_SOURCE_PINS_REQUIRED');
  check((pins.frontend.path === game.modulePath || pins.frontend.path?.startsWith(game.modulePath + '/')) &&
    pins.backendConfiguration.path === game.backend.configurationPath && pins.evaluator.path === game.backend.evaluatorPath &&
    pins.rules.path === game.evidence.rulesSpecPath && pins.assets.path === game.assets.manifestPath, 'REGISTRY_SOURCE_PATH_MISMATCH');
  for (const descriptor of Object.values(pins)) await read(descriptor);
  const captured = await verifyReferences(game, entry, read, policy);
  const subject = hashObject(releaseSubject(registry, manifest, game, entry));
  const rules = await jsonArtifact(read, pins.rules);
  check(rules.schema === 'zplay/new72-rules/v1' && rules.gameId === game.gameId &&
    rules.rulesVersion === game.backend.rulesVersion && rules.engineVersion === game.backend.engineVersion &&
    Array.isArray(rules.sources) && rules.sources.length > 0 && Array.isArray(rules.criticalRules) && rules.criticalRules.length > 0 &&
    Array.isArray(rules.unverifiedCriticalRules) && rules.unverifiedCriticalRules.length === 0, 'VERIFIED_CRITICAL_RULES_REQUIRED');
  const sourceHashes = new Set();
  for (const source of rules.sources) {
    officialUrl(source.url, policy.officialHosts);
    check(validDate(source.capturedAt) && Date.parse(source.capturedAt) >= Date.parse(policy.referenceNotBefore), 'STALE_RULE_SOURCE');
    await read(source.artifact); sourceHashes.add(source.artifact.sha256);
  }
  check(unique(rules.criticalRules.map(rule => rule.id)) && rules.criticalRules.every(rule =>
    text(rule.id) && text(rule.statement) && sourceHashes.has(rule.sourceSha256)), 'UNSOURCED_CRITICAL_RULE');
  check(Array.isArray(rules.controls) && rules.controls.length > 0 && rules.controls.every(id =>
    captured.inspectedControls.some(control => control.id === id)), 'RULE_CONTROL_REFERENCE_MISMATCH');

  const assets = await jsonArtifact(read, pins.assets);
  check(assets.schema === 'zplay/new72-assets/v1' && assets.gameId === game.gameId &&
    Array.isArray(assets.files) && assets.files.length > 0 && unique(assets.files.map(file => file.path)), 'ASSET_MANIFEST_REQUIRED');
  const runtimeAssets = new Set();
  for (const asset of assets.files) {
    check(text(asset.publicPath) && route(asset.publicPath).startsWith(route(game.assets.prefix) + '/') &&
      !['reference-screenshot', 'reference-video', 'screen-playback'].includes(asset.kind), 'INVALID_RUNTIME_ASSET');
    await read(asset); runtimeAssets.add(asset.sha256);
  }

  const math = await jsonArtifact(read, entry.mathAudit);
  boundReport(math, game, subject, 'zplay/new72-math-audit/v1');
  check(math.providerRngReproduced === false && math.providerCertified === false &&
    Array.isArray(math.checks) && ['integer-money', 'payout-calculation', 'probability-model', 'version-pinning', 'maximum-win'].every(id =>
      math.checks.some(item => item.id === id && item.result === 'PASS')) &&
    Array.isArray(math.findings) && math.findings.length === 0 && text(math.method), 'INDEPENDENT_MATH_AUDIT_INCOMPLETE');
  for (const item of math.checks) {
    check(item.result === 'PASS', 'MATH_AUDIT_FAILED');
    const evidence = await jsonArtifact(read, item.evidence);
    check(evidence.subjectSha256 === subject && evidence.checkId === item.id && evidence.result === 'PASS' &&
      text(evidence.observations), 'MATH_EXECUTION_EVIDENCE_MISMATCH');
  }
  await reviewed(math, 'math', read, policy, entry.sourceAuthors, subject,
    [pins.evaluator.sha256, pins.rules.sha256, ...math.checks.map(item => item.evidence.sha256)]);

  const passedChecks = new Set();
  for (const [kind, expected] of Object.entries(REQUIREMENTS)) {
    const report = await jsonArtifact(read, entry.reports?.[kind]);
    boundReport(report, game, subject, 'zplay/new72-test-report/v1');
    check(report.kind === kind && report.environment?.production === false && text(report.environment?.description) &&
      text(report.command) && Array.isArray(report.checks) && report.checks.length > 0 &&
      unique(report.checks.map(item => item.id)) && expected.every(id => report.checks.some(item => item.id === id && item.result === 'PASS')) &&
      report.summary?.passed === report.checks.length && report.summary.failed === 0 && report.summary.skipped === 0 &&
      report.summary.cancelled === 0, 'REQUIRED_TEST_REPORT_INCOMPLETE');
    if (kind === 'ledger' || kind === 'integration') check(report.environment.database === 'disposable-isolated', 'ISOLATED_LEDGER_TESTS_REQUIRED');
    for (const item of report.checks) {
      check(item.result === 'PASS', 'TEST_FAILURE_OR_SKIP_PRESENT');
      const evidence = await jsonArtifact(read, item.evidence);
      check(evidence.subjectSha256 === subject && evidence.testId === item.id && evidence.result === 'PASS' &&
        Array.isArray(evidence.assertions) && evidence.assertions.length > 0 &&
        evidence.assertions.every(assertion => text(assertion.description) && assertion.passed === true), 'TEST_EXECUTION_EVIDENCE_MISMATCH');
      passedChecks.add(kind + ':' + item.id);
    }
    if (kind === 'mobile') check(Array.isArray(report.viewports) && report.viewports.some(view =>
      Number.isInteger(view.width) && view.width <= 430 && view.height > view.width) && report.viewports.some(view =>
      view.width >= 1000 && view.height > 0), 'MOBILE_DESKTOP_MEASUREMENTS_REQUIRED');
  }

  const comparison = await jsonArtifact(read, entry.comparison);
  boundReport(comparison, game, subject, 'zplay/new72-comparison/v1');
  check(comparison.referenceSha256 === entry.references.sha256 && comparison.frontendSha256 === pins.frontend.sha256 &&
    Array.isArray(comparison.actions) && comparison.actions.length > 0 &&
    captured.inspectedControls.every(control => comparison.actions.some(action => action.controlId === control.id && action.result === 'PASS')),
    'REFERENCE_IMPLEMENTATION_COMPARISON_REQUIRED');
  for (const action of comparison.actions) {
    check(action.result === 'PASS' && text(action.observation), 'COMPARISON_FAILED');
    check(captured.artifacts.some(artifact => artifact.sha256 === action.referenceEvidence?.sha256), 'COMPARISON_REFERENCE_INPUT_MISMATCH');
    await read(action.referenceEvidence); await read(action.implementationEvidence);
  }
  const defects = await jsonArtifact(read, entry.defects);
  boundReport(defects, game, subject, 'zplay/new72-defects/v1');
  check(Array.isArray(defects.items) && defects.items.every(item => item.status === 'CLOSED_VERIFIED' &&
    text(item.id) && passedChecks.has(item.retestCheck)), 'OPEN_OR_UNRETESTED_DEFECT');

  const rights = await jsonArtifact(read, entry.rightsReview);
  boundReport(rights, game, subject, 'zplay/new72-rights-review/v1');
  check(Array.isArray(rights.assets) && rights.assets.length === runtimeAssets.size &&
    unique(rights.assets.map(asset => asset.sha256)) && rights.assets.every(asset => runtimeAssets.has(asset.sha256) &&
      ['license', 'permission', 'owned-original'].includes(asset.basis)), 'ASSET_RIGHTS_COVERAGE_INCOMPLETE');
  for (const asset of rights.assets) await read(asset.grantEvidence);
  await reviewed(rights, 'rights', read, policy, entry.sourceAuthors, subject,
    [pins.assets.sha256, ...rights.assets.map(asset => asset.grantEvidence.sha256)]);

  const final = await jsonArtifact(read, entry.releaseReview);
  boundReport(final, game, subject, 'zplay/new72-independent-release-review/v1');
  check(final.mathAuditSha256 === entry.mathAudit.sha256 && final.rightsReviewSha256 === entry.rightsReview.sha256 &&
    final.comparisonSha256 === entry.comparison.sha256 && final.defectsSha256 === entry.defects.sha256 &&
    Object.keys(REQUIREMENTS).every(kind => final.reportSha256?.[kind] === entry.reports[kind].sha256), 'INDEPENDENT_REVIEW_INPUT_MISMATCH');
  await reviewed(final, 'release', read, policy, entry.sourceAuthors, subject,
    [entry.mathAudit.sha256, entry.rightsReview.sha256, entry.comparison.sha256, entry.defects.sha256,
      ...Object.values(entry.reports).map(report => report.sha256)]);
  return { gameId: game.gameId, subjectSha256: subject, releaseReviewSha256: entry.releaseReview.sha256 };
}

export async function reviewRelease({ registry, baseline, attestationManifest, readArtifact, policy } = {}) {
  const checked = validateRegistry(registry, baseline), issues = [...checked.issues], games = [];
  const manifest = attestationManifest;
  try {
    check(checked.valid, 'REGISTRY_REVIEW_FAILED');
    for (const game of registry.games) if (!READY.has(game.status))
      issues.push({ code: 'GAME_NOT_RELEASE_READY', gameId: game.gameId, detail: game.status ?? 'missing status' });
    check(isObject(manifest), 'RELEASE_EVIDENCE_MANIFEST_MISSING');
    check(manifest.schema === evidenceSchema && manifest.releaseId === registry.releaseId &&
      COMMIT.test(manifest.sourceCommit ?? '') && text(manifest.frontendVersion) && text(manifest.backendVersion) &&
      manifest.registrySha256 === hashObject(registry) && manifest.baselineSha256 === hashObject(baseline), 'RELEASE_INPUT_BINDING_MISMATCH');
    check(typeof readArtifact === 'function' && isObject(policy) && isObject(policy.reviewProducers) &&
      Array.isArray(policy.officialHosts) && policy.officialHosts.length > 0 && validDate(policy.referenceNotBefore), 'INDEPENDENT_REVIEW_POLICY_REQUIRED');
    check(Array.isArray(manifest.games) && manifest.games.length === 72 && unique(manifest.games.map(game => game.gameId)) &&
      manifest.games.every(entry => registry.games.some(game => game.gameId === entry.gameId)), 'COMPLETE_72_GAME_EVIDENCE_REQUIRED');
    const read = artifactReader(readArtifact);
    for (const game of registry.games) {
      if (!READY.has(game.status)) continue;
      try { games.push(await verifyGame(game, manifest.games.find(entry => entry.gameId === game.gameId), registry, manifest, read, policy)); }
      catch (error) { issues.push({ code: error.code ?? 'EVIDENCE_UNREADABLE', gameId: game.gameId, detail: error.detail ?? '' }); }
    }
  } catch (error) {
    if (error.code !== 'REGISTRY_REVIEW_FAILED') issues.push({ code: error.code ?? 'RELEASE_REVIEW_FAILED', gameId: null, detail: error.detail ?? '' });
  }
  const allowed = issues.length === 0 && games.length === 72;
  const result = Object.freeze({ schema: 'zplay/new-games72-review-result/v1', releaseId: registry?.releaseId ?? null,
    allowed, verifiedGameCount: games.length, issues: Object.freeze(issues.map(item => Object.freeze(item))),
    games: Object.freeze(games.map(item => Object.freeze(item))), evidenceManifestSha256: manifest ? hashObject(manifest) : null });
  if (allowed) approvedReviews.set(result, { registrySha256: hashObject(registry), baselineSha256: hashObject(baseline),
    sourceCommit: manifest.sourceCommit, frontendVersion: manifest.frontendVersion, backendVersion: manifest.backendVersion,
    gameIds: registry.games.map(game => game.gameId), releaseId: registry.releaseId });
  return result;
}

// This gate is deliberately separate from financial authorization and storage.
// Recovery availability never waives account/session/accepted-round verification.
export function createNewGameGate({ registry, baseline, review } = {}) {
  const proof = approvedReviews.get(review);
  check(proof && review.allowed && proof.registrySha256 === hashObject(registry) &&
    proof.baselineSha256 === hashObject(baseline), 'VERIFIED_RELEASE_REVIEW_REQUIRED');
  const known = new Set(proof.gameIds), enabled = new Set();
  let activated = false, withdrawn = false;
  const snapshot = () => ({ releaseId: proof.releaseId, activated,
    enabledGameIds: [...enabled], disabledGameIds: [...known].filter(id => !enabled.has(id)),
    evidenceManifestSha256: review.evidenceManifestSha256, sourceCommit: proof.sourceCommit });
  return Object.freeze({
    activate({ registry: currentRegistry, baseline: currentBaseline, sourceCommit, frontendVersion, backendVersion }) {
      check(!activated, 'RELEASE_ALREADY_ACTIVATED');
      check(!withdrawn, 'RELEASE_REVIEW_WITHDRAWN');
      check(hashObject(currentRegistry) === proof.registrySha256 && hashObject(currentBaseline) === proof.baselineSha256 &&
        sourceCommit === proof.sourceCommit && frontendVersion === proof.frontendVersion && backendVersion === proof.backendVersion,
        'ACTIVATION_INPUTS_CHANGED');
      proof.gameIds.forEach(id => enabled.add(id)); activated = true;
      return snapshot();
    },
    allowsNewRound(gameId) { return known.has(gameId) ? enabled.has(gameId) : null; },
    recoveryRouteAvailable(gameId) { return known.has(gameId) ? true : null; },
    disableNewRounds({ gameIds = [...known], reason } = {}) {
      check(Array.isArray(gameIds) && gameIds.length > 0 && unique(gameIds) && gameIds.every(id => known.has(id)) &&
        text(reason), 'ROLLBACK_SCOPE_MUST_BE_NEW_GAMES_ONLY');
      gameIds.forEach(id => enabled.delete(id));
      withdrawn = true;
      return { ...snapshot(), reason, acceptedRoundRecoveryPreserved: true };
    },
    snapshot,
  });
}
