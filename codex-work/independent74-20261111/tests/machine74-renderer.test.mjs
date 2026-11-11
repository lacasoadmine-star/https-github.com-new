import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {syntheticMinesDefinition} from '../server/tests/support/synthetic-mines-math.mjs';
import {MACHINE_PROFILES, presentationProfile, machineGeometry, machineMarkup, renderMachine,
  animateRound, minorText, presentationTier, plinkoGeometry, wheelRotation, multiplierWheelRotation} from '../client/machine74-renderer.mjs';

const definitions = math.listGameDefinitions();
const definition = slug => publicLibrary74Definition(math.getGameDefinition('ind74_official_' + slug));
const publicFixture = full => {
  const betMinor=full.limits.minBetMinor;
  const context=full.chargingFeature?{bucket:math.chargingCarryBucket(full,betMinor),priorCarry:math.emptyChargingCarry()}:undefined;
  const stored = math.startRound({gameId:full.id,betMinor,context,rng:()=>0,now:1700000000000});
  return math.publicRound(stored,1700000000000);
};
const count = (text, pattern) => [...text.matchAll(pattern)].length;
// Generic mine-renderer privacy coverage uses an isolated synthetic model.
// It borrows an existing art palette only; actual Mine Island is a ladder
// and is covered with that geometry in the complete 72-title matrix above.
const syntheticMineView=()=>publicLibrary74Definition({...syntheticMinesDefinition(),id:'ind74_official_mineisland'});

test('all 72 public identities have distinct explicit original-art profiles; retained games are excluded', () => {
  assert.equal(Object.keys(MACHINE_PROFILES).length,72);
  assert.equal(new Set(Object.values(MACHINE_PROFILES).map(profile=>profile.background+'|'+profile.accent+'|'+profile.trim)).size,72);
  for (const full of definitions) {
    const profile = presentationProfile(publicLibrary74Definition(full));
    assert.equal(profile.artwork,'original-code');
    assert.equal(profile.referenceParityVerified,false);
    assert.equal(profile.mechanicsSource,'public-definition');
  }
  assert.equal(MACHINE_PROFILES.ind74_official_multihot5,undefined);
  assert.equal(MACHINE_PROFILES.ind74_official_foxyhot20,undefined);
});

