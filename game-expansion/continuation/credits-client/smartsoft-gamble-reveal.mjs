import {smartSoftGambleView} from './smartsoft-dialog-state.mjs';
import {smartSoftDialogProfile} from './smartsoft-dialog-profiles.mjs';

export const GAMBLE_REVEAL_MS=2000;
export const GAMBLE_STATUS_FADE_MS=300;
const cash=value=>`${value/100n}.${String(value%100n).padStart(2,'0')}`;

// Visual timing only. Canonical state, card selection, requests, wallet amounts
// and action eligibility are owned by the host and never changed by a timer.
export class SmartSoftGambleReveal{
 constructor({now=()=>globalThis.performance?.now()??Date.now(),setTimer=globalThis.setTimeout?.bind(globalThis),clearTimer=globalThis.clearTimeout?.bind(globalThis),onChange=()=>{}}={}){
  this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.onChange=onChange;this.base=null;this.identity='';this.attempt=-1;this.version=-1;this.opened=false;this.disposed=false;this.timer=null;this.epoch=0;this.reveal=null;
 }
 cancel(){this.epoch++;if(this.timer!==null)this.clearTimer?.(this.timer);this.timer=null;this.reveal=null;}
 open(state){if(this.disposed)return;this.cancel();this.opened=true;this.identity='';this.update(state);}
 close(){this.opened=false;this.cancel();}
 update(state){
  if(this.disposed)return null;
  const view=smartSoftGambleView(state),identity=view?JSON.stringify([state.sessionId,view.id,view.modelVersion,view.roundId]):'';
  this.base=view;
  if(!view||smartSoftDialogProfile(view.id)?.kind!=='modern'){this.cancel();this.identity='';return this.view();}
  if(identity!==this.identity){this.cancel();this.identity=identity;this.attempt=view.attempt;this.version=view.version;return this.view();}
  if(!this.opened||view.pending){this.cancel();if(!view.pending){this.attempt=view.attempt;this.version=view.version;}return this.view();}
  if(view.version<this.version||view.attempt<this.attempt){this.cancel();return this.view();}
  if(view.attempt>this.attempt&&view.last){
   this.cancel();this.reveal={identity,attempt:view.attempt,at:this.now(),card:view.card,cardLabel:view.cardLabel,won:view.last.won,before:BigInt(view.last.amountBeforeMinor)};this.schedule();
  }
  this.attempt=view.attempt;this.version=view.version;return this.view();
 }
 schedule(){
  if(!this.reveal||this.disposed||!this.opened)return;
  const epoch=this.epoch,elapsed=Math.max(0,this.now()-this.reveal.at),delay=elapsed<GAMBLE_STATUS_FADE_MS?Math.min(16,GAMBLE_STATUS_FADE_MS-elapsed):Math.max(0,GAMBLE_REVEAL_MS-elapsed);
  this.timer=this.setTimer?.(()=>{
   if(this.disposed||epoch!==this.epoch||!this.opened||!this.reveal)return;
   this.timer=null;if(this.now()-this.reveal.at>=GAMBLE_REVEAL_MS)this.reveal=null;
   this.onChange();if(this.reveal)this.schedule();
  },delay)??null;
 }
 view(){
  const view=this.base;if(!view)return null;
  if(smartSoftDialogProfile(view.id)?.kind!=='modern')return view;
  const reveal=this.reveal,active=!!reveal&&this.opened&&!view.pending&&reveal.identity===this.identity&&reveal.attempt===view.attempt&&this.now()-reveal.at<GAMBLE_REVEAL_MS;
  if(!active)return{...view,card:'Double/Card/Hidden',cardLabel:'Face-down card',revealPhase:'hidden',cardStatus:null};
  const elapsed=Math.max(0,this.now()-reveal.at);
  return{...view,card:reveal.card,cardLabel:reveal.cardLabel,amount:cash(reveal.before),toWin:cash(reveal.before*2n),history:view.previousHistory,revealPhase:'revealing',cardStatus:{won:reveal.won,opacity:Math.min(1,elapsed/GAMBLE_STATUS_FADE_MS)}};
 }
 dispose(){if(this.disposed)return;this.cancel();this.disposed=true;this.opened=false;this.base=null;this.identity='';}
}
