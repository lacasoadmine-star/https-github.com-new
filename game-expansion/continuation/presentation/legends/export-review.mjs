#!/usr/bin/env node
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{dirname,resolve}from'node:path';
import{fileURLToPath}from'node:url';
import{createLegendsScene}from'./renderer.mjs';
const ROOT=dirname(fileURLToPath(import.meta.url)),index=JSON.parse(await readFile(resolve(ROOT,'index.json'),'utf8'));
await mkdir(resolve(ROOT,'evidence'),{recursive:true});
for(const[id,item]of Object.entries(index.games)){
 const manifest=JSON.parse(await readFile(resolve(ROOT,item.file),'utf8'));
 for(const variant of['base','bonus-art']){
  const scene=createLegendsScene(manifest,{}, {review:true,bonus:variant==='bonus-art'});
  await writeFile(resolve(ROOT,'evidence/'+id+'-'+variant+'-scene.json'),JSON.stringify(scene,null,2)+'\n');
 }
}
console.log('Exported four read-only Legends artwork scenes; no round or wallet supplied.');
