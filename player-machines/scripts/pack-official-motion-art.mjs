// Reproducible extraction of native presentation sprites from publicly loaded
// SmartSoft demo atlases. No provider runtime, game rules or captured UI is used.
// Usage: node scripts/pack-official-motion-art.mjs /path/to/reference/FoxyHot20 foxy
import {createRequire} from 'node:module';
import {readFile,writeFile,readdir,mkdir,rename} from 'node:fs/promises';
import {dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const require=createRequire(import.meta.url);
let PNG,sharp;
try{({PNG}=require('pngjs'));}catch{({PNG}=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js')('pngjs'));}
try{sharp=require('sharp');}catch{sharp=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js')('sharp');}
const root=fileURLToPath(new URL('../',import.meta.url));
const source=process.argv[2],game=process.argv[3];
if(!source||!['foxy','mh5'].includes(game))throw Error('Provide reference directory and foxy or mh5');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function files(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())out.push(...await files(path));else out.push(path);}return out;}
const all=await files(source),manif=JSON.parse(await readFile(join(source,'asset-manifest.json'),'utf8'));
const atlasPaths=all.filter(path=>/\/Images\/Sprites\/Images-\d+\.json$/.test(path));
if(!atlasPaths.length)throw Error('No native sprite atlas JSON found');
function selected(key){return /^(Box\/Blur\/|Box\/Line\/|BlurBox\/|Multiplier\/Blur|Lines\/[0-8]$)/.test(key);}
const spriteMeta={},spriteIndexes={},unique=[],seen=new Map(),records=[],encodings=new Map();
const previewDir=join(source,'packed-preview');await mkdir(previewDir,{recursive:true});
for(const path of atlasPaths.sort()){
 const json=JSON.parse(await readFile(path,'utf8')),pngPath=join(dirname(path),json.meta.image),sourceBytes=await readFile(pngPath),sourcePNG=PNG.sync.read(sourceBytes);
 for(const [name,entry]of Object.entries(json.frames)){
  if(!selected(name)||entry.frame.w<=3&&entry.frame.h<=3)continue;
  const f=entry.frame,w=f.w,h=f.h;
  if(f.x+(entry.rotated?h:w)>sourcePNG.width||f.y+(entry.rotated?w:h)>sourcePNG.height)throw Error('Atlas crop out of bounds: '+name);
  const target=new PNG({width:w,height:h});
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   // TexturePacker JSON dimensions remain unrotated in this native export.
   // Packed clockwise rotations occupy h×w; reverse via exact pixel indexing.
   const sx=f.x+(entry.rotated?h-1-y:x),sy=f.y+(entry.rotated?x:y);
   sourcePNG.data.copy(target.data,(y*w+x)*4,(sy*sourcePNG.width+sx)*4,(sy*sourcePNG.width+sx)*4+4);
  }
  const encoded=PNG.sync.write(target,{colorType:6,inputColorType:6,bitDepth:8}),decoded=PNG.sync.read(encoded);
  if(!target.data.equals(decoded.data))throw Error('PNG pixel roundtrip mismatch: '+name);
  const digest=sha(encoded),pixelSha256=sha(target.data);
  let packed=encodings.get(digest);
  if(!packed){
   const webp=await sharp(target.data,{raw:{width:w,height:h,channels:4}}).webp({lossless:true,nearLossless:false,effort:6}).toBuffer();
   const {data:rgba,info}=await sharp(webp).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let visibleDifferences=0,alphaDifferences=0,transparentRGBDifferences=0;
   if(info.width!==w||info.height!==h||info.channels!==4)throw Error('WebP dimensions changed: '+name);
   for(let i=0;i<target.data.length;i+=4){
    if(target.data[i+3]!==rgba[i+3])alphaDifferences++;
    const rgbDiff=target.data[i]!==rgba[i]||target.data[i+1]!==rgba[i+1]||target.data[i+2]!==rgba[i+2];
    if(rgbDiff){if(target.data[i+3])visibleDifferences++;else transparentRGBDifferences++;}
   }
   const useWebp=webp.length<encoded.length&&visibleDifferences===0&&alphaDifferences===0;
   packed={bytes:useWebp?webp:encoded,mime:useWebp?'image/webp':'image/png',transparentRGBDifferences:useWebp?transparentRGBDifferences:0,webpRejected:visibleDifferences>0||alphaDifferences>0,visibleRGBAIdentical:true,alphaIdentical:true};
   encodings.set(digest,packed);
  }
  const packedSha256=sha(packed.bytes);
  let index=seen.get(packedSha256);if(index===undefined){index=unique.length;seen.set(packedSha256,index);unique.push('data:'+packed.mime+';base64,'+packed.bytes.toString('base64'));}
  spriteIndexes[name]=index;
  spriteMeta[name]={width:w,height:h,sourceSize:entry.sourceSize,spriteSourceSize:entry.spriteSourceSize};
  records.push({name,atlas:relative(source,pngPath),atlasSha256:sha(sourceBytes),frame:f,rotated:!!entry.rotated,sourceSize:entry.sourceSize,spriteSourceSize:entry.spriteSourceSize,pngSha256:digest,pixelSha256,pngPixelRoundtrip:true,packedSha256,mime:packed.mime,visibleRGBAIdentical:packed.visibleRGBAIdentical,alphaIdentical:packed.alphaIdentical,rgbaIdentical:packed.transparentRGBDifferences===0,transparentRGBDifferences:packed.transparentRGBDifferences,webpRejected:packed.webpRejected,pngBytes:encoded.length,bytes:packed.bytes.length});
  if(/^Box\/[0-9]+$/.test(name)||/Multiplier\/(Box|BorderBox|Numbers)$/.test(name)||/^Buttons\/Spin/.test(name))await writeFile(join(previewDir,name.replaceAll('/','-')+'.png'),encoded);
 }
}
const background=null,backgroundBytes=Buffer.alloc(0),backgroundPath=source;const fonts={},fontRecords=[];
const moduleName='official-'+game+'-motion-art.mjs';
const body='// Native demo presentation sprites; generated by scripts/pack-official-motion-art.mjs.\n'+
 '// Sprites are tightly cropped and unrotated. Lossless WebP preserves every\n'+
 '// visible RGBA value and every alpha byte; only RGB below alpha0 may differ.\n'+
 'const images='+JSON.stringify(unique)+';\n'+
 'const indexes='+JSON.stringify(spriteIndexes)+';\n'+
 'export const sprites=Object.freeze(Object.fromEntries(Object.entries(indexes).map(([key,index])=>[key,images[index]])));\n'+
 'export const spriteMeta=Object.freeze('+JSON.stringify(spriteMeta)+');\n'+
 'export const background='+JSON.stringify(background)+';\n'+
 'export const fonts=Object.freeze('+JSON.stringify(fonts)+');\n';
const modulePath=join(root,'public',moduleName);await writeFile(modulePath+'.tmp',body);await rename(modulePath+'.tmp',modulePath);
await mkdir(join(root,'evidence/r14'),{recursive:true});
await writeFile(join(root,'evidence/r14/motion-art-'+game+'.json'),JSON.stringify({game,module:moduleName,generatedBy:'scripts/pack-official-motion-art.mjs',sourceManifestSha256:sha(await readFile(join(source,'asset-manifest.json'))),sourceManifest:manif,processing:'Exact RGBA crop and inverse packed rotation; lossless WebP only when smaller and decoded alpha plus RGB of every nonzero-alpha pixel are identical. PNG fallback on any visible difference. RGB under fully transparent alpha may be discarded. No filtering, resizing, quantization, alpha removal, redraw or captured balance/outcome.',background:{file:relative(source,backgroundPath),sha256:sha(backgroundBytes),bytes:backgroundBytes.length},fonts:fontRecords,sprites:records,moduleBytes:Buffer.byteLength(body),moduleGzipBytes:gzipSync(body).length,uniqueImages:unique.length},null,2)+'\n');
console.log(JSON.stringify({game,module:moduleName,sprites:Object.keys(spriteIndexes).length,uniqueImages:unique.length,moduleBytes:Buffer.byteLength(body),moduleGzipBytes:gzipSync(body).length,verifiedVisiblePixelRoundtrips:records.length,webp:records.filter(x=>x.mime==='image/webp').length,pngFallbacks:records.filter(x=>x.webpRejected).length,backgroundBytes:backgroundBytes.length}));
