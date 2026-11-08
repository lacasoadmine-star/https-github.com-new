#!/usr/bin/env node
// Public static source capture only. No provider program or session is executed.
import{readFile,writeFile,mkdir,rename,rm}from'node:fs/promises';
import{resolve,dirname,extname}from'node:path';
import{fileURLToPath,pathToFileURL}from'node:url';
import{execFile}from'node:child_process';
import{promisify}from'node:util';
import{sha256}from'../../scripts/fetch-reference-assets.mjs';
import{parseSpineAtlas,normalizeSpineRegions}from'../atlas.mjs';
const run=promisify(execFile),ROOT=dirname(fileURLToPath(import.meta.url));
export const ASSET_BASE='https://cdn.galaxsys-games.com/gsl-cdn/prd/';
export const MAX_LEGENDS_BYTES=55_000_000,MAX_SINGLE_BYTES=8_000_000;
const names=['wild','majorYellow','majorRed','majorBlue','majorGreen','simpleYellow','simpleRed','simpleBlue','simpleGreen','scatter'];
export const catalog=[
 {id:'egyptianlegends_native',slug:'egyptianlegends',name:'Egyptian Legends',spineBase:'spines_v7/mobile/iconsPopups/',atlas:'iconsPopups.atlas',skeletons:Array.from({length:11},(_,i)=>({providerId:i+1,file:(i+1)+'.json'})),images:{logo:'logo.webp',background:'background/background.webp',bonusBackground:'background/backgroundBonus.webp',board:'slotBoard.webp',boardBackground:'slotBoardBg.webp',mask:'boardViewMask.webp',spin:'betPart/betButton/bet_button_bg.webp',stop:'betPart/betButton/spin_stop_icon.webp',autoPlay:'betPart/autoPlayButton/auto_play_icon.webp',buyBonus:'buyBonusBtn/buy_bonus.webp',progress:'progressBar/default.webp',progressBlue:'progressBar/blue.webp',progressYellow:'progressBar/yellow.webp'},audio:['background-music.mp3','sounds.mp3'],runtime:{url:'https://cdn.galaxsys-games.com/gsl-client/prd/gsl-egyptianlegends-client/v44/252.js',sha256:'af3379a040558bb1f8651c4f79cde399aa8f0508c99da242658f88289094cd06'}},
 {id:'olympianlegends_native',slug:'olympianlegends',name:'Olympian Legends',spineBase:'spines/mobile/icons/',atlas:'icons.atlas',skeletons:names.map((name,index)=>({providerId:index+1,file:name+'.json'})),images:{logo:'logo.webp',background:'background.webp',bonusBackground:'backgroundActive.webp',board:'slotBoard.webp',boardBackground:'slotBoardBgPortrait.webp',mask:'boardViewMask.webp',spin:'BetPart/betButton/bet_button_bg.webp',stop:'BetPart/betButton/spin_stop_icon.webp',autoPlay:'BetPart/autoPlayButton/auto_play_icon.webp',buyBonus:'buyBonusBtn/buy_bonus.webp',progress:'progressBar/default.webp',progressBlue:'progressBar/blue.webp',progressYellow:'progressBar/yellow.webp'},audio:['background-music.mp3','sounds.mp3'],runtime:{url:'https://cdn.galaxsys-games.com/gsl-client/prd/gsl-olympianlegends-client/v165/240.js',sha256:'4b2b922650f80404d0bf6d85d3da414c6a7637b04d9d5fc9343a7c11733a5281'}},
];
export function staticURL(value){const url=new URL(value);if(url.origin!=='https://cdn.galaxsys-games.com'||!url.pathname.startsWith('/gsl-cdn/prd/')||url.search||url.hash||url.username||url.password||!/^\.(webp|png|jpg|json|atlas|woff|woff2|mp3)$/.test(extname(url.pathname)))throw new Error('Only declared public Legends static asset URLs are accepted');return url.href;}
export function modernAtlasText(text){
 // Spine4 omits indentation. The shared parser accepts the same fields with
 // region properties indented, preserving exact bounds and offsets.
 let inRegion=false,newPage=true;
 return String(text).replace(/\r/g,'').split('\n').map(line=>{
  if(!line.trim()){newPage=true;inRegion=false;return line;}
  const isProperty=/^[a-zA-Z]+:/.test(line.trim());
  if(!isProperty){if(newPage){newPage=false;inRegion=false;}else inRegion=true;return line.trim();}
  return(inRegion?'  ':'')+line.trim();
 }).join('\n');
}
export const atlasPages=text=>parseSpineAtlas(modernAtlasText(text)).pages;
export const atlasRegions=(text,textures)=>normalizeSpineRegions(modernAtlasText(text),textures);
function mime(ext){return{'.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.json':'application/json','.atlas':'text/plain','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg'}[ext];}
async function pool(items,task,width=3){let next=0;await Promise.all(Array.from({length:width},async()=>{for(;;){const i=next++;if(i>=items.length)return;await task(items[i]);}}));}
export function verify(entry,bytes){if(bytes.length!==entry.bytes||sha256(bytes)!==entry.sha256)throw new Error('Locked Legends asset hash/size mismatch: '+entry.file);return true;}

