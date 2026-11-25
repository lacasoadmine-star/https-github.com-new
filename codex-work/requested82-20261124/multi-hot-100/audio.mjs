// Original successful MultiHot100 public-demo responses, hashed locally.
// No other game's audio or generated substitute is used.
export const M100_AUDIO_PINS=Object.freeze([
  {
    "path": "Start/Background.mp3",
    "bytes": 2096626,
    "sha256": "0c567009cc1a1256f63396a4295d47318adc29985c7788e441a6a45b5412d9b5"
  },
  {
    "path": "Buttons/Spin.mp3",
    "bytes": 28322,
    "sha256": "09f3c156b5af5a4d739f0d0ca1009acea9f275b8bff9e26d9f30ae108bee7f87"
  },
  {
    "path": "Start/ObjectMoveFast.mp3",
    "bytes": 17180,
    "sha256": "63a970209db2dfd356c2f8ed596a1a5e8d2b9256526e8194ace0dad0c7c56cbc"
  },
  {
    "path": "Start/ReelStop1.mp3",
    "bytes": 22080,
    "sha256": "d6b01ee2afe2dadd5363d53fc31b96eefba14a0ecabc9e84060aa8e71ea1c946"
  },
  {
    "path": "Start/ReelStop2.mp3",
    "bytes": 22080,
    "sha256": "d6b01ee2afe2dadd5363d53fc31b96eefba14a0ecabc9e84060aa8e71ea1c946"
  },
  {
    "path": "Start/ReelStop3.mp3",
    "bytes": 22080,
    "sha256": "d6b01ee2afe2dadd5363d53fc31b96eefba14a0ecabc9e84060aa8e71ea1c946"
  },
  {
    "path": "Start/ReelStop4.mp3",
    "bytes": 22080,
    "sha256": "d6b01ee2afe2dadd5363d53fc31b96eefba14a0ecabc9e84060aa8e71ea1c946"
  },
  {
    "path": "Start/ReelStop5.mp3",
    "bytes": 22080,
    "sha256": "d6b01ee2afe2dadd5363d53fc31b96eefba14a0ecabc9e84060aa8e71ea1c946"
  },
  {
    "path": "Start/WinMultiplier.mp3",
    "bytes": 80640,
    "sha256": "e511cc791eca3fe7b9f836c8f7701b94eae754d2ef7267423cac27962b4a44aa"
  }
]);
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const clips={spin:'Buttons/Spin.mp3',multiplier:'Start/WinMultiplier.mp3',...Object.fromEntries(Array.from({length:5},(_,i)=>['reel-stop-'+(i+1),'Start/ReelStop'+(i+1)+'.mp3']))};

/** Audio remains silent until explicit user activation. */
export function createM100Audio({baseURL,fetcher=globalThis.fetch,onUnavailable=()=>{}}={}){
 let context=null,loading=null,consented=false,disposed=false,music=null,movement=null,suspended=false;
 let preferences={effects:false,music:false};const buffers=new Map(),sources=new Set();
 function stop(source){if(!source)return;try{source.stop();}catch{}sources.delete(source);}
 function source(path,{loop=false,volume=.6}={}){
  if(disposed||!consented||suspended||context?.state!=='running'||!buffers.has(path))return null;
  const node=context.createBufferSource(),gain=context.createGain();node.buffer=buffers.get(path);node.loop=loop;gain.gain.value=volume;node.connect(gain);gain.connect(context.destination);sources.add(node);node.onended=()=>sources.delete(node);node.start();return node;
 }
 function sync(){if(!consented||disposed)return;if(!preferences.music||suspended){stop(music);music=null;}else if(!music)music=source('Start/Background.mp3',{loop:true,volume:.28});if(!preferences.effects){stop(movement);movement=null;}}
 async function enable(){
  if(disposed)throw Error('M100_AUDIO_DISPOSED');if(!baseURL)throw Error('M100_AUDIO_UNAVAILABLE');
  const base=new URL(baseURL);if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash||!base.pathname.endsWith('/'))throw Error('M100_AUDIO_ORIGIN');
  if(!context){const Constructor=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Constructor)throw Error('M100_AUDIO_UNAVAILABLE');context=new Constructor();}
  suspended=false;await context.resume();
  loading??=Promise.all(M100_AUDIO_PINS.map(async pin=>{const response=await fetcher(new URL(pin.path,base),{credentials:'omit',redirect:'error',cache:'force-cache'});if(!response.ok||response.redirected)throw Error('M100_AUDIO_HTTP');const body=await response.arrayBuffer();if(body.byteLength!==pin.bytes||await hash(body)!==pin.sha256)throw Error('M100_AUDIO_HASH');const decoded=await context.decodeAudioData(body.slice(0));if(disposed)throw Error('M100_AUDIO_DISPOSED');buffers.set(pin.path,decoded);}));
  try{await loading;if(disposed)throw Error('M100_AUDIO_DISPOSED');consented=true;sync();return true;}catch(error){consented=false;loading=null;onUnavailable();throw error;}
 }
 return Object.freeze({enable,setEnabled(value){preferences={effects:value.effects===true,music:value.music===true};sync();},
  play(event){if(!preferences.effects||!consented)return;if(event==='settled'||event==='win'||event==='multiplier'){stop(movement);movement=null;}if(clips[event])source(clips[event]);if(event==='spin'&&!movement)movement=source('Start/ObjectMoveFast.mp3',{loop:true,volume:.3});},
  async suspend(){suspended=true;sync();stop(movement);movement=null;try{await context?.suspend();}catch{}},async resume(){if(!consented||disposed)return;suspended=false;try{await context?.resume();sync();}catch{}},
  snapshot(){return Object.freeze({consented,available:!!baseURL,loadedClips:buffers.size,contextState:context?.state??'not-created',providerAudioParityVerified:false});},
  dispose(){if(disposed)return;disposed=true;for(const node of [...sources])stop(node);buffers.clear();void context?.close().catch(()=>{});}});
}
