// fresh_multihot20 — standalone original reel *presentation*, not a wallet or payout engine.
// Twenty fixed paylines; never infer wins or multipliers client-side.
// Images/sounds must be injected from verified assets already kept in the existing
// Cloudflare reference system. No screenshot/video overlay and no client-generated wins.
// This module is STAGED ONLY; it does not expose a public Play Now route.
export const PRESENTATION_GAME_ID="fresh_multihot20";
const REELS=5, ROWS=3, WIDTH=960, HEIGHT=600;
const X=176,Y=110,REEL_W=143,TILE_H=128,GAP=8;
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
  this.fpsSamples=[];this.resolveAnimation=null;this.reducedMotion=false;this.hidden=false;
  this.onVisibility=()=>{this.hidden=!!this.doc?.hidden;this.pauseAudio();if(this.hidden&&this.pending)this._finish();else if(!this.hidden)this._paint(this.clock())};
  this.onBlur=()=>{this.hidden=true;this.pauseAudio();if(this.pending)this._finish()};
  this.onFocus=()=>{this.hidden=!!this.doc?.hidden;this._paint(this.clock())};
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
  const spinStep=Math.floor((now-(this.startedAt||now))/(70+col*8));
  return this.symbols[((spinStep+(row*3)+(col*7))%this.symbols.length+this.symbols.length)%this.symbols.length];
 }
 _paint(time){
  if(this.disposed)return;
  const ctx=this.ctx,now=num(time)||this.clock();
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  const g=ctx.createLinearGradient(0,0,0,HEIGHT);
  g.addColorStop(0,'#541b15');g.addColorStop(.5,'#240b17');g.addColorStop(1,'#0b0e19');
  ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.font='bold 32px sans-serif';ctx.textAlign='left';ctx.fillStyle='#f2c56e';
  ctx.fillText("MULTI HOT 20",X,66);
  ctx.fillStyle='#130f16';ctx.fillRect(X-7,Y-9,VIEW_GRID_WIDTH+14,ROWS*TILE_H+18);
  for(let col=0;col<REELS;col++){
   const x=X+col*(REEL_W+GAP);
   ctx.fillStyle='#51321d';ctx.fillRect(x-3,Y-3,REEL_W+6,ROWS*TILE_H+6);
   for(let row=0;row<ROWS;row++){
    const sym=this._displaySymbol(row,col,now),y=Y+row*TILE_H;
    this._symbol(ctx,sym,x+2,y+2,REEL_W-4,TILE_H-4);
    if(this.rolling&&!(this.pending&&now>=this.finishAt+col*95)){
     // Visual-only motion blur; final symbols come EXCLUSIVELY from receipt.grid.
     const cy=(now-(this.startedAt||now))%(TILE_H/1.5);
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
  ctx.fillStyle='#f6bd56';ctx.textAlign='center';ctx.font='bold 20px sans-serif';
  for(let i=1;i<=5;i++){ctx.fillText(i+'×',95,Y+26+(i-1)*72)}
  ctx.textAlign='left';ctx.fillStyle='#ffffff';ctx.font='16px sans-serif';
  ctx.fillText(this.rolling?'REELS MOVING — STOP AVAILABLE':receipt?'SERVER RESULT DISPLAYED':'AWAITING SPIN',X,HEIGHT-42);
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
  this.rolling=false;this.pending=null;this.stopHint=false;this.reelStopped.fill(false);
  this._paint(this.clock());this.pauseAudio();
 }
 inspect(){const sample=this.fpsSamples;return{gameId:PRESENTATION_GAME_ID,rolling:this.rolling,receiptId:this.receipt?.roundId||null,frames:this.frames,fpsSampleCount:sample.length,averageSampledFps:sample.length?sample.reduce((s,v)=>s+v,0)/sample.length:null,originalArtworkProvided:this.symbols.every(s=>!!this._asset(s)),usesServerReceiptOnly:true}}
 dispose(){if(this.disposed)return;this.reset();this.disposed=true;this.doc?.removeEventListener?.('visibilitychange',this.onVisibility);this.win?.removeEventListener?.('blur',this.onBlur);this.win?.removeEventListener?.('focus',this.onFocus)}
}
