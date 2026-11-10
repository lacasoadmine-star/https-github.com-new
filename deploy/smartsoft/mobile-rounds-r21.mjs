import {bindMobileScene,projectMobileScene as previous} from '/native-library/remaining20/20261110-construction-r15/runtime-r17/mobile-runtime-r17.mjs';
export {bindMobileScene};
export function visibleMobileReceipt(scene){
 const state=scene?.mobileState;
 // A completed receipt is retained by the controller during the next request.
 // Never show its win as the result of reels that are still moving.
 if(!state||!(state.pending||state.confirming||state.busy))return scene;
 return {...scene,mobileState:{...state,round:null}};
}
export function projectMobileScene(scene,manifest){
 const projected=previous(visibleMobileReceipt(scene),manifest);
 return {...projected,commands:projected.commands.map(command=>
  command.role==='mobile-spin-label'&&command.text==='TAKE WIN'
   ?{...command,text:'TAKE & SPIN',size:Math.min(command.size,14)}:command)};
}
