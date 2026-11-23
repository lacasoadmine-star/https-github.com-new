import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transformSuperWildsExistingHost } from './runtime-transform.mjs';
import { createRequested90RuntimeConfiguration } from './runtime-release.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw Error('SUPERWILDS_RUNTIME_PACKAGE_' + code); };
const MODULE = 'native72-batch01/new90-superwilds-runtime.mjs';
const paths = Object.freeze({ runtime: 'native-slot-runtime.mjs',
  nativeBinding: 'native72-batch01/railway-binding.mjs', stateRoutes: 'native72-batch01/existing-server-routes.mjs' });
const outputPaths = Object.freeze({ runtime: paths.runtime,
  nativeBinding: 'native72-batch01/new90-railway-binding.mjs', stateRoutes: 'native72-batch01/new90-existing-server-routes.mjs' });
const ENTRY = 'native72-batch01/new90-m20-release-entry.mjs';
const pack = value => brotliCompressSync(Buffer.from(value), { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }).toString('base64');

/** Decode only the already verified bootstrap data format. This never evals
 * a production wrapper, imports its private runtime, fetches or connects DB.
 */
export function readRetainedRuntimePackage({ functionSource, publicArtifactBytes, expectedFunctionSha256 } = {}) {
  if (typeof functionSource !== 'string' || !/^[a-f0-9]{64}$/.test(expectedFunctionSha256 ?? '') || hash(functionSource) !== expectedFunctionSha256) fail('FUNCTION_IDENTITY');
  const encoded = functionSource.match(/const m20TransportArchive=brotliDecompressSync\(Buffer\.from\('([A-Za-z0-9+/=]+)','base64'\)\);/)?.[1];
  const archiveIdentity = functionSource.match(/if\(m20TransportArchive\.length!==(\d+)\|\|createHash\('sha256'\)\.update\(m20TransportArchive\)\.digest\('hex'\)!=='([a-f0-9]{64})'/);
  const publicIdentity = functionSource.match(/const m20TransportPublic=await fetchM20PublicArtifact\("([^"\n]+)",(\d+),'([a-f0-9]{64})',15000\);/);
  const payloadIdentity = functionSource.match(/if\(payload\.length!==(\d+)\|\|createHash\('sha256'\)\.update\(payload\)\.digest\('hex'\)!=='([a-f0-9]{64})'/);
  if (!encoded || !archiveIdentity || !publicIdentity || !payloadIdentity || !publicArtifactBytes) fail('RETAINED_FORMAT');
  const archiveBytes = brotliDecompressSync(Buffer.from(encoded, 'base64')), pubBytes = Buffer.from(publicArtifactBytes);
  if (archiveBytes.length !== Number(archiveIdentity[1]) || hash(archiveBytes) !== archiveIdentity[2] ||
    pubBytes.length !== Number(publicIdentity[2]) || hash(pubBytes) !== publicIdentity[3]) fail('RETAINED_TRANSPORT_IDENTITY');
  const archive = JSON.parse(archiveBytes), pub = JSON.parse(pubBytes), privateInputs = archive.privateInputs;
  if (pub.schema !== 'zplay-m20-public-transport-v1' || Object.keys(pub).join('|') !== 'schema|sourceText|evidenceText|rawEvidenceBase64') fail('PUBLIC_FORMAT');
  const evidenceText = {}, rawEvidenceBase64 = {};
  for (const kind of ['unit', 'real-postgres', 'browser', 'source', 'operator-policy']) {
    if (['source', 'operator-policy'].includes(kind)) {
      evidenceText[kind] = privateInputs.evidenceText[kind];
      const raw = privateInputs.rawEvidence[kind];
      if (!raw || !['utf8', 'base64'].includes(raw.encoding) || typeof raw.data !== 'string') fail('PRIVATE_FORMAT');
      rawEvidenceBase64[kind] = raw.encoding === 'utf8' ? Buffer.from(raw.data).toString('base64') : raw.data;
    } else { evidenceText[kind] = pub.evidenceText[kind]; rawEvidenceBase64[kind] = pub.rawEvidenceBase64[kind]; }
  }
  const inputs = { schema: privateInputs.schema, recordText: privateInputs.recordText,
    sourceText: pub.sourceText, evidenceText, rawEvidenceBase64 };
  const files = archive.files.map(file => ({ ...file, source: Object.hasOwn(file, 'source') ? file.source :
    file.path === 'native72-batch01/m20-release-inputs.json' ? JSON.stringify(inputs) : pub.sourceText['server/' + file.path.split('/').at(-1)] }));
  const payload = Buffer.from(JSON.stringify(files));
  if (payload.length !== Number(payloadIdentity[1]) || hash(payload) !== payloadIdentity[2] || new Set(files.map(file => file.path)).size !== files.length) fail('RESTORED_PAYLOAD_IDENTITY');
  for (const file of files) {
    if (!/^(?:native-slot-runtime\.mjs|native72-batch01\/[a-z0-9-]+\.(?:mjs|json))$/.test(file.path) ||
      typeof file.source !== 'string' || hash(file.source) !== file.sha256 || Buffer.byteLength(file.source) !== file.bytes) fail('RETAINED_FILE_IDENTITY');
  }
  return { files, publicArtifact: { url: publicIdentity[1], bytes: pubBytes.length, sha256: hash(pubBytes) } };
}

async function bundle(entry, plugins = []) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(entry, import.meta.url))], bundle: true,
    platform: 'node', format: 'esm', target: 'node22', minify: true, write: false, sourcemap: false,
    legalComments: 'none', logLevel: 'silent', loader: { '.sql': 'text' }, plugins });
  if (result.outputFiles.length !== 1) fail('BUNDLE_COUNT');
  return result.outputFiles[0].text;
}

