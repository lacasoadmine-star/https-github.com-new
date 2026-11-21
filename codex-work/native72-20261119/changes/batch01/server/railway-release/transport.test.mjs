// Synthetic transport fixtures only. Never import a real runtime, contact a
// provider/production URL, publish evidence, or access a wallet in this suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
import {REQUIRED_SOURCE_PATHS,EVIDENCE_KINDS} from '../m20-release-policy.mjs';
import {FUNCTION_SOURCE_MAX_BYTES,buildM20Transport,partitionM20Package,
  restoreM20Payload,validateImmutableGitHubUrl} from './transport.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const url='https://raw.githubusercontent.com/test-owner/test-repository/'+'a'.repeat(40)+'/qa/public-transport.json';
const privateMarker='PRIVATE_PROOF_MUST_STAY_EMBEDDED_734901';
const paths=['native-slot-runtime.mjs',...[
  'official-math.mjs','sw-nine-pg-adapter.mjs','existing-server-routes.mjs',
  'existing-gamble.mjs','independent-registry.mjs','independent-operator-audit.json',
  'independent-release-pins.json','railway-binding.mjs','m20-release-policy.mjs',
  'm20-release-inputs.json','m20-release-entry.mjs'].map(p=>'native72-batch01/'+p)];

function wrap(files){
  const payload=Buffer.from(JSON.stringify(files));
  const encoded=brotliCompressSync(payload,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).toString('base64');
  return `import pg from 'pg';\nimport Redis from 'ioredis';\nimport {brotliDecompressSync} from 'node:zlib';\nimport {createHash} from 'node:crypto';\nimport {writeFile,mkdir} from 'node:fs/promises';\nvoid pg;void Redis;\nconst payload=brotliDecompressSync(Buffer.from('${encoded}','base64'));\nif(payload.length!==${payload.length}||createHash('sha256').update(payload).digest('hex')!=='${hash(payload)}')throw Error('NATIVE72_PACKAGE_INTEGRITY_MISMATCH');\nconst files=JSON.parse(payload.toString('utf8'));\nawait mkdir(new URL('./native72-batch01/',import.meta.url),{recursive:true,mode:0o700});\nfor(const file of files){\n const bytes=Buffer.from(file.source,'utf8');\n if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('NATIVE72_MODULE_INTEGRITY_MISMATCH');\n await writeFile(new URL('./'+file.path,import.meta.url),bytes,{mode:0o600});\n}\nawait import(new URL('./native-slot-runtime.mjs',import.meta.url).href);\n`;
}
function fixture({binaryPrivate=false,bomPrivate=false}={}){
  const sourceText=Object.fromEntries(REQUIRED_SOURCE_PATHS.map(path=>[path,
    `// PUBLIC FIXTURE ${path}\n// Unicode: Soomaali — ciyaar 🎰\nexport const fixture = "quoted\\nvalue";\n`]));
  const evidenceText=Object.fromEntries(EVIDENCE_KINDS.map(kind=>[kind,
    JSON.stringify({kind,synthetic:true,text:['source','operator-policy'].includes(kind)?privateMarker:'PUBLIC_CI_FIXTURE'},null,2)+'\n']));
  const rawEvidenceBase64=Object.fromEntries(EVIDENCE_KINDS.map(kind=>[kind,
    (binaryPrivate&&kind==='source'?Buffer.from([0,255,128,13,10,0,4]):
      Buffer.from(['source','operator-policy'].includes(kind)?(bomPrivate&&kind==='source'?'\ufeff':'')+privateMarker+'\nUTF-8 ✓\r\n':'public CI raw fixture '+kind+'\n')).toString('base64')]));
  const inputs={schema:'zplay-m20-release-inputs-v1',recordText:JSON.stringify({synthetic:true,note:privateMarker})+'\n',
    sourceText,evidenceText,rawEvidenceBase64};
  const files=paths.map(path=>{
    const source=path==='native-slot-runtime.mjs'?'// '+privateMarker+' PRIVATE RUNTIME FIXTURE\n':
      path.endsWith('m20-release-entry.mjs')?'// PRIVATE ENTRY FIXTURE\n':
      path.endsWith('m20-release-inputs.json')?JSON.stringify(inputs):sourceText['server/'+path.split('/').at(-1)];
    return{path,sha256:hash(source),bytes:Buffer.byteLength(source),source};
  });
  return{files,inputs,wrapperSource:wrap(files)};
}
function build(options={}){return buildM20Transport({wrapperSource:fixture().wrapperSource,publicArtifactUrl:url,...options})}
function reply(body,{status=200,contentLength,redirected=false,responseUrl=url,chunks}={}){
  const state={reads:0,cancelled:0};let index=0;
  const pieces=chunks??[body.subarray(0,7),body.subarray(7,81),body.subarray(81)];
  return {state,status,redirected,url:responseUrl,
    headers:new Headers(contentLength===undefined?{}:{'content-length':String(contentLength)}),
    body:{getReader(){return{
      async read(){state.reads++;return index<pieces.length?{done:false,value:pieces[index++]}:{done:true}},
      async cancel(){state.cancelled++}
    }}}
  };
}

