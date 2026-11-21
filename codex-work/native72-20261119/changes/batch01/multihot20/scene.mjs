// Multi Hot 20 presentation only. The authenticated server owns every result.
// Fresh 2026-11-21 demo inspection confirmed five columns and three rows.
export const PRESENTATION_GAME_ID = 'fresh_multihot20';
export const SCENE_LAYOUT = Object.freeze({
 width:600,height:600,reels:5,rows:3,x:45,y:252,reelWidth:102,tileHeight:102
});
// Explicit presentation timings, not a claim of measured official timing parity.
export const MULTIHOT20_MOTION = Object.freeze({
 accelerationMs:150,reelStartDelayMs:12,speedPixelsPerMs:1.35,
 settleDurationMs:690,reelDelayMs:95,fastSettleDurationMs:200,fastReelDelayMs:35,
 minimumRunInTiles:4
});
const {width:WIDTH,height:HEIGHT,reels:REELS,rows:ROWS,x:X,y:Y,reelWidth:REEL_W,tileHeight:TILE_H}=SCENE_LAYOUT;
const GRID_W=REELS*REEL_W,GRID_H=ROWS*TILE_H;
const finite=n=>Number.isFinite(n)?n:0;
const modulo=(n,d)=>((n%d)+d)%d;
const drawable=a=>!!a&&((a.naturalWidth??a.width)>0)&&((a.naturalHeight??a.height)>0);

