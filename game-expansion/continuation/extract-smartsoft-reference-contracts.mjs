import {readFile,readdir,writeFile} from 'node:fs/promises';
import {parse} from './reference-tools/node_modules/acorn/dist/acorn.mjs';
const root=new URL('./evidence/smartsoft-queue-startup/',import.meta.url);
const registry=JSON.parse(await readFile(new URL('./SMARTSOFT-69-WORK-REGISTRY.json',import.meta.url),'utf8'));
const normal=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
const roots=new Set(['game','gameInfo','gameSounds','gameSound','gameImages','gameSpines','gameSprite','slot','Box','Win','AutoPlay','Bets','Double','Start','Footer','Header','Menu','Line','RiskGame','BuyBonus','BuyFeature','FreeSpin','Multiplier']);
function path(node){
 if(node?.type==='Identifier')return node.name;
 if(node?.type!=='MemberExpression')return null;
 const base=path(node.object),key=node.computed?node.property.type==='Literal'?String(node.property.value):null:node.property.name;
 return base&&key!==null?base+'.'+key:null;
}
function literal(node){
 if(!node)return {known:false};
 if(node.type==='Literal'&&!node.regex&&typeof node.value!=='bigint')return {known:true,value:node.value};
 if(node.type==='TemplateLiteral'&&!node.expressions.length)return {known:true,value:node.quasis[0].value.cooked};
 if(node.type==='UnaryExpression'&&['-','+','!'].includes(node.operator)){
  const a=literal(node.argument);if(a.known&&['number','boolean'].includes(typeof a.value))return {known:true,value:node.operator==='-'?-a.value:node.operator==='+'?+a.value:!a.value};
 }
 if(node.type==='ArrayExpression'){const items=node.elements.map(literal);if(items.every(i=>i.known))return {known:true,value:items.map(i=>i.value)};}
 if(node.type==='ObjectExpression'){
  const entries=[];
  for(const property of node.properties){if(property.type!=='Property'||property.computed||property.kind!=='init')return {known:false};const value=literal(property.value);if(!value.known)return {known:false};entries.push([property.key.name??property.key.value,value.value]);}
  return {known:true,value:Object.fromEntries(entries)};
 }
 return {known:false};
}
function extract(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'script',allowReturnOutsideFunction:true}),fields=[];let dynamic=0;
 function values(name,node,context){
  const value=literal(node);
  if(value.known){fields.push({path:name,value:value.value,conditional:context.length>0,conditions:context,offset:node.start});return;}
  if(node?.type==='ObjectExpression'){
   for(const p of node.properties)if(p.type==='Property'&&!p.computed&&p.kind==='init')values(name+'.'+(p.key.name??p.key.value),p.value,context);else dynamic++;
  }else dynamic++;
 }
 function visit(node,context=[]){
  if(!node||typeof node!=='object')return;
  if(/Function/.test(node.type)||['ClassDeclaration','ClassExpression'].includes(node.type))return;
  if(node.type==='IfStatement'){
   const condition=source.slice(node.test.start,node.test.end).slice(0,500);
   visit(node.consequent,[...context,condition]);if(node.alternate)visit(node.alternate,[...context,'!('+condition+')']);return;
  }
  if(node.type==='AssignmentExpression'){
   const name=path(node.left);
   if(name&&roots.has(name.split('.')[0])&&node.operator==='=')values(name,node.right,context);
   return;
  }
  for(const[key,value]of Object.entries(node))if(!['start','end','loc'].includes(key)){
   if(Array.isArray(value))for(const child of value)visit(child,context);else if(value&&typeof value==='object')visit(value,context);
  }
 }
 visit(ast);return {fields,dynamicAssignmentsNotEvaluated:dynamic};
}
const records=[];
for(const dir of await readdir(root,{withFileTypes:true})){
 if(!dir.isDirectory()||dir.name==='public-source')continue;
 let observation;try{observation=JSON.parse(await readFile(new URL(dir.name+'/observation.json',root),'utf8'));}catch{continue;}
 const title=registry.entries.find(row=>row.name===observation.name);if(!title)continue;
 const names=new Set([normal(title.providerGameName),normal(title.name)].filter(Boolean));
 const scripts=observation.scripts.filter(s=>names.has(normal(new URL(s.url).pathname.split('/').at(-1).replace(/\.js$/,''))));
 const captures=[];
 for(const script of scripts){
  try{const source=await readFile(new URL(script.file,root),'utf8');captures.push({sourceURL:script.url,sha256:script.sha256,...extract(source)});}
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
