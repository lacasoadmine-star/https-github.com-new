#!/usr/bin/env node
// Capture only static URLs declared in the already inspected public configuration.
// No provider JavaScript is loaded or executed by this tool.
import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {dirname,resolve,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {assetKind,sha256,validateSourceURL,MAX_ASSET_BYTES,MAX_TRANSFER_BYTES,verifyAssetBytes} from '../scripts/fetch-reference-assets.mjs';
import {parseSpineAtlas} from './atlas.mjs';
const run=promisify(execFile),ROOT=dirname(fileURLToPath(import.meta.url));
const BASE='https://static.ssg-public.com/cache/b1/SlotsDemo/Content/';
const range=(n,fn)=>Array.from({length:n},(_,i)=>fn(i));
const source=(name)=>BASE+'Scripts/Slots/'+name+'.js';

export const supplementalCatalog=[
  {machineId:'multihotdeluxe_native',officialGameName:'MultiHot5Deluxe',assetBaseName:'MultiHot5Deluxe',grid:{reels:3,rows:3,symbolCount:9},
   sourceURLs:[BASE+'Scripts/New/MultiHot5Deluxe.js'],
   atlasPaths:range(4,i=>`Images/Sprites/Images-${i}.json`),
   spinePaths:['Spine/Logo/multihot5 new logo.json','Spine/Multiplayer/multiplayer.json','Spine/Symbols/All Symbols.json','Spine/Wins/Wins.json'],
   imagePaths:['background.png'],
   soundPaths:['Start/Background.mp3','Buttons/Spin.mp3','Buttons/Button.mp3','Start/LineWin.mp3','Start/ReelStop1.mp3','Start/ReelStop2.mp3','Start/ReelStop3.mp3','Start/WinX2.mp3'],
   presentation:{background:'background.png',boardFrame:'Box/Background',feature:'vertical-multipliers',symbolPlacement:{cellWidth:230,cellHeight:217,offsetX:-238,offsetY:-238,source:'MultiHot5Deluxe.js Box.config.width/height and settings.normal offsets; desktop static source'},symbolOverrides:{}}},
  ...['','10','40'].map(suffix=>({machineId:`burningice${suffix}_native`,officialGameName:'BlazingHot'+suffix,assetBaseName:'BlazingHot',grid:{reels:5,rows:suffix==='40'?4:3,symbolCount:suffix==='40'?10:12},
   sourceURLs:[source('blazinghot'),...(suffix?[source('blazinghot'+suffix)]:[])],
   atlasPaths:range(2,i=>`Images/Sprites/Images-${i}.json`),spinePaths:[],
   imagePaths:['background.jpg',...(suffix?['Start/LineIcons','Start/Logo','Start/LogoIce'].map(name=>'Images/'+name+'-'+suffix+'.png'):[]),...(suffix==='40'?['Images/Start/Column-40.png','Images/Start/ColumnActive-40.png','Images/Box/10.png','Images/Box/11.png','Images/BlurBox/10.png','Images/BlurBox/11.png']:[])],
   soundPaths:['Start/Background.mp3','Buttons/Spin.mp3','Start/Column.mp3','Start/ObjectMoveStop.mp3','Start/Ice1.mp3','Start/Ice2.mp3','Start/Line.mp3','Start/Win1.mp3','Start/Win2.mp3','Start/Win3.mp3'],
   presentation:{background:'background.jpg',boardColumnFrame:'Start/Column'+(suffix==='40'?'-40':''),
    logoFrame:'Start/Logo'+(suffix?'-'+suffix:''),iceLogoFrame:'Start/LogoIce'+(suffix?'-'+suffix:''),
    lineIconsFrame:'Start/LineIcons'+(suffix?'-'+suffix:''),feature:'frozen-reels',
    symbolOverrides:suffix==='40'?{'9':{frame:'@Image/Box/10',blurFrame:'@Image/BlurBox/10'}}:{}},
   declaredAnimationPaths:suffix==='40'?[...range(11,i=>`40/ColumnEffect-40-${i}.json`),'40/Ice1-40.json','40/Ice2-40.json',...range(4,i=>`40/Logo1-40-${i}.json`),'40/Logo2-40.json','40/SideIce1-40.json','40/SideIce2-40.json']:suffix==='10'?[...range(3,i=>`Logo1-10-${i}.json`),...range(2,i=>`Logo2-10-${i}.json`)]:['ColumnEffect-0.json','Ice1.json','Ice2.json','Logo1-0.json','Logo2.json','SideIce1.json','SideIce2.json']})),
];

export function pngDimensions(bytes){
  if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return null;
  return{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}

export async function captureSupplemental({cacheDir,fetchBytes,existingLock={assets:[],uniqueBytes:0},onProgress=()=>{}}={}){
  if(!cacheDir)throw new Error('Cache directory required');
  await mkdir(cacheDir,{recursive:true});
  const captured=new Map(),oldURLs=new Map(existingLock.assets.flatMap(item=>item.urls.map(url=>[url,item]))),knownHashes=new Set(existingLock.assets.map(item=>item.sha256));
  let transferredBytes=0,additionalUniqueBytes=0;
  const remainingBudget=MAX_TRANSFER_BYTES-(existingLock.uniqueBytes||0);
  const acquire=async url=>{
    url=new URL(url).href;validateSourceURL(url);if(!assetKind(url))throw new Error('Non-static asset rejected');
    if(captured.has(url))return captured.get(url);
    const task=(async()=>{
      let bytes,entry;const previous=oldURLs.get(url);
      if(previous){bytes=await readFile(resolve(cacheDir,previous.file));verifyAssetBytes(previous,bytes);}
      else{
        bytes=Buffer.from(await fetchBytes(url,Math.min(MAX_ASSET_BYTES,remainingBudget-transferredBytes)));
        transferredBytes+=bytes.length;
        if(bytes.length===0||bytes.length>MAX_ASSET_BYTES||transferredBytes>remainingBudget)throw new Error('Supplemental transfer budget exceeded');
      }
      const hash=sha256(bytes),ext=extname(decodeURIComponent(new URL(url).pathname)),file=hash+ext;
      if(!knownHashes.has(hash)){additionalUniqueBytes+=bytes.length;knownHashes.add(hash);}
      if(additionalUniqueBytes>remainingBudget)throw new Error('Combined cache exceeds 200 MB');
      entry={url,sha256:hash,bytes:bytes.length,type:ext==='.png'?'image/png':ext==='.jpg'?'image/jpeg':ext==='.mp3'?'audio/mpeg':ext==='.json'?'application/json':'text/plain',...(pngDimensions(bytes)?{dimensions:pngDimensions(bytes)}:{})};
      const temporary=resolve(cacheDir,file+'.capture-'+process.pid);
      try{await writeFile(temporary,bytes);await rename(temporary,resolve(cacheDir,file));}finally{await rm(temporary,{force:true});}
      onProgress({url,bytes:bytes.length,transferredBytes});return{entry,bytes};
    })();captured.set(url,task);return task;
  };
  const inventories=[];
  for(const spec of supplementalCatalog){
    const imageBase=BASE+'Images/'+spec.assetBaseName+'/',soundBase=BASE+'Sound/'+spec.assetBaseName+'/',entries=new Map(),wholeImageFrames={};
    const add=async url=>{const result=await acquire(url);entries.set(result.entry.url,result.entry);return result;};
    for(const path of spec.atlasPaths){
      const atlasURL=new URL(path,imageBase).href,{bytes}=await add(atlasURL),atlas=JSON.parse(bytes);
      if(!atlas.frames||!atlas.meta?.image)throw new Error('Invalid declared texture atlas');
      await add(new URL(atlas.meta.image,atlasURL).href);
    }
    for(const path of spec.spinePaths){
      const skeletonURL=new URL(path,imageBase).href;await add(skeletonURL);
      const atlasURL=skeletonURL.replace(/\.json$/,'.atlas.txt'),{bytes}=await add(atlasURL);
      for(const page of parseSpineAtlas(bytes.toString('utf8')).pages)await add(new URL(page.name,atlasURL).href);
    }
    for(const path of spec.imagePaths){
      const {entry}=await add(new URL(path,imageBase).href);
      if(path.startsWith('Images/')&&entry.dimensions)wholeImageFrames['@Image/'+path.slice(7).replace(/\.png$/,'')]={url:entry.url,...entry.dimensions};
    }
    for(const path of spec.soundPaths)await add(new URL(path,soundBase).href);
    // These font URLs are declared by the shared Styles/fonts.css. Their exact
    // bytes were already locked by the first seven games, so reuse the cache.
    for(const item of existingLock.assets.filter(item=>item.kinds.includes('font'))){
      for(const url of item.urls.filter(url=>url.startsWith(BASE+'Fonts/')))await add(url);
    }
    inventories.push({machineId:spec.machineId,officialGameName:spec.officialGameName,grid:spec.grid,
      reference:{officialDemo:`https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=${spec.officialGameName}&Token=DEMO&PortalName=demo`,observedAt:new Date().toISOString(),sourceURLs:spec.sourceURLs,backgroundSource:BASE+'Styles/othergamesslots.css'},
      presentation:{...spec.presentation,assetBaseName:spec.assetBaseName,wholeImageFrames,sourceScope:'Declared desktop static art; authored review placement. Not a complete mobile parity claim.',declaredUnfetchedAnimations:(spec.declaredAnimationPaths||[]).map(path=>new URL('Sprite/'+path,imageBase).href)},
      presentationAssets:[...entries.values()].sort((a,b)=>a.url.localeCompare(b.url))});
  }
  return{schemaVersion:1,productionLaunchEnabled:false,transferredBytes,additionalUniqueBytes,inventories};
}

async function main(){
  const index=process.argv.indexOf('--cache-dir'),cacheDir=index>=0?resolve(process.argv[index+1]):resolve(ROOT,'assets');
  const existingLock=JSON.parse(await readFile(resolve(ROOT,'reference-assets.lock.json'),'utf8'));
  let count=0;
  const result=await captureSupplemental({cacheDir,existingLock,fetchBytes:async(url,limit)=>{
    if(limit<=0)throw new Error('Transfer budget exhausted');
    const {stdout}=await run('curl',['--silent','--show-error','--fail','--proto','=https','--max-redirs','0','--connect-timeout','15','--max-time','35','--max-filesize',String(limit),url],{encoding:'buffer',maxBuffer:limit+1024});return stdout;
  },onProgress:item=>{count++;if(count%10===0)console.log(JSON.stringify({captured:count,transferredBytes:item.transferredBytes}));}});
  await writeFile(resolve(ROOT,'supplemental-inventories.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({games:result.inventories.length,transferredBytes:result.transferredBytes,additionalUniqueBytes:result.additionalUniqueBytes}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
