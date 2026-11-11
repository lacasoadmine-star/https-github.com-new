() => {
 if(typeof slot==='undefined'||!slot?.buttons?.buttons?.spin)return false;
 const probe={startedAt:new Date().toISOString(),source:'Read-only public demo renderer observation',rendererModified:false,samples:[],framesObserved:0,complete:false};
 window.__freshNativeMotionProbe=probe;
 const origin=performance.now();let prior='';
 const sample=()=>{
  const elapsed=performance.now()-origin;
  const state={phase:slot.buttons.buttons.spin.option??slot.buttons.buttons.spin.mode??null,spinning:slot.box?.spinning??null,balance:slot.info?.balance??null,win:slot.win?.info?.totalWin??null};
  const key=JSON.stringify(state);probe.framesObserved++;
  if(key!==prior){probe.samples.push({elapsedMs:Math.round(elapsed*100)/100,...state});prior=key;}
  if(elapsed<20000&&probe.samples.length<2000)requestAnimationFrame(sample);else probe.complete=true;
 };
 requestAnimationFrame(sample);return true;
}
