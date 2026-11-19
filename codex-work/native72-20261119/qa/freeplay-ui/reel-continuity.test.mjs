import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {ContinuousReel} from './continuous-reels.mjs';
import {Reels} from './mh10-reels.mjs';
import {stageReelContinuity} from './apply-reel-continuity.mjs';
import {trimmedSpriteLayers} from './trimmed-sprite-layers.mjs';

const palette=['a','b','c','d','e','f','g','h','i'];
const close=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
const visible=items=>items.filter(item=>item.row>=-.001&&item.row<2.999);
const context=()=>new Proxy({}, {get(object,key){return object[key]??(object[key]=()=>{});}});
const sourceRoot=process.env.REEL_SOURCE_ROOT;
const atlasBytes=await readFile(new URL('./reel-atlas-fixtures.json',import.meta.url));
assert.equal(createHash('sha256').update(atlasBytes).digest('hex'),'76ded474e886d55b303dd2ee5956e8c458d73038528b49a5eb2c4f25c8a50a47','Captured atlas geometry fixture must match its verified source extraction.');
const atlasFixtures=JSON.parse(atlasBytes);
const stageRoot=await mkdtemp(path.join(tmpdir(),'graphics-reel-test-'));
await stageReelContinuity({sourceRoot,stageRoot});
const {Presentation}=await import(pathToFileURL(path.join(stageRoot,'mh10/presentation.mjs')));
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier==='/new74/_runtime-r3/chunks/chunk-ZJQW3LGY.mjs')return {
  url:'data:text/javascript,export const a=class{},c=class{},d=class{},h=class{},j=class{};export function k(){}',shortCircuit:true};
 return next(specifier,context);
}});
const {SafariRenderer}=await import(pathToFileURL(path.join(stageRoot,'safari/renderer.mjs')));
hooks.deregister();
test.after(()=>rm(stageRoot,{recursive:true,force:true}));

test('a cell crossing preserves symbol identity and physical position in the moving strip',()=>{
 const reel=new ContinuousReel(palette,['c','a','b']).begin(0,{speed:.018,ramp:120});
 for(const boundary of [1,2,3,8,16,40]){
  const at=60+boundary/.018;
  const before=reel.window(at-1e-6),after=reel.window(at+1e-6);
  for(const item of visible(before)){
   const match=after.find(candidate=>candidate.index===item.index);
   assert.ok(match);assert.equal(match.symbol,item.symbol);close(match.row,item.row,1e-6);
  }
 }
});

test('late targets enter from outside the mask without changing any already visible symbol',()=>{
 for(const delay of [0,37,200,5000]){
  const reel=new ContinuousReel(palette,['c','a','b']).begin(0);
  const before=reel.window(delay),state=reel.sample(delay);
  const target=['h','i','g'];reel.settle(target,delay,{duration:600});
  assert.deepEqual(reel.window(delay),before);
  const after=reel.sample(delay);close(after.phase,state.phase);close(after.velocity,state.velocity);
  const end=reel.segment.started+reel.segment.duration;
  const approaching=reel.window(end-1e-5);
  const final=reel.window(end,0,2);
  assert.deepEqual(final.map(item=>item.symbol),target);
  for(const item of final){
   const previous=approaching.find(candidate=>candidate.index===item.index);
   assert.ok(previous);assert.equal(previous.symbol,item.symbol);close(previous.row,item.row,1e-6);
  }
  close(reel.velocity,0);assert.equal(reel.mode,'stopped');
 }
});

test('STOP preserves current phase, velocity, target queue and endpoint, then moves monotonically',()=>{
 const reel=new ContinuousReel(palette,['c','a','b']).begin(0);
 reel.settle(['h','i','g'],400,{duration:1600,minTravel:18});
 const current=reel.sample(700),window=reel.window(700),endpoint=reel.segment.end,progress=reel.progress();
 reel.requestStop(700,200);
 const after=reel.sample(700);
 close(after.phase,current.phase);close(after.velocity,current.velocity);
 close(reel.progress(),progress);assert.equal(reel.segment.end,endpoint);assert.deepEqual(reel.window(700),window);
 let last=after.phase;
 for(let now=701;now<=900;now++){
  const next=reel.sample(now);assert.ok(next.phase>=last-1e-10);assert.ok(next.velocity>=0);last=next.phase;
 }
 assert.deepEqual(reel.window(900,0,2).map(item=>item.symbol),['h','i','g']);
 close(last,endpoint);close(reel.velocity,0);
});

