// One owner combines focus, visibility and page-cache state. None of these
// events may resume presentation while another pause condition still holds.
export class MachineLifecycle {
 constructor(renderer,{audio,hidden=false,focused=true,onPause=()=>{}}={}){
  this.renderer=renderer;this.audio=audio;this.hidden=!!hidden;this.focused=!!focused;this.pageActive=true;this.disposed=false;this.running=true;this.onPause=onPause;this.reconcile();
 }
 reconcile(){
  const running=!this.disposed&&this.pageActive&&this.focused&&!this.hidden;
  if(running===this.running)return false;
  this.running=running;
  if(running){this.renderer.resume();this.audio?.setSuspended?.(false);return true;}
  // Suspend first: the AUTO-stop callback must not emit a late sound on blur.
  this.audio?.setSuspended?.(true);this.renderer.pause();this.onPause();return false;
 }
 visibility(hidden){this.hidden=!!hidden;return this.reconcile();}
 blur(){this.focused=false;return this.reconcile();}
 focus(hidden=this.hidden){this.focused=true;this.hidden=!!hidden;return this.reconcile();}
 pageHide(){this.pageActive=false;return this.reconcile();}
 pageShow({hidden=this.hidden,focused=this.focused}={}){this.pageActive=true;this.hidden=!!hidden;this.focused=!!focused;return this.reconcile();}
 dispose(){this.disposed=true;this.reconcile();}
}
