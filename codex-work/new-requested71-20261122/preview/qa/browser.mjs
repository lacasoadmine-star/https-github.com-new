import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sourceManifest from '../preview-manifest.mjs';
import { createVisualPreviewWorker as sourceCreateVisualPreviewWorker, PREVIEW_PATH, REPOSITORY, immutableBase } from '../preview-worker.mjs';
import { loadCompactDeployment } from '../../integration/compact-deployment.mjs';

const compact = process.env.ZPLAY_COMPACT_MODULE_ROOT ? await loadCompactDeployment(process.env.ZPLAY_COMPACT_MODULE_ROOT) : null;
const manifest = compact?.manifest || sourceManifest;
const createVisualPreviewWorker = compact?.createVisualPreviewWorker || sourceCreateVisualPreviewWorker;

const require = createRequire(import.meta.url);
const runtimeModules = process.env.ZPLAY_QA_NODE_MODULES || process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const { chromium } = require(require.resolve('playwright', { paths: runtimeModules ? [runtimeModules] : undefined }));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const output = resolve(process.env.ZPLAY_M10_PREVIEW_QA_OUTPUT || 'preview-browser-artifacts');
// A synthetic URL commit is used only by this intercepted local fixture when
// source publication is still pending. It is never reported as a published pin.
const config = { ...manifest, sourceCommit: manifest.sourceCommit || process.env.GITHUB_SHA || 'a'.repeat(40) };
const base = immutableBase(config), requests = [], forbiddenRequests = [], errors = [], checks = [], viewports = [];
const sourceRoot = `https://raw.githubusercontent.com/${REPOSITORY}/${config.sourceCommit}/`;
const entries = new Map(config.entries.map(entry => [sourceRoot + entry.repositoryPath, entry]));
const cases = [
  { label: '360-portrait', width: 360, height: 844, touch: true },
  { label: '390-portrait', width: 390, height: 844, touch: true },
  { label: '430-portrait', width: 430, height: 844, touch: true },
  { label: '1280-desktop', width: 1280, height: 900, touch: false },
];
// Fresh official M10 observation, 22 Nov 2026: a five-row window advances
// five values, clamps at index 26, and retains its offset when reopened.
const observedBetWindows = [
  ['0.10', '0.20', '0.30', '0.40', '0.50'],
  ['0.60', '0.70', '0.80', '1.00', '1.50'],
  ['2.00', '2.50', '3.00', '4.00', '5.00'],
  ['6.00', '7.00', '8.00', '10.00', '15.00'],
  ['20.00', '25.00', '30.00', '40.00', '50.00'],
  ['60.00', '70.00', '80.00', '100.00', '150.00'],
  ['70.00', '80.00', '100.00', '150.00', '200.00'],
];
let browser, server, currentPage, origin, watchdog;
const check = (label, condition, detail) => {
  assert.ok(condition, label + (detail ? ': ' + JSON.stringify(detail) : ''));
  checks.push(label);
};
const worker = createVisualPreviewWorker({ fetch() { return new Response('Preserved old route', { status: 404 }); } }, config, {
  cache: null,
  async fetchImpl(url, options) {
    const entry = entries.get(String(url)); assert.ok(entry, 'Only exact source files may be read');
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'manual');
    const bytes = await readFile(resolve(root, entry.repositoryPath));
    return new Response(bytes, { headers: { 'Content-Type': entry.contentType, 'Content-Length': String(bytes.length) } });
  },
});
const activate = (target, viewport) => viewport.touch ? target.tap() : target.click();
const overlaps = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > .5
  && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .5;
