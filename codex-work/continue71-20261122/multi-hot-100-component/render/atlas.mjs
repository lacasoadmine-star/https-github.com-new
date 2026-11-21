/** Own M100 TexturePacker decoding. Provider program logic is never executed. */
import {createM100SpineRegions,createM100Logo} from './spine-assets.mjs';
export const M100_SYMBOL_FRAMES = Object.freeze({
  seven: 'Box/0', bell: 'Box/1', grapes: 'Box/2', watermelon: 'Box/3',
  cherry: 'Box/4', orange: 'Box/5', plum: 'Box/6', lemon: 'Box/7',
});
export const M100_ATLAS_COUNT = 8;

export function validateNativeFrame(frame, texture) {
  if (!frame || !frame.frame || !frame.sourceSize || !frame.spriteSourceSize) throw new TypeError('M100_ATLAS_METADATA');
  const { frame: r, sourceSize: size, spriteSourceSize: trim } = frame;
  for (const n of [r.x,r.y,r.w,r.h,size.w,size.h,trim.x,trim.y,trim.w,trim.h]) {
    if (!Number.isSafeInteger(n) || n < 0) throw new TypeError('M100_ATLAS_INTEGER');
  }
  const cropWidth = frame.rotated ? r.h : r.w;
  const cropHeight = frame.rotated ? r.w : r.h;
  if (!r.w || !r.h || !size.w || !size.h || r.w !== trim.w || r.h !== trim.h ||
      trim.x + trim.w > size.w || trim.y + trim.h > size.h ||
      r.x + cropWidth > texture.width || r.y + cropHeight > texture.height) throw new RangeError('M100_ATLAS_BOUNDS');
  return Object.freeze({ cropWidth, cropHeight, width: size.w, height: size.h });
}

export function decodeNativeFrame(frame, texture, canvasFactory) {
  const bounds = validateNativeFrame(frame, texture);
  const canvas = canvasFactory(bounds.width, bounds.height);
  const ctx = canvas.getContext('2d');
  const r = frame.frame, trim = frame.spriteSourceSize;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (frame.rotated) {
    // TexturePacker stored the trimmed rectangle clockwise. Restore it counterclockwise.
    ctx.translate(trim.x, trim.y + r.h);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(texture, r.x, r.y, bounds.cropWidth, bounds.cropHeight, 0, 0, bounds.cropWidth, bounds.cropHeight);
  } else {
    ctx.drawImage(texture, r.x, r.y, r.w, r.h, trim.x, trim.y, r.w, r.h);
  }
  ctx.restore();
  return canvas;
}

export function createNativeFrames({ metadata, textures, canvasFactory }) {
  const entries = new Map();
  for (let i = 0; i < M100_ATLAS_COUNT; i++) {
    if (!metadata[i]?.frames || !textures[i]) throw new Error('M100_ATLAS_MISSING');
    for (const [name, frame] of Object.entries(metadata[i].frames)) {
      if (entries.has(name)) throw new Error('M100_DUPLICATE_FRAME');
      validateNativeFrame(frame, textures[i]);
      entries.set(name, { frame, texture: textures[i] });
    }
  }
  const cache = new Map();
  return Object.freeze({
    names: Object.freeze([...entries.keys()]),
    metadata(name) { return entries.has(name) ? structuredClone(entries.get(name).frame) : null; },
    get(name) {
      const entry = entries.get(name);
      if (!entry) throw new Error(`M100_FRAME_NOT_FOUND: ${name}`);
      if (entry.frame.sourceSize.w <= 1 || entry.frame.sourceSize.h <= 1) throw new Error(`M100_PLACEHOLDER_FRAME: ${name}`);
      if (!cache.has(name)) cache.set(name, decodeNativeFrame(entry.frame, entry.texture, canvasFactory));
      return cache.get(name);
    },
  });
}

export async function loadBrowserNativeAssets({ baseURL = new URL('../', import.meta.url), fetcher = fetch, imageFactory, canvasFactory } = {}) {
  imageFactory ??= url => new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('M100_IMAGE_LOAD'));
    image.src = url;
  });
  canvasFactory ??= (width, height) => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; };
  const json = async path => { const r = await fetcher(new URL(path, baseURL), { credentials: 'omit' }); if (!r.ok) throw new Error('M100_METADATA_LOAD'); return r.json(); };
  const pairs = await Promise.all(Array.from({length: 8}, (_, i) => Promise.all([
    json(`assets/native/Sprites/Images-${i}.json`), imageFactory(new URL(`assets/native/Sprites/Images-${i}.png`, baseURL).href),
  ])));
  const logoRoot='assets/native/Spine/Logo/';
  const [logoSkeleton,logoAtlasResponse,logoPage]=await Promise.all([json(`${logoRoot}multi-hot-100-logo.json`),fetcher(new URL(`${logoRoot}multi-hot-100-logo.atlas.txt`,baseURL),{credentials:'omit'}),imageFactory(new URL(`${logoRoot}multi-hot-100-logo.png`,baseURL).href)]);
  if(!logoAtlasResponse.ok)throw new Error('M100_LOGO_ATLAS_LOAD');
  const logoRegions=createM100SpineRegions({atlasText:await logoAtlasResponse.text(),pages:{'multi hot 100 logo.png':logoPage},canvasFactory});
  return Object.freeze({
    frames: createNativeFrames({ metadata: pairs.map(x => x[0]), textures: pairs.map(x => x[1]), canvasFactory }),
    background: await imageFactory(new URL('assets/native/background.png', baseURL).href),
    logo:createM100Logo({skeleton:logoSkeleton,regions:logoRegions,canvasFactory}),
    canvasFactory,
  });
}
