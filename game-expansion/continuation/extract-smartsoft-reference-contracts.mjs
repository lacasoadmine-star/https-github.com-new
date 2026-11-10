import {readFile,readdir,writeFile} from 'node:fs/promises';
import {extractPublicConfig as extract,selectTitleScripts} from './reference-tools/public-config-extractor.mjs';
import {createHash} from 'node:crypto';
const root=new URL('./evidence/smartsoft-queue-startup/',import.meta.url);
const registry=JSON.parse(await readFile(new URL('./SMARTSOFT-69-WORK-REGISTRY.json',import.meta.url),'utf8'));
const normal=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const records=[];
for(const dir of await readdir(root,{withFileTypes:true})){
 if(!dir.isDirectory()||dir.name==='public-source')continue;
 let observation;try{observation=JSON.parse(await readFile(new URL(dir.name+'/observation.json',root),'utf8'));}catch{continue;}
 const title=registry.entries.find(row=>row.name===observation.name);if(!title)continue;
 const names=new Set([normal(title.providerGameName),normal(title.name)].filter(Boolean));
 const scripts=selectTitleScripts(observation.scripts,title);
 const captures=[];
 for(const script of scripts){
  try{const bytes=await readFile(new URL(script.file,root));if(createHash('sha256').update(bytes).digest('hex')!==script.sha256)throw Error('PUBLIC_SOURCE_HASH_MISMATCH');const source=bytes.toString('utf8');captures.push({sourceURL:script.url,sha256:script.sha256,...extract(source)});}
  catch(error){captures.push({sourceURL:script.url,sha256:script.sha256,parseError:String(error.message).slice(0,180),fields:[]});}
 }
 const contract={name:title.name,game_id:title.game_id,providerGameName:title.providerGameName,officialURL:title.officialURL,officialDemoURL:title.officialDemoURL,observedDate:'2026-11-10',status:captures.some(c=>c.fields.length)?'public-source-fragments-captured':'numeric-and-presentation-contract-pending',scope:'Literal public title configuration only; conditional branches remain labelled. No provider code is executed by this extractor. These fragments are not a complete engine or a cash approval.',captures,cashApproved:false};
 await writeFile(new URL(dir.name+'/contract.json',root),JSON.stringify(contract,null,2));
 title.referenceCapture={path:'evidence/smartsoft-queue-startup/'+dir.name+'/contract.json',status:contract.status,titleScripts:captures.length,literalFields:captures.reduce((n,c)=>n+c.fields.length,0)};
 // A legacy bootstrap object alone is not evidence that a game became ready.
 if(observation.status==='public-startup-observed'&&!observation.frames.some(f=>f.name||f.loaded===true)){
  observation.status='public-source-captured-bootstrap-only';await writeFile(new URL(dir.name+'/observation.json',root),JSON.stringify(observation,null,2));
 }
 records.push({name:title.name,status:contract.status,scripts:captures.length,literalFields:title.referenceCapture.literalFields});
}
await writeFile(new URL('./SMARTSOFT-69-WORK-REGISTRY.json',import.meta.url),JSON.stringify(registry,null,2));
await writeFile(new URL('contract-summary.json',root),JSON.stringify({observedDate:'2026-11-10',records,completeEngines:0,cashApprovals:0},null,2));
console.log(JSON.stringify({records:records.length,withTitleSource:records.filter(r=>r.scripts).length,withLiteralConfig:records.filter(r=>r.literalFields).length,literalFields:records.reduce((n,r)=>n+r.literalFields,0),completeEngines:0}));
