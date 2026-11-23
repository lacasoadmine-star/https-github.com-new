import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {transform} from 'esbuild';
const here=dirname(fileURLToPath(import.meta.url)),game=join(here,'multihot40');
const names=['entry.mjs','controls.mjs','model.mjs','line-paths.mjs','local-session.mjs','reel-motion.mjs','sprite-renderer.mjs','artwork.mjs','audio.mjs','brand.mjs','win-presentation.mjs','style.css','index.html','artwork.json'];
const hash=data=>createHash('sha256').update(data).digest('hex');
export async function build({output=join(here,'dist'),audioPins={}}={}) {
 const files={};for(const name of names){
  const source=await readFile(join(game,name),'utf8');
  files[name]=name.endsWith('.mjs')?(await transform(source,{loader:'js',minify:true,format:'esm',target:'es2022'})).code:
   name.endsWith('.css')?(await transform(source,{loader:'css',minify:true,target:'es2022'})).code:source;
 }
 // A missing local module must fail the build, not become a loading failure online.
 for(const [name,source] of Object.entries(files))if(name.endsWith('.mjs'))
  for(const match of source.matchAll(/(?:from|import)\s*["']([^"']+)["']/g))
   if(!match[1].startsWith('./')||!names.includes(match[1].slice(2)))throw Error('OLD70_IMPORT_CLOSURE:'+name);
 const art=JSON.parse(files['artwork.json']),media={};
 for(const asset of art.assets)media[asset.file]={key:art.namespace+asset.file,bytes:asset.bytes,sha256:asset.sha256,type:asset.mime};
 for(const clip of art.audio){
  const pin=audioPins[clip.path];if(!pin)throw Error('OLD70_AUDIO_PIN_MISSING:'+clip.label);
  media[clip.path]={key:clip.path,sha256:clip.path.split('/').at(-1).slice(0,64),bytes:pin.bytes,type:'audio/mpeg'};
 }
 const worker=await readFile(join(here,'host/worker.mjs'),'utf8');
 const revision=hash(JSON.stringify({files,media,worker})).slice(0,24);
 const modules={
  'old70-entry.mjs':"import previous from './burn-wilds-test-entry.mjs';import {createOld70Worker} from './old70-host.mjs';import config from './old70-assets.mjs';export default createOld70Worker(previous,config);",
  'old70-host.mjs':(await transform(worker,{loader:'js',minify:true,format:'esm',target:'es2022'})).code,
  'old70-assets.mjs':'export default '+JSON.stringify({revision,files,media})+';'
 };
 await mkdir(output,{recursive:true});
 for(const [name,source] of Object.entries(modules))await writeFile(join(output,name),source);
 const report={schema:'superwin-old70-mh40-practice-v1',revision,target:'superwin-native-presentation',parentPlayer:'superwin-player',
  route:'/native-ui/old70/multihot40/',mode:'PRACTICE',cashEnabled:false,providerParityVerified:false,
  modules:Object.entries(modules).map(([name,s])=>({name,bytes:Buffer.byteLength(s),gzipBytes:gzipSync(s).length,sha256:hash(s)})),
  client: names.map(name=>({name,bytes:Buffer.byteLength(files[name]),sha256:hash(files[name])})),
  mediaBytes:Object.values(media).reduce((sum,p)=>sum+p.bytes,0),preservesPreviousMain:'burn-wilds-test-entry.mjs'};
 await writeFile(join(output,'manifest.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const pins=JSON.parse(await readFile(join(here,'audio-pins.json'),'utf8'));console.log(JSON.stringify(await build({audioPins:pins}),null,2));
}
