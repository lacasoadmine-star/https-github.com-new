#!/usr/bin/env node
// Separate full-Chromium diagnostic. The normal Playwright suite is unchanged.
// All browser requests remain intercepted on .invalid; no live account is used.
const { chromium } = require('playwright');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

(async () => {
  const gameRoot = resolve(__dirname, '..');
  const outputRoot = resolve(process.env.ZPLAY_NEW72_BFCACHE_OUTPUT || resolve(__dirname, 'bfcache-results'));
  await mkdir(outputRoot, { recursive: true });
  const { fixtureReceipt } = await import(pathToFileURL(resolve(gameRoot, 'tests/fixture-session.mjs')));
  const { recorderSource, bindSource, snapshotSource, assessRestoration } =
    await import(pathToFileURL(resolve(__dirname, 'bfcache-probe.mjs')));
  const hash = value => createHash('sha256').update(value).digest('hex');
  const sourceHashes = {}, files = {};
  const routingBytes = await readFile(resolve(gameRoot, 'frontend-route.json'));
  const routing = JSON.parse(routingBytes);
  sourceHashes['frontend-route.json'] = hash(routingBytes);
  for (const [urlPath, name] of Object.entries(routing.resources)) {
    const bytes = await readFile(resolve(gameRoot, name));
    files[urlPath] = bytes.toString('utf8'); sourceHashes[name] = hash(bytes);
  }
  const fixtureBytes = await readFile(resolve(gameRoot, 'qa/browser-fixture.mjs'));
  files[routing.modulePrefix + 'qa/browser-fixture.mjs'] = fixtureBytes.toString('utf8');
  sourceHashes['qa/browser-fixture.mjs'] = hash(fixtureBytes);
  for (const name of ['qa/run-bfcache-browser.cjs', 'qa/bfcache-probe.mjs', 'tests/fixture-session.mjs']) {
    sourceHashes[name] = hash(await readFile(resolve(gameRoot, name)));
  }
  const origin = 'https://qa.zplay.invalid';
  const fixtureUrl = origin + routing.route + 'fixture.html';
  const awayUrl = origin + '/bfcache-away.html';
  const receipts = [fixtureReceipt(1), fixtureReceipt(2, { before: 10008n, payout: '0.00', sector: 'empty' })];
  const launch = { headless: true, channel: 'chromium', ignoreDefaultArgs: ['--disable-back-forward-cache'],
    ...(process.env.ZPLAY_QA_CHROMIUM ? { executablePath: process.env.ZPLAY_QA_CHROMIUM } : {}) };
  const report = { schema: 'zplay/roll-x-native-bfcache-probe/v1',
    startedAt: new Date().toISOString(), success: false, status: 'BFCACHE_NOT_PROVEN',
    nodeVersion: process.version, playwrightVersion: require('playwright/package.json').version,
    testOnly: true, realMoneyActions: 0, productionEndpointsUsed: false, sourceHashes,
    launch: { headless: true, channel: 'chromium', ignoreDefaultArgs: launch.ignoreDefaultArgs,
      executableOverridePresent: Boolean(launch.executablePath) },
    requests: [], unmappedPaths: [], checks: [], errors: [], transientPollErrors: [],
    frameNavigations: [], cacheMissEvents: [], sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'],
      { cwd: gameRoot, encoding: 'utf8' }).trim(),
    hasUncommittedSource: execFileSync('git', ['status', '--porcelain', '--', '.', '../../shared/round-recovery.mjs'],
      { cwd: gameRoot, encoding: 'utf8' }).trim().length > 0 };
  let browser, cdp;
  const wait = milliseconds => new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));
  const bounded = async (promise, milliseconds, label) => {
    let timer;
    try { return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label + ' timed out')), milliseconds);
    })]); } finally { clearTimeout(timer); }
  };
  const evaluate = async expression => {
    const result = await bounded(cdp.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true,
    }), 1500, 'Runtime.evaluate');
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const poll = async (label, expression, predicate, timeout = 8000) => {
    const deadline = Date.now() + timeout;
    let last = null;
    for (let attempt = 0; attempt < 70 && Date.now() < deadline; attempt++) {
      try { last = await evaluate(expression); if (predicate(last)) return last; }
      catch (error) {
        if (report.transientPollErrors.length < 20) report.transientPollErrors.push({ label, message: error.message.slice(0, 300) });
      }
      await wait(100);
    }
    report.lastPoll = { label, value: last };
    throw new Error(label + ' not observed within bounded polling');
  };
  const check = (name, condition, detail = null) => {
    report.checks.push({ name, passed: condition === true, detail });
    if (!condition) throw new Error(name + ' failed');
  };
  const clickSpin = async () => {
    const point = await evaluate(`(() => {
      const button = document.getElementById('spin');
      const b = button.getBoundingClientRect();
      if (button.disabled || b.width < 44 || b.height < 44 || b.x < 0 || b.y < 0 ||
          b.right > innerWidth || b.bottom > innerHeight) throw new Error('SPIN/STOP not usable');
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    })()`);
    await bounded(cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 }), 1500, 'native mouse down');
    await bounded(cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 }), 1500, 'native mouse up');
  };
  try {
    check('authored mapping remains disabled and matches the isolated fixture game',
      routing.enabled === false && routing.gameId === receipts[0].gameId && typeof files[routing.route] === 'string');
    browser = await chromium.launch(launch);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      report.requests.push({ method: request.method(), origin: url.origin, path: url.pathname });
      if (url.origin !== origin) { await route.abort(); return; }
      if (url.pathname === '/api/slots/spin') {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"FORBIDDEN_IN_ISOLATED_QA"}' }); return;
      }
      if (url.href === awayUrl) {
        await route.fulfill({ status: 200, contentType: 'text/html',
          body: '<!doctype html><html><head><title>Isolated BFCache away document</title></head><body><p>Isolated history-navigation target. No account or wager.</p></body></html>' }); return;
      }
      if (url.href === fixtureUrl) {
        const body = files[routing.route]
          .replace('src="' + routing.modulePrefix + 'main.mjs"', 'src="' + routing.modulePrefix + 'qa/browser-fixture.mjs"')
          .replace('</head>', '<script type="application/json" id="fixture-receipts">' + JSON.stringify(receipts) + '</script></head>');
        await route.fulfill({ status: 200, contentType: 'text/html', body }); return;
      }
      if (files[url.pathname] !== undefined) {
        await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.mjs') ? 'text/javascript' :
          url.pathname.endsWith('.css') ? 'text/css' : 'text/html', body: files[url.pathname] }); return;
      }
      if (url.pathname === '/favicon.ico') { await route.fulfill({ status: 204, body: '' }); return; }
      report.unmappedPaths.push(url.pathname);
      await route.fulfill({ status: 404, body: 'Unknown isolated BFCache route' });
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    cdp = await context.newCDPSession(page);
    await bounded(cdp.send('Page.enable'), 1500, 'Page.enable');
    report.browserVersion = await bounded(cdp.send('Browser.getVersion'), 1500, 'Browser.getVersion');
    try {
      const commandLine = await bounded(cdp.send('Browser.getBrowserCommandLine'), 1500, 'Browser.getBrowserCommandLine');
      report.relevantBrowserArguments = commandLine.arguments.filter(argument =>
        /^(--headless|--disable-back-forward-cache|--enable-features=|--disable-features=|--enable-automation)/.test(argument));
    } catch (error) { report.browserArgumentDiagnostic = error.message; }
    cdp.on('Page.frameNavigated', event => {
      if (!event.frame.parentId && report.frameNavigations.length < 30)
        report.frameNavigations.push({ type: event.type ?? null, url: event.frame.url, frameId: event.frame.id });
    });
    cdp.on('Page.backForwardCacheNotUsed', event => {
      if (report.cacheMissEvents.length < 10) report.cacheMissEvents.push(event);
    });
    await bounded(cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: recorderSource }), 1500, 'native lifecycle recorder');
    await bounded(cdp.send('Page.navigate', { url: fixtureUrl }), 3000, 'initial fixture navigation');
    await poll('fixture ready', `globalThis.rollxTest?.game.controller.snapshot.canSpin === true`, value => value === true);
    await clickSpin();
    await poll('first accepted fixture round settled', `globalThis.rollxTest ? {
      count: rollxTest.calls.spin.length, busy: rollxTest.game.controller.snapshot.busy,
      history: rollxTest.game.controller.snapshot.history.length } : null`, value => value?.count === 1 && value.busy === false && value.history === 1);
    report.before = await evaluate(bindSource);
    check('baseline retains one settled fixture receipt and an undisposed controller',
      report.before.bound && report.before.sameController && report.before.calls.spin === 1 &&
      report.before.state.historyRoundIds.length === 1 && report.before.controllerDisposed === false);
    const history = await bounded(cdp.send('Page.getNavigationHistory'), 1500, 'read original history entry');
    const originalEntry = history.entries[history.currentIndex];
    check('history entry identifies the exact fixture document', originalEntry?.url === fixtureUrl);
    report.navigationEntry = { id: originalEntry.id, url: originalEntry.url };
    await bounded(cdp.send('Page.navigate', { url: awayUrl }), 3000, 'away navigation');
    await poll('fully loaded different away document', `({ url: location.href,
      readyState: document.readyState, documentId: globalThis.__rollxBfProbe?.documentId ?? null })`,
      value => value?.url === awayUrl && value.readyState === 'complete' &&
        typeof value.documentId === 'string' && value.documentId !== report.before.documentId);
    report.away = await evaluate(snapshotSource);
    check('away navigation creates a different actual document', report.away?.documentId !== report.before.documentId && report.away?.url === awayUrl);
    await bounded(cdp.send('Page.navigateToHistoryEntry', { entryId: originalEntry.id }), 3000, 'native history restoration');
    report.after = await poll('trusted native BFCache restoration', snapshotSource, value => {
      report.lastRestorationSnapshot = value;
      report.restoration = assessRestoration(report.before, value, report.frameNavigations);
      return report.restoration.passed;
    });
    check('trusted persisted lifecycle and frame restore retain the document/controller without wagering', report.restoration.passed, report.restoration);
    await clickSpin();
    await poll('restored controller accepts one explicit test round', `globalThis.rollxTest ? {
      count: rollxTest.calls.spin.length, canStop: rollxTest.game.controller.snapshot.canStop } : null`, value => value?.count === 2 && value.canStop === true);
    await clickSpin();
    report.afterInteraction = await poll('restored native SPIN and STOP settle exactly one more receipt', snapshotSource,
      value => value?.calls?.spin === 2 && value.state.busy === false && value.state.historyRoundIds.length === 2);
    check('restored native controls remain usable with no duplicate round',
      report.afterInteraction.documentId === report.before.documentId && report.afterInteraction.sameController &&
      report.afterInteraction.calls.dispose === report.before.calls.dispose && report.afterInteraction.state.canSpin === true);
    check('all requests stayed isolated with no financial endpoint used',
      report.requests.every(request => request.origin === origin && request.method === 'GET') &&
      !report.requests.some(request => request.path === '/api/slots/spin') && report.unmappedPaths.length === 0);
    check('no browser page errors', report.errors.length === 0, report.errors);
    report.success = true; report.status = 'NATIVE_BFCACHE_RESTORE_VERIFIED_IN_ISOLATED_FIXTURE';
  } catch (error) {
    report.failure = { name: error.name, message: error.message, stack: error.stack?.split('\n').slice(0, 4) };
    if (cdp) {
      try { report.failureSnapshot = await evaluate(snapshotSource); } catch (readError) { report.snapshotReadError = readError.message; }
    }
  } finally {
    if (cdp) {
      try {
        const screenshot = await bounded(cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 65, captureBeyondViewport: false }), 2000, 'CDP screenshot');
        const bytes = Buffer.from(screenshot.data, 'base64'), filename = report.success ? 'bfcache-restored.jpg' : 'bfcache-attempt.jpg';
        await writeFile(resolve(outputRoot, filename), bytes);
        report.screenshot = { path: filename, byteLength: bytes.length, sha256: hash(bytes) };
      } catch (error) { report.screenshotError = error.message; }
    }
    if (browser) {
      try { await browser.close(); report.browserClosed = true; }
      catch (error) {
        report.closeError = error.message; report.success = false;
        report.status = 'BFCACHE_ATTEMPT_CLEANUP_FAILED';
      }
    }
    report.finishedAt = new Date().toISOString();
    report.limitations = [
      'A separate full-Chromium CDP diagnostic; the normal Playwright launch remains unchanged.',
      'Reload, absent trusted persisted events, missing frame restore, or null notRestoredReasons never establish BFCache success.',
      'Immutable fixture receipts only; no production account, financial POST, engine distribution or real ledger tested.',
      'Any failure leaves the native lifecycle issue unverified until its cause and exact-source retest are recorded.',
    ];
    await writeFile(resolve(outputRoot, 'bfcache-report.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ success: report.success, status: report.status,
      checks: report.checks.length, passed: report.checks.filter(check => check.passed).length,
      failure: report.failure ?? null, sourceCommit: report.sourceCommit, output: outputRoot }) + '\n');
    if (!report.success) process.exitCode = 1;
  }
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
