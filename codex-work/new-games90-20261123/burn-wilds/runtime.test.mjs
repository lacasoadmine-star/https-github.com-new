import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_WILDS_GAME_ID,BurnWildsExpansion} from './expansion.mjs';
import {quoteBurnWildsLine,evaluateBurnWildsLine,describeBurnWildsPaytable} from './rules.mjs';
import {burnWildsLayout} from './layout.mjs';
import {BurnWildsController,BURN_WILDS_PENDING_KEY} from './controller.mjs';
import {BurnWildsScene} from './scene.mjs';

const grid=[['seven','orange','cherry'],['seven','plum','cherry'],['seven','lemon','cherry'],['seven','bell','cherry'],['seven','bell','cherry']];
const receipt=action=>({gameId:BURN_WILDS_GAME_ID,requestKey:action.requestKey,clientToken:action.requestKey,roundId:'r-'+action.requestKey,
  originalGrid:grid,finalGrid:grid,expandedColumns:[],winLines:[{id:2,rows:[0,0,0,0,0],winMinor:10000}],
  betMinor:action.betMinor,multiplier:1,winMinor:10000,balanceMinor:9900,pendingWinMinor:10000});
function harness(){
  let next=0;const calls=[],saved=new Map(),timeline=new BurnWildsExpansion({now:()=>0});
  const scene={start:action=>timeline.start({...action,at:0}),accept:r=>timeline.accept(r,0),stop:()=>timeline.stop(0),reject:key=>timeline.reject(key),snapshot:()=>timeline.snapshot(),setFinancial(){},dispose:()=>timeline.dispose()};
  const storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  const account={gameId:BURN_WILDS_GAME_ID,subject:'test-only-subject',authenticated:true,currency:'ETB',canPlay:true,balanceMinor:10000,pendingWinMinor:0,betLevelsMinor:[100,200],round:null};
  const transport={state:async()=>structuredClone(account),prepare:action=>({...action,authority:{mathVersion:'synthetic-test-model'}}),dispatch:async action=>{calls.push(action);return receipt(action);},recover:async action=>{calls.push(action);return receipt(action);}};
  const controller=new BurnWildsController({transport,scene,storage,key:()=>`key-${++next}`});
  return {controller,transport,scene,storage,saved,timeline,calls,account};
}
test('freshly refreshed own 0.10/0.20 paytable quotes and WILD substitution stay exact',()=>{
  assert.equal(quoteBurnWildsLine('seven',5,10),1000);assert.equal(quoteBurnWildsLine('seven',5,20),2000);
  assert.equal(quoteBurnWildsLine('seven',2,10),5);assert.equal(quoteBurnWildsLine('bell',3,20),20);
  assert.deepEqual(describeBurnWildsPaytable(10).grapes,{3:20,4:40,5:200});
  const g=structuredClone(grid);g[2][0]='wild';assert.equal(evaluateBurnWildsLine(g,2,100,5).winMinor,50000);
  assert.throws(()=>quoteBurnWildsLine('cherry',3,1),/FRACTIONAL_MINOR/);assert.throws(()=>quoteBurnWildsLine('seven',5,Number.MAX_SAFE_INTEGER),/OVERFLOW/);
});
test('responsive scene/control rectangles remain inside the same measured stage',()=>{
  for(const[w,h]of[[360,800],[390,844],[430,932],[1363,768]]){
    const l=burnWildsLayout(w,h);for(const r of Object.values(l.controls)){assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=w+.01&&r.y+r.height<=h+.01);}
    assert.equal(l.reels.length,5);assert.ok(l.controls.spin.width>=44);assert.ok(l.controls.quick.x>=l.controls.spin.x+l.controls.spin.width-10||l.landscape);
  }
});
test('uncertain spin retains exact prepared authority and STOP never creates another wager',async()=>{
  const h=harness();await h.controller.connect();h.transport.dispatch=async action=>{h.calls.push(action);throw new Error('lost-reply');};
  await assert.rejects(h.controller.spin(),/lost-reply/);const pending=JSON.parse(h.storage.getItem(BURN_WILDS_PENDING_KEY));
  h.controller.stop();h.controller.stop();assert.equal(h.calls.length,1);assert.equal(h.controller.snapshot().status,'RECOVER');
  await h.controller.recover();assert.deepEqual(h.calls[1],pending.action);assert.equal(h.storage.getItem(BURN_WILDS_PENDING_KEY),null);
  h.timeline.tick(2000);h.controller.presentationFinished('r-key-1');assert.equal(h.controller.snapshot().status,'READY');assert.equal(h.controller.snapshot().pendingWinMinor,10000);
});
test('same-slot pointer attempts while the host is pending only accelerate presentation',async()=>{
  const h=harness();await h.controller.connect();let deliver;
  h.transport.dispatch=action=>{h.calls.push(action);return new Promise(resolve=>{deliver=()=>resolve(receipt(action));});};
  const first=h.controller.spin();await Promise.resolve();await Promise.resolve();assert.equal(h.calls.length,1);
  await h.controller.spin();assert.equal(h.calls.length,1);deliver();await first;assert.equal(h.controller.snapshot().status,'ANIMATING');
  await h.controller.spin();assert.equal(h.calls.length,1);
});
test('definitive rejection restores controls while identity mismatch keeps recovery closed',async()=>{
  const h=harness();await h.controller.connect();h.transport.dispatch=async()=>{throw Object.assign(new Error('INSUFFICIENT_FUNDS'),{definitiveRejection:true});};
  await assert.rejects(h.controller.spin(),/INSUFFICIENT/);assert.equal(h.controller.snapshot().status,'READY');assert.equal(h.timeline.phase,'IDLE');
  h.transport.dispatch=async action=>({...receipt(action),requestKey:'another-key'});
  await assert.rejects(h.controller.spin(),/RESPONSE_IDENTITY/);assert.equal(h.controller.snapshot().status,'RECOVER');assert.ok(h.saved.size);
});
test('pending action is bound to the actual authenticated subject and cannot cross accounts',async()=>{
  const h=harness();h.storage.setItem(BURN_WILDS_PENDING_KEY,JSON.stringify({gameId:BURN_WILDS_GAME_ID,subject:'different-subject',action:{action:'SPIN',gameId:BURN_WILDS_GAME_ID,requestKey:'old-key'}}));
  await assert.rejects(h.controller.connect(),/PENDING_ACCOUNT_MISMATCH/);assert.equal(h.calls.length,0);assert.equal(h.controller.snapshot().canPlay,false);assert.ok(h.saved.size);
});
test('AUTO pause stops future rounds after an accepted result and never discards the debit',async()=>{
  const h=harness();await h.controller.connect();await h.controller.startAuto({count:25,balanceDecreaseMinor:100});
  h.controller.pause();h.timeline.tick(2000);h.controller.presentationFinished('r-key-1');await Promise.resolve();assert.equal(h.calls.length,1);assert.equal(h.controller.snapshot().auto.active,false);
  assert.equal(h.controller.snapshot().pendingWinMinor,10000);assert.equal(h.controller.snapshot().balanceMinor,9900);
});
test('real scene consumes own symbol images per cell, clips reels and caps DPR without a screenshot player',()=>{
  const drawn=[],clips=[],gradient={addColorStop(){}};const context=new Proxy({drawImage(...args){drawn.push(args);},clip(){clips.push(1);},createLinearGradient(){return gradient;},createRadialGradient(){return gradient;}},{get:(object,key)=>key in object?object[key]:()=>{},set:(object,key,value)=>(object[key]=value,true)});
  const canvas={width:390,height:740,clientWidth:390,clientHeight:740,style:{},getContext:()=>context},flameCanvas={...canvas,style:{}};
  const images=Object.fromEntries(['orange','lemon','plum','grapes','cherry','watermelon','bell','seven','wild'].map(key=>[key,{width:90,height:100,key}]));
  const scene=new BurnWildsScene({canvas,flameCanvas,artwork:{gameId:BURN_WILDS_GAME_ID,symbols:images},now:()=>0,win:{devicePixelRatio:4}});
  scene.accept(receipt({requestKey:'key-1',betMinor:100}));scene.draw(10);assert.equal(canvas.width,780);assert.equal(canvas.height,1480);assert.ok(drawn.length>=15);assert.ok(drawn.every(args=>Object.values(images).includes(args[0])));assert.ok(clips.length>=5);
  scene.dispose();assert.throws(()=>new BurnWildsScene({canvas,flameCanvas,artwork:{gameId:'foreign-game',symbols:images}}),/OWN_ARTWORK_REQUIRED/);
});
