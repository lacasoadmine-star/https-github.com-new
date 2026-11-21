// Lossless transport for an already-built M20 package. This is not an approval
// authority and never deploys or changes a source/evidence/acceptance byte.
// Only the 19 reviewed public source files and three public CI evidence kinds
// may leave the private archive. Review publication separately before uploading.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {REQUIRED_SOURCE_PATHS,EVIDENCE_KINDS} from '../m20-release-policy.mjs';

export const FUNCTION_SOURCE_MAX_BYTES=98295;
export const PUBLIC_EVIDENCE_KINDS=Object.freeze(['unit','real-postgres','browser']);
const PRIVATE_EVIDENCE_KINDS=['source','operator-policy'];
const INPUTS_PATH='native72-batch01/m20-release-inputs.json';
const ENTRY_PATH='native72-batch01/m20-release-entry.mjs';
const EXPECTED_PATHS=['native-slot-runtime.mjs',...[
  'official-math.mjs','sw-nine-pg-adapter.mjs','existing-server-routes.mjs',
  'existing-gamble.mjs','independent-registry.mjs','independent-operator-audit.json',
  'independent-release-pins.json','railway-binding.mjs','m20-release-policy.mjs',
  'm20-release-inputs.json','m20-release-entry.mjs'].map(p=>'native72-batch01/'+p)];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const equalKeys=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort());
const fail=code=>{throw Error(code)};
const utf8=bytes=>new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);

export function validateImmutableGitHubUrl(value){
  let url;
  try{url=new URL(value)}catch{throw Error('M20_TRANSPORT_URL_INVALID')}
  const parts=url.pathname.split('/').slice(1);
  if(typeof value!=='string'||url.href!==value||url.protocol!=='https:'||
    url.hostname!=='raw.githubusercontent.com'||url.port||url.username||url.password||url.search||url.hash||
    parts.length<4||!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(parts[0])||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(parts[1])||!/^[a-f0-9]{40}$/.test(parts[2])||
    parts.slice(3).some(part=>!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part)))
    throw Error('M20_TRANSPORT_URL_INVALID');
  return value;
}

// Kept self-contained so the exact tested implementation is emitted into the
// Function. No credentials, redirects, retries to another origin, or unbounded
// body allocation. The deadline covers both headers and every streamed read.
export async function fetchM20PublicArtifact(url,bytes,sha256,timeoutMs=15000){
  validateImmutableGitHubUrl(url);
  if(!Number.isSafeInteger(bytes)||bytes<1||bytes>8*1024*1024||
    !/^[a-f0-9]{64}$/.test(sha256)||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)
    throw Error('M20_TRANSPORT_LIMIT_INVALID');
  const controller=new AbortController();let reader,timer;
  const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{
    reject(Error('M20_TRANSPORT_TIMEOUT'));controller.abort();
  },timeoutMs)});
  const work=(async()=>{
    const response=await fetch(url,{method:'GET',credentials:'omit',redirect:'error',
      headers:{accept:'application/json'},signal:controller.signal});
    if(response.status!==200||response.redirected||(response.url&&response.url!==url))
      throw Error('M20_TRANSPORT_RESPONSE_INVALID');
    const contentLength=response.headers.get('content-length');
    if(contentLength!==null&&(!/^\d+$/.test(contentLength)||Number(contentLength)!==bytes))
      throw Error('M20_TRANSPORT_LENGTH_MISMATCH');
    if(!response.body||typeof response.body.getReader!=='function')throw Error('M20_TRANSPORT_BODY_MISSING');
    reader=response.body.getReader();const chunks=[];let count=0;
    while(true){
      const item=await reader.read();if(item.done)break;
      if(!(item.value instanceof Uint8Array))throw Error('M20_TRANSPORT_BODY_INVALID');
      count+=item.value.byteLength;
      if(count>bytes)throw Error('M20_TRANSPORT_LENGTH_MISMATCH');
      chunks.push(Buffer.from(item.value));
    }
    if(count!==bytes)throw Error('M20_TRANSPORT_LENGTH_MISMATCH');
    const body=Buffer.concat(chunks,count);
    if(createHash('sha256').update(body).digest('hex')!==sha256)throw Error('M20_TRANSPORT_HASH_MISMATCH');
    return body;
  })();
  try{return await Promise.race([work,deadline])}
  finally{
    clearTimeout(timer);controller.abort();
    // A broken stream must not hold boot open while cancellation is pending.
    if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{})}catch{}}
  }
}