test('Multi Hot 10 STOP no longer jumps any of the five reels at the same timestamp',()=>{
 const reels=new Reels();reels.start(Array.from({length:3},()=>Array(5).fill('seven')),0,[1500,1600,1700,1800,1900]);
 reels.tick(400);const phases=reels.offsets.slice(),velocities=reels.tracks.map(track=>track.velocity);
 reels.stop(400);reels.tick(400);
 assert.deepEqual(reels.offsets,phases);assert.deepEqual(reels.tracks.map(track=>track.velocity),velocities);
 reels.tick(400+420);assert.equal(reels.phase,'READY');
 assert.ok(reels.grid.flat().every(symbol=>symbol==='seven'));
});

test('Multi Hot 10 pending-to-landing preserves its current motion and rejects invalid layouts',()=>{
 const reels=new Reels();reels.beginPending(0);reels.tick(2400);
 const positions=reels.offsets.slice(),speeds=reels.tracks.map(track=>track.velocity);
 const target=[['seven','bell','grape','watermelon','cherry'],['orange','plum','lemon','seven','bell'],['grape','watermelon','cherry','orange','plum']];
 reels.start(target,2400,[1500,1600,1700,1800,1900]);reels.tick(2400);
 assert.deepEqual(reels.offsets,positions);assert.deepEqual(reels.tracks.map(track=>track.velocity),speeds);
 reels.tick(4400);assert.deepEqual(reels.grid,target);assert.equal(reels.phase,'READY');
 assert.throws(()=>new Reels().start([['seven']],0,[1,1,1,1,1]),/Invalid five-reel grid/);
});

test('STOP before a result preserves each reel requested duration and stagger after arrival',()=>{
 const reels=new Reels();reels.beginPending(0);reels.tick(400);reels.stop(400);
 const target=Array.from({length:3},()=>Array(5).fill('seven'));
 reels.tick(1400);const phases=reels.offsets.slice(),speeds=reels.tracks.map(track=>track.velocity);
 reels.start(target,1400,[1500,1600,1700,1800,1900]);reels.tick(1400);
 assert.deepEqual(reels.offsets,phases);assert.deepEqual(reels.tracks.map(track=>track.velocity),speeds);
 assert.deepEqual(reels.tracks.map(track=>track.segment.duration),[180,240,300,360,420]);
 assert.deepEqual(reels.plan,[180,240,300,360,420]);
 reels.tick(1580);assert.equal(reels.tracks.filter(track=>track.mode==='stopped').length,1);
 reels.tick(1820);assert.equal(reels.phase,'READY');assert.deepEqual(reels.grid,target);
});

test('captured real atlas metadata gives sharp and blur layers one scale and source origin including rotated sprites',()=>{
 for(const [game,fixture]of Object.entries(atlasFixtures)){
  for(let index=0;index<(game==='mh10'?8:9);index++){
   const sharp=fixture.frames['Box/'+index],blur=fixture.frames['Box/Blur/'+index];
   const scale=game==='mh10'?Math.min(134/sharp.frame.h,131/sharp.frame.w):Math.min(99/sharp.frame.w,84/sharp.frame.h);
   const sharpBox={x:37,y:63,width:sharp.frame.w*scale,height:sharp.frame.h*scale};
   const layers=trimmedSpriteLayers(sharp,blur,sharpBox);
   close(layers.scale,scale);
   for(const [key,metadata]of [['sharp',sharp],['blur',blur]]){
    const box=layers[key],source=metadata.spriteSourceSize;
    close(box.width/source.w,scale);close(box.height/source.h,scale);
    close(box.x-source.x*scale,layers.origin.x);close(box.y-source.y*scale,layers.origin.y);
   }
   for(const key of ['x','y','width','height'])close(layers.sharp[key],sharpBox[key]);
  }
 }
 const sharp=atlasFixtures.mh10.frames['Box/0'],blur=atlasFixtures.mh10.frames['Box/Blur/0'];
 assert.equal(blur.rotated,true);
 const layers=trimmedSpriteLayers(sharp,blur,{x:0,y:0,width:225,height:264});
 assert.deepEqual(layers.sharp,{x:0,y:0,width:225,height:264});
 assert.deepEqual(layers.blur,{x:1,y:-9,width:224,height:278});
 const safari=trimmedSpriteLayers(atlasFixtures.safari.frames['Box/0'],atlasFixtures.safari.frames['Box/Blur/0'],{x:0,y:0,width:133,height:150});
 assert.deepEqual(safari.blur,{x:1,y:-11,width:132,height:173});
});

