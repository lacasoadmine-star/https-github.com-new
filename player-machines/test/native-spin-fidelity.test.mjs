import test from 'node:test';
import assert from 'node:assert/strict';
import {MachineRenderer} from '../public/renderer.mjs';
import {drawOfficialBlurSymbol,drawOfficialFoxyWheel,drawOfficialFoxyWinPanel,drawOfficialFoxyPaylines} from '../public/official-presentation.mjs';

const targets=['multi_hot_5_video','hot_foxy_20'];
test('delayed or failed native timeline loading never enables generic target-game confetti',()=>{
 const oldRAF=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=()=>1;
 try{for(const id of [...targets,'multi_hot_100'])for(const failed of [false,true]){
  let bursts=0;const r=Object.assign(Object.create(MachineRenderer.prototype),{
   running:true,last:100,nativeClock:0,stats:{frames:0,draws:0,slowFrames:0,maxDelta:0},game:{id,reels:1,visual:{duration:100,stagger:0,wheelEnd:100,multiplierStrip:[1]}},
   nativePresentation:null,nativeError:failed?'NATIVE_LOAD_FAILED':undefined,reducedMotion:false,
   motion:{active:true,elapsed:100,stopped:new Set([0]),wheelStopped:true,wheelProgress:()=>1,advance(){this.active=false;},position:()=>({landed:true})},
   result:{grid:[['cherry']],finalWin:'100.00',bet:'1.00',winLines:[],bonusSpinsAwarded:0},particles:{items:[],burst(){bursts++;}},
   audio:{win(){},event(){}},draw(){},lastTick:0,lastMove:100,wheelIndex:0,
  });r.loop(116);assert.equal(bursts,targets.includes(id)?0:1);
 }}finally{globalThis.requestAnimationFrame=oldRAF;}
});
test('selected cabinets keep static originals without procedural ambient while native timelines are pending',()=>{
 for(const id of targets){let backgrounds=0;const r={ctx:{drawImage(){backgrounds++;}},game:{id,visual:{}},background:{},motion:{active:false},nativePresentation:null,result:null,presentedAt:0,reducedMotion:false,title(){},drawWheel(){},drawReels(){},particles:{draw(){}}};MachineRenderer.prototype.draw.call(r,1000,16);assert.equal(backgrounds,1);}
});
test('native timeline failure never invokes procedural BIG/MEGA WIN badges',()=>{
 for(const id of targets){const r={ctx:{},game:{id,visual:{}},result:{finalWin:'100.00',bet:'1.00'},presentedAt:1000,nativePresentation:null,officialArt:null,reducedMotion:false};assert.doesNotThrow(()=>MachineRenderer.prototype.win.call(r,1200));}
});
test('blur uses original source-canvas placement, with no synthetic repeated symbol',()=>{
 for(const [id,key,symbol] of [['hot_foxy_20','Box/Blur/0','fox'],['multi_hot_5_video','BlurBox/0','orange']]){
  const image={width:236,height:272},calls=[],art={id,sprites:new Map([[key,image]]),meta:{[key]:{sourceSize:{w:251,h:272},spriteSourceSize:{x:7,y:0}}}};
  assert.equal(drawOfficialBlurSymbol({drawImage(...args){calls.push(args);}},art,symbol,10,20,272),true);
  assert.deepEqual(calls,[[image,27.5,20,236,272]]);assert.equal(drawOfficialBlurSymbol({},art,'unknown',0,0,272),false);
 }
});
test('Foxy authored wheel border renders once without extra screen-blended pulse',()=>{
 const keys=['Multiplier/Background','Multiplier/Wheel','Multiplier/Numbers','Multiplier/Box','Multiplier/Light','Multiplier/BorderBox'];
 const sprites=new Map(keys.map(name=>[name,{name,width:10,height:10}])),meta=Object.fromEntries(keys.map(name=>[name,{sourceSize:{w:1164,h:1164},spriteSourceSize:{x:0,y:0}}]));
 const draws=[],properties=[],c=new Proxy({drawImage(image){draws.push(image.name);}},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>{properties.push([k,v]);o[k]=v;return true;}});
 assert.equal(drawOfficialFoxyWheel(c,{sprites,meta},{angle:0,winning:true,age:1000}),true);
 assert.equal(draws.filter(k=>k==='Multiplier/BorderBox').length,1);assert.equal(properties.some(([k,v])=>k==='globalCompositeOperation'&&v==='screen'),false);
});
test('Foxy win meter uses original portrait texture and receipt-derived text',()=>{
 const texture={width:538,height:123},draws=[],texts=[],c=new Proxy({drawImage(...args){draws.push(args);},fillText(...args){texts.push(args);},measureText:t=>({width:t.length*8})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 assert.equal(drawOfficialFoxyWinPanel(c,{id:'hot_foxy_20',sprites:new Map([['Vertical/Start/FooterWin',texture]])},{amount:12.5}),true);
 assert.deepEqual(draws[0],[texture,8.25,413.25,403.5,92.25]);assert.deepEqual(texts.map(t=>t[0]),['WIN','12.50','ETB']);
});
test('Foxy native line artwork follows receipt topology and expires after authored fade',()=>{
 const image={width:517,height:40},draws=[],art={sprites:new Map([['Box/Line/2',image]]),meta:{'Box/Line/2':{spriteSourceSize:{x:1,y:127}}}},line={line:1,rows:[1,1,1,1,1]},other={line:2,rows:[0,0,0,0,0]},result={winLines:[line,other]};
 const c={globalAlpha:1,save(){},restore(){},drawImage(...a){draws.push(a);}};
 assert.equal(drawOfficialFoxyPaylines(c,art,{result,age:500}),line);assert.equal(draws.length,1);assert.equal(draws[0][0],image);
 assert.equal(drawOfficialFoxyPaylines(c,art,{result,age:1701}),other);assert.equal(draws.length,1);
 drawOfficialFoxyPaylines(c,art,{result,age:99999,reducedMotion:true});assert.equal(draws.length,2);
});
test('MH5 native highlights do not receive an extra generic all-line flash',()=>{
 let genericPaths=0,native=0;const c=new Proxy({beginPath(){genericPaths++;},measureText:t=>({width:t.length*5})},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const line={line:1,rows:[1,1,1],positions:[[1,0],[1,1],[1,2]],baseWin:'1.00',win:'2.00',symbol:'cherry',count:3};
 const r={game:{id:'multi_hot_5_video',visual:{x:80,y:137,w:336,h:252},reels:3,rows:3},result:{winLines:[line,{...line,line:2}],wheelMultiplier:2},presentedAt:1000,reducedMotion:false,ctx:c,nativePresentation:{multiHighlights(){native++;}},atlas:{get:()=>null}};
 MachineRenderer.prototype.paylines.call(r,1250);assert.equal(native,1);assert.equal(genericPaths,0);
});
