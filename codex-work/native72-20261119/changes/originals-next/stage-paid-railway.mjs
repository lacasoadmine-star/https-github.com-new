import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { brotliCompressSync, brotliDecompressSync } from 'node:zlib';

const [downloadedSource, destination, expectedRuntimeSha] = process.argv.slice(2);
if (!downloadedSource || !destination || !/^[a-f0-9]{64}$/.test(expectedRuntimeSha ?? '')) {
  throw Error('Usage: node stage-paid-railway.mjs RAILWAY_BOOTSTRAP OUTPUT REVIEWED_RUNTIME_SHA256');
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const original = await readFile(downloadedSource, 'utf8');
const compressed = original.match(/Buffer\.from\('([A-Za-z0-9+/=]+)','base64'\)/)?.[1];
if (!compressed) throw Error('UNRECOGNIZED_RAILWAY_BOOTSTRAP');
const previous = brotliDecompressSync(Buffer.from(compressed, 'base64'));
if (hash(previous) !== expectedRuntimeSha) throw Error('ACTIVE_RAILWAY_RUNTIME_CHANGED');

function replaceOnce(source, match, replacement) {
  if (source.split(match).length !== 2) throw Error('RETAINED_RAILWAY_RUNTIME_CHANGED');
  return source.replace(match, replacement);
}

async function embed(url) {
  let code = await readFile(url, 'utf8');
  for (const [line, dependency] of code.matchAll(/^import [^\n]+ from '(\.\/[^']+)'/gm)) {
    code = code.replace(line, line.replace(dependency, 'data:text/javascript;base64,' + await embed(new URL(dependency, url))));
  }
  return Buffer.from(code).toString('base64');
}
const encoded = await embed(new URL('paid-core.mjs', import.meta.url));
const source = previous.toString('utf8');
const registry = source.match(/const Originals = await import\("data:text\/javascript;base64,[A-Za-z0-9+/=]+"\);/)?.[0];
if (!registry) throw Error('MISSING_ORIGINALS_REGISTRY');
let updated = replaceOnce(source, registry, registry.replace('const Originals', 'const ExistingOriginals') +
  '\nconst {extendOriginals} = await import("data:text/javascript;base64,' + encoded + '");' +
  '\nconst Originals = extendOriginals(ExistingOriginals, {paidIds: process.env.ZPLAY_NEW_ORIGINALS_PAID_IDS?.split(",").filter(Boolean) ?? []});');
updated = replaceOnce(updated, 'version: Originals.VERSION });', 'version: Originals.VERSION, nextGames: Originals.nextManifest });');
updated = replaceOnce(updated, 'const g = allGames.find((g2) => g2.id === gameId);',
  'const g = allGames.find((g2) => g2.id === gameId);\n' +
  '    const nextModel = Originals.nextModel(gameId);\n' +
  '    if (nextModel && body.identity !== uid) fail(403, "PLAYER_SESSION_CHANGED");\n' +
  '    if (nextModel && (body.mathVersion !== nextModel.mathVersion || !nextModel.betLevels.includes(bet))) fail(409, "GAME_RULES_UPDATED_RELOAD");');
updated = replaceOnce(updated, 'JSON.stringify(result), originalMathHash, false]',
  'JSON.stringify(result), nextModel?.mathSha256 ?? originalMathHash, false]');
const next = Buffer.from(updated), packed = brotliCompressSync(next).toString('base64');
let output = replaceOnce(original, compressed, packed);
output = replaceOnce(output, 'bytes.length!==' + previous.length, 'bytes.length!==' + next.length);
output = replaceOnce(output, expectedRuntimeSha, hash(next));
await writeFile(destination, output, { mode: 0o600 });
console.log(JSON.stringify({ runtimeSha256: hash(next), activeGameSelection: 'disabled by default' }));
