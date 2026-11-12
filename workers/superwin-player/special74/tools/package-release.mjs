import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,dirname,relative,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {inspectRelease} from './release.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..'),folder=resolve(root,'workers/superwin-player/special74');
const manifest=JSON.parse(await readFile(resolve(root,'reports/special74/manifest.json'),'utf8'));
const checks=await inspectRelease(manifest,root);
if(!checks.ready){console.error(JSON.stringify({packaged:false,reason:'All 74 implementations and evidence are required',unresolvedChecks:checks.issues.length}));process.exit(1);}
if(manifest.legacyDisposition!=='retain-existing-games-and-add-independent-special-games')throw Error('Additive release scope required');
const covers=JSON.parse(await readFile(resolve(folder,'cover-manifest.json'),'utf8')).assets;
const assets={},entries=[];
const mime={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff2':'font/woff2'};
async function add(runtimePath,sourcePath,expectedHash){
 if(!runtimePath.startsWith('/special-games/')||new URL(runtimePath,'https://player.invalid').pathname!==runtimePath)throw Error('Invalid packaged route');
 const source=resolve(root,sourcePath),rel=relative(folder,source);
 if(rel==='..'||rel.startsWith('..'+sep)||!(await stat(source)).isFile())throw Error('Only new package files may be published');
 const data=await readFile(source),sha256=createHash('sha256').update(data).digest('hex');
 if(expectedHash&&sha256!==expectedHash)throw Error('Asset changed after verification: '+sourcePath);
 if(assets[runtimePath]&&assets[runtimePath].sha256!==sha256)throw Error('Conflicting packaged asset');
 assets[runtimePath]={key:sha256+extname(source),sourcePath,sha256,bytes:data.length,contentType:mime[extname(source)]||'application/octet-stream'};
}
for(const e of manifest.entries){
 if(!/^[a-z0-9-]+$/.test(e.id)||e.selectedProvider!=='SmartSoft')throw Error('Invalid selected identity');
 if(!e.implementation?.entryHtml||!e.implementation?.entrySha256||!Array.isArray(e.implementation.assets)||!e.implementation.assets.length)throw Error('Missing independently playable package: '+e.id);
 const gamePath='/special-games/play/'+e.id,cover=covers.find(c=>c.id===e.id);
 if(!cover||cover.selectedName!==e.selectedName)throw Error('Missing official cover identity: '+e.id);
 await add(gamePath,e.implementation.entryHtml,e.implementation.entrySha256);
 await add(cover.runtimePath,cover.path,cover.sha256);
 for(const asset of e.implementation.assets)await add(asset.runtimePath,asset.path,asset.sha256);
 entries.push({id:e.id,title:e.selectedName,provider:'SmartSoft',ready:true,gamePath,cover:cover.runtimePath});
}
await add('/special-games/catalog.mjs','workers/superwin-player/special74/src/catalog.mjs');
await add('/special-games/catalog.css','workers/superwin-player/special74/src/catalog.css');
entries.sort((a,b)=>a.title.localeCompare(b.title,'en',{numeric:true,sensitivity:'base'}));
const version=createHash('sha256').update(JSON.stringify({entries,assets})).digest('hex').slice(0,16);
const release={ready:true,version,storagePrefix:'special74/'+version+'/',entries,assets};
await mkdir(resolve(folder,'dist'),{recursive:true});await writeFile(resolve(folder,'dist/release.json'),JSON.stringify(release,null,2)+'\n');
console.log(JSON.stringify({packaged:true,games:entries.length,assets:Object.keys(assets).length,version,productionChanged:false}));
