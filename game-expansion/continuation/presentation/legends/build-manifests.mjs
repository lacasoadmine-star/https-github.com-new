#!/usr/bin/env node
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{fileURLToPath}from'node:url';
import{remainingPublicConfigs}from'../../models/remaining-games.mjs';
import{normalizeFrame}from'../atlas.mjs';
const ROOT=dirname(fileURLToPath(import.meta.url));
const lock=JSON.parse(await readFile(resolve(ROOT,'assets.lock.json'),'utf8')),derived=JSON.parse(await readFile(resolve(ROOT,'derived-symbols.json'),'utf8')),facts=JSON.parse(await readFile(resolve(ROOT,'../../references/galaxsys-runtime.json'),'utf8'));
const byURL=new Map(lock.assets.map(item=>[item.url,item])),index={schemaVersion:1,productionLaunchEnabled:false,games:{}};await mkdir(resolve(ROOT,'manifests'),{recursive:true});
for(const[id,spec]of Object.entries(lock.games)){
 const config=remainingPublicConfigs.find(item=>item.id===id),fact=facts.games.find(item=>item.id===id),poseData=JSON.parse(await readFile(resolve(ROOT,'poses/'+id+'.json'),'utf8')),files={},frames={},symbols={},images={},fonts=[],audio={};
 for(const asset of lock.assets.filter(item=>item.url.includes('/'+spec.slug+'/')||spec.fonts.includes(item.url))){files[asset.file]={sha256:asset.sha256,bytes:asset.bytes,mimeType:asset.mimeType,sourceURL:asset.url,kind:'original-public-static-asset'};}
 for(const[role,url]of Object.entries(spec.images)){const asset=byURL.get(url);if(asset)images[role]={file:asset.file,sha256:asset.sha256,...derived.dimensions[asset.file],sourceURL:url};}
 for(const url of spec.fonts){const asset=byURL.get(url);if(asset)fonts.push({file:asset.file,name:url.split('/').at(-1),sha256:asset.sha256});}
 for(const url of spec.audio){const asset=byURL.get(url);if(asset)audio[url.split('/').at(-1)]={file:asset.file,sha256:asset.sha256};}
 for(const symbol of config.symbols){
  const asset=derived.games[id]?.[symbol.id];if(!asset)continue;const key='symbols/'+symbol.id;
  const bounds=asset.alphaBounds||{x:0,y:0,width:asset.width,height:asset.height};
  frames[key]=normalizeFrame(key,{frame:{x:bounds.x,y:bounds.y,w:bounds.width,h:bounds.height}},{file:asset.file,sha256:asset.sha256,width:asset.width,height:asset.height});
  files[asset.file]={bytes:asset.bytes,sha256:asset.sha256,kind:asset.kind,skeletonSource:asset.skeletonSource,atlasSourceHashes:asset.atlasSourceHashes};
  symbols[symbol.id]={label:symbol.label,providerId:symbol.providerSymbolId,frame:key,sourceLayerCount:asset.layerCount};
 }
 const missingSymbols=config.symbols.filter(item=>!symbols[item.id]).map(item=>({id:item.id,label:item.label,issue:derived.issues.find(issue=>issue.game===id&&issue.symbol===item.id)?.error||'Source pose is not available',setupLayers:poseData.symbols[item.id]?.pose.layers.length??null,unsupported:poseData.symbols[item.id]?.pose.unsupported||[],missingRegions:poseData.symbols[item.id]?.missingRegions||[]}));
 const manifest={schemaVersion:1,id,name:spec.name,source:spec.runtime,officialPage:fact.officialPage,productionLaunchEnabled:false,status:missingSymbols.length?'incomplete-static-pose-review':'asset-backed-static-pose-review',grid:{columns:6,rows:5},expectedSymbols:config.symbols.map(item=>({id:item.id,label:item.label,providerId:item.providerSymbolId})),symbols,frames,files,images,fonts,audio,missingSymbols,
  progress:{thresholds:fact.progress.cumulativeThresholds,unit:fact.progress.unit,features:fact.features.map(({stage,god,name,threshold})=>({stage,god,name,threshold}))},
  layout:{width:420,height:900,provenance:'Authored mobile review placement using original mobile source artwork; symbols fit their visible alpha bounds without changing source pose geometry. Full provider pixel/layout parity is not verified.'},
  capabilities:{originalBackground:!!images.background,originalTitle:!!images.logo,sourceAtlasRegions:Object.keys(poseData.regions).length,derivedStaticSymbols:Object.keys(symbols).length,expectedSymbols:config.symbols.length,weightedStaticPose:true,animationPlayback:false,financialActions:false},
  remaining:['Complete actual animation and clipping/constraint cases listed in missingSymbols','Full character/god effects, cascades, feature and bonus transitions','Exact provider placement and all menu/paytable/control flows','Numeric paytable/model gaps remain gated in references/galaxsys-runtime.json','No host integration, publication or actual browser validation']};
 await writeFile(resolve(ROOT,'manifests/'+id+'.json'),JSON.stringify(manifest,null,2)+'\n');index.games[id]={name:spec.name,file:'manifests/'+id+'.json',status:manifest.status,capabilities:manifest.capabilities,missingSymbols};
}
await writeFile(resolve(ROOT,'index.json'),JSON.stringify(index,null,2)+'\n');console.log(JSON.stringify(index.games));
