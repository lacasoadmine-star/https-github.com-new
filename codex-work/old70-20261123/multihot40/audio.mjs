/** Compressed same-origin audio. A gesture unlocks sound without awaiting downloads. */
export function createAudio({clips=[],base=new URL('./',import.meta.url),fetcher=globalThis.fetch,
 createContext=()=>{const Type=globalThis.AudioContext||globalThis.webkitAudioContext;return Type?new Type():null;},
 onError=()=>{},requestTimeoutMs=12000}={}) {
 let context=null,effects=false,music=false,hidden=false,disposed=false,unlocked=false,background=null;
 const paths=new Map(clips.map(c=>[c.label,c.path])),buffers=new Map(),pending=new Map(),voices=new Set();
 const report=error=>{try{onError(error);}catch{}};
 function release(voice){
  if(!voice||voice.closed)return;voice.closed=true;voices.delete(voice);
  try{voice.source.disconnect();}catch{}try{voice.gain.disconnect();}catch{}
  if(background===voice)background=null;
 }
 function stop(voice){if(!voice||voice.closed)return;try{voice.source.stop();}catch{}release(voice);}
 function syncBackground(){
  if(!background&&buffers.has(paths.get('Background.mp3'))&&music&&!hidden&&!disposed&&unlocked&&context?.state==='running')
   background=cue('Background.mp3',{loop:true,volume:.18})||null;
 }
 function load(path){
  if(disposed)return Promise.resolve(null);
  if(buffers.has(path))return Promise.resolve(buffers.get(path));
  if(pending.has(path))return pending.get(path).promise;
  const item={controller:new AbortController(),timedOut:false,timer:null,promise:null};pending.set(path,item);
  item.timer=setTimeout(()=>{item.timedOut=true;item.controller.abort();},requestTimeoutMs);
  item.promise=(async()=>{
   try{
    if(typeof path!=='string'||!/^media\/audio\/[a-f0-9]{64}\.mp3$/.test(path))throw Error('MH40_AUDIO_PATH');
    const url=new URL(path,base);if(url.origin!==base.origin)throw Error('MH40_AUDIO_ORIGIN');
    const response=await fetcher(url,{credentials:'omit',redirect:'error',signal:item.controller.signal});
    if(!response.ok)throw Error('MH40_AUDIO_UNAVAILABLE');
    const bytes=await response.arrayBuffer();if(!bytes.byteLength||bytes.byteLength>4000000)throw Error('MH40_AUDIO_SIZE');
    if(disposed)return null;
    const decoded=await context.decodeAudioData(bytes);if(disposed)return null;
    buffers.set(path,decoded);syncBackground();return decoded;
   }catch(error){
    if(!disposed&&(!item.controller.signal.aborted||item.timedOut))report(item.timedOut?Error('MH40_AUDIO_TIMEOUT'):error);
    return null;
   }finally{
    clearTimeout(item.timer);if(pending.get(path)===item)pending.delete(path);
   }
  })();return item.promise;
 }
 function warm(){
  if(disposed||hidden||!unlocked||context?.state!=='running')return;
  const wanted=new Set();
  if(effects)for(const [name,path] of paths)if(name!=='Background.mp3')wanted.add(path);
  if(music&&paths.has('Background.mp3'))wanted.add(paths.get('Background.mp3'));
  for(const path of wanted)if(!buffers.has(path)&&!pending.has(path))void load(path);
  syncBackground();
 }
 function cue(name,{loop=false,volume=.4}={}){
  if(disposed||hidden||!unlocked||context?.state!=='running'||(loop?!music:!effects))return;
  const path=paths.get(name);if(!path)return;
  if(!buffers.has(path)){if(!pending.has(path))void load(path);return;}
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.get(path);source.loop=loop;gain.gain.value=volume;
  const voice={source,gain,loop,closed:false};voices.add(voice);
  source.connect(gain);gain.connect(context.destination);source.onended=()=>release(voice);
  try{source.start();return voice;}catch(error){release(voice);report(error);}
 }
 async function unlock(){
  if(disposed)return false;
  context??=createContext();if(!context)return false;
  await context.resume();if(disposed)return false;unlocked=true;warm();return true;
 }
 function preferences(nextEffects,nextMusic){
  effects=!!nextEffects;music=!!nextMusic;
  for(const voice of [...voices])if(hidden||(voice.loop?!music:!effects))stop(voice);
  warm();
 }
 return Object.freeze({unlock,cue,preferences,
  pause(){hidden=true;for(const voice of [...voices])stop(voice);},
  resume(){hidden=false;warm();},
  dispose(){
   if(disposed)return;disposed=true;unlocked=false;
   for(const item of pending.values()){clearTimeout(item.timer);item.controller.abort();}
   pending.clear();for(const voice of [...voices])stop(voice);buffers.clear();
   try{void Promise.resolve(context?.close()).catch(()=>{});}catch{}
  }
 });
}
