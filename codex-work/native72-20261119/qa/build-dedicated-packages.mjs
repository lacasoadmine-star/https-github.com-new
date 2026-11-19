// Deterministic, offline packaging of the two isolated browser releases.
// Inputs are SHA-verified deployed baselines and reviewed source overlays.
// This never uploads, deploys, signs in, or calls a gameplay/account endpoint.
import {readFile,writeFile,mkdir,rm,rename,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const baselineRoot=path.resolve(option('--baseline',path.resolve(root,'../../../local-qa')));
const outputRoot=path.resolve(option('--out',path.resolve(root,'../../../local-qa-built')));
const sourceRoot=path.resolve(option('--source',path.join(root,'changes/dedicated-resume')));
const sharedRelease='zplay-native-shared-20261119-r1',sharedPrefix='/'+sharedRelease+'/';
const specs=[
 {name:'habesha',gameId:'habesha_fortune_5_native',release:'zplay-native-machines-20261119-habesha-r8',previous:'zplay-native-machines-20261119-habesha-r7',model:'habesha-model.mjs'},
 {name:'deluxe',gameId:'multi_hot_5_deluxe_native',release:'zplay-native-machines-20261119-mh5deluxe-r2',previous:'zplay-native-machines-20261119-mh5deluxe-r1',model:'mh5deluxe-model.mjs'}
];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const exists=async file=>{try{return(await stat(file)).isFile();}catch{return false;}};
const mime=name=>({mjs:'application/javascript; charset=utf-8',js:'application/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',txt:'text/plain; charset=utf-8',html:'text/html; charset=utf-8',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp3:'audio/mpeg',otf:'font/otf',woff:'font/woff',woff2:'font/woff2'}[name.split('.').at(-1)]||'application/octet-stream');
const baselineManifests=new Map(),knownStored=new Map();
for(const spec of specs){
 const manifest=JSON.parse(await readFile(path.join(baselineRoot,spec.name,'qa-baseline-manifest.json'),'utf8'));
 baselineManifests.set(spec.name,manifest.assets);
 for(const meta of Object.values(manifest.assets))if(meta.sha256&&meta.kvKey)knownStored.set(meta.sha256,meta);
}
const shared=new Map(),gameFiles=new Map(),loaded=new Map(),edges=[],rawUploads=new Map();
const fileLike=/\.(?:mjs|js|css|json|txt|html|png|jpe?g|webp|gif|svg|mp3|otf|woff2?)$/i;
const foreignNames=/^(?:official-(?:foxy|mh5)-|foxy-|multi-presentation|multi-controls|hundred-|stars-|extra-games\.|verified-models\.|audio-banks\.|audio-samples\.|renderer\.mjs)/;
const allGameIds=['habesha_fortune_5_native','multi_hot_5_deluxe_native','multi_hot_5_video','hot_foxy_20','multi_hot_100','wild_multi_stars'];

function safeName(name){
 if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>p==='..'||p==='')||!fileLike.test(name))throw Error('INVALID_ASSET_NAME:'+name);
 return name;
}
function rejectForeign(spec,name,bytes,scope){
 if(scope==='game'&&(foreignNames.test(name)||(spec.name==='habesha'?name.startsWith('mh5deluxe-'):name.startsWith('habesha-'))))throw Error('FOREIGN_GAME_ASSET:'+spec.name+':'+name);
 if(/\.(?:mjs|js|css)$/.test(name)){
  const text=bytes.toString('utf8');
  for(const id of allGameIds)if(id!==spec?.gameId&&text.includes(id))throw Error('FOREIGN_GAME_REFERENCE:'+scope+':'+name+':'+id);
 }
}
async function loadFile(spec,name,scope='game'){
 safeName(name);const identity=scope+':'+(scope==='shared'?'':spec.name+':')+name;
 if(loaded.has(identity))return loaded.get(identity);
 const promise=(async()=>{
  const source=scope==='shared'?path.join(sourceRoot,'shared',name):path.join(sourceRoot,'games',spec.name,name);
  let bytes,provenance,metadata;
  if(await exists(source)){
   bytes=await readFile(source);provenance={kind:'reviewed-source',path:source};
   if(scope==='game'&&name===spec.model){
    const deployed=await readFile(path.join(baselineRoot,spec.name,name));
    if(!bytes.equals(deployed))throw Error('PINNED_MODEL_CHANGED:'+spec.name);
   }
  }else{
   if(scope==='shared')throw Error('SHARED_SOURCE_MISSING:'+name);
   metadata=baselineManifests.get(spec.name)[name];
   if(!metadata?.sha256)throw Error('BASELINE_ASSET_NOT_PINNED:'+spec.name+':'+name);
   const source=path.join(baselineRoot,spec.name,name);bytes=await readFile(source);
   if(bytes.length!==metadata.size||hash(bytes)!==metadata.sha256)throw Error('BASELINE_ASSET_CORRUPT:'+spec.name+':'+name);
   provenance={kind:'verified-live-baseline',path:source,sha256:metadata.sha256};
  }
  if(bytes.length===9&&bytes.toString()==='Not found')throw Error('NOT_FOUND_PLACEHOLDER:'+name);
  rejectForeign(spec,name,bytes,scope);
  const item={name,bytes,sha256:hash(bytes),size:bytes.length,type:metadata?.type||mime(name),provenance};
  const files=scope==='shared'?shared:gameFiles.get(spec.name);files.set(name,item);
  return item;
 })();loaded.set(identity,promise);return promise;
}

