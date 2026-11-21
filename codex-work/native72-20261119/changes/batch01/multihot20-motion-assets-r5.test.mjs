import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {MultiHot20Scene,SCENE_LAYOUT,MULTIHOT20_WHEEL_SECTORS,MULTIHOT20_WIN_PRESENTATION,MULTIHOT20_LINE_PRESENTATION,MULTIHOT20_PAYLINE_ROWS} from './multihot20/scene.mjs';
import {loadVerifiedAssets,createSoundEngine} from './multihot20/assets.mjs';
import {evaluateCapturedMath,OFFICIAL_LINE_PATHS} from './server/official-math.mjs';

class Target extends EventTarget {
 constructor(){super();this.listeners=new Map();this.hidden=false;this.focused=true;this.devicePixelRatio=3;}
 hasFocus(){return this.focused}
 addEventListener(type,fn,opt){super.addEventListener(type,fn,opt);this.listeners.set(type,(this.listeners.get(type)||0)+1)}
 removeEventListener(type,fn,opt){super.removeEventListener(type,fn,opt);this.listeners.set(type,(this.listeners.get(type)||0)-1)}
}
function harness(extraAssets={},options={}){
 let now=1000,next=0,draws=[],clips=[],texts=[],fills=[],strokes=[],path=[],strokePaths=[],filledPaths=[],clipPaths=[],activeClips=[],transform={angle:0,x:0,y:0};
 const stack=[];
 const frames=new Map(),sounds=[],lineViews=[],doc=options.doc??new Target(),win=options.win??new Target();
 const ctx=new Proxy({globalAlpha:1,globalCompositeOperation:'source-over',createLinearGradient:(...coords)=>({coords,stops:[],addColorStop(at,colour){this.stops.push([at,colour])}}),measureText:s=>({width:s.length*22}),
  clearRect(){draws=[];clips=[];texts=[];fills=[];strokes=[];strokePaths=[];filledPaths=[];clipPaths=[]},
  setTransform(){transform={angle:0,x:0,y:0}},
  save(){stack.push({transform:{...transform},alpha:ctx.globalAlpha,blend:ctx.globalCompositeOperation,
   clips:structuredClone(activeClips),fill:ctx.fillStyle,stroke:ctx.strokeStyle,width:ctx.lineWidth,shadow:ctx.shadowBlur})},
  restore(){const state=stack.pop();transform=state.transform;ctx.globalAlpha=state.alpha;ctx.globalCompositeOperation=state.blend;
   activeClips=state.clips;ctx.fillStyle=state.fill;ctx.strokeStyle=state.stroke;ctx.lineWidth=state.width;ctx.shadowBlur=state.shadow},
  translate(x,y){transform.x+=x;transform.y+=y},rotate(angle){transform.angle+=angle},
  drawImage(sprite,...args){
   const [x,y,w,h]=args.length===8?args.slice(4):args;
   draws.push({symbol:sprite.symbol,x,y,w,h,source:args.length===8?args.slice(0,4):null,alpha:ctx.globalAlpha,blend:ctx.globalCompositeOperation,...transform});
   // Destination position stays separate from the transformed pivot.
   Object.assign(draws.at(-1),{x,y,pivot:[transform.x,transform.y]});
  },
  beginPath(){path=[]},moveTo:(...args)=>path.push(['M',...args]),lineTo:(...args)=>path.push(['L',...args]),
  bezierCurveTo:(...args)=>path.push(['C',...args]),closePath:()=>path.push(['Z']),
  clip:()=>{clipPaths.push(structuredClone(path));activeClips.push(structuredClone(path))},
  stroke:()=>strokePaths.push({path:structuredClone(path),colour:ctx.strokeStyle,alpha:ctx.globalAlpha,width:ctx.lineWidth}),
  fill:()=>filledPaths.push({path:structuredClone(path),colour:typeof ctx.fillStyle==='string'?ctx.fillStyle:'gradient',
   gradientStops:ctx.fillStyle?.stops?structuredClone(ctx.fillStyle.stops):null,clips:structuredClone(activeClips),alpha:ctx.globalAlpha,blend:ctx.globalCompositeOperation}),
  rect:(...r)=>{clips.push(r);path.push(['R',...r])},fillText:(...args)=>texts.push(args),fillRect:(...r)=>fills.push(r),strokeRect:(...r)=>strokes.push(r)},
 {get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>(target[key]=value,true)});
 const attributes=new Map();
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:360,height:360}),
  setAttribute:(name,value)=>attributes.set(name,value),removeAttribute:name=>attributes.delete(name),getAttribute:name=>attributes.get(name)??null};
 const symbols=['seven','bell','grape','watermelon','lemon','plum','orange','cherry'];
 const presentation={
  __wheelNumbers:{symbol:'wheel-numbers',width:1093,height:1946},
  __wheelFrame:{symbol:'wheel-frame',width:2047,height:2047},
  __wheelLight:{symbol:'wheel-light',width:2047,height:2047},
  __title:{symbol:'title',width:633,height:152},__boxFrame:{symbol:'box-frame',width:1119,height:696},
  __background:{symbol:'background',width:100,height:100},
  ...Object.fromEntries(Object.entries({__winNice:[264,105],__winText:[236,100],__winCrownSmall:[60,48],
   __winMoneyFrame:[430,155],__winCoin:[105,97],__winFrame:[399,379],__winBacklight:[855,834],
   __winShine:[391,397],__winBig:[198,100],__winSuper:[344,109],__winFantastic:[537,115]})
   .map(([name,[width,height]])=>[name,{symbol:name,width,height}]))
 };
 const scene=new MultiHot20Scene({canvas,backdropCanvas:options.backdropCanvas??null,symbols,assets:{...Object.fromEntries(symbols.map(symbol=>[symbol,{symbol,width:100,height:100}])),...presentation,...extraAssets},doc,win,
  onLinePresentation:view=>{lineViews.push({at:now,view});options.onLinePresentation?.(view)},
  showInternalTitle:options.showInternalTitle,visibleSceneTop:options.visibleSceneTop,
  audio:{play:name=>sounds.push({name,at:now}),stop:name=>sounds.push({name:'stop:'+name,at:now}),pauseAll:()=>sounds.push({name:'pause',at:now})},
  clock:()=>now,requestFrame:fn=>{frames.set(++next,fn);return next},cancelFrame:id=>frames.delete(id)});
 const receipt={gameId:'fresh_multihot20',roundId:'server-round-01',wheelMultiplier:3,bet:'2.00',finalWin:'2.40',
  grid:[['seven','bell','grape','watermelon','lemon'],['plum','orange','cherry','seven','bell'],['grape','watermelon','lemon','plum','orange']],
  winLines:[{positions:[[0,0],[0,1],[0,2]]}]};
 return {scene,canvas,doc,win,receipt,sounds,frames,lineViews,get draws(){return draws},get clips(){return clips},get texts(){return texts},get fills(){return fills},get strokes(){return strokes},
  get strokePaths(){return strokePaths},get filledPaths(){return filledPaths},get clipPaths(){return clipPaths},
  tick(time){now=time;const callbacks=[...frames.values()];frames.clear();for(const cb of callbacks)cb(now)},time:()=>now};
}

function backdropFixture(width=390,height=844){
 const rect={width,height},draws=[],fills=[],transforms=[],clears=[];
 const ctx={createLinearGradient:()=>({addColorStop(){}}),
  fillRect:(...args)=>fills.push(args),setTransform:(...args)=>transforms.push(args),
  clearRect:(...args)=>clears.push(args),drawImage:(image,...args)=>draws.push({image,args})};
 const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({...rect}),width:0,height:0};
 return{canvas,rect,draws,fills,transforms,clears};
}

test('MH20 covers the whole viewport with the verified background and leaves the reel canvas transparent',()=>{
 const b=backdropFixture(),background={symbol:'background',width:1920,height:1080};
 const h=harness({__background:background},{backdropCanvas:b.canvas});
 assert.equal(b.canvas.width,780);assert.equal(b.canvas.height,1688,'backdrop DPR is capped at two');
 assert.deepEqual(b.transforms,[[2,0,0,2,0,0]]);assert.deepEqual(b.clears,[[0,0,390,844]]);
 assert.deepEqual(b.fills,[[0,0,390,844]]);assert.equal(b.draws.length,1);assert.equal(b.draws[0].image,background);
 const scale=844/1080;assert.deepEqual(b.draws[0].args,[(390-1920*scale)/2,0,1920*scale,844]);
 assert.deepEqual(h.fills,[],'the foreground has no opaque full-stage fill');
 assert.equal(h.draws.some(draw=>draw.symbol==='background'),false,'the backdrop is not repeated inside the square stage');
 for(const symbol of ['title','wheel-numbers','wheel-light','wheel-frame','box-frame','seven'])
  assert.ok(h.draws.some(draw=>draw.symbol===symbol),'original foreground art remains visible: '+symbol);
 assert.equal(h.frames.size,0);h.scene.dispose();
});