// Execute the exact generated bootstrap and original whole-payload integrity
// guard up to the first filesystem operation. No runtime module is imported.
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function boot(result,fetchImpl){
  const source=result.functionSource;
  const start=source.indexOf('void pg;void Redis;');
  const boundary="const files=JSON.parse(payload.toString('utf8'));";
  const end=source.indexOf(boundary)+boundary.length;
  assert.ok(start>=0&&end>start);
  const run=new AsyncFunction('pg','Redis','brotliDecompressSync','createHash','fetch',
    source.slice(start,end)+'\nreturn {payload,files};');
  return run({}, {},brotliDecompressSync,createHash,fetchImpl);
}

test('lossless partition retains private runtime, acceptance and both private reviews; only reviewed categories are public',()=>{
  const f=fixture(),parts=partitionM20Package(f.wrapperSource),pub=JSON.parse(parts.publicArtifactBytes);
  assert.deepEqual(Object.keys(pub),['schema','sourceText','evidenceText','rawEvidenceBase64']);
  assert.deepEqual(Object.keys(pub.sourceText),REQUIRED_SOURCE_PATHS);
  assert.deepEqual(Object.keys(pub.evidenceText),['unit','real-postgres','browser']);
  assert.deepEqual(Object.keys(pub.rawEvidenceBase64),['unit','real-postgres','browser']);
  assert.equal(parts.publicArtifactBytes.includes(Buffer.from(privateMarker)),false);
  assert.equal(parts.publicArtifactBytes.includes(Buffer.from(Buffer.from(privateMarker).toString('base64'))),false);
  assert.deepEqual(parts.privateArchive.files.filter(file=>Object.hasOwn(file,'source')).map(f=>f.path),
    ['native-slot-runtime.mjs','native72-batch01/m20-release-entry.mjs']);
  assert.deepEqual(restoreM20Payload(parts.privateArchive,parts.publicArtifactBytes),parts.originalPayload);
  assert.equal(JSON.parse(restoreM20Payload(parts.privateArchive,parts.publicArtifactBytes))[10].source,JSON.stringify(f.inputs));
  for(const kind of ['source','operator-policy']){
    assert.equal(parts.privateArchive.privateInputs.evidenceText[kind],f.inputs.evidenceText[kind]);
    assert.equal(parts.privateArchive.privateInputs.rawEvidence[kind].encoding,'utf8');
  }
});

test('binary private evidence and UTF-8 text survive exactly without entering the public artifact',()=>{
  const f=fixture({binaryPrivate:true}),parts=partitionM20Package(f.wrapperSource);
  assert.equal(parts.privateArchive.privateInputs.rawEvidence.source.encoding,'base64');
  assert.deepEqual(restoreM20Payload(parts.privateArchive,parts.publicArtifactBytes),parts.originalPayload);
  assert.equal(JSON.parse(restoreM20Payload(parts.privateArchive,parts.publicArtifactBytes))[10].source,JSON.stringify(f.inputs));
});

test('a private UTF-8 byte-order mark is retained as evidence bytes',()=>{
  const f=fixture({bomPrivate:true}),parts=partitionM20Package(f.wrapperSource);
  assert.equal(parts.privateArchive.privateInputs.rawEvidence.source.data.charCodeAt(0),0xfeff);
  assert.deepEqual(restoreM20Payload(parts.privateArchive,parts.publicArtifactBytes),parts.originalPayload);
});

test('generated bootstrap reconstructs all 12 original files and keeps the original integrity/write/import tail byte-for-byte',async()=>{
  const f=fixture(),result=build({wrapperSource:f.wrapperSource}),parts=partitionM20Package(f.wrapperSource);
  const response=reply(result.publicArtifactBytes,{contentLength:result.publicArtifactBytes.length});let calls=0,options;
  const restored=await boot(result,async(request,requestOptions)=>{calls++;assert.equal(request,url);options=requestOptions;return response});
  assert.equal(calls,1);assert.deepEqual(restored.payload,parts.originalPayload);assert.deepEqual(restored.files,f.files);
  assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
  assert.deepEqual(options.headers,{accept:'application/json'});assert.equal(options.signal.aborted,true);
  const guard="if(payload.length!==";
  assert.equal(result.functionSource.slice(result.functionSource.indexOf(guard)),f.wrapperSource.slice(f.wrapperSource.indexOf(guard)));
  assert.equal(result.report.originalPayloadSha256,hash(restored.payload));
  assert.equal(result.report.publicationReviewed,false);assert.equal(result.report.deployed,false);assert.equal(result.report.productionCalls,0);
});

