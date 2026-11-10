// Entry presentation only. The original session and renderer still decide
// whether an authenticated game is ready to accept a new round.
export function patchEntryStartup(source){
 if(typeof source!=='string')throw Error('STARTUP_SOURCE_REQUIRED');
 const before="this.choice=null;this.phase=this.active?'loading':'open';";
 const paint="this.paint('loading');";
 if(source.split(before).length!==2||source.split(paint).length!==2||!source.includes('export class SmartSoftStartup'))throw Error('STARTUP_ENTRY_CONTRACT_CHANGED');
 // Fresh free-demo observation shows the original sound choice in Wild Ways
 // as well. Preserve every game's own loader, prompt and gesture callback.
 return source;
}

export function patchEntryApp(source){
 const before='if(startup.active){soundEnabled=false;referenceScene.setAudio({sound:false,music:musicEnabled});}';
 if(typeof source!=='string'||source.split(before).length!==2)throw Error('STARTUP_APP_AUDIO_CONTRACT_CHANGED');
 return source;
}

// Set data-native-entry="loading" in the scoped game HTML before its scripts.
// Native art, or an actionable error/recovery screen, replaces the initial
// generic cabinet. The verified loader/sound dialog is outside machineShell.
export const ENTRY_LOADING_CSS='html[data-native-entry="loading"] #machineShell{visibility:hidden}';
export function nativeEntryPhase({integrated=false,error=false,recovery=false,attention=false}={}){
 return integrated?'ready':error||recovery||attention?'attention':'loading';
}
export function installNativeEntry(document=globalThis.document){
 const root=document?.documentElement;if(!root?.hasAttribute('data-native-entry'))return ()=>{};
 const visible=node=>!!node&&!node.hidden;
 const update=()=>{
  const phase=document.getElementById('startupCover')?.dataset.phase;
  const next=nativeEntryPhase({integrated:document.body?.classList.contains('integrated-reference'),
   error:document.getElementById('notice')?.classList.contains('error'),
   recovery:phase==='recovery'||phase==='uncovered',
   attention:['winActions','activeActions','otherGame'].some(id=>visible(document.getElementById(id)))});
  if(root.dataset.nativeEntry!==next)root.dataset.nativeEntry=next;
 };
 const observer=new MutationObserver(update);
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','data-phase']});
 update();const dispose=()=>observer.disconnect();globalThis.addEventListener?.('pagehide',dispose,{once:true});return dispose;
}
if(globalThis.document?.documentElement?.hasAttribute('data-native-entry'))installNativeEntry();
