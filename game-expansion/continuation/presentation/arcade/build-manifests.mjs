#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {normalizeTextureAtlas,normalizeSpineRegions,normalizeFrame} from '../atlas.mjs';
import {verifyBytes} from '../../scripts/fetch-arcade-reference-assets.mjs';

const root=dirname(fileURLToPath(import.meta.url)),runFile=promisify(execFile);
const args=process.argv.slice(2),at=args.indexOf('--cache-dir'),cache=resolve(at<0?'/tmp/zplay-arcade-assets':args[at+1]);
const lock=JSON.parse(await readFile(join(root,'assets.lock.json'),'utf8'));
const source=JSON.parse(await readFile(join(root,'sources.json'),'utf8'));
const controls=JSON.parse(await readFile(join(root,'controls.json'),'utf8'));
const coinLayout=JSON.parse(await readFile(join(root,'coinminer-layout.json'),'utf8'));

// Pillow reads image metadata; it does not rewrite or transform source artwork.
const {stdout}=await runFile('python3',['-c',
  'from PIL import Image\nfrom pathlib import Path\nimport json,sys\na={}\nfor p in Path(sys.argv[1]).iterdir():\n if p.suffix.lower() in [".png",".webp",".jpg",".jpeg"]:\n  with Image.open(p) as i:a[p.name]={"width":i.width,"height":i.height}\nprint(json.dumps(a))',cache],{maxBuffer:1_000_000});
const dimensions=JSON.parse(stdout);
for(const item of lock.assets)verifyBytes(item,await readFile(join(cache,item.file)));

const definitions={
  towerx_native:{name:'Tower X',modelVersion:'superwin-towerx-2',sourceVariant:'SmartSoft TowerX b45',width:420,height:900},
  towerrush_native:{name:'Tower Rush',modelVersion:'superwin-towerrush-2',sourceVariant:'Galaxsys TowerRush v112 mobile default',width:420,height:900},
  coinminer_native:{name:'Coin Miner',modelVersion:'superwin-coinminer-3',sourceVariant:'Gaming Corps coin_miner_94 default',width:360,height:640},
};

// Current Spine4 public atlas omits indentation. Normalize its notation only,
// then reuse the reviewed shared bounds/rotation validator and renderer.
function indentSpineRegions(text){let page=true,region=false;return text.split(/\r?\n/).map(line=>{
  if(!line.trim()){page=true;region=false;return line;}
  if(!line.includes(':')){if(page){page=false;region=false;}else region=true;return line;}
  return region?'  '+line.trim():line;
}).join('\n');}

await mkdir(join(root,'manifests'),{recursive:true});
const index={schemaVersion:1,productionLaunchEnabled:false,financialActions:false,providerJavaScriptIncluded:false,uniqueAssetBytes:lock.uniqueBytes,games:{}};
for(const[id,definition]of Object.entries(definitions)){
  const assets=lock.assets.filter(item=>item.references.some(ref=>ref.gameId===id));
  const byKey=Object.fromEntries(assets.flatMap(item=>item.references.filter(ref=>ref.gameId===id).map(ref=>[ref.key,{...item,kind:ref.kind,sourceRef:ref.sourceRef}])));
  const files=Object.fromEntries(assets.map(item=>[item.file,{sha256:item.sha256,bytes:item.bytes,urls:item.urls,...dimensions[item.file]}]));
  const frames={},audio={},fonts=[],spines={};
  for(const[key,item]of Object.entries(byKey)){
    if(item.kind==='image'){
      const size=dimensions[item.file];if(!size)throw new Error('Missing image dimensions: '+key);
      frames[key]=normalizeFrame(key,{frame:{x:0,y:0,w:size.width,h:size.height}}, {...item,...size});
    }else if(item.kind==='audio')audio[key]={file:item.file,sourceRef:item.sourceRef};
    else if(item.kind==='font')fonts.push({name:key,file:item.file});
    else if(item.kind==='spine-skeleton')spines[key.replace(/_skeleton$/,'')]={skeletonFile:item.file,atlasFile:byKey[key.replace(/_skeleton$/,'_atlas')]?.file,sourceRef:item.sourceRef,playbackImplemented:false};
  }
  if(id==='towerrush_native'&&byKey.global_atlas&&byKey.global_texture){
    const data=JSON.parse(await readFile(join(cache,byKey.global_atlas.file),'utf8'));
    for(const[name,frame]of Object.entries(normalizeTextureAtlas(data,byKey.global_texture)))frames['atlas/'+name]={...frame,name:'atlas/'+name};
    if(byKey.frozen_atlas){
      const text=indentSpineRegions(await readFile(join(cache,byKey.frozen_atlas.file),'utf8'));
      const textures=Object.fromEntries(Object.entries(byKey).filter(([key])=>key.startsWith('frozen_texture_')).map(([key,item])=>[key.slice(15),item]));
      for(const[name,frame]of Object.entries(normalizeSpineRegions(text,textures)))frames['spine/'+name]={...frame,name:'spine/'+name};
    }
  }
  if(id==='towerx_native')for(const key of ['umbrella','houses'])if(byKey[key+'_atlas']){
    const text=await readFile(join(cache,byKey[key+'_atlas'].file),'utf8');
    const prefix=key+'_texture_';
    const textures=Object.fromEntries(Object.entries(byKey).filter(([name])=>name.startsWith(prefix)).map(([name,item])=>[name.slice(prefix.length),item]));
    for(const[name,frame]of Object.entries(normalizeSpineRegions(text,textures)))frames[key+'/'+name]={...frame,name:key+'/'+name};
  }
  const required=id==='towerx_native'?['logo','background','building1','building2','building3','building4','building5','bet_idle']:id==='towerrush_native'?['logo','background-back','background-front','basis-tower','buildBtn','cashoutBtn','atlas/tower-1','atlas/bonus-temple','atlas/bonus-triple']:['game_logo_portrait','tile1','tile2','prize1','tile_mine','tile_explosion','bonus_label'];
  const missing=required.filter(key=>!frames[key]);
  const manifest={schemaVersion:1,id,...definition,productionLaunchEnabled:false,releaseReady:false,fullDemoParity:false,financialActions:false,providerJavaScriptIncluded:false,files,frames,audio,fonts,spines,controls:controls.games[id],sourceRefs:source.sources.filter(item=>item.id.startsWith(id==='coinminer_native'?'coinminer':id.split('_')[0])),assetFailures:lock.failures.filter(item=>item.references.some(ref=>ref.gameId===id)),requiredArtMissing:missing,
    blockers:[...controls.games[id].remaining,'Receipt-driven authored scene; exact provider camera timing, transitions, responsive comparison and complete sound synchronization remain unverified.','These review scenes do not enable any wager route or change model release gates.'],
    ...(id==='coinminer_native'?{layout:{width:360,height:640,tiles:coinLayout.portrait.layouts.tiles,items:coinLayout.portrait.layouts.items},colors:coinLayout.defaultColors}:{}),
  };
  const file='manifests/'+id+'.json';await writeFile(join(root,file),JSON.stringify(manifest,null,2)+'\n');index.games[id]={file,name:definition.name,staticArtReady:missing.length===0,productionLaunchEnabled:false};
}
await writeFile(join(root,'index.json'),JSON.stringify(index,null,2)+'\n');
console.log(JSON.stringify({games:Object.keys(index.games),uniqueAssetBytes:index.uniqueAssetBytes,staticArtReady:Object.values(index.games).every(item=>item.staticArtReady),productionLaunchEnabled:false}));
