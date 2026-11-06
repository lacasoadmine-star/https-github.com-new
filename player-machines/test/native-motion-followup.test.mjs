import test from 'node:test';
import assert from 'node:assert/strict';
import {foxyPendingColumn,foxyPendingWheel,foxyWinShade,foxyWinProgress,foxyWinTap,multiLineSchedule,multiSymbolOpacity} from '../public/native-motion-profile.mjs';
import {MachineRenderer} from '../public/renderer.mjs';
import {ReelMotion} from '../public/motion.mjs';
import {NativeWinLayer} from '../public/native-win-layer.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const line=(number,amount)=>({line:number,baseWin:String(amount),win:String(amount),positions:[[1,0],[1,1],[1,2]],rows:[1,1,1],symbol:'cherry',count:3});

test('Foxy starts all reels with authored lift, then continuous native-speed motion while awaiting the server',()=>{
 for(const turbo of [false,true])for(let col=0;col<5;col++){
  const first=125+col*(turbo?25:200),lift=15/(230*.49);
  close(foxyPendingColumn(0,col,turbo).displacement,0);
  close(foxyPendingColumn(first/2,col,turbo).displacement,-lift*.75);
  assert.equal(foxyPendingColumn(first-.001,col,turbo).blur,false);
  close(foxyPendingColumn(first,col,turbo).displacement,-lift);
  assert.equal(foxyPendingColumn(first,col,turbo).blur,true);
  close(foxyPendingColumn(first+62.5,col,turbo).displacement,0);
  close(foxyPendingColumn(first+62.5+(turbo?325:125),col,turbo).displacement,3);
  assert.ok(foxyPendingColumn(60000,col,turbo).displacement>100);
 }
});
test('Foxy awaiting wheel uses source backstep and continuous normal/turbo turns',()=>{
 for(const turbo of [false,true]){const angle=1.4,back=Math.PI/20,duration=turbo?200:1000;
  close(foxyPendingWheel(0,angle,turbo),angle);
  close(foxyPendingWheel(100,angle,turbo),angle-back/2);
  close(foxyPendingWheel(200,angle,turbo),angle-back);
  close(foxyPendingWheel(200+duration,angle,turbo),angle-back+2*Math.PI);
 }
});
test('native Foxy shade uses strict tier threshold, source delay, swing fade and full counter lifecycle',()=>{
 for(const amount of [0,15])assert.equal(foxyWinShade(amount,1,2000),0);
 for(const amount of [15.01,30,50,100,500]){
  assert.equal(foxyWinShade(amount,1,1499),0);close(foxyWinShade(amount,1,1600),.35);close(foxyWinShade(amount,1,1700),.7);
  assert.equal(foxyWinShade(amount,1,15199),.7);assert.equal(foxyWinShade(amount,1,15200),0);
  assert.equal(foxyWinShade(amount,1,2000,{dismissed:true}),0);
 }
 close(foxyWinProgress(2499),0);close(foxyWinProgress(2500+5850),.5);close(foxyWinProgress(14200),1);
 assert.equal(foxyWinTap(2000),'dismiss');assert.equal(foxyWinTap(3000),'complete');assert.equal(foxyWinTap(3000,true),'dismiss');assert.equal(foxyWinTap(14200),'dismiss');
});
test('MH5 lines are sorted without mutating receipts, run sequentially after native completion, and never repeat',()=>{
 const lines=[line(1,1),line(2,30),line(3,20)],copy=JSON.stringify(lines);
 assert.equal(multiLineSchedule(lines,166).selected,null);
 assert.equal(multiLineSchedule(lines,167).selected.line,2);
 assert.equal(multiLineSchedule(lines,1817).selected,null);
 assert.equal(multiLineSchedule(lines,2166).selected,null);
 assert.equal(multiLineSchedule(lines,2167).selected.line,3);
 assert.equal(multiLineSchedule(lines,4501).selected.line,1);
 assert.equal(multiLineSchedule(lines,6151).selected,null);
 assert.equal(multiLineSchedule(lines,30000).selected,null);
 assert.equal(JSON.stringify(lines),copy);
 assert.equal(multiLineSchedule([line(4,10),line(5,10)],200).selected.line,4);
 assert.equal(multiLineSchedule(lines,30000,{reducedMotion:true}).selected.line,2);
});
test('MH5 non-winning symbols use original 100ms fade and restoration; winning cells remain opaque',()=>{
 const current=line(1,20),at=seconds=>({active:[{line:current,seconds}]});
 assert.equal(multiSymbolOpacity(at(.5),1,1),1);
 close(multiSymbolOpacity(at(0),0,0),1);close(multiSymbolOpacity(at(.05),0,0),.75);
 close(multiSymbolOpacity(at(.5),0,0),.5);close(multiSymbolOpacity(at(1.55),0,0),.75);close(multiSymbolOpacity(at(1.6),0,0),1);
 assert.equal(multiSymbolOpacity({active:[]},0,0),1);
});
const context=draws=>new Proxy({createLinearGradient(){return {addColorStop(){}};},drawImage(image,...args){if(typeof image==='string')draws.push([image,...args]);}},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function renderer(id='hot_foxy_20'){
 const events=[],draws=[],visual={x:8,y:165,w:404,h:257,duration:1100,stagger:200,startStagger:0,travel:16,wheelEnd:1150,multiplierStrip:[1,2,3,4,5]};
 const game={id,reels:5,rows:3,visual,wheel:{position:'top'},strips:Array.from({length:5},(_,c)=>Array.from({length:50},(_,i)=>`s${c}-${i}`))};
 const grid=Array.from({length:3},(_,r)=>Array.from({length:5},(_,c)=>`old${c}-${r}`));
 const r=Object.assign(Object.create(MachineRenderer.prototype),{game,grid,motion:new ReelMotion(visual,5),nativeAngleTarget:1.3,wheelIndex:0,ctx:context(draws),atlas:{get:s=>s},reelSurface:{},particles:{clear(){}},audio:{event(...e){events.push(e);},stop(...e){events.push(['stop',...e]);}},winLayer:{frame(){}},nativeClock:0,presentedAt:500,nativeWinSkipClock:null});
 return {r,events,draws};
}
test('awaiting motion is target-only and cancellation cannot mutate the last validated grid or create a result',()=>{
 for(const id of ['multi_hot_5_video','multi_hot_100','wild_multi_stars']){const {r,events}=renderer(id);assert.equal(r.beginPendingSpin(),null);assert.equal(events.length,0);}
 const {r,events}=renderer(),before=structuredClone(r.grid),token=r.beginPendingSpin();
 assert.ok(token);assert.equal(r.beginPendingSpin(),null);assert.equal(r.cancelPendingSpin({}),false);
 token.elapsed=900;r.drawReels(2000);assert.deepEqual(r.grid,before);assert.equal(r.result,undefined);
 assert.equal(r.cancelPendingSpin(token),true);assert.deepEqual(r.grid,before);assert.equal(r.result,undefined);assert.equal(r.motion.active,false);
 assert.deepEqual(events,[['start'],['stop','reels']]);assert.equal(r.cancelPendingSpin(token),false);
});
test('validated response carries the visible pending frame without a jump, duplicates no start sound, and retains exact stops',()=>{
 for(const elapsed of [0,50,187.5,800,2500]){
  const {r,events,draws}=renderer();const token=r.beginPendingSpin();token.elapsed=elapsed;r.drawReels(3000);const before=draws.splice(0);
  const result={gameId:'foxy_hot_20_native',stops:[8,12,16,20,24],wheelMultiplier:3,grid:Array.from({length:3},(_,row)=>Array.from({length:5},(_,col)=>`settled${col}-${row}`)),winLines:[],finalWin:'0.00'};
  r.nativeWinSkipClock=1;void r.start(result);r.drawReels(3000);assert.equal(draws.length,before.length);
  draws.forEach((draw,i)=>{assert.equal(draw[0],before[i][0]);draw.slice(1).forEach((v,j)=>close(v,before[i][j+1]));});
  assert.equal(r.nativeWinSkipClock,null);assert.deepEqual(r.motion.targets,result.stops);assert.equal(r.result,result);assert.equal(r.pendingSpin,null);assert.equal(r.cancelPendingSpin(token),false);
  assert.deepEqual(events,[['start']]);assert.equal(r.game.id,'hot_foxy_20');assert.equal(result.gameId,'foxy_hot_20_native');
 }
});
test('new native shade never replaces failed native timelines with an empty dimmed game',()=>{
 const shades=[],r={game:{id:'hot_foxy_20',visual:{}},ctx:{drawImage(){}},background:{},result:{finalWin:'100',bet:'1'},presentedAt:1000,nativePresentation:null,nativeWinDismissed:false,winLayer:{frame(alpha){shades.push(alpha);}},motion:{active:false},title(){},drawWheel(){},drawReels(){},paylines(){},win(){},particles:{draw(){}}};
 MachineRenderer.prototype.draw.call(r,3000,16);assert.deepEqual(shades,[0]);assert.equal(r.celebrating,false);
});
test('MH5 reduced-motion mode uses a static native line instead of entering procedural fallback',()=>{
 const calls=[],r={game:{id:'multi_hot_5_video'},result:{winLines:[line(1,10)],wheelMultiplier:2},presentedAt:1000,reducedMotion:true,ctx:{},atlas:{get:()=>null},nativePresentation:{multiHighlights(...args){calls.push(args);return null;}}};
 assert.doesNotThrow(()=>MachineRenderer.prototype.paylines.call(r,2000));assert.equal(calls.length,1);assert.equal(calls[0][3],true);
});
test('win shade intercepts pointer and keyboard dismissal without invoking spin, and cleans up',()=>{
 const previous=globalThis.document,children=[],listeners=new Map(),removed=[];let dismissed=0,prevented=0,stopped=0;
 globalThis.document={createElement(tag){const element={tag,style:{},setAttribute(){},addEventListener(name,fn){listeners.set(tag+name,fn);},removeEventListener(name){listeners.delete(tag+name);},remove(){removed.push(tag);}};if(tag==='canvas')element.getContext=()=>({setTransform(){},clearRect(){}});return element;}};
 try{const layer=new NativeWinLayer({width:780,height:1671,parentElement:{append(...els){children.push(...els);}}},()=>dismissed++);
  layer.frame(.7);assert.equal(layer.active,true);assert.equal(layer.shade.style.opacity,'0.7');assert.equal(layer.canvas.width,780);assert.equal(children.length,2);
  const event={preventDefault(){prevented++;},stopPropagation(){stopped++;}};listeners.get('divpointerdown')(event);listeners.get('divkeydown')({...event,key:'Enter'});listeners.get('divkeydown')({...event,key:'x'});assert.equal(dismissed,2);assert.equal(prevented,2);assert.equal(stopped,2);
  layer.frame(0);assert.equal(layer.active,false);layer.destroy();assert.equal(listeners.size,0);assert.deepEqual(removed,['div','canvas']);
 }finally{globalThis.document=previous;}
});
test('reduced motion still reveals and removes native win artwork at the authored milestones',()=>{
 const old=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=()=>1;
 try{const changes=[],r=Object.assign(Object.create(MachineRenderer.prototype),{running:true,reducedMotion:true,last:1000,nativeClock:0,stats:{frames:0,draws:0,slowFrames:0,maxDelta:0},motion:{active:false},nativePresentation:{},winLayer:{active:false},nativeWinSkipClock:null,nativeWinDismissed:false,presentedAt:100,result:{finalWin:20,bet:1},particles:{items:[]},draw(now){this.winLayer.active=now-this.presentedAt<15200;changes.push(this.winLayer.active);}});
 r.loop(1700);r.loop(1800);r.loop(15301);assert.deepEqual(changes,[true,false]);
 }finally{globalThis.requestAnimationFrame=old;}
});