test('MH20 never repaints the static backdrop for motion, settlement, restore, focus, or unchanged resize',async()=>{
 const b=backdropFixture(),h=harness({}, {backdropCanvas:b.canvas}),original=structuredClone(h.receipt);
 h.scene.start();h.tick(1200);const settled=h.scene.settle(h.receipt);
 for(let time=1216;time<=2400;time+=16)h.tick(time);
 assert.equal(await settled,true);assert.deepEqual(visibleGrid(h),original.grid);assert.equal(h.frames.size,0);
 h.scene.restore(original);h.win.dispatchEvent(new Event('blur'));h.win.dispatchEvent(new Event('focus'));
 h.tick(9000);h.scene.resize();h.scene.resize();
 assert.equal(b.clears.length,1);assert.equal(b.draws.length,1);assert.equal(b.transforms.length,1);
 assert.equal(h.frames.size,0,'the backdrop creates no idle animation loop');
 assert.deepEqual(h.fills,[]);assert.equal(h.draws.some(draw=>draw.symbol==='background'),false);h.scene.dispose();
});

test('MH20 repaints the backdrop only after viewport, physical resolution, or verified bitmap changes',()=>{
 const b=backdropFixture(),background={symbol:'background',width:1920,height:1080};
 const h=harness({__background:background},{backdropCanvas:b.canvas});
 Object.assign(b.rect,{width:844,height:390});h.scene.resize();
 assert.equal(b.draws.length,2);assert.equal(b.canvas.width,1688);assert.equal(b.canvas.height,780);
 const scale=844/1920;
 assert.deepEqual(b.draws.at(-1).args,[0,(390-1080*scale)/2,844,1080*scale]);
 assert.deepEqual(b.clears.at(-1),[0,0,844,390]);
 h.win.devicePixelRatio=1.25;h.scene.resize();
 assert.equal(b.canvas.width,1055);assert.equal(b.canvas.height,488);assert.equal(b.draws.length,3);
 assert.deepEqual(b.transforms.at(-1),[1055/844,0,0,488/390,0,0]);
 h.scene.resize();assert.equal(b.draws.length,3);
 const replacement={symbol:'background',width:1920,height:1080};h.scene.assets.__background=replacement;h.scene.resize();
 assert.equal(b.draws.length,4);assert.equal(b.draws.at(-1).image,replacement);assert.equal(h.frames.size,0);h.scene.dispose();
});

test('MH20 releases the backdrop buffer and listeners on disposal without repainting or resolving a wager',async()=>{
 const b=backdropFixture(),h=harness({}, {backdropCanvas:b.canvas});
 h.scene.start();h.tick(1200);const settled=h.scene.settle(h.receipt);h.scene.dispose();
 assert.equal(await settled,false);assert.equal(b.canvas.width,1);assert.equal(b.canvas.height,1);
 assert.equal(h.scene.backdropCanvas,null);assert.equal(h.scene.backdropCtx,null);assert.equal(h.scene.backdropState,null);
 assert.equal(h.frames.size,0);assert.ok([...h.win.listeners.values(),...h.doc.listeners.values()].every(n=>n===0));
 h.scene.dispose();h.scene.resize();h.win.dispatchEvent(new Event('focus'));h.tick(5000);
 assert.equal(b.draws.length,1);assert.equal(b.clears.length,1);assert.equal(h.scene.receipt,null);
});

test('MH20 rejects an invalid or shared backdrop before registering lifecycle listeners',()=>{
 const doc=new Target(),win=new Target(),canvas={getContext:()=>({})};
 const options={canvas,symbols:['one','two'],strictAssets:false,doc,win};
 for(const backdropCanvas of [canvas,{}])
  assert.throws(()=>new MultiHot20Scene({...options,backdropCanvas}),/SEPARATE_BACKDROP_CANVAS_REQUIRED/);
 assert.throws(()=>new MultiHot20Scene({...options,backdropCanvas:{getContext:()=>null}}),/BACKDROP_CONTEXT_UNAVAILABLE/);
 assert.equal(doc.listeners.size,0);assert.equal(win.listeners.size,0);
});

test('MH20 paints original wheel atlas, title and reel frame in proportion without a generated overlay',()=>{
 const h=harness(),frame=h.draws.find(d=>d.symbol==='wheel-frame');
 assert.deepEqual(frame.source,[1,1715,978,267]);assert.ok(Math.abs(frame.w/frame.h-978/267)<1e-9);
 assert.equal(frame.x+frame.w/2,SCENE_LAYOUT.width/2);assert.ok(frame.y+frame.h<=SCENE_LAYOUT.y+1);
 const numbers=h.draws.find(d=>d.symbol==='wheel-numbers'),light=h.draws.find(d=>d.symbol==='wheel-light');
 assert.deepEqual(numbers.source,[1,1,1077,1095]);assert.deepEqual(light.source,numbers.source);
 assert.equal(numbers.angle,0);assert.equal(light.angle,numbers.angle);assert.deepEqual(numbers.pivot,light.pivot);
 assert.ok(Math.abs(numbers.w/numbers.h-1077/1095)<1e-9);
 const title=h.draws.find(d=>d.symbol==='title'),box=h.draws.find(d=>d.symbol==='box-frame');
 assert.ok(Math.abs(title.w/title.h-633/152)<1e-9);assert.ok(title.y+title.h<frame.y);
 assert.ok(Math.abs(box.w/box.h-1119/696)<1e-9);assert.ok(h.draws.indexOf(box)<h.draws.findIndex(d=>d.symbol==='seven'));
 assert.deepEqual(h.fills,[[0,0,600,600]],'the original box is not covered by synthetic reel fills');
 assert.deepEqual(h.texts,[],'strict artwork never paints a counterfeit title or central multiplier');
 assert.deepEqual(h.strokes,[],'idle original box has no duplicate generated border');
 h.scene.dispose();
});

test('MH20 requires original presentation sprites and rejects atlas crop coordinates outside decoded images',()=>{
 for(const name of ['__wheelNumbers','__wheelFrame','__wheelLight','__title','__boxFrame','__background','__winNice','__winText',
  '__winCrownSmall','__winMoneyFrame','__winCoin','__winFrame','__winBacklight','__winShine','__winBig','__winSuper','__winFantastic'])
  assert.throws(()=>harness({[name]:null}),new RegExp('OFFICIAL_PRESENTATION_ART_REQUIRED_'+name));
 for(const name of ['__wheelNumbers','__wheelFrame','__wheelLight'])
  assert.throws(()=>harness({[name]:{width:100,height:100}}),new RegExp('OFFICIAL_ATLAS_BOUNDS_INVALID_'+name));
});

// Independent transcription of the original Numbers atlas, clockwise from
// its top numeral. It is visual artwork and never an outcome probability.
const observedSectors=[2,4,2,5,1,3,5,2,5,2,4,1,3,5],sectorAngle=2*Math.PI/14;
// Fresh ready/result/held-spin and three subsequent click observations.
const observedNeighbours={1:[4,1,3],2:[5,2,4],3:[1,3,5],4:[2,4,1],5:[3,5,2]};
function paintedNeighbours(h){
 const ring=h.draws.find(d=>d.symbol==='wheel-numbers'),index=((Math.round(-ring.angle/sectorAngle)%14)+14)%14;
 return [-1,0,1].map(offset=>observedSectors[(index+offset+14)%14]);
}
function ringDraw(h){return h.draws.find(d=>d.symbol==='wheel-numbers')}

test('MH20 rotates the complete original numeral ring and selector highlight together while the frame stays fixed',()=>{
 const h=harness(),frame=structuredClone(h.draws.find(d=>d.symbol==='wheel-frame'));
 assert.deepEqual(MULTIHOT20_WHEEL_SECTORS,observedSectors);assert.deepEqual(paintedNeighbours(h),[5,2,4]);
 h.scene.start();h.tick(1090);const first=ringDraw(h);h.tick(1107.5);const second=ringDraw(h);
 assert.ok(second.angle>first.angle);assert.ok(second.angle-first.angle<sectorAngle,'motion is fractional rather than a whole-sector swap');
 assert.deepEqual(h.draws.find(d=>d.symbol==='wheel-frame'),frame);
 const light=h.draws.find(d=>d.symbol==='wheel-light');assert.equal(light.angle,second.angle);assert.deepEqual(light.pivot,second.pivot);
 assert.deepEqual(h.texts,[]);assert.equal(h.scene.receipt,null);assert.equal(h.scene.pending,null);
 h.scene.dispose();
});