async function inspectTarget(page, target, { minimum = 0, withinStage = true } = {}) {
  assert.equal(await target.count(), 1, 'The required control must occur exactly once');
  assert.equal(await target.isVisible(), true, 'The required control must remain visible');
  await target.scrollIntoViewIfNeeded();
  const result = await target.evaluate(node => {
    const r = node.getBoundingClientRect(), stage = node.closest('.m10-stage').getBoundingClientRect();
    const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const hit = document.elementFromPoint(center.x, center.y);
    return {
      name: node.getAttribute('aria-label') || node.textContent || node.dataset.action,
      width: r.width, height: r.height, centerHit: hit === node || node.contains(hit),
      left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY,
      inStage: r.left >= stage.left - .5 && r.right <= stage.right + .5 && r.top >= stage.top - .5 && r.bottom <= stage.bottom + .5,
      reachable: r.left >= -.5 && r.right <= innerWidth + .5 && r.top >= -.5 && r.bottom <= innerHeight + .5,
    };
  });
  assert.ok(result.width >= minimum - .05 && result.height >= minimum - .05, `Touch target is too small: ${JSON.stringify(result)}`);
  assert.ok(!withinStage || result.inStage, `Control escapes the game stage: ${JSON.stringify(result)}`);
  assert.ok(result.reachable && result.centerHit, `Visible center cannot be reached: ${JSON.stringify(result)}`);
  return result;
}
async function inspectPanel(page, viewport, selector = '.m10-dialog button') {
  const targets = page.locator(selector), measurements = [];
  assert.ok(await targets.count() > 0, 'The current panel must contain real controls');
  for (let index = 0; index < await targets.count(); index++) {
    measurements.push(await inspectTarget(page, targets.nth(index), { minimum: viewport.touch ? 44 : 0 }));
  }
  return measurements;
}
async function capture(page, label, state) {
  await page.screenshot({ path: resolve(output, `preview-${label}-${state}.png`), fullPage: true });
}