// This reconstructs representation only. The unchanged original loader verifies
// the entire original payload, every individual file and the original policy.
export function restoreM20Payload(archive,publicBytes){
  const pub=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(publicBytes));
  if(pub.schema!=='zplay-m20-public-transport-v1'||
    Object.keys(pub).join('|')!=='schema|sourceText|evidenceText|rawEvidenceBase64')
    throw Error('M20_TRANSPORT_PUBLIC_SCHEMA_INVALID');
  const privateInputs=archive.privateInputs;
  const evidenceText={},rawEvidenceBase64={};
  for(const kind of ['unit','real-postgres','browser','source','operator-policy']){
    if(['source','operator-policy'].includes(kind)){
      evidenceText[kind]=privateInputs.evidenceText[kind];
      const raw=privateInputs.rawEvidence[kind];
      if(!raw||!['utf8','base64'].includes(raw.encoding)||typeof raw.data!=='string')
        throw Error('M20_TRANSPORT_PRIVATE_SCHEMA_INVALID');
      rawEvidenceBase64[kind]=raw.encoding==='utf8'?Buffer.from(raw.data,'utf8').toString('base64'):raw.data;
    }else{
      evidenceText[kind]=pub.evidenceText[kind];rawEvidenceBase64[kind]=pub.rawEvidenceBase64[kind];
    }
  }
  const inputs={schema:privateInputs.schema,recordText:privateInputs.recordText,
    sourceText:pub.sourceText,evidenceText,rawEvidenceBase64};
  return Buffer.from(JSON.stringify(archive.files.map(file=>({
    ...file,source:Object.hasOwn(file,'source')?file.source:
      file.path==='native72-batch01/m20-release-inputs.json'?JSON.stringify(inputs):
      pub.sourceText['server/'+file.path.split('/').at(-1)]
  }))));
}

