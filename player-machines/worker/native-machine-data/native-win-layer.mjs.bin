// The original Foxy popup covers canvas art and HTML controls with one tint.
// Its own native artwork sits above that tint. Pointer dismissal never starts a wager.
export class NativeWinLayer{
 constructor(canvas,onDismiss){
  this.source=canvas;this.dismiss=onDismiss;this.active=false;
  this.shade=document.createElement('div');this.shade.setAttribute('role','button');this.shade.setAttribute('tabindex','0');this.shade.setAttribute('aria-label','Dismiss win animation');
  this.shade.style.cssText='position:absolute;inset:0;z-index:30;background:#172019;display:none;cursor:default;';
  this.canvas=document.createElement('canvas');this.canvas.setAttribute('aria-hidden','true');this.canvas.className='native-win-overlay';this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:31;pointer-events:none;display:none;';
  this.context=this.canvas.getContext('2d');if(!this.context)throw Error('NATIVE_WIN_CANVAS_UNAVAILABLE');
  this.onPointer=e=>{e.preventDefault();e.stopPropagation();this.dismiss();};
  this.onKey=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();this.dismiss();}};
  this.shade.addEventListener('pointerdown',this.onPointer);this.shade.addEventListener('keydown',this.onKey);
  canvas.parentElement.append(this.shade,this.canvas);
 }
 frame(opacity){
  if(this.canvas.width!==this.source.width||this.canvas.height!==this.source.height){this.canvas.width=this.source.width;this.canvas.height=this.source.height;}
  this.context.setTransform(1,0,0,1,0,0);this.context.clearRect(0,0,this.canvas.width,this.canvas.height);this.context.setTransform(this.canvas.width/420,0,0,this.canvas.height/900,0,0);
  this.active=opacity>0;this.shade.style.display=this.canvas.style.display=this.active?'block':'none';this.shade.style.opacity=String(opacity);return this.context;
 }
 destroy(){this.shade.removeEventListener('pointerdown',this.onPointer);this.shade.removeEventListener('keydown',this.onKey);this.shade.remove();this.canvas.remove();}
}
