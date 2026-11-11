import { build, version as esbuildVersion } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checksum = value => createHash('sha256').update(value).digest('hex');
const installFiles = new Set([
  'server/existing-library74-install.mjs', 'server/existing-library74-http.mjs',
  'server/existing-library74-service.mjs', 'server/existing-library74-adapter.mjs',
]);

export async function buildExistingLibrary74({ outdir = resolve(project, 'server/artifacts') } = {}) {
  outdir = resolve(outdir);
  const artifactPath = resolve(outdir, 'existing-library74-installer.mjs');
  const result = await build({
    absWorkingDir: project,
    entryPoints: ['server/existing-library74-install.mjs'],
    outfile: artifactPath,
    bundle: true, format: 'esm', platform: 'node', target: 'es2022',
    write: false, metafile: true, minify: false, sourcemap: false,
    legalComments: 'inline', logLevel: 'silent',
    banner: { js: '// BACKEND INSTALLER: inject the existing service/auth; defaults reject new stakes. This artifact is not a worker/server bootstrap.' },
  });
  const inputFiles = Object.keys(result.metafile.inputs).sort();
  for (const file of inputFiles) {
    if (!installFiles.has(file) && !file.startsWith('math/') && !/^scope\/(official74|requested74)\.json$/.test(file)) throw new Error('UNEXPECTED_BACKEND_BUNDLE_INPUT:' + file);
  }
  const imports = [...new Set(Object.values(result.metafile.outputs).flatMap(output => output.imports.filter(item => item.external).map(item => item.path)))].sort();
  if (imports.some(path => path !== 'node:crypto')) throw new Error('UNEXPECTED_BACKEND_RUNTIME_IMPORT');
  const artifact = result.outputFiles.find(file => file.path === artifactPath)?.contents;
  if (!artifact) throw new Error('BACKEND_BUNDLE_NOT_GENERATED');
  // A data-URL import proves the artifact has no relative runtime imports.
  // Module evaluation can list models but does not instantiate a DB or service.
  const loaded = await import('data:text/javascript;base64,' + Buffer.from(artifact).toString('base64'));
  const definitions = loaded.publicLibrary74Definitions();
  if (definitions.length !== 72 || definitions.some(game => game.accepting || game.launchable)) throw new Error('BACKEND_DEFAULT_READINESS_CHANGED');
  if (definitions.some(game => game.minStake !== '1.00' || game.maxStake !== '4000.00' || game.limits.minBetMinor !== '100' || game.limits.maxBetMinor !== '400000')) throw new Error('BACKEND_STAKE_RANGE_CHANGED');
  const disabled = loaded.createExistingLibrary74Adapter();
  try {
    disabled.start(definitions[0].id, { stakeMinor: '100' }, () => 0, 1794355200000);
    throw new Error('BACKEND_DEFAULT_ACCEPTED_A_STAKE');
  } catch (error) {
    if (error.message !== 'INDEPENDENT74_NEW_ROUNDS_DISABLED') throw error;
  }
  const sources = await Promise.all(inputFiles.map(async path => {
    const bytes = await readFile(resolve(project, path));
    return { path, bytes: bytes.length, sha256: checksum(bytes) };
  }));
  const manifest = {
    format: 'existing-library74-backend-installation-v1',
    artifact: 'existing-library74-installer.mjs', bytes: artifact.length, sha256: checksum(artifact),
    buildTool: `esbuild@${esbuildVersion}`, moduleFormat: 'ESM', runtimeImports: imports,
    defaultNewRoundsEnabled: false, independentModelCount: definitions.length,
    stakeRange: { currency: 'ETB', minimum: '1.00', maximum: '4000.00', minMinor: '100', maxMinor: '400000' },
    containsFinancialServiceImplementation: false, createsDatabase: false, deploysAnything: false,
    dependencyInjection: ['initialized existing LibraryService', 'retained verifyNative', 'retained readNativeBody', 'existing engine secret', 'existing resolveSessionUser', 'previous app fetch handler'],
    models: definitions.map(game => ({ id: game.id, version: game.version, family: game.family })),
    smoke: { import: 'data-url', node: process.versions.node, all72Definitions: true, startsDisabledByDefault: true, stakeRangeVerified: true },
    sources,
  };
  await mkdir(outdir, { recursive: true });
  await writeFile(artifactPath, artifact);
  const manifestPath = resolve(outdir, 'existing-library74-installer.manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return { artifactPath, manifestPath, manifest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outdir = process.argv[2] ? (isAbsolute(process.argv[2]) ? process.argv[2] : resolve(process.cwd(), process.argv[2])) : undefined;
  const result = await buildExistingLibrary74({ outdir });
  console.log(JSON.stringify({ artifact: relative(process.cwd(), result.artifactPath), bytes: result.manifest.bytes, sha256: result.manifest.sha256, models: result.manifest.independentModelCount, defaultsDisabled: true }));
}
