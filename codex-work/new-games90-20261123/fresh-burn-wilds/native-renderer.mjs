/**
 * Multi Hot 5 Burn Wilds — new native Canvas presentation.
 * No screenshot/video playback, no fake balance, no game result generation.
 * A full, licensed, game-specific artwork atlas is a required dependency.
 * The reels animate while waiting for a validated, settled server receipt.
 */
import {GAME_ID, REELS, ROWS} from './contract.mjs';

const fail = code => {throw Object.assign(new Error(code), {code});};
const imageOK = image => image && Number.isFinite(image.width || image.naturalWidth) &&
  Number.isFinite(image.height || image.naturalHeight) &&
  (image.width || image.naturalWidth)>0 && (image.height || image.naturalHeight)>0;
const finitePositive = n => typeof n==='number' && Number.isFinite(n) && n>0;
const easeOutCubic = p => 1-(1-p)**3;

export class BurnWildsNativeRenderer {
  constructor({canvas,assets,clock=()=>performance.now(),
    requestFrame=callback=>requestAnimationFrame(callback),
    cancelFrame=id=>cancelAnimationFrame(id),
    sound=()=>{},onRoundFinished=()=>{}}={}) {
    if(!canvas || typeof canvas.getContext!=='function' || !canvas.style ||
       !assets || !assets.symbols || !imageOK(assets.cabinet) ||
       !Object.keys(assets.symbols).includes('wild') ||
       Object.keys(assets.symbols).length<2 ||
       Object.values(assets.symbols).some(x=>!imageOK(x)) ||
       typeof requestFrame!=='function' || typeof cancelFrame!=='function' ||
       typeof sound!=='function' || typeof onRoundFinished!=='function') fail('BURN_RENDERER_ASSETS_REQUIRED');
    this.canvas=canvas;
    this.context=canvas.getContext('2d',{alpha:false});
    if(!this.context)fail('BURN_CANVAS_REQUIRED');
    this.assets=assets;this.symbolKeys=Object.freeze(Object.keys(assets.symbols));
    this.clock=clock;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;
    this.sound=sound;this.onRoundFinished=onRoundFinished;
    this.phase='IDLE';this.pendingKey=null;this.receipt=null;this.lastReceipt=null;
    this.rafId=null;this.generation=0;this.startedAt=0;this.acceptedAt=0;
    this.fast=false;this.stopDelay=0;this.fired=new Set();this.disposed=false;
    this.geometry={width:390,height:694,dpr:1};
    this.resize({width:390,height:694,dpr:1});
  }
  snapshot(){return Object.freeze({phase:this.phase,requestKey:this.pendingKey,roundId:this.receipt?.roundId??null,
    accelerated:this.fast,geometry:Object.freeze({...this.geometry}),finished:this.phase==='RESULT'});}
  resize({width,height,dpr=1}={}) {
    if(this.disposed)return false;
    if(!finitePositive(width)||!finitePositive(height)||!finitePositive(dpr)||
       width<240||width>4000||height<300||height>4000)fail('BURN_VIEWPORT_INVALID');
    const pixelRatio=Math.min(2,dpr);
    this.geometry={width,height,dpr:pixelRatio};
    this.canvas.width=Math.max(1,Math.round(width*pixelRatio));
    this.canvas.height=Math.max(1,Math.round(height*pixelRatio));
    this.canvas.style.width=width+'px';this.canvas.style.height=height+'px';
    this.context.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    this.draw(this.clock());
    return true;
  }
  once(event,identity) {
    const key=identity+':'+event;
    if(this.fired.has(key))return;
    this.fired.add(key);this.sound(event);
  }
  start({requestKey}={}) {
    if(this.disposed||this.phase!=='IDLE'&&this.phase!=='READY')fail('BURN_RENDERER_BUSY');
    if(typeof requestKey!=='string'||requestKey.length<1||requestKey.length>180)fail('BURN_REQUEST_KEY_REQUIRED');
    this.generation++;this.pendingKey=requestKey;this.receipt=null;
    this.phase='SPINNING';this.startedAt=this.clock();this.fast=false;
    this.stopDelay=0;this.fired.clear();this.once('spin',requestKey);
    this.schedule();return this.snapshot();
  }
  accept(receipt){
    if(this.disposed||this.phase!=='SPINNING'||!receipt||receipt.serverSettled!==true ||
       receipt.gameId!==GAME_ID||receipt.requestKey!==this.pendingKey||
       typeof receipt.roundId!=='string'||!Array.isArray(receipt.finalGrid) ||
       receipt.finalGrid.length!==REELS||
       receipt.finalGrid.some(col=>!Array.isArray(col)||col.length!==ROWS||
          col.some(symbol=>!this.assets.symbols[symbol])) ||
       !Number.isSafeInteger(receipt.multiplier)||receipt.multiplier<1||receipt.multiplier>5 ||
       !Array.isArray(receipt.expandedColumns)||!Array.isArray(receipt.winningLines))fail('BURN_RENDERER_UNACCEPTED_RECEIPT');
    this.receipt=structuredClone(receipt);
    this.phase='DECELERATING';this.acceptedAt=this.clock();
    this.stopDelay=this.fast?230:1050;
    this.schedule();
    return this.snapshot();
  }
  accelerate() {
    if(!['SPINNING','DECELERATING'].includes(this.phase)||this.disposed)return false;
    this.fast=true;
    if(this.phase==='DECELERATING){
      const elapsed=this.clock()-this.acceptedAt;
      this.stopDelay=Math.min(this.stopDelay,Math.max(0,elapsed+230));
    }
    return true;
  }
  schedule(){
    if(this.rafId!==null||this.disposed)return;
    const generation=this.generation;
    this.rafId=this.requestFrame(time=>{
      this.rafId=null;
      if(this.disposed||generation!==this.generation)return;
      this.draw(Number.isFinite(time)?time:this.clock());
      if(this.phase==='SPINNING'||this.phase==='DECELERATING')this.schedule();
    });
  }
  geometryForReels() {
    const {width,height}=this.geometry;
    const left=width*.065,top=height*.218;
    const usableWidth=width*.87,usableHeight=height*.545;
    const gap=Math.max(1,width*.005);
    const cellW=(usableWidth-gap*(REELS-1))/REELS;
    const cellH=usableHeight/ROWS;
    return {left,top,usableWidth,usableHeight,gap,cellW,cellH};
  }
  symbolAt(col,row,time) {
    const source=this.receipt?.finalGrid ?? this.lastReceipt?.finalGrid;
    if(this.phase==='IDLE'||this.phase==='READY'||this.phase==='RESULT')return source?.[col]?.[row]??null;
    if(this.phase==='DECELERATING'){
      const elapsed=Math.max(0,time-this.acceptedAt);
      if(elapsed>=this.stopDelay*(col+1)/REELS)return source?.[col]?.[row]??null;
    }
    // Source artwork only. This visual cycling does not predict or decide a win.
    const phase=Math.floor((time-this.startedAt)/65+col*3+row*7);
    return this.symbolKeys[((phase%this.symbolKeys.length)+this.symbolKeys.length)%this.symbolKeys.length];
  }
  draw(now=this.clock()) {
    if(this.disposed)return;
    const {width,height}=this.geometry,ctx=this.context;
    ctx.save();ctx.clearRect(0,0,width,height);
    ctx.drawImage(this.assets.cabinet,0,0,width,height);
    const g=this.geometryForReels();
    ctx.save();ctx.beginPath();ctx.rect(g.left,g.top,g.usableWidth,g.usableHeight);ctx.clip();
    for(let col=0;col<REELS;col++) {
      for(let row=0;row<ROWS;row++) {
        const symbol=this.symbolAt(col,row,now);
        if(!symbol)continue;
        const image=this.assets.symbols[symbol];
        if(!image)fail('BURN_MISSING_OWN_SYMBOL_ASSET');
        const x=g.left+col*(g.cellW+g.gap),y=g.top+row*g.cellH;
        const inset=Math.min(g.cellW,g.cellH)*.05;
        ctx.drawImage(image,x+inset,y+inset,g.cellW-2*inset,g.cellH-2*inset);
      }
    }
    ctx.restore();
    if(this.receipt && ['RESULT','READY','DECELERATING'].includes(this.phase)) {
      const showLines=this.phase!=='DECELERATING' || now-this.acceptedAt>=this.stopDelay;
      if(showLines) {
        ctx.save();ctx.strokeStyle='#f7ca42';ctx.lineWidth=Math.max(2,width*.006);
        for(const line of this.receipt.winningLines){
          if(!Array.isArray(line.cells)||line.cells.length<2)continue;
          ctx.beginPath();
          line.cells.forEach(([col,row],i)=>{
            const x=g.left+col*(g.cellW+g.gap)+g.cellW/2;
            const y=g.top+row*g.cellH+g.cellH/2;
            i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
          });
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    // Multiplier is always the server value, never a locally spun wheel.
    if(this.receipt && ['RESULT','READY'].includes(this.phase)) {
      ctx.save();ctx.font='bold '+Math.max(17,Math.round(width*.056))+'px sans-serif';
      ctx.textAlign='center';ctx.fillStyle='#ffdc6b';
      ctx.fillText('×'+this.receipt.multiplier,width*.5,height*.145);
      ctx.restore();
    }
    ctx.restore();
    if(this.phase==='DECELERATING' && now-this.acceptedAt>=this.stopDelay){
      this.phase='RESULT';
      for(let col=0;col<REELS;col++)this.once('reel-stop-'+(col+1),this.pendingKey);
      if(this.receipt.winMinor>0)this.once('win',this.pendingKey);
      this.onRoundFinished(this.receipt.roundId);
    } else if(this.phase==='DECELERATING') {
      for(let col=0;col<REELS;col++){
        if(now-this.acceptedAt>=this.stopDelay*(col+1)/REELS)
          this.once('reel-stop-'+(col+1),this.pendingKey);
      }
    }
  }
  finish(roundId){
    if(this.phase!=='RESULT'||this.receipt?.roundId!==roundId)return false;
    this.lastReceipt=this.receipt;this.receipt=null;this.pendingKey=null;
    this.phase='READY';this.draw(this.clock());return true;
  }
  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.generation++;
    if(this.rafId!==null)this.cancelFrame(this.rafId);
    this.rafId=null;this.fired.clear();
  }
}
