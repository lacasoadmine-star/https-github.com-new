// Reproducible patch for a copied, isolated QA asset stage only.
// This never writes to the recovered production source or its deployment entry.
import {readFile, writeFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const importLine = "import {symbolFrame,drawSymbolFrame,drawSymbolTransition} from './qa-symbol-geometry.mjs';\n";

function replaceOne(source, previous, replacement, label) {
  if (source.includes(replacement)) return source;
  if (source.split(previous).length !== 2) throw Error('QA_PATCH_ANCHOR_MISMATCH:' + label);
  return source.replace(previous, replacement);
}

export function patchHabesha(source) {
  if (!source.includes(importLine)) source = importLine + source;
  source = replaceOne(source,
    'const manifest=await response.json();const sprites=Object.values(manifest.sprites);',
    "const manifest=await response.json();const sprites=Object.values(manifest.sprites);this.symbolFrames=new Map(sprites.filter(entry=>/^Box\\/\\d+$/.test(entry.name)).map(entry=>['symbol_'+entry.name.slice(4),symbolFrame(entry)]));",
    'habesha-symbol-frames');
  source = replaceOne(source,
    "if(this.pendingSpin||position.p<.72)c.drawImage((l.landscape?this.landscapeSprites:this.sprites).get('Box/Blur/'+strip[n].slice(7)),sx,sy,reels.width,reels.height);else this.drawSymbol(c,strip[n],sx,sy,reels.width,reels.height);",
    "const symbol=strip[n],art=l.landscape?this.landscapeSprites:this.sprites,clarity=this.pendingSpin?0:Math.max(0,(position.p-.72)/.28);drawSymbolTransition(c,art.get('Box/Blur/'+symbol.slice(7)),art.get('Box/'+symbol.slice(7)),l.landscape?null:this.symbolFrames.get(symbol),sx,sy,reels.width,reels.height,clarity);",
    'habesha-moving-frame');
  source = replaceOne(source,
    "drawSymbol(c,symbol,x,y,w,h){if(this.layout?.landscape){c.drawImage(this.landscapeSprites.get('Box/'+symbol.slice(7)),x,y,w,h);return;}const image=this.atlas.get(symbol),b=this.spriteBounds.get('Box/'+symbol.slice(7));if(!b){c.drawImage(image,x,y,w,h);return;}const scale=Math.min(w/b.w,h/b.h);c.drawImage(image,b.x,b.y,b.w,b.h,x+(w-b.w*scale)/2,y+(h-b.h*scale)/2,b.w*scale,b.h*scale);}",
    "drawSymbol(c,symbol,x,y,w,h){if(this.layout?.landscape){c.drawImage(this.landscapeSprites.get('Box/'+symbol.slice(7)),x,y,w,h);return;}drawSymbolFrame(c,this.atlas.get(symbol),this.symbolFrames.get(symbol),x,y,w,h);}",
    'habesha-stationary-frame');
  return source;
}

export function patchDeluxe(source) {
  if (!source.includes(importLine)) source = importLine + source;
  source = replaceOne(source,
    'const sprites=Object.values(manifest.sprites),desktopSprites=Object.values(desktop.sprites);',
    "const sprites=Object.values(manifest.sprites),desktopSprites=Object.values(desktop.sprites);this.symbolFrames=new Map(sprites.filter(entry=>/^Box\\/\\d+$/.test(entry.name)).map(entry=>['symbol_'+entry.name.slice(4),symbolFrame(entry)]));",
    'deluxe-symbol-frames');
  source = replaceOne(source,
    ` drawMovingSymbol(context,symbol,box,desktop,clarity){
  const index=symbol.slice(7);
  context.save();context.globalAlpha=1-clarity;
  if(desktop)this.drawRawSprite(context,'Box/Blur/'+index,box,true);
  else context.drawImage(this.sprites.get('Box/Blur/'+index),box.x,box.y,box.width,box.height);
  if(clarity>0){context.globalAlpha=clarity;if(desktop)this.drawRawSprite(context,'Box/'+index,box,true);else this.drawSymbol(context,symbol,box.x,box.y,box.width,box.height);}
  context.restore();
 }`,
    ` drawMovingSymbol(context,symbol,box,desktop,clarity){
  const index=symbol.slice(7),art=desktop?this.desktopSprites:this.sprites;
  drawSymbolTransition(context,art.get('Box/Blur/'+index),art.get('Box/'+index),desktop?null:this.symbolFrames.get(symbol),box.x,box.y,box.width,box.height,clarity);
 }`,
    'deluxe-moving-frame');
  source = replaceOne(source,
    ` drawSymbol(context,symbol,x,y,width,height){
  const sprite=this.atlas.get(symbol),bounds=this.spriteBounds.get('Box/'+symbol.slice(7));
  if(!bounds){context.drawImage(sprite,x,y,width,height);return;}
  const scale=Math.min(width/bounds.w,height/bounds.h);
  context.drawImage(sprite,bounds.x,bounds.y,bounds.w,bounds.h,x+(width-bounds.w*scale)/2,y+(height-bounds.h*scale)/2,bounds.w*scale,bounds.h*scale);
 }`,
    ` drawSymbol(context,symbol,x,y,width,height){
  drawSymbolFrame(context,this.atlas.get(symbol),this.symbolFrames.get(symbol),x,y,width,height);
 }`,
    'deluxe-stationary-frame');
  return source;
}

export async function applySymbolGeometry(stage) {
  const root = await realpath(stage);
  if (!path.basename(root).startsWith('freeplay-stage')) throw Error('ISOLATED_FREEPLAY_STAGE_REQUIRED');
  const helper = await readFile(path.join(here, 'symbol-geometry.mjs'), 'utf8');
  const updates = [];
  for (const [game, filename, patch] of [
    ['habesha', 'habesha-renderer.mjs', patchHabesha],
    ['deluxe', 'mh5deluxe-renderer.mjs', patchDeluxe]
  ]) {
    const directory = await realpath(path.join(root, game));
    if (directory !== path.join(root, game)) throw Error('QA_STAGE_SYMLINK_REFUSED');
    const target = path.join(directory, filename);
    const before = await readFile(target, 'utf8');
    const after = patch(before);
    await writeFile(path.join(directory, 'qa-symbol-geometry.mjs'), helper);
    if (after !== before) await writeFile(target, after);
    updates.push({game, renderer: target, changed: after !== before});
  }
  return updates;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) throw Error('Usage: node apply-symbol-geometry.mjs /absolute/path/to/freeplay-stage');
  console.log(JSON.stringify(await applySymbolGeometry(process.argv[2])));
}
