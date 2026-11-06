// Pack the native presentation animations retrieved from the explicit public demos.
// This includes asset data only, never the provider's runtime, RNG or game rules.
// Usage: node scripts/pack-native-animation-assets.mjs /path/to/reference/FoxyHot20 foxy
import {createRequire} from 'node:module';
import {readFile,writeFile,readdir,mkdir,rename} from 'node:fs/promises';
import {dirname,join,relative,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const require=createRequire(import.meta.url);
const runtimeRequire=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js'):require;
const sharp=runtimeRequire('sharp'),{PNG}=runtimeRequire('pngjs');
const root=fileURLToPath(new URL('../',import.meta.url)),source=process.argv[2],game=process.argv[3];
if(!source||!['foxy','mh5'].includes(game))throw Error('Provide a reference folder and foxy or mh5');
const providerName=game==='foxy'?'FoxyHot20':'MultiHot5',mobile=join(source,'Images',providerName,'Mobile');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const nativeBundles=game==='foxy'?{
 startLogo:'Start/Logo/Layer 64',forest:'Start/Background/fonis animacia',wins:'Win/Wins',fire:'Fire/skeleton',
 box0:'Box/0/melia',box1:'Box/1/zoma',box2:'Box/2/zoma',box3:'Box/3/zoma',box4:'Box/4/zoma',box5:'Box/5/zoma',box6:'Box/6/7',box7:'Box/7/warskvlavi'
}:{wins:'Start/Win/mogeba',menu:'Start/Menu/meniu',double:'Start/Double/multiplayeri',bigWinCoins:'Start/BigWinCoins/blazing-hot'};
const images=[],imageIndices=new Map(),fileIndices=new Map(),imageRecords=[],bundleRecords=[],sheetRecords=[],bundles={},spriteSheets={};
async function packedImage(path){
 if(fileIndices.has(path))return fileIndices.get(path);
 const original=await readFile(path),decoded=PNG.sync.read(original),w=decoded.width,h=decoded.height;
 const webp=await sharp(decoded.data,{raw:{width:w,height:h,channels:4}}).webp({lossless:true,nearLossless:false,effort:6}).toBuffer();
 const {data:rgba,info}=await sharp(webp).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(info.width!==w||info.height!==h||info.channels!==4)throw Error('Animation page dimensions changed: '+path);
 let alphaDifferences=0,visibleRGBDifferences=0,transparentRGBDifferences=0;
 for(let i=0;i<decoded.data.length;i+=4){
  if(decoded.data[i+3]!==rgba[i+3])alphaDifferences++;
  if(decoded.data[i]!==rgba[i]||decoded.data[i+1]!==rgba[i+1]||decoded.data[i+2]!==rgba[i+2]){
   if(decoded.data[i+3])visibleRGBDifferences++;else transparentRGBDifferences++;
  }
 }
 const accepted=webp.length<original.length&&alphaDifferences===0&&visibleRGBDifferences===0;
 const bytes=accepted?webp:original,mime=accepted?'image/webp':'image/png',digest=sha(bytes);
 let index=imageIndices.get(digest);if(index===undefined){index=images.length;images.push('data:'+mime+';base64,'+bytes.toString('base64'));imageIndices.set(digest,index);}
 fileIndices.set(path,index);
 imageRecords.push({file:relative(source,path),width:w,height:h,originalSha256:sha(original),originalBytes:original.length,packedSha256:digest,bytes:bytes.length,mime,alphaIdentical:true,visibleRGBIdentical:true,rgbaIdentical:!accepted||transparentRGBDifferences===0,transparentRGBDifferences:accepted?transparentRGBDifferences:0,webpRejected:alphaDifferences>0||visibleRGBDifferences>0});
 console.log(JSON.stringify({image:relative(mobile,path),originalBytes:original.length,bytes:bytes.length,losslessWebp:accepted}));
 return index;
}
for(const [key,stem]of Object.entries(nativeBundles)){
 const jsonPath=join(mobile,'Spine',stem+'.json'),atlasPath=join(mobile,'Spine',stem+'.atlas.txt');
 const jsonBytes=await readFile(jsonPath),atlasBytes=await readFile(atlasPath),skeleton=JSON.parse(jsonBytes),atlas=atlasBytes.toString('utf8');
 const pageNames=[...atlas.matchAll(/^([^\r\n]+\.png)\r?$/gm)].map(match=>match[1].trim());
 if(!pageNames.length)throw Error('No Spine atlas page names: '+atlasPath);
 const pages={};for(const name of pageNames)pages[name]=await packedImage(join(dirname(atlasPath),name));
 bundles[key]={skeleton,atlas,pages};
 bundleRecords.push({key,skeleton:relative(source,jsonPath),skeletonSha256:sha(jsonBytes),atlas:relative(source,atlasPath),atlasSha256:sha(atlasBytes),spineVersion:skeleton.skeleton?.spine,animations:Object.keys(skeleton.animations||{}),pageNames});
}
if(game==='mh5'){
 const spriteDir=join(mobile,'Sprite');
 for(const name of (await readdir(spriteDir)).filter(name=>name.endsWith('.json')).sort()){
  const path=join(spriteDir,name),bytes=await readFile(path),data=JSON.parse(bytes),imageName=data.meta?.image;
  if(!data.frames||!imageName)throw Error('Invalid native sprite sheet: '+name);
  const image=await packedImage(join(spriteDir,imageName));
  spriteSheets[basename(name,'.json')]={data,image};
  sheetRecords.push({key:basename(name,'.json'),file:relative(source,path),jsonSha256:sha(bytes),image:imageName,frames:Object.keys(data.frames).length,animations:Object.keys(data.animations||{})});
 }
}
const moduleName='native-animation-'+game+'-assets.mjs';
const body='// Original native presentation animation data; generated, not provider runtime.\n'+
 '// Lossless pages preserve every alpha byte and all visible RGB values.\n'+
 'const images='+JSON.stringify(images)+';\n'+
 'const sourceBundles='+JSON.stringify(bundles)+';\n'+
 'export const bundles=Object.freeze(Object.fromEntries(Object.entries(sourceBundles).map(([key,bundle])=>[key,{...bundle,pages:Object.fromEntries(Object.entries(bundle.pages).map(([name,index])=>[name,images[index]]))}])));\n'+
 'const sourceSheets='+JSON.stringify(spriteSheets)+';\n'+
 'export const spriteSheets=Object.freeze(Object.fromEntries(Object.entries(sourceSheets).map(([key,sheet])=>[key,{...sheet,image:images[sheet.image]}])));\n';
const modulePath=join(root,'public',moduleName);await writeFile(modulePath+'.tmp',body);await rename(modulePath+'.tmp',modulePath);
const summary={game,module:moduleName,bundleCount:Object.keys(bundles).length,spriteSheetCount:Object.keys(spriteSheets).length,uniqueImages:images.length,moduleBytes:Buffer.byteLength(body),moduleGzipBytes:gzipSync(body).length,originalImageBytes:imageRecords.reduce((n,r)=>n+r.originalBytes,0),packedImageBytes:imageRecords.reduce((n,r)=>n+r.bytes,0),allAlphaAndVisibleRGBExact:imageRecords.every(r=>r.alphaIdentical&&r.visibleRGBIdentical)};
await mkdir(join(root,'evidence/r12'),{recursive:true});
await writeFile(join(root,'evidence/r12/native-animation-'+game+'-assets.json'),JSON.stringify({...summary,processing:'Original JSON and atlas data retained without animation edits. Full pages encode as lossless WebP only when all decoded alpha bytes and RGB at nonzero alpha match exactly; otherwise original PNG. Fully transparent RGB exceptions recorded. No resizing, quantization or resampling.',bundles:bundleRecords,spriteSheets:sheetRecords,images:imageRecords},null,2)+'\n');
console.log(JSON.stringify(summary));
