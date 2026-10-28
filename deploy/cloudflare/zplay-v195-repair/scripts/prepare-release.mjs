// Prepare only. This script cannot upload or deploy a Worker.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths=['game.html','css/collection-v2300.css','js/cabinet-v2300.js','js/dashboard.js','js/game-v2300.js','js/reels-v2300.js','js/reel-motion.mjs','js/round-contract.mjs'];
const assets=Object.fromEntries(paths.map(p=>['/slots/'+p,{body:fs.readFileSync(path.join(root,'slots',p),'utf8'),type:p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8'}]));
const entry=`import previous from './zplay-stop-entry.mjs';\nconst assets=${JSON.stringify(assets)};\nexport default {async fetch(request,env,ctx){const url=new URL(request.url),asset=assets[url.pathname];if(!asset)return previous.fetch(request,env,ctx);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD'}});return new Response(request.method==='HEAD'?null:asset.body,{headers:{'content-type':asset.type,'cache-control':'no-store','x-content-type-options':'nosniff','x-zplay-release':'v196'}});}};\n`;
fs.mkdirSync(path.join(root,'build'),{recursive:true});fs.writeFileSync(path.join(root,'build/zplay-rebuild-entry.mjs'),entry);
console.log('Prepared build/zplay-rebuild-entry.mjs. Requires all unchanged v195 modules and original bindings; NOT deployed.');
