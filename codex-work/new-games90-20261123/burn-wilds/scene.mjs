import {BURN_WILDS_GAME_ID,BURN_WILDS_SYMBOLS,BurnWildsExpansion,validateBurnWildsReceipt} from './expansion.mjs';
import {BurnWildsFlameOverlay} from './flame-overlay.mjs';
import {burnWildsLayout} from './layout.mjs';

const clamp=value=>Math.max(0,Math.min(1,value));
const ease=value=>1-(1-clamp(value))**3;
const wheelOrder=[1,3,5,2,4];
// Decorative first paint, independent of any wager or server result.
export const BURN_WILDS_IDLE_GRID=Object.freeze([
  ['orange','lemon','orange'],['seven','plum','plum'],['watermelon','bell','grapes'],
  ['plum','cherry','seven'],['plum','cherry','plum']
].map(Object.freeze));
// Chosen ZPLAY pacing, not a measurement of provider timing: 1020 ms rolling
// plus the 480 ms stop/reveal timeline gives at least 1500 ms for a normal spin.
const NORMAL_ROLL_MS=1020;
const money=value=>value===null?'—':(value/100).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
function rounded(context,x,y,width,height,radius=6){
  context.beginPath();context.roundRect(x,y,width,height,radius);return context;
}
function sprite(context,source,x,y,width,height){
  const image=source.image||source,sw=source.sw||image.naturalWidth||image.width,sh=source.sh||image.naturalHeight||image.height;
  const fit=Math.min(width/sw,height/sh),dw=sw*fit,dh=sh*fit;
  context.drawImage(image,source.sx||0,source.sy||0,sw,sh,x+(width-dw)/2,y+(height-dh)/2,dw,dh);
}
function validArtwork(artwork){
  if(artwork?.gameId!==BURN_WILDS_GAME_ID||!artwork.symbols)throw new TypeError('BURN_WILDS_OWN_ARTWORK_REQUIRED');
  for(const symbol of BURN_WILDS_SYMBOLS){const source=artwork.symbols[symbol],image=source?.image||source;
    if(!image||!(source?.sw||image.naturalWidth||image.width)||!(source?.sh||image.naturalHeight||image.height))throw new TypeError('BURN_WILDS_SYMBOL_ARTWORK_REQUIRED_'+symbol);}
  return artwork;
}

/** Native Canvas scene: the supplied own symbol atlas is rendered per cell.
 * Captured screenshots/video are never used as moving game frames. Cabinet
 * geometry and fire are authored rendering; exact native-art closure is a
 * separate required host input. The scene has no RNG, HTTP or wallet mutation.
 */
