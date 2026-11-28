// Verify each per-game file once, then reuse its bytes for native images/audio.
// A page-local URL prevents every new SVG control and audio voice downloading
// the same atlas/clip again, including browsers with the HTTP cache disabled.
import {EXISTING_M20_GAME_ID as GAME_ID} from '../host-presentation.mjs';
const hashBytes=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
const reason=signal=>signal.reason instanceof Error?signal.reason:Error('ASSET_LOAD_ABORTED');
// Coordinates are visual metadata from the retained original Multi Hot 20
// atlases, checked against the fresh official demo. No provider code is used.
const ATLAS_SIZES=[[2047,2047],[2047,2025],[2047,2047],[1093,1946],[1822,1793]];
const SYMBOL_FRAMES={
 seven:{atlas:2,x:1337,y:1,w:225,h:264,turn:-1},
 bell:{atlas:3,x:612,y:1335,w:217,h:243,turn:-1},
 grape:{atlas:3,x:612,y:1098,w:230,h:235},
 watermelon:{atlas:2,x:1837,y:1791,w:232,h:209,turn:-1},
 cherry:{atlas:3,x:1,y:1657,w:218,h:244},
 orange:{atlas:3,x:844,y:1098,w:214,h:248,turn:-1},
 plum:{atlas:1,x:1514,y:586,w:197,h:263},
 lemon:{atlas:2,x:1603,y:1,w:220,h:243,turn:-1}
};
// These are exact visible-pixel bounds measured in the retained original
// WIN artwork. They are not claimed to be the provider's unavailable atlas
// trim offsets. Placement and win tiers are presentation-only ZPLAY rules.
const WIN_FRAMES={
 __winNice:{atlas:0,x:240,y:1861,w:264,h:105},
 __winText:{atlas:0,x:2,y:1881,w:236,h:100},
 __winCrownSmall:{atlas:0,x:711,y:1961,w:60,h:48},
 __winMoneyFrame:{atlas:0,x:576,y:1080,w:430,h:155},
 __winCoin:{atlas:0,x:1400,y:1911,w:105,h:97},
 __winFrame:{atlas:1,x:869,y:30,w:399,h:379},
 __winBacklight:{atlas:1,x:7,y:7,w:855,h:834},
 __winShine:{atlas:1,x:881,y:428,w:391,h:397},
 __winBig:{atlas:0,x:1645,y:1908,w:198,h:100},
 __winSuper:{atlas:0,x:1062,y:1800,w:344,h:109},
 __winFantastic:{atlas:0,x:786,y:1683,w:537,h:115}
};

