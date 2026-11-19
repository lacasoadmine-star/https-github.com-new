// Multi Hot 40 Canvas scene: live render loop; no screenshot/video gameplay.
// Sprite input must come from the title's acquired, hash-checked asset manifest.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class MultiHot40Scene {
 constructor({canvas,assets,raf=cb=>requestAnimationFrame(cb),caf=id=>cancelAnimationFrame(id),now=()=>performance.now(),onFrame=()=>{}}={}) {
  if(!canvas?.getContext)throw Error('MH40_CANVAS_REQUIRED');
  if(!assets?.background||!Array.isArray(assets.symbols)||assets.symbols.length!==8||!assets.symbols.every(Boolean))throw Error('MH40_OFFICIAL_ASSETS_REQUIRED');
  this.canvas=canvas;this.ctx=canvas.getContext('2d');this.assets=assets;this.raf=raf;this.caf=caf;this.now=now;this.onFrame=onFrame;
  this.grid=Array.from({length:4},()=>[3,2,6,4,4]);this.wheel=2;this.win=0;this.busy=false;this.stopping=false;this.paused=false;this.disposed=false;this.handle=0;this.elapsed=0;this.last=now();this.revealPromise=null;this.lastReceipt=null;
  this.render=this.render.bind(this);this.handle=this.raf(this.render);
 }
 start(){if(this.disposed||this.busy)throw Error('MH40_SCENE_BUSY');this.busy=true;this.stopping=false;this.elapsed=0;this.win=0;}
 stop(){if(this.busy)this.stopping=true;}
 reset(){this.busy=false;this.stopping=false;this.elapsed=0;this.win=0;this.lastReceipt=null;if(this.revealPromise){const end=this.revealPromise;this.revealPromise=null;end.reject(Error('MH40_PRESENTATION_RESET'));}}
 reveal(receipt){if(!this.busy)throw Error('MH40_SCENE_NOT_SPINNING');if(this.revealPromise)throw Error('MH40_REVEAL_ALREADY_PENDING');this.lastReceipt=receipt;this.stopping=true;return new Promise((resolve,reject)=>{this.revealPromise={resolve,reject};});}
 pause(){this.paused=true;if(this.handle)this.caf(this.handle);this.handle=0;}
 resume(){if(this.disposed||!this.paused)return;this.paused=false;this.last=this.now();this.handle=this.raf(this.render);}
 drawImage(image,x,y,w,h){this.ctx.drawImage(image,x,y,w,h);}
 drawSymbol(image,x,y,w,h){this.ctx.save();this.ctx.beginPath();this.ctx.rect(x,y,w,h);this.ctx.clip();this.drawImage(image,x,y,w,h);this.ctx.restore();}
 draw(width,height){
  const ctx=this.ctx, dpr=clamp(globalThis.devicePixelRatio||1,1,2);
  const cw=Math.round(width*dpr),ch=Math.round(height*dpr);
  if(this.canvas.width!==cw||this.canvas.height!==ch){this.canvas.width=cw;this.canvas.height=ch;}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#06221a';ctx.fillRect(0,0,width,height);
  const designW=560,designH=1006,scale=Math.min(width/designW,height/designH),ox=(width-designW*scale)/2,oy=(height-designH*scale)/2;
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  this.drawImage(this.assets.background,0,0,560,1006);
  const left=60,top=225,sw=107,sh=111;
  const minTime=this.stopping?500:Infinity;
  const settled=this.lastReceipt && this.elapsed>=minTime;
  const animationCycle=Math.floor(this.elapsed/65);
  for(let col=0;col<5;col++)for(let row=0;row<4;row++){
   const x=left+col*sw,y=top+row*sh;
   const symbol=settled?this.lastReceipt.grid[row][col]:this.busy?(animationCycle+col*3+row*2)%8:this.grid[row][col];
   const image=this.busy&&!settled&&this.assets.blur?.[symbol]?this.assets.blur[symbol]:this.assets.symbols[symbol];
   if(!image)throw Error('MH40_SYMBOL_ASSET_MISSING');
   this.drawSymbol(image,x,y,sw-3,sh-3);
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
 setEnabled(enabled){this.enabled=!!enabled;if(!enabled)this.pause();}
 setMusic(enabled){this.music=!!enabled;if(!enabled)this.active.forEach(a=>{if(a.loop){a.pause();this.active.delete(a);}});}
 play(name,{loop=false}={}){if(!this.enabled||this.paused||(loop&&!this.music))return null;const source=this.clips[name];if(!source)return null;const a=typeof source.cloneNode==='function'?source.cloneNode(true):source;a.loop=loop;a.volume=loop?0.25:0.55;this.active.add(a);a.onended=()=>this.active.delete(a);a.play?.().catch(()=>this.active.delete(a));return a;}
 pause(){this.paused=true;for(const a of this.active)a.pause?.();}
 resume(){if(!this.enabled)return;this.paused=false;for(const a of this.active){if(a.loop&&this.music)a.play?.().catch(()=>{});}}
 dispose(){this.pause();this.active.clear();}
}
