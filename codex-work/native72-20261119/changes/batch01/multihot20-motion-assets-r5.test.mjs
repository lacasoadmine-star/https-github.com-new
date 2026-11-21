import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MultiHot20Scene,SCENE_LAYOUT} from './multihot20/scene.mjs';
import {loadVerifiedAssets,createSoundEngine} from './multihot20/assets.mjs';

class Target extends EventTarget {
 constructor(){super();this.listeners=new Map();this.hidden=false;this.focused=true;this.devicePixelRatio=3;}
 hasFocus(){return this.focused}
 addEventListener(type,fn,opt){super.addEventListener(type,fn,opt);this.listeners.set(type,(this.listeners.get(type)||0)+1)}
 removeEventListener(type,fn,opt){super.removeEventListener(type,fn,opt);this.listeners.set(type,(this.listeners.get(type)||0)-1)}
}
function harness(extraAssets={}){
 let now=1000,next=0,draws=[],clips=[];
 const frames=new Map(),sounds=[],doc=new Target(),win=new Target();
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),measureText:s=>({width:s.length*22}),
  clearRect(){draws=[];clips=[]},drawImage:(sprite,x,y,w,h)=>draws.push({symbol:sprite.symbol,x,y,w,h}),rect:(...r)=>clips.push(r)},
 {get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>(target[key]=value,true)});
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:360,height:360})};
 const symbols=['seven','bell','grape','watermelon','lemon','plum','orange','cherry'];
 const scene=new MultiHot20Scene({canvas,symbols,assets:{...Object.fromEntries(symbols.map(symbol=>[symbol,{symbol,width:100,height:100}])),...extraAssets},doc,win,
  audio:{play:name=>sounds.push({name,at:now}),stop:name=>sounds.push({name:'stop:'+name,at:now}),pauseAll:()=>sounds.push({name:'pause',at:now})},
  clock:()=>now,requestFrame:fn=>{frames.set(++next,fn);return next},cancelFrame:id=>frames.delete(id)});
 const receipt={gameId:'fresh_multihot20',roundId:'server-round-01',wheelMultiplier:3,finalWin:'2.40',
  grid:[['seven','bell','grape','watermelon','lemon'],['plum','orange','cherry','seven','bell'],['grape','watermelon','lemon','plum','orange']],
  winLines:[{positions:[[0,0],[0,1],[0,2]]}]};
 return {scene,canvas,doc,win,receipt,sounds,frames,get draws(){return draws},get clips(){return clips},
  tick(time){now=time;const callbacks=[...frames.values()];frames.clear();for(const cb of callbacks)cb(now)},time:()=>now};
}

test('MH20 keeps the verified wheel texture aspect ratio above the reel grid',()=>{
 const h=harness({__wheel:{symbol:'wheel',width:842,height:251}});
 const draw=h.draws.find(d=>d.symbol==='wheel');
 assert.ok(draw);assert.ok(Math.abs(draw.w/draw.h-842/251)<1e-9);
 assert.equal(draw.x+draw.w/2,SCENE_LAYOUT.width/2);
 assert.ok(draw.y+draw.h<=SCENE_LAYOUT.y+1);
 h.scene.dispose();
});
function visibleGrid(h){
 const L=SCENE_LAYOUT,grid=Array.from({length:L.rows},()=>Array(L.reels));
 for(const d of h.draws){
  if(d.y<L.y||d.y>=L.y+L.rows*L.tileHeight)continue;
  const row=Math.floor((d.y-L.y)/L.tileHeight),col=Math.floor((d.x-L.x)/L.reelWidth);
  if(col>=0&&col<L.reels)grid[row][col]=d.symbol;
 }
 return grid;
}

test('MH20 moves actual sprites continuously within five reel clips and paints no idle animation',()=>{
 const h=harness(),before=structuredClone(h.draws);
 assert.equal(h.frames.size,0);h.tick(1500);h.scene.resize();assert.deepEqual(h.draws,before);
 assert.equal(h.canvas.width,720,'DPR is capped at two');
 h.scene.start();h.tick(1510);const a=h.draws.filter(d=>d.x===SCENE_LAYOUT.x+4);h.tick(1520);
 const b=h.draws.filter(d=>d.x===SCENE_LAYOUT.x+4);
 assert.equal(a.length,b.length);assert.ok(b[0].y>a[0].y&&b[0].y-a[0].y<SCENE_LAYOUT.tileHeight);
 assert.ok(b.some(d=>d.y%1!==0),'fractional Y travel replaces fixed-cell swaps');
 assert.deepEqual(h.clips,Array.from({length:5},(_,c)=>[45+c*102,252,102,306]));
 h.scene.reset();assert.equal(h.frames.size,0);h.scene.dispose();
});