test('a source/helper disagreement rejects before any public artifact is produced',()=>{
  const f=fixture();f.files[1].source+='// different packaged executable\n';
  f.files[1].sha256=hash(f.files[1].source);f.files[1].bytes=Buffer.byteLength(f.files[1].source);
  assert.throws(()=>partitionM20Package(wrap(f.files)),/EXECUTABLE_SOURCE_DRIFT/);
});

test('unexpected source or evidence categories cannot silently become public',()=>{
  for(const change of [inputs=>inputs.sourceText['server/private-runtime.mjs']='private',
    inputs=>inputs.evidenceText['private-deployment']='private',inputs=>delete inputs.rawEvidenceBase64.browser]){
    const f=fixture();change(f.inputs);f.files[10].source=JSON.stringify(f.inputs);
    f.files[10].sha256=hash(f.files[10].source);f.files[10].bytes=Buffer.byteLength(f.files[10].source);
    assert.throws(()=>partitionM20Package(wrap(f.files)),/INPUTS_SCHEMA_INVALID/);
  }
});

test('original payload, individual module pins and expected file set must all match',()=>{
  const f=fixture();
  assert.throws(()=>partitionM20Package(f.wrapperSource.replace(/payload.length!==\d+/,'payload.length!==1')));
  const badFiles=structuredClone(f.files);badFiles[0].source+='changed';
  assert.throws(()=>partitionM20Package(wrap(badFiles)),/MODULE_INTEGRITY/);
  const duplicate=structuredClone(f.files);duplicate[2].path=duplicate[1].path;
  assert.throws(()=>partitionM20Package(wrap(duplicate)),/FILE_SET_CHANGED/);
  assert.throws(()=>partitionM20Package(f.wrapperSource.replace("throw Error('NATIVE72_PACKAGE_INTEGRITY_MISMATCH')","throw Error('other')")),/WRAPPER_FORMAT_CHANGED/);
});

test('immutable GitHub URL parser rejects branches, credentials, redirects-to-other-host candidates and ambiguous paths',()=>{
  assert.equal(validateImmutableGitHubUrl(url),url);
  for(const bad of [url.replace('https:','http:'),url.replace('raw.githubusercontent.com','example.org'),
    url.replace('raw.githubusercontent.com','raw.githubusercontent.com.evil.example'),
    url.replace('https://','https://user:password@'),url.replace('/'+'a'.repeat(40)+'/', '/main/'),
    url.replace('a'.repeat(40),'a'.repeat(39)),url.replace('a'.repeat(40),'A'.repeat(40)),
    url+'?token=secret',url+'#fragment',url.replace('/qa/','/qa/../qa/'),url.replace('/qa/','/%71a/'),
    url.replace('/qa/','//qa/'),url.replace('.com/','.com:443/'),url.replace('/test-owner/','/-owner/')]){
    assert.throws(()=>validateImmutableGitHubUrl(bad),/URL_INVALID/);
  }
});

test('404 and redirect responses reject without consuming a body or importing runtime',async()=>{
  const result=build();
  for(const options of [{status:404},{status:302},{redirected:true},{responseUrl:'https://example.org/other'}]){
    const response=reply(result.publicArtifactBytes,options);
    await assert.rejects(boot(result,async()=>response),/RESPONSE_INVALID/);
    assert.equal(response.state.reads,0);
  }
});

test('incorrect content length rejects before reading; short body rejects after bounded reading',async()=>{
  const result=build();
  const wrong=reply(result.publicArtifactBytes,{contentLength:result.publicArtifactBytes.length+1});
  await assert.rejects(boot(result,async()=>wrong),/LENGTH_MISMATCH/);assert.equal(wrong.state.reads,0);
  const invalid=reply(result.publicArtifactBytes,{contentLength:'not-a-number'});
  await assert.rejects(boot(result,async()=>invalid),/LENGTH_MISMATCH/);assert.equal(invalid.state.reads,0);
  const short=reply(result.publicArtifactBytes.subarray(0,-1));
  await assert.rejects(boot(result,async()=>short),/LENGTH_MISMATCH/);assert.equal(short.state.cancelled,1);
});

