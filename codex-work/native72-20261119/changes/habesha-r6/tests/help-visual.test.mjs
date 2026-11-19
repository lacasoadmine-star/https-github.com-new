import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const original = fs.readFileSync(new URL('../../habesha-r5/assets/official-help.css', import.meta.url), 'utf8');
const candidate = fs.readFileSync(new URL('../assets/official-help.css', import.meta.url), 'utf8');
const measurements = JSON.parse(fs.readFileSync(new URL('../help-reference-measurements.json', import.meta.url)));
const marker = '/* Habesha uses its own symbol grouping and the observed wide menu panel. */';
const scope = 'body[data-machine="habesha_fortune_5_native"] #settings.official-help-menu';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function declarations(selector) {
  // Read this CSS-only patch's exact selector; this is not a browser cascade.
  const clean = candidate.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return Object.assign({}, ...rules.filter(([, selectors]) => selectors.trim().split(/,(?=body\[)/).includes(selector)).map(([, , body]) => Object.fromEntries(body.split(';').filter(Boolean).map(declaration => {const index = declaration.indexOf(':'); return [declaration.slice(0, index).trim(), declaration.slice(index + 1).trim()];}))));
}
const within = (value, expected, tolerance, message) => assert.ok(Math.abs(value - expected) <= tolerance, `${message}: ${value} versus ${expected} ±${tolerance}`);

test('visual patch changes only Habesha selectors and preserves accessible tab ownership', () => {
  assert.equal(candidate.split(marker)[0], original.split(marker)[0], 'Shared menu styles changed.');
  const scoped = candidate.split(marker)[1].replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selectors] of scoped.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
    assert.ok(selectors.trim().split(/,(?=body\[)/).every(selector => selector.startsWith(scope)), selectors);
  }
  assert.equal(fs.existsSync(new URL('../assets/official-help-presentation.mjs', import.meta.url)), false, 'A presentation-module override needs separate review.');
  const helper = fs.readFileSync(new URL('../../habesha-r5/assets/official-help-presentation.mjs', import.meta.url), 'utf8');
  assert.ok(helper.includes("button.setAttribute('aria-label',text)"));
  assert.equal(declarations(scope + '>nav .native-help-tab-label').display, 'none');
  assert.equal(declarations(scope + '>nav [aria-current=page] .native-help-tab-label').display, 'block');
});

test('header and preview controls match measured desktop dimensions', () => {
  const columns = declarations(scope + '>header')['grid-template-columns'];
  const percent = Number(columns.match(/^([\d.]+)%/)[1]);
  within(898 * percent / 100, measurements.referencePanel.headerSideWidth, 1, 'Header side width');
  const preview = declarations(scope + ' .native-help-selected');
  within(Number.parseFloat(preview.width), 140, 2, 'Preview display width');
  within(Number.parseFloat(preview.height), 40, 2, 'Preview display height');
  const plus = declarations(scope + ' .native-help-more');
  within(Number.parseFloat(plus.width), 48, 2, 'Preview hit target width');
  within(Number.parseFloat(plus.height), 48, 2, 'Preview hit target height');
});

test('original symbol core dimensions approach the reference without replacing artwork', () => {
  const sizeValue = declarations(scope + ' [data-native-help-layout=habesha]')['--habesha-help-symbol-size'];
  const size = Number(sizeValue.match(/^min\(([\d.]+)px/)[1]);
  const ref = measurements.screenshots['reference-rules.jpg'].brightArtworkBounds;
  // Opaque bounds measured from the existing 200×200 native PNGs at alpha >200.
  // JPEG brightness segmentation and PNG alpha bounds differ by a few pixels.
  for (const [name, width, height, scale] of [['top',108,105,.95],['goat',97,103,1.05],['woman',105,101,1.05]]) {
    const box = ref[name];
    within(width * size / 200 * scale, box[2] - box[0], 4, name + ' artwork width');
    within(height * size / 200 * scale, box[3] - box[1], 4, name + ' artwork height');
  }
  assert.equal(declarations(scope + ' [data-native-help-layout=habesha] .native-help-symbol')['max-width'], 'none');
  // The pair grid must use complete small canvases, not 59px object-fit boxes.
  assert.equal(declarations(scope + ' [data-native-help-layout=habesha] .native-help-symbols[data-count="4"] .native-help-symbol').height, 'calc(var(--habesha-help-symbol-size) * .6)');
});

test('translucent panel matches reference compositing and keeps optional controls reachable', () => {
  const background = declarations(scope).background;
  assert.equal(background, 'rgba(26,26,26,.94)');
  const backdropSceneFraction = measurements.referencePanel.outsideSceneFraction;
  within((1 - .94) * backdropSceneFraction, measurements.referencePanel.bodySceneFraction, .002, 'Panel transparency');
  const volume = declarations(scope + ' .native-help-volume-options');
  assert.notEqual(volume.display, 'none');
  assert.notEqual(volume.visibility, 'hidden');
  assert.equal(volume['margin-bottom'], '18px');
});

test('frozen r5 help bytes remain pinned to its deployed manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../../habesha-r5/deploy/manifest.json', import.meta.url)));
  assert.equal(hash(Buffer.from(original)), manifest.assets['official-help.css'].sha256);
  const helper = fs.readFileSync(new URL('../../habesha-r5/assets/official-help-presentation.mjs', import.meta.url));
  assert.equal(hash(helper), manifest.assets['official-help-presentation.mjs'].sha256);
});
