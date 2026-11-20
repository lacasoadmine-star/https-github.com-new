// Covers the EXACT current Multi Hot 40 renderer, patched from the live route.
// No Player credentials, network access or wallet API required.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  MultiHot40Motion,multiHot40Layout,MULTIHOT40_INITIAL_GRID,
  isMultiHot40Grid,winTier
} from './multihot40-motion.mjs';

const sampleResult={
  grid:[[0,1,2,3],[1,2,3,4],[2,3,4,5],[3,4,5,6],[4,5,6,7]],
  multiplier:3,lines:[],roundId:'qa-visual-only',
  winMinor:'0',betMinor:'100'
};
test('official 5x4 grid is kept distinct from every 3x3 / other title engine',()=>{
  assert.ok(isMultiHot40Grid(MULTIHOT40_INITIAL_GRID));
  assert.ok(isMultiHot40Grid(sampleResult.grid));
  assert.equal(isMultiHot40Grid(Array.from({length:4},()=>[0,1,2,3,4])),false);
  assert.equal(isMultiHot40Grid([[1,1,1],[1,1,1],[1,1,1]]),false);
});
test('desktop reference layout: wheel, board, logo, touch targets stay in the correct regions',()=>{
  const v=multiHot40Layout(1280,800);
  assert.equal(v.portrait,false);
  assert.ok(v.board.x>340 && v.board.x<370,JSON.stringify(v.board));
  assert.ok(v.board.y>188 && v.board.y<196,JSON.stringify(v.board));
  assert.ok(v.board.width>555 && v.board.width<563);
  assert.ok(v.logo.x<40 && v.logo.y<120);
  assert.ok(v.controls.spin.x>1020 && v.controls.spin.y<310);
  assert.ok(v.hud.balance.y<660 && v.hud.balance.y>650);
  const h=multiHot40Layout(390,844);
  assert.equal(h.portrait,true);
  assert.ok(h.controls.spin.width>100);
  assert.ok(h.board.width>360);
  assert.ok(h.controls.bet.y>h.board.y+h.board.height);
  assert.ok(h.controls.menu.width>=44 && h.controls.menu.height>=44);
  assert.ok(h.controls.sound.width>=44 && h.controls.sound.height>=44);
  assert.ok(h.controls.menu.x>=0 && h.controls.sound.x+h.controls.sound.width<=h.width+0.5);
});
test('a backend result does not immediately complete reels before the stop sequence',()=>{
  const m=new MultiHot40Motion({clock:()=>0});
  m.begin({},0);
  assert.equal(m.phase,'spinning');
  m.accept(sampleResult,70);
  assert.equal(m.phase,'settling');
  const before=m.sample(300);
  assert.equal(before.phase,'settling');
  assert.ok(before.columns.every(c=>c.stopped===false));
  const final=m.sample(4000);
  assert.equal(final.phase,'idle');
  assert.deepEqual(final.grid,sampleResult.grid);
  assert.equal(final.multiplier,3);
  assert.equal(m.busy,false);
});
test('rejected response cancels the animation without showing a fake receipt or win',()=>{
  const m=new MultiHot40Motion({clock:()=>0});
  m.begin({},0);m.sample(190);
  m.cancel('server-rejected');
  assert.equal(m.busy,false);
  assert.equal(m.phase,'idle');
  assert.equal(m.receipt,null);
  assert.equal(m.sample(250).phase,'idle');
  assert.deepEqual(m.grid,MULTIHOT40_INITIAL_GRID.map(c=>c.map(Number)));
});
test('win presentation timing does not change the backend receipt amount',()=>{
  assert.equal(winTier('0','100'),null);
  assert.equal(winTier('1500','100').name,'Nice Win');
  assert.equal(winTier('2500','100').name,'Big Win');
  assert.equal(winTier('3500','100').name,'Super Win');
  assert.equal(winTier('4500','100').name,'Fantastic Win');
});
test('presentation has no overlapping screenshot layer or hidden payout computation, and mutes on blur',async()=>{
 const s=await readFile(new URL('./multihot40-presentation.mjs',import.meta.url),'utf8');
 assert.match(s,/addEventListener\('blur', this.blurHandler\)/);
 assert.match(s,/addEventListener\('focus', this.focusHandler\)/);
 assert.match(s,/this\.audioHidden\(\)/);
 assert.match(s,/const landing = motion\.target !== null/);
 assert.match(s,/this\.motion\.previousGrid/);
 assert.doesNotMatch(s,/\bMath\.random\s*\(/);
 assert.doesNotMatch(s,/\b(?:fetch|XMLHttpRequest)\s*\([^)]*\/api\/slots\/spin/);
 assert.doesNotMatch(s,/document\.createElement\(['"]img['"]\)/);
});

test('actual live app fails closed after Player logout while retaining STOP on rolling reels',async()=>{
 const app=await readFile(new URL('./multihot40-app.mjs',import.meta.url),'utf8');
 assert.match(app,/nodes\.spin\.disabled=!entered\|\|!ready\|\|\(!visualBusy&&/);
 assert.match(app,/!state\.authenticated\|\|!state\.connected\|\|automatic\.active/);
 assert.ok(app.includes("visualBusy?'Stop animation':!state.authenticated?'Sign in to play'"));
 assert.match(app,/if\(visualBusy\)\{presenter\.speedUp\(\);return false;\}/);
 assert.match(app,/supportsWagerProfile\(state\?\.game,ID\)/);
 assert.doesNotMatch(app,/nodes\.spin\.disabled=.*!state\.authenticated&&!available/);
});
