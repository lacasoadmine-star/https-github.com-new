import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {PLAYER_ORIGIN,PUBLIC_PREFIX,fetchVerifiedAsset,prepareBrowserMedia,verifySourceManifest} from './prepare-browser-media.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(await readFile(path.join(root,'multihot20/assets.json'),'utf8'));
const sources=JSON.parse(await readFile(path.join(root,'multihot20-ci-media-sources.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=Buffer.from('QA test bytes, not a game asset');
const source=(file='seven.png',body=bytes)=>{
 const hash=sha(body),ext=path.extname(file),name='m20-qa-'+hash+ext;
 return {sha256:hash,bytes:body.length,contentType:ext==='.png'?'image/png':'audio/mpeg',
  url:PLAYER_ORIGIN+PUBLIC_PREFIX+name,retrievalProvenance:ext==='.png'
   ?{kind:'fresh_official_browser_download',at:'2026-11-21T00:00:00.000Z'}
   :{kind:'retained_verified_project_asset',freshOfficialDownload:false}};
};
const response=(body=bytes,type='image/png')=>new Response(body,{headers:{'content-type':type}});

test('CI inventory pins all actual game files and preserves the five retained audio records',()=>{
 assert.equal(verifySourceManifest(manifest,sources).length,13);
 const audio=Object.entries(sources.files).filter(([name])=>name.endsWith('.mp3'));
 assert.equal(audio.length,5);
 for(const [,record] of audio){
  assert.equal(record.retrievalProvenance.kind,'retained_verified_project_asset');
  assert.equal(record.retrievalProvenance.freshOfficialDownload,false);
 }
 for(const file of ['wins.png','wins2.png']){
  assert.equal(sources.files[file].contentType,'image/png');
  assert.equal(sources.files[file].retrievalProvenance.kind,'retained_verified_project_asset');
  assert.equal(sources.files[file].retrievalProvenance.freshOfficialDownload,false);
 }
 const changed=structuredClone(sources);delete changed.files['win.mp3'];
 assert.throws(()=>verifySourceManifest(manifest,changed),/inventory must exactly match/);
 const altered=structuredClone(sources);altered.files['win.mp3'].retrievalProvenance.freshOfficialDownload=true;
 assert.throws(()=>verifySourceManifest(manifest,altered),/not a fresh official download/);
 assert.deepEqual(Object.keys(sources).sort(),['files','gameId','schema']);
 for(const field of ['kvNamespaceId','routeModule','playerBaselineVersion','destinationKeyPrefix']){
  const privateField=structuredClone(sources);privateField[field]='must-not-publish';
  assert.throws(()=>verifySourceManifest(manifest,privateField),/only public fields/);
 }
 for(const field of ['sourceKey','key']){
  const privateField=structuredClone(sources);privateField.files['background.png'][field]='must-not-publish';
  assert.throws(()=>verifySourceManifest(manifest,privateField),/only public fields/);
 }
 const privateProvenance=structuredClone(sources);privateProvenance.files['background.png'].retrievalProvenance.sourceKey='must-not-publish';
 assert.throws(()=>verifySourceManifest(manifest,privateProvenance),/only public fields/);
 const changedDate=structuredClone(sources);changedDate.files['background.png'].retrievalProvenance.at='2026-11-20T00:00:00.000Z';
 assert.throws(()=>verifySourceManifest(manifest,changedDate),/retrieval provenance changed/);
});

test('CI inventory rejects missing or substituted WIN sheets even when both manifests agree',()=>{
 for(const file of ['wins.png','wins2.png']){
  const missingSource=structuredClone(sources);delete missingSource.files[file];
  assert.throws(()=>verifySourceManifest(manifest,missingSource),/inventory must exactly match/);
  const missingManifest=structuredClone(manifest);delete missingManifest.files[file];
  assert.throws(()=>verifySourceManifest(missingManifest,missingSource),/thirteen verified original game media files are required/);
  const renamedManifest=structuredClone(manifest),renamedSources=structuredClone(sources);
  for(const record of [renamedManifest,renamedSources]){
   record.files['unreviewed-'+file]=record.files[file];delete record.files[file];
  }
  assert.equal(Object.keys(renamedManifest.files).length,13);
  assert.throws(()=>verifySourceManifest(renamedManifest,renamedSources),/thirteen verified original game media files are required/);
 }
});

test('provider, wallet, credentialed and query-string URLs fail before any network request',async()=>{
 let requests=0;const fetchImpl=()=>{requests++;throw Error('unexpected request')};
 for(const url of ['https://static.ssg-public.com/file.png',PLAYER_ORIGIN+'/api/slots/spin',
  'https://name:password@superwin-player.apdiy61.workers.dev'+PUBLIC_PREFIX+'image.png',source().url+'?token=anything']){
  await assert.rejects(fetchVerifiedAsset('seven.png',{...source(),url},{fetchImpl}),/Only the pinned public project media URL/);
 }
 assert.equal(requests,0);
});

test('retained original audio cannot be relabelled as a fresh provider download',async()=>{
 let requests=0;
 const altered={...source('win.mp3'),retrievalProvenance:{kind:'fresh_official_browser_download',at:'2026-11-21T00:00:00.000Z'}};
 await assert.rejects(fetchVerifiedAsset('win.mp3',altered,{fetchImpl:async()=>{requests++;return response(bytes,'audio/mpeg')}}),/Audio must retain/);
 assert.equal(requests,0);
});

test('public GET omits credentials, refuses redirects and verifies the complete stream',async()=>{
 let call;
 const result=await fetchVerifiedAsset('seven.png',source(),{fetchImpl:async(url,options)=>{
  call={url,options};
  return new Response(new ReadableStream({start(controller){controller.enqueue(bytes.subarray(0,8));controller.enqueue(bytes.subarray(8));controller.close()}}),
   {headers:{'content-type':'image/png','content-length':String(bytes.length)}});
 }});
 assert.deepEqual(result,bytes);assert.equal(call.url,source().url);
 assert.equal(call.options.method,'GET');assert.equal(call.options.credentials,'omit');assert.equal(call.options.redirect,'manual');
 assert.deepEqual(call.options.headers,{accept:'image/png'});
 await assert.rejects(fetchVerifiedAsset('seven.png',source(),{fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://static.ssg-public.com/file.png'}})}),/HTTP status/);
});

test('a successful HTTP status cannot substitute corrupt, truncated, oversized or wrong-type media',async()=>{
 await assert.rejects(fetchVerifiedAsset('seven.png',source(),{fetchImpl:async()=>response(Buffer.alloc(bytes.length))}),/SHA256/);
 await assert.rejects(fetchVerifiedAsset('seven.png',source(),{fetchImpl:async()=>response(bytes.subarray(1))}),/downloaded length/);
 await assert.rejects(fetchVerifiedAsset('seven.png',source(),{fetchImpl:async()=>response(Buffer.concat([bytes,bytes]))}),/exceeds pinned media length/);
 await assert.rejects(fetchVerifiedAsset('seven.png',source(),{fetchImpl:async()=>response(bytes,'text/html')}),/content type/);
 await assert.rejects(fetchVerifiedAsset('seven.png',source(),{fetchImpl:async()=>new Response(bytes,{headers:{'content-type':'image/png','content-length':'1'}})}),/content length/);
});

async function withSetup(run){
 const temp=await mkdtemp(path.join(os.tmpdir(),'m20-ci-media-test-'));
 try{
  const testManifest=structuredClone(manifest),testSources=structuredClone(sources),bodies=new Map();
  for(const [file,record] of Object.entries(testManifest.files)){
   const body=Buffer.from('Isolated CI setup fixture for '+file),entry=source(file,body);
   Object.assign(record,{sha256:entry.sha256,bytes:entry.bytes});
   testSources.files[file]={...entry,retrievalProvenance:record.retrieval};bodies.set(entry.url,{body,type:entry.contentType});
  }
  const manifestPath=path.join(temp,'manifest.json'),sourcesPath=path.join(temp,'sources.json');
  await writeFile(manifestPath,JSON.stringify(testManifest));await writeFile(sourcesPath,JSON.stringify(testSources));
  await run({temp,bodies,options:{manifestPath,sourcesPath,output:path.join(temp,'media'),reportPath:path.join(temp,'report.json')}});
 }finally{await rm(temp,{recursive:true,force:true})}
}

test('complete verified set becomes visible together and produces an explicit nonfresh QA report',async()=>withSetup(async({options,bodies})=>{
 const result=await prepareBrowserMedia({...options,fetchImpl:async url=>{const item=bodies.get(url);assert.ok(item);return response(item.body,item.type)}});
 assert.equal(result.status,'PASS');assert.equal(result.verifiedFiles,13);assert.equal((await readdir(options.output)).length,13);
 const report=JSON.parse(await readFile(options.reportPath,'utf8'));
 assert.equal(report.providerRequests,false);assert.equal(report.walletRequests,false);assert.equal(report.credentialsSent,false);
 assert.equal(report.files.find(file=>file.file==='win.mp3').retrievalProvenance.freshOfficialDownload,false);
}));

test('setup failure removes the partial set, reports failure and never substitutes cached bytes',async()=>withSetup(async({temp,options,bodies})=>{
 let calls=0;
 await assert.rejects(prepareBrowserMedia({...options,fetchImpl:async url=>{
  if(++calls===3)return new Response(null,{status:403});const item=bodies.get(url);return response(item.body,item.type);
 }}),/HTTP status/);
 assert.equal(calls,3);assert.equal((await readdir(temp)).some(name=>name.startsWith('media')),false);
 const report=JSON.parse(await readFile(options.reportPath,'utf8'));
 assert.equal(report.status,'FAIL');assert.equal(report.verifiedFiles,2);assert.equal(report.errors.length,1);
}));
