import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, realpath, unlink } from 'node:fs/promises';
import path from 'node:path';
import { CaptureError } from './evidence-capture.mjs';

const ID = /^[a-z0-9][a-z0-9_-]{0,127}$/i;
const SHA = /^[a-f0-9]{64}$/i;
const TYPES = new Map([
  ['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/webp', 'webp'],
  ['video/webm', 'webm'], ['video/mp4', 'mp4'], ['audio/webm', 'webm'],
  ['audio/wav', 'wav'], ['audio/ogg', 'ogg'], ['audio/mpeg', 'mp3'],
]);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new CaptureError(code); };

function hasSignature(bytes, type) {
  if (type === 'image/png') return bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (type === 'image/jpeg') return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === 'image/webp' || type === 'audio/wav') return bytes.subarray(0, 4).toString() === 'RIFF' &&
    bytes.subarray(8, 12).toString() === (type === 'image/webp' ? 'WEBP' : 'WAVE');
  if (type.endsWith('/webm')) return bytes.subarray(0, 4).equals(Buffer.from('1a45dfa3', 'hex'));
  if (type === 'video/mp4') return bytes.subarray(4, 8).toString() === 'ftyp';
  if (type === 'audio/ogg') return bytes.subarray(0, 4).toString() === 'OggS';
  if (type === 'audio/mpeg') return bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 255 && (bytes[1] & 224) === 224;
  return false;
}

/** Store under private research storage: session IDs/round observations are not public release data. */
export class FileEvidenceStore {
  constructor(root) {
    this.root = path.resolve(root);
    this.sessionQueue = Promise.resolve();
  }

  directory(gameId) {
    if (!ID.test(gameId)) fail('INVALID_GAME_PATH');
    return path.join(this.root, gameId);
  }

  async atomicJson(target, data) {
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(data, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    await rename(temporary, target);
  }

  async load(gameId) {
    try { return JSON.parse(await readFile(path.join(this.directory(gameId), 'capture.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }

  async acquireGame(gameId) {
    const directory = this.directory(gameId);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, '.capture.lock');
    const ownerId = randomUUID();
    try { await writeFile(file, JSON.stringify({ ownerId, processId: process.pid }), { mode: 0o600, flag: 'wx' }); }
    catch (error) { if (error.code === 'EEXIST') fail('CAPTURE_ALREADY_RUNNING'); throw error; }
    return async () => {
      const owner = JSON.parse(await readFile(file, 'utf8'));
      if (owner.ownerId !== ownerId) fail('CAPTURE_LOCK_OWNER_CHANGED');
      await unlink(file);
    };
  }

  async save(gameId, state) {
    if (state.gameId !== gameId) fail('CHECKPOINT_GAME_MISMATCH');
    await this.atomicJson(path.join(this.directory(gameId), 'capture.json'), state);
  }

  async claimSession(sessionId, gameId) {
    if (typeof sessionId !== 'string' || !sessionId || !ID.test(gameId)) fail('INVALID_SESSION_CLAIM');
    const claim = this.sessionQueue.then(async () => {
      const file = path.join(this.root, 'session-owners', digest(sessionId) + '.json');
      await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      try { await writeFile(file, JSON.stringify({ gameId }), { mode: 0o600, flag: 'wx' }); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (JSON.parse(await readFile(file, 'utf8')).gameId !== gameId) fail('SESSION_ALREADY_USED_FOR_ANOTHER_GAME');
      }
    });
    this.sessionQueue = claim.catch(() => {});
    return claim;
  }

  async putArtifact(gameId, input, label) {
    if (!input || !['screenshot', 'video', 'audio'].includes(input.kind) ||
      !TYPES.has(input.mediaType) || !(input.bytes instanceof Uint8Array)) fail('INVALID_ARTIFACT');
    const bytes = Buffer.from(input.bytes);
    if (!bytes.length || !hasSignature(bytes, input.mediaType)) fail('INVALID_ARTIFACT_CONTENT');
    if (input.kind === 'screenshot' && !input.mediaType.startsWith('image/')) fail('INVALID_SCREENSHOT_TYPE');
    if (input.kind !== 'screenshot' && !input.mediaType.startsWith(input.kind + '/')) fail('INVALID_RECORDING_TYPE');
    const safeLabel = String(label).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const sha256 = digest(bytes);
    const name = `${safeLabel}-${sha256}.${TYPES.get(input.mediaType)}`;
    const relativePath = path.posix.join(gameId, 'artifacts', name);
    const file = path.join(this.directory(gameId), 'artifacts', name);
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    try { await writeFile(file, bytes, { mode: 0o600, flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (digest(await readFile(file)) !== sha256) fail('EXISTING_ARTIFACT_HASH_MISMATCH');
    }
    return { artifactId: `${safeLabel}:${sha256}`, kind: input.kind, mediaType: input.mediaType,
      relativePath, sha256, byteLength: bytes.length,
      captureRole: typeof input.captureRole === 'string' ? input.captureRole : null,
      controlId: typeof input.controlId === 'string' ? input.controlId : null,
      actionIds: Array.isArray(input.actionIds) ? [...input.actionIds] : [],
      durationMs: Number.isFinite(input.durationMs) ? input.durationMs : null,
      capturedAt: typeof input.capturedAt === 'string' ? input.capturedAt : null,
      provenance: typeof input.provenance === 'string' ? input.provenance : null };
  }

  async verifyArtifacts(manifest) {
    for (const artifact of manifest.artifacts ?? []) {
      if (!SHA.test(artifact.sha256 ?? '') || typeof artifact.relativePath !== 'string') fail('INVALID_ARTIFACT_INDEX');
      const target = path.resolve(this.root, artifact.relativePath);
      const gameDirectory = this.directory(manifest.gameId);
      if (!target.startsWith(gameDirectory + path.sep + 'artifacts' + path.sep)) fail('ARTIFACT_PATH_OUTSIDE_GAME');
      const actual = await realpath(target);
      if (!actual.startsWith(await realpath(gameDirectory) + path.sep + 'artifacts' + path.sep)) fail('ARTIFACT_SYMLINK_OUTSIDE_GAME');
      const bytes = await readFile(actual);
      if (bytes.length !== artifact.byteLength || digest(bytes) !== artifact.sha256) fail('ARTIFACT_HASH_MISMATCH');
    }
  }
}
