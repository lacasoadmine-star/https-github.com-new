// Extract original Foxy AUTO artwork without resampling or redrawing.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{PNG}=require('pngjs'),sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const source=process.argv[2]||'/workspace/work/r12-reference/FoxyHot20';
const wanted=new Set(['Button','ButtonActive','Checkbox','CheckboxActive','CheckboxIcon','CheckboxIconActive','Close','CloseHover','Input','InputActive','Line','Popup','Save','SaveHover']);
const sprites={},records=[];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(let i=0;i<5;i++){
 const prefix=source+'/Images/FoxyHot20/Mobile/Images/Sprites/Images-'+i;
 const json=JSON.parse(await readFile(prefix+'.json')),bytes=await readFile(prefix+'.png'),atlas=PNG.sync.read(bytes);
 for(const [key,entry]of Object.entries(json.frames)){
  if(!key.startsWith('AutoPlay/')||!wanted.has(key.slice(9)))continue;
  const f=entry.frame,s=entry.sourceSize,t=entry.spriteSourceSize,out=new PNG({width:s.w,height:s.h});
  out.data.fill(0);
  for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
   const sx=f.x+(entry.rotated?f.h-1-y:x),sy=f.y+(entry.rotated?x:y);
   atlas.data.copy(out.data,((y+t.y)*s.w+x+t.x)*4,(sy*atlas.width+sx)*4,(sy*atlas.width+sx)*4+4);
  }
  const png=PNG.sync.write(out),webp=await sharp(out.data,{raw:{width:s.w,height:s.h,channels:4}}).webp({lossless:true,nearLossless:false,effort:6}).toBuffer();
  const decoded=await sharp(webp).ensureAlpha().raw().toBuffer();let transparentRGBDifferences=0;
  for(let p=0;p<out.data.length;p+=4){
   if(out.data[p+3]!==decoded[p+3])throw Error('Alpha changed: '+key);
   const same=out.data.subarray(p,p+3).equals(decoded.subarray(p,p+3));
   if(!same&&out.data[p+3])throw Error('Visible RGB changed: '+key);
   if(!same)transparentRGBDifferences++;
  }
  const packed=webp.length<png.length?webp:png,mime=packed===webp?'image/webp':'image/png';
  sprites[key]='data:'+mime+';base64,'+packed.toString('base64');
  records.push({name:key,atlas:'Images-'+i+'.png',atlasSha256:sha(bytes),frame:f,rotated:entry.rotated,sourceSize:s,spriteSourceSize:t,width:s.w,height:s.h,pixelSha256:sha(out.data),packedSha256:sha(packed),bytes:packed.length,mime,alphaIdentical:true,visibleRGBAIdentical:true,transparentRGBDifferences:packed===webp?transparentRGBDifferences:0});
 }
}
if(records.length!==wanted.size)throw Error('Missing original AUTO artwork');
await writeFile(root+'public/official-foxy-dialog-assets.mjs','// Original demo AUTO pixels; provenance: evidence/r13/official-dialog-assets.json.\nexport const sprites=Object.freeze('+JSON.stringify(sprites)+');\n');
const mh5Source=process.argv[3]||source.replace(/FoxyHot20\/?$/,'MultiHot5'),mh5Sprites={},mh5Records=[];
for(const name of ['infinite','close','close-hover','checkbox']){
 const file='Images/Common/AutoPlay/'+name+'.png',bytes=await readFile(mh5Source+'/'+file),png=PNG.sync.read(bytes);
 mh5Sprites[name]='data:image/png;base64,'+bytes.toString('base64');
 mh5Records.push({name,file,url:'https://static.ssg-public.com/cache/b1/SlotsDemo/Content/'+file,sha256:sha(bytes),width:png.width,height:png.height,bytes:bytes.length,originalBytes:true});
}
await writeFile(root+'public/official-mh5-dialog-assets.mjs','// Original public demo AUTO images, unchanged; provenance: evidence/r13/official-dialog-assets.json.\nexport const sprites=Object.freeze('+JSON.stringify(mh5Sprites)+');\n');
await mkdir(root+'evidence/r13',{recursive:true});
await writeFile(root+'evidence/r13/official-dialog-assets.json',JSON.stringify({source,processing:'Exact source pixels unrotated and restored to original transparent source bounds; lossless WebP. Every alpha and visible RGB byte verified. No resizing, redraw or financial state.',sprites:records,mh5:{source:mh5Source,sprites:mh5Records}},null,2)+'\n');
console.log(JSON.stringify({sprites:records.length,bytes:records.reduce((sum,item)=>sum+item.bytes,0)}));
