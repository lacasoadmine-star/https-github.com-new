import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdir, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {symbolFrame, symbolTransform, drawSymbolFrame, drawSymbolTransition} from './symbol-geometry.mjs';
import {patchHabesha, patchDeluxe, applySymbolGeometry} from './apply-symbol-geometry.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(await readFile(path.join(here, 'symbol-fixtures.json'), 'utf8'));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
function recorder() {
  const calls = [], stack = [];
  return {calls, globalAlpha: 1,
    drawImage(image, ...args) { calls.push({image, args, alpha: this.globalAlpha}); },
    save() { stack.push(this.globalAlpha); }, restore() { this.globalAlpha = stack.pop(); },
    setTransform() {}, beginPath() {}, rect() {}, clip() {}, stroke() {}, moveTo() {}, lineTo() {}
  };
}

test('all 18 native symbol frames preserve the stationary alpha footprint and anchor', () => {
  for (const game of Object.values(fixtures.games)) for (let i = 0; i < 9; i++) {
    const entry = game.sprites['Box/' + i], bounds = entry.visibleBounds || entry.spriteSourceSize;
    const frame = symbolFrame(entry);
    for (const [x, y, width, height] of [[0, 0, 96, 78.3333333333], [57.25, -11.5, 134, 129], [200, 300, 45, 45]]) {
      const output = symbolTransform(frame, x, y, width, height), scale = Math.min(width / bounds.w, height / bounds.h);
      close(output.x + bounds.x * scale, x + (width - bounds.w * scale) / 2);
      close(output.y + bounds.y * scale, y + (height - bounds.h * scale) / 2);
      close(output.width / entry.sourceSize.w, scale);
      close(output.height / entry.sourceSize.h, scale);
    }
  }
});

test('blur and sharp layers retain one source transform at every deceleration sample', () => {
  for (const game of Object.values(fixtures.games)) for (let i = 0; i < 9; i++) {
    const entry = game.sprites['Box/' + i], frame = symbolFrame(entry);
    const blur = {src: 'blur-' + i}, sharp = {src: 'sharp-' + i};
    const context = recorder(), expected = recorder();
    drawSymbolFrame(expected, sharp, frame, 96, 151, 96, 78.3333333333);
    for (const clarity of [0, 0.0001, 0.2, 0.5, 0.9999, 1]) {
      context.calls.length = 0;
      drawSymbolTransition(context, blur, sharp, frame, 96, 151, 96, 78.3333333333, clarity);
      for (const call of context.calls) assert.deepEqual(call.args, expected.calls[0].args);
      assert.equal(context.globalAlpha, 1);
    }
  }
});

test('identical Deluxe atlas entries draw once without fading at intermediate clarity', () => {
  const game = fixtures.games.deluxe;
  for (let i = 0; i < 9; i++) {
    const sharp = game.sprites['Box/' + i], blur = game.sprites['Box/Blur/' + i];
    assert.equal(blur.sha256, sharp.sha256);
    for (const clarity of [0, 0.5, 1]) {
      const context = recorder();context.globalAlpha = 0.8;
      drawSymbolTransition(context, {src: blur.path}, {src: sharp.path}, symbolFrame(sharp), 0, 0, 100, 100, clarity);
      assert.equal(context.calls.length, 1);
      assert.equal(context.calls[0].alpha, 0.8);
      assert.equal(context.globalAlpha, 0.8);
    }
  }
});

test('desktop full-source geometry and enclosing canvas alpha remain intact', () => {
  const context = recorder();context.globalAlpha = 0.65;
  drawSymbolTransition(context, {src: 'desktop-blur'}, {src: 'desktop-sharp'}, null, 612, 89, 500, 500, 0.25);
  assert.deepEqual(context.calls.map(call => call.args), [[612, 89, 500, 500], [612, 89, 500, 500]]);
  close(context.calls[0].alpha, 0.65 * 0.75);close(context.calls[1].alpha, 0.65 * 0.25);
  assert.equal(context.globalAlpha, 0.65);
});

test('invalid native bounds fail visibly instead of creating a distorted sprite', () => {
  for (const entry of [null, {}, {sourceSize: {w: 200, h: 200}, visibleBounds: {x: 0, y: 0, w: 0, h: 90}},
    {sourceSize: {w: 200, h: 200}, visibleBounds: {x: 150, y: 0, w: 94, h: 92}}]) {
    assert.throws(() => symbolFrame(entry), /INVALID_SYMBOL_SOURCE_GEOMETRY/);
  }
});

// The default test run materializes only the four retained renderer/layout
// inputs and this QA helper. It needs no previous workspace, media, session,
// network access, production controller, or environment variable.
async function makeBaselineStage() {
  const baseline = path.join(here, 'baselines');
  const provenance = JSON.parse(await readFile(path.join(baseline, 'provenance.json'), 'utf8'));
  const result = await mkdtemp(path.join(tmpdir(), 'freeplay-stage-'));
  try {
    for (const entry of provenance.files) {
      assert.match(entry.path, /^(habesha|deluxe)\/[a-z0-9-]+\.mjs$/);
      const bytes = await readFile(path.join(baseline, entry.path));
      assert.equal(bytes.length, entry.bytes, 'retained baseline byte length');
      assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, 'retained baseline SHA-256');
      const target = path.join(result, entry.path);
      await mkdir(path.dirname(target), {recursive: true});
      await writeFile(target, bytes);
    }
    await applySymbolGeometry(result);
    return result;
  } catch (error) {
    await rm(result, {recursive: true, force: true});
    throw error;
  }
}
const explicitStage = process.env.FREEPLAY_STAGE;
const stage = explicitStage || await makeBaselineStage();
after(async () => { if (!explicitStage) await rm(stage, {recursive: true, force: true}); });
async function loadRenderer(game, name) {
  const filename = path.join(stage, game, name), source = await readFile(filename, 'utf8');
  const context = vm.createContext({URL}), modules = new Map();
  const make = (code, id) => new vm.SourceTextModule(code, {context, identifier: id,
    initializeImportMeta(meta) { meta.url = pathToFileURL(id).href; }});
  const root = make(source, filename);
  const importedNames = new Map([...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)]
    .map(match => [match[2], match[1].split(',').map(value => value.trim())]));
  await root.link(async specifier => {
    if (modules.has(specifier)) return modules.get(specifier);
    let module;
    if (specifier === './qa-symbol-geometry.mjs' || specifier.endsWith('-layout.mjs')) {
      const file = path.join(stage, game, specifier);
      module = make(await readFile(file, 'utf8'), file);
    } else {
      const names = importedNames.get(specifier) || [];
      module = new vm.SyntheticModule(names, function() {
        for (const key of names) this.setExport(key, () => { throw Error('UNEXPECTED_TEST_DEPENDENCY:' + key); });
      }, {context});
    }
    modules.set(specifier, module);
    return module;
  });
  await root.evaluate();
  return {root, modules, source};
}

