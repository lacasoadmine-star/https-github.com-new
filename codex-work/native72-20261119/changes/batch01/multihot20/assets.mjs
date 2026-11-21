// Verify each per-game file before decoding or exposing its existing Player URL.
// The Worker pins these same-origin paths; no blob: CSP exception is required.
import {GAME_ID} from './controller.mjs';
const hashBytes=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
const reason=signal=>signal.reason instanceof Error?signal.reason:Error('ASSET_LOAD_ABORTED');
const CONTROL_FILES=['auto-button.png','balance-frame.png','bet-frame.png','menu-icon.png','sound-icon.png','spin-button.png','turbo-icon.png'];

export async function loadVerifiedAssets({manifestURL=new URL('./assets.json',import.meta.url),fetcher=globalThis.fetch,
 doc=globalThis.document,imageDecoder=globalThis.createImageBitmap,signal,timeoutMs=15000}={}){
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
   const response=await fetcher(url,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:requestSignal});
   if(!response.ok)throw Error('ASSET_NOT_SERVED_'+file);
   const value=await response.arrayBuffer();
   if(value.byteLength!==record.bytes||await hashBytes(value)!==record.sha256)throw Error('ASSET_INTEGRITY_ERROR_'+file);
   if(requestSignal.aborted)throw reason(requestSignal);
   return new Blob([value],{type:record.contentType});
  },file).then(blob=>{active();urls.set(file,url.href);return blob}).catch(error=>{cache.delete(file);throw error});
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
  await Promise.all(['seven','bell','grape','watermelon'].map(async sym=>{assetMap[sym]=await image(sym+'.png')}));
  const strip=await image('other-fruits.png');
  const fruitNames=manifest.otherFruitsOrder||['lemon','plum','orange','cherry'];
  if(fruitNames.length!==4||new Set(fruitNames).size!==4||fruitNames.some(s=>!['lemon','plum','orange','cherry'].includes(s)))throw Error('INVALID_FRUIT_STRIP_ORDER');
  // Fractions belong to the source strip named and hashed by this manifest.
  const fracs=[0,.227,.531,.751,1];
  for(let i=0;i<4;i++){
   const canvas=doc?.createElement('canvas');if(!canvas)throw Error('CROP_CANVAS_UNAVAILABLE');
   canvas.width=180;canvas.height=180;
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('CROP_CANVAS_UNAVAILABLE');
   const x=Math.round(fracs[i]*strip.width),right=Math.round(fracs[i+1]*strip.width);
   const width=right-x,scale=Math.min(180/width,180/strip.height),drawWidth=width*scale,drawHeight=strip.height*scale;
   ctx.drawImage(strip,x,0,width,strip.height,(180-drawWidth)/2,(180-drawHeight)/2,drawWidth,drawHeight);assetMap[fruitNames[i]]=canvas;
  }
  strip.close?.();bitmaps.delete(strip);
  await Promise.all([
   image('background.png').then(value=>{assetMap.__background=value}),
   image('wheel.png').then(value=>{assetMap.__wheel=value}),
   ...CONTROL_FILES.filter(file=>manifest.files[file]).map(bytes)
  ]);
  if(manifest.symbols.includes('wild'))assetMap.wild=await image('wild.png');
  // A Spine atlas must never be painted as a flat logo or a finished game.
  if(manifest.files['logo.png'])assetMap.__logoAtlas=await image('logo.png');
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
