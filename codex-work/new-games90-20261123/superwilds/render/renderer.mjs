import {drawSymbol,drawCloverBackground,SYMBOLS} from './artwork.mjs';
import {superWildsLayout,reelRectangles} from './layout.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const deepFreeze = value => {if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(deepFreeze);}return value;};
const money = minor => Number.isSafeInteger(minor) ? (minor/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
export const SUPERWILDS_PAYLINES=deepFreeze([[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2]]);
// Decorative idle presentation, like the transient moving reel symbols.
// It is not an accepted round: no round id, award, balance, history or RTP is
// derived from it. The first authoritative receipt replaces it completely.
const IDLE_PRESENTATION=deepFreeze([
  ['lemon','plum','orange'],['orange','cherry','grapes'],['bell','seven','lemon'],
  ['watermelon','orange','plum'],['seven','grapes','cherry'],
]);

export function validateReceipt(receipt) {
  if(!receipt || typeof receipt.roundId!=='string' || !receipt.roundId || receipt.roundId.length>200
    || !Array.isArray(receipt.grid) || receipt.grid.length!==5
    || receipt.grid.some(col=>!Array.isArray(col)||col.length!==3||col.some(key=>!SYMBOLS.includes(key)))
    || !Number.isInteger(receipt.multiplier)||receipt.multiplier<1||receipt.multiplier>5) throw new TypeError('SUPERWILDS_RECEIPT');
  for(const key of ['winMinor','balanceMinor','betMinor'])if(receipt[key]!==undefined&&(!Number.isSafeInteger(receipt[key])||receipt[key]<0))throw new TypeError('SUPERWILDS_RECEIPT_AMOUNT');
  if(receipt.winningLines!==undefined&&(!Array.isArray(receipt.winningLines)||receipt.winningLines.length>5
    ||receipt.winningLines.some(line=>!Array.isArray(line.rows)||line.rows.length!==5||line.rows.some(n=>!Number.isInteger(n)||n<0||n>2)
      ||!SUPERWILDS_PAYLINES.some(rows=>rows.every((row,i)=>row===line.rows[i])))))throw new TypeError('SUPERWILDS_RECEIPT_LINES');
  return deepFreeze(clone(receipt));
}

export class SuperWildsRenderer {
  constructor({canvas,onEvent=()=>{},now=()=>performance.now()}={}) {
    if(typeof canvas?.getContext!=='function')throw new TypeError('SUPERWILDS_CANVAS');
    this.canvas=canvas;this.context=canvas.getContext('2d');this.onEvent=onEvent;this.now=now;
    this.phase='IDLE';this.receipt=null;this.pendingReceipt=null;this.requestKey=null;this.started=0;this.acceptedAt=0;
    this.stopAt=null;this.quick=false;this.lastTime=0;this.stopped=new Set();this.seen=new Map();this.disposed=false;
    this.display={currency:'ETB',balanceMinor:null,betMinor:null,winMinor:0,muted:false,winPending:false,doubleEnabled:false};
    this.resize(canvas.clientWidth||390,canvas.clientHeight||780,1);
  }
  emit(type,detail={}) {try{this.onEvent({type,requestKey:this.requestKey,roundId:this.pendingReceipt?.roundId||this.receipt?.roundId||null,...detail});}catch{}}
  resize(width,height,dpr=1) {
    if(this.disposed)return;
    this.layout=superWildsLayout(width,height);this.dpr=Math.max(1,Math.min(2,Number.isFinite(dpr)?dpr:1));
    this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);
    if(this.canvas.style){this.canvas.style.width=`${width}px`;this.canvas.style.height=`${height}px`;}
    this.draw();return this.layout;
  }
  setDisplay(patch={}) {
    if(this.disposed)return;
    for(const key of ['balanceMinor','betMinor','winMinor'])if(key in patch&&patch[key]!==null&&(!Number.isSafeInteger(patch[key])||patch[key]<0))throw new TypeError('SUPERWILDS_DISPLAY_AMOUNT');
    if('currency'in patch&&!['ETB','DMO','CREDITS'].includes(patch.currency))throw new TypeError('SUPERWILDS_CURRENCY');
    Object.assign(this.display,patch);this.draw();
  }
  start({requestKey,quick=false,at=this.now()}={}) {
    if(this.disposed)throw new Error('SUPERWILDS_DISPOSED');
    if(typeof requestKey!=='string'||!requestKey||!Number.isFinite(at))throw new TypeError('SUPERWILDS_START');
    if(this.phase!=='IDLE'){if(this.requestKey===requestKey)return false;throw new Error('SUPERWILDS_ROUND_ACTIVE');}
    this.phase='SPINNING';this.requestKey=requestKey;this.started=at;this.lastTime=at;this.quick=!!quick;
    this.pendingReceipt=null;this.stopAt=null;this.stopped.clear();this.emit('spin');this.draw();return true;
  }
  acceptReceipt(raw,at=this.now()) {
    if(this.disposed)throw new Error('SUPERWILDS_DISPOSED');
    if(!Number.isFinite(at))throw new TypeError('SUPERWILDS_TIME');
    const accepted=validateReceipt(raw),serialized=JSON.stringify(accepted),known=this.seen.get(accepted.roundId);
    if(known!==undefined){if(known!==serialized)throw new Error('SUPERWILDS_RECEIPT_CONFLICT');return false;}
    if(this.pendingReceipt&&this.pendingReceipt.roundId!==accepted.roundId)throw new Error('SUPERWILDS_RECEIPT_ALREADY_ACCEPTED');
    this.seen.set(accepted.roundId,serialized);if(this.seen.size>64)this.seen.delete(this.seen.keys().next().value);
    if(this.phase==='IDLE') {this.receipt=accepted;this.applyReceiptDisplay(accepted);this.draw();return true;}
    this.pendingReceipt=accepted;this.acceptedAt=Math.max(at,this.started);this.phase='SETTLING';this.tick(at);return true;
  }
  applyReceiptDisplay(receipt) {for(const key of ['balanceMinor','betMinor','winMinor'])if(key in receipt)this.display[key]=receipt[key];}
  stop(at=this.now()) {
    if(this.disposed||this.phase==='IDLE')return false;
    if(!Number.isFinite(at))throw new TypeError('SUPERWILDS_TIME');
    if(this.stopAt===null){this.stopAt=Math.max(at,this.started);this.emit('stop-request');}
    return true;
  }
  deadlines() {
    if(!this.pendingReceipt)return null;
    const base=Math.max(this.acceptedAt,this.started+(this.quick?160:650));
    const first=this.stopAt===null?base:Math.min(base,Math.max(this.acceptedAt,this.stopAt)+55);
    return Array.from({length:5},(_,i)=>first+i*(this.stopAt!==null?45:this.quick?65:125));
  }
  tick(at=this.now()) {
    if(this.disposed)return this.snapshot();
    if(!Number.isFinite(at))throw new TypeError('SUPERWILDS_TIME');
    this.lastTime=Math.max(this.lastTime,at);
    const deadlines=this.deadlines();
    if(deadlines)for(let i=0;i<5;i++)if(this.lastTime>=deadlines[i]&&!this.stopped.has(i)){this.stopped.add(i);this.emit('reel-stop',{column:i});}
    if(deadlines&&this.stopped.size===5&&this.lastTime>=deadlines[4]+(this.stopAt!==null?70:150)) {
      this.receipt=this.pendingReceipt;this.pendingReceipt=null;this.phase='IDLE';this.applyReceiptDisplay(this.receipt);
      this.emit('wheel-stop',{multiplier:this.receipt.multiplier});
      if(this.receipt.winMinor>0)this.emit('win',{winMinor:this.receipt.winMinor});
      this.emit('settled');
    }
    this.draw();return this.snapshot();
  }
  snapshot() {return deepFreeze({phase:this.phase,requestKey:this.requestKey,receipt:this.receipt?clone(this.receipt):null,
    pendingReceipt:this.pendingReceipt?clone(this.pendingReceipt):null,stoppedColumns:[...this.stopped],stopRequested:this.stopAt!==null,
    display:clone(this.display),layout:this.layout,dpr:this.dpr,disposed:this.disposed});}
  draw() {
    const c=this.context;if(this.disposed||!c)return;
    const l=this.layout;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,l.width,l.height);
    drawCloverBackground(c,l.width,l.height);this.drawTitle(c,l.title);this.drawWheel(c,l.wheel);
    const b=l.cabinet,g=c.createLinearGradient(b.x,b.y,b.x+b.width,b.y+b.height);g.addColorStop(0,'#021d1c');g.addColorStop(.4,'#004733');g.addColorStop(1,'#00352e');
    c.save();c.shadowColor='#001b17';c.shadowBlur=20;c.fillStyle=g;c.fillRect(b.x,b.y,b.width,b.height);c.shadowBlur=0;
    c.strokeStyle='#e4c268';c.lineWidth=2;c.strokeRect(b.x,b.y,b.width,b.height);c.strokeStyle='#736532';c.lineWidth=1;c.strokeRect(b.x+3,b.y+3,b.width-6,b.height-6);c.restore();
    const reels=reelRectangles(l),target=this.pendingReceipt||this.receipt;
    for(let column=0;column<5;column++) {
      const r=reels[column],cell=r.height/3,moving=this.phase!=='IDLE'&&!this.stopped.has(column);
      c.save();c.beginPath();c.rect(r.x,r.y,r.width,r.height);c.clip();
      if(moving) {
        const age=Math.max(0,this.lastTime-this.started),ramp=Math.min(1,age/180),velocity=(this.quick?2.0:1.25)*ramp;
        const offset=(age*velocity+column*35)%cell;
        for(let row=-1;row<4;row++)drawSymbol(c,SYMBOLS[(Math.floor(age/100)+column*3+row+20)%SYMBOLS.length],r.x+2,r.y+row*cell+offset,r.width-4,cell);
      } else for(let row=0;row<3;row++)drawSymbol(c,target?.grid?.[column]?.[row]??IDLE_PRESENTATION[column][row],r.x+2,r.y+row*cell,r.width-4,cell);
      const side=c.createLinearGradient(r.x,0,r.x+r.width,0);side.addColorStop(0,'rgba(0,0,0,.25)');side.addColorStop(.1,'transparent');side.addColorStop(.88,'transparent');side.addColorStop(1,'rgba(0,0,0,.22)');c.fillStyle=side;c.fillRect(r.x,r.y,r.width,r.height);
      const shade=c.createLinearGradient(0,r.y,0,r.y+r.height);shade.addColorStop(0,'rgba(0,20,16,.25)');shade.addColorStop(.14,'transparent');shade.addColorStop(.86,'transparent');shade.addColorStop(1,'rgba(0,20,16,.3)');c.fillStyle=shade;c.fillRect(r.x,r.y,r.width,r.height);c.restore();
      c.strokeStyle='rgba(181,165,82,.45)';c.lineWidth=1;c.strokeRect(r.x,r.y,r.width,r.height);
    }
    if(this.phase==='IDLE'&&this.receipt?.winningLines?.length) {
      const line=this.receipt.winningLines[Math.floor(this.lastTime/1400)%this.receipt.winningLines.length];c.save();c.lineWidth=2.5;c.strokeStyle='#ffe445';c.shadowColor='#ffd53e';c.shadowBlur=8;c.beginPath();
      line.rows.forEach((row,i)=>{const r=reels[i],x=r.x+r.width/2,y=r.y+(row+.5)*r.height/3;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();c.restore();
    }
    this.drawControls(c,l);
  }
  drawTitle(c,r) {
    c.save();c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
    const size=Math.min(r.width/10.7,r.height*.6);c.font=`900 ${size}px Georgia,serif`;c.lineWidth=Math.max(1,size*.075);c.strokeStyle='#7c3904';c.strokeText('MULTI HOT 5',r.x+r.width/2,r.y+r.height*.34);
    const gold=c.createLinearGradient(0,r.y,0,r.y+r.height);gold.addColorStop(0,'#fff9cb');gold.addColorStop(.45,'#ffda55');gold.addColorStop(1,'#d48716');c.fillStyle=gold;c.fillText('MULTI HOT 5',r.x+r.width/2,r.y+r.height*.34);
    c.font=`900 ${size*.58}px Arial,sans-serif`;c.strokeStyle='#ffd85a';c.lineWidth=Math.max(1,size*.09);c.strokeText('SUPER WILDS',r.x+r.width/2,r.y+r.height*.82);c.fillStyle='#f52b45';c.fillText('SUPER WILDS',r.x+r.width/2,r.y+r.height*.82);c.restore();
  }
  drawWheel(c,r) {
    c.save();const cx=r.x+r.width/2,base=r.y+r.height,radius=r.width*.50;
    c.beginPath();c.moveTo(r.x,base);c.ellipse(cx,base,radius,Math.max(40,r.height*.95),0,Math.PI,0);c.lineTo(r.x+r.width,base);c.closePath();c.fillStyle='#064933';c.fill();c.strokeStyle='#bba358';c.lineWidth=2;c.stroke();
    const target=this.pendingReceipt||this.receipt,selected=target?.multiplier||null,age=this.phase!=='IDLE'?Math.max(0,this.lastTime-this.started):0;
    const labels=[5,3,1,4,2],shift=this.phase!=='IDLE'&&this.stopped.size<5?Math.sin(age/190)*.22:0;
    for(let i=0;i<5;i++){const angle=Math.PI+(i+.5)*Math.PI/5+shift,x=cx+Math.cos(angle)*radius*.79,y=base+Math.sin(angle)*r.height*.77;c.save();c.translate(x,y);c.rotate(angle+Math.PI/2);c.textAlign='center';c.textBaseline='middle';c.font=`900 ${Math.max(15,r.width*.085)}px Georgia,serif`;c.strokeStyle='#d1af58';c.lineWidth=2.4;c.strokeText(`${labels[i]}x`,0,0);c.fillStyle='#315e41';c.fillText(`${labels[i]}x`,0,0);c.restore();}
    const ww=Math.max(56,r.width*.24),top=r.y+5;c.beginPath();c.moveTo(cx-ww/2,top+6);c.quadraticCurveTo(cx,top-13,cx+ww/2,top+6);c.lineTo(cx+ww*.34,base-4);c.lineTo(cx-ww*.34,base-4);c.closePath();const g=c.createLinearGradient(0,top,0,base);g.addColorStop(0,'#08774d');g.addColorStop(1,'#003d2b');c.fillStyle=g;c.fill();c.strokeStyle='#eac77b';c.lineWidth=3;c.stroke();
    c.textAlign='center';c.textBaseline='middle';c.font=`900 ${Math.max(26,ww*.59)}px Georgia,serif`;c.strokeStyle='#ac6a27';c.lineWidth=4;c.strokeText(selected?`${selected}x`:'—',cx,top+(base-top)*.37);c.fillStyle='#ffe780';c.fillText(selected?`${selected}x`:'—',cx,top+(base-top)*.37);c.restore();
  }
  drawControls(c,l) {
    const circle=(r,icon,active=true,palette=['#287b54','#073e2d','#052d24'])=>{const radius=Math.min(r.width,r.height)*.48,cx=r.x+r.width/2,cy=r.y+r.height/2;c.save();c.globalAlpha=active?1:.36;const g=c.createRadialGradient(cx-radius*.4,cy-radius*.5,1,cx,cy,radius);g.addColorStop(0,palette[0]);g.addColorStop(.6,palette[1]);g.addColorStop(1,palette[2]);ellipse(c,cx,cy,radius,radius,g);c.strokeStyle='#d9ba69';c.lineWidth=2;c.beginPath();c.arc(cx,cy,radius,0,Math.PI*2);c.stroke();c.strokeStyle='#8b864c';c.lineWidth=1;c.beginPath();c.arc(cx,cy,radius-4,0,Math.PI*2);c.stroke();c.fillStyle='#fffbe7';c.textAlign='center';c.textBaseline='middle';c.font=`700 ${radius*1.15}px Arial,sans-serif`;c.fillText(icon,cx,cy+1);c.restore();};
    circle(l.controls.auto,'⟳');circle(l.controls.take,'$',this.display.winPending===true);
    if(this.display.doubleEnabled)circle(l.controls.double,'×2',this.display.winPending===true);
    const s=l.controls.spin,moving=this.phase!=='IDLE';circle(s,'',true,moving?['#b2a438','#817322','#645b1d']:undefined);const cx=s.x+s.width/2,cy=s.y+s.height/2,rad=Math.min(s.width,s.height)*.35;
    c.save();c.lineWidth=Math.max(6,rad*.33);
    if(moving){const side=Math.max(9,s.width*.14);c.fillStyle='#fff';c.fillRect(cx-side/2,cy-side*.8,side,side);}
    else{c.strokeStyle=this.display.quick?'#ffe542':'#fff';for(let n=0;n<2;n++){const a=n*Math.PI+.35;c.beginPath();c.arc(cx,cy,rad,a,a+2.1);c.stroke();const end=a+2.1,x=cx+Math.cos(end)*rad,y=cy+Math.sin(end)*rad;c.beginPath();c.moveTo(x+Math.cos(end+.6)*12,y+Math.sin(end+.6)*12);c.lineTo(x,y);c.lineTo(x+Math.cos(end+2.3)*11,y+Math.sin(end+2.3)*11);c.stroke();}}
    c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.font=`800 ${Math.max(8,s.width*.10)}px Arial,sans-serif`;for(const [i,label]of(moving?['STOP']:['HOLD','&','SPIN']).entries())c.fillText(label,cx,cy+(moving?s.height*.17:(i-1)*s.height*.115));c.restore();
    const q=l.controls.quick;c.save();c.fillStyle=this.display.quick?'#fff6a4':'#e8d493';c.strokeStyle='#88713b';c.lineWidth=2;c.font=`900 ${Math.min(q.width,q.height)*.83}px Arial,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.strokeText('ϟ',q.x+q.width/2,q.y+q.height/2);c.fillText('ϟ',q.x+q.width/2,q.y+q.height/2);c.restore();
    this.plate(c,l.balance,'BALANCE',`${money(this.display.balanceMinor)} ${this.display.currency}`);this.plate(c,l.bet,'BET',`${money(this.display.betMinor)} ${this.display.currency}`);
    c.save();c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.font='700 28px Arial,sans-serif';const m=l.controls.menu,so=l.controls.sound;c.fillText('☰',m.x+m.width/2,m.y+m.height/2);c.font='700 25px Arial,sans-serif';c.fillText(this.display.muted?'♩':'♪',so.x+so.width/2,so.y+so.height/2);
    if(this.display.winMinor>0){c.fillStyle='#ffe87c';c.font='800 15px Arial,sans-serif';c.fillText(`WIN ${money(this.display.winMinor)} ${this.display.currency}`,l.win.x+l.win.width/2,l.win.y+l.win.height/2);}c.restore();
  }
  plate(c,r,label,value) {c.save();const g=c.createLinearGradient(0,r.y,0,r.y+r.height);g.addColorStop(0,'#0c5139');g.addColorStop(1,'#012e27');c.fillStyle=g;c.beginPath();c.roundRect(r.x,r.y,r.width,r.height,10);c.fill();c.strokeStyle='#b9b067';c.lineWidth=1.5;c.stroke();c.textAlign='center';c.textBaseline='middle';c.fillStyle='#ffee60';c.font=`700 ${Math.max(10,Math.min(14,r.height*.28))}px Arial,sans-serif`;c.fillText(label,r.x+r.width/2,r.y+r.height*.30);c.fillStyle='#fff';c.font=`800 ${Math.max(10,Math.min(14,r.width*.085))}px Arial,sans-serif`;c.fillText(value,r.x+r.width/2,r.y+r.height*.72);c.restore();}
  dispose() {if(this.disposed)return;this.disposed=true;this.onEvent=()=>{};this.context=null;this.seen.clear();}
}

function ellipse(c,x,y,rx,ry,fill){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
