import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fixtureReceipt } from '../tests/fixture-session.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const routing = JSON.parse(await readFile(resolve(root, 'frontend-route.json'), 'utf8'));
const files = {};
for (const [urlPath, name] of Object.entries(routing.resources)) files[urlPath] = await readFile(resolve(root, name), 'utf8');
files[routing.modulePrefix + 'qa/browser-fixture.mjs'] = await readFile(resolve(root, 'qa/browser-fixture.mjs'), 'utf8');
const receipts = []; let before = 10000n;
for (let index = 1; index <= 20; index++) {
  const options = { before };
  if (index === 2) Object.assign(options, { payout: '0.00', sector: 'empty' });
  if (index === 3) Object.assign(options, { bet: '0.50', payout: '1.00', targetBps: 20000 });
  const receipt = fixtureReceipt(index, options); receipts.push(receipt);
  before = BigInt(receipt.walletReceipt.balanceAfter.replace('.', ''));
}
const mockAccount = { authenticated: true, currency: 'ETB', balance: '98.00', sessionGuard: 'b'.repeat(64), blockedByActiveGame: null,
  game: { id: receipts[0].gameId, currency: 'ETB', enabled: true, freshReleaseReady: true, betLevels: ['0.20', '0.50'],
    rollX: { targetBps: 14000 }, mathVersion: receipts[0].mathVersion,
    engineVersion: receipts[0].engineVersion, mathSha256: receipts[0].mathSha256 } };
const runner = (await readFile(resolve(root, 'qa/browser-run.mjs'), 'utf8')).replace('export default ', '');
const code = 'async ({page,context,browser}) => {\n' + runner + '\nreturn run({page,context,browser},' +
  JSON.stringify(files) + ',' + JSON.stringify(receipts) + ',' + JSON.stringify(mockAccount) + ',' + JSON.stringify(routing) + ');\n}';
await writeFile(resolve(root, 'qa/browser-input.json'), JSON.stringify({ library: 'playwright', timeout: 60000, code }));
process.stdout.write(JSON.stringify({ bodyBytes: Buffer.byteLength(code), receiptCount: receipts.length }) + '\n');
