/** Compressed, same-origin clips; audio begins only after a user gesture. */
export function createAudio({clips=[],base=new URL('./',import.meta.url),fetcher=globalThis.fetch}={}) {
 let context=null,effects=false,music=false,hidden=false,disposed=false,loading=null;
 const buffers=new Map(),voices=new Set();let background=null;
 const paths=new Map(clips.map(c=>[c.label,c.path]));
 function stop(voice){if(!voice)return;try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();voices.delete(voice);}
 function cue(name,{loop=false,volume=.4}={}){
  if(disposed||hidden||!context||context.state!=='running'||(loop?!music:!effects)||!buffers.has(name))return;
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffers.get(name);source.loop=loop;gain.gain.value=volume;
  source.connect(gain);gain.connect(context.destination);const voice={source,gain,loop};voices.add(voice);
  source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();};source.start();return voice;
 }
 async function unlock(){
  if(disposed)return false;
  const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioContext)return false;
  context??=new AudioContext();await context.resume();
  loading??=Promise.all([...paths].map(async([name,path])=>{
   if(!/^media\/audio\/[a-f0-9]{64}\.mp3$/.test(path))throw Error('MH40_AUDIO_PATH');
   const response=await fetcher(new URL(path,base),{credentials:'omit',redirect:'error'});
   if(!response.ok)throw Error('MH40_AUDIO_UNAVAILABLE');
   const bytes=await response.arrayBuffer();if(bytes.byteLength>4000000)throw Error('MH40_AUDIO_SIZE');
   buffers.set(name,await context.decodeAudioData(bytes));
  })).catch(error=>{loading=null;throw error;});
  await loading;return true;
 }
 function preferences(nextEffects,nextMusic){
  effects=!!nextEffects;music=!!nextMusic;
  for(const voice of [...voices])if(hidden||(voice.loop?!music:!effects))stop(voice);
  if(background&&!voices.has(background))background=null;
  if(!background&&!hidden&&music)background=cue('Background.mp3',{loop:true,volume:.18});
 }
 return Object.freeze({unlock,cue,preferences,
  pause(){hidden=true;for(const voice of [...voices])stop(voice);background=null;},
  resume(){hidden=false;preferences(effects,music);},
  dispose(){disposed=true;for(const voice of [...voices])stop(voice);buffers.clear();void context?.close();}
 });
}
