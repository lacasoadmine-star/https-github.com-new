// Offline evidence bookkeeping. This module never opens a URL or sends a wager.
import { promises as fs, createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const CONTROLS = new Set(['spin', 'stop', 'play', 'start', 'cashout', 'autoplay-start', 'autoplay-stop', 'tap', 'bet-open', 'bet-adjust', 'paytable-open', 'settings-open', 'sound-toggle', 'music-toggle', 'help-open', 'fullscreen-toggle', 'close-panel']);
const GAMEPLAY_CONTROLS = new Set(['spin', 'stop', 'play', 'start', 'cashout', 'autoplay-start', 'tap']);
const NETWORK_CODES = new Set(['network-timeout', 'connection-reset', 'dns-failure', 'http-429', 'http-500', 'http-502', 'http-503', 'http-504']);
const ACCESS_CODES = new Set(['access-denied', 'captcha', 'cloudflare-1010', 'protocol-denied']);
const OTHER_CODES = new Set(['capture-interrupted', 'media-missing', 'audio-unavailable', 'capture-error']);
const POLICY = Object.freeze({gameplayMs: 60000, screenshots: 10, maxTransientRetries: 3, firstRetryMs: 1000, maxRetryMs: 30000});

function ensure(ok, message) { if (!ok) throw new Error(message); }
function exact(object, keys) {
  ensure(object && typeof object === 'object' && !Array.isArray(object), 'An object is required');
  for (const key of Object.keys(object)) ensure(keys.includes(key), `Unsupported field: ${key}`);
}
function iso(value) { ensure(typeof value === 'string' && Number.isFinite(Date.parse(value)), 'A timestamp is required'); return new Date(value).toISOString(); }
function ms(value) { return Date.parse(iso(value)); }
function safeName(name) { return String(name).normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function digest(value) { return createHash('sha256').update(value).digest('hex'); }
async function fileHash(filename) { const hash = createHash('sha256'); for await (const bytes of createReadStream(filename)) hash.update(bytes); return hash.digest('hex'); }
function publicDemoHref(raw) {
  ensure(typeof raw === 'string' && raw.length < 2048, 'Invalid public demo URL');
  let url = new URL(raw);
  ensure(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && !url.hash, 'Only public HTTP(S) demo links are accepted');
  if (url.hostname === 'www.google.com' && url.pathname === '/url') url = new URL(url.searchParams.get('q'));
  ensure(['eu-server.ssgportal.com', 'www.smartsoftgaming.com'].includes(url.hostname), 'Unrecognized catalogue host');
  ensure(/\/GameLauncher\/Loader\.aspx$/i.test(url.pathname), 'A recorded demo launcher is required');
  ensure(['DEMO', 'DEMO_EXH'].includes(url.searchParams.get('Token')?.toUpperCase()), 'Only public DEMO tokens are accepted');
  ensure(url.searchParams.get('PortalName')?.toLowerCase() === 'demo', 'Only the public DEMO portal is accepted');
  for (const key of url.searchParams.keys()) ensure(['GameCategory', 'GameName', 'Token', 'PortalName', 'ReturnUrl', 'Lang'].includes(key), `Unapproved launcher parameter: ${key}`);
  return raw; // Preserve the observed href, including malformed provider links.
}
function effectiveHost(href) { const u = new URL(href); return u.hostname === 'www.google.com' ? new URL(u.searchParams.get('q')).hostname : u.hostname; }
function checkNoPrivatePayload(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    ensure(!/wallet|balance|account|playerid|session|password|credit|debit|payout|transaction|serverresponse|clienttoken|roundresult/i.test(key), `Private/financial payload field is forbidden: ${key}`);
    checkNoPrivatePayload(child);
  }
}
function unionLength(intervals) {
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  let total = 0, start = null, end = null;
  for (const [a, b] of sorted) {
    if (start === null) { start = a; end = b; }
    else if (a <= end) end = Math.max(end, b);
    else { total += end - start; start = a; end = b; }
  }
  return total + (start === null ? 0 : end - start);
}

// The old valid checkpoint survives a process crash before rename. A leftover
// temporary file is deliberately never interpreted as a successful checkpoint.
export async function atomicWriteJSON(filename, value) {
  const temp = `${filename}.${randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(filename), {recursive: true, mode: 0o700});
  let handle;
  try {
    handle = await fs.open(temp, 'wx', 0o600);
    await handle.writeFile(JSON.stringify(value, null, 2) + '\n');
    await handle.sync(); await handle.close(); handle = null;
    await fs.rename(temp, filename);
    const directory = await fs.open(path.dirname(filename), 'r');
    try { await directory.sync(); } finally { await directory.close(); }
  } finally { await handle?.close().catch(() => {}); await fs.unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

async function probe(filename) {
  const {stdout} = await execFileAsync('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_entries', 'format=duration:stream=index,codec_type,codec_name,width,height,duration', '-of', 'json', filename], {timeout: 30000, maxBuffer: 1024 * 1024});
  const data = JSON.parse(stdout), streams = data.streams || [];
  const video = streams.find(s => s.codec_type === 'video'), audio = streams.find(s => s.codec_type === 'audio');
  const duration = Number(data.format?.duration || video?.duration || audio?.duration || 0);
  return {durationMs: Number.isFinite(duration) ? Math.round(duration * 1000) : 0,
    width: video?.width || 0, height: video?.height || 0, videoCodec: video?.codec_name || null,
    hasVideo: Boolean(video), hasAudio: Boolean(audio)};
}
async function audible(filename) {
  const {stderr} = await execFileAsync('ffmpeg', ['-nostdin', '-hide_banner', '-protocol_whitelist', 'file,pipe', '-i', filename, '-map', '0:a:0', '-af', 'volumedetect', '-vn', '-f', 'null', '-'], {timeout: 30000, maxBuffer: 1024 * 1024});
  const peak = /max_volume:\s*(-?\d+(?:\.\d+)?|-?inf)\s*dB/.exec(stderr)?.[1];
  const mean = /mean_volume:\s*(-?\d+(?:\.\d+)?|-?inf)\s*dB/.exec(stderr)?.[1];
  const peakDb = Number(peak), meanDb = Number(mean);
  return {audible: Number.isFinite(peakDb) && peakDb > -60 && Number.isFinite(meanDb) && meanDb > -80,
    peakDb: Number.isFinite(peakDb) ? peakDb : null, meanDb: Number.isFinite(meanDb) ? meanDb : null};
}
async function inspectMotion(filename, fromMs, toMs) {
  const {stdout} = await execFileAsync('ffmpeg', ['-nostdin', '-v', 'error', '-protocol_whitelist', 'file,pipe', '-ss', String(fromMs / 1000), '-i', filename, '-t', String((toMs - fromMs) / 1000), '-an', '-vf', 'fps=2,scale=32:32', '-f', 'framemd5', '-'], {timeout: 30000, maxBuffer: 2 * 1024 * 1024});
  const hashes = stdout.split('\n').filter(line => line && !line.startsWith('#')).map(line => line.split(',').at(-1).trim());
  const bins = [];
  for (let i = 0; i < hashes.length; i += 20) bins.push(new Set(hashes.slice(i, i + 20)).size);
  const enoughFrames = hashes.length >= Math.floor((toMs - fromMs) / 1000);
  return {sampleCount: hashes.length, distinctFrames: new Set(hashes).size,
    // Every reviewed ten-second window must contain an actual frame change.
    moving: enoughFrames && bins.length > 0 && bins.every(count => count >= 2)};
}

export class CaptureJournal {
  constructor(filename, document, clock = () => new Date().toISOString()) {
    this.filename = path.resolve(filename); this.directory = path.dirname(this.filename);
    this.document = document; this.clock = clock; this.diskRevision = document.revision;
  }
  static async create({catalogue, runRoot, clock = () => new Date().toISOString()}) {
    exact(catalogue, ['source', 'capturedAt', 'entries']);
    const startedAt = iso(clock());
    ensure(ms(catalogue.capturedAt) <= ms(startedAt), 'Catalogue timestamp is in the future');
    ensure(ms(startedAt) - ms(catalogue.capturedAt) <= 24 * 3600000, 'A current catalogue capture is required; old evidence is not imported');
    ensure(catalogue.source === 'https://www.smartsoftgaming.com/games', 'The current official catalogue is required');
    ensure(Array.isArray(catalogue.entries), 'Catalogue entries are required');
    const cards = catalogue.entries.filter(entry => entry.name?.trim() !== 'Logo');
    ensure(cards.length === 74, `Expected 74 actual game cards, received ${cards.length}`);
    const titles = cards.map(entry => {
      exact(entry, ['name', 'url']);
      const name = entry.name.trim(), id = safeName(name);
      ensure(id && name.length <= 120, 'Invalid title name');
      return {id, name, launchHref: publicDemoHref(entry.url), status: 'pending', attempts: []};
    });
    ensure(new Set(titles.map(t => t.id)).size === 74, 'Duplicate game names need explicit catalogue reconciliation');
    const runId = randomUUID(), directory = path.join(path.resolve(runRoot), runId);
    await fs.mkdir(directory, {recursive: true, mode: 0o700});
    const document = {schemaVersion: 1, runId, revision: 0, startedAt, updatedAt: startedAt,
      catalogue: {source: catalogue.source, capturedAt: iso(catalogue.capturedAt), sha256: digest(JSON.stringify(catalogue))},
      requirements: {...POLICY}, hostPauses: [], titles};
    const journal = new CaptureJournal(path.join(directory, 'journal.json'), document, clock);
    journal.diskRevision = null; await journal.checkpoint(); return journal;
  }
  static async open(filename, {clock = () => new Date().toISOString()} = {}) {
    const document = JSON.parse(await fs.readFile(filename, 'utf8'));
    checkNoPrivatePayload(document);
    exact(document, ['schemaVersion', 'runId', 'revision', 'startedAt', 'updatedAt', 'catalogue', 'requirements', 'hostPauses', 'titles']);
    ensure(document.schemaVersion === 1 && Number.isSafeInteger(document.revision), 'Unsupported journal');
    ensure(path.basename(path.dirname(path.resolve(filename))) === document.runId, 'Journal must remain in its own run directory');
    ensure(JSON.stringify(document.requirements) === JSON.stringify(POLICY), 'Completion requirements cannot be weakened on resume');
    ensure(document.titles?.length === 74, 'Incomplete title inventory');
    const journal = new CaptureJournal(filename, document, clock);
    let changed = false;
    // A prior completion is not retained when the supporting bytes disappeared
    // or changed between sessions. No earlier/other attempt is substituted.
    for (const title of document.titles) if (title.status === 'complete') {
      const attempt = title.attempts.at(-1);
      ensure(attempt?.state === 'complete', 'Malformed completed attempt');
      const assessment = await journal.assess(title.id, attempt.id);
      if (!assessment.complete) {title.status = attempt.state = 'partial'; attempt.assessment = assessment; changed = true;}
    }
    if (changed) await journal.checkpoint();
    return journal;
  }
  now() { return iso(this.clock()); }
  title(id) { const title = this.document.titles.find(t => t.id === id); ensure(title, `Unknown title: ${id}`); return title; }
  attempt(id, attemptId, active = true) {
    const title = this.title(id), attempt = title.attempts.find(a => a.id === attemptId);
    ensure(attempt, 'Unknown attempt');
    if (active) ensure(attempt.state === 'capturing' && title.attempts.at(-1) === attempt, 'This attempt is closed');
    return {title, attempt};
  }
  attemptDirectory(id, attemptId) { this.attempt(id, attemptId, false); return path.join(this.directory, 'captures', id, attemptId); }
  async checkpoint() {
    checkNoPrivatePayload(this.document);
    ensure(JSON.stringify(this.document.requirements) === JSON.stringify(POLICY), 'Completion requirements cannot be weakened');
    let current = null;
    try { current = JSON.parse(await fs.readFile(this.filename, 'utf8')).revision; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    ensure(current === this.diskRevision, 'JOURNAL_CONFLICT: reload the current checkpoint before writing');
    const next = {...this.document, revision: (this.diskRevision ?? 0) + 1, updatedAt: this.now()};
    await atomicWriteJSON(this.filename, next); this.document = next; this.diskRevision = next.revision;
  }
  queue() {
    const now = ms(this.now());
    return this.document.titles.filter(t => {
      if (['complete', 'capturing', 'access-blocked', 'retry-exhausted'].includes(t.status)) return false;
      if (this.document.hostPauses.some(p => p.host === effectiveHost(t.launchHref) && !p.resolvedAt)) return false;
      return !t.attempts.at(-1)?.retryAt || ms(t.attempts.at(-1).retryAt) <= now;
    }).map(t => ({id: t.id, name: t.name, status: t.status}));
  }
  async begin(id) {
    ensure(this.queue().some(t => t.id === id), 'Title is active, complete, cooling down, or requires manual access/retry review');
    const title = this.title(id), startedAt = this.now();
    const attempt = {id: randomUUID(), startedAt, endedAt: null, state: 'capturing', actions: [], gameplay: [], evidence: [], failure: null, retryAt: null, assessment: null};
    title.attempts.push(attempt); title.status = 'capturing';
    await fs.mkdir(this.attemptDirectory(id, attempt.id), {recursive: true, mode: 0o700});
    await this.checkpoint(); return structuredClone(attempt);
  }
  async recordAction(id, attemptId, input) {
    exact(input, ['control', 'at', 'x', 'y']);
    ensure(CONTROLS.has(input.control), 'Only UI control identifiers are accepted');
    const {attempt} = this.attempt(id, attemptId), at = iso(input.at || this.now());
    ensure(ms(at) >= ms(attempt.startedAt) && ms(at) <= ms(this.now()), 'Action is outside this live attempt');
    const action = {id: randomUUID(), control: input.control, at};
    for (const key of ['x', 'y']) if (input[key] !== undefined) { ensure(Number.isFinite(input[key]) && input[key] >= 0 && input[key] <= 16000, 'Invalid pointer coordinate'); action[key] = input[key]; }
    attempt.actions.push(action); await this.checkpoint(); return structuredClone(action);
  }
  async evidenceFile(id, attemptId, relativePath) {
    ensure(typeof relativePath === 'string' && relativePath.length <= 240 && !path.isAbsolute(relativePath) && !relativePath.split(/[\\/]/).includes('..'), 'Evidence must be relative to its own attempt directory');
    const root = await fs.realpath(this.attemptDirectory(id, attemptId)), filename = await fs.realpath(path.join(root, relativePath));
    ensure(filename.startsWith(root + path.sep), 'Evidence path escaped its attempt directory');
    const stat = await fs.stat(filename); ensure(stat.isFile() && stat.size > 0 && stat.size <= 1024 ** 3, 'Missing, empty, or oversized evidence file');
    return {filename, stat};
  }
  async recordMedia(id, attemptId, input) {
    exact(input, ['kind', 'relativePath', 'captureStartedAt', 'captureEndedAt']);
    ensure(['screenshot', 'video', 'audio'].includes(input.kind), 'Unknown evidence kind');
    const {attempt} = this.attempt(id, attemptId), start = iso(input.captureStartedAt), end = iso(input.captureEndedAt || start);
    ensure(ms(start) >= ms(attempt.startedAt) && ms(end) >= ms(start) && ms(end) <= ms(this.now()), 'Media timestamps must belong to this attempt');
    const {filename, stat} = await this.evidenceFile(id, attemptId, input.relativePath);
    ensure(stat.mtimeMs >= ms(attempt.startedAt) - 2000 && stat.ctimeMs >= ms(attempt.startedAt) - 2000, 'Old files cannot be imported as fresh captures');
    const sha256 = await fileHash(filename);
    ensure(!attempt.evidence.some(e => e.sha256 === sha256), 'Duplicate media bytes are not additional evidence');
    const media = await probe(filename);
    if (input.kind === 'screenshot') {
      ensure(['png', 'mjpeg', 'webp'].includes(media.videoCodec) && media.width >= 200 && media.height >= 200 && media.durationMs < 1000, 'A decoded PNG, JPEG, or WebP screenshot of the game is required');
      ensure(ms(end) === ms(start), 'A screenshot has one capture timestamp');
    } else {
      ensure(media.durationMs > 0 && media.durationMs <= 10 * 60000, 'Recorded media needs a verified duration of at most ten minutes');
      ensure(Math.abs((ms(end) - ms(start)) - media.durationMs) <= 2000, 'Recording duration does not match its capture interval');
      ensure(input.kind === 'audio' ? media.hasAudio : media.hasVideo && media.width >= 200 && media.height >= 200, 'The required media stream is missing');
    }
    const audio = input.kind !== 'screenshot' && media.hasAudio ? await audible(filename) : {audible: false, peakDb: null, meanDb: null};
    const evidence = {id: randomUUID(), kind: input.kind, relativePath: input.relativePath, sha256, bytes: stat.size,
      captureStartedAt: start, captureEndedAt: end, recordedAt: this.now(), ...media, ...audio};
    attempt.evidence.push(evidence); await this.checkpoint(); return structuredClone(evidence);
  }
  async recordGameplay(id, attemptId, input) {
    exact(input, ['videoId', 'fromMs', 'toMs', 'actionIds', 'observation', 'reviewed']);
    ensure(input.reviewed === true && ['reels-moving', 'game-scene-changing'].includes(input.observation), 'Explicit review of live gameplay motion is required');
    const {attempt} = this.attempt(id, attemptId), video = attempt.evidence.find(e => e.id === input.videoId && e.kind === 'video');
    ensure(video, 'Gameplay needs video from this same attempt');
    ensure(Number.isSafeInteger(input.fromMs) && Number.isSafeInteger(input.toMs) && input.fromMs >= 0 && input.toMs - input.fromMs >= 1000 && input.toMs <= video.durationMs, 'Gameplay interval is outside verified video duration');
    ensure(Array.isArray(input.actionIds) && input.actionIds.length > 0, 'Gameplay must be linked to observed UI actions');
    const from = ms(video.captureStartedAt) + input.fromMs, to = ms(video.captureStartedAt) + input.toMs;
    for (const actionId of input.actionIds) {
      const action = attempt.actions.find(a => a.id === actionId);
      ensure(action && GAMEPLAY_CONTROLS.has(action.control) && ms(action.at) >= from - 2000 && ms(action.at) <= to, 'Gameplay action must be from this attempt and recording interval');
    }
    const {filename} = await this.evidenceFile(id, attemptId, video.relativePath);
    ensure(await fileHash(filename) === video.sha256, 'Video changed after inspection');
    const motion = await inspectMotion(filename, input.fromMs, input.toMs);
    ensure(motion.moving, 'Static or insufficient video frames cannot be counted as played time');
    const observation = {id: randomUUID(), videoId: video.id, fromMs: input.fromMs, toMs: input.toMs,
      actionIds: [...new Set(input.actionIds)], observation: input.observation, reviewedAt: this.now(), motion};
    attempt.gameplay.push(observation); await this.checkpoint(); return structuredClone(observation);
  }
  async assess(id, attemptId) {
    const {attempt} = this.attempt(id, attemptId, false), problems = [], usable = [];
    for (const evidence of attempt.evidence) {
      try {
        const {filename, stat} = await this.evidenceFile(id, attemptId, evidence.relativePath);
        if (stat.size !== evidence.bytes || await fileHash(filename) !== evidence.sha256) throw new Error('Changed media');
        usable.push(evidence);
      } catch { problems.push(`missing-or-changed:${evidence.id}`); }
    }
    const intervals = [], actions = new Set();
    for (const segment of attempt.gameplay) {
      const video = usable.find(e => e.id === segment.videoId && e.kind === 'video');
      if (!video || !segment.motion?.moving) continue;
      intervals.push([ms(video.captureStartedAt) + segment.fromMs, ms(video.captureStartedAt) + segment.toMs]);
      for (const actionId of segment.actionIds) actions.add(actionId);
    }
    const playedMs = unionLength(intervals), screenshots = new Set(usable.filter(e => e.kind === 'screenshot').map(e => e.sha256)).size;
    const audioIntervals = usable.filter(e => e.kind !== 'screenshot' && e.hasAudio && e.audible).map(e => [ms(e.captureStartedAt), ms(e.captureStartedAt) + e.durationMs]);
    const recordedAudioMs = unionLength(audioIntervals.flatMap(([a, b]) => intervals.map(([c, d]) => [Math.max(a, c), Math.min(b, d)]).filter(([c, d]) => d > c)));
    if (playedMs < POLICY.gameplayMs) problems.push('under-60s-reviewed-gameplay');
    if (actions.size < 2) problems.push('under-two-observed-gameplay-actions');
    if (screenshots < POLICY.screenshots) problems.push('under-ten-distinct-screenshots');
    if (recordedAudioMs < POLICY.gameplayMs) problems.push('missing-or-silent-gameplay-audio');
    return {complete: problems.length === 0, playedMs, screenshots, recordedAudioMs, observedActions: actions.size, problems};
  }
  async finish(id, attemptId) {
    const {title, attempt} = this.attempt(id, attemptId), assessment = await this.assess(id, attemptId);
    attempt.assessment = assessment; attempt.endedAt = this.now();
    attempt.state = title.status = assessment.complete ? 'complete' : 'partial';
    await this.checkpoint(); return structuredClone(assessment);
  }
  async fail(id, attemptId, input) {
    exact(input, ['code', 'retryAfterMs']);
    ensure(NETWORK_CODES.has(input.code) || ACCESS_CODES.has(input.code) || OTHER_CODES.has(input.code), 'Use a recognized failure code; raw server/account payloads are forbidden');
    ensure(input.retryAfterMs === undefined || Number.isSafeInteger(input.retryAfterMs) && input.retryAfterMs >= 0 && input.retryAfterMs <= 86400000, 'Invalid retry-after delay');
    const {title, attempt} = this.attempt(id, attemptId), at = this.now();
    attempt.failure = {code: input.code, at}; attempt.endedAt = at;
    if (ACCESS_CODES.has(input.code)) {
      attempt.state = title.status = 'access-blocked';
      const host = effectiveHost(title.launchHref);
      if (!this.document.hostPauses.some(p => p.host === host && !p.resolvedAt)) this.document.hostPauses.push({host, code: input.code, at, resolvedAt: null});
    } else if (NETWORK_CODES.has(input.code)) {
      const failures = title.attempts.filter(a => NETWORK_CODES.has(a.failure?.code)).length;
      attempt.state = title.status = failures > POLICY.maxTransientRetries ? 'retry-exhausted' : 'retryable-network-error';
      const delay = Math.min(POLICY.maxRetryMs, POLICY.firstRetryMs * 2 ** (failures - 1));
      attempt.retryAt = new Date(ms(at) + Math.max(delay, input.retryAfterMs || 0)).toISOString();
    } else attempt.state = title.status = 'partial';
    await this.checkpoint(); return title.status;
  }
  async recoverInterrupted() {
    let count = 0;
    for (const title of this.document.titles) for (const attempt of title.attempts) if (attempt.state === 'capturing') {
      attempt.state = 'interrupted'; attempt.endedAt = this.now(); attempt.failure = {code: 'capture-interrupted', at: this.now()}; title.status = 'partial'; count++;
    }
    if (count) await this.checkpoint(); return count;
  }
  async acknowledgeHostRestored(host, {reviewed} = {}) {
    ensure(reviewed === true, 'A manual access review is required; no client/proxy bypass is performed');
    const pause = this.document.hostPauses.find(p => p.host === host && !p.resolvedAt); ensure(pause, 'No paused host');
    pause.resolvedAt = this.now();
    for (const title of this.document.titles) if (title.status === 'access-blocked' && effectiveHost(title.launchHref) === host) title.status = 'partial';
    await this.checkpoint();
  }
  status() {
    const counts = {}; for (const title of this.document.titles) counts[title.status] = (counts[title.status] || 0) + 1;
    return {runId: this.document.runId, journal: this.filename, titles: this.document.titles.length, counts,
      readyForAttempt: this.queue().length, pausedHosts: this.document.hostPauses.filter(p => !p.resolvedAt).map(p => p.host)};
  }
}

async function cli() {
  const [command, filename, gameId, attemptId] = process.argv.slice(2);
  if (command === 'init') {
    const catalogue = JSON.parse(await fs.readFile(filename, 'utf8'));
    const journal = await CaptureJournal.create({catalogue, runRoot: gameId});
    process.stdout.write(JSON.stringify(journal.status(), null, 2) + '\n'); return;
  }
  ensure(['status', 'next', 'begin', 'event', 'recover', 'allow-host'].includes(command), 'Usage: init CATALOGUE RUN_ROOT | status/next JOURNAL | begin JOURNAL GAME_ID | event JOURNAL GAME_ID ATTEMPT_ID < JSON | recover JOURNAL | allow-host JOURNAL HOST');
  const journal = await CaptureJournal.open(filename); let result;
  if (command === 'status') result = journal.status();
  if (command === 'next') result = journal.queue();
  if (command === 'begin') { result = await journal.begin(gameId); result.directory = journal.attemptDirectory(gameId, result.id); }
  if (command === 'recover') result = {recovered: await journal.recoverInterrupted(), ...journal.status()};
  if (command === 'allow-host') { await journal.acknowledgeHostRestored(gameId, {reviewed: true}); result = journal.status(); }
  if (command === 'event') {
    let raw = ''; for await (const chunk of process.stdin) { raw += chunk; ensure(raw.length <= 16384, 'Oversized event'); }
    const event = JSON.parse(raw); exact(event, ['type', 'data']);
    const method = {action: 'recordAction', media: 'recordMedia', gameplay: 'recordGameplay', failure: 'fail', finish: 'finish'}[event.type];
    ensure(method, 'Unknown event type'); result = await journal[method](gameId, attemptId, event.data);
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
