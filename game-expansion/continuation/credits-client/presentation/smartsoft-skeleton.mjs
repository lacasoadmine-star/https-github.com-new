import { drawAtlasFrame } from './atlas.mjs';

// Independently authored Canvas playback of the supplied Spine 3.8 DATA.
// No provider JavaScript or third-party animation runtime is executed.
// Format reference: https://esotericsoftware.com/spine-json-format/
// New20-only fork: normal and noRotationOrReflection bone inheritance.
// The existing live MultiHot40 interpreter is deliberately unchanged.
// Format semantics: Spine3.8 Bone.ts updateWorldTransformWith.
// Scope: region/mesh/clipping attachments, slot and
// bone timelines, sparse mesh deformation, draw order, and four blend modes.
const RAD = Math.PI / 180;
const clamp = n => Math.max(0, Math.min(1, n));
const id = () => ({ a: 1, b: 0, c: 0, d: 1, x: 0, y: 0 });
const point = (m, x, y) => [m.a * x + m.b * y + m.x, m.c * x + m.d * y + m.y];
const blend = { normal: 'source-over', additive: 'lighter', multiply: 'multiply', screen: 'screen' };

function localMatrix(value) {
  const ax = ((value.rotation ?? 0) + (value.shearX ?? 0)) * RAD;
  const ay = ((value.rotation ?? 0) + 90 + (value.shearY ?? 0)) * RAD;
  return { a: Math.cos(ax) * (value.scaleX ?? 1), b: Math.cos(ay) * (value.scaleY ?? 1), c: Math.sin(ax) * (value.scaleX ?? 1), d: Math.sin(ay) * (value.scaleY ?? 1), x: value.x ?? 0, y: value.y ?? 0 };
}
function compose(p, m) {
  return { a: p.a * m.a + p.b * m.c, b: p.a * m.b + p.b * m.d, c: p.c * m.a + p.d * m.c, d: p.c * m.b + p.d * m.d, x: p.a * m.x + p.b * m.y + p.x, y: p.c * m.x + p.d * m.y + p.y };
}
// Strip the inherited rotation and reflection while retaining the parent's
// principal scale. Translation still follows the original parent transform.
export function composeUnrotated(parent,local) {
  let a=parent.a,c=parent.c;const lengthSquared=a*a+c*c;
  let b,d,angle;
  if(lengthSquared>.0001){const perpendicularScale=Math.abs(a*parent.d-parent.b*c)/lengthSquared;b=-c*perpendicularScale;d=a*perpendicularScale;angle=Math.atan2(c,a);}
  else{a=0;c=0;b=-parent.b;d=parent.d;angle=Math.PI/2-Math.atan2(parent.d,parent.b);}
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const adjusted={a:cos*local.a+sin*local.c,b:cos*local.b+sin*local.d,c:-sin*local.a+cos*local.c,d:-sin*local.b+cos*local.d,x:0,y:0};
  const basis=compose({a,b,c,d,x:0,y:0},adjusted);
  return {...basis,x:parent.a*local.x+parent.b*local.y+parent.x,y:parent.c*local.x+parent.d*local.y+parent.y};
}
function rgba(text = 'ffffffff') {
  const s = String(text).padEnd(8, 'f');
  return [0, 2, 4, 6].map(index => parseInt(s.slice(index, index + 2), 16) / 255);
}
const cubic = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
function curve(key, progress) {
  if (key.curve === 'stepped') return 0;
  if (key.curve === undefined) return progress;
  const values = Array.isArray(key.curve) ? key.curve : [key.curve, key.c2 ?? 0, key.c3 ?? 1, key.c4 ?? 1];
  if (values.length !== 4 || values.some(value => !Number.isFinite(value))) return progress;
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i++) {
    const middle = (lo + hi) / 2;
    if (cubic(middle, values[0], values[2]) < progress) lo = middle; else hi = middle;
  }
  return cubic((lo + hi) / 2, values[1], values[3]);
}
function keysAt(keys, time) {
  if (!Array.isArray(keys) || !keys.length || time < (keys[0].time ?? 0)) return null;
  let lo = 0, hi = keys.length - 1;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if ((keys[mid].time ?? 0) <= time) lo = mid; else hi = mid - 1; }
  const first = keys[lo], second = keys[lo + 1];
  const progress = second ? curve(first, clamp((time - (first.time ?? 0)) / (second.time - (first.time ?? 0)))) : 0;
  return { first, second, progress };
}
function sampleNumber(keys, time, field, fallback = 0, rotation = false) {
  const sample = keysAt(keys, time); if (!sample) return fallback;
  const first = sample.first[field] ?? fallback;
  if (!sample.second) return first;
  let difference = (sample.second[field] ?? fallback) - first;
  if (rotation) difference = ((difference + 180) % 360 + 360) % 360 - 180;
  return first + difference * sample.progress;
}
function sampleColor(keys, time, fallback) {
  const sample = keysAt(keys, time); if (!sample) return fallback;
  const first = rgba(sample.first.color), second = sample.second ? rgba(sample.second.color) : first;
  return first.map((value, index) => value + (second[index] - value) * sample.progress);
}
function lastValue(keys, time, fallback) { const sample = keysAt(keys, time); return sample ? sample.first.name ?? null : fallback; }
function duration(value) {
  if (!value || typeof value !== 'object') return 0;
  return Math.max(Number.isFinite(value.time) ? value.time : 0, ...Object.values(value).map(child => typeof child === 'object' ? duration(child) : 0));
}
function sparseValue(key, index) { const relative = index - (key?.offset ?? 0); return relative >= 0 ? key?.vertices?.[relative] ?? 0 : 0; }
function deformation(keys, time, count) {
  const sample = keysAt(keys, time); if (!sample) return null;
  const values = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const from = sparseValue(sample.first, i), to = sample.second ? sparseValue(sample.second, i) : from;
    values[i] = from + (to - from) * sample.progress;
  }
  return values;
}
function vertexData(attachment, bone, worlds, deform) {
  const source = attachment.vertices, count = attachment.uvs?.length ?? (attachment.vertexCount ?? 0) * 2;
  if (!Array.isArray(source)) return [];
  const output = [];
  if (source.length === count) {
    for (let i = 0; i < source.length; i += 2) output.push(...point(bone, source[i] + (deform?.[i] ?? 0), source[i + 1] + (deform?.[i + 1] ?? 0)));
  } else {
    let at = 0, deltaAt = 0;
    while (at < source.length && output.length < count) {
      const influences = source[at++]; let x = 0, y = 0;
      for (let j = 0; j < influences; j++) {
        const matrix = worlds[source[at++]], localX = source[at++] + (deform?.[deltaAt++] ?? 0), localY = source[at++] + (deform?.[deltaAt++] ?? 0), weight = source[at++];
        if (!matrix) throw new TypeError('Invalid weighted presentation vertex');
        const p = point(matrix, localX, localY); x += p[0] * weight; y += p[1] * weight;
      }
      output.push(x, y);
    }
  }
  return output;
}
function deformLength(attachment) {
  if (!attachment.uvs || attachment.vertices.length === attachment.uvs.length) return attachment.vertices.length;
  let at = 0, count = 0;
  while (at < attachment.vertices.length) { const n = attachment.vertices[at]; at += 1 + n * 4; count += n * 2; }
  return count;
}
function drawOrder(slots, timeline, time, indexOf) {
  const sample = keysAt(timeline, time); if (!sample?.first.offsets?.length) return slots.map((_, index) => index);
  const result = Array(slots.length).fill(-1), remaining = []; let cursor = 0;
  for (const change of sample.first.offsets) {
    const index = indexOf.get(change.slot);
    if (!Number.isInteger(index) || index < cursor) throw new TypeError('Invalid presentation draw order');
    while (cursor < index) remaining.push(cursor++);
    const destination = cursor + change.offset;
    if (destination < 0 || destination >= result.length || result[destination] !== -1) throw new TypeError('Invalid presentation draw order offset');
    result[destination] = cursor++;
  }
  while (cursor < slots.length) remaining.push(cursor++);
  for (let i = result.length - 1; i >= 0; i--) if (result[i] === -1) result[i] = remaining.pop();
  return result;
}

