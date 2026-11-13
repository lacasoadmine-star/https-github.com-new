import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {deflateSync} from 'node:zlib';
import {CaptureJournal, atomicWriteJSON} from './capture-journal.mjs';

const run = promisify(execFile);
let scratch, fixtures;
const baseTime = Date.now();
const timestamp = offset => new Date(baseTime + offset).toISOString();
function catalogue() {
  return {source: 'https://www.smartsoftgaming.com/games', capturedAt: timestamp(-1000),
    entries: [{name: 'Logo', url: 'https://example.invalid/ignored'}, {name: 'Logo', url: 'https://example.invalid/ignored'},
      ...Array.from({length: 74}, (_, n) => ({name: `Game ${String(n + 1).padStart(2, '0')}`, url: `https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=Test${n + 1}&Token=DEMO&PortalName=DEMO`}))]};
}
async function context() {
  let elapsed = 0;
  const clock = () => timestamp(elapsed);
  const journal = await CaptureJournal.create({catalogue: catalogue(), runRoot: scratch, clock});
  return {journal, clock, advance: value => {elapsed = value;}};
}
function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) {c ^= byte; for (let n = 0; n < 8; n++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);}
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const tag = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([length, tag, data, crc]);
}
// Synthetic fixtures are exclusively test inputs, never official game evidence.
function png(color) {
  const header = Buffer.alloc(13); header.writeUInt32BE(240); header.writeUInt32BE(240, 4); header[8] = 8; header[9] = 2;
  const pixels = Buffer.alloc(240 * (1 + 240 * 3));
  for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {const p = y * 721 + 1 + x * 3; pixels[p] = color; pixels[p + 1] = x; pixels[p + 2] = y;}
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]);
}
async function makeVideo(name, {seconds = 61, audio = 'tone', motion = true} = {}) {
  const filename = path.join(fixtures, `${name}.mp4`);
  const args = ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', motion ? 'testsrc2=size=320x240:rate=2' : 'color=c=red:s=320x240:r=2'];
  if (audio !== 'none') args.push('-f', 'lavfi', '-i', audio === 'silent' ? 'anullsrc=r=8000:cl=mono' : 'sine=frequency=880:sample_rate=8000');
  args.push('-t', String(seconds), '-c:v', 'mpeg4', '-q:v', '20');
  if (audio !== 'none') args.push('-c:a', 'aac', '-b:a', '24k');
  args.push(filename); await run('ffmpeg', args, {timeout: 30000}); return filename;
}
before(async () => {
  scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'zplay-capture-journal-tests-'));
  fixtures = path.join(scratch, 'fixtures'); await fs.mkdir(fixtures);
  await makeVideo('valid'); await makeVideo('silent', {audio: 'silent'});
  await makeVideo('no-audio', {audio: 'none'}); await makeVideo('short', {seconds: 59});
  await makeVideo('static', {motion: false});
});
after(async () => {await fs.rm(scratch, {recursive: true, force: true});});

async function activeCapture(ctx, fixture = 'valid', shots = 10) {
  const j = ctx.journal, gameId = 'game-01', attempt = await j.begin(gameId), directory = j.attemptDirectory(gameId, attempt.id);
  const action1 = await j.recordAction(gameId, attempt.id, {control: 'spin'});
  ctx.advance(30000); const action2 = await j.recordAction(gameId, attempt.id, {control: 'spin'});
  const duration = fixture === 'short' ? 59000 : 61000;
  ctx.advance(duration + 1000);
  await fs.copyFile(path.join(fixtures, fixture + '.mp4'), path.join(directory, 'capture.mp4'));
  const video = await j.recordMedia(gameId, attempt.id, {kind: 'video', relativePath: 'capture.mp4', captureStartedAt: timestamp(0), captureEndedAt: timestamp(duration)});
  for (let n = 0; n < shots; n++) {
    const relativePath = `shot-${n}.png`; await fs.writeFile(path.join(directory, relativePath), png(n * 17));
    await j.recordMedia(gameId, attempt.id, {kind: 'screenshot', relativePath, captureStartedAt: timestamp(2000 + n * 5000)});
  }
  return {gameId, attemptId: attempt.id, directory, video, actions: [action1.id, action2.id]};
}
async function review(ctx, capture, fromMs = 0, toMs = 60000) {
  return ctx.journal.recordGameplay(capture.gameId, capture.attemptId, {videoId: capture.video.id, fromMs, toMs,
    actionIds: capture.actions, observation: 'reels-moving', reviewed: true});
}

