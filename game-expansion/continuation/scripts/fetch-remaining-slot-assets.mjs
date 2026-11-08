#!/usr/bin/env node
// Hash-locked public static artwork only; no provider runtime execution,
// game/session request, cookies, authentication, or financial endpoint.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname,extname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile),HERE=dirname(fileURLToPath(import.meta.url));
export const MAX_TRANSFER_BYTES=100_000_000,MAX_FILE_BYTES=16_000_000;
const HASH=/^[a-f0-9]{64}$/,FILE=/^[a-f0-9]{64}\.(png|jpg|webp|svg)$/;
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function validateStaticURL(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)throw Error('Invalid public static source');
 const path=decodeURIComponent(url.pathname);
 if(path.split('/').some(part=>part==='.'||part==='..'))throw Error('Invalid static path');
 const pragmatic=url.hostname==='demogamesfree.pragmaticplay.net'&&/^\/gs2c\/common\/v3\/games-html5\/games\/vs\/vs25vegas\/desktop\/game\/(?:main_resources|GUI_resources)\d{3}\.json$/.test(path)&&/^\?key=[a-f0-9]{32}$/.test(url.search);
 const amusnet=url.hostname==='prod.cdn.amusnet.io'&&!url.search&&(/^\/826\/images\/[A-Za-z0-9_-]+\.(?:json|png|jpg|webp)$/.test(path)||/^\/game-ui\/assets\/[A-Za-z0-9_-]+\.(?:svg|png|webp)$/.test(path));
 const smartsoft=url.hostname==='static.ssg-public.com'&&!url.search&&/^\/cache\/b15\/GameLauncher\/Content\/Help\/Images\/(?:MoonStone|Samurai|MagicGarden)\/[A-Za-z0-9_-]+\.(?:png|jpg|webp)$/.test(path);
 if(!pragmatic&&!amusnet&&!smartsoft)throw Error('Source is outside the observed static asset paths');
 return url;
}
export function verifyBytes(entry,bytes){
 if(!HASH.test(entry.sha256)||!Number.isSafeInteger(entry.bytes)||entry.bytes<1||entry.bytes>MAX_FILE_BYTES)throw Error('Invalid locked size or hash');
 if(bytes.byteLength!==entry.bytes)throw Error('Asset byte count mismatch');
 if(sha256(bytes)!==entry.sha256)throw Error('Asset hash mismatch');return true;
}
export function decodeInlineTexture(groupBytes,resourceId){
 const document=JSON.parse(Buffer.from(groupBytes).toString('utf8'));
 if(!Array.isArray(document.resources))throw Error('Invalid static texture package');
 const resource=document.resources.find(item=>item.type==='Texture'&&item.id===resourceId);
 if(resource?.isInline!==true||typeof resource.data!=='string')throw Error('Missing inline static texture');
 const match=resource.data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]*={0,2})$/);
 if(!match||match[2].length>MAX_FILE_BYTES*1.4)throw Error('Invalid embedded image');
 const bytes=Buffer.from(match[2],'base64');
 if(bytes.toString('base64')!==match[2]||bytes.length>MAX_FILE_BYTES)throw Error('Invalid base64 texture');
 return bytes;
}
export function selectLock(lock,gameIds){
 if(lock.schemaVersion!==1||!Array.isArray(lock.sources)||!Array.isArray(lock.assets))throw Error('Invalid static asset lock');
 const ids=gameIds?.length?new Set(gameIds):new Set(Object.keys(lock.games));
 for(const id of ids)if(!Object.hasOwn(lock.games,id))throw Error('Unknown presentation game');
 const assets=lock.assets.filter(asset=>asset.games.some(id=>ids.has(id)));
 for(const asset of assets)if(!FILE.test(asset.file)||asset.file.split('.')[0]!==asset.sha256)throw Error('Invalid content filename');
 const sourceIds=new Set();
 for(const asset of assets){
  if(asset.sourceId)sourceIds.add(asset.sourceId);
  else if(asset.extraction?.group){const group=lock.groups[asset.extraction.group];if(!Array.isArray(group))throw Error('Missing texture group');for(const id of group)sourceIds.add(id);}
  else throw Error('Missing source provenance');
 }
 const sources=lock.sources.filter(source=>sourceIds.has(source.id));
 if(sources.length!==sourceIds.size)throw Error('Missing source record');
 for(const source of sources){validateStaticURL(source.url);if(!HASH.test(source.sha256)||!Number.isSafeInteger(source.bytes)||source.bytes<1||source.bytes>MAX_FILE_BYTES)throw Error('Invalid static source lock');}
 const transferBytes=sources.reduce((total,entry)=>total+entry.bytes,0);
 if(transferBytes>MAX_TRANSFER_BYTES)throw Error('Public static transfer budget exceeded');
 return {assets,sources,transferBytes};
}
async function receive(source,{transport,fetchImpl}){
 if(transport==='curl'){
  const {stdout}=await run('curl',['--fail','--silent','--show-error','--proto','=https','--max-redirs','0','--connect-timeout','10','--max-time','35','--max-filesize',String(source.bytes),source.url],{encoding:'buffer',maxBuffer:source.bytes+1024});return stdout;
 }
 const response=await fetchImpl(source.url,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(35000)});
 if(!response.ok)throw Error('Static source HTTP '+response.status);
 const chunks=[];let length=0;
 for await(const chunk of response.body){length+=chunk.byteLength;if(length>source.bytes)throw Error('Static source exceeds locked size');chunks.push(Buffer.from(chunk));}
 return Buffer.concat(chunks,length);
}
export async function fetchRemainingAssets(lock,{cacheDir,gameIds,verifyOnly=false,transport='fetch',fetchImpl=globalThis.fetch}={}){
 if(!cacheDir)throw Error('Explicit external cache directory required');
 const selected=selectLock(lock,gameIds),base=resolve(cacheDir),rawDir=join(base,'sources');
 await mkdir(base,{recursive:true});if(!verifyOnly)await mkdir(rawDir,{recursive:true});
 const needed=[];let cachedBytes=0,downloadedBytes=0;
 for(const asset of selected.assets){
  try{verifyBytes(asset,await readFile(join(base,asset.file)));cachedBytes+=asset.bytes;}
  catch(error){if(verifyOnly)throw Error(asset.file+': '+error.message);needed.push(asset);}
 }
 const raw=new Map(),byId=new Map(selected.sources.map(source=>[source.id,source]));
 const load=async id=>{
  if(raw.has(id))return raw.get(id);
  const source=byId.get(id);if(!source)throw Error('Unknown locked source');
  const target=join(rawDir,source.sha256+extname(new URL(source.url).pathname));let bytes;
  try{bytes=await readFile(target);verifyBytes(source,bytes);}catch{
   bytes=await receive(source,{transport,fetchImpl});verifyBytes(source,bytes);downloadedBytes+=bytes.length;
   if(downloadedBytes>MAX_TRANSFER_BYTES)throw Error('Transfer budget exceeded');
   await writeFile(target+'.part',bytes);await rename(target+'.part',target);
  }
  raw.set(id,bytes);return bytes;
 };
 const grouped=new Map();
 for(const asset of needed){
  let bytes;
  if(asset.sourceId)bytes=await load(asset.sourceId);
  else {
   const key=asset.extraction.group;
   if(!grouped.has(key)){const parts=[];for(const id of lock.groups[key])parts.push(await load(id));grouped.set(key,Buffer.concat(parts));}
   bytes=decodeInlineTexture(grouped.get(key),asset.extraction.resourceId);
  }
  verifyBytes(asset,bytes);await writeFile(join(base,asset.file)+'.part',bytes);await rename(join(base,asset.file)+'.part',join(base,asset.file));
 }
 // Full byte verification, including existing cache entries, is mandatory.
 for(const asset of selected.assets)verifyBytes(asset,await readFile(join(base,asset.file)));
 return {verifiedAt:new Date().toISOString(),games:gameIds?.length?gameIds:Object.keys(lock.games),assets:selected.assets.length,verifiedBytes:selected.assets.reduce((sum,asset)=>sum+asset.bytes,0),cachedBytes,downloadedBytes,maximumTransferBytes:MAX_TRANSFER_BYTES,publicStaticOnly:true,providerCodeExecuted:false,productionLaunchEnabled:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),value=name=>{const index=args.indexOf(name);return index<0?undefined:args[index+1];};
 const lock=JSON.parse(await readFile(resolve(HERE,'../presentation/remaining-slots/assets.lock.json'),'utf8'));
 const result=await fetchRemainingAssets(lock,{cacheDir:value('--cache-dir'),gameIds:value('--games')?.split(','),verifyOnly:args.includes('--verify-only'),transport:value('--transport')||'fetch'});
 await writeFile(resolve(HERE,'../presentation/remaining-slots/evidence/asset-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