function referenceTarget(spec,ownerName,reference,scope){
 if(!reference||reference==='./'||reference==='/'||reference.startsWith('data:')||reference.startsWith('#')||/^(?:https?:)?\/\//.test(reference))return null;
 reference=reference.split(/[?#]/)[0];
 if(!fileLike.test(reference))return null;
 if(reference.startsWith(sharedPrefix))return {scope:'shared',name:safeName(reference.slice(sharedPrefix.length))};
 if(reference.startsWith('/'+spec.release+'/'))return {scope:'game',name:safeName(reference.slice(spec.release.length+2))};
 if(reference.startsWith('/'))throw Error('FOREIGN_ABSOLUTE_ASSET:'+ownerName+':'+reference);
 return {scope,name:safeName(path.posix.normalize(path.posix.join(path.posix.dirname(ownerName),reference)))};
}
function references(name,bytes){
 const ext=name.split('.').at(-1),text=bytes.toString('utf8'),found=[];
 if(['mjs','js'].includes(ext)){
  const patterns=[/\bfrom\s*['"]([^'"\n]+)['"]/g,/\bimport\s*(?:\(\s*)?['"]([^'"\n]+)['"]/g,/\bnew\s+URL\s*\(\s*['"]([^'"\n]+)['"]/g];
  for(const pattern of patterns)for(const match of text.matchAll(pattern))found.push(match[1]);
 }else if(ext==='css'){
  for(const match of text.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g))found.push(match[2]);
 }else if(ext==='json'){
  const walk=value=>{
   if(typeof value==='string'){if(!/^(?:https?:)?\/\//.test(value)&&!value.startsWith('data:')&&fileLike.test(value))found.push(value);}
   else if(Array.isArray(value))for(const item of value)walk(item);
   else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value))if(!['sourceUrl','url','object','provenance','source','sourceFile','atlasName','sourcePath'].includes(key))walk(item);
  };
  walk(JSON.parse(text));
 }
 return [...new Set(found)];
}
async function closure(spec,seeds){
 const queue=seeds.map(name=>({scope:'game',name})),visited=new Set();
 while(queue.length){
  const {scope,name}=queue.shift(),key=scope+':'+name;if(visited.has(key))continue;visited.add(key);
  const item=await loadFile(spec,name,scope);
  for(const reference of references(name,item.bytes)){
   const next=referenceTarget(spec,name,reference,scope);if(!next)continue;
   edges.push({game:spec.name,scope,from:name,reference,...{toScope:next.scope,to:next.name}});queue.push(next);
  }
 }
}
function servedHtml(template,gameId){return template.replace('{{GAME}}',gameId).replace('{{PRESENTATION_GAME}}',gameId).replace('</body>','<script type="module" src="/player-v236/presence.63ed199a80b6c700.mjs"></script></body>');}
const templates=new Map();
for(const spec of specs){
 gameFiles.set(spec.name,new Map());
 let html=await readFile(path.join(baselineRoot,spec.name,'index.html'),'utf8');
 html=html.replaceAll('/'+spec.previous+'/', '/'+spec.release+'/');
 html=html.replace(/<script type="module" src="\/player-v236\/presence\.[^"]+"><\/script>/g,'');
 html=html.replace('data-game="'+spec.gameId+'"','data-game="{{PRESENTATION_GAME}}"').replace('data-machine="'+spec.gameId+'"','data-machine="{{GAME}}"');
 if(spec.name==='deluxe')html=html.replace('</head>','<link rel="stylesheet" href="/'+spec.release+'/deluxe-cabinet.css"></head>');
 templates.set(spec.name,html);
 const seeds=[];for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const target=referenceTarget(spec,'index.html',match[1],'game');if(target?.scope==='game')seeds.push(target.name);
 }
 await closure(spec,seeds);
}
if(await exists(path.join(sourceRoot,'shared/native-animation-LICENSES.txt')))await loadFile(null,'native-animation-LICENSES.txt','shared');

const scratch=outputRoot+'.building';await rm(scratch,{recursive:true,force:true});await mkdir(scratch,{recursive:true});
function assetMetadata(item,release){
 const existing=knownStored.get(item.sha256);
 if(existing&&existing.size===item.size)return {kvKey:existing.kvKey,size:item.size,sha256:item.sha256,type:item.type};
 return {kvKey:'native72/'+release+'/'+item.sha256,size:item.size,sha256:item.sha256,type:item.type};
}
const report={schema:1,productionTransactions:0,networkCalls:0,packages:[],uploads:[],edges,files:[]};
async function writePackage({name,release,gameId,htmlTemplate,files}){
 const directory=path.join(scratch,name);await mkdir(directory,{recursive:true});const assets={};
 for(const [filename,item]of [...files.entries()].sort(([a],[b])=>a.localeCompare(b,'en'))){
  const output=path.join(directory,filename);await mkdir(path.dirname(output),{recursive:true});await writeFile(output,item.bytes);
  assets[filename]=assetMetadata(item,release);
  if(!knownStored.has(item.sha256))rawUploads.set(assets[filename].kvKey,{key:assets[filename].kvKey,size:item.size,sha256:item.sha256,type:item.type,file:path.join(outputRoot,name,filename)});
  report.files.push({package:name,name:filename,size:item.size,sha256:item.sha256,...item.provenance});
 }
 if(htmlTemplate)await writeFile(path.join(directory,'index.html'),servedHtml(htmlTemplate,gameId));
 const manifest={release,...(gameId?{gameId}:{}),...(htmlTemplate?{htmlTemplate}:{}),assets};
 const bytes=Buffer.from(JSON.stringify(manifest)+'\n'),sha256=hash(bytes),manifestName=name+'-manifest.json';
 await writeFile(path.join(scratch,manifestName),bytes);
 const manifestKey='native72/manifests/'+sha256;
 rawUploads.set(manifestKey,{key:manifestKey,size:bytes.length,sha256,type:'application/json; charset=utf-8',file:path.join(outputRoot,manifestName)});
 report.packages.push({name,release,...(gameId?{gameId}:{}),manifestKey,manifestSha256:sha256,manifestBytes:bytes.length,manifestFile:path.join(outputRoot,manifestName),assets:Object.keys(assets).length,assetBytes:[...files.values()].reduce((sum,item)=>sum+item.size,0)});
}
for(const spec of specs)await writePackage({...spec,htmlTemplate:templates.get(spec.name),files:gameFiles.get(spec.name)});
await writePackage({name:'shared',release:sharedRelease,files:shared});
report.uploads=[...rawUploads.values()].sort((a,b)=>a.key.localeCompare(b.key,'en'));
await writeFile(path.join(scratch,'package-report.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(path.join(scratch,'kv-uploads.json'),JSON.stringify(report.uploads,null,2)+'\n');
await rm(outputRoot,{recursive:true,force:true});await rename(scratch,outputRoot);
console.log(JSON.stringify({outputRoot,packages:report.packages,uploads:report.uploads.length,newBytes:report.uploads.reduce((sum,item)=>sum+item.size,0),verifiedFiles:report.files.length,importEdges:edges.length},null,2));
