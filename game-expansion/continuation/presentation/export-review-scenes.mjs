#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPresentationScene} from './machine-renderer.mjs';
const root=dirname(fileURLToPath(import.meta.url)),index=JSON.parse(await readFile(resolve(root,'renderer-manifest.json'),'utf8'));
await mkdir(resolve(root,'evidence'),{recursive:true});
for(const[id,entry]of Object.entries(index.games)){
  const manifest=JSON.parse(await readFile(resolve(root,entry.file),'utf8'));
  if(!Object.keys(manifest.symbols).length)continue;
  const ids=Object.keys(manifest.symbols),grid=Array.from({length:manifest.grid.columns},(_,c)=>Array.from({length:manifest.grid.rows},(_,r)=>ids[(c*3+r)%ids.length]));
  const scene=createPresentationScene(manifest,{grid,canStart:false,balance:null,stake:null},{review:true});
  await writeFile(resolve(root,'evidence/'+id+'-scene.json'),JSON.stringify(scene,null,2)+'\n');
}
console.log('Exported read-only artwork scenes with blank financial values.');
