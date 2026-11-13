import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {games} from './games.mjs';

const app=await readFile(new URL('./app.mjs',import.meta.url),'utf8');
const source=app.slice(app.indexOf('class Scene {'),app.indexOf('const scene=new Scene();'));

function fixture(game=games[0]){
 const time={now:0},frames=new Map(),draws=[],clips=[],sounds=[];
 let nextFrame=0,reduced=false;
 const bounds={width:1200,height:800};
 const context=new Proxy({
  rect(...args){clips.push(args);},
  createLinearGradient(){return {addColorStop(){}};},
 },{get(target,key){return key in target?target[key]:(()=>{});}});
 const canvas={getContext:()=>context},stage={getBoundingClientRect:()=>bounds};
 const art={frames:{},draw(_context,name,x,y,width,height,options){draws.push({name,x,y,width,height,options});}};
 for(const index of Object.values(game.symbols))for(const prefix of ['Box','BlurBox'])art.frames[`${prefix}/${index}`]={spriteSourceSize:{w:100,h:100}};
 const globals={
  game,art,disposed:false,pageSuspended:false,turbo:false,document:{hidden:false},devicePixelRatio:1,
  $:id=>id==='scene'?canvas:stage,performance:{now:()=>time.now},reduced:()=>reduced,
  sound:name=>sounds.push(name),cents:value=>BigInt(String(value).replace('.','')),
  requestAnimationFrame(callback){const id=++nextFrame;frames.set(id,callback);return id;},
  cancelAnimationFrame:id=>frames.delete(id),
 };
 vm.createContext(globals);vm.runInContext(source+'\nglobalThis.Scene=Scene;',globals);
 const scene=new globals.Scene();scene.resize();
 const symbols=()=>draws.filter(draw=>/^(?:BlurBox|Box)\//.test(draw.name));
 function render(){draws.length=0;clips.length=0;scene.draw();return symbols();}
 function advance(now){time.now=now;const batch=[...frames.values()];frames.clear();for(const callback of batch)callback(now);}
 function result(roundId='round-scene-test'){
  const keys=Object.keys(game.symbols);
  return {roundId,grid:Array.from({length:3},(_,row)=>Array.from({length:game.columns},(_,col)=>keys[(row*game.columns+col+2)%keys.length])),wheelMultiplier:4,finalWin:'0.00',winLines:[]};
 }
 return {scene,time,frames,draws,clips,sounds,globals,bounds,render,advance,result,symbols,setReduced:value=>{reduced=value;}};
}

const plain=value=>JSON.parse(JSON.stringify(value));
const layoutOf=text=>text.slice(text.indexOf(' layout(){'),text.indexOf(' draw(){'));

test('desktop reels follow the fresh observed three-column and five-column proportions',()=>{
 for(const game of games){const f=fixture(game),l=f.scene.layout();assert.equal(l.land,true);assert.equal(l.x,f.bounds.width*(game.columns===3?.316:.243));assert.equal(l.w,f.bounds.width*(game.columns===3?.466:.5));assert.ok(l.x+l.w<f.bounds.width);assert.ok(l.y+l.h<f.bounds.height);}
});

for(const game of games)test(`${game.name}: reel sprites move vertically between frames inside the viewport`,()=>{
 const f=fixture(game);f.scene.start();
 const before=f.render(),first=before.find(draw=>draw.name===`Box/${Object.values(game.symbols)[0]}`)||before.find(draw=>draw.name===`BlurBox/${Object.values(game.symbols)[0]}`);
 assert.ok(first);
 f.time.now=16;const after=f.render(),same=after.find(draw=>draw.name===first.name&&Math.abs(draw.x-first.x)<.001);
 assert.ok(same);assert.ok(same.y>first.y,'same symbol advances downward within 16 ms');
 const layout=f.scene.layout(),inset=game.columns===3?2:4;
 assert.ok(same.y-first.y<(layout.h-inset*2)/3,'movement is a fraction of a cell');
 assert.ok(f.clips.some(rect=>rect[0]===layout.x+inset&&rect[1]===layout.y+inset&&rect[2]===layout.w-inset*2&&rect[3]===layout.h-inset*2));
 assert.equal(f.frames.size,1);
});

test('STOP before a receipt keeps the pending reels moving and leaves the recorded result unchanged',()=>{
 const f=fixture(),grid=plain(f.scene.grid),multiplier=f.scene.multiplier;
 f.scene.start();f.time.now=80;const before=f.scene.distance(f.scene.reels[0]);
 f.scene.stop();assert.equal(f.scene.distance(f.scene.reels[0]),before);
 f.time.now=96;assert.ok(f.scene.distance(f.scene.reels[0])>before);
 for(let i=0;i<12;i++){f.scene.stop();f.scene.loop();}
 assert.equal(f.scene.spinning,true);assert.equal(f.scene.pendingResult,null);
 assert.deepEqual(plain(f.scene.grid),grid);assert.equal(f.scene.multiplier,multiplier);
 assert.equal(f.frames.size,1);assert.equal(f.sounds.length,0);
});

for(const game of games)test(`${game.name}: only a supplied receipt settles reels, in sequence, to its exact grid`,async()=>{
 const f=fixture(game),before=plain(f.scene.grid),receipt=f.result();let completed=false;
 f.scene.start();f.advance(1000);
 const done=f.scene.present(receipt).then(value=>{completed=true;return value;});
 await Promise.resolve();assert.equal(completed,false);assert.deepEqual(plain(f.scene.grid),before);
 f.advance(1450);assert.equal(f.scene.settled,1);assert.equal(f.scene.spinning,true);
 assert.deepEqual(plain(f.scene.reels[0].target),receipt.grid.map(row=>row[0]));
 f.advance(1570);assert.equal(f.scene.settled,2);assert.equal(completed,false);
 f.advance(2000);assert.equal(await done,true);assert.equal(f.scene.spinning,false);
 assert.deepEqual(plain(f.scene.grid),receipt.grid);assert.equal(f.scene.multiplier,receipt.wheelMultiplier);
 assert.equal(f.sounds.length,game.columns);assert.equal(f.frames.size,0);
});

test('STOP during settling preserves position and the supplied destination while shortening completion',async()=>{
 const f=fixture(games[1]);f.scene.start();f.advance(1100);const receipt=f.result(),done=f.scene.present(receipt);
 f.advance(1150);
 const positions=f.scene.reels.map(reel=>f.scene.distance(reel)),destinations=f.scene.reels.map(reel=>reel.endDistance);
 f.scene.stop();
 assert.deepEqual(f.scene.reels.map(reel=>f.scene.distance(reel)),positions);
 assert.deepEqual(f.scene.reels.map(reel=>reel.endDistance),destinations);
 f.advance(1166);const continued=f.scene.reels.map(reel=>f.scene.distance(reel));
 continued.forEach((value,index)=>assert.ok(value>=positions[index]));
 f.scene.stop();assert.deepEqual(f.scene.reels.map(reel=>f.scene.distance(reel)),continued);
 f.advance(1400);assert.equal(await done,true);assert.deepEqual(plain(f.scene.grid),receipt.grid);
 assert.equal(f.scene.multiplier,receipt.wheelMultiplier);assert.equal(f.frames.size,0);
});

test('STOP near completion never lengthens a reel deadline',async()=>{
 const f=fixture();f.scene.start();f.advance(1000);const done=f.scene.present(f.result());
 f.advance(1400);const deadlines=f.scene.reels.map(reel=>reel.stopAt+reel.duration);
 f.scene.stop();f.scene.reels.forEach((reel,index)=>assert.ok(reel.stopAt+reel.duration<=deadlines[index]));
 f.advance(1600);await done;
});

test('reduced motion waits for a receipt, then displays it without moving strips',async()=>{
 const f=fixture();f.setReduced(true);const before=plain(f.scene.grid);f.scene.start();f.scene.stop();
 assert.equal(f.scene.spinning,true);assert.equal(f.frames.size,0);assert.deepEqual(plain(f.scene.grid),before);
 const first=f.render();f.time.now=200;assert.deepEqual(f.render(),first);
 const receipt=f.result();assert.equal(await f.scene.present(receipt),true);
 assert.deepEqual(plain(f.scene.grid),receipt.grid);assert.equal(f.scene.spinning,false);assert.equal(f.frames.size,0);
});

test('enabling reduced motion during a verified presentation settles without another moving frame',async()=>{
 const f=fixture();f.scene.start();f.advance(300);const receipt=f.result(),done=f.scene.present(receipt);
 f.setReduced(true);f.advance(316);assert.equal(await done,true);
 assert.deepEqual(plain(f.scene.grid),receipt.grid);assert.equal(f.frames.size,0);
});

test('reduced motion leaves a verified win readable without a decorative RAF loop',async()=>{
 const f=fixture();f.setReduced(true);f.scene.logoUntil=5600;
 const receipt={...f.result(),finalWin:'1.00',winLines:[{positions:[[0,0],[0,1],[0,2]]}]};
 assert.equal(await f.scene.present(receipt),true);assert.equal(f.scene.win.finalWin,'1.00');assert.equal(f.frames.size,0);
 assert.doesNotThrow(()=>f.render());
});

test('hidden page freezes its presentation clock, retains an arriving receipt, and resumes with one RAF',async()=>{
 const f=fixture();f.scene.start();f.advance(250);const distance=f.scene.distance(f.scene.reels[0]);
 f.globals.document.hidden=true;f.scene.pause();f.time.now=2250;
 assert.equal(f.scene.distance(f.scene.reels[0]),distance);assert.equal(f.frames.size,0);
 let completed=false;const receipt=f.result(),done=f.scene.present(receipt).then(value=>{completed=true;return value;});
 f.time.now=10000;f.scene.loop();assert.equal(f.frames.size,0);assert.equal(f.scene.distance(f.scene.reels[0]),distance);
 await Promise.resolve();assert.equal(completed,false);
 f.globals.document.hidden=false;f.scene.loop();f.scene.loop();
 assert.equal(f.frames.size,1);assert.equal(f.scene.distance(f.scene.reels[0]),distance);
 f.advance(11500);assert.equal(await done,true);assert.deepEqual(plain(f.scene.grid),receipt.grid);
});

test('resize changes geometry without resetting normalized reel motion',()=>{
 const f=fixture();f.scene.start();f.advance(35);const distance=f.scene.distance(f.scene.reels[0]);
 f.bounds.width=420;f.bounds.height=820;f.scene.resize();
 assert.equal(f.scene.distance(f.scene.reels[0]),distance);assert.equal(f.scene.width,420);assert.equal(f.scene.height,820);
 assert.equal(f.frames.size,1);assert.equal(f.scene.spinning,true);
});

test('null artwork, suspended pages, and disposal keep lifecycle callbacks harmless',()=>{
 const f=fixture();f.globals.art=null;f.draws.length=0;f.scene.resize();assert.equal(f.draws.length,0);
 f.globals.pageSuspended=true;f.scene.start();assert.equal(f.frames.size,0);
 f.globals.pageSuspended=false;f.globals.disposed=true;f.scene.loop();f.scene.resize();assert.equal(f.frames.size,0);assert.equal(f.draws.length,0);
});

test('invalid or conflicting receipt data never replaces a pending result',async()=>{
 const f=fixture(),before=plain(f.scene.grid);f.scene.start();
 await assert.rejects(f.scene.present({...f.result(),grid:[null,[],[]]}),/INVALID_PRESENTATION_GRID/);
 await assert.rejects(f.scene.present({...f.result(),grid:[["not-a-symbol","not-a-symbol","not-a-symbol"],...f.result().grid.slice(1)]}),/INVALID_PRESENTATION_GRID/);
 assert.deepEqual(plain(f.scene.grid),before);assert.equal(f.scene.pendingResult,null);
 const receipt=f.result(),done=f.scene.present(receipt);
 await assert.rejects(f.scene.present(f.result('different-round')),/PRESENTATION_IN_PROGRESS/);
 assert.equal(f.scene.pendingResult.roundId,receipt.roundId);f.scene.stop();f.advance(300);await done;
});

test('recovered receipt can present without start and its grid remains immutable',async()=>{
 const f=fixture(),receipt=f.result();Object.freeze(receipt.grid);for(const row of receipt.grid)Object.freeze(row);Object.freeze(receipt);
 const done=f.scene.present(receipt);assert.equal(f.scene.spinning,true);f.scene.stop();f.advance(300);await done;
 assert.deepEqual(plain(f.scene.grid),receipt.grid);assert.notEqual(f.scene.grid,receipt.grid);assert.notEqual(f.scene.grid[0],receipt.grid[0]);
});

test('a subsequent state refresh draws its own grid instead of cached settled symbols',async()=>{
 const f=fixture();f.setReduced(true);await f.scene.present(f.result());
 const symbol=Object.keys(games[0].symbols).at(-1);f.scene.grid=Array.from({length:3},()=>Array(3).fill(symbol));
 const drawn=f.render();assert.equal(drawn.length,9);assert.ok(drawn.every(draw=>draw.name===`Box/${games[0].symbols[symbol]}`));
});

test('cancel releases a presentation without changing grid or multiplier and cancels its RAF',async()=>{
 const f=fixture(),before=plain(f.scene.grid),multiplier=f.scene.multiplier;f.scene.start();const done=f.scene.present(f.result());
 f.scene.cancel();assert.equal(await done,false);assert.equal(f.scene.spinning,false);assert.equal(f.frames.size,0);
 assert.deepEqual(plain(f.scene.grid),before);assert.equal(f.scene.multiplier,multiplier);
});