function mh10View(){
 const draws=[],view=Object.create(Presentation.prototype);
 Object.assign(view,{ctx:context(),canvas:{width:1280,height:720},geometry:null,
  art:{image:()=>({width:1280,height:720}),atlas:{frames:atlasFixtures.mh10.frames},
   sprite:(_ctx,key,x,y,width,height)=>draws.push({key,x,y,width,height})},
  reels:new Reels(),wheelStart:2,model:{wheel:2,win:'0.00',enabled:true,bet:'-',balance:'-',currency:'',sound:false,turbo:false}});
 return {view,frame(time){draws.length=0;view.reels.tick(time);view.draw(time);return draws.filter(draw=>/^Box\/(?:Blur\/)?\d+$/.test(draw.key)&&draw.y+draw.height/2>=204&&draw.y+draw.height/2<577);}};
}
test('the actual copied Multi Hot 10 draw method starts from existing icons and lands on supplied icons',()=>{
 const {view,frame}=mh10View();const previous=frame(0);
 const target=Array.from({length:3},()=>Array(5).fill('seven'));
 view.reels.start(target,0,[1000,1000,1000,1000,1000]);
 assert.deepEqual(frame(0),previous);
 const approaching=frame(1000-1e-5).filter(draw=>!draw.key.includes('Blur'));
 const final=frame(1000);
 assert.equal(final.length,15);assert.ok(final.every(draw=>draw.key==='Box/0'));
 for(const item of final){const before=approaching.find(candidate=>candidate.key===item.key&&Math.abs(candidate.x-item.x)<1e-9&&Math.abs(candidate.y-item.y)<.001);assert.ok(before);}
});

function safariView(){
 const view=Object.create(SafariRenderer.prototype),draws=[],stops=[];
 Object.assign(view,{ctx:context(),width:960,height:540,portrait:false,presentationClock:0,roundEpoch:0,busy:false,quick:false,
  grid:[['j','q','k'],['a','zebra','elephant'],['tiger','lion','smartsoft']],wheel:5,win:'0.00',balance:'-',bet:'-',
  bank:{images:{get:()=>({width:960,height:540})},atlas:{files:{'background.jpg':'background.jpg'},frames:atlasFixtures.safari.frames}},
  animation:{drawBackground(){},drawExpansions(){},expansion:[],setExpansions(value){this.expansion=value;}},
  controls:new Proxy({}, {get:()=>[0,0,1,1]}),onReelStop:col=>stops.push(col),drawMultiplier(){},label(){},drawHeader(){},
  sprite(key,x,y,width,height){draws.push({key,x,y,width,height});}});
 return {view,stops,frame(time){view.presentationClock=time;draws.length=0;view.draw(time);return draws.filter(draw=>/^Box\/(?:Blur\/)?\d+$/.test(draw.key)&&draw.y+draw.height/2>=100&&draw.y+draw.height/2<365);}};
}
test('the actual copied Safari draw method no longer replaces icons at 80 ms',()=>{
 const {view,frame}=safariView();view.start();
 const before=frame(80-1e-6),after=frame(80+1e-6);
 assert.equal(before.length,after.length);
 for(let index=0;index<before.length;index++){
  assert.equal(after[index].key,before[index].key);close(after[index].y,before[index].y,.001);
 }
});

