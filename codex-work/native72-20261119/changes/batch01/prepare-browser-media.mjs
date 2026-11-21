#!/usr/bin/env node
// Read-only CI setup: download the existing project's pinned public QA media.
// This helper never visits provider URLs, sends credentials, or calls a wallet.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const PLAYER_ORIGIN='https://superwin-player.apdiy61.workers.dev';
export const PUBLIC_PREFIX='/new74/assets/multihot10/';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const SHA=/^[a-f0-9]{64}$/;
const FILE=/^[a-z0-9][a-z0-9-]*\.(?:png|mp3)$/;
const MIME={'.png':'image/png','.mp3':'audio/mpeg'};
const SOURCE_FIELDS=['bytes','contentType','retrievalProvenance','sha256','url'];

function checkedProvenance(file,value){
 assert.ok(value&&typeof value==='object'&&!Array.isArray(value),'Missing retrieval provenance');
 if(file.endsWith('.mp3'))assert.equal(value.kind,'retained_verified_project_asset','Audio must retain its existing project provenance');
 if(value.kind==='retained_verified_project_asset'){
  assert.deepEqual(Object.keys(value).sort(),['freshOfficialDownload','kind'],'Retained media provenance must use only public fields');
  assert.equal(value.kind,'retained_verified_project_asset','Media must retain its existing project provenance');
  assert.equal(value.freshOfficialDownload,false,'Retained media is not a fresh official download');
 }else{
  assert.deepEqual(Object.keys(value).sort(),['at','kind'],'Image provenance must use only public fields');
  assert.equal(value.kind,'fresh_official_browser_download','Original image capture provenance must be preserved');
  assert.equal(typeof value.at,'string','Image capture timestamp is required');
  assert.ok(Number.isFinite(Date.parse(value.at))&&new Date(value.at).toISOString()===value.at,'Invalid original image capture timestamp');
 }
}

function checkedSource(file,source){
 assert.match(file,FILE,'Invalid media filename');
 assert.ok(source&&SHA.test(source.sha256),'Missing pinned media SHA256');
 assert.deepEqual(Object.keys(source).sort(),SOURCE_FIELDS,'CI media record must use only public fields');
 assert.ok(Number.isSafeInteger(source.bytes)&&source.bytes>0&&source.bytes<=4*1024*1024,'Invalid pinned media length');
 const ext=path.extname(file),name='m20-qa-'+source.sha256+ext;
 assert.equal(source.contentType,MIME[ext],'Invalid pinned media type');
 // Exact equality rejects alternate hosts, credentials, query strings,
 // encoded paths and financial endpoints. Redirects are rejected below.
 assert.equal(source.url,PLAYER_ORIGIN+PUBLIC_PREFIX+name,'Only the pinned public project media URL is permitted');
 checkedProvenance(file,source.retrievalProvenance);
 return source;
}

export function verifySourceManifest(manifest,sources){
 assert.equal(manifest?.gameId,'fresh_multihot20');
 assert.equal(sources?.gameId,'fresh_multihot20');
 assert.equal(sources?.schema,'zplay/multihot20-ci-media/v1');
 assert.deepEqual(Object.keys(sources).sort(),['files','gameId','schema'],'CI source manifest must use only public fields');
 const files=Object.keys(manifest.files||{}).sort();
 assert.deepEqual(files,['atlas-0.png','atlas-1.png','atlas-2.png','atlas-3.png','atlas-logo.png','background.png','button.mp3','music.mp3','reel-stop.mp3','spin.mp3','win.mp3'],'The eleven verified original game media files are required');
 assert.deepEqual(Object.keys(sources.files||{}).sort(),files,'CI source inventory must exactly match the current game');
 for(const file of files){
  const expected=manifest.files[file],source=checkedSource(file,sources.files[file]);
  for(const field of ['sha256','bytes','contentType'])assert.equal(source[field],expected[field],file+' '+field+' changed');
  assert.deepEqual(source.retrievalProvenance,expected.retrieval,file+' retrieval provenance changed');
 }
 return files;
}