test('MH20 settles sequentially to the exact receipt without RNG; receipt insertion has no visible pop',async()=>{
 const h=harness(),original=structuredClone(h.receipt),random=Math.random;
 Math.random=()=>{throw Error('client RNG is forbidden')};
 try{
  h.scene.start();h.tick(1200);const before=structuredClone(h.draws);
  const result=h.scene.settle(h.receipt);h.scene.resize();assert.deepEqual(h.draws,before,'target tiles enter from above, not by replacing visible cells');
  for(let t=1216;t<=2400;t+=16)h.tick(t);
  assert.equal(await result,true);assert.deepEqual(visibleGrid(h),original.grid);assert.deepEqual(h.receipt,original);
  assert.equal(h.scene.receipt.finalWin,'2.40');assert.equal(h.scene.receipt.wheelMultiplier,3);
  const stops=h.sounds.filter(e=>e.name==='reel-stop');assert.equal(stops.length,5);
  assert.ok(stops.every((s,i)=>i===0||s.at>stops[i-1].at));assert.equal(h.sounds.filter(s=>s.name==='win').length,1);
  assert.equal(h.frames.size,0);const final=structuredClone(h.draws);h.tick(9000);h.scene.resize();assert.deepEqual(h.draws,final);
 }finally{Math.random=random;h.scene.dispose()}
});

test('STOP shortens remaining motion without changing inserted target tiles or accepting a replacement receipt',async()=>{
 const normal=harness(),fast=harness();normal.scene.start();fast.scene.start();normal.tick(1250);fast.tick(1250);
 const a=normal.scene.settle(normal.receipt),b=fast.scene.settle(fast.receipt);
 fast.tick(1400);const before=structuredClone(fast.draws);fast.scene.speedUp();fast.scene.resize();assert.deepEqual(fast.draws,before);
 await assert.rejects(fast.scene.settle({...fast.receipt,roundId:'wrong-round'}),/RECEIPT_ALREADY_PENDING/);
 fast.receipt.grid[0][0]='cherry'; // caller mutation must not alter the accepted strip
 for(let t=1416;t<=1800;t+=16){normal.tick(t);fast.tick(t)}
 assert.equal(fast.scene.rolling,false);assert.equal(normal.scene.rolling,true);
 assert.equal(await b,true);assert.equal(fast.scene.current[0][0],'seven');assert.equal(fast.scene.receipt.roundId,'server-round-01');
 for(let t=1816;t<=2500;t+=16)normal.tick(t);assert.equal(await a,true);
 assert.deepEqual(fast.scene.current,normal.scene.current);normal.scene.dispose();fast.scene.dispose();
});

test('hidden network wait suspends RAF; late receipt settles silently; teardown removes every listener',async()=>{
 const h=harness();h.scene.start();h.tick(1200);h.win.dispatchEvent(new Event('blur'));
 assert.equal(h.frames.size,0);assert.equal(h.scene.rolling,true);
 const count=h.sounds.length;assert.equal(await h.scene.settle(h.receipt),true);
 assert.ok(h.sounds.slice(count).every(e=>e.name.startsWith('stop:')));assert.deepEqual(h.scene.current,h.receipt.grid);
 h.doc.dispatchEvent(new Event('visibilitychange'));assert.throws(()=>h.scene.start(),/GAME_NOT_VISIBLE/);
 h.win.dispatchEvent(new Event('focus'));h.scene.start();const pending=h.scene.settle({...h.receipt,roundId:'reset-round'});
 h.scene.reset();assert.equal(await pending,false);assert.equal(h.frames.size,0);
 h.win.dispatchEvent(new Event('pagehide'));assert.throws(()=>h.scene.start(),/GAME_NOT_VISIBLE/);
 h.win.dispatchEvent(new Event('pageshow'));h.scene.dispose();h.scene.dispose();
 assert.ok([...h.win.listeners.values(),...h.doc.listeners.values()].every(n=>n===0));
});

