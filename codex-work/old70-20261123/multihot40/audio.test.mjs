import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from './audio.mjs';

const base=new URL('https://superwin-player.apdiy61.workers.dev/native-ui/old70/multihot40/');
const path=char=>'media/audio/'+char.repeat(64)+'.mp3';
const clips=[
 {label:'Button.mp3',path:path('a')},{label:'Background.mp3',path:path('b')},
 {label:'ReelStop1.mp3',path:path('c')},{label:'ReelStop2.mp3',path:path('c')},
 {label:'Spin.mp3',path:path('d')},{label:'ObjectMoveFast.mp3',path:path('e')}
];
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const flush=async()=>{for(let i=0;i<3;i++)await new Promise(resolve=>setImmediate(resolve));};
const response=(size=3)=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(size)});
function fixture(t,{fetcher=async()=>response(),decode=async bytes=>({bytes:bytes.byteLength}),selected=clips,timeout=12000}={}){
 const requests=[],started=[],sources=[],errors=[];let decoded=0,resumed=0,closed=0;
 const context={
  state:'suspended',destination:{},
  async resume(){resumed++;this.state='running';},
  async close(){closed++;this.state='closed';},
  async decodeAudioData(bytes){decoded++;return decode(bytes);},
  createBufferSource(){
   const source={stops:0,disconnects:0,connect(){},disconnect(){this.disconnects++;},
    start(){started.push(this);},stop(){this.stops++;this.onended?.();}};
   sources.push(source);return source;
  },
  createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
 };
 const audio=createAudio({clips:selected,base,createContext:()=>context,
  fetcher:(url,options)=>{requests.push({url,options});return fetcher(url,options);},
  onError:error=>errors.push(error.message),requestTimeoutMs:timeout});
 t.after(()=>audio.dispose());
 return {audio,requests,started,sources,errors,context,get decoded(){return decoded;},get resumed(){return resumed;},get closed(){return closed;}};
}

test('muted sessions fetch nothing; effects fetch four unique clips and omit background',async t=>{
 const h=fixture(t);h.audio.preferences(true,false);assert.equal(h.requests.length,0);
 await h.audio.unlock();await flush();
 assert.equal(h.requests.length,4);assert.equal(h.decoded,4);
 assert.ok(h.requests.every(r=>r.url.origin===base.origin&&!r.url.pathname.endsWith(path('b'))));
 assert.ok(h.requests.every(r=>r.options.credentials==='omit'&&r.options.redirect==='error'));
 h.audio.cue('ReelStop1.mp3');h.audio.cue('ReelStop2.mp3');
 assert.equal(h.started.length,2);assert.equal(h.started[0].buffer,h.started[1].buffer);
 await h.audio.unlock();await flush();assert.equal(h.requests.length,4);
});

test('unlock finishes while downloads wait and missed effects never play late',async t=>{
 const waiting=deferred(),h=fixture(t,{fetcher:()=>waiting.promise});
 h.audio.preferences(true,false);assert.equal(await h.audio.unlock(),true);
 assert.equal(h.requests.length,4);h.audio.cue('Spin.mp3');assert.equal(h.started.length,0);
 waiting.resolve(response());await flush();assert.equal(h.started.length,0);
 h.audio.cue('Spin.mp3');assert.equal(h.started.length,1);
});

test('background is requested only when music is explicitly enabled',async t=>{
 const h=fixture(t);await h.audio.unlock();await flush();assert.equal(h.requests.length,0);
 h.audio.preferences(false,true);await flush();
 assert.equal(h.requests.length,1);assert.ok(h.requests[0].url.pathname.endsWith(path('b')));
 assert.equal(h.started.length,1);assert.equal(h.started[0].loop,true);
 h.audio.preferences(false,true);await flush();assert.equal(h.started.length,1);
 h.audio.cue('Button.mp3');assert.equal(h.started.length,1);
});

test('muting during music loading prevents playback and pause/resume keeps one loop',async t=>{
 const waiting=deferred(),h=fixture(t,{fetcher:()=>waiting.promise});
 h.audio.preferences(false,true);await h.audio.unlock();
 h.audio.preferences(false,false);waiting.resolve(response());await flush();assert.equal(h.started.length,0);
 h.audio.preferences(false,true);assert.equal(h.started.length,1);
 h.audio.pause();assert.equal(h.sources[0].stops,1);assert.equal(h.sources[0].disconnects,1);
 h.audio.resume();assert.equal(h.started.length,2);
 h.audio.resume();assert.equal(h.started.length,2);assert.equal(h.requests.length,1);
 h.audio.preferences(false,false);assert.equal(h.sources[1].stops,1);
});

