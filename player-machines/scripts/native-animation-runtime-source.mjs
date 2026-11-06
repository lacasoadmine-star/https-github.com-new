// Render native presentation assets only. This module has no game, wallet or bet API.
// The build script supplies the exact Pixi 6.5.5 / pixi-spine 3.0.4 libraries.
const { PIXI, spine: nativeSpine } = nativeLibraries;
// This renderer is an offscreen decoration surface. UI input/accessibility belongs to the host app.
// Remove plugins before renderer construction so they never install document/window listeners.
for (const plugin of [PIXI.InteractionManager, PIXI.AccessibilityManager]) PIXI.extensions.remove(plugin);
let sharedRenderer;
const loadedPages = new Map();
const nativeInstances = new WeakMap();
const batchStage = new PIXI.Container();
const batchGroups = [];
let nextInstanceId = 1, batchKey = null, batchFrame = null;
function renderer() {
  if (!sharedRenderer) sharedRenderer = PIXI.autoDetectRenderer({
    forceCanvas: true,
    width: 2, height: 2, resolution: 1, antialias: true,
    backgroundAlpha: 0, preserveDrawingBuffer: true, powerPreference: 'low-power',
  });
  return sharedRenderer;
}
function page(source) {
  if (!loadedPages.has(source)) loadedPages.set(source, new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(PIXI.BaseTexture.from(image, { scaleMode: PIXI.SCALE_MODES.LINEAR }));
    image.onerror = () => reject(new Error('Native animation texture failed to decode'));
    image.src = source;
  }));
  return loadedPages.get(source);
}
function rectangle(value) {
  return { x: value.x, y: value.y, width: value.width, height: value.height };
}
function visibleBounds(context) {
  const inverse = context.getTransform().inverse(), canvas = context.canvas;
  const points = [[0, 0], [canvas.width, 0], [0, canvas.height], [canvas.width, canvas.height]]
    .map(([x, y]) => ({ x: inverse.a * x + inverse.c * y + inverse.e, y: inverse.b * x + inverse.d * y + inverse.f }));
  return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
    top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
}