export class BurnWildsScene{
  constructor({canvas,flameCanvas,artwork,onEvent=()=>{},now=()=>performance.now(),win=globalThis}={}){
    if(!canvas?.getContext||!flameCanvas?.getContext)throw new TypeError('BURN_WILDS_CANVASES');
    this.context=canvas.getContext('2d',{alpha:false});if(!this.context)throw new Error('BURN_WILDS_CANVAS_UNAVAILABLE');
    this.canvas=canvas;this.artwork=validArtwork(artwork);this.now=now;this.onEvent=onEvent;this.win=win;
    this.overlay=new BurnWildsFlameOverlay({canvas:flameCanvas});this.flameCanvas=flameCanvas;
    this.timeline=new BurnWildsExpansion({now,onEvent:event=>{if(event.type==='spin'){this.wheelTarget=null;this.lastAt=this.now();this.winVisible=false;}if(event.type==='settled')this.winVisible=true;
      this.onEvent(event.type==='settled'?{...event,winMinor:this.timeline.receipt?.winMinor??0}:event);}});
    this.financial={balanceMinor:null,betMinor:null,pendingWinMinor:0,unit:'ETB'};this.winVisible=true;this.wheelPosition=1;this.wheelTarget=null;
    this.lastAt=now();this.frame=null;this.paused=false;this.disposed=false;this.settledAt=now();
    this.queuedReceipt=null;this.stoppedReels=new Set();this.motionQuery=win.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotion=this.motionQuery?.matches===true;
    this.motionListener=event=>{this.reducedMotion=event.matches===true;if(this.reducedMotion)this.stop();this.wake();};
    this.motionQuery?.addEventListener?.('change',this.motionListener);
    this.resize(canvas.clientWidth||390,canvas.clientHeight||740,win.devicePixelRatio||1);
  }
  resize(width,height,dpr=1){
    if(this.disposed)return;this.layout=burnWildsLayout(width,height);this.dpr=Math.min(2,Math.max(1,Number.isFinite(dpr)?dpr:1));
    this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);
    if(this.canvas.style){this.canvas.style.width=width+'px';this.canvas.style.height=height+'px';}
    this.overlay.resize(width,height,this.dpr);this.draw(this.now());return this.layout;
  }
  setFinancial(update){
    for(const key of ['balanceMinor','betMinor','pendingWinMinor'])if(key in update){const value=update[key];
      if(value!==null&&(!Number.isSafeInteger(value)||value<0))throw new TypeError('BURN_WILDS_DISPLAY_AMOUNT');this.financial[key]=value;}
    if('unit'in update){if(!['ETB','TEST ETB'].includes(update.unit))throw new TypeError('BURN_WILDS_DISPLAY_UNIT');this.financial.unit=update.unit;}
    if('winVisible'in update)this.winVisible=!!update.winVisible;this.draw(this.now());
  }
  start(action){const started=this.timeline.start({...action,quick:action.quick||this.reducedMotion,at:this.now()});if(started){this.queuedReceipt=null;this.stoppedReels.clear();}this.wake();return started;}
  accept(receipt){
    const verified=validateBurnWildsReceipt(receipt),at=this.now();
    if(this.timeline.phase==='SPINNING'&&!this.timeline.accelerated&&!this.timeline.quick&&at<this.timeline.startedAt+NORMAL_ROLL_MS){
      if(verified.clientToken!==undefined&&verified.clientToken!==this.timeline.requestKey)throw new Error('BURN_WILDS_REQUEST_MISMATCH');
      if(this.queuedReceipt){if(JSON.stringify(this.queuedReceipt)!==JSON.stringify(verified))throw new Error('BURN_WILDS_RECEIPT_CONFLICT');return false;}
      this.queuedReceipt=verified;this.wake();return true;
    }
    const accepted=this.timeline.accept(verified,at);if(this.timeline.phase==='IDLE'){this.wheelPosition=wheelOrder.indexOf(verified.multiplier||1);this.settledAt=at;}this.wake();return accepted;
  }
  stop(){const at=this.now(),stopped=this.timeline.stop(at);if(this.queuedReceipt){const receipt=this.queuedReceipt;this.queuedReceipt=null;this.timeline.accept(receipt,at);}this.wake();return stopped;}
  reject(requestKey){this.queuedReceipt=null;const rejected=this.timeline.reject(requestKey);this.draw(this.now());return rejected;}
  setPaused(paused){this.paused=!!paused;if(this.paused){if(this.frame!==null)this.win.cancelAnimationFrame?.(this.frame);this.frame=null;this.timeline.stop(this.now());this.overlay.draw({...this.timeline.snapshot(),expansions:[]},{reels:this.layout.reels,at:this.now()});}
    else{this.lastAt=this.now();this.wake();}}
  wake(){if(this.disposed||this.paused||this.frame!==null)return;
    if(typeof this.win.requestAnimationFrame!=='function'){this.draw(this.now());return;}
    this.frame=this.win.requestAnimationFrame(at=>{this.frame=null;this.draw(at);const s=this.timeline.snapshot();if(s.phase!=='IDLE'||this.winVisible&&s.receipt?.winMinor>0&&!this.reducedMotion)this.wake();});
  }
  draw(at){
    if(this.disposed||!this.layout)return;
    if(this.queuedReceipt&&(this.timeline.accelerated||this.timeline.quick||at>=this.timeline.startedAt+NORMAL_ROLL_MS)){
      const receipt=this.queuedReceipt;this.queuedReceipt=null;this.timeline.accept(receipt,at);
    }
    const previous=this.timeline.phase,s=this.timeline.tick(at),delta=Math.max(0,Math.min(80,at-this.lastAt));this.lastAt=at;
    if(s.phase!=='SPINNING'&&s.acceptedReceipt?.clientToken===s.requestKey){
      for(let column=0;column<5;column++)if(s.elapsed>=(column+1)*48&&!this.stoppedReels.has(column)){
        this.stoppedReels.add(column);this.onEvent({type:'reel-stop',roundId:s.acceptedReceipt.roundId,requestKey:s.requestKey,column});
      }
    }
    if(previous!=='IDLE'&&s.phase==='IDLE')this.settledAt=at;
    if(s.phase==='SPINNING'){this.wheelPosition+=delta/(s.accelerated?75:150);this.wheelTarget=null;}
    else if(s.phase==='REELS'||s.phase==='BURNING'||s.phase==='REVEALING'){
      if(this.wheelTarget===null){this.wheelStart=this.wheelPosition;const target=wheelOrder.indexOf(s.acceptedReceipt?.multiplier||1);
        this.wheelTarget=Math.ceil((this.wheelPosition-target)/5)*5+target+5;}
      this.wheelPosition=this.wheelStart+(this.wheelTarget-this.wheelStart)*ease(s.elapsed/240);
    }
    const c=this.context,l=this.layout;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#000';c.fillRect(0,0,l.width,l.height);
    c.save();c.beginPath();c.rect(l.stage.x,l.stage.y,l.stage.width,l.stage.height);c.clip();
    this.background(c,l);this.logo(c,l);this.wheel(c,l);this.reels(c,l,s,at);this.winText(c,l,s,at);c.restore();
    if(!this.paused)this.overlay.draw(s,{reels:l.reels,at});
    return s;
  }
  background(c,l){
    if(this.artwork.background){sprite(c,this.artwork.background,l.stage.x,l.stage.y,l.stage.width,l.stage.height);return;}
    const g=c.createRadialGradient(l.width*.48,l.height*.42,0,l.width*.48,l.height*.42,Math.max(l.width,l.height)*.72);
    g.addColorStop(0,'#075e3f');g.addColorStop(1,'#001e1a');c.fillStyle=g;c.fillRect(l.stage.x,l.stage.y,l.stage.width,l.stage.height);
    // Decorative clover pattern is independent of the outcome and never a reel.
    c.save();c.globalAlpha=.11;c.fillStyle='#2a9e71';const unit=46*l.scale;
    for(let y=l.stage.y-unit;y<l.stage.y+l.stage.height;y+=unit*1.9)for(let x=l.stage.x-unit;x<l.stage.x+l.stage.width;x+=unit*1.7){
      c.save();c.translate(x,y);c.rotate((x+y)*.003);for(let k=0;k<4;k++){c.rotate(Math.PI/2);c.beginPath();c.ellipse(unit*.35,unit*.35,unit*.44,unit*.28,.7,0,Math.PI*2);c.fill();}c.restore();}c.restore();
  }
  logo(c,l){const r=l.logo;if(this.artwork.logo){sprite(c,this.artwork.logo,r.x,r.y,r.width,r.height);return;}
    c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.font=`900 ${r.height*.42}px Georgia,serif`;c.lineWidth=3*l.scale;c.strokeStyle='#543101';
    const gold=c.createLinearGradient(0,r.y,0,r.y+r.height*.6);gold.addColorStop(0,'#fff4a0');gold.addColorStop(.45,'#ffdb4b');gold.addColorStop(1,'#bb6c04');c.fillStyle=gold;
    c.strokeText('MULTI HOT 5',r.x+r.width/2,r.y+r.height*.33);c.fillText('MULTI HOT 5',r.x+r.width/2,r.y+r.height*.33);
    c.font=`900 ${r.height*.27}px Arial,sans-serif`;c.strokeStyle='#ffd954';c.lineWidth=2*l.scale;c.fillStyle='#e5253d';c.strokeText('BURN WILDS',r.x+r.width/2,r.y+r.height*.76);c.fillText('BURN WILDS',r.x+r.width/2,r.y+r.height*.76);
  }
  wheel(c,l){
    const r=l.wheel,cx=r.x+r.width/2,cy=r.y+r.height*2.08,rad=r.height*2.1;
    c.save();c.beginPath();c.rect(r.x,r.y,r.width,r.height);c.clip();c.beginPath();c.arc(cx,cy,rad,Math.PI,Math.PI*2);c.fillStyle='#064333';c.fill();c.lineWidth=4*l.scale;c.strokeStyle='#b7a053';c.stroke();
    const selected=Math.round(this.wheelPosition),fraction=this.wheelPosition-selected;
    for(let i=-2;i<=2;i++){
      const index=((selected+i)%5+5)%5,value=wheelOrder[index],angle=(i-fraction)*.43-Math.PI/2;
      c.save();c.translate(cx+Math.cos(angle)*rad*.78,cy+Math.sin(angle)*rad*.78);c.rotate(angle+Math.PI/2);
      c.font=`900 ${r.height*.49}px Georgia,serif`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=4*l.scale;c.strokeStyle='#54350a';c.fillStyle=['#54acf3','#3ee078','#ffd444','#ffab44','#ec5a9d'][value-1];
      c.globalAlpha=i===0?1:.53;c.strokeText(value+'x',0,0);c.fillText(value+'x',0,0);c.restore();
    }
    c.restore();c.save();c.lineWidth=4*l.scale;c.strokeStyle='#bfa65e';c.fillStyle='rgba(20,126,58,.09)';
    c.beginPath();c.moveTo(cx-r.width*.12,r.y+r.height*.08);c.quadraticCurveTo(cx,r.y-r.height*.06,cx+r.width*.12,r.y+r.height*.08);
    c.lineTo(cx+r.width*.085,r.y+r.height*.97);c.lineTo(cx-r.width*.085,r.y+r.height*.97);c.closePath();c.fill();c.stroke();c.restore();
  }
  reels(c,l,s,at){
    const r=l.board,gold=c.createLinearGradient(0,r.y,0,r.y+r.height);gold.addColorStop(0,'#f3e395');gold.addColorStop(.15,'#73601c');gold.addColorStop(.53,'#c4a963');gold.addColorStop(1,'#e7d58b');
    rounded(c,r.x-4*l.scale,r.y-4*l.scale,r.width+8*l.scale,r.height+8*l.scale,5*l.scale);c.fillStyle='#183526';c.fill();c.strokeStyle=gold;c.lineWidth=3*l.scale;c.stroke();
    const receipt=s.acceptedReceipt,spinning=s.phase==='SPINNING'||s.phase==='REELS';
    for(let column=0;column<5;column++){
      const cell=l.reels[column],h=cell.height/3;const fill=c.createLinearGradient(cell.x,0,cell.x+cell.width,0);fill.addColorStop(0,'#003e31');fill.addColorStop(.5,'#00231e');fill.addColorStop(1,'#00513c');
      c.fillStyle=fill;c.fillRect(cell.x,cell.y,cell.width,cell.height);c.save();c.beginPath();c.rect(cell.x+2*l.scale,cell.y+2*l.scale,cell.width-4*l.scale,cell.height-4*l.scale);c.clip();
      const stopped=!spinning||s.phase==='REELS'&&s.elapsed>=(column+1)*48;
      let grid=s.presentationGrid||BURN_WILDS_IDLE_GRID;if(s.phase==='REELS'&&stopped)grid=receipt?.originalGrid;
      if(stopped&&grid){for(let row=0;row<3;row++)sprite(c,this.artwork.symbols[grid[column][row]],cell.x+4*l.scale,cell.y+row*h+3*l.scale,cell.width-8*l.scale,h-6*l.scale);}
      else if(spinning){
        const travel=(at/(s.accelerated?28:55)+column*.71),offset=(travel%1)*h,base=Math.floor(travel);
        for(let row=-1;row<4;row++){const symbol=BURN_WILDS_SYMBOLS[((base+row+column*3)%BURN_WILDS_SYMBOLS.length+BURN_WILDS_SYMBOLS.length)%BURN_WILDS_SYMBOLS.length];
          sprite(c,this.artwork.symbols[symbol],cell.x+4*l.scale,cell.y+row*h+offset,cell.width-8*l.scale,h-6*l.scale);}
      }
      c.restore();c.strokeStyle='rgba(161,161,84,.56)';c.lineWidth=1.5*l.scale;c.strokeRect(cell.x+1,cell.y+1,cell.width-2,cell.height-2);
    }
    const settled=s.phase==='IDLE'&&s.receipt&&this.winVisible,lines=settled?s.receipt.winLines:[];
    if(lines.length){const line=lines[Math.floor(Math.max(0,at-this.settledAt)/1600)%lines.length];c.save();c.lineWidth=2.6*l.scale;c.strokeStyle='#fff06a';c.shadowColor='#ff9600';c.shadowBlur=8*l.scale;c.beginPath();
      line.rows.forEach((row,column)=>{const cell=l.reels[column],x=cell.x+cell.width/2,y=cell.y+(row+.5)*cell.height/3;column?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();c.restore();}
  }
  winText(c,l,s,at){
    const r=l.win,receipt=s.receipt;if(!this.winVisible||s.phase!=='IDLE'||!receipt?.winMinor)return;
    c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff6a5';c.font=`bold ${Math.max(13,18*l.scale)}px Arial,sans-serif`;
    const amount=this.financial.pendingWinMinor>0?this.financial.pendingWinMinor:receipt.winMinor;
    const progress=this.reducedMotion?1:ease((at-this.settledAt)/900),displayed=Math.round(amount*progress);
    c.fillText('WIN '+money(displayed)+' '+this.financial.unit,r.x+r.width/2,r.y+r.height*.35);
    const lines=receipt.winLines;if(lines.length){const line=lines[Math.floor(Math.max(0,at-this.settledAt)/1600)%lines.length];c.font=`${Math.max(10,12*l.scale)}px Arial,sans-serif`;c.fillStyle='#e4e78a';
      c.fillText(`LINE ${line.id||'—'}  ·  ${receipt.multiplier||1}x`,r.x+r.width/2,r.y+r.height*.9);}
  }
  snapshot(){return this.timeline.snapshot();}
  dispose(){if(this.disposed)return;this.disposed=true;if(this.frame!==null)this.win.cancelAnimationFrame?.(this.frame);this.frame=null;this.queuedReceipt=null;this.motionQuery?.removeEventListener?.('change',this.motionListener);this.timeline.dispose();this.overlay.dispose();this.onEvent=()=>{};}
}