/** Produce the complete reviewable deployment Function while keeping all
 * recovered runtime and private acceptance bytes OUT of the public repo.
 * The existing bootstrap restores and verifies its original exact payload;
 * one pinned additive transform then preserves every unmodified module.
 */
export async function buildSuperWildsRuntimePackage({ functionSource, publicArtifactBytes, expectedFunctionSha256,
  configuration = { attach: false }, publicHostArtifactUrl = null } = {}) {
  if(publicHostArtifactUrl!==null){
    const url=new URL(publicHostArtifactUrl);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)fail('PUBLIC_HOST_URL');
  }
  createRequested90RuntimeConfiguration(configuration); // reject invalid deploy combinations
  const retained = readRetainedRuntimePackage({ functionSource, publicArtifactBytes, expectedFunctionSha256 });
  if (retained.files.some(file => [MODULE, ENTRY, outputPaths.nativeBinding, outputPaths.stateRoutes].includes(file.path))) fail('ALREADY_ATTACHED');
  const input = {}, expectedSha256 = {};
  for (const [name, path] of Object.entries(paths)) {
    const file = retained.files.find(file => file.path === path); if (!file) fail('RETAINED_MODULE_MISSING');
    input[name + 'Source'] = file.source; expectedSha256[name] = file.sha256;
  }
  const transformed = transformSuperWildsExistingHost({ ...input, expectedSha256 });
  const releasePath = fileURLToPath(new URL('./runtime-release.mjs', import.meta.url));
  const releaseSource = await readFile(releasePath, 'utf8');
  const defaultRelease = 'export const requested90RuntimeConfiguration = createRequested90RuntimeConfiguration();';
  if (releaseSource.split(defaultRelease).length !== 2) fail('RELEASE_ANCHOR');
  const compiledRelease = releaseSource.replace(defaultRelease,
    'export const requested90RuntimeConfiguration = createRequested90RuntimeConfiguration(' + JSON.stringify(configuration) + ');');
  const serverSource = await bundle('./runtime-entry.mjs', [{ name: 'explicit-runtime-release', setup(builder) {
    builder.onLoad({ filter: /runtime-release\.mjs$/ }, async args => args.path === releasePath ?
      { contents: compiledRelease, loader: 'js', resolveDir: fileURLToPath(new URL('.', import.meta.url)) } : null);
  } }]);
  const transformSource = await bundle('./runtime-transform.mjs');
  const serverFile = { path: MODULE, bytes: Buffer.byteLength(serverSource), sha256: hash(serverSource), source: serverSource };
  const originalEntry = retained.files.find(file => file.path === 'native72-batch01/m20-release-entry.mjs');
  const entryAnchor = "from './railway-binding.mjs';";
  if (!originalEntry || originalEntry.source.split(entryAnchor).length !== 2) fail('ACCEPTED_ENTRY_ANCHOR');
  const entrySource = originalEntry.source.replace(entryAnchor, "from './new90-railway-binding.mjs';");
  const entryFile = { path: ENTRY, source: entrySource, bytes: Buffer.byteLength(entrySource), sha256: hash(entrySource) };
  const files = retained.files.filter(file => file.path !== paths.runtime).concat(Object.entries(outputPaths).map(([name, path]) => {
    const source = transformed[name + 'Source']; return { path, source, bytes: Buffer.byteLength(source), sha256: hash(source) };
  }), serverFile, entryFile);
  const outputPins = Object.fromEntries(files.filter(file => Object.values(outputPaths).includes(file.path) || [MODULE, ENTRY].includes(file.path))
    .map(({ path, sha256, bytes }) => [path, { sha256, bytes }]));
  // Publish only our new runtime and transform. The accepted private entry is
  // derived in memory from the already verified retained files at boot.
  const publicHostSource=JSON.stringify({schema:'zplay-superwilds-public-host-v1',transformSource,newFiles:[serverFile],expectedSha256,outputPins});
  const publicHostArtifact={bytes:Buffer.byteLength(publicHostSource),sha256:hash(publicHostSource),source:publicHostSource};
  const archiveExpression=publicHostArtifactUrl===null?
    `brotliDecompressSync(Buffer.from('${pack(publicHostSource)}','base64'))`:
    `await fetchM20PublicArtifact(${JSON.stringify(publicHostArtifactUrl)},${publicHostArtifact.bytes},'${publicHostArtifact.sha256}',15000)`;
  const marker = 'const files=JSON.parse(payload.toString(\'utf8\'));';
  if (functionSource.split(marker).length !== 2) fail('BOOTSTRAP_ANCHOR');
  const insertion = `${marker}
// ZPLAY Super Wilds: additive host integration after original payload checks.
const requested90Archive=JSON.parse(${archiveExpression});
if(requested90Archive.schema!=='zplay-superwilds-public-host-v1')throw Error('NEW90_PUBLIC_HOST_FORMAT');
const requested90Transform=await import('data:text/javascript;base64,'+Buffer.from(requested90Archive.transformSource).toString('base64'));
const requested90Sources=${JSON.stringify(paths)};
const requested90Input={expectedSha256:requested90Archive.expectedSha256};
for(const[name,path]of Object.entries(requested90Sources)){const file=files.find(file=>file.path===path);if(!file)throw Error('NEW90_RETAINED_MODULE_MISSING');requested90Input[name+'Source']=file.source;}
const requested90Patched=requested90Transform.transformSuperWildsExistingHost(requested90Input);
const requested90Destinations=${JSON.stringify(outputPaths)};
for(const[name,path]of Object.entries(requested90Destinations)){const source=requested90Patched[name+'Source'];const output={path,source,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex')};if(path===requested90Sources[name])Object.assign(files.find(file=>file.path===path),output);else{if(files.some(file=>file.path===path))throw Error('NEW90_MODULE_ALREADY_EXISTS');files.push(output);}}
for(const file of requested90Archive.newFiles){if(files.some(prior=>prior.path===file.path))throw Error('NEW90_MODULE_ALREADY_EXISTS');files.push(file);}
const requested90AcceptedEntry=files.find(file=>file.path==='native72-batch01/m20-release-entry.mjs');
const requested90EntryAnchor=${JSON.stringify(entryAnchor)};
if(!requested90AcceptedEntry||requested90AcceptedEntry.source.split(requested90EntryAnchor).length!==2)throw Error('NEW90_ACCEPTED_ENTRY_ANCHOR');
const requested90EntrySource=requested90AcceptedEntry.source.replace(requested90EntryAnchor,"from './new90-railway-binding.mjs';");
files.push({path:${JSON.stringify(ENTRY)},source:requested90EntrySource,bytes:Buffer.byteLength(requested90EntrySource),sha256:createHash('sha256').update(requested90EntrySource).digest('hex')});
for(const[path,pin]of Object.entries(requested90Archive.outputPins)){const file=files.find(file=>file.path===path);if(!file||file.bytes!==pin.bytes||file.sha256!==pin.sha256||Buffer.byteLength(file.source)!==pin.bytes||createHash('sha256').update(file.source).digest('hex')!==pin.sha256)throw Error('NEW90_OUTPUT_INTEGRITY');}
`;
  const wrapper = functionSource.replace(marker, insertion);
  const unchanged = retained.files.filter(file => file.path !== paths.runtime);
  if (!unchanged.every(file => files.find(next => next.path === file.path)?.source === file.source)) fail('PRESERVATION');
  const startCommandBytes=Buffer.byteLength('./run.sh ')+Buffer.from(wrapper).toString('base64').length;
  if(publicHostArtifactUrl!==null&&startCommandBytes>=131072)fail('START_COMMAND_ARGUMENT_TOO_LONG');
  return { wrapper, files, publicHostArtifact, report: { schema: 'zplay/superwilds-runtime-package/v1',
    baselineFunctionSha256: expectedFunctionSha256, wrapperSha256: hash(wrapper), wrapperBytes: Buffer.byteLength(wrapper),
    publicArtifact: retained.publicArtifact,
    publicHostArtifact:{url:publicHostArtifactUrl,bytes:publicHostArtifact.bytes,sha256:publicHostArtifact.sha256},
    startCommandBytes,singleArgumentFits:startCommandBytes<131072,
    configuration, unchangedModules: unchanged.length,
    changedModules: [paths.runtime], newModules: [outputPaths.nativeBinding, outputPaths.stateRoutes, MODULE, ENTRY],
    acceptedM20ModulesUnchanged: true, outputPins, transform: transformed.report,
    sameExistingHost: true, createsWallet: false, accountsReset: false, balancesSeeded: false, deployed: false } };
}
