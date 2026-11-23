import test from 'node:test';
import assert from 'node:assert/strict';
import {createReelMotion} from './reel-motion.mjs';
import {drawSprite,cabinetLayout} from './sprite-renderer.mjs';
const round={requestId:'original',grid:Array.from({length:4},()=>[0,1,2,3,4]),wins:[]};
test('normal presentation stops each reel in order and completes exactly once',()=>{
 const events=[],motion=createReelMotion({onEvent:e=>events.push(e)});
 motion.start(round);motion.tick(1399);assert.equal(events.filter(e=>e.type==='reel-stop').length,0);
 for(let i=0;i<5;i++)motion.tick(1400+i*260);
 assert.deepEqual(events.filter(e=>e.type==='reel-stop').map(e=>e.column),[0,1,2,3,4]);
 motion.tick(2800);motion.tick(4000);assert.equal(events.filter(e=>e.type==='complete').length,1);
 assert.equal(motion.finish('foreign'),false);assert.equal(motion.finish('original'),true);
});
test('STOP accelerates the accepted grid without creating or changing its outcome',()=>{
 const motion=createReelMotion();motion.start(round);motion.stop(100);
 const state=motion.tick(1000);assert.equal(state.phase,'complete');assert.deepEqual(state.round,round);
});
test('turbo shortens presentation and pause excludes background time',()=>{
 const motion=createReelMotion();motion.start(round,{turbo:true});motion.pause(100);motion.tick(9000);
 assert.equal(motion.snapshot(9000).columns[0].stopped,false);motion.resume(9100);
 assert.equal(motion.tick(10000).phase,'complete');
});
test('overlapping or invalid presentations are refused and disposal cancels state',()=>{
 const motion=createReelMotion();assert.throws(()=>motion.start({...round,grid:[[0]]}));
 motion.start(round);assert.throws(()=>motion.start(round));motion.dispose();assert.equal(motion.tick(9999).phase,'idle');
 assert.throws(()=>motion.start(round));
});
test('cabinet and five reels fit narrow mobile and desktop widths',()=>{
 for(const width of [320,360,390,430,768,1280]){
  const p=cabinetLayout(width,800);assert.ok(p.left+p.reels.x*p.scale>=0);
  assert.ok(p.left+(p.reels.x+p.reels.w)*p.scale<=width+1e-8);
 }
});
test('rotated atlas sprites retain their unrotated trim dimensions',()=>{
 const calls=[],ctx={save(){},restore(){},translate(...a){calls.push(['translate',...a]);},
 rotate(...a){calls.push(['rotate',...a]);},drawImage(...a){calls.push(['draw',...a]);}};
 drawSprite(ctx,'image',{frame:{x:583,y:1674,w:123,h:105},rotated:true,
  trim:{x:61,y:52,w:105,h:123},sourceSize:{w:230,h:230}},0,0,230,230);
 assert.deepEqual(calls[0],['translate',61,175]);assert.deepEqual(calls[1],['rotate',-Math.PI/2]);
 assert.deepEqual(calls[2].slice(-2),[123,105]);
});
