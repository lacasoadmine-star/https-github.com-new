#!/usr/bin/env node
import{readFile,writeFile,mkdir}from'node:fs/promises';
import{dirname,join}from'node:path';
import{fileURLToPath}from'node:url';
import{createArcadeScene}from'./arcade-renderer.mjs';
import{REVIEW_FIXTURES}from'./review-fixtures.mjs';
const root=dirname(fileURLToPath(import.meta.url));
await mkdir(join(root,'evidence'),{recursive:true});
const records=[];
for(const[id,fixtures]of Object.entries(REVIEW_FIXTURES)){
  const manifest=JSON.parse(await readFile(join(root,'manifests',id+'.json'),'utf8'));
  for(const fixture of fixtures){
    const scene=createArcadeScene(manifest,fixture.snapshot,fixture.options);
    scene.reviewFixture={id:fixture.id,label:fixture.label,synthetic:true,notAProductionReceipt:true};
    const file=id+'-'+fixture.id+'-scene.json';await writeFile(join(root,'evidence',file),JSON.stringify(scene,null,2)+'\n');
    records.push({gameId:id,fixture:fixture.id,file,synthetic:true,financialActions:false});
  }
}
await writeFile(join(root,'evidence/scenes.json'),JSON.stringify({schemaVersion:1,method:'Deterministic authored display lists using synthetic confirmed-public-receipt shapes',productionLaunchEnabled:false,scenes:records},null,2)+'\n');
console.log(JSON.stringify({reviewScenes:records.length,productionLaunchEnabled:false}));