export async function loadVerifiedAssets({manifestURL=new URL('./assets.json',import.meta.url),fetcher=globalThis.fetch,
 doc=globalThis.document,imageDecoder=globalThis.createImageBitmap,signal,timeoutMs=30000}={}){
 if(typeof fetcher!=='function'||typeof imageDecoder!=='function')throw Error('ASSET_DECODER_UNAVAILABLE');
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('ASSET_TIMEOUT_REQUIRED');
 manifestURL=new URL(manifestURL,globalThis.location?.href||import.meta.url);
 const lifetime=new AbortController(),urls=new Map(),cache=new Map(),bitmaps=new Set(),assetMap={};
 let disposed=false,manifest,base;
 const onAbort=()=>lifetime.abort(signal?.reason||Error('ASSET_LOAD_ABORTED'));
 if(signal?.aborted)onAbort();else signal?.addEventListener('abort',onAbort,{once:true});
 const active=()=>{if(lifetime.signal.aborted)throw reason(lifetime.signal)};
 function dispose(){
  if(disposed)return;disposed=true;lifetime.abort(Error('ASSETS_DISPOSED'));
  signal?.removeEventListener('abort',onAbort);
  for(const url of urls.values())URL.revokeObjectURL(url);
  for(const bitmap of bitmaps)try{bitmap.close?.()}catch{}
  bitmaps.clear();urls.clear();cache.clear();
 }
 async function bounded(operation,label){
  active();
  const request=new AbortController();let timer,rejectAbort;
  const stopped=new Promise((_,reject)=>{rejectAbort=reject});
  const abort=()=>{request.abort(reason(lifetime.signal));rejectAbort(reason(lifetime.signal))};
  lifetime.signal.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>{const error=Error('ASSET_LOAD_TIMEOUT_'+label);request.abort(error);rejectAbort(error)},timeoutMs);
  try{return await Promise.race([operation(request.signal),stopped])}
  finally{clearTimeout(timer);lifetime.signal.removeEventListener('abort',abort)}
 }
 async function bytes(file){
  active();
  if(cache.has(file))return cache.get(file);
  const record=manifest.files?.[file];
  if(!record||!/^[a-f0-9]{64}$/.test(record.sha256)||!Number.isInteger(record.bytes)||record.bytes<=0)throw Error('OFFICIAL_ASSET_NOT_VERIFIED_'+file);
  if(!/^[a-z0-9][a-z0-9._-]*$/i.test(file))throw Error('INVALID_ASSET_PATH');
  const url=new URL(file,base);
  if(url.origin!==base.origin||url.pathname!==base.pathname+file)throw Error('INVALID_ASSET_PATH');
  const work=bounded(async requestSignal=>{
   const response=await fetcher(url,{credentials:'same-origin',cache:'force-cache',redirect:'error',signal:requestSignal});
   if(!response.ok)throw Error('ASSET_NOT_SERVED_'+file);
   const value=await response.arrayBuffer();
   if(value.byteLength!==record.bytes||await hashBytes(value)!==record.sha256)throw Error('ASSET_INTEGRITY_ERROR_'+file);
   if(requestSignal.aborted)throw reason(requestSignal);
   return new Blob([value],{type:record.contentType});
  },file).then(blob=>{active();urls.set(file,URL.createObjectURL(blob));return blob}).catch(error=>{cache.delete(file);throw error});
  cache.set(file,work);return work;
 }
 async function image(file){
  const blob=await bytes(file);
  return bounded(async requestSignal=>{
   const bitmap=await imageDecoder(blob);
   if(requestSignal.aborted||lifetime.signal.aborted){try{bitmap.close?.()}catch{}throw reason(requestSignal.aborted?requestSignal:lifetime.signal)}
   if(!(bitmap.width>0)||!(bitmap.height>0)){try{bitmap.close?.()}catch{}throw Error('OFFICIAL_IMAGE_EMPTY_'+file)}
   bitmaps.add(bitmap);return bitmap;
  },'DECODE_'+file);
 }
 function crop(bitmap,{x,y,w,h,turn=0}){
  const packedWidth=turn?h:w,packedHeight=turn?w:h;
  if(![x,y,w,h].every(Number.isSafeInteger)||x<0||y<0||w<=0||h<=0||
   x+packedWidth>bitmap.width||y+packedHeight>bitmap.height)throw Error('OFFICIAL_ATLAS_REGION_INVALID');
  const canvas=doc?.createElement('canvas');if(!canvas)throw Error('CROP_CANVAS_UNAVAILABLE');
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('CROP_CANVAS_UNAVAILABLE');
  if(turn<0){ctx.translate(0,h);ctx.rotate(-Math.PI/2)}
  else if(turn>0){ctx.translate(w,0);ctx.rotate(Math.PI/2)}
  ctx.drawImage(bitmap,x,y,packedWidth,packedHeight,0,0,packedWidth,packedHeight);
  return canvas;
 }
 try{
  manifest=await bounded(async requestSignal=>{
   const response=await fetcher(manifestURL,{cache:'no-store',credentials:'same-origin',redirect:'error',signal:requestSignal});
   if(!response.ok)throw Error('ASSET_MANIFEST_UNAVAILABLE');
   return response.json();
  },'MANIFEST');
  active();
  if(manifest.schema!=='zplay/verified-official-capture-assets/v1'||manifest.gameId!==GAME_ID)throw Error('OTHER_GAME_ASSETS_REJECTED');
  if(!Array.isArray(manifest.symbols)||!manifest.files||typeof manifest.files!=='object')throw Error('INVALID_ASSET_MANIFEST');
  base=new URL(manifest.baseUrl,manifestURL);
  if(base.origin!==manifestURL.origin||!base.pathname.endsWith('/')||base.search||base.hash)throw Error('INVALID_ASSET_BASE');
  if(manifest.symbols.length!==8||new Set(manifest.symbols).size!==8||
   manifest.symbols.some(name=>!Object.hasOwn(SYMBOL_FRAMES,name)))throw Error('INVALID_SYMBOL_INVENTORY');
  const names=['atlas-0.png','atlas-1.png','atlas-2.png','atlas-3.png','atlas-logo.png'];
  const atlases=await Promise.all(names.map(async(file,index)=>{
   const bitmap=await image(file),[width,height]=ATLAS_SIZES[index];
   if(bitmap.width!==width||bitmap.height!==height)throw Error('OFFICIAL_ATLAS_DIMENSIONS_'+file);
   return bitmap;
  }));
  for(const [name,frame] of Object.entries(SYMBOL_FRAMES))assetMap[name]=crop(atlases[frame.atlas],frame);
  assetMap.__background=await image('background.png');
  assetMap.__wheelNumbers=atlases[3];assetMap.__wheelFrame=atlases[0];assetMap.__wheelLight=atlases[2];
  assetMap.__boxFrame=crop(atlases[1],{x:1,y:1098,w:1119,h:696});
  // Only the inspected base-title region is shown, never the whole Spine sheet.
  // The packed lettering reads bottom-to-top, so it needs a clockwise turn.
  assetMap.__title=crop(atlases[4],{x:2,y:1158,w:633,h:152,turn:1});
  const winPages=await Promise.all(['wins.png','wins2.png'].map(async(file,index)=>{
   const bitmap=await image(file),[width,height]=[[2042,2010],[1529,847]][index];
   if(bitmap.width!==width||bitmap.height!==height)throw Error('OFFICIAL_ATLAS_DIMENSIONS_'+file);
   return bitmap;
  }));
  for(const [name,frame] of Object.entries(WIN_FRAMES))assetMap[name]=crop(winPages[frame.atlas],frame);
  async function primeAudio(){
   active();
   const result={};
   await Promise.all(['spin','reel-stop','win','button','music','fast-motion'].map(async name=>{
    const file=name+'.mp3';if(!manifest.files[file])return;
    // A clip promised by the verified manifest must not silently disappear.
    // Features without a listed clip remain optional, such as fast-motion.
    await bytes(file);active();result[name]=urls.get(file);
   }));
   return result;
  }
  return {manifest,images:assetMap,urls,primeAudio,dispose};
 }catch(error){dispose();throw error}
}

