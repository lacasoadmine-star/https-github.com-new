import {RELEASE} from '../public/registry.mjs';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),assets={};
for(const name of await readdir(root+'public')){assets[name]={type:name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.svg')?'image/svg+xml; charset=utf-8':name.endsWith('.txt')?'text/plain; charset=utf-8':'application/javascript; charset=utf-8',body:await readFile(root+'public/'+name,'utf8')};}
for(const [name,asset] of Object.entries(assets))for(const match of asset.body.matchAll(/\/zplay-machines-[\w-]+\//g))if(match[0]!=='/'+RELEASE+'/')throw Error('Stale asset release path in '+name+': '+match[0]);
await writeFile(root+'worker/machine-assets-20261106.mjs','export const release='+JSON.stringify(RELEASE)+';\nexport const assets='+JSON.stringify(assets)+';\n');
let router=await readFile(root+'worker/player-router-v236.before.mjs','utf8');
router="import {machineAPI,machinePage} from './machine-routes.mjs';\n"+router;
router=router.replace(" if(!['GET','HEAD'].includes(request.method)||path.startsWith('/api/'))", " const machineResponse=await machineAPI(request,env,ctx,previous);if(machineResponse)return decorateSession(request,machineResponse,env);\n const page=machinePage(request,config);if(page)return page;\n if(!['GET','HEAD'].includes(request.method)||path.startsWith('/api/'))");
await writeFile(root+'worker/player-router-v236.mjs',router);
const old=await readFile(root+'worker/mh5-42726-router-v233.before.mjs','utf8');
const marker=' const response=await previous.fetch(request,env,ctx);';
if(!old.includes(marker))throw Error('Legacy router changed');
await writeFile(root+'worker/mh5-42726-router-v233.mjs',old.slice(0,old.indexOf(marker))+' return previous.fetch(request,env,ctx);\n};}\n');
console.log(JSON.stringify({assets:Object.keys(assets).length,bytes:JSON.stringify(assets).length,replaced:['player-router-v236.mjs','mh5-42726-router-v233.mjs'],added:['machine-routes.mjs','machine-assets-20261106.mjs']}));
