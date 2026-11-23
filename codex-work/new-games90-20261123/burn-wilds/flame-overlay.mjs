import {BURN_WILDS_GAME_ID} from './expansion.mjs';

/** Deterministic visual fire only; its column selection comes from the receipt timeline. */
export class BurnWildsFlameOverlay {
  constructor({canvas}={}) {
    if(typeof canvas?.getContext!=='function')throw new TypeError('BURN_WILDS_OVERLAY_CANVAS');
    this.canvas=canvas;this.context=canvas.getContext('2d');this.width=canvas.clientWidth||390;this.height=canvas.clientHeight||780;this.dpr=1;this.disposed=false;
  }
  resize(width,height,dpr=1) {
    if(this.disposed)return;
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||!Number.isFinite(dpr)||dpr<=0)throw new TypeError('BURN_WILDS_OVERLAY_SIZE');
    this.width=width;this.height=height;this.dpr=Math.min(2,dpr);this.canvas.width=Math.round(width*this.dpr);this.canvas.height=Math.round(height*this.dpr);
    if(this.canvas.style){this.canvas.style.width=`${width}px`;this.canvas.style.height=`${height}px`;this.canvas.style.pointerEvents='none';}
  }
  draw(snapshot,{reels,at=0}={}) {
    if(this.disposed)return;
    if(snapshot?.gameId!==BURN_WILDS_GAME_ID||!Array.isArray(snapshot.expansions)||!Array.isArray(reels)||reels.length!==5||!Number.isFinite(at)
      ||reels.some(r=>![r?.x,r?.y,r?.width,r?.height].every(Number.isFinite)||r.width<=0||r.height<=0)
      ||snapshot.expansions.some(item=>!Number.isInteger(item.column)||item.column<1||item.column>3||!Number.isFinite(item.progress)||item.progress<0||item.progress>1||!Number.isFinite(item.flame)||item.flame<0||item.flame>1))throw new TypeError('BURN_WILDS_OVERLAY_SNAPSHOT');
    const c=this.context;if(!c)return;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);
    for(const item of snapshot.expansions) {
      if(item.flame<=0)continue;
      const r=reels[item.column],strength=item.flame,pulse=at/145+item.column*2.1;
      c.save();c.beginPath();c.rect(r.x,r.y,r.width,r.height);c.clip();
      const glow=c.createLinearGradient(r.x,0,r.x+r.width,0);glow.addColorStop(0,`rgba(255,65,0,${strength*.24})`);glow.addColorStop(.5,`rgba(255,194,39,${strength*.16})`);glow.addColorStop(1,`rgba(255,60,0,${strength*.25})`);c.fillStyle=glow;c.fillRect(r.x,r.y,r.width,r.height);
      c.globalCompositeOperation='lighter';
      for(let tongue=0;tongue<9;tongue++) {
        const x=r.x+(tongue+.5)*r.width/9,w=r.width/8,base=r.y+r.height+10,
          height=(.34+.28*(.5+.5*Math.sin(tongue*2.4+pulse)))*r.height*strength,
          lean=Math.sin(pulse+tongue*.9)*w*.65;
        const gradient=c.createLinearGradient(0,base-height,0,base);gradient.addColorStop(0,'rgba(255,75,0,0)');gradient.addColorStop(.20,`rgba(255,78,0,${strength*.45})`);gradient.addColorStop(.62,`rgba(255,188,22,${strength*.72})`);gradient.addColorStop(1,`rgba(255,249,159,${strength*.9})`);
        c.fillStyle=gradient;c.beginPath();c.moveTo(x-w,base);c.bezierCurveTo(x-w*1.1,base-height*.32,x+lean+w*.25,base-height*.65,x+lean,base-height);
        c.bezierCurveTo(x+lean+w*.2,base-height*.58,x+w*1.4,base-height*.25,x+w,base);c.closePath();c.fill();
      }
      for(let spark=0;spark<10;spark++) {
        const fraction=((at/900+spark*.117+item.column*.07)%1+1)%1,x=r.x+r.width*(.1+.8*(.5+.5*Math.sin(spark*13.7+item.column))),y=r.y+r.height*(1-fraction);
        c.globalAlpha=strength*Math.sin(fraction*Math.PI);c.fillStyle=spark%2?'#ffe48c':'#ff9d31';c.beginPath();c.ellipse(x,y,Math.max(.8,r.width*.012),Math.max(1.8,r.height*.009),.3,0,Math.PI*2);c.fill();
      }
      c.restore();
    }
  }
  dispose(){if(this.disposed)return;this.context?.clearRect(0,0,this.canvas.width,this.canvas.height);this.context=null;this.disposed=true;}
}