export function createSoundEngine({win=globalThis.window,doc=globalThis.document,audioConstructor=globalThis.Audio,clipUrls={}}={}){
 const effects=new Map(),music=clipUrls.music?new audioConstructor(clipUrls.music):null;
 if(music){music.loop=true;music.volume=.28;}
 let enabled=false,musicEnabled=false,focused=typeof doc?.hasFocus==='function'?doc.hasFocus():true;
 let pageHidden=false,destroyed=false,musicStarting=false,musicPlaying=false,musicGeneration=0;
 const silent=()=>destroyed||!focused||pageHidden||!!doc?.hidden;
 const pause=a=>{try{a.pause()}catch{}};
 function release(a){
  effects.delete(a);a.onended=null;a.onerror=null;pause(a);try{a.currentTime=0}catch{}
 }
 function stopEffects(){for(const a of [...effects.keys()])release(a)}
 function stop(name){for(const [a,key] of [...effects])if(key===name)release(a);if(name==='music')stopMusic()}
 function stopMusic(){musicGeneration++;musicStarting=false;musicPlaying=false;if(music)pause(music)}
 function setMusic(){
  if(!music)return;
  if(silent()||!musicEnabled){stopMusic();return}
  if(musicStarting||musicPlaying||music.paused===false)return;
  const generation=++musicGeneration;musicStarting=true;
  try{
   Promise.resolve(music.play()).then(()=>{
    if(silent()||!musicEnabled){pause(music);if(generation===musicGeneration){musicStarting=false;musicPlaying=false}}
    else if(generation===musicGeneration){musicStarting=false;musicPlaying=true}
   },()=>{if(generation===musicGeneration){musicStarting=false;musicPlaying=false;pause(music)}});
  }catch{musicStarting=false;musicPlaying=false;pause(music)}
 }
 if(music){music.onended=()=>{musicStarting=false;musicPlaying=false};music.onerror=()=>stopMusic()}
 const onBlur=()=>{focused=false;stopEffects();setMusic()};
 const onFocus=()=>{focused=true;setMusic()};
 const onHidden=()=>{if(doc?.hidden)stopEffects();setMusic()};
 const onPageHide=()=>{pageHidden=true;stopEffects();setMusic()};
 const onPageShow=()=>{pageHidden=false;focused=typeof doc?.hasFocus==='function'?doc.hasFocus():focused;setMusic()};
 win?.addEventListener('blur',onBlur);win?.addEventListener('focus',onFocus);
 win?.addEventListener('pagehide',onPageHide);win?.addEventListener('pageshow',onPageShow);doc?.addEventListener('visibilitychange',onHidden);
 return{
  set(e,m){if(destroyed)return;enabled=e===true;musicEnabled=m===true;if(!enabled||silent())stopEffects();setMusic()},
  play(name){
   if(!enabled||silent()||name==='music')return false;
   const src=clipUrls[name];if(!src)return false;
   if(name==='spin'||name==='win')stop(name);
   // Bound event voices across rapid taps; a single active game owns this set.
   while(effects.size>=12)release(effects.keys().next().value);
   let a;
   try{
    a=new audioConstructor(src);a.loop=false;effects.set(a,name);
    a.onended=()=>release(a);a.onerror=()=>release(a);
    Promise.resolve(a.play()).then(()=>{if(!effects.has(a)||!enabled||silent())pause(a)},()=>release(a));
    return true;
   }catch{if(a)release(a);return false}
  },
  stop,stopEffects,
  pauseAll(){stopEffects();stopMusic()},
  resumeOptedInMusic(){setMusic()},
  getSettings(){return{effects:enabled,music:musicEnabled}},
  destroy(){
   if(destroyed)return;destroyed=true;
   win?.removeEventListener('blur',onBlur);win?.removeEventListener('focus',onFocus);
   win?.removeEventListener('pagehide',onPageHide);win?.removeEventListener('pageshow',onPageShow);doc?.removeEventListener('visibilitychange',onHidden);
   stopEffects();stopMusic();if(music){music.onended=null;music.onerror=null}
  }
 };
}
