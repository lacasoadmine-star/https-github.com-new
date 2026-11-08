import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {drawAtlasFrame} from './atlas.mjs';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),assetRoot=process.argv[2];
if(!assetRoot)throw Error('Pass the hash-verified MultiHot40 static asset directory');
const manifest=JSON.parse(await readFile(resolve(root,'presentation/manifests/multihot40_native.json'),'utf8'));
const canvas=createCanvas(400,520),context=canvas.getContext('2d'),images=new Map();
async function image(file){if(images.has(file))return images.get(file);const bytes=await readFile(resolve(assetRoot,file));if(createHash('sha256').update(bytes).digest('hex')!==manifest.files[file]?.sha256)throw Error('COVER_ASSET_CHANGED:'+file);const result=await loadImage(bytes);images.set(file,result);return result;}
async function sprite(name,x,y,width,height){const frame=manifest.frames[name];if(!frame)throw Error('COVER_FRAME_MISSING:'+name);drawAtlasFrame(context,await image(frame.file),frame,{x,y,width,height});}
const green=context.createRadialGradient(200,260,10,200,260,340);green.addColorStop(0,'#067646');green.addColorStop(.64,'#044c30');green.addColorStop(1,'#011b12');context.fillStyle=green;context.fillRect(0,0,400,520);
context.strokeStyle='#e9cb53';context.lineWidth=2;context.strokeRect(14,14,372,492);context.globalAlpha=.24;context.lineWidth=1;context.strokeRect(21,21,358,478);context.globalAlpha=1;
context.fillStyle='#fff8d8';context.font='bold 14px sans-serif';context.textAlign='center';context.fillText('ZPLAY',200,51);
await sprite(manifest.logo.frame,25,83,350,90);
await sprite('Box/0',143,182,122,164);
await sprite('Box/4',35,253,130,142);await sprite('Box/7',243,256,118,143);
await sprite('Box/2',142,331,116,126);
context.fillStyle='#ffe085';context.font='bold 20px sans-serif';context.fillText('40 LINES · 1–5×',200,481);
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" role="img" aria-label="Multi Hot 40"><image width="400" height="520" href="data:image/png;base64,'+canvas.toBuffer('image/png').toString('base64')+'"/></svg>\n';
await mkdir(resolve(root,'client/covers'),{recursive:true});await writeFile(resolve(root,'client/covers/multihot40_native.svg'),svg);console.log(JSON.stringify({cover:'client/covers/multihot40_native.svg',bytes:Buffer.byteLength(svg),source:'Hash-verified individual title logo and symbol sprites'}));
