// A held pointer is explicit, revocable input. This controller never owns a
// wallet, queues financial requests, or changes an accepted spin's outcome.
export class SpinHold {
 constructor(button,{canLaunch,launch,target=globalThis.window,delay=500,setTimer=setTimeout,clearTimer=clearTimeout}={}){
  this.button=button;this.canLaunch=canLaunch;this.launch=launch;this.setTimer=setTimer;this.clearTimer=clearTimer;
  this.active=false;this.pointer=null;this.timer=null;this.inFlight=false;this.consume=false;this.count=0;this.epoch=0;
  button.addEventListener('pointerdown',event=>{
   if(event.button!==0||event.isPrimary===false||!this.canLaunch())return;
   this.stop();this.consume=false;this.pointer=event.pointerId;const epoch=this.epoch;
   this.timer=this.setTimer(()=>{this.timer=null;if(this.pointer===null||this.epoch!==epoch)return;this.active=true;this.consume=true;this.count=0;this.queue();},delay);
  });
  const release=event=>{if(event.pointerId===this.pointer)this.stop();};
  target?.addEventListener('pointerup',release);target?.addEventListener('pointercancel',event=>{release(event);this.consume=false;});
  button.addEventListener('pointerleave',()=>this.stop());target?.addEventListener('blur',()=>this.stop());
 }
 stop(){this.active=false;this.pointer=null;this.epoch++;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;}
 consumesClick(){const consumed=this.consume;this.consume=false;return consumed;}
 queue(){
  if(!this.active||this.inFlight||!this.canLaunch())return;
  if(this.count>=1000){this.stop();return;}
  const epoch=this.epoch;this.inFlight=true;this.count++;
  Promise.resolve().then(()=>this.active&&this.epoch===epoch?this.launch():false).then(confirmed=>{if(!confirmed&&this.epoch===epoch)this.stop();}).catch(()=>this.stop()).finally(()=>{this.inFlight=false;});
 }
}
