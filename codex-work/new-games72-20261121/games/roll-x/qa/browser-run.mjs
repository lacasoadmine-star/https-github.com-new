// Executed only inside an isolated Playwright session with all network routed
// to checked-out file content. Nothing is deployed to a public origin.
export default async function run({ page, context, browser }, files, receipts, mockAccount, routing) {
  const origin = 'https://qa.zplay.invalid';
  const base = routing.route;
  const moduleBase = routing.modulePrefix;
  const output = { environment: 'Playwright / fully intercepted isolated QA',
    startedAt: new Date().toISOString(), browserVersion: browser.version(), documentRoute: base,
    checks: [], errors: [], pageErrorDetails: [], requests: [], unmappedPaths: [], screenshots: {} };
  const check = (name, value, detail = null) => { output.checks.push({ name, passed: value === true, detail }); if (!value) throw new Error(name + ' failed: ' + JSON.stringify(detail)); };
  async function intercept(ctx) {
    await ctx.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      output.requests.push({ method: request.method(), path: url.pathname, origin: url.origin });
      if (url.origin !== origin) { await route.abort(); return; }
      if (url.pathname === '/api/slots/fresh-state') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAccount) }); return;
      }
      if (url.pathname === '/api/slots/spin') { await route.fulfill({ status: 500, contentType: 'application/json', body: '{"code":"FORBIDDEN_IN_ISOLATED_QA"}' }); return; }
      if (url.pathname === base + 'fixture.html') {
        const source = files[base].replace('src="' + moduleBase + 'main.mjs"', 'src="' + moduleBase + 'qa/browser-fixture.mjs"')
          .replace('</head>', '<script type="application/json" id="fixture-receipts">' + JSON.stringify(receipts) + '</script></head>');
        await route.fulfill({ status: 200, contentType: 'text/html', body: source }); return;
      }
      let body = files[url.pathname];
      if (body !== undefined) {
        if (url.pathname === base) body = body.replace('</header>', '</header><div class="fixture-label">ISOLATED QA · MOCK ACCOUNT STATE · NO REAL MONEY</div>');
        await route.fulfill({ status: 200, contentType: url.pathname.endsWith('.mjs') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'text/html', body }); return;
      }
      if (url.pathname === '/favicon.ico') { await route.fulfill({ status: 204, body: '' }); return; }
      output.unmappedPaths.push(url.pathname);
      await route.fulfill({ status: 404, body: 'Unknown isolated test route' });
    });
  }
  const watch = page => {
    page.setDefaultTimeout(5000);
    page.on('pageerror', error => {
      output.errors.push(error.message);
      output.pageErrorDetails.push({ name: error.name, message: error.message, stack: error.stack?.split('\n').slice(0, 6) });
    });
  };
  const settled = async (page, count) => page.waitForFunction(expected => globalThis.rollxTest?.calls.spin.length === expected && !globalThis.rollxTest.game.controller.snapshot.busy, count);
  const layout = async page => {
    // Reset incidental focus/scroll while still requiring the entire document,
    // wheel and control set to fit together in the initial viewport.
    await page.evaluate(() => window.scrollTo(0, 0));
    return page.evaluate(() => {
      const width = innerWidth, height = innerHeight;
      const requiredIds = ['spin', 'auto', 'history', 'menu', 'mute', 'bet-plus', 'turbo', 'target', 'bet'];
      // Required controls must never disappear from the sample when hidden.
      // Only recovery/availability controls are conditional on round state.
      const required = requiredIds.map(id => document.getElementById(id));
      const optional = ['recover', 'reconnect'].map(id => document.getElementById(id)).filter(element => !element.hidden);
      const rectangle = element => {
        const b = element.getBoundingClientRect();
        return { id: element.id, x: b.x, y: b.y, width: b.width, height: b.height };
      };
      const boxes = [...required, ...optional].map(element => {
        const b = rectangle(element);
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return { ...b, centerUnobscured: hit !== null && (hit === element || element.contains(hit)) };
      });
      const findOverlaps = items => {
        const found = [];
        for (let left = 0; left < items.length; left++) for (let right = left + 1; right < items.length; right++) {
          const a = items[left], b = items[right];
          if (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
              Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1) found.push([a.id, b.id]);
        }
        return found;
      };
      const regions = ['.wheel-panel', '.control-panel', '.round-feedback'].map(selector => {
        const b = document.querySelector(selector).getBoundingClientRect();
        return { id: selector, x: b.x, y: b.y, width: b.width, height: b.height };
      });
      const wheel = rectangle(document.getElementById('rollx-wheel'));
      const wheelHeight = document.querySelector('#rollx-wheel svg > circle').getBoundingClientRect().height;
      const feedback = ['auto-progress', 'recover', 'reconnect'].map(id => document.getElementById(id))
        .filter(element => !element.hidden).map(rectangle);
      const contained = b => b.x >= 0 && b.y >= 0 && b.x + b.width <= width && b.y + b.height <= height;
      const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      return { viewport: { width, height }, scrollWidth, scrollHeight, scrollY, boxes, wheel, feedback, regions, wheelHeight,
        requiredControlsVisible: required.length === 9 && required.every(element => !element.hidden),
        readable: boxes.every(b => b.width >= 44 && b.height >= 44 && b.x >= 0 && b.x + b.width <= width + 1),
        controlsFullyVisible: boxes.every(contained), wheelFullyVisible: contained(wheel),
        feedbackMutuallyExclusive: feedback.length <= 1, feedbackFullyVisible: feedback.every(contained),
        unobscured: boxes.every(b => b.centerUnobscured),
        overlaps: findOverlaps(boxes), panelOverlaps: findOverlaps(regions),
        pageFits: scrollWidth <= width && scrollHeight <= height + 1 && scrollY === 0,
        // Bind an active-AUTO assertion to this exact geometry sample.
        autoActive: globalThis.rollxTest?.game.controller.snapshot.autoActive === true };
    });
  };
  const fits = measured => measured.requiredControlsVisible && measured.readable && measured.controlsFullyVisible &&
    measured.wheelFullyVisible && measured.feedbackMutuallyExclusive && measured.feedbackFullyVisible &&
    measured.unobscured && measured.overlaps.length === 0 && measured.panelOverlaps.length === 0 &&
    measured.wheelHeight >= 80 && measured.pageFits;
  const modalFit = async (page, id) => {
    const box = await page.locator('#' + id).boundingBox();
    const viewport = page.viewportSize();
    return !!box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height;
  };
  const autoModalControlsFit = async page => {
    const controls = page.locator('#auto-dialog button, #auto-dialog select, #auto-dialog input');
    const viewport = page.viewportSize();
    const measured = [];
    for (let index = 0; index < await controls.count(); index++) {
      const control = controls.nth(index);
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      const fontSize = await control.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
      measured.push({ box, fontSize });
    }
    await page.locator('#auto-dialog').evaluate(dialog => { dialog.scrollTop = 0; });
    return measured.length === 9 && measured.every(({ box, fontSize }) => box &&
      box.width >= 44 && box.height >= 44 && fontSize >= 12 &&
      box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height);
  };
  let activePage = page;
  try {
    check('authored mapping retains the canonical registry route with activation closed',
      base === '/new-games72/roll-x/' && routing.gameId === receipts[0].gameId &&
      routing.enabled === false && routing.resources[base] === 'index.html' &&
      files[base]?.includes('src="' + moduleBase + 'main.mjs"'));
    await intercept(context); watch(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(origin + base);
    check('normal page uses the exact reserved document route', new URL(page.url()).pathname === base);
    check('canonical entry loads the authored shared-module URL without a hidden 404',
      output.requests.some(request => request.path === routing.sharedModulePath) && output.unmappedPaths.length === 0);
    // The static HTML already carries the unavailable label. Wait for the
    // account response to reach the rendered balance before checking that an
    // enabled server flag cannot override the runtime release gate.
    await page.waitForFunction(balance =>
      document.getElementById('balance').textContent === balance &&
      document.getElementById('status').textContent === 'Game not released yet.',
    mockAccount.balance + ' ' + mockAccount.currency);
    check('normal runtime consumes authenticated account state before release assertions',
      output.requests.some(request => request.method === 'GET' && request.path === '/api/slots/fresh-state') &&
      (await page.locator('#balance-caption').textContent()) === 'CONFIRMED ACCOUNT BALANCE');
    check('normal runtime remains unavailable despite enabled mock server configuration',
      await page.locator('#spin').isDisabled() && await page.locator('#auto').isDisabled());
    await page.keyboard.press('Space'); await page.keyboard.press('Enter');
    check('normal runtime performs no financial POST', !output.requests.some(r => r.path === '/api/slots/spin'));
    const unreleased = await layout(page); output.unreleasedLayout = unreleased;
    check('unreleased shell controls and availability action fit the desktop viewport', fits(unreleased), unreleased);
    await page.setViewportSize({ width: 844, height: 390 });
    const unavailableLandscape = await layout(page); output.unavailableLandscapeLayout = unavailableLandscape;
    check('unreleased landscape keeps availability and bottom controls reachable without scrolling', fits(unavailableLandscape), unavailableLandscape);
    output.screenshots['unreleased-landscape'] = (await page.screenshot({ type: 'jpeg', quality: 65 })).toString('base64');
    await page.setViewportSize({ width: 1280, height: 900 });
    output.screenshots['unreleased-desktop'] = (await page.screenshot({ type: 'jpeg', quality: 65, fullPage: true })).toString('base64');
    await page.locator('#menu').click(); await page.locator('[data-open="help-dialog"]').click();
    check('menu opens help with unreleased notice', await page.locator('#help-dialog').isVisible() && await page.locator('#help-dialog .notice').isVisible());
    await page.locator('#help-dialog [data-close]').click();

    await page.goto(origin + base + 'fixture.html');
    await page.waitForFunction(() => globalThis.rollxTest?.game.controller.snapshot.canSpin === true);
    check('test adapter and immutable receipt set are visibly isolated', await page.locator('#fixture-label').isVisible() && await page.evaluate(() => Object.isFrozen(rollxTest.receipts) && Object.isFrozen(rollxTest.receipts[0].walletReceipt)));
    await page.locator('#spin').dblclick();
    await page.waitForFunction(() => document.getElementById('spin').textContent === 'STOP');
    await page.locator('#spin').click(); await settled(page, 1);
    check('double click followed by STOP accepts exactly one receipt', await page.evaluate(() => rollxTest.calls.spin.length === 1 && rollxTest.game.controller.snapshot.history.length === 1));
    check('wheel and history show the accepted win', (await page.locator('[data-result-amount]').textContent()) === '0.28 ETB');
    output.screenshots['fixture-win-desktop'] = (await page.screenshot({ type: 'jpeg', quality: 65, fullPage: true })).toString('base64');

    await page.locator('h1').click();
    await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); for (let i = 0; i < 20; i++) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', repeat: true, bubbles: true })); });
    check('repeated keyboard events do not submit a round', await page.evaluate(() => rollxTest.calls.spin.length === 1));
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.getElementById('spin').textContent === 'STOP');
    await page.keyboard.press('Enter'); await settled(page, 2);
    check('keyboard start and STOP settle one empty receipt', (await page.locator('[data-result-amount]').textContent()) === '0.00 ETB');

    await page.locator('#target').focus(); await page.keyboard.press('ArrowRight');
    await page.locator('#bet-plus').click();
    check('bet and target controls update the bound choice', await page.evaluate(() => rollxTest.game.controller.snapshot.bet === '0.50' && rollxTest.game.controller.snapshot.targetBps === 20000));
    await page.locator('#spin').click(); await page.waitForFunction(() => document.getElementById('spin').textContent === 'STOP');
    await page.locator('#spin').click(); await settled(page, 3);
    check('2x receipt is presented with its exact 1.00 return', (await page.locator('[data-result-amount]').textContent()) === '1.00 ETB');
    await page.locator('#target').focus(); await page.keyboard.press('ArrowLeft');
    await page.locator('#bet').focus(); await page.keyboard.press('Home');
    await page.locator('#auto').click(); await page.locator('#auto-dialog [data-close]').first().click();
    check('cancelling AUTO confirmation starts no round', await page.evaluate(() => rollxTest.calls.spin.length === 3));
    await page.locator('#turbo').click();
    await page.locator('#target').focus(); await page.keyboard.press('ArrowRight');
    await page.locator('#bet-plus').click();
    await page.locator('#auto').click(); await page.locator('#auto-count').selectOption('10');
    check('AUTO opens with the current bet and multiplier in editable fields',
      await page.locator('#auto-bet').inputValue() === '0.50' && await page.locator('#auto-target').inputValue() === '20000');
    await page.locator('#auto-bet').selectOption('0.20');
    await page.locator('#auto-target').selectOption('14000');
    output.screenshots['fixture-auto-settings'] = (await page.screenshot({ type: 'jpeg', quality: 65, fullPage: true })).toString('base64');
    await page.locator('#auto-form [type="submit"]').click();
    await page.waitForFunction(() => rollxTest.game.controller.snapshot.autoActive);
    await page.setViewportSize({ width: 844, height: 390 });
    const autoLandscape = await layout(page); output.activeAutoLandscapeLayout = autoLandscape;
    check('active AUTO keeps every control visible without overlap or page scroll in landscape',
      autoLandscape.autoActive === true && fits(autoLandscape), autoLandscape);
    output.screenshots['fixture-auto-landscape'] = (await page.screenshot({ type: 'jpeg', quality: 65 })).toString('base64');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForFunction(() => rollxTest.calls.spin.length === 13 && !rollxTest.game.controller.snapshot.autoActive, null, { timeout: 18000 });
    check('confirmed AUTO completes exactly ten serialized rounds', await page.evaluate(() => rollxTest.calls.spin.length === 13 && rollxTest.calls.refresh === 13));
    check('AUTO uses its confirmed wager selection instead of the previous outer controls', await page.evaluate(() =>
      rollxTest.calls.spin.slice(3, 13).every(wager => wager.bet === '0.20' && wager.targetBps === 14000)));
    await page.locator('#auto').click(); await page.locator('#stop-win').fill('0.20');
    await page.locator('#auto-form [type="submit"]').click();
    await page.waitForFunction(() => rollxTest.calls.spin.length === 14 && !rollxTest.game.controller.snapshot.autoActive);
    check('single-win threshold stops AUTO after one qualifying receipt', await page.evaluate(() => rollxTest.calls.spin.length === 14));
    await page.locator('#auto').click(); await page.locator('#stop-win').fill('0.00');
    await page.locator('#auto-form [type="submit"]').click();
    await page.waitForFunction(() => rollxTest.calls.spin.length === 15);
    await page.locator('#auto').click(); await settled(page, 15);
    check('cancelling active AUTO settles its existing receipt only', await page.evaluate(() => !rollxTest.game.controller.snapshot.autoActive && rollxTest.calls.spin.length === 15));

    // Use real browser key default behavior on a focused button, including
    // repeat keydowns before and after its accepted round returns to READY.
    await page.locator('#spin').focus();
    await page.keyboard.down('Enter');
    await page.waitForFunction(() => rollxTest.calls.spin.length === 16);
    for (let index = 0; index < 8; index++) await page.keyboard.down('Enter');
    await settled(page, 16);
    // Request-pending disables the button and may move native focus. Restore
    // that focus while Enter is still held so READY repeats test this button.
    await page.locator('#spin').focus();
    check('held Enter repeats target the ready SPIN button',
      await page.evaluate(() => document.activeElement === document.getElementById('spin')));
    for (let index = 0; index < 8; index++) await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    check('held native Enter on focused SPIN cannot submit again after READY',
      await page.evaluate(() => rollxTest.calls.spin.length === 16 && !rollxTest.game.controller.snapshot.busy));
    await page.locator('#spin').focus();
    check('native Space scenario has SPIN focus after Enter settlement',
      await page.evaluate(() => document.activeElement === document.getElementById('spin')));
    await page.keyboard.press('Space');
    await settled(page, 17);
    check('focused native Space activation starts exactly one additional round',
      await page.evaluate(() => rollxTest.calls.spin.length === 17));

    await page.locator('#menu').click(); await page.locator('[data-open="settings-dialog"]').click();
    await page.locator('#sound-setting').uncheck();
    check('settings mute stops live AudioContext nodes', await page.evaluate(() => rollxTest.audio.muted && rollxTest.audio.nodes.size === 0));
    await page.locator('#sound-setting').check(); await page.locator('#settings-dialog [data-close]').click();
    output.audio = await page.evaluate(() => ({ state: rollxTest.audio.context?.state ?? null, mappedEvents: [...new Set(rollxTest.events)], audibleVerification: false }));
    await page.locator('#history').click();
    check('history displays seventeen accepted receipts', await page.locator('#history-rows tr').count() === 17);
    await page.locator('#history-dialog [data-close]').click();
    const desktop = await layout(page); output.desktopLayout = desktop; check('desktop controls meet minimum hit size and horizontal bounds', desktop.readable && desktop.scrollWidth <= desktop.viewport.width);
    check('desktop wheel and all nine key controls fit vertically without scrolling', fits(desktop), desktop);
    await page.evaluate(() => rollxTest.game.dispose());
    check('exit disposes sound and all owned controller work', await page.evaluate(() => rollxTest.audio.disposed && rollxTest.audio.nodes.size === 0 && rollxTest.calls.dispose === 1 && rollxTest.game.controller.disposed));

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await intercept(mobileContext); const mobile = await mobileContext.newPage(); watch(mobile);
    activePage = mobile;
    await mobile.goto(origin + base + 'fixture.html');
    await mobile.waitForFunction(() => globalThis.rollxTest?.game.controller.snapshot.canSpin === true);
    await mobile.locator('#spin').tap(); await mobile.waitForFunction(() => document.getElementById('spin').textContent === 'STOP');
    await mobile.locator('#spin').tap(); await settled(mobile, 1);
    check('mobile touch spin and STOP accept one receipt', await mobile.evaluate(() => rollxTest.calls.spin.length === 1));
    const portrait = await layout(mobile); output.mobilePortraitLayout = portrait; check('portrait controls remain within width with at least 44px hit sizes', portrait.readable && portrait.scrollWidth <= portrait.viewport.width);
    check('390x844 portrait wheel and all key controls fit vertically without scrolling', fits(portrait), portrait);
    output.screenshots['fixture-mobile-portrait'] = (await mobile.screenshot({ type: 'jpeg', quality: 65, fullPage: true })).toString('base64');
    await mobile.locator('#menu').tap(); await mobile.locator('[data-open="settings-dialog"]').tap();
    const dialog = await mobile.locator('#settings-dialog').boundingBox();
    check('mobile settings modal fits the viewport', dialog.x >= 0 && dialog.x + dialog.width <= 391 && dialog.height <= 844);
    check('mobile settings modal stays inside all four viewport edges', await modalFit(mobile, 'settings-dialog'));
    output.screenshots['fixture-mobile-settings'] = (await mobile.screenshot({ type: 'jpeg', quality: 65 })).toString('base64');
    await mobile.locator('#settings-dialog [data-close]').tap();
    await mobile.locator('#auto').tap();
    check('portrait AUTO modal remains inside all viewport edges', await modalFit(mobile, 'auto-dialog'));
    check('portrait AUTO fields and buttons retain readable text and 44px targets through dialog scroll', await autoModalControlsFit(mobile));
    output.screenshots['fixture-mobile-auto-settings'] = (await mobile.screenshot({ type: 'jpeg', quality: 65 })).toString('base64');
    await mobile.locator('#auto-dialog [data-close]').first().tap();
    output.mobileWidths = [];
    for (const viewport of [{ width: 360, height: 800 }, { width: 430, height: 932 }]) {
      await mobile.setViewportSize(viewport);
      const measured = await layout(mobile); output.mobileWidths.push(measured);
      check('mobile width ' + viewport.width + ' preserves hit sizes, bounds and accepted round',
        measured.readable && measured.scrollWidth <= viewport.width && await mobile.evaluate(() => rollxTest.calls.spin.length === 1));
      check('mobile ' + viewport.width + 'x' + viewport.height + ' keeps the wheel and all controls inside the viewport without overlap or scrolling', fits(measured), measured);
      output.screenshots['fixture-mobile-' + viewport.width] = (await mobile.screenshot({ type: 'jpeg', quality: 65 })).toString('base64');
    }
    await mobile.setViewportSize({ width: 768, height: 1024 });
    const tablet = await layout(mobile); output.tabletPortraitLayout = tablet;
    check('768x1024 tablet preserves full wheel, key-control bounds and accepted round',
      fits(tablet) && await mobile.evaluate(() => rollxTest.calls.spin.length === 1), tablet);
    output.screenshots['fixture-tablet-portrait'] = (await mobile.screenshot({ type: 'jpeg', quality: 65 })).toString('base64');
    output.mobileLandscapes = [];
    for (const viewport of [{ width: 568, height: 320 }, { width: 667, height: 375 }, { width: 844, height: 390 }]) {
      await mobile.setViewportSize(viewport);
      const measured = await layout(mobile); output.mobileLandscapes.push(measured);
      if (viewport.width === 844) output.mobileLandscapeLayout = measured;
      check('landscape ' + viewport.width + 'x' + viewport.height + ' keeps all controls inside the viewport without scrolling',
        fits(measured) && await mobile.evaluate(() => rollxTest.calls.spin.length === 1), measured);
      const name = viewport.width === 844 ? 'fixture-mobile-landscape' : 'fixture-landscape-' + viewport.width;
      output.screenshots[name] = (await mobile.screenshot({ type: 'jpeg', quality: 65 })).toString('base64');
    }
    await mobile.locator('#auto').tap();
    check('landscape AUTO modal remains inside all viewport edges', await modalFit(mobile, 'auto-dialog'));
    check('landscape AUTO fields and buttons retain readable text and 44px targets through dialog scroll', await autoModalControlsFit(mobile));
    output.screenshots['fixture-landscape-auto-settings'] = (await mobile.screenshot({ type: 'jpeg', quality: 65 })).toString('base64');
    await mobile.locator('#auto-dialog [data-close]').first().tap();
    check('landscape AUTO layout inspection starts no additional round', await mobile.evaluate(() => rollxTest.calls.spin.length === 1));
    await mobile.locator('#menu').tap(); await mobile.locator('[data-open="settings-dialog"]').tap();
    const landscapeDialog = await mobile.locator('#settings-dialog').boundingBox();
    check('landscape settings opens from the visible bottom control within all viewport edges',
      await modalFit(mobile, 'settings-dialog'), landscapeDialog);
    await mobile.locator('#settings-dialog [data-close]').tap();
    await mobile.locator('#spin').tap(); await mobile.waitForFunction(() => document.getElementById('spin').textContent === 'STOP');
    await mobile.locator('#spin').tap(); await settled(mobile, 2);
    const afterLandscapeTouch = await layout(mobile); output.afterLandscapeTouchLayout = afterLandscapeTouch;
    check('landscape touch SPIN and STOP remain visible and settle exactly one more receipt',
      fits(afterLandscapeTouch) && await mobile.evaluate(() => rollxTest.calls.spin.length === 2), afterLandscapeTouch);
    await mobileContext.close();
    activePage = page;
    check('all test requests stayed intercepted and no financial POST escaped', output.requests.every(r => r.origin === origin) && !output.requests.some(r => r.path === '/api/slots/spin'));
    check('all requested runtime resources have explicit authored mappings', output.unmappedPaths.length === 0, output.unmappedPaths);
    check('no browser page errors', output.errors.length === 0, output.errors);
    output.success = true;
  } catch (error) {
    output.success = false; output.failure = { name: error.name, message: error.message, stack: error.stack?.split('\n').slice(0, 4) };
    try {
      output.failureState = await activePage.evaluate(() => {
        const fixture = globalThis.rollxTest;
        if (!fixture) return { fixture: false, status: document.getElementById('status')?.textContent ?? null };
        const state = fixture.game.controller.snapshot;
        return { fixture: true, spinRequests: fixture.calls.spin.length, refreshes: fixture.calls.refresh,
          phase: state.phase, busy: state.busy, autoActive: state.autoActive,
          autoRemaining: state.autoRemaining, acceptedReceipts: state.history.length, message: state.message };
      });
    } catch {}
    try { output.screenshots['failure'] = (await activePage.screenshot({ type: 'jpeg', quality: 60, fullPage: true })).toString('base64'); } catch {}
  } finally {
    output.finishedAt = new Date().toISOString();
    // The API caller closes this explicitly acquired session after receiving
    // this result, preserving errors/screenshots when the script itself fails.
    output.browserCloseRequired = true;
  }
  return output;
}
