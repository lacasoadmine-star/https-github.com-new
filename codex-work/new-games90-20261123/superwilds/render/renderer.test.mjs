import test from 'node:test';
import assert from 'node:assert/strict';
import {SuperWildsRenderer,validateReceipt,SUPERWILDS_PAYLINES} from './renderer.mjs';
import {superWildsLayout,reelRectangles} from './layout.mjs';
import {drawSymbol,drawCloverBackground,SYMBOLS} from './artwork.mjs';

const receipt=(roundId='round-1')=>({roundId,multiplier:3,grid:Array.from({length:5},()=>['lemon','bell','orange']),winMinor:300,balanceMinor:5000,betMinor:10,winningLines:[{rows:[1,1,1,1,1],winMinor:300}]});
const canvas=()=>({width:390,height:780,clientWidth:390,clientHeight:780,style:{},getContext:()=>null});
const create=()=>{const events=[],renderer=new SuperWildsRenderer({canvas:canvas(),now:()=>0,onEvent:event=>events.push(event)});return{renderer,events};};
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;

test('accepted receipts are copied and frozen; original mutation never changes a financial view',()=>{
  const{renderer}=create(),source=receipt();renderer.acceptReceipt(source);source.grid[0][0]='seven';source.winMinor=999999;
  assert.equal(renderer.snapshot().receipt.grid[0][0],'lemon');assert.equal(renderer.snapshot().receipt.winMinor,300);
  assert.throws(()=>{renderer.snapshot().receipt.grid[0][0]='plum';},TypeError);
});
test('same receipt delivery is ignored while changed receipt with same round ID is rejected',()=>{
  const{renderer}=create();assert.equal(renderer.acceptReceipt(receipt()),true);assert.equal(renderer.acceptReceipt(receipt()),false);
  const changed=receipt();changed.multiplier=4;assert.throws(()=>renderer.acceptReceipt(changed),/CONFLICT/);
});
test('STOP without an authoritative response cannot manufacture or settle any result',()=>{
  const{renderer,events}=create();renderer.start({requestKey:'key-1',at:0});renderer.stop(10);renderer.tick(900000);
  assert.equal(renderer.snapshot().phase,'SPINNING');assert.equal(renderer.snapshot().receipt,null);assert.equal(events.filter(e=>e.type==='settled').length,0);
});
test('STOP accelerates existing presentation without changing its receipt or creating extra events',()=>{
  const{renderer,events}=create();renderer.start({requestKey:'key-1',at:0});renderer.acceptReceipt(receipt(),100);renderer.stop(110);renderer.stop(111);
  renderer.tick(700);renderer.tick(1000);const view=renderer.snapshot();assert.equal(view.phase,'IDLE');assert.deepEqual(view.receipt,receipt());
  assert.equal(events.filter(e=>e.type==='spin').length,1);assert.equal(events.filter(e=>e.type==='stop-request').length,1);
  assert.equal(events.filter(e=>e.type==='reel-stop').length,5);assert.equal(events.filter(e=>e.type==='settled').length,1);
});
test('normal reel stop times are staggered and repeated ticks do not repeat audio',()=>{
  const{renderer,events}=create();renderer.start({requestKey:'key-1',at:0});renderer.acceptReceipt(receipt(),100);
  renderer.tick(649);assert.deepEqual(renderer.snapshot().stoppedColumns,[]);renderer.tick(650);assert.deepEqual(renderer.snapshot().stoppedColumns,[0]);
  renderer.tick(900);assert.deepEqual(renderer.snapshot().stoppedColumns,[0,1,2]);renderer.tick(1400);assert.equal(renderer.snapshot().phase,'IDLE');
  renderer.tick(1800);assert.equal(events.filter(e=>e.type==='wheel-stop').length,1);assert.equal(events.filter(e=>e.type==='win').length,1);
});
test('accepted delayed response never reveals target cells before the appropriate reel stops',()=>{
  const{renderer}=create();renderer.start({requestKey:'key-1',at:0});renderer.tick(4000);renderer.acceptReceipt(receipt(),4000);
  assert.equal(renderer.snapshot().phase,'SETTLING');assert.deepEqual(renderer.snapshot().stoppedColumns,[0]);renderer.tick(4800);
  assert.equal(renderer.snapshot().receipt.roundId,'round-1');
});
test('a second request cannot displace the active presentation and original key start is idempotent',()=>{
  const{renderer,events}=create();assert.equal(renderer.start({requestKey:'key-1',at:0}),true);assert.equal(renderer.start({requestKey:'key-1',at:1}),false);
  assert.throws(()=>renderer.start({requestKey:'key-2',at:2}),/ROUND_ACTIVE/);assert.equal(events.length,1);
});
test('unknown symbols, invalid grid, line paths and fractional or negative monetary fields fail closed',()=>{
  for(const mutate of [r=>r.grid.push([]),r=>r.grid[0][0]='fake',r=>r.multiplier=6,r=>r.winMinor=-1,r=>r.betMinor=.1,r=>r.winningLines[0].rows[0]=3,r=>r.winningLines[0].rows=[0,1,0,1,0]]){
    const r=receipt();mutate(r);assert.throws(()=>validateReceipt(r));
  }
});
test('only the five freshly observed own line paths are highlighted',()=>{
  const r=receipt();r.winningLines=SUPERWILDS_PAYLINES.map(rows=>({rows:[...rows]}));assert.equal(validateReceipt(r).winningLines.length,5);
});
test('portrait controls share non-overlapping visible rectangles of at least 44 pixels',()=>{
  for(const width of[360,390,430])for(const height of[640,780,844]){
    const l=superWildsLayout(width,height),controls=Object.values(l.controls);assert.equal(l.portrait,true);
    for(const r of controls){assert.ok(r.width>=44&&r.height>=44);assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);}
    for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)assert.equal(overlaps(controls[i],controls[j]),false,`${width}x${height} controls ${i}/${j}`);
    const reels=reelRectangles(l);for(const r of reels){assert.ok(r.x>=l.cabinet.x&&r.y>=l.cabinet.y);assert.ok(r.x+r.width<=l.cabinet.x+l.cabinet.width+.001);assert.ok(r.y+r.height<=l.cabinet.y+l.cabinet.height);}
  }
});
test('desktop and short landscape cabinet and control geometry fit the visible scene',()=>{
  for(const[width,height]of[[1366,945],[1280,720],[844,390],[667,375],[568,320]]){
    const l=superWildsLayout(width,height);assert.equal(l.portrait,false);
    for(const r of[l.cabinet,...Object.values(l.controls)])assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=width+.01&&r.y+r.height<=height+.01);
  }
});
test('portrait keeps nearly square five-by-three symbol cells instead of stretching reels to fill height',()=>{
  for(const width of [360,390,430])for(const height of [640,780,844,932]){
    const layout=superWildsLayout(width,height);
    for(const reel of reelRectangles(layout)){
      const aspect=reel.width/(reel.height/3);
      assert.ok(aspect>.92&&aspect<1.08,`${width}x${height} symbol aspect ${aspect}`);
    }
    assert.ok(layout.wheel.y>=layout.title.y+layout.title.height);
    assert.ok(layout.cabinet.y+layout.cabinet.height<layout.controls.spin.y);
  }
});
test('populated initial artwork creates no accepted outcome, balance, award or audio event',()=>{
  const events=[],grad={addColorStop(){}},drawnText=[];
  const context=new Proxy({createRadialGradient(){return grad;},createLinearGradient(){return grad;},
    fillText(text){drawnText.push(text);}}, {get(target,key){return key in target?target[key]:(()=>{});},
    set(target,key,value){target[key]=value;return true;}});
  const target=canvas();target.getContext=()=>context;
  const renderer=new SuperWildsRenderer({canvas:target,onEvent:event=>events.push(event)});
  assert.ok(drawnText.includes('7'),'initial cabinet contains original symbol artwork');
  const before=renderer.snapshot();assert.equal(before.receipt,null);assert.equal(before.pendingReceipt,null);
  assert.equal(before.display.balanceMinor,null);assert.equal(before.display.winMinor,0);assert.equal(events.length,0);
  renderer.acceptReceipt(receipt());assert.deepEqual(renderer.snapshot().receipt,receipt());
});
test('DPR is capped at two and disposal makes later ticks and drawing inert',()=>{
  const{renderer}=create();renderer.resize(390,844,4);assert.equal(renderer.canvas.width,780);assert.equal(renderer.canvas.height,1688);
  assert.equal(renderer.snapshot().dpr,2);renderer.dispose();renderer.tick(9000);assert.equal(renderer.snapshot().disposed,true);assert.throws(()=>renderer.start({requestKey:'later'}),/DISPOSED/);
});
test('drawing each symbol and complete machine applies five reel clips with balanced save/restore',()=>{
  let saves=0,restores=0,clips=0,depth=0;
  const grad={addColorStop(){}};
  const context=new Proxy({save(){saves++;depth++;},restore(){restores++;depth--;assert.ok(depth>=0);},clip(){clips++;},createRadialGradient(){return grad;},createLinearGradient(){return grad;}},{get(target,key){return key in target?target[key]:(()=>{});},set(target,key,value){target[key]=value;return true;}});
  const target=canvas();target.getContext=()=>context;
  const renderer=new SuperWildsRenderer({canvas:target});renderer.acceptReceipt(receipt());renderer.draw();
  for(const symbol of SYMBOLS)drawSymbol(context,symbol,0,0,100,100);drawCloverBackground(context,390,844);
  assert.ok(clips>=15);assert.equal(saves,restores);assert.equal(depth,0);
});
