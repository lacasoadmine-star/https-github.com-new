import {fromMinor} from './session.mjs';
const TAU=Math.PI*2;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function themeKind(game){
 const id=game?.id||'';
 return /burningice/.test(id)?'ice':/safari/.test(id)?'safari':/habesha/.test(id)?'habesha':/moonstone/.test(id)?'moon':/samurai|assassin/.test(id)?'samurai':/egypt|horus/.test(id)?'egypt':/olympian/.test(id)?'olympian':/magic|garden/.test(id)?'garden':/vegas/.test(id)?'vegas':/tower/.test(id)?'tower':/coinmin/.test(id)?'mines':'classic';
}
export function frameList(round){
 if(!round)return [];
 const frames=Array.isArray(round.frames)?round.frames:Array.isArray(round.bonusFrames)?round.bonusFrames:[];
 return frames.filter(frame=>frame&&typeof frame==='object');
}
export function presentationFrame(round,index){
 const frame=frameList(round)[index];if(!frame)return null;
 if(frame.floor)return {...frame,floors:(round.floors||[]).slice(0,index+1),currentBuildingMultiplier:frame.multiplier,sequenceLast:index===frameList(round).length-1};
 return frame;
}
export function finalGridWins(round){
 if(!round)return [];const last=frameList(round).at(-1),grid=round.grid;
 const matches=Array.isArray(grid)&&Array.isArray(last?.grid)&&grid.length===last.grid.length&&grid.every((reel,c)=>Array.isArray(reel)&&Array.isArray(last.grid[c])&&reel.length===last.grid[c].length&&reel.every((symbol,r)=>symbol===last.grid[c][r]));
 if(matches)return Array.isArray(last.wins)?last.wins:[];
 if(round.omittedFrames>0)return [];
 return (round.wins||[]).filter(win=>win.frame===undefined||win.frame===frameList(round).length-1);
}
export function providedRules(game){return Array.isArray(game?.rules)?game.rules.filter(rule=>typeof rule==='string'&&rule.trim()):[];}
const validMinor=value=>typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value)?BigInt(value):null;
export function confirmedTowerAmounts(round){
 const current=validMinor(round?.currentCashoutMinor),locked=validMinor(round?.lockedPayoutMinor),stake=validMinor(round?.stakeMinor),payout=validMinor(round?.payoutMinor);
 const validBank=current!==null&&locked!==null&&locked<=current;
 let totalMultiplier='—';
 if(stake!==null&&stake>0n&&payout!==null){const scaled=payout*100n/stake;totalMultiplier=String(scaled/100n)+'.'+String(scaled%100n).padStart(2,'0');}
 return {banked:validBank?fromMinor(String(locked)):'—',atRisk:validBank?fromMinor(String(current-locked)):'—',totalMultiplier};
}
export function featureLabel(feature){
 if(typeof feature==='string')return feature.replaceAll('_',' ');
 if(!feature||typeof feature!=='object')return '';
 const label=String(feature.label||feature.type||'').replaceAll('_',' ');
 return label+(feature.multiplier?' ×'+feature.multiplier:'');
}
export function displayFamily(game,round){
 const type=String(round?.family||game?.type||'slots').toLowerCase();
 if(type.includes('tower'))return 'tower';if(type.includes('min'))return 'mines';return 'slots';
}
export function gridGeometry(width,height,columns,rows,family='slots'){
 const margin=family==='mines'?width*.065:Math.max(15,width*.052);
 const usableW=width-2*margin;
 const top=family==='mines'?height*.20:height*.19;
 const cellW=usableW/columns,cellH=Math.min((height-top-height*.13)/rows,cellW*(family==='mines'?1:1.32));
 return {x:margin,y:top,w:usableW,h:cellH*rows,cellW,cellH,columns,rows};
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function polygon(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function star(ctx,x,y,r,points=5,inner=.46){const positions=[];for(let i=0;i<points*2;i++){const a=-Math.PI/2+i*Math.PI/points,d=i%2?r*inner:r;positions.push([x+Math.cos(a)*d,y+Math.sin(a)*d]);}polygon(ctx,positions);}
function text(ctx,value,x,y,size,color='#fff',weight=800,align='center'){ctx.fillStyle=color;ctx.font=`${weight} ${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(value,x,y);}
function gradient(ctx,x,y,r,base,edge){const g=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.05,x,y,r*1.2);g.addColorStop(0,'#fff9de');g.addColorStop(.25,base);g.addColorStop(1,edge);return g;}
function orb(ctx,x,y,r,color,edge){ctx.fillStyle=gradient(ctx,x,y,r,color,edge);ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.fillStyle='#ffffff75';ctx.beginPath();ctx.ellipse(x-r*.32,y-r*.35,r*.2,r*.1,-.65,0,TAU);ctx.fill();}
function leaf(ctx,x,y,s,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle='#56cb44';ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(s*.1,-s,s,0);ctx.quadraticCurveTo(s*.2,s*.38,0,0);ctx.fill();ctx.strokeStyle='#d9ee6b';ctx.lineWidth=s*.04;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(s*.8,-s*.05);ctx.stroke();ctx.restore();}
function gem(ctx,x,y,r,color='#a7eaff'){
 ctx.fillStyle=color;polygon(ctx,[[x-r,y-r*.2],[x-r*.55,y-r*.72],[x+r*.55,y-r*.72],[x+r,y-r*.2],[x,y+r]]);ctx.fill();
 ctx.fillStyle='#ffffffaa';polygon(ctx,[[x-r*.55,y-r*.72],[x,y-r*.25],[x+r*.55,y-r*.72]]);ctx.fill();ctx.fillStyle='#ffffff50';polygon(ctx,[[x-r,y-r*.2],[x,y-r*.25],[x,y+r]]);ctx.fill();ctx.strokeStyle='#ffffff99';ctx.lineWidth=r*.025;ctx.beginPath();ctx.moveTo(x-r,y-r*.2);ctx.lineTo(x+r,y-r*.2);ctx.moveTo(x,y-r*.25);ctx.lineTo(x,y+r);ctx.stroke();
}
function coin(ctx,x,y,r,label='★',color='#ffc53c'){
 ctx.fillStyle=gradient(ctx,x,y,r,color,'#885310');ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.strokeStyle='#fff1a8';ctx.lineWidth=r*.06;ctx.beginPath();ctx.arc(x,y,r*.82,0,TAU);ctx.stroke();text(ctx,label,x,y,r*.92,'#6b3909',900);
}
export function drawSymbol(ctx,symbol,x,y,size,kind='classic',winning=false){
 const label=String(symbol?.label||symbol?.id||'GEM'),key=(String(symbol?.id)+' '+label).toLowerCase(),mark=String(symbol?.mark||label.slice(0,2)),color=symbol?.color||'#f6c955';
 ctx.save();ctx.translate(x,y);const r=size*.36;
 if(winning){ctx.shadowColor=color;ctx.shadowBlur=size*.24;}
 if(/cherr/.test(key)){
  ctx.strokeStyle='#96d857';ctx.lineWidth=r*.1;ctx.beginPath();ctx.moveTo(-r*.4,r*.1);ctx.quadraticCurveTo(-r*.2,-r*1.2,r*.4,-r*1.1);ctx.quadraticCurveTo(r*.8,-r*.4,r*.65,r*.2);ctx.stroke();leaf(ctx,r*.3,-r*.95,r*.6,-.3);orb(ctx,-r*.42,r*.25,r*.59,'#ff426b','#6d0424');orb(ctx,r*.62,r*.35,r*.64,'#ee1e45','#6d0424');
 }else if(/grape/.test(key)){
  [[-.55,-.25],[.55,-.25],[0,-.55],[-.48,.35],[.48,.35],[0,.8]].forEach(([a,b])=>orb(ctx,a*r,b*r,r*.43,'#aa5eee','#3c146e'));leaf(ctx,-r*.2,-r*.86,r*.95,-.2);
 }else if(/watermelon|melon/.test(key)){
  ctx.fillStyle='#38aa50';ctx.beginPath();ctx.arc(0,-r*.35,r*1.15,.1,Math.PI-.1);ctx.closePath();ctx.fill();ctx.fillStyle='#d9ef8c';ctx.beginPath();ctx.arc(0,-r*.35,r*.99,.1,Math.PI-.1);ctx.closePath();ctx.fill();ctx.fillStyle='#fc4960';ctx.beginPath();ctx.arc(0,-r*.35,r*.89,.1,Math.PI-.1);ctx.closePath();ctx.fill();ctx.fillStyle='#50192a';for(let i=0;i<5;i++){const a=.5+i*.52;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.6,-r*.35+Math.sin(a)*r*.6,r*.045,r*.09,a,0,TAU);ctx.fill();}
 }else if(/lemon/.test(key)){
  ctx.rotate(-.32);ctx.fillStyle=gradient(ctx,0,0,r,'#ffe149','#9d8705');ctx.beginPath();ctx.moveTo(-r*1.18,0);ctx.bezierCurveTo(-r*.6,-r*.95,r*.6,-r*.95,r*1.18,0);ctx.bezierCurveTo(r*.6,r*.95,-r*.6,r*.95,-r*1.18,0);ctx.fill();ctx.fillStyle='#fff6ac';ctx.beginPath();ctx.ellipse(-r*.25,-r*.35,r*.4,r*.1,0,0,TAU);ctx.fill();
 }else if(/orange|peach|plum|apple/.test(key)){
  const plum=/plum/.test(key);orb(ctx,0,0,r,plum?'#c76deb':/orange/.test(key)?'#ffa52e':'#f04d4e',plum?'#42165e':/orange/.test(key)?'#a84a03':'#870f26');leaf(ctx,-r*.05,-r*.85,r*.85,-.5);
 }else if(/bell/.test(key)){
  ctx.fillStyle=gradient(ctx,0,0,r,'#ffe177','#a16803');ctx.beginPath();ctx.moveTo(-r,-r*.05);ctx.quadraticCurveTo(-r*.68,-r*.2,-r*.65,-r*.6);ctx.quadraticCurveTo(0,-r*1.35,r*.65,-r*.6);ctx.quadraticCurveTo(r*.68,-r*.2,r,r*.5);ctx.quadraticCurveTo(0,r*.9,-r,r*.5);ctx.closePath();ctx.fill();orb(ctx,0,r*.7,r*.21,'#ffdb7a','#99610a');ctx.strokeStyle='#fff3b7';ctx.lineWidth=r*.08;ctx.beginPath();ctx.moveTo(-r*.63,r*.3);ctx.quadraticCurveTo(0,r*.52,r*.65,r*.3);ctx.stroke();
 }else if(/seven/.test(key)||mark==='7'||mark==='777'||mark==='77'){
  ctx.font=`italic 950 ${size*.98}px Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=size*.075;ctx.strokeStyle='#ffe38c';ctx.strokeText('7',0,2);ctx.fillStyle=gradient(ctx,0,0,r,'#ff5143','#9c0828');ctx.fillText('7',0,2);
 }else if(/book/.test(key)){
  ctx.fillStyle='#8b432b';roundRect(ctx,-r*.8,-r,r*1.6,r*2,r*.12);ctx.fill();ctx.strokeStyle='#e8bf69';ctx.lineWidth=r*.1;ctx.stroke();ctx.fillStyle='#e8d09b';ctx.fillRect(-r*.65,r*.62,r*1.3,r*.25);ctx.strokeStyle='#ffc55f';ctx.lineWidth=r*.06;ctx.strokeRect(-r*.55,-r*.76,r*1.1,r*1.15);star(ctx,0,-r*.2,r*.38,6);ctx.fillStyle='#f7d47d';ctx.fill();
 }else if(/lion|simba|fox|tiger|panther|zebra|animal/.test(key)){
  const lion=/lion|simba/.test(key);ctx.fillStyle=lion?'#924e1c':color;star(ctx,0,0,r*1.2,lion?13:5,lion?.78:.9);ctx.fill();orb(ctx,0,0,r*.86,lion?'#f7c767':'#dcb3a2',lion?'#a8651e':'#685252');ctx.fillStyle='#372d25';polygon(ctx,[[-r*.32,-r*.1],[-r*.1,-r*.16],[-r*.17,r*.01]]);ctx.fill();polygon(ctx,[[r*.32,-r*.1],[r*.1,-r*.16],[r*.17,r*.01]]);ctx.fill();polygon(ctx,[[-r*.16,r*.3],[r*.16,r*.3],[0,r*.44]]);ctx.fill();ctx.strokeStyle='#4a321c';ctx.lineWidth=r*.04;ctx.beginPath();ctx.moveTo(0,r*.44);ctx.lineTo(0,r*.6);ctx.stroke();
 }else if(/sword|katana|samurai/.test(key)){
  ctx.rotate(.5);ctx.fillStyle='#d5f4ff';polygon(ctx,[[-r*.13,r*.4],[-r*.13,-r*.86],[0,-r*1.2],[r*.13,-r*.86],[r*.13,r*.4]]);ctx.fill();ctx.fillStyle='#8aa6b9';ctx.fillRect(0,-r*.83,r*.12,r*1.2);ctx.fillStyle='#caa758';ctx.fillRect(-r*.43,r*.35,r*.86,r*.13);ctx.fillStyle='#c2314f';ctx.fillRect(-r*.13,r*.48,r*.26,r*.6);ctx.strokeStyle='#ffdeb1';ctx.lineWidth=r*.04;for(let n=0;n<4;n++){ctx.beginPath();ctx.moveTo(-r*.13,r*(.52+n*.13));ctx.lineTo(r*.13,r*(.65+n*.13));ctx.stroke();}
 }else if(/moon/.test(key)){
  ctx.fillStyle='#d9d9ff';ctx.beginPath();ctx.moveTo(r*.45,-r*.89);ctx.bezierCurveTo(-r*.85,-r*1.2,-r*1.5,r*.6,-r*.2,r);ctx.bezierCurveTo(r*.2,r*1.1,r*.7,r*.8,r*.88,r*.45);ctx.bezierCurveTo(-r*.3,r*.78,-r*.55,-r*.42,r*.45,-r*.89);ctx.fill();star(ctx,r*.7,r*.4,r*.28);ctx.fillStyle='#f4db89';ctx.fill();
 }else if(/eye|horus/.test(key)){
  ctx.strokeStyle='#edc057';ctx.lineWidth=r*.14;ctx.beginPath();ctx.moveTo(-r,0);ctx.quadraticCurveTo(0,-r,r,0);ctx.quadraticCurveTo(0,r*.7,-r,0);ctx.stroke();orb(ctx,0,0,r*.3,'#5fd8e5','#12628c');ctx.beginPath();ctx.moveTo(r*.3,r*.5);ctx.quadraticCurveTo(r*.8,r*.6,r*.4,r);ctx.moveTo(-r*.1,r*.48);ctx.lineTo(-r*.5,r);ctx.stroke();
 }else if(/scarab|beetle/.test(key)){
  ctx.strokeStyle='#f4c363';ctx.lineWidth=r*.07;for(let side of [-1,1])for(let n=0;n<3;n++){ctx.beginPath();ctx.moveTo(side*r*.35,(n-1)*r*.35);ctx.lineTo(side*r*.95,(n-1)*r*.6);ctx.stroke();}ctx.fillStyle=gradient(ctx,0,0,r,'#4ad4ca','#075a73');ctx.beginPath();ctx.ellipse(0,0,r*.6,r*.85,0,0,TAU);ctx.fill();ctx.strokeStyle='#e9c96d';ctx.beginPath();ctx.moveTo(0,-r*.8);ctx.lineTo(0,r*.85);ctx.stroke();coin(ctx,0,-r*.95,r*.24,'');
 }else if(/lightning|zeus|thunder/.test(key)){
  ctx.fillStyle='#f8d764';polygon(ctx,[[r*.3,-r*1.2],[-r*.72,r*.18],[-r*.04,r*.18],[-r*.35,r*1.2],[r*.73,-r*.32],[r*.13,-r*.32]]);ctx.fill();ctx.strokeStyle='#fff4be';ctx.lineWidth=r*.055;ctx.stroke();
 }else if(/flower|lotus|rose/.test(key)){
  for(let i=0;i<7;i++){ctx.save();ctx.rotate(i*TAU/7);ctx.fillStyle=i%2?'#f9a7d9':color;ctx.beginPath();ctx.ellipse(0,-r*.47,r*.32,r*.68,0,0,TAU);ctx.fill();ctx.restore();}orb(ctx,0,0,r*.35,'#ffe698','#be7c10');
 }else if(/wild|scatter|bonus|coin|multiplier/.test(key)){
  coin(ctx,0,0,r,/wild/.test(key)?'W':/scatter|bonus/.test(key)?'★':mark.slice(0,3),color);
 }else if(/diamond|gem|stone|crystal/.test(key))gem(ctx,0,0,r,color);
 else if(/star/.test(key)){star(ctx,0,0,r*1.1);ctx.fillStyle=gradient(ctx,0,0,r,color,'#97600c');ctx.fill();}
 else{
  const isRank=/^(10|[AKQJ])$/i.test(mark)||/card|rank/.test(key);
  if(!isRank){ctx.fillStyle='#ffffff0d';ctx.beginPath();ctx.arc(0,0,r*1.04,0,TAU);ctx.fill();ctx.strokeStyle=color+'99';ctx.lineWidth=r*.035;ctx.stroke();}
  text(ctx,mark,0,0,isRank?size*.76:Math.min(size*.66,size*1.1/Math.max(1,mark.length)),color,900);
 }
 ctx.restore();
}
export class MachineScene {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.game=null;this.width=1;this.height=1;this.frame=0;}
 setGame(game){this.game=game;this.kind=themeKind(game);this.symbols=new Map((game.symbols||[]).map(symbol=>[String(symbol.id),symbol]));}
 resize(){const rect=this.canvas.getBoundingClientRect(),dpr=Math.min(2,globalThis.devicePixelRatio||1);this.width=Math.max(1,rect.width);this.height=Math.max(1,rect.height);this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);}
 background(time){
  const c=this.ctx,w=this.width,h=this.height,theme=this.game?.theme||{},kind=this.kind;
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,theme.bg||'#102d24');sky.addColorStop(.7,theme.secondary||'#092b26');sky.addColorStop(1,'#030b13');c.fillStyle=sky;c.fillRect(0,0,w,h);
  const glow=c.createRadialGradient(w*.5,h*.4,2,w*.5,h*.4,w*.72);glow.addColorStop(0,(theme.accent||'#2fd98a')+'38');glow.addColorStop(1,'#00000000');c.fillStyle=glow;c.fillRect(0,0,w,h);
  if(kind==='ice'){
   for(let i=0;i<13;i++){const x=i*w/12,y=h*.75+(i%3)*h*.08;c.fillStyle=i%2?'#80dfff25':'#d5f8ff30';polygon(c,[[x-w*.1,h],[x,y-h*(.18+(i%4)*.055)],[x+w*.1,h]]);c.fill();}
   for(let i=0;i<26;i++){c.fillStyle='#d6faff66';c.beginPath();c.arc((i*79%997)/997*w,((i*31+time*.009)%350)/350*h,1+i%2,0,TAU);c.fill();}
  }else if(kind==='safari'){
   const sun=c.createRadialGradient(w*.74,h*.2,0,w*.74,h*.2,w*.26);sun.addColorStop(0,'#ffd98466');sun.addColorStop(1,'#ffd98400');c.fillStyle=sun;c.fillRect(0,0,w,h);
   for(let side of [0,1]){c.fillStyle='#0f211dbb';const x=w*(side?.95:.05);c.fillRect(x-3,h*.48,6,h*.5);c.beginPath();c.ellipse(x,h*.46,w*.22,h*.06,side?-.12:.12,0,TAU);c.fill();}
  }else if(kind==='egypt'){
   for(let i=0;i<3;i++){c.fillStyle=i%2?'#a16f3038':'#edb65024';const x=w*(i*.4-.05);polygon(c,[[x-w*.22,h],[x,h*.58-i*.05*h],[x+w*.3,h]]);c.fill();}c.strokeStyle='#e5bd6840';c.lineWidth=2;for(let x of [w*.035,w*.965]){c.beginPath();c.moveTo(x,h*.1);c.lineTo(x,h*.9);c.stroke();}
  }else if(kind==='samurai'){
   c.fillStyle='#e6a0a92b';c.beginPath();c.arc(w*.78,h*.18,w*.19,0,TAU);c.fill();c.strokeStyle='#341e36';c.lineWidth=5;c.beginPath();c.moveTo(0,h*.4);c.quadraticCurveTo(w*.17,h*.21,w*.25,0);c.stroke();for(let i=0;i<18;i++){c.fillStyle='#fba6bd77';c.beginPath();c.ellipse((i*71%331)/331*w,(i*47+time*.005)%h,3,1.5,i,0,TAU);c.fill();}
  }else if(kind==='garden'){
   c.strokeStyle='#71ae4a50';c.lineWidth=3;for(let side of [0,1]){c.beginPath();c.moveTo(w*side,h);c.bezierCurveTo(w*(side?.83:.17),h*.7,w*(side?.98:.02),h*.3,w*side,0);c.stroke();for(let i=0;i<7;i++)leaf(c,w*(side?.97:.03),h*(i/8),w*.06,side?Math.PI:0);}
  }else if(kind==='moon'){
   c.fillStyle='#efdcff3b';c.beginPath();c.arc(w*.77,h*.17,w*.14,0,TAU);c.fill();c.strokeStyle='#bfbdff22';for(let i=0;i<3;i++){c.beginPath();c.ellipse(w*.5,h*.5,w*(.35+i*.1),h*.4,.35,0,TAU);c.stroke();}
  }else if(kind==='olympian'){
   for(let side of [.025,.975]){c.fillStyle='#e7e2ff3b';c.fillRect(w*side-w*.02,h*.08,w*.04,h*.75);c.fillRect(w*side-w*.035,h*.08,w*.07,h*.025);c.fillRect(w*side-w*.04,h*.82,w*.08,h*.025);}
   c.fillStyle='#ffffff12';for(let i=0;i<4;i++){c.beginPath();c.ellipse(w*(i*.32),h*.88,w*.26,h*.08,0,0,TAU);c.fill();}
  }else if(kind==='vegas'){
   for(let i=0;i<12;i++){c.fillStyle=i%2?'#fb56ed38':'#4bcaff26';c.fillRect(i*w/11,h*.56-(i%3)*h*.06,w*.055,h*.44);}
  }else if(kind==='habesha'){
   c.strokeStyle='#efc65d44';c.lineWidth=2;for(let i=0;i<20;i++){const x=i*w/19;polygon(c,[[x,h*.12],[x+w*.025,h*.15],[x,h*.18],[x-w*.025,h*.15]]);c.stroke();}c.fillStyle='#ab792d2b';polygon(c,[[0,h],[w*.2,h*.7],[w*.43,h*.85],[w*.7,h*.66],[w,h*.9],[w,h]]);c.fill();
  }
  if(!['ice','tower','mines'].includes(kind))for(let i=0;i<24;i++){const alpha=.2+.2*Math.sin(time*.001+i);c.fillStyle=`rgba(255,232,166,${alpha})`;c.beginPath();c.arc((i*79%997)/997*w,(i*131%997)/997*h,1+(i%3)*.35,0,TAU);c.fill();}
 }
 draw(time,{round=null,busy=false,frame=null,preview=false}={}){
  if(!this.game||!this.ctx)return;
  this.background(time);const family=displayFamily(this.game,round),data=frame?{...round,...frame}:round?{...round,wins:finalGridWins(round)}:null;
  if(family==='mines')this.drawMines(time,data);else if(family==='tower')this.drawTower(time,data,busy);else this.drawSlots(time,data,busy,preview);
 }
 drawSlots(time,round,busy,preview){
  const c=this.ctx,w=this.width,h=this.height,game=this.game,cols=Number(game.columns)||5,rows=Number(game.rows)||3;
  const g=gridGeometry(w,h,cols,rows),accent=game.theme?.accent||'#eac45a';this.geometry=g;
  text(c,(game.ways?game.ways+' WAYS':game.paylines?game.paylines+' PAYLINES':cols+' REELS'),w/2,h*.095,clamp(w*.029,11,17),'#fff2c9',700);
  c.fillStyle='#030910cc';roundRect(c,g.x-6,g.y-6,g.w+12,g.h+12,12);c.fill();c.strokeStyle=accent;c.lineWidth=2;c.shadowColor=accent;c.shadowBlur=9;c.stroke();c.shadowBlur=0;
  const symbolList=[...this.symbols.values()];const winners=new Set((round?.wins||[]).flatMap(win=>win.cells||[]).map(cell=>cell.join(':')));
  const grid=Array.isArray(round?.grid)?round.grid:null;
  for(let col=0;col<cols;col++){
   const column=c.createLinearGradient(0,g.y,0,g.y+g.h);column.addColorStop(0,'#050c16');column.addColorStop(.48,this.kind==='classic'?'#16291d':'#162039');column.addColorStop(1,'#040b13');c.fillStyle=column;c.fillRect(g.x+col*g.cellW,g.y,g.cellW-1,g.h);
   c.save();c.beginPath();c.rect(g.x+col*g.cellW,g.y,g.cellW,g.h);c.clip();
   for(let row=0;row<rows;row++){
    const x=g.x+(col+.5)*g.cellW,y=g.y+(row+.5)*g.cellH,raw=grid?.[col]?.[row],symbol=this.symbols.get(String(typeof raw==='object'?raw?.id:raw))||symbolList[(col*3+row*2)%Math.max(1,symbolList.length)]||{id:'star',label:'Star',mark:'★',color:accent},winning=winners.has(col+':'+row);
    if(winning){c.fillStyle=accent+'25';roundRect(c,x-g.cellW*.44,y-g.cellH*.43,g.cellW*.88,g.cellH*.86,8);c.fill();c.strokeStyle=accent+'99';c.lineWidth=1.5;c.stroke();}
    const wobble=busy?Math.sin(time*.024+col)*g.cellH*.05:0;
    c.globalAlpha=busy?.52:1;drawSymbol(c,symbol,x,y+wobble,Math.min(g.cellW,g.cellH)*.91,this.kind,winning);c.globalAlpha=1;
   }
   c.restore();
   if(col){c.strokeStyle=accent+'44';c.lineWidth=1;c.beginPath();c.moveTo(g.x+col*g.cellW,g.y);c.lineTo(g.x+col*g.cellW,g.y+g.h);c.stroke();}
  }
  if(round?.wins?.length&&!busy){
   const line=round.wins[Math.floor(time/1500)%round.wins.length];if(line.cells?.length>1){c.strokeStyle=accent;c.globalAlpha=.45;c.lineWidth=2;c.beginPath();line.cells.forEach(([col,row],i)=>{const x=g.x+(col+.5)*g.cellW,y=g.y+(row+.5)*g.cellH;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();c.globalAlpha=1;}
  }
  const label=busy?'CONFIRMING…':featureLabel(round?.feature)||(!round?'SYMBOL PREVIEW':round.wins?.length?'WINNING COMBINATION':'ROUND COMPLETE');
  text(c,label.toUpperCase().slice(0,44),w/2,Math.min(h*.94,g.y+g.h+h*.062),clamp(w*.026,10,15),accent,800);
  if(busy){c.strokeStyle='#ffffffe0';c.lineWidth=2.5;c.beginPath();c.arc(w/2,h*.105,w*.025,time*.005,time*.005+Math.PI*1.35);c.stroke();}
 }
 drawMines(time,round){
  const c=this.ctx,w=this.width,h=this.height,g=gridGeometry(w,h,5,5,'mines');this.geometry=g;
  text(c,'COIN VAULT',w/2,h*.065,clamp(w*.047,17,28),'#ffe291',900);
  text(c,round?.status==='active'?String(round.multiplier||'1.00')+'×':'CHOOSE YOUR PATH',w/2,h*.13,clamp(w*.037,14,22),'#55e2b3',800);
  const picks=new Map((round?.picks||[]).map(pick=>[pick.index,pick]));
  for(let i=0;i<25;i++){
   const x=g.x+(i%5)*g.cellW+4,y=g.y+Math.floor(i/5)*g.cellH+4,cw=g.cellW-8,ch=g.cellH-8,pick=picks.get(i);
   const face=c.createLinearGradient(x,y,x,y+ch);face.addColorStop(0,pick?.safe?'#206c62':pick?'#5f2433':'#233c4b');face.addColorStop(1,pick?.safe?'#113b37':pick?'#301824':'#0c1d2a');c.fillStyle=face;roundRect(c,x,y,cw,ch,Math.min(9,cw*.15));c.fill();c.strokeStyle=pick?.safe?'#6fffd3':pick?'#f3798a':'#4a6b7880';c.lineWidth=1.2;c.stroke();
   if(pick?.safe)coin(c,x+cw/2,y+ch/2,Math.min(cw,ch)*.32,'★');else if(pick){c.fillStyle='#f07184';star(c,x+cw/2,y+ch/2,Math.min(cw,ch)*.33,8,.56);c.fill();orb(c,x+cw/2,y+ch/2,Math.min(cw,ch)*.19,'#283a4f','#071423');}
   else {gem(c,x+cw/2,y+ch/2,Math.min(cw,ch)*.16,'#6b93a4');}
  }
 }
 drawTower(time,round,busy){
  const c=this.ctx,w=this.width,h=this.height,rush=/rush/.test(this.game.id);this.geometry=null;
  for(let i=0;i<12;i++){const bw=w/9,x=i*w/11,bh=h*(.1+(i*7%5)*.026);c.fillStyle=i%2?'#173752':'#203e58';c.fillRect(x,h-bh,bw,bh);c.fillStyle='#b2ddf544';for(let a=0;a<2;a++)for(let b=0;b<4;b++)c.fillRect(x+8+a*bw*.42,h-bh+10+b*bh*.2,4,5);}
  const floors=Array.isArray(round?.floors)?round.floors:[];const amount=floors.length||0,visible=floors.slice(-10),baseY=h*.84,bw=w*.43,bh=Math.min(h*.052,32);
  c.fillStyle='#58718a';roundRect(c,w*.2,baseY,w*.6,h*.045,5);c.fill();
  if(!round){text(c,rush?'STACK THE SKY':'BUILD YOUR FORTUNE',w/2,h*.16,clamp(w*.043,16,26),'#e6f3ff',900);text(c,'Choose a stake to begin',w/2,h*.24,clamp(w*.03,11,17),'#a8c7df',600);}
  else{text(c,(rush?String(round.multiplier||'1.00'):confirmedTowerAmounts(round).totalMultiplier)+'×',w/2,h*.13,clamp(w*.075,26,44),'#ffe5a0',900);text(c,rush?'LEVEL '+String(round.level??amount):'TOTAL STAKE RETURN',w/2,h*.21,clamp(w*.031,11,18),'#aee4ff',800);if(!rush)text(c,String(round.currentBuildingMultiplier??round.totalBuildingMultiplier??0)+' BASE UNITS · '+amount+' BUILDINGS',w/2,h*.265,clamp(w*.024,9,14),'#9ab8cd',700);}
  visible.forEach((floor,index)=>{
   const x=w/2-bw/2+Math.sin(index*2.7)*w*.018,y=baseY-(index+1)*bh,colors=['#30aaa8','#d59b48','#8570ce','#c15f91','#5b99be'],color=colors[index%colors.length];
   c.fillStyle=color;roundRect(c,x,y,bw,bh-2,4);c.fill();c.fillStyle='#ffffff30';c.fillRect(x,y,bw,bh*.17);c.fillStyle='#0b294a88';for(let j=0;j<5;j++)c.fillRect(x+bw*.07+j*bw*.18,y+bh*.31,bw*.09,bh*.4);if(floor.multiplier)text(c,String(floor.multiplier)+(rush?'×':'u'),x+bw/2,y+bh/2,bh*.45,'#fff',900);
  });
  if(round?.status==='active'||busy){const y=baseY-(visible.length+1.7)*bh,x=w/2-bw/2+Math.sin(time*.0018)*w*.22;c.fillStyle='#9af0e7';roundRect(c,x,y,bw,bh-2,4);c.fill();c.strokeStyle='#aee4ff88';c.lineWidth=1.5;c.beginPath();c.moveTo(x+bw*.5,0);c.lineTo(x+bw*.5,y);c.stroke();}
  if(!rush)text(c,'u = BASE UNIT · 100 BASE UNITS PER TOTAL STAKE',w/2,h*.95,clamp(w*.021,8,12),'#91aec2',650);
  if(!rush&&amount&&round?.status==='settled'&&(round.kind!=='building'||round.sequenceLast)){const x=w*.79,y=h*.39;c.fillStyle='#f5c256';c.beginPath();c.arc(x,y,w*.065,Math.PI,TAU);c.fill();c.strokeStyle='#f6e3b5';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+h*.08);c.stroke();orb(c,x,y+h*.09,w*.012,'#f6c3a2','#a36d58');}
 }
}
