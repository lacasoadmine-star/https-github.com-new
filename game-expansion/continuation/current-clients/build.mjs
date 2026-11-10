import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASSETS as released} from '../accepted-controls-r12/remaining20-accepted-controls-assets-r12.mjs';
import {GROUPS,PAGES} from '../accepted-controls-r12/remaining20-accepted-controls-index-r12.mjs';

// Rebuild the ten clients from editable text instead of editing JSON strings
// inside a previously published, immutable Worker assets module.
const hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('./',import.meta.url),assets={};
const inventory=[];
for(const name of Object.keys(released).sort()){
 const source=name==='accepted-controls.mjs'?name:'clients/'+name;
 const body=await readFile(new URL(source,root),'utf8');
 assets[name]={...released[name],body};
 inventory.push({name,source,bytes:Buffer.byteLength(body),sha256:hash(body),releasedSha256:hash(released[name].body)});
}
const groups=new Set(Object.values(PAGES));
if(groups.size!==8||Object.keys(GROUPS).some(group=>!groups.has(group))||Object.keys(PAGES).length!==12)throw Error('CLIENT_SCOPE_CHANGED');
for(const group of groups){
 const source=assets[group+'/app.mjs']?.body;
 if(!source?.includes("import {restoreAcceptedControls} from './accepted-controls.mjs';")||!source.includes('restoreAcceptedControls(state,game,ui)'))throw Error('ACCEPTED_CONTROLS_MISSING:'+group);
}
const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--check'){
 const changed=inventory.filter(item=>item.sha256!==item.releasedSha256);
 if(changed.length)throw Error('RELEASED_CLIENT_DIFFERENCES:'+changed.map(item=>item.name).join(','));
 console.log(JSON.stringify({assets:inventory.length,clientGroups:groups.size,games:10,pages:12,allReleasedBytesMatch:true,networkRequests:0}));
}else if(args.length===2&&args[0]==='--output'){
 const output=resolve(args[1]);
 if(output===fileURLToPath(new URL('../accepted-controls-r12/remaining20-accepted-controls-assets-r12.mjs',root)))throw Error('IMMUTABLE_RELEASE_OUTPUT');
 // Exclusive creation prevents overwriting an earlier candidate or release.
 await writeFile(output,'export const ASSETS='+JSON.stringify(assets)+';\n',{flag:'wx'});
 await writeFile(output+'.inventory.json',JSON.stringify({sourceRelease:'Player v354 / Library v33',assets:inventory},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,assets:inventory.length,bytes:inventory.reduce((n,a)=>n+a.bytes,0),deployed:false}));
}else{
 throw Error('Usage: node current-clients/build.mjs --check | --output /path/to/new-candidate.mjs');
}