export class SmartSoftSkeleton {
  constructor(data, regions, images) {
    if (!/^3\.8\./.test(data?.skeleton?.spine ?? '') || !Array.isArray(data.bones) || !Array.isArray(data.slots)) throw new TypeError('Expected supplied Spine 3.8 artwork');
    if (['ik', 'transform', 'path', 'physics'].some(name => data[name]?.length)) throw new TypeError('Unsupported presentation constraint');
    if (data.bones.some(bone => bone.transform && !['normal','noRotationOrReflection'].includes(bone.transform))) throw new TypeError('Unsupported presentation bone inheritance');
    this.data = data; this.regions = regions; this.images = images; this.rasters = new Map();
    this.boneIndices = new Map(data.bones.map((bone, index) => [bone.name, index]));
    this.slotIndices = new Map(data.slots.map((slot, index) => [slot.name, index]));
    this.skin = data.skins?.find(skin => skin.name === 'default')?.attachments;
    if (!this.skin) throw new TypeError('Missing presentation skin');
    this.durations = Object.fromEntries(Object.entries(data.animations ?? {}).map(([name, value]) => [name, duration(value)]));
  }
  sample(name, seconds, { loop = false } = {}) {
    const animation = this.data.animations?.[name] ?? {}, length = this.durations[name] ?? 0;
    const time = loop && length ? Math.max(0, seconds) % length : Math.min(Math.max(0, seconds), length || Infinity);
    const worlds = [];
    for (const bone of this.data.bones) {
      const timelines = animation.bones?.[bone.name] ?? {};
      const local = localMatrix({
        x: (bone.x ?? 0) + sampleNumber(timelines.translate, time, 'x'), y: (bone.y ?? 0) + sampleNumber(timelines.translate, time, 'y'),
        rotation: (bone.rotation ?? 0) + sampleNumber(timelines.rotate, time, 'angle', 0, true),
        scaleX: (bone.scaleX ?? 1) * sampleNumber(timelines.scale, time, 'x', 1), scaleY: (bone.scaleY ?? 1) * sampleNumber(timelines.scale, time, 'y', 1),
        shearX: (bone.shearX ?? 0) + sampleNumber(timelines.shear, time, 'x'), shearY: (bone.shearY ?? 0) + sampleNumber(timelines.shear, time, 'y'),
      });
      const parent = bone.parent ? worlds[this.boneIndices.get(bone.parent)] : id();
      if (!parent) throw new TypeError('Missing ordered presentation parent bone');
      worlds.push(bone.transform==='noRotationOrReflection'?composeUnrotated(parent,local):compose(parent,local));
    }
    const order = drawOrder(this.data.slots, animation.drawOrder ?? animation.draworder, time, this.slotIndices);
    const layers = order.map(index => {
      const slot = this.data.slots[index], timeline = animation.slots?.[slot.name] ?? {};
      const attachmentName = lastValue(timeline.attachment, time, slot.attachment ?? null);
      const attachment = this.skin[slot.name]?.[attachmentName];
      const marker = { slot: slot.name, kind: 'empty' };
      if (!attachment) return marker;
      const tint = sampleColor(timeline.color, time, rgba(slot.color));
      const attachmentTint = rgba(attachment.color);
      for (let i = 0; i < 4; i++) tint[i] *= attachmentTint[i];
      const bone = worlds[this.boneIndices.get(slot.bone)], kind = attachment.type ?? 'region';
      if (!bone) throw new TypeError('Missing presentation slot bone');
      if (kind === 'clipping') return { ...marker, kind, vertices: vertexData(attachment, bone, worlds), end: attachment.end };
      if (tint[3] <= .001) return marker;
      const name = attachment.path ?? attachment.name ?? attachmentName, frame = this.regions[name];
      if (!frame) return marker;
      if (kind === 'region') return { slot: slot.name, kind, name, frame, matrix: compose(bone, localMatrix(attachment)), width: attachment.width, height: attachment.height, tint, blend: slot.blend ?? 'normal' };
      if (kind === 'mesh') {
        const keys = animation.deform?.default?.[slot.name]?.[attachmentName];
        const offsets = keys ? deformation(keys, time, deformLength(attachment)) : null;
        return { slot: slot.name, kind, name, frame, vertices: vertexData(attachment, bone, worlds, offsets), uvs: attachment.uvs, triangles: attachment.triangles, tint, blend: slot.blend ?? 'normal' };
      }
      return marker;
    });
    return { name, time, length, layers, worlds, bones: this.boneIndices };
  }
  bounds(pose) {
    const points = [];
    for (const layer of pose.layers) {
      if (layer.kind === 'mesh') points.push(...layer.vertices);
      if (layer.kind === 'region') for (const [x, y] of [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) points.push(...point(layer.matrix, x * layer.width, y * layer.height));
    }
    if (!points.length) return null;
    const xs = points.filter((_, index) => index % 2 === 0), ys = points.filter((_, index) => index % 2 === 1);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }
  raster(frame, tint) {
    const rgb = tint.slice(0, 3).map(value => Math.round(clamp(value) * 31) * 255 / 31);
    const tintKey = rgb.map(Math.round).join(','), key = frame.name + '|' + tintKey;
    if (this.rasters.has(key)) return this.rasters.get(key);
    const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(frame.original.width, frame.original.height) : Object.assign(document.createElement('canvas'), { width: frame.original.width, height: frame.original.height });
    const context = canvas.getContext('2d');
    drawAtlasFrame(context, this.images.get(frame.file), frame, { x: 0, y: 0, width: canvas.width, height: canvas.height }, { padding: true, fit: 'stretch' });
    if (rgb.some(value => value < 254)) {
      context.globalCompositeOperation = 'multiply'; context.fillStyle = `rgb(${tintKey})`; context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'destination-in';
      drawAtlasFrame(context, this.images.get(frame.file), frame, { x: 0, y: 0, width: canvas.width, height: canvas.height }, { padding: true, fit: 'stretch' });
      context.globalCompositeOperation = 'source-over';
    }
    if (this.rasters.size >= 128) this.rasters.delete(this.rasters.keys().next().value);
    this.rasters.set(key, canvas); return canvas;
  }
  draw(context, pose, { x = 0, y = 0, scale = 1, opacity = 1 } = {}) {
    context.save(); context.translate(x, y); context.scale(scale, -scale); context.globalAlpha *= opacity;
    let clipping = null;
    for (const layer of pose.layers) {
      if (layer.kind === 'clipping' && layer.vertices.length >= 6) {
        if (clipping) context.restore();
        context.save(); context.beginPath();
        for (let i = 0; i < layer.vertices.length; i += 2) i ? context.lineTo(layer.vertices[i], layer.vertices[i + 1]) : context.moveTo(layer.vertices[i], layer.vertices[i + 1]);
        context.closePath(); context.clip(); clipping = layer.end || '__end__';
      } else if (layer.kind === 'region' || layer.kind === 'mesh') {
        context.save(); context.globalAlpha *= layer.tint[3]; context.globalCompositeOperation = blend[layer.blend] ?? 'source-over';
        const image = this.raster(layer.frame, layer.tint);
        if (layer.kind === 'region') {
          const m = layer.matrix; context.transform(m.a, m.c, m.b, m.d, m.x, m.y); context.scale(1, -1);
          context.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
        } else {
          for (let i = 0; i < layer.triangles.length; i += 3) {
            const indices = layer.triangles.slice(i, i + 3);
            const source = indices.map(index => [layer.uvs[index * 2] * image.width, layer.uvs[index * 2 + 1] * image.height]);
            const target = indices.map(index => [layer.vertices[index * 2], layer.vertices[index * 2 + 1]]);
            const [[u0, v0], [u1, v1], [u2, v2]] = source, [[x0, y0], [x1, y1], [x2, y2]] = target;
            const determinant = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
            if (Math.abs(determinant) < 1e-8) continue;
            const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / determinant;
            const b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / determinant;
            const c = ((u1 - u0) * (x2 - x0) - (u2 - u0) * (x1 - x0)) / determinant;
            const d = ((u1 - u0) * (y2 - y0) - (u2 - u0) * (y1 - y0)) / determinant;
            context.save(); context.beginPath(); context.moveTo(x0, y0); context.lineTo(x1, y1); context.lineTo(x2, y2); context.closePath(); context.clip();
            context.transform(a, b, c, d, x0 - a * u0 - c * v0, y0 - b * u0 - d * v0); context.drawImage(image, 0, 0); context.restore();
          }
        }
        context.restore();
      }
      if (clipping === layer.slot) { context.restore(); clipping = null; }
    }
    if (clipping) context.restore();
    context.restore();
  }
  dispose() { this.rasters.clear(); }
}
