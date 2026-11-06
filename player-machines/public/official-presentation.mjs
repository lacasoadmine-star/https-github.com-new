// Native presentation assets, isolated from the receipt/settlement model.
// Sprites are lossless unrotated crops of the public demo atlases; their source
// rectangles and hashes are recorded in evidence/r12/art-*.json.
const packs = new Map();
const symbolNames = {
 hot_foxy_20: ['fox', 'cherry', 'lemon', 'orange', 'watermelon', 'winged_bell', '777', 'big_star'],
 multi_hot_5_video: ['orange', 'cherry', 'plum', 'lemon', 'watermelon', 'grapes', 'golden_bell', 'dollar', '777']
};
const image = src => new Promise(resolve => {
 const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src;
});
export function loadOfficialArtwork(id) {
 if (!symbolNames[id] || typeof Image === 'undefined') return Promise.resolve(null);
 if (!packs.has(id)) packs.set(id, (id === 'hot_foxy_20' ? import('./official-foxy-art.mjs') : import('./official-mh5-art.mjs'))
  .then(async pack => ({id, meta: pack.spriteMeta,
   foreground: id==='hot_foxy_20'?await import('./official-foxy-foreground.mjs').then(async f=>({logo:await image(f.logo),forest:await image(f.forest)})).catch(()=>null):null,
   sprites: new Map(await Promise.all(Object.entries(pack.sprites).map(async ([name, src]) => [name, await image(src)]))),
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
export function drawOfficialFoxyWheel(c, art, {angle, winning = false, age = 0, reducedMotion = false} = {}) {
 if (!art?.sprites.get('Multiplier/Wheel') || !art.sprites.get('Multiplier/Light')) return false;
 const cx = 210.88, cy = 286.48, size = 426.99, left = cx - size / 2, top = cy - size / 2;
 c.save(); c.beginPath(); c.rect(0, 56, 420, 112); c.clip();
 sourceSprite(c, art, 'Multiplier/Background', left, top, size);
 c.save(); c.translate(cx, cy); c.rotate(angle);
 sourceSprite(c, art, 'Multiplier/Wheel', -size / 2, -size / 2, size);
 sourceSprite(c, art, 'Multiplier/Numbers', -size / 2, -size / 2, size); c.restore();
 sourceSprite(c, art, 'Multiplier/Box', left + 3 * size / 1164, top - 25 * size / 1164, size);
 // Only the selected wedge receives the orange original glyphs. The original
 // wheel has fourteen sectors; rotation ends at the validated multiplier.
 c.save(); c.beginPath(); c.moveTo(163, 79); c.lineTo(258, 79); c.lineTo(240, 163); c.lineTo(182, 163); c.closePath(); c.clip();
 c.translate(cx, cy); c.rotate(angle); sourceSprite(c, art, 'Multiplier/Light', -size / 2, -size / 2, size); c.restore();
 if (winning) { c.save(); c.globalAlpha = reducedMotion ? .8 : .55 + .4 * Math.sin(Math.max(0, age) / 175) ** 2; c.globalCompositeOperation = 'screen'; sourceSprite(c, art, 'Multiplier/BorderBox', left + 3 * size / 1164, top - 25 * size / 1164, size); c.restore(); }
 sourceSprite(c, art, 'Multiplier/BorderBox', left + 3 * size / 1164, top - 25 * size / 1164, size); c.restore(); return true;
}