try {
  await mkdir(output, { recursive: true });
  watchdog = setTimeout(() => {
    errors.push('Preview browser fixture exceeded 150 seconds');
    void browser?.close().catch(() => {});
  }, 150000);
  watchdog.unref();
  server = createServer(async (req, res) => {
    try {
      const response = await worker.fetch(new Request(`${origin}${req.url}`, { method: req.method }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      errors.push(error.message); res.writeHead(500); res.end('Preview fixture error');
    }
  });
  server.requestTimeout = 20000; server.keepAliveTimeout = 1000;
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.env.ZPLAY_QA_CHROMIUM_PATH ? { executablePath: process.env.ZPLAY_QA_CHROMIUM_PATH } : {}) });
  for (const viewport of cases) {
    const caseReport = { viewport, dpr: 2, passed: false, controls: [], panels: {} };
    let context;
    try {
      context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 2, hasTouch: viewport.touch });
      await context.route('**/*', async route => {
        const incoming = route.request(), url = new URL(incoming.url());
        const allowed = incoming.method() === 'GET' && url.origin === origin
          && (url.pathname === PREVIEW_PATH || url.pathname.startsWith(base + '/') || url.pathname === '/favicon.ico');
        if (!allowed) {
          forbiddenRequests.push({ viewport: viewport.label, method: incoming.method(), url: incoming.url() });
          await route.abort('blockedbyclient'); return;
        }
        await route.continue();
      });
      const page = currentPage = await context.newPage();
      page.setDefaultTimeout(10000); page.setDefaultNavigationTimeout(20000);
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('request', request => requests.push({ viewport: viewport.label, method: request.method(), url: request.url() }));
      page.on('response', response => {
        if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) pageErrors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
      });
      await page.goto(origin + PREVIEW_PATH, { waitUntil: 'networkidle' });
      await page.locator('[data-visual-preview="true"]').waitFor();
      const name = text => viewport.label + ': ' + text;
      check(name('real CSP and immutable import map mount exactly one canvas'), await page.locator('canvas').count() === 1);
      check(name('visual-only boundary is visible'), await page.getByText('Visual preview — bets disabled.', { exact: true }).isVisible());
      check(name('SPIN and AUTO remain disabled'), await page.getByRole('button', { name: 'Spin', exact: true }).isDisabled()
        && await page.getByRole('button', { name: 'Autoplay', exact: true }).isDisabled());
      check(name('win-only TAKE and GAMBLE stay hidden'), await page.locator('[data-control="take"]').isHidden() && await page.locator('[data-control="gamble"]').isHidden());
      const dimensions = await page.locator('.m10-canvas').evaluate(canvas => {
        const r = canvas.getBoundingClientRect();
        return { width: r.width, height: r.height, dprX: canvas.width / r.width, dprY: canvas.height / r.height,
          layout: canvas.parentElement.dataset.layout, horizontalOverflow: document.documentElement.scrollWidth > innerWidth };
      });
      caseReport.canvas = dimensions;
      check(name('canvas raster uses DPR 2 without overflow'), dimensions.dprX <= 2.01 && dimensions.dprY <= 2.01
        && dimensions.dprX >= 1.99 && dimensions.dprY >= 1.99 && !dimensions.horizontalOverflow, dimensions);
      check(name('orientation selects the expected layout'), dimensions.layout === (viewport.touch ? 'portrait' : 'landscape'));
      for (const control of ['spin', 'auto', 'bet', 'quick', 'menu', 'sound']) {
        caseReport.controls.push(await inspectTarget(page, page.locator(`.m10-hitbox[data-control="${control}"]`), { minimum: 44 }));
      }
      check(name('all six visible main controls have reachable 44px centers'), caseReport.controls.length === 6);
      if (viewport.touch) {
        for (let i = 0; i < caseReport.controls.length; i++) for (let j = i + 1; j < caseReport.controls.length; j++) {
          check(name(`portrait ${caseReport.controls[i].name}/${caseReport.controls[j].name} targets do not overlap`), !overlaps(caseReport.controls[i], caseReport.controls[j]));
        }
      }
      await capture(page, viewport.label, 'idle');
      await activate(page.getByRole('button', { name: 'Choose bet', exact: true }), viewport);
      caseReport.panels.bet = await inspectPanel(page, viewport);
      const betValues = () => page.locator('[data-action="choose-bet"]').evaluateAll(nodes => nodes.map(node => node.dataset.value));
      const previousBets = page.getByRole('button', { name: 'Previous bet options', exact: true });
      const nextBets = page.getByRole('button', { name: 'Next bet options', exact: true });
      assert.deepEqual(await betValues(), observedBetWindows[0]);
      check(name('BET starts with five observed options and a disabled upper boundary'),
        await page.locator('.m10-bet-row').count() === 5 && await previousBets.isDisabled());
      await capture(page, viewport.label, 'bet-first');
      for (let index = 1; index < observedBetWindows.length; index++) {
        await activate(nextBets, viewport);
        assert.deepEqual(await betValues(), observedBetWindows[index]);
        check(name(`BET window ${index + 1} matches current official values without selecting a stake`),
          await page.getByRole('dialog', { name: 'bet', exact: true }).isVisible());
      }
      check(name('BET final five-row window clamps at index 26'),
        await page.locator('.m10-bet-choices').getAttribute('data-start-index') === '26' && await nextBets.isDisabled());
      await capture(page, viewport.label, 'bet-last');
      await activate(previousBets, viewport);
      assert.deepEqual(await betValues(), ['25.00', '30.00', '40.00', '50.00', '60.00']);
      check(name('BET upper arrow subtracts five from the clamped final window'),
        await page.locator('.m10-bet-choices').getAttribute('data-start-index') === '21');
      // Click the observed backdrop, outside all five rows and their carets.
      const backdrop = page.locator('.m10-dialog-layer');
      if (viewport.touch) await backdrop.tap({ position: { x: 2, y: 2 } });
      else await backdrop.click({ position: { x: 2, y: 2 } });
      check(name('BET backdrop closes without selecting a row'), await page.locator('.m10-dialog-layer').isHidden());
      await activate(page.getByRole('button', { name: 'Choose bet', exact: true }), viewport);
      assert.deepEqual(await betValues(), ['25.00', '30.00', '40.00', '50.00', '60.00']);
      check(name('BET reopen retains its observed window offset'),
        await page.locator('.m10-bet-choices').getAttribute('data-start-index') === '21');
      for (let index = 0; index < 5; index++) await activate(previousBets, viewport);
      assert.deepEqual(await betValues(), observedBetWindows[0]);
      check(name('BET returns to its first boundary with the selected stake unchanged'),
        await previousBets.isDisabled()
        && await page.getByRole('button', { name: 'Bet 0.10 DMO', exact: true }).getAttribute('aria-pressed') === 'true');
      await activate(page.getByRole('button', { name: 'Bet 0.20 DMO', exact: true }), viewport);
      check(name('selecting a bet closes its panel'), await page.locator('.m10-dialog-layer').isHidden());
      await activate(page.getByRole('button', { name: 'Menu', exact: true }), viewport);
      caseReport.panels.rules = await inspectPanel(page, viewport);
      const preview = page.locator('.m10-preview-bet output');
      check(name('rules start with the selected displayed bet'), (await preview.textContent()).trim() === '0.20 DMO');
      await activate(page.getByRole('button', { name: 'Decrease paytable preview', exact: true }), viewport);
      check(name('paytable preview responds separately'), (await preview.textContent()).trim() === '0.10 DMO');
      if (viewport.touch) check(name('paytable remains readable on mobile'), await page.locator('.m10-payout-table').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize) >= 14));
      await capture(page, viewport.label, 'rules');
      await activate(page.getByRole('button', { name: 'Settings', exact: true }), viewport);
      caseReport.panels.settings = await inspectPanel(page, viewport);
      const effects = page.getByRole('switch', { name: 'Sound Effects', exact: true });
      const beforeEffects = await effects.getAttribute('aria-checked');
      await activate(effects, viewport);
      check(name('sound effects switch responds'), await effects.getAttribute('aria-checked') !== beforeEffects);
      const music = page.getByRole('switch', { name: 'Background Music', exact: true });
      const beforeMusic = await music.getAttribute('aria-checked');
      await activate(music, viewport);
      check(name('music switch responds independently'), await music.getAttribute('aria-checked') !== beforeMusic);
      await capture(page, viewport.label, 'settings');
      await activate(page.getByRole('button', { name: 'History', exact: true }), viewport);
      check(name('history panel remains local and truthful'), await page.getByText('History is unavailable.', { exact: true }).isVisible());
      await activate(page.getByRole('button', { name: 'Rules', exact: true }), viewport);
      check(name('changing paytable preview did not change actual selected bet'), (await preview.textContent()).trim() === '0.20 DMO');
      await activate(page.getByRole('button', { name: 'Close', exact: true }), viewport);
      await activate(page.getByRole('button', { name: 'Quick play', exact: true }), viewport);
      caseReport.panels.quick = await inspectPanel(page, viewport);
      await capture(page, viewport.label, 'quick');
      await activate(page.getByRole('button', { name: 'ENABLE QUICK PLAY', exact: true }), viewport);
      check(name('quick-play confirmation closes'), await page.locator('.m10-dialog-layer').isHidden());
      await activate(page.getByRole('button', { name: 'Quick play', exact: true }), viewport);
      await activate(page.getByRole('button', { name: 'Quick play', exact: true }), viewport);
      check(name('quick-play can be disabled and opened again'), await page.getByRole('dialog', { name: 'Quick Play', exact: true }).isVisible());
      await activate(page.getByRole('button', { name: 'Close quick play', exact: true }), viewport);
      await activate(page.getByRole('button', { name: 'Sound', exact: true }), viewport);
      await page.keyboard.press('Space'); await page.keyboard.press('Enter');
      check(name('keyboard input cannot enable a preview wager'), await page.getByRole('button', { name: 'Spin', exact: true }).isDisabled());
      check(name('controls remain inside the document width'), await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      check(name('no browser exceptions or failed resources'), pageErrors.length === 0, pageErrors);
      caseReport.passed = true;
    } catch (error) {
      caseReport.failure = error.stack || String(error);
      errors.push(viewport.label + ': ' + caseReport.failure);
      await currentPage?.screenshot({ path: resolve(output, `preview-${viewport.label}-failure.png`), fullPage: true }).catch(() => {});
    } finally {
      await context?.close(); currentPage = null; viewports.push(caseReport);
    }
  }
  check('all four portrait/desktop cases completed', viewports.length === cases.length && viewports.every(result => result.passed));
  check('every browser request was a local permitted GET', forbiddenRequests.length === 0, forbiddenRequests);
  check('no wallet, round, session or authentication request was sent', requests.every(request => !new URL(request.url).pathname.startsWith('/api/')));
} catch (error) {
  errors.push(error.stack || String(error));
} finally {
  clearTimeout(watchdog);
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(done => server.close(done)); }
  const financialRequests = requests.filter(request => new URL(request.url).pathname.startsWith('/api/')).length;
  const report = { schema: 'zplay/m10-preview-browser-qa/v1', checkedAt: new Date().toISOString(),
    scope: 'Isolated exact-source preview worker, real CSP, immutable imports, native assets and interactive portrait/desktop controls; no live financial or official parity claim',
    passed: errors.length === 0 && viewports.length === cases.length && viewports.every(result => result.passed),
    checks, errors, viewports, requestCount: requests.length, financialRequests, forbiddenRequests,
    sourceCommit: manifest.sourceCommit, fixtureURLCommit: config.sourceCommit, publishedSourceVerified: false,
    manifestRevision: config.revision, sourceFileCount: config.entries.length,
    deploymentFormat: compact ? 'compact' : 'source', deploymentModules: compact?.report.modules || null };
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, checks: checks.length, viewports: viewports.length,
    errors: errors.map(error => error.split('\n')[0]), output }));
  if (!report.passed) process.exitCode = 1;
}
