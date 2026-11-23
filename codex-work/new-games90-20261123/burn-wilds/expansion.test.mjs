import test from 'node:test';
import assert from 'node:assert/strict';
import {BURN_WILDS_GAME_ID,BurnWildsExpansion,validateBurnWildsReceipt} from './expansion.mjs';
import {BurnWildsFlameOverlay} from './flame-overlay.mjs';

const receipt=(id='burn-round-1')=>{
  const originalGrid=[['orange','lemon','plum'],['bell','wild','cherry'],['orange','wild','seven'],['lemon','bell','plum'],['seven','bell','cherry']];
  return {gameId:BURN_WILDS_GAME_ID,roundId:id,clientToken:'burn-key-1',originalGrid,finalGrid:originalGrid.map((column,i)=>i===1||i===2?['wild','wild','wild']:[...column]),expandedColumns:[1,2],
    winLines:[{id:1,rows:[1,1,1,1,1],winMinor:300}],multiplier:3,winMinor:300,balanceMinor:5000,betMinor:10};
};
const setup=()=>{const events=[],model=new BurnWildsExpansion({now:()=>0,onEvent:event=>events.push(event)});return{model,events};};

test('Burn Wilds accepts only its own authoritative ID and middle three WILD reels',()=>{
  for(const mutate of[r=>r.gameId='zplay72_multi_hot_5_super_wilds_v1',r=>r.expandedColumns=[0],r=>r.expandedColumns=[4],r=>r.originalGrid[0][1]='wild',r=>r.expandedColumns=[1,1]]){
    const r=receipt();mutate(r);assert.throws(()=>validateBurnWildsReceipt(r));
  }
  assert.equal(validateBurnWildsReceipt(receipt()).gameId,BURN_WILDS_GAME_ID);
});
test('expanded columns require an original own WILD crossed by a positive authoritative winning line',()=>{
  for(const mutate of[r=>r.originalGrid[1][1]='bell',r=>r.winLines[0].rows=[0,0,0,0,0],r=>r.winLines=[],r=>r.winLines[0].winMinor=0]){
    const r=receipt();mutate(r);assert.throws(()=>validateBurnWildsReceipt(r),/UNTRIGGERED_EXPANSION/);
  }
});
test('every final-grid difference must exactly match a declared complete WILD expansion',()=>{
  const partial=receipt();partial.finalGrid[1][2]='orange';assert.throws(()=>validateBurnWildsReceipt(partial),/INCOMPLETE_EXPANSION/);
  const undeclared=receipt();undeclared.finalGrid[3][1]='wild';assert.throws(()=>validateBurnWildsReceipt(undeclared),/UNDECLARED_GRID_CHANGE/);
  const plain=receipt();plain.expandedColumns=[];plain.finalGrid=plain.originalGrid.map(col=>[...col]);assert.equal(validateBurnWildsReceipt(plain).expandedColumns.length,0);
});
test('source mutation cannot alter accepted original/final grids, receipt amounts or expansion columns',()=>{
  const{model}=setup(),r=receipt();model.start({requestKey:'burn-key-1',at:0});model.accept(r,100);r.finalGrid[1][0]='orange';r.winMinor=999999;r.expandedColumns.push(3);
  const accepted=model.snapshot().acceptedReceipt;assert.equal(accepted.finalGrid[1][0],'wild');assert.equal(accepted.winMinor,300);assert.deepEqual(accepted.expandedColumns,[1,2]);
  assert.throws(()=>{accepted.finalGrid[1][0]='bell';},TypeError);
});
test('timeline reveals original grid, burns only server-selected columns, then reveals unchanged final receipt',()=>{
  const{model,events}=setup();model.start({requestKey:'burn-key-1',at:0});model.accept(receipt(),100);
  assert.equal(model.snapshot().presentationGrid,null);model.tick(340);assert.equal(model.snapshot().phase,'BURNING');assert.deepEqual(model.snapshot().presentationGrid,receipt().originalGrid);
  model.tick(600);const burning=model.snapshot();assert.deepEqual(burning.expansions.map(x=>x.column),[1,2]);assert.ok(burning.expansions.every(x=>x.progress>0&&x.progress<1));
  model.tick(1000);assert.deepEqual(model.snapshot().presentationGrid[1],['wild','wild','wild']);assert.deepEqual(model.snapshot().presentationGrid[2],receipt().originalGrid[2]);
  model.tick(1500);assert.equal(model.snapshot().phase,'IDLE');assert.deepEqual(model.snapshot().receipt,receipt());assert.deepEqual(model.snapshot().presentationGrid,receipt().finalGrid);
  model.tick(2000);assert.equal(events.filter(e=>e.type==='burn-start').length,2);assert.equal(events.filter(e=>e.type==='column-expanded').length,2);assert.equal(events.filter(e=>e.type==='settled').length,1);
});
test('STOP accelerates presentation only and cannot produce an outcome before a server receipt',()=>{
  const{model,events}=setup();model.start({requestKey:'burn-key-1',at:0});model.stop(5);model.tick(90000);
  assert.equal(model.snapshot().phase,'SPINNING');assert.equal(model.snapshot().acceptedReceipt,null);assert.deepEqual(model.snapshot().expansions,[]);
  model.accept(receipt(),90000);model.stop(90001);model.tick(90300);assert.equal(model.snapshot().phase,'IDLE');assert.deepEqual(model.snapshot().receipt,receipt());
  assert.equal(events.filter(e=>e.type==='stop-request').length,1);assert.equal(events.filter(e=>e.type==='settled').length,1);
});
test('duplicate and reordered-object recovery is idempotent while conflicting same-round recovery is rejected',()=>{
  const{model,events}=setup(),r=receipt();model.start({requestKey:'burn-key-1',at:0});model.accept(r,1);
  assert.equal(model.accept({...r,expandedColumns:[2,1]},5),false);const conflict=receipt();conflict.multiplier=4;assert.throws(()=>model.accept(conflict,6),/RECEIPT_CONFLICT/);
  model.tick(1500);assert.equal(model.accept(receipt(),1600),false);assert.equal(events.filter(e=>e.type==='settled').length,1);
});
test('recovery with no active presentation restores final state immediately; active request ownership is preserved',()=>{
  const{model}=setup();model.accept(receipt(),0);assert.equal(model.snapshot().phase,'IDLE');assert.deepEqual(model.snapshot().presentationGrid,receipt().finalGrid);
  model.start({requestKey:'burn-key-2',at:1});assert.equal(model.start({requestKey:'burn-key-2',at:2}),false);assert.throws(()=>model.start({requestKey:'burn-key-3',at:3}),/ROUND_ACTIVE/);
  assert.throws(()=>model.accept(receipt('burn-round-2'),5),/REQUEST_MISMATCH/);assert.equal(model.snapshot().requestKey,'burn-key-2');
});
test('flames clip each declared server column, preserve canvas state, cap DPR and are pointer transparent',()=>{
  const clips=[],stack=[];let currentRect;
  const gradient={addColorStop(){}};
  const context=new Proxy({save(){stack.push(1);},restore(){assert.ok(stack.pop());},rect(x,y,w,h){currentRect=[x,y,w,h];},clip(){clips.push(currentRect);},createLinearGradient(){return gradient;}},{get:(obj,key)=>key in obj?obj[key]:(()=>{}),set(obj,key,value){obj[key]=value;return true;}});
  const canvas={width:390,height:780,style:{},getContext:()=>context};const overlay=new BurnWildsFlameOverlay({canvas});overlay.resize(390,780,4);
  const{model}=setup();model.start({requestKey:'burn-key-1',at:0});model.accept(receipt(),100);model.tick(600);
  const reels=Array.from({length:5},(_,i)=>({x:i*70,y:50,width:70,height:300}));overlay.draw(model.snapshot(),{reels,at:600});
  assert.deepEqual(clips,[[70,50,70,300],[140,50,70,300]]);assert.equal(stack.length,0);assert.equal(canvas.width,780);assert.equal(canvas.height,1560);assert.equal(canvas.style.pointerEvents,'none');
  assert.throws(()=>overlay.draw({...model.snapshot(),gameId:'another-game'},{reels,at:700}),/OVERLAY_SNAPSHOT/);
});
test('invalid monetary/grid data fail closed and disposal leaves model and overlay inert',()=>{
  for(const mutate of[r=>r.winMinor=-1,r=>r.betMinor=.5,r=>r.multiplier=6,r=>r.originalGrid[1][0]='unobserved-symbol']){const r=receipt();mutate(r);assert.throws(()=>validateBurnWildsReceipt(r));}
  const{model,events}=setup();model.start({requestKey:'burn-key-1',at:0});model.accept(receipt(),1);model.dispose();model.tick(5000);assert.equal(model.snapshot().disposed,true);assert.equal(events.filter(e=>e.type==='settled').length,0);assert.throws(()=>model.accept(receipt()),/DISPOSED/);
  const overlay=new BurnWildsFlameOverlay({canvas:{getContext:()=>null}});overlay.dispose();assert.doesNotThrow(()=>overlay.draw(null));
});