export async function fetchVerifiedAsset(file,source,{fetchImpl=fetch,timeoutMs=30000}={}){
 checkedSource(file,source);
 const response=await fetchImpl(source.url,{method:'GET',redirect:'manual',credentials:'omit',
  headers:{accept:source.contentType},signal:AbortSignal.timeout(timeoutMs)});
 assert.equal(response.status,200,file+' public media HTTP status (redirects are not followed)');
 assert.equal(response.headers.get('content-type')?.split(';')[0].trim(),source.contentType,file+' HTTP content type');
 const advertised=response.headers.get('content-length');
 if(advertised!==null)assert.equal(advertised,String(source.bytes),file+' HTTP content length');
 const reader=response.body?.getReader();assert.ok(reader,file+' response body missing');
 let size=0;const chunks=[];
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>source.bytes){await reader.cancel();throw Error(file+' exceeds pinned media length')}
   chunks.push(value);
  }
 }finally{reader.releaseLock()}
 assert.equal(size,source.bytes,file+' downloaded length');
 const bytes=Buffer.concat(chunks,size);
 assert.equal(digest(bytes),source.sha256,file+' downloaded SHA256');
 return bytes;
}

export async function prepareBrowserMedia({output,reportPath,manifestPath=path.join(ROOT,'multihot20/assets.json'),
 sourcesPath=path.join(ROOT,'multihot20-ci-media-sources.json'),fetchImpl=fetch}){
 assert.ok(output&&reportPath,'--output and --report are required');
 const report={schema:'zplay/multihot20-ci-media-download/v1',startedAt:new Date().toISOString(),status:'RUNNING',
  scope:'Existing project static media for isolated QA. This is not a new official capture or a gameplay certification.',
  providerRequests:false,walletRequests:false,credentialsSent:false,files:[],errors:[]};
 let stage;
 try{
  const [manifestText,sourcesText]=await Promise.all([readFile(manifestPath,'utf8'),readFile(sourcesPath,'utf8')]);
  const manifest=JSON.parse(manifestText),sources=JSON.parse(sourcesText),files=verifySourceManifest(manifest,sources);
  report.manifestSha256=digest(manifestText);report.sourcesSha256=digest(sourcesText);
  // A failed run never presents a partly populated directory as a complete set.
  stage=output+'.download-'+process.pid;await mkdir(stage,{recursive:false});
  for(const file of files){
   const source=sources.files[file],bytes=await fetchVerifiedAsset(file,source,{fetchImpl});
   await writeFile(path.join(stage,file),bytes,{flag:'wx'});
   report.files.push({file,url:source.url,sha256:source.sha256,bytes:bytes.length,
    retrievedAt:new Date().toISOString(),delivery:'existing_project_public_static_route',
    retrievalProvenance:source.retrievalProvenance});
  }
  await rename(stage,output);stage=null;report.status='PASS';
  return report;
 }catch(error){report.status='FAIL';report.errors.push(error.message);throw error}
 finally{
  if(stage)await rm(stage,{recursive:true,force:true});
  report.finishedAt=new Date().toISOString();report.verifiedFiles=report.files.length;
  await mkdir(path.dirname(reportPath),{recursive:true});await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2),options={};
 try{
  for(let i=0;i<args.length;i+=2){
   assert.ok(['--output','--report'].includes(args[i])&&args[i+1]&&!args[i+1].startsWith('--'),'Use --output <directory> --report <json-file>');
   const key=args[i]==='--output'?'output':'reportPath';assert.equal(options[key],undefined,'Duplicate option');options[key]=path.resolve(args[i+1]);
  }
  const result=await prepareBrowserMedia(options);
  console.log(JSON.stringify({status:result.status,verifiedFiles:result.verifiedFiles,report:options.reportPath}));
 }catch(error){console.error('QA media setup failed: '+error.message);process.exitCode=1}
}
