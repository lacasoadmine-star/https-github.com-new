import readiness from './release-readiness.json' with {type:'json'};

export const requiredChecks=Object.freeze([
 'officialIdentity','visibleRules','paytable','controlsAndBonuses',
 'presentationComparison','nativeMath','walletSettlement','browserIntegration'
]);

// The user's latest instruction requires the whole individual machine to
// follow its official demo. A working prototype is not a completed release.
export function isMachineReleased(definition){
 const entry=readiness.machines[definition?.id];
 return entry?.status==='verified'&&entry.modelVersion===definition.version&&
  definition.launchable===true&&requiredChecks.every(key=>entry.checks[key]===true);
}

export function releasedAdapter(adapter){
 return {...adapter,definitions:Object.fromEntries(Object.entries(adapter.definitions)
  .filter(([,definition])=>isMachineReleased(definition)))};
}

export const releaseReadiness=readiness;
