// fresh_multihot20 — standalone original reel *presentation*, not a wallet or payout engine.
// Twenty fixed paylines; never infer wins or multipliers client-side.
// Images/sounds must be injected from verified assets already kept in the existing
// Cloudflare reference system. No screenshot/video overlay and no client-generated wins.
// This module is STAGED ONLY; it does not expose a public Play Now route.
export const PRESENTATION_GAME_ID="fresh_multihot20";
const REELS=5, ROWS=3, WIDTH=960, HEIGHT=600;
// Dimensions measured against 1440×900 official gameplay capture, scaled to 960×600.
const X=235,Y=170,REEL_W=96,TILE_H=96,GAP=0;
const VIEW_GRID_WIDTH=REELS*(REEL_W+GAP)-GAP;
const num=n=>Number.isFinite(n)?n:0;
const noop=()=>{};
export class MultiHot20Scene {
 constructor({canvas,symbols,assets={},audio={},strictAssets=true,
   doc=globalThis.document,win=globalThis.window,
   clock=()=>performance.now(),
   requestFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id)}={}){
  if(!canvas?.getContext)throw Error('CANVAS_REQUIRED');
  if(!Array.isArray(symbols)||symbols.length<2||symbols.some(s=>typeof s!=='string'||!s))throw Error('VALIDATED_SYMBOL_SET_REQUIRED');
  this.canvas=canvas;this.ctx=canvas.getContext('2d');
  if(!this.ctx)throw Error('CANVAS_CONTEXT_UNAVAILABLE');
  this.symbols=[...symbols];this.assets=assets;this.audio=audio;this.strictAssets=strictAssets;
  this.doc=doc;this.win=win;this.clock=clock;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;
  this.width=WIDTH;this.height=HEIGHT;this.rolling=false;this.disposed=false;
  this.current=null;this.receipt=null;this.pending=null;this.finishAt=0;this.stopHint=false;
  this.lastTime=0;this.frames=0;this.frameId=null;this.reelStopped=Array(REELS).fill(false);
  this.fpsSamples=[];this.resolveAnimation=null;this.reducedMotion=false;this.hidden=false;this.focused=true;
  this.onVisibility=()=>{this.hidden=!!this.doc?.hidden||!this.focused;this.pauseAudio();if(this.hidden&&this.pending)this._finish();else if(!this.hidden)this._paint(this.clock())};
  this.onBlur=()=>{this.focused=false;this.hidden=true;this.pauseAudio();if(this.pending)this._finish()};
  this.onFocus=()=>{this.focused=true;this.hidden=!!this.doc?.hidden;this._paint(this.clock())};
  doc?.addEventListener?.('visibilitychange',this.onVisibility);
  win?.addEventListener?.('blur',this.onBlur);
  win?.addEventListener?.('focus',this.onFocus);
  this.resize();
 }
 _asset(symbol){return this.assets instanceof Map?this.assets.get(symbol):this.assets[symbol]}
 _verifySymbols(){
  if(this.strictAssets&&this.symbols.some(s=>{const a=this._asset(s);return !a||!(a.complete??true)||!((a.naturalWidth??a.width)>0)}))throw Error('OFFICIAL_SPRITES_NOT_READY');
 }
 _sound(name){if(this.hidden||this.doc?.hidden||this.disposed)return;try{this.audio.play?.(name)}catch{ /* A broken speaker never changes a server receipt. */ }}
 resize(){
  const box=this.canvas.getBoundingClientRect(),w=box.width||WIDTH,h=box.height||HEIGHT;
  const dpr=Math.max(1,Math.min(2,this.win?.devicePixelRatio||1));
  this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
  this.ctx.setTransform(this.canvas.width/WIDTH,0,0,this.canvas.height/HEIGHT,0,0);
  this._paint(this.clock());
 }
 start(){
  if(this.disposed||this.rolling)throw Error('REELS_NOT_READY');
  if(this.hidden||this.doc?.hidden)throw Error('GAME_NOT_VISIBLE');
  this._verifySymbols();this.rolling=true;this.stopHint=false;this.pending=null;this.finishAt=0;
  this.reelStopped.fill(false);this.startedAt=this.clock();this.lastTime=0;this.frames=0;this.fpsSamples=[];
  this._sound('spin');this._loop();
 }
 speedUp(){if(!this.rolling)return false;this.stopHint=true;if(this.pending)this.finishAt=Math.min(this.finishAt,this.clock()+140);return true}
 async settle(receipt){
  if(this.disposed)throw Error('SCENE_DISPOSED');
  if(!this.rolling)throw Error('SPIN_NOT_STARTED');
  if(!receipt||receipt.gameId!==PRESENTATION_GAME_ID||
      !Array.isArray(receipt.grid)||receipt.grid.length!==ROWS||
      receipt.grid.some(row=>!Array.isArray(row)||row.length!==REELS||
        row.some(s=>!this.symbols.includes(s))))throw Error('SERVER_GRID_REQUIRED');
  // This is a visual receipt only. The controller has independently validated
  // the game math, wallet settlement, stake, and request identity already.
  this.pending=receipt;
  this.finishAt=this.clock()+(this.stopHint?160:690);
  if(this.hidden||this.doc?.hidden||this.reducedMotion){this._finish();return true}
  return new Promise(resolve=>{this.resolveAnimation=resolve});
 }
 _loop(){
  if(this.disposed||!this.rolling||this.frameId!==null)return;
  this.frameId=this.requestFrame(time=>{
   this.frameId=null;
   if(this.disposed||!this.rolling)return;
   const now=num(time)||this.clock();
   if(this.lastTime>0){const dt=now-this.lastTime;if(dt>1&&dt<200)this.fpsSamples.push(1000/dt);if(this.fpsSamples.length>120)this.fpsSamples.shift()}
   this.lastTime=now;this.frames++;
   if(this.pending&&now>=this.finishAt+(REELS-1)*95){this._finish();return}
   if(!this.hidden)this._paint(now);
   this._loop();
  });
 }
 _symbol(ctx,s,x,y,w,h){
  const a=this._asset(s);
  ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,8);ctx.clip();
  if(a&&((a.naturalWidth??a.width)>0))ctx.drawImage(a,x,y,w,h);
  else{ctx.fillStyle='#2c1c26';ctx.fillRect(x,y,w,h);ctx.fillStyle='#ffd7a3';ctx.textAlign='center';ctx.font='bold 17px sans-serif';ctx.fillText(this.strictAssets?'ASSET REQUIRED':s,x+w/2,y+h/2)}
  ctx.restore();
 }
 _displaySymbol(row,col,now){
  if(this.pending&&now>=this.finishAt+col*95)return this.pending.grid[row][col];
  if(!this.rolling&&this.current)return this.current[row][col];
  const spinStep=Math.floor((now-(this.startedAt??now))/(70+col*8));
  return this.symbols[((spinStep+(row*3)+(col*7))%this.symbols.length+this.symbols.length)%this.symbols.length];
 }
 _paint(time){
  if(this.disposed)return;
  const ctx=this.ctx,now=num(time)||this.clock();
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  const g=ctx.createLinearGradient(0,0,0,HEIGHT);
  g.addColorStop(0,'#541b15');g.addColorStop(.5,'#240b17');g.addColorStop(1,'#0b0e19');
  ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
  const background=this._asset('__background');
  if(background&&(background.naturalWidth??background.width)>0){
   try{ctx.drawImage(background,0,0,WIDTH,HEIGHT)}catch{ /* Keep Canvas interactive if a decoded image fails. */ }
  }
  // Official wheel texture, with selected multiplier driven by the server receipt.
  // During a spin only the decorative wheel number moves; NEVER compute a payout here.
  const wheel=this._asset('__wheel');
  if(wheel&&(wheel.naturalWidth??wheel.width)>0){
   try{ctx.drawImage(wheel,240,55,480,145)}catch{}
   const value=this.rolling?
       this.pending&&now>=this.finishAt?this.pending.wheelMultiplier:1+(Math.floor((now-(this.startedAt??now))/130)%5):
       this.receipt?.wheelMultiplier||2;
   const multiplier=Number.isInteger(value)&&value>=1&&value<=5?value:2;
   ctx.beginPath();ctx.moveTo(440,74);ctx.lineTo(538,74);ctx.lineTo(529,159);ctx.lineTo(448,159);ctx.closePath();
   ctx.fillStyle='rgba(0,81,52,.98)';ctx.fill();ctx.strokeStyle='#bd7446';ctx.lineWidth=3;ctx.stroke();
   ctx.textAlign='center';ctx.font='bold 42px Georgia,serif';ctx.lineWidth=2;
   ctx.strokeStyle='#633313';ctx.fillStyle='#fce078';ctx.strokeText(multiplier+'×',489,134);ctx.fillText(multiplier+'×',489,134);
  }
  ctx.save();ctx.textAlign='left';ctx.shadowColor='#f32761';ctx.shadowBlur=9;
  ctx.font='bold 38px Georgia,serif';ctx.fillStyle='#ffd259';ctx.fillText('MULTI HOT',37,110);
  ctx.fillStyle='#ff4293';ctx.fillText('20',259,110);ctx.restore();
  
  ctx.fillStyle='#130f16';ctx.fillRect(X-7,Y-9,VIEW_GRID_WIDTH+14,ROWS*TILE_H+18);
  for(let col=0;col<REELS;col++){
   const x=X+col*(REEL_W+GAP);
   ctx.fillStyle='#51321d';ctx.fillRect(x-3,Y-3,REEL_W+6,ROWS*TILE_H+6);
   for(let row=0;row<ROWS;row++){
    const sym=this._displaySymbol(row,col,now),y=Y+row*TILE_H;
    this._symbol(ctx,sym,x+2,y+2,REEL_W-4,TILE_H-4);
    if(this.rolling&&!(this.pending&&now>=this.finishAt+col*95)){
     // Visual-only motion blur; final symbols come EXCLUSIVELY from receipt.grid.
     const cy=(now-(this.startedAt??now))%(TILE_H/1.5);
     ctx.fillStyle='rgba(255,241,209,0.08)';ctx.fillRect(x+5,y+(cy%80),REEL_W-10,5);
    }
   }
   if(this.pending&&now>=this.finishAt+col*95&&!this.reelStopped[col]){
    this.reelStopped[col]=true;this._sound('reel-stop');
   }
  }
  const receipt=this.pending||this.receipt;
  if(!this.rolling&&receipt){
   ctx.lineWidth=4;ctx.strokeStyle='#f9db6c';ctx.shadowColor='#ff9e30';ctx.shadowBlur=12;
   for(const line of receipt.winLines||[]){
    for(const p of line.positions||[]){
     const row=Array.isArray(p)?p[0]:p.row,col=Array.isArray(p)?p[1]:p.col;
     if(Number.isInteger(row)&&Number.isInteger(col)&&row>=0&&row<ROWS&&col>=0&&col<REELS)
      ctx.strokeRect(X+col*(REEL_W+GAP)+2,Y+row*TILE_H+2,REEL_W-4,TILE_H-4);
    }
   }
   ctx.shadowBlur=0;
   
  }
  // The artwork shows one multiplier wheel, not a fictional vertical 1×–5× list.
  // Account BET/WIN labels and buttons belong to the real interactive UI layer.
  ctx.shadowBlur=0;ctx.strokeStyle='#b98b46';ctx.lineWidth=3;
  ctx.strokeRect(X-5,Y-5,VIEW_GRID_WIDTH+10,ROWS*TILE_H+10);
  
 }
 _finish(){
  if(!this.pending||this.disposed)return;
  // Complete all five reel-stop events exactly once. RAF's final frame can jump
  // straight into finish, so the fifth sound cannot depend on another paint.
  // Never emit reel-stop or win audio after blur/visibility loss.
  for(let i=0;i<REELS;i++){if(!this.reelStopped[i]){this.reelStopped[i]=true;this._sound('reel-stop')}}
  this.current=this.pending.grid.map(row=>[...row]);this.receipt=this.pending;
  this.pending=null;this.rolling=false;
  if(this.frameId!==null){this.cancelFrame(this.frameId);this.frameId=null}
  this._paint(this.clock());
  if(Number(this.receipt.finalWin)>0)this._sound('win');
  const resolve=this.resolveAnimation;this.resolveAnimation=null;resolve?.(true);
 }
 pauseAudio(){try{this.audio.pauseAll?.()}catch{}}
 resumeOptedInMusic(){if(!this.hidden&&!this.doc?.hidden)try{this.audio.resumeOptedInMusic?.()}catch{}}
 reset(){
  if(this.frameId!==null){this.cancelFrame(this.frameId);this.frameId=null}
  const resolve=this.resolveAnimation;this.resolveAnimation=null;resolve?.(false);
  this.rolling=false;this.pending=null;this.current=null;this.receipt=null;this.stopHint=false;this.reelStopped.fill(false);
  this._paint(this.clock());this.pauseAudio();
 }
 inspect(){const sample=this.fpsSamples;return{gameId:PRESENTATION_GAME_ID,rolling:this.rolling,receiptId:this.receipt?.roundId||null,frames:this.frames,fpsSampleCount:sample.length,averageSampledFps:sample.length?sample.reduce((s,v)=>s+v,0)/sample.length:null,originalArtworkProvided:this.symbols.every(s=>!!this._asset(s)),usesServerReceiptOnly:true}}
 dispose(){if(this.disposed)return;this.reset();this.disposed=true;this.doc?.removeEventListener?.('visibilitychange',this.onVisibility);this.win?.removeEventListener?.('blur',this.onBlur);this.win?.removeEventListener?.('focus',this.onFocus)}
}
