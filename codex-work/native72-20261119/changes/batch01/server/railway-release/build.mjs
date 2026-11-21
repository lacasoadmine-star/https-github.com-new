// Build an additive package from the exact currently deployed runtime.
// No environment reads, network, deployment or wallet access. With no acceptance
// arguments it reproduces frozen, closed r2. Future r3 requires reviewed evidence.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {createIndependentRegistry} from '../independent-registry.mjs';
import {createM20ReleasePolicy,M20_ARTIFACT_SHA256,M20_GAME_ID,EVIDENCE_KINDS,
  isReleaseSourcePath} from '../m20-release-policy.mjs';

export const BASELINE_SHA256='9ed186420e58330388e96aa62c9f4dea70d82ae596bfd57060d66053b981dfa3';
const sha=value=>createHash('sha256').update(value).digest('hex');
const R2_WRAPPER_SHA256='c552025a7287de008c2d5d4fd6d57ede95c0640dfd941a7036f97bd8c195d0a6';
const R2_RUNTIME_SHA256='23d14712d193519d9878fd956c6429bf739d45e5593d92904dce027cc4446f48';
const R2_REPORT_SHA256='961ed9790b4aee8b768540c3ed9078c390b01d616df9ad12aa35e43dcf99c83d';
const helpers=['official-math.mjs','sw-nine-pg-adapter.mjs','existing-server-routes.mjs',
  'existing-gamble.mjs','independent-registry.mjs','independent-operator-audit.json',
  'independent-release-pins.json','railway-binding.mjs','m20-release-policy.mjs'];

function insertions(bindingModule){
  if(!['railway-binding.mjs','m20-release-entry.mjs'].includes(bindingModule))throw Error('RELEASE_ENTRY_NOT_SUPPORTED');
  return [
    ['import pg from "pg";',`import {createNative72Batch01Binding} from "./native72-batch01/${bindingModule}";\nimport pg from "pg";`],
    ['  async function transaction(fn) {','  const native72Batch01 = await createNative72Batch01Binding({authenticate,transaction,lockWallets,move,balance,houseFor,hash,cash,accepting:()=>accepting,publicGames});\n  async function transaction(fn) {'],
    ['nativeSchemaCompatibility: nativeSchemaProbe.get(), activeModels:','native72Batch01: native72Batch01.releaseInfo(), nativeSchemaCompatibility: nativeSchemaProbe.get(), activeModels:'],
    ['const games = publicGames().map((g2) =>','const games = native72Batch01.publicGames().map((g2) =>'],
    ['      if (req.method === "GET" && path === "/api/fresh-state") return json(await freshReleaseFor','      if (req.method === "GET" && path === "/api/fresh-state" && native72Batch01.handles(url.searchParams.get("gameId"))) return json(await native72Batch01.state(req,url.searchParams.get("gameId")));\n      if (req.method === "GET" && path === "/api/fresh-state") return json(await freshReleaseFor'],
    ['        if (path === "/api/spin") return json(await settle(req, body));','        if (path === "/api/spin" && native72Batch01.handles(body?.gameId)) return json(await native72Batch01.spin(req,body));\n        if (path === "/api/spin") return json(await settle(req, body));'],
    ['        if (path === "/api/gamble") return json(await action(req, body, "GAMBLE"));','        if (path === "/api/gamble" && native72Batch01.handles(body?.gameId)) return json(await native72Batch01.gamble(req,body));\n        if (path === "/api/gamble") return json(await action(req, body, "GAMBLE"));']
  ];
}
export function retainedBaseline(source){
  if(sha(source)===BASELINE_SHA256)return source;
  if(sha(source)!==R2_RUNTIME_SHA256)throw Error('DEPLOYED_RUNTIME_BASELINE_CHANGED');
  for(const [before,after] of insertions('railway-binding.mjs').reverse()){
    if(source.split(after).length!==2)throw Error('RUNTIME_INSERTION_POINT_CHANGED');
    source=source.replace(after,before);
  }
  if(sha(source)!==BASELINE_SHA256)throw Error('RETAINED_RUNTIME_CHANGED');
  return source;
}
export function patchExistingRuntime(source,{bindingModule='railway-binding.mjs'}={}){
  source=retainedBaseline(source);
  const original=source,patches=insertions(bindingModule);
  for(const [before,after] of patches){
    if(source.split(before).length!==2)throw Error('RUNTIME_INSERTION_POINT_CHANGED');
    source=source.replace(before,after);
  }
  let restored=source;
  for(const [before,after] of [...patches].reverse())restored=restored.replace(after,before);
  if(restored!==original)throw Error('RETAINED_RUNTIME_CHANGED');
  return {source,insertions:patches.length,retainedRuntimeExact:true};
}

