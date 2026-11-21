#!/usr/bin/env node
// Runs checked-out public code on the repository's isolated CI runner.
// All page requests are intercepted by browser-run.mjs; no live account is used.
const { chromium } = require('playwright');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

(async () => {
  const gameRoot = resolve(__dirname, '..');
  const outputRoot = resolve(process.env.ZPLAY_NEW72_QA_OUTPUT || resolve(__dirname, 'browser-results'));
  await mkdir(outputRoot, { recursive: true });
  const { fixtureReceipt } = await import(pathToFileURL(resolve(gameRoot, 'tests/fixture-session.mjs')));
  const { default: run } = await import(pathToFileURL(resolve(__dirname, 'browser-run.mjs')));
  const prefix = '/new-games72/games/roll-x/';
  const files = {}, sourceHashes = {};
  const names = ['index.html', 'style.css', 'main.mjs', 'app.mjs', 'controller.mjs', 'session.mjs',
    'evaluator.mjs', 'receipt.mjs', 'renderer.mjs', 'audio.mjs', 'qa/browser-fixture.mjs'];
  const hash = value => createHash('sha256').update(value).digest('hex');
  for (const name of names) {
    const bytes = await readFile(resolve(gameRoot, name));
    files[prefix + name] = bytes.toString('utf8');
    sourceHashes[name] = hash(bytes);
  }
  const shared = await readFile(resolve(gameRoot, '../../shared/round-recovery.mjs'));
  files['/new-games72/shared/round-recovery.mjs'] = shared.toString('utf8');
  sourceHashes['../../shared/round-recovery.mjs'] = hash(shared);
  for (const name of ['qa/browser-run.mjs', 'qa/run-isolated-browser.cjs', 'tests/fixture-session.mjs']) {
    sourceHashes[name] = hash(await readFile(resolve(gameRoot, name)));
  }
  const receipts = [];
  let before = 10000n;
  for (let index = 1; index <= 20; index++) {
    const options = { before };
    if (index === 2) Object.assign(options, { payout: '0.00', sector: 'empty' });
    if (index === 3) Object.assign(options, { bet: '0.50', payout: '1.00', targetBps: 20000 });
    const receipt = fixtureReceipt(index, options);
    receipts.push(receipt);
    before = BigInt(receipt.walletReceipt.balanceAfter.replace('.', ''));
  }
  const mockAccount = {
    authenticated: true, currency: 'ETB', balance: '98.00', sessionGuard: 'b'.repeat(64), blockedByActiveGame: null,
    game: { id: receipts[0].gameId, currency: 'ETB', enabled: true, freshReleaseReady: true,
      betLevels: ['0.20', '0.50'], rollX: { targetBps: 14000 }, mathVersion: receipts[0].mathVersion,
      engineVersion: receipts[0].engineVersion, mathSha256: receipts[0].mathSha256 },
  };
  let browser;
  let report = { success: false, checks: [], errors: [], startedAt: new Date().toISOString() };
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.ZPLAY_QA_CHROMIUM ? { executablePath: process.env.ZPLAY_QA_CHROMIUM } : {}) });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    report = await run({ page, context, browser }, files, receipts, mockAccount);
  } catch (error) {
    report.failure = { name: error.name, message: error.message };
  } finally {
    if (browser) await browser.close();
    report.environment = (process.env.GITHUB_ACTIONS === 'true' ? 'GitHub Actions / checked-out public source' : 'Local workspace / checked-out source') +
      ' / Playwright / intercepted .invalid origin';
    report.finishedAt = new Date().toISOString();
    report.testOnly = true;
    report.realMoneyActions = 0;
    report.productionEndpointsUsed = false;
    report.sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: gameRoot, encoding: 'utf8' }).trim();
    report.hasUncommittedSource = execFileSync('git', ['status', '--porcelain', '--', '.', '../../shared/round-recovery.mjs'],
      { cwd: gameRoot, encoding: 'utf8' }).trim().length > 0;
    report.sourceHashes = sourceHashes;
    report.screenshotFiles = [];
    for (const [name, base64] of Object.entries(report.screenshots || {})) {
      if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Unsafe screenshot name');
      const bytes = Buffer.from(base64, 'base64');
      const filename = name + '.jpg';
      await writeFile(resolve(outputRoot, filename), bytes);
      report.screenshotFiles.push({ path: filename, bytes: bytes.length, sha256: hash(bytes) });
    }
    delete report.screenshots;
    report.browserClosed = Boolean(browser);
    report.limitations = [
      'Synthetic receipt fixture, not a live engine or ledger transaction test',
      'No claim of provider visual, sound, probability or RTP parity',
      'No physical-device or 60 FPS measurement',
      'Cash wagering remains disabled in the runtime entry',
    ];
    await writeFile(resolve(outputRoot, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ success: report.success, checks: report.checks.length,
      passed: report.checks.filter(check => check.passed).length, failure: report.failure || null,
      sourceCommit: report.sourceCommit, output: outputRoot }) + '\n');
    if (!report.success) process.exitCode = 1;
  }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