export function partitionM20Package(wrapperSource){
  if(typeof wrapperSource!=='string')fail('M20_TRANSPORT_WRAPPER_INVALID');
  const declarations=[...wrapperSource.matchAll(/^const payload=brotliDecompressSync\(Buffer\.from\('([A-Za-z0-9+/=]+)','base64'\)\);$/gm)];
  const guards=[...wrapperSource.matchAll(/^if\(payload\.length!==(\d+)\|\|createHash\('sha256'\)\.update\(payload\)\.digest\('hex'\)!=='([a-f0-9]{64})'\)throw Error\('NATIVE72_PACKAGE_INTEGRITY_MISMATCH'\);$/gm)];
  if(declarations.length!==1||guards.length!==1||guards[0].index!==declarations[0].index+declarations[0][0].length+1)
    fail('M20_TRANSPORT_WRAPPER_FORMAT_CHANGED');
  const expectedBytes=Number(guards[0][1]),expectedHash=guards[0][2];
  if(!Number.isSafeInteger(expectedBytes)||expectedBytes<1||expectedBytes>16*1024*1024)
    fail('M20_TRANSPORT_PACKAGE_LIMIT');
  const compressed=Buffer.from(declarations[0][1],'base64');
  if(compressed.toString('base64')!==declarations[0][1])fail('M20_TRANSPORT_PACKAGE_INVALID');
  const payload=brotliDecompressSync(compressed,{maxOutputLength:expectedBytes});
  if(payload.length!==expectedBytes||hash(payload)!==expectedHash)fail('M20_TRANSPORT_PACKAGE_INTEGRITY');
  const files=JSON.parse(utf8(payload));
  if(!Array.isArray(files)||JSON.stringify(files.map(f=>f.path))!==JSON.stringify(EXPECTED_PATHS)||
    !Buffer.from(JSON.stringify(files)).equals(payload))fail('M20_TRANSPORT_FILE_SET_CHANGED');
  for(const file of files){
    if(!equalKeys(file,['path','sha256','bytes','source'])||typeof file.source!=='string'||
      Buffer.byteLength(file.source)!==file.bytes||hash(file.source)!==file.sha256)
      fail('M20_TRANSPORT_MODULE_INTEGRITY');
  }
  const inputFile=files.find(f=>f.path===INPUTS_PATH),inputs=JSON.parse(inputFile.source);
  if(!equalKeys(inputs,['schema','recordText','sourceText','evidenceText','rawEvidenceBase64'])||
    inputs.schema!=='zplay-m20-release-inputs-v1'||typeof inputs.recordText!=='string'||
    !equalKeys(inputs.sourceText,REQUIRED_SOURCE_PATHS)||!equalKeys(inputs.evidenceText,EVIDENCE_KINDS)||
    !equalKeys(inputs.rawEvidenceBase64,EVIDENCE_KINDS))fail('M20_TRANSPORT_INPUTS_SCHEMA_INVALID');
  for(const source of Object.values(inputs.sourceText))if(typeof source!=='string')fail('M20_TRANSPORT_SOURCE_INVALID');
  for(const kind of EVIDENCE_KINDS){
    if(typeof inputs.evidenceText[kind]!=='string'||typeof inputs.rawEvidenceBase64[kind]!=='string'||
      Buffer.from(inputs.rawEvidenceBase64[kind],'base64').toString('base64')!==inputs.rawEvidenceBase64[kind])
      fail('M20_TRANSPORT_EVIDENCE_INVALID');
  }
  for(const file of files.slice(1,-2)){
    if(file.source!==inputs.sourceText['server/'+file.path.split('/').at(-1)])
      fail('M20_TRANSPORT_EXECUTABLE_SOURCE_DRIFT');
  }
  const pick=(value,keys)=>Object.fromEntries(keys.map(key=>[key,value[key]]));
  const publicArtifactBytes=Buffer.from(JSON.stringify({schema:'zplay-m20-public-transport-v1',
    sourceText:inputs.sourceText,evidenceText:pick(inputs.evidenceText,PUBLIC_EVIDENCE_KINDS),
    rawEvidenceBase64:pick(inputs.rawEvidenceBase64,PUBLIC_EVIDENCE_KINDS)}));
  const privateArchive={files:files.map(file=>{
    if([EXPECTED_PATHS[0],ENTRY_PATH].includes(file.path))return file;
    const {source,...metadata}=file;return metadata;
  }),privateInputs:{schema:inputs.schema,recordText:inputs.recordText,
    evidenceText:pick(inputs.evidenceText,PRIVATE_EVIDENCE_KINDS),
    rawEvidence:Object.fromEntries(PRIVATE_EVIDENCE_KINDS.map(kind=>{
      const raw=Buffer.from(inputs.rawEvidenceBase64[kind],'base64');
      try{return[kind,{encoding:'utf8',data:utf8(raw)}]}
      catch{return[kind,{encoding:'base64',data:raw.toString('base64')}]}
    }))}};
  const restored=restoreM20Payload(privateArchive,publicArtifactBytes);
  if(!restored.equals(payload))fail('M20_TRANSPORT_ROUNDTRIP_MISMATCH');
  return {publicArtifactBytes,privateArchive,originalPayload:payload,
    declaration:declarations[0][0],originalPayloadSha256:expectedHash,
    originalInputsSha256:inputFile.sha256,originalInputsBytes:inputFile.bytes,
    acceptanceSha256:hash(inputs.recordText),files:files.map(({source,...metadata})=>metadata)};
}

