// A slow accepted action must keep its identity while awaiting its receipt.
// Drawing errors belong to the view; they must not become wallet failures.
import {presentationViewState} from './presentation-state-r20.mjs';
export function patchSessionRuntime(source){
 const emit=' emit(){this.state.pending=!!this.pending;this.onChange({...this.state});}';
 const next=" emit(){this.state.pending=!!this.pending;try{this.onChange({...this.state});}catch(error){try{if(typeof globalThis.reportError==='function')globalThis.reportError(error);else console.error('game_view_failed',error);}catch{}}}";
 const timer='const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeoutMs);';
 const budget="const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),options.method==='POST'?Math.max(this.timeoutMs,20000):this.timeoutMs);";
 if(typeof source!=='string'||source.split(emit).length!==2||source.split(timer).length!==2)throw Error('RETAINED_SESSION_CONTRACT_CHANGED');
 return source.replace(emit,next).replace(timer,budget);
}

export function patchSpinFinalizer(source){
 const before=" const confirmed=await session.start(request.stake,request.options);requestingSpin=false;\n if(!confirmed){animation=null;referenceScene.cancelMotion();autoplay.stop('unconfirmed-round');}\n if(currentState)drawState(currentState);return confirmed;";
 const after=" let confirmed=false;try{confirmed=await session.start(request.stake,request.options);return confirmed;}finally{requestingSpin=false;if(!confirmed){animation=null;referenceScene.cancelMotion();autoplay.stop('unconfirmed-round');}if(currentState)drawState(currentState);}";
 if(typeof source!=='string'||source.split(before).length!==2)throw Error('RETAINED_SPIN_FINALIZER_CHANGED');
 const draw='referenceScene.draw(state,';
 if(source.split(draw).length!==2)throw Error('RETAINED_PRESENTATION_STATE_CHANGED');
 return 'const presentationViewState='+presentationViewState.toString()+';\n'+source.replace(before,after).replace(draw,'referenceScene.draw(presentationViewState(state),');
}
