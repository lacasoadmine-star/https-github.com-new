// Isolated presentation fixture. No transport, authentication or wallet is installed.
// The deployed class body is executed unchanged; only ES module linkage is replaced.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ReelMotion,Particles} from './baseline/motion.mjs';

export const root = fileURLToPath(new URL('./', import.meta.url));
export const manifest = JSON.parse(fs.readFileSync(new URL('./baseline/mh5deluxe-art.json', import.meta.url), 'utf8'));
export const entries = new Map(Object.values(manifest.sprites).map(entry => [entry.name, entry]));
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const symbolImages = JSON.parse(fs.readFileSync(new URL('./baseline/symbol-images.json', import.meta.url), 'utf8'));
if (symbolImages.schema !== 'zplay/deluxe-symbol-png-fixtures/v1' || symbolImages.encoding !== 'base64') throw Error('INVALID_SYMBOL_FIXTURES');
export const rendererPath = kind => new URL(`./${kind}/mh5deluxe-renderer.mjs`, import.meta.url);

export function loadRenderer(kind = 'candidate') {
  if (!['baseline','candidate'].includes(kind)) throw Error('UNKNOWN_FIXTURE_SOURCE');
  const source = fs.readFileSync(rendererPath(kind), 'utf8');
  const imports = source.match(/^import .*;$/gm);
  if (imports?.length !== 3) throw Error('UNEXPECTED_MODULE_LINKAGE');
  const executable = source.replace(/^import .*;$/gm, '')
    .replace('import.meta.url', JSON.stringify(rendererPath(kind).href))
    .replace('export class MultiHot5DeluxeRenderer', 'class MultiHot5DeluxeRenderer')
    + '\nglobalThis.Renderer = MultiHot5DeluxeRenderer;';
  const context = vm.createContext({
    URL, ReelMotion, Particles, performance,
    gridFromStops: () => {throw Error('FIXTURE_CONSTRUCTOR_NOT_USED');},
    createNativeAnimation: () => {throw Error('FIXTURE_ANIMATION_LOADER_NOT_USED');},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
  });
  new vm.Script(executable, {filename: rendererPath(kind).pathname}).runInContext(context);
  return context.Renderer;
}

function intersect(a, b) {
  if (!a) return {...b};
  const x = Math.max(a.x,b.x), y = Math.max(a.y,b.y);
  return {x,y,w:Math.max(0,Math.min(a.x+a.w,b.x+b.w)-x),h:Math.max(0,Math.min(a.y+a.h,b.y+b.h)-y)};
}

export function recordingContext() {
  const draws=[], stack=[];
  let clip=null, path=null;
  return {
    draws,
    setTransform() {},
    save() {stack.push(clip && {...clip});},
    restore() {clip=stack.pop() ?? null;},
    beginPath() {path=null;},
    rect(x,y,w,h) {path={x,y,w,h};},
    clip() {if (!path) throw Error('RECTANGULAR_CLIP_EXPECTED');clip=intersect(clip,path);},
    moveTo() {}, lineTo() {}, stroke() {},
    drawImage(image,...args) {
      if (!image) throw Error('FIXTURE_IMAGE_MISSING');
      let source, destination;
      if (args.length===4) {
        source={x:0,y:0,w:image.width,h:image.height};
        destination={x:args[0],y:args[1],w:args[2],h:args[3]};
      } else if (args.length===8) {
        source={x:args[0],y:args[1],w:args[2],h:args[3]};
        destination={x:args[4],y:args[5],w:args[6],h:args[7]};
      } else throw Error('UNSUPPORTED_DRAW_IMAGE_ARITY');
      const bounds=entries.get(image.name)?.visibleBounds || source;
      const cropped=intersect(source,bounds), sx=destination.w/source.w, sy=destination.h/source.h;
      const visible={x:destination.x+(cropped.x-source.x)*sx,y:destination.y+(cropped.y-source.y)*sy,w:cropped.w*sx,h:cropped.h*sy};
      draws.push({name:image.name,source,destination,visible,clip:clip && {...clip},painted:clip?intersect(clip,visible):visible});
    },
  };
}

