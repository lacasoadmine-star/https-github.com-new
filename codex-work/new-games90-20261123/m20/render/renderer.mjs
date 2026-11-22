import { GAME_ID } from '../presentation-quote.mjs';
import { validatePresentation, moneyMinor, amount } from '../controls.mjs';
import { VIEW, REELS, INITIAL_BOARD, SYMBOL_FRAME, clipForColumn } from './layout.mjs';

// Fit to own follow-up M20 samples: reel1 settled703–775ms, reel3 at1235–1284,
// reel5 at1748–1824 and normal SPIN restored2005–2074ms. Sampling is not frame-perfect parity.
export const OBSERVED_MOTION = Object.freeze({ sampled: true, framePerfectParity: false, initialMs: 550,
  staggerMs: 250, settleMs: 150, presentationEndMs: 2050, cycleMs: 210, stopFinishMs: 300 });
// The own native Numbers ring has14 illustrated sectors, with repeated1..5 values.
// These selected sectors match the observed neighbours:1 flanked by4/3;3 by1/5;5 by3/2.
export const WHEEL_ANGLE = Object.freeze({ 1:3*Math.PI/7, 2:0, 3:2*Math.PI/7, 4:-Math.PI/7, 5:Math.PI/7 });
const copyGrid = grid => grid.map(row => [...row]);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function text(ctx, value, x, y, size=16, color='#fff', bold=false, align='center') {
  ctx.fillStyle=color;ctx.font=`${bold?'bold ':''}${size}px Arial, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(value,x,y);
}
export class MultiHot20Renderer {
  constructor({ canvas, atlas, background, art = {}, onEvent = () => {}, motion = OBSERVED_MOTION } = {}) {
    if (!canvas?.getContext || !atlas || !background) throw new Error('M20_RENDER_ASSETS_REQUIRED');
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.atlas=atlas;this.background=background;this.art=art;
    this.onEvent=onEvent;this.motion=Object.freeze({...motion});this.grid=copyGrid(INITIAL_BOARD);
    this.round=null;this.pending=null;this.target=null;this.seen=new Map();this.events=new Set();
    this.multiplier=2;this.winVisible=false;this.winProjection='0.00';this.phase='IDLE';this.startedAt=0;this.acceptedAt=0;this.finishedAt=0;
    this.wheelSegment=null;
    this.state={bet:'0.20',balance:null,currency:'DMO',quick:false};
    this.canvas.width=VIEW.width;this.canvas.height=VIEW.height;
  }
  emit(name, key) { const id=`${key}:${name}`;if(this.events.has(id))return;this.events.add(id);this.onEvent({name,key,gameId:GAME_ID}); }
  setDisplay({ bet, balance, currency, quick } = {}) {
    if(bet!==undefined){moneyMinor(bet,{positive:true});this.state.bet=bet;}
    if(balance!==undefined){if(balance!==null)moneyMinor(balance);this.state.balance=balance;}
    if(currency!==undefined){if(!['DMO','ETB'].includes(currency))throw new Error('M20_CURRENCY_UNSUPPORTED');this.state.currency=currency;}
    if(quick!==undefined)this.state.quick=quick===true;
  }
  begin(intent, now) {
    if(intent?.gameId!==GAME_ID||intent.action!=='SPIN'||typeof intent.requestKey!=='string'||!Number.isFinite(now))throw new Error('M20_PRESENTATION_INTENT_REQUIRED');
    if(this.pending || this.phase!=='IDLE')return false;
    moneyMinor(intent.bet,{positive:true});
    this.previousWin={visible:this.winVisible,amount:this.winProjection};
    this.pending=Object.freeze({...intent});this.phase='WAITING';this.startedAt=now;this.target=null;this.stopRequested=false;this.stopAt=null;this.wheelSegment=null;
    this.winVisible=false;this.winProjection='0.00';this.emit('spin',intent.requestKey);return true;
  }
  accept(input, now) {
    const receipt=validatePresentation(input),serial=JSON.stringify(receipt);
    if(this.seen.has(receipt.roundId)){
      if(this.seen.get(receipt.roundId)!==serial)throw new Error('M20_CONFLICTING_RENDER_REPLAY');
      return false;
    }
    if(!this.pending || this.pending.requestKey!==receipt.requestKey || this.pending.bet!==receipt.bet || this.target)throw new Error('M20_RENDER_RECEIPT_BINDING_MISMATCH');
    if(!Number.isFinite(now))throw new Error('M20_RENDER_CLOCK_REQUIRED');
    const acceptedAt=Math.max(this.startedAt,now),wheelFrom=this.wheelAngle(acceptedAt);
    this.seen.set(receipt.roundId,serial);this.target=receipt;this.acceptedAt=acceptedAt;this.phase='SETTLING';
    this.settleWheelFrom(wheelFrom,acceptedAt);return true;
  }
  requestStop(now) {
    if(!this.pending || this.stopRequested)return false;
    if(!Number.isFinite(now))throw new Error('M20_RENDER_CLOCK_REQUIRED');
    const wheelFrom=this.wheelAngle(now);
    this.stopRequested=true;
    this.stopAt=now;
    if(this.target)this.settleWheelFrom(wheelFrom,now);
    // Own STOP click748–834ms: symbols resolved by908–994ms, bounce settled by1067–1114ms.
    // Only accelerate presentation of this receipt. Before a receipt exists, continue waiting for it.
    this.emit('stop-request',this.pending.requestKey);return true;
  }
  cancelUnsent(key) {
    if(this.pending?.requestKey!==key||this.target)throw new Error('M20_CANNOT_CANCEL_RENDER');
    this.pending=null;this.phase='IDLE';this.stopRequested=false;this.wheelSegment=null;this.winVisible=this.previousWin.visible;this.winProjection=this.previousWin.amount;
  }
  collect(roundId) {
    if(this.phase!=='IDLE'||this.round?.roundId!==roundId)return false;
    this.winVisible=false;this.winProjection='0.00';this.emit('collect',roundId);return true;
  }
  /** A trusted current pending projection never replaces the immutable reel outcome. */
  updatePendingProjection(view) {
    if(this.phase!=='IDLE'||!this.round||view?.gameId!==GAME_ID||view.roundId!==this.round.roundId||
      view.requestKey!==this.round.requestKey||view.bet!==this.round.bet||view.multiplier!==this.round.multiplier||!same(view.grid,this.round.grid))return false;
    moneyMinor(view.winAmount);this.winProjection=view.winAmount;this.winVisible=moneyMinor(view.winAmount)>0;return true;
  }
  snapshot() { return { gameId:GAME_ID,phase:this.phase,grid:copyGrid(this.grid),round:this.round,pending:this.pending,
    winVisible:this.winVisible,winAmount:this.winProjection,multiplier:this.multiplier,stopRequested:!!this.stopRequested,
    niceWinActive:this.niceWinActive(this.lastRenderedAt??0),
    emittedEvents:this.events.size,seenRoundCount:this.seen.size,motionTimingSampled:true,motionParityVerified:false }; }
  niceWinActive(now) { return this.phase==='IDLE'&&this.winVisible&&this.round?.winTier==='NICE_WIN'&&!!this.art.niceWin&&
    now>=this.finishedAt&&now-this.finishedAt<6500; }
  stopTime(column) {
    const normal=this.acceptedAt+this.motion.initialMs+column*this.motion.staggerMs;
    if(!this.stopRequested)return normal;
    return Math.min(normal,Math.max(this.stopAt,this.acceptedAt)+column*30);
  }
  advance(now) {
    if(this.phase!=='SETTLING')return;
    for(let column=0;column<5;column++)if(now>=this.stopTime(column)+this.motion.settleMs)this.emit(`reel-stop-${column+1}`,this.target.roundId);
    const end=this.stopRequested?Math.max(this.stopAt,this.acceptedAt)+this.motion.stopFinishMs:
      Math.max(this.startedAt+this.motion.presentationEndMs,this.stopTime(4)+this.motion.settleMs);
    if(now<end)return;
    const target=this.target;this.grid=copyGrid(target.grid);this.round=target;this.multiplier=target.multiplier;
    this.winProjection=target.winAmount;this.winVisible=moneyMinor(target.winAmount)>0;
    if(target.balance!==null)this.state.balance=target.balance;
    this.state.bet=target.bet;this.pending=null;this.target=null;this.phase='IDLE';this.finishedAt=now;this.wheelSegment=null;
    this.emit('multiplier',target.roundId);if(this.winVisible)this.emit('win',target.roundId);this.emit('settled',target.roundId);
  }
  symbol(symbol,column,row,offset=0,moving=false) {
    const x=REELS.x+column*REELS.cell+REELS.cell/2,y=REELS.y+row*REELS.cell+REELS.cell/2+offset;
    // Full source size preserves transparent padding and native symbol scale. Never use the tiny Lines/* icons.
    this.atlas.draw(this.ctx,moving?SYMBOL_FRAME[symbol].replace('Box/','Box/Blur/'):SYMBOL_FRAME[symbol],x-159,y-159,318,318);
  }
  drawReels(now) {
    for(let column=0;column<5;column++){
      const clip=clipForColumn(column),ctx=this.ctx;ctx.save();ctx.beginPath();ctx.rect(clip.x,clip.y,clip.width,clip.height);ctx.clip();
      let settled=false;
      if(this.target&&now>=this.stopTime(column)+this.motion.settleMs)settled=true;
      if(this.phase==='IDLE'||settled){const grid=settled?this.target.grid:this.grid;for(let row=0;row<3;row++)this.symbol(grid[row][column],column,row);}
      else {
        // Only currently known symbols move. This is presentation, never random outcome selection.
        const progress=(now-this.startedAt)/this.motion.cycleMs,phase=((progress%1)+1)%1;
        if(this.target&&now>=this.stopTime(column)){
          const t=Math.min(1,(now-this.stopTime(column))/this.motion.settleMs),offset=(1-t)*(1-t)*REELS.cell;
          for(let row=-1;row<3;row++)this.symbol(this.target.grid[(row+3)%3][column],column,row,offset);
        } else for(let row=-1;row<4;row++)this.symbol(this.grid[(row+3)%3][column],column,row,phase*REELS.cell,true);
      }
      ctx.restore();
    }
  }
  wheelAngle(now) {
    const initial=WHEEL_ANGLE[this.multiplier];
    if(this.phase==='IDLE')return initial;
    const segment=this.wheelSegment;
    if(!segment)return initial+Math.max(0,now-this.startedAt-300)/900*Math.PI*2;
    const progress=Math.max(0,Math.min(1,(now-segment.startedAt)/(segment.endsAt-segment.startedAt)));
    return segment.from+segment.distance*(1-(1-progress)**3);
  }
  settleWheelFrom(from,now) {
    const turn=Math.PI*2,target=WHEEL_ANGLE[this.target.multiplier];
    const forward=((target-from)%turn+turn)%turn;
    // Keep the current drawn angle when delivery is late or STOP accelerates it.
    // The normal retained timeline is 300ms delay + 950ms settling; latency
    // rebases that settling interval instead of skipping straight to its end.
    const startedAt=this.stopRequested?now:Math.max(now,this.startedAt+300);
    this.wheelSegment=Object.freeze({from,startedAt,endsAt:startedAt+(this.stopRequested?120:950),
      distance:forward+(this.stopRequested?0:turn)});
  }
  drawWheel(now) {
    const ctx=this.ctx,diameter=829,x=672.5-diameter/2,y=40,numbersDiameter=760,numbersY=50;
    ctx.save();ctx.beginPath();ctx.rect(329,0,687,215);ctx.clip();
    this.atlas.draw(ctx,'Multiplier/Background',x,y,diameter,diameter);
    if(this.winVisible&&this.art.multiplier)this.art.multiplier.draw(ctx,'back fire loop',now/1000,{x:-20.3,y:61.7,scaleX:.628});
    const angle=this.wheelAngle(now);
    ctx.save();ctx.translate(672.5,numbersY+numbersDiameter/2);ctx.rotate(angle);
    this.atlas.draw(ctx,'Multiplier/Numbers',-numbersDiameter/2,-numbersDiameter/2,numbersDiameter,numbersDiameter);ctx.restore();
    if(this.phase==='IDLE'||this.target){
      ctx.save();ctx.beginPath();ctx.moveTo(585,58);ctx.lineTo(755,58);ctx.lineTo(712,213);ctx.lineTo(627,213);ctx.closePath();ctx.clip();
      ctx.translate(672.5,numbersY+numbersDiameter/2);ctx.rotate(angle);this.atlas.draw(ctx,'Multiplier/Light',-numbersDiameter/2,-numbersDiameter/2,numbersDiameter,numbersDiameter);ctx.restore();
    }
    if(this.winVisible&&this.art.multiplier)this.art.multiplier.draw(ctx,'charcho cecxli loop',now/1000,
      {x:-20.3,y:61.7,scaleX:.628,slots:['charcho_2','charcho_1']});
    ctx.restore();
  }
  activeLine(now) {
    if(!this.winVisible||!this.round?.lines.length||this.phase!=='IDLE')return null;
    return this.round.lines[Math.floor(Math.max(0,now-this.finishedAt)/1600)%this.round.lines.length];
  }
  drawWin(now) {
    const line=this.activeLine(now);if(!line)return;
    const ctx=this.ctx;
    // The original 20-line native paths share one logical 888x450 coordinate system.
    for(const candidate of this.round.lines)this.atlas.draw(ctx,`Box/Line/${candidate.lineId}`,394,274,555,286);
    if(this.art.winFrame){
      const cells=new Set();for(const candidate of this.round.lines)for(let column=0;column<candidate.count;column++)cells.add(`${column}:${candidate.path[column]}`);
      for(const cell of cells){const[column,row]=cell.split(':').map(Number);
        const x=REELS.x+column*REELS.cell,y=REELS.y+row*REELS.cell;
        ctx.save();ctx.beginPath();ctx.rect(x-3,y-3,REELS.cell+6,REELS.cell+6);ctx.clip();
        this.art.winFrame.draw(ctx,'animation',now/1000,{x:x-13,y:y-16,scaleX:.65,scaleY:1});ctx.restore();
      }
    }
    text(ctx,`Line ${line.lineId}`,534,641,12,'#d9e66e');
    for(let i=0;i<line.count;i++)this.atlas.draw(ctx,`Lines/${Object.keys(SYMBOL_FRAME).indexOf(line.symbol)}`,564+i*28,630,25,25);
    text(ctx,`${amount(line.baseMinor)} x ${line.multiplier} = ${amount(line.quotedMinor)} ${this.state.currency}`,770,641,12,'#d9e66e');
  }
  drawFooter(now) {
    const ctx=this.ctx;
    this.atlas.draw(ctx,'Start/FooterBalance',378,662,166,52);
    this.atlas.draw(ctx,'Start/FooterBet',806,662,166,52);
    text(ctx,'BALANCE',461,680,15,'#ffff75');text(ctx,'BET',889,680,15,'#ffff75');
    const balance=this.state.balance===null?'—':Number(this.state.balance).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    text(ctx,`${balance} ${this.state.currency}`,461,698,14,'#fff',true);
    text(ctx,`${this.state.bet} ${this.state.currency}`,889,698,14,'#fff',true);
    if(this.winVisible&&!this.niceWinActive(now)){this.atlas.draw(ctx,'Start/FooterWin',587,661,176,55);text(ctx,'WIN',675,679,15,'#ffff75');text(ctx,`${this.winProjection} ${this.state.currency}`,675,698,15,'#fff',true);}
  }
  render(now=0,{includeNiceWin=true}={}) {
    this.lastRenderedAt=now;this.advance(now);const ctx=this.ctx;ctx.clearRect(0,0,VIEW.width,VIEW.height);
    const scale=VIEW.height/this.background.height,width=this.background.width*scale;
    ctx.drawImage(this.background,(VIEW.width-width)/2,0,width,VIEW.height);
    this.drawWheel(now);
    this.atlas.draw(ctx,'Box/Background',320,46.5,704,594);
    this.drawReels(now);
    this.art.logo?.draw(ctx,'animation',now/1000,{x:34,y:90,scaleX:.56});
    this.drawWin(now);this.drawFooter(now);
    const winElapsed=(now-this.finishedAt)/1000;
    if(includeNiceWin&&this.winVisible&&this.round.winTier==='NICE_WIN'&&this.art.niceWin&&winElapsed>=0&&winElapsed<6.5){
      ctx.fillStyle='rgba(0,7,17,.58)';ctx.fillRect(0,0,VIEW.width,VIEW.height);
      this.art.niceWin.draw(ctx,'Nice Win',Math.min(6.4,winElapsed+1.7),{x:394,y:99,scaleX:.63,loop:false});
      text(ctx,`${this.winProjection} ${this.state.currency}`,674,466,23,'#ffff64',true);
    }
    return this.snapshot();
  }
}
