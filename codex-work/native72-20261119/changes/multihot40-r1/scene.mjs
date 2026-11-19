// Multi Hot 40 Canvas scene: live render loop; no screenshot/video gameplay.
// Sprite input must come from the title's acquired, hash-checked asset manifest.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class MultiHot40Scene {
 constructor({canvas,assets,raf=cb=>requestAnimationFrame(cb),caf=id=>cancelAnimationFrame(id),now=()=>performance.now(),onFrame=()=>{}}={}) {
  if(!canvas?.getContext)throw Error('MH40_CANVAS_REQUIRED');
  if(!assets?.background||!Array.isArray(assets.symbols)||assets.symbols.length!==8||!assets.symbols.every(Boolean))throw Error('MH40_OFFICIAL_ASSETS_REQUIRED');
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.assets=assets;this.raf=raf;this.caf=caf;this.now=now;this.onFrame=onFrame;
  this.grid=Array.from({length:4},()=>[3,2,6,4,4]);this.wheel=2;this.win=0;this.busy=false;this.stopping=false;this.paused=false;this.disposed=false;this.handle=0;this.elapsed=0;this.last=now();this.revealPromise=null;this.lastReceipt=null;this.stopAt=0;this.symbolNames=assets.symbolNames||null;
  this.render=this.render.bind(this);this.handle=this.raf(this.render);
 }
 setSymbolNames(names){
  if(names===undefined)return;
  if(!Array.isArray(names)||names.length!==this.assets.symbols.length
    ||names.some(n=>typeof n!=='string'||!n))throw Error('MH40_BAD_MODEL_SYMBOL_NAMES');
  this.symbolNames=[...names];
 }
 symbolIndex(symbol){
  if(Number.isInteger(symbol)&&symbol>=0&&symbol<this.assets.symbols.length)return symbol;
  if(typeof symbol==='string'){
   const index=this.symbolNames?.indexOf(symbol)??-1;
   if(index>=0)return index;
   if(/^[0-7]$/.test(symbol))return Number(symbol);
  }
  throw Error('MH40_UNKNOWN_RECEIPT_SYMBOL');
 }
 start(){if(this.disposed||this.busy)throw Error('MH40_SCENE_BUSY');this.busy=true;this.stopping=false;this.elapsed=0;this.win=0;this.stopAt=0;}
 stop(){if(this.busy)this.stopping=true;}
 reset(){this.busy=false;this.stopping=false;this.elapsed=0;this.win=0;this.stopAt=0;this.lastReceipt=null;if(this.revealPromise){const end=this.revealPromise;this.revealPromise=null;end.reject(Error('MH40_PRESENTATION_RESET'));}}
 reveal(receipt){
  if(!this.busy)throw Error('MH40_SCENE_NOT_SPINNING');
  if(this.revealPromise)throw Error('MH40_REVEAL_ALREADY_PENDING');
  // Normalize authoritative symbols BEFORE drawing so an invalid receipt can be
  // handled in the controller without stranding requestAnimationFrame or CONFIRM.
  if(!Array.isArray(receipt?.grid)||receipt.grid.length!==4
    ||receipt.grid.some(row=>!Array.isArray(row)||row.length!==5))throw Error('MH40_SCENE_GRID_INVALID');
  const grid=receipt.grid.map(row=>row.map(symbol=>this.symbolIndex(symbol)));
  this.lastReceipt={...receipt,grid};
  this.stopping=true;
  this.stopAt=this.elapsed+560;
  return new Promise((resolve,reject)=>{this.revealPromise={resolve,reject};});
 }
 pause(){this.paused=true;if(this.handle)this.caf(this.handle);this.handle=0;}
 resume(){if(this.disposed||!this.paused)return;this.paused=false;this.last=this.now();this.handle=this.raf(this.render);}
 drawImage(image,x,y,w,h){this.ctx.drawImage(image,x,y,w,h);}
 drawSymbol(image,x,y,w,h,shift=0,next=null){
  this.ctx.save();this.ctx.beginPath();this.ctx.rect(x,y,w,h);this.ctx.clip();
  this.drawImage(image,x,y+shift,w,h);
  if(next)this.drawImage(next,x,y+shift-h,w,h);
  this.ctx.restore();
 }
 draw(width,height){
  const ctx=this.ctx, dpr=clamp(globalThis.devicePixelRatio||1,1,2);
  const cw=Math.round(width*dpr),ch=Math.round(height*dpr);
  if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#06221a';ctx.fillRect(0,0,width,height);
  const designW=560,designH=1006,scale=Math.min(width/designW,height/designH),ox=(width-designW*scale)/2,oy=(height-designH*scale)/2;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  this.drawImage(this.assets.background,0,0,560,1006);
  // Keep all five columns inside the 560px cabinet; the old x=60+5*107
  // placed the rightmost reel beyond the canvas and cropped touch-visible art.
  const left=22,top=225,sw=103,sh=111;
  const settled=!!this.lastReceipt&&this.elapsed>=this.stopAt;
  for(let col=0;col<5;col++)for(let row=0;row<4;row++){
   const x=left+col*sw,y=top+row*sh;
   const columnStopped=!!this.lastReceipt&&this.elapsed>=this.stopAt-(4-col)*85;
   const rolling=this.busy&&!columnStopped;
   const symbol=columnStopped?this.lastReceipt.grid[row][col]:rolling?
    (Math.floor(this.elapsed/88)+col*3+row*2)%8:this.grid[row][col];
   const image=rolling?(this.assets.blur?.[symbol]||this.assets.symbols[symbol]):this.assets.symbols[symbol];
   if(!image)throw Error('MH40_SYMBOL_ASSET_MISSING');
   const next=rolling?(this.assets.blur?.[(symbol+1)%8]||this.assets.symbols[(symbol+1)%8]):null;
   const shift=rolling?((this.elapsed*(1.3+col*.13))%sh):0;
   this.drawSymbol(image,x,y,sw-3,sh-3,shift,next);
  }
  ctx.textAlign='center';ctx.font='bold 28px sans-serif';ctx.fillStyle='#ffe49a';
  ctx.fillText(String(settled?this.lastReceipt.wheelMultiplier:this.wheel)+'×',280,180);
  if(settled && this.lastReceipt.finalWin!=='0.00'){
   ctx.fillStyle='#fff0a5';ctx.fillText('WIN '+this.lastReceipt.finalWin+' ETB',280,740);
  }
  ctx.restore();
  if(settled && this.revealPromise){
   this.grid=this.lastReceipt.grid.map(row=>[...row]);this.wheel=this.lastReceipt.wheelMultiplier;
   this.busy=false;this.stopping=false;const done=this.revealPromise;this.revealPromise=null;done.resolve(this.lastReceipt);this.onFrame('settled');
  }
 }
 render(time){
  if(this.disposed||this.paused)return;
  const dt=clamp(time-this.last,0,80);this.last=time;
  if(this.busy)this.elapsed+=dt;
  const rect=this.canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  this.draw(w,h);
  this.handle=this.raf(this.render);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.paused=true;if(this.handle)this.caf(this.handle);this.handle=0;if(this.revealPromise){const done=this.revealPromise;this.revealPromise=null;done.reject(Error('MH40_SCENE_DISPOSED'));}}
}
export class MultiHot40Audio {
 constructor({clips={}}={}){this.clips=clips;this.enabled=false;this.music=false;this.paused=false;this.active=new Set();}
 setEnabled(enabled){
  this.enabled=!!enabled;
  if(!this.enabled){for(const clip of this.active)clip.pause?.();this.active.clear();}
  // Muting never changes this.paused: a backgrounded tab stays backgrounded,
  // and re-enabling sound on a visible page no longer remains stuck muted.
 }
 setMusic(enabled){this.music=!!enabled;if(!enabled)this.active.forEach(a=>{if(a.loop){a.pause();this.active.delete(a);}});}
 play(name,{loop=false}={}){if(!this.enabled||this.paused||(loop&&!this.music))return null;const source=this.clips[name];if(!source)return null;const a=typeof source.cloneNode==='function'?source.cloneNode(true):source;a.loop=loop;a.volume=loop?0.25:0.55;this.active.add(a);a.onended=()=>this.active.delete(a);Promise.resolve(a.play?.()).catch(()=>this.active.delete(a));return a;}
 pause(){this.paused=true;for(const a of this.active)a.pause?.();}
 resume(){this.paused=false;if(!this.enabled)return;for(const a of this.active){if(a.loop&&this.music)Promise.resolve(a.play?.()).catch(()=>{});}}
 dispose(){this.pause();this.active.clear();}
}
