// Published feature costs only. Uses integer arithmetic for the complete debit;
// no outcomes, awards or account balances are calculated here.
export const paidFeatureDefinition=definition=>[definition?.tumbleFeature,definition?.coinFeature].find(feature=>Array.isArray(feature?.modes)&&feature.modes.length)||null;
export const hasPaidFeatureModes=definition=>!!paidFeatureDefinition(definition);
const MINOR=/^\d{1,24}$/;
const decimal=minor=>String(minor/100n)+'.'+String(minor%100n).padStart(2,'0');
function stakeMinor(value){
  if(typeof value!=='string'||!/^\d{1,11}(?:\.\d{1,2})?$/.test(value))throw new TypeError('Geli wadarta sharadka saxda ah.');
  const [whole,fraction='']=value.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
}
function featureTerms(definition,mode){
  const feature=paidFeatureDefinition(definition);
  if(!feature?.modes?.includes(mode)||!Number.isSafeInteger(feature.costBps?.[mode])||feature.costBps[mode]<=0||!MINOR.test(feature.totalStakeStepMinor?.[mode]))throw new TypeError('Qaabkan ciyaarta lama heli karo.');
  return {feature,cost:BigInt(feature.costBps[mode]),step:BigInt(feature.totalStakeStepMinor[mode])};
}
export function featureStakePreview(definition,totalStake,mode=paidFeatureDefinition(definition)?.defaultMode){
  const {feature,cost,step}=featureTerms(definition,mode),total=stakeMinor(totalStake);
  if(total<=0n||step<=0n||total%step!==0n)throw new RangeError('Qaabkan wadarta sharadku waxay ku kordhaysaa '+decimal(step)+'.');
  const base=total*10000n/cost;
  if(base<BigInt(feature.minimumBaseBetMinor)||base%100n!==0n||base*cost!==total*10000n)throw new RangeError('Sharadka aasaasiga ahi waa inuu ahaadaa tiro dhan.');
  return {mode,costBps:Number(cost),totalBetMinor:total.toString(),baseBetMinor:base.toString(),totalStake:decimal(total),baseStake:decimal(base)};
}
export function featureModeTotal(definition,currentTotal,previousMode,nextMode){
  const {feature,cost,step}=featureTerms(definition,nextMode);
  let base;
  try{base=BigInt(featureStakePreview(definition,currentTotal,previousMode).baseBetMinor);}catch{base=BigInt(feature.minimumBaseBetMinor);}
  const baseStep=step*10000n/cost;
  if(baseStep<=0n||baseStep*cost!==step*10000n)throw new TypeError('The public feature stake grid is inconsistent.');
  const nextBase=((base+baseStep-1n)/baseStep)*baseStep;
  return decimal(nextBase*cost/10000n);
}

