import {nativeMachinePage} from './native-machine-routes.mjs';
// Bind retained handlers to their original receiver, including scheduled events.
export function installNativeMachines(previous){
 const inherited=Object.fromEntries(Object.entries(previous).map(([name,value])=>[name,typeof value==='function'?value.bind(previous):value]));
 return {...inherited,fetch(request,env,ctx){
  if(env.PORTAL==='player'){const native=nativeMachinePage(request);if(native)return native;}
  return previous.fetch(request,env,ctx);
 }};
}