export function buildM20Transport({wrapperSource,publicArtifactUrl,timeoutMs=15000}){
  validateImmutableGitHubUrl(publicArtifactUrl);
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)fail('M20_TRANSPORT_LIMIT_INVALID');
  const parts=partitionM20Package(wrapperSource),archiveBytes=Buffer.from(JSON.stringify(parts.privateArchive));
  if(parts.publicArtifactBytes.length>8*1024*1024)fail('M20_TRANSPORT_LIMIT_INVALID');
  const packed=brotliCompressSync(archiveBytes,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).toString('base64');
  const bootstrap=[validateImmutableGitHubUrl.toString(),fetchM20PublicArtifact.toString(),restoreM20Payload.toString(),
    `const m20TransportArchive=brotliDecompressSync(Buffer.from('${packed}','base64'));`,
    `if(m20TransportArchive.length!==${archiveBytes.length}||createHash('sha256').update(m20TransportArchive).digest('hex')!=='${hash(archiveBytes)}')throw Error('M20_TRANSPORT_ARCHIVE_INTEGRITY');`,
    `const m20TransportPublic=await fetchM20PublicArtifact(${JSON.stringify(publicArtifactUrl)},${parts.publicArtifactBytes.length},'${hash(parts.publicArtifactBytes)}',${timeoutMs});`,
    `const payload=restoreM20Payload(JSON.parse(m20TransportArchive.toString('utf8')),m20TransportPublic);`
  ].join('\n');
  const functionSource=wrapperSource.replace(parts.declaration,bootstrap);
  const functionBytes=Buffer.byteLength(functionSource),startCommandBytes=9+Buffer.from(functionSource).toString('base64').length;
  if(functionBytes>FUNCTION_SOURCE_MAX_BYTES||startCommandBytes+1>131072)fail('M20_TRANSPORT_FUNCTION_TOO_LARGE');
  return {functionSource,publicArtifactBytes:parts.publicArtifactBytes,report:{
    schema:'zplay-m20-transport-report-v1',originalWrapperSha256:hash(wrapperSource),
    originalWrapperBytes:Buffer.byteLength(wrapperSource),originalPayloadSha256:parts.originalPayloadSha256,
    originalPayloadBytes:parts.originalPayload.length,originalInputsSha256:parts.originalInputsSha256,
    originalInputsBytes:parts.originalInputsBytes,acceptanceSha256:parts.acceptanceSha256,
    wrapperSha256:hash(functionSource),wrapperBytes:functionBytes,startCommandBytes,
    functionSourceMaxBytes:FUNCTION_SOURCE_MAX_BYTES,publicArtifactUrl,
    publicArtifactSha256:hash(parts.publicArtifactBytes),publicArtifactBytes:parts.publicArtifactBytes.length,
    privateArchiveSha256:hash(archiveBytes),privateArchiveBytes:archiveBytes.length,
    publicSourceFiles:REQUIRED_SOURCE_PATHS.length,publicEvidenceKinds:[...PUBLIC_EVIDENCE_KINDS],
    privateEvidenceKinds:[...PRIVATE_EVIDENCE_KINDS],privateAcceptanceRetained:true,
    privateRuntimeRetained:true,originalPayloadRestoredExactly:true,originalLoaderTailUnchanged:true,
    files:parts.files,publicationReviewed:false,deployed:false,productionCalls:0
  }};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  const [wrapperPath,url,outDir]=process.argv.slice(2);
  if(!wrapperPath||!url||!outDir||process.argv.length!==5)
    fail('Usage: node transport.mjs ORIGINAL_FUNCTION IMMUTABLE_PUBLIC_ARTIFACT_URL NEW_PRIVATE_OUTPUT_DIR');
  const result=buildM20Transport({wrapperSource:await readFile(wrapperPath,'utf8'),publicArtifactUrl:url});
  await mkdir(outDir,{mode:0o700});
  await writeFile(outDir+'/function.tsx',result.functionSource,{mode:0o600,flag:'wx'});
  await writeFile(outDir+'/public-transport.json',result.publicArtifactBytes,{mode:0o600,flag:'wx'});
  await writeFile(outDir+'/transport-report.json',JSON.stringify(result.report,null,2)+'\n',{mode:0o600,flag:'wx'});
  console.log(JSON.stringify(result.report));
}