export async function loadFrozenR2(){
  const [wrapper,reportBytes]=await Promise.all([readFile(new URL('./function-r2.tsx',import.meta.url)),
    readFile(new URL('./release-r2.json',import.meta.url))]);
  if(sha(wrapper)!==R2_WRAPPER_SHA256)throw Error('FROZEN_R2_WRAPPER_CHANGED');
  if(sha(reportBytes)!==R2_REPORT_SHA256)throw Error('FROZEN_R2_REPORT_CHANGED');
  const report=JSON.parse(reportBytes),encoded=wrapper.toString('utf8').match(/brotliDecompressSync\(Buffer\.from\('([A-Za-z0-9+/=]+)','base64'\)\)/)?.[1];
  if(!encoded||report.wrapperSha256!==R2_WRAPPER_SHA256||report.runtimeSha256!==R2_RUNTIME_SHA256||
     report.realMoneyEnabled!==false)throw Error('FROZEN_R2_REPORT_CHANGED');
  const files=JSON.parse(brotliDecompressSync(Buffer.from(encoded,'base64')));
  for(const file of files){
    if(typeof file.source!=='string'||sha(file.source)!==file.sha256||Buffer.byteLength(file.source)!==file.bytes)
      throw Error('FROZEN_R2_MODULE_CHANGED');
  }
  if(JSON.stringify(files.map(({source,...file})=>file))!==JSON.stringify(report.files))throw Error('FROZEN_R2_REPORT_CHANGED');
  const runtime=files.find(f=>f.path==='native-slot-runtime.mjs')?.source;
  if(!runtime||sha(runtime)!==R2_RUNTIME_SHA256)throw Error('FROZEN_R2_RUNTIME_CHANGED');
  return {wrapper,report,reportBytes,runtime};
}
async function writePackage(outDir,wrapper,report,runtime,reportBytes=null){
  await mkdir(outDir,{recursive:true});
  await Promise.all([writeFile(outDir+'/function.tsx',wrapper),
    writeFile(outDir+'/report.json',reportBytes??JSON.stringify(report,null,2)+'\n'),
    writeFile(outDir+'/runtime.mjs',runtime)]);
  return report;
}
export async function readReleaseAcceptance({acceptancePath,evidenceDir}){
  if(!acceptancePath||!evidenceDir)throw Error('REVIEWED_ACCEPTANCE_AND_EVIDENCE_REQUIRED');
  const recordBytes=await readFile(acceptancePath),record=JSON.parse(recordBytes),sourceBytes={},evidenceBytes={},rawEvidenceBytes={};
  if(record.decision!=='ACCEPTED')throw Error('M20_RELEASE_ACCEPTANCE_PENDING');
  if(!record.sources||typeof record.sources!=='object'||Array.isArray(record.sources))throw Error('M20_RELEASE_SOURCE_MANIFEST_INVALID');
  for(const path of Object.keys(record.sources)){
    if(!isReleaseSourcePath(path))throw Error('M20_RELEASE_SOURCE_MANIFEST_INVALID');
    sourceBytes[path]=await readFile(new URL('../../'+path,import.meta.url));
  }
  for(const kind of EVIDENCE_KINDS){
    evidenceBytes[kind]=await readFile(evidenceDir+'/'+kind+'.json');
    rawEvidenceBytes[kind]=await readFile(evidenceDir+'/'+kind+'.raw');
  }
  const inputs={recordBytes,expectedRecordSha256:sha(recordBytes),sourceBytes,evidenceBytes,rawEvidenceBytes};
  const registry=createIndependentRegistry({artifactBytes:sourceBytes['server/independent-operator-audit.json'],
    evaluatorBytes:sourceBytes['server/official-math.mjs'],expectedArtifactSha256:M20_ARTIFACT_SHA256});
  const policy=createM20ReleasePolicy({...inputs,registry});
  return {inputs,policy};
}
export async function buildRailwayPackage({baselinePath,outDir,acceptancePath,evidenceDir}){
  const baseline=await readFile(baselinePath);
  // Reproducing historical r2 must not silently include today's helper edits.
  if(acceptancePath===undefined&&evidenceDir===undefined){
    const patched=patchExistingRuntime(baseline.toString('utf8')),frozen=await loadFrozenR2();
    if(patched.source!==frozen.runtime)throw Error('FROZEN_R2_RUNTIME_CHANGED');
    return writePackage(outDir,frozen.wrapper,frozen.report,frozen.runtime,frozen.reportBytes);
  }
  const {inputs,policy}=await readReleaseAcceptance({acceptancePath,evidenceDir});
  const patched=patchExistingRuntime(baseline.toString('utf8'),{bindingModule:'m20-release-entry.mjs'});
  const records=[{path:'native-slot-runtime.mjs',bytes:Buffer.from(patched.source)}];
  for(const file of helpers)records.push({path:'native72-batch01/'+file,
    bytes:await readFile(new URL('../'+file,import.meta.url))});
  // Bind packaged executable helpers to the accepted source bytes, including
  // changes made concurrently between the first source read and packaging.
  for(const item of records.slice(1)){
    const path='server/'+item.path.split('/').at(-1);
    if(sha(item.bytes)!==sha(inputs.sourceBytes[path]))throw Error('M20_RELEASE_SOURCE_CHANGED_DURING_BUILD');
  }
  const bundle={schema:'zplay-m20-release-inputs-v1',recordText:inputs.recordBytes.toString('utf8'),
    sourceText:Object.fromEntries(Object.entries(inputs.sourceBytes).map(([path,b])=>[path,b.toString('utf8')])),
    evidenceText:Object.fromEntries(Object.entries(inputs.evidenceBytes).map(([kind,b])=>[kind,b.toString('utf8')])),
    rawEvidenceBase64:Object.fromEntries(Object.entries(inputs.rawEvidenceBytes).map(([kind,b])=>[kind,b.toString('base64')]))};
  const entry=`import {createNative72Batch01Binding as bind} from './railway-binding.mjs';\nimport {loadM20ReleaseInputs} from './m20-release-policy.mjs';\nconst releaseAcceptance=await loadM20ReleaseInputs(new URL('./m20-release-inputs.json',import.meta.url),'${policy.recordSha256}');\nexport const createNative72Batch01Binding=existing=>bind(existing,{releaseAcceptance});\n`;
  records.push({path:'native72-batch01/m20-release-inputs.json',bytes:Buffer.from(JSON.stringify(bundle))},
    {path:'native72-batch01/m20-release-entry.mjs',bytes:Buffer.from(entry)});
  const files=records.map(({path,bytes})=>({path,sha256:sha(bytes),bytes:bytes.length,source:bytes.toString('utf8')}));
  const payload=Buffer.from(JSON.stringify(files));
  const encoded=brotliCompressSync(payload,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).toString('base64');
  const wrapper=`import pg from 'pg';\nimport Redis from 'ioredis';\nimport {brotliDecompressSync} from 'node:zlib';\nimport {createHash} from 'node:crypto';\nimport {writeFile,mkdir} from 'node:fs/promises';\nvoid pg;void Redis;\nconst payload=brotliDecompressSync(Buffer.from('${encoded}','base64'));\nif(payload.length!==${payload.length}||createHash('sha256').update(payload).digest('hex')!=='${sha(payload)}')throw Error('NATIVE72_PACKAGE_INTEGRITY_MISMATCH');\nconst files=JSON.parse(payload.toString('utf8'));\nawait mkdir(new URL('./native72-batch01/',import.meta.url),{recursive:true,mode:0o700});\nfor(const file of files){\n if(!/^(?:native-slot-runtime\\.mjs|native72-batch01\\/[a-z0-9-]+\\.(?:mjs|json))$/.test(file.path))throw Error('NATIVE72_PACKAGE_PATH_INVALID');\n const bytes=Buffer.from(file.source,'utf8');\n if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('NATIVE72_MODULE_INTEGRITY_MISMATCH');\n await writeFile(new URL('./'+file.path,import.meta.url),bytes,{mode:0o600});\n}\nawait import(new URL('./native-slot-runtime.mjs',import.meta.url).href);\n`;
  const report={release:policy.release,baselineSha256:BASELINE_SHA256,inputRuntimeSha256:sha(baseline),
    runtimeSha256:sha(patched.source),wrapperSha256:sha(wrapper),wrapperBytes:Buffer.byteLength(wrapper),
    insertions:patched.insertions,retainedRuntimeExact:patched.retainedRuntimeExact,
    files:files.map(({source,...file})=>file),acceptanceSha256:policy.recordSha256,
    sourceSha256:policy.sourceSha256,enabledGamesOnDeployment:[M20_GAME_ID],
    m20ApprovalPackaged:true,globalAcceptingGatePreserved:true,productionChangesPerformed:false,newServices:0,newDatabases:0,
    newTables:0,environmentVariablesChanged:[],deployed:false};
  return writePackage(outDir,wrapper,report,patched.source);
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  if(!process.argv[2]||!process.argv[3])throw Error('BASELINE_PATH_AND_OUTPUT_DIRECTORY_REQUIRED');
  console.log(JSON.stringify(await buildRailwayPackage({baselinePath:process.argv[2],outDir:process.argv[3],
    acceptancePath:process.argv[4],evidenceDir:process.argv[5]})));
}
