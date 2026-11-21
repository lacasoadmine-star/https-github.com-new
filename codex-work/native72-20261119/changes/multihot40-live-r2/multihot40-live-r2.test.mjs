// Covers the EXACT current Multi Hot 40 renderer, patched from the live route.
// No Player credentials, network access or wallet API required.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
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

test('mobile hitbox regression: Menu, Sound and TURBO reach 44px and avoid SPIN/BET',async()=>{
 const app=await readFile(new URL('./multihot40-app.mjs',import.meta.url),'utf8');
 assert.match(app,/window\.innerWidth<=600/);
 assert.match(app,/\['menu','sound','turbo'\]\.includes\(name\)/);
 assert.match(app,/const minTouch=44/);
 assert.ok(app.includes('spin.x+spin.width+5'));
 assert.ok(app.includes('bet.y-height-6'));
 assert.ok(app.includes('Math.max(0,rect.width-width)'));
 assert.ok(app.includes('Math.max(0,rect.height-height)'));
});

test('loader timeout covers a stalled response body after successful HTTP headers',async()=>{
 const source=await readFile(new URL('./multihot40-app.mjs',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('async function fetchGameBytes('),source.indexOf('\nasync function loadGamePresentation('));
 let bodyRead=false,aborted=false;
 const context=vm.createContext({AbortController,setTimeout,clearTimeout,Error,
  fetch:async(_url,{signal})=>({ok:true,arrayBuffer:()=>new Promise((_,reject)=>{
   bodyRead=true;signal.addEventListener('abort',()=>{aborted=true;reject(Error('body aborted'));},{once:true});
  })})});
 vm.runInContext(code,context);
 await assert.rejects(()=>context.fetchGameBytes('/artwork','Unavailable',15),/Loading timed out/);
 assert.equal(bodyRead,true);assert.equal(aborted,true);
});

test('stalled artwork loading is bounded and aborts its pending asset requests',async()=>{
 const source=await readFile(new URL('./multihot40-app.mjs',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('async function loadGamePresentation('),source.indexOf('\nfunction showLoadingRetry('));
 const controller=new AbortController();let aborts=0;
 controller.signal.addEventListener('abort',()=>aborts++);
 const context=vm.createContext({setTimeout,clearTimeout,Error,presenter:{load:()=>new Promise(()=>{}),controller}});
 vm.runInContext(code,context);
 await assert.rejects(()=>context.loadGamePresentation(15),/Loading timed out/);
 assert.equal(aborts,1);
});

test('official MH40 spin movement cue plays once rather than looping generic ObjectMove',async()=>{
 const source=await readFile(new URL('./multihot40-presentation.mjs',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('class MachineAudio {'),source.indexOf('\nexport class MultiHot40Presentation'));
 const context=vm.createContext({});vm.runInContext(code,context);
 const Audio=vm.runInContext('MachineAudio',context),audio=new Audio({}, {audio:{}},()=>{}),played=[];
 audio.play=(key,options={})=>{played.push({key,loop:options.loop===true});return {};};audio.stop=()=>{};
 audio.event({type:'spin-start'});
 assert.deepEqual(played,[{key:'Start/ObjectMoveFast.mp3',loop:false},{key:'Buttons/Spin.mp3',loop:false}]);
});

test('losing wheels stay silent and turbo settles with its single fast cue',async()=>{
 const source=await readFile(new URL('./multihot40-presentation.mjs',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('class MachineAudio {'),source.indexOf('\nexport class MultiHot40Presentation'));
 const context=vm.createContext({validMinor:v=>typeof v==='string'&&/^\d+$/.test(v)});vm.runInContext(code,context);
 const Audio=vm.runInContext('MachineAudio',context),audio=new Audio({}, {audio:{}},()=>{}),played=[];
 audio.play=key=>{played.push(key);return {};};audio.stop=()=>{};
 audio.event({type:'wheel-stop',winMinor:'0'});assert.deepEqual(played,[]);
 audio.event({type:'wheel-stop',winMinor:'100'});assert.deepEqual(played,['Start/WinMultiplier.mp3']);
 played.length=0;audio.event({type:'spin-start',turbo:true});played.length=0;
 for(let column=0;column<5;column++)audio.event({type:'reel-stop',column});
 assert.deepEqual(played,['Start/ObjectMoveFast.mp3']);
});

test('fresh official NICE WIN recording is an isolated hash-pinned manifest addition',async()=>{
 const source=await readFile(new URL('./multihot40-presentation.mjs',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('export function withVerifiedNiceWin('),source.indexOf('\nclass MachineAudio')).replace('export function','function');
 const context=vm.createContext({});vm.runInContext(code,context);
 const original={id:'multihot40_native',files:{old:{sha256:'retained'}},audio:{old:{file:'old'}}};
 const next=context.withVerifiedNiceWin(original),item=next.audio['Win/NiceWin.mp3'];
 assert.equal(item.sha256,'78c1090bbcdb90e0714e4ad43bc06a1a9030d17ee9b1f39490a880a11a681fbe');
 assert.equal(next.files[item.file].bytes,235773);assert.equal(original.audio['Win/NiceWin.mp3'],undefined);
 assert.equal(next.files.old,original.files.old);assert.throws(()=>context.withVerifiedNiceWin({id:'other_game'}),/Wrong game/);
});


// Execute the actual Play Now application with its existing imports replaced by
// non-wagering DOM/session doubles. No network or synthetic wallet is attached.
async function liveAppHarness({collect=false,startResult=async()=>true}={}){
 const source=await readFile(new URL('./multihot40-app.mjs',import.meta.url),'utf8');
 const events=new Map(),elements=new Map(),starts=[],stops=[];
 const element=id=>({id,open:false,hidden:false,disabled:false,style:{},classList:{toggle(){},remove(){},add(){}},setAttribute(){},addEventListener(){},close(){this.open=false;},showModal(){this.open=true;},replaceChildren(){},append(){},getBoundingClientRect(){return {width:390,height:844};}});
 for(const name of new Set([...source.matchAll(/nodes\.([A-Za-z][A-Za-z0-9]*)/g)].map(match=>match[1])))elements.set(name,element(name));
 for(const name of ['menuDialog','settingsDialog','betDialog','autoDialog','rulesDialog','historyDialog','gambleDialog'])elements.set(name,element(name));
 const target={addEventListener(name,handler){const list=events.get(name)||[];list.push(handler);events.set(name,list);}};
 const document={...target,visibilityState:'visible',hidden:false,hasFocus:()=>true,getElementById:id=>elements.get(id),querySelectorAll:selector=>selector==='[id]'?[...elements.values()]:[],createElement:()=>element('new')};
 let active=false,canCollect=collect,resolveCollect;
 const session={canStart:()=>!canCollect,canAct:action=>action==='collect'&&canCollect,async start(stake){starts.push(stake);return startResult();},async act(){await new Promise(resolve=>{resolveCollect=resolve;});canCollect=false;return true;}};
 class Auto{snapshot(){return {active,remaining:5};}stop(reason){active=false;stops.push(reason);}observe(){}canLaunch(){return false;}}
 class Presenter{setState(){}speedUp(){}dispose(){}}
 class Hold{constructor(){this.active=false;}stop(){this.active=false;}consumesClick(){return false;}}
 const context={document,window:{...target},localStorage:{getItem:()=>null},location:{},queueMicrotask,requestAnimationFrame:()=>1,cancelAnimationFrame(){},supportsWagerProfile:()=>true,acceptedBetMinor:()=>null,wagerMathSummary:()=>'',moneyMinor:value=>typeof value==='string'?BigInt(value.replace('.','')):null,fromMinor:String,formatMoney:String,getRoundActions:()=>[],AutoplayController:Auto,MultiHot40Presentation:Presenter,SpinHold:Hold};
 const executable=source.replace(/^import .*;\n/gm,'').replace(/void boot\(\);\s*$/,`globalThis.qa={doStart,canStart,actionAllowed,setActive(value){activeFixture(value);},setup(client){session=client;state={sessionId:'player',game:{id:ID,version:'v1'},authenticated:true,connected:true,balance:'100.00',accepting:true};ready=true;entered=true;},controls:()=>({spin:nodes.spin.disabled,auto:nodes.auto.disabled})};`);
 context.activeFixture=value=>{active=value;};
 vm.runInNewContext(executable,context,{filename:'multihot40-app.mjs'});
 context.qa.setup(session);
 return {qa:context.qa,starts,stops,elements,document,get autoActive(){return active;},dispatch(name){for(const handler of events.get(name)||[])handler({});},resolveCollect(){resolveCollect();}};
}

test('actual Play Now app stops AUTO and refuses new spins on visible-window blur',async()=>{
 const h=await liveAppHarness();h.qa.setActive(true);
 h.dispatch('blur');
 assert.ok(h.stops.includes('page-blur'));
 assert.equal(h.qa.canStart(),false);
 assert.equal(await h.qa.doStart(),false);
 assert.equal(h.starts.length,0);
 h.dispatch('focus');
 assert.equal(h.autoActive,false);
 assert.equal(h.qa.canStart(),true);
 assert.equal(await h.qa.doStart(),true);
 assert.deepEqual(h.starts,['1.00']);
});

test('actual Play Now app does not open another wager after collect resolves in a blurred window',async()=>{
 const h=await liveAppHarness({collect:true});
 const starting=h.qa.doStart();
 h.dispatch('blur');h.resolveCollect();
 assert.equal(await starting,false);
 assert.equal(h.starts.length,0);
});


test('actual Play Now app retains confirmation of an already submitted round after blur',async()=>{
 let resolveRound;
 const h=await liveAppHarness({startResult:()=>new Promise(resolve=>{resolveRound=resolve;})});
 const submitted=h.qa.doStart();
 assert.deepEqual(h.starts,['1.00']);
 h.dispatch('blur');resolveRound(true);
 assert.equal(await submitted,true);
 assert.equal(h.starts.length,1);
 assert.equal(h.qa.canStart(),false);
 assert.equal(h.autoActive,false);
});
