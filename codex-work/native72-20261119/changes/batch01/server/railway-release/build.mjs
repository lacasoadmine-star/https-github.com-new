// Build an additive package from the exact currently deployed runtime.
// Reads no environment variables, opens no network and cannot enable wagering.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliCompressSync,constants} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const BASELINE_SHA256='9ed186420e58330388e96aa62c9f4dea70d82ae596bfd57060d66053b981dfa3';
const sha=value=>createHash('sha256').update(value).digest('hex');
const helpers=['official-math.mjs','sw-nine-pg-adapter.mjs','existing-server-routes.mjs',
  'existing-gamble.mjs','independent-registry.mjs','independent-operator-audit.json',
  'independent-release-pins.json','railway-binding.mjs'];

export function patchExistingRuntime(source){
  if(sha(source)!==BASELINE_SHA256)throw Error('DEPLOYED_RUNTIME_BASELINE_CHANGED');
  const patches=[];
  const replace=(before,after)=>{
    if(source.split(before).length!==2)throw Error('RUNTIME_INSERTION_POINT_CHANGED');
    patches.push({before,after});source=source.replace(before,after);
  };
  const original=source;
  replace('import pg from "pg";',
    'import {createNative72Batch01Binding} from "./native72-batch01/railway-binding.mjs";\nimport pg from "pg";');
  replace('  async function transaction(fn) {',
    '  const native72Batch01 = await createNative72Batch01Binding({authenticate,transaction,lockWallets,move,balance,houseFor,hash,cash,accepting:()=>accepting,publicGames});\n  async function transaction(fn) {');
  replace('nativeSchemaCompatibility: nativeSchemaProbe.get(), activeModels:',
    'native72Batch01: native72Batch01.releaseInfo(), nativeSchemaCompatibility: nativeSchemaProbe.get(), activeModels:');
  replace('const games = publicGames().map((g2) =>',
    'const games = native72Batch01.publicGames().map((g2) =>');
  replace('      if (req.method === "GET" && path === "/api/fresh-state") return json(await freshReleaseFor',
    '      if (req.method === "GET" && path === "/api/fresh-state" && native72Batch01.handles(url.searchParams.get("gameId"))) return json(await native72Batch01.state(req,url.searchParams.get("gameId")));\n      if (req.method === "GET" && path === "/api/fresh-state") return json(await freshReleaseFor');
  replace('        if (path === "/api/spin") return json(await settle(req, body));',
    '        if (path === "/api/spin" && native72Batch01.handles(body?.gameId)) return json(await native72Batch01.spin(req,body));\n        if (path === "/api/spin") return json(await settle(req, body));');
  replace('        if (path === "/api/gamble") return json(await action(req, body, "GAMBLE"));',
    '        if (path === "/api/gamble" && native72Batch01.handles(body?.gameId)) return json(await native72Batch01.gamble(req,body));\n        if (path === "/api/gamble") return json(await action(req, body, "GAMBLE"));');
  let restored=source;
  for(const {before,after} of [...patches].reverse())restored=restored.replace(after,before);
  if(restored!==original)throw Error('RETAINED_RUNTIME_CHANGED');
  return {source,insertions:patches.length,retainedRuntimeExact:true};
}

export async function buildRailwayPackage({baselinePath,outDir}){
  const baseline=await readFile(baselinePath),patched=patchExistingRuntime(baseline.toString('utf8'));
  const records=[{path:'native-slot-runtime.mjs',bytes:Buffer.from(patched.source)}];
  for(const file of helpers)records.push({path:'native72-batch01/'+file,
    bytes:await readFile(new URL('../'+file,import.meta.url))});
  const files=records.map(({path,bytes})=>({path,sha256:sha(bytes),bytes:bytes.length,source:bytes.toString('utf8')}));
  const payload=Buffer.from(JSON.stringify(files));
  const encoded=brotliCompressSync(payload,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).toString('base64');
  const wrapper=`import pg from 'pg';\nimport Redis from 'ioredis';\nimport {brotliDecompressSync} from 'node:zlib';\nimport {createHash} from 'node:crypto';\nimport {writeFile,mkdir} from 'node:fs/promises';\nvoid pg;void Redis;\nconst payload=brotliDecompressSync(Buffer.from('${encoded}','base64'));\nif(payload.length!==${payload.length}||createHash('sha256').update(payload).digest('hex')!=='${sha(payload)}')throw Error('NATIVE72_PACKAGE_INTEGRITY_MISMATCH');\nconst files=JSON.parse(payload.toString('utf8'));\nawait mkdir(new URL('./native72-batch01/',import.meta.url),{recursive:true,mode:0o700});\nfor(const file of files){\n if(!/^(?:native-slot-runtime\\.mjs|native72-batch01\\/[a-z0-9-]+\\.(?:mjs|json))$/.test(file.path))throw Error('NATIVE72_PACKAGE_PATH_INVALID');\n const bytes=Buffer.from(file.source,'utf8');\n if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('NATIVE72_MODULE_INTEGRITY_MISMATCH');\n await writeFile(new URL('./'+file.path,import.meta.url),bytes,{mode:0o600});\n}\nawait import(new URL('./native-slot-runtime.mjs',import.meta.url).href);\n`;
  await mkdir(outDir,{recursive:true});
  const report={release:'native72-batch01-20261121-r2',baselineSha256:BASELINE_SHA256,
    runtimeSha256:sha(patched.source),wrapperSha256:sha(wrapper),wrapperBytes:Buffer.byteLength(wrapper),
    insertions:patched.insertions,retainedRuntimeExact:patched.retainedRuntimeExact,
    files:files.map(({source,...file})=>file),realMoneyEnabled:false,newServices:0,newDatabases:0,
    newTables:0,environmentVariablesChanged:[],deployed:false};
  await Promise.all([writeFile(outDir+'/function.tsx',wrapper),
    writeFile(outDir+'/report.json',JSON.stringify(report,null,2)+'\n'),
    writeFile(outDir+'/runtime.mjs',patched.source)]);
  return report;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  if(!process.argv[2]||!process.argv[3])throw Error('BASELINE_PATH_AND_OUTPUT_DIRECTORY_REQUIRED');
  console.log(JSON.stringify(await buildRailwayPackage({baselinePath:process.argv[2],outDir:process.argv[3]})));
}