function visibleGrid(h){
 const L=SCENE_LAYOUT,grid=Array.from({length:L.rows},()=>Array(L.reels));
 for(const d of h.draws){
  if(!h.scene.symbols.includes(d.symbol))continue;
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
 assert.deepEqual(h.clips.filter(r=>r[1]===252&&r[3]===306),Array.from({length:5},(_,c)=>[45+c*102,252,102,306]));
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

test('MH20 reproduces all five fresh observed ring-neighbour arrangements at the server-selected multiplier',async()=>{
 const random=Math.random;Math.random=()=>{throw Error('client RNG is forbidden')};
 try{
  for(const multiplier of [5,1,2,3,4]){
   const h=harness(),receipt={...structuredClone(h.receipt),wheelMultiplier:multiplier},before=structuredClone(receipt);
   assert.deepEqual(paintedNeighbours(h),[5,2,4]);
   h.scene.start();h.tick(1200);const settled=h.scene.settle(receipt),angles=[];
   for(let t=1216;t<=2400;t+=16){h.tick(t);if(h.scene.rolling)angles.push(ringDraw(h).angle)}
   assert.equal(await settled,true);assert.ok(angles.every((a,i)=>i===0||a>=angles[i-1]),'the moving ring does not reverse or teleport');
   assert.deepEqual(paintedNeighbours(h),observedNeighbours[multiplier]);assert.deepEqual(h.scene.current,receipt.grid);assert.deepEqual(receipt,before);
   assert.equal(h.scene.receipt.finalWin,before.finalWin);assert.equal(h.frames.size,0);
   if(multiplier===5){assert.deepEqual(paintedNeighbours(h),[3,5,2]);assert.ok(Math.abs(ringDraw(h).angle-sectorAngle)<1e-9)}
   const ring=structuredClone(ringDraw(h));h.tick(9000);h.scene.resize();assert.deepEqual(ringDraw(h),ring,'settled wheel is static');
   h.scene.dispose();
  }
 }finally{Math.random=random}
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
 assert.deepEqual(fast.scene.current,normal.scene.current);assert.deepEqual(ringDraw(fast),ringDraw(normal));
 assert.equal(paintedNeighbours(fast)[1],3);normal.scene.dispose();fast.scene.dispose();
});

test('hidden network wait suspends RAF; late receipt settles silently; teardown removes every listener',async()=>{
 const h=harness();h.scene.start();h.tick(1200);h.win.dispatchEvent(new Event('blur'));
 assert.equal(h.frames.size,0);assert.equal(h.scene.rolling,true);
 const count=h.sounds.length;assert.equal(await h.scene.settle(h.receipt),true);
 assert.ok(h.sounds.slice(count).every(e=>e.name.startsWith('stop:')));assert.deepEqual(h.scene.current,h.receipt.grid);
 assert.deepEqual(paintedNeighbours(h),[1,3,5]);assert.equal(h.frames.size,0);
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
 assert.deepEqual(paintedNeighbours(h),[1,3,5]);
 assert.equal(h.scene.inspect().receiptId,original.roundId);assert.equal(h.scene.rolling,false);
 assert.equal(h.frames.size,0);assert.deepEqual(h.sounds,[]);
 h.receipt.grid[0][0]='cherry';h.scene.resize();assert.deepEqual(visibleGrid(h),original.grid);
 assert.throws(()=>h.scene.restore({...original,gameId:'another-game'}),/SERVER_GRID_REQUIRED/);
 assert.deepEqual(h.scene.current,original.grid);h.scene.start();
 assert.throws(()=>h.scene.restore(original),/REELS_NOT_READY/);h.scene.dispose();
});

test('MH20 rejects a missing or invalid server multiplier before accepting a receipt and restores all valid outcomes silently',async()=>{
 const h=harness(),original=structuredClone(h.receipt);h.scene.restore(original);
 for(const value of [undefined,null,0,6,2.5,'3']){
  assert.throws(()=>h.scene.restore({...original,wheelMultiplier:value}),/SERVER_MULTIPLIER_REQUIRED/);
  assert.equal(h.scene.receipt.wheelMultiplier,3);assert.deepEqual(paintedNeighbours(h),[1,3,5]);
 }
 for(const value of [1,2,3,4,5]){
  h.scene.restore({...original,wheelMultiplier:value});assert.deepEqual(paintedNeighbours(h),observedNeighbours[value]);
  assert.equal(h.frames.size,0);assert.deepEqual(h.sounds,[]);
 }
 h.scene.start();
 for(const value of [undefined,0,6]){
  await assert.rejects(h.scene.settle({...original,wheelMultiplier:value}),/SERVER_MULTIPLIER_REQUIRED/);
  assert.equal(h.scene.pending,null);assert.equal(h.scene.receipt.wheelMultiplier,5);
 }
 h.scene.reset();assert.deepEqual(paintedNeighbours(h),[5,2,4]);h.scene.dispose();
});

test('MH20 keeps the aspect ratio of actual trimmed Box symbol frames',()=>{
 const h=harness({seven:{symbol:'seven',width:211,height:245}});
 const draws=h.draws.filter(d=>d.symbol==='seven');assert.ok(draws.length>0);
 for(const draw of draws){assert.ok(Math.abs(draw.w/draw.h-211/245)<1e-9);assert.ok(draw.w<=94&&draw.h<=94)}
 h.scene.dispose();
});

function beginWin(h,overrides={},turbo=false){
 const receipt={...structuredClone(h.receipt),finalWin:'25.00',...overrides};
 h.scene.start();if(turbo)h.scene.speedUp();h.tick(1200);
 const done=h.scene.settle(receipt),reelsEnd=Math.max(...h.scene.reelPlans.map(plan=>plan.endTime));
 h.tick(reelsEnd);return{receipt,done,start:reelsEnd};
}
const winDraw=(h,name)=>h.draws.find(draw=>draw.symbol===name&&draw.blend==='source-over');
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.001,`${actual} differs from ${expected}`);

test('desktop title relocation removes only the internal original title and does not move the wheel or reels',()=>{
 let desktop=true;
 const h=harness({}, {showInternalTitle:()=>!desktop,visibleSceneTop:()=>desktop?110:0}),mobile=harness();
 assert.equal(h.draws.some(draw=>draw.symbol==='title'),false);
 assert.deepEqual(h.draws,mobile.draws.filter(draw=>draw.symbol!=='title'),'all receipt geometry remains at its existing coordinates');
 assert.equal(h.frames.size,0);
 desktop=false;h.scene.resize();assert.deepEqual(h.draws,mobile.draws);assert.equal(h.frames.size,0);
 desktop=true;h.scene.resize();assert.equal(h.draws.some(draw=>draw.symbol==='title'),false);assert.equal(h.frames.size,0);
 h.scene.showInternalTitle=()=>{throw Error('layout unavailable')};h.scene.resize();
 assert.ok(h.draws.some(draw=>draw.symbol==='title'),'unavailable layout information retains the original title');
 h.scene.dispose();mobile.scene.dispose();
});

test('desktop premium artwork centres inside the exposed scene region without changing amount, timing or source sprites',async()=>{
 let top=110;
 const h=harness({}, {showInternalTitle:()=>false,visibleSceneTop:()=>top}),mobile=harness();
 const current=beginWin(h),baseline=beginWin(mobile);h.tick(current.start+1100);mobile.tick(baseline.start+1100);
 for(const name of ['__winFrame','__winCrownSmall','__winNice','__winText','__winMoneyFrame','__winCoin','__winBacklight','__winShine']){
  const find=state=>name==='__winShine'?state.draws.find(draw=>draw.symbol===name&&draw.blend==='lighter'):winDraw(state,name);
  const moved=find(h),original=find(mobile);assert.ok(moved&&original,name);
  assert.deepEqual({...moved,pivot:original.pivot},original,name+' uses unchanged original crop/scale/rotation');
  near(moved.pivot[0],original.pivot[0]);near(moved.pivot[1],original.pivot[1]+55);
 }
 assert.deepEqual(h.texts,mobile.texts,'text remains the exact receipt string; context alone translates the composition');
 assert.deepEqual(h.scene.receipt,mobile.scene.receipt);assert.equal(h.scene.celebration.endsAt,mobile.scene.celebration.endsAt);
 for(const invalid of [NaN,-1,301,Infinity,'110']){
  top=invalid;h.scene.resize();near(winDraw(h,'__winFrame').pivot[1],300);
 }
 top=0;h.scene.resize();near(winDraw(h,'__winMoneyFrame').pivot[1],450);
 h.scene.speedUp();mobile.scene.speedUp();assert.equal(await current.done,true);assert.equal(await baseline.done,true);
 assert.equal(h.frames.size,0);assert.equal(mobile.frames.size,0);h.scene.dispose();mobile.scene.dispose();
});

test('NICE uses original art after all reels stop, holds settlement, and displays the exact receipt amount once',async()=>{
 const backdrop=backdropFixture(),h=harness({}, {backdropCanvas:backdrop.canvas});
 const random=Math.random;Math.random=()=>{throw Error('presentation cannot select a random result')};
 try{
  const {receipt,done,start}=beginWin(h,{wheelMultiplier:5}),accepted=structuredClone(receipt);
  let finished=false;done.then(()=>{finished=true});
  assert.equal(h.scene.rolling,false);assert.equal(h.scene.inspect().celebration.tier,'NICE');
  assert.equal(h.scene.inspect().celebration.durationMs,2600);assert.equal(h.canvas.getAttribute('data-win-presentation'),'NICE');
  assert.throws(()=>h.scene.start(),/REELS_NOT_READY/);assert.throws(()=>h.scene.restore(receipt),/REELS_NOT_READY/);
  await assert.rejects(h.scene.settle({...receipt,roundId:'replacement'}),/SPIN_NOT_STARTED/);
  receipt.finalWin='999.99';receipt.bet='0.01';receipt.grid[0][0]='cherry';
  h.tick(start+1067);await Promise.resolve();assert.equal(finished,false);
  assert.deepEqual(visibleGrid(h),accepted.grid);assert.deepEqual(h.scene.receipt,accepted);
  for(const name of ['__winNice','__winText','__winCrownSmall','__winMoneyFrame','__winCoin','__winFrame','__winBacklight','__winShine'])
   assert.ok(h.draws.some(draw=>draw.symbol===name),'missing original win sprite '+name);
  assert.equal(h.draws.some(draw=>['__winBig','__winSuper','__winFantastic'].includes(draw.symbol)),false);
  assert.deepEqual(h.texts.map(args=>args[0]),['25.00 ETB'],'the multiplier is not applied to the already settled amount again');
  assert.ok(h.draws.filter(draw=>h.scene.symbols.includes(draw.symbol)).every(draw=>draw.alpha===.35));
  assert.deepEqual(h.fills,[],'page dimming must not introduce another full-stage rectangular seam');
  assert.equal(backdrop.draws.length,1);assert.equal(h.sounds.filter(sound=>sound.name==='win').length,1);
  assert.equal(h.sounds.find(sound=>sound.name==='win').at,start);
  h.tick(start+2599);await Promise.resolve();assert.equal(finished,false);
  h.tick(start+2600);assert.equal(await done,true);assert.equal(h.scene.inspect().celebration,null);
  assert.equal(h.canvas.getAttribute('data-win-presentation'),null);assert.equal(h.frames.size,0);
  assert.deepEqual(visibleGrid(h),accepted.grid);assert.equal(h.scene.receipt.finalWin,'25.00');
  assert.equal(h.draws.some(draw=>draw.symbol.startsWith('__win')),false);assert.deepEqual(h.texts,[]);
  h.tick(start+10000);assert.equal(h.frames.size,0);assert.equal(h.sounds.filter(sound=>sound.name==='win').length,1);
 }finally{Math.random=random;h.scene.dispose()}
});

test('NICE entrance follows the approved frame, crown, staggered title, and money-frame keyframes',async()=>{
 const h=harness(),{done,start}=beginWin(h,{bet:'0.20',finalWin:'2.50',wheelMultiplier:5});
 h.tick(start+300);near(winDraw(h,'__winCrownSmall').w,63);near(winDraw(h,'__winCrownSmall').pivot[1],172);
 h.tick(start+333.3);near(winDraw(h,'__winFrame').w,399*1.1);
 h.tick(start+433.3);near(winDraw(h,'__winNice').w,264*1.05);near(winDraw(h,'__winNice').pivot[1],244);
 near(h.draws.find(draw=>draw.symbol==='__winNice'&&draw.blend==='lighter').alpha,1);
 h.tick(start+533.3);near(winDraw(h,'__winText').w,236*1.05);near(winDraw(h,'__winText').pivot[1],323);
 h.tick(start+566.7);near(winDraw(h,'__winFrame').w,399*.95);
 h.tick(start+600);near(winDraw(h,'__winMoneyFrame').w,430*1.1);near(winDraw(h,'__winMoneyFrame').pivot[1],452);
 h.tick(start+1067);near(winDraw(h,'__winFrame').w,399);near(winDraw(h,'__winMoneyFrame').w,430);
 assert.deepEqual(h.texts.map(args=>args[0]),['2.50 ETB']);h.scene.speedUp();assert.equal(await done,true);h.scene.dispose();
});

test('independent ZPLAY visual tier boundaries use finalWin/bet only and preserve every server amount',async()=>{
 assert.deepEqual(MULTIHOT20_WIN_PRESENTATION.tiers.map(({name,minimumMultiple})=>[name,minimumMultiple]),
  [['FANTASTIC',100],['SUPER',50],['BIG',25],['NICE',10]]);
 for(const [amount,tier,asset]of [['0.00',null,null],['19.99',null,null],['20.00','NICE','__winNice'],
  ['49.99','NICE','__winNice'],['50.00','BIG','__winBig'],['99.99','BIG','__winBig'],
  ['100.00','SUPER','__winSuper'],['199.99','SUPER','__winSuper'],['200.00','FANTASTIC','__winFantastic']]){
  const h=harness(),{done,start}=beginWin(h,{bet:'2.00',finalWin:amount,wheelMultiplier:5});
  assert.equal(h.scene.inspect().celebration?.tier??null,tier,amount+' tier');
  if(tier){
   h.tick(start+1100);assert.ok(winDraw(h,asset));assert.deepEqual(h.texts.map(args=>args[0]),[amount+' ETB']);
   assert.equal(h.draws.some(draw=>draw.symbol==='__winCrownBig'),false);h.scene.speedUp();
  }else{assert.equal(h.frames.size,0);assert.equal(h.draws.some(draw=>draw.symbol.startsWith('__win')),false)}
  assert.equal(await done,true);assert.equal(h.scene.receipt.finalWin,amount);assert.equal(h.scene.receipt.bet,'2.00');
  assert.equal(h.sounds.filter(sound=>sound.name==='win').length,amount==='0.00'?0:1);h.scene.dispose();
 }
});

test('an absent or malformed stake never invents a win tier and large exact-cent amounts stay below their boundary',async()=>{
 for(const bet of [undefined,'0.00','-1.00','2','2e0',2]){
  const h=harness(),{done}=beginWin(h,{bet,finalWin:'200.00'});assert.equal(await done,true);
  assert.equal(h.scene.inspect().celebration,null);assert.equal(h.scene.receipt.finalWin,'200.00');h.scene.dispose();
 }
 const h=harness(),{done}=beginWin(h,{bet:'1000000000000.00',finalWin:'9999999999999.99'});
 assert.equal(await done,true);assert.equal(h.scene.inspect().celebration,null);h.scene.dispose();
});

test('STOP ends the win presentation without accepting another receipt, playing another win, or moving a symbol',async()=>{
 const h=harness(),{done,start}=beginWin(h),accepted=structuredClone(h.scene.receipt);
 h.tick(start+900);assert.equal(h.scene.speedUp(),true);assert.equal(await done,true);
 assert.deepEqual(h.scene.receipt,accepted);assert.deepEqual(visibleGrid(h),accepted.grid);
 assert.equal(h.frames.size,0);assert.equal(h.scene.speedUp(),false);assert.equal(h.scene.inspect().celebration,null);
 h.tick(start+9000);assert.equal(h.sounds.filter(sound=>sound.name==='win').length,1);h.scene.dispose();
});

test('turbo compresses only the win presentation and completes by its explicit 700ms bound',async()=>{
 const h=harness(),{done,start}=beginWin(h,{},true);let finished=false;done.then(()=>{finished=true});
 assert.equal(h.scene.inspect().celebration.durationMs,700);
 h.tick(start+350);assert.ok(winDraw(h,'__winMoneyFrame'));assert.deepEqual(h.texts.map(args=>args[0]),['25.00 ETB']);
 h.tick(start+699);await Promise.resolve();assert.equal(finished,false);
 h.tick(start+700);assert.equal(await done,true);assert.equal(h.frames.size,0);assert.equal(h.scene.receipt.finalWin,'25.00');
 assert.equal(h.sounds.filter(sound=>sound.name==='win').length,1);h.scene.dispose();
});

test('hidden-page and reduced-motion completion remove win dimming without replaying sound or animation',async()=>{
 const h=harness(),{done,start}=beginWin(h);h.tick(start+1100);const accepted=structuredClone(h.scene.receipt);
 const plays=h.sounds.filter(sound=>!sound.name.startsWith('stop:')&&sound.name!=='pause').length;
 h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(await done,true);
 assert.equal(h.frames.size,0);assert.equal(h.canvas.getAttribute('data-win-presentation'),null);
 h.doc.hidden=false;h.doc.dispatchEvent(new Event('visibilitychange'));h.scene.restore(accepted);h.tick(start+9000);
 assert.equal(h.sounds.filter(sound=>!sound.name.startsWith('stop:')&&sound.name!=='pause').length,plays);
 assert.deepEqual(visibleGrid(h),accepted.grid);assert.equal(h.frames.size,0);h.scene.dispose();

 const preference=new Target();preference.matches=true;const win=new Target();win.matchMedia=()=>preference;
 const reduced=harness({}, {win});reduced.scene.start();assert.equal(await reduced.scene.settle({...reduced.receipt,finalWin:'25.00'}),true);
 assert.equal(reduced.scene.inspect().celebration,null);assert.equal(reduced.frames.size,0);assert.equal(reduced.sounds.filter(sound=>sound.name==='win').length,0);
 assert.equal(reduced.sounds.filter(sound=>sound.name==='reel-stop').length,0,'visible reduced-motion completion is silent, including remaining reel stops');
 preference.matches=false;preference.dispatchEvent(Object.assign(new Event('change'),{matches:false}));
 const next=beginWin(reduced);assert.equal(reduced.scene.inspect().celebration.tier,'NICE');
 preference.dispatchEvent(Object.assign(new Event('change'),{matches:true}));assert.equal(await next.done,true);
 assert.equal(reduced.frames.size,0);assert.equal(reduced.canvas.getAttribute('data-win-presentation'),null);
 reduced.scene.dispose();assert.ok([...preference.listeners.values()].every(count=>count===0));
});

test('reset and disposal cancel an active win exactly once and leave no future frames, sounds, or dimming',async()=>{
 for(const method of ['reset','dispose']){
  const h=harness(),{done,start}=beginWin(h);h.tick(start+1100);h.scene[method]();
  assert.equal(await done,false);assert.equal(h.scene.receipt,null);assert.equal(h.frames.size,0);
  assert.equal(h.canvas.getAttribute('data-win-presentation'),null);
  const sounds=h.sounds.length;h.tick(start+9000);assert.equal(h.sounds.length,sounds);assert.equal(h.frames.size,0);
  if(method==='dispose')assert.ok([...h.win.listeners.values(),...h.doc.listeners.values()].every(count=>count===0));
  h.scene.dispose();
 }
});

test('restoring a premium historical receipt is silent and static with no celebration or dimming',()=>{
 const h=harness(),receipt={...h.receipt,finalWin:'200.00'};h.scene.restore(receipt);
 assert.deepEqual(visibleGrid(h),receipt.grid);assert.equal(h.scene.inspect().celebration,null);
 assert.equal(h.canvas.getAttribute('data-win-presentation'),null);assert.equal(h.frames.size,0);assert.deepEqual(h.sounds,[]);
 assert.equal(h.draws.some(draw=>draw.symbol.startsWith('__win')),false);h.scene.dispose();
});

function evaluatedLineReceipt({grid,bet='1.00',wheelMultiplier=1,...overrides}={}){
 const result=evaluateCapturedMath({gameId:'fresh_multihot20',bet,wheelMultiplier,grid:grid??[
  Array(5).fill('bell'),['bell','seven','lemon','plum','orange'],['grape','watermelon','orange','bell','seven']
 ]});
 return {...result,roundId:'server-evaluated-line-result',currency:'ETB',bet,...overrides};
}
async function revealLineReceipt(h,receipt){
 h.scene.start();h.tick(1200);const settled=h.scene.settle(receipt);
 h.tick(Math.max(...h.scene.reelPlans.map(plan=>plan.endTime)));
 if(h.scene.celebration)h.tick(h.scene.celebration.endsAt);
 assert.equal(await settled,true);return h.time();
}
const cellRects=positions=>positions.map(([row,col])=>[45+col*102+3,252+row*102+3,96,96]);
const linePath=positions=>positions.map(([row,col],i)=>[i?'L':'M',45+(col+.5)*102,252+(row+.5)*102]);

test('dismissing NICE finishes its accepted settlement once and suppresses later result animation until a new spin',async()=>{
 const h=harness(),receipt=evaluatedLineReceipt(),{done,start}=beginWin(h,receipt);
 let resolutions=0;done.then(()=>resolutions++);
 h.tick(start+1100);assert.ok(winDraw(h,'__winNice'));assert.equal(resolutions,0);
 assert.equal(h.scene.dismissResultPresentation(),true);assert.equal(await done,true);assert.equal(resolutions,1);
 assert.equal(h.scene.celebration,null);assert.equal(h.canvas.getAttribute('data-win-presentation'),null);
 assert.equal(h.lineViews.at(-1).view,null);assert.equal(h.frames.size,0);
 assert.equal(h.sounds.at(-1).name,'stop:win');assert.deepEqual(h.scene.receipt,receipt);
 const finalDraws=structuredClone(h.draws),plays=h.sounds.filter(sound=>sound.name==='win').length;
 assert.equal(h.scene.dismissResultPresentation(),false,'repeated modal dismissal is idempotent');
 h.scene.stopLinePresentation();h.scene.resize();h.win.dispatchEvent(new Event('focus'));
 h.tick(start+90000);assert.equal(h.frames.size,0);assert.deepEqual(h.draws,finalDraws);
 assert.equal(h.lineViews.some(item=>item.view!==null),false);assert.equal(resolutions,1);
 assert.equal(h.sounds.filter(sound=>sound.name==='win').length,plays);
 h.scene.restore(receipt);assert.equal(h.frames.size,0);assert.deepEqual(h.draws,finalDraws);

 const next={...receipt,roundId:'next-explicit-server-round'};
 h.scene.start();const nextDone=h.scene.settle(next);
 h.tick(Math.max(...h.scene.reelPlans.map(plan=>plan.endTime)));
 assert.equal(h.scene.celebration?.tier.name,'NICE','only a new explicit spin clears suppression');
 assert.equal(h.sounds.filter(sound=>sound.name==='win').length,plays+1);
 h.tick(h.scene.celebration.endsAt);assert.equal(await nextDone,true);
 h.tick(h.time()+700);assert.ok(h.lineViews.at(-1).view);
 assert.equal(h.scene.dismissResultPresentation(),true);assert.equal(h.frames.size,0);
 assert.equal(h.lineViews.at(-1).view,null);assert.deepEqual(h.scene.receipt,next);
 h.scene.dispose();const soundCount=h.sounds.length;
 assert.equal(h.scene.dismissResultPresentation(),false);h.tick(h.time()+90000);
 assert.equal(h.sounds.length,soundCount);assert.equal(h.frames.size,0);
});

test('dismissal before a late winning receipt or during reels keeps settlement valid without a future win cue, popup or line loop',async()=>{
 const ordinary=evaluatedLineReceipt({grid:[
  ['cherry','cherry','cherry','seven','lemon'],['bell','grape','plum','orange','seven'],['seven','lemon','orange','grape','bell']
 ]});
 assert.ok(Number(ordinary.finalWin)>0&&Number(ordinary.finalWin)<10);
 for(const timing of ['network','reels'])for(const receipt of [ordinary,evaluatedLineReceipt()]){
  const h=harness();h.scene.start();h.tick(1200);let done;
  if(timing==='reels'){done=h.scene.settle(receipt);h.tick(1250)}
  assert.equal(h.scene.dismissResultPresentation(),true);assert.equal(h.scene.rolling,true,'dismissal must not discard an accepted or in-flight round');
  if(timing==='network')done=h.scene.settle(receipt);
  let resolutions=0;done.then(()=>resolutions++);
  h.tick(Math.max(...h.scene.reelPlans.map(plan=>plan.endTime)));
  assert.equal(await done,true);assert.equal(resolutions,1);assert.deepEqual(h.scene.receipt,receipt);
  assert.deepEqual(visibleGrid(h),receipt.grid);assert.equal(h.scene.celebration,null);
  assert.equal(h.draws.some(draw=>draw.symbol.startsWith('__win')),false);assert.equal(h.frames.size,0);
  assert.equal(h.lineViews.some(item=>item.view!==null),false);assert.equal(h.sounds.filter(sound=>sound.name==='win').length,0);
  const finalDraws=structuredClone(h.draws),sounds=structuredClone(h.sounds);
  // Closing a dialog does not start a round. Ordinary focus/resize and an
  // authenticated history repaint therefore cannot revive this result.
  h.scene.stopLinePresentation();h.scene.resize();h.win.dispatchEvent(new Event('focus'));h.scene.restore(receipt);
  h.tick(h.time()+90000);assert.equal(h.frames.size,0);assert.equal(resolutions,1);
  assert.deepEqual(h.draws,finalDraws);assert.deepEqual(h.sounds,sounds);h.scene.dispose();
 }
});

test('receipt line sequence repeats the actual evaluator lines until interrupted and preserves the silent restored summary',async()=>{
 const h=harness(),receipt=evaluatedLineReceipt(),original=structuredClone(receipt);
 assert.equal(receipt.finalWin,'20.00');assert.deepEqual(receipt.winLines.map(line=>[line.line,line.count,line.baseWin]),[[1,5,'10.00'],[8,4,'5.00'],[12,4,'5.00']]);
 const random=Math.random;Math.random=()=>{throw Error('the line sequence cannot choose outcomes')};
 try{
  const started=await revealLineReceipt(h,receipt),sounds=structuredClone(h.sounds);
  assert.equal(h.scene.inspect().rolling,false);assert.equal(h.frames.size,1,'settlement is finished while the fresh-result presentation continues');
  assert.equal(h.lineViews.at(-1).view,null);assert.deepEqual(h.texts,[],'app-owned under-grid caption must not become Canvas title text');
  h.tick(started+599);assert.equal(h.lineViews.at(-1).view,null);
  for(const [i,line]of original.winLines.entries()){
   h.tick(started+600+i*1200);
   const view=h.lineViews.at(-1).view;
   assert.deepEqual(view,{roundId:receipt.roundId,line:line.line,symbol:'bell',count:line.count,baseWin:line.baseWin,
    wheelMultiplier:1,currency:'ETB',maxWinCapped:false,totalWin:'20.00',index:i,totalLines:3,positions:line.positions,
    path:OFFICIAL_LINE_PATHS.fresh_multihot20[line.line-1].map((row,col)=>[row,col])});
   assert.equal(Object.hasOwn(view,'lineWin'),false,'scene never computes a second payout');
   assert.ok(Object.isFrozen(view)&&Object.isFrozen(view.positions)&&view.positions.every(Object.isFrozen));
   assert.deepEqual(h.strokePaths.map(item=>item.path),[linePath(view.path)]);
   assert.equal(h.strokePaths[0].colour,'#ffee00');assert.deepEqual(h.strokes,cellRects(line.positions));
   assert.deepEqual(visibleGrid(h),original.grid);assert.deepEqual(h.scene.receipt,original);
   const emitted=h.lineViews.length;h.tick(started+600+i*1200+16);assert.equal(h.lineViews.length,emitted,'caption changes once per line, not every frame');
  }
  receipt.winLines[0].positions[0][0]=2;receipt.winLines[0].baseWin='999.99';receipt.finalWin='999.99';
  h.tick(started+4200);assert.equal(h.frames.size,1);assert.equal(h.lineViews.at(-1).view.line,1,'line sequence repeats after the first pass');
  h.tick(started+18000);assert.equal(h.frames.size,1);assert.ok(h.lineViews.at(-1).view,'visible fresh win continues beyond eighteen seconds');
  h.scene.stopLinePresentation();assert.equal(h.frames.size,0);assert.equal(h.lineViews.at(-1).view,null);
  assert.deepEqual(h.scene.receipt,original);assert.deepEqual(h.sounds,sounds,'line transitions add no sound or settlement');
  const final=structuredClone(h.draws),finalStrokes=structuredClone(h.strokes);
  h.scene.restore(original);assert.deepEqual(h.draws,final);assert.deepEqual(h.strokes,finalStrokes);assert.deepEqual(h.strokePaths,[]);
  h.tick(started+90000);assert.equal(h.frames.size,0);assert.deepEqual(h.sounds,sounds);assert.equal(h.lineViews.at(-1).view,null);
 }finally{Math.random=random;h.scene.dispose()}
});

test('selected multiplier uses warm curved gradient fire beneath one fixed-angle original Light draw',async()=>{
 const h=harness(),receipt=evaluatedLineReceipt({wheelMultiplier:4}),started=await revealLineReceipt(h,receipt);
 h.tick(started+700);
 const first=structuredClone(h.draws.find(draw=>draw.symbol==='wheel-light')),fire=structuredClone(h.filledPaths);
 const expectedRing=structuredClone(ringDraw(h));
 assert.equal(h.draws.filter(draw=>draw.symbol==='wheel-light').length,1);
 assert.equal(first.angle,expectedRing.angle);assert.deepEqual(paintedNeighbours(h),[2,4,1]);
 assert.ok(first.alpha>=.78&&first.alpha<=1);
 const scale=510/978,top=252-267*scale;
 const wedge=[['M',45+368*scale,top+34*scale],['L',45+611*scale,top+34*scale],
  ['L',45+570*scale,top+255*scale],['L',45+411*scale,top+255*scale],['Z']];
 assert.ok(h.clipPaths.some(path=>JSON.stringify(path)===JSON.stringify(wedge)),'all generated fire is clipped by the original selector polygon');
 const wedgeFire=fire.filter(item=>item.clips.some(path=>JSON.stringify(path)===JSON.stringify(wedge)));
 assert.ok(wedgeFire.length>1&&wedgeFire.length<=20,'selected-sector work is bounded');
 assert.ok(wedgeFire.every(item=>item.blend==='source-over'&&item.gradientStops?.length>=3),
  'translucent warm gradients must not accumulate as additive white spikes');
 assert.ok(wedgeFire.filter(item=>item.path.some(p=>p[0]==='C')).every(item=>item.path.filter(p=>p[0]==='C').length>=4),
  'tongues have asymmetric multi-curve curls rather than triangular peaks');
 assert.ok(wedgeFire.some(item=>item.gradientStops.some(([,colour])=>colour.includes('255,128,8'))),'orange edge');
 assert.ok(wedgeFire.some(item=>item.gradientStops.some(([,colour])=>colour.includes('255,239,112'))),'gold core');
 h.tick(started+917);
 const next=h.draws.find(draw=>draw.symbol==='wheel-light');assert.notEqual(next.alpha,first.alpha);
 assert.notDeepEqual(h.filledPaths,fire,'flame curves move smoothly without changing a numeral');
 assert.deepEqual(ringDraw(h),expectedRing);assert.equal(next.angle,first.angle);assert.deepEqual(next.source,first.source);
 assert.deepEqual(visibleGrid(h),receipt.grid);assert.equal(h.scene.receipt.finalWin,receipt.finalWin);
 h.scene.stopLinePresentation();assert.equal(h.frames.size,0);assert.equal(h.filledPaths.length,0);
 assert.equal(h.draws.find(draw=>draw.symbol==='wheel-light').alpha,1);assert.deepEqual(paintedNeighbours(h),[2,4,1]);h.scene.dispose();
});

test('curved winning-cell fire follows only the exact receipt prefix with bounded work and no outcome or audio changes',async()=>{
 const h=harness(),other=harness(),receipt=evaluatedLineReceipt({wheelMultiplier:4}),original=structuredClone(receipt);
 const started=await revealLineReceipt(h,receipt),otherStarted=await revealLineReceipt(other,receipt);
 const sounds=structuredClone(h.sounds),random=Math.random;
 Math.random=()=>{throw Error('presentation must not sample outcomes')};
 try{
  for(const [index,offset]of [[0,700],[1,1900],[2,3100]]){
   h.tick(started+offset);other.tick(otherStarted+offset);
   const line=original.winLines[index],expected=line.positions.map(([row,col])=>[45+col*102+1,252+row*102+1,100,100]);
   const cellFire=h.filledPaths.filter(item=>item.clips.at(-1)?.[0]?.[0]==='R'&&item.path.some(p=>p[0]==='C'));
   const regions=[...new Set(cellFire.map(item=>JSON.stringify(item.clips.at(-1)[0].slice(1))))].map(JSON.parse);
   assert.deepEqual(regions,expected,'non-winning fifth-column cells never acquire a flame border');
   assert.ok(cellFire.length>=line.count&&cellFire.length<=line.count*8,'work scales with one displayed line, never every paid line');
   assert.ok(cellFire.every(item=>item.blend==='source-over'&&item.gradientStops?.length>=3));
   assert.ok(cellFire.every(item=>item.path.filter(p=>p[0]==='C').length>=8),'each border is a smooth ribbon');
   assert.ok(cellFire.every(item=>item.gradientStops.some(([,colour])=>colour.includes('255,150,12'))&&
    item.gradientStops.some(([,colour])=>colour.includes('255,226,83'))),'orange and gold are preserved without white additive blending');
   assert.deepEqual(h.filledPaths,other.filledPaths,'the same receipt and time produce the same drawing');
   assert.deepEqual(h.strokes,cellRects(line.positions));assert.deepEqual(h.strokePaths.map(item=>item.path),[linePath(OFFICIAL_LINE_PATHS.fresh_multihot20[line.line-1].map((row,col)=>[row,col]))]);
   assert.deepEqual(h.scene.receipt,original);assert.deepEqual(visibleGrid(h),original.grid);assert.deepEqual(h.sounds,sounds);
   const first=structuredClone(cellFire);h.tick(started+offset+90);
   assert.notDeepEqual(h.filledPaths.filter(item=>item.clips.at(-1)?.[0]?.[0]==='R'&&item.path.some(p=>p[0]==='C')),first,'ribbons flow within their fixed cell clips');
   assert.equal(h.frames.size,1,'one existing scene RAF owns all vector effects');
  }
  h.scene.dismissResultPresentation();assert.equal(h.frames.size,0);assert.equal(h.filledPaths.length,0);
  h.scene.restore(original);h.tick(started+90000);assert.equal(h.filledPaths.length,0);assert.equal(h.frames.size,0);
 }finally{Math.random=random;h.scene.dispose();other.scene.dispose()}
});

test('loss, history and reduced-motion results never draw selected-sector or winning-cell fire',async()=>{
 const lost=evaluatedLineReceipt({grid:[['seven','bell','grape','watermelon','lemon'],
  ['plum','orange','cherry','seven','bell'],['grape','watermelon','lemon','plum','orange']]});
 assert.equal(lost.finalWin,'0.00');
 const h=harness();await revealLineReceipt(h,lost);h.tick(h.time()+90000);
 assert.equal(h.filledPaths.length,0);assert.equal(h.frames.size,0);
 const won=evaluatedLineReceipt();h.scene.restore(won);h.tick(h.time()+90000);
 assert.equal(h.filledPaths.length,0);assert.equal(h.frames.size,0);
 h.scene.reducedMotion=true;h.scene.start();await h.scene.settle(won);h.tick(h.time()+90000);
 assert.equal(h.filledPaths.length,0);assert.equal(h.frames.size,0);h.scene.dispose();
});

test('capped receipts preserve exact cap metadata through all twenty lines and repeat without allocating the total cap',async()=>{
 const h=harness(),receipt=evaluatedLineReceipt({grid:Array.from({length:3},()=>Array(5).fill('seven')),wheelMultiplier:5});
 assert.equal(receipt.maxWinCapped,true);assert.equal(receipt.winLines.length,20);
 assert.equal(receipt.finalWin,'1000.00');const started=await revealLineReceipt(h,receipt);
 assert.deepEqual(MULTIHOT20_LINE_PRESENTATION,{summaryMs:600,lineMs:1200,maxLines:20});
 assert.deepEqual(MULTIHOT20_PAYLINE_ROWS,OFFICIAL_LINE_PATHS.fresh_multihot20);
 for(let i=0;i<20;i++){
  h.tick(started+600+i*1200);
  const view=h.lineViews.at(-1).view;assert.equal(view.line,i+1);assert.equal(view.maxWinCapped,true);
  assert.equal(view.totalWin,'1000.00');assert.equal(view.baseWin,receipt.winLines[i].baseWin);
  assert.equal(Object.hasOwn(view,'lineWin'),false,'a cap is never allocated to individual lines by presentation');
 }
 h.tick(started+24600);assert.equal(h.frames.size,1);assert.equal(h.lineViews.at(-1).view.line,1);
 h.scene.stopLinePresentation();assert.equal(h.frames.size,0);assert.equal(h.lineViews.at(-1).view,null);
 assert.deepEqual(h.scene.receipt,receipt);h.scene.dispose();
});

test('new spin, public stop, restore, reset, disposal and visibility changes cancel line captions and future emphasis immediately',async()=>{
 for(const action of ['stop','start','restore','hidden','blur','pagehide','reset','dispose']){
  const h=harness(),receipt=evaluatedLineReceipt(),started=await revealLineReceipt(h,receipt);
  h.tick(started+700);assert.ok(h.lineViews.at(-1).view);const plays=h.sounds.filter(s=>s.name==='win').length;
  if(action==='stop'){assert.equal(h.scene.stopLinePresentation(),true);assert.equal(h.scene.stopLinePresentation(),false)}
  else if(action==='hidden'){h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'))}
  else if(action==='blur'||action==='pagehide')h.win.dispatchEvent(new Event(action));
  else if(action==='restore')h.scene.restore(receipt);
  else h.scene[action]();
  assert.equal(h.lineViews.at(-1).view,null,action);assert.equal(h.scene.linePresentation,null,action);
  if(action==='start'){h.tick(started+720);assert.deepEqual(h.strokePaths,[]);h.scene.reset()}
  assert.equal(h.frames.size,0,action);
  h.doc.hidden=false;h.win.dispatchEvent(new Event('focus'));h.win.dispatchEvent(new Event('pageshow'));
  h.tick(started+99999);assert.equal(h.frames.size,0,action+' must not replay on return');
  assert.equal(h.sounds.filter(s=>s.name==='win').length,plays);h.scene.dispose();
 }
});

test('reduced motion never starts a result cycle and changing preference cancels an existing one',async()=>{
 const preference=new Target();preference.matches=true;const win=new Target();win.matchMedia=()=>preference;
 const h=harness({}, {win}),receipt=evaluatedLineReceipt();
 h.scene.start();assert.equal(await h.scene.settle(receipt),true);assert.equal(h.frames.size,0);
 assert.equal(h.lineViews.some(item=>item.view!==null),false);assert.equal(h.sounds.filter(s=>s.name==='win').length,0);
 preference.dispatchEvent(Object.assign(new Event('change'),{matches:false}));
 const started=await revealLineReceipt(h,receipt);h.tick(started+700);assert.ok(h.lineViews.at(-1).view);
 preference.dispatchEvent(Object.assign(new Event('change'),{matches:true}));assert.equal(h.frames.size,0);assert.equal(h.lineViews.at(-1).view,null);
 preference.dispatchEvent(Object.assign(new Event('change'),{matches:false}));h.tick(started+90000);
 assert.equal(h.frames.size,0);h.scene.dispose();assert.ok([...preference.listeners.values()].every(count=>count===0));
});

test('incomplete or contradictory line metadata cannot fabricate a caption or multiplier effect',async()=>{
 const variants=[
  r=>{r.currency='DMO'},r=>{r.winLines[0].line=0},r=>{r.winLines[1].line=r.winLines[0].line},
  r=>{r.winLines[0].symbol='seven'},r=>{r.winLines[0].count=2},r=>{r.winLines[0].count=3},
  r=>{r.winLines[0].positions[1]=[0,0]},r=>{r.winLines[0].line=2},r=>{r.winLines[0].baseWin='1e1'},r=>{r.winLines[0].baseWin='0.00'},
  r=>{delete r.winLines[0].baseWin},r=>{r.winLines.push(...Array(20).fill(r.winLines[0]))}
 ];
 for(const alter of variants){
  const h=harness(),receipt=evaluatedLineReceipt();alter(receipt);await revealLineReceipt(h,receipt);
  assert.equal(h.frames.size,0);assert.equal(h.lineViews.some(item=>item.view!==null),false);
  assert.equal(h.filledPaths.length,0);assert.equal(h.scene.receipt.finalWin,receipt.finalWin);h.scene.dispose();
 }
});

test('caption callback failures cannot change an accepted result, add sound, or keep animation alive',async()=>{
 const h=harness({}, {onLinePresentation:view=>{if(view)throw Error('caption detached')}}),receipt=evaluatedLineReceipt();
 const started=await revealLineReceipt(h,receipt),sounds=structuredClone(h.sounds);
 for(const offset of [600,1800,3000,4200])h.tick(started+offset);
 h.scene.stopLinePresentation();
 assert.equal(h.frames.size,0);assert.equal(h.lineViews.at(-1).view,null);assert.deepEqual(h.scene.receipt,receipt);
 assert.deepEqual(h.sounds,sounds);h.scene.dispose();
});

function fixture(){
 const names=['atlas-0.png','atlas-1.png','atlas-2.png','atlas-3.png','atlas-logo.png','background.png',
  'wins.png','wins2.png','spin.mp3','reel-stop.mp3','win.mp3','button.mp3','music.mp3'];
 const bodies=new Map(names.map(name=>[name,Buffer.from('verified-'+name)]));
 const manifest={schema:'zplay/verified-official-capture-assets/v1',gameId:'fresh_multihot20',baseUrl:'./assets/',
  symbols:['seven','bell','grape','watermelon','lemon','plum','orange','cherry'],
  files:Object.fromEntries([...bodies].map(([name,body])=>[name,{sha256:createHash('sha256').update(body).digest('hex'),bytes:body.length,contentType:name.endsWith('.png')?'image/png':'audio/mpeg'}]))};
 const decoded=[],requests=[],canvases=[],dimensions={
  'atlas-0.png':[2047,2047],'atlas-1.png':[2047,2025],'atlas-2.png':[2047,2047],
  'atlas-3.png':[1093,1946],'atlas-logo.png':[1822,1793],'background.png':[400,100],
  'wins.png':[2042,2010],'wins2.png':[1529,847]
 };
 const imageDecoder=async blob=>{
  const file=(await blob.text()).replace('verified-',''),[width,height]=dimensions[file];
  const b={file,width,height,closed:0,close(){this.closed++}};decoded.push(b);return b;
 };
 const doc={createElement:()=>{
  const operations=[],draws=[],ctx={translate:(...args)=>operations.push(['translate',...args]),rotate:(angle)=>operations.push(['rotate',angle]),drawImage:(...args)=>draws.push(args)};
  const canvas={width:0,height:0,operations,draws,getContext:()=>ctx};canvases.push(canvas);return canvas;
 }};
 const fetcher=async url=>{const name=new URL(url).pathname.split('/').pop();requests.push(name);return name==='assets.json'?Response.json(manifest):new Response(bodies.get(name))};
 return{manifest,bodies,decoded,requests,canvases,dimensions,options:{manifestURL:'https://player.invalid/new74/multi-hot-20/assets.json',fetcher,imageDecoder,doc,timeoutMs:1000}};
}

test('verified original atlas URLs and audio remain same-origin; dispose closes bitmaps and blocks new reads',async()=>{
 const f=fixture(),resources=await loadVerifiedAssets(f.options);
 for(const name of ['atlas-0.png','atlas-1.png','atlas-2.png','atlas-3.png','atlas-logo.png','background.png','wins.png','wins2.png'])assert.equal(resources.urls.get(name),'https://player.invalid/new74/multi-hot-20/assets/'+name);
 assert.equal(resources.urls.has('spin-button.png'),false);assert.equal(resources.images.lemon.width,220);assert.equal(resources.images.lemon.height,243);
 assert.equal(resources.images.__wheelFrame.file,'atlas-0.png');assert.equal(resources.images.__wheelNumbers.file,'atlas-3.png');assert.equal(resources.images.__wheelLight.file,'atlas-2.png');
 const audio=await resources.primeAudio();assert.ok(audio.spin.endsWith('/spin.mp3'));assert.ok(audio.music.endsWith('/music.mp3'));
 assert.equal(resources.urls.size,13);
 const readCount=f.requests.length;await resources.primeAudio();assert.equal(f.requests.length,readCount,'verified bytes are deduplicated');
 resources.dispose();resources.dispose();assert.equal(resources.urls.size,0);assert.ok(f.decoded.every(b=>b.closed===1));
 await assert.rejects(resources.primeAudio(),/ASSETS_DISPOSED/);
});

test('original symbol, box and title crops use inspected visual metadata and undo packed rotation without stretching',async()=>{
 const f=fixture(),resources=await loadVerifiedAssets(f.options);
 // Independent expectations transcribed from the captured visual-only atlas
 // metadata. Packed dimensions swap on a rotated entry; output stays upright.
 const expected={
  seven:['atlas-2.png',1337,1,225,264,-1],bell:['atlas-3.png',612,1335,217,243,-1],
  grape:['atlas-3.png',612,1098,230,235,0],watermelon:['atlas-2.png',1837,1791,232,209,-1],
  cherry:['atlas-3.png',1,1657,218,244,0],orange:['atlas-3.png',844,1098,214,248,-1],
  plum:['atlas-1.png',1514,586,197,263,0],lemon:['atlas-2.png',1603,1,220,243,-1],
  __boxFrame:['atlas-1.png',1,1098,1119,696,0],__title:['atlas-logo.png',2,1158,633,152,1],
  // Independent alpha-bound measurements of the unmodified approved pages.
  __winNice:['wins.png',240,1861,264,105,0],__winText:['wins.png',2,1881,236,100,0],
  __winCrownSmall:['wins.png',711,1961,60,48,0],__winMoneyFrame:['wins.png',576,1080,430,155,0],
  __winCoin:['wins.png',1400,1911,105,97,0],__winFrame:['wins2.png',869,30,399,379,0],
  __winBacklight:['wins2.png',7,7,855,834,0],__winShine:['wins2.png',881,428,391,397,0],
  __winBig:['wins.png',1645,1908,198,100,0],__winSuper:['wins.png',1062,1800,344,109,0],
  __winFantastic:['wins.png',786,1683,537,115,0]
 };
 assert.equal(f.canvases.length,21);
 for(const [name,[file,x,y,w,h,turn]] of Object.entries(expected)){
  const canvas=resources.images[name],packedWidth=turn?h:w,packedHeight=turn?w:h;
  assert.deepEqual([canvas.width,canvas.height],[w,h],name+' keeps native trimmed dimensions');
  assert.equal(canvas.draws.length,1);const [bitmap,...draw]=canvas.draws[0];assert.equal(bitmap.file,file);
  assert.deepEqual(draw,[x,y,packedWidth,packedHeight,0,0,packedWidth,packedHeight],name+' draws its exact packed region');
  assert.ok(x+packedWidth<=bitmap.width&&y+packedHeight<=bitmap.height,name+' crop stays inside atlas');
  assert.deepEqual(canvas.operations,turn<0?[['translate',0,h],['rotate',-Math.PI/2]]:turn>0?[['translate',w,0],['rotate',Math.PI/2]]:[],name+' packing rotation');
 }
 resources.dispose();
});

test('unverified atlas size and invalid symbol inventories fail before an incomplete game can load',async()=>{
 const f=fixture();f.dimensions['atlas-3.png']=[1092,1946];
 await assert.rejects(loadVerifiedAssets(f.options),/OFFICIAL_ATLAS_DIMENSIONS_atlas-3.png/);
 await new Promise(resolve=>setImmediate(resolve));assert.ok(f.decoded.every(b=>b.closed===1));
 for(const symbols of [fixture().manifest.symbols.slice(1),Array(8).fill('seven'),['wild',...fixture().manifest.symbols.slice(1)]]){
  const bad=fixture();bad.manifest.symbols=symbols;
  await assert.rejects(loadVerifiedAssets(bad.options),/INVALID_SYMBOL_INVENTORY/);
  assert.deepEqual(bad.requests,['assets.json'],'bad inventory never starts asset reads');
 }
});

test('each original win page must pass its hash and exact dimensions before premium sprites are exposed',async()=>{
 for(const name of ['wins.png','wins2.png']){
  const wrongSize=fixture();wrongSize.dimensions[name][0]--;
  await assert.rejects(loadVerifiedAssets(wrongSize.options),new RegExp('OFFICIAL_ATLAS_DIMENSIONS_'+name.replace('.','\\.')));
  await new Promise(resolve=>setImmediate(resolve));assert.ok(wrongSize.decoded.every(bitmap=>bitmap.closed===1));
  const tampered=fixture();tampered.bodies.set(name,Buffer.from('corrupt-original-win-page'));
  await assert.rejects(loadVerifiedAssets(tampered.options),new RegExp('ASSET_INTEGRITY_ERROR_'+name.replace('.','\\.')));
  await new Promise(resolve=>setImmediate(resolve));assert.ok(tampered.decoded.every(bitmap=>bitmap.closed===1));
 }
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

test('tampered atlas fails closed and releases already decoded images',async()=>{
 const f=fixture();f.bodies.set('atlas-3.png',Buffer.from('corrupt'));
 await assert.rejects(loadVerifiedAssets(f.options),/ASSET_INTEGRITY_ERROR_atlas-3.png/);
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