/** Native Spine 3.8 instance. Time is supplied by the caller, so no background ticker runs. */
export async function createNativeAnimation(bundle) {
  if (!bundle?.skeleton?.skeleton?.spine?.startsWith('3.8.')) throw new Error('Expected native Spine 3.8 data');
  const pages = Object.fromEntries(await Promise.all(Object.entries(bundle.pages).map(async ([name, source]) => [name, await page(source)])));
  const atlas = await new Promise((resolve, reject) => {
    new nativeSpine.TextureAtlas(bundle.atlas, (name, done) => {
      if (!pages[name]) { reject(new Error('Missing native atlas page: ' + name)); return; }
      done(pages[name]);
    }, resolve);
  });
  const data = new nativeSpine.SpineParser().createJsonParser().readSkeletonData(atlas, bundle.skeleton);
  const object = new nativeSpine.Spine(data);
  object.autoUpdate = false;
  const durations = Object.fromEntries(data.animations.map(a => [a.name, a.duration]));
  const references = new Map();
  const frames = new Map();
  const duplicates = [];
  let selected = null, entry = null, disposed = false;
  function seek(animation, seconds = 0, loop = true) {
    if (disposed) throw new Error('Native animation instance was destroyed');
    if (!(animation in durations)) throw new Error('Unknown native animation: ' + animation);
    object.position.set(0, 0); object.scale.set(1, 1);
    object.skeleton.setToSetupPose();
    if (selected !== animation || entry.loop !== loop) {
      object.state.clearTracks(); entry = object.state.setAnimation(0, animation, loop); selected = animation;
    }
    const duration = durations[animation];
    entry.trackTime = Math.max(0, loop && duration ? seconds % duration : Math.min(seconds, duration));
    object.update(0);
  }
  function bounds(animation, timeSeconds = 0) {
    seek(animation, timeSeconds, false);
    return rectangle(object.getLocalBounds());
  }
  const api = {
    animations: Object.keys(durations),
    duration: name => durations[name] ?? 0,
    bounds,
    /** Native origin positioning or stable reference-bounds fit. Returns false for an empty pose. */
    draw(context, options = {}) {
      const { animation = Object.keys(durations)[0], loop = true, reducedMotion = false,
        staticTime = 0, box, referenceBounds, maxDimension = 1200, framesPerSecond = 30 } = options;
      const time = reducedMotion ? staticTime : Math.floor((options.timeSeconds ?? 0) * framesPerSecond) / framesPerSecond;
      let reference = referenceBounds;
      if (box && !reference) {
        const key = animation + ':' + staticTime;
        if (!references.has(key)) references.set(key, bounds(animation, staticTime));
        reference = references.get(key);
      }
      seek(animation, time, loop);
      const local = rectangle(object.getLocalBounds());
      if (!(local.width > 0 && local.height > 0)) return false;
      let scale = options.scale ?? 1, x = options.x ?? 0, y = options.y ?? 0;
      if (box) {
        if (!(reference.width > 0 && reference.height > 0)) return false;
        scale = Math.min(box.width / reference.width, box.height / reference.height);
        x = box.x + (box.width - reference.width * scale) / 2 - reference.x * scale;
        y = box.y + (box.height - reference.height * scale) / 2 - reference.y * scale;
      }
      if (!(scale > 0 && Number.isFinite(scale))) return false;
      // Native authoring coordinates may span thousands of pixels. Only rasterize the visible crop.
      const viewport = visibleBounds(context);
      const left = Math.max(local.x, (viewport.left - x) / scale), top = Math.max(local.y, (viewport.top - y) / scale),
        right = Math.min(local.x + local.width, (viewport.right - x) / scale), bottom = Math.min(local.y + local.height, (viewport.bottom - y) / scale);
      if (!(right > left && bottom > top)) return false;
      const cropped = { x: left, y: top, width: right - left, height: bottom - top };
      const transform = context.getTransform();
      const outputRatio = Math.max(1, Math.hypot(transform.a, transform.b), Math.hypot(transform.c, transform.d));
      const surfaceScale = Math.min(scale * outputRatio, maxDimension / Math.max(cropped.width, cropped.height));
      const padding = 2, width = Math.max(1, Math.ceil(cropped.width * surfaceScale) + padding * 2),
        height = Math.max(1, Math.ceil(cropped.height * surfaceScale) + padding * 2);
      const cacheKey = [animation, time, loop, surfaceScale, cropped.x, cropped.y, width, height].join('|');
      let raster = frames.get(cacheKey);
      if (!raster) {
        batchKey = null;
        const target = renderer();
        if (target.width !== width || target.height !== height) target.resize(width, height);
        object.scale.set(surfaceScale, surfaceScale);
        object.position.set(padding - cropped.x * surfaceScale, padding - cropped.y * surfaceScale);
        target.render(object, { clear: true });
        // A symbol can appear in several cells. Rasterize each native pose once and reuse its pixels.
        raster = document.createElement('canvas'); raster.width = width; raster.height = height;
        raster.getContext('2d').drawImage(target.view, 0, 0);
        frames.set(cacheKey, raster);
        while (frames.size > 4) { const first = frames.keys().next().value; frames.get(first).width = 1; frames.delete(first); }
      }
      const ratio = scale / surfaceScale;
      context.drawImage(raster, x + cropped.x * scale - padding * ratio, y + cropped.y * scale - padding * ratio, width * ratio, height * ratio);
      return true;
    },
    destroy() {
      if (disposed) return;
      disposed = true; batchKey = null; object.destroy({ children: true, texture: false, baseTexture: false });
      for (const duplicate of duplicates) duplicate.object.destroy({ children: true, texture: false, baseTexture: false });
      for (const frame of frames.values()) frame.width = 1;
      frames.clear();
    },
  };
  nativeInstances.set(api, { id: nextInstanceId++, prepare(options, duplicateIndex) {
    if (disposed) return null;
    const animation = options.animation ?? Object.keys(durations)[0], loop = options.loop ?? true,
      staticTime = options.staticTime ?? 0, fps = options.framesPerSecond ?? 30,
      time = options.reducedMotion ? staticTime : Math.floor((options.timeSeconds ?? 0) * fps) / fps;
    if (!(animation in durations)) throw new Error('Unknown native animation: ' + animation);
    let reference = options.referenceBounds;
    if (options.box && !reference) {
      const key = animation + ':' + staticTime;
      if (!references.has(key)) references.set(key, bounds(animation, staticTime));
      reference = references.get(key);
    }
    let drawable = object;
    if (!duplicateIndex) seek(animation, time, loop);
    else {
      let duplicate = duplicates[duplicateIndex - 1];
      if (!duplicate) {
        drawable = new nativeSpine.Spine(data); drawable.autoUpdate = false;
        duplicate = duplicates[duplicateIndex - 1] = { object: drawable, animation: null, entry: null };
      } else drawable = duplicate.object;
      drawable.skeleton.setToSetupPose();
      if (duplicate.animation !== animation || duplicate.entry.loop !== loop) {
        drawable.state.clearTracks(); duplicate.entry = drawable.state.setAnimation(0, animation, loop); duplicate.animation = animation;
      }
      duplicate.entry.trackTime = Math.max(0, loop && durations[animation] ? time % durations[animation] : Math.min(time, durations[animation]));
      drawable.update(0);
    }
    let scale = options.scale ?? 1, x = options.x ?? 0, y = options.y ?? 0;
    if (options.box) {
      const box = options.box;
      if (!(reference?.width > 0 && reference?.height > 0)) return null;
      scale = Math.min(box.width / reference.width, box.height / reference.height);
      x = box.x + (box.width - reference.width * scale) / 2 - reference.x * scale;
      y = box.y + (box.height - reference.height * scale) / 2 - reference.y * scale;
    }
    const scaleX = options.scaleX ?? scale, scaleY = options.scaleY ?? scale;
    if (!(scaleX > 0 && scaleY > 0 && Number.isFinite(scaleX) && Number.isFinite(scaleY))) return null;
    drawable.position.set(x, y); drawable.scale.set(scaleX, scaleY);
    return drawable;
  }});
  return api;
}

