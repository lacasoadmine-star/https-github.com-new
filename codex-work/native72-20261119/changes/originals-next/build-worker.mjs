import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { games } from './games/catalog.mjs';

const [base, destination] = process.argv.slice(2);
const release = 'zplayoriginals1';
if (!destination || !/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.mjs$/.test(base ?? '') || base.startsWith(release + '/')) {
  throw new Error('Usage: node build-worker.mjs VERIFIED_ACTIVE_ENTRY.mjs OUTPUT_DIRECTORY');
}
const output = resolve(destination, release);
const files = ['index.html', 'style.css', 'lobby.css', 'app.mjs', 'round.mjs', 'cash.mjs',
  'games/catalog.mjs', ...games.map(game => 'games/' + game.slug + '.mjs')];
const assets = Object.fromEntries(await Promise.all(files.map(async name => [
  name, await readFile(new URL(name, import.meta.url), 'utf8'),
])));
const metadata = games.map(({ slug, title, theme, description }) => ({ slug, title, theme, description }));
await mkdir(output, { recursive: true });
await writeFile(join(output, 'worker.mjs'), await readFile(new URL('worker.mjs', import.meta.url)));
await writeFile(join(output, 'entry.mjs'),
  'import previous from ' + JSON.stringify('../' + base) + ';\n' +
  'export * from ' + JSON.stringify('../' + base) + ';\n' +
  "import { installOriginalGames } from './worker.mjs';\n" +
  'export default installOriginalGames(previous, ' + JSON.stringify({ assets, games: metadata }) + ');\n');
console.log(JSON.stringify({ previousEntry: base, mainModule: release + '/entry.mjs', modules: [
  release + '/entry.mjs', release + '/worker.mjs',
] }));
