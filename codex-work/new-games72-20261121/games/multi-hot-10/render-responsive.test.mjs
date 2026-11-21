import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MultiHot10Renderer, PORTRAIT_LAYOUT, presentationLayout, SYMBOL_FRAMES } from './render/renderer.mjs';
import { STAGE, GRID } from './render/layout.mjs';
import { GAME_ID } from './evaluator.mjs';

// Synthetic presentation data exercises renderer state only. It is not a
// legal-outcome fixture, probability model, account or wallet receipt.
const view = (n = 1) => ({ gameId: GAME_ID, requestKey: `display-request-${n}`, roundId: `display-round-${n}`,
  bet: '0.10', winAmount: '0.80', multiplier: 4,
  grid: [Array(5).fill('seven'), ['bell','lemon','orange','plum','cherry'], ['cherry','plum','lemon','bell','orange']] });
function fixture({ width = STAGE.width, height = STAGE.height, defaultFrames = false } = {}) {
  let time = 0; const calls = [], sprites = [], events = [], properties = new Map();
  const context = { globalAlpha: 1 };
  for (const name of ['save','restore','translate','scale','rotate','drawImage','setTransform','clearRect','fillRect','fillText','beginPath','rect','clip','moveTo','lineTo','closePath']) {
    context[name] = (...args) => calls.push([name,...args]);
  }
  const parentElement = { dataset: {}, style: { setProperty: (name, value) => properties.set(name,value) } };
  const canvas = { parentElement, getContext: () => context, getBoundingClientRect: () => ({width,height}) };
  const frame = { sourceSize: { w: 500, h: 500 }, spriteSourceSize: { x: 140, y: 132, w: 225, h: 264 } };
  const atlas = { draw: (_ctx,...args) => sprites.push(args), has: () => false, frames: { get: () => frame } };
  const renderer = new MultiHot10Renderer(canvas, atlas, { now: () => time, onEvent: event => events.push(event),
    ...(defaultFrames ? {} : {requestFrame: () => 1,cancelFrame: () => {}}) });
  return { renderer,canvas,calls,sprites,events,properties,
    at(value) { time=value; return value; },
    resize(w,h) { width=w;height=h;renderer.resize(); } };
}

 test('a retained winning view can be the first render after reload without NaN or repeated result events', () => {
  const f=fixture(); const receipt=view();
  assert.equal(f.renderer.present(receipt,{animate:false}),true);
  assert.doesNotThrow(() => f.renderer.update({controls:{round:receipt,winVisible:true,settings:{effects:true,music:true},selectedBet:'0.10'}}));
  f.renderer.draw(f.at(2000));
  assert.equal(f.renderer.snapshot.phase,'IDLE');
  assert.deepEqual(f.renderer.snapshot.grid,receipt.grid);
  assert.equal(f.renderer.snapshot.roundId,receipt.roundId);
  assert.ok(Number.isFinite(f.renderer.settleAt));
  assert.ok(f.calls.flatMap(row=>row.slice(1)).filter(value=>typeof value==='number').every(Number.isFinite));
  assert.deepEqual(f.events,[]);
  f.renderer.dispose();
});

test('default animation frame functions retain the global host receiver for scheduling and cancellation', t => {
  const previousFrame=Object.getOwnPropertyDescriptor(globalThis,'requestAnimationFrame');
  const previousCancel=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame');
  const calls=[];
  Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:function(callback){
    assert.equal(this,globalThis,'frame scheduler host receiver'); assert.equal(typeof callback,'function'); calls.push('request'); return 17;
  }});
  Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:function(id){
    assert.equal(this,globalThis,'frame cancellation host receiver'); assert.equal(id,17); calls.push('cancel');
  }});
  t.after(()=>{ for (const [key,desc] of [['requestAnimationFrame',previousFrame],['cancelAnimationFrame',previousCancel]]) {
    if(desc) Object.defineProperty(globalThis,key,desc); else delete globalThis[key];
  }});
  const f=fixture({defaultFrames:true});
  f.renderer.beginSpin('display-request-1');f.renderer.dispose();
  assert.deepEqual(calls,['request','cancel']);
});