export class MultiHot20Scene {
 constructor({canvas,symbols,assets={},audio={},strictAssets=true,
   doc=globalThis.document,win=globalThis.window,clock=()=>performance.now(),
   requestFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id)}={}){
  if(!canvas?.getContext)throw Error('CANVAS_REQUIRED');
  if(!Array.isArray(symbols)||symbols.length<2||symbols.some(s=>typeof s!=='string'||!s))throw Error('VALIDATED_SYMBOL_SET_REQUIRED');
  this.canvas=canvas;this.ctx=canvas.getContext('2d');
  if(!this.ctx)throw Error('CANVAS_CONTEXT_UNAVAILABLE');
  this.symbols=[...symbols];this.assets=assets;this.audio=audio;this.strictAssets=strictAssets;
  this.doc=doc;this.win=win;this.clock=clock;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;
  this.width=WIDTH;this.height=HEIGHT;this.rolling=false;this.disposed=false;
  this.current=null;this.receipt=null;this.pending=null;this.reelPlans=null;this.finishAt=0;this.stopHint=false;
  this.lastTime=null;this.frames=0;this.frameId=null;this.reelStopped=Array(REELS).fill(false);
  this.fpsSamples=[];this.resolveAnimation=null;this.reducedMotion=false;this.pageHidden=false;
  this.focused=typeof doc?.hasFocus==='function'?doc.hasFocus():true;
  this.hidden=!!doc?.hidden||!this.focused;
  this.onVisibility=()=>this._visibility();
  this.onBlur=()=>{this.focused=false;this._visibility()};
  this.onFocus=()=>{this.focused=true;this._visibility()};
  this.onPageHide=()=>{this.pageHidden=true;this._visibility()};
  this.onPageShow=()=>{this.pageHidden=false;this.focused=typeof doc?.hasFocus==='function'?doc.hasFocus():this.focused;this._visibility()};
  doc?.addEventListener?.('visibilitychange',this.onVisibility);
  win?.addEventListener?.('blur',this.onBlur);win?.addEventListener?.('focus',this.onFocus);
  win?.addEventListener?.('pagehide',this.onPageHide);win?.addEventListener?.('pageshow',this.onPageShow);
  this.resize();
 }
 _asset(symbol){return this.assets instanceof Map?this.assets.get(symbol):this.assets[symbol]}
 _verifySymbols(){if(this.strictAssets&&this.symbols.some(s=>{const a=this._asset(s);return !drawable(a)||!(a.complete??true)}))throw Error('OFFICIAL_SPRITES_NOT_READY')}
 _sound(name){if(this.hidden||this.doc?.hidden||this.disposed)return;try{this.audio.play?.(name)}catch{/* Audio cannot change a receipt. */}}
 _stopSound(name){try{this.audio.stop?.(name)}catch{}}
 _cancelFrame(){if(this.frameId!==null){this.cancelFrame(this.frameId);this.frameId=null}}
 _visibility(){
  if(this.disposed)return;
  this.hidden=this.pageHidden||!!this.doc?.hidden||!this.focused;
  if(this.hidden){this._cancelFrame();this.pauseAudio();if(this.pending)this._finish();return}
  this.lastTime=null;this._paint(this.clock());this._loop();
 }
 resize(){
  if(this.disposed)return;
  const box=this.canvas.getBoundingClientRect(),w=box.width||WIDTH,h=box.height||HEIGHT;
  const dpr=Math.max(1,Math.min(2,this.win?.devicePixelRatio||1));
  this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
  this.ctx.setTransform(this.canvas.width/WIDTH,0,0,this.canvas.height/HEIGHT,0,0);
  this._paint(this.clock());
 }
 start(){
  if(this.disposed||this.rolling)throw Error('REELS_NOT_READY');
  if(this.hidden||this.doc?.hidden)throw Error('GAME_NOT_VISIBLE');
  this._verifySymbols();this.rolling=true;this.stopHint=false;this.pending=null;this.reelPlans=null;this.finishAt=0;
  this.reelStopped.fill(false);this.startedAt=this.clock();this.lastTime=null;this.frames=0;this.fpsSamples=[];
  this._stopSound('win');this._sound('spin');this._loop();
 }
 // Decorative strip travel has no RNG and cannot select a winning symbol.
 // Positions are continuous pixel offsets; only a verified receipt supplies
 // the terminal three symbols. No fixed-cell swapping or fake blur streaks.
 _motionAt(col,now){
  const plan=this.reelPlans?.[col];
  if(plan){
   const duration=plan.endTime-plan.startTime;
   const u=Math.max(0,Math.min(1,(now-plan.startTime)/duration));
   if(u===1)return{position:plan.endPosition,velocity:0};
   const u2=u*u,u3=u2*u,delta=plan.endPosition-plan.startPosition;
   return{
    position:plan.startPosition+(-2*u3+3*u2)*delta+(u3-2*u2+u)*plan.startVelocity*duration,
    velocity:(-6*u2+6*u)*delta/duration+(3*u2-4*u+1)*plan.startVelocity
   };
  }
  const cfg=MULTIHOT20_MOTION;
  const elapsed=Math.max(0,now-this.startedAt-col*cfg.reelStartDelayMs),ramp=cfg.accelerationMs,speed=cfg.speedPixelsPerMs;
  return elapsed<ramp?
   {position:speed*elapsed*elapsed/(2*ramp),velocity:speed*elapsed/ramp}:
   {position:speed*(elapsed-ramp/2),velocity:speed};
 }
 _plan(col,now,duration,endPosition){
  const {position,velocity}=this._motionAt(col,now);
  const targetSteps=endPosition===undefined?Math.ceil((position+Math.max(TILE_H*MULTIHOT20_MOTION.minimumRunInTiles,velocity*duration/2))/TILE_H):Math.round(endPosition/TILE_H);
  const target=targetSteps*TILE_H;
  return {startTime:now,endTime:now+duration,startPosition:position,endPosition:target,targetSteps,
   startVelocity:Math.max(0,Math.min(velocity,3*(target-position)/duration))};
 }
 speedUp(){
  if(!this.rolling)return false;
  if(this.stopHint)return true;
  this.stopHint=true;
  if(this.reelPlans){
   const now=this.clock(),cfg=MULTIHOT20_MOTION;
   // Preserve already inserted target tiles. STOP shortens presentation only;
   // neither the authoritative grid nor the destination offsets are changed.
   this.reelPlans=this.reelPlans.map((plan,col)=>plan.endTime<=now?plan:
    this._plan(col,now,Math.min(plan.endTime-now,cfg.fastSettleDurationMs+col*cfg.fastReelDelayMs),plan.endPosition));
   this.finishAt=this.reelPlans[0].endTime;
  }
  return true;
 }
 _receiptSnapshot(receipt){
  if(!receipt||receipt.gameId!==PRESENTATION_GAME_ID||!Array.isArray(receipt.grid)||receipt.grid.length!==ROWS||
     receipt.grid.some(row=>!Array.isArray(row)||row.length!==REELS||row.some(s=>!this.symbols.includes(s))))throw Error('SERVER_GRID_REQUIRED');
  return {...receipt,grid:receipt.grid.map(row=>[...row]),winLines:(receipt.winLines||[]).map(line=>({...line,
   positions:(line.positions||[]).map(p=>Array.isArray(p)?[...p]:{...p})}))};
 }
 // The app validates the authenticated historical receipt and its original bet
 // before calling this. Restoring cannot start animation, emit sound or settle
 // a wallet again; it only paints that already settled server result.
 restore(receipt){
  if(this.disposed)throw Error('SCENE_DISPOSED');
  if(this.rolling||this.pending)throw Error('REELS_NOT_READY');
  const snapshot=this._receiptSnapshot(receipt);
  this._cancelFrame();this.current=snapshot.grid.map(row=>[...row]);this.receipt=snapshot;
  this.pending=null;this.reelPlans=null;this.stopHint=false;this.reelStopped.fill(true);
  this._paint(this.clock());return true;
 }
 async settle(receipt){
  if(this.disposed)throw Error('SCENE_DISPOSED');
  if(!this.rolling)throw Error('SPIN_NOT_STARTED');
  if(this.pending)throw Error('RECEIPT_ALREADY_PENDING');
  // Snapshot the server presentation data so a caller cannot alter a moving
  // strip by subsequently mutating its grid. Never compute or adjust payouts.
  this.pending=this._receiptSnapshot(receipt);
  const now=this.clock(),cfg=MULTIHOT20_MOTION;
  this.reelPlans=Array.from({length:REELS},(_,col)=>this._plan(col,now,
   (this.stopHint?cfg.fastSettleDurationMs:cfg.settleDurationMs)+col*(this.stopHint?cfg.fastReelDelayMs:cfg.reelDelayMs)));
  this.finishAt=this.reelPlans[0].endTime;
  if(this.hidden||this.doc?.hidden||this.reducedMotion){this._finish();return true}
  return new Promise(resolve=>{this.resolveAnimation=resolve;this._loop()});
 }
 _loop(){
  if(this.disposed||!this.rolling||this.hidden||this.doc?.hidden||this.frameId!==null)return;
  this.frameId=this.requestFrame(time=>{
   this.frameId=null;
   if(this.disposed||!this.rolling||this.hidden||this.doc?.hidden)return;
   const now=Number.isFinite(time)?time:this.clock();
   if(this.lastTime!==null){const dt=now-this.lastTime;if(dt>1&&dt<200)this.fpsSamples.push(1000/dt);if(this.fpsSamples.length>120)this.fpsSamples.shift()}
   this.lastTime=now;this.frames++;
   if(this.pending){
    for(let col=0;col<REELS;col++)if(!this.reelStopped[col]&&now>=this.reelPlans[col].endTime){this.reelStopped[col]=true;this._sound('reel-stop')}
    if(this.reelStopped.every(Boolean)){this._finish();return}
   }
   this._paint(now);this._loop();
  });
 }
 _symbol(ctx,s,x,y,w,h){
  const a=this._asset(s);
  if(drawable(a)){
   const aw=a.naturalWidth??a.width,ah=a.naturalHeight??a.height,scale=Math.min(w/aw,h/ah);
   ctx.drawImage(a,x+(w-aw*scale)/2,y+(h-ah*scale)/2,aw*scale,ah*scale);
  }else{
   ctx.fillStyle='#052f23';ctx.fillRect(x,y,w,h);ctx.fillStyle='#e0c46b';ctx.textAlign='center';ctx.font='bold 15px sans-serif';
   ctx.fillText(this.strictAssets?'ASSET REQUIRED':s,x+w/2,y+h/2);
  }
 }
 _stripSymbol(index,col){
  const plan=this.reelPlans?.[col],row=plan?index+plan.targetSteps:-1;
  if(this.pending&&row>=0&&row<ROWS)return this.pending.grid[row][col];
  if(index>=0&&index<ROWS&&this.current)return this.current[index][col];
  return this.symbols[modulo(index*3+col*7,this.symbols.length)];
 }
 _paint(time){
  if(this.disposed)return;
  const ctx=this.ctx,now=Number.isFinite(time)?time:this.clock();
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  const g=ctx.createLinearGradient(0,0,0,HEIGHT);g.addColorStop(0,'#064b34');g.addColorStop(.55,'#003223');g.addColorStop(1,'#031c16');
  ctx.fillStyle=g;ctx.fillRect(0,0,WIDTH,HEIGHT);
  const background=this._asset('__background');
  if(drawable(background)){
   const aw=background.naturalWidth??background.width,ah=background.naturalHeight??background.height,scale=Math.max(WIDTH/aw,HEIGHT/ah);
   try{ctx.drawImage(background,(WIDTH-aw*scale)/2,(HEIGHT-ah*scale)/2,aw*scale,ah*scale)}catch{}
  }
  ctx.save();ctx.font='bold 43px Georgia,serif';ctx.textAlign='left';ctx.shadowColor='#142611';ctx.shadowBlur=8;
  const prefix='MULTI HOT ',prefixWidth=finite(ctx.measureText?.(prefix)?.width)||270,numberWidth=finite(ctx.measureText?.('20')?.width)||54;
  const titleX=(WIDTH-prefixWidth-numberWidth)/2;
  ctx.fillStyle='#ffdb6d';ctx.fillText(prefix,titleX,64);ctx.fillStyle='#fa5791';ctx.fillText('20',titleX+prefixWidth,64);ctx.restore();
  const wheel=this._asset('__wheel');
  if(drawable(wheel)){
   // The verified 842×251 help texture includes the whole wheel. Preserve its
   // source aspect ratio; stretching it vertically changes its centre plate.
   try{ctx.drawImage(wheel,45,100,510,510*251/842)}catch{}
   const value=this.rolling?(this.pending&&now>=this.finishAt?this.pending.wheelMultiplier:1+modulo(Math.floor((now-this.startedAt)/130),5)):this.receipt?.wheelMultiplier||2;
   const multiplier=Number.isInteger(value)&&value>=1&&value<=5?value:2;
   // Replace only the baked-in sample value inside the actual centre plate.
   // The original artwork retains its frame and the neighbouring segments.
   ctx.beginPath();ctx.moveTo(244,136);ctx.lineTo(357,136);ctx.lineTo(339,230);ctx.lineTo(262,230);ctx.closePath();
   ctx.fillStyle='rgba(0,64,35,.99)';ctx.fill();
   ctx.textAlign='center';ctx.font='bold 45px Georgia,serif';ctx.lineWidth=2;ctx.strokeStyle='#633313';ctx.fillStyle='#fce078';
   ctx.strokeText(multiplier+'×',300,197);ctx.fillText(multiplier+'×',300,197);
  }
  ctx.fillStyle='#062b20';ctx.fillRect(X-5,Y-5,GRID_W+10,GRID_H+10);
  for(let col=0;col<REELS;col++){
   const x=X+col*REEL_W,offset=this.rolling?this._motionAt(col,now).position:0;
   ctx.save();ctx.beginPath();ctx.rect(x,Y,REEL_W,GRID_H);ctx.clip();
   ctx.fillStyle=col%2?'rgba(0,35,25,.86)':'rgba(0,43,28,.86)';ctx.fillRect(x,Y,REEL_W,GRID_H);
   const first=Math.floor(-offset/TILE_H)-1,last=Math.ceil((GRID_H-offset)/TILE_H);
   for(let index=first;index<=last;index++){
    const symbol=this.rolling?this._stripSymbol(index,col):(this.current?.[index]?.[col]??this.symbols[modulo(index*3+col*7,this.symbols.length)]);
    this._symbol(ctx,symbol,x+4,Y+index*TILE_H+offset+4,REEL_W-8,TILE_H-8);
   }
   ctx.restore();
   ctx.strokeStyle='#bca459';ctx.lineWidth=1;ctx.strokeRect(x,Y,REEL_W,GRID_H);
  }
  if(!this.rolling&&this.receipt){
   ctx.lineWidth=3;ctx.strokeStyle='#f9db6c';ctx.shadowColor='#ffba36';ctx.shadowBlur=12;
   for(const line of this.receipt.winLines||[])for(const p of line.positions||[]){
    const row=Array.isArray(p)?p[0]:p.row,col=Array.isArray(p)?p[1]:p.col;
    if(Number.isInteger(row)&&Number.isInteger(col)&&row>=0&&row<ROWS&&col>=0&&col<REELS)ctx.strokeRect(X+col*REEL_W+3,Y+row*TILE_H+3,REEL_W-6,TILE_H-6);
   }
  }
  ctx.shadowBlur=0;ctx.strokeStyle='#e1bf62';ctx.lineWidth=3;ctx.strokeRect(X-3,Y-3,GRID_W+6,GRID_H+6);
 }
 _finish(){
  if(!this.pending||this.disposed)return;
  this._stopSound('spin');
  for(let col=0;col<REELS;col++)if(!this.reelStopped[col]){this.reelStopped[col]=true;this._sound('reel-stop')}
  this.current=this.pending.grid.map(row=>[...row]);this.receipt=this.pending;this.pending=null;this.reelPlans=null;this.rolling=false;
  this._cancelFrame();this._paint(this.clock());
  if(Number(this.receipt.finalWin)>0)this._sound('win');
  const resolve=this.resolveAnimation;this.resolveAnimation=null;resolve?.(true);
 }
 pauseAudio(){try{this.audio.pauseAll?.()}catch{}}
 resumeOptedInMusic(){if(!this.hidden&&!this.doc?.hidden&&!this.disposed)try{this.audio.resumeOptedInMusic?.()}catch{}}
 reset(){
  this._cancelFrame();this._stopSound('spin');
  const resolve=this.resolveAnimation;this.resolveAnimation=null;resolve?.(false);
  this.rolling=false;this.pending=null;this.reelPlans=null;this.current=null;this.receipt=null;this.stopHint=false;this.reelStopped.fill(false);
  this._paint(this.clock());this.pauseAudio();
 }
 inspect(){const sample=this.fpsSamples;return{gameId:PRESENTATION_GAME_ID,rolling:this.rolling,receiptId:this.receipt?.roundId||null,frames:this.frames,fpsSampleCount:sample.length,
  averageSampledFps:sample.length?sample.reduce((s,v)=>s+v,0)/sample.length:null,originalArtworkProvided:this.symbols.every(s=>drawable(this._asset(s))),usesServerReceiptOnly:true}}
 dispose(){
  if(this.disposed)return;this.disposed=true;this.reset();
  this.doc?.removeEventListener?.('visibilitychange',this.onVisibility);
  this.win?.removeEventListener?.('blur',this.onBlur);this.win?.removeEventListener?.('focus',this.onFocus);
  this.win?.removeEventListener?.('pagehide',this.onPageHide);this.win?.removeEventListener?.('pageshow',this.onPageShow);
 }
}
