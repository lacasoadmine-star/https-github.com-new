// Burning Ice 40: 5x4 cabinet, using the unchanged server symbol indices.
const atlas=new Image();atlas.src='/slots/art/symbol-atlas-v2302.png';atlas.onload=()=>window.dispatchEvent(new Event('resize'));
const atlasIndex={cherry:0,lemon:2,orange:1,melon:5,'7':7,clover:8,dollar:9,star:12};
export const isBurning40=g=>g?.id==='sw-burning-ice-40-r3'&&g.cols===5&&g.rows===4;
export function drawBurning40({ctx,game,result,progress,animating,w,h,frameState,reelMotion,symbol,reduced}){
 const originalSymbol=symbol;symbol=(value,x,y,size)=>{const index=atlasIndex[game.symbols[value]];if(atlas.complete&&atlas.naturalWidth&&index!==undefined){const cw=atlas.naturalWidth/4,ch=atlas.naturalHeight/4;ctx.drawImage(atlas,(index%4)*cw,Math.floor(index/4)*ch,cw,ch,x-size/2,y-size/2,size,size)}else originalSymbol(value,x,y,size)};
 const seq=frameState(result,progress),frame=seq.frame,t=animating?seq.local:1;
 const grid=animating&&t<.65&&frame?.initial_grid?frame.initial_grid:frame?.grid||result?.grid;
 const pad=3,cw=(w-pad*2)/5,ch=(h-pad*2)/4;
 ctx.fillStyle='#043a28';ctx.fillRect(0,0,w,h);
 for(let c=0;c<5;c++){
  const x=pad+c*cw,m=reelMotion(animating?t:1,c,5,4),whole=Math.floor(m.position),offset=m.position-whole;
  const fill=ctx.createLinearGradient(x,0,x+cw,0);fill.addColorStop(0,'#00261c');fill.addColorStop(.5,'#075237');fill.addColorStop(1,'#00261c');ctx.fillStyle=fill;ctx.fillRect(x,pad,cw,h-pad*2);
  ctx.strokeStyle='#b8a24f';ctx.lineWidth=1;ctx.strokeRect(x,pad,cw,h-pad*2);
  ctx.save();ctx.beginPath();ctx.rect(x+1,pad+1,cw-2,h-pad*2-2);ctx.clip();
  const trail=animating&&!m.settled&&!reduced?ch*.10*Math.sin(Math.min(1,t/.2)*Math.PI/2):0;
  for(let r=-1;r<=4;r++){
   const target=r+m.travel-whole,value=grid&&target>=0&&target<4?grid[c][target]:((r+whole)*3+c*5+80)%(game.symbol_count||8);
   const y=pad+(r+.5+(m.settled?0:offset))*ch,size=Math.min(cw,ch)*.91;
   if(trail){ctx.globalCompositeOperation='lighter';for(const [dy,a]of [[-trail,.12],[0,.76],[trail,.12]]){ctx.globalAlpha=a;symbol(value,x+cw/2,y+dy,size)}ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}else symbol(value,x+cw/2,y,size);
  }
  ctx.restore();
 }
 if(result&&(!animating||t>.86)){ctx.strokeStyle='#ffe588';ctx.lineWidth=2;for(const win of [...(frame?.wins||[]),...(frame?.scatters||[])])for(const [c,r]of(win.cells||[])){if(c>=0&&c<5&&r>=0&&r<4)ctx.strokeRect(pad+c*cw+2,pad+r*ch+2,cw-4,ch-4)}}
}
