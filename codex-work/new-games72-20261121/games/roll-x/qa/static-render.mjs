// Static renderer QA only. This is not an HTML/browser-layout or audio test.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wheelMarkup, settledAngle } from '../renderer.mjs';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const output = dirname(fileURLToPath(import.meta.url));
const states = [
  { name: 'Unreleased shell', targetBps: 14_000, angle: 0, label: 'ROLL X', amount: 'Not released', fixture: false },
  { name: 'Fixture · green · 1.4×', targetBps: 14_000, angle: settledAngle('green', 14_000), label: 'WIN CONFIRMED', amount: '0.28 ETB', fixture: true },
  { name: 'Fixture · empty · 2×', targetBps: 20_000, angle: settledAngle('empty', 20_000), label: 'ROUND COMPLETE', amount: '0.00 ETB', fixture: true },
];
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1116" height="500" viewBox="0 0 1116 500"><rect width="1116" height="500" fill="#101718"/>';
svg += '<text x="28" y="36" fill="#c8decf" font-family="Arial,sans-serif" font-size="16">ROLL X — STATIC SVG RENDERER QA</text>';
svg += '<text x="28" y="60" fill="#91a79a" font-family="Arial,sans-serif" font-size="12">Original authored graphics · Fixture receipts only · Browser layout and audible sound not verified</text>';
states.forEach((state, index) => {
  const x = 20 + index * 366;
  svg += '<rect x="' + x + '" y="82" width="344" height="394" rx="20" fill="#1c2524" stroke="#35453b"/>';
  svg += '<text x="' + (x + 172) + '" y="113" text-anchor="middle" fill="#d7ead9" font-family="Arial,sans-serif" font-size="13">' + state.name + '</text>';
  let wheel = wheelMarkup(state).replace('<svg viewBox=', '<svg x="' + (x + 12) + '" y="122" width="320" height="354" viewBox=');
  for (const id of ['rollx-disc', 'rollx-green', 'rollx-shadow']) wheel = wheel.replaceAll(id, id + '-' + index);
  svg += wheel;
});
svg += '</svg>';
await writeFile(resolve(output, 'static-renderer.svg'), svg);
await sharp(Buffer.from(svg)).png().toFile(resolve(output, 'static-renderer.png'));
process.stdout.write(JSON.stringify({ artifact: 'qa/static-renderer.png', width: 1116, height: 500, format: 'PNG', scope: 'SVG only' }) + '\n');
