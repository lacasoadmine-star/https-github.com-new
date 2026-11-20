// Restore only the frozen baseline bytes required by the dedicated builder.
// Public GETs are SHA-256 checked; --reuse performs an entirely offline restore.
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const run=promisify(execFile),root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const args=process.argv.slice(2),option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const archive=path.resolve(option('--checkpoint',path.join(root,'changes/dedicated-resume/release-checkpoint')));
const destination=path.resolve(option('--out',path.resolve(root,'../../../restored-dedicated-baseline')));
const reuse=option('--reuse',null),checkpoint=JSON.parse(await readFile(path.join(archive,'checkpoint.json'),'utf8'));
const selectedGame=option('--game',null);
if(selectedGame&&!Object.hasOwn(checkpoint.requiredBaseline,selectedGame))throw Error('UNKNOWN_GAME');
if(checkpoint.origin!=='https://superwin-player.apdiy61.workers.dev')throw Error('UNEXPECTED_BASELINE_ORIGIN');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const valid=(bytes,meta)=>bytes.length===meta.size&&sha(bytes)===meta.sha256;
let copied=0,downloaded=0,verifiedBytes=0;
for(const [game,{release,assets}]of Object.entries(checkpoint.requiredBaseline)){
 if(selectedGame&&game!==selectedGame)continue;
 if(!['habesha','deluxe'].includes(game)||!/^zplay-native-machines-\d{8}-(?:habesha|mh5deluxe)-r\d+$/.test(release))throw Error('INVALID_BASELINE_ROUTE');
 const directory=path.join(destination,game);await mkdir(directory,{recursive:true});
 for(const name of ['qa-baseline-manifest.json','index.html'])await writeFile(path.join(directory,name),await readFile(path.join(archive,'baseline',game,name)));
 for(const [name,meta]of Object.entries(assets)){
  if(!/^[a-zA-Z0-9_.-]+$/.test(name)||!Number.isInteger(meta.size)||!/^[a-f0-9]{64}$/.test(meta.sha256))throw Error('INVALID_BASELINE_DESCRIPTOR');
  const target=path.join(directory,name);let bytes;
  try{bytes=await readFile(target);if(!valid(bytes,meta))bytes=null;}catch{}
  if(!bytes&&reuse){bytes=await readFile(path.join(reuse,game,name));if(!valid(bytes,meta))throw Error('REUSED_ASSET_HASH_MISMATCH:'+game+'/'+name);await writeFile(target,bytes);copied++;}
  if(!bytes){
   const temporary=target+'.download';
   try{
    const {stdout}=await run('curl',['--silent','--show-error','--max-time','45','-w','%{http_code}','-o',temporary,checkpoint.origin+'/'+release+'/'+name],{maxBuffer:1024});
    if(stdout!=='200')throw Error('BASELINE_HTTP_'+stdout+':'+game+'/'+name);
    bytes=await readFile(temporary);if(!valid(bytes,meta))throw Error('BASELINE_HASH_MISMATCH:'+game+'/'+name);
    await rename(temporary,target);downloaded++;
   }finally{await unlink(temporary).catch(()=>{});}
  }
  verifiedBytes+=bytes.length;
 }
}
console.log(JSON.stringify({destination,copied,downloaded,verifiedBytes,productionTransactions:0},null,2));
