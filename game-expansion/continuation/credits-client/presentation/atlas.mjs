// Authored image-atlas interpretation. No provider JavaScript or financial logic.
const positive = value => Number.isFinite(value) && value > 0;
const nonnegative = value => Number.isFinite(value) && value >= 0;

export function normalizeFrame(name, source, texture) {
  const rect = source.frame, trim = source.spriteSourceSize || {x: 0, y: 0, w: rect?.w, h: rect?.h}, size = source.sourceSize || {w: rect?.w, h: rect?.h};
  if (!rect || ![rect.x, rect.y, trim.x, trim.y].every(nonnegative) || ![rect.w, rect.h, trim.w, trim.h, size.w, size.h].every(positive)) throw new Error('Invalid atlas frame: ' + name);
  const rotated = source.rotated === true || source.rotated === 90;
  const packedWidth = rotated ? rect.h : rect.w, packedHeight = rotated ? rect.w : rect.h;
  if (!texture || rect.x + packedWidth > texture.width || rect.y + packedHeight > texture.height) throw new Error('Atlas frame outside image: ' + name);
  if (trim.x + trim.w > size.w || trim.y + trim.h > size.h) throw new Error('Trim outside original frame: ' + name);
  return {name, file: texture.file, textureSha256: texture.sha256, x: rect.x, y: rect.y, width: rect.w, height: rect.h, packedWidth, packedHeight, rotated, unrotateDegrees:rotated?-90:0, trim: {x: trim.x, y: trim.y, width: trim.w, height: trim.h}, original: {width: size.w, height: size.h}};
}

export function normalizeTextureAtlas(data, texture) {
  if (!data || !data.frames || !data.meta?.size) throw new Error('Missing TexturePacker atlas metadata');
  const metadata = {...texture, width: data.meta.size.w, height: data.meta.size.h};
  const entries = Array.isArray(data.frames) ? data.frames.map(frame => [frame.filename, frame]) : Object.entries(data.frames);
  // Some provider atlases use an extruded3x3 transparent pixel for a1x1
  // placeholder. It is not artwork and must not invalidate the useful atlas.
  return Object.fromEntries(entries.filter(([,frame])=>!(frame.sourceSize?.w===1&&frame.sourceSize?.h===1)).map(([name, frame]) => [name, normalizeFrame(name, frame, metadata)]));
}

export function parseSpineAtlas(text) {
  const pages = [], regions = [];
  let page = null, region = null, newPage = true;
  const pair = value => value.split(',').map(Number);
  for (const line of String(text).replace(/\r/g, '').split('\n')) {
    if (!line.trim()) { newPage = true; region = null; continue; }
    const trimmed = line.trim(), property = trimmed.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (!property) {
      if (newPage || !page) { page = {name: trimmed}; pages.push(page); newPage = false; region = null; }
      else { region = {name: trimmed, page: page.name}; regions.push(region); }
      continue;
    }
    const [, key, value] = property;
    const target = /^\s/.test(line) && region ? region : page;
    if (!target) throw new Error('Spine atlas property without a page');
    target[key] = ['xy', 'size', 'orig', 'offset', 'bounds', 'offsets'].includes(key) ? pair(value) : value;
  }
  for (const item of pages) if (!item.size || item.size.length !== 2 || !item.size.every(positive)) throw new Error('Invalid Spine atlas page size');
  return {pages, regions};
}

export function normalizeSpineRegions(text, textures) {
  const parsed = parseSpineAtlas(text), output = {};
  for (const region of parsed.regions) {
    const page = parsed.pages.find(item => item.name === region.page), texture = textures[region.page];
    if (!texture) throw new Error('Missing locked Spine page: ' + region.page);
    const [x, y] = region.xy || region.bounds || [], [width, height] = region.size || region.bounds?.slice(2) || [];
    const [originalWidth, originalHeight] = region.orig || region.offsets?.slice(2) || [width, height];
    const [offsetX, offsetBottom] = region.offset || region.offsets || [0, 0];
    const normalized = normalizeFrame(region.name, {frame: {x, y, w: width, h: height}, rotated: region.rotate === 'true' || region.rotate === '90', spriteSourceSize: {x: offsetX, y: originalHeight - height - offsetBottom, w: width, h: height}, sourceSize: {w: originalWidth, h: originalHeight}}, {...texture, width: page.size[0], height: page.size[1]});
    // Spine's text atlas uses the opposite packed rotation to TexturePacker JSON.
    if(normalized.rotated)normalized.unrotateDegrees=90;
    output[region.name] = normalized;
  }
  return output;
}

export function framePlacement(frame, box, {padding = false, fit = 'contain'} = {}) {
  if (!frame || !box || ![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width <= 0 || box.height <= 0) throw new Error('Invalid drawing box');
  const logical = padding ? frame.original : {width: frame.width, height: frame.height};
  const scale = fit === 'stretch' ? null : (fit === 'cover' ? Math.max : Math.min)(box.width / logical.width, box.height / logical.height);
  const sx = scale ?? box.width / logical.width, sy = scale ?? box.height / logical.height;
  const originX = box.x + (box.width - logical.width * sx) / 2, originY = box.y + (box.height - logical.height * sy) / 2;
  return {x: originX + (padding ? frame.trim.x * sx : 0), y: originY + (padding ? frame.trim.y * sy : 0), width: frame.width * sx, height: frame.height * sy};
}

export function drawAtlasFrame(context, image, frame, box, options = {}) {
  const target = framePlacement(frame, box, options);
  context.save();
  if (options.opacity !== undefined) context.globalAlpha *= Math.max(0, Math.min(1, options.opacity));
  if (frame.rotated) {
    const clockwise=frame.unrotateDegrees===90;
    context.translate(target.x+(clockwise?target.width:0),target.y+(clockwise?0:target.height));context.rotate(clockwise?Math.PI/2:-Math.PI/2);
    context.drawImage(image, frame.x, frame.y, frame.packedWidth, frame.packedHeight, 0, 0, target.height, target.width);
  } else context.drawImage(image, frame.x, frame.y, frame.packedWidth, frame.packedHeight, target.x, target.y, target.width, target.height);
  context.restore();
  return target;
}

export function attachmentAt(timeline, seconds) {
  if (!Array.isArray(timeline) || !timeline.length) return null;
  let result = timeline[0].name ?? null;
  for (const key of timeline) { if ((key.time || 0) > seconds) break; result = key.name ?? null; }
  return result;
}
