import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiHot20Scene} from './multihot20/scene.mjs';
import {BurnWildsScene} from './multihot5burnwilds/scene.mjs';

const variants=[
 {name:'Multi Hot 20',Scene:MultiHot20Scene,id:'fresh_multihot20'},
 {name:'Multi Hot 5 Burn Wilds',Scene:BurnWildsScene,id:'fresh_multihot5burnwilds'}
];

function canvas(){
 const gradient={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient:()=>gradient},{
  get(target,prop){return prop in target?target[prop]:()=>{}},
  set(target,prop,value){target[prop]=value;return true}
 });
 return {width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:244})};
}
function harness(Variant,{images=true}={}){
 let time=1000;
 const win=new EventTarget();win.devicePixelRatio=1;
 const doc=new EventTarget();doc.hidden=false;
 const symbols=['cherry','seven'];
 const assets=images?{cherry:{width:100,height:100,complete:true},seven:{width:100,height:100,complete:true}}:{};
 if(Variant.id==='fresh_multihot20')Object.assign(assets,{
  __wheelNumbers:{width:1093,height:1946},__wheelFrame:{width:2047,height:2047},__wheelLight:{width:2047,height:2047},
  __title:{width:633,height:152},__boxFrame:{width:1119,height:696},__background:{width:600,height:600},
  ...Object.fromEntries(['__winNice','__winText','__winCrownSmall','__winMoneyFrame','__winCoin','__winFrame',
   '__winBacklight','__winShine','__winBig','__winSuper','__winFantastic'].map(name=>[name,{width:100,height:100}]))
 });
 const audioLog=[];
 const audio={play:key=>audioLog.push(key),pauseAll:()=>audioLog.push('pause'),resumeOptedInMusic:()=>audioLog.push('music')};
 const scene=new Variant.Scene({
  canvas:canvas(),symbols,assets,audio,doc,win,strictAssets:true,
  clock:()=>time,requestFrame:cb=>setTimeout(()=>{time+=20;cb(time)},0),
  cancelFrame:id=>clearTimeout(id)
 });
 const receipt={gameId:Variant.id,roundId:'test-'+Variant.name,wheelMultiplier:3,bet:'2.00',finalWin:'3.00',grid:[
  ['cherry','seven','cherry','seven','cherry'],
  ['seven','cherry','seven','cherry','seven'],
  ['cherry','seven','cherry','seven','cherry']
 ],winLines:[{positions:[[0,0],[0,1],[0,2]]}],features:{expandedWildReels:[1,3]}};
 return {scene,doc,win,audioLog,receipt};
}
for(const v of variants){
 test(v.name+': require actual symbol sprites before any animation/network SPIN',()=>{
  const {scene,audioLog}=harness(v,{images:false});
  assert.throws(()=>scene.start(),/OFFICIAL_SPRITES_NOT_READY/);
  assert.deepEqual(audioLog,[]);
  assert.equal(scene.inspect().rolling,false);
  scene.dispose();
 });
 test(v.name+': 5x3 reels use authoritative receipt; 5 stop sounds, one win',async()=>{
  const {scene,audioLog,receipt}=harness(v);
  scene.start();
  assert.equal(scene.speedUp(),true);
  assert.equal(await scene.settle(receipt),true);
  assert.equal(scene.inspect().receiptId,receipt.roundId);
  assert.equal(scene.inspect().rolling,false);
  assert.equal(audioLog.filter(x=>x==='reel-stop').length,5);
  assert.equal(audioLog.filter(x=>x==='win').length,1);
  assert.ok(scene.inspect().frames>=1);
  scene.dispose();
 });
 test(v.name+': blur and hiding immediately stop sound and finish a pending round',async()=>{
  const {scene,win,doc,audioLog,receipt}=harness(v);
  scene.start();
  const spinning=scene.settle(receipt);
  win.dispatchEvent(new Event('blur'));
  doc.hidden=false;
  doc.dispatchEvent(new Event('visibilitychange')); // still blurred despite visible document
  assert.equal(scene.hidden,true);
  assert.equal(await spinning,true);
  assert.equal(scene.inspect().rolling,false);
  assert.deepEqual(audioLog,['spin','pause','pause']);
  assert.throws(()=>scene.start(),/GAME_NOT_VISIBLE/);
  win.dispatchEvent(new Event('focus'));
  assert.equal(scene.hidden,false);
  scene.start();
  const next=scene.settle({...receipt,roundId:'second'});
  doc.hidden=true;
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(await next,true);
  assert.equal(scene.hidden,true);
  assert.ok(!audioLog.includes('win'),'hidden tab may not start a WIN sound');
  scene.dispose();
 });
 test(v.name+': reject invalid receipt grid, never create own payouts',async()=>{
  const {scene,receipt}=harness(v);
  scene.start();
  await assert.rejects(scene.settle({...receipt,grid:[['cherry']]}),/SERVER_GRID_REQUIRED/);
  scene.reset();
  assert.equal(scene.inspect().receiptId,null);
  scene.dispose();
 });
}

test('Burn Wilds expands the original Wild sprite through 3 rows only when server receipt selects a winning reel',async()=>{
 let now=1000,draws=[],frames=[];
 const symbols=['seven','cherry','wild'];
 const sprites=Object.fromEntries(symbols.map(s=>[s,{width:100,height:100,tag:s}]));
 const grad={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient:()=>grad,drawImage:(asset,x,y)=>draws.push({tag:asset.tag,x,y})},{
  get(target,prop){return prop in target?target[prop]:()=>{}},
  set(target,prop,value){target[prop]=value;return true}
 });
 const cv={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:244})};
 const doc=new EventTarget();doc.hidden=false;
 const win=new EventTarget();win.devicePixelRatio=1;
 const sounds=[];
 const audio={play:name=>sounds.push(name),pauseAll(){},resumeOptedInMusic(){}};
 const scene=new BurnWildsScene({canvas:cv,symbols,assets:sprites,audio,doc,win,
  clock:()=>now,requestFrame:callback=>setTimeout(()=>{now+=22;callback(now)},0),
  cancelFrame:id=>clearTimeout(id)});
 const grid=Array.from({length:3},()=>Array(5).fill('cherry'));
 grid[1][1]='wild';
 const receipt={gameId:'fresh_multihot5burnwilds',roundId:'round-1',grid,
  winLines:[{positions:[[1,0],[1,1],[1,2]]}],finalWin:'4.00',
  features:{expandedWildReels:[1]}};
 scene.start();
 assert.equal(scene.speedUp(),true);
 assert.equal(await scene.settle(receipt),true);
 await new Promise(resolve=>setTimeout(resolve,50));
 const XOFF=235+96;
 const paintedWildRows=new Set(draws.filter(x=>x.tag==='wild'&&x.x>=XOFF&&x.x<XOFF+96).map(x=>Math.floor((x.y-172)/96)));
 assert.deepEqual([...paintedWildRows].sort(),[0,1,2]);
 assert.equal(sounds.filter(x=>x==='fast-motion').length,1);
 assert.equal(sounds.filter(x=>x==='win').length,1);
 assert.equal(scene.inspect().receiptId,'round-1');
 scene.reset();
 assert.equal(scene.inspect().receiptId,null);
 scene.dispose();
});
