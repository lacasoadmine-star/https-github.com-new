import { SpriteAtlas, validateFrame } from './atlas.mjs';

// Minimal reader for this current game's native Spine image atlas. No Spine
// runtime or provider program is copied; only original frame/timeline data.
export function parseLogoAtlas(text, image) {
  const atlas = new SpriteAtlas(); const lines = text.split(/\r?\n/);
  let name = null, fields = {};
  const finish = () => {
    if (!name || !fields.xy) return;
    const pair = key => fields[key].split(',').map(Number);
    const [x, y] = pair('xy'), [w, h] = pair('size'), [sw, sh] = pair('orig'), [ox, oy] = pair('offset');
    const entry = { frame: { x, y, w, h }, rotated: fields.rotate === 'true',
      sourceSize: { w: sw, h: sh }, spriteSourceSize: { x: ox, y: sh - h - oy, w, h }, image };
    validateFrame(name, entry, { w: image.width, h: image.height }); atlas.frames.set(name, entry);
  };
  for (const line of lines) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line) && !line.includes(':')) {
      finish(); name = line.trim().endsWith('.png') ? null : line.trim(); fields = {};
    } else if (/^\s/.test(line)) {
      const split = line.indexOf(':'); if (split > 0) fields[line.slice(0, split).trim()] = line.slice(split + 1).trim();
    }
  }
  finish(); return atlas;
}
export class NativeMultiHot10Logo {
  constructor(atlas, skeleton) {
    this.atlas = atlas; this.skeleton = skeleton;
    this.attachments = skeleton.skins[0].attachments;
    this.timeline = skeleton.animations.animation.slots['multi hot'];
    this.position = skeleton.animations.animation.bones['Multi Hot'].translate[0];
    this.durationMs = 2833.3;
  }
  static async load(baseURL) {
    const [text, skeleton] = await Promise.all([
      fetch(new URL('logo.atlas.txt', baseURL)).then(r => { if (!r.ok) throw new Error('Title atlas unavailable'); return r.text(); }),
      fetch(new URL('logo-skeleton.json', baseURL)).then(r => { if (!r.ok) throw new Error('Title data unavailable'); return r.json(); }),
    ]);
    const image = new Image(); image.src = new URL('logo.png', baseURL).href; await image.decode();
    return new NativeMultiHot10Logo(parseLogoAtlas(text, image), skeleton);
  }
  draw(context, timeMs, { x = 34, y = 88, scale = .56 } = {}) {
    const base = this.attachments['multi hot 10 logo']['multi hot 10 logo'];
    this.atlas.draw(context, 'multi hot 10 logo', x + (base.x - base.width / 2) * scale,
      y + (-base.y - base.height / 2) * scale, base.width * scale, base.height * scale);
    // Native attachment timings are used once for the title entrance. Full
    // provider title-loop behavior is not inferred from unused atlas frames.
    const time = Math.min(Math.max(timeMs, 0), this.durationMs) / 1000;
    let selected = this.timeline.attachment[0];
    for (const frame of this.timeline.attachment) { if ((frame.time || 0) > time) break; selected = frame; }
    const attachment = this.attachments['multi hot'][selected.name];
    const frame = this.atlas.frames.get(selected.name);
    if (!attachment || !frame || frame.frame.w === 1 || time >= 2.8333) return;
    const alpha = time <= 2.3333 ? 1 : Math.max(0, (2.8333 - time) / .5);
    context.save(); context.globalCompositeOperation = 'lighter';
    this.atlas.draw(context, selected.name,
      x + (this.position.x + (attachment.x || 0) - attachment.width / 2) * scale,
      y + (-this.position.y - (attachment.y || 0) - attachment.height / 2) * scale,
      attachment.width * scale, attachment.height * scale, alpha);
    context.restore();
  }
}
