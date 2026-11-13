// Keep independently dated control observations distinct from implementation approval.
function samePublishedDemo(actual, published){
 if(actual===published)return true;
 // Some provider pages still publish HTTP. Accept only an HTTPS upgrade of
 // that exact free-demo host, path and query; never a substituted game/session.
 try{
  const expected=new URL(published),observed=new URL(actual);
  if(expected.protocol!=='http:'||observed.protocol!=='https:'||!expected.hostname.endsWith('.ssgportal.com')||!/^DEMO(?:_EXH)?$/.test(expected.searchParams.get('Token')||''))return false;
  expected.protocol='https:';return expected.href===observed.href;
 }catch{return false;}
}
export function controlEvidence(entry, records) {
 const matching=records.filter(record=>record.id===entry.id);
 for(const record of matching){
  if(record.selectedName!==entry.selectedName||record.officialPage!==entry.officialIdentity.url||!samePublishedDemo(record.demoUrl,entry.officialIdentity.demoUrl))throw Error('Control reference identity mismatch: '+entry.id);
 }
 const confirmedRoundIds=[...new Set(matching.flatMap(record=>(record.confirmedRoundIds||[]).filter(id=>typeof id==='string'&&id.length>0&&!id.endsWith('.0'))))];
 const observations=matching.map(record=>({source:record.source,status:record.status,completedAt:record.completedAt,confirmedRoundIds:record.confirmedRoundIds||[],actions:(record.actions||[]).map(action=>action.name)}));
 return {confirmedRoundIds,observations};
}