for(const width of [360,390,430]) test(`portrait ${width}px shares visible control rectangles with >=44px hitboxes`,()=>{
  const height=width*660/360, f=fixture({width,height});
  assert.equal(f.renderer.snapshot.layout,'portrait');
  assert.equal(f.canvas.parentElement.dataset.layout,'portrait');
  const rects=[];
  for(const [name,r] of Object.entries(PORTRAIT_LAYOUT.controls)){
    const actual={x:parseFloat(f.properties.get(`--m10-${name}-x`))/100*width,
      y:parseFloat(f.properties.get(`--m10-${name}-y`))/100*height,
      width:parseFloat(f.properties.get(`--m10-${name}-width`))/100*width,
      height:parseFloat(f.properties.get(`--m10-${name}-height`))/100*height};
    assert.ok(actual.width>=44-1e-9&&actual.height>=44-1e-9,name);
    assert.ok(actual.x>=0&&actual.y>=0&&actual.x+actual.width<=width+1e-9&&actual.y+actual.height<=height+1e-9,name);
    assert.ok(Math.abs(actual.x-r.x*width/360)<1e-9,name);
    rects.push({name,...actual});
  }
  for(let i=0;i<rects.length;i++) for(let j=i+1;j<rects.length;j++) {
    const a=rects[i],b=rects[j];
    assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${a.name}/${b.name}`);
  }
  const scene=PORTRAIT_LAYOUT.scene, scale=scene.width/scene.sourceWidth;
  assert.ok(GRID.cell*scale*width/360>=64,'portrait reel cells remain readable');
  assert.ok(scene.y+(GRID.y+GRID.height-scene.sourceY)*scale<400,'reels remain above the caption/footer');
  f.renderer.dispose();
});

test('the portrait CSS uses the same per-control geometry and does not shrink the stage to short height',()=>{
  const css=readFileSync(new URL('./style.css',import.meta.url),'utf8');
  for(const name of Object.keys(PORTRAIT_LAYOUT.controls)) for(const key of ['x','y','width','height']) {
    assert.ok(css.includes(`var(--m10-${name}-${key})`),`${name}/${key}`);
  }
  assert.match(css,/@media\s*\(max-width:\s*600px\)\s*and\s*\(orientation:\s*portrait\)/);
  assert.match(css,/\.m10-stage\s*\{\s*width:\s*100vw;\s*aspect-ratio:\s*6\s*\/\s*11;/);
  assert.equal(presentationLayout(1280,720),STAGE);
});

test('canvas resolution is bounded to two device pixels while preserving viewport geometry',t=>{
  const old=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
  Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,value:3.5});
  t.after(()=>{if(old)Object.defineProperty(globalThis,'devicePixelRatio',old);else delete globalThis.devicePixelRatio;});
  const f=fixture({width:390,height:715});assert.equal(f.canvas.width,780);assert.equal(f.canvas.height,1430);f.renderer.dispose();
});

test('stationary and moving symbols retain the same logical draw size and reel clipping',()=>{
  const f=fixture({width:390,height:715});
  const stationary=f.sprites.filter(row=>Object.values(SYMBOL_FRAMES).includes(row[0]));
  assert.equal(stationary.length,15);
  f.sprites.length=0;f.calls.length=0;
  f.renderer.beginSpin('display-request-1');f.renderer.draw(f.at(500));
  const moving=f.sprites.filter(row=>row[0].startsWith('Box/Blur/'));
  assert.ok(moving.length>=45);
  for(const row of [...stationary,...moving]) assert.deepEqual(row.slice(3,5),[318,318]);
  const clips=f.calls.filter(row=>row[0]==='rect'&&row[3]===GRID.cell&&row[4]===GRID.height);
  assert.equal(clips.length,5);
  f.renderer.dispose();
});

test('an accepted settling result cannot be replaced by another view and survives orientation change',()=>{
  const f=fixture({width:390,height:715});
  f.renderer.beginSpin('display-request-1');f.renderer.present(view());
  assert.equal(f.renderer.present(view(2)),false);
  assert.equal(f.renderer.present({...view(2),requestKey:'display-request-1'}),false);
  f.resize(1280,720);assert.equal(f.renderer.snapshot.layout,'landscape');
  f.renderer.draw(f.at(3000));
  assert.equal(f.renderer.snapshot.roundId,'display-round-1');assert.deepEqual(f.renderer.snapshot.grid,view().grid);
  assert.equal(f.events.filter(event=>event.type==='round-presented').length,1);
  f.renderer.dispose();
});

test('a late receipt and STOP preserve the currently displayed wheel angle without selecting another outcome',()=>{
  const f=fixture();f.renderer.beginSpin('display-request-1');
  f.at(1300);const before=f.renderer._wheelAngle(1300);
  f.renderer.present(view());assert.ok(Math.abs(before-f.renderer._wheelAngle(1300))<1e-9);
  f.at(1650);const beforeStop=f.renderer._wheelAngle(1650);
  assert.equal(f.renderer.requestStop(),true);
  assert.ok(Math.abs(beforeStop-f.renderer._wheelAngle(1650))<1e-9);
  f.renderer.draw(f.at(1951));
  assert.equal(f.renderer.snapshot.phase,'IDLE');assert.equal(f.renderer.snapshot.multiplier,view().multiplier);
  assert.deepEqual(f.renderer.snapshot.grid,view().grid);
  assert.equal(f.events.filter(event=>event.type==='spin-start').length,1);
  f.renderer.dispose();
});
