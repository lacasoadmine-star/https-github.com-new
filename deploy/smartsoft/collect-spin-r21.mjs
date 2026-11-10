// Wait for the retained canvas to acknowledge a collected receipt. This helper
// cannot create an action and never retries a collect or a wager.
export async function waitForCollectedPresentation({ready,current,wait=()=>new Promise(resolve=>setTimeout(resolve,16)),now=()=>performance.now(),timeout=5000}){
 const deadline=now()+timeout;
 while(current()){
  if(ready())return true;
  if(now()>=deadline)return false;
  await wait();
 }
 return false;
}
export function patchCollectSpin(source){
 const start='async function startRound({automatic=false,holding=false,stake=ui.stake.value}={}){';
 const collect=" if(canActVisible('collect')){const collected=await session.act('collect');if(!collected)return false;}";
 if(source.split(start).length!==2||source.split(collect).length!==2)throw Error('COLLECT_SPIN_CONTRACT_CHANGED');
 const gate=`let spinIntentPending=false;
async function startRound(options={}){
 if(animation?.reference){referenceScene.speedUp();return false;}
 if(spinIntentPending)return false;
 spinIntentPending=true;
 try{return await startRoundOnce(options);}finally{spinIntentPending=false;}
}
async function startRoundOnce({automatic=false,holding=false,stake=ui.stake.value}={}){`;
 const next=` if(canActVisible('collect')){
  const collected=await session.act('collect');if(!collected)return false;
  const ready=await waitForCollectedPresentation({ready:()=>canStartVisible(),current:()=>!pageSuspended&&document.visibilityState!=='hidden'&&currentState?.sessionId===owner&&game?.version===version&&currentState?.connected===true&&!currentState?.error&&!presentationFailed&&(!holding||hold?.active)&&(!automatic||autoplay.snapshot().active)});
  if(!ready)return false;
 }`;
 return 'const waitForCollectedPresentation='+waitForCollectedPresentation.toString()+';\n'+source.replace(start,gate).replace(collect,next);
}