test('actual copied Deluxe renderer uses identical geometry during movement and after landing', async () => {
  const {root, source} = await loadRenderer('deluxe', 'mh5deluxe-renderer.mjs');
  assert.equal(patchDeluxe(source), source, 'reapplying QA patch must be idempotent');
  const renderer = Object.create(root.namespace.MultiHot5DeluxeRenderer.prototype);
  renderer.atlas = new Map();renderer.sprites = new Map();renderer.desktopSprites = new Map();renderer.symbolFrames = new Map();
  for (let i = 0; i < 9; i++) {
    const symbol = 'symbol_' + i, sharp = fixtures.games.deluxe.sprites['Box/' + i], blur = fixtures.games.deluxe.sprites['Box/Blur/' + i];
    renderer.atlas.set(symbol, {src: sharp.path});renderer.sprites.set('Box/' + i, {src: sharp.path});renderer.sprites.set('Box/Blur/' + i, {src: blur.path});
    renderer.symbolFrames.set(symbol, symbolFrame(sharp));
    const box = {x: 100, y: 150, width: 100, height: 80}, still = recorder();
    renderer.drawSymbol(still, symbol, box.x, box.y, box.width, box.height);
    for (const clarity of [0, 0.15, 0.5, 0.9999, 1]) {
      const moving = recorder();renderer.drawMovingSymbol(moving, symbol, box, false, clarity);
      assert.equal(moving.calls.length, 1);
      assert.deepEqual(moving.calls[0].args, still.calls[0].args);
      assert.equal(moving.calls[0].alpha, 1);
    }
  }
});

test('actual copied Habesha draw loop keeps symbol footprints stable when motion begins', async () => {
  const {root, modules, source} = await loadRenderer('habesha', 'habesha-renderer.mjs');
  assert.equal(patchHabesha(source), source);
  const layoutModule = modules.get('./habesha-layout.mjs').namespace;
  const renderer = Object.create(root.namespace.HabeshaRenderer.prototype), symbols = Array.from({length: 9}, (_, i) => 'symbol_' + i);
  renderer.layout = layoutModule.HABESHA_PORTRAIT;renderer.ctx = recorder();renderer.canvas = {width: 420, height: 900};
  renderer.background = {kind: 'background'};renderer.logo = {draw() {}};renderer.atlas = new Map();renderer.sprites = new Map();renderer.symbolFrames = new Map();
  renderer.game = {strips: [symbols, symbols, symbols]};renderer.grid = [[symbols[8], symbols[8], symbols[8]], [symbols[0], symbols[0], symbols[0]], [symbols[1], symbols[1], symbols[1]]];
  renderer.motion = {active: false, position() { return {p: 1, landed: true}; }};
  renderer.symbolAnimations = new Map();renderer.reducedMotion = false;renderer.presentedAt = 0;renderer.wheelTrack = layoutModule.multiplierTrack([3, 5, 1]);
  for (let i = 0; i < 9; i++) {
    const entry = fixtures.games.habesha.sprites['Box/' + i], artwork = {kind: 'symbol', index: i};
    renderer.atlas.set('symbol_' + i, artwork);renderer.sprites.set('Box/' + i, artwork);
    renderer.sprites.set('Box/Blur/' + i, {kind: 'blur', index: i});renderer.symbolFrames.set('symbol_' + i, symbolFrame(entry));
  }
  for (const name of ['Vertical/Box/Background', 'Multiplier/BackgroundBorder', 'Multiplier/Background', ...Array.from({length: 5}, (_, i) => 'Multiplier/' + (i + 1)), ...Array.from({length: 5}, (_, i) => 'Multiplier/Active-' + (i + 1))]) renderer.sprites.set(name, {kind: 'cabinet'});
  renderer.pendingSpin = null;renderer.draw(0);
  const still = renderer.ctx.calls.filter(call => call.image?.kind === 'symbol');
  assert.equal(still.length, 9);
  renderer.ctx.calls.length = 0;renderer.pendingSpin = {stops: [0, 0, 0], elapsed: 0};renderer.draw(0);
  const moving = renderer.ctx.calls.filter(call => call.image?.kind === 'blur');
  assert.equal(moving.length, 15);
  for (const call of still) {
    const corresponding = moving.find(other => other.image.index === call.image.index && Math.abs(other.args[0] - call.args[0]) < 1e-9 && Math.abs(other.args[1] - call.args[1]) < 1e-9);
    assert.ok(corresponding, 'stationary artwork must remain at the same source-space anchor on first motion frame');
    assert.deepEqual(corresponding.args, call.args);
  }
});
