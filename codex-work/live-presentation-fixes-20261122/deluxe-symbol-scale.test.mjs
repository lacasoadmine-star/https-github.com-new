import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,symbolDraws,verifyPinnedInputs,entries} from './geometry-fixture.mjs';
import {createOfficialAudioControls} from './baseline/official-audio-controls.mjs';

const kind=process.env.RENDERER_SOURCE || 'candidate';
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-8,`${message}: ${actual} != ${expected}`);

test('fixture inputs equal the current deployed renderer, manifest, timing module and PNG pins',()=>{
  assert.equal(verifyPinnedInputs(),true);
});

test('all nine pending symbols keep their idle visible width and height',()=>{
  for(let symbol=0;symbol<9;symbol++) {
    const idle=symbolDraws(fixture({kind,symbol}))[0];
    const pending=symbolDraws(fixture({kind,symbol,state:'pending',elapsed:142.5}));
    assert.equal(pending.length,15);
    for(const draw of pending) {
      close(draw.visible.w,idle.visible.w,`symbol ${symbol} pending width`);
      close(draw.visible.h,idle.visible.h,`symbol ${symbol} pending height`);
    }
  }
});

test('all nine settling symbols keep the same size at normal and turbo speed',()=>{
  for(let symbol=0;symbol<9;symbol++) for(const turbo of [false,true]) for(const elapsed of [12,190,500,949]) {
    const idle=symbolDraws(fixture({kind,symbol}))[0];
    const moving=symbolDraws(fixture({kind,symbol,state:'settling',elapsed,turbo}));
    for(const draw of moving) {
      close(draw.visible.w,idle.visible.w,`symbol ${symbol} settling width`);
      close(draw.visible.h,idle.visible.h,`symbol ${symbol} settling height`);
    }
  }
});

test('moving sprites preserve each authored visible aspect ratio',()=>{
  for(let symbol=0;symbol<9;symbol++) {
    const bounds=entries.get(`Box/Blur/${symbol}`).visibleBounds;
    for(const draw of symbolDraws(fixture({kind,symbol,state:'pending',elapsed:203})))
      close(draw.visible.w/draw.visible.h,bounds.w/bounds.h,`symbol ${symbol} aspect ratio`);
  }
});

test('every moving draw stays within its column and its painted pixels stay inside the reel mask',()=>{
  const x=115,y=138,w=256,h=253,cw=w/3;
  for(let symbol=0;symbol<9;symbol++) for(const state of ['pending','settling']) for(const elapsed of [0,19,94,95,142.5,500,949,1100]) {
    const draws=symbolDraws(fixture({kind,symbol,state,elapsed}));
    for(const draw of draws) {
      const center=draw.visible.x+draw.visible.w/2,col=Math.min(2,Math.max(0,Math.floor((center-x)/cw)));
      assert.ok(draw.visible.x>=x+col*cw-1e-8);
      assert.ok(draw.visible.x+draw.visible.w<=x+(col+1)*cw+1e-8);
      assert.deepEqual(draw.clip,{x,y,w,h});
      if(draw.painted.w>0&&draw.painted.h>0) {
        assert.ok(draw.painted.x>=x-1e-8&&draw.painted.x+draw.painted.w<=x+w+1e-8);
        assert.ok(draw.painted.y>=y-1e-8&&draw.painted.y+draw.painted.h<=y+h+1e-8);
      }
    }
  }
});

test('settled and reduced-motion draws retain their original geometry',()=>{
  for(let symbol=0;symbol<9;symbol++) for(const state of ['idle','pending','settling']) {
    const opts={symbol,state,reducedMotion:true};
    assert.deepEqual(symbolDraws(fixture({kind:'candidate',...opts})),symbolDraws(fixture({kind:'baseline',...opts})));
  }
});

test('STOP and presentation cancellation preserve the accepted receipt and reel targets',async()=>{
  const renderer=fixture({kind}),receipt=Object.freeze({
    grid:Object.freeze(Array.from({length:3},()=>Object.freeze(['symbol_1','symbol_2','symbol_3']))),
    stops:Object.freeze([1,2,3]),wheelMultiplier:3,winLines:Object.freeze([]),bet:'1.00',finalWin:'0.00',
  });
  const before=JSON.stringify(receipt),pending=renderer.beginPendingSpin(),presentation=renderer.start(receipt);
  assert.equal(renderer.pendingSpin,null);
  renderer.speedUp();
  assert.equal(renderer.motion.fast,true);
  assert.deepEqual(Array.from(renderer.motion.targets),[1,2,3]);
  assert.equal(renderer.result,receipt);
  assert.equal(JSON.stringify(receipt),before);
  renderer.cancelPresentation();
  assert.equal(await presentation,null);
  assert.equal(JSON.stringify(receipt),before);
  assert.ok(pending);
});

test('the patch has no other effect on background, multiplier or frame draw calls',()=>{
  for(const state of ['idle','pending','settling']) {
    const get=kind=>{const r=fixture({kind,state});r.draw(2000);return r.ctx.draws.filter(d=>!d.name.startsWith('Box/'));};
    assert.deepEqual(get('candidate'),get('baseline'));
  }
});

test('deployed Sound Effects switch intentionally mutes music together with the master',async()=>{
  const audio={muted:false,toggle(){this.muted=!this.muted;},setBackgroundEnabled(value){this.background=value;},async unlock(){}};
  const values=new Map([['zplay:sound-choice','yes']]);
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const controls=createOfficialAudioControls({gameId:'multi_hot_5_video',audio,storage});
  assert.deepEqual(controls.getState(),{effectsEnabled:true,musicEnabled:true});
  await controls.setEffects(false);
  assert.deepEqual(controls.getState(),{effectsEnabled:false,musicEnabled:false});
  assert.equal(audio.background,false);
  await controls.setMusic(true);
  assert.deepEqual(controls.getState(),{effectsEnabled:false,musicEnabled:true});
  assert.equal(audio.muted,true);
  assert.equal(audio.background,false);
});