test('initializes exactly 74 fresh empty titles, omitting both Logo heroes', async () => {
  const a = await context(), b = await context();
  assert.equal(a.journal.status().titles, 74); assert.equal(a.journal.queue().length, 74);
  assert.notEqual(a.journal.document.runId, b.journal.document.runId);
  assert.ok(a.journal.document.titles.every(t => t.attempts.length === 0));
});

test('rejects stale catalogues, duplicate names and non-DEMO account links', async () => {
  for (const change of [d => {d.capturedAt = timestamp(-2 * 86400000);}, d => {d.entries[3].name = d.entries[2].name;}, d => {d.entries[2].url = d.entries[2].url.replace('Token=DEMO', 'Token=private-session');}]) {
    const data = catalogue(); change(data);
    await assert.rejects(CaptureJournal.create({catalogue: data, runRoot: scratch, clock: () => timestamp(0)}));
  }
});

test('network failure is retried after cooldown, never skipped merely because a record exists', async () => {
  const ctx = await context(), j = ctx.journal;
  const attempt = await j.begin('game-01'); await j.fail('game-01', attempt.id, {code: 'network-timeout'});
  assert.equal(j.title('game-01').status, 'retryable-network-error');
  assert.equal(j.queue().length, 73);
  ctx.advance(1001); assert.ok(j.queue().some(t => t.id === 'game-01'));
  const retry = await j.begin('game-01'); assert.notEqual(retry.id, attempt.id); assert.equal(j.title('game-01').attempts.length, 2);
});

test('transient retries are bounded; other titles remain available', async () => {
  const ctx = await context(), j = ctx.journal;
  for (let n = 0; n < 4; n++) {ctx.advance(n * 40000); const a = await j.begin('game-01'); await j.fail('game-01', a.id, {code: 'http-503'});}
  ctx.advance(200000);
  assert.equal(j.title('game-01').status, 'retry-exhausted'); assert.equal(j.queue().length, 73);
  await assert.rejects(j.begin('game-01'), /manual/);
});

test('access denial pauses the host, including untouched titles, until explicit reviewed restoration', async () => {
  const ctx = await context(), j = ctx.journal, a = await j.begin('game-01');
  await j.fail('game-01', a.id, {code: 'cloudflare-1010'});
  assert.equal(j.queue().length, 0);
  await assert.rejects(j.acknowledgeHostRestored('eu-server.ssgportal.com'), /manual access review/);
  await j.acknowledgeHostRestored('eu-server.ssgportal.com', {reviewed: true});
  assert.equal(j.queue().length, 74); assert.equal(j.title('game-01').attempts[0].state, 'access-blocked');
});

test('waiting a minute with no reviewed gameplay is partial, not complete', async () => {
  const ctx = await context(), j = ctx.journal, a = await j.begin('game-01');
  ctx.advance(600000); const result = await j.finish('game-01', a.id);
  assert.equal(result.complete, false); assert.equal(result.playedMs, 0);
  assert.ok(j.queue().some(t => t.id === 'game-01'));
});

test('an incomplete temp write does not replace the valid checkpoint during resume', async () => {
  const ctx = await context(), j = ctx.journal, a = await j.begin('game-01');
  await j.recordAction('game-01', a.id, {control: 'help-open'});
  await fs.writeFile(j.filename + '.simulated-crash.tmp', '{"revision":9000,"titles":');
  const reopened = await CaptureJournal.open(j.filename, {clock: ctx.clock});
  assert.equal(reopened.title('game-01').attempts[0].actions[0].control, 'help-open');
  assert.equal(await reopened.recoverInterrupted(), 1);
  assert.ok(reopened.queue().some(t => t.id === 'game-01'));
  const next = await reopened.begin('game-01'); assert.equal(next.actions.length, 0); assert.equal(next.evidence.length, 0);
});

