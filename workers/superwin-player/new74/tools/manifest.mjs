import {readFile,readdir,mkdir,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),report=fileURLToPath(new URL('../../../../reports/smartsoft-pair01/asset-sources.json',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const sources=JSON.parse(await readFile(report,'utf8')),sprites=JSON.parse(await readFile(root+'src/sprites.json','utf8'));
const assets=new Set(Object.values(sprites).flatMap(frames=>Object.values(frames).map(f=>f.image.replace('/new74/',''))));
for(const game of ['multihot5','multihot10'])for(const file of ['background.mp3','click.mp3','spin.mp3','stop.mp3','win.mp3','take.mp3',game==='multihot5'?'background.jpg':'background.png'])assets.add(`assets/${game}/${file}`);
for(const name of ['intro-regular.otf','intro-black.otf'])assets.add('assets/fonts/'+name);
const files=[];
for(const path of [...assets].sort()){const bytes=await readFile(root+path);files.push({path,bytes:bytes.length,sha256:sha(bytes),source:sources[path.slice(7)]});}
for(const name of (await readdir(root+'src')).sort()){if(!(await stat(root+'src/'+name)).isFile())continue;const bytes=await readFile(root+'src/'+name);files.push({path:name,bytes:bytes.length,sha256:sha(bytes)});}
await mkdir(root+'release',{recursive:true});
await writeFile(root+'release/manifest.json',JSON.stringify({revision:'20261113-pair01-r1',files},null,2)+'\n');
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),manifest:root+'release/manifest.json'}));
