// Parallel, opt-in localhost QA; all browser assertions remain in player-qa-browser.mjs.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

if(!process.argv.includes('--qa'))throw Error('Pass --qa to use isolated synthetic localhost accounts.');
const option=(name,fallback)=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const port=Number(option('port','8767')),rounds=Number(option('rounds','30')),duration=Number(option('duration-ms','300000'));
const ids=['multi_hot_5_video','hot_foxy_20','wild_multi_stars','multi_hot_100'];
const selected=option('games',ids.join(',')).split(','),out=resolve(option('out',fileURLToPath(new URL('../.qa-duration-results/',import.meta.url))));
if(!Number.isInteger(port)||port<1024||port>65535||!Number.isInteger(rounds)||rounds<30||!Number.isInteger(duration)||duration<300000||!selected.length||new Set(selected).size!==selected.length||selected.some(id=>!ids.includes(id)))throw Error('Duration QA requires legal games, at least30 rounds and300000ms per game.');
const health=await fetch('http://127.0.0.1:'+port+'/health').then(response=>response.json());
if(health.synthetic!==true||health.productionConnected!==false)throw Error('Start player-qa-server.mjs --qa on this localhost port first.');
await mkdir(out,{recursive:true});
const runner=fileURLToPath(new URL('./player-qa-browser.mjs',import.meta.url)),startedAt=new Date().toISOString();
const children=await Promise.all(selected.map(id=>new Promise(resolveResult=>{
 const child=spawn(process.execPath,[runner,'--qa','--port='+port,'--width=390','--rounds='+rounds,'--min-play-ms='+duration,'--games='+id,'--out='+resolve(out,id)],{stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',data=>process.stdout.write(data));child.stderr.on('data',data=>process.stderr.write(data));
 child.on('error',error=>resolveResult({game:id,error:String(error)}));child.on('close',code=>resolveResult({game:id,exitCode:code}));
})));
const results=[];
for(const child of children){
 try{const document=JSON.parse(await readFile(resolve(out,child.game,'results.json'),'utf8')),record=document.results.find(item=>item.game===child.game);results.push({...child,record:resolve(out,child.game,'results.json'),primaryRounds:record.primaryRounds.length,totalSettled:record.report?.roundSettlements,actualPlayDurationMs:record.actualPlayDurationMs,checks:record.checks.length,passed:record.checks.filter(check=>check.ok).length,error:record.error||child.error,ok:child.exitCode===0&&!record.error&&record.primaryRounds.length>=rounds&&record.actualPlayDurationMs>=duration&&record.checks.every(check=>check.ok)});}
 catch(error){results.push({...child,error:String(error),ok:false});}
}
const summary={synthetic:true,origin:'http://127.0.0.1:'+port,startedAt,endedAt:new Date().toISOString(),requiredPrimaryRoundsPerGame:rounds,requiredDurationMsPerGame:duration,parallel:true,results};
await writeFile(resolve(out,'duration-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary));if(results.some(result=>!result.ok))process.exitCode=1;
