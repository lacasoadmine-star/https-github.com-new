// Qualification concerns completed reference rounds, independently of animation
// screenshots and arithmetic. A transient ready label cannot finish a feature.
export const nativeRoundIdentity=r=>r?.spinId||r?.publicResult?.spinId||r?.providerDealNumber||null;
export function roundQualification(r,{quarantinedIds=new Set()}={}){
 const reasons=[];const id=nativeRoundIdentity(r);
 if(id&&quarantinedIds.has(id))reasons.push('native-round-explicitly-quarantined');
 const status=[r?.qualificationStatus,r?.verificationStatus,r?.completionStatus,r?.status,r?.state].filter(Boolean).join(' ');
 if(r?.quarantined===true||(r?.quarantine!=null&&r.quarantine!==false&&r.quarantine?.resolved!==true)||r?.verificationInvalidated||r?.excludedFromCompletedCount===true||/quarantin|unresolved[- _]?feature|feature[- _]?pending|accepted[- _]?(?:respin|cascade)|incomplete[- _]?(?:feature|cascade)/i.test(status))reasons.push('explicit-unresolved-or-invalidated-verification');
 if(r?.completed===false||r?.completionVerified===false||r?.featureTerminalVerified===false)reasons.push('completion-or-feature-terminal-explicitly-unverified');
 const facts=[r,r?.publicResult,r?.publicCompletedResult?.BoardInfo,r?.publicCompletedResult?.GameInfo].filter(Boolean);
 const featureSignaled=facts.some(x=>x.bonusWin===true||x.BonusWin===true||x.bonusTriggered===true||x.featureTriggered===true||x.featurePending===true||x.IsBonus===true||(Array.isArray(x.reelsToFreeze)&&x.reelsToFreeze.length>0)||(Array.isArray(x.ReelsToFreeze)&&x.ReelsToFreeze.length>0)||Number(x.freeSpinsCount||x.FreeSpinsCount||0)>0||Number(x.freeSpinUsed||x.FreeSpinUsed||0)>0||Number(x.machineInfoCount||x.machineInfoFramesCount||x.nativeMachineInfoCount||x.publicResultMachineInfoCount||0)>1)||(r?.bonusSubresults?.length||0)>0||(r?.machineInfoFrames?.length||r?.machineInfoSequence?.length||r?.publicResult?.machineInfoFrames?.length||0)>1;
 const e=r?.featureTerminalEvidence||r?.featureCompletionEvidence;
 const terminalFeatureEvidenceAccepted=r?.featureTerminalVerified===true&&!!e&&typeof e==='object'&&e.noPendingContinuation===true&&(e.publicEventsQuiescent===true||e.requestLifecycleSettled===true)&&(e.terminalResult!==undefined||e.completedCounter!==undefined||e.nativeTerminalState!==undefined)&&(e.settlementVerified===true||e.creditedBalanceVerified===true);
 if(featureSignaled&&!terminalFeatureEvidenceAccepted)reasons.push('feature-signaled-without-supported-terminal-lifecycle');
 return{eligible:reasons.length===0,featureSignaled,terminalFeatureEvidenceAccepted,reasons};
}
export function quarantinedIdentitiesForObservation(o){
 const ids=new Set();for(const r of o.quarantinedRounds||[]){if(r.resolved===true||r.quarantineResolved===true)continue;const id=nativeRoundIdentity(r);if(id)ids.add(id)}
 for(const r of o.rounds||[]){if(!roundQualification(r).eligible){const id=nativeRoundIdentity(r);if(id)ids.add(id)}}
 for(const r of o.unconfirmedAttempts||[]){if(/respin|cascade|unresolved[- _]?feature|feature[- _]?pending|incomplete[- _]?feature/i.test(r.state||'')||r.featureTerminalVerified===false){const id=nativeRoundIdentity(r)||r.quarantinedRound;if(id)ids.add(id)}}
 return ids;
}