test('refresh restore paints an accepted settled receipt silently without replaying a spin',()=>{
 const h=harness(),original=structuredClone(h.receipt);
 assert.equal(h.scene.restore(h.receipt),true);assert.deepEqual(visibleGrid(h),original.grid);
 assert.equal(h.scene.inspect().receiptId,original.roundId);assert.equal(h.scene.rolling,false);
 assert.equal(h.frames.size,0);assert.deepEqual(h.sounds,[]);
 h.receipt.grid[0][0]='cherry';h.scene.resize();assert.deepEqual(visibleGrid(h),original.grid);
 assert.throws(()=>h.scene.restore({...original,gameId:'another-game'}),/SERVER_GRID_REQUIRED/);
 assert.deepEqual(h.scene.current,original.grid);h.scene.start();
 assert.throws(()=>h.scene.restore(original),/REELS_NOT_READY/);h.scene.dispose();
});

function fixture(){
 const names=['seven.png','bell.png','grape.png','watermelon.png','other-fruits.png','background.png','wheel.png',
 'auto-button.png','balance-frame.png','bet-frame.png','menu-icon.png','sound-icon.png','spin-button.png','turbo-icon.png',
 'spin.mp3','reel-stop.mp3','win.mp3','button.mp3','music.mp3'];
 const bodies=new Map(names.map(name=>[name,Buffer.from('verified-'+name)]));
 const manifest={schema:'zplay/verified-official-capture-assets/v1',gameId:'fresh_multihot20',baseUrl:'./assets/',
  symbols:['seven','bell','grape','watermelon','lemon','plum','orange','cherry'],otherFruitsOrder:['lemon','plum','orange','cherry'],
  files:Object.fromEntries([...bodies].map(([name,body])=>[name,{sha256:createHash('sha256').update(body).digest('hex'),bytes:body.length,contentType:name.endsWith('.png')?'image/png':'audio/mpeg'}]))};
 const decoded=[],requests=[];
 const imageDecoder=async()=>{const b={width:400,height:100,closed:0,close(){this.closed++}};decoded.push(b);return b};
 const doc={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}})})};
 const fetcher=async url=>{const name=new URL(url).pathname.split('/').pop();requests.push(name);return name==='assets.json'?Response.json(manifest):new Response(bodies.get(name))};
 return{manifest,bodies,decoded,requests,options:{manifestURL:'https://player.invalid/new74/multi-hot-20/assets.json',fetcher,imageDecoder,doc,timeoutMs:1000}};
}

test('verified UI URLs and audio remain same-origin; dispose closes bitmaps and blocks new reads',async()=>{
 const f=fixture(),resources=await loadVerifiedAssets(f.options);
 for(const name of ['spin-button.png','auto-button.png','bet-frame.png','sound-icon.png'])assert.equal(resources.urls.get(name),'https://player.invalid/new74/multi-hot-20/assets/'+name);
 assert.equal(resources.images.lemon.width,180);
 const audio=await resources.primeAudio();assert.ok(audio.spin.endsWith('/spin.mp3'));assert.ok(audio.music.endsWith('/music.mp3'));
 const readCount=f.requests.length;await resources.primeAudio();assert.equal(f.requests.length,readCount,'verified bytes are deduplicated');
 resources.dispose();resources.dispose();assert.equal(resources.urls.size,0);assert.ok(f.decoded.every(b=>b.closed===1));
 await assert.rejects(resources.primeAudio(),/ASSETS_DISPOSED/);
});

test('unequal fruit-strip regions keep their source aspect ratio in square tiles',async()=>{
 const f=fixture(),draws=[];
 f.options.doc={createElement:()=>({width:0,height:0,getContext:()=>({drawImage:(...args)=>draws.push(args)})})};
 const resources=await loadVerifiedAssets(f.options);assert.equal(draws.length,4);
 for(const [,sx,sy,sw,sh,dx,dy,dw,dh]of draws){
  assert.ok(sw>0&&sh>0);assert.ok(Math.abs(sw/sh-dw/dh)<1e-10);
  assert.ok(dx>=0&&dy>=0&&dx+dw<=180&&dy+dh<=180);
  assert.ok(Math.abs(dx+dw/2-90)<1e-10&&Math.abs(dy+dh/2-90)<1e-10);
 }
 resources.dispose();
});