export function fixture({kind='candidate',symbol=0,state='idle',elapsed=500,turbo=false,reducedMotion=false,grid=null}={}) {
  const Renderer=loadRenderer(kind), renderer=Object.create(Renderer.prototype), ctx=recordingContext();
  const sprites=new Map();
  for (const [name,entry] of entries) sprites.set(name,{name,width:entry.sourceSize.w,height:entry.sourceSize.h});
  const symbolName=`symbol_${symbol}`;
  const staticGrid=grid || Array.from({length:3},()=>Array(3).fill(symbolName));
  const audioEvents=[];
  Object.assign(renderer,{
    canvas:{width:420,height:900},ctx,
    game:{id:'multi_hot_5_deluxe_native',strips:Array.from({length:3},()=>[symbolName,symbolName,symbolName])},
    machineId:'multi_hot_5_deluxe_native',
    sprites, spriteBounds:new Map([...entries].map(([k,e])=>[k,e.visibleBounds||e.spriteSourceSize])),
    atlas:new Map(Array.from({length:9},(_,i)=>[`symbol_${i}`,sprites.get(`Box/${i}`)])),
    symbolAnimations:new Map(),
    grid:staticGrid,wheel:1,result:{grid:staticGrid,stops:[0,0,0],wheelMultiplier:1,winLines:[],bet:'1.00',finalWin:'0.00'},
    background:{name:'fixture-background',width:420,height:900},logo:{draw(){}},
    stats:{frames:0,draws:0,slowFrames:0,maxDelta:0},
    pendingSpin:state==='pending'?{elapsed}:null,presentedAt:0,reducedMotion,
    motion:new ReelMotion({duration:950,stagger:190,startStagger:100,travel:12,wheelEnd:950},3),
    particles:new Particles(),
    audio:{event:(...args)=>audioEvents.push(args),stop:(...args)=>audioEvents.push(['stop',...args]),setTurbo() {},setFastStop() {}},
    audioEvents,
  });
  if (state==='settling') {renderer.motion.begin([0,0,0],1,0);renderer.motion.elapsed=elapsed;}
  renderer.setTurbo(turbo);
  return renderer;
}

export function symbolDraws(renderer, now=2000) {
  renderer.ctx.draws.length=0;
  renderer.draw(now);
  return renderer.ctx.draws.filter(draw=>/^Box\/(?:Blur\/)?\d$/.test(draw.name));
}

export function verifyPinnedInputs() {
  const pins={
    'mh5deluxe-renderer.mjs':['73c5c1150c90f604576c53eff055e369a19dba52afe9d44384d0f4a203bdc195',10529],
    'mh5deluxe-art.json':['441fdce8878e3d0041030cc20d9e4afe7571709bfb1f1967d91ef59bd5c0a7a9',65210],
    'motion.mjs':['c1661afbdd8bbef6d50677fef898e29cca053984094beaf352341c51696708a6',2134],
    'official-audio-controls.mjs':['c553cfccee541a5a4f439f602285e5593000068264a335610c329d417195ffeb',2728],
  };
  for (const [name,[hash,size]] of Object.entries(pins)) {
    const bytes=fs.readFileSync(new URL(`./baseline/${name}`, import.meta.url));
    if (bytes.length!==size || sha256(bytes)!==hash) throw Error(`PIN_MISMATCH:${name}`);
  }
  for (const [name,entry] of entries) {
    if (!name.startsWith('Box/')) continue;
    const encoded=symbolImages.files[entry.path];
    if(typeof encoded!=='string') throw Error(`SPRITE_FIXTURE_MISSING:${name}`);
    const bytes=Buffer.from(encoded,'base64');
    if (bytes.length!==entry.bytes || sha256(bytes)!==entry.sha256) throw Error(`SPRITE_PIN_MISMATCH:${name}`);
    if (bytes.readUInt32BE(16)!==entry.sourceSize.w || bytes.readUInt32BE(20)!==entry.sourceSize.h) throw Error(`PNG_DIMENSION_MISMATCH:${name}`);
  }
  return true;
}