test('copied draw methods use the real atlas source origin across sharp and blur layers',()=>{
 const mh=mh10View();mh.view.reels.beginPending(0);
 const safari=safariView();safari.view.start();
 for(const [game,draws]of [['mh10',mh.frame(50)],['safari',safari.frame(80)]]){
  const sharp=draws.find(draw=>!draw.key.includes('Blur/'));
  assert.ok(sharp);
  const blur=draws.find(draw=>draw.key===sharp.key.replace('Box/','Box/Blur/')&&Math.abs(draw.x-sharp.x)<10&&Math.abs(draw.y-sharp.y)<15);
  assert.ok(blur);
  const sharpMeta=atlasFixtures[game].frames[sharp.key].spriteSourceSize;
  const blurMeta=atlasFixtures[game].frames[blur.key].spriteSourceSize;
  const scale=sharp.width/sharpMeta.w;
  close(blur.width/blurMeta.w,scale);close(blur.height/blurMeta.h,scale);
  close(blur.x-blurMeta.x*scale,sharp.x-sharpMeta.x*scale);
  close(blur.y-blurMeta.y*scale,sharp.y-sharpMeta.y*scale);
 }
});

test('Safari STOP before the fixture arrives keeps staggered 200, 260 and 320 ms landings',async()=>{
 const {view,frame,stops}=safariView();view.start();frame(400);view.stop();frame(1400);
 const result={grid:[['lion','j','q'],['smartsoft','k','a'],['zebra','tiger','elephant']],wheelMultiplier:3,finalWin:'0.00',winLines:[]};
 const completion=view.reveal(result);
 assert.deepEqual(view.reelTracks.map(track=>track.segment.duration),[200,260,320]);
 frame(1600);assert.deepEqual(stops,[1]);frame(1660);assert.deepEqual(stops,[1,2]);frame(1720);
 await completion;assert.deepEqual(stops,[1,2,3]);assert.deepEqual(view.grid,result.grid);
});

test('Safari late arrival and STOP land through the same visible symbol queue with exactly three stop events',async()=>{
 const {view,frame,stops}=safariView();view.start();frame(900);
 const current=view.reelTracks.map(track=>track.sample(900));
 const result={grid:[['lion','j','q'],['smartsoft','k','a'],['zebra','tiger','elephant']],wheelMultiplier:3,finalWin:'0.00',winLines:[]};
 const resultCopy=structuredClone(result),completion=view.reveal(result);
 view.reelTracks.forEach((track,index)=>{const after=track.sample(900);close(after.phase,current[index].phase);close(after.velocity,current[index].velocity);});
 frame(1100);const beforeStop=view.reelTracks.map(track=>track.sample(1100));view.stop();
 view.reelTracks.forEach((track,index)=>{const after=track.sample(1100);close(after.phase,beforeStop[index].phase);close(after.velocity,beforeStop[index].velocity);});
 const end=Math.max(...view.reelTracks.map(track=>track.segment.started+track.segment.duration));
 for(let time=1116;time<end;time+=16)frame(time);
 const approaching=frame(end-1e-5).filter(draw=>!draw.key.includes('Blur'));
 const final=frame(end);await completion;
 assert.deepEqual(stops,[1,2,3]);assert.deepEqual(view.grid,result.grid);assert.deepEqual(result,resultCopy);assert.equal(view.busy,false);
 for(const item of final){const previous=approaching.find(candidate=>candidate.key===item.key&&Math.abs(candidate.x-item.x)<1e-9&&Math.abs(candidate.y-item.y)<.001);assert.ok(previous);}
});

test('staged renderer excludes the account application and settlement transport',async()=>{
 const renderer=await readFile(path.join(stageRoot,'safari/renderer.mjs'),'utf8');
 assert.doesNotMatch(renderer,/sessionTransport|fresh-state|\/api\/|localStorage|new ce\(/);
 const files=(await readFile(new URL('./reel-continuity-stage.json',import.meta.url),'utf8'));
 assert.doesNotMatch(files,/session\.mjs|wallet\.mjs|app\.mjs/);
});