async function main(){
 const args=process.argv.slice(2),at=args.indexOf('--cache-dir'),cache=at>=0?resolve(args[at+1]):'/tmp/zplay-legends-assets';await mkdir(cache,{recursive:true});
 const lockPath=resolve(ROOT,'assets.lock.json');let prior=null;try{prior=JSON.parse(await readFile(lockPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 if(prior&&args.includes('--retry-failed')){
  const remaining=[];prior.retryHistory=[...(prior.retryHistory||[]),{retriedAt:new Date().toISOString(),failures:prior.failures||[]}];
  for(const failed of prior.failures||[]){
   try{const url=staticURL(failed.url),limit=Math.min(MAX_SINGLE_BYTES,MAX_LEGENDS_BYTES-prior.transferredBytes);if(limit<=0)throw new Error('Capture budget exhausted');
    const bytes=(await run('curl',['--silent','--show-error','--fail','--proto','=https','--max-redirs','0','--connect-timeout','20','--max-time','40','--max-filesize',String(limit),url],{encoding:'buffer',maxBuffer:limit+1024})).stdout;
    const digest=sha256(bytes),ext=extname(new URL(url).pathname),entry={url,file:digest+ext,bytes:bytes.length,sha256:digest,mimeType:mime(ext),role:failed.role};
    await writeFile(resolve(cache,entry.file),bytes);prior.assets.push(entry);prior.transferredBytes+=bytes.length;
   }catch(error){remaining.push({...failed,error:error.message});}
  }
  prior.failures=remaining;prior.assets.sort((a,b)=>a.url.localeCompare(b.url));prior.uniqueBytes=[...new Map(prior.assets.map(item=>[item.sha256,item.bytes])).values()].reduce((a,b)=>a+b,0);
  await writeFile(lockPath,JSON.stringify(prior,null,2)+'\n');
 }
 if(prior&&!args.includes('--capture')){
  const failures=[...(prior.failures||[])];let verifiedAssets=0,verifiedBytes=0;for(const entry of prior.assets){try{let bytes;try{bytes=await readFile(resolve(cache,entry.file));}catch(error){if(error.code!=='ENOENT'||args.includes('--verify-only'))throw error;bytes=(await run('curl',['--silent','--show-error','--fail','--proto','=https','--max-redirs','0','--max-time','35','--max-filesize',String(entry.bytes),entry.url],{encoding:'buffer',maxBuffer:entry.bytes+1024})).stdout;verify(entry,bytes);await writeFile(resolve(cache,entry.file),bytes);}verify(entry,bytes);verifiedAssets++;verifiedBytes+=bytes.length;}catch(error){failures.push({url:entry.url,error:error.message});}}
  const receipt={verifiedAt:new Date().toISOString(),verifiedAssets,verifiedBytes,declaredBytes:prior.assets.reduce((sum,item)=>sum+item.bytes,0),failures,complete:failures.length===0};await writeFile(resolve(ROOT,'verification.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));if(failures.length)process.exitCode=1;return;
 }
 const entries=new Map(),promises=new Map(),failures=[],games={};let transferredBytes=0,reserved=0,completed=0;
 const seed=new Map([
  [ASSET_BASE+'egyptianlegends/images/mobile/logo.webp','/tmp/zplay-egypt-logo.webp'],[ASSET_BASE+'olympianlegends/images/mobile/logo.webp','/tmp/zplay-olymp-logo.webp'],
  [ASSET_BASE+'egyptianlegends/spines_v7/mobile/iconsPopups/iconsPopups.atlas','/tmp/zplay-egypt-icons.atlas'],[ASSET_BASE+'olympianlegends/spines/mobile/icons/icons.atlas','/tmp/zplay-olymp-icons.atlas'],
  [ASSET_BASE+'egyptianlegends/spines_v7/mobile/iconsPopups/2.json','/tmp/zplay-egypt-symbol2.json'],[ASSET_BASE+'olympianlegends/spines/mobile/icons/majorYellow.json','/tmp/zplay-olymp-symbol2.json'],
 ]);
 const acquire=async(value,role)=>{
  const url=staticURL(value);if(promises.has(url))return promises.get(url);
  const promise=(async()=>{let bytes,allowance=0;
   try{
    if(seed.has(url)){try{bytes=await readFile(seed.get(url));}catch(error){if(error.code!=='ENOENT')throw error;}}
    if(!bytes){allowance=Math.min(MAX_SINGLE_BYTES,MAX_LEGENDS_BYTES-transferredBytes-reserved);if(allowance<=0)throw new Error('Legends capture budget exhausted');reserved+=allowance;try{bytes=(await run('curl',['--silent','--show-error','--fail','--proto','=https','--max-redirs','0','--connect-timeout','12','--max-time','35','--max-filesize',String(allowance),url],{encoding:'buffer',maxBuffer:allowance+1024})).stdout;}finally{reserved-=allowance;}transferredBytes+=bytes.length;}
    if(!bytes.length||bytes.length>MAX_SINGLE_BYTES||transferredBytes>MAX_LEGENDS_BYTES)throw new Error('Legends capture size exceeded');
    const hash=sha256(bytes),ext=extname(new URL(url).pathname),file=hash+ext,entry={url,file,bytes:bytes.length,sha256:hash,mimeType:mime(ext),role};
    const temporary=resolve(cache,file+'.part-'+process.pid+'-'+completed);try{await writeFile(temporary,bytes);await rename(temporary,resolve(cache,file));}finally{await rm(temporary,{force:true});}
    entries.set(url,entry);completed++;if(completed%10===0)console.log(JSON.stringify({captured:completed,transferredBytes}));return{entry,bytes};
   }catch(error){failures.push({url,role,error:error.message});return null;}
  })();promises.set(url,promise);return promise;
 };
 const jobs=[];
 for(const spec of catalog){
  const base=ASSET_BASE+spec.slug+'/',images={};games[spec.id]={name:spec.name,slug:spec.slug,runtime:spec.runtime,atlasURL:base+spec.spineBase+spec.atlas,skeletons:spec.skeletons.map(s=>({...s,url:base+spec.spineBase+s.file})),images,audio:spec.audio.map(path=>base+'audio/'+path),fonts:[ASSET_BASE+'common/fonts/RubikBold/RubikBold.woff'],productionLaunchEnabled:false};
  for(const[role,path]of Object.entries(spec.images)){const url=base+'images/mobile/'+path;images[role]=url;jobs.push({url,role:spec.id+':'+role});}
  for(const skeleton of games[spec.id].skeletons)jobs.push({url:skeleton.url,role:spec.id+':symbol:'+skeleton.providerId});
  for(const url of [...games[spec.id].audio,...games[spec.id].fonts])jobs.push({url,role:spec.id+':audio-or-font'});
  jobs.push({url:games[spec.id].atlasURL,role:spec.id+':atlas'});
 }
 await pool(jobs,job=>acquire(job.url,job.role));
 const pageJobs=[];
 for(const[id,game]of Object.entries(games)){
  const result=await promises.get(game.atlasURL);if(!result)continue;
  game.pages=atlasPages(result.bytes.toString('utf8')).map(page=>({name:page.name,url:new URL(page.name,game.atlasURL).href,size:page.size}));
  for(const page of game.pages)pageJobs.push({url:page.url,role:id+':atlas-page'});
 }
 await pool(pageJobs,job=>acquire(job.url,job.role));
 const assets=[...entries.values()].sort((a,b)=>a.url.localeCompare(b.url)),unique=new Map(assets.map(asset=>[asset.sha256,asset.bytes]));
 const lock={schemaVersion:1,capturedAt:new Date().toISOString(),scope:'Public mobile core artwork and static symbol setup references. No provider runtime, session, wallet or deployment.',productionLaunchEnabled:false,games,assets,uniqueBytes:[...unique.values()].reduce((a,b)=>a+b,0),transferredBytes,maximumCaptureBytes:MAX_LEGENDS_BYTES,failures};
 await writeFile(lockPath,JSON.stringify(lock,null,2)+'\n');await writeFile(resolve(ROOT,'verification.json'),JSON.stringify({verifiedAt:lock.capturedAt,verifiedAssets:assets.length,uniqueBytes:lock.uniqueBytes,failures,complete:!failures.length},null,2)+'\n');
 console.log(JSON.stringify({games:Object.keys(games).length,assets:assets.length,uniqueBytes:lock.uniqueBytes,transferredBytes,failures}));if(failures.length)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
