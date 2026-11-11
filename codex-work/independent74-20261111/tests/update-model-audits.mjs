// Rebuild derived model facts without rewriting retained official source claims.
import fs from 'node:fs';
import {modelAuditMatrix,listGameDefinitions} from '../math/official72.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const atomic=(p,d)=>{const t=p+'.tmp-'+process.pid;fs.writeFileSync(t,JSON.stringify(d,null,2)+'\n');fs.renameSync(t,p);};
const games=modelAuditMatrix(),audit=read('tests/math-official72-audit.json');
audit.games=games;audit.counts={models:games.length,families:{},observedGeometry:games.filter(g=>g.layout?.geometryVerified).length};
for(const g of games)audit.counts.families[g.family]=(audit.counts.families[g.family]??0)+1;
audit.generatedAt=new Date().toISOString();atomic('tests/math-official72-audit.json',audit);
const rules=read('tests/math-public-rules-20261111.json'),defs=new Map(listGameDefinitions().map(d=>[d.id,d]));
for(const r of rules.games){
 const d=defs.get(r.id);if(!d)throw Error('Missing model '+r.id);
 r.currentModel={...r.currentModel,family:d.family,mathVersion:d.mathVersion,rows:d.rows??null,columns:d.cols??null,paylines:d.ways?null:d.paylines?.length??null,ways:d.ways??null,maximumMultiplierBps:d.maximumMultiplierBps,independentModel:true};
 r.geometryMatchesCurrentModel=r.publicGeometry?(!r.publicGeometry.rows||r.publicGeometry.rows===d.rows)&&(!r.publicGeometry.columns||r.publicGeometry.columns===d.cols):null;
 r.observedLayout=d.layout;r.providerProbabilitiesVerified=false;r.completeReferenceParityVerified=false;
}
rules.generatedModelFactsAt=new Date().toISOString();atomic('tests/math-public-rules-20261111.json',rules);
console.log(JSON.stringify({models:games.length,observedGeometry:audit.counts.observedGeometry,sourceClaimsPreserved:true}));
