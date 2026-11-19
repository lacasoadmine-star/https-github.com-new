// Metadata-only, local checkpoint. No media copy, upload, deployment or network.
import {readFile,writeFile,mkdir,rm,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const stage=path.resolve(option('--stage',path.resolve(root,'../../../local-qa-built')));
const baseline=path.resolve(option('--baseline',path.resolve(root,'../../../local-qa')));
const output=path.resolve(option('--out',path.join(root,'changes/dedicated-resume/release-checkpoint')));
const temporary=output+'.building';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report=JSON.parse(await readFile(path.join(stage,'package-report.json'),'utf8'));
const checkpoint={schema:1,origin:'https://superwin-player.apdiy61.workers.dev',packages:[],requiredBaseline:{},sourceFiles:[],dependencyEdges:report.edges,uploads:report.uploads.map(({file,...item})=>({...item,file:path.relative(stage,file)})),checks:{networkCalls:0,productionTransactions:0}};
const readme=await readFile(path.join(output,'README.md'),'utf8').catch(()=>null);
await rm(temporary,{recursive:true,force:true});await mkdir(temporary,{recursive:true});
if(readme)await writeFile(path.join(temporary,'README.md'),readme);
for(const entry of report.packages){
 const name=entry.name+'-manifest.json',bytes=await readFile(path.join(stage,name));
 if(sha(bytes)!==entry.manifestSha256||bytes.length!==entry.manifestBytes)throw Error('CANDIDATE_MANIFEST_CHANGED:'+name);
 await writeFile(path.join(temporary,name),bytes);
 const {manifestFile,...metadata}=entry;checkpoint.packages.push({...metadata,manifestFile:name});
}
for(const name of ['habesha','deluxe']){
 const directory=path.join(temporary,'baseline',name);await mkdir(directory,{recursive:true});
 for(const filename of ['qa-baseline-manifest.json','index.html'])await writeFile(path.join(directory,filename),await readFile(path.join(baseline,name,filename)));
 const manifest=JSON.parse(await readFile(path.join(directory,'qa-baseline-manifest.json'),'utf8'));
 const names=new Set(report.files.filter(file=>file.package===name&&file.kind==='verified-live-baseline').map(file=>file.name));
 names.add(name==='habesha'?'habesha-model.mjs':'mh5deluxe-model.mjs');
 const assets={};for(const filename of [...names].sort()){
  const metadata=manifest.assets[filename];if(!metadata?.sha256)throw Error('BASELINE_METADATA_MISSING:'+name+'/'+filename);
  const bytes=await readFile(path.join(baseline,name,filename));if(bytes.length!==metadata.size||sha(bytes)!==metadata.sha256)throw Error('BASELINE_ASSET_CHANGED:'+name+'/'+filename);
  const {inlineBody,...pinned}=metadata;assets[filename]=pinned;
 }
 checkpoint.requiredBaseline[name]={release:manifest.release,assets};
}
for(const file of report.files.filter(file=>file.kind==='reviewed-source')){
 const relative=path.relative(root,file.path);if(relative.startsWith('../'))throw Error('SOURCE_OUTSIDE_REPOSITORY:'+relative);
 const bytes=await readFile(file.path);if(bytes.length!==file.size||sha(bytes)!==file.sha256)throw Error('SOURCE_CHANGED_REBUILD_FIRST:'+relative);
 checkpoint.sourceFiles.push({file:relative,sha256:file.sha256,size:file.size});
}
await writeFile(path.join(temporary,'checkpoint.json'),JSON.stringify(checkpoint,null,2)+'\n');
await rm(output,{recursive:true,force:true});await rename(temporary,output);
console.log(JSON.stringify({output,packages:checkpoint.packages.map(({name,manifestSha256})=>({name,manifestSha256})),sourceFiles:checkpoint.sourceFiles.length,requiredBaselineFiles:Object.values(checkpoint.requiredBaseline).reduce((sum,value)=>sum+Object.keys(value.assets).length,0),mediaArchived:false,networkCalls:0},null,2));
