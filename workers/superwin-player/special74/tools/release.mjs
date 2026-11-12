import {readFile,stat} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export async function inspectRelease(manifest,root){
 const issues=[];
 const fail=(id,message)=>issues.push({id,message});
 if(manifest.entries?.length!==74)fail('package','Exactly 74 requested positions are required');
 const ids=new Set(),positions=new Set();
 const asset=async(id,file)=>{
  if(!file?.path||!/^[a-f0-9]{64}$/.test(file.sha256||'')){fail(id,'Missing file and SHA-256 evidence');return;}
  const path=resolve(root,file.path),rel=relative(resolve(root),path);
  if(rel==='..'||rel.startsWith('..'+sep)||path===resolve(root)){fail(id,'Evidence path escapes package');return;}
  try{if(!(await stat(path)).isFile()||createHash('sha256').update(await readFile(path)).digest('hex')!==file.sha256)fail(id,'Evidence file is missing or changed: '+file.path);}catch{fail(id,'Evidence unavailable: '+file.path);}
 };
 for(const e of manifest.entries||[]){
  const id=e.id;
  if(ids.has(id)||positions.has(e.position)||!Number.isInteger(e.position)||e.position<1||e.position>74)fail(id,'Repeated or invalid identity');
  ids.add(id);positions.add(e.position);
  if(!e.officialIdentity?.provider||!e.officialIdentity?.title||!e.officialIdentity?.url||e.officialIdentity?.match!=='verified')fail(id,'Exact official title/provider/demo not verified');
  const rounds=new Set(e.confirmedDemoRoundIds||[]);
  if(rounds.size===0||rounds.has('')||[...rounds].some(x=>typeof x!=='string'))fail(id,'No confirmed unique demo round receipts');
  if(e.coverage?.complete!==true||!Array.isArray(e.coverage?.required)||!e.coverage.required.length||e.coverage.required.some(x=>!e.coverage.verified?.includes(x)))fail(id,'Required game behavior remains unverified; spin count alone is not acceptance');
  if(e.presentation!=='built-v2'||e.parityVerified!==true)fail(id,'New playable presentation and visual/motion/audio comparison not approved');
  if(e.backendContractVerified!==true||!e.backend?.modelId||!e.backend?.modelVersion||e.backend?.source!=='existing-superwin-server'||e.backend?.frontendDeterminesPayout!==false)fail(id,'Matching existing server financial model not verified');
  if(e.runtime?.thirdPartyRequests!==0||e.runtime?.unresolvedFinancialRequests!==0||e.runtime?.localWagerCollectChecksPassed!==true)fail(id,'Same-origin runtime and financial recovery checks not verified');
  for(const kind of ['portrait','landscape','motion','sound','controls','financial'])await asset(id,e.evidence?.[kind]);
 }
 return {ready:issues.length===0,requested:74,entries:manifest.entries?.length??0,issues};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const file=resolve(process.argv[2]||'reports/special74/manifest.json');
 const root=resolve(process.argv[3]||'.');
 const report=await inspectRelease(JSON.parse(await readFile(file,'utf8')),root);
 console.log(JSON.stringify(report,null,2));
 process.exitCode=report.ready?0:1;
}
