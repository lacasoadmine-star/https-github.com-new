#!/usr/bin/env node
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStaticReviewScene} from './renderer.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const index = JSON.parse(await readFile(join(root, 'index.json'), 'utf8'));
await mkdir(join(root, 'evidence'), {recursive: true});
for (const [id, entry] of Object.entries(index.games)) {
  const manifest = JSON.parse(await readFile(join(root, entry.file), 'utf8'));
  const scene = createStaticReviewScene(manifest);
  await writeFile(join(root, 'evidence', id + '-scene.json'), JSON.stringify(scene, null, 2) + '\n');
}
console.log('Exported five draw-only review scenes. No browser, game session or financial action.');