test('asset manifest timeout and caller abort reject even when a transport ignores AbortSignal',async()=>{
 let requestSignal;
 await assert.rejects(loadVerifiedAssets({manifestURL:'https://player.invalid/assets.json',timeoutMs:8,
  fetcher:(_url,options)=>{requestSignal=options.signal;return new Promise(()=>{})},imageDecoder:async()=>({})}),/ASSET_LOAD_TIMEOUT_MANIFEST/);
 assert.equal(requestSignal.aborted,true);
 const caller=new AbortController();
 const pending=loadVerifiedAssets({manifestURL:'https://player.invalid/assets.json',timeoutMs:1000,signal:caller.signal,
  fetcher:()=>new Promise(()=>{}),imageDecoder:async()=>({})});
 caller.abort(Error('cancelled-by-player-navigation'));await assert.rejects(pending,/cancelled-by-player-navigation/);
});

test('tampered sprite fails closed and releases already decoded images',async()=>{
 const f=fixture();f.bodies.set('bell.png',Buffer.from('corrupt'));
 await assert.rejects(loadVerifiedAssets(f.options),/ASSET_INTEGRITY_ERROR_bell.png/);
 await new Promise(resolve=>setImmediate(resolve));assert.ok(f.decoded.every(b=>b.closed===1));
});

test('a listed sound with a failed digest cannot silently prime an incomplete sound set',async()=>{
 const f=fixture(),resources=await loadVerifiedAssets(f.options);
 f.bodies.set('win.mp3',Buffer.from('corrupt'));
 await assert.rejects(resources.primeAudio(),/ASSET_INTEGRITY_ERROR_win.mp3/);
 assert.equal(resources.urls.has('win.mp3'),false);resources.dispose();
});

class FakeAudio {
 static all=[];
 constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.playCount=0;FakeAudio.all.push(this)}
 play(){this.playCount++;this.paused=false;return Promise.resolve()}
 pause(){this.paused=true}
}
const flush=async()=>{await Promise.resolve();await Promise.resolve()};

test('one-shot sound effects release handlers; focus/page restore only opted-in music once',async()=>{
 FakeAudio.all=[];const doc=new Target(),win=new Target(),sound=createSoundEngine({doc,win,audioConstructor:FakeAudio,clipUrls:{music:'/music',spin:'/spin','reel-stop':'/stop',win:'/win'}});
 sound.set(true,true);await flush();const music=FakeAudio.all[0];assert.equal(music.loop,true);
 sound.play('spin');const oldSpin=FakeAudio.all.at(-1);sound.play('spin');assert.equal(oldSpin.paused,true);assert.equal(oldSpin.onended,null);
 const spin=FakeAudio.all.at(-1);assert.equal(spin.loop,false);sound.stop('spin');assert.equal(spin.paused,true);
 sound.play('reel-stop');const stop=FakeAudio.all.at(-1);stop.onended();assert.equal(stop.onended,null);assert.equal(stop.onerror,null);
 win.dispatchEvent(new Event('focus'));win.dispatchEvent(new Event('focus'));await flush();assert.equal(music.playCount,1);
 sound.play('win');win.dispatchEvent(new Event('blur'));assert.ok(FakeAudio.all.every(a=>a.paused));
 doc.dispatchEvent(new Event('visibilitychange'));assert.equal(sound.play('spin'),false);
 win.dispatchEvent(new Event('focus'));await flush();assert.equal(music.paused,false);assert.ok(FakeAudio.all.slice(1).every(a=>a.paused));
 win.dispatchEvent(new Event('pagehide'));assert.equal(music.paused,true);win.dispatchEvent(new Event('pageshow'));await flush();assert.equal(music.paused,false);
 sound.destroy();sound.destroy();assert.ok(FakeAudio.all.every(a=>a.paused));assert.equal(sound.play('spin'),false);
 assert.ok([...doc.listeners.values(),...win.listeners.values()].every(n=>n===0));
});

test('late Audio.play resolution after blur cannot restart stale effects or music',async()=>{
 const waiting=[],all=[];
 class DelayedAudio {
  constructor(src){this.src=src;this.paused=true;all.push(this)}
  play(){return new Promise(resolve=>waiting.push(()=>{this.paused=false;resolve()}))}
  pause(){this.paused=true}
 }
 const doc=new Target(),win=new Target(),sound=createSoundEngine({doc,win,audioConstructor:DelayedAudio,clipUrls:{music:'/music',spin:'/spin'}});
 sound.set(true,true);sound.play('spin');win.dispatchEvent(new Event('blur'));
 for(const resolve of waiting)resolve();await flush();assert.ok(all.every(a=>a.paused));sound.destroy();
});
