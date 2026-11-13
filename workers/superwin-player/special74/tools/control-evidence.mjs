// Keep independently dated control observations distinct from implementation approval.
export function controlEvidence(entry, records) {
 const matching=records.filter(record=>record.id===entry.id);
 for(const record of matching){
  if(record.selectedName!==entry.selectedName||record.officialPage!==entry.officialIdentity.url||record.demoUrl!==entry.officialIdentity.demoUrl)throw Error('Control reference identity mismatch: '+entry.id);
 }
 const confirmedRoundIds=[...new Set(matching.flatMap(record=>(record.confirmedRoundIds||[]).filter(id=>typeof id==='string'&&id.length>0&&!id.endsWith('.0'))))];
 const observations=matching.map(record=>({source:record.source,status:record.status,completedAt:record.completedAt,confirmedRoundIds:record.confirmedRoundIds||[],actions:(record.actions||[]).map(action=>action.name)}));
 return {confirmedRoundIds,observations};
}