test('a malformed canonical checkpoint fails closed, without silently losing completed work', async () => {
  const ctx = await context(); await fs.writeFile(ctx.journal.filename, '{"schemaVersion":1,');
  await assert.rejects(CaptureJournal.open(ctx.journal.filename), SyntaxError);
});

test('a stale sequential writer cannot overwrite a newer checkpoint', async () => {
  const ctx = await context(), other = await CaptureJournal.open(ctx.journal.filename, {clock: ctx.clock});
  await ctx.journal.begin('game-01'); await assert.rejects(other.checkpoint(), /JOURNAL_CONFLICT/);
});

test('private or financial payloads and fabricated media verification flags are rejected', async () => {
  const ctx = await context(), j = ctx.journal, a = await j.begin('game-01');
  await assert.rejects(j.recordAction('game-01', a.id, {control: 'spin', balance: 999}), /Unsupported field/);
  await assert.rejects(j.fail('game-01', a.id, {code: 'network-timeout', response: {account: 'private'}}), /Unsupported field/);
  await assert.rejects(j.recordMedia('game-01', a.id, {kind: 'video', relativePath: 'fake.mp4', captureStartedAt: timestamp(0), audible: true, durationMs: 60000}), /Unsupported field/);
});

test('real decoded media, reviewed live-motion intervals, ten distinct shots and audible recording pass the structural gate', async () => {
  const ctx = await context(), capture = await activeCapture(ctx); await review(ctx, capture);
  const result = await ctx.journal.finish(capture.gameId, capture.attemptId);
  assert.equal(result.complete, true); assert.equal(result.playedMs, 60000); assert.equal(result.recordedAudioMs, 60000);
  assert.equal(result.screenshots, 10); assert.equal(ctx.journal.status().counts.complete, 1);
  assert.equal(ctx.journal.queue().length, 73);
});

test('nine screenshots remain partial; copying a screenshot does not create a tenth observation', async () => {
  const ctx = await context(), capture = await activeCapture(ctx, 'valid', 9); await review(ctx, capture);
  await fs.copyFile(path.join(capture.directory, 'shot-0.png'), path.join(capture.directory, 'duplicate.png'));
  await assert.rejects(ctx.journal.recordMedia(capture.gameId, capture.attemptId, {kind: 'screenshot', relativePath: 'duplicate.png', captureStartedAt: timestamp(55000)}), /Duplicate/);
  const result = await ctx.journal.finish(capture.gameId, capture.attemptId);
  assert.equal(result.complete, false); assert.ok(result.problems.includes('under-ten-distinct-screenshots'));
});

for (const fixture of ['silent', 'no-audio']) test(`${fixture} video cannot be reported as captured gameplay sound`, async () => {
  const ctx = await context(), capture = await activeCapture(ctx, fixture); await review(ctx, capture);
  const result = await ctx.journal.finish(capture.gameId, capture.attemptId);
  assert.equal(result.playedMs, 60000); assert.equal(result.recordedAudioMs, 0); assert.equal(result.complete, false);
  assert.ok(result.problems.includes('missing-or-silent-gameplay-audio'));
});

test('a short recording cannot be extended by a claimed 60-second observation', async () => {
  const ctx = await context(), capture = await activeCapture(ctx, 'short');
  await assert.rejects(review(ctx, capture, 0, 60000), /outside verified video duration/);
  await review(ctx, capture, 0, 58000);
  const result = await ctx.journal.finish(capture.gameId, capture.attemptId);
  assert.equal(result.complete, false); assert.equal(result.playedMs, 58000);
});

test('a still picture encoded as a minute of video cannot count as live play', async () => {
  const ctx = await context(), capture = await activeCapture(ctx, 'static');
  await assert.rejects(review(ctx, capture), /Static or insufficient/);
  assert.equal((await ctx.journal.assess(capture.gameId, capture.attemptId)).playedMs, 0);
});