/** Render all native foreground/symbol/win instances in a single framebuffer and Canvas blit. */
export function renderNativeBatch(context, commands, { maxDimension = 1200 } = {}) {
  if (!commands.length) return false;
  const transform = context.getTransform(), canvas = context.canvas;
  const key = JSON.stringify([canvas.width, canvas.height, transform.a, transform.b, transform.c, transform.d, transform.e, transform.f, maxDimension,
    commands.map(command => [nativeInstances.get(command.instance)?.id, command.animation,
      command.reducedMotion ? (command.staticTime ?? 0) : Math.floor((command.timeSeconds ?? 0) * (command.framesPerSecond ?? 30)) / (command.framesPerSecond ?? 30),
      command.loop, command.x, command.y, command.scale, command.scaleX, command.scaleY, command.box, command.referenceBounds, command.staticTime, command.clip, command.exclude, command.alpha])]);
  const paint = () => {
    context.save(); context.setTransform(1, 0, 0, 1, 0, 0);
    context.drawImage(batchFrame, 0, 0, canvas.width, canvas.height); context.restore();
  };
  if (key === batchKey && batchFrame) { paint(); return true; }
  const counts = new Map(), used = [];
  batchStage.removeChildren();
  const viewport = visibleBounds(context);
  for (const command of commands) {
    const instance = nativeInstances.get(command.instance);
    if (!instance) continue;
    const count = counts.get(command.instance) ?? 0;
    counts.set(command.instance, count + 1);
    const object = instance.prepare(command, count);
    if (!object) continue;
    const index = used.length;
    let group = batchGroups[index];
    if (!group) group = batchGroups[index] = { container: new PIXI.Container(), mask: new PIXI.Graphics() };
    group.container.removeChildren(); group.mask.clear(); object.mask = null;
    group.container.addChild(object);
    if (command.clip || command.exclude) {
      const rect = command.clip ?? { x: viewport.left, y: viewport.top, width: viewport.right - viewport.left, height: viewport.bottom - viewport.top };
      group.mask.beginFill(0xffffff).drawRect(rect.x, rect.y, rect.width, rect.height).endFill();
      if (command.exclude) {
        const hole = command.exclude;
        group.mask.beginHole().drawRect(hole.x, hole.y, hole.width, hole.height).endHole();
      }
      group.container.addChild(group.mask); object.mask = group.mask;
    }
    group.container.alpha = command.alpha ?? 1;
    batchStage.addChild(group.container); used.push(group);
  }
  if (!used.length) return false;
  const ratio = Math.min(1, maxDimension / Math.max(canvas.width, canvas.height)),
    width = Math.max(1, Math.ceil(canvas.width * ratio)), height = Math.max(1, Math.ceil(canvas.height * ratio)),
    target = renderer();
  batchStage.transform.setFromMatrix(new PIXI.Matrix(transform.a * ratio, transform.b * ratio, transform.c * ratio,
    transform.d * ratio, transform.e * ratio, transform.f * ratio));
  if (target.width !== width || target.height !== height) target.resize(width, height);
  target.render(batchStage, { clear: true });
  // The shared view is immutable until the next native render. Reuse it without a second GPU readback.
  batchFrame = target.view;
  batchKey = key; paint();
  return true;
}

export const nativeRuntimeInfo = Object.freeze({ pixi: '6.5.5', pixiSpine: '3.0.4', skeleton: '3.8', licenseNotice: 'native-animation-LICENSES.txt' });
