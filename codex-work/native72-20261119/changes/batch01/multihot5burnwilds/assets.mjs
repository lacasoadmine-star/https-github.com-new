// multihot5burnwilds: independently verifies each saved SmartSoft image and audio clip in the
// EXISTING Player asset route before using it. Never treats screenshots as reels.
// The source archive/sha256 map is assets.json, not a mutable remote CDN.
import {GAME_ID} from './controller.mjs';
const hashBytes=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
export async function loadVerifiedAssets({manifestURL=new URL('./assets.json',import.meta.url),fetcher=fetch,doc=document,imageDecoder=createImageBitmap}={}){
 const metaResponse=await fetcher(manifestURL,{cache:'no-store',credentials:'same-origin'});
 if(!metaResponse.ok)throw Error('ASSET_MANIFEST_UNAVAILABLE');
 const manifest=await metaResponse.json();
 if(manifest.schema!=='zplay/verified-official-capture-assets/v1'||manifest.gameId!==GAME_ID)throw Error('OTHER_GAME_ASSETS_REJECTED');
 const base=new URL(manifest.baseUrl,manifestURL);
 const urls=new Map(),cache=new Map();
 async function bytes(file){
  if(cache.has(file))return cache.get(file);
  const record=manifest.files?.[file];
  if(!record||!/^[a-f0-9]{64}$/.test(record.sha256)||!Number.isInteger(record.bytes))throw Error('OFFICIAL_ASSET_NOT_VERIFIED_'+file);
  const url=new URL(file,base);
  if(url.origin!==base.origin||url.pathname!==base.pathname+file)throw Error('INVALID_ASSET_PATH');
  const response=await fetcher(url,{credentials:'same-origin',cache:'no-store',redirect:'error'});
  if(!response.ok)throw Error('ASSET_NOT_SERVED_'+file);
  const value=await response.arrayBuffer();
  if(value.byteLength!==record.bytes||await hashBytes(value)!==record.sha256)throw Error('ASSET_INTEGRITY_ERROR_'+file);
  const blob=new Blob([value],{type:record.contentType});
  cache.set(file,blob);
  return blob;
 }
 async function image(file){
  const b=await bytes(file);
  return imageDecoder(b);
 }
 const assetMap={};
 for(const sym of ['seven','bell','grape','watermelon']){
  assetMap[sym]=await image(sym+'.png');
 }
 const strip=await image('other-fruits.png');
 if(!strip.width||!strip.height)throw Error('FRUIT_STRIP_EMPTY');
 // Exact order was observed in the four-picture archived strip.
 const fracs=[0,.227,.531,.751,1];
 for(let i=0;i<4;i++){
  const symbol=['lemon','plum','orange','cherry'][i],canvas=doc.createElement('canvas');
  canvas.width=180;canvas.height=180;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('CROP_CANVAS_UNAVAILABLE');
  const x=Math.round(fracs[i]*strip.width),r=Math.round(fracs[i+1]*strip.width);
  ctx.drawImage(strip,x,0,r-x,strip.height,0,0,180,180);assetMap[symbol]=canvas;
 }
 if(manifest.symbols.includes('wild'))assetMap.wild=await image('wild.png');
 assetMap.__background=await image('background.png');
 assetMap.__wheel=await image('wheel.png');
 // The Burn Wilds logo source is an animated Spine atlas, NOT a flat logo.
 // Retain the atlas for a verified animator; never render its entire sprite sheet.
 if(manifest.files['logo.png'])assetMap.__logoAtlas=await image('logo.png');
 // Create object URLs only for media that has passed byte-for-byte verification.
 async function audio(name){
  const file=name+'.mp3';
  if(!manifest.files[file])return null;
  // Sound must use the same-origin asset route: the original Player CSP does
  // not grant blob: for media, and the Worker pins every file's hash.
  if(!urls.has(file)){await bytes(file);urls.set(file,new URL(file,base).href)}
  return urls.get(file);
 }
 async function primeAudio(){
  const result={};for(const key of ['spin','reel-stop','win','button','music','fast-motion']){
   try{const value=await audio(key);if(value)result[key]=value}catch{/* A missing clip never influences a server wager. */}
  }
  return result;
 }
 return {manifest,images:assetMap,primeAudio,dispose(){urls.clear();cache.clear()}};
}
export function createSoundEngine({win=window,doc=document,audioConstructor=Audio,clipUrls={}}={}){
 const musicUrl=clipUrls.music||null;
 const effects=new Set(),music=musicUrl?new audioConstructor(musicUrl):null;
 if(music){music.loop=true;music.volume=.28;}
 let enabled=false,musicEnabled=false,blurred=false,destroyed=false;
 const silent=()=>destroyed||blurred||doc.hidden;
 const stopEffects=()=>{for(const a of effects){try{a.pause();a.currentTime=0}catch{}}effects.clear()};
 const setMusic=()=>{if(!music)return; if(!silent()&&musicEnabled){void music.play().catch(()=>{})}else music.pause()};
 const onBlur=()=>{blurred=true;stopEffects();setMusic()};
 const onFocus=()=>{blurred=false;setMusic()};
 const onHidden=()=>{if(doc.hidden)stopEffects();setMusic()};
 const onPageHide=()=>{blurred=true;stopEffects();setMusic()};
 win.addEventListener('blur',onBlur);win.addEventListener('focus',onFocus);win.addEventListener('pagehide',onPageHide);doc.addEventListener('visibilitychange',onHidden);
 return{
  set(e,m){enabled=e===true;musicEnabled=m===true;if(!enabled||silent())stopEffects();setMusic()},
  play(name){
   if(!enabled||silent())return false;
   const src=clipUrls[name];if(!src)return false;
   const a=new audioConstructor(src);effects.add(a);
   a.onended=()=>effects.delete(a);a.onerror=()=>{a.pause();effects.delete(a)};
   void a.play().catch(()=>{a.pause();effects.delete(a)});return true;
  },
  pauseAll(){stopEffects();music?.pause()},
  resumeOptedInMusic(){setMusic()},
  getSettings(){return {effects:enabled,music:musicEnabled}},
  destroy(){if(destroyed)return;destroyed=true;win.removeEventListener('blur',onBlur);win.removeEventListener('focus',onFocus);win.removeEventListener('pagehide',onPageHide);doc.removeEventListener('visibilitychange',onHidden);stopEffects();music?.pause()}
 };
}