for (const full of definitions) test(full.catalogName + ': ready and server public result render without private state', () => {
  const view = publicLibrary74Definition(full), round = publicFixture(full);
  const before = JSON.stringify(round);
  const ready = machineMarkup(view), result = machineMarkup(view,round);
  assert.ok(ready.includes('data-profile="'+view.id+'"'));
  assert.ok(result.includes('data-family="'+view.family+'"'));
  assert.equal(JSON.stringify(round),before,'presentation must not mutate a public round');
  assert.equal(machineMarkup(view,{...round,private:{future:'DO_NOT_DISPLAY',mines:[0,1,2]}}),result);
  assert.doesNotMatch(ready + result,/<(?:img|iframe|video|audio|script)\b|onclick=|balance|DO_NOT_DISPLAY/i);
  if (full.family === 'slots') {
    const {rows,columns} = machineGeometry(view);
    if(full.slotMechanic==='tumble'){
      assert.equal(count(result,/data-tumble-cell="/g),rows*columns);
      assert.equal(count(result,/class="m74-reel-window/g),0);
    }else{
      assert.equal(count(result,/class="m74-symbol(?: is-winning)?"/g),rows*columns);
      assert.equal(count(result,/class="m74-reel-window(?: is-expanded)?"/g),columns);
    }
  }
  if (full.family === 'plinko') assert.equal(count(result,/data-bucket="/g),view.rows+1);
  if (full.family === 'wheel') assert.equal(count(result,/data-sector="/g),view.sectors.length);
  if (full.family === 'mines') assert.equal(count(result,/data-m74-cell="/g),view.cells);
});

test('observed Multi Hot 40 and 100 use four rows and their published multiplier placement', () => {
  for (const slug of ['multihot40','multihot100']) {
    const view = definition(slug), markup = machineMarkup(view);
    assert.deepEqual(machineGeometry(view),{rows:4,columns:5});
    assert.equal(count(markup,/class="m74-symbol"/g),20);
  }
  assert.match(machineMarkup(definition('multihot40')),/m74-multiplier-arc/);
  const unfinished=definition('multihot40');delete unfinished.multiplierValues;unfinished.layout.multiplier.calculationImplemented=false;
  const pending = machineMarkup(unfinished);
  assert.match(pending,/m74-multiplier-pending/);
  assert.match(pending,/Weli la dhisayo/);
  assert.doesNotMatch(pending,/m74-multiplier-reel/);
  assert.match(machineMarkup(definition('multihot100')),/m74-multiplier-reel/);
});

test('top multiplier wheels use server factors across all published values without selecting a ready result',()=>{
  for(const slug of ['multihot10','multihot20','multihot40','multihot5burnwilds']){
    const view=definition(slug),ready=machineMarkup(view);
    assert.match(ready,/m74-multiplier-arc/);
    assert.match(ready,/data-selected-multiplier=""/);
    assert.doesNotMatch(ready,/m74-multiplier-sector factor-\d is-selected/);
    assert.doesNotMatch(ready,/m74-multiplier-reel/);
    for(const [index,value]of view.multiplierValues.entries()){
      const round=publicFixture(math.getGameDefinition(view.id));round.outcome.reelMultiplier=value;
      const before=JSON.stringify(round),markup=machineMarkup(view,round);
      assert.equal(multiplierWheelRotation(view,round),-index*360/view.multiplierValues.length);
      assert.match(markup,new RegExp('data-selected-multiplier="'+value+'"'));
      assert.equal(count(markup,/m74-multiplier-sector factor-\d is-selected/g),1);
      assert.equal(JSON.stringify(round),before);
    }
    const invalid=publicFixture(math.getGameDefinition(view.id));invalid.outcome.reelMultiplier=999;
    assert.throws(()=>machineMarkup(view,invalid),/server reel multiplier/);
  }
});

test('geometry follows published columns and rejects a conflicting layout', () => {
  const view = definition('multihot20');
  view.rows=3;view.cols=3;view.layout={...view.layout,rows:3,columns:3};
  view.paylines=[[0,0,0],[1,1,1],[2,2,2]];
  assert.deepEqual(machineGeometry(view),{rows:3,columns:3});
  assert.equal(count(machineMarkup(view),/class="m74-symbol"/g),9);
  assert.throws(()=>machineMarkup({...view,cols:5}),/must agree/);
});

test('PopX cascade presentation uses only the current public6×5 board and supplied matches', () => {
  const view={...definition('popx'),crashMechanic:'cascade',rows:5,cols:6,minMatch:8,
    layout:{kind:'cascade',rows:5,columns:6},symbols:Array.from({length:11},(_,index)=>({id:'fixture-'+index,label:'Fixture symbol '+index,glyph:String(index)}))};
  assert.deepEqual(machineGeometry(view),{rows:5,columns:6,cascade:true});
  const ready=machineMarkup(view);
  assert.equal(count(ready,/class="m74-cascade-cell is-waiting"/g),30);
  assert.doesNotMatch(ready,/data-symbol=/);
  const grid=Array.from({length:5},(_,row)=>Array.from({length:6},(_,column)=>view.symbols[(row+column)%11].id));
  const round={gameId:view.id,status:'active',multiplierBps:12500,collectibleMinor:'125',outcome:{kind:'cascade',grid,cascadeIndex:1,matchedPositions:[{row:0,col:0},{row:1,col:1}]}};
  const markup=machineMarkup(view,round);
  assert.equal(count(markup,/class="m74-cascade-cell(?: is-matched)?"/g),30);
  assert.equal(count(markup,/class="m74-cascade-cell is-matched"/g),2);
  assert.match(markup,/1\.25×/);assert.match(markup,/CASCADE 1/);
  assert.equal(machineMarkup(view,{...round,private:{frames:[{grid:'never reveal'}],terminalAt:12345}}),markup);
  assert.throws(()=>machineMarkup(view,{...round,outcome:{...round.outcome,grid:[['unknown']]}}),/server reel grid/);
});

test('reel highlights use server-supplied positions and do not infer winning lines', () => {
  const view=definition('multihot100'), id=view.symbols[0].id;
  const grid=Array.from({length:4},()=>Array(5).fill(id));
  const round={gameId:view.id,status:'settled',outcome:{grid,lineWins:[]},winMinor:'0',betMinor:'100'};
  assert.equal(count(machineMarkup(view,round),/class="m74-symbol is-winning"/g),0);
  round.outcome.lineWins=[{positions:[{row:3,col:0},{row:2,col:1},{row:1,col:2},{row:0,col:3},{row:1,col:4}]}];
  assert.equal(count(machineMarkup(view,round),/class="m74-symbol is-winning"/g),5);
  assert.match(machineMarkup(view,round),/points="100\.00,875\.00 300\.00,625\.00 500\.00,375\.00 700\.00,125\.00 900\.00,375\.00"/);
});

test('explicit public Wild symbols and expanded columns display without deriving expansion', () => {
  const view=definition('multihot5burnwilds'),wild={id:'public-wild',label:'Wild',glyph:'W'};
  view.wildSymbol=wild;
  const {rows,columns}=machineGeometry(view),grid=Array.from({length:rows},()=>Array(columns).fill(wild.id));
  const round={gameId:view.id,status:'settled',outcome:{grid,lineWins:[],expandedColumns:[1,2]},winMinor:'0'};
  assert.equal(count(machineMarkup(view,round),/class="m74-wild"/g),rows*columns);
  assert.equal(count(machineMarkup(view,round),/class="m74-reel-window is-expanded"/g),2);
  delete round.outcome.expandedColumns;
  assert.equal(count(machineMarkup(view,round),/class="m74-reel-window is-expanded"/g),0);
});

test('current public wild models render their real 3×3 geometry and server expansion', () => {
  for (const slug of ['multihot5wild','multihot5burnwilds']) {
    // The final eligible symbol ticket is Wild; use the current model's bound
    // so adding a regular symbol does not silently turn this into a non-Wild test.
    const view=definition(slug),stored=math.startRound({gameId:view.id,betMinor:'100',rng:bound=>bound-1,now:1700000000000});
    const round=math.publicRound(stored,1700000000000),markup=machineMarkup(view,round);
    assert.equal(count(markup,/class="m74-wild"/g),9);
    assert.equal(machineGeometry(view).rows,3);
    assert.equal(machineGeometry(view).columns,slug==='multihot5wild'?3:5);
    assert.equal(count(markup,/class="m74-reel-window is-expanded"/g),round.outcome.expandedColumns.length);
  }
});

test('malformed server grids, mismatched game identities and future Plinko paths are refused', () => {
  const slot=definition('multihot100'),round=publicFixture(math.getGameDefinition(slot.id));
  assert.throws(()=>machineMarkup(slot,{...round,gameId:'another-game'}),/another machine/);
  assert.throws(()=>machineMarkup(slot,{...round,outcome:{...round.outcome,grid:[['unknown']]}}),/server reel grid/);
  const plinko=definition('plinkoxclassic'),valid=publicFixture(math.getGameDefinition(plinko.id));
  assert.throws(()=>machineMarkup(plinko,{...valid,outcome:{...valid.outcome,path:Array(16).fill(1),bucket:0}}),/server Plinko path/);
  assert.throws(()=>plinkoGeometry(plinko,Array(16).fill(2)),/server-supplied Plinko path/);
});

test('Plinko uses all 16 public rows and 17 buckets, with server path ending at its bucket', () => {
  const view=definition('plinkoxclassic'),path=Array(16).fill(1),geometry=plinkoGeometry(view,path);
  assert.equal(geometry.rows,16);assert.equal(geometry.columns,17);
  assert.equal(geometry.points.length,18);
  assert.equal(geometry.points.at(-1).y,392);
  assert.ok(Math.abs(geometry.points.at(-1).x-(300+8*geometry.dx))<1e-9);
  const markup=machineMarkup(view);
  assert.match(markup,/m74-ball-legend/);
  assert.doesNotMatch(markup,/BALL [0-9]+×/,'ready stage must not invent a selected ball');
  assert.equal(count(markup,/data-bucket="/g),17);
});

test('Plinko colors and multipliers use only revealed server outcomes', () => {
  const view=definition('plinkoxclassic');
  for (const [ticket,type,factor] of [[0,'pink',1],[995,'orange',5],[999,'fire',10]]) {
    const stored=math.startRound({gameId:view.id,betMinor:'100',rng:bound=>bound===1000?ticket:0,now:1700000000000});
    const round=math.publicRound(stored,1700000000000),markup=machineMarkup(view,round);
    assert.match(markup,new RegExp('m74-plinko-ball m74-ball-'+type));
    assert.match(markup,new RegExp('BALL '+factor+'×'));
    assert.match(markup,new RegExp(minorText(round.winMinor).replace(/[.,]/g,'\\$&')));
  }
});

test('wheel rotates to the supplied sector and rejects an unknown result', () => {
  const view=definitions.map(publicLibrary74Definition).find(game=>game.family==='wheel');
  view.sectors.forEach((sector,index)=>assert.equal(wheelRotation(view,{outcome:{sector:sector.id}}),-(index+.5)*360/view.sectors.length));
  assert.throws(()=>machineMarkup(view,{status:'settled',outcome:{sector:'not-a-sector'}}),/server wheel sector/);
});

test('synthetic generic mine renderer reveals no hidden board before settlement', () => {
  const view=syntheticMineView();
  const active={gameId:view.id,status:'active',allowedActions:['reveal','collect'],history:[],private:{mines:[0]},mineCells:[1]};
  assert.equal(count(machineMarkup(view,active),/m74-mine-cell mine/g),0);
  assert.equal(count(machineMarkup(view,{...active,status:'settled'}),/m74-mine-cell mine/g),1);
  const revealed={...active,history:[{cell:2,survived:true},{cell:3,survived:false}]};
  assert.equal(count(machineMarkup(view,revealed),/m74-mine-cell safe/g),1);
  assert.equal(count(machineMarkup(view,revealed),/m74-mine-cell lost/g),1);
});

test('native settled payout fields and pending awards are distinct; formatting stays integer-safe', () => {
  assert.equal(minorText('999999999999999999999999'),'9,999,999,999,999,999,999,999.99');
  assert.equal(minorText('-1'),'—');assert.equal(minorText('abc'),'—');
  assert.equal(presentationTier({status:'settled',payoutMinor:'2000',stakeMinor:'100'}).key,'big');
  assert.equal(presentationTier({status:'active',pendingWinMinor:'2000',stakeMinor:'100'}),null);
  const view=definition('multihot100'),round=publicFixture(math.getGameDefinition(view.id));
  const pending={...round,status:'active',winMinor:'0',pendingWinMinor:'2000',gambleHistory:[{color:'red',revealedColor:'black'},{color:'black',revealedColor:'red'}]};
  const markup=machineMarkup(view,pending);
  assert.match(markup,/WIN TO COLLECT/);assert.match(markup,/20\.00/);
  assert.equal(count(markup,/class="m74-card m74-card-/g),2);
  assert.doesNotMatch(markup,/m74-result/);
  assert.ok(markup.indexOf('m74-card-black')<markup.indexOf('m74-card-red'),'show revealed card colors, not chosen colors');
  assert.equal(count(machineMarkup(view,{...pending,gambleHistory:[{color:'red'}]}),/class="m74-card m74-card-/g),0,'a choice without a revealed card remains hidden');
  assert.match(machineMarkup(view,{...pending,status:'settled',payoutMinor:'0'}),/GAMBLE RESULT/);
});

test('held-slot public start and actual revealed gamble history render without player-choice substitution', () => {
  const view=definition('multihot100');
  const held=math.startRound({gameId:view.id,betMinor:'100',options:{holdWin:true},rng:()=>0,now:1700000000000});
  assert.equal(held.status,'active');
  assert.match(machineMarkup(view,math.publicRound(held)),/WIN TO COLLECT/);
  const lost=math.advanceRound(held,{color:'black'},1700000000000,()=>0);
  const publicLost=math.publicRound(lost),markup=machineMarkup(view,publicLost);
  assert.equal(publicLost.gambleHistory[0].color,'black');
  assert.equal(publicLost.gambleHistory[0].revealedColor,'red');
  assert.match(markup,/class="m74-card m74-card-red"/);
  assert.doesNotMatch(markup,/class="m74-card m74-card-black"/);
  assert.match(markup,/GAMBLE RESULT/);
});

test('server labels are escaped before entering DOM markup', () => {
  const view=definition('multihot100');view.catalogName='<img src=x onerror="alert(1)">';
  view.symbols[0].label='<script>bad()</script>';
  const markup=machineMarkup(view);
  assert.doesNotMatch(markup,/<img|<script|onerror="/);
  assert.match(markup,/&lt;img/);
  assert.match(markup,/&lt;script&gt;/);
});

class FakeStage {
  constructor(){this.innerHTML='';this.listeners=new Map();this.classes=new Set();this.properties={};this.style={setProperty:(key,value)=>this.properties[key]=value};this.classList={add:(...values)=>values.forEach(value=>this.classes.add(value)),remove:(...values)=>values.forEach(value=>this.classes.delete(value)),toggle:(value,on)=>on?this.classes.add(value):this.classes.delete(value)};}
  replaceChildren(){}
  querySelector(){return null;}
  querySelectorAll(){return [];}
  contains(){return true;}
  addEventListener(type,handler){this.listeners.set(type,handler);}
  removeEventListener(type,handler){if(this.listeners.get(type)===handler)this.listeners.delete(type);}
  click(cell,disabled=false){const button={disabled,dataset:{m74Cell:String(cell)}};this.listeners.get('click')?.({target:{closest:()=>button}});}
}

test('synthetic mine cell actions require server permission; replacing/disposal removes stale listeners', () => {
  const view=syntheticMineView(),stage=new FakeStage(),actions=[];
  const round={gameId:view.id,status:'active',allowedActions:['reveal'],history:[]};
  let mounted=renderMachine(stage,view,round,{onAction:event=>actions.push(event)});
  stage.click(4);assert.deepEqual(actions,[{type:'reveal',options:{cell:4}}]);
  stage.click(-1);stage.click(view.cells);stage.click(2,true);assert.equal(actions.length,1);
  mounted=renderMachine(stage,view,{...round,allowedActions:[]},{onAction:event=>actions.push(event)});
  stage.click(4);assert.equal(actions.length,1);
  mounted=renderMachine(stage,view,round,{disabled:true,onAction:event=>actions.push(event)});
  stage.click(4);assert.equal(actions.length,1);
  mounted.dispose();assert.equal(stage.listeners.size,0);
});

test('STOP exposes the supplied outcome once, emits no wager/action, and cannot restart animation', async () => {
  const full=math.getGameDefinition('ind74_official_multihot100'),view=publicLibrary74Definition(full),round=publicFixture(full),stage=new FakeStage();
  const calls=[],actions=[];const audio={cue:name=>calls.push(name),startSpin:()=>calls.push('start'),stopSpin:()=>calls.push('stop')};
  const animation=animateRound(stage,view,null,round,{audio,onAction:event=>actions.push(event)});
  animation.stop();animation.stop();
  assert.deepEqual(await animation.promise,{cancelled:false});
  await Promise.resolve();
  assert.equal(calls.includes('start'),false);
  assert.equal(calls.filter(name=>name.endsWith('Win')||name==='lose').length,1);
  assert.equal(actions.length,0);
  assert.equal(stage.classes.has('m74-animating'),false);
  assert.equal(stage.innerHTML,machineMarkup(view,round,{disabled:true}));
});

test('X2 reveals the supplied card without replaying reels or emitting another game action',async()=>{
  const view=definition('multihot10'),stage=new FakeStage(),calls=[],actions=[];
  const stored=math.startRound({gameId:view.id,betMinor:'100',options:{holdWin:true},rng:()=>0,now:1700000000000});
  const previous=math.publicRound(stored),next=math.publicRound(math.advanceRound(stored,{color:'red'},1700000000000,()=>0));
  const animation=animateRound(stage,view,previous,next,{action:'gamble',turbo:true,audio:{cue:name=>calls.push(name),startSpin:()=>calls.push('start'),stopSpin(){}},onAction:action=>actions.push(action)});
  assert.deepEqual(await animation.promise,{cancelled:false});
  assert.equal(calls.includes('start'),false);assert.equal(calls.includes('reelStop'),false);assert.equal(calls.includes('reveal'),true);
  assert.deepEqual(actions,[]);assert.match(stage.innerHTML,/m74-card m74-card-red/);
  assert.match(stage.innerHTML,/Unrevealed gamble card/,'only the next card stays facedown');
  assert.equal(stage.classes.has('m74-gamble-animating'),false);
});

test('reduced motion finishes directly and stale animations cannot overwrite a new title', async () => {
  const full=math.getGameDefinition('ind74_official_multihot100'),view=publicLibrary74Definition(full),round=publicFixture(full),stage=new FakeStage();
  const reduced=animateRound(stage,view,null,round,{reduced:true});
  assert.deepEqual(await reduced.promise,{cancelled:false});
  const stale=animateRound(stage,view,round,round);
  const next=definition('balloonx');renderMachine(stage,next);
  stale.stop();assert.deepEqual(await stale.promise,{cancelled:true});
  assert.match(stage.innerHTML,/ind74_official_balloonx/);
  assert.equal(stage.classes.has('m74-animating'),false);
});
