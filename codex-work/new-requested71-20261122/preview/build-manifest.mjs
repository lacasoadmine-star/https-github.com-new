import { readFile, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { MODULE_ROOT, REPOSITORY_ROOT, REPOSITORY, SHARED_PATH, SHARED_REPOSITORY_PATH,
  RUNTIME_FILES, typeFor, validateManifest } from './preview-worker.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../..');
const output = path.join(directory, 'preview-manifest.mjs');
const argumentsList = process.argv.slice(2);
const checking = argumentsList.includes('--check');
const pinIndex = argumentsList.indexOf('--commit');
let commit = pinIndex >= 0 ? argumentsList[pinIndex + 1] : null;
if (pinIndex >= 0 && !/^[a-f0-9]{40}$/.test(commit ?? '')) throw Error('A full published GitHub commit SHA is required.');
if (checking && pinIndex < 0) {
  const text = await readFile(output, 'utf8');
  commit = JSON.parse(text.slice('export default '.length).trim().replace(/;$/, '')).sourceCommit;
}
const sources = RUNTIME_FILES.map(name => [MODULE_ROOT + name, REPOSITORY_ROOT + name]);
sources.push([SHARED_PATH, SHARED_REPOSITORY_PATH]);
const paths = new Set(sources.map(([publicPath]) => publicPath));
const entries = [];
for (const [publicPath, repositoryPath] of sources.sort(([a], [b]) => a.localeCompare(b))) {
  const absolute = path.join(repository, repositoryPath);
  if (await realpath(absolute) !== absolute) throw Error('Preview sources must be original regular repository paths.');
  const bytes = await readFile(absolute);
  if (publicPath.endsWith('.mjs')) {
    const code = bytes.toString('utf8');
    if (/\bimport\s*\(/.test(code)) throw Error('Dynamic runtime import requires explicit review: ' + publicPath);
    const imports = [...code.matchAll(/\b(?:import|export)\s+[^;]*?\bfrom\s*['"]([^'"]+)['"]/g),
      ...code.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
    for (const specifier of imports) {
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) throw Error('External runtime import: ' + specifier);
      const resolved = new URL(specifier, 'https://preview.invalid' + publicPath).pathname;
      if (!paths.has(resolved)) throw Error('Runtime import outside exact preview allowlist: ' + resolved);
    }
    if (publicPath === MODULE_ROOT + 'main.mjs' && !code.includes('previewOnly')) throw Error('Explicit previewOnly runtime boundary is required.');
  }
  entries.push({ path: publicPath, repositoryPath, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'), contentType: typeFor(publicPath) });
}
const revision = createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0, 24);
const manifest = { schema: 'zplay/m10-visual-preview/v1', repository: REPOSITORY,
  sourceCommit: commit, revision, entry: MODULE_ROOT + 'main.mjs',
  status: commit ? 'PINNED_BYTES_REQUIRE_REMOTE_VERIFICATION' : 'UNPUBLISHED_COMMIT_REQUIRED',
  visualPreviewOnly: true, financialOperations: false, entries };
validateManifest(manifest, { allowUnpinned: true });
const text = 'export default ' + JSON.stringify(manifest, null, 2) + ';\n';
if (checking) {
  if (await readFile(output, 'utf8') !== text) throw Error('Preview manifest differs from current reviewed source bytes. Rebuild before publication.');
} else await writeFile(output, text);
console.log(JSON.stringify({ mode: checking ? 'check' : 'build', files: entries.length,
  bytes: entries.reduce((sum, item) => sum + item.bytes, 0), revision,
  sourceCommit: commit, financialOperations: false, output }));