test('oversized streaming response is stopped at the first excess chunk',async()=>{
  const result=build(),response=reply(result.publicArtifactBytes,{chunks:[Buffer.concat([result.publicArtifactBytes,Buffer.from('x')]),Buffer.alloc(100)]});
  await assert.rejects(boot(result,async()=>response),/LENGTH_MISMATCH/);
  assert.equal(response.state.reads,1);assert.equal(response.state.cancelled,1);
});

test('same-size corrupt public evidence rejects on SHA before payload reconstruction',async()=>{
  const result=build(),corrupt=Buffer.from(result.publicArtifactBytes);corrupt[corrupt.length-3]^=1;
  await assert.rejects(boot(result,async()=>reply(corrupt)),/HASH_MISMATCH/);
});

test('private archive corruption rejects before any public network request',async()=>{
  const result=build();
  const match=result.functionSource.match(/const m20TransportArchive=brotliDecompressSync\(Buffer\.from\('([A-Za-z0-9+/=]+)','base64'\)\);/);
  const bytes=brotliDecompressSync(Buffer.from(match[1],'base64'));
  const changed=Buffer.from(bytes.toString().replace(privateMarker,privateMarker.slice(0,-1)+'X'));
  const encoded=brotliCompressSync(changed).toString('base64');
  const altered={...result,functionSource:result.functionSource.replace(match[1],encoded)};let calls=0;
  await assert.rejects(boot(altered,async()=>{calls++;return reply(result.publicArtifactBytes)}),/ARCHIVE_INTEGRITY/);
  assert.equal(calls,0);
});

test('even an accidentally repinned public blob cannot evade the unchanged original whole-payload integrity guard',async()=>{
  const result=build(),changed=Buffer.from(result.publicArtifactBytes.toString().replace('PUBLIC_CI_FIXTURE','PUBLIC_CI_CHANGED'));
  assert.equal(changed.length,result.publicArtifactBytes.length);
  const altered={...result,functionSource:result.functionSource.replace(result.report.publicArtifactSha256,hash(changed))};
  await assert.rejects(boot(altered,async()=>reply(changed)),/NATIVE72_PACKAGE_INTEGRITY_MISMATCH/);
});

test('network errors fail boot without another origin or retry',async()=>{
  const result=build();let calls=0;
  await assert.rejects(boot(result,async()=>{calls++;throw Error('injected network disconnect')}),/injected network disconnect/);
  assert.equal(calls,1);
});

test('deadline bounds an unresolved header request and aborts its signal',async()=>{
  const result=build({timeoutMs:15});let signal;
  await assert.rejects(boot(result,async(_,options)=>{signal=options.signal;return new Promise(()=>{})}),/TIMEOUT/);
  assert.equal(signal.aborted,true);
});

test('deadline also bounds a stalled body read and cancels the reader',async()=>{
  const result=build({timeoutMs:15});let cancelled=0,signal;
  await assert.rejects(boot(result,async(_,options)=>{
    signal=options.signal;return{status:200,url,redirected:false,headers:new Headers(),body:{getReader(){return{
      read:()=>new Promise(()=>{}),cancel:()=>{cancelled++;return new Promise(()=>{})}
    }}}};
  }),/TIMEOUT/);
  assert.equal(signal.aborted,true);assert.equal(cancelled,1);
});

test('a body read failure propagates while the connection and reader are cancelled',async()=>{
  const result=build();let cancelled=0,signal;
  await assert.rejects(boot(result,async(_,options)=>{
    signal=options.signal;return{status:200,url,redirected:false,headers:new Headers(),body:{getReader(){return{
      read:async()=>{throw Error('injected read disconnect')},cancel:async()=>{cancelled++}
    }}}};
  }),/injected read disconnect/);
  assert.equal(signal.aborted,true);assert.equal(cancelled,1);
});

test('source size gate accepts the documented exact boundary and rejects one extra byte',()=>{
  const f=fixture(),result=build({wrapperSource:f.wrapperSource}),padding=FUNCTION_SOURCE_MAX_BYTES-result.report.wrapperBytes;
  const exact=build({wrapperSource:f.wrapperSource+' '.repeat(padding)});
  assert.equal(exact.report.wrapperBytes,FUNCTION_SOURCE_MAX_BYTES);
  assert.ok(exact.report.startCommandBytes+1<=131072);
  assert.throws(()=>build({wrapperSource:f.wrapperSource+' '.repeat(padding+1)}),/FUNCTION_TOO_LARGE/);
});

test('invalid deadlines are rejected during preparation',()=>{
  for(const timeoutMs of [0,-1,1.5,60001,NaN,'15000'])assert.throws(()=>build({timeoutMs}),/LIMIT_INVALID/);
});