test('a failed effect neither discards other clips nor prevents a later retry',async t=>{
 let failed=true;
 const h=fixture(t,{fetcher:async url=>url.pathname.endsWith(path('d'))&&failed?{ok:false}:response()});
 h.audio.preferences(true,false);await h.audio.unlock();await flush();
 assert.deepEqual(h.errors,['MH40_AUDIO_UNAVAILABLE']);assert.equal(h.decoded,3);
 h.audio.cue('Button.mp3');assert.equal(h.started.length,1);
 failed=false;h.audio.preferences(true,false);await flush();
 assert.equal(h.requests.length,5);assert.equal(h.decoded,4);
 h.audio.cue('Spin.mp3');assert.equal(h.started.length,2);
});

test('dispose aborts outstanding requests, closes once and ignores late responses',async t=>{
 const waiting=deferred(),h=fixture(t,{fetcher:()=>waiting.promise});
 h.audio.preferences(true,true);await h.audio.unlock();assert.equal(h.requests.length,5);
 h.audio.dispose();h.audio.dispose();
 assert.equal(h.closed,1);assert.ok(h.requests.every(r=>r.options.signal.aborted));
 waiting.resolve(response());await flush();assert.equal(h.decoded,0);assert.equal(h.started.length,0);
 assert.equal(await h.audio.unlock(),false);h.audio.preferences(true,true);assert.equal(h.requests.length,5);
});

test('dispose during decode cannot resurrect music or retain a voice',async t=>{
 const decoding=deferred(),h=fixture(t,{decode:()=>decoding.promise});
 h.audio.preferences(false,true);await h.audio.unlock();await flush();assert.equal(h.decoded,1);
 h.audio.dispose();decoding.resolve({decoded:true});await flush();
 assert.equal(h.started.length,0);assert.equal(h.closed,1);assert.deepEqual(h.errors,[]);
});

test('invalid audio paths and oversized clips are isolated from valid effects',async t=>{
 const h=fixture(t,{selected:[{label:'Bad.mp3',path:'https://elsewhere.invalid/a.mp3'},
  {label:'Huge.mp3',path:path('f')},{label:'Button.mp3',path:path('a')}],
  fetcher:async url=>response(url.pathname.endsWith(path('f'))?4000001:3)});
 h.audio.preferences(true,false);await h.audio.unlock();await flush();
 assert.equal(h.requests.length,2);assert.equal(h.decoded,1);
 assert.deepEqual(h.errors.sort(),['MH40_AUDIO_PATH','MH40_AUDIO_SIZE']);
 h.audio.cue('Button.mp3');assert.equal(h.started.length,1);
});

test('a bounded timeout reports once and a later gesture can retry',async t=>{
 let stalled=true;
 const h=fixture(t,{selected:[{label:'Button.mp3',path:path('a')}],timeout:15,
  fetcher:(_url,{signal})=>stalled?new Promise((_resolve,reject)=>{
   signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})),{once:true});
  }):Promise.resolve(response())});
 h.audio.preferences(true,false);await h.audio.unlock();
 await new Promise(resolve=>setTimeout(resolve,30));await flush();
 assert.deepEqual(h.errors,['MH40_AUDIO_TIMEOUT']);assert.equal(h.requests.length,1);
 stalled=false;await h.audio.unlock();await flush();h.audio.cue('Button.mp3');
 assert.equal(h.requests.length,2);assert.equal(h.started.length,1);
});

test('failed music is not automatically fetched again when other effects finish',async t=>{
 const h=fixture(t,{fetcher:async url=>url.pathname.endsWith(path('b'))?{ok:false}:response()});
 h.audio.preferences(true,true);await h.audio.unlock();await flush();
 assert.equal(h.requests.length,5);assert.deepEqual(h.errors,['MH40_AUDIO_UNAVAILABLE']);
 h.audio.cue('Button.mp3');assert.equal(h.started.length,1);
 await h.audio.unlock();await flush();assert.equal(h.requests.length,6);
});
