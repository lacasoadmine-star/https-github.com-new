// Repair only the exterior matte left by the existing Foxy sprite extraction.
// Bright metallic edges, enclosed shadows and purple spark/gem centers are retained.
const refined = new WeakSet();
const family = (symbol, r, g, b) => symbol === 'winged_bell'
 ? r < 108 && g < 56 && b < 96 && r > g * 1.6 && b < r * .98 && b > g * .75
 : r < 112 && g < 140 && b < 100 && g > r * .9 && b < g * .85;
function cleanExterior(canvas, symbol) {
 const c = canvas.getContext('2d', {willReadFrequently: true});
 const image = c.getImageData(0, 0, canvas.width, canvas.height), p = image.data;
 const w = canvas.width, h = canvas.height, count = w * h;
 const seen = new Uint8Array(count), queue = new Int32Array(count);
 let head = 0, tail = 0, removed = 0;
 const push = index => {
  if (index < 0 || index >= count || seen[index]) return;
  seen[index] = 1; const i = index * 4;
  if (p[i + 3] < 20 || family(symbol, p[i], p[i + 1], p[i + 2])) queue[tail++] = index;
 };
 for (let x = 0; x < w; x++) { push(x); push(count - w + x); }
 for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
 while (head < tail) {
  const index = queue[head++], i = index * 4, x = index % w;
  if (p[i + 3]) { p[i + 3] = 0; removed++; }
  if (x) push(index - 1); if (x + 1 < w) push(index + 1);
  push(index - w); push(index + w);
 }
 if (removed) c.putImageData(image, 0, 0);
 return removed;
}
export function refineFoxyAtlas(atlas) {
 if (!atlas || refined.has(atlas)) return {cleaned: 0, removedPixels: 0};
 let cleaned = 0, removedPixels = 0;
 for (const symbol of ['777', 'winged_bell', 'big_star']) {
  const canvas = atlas.get(symbol); if (!canvas?.getContext) continue;
  removedPixels += cleanExterior(canvas, symbol); cleaned++;
 }
 refined.add(atlas); return {cleaned, removedPixels};
}
