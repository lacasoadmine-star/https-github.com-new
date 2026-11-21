/** Original per-game TexturePacker frames; no provider program logic. */
export function validateFrame(name, entry, imageSize) {
  const { frame: f, sourceSize: s, spriteSourceSize: t } = entry || {};
  if (!f || !s || !t || ![f.x, f.y, f.w, f.h, s.w, s.h, t.x, t.y, t.w, t.h]
    .every(Number.isInteger) || f.x < 0 || f.y < 0 || f.w < 1 || f.h < 1 ||
    s.w < 1 || s.h < 1 || t.x < 0 || t.y < 0 || t.x + t.w > s.w || t.y + t.h > s.h ||
    f.x + (entry.rotated ? f.h : f.w) > imageSize.w ||
    f.y + (entry.rotated ? f.w : f.h) > imageSize.h) {
    throw new Error('Invalid atlas bounds: ' + name);
  }
}

export class SpriteAtlas {
  constructor() { this.frames = new Map(); this.images = []; this.urls = new Map(); }
  static async load(baseURL, { fetchImpl = fetch, imageFactory = () => new Image() } = {}) {
    const atlas = new SpriteAtlas();
    await Promise.all([0, 1, 2, 3].map(async index => {
      const jsonURL = new URL(`Images-${index}.json`, baseURL);
      const response = await fetchImpl(jsonURL);
      if (!response.ok) throw new Error('Game artwork could not load.');
      const data = await response.json();
      const image = imageFactory();
      image.src = new URL(data.meta.image, jsonURL).href;
      await image.decode();
      if (image.naturalWidth !== data.meta.size.w || image.naturalHeight !== data.meta.size.h) {
        throw new Error('Game artwork dimensions do not match its manifest.');
      }
      atlas.images[index] = image;
      for (const [name, entry] of Object.entries(data.frames)) {
        validateFrame(name, entry, data.meta.size);
        if (atlas.frames.has(name)) throw new Error('Duplicate atlas frame: ' + name);
        atlas.frames.set(name, { ...entry, image });
      }
    }));
    return atlas;
  }
  has(name) { return this.frames.has(name); }
  size(name) {
    const frame = this.frames.get(name);
    if (!frame) throw new Error('Missing official frame: ' + name);
    return { ...frame.sourceSize };
  }
  draw(context, name, x, y, width, height, alpha = 1) {
    const entry = this.frames.get(name);
    if (!entry) throw new Error('Missing official frame: ' + name);
    const { frame: f, sourceSize: source, spriteSourceSize: trim, image } = entry;
    context.save();
    context.globalAlpha *= alpha;
    context.translate(x, y);
    context.scale(width / source.w, height / source.h);
    if (entry.rotated) {
      // Packed clockwise. Restore the unrotated source coordinate system,
      // including transparent trimming offsets, before any presentation scale.
      context.translate(trim.x, trim.y + trim.h);
      context.rotate(-Math.PI / 2);
      context.drawImage(image, f.x, f.y, f.h, f.w, 0, 0, trim.h, trim.w);
    } else {
      context.drawImage(image, f.x, f.y, f.w, f.h, trim.x, trim.y, trim.w, trim.h);
    }
    context.restore();
  }
  url(name) {
    if (this.urls.has(name)) return this.urls.get(name);
    const size = this.size(name);
    const canvas = document.createElement('canvas');
    canvas.width = size.w; canvas.height = size.h;
    this.draw(canvas.getContext('2d'), name, 0, 0, size.w, size.h);
    const url = canvas.toDataURL('image/png');
    this.urls.set(name, url);
    return url;
  }
}