test('overlapping reviewed intervals count their union, never double the played time', async () => {
  const ctx = await context(), capture = await activeCapture(ctx);
  await review(ctx, capture, 0, 40000);
  await ctx.journal.recordGameplay(capture.gameId, capture.attemptId, {videoId: capture.video.id, fromMs: 20000, toMs: 50000, actionIds: [capture.actions[1]], observation: 'reels-moving', reviewed: true});
  const result = await ctx.journal.finish(capture.gameId, capture.attemptId);
  assert.equal(result.playedMs, 50000); assert.equal(result.complete, false);
});

test('actions and video from a previous attempt cannot be mixed into the next attempt', async () => {
  const ctx = await context(), capture = await activeCapture(ctx); await ctx.journal.finish(capture.gameId, capture.attemptId);
  const next = await ctx.journal.begin(capture.gameId);
  await assert.rejects(ctx.journal.recordGameplay(capture.gameId, next.id, {videoId: capture.video.id, fromMs: 0, toMs: 60000, actionIds: capture.actions, observation: 'reels-moving', reviewed: true}), /same attempt/);
});

test('media hash changes invalidate evidence at the completion gate', async () => {
  const ctx = await context(), capture = await activeCapture(ctx); await review(ctx, capture);
  await fs.appendFile(path.join(capture.directory, 'capture.mp4'), 'changed');
  const result = await ctx.journal.finish(capture.gameId, capture.attemptId);
  assert.equal(result.complete, false); assert.equal(result.playedMs, 0); assert.ok(result.problems.some(p => p.startsWith('missing-or-changed:')));
});

test('a completed attempt returns to partial if evidence disappears before resume', async () => {
  const ctx = await context(), capture = await activeCapture(ctx); await review(ctx, capture);
  assert.equal((await ctx.journal.finish(capture.gameId, capture.attemptId)).complete, true);
  await fs.unlink(path.join(capture.directory, 'shot-0.png'));
  const resumed = await CaptureJournal.open(ctx.journal.filename, {clock: ctx.clock});
  assert.equal(resumed.title(capture.gameId).status, 'partial');
  assert.ok(resumed.queue().some(t => t.id === capture.gameId));
});

test('evidence symlinks outside the attempt and old files are rejected', async () => {
  const ctx = await context(), j = ctx.journal, a = await j.begin('game-01'), directory = j.attemptDirectory('game-01', a.id);
  await fs.symlink(path.join(fixtures, 'valid.mp4'), path.join(directory, 'outside.mp4'));
  ctx.advance(62000);
  await assert.rejects(j.recordMedia('game-01', a.id, {kind: 'video', relativePath: 'outside.mp4', captureStartedAt: timestamp(0), captureEndedAt: timestamp(61000)}), /escaped/);
  await fs.writeFile(path.join(directory, 'old.png'), png(44));
  await fs.utimes(path.join(directory, 'old.png'), new Date(baseTime - 86400000), new Date(baseTime - 86400000));
  await assert.rejects(j.recordMedia('game-01', a.id, {kind: 'screenshot', relativePath: 'old.png', captureStartedAt: timestamp(1000)}), /Old files/);
});

test('an arbitrary renamed text file is not accepted as a screenshot', async () => {
  const ctx = await context(), j = ctx.journal, a = await j.begin('game-01');
  await fs.writeFile(path.join(j.attemptDirectory('game-01', a.id), 'fake.png'), 'this is not captured pixels');
  await assert.rejects(j.recordMedia('game-01', a.id, {kind: 'screenshot', relativePath: 'fake.png', captureStartedAt: timestamp(0)}));
});

test('resuming cannot silently weaken the completion requirements', async () => {
  const ctx = await context(); ctx.journal.document.requirements.screenshots = 0;
  await atomicWriteJSON(ctx.journal.filename, ctx.journal.document);
  await assert.rejects(CaptureJournal.open(ctx.journal.filename), /cannot be weakened/);
});
