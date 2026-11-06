// Native presentation assets, isolated from the receipt/settlement model.
// Sprites are lossless unrotated crops of the public demo atlases; their source
// rectangles and hashes are recorded in evidence/r12/art-*.json.
const packs = new Map();
const symbolNames = {
 hot_foxy_20: ['fox', 'cherry', 'lemon', 'orange', 'watermelon', 'winged_bell', '777', 'big_star'],
 multi_hot_5_video: ['orange', 'cherry', 'plum', 'lemon', 'watermelon', 'grapes', 'golden_bell', 'dollar', '777']
};
// Native atlas topology, independent of the provider's first-two filename numbering.
const foxyLineArt={
 '0,0,0,0,0':1,'1,1,1,1,1':2,'2,2,2,2,2':3,'0,1,2,1,0':4,'2,1,0,1,2':5,
 '0,0,1,2,2':6,'2,2,1,0,0':7,'1,0,0,0,1':8,'1,2,2,2,1':9,'0,1,1,1,0':10,
 '2,1,1,1,2':11,'1,0,1,2,1':12,'1,2,1,0,1':13,'0,1,0,1,0':14,'2,1,2,1,2':15,
 '1,1,0,1,1':16,'1,1,2,1,1':17,'0,2,0,2,0':18,'2,0,2,0,2':19,'1,0,2,0,1':20,
};
const image = src => new Promise(resolve => {
 const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src;
});
export function loadOfficialArtwork(id) {
 if (!symbolNames[id] || typeof Image === 'undefined') return Promise.resolve(null);
 if (!packs.has(id)) packs.set(id, Promise.all(id === 'hot_foxy_20'
  ? [import('./official-foxy-art.mjs'),import('./official-foxy-motion-art.mjs')]
  : [import('./official-mh5-art.mjs'),import('./official-mh5-motion-art.mjs')])
  .then(async ([pack,motion]) => ({id, meta: {...pack.spriteMeta,...motion.spriteMeta},
   foreground: id==='hot_foxy_20'?await import('./official-foxy-foreground.mjs').then(async f=>({logo:await image(f.logo),forest:await image(f.forest)})).catch(()=>null):null,
   sprites: new Map(await Promise.all(Object.entries({...pack.sprites,...motion.sprites}).map(async ([name, src]) => [name, await image(src)]))),
   background: pack.background ? await image(pack.background) : null
  })).catch(() => null));
 return packs.get(id);
}
export function applyOfficialSymbols(atlas, art) {
 if (!art) return false;
 let count = 0;
 symbolNames[art.id].forEach((name, i) => {
  const key = 'Box/' + i, sprite = art.sprites.get(key), meta = art.meta[key], canvas = atlas.get(name);
  if (!sprite || !meta || !canvas) return;
  const c = canvas.getContext('2d'), source = meta.sourceSize, offset = meta.spriteSourceSize;
  const scale = Math.min(canvas.width / source.w, canvas.height / source.h);
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
  c.drawImage(sprite, (canvas.width - source.w * scale) / 2 + offset.x * scale,
   (canvas.height - source.h * scale) / 2 + offset.y * scale, sprite.width * scale, sprite.height * scale);
  count++;
 });
 atlas.officialSymbolCount = count;
 return count === symbolNames[art.id].length;
}
export function drawOfficialBackground(c, art, {foreground=true}={}) {
 if (!art?.background) return false;
 c.drawImage(art.background, 0, 0, 420, 900); if(foreground&&art.foreground?.forest)c.drawImage(art.foreground.forest,0,0,420,900); return true;
}
export function drawOfficialSprite(c, art, key, x, y, w, h) {
 const sprite = art?.sprites.get(key); if (!sprite) return false;
 c.drawImage(sprite, x, y, w, h); return true;
}
// Native blur sprites use the same authored source canvas as their sharp symbols.
export function drawOfficialBlurSymbol(c,art,name,x,y,size) {
 const index=symbolNames[art?.id]?.indexOf(name);if(index===undefined||index<0)return false;
 const key=(art.id==='hot_foxy_20'?'Box/Blur/':'BlurBox/')+index,sprite=art.sprites.get(key),meta=art.meta[key];
 if(!sprite||!meta)return false;
 const source=meta.sourceSize,offset=meta.spriteSourceSize,scale=size/Math.max(source.w,source.h);
 c.drawImage(sprite,x+(size-source.w*scale)/2+offset.x*scale,y+(size-source.h*scale)/2+offset.y*scale,sprite.width*scale,sprite.height*scale);return true;
}
export function drawOfficialFoxyWinPanel(c,art,{amount,progress=1}={}) {
 if(art?.id!=='hot_foxy_20'||!art.sprites.get('Vertical/Start/FooterWin'))return false;
 const scale=.75,x=(235-224)*scale,y=551*scale,cx=(235+270-224)*scale;
 drawOfficialSprite(c,art,'Vertical/Start/FooterWin',x,y,538*scale,123*scale);
 c.save();c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f4b158';c.font="13.5px 'Foxy Intro caps',Arial";c.fillText('WIN',cx,y+33*scale+6.75);
 const value=(Math.max(0,Number(amount)||0)*Math.max(0,Math.min(1,progress))).toFixed(2);
 c.font="18px 'Foxy Intro caps',Arial";const amountWidth=c.measureText(value).width;c.font="13.5px 'Foxy Intro caps',Arial";const currencyWidth=c.measureText('ETB').width,left=cx-(amountWidth+currencyWidth+4)/2;
 c.textAlign='left';c.fillStyle='#38ffbc';c.font="18px 'Foxy Intro caps',Arial";c.fillText(value,left,y+69*scale);
 c.font="13.5px 'Foxy Intro caps',Arial";c.fillText('ETB',left+amountWidth+4,y+69*scale+1);c.restore();return true;
}
export function drawOfficialFoxyPaylines(c,art,{result,age=0,reducedMotion=false}) {
 const lines=result?.winLines||[];if(!lines.length)return;
 const selected=lines[Math.floor((reducedMotion?0:Math.max(0,age))/1000)%lines.length];
 const swing=p=>(1-Math.cos(Math.PI*Math.max(0,Math.min(1,p))))/2;
 const opacity=reducedMotion?1:age<200?swing(age/200):age<1500?1:1-swing((age-1500)/200);
 if(opacity<=0||!art)return selected;
 c.save();c.globalAlpha*=opacity;
 for(const line of lines){const number=foxyLineArt[line.rows.join(',')],key='Box/Line/'+number,sprite=art.sprites.get(key),meta=art.meta[key];
  if(!sprite||!meta)continue;const s=meta.spriteSourceSize,scale=.75;
  c.drawImage(sprite,(235+10-224+s.x)*scale,(207+35+s.y)*scale,sprite.width*scale,sprite.height*scale);
 }
 c.restore();return selected;
}
export function drawOfficialMultiMultiplier(c, art, value, x, y, size, active) {
 if (!art?.sprites.get('Multiplier/' + value)) return false;
 c.save(); if (!active) c.globalAlpha *= .52;
 const box = size * 1.95;
 sourceSprite(c, art, 'Multiplier/' + value, x - box / 2, y - box / 2, box);
 c.restore(); return true;
}
export function drawOfficialMultiWheel(c, art, {phase, strip, y, h}) {
 if (!art?.sprites.get('Multiplier/Background')) return false;
 const cy = y + h / 2, rowHeight = h / 3, selected = Math.floor(phase), fraction = phase - selected;
 const value = i => strip[(i % strip.length + strip.length) % strip.length];
 c.save(); c.beginPath(); c.rect(0, y - 22, 78, h + 26); c.clip();
 drawOfficialSprite(c, art, 'Multiplier/Background', 0, y - 13, 77, h + 17);
 for (let i = -2; i <= 2; i++) drawOfficialMultiMultiplier(c, art, value(selected + i), 39, cy + (i - fraction) * rowHeight, 39, false);
 const scale = 78 / 126, bx = 0, by = cy - 132 * scale / 2;
 sourceSprite(c, art, 'Multiplier/BottomActive', bx, by, 78);
 c.save(); c.beginPath(); c.rect(7, cy - rowHeight / 2 + 4, 64, rowHeight - 8); c.clip();
 for (let i = -1; i <= 1; i++) drawOfficialMultiMultiplier(c, art, value(selected + i), 39, cy + (i - fraction) * rowHeight, 39, true);
 c.restore(); sourceSprite(c, art, 'Multiplier/TopActive', bx, by, 78); c.restore(); return true;
}
// Draw a packed image at its original placement inside its source canvas.
function sourceSprite(c, art, key, x, y, size) {
 const sprite = art?.sprites.get(key), meta = art?.meta[key];
 if (!sprite || !meta) return false;
 const scale = size / meta.sourceSize.w, offset = meta.spriteSourceSize;
 c.drawImage(sprite, x + offset.x * scale, y + offset.y * scale, sprite.width * scale, sprite.height * scale);
 return true;
}
export const officialFoxyAngle = value => ({1:3, 2:5, 3:2, 4:4, 5:1}[value] || 3) * Math.PI / 7;
export function drawOfficialFoxyWheel(c, art, {angle,blur=false} = {}) {
 if (!art?.sprites.get('Multiplier/Wheel') || !art.sprites.get('Multiplier/Light')) return false;
 const cx = 210.88, cy = 286.48, size = 426.99, left = cx - size / 2, top = cy - size / 2;
 c.save(); c.beginPath(); c.rect(0, 56, 420, 112); c.clip();
 sourceSprite(c, art, 'Multiplier/Background', left, top, size);
 c.save(); c.translate(cx, cy); c.rotate(angle);
 sourceSprite(c, art, 'Multiplier/Wheel', -size / 2, -size / 2, size);
 sourceSprite(c, art, blur&&art.sprites.get('Multiplier/Blur')?'Multiplier/Blur':'Multiplier/Numbers', -size / 2, -size / 2, size); c.restore();
 sourceSprite(c, art, 'Multiplier/Box', left + 3 * size / 1164, top - 25 * size / 1164, size);
 // Only the selected wedge receives the orange original glyphs. The original
 // wheel has fourteen sectors; rotation ends at the validated multiplier.
 c.save(); c.beginPath(); c.moveTo(163, 79); c.lineTo(258, 79); c.lineTo(240, 163); c.lineTo(182, 163); c.closePath(); c.clip();
 c.translate(cx, cy); c.rotate(angle); sourceSprite(c, art, blur&&art.sprites.get('Multiplier/BlurLight')?'Multiplier/BlurLight':'Multiplier/Light', -size / 2, -size / 2, size); c.restore();
 sourceSprite(c, art, 'Multiplier/BorderBox', left + 3 * size / 1164, top - 25 * size / 1164, size); c.restore(); return true;
}
