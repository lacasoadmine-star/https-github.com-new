import test from 'node:test';
import assert from 'node:assert/strict';
import {GAME_ID} from './contract.mjs';
import {BurnWildsNativeRenderer} from './native-renderer.mjs';
import {validateBurnRecordedReference} from './recorded-reference.mjs';

const sha='a'.repeat(64);
const syntheticReference=()=>({
  schema:'zplay/burn-wilds-recorded-reference/v1',
  gameId:GAME_ID,gameName:'Multi Hot 5 Burn Wilds',reels:5,rows:3,
  evidence:{
    videoFile:'synthetic-test.mp4',videoSha256:sha,
    screenshots:[{file:'synthetic-test-1.png',sha256:sha},{file:'synthetic-test-2.png',sha256:sha}],
    audioFile:'synthetic-test.ogg',audioSha256:sha,
    recordedSpinObserved:true,audibleAudioObserved:true
  },
  reelWindow:{x:.1,y:.2,width:.8,height:.6},
  multiplierPosition:{x:.5,y:.1},
  timing:{symbolFrameMs:80,stopDurationMs:1000,fastStopDurationMs:180,
    reelStopFractions:[.15,.3,.5,.75,1]},
  symbolCycle:['a','wild','b']
});
const receipt=()=>({
  gameId:GAME_ID,serverSettled:true,requestKey:'key-1',roundId:'round-1',
  finalGrid:[['a','b','wild'],['b','a','wild'],['a','b','wild'],['wild','a','b'],['a','b','a']],
  multiplier:3,winMinor:200,expandedColumns:[],winningLines:[{cells:[[0,0],[1,1],[2,0]]}]
});
function fixture({reference=syntheticReference(),withMedia=true}={}){
  let time=0,nextId=0;
  const frames=new Map(),events=[],draws=[];
  const noop=()=>{};
  const ctx={
    save:noop,restore:noop,clearRect:noop,setTransform:(...a)=>draws.push(['transform',...a]),
    drawImage:(...a)=>draws.push(['image',...a]),beginPath:noop,rect:noop,clip:noop,
    moveTo:noop,lineTo:noop,stroke:noop,fillText:(...a)=>draws.push(['text',...a])
  };
  const canvas={style:{},getContext:type=>type==='2d'?ctx:null,width:0,height:0};
  const renderer=new BurnWildsNativeRenderer({
    canvas,
    assets:withMedia?{cabinet:{width:100,height:100},symbols:{
      a:{width:10,height:10},b:{width:10,height:10},wild:{width:10,height:10}
    }}:null,
    recordedReference:reference,
    clock:()=>time,
    requestFrame:fn=>{const id=++nextId;frames.set(id,fn);return id;},
    cancelFrame:id=>{frames.delete(id);},
    sound:name=>events.push(name),
    onRoundFinished:id=>events.push('finished:'+id)
  });
  return {
    renderer,canvas,events,draws,frames,
    tick:t=>{time=t;for(const [id,fn] of frames){frames.delete(id);fn(t);break;}}
  };
}
test('unverified recording evidence cannot activate native renderer',()=>{
  assert.throws(()=>validateBurnRecordedReference({...syntheticReference(),evidence:{
    ...syntheticReference().evidence,recordedSpinObserved:false
  }},['a','b','wild']),/BURN_REFERENCE_CAPTURE_MISSING/);
  assert.throws(()=>validateBurnRecordedReference({...syntheticReference(),timing:{
    ...syntheticReference().timing,reelStopFractions:[.2,.3,.5,.6,.8]
  }},['a','b','wild']),/BURN_REFERENCE_TIMING/);
});
test('matching fresh recorded metadata retains measured window and multiplier',()=>{
  const ref=validateBurnRecordedReference(syntheticReference(),['a','b','wild']);
  assert.deepEqual(ref.reelWindow,{x:.1,y:.2,width:.8,height:.6});
  assert.deepEqual(ref.multiplierPosition,{x:.5,y:.1});
});
test('SPIN remains animating until server receipt arrives; no computed outcome',()=>{
  const f=fixture();
  f.renderer.start({requestKey:'key-1'});
  f.tick(200);
  assert.equal(f.renderer.snapshot().phase,'SPINNING');
  assert.equal(f.renderer.snapshot().roundId,null);
  assert.deepEqual(f.events,['spin']);
  assert.equal(f.draws.filter(e=>e[0]==='text').length,0);
});
test('a server receipt stops all five reels once and emits a single sound',()=>{
  const f=fixture();
  f.renderer.start({requestKey:'key-1'});
  f.renderer.accept(receipt());
  f.tick(200);
  f.tick(1000);
  assert.equal(f.renderer.snapshot().phase,'RESULT');
  assert.deepEqual(f.events.filter(x=>x.startsWith('reel-stop-')),
    ['reel-stop-1','reel-stop-2','reel-stop-3','reel-stop-4','reel-stop-5']);
  assert.equal(f.events.filter(x=>x==='win').length,1);
  assert.equal(f.events.filter(x=>x==='finished:round-1').length,1);
});
test('STOP changes reel presentation timing but creates no new result',()=>{
  const f=fixture();
  f.renderer.start({requestKey:'key-1'});
  assert.equal(f.renderer.accelerate(),true);
  f.renderer.accept(receipt());
  f.tick(180);
  assert.equal(f.renderer.snapshot().phase,'RESULT');
  assert.equal(f.renderer.snapshot().roundId,'round-1');
});
test('rejects mismatched receipt and cannot fabricate symbols',()=>{
  const f=fixture();
  f.renderer.start({requestKey:'key-1'});
  assert.throws(()=>f.renderer.accept({...receipt(),requestKey:'key-2'}),/BURN_RENDERER_UNACCEPTED_RECEIPT/);
  assert.throws(()=>f.renderer.accept({...receipt(),finalGrid:[['wrong','wrong','wrong']]}),/BURN_RENDERER_UNACCEPTED_RECEIPT/);
});
test('matches recorded geometry at mobile widths and caps DPR at two',()=>{
  const f=fixture();
  f.renderer.resize({width:360,height:700,dpr:3});
  assert.equal(f.canvas.width,720);
  assert.equal(f.renderer.geometryForReels().left,36);
  f.renderer.resize({width:430,height:800,dpr:2});
  assert.equal(f.renderer.geometryForReels().usableWidth,344);
});
test('dispose cancels outstanding animation frames',()=>{
  const f=fixture();
  f.renderer.start({requestKey:'key-1'});
  assert.equal(f.frames.size,1);
  f.renderer.dispose();
  assert.equal(f.frames.size,0);
  assert.equal(f.renderer.snapshot().phase,'SPINNING');
});
test('presentation finish does not submit another bet or generate another round',()=>{
  const f=fixture();
  f.renderer.start({requestKey:'key-1'});
  f.renderer.accept(receipt());
  f.tick(1100);
  assert.equal(f.renderer.finish('round-2'),false);
  assert.equal(f.renderer.finish('round-1'),true);
  assert.equal(f.renderer.snapshot().phase,'READY');
  assert.equal(f.events.filter(x=>x==='spin').length,1);
});
