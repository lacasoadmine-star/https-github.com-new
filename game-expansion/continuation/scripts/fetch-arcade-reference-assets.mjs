#!/usr/bin/env node
// Exact public static URLs only. Never executes provider JavaScript or game APIs.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {dirname,resolve,extname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const runFile=promisify(execFile);
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../presentation/arcade');
export const MAX_TOTAL_BYTES=100_000_000;
export const MAX_ASSET_BYTES=12_000_000;
const EXTENSIONS=new Set(['.png','.webp','.jpg','.jpeg','.json','.atlas','.txt','.mp3','.ogg','.woff','.woff2','.ttf']);
const PREFIXES={
  'static.ssg-public.com':['/cache/b45/XGames/Content/Images/TowerX/','/cache/b45/XGames/Content/Sound/TowerX/'],
  'cdn.galaxsys-games.com':['/fg-cdn/prd/root/images/towerrush/','/fg-cdn/prd/root/spines/towerrush/v2/','/fg-cdn/prd/root/sounds/towerrush/','/fg-cdn/prd/root/fonts/'],
  'curacao-mines-ui.gamingcorpscasino.com':['/games/coin-miner/assets/'],
};
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function validateAssetURL(value){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash)throw new Error('Only public static HTTPS URLs without credentials or queries are allowed');
  const path=decodeURIComponent(url.pathname);
  if(!PREFIXES[url.hostname]?.some(prefix=>path.startsWith(prefix))||path.includes('\\')||path.split('/').some(segment=>segment==='..'||segment==='.'))throw new Error('URL is outside the observed static asset roots');
  if(!EXTENSIONS.has(extname(path).toLowerCase())||(extname(path).toLowerCase()==='.txt'&&!path.endsWith('.atlas.txt')))throw new Error('Executable or unsupported asset type');
  return url;
}

export function verifyBytes(entry,bytes){
  if(!/^[a-f0-9]{64}$/.test(entry.sha256)||bytes.byteLength!==entry.bytes||sha256(bytes)!==entry.sha256)throw new Error('Asset SHA-256 or size mismatch');
  return true;
}

async function download(url){
  validateAssetURL(url);
  const {stdout}=await runFile('curl',['--silent','--show-error','--fail','--proto','=https','--max-redirs','0','--connect-timeout','15','--max-time','40','--max-filesize',String(MAX_ASSET_BYTES),url],{encoding:'buffer',maxBuffer:MAX_ASSET_BYTES+1024});
  if(stdout.length<1||stdout.length>MAX_ASSET_BYTES)throw new Error('Invalid asset size');
  return stdout;
}

export async function captureAssets(source,{cacheDir,previousLock=null,verifyOnly=false,concurrency=5,downloadImpl=download,onProgress=()=>{}}={}){
  if(!cacheDir||!Array.isArray(source.assets))throw new Error('Source inventory and explicit cache directory are required');
  const urls=new Map();
  for(const item of source.assets){validateAssetURL(item.url);if(!urls.has(item.url))urls.set(item.url,[]);urls.get(item.url).push(item);}
  const previous=new Map((previousLock?.assets||[]).flatMap(entry=>entry.urls.map(url=>[url,entry])));
  const entries=[...urls],received=[],failures=[];let cursor=0,totalBytes=0;
  await mkdir(cacheDir,{recursive:true});
  async function worker(){for(;;){const index=cursor++;if(index>=entries.length)return;const[url,refs]=entries[index];
    try{
      const prior=previous.get(url);let bytes=null;
      if(prior){try{bytes=await readFile(join(cacheDir,prior.file));verifyBytes(prior,bytes);}catch(error){if(verifyOnly||error.code!=='ENOENT')throw error;}}
      if(!bytes){if(verifyOnly)throw new Error('Missing locked asset');bytes=await downloadImpl(url);if(prior)verifyBytes(prior,bytes);}
      const hash=sha256(bytes),file=hash+extname(new URL(url).pathname).toLowerCase();
      // Counting before deduplication also bounds the actual bytes held in this run.
      totalBytes+=bytes.length;if(totalBytes>MAX_TOTAL_BYTES)throw new Error('100 MB total asset budget exceeded');
      const entry={file,sha256:hash,bytes:bytes.length,urls:[url],references:refs.map(({gameId,key,kind,sourceRef})=>({gameId,key,kind,sourceRef}))};
      verifyBytes(entry,bytes);
      if(!verifyOnly){const tmp=join(cacheDir,file+'.part-'+process.pid+'-'+index);try{await writeFile(tmp,bytes);await rename(tmp,join(cacheDir,file));}finally{await rm(tmp,{force:true});}}
      received.push(entry);onProgress({done:received.length+failures.length,total:entries.length,status:'verified',key:refs[0].key});
    }catch(error){failures.push({url,references:refs,error:String(error.message)});onProgress({done:received.length+failures.length,total:entries.length,status:'failed',url,error:String(error.message)});}
  }}
  await Promise.all(Array.from({length:Math.max(1,Math.min(6,Math.trunc(concurrency)||1))},worker));
  const hashes=new Map();for(const entry of received){const existing=hashes.get(entry.file);if(existing){existing.urls.push(...entry.urls);existing.references.push(...entry.references);}else hashes.set(entry.file,entry);}
  const assets=[...hashes.values()].sort((a,b)=>a.file.localeCompare(b.file));
  const lock={schemaVersion:1,capturedAt:new Date().toISOString(),productionLaunchEnabled:false,providerJavaScriptIncluded:false,maximumUniqueBytes:MAX_TOTAL_BYTES,uniqueBytes:assets.reduce((sum,e)=>sum+e.bytes,0),sources:source.sources,assets,failures,gaps:source.gaps||[]};
  if(lock.uniqueBytes>MAX_TOTAL_BYTES)throw new Error('100 MB unique asset budget exceeded');
  return lock;
}

async function main(){
  const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
  const source=JSON.parse(await readFile(join(ROOT,'sources.json'),'utf8'));
  let previousLock;try{previousLock=JSON.parse(await readFile(join(ROOT,'assets.lock.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const cacheDir=resolve(option('--cache-dir')||'/tmp/zplay-arcade-assets');
  const lock=await captureAssets(source,{cacheDir,previousLock,verifyOnly:args.includes('--verify-only'),concurrency:Number(option('--concurrency')||5),onProgress:event=>{if(event.status==='failed'||event.done%15===0||event.done===event.total)console.log(JSON.stringify(event));}});
  await writeFile(join(ROOT,'assets.lock.json'),JSON.stringify(lock,null,2)+'\n');
  await mkdir(join(ROOT,'evidence'),{recursive:true});
  await writeFile(join(ROOT,'evidence/asset-verification.json'),JSON.stringify({schemaVersion:1,verifiedAt:lock.capturedAt,cacheDir,complete:lock.failures.length===0,verifiedAssets:lock.assets.length,verifiedBytes:lock.uniqueBytes,failures:lock.failures,sha256Verified:true,productionLaunchEnabled:false},null,2)+'\n');
  console.log(JSON.stringify({verifiedAssets:lock.assets.length,verifiedBytes:lock.uniqueBytes,failures:lock.failures.length,cacheDir}));
  if(lock.failures.length)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
