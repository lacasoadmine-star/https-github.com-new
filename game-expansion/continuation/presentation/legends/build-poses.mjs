#!/usr/bin/env node
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{fileURLToPath}from'node:url';
import{atlasRegions,verify}from'./assets.mjs';
import{extractSetupPose}from'./static-pose.mjs';
import{remainingPublicConfigs}from'../../models/remaining-games.mjs';
const ROOT=dirname(fileURLToPath(import.meta.url)),index=process.argv.indexOf('--cache-dir'),cache=index>=0?resolve(process.argv[index+1]):'/tmp/zplay-legends-assets';
const lock=JSON.parse(await readFile(resolve(ROOT,'assets.lock.json'),'utf8')),byURL=new Map(lock.assets.map(item=>[item.url,item]));
async function bytes(url){const entry=byURL.get(url);if(!entry)throw new Error('Missing captured source: '+url);const body=await readFile(resolve(cache,entry.file));verify(entry,body);return body;}
const results={schemaVersion:1,productionLaunchEnabled:false,method:'Static setup pose from the public Spine JSON and original atlas; no animation execution',games:{}};
await mkdir(resolve(ROOT,'poses'),{recursive:true});
for(const[id,game]of Object.entries(lock.games)){
 const config=remainingPublicConfigs.find(item=>item.id===id),textures={};
 for(const page of game.pages||[]){const entry=byURL.get(page.url);if(!entry)throw new Error('Missing original atlas page');await bytes(page.url);textures[page.name]={file:entry.file,sha256:entry.sha256};}
 const regions=atlasRegions((await bytes(game.atlasURL)).toString('utf8'),textures),symbols={},issues=[];
 for(const symbol of config.symbols){
  const item=game.skeletons.find(item=>item.providerId===symbol.providerSymbolId);
  if(!item||!byURL.has(item.url)){issues.push({symbol:symbol.id,reason:'missing-public-skeleton'});continue;}
  const skeleton=JSON.parse(await bytes(item.url)),pose=extractSetupPose(skeleton);
  const missing=pose.layers.filter(layer=>!regions[layer.regionName]).map(layer=>layer.regionName);
  symbols[symbol.id]={id:symbol.id,label:symbol.label,providerId:symbol.providerSymbolId,source:{url:item.url,sha256:byURL.get(item.url).sha256},animationNames:Object.keys(skeleton.animations||{}),pose,missingRegions:missing};
  if(!pose.complete||missing.length)issues.push({symbol:symbol.id,unsupported:pose.unsupported,missingRegions:missing});
  else if(!pose.layers.length)issues.push({symbol:symbol.id,reason:'No active setup attachments; a verified animation pose is required'});
 }
 const result={id,name:game.name,grid:{columns:6,rows:5},source:game.runtime,regions,symbols,issues,productionLaunchEnabled:false};
 await writeFile(resolve(ROOT,'poses/'+id+'.json'),JSON.stringify(result,null,2)+'\n');results.games[id]={file:'poses/'+id+'.json',symbols:Object.keys(symbols).length,regions:Object.keys(regions).length,issues};
}
await writeFile(resolve(ROOT,'poses/index.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.games));
