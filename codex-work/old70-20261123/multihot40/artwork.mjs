import {drawSprite} from './sprite-renderer.mjs';
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export async function loadArtwork({base=new URL('./',import.meta.url),fetcher=globalThis.fetch,doc=globalThis.document,onProgress=()=>{}}={}) {
 const root=new URL(base,globalThis.location?.href);
 if(root.origin!==globalThis.location?.origin)throw Error('MH40_SAME_ORIGIN_REQUIRED');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000),bitmaps=[];
 try{
  const response=await fetcher(new URL('artwork.json',root),{signal:controller.signal,credentials:'omit',redirect:'error'});
  if(!response.ok)throw Error('MH40_ART_MANIFEST_UNAVAILABLE');
  const manifest=await response.json();
  if(manifest.gameId!=='multihot40_native'||manifest.mode!=='PRACTICE'||!Array.isArray(manifest.assets)||manifest.assets.length!==3)
   throw Error('MH40_ART_MANIFEST_INVALID');
  let completed=0;
  const images=new Map(await Promise.all(manifest.assets.map(async asset=>{
   if(!/^[a-f0-9]{64}$/.test(asset.sha256)||asset.file!=='media/'+asset.sha256+'.png'||asset.bytes>3000000)
    throw Error('MH40_ASSET_IDENTITY');
   const r=await fetcher(new URL(asset.file,root),{signal:controller.signal,credentials:'omit',redirect:'error'});
   if(!r.ok)throw Error('MH40_ASSET_UNAVAILABLE');
   const bytes=await r.arrayBuffer();
   if(bytes.byteLength!==asset.bytes||hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))!==asset.sha256)
    throw Error('MH40_ASSET_INTEGRITY');
   const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));bitmaps.push(bitmap);onProgress(++completed,3);
   return [asset.sha256,bitmap];
  })));
  const symbols=Array(8);
  for(const atlas of manifest.sprites)for(const [name,descriptor] of Object.entries(atlas.frames)){
   const index=Number(name.slice(4)),canvas=doc.createElement('canvas');canvas.width=230;canvas.height=230;
   drawSprite(canvas.getContext('2d'),images.get(atlas.imageAssetId),descriptor,0,0,230,230);
   const image=await createImageBitmap(canvas);bitmaps.push(image);
   symbols[index]={image,descriptor:{frame:{x:0,y:0,w:230,h:230},trim:{x:0,y:0,w:230,h:230},sourceSize:{w:230,h:230},rotated:false}};
  }
  if(Array.from(symbols).some(s=>!s))throw Error('MH40_SYMBOLS_INCOMPLETE');
  const background=images.get(manifest.background);
  // Keep only the small cropped sprites and background after decoding.
  for(const [id,bitmap] of images)if(id!==manifest.background)bitmap.close();
  return {symbols,background,audio:manifest.audio,dispose(){bitmaps.forEach(b=>b.close());}};
 }catch(error){controller.abort();bitmaps.forEach(b=>b.close());throw error;}
 finally{clearTimeout(timeout);}
}
