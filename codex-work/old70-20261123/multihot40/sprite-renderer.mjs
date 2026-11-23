import {paintWheel,paintWin,winPresentation} from './win-presentation.mjs';
/** Trim/rotation aware Canvas sprite drawing. Receives this title's own atlas frames. */
export function drawSprite(ctx,image,descriptor,x,y,width,height) {
  const f=descriptor?.frame,t=descriptor?.trim,s=descriptor?.sourceSize;
  if(!f||!t||!s||![f.x,f.y,f.w,f.h,t.x,t.y,t.w,t.h,s.w,s.h,width,height].every(Number.isFinite)||
      f.w<=0||f.h<=0||s.w<=0||s.h<=0)throw Error('MH40_SPRITE_GEOMETRY');
  const scale=Math.min(width/s.w,height/s.h),ox=x+(width-s.w*scale)/2,oy=y+(height-s.h*scale)/2;
  ctx.save();
  if(descriptor.rotated){
    ctx.translate(ox+t.x*scale,oy+(t.y+t.h)*scale);
    ctx.rotate(-Math.PI/2);
    ctx.drawImage(image,f.x,f.y,f.w,f.h,0,0,t.h*scale,t.w*scale);
  }else ctx.drawImage(image,f.x,f.y,f.w,f.h,ox+t.x*scale,oy+t.y*scale,t.w*scale,t.h*scale);
  ctx.restore();
}
export function cabinetLayout(width,height) {
  if(![width,height].every(v=>Number.isFinite(v)&&v>0))throw Error('MH40_VIEWPORT');
  const scale=Math.min(width/560,height/840),left=(width-560*scale)/2,top=(height-840*scale)/2;
  return {scale,left,top,reels:{x:20,y:220,w:520,h:440},cellW:104,cellH:110};
}
const idleGrid=[[3,2,6,4,4],[2,7,5,1,1],[3,7,4,7,7],[3,7,4,2,7]];
export function createSpriteRenderer({canvas,artwork,motion,onComplete=()=>{},
  raf=fn=>requestAnimationFrame(fn),caf=id=>cancelAnimationFrame(id),
  now=()=>performance.now(),dpr=()=>Math.min(2,globalThis.devicePixelRatio||1)}={}) {
  if(!canvas?.getContext||!artwork?.symbols||artwork.symbols.length!==8||
    artwork.symbols.some(s=>!s?.image||!s?.descriptor)||!motion)throw Error('MH40_RENDER_DEPENDENCIES');
  const ctx=canvas.getContext('2d',{alpha:false});
  let handle=0,disposed=false,paused=false,grid=idleGrid.map(r=>[...r]),round=null,completion=null,pendingCompletion=null,winStart=0,winUntil=0,winTier=null,pauseStart=null;
  function cell(symbol,x,y,w,h,blur=false) {
    const sprite=blur&&artwork.blur?.[symbol]||artwork.symbols[symbol];
    drawSprite(ctx,sprite.image,sprite.descriptor,x,y,w,h);
  }
  function paint(time) {
    handle=0;
    if(disposed||paused)return;
    const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
    const ratio=Math.min(2,Math.max(1,dpr())),cw=Math.round(width*ratio),ch=Math.round(height*ratio);
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#002a20';ctx.fillRect(0,0,width,height);
    const layout=cabinetLayout(width,height);ctx.save();ctx.translate(layout.left,layout.top);ctx.scale(layout.scale,layout.scale);
    if(artwork.background){const image=artwork.background,factor=Math.max(560/image.width,840/image.height),sw=560/factor,sh=840/factor;
      ctx.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,0,0,560,840);}
    const state=motion.tick(time),active=state.phase==='spinning',source=state.round?.grid||grid;
    if(state.phase==='complete'&&completion!==state.round.requestId){
      completion=state.round.requestId;round=state.round;grid=source.map(r=>[...r]);motion.finish(completion);
      pendingCompletion=completion;winTier=winPresentation(round.winMinor,round.betMinor);winStart=time;winUntil=time+(winTier?.duration||0);
    }
    ctx.fillStyle='#001a12';ctx.fillRect(20,220,520,440);
    for(let column=0;column<5;column++){
      const move=state.columns[column],rolling=active&&move&&!move.stopped;
      ctx.save();ctx.beginPath();ctx.rect(20+column*104,220,104,440);ctx.clip();
      if(rolling){
        // Draw a continuous six-cell strip, including both clipped neighbors.
        const travel=move.travel,whole=Math.floor(travel),fraction=travel-whole;
        for(let row=-1;row<=4;row++)cell((whole+column*3+row+16)%8,20+column*104,
          220+(row+fraction)*110,104,110,true);
      }else for(let row=0;row<4;row++)cell(source[row][column],20+column*104,
        220+(row+(move?.bounce||0))*110,104,110);
      ctx.restore();
      ctx.strokeStyle='#b99543';ctx.lineWidth=1;ctx.strokeRect(20+column*104,220,104,440);
    }
    ctx.strokeStyle='#f4d17a';ctx.lineWidth=3;ctx.strokeRect(19,219,522,442);
    ctx.textAlign='center';ctx.fillStyle='#ffe19c';ctx.font='bold 42px sans-serif';
    ctx.fillText('MULTI HOT 40',280,42);
    paintWheel(ctx,state.round?.multiplier||round?.multiplier||2,active?state.columns[0].travel:null);
    if(round&&!active){
      const positions=new Set(round.wins.flatMap(w=>w.positions.map(p=>p.row+':'+p.column)));
      ctx.strokeStyle='#ffe987';ctx.lineWidth=4;ctx.globalAlpha=time<winUntil?.65+Math.sin(time/100)*.35:1;
      for(const p of positions){const [r,c]=p.split(':').map(Number);ctx.strokeRect(23+c*104,223+r*110,98,104);}
    }
    ctx.globalAlpha=1;
    if(pendingCompletion&&winTier)paintWin(ctx,round,winTier,time>=winUntil?1:(time-winStart)/Math.min(1600,winTier.duration),time);
    ctx.restore();
    if(pendingCompletion&&time>=winUntil){const id=pendingCompletion;pendingCompletion=null;onComplete(id);}
    if((active||pendingCompletion)&&!handle)handle=raf(paint);
  }
  function invalidate(){if(!disposed&&!paused&&!handle)handle=raf(time=>{handle=0;paint(time);});}
  function start(result,options={}){if(pendingCompletion)throw Error('MH40_CELEBRATION_IN_PROGRESS');completion=null;winTier=null;winUntil=0;motion.start(result,{...options,now:now()});invalidate();}
  return Object.freeze({start,invalidate,
    restore(result){if(pendingCompletion||motion.snapshot(now()).phase!=='idle'||!Array.isArray(result?.grid)||result.grid.length!==4||result.grid.some(r=>!Array.isArray(r)||r.length!==5||r.some(v=>!Number.isInteger(v)||v<0||v>7)))throw Error('MH40_RESTORE_GRID');
      round=structuredClone(result);grid=round.grid.map(r=>[...r]);completion=round.requestId;invalidate();},
    stop(){motion.stop(now());if(pendingCompletion)winUntil=Math.min(winUntil,now()+80);invalidate();},
    pause(){if(paused)return;paused=true;pauseStart=now();motion.pause(pauseStart);if(handle)caf(handle);handle=0;},
    resume(){if(disposed)return;const at=now();if(paused&&pendingCompletion){const delta=Math.max(0,at-pauseStart);winStart+=delta;winUntil+=delta;}paused=false;pauseStart=null;motion.resume(at);invalidate();},
    dispose(){disposed=true;if(handle)caf(handle);handle=0;motion.dispose();}
  });
}
