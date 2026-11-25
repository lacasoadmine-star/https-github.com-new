import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MEDIA_NAMES} from '../../new-games90-20261123/m20-release/worker.mjs';

// Public already-deployed own game media. No provider program, session,
// authentication or production gameplay is accessed by this QA helper.
const origin='https://superwin-player.apdiy61.workers.dev';
const revision='79bb7e48737feb68a2e905f8';
const manifestHash='c757c008212e6e6f2accd7d19e0030685b6331d99d826defd555337bd18c7c94';
const base=`/_zplay/new90-m20/${revision}/`;
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const output=process.argv[2]&&resolve(process.argv[2]);
if(!output||output===repo||output.startsWith(repo+'/'))throw Error('PRIVATE_QA_MEDIA_DIRECTORY_REQUIRED');
const digest=value=>createHash('sha256').update(value).digest('hex');
async function get(path){const response=await fetch(origin+path,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('PUBLIC_GAME_MEDIA_HTTP_'+response.status);return Buffer.from(await response.arrayBuffer());}
const bytes=await get(base+`assets.${manifestHash}.json`);
if(bytes.length!==1950||digest(bytes)!==manifestHash)throw Error('PUBLIC_GAME_MANIFEST_CHANGED');
const manifest=JSON.parse(bytes);
if(JSON.stringify(Object.keys(manifest.files||{}).sort())!==JSON.stringify([...MEDIA_NAMES].sort()))throw Error('PUBLIC_GAME_MEDIA_SET_CHANGED');
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'assets.json'),bytes);
for(const [name,pin]of Object.entries(manifest.files)){
  if(!/^[a-z0-9-]+\.(png|mp3)$/.test(name)||!Number.isSafeInteger(pin.bytes)||pin.bytes<1||pin.bytes>8*1024*1024||!/^[a-f0-9]{64}$/.test(pin.sha256))throw Error('PUBLIC_GAME_MEDIA_PIN_INVALID');
  const body=await get(base+'assets/'+name);
  if(body.length!==pin.bytes||digest(body)!==pin.sha256)throw Error('PUBLIC_GAME_MEDIA_CHANGED_'+name);
  await writeFile(resolve(output,name),body);
}
console.log(JSON.stringify({mediaFiles:MEDIA_NAMES.length,manifestSha256:manifestHash,productionWagers:0,credentialsUsed:false}));
