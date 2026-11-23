export const PALETTES=[['#073d35','#031d20','#7ae6bf'],['#321353','#120923','#c796ff'],['#5e1c18','#21080f','#ffae6d'],['#123d65','#061a35','#79d8ff'],['#4a3911','#17120a','#f9d786'],['#15383f','#061c22','#82e5dc']];
export function createVisuals(canvas){
 const c=canvas.getContext('2d'),atlas=new Image();let artwork=false;
 atlas.onload=()=>{artwork=true;};atlas.src='/player-live-v244/art/fruit-symbols.webp';
 const grad=(x,y,w,h,colors)=>{const g=c.createLinearGradient(x,y,x+w,y+h);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;};
 const box=(x,y,w,h,r,fill,stroke)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}};
 const label=(s,x,y,size=24,color='#fff',font='Arial')=>{c.font=`900 ${size}px ${font}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(s,x,y);};
 const gold=(s,x,y,size)=>{c.save();c.font=`900 ${size}px Georgia`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=5;c.strokeStyle='#42250b';c.strokeText(s,x,y);c.fillStyle=grad(0,y-size/2,0,size,['#fff4c6','#f0c563','#c3811c','#fff0b2']);c.fillText(s,x,y);c.restore();};
 function gem(x,y,r,color='#39cdd4'){
  c.save();c.translate(x,y);c.beginPath();c.moveTo(-r,-r*.3);c.lineTo(-r*.55,-r*.8);c.lineTo(r*.55,-r*.8);c.lineTo(r,-r*.3);c.lineTo(0,r);c.closePath();c.fillStyle=grad(-r,-r,r*2,r*2,[color,'#083341']);c.fill();c.lineWidth=2;c.strokeStyle='#cffcff';c.stroke();c.beginPath();c.moveTo(-r,-r*.3);c.lineTo(r,-r*.3);c.moveTo(-r*.55,-r*.8);c.lineTo(0,r);c.lineTo(r*.55,-r*.8);c.stroke();c.restore();
 }
 function fruit(symbol,x,y,w,h){
  const cells=[13,12,10,14,8,15,11,9];
  if(artwork){const side=atlas.width/4,index=cells[symbol%8];c.drawImage(atlas,index%4*side,Math.floor(index/4)*side,side,side,x,y,w,h);return;}
  c.save();c.translate(x+w/2,y+h/2);const r=Math.min(w,h)*.32;
  if(symbol===5){gold('7',0,0,r*2.3);c.restore();return;}
  if(symbol===3){c.beginPath();c.moveTo(-r,r*.5);c.bezierCurveTo(-r*.55,r*.15,-r*.8,-r*.8,0,-r);c.bezierCurveTo(r*.8,-r*.8,r*.55,r*.15,r,r*.5);c.closePath();c.fillStyle=grad(0,-r,0,r*2,['#fff4b2','#d99313']);c.fill();gold('●',0,r*.65,r*.5);}
  else if(symbol===2){for(let row=0;row<4;row++)for(let k=0;k<4-row;k++){const gx=(k-(3-row)/2)*r*.48,gy=(row-1.5)*r*.48;c.beginPath();c.arc(gx,gy,r*.33,0,Math.PI*2);c.fillStyle=grad(gx,gy-r*.3,0,r*.6,['#df89f4','#5c217e']);c.fill();c.strokeStyle='#3f1559';c.stroke();}}
  else{const col=symbol===0?'#ec284a':symbol===1?'#f5d84d':symbol===4?'#9847bc':symbol===6?'#ff9b2b':'#3aa85d';c.fillStyle=grad(-r,-r,r*2,r*2,[col,'#591e25']);c.beginPath();c.ellipse(symbol===0?-r*.42:0,r*.15,r*(symbol===1?1.1:.85),r*(symbol===1?.7:1),-.3,0,Math.PI*2);c.fill();if(symbol===0){c.beginPath();c.arc(r*.5,r*.4,r*.7,0,Math.PI*2);c.fill();}c.strokeStyle='#386b1a';c.lineWidth=6;c.beginPath();c.moveTo(0,-r*.5);c.quadraticCurveTo(r*.2,-r*1.4,r*.8,-r*1.3);c.stroke();c.fillStyle='#fff5';c.beginPath();c.ellipse(-r*.35,-r*.15,r*.2,r*.35,.3,0,Math.PI*2);c.fill();}
  c.restore();
 }
 function backdrop(game){
  const p=PALETTES[game.theme%6];c.fillStyle=grad(0,0,960,620,[p[0],p[1]]);c.fillRect(0,0,960,620);
  c.save();c.globalAlpha=.15;c.strokeStyle=p[2];for(let i=0;i<9;i++){c.beginPath();c.arc(480,340,80+i*65,0,Math.PI*2);c.stroke();}c.restore();
  for(let i=0;i<35;i++){c.fillStyle=i%3?'#fff4':'#edc27377';c.beginPath();c.arc((i*137+33)%960,(i*73+24)%620,i%3===0?2:1,0,Math.PI*2);c.fill();}
 }
 function slots(game,r,phase,now){
  backdrop(game);gold(game.name.toUpperCase(),480,45,36);label('5 REELS  ·  5 FIXED PAYLINES',480,83,12,'#dfd2b4');
  box(30,106,900,450,24,grad(0,106,0,450,['#fff1b4','#9b641b','#edc879','#5f390e']),'#ffdc8d');
  box(43,119,874,424,15,'#160e12','#5d3819');
  const xs=66,ys=137,cw=160,ch=126,gap=7;
  for(let x=0;x<5;x++){
   c.save();c.beginPath();c.roundRect(xs+x*(cw+gap),ys,cw,ch*3,7);c.clip();
   c.fillStyle=grad(0,ys,0,ch*3,['#958b70','#fff9e6','#fffdf1','#f7edcf','#8f8569']);c.fillRect(xs+x*(cw+gap),ys,cw,ch*3);
   const spinning=phase>0&&phase<(650+x*150),offset=spinning?(now*.85+x*47)%ch:0;
   for(let y=-1;y<4;y++){
    const symbol=spinning?(Math.floor(now/75)+x+y+30)%game.symbols:r?.grid?.[Math.max(0,Math.min(2,y))]?.[x]??(x+y+10)%game.symbols;
    fruit(symbol,xs+x*(cw+gap)+12,ys+y*ch+offset+4,cw-24,ch-8);
   }
   const shade=grad(0,ys,0,ch*3,['#0005','#0000','#0000','#0000','#0005']);c.fillStyle=shade;c.fillRect(xs+x*(cw+gap),ys,cw,ch*3);c.restore();
  }
  if(!phase||phase>=1250){const lines=[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]];for(const win of r?.winning_lines||[]){c.save();c.strokeStyle='#ffdf69';c.lineWidth=5;c.shadowColor='#ffb300';c.shadowBlur=12;c.beginPath();lines[win.line].forEach((row,x)=>{const px=xs+x*(cw+gap)+cw/2,py=ys+row*ch+ch/2;x?c.lineTo(px,py):c.moveTo(px,py);});c.stroke();c.restore();}}
  gold('★',17,335,20);gold('★',944,335,20);
 }
 function plane(x,y,tilt,color){c.save();c.translate(x,y);c.rotate(tilt);c.shadowColor=color;c.shadowBlur=20;c.fillStyle=color;c.beginPath();c.moveTo(53,0);c.lineTo(-30,-13);c.lineTo(-15,0);c.lineTo(-30,13);c.closePath();c.fill();c.beginPath();c.moveTo(8,0);c.lineTo(-17,-35);c.lineTo(-22,-32);c.lineTo(-6,0);c.lineTo(-22,32);c.lineTo(-17,35);c.closePath();c.fill();c.restore();}
 function crash(game,r,now,serverNow){
  backdrop(game);const active=r?.status==='active',elapsed=active?Math.max(0,(serverNow-r.started_at)/1000):0,p=Math.min(1,elapsed/16),mult=active?Math.min(r.auto_cashout_target||10000,Math.floor(Math.exp(game.crash_growth*elapsed)*100)):r?.cashout_multiplier||r?.crash_point||100;
  c.strokeStyle='#ffffff16';c.lineWidth=1;for(let i=1;i<6;i++){c.beginPath();c.moveTo(65,100+i*70);c.lineTo(900,100+i*70);c.stroke();label((6-i)+'×',35,100+i*70,14,'#8ea8b9');}
  const col=active?'#7decc2':r?.payout_minor!=='0'?'#f5d284':'#ed6b77';c.strokeStyle=col;c.lineWidth=6;c.shadowColor=col;c.shadowBlur=12;c.beginPath();c.moveTo(75,510);for(let i=0;i<=80;i++){const f=i/80;c.lineTo(75+780*f*p,510-365*f*f*p);}c.stroke();c.shadowBlur=0;
  plane(75+780*p,510-365*p,-Math.atan(p),col);gold((mult/100).toFixed(2)+'×',480,230,98);label(active?'FLYING · CASH OUT BEFORE THE CRASH':r?.reason||'READY FOR TAKEOFF',480,315,19,'#c4e1e8');
 }
 function plinko(game,r,phase){
  backdrop(game);gold(game.name.toUpperCase(),480,38,31);const rows=r?.rows||game.plinko_rows,dx=690/(rows+2),dy=365/(rows+1);
  const end=phase?Math.min(rows,phase/95):rows;let right=0;
  for(let row=0;row<rows;row++)for(let k=0;k<=row;k++){const x=480+(k-row/2)*dx,y=100+row*dy;c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fillStyle='#b2dae2';c.shadowColor='#81d8e8';c.shadowBlur=5;c.fill();}c.shadowBlur=0;
  if(r){for(let i=0;i<Math.floor(end);i++)right+=r.path[i];const row=Math.floor(end);const x=480+(right-row/2)*dx,y=70+end*dy;c.beginPath();c.arc(x,y,12,0,Math.PI*2);c.fillStyle='#ffc960';c.shadowBlur=18;c.shadowColor='#ffc960';c.fill();c.shadowBlur=0;}
  const bw=790/(rows+1);for(let i=0;i<=rows;i++){const edge=Math.abs(i-rows/2)/(rows/2);box(85+i*bw,490,bw-3,42,7,edge>.65?'#d44c61':edge>.3?'#bf7b27':'#35857b');label(r?.multipliers?.[i]||'•',85+i*bw+(bw-3)/2,512,12,'#fff');}
 }
 function dice(game,r,phase,now){
  backdrop(game);gold(game.name.toUpperCase(),480,48,34);
  for(let i=0;i<2;i++){const x=225+i*285,y=145,v=phase>0&&phase<800?1+(Math.floor(now/80)+i)%6:r?.rolls?.[i]||6;c.save();c.translate(x+100,y+100);c.rotate(phase>0&&phase<800?Math.sin(now/100)*.12:0);box(-103,-103,206,206,30,grad(0,-100,0,200,['#fffce6','#cec8b4']),'#f7df9d');const pos={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]}[v];for(const [a,b]of pos){c.beginPath();c.arc(a*52,b*52,14,0,Math.PI*2);c.fillStyle='#72253c';c.fill();}c.restore();}
  gold('SUM '+(r?.sum||'—'),480,410,38);label('EXACT TOTAL WINS',480,457,15,'#bfdae0');
 }
 function hilo(game,r){
  backdrop(game);gold(game.name.toUpperCase(),480,43,33);const rank=r?.rank||1;const names={1:'A',11:'J',12:'Q',13:'K'};
  c.save();c.translate(480,302);c.rotate(-.05);box(-118,-169,236,338,20,grad(0,-160,0,320,['#fffdf4','#e7dfcc']),'#f4cc80');label(names[rank]||String(rank),-77,-124,34,'#a02b45','Georgia');label('♥',0,10,130,'#bd304d');c.rotate(Math.PI);label(names[rank]||String(rank),-77,-124,34,'#a02b45','Georgia');c.restore();label('HIGHER ↑  OR  LOWER ↓',480,510,19,'#c4e0e8');
 }
 function wheel(game,r,phase,now){
  backdrop(game);gold(game.name.toUpperCase(),480,35,29);const spin=phase>0&&phase<1200?now/160:-(r?.segment+.5||.5)*Math.PI/6;
  c.save();c.translate(480,310);c.rotate(spin);for(let i=0;i<12;i++){c.beginPath();c.moveTo(0,0);c.arc(0,0,220,i*Math.PI/6,(i+1)*Math.PI/6);c.closePath();c.fillStyle=['#184e54','#713951','#8e6929'][i%3];c.fill();c.strokeStyle='#e6c47a';c.lineWidth=2;c.stroke();const a=(i+.5)*Math.PI/6;label((r?.multipliers?.[i]||'•')+'×',Math.cos(a)*170,Math.sin(a)*170,17,'#fff1c6');}c.restore();c.beginPath();c.arc(480,310,226,0,Math.PI*2);c.strokeStyle=grad(0,80,0,460,['#fff0ad','#a37129','#ffdc85']);c.lineWidth=12;c.stroke();gem(480,310,43,'#edc674');gold('◀',734,310,40);
 }
 return {render(game,r,phase,now,serverNow){c.setTransform(canvas.width/960,0,0,canvas.height/620,0,0);c.clearRect(0,0,960,620);if(game.family==='slots')slots(game,r,phase,now);else if(game.family==='crash')crash(game,r,now,serverNow);else if(game.family==='plinko')plinko(game,r,phase);else if(game.family==='dice')dice(game,r,phase,now);else if(game.family==='hilo')hilo(game,r);else if(game.family==='wheel')wheel(game,r,phase,now);}};
}
